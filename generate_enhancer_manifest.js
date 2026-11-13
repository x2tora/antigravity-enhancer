/**
 * Generates e:\Projects\project_5\enhancer\manifest.json with exact SHA-256 digests and sizes.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '3.2.0';
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

const manifest = {
  version: VERSION,
  channel: 'stable',
  minAppVersion: '2.30.0',
  testedAppVersion: '2.31.2',
  repo: REPO,
  updatedAt: new Date().toISOString(),
  releaseNotes: 'v3.2.0: Antigravity Enhanced title badge & native menu integration (Patch Version / Check Patch Updates / Restore Original), unified native styling, composer hover-only single-model quota card, and 9-language README & release docs.',
  files
};

const outPath = path.join(enhancerDir, 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('Generated manifest.json v' + VERSION + ':', Object.keys(files).join(', '));
