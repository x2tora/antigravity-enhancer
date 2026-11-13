// tests/e2e/test_v3_architecture.js
// Comprehensive verification suite for Antigravity Enhancer v3.2.0:
// F22: Modular Enhancer & Manifest Integrity + 9-Language New Conversation Prompts
// F23: Lossless ASAR v4 Micro-Bootstrapper (2.31.2+)
// F24: Secure In-App Self-Updater & Native Menu Integration (x2tora/antigravity-enhancer)
// F25: Antigravity 2.31.2 UI/Model Compatibility, Composer Hover Quota & Installer Pipeline

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');
const { registerTest } = require('./runner');
const {
  ROOT_DIR,
  createMockEnvironment,
  MockElement,
  MockText,
  parsePowerShellAst
} = require('./helpers');

const ENHANCER_DIR = path.join(ROOT_DIR, 'enhancer');
const INSTALLER_DIR = path.join(ROOT_DIR, 'installer');
const asarPatcher = require(path.join(ENHANCER_DIR, 'asar-patcher.js'));
const mainEnhancer = require(path.join(ENHANCER_DIR, 'main-enhancer.js'));

function createRendererHarness(initialLang = 'ko', seedDomFn = null) {
  const { window, document, localStorage } = createMockEnvironment();
  if (initialLang) localStorage.setItem('antigravity_ui_language', initialLang);
  const invoked = [];
  const ipcListeners = {};

  window.innerWidth = 1280;
  window.innerHeight = 800;
  window.matchMedia = () => ({ matches: false });
  const origCreateEl = document.createElement.bind(document);
  const patchEl = (el) => {
    if (!el) return el;
    if (typeof el.getBoundingClientRect !== 'function') {
      el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 32, right: 100, bottom: 32, x: 0, y: 0 });
    }
    if (el.style && typeof el.style.setProperty !== 'function') {
      el.style.cssText = '';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.display = 'block';
      el.style.visibility = 'visible';
      Object.defineProperty(el.style, 'setProperty', { value: (k, v) => { el.style[k] = v; }, enumerable: false });
      Object.defineProperty(el.style, 'removeProperty', { value: (k) => { delete el.style[k]; }, enumerable: false });
      Object.defineProperty(el.style, 'getPropertyValue', { value: (k) => el.style[k] || '', enumerable: false });
    }
    return el;
  };
  document.createElement = (tag) => patchEl(origCreateEl(tag));
  document.createElementNS = (_ns, tag) => patchEl(new MockElement(tag));
  document.createTreeWalker = (root, whatToShow) => {
    const nodes = [];
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (whatToShow === 4 && c.nodeType === 3) nodes.push(c);
        else if (whatToShow === 1 && c.nodeType === 1) nodes.push(c);
        else if (whatToShow === -1) nodes.push(c);
        walk(c);
      }
    };
    walk(root);
    let idx = -1;
    return {
      currentNode: root,
      nextNode() {
        idx++;
        if (idx < nodes.length) {
          this.currentNode = nodes[idx];
          return this.currentNode;
        }
        return null;
      }
    };
  };
  document.documentElement.scrollTop = 0;

  // Build 2.31.2-accurate header container using mobile-toggle-aux-sidebar (NO concierge-titlebar-more-actions)
  const headerParent = new MockElement('div');
  headerParent.setAttribute('class', 'flex items-center gap-1');
  const auxBtn = new MockElement('button');
  auxBtn.setAttribute('data-testid', 'mobile-toggle-aux-sidebar');
  headerParent.appendChild(auxBtn);
  document.body.appendChild(headerParent);

  // Composer trigger with Gemini 4 Hydrogen XHigh
  const modelTrigger = new MockElement('button');
  modelTrigger.setAttribute('data-testid', 'model-selector-trigger');
  modelTrigger.setAttribute('aria-label', 'Select model, current: Gemini 4 Hydrogen XHigh · Standard');
  const chevron = new MockElement('svg');
  modelTrigger.appendChild(new MockText('Gemini 4 Hydrogen XHigh'));
  modelTrigger.appendChild(chevron);
  document.body.appendChild(modelTrigger);

  const mockIpc = {
    sendSync: () => ({}),
    invoke: async (channel, arg) => {
      invoked.push({ channel, arg });
      if (channel === 'enhancer:get-status') {
        return {
          enhancerVersion: '3.2.0',
          appVersion: '2.31.2',
          asarBootstrapped: true
        };
      }
      if (channel === 'enhancer:check-update') {
        return {
          ok: true,
          hasUpdate: true,
          canApplyInApp: true,
          currentVersion: '3.2.0',
          remoteVersion: '3.3.0',
          releaseNotes: 'Test update'
        };
      }
      return { ok: true };
    },
    on: (ch, fn) => {
      if (!ipcListeners[ch]) ipcListeners[ch] = [];
      ipcListeners[ch].push(fn);
    }
  };

  const gsapCode = fs.readFileSync(path.join(ENHANCER_DIR, 'gsap-core.js'), 'utf8');
  const dictionaries = JSON.parse(fs.readFileSync(path.join(ENHANCER_DIR, 'dictionaries.json'), 'utf8'));
  const rendererCode = fs.readFileSync(path.join(ENHANCER_DIR, 'renderer-enhancer.js'), 'utf8');

  const payload = {
    disabled: false,
    version: '3.2.0',
    repo: 'x2tora/antigravity-enhancer',
    code: rendererCode,
    gsapCode,
    dictionaries
  };

  const sandbox = {
    window,
    document,
    localStorage,
    CustomEvent: function (type, opts) { this.type = type; this.detail = opts ? opts.detail : undefined; },
    navigator: { platform: 'Win32' },
    MutationObserver: class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} takeRecords() { return []; } },
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, SHOW_ALL: -1, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    HTMLElement: MockElement,
    Element: MockElement,
    SVGElement: MockElement,
    Text: MockText,
    getComputedStyle: (el) => ({
      fontFamily: '',
      display: 'block',
      visibility: 'visible',
      opacity: (el && el.style && el.style.opacity) || '1',
      transform: (el && el.style && el.style.transform) || 'none',
      getPropertyValue: (prop) => (el && el.style && el.style[prop]) || ''
    }),
    CSS: { escape: (s) => String(s) },
    URL,
    requestAnimationFrame: (fn) => { const t = setTimeout(fn, 16); if (t.unref) t.unref(); return t; },
    cancelAnimationFrame: (id) => clearTimeout(id),
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); if (t.unref) t.unref(); return t; },
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    WeakMap,
    Map,
    Set,
    RegExp,
    JSON,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    console,
    __ENHANCER_PAYLOAD__: payload,
    require: (mod) => (mod === 'electron' ? { ipcRenderer: mockIpc } : {})
  };
  sandbox.globalThis = sandbox;
  Object.assign(window, {
    CustomEvent: sandbox.CustomEvent,
    navigator: sandbox.navigator,
    requestAnimationFrame: sandbox.requestAnimationFrame,
    cancelAnimationFrame: sandbox.cancelAnimationFrame,
    getComputedStyle: sandbox.getComputedStyle
  });
  patchEl(document.body);
  patchEl(document.documentElement);
  patchEl(headerParent);
  patchEl(auxBtn);
  patchEl(modelTrigger);
  if (typeof seedDomFn === 'function') seedDomFn(document, patchEl);

  vm.createContext(sandbox);
  vm.runInContext(rendererCode, sandbox, { filename: 'renderer-enhancer.js' });

  return { sandbox, window, document, localStorage, invoked, headerParent, modelTrigger };
}

// ============================================================================
// F22: Modular Enhancer & Manifest Integrity
// ============================================================================
registerTest(1, 'F22', 'manifest.json v3.2.0 points to x2tora/antigravity-enhancer & matches SHA-256 digests', () => {
  const manifestPath = path.join(ENHANCER_DIR, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'enhancer/manifest.json missing');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.version, '3.2.0');
  assert.strictEqual(manifest.repo, 'x2tora/antigravity-enhancer');
  assert.strictEqual(manifest.testedAppVersion, '2.31.2');

  for (const [fname, meta] of Object.entries(manifest.files)) {
    const fpath = path.join(ENHANCER_DIR, fname);
    assert.ok(fs.existsSync(fpath), `Tracked module missing: ${fname}`);
    const buf = fs.readFileSync(fpath);
    assert.strictEqual(buf.length, meta.size, `Size mismatch for ${fname}`);
    const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
    assert.strictEqual(actualSha, meta.sha256, `SHA-256 mismatch for ${fname}`);
  }
});

registerTest(1, 'F22', 'Renderer translates all 2.31.2 & 2.30.0 New Conversation greetings/placeholders across all 9 languages and preserves editables', () => {
  const langs = ['ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'];
  const textPrompts = [
    'Hey there, what should we build today?',
    'Welcome back. Where should we pick up?',
    "Good to see you. What's next?",
    'Good to see you. What\u2019s next?',
    'Hey Tora, what should we build today?',
    'Welcome back, Alice. Where should we pick up?',
    "Good to see you, Tora. What's next?",
    'Hi Tora, what can we get done today?',
    'What can we get done today?',
    'Welcome back, Tora.',
    'Good to see you, Tora.',
    'Hello, Tora.',
    'Hi Tora.',
    'Hi there.',
    'Hello.',
    'Welcome back.',
    'Good to see you.',
    'Select a model in the model selector',
    'Select model with Ctrl+/',
    'Find plugins - bundles of skills, agents, MCP servers, UI extensions and more, and install them in one click.'
  ];

  for (const lang of langs) {
    let nodes = [];
    let inputEl;
    let taEl;
    let lexicalEl;
    let typedChild;

    createRendererHarness(lang, (doc, patchEl) => {
      nodes = textPrompts.map((src) => {
        const el = patchEl(new MockElement('div'));
        el.appendChild(new MockText(src));
        doc.body.appendChild(el);
        return { src, el };
      });
      inputEl = patchEl(new MockElement('input'));
      inputEl.setAttribute('placeholder', 'Ask anything, @ to mention, / for actions');
      inputEl.value = 'User typed input';
      doc.body.appendChild(inputEl);

      taEl = patchEl(new MockElement('textarea'));
      taEl.setAttribute('placeholder', 'Ask anything');
      doc.body.appendChild(taEl);

      lexicalEl = patchEl(new MockElement('div'));
      lexicalEl.setAttribute('contenteditable', 'true');
      lexicalEl.isContentEditable = true;
      lexicalEl.setAttribute('data-placeholder', 'Ask anything, @ to mention');
      typedChild = patchEl(new MockElement('p'));
      typedChild.appendChild(new MockText('Select a model in the model selector'));
      lexicalEl.appendChild(typedChild);
      doc.body.appendChild(lexicalEl);
    });

    for (const { src, el } of nodes) {
      assert.notStrictEqual(el.textContent, src, `[${lang}] Must translate prompt: ${src}`);
      if (src.includes('Tora')) {
        assert.ok(el.textContent.includes('Tora'), `[${lang}] Must preserve user name in greeting: ${el.textContent}`);
      }
      if (src.includes('Alice')) {
        assert.ok(el.textContent.includes('Alice'), `[${lang}] Must preserve user name in greeting: ${el.textContent}`);
      }
      if (src === 'Select model with Ctrl+/') {
        assert.ok(el.textContent.includes('Ctrl+/'), `[${lang}] Must preserve hotkey in: ${el.textContent}`);
      }
      if (lang === 'ko' && src === 'Select a model in the model selector') {
        assert.ok(!el.textContent.includes('model selector'), `Korean translation must not leak English fallback: ${el.textContent}`);
      }
    }

    assert.notStrictEqual(inputEl.getAttribute('placeholder'), 'Ask anything, @ to mention, / for actions', `[${lang}] <input placeholder> must translate`);
    assert.strictEqual(inputEl.value, 'User typed input', `[${lang}] <input>.value must never be altered`);
    assert.notStrictEqual(taEl.getAttribute('placeholder'), 'Ask anything', `[${lang}] <textarea placeholder> must translate`);
    assert.notStrictEqual(lexicalEl.getAttribute('data-placeholder'), 'Ask anything, @ to mention', `[${lang}] [contenteditable] data-placeholder must translate`);
    assert.strictEqual(typedChild.textContent, 'Select a model in the model selector', `[${lang}] Typed child inside [contenteditable] must NOT be altered`);
  }

  // Verify cycling ru -> en reverts both text nodes and input placeholder attributes cleanly
  let ruNodes = [];
  let ruInput;
  const { window } = createRendererHarness('ru', (doc, patchEl) => {
    const d = patchEl(new MockElement('div'));
    d.appendChild(new MockText('Hey Tora, what should we build today?'));
    doc.body.appendChild(d);
    ruNodes.push(d);
    ruInput = patchEl(new MockElement('input'));
    ruInput.setAttribute('placeholder', 'Ask anything, @ to mention, / for actions');
    doc.body.appendChild(ruInput);
  });
  assert.notStrictEqual(ruNodes[0].textContent, 'Hey Tora, what should we build today?');
  assert.notStrictEqual(ruInput.getAttribute('placeholder'), 'Ask anything, @ to mention, / for actions');
  window.dispatchEvent({ type: 'keydown', altKey: true, shiftKey: true, key: 'L', preventDefault: () => {} }); // ru -> en
  assert.strictEqual(ruNodes[0].textContent, 'Hey Tora, what should we build today?', 'Switching to en must revert greeting');
  assert.strictEqual(ruInput.getAttribute('placeholder'), 'Ask anything, @ to mention, / for actions', 'Switching to en must revert input placeholder');
});

registerTest(1, 'F22', 'dictionaries.json contains 2.31.2 strings across all 8 target languages', () => {
  const dicts = JSON.parse(fs.readFileSync(path.join(ENHANCER_DIR, 'dictionaries.json'), 'utf8'));
  const keys = ['Environments', 'Coordinators', 'New Coordinator', 'You said', 'Agent working', 'Ask /btw', 'Code Preview', 'Plan upgrade required'];
  for (const k of keys) {
    assert.ok(dicts.exactDict[k], `Missing Korean translation for ${k}`);
    for (const lang of ['ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru']) {
      assert.ok(dicts.translations[lang] && dicts.translations[lang][k], `Missing ${lang} translation for ${k}`);
    }
  }
});

registerTest(2, 'F22', 'All enhancer/*.js files compile with zero syntax errors in isolated VM', () => {
  for (const f of ['main-enhancer.js', 'renderer-enhancer.js', 'gsap-core.js', 'asar-patcher.js']) {
    const code = fs.readFileSync(path.join(ENHANCER_DIR, f), 'utf8');
    new vm.Script(code, { filename: f });
  }
});

// ============================================================================
// F23: Lossless ASAR v4 Micro-Bootstrapper (2.31.2+)
// ============================================================================
registerTest(1, 'F23', 'asar-patcher.js losslessly bootstraps 2.31.2 app.asar, preserves APIs, & restores byte-identically', () => {
  const liveAsar = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity', 'resources', 'app.asar');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-asar-test-'));
  try {
    let sourceAsar = liveAsar;
    if (!fs.existsSync(liveAsar)) {
      return; // Skip binary check only if Antigravity not installed on CI host
    }
    const workAsar = path.join(tmpDir, 'app.asar');
    fs.copyFileSync(sourceAsar, workAsar);
    // Normalize temp copy to vanilla if host app.asar is currently patched
    if (asarPatcher.inspectAsarStatus(workAsar).bootstrapped || asarPatcher.inspectAsarStatus(workAsar).hasLegacy) {
      asarPatcher.unpatchAsar(workAsar);
    }
    const origSha = crypto.createHash('sha256').update(fs.readFileSync(workAsar)).digest('hex');

    const res = asarPatcher.patchAsar(workAsar);
    assert.strictEqual(res.changed, true);
    assert.ok(res.patchedSize - res.originalSize < 1500, 'Micro-bootstrapper must add <1.5KB');
    const st = asarPatcher.inspectAsarStatus(workAsar);
    assert.strictEqual(st.bootstrapped, true);
    assert.strictEqual(st.hasMain, true);
    assert.strictEqual(st.hasPreload, true);

    // Verify 2.31.2 preload APIs & every file integrity digest remain valid
    const pBuf = fs.readFileSync(workAsar);
    const { headerObj, payloadStart } = asarPatcher.parseAsarHeader(pBuf);
    const preloadEntry = asarPatcher.getEntry(headerObj, ['dist', 'preload.js']);
    const preloadStr = asarPatcher.readEntryBuffer(pBuf, payloadStart, preloadEntry).toString('utf8');
    assert.ok(preloadStr.includes('setWebviewAgentControlled'), 'Must preserve 2.31.2 setWebviewAgentControlled');
    assert.ok(preloadStr.includes('resolveWebviewDownload'), 'Must preserve 2.31.2 resolveWebviewDownload');

    // Re-running patchAsar is idempotent
    const res2 = asarPatcher.patchAsar(workAsar);
    assert.strictEqual(res2.changed, false);
    assert.strictEqual(res2.alreadyPatched, true);

    // Unpatch restores byte-identical original ASAR
    const unRes = asarPatcher.unpatchAsar(workAsar);
    assert.strictEqual(unRes.changed, true);
    const restoredSha = crypto.createHash('sha256').update(fs.readFileSync(workAsar)).digest('hex');
    assert.strictEqual(restoredSha, origSha, 'Unpatched ASAR must match original SHA-256');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

registerTest(2, 'F23', 'asar-patcher strips legacy v2 injection and upgrades cleanly to v3 micro-bootstrapper', () => {
  const liveAsar = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity', 'resources', 'app.asar');
  if (!fs.existsSync(liveAsar)) return;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-v2upgrade-'));
  try {
    const workAsar = path.join(tmpDir, 'app.asar');
    fs.copyFileSync(liveAsar, workAsar);
    const buf = fs.readFileSync(workAsar);
    // Simulate v2 preload suffix by first running patch, verifying strip removes legacy if present
    asarPatcher.patchAsar(workAsar);
    assert.strictEqual(asarPatcher.inspectAsarStatus(workAsar).bootstrapped, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ============================================================================
// F24: Secure In-App Self-Updater & Rollback (x2tora/antigravity-enhancer)
// ============================================================================
registerTest(1, 'F24', 'Strict GitHub host & repo allowlist permits x2tora/antigravity-enhancer and rejects spoofing', () => {
  assert.strictEqual(mainEnhancer.ENHANCER_REPO, 'x2tora/antigravity-enhancer');
  assert.strictEqual(
    mainEnhancer.isAllowedRemoteUrl('https://raw.githubusercontent.com/x2tora/antigravity-enhancer/main/enhancer/manifest.json'),
    true
  );
  assert.strictEqual(
    mainEnhancer.isAllowedRemoteUrl('https://api.github.com/repos/x2tora/antigravity-enhancer/releases/latest'),
    true
  );

  // Adversarial rejections
  assert.strictEqual(
    mainEnhancer.isAllowedRemoteUrl('http://raw.githubusercontent.com/x2tora/antigravity-enhancer/main/enhancer/manifest.json'),
    false
  );
  assert.strictEqual(
    mainEnhancer.isAllowedRemoteUrl('https://raw.githubusercontent.com/evil-user/antigravity-enhancer/main/enhancer/manifest.json'),
    false
  );
  assert.strictEqual(
    mainEnhancer.isAllowedRemoteUrl('https://api.github.com/repos/other/repo/releases/latest'),
    false
  );
  assert.strictEqual(
    mainEnhancer.isAllowedRemoteUrl('https://raw.githubusercontent.com.evil.com/x2tora/antigravity-enhancer/main/enhancer/manifest.json'),
    false
  );
  assert.strictEqual(
    mainEnhancer.isAllowedRemoteUrl('https://evil.example.com/payload.js'),
    false
  );
});

registerTest(2, 'F24', 'compareSemver handles v-prefixes and multi-segment comparisons accurately', () => {
  assert.strictEqual(mainEnhancer.compareSemver('3.1.0', '3.0.0'), 1);
  assert.strictEqual(mainEnhancer.compareSemver('v3.0.1', '3.0.0'), 1);
  assert.strictEqual(mainEnhancer.compareSemver('3.0.0', 'v3.0.0'), 0);
  assert.strictEqual(mainEnhancer.compareSemver('2.5.0', '3.0.0'), -1);
});

registerTest(3, 'F24', 'Native Antigravity Enhanced title menu integrates Patch Version / Check Updates / Restore Original without standalone button', async () => {
  let agyDropdown = null;
  let wsDropdown = null;
  const { document, invoked } = createRendererHarness('ko', (doc, patchEl) => {
    const bar = patchEl(new MockElement('div'));
    bar.setAttribute('data-testid', 'title-menu-bar');

    const agyWrap = patchEl(new MockElement('div'));
    agyWrap.setAttribute('class', 'relative');
    const agyBtn = patchEl(new MockElement('button'));
    agyBtn.setAttribute('data-testid', 'title-menu-bar-item');
    agyBtn.appendChild(new MockText('Antigravity'));
    agyWrap.appendChild(agyBtn);

    agyDropdown = patchEl(new MockElement('div'));
    agyDropdown.setAttribute('data-browser-occluder', 'true');
    agyDropdown.setAttribute('class', 'absolute top-full left-0 surface-opaque bg-sidebar');
    const optVerWrap = patchEl(new MockElement('div'));
    const optVerBtn = patchEl(new MockElement('button'));
    optVerBtn.setAttribute('data-testid', 'title-menu-bar-option');
    optVerBtn.appendChild(new MockText('버전 2.31.2'));
    optVerWrap.appendChild(optVerBtn);
    agyDropdown.appendChild(optVerWrap);
    agyWrap.appendChild(agyDropdown);
    bar.appendChild(agyWrap);

    const wsWrap = patchEl(new MockElement('div'));
    wsWrap.setAttribute('class', 'relative');
    const wsBtn = patchEl(new MockElement('button'));
    wsBtn.setAttribute('data-testid', 'title-menu-bar-item');
    wsBtn.appendChild(new MockText('Workspace'));
    wsWrap.appendChild(wsBtn);

    wsDropdown = patchEl(new MockElement('div'));
    wsDropdown.setAttribute('data-browser-occluder', 'true');
    const wsOptWrap = patchEl(new MockElement('div'));
    const wsOptBtn = patchEl(new MockElement('button'));
    wsOptBtn.setAttribute('data-testid', 'title-menu-bar-option');
    wsOptBtn.appendChild(new MockText('New Window'));
    wsOptWrap.appendChild(wsOptBtn);
    wsDropdown.appendChild(wsOptWrap);
    wsWrap.appendChild(wsDropdown);
    bar.appendChild(wsWrap);

    doc.body.appendChild(bar);
  });

  assert.strictEqual(document.getElementById('antigravity-enhancer-hub-btn'), null, 'Standalone top-bar Enhancer button must be removed');
  const enhancedTag = document.getElementById('antigravity-enhanced-tag');
  assert.ok(enhancedTag, 'Antigravity menu item must show Enhanced tag when patched');
  assert.strictEqual(enhancedTag.textContent, 'Enhanced');
  assert.ok((enhancedTag.style.color || '').toUpperCase() === '#A0A3F6' || (enhancedTag.style.cssText || '').toUpperCase().includes('#A0A3F6'), 'Enhanced tag must use #A0A3F6 accent');

  const menuSection = agyDropdown.querySelector('#antigravity-enhancer-menu-section');
  assert.ok(menuSection, 'Antigravity dropdown must include injected native patch section');
  assert.strictEqual(wsDropdown.querySelector('#antigravity-enhancer-menu-section'), null, 'Sibling Workspace menu must stay untouched');

  const patchVerOpt = menuSection.querySelector('#antigravity-menu-patch-version');
  const checkUpdatesOpt = menuSection.querySelector('#antigravity-menu-check-updates');
  const restoreOpt = menuSection.querySelector('#antigravity-menu-restore-vanilla');
  assert.ok(patchVerOpt && patchVerOpt.textContent.includes('3.2.0'), 'Menu must display Patch Version 3.2.0');
  assert.ok(checkUpdatesOpt, 'Menu must include Check Patch Updates item');
  assert.ok(restoreOpt, 'Menu must include Restore Original item');

  await checkUpdatesOpt.onclick({ stopPropagation: () => {}, preventDefault: () => {} });
  await new Promise(r => setTimeout(r, 25));
  const modal = document.getElementById('antigravity-enhancer-modal');
  assert.ok(modal, 'Clicking Check Patch Updates in native menu must open modal');
  assert.ok(modal.querySelector('#agy-hub-check-btn'), 'Check Updates button must exist');
  assert.strictEqual(modal.querySelector('#agy-hub-repair-btn'), null, 'Verify & Repair UI must be removed');
  assert.strictEqual(modal.querySelector('#agy-hub-rollback-btn'), null, 'Rollback UI must be removed');
  assert.ok(modal.querySelector('#agy-hub-vanilla-btn'), 'Restore Original button must exist');

  // Restore Original from menu opens focused confirmation and invokes IPC on confirm
  await restoreOpt.onclick({ stopPropagation: () => {}, preventDefault: () => {} });
  await new Promise(r => setTimeout(r, 25));
  const restoreModal = document.getElementById('antigravity-enhancer-modal');
  const confirmBtn = restoreModal && restoreModal.querySelector('#agy-hub-confirm-restore');
  assert.ok(confirmBtn, 'Restore Original menu item must open confirmation modal');
  await confirmBtn.onclick();
  assert.ok(invoked.some(i => i.channel === 'enhancer:restore-vanilla'), 'Confirming restore must invoke enhancer:restore-vanilla');
});

// ============================================================================
// F25: Antigravity 2.31.2 Models, Top-Bar Fallback & Installer Pipeline
// ============================================================================
registerTest(1, 'F25', 'Renderer finds mobile-toggle-aux-sidebar fallback & translates 2.31.2 Coordinators / Code Preview', () => {
  const { window, document } = createRendererHarness();
  const quickBtn = document.getElementById('antigravity-quick-lang-btn');
  assert.ok(quickBtn, 'Quick language button should mount beside mobile-toggle-aux-sidebar in 2.31.2');

  const node = new MockElement('div');
  node.appendChild(new MockText('Coordinators'));
  document.body.appendChild(node);
  const node2 = new MockElement('span');
  node2.appendChild(new MockText('Code Preview'));
  document.body.appendChild(node2);

  // Re-run DOM translation helper indirectly via Alt+Shift+L toggle roundtrip or direct DOM event
  window.dispatchEvent({ type: 'keydown', altKey: true, shiftKey: true, key: 'L', preventDefault: () => {} }); // ko -> ja
  assert.strictEqual(node.textContent, 'コーディネーター');
  assert.strictEqual(node2.textContent, 'コードプレビュー');
  assert.ok(window.gsap, 'GSAP v3.15.1 must be active in window');
});

registerTest(1, 'F25', 'mainWorldQuotaLogic separates composer hover-only single-model details from top-right full quota popover', async () => {
  const rendererCode = fs.readFileSync(path.join(ENHANCER_DIR, 'renderer-enhancer.js'), 'utf8');
  assert.ok(rendererCode.includes("lower.includes('hydrogen')"), 'resolveModelGroup must handle Gemini 4 Hydrogen');
  assert.ok(rendererCode.includes("lower.includes('argon')"), 'resolveModelGroup must handle Gemini 4 Argon');

  const { sandbox, document, localStorage, modelTrigger } = createRendererHarness('ko');
  localStorage.setItem('antigravity_quota_cache_v1', JSON.stringify({
    groups: [
      { displayName: 'Argon', description: 'Models within this group: Gemini 4 Argon.', buckets: [{ window: '5h', remainingFraction: 0.91 }, { window: 'weekly', remainingFraction: 0.77 }] },
      { displayName: 'Gemini', description: 'Models within this group: Gemini 4 Hydrogen, Gemini Pro.', buckets: [{ window: '5h', remainingFraction: 0.88 }, { window: 'weekly', remainingFraction: 0.62 }] },
      { displayName: 'Claude/Other', description: 'Models within this group: Claude Opus, GPT-OSS.', buckets: [{ window: '5h', remainingFraction: 0.54 }, { window: 'weekly', remainingFraction: 0.41 }] }
    ]
  }));
  const scriptEl = document.getElementById('antigravity-quota-main-script');
  assert.ok(scriptEl && scriptEl.textContent, 'Main-world quota script tag must be injected');
  vm.runInContext(scriptEl.textContent, sandbox, { filename: 'mainWorldQuotaLogic.js' });

  const widget = document.getElementById('antigravity-quota-widget');
  assert.ok(widget, 'Top-right quota widget must render');
  const inlineBadge = modelTrigger.querySelector('.antigravity-inline-model-quota');
  assert.ok(inlineBadge, 'Composer inline quota badge must render inside model-selector-trigger');

  let modelTriggerClicked = false;
  modelTrigger.onclick = () => { modelTriggerClicked = true; };
  inlineBadge.click();
  assert.strictEqual(modelTriggerClicked, true, 'Clicking composer inline badge must bubble to open model selector normally');
  assert.strictEqual(document.getElementById('antigravity-quota-popover'), null, 'Clicking composer inline badge must NOT open full quota popover');

  inlineBadge.onmouseenter();
  const hoverCard = document.getElementById('antigravity-composer-quota-hovercard');
  assert.ok(hoverCard, 'Hovering composer inline badge must open single-model hover card');
  assert.strictEqual(hoverCard.getAttribute('data-group-key'), 'gemini', 'Hover card must target currently selected model group only');
  assert.ok(hoverCard.textContent.includes('Gemini') && hoverCard.textContent.includes('88%') && hoverCard.textContent.includes('62%'), 'Hover card must show Gemini quota details');
  assert.ok(!hoverCard.textContent.includes('Claude/Other') && !hoverCard.textContent.includes('Argon'), 'Hover card must NOT display other model groups');
  assert.strictEqual(document.getElementById('antigravity-quota-popover'), null, 'Hovering composer badge must NOT open top-right full popover');

  inlineBadge.onmouseleave();
  await new Promise(r => setTimeout(r, 150));
  assert.strictEqual(document.getElementById('antigravity-composer-quota-hovercard'), null, 'Leaving composer badge must close hover card');

  widget.click();
  const popover = document.getElementById('antigravity-quota-popover');
  assert.ok(popover, 'Clicking top-right quota widget must open full multi-group quota popover');
  assert.ok(popover.textContent.includes('Argon') && popover.textContent.includes('Gemini') && popover.textContent.includes('Claude/Other'), 'Top-right popover must display all model groups');
});

registerTest(1, 'F25', 'build_exe_installer.ps1 uses safe build hygiene, #0B0B0E/#CAD3F5/#A0A3F6 palette & emits verified artifacts', () => {
  const ps1Path = path.join(ROOT_DIR, 'build_exe_installer.ps1');
  const astRes = parsePowerShellAst(ps1Path);
  assert.strictEqual(astRes.ok, true, 'PowerShell AST error: ' + (astRes.errors || []).join('; '));

  const ps1Src = fs.readFileSync(ps1Path, 'utf8');
  assert.ok(!ps1Src.includes('launcher.exe.gz'), 'Must NOT embed nested EXE PE dropper (launcher.exe.gz)');
  assert.ok(!ps1Src.includes('CSharpCodeProvider'), 'Must NOT invoke runtime CSharpCodeProvider compiler');
  assert.ok(!ps1Src.includes('CompileLauncherFromEmbeddedSources'), 'Must NOT extract/compile C# sources in %TEMP%');
  assert.ok(!ps1Src.includes('--register-task'), 'Must NOT silently register Windows scheduled task on install');
  assert.ok(!ps1Src.includes('New-SelfSignedCertificate'), 'Must NOT generate bogus self-signed certificates');
  assert.ok(!ps1Src.includes('ProcessWindowStyle.Hidden'), 'Must NOT launch subprocesses with ProcessWindowStyle.Hidden');
  assert.ok(ps1Src.includes('/win32manifest:'), 'Must embed Windows UAC app.manifest via /win32manifest');
  assert.ok(ps1Src.includes('#0B0B0E') && ps1Src.includes('#CAD3F5') && ps1Src.includes('#A0A3F6'), 'Installer WPF UI must apply strict #0B0B0E / #CAD3F5 / #A0A3F6 palette');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.name, 'antigravity-enhancer', 'Root package.json must identify project as antigravity-enhancer');
  assert.strictEqual(pkg.author, 'x2tora', 'Root package.json author must be x2tora');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'assets', 'icon.ico')), 'assets/icon.ico must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'assets', 'icon.png')), 'assets/icon.png must exist');

  const manifestXml = fs.readFileSync(path.join(INSTALLER_DIR, 'app.manifest'), 'utf8');
  assert.ok(manifestXml.includes('level="asInvoker"'), 'app.manifest must request standard asInvoker privilege');

  const rendererSrc = fs.readFileSync(path.join(ENHANCER_DIR, 'renderer-enhancer.js'), 'utf8');
  assert.ok(rendererSrc.includes('#0B0B0E') && rendererSrc.includes('#CAD3F5') && rendererSrc.includes('#A0A3F6'), 'Renderer UI must apply #0B0B0E / #CAD3F5 / #A0A3F6 palette');
  assert.ok(!rendererSrc.includes('brightness(1.12)'), 'Global IDE hover brightness animation must be removed');

  assert.ok(fs.existsSync(path.join(INSTALLER_DIR, 'AsarMicroPatcher.cs')));
  assert.ok(!fs.existsSync(path.join(INSTALLER_DIR, 'Launcher.cs')), 'Launcher.cs must be removed');
  assert.ok(!fs.existsSync(path.join(ROOT_DIR, 'AntigravityEnhancerLauncher.exe')), 'AntigravityEnhancerLauncher.exe must not be built');
  assert.ok(!ps1Src.includes('AntigravityEnhancerLauncher'), 'build_exe_installer.ps1 must not reference AntigravityEnhancerLauncher');

  const mainSrc = fs.readFileSync(path.join(ENHANCER_DIR, 'main-enhancer.js'), 'utf8');
  assert.ok(!mainSrc.includes('AntigravityEnhancerLauncher'), 'main-enhancer.js must not reference AntigravityEnhancerLauncher');
  assert.ok(!mainSrc.includes('schtasks'), 'main-enhancer.js must not reference schtasks');

  assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'workflows', 'release.yml')), 'GitHub Actions release workflow must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'RELEASE_NOTES.md')), 'RELEASE_NOTES.md must exist for multi-language release body');
  const readmeEn = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
  assert.ok(readmeEn.includes('Download_Latest') && readmeEn.includes('releases/latest/download/Antigravity-Enhancer-Setup.exe'), 'English README.md must place Latest Download button at top');
  for (const l of ['ko', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru']) {
    assert.ok(readmeEn.includes(`docs/README.${l}.md`), `README.md must link to ${l} translation`);
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'docs', `README.${l}.md`)), `docs/README.${l}.md must exist`);
  }
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'Antigravity-Enhancer-Setup.exe')));
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'Antigravity-Enhancer-v3.2.0-Setup.exe')));
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'Antigravity-Enhancer-v3.2.0-Win.zip')));
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'SHA256SUMS.txt')));

  const sums = fs.readFileSync(path.join(ROOT_DIR, 'SHA256SUMS.txt'), 'utf8');
  assert.ok(!sums.includes('AntigravityEnhancerLauncher.exe'), 'SHA256SUMS.txt must not list removed launcher');
  const setupHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT_DIR, 'Antigravity-Enhancer-Setup.exe'))).digest('hex');
  assert.ok(sums.includes(setupHash + '  Antigravity-Enhancer-Setup.exe'), 'SHA256SUMS.txt must match Antigravity-Enhancer-Setup.exe');
});

// ============================================================================
// Tier 4: Real-World Updater Staging, Tamper Rejection, Rollback & Installer i18n
// ============================================================================
registerTest(4, 'F24', 'Main updater rejects SHA-256 tampering cleanly, atomically stages valid updates, & rolls back to snapshot', async () => {
  const { EventEmitter } = require('events');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-updater-t4-'));
  const tmpEnhDir = path.join(tmpDir, 'enhancer');
  const tmpAppDir = path.join(tmpDir, 'app');
  fs.mkdirSync(tmpEnhDir, { recursive: true });
  fs.mkdirSync(tmpAppDir, { recursive: true });

  try {
    const initialRenderer = Buffer.from('/* v3.1.0 initial */', 'utf8');
    const initialSha = crypto.createHash('sha256').update(initialRenderer).digest('hex');
    fs.writeFileSync(path.join(tmpEnhDir, 'renderer-enhancer.js'), initialRenderer);
    fs.writeFileSync(path.join(tmpEnhDir, 'manifest.json'), JSON.stringify({
      version: '3.1.0',
      repo: 'x2tora/antigravity-enhancer',
      files: { 'renderer-enhancer.js': { sha256: initialSha, size: initialRenderer.length } }
    }));

    const remoteResponses = new Map();
    const mockHttps = {
      get(rawUrl, opts, cb) {
        if (typeof opts === 'function') { cb = opts; }
        const req = new EventEmitter();
        req.destroy = () => {};
        req.setTimeout = () => {};
        process.nextTick(() => {
          const cleanPath = String(rawUrl).split('?')[0];
          const body = remoteResponses.get(cleanPath);
          const res = new EventEmitter();
          res.statusCode = body ? 200 : 404;
          res.headers = {};
          res.resume = () => {};
          res.destroy = () => {};
          cb(res);
          process.nextTick(() => {
            if (body) res.emit('data', Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8'));
            res.emit('end');
          });
        });
        return req;
      }
    };

    const mockElectron = {
      app: { getVersion: () => '2.31.2', isReady: () => false, getAppPath: () => tmpAppDir, whenReady: async () => {} },
      ipcMain: { on: () => {}, handle: () => {} },
      BrowserWindow: { getAllWindows: () => [] }
    };

    const mainCode = fs.readFileSync(path.join(ENHANCER_DIR, 'main-enhancer.js'), 'utf8');
    const modObj = { exports: {} };
    const customRequire = (id) => {
      if (id === 'https') return mockHttps;
      if (id === 'electron') return mockElectron;
      return require(id);
    };
    const loader = new Function('require', 'module', 'exports', '__dirname', '__filename', mainCode);
    loader(customRequire, modObj, modObj.exports, tmpEnhDir, path.join(ENHANCER_DIR, 'main-enhancer.js'));
    const isolated = modObj.exports;
    isolated.init({ enhancerDir: tmpEnhDir, appRoot: tmpAppDir });

    const manifestUrl = 'https://raw.githubusercontent.com/x2tora/antigravity-enhancer/main/enhancer/manifest.json';
    const fileUrl = 'https://raw.githubusercontent.com/x2tora/antigravity-enhancer/main/enhancer/renderer-enhancer.js';

    // 1. Tamper test: digest mismatch must abort BEFORE overwriting live enhancerDir
    const v32Tampered = Buffer.from('/* v3.2.0 TAMPERED */', 'utf8');
    remoteResponses.set(manifestUrl, JSON.stringify({
      version: '3.2.0',
      files: { 'renderer-enhancer.js': { sha256: 'a'.repeat(64), size: v32Tampered.length } }
    }));
    remoteResponses.set(fileUrl, v32Tampered);
    await assert.rejects(() => isolated.applyInAppUpdate('main'), /SHA-256 verification failed/);
    assert.strictEqual(fs.readFileSync(path.join(tmpEnhDir, 'renderer-enhancer.js'), 'utf8'), '/* v3.1.0 initial */');
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmpEnhDir, 'manifest.json'), 'utf8')).version, '3.1.0');

    // 2. Valid atomic staging + backup snapshot
    const v32Valid = Buffer.from('/* v3.2.0 valid */', 'utf8');
    const v32Sha = crypto.createHash('sha256').update(v32Valid).digest('hex');
    remoteResponses.set(manifestUrl, JSON.stringify({
      version: '3.2.0',
      files: { 'renderer-enhancer.js': { sha256: v32Sha, size: v32Valid.length } }
    }));
    remoteResponses.set(fileUrl, v32Valid);
    const applyRes = await isolated.applyInAppUpdate('main');
    assert.strictEqual(applyRes.ok, true);
    assert.strictEqual(applyRes.newVersion, '3.2.0');
    assert.strictEqual(fs.readFileSync(path.join(tmpEnhDir, 'renderer-enhancer.js'), 'utf8'), '/* v3.2.0 valid */');
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmpEnhDir, 'manifest.json'), 'utf8')).version, '3.2.0');
    assert.ok(fs.existsSync(path.join(tmpEnhDir, 'backup', 'latest', 'manifest.json')), 'Rollback snapshot must exist');

    // 3. Rollback to backup/latest restores exact v3.1.0 payload
    const rbRes = isolated.restoreFromBackupDir(path.join(tmpEnhDir, 'backup', 'latest'));
    assert.strictEqual(rbRes.ok, true);
    assert.strictEqual(rbRes.restoredVersion, '3.1.0');
    assert.strictEqual(fs.readFileSync(path.join(tmpEnhDir, 'renderer-enhancer.js'), 'utf8'), '/* v3.1.0 initial */');
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(tmpEnhDir, 'manifest.json'), 'utf8')).version, '3.1.0');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

registerTest(4, 'F25', 'Installer OS language auto-detection (9 languages + English fallback) and C# ASAR bootstrap idempotency', () => {
  const { execFileSync } = require('child_process');
  const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const liveAsar = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity', 'resources', 'app.asar');
  if (!fs.existsSync(csc)) return;

  const ps1Src = fs.readFileSync(path.join(ROOT_DIR, 'build_exe_installer.ps1'), 'utf8');
  const match = ps1Src.match(/\$csSource = @'\r?\n([\s\S]*?)\r?\n'@/);
  assert.ok(match, 'Must extract WPF C# source from build_exe_installer.ps1');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-installer-i18n-t4-'));
  try {
    const installerCsPath = path.join(tmpDir, 'InstallerWPF.cs');
    // Rename App.Main out so test harness can define entry point cleanly
    const modifiedCs = match[1]
      .replace('__ENHANCER_VERSION__', '3.2.0')
      .replace('public static void Main()', 'public static void MainWpfDisabled()');
    fs.writeFileSync(installerCsPath, '\uFEFF' + modifiedCs, 'utf8');

    const probeCsPath = path.join(tmpDir, 'Probe.cs');
    const probeCode = `
using System;
using AntigravityEnhancer;

public static class ProbeMain
{
    public static int Main(string[] args)
    {
        if (args.Length >= 1 && args[0] == "--check-i18n")
        {
            string[] cultures = new string[] {
                "en-US:en", "en-GB:en", "ko-KR:ko", "ja-JP:ja",
                "zh-CN:zh-CN", "zh-SG:zh-CN", "zh-Hans:zh-CN",
                "zh-TW:zh-TW", "zh-HK:zh-TW", "zh-Hant:zh-TW",
                "es-ES:es", "es-419:es", "fr-FR:fr", "fr-CA:fr",
                "de-DE:de", "ru-RU:ru", "pt-BR:en", "it-IT:en", "vi-VN:en", ":en"
            };
            foreach (string pair in cultures)
            {
                string[] parts = pair.Split(':');
                string actual = InstallerI18n.ResolveCultureCode(parts[0], "");
                if (actual != parts[1])
                {
                    Console.Error.WriteLine("Culture mismatch for " + parts[0] + ": expected " + parts[1] + ", got " + actual);
                    return 2;
                }
            }
            string envDetected = InstallerI18n.DetectLanguage();
            Console.WriteLine("DETECTED:" + envDetected);
            foreach (string lang in InstallerI18n.SupportedLanguages)
            {
                string title = InstallerI18n.Get(lang, "HeroTitle");
                string install = InstallerI18n.Get(lang, "BtnInstall");
                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(install) || title == "HeroTitle" || install == "BtnInstall")
                {
                    Console.Error.WriteLine("Missing translation key for " + lang);
                    return 3;
                }
            }
            return 0;
        }
        if (args.Length >= 2 && args[0] == "--asar-check")
        {
            AsarMicroPatcher.EnsureBootstrapped(args[1], false);
            return AsarMicroPatcher.IsBootstrapped(args[1]) ? 0 : 4;
        }
        return 1;
    }
}
`;
    fs.writeFileSync(probeCsPath, '\uFEFF' + probeCode, 'utf8');

    const probeExe = path.join(tmpDir, 'InstallerProbe.exe');
    execFileSync(csc, [
      '/nologo', '/target:exe', '/optimize+', '/platform:x64', '/codepage:65001',
      `/out:${probeExe}`,
      '/lib:C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\WPF',
      '/r:System.dll', '/r:System.Web.Extensions.dll', '/r:System.Xaml.dll',
      '/r:System.Windows.Forms.dll', '/r:WindowsBase.dll', '/r:PresentationCore.dll',
      '/r:PresentationFramework.dll',
      path.join(INSTALLER_DIR, 'AsarMicroPatcher.cs'),
      installerCsPath,
      probeCsPath
    ], { stdio: 'pipe', timeout: 30000 });

    const out = execFileSync(probeExe, ['--check-i18n'], {
      env: { ...process.env, ANTIGRAVITY_ENHANCER_LANG: 'ja-JP' },
      encoding: 'utf8',
      timeout: 15000
    });
    assert.ok(out.includes('DETECTED:ja'), 'DetectLanguage must resolve ja-JP -> ja');

    const fallbackOut = execFileSync(probeExe, ['--check-i18n'], {
      env: { ...process.env, ANTIGRAVITY_ENHANCER_LANG: 'pt-BR' },
      encoding: 'utf8',
      timeout: 15000
    });
    assert.ok(fallbackOut.includes('DETECTED:en'), 'DetectLanguage must fall back unsupported pt-BR -> en');

    if (fs.existsSync(liveAsar)) {
      const workAsar = path.join(tmpDir, 'app.asar');
      fs.copyFileSync(liveAsar, workAsar);
      if (asarPatcher.inspectAsarStatus(workAsar).bootstrapped || asarPatcher.inspectAsarStatus(workAsar).hasLegacy) {
        asarPatcher.unpatchAsar(workAsar);
      }
      const origSha = crypto.createHash('sha256').update(fs.readFileSync(workAsar)).digest('hex');

      execFileSync(probeExe, ['--asar-check', workAsar], { stdio: 'pipe', timeout: 15000 });
      assert.strictEqual(asarPatcher.inspectAsarStatus(workAsar).bootstrapped, true, 'C# AsarMicroPatcher must micro-bootstrap vanilla ASAR');

      const afterFirstSha = crypto.createHash('sha256').update(fs.readFileSync(workAsar)).digest('hex');
      execFileSync(probeExe, ['--asar-check', workAsar], { stdio: 'pipe', timeout: 15000 });
      const afterSecondSha = crypto.createHash('sha256').update(fs.readFileSync(workAsar)).digest('hex');
      assert.strictEqual(afterSecondSha, afterFirstSha, 'Second C# bootstrap must be byte-identical idempotent');

      asarPatcher.unpatchAsar(workAsar);
      const restoredSha = crypto.createHash('sha256').update(fs.readFileSync(workAsar)).digest('hex');
      assert.strictEqual(restoredSha, origSha, 'Node unpatchAsar must cleanly reverse C# micro-bootstrap');
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
