/**
 * Antigravity Enhancer v3.0.0 - Modular Renderer Enhancer Engine
 * Features: 9-Language Zero-Restart i18n, GSAP v3.15.1 Zero-Bounce Motion,
 *           AI Model Quota HUD & Composer Inline Badge (2.31.2 Hydrogen/Argon/Gemini/Claude),
 *           In-App Enhancer Hub & Direct Update Engine (x2tora/antigravity-enhancer)
 */
(function () {
  'use strict';

  const electron_1 = (typeof require === 'function') ? require('electron') : null;
  const ipc = electron_1 ? electron_1.ipcRenderer : null;
  const payload = (typeof __ENHANCER_PAYLOAD__ !== 'undefined' && __ENHANCER_PAYLOAD__) ? __ENHANCER_PAYLOAD__ : {};
  const ENHANCER_REPO = payload.repo || 'x2tora/antigravity-enhancer';
  const ENHANCER_CURRENT_VERSION = payload.version || '3.0.0';

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
      el.closest('#antigravity-enhancer-hub-btn') ||
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
  for (const l of ['ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru']) {
    buildLangIndices(l, translations[l]);
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

  let activeLanguage = (function () {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      return (stored && LANG_ORDER.includes(stored)) ? stored : 'ko';
    } catch (_) {
      return 'ko';
    }
  })();

  function getCurrentLanguage() { return activeLanguage; }

  function translateText(raw, targetLang) {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return raw;
    const lang = targetLang || activeLanguage || 'ko';
    if (lang === 'en') return raw;

    const trimmed = raw.trim();
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

    const dynRules = (lang === 'ko') ? dynamicRules : (multiLangDynamicRules[lang] || []);
    for (const rule of dynRules) {
      if (rule.reg.test(trimmed)) {
        return raw.replace(trimmed, trimmed.replace(rule.reg, rule.rep));
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

    return raw;
  }

  const TRANSLATE_ATTRS = ['placeholder', 'data-placeholder', 'aria-placeholder', 'title', 'aria-label', 'data-tooltip', 'data-tip'];
  const originalTextMap = new WeakMap();

  function translateNode(node) {
    if (!node || activeLanguage === 'en' || isImeComposing || isInputOrEditable(node)) return;

    if (node.nodeType === 3) {
      const parent = node.parentElement;
      if (!parent || shouldIgnore(parent) || node._isTranslating) return;
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
        const translated = translateText(sourceText, activeLanguage);
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
      if (shouldIgnore(node)) return;
      const isFocused = (document.activeElement === node);
      for (const attr of TRANSLATE_ATTRS) {
        if (attr === 'placeholder' && isFocused) continue;
        const val = node.getAttribute ? node.getAttribute(attr) : node[attr];
        if (!val) continue;
        const origKey = '__orig_' + attr;
        const lastTransKey = '__last_trans_' + attr;
        if (node[origKey] === undefined || (val !== node[origKey] && val !== node[lastTransKey])) {
          node[origKey] = val;
        }
        const baseAttrVal = node[origKey] || val;
        const trans = (activeLanguage === 'ko')
          ? (safeDictGet(placeholders, baseAttrVal) || safeDictGet(exactDict, baseAttrVal) || (typeof baseAttrVal === 'string' ? safeDictGet(exactDict, baseAttrVal.toLowerCase()) : undefined) || translateText(baseAttrVal, 'ko'))
          : translateText(baseAttrVal, activeLanguage);
        if (trans && trans !== val) {
          node[lastTransKey] = trans;
          if (node.setAttribute) node.setAttribute(attr, trans);
          if (attr === 'placeholder') node.placeholder = trans;
        }
      }
      if (node.shadowRoot) translateNode(node.shadowRoot);
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) translateNode(children[i]);
    } else if (node.nodeType === 11) {
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) translateNode(children[i]);
    }
  }

  function revertToOriginal(node) {
    if (!node || isInputOrEditable(node)) return;
    if (node.nodeType === 3) {
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
      for (const attr of TRANSLATE_ATTRS) {
        const key = '__orig_' + attr;
        if (node[key] !== undefined) {
          if (node.setAttribute) node.setAttribute(attr, node[key]);
          if (attr === 'placeholder') node.placeholder = node[key];
        }
      }
      if (node.shadowRoot) revertToOriginal(node.shadowRoot);
      const ch = node.childNodes;
      for (let i = 0; i < ch.length; i++) revertToOriginal(ch[i]);
    } else if (node.nodeType === 11) {
      const ch = node.childNodes;
      for (let i = 0; i < ch.length; i++) revertToOriginal(ch[i]);
    }
  }

  function injectFont() {
    const root = document.head || document.documentElement;
    if (!root) return;

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
          0% { transform: scale(1); outline: 2px solid rgba(34, 197, 94, 0.9); outline-offset: 1px; color: #22c55e; }
          50% { transform: scale(1.12); outline: 2px solid rgba(34, 197, 94, 0.4); outline-offset: 3px; color: #22c55e; }
          100% { transform: scale(1); outline: 2px solid transparent; outline-offset: 4px; }
        }
        .antigravity-copy-success, .antigravity-copy-pulse {
          animation: antigravity-copy-pulse 0.6s ease-out !important;
          color: #22c55e !important;
        }
        .antigravity-copy-success svg, .antigravity-copy-pulse svg {
          stroke: #22c55e !important;
        }
      `;
      root.appendChild(devStyle);
    }

    if (!document.getElementById('antigravity-i18n-style')) {
      const i18nStyle = document.createElement('style');
      i18nStyle.id = 'antigravity-i18n-style';
      i18nStyle.textContent = `
        body, button, select {
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif !important;
        }
        input, textarea {
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
        }
      `;
      i18nStyle.disabled = (activeLanguage === 'en');
      root.appendChild(i18nStyle);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Copy Toast Notification
  // ---------------------------------------------------------------------------
  let copyToastTimer = null;
  function showCopyToast() {
    try {
      if (typeof document === 'undefined') return;
      injectFont();
      let toast = document.getElementById('antigravity-copy-toast');
      const toastText = (activeLanguage === 'ko') ? '코드가 클립보드에 복사되었습니다' : 'Code copied to clipboard';

      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'antigravity-copy-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;align-items:center;gap:8px;padding:8px 14px;background:#0B0B0E;color:#CAD3F5;font-size:13px;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:8px;border:1px solid rgba(160,163,246,0.35);box-shadow:0 8px 24px rgba(0,0,0,0.45);pointer-events:none;opacity:0;';
        toast.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A0A3F6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg><span id="antigravity-copy-toast-text">${toastText}</span>`;
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
      hubBtn: 'Enhancer',
      updatePill: 'Update',
      title: 'Antigravity Enhancer',
      subtitle: 'Patch status & updates',
      curVer: 'Patch Version',
      appVer: 'App Version',
      persistenceTitle: 'Persistence Status',
      asarOk: 'ASAR Active',
      asarWarn: 'ASAR Repair Needed',
      launcherOk: 'Launcher Ready',
      launcherWarn: 'Launcher Missing',
      taskOk: 'Startup Task Active',
      taskWarn: 'Startup Task Off',
      repairBtn: 'Verify & Repair',
      repairedMsg: 'Status verified.',
      updateSection: 'Updates (x2tora/antigravity-enhancer)',
      checkBtn: 'Check',
      checking: 'Checking...',
      upToDate: 'Up to date.',
      availPrefix: 'Update available: ',
      updateNow: 'Update',
      updating: 'Updating...',
      openRelease: 'Open Release',
      reloadNow: 'Reload Window',
      restartNow: 'Restart App',
      rollbackBtn: 'Rollback',
      noBackup: 'No backup',
      vanillaBtn: 'Restore Original',
      vanillaConfirm: 'Click again to restore original',
      safeModeWarn: 'Safe mode enabled'
    },
    ko: {
      hubBtn: '패치 설정',
      updatePill: '업데이트',
      title: 'Antigravity Enhancer',
      subtitle: '패치 상태 및 업데이트',
      curVer: '패치 버전',
      appVer: '앱 버전',
      persistenceTitle: '업데이트 유지 상태',
      asarOk: 'ASAR 연결됨',
      asarWarn: 'ASAR 복구 필요',
      launcherOk: '런처 설치됨',
      launcherWarn: '런처 미설치',
      taskOk: '로그온 작업 활성',
      taskWarn: '로그온 작업 꺼짐',
      repairBtn: '점검 및 복구',
      repairedMsg: '상태를 복구했습니다.',
      updateSection: '업데이트 (x2tora/antigravity-enhancer)',
      checkBtn: '확인',
      checking: '확인 중...',
      upToDate: '최신 버전입니다.',
      availPrefix: '새 버전: ',
      updateNow: '업데이트',
      updating: '업데이트 중...',
      openRelease: '릴리즈 열기',
      reloadNow: '창 새로고침',
      restartNow: '앱 재시작',
      rollbackBtn: '이전 버전 복원',
      noBackup: '백업 없음',
      vanillaBtn: '원본 복구',
      vanillaConfirm: '한 번 더 누르면 원본으로 복구합니다',
      safeModeWarn: '안전 모드가 활성화되었습니다'
    },
    ja: {
      hubBtn: 'パッチ',
      updatePill: '更新',
      title: 'Antigravity Enhancer',
      subtitle: 'パッチ状態と更新',
      curVer: 'パッチ版',
      appVer: 'アプリ版',
      persistenceTitle: '更新維持ステータス',
      asarOk: 'ASAR 有効',
      asarWarn: 'ASAR 修復が必要',
      launcherOk: 'ランチャー接続済み',
      launcherWarn: 'ランチャー未検出',
      taskOk: 'ログオン監視有効',
      taskWarn: 'ログオン監視無効',
      repairBtn: '確認 / 修復',
      repairedMsg: '状態を確認しました。',
      updateSection: '更新 (x2tora/antigravity-enhancer)',
      checkBtn: '確認',
      checking: '確認中...',
      upToDate: '最新バージョンです。',
      availPrefix: '新しいバージョン: ',
      updateNow: '更新する',
      updating: '更新中...',
      openRelease: 'リリースを開く',
      reloadNow: '再読み込み',
      restartNow: '再起動',
      rollbackBtn: '前バージョンに戻す',
      noBackup: 'バックアップなし',
      vanillaBtn: 'オリジナル復元',
      vanillaConfirm: 'もう一度クリックで復元します',
      safeModeWarn: 'セーフモード有効'
    },
    'zh-CN': {
      hubBtn: '补丁',
      updatePill: '更新',
      title: 'Antigravity Enhancer',
      subtitle: '补丁状态与更新',
      curVer: '补丁版本',
      appVer: '应用版本',
      persistenceTitle: '更新保留状态',
      asarOk: 'ASAR 正常',
      asarWarn: 'ASAR 需修复',
      launcherOk: '启动器就绪',
      launcherWarn: '未找到启动器',
      taskOk: '登录任务已启用',
      taskWarn: '登录任务未启用',
      repairBtn: '检查并修复',
      repairedMsg: '状态已修复。',
      updateSection: '更新 (x2tora/antigravity-enhancer)',
      checkBtn: '检查更新',
      checking: '检查中...',
      upToDate: '已是最新版本。',
      availPrefix: '发现新版本: ',
      updateNow: '更新',
      updating: '更新中...',
      openRelease: '打开发布页',
      reloadNow: '重新加载窗口',
      restartNow: '重启应用',
      rollbackBtn: '回滚上一版',
      noBackup: '暂无备份',
      vanillaBtn: '恢复原版',
      vanillaConfirm: '再次点击恢复原版',
      safeModeWarn: '安全模式已启用'
    },
    'zh-TW': {
      hubBtn: '修補',
      updatePill: '更新',
      title: 'Antigravity Enhancer',
      subtitle: '修補狀態與更新',
      curVer: '修補版本',
      appVer: '應用版本',
      persistenceTitle: '更新保留狀態',
      asarOk: 'ASAR 正常',
      asarWarn: 'ASAR 需修復',
      launcherOk: '啟動器就緒',
      launcherWarn: '找不到啟動器',
      taskOk: '登入工作已啟用',
      taskWarn: '登入工作未啟用',
      repairBtn: '檢查並修復',
      repairedMsg: '狀態已修復。',
      updateSection: '更新 (x2tora/antigravity-enhancer)',
      checkBtn: '檢查更新',
      checking: '檢查中...',
      upToDate: '目前已是最新版本。',
      availPrefix: '新版本: ',
      updateNow: '更新',
      updating: '更新中...',
      openRelease: '開啟發佈頁面',
      reloadNow: '重新載入視窗',
      restartNow: '重新啟動',
      rollbackBtn: '復原前一版本',
      noBackup: '尚無備份',
      vanillaBtn: '還原原版',
      vanillaConfirm: '再次點擊還原原版',
      safeModeWarn: '安全模式已啟用'
    },
    es: {
      hubBtn: 'Parche',
      updatePill: 'Actualizar',
      title: 'Antigravity Enhancer',
      subtitle: 'Estado y actualizaciones',
      curVer: 'Versión del parche',
      appVer: 'Versión de la app',
      persistenceTitle: 'Persistencia',
      asarOk: 'ASAR activo',
      asarWarn: 'Reparar ASAR',
      launcherOk: 'Launcher listo',
      launcherWarn: 'Launcher no encontrado',
      taskOk: 'Tarea de inicio activa',
      taskWarn: 'Tarea desactivada',
      repairBtn: 'Verificar y reparar',
      repairedMsg: 'Estado verificado.',
      updateSection: 'Actualizaciones (x2tora/antigravity-enhancer)',
      checkBtn: 'Buscar',
      checking: 'Buscando...',
      upToDate: 'Está actualizado.',
      availPrefix: 'Disponible: ',
      updateNow: 'Actualizar',
      updating: 'Actualizando...',
      openRelease: 'Abrir versión',
      reloadNow: 'Recargar ventana',
      restartNow: 'Reiniciar app',
      rollbackBtn: 'Revertir',
      noBackup: 'Sin copia',
      vanillaBtn: 'Restaurar original',
      vanillaConfirm: 'Haz clic otra vez para restaurar',
      safeModeWarn: 'Modo seguro activo'
    },
    fr: {
      hubBtn: 'Patch',
      updatePill: 'MàJ',
      title: 'Antigravity Enhancer',
      subtitle: 'État et mises à jour',
      curVer: 'Version du patch',
      appVer: 'Version de l’app',
      persistenceTitle: 'Persistance',
      asarOk: 'ASAR actif',
      asarWarn: 'ASAR à réparer',
      launcherOk: 'Lanceur prêt',
      launcherWarn: 'Lanceur absent',
      taskOk: 'Tâche de session active',
      taskWarn: 'Tâche inactive',
      repairBtn: 'Vérifier et réparer',
      repairedMsg: 'État vérifié.',
      updateSection: 'Mises à jour (x2tora/antigravity-enhancer)',
      checkBtn: 'Vérifier',
      checking: 'Vérification...',
      upToDate: 'À jour.',
      availPrefix: 'Disponible : ',
      updateNow: 'Mettre à jour',
      updating: 'Mise à jour...',
      openRelease: 'Ouvrir',
      reloadNow: 'Recharger',
      restartNow: 'Redémarrer',
      rollbackBtn: 'Rétablir',
      noBackup: 'Aucune sauvegarde',
      vanillaBtn: 'Restaurer l’original',
      vanillaConfirm: 'Cliquer encore pour restaurer',
      safeModeWarn: 'Mode sans échec actif'
    },
    de: {
      hubBtn: 'Patch',
      updatePill: 'Update',
      title: 'Antigravity Enhancer',
      subtitle: 'Status und Updates',
      curVer: 'Patch-Version',
      appVer: 'App-Version',
      persistenceTitle: 'Persistenzstatus',
      asarOk: 'ASAR aktiv',
      asarWarn: 'ASAR reparieren',
      launcherOk: 'Launcher bereit',
      launcherWarn: 'Launcher fehlt',
      taskOk: 'Anmeldeaufgabe aktiv',
      taskWarn: 'Aufgabe aus',
      repairBtn: 'Prüfen / Reparieren',
      repairedMsg: 'Status geprüft.',
      updateSection: 'Updates (x2tora/antigravity-enhancer)',
      checkBtn: 'Prüfen',
      checking: 'Prüfe...',
      upToDate: 'Aktuell.',
      availPrefix: 'Verfügbar: ',
      updateNow: 'Aktualisieren',
      updating: 'Aktualisiere...',
      openRelease: 'Release öffnen',
      reloadNow: 'Neu laden',
      restartNow: 'App neu starten',
      rollbackBtn: 'Zurücksetzen',
      noBackup: 'Kein Backup',
      vanillaBtn: 'Original wiederherstellen',
      vanillaConfirm: 'Erneut klicken zum Wiederherstellen',
      safeModeWarn: 'Abgesicherter Modus aktiv'
    },
    ru: {
      hubBtn: 'Патч',
      updatePill: 'Обновл.',
      title: 'Antigravity Enhancer',
      subtitle: 'Состояние и обновления',
      curVer: 'Версия патча',
      appVer: 'Версия приложения',
      persistenceTitle: 'Состояние защиты',
      asarOk: 'ASAR активен',
      asarWarn: 'Нужно восстановление ASAR',
      launcherOk: 'Лаунчер готов',
      launcherWarn: 'Лаунчер не найден',
      taskOk: 'Задача входа активна',
      taskWarn: 'Задача отключена',
      repairBtn: 'Проверить / восстановить',
      repairedMsg: 'Состояние проверено.',
      updateSection: 'Обновления (x2tora/antigravity-enhancer)',
      checkBtn: 'Проверить',
      checking: 'Проверка...',
      upToDate: 'Актуальная версия.',
      availPrefix: 'Доступна версия: ',
      updateNow: 'Обновить',
      updating: 'Обновление...',
      openRelease: 'Открыть релиз',
      reloadNow: 'Перезагрузить окно',
      restartNow: 'Перезапустить',
      rollbackBtn: 'Откатить',
      noBackup: 'Нет резервной копии',
      vanillaBtn: 'Восстановить оригинал',
      vanillaConfirm: 'Нажмите ещё раз для восстановления',
      safeModeWarn: 'Включён безопасный режим'
    }
  };

  function getHubStrings() {
    return HUB_I18N[activeLanguage] || HUB_I18N.en;
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
        scheduleInjectQuickLanguageButton();
      }
      return res;
    } catch (_) {
      return null;
    }
  }

  let activeProgressHandler = null;
  if (ipc && typeof ipc.on === 'function') {
    ipc.on('enhancer:update-progress', (_ev, data) => {
      if (typeof activeProgressHandler === 'function') {
        activeProgressHandler(data);
      }
    });
  }

  function closeEnhancerHubModal() {
    activeProgressHandler = null;
    const backdrop = document.getElementById('antigravity-enhancer-modal-backdrop');
    if (!backdrop) return;
    if (window.gsap) {
      window.gsap.to(backdrop, {
        opacity: 0,
        duration: 0.12,
        ease: 'power1.in',
        onComplete: () => backdrop.remove()
      });
    } else {
      backdrop.remove();
    }
  }

  async function openEnhancerHubModal() {
    const existing = document.getElementById('antigravity-enhancer-modal-backdrop');
    if (existing) {
      closeEnhancerHubModal();
      return;
    }
    const status = await refreshHubStatus() || {
      enhancerVersion: ENHANCER_CURRENT_VERSION,
      appVersion: '2.31.2',
      asarBootstrapped: true,
      smartLauncherInstalled: false,
      logonTaskRegistered: false,
      backup: { available: false }
    };
    const h = getHubStrings();

    const backdrop = document.createElement('div');
    backdrop.id = 'antigravity-enhancer-modal-backdrop';
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(11,11,14,0.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:20px;app-region:no-drag;-webkit-app-region:no-drag;';

    const modal = document.createElement('div');
    modal.id = 'antigravity-enhancer-modal';
    modal.className = 'border bg-card text-foreground shadow-2xl';
    modal.style.cssText = 'width:480px;max-width:95vw;max-height:90vh;overflow-y:auto;border-radius:12px;background:#0B0B0E;border:1px solid rgba(202,211,245,0.14);box-shadow:0 20px 48px rgba(0,0,0,0.65);padding:20px;color:#CAD3F5;font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable",Pretendard,"Segoe UI",sans-serif;font-size:13px;';

    const badgePill = (ok, label) => {
      const bg = ok ? 'rgba(160,163,246,0.14)' : 'rgba(202,211,245,0.06)';
      const border = ok ? 'rgba(160,163,246,0.4)' : 'rgba(202,211,245,0.18)';
      const color = ok ? '#A0A3F6' : '#8A93B2';
      const dot = `<span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;"></span>`;
      return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:9999px;background:${bg};border:1px solid ${border};color:${color};font-size:11px;font-weight:600;">${dot}${label}</span>`;
    };

    modal.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#121319;border:1px solid rgba(202,211,245,0.18);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18L12 6L17 18" stroke="#CAD3F5" stroke-width="2.3"></path><line x1="9.8" y1="14.5" x2="14.2" y2="14.5" stroke="#A0A3F6" stroke-width="2.2"></line><circle cx="17.5" cy="7" r="1.6" fill="#A0A3F6"></circle></svg>
            </span>
            <span style="font-size:15px;font-weight:700;color:#CAD3F5;letter-spacing:-0.01em;">${h.title}</span>
          </div>
          <div style="font-size:11.5px;color:#8A93B2;margin-top:4px;">${h.subtitle}</div>
        </div>
        <button id="agy-hub-close" type="button" style="background:#121319;border:1px solid rgba(202,211,245,0.14);color:#8A93B2;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;">×</button>
      </div>

      ${status.safeMode ? `<div style="margin-bottom:12px;padding:8px 10px;border-radius:8px;background:rgba(160,163,246,0.1);border:1px solid rgba(160,163,246,0.35);color:#CAD3F5;font-size:11.5px;">${h.safeModeWarn}</div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div style="padding:10px 12px;border-radius:8px;background:#121319;border:1px solid rgba(202,211,245,0.1);">
          <div style="font-size:11px;color:#8A93B2;">${h.curVer}</div>
          <div style="font-size:16px;font-weight:700;color:#A0A3F6;margin-top:2px;">v${status.enhancerVersion || ENHANCER_CURRENT_VERSION}</div>
        </div>
        <div style="padding:10px 12px;border-radius:8px;background:#121319;border:1px solid rgba(202,211,245,0.1);">
          <div style="font-size:11px;color:#8A93B2;">${h.appVer}</div>
          <div style="font-size:16px;font-weight:700;color:#CAD3F5;margin-top:2px;">v${status.appVersion || '2.31.2'}</div>
        </div>
      </div>

      <div style="padding:12px;border-radius:8px;background:#121319;border:1px solid rgba(202,211,245,0.1);margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:600;color:#CAD3F5;">${h.persistenceTitle}</span>
          <button id="agy-hub-repair-btn" type="button" style="padding:4px 9px;border-radius:6px;background:#1A1B24;border:1px solid rgba(202,211,245,0.16);color:#CAD3F5;font-size:11px;font-weight:600;cursor:pointer;">${h.repairBtn}</button>
        </div>
        <div id="agy-hub-persist-pills" style="display:flex;flex-wrap:wrap;gap:6px;">
          ${badgePill(status.asarBootstrapped, status.asarBootstrapped ? h.asarOk : h.asarWarn)}
          ${badgePill(status.smartLauncherInstalled, status.smartLauncherInstalled ? h.launcherOk : h.launcherWarn)}
          ${badgePill(status.logonTaskRegistered, status.logonTaskRegistered ? h.taskOk : h.taskWarn)}
        </div>
        <div id="agy-hub-persist-msg" style="font-size:11px;color:#A0A3F6;margin-top:6px;display:none;"></div>
      </div>

      <div style="padding:12px;border-radius:8px;background:#121319;border:1px solid rgba(160,163,246,0.28);margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:600;color:#CAD3F5;">${h.updateSection}</span>
          <button id="agy-hub-check-btn" type="button" style="padding:4px 10px;border-radius:6px;background:rgba(160,163,246,0.16);border:1px solid rgba(160,163,246,0.45);color:#A0A3F6;font-size:11px;font-weight:600;cursor:pointer;">${h.checkBtn}</button>
        </div>
        <div id="agy-hub-update-status" style="font-size:12px;color:#CAD3F5;line-height:1.45;"></div>
        <div id="agy-hub-progress-wrap" style="display:none;margin-top:8px;">
          <div style="height:5px;border-radius:9999px;background:rgba(202,211,245,0.1);overflow:hidden;">
            <div id="agy-hub-progress-bar" style="width:0%;height:100%;background:#A0A3F6;border-radius:9999px;"></div>
          </div>
          <div id="agy-hub-progress-text" style="font-size:11px;color:#8A93B2;margin-top:4px;"></div>
        </div>
        <div id="agy-hub-update-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;"></div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid rgba(202,211,245,0.1);">
        <button id="agy-hub-rollback-btn" type="button" ${status.backup && status.backup.available ? '' : 'disabled'} style="padding:6px 11px;border-radius:6px;background:#121319;border:1px solid rgba(202,211,245,0.14);color:${status.backup && status.backup.available ? '#CAD3F5' : '#5E6580'};font-size:11.5px;font-weight:600;cursor:${status.backup && status.backup.available ? 'pointer' : 'not-allowed'};">
          ${status.backup && status.backup.available ? `${h.rollbackBtn} (v${status.backup.version})` : h.noBackup}
        </button>
        <button id="agy-hub-vanilla-btn" type="button" style="padding:6px 11px;border-radius:6px;background:#121319;border:1px solid rgba(202,211,245,0.18);color:#CAD3F5;font-size:11.5px;font-weight:600;cursor:pointer;">${h.vanillaBtn}</button>
      </div>
    `;

    backdrop.appendChild(modal);
    (document.body || document.documentElement).appendChild(backdrop);

    if (window.gsap) {
      window.gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out' });
    }

    backdrop.onclick = (e) => { if (e.target === backdrop) closeEnhancerHubModal(); };
    modal.querySelector('#agy-hub-close').onclick = () => closeEnhancerHubModal();

    const updateStatusEl = modal.querySelector('#agy-hub-update-status');
    const updateActionsEl = modal.querySelector('#agy-hub-update-actions');
    const progWrap = modal.querySelector('#agy-hub-progress-wrap');
    const progBar = modal.querySelector('#agy-hub-progress-bar');
    const progText = modal.querySelector('#agy-hub-progress-text');

    const renderUpdateUI = (info) => {
      updateActionsEl.innerHTML = '';
      if (!info) {
        updateStatusEl.textContent = h.upToDate;
        return;
      }
      if (!info.ok) {
        updateStatusEl.innerHTML = `<span style="color:#f87171;">${info.error || 'Error checking updates'}</span>`;
        return;
      }
      if (!info.hasUpdate) {
        updateStatusEl.innerHTML = `<span style="color:#A0A3F6;">${h.upToDate} (v${info.currentVersion})</span>`;
        return;
      }

      const notesHtml = info.releaseNotes
        ? `<div style="margin-top:6px;padding:7px 9px;border-radius:6px;background:#0B0B0E;border:1px solid rgba(202,211,245,0.08);font-size:11px;color:#CAD3F5;max-height:80px;overflow-y:auto;">${String(info.releaseNotes).replace(/</g, '&lt;')}</div>`
        : '';
      updateStatusEl.innerHTML = `<span style="color:#A0A3F6;font-weight:600;">${h.availPrefix}v${info.currentVersion} → v${info.remoteVersion}</span>${notesHtml}`;

      if (info.canApplyInApp) {
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.textContent = h.updateNow;
        applyBtn.style.cssText = 'padding:6px 12px;border-radius:6px;background:#A0A3F6;border:none;color:#0B0B0E;font-size:12px;font-weight:700;cursor:pointer;';
        applyBtn.onclick = async () => {
          applyBtn.disabled = true;
          applyBtn.textContent = h.updating;
          progWrap.style.display = 'block';
          const res = await ipc.invoke('enhancer:apply-update');
          if (res && res.ok) {
            progBar.style.width = '100%';
            updateStatusEl.innerHTML = `<span style="color:#A0A3F6;font-weight:600;">v${res.newVersion} 완료</span>`;
            updateActionsEl.innerHTML = '';
            const finishBtn = document.createElement('button');
            finishBtn.type = 'button';
            finishBtn.textContent = res.restartRequired ? h.restartNow : h.reloadNow;
            finishBtn.style.cssText = 'padding:6px 12px;border-radius:6px;background:#A0A3F6;border:none;color:#0B0B0E;font-size:12px;font-weight:700;cursor:pointer;';
            finishBtn.onclick = () => ipc.invoke(res.restartRequired ? 'enhancer:relaunch' : 'enhancer:reload-windows');
            updateActionsEl.appendChild(finishBtn);
          } else {
            applyBtn.disabled = false;
            applyBtn.textContent = h.updateNow;
            updateStatusEl.innerHTML = `<span style="color:#f87171;">${(res && res.error) || 'Update failed'}</span>`;
          }
        };
        updateActionsEl.appendChild(applyBtn);
      }

      if (info.releasePageUrl) {
        const relBtn = document.createElement('button');
        relBtn.type = 'button';
        relBtn.textContent = h.openRelease;
        relBtn.style.cssText = 'padding:6px 10px;border-radius:6px;background:#1A1B24;border:1px solid rgba(202,211,245,0.16);color:#CAD3F5;font-size:11.5px;font-weight:600;cursor:pointer;';
        relBtn.onclick = () => {
          const targetUrl = info.exeDownloadUrl || info.releasePageUrl;
          try { ipc.invoke('shell:open-external', targetUrl); } catch (_) { window.open(targetUrl, '_blank'); }
        };
        updateActionsEl.appendChild(relBtn);
      }
    };

    activeProgressHandler = (data) => {
      if (!document.body.contains(modal)) return;
      progWrap.style.display = 'block';
      const pct = Math.max(0, Math.min(100, Number(data && data.percent) || 0));
      progBar.style.width = `${pct}%`;
      if (data && data.message) progText.textContent = data.message;
    };

    renderUpdateUI(enhancerUpdateInfo || status.lastRemoteInfo);

    modal.querySelector('#agy-hub-check-btn').onclick = async () => {
      updateStatusEl.textContent = h.checking;
      const res = await checkEnhancerGithubUpdate(true);
      renderUpdateUI(res);
    };

    modal.querySelector('#agy-hub-repair-btn').onclick = async () => {
      const res = await ipc.invoke('enhancer:repair-persistence');
      const msgEl = modal.querySelector('#agy-hub-persist-msg');
      if (res && res.ok && res.status) {
        modal.querySelector('#agy-hub-persist-pills').innerHTML = [
          badgePill(res.status.asarBootstrapped, res.status.asarBootstrapped ? h.asarOk : h.asarWarn),
          badgePill(res.status.smartLauncherInstalled, res.status.smartLauncherInstalled ? h.launcherOk : h.launcherWarn),
          badgePill(res.status.logonTaskRegistered, res.status.logonTaskRegistered ? h.taskOk : h.taskWarn)
        ].join('');
        msgEl.textContent = h.repairedMsg;
        msgEl.style.display = 'block';
      }
    };

    modal.querySelector('#agy-hub-rollback-btn').onclick = async () => {
      const res = await ipc.invoke('enhancer:rollback');
      if (res && res.ok) {
        await ipc.invoke(res.restartRequired ? 'enhancer:relaunch' : 'enhancer:reload-windows');
      }
    };

    const vanillaBtn = modal.querySelector('#agy-hub-vanilla-btn');
    let vanillaArmed = false;
    let vanillaTimer = null;
    vanillaBtn.onclick = async () => {
      if (!vanillaArmed) {
        vanillaArmed = true;
        vanillaBtn.textContent = h.vanillaConfirm;
        clearTimeout(vanillaTimer);
        vanillaTimer = setTimeout(() => {
          vanillaArmed = false;
          vanillaBtn.textContent = h.vanillaBtn;
        }, 4000);
        return;
      }
      await ipc.invoke('enhancer:restore-vanilla');
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Settings Panel & Top-Bar Controls (2.31.2 Compatible)
  // ---------------------------------------------------------------------------
  function setLanguage(lang) {
    if (activeLanguage === lang) return;
    activeLanguage = lang;
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (_) {}

    const fontStyle = document.getElementById('antigravity-i18n-style');
    if (fontStyle) fontStyle.disabled = (lang === 'en');

    if (document.body) {
      revertToOriginal(document.body);
      if (lang !== 'en') translateNode(document.body);
    }
    updateLanguageSelectorUI();
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

    const hubBtnLbl = document.getElementById('antigravity-enhancer-hub-label');
    if (hubBtnLbl) {
      const h = getHubStrings();
      hubBtnLbl.textContent = (enhancerUpdateInfo && enhancerUpdateInfo.hasUpdate)
        ? `${h.updatePill} v${enhancerUpdateInfo.remoteVersion}`
        : `v${ENHANCER_CURRENT_VERSION}`;
    }

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
            <div id="antigravity-lang-dropdown-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);z-index:6000;" class="agy-overlay surface-glass border border-border rounded-lg bg-card text-foreground no-focus-ring flex flex-col shadow-md min-w-[160px] p-1 gap-px">${langItemsHtml}</div>
          </div>
        </div>
        <div id="antigravity-quota-setting-row" class="py-2 px-3 w-full bg-transparent flex justify-between gap-4 items-center" style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div class="flex-1 min-w-0 flex flex-col gap-0.5" style="flex:1 1 0%;min-width:180px;">
            <span class="text-sm font-normal text-foreground" id="antigravity-quota-item-title">${currentLang === 'ko' ? '상단 사용량 표시기' : 'Top-Bar Quota Widget'}</span>
            <div class="text-xs text-secondary-foreground" id="antigravity-quota-item-desc" style="line-height:1.4;">${currentLang === 'ko' ? '상단 바에 실시간 모델 할당량 및 사용 현황 위젯을 표시합니다.' : 'Show real-time model quota and AI usage widget in the top bar.'}</div>
          </div>
          <button type="button" role="switch" id="antigravity-quota-toggle" aria-checked="${isQuotaOn}" style="position:relative;display:inline-flex;height:20px;width:36px;flex-shrink:0;cursor:pointer;border-radius:9999px;border:2px solid transparent;transition:background-color 0.2s ease-in-out;outline:none;background-color:${isQuotaOn ? '#A0A3F6' : 'rgba(202,211,245,0.22)'};">
            <span id="antigravity-quota-toggle-thumb" style="pointer-events:none;display:inline-block;height:16px;width:16px;border-radius:9999px;background-color:#CAD3F5;box-shadow:0 1px 3px rgba(0,0,0,0.3);transition:transform 0.2s ease-in-out;transform:translateX(${isQuotaOn ? '16px' : '0px'});"></span>
          </button>
        </div>
        <div class="py-2 px-3 w-full bg-transparent flex justify-between gap-4 items-center" style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div class="flex-1 min-w-0 flex flex-col gap-0.5" style="flex:1 1 0%;min-width:180px;">
            <span class="text-sm font-normal text-foreground">${h.title} (v${ENHANCER_CURRENT_VERSION})</span>
            <div class="text-xs text-secondary-foreground" style="line-height:1.4;">${h.subtitle}</div>
          </div>
          <button type="button" id="antigravity-settings-open-hub" class="px-2.5 py-1 text-xs font-semibold rounded-md bg-secondary text-foreground hover:opacity-90 cursor-pointer border border-border">${h.hubBtn} / ${h.checkBtn}</button>
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
    if (settingsHubBtn) settingsHubBtn.onclick = (e) => { e.stopPropagation(); openEnhancerHubModal(); };

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
    menu.className = 'agy-overlay border rounded-lg no-focus-ring flex flex-col shadow-md min-w-[175px] p-1 gap-px';
    menu.style.cssText = `position:fixed;top:${topPx}px;right:${rightPx}px;min-width:175px;padding:4px;gap:1px;display:flex;flex-direction:column;border-radius:8px;background:#0B0B0E;border:1px solid rgba(202,211,245,0.16);color:#CAD3F5;font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable",Pretendard,"Segoe UI",sans-serif;z-index:99999;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;`;

    menu.innerHTML = LANG_ORDER.map(l => {
      const info = LANG_DISPLAY_NAMES[l] || { native: l, en: l };
      const isSelected = (activeLanguage === l);
      const labelText = (l === 'en') ? 'English (English)' : `${info.native} (${info.en})`;
      return `<div id="antigravity-quick-opt-${l}" data-lang="${l}" class="agy-overlay-item w-full text-left whitespace-nowrap transition-colors duration-150 select-none rounded-md flex items-center justify-between gap-2 px-2 py-1 text-[13px] outline-none no-focus-ring cursor-pointer" style="color:${isSelected ? '#A0A3F6' : '#CAD3F5'};font-weight:${isSelected ? '600' : '400'};"><span class="truncate">${labelText}</span><svg id="antigravity-quick-lang-check-${l}" class="w-3.5 h-3.5 shrink-0 ml-auto pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A0A3F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:${isSelected ? 'flex' : 'none'};flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
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

  function injectEnhancerHubButton(target, beforeBtn) {
    if (!target || !target.container) return;
    const h = getHubStrings();
    const hasUpdate = Boolean(enhancerUpdateInfo && enhancerUpdateInfo.hasUpdate);
    let hubBtn = document.getElementById('antigravity-enhancer-hub-btn');

    if (!hubBtn) {
      hubBtn = document.createElement('button');
      hubBtn.id = 'antigravity-enhancer-hub-btn';
      hubBtn.type = 'button';
      hubBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable",Pretendard,"Segoe UI",sans-serif;line-height:1;cursor:pointer;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;margin-right:6px;white-space:nowrap;flex-shrink:0;transition:border-color 0.15s ease,background-color 0.15s ease;z-index:101;';
      hubBtn.innerHTML = `<span id="antigravity-enhancer-hub-dot" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;"></span><span id="antigravity-enhancer-hub-label"></span>`;
      hubBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        openEnhancerHubModal();
      };
    }

    const dot = hubBtn.querySelector('#antigravity-enhancer-hub-dot');
    const lbl = hubBtn.querySelector('#antigravity-enhancer-hub-label');
    if (hasUpdate) {
      hubBtn.style.background = 'rgba(160, 163, 246, 0.18)';
      hubBtn.style.border = '1px solid rgba(160, 163, 246, 0.5)';
      hubBtn.style.color = '#A0A3F6';
      if (dot) dot.style.background = '#A0A3F6';
      if (lbl) lbl.textContent = `${h.updatePill} v${enhancerUpdateInfo.remoteVersion}`;
      hubBtn.title = `${h.availPrefix}v${enhancerUpdateInfo.remoteVersion} (Alt+Shift+E)`;
    } else {
      hubBtn.style.background = '#0B0B0E';
      hubBtn.style.border = '1px solid rgba(202, 211, 245, 0.18)';
      hubBtn.style.color = '#CAD3F5';
      if (dot) dot.style.background = '#A0A3F6';
      if (lbl) lbl.textContent = `v${ENHANCER_CURRENT_VERSION}`;
      hubBtn.title = `${h.title} (Alt+Shift+E)`;
    }

    if (beforeBtn && beforeBtn.parentElement === target.container) {
      if (hubBtn.nextSibling !== beforeBtn || hubBtn.parentElement !== target.container) {
        target.container.insertBefore(hubBtn, beforeBtn);
      }
    } else if (hubBtn.parentElement !== target.container) {
      target.container.appendChild(hubBtn);
    }
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
      quickLangBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:0.3px;line-height:1;background:rgba(128,128,128,0.12);border:1px solid rgba(128,128,128,0.22);color:inherit;cursor:pointer;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;outline:none;transition:background 0.15s ease,border-color 0.15s ease,transform 0.1s ease;margin-right:6px;white-space:nowrap;flex-shrink:0;z-index:101;';
      quickLangBtn.innerHTML = `<svg class="shrink-0 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.85;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span id="antigravity-quick-lang-label" class="pointer-events-none" style="font-weight:600;font-size:11px;line-height:1;">${langCode}</span><svg class="shrink-0 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.65;margin-left:1px;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
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
    injectEnhancerHubButton(target, quickLangBtn);
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
      }
      if (e.altKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        if (e.preventDefault) e.preventDefault();
        if (isImeComposing || e.isComposing || isInputOrEditable(e.target)) return;
        const nextIdx = (LANG_ORDER.indexOf(activeLanguage) + 1) % LANG_ORDER.length;
        setLanguage(LANG_ORDER[nextIdx]);
      }
      if (e.altKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        if (e.preventDefault) e.preventDefault();
        openEnhancerHubModal();
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
  // 7. Main-World Quota Widget & Composer Inline Model Badge (2.31.2 Ready)
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
        if (lower.includes('hydrogen') || lower.includes('gemini') || lower.includes('flash') || lower.includes('pro')) {
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
        en: { title: 'Model Quota', refresh: 'Refresh', weekly: 'W:', weeklyFull: 'Weekly', h5Full: '5-Hour', resetIn: 'Resets in ', checking: 'Checking...', openSettings: 'Model Settings', lowWarning: 'Low (<20%)', activeTag: 'ACTIVE' },
        ko: { title: '모델 사용량', refresh: '새로고침', weekly: '주간:', weeklyFull: '주간 사용량', h5Full: '5시간 사용량', resetIn: '후 초기화', checking: '확인 중...', openSettings: '모델 설정', lowWarning: '잔여 부족 (<20%)', activeTag: '사용 중' },
        ja: { title: 'モデル使用量', refresh: '更新', weekly: '週:', weeklyFull: '週間', h5Full: '5時間', resetIn: '後にリセット', checking: '確認中...', openSettings: 'モデル設定', lowWarning: '残りわずか (<20%)', activeTag: '使用中' },
        'zh-CN': { title: '模型配额', refresh: '刷新', weekly: '周:', weeklyFull: '每周配额', h5Full: '5小时配额', resetIn: '后重置', checking: '检查中...', openSettings: '模型设置', lowWarning: '配额不足 (<20%)', activeTag: '使用中' },
        'zh-TW': { title: '模型配額', refresh: '重新整理', weekly: '週:', weeklyFull: '每週配額', h5Full: '5小時配額', resetIn: '後重設', checking: '檢查中...', openSettings: '模型設定', lowWarning: '配額不足 (<20%)', activeTag: '使用中' },
        es: { title: 'Cuota', refresh: 'Actualizar', weekly: 'Sem:', weeklyFull: 'Semanal', h5Full: '5 horas', resetIn: 'Se restablece en ', checking: 'Comprobando...', openSettings: 'Ajustes de modelo', lowWarning: 'Baja (<20%)', activeTag: 'ACTIVO' },
        fr: { title: 'Quota', refresh: 'Actualiser', weekly: 'Heb:', weeklyFull: 'Hebdomadaire', h5Full: '5 heures', resetIn: 'Réinitialisation dans ', checking: 'Vérification...', openSettings: 'Paramètres modèles', lowWarning: 'Faible (<20%)', activeTag: 'ACTIF' },
        de: { title: 'Kontingent', refresh: 'Aktualisieren', weekly: 'Wo:', weeklyFull: 'Wöchentlich', h5Full: '5 Stunden', resetIn: 'Zurücksetzen in ', checking: 'Prüfe...', openSettings: 'Modelleinstellungen', lowWarning: 'Niedrig (<20%)', activeTag: 'AKTIV' },
        ru: { title: 'Квота', refresh: 'Обновить', weekly: 'Нед:', weeklyFull: 'Недельная', h5Full: '5 часов', resetIn: 'Сброс через ', checking: 'Проверка...', openSettings: 'Настройки моделей', lowWarning: 'Низкая (<20%)', activeTag: 'АКТИВНА' }
      };

      function getActiveLang() { try { return localStorage.getItem('antigravity_ui_language') || 'ko'; } catch (_) { return 'ko'; } }
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
        if (f === undefined || f === null || isNaN(f)) return '#8A93B2';
        if (f >= 0.5) return '#CAD3F5';
        if (f >= 0.2) return '#A0A3F6';
        if (f >= 0.1) return '#f87171';
        return '#ef4444';
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
        const groups = quotaResponse?.groups || [];
        const argon = { id: 'argon', label: 'Argon', color: '#A0A3F6', h5: null, weekly: null, h5TargetTs: null, weeklyTargetTs: null, models: ['Gemini 4 Argon'] };
        const gemini = { id: 'gemini', label: 'Gemini', color: '#CAD3F5', h5: null, weekly: null, h5TargetTs: null, weeklyTargetTs: null, models: ['Gemini 4 Hydrogen', 'Gemini Flash', 'Gemini Pro'] };
        const other = { id: 'other', label: 'Claude/Other', color: '#8A93B2', h5: null, weekly: null, h5TargetTs: null, weeklyTargetTs: null, models: ['Claude Opus', 'Claude Sonnet', 'GPT-OSS'] };

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
          if (!pop) { stopCountdownTicker(); return; }
          pop.querySelectorAll('.bucket-timer[data-target-ts]').forEach(el => {
            const ts = Number(el.getAttribute('data-target-ts'));
            if (ts && !isNaN(ts)) el.textContent = formatCountdown(ts);
          });
        };
        tick();
        countdownTimer = setInterval(tick, 1000);
      }

      function closeQuotaPopover(popEl) {
        if (!popEl) return;
        if (window.gsap) {
          window.gsap.to(popEl, { opacity: 0, duration: 0.1, ease: 'power1.in', onComplete: () => { popEl.remove(); stopCountdownTicker(); } });
        } else { popEl.remove(); stopCountdownTicker(); }
      }

      function toggleQuotaPopover(anchorEl, parsed) {
        const existing = document.getElementById('antigravity-quota-popover');
        if (existing) { closeQuotaPopover(existing); return; }
        const qs = getQuotaStrings();
        const groupsList = [parsed.argon, parsed.gemini, parsed.other];
        const pop = document.createElement('div');
        pop.id = 'antigravity-quota-popover';
        pop.className = 'agy-quota-popover agy-overlay border rounded-lg no-focus-ring flex flex-col shadow-md';

        const rect = anchorEl && anchorEl.getBoundingClientRect ? anchorEl.getBoundingClientRect() : { bottom: 36, right: 20, top: 10, left: 100 };
        const winH = window.innerHeight || 900;
        const winW = window.innerWidth || 1200;
        const nearBottom = (rect.bottom + 360 > winH);
        const posCss = nearBottom
          ? `bottom:${Math.max(12, winH - rect.top + 8)}px;top:auto;left:${Math.max(12, Math.min(winW - 330, rect.left || 12))}px;right:auto;`
          : `top:${Math.max(32, (rect.bottom || 32) + 6)}px;bottom:auto;right:${Math.max(12, winW - (rect.right || 1180))}px;left:auto;`;

        pop.style.cssText = `position:fixed;${posCss}width:315px;padding:12px;background:#0B0B0E;border:1px solid rgba(202,211,245,0.16);color:#CAD3F5;font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable",Pretendard,"Segoe UI",sans-serif;font-size:12px;z-index:99999;user-select:none;app-region:no-drag;-webkit-app-region:no-drag;`;

        const renderBucket = (title, pct, ts) => {
          if (pct === null || pct === undefined) return '';
          const barColor = pct < 20 ? '#f87171' : '#A0A3F6';
          return `<div class="bucket-row" style="margin-top:6px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span style="color:#CAD3F5;opacity:0.9;">${title}</span><span class="bucket-timer" ${ts ? `data-target-ts="${ts}"` : ''} style="color:#8A93B2;font-size:10.5px;font-variant-numeric:tabular-nums;">${ts ? formatCountdown(ts) : qs.checking}</span></div><div style="display:flex;align-items:center;gap:8px;"><div class="progress-bar-bg" style="flex:1;height:5px;border-radius:9999px;background:rgba(202,211,245,0.12);overflow:hidden;"><div class="progress-bar-fill" style="width:${Math.max(0, Math.min(100, pct))}%;height:100%;background:${barColor};border-radius:9999px;"></div></div><span style="font-size:11px;font-weight:700;color:${pct < 20 ? '#f87171' : '#CAD3F5'};min-width:32px;text-align:right;">${pct}%</span></div></div>`;
        };

        const cardsHtml = groupsList.map(g => {
          const rows = renderBucket(qs.h5Full, g.h5, g.h5TargetTs) + renderBucket(qs.weeklyFull, g.weekly, g.weeklyTargetTs);
          const vals = [g.h5, g.weekly].filter(v => typeof v === 'number');
          const isLow = vals.length > 0 && Math.min(...vals) < 20;
          const borderStyle = isLow ? 'background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.38);' : 'background:#121319;border:1px solid rgba(202,211,245,0.1);';
          return `<div class="group-card rounded-lg p-2.5 mb-2" style="${borderStyle}border-radius:8px;padding:8px 10px;margin-bottom:8px;"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><div style="display:inline-flex;align-items:center;gap:5px;"><span style="font-weight:600;font-size:12px;color:${isLow ? '#f87171' : g.color};">${g.label}</span>${g.id === currentActiveGroup ? `<span style="font-size:9.5px;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(160,163,246,0.15);color:#A0A3F6;border:1px solid rgba(160,163,246,0.45);">${qs.activeTag}</span>` : ''}</div><span style="font-size:10.5px;color:#8A93B2;max-width:185px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(g.models || []).join(', ')}</span></div>${rows || '<div style="font-size:11px;color:#8A93B2;margin-top:4px;">--</div>'}</div>`;
        }).join('');

        pop.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(202,211,245,0.1);"><span style="font-weight:600;font-size:12.5px;color:#CAD3F5;">${qs.title}</span><button id="antigravity-popover-refresh" title="${qs.refresh}" style="background:none;border:none;color:#8A93B2;cursor:pointer;padding:0;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg></button></div><div>${cardsHtml}</div><div style="margin-top:2px;padding-top:6px;text-align:right;border-top:1px solid rgba(202,211,245,0.1);"><button id="antigravity-open-models-settings" style="background:none;border:none;color:#A0A3F6;font-size:11px;font-weight:500;cursor:pointer;">${qs.openSettings}</button></div>`;
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
            stopCountdownTicker();
            if (window.__TSR_ROUTER__) window.__TSR_ROUTER__.navigate({ search: prev => ({ ...prev, settingsOpen: true, settingsScreen: 'Models' }) });
          };
        }
      }

      document.addEventListener('click', (e) => {
        const pop = document.getElementById('antigravity-quota-popover');
        const widget = document.getElementById('antigravity-quota-widget');
        if (pop && (!pop.contains(e.target)) && (!widget || !widget.contains(e.target))) closeQuotaPopover(pop);
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const pop = document.getElementById('antigravity-quota-popover');
          if (pop) closeQuotaPopover(pop);
        }
      });

      function renderWidget(container, parsed, isMenuBar = false) {
        const { argon, gemini, other } = parsed;
        const qs = getQuotaStrings();
        const isMac = navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const rightMargin = isMenuBar ? (isMac ? '20px' : '140px') : '8px';
        container.className = 'agy-quota-capsule';
        container.style.cssText = `display:${isQuotaWidgetVisible() ? 'inline-flex' : 'none'};align-items:center;gap:5px;padding:2px 7px;height:24px;margin-left:${isMenuBar ? 'auto' : '0'};margin-right:${rightMargin};background:#0B0B0E;border:1px solid rgba(202,211,245,0.18);border-radius:6px;color:#CAD3F5;app-region:no-drag;-webkit-app-region:no-drag;user-select:none;font-size:11px;font-weight:500;line-height:1;cursor:pointer;z-index:100;`;

        const renderDual = (g) => {
          const hasH5 = (g.h5 !== null && g.h5 !== undefined);
          const hasWk = (g.weekly !== null && g.weekly !== undefined);
          if (hasH5 && hasWk) return `<b style="color:${g.h5 < 20 ? '#f87171' : getStatusColor(g.h5 / 100)};">${g.h5}%</b><span style="opacity:0.38;font-size:9.5px;">/</span><b style="color:${g.weekly < 20 ? '#f87171' : getStatusColor(g.weekly / 100)};">${qs.weekly}${g.weekly}%</b>`;
          if (hasH5) return `<b style="color:${g.h5 < 20 ? '#f87171' : getStatusColor(g.h5 / 100)};">${g.h5}%</b>`;
          if (hasWk) return `<b style="color:${g.weekly < 20 ? '#f87171' : getStatusColor(g.weekly / 100)};">${qs.weekly}${g.weekly}%</b>`;
          return `<b style="color:#8A93B2;">--</b>`;
        };
        const renderBadge = (id, label, color, g, gid) => {
          const active = (gid === currentActiveGroup);
          const vals = [g.h5, g.weekly].filter(v => typeof v === 'number');
          const isLow = vals.length > 0 && Math.min(...vals) < 20;
          const borderCss = active ? 'border:1px solid rgba(160,163,246,0.5);background:rgba(160,163,246,0.14);' : (isLow ? 'background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.4);' : 'border:1px solid transparent;');
          const dot = active ? '<span style="width:4px;height:4px;border-radius:50%;background:#A0A3F6;display:inline-block;"></span>' : '';
          return `<div id="${id}" style="display:inline-flex;align-items:center;gap:3px;padding:2px 5px;border-radius:5px;${borderCss}">${dot}<span style="color:${isLow ? '#fca5a5' : (active ? '#A0A3F6' : color)};font-weight:${active ? '700' : '600'};">${label}</span>${renderDual(g)}</div>`;
        };

        container.innerHTML = `${renderBadge('antigravity-badge-argon', 'Argon', '#A0A3F6', argon, 'argon')}<span style="opacity:0.22;font-size:10px;">•</span>${renderBadge('antigravity-badge-gemini', 'Gemini', '#CAD3F5', gemini, 'gemini')}<span style="opacity:0.22;font-size:10px;">•</span>${renderBadge('antigravity-badge-other', 'Claude', '#8A93B2', other, 'other')}<button id="antigravity-quota-refresh-btn" title="${qs.refresh}" style="background:none;border:none;color:inherit;opacity:0.72;cursor:pointer;padding:0;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg></button>`;
        container.onclick = (e) => { e.stopPropagation(); toggleQuotaPopover(container, parsed); };
        const refBtn = container.querySelector('#antigravity-quota-refresh-btn');
        if (refBtn) refBtn.onclick = (e) => { e.stopPropagation(); updateQuotaWidget(true); };
      }

      function updateComposerModelQuota(parsedData, activeGroup) {
        try {
          const triggers = document.querySelectorAll('button[data-testid="model-selector-trigger"], [data-testid="model-selector-trigger"], .model-selector-trigger');
          if (!triggers || triggers.length === 0) return;
          const qs = getQuotaStrings();
          const currentParsed = parsedData || (getCachedQuota() ? parseGroups(getCachedQuota()) : null);

          for (const trigger of triggers) {
            const aria = trigger.getAttribute('aria-label') || '';
            const match = aria.match(/current:\s*([^\n,·]+)/i);
            const triggerText = (match && match[1]) ? match[1].trim() : (trigger.textContent || '').trim();
            const groupKey = resolveModelGroup(triggerText) || activeGroup || 'gemini';
            const grp = currentParsed ? currentParsed[groupKey] : null;

            let inlineBadge = trigger.querySelector('.antigravity-inline-model-quota');
            if (!inlineBadge) {
              inlineBadge = document.createElement('span');
              inlineBadge.className = 'antigravity-inline-model-quota';
              inlineBadge.style.cssText = 'display:inline-flex;align-items:center;gap:3.5px;height:19px;padding:0 7px;margin-left:5px;margin-right:2px;border-radius:9999px;font-family:-apple-system,BlinkMacSystemFont,"Pretendard Variable",Pretendard,"Segoe UI",sans-serif;font-size:11px;font-weight:700;line-height:1;cursor:pointer;user-select:none;white-space:nowrap;flex-shrink:0;vertical-align:middle;';
              if (trigger.lastChild) trigger.insertBefore(inlineBadge, trigger.lastChild);
              else trigger.appendChild(inlineBadge);
            }

            inlineBadge.onclick = (e) => {
              e.stopPropagation();
              e.preventDefault();
              const latest = lastQuotaData || getCachedQuota();
              if (latest) toggleQuotaPopover(inlineBadge, parseGroups(latest));
            };

            const brandColor = grp?.color || '#A0A3F6';
            const hasH5 = (grp && grp.h5 !== null && grp.h5 !== undefined);
            const hasWk = (grp && grp.weekly !== null && grp.weekly !== undefined);
            let valHtml = '<span style="color:#8A93B2;font-size:10px;">--</span>';
            let isLow = false;
            if (hasH5 && hasWk) {
              valHtml = `<span style="color:${grp.h5 < 20 ? '#f87171' : getStatusColor(grp.h5 / 100)};">${grp.h5}%</span><span style="opacity:0.35;margin:0 1.5px;">/</span><span style="color:${grp.weekly < 20 ? '#f87171' : getStatusColor(grp.weekly / 100)};">${qs.weekly}${grp.weekly}%</span>`;
              isLow = grp.h5 < 20 || grp.weekly < 20;
            } else if (hasH5) {
              valHtml = `<span style="color:${grp.h5 < 20 ? '#f87171' : getStatusColor(grp.h5 / 100)};">${grp.h5}%</span>`;
              isLow = grp.h5 < 20;
            } else if (hasWk) {
              valHtml = `<span style="color:${grp.weekly < 20 ? '#f87171' : getStatusColor(grp.weekly / 100)};">${qs.weekly}${grp.weekly}%</span>`;
              isLow = grp.weekly < 20;
            }
            inlineBadge.style.borderColor = isLow ? 'rgba(239,68,68,0.45)' : 'rgba(160,163,246,0.35)';
            inlineBadge.style.background = isLow ? 'rgba(239,68,68,0.16)' : '#0B0B0E';
            inlineBadge.style.color = '#CAD3F5';
            inlineBadge.innerHTML = `<span style="width:5px;height:5px;border-radius:50%;background:${isLow ? '#f87171' : brandColor};display:inline-block;"></span>${valHtml}`;
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
    }
  }

  function init() {
    runTranslation();
    setupGsapGlobalInteractions();
    injectMainWorldQuotaWidget();
    injectQuickLanguageButton();
    setTimeout(() => checkEnhancerGithubUpdate(false), 2500);
    setInterval(() => checkEnhancerGithubUpdate(true), 3600000);

    const observer = new MutationObserver((mutations) => {
      if (isImeComposing) return;
      if (activeLanguage !== 'en') {
        for (const m of mutations) {
          if (isInputOrEditable(m.target)) continue;
          if (m.type === 'childList') {
            for (const node of m.addedNodes) {
              if (!isInputOrEditable(node)) translateNode(node);
            }
          } else {
            translateNode(m.target);
          }
        }
      }
      scheduleInjectLanguageSetting();
      scheduleInjectQuickLanguageButton();
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
      }
    }, 2000);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
