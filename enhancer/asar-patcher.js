/**
 * Antigravity Enhancer v3.0.0 - Lossless ASAR v4 Micro-Bootstrapper
 * Zero external dependencies. Preserves all vendor files & recomputes SHA-256 ASAR integrity.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAIN_START = '/* === ANTIGRAVITY ENHANCER MAIN BOOTSTRAP v3 START === */';
const MAIN_END = '/* === ANTIGRAVITY ENHANCER MAIN BOOTSTRAP v3 END === */';
const PRELOAD_START = '/* === ANTIGRAVITY ENHANCER PRELOAD BOOTSTRAP v3 START === */';
const PRELOAD_END = '/* === ANTIGRAVITY ENHANCER PRELOAD BOOTSTRAP v3 END === */';

const MAIN_BOOTSTRAP_STUB = [
  MAIN_START,
  "try{const _el=require('electron'),_ep=require('path').join(_el.app.getPath('userData'),'enhancer','main-enhancer.js');if(require('fs').existsSync(_ep)){require(_ep).init({appRoot:__dirname,version:'3.0.0'});}}catch(_e){}",
  MAIN_END
].join('\n');

const PRELOAD_BOOTSTRAP_STUB = [
  PRELOAD_START,
  "try{const _eb=require('electron').ipcRenderer.sendSync('enhancer:get-bootstrap-sync');if(_eb&&!_eb.disabled&&_eb.code){(new Function('require','__ENHANCER_PAYLOAD__',_eb.code))(require,_eb);}}catch(_e){}",
  PRELOAD_END
].join('\n');

function parseAsarHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 16) {
    throw new Error('Invalid ASAR archive: buffer too small');
  }
  const i0 = buf.readUInt32LE(0);
  const i1 = buf.readUInt32LE(4);
  const i2 = buf.readUInt32LE(8);
  const i3 = buf.readUInt32LE(12);
  if (i0 !== 4 || i3 <= 0 || 16 + i3 > buf.length) {
    throw new Error(`Invalid ASAR v4 header integers: ${i0}, ${i1}, ${i2}, ${i3}`);
  }
  const headerStr = buf.toString('utf8', 16, 16 + i3);
  const headerObj = JSON.parse(headerStr);
  const payloadStart = 8 + i1;
  if (!headerObj || typeof headerObj.files !== 'object' || payloadStart > buf.length) {
    throw new Error('Invalid ASAR v4 header JSON structure');
  }
  return { headerObj, payloadStart };
}

function getEntry(headerObj, relParts) {
  let cur = headerObj;
  for (const part of relParts) {
    if (!cur || !cur.files || !Object.prototype.hasOwnProperty.call(cur.files, part)) {
      return null;
    }
    cur = cur.files[part];
  }
  return cur;
}

function readEntryBuffer(asarBuf, payloadStart, entry) {
  if (!entry || entry.unpacked || entry.link !== undefined || entry.offset === undefined) {
    return null;
  }
  const start = payloadStart + Number(entry.offset);
  const end = start + Number(entry.size);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end > asarBuf.length) {
    throw new Error(`ASAR entry out of bounds: offset=${entry.offset}, size=${entry.size}`);
  }
  return asarBuf.subarray(start, end);
}

function stripBootstrapBlock(content, startMarker, endMarker, legacyMarker) {
  let text = content;
  const escapedStart = startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockRe = new RegExp(`\\r?\\n?${escapedStart}[\\s\\S]*?${escapedEnd}\\r?\\n?`, 'g');
  text = text.replace(blockRe, '');
  if (legacyMarker) {
    const idx = text.indexOf(legacyMarker);
    if (idx !== -1) {
      text = text.slice(0, idx).replace(/\s+$/, '\n');
    }
  }
  return text;
}

function computeIntegrity(fileBuf, blockSize = 4194304) {
  const hash = crypto.createHash('sha256').update(fileBuf).digest('hex');
  const blocks = [];
  if (fileBuf.length === 0) {
    blocks.push(hash);
  } else {
    for (let off = 0; off < fileBuf.length; off += blockSize) {
      const slice = fileBuf.subarray(off, Math.min(off + blockSize, fileBuf.length));
      blocks.push(crypto.createHash('sha256').update(slice).digest('hex'));
    }
  }
  return { algorithm: 'SHA256', hash, blockSize, blocks };
}

function rebuildAsar(origBuf, headerObj, payloadStart, overrides) {
  const newFilesPayload = [];
  let currentOffset = 0;

  function cloneAndCollect(node, prefixParts) {
    if (node && typeof node.files === 'object') {
      const outDir = {};
      for (const [name, child] of Object.entries(node.files)) {
        outDir[name] = cloneAndCollect(child, [...prefixParts, name]);
      }
      return { files: outDir };
    }
    if (node && node.link !== undefined) {
      return { link: node.link };
    }
    if (node && node.unpacked) {
      return { ...node };
    }

    const relKey = prefixParts.join('/');
    const overrideBuf = Object.prototype.hasOwnProperty.call(overrides, relKey) ? overrides[relKey] : null;
    const fileBuf = overrideBuf || readEntryBuffer(origBuf, payloadStart, node);
    if (!fileBuf) {
      throw new Error(`Missing ASAR payload for ${relKey}`);
    }

    const blockSize = (node.integrity && node.integrity.blockSize) || 4194304;
    const nextEntry = {
      size: fileBuf.length,
      offset: String(currentOffset),
      integrity: overrideBuf || !node.integrity ? computeIntegrity(fileBuf, blockSize) : node.integrity
    };
    if (node.executable) {
      nextEntry.executable = true;
    }
    newFilesPayload.push(fileBuf);
    currentOffset += fileBuf.length;
    return nextEntry;
  }

  const newHeaderObj = cloneAndCollect(headerObj, []);
  const jsonBuf = Buffer.from(JSON.stringify(newHeaderObj), 'utf8');
  const paddedJsonLen = (jsonBuf.length + 3) & ~3;
  const headerBytes = Buffer.alloc(16 + paddedJsonLen, 0);
  headerBytes.writeUInt32LE(4, 0);
  headerBytes.writeUInt32LE(8 + paddedJsonLen, 4);
  headerBytes.writeUInt32LE(4 + paddedJsonLen, 8);
  headerBytes.writeUInt32LE(jsonBuf.length, 12);
  jsonBuf.copy(headerBytes, 16);

  return Buffer.concat([headerBytes, ...newFilesPayload]);
}

function inspectAsarStatus(asarPath) {
  if (!fs.existsSync(asarPath)) {
    return { exists: false, bootstrapped: false, hasMain: false, hasPreload: false };
  }
  // Read header + payload efficiently
  const buf = fs.readFileSync(asarPath);
  const { headerObj, payloadStart } = parseAsarHeader(buf);
  const mainEntry = getEntry(headerObj, ['dist', 'main.js']);
  const preloadEntry = getEntry(headerObj, ['dist', 'preload.js']);
  const mainTxt = mainEntry ? readEntryBuffer(buf, payloadStart, mainEntry).toString('utf8') : '';
  const preloadTxt = preloadEntry ? readEntryBuffer(buf, payloadStart, preloadEntry).toString('utf8') : '';
  const hasMain = mainTxt.includes(MAIN_START) && mainTxt.includes(MAIN_END);
  const hasPreload = preloadTxt.includes(PRELOAD_START) && preloadTxt.includes(PRELOAD_END);
  const hasLegacy = preloadTxt.includes('// Injected Korean localization engine') || preloadTxt.includes('Embedded GSAP');
  return {
    exists: true,
    bootstrapped: hasMain && hasPreload,
    hasMain,
    hasPreload,
    hasLegacy,
    sha256: crypto.createHash('sha256').update(buf).digest('hex')
  };
}

function writeAtomic(targetPath, dataBuf) {
  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, dataBuf);
  try {
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    throw err;
  }
}

function patchAsar(asarPath, options = {}) {
  if (!fs.existsSync(asarPath)) {
    throw new Error(`app.asar not found: ${asarPath}`);
  }
  const origBuf = fs.readFileSync(asarPath);
  const { headerObj, payloadStart } = parseAsarHeader(origBuf);
  const mainEntry = getEntry(headerObj, ['dist', 'main.js']);
  const preloadEntry = getEntry(headerObj, ['dist', 'preload.js']);
  if (!mainEntry || !preloadEntry) {
    throw new Error('Unexpected Antigravity ASAR structure: dist/main.js or dist/preload.js missing');
  }

  const mainRaw = readEntryBuffer(origBuf, payloadStart, mainEntry).toString('utf8');
  const preloadRaw = readEntryBuffer(origBuf, payloadStart, preloadEntry).toString('utf8');

  const alreadyMain = mainRaw.includes(MAIN_START) && mainRaw.includes(MAIN_END);
  const alreadyPreload = preloadRaw.includes(PRELOAD_START) && preloadRaw.includes(PRELOAD_END);
  const hasLegacy = preloadRaw.includes('// Injected Korean localization engine');

  if (alreadyMain && alreadyPreload && !hasLegacy && !options.force) {
    return { changed: false, alreadyPatched: true };
  }

  // Backup pristine vanilla ASAR when unpatched
  if (!alreadyMain && !alreadyPreload && !hasLegacy) {
    const backupPath = `${asarPath}.original`;
    try {
      const shouldWriteBackup = !fs.existsSync(backupPath) ||
        fs.statSync(backupPath).size !== origBuf.length;
      if (shouldWriteBackup) {
        fs.writeFileSync(backupPath, origBuf);
      }
    } catch (_) {}
  }

  const cleanMain = stripBootstrapBlock(mainRaw, MAIN_START, MAIN_END).trimEnd();
  const cleanPreload = stripBootstrapBlock(preloadRaw, PRELOAD_START, PRELOAD_END, '// Injected Korean localization engine').trimEnd();

  const nextMain = `${cleanMain}\n\n${MAIN_BOOTSTRAP_STUB}\n`;
  const nextPreload = `${cleanPreload}\n\n${PRELOAD_BOOTSTRAP_STUB}\n`;

  const outBuf = rebuildAsar(origBuf, headerObj, payloadStart, {
    'dist/main.js': Buffer.from(nextMain, 'utf8'),
    'dist/preload.js': Buffer.from(nextPreload, 'utf8')
  });

  writeAtomic(asarPath, outBuf);
  return {
    changed: true,
    alreadyPatched: false,
    originalSize: origBuf.length,
    patchedSize: outBuf.length
  };
}

function unpatchAsar(asarPath) {
  if (!fs.existsSync(asarPath)) {
    throw new Error(`app.asar not found: ${asarPath}`);
  }
  const backupPath = `${asarPath}.original`;
  const curBuf = fs.readFileSync(asarPath);
  const { headerObj, payloadStart } = parseAsarHeader(curBuf);
  const mainEntry = getEntry(headerObj, ['dist', 'main.js']);
  const preloadEntry = getEntry(headerObj, ['dist', 'preload.js']);
  if (!mainEntry || !preloadEntry) {
    throw new Error('Unexpected Antigravity ASAR structure');
  }

  const mainRaw = readEntryBuffer(curBuf, payloadStart, mainEntry).toString('utf8');
  const preloadRaw = readEntryBuffer(curBuf, payloadStart, preloadEntry).toString('utf8');

  if (!mainRaw.includes(MAIN_START) && !preloadRaw.includes(PRELOAD_START) && !preloadRaw.includes('// Injected Korean localization engine')) {
    return { changed: false, alreadyVanilla: true };
  }

  // Prefer stripping directly from current ASAR so any newer official Antigravity files stay intact,
  // unless legacy v2 cannot cleanly strip AND backup matches current version.
  const cleanMain = stripBootstrapBlock(mainRaw, MAIN_START, MAIN_END);
  const cleanPreload = stripBootstrapBlock(preloadRaw, PRELOAD_START, PRELOAD_END, '// Injected Korean localization engine');

  // If app.asar.original exists and its vanilla dist/main.js matches cleanMain length, exact byte restore preserves exact vanilla ASAR!
  if (fs.existsSync(backupPath)) {
    try {
      const origBuf = fs.readFileSync(backupPath);
      const parsedOrig = parseAsarHeader(origBuf);
      const origMainEntry = getEntry(parsedOrig.headerObj, ['dist', 'main.js']);
      const origPreloadEntry = getEntry(parsedOrig.headerObj, ['dist', 'preload.js']);
      if (origMainEntry && origPreloadEntry) {
        const origMain = readEntryBuffer(origBuf, parsedOrig.payloadStart, origMainEntry).toString('utf8');
        const origPreload = readEntryBuffer(origBuf, parsedOrig.payloadStart, origPreloadEntry).toString('utf8');
        if (origMain.trimEnd() === cleanMain.trimEnd() && origPreload.trimEnd() === cleanPreload.trimEnd()) {
          writeAtomic(asarPath, origBuf);
          return { changed: true, restoredExactBackup: true };
        }
      }
    } catch (_) {}
  }

  const outBuf = rebuildAsar(curBuf, headerObj, payloadStart, {
    'dist/main.js': Buffer.from(cleanMain, 'utf8'),
    'dist/preload.js': Buffer.from(cleanPreload, 'utf8')
  });
  writeAtomic(asarPath, outBuf);
  return { changed: true, restoredExactBackup: false };
}

module.exports = {
  MAIN_START,
  MAIN_END,
  PRELOAD_START,
  PRELOAD_END,
  MAIN_BOOTSTRAP_STUB,
  PRELOAD_BOOTSTRAP_STUB,
  parseAsarHeader,
  getEntry,
  readEntryBuffer,
  inspectAsarStatus,
  patchAsar,
  unpatchAsar
};
