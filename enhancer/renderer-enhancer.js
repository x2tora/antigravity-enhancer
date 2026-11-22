/**
 * Antigravity Enhancer v4.0.4 - Modular Renderer Enhancer Engine
 * Features: 9-Language Zero-Restart i18n, Translation Engine 2.0 (Slice + Glossary),
 *           Quota Intelligence (Sparklines, Burn-Rate ETA & Alerts),
 *           Enhancer Control Center & Custom Shortcuts (x2tora/antigravity-enhancer)
 */
(function () {
  'use strict';

  const electron_1 = (typeof require === 'function') ? require('electron') : null;
  const ipc = electron_1 ? electron_1.ipcRenderer : null;
  const payload = (typeof __ENHANCER_PAYLOAD__ !== 'undefined' && __ENHANCER_PAYLOAD__) ? __ENHANCER_PAYLOAD__ : {};
  const ENHANCER_REPO = payload.repo || 'x2tora/antigravity-enhancer';
  const ENHANCER_CURRENT_VERSION = payload.version || '4.0.4';

  const DEFAULT_PREFS = {
    shortcutCycleLang: 'Alt+Shift+L',
    shortcutOpenCenter: 'Alt+Shift+E',
    quotaAlertsEnabled: false,
    quotaLowThreshold: 20,
    quotaResetAlertsEnabled: false,
    collectUntranslated: false,
    showSparklines: true,
    compactQuotaCard: false
  };
  let userPreferences = { ...DEFAULT_PREFS, ...(payload.preferences && typeof payload.preferences === 'object' ? payload.preferences : {}) };
  let userGlossary = (payload.userGlossary && typeof payload.userGlossary === 'object') ? payload.userGlossary : {};
  let quotaHistoryState = (payload.quotaHistory && typeof payload.quotaHistory === 'object') ? payload.quotaHistory : {};
  const untranslatedBuffer = [];
  const untranslatedSeen = new Set();
  const loadedLanguages = new Set(['en']);

  // ---------------------------------------------------------------------------
  // 1. Install GSAP Core into Preload World
  // ---------------------------------------------------------------------------
  try {
    if (typeof window !== 'undefined' && !window.gsap && payload.gsapCode) {
      (new Function('window', payload.gsapCode))(window);
    }
  } catch (_) {}

  // ---------------------------------------------------------------------------
  // 2. Dictionaries & Translation Engine
  // ---------------------------------------------------------------------------
  const dicts = payload.dictionaries || {};
  const SUPPORTED_LANGUAGES = dicts.SUPPORTED_LANGUAGES || [
    { id: 'en', native: 'English', enName: 'English' },
    { id: 'ko', native: '한국어', enName: 'Korean' },
    { id: 'ja', native: '日本語', enName: 'Japanese' },
    { id: 'zh-CN', native: '简体中文', enName: 'Simplified Chinese' },
    { id: 'zh-TW', native: '繁體中文', enName: 'Traditional Chinese' },
    { id: 'es', native: 'Español', enName: 'Spanish' },
    { id: 'fr', native: 'Français', enName: 'French' },
    { id: 'de', native: 'Deutsch', enName: 'German' },
    { id: 'ru', native: 'Русский', enName: 'Russian' }
  ];
  const LANG_ORDER = dicts.LANG_ORDER || SUPPORTED_LANGUAGES.map(l => l.id);
  const exactDict = dicts.exactDict || {};
  const translations = dicts.translations || {};
  const fragmentRules = dicts.fragmentRules || [];
  const placeholders = dicts.placeholders || {};
  const multiLangFragments = dicts.multiLangFragments || {};

  function compileDynamicRules(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const item of list) {
      try {
        if (item instanceof RegExp) {
          out.push(item);
        } else if (item && item.reg instanceof RegExp) {
          out.push(item);
        } else if (item && typeof item.source === 'string') {
          out.push({ reg: new RegExp(item.source, item.flags || 'i'), rep: item.rep || '' });
        }
      } catch (_) {}
    }
    return out;
  }

  const dynamicRules = compileDynamicRules(dicts.dynamicRules);
  const multiLangDynamicRules = {};
  if (dicts.multiLangDynamicRules) {
    for (const [lang, arr] of Object.entries(dicts.multiLangDynamicRules)) {
      multiLangDynamicRules[lang] = compileDynamicRules(arr);
    }
  }

  const hasOwn = Object.prototype.hasOwnProperty;
  function safeDictGet(obj, key) {
    if (!obj || typeof key !== 'string') return undefined;
    return hasOwn.call(obj, key) ? obj[key] : undefined;
  }

  // IME / Input & Protected Widget Guards
  let isImeComposing = false;
  if (typeof window !== 'undefined') {
    window.addEventListener('compositionstart', () => { isImeComposing = true; }, true);
    window.addEventListener('compositionend', () => { isImeComposing = false; }, true);
  }

  function isInputOrEditable(node) {
    if (!node) return false;
    const el = (node.nodeType === 1) ? node : node.parentElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.closest && el.closest('[contenteditable="true"], [data-lexical-editor], .lexical-editor, input, textarea, select, .monaco-editor, .notranslate, [translate="no"]')) {
      return true;
    }
    return false;
  }

  const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'PRE', 'CODE', 'NOSCRIPT', 'SVG']);

  function shouldIgnore(el) {
    if (!el || el.nodeType !== 1) return false;
    if (isInputOrEditable(el)) return true;
    if (IGNORE_TAGS.has(el.tagName)) return true;
    if (el.classList && (el.classList.contains('monaco-editor') || el.classList.contains('notranslate') || el.classList.contains('lexical-editor'))) {
      return true;
    }
    if (el.closest && (
      el.closest('[data-testid*="model-selector"]') ||
      el.closest('.model-selector-trigger') ||
      el.closest('#antigravity-quota-widget') ||
      el.closest('#antigravity-quota-popover') ||
      el.closest('#antigravity-lang-quick-switch') ||
      el.closest('#antigravity-quick-lang-menu') ||
      el.closest('#antigravity-lang-dropdown-menu') ||
      el.closest('#antigravity-enhanced-tag') ||
      el.closest('#antigravity-enhancer-menu-section') ||
      el.closest('#antigravity-composer-quota-hovercard') ||
      el.closest('#antigravity-enhancer-modal-backdrop')
    )) {
      return true;
    }
    return false;
  }

  // Fast Prefix & Lowercase Indexes
  const prefixDict40ByLang = { ko: new Map() };
  const prefixDict30ByLang = { ko: new Map() };
  const lowercaseDictByLang = { ko: new Map() };

  function buildLangIndices(langCode, dictObj) {
    const p40 = new Map();
    const p30 = new Map();
    const lc = new Map();
    if (!dictObj) return;
    for (const [key, val] of Object.entries(dictObj)) {
      if (typeof key === 'string' && typeof val === 'string') {
        const lowKey = key.toLowerCase();
        if (!lc.has(lowKey)) lc.set(lowKey, val);
        if (key.length >= 30) {
          const norm = key.replace(/\s+/g, ' ').trim().toLowerCase();
          if (norm.length >= 40) {
            const pfx40 = norm.slice(0, 40);
            if (!p40.has(pfx40)) p40.set(pfx40, val);
          }
          if (norm.length >= 30) {
            const pfx30 = norm.slice(0, 30);
            if (!p30.has(pfx30)) p30.set(pfx30, val);
          }
        }
      }
    }
    prefixDict40ByLang[langCode] = p40;
    prefixDict30ByLang[langCode] = p30;
    lowercaseDictByLang[langCode] = lc;
  }

  buildLangIndices('ko', exactDict);
  if (Object.keys(exactDict).length > 0) loadedLanguages.add('ko');
  for (const l of ['ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru']) {
    buildLangIndices(l, translations[l]);
    if (translations[l] && Object.keys(translations[l]).length > 0) loadedLanguages.add(l);
  }

  async function ensureLanguageLoaded(lang) {
    if (!lang || lang === 'en' || loadedLanguages.has(lang)) return true;
    if (!ipc || !ipc.invoke) return false;
    try {
      const res = await ipc.invoke('enhancer:get-language-dict', lang);
      if (res && res.ok && res.slice) {
        const s = res.slice;
        if (lang === 'ko') {
          if (s.exactDict) Object.assign(exactDict, s.exactDict);
          if (s.placeholders) Object.assign(placeholders, s.placeholders);
          if (Array.isArray(s.fragmentRules) && fragmentRules.length === 0) fragmentRules.push(...s.fragmentRules);
          if (Array.isArray(s.dynamicRules) && dynamicRules.length === 0) dynamicRules.push(...compileDynamicRules(s.dynamicRules));
          buildLangIndices('ko', exactDict);
        } else {
          if (s.translations && s.translations[lang]) {
            translations[lang] = s.translations[lang];
            buildLangIndices(lang, translations[lang]);
          }
          if (s.multiLangFragments && s.multiLangFragments[lang]) {
            multiLangFragments[lang] = s.multiLangFragments[lang];
          }
          if (s.multiLangDynamicRules && s.multiLangDynamicRules[lang]) {
            multiLangDynamicRules[lang] = compileDynamicRules(s.multiLangDynamicRules[lang]);
          }
        }
        loadedLanguages.add(lang);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function isUserContentElement(el) {
    if (!el || typeof el.closest !== 'function') return false;
    try {
      if (el.closest('[role="menu"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], .agy-overlay')) return false;
      return Boolean(el.closest(
        '.prose, .markdown, .monaco-editor, [class*="markdown"], [class*="prose"], [class*="thinking"], [class*="thought"], [class*="message"], [class*="chat"], [class*="artifact"], [class*="explorer"], [data-message-id], [data-testid*="message"], [data-testid*="conversation"], [data-testid*="thread"], [data-testid*="history"], [data-testid*="session"], [data-testid*="workspace"], [data-testid*="project"], [data-testid*="branch"], [data-testid*="file"], [data-testid*="tree"], [data-testid*="agent"], [data-testid*="step"], [data-testid*="tool"], [data-testid*="artifact"], [data-testid*="thought"], [data-testid*="viewer"], [role="log"], [role="tree"], [role="treeitem"]'
      ));
    } catch (_) {
      return false;
    }
  }

  function isUntranslatableNoise(trimmed) {
    if (!trimmed || trimmed.length < 3 || trimmed.length > 120) return true;
    if (!/[A-Za-z]/.test(trimmed)) return true;
    // Skip already-localized or non-English scripts (Hangul, Kana, CJK, Cyrillic)
    if (/[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\u3040-\u30FF\u4E00-\u9FFF\u0400-\u04FF]/.test(trimmed)) return true;
    if (/^[\d\s.,:%+\-*/()[\]{}]+$/.test(trimmed)) return true;
    if (/^[A-Z]{2,3}$/.test(trimmed)) return true;
    // Single lowercase word (prose splits, folder names like assets/docs/main/now)
    if (/^[a-z]{2,}$/.test(trimmed)) return true;
    // Keyboard shortcuts & trailing shortcut hints (e.g., Ctrl+/, project_5 (Ctrl+.))
    if (/^(?:(?:Ctrl|Alt|Shift|Meta|Cmd|Opt)\+)+[^\s]+$/i.test(trimmed)) return true;
    if (/\((?:Ctrl|Alt|Shift|Meta|Cmd)\+[^)]+\)$/i.test(trimmed)) return true;
    // Timers / streaming durations / turn counters
    if (/^\d+\s*[smhd](?:\s+\d+\s*[smhd])*$/i.test(trimmed)) return true;
    if (/^(?:Thinking for \d+|Still thinking,\s*\d+\s*seconds?|Turn \d+ of \d+|Load older messages)/i.test(trimmed)) return true;
    // Brand / model / codename standalone labels & dynamic multi-word Close <Title>
    if (/(.)\1{5,}/.test(trimmed)) return true;
    if (/^(?:Antigravity|Antigravity Enhancer|Argon|Gemini|Migratify|Gero|Supabase|Gmail|Inter|Google Sans|Object|Users|Desktop|e2e|_ns)$/i.test(trimmed)) return true;
    if (/^(?:Notion|Context7|Linear|Dynatrace|Stripe|Canva|Figma|Mobbin|Dropbox|Granola|Cloudflare|Netlify|Railway|Spacefast|Wix|Arize AX|Auth0|Base44|Better Stack|Browserbase|Clerk|Bigin|Intercom|Levels\.fyi|Semrush|Looker|n8n|Google Workspace|Google Docs|Google Sheets|Google Slides|Google Calendar|Data Agent Kit|Robotics|Genomics|Chemistry|Descrybe Legal Engine|Midpage Legal Research|Science Overview|Structural Biology|Scientific Literature)$/i.test(trimmed)) return true;
    if (/^(?:Gemini\s+\d+|Google AI\b|Gemini API$|Claude\s+(?:Opus|Sonnet|Haiku)\s+[\d.]+$|(?:PowerShell|Node\.js|Python|Electron|Chrome)\s+[\d.]+$)/i.test(trimmed)) return true;
    if (/^(?:Ctrl|Alt|Shift|Meta|Cmd|Opt|Enter|Esc|Tab|Space|Backspace|Delete)$/i.test(trimmed)) return true;
    if (/^\d+(?:\.\d+)?(?:px|rem|em|pt|%|ms|s)$/i.test(trimmed)) return true;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || /^[a-z0-9_.-]+@[a-z0-9_.-]+(?::[a-z0-9]+)?$/i.test(trimmed)) return true;
    if (/^[A-Za-z0-9_.\-]+\/$/.test(trimmed) || /\b\d{6,}\b/.test(trimmed)) return true;
    if (/^['"][^'"]+['"]$/.test(trimmed) || /^mcp:[a-z0-9_:-]+$/i.test(trimmed) || /^…/.test(trimmed) || /^\/\//.test(trimmed)) return true;
    if (/^(?:Close\s+\S+\s+\S+|Side Question:\s+|Delete side question:\s+)/i.test(trimmed)) return true;
    if (/^(?:Shortcut\s+.+\s+for\s+|Remove shortcut\s+.+\s+for\s+|Add shortcut for\s+|Send feedback as\s+)/i.test(trimmed)) return true;
    if (/^(?:Install|Details for|More actions for|Plugins in|See more in)\s+.+$/i.test(trimmed) || /^Add\s+(?:Firebase|Notion|Context7|Linear|Dynatrace|Stripe)$/i.test(trimmed)) return true;
    if (/^(?:See\s+\d+\s+more(?:\s+(?:plugins|skills and rules))?|\d+\s+tools?\s+disabled|Filter skills and rules:\s*.+|Next run today around\s+.+|Today\s+\d{1,2}:\d{2}\s*(?:AM|PM)|Daily at\s+.+)$/i.test(trimmed)) return true;
    if (/^(?:\d+\s+active conversations?(?:\s+and\s+\d+\s+archived conversations?)?|(?:Rules|Skills|Subagents|Mcp Tools):\s*[\d,]+\s*tokens|\d+\s+lines?\s+added,\s+\d+\s+lines?\s+removed|\d+\s+excluded)$/i.test(trimmed)) return true;
    // Agent tool/step summaries & comma-separated action logs
    if (/^(?:Ran commands|Killing subagent|Model Selector & Theme UI Engineer|Check current git status and diff summary|Run full E2E.*|Run v3 architecture.*|Check CSP headers.*|Check installed Antigravity.*|Pack asar.*|Test bidirectional.*|Execute mock test.*|Check app\.asar\.original|Find large files.*)$/i.test(trimmed)) return true;
    if (/^(?:Explored|Searched|Read|Edited|Wrote|Ran|Checked|Listed|Commit)\b.*,\s*(?:ran|edited|read|wrote|explored|searched|checked|listed|tag|and push)\b/i.test(trimmed)) return true;
    // Paths, dotfiles, ALL-CAPS files, URLs, markdown links, CLI flags, mentions, slash commands
    if (/^(?:@|#|\/|--?)[A-Za-z0-9_.\-]+/.test(trimmed) || /(?:https?|file):\/\//i.test(trimmed)) return true;
    if (/^\.[A-Za-z0-9_.-]+$/.test(trimmed) || /^(?:LICENSE|README|CHANGELOG|MAKEFILE|DOCKERFILE)$/i.test(trimmed)) return true;
    if (/^(?:[A-Za-z]:[\\/]|~[\\/]|\.{1,2}[\\/])/.test(trimmed) || trimmed.includes('\\')) return true;
    if (/^[^\s]*[\\/][^\s]+\.[A-Za-z0-9]{1,8}$/.test(trimmed)) return true;
    if (/^[A-Za-z0-9_.\-]+\.(?:js|ts|tsx|jsx|mjs|cjs|json|md|ps1|vbs|exe|zip|txt|css|scss|html|yml|yaml|asar|png|jpg|jpeg|svg|ico|log|lock|py|go|rs|java|cpp|c|h|sh|bat|cmd)$/i.test(trimmed)) return true;
    if (trimmed.includes('](') || /^(?:Project:|Close\s+\S+\.\w+$)/i.test(trimmed)) return true;
    // Project/branch/code identifiers (snake_case, kebab-case, camelCase, PascalCase, semver, git sha)
    if (/^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)+$/.test(trimmed)) return true;
    if (/^(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z]+[A-Z][A-Za-z0-9]*)$/.test(trimmed)) return true;
    if (/^v?\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?$/i.test(trimmed) || /^[0-9a-f]{7,40}$/i.test(trimmed)) return true;
    // Sentences/phrases containing filenames, code identifiers, test IDs (F24), or kebab/snake tokens
    const tokens = trimmed.split(/\s+/);
    if (tokens.length > 7) return true;
    for (const rawTok of tokens) {
      const tok = rawTok.replace(/^['"`(\[]+|[.,:;!?'"`)\]]+$/g, '');
      if (!tok) continue;
      if (/\.(?:js|ts|tsx|jsx|mjs|cjs|json|md|ps1|vbs|exe|zip|txt|css|scss|html|yml|yaml|asar|py|go|rs)$/i.test(tok)) return true;
      if (/^F\d{1,3}(?:-F?\d{1,3})?$/.test(tok)) return true;
      if (/^v\d+\.\d+(?:\.\d+)*$/i.test(tok) && tokens.length > 2) return true;
      if (/^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)+$/.test(tok) && !/^(?:in-memory|in-app|e2e|top-bar|auto-detect|auto-repatch|real-time|one-click|non-empty|built-in|up-to-date)$/i.test(tok)) return true;
      if (/^(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z]+[A-Z][A-Za-z0-9]*)$/.test(tok) && !/^(?:GitHub|JavaScript|TypeScript|PowerShell|DevTools|YouTube|OpenAI|ChatGPT|OneDrive|macOS|iOS)$/i.test(tok)) return true;
    }
    // Code snippets / split prose or markdown fragments
    if (/[`{};=<>]/.test(trimmed) || /^[:),.;\]]|[,:(\[]$/.test(trimmed) || /^[a-z].*\.$/.test(trimmed)) return true;
    if (/^[a-z]+(?:\s+[a-z0-9,().\-/]+)+$/.test(trimmed) || (/^[^()]*\)/.test(trimmed) && !trimmed.includes('('))) return true;
    return false;
  }

  function queueUntranslated(trimmed) {
    if (!userPreferences.collectUntranslated || !trimmed) return;
    if (isUntranslatableNoise(trimmed)) return;
    if (untranslatedSeen.has(trimmed)) return;
    untranslatedSeen.add(trimmed);
    untranslatedBuffer.push(trimmed);
  }

  if (typeof setInterval === 'function') {
    const _utTimer = setInterval(() => {
      if (untranslatedBuffer.length > 0 && ipc && ipc.invoke) {
        const batch = untranslatedBuffer.splice(0, 50);
        ipc.invoke('enhancer:record-untranslated', batch).catch(() => {});
      }
    }, 3000);
    if (_utTimer && _utTimer.unref) _utTimer.unref();
  }

  const LANG_STORAGE_KEY = 'antigravity_ui_language';
  const LANG_DISPLAY_NAMES = {
    en: { native: 'English', en: 'English' },
    ko: { native: '한국어', en: 'Korean' },
    ja: { native: '日本語', en: 'Japanese' },
    'zh-CN': { native: '简体中文', en: 'Simplified Chinese' },
    'zh-TW': { native: '繁體中文', en: 'Traditional Chinese' },
    es: { native: 'Español', en: 'Spanish' },
    fr: { native: 'Français', en: 'French' },
    de: { native: 'Deutsch', en: 'German' },
    ru: { native: 'Русский', en: 'Russian' }
  };

  function detectOsLanguage() {
    try {
      const candidates = [];
      if (typeof navigator !== 'undefined') {
        if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
        if (navigator.language) candidates.push(navigator.language);
        if (navigator.userLanguage) candidates.push(navigator.userLanguage);
      }
      for (const raw of candidates) {
        if (!raw || typeof raw !== 'string') continue;
        const norm = raw.trim().toLowerCase().replace('_', '-');
        if (!norm) continue;
        if (norm.startsWith('ko')) return 'ko';
        if (norm.startsWith('ja')) return 'ja';
        if (norm.startsWith('zh')) {
          return (norm.includes('tw') || norm.includes('hk') || norm.includes('mo') || norm.includes('hant'))
            ? 'zh-TW'
            : 'zh-CN';
        }
        if (norm.startsWith('es')) return 'es';
        if (norm.startsWith('fr')) return 'fr';
        if (norm.startsWith('de')) return 'de';
        if (norm.startsWith('ru')) return 'ru';
        if (norm.startsWith('en')) return 'en';
      }
    } catch (_) {}
    return 'en';
  }

  let activeLanguage = (function () {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored && LANG_ORDER.includes(stored)) return stored;
    } catch (_) {}
    return detectOsLanguage();
  })();

  function getCurrentLanguage() { return activeLanguage; }

  function translateText(raw, targetLang, allowCollect = true) {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return raw;
    const lang = targetLang || activeLanguage || 'ko';
    if (lang === 'en') return raw;

    const trimmed = raw.trim();
    const glossaryMap = (userGlossary && userGlossary[lang] && typeof userGlossary[lang] === 'object') ? userGlossary[lang] : null;
    if (glossaryMap) {
      const gExact = safeDictGet(glossaryMap, trimmed);
      if (typeof gExact === 'string') return raw.replace(trimmed, () => gExact);
      const gLower = safeDictGet(glossaryMap, trimmed.toLowerCase());
      if (typeof gLower === 'string') return raw.replace(trimmed, () => gLower);
    }

    const activeDict = (lang === 'ko')
      ? exactDict
      : (hasOwn.call(translations, lang) ? translations[lang] : null);
    if (!activeDict) return raw;

    const vExact = safeDictGet(activeDict, trimmed);
    if (typeof vExact === 'string') return raw.replace(trimmed, () => vExact);

    const lower = trimmed.toLowerCase();
    const vLower = safeDictGet(activeDict, lower) || (lowercaseDictByLang[lang] ? lowercaseDictByLang[lang].get(lower) : undefined);
    if (typeof vLower === 'string') return raw.replace(trimmed, () => vLower);

    const upper = trimmed.toUpperCase();
    const vUpper = safeDictGet(activeDict, upper);
    if (typeof vUpper === 'string') return raw.replace(trimmed, () => vUpper);

    const dynRules = (lang === 'ko') ? dynamicRules : (multiLangDynamicRules[lang] || []);
    for (const rule of dynRules) {
      if (rule.reg.test(trimmed)) {
        return raw.replace(trimmed, trimmed.replace(rule.reg, rule.rep));
      }
    }

    const p40Map = prefixDict40ByLang[lang];
    const p30Map = prefixDict30ByLang[lang];
    if (trimmed.length >= 28 && p40Map && p30Map) {
      const clean = trimmed.replace(/\.{2,}$/, '').replace(/…$/, '').trim();
      const normTrimmed = clean.replace(/\s+/g, ' ').toLowerCase();
      if (normTrimmed.length >= 40) {
        const m40 = p40Map.get(normTrimmed.slice(0, 40));
        if (typeof m40 === 'string') return raw.replace(trimmed, () => m40);
      }
      if (normTrimmed.length >= 30) {
        const m30 = p30Map.get(normTrimmed.slice(0, 30));
        if (typeof m30 === 'string') return raw.replace(trimmed, () => m30);
      }
    }

    const isTruncated = trimmed.endsWith('...') || trimmed.endsWith('…');
    const clean = trimmed.replace(/^[-*•\s"']+/, '').replace(/["']+$/, '').replace(/\.{2,}$/, '').replace(/…$/, '').trim();
    if (clean.length > 25) {
      for (const [k, v] of Object.entries(activeDict)) {
        if (k.length > 25 && typeof v === 'string') {
          if (isTruncated && k.startsWith(clean)) return raw.replace(trimmed, () => v);
          if (clean.startsWith(k.substring(0, 50)) && k.length > 50) return raw.replace(trimmed, () => v);
        }
      }
    }

    const frags = (lang === 'ko') ? fragmentRules : (multiLangFragments[lang] || []);
    let result = raw;
    let matched = false;
    for (const frag of frags) {
      if (result.includes(frag.target)) {
        result = result.replace(frag.target, frag.replace);
        matched = true;
      }
    }
    if (matched) return result;

    if (allowCollect) queueUntranslated(trimmed);
    return raw;
  }

  const TRANSLATE_ATTRS = ['placeholder', 'data-placeholder', 'aria-placeholder', 'title', 'aria-label', 'data-tooltip', 'data-tip'];
  const originalTextMap = new WeakMap();

  function translateElementAttrs(el) {
    const allowCollect = !isUserContentElement(el);
    for (const attr of TRANSLATE_ATTRS) {
      const val = el.getAttribute ? el.getAttribute(attr) : el[attr];
      if (!val) continue;
      const origKey = '__orig_' + attr;
      const lastTransKey = '__last_trans_' + attr;
      if (el[origKey] === undefined || (val !== el[origKey] && val !== el[lastTransKey])) {
        el[origKey] = val;
      }
      const baseAttrVal = el[origKey] || val;
      const trans = (activeLanguage === 'ko')
        ? (safeDictGet(placeholders, baseAttrVal) || safeDictGet(exactDict, baseAttrVal) || (typeof baseAttrVal === 'string' ? safeDictGet(exactDict, baseAttrVal.toLowerCase()) : undefined) || translateText(baseAttrVal, 'ko', allowCollect))
        : translateText(baseAttrVal, activeLanguage, allowCollect);
      if (trans && trans !== val) {
        el[lastTransKey] = trans;
        if (el.setAttribute) el.setAttribute(attr, trans);
        if (attr === 'placeholder') el.placeholder = trans;
      }
    }
  }

  function translateNode(node) {
    if (!node || activeLanguage === 'en' || isImeComposing) return;

    if (node.nodeType === 3) {
      const parent = node.parentElement;
      if (!parent || shouldIgnore(parent) || isInputOrEditable(parent) || node._isTranslating) return;
      const raw = node.nodeValue;
      if (!raw || !raw.trim()) return;
      if (node._lastTranslatedValue && raw === node._lastTranslatedValue) return;

      if (node._originalText === undefined || (raw !== node._originalText && raw !== node._lastTranslatedValue)) {
        node._originalText = raw;
      }
      if (!originalTextMap.has(node) || (raw !== originalTextMap.get(node) && raw !== node._lastTranslatedValue)) {
        originalTextMap.set(node, raw);
      }

      try {
        const sourceText = node._originalText !== undefined ? node._originalText : raw;
        const translated = translateText(sourceText, activeLanguage, !isUserContentElement(parent));
        if (typeof translated === 'string' && translated !== raw) {
          node._isTranslating = true;
          node._lastTranslatedValue = translated;
          node.nodeValue = translated;
          node._isTranslating = false;
        }
      } catch (_) {
        node._isTranslating = false;
      }
      return;
    }

    if (node.nodeType === 1) {
      const tag = node.tagName;
      const isFormInput = (tag === 'INPUT' || tag === 'TEXTAREA');
      const isEditableRoot = Boolean(
        node.isContentEditable ||
        (node.hasAttribute && (node.hasAttribute('data-lexical-editor') || (node.classList && node.classList.contains('lexical-editor'))))
      );
      if (isFormInput || isEditableRoot) {
        const inProtectedWidget = node.closest && node.closest('.monaco-editor, .notranslate, [translate="no"], #antigravity-enhancer-modal-backdrop, #antigravity-quota-popover');
        if (!inProtectedWidget) translateElementAttrs(node);
        return;
      }
      if (isInputOrEditable(node) || shouldIgnore(node)) return;
      translateElementAttrs(node);
      if (node.shadowRoot) translateNode(node.shadowRoot);
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) translateNode(children[i]);
    } else if (node.nodeType === 11) {
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) translateNode(children[i]);
    }
  }

  function revertElementAttrs(el) {
    for (const attr of TRANSLATE_ATTRS) {
      const key = '__orig_' + attr;
      if (el[key] !== undefined) {
        if (el.setAttribute) el.setAttribute(attr, el[key]);
        if (attr === 'placeholder') el.placeholder = el[key];
      }
    }
  }

  function revertToOriginal(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      if (isInputOrEditable(node)) return;
      const orig = node._originalText !== undefined ? node._originalText : originalTextMap.get(node);
      if (orig !== undefined) {
        node._isTranslating = true;
        node.nodeValue = orig;
        node._lastTranslatedValue = null;
        node._isTranslating = false;
      }
      return;
    }
    if (node.nodeType === 1) {
      const tag = node.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable || (node.hasAttribute && node.hasAttribute('data-lexical-editor'))) {
        revertElementAttrs(node);
        return;
      }
      if (isInputOrEditable(node)) return;
      revertElementAttrs(node);
      if (node.shadowRoot) revertToOriginal(node.shadowRoot);
      const ch = node.childNodes;
      for (let i = 0; i < ch.length; i++) revertToOriginal(ch[i]);
    } else if (node.nodeType === 11) {
      const ch = node.childNodes;
      for (let i = 0; i < ch.length; i++) revertToOriginal(ch[i]);
    }
  }

  const UI_FONT_LINKS = [
    { id: 'ag-font-pretendard', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css' },
    { id: 'ag-font-pretendard-jp', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-jp-dynamic-subset.min.css' },
    { id: 'ag-font-noto-multilang', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap' }
  ];

  function getUiFontFamily(lang) {
    switch (lang) {
      case 'ko':
        return '-apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Segoe UI", sans-serif';
      case 'ja':
        return '-apple-system, BlinkMacSystemFont, "Pretendard JP Variable", "Pretendard JP", "Pretendard Variable", "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Segoe UI", sans-serif';
      case 'zh-CN':
        return '-apple-system, BlinkMacSystemFont, "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Pretendard Variable", "Segoe UI", sans-serif';
      case 'zh-TW':
        return '-apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei UI", "Microsoft JhengHei", "Pretendard Variable", "Segoe UI", sans-serif';
      default:
        return '-apple-system, BlinkMacSystemFont, "Pretendard Variable", "Noto Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    }
  }

  function buildI18nFontCss(lang) {
    const family = getUiFontFamily(lang);
    return `
        body, button, select {
          font-family: ${family} !important;
        }
        input, textarea {
          font-family: ${family};
        }
      `;
  }

  function injectFont() {
    const root = document.head || document.documentElement;
    if (!root) return;

    try {
      for (const f of UI_FONT_LINKS) {
        if (!document.getElementById(f.id)) {
          const link = document.createElement('link');
          link.id = f.id;
          link.rel = 'stylesheet';
          link.href = f.href;
          root.appendChild(link);
        }
      }
    } catch (_) {}

    if (!document.getElementById('antigravity-developer-style')) {
      const devStyle = document.createElement('style');
      devStyle.id = 'antigravity-developer-style';
      devStyle.textContent = `
        :root {
          --editor-font-family: D2Coding, JetBrains Mono, Consolas, monospace !important;
          --monaco-monospace-font: D2Coding, JetBrains Mono, Consolas, monospace !important;
        }
        code, pre, .code-block, .code-block *, .code-line, .line-content, .monaco-editor, .monaco-editor * {
          font-family: D2Coding, JetBrains Mono, Consolas, monospace !important;
        }
        @keyframes antigravity-copy-pulse {
          0% { color: #4CC38A; }
          100% { color: #4CC38A; }
        }
        .antigravity-copy-success, .antigravity-copy-pulse {
          animation: antigravity-copy-pulse 0.5s cubic-bezier(0.22, 1, 0.36, 1) !important;
          color: #4CC38A !important;
        }
        .antigravity-copy-success svg, .antigravity-copy-pulse svg {
          stroke: #4CC38A !important;
        }
        #antigravity-quick-lang-menu .agy-overlay-item:hover,
        #antigravity-lang-dropdown-menu .agy-overlay-item:hover {
          background: rgba(202, 211, 245, 0.08) !important;
        }
        #antigravity-quick-lang-btn:hover,
        #antigravity-quota-widget:hover {
          border-color: rgba(160, 163, 246, 0.4) !important;
        }
        #antigravity-quick-lang-btn:focus-visible,
        #antigravity-quota-widget:focus-visible,
        #antigravity-enhancer-update-btn:focus-visible,
        #antigravity-enhancer-modal button:focus-visible,
        #ag-enhancer-control-center button:focus-visible {
          outline: 1.5px solid #A0A3F6 !important;
          outline-offset: 1px;
        }
        #antigravity-enhancer-modal .agy-enh-btn:hover:not(:disabled),
        #ag-enhancer-control-center .agy-enh-btn:hover:not(:disabled) {
          background: rgba(202, 211, 245, 0.12) !important;
        }
        #antigravity-enhancer-modal .agy-enh-primary:hover:not(:disabled),
        #ag-enhancer-control-center .agy-enh-primary:hover:not(:disabled) {
          opacity: 0.92 !important;
        }
        #ag-enhancer-control-center .ag-cc-tab:hover {
          color: #CAD3F5 !important;
        }
        #ag-enhancer-control-center .agy-overlay-item:hover {
          background: rgba(202, 211, 245, 0.08) !important;
          color: #CAD3F5 !important;
        }
        #ag-enhancer-control-center .ag-cc-range {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
        }
        #ag-enhancer-control-center .ag-cc-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #CAD3F5;
          border: 2px solid #A0A3F6;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
          cursor: pointer;
          transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        #ag-enhancer-control-center .ag-cc-range::-webkit-slider-thumb:hover {
          transform: scale(1.12);
        }
        #antigravity-popover-refresh:hover {
          color: #CAD3F5 !important;
        }
        #antigravity-open-models-settings:hover {
          text-decoration: underline !important;
        }
      `;
      root.appendChild(devStyle);
    }

    if (!document.getElementById('antigravity-i18n-style')) {
      const i18nStyle = document.createElement('style');
      i18nStyle.id = 'antigravity-i18n-style';
      i18nStyle.textContent = buildI18nFontCss(activeLanguage);
      i18nStyle.disabled = (activeLanguage === 'en');
      root.appendChild(i18nStyle);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Copy Toast Notification
  // ---------------------------------------------------------------------------
  const COPY_TOAST_I18N = {
    en: 'Code copied to clipboard',
    ko: '코드가 클립보드에 복사되었습니다',
    ja: 'コードをクリップボードにコピーしました',
    'zh-CN': '代码已复制到剪贴板',
    'zh-TW': '程式碼已複製到剪貼簿',
    es: 'Código copiado al portapapeles',
    fr: 'Code copié dans le presse-papiers',
    de: 'Code in die Zwischenablage kopiert',
    ru: 'Код скопирован в буфер обмена'
  };

  let copyToastTimer = null;
  function showCopyToast() {
    try {
      if (typeof document === 'undefined') return;
      injectFont();
      let toast = document.getElementById('antigravity-copy-toast');
      const toastText = COPY_TOAST_I18N[activeLanguage] || COPY_TOAST_I18N.en;

      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'antigravity-copy-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;align-items:center;gap:8px;padding:8px 12px;background:#111217;color:#CAD3F5;font-size:13px;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:8px;border:1px solid rgba(202,211,245,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.4);pointer-events:none;opacity:0;';
        toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CC38A" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg><span id="antigravity-copy-toast-text">${toastText}</span>`;
        (document.body || document.documentElement).appendChild(toast);
      } else {
        const textSpan = toast.querySelector('#antigravity-copy-toast-text');
        if (textSpan) textSpan.textContent = toastText;
      }

      if (copyToastTimer) clearTimeout(copyToastTimer);
      if (window.gsap) {
        window.gsap.fromTo(toast, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out' });
        copyToastTimer = setTimeout(() => {
          if (window.gsap) {
            window.gsap.to(toast, { opacity: 0, duration: 0.12, ease: 'power1.in' });
          }
        }, 1800);
      } else {
        toast.style.opacity = '1';
        copyToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1800);
      }
    } catch (_) {}
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      try {
        const target = e.target;
        if (!target || !target.closest) return;
        const copyBtn = target.closest('button[aria-label*="Copy"], button[title*="Copy"], button[aria-label*="Copied"], button[aria-label*="복사"], button[title*="복사"]');
        if (!copyBtn) return;
        if (copyBtn._pulseTimer) clearTimeout(copyBtn._pulseTimer);
        copyBtn.classList.remove('antigravity-copy-success', 'antigravity-copy-pulse');
        void copyBtn.offsetWidth;
        copyBtn.classList.add('antigravity-copy-success');
        copyBtn._pulseTimer = setTimeout(() => {
          copyBtn.classList.remove('antigravity-copy-success');
          copyBtn._pulseTimer = null;
        }, 700);
        showCopyToast();
      } catch (_) {}
    }, true);
  }

  // ---------------------------------------------------------------------------
  // 4. Enhancer Hub I18N & Update State
  // ---------------------------------------------------------------------------
  let enhancerUpdateInfo = null;
  let enhancerUpdateChecked = false;
  let enhancerHubStatus = null;

  const HUB_I18N = {
    en: {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: 'Patch Version',
      checkUpdates: 'Check Patch Updates',
      restoreVanilla: 'Restore Original',
      curVer: 'Patch Version',
      appVer: 'App Version',
      updateSection: 'Updates',
      checkBtn: 'Check',
      checking: 'Checking...',
      upToDate: 'Up to date',
      availPrefix: 'Update available: ',
      updateNow: 'Update',
      updating: 'Updating...',
      updateDoneSuffix: ' installed',
      openRelease: 'Open Release',
      reloadNow: 'Reload Window',
      restartNow: 'Restart App',
      closeBtn: 'Close',
      cancelBtn: 'Cancel',
      restoreConfirmTitle: 'Restore Original Files',
      restoreConfirmDesc: 'Remove Antigravity Enhanced patches and restart Antigravity with original files?',
      restoring: 'Restoring...',
      safeModeWarn: 'Safe mode active'
    },
    ko: {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: '패치 버전',
      checkUpdates: '패치 업데이트 확인',
      restoreVanilla: '원본 복구',
      curVer: '패치 버전',
      appVer: '앱 버전',
      updateSection: '업데이트',
      checkBtn: '확인',
      checking: '확인 중...',
      upToDate: '최신 버전입니다',
      availPrefix: '새 버전: ',
      updateNow: '업데이트',
      updating: '업데이트 중...',
      updateDoneSuffix: ' 설치 완료',
      openRelease: '릴리즈 열기',
      reloadNow: '창 새로고침',
      restartNow: '앱 재시작',
      closeBtn: '닫기',
      cancelBtn: '취소',
      restoreConfirmTitle: '원본 복구',
      restoreConfirmDesc: 'Antigravity Enhanced 패치를 제거하고 원본 상태로 되돌린 뒤 앱을 재시작하시겠습니까?',
      restoring: '복구 중...',
      safeModeWarn: '안전 모드 활성화'
    },
    ja: {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: 'パッチバージョン',
      checkUpdates: 'パッチの更新を確認',
      restoreVanilla: 'オリジナルに戻す',
      curVer: 'パッチバージョン',
      appVer: 'アプリバージョン',
      updateSection: '更新',
      checkBtn: '確認',
      checking: '確認中...',
      upToDate: '最新バージョンです。',
      availPrefix: '新しいバージョン: ',
      updateNow: '更新する',
      updating: '更新中...',
      updateDoneSuffix: ' を適用しました。',
      openRelease: 'リリースを開く',
      reloadNow: '再読み込み',
      restartNow: '再起動',
      closeBtn: '閉じる',
      cancelBtn: 'キャンセル',
      restoreConfirmTitle: 'オリジナルに戻す',
      restoreConfirmDesc: 'Antigravity Enhanced パッチを削除して元の状態に戻し、アプリを再起動しますか？',
      restoring: '復元中...',
      safeModeWarn: 'セーフモード有効'
    },
    'zh-CN': {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: '补丁版本',
      checkUpdates: '检查补丁更新',
      restoreVanilla: '恢复原版',
      curVer: '补丁版本',
      appVer: '应用版本',
      updateSection: '更新',
      checkBtn: '检查更新',
      checking: '检查中...',
      upToDate: '已是最新版本。',
      availPrefix: '发现新版本: ',
      updateNow: '更新',
      updating: '更新中...',
      updateDoneSuffix: ' 已安装。',
      openRelease: '打开发布页',
      reloadNow: '重新加载窗口',
      restartNow: '重启应用',
      closeBtn: '关闭',
      cancelBtn: '取消',
      restoreConfirmTitle: '恢复原版',
      restoreConfirmDesc: '是否移除 Antigravity Enhanced 补丁并恢复为原版文件后重启应用？',
      restoring: '正在恢复...',
      safeModeWarn: '安全模式已启用'
    },
    'zh-TW': {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: '修補版本',
      checkUpdates: '檢查修補更新',
      restoreVanilla: '還原原版',
      curVer: '修補版本',
      appVer: '應用版本',
      updateSection: '更新',
      checkBtn: '檢查更新',
      checking: '檢查中...',
      upToDate: '目前已是最新版本。',
      availPrefix: '新版本: ',
      updateNow: '更新',
      updating: '更新中...',
      updateDoneSuffix: ' 已安裝。',
      openRelease: '開啟發佈頁面',
      reloadNow: '重新載入視窗',
      restartNow: '重新啟動',
      closeBtn: '關閉',
      cancelBtn: '取消',
      restoreConfirmTitle: '還原原版',
      restoreConfirmDesc: '是否移除 Antigravity Enhanced 修補並還原為原版檔案後重新啟動應用程式？',
      restoring: '正在還原...',
      safeModeWarn: '安全模式已啟用'
    },
    es: {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: 'Versión del parche',
      checkUpdates: 'Buscar actualizaciones del parche',
      restoreVanilla: 'Restaurar original',
      curVer: 'Versión del parche',
      appVer: 'Versión de la app',
      updateSection: 'Actualizaciones',
      checkBtn: 'Buscar',
      checking: 'Buscando...',
      upToDate: 'Está actualizado.',
      availPrefix: 'Disponible: ',
      updateNow: 'Actualizar',
      updating: 'Actualizando...',
      updateDoneSuffix: ' instalado.',
      openRelease: 'Abrir versión',
      reloadNow: 'Recargar ventana',
      restartNow: 'Reiniciar app',
      closeBtn: 'Cerrar',
      cancelBtn: 'Cancelar',
      restoreConfirmTitle: 'Restaurar original',
      restoreConfirmDesc: '¿Eliminar los parches de Antigravity Enhanced, restaurar los archivos originales y reiniciar?',
      restoring: 'Restaurando...',
      safeModeWarn: 'Modo seguro activo'
    },
    fr: {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: 'Version du patch',
      checkUpdates: 'Vérifier les mises à jour du patch',
      restoreVanilla: 'Restaurer l’original',
      curVer: 'Version du patch',
      appVer: 'Version de l’app',
      updateSection: 'Mises à jour',
      checkBtn: 'Vérifier',
      checking: 'Vérification...',
      upToDate: 'À jour.',
      availPrefix: 'Disponible : ',
      updateNow: 'Mettre à jour',
      updating: 'Mise à jour...',
      updateDoneSuffix: ' installé.',
      openRelease: 'Ouvrir',
      reloadNow: 'Recharger',
      restartNow: 'Redémarrer',
      closeBtn: 'Fermer',
      cancelBtn: 'Annuler',
      restoreConfirmTitle: 'Restaurer l’original',
      restoreConfirmDesc: 'Supprimer les correctifs Antigravity Enhanced, restaurer les fichiers d’origine et redémarrer ?',
      restoring: 'Restauration...',
      safeModeWarn: 'Mode sans échec actif'
    },
    de: {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: 'Patch-Version',
      checkUpdates: 'Nach Patch-Updates suchen',
      restoreVanilla: 'Original wiederherstellen',
      curVer: 'Patch-Version',
      appVer: 'App-Version',
      updateSection: 'Updates',
      checkBtn: 'Prüfen',
      checking: 'Prüfe...',
      upToDate: 'Aktuell.',
      availPrefix: 'Verfügbar: ',
      updateNow: 'Aktualisieren',
      updating: 'Aktualisiere...',
      updateDoneSuffix: ' installiert.',
      openRelease: 'Release öffnen',
      reloadNow: 'Neu laden',
      restartNow: 'App neu starten',
      closeBtn: 'Schließen',
      cancelBtn: 'Abbrechen',
      restoreConfirmTitle: 'Original wiederherstellen',
      restoreConfirmDesc: 'Antigravity Enhanced-Patches entfernen, Originaldateien wiederherstellen und neu starten?',
      restoring: 'Wird wiederhergestellt...',
      safeModeWarn: 'Abgesicherter Modus aktiv'
    },
    ru: {
      title: 'Antigravity Enhanced',
      patchVersionPrefix: 'Версия патча',
      checkUpdates: 'Проверить обновления патча',
      restoreVanilla: 'Восстановить оригинал',
      curVer: 'Версия патча',
      appVer: 'Версия приложения',
      updateSection: 'Обновления',
      checkBtn: 'Проверить',
      checking: 'Проверка...',
      upToDate: 'Актуальная версия.',
      availPrefix: 'Доступна версия: ',
      updateNow: 'Обновить',
      updating: 'Обновление...',
      updateDoneSuffix: ' установлен.',
      openRelease: 'Открыть релиз',
      reloadNow: 'Перезагрузить окно',
      restartNow: 'Перезапустить',
      closeBtn: 'Закрыть',
      cancelBtn: 'Отмена',
      restoreConfirmTitle: 'Восстановить оригинал',
      restoreConfirmDesc: 'Удалить патчи Antigravity Enhanced, восстановить исходные файлы и перезапустить приложение?',
      restoring: 'Восстановление...',
      safeModeWarn: 'Включён безопасный режим'
    }
  };

  const UPDATE_PILL_I18N = {
    en: 'Update Available',
    ko: '업데이트 가능',
    ja: 'アップデート可能',
    'zh-CN': '有可用更新',
    'zh-TW': '有可用更新',
    es: 'Actualización disponible',
    fr: 'Mise à jour disponible',
    de: 'Update verfügbar',
    ru: 'Доступно обновление'
  };

  function getHubStrings() {
    const base = HUB_I18N[activeLanguage] || HUB_I18N.en;
    return {
      ...base,
      updateAvailablePill: UPDATE_PILL_I18N[activeLanguage] || UPDATE_PILL_I18N.en
    };
  }

  async function refreshHubStatus() {
    if (!ipc) return null;
    try {
      enhancerHubStatus = await ipc.invoke('enhancer:get-status');
      return enhancerHubStatus;
    } catch (_) {
      return null;
    }
  }

  async function checkEnhancerGithubUpdate(forceCheck = false) {
    if (enhancerUpdateChecked && !forceCheck) return enhancerUpdateInfo;
    enhancerUpdateChecked = true;
    if (!ipc) return null;
    try {
      const res = await ipc.invoke('enhancer:check-update');
      if (res && res.ok) {
        enhancerUpdateInfo = res;
        scheduleInjectTitleMenuIntegration();
      }
      return res;
    } catch (_) {
      return null;
    }
  }

  let activeProgressHandler = null;
  let activeModalLangHandler = null;
  if (ipc && typeof ipc.on === 'function') {
    ipc.on('enhancer:update-progress', (_ev, data) => {
      if (typeof activeProgressHandler === 'function') {
        activeProgressHandler(data);
      }
    });
  }

  function matchesShortcut(e, spec) {
    if (!e || !spec || typeof spec !== 'string') return false;
    const parts = spec.split('+').map(p => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) return false;
    const keyPart = parts[parts.length - 1];
    const mods = new Set(parts.slice(0, -1));
    if (Boolean(e.ctrlKey) !== mods.has('ctrl')) return false;
    if (Boolean(e.altKey) !== mods.has('alt')) return false;
    if (Boolean(e.shiftKey) !== mods.has('shift')) return false;
    if (Boolean(e.metaKey) !== (mods.has('meta') || mods.has('win') || mods.has('cmd'))) return false;
    const ek = String(e.key || '').toLowerCase();
    return ek === keyPart;
  }

  function formatShortcutFromEvent(e) {
    if (!e) return '';
    let k = String(e.key || '');
    if (['Control', 'Alt', 'Shift', 'Meta', 'Dead', 'Process', 'Unidentified'].includes(k) || k.length > 12) {
      const code = String(e.code || '');
      if (code.startsWith('Key') && code.length === 4) k = code.slice(3);
      else if (code.startsWith('Digit') && code.length === 6) k = code.slice(5);
      else return '';
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(k)) return '';
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    parts.push(k.length === 1 ? k.toUpperCase() : k);
    return parts.join('+');
  }

  const alertCooldownMap = new Map();
  const prevQuotaLevels = new Map();

  function evaluateQuotaAlerts(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    const now = Date.now();
    const cooldownMs = 30 * 60 * 1000;
    const threshold = Number(userPreferences.quotaLowThreshold) || 20;

    for (const key of ['argon', 'gemini', 'other']) {
      const g = snapshot[key];
      if (!g) continue;
      const vals = [g.h5, g.weekly].filter(v => typeof v === 'number');
      if (vals.length === 0) continue;
      const minPct = Math.min(...vals);
      const prev = prevQuotaLevels.get(key);
      prevQuotaLevels.set(key, minPct);

      if (userPreferences.quotaAlertsEnabled && minPct < threshold) {
        const lastAt = alertCooldownMap.get(`low:${key}`) || 0;
        if ((now - lastAt) >= cooldownMs) {
          alertCooldownMap.set(`low:${key}`, now);
          const msg = `${g.label || key}: ${minPct}% (< ${threshold}%)`;
          showToast(msg);
          if (ipc && ipc.invoke) ipc.invoke('enhancer:notify', { title: 'Antigravity Quota Low', body: msg }).catch(() => {});
        }
      }

      if (userPreferences.quotaResetAlertsEnabled && typeof prev === 'number' && prev <= 5 && minPct >= 80) {
        const lastAt = alertCooldownMap.get(`reset:${key}`) || 0;
        if ((now - lastAt) >= cooldownMs) {
          alertCooldownMap.set(`reset:${key}`, now);
          const msg = `${g.label || key}: Quota Reset (${minPct}%)`;
          showToast(msg);
          if (ipc && ipc.invoke) ipc.invoke('enhancer:notify', { title: 'Antigravity Quota Reset', body: msg }).catch(() => {});
        }
      }
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('antigravity-quota-snapshot', (ev) => {
      const snap = ev && ev.detail;
      if (!snap) return;
      evaluateQuotaAlerts(snap);
      if (ipc && ipc.invoke) {
        ipc.invoke('enhancer:record-quota-snapshot', snap).then((res) => {
          if (res && res.ok && res.history) {
            quotaHistoryState = res.history;
            window.dispatchEvent(new CustomEvent('antigravity-quota-history-updated', {
              detail: { history: quotaHistoryState, preferences: userPreferences }
            }));
          }
        }).catch(() => {});
      }
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function canGsapAnimate(el) {
    return Boolean(el && typeof el.getBoundingClientRect === 'function' && typeof window !== 'undefined' && window.gsap);
  }

  function closeControlCenterModal(immediate = false) {
    activeProgressHandler = null;
    if (activeModalLangHandler && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('antigravity-lang-changed', activeModalLangHandler);
      activeModalLangHandler = null;
    }
    const bd = document.getElementById('ag-enhancer-control-center-backdrop');
    if (!bd) return;
    const modal = document.getElementById('ag-enhancer-control-center');
    if (window.gsap && window.gsap.killTweensOf) {
      window.gsap.killTweensOf(bd);
      if (modal) window.gsap.killTweensOf(modal);
    }
    if (!immediate && canGsapAnimate(bd)) {
      if (canGsapAnimate(modal)) window.gsap.to(modal, { opacity: 0, scale: 0.98, y: 4, duration: 0.12, ease: 'power1.in' });
      window.gsap.to(bd, { opacity: 0, duration: 0.12, ease: 'power1.in', onComplete: () => bd.remove() });
    } else {
      bd.remove();
    }
  }

  function renderNativeSwitch(id, checked) {
    const on = Boolean(checked);
    return `<button type="button" role="switch" id="${id}" aria-checked="${on}" style="position:relative;display:inline-flex;height:20px;width:36px;flex-shrink:0;cursor:pointer;border-radius:9999px;border:2px solid transparent;transition:background-color 150ms cubic-bezier(0.22, 1, 0.36, 1);outline:none;background-color:${on ? '#A0A3F6' : 'rgba(202,211,245,0.2)'};"><span class="ag-switch-thumb" style="pointer-events:none;display:inline-block;height:16px;width:16px;border-radius:9999px;background-color:#CAD3F5;box-shadow:0 1px 2px rgba(0,0,0,0.3);transition:transform 150ms cubic-bezier(0.22, 1, 0.36, 1);transform:translateX(${on ? '16px' : '0px'});"></span></button>`;
  }

  function wireNativeSwitch(btn, onChange) {
    if (!btn) return;
    btn.onclick = (e) => {
      if (e) e.stopPropagation();
      const next = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(next));
      btn.style.backgroundColor = next ? '#A0A3F6' : 'rgba(202,211,245,0.2)';
      const thumb = btn.querySelector('.ag-switch-thumb');
      if (thumb) thumb.style.transform = next ? 'translateX(16px)' : 'translateX(0px)';
      if (typeof onChange === 'function') onChange(next);
    };
  }

  function persistPreferences(patch) {
    userPreferences = { ...userPreferences, ...patch };
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('antigravity-quota-history-updated', {
        detail: { history: quotaHistoryState, preferences: userPreferences }
      }));
    }
    if (ipc && ipc.invoke) {
      ipc.invoke('enhancer:save-preferences', patch).catch(() => {});
    }
  }

  const CONTROL_CENTER_I18N = {
    en: {
      modalTitle: 'Patch Settings', menuItem: 'Patch Settings...',
      tabs: { general: 'General', translation: 'Translation', quota: 'Quota', shortcuts: 'Shortcuts' },
      ifaceLang: 'Interface Language', ifaceDesc: 'Zero-restart live localization.',
      hubTitle: 'Patch Updates & Restore', checkUpd: 'Check Updates',
      glossaryTitle: 'Custom Glossary', srcPh: 'Source text', dstPh: 'Target text', add: 'Add',
      exportJson: 'Export JSON', importJson: 'Import JSON', apply: 'Apply',
      noGlossary: 'No custom glossary entries yet.',
      collectUt: 'Collect Untranslated Strings (Opt-in)', collectUtDesc: 'Logs unmatched UI text locally for review.',
      utList: 'Collected Strings', copy: 'Copy', clear: 'Clear', emptyUt: 'No collected strings.',
      sparklines: 'Quota Popover Sparklines', sparkDesc: 'Shows 72h local usage trend sparkline.',
      compactCard: 'Compact Quota Cards', compactDesc: 'Tightens popover card spacing and hides model list.',
      lowAlert: 'Low-Quota Desktop Alerts', lowDesc: 'Alerts once per model below threshold (30m cooldown).',
      threshold: 'Threshold', resetAlert: 'Quota Reset Alerts', resetDesc: 'Notifies when quota recovers above 80%.',
      clearHist: 'Clear 72h History', clearHistConfirm: 'Clear all 72h quota history?', confirmClear: 'Confirm Clear', cancel: 'Cancel', cleared: 'Cleared', copied: 'Copied',
      changelogBtn: 'Changelog', changelogTitle: 'Update Changelog', changelogBack: 'Back', changelogEmpty: 'No changelog entries available.',
      cycleKey: 'Cycle Language Shortcut', centerKey: 'Open Patch Settings',
      pressKeys: 'Press keys (ESC cancel)...', diagnostics: 'Diagnostics', autoRepatch: 'Auto-Repatch'
    },
    ko: {
      modalTitle: '패치 설정', menuItem: '패치 설정...',
      tabs: { general: '일반', translation: '번역 · 용어집', quota: '할당량 · 알림', shortcuts: '단축키 · 진단' },
      ifaceLang: '인터페이스 언어', ifaceDesc: '재시작 없이 즉시 언어를 전환합니다.',
      hubTitle: '패치 업데이트 및 복구', checkUpd: '업데이트 확인',
      glossaryTitle: '커스텀 용어집', srcPh: '원문 (예: Agent)', dstPh: '번역 (예: 에이전트)', add: '추가',
      exportJson: 'JSON 내보내기', importJson: 'JSON 가져오기', apply: '적용',
      noGlossary: '등록된 사용자 용어집 항목이 없습니다.',
      collectUt: '미번역 문자열 자동 수집 (Opt-in)', collectUtDesc: '사전에 없는 UI 문구를 로컬 JSON에 기록합니다.',
      utList: '수집된 미번역 목록', copy: '복사', clear: '비우기', emptyUt: '수집된 문자열이 없습니다.',
      sparklines: '할당량 팝오버 스파크라인', sparkDesc: '72시간 로컬 사용 추이 그래프를 표시합니다.',
      compactCard: '컴팩트 할당량 카드', compactDesc: '팝오버 여백을 줄이고 모델 목록을 간소화합니다.',
      lowAlert: '저잔량 데스크톱 알림', lowDesc: '임계치 미만 도달 시 모델별 1회 알림 (30분 쿨다운)',
      threshold: '임계치', resetAlert: '할당량 리셋 완료 알림', resetDesc: '고갈 후 80% 이상 회복 시 알림을 보냅니다.',
      clearHist: '72시간 기록 초기화', clearHistConfirm: '저장된 72시간 사용량 기록을 모두 초기화할까요?', confirmClear: '초기화 확인', cancel: '취소', cleared: '초기화됨', copied: '복사됨',
      changelogBtn: '변경 기록', changelogTitle: '업데이트 변경 기록', changelogBack: '뒤로', changelogEmpty: '불러올 변경 기록이 없습니다.',
      cycleKey: '언어 순환 단축키', centerKey: '패치 설정 열기',
      pressKeys: '키 조합 입력 (ESC 취소)...', diagnostics: '시스템 진단', autoRepatch: '자동 재패치'
    },
    ja: { modalTitle: 'パッチ設定', menuItem: 'パッチ設定...', tabs: { general: '一般', translation: '翻訳・用語集', quota: 'クォータ・通知', shortcuts: 'ショートカット' }, ifaceLang: 'インターフェース言語', ifaceDesc: '再起動なしで即時に言語を切り替えます。', hubTitle: 'パッチ更新と復元', checkUpd: 'アップデート確認', changelogBtn: '変更履歴', changelogTitle: 'アップデート変更履歴', changelogBack: '戻る', glossaryTitle: 'カスタム用語集', add: '追加', exportJson: 'JSON出力', importJson: 'JSON読込', collectUt: '未翻訳テキスト収集 (Opt-in)', utList: '収集済みリスト', copy: 'コピー', clear: 'クリア', sparklines: 'スパークライン表示', compactCard: 'コンパクトカード', lowAlert: '残量低下通知', threshold: 'しきい値', resetAlert: 'リセット通知', clearHist: '72時間履歴を消去', cycleKey: '言語切替キー', centerKey: 'パッチ設定を開く', diagnostics: 'システム診断', autoRepatch: '自動再パッチ' },
    'zh-CN': { modalTitle: '补丁设置', menuItem: '补丁设置...', tabs: { general: '常规', translation: '翻译・术语表', quota: '配额・通知', shortcuts: '快捷键・诊断' }, ifaceLang: '界面语言', ifaceDesc: '无需重启即可实时切换语言。', hubTitle: '补丁更新与还原', checkUpd: '检查更新', changelogBtn: '更新日志', changelogTitle: '更新日志记录', changelogBack: '返回', glossaryTitle: '自定义术语表', add: '添加', exportJson: '导出 JSON', importJson: '导入 JSON', collectUt: '收集未翻译文本 (可选)', utList: '已收集列表', copy: '复制', clear: '清空', sparklines: '显示趋势线', compactCard: '紧凑配额卡片', lowAlert: '低配额桌面通知', threshold: '阈值', resetAlert: '配额重置通知', clearHist: '清除72小时历史', cycleKey: '切换语言快捷键', centerKey: '打开补丁设置', diagnostics: '系统诊断', autoRepatch: '自动重打补丁' },
    'zh-TW': { modalTitle: '修補設定', menuItem: '修補設定...', tabs: { general: '一般', translation: '翻譯・詞彙表', quota: '配額・通知', shortcuts: '快捷鍵・診斷' }, ifaceLang: '介面語言', ifaceDesc: '無需重新啟動即可即時切換語言。', hubTitle: '修補更新與還原', checkUpd: '檢查更新', changelogBtn: '變更紀錄', changelogTitle: '更新變更紀錄', changelogBack: '返回', glossaryTitle: '自訂詞彙表', add: '新增', exportJson: '匯出 JSON', importJson: '匯入 JSON', collectUt: '收集未翻譯文字 (選用)', utList: '已收集清單', copy: '複製', clear: '清空', sparklines: '顯示趨勢線', compactCard: '精簡配額卡片', lowAlert: '低配額桌面通知', threshold: '閾值', resetAlert: '配額重設通知', clearHist: '清除72小時歷史', cycleKey: '切換語言快捷鍵', centerKey: '開啟修補設定', diagnostics: '系統診斷', autoRepatch: '自動重打修補' },
    es: { modalTitle: 'Ajustes del parche', menuItem: 'Ajustes del parche...', tabs: { general: 'General', translation: 'Traducción', quota: 'Cuota', shortcuts: 'Atajos' }, ifaceLang: 'Idioma de interfaz', checkUpd: 'Buscar actualizaciones', changelogBtn: 'Historial', changelogTitle: 'Historial de cambios', changelogBack: 'Volver', add: 'Añadir', copy: 'Copiar', clear: 'Limpiar', diagnostics: 'Diagnóstico' },
    fr: { modalTitle: 'Paramètres du patch', menuItem: 'Paramètres du patch...', tabs: { general: 'Général', translation: 'Traduction', quota: 'Quota', shortcuts: 'Raccourcis' }, ifaceLang: 'Langue de l’interface', checkUpd: 'Vérifier les mises à jour', changelogBtn: 'Historique', changelogTitle: 'Journal des modifications', changelogBack: 'Retour', add: 'Ajouter', copy: 'Copier', clear: 'Effacer', diagnostics: 'Diagnostic' },
    de: { modalTitle: 'Patch-Einstellungen', menuItem: 'Patch-Einstellungen...', tabs: { general: 'Allgemein', translation: 'Übersetzung', quota: 'Kontingent', shortcuts: 'Tastenkürzel' }, ifaceLang: 'Oberflächensprache', checkUpd: 'Nach Updates suchen', changelogBtn: 'Änderungen', changelogTitle: 'Änderungsprotokoll', changelogBack: 'Zurück', add: 'Hinzufügen', copy: 'Kopieren', clear: 'Leeren', diagnostics: 'Diagnose' },
    ru: { modalTitle: 'Настройки патча', menuItem: 'Настройки патча...', tabs: { general: 'Общие', translation: 'Перевод', quota: 'Квота', shortcuts: 'Сочетания' }, ifaceLang: 'Язык интерфейса', checkUpd: 'Проверить обновления', changelogBtn: 'История', changelogTitle: 'История изменений', changelogBack: 'Назад', add: 'Добавить', copy: 'Копировать', clear: 'Очистить', diagnostics: 'Диагностика' }
  };

  function getControlCenterStrings(lang) {
    const base = CONTROL_CENTER_I18N.en;
    const loc = CONTROL_CENTER_I18N[lang] || {};
    return { ...base, ...loc, tabs: { ...base.tabs, ...(loc.tabs || {}) } };
  }

  async function openControlCenterModal(initialTab = 'general', opts = {}) {
    if (typeof document === 'undefined') return;
    const existingBd = document.getElementById('ag-enhancer-control-center-backdrop');
    if (existingBd) {
      if (!opts.forceOpen) {
        closeControlCenterModal(false);
        return;
      }
      closeControlCenterModal(true);
    }
    closeEnhancerHubModal(true);

    const bd = document.createElement('div');
    bd.id = 'ag-enhancer-control-center-backdrop';
    bd.className = 'notranslate';
    bd.setAttribute('translate', 'no');
    bd.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;margin:0;box-sizing:border-box;z-index:100001;background:rgba(11,11,14,0.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:calc((100vh - min(86vh, 680px)) / 2) 20px 20px;app-region:no-drag;-webkit-app-region:no-drag;';

    const modal = document.createElement('div');
    modal.id = 'ag-enhancer-control-center';
    modal.className = 'notranslate';
    modal.setAttribute('translate', 'no');
    modal.style.cssText = `position:relative;left:auto;right:auto;top:auto;bottom:auto;margin:0;flex-shrink:0;width:660px;max-width:calc(100vw - 40px);max-height:min(86vh, 680px);box-sizing:border-box;display:flex;flex-direction:column;background:#0B0B0E;border:1px solid rgba(202,211,245,0.1);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.48);color:#CAD3F5;font-family:${getUiFontFamily(activeLanguage)};font-size:13px;overflow:hidden;app-region:no-drag;-webkit-app-region:no-drag;`;

    const sInit = getControlCenterStrings(activeLanguage);
    const tabs = [
      { id: 'general', label: sInit.tabs.general },
      { id: 'translation', label: sInit.tabs.translation },
      { id: 'quota', label: sInit.tabs.quota },
      { id: 'shortcuts', label: sInit.tabs.shortcuts }
    ];
    let currentTab = tabs.some(t => t.id === initialTab) ? initialTab : 'general';

    modal.innerHTML = `
      <header style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(202,211,245,0.08);background:#0B0B0E;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:14px;font-weight:600;color:#CAD3F5;">Antigravity<span style="color:#A0A3F6;margin-left:0;">Enhanced</span></span>
          <span id="ag-cc-modal-subtitle" style="font-size:11px;color:#818BA8;font-variant-numeric:tabular-nums;">${escapeHtml(sInit.modalTitle)} · v${ENHANCER_CURRENT_VERSION}</span>
        </div>
        <button id="ag-cc-close" type="button" class="agy-enh-btn" style="background:#181A22;border:1px solid rgba(202,211,245,0.1);color:#CAD3F5;border-radius:6px;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;">×</button>
      </header>
      <div id="ag-cc-tabs" style="position:relative;display:flex;gap:4px;padding:8px 14px;border-bottom:1px solid rgba(202,211,245,0.08);background:#0B0B0E;">
        <span id="ag-cc-tab-pill" style="display:block;position:absolute;top:8px;bottom:8px;left:14px;width:0;border-radius:6px;background:rgba(160,163,246,0.14);border:1px solid rgba(160,163,246,0.22);pointer-events:none;z-index:0;"></span>
        ${tabs.map(t => `<button type="button" data-tab="${t.id}" class="ag-cc-tab" style="position:relative;z-index:1;padding:6px 12px;border-radius:6px;border:none;background:transparent;cursor:pointer;font-size:12px;font-weight:500;transition:color 140ms ease;">${t.label}</button>`).join('')}
      </div>
      <div id="ag-cc-body" style="padding:14px 16px;height:auto;max-height:min(68vh, 560px);overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;display:flex;flex-direction:column;gap:10px;background:#0B0B0E;"></div>
    `;

    bd.appendChild(modal);
    (document.body || document.documentElement).appendChild(bd);

    if (canGsapAnimate(bd)) {
      window.gsap.fromTo(bd, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: 'power1.out' });
      if (canGsapAnimate(modal)) window.gsap.fromTo(modal, { opacity: 0, scale: 0.97, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out' });
    }

    let activeRecorderCleanup = null;
    const cleanupRecorder = () => {
      if (typeof activeRecorderCleanup === 'function') {
        activeRecorderCleanup();
        activeRecorderCleanup = null;
      }
    };

    bd.onclick = (e) => { if (e.target === bd) { cleanupRecorder(); closeControlCenterModal(false); } };
    const closeBtn = modal.querySelector('#ag-cc-close');
    if (closeBtn) closeBtn.onclick = () => { cleanupRecorder(); closeControlCenterModal(false); };

    const bodyEl = modal.querySelector('#ag-cc-body');
    const tabBtns = modal.querySelectorAll('.ag-cc-tab');
    const tabPill = modal.querySelector('#ag-cc-tab-pill');
    let restoreConfirmOpen = Boolean(opts.restoreConfirm);
    let clearHistConfirmOpen = false;
    let changelogViewOpen = Boolean(opts.changelog);
    let cachedChangelogText = null;
    let autoCheckDone = false;

    const formatReleaseNotesHtml = (rawText) => {
      const lines = String(rawText || '').replace(/\r\n/g, '\n').split('\n');
      const formatInline = (text) => escapeHtml(text)
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#CAD3F5;font-weight:600;">$1</strong>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(160,163,246,0.14);color:#A0A3F6;padding:1px 4px;border-radius:4px;font-family:monospace;font-size:10.5px;">$1</code>');
      const htmlParts = [];
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === '---') continue;
        const hMatch = line.match(/^#{1,3}\s+(.+)$/);
        if (hMatch) {
          htmlParts.push(`<p style="margin:6px 0 2px;font-size:11.5px;font-weight:600;color:#A0A3F6;">${formatInline(hMatch[1])}</p>`);
        } else if (/^[-*•]\s+/.test(line)) {
          const itemText = line.replace(/^[-*•]\s+/, '');
          htmlParts.push(`<p style="margin:2px 0;padding-left:10px;position:relative;color:#CAD3F5;"><span style="position:absolute;left:0;color:#A0A3F6;">•</span>${formatInline(itemText)}</p>`);
        } else {
          htmlParts.push(`<p style="margin:2px 0;color:#CAD3F5;">${formatInline(line)}</p>`);
        }
      }
      return htmlParts.join('');
    };

    const parseChangelogSections = (mdText) => {
      const text = String(mdText || '').replace(/\r\n/g, '\n');
      const lines = text.split('\n');
      const sections = [];
      let current = null;
      for (const line of lines) {
        const m = line.match(/^##\s+\[([^\]]+)\](?:\s*-\s*(.+))?$/);
        if (m) {
          if (current) sections.push(current);
          current = { version: m[1].trim(), date: (m[2] || '').trim(), lines: [] };
        } else if (current) {
          current.lines.push(line);
        }
      }
      if (current) sections.push(current);
      return sections.map(sec => ({ ...sec, body: sec.lines.join('\n').trim() }));
    };

    const animateBodyHeight = (prevHeight) => {
      if (!bodyEl || !canGsapAnimate(bodyEl) || !prevHeight || prevHeight <= 0) return;
      bodyEl.style.height = 'auto';
      const nextHeight = bodyEl.offsetHeight || 0;
      if (nextHeight > 0 && Math.abs(prevHeight - nextHeight) > 2) {
        window.gsap.fromTo(bodyEl, { height: prevHeight }, { height: nextHeight, duration: 0.22, ease: 'power2.out', clearProps: 'height' });
      }
    };

    function moveTabPill(targetBtn, animate = true) {
      if (!tabPill || !targetBtn) return;
      const left = targetBtn.offsetLeft || 14;
      const width = targetBtn.offsetWidth || 72;
      if (animate && canGsapAnimate(tabPill) && width > 0) {
        window.gsap.to(tabPill, { left, width, duration: 0.2, ease: 'power2.out' });
      } else {
        tabPill.style.left = `${left}px`;
        tabPill.style.width = `${width}px`;
      }
    }

    function renderTab(tabId, animateSlide = false) {
      cleanupRecorder();
      const prevBodyHeight = bodyEl ? (bodyEl.offsetHeight || 0) : 0;
      const prevIdx = tabs.findIndex(t => t.id === currentTab);
      const nextIdx = tabs.findIndex(t => t.id === tabId);
      if (tabId !== 'quota') clearHistConfirmOpen = false;
      if (tabId !== 'general') changelogViewOpen = false;
      currentTab = tabId;
      const s = getControlCenterStrings(activeLanguage);
      let activeBtn = null;
      tabBtns.forEach(b => {
        const tKey = b.getAttribute('data-tab');
        if (s.tabs[tKey]) b.textContent = s.tabs[tKey];
        const active = tKey === currentTab;
        if (active) activeBtn = b;
        b.style.color = active ? '#A0A3F6' : '#9DA7C7';
      });
      moveTabPill(activeBtn, animateSlide);
      if (!bodyEl) return;

      if (currentTab === 'general') {
        const h = getHubStrings();
        const subEl = modal.querySelector('#ag-cc-modal-subtitle');
        if (subEl) subEl.textContent = `${s.modalTitle} · v${ENHANCER_CURRENT_VERSION}`;

        if (changelogViewOpen) {
          const renderChangelogCards = (mdText) => {
            const listEl = bodyEl.querySelector('#agy-hub-changelog-list');
            if (!listEl) return;
            const sections = parseChangelogSections(mdText);
            if (sections.length === 0) {
              listEl.innerHTML = `<p style="margin:12px 0;font-size:12px;color:#818BA8;text-align:center;">${escapeHtml(s.changelogEmpty)}</p>`;
              return;
            }
            listEl.innerHTML = sections.map((sec, idx) => {
              const isLatest = idx === 0;
              const badgeHtml = isLatest ? `<span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:9999px;background:rgba(160,163,246,0.18);color:#A0A3F6;margin-left:6px;">LATEST</span>` : '';
              const dateHtml = sec.date ? `<span style="font-size:11px;color:#818BA8;font-variant-numeric:tabular-nums;">${escapeHtml(sec.date)}</span>` : '';
              return `
                <article class="agy-changelog-card" style="flex-shrink:0;background:#0B0B0E;border:1px solid rgba(202,211,245,0.09);border-radius:8px;overflow:hidden;">
                  <button type="button" class="agy-changelog-toggle" data-idx="${idx}" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:transparent;border:none;color:#CAD3F5;cursor:pointer;text-align:left;">
                    <span style="font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;">v${escapeHtml(sec.version)}${badgeHtml}</span>
                    ${dateHtml}
                  </button>
                  <div class="agy-changelog-body" style="display:${isLatest ? 'block' : 'none'};padding:6px 10px 8px;border-top:1px solid rgba(202,211,245,0.06);font-size:11.5px;line-height:1.52;">
                    ${formatReleaseNotesHtml(sec.body)}
                  </div>
                </article>
              `;
            }).join('');
            listEl.querySelectorAll('.agy-changelog-toggle').forEach((btn) => {
              btn.onclick = () => {
                const prevH = bodyEl ? (bodyEl.offsetHeight || 0) : 0;
                const card = btn.parentElement;
                const body = card && card.querySelector('.agy-changelog-body');
                if (body) {
                  body.style.display = body.style.display === 'none' ? 'block' : 'none';
                  animateBodyHeight(prevH);
                }
              };
            });
          };

          bodyEl.innerHTML = `
            <section id="agy-hub-changelog-view" style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
              <header style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(202,211,245,0.08);padding-bottom:8px;">
                <strong style="font-size:13px;font-weight:600;color:#CAD3F5;">${escapeHtml(s.changelogTitle)}</strong>
                <button type="button" id="agy-hub-changelog-back" class="agy-enh-btn" style="height:24px;padding:0 10px;border-radius:6px;background:#181A22;border:1px solid rgba(202,211,245,0.1);color:#CAD3F5;font-size:11px;cursor:pointer;">← ${escapeHtml(s.changelogBack)}</button>
              </header>
              <main id="agy-hub-changelog-list" style="display:flex;flex-direction:column;gap:8px;">
                <p style="margin:12px 0;font-size:12px;color:#818BA8;text-align:center;">${escapeHtml(h.checking)}</p>
              </main>
            </section>
          `;
          const backBtn = bodyEl.querySelector('#agy-hub-changelog-back');
          if (backBtn) backBtn.onclick = () => { changelogViewOpen = false; renderTab('general', false); };
          if (cachedChangelogText !== null) {
            renderChangelogCards(cachedChangelogText);
          } else if (ipc && ipc.invoke) {
            ipc.invoke('enhancer:get-changelog').then((res) => {
              cachedChangelogText = (res && res.ok && typeof res.content === 'string') ? res.content : '';
              if (changelogViewOpen) {
                const prevH = bodyEl ? (bodyEl.offsetHeight || 0) : 0;
                renderChangelogCards(cachedChangelogText);
                animateBodyHeight(prevH);
              }
            }).catch(() => {
              cachedChangelogText = '';
              if (changelogViewOpen) renderChangelogCards('');
            });
          } else {
            renderChangelogCards('');
          }
          animateBodyHeight(prevBodyHeight);
          return;
        }

        if (restoreConfirmOpen) {
          bodyEl.innerHTML = `
            <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:12px;">
              <div style="font-size:13px;font-weight:600;color:#CAD3F5;">${escapeHtml(h.restoreConfirmTitle)}</div>
              <p style="margin:0;font-size:12px;color:#9DA7C7;line-height:1.55;">${escapeHtml(h.restoreConfirmDesc)}</p>
              <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:8px;border-top:1px solid rgba(202,211,245,0.08);">
                <button type="button" id="agy-hub-cancel-restore" class="agy-enh-btn" style="height:28px;padding:0 12px;border-radius:6px;background:#181A22;border:1px solid rgba(202,211,245,0.1);color:#CAD3F5;font-size:12px;font-weight:500;cursor:pointer;">${escapeHtml(h.cancelBtn)}</button>
                <button type="button" id="agy-hub-confirm-restore" class="agy-enh-primary" style="height:28px;padding:0 12px;border-radius:6px;background:#A0A3F6;border:none;color:#0B0B0E;font-size:12px;font-weight:600;cursor:pointer;">${escapeHtml(h.restoreVanilla)}</button>
              </div>
            </div>
          `;
          bodyEl.querySelector('#agy-hub-cancel-restore').onclick = () => { restoreConfirmOpen = false; renderTab('general', false); };
          const confirmBtn = bodyEl.querySelector('#agy-hub-confirm-restore');
          confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = h.restoring;
            if (ipc && ipc.invoke) await ipc.invoke('enhancer:restore-vanilla');
          };
          return;
        }

        const curInfo = LANG_DISPLAY_NAMES[activeLanguage] || { native: activeLanguage, en: activeLanguage };
        const curLabel = activeLanguage === 'en' ? 'English (English)' : `${curInfo.native} (${curInfo.en})`;
        const langMenuItems = LANG_ORDER.map(l => {
          const info = LANG_DISPLAY_NAMES[l] || { native: l, en: l };
          const labelText = (l === 'en') ? 'English (English)' : `${info.native} (${info.en})`;
          const isSel = activeLanguage === l;
          return `<div class="agy-overlay-item" data-cc-lang="${l}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:6px;font-size:12px;cursor:pointer;color:${isSel ? '#CAD3F5' : '#9DA7C7'};font-weight:${isSel ? '600' : '400'};"><span>${escapeHtml(labelText)}</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A0A3F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:${isSel ? 'block' : 'none'};"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
        }).join('');
        bodyEl.innerHTML = `
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:12px;overflow:visible;">
            <div>
              <div style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(s.ifaceLang)}</div>
              <div style="font-size:11px;color:#818BA8;margin-top:2px;">${escapeHtml(s.ifaceDesc)}</div>
            </div>
            <div style="position:relative;flex-shrink:0;">
              <button type="button" id="ag-cc-lang-trigger" class="agy-enh-btn" style="background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:8px;min-width:168px;justify-content:space-between;">
                <span id="ag-cc-lang-label" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(curLabel)}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7;flex-shrink:0;"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div id="ag-cc-lang-menu" class="agy-overlay" style="display:none;position:absolute;right:0;top:calc(100% + 4px);z-index:100010;background:#111217;border:1px solid rgba(202,211,245,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.48);border-radius:10px;padding:4px;min-width:190px;max-height:220px;overflow-y:auto;flex-direction:column;gap:2px;">${langMenuItems}</div>
            </div>
          </div>
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <strong style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(h.updateSection)} <small style="font-size:11px;font-weight:400;color:#818BA8;font-variant-numeric:tabular-nums;">v${ENHANCER_CURRENT_VERSION}</small></strong>
              <button id="agy-hub-check-btn" type="button" class="agy-enh-btn" style="height:24px;padding:0 10px;border-radius:6px;background:rgba(160,163,246,0.14);border:1px solid rgba(160,163,246,0.32);color:#A0A3F6;font-size:11px;font-weight:500;cursor:pointer;">${escapeHtml(h.checkBtn)}</button>
            </div>
            <p id="agy-hub-update-status" style="margin:0;font-size:12px;color:#9DA7C7;line-height:1.45;"></p>
            <aside id="agy-hub-progress-wrap" style="display:none;">
              <div style="height:4px;border-radius:9999px;background:rgba(202,211,245,0.1);overflow:hidden;">
                <span id="agy-hub-progress-bar" style="display:block;width:0%;height:100%;background:#A0A3F6;border-radius:9999px;"></span>
              </div>
              <p id="agy-hub-progress-text" style="margin:4px 0 0;font-size:11px;color:#818BA8;font-variant-numeric:tabular-nums;"></p>
            </aside>
            <div id="agy-hub-update-actions" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
              <span id="agy-hub-apply-slot" style="display:flex;gap:8px;"></span>
              <span style="display:flex;gap:6px;align-items:center;">
                <button id="agy-hub-changelog-btn" type="button" class="agy-enh-btn" style="height:26px;padding:0 10px;border-radius:6px;background:#181A22;border:1px solid rgba(202,211,245,0.1);color:#CAD3F5;font-size:11px;font-weight:500;cursor:pointer;">${escapeHtml(s.changelogBtn)}</button>
                <button id="agy-hub-vanilla-btn" type="button" class="agy-enh-btn" style="height:26px;padding:0 10px;border-radius:6px;background:#181A22;border:1px solid rgba(202,211,245,0.1);color:#CAD3F5;font-size:11px;font-weight:500;cursor:pointer;">${escapeHtml(h.restoreVanilla)}</button>
              </span>
            </div>
          </div>
        `;
        const trig = bodyEl.querySelector('#ag-cc-lang-trigger');
        const lMenu = bodyEl.querySelector('#ag-cc-lang-menu');
        if (trig && lMenu) {
          trig.onclick = (e) => {
            if (e) e.stopPropagation();
            const open = lMenu.style.display !== 'none';
            if (open) {
              lMenu.style.display = 'none';
            } else {
              lMenu.style.display = 'flex';
              if (canGsapAnimate(lMenu)) window.gsap.fromTo(lMenu, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power1.out' });
            }
          };
          lMenu.querySelectorAll('[data-cc-lang]').forEach(opt => {
            opt.onclick = (e) => {
              if (e) e.stopPropagation();
              const nextL = opt.getAttribute('data-cc-lang');
              lMenu.style.display = 'none';
              if (nextL) setLanguage(nextL);
              renderTab('general', false);
            };
          });
        }

        const updateStatusEl = bodyEl.querySelector('#agy-hub-update-status');
        const applySlotEl = bodyEl.querySelector('#agy-hub-apply-slot');
        const progWrap = bodyEl.querySelector('#agy-hub-progress-wrap');
        const progBar = bodyEl.querySelector('#agy-hub-progress-bar');
        const progText = bodyEl.querySelector('#agy-hub-progress-text');

        const renderUpdateUI = (info) => {
          if (!applySlotEl || !updateStatusEl) return;
          applySlotEl.innerHTML = '';
          if (!info) {
            updateStatusEl.textContent = h.upToDate;
            return;
          }
          if (!info.ok) {
            updateStatusEl.innerHTML = `<span style="color:#E56B6F;">${escapeHtml(info.error || 'Error checking updates')}</span>`;
            return;
          }
          if (!info.hasUpdate) {
            updateStatusEl.innerHTML = `<span style="color:#A0A3F6;font-variant-numeric:tabular-nums;">${escapeHtml(h.upToDate)} (v${escapeHtml(info.currentVersion)})</span>`;
            return;
          }
          const i18nMap = (info && info.releaseNotesI18n && typeof info.releaseNotesI18n === 'object') ? info.releaseNotesI18n : null;
          const localizedNotes = (i18nMap && (i18nMap[activeLanguage] || i18nMap.en)) || info.releaseNotes || '';
          const notesHtml = localizedNotes
            ? `<div id="agy-hub-release-notes" style="margin-top:6px;padding:8px 10px;border-radius:8px;background:#0B0B0E;border:1px solid rgba(202,211,245,0.1);font-size:11px;color:#CAD3F5;max-height:110px;overflow-y:auto;line-height:1.48;">${formatReleaseNotesHtml(localizedNotes)}</div>`
            : '';
          updateStatusEl.innerHTML = `<span style="color:#A0A3F6;font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(h.availPrefix)}v${escapeHtml(info.currentVersion)} → v${escapeHtml(info.remoteVersion)}</span>${notesHtml}`;

          if (info.canApplyInApp) {
            const applyBtn = document.createElement('button');
            applyBtn.type = 'button';
            applyBtn.className = 'agy-enh-primary';
            applyBtn.textContent = h.updateNow;
            applyBtn.style.cssText = 'height:26px;padding:0 12px;border-radius:6px;background:#A0A3F6;border:none;color:#0B0B0E;font-size:11px;font-weight:600;cursor:pointer;';
            applyBtn.onclick = async () => {
              applyBtn.disabled = true;
              applyBtn.textContent = h.updating;
              if (progWrap) progWrap.style.display = 'block';
              const res = ipc && ipc.invoke ? await ipc.invoke('enhancer:apply-update') : null;
              if (res && res.ok) {
                enhancerUpdateInfo = { ...(enhancerUpdateInfo || {}), hasUpdate: false, currentVersion: res.newVersion || ENHANCER_CURRENT_VERSION };
                injectEnhancerUpdatePill();
                scheduleInjectTitleMenuIntegration();
                if (progBar) progBar.style.width = '100%';
                updateStatusEl.innerHTML = `<span style="color:#A0A3F6;font-weight:600;font-variant-numeric:tabular-nums;">v${escapeHtml(res.newVersion)}${escapeHtml(h.updateDoneSuffix)}</span>`;
                applySlotEl.innerHTML = '';
                const relaunchBtn = document.createElement('button');
                relaunchBtn.type = 'button';
                relaunchBtn.className = 'agy-enh-primary';
                relaunchBtn.textContent = h.relaunchNow;
                relaunchBtn.style.cssText = 'height:26px;padding:0 12px;border-radius:6px;background:#A0A3F6;border:none;color:#0B0B0E;font-size:11px;font-weight:600;cursor:pointer;';
                relaunchBtn.onclick = () => ipc && ipc.invoke && ipc.invoke('enhancer:relaunch');
                applySlotEl.appendChild(relaunchBtn);
              } else {
                applyBtn.disabled = false;
                applyBtn.textContent = h.retryBtn;
                updateStatusEl.innerHTML = `<span style="color:#E56B6F;">${escapeHtml((res && res.error) || 'Update failed')}</span>`;
              }
            };
            applySlotEl.appendChild(applyBtn);
          }
        };

        activeProgressHandler = (p) => {
          if (!p || !progWrap) return;
          progWrap.style.display = 'block';
          if (typeof p.percent === 'number' && progBar) progBar.style.width = `${Math.max(0, Math.min(100, p.percent))}%`;
          if (p.message && progText) progText.textContent = p.message;
        };

        const checkBtn = bodyEl.querySelector('#agy-hub-check-btn');
        const runCheck = async () => {
          if (checkBtn) checkBtn.disabled = true;
          if (updateStatusEl) updateStatusEl.textContent = h.checking;
          const info = await checkEnhancerGithubUpdate(true);
          if (checkBtn) checkBtn.disabled = false;
          renderUpdateUI(info);
        };
        if (checkBtn) checkBtn.onclick = runCheck;

        const changelogBtn = bodyEl.querySelector('#agy-hub-changelog-btn');
        if (changelogBtn) changelogBtn.onclick = () => { changelogViewOpen = true; renderTab('general', false); };

        const vanillaBtn = bodyEl.querySelector('#agy-hub-vanilla-btn');
        if (vanillaBtn) vanillaBtn.onclick = () => { restoreConfirmOpen = true; renderTab('general', false); };

        if (enhancerUpdateInfo && !opts.autoCheck) {
          renderUpdateUI(enhancerUpdateInfo);
        } else if (opts.autoCheck && !autoCheckDone) {
          autoCheckDone = true;
          runCheck();
        } else if (updateStatusEl) {
          updateStatusEl.textContent = enhancerUpdateInfo ? '' : h.upToDate;
          if (enhancerUpdateInfo) renderUpdateUI(enhancerUpdateInfo);
        }
      } else if (currentTab === 'translation') {
        const langMap = (userGlossary[activeLanguage] && typeof userGlossary[activeLanguage] === 'object') ? userGlossary[activeLanguage] : {};
        const entries = Object.entries(langMap);
        const rowsHtml = entries.length > 0
          ? entries.map(([src, dst]) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:#181A22;border:1px solid rgba(202,211,245,0.06);border-radius:6px;font-size:12px;"><span style="color:#9DA7C7;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(src)}</span><span style="color:#818BA8;">→</span><span style="color:#CAD3F5;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(dst)}</span><button type="button" data-del="${escapeHtml(src)}" class="ag-cc-del-glossary" style="background:none;border:none;color:#E56B6F;cursor:pointer;font-size:12px;">✕</button></div>`).join('')
          : `<div style="font-size:12px;color:#818BA8;">${escapeHtml(s.noGlossary)}</div>`;
        bodyEl.innerHTML = `
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(s.glossaryTitle)} (${activeLanguage.toUpperCase()})</div>
              <div style="display:flex;gap:6px;">
                <button type="button" id="ag-cc-gl-export" class="agy-enh-btn" style="background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">${escapeHtml(s.exportJson)}</button>
                <button type="button" id="ag-cc-gl-import" class="agy-enh-btn" style="background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">${escapeHtml(s.importJson)}</button>
              </div>
            </div>
            <div id="ag-cc-gl-import-box" style="display:none;flex-direction:column;gap:6px;">
              <textarea id="ag-cc-gl-import-txt" rows="2" placeholder='{"Settings":"설정"}' style="background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:6px 8px;font-size:11px;font-family:monospace;"></textarea>
              <button type="button" id="ag-cc-gl-import-apply" class="agy-enh-primary" style="align-self:flex-end;background:#A0A3F6;color:#0B0B0E;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;">${escapeHtml(s.apply)}</button>
            </div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:6px;align-items:center;">
              <input id="ag-cc-gl-src" placeholder="${escapeHtml(s.srcPh)}" style="width:100%;min-width:0;background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:5px 8px;font-size:12px;box-sizing:border-box;" />
              <input id="ag-cc-gl-dst" placeholder="${escapeHtml(s.dstPh)}" style="width:100%;min-width:0;background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:5px 8px;font-size:12px;box-sizing:border-box;" />
              <button type="button" id="ag-cc-gl-add" class="agy-enh-primary" style="flex-shrink:0;white-space:nowrap;background:#A0A3F6;color:#0B0B0E;border:none;border-radius:6px;padding:0 12px;height:28px;font-size:12px;font-weight:600;cursor:pointer;">${escapeHtml(s.add)}</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;max-height:84px;overflow-y:auto;">${rowsHtml}</div>
          </div>
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(s.collectUt)}</div>
                <div style="font-size:11px;color:#818BA8;margin-top:2px;">${escapeHtml(s.collectUtDesc)}</div>
              </div>
              ${renderNativeSwitch('ag-cc-ut-toggle', userPreferences.collectUntranslated)}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(202,211,245,0.06);padding-top:8px;">
              <span style="font-size:12px;color:#9DA7C7;">${escapeHtml(s.utList)} (<b id="ag-cc-ut-count" style="color:#CAD3F5;">0</b>)</span>
              <div style="display:flex;gap:6px;">
                <button type="button" id="ag-cc-ut-copy" class="agy-enh-btn" style="background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">${escapeHtml(s.copy)}</button>
                <button type="button" id="ag-cc-ut-clear" class="agy-enh-btn" style="background:#181A22;color:#E56B6F;border:1px solid rgba(229,107,111,0.28);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">${escapeHtml(s.clear)}</button>
              </div>
            </div>
            <div id="ag-cc-ut-list" style="max-height:64px;overflow-y:auto;font-size:11px;color:#818BA8;">${escapeHtml(s.emptyUt)}</div>
          </div>
        `;
        const addBtn = bodyEl.querySelector('#ag-cc-gl-add');
        if (addBtn) {
          addBtn.onclick = async () => {
            const srcVal = (bodyEl.querySelector('#ag-cc-gl-src').value || '').trim();
            const dstVal = (bodyEl.querySelector('#ag-cc-gl-dst').value || '').trim();
            if (!srcVal || !dstVal) return;
            if (!userGlossary[activeLanguage]) userGlossary[activeLanguage] = {};
            userGlossary[activeLanguage][srcVal] = dstVal;
            if (ipc && ipc.invoke) await ipc.invoke('enhancer:save-glossary', userGlossary).catch(() => {});
            if (document.body && activeLanguage !== 'en') { revertToOriginal(document.body); translateNode(document.body); }
            renderTab('translation', false);
          };
        }
        const expBtn = bodyEl.querySelector('#ag-cc-gl-export');
        if (expBtn) {
          expBtn.onclick = () => {
            const json = JSON.stringify(userGlossary[activeLanguage] || {}, null, 2);
            try { if (navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json); } catch (_) {}
            showToast(s.copied);
          };
        }
        const impBtn = bodyEl.querySelector('#ag-cc-gl-import');
        const impBox = bodyEl.querySelector('#ag-cc-gl-import-box');
        if (impBtn && impBox) {
          impBtn.onclick = () => { impBox.style.display = impBox.style.display === 'none' ? 'flex' : 'none'; };
        }
        const impApply = bodyEl.querySelector('#ag-cc-gl-import-apply');
        if (impApply) {
          impApply.onclick = async () => {
            try {
              const parsed = JSON.parse(bodyEl.querySelector('#ag-cc-gl-import-txt').value || '{}');
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                userGlossary[activeLanguage] = { ...(userGlossary[activeLanguage] || {}), ...parsed };
                if (ipc && ipc.invoke) await ipc.invoke('enhancer:save-glossary', userGlossary).catch(() => {});
                if (document.body && activeLanguage !== 'en') { revertToOriginal(document.body); translateNode(document.body); }
                renderTab('translation', false);
              }
            } catch (_) {}
          };
        }
        bodyEl.querySelectorAll('.ag-cc-del-glossary').forEach(btn => {
          btn.onclick = async () => {
            const key = btn.getAttribute('data-del');
            if (userGlossary[activeLanguage] && key) delete userGlossary[activeLanguage][key];
            if (ipc && ipc.invoke) await ipc.invoke('enhancer:save-glossary', userGlossary).catch(() => {});
            if (document.body && activeLanguage !== 'en') { revertToOriginal(document.body); translateNode(document.body); }
            renderTab('translation', false);
          };
        });
        wireNativeSwitch(bodyEl.querySelector('#ag-cc-ut-toggle'), (checked) => persistPreferences({ collectUntranslated: checked }));

        let latestUtItems = [];
        if (ipc && ipc.invoke) {
          ipc.invoke('enhancer:get-untranslated').then((res) => {
            if (!res || !Array.isArray(res.items)) return;
            latestUtItems = res.items;
            const cntEl = bodyEl.querySelector('#ag-cc-ut-count');
            const listEl = bodyEl.querySelector('#ag-cc-ut-list');
            if (cntEl) cntEl.textContent = String(latestUtItems.length);
            if (listEl) {
              listEl.innerHTML = latestUtItems.length > 0
                ? latestUtItems.slice(-25).reverse().map(x => `<div style="padding:2px 0;color:#9DA7C7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">• ${escapeHtml(typeof x === 'string' ? x : x.text)}</div>`).join('')
                : escapeHtml(s.emptyUt);
            }
          }).catch(() => {});
        }
        const utCopy = bodyEl.querySelector('#ag-cc-ut-copy');
        if (utCopy) {
          utCopy.onclick = () => {
            const txt = JSON.stringify(latestUtItems.map(x => (typeof x === 'string' ? x : x.text)), null, 2);
            try { if (navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt); } catch (_) {}
            showToast(s.copied);
          };
        }
        const utClear = bodyEl.querySelector('#ag-cc-ut-clear');
        if (utClear) {
          utClear.onclick = async () => {
            if (ipc && ipc.invoke) await ipc.invoke('enhancer:clear-untranslated').catch(() => {});
            latestUtItems = [];
            const cntEl = bodyEl.querySelector('#ag-cc-ut-count');
            const listEl = bodyEl.querySelector('#ag-cc-ut-list');
            if (cntEl) cntEl.textContent = '0';
            if (listEl) listEl.textContent = s.emptyUt;
          };
        }
      } else if (currentTab === 'quota') {
        const threshVal = userPreferences.quotaLowThreshold || 20;
        const pctFill = Math.round(((threshVal - 5) / 45) * 100);
        bodyEl.innerHTML = `
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(s.sparklines)}</div>
              <div style="font-size:11px;color:#818BA8;margin-top:2px;">${escapeHtml(s.sparkDesc)}</div>
            </div>
            ${renderNativeSwitch('ag-cc-spark-toggle', userPreferences.showSparklines !== false)}
          </div>
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(s.compactCard)}</div>
              <div style="font-size:11px;color:#818BA8;margin-top:2px;">${escapeHtml(s.compactDesc)}</div>
            </div>
            ${renderNativeSwitch('ag-cc-compact-toggle', userPreferences.compactQuotaCard)}
          </div>
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(s.lowAlert)}</div>
                <div style="font-size:11px;color:#818BA8;margin-top:2px;">${escapeHtml(s.lowDesc)}</div>
              </div>
              ${renderNativeSwitch('ag-cc-low-alert', userPreferences.quotaAlertsEnabled)}
            </div>
            <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:#9DA7C7;">
              <span>${escapeHtml(s.threshold)}: <b id="ag-cc-thresh-val" style="color:#CAD3F5;font-variant-numeric:tabular-nums;">${threshVal}%</b></span>
              <input type="range" id="ag-cc-thresh-range" class="ag-cc-range" min="5" max="50" step="5" value="${threshVal}" style="flex:1;background:linear-gradient(90deg, #A0A3F6 ${pctFill}%, rgba(202,211,245,0.14) ${pctFill}%);" />
            </div>
          </div>
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:13px;font-weight:500;color:#CAD3F5;">${escapeHtml(s.resetAlert)}</div>
              <div style="font-size:11px;color:#818BA8;margin-top:2px;">${escapeHtml(s.resetDesc)}</div>
            </div>
            ${renderNativeSwitch('ag-cc-reset-alert', userPreferences.quotaResetAlertsEnabled)}
          </div>
          <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;">
            ${clearHistConfirmOpen ? `
              <span style="font-size:12px;color:#E56B6F;margin-right:auto;">${escapeHtml(s.clearHistConfirm)}</span>
              <button type="button" id="ag-cc-cancel-clear-hist" class="agy-enh-btn" style="background:#181A22;color:#CAD3F5;border:1px solid rgba(202,211,245,0.1);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;">${escapeHtml(s.cancel)}</button>
              <button type="button" id="ag-cc-confirm-clear-hist" class="agy-enh-btn" style="background:#E56B6F;color:#0B0B0E;border:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;">${escapeHtml(s.confirmClear)}</button>
            ` : `
              <button type="button" id="ag-cc-clear-hist" class="agy-enh-btn" style="background:#181A22;color:#E56B6F;border:1px solid rgba(229,107,111,0.28);border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;">${escapeHtml(s.clearHist)}</button>
            `}
          </div>
        `;
        wireNativeSwitch(bodyEl.querySelector('#ag-cc-spark-toggle'), (checked) => persistPreferences({ showSparklines: checked }));
        wireNativeSwitch(bodyEl.querySelector('#ag-cc-compact-toggle'), (checked) => persistPreferences({ compactQuotaCard: checked }));
        wireNativeSwitch(bodyEl.querySelector('#ag-cc-low-alert'), (checked) => persistPreferences({ quotaAlertsEnabled: checked }));
        wireNativeSwitch(bodyEl.querySelector('#ag-cc-reset-alert'), (checked) => persistPreferences({ quotaResetAlertsEnabled: checked }));
        const rng = bodyEl.querySelector('#ag-cc-thresh-range');
        const rngVal = bodyEl.querySelector('#ag-cc-thresh-val');
        if (rng) {
          rng.oninput = () => {
            const v = Number(rng.value) || 20;
            const fill = Math.round(((v - 5) / 45) * 100);
            rng.style.background = `linear-gradient(90deg, #A0A3F6 ${fill}%, rgba(202,211,245,0.14) ${fill}%)`;
            if (rngVal) rngVal.textContent = `${v}%`;
          };
          rng.onchange = () => persistPreferences({ quotaLowThreshold: Number(rng.value) || 20 });
        }
        const clrHist = bodyEl.querySelector('#ag-cc-clear-hist');
        if (clrHist) {
          clrHist.onclick = () => {
            clearHistConfirmOpen = true;
            renderTab('quota', false);
          };
        }
        const cancelClrHist = bodyEl.querySelector('#ag-cc-cancel-clear-hist');
        if (cancelClrHist) {
          cancelClrHist.onclick = () => {
            clearHistConfirmOpen = false;
            renderTab('quota', false);
          };
        }
        const confirmClrHist = bodyEl.querySelector('#ag-cc-confirm-clear-hist');
        if (confirmClrHist) {
          confirmClrHist.onclick = async () => {
            confirmClrHist.disabled = true;
            if (ipc && ipc.invoke) await ipc.invoke('enhancer:clear-quota-history').catch(() => {});
            quotaHistoryState = {};
            clearHistConfirmOpen = false;
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(new CustomEvent('antigravity-quota-history-updated', { detail: { history: {}, preferences: userPreferences } }));
            }
            renderTab('quota', false);
            showToast(s.cleared);
          };
        }
      } else if (currentTab === 'shortcuts') {
        bodyEl.innerHTML = `
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:#CAD3F5;">${escapeHtml(s.cycleKey)}</span>
            <button type="button" id="ag-cc-rec-lang" class="agy-enh-btn" style="background:#181A22;color:#A0A3F6;border:1px solid rgba(160,163,246,0.32);border-radius:6px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer;font-variant-numeric:tabular-nums;">${escapeHtml(userPreferences.shortcutCycleLang)}</button>
          </div>
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:#CAD3F5;">${escapeHtml(s.centerKey)}</span>
            <button type="button" id="ag-cc-rec-center" class="agy-enh-btn" style="background:#181A22;color:#A0A3F6;border:1px solid rgba(160,163,246,0.32);border-radius:6px;padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer;font-variant-numeric:tabular-nums;">${escapeHtml(userPreferences.shortcutOpenCenter)}</button>
          </div>
          <div style="background:#111217;border:1px solid rgba(202,211,245,0.08);border-radius:8px;padding:10px 12px;">
            <div style="font-size:13px;font-weight:500;color:#CAD3F5;margin-bottom:4px;">${escapeHtml(s.diagnostics)}</div>
            <div id="ag-cc-diag-box" style="font-size:11px;color:#818BA8;line-height:1.6;">Enhancer v${ENHANCER_CURRENT_VERSION}</div>
          </div>
        `;
        const bindRecorder = (btnId, prefKey) => {
          const btn = bodyEl.querySelector(btnId);
          if (!btn) return;
          btn.onclick = (e) => {
            if (e) e.stopPropagation();
            cleanupRecorder();
            const prevSpec = userPreferences[prefKey];
            btn.textContent = s.pressKeys;
            const onKey = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (ev.key === 'Escape') {
                cleanupRecorder();
                btn.textContent = prevSpec;
                return;
              }
              const spec = formatShortcutFromEvent(ev);
              if (!spec) return;
              cleanupRecorder();
              persistPreferences({ [prefKey]: spec });
              btn.textContent = spec;
            };
            activeRecorderCleanup = () => window.removeEventListener('keydown', onKey, true);
            window.addEventListener('keydown', onKey, true);
          };
        };
        bindRecorder('#ag-cc-rec-lang', 'shortcutCycleLang');
        bindRecorder('#ag-cc-rec-center', 'shortcutOpenCenter');

        if (ipc && ipc.invoke) {
          ipc.invoke('enhancer:get-status').then((st) => {
            const box = bodyEl.querySelector('#ag-cc-diag-box');
            if (st && box) {
              const ar = st.autoRepatchStatus;
              const arTxt = ar ? `${escapeHtml(ar.status || '')}${ar.ts ? ` (${new Date(ar.ts).toLocaleString()})` : ''}` : 'N/A';
              box.innerHTML = `App: <b style="color:#CAD3F5;">${escapeHtml(st.appVersion || '')}</b> · ASAR Bootstrap: <b style="color:#4CC38A;">${st.asarBootstrapped ? 'Active' : 'Inactive'}</b><br/>${escapeHtml(s.autoRepatch)}: <b style="color:#CAD3F5;">${arTxt}</b><br/>Dir: ${escapeHtml(st.enhancerDir || '')}`;
            }
          }).catch(() => {});
        }
      }

      animateBodyHeight(prevBodyHeight);
      if (animateSlide && prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx && canGsapAnimate(bodyEl)) {
        const dir = nextIdx > prevIdx ? 1 : -1;
        window.gsap.fromTo(bodyEl, { opacity: 0, x: dir * 18 }, { opacity: 1, x: 0, duration: 0.18, ease: 'power2.out' });
      }
    }

    tabBtns.forEach(b => {
      b.onclick = (e) => {
        if (e) e.stopPropagation();
        const nextTab = b.getAttribute('data-tab');
        if (nextTab && nextTab !== currentTab) renderTab(nextTab, true);
      };
    });
    renderTab(currentTab, false);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => moveTabPill(modal.querySelector(`.ag-cc-tab[data-tab="${currentTab}"]`), false));
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      activeModalLangHandler = () => {
        if (document.getElementById('ag-enhancer-control-center-backdrop')) renderTab(currentTab, false);
      };
      window.addEventListener('antigravity-lang-changed', activeModalLangHandler);
    }
  }

  function closeEnhancerHubModal(immediate = false) {
    closeControlCenterModal(immediate);
  }

  async function openEnhancerHubModal(mode = 'update', opts = {}) {
    return openControlCenterModal('general', {
      ...opts,
      restoreConfirm: mode === 'restore'
    });
  }
  // ---------------------------------------------------------------------------
  // 5. Settings Panel & Top-Bar Controls (2.34.0 Compatible)
  // ---------------------------------------------------------------------------
  const QUOTA_SETTING_I18N = {
    en: { title: 'Top-Bar Quota Widget', desc: 'Show real-time model quota and AI usage widget in the top bar.' },
    ko: { title: '상단 사용량 표시기', desc: '상단 바에 실시간 모델 할당량 및 사용 현황 위젯을 표시합니다.' },
    ja: { title: '上部クォータ表示', desc: '上部バーにリアルタイムのモデルクォータと使用状況を表示します。' },
    'zh-CN': { title: '顶部配额指示器', desc: '在顶部栏显示实时模型配额与 AI 使用情况组件。' },
    'zh-TW': { title: '頂部配額指示器', desc: '在頂部列顯示即時模型配額與 AI 使用狀況元件。' },
    es: { title: 'Widget de cuota superior', desc: 'Mostrar la cuota de modelos y el uso de IA en la barra superior.' },
    fr: { title: 'Widget de quota supérieur', desc: 'Afficher le quota de modèles et l’utilisation de l’IA dans la barre supérieure.' },
    de: { title: 'Kontingent-Widget (Leiste)', desc: 'Modellkontingent und KI-Nutzung in Echtzeit in der oberen Leiste anzeigen.' },
    ru: { title: 'Виджет квоты в панели', desc: 'Показывать квоту моделей и использование ИИ в верхней панели.' }
  };

  function getQuotaSettingStrings(lang) {
    return QUOTA_SETTING_I18N[lang || activeLanguage] || QUOTA_SETTING_I18N.en;
  }

  function setLanguage(lang) {
    if (activeLanguage === lang) return;
    activeLanguage = lang;
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (_) {}
    persistPreferences({ language: lang });

    const fontStyle = document.getElementById('antigravity-i18n-style');
    if (fontStyle) {
      fontStyle.textContent = buildI18nFontCss(lang);
      fontStyle.disabled = (lang === 'en');
    }

    const applyDomLang = () => {
      if (document.body) {
        revertToOriginal(document.body);
        if (activeLanguage !== 'en') translateNode(document.body);
      }
      updateLanguageSelectorUI();
    };

    if (lang !== 'en' && !loadedLanguages.has(lang) && ipc && ipc.invoke) {
      ensureLanguageLoaded(lang).then(() => applyDomLang()).catch(() => applyDomLang());
    } else {
      applyDomLang();
    }
  }

  function updateLanguageSelectorUI() {
    const trigger = document.getElementById('antigravity-lang-current-label');
    if (trigger) {
      const info = LANG_DISPLAY_NAMES[activeLanguage];
      trigger.textContent = info ? `${info.native} (${info.en})` : activeLanguage;
    }

    for (const l of LANG_ORDER) {
      const check = document.getElementById(`antigravity-lang-check-${l}`);
      if (check) check.style.display = (activeLanguage === l) ? 'flex' : 'none';
      const opt = document.getElementById(`antigravity-opt-${l}`);
      if (opt) {
        opt.classList.toggle('text-foreground', activeLanguage === l);
        opt.classList.toggle('font-medium', activeLanguage === l);
        opt.classList.toggle('text-secondary-foreground', activeLanguage !== l);
      }
    }

    const quickLabel = document.getElementById('antigravity-quick-lang-label');
    if (quickLabel) quickLabel.textContent = (activeLanguage || 'ko').toUpperCase();
    const quickBtn = document.getElementById('antigravity-quick-lang-btn');
    if (quickBtn) quickBtn.title = `언어 선택 / Select Language (${(activeLanguage || 'ko').toUpperCase()}) - Alt+Shift+L`;

    for (const l of LANG_ORDER) {
      const qCheck = document.getElementById(`antigravity-quick-lang-check-${l}`);
      if (qCheck) qCheck.style.display = (activeLanguage === l) ? 'flex' : 'none';
      const qOpt = document.getElementById(`antigravity-quick-opt-${l}`);
      if (qOpt) {
        qOpt.classList.toggle('text-foreground', activeLanguage === l);
        qOpt.classList.toggle('font-medium', activeLanguage === l);
        qOpt.classList.toggle('text-secondary-foreground', activeLanguage !== l);
      }
    }

    const secTitle = document.getElementById('antigravity-lang-sec-title');
    const itemTitle = document.getElementById('antigravity-lang-item-title');
    const itemDesc = document.getElementById('antigravity-lang-item-desc');
    if (secTitle) secTitle.textContent = (activeLanguage === 'ko') ? '언어 설정' : (safeDictGet(translations[activeLanguage], 'Language') || 'Language');
    if (itemTitle) itemTitle.textContent = (activeLanguage === 'ko') ? '인터페이스 언어' : (safeDictGet(translations[activeLanguage], 'Interface Language') || 'Interface Language');
    if (itemDesc) itemDesc.textContent = (activeLanguage === 'ko') ? '표시할 언어를 선택합니다. (재시작 없이 즉시 변경)' : (safeDictGet(translations[activeLanguage], 'Select display language. (Zero restart)') || 'Select display language. (Zero restart)');

    const qSet = getQuotaSettingStrings(activeLanguage);
    const quotaTitle = document.getElementById('antigravity-quota-item-title');
    const quotaDesc = document.getElementById('antigravity-quota-item-desc');
    if (quotaTitle) quotaTitle.textContent = qSet.title;
    if (quotaDesc) quotaDesc.textContent = qSet.desc;

    const h = getHubStrings();
    const settingsVerSub = document.getElementById('antigravity-settings-hub-subtitle');
    if (settingsVerSub) settingsVerSub.textContent = `${h.patchVersionPrefix} ${ENHANCER_CURRENT_VERSION}`;
    const settingsCheckBtn = document.getElementById('antigravity-settings-open-hub');
    if (settingsCheckBtn) settingsCheckBtn.textContent = getControlCenterStrings(activeLanguage).modalTitle;
    scheduleInjectTitleMenuIntegration();

    window.dispatchEvent(new CustomEvent('antigravity-lang-changed', { detail: { lang: activeLanguage } }));
  }

  function findHeaderActionsContainer() {
    const menuBar = document.querySelector('[data-testid="title-menu-bar"]');
    if (menuBar) return { container: menuBar, before: null, isMenuBar: true };

    const moreActions = document.querySelector('[data-testid="titlebar-more-actions"]');
    if (moreActions && moreActions.parentElement) return { container: moreActions.parentElement, before: moreActions, isMenuBar: false };

    const conciergeActions = document.querySelector('[data-testid="concierge-titlebar-more-actions"]');
    if (conciergeActions && conciergeActions.parentElement) return { container: conciergeActions.parentElement, before: conciergeActions, isMenuBar: false };

    const headerRow = document.querySelector('div.flex.w-full.min-w-0.select-none.items-center.justify-between');
    if (headerRow) {
      const rightEnd = headerRow.querySelector('div.flex.items-center.justify-end');
      if (rightEnd) {
        const innerActions = rightEnd.querySelector('div.flex.items-center.gap-1') || rightEnd;
        return { container: innerActions, before: innerActions.firstChild, isMenuBar: false };
      }
    }

    const auxToggle = document.querySelector('[data-testid="toggle-aux-sidebar"], [data-testid="mobile-toggle-aux-sidebar"]');
    if (auxToggle && auxToggle.parentElement) return { container: auxToggle.parentElement, before: auxToggle, isMenuBar: false };

    return null;
  }

  let injectScheduled = false;
  function scheduleInjectLanguageSetting() {
    if (injectScheduled) return;
    injectScheduled = true;
    (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : setTimeout)(() => {
      injectScheduled = false;
      injectLanguageSettingSection();
    });
  }

  function injectLanguageSettingSection() {
    if (document.getElementById('antigravity-language-section')) return;
    const cards = document.querySelectorAll('div.agy-card, div.border.border-border.rounded-xl, div[class*="rounded-xl"][class*="border"]');
    if (!cards || cards.length === 0) return;

    let targetCard = null;
    for (const card of cards) {
      if (!card.querySelector('button.agy-select-trigger, [role="switch"]')) continue;
      if (card.closest('aside, nav, header, [data-testid*="chat"], [data-testid*="message"]')) continue;
      const rect = card.getBoundingClientRect ? card.getBoundingClientRect() : { width: 500 };
      if (rect.width > 0 && rect.width < 320) continue;
      const text = card.textContent || '';
      if (text.includes('Terminal Placement') || text.includes('터미널 배치') ||
          text.includes('Markdown Artifact Width') || text.includes('마크다운 아티팩트 너비') ||
          text.includes('Theme') || text.includes('테마') ||
          text.includes('Conversation Steps') || text.includes('대화 단계') ||
          text.includes('Enter to Send') || text.includes('Enter 키로 전송') ||
          text.includes('Review Policy') || text.includes('검토 정책') ||
          text.includes('Default Workspace') || text.includes('기본 워크스페이스') ||
          card.classList.contains('agy-card')) {
        targetCard = card;
        break;
      }
    }
    if (!targetCard) return;

    const targetSection = targetCard.closest('.space-y-2') || targetCard;
    const parentContainer = targetSection.parentElement;
    if (!parentContainer) return;

    const currentLang = activeLanguage;
    const isQuotaOn = (function () { try { return localStorage.getItem('antigravity_show_quota_widget') !== 'false'; } catch (_) { return true; } })();
    const h = getHubStrings();

    const section = document.createElement('div');
    section.id = 'antigravity-language-section';
    section.className = 'space-y-2 mb-6 w-full';
    section.style.cssText = 'width: 100%; min-width: 320px; box-sizing: border-box;';

    const langItemsHtml = LANG_ORDER.map(l => {
      const info = LANG_DISPLAY_NAMES[l] || { native: l, en: l };
      const labelText = (l === 'en') ? 'English (English)' : `${info.native} (${info.en})`;
      const selCls = (currentLang === l) ? 'text-foreground font-medium' : 'text-secondary-foreground';
      return `<div class="agy-overlay-item w-full text-left whitespace-nowrap transition-colors duration-150 select-none rounded-md flex items-center justify-between gap-1.5 px-2 py-1 text-[13px] outline-none no-focus-ring cursor-pointer hover:bg-secondary hover:text-foreground ${selCls}" id="antigravity-opt-${l}"><span class="truncate">${labelText}</span><svg id="antigravity-lang-check-${l}" class="w-3.5 h-3.5 shrink-0 text-foreground ml-auto pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:${currentLang === l ? 'flex' : 'none'};" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
    }).join('');

    section.innerHTML = `
      <div class="flex flex-col gap-1"><div class="flex items-center justify-between"><span class="text-sm font-medium text-foreground" id="antigravity-lang-sec-title" style="word-break:keep-all;">${currentLang === 'ko' ? '언어 설정' : (safeDictGet(translations[currentLang], 'Language') || 'Language')}</span></div></div>
      <div class="agy-card bg-transparent rounded-xl border border-border divide-y divide-border overflow-visible w-full" style="overflow:visible !important;width:100%;">
        <div class="py-2 px-3 w-full bg-transparent flex justify-between gap-4 items-center overflow-visible" style="overflow:visible !important;display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div class="flex-1 min-w-0 flex flex-col gap-0.5" style="flex:1 1 0%;min-width:180px;word-break:keep-all;">
            <span class="text-sm font-normal text-foreground" id="antigravity-lang-item-title">${currentLang === 'ko' ? '인터페이스 언어' : (safeDictGet(translations[currentLang], 'Interface Language') || 'Interface Language')}</span>
            <div class="text-xs text-secondary-foreground" id="antigravity-lang-item-desc" style="line-height:1.4;">${currentLang === 'ko' ? '표시할 언어를 선택합니다. (재시작 없이 즉시 변경)' : (safeDictGet(translations[currentLang], 'Select display language. (Zero restart)') || 'Select display language. (Zero restart)')}</div>
          </div>
          <div class="relative inline-block shrink-0 overflow-visible" id="antigravity-lang-dropdown-wrapper" style="position:relative;flex-shrink:0;overflow:visible !important;">
            <button type="button" id="antigravity-lang-trigger" class="agy-select-trigger capitalize appearance-none px-2 py-1 text-sm bg-secondary text-secondary-foreground hover:text-foreground rounded-md border-none cursor-pointer flex items-center gap-1 justify-between min-w-[120px] outline-none transition-colors">
              <span class="truncate" id="antigravity-lang-current-label">${LANG_DISPLAY_NAMES[currentLang] ? `${LANG_DISPLAY_NAMES[currentLang].native} (${LANG_DISPLAY_NAMES[currentLang].en})` : currentLang}</span>
              <svg id="antigravity-lang-chevron" class="w-3.5 h-3.5 shrink-0 opacity-70 ml-auto pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="antigravity-lang-dropdown-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);z-index:6000;background:#111217;border:1px solid rgba(202,211,245,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.42);border-radius:10px;padding:4px;gap:2px;min-width:176px;" class="agy-overlay text-foreground no-focus-ring flex flex-col">${langItemsHtml}</div>
          </div>
        </div>
        <div id="antigravity-quota-setting-row" class="py-2 px-3 w-full bg-transparent flex justify-between gap-4 items-center" style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div class="flex-1 min-w-0 flex flex-col gap-0.5" style="flex:1 1 0%;min-width:180px;">
            <span class="text-sm font-normal text-foreground" id="antigravity-quota-item-title">${getQuotaSettingStrings(currentLang).title}</span>
            <div class="text-xs text-secondary-foreground" id="antigravity-quota-item-desc" style="line-height:1.4;">${getQuotaSettingStrings(currentLang).desc}</div>
          </div>
          <button type="button" role="switch" id="antigravity-quota-toggle" aria-checked="${isQuotaOn}" style="position:relative;display:inline-flex;height:20px;width:36px;flex-shrink:0;cursor:pointer;border-radius:9999px;border:2px solid transparent;transition:background-color 150ms cubic-bezier(0.22, 1, 0.36, 1);outline:none;background-color:${isQuotaOn ? '#A0A3F6' : 'rgba(202,211,245,0.2)'};">
            <span id="antigravity-quota-toggle-thumb" style="pointer-events:none;display:inline-block;height:16px;width:16px;border-radius:9999px;background-color:#CAD3F5;box-shadow:0 1px 2px rgba(0,0,0,0.3);transition:transform 150ms cubic-bezier(0.22, 1, 0.36, 1);transform:translateX(${isQuotaOn ? '16px' : '0px'});"></span>
          </button>
        </div>
        <div class="py-2 px-3 w-full bg-transparent flex justify-between gap-4 items-center notranslate" translate="no" style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div class="flex-1 min-w-0 flex flex-col gap-0.5" style="flex:1 1 0%;min-width:180px;">
            <span class="text-sm font-normal text-foreground">Antigravity<span style="color:#A0A3F6;font-weight:600;margin-left:0;">Enhanced</span></span>
            <div class="text-xs text-secondary-foreground" id="antigravity-settings-hub-subtitle" style="line-height:1.4;font-variant-numeric:tabular-nums;">${h.patchVersionPrefix} ${ENHANCER_CURRENT_VERSION}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <button type="button" id="antigravity-settings-open-hub" class="px-2.5 py-1 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:text-foreground cursor-pointer border-none transition-colors">${escapeHtml(getControlCenterStrings(currentLang).modalTitle)}</button>
          </div>
        </div>
      </div>
    `;

    const trigger = section.querySelector('#antigravity-lang-trigger');
    const menu = section.querySelector('#antigravity-lang-dropdown-menu');
    if (trigger && menu) {
      trigger.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = (menu.style.display !== 'none') ? 'none' : 'flex';
      };
    }
    for (const l of LANG_ORDER) {
      const opt = section.querySelector(`#antigravity-opt-${l}`);
      if (opt && menu) {
        opt.onclick = (e) => { e.stopPropagation(); menu.style.display = 'none'; setLanguage(l); };
      }
    }
    const quotaToggle = section.querySelector('#antigravity-quota-toggle');
    const quotaThumb = section.querySelector('#antigravity-quota-toggle-thumb');
    if (quotaToggle) {
      const toggleVis = () => {
        const isVisible = quotaToggle.getAttribute('aria-checked') !== 'true';
        quotaToggle.setAttribute('aria-checked', String(isVisible));
        quotaToggle.style.backgroundColor = isVisible ? '#A0A3F6' : 'rgba(202,211,245,0.22)';
        if (quotaThumb) quotaThumb.style.transform = isVisible ? 'translateX(16px)' : 'translateX(0px)';
        try { localStorage.setItem('antigravity_show_quota_widget', String(isVisible)); } catch (_) {}
        const widget = document.getElementById('antigravity-quota-widget');
        if (widget) widget.style.display = isVisible ? 'inline-flex' : 'none';
        if (!isVisible) { const pop = document.getElementById('antigravity-quota-popover'); if (pop) pop.remove(); }
        window.dispatchEvent(new CustomEvent('antigravity-quota-visibility-changed', { detail: { visible: isVisible } }));
      };
      quotaToggle.onclick = (e) => { e.stopPropagation(); toggleVis(); };
    }
    const settingsHubBtn = section.querySelector('#antigravity-settings-open-hub');
    if (settingsHubBtn) settingsHubBtn.onclick = (e) => { e.stopPropagation(); openControlCenterModal('general'); };

    parentContainer.insertBefore(section, targetSection);
    updateLanguageSelectorUI();
  }

  let quickLangInjectScheduled = false;
  function scheduleInjectQuickLanguageButton() {
    if (quickLangInjectScheduled) return;
    quickLangInjectScheduled = true;
    (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : setTimeout)(() => {
      quickLangInjectScheduled = false;
      injectQuickLanguageButton();
    });
  }

  function toggleQuickLangMenu(anchorEl) {
    const existing = document.getElementById('antigravity-quick-lang-menu');
    if (existing) {
      if (window.gsap) {
        window.gsap.to(existing, { opacity: 0, duration: 0.1, ease: 'power1.in', onComplete: () => existing.remove() });
      } else {
        existing.remove();
      }
      return;
    }

    const rect = anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : { bottom: 32, right: 160 };
    const topPx = Math.max(30, (rect.bottom || 30) + 6);
    const rightPx = Math.max(12, (window.innerWidth || 1200) - (rect.right || 1040));

    const menu = document.createElement('div');
    menu.id = 'antigravity-quick-lang-menu';
    menu.className = 'agy-overlay border rounded-xl no-focus-ring flex flex-col shadow-lg min-w-[175px] p-1 gap-px notranslate';
    menu.setAttribute('translate', 'no');
    menu.style.cssText = `position:fixed;top:${topPx}px;right:${rightPx}px;min-width:176px;padding:4px;gap:2px;display:flex;flex-direction:column;border-radius:10px;background:#111217;border:1px solid rgba(202,211,245,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.42);color:#CAD3F5;font-family:${getUiFontFamily(activeLanguage)};z-index:99999;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;`;

    menu.innerHTML = LANG_ORDER.map(l => {
      const info = LANG_DISPLAY_NAMES[l] || { native: l, en: l };
      const isSelected = (activeLanguage === l);
      const labelText = (l === 'en') ? 'English (English)' : `${info.native} (${info.en})`;
      return `<div id="antigravity-quick-opt-${l}" data-lang="${l}" class="agy-overlay-item w-full text-left whitespace-nowrap transition-colors duration-150 select-none rounded-md flex items-center justify-between gap-2 px-2 py-1 text-[13px] outline-none no-focus-ring cursor-pointer" style="color:${isSelected ? '#A0A3F6' : '#CAD3F5'};font-weight:${isSelected ? '600' : '400'};"><span class="truncate">${labelText}</span><svg id="antigravity-quick-lang-check-${l}" class="w-3.5 h-3.5 shrink-0 ml-auto pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A0A3F6" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:${isSelected ? 'flex' : 'none'};flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
    }).join('');

    for (const l of LANG_ORDER) {
      const opt = menu.querySelector(`#antigravity-quick-opt-${l}`);
      if (opt) {
        opt.onclick = (ev) => {
          ev.stopPropagation();
          menu.remove();
          setLanguage(l);
        };
      }
    }
    (document.body || document.documentElement).appendChild(menu);

    if (window.gsap) {
      window.gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'power1.out' });
    }
  }

  function closeNativeTitleMenu() {
    try {
      const EscEvt = (typeof KeyboardEvent === 'function')
        ? new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true })
        : { type: 'keydown', key: 'Escape', bubbles: true, defaultPrevented: false, preventDefault() {} };
      if (typeof document !== 'undefined' && document.dispatchEvent) document.dispatchEvent(EscEvt);
    } catch (_) {}
    try {
      if (typeof document !== 'undefined' && document.body && document.body.dispatchEvent && typeof MouseEvent === 'function') {
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      }
    } catch (_) {}
  }

  function createNativeMenuRow(id, label, interactive, badgeText) {
    const wrapper = document.createElement('div');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.setAttribute('data-testid', 'title-menu-bar-option');
    btn.setAttribute('data-enhancer-injected', 'true');
    if (interactive) {
      btn.className = 'w-full px-3 py-1.5 text-left transition-colors flex justify-between items-center duration-100 select-none outline-none cursor-default hover:bg-secondary';
    } else {
      btn.setAttribute('tabindex', '-1');
      btn.className = 'w-full px-3 py-1.5 text-left transition-colors flex justify-between items-center duration-100 select-none outline-none cursor-default pointer-events-none';
    }
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    btn.appendChild(labelSpan);
    if (badgeText) {
      const badge = document.createElement('span');
      badge.className = 'antigravity-menu-badge';
      badge.style.cssText = 'color:#A0A3F6;font-size:11px;font-weight:600;margin-left:8px;font-variant-numeric:tabular-nums;';
      badge.textContent = badgeText;
      btn.appendChild(badge);
    }
    wrapper.appendChild(btn);
    return { wrapper, btn };
  }

  function injectEnhancerUpdatePill() {
    if (typeof document === 'undefined' || payload.disabled) return;
    const existing = document.getElementById('antigravity-enhancer-update-btn');
    const hasUpdate = Boolean(enhancerUpdateInfo && enhancerUpdateInfo.hasUpdate && enhancerUpdateInfo.remoteVersion);
    if (!hasUpdate) {
      if (existing) existing.remove();
      return;
    }

    const target = findHeaderActionsContainer();
    if (!target || !target.container) return;

    const h = getHubStrings();
    let pill = existing;
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'antigravity-enhancer-update-btn';
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      pill.setAttribute('translate', 'no');
      pill.className = 'flex items-center whitespace-nowrap cursor-pointer text-[11px] font-medium h-6 pl-2 pr-2 rounded-md select-none notranslate';
      pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:6px;background:#A0A3F6;color:#0B0B0E;font-size:11px;font-weight:600;line-height:1;white-space:nowrap;flex-shrink:0;cursor:pointer;app-region:no-drag;-webkit-app-region:no-drag;margin-right:4px;z-index:101;transition:opacity 150ms cubic-bezier(0.22, 1, 0.36, 1);';
      pill.innerHTML = `<span id="antigravity-enhancer-update-label">${h.updateAvailablePill}</span><span class="flex items-center" style="display:inline-flex;align-items:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>`;
      pill.onmouseenter = () => { pill.style.opacity = '0.9'; };
      pill.onmouseleave = () => { pill.style.opacity = '1'; };
      pill.onclick = (e) => {
        if (e) {
          if (e.stopPropagation) e.stopPropagation();
          if (e.preventDefault) e.preventDefault();
        }
        openEnhancerHubModal('update', { forceOpen: true, autoCheck: true });
      };
      pill.onkeydown = (e) => {
        if (e && (e.key === 'Enter' || e.key === ' ')) {
          if (e.preventDefault) e.preventDefault();
          openEnhancerHubModal('update', { forceOpen: true, autoCheck: true });
        }
      };
    } else {
      const lbl = pill.querySelector('#antigravity-enhancer-update-label');
      if (lbl && lbl.textContent !== h.updateAvailablePill) lbl.textContent = h.updateAvailablePill;
    }
    pill.title = `AntigravityEnhanced v${enhancerUpdateInfo.remoteVersion}`;

    const quickLangBtn = document.getElementById('antigravity-quick-lang-btn');
    const quotaWidget = document.getElementById('antigravity-quota-widget');
    const beforeEl = (quickLangBtn && quickLangBtn.parentElement === target.container)
      ? quickLangBtn
      : ((quotaWidget && quotaWidget.parentElement === target.container) ? quotaWidget : target.before);
    if (pill.parentElement !== target.container) {
      if (beforeEl && beforeEl.parentElement === target.container) {
        target.container.insertBefore(pill, beforeEl);
      } else {
        target.container.appendChild(pill);
      }
    }
  }

  function injectTitleMenuIntegration() {
    if (typeof document === 'undefined' || payload.disabled) return;
    const oldHubBtn = document.getElementById('antigravity-enhancer-hub-btn');
    if (oldHubBtn) oldHubBtn.remove();
    injectEnhancerUpdatePill();

    const menuBar = document.querySelector('[data-testid="title-menu-bar"]');
    const items = menuBar
      ? menuBar.querySelectorAll('[data-testid="title-menu-bar-item"]')
      : document.querySelectorAll('[data-testid="title-menu-bar-item"]');
    if (!items || items.length === 0) return;

    let agyMenuBtn = null;
    for (const item of items) {
      const txt = (item.textContent || '').trim();
      if (txt === 'Antigravity' || txt.startsWith('Antigravity')) {
        agyMenuBtn = item;
        break;
      }
    }
    if (!agyMenuBtn) return;

    if (!agyMenuBtn.querySelector('#antigravity-enhanced-tag')) {
      const tag = document.createElement('span');
      tag.id = 'antigravity-enhanced-tag';
      tag.className = 'notranslate';
      tag.setAttribute('translate', 'no');
      tag.style.cssText = 'color:#A0A3F6;font-weight:600;margin-left:0;';
      tag.style.color = '#A0A3F6';
      tag.textContent = 'Enhanced';
      agyMenuBtn.appendChild(tag);
    }

    const menuWrapper = agyMenuBtn.parentElement;
    if (!menuWrapper) return;
    const allOpts = menuWrapper.querySelectorAll('[data-testid="title-menu-bar-option"]');
    let firstNativeOpt = null;
    for (const opt of allOpts) {
      if (opt.getAttribute('data-enhancer-injected') !== 'true') {
        firstNativeOpt = opt;
        break;
      }
    }
    if (!firstNativeOpt) return;

    const dropdown =
      (firstNativeOpt.closest && (firstNativeOpt.closest('[data-browser-occluder="true"]') || firstNativeOpt.closest('div.absolute'))) ||
      (firstNativeOpt.parentElement && firstNativeOpt.parentElement.parentElement);
    if (!dropdown) return;

    const h = getHubStrings();
    const hasUpdate = Boolean(enhancerUpdateInfo && enhancerUpdateInfo.hasUpdate && enhancerUpdateInfo.remoteVersion);
    const updateBadge = hasUpdate ? `v${enhancerUpdateInfo.remoteVersion}` : '';
    const versionText = `${h.patchVersionPrefix} ${ENHANCER_CURRENT_VERSION}`;

    let section = dropdown.querySelector('#antigravity-enhancer-menu-section');
    const ccMenuLabel = getControlCenterStrings(activeLanguage).menuItem;
    if (section) {
      const verSpan = section.querySelector('#antigravity-menu-patch-version span');
      if (verSpan && verSpan.textContent !== versionText) verSpan.textContent = versionText;
      const ccSpan = section.querySelector('#antigravity-menu-control-center span');
      if (ccSpan && ccSpan.textContent !== ccMenuLabel) ccSpan.textContent = ccMenuLabel;
      return;
    }

    section = document.createElement('div');
    section.id = 'antigravity-enhancer-menu-section';
    section.className = 'notranslate';
    section.setAttribute('translate', 'no');

    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:rgba(202,211,245,0.08);margin:4px 0;';
    section.appendChild(sep);

    const verRow = createNativeMenuRow('antigravity-menu-patch-version', versionText, false, updateBadge);
    const controlRow = createNativeMenuRow('antigravity-menu-control-center', ccMenuLabel, true, '');

    controlRow.btn.onclick = (e) => {
      if (e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
      }
      closeNativeTitleMenu();
      openControlCenterModal('general', { forceOpen: true });
    };

    section.appendChild(verRow.wrapper);
    section.appendChild(controlRow.wrapper);
    dropdown.appendChild(section);
  }

  let titleMenuInjectScheduled = false;
  function scheduleInjectTitleMenuIntegration() {
    if (titleMenuInjectScheduled) return;
    titleMenuInjectScheduled = true;
    (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : setTimeout)(() => {
      titleMenuInjectScheduled = false;
      injectTitleMenuIntegration();
    });
  }

  function injectQuickLanguageButton() {
    const target = findHeaderActionsContainer();
    if (!target || !target.container) return;

    let quickLangBtn = document.getElementById('antigravity-quick-lang-btn');
    if (!quickLangBtn) {
      quickLangBtn = document.createElement('button');
      quickLangBtn.id = 'antigravity-quick-lang-btn';
      quickLangBtn.type = 'button';
      quickLangBtn.setAttribute('aria-label', 'Quick switch language');
      const langCode = (activeLanguage || 'ko').toUpperCase();
      quickLangBtn.title = `언어 선택 / Select Language (${langCode}) - Alt+Shift+L`;
      quickLangBtn.style.cssText = `display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;padding:0 8px;border-radius:6px;font-size:11px;font-weight:500;font-family:${getUiFontFamily(activeLanguage)};line-height:1;background:#0B0B0E;border:1px solid rgba(202,211,245,0.12);color:#CAD3F5;cursor:pointer;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;outline:none;transition:background-color 150ms cubic-bezier(0.22, 1, 0.36, 1),border-color 150ms cubic-bezier(0.22, 1, 0.36, 1);margin-right:4px;white-space:nowrap;flex-shrink:0;z-index:101;`;
      quickLangBtn.innerHTML = `<svg class="shrink-0 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="color:#9DA7C7;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span id="antigravity-quick-lang-label" class="pointer-events-none" style="font-weight:600;font-size:11px;line-height:1;">${langCode}</span><svg class="shrink-0 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="color:#818BA8;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
      quickLangBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); toggleQuickLangMenu(quickLangBtn); };
    } else {
      const lbl = quickLangBtn.querySelector('#antigravity-quick-lang-label');
      if (lbl && lbl.textContent !== (activeLanguage || 'ko').toUpperCase()) {
        lbl.textContent = (activeLanguage || 'ko').toUpperCase();
      }
    }

    const quotaWidget = document.getElementById('antigravity-quota-widget');
    const beforeEl = (quotaWidget && quotaWidget.parentElement === target.container) ? quotaWidget : target.before;
    if (quickLangBtn.parentElement !== target.container) {
      if (beforeEl && beforeEl.parentElement === target.container) {
        target.container.insertBefore(quickLangBtn, beforeEl);
      } else {
        target.container.appendChild(quickLangBtn);
      }
    }
    scheduleInjectTitleMenuIntegration();
  }

  // Shortcuts & Outside Clicks
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const menu = document.getElementById('antigravity-lang-dropdown-menu');
        if (menu && menu.style.display !== 'none') menu.style.display = 'none';
        const quickMenu = document.getElementById('antigravity-quick-lang-menu');
        if (quickMenu) quickMenu.remove();
        closeEnhancerHubModal();
        closeControlCenterModal();
      }
      if (matchesShortcut(e, userPreferences.shortcutCycleLang)) {
        if (e.preventDefault) e.preventDefault();
        if (isImeComposing || e.isComposing || isInputOrEditable(e.target)) return;
        const nextIdx = (LANG_ORDER.indexOf(activeLanguage) + 1) % LANG_ORDER.length;
        setLanguage(LANG_ORDER[nextIdx]);
      }
      if (matchesShortcut(e, userPreferences.shortcutOpenCenter)) {
        if (e.preventDefault) e.preventDefault();
        openControlCenterModal('general');
      }
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('antigravity-lang-dropdown-wrapper');
      const menu = document.getElementById('antigravity-lang-dropdown-menu');
      if (menu && menu.style.display !== 'none' && (!wrapper || !wrapper.contains(e.target))) {
        menu.style.display = 'none';
      }
      const quickMenu = document.getElementById('antigravity-quick-lang-menu');
      const quickBtn = document.getElementById('antigravity-quick-lang-btn');
      if (quickMenu && (!quickMenu.contains(e.target)) && (!quickBtn || !quickBtn.contains(e.target))) {
        quickMenu.remove();
      }
      try {
        if (e.target && e.target.closest && e.target.closest('[data-testid="title-menu-bar-item"]')) {
          setTimeout(injectTitleMenuIntegration, 0);
          scheduleInjectTitleMenuIntegration();
        }
      } catch (_) {}
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Reduced Motion Setup
  // ---------------------------------------------------------------------------
  function setupGsapGlobalInteractions() {
    if (typeof window === 'undefined' || !window.gsap) return;
    // Intentionally keep global IDE elements static (no global hover brightness/scale/MutationObserver animations).
  }

  // ---------------------------------------------------------------------------
  // 7. Main-World Quota Widget & Composer Inline Model Badge (2.34.0 Ready)
  // ---------------------------------------------------------------------------
  function injectMainWorldQuotaWidget() {
    if (document.getElementById('antigravity-quota-main-script')) return;

    function mainWorldQuotaLogic() {
      if (window.__ANTIGRAVITY_QUOTA_INITIALIZED__) return;
      window.__ANTIGRAVITY_QUOTA_INITIALIZED__ = true;

      const QUOTA_CACHE_KEY = 'antigravity_quota_cache_v1';
      const SHOW_QUOTA_KEY = 'antigravity_show_quota_widget';
      let lastQuotaData = null;
      let isFetchingQuota = false;
      let retryCount = 0;
      let retryTimer = null;
      const MAX_RETRIES = 30;
      let lastFetchTime = 0;
      const MIN_FETCH_INTERVAL_MS = 10000;
      let debounceTimer = null;
      let countdownTimer = null;
      let currentActiveGroup = 'argon';
      let lastObservedModelName = '';

      function resolveModelGroup(rawName) {
        if (!rawName) return null;
        const lower = rawName.toLowerCase();
        if (lower.includes('argon')) return 'argon';
        if (lower.includes('hydrogen') || lower.includes('gemini') || lower.includes('flash')) {
          return 'gemini';
        }
        if (lower.includes('claude') || lower.includes('sonnet') || lower.includes('opus') || lower.includes('gpt') || lower.includes('haiku')) {
          return 'other';
        }
        return 'other';
      }

      function detectActiveModelFromDOM() {
        try {
          const triggers = document.querySelectorAll('button[data-testid="model-selector-trigger"], [data-testid="model-selector-trigger"], .model-selector-trigger');
          for (let i = triggers.length - 1; i >= 0; i--) {
            const trigger = triggers[i];
            const aria = trigger.getAttribute('aria-label') || '';
            const match = aria.match(/current:\s*([^\n,·]+)/i);
            if (match && match[1]) {
              const name = match[1].trim();
              const group = resolveModelGroup(name);
              if (group) return { group, fullName: name };
            }
            const nameSpan = trigger.querySelector('span');
            const spanText = (nameSpan ? nameSpan.textContent : trigger.textContent || '').trim();
            if (spanText) {
              const group = resolveModelGroup(spanText);
              if (group) return { group, fullName: spanText };
            }
          }
        } catch (_) {}
        return null;
      }

      const QUOTA_I18N = {
        en: { title: 'Model Quota', refresh: 'Refresh', weekly: 'W:', weeklyFull: 'Weekly', h5Full: '5-Hour', resetIn: 'Resets in ', checking: 'Checking...', openSettings: 'Model Settings', lowWarning: 'Low (<20%)', activeTag: 'ACTIVE', otherLabel: 'Other' },
        ko: { title: '모델 사용량', refresh: '새로고침', weekly: '주간:', weeklyFull: '주간 사용량', h5Full: '5시간 사용량', resetIn: '후 초기화', checking: '확인 중...', openSettings: '모델 설정', lowWarning: '잔여 부족 (<20%)', activeTag: '사용 중', otherLabel: '기타 모델' },
        ja: { title: 'モデル使用量', refresh: '更新', weekly: '週:', weeklyFull: '週間', h5Full: '5時間', resetIn: '後にリセット', checking: '確認中...', openSettings: 'モデル設定', lowWarning: '残りわずか (<20%)', activeTag: '使用中', otherLabel: 'その他' },
        'zh-CN': { title: '模型配额', refresh: '刷新', weekly: '周:', weeklyFull: '每周配额', h5Full: '5小时配额', resetIn: '后重置', checking: '检查中...', openSettings: '模型设置', lowWarning: '配额不足 (<20%)', activeTag: '使用中', otherLabel: '其他模型' },
        'zh-TW': { title: '模型配額', refresh: '重新整理', weekly: '週:', weeklyFull: '每週配額', h5Full: '5小時配額', resetIn: '後重設', checking: '檢查中...', openSettings: '模型設定', lowWarning: '配額不足 (<20%)', activeTag: '使用中', otherLabel: '其他模型' },
        es: { title: 'Cuota', refresh: 'Actualizar', weekly: 'Sem:', weeklyFull: 'Semanal', h5Full: '5 horas', resetIn: 'Se restablece en ', checking: 'Comprobando...', openSettings: 'Ajustes de modelo', lowWarning: 'Baja (<20%)', activeTag: 'ACTIVO', otherLabel: 'Otros' },
        fr: { title: 'Quota', refresh: 'Actualiser', weekly: 'Heb:', weeklyFull: 'Hebdomadaire', h5Full: '5 heures', resetIn: 'Réinitialisation dans ', checking: 'Vérification...', openSettings: 'Paramètres modèles', lowWarning: 'Faible (<20%)', activeTag: 'ACTIF', otherLabel: 'Autres' },
        de: { title: 'Kontingent', refresh: 'Aktualisieren', weekly: 'Wo:', weeklyFull: 'Wöchentlich', h5Full: '5 Stunden', resetIn: 'Zurücksetzen in ', checking: 'Prüfe...', openSettings: 'Modelleinstellungen', lowWarning: 'Niedrig (<20%)', activeTag: 'AKTIV', otherLabel: 'Andere' },
        ru: { title: 'Квота', refresh: 'Обновить', weekly: 'Нед:', weeklyFull: 'Недельная', h5Full: '5 часов', resetIn: 'Сброс через ', checking: 'Проверка...', openSettings: 'Настройки моделей', lowWarning: 'Низкая (<20%)', activeTag: 'АКТИВНА', otherLabel: 'Другие' }
      };

      function getActiveLang() {
        try {
          const stored = localStorage.getItem('antigravity_ui_language');
          if (stored && QUOTA_I18N[stored]) return stored;
        } catch (_) {}
        try {
          const nav = (typeof navigator !== 'undefined' && ((Array.isArray(navigator.languages) && navigator.languages[0]) || navigator.language || navigator.userLanguage)) || 'en';
          const low = String(nav).trim().toLowerCase().replace('_', '-');
          if (low.startsWith('ko')) return 'ko';
          if (low.startsWith('ja')) return 'ja';
          if (low.startsWith('zh')) return (low.includes('tw') || low.includes('hk') || low.includes('mo') || low.includes('hant')) ? 'zh-TW' : 'zh-CN';
          if (low.startsWith('es')) return 'es';
          if (low.startsWith('fr')) return 'fr';
          if (low.startsWith('de')) return 'de';
          if (low.startsWith('ru')) return 'ru';
        } catch (_) {}
        return 'en';
      }
      function getQuotaStrings() { return QUOTA_I18N[getActiveLang()] || QUOTA_I18N.en; }
      function isQuotaWidgetVisible() { try { return localStorage.getItem(SHOW_QUOTA_KEY) !== 'false'; } catch (_) { return true; } }
      function getCachedQuota() { try { const r = localStorage.getItem(QUOTA_CACHE_KEY); return r ? JSON.parse(r) : null; } catch (_) { return null; } }
      function setCachedQuota(d) { try { if (d) localStorage.setItem(QUOTA_CACHE_KEY, JSON.stringify(d)); } catch (_) {} }

      function parseResetTargetTimestamp(desc, resetTimeObj) {
        if (resetTimeObj) {
          if (typeof resetTimeObj === 'string') { const p = Date.parse(resetTimeObj); if (!isNaN(p)) return p; }
          else if (resetTimeObj.seconds !== undefined) return Number(resetTimeObj.seconds) * 1000;
        }
        if (!desc) return null;
        const m = desc.match(/refresh in ([^.]+)/i);
        if (!m) return null;
        let ms = 0;
        const dM = m[1].match(/(\d+)\s*days?/i);
        const hM = m[1].match(/(\d+)\s*hours?/i);
        const mM = m[1].match(/(\d+)\s*minutes?/i);
        const sM = m[1].match(/(\d+)\s*seconds?/i);
        if (dM) ms += parseInt(dM[1], 10) * 86400000;
        if (hM) ms += parseInt(hM[1], 10) * 3600000;
        if (mM) ms += parseInt(mM[1], 10) * 60000;
        if (sM) ms += parseInt(sM[1], 10) * 1000;
        return ms > 0 ? (Date.now() + ms) : null;
      }

      function formatCountdown(targetTime) {
        const diff = Math.max(0, targetTime - Date.now());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const hms = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        const lang = getActiveLang();
        if (d > 0) {
          if (lang === 'ko') return `${d}일 ${hms} 후 재설정`;
          if (lang === 'ja') return `${d}日 ${hms} 後`;
          if (lang === 'zh-CN' || lang === 'zh-TW') return `${d}天 ${hms}`;
          return `${d}d ${hms}`;
        }
        if (lang === 'ko') return `${hms} 후 재설정`;
        return `${getQuotaStrings().resetIn}${hms}`;
      }

      function getStatusColor(f) {
        if (f === undefined || f === null || isNaN(f)) return '#818BA8';
        if (f >= 0.5) return '#CAD3F5';
        if (f >= 0.2) return '#A0A3F6';
        return '#E56B6F';
      }

      async function fetchQuotaData(force = false) {
        const token = window.__APP_CONFIG__?.csrfToken;
        if (!token) return lastQuotaData || getCachedQuota();
        if (isFetchingQuota && !force) return lastQuotaData || getCachedQuota();
        isFetchingQuota = true;
        try {
          const res = await fetch('/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-codeium-csrf-token': token },
            body: JSON.stringify({})
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.response) {
              lastQuotaData = json.response;
              lastFetchTime = Date.now();
              setCachedQuota(lastQuotaData);
            }
          }
        } catch (_) {} finally { isFetchingQuota = false; }
        return lastQuotaData || getCachedQuota();
      }

      function parseGroups(quotaResponse) {
        const qs = getQuotaStrings();
        const groups = quotaResponse?.groups || [];
        const argon = { id: 'argon', label: 'Argon', color: '#A0A3F6', h5: null, weekly: null, h5TargetTs: null, weeklyTargetTs: null, models: ['Gemini 4 Argon'] };
        const gemini = { id: 'gemini', label: 'Gemini', color: '#CAD3F5', h5: null, weekly: null, h5TargetTs: null, weeklyTargetTs: null, models: ['Gemini 4 Hydrogen', 'Gemini Flash', 'Gemini 3.1 Flash Image'] };
        const other = { id: 'other', label: qs.otherLabel || 'Other', color: '#8A93B2', h5: null, weekly: null, h5TargetTs: null, weeklyTargetTs: null, models: ['Claude Opus', 'Claude Sonnet', 'GPT-OSS'] };

        for (const g of groups) {
          const name = (g.displayName || '').toLowerCase();
          const desc = g.description || '';
          const modelsMatch = desc.match(/models within this group:\s*([^.\n]+)/i);
          const extractedModels = (modelsMatch && modelsMatch[1]) ? modelsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : null;

          let target = other;
          if (name.includes('argon') || (g.buckets || []).some(b => (b.bucketId || '').toLowerCase().includes('argon'))) target = argon;
          else if (name.includes('gemini') || name.includes('hydrogen')) target = gemini;
          if (extractedModels && extractedModels.length > 0) target.models = extractedModels;

          for (const b of (g.buckets || [])) {
            const win = (b.window || b.bucketId || '').toLowerCase();
            const fraction = b.remainingFraction ?? (b.remaining?.case === 'remainingFraction' ? b.remaining.value : undefined);
            const targetTs = parseResetTargetTimestamp(b.description, b.resetTime);
            if (win.includes('5h')) {
              target.h5 = fraction !== undefined ? Math.round(fraction * 100) : null;
              target.h5TargetTs = targetTs;
            } else if (win.includes('week')) {
              target.weekly = fraction !== undefined ? Math.round(fraction * 100) : null;
              target.weeklyTargetTs = targetTs;
            }
          }
        }
        return { argon, gemini, other };
      }

      function findTargetContainer() {
        const menuBar = document.querySelector('[data-testid="title-menu-bar"]');
        if (menuBar) return { container: menuBar, before: null, isMenuBar: true };
        const moreActions = document.querySelector('[data-testid="titlebar-more-actions"]');
        if (moreActions && moreActions.parentElement) return { container: moreActions.parentElement, before: moreActions, isMenuBar: false };
        const conciergeActions = document.querySelector('[data-testid="concierge-titlebar-more-actions"]');
        if (conciergeActions && conciergeActions.parentElement) return { container: conciergeActions.parentElement, before: conciergeActions, isMenuBar: false };
        const headerRow = document.querySelector('div.flex.w-full.min-w-0.select-none.items-center.justify-between');
        if (headerRow) {
          const rightEnd = headerRow.querySelector('div.flex.items-center.justify-end');
          if (rightEnd) {
            const inner = rightEnd.querySelector('div.flex.items-center.gap-1') || rightEnd;
            return { container: inner, before: inner.firstChild, isMenuBar: false };
          }
        }
        const auxToggle = document.querySelector('[data-testid="toggle-aux-sidebar"], [data-testid="mobile-toggle-aux-sidebar"]');
        if (auxToggle && auxToggle.parentElement) return { container: auxToggle.parentElement, before: auxToggle, isMenuBar: false };
        return null;
      }

      function stopCountdownTicker() { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }
      function startCountdownTicker() {
        stopCountdownTicker();
        const tick = () => {
          const pop = document.getElementById('antigravity-quota-popover');
          const hoverCard = document.getElementById('antigravity-composer-quota-hovercard');
          if (!pop && !hoverCard) { stopCountdownTicker(); return; }
          [pop, hoverCard].forEach(rootEl => {
            if (!rootEl) return;
            rootEl.querySelectorAll('.bucket-timer[data-target-ts]').forEach(el => {
              const ts = Number(el.getAttribute('data-target-ts'));
              if (ts && !isNaN(ts)) el.textContent = formatCountdown(ts);
            });
          });
        };
        tick();
        countdownTimer = setInterval(tick, 1000);
      }

      function closeQuotaPopover(popEl) {
        if (!popEl) return;
        const finish = () => {
          popEl.remove();
          if (!document.getElementById('antigravity-composer-quota-hovercard')) stopCountdownTicker();
        };
        if (window.gsap) {
          window.gsap.to(popEl, { opacity: 0, duration: 0.1, ease: 'power1.in', onComplete: finish });
        } else { finish(); }
      }

      function hideComposerQuotaHoverCard(immediate = false) {
        const card = document.getElementById('antigravity-composer-quota-hovercard');
        if (!card) return;
        if (window.gsap && window.gsap.killTweensOf) window.gsap.killTweensOf(card);
        const finish = () => {
          card.remove();
          if (!document.getElementById('antigravity-quota-popover')) stopCountdownTicker();
        };
        if (!immediate && window.gsap) {
          window.gsap.to(card, { opacity: 0, duration: 0.08, ease: 'power1.in', onComplete: finish });
        } else { finish(); }
      }

      let quotaHistoryCache = {};
      let quotaShowSparklines = true;
      let quotaCompactCard = false;
      window.addEventListener('antigravity-quota-history-updated', (ev) => {
        if (ev && ev.detail) {
          if (ev.detail.history) quotaHistoryCache = ev.detail.history;
          if (ev.detail.preferences) {
            if (typeof ev.detail.preferences.showSparklines === 'boolean') quotaShowSparklines = ev.detail.preferences.showSparklines;
            if (typeof ev.detail.preferences.compactQuotaCard === 'boolean') quotaCompactCard = ev.detail.preferences.compactQuotaCard;
          }
        }
      });

      function calcBurnRateAndEta(points, currentPct) {
        if (!Array.isArray(points) || points.length < 2 || typeof currentPct !== 'number') return '';
        const valid = points.filter(p => p && typeof p.ts === 'number' && typeof p.h5 === 'number');
        if (valid.length < 2) return '';
        const first = valid[Math.max(0, valid.length - 6)];
        const last = valid[valid.length - 1];
        const hours = (last.ts - first.ts) / 3600000;
        const drop = first.h5 - last.h5;
        if (hours <= 0.05 || drop <= 0.5) return '';
        const rate = drop / hours;
        const etaHours = currentPct / rate;
        if (!isFinite(etaHours) || etaHours <= 0 || etaHours > 240) return '';
        const h = Math.floor(etaHours);
        const m = Math.round((etaHours - h) * 60);
        return `-${rate.toFixed(1)}%/h · ~${h > 0 ? `${h}h ` : ''}${m}m`;
      }

      function renderSparklineSvg(points, isLow) {
        if (!quotaShowSparklines || !Array.isArray(points) || points.length < 2) return '';
        const vals = points.slice(-24).map(p => (typeof p.h5 === 'number' ? p.h5 : p.weekly)).filter(v => typeof v === 'number');
        if (vals.length < 2) return '';
        const w = 64;
        const h = 16;
        const step = w / Math.max(1, vals.length - 1);
        const pts = vals.map((v, idx) => `${(idx * step).toFixed(1)},${(h - 2 - (Math.max(0, Math.min(100, v)) / 100) * (h - 4)).toFixed(1)}`).join(' ');
        const stroke = isLow ? '#E56B6F' : '#A0A3F6';
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;" aria-hidden="true"><polyline fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/></svg>`;
      }

      function renderBucketHtml(title, pct, ts, qs) {
        if (pct === null || pct === undefined) return '';
        const barColor = pct < 20 ? '#E56B6F' : '#A0A3F6';
        return `<article class="bucket-row" style="margin-top:8px;"><p style="margin:0 0 4px;display:flex;justify-content:space-between;font-size:11px;"><span style="color:#9DA7C7;">${title}</span><small class="bucket-timer" ${ts ? `data-target-ts="${ts}"` : ''} style="color:#818BA8;font-size:11px;font-variant-numeric:tabular-nums;">${ts ? formatCountdown(ts) : qs.checking}</small></p><footer style="display:flex;align-items:center;gap:8px;"><div class="progress-bar-bg" style="flex:1;height:4px;border-radius:9999px;background:rgba(202,211,245,0.1);overflow:hidden;"><span class="progress-bar-fill" style="display:block;width:${Math.max(0, Math.min(100, pct))}%;height:100%;background:${barColor};border-radius:9999px;"></span></div><b style="font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;color:${pct < 20 ? '#E56B6F' : '#CAD3F5'};min-width:32px;text-align:right;">${pct}%</b></footer></article>`;
      }

      function showComposerQuotaHoverCard(anchorEl, groupKey, parsed) {
        hideComposerQuotaHoverCard(true);
        if (!parsed) return;
        const grp = parsed[groupKey] || parsed.gemini;
        if (!grp) return;

        const qs = getQuotaStrings();
        const card = document.createElement('div');
        card.id = 'antigravity-composer-quota-hovercard';
        card.className = 'agy-quota-hovercard agy-overlay border rounded-xl no-focus-ring flex flex-col shadow-lg notranslate';
        card.setAttribute('translate', 'no');
        card.setAttribute('data-group-key', grp.id);

        const rect = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : { top: 400, bottom: 420, left: 100 };
        const winH = window.innerHeight || 900;
        const winW = window.innerWidth || 1200;
        const placeAbove = (rect.top > 165);
        const leftPx = Math.max(12, Math.min(winW - 296, rect.left || 12));
        const vertCss = placeAbove
          ? `bottom:${Math.max(12, winH - rect.top + 8)}px;top:auto;`
          : `top:${Math.max(12, (rect.bottom || 32) + 8)}px;bottom:auto;`;

        card.style.cssText = `position:fixed;${vertCss}left:${leftPx}px;width:280px;padding:12px;border-radius:12px;background:#111217;border:1px solid rgba(202,211,245,0.1);box-shadow:0 12px 28px rgba(0,0,0,0.45);color:#CAD3F5;font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable","Pretendard JP Variable","Noto Sans SC","Noto Sans TC","Noto Sans","Segoe UI",sans-serif;font-size:12px;z-index:99998;pointer-events:none;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;`;

        const vals = [grp.h5, grp.weekly].filter(v => typeof v === 'number');
        const isLow = vals.length > 0 && Math.min(...vals) < 20;
        const rows = renderBucketHtml(qs.h5Full, grp.h5, grp.h5TargetTs, qs) + renderBucketHtml(qs.weeklyFull, grp.weekly, grp.weeklyTargetTs, qs);
        const modelsTxt = (grp.models || []).join(', ');

        card.innerHTML = `<header style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:8px;border-bottom:1px solid rgba(202,211,245,0.08);"><div style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;"><strong style="font-weight:600;font-size:13px;white-space:nowrap;color:${isLow ? '#E56B6F' : (grp.id === 'argon' ? '#A0A3F6' : '#CAD3F5')};">${grp.label}</strong>${(grp.id === currentActiveGroup || grp.id === groupKey) ? `<em style="font-style:normal;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0;line-height:1.2;background:rgba(160,163,246,0.14);color:#A0A3F6;border:1px solid rgba(160,163,246,0.32);">${qs.activeTag}</em>` : ''}</div><span style="font-size:11px;color:#818BA8;flex:1;min-width:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${modelsTxt}</span></header><section>${rows || '<p style="margin:8px 0 0;font-size:11px;color:#818BA8;">--</p>'}</section>`;

        (document.body || document.documentElement).appendChild(card);
        startCountdownTicker();
        if (window.gsap) {
          window.gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'power1.out' });
        }
      }

      function toggleQuotaPopover(anchorEl, parsed) {
        const existing = document.getElementById('antigravity-quota-popover');
        if (existing) { closeQuotaPopover(existing); return; }
        hideComposerQuotaHoverCard(true);
        const qs = getQuotaStrings();
        const groupsList = [parsed.argon, parsed.gemini, parsed.other];
        const pop = document.createElement('div');
        pop.id = 'antigravity-quota-popover';
        pop.className = 'agy-quota-popover agy-overlay border rounded-xl no-focus-ring flex flex-col shadow-lg notranslate';
        pop.setAttribute('translate', 'no');

        const rect = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : { bottom: 36, right: 20, top: 10, left: 100 };
        const winH = window.innerHeight || 900;
        const winW = window.innerWidth || 1200;
        const nearBottom = (rect.bottom + 360 > winH);
        const posCss = nearBottom
          ? `bottom:${Math.max(12, winH - rect.top + 8)}px;top:auto;left:${Math.max(12, Math.min(winW - 330, rect.left || 12))}px;right:auto;`
          : `top:${Math.max(32, (rect.bottom || 32) + 6)}px;bottom:auto;right:${Math.max(12, winW - (rect.right || 1180))}px;left:auto;`;

        pop.style.cssText = `position:fixed;${posCss}width:320px;padding:12px;border-radius:12px;background:#111217;border:1px solid rgba(202,211,245,0.1);box-shadow:0 12px 32px rgba(0,0,0,0.48);color:#CAD3F5;font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable","Pretendard JP Variable","Noto Sans SC","Noto Sans TC","Noto Sans","Segoe UI",sans-serif;font-size:12px;z-index:99999;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;`;

        const cardsHtml = groupsList.map(g => {
          const rows = renderBucketHtml(qs.h5Full, g.h5, g.h5TargetTs, qs) + renderBucketHtml(qs.weeklyFull, g.weekly, g.weeklyTargetTs, qs);
          const vals = [g.h5, g.weekly].filter(v => typeof v === 'number');
          const isLow = vals.length > 0 && Math.min(...vals) < 20;
          const hist = quotaHistoryCache[g.id] || [];
          const spark = renderSparklineSvg(hist, isLow);
          const etaTxt = calcBurnRateAndEta(hist, g.h5);
          const borderStyle = isLow ? 'background:rgba(229,107,111,0.08);border:1px solid rgba(229,107,111,0.32);' : 'background:#161820;border:1px solid rgba(202,211,245,0.08);';
          const cardPad = quotaCompactCard ? 'padding:6px 10px;margin-bottom:6px;' : 'padding:8px 12px;margin-bottom:8px;';
          const rightMeta = etaTxt || (quotaCompactCard ? '' : (g.models || []).join(', '));
          return `<section class="group-card rounded-lg p-2 mb-2" style="${borderStyle}border-radius:8px;${cardPad}"><header style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><div style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;white-space:nowrap;"><strong style="font-weight:600;font-size:12px;white-space:nowrap;color:${isLow ? '#E56B6F' : g.color};">${g.label}</strong>${g.id === currentActiveGroup ? `<em style="font-style:normal;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0;line-height:1.2;background:rgba(160,163,246,0.14);color:#A0A3F6;border:1px solid rgba(160,163,246,0.32);">${qs.activeTag}</em>` : ''}</div>${spark}<span style="font-size:11px;color:#818BA8;flex:1;min-width:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${rightMeta}</span></header><main>${rows || '<p style="margin:4px 0 0;font-size:11px;color:#818BA8;">--</p>'}</main></section>`;
        }).join('');

        pop.innerHTML = `<header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(202,211,245,0.08);"><span style="font-weight:600;font-size:13px;color:#CAD3F5;">${qs.title}</span><button id="antigravity-popover-refresh" title="${qs.refresh}" style="background:none;border:none;color:#9DA7C7;cursor:pointer;padding:0;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg></button></header><main>${cardsHtml}</main><footer style="margin-top:4px;padding-top:8px;text-align:right;border-top:1px solid rgba(202,211,245,0.08);"><button id="antigravity-open-models-settings" style="background:none;border:none;color:#A0A3F6;font-size:12px;font-weight:500;cursor:pointer;">${qs.openSettings}</button></footer>`;
        (document.body || document.documentElement).appendChild(pop);
        startCountdownTicker();

        if (window.gsap) {
          window.gsap.fromTo(pop, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out' });
        }

        const popRefresh = pop.querySelector('#antigravity-popover-refresh');
        if (popRefresh) {
          popRefresh.onclick = async (e) => {
            e.stopPropagation();
            await updateQuotaWidget(true);
            const cur = document.getElementById('antigravity-quota-popover');
            if (cur) { cur.remove(); const w = document.getElementById('antigravity-quota-widget'); const d = lastQuotaData || getCachedQuota(); if (w && d) toggleQuotaPopover(w, parseGroups(d)); }
          };
        }
        const openBtn = pop.querySelector('#antigravity-open-models-settings');
        if (openBtn) {
          openBtn.onclick = (e) => {
            e.stopPropagation();
            pop.remove();
            if (!document.getElementById('antigravity-composer-quota-hovercard')) stopCountdownTicker();
            if (window.__TSR_ROUTER__) window.__TSR_ROUTER__.navigate({ search: prev => ({ ...prev, settingsOpen: true, settingsScreen: 'Models' }) });
          };
        }
      }

      document.addEventListener('click', (e) => {
        const pop = document.getElementById('antigravity-quota-popover');
        const widget = document.getElementById('antigravity-quota-widget');
        if (pop && (!pop.contains(e.target)) && (!widget || !widget.contains(e.target))) closeQuotaPopover(pop);
        hideComposerQuotaHoverCard(true);
      });

      document.addEventListener('mousedown', () => {
        hideComposerQuotaHoverCard(true);
      }, true);

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const pop = document.getElementById('antigravity-quota-popover');
          if (pop) closeQuotaPopover(pop);
          hideComposerQuotaHoverCard(true);
        }
      });

      function renderWidget(container, parsed, isMenuBar = false) {
        const { argon, gemini, other } = parsed;
        const qs = getQuotaStrings();
        const isMac = navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const rightMargin = isMenuBar ? (isMac ? '20px' : '140px') : '8px';
        container.className = 'agy-quota-capsule';
        container.style.cssText = `display:${isQuotaWidgetVisible() ? 'inline-flex' : 'none'};align-items:center;gap:4px;padding:0 8px;height:24px;margin-left:${isMenuBar ? 'auto' : '0'};margin-right:${rightMargin};background:#0B0B0E;border:1px solid rgba(202,211,245,0.12);border-radius:6px;color:#CAD3F5;app-region:no-drag;-webkit-app-region:no-drag;user-select:none;font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;line-height:1;cursor:pointer;z-index:100;transition:border-color 150ms cubic-bezier(0.22, 1, 0.36, 1);`;

        const renderDual = (g) => {
          const hasH5 = (g.h5 !== null && g.h5 !== undefined);
          const hasWk = (g.weekly !== null && g.weekly !== undefined);
          if (hasH5 && hasWk) return `<b style="font-weight:600;color:${g.h5 < 20 ? '#E56B6F' : getStatusColor(g.h5 / 100)};">${g.h5}%</b><span style="color:#818BA8;font-size:10px;">/</span><b style="font-weight:600;color:${g.weekly < 20 ? '#E56B6F' : getStatusColor(g.weekly / 100)};">${qs.weekly}${g.weekly}%</b>`;
          if (hasH5) return `<b style="font-weight:600;color:${g.h5 < 20 ? '#E56B6F' : getStatusColor(g.h5 / 100)};">${g.h5}%</b>`;
          if (hasWk) return `<b style="font-weight:600;color:${g.weekly < 20 ? '#E56B6F' : getStatusColor(g.weekly / 100)};">${qs.weekly}${g.weekly}%</b>`;
          return `<b style="font-weight:500;color:#818BA8;">--</b>`;
        };
        const renderBadge = (id, label, color, g, gid) => {
          const active = (gid === currentActiveGroup);
          const vals = [g.h5, g.weekly].filter(v => typeof v === 'number');
          const isLow = vals.length > 0 && Math.min(...vals) < 20;
          const borderCss = active ? 'border:1px solid rgba(160,163,246,0.38);background:rgba(160,163,246,0.12);' : (isLow ? 'background:rgba(229,107,111,0.12);border:1px solid rgba(229,107,111,0.32);' : 'border:1px solid transparent;');
          const dot = active ? '<span style="width:4px;height:4px;border-radius:50%;background:#A0A3F6;display:inline-block;"></span>' : '';
          return `<div id="${id}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;${borderCss}">${dot}<span style="color:${isLow ? '#E56B6F' : (active ? '#A0A3F6' : color)};font-weight:${active ? '600' : '500'};">${label}</span>${renderDual(g)}</div>`;
        };

        const dividerHtml = '<span aria-hidden="true" style="width:1px;height:12px;background:rgba(202,211,245,0.1);display:inline-block;flex-shrink:0;"></span>';
        container.innerHTML = `${renderBadge('antigravity-badge-argon', 'Argon', '#A0A3F6', argon, 'argon')}${dividerHtml}${renderBadge('antigravity-badge-gemini', 'Gemini', '#CAD3F5', gemini, 'gemini')}${dividerHtml}${renderBadge('antigravity-badge-other', qs.otherLabel || 'Other', '#9DA7C7', other, 'other')}<button id="antigravity-quota-refresh-btn" title="${qs.refresh}" style="background:none;border:none;color:#9DA7C7;cursor:pointer;padding:0;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg></button>`;
        container.onclick = (e) => { e.stopPropagation(); toggleQuotaPopover(container, parsed); };
        const refBtn = container.querySelector('#antigravity-quota-refresh-btn');
        if (refBtn) refBtn.onclick = (e) => { e.stopPropagation(); updateQuotaWidget(true); };
      }

      function extractTriggerModelText(trigger) {
        if (!trigger) return '';
        const aria = trigger.getAttribute('aria-label') || '';
        const match = aria.match(/current:\s*([^\n,·]+)/i);
        if (match && match[1]) return match[1].trim();
        let text = '';
        for (let i = 0; i < trigger.childNodes.length; i++) {
          const ch = trigger.childNodes[i];
          if (ch.nodeType === 1 && ch.classList && ch.classList.contains('antigravity-inline-model-quota')) continue;
          text += (ch.textContent || '');
        }
        return text.trim();
      }

      function updateComposerModelQuota(parsedData, activeGroup) {
        try {
          const triggers = document.querySelectorAll('button[data-testid="model-selector-trigger"], [data-testid="model-selector-trigger"], .model-selector-trigger');
          if (!triggers || triggers.length === 0) return;
          const qs = getQuotaStrings();
          const currentParsed = parsedData || (getCachedQuota() ? parseGroups(getCachedQuota()) : null);

          for (const trigger of triggers) {
            const triggerText = extractTriggerModelText(trigger);
            const groupKey = resolveModelGroup(triggerText) || activeGroup || 'gemini';
            const grp = currentParsed ? currentParsed[groupKey] : null;

            let inlineBadge = trigger.querySelector('.antigravity-inline-model-quota');
            if (!inlineBadge) {
              inlineBadge = document.createElement('span');
              inlineBadge.className = 'antigravity-inline-model-quota notranslate';
              inlineBadge.setAttribute('translate', 'no');
              inlineBadge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;margin-left:4px;margin-right:0;border-radius:6px;border:1px solid rgba(202,211,245,0.12);font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable","Pretendard JP Variable","Noto Sans SC","Noto Sans TC","Noto Sans","Segoe UI",sans-serif;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1;cursor:pointer;user-select:none;white-space:nowrap;flex-shrink:0;vertical-align:middle;transition:border-color 150ms cubic-bezier(0.22, 1, 0.36, 1);';
              if (trigger.lastChild) trigger.insertBefore(inlineBadge, trigger.lastChild);
              else trigger.appendChild(inlineBadge);
            }

            inlineBadge.setAttribute('data-group-key', groupKey);
            inlineBadge.onclick = null;
            inlineBadge.onmousedown = () => { hideComposerQuotaHoverCard(true); };
            inlineBadge.onmouseenter = () => {
              const latestRaw = lastQuotaData || getCachedQuota();
              const latestParsed = latestRaw ? parseGroups(latestRaw) : currentParsed;
              if (latestParsed) showComposerQuotaHoverCard(inlineBadge, groupKey, latestParsed);
            };
            inlineBadge.onmouseleave = () => {
              hideComposerQuotaHoverCard(false);
            };

            const brandColor = grp?.color || '#A0A3F6';
            const hasH5 = (grp && grp.h5 !== null && grp.h5 !== undefined);
            const hasWk = (grp && grp.weekly !== null && grp.weekly !== undefined);
            let valHtml = '<span style="color:#818BA8;font-size:10px;">--</span>';
            let isLow = false;
            if (hasH5 && hasWk) {
              valHtml = `<span style="color:${grp.h5 < 20 ? '#E56B6F' : getStatusColor(grp.h5 / 100)};">${grp.h5}%</span><span style="color:#818BA8;margin:0 2px;">/</span><span style="color:${grp.weekly < 20 ? '#E56B6F' : getStatusColor(grp.weekly / 100)};">${qs.weekly}${grp.weekly}%</span>`;
              isLow = grp.h5 < 20 || grp.weekly < 20;
            } else if (hasH5) {
              valHtml = `<span style="color:${grp.h5 < 20 ? '#E56B6F' : getStatusColor(grp.h5 / 100)};">${grp.h5}%</span>`;
              isLow = grp.h5 < 20;
            } else if (hasWk) {
              valHtml = `<span style="color:${grp.weekly < 20 ? '#E56B6F' : getStatusColor(grp.weekly / 100)};">${qs.weekly}${grp.weekly}%</span>`;
              isLow = grp.weekly < 20;
            }
            inlineBadge.style.borderColor = isLow ? 'rgba(229,107,111,0.38)' : 'rgba(160,163,246,0.28)';
            inlineBadge.style.background = isLow ? 'rgba(229,107,111,0.12)' : '#0B0B0E';
            inlineBadge.style.color = '#CAD3F5';
            inlineBadge.innerHTML = `<span style="width:4px;height:4px;border-radius:50%;background:${isLow ? '#E56B6F' : brandColor};display:inline-block;"></span>${valHtml}`;
          }
        } catch (_) {}
      }

      async function updateQuotaWidget(force = false) {
        const target = findTargetContainer();
        if (!target) return;
        let widget = document.getElementById('antigravity-quota-widget');
        if (!widget) {
          widget = document.createElement('div');
          widget.id = 'antigravity-quota-widget';
          if (target.before) target.container.insertBefore(widget, target.before);
          else target.container.appendChild(widget);
        } else if (widget.parentElement !== target.container) {
          if (target.before) target.container.insertBefore(widget, target.before);
          else target.container.appendChild(widget);
        }

        if (!widget.innerHTML.trim()) {
          const cached = lastQuotaData || getCachedQuota();
          if (cached) {
            const p = parseGroups(cached);
            renderWidget(widget, p, target.isMenuBar);
            updateComposerModelQuota(p, currentActiveGroup);
          }
        }
        const data = await fetchQuotaData(force);
        if (data) {
          retryCount = 0;
          const p = parseGroups(data);
          renderWidget(widget, p, target.isMenuBar);
          updateComposerModelQuota(p, currentActiveGroup);
          try { window.dispatchEvent(new CustomEvent('antigravity-quota-snapshot', { detail: { ts: Date.now(), argon: p.argon, gemini: p.gemini, other: p.other } })); } catch (_) {}
        } else if (retryCount < MAX_RETRIES) {
          retryCount++;
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => updateQuotaWidget(false), 1000);
        }
      }

      function checkAndUpdateActiveModel(immediateFetch = false) {
        const detected = detectActiveModelFromDOM();
        if (detected && (detected.group !== currentActiveGroup || detected.fullName !== lastObservedModelName)) {
          currentActiveGroup = detected.group;
          lastObservedModelName = detected.fullName;
          updateQuotaWidget(immediateFetch);
        }
      }

      window.addEventListener('antigravity-lang-changed', () => {
        const widget = document.getElementById('antigravity-quota-widget');
        const cached = lastQuotaData || getCachedQuota();
        const target = findTargetContainer();
        if (widget && cached && target) renderWidget(widget, parseGroups(cached), target.isMenuBar);
      });
      window.addEventListener('antigravity-quota-visibility-changed', (e) => {
        const widget = document.getElementById('antigravity-quota-widget');
        if (widget) widget.style.display = (e.detail ? e.detail.visible : isQuotaWidgetVisible()) ? 'inline-flex' : 'none';
      });

      function scheduleSmartAutoUpdate(delayMs = 2000) {
        if (Date.now() - lastFetchTime < MIN_FETCH_INTERVAL_MS) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updateQuotaWidget(true), delayMs);
      }

      try {
        const nativeFetch = window.fetch;
        window.fetch = async function (...args) {
          const res = await nativeFetch.apply(this, args);
          try {
            const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
            if (url.includes('LanguageServerService') && !url.includes('RetrieveUserQuotaSummary')) {
              scheduleSmartAutoUpdate(2000);
            }
          } catch (_) {}
          return res;
        };
      } catch (_) {}

      updateQuotaWidget();
      setInterval(() => { if (!document.hidden) checkAndUpdateActiveModel(false); }, 1000);
      setInterval(() => { if (!document.hidden) updateQuotaWidget(true); }, 60000);
      document.addEventListener('click', (e) => {
        try {
          const item = e.target.closest && e.target.closest('[data-testid="model-selector-item"], [data-testid="model-selector-custom-item"], [data-testid="model-selector-effort-option"], [data-model-label], [data-model-base]');
          if (item) {
            const label = item.getAttribute('data-model-label') || item.getAttribute('data-model-base') || item.textContent || '';
            const grp = resolveModelGroup(label);
            if (grp) {
              currentActiveGroup = grp;
              lastObservedModelName = label.trim();
              updateQuotaWidget(true);
            }
          }
        } catch (_) {}
        setTimeout(() => checkAndUpdateActiveModel(true), 60);
        setTimeout(() => checkAndUpdateActiveModel(true), 250);
      }, true);
      new MutationObserver(() => {
        const target = findTargetContainer();
        if (target) {
          const w = document.getElementById('antigravity-quota-widget');
          if (!w || w.parentElement !== target.container || !w.innerHTML.trim()) updateQuotaWidget();
        }
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    const script = document.createElement('script');
    script.id = 'antigravity-quota-main-script';
    script.textContent = `${payload.gsapCode || ''}\n(${mainWorldQuotaLogic.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
  }

  // ---------------------------------------------------------------------------
  // 8. Boot Sequence
  // ---------------------------------------------------------------------------
  function runTranslation() {
    injectFont();
    if (activeLanguage !== 'en' && document.body) translateNode(document.body);
    if (document.body) {
      scheduleInjectLanguageSetting();
      scheduleInjectQuickLanguageButton();
      scheduleInjectTitleMenuIntegration();
    }
  }

  function init() {
    if (activeLanguage && userPreferences.language !== activeLanguage) {
      persistPreferences({ language: activeLanguage });
    }
    runTranslation();
    setupGsapGlobalInteractions();
    injectMainWorldQuotaWidget();
    injectQuickLanguageButton();
    injectTitleMenuIntegration();
    setTimeout(() => checkEnhancerGithubUpdate(false), 2500);
    setInterval(() => checkEnhancerGithubUpdate(true), 600000);

    const pendingMutationRoots = new Set();
    let mutationFlushScheduled = false;
    function flushMutationRoots() {
      mutationFlushScheduled = false;
      if (isImeComposing || activeLanguage === 'en') {
        pendingMutationRoots.clear();
        return;
      }
      const roots = Array.from(pendingMutationRoots);
      pendingMutationRoots.clear();
      for (const root of roots) {
        if (root && !isInputOrEditable(root)) translateNode(root);
      }
    }

    const observer = new MutationObserver((mutations) => {
      if (isImeComposing) return;
      if (activeLanguage !== 'en') {
        for (const m of mutations) {
          if (isInputOrEditable(m.target)) continue;
          if (m.type === 'childList') {
            for (const node of m.addedNodes) {
              if (!isInputOrEditable(node)) pendingMutationRoots.add(node);
            }
          } else if (m.target) {
            pendingMutationRoots.add(m.target);
          }
        }
        if (pendingMutationRoots.size > 0 && !mutationFlushScheduled) {
          mutationFlushScheduled = true;
          (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (fn) => setTimeout(fn, 16))(flushMutationRoots);
        }
      }
      scheduleInjectLanguageSetting();
      scheduleInjectQuickLanguageButton();
      scheduleInjectTitleMenuIntegration();
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATE_ATTRS
    });

    setInterval(() => {
      if (!document.hidden && document.body && !isImeComposing) {
        if (activeLanguage !== 'en') {
          document.querySelectorAll('[data-radix-popper-content-wrapper], [role="menu"], [role="dialog"], [role="tooltip"]').forEach(p => {
            if (!isInputOrEditable(p)) translateNode(p);
          });
        }
        scheduleInjectLanguageSetting();
        scheduleInjectQuickLanguageButton();
        scheduleInjectTitleMenuIntegration();
      }
    }, 2000);
  }

  if (typeof window !== 'undefined') {
    window.__agEnhancerTestHooks = {
      formatShortcutFromEvent,
      matchesShortcut,
      getControlCenterStrings,
      isUntranslatableNoise
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
