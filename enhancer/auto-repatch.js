/**
 * Antigravity Enhancer v3.4.1 - Secure Auto-Re-Patch Guardian
 * Detects when an Antigravity IDE update overwrites app.asar, verifies if a matching
 * patch exists in the remote manifest, downloads SHA-256 verified modules, and
 * atomically re-bootstraps app.asar when Antigravity is not running.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const ENHANCER_REPO = 'x2tora/antigravity-enhancer';
const MANIFEST_URL = `https://raw.githubusercontent.com/${ENHANCER_REPO}/main/enhancer/manifest.json`;
const RAW_BASE_URL = `https://raw.githubusercontent.com/${ENHANCER_REPO}/main/enhancer/`;
const ALLOWED_HOSTS = new Set(['raw.githubusercontent.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']);
const ALLOWED_FILES = new Set(['main-enhancer.js', 'asar-patcher.js', 'renderer-enhancer.js', 'gsap-core.js', 'dictionaries.json', 'auto-repatch.js']);

function compareSemver(a, b) {
  const pa = String(a || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

function isAllowedUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    if (!ALLOWED_HOSTS.has(u.hostname)) return false;
    if (u.hostname === 'raw.githubusercontent.com' && !u.pathname.startsWith(`/${ENHANCER_REPO}/`)) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function fetchBuffer(rawUrl, httpsMod = https, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    if (!isAllowedUrl(rawUrl)) return reject(new Error(`Blocked untrusted URL: ${rawUrl}`));
    const req = httpsMod.get(rawUrl, { headers: { 'User-Agent': 'Antigravity-Enhancer-AutoRepatch' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        const nextUrl = new URL(res.headers.location, rawUrl).toString();
        return fetchBuffer(nextUrl, httpsMod, redirectsLeft - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${rawUrl}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.setTimeout(15000, () => req.destroy(new Error(`Timeout fetching ${rawUrl}`)));
    req.on('error', reject);
  });
}

function readInstalledAppVersion(asarPath, asarPatcher) {
  const buf = fs.readFileSync(asarPath);
  const { headerObj, payloadStart } = asarPatcher.parseAsarHeader(buf);
  const entry = asarPatcher.getEntry(headerObj, ['package.json']);
  const pkgBuf = asarPatcher.readEntryBuffer(buf, payloadStart, entry);
  const pkg = JSON.parse(pkgBuf.toString('utf8'));
  return String(pkg.version || '0.0.0');
}

function appendLog(enhancerDir, msg) {
  try {
    const logPath = path.join(enhancerDir, 'auto-repatch.log');
    const line = `[${new Date().toISOString()}] ${msg}`;
    const prev = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean) : [];
    const next = [...prev.slice(-19), line].join('\n') + '\n';
    fs.writeFileSync(logPath, next, 'utf8');
  } catch (_) {}
}

async function runAutoRepatch(options = {}) {
  const appData = process.env.APPDATA || '';
  const localAppData = process.env.LOCALAPPDATA || '';
  const enhancerDir = options.enhancerDir || path.join(appData, 'Antigravity', 'enhancer');
  const asarPath = options.asarPath || path.join(localAppData, 'Programs', 'Antigravity', 'resources', 'app.asar');
  const httpsMod = options.httpsMod || https;
  const asarPatcher = options.asarPatcher || require(path.join(enhancerDir, 'asar-patcher.js'));

  if (fs.existsSync(path.join(enhancerDir, 'disabled.flag'))) {
    return { ok: true, skipped: true, reason: 'disabled' };
  }
  if (!fs.existsSync(asarPath)) {
    return { ok: true, skipped: true, reason: 'asar-missing' };
  }

  const status = asarPatcher.inspectAsarStatus(asarPath);
  if (status.bootstrapped) {
    return { ok: true, skipped: true, reason: 'already-bootstrapped' };
  }

  const installedAppVersion = options.installedAppVersion || readInstalledAppVersion(asarPath, asarPatcher);
  const manifestBuf = await fetchBuffer(MANIFEST_URL, httpsMod);
  const remote = JSON.parse(manifestBuf.toString('utf8'));
  if (!remote || remote.repo !== ENHANCER_REPO || !remote.files) {
    throw new Error('Invalid remote manifest');
  }

  const minApp = remote.minAppVersion || '2.30.0';
  const testedApp = remote.testedAppVersion || '0.0.0';
  if (compareSemver(installedAppVersion, minApp) < 0 || compareSemver(testedApp, installedAppVersion) < 0) {
    appendLog(enhancerDir, `Waiting for matching patch: installed=${installedAppVersion}, tested=${testedApp}`);
    return { ok: true, skipped: true, reason: 'waiting-for-matching-patch', installedAppVersion, testedAppVersion: testedApp };
  }

  // Download and verify any updated or missing modules before re-bootstrapping app.asar
  const stageDir = path.join(enhancerDir, '.repatch_stage');
  const backupDir = path.join(enhancerDir, '.repatch_backup');
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.rmSync(backupDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const updatedFiles = [];
  try {
    for (const [fname, meta] of Object.entries(remote.files)) {
      if (!ALLOWED_FILES.has(fname)) continue;
      const destPath = path.join(enhancerDir, fname);
      let needsDownload = true;
      if (fs.existsSync(destPath)) {
        const curSha = crypto.createHash('sha256').update(fs.readFileSync(destPath)).digest('hex');
        if (curSha === meta.sha256) needsDownload = false;
      }
      if (!needsDownload) continue;

      const fileBuf = await fetchBuffer(`${RAW_BASE_URL}${fname}`, httpsMod);
      const actualSha = crypto.createHash('sha256').update(fileBuf).digest('hex');
      if (actualSha !== meta.sha256) {
        throw new Error(`SHA-256 mismatch for ${fname}`);
      }
      fs.writeFileSync(path.join(stageDir, fname), fileBuf);
      updatedFiles.push(fname);
    }

    for (const fname of updatedFiles) {
      const destPath = path.join(enhancerDir, fname);
      if (fs.existsSync(destPath)) fs.copyFileSync(destPath, path.join(backupDir, fname));
      fs.renameSync(path.join(stageDir, fname), destPath);
    }
    fs.writeFileSync(path.join(enhancerDir, 'manifest.json'), JSON.stringify(remote, null, 2), 'utf8');

    const patchRes = asarPatcher.patchAsar(asarPath);
    appendLog(enhancerDir, `Auto-repatched Antigravity ${installedAppVersion} with Enhancer v${remote.version} (updated ${updatedFiles.length} modules)`);
    return {
      ok: true,
      repatched: true,
      installedAppVersion,
      enhancerVersion: remote.version,
      updatedFiles,
      patchRes
    };
  } catch (err) {
    for (const fname of updatedFiles) {
      const bak = path.join(backupDir, fname);
      const dest = path.join(enhancerDir, fname);
      if (fs.existsSync(bak)) {
        try { fs.copyFileSync(bak, dest); } catch (_) {}
      }
    }
    appendLog(enhancerDir, `Auto-repatch failed: ${err.message || err}`);
    throw err;
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  runAutoRepatch().catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exitCode = 1;
  });
}

module.exports = {
  ENHANCER_REPO,
  MANIFEST_URL,
  ALLOWED_HOSTS,
  ALLOWED_FILES,
  compareSemver,
  isAllowedUrl,
  runAutoRepatch
};
