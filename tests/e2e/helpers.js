// tests/e2e/helpers.js
// Shared test harness, mock DOM environment, PowerShell AST parser, and validation utilities.

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

// Project Root Directory
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PRELOAD_PATH = path.join(ROOT_DIR, 'extracted_korean', 'dist', 'preload.js');
const MULTILANG_PATCH_DIR = path.join(ROOT_DIR, 'Antigravity_MultiLang_Patch');
const KOREAN_PATCH_DIR = path.join(ROOT_DIR, 'Antigravity_Korean_Patch');

// Authoritative ASCII Art Banner (5 lines)
const AUTHORITATIVE_ASCII_BANNER = [
  '   ___        __  _                    _ __      ',
  '  / _ | ___  / /_(_)__ ________ __  __(_) /___ __',
  ' / __ |/ _ \\/ __/ / _ `/ __/ _ `/ |/ / / __/ // /',
  '/_/ |_/_//_/\\__/_/\\_, /_/  \\_,_/|___/_/\\__/\\_, / ',
  '                 /___/                    /___/  '
];

/**
 * Lightweight in-memory DOM Node implementation
 */
class MockNode {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType; // 1 = ELEMENT_NODE, 3 = TEXT_NODE
    this.nodeName = nodeName;
    this.parentNode = null;
    this.parentElement = null;
    this.childNodes = [];
    this._originalText = undefined;
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    child.parentElement = this.nodeType === 1 ? this : null;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(newNode, refNode) {
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    const idx = this.childNodes.indexOf(refNode);
    if (idx === -1) {
      return this.appendChild(newNode);
    }
    newNode.parentNode = this;
    newNode.parentElement = this.nodeType === 1 ? this : null;
    this.childNodes.splice(idx, 0, newNode);
    return newNode;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
      child.parentElement = null;
      return child;
    }
    return null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  contains(other) {
    let cur = other;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
  }

  get textContent() {
    if (this.nodeType === 3) return this.nodeValue;
    return this.childNodes.map(c => c.textContent).join('');
  }

  set textContent(val) {
    this.childNodes = [];
    if (this.nodeType === 3) {
      this.nodeValue = String(val);
    } else {
      const textNode = new MockText(String(val));
      this.appendChild(textNode);
    }
  }
}

class MockText extends MockNode {
  constructor(text = '') {
    super(3, '#text');
    this.nodeValue = String(text);
  }
}

class MockClassList {
  constructor(element) {
    this._element = element;
    this._classes = new Set();
  }

  add(...names) {
    for (const name of names) {
      if (name) this._classes.add(name);
    }
    this._sync();
  }

  remove(...names) {
    for (const name of names) {
      this._classes.delete(name);
    }
    this._sync();
  }

  contains(name) {
    return this._classes.has(name);
  }

  toggle(name, force) {
    if (force === true) {
      this.add(name);
      return true;
    } else if (force === false) {
      this.remove(name);
      return false;
    }
    if (this.contains(name)) {
      this.remove(name);
      return false;
    } else {
      this.add(name);
      return true;
    }
  }

  _sync() {
    this._element.className = Array.from(this._classes).join(' ');
  }

  _fromClassName(str) {
    this._classes.clear();
    if (typeof str === 'string') {
      str.split(/\s+/).filter(Boolean).forEach(c => this._classes.add(c));
    }
  }
}

class MockElement extends MockNode {
  constructor(tagName) {
    super(1, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.attributes = new Map();
    this.style = {};
    this.classList = new MockClassList(this);
    this._listeners = new Map();
    this.onclick = null;
  }

  get className() {
    return this.getAttribute('class') || '';
  }

  set className(val) {
    this.setAttribute('class', val);
    this.classList._fromClassName(val);
  }

  get innerHTML() {
    return this.childNodes.map(c => {
      if (c.nodeType === 3) return c.nodeValue;
      return c.outerHTML;
    }).join('');
  }

  set innerHTML(htmlString) {
    this.childNodes = [];
    parseHtmlFragment(htmlString, this);
  }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const attrs = [];
    if (this.id) attrs.push(`id="${this.id}"`);
    const cls = this.className;
    if (cls) attrs.push(`class="${cls}"`);
    for (const [k, v] of this.attributes) {
      if (k !== 'id' && k !== 'class') attrs.push(`${k}="${v}"`);
    }
    const styleEntries = Object.entries(this.style);
    if (styleEntries.length > 0) {
      const styleStr = styleEntries.map(([k, v]) => `${k}: ${v}`).join('; ');
      attrs.push(`style="${styleStr}"`);
    }
    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
  }

  setAttribute(name, val) {
    const sVal = String(val);
    this.attributes.set(name, sVal);
    if (name === 'id') this.id = sVal;
    if (name === 'class') this.classList._fromClassName(sVal);
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    return this.attributes.get(name) || null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'id') this.id = '';
    if (name === 'class') this.classList._fromClassName('');
  }

  hasAttribute(name) {
    return this.attributes.has(name) || (name === 'id' && !!this.id);
  }

  get children() {
    return this.childNodes.filter(n => n.nodeType === 1);
  }

  get firstElementChild() {
    return this.childNodes.find(n => n.nodeType === 1) || null;
  }

  addEventListener(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(handler);
  }

  removeEventListener(event, handler) {
    if (this._listeners.has(event)) {
      const arr = this._listeners.get(event);
      const idx = arr.indexOf(handler);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }

  dispatchEvent(evt) {
    evt.target = this;
    evt.currentTarget = this;
    if (this.nodeType === 1 && typeof this[`on${evt.type}`] === 'function') {
      this[`on${evt.type}`](evt);
    }
    const handlers = this._listeners.get(evt.type) || [];
    for (const h of handlers) {
      h.call(this, evt);
    }
    // Bubble up if needed
    if (evt.bubbles && this.parentNode && typeof this.parentNode.dispatchEvent === 'function') {
      this.parentNode.dispatchEvent(evt);
    }
    return !evt.defaultPrevented;
  }

  click() {
    const evt = {
      type: 'click',
      target: this,
      currentTarget: this,
      bubbles: true,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.bubbles = false; }
    };
    return this.dispatchEvent(evt);
  }

  querySelector(selector) {
    return querySelectorInternal(this, selector);
  }

  querySelectorAll(selector) {
    const results = [];
    querySelectorAllInternal(this, selector, results);
    return results;
  }

  closest(selector) {
    let cur = this;
    while (cur) {
      if (cur.nodeType === 1 && matchesSelector(cur, selector)) {
        return cur;
      }
      cur = cur.parentNode;
    }
    return null;
  }
}

/**
 * Basic HTML Fragment Parser for Mock DOM
 */
function parseHtmlFragment(html, parentElement) {
  if (!html || typeof html !== 'string') return;
  // Simple regex tag tokenizer
  const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9\-]+)([^>]*)\/>|([^<]+)/g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    if (match[6]) {
      // Text node
      parentElement.appendChild(new MockText(match[6]));
    } else if (match[1]) {
      // Paired tag
      const tagName = match[1];
      const attrStr = match[2];
      const inner = match[3];
      const el = new MockElement(tagName);
      parseAttributes(attrStr, el);
      if (inner) parseHtmlFragment(inner, el);
      parentElement.appendChild(el);
    } else if (match[4]) {
      // Self-closing tag
      const tagName = match[4];
      const attrStr = match[5];
      const el = new MockElement(tagName);
      parseAttributes(attrStr, el);
      parentElement.appendChild(el);
    }
  }
}

function parseAttributes(attrStr, element) {
  if (!attrStr) return;
  const attrRegex = /([a-zA-Z0-9\-_:]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = attrRegex.exec(attrStr)) !== null) {
    const key = match[1];
    const val = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : ''));
    if (key === 'id') {
      element.id = val;
    } else if (key === 'class') {
      element.className = val;
    } else if (key === 'style') {
      val.split(';').forEach(pair => {
        const [k, v] = pair.split(':').map(s => s && s.trim());
        if (k && v) element.style[k] = v;
      });
    } else {
      element.setAttribute(key, val);
    }
  }
}

function matchesSingleAttribute(element, attrName, op, val) {
  if (!element.hasAttribute(attrName)) return false;
  if (!op) return true;
  const actual = element.getAttribute(attrName);
  if (op === '=') return actual === val;
  if (op === '*=') return actual && actual.includes(val);
  if (op === '^=') return actual && actual.startsWith(val);
  if (op === '$=') return actual && actual.endsWith(val);
  return false;
}

function matchesSelector(element, selector) {
  if (!selector || !element || element.nodeType !== 1) return false;
  const sel = selector.trim();
  if (!sel) return false;
  if (sel.includes(',')) {
    const parts = [];
    let cur = '', depth = 0, quote = '';
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (quote) {
        if (ch === quote) quote = '';
        cur += ch;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        cur += ch;
      } else if (ch === '[') {
        depth++;
        cur += ch;
      } else if (ch === ']') {
        if (depth > 0) depth--;
        cur += ch;
      } else if (ch === ',' && depth === 0) {
        if (cur.trim()) parts.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    if (parts.length > 1) {
      return parts.some(p => matchesSelector(element, p));
    }
  }
  // ID selector
  if (sel.startsWith('#') && !sel.includes('[')) {
    return element.id === sel.slice(1);
  }
  // Class selector
  if (sel.startsWith('.') && !sel.includes('[')) {
    return element.classList.contains(sel.slice(1));
  }
  // Extract all [attr...] conditions (supports single & multi-attribute selectors safely)
  if (sel.includes('[')) {
    const attrRe = /\[([a-zA-Z0-9\-_:]+)(?:([*^$]?=)(?:"([^"]*)"|'([^']*)'))?\]/g;
    let match;
    let consumed = '';
    const checks = [];
    let lastIndex = 0;
    while ((match = attrRe.exec(sel)) !== null) {
      consumed += sel.slice(lastIndex, match.index);
      lastIndex = attrRe.lastIndex;
      checks.push([match[1], match[2], match[3] !== undefined ? match[3] : match[4]]);
    }
    const base = (consumed + sel.slice(lastIndex)).trim();
    if (checks.length === 0 || base.includes('[')) return false;
    for (const [attrName, op, val] of checks) {
      if (!matchesSingleAttribute(element, attrName, op, val)) return false;
    }
    if (!base) return true;
    return matchesSelector(element, base);
  }
  // Tag selector
  if (element.tagName && element.tagName.toLowerCase() === sel.toLowerCase()) {
    return true;
  }
  return false;
}

function querySelectorInternal(root, selector) {
  for (const child of root.childNodes) {
    if (child.nodeType === 1) {
      if (matchesSelector(child, selector)) return child;
      const found = querySelectorInternal(child, selector);
      if (found) return found;
    }
  }
  return null;
}

function querySelectorAllInternal(root, selector, acc) {
  for (const child of root.childNodes) {
    if (child.nodeType === 1) {
      if (matchesSelector(child, selector)) acc.push(child);
      querySelectorAllInternal(child, selector, acc);
    }
  }
}

/**
 * Mock LocalStorage Implementation
 */
class MockLocalStorage {
  constructor() {
    this._store = new Map();
  }
  getItem(key) {
    return this._store.has(String(key)) ? this._store.get(String(key)) : null;
  }
  setItem(key, val) {
    this._store.set(String(key), String(val));
  }
  removeItem(key) {
    this._store.delete(String(key));
  }
  clear() {
    this._store.clear();
  }
  get length() {
    return this._store.size;
  }
  key(index) {
    return Array.from(this._store.keys())[index] || null;
  }
}

/**
 * Mock Window & Document Sandbox
 */
function createMockEnvironment() {
  const document = new MockElement('document');
  document.head = new MockElement('head');
  document.body = new MockElement('body');
  document.documentElement = new MockElement('html');
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);
  document.appendChild(document.documentElement);

  document.createElement = (tag) => new MockElement(tag);
  document.createTextNode = (txt) => new MockText(txt);
  document.getElementById = (id) => document.querySelector(`#${id}`);

  const localStorage = new MockLocalStorage();
  const windowListeners = new Map();

  const window = {
    document,
    localStorage,
    __APP_CONFIG__: { csrfToken: 'mock-csrf-token-12345' },
    __TSR_ROUTER__: { navigate: () => {} },
    addEventListener(event, handler) {
      if (!windowListeners.has(event)) windowListeners.set(event, []);
      windowListeners.get(event).push(handler);
    },
    removeEventListener(event, handler) {
      if (windowListeners.has(event)) {
        const arr = windowListeners.get(event);
        const idx = arr.indexOf(handler);
        if (idx !== -1) arr.splice(idx, 1);
      }
    },
    dispatchEvent(evt) {
      const handlers = windowListeners.get(evt.type) || [];
      for (const h of handlers) h(evt);
      return !evt.defaultPrevented;
    },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    fetch: async () => ({
      ok: true,
      json: async () => ({})
    })
  };

  return { window, document, localStorage };
}

/**
 * File Readers
 */
function getPreloadSource() {
  if (fs.existsSync(PRELOAD_PATH)) {
    return fs.readFileSync(PRELOAD_PATH, 'utf-8');
  }
  return '';
}

function getMultiLangScript(scriptName) {
  const p = path.join(MULTILANG_PATCH_DIR, scriptName);
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, 'utf-8');
  }
  return null;
}

function getKoreanScript(scriptName) {
  const p = path.join(KOREAN_PATCH_DIR, scriptName);
  if (fs.existsSync(p)) {
    return fs.readFileSync(p, 'utf-8');
  }
  return null;
}

/**
 * PowerShell AST & Static Validation (SAFE: NO EXECUTION)
 */
function parsePowerShellAst(filePath) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }
  try {
    const escapedPath = filePath.replace(/'/g, "''");
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& { $errs = $null; $toks = $null; $ast = [System.Management.Automation.Language.Parser]::ParseFile('${escapedPath}', [ref]$toks, [ref]$errs); if ($errs.Count -eq 0) { Write-Output 'PARSER_OK' } else { foreach ($e in $errs) { Write-Output ('SYNTAX_ERROR: ' + $e.Message) } } }"`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 8000 }).trim();
    if (output.includes('PARSER_OK')) {
      return { ok: true, errors: [] };
    }
    return { ok: false, errors: output.split('\n') };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Verify Process Safety: checks that no un-guarded Stop-Process occurs
 */
function verifyProcessSafetyInScript(content) {
  const lines = content.split('\n');
  const violations = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('::') || trimmed.startsWith('rem')) return;
    if (/Stop-Process/i.test(trimmed) || /taskkill/i.test(trimmed)) {
      // Must be gated by -not $NoKill or if (-not $NoKill) or parameter switch
      violations.push({ line: idx + 1, code: trimmed });
    }
  });
  return violations;
}

module.exports = {
  ROOT_DIR,
  PRELOAD_PATH,
  MULTILANG_PATCH_DIR,
  KOREAN_PATCH_DIR,
  AUTHORITATIVE_ASCII_BANNER,
  MockNode,
  MockText,
  MockElement,
  MockLocalStorage,
  createMockEnvironment,
  getPreloadSource,
  getMultiLangScript,
  getKoreanScript,
  parsePowerShellAst,
  verifyProcessSafetyInScript,
  matchesSelector,
  parseHtmlFragment
};
