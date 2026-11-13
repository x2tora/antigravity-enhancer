/**
 * Generates e:\Projects\project_5\enhancer\manifest.json with exact SHA-256 digests and sizes.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '3.3.0';
const REPO = 'x2tora/antigravity-enhancer';
const enhancerDir = path.join(__dirname, 'enhancer');

const trackedFiles = [
  { name: 'main-enhancer.js', restartRequired: true },
  { name: 'asar-patcher.js', restartRequired: true },
  { name: 'renderer-enhancer.js', restartRequired: false },
  { name: 'gsap-core.js', restartRequired: false },
  { name: 'dictionaries.json', restartRequired: false }
];

const files = {};
for (const entry of trackedFiles) {
  const fullPath = path.join(enhancerDir, entry.name);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing enhancer module: ${fullPath}`);
  }
  const buf = fs.readFileSync(fullPath);
  if (entry.name.endsWith('.json')) {
    JSON.parse(buf.toString('utf8'));
  } else if (entry.name.endsWith('.js')) {
    new (require('vm').Script)(buf.toString('utf8'), { filename: entry.name });
  }
  files[entry.name] = {
    size: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    restartRequired: entry.restartRequired
  };
}

function parseReleaseNotesI18n(mdPath) {
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
  if (!fs.existsSync(mdPath)) return out;
  const md = fs.readFileSync(mdPath, 'utf8');
  const enMatch = md.match(/##\s*Changes\s*\r?\n([\s\S]*?)(?:\r?\n---|\r?\n###|$)/i);
  if (enMatch && enMatch[1]) {
    const enText = enMatch[1].trim();
    if (enText) out.en = enText;
  }
  const detailsRe = /<details>\s*<summary>([^<]+)<\/summary>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = detailsRe.exec(md)) !== null) {
    const label = m[1].trim();
    const lang = summaryToLang[label];
    if (lang && m[2]) {
      const body = m[2].trim();
      if (body) out[lang] = body;
    }
  }
  return out;
}

const releaseNotesI18n = parseReleaseNotesI18n(path.join(__dirname, 'RELEASE_NOTES.md'));

const manifest = {
  version: VERSION,
  channel: 'stable',
  minAppVersion: '2.30.0',
  testedAppVersion: '2.31.2',
  repo: REPO,
  updatedAt: new Date().toISOString(),
  releaseNotes: releaseNotesI18n.en || 'v3.3.0: Flush AntigravityEnhanced title branding, 10-minute update polling with native-style Update Available top-bar pill, localized Other quota group & fixed ACTIVE badge wrapping, Hydrogen in Gemini model list (nonexistent Pro removed), OS language auto-detection on first launch, 9-language copy toast & quota setting labels, and dead rollback code cleanup.',
  releaseNotesI18n,
  files
};

const outPath = path.join(enhancerDir, 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Generated manifest.json v' + VERSION + ':', Object.keys(files).join(', '));
