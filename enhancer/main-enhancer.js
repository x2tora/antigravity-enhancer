/**
 * Antigravity Enhancer v3.3.0 - Main Process Bridge, Persistence & Secure In-App Updater
 * Source Repo: https://github.com/x2tora/antigravity-enhancer
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');
const crypto = require('crypto');

const ENHANCER_REPO = 'x2tora/antigravity-enhancer';
const MANIFEST_URL = `https://raw.githubusercontent.com/${ENHANCER_REPO}/main/enhancer/manifest.json`;
const RELEASE_API_URL = `https://api.github.com/repos/${ENHANCER_REPO}/releases/latest`;
const ALLOWED_HOSTS = new Set([
  'raw.githubusercontent.com',
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'codeload.github.com'
]);
const ALLOWED_UPDATE_FILES = new Set([
  'manifest.json',
  'main-enhancer.js',
  'renderer-enhancer.js',
  'gsap-core.js',
  'dictionaries.json',
  'asar-patcher.js'
]);

let electronMod = null;
let enhancerDir = __dirname;
let cachedBootstrapPayload = null;
let initialized = false;
let appRootDir = '';
let runtimeState = {
  safeMode: false,
  disabled: false,
  bootCount: 0,
  lastBootAt: 0,
  lastCheckAt: 0,
  lastRemoteInfo: null,
  lastError: null
};

function getElectron() {
  if (!electronMod) {
    try { electronMod = require('electron'); } catch (_) { electronMod = null; }
  }
  return electronMod;
}

function getAppAsarPath() {
  if (process.resourcesPath) {
    const p = path.join(process.resourcesPath, 'app.asar');
    if (fs.existsSync(p)) return p;
  }
  if (appRootDir) {
    const candidate = appRootDir.endsWith('.asar') ? appRootDir : path.dirname(appRootDir);
    if (candidate.endsWith('app.asar') && fs.existsSync(candidate)) return candidate;
  }
  const localDefault = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity', 'resources', 'app.asar');
  return localDefault;
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
  fs.renameSync(tmp, filePath);
}

function writeBufferAtomic(filePath, buf) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, buf);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
  fs.renameSync(tmp, filePath);
}

function getLocalManifest() {
  const m = readJsonSafe(path.join(enhancerDir, 'manifest.json'), null);
  return m || { version: '3.2.0', repo: ENHANCER_REPO, files: {} };
}

function compareSemver(v1, v2) {
  const parse = (v) => String(v || '').replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const a = parse(v1);
  const b = parse(v2);
  for (let i = 0; i < 3; i++) {
    const ai = a[i] || 0;
    const bi = b[i] || 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

function isAllowedRemoteUrl(rawUrl) {
  let u;
  try {
    u = new URL(String(rawUrl));
  } catch (_) {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return false;
  const repoLower = ENHANCER_REPO.toLowerCase();
  const pathLower = u.pathname.toLowerCase();

  if (host === 'raw.githubusercontent.com' || host === 'github.com' || host === 'codeload.github.com') {
    return pathLower.startsWith(`/${repoLower}/`);
  }
  if (host === 'api.github.com') {
    return pathLower.startsWith(`/repos/${repoLower}/`);
  }
  // objects.githubusercontent.com & release-assets.githubusercontent.com are only reachable via verified GitHub redirect
  return true;
}

function httpsGetBufferNode(rawUrl, headers = {}, timeoutMs = 20000, maxBytes = 25 * 1024 * 1024, depth = 0) {
  return new Promise((resolve, reject) => {
    if (!isAllowedRemoteUrl(rawUrl)) {
      return reject(new Error(`Blocked non-allowlisted URL: ${rawUrl}`));
    }
    if (depth > 5) {
      return reject(new Error('Too many redirects'));
    }

    const req = https.get(rawUrl, {
      headers: {
        'User-Agent': 'Antigravity-Enhancer/3.2.0',
        ...headers
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, rawUrl).toString();
        res.resume();
        if (!isAllowedRemoteUrl(nextUrl)) {
          return reject(new Error(`Blocked redirect to non-allowlisted host: ${nextUrl}`));
        }
        return resolve(httpsGetBufferNode(nextUrl, headers, timeoutMs, maxBytes, depth + 1));
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${rawUrl}`));
      }

      const chunks = [];
      let total = 0;
      res.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          req.destroy(new Error(`Payload exceeds max size (${maxBytes} bytes)`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout (${timeoutMs}ms)`));
    });
    req.on('error', reject);
  });
}

async function secureFetchBuffer(rawUrl, options = {}) {
  const timeoutMs = options.timeoutMs || 20000;
  const maxBytes = options.maxBytes || (25 * 1024 * 1024);
  const headers = options.headers || {};
  const depth = options._depth || 0;

  if (!isAllowedRemoteUrl(rawUrl)) {
    throw new Error(`Blocked non-allowlisted URL: ${rawUrl}`);
  }
  if (depth > 5) {
    throw new Error('Too many redirects');
  }

  const el = getElectron();
  if (el && el.net && typeof el.net.fetch === 'function' && el.app && el.app.isReady && el.app.isReady()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await el.net.fetch(rawUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Antigravity-Enhancer/3.2.0',
          ...headers
        },
        signal: controller.signal
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw new Error(`Redirect without location (${res.status})`);
        const nextUrl = new URL(loc, rawUrl).toString();
        if (!isAllowedRemoteUrl(nextUrl)) {
          throw new Error(`Blocked redirect to non-allowlisted host: ${nextUrl}`);
        }
        clearTimeout(timer);
        return secureFetchBuffer(nextUrl, { ...options, _depth: depth + 1 });
      }
      if (!res.ok) {
        const httpErr = new Error(`HTTP ${res.status} for ${rawUrl}`);
        httpErr.isHttpStatus = true;
        throw httpErr;
      }
      const arrBuf = await res.arrayBuffer();
      if (arrBuf.byteLength > maxBytes) {
        throw new Error(`Payload exceeds max size (${maxBytes} bytes)`);
      }
      return Buffer.from(arrBuf);
    } catch (err) {
      if (err && (err.isHttpStatus || String(err.message || '').includes('Blocked'))) throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  return httpsGetBufferNode(rawUrl, headers, timeoutMs, maxBytes, depth);
}

function broadcastEvent(channel, payload) {
  const el = getElectron();
  if (!el || !el.webContents) return;
  try {
    for (const wc of el.webContents.getAllWebContents()) {
      if (!wc.isDestroyed()) {
        wc.send(channel, payload);
      }
    }
  } catch (_) {}
}

function handleCrashFailsafe() {
  const statePath = path.join(enhancerDir, 'state.json');
  const disabledFlag = path.join(enhancerDir, 'disabled.flag');
  if (fs.existsSync(disabledFlag)) {
    runtimeState.disabled = true;
    return;
  }

  const prev = readJsonSafe(statePath, {}) || {};
  const now = Date.now();
  const elapsed = now - (prev.lastBootAt || 0);
  let bootCount = (elapsed > 0 && elapsed < 30000) ? ((prev.bootCount || 0) + 1) : 1;

  if (bootCount >= 3) {
    // Attempt automatic rollback from backup/latest before falling back to safeMode
    const backupLatest = path.join(enhancerDir, 'backup', 'latest');
    if (fs.existsSync(backupLatest) && !prev.autoRolledBackAtBoot) {
      try {
        restoreFromBackupDir(backupLatest);
        writeJsonAtomic(statePath, {
          ...prev,
          bootCount: 1,
          lastBootAt: now,
          autoRolledBackAtBoot: now,
          safeMode: false,
          lastError: 'Auto-rolled back after rapid restart threshold'
        });
        runtimeState.bootCount = 1;
        runtimeState.lastBootAt = now;
        runtimeState.lastError = 'Auto-rolled back after rapid restart threshold';
        return;
      } catch (_) {}
    }
    runtimeState.safeMode = true;
    runtimeState.lastError = 'Entered Safe Mode after 3 consecutive rapid exits';
  }

  runtimeState.bootCount = bootCount;
  runtimeState.lastBootAt = now;
  writeJsonAtomic(statePath, {
    ...prev,
    bootCount,
    lastBootAt: now,
    safeMode: runtimeState.safeMode
  });

  // Reset rapid boot counter after 15 seconds of stable execution
  const t = setTimeout(() => {
    const cur = readJsonSafe(statePath, {}) || {};
    writeJsonAtomic(statePath, {
      ...cur,
      bootCount: 0,
      autoRolledBackAtBoot: 0,
      safeMode: false
    });
    runtimeState.bootCount = 0;
  }, 15000);
  if (t.unref) t.unref();
}

function loadBootstrapPayload(forceRefresh = false) {
  if (runtimeState.disabled || runtimeState.safeMode) {
    return {
      disabled: true,
      safeMode: runtimeState.safeMode,
      reason: runtimeState.lastError || 'Enhancer disabled'
    };
  }
  if (cachedBootstrapPayload && !forceRefresh) {
    return cachedBootstrapPayload;
  }

  try {
    const rendererPath = path.join(enhancerDir, 'renderer-enhancer.js');
    const gsapPath = path.join(enhancerDir, 'gsap-core.js');
    const dictPath = path.join(enhancerDir, 'dictionaries.json');

    const rendererCode = fs.readFileSync(rendererPath, 'utf8');
    const gsapCode = fs.existsSync(gsapPath) ? fs.readFileSync(gsapPath, 'utf8') : '';
    const dictRaw = fs.existsSync(dictPath) ? fs.readFileSync(dictPath, 'utf8') : '{}';
    const dictionaries = JSON.parse(dictRaw);
    const manifest = getLocalManifest();

    cachedBootstrapPayload = {
      disabled: false,
      version: manifest.version || '3.2.0',
      repo: ENHANCER_REPO,
      code: rendererCode,
      gsapCode,
      dictionaries
    };
    return cachedBootstrapPayload;
  } catch (err) {
    runtimeState.lastError = err.message;
    return { disabled: true, error: err.message };
  }
}

function getFullStatus() {
  const el = getElectron();
  const manifest = getLocalManifest();
  const asarPath = getAppAsarPath();
  let asarStatus = { exists: false, bootstrapped: false };
  try {
    const patcher = require(path.join(enhancerDir, 'asar-patcher.js'));
    asarStatus = patcher.inspectAsarStatus(asarPath);
  } catch (_) {}

  return {
    enhancerVersion: manifest.version || '3.3.0',
    appVersion: (el && el.app && el.app.getVersion) ? el.app.getVersion() : 'unknown',
    repo: ENHANCER_REPO,
    enhancerDir,
    asarPath,
    asarBootstrapped: Boolean(asarStatus.bootstrapped),
    safeMode: runtimeState.safeMode,
    disabled: runtimeState.disabled,
    lastError: runtimeState.lastError,
    lastRemoteInfo: runtimeState.lastRemoteInfo
  };
}

function parseReleaseNotesMarkdown(md) {
  if (!md || typeof md !== 'string') return null;
  const summaryToLang = {
    '한국어': 'ko',
    '日本語': 'ja',
    '简体中文': 'zh-CN',
    '繁體中文': 'zh-TW',
    'Español': 'es',
    'Français': 'fr',
    'Deutsch': 'de',
    'Русский': 'ru'
  };
  const out = {};
  const enMatch = md.match(/##\s*Changes\s*\r?\n([\s\S]*?)(?:\r?\n---|\r?\n###|$)/i);
  if (enMatch && enMatch[1] && enMatch[1].trim()) out.en = enMatch[1].trim();
  const detailsRe = /<details>\s*<summary>([^<]+)<\/summary>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = detailsRe.exec(md)) !== null) {
    const lang = summaryToLang[m[1].trim()];
    if (lang && m[2] && m[2].trim()) out[lang] = m[2].trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function checkRemoteUpdate() {
  const local = getLocalManifest();
  const localVer = local.version || '3.2.0';
  const cacheBust = `?t=${Date.now()}`;

  let remoteManifest = null;
  let releaseData = null;

  try {
    const buf = await secureFetchBuffer(`${MANIFEST_URL}${cacheBust}`, {
      headers: { Accept: 'application/json' },
      maxBytes: 256 * 1024
    });
    const parsed = JSON.parse(buf.toString('utf8'));
    if (parsed && typeof parsed.version === 'string' && parsed.files && typeof parsed.files === 'object') {
      remoteManifest = parsed;
    }
  } catch (err) {
    // Allow fallback check against GitHub Releases API
    remoteManifest = null;
  }

  try {
    const relBuf = await secureFetchBuffer(RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      maxBytes: 512 * 1024
    });
    releaseData = JSON.parse(relBuf.toString('utf8'));
  } catch (_) {
    releaseData = null;
  }

  if (!remoteManifest && !releaseData) {
    throw new Error(`Unable to fetch update metadata from ${ENHANCER_REPO}`);
  }

  const manifestVer = remoteManifest ? remoteManifest.version : null;
  const releaseVer = (releaseData && releaseData.tag_name) ? String(releaseData.tag_name).replace(/^v/i, '') : null;

  let latestVer = localVer;
  let updateSource = 'none';
  if (manifestVer && compareSemver(manifestVer, latestVer) > 0) {
    latestVer = manifestVer;
    updateSource = 'manifest';
  }
  if (releaseVer && compareSemver(releaseVer, latestVer) > 0) {
    latestVer = releaseVer;
    updateSource = remoteManifest && compareSemver(manifestVer || '0.0.0', releaseVer) >= 0 ? 'manifest' : 'release';
  }

  const hasUpdate = compareSemver(latestVer, localVer) > 0;
  let releaseUrl = `https://github.com/${ENHANCER_REPO}/releases/latest`;
  if (releaseData && Array.isArray(releaseData.assets)) {
    const exeAsset = releaseData.assets.find(a => a && typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe'));
    if (exeAsset && exeAsset.browser_download_url && isAllowedRemoteUrl(exeAsset.browser_download_url)) {
      releaseUrl = exeAsset.browser_download_url;
    } else if (releaseData.html_url && isAllowedRemoteUrl(releaseData.html_url)) {
      releaseUrl = releaseData.html_url;
    }
  } else if (releaseData && releaseData.html_url && isAllowedRemoteUrl(releaseData.html_url)) {
    releaseUrl = releaseData.html_url;
  }

  const parsedBodyI18n = parseReleaseNotesMarkdown(releaseData && releaseData.body);
  const manifestI18n = (remoteManifest && remoteManifest.releaseNotesI18n && typeof remoteManifest.releaseNotesI18n === 'object')
    ? remoteManifest.releaseNotesI18n
    : null;
  const releaseNotesI18n = manifestI18n || parsedBodyI18n || null;

  const result = {
    ok: true,
    hasUpdate,
    canApplyInApp: Boolean(remoteManifest && (!hasUpdate || (manifestVer && compareSemver(manifestVer, localVer) > 0))),
    updateSource,
    currentVersion: localVer,
    remoteVersion: latestVer,
    releaseNotes: (releaseNotesI18n && releaseNotesI18n.en) || (remoteManifest && remoteManifest.releaseNotes) || (releaseData && releaseData.body) || '',
    releaseNotesI18n,
    releasePageUrl: (releaseData && releaseData.html_url) || `https://github.com/${ENHANCER_REPO}/releases/latest`,
    exeDownloadUrl: releaseUrl,
    manifest: remoteManifest
  };

  runtimeState.lastCheckAt = Date.now();
  runtimeState.lastRemoteInfo = result;
  return result;
}

async function applyInAppUpdate(refBranch = 'main') {
  const local = getLocalManifest();
  const prevVersion = local.version || '3.3.0';

  broadcastEvent('enhancer:update-progress', { phase: 'manifest', percent: 8, message: 'Fetching signed manifest...' });
  const manifestUrl = `https://raw.githubusercontent.com/${ENHANCER_REPO}/${encodeURIComponent(refBranch)}/enhancer/manifest.json?t=${Date.now()}`;
  const manifestBuf = await secureFetchBuffer(manifestUrl, {
    headers: { Accept: 'application/json' },
    maxBytes: 256 * 1024
  });
  const remoteManifest = JSON.parse(manifestBuf.toString('utf8'));
  if (!remoteManifest || typeof remoteManifest.version !== 'string' || !remoteManifest.files || typeof remoteManifest.files !== 'object') {
    throw new Error('Invalid remote manifest format');
  }

  const fileEntries = Object.entries(remoteManifest.files);
  if (fileEntries.length === 0) {
    throw new Error('Remote manifest contains no files');
  }

  const stagingDir = path.join(enhancerDir, '.staging');
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  const stagedPayloads = new Map();
  let completed = 0;

  for (const [fileName, meta] of fileEntries) {
    if (!ALLOWED_UPDATE_FILES.has(fileName) || fileName === 'manifest.json') {
      if (fileName !== 'manifest.json') {
        throw new Error(`Disallowed file in remote manifest: ${fileName}`);
      }
      continue;
    }
    if (!meta || typeof meta.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(meta.sha256)) {
      throw new Error(`Missing or invalid SHA-256 checksum for ${fileName}`);
    }

    const pct = 15 + Math.round((completed / fileEntries.length) * 65);
    broadcastEvent('enhancer:update-progress', {
      phase: 'download',
      percent: pct,
      file: fileName,
      message: `Downloading ${fileName}...`
    });

    const ref = remoteManifest.commitSha || refBranch;
    const fileUrl = `https://raw.githubusercontent.com/${ENHANCER_REPO}/${encodeURIComponent(ref)}/enhancer/${fileName}?t=${Date.now()}`;
    const fileBuf = await secureFetchBuffer(fileUrl, { maxBytes: 25 * 1024 * 1024 });

    if (typeof meta.size === 'number' && fileBuf.length !== meta.size) {
      throw new Error(`Size mismatch for ${fileName}: expected ${meta.size}, got ${fileBuf.length}`);
    }
    const actualHash = crypto.createHash('sha256').update(fileBuf).digest('hex').toLowerCase();
    if (actualHash !== meta.sha256.toLowerCase()) {
      throw new Error(`SHA-256 verification failed for ${fileName}`);
    }

    const text = fileBuf.toString('utf8');
    if (fileName.endsWith('.json')) {
      JSON.parse(text);
    } else if (fileName.endsWith('.js')) {
      new vm.Script(text, { filename: fileName });
    }

    fs.writeFileSync(path.join(stagingDir, fileName), fileBuf);
    stagedPayloads.set(fileName, fileBuf);
    completed++;
  }

  broadcastEvent('enhancer:update-progress', { phase: 'apply', percent: 94, message: 'Applying verified update...' });
  let restartRequired = false;

  for (const [fileName, buf] of stagedPayloads.entries()) {
    const dest = path.join(enhancerDir, fileName);
    if (fileName === 'main-enhancer.js' || fileName === 'asar-patcher.js') {
      const oldHash = fs.existsSync(dest) ? crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex') : '';
      const newHash = crypto.createHash('sha256').update(buf).digest('hex');
      if (oldHash !== newHash) restartRequired = true;
    }
    writeBufferAtomic(dest, buf);
  }
  writeBufferAtomic(path.join(enhancerDir, 'manifest.json'), manifestBuf);

  fs.rmSync(stagingDir, { recursive: true, force: true });
  cachedBootstrapPayload = null;
  runtimeState.lastRemoteInfo = null;

  broadcastEvent('enhancer:update-progress', { phase: 'done', percent: 100, message: `Updated to v${remoteManifest.version}` });
  return {
    ok: true,
    previousVersion: prevVersion,
    newVersion: remoteManifest.version,
    restartRequired,
    appliedFiles: Array.from(stagedPayloads.keys())
  };
}

function registerIpcHandlers() {
  const el = getElectron();
  if (!el || !el.ipcMain) return;
  const { ipcMain, app, webContents } = el;

  ipcMain.on('enhancer:get-bootstrap-sync', (event) => {
    event.returnValue = loadBootstrapPayload(false);
  });

  ipcMain.handle('enhancer:get-status', async () => getFullStatus());

  ipcMain.handle('enhancer:check-update', async () => {
    try {
      return await checkRemoteUpdate();
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('enhancer:apply-update', async () => {
    try {
      return await applyInAppUpdate('main');
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('enhancer:repair-persistence', async () => {
    try {
      const asarPath = getAppAsarPath();
      const patcher = require(path.join(enhancerDir, 'asar-patcher.js'));
      const res = patcher.patchAsar(asarPath, { force: false });
      return { ok: true, asar: res, status: getFullStatus() };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('enhancer:reload-windows', async () => {
    cachedBootstrapPayload = null;
    try {
      let reloaded = 0;
      for (const wc of webContents.getAllWebContents()) {
        if (!wc.isDestroyed()) {
          const url = wc.getURL() || '';
          if (url.startsWith('https://127.0.0.1') || url.startsWith('http://127.0.0.1')) {
            wc.reloadIgnoringCache();
            reloaded++;
          }
        }
      }
      return { ok: true, reloaded };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('enhancer:relaunch', async () => {
    setTimeout(() => {
      try {
        app.relaunch();
        app.exit(0);
      } catch (_) {}
    }, 120);
    return { ok: true };
  });

  ipcMain.handle('enhancer:restore-vanilla', async () => {
    try {
      const asarPath = getAppAsarPath();
      const patcher = require(path.join(enhancerDir, 'asar-patcher.js'));
      patcher.unpatchAsar(asarPath);
      setTimeout(() => {
        try {
          app.relaunch();
          app.exit(0);
        } catch (_) {}
      }, 150);
      return { ok: true, mode: 'direct-relaunch' };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
}

function init(options = {}) {
  if (initialized) return;
  initialized = true;
  if (options.enhancerDir) enhancerDir = options.enhancerDir;
  if (options.appRoot) appRootDir = options.appRoot;

  handleCrashFailsafe();
  loadBootstrapPayload(true);
  registerIpcHandlers();
}

module.exports = {
  ENHANCER_REPO,
  MANIFEST_URL,
  RELEASE_API_URL,
  ALLOWED_HOSTS,
  ALLOWED_UPDATE_FILES,
  compareSemver,
  isAllowedRemoteUrl,
  secureFetchBuffer,
  checkRemoteUpdate,
  applyInAppUpdate,
  getFullStatus,
  init
};
