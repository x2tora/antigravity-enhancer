# Antigravity Enhancer v3.5.4

## Changes

- **Control Center Full Wiring**: Added glossary JSON Export/Import, collected untranslated string viewer (Copy/Clear), Compact Quota Card toggle, Clear 72h History button, and 9-language dynamic modal re-localization (`CONTROL_CENTER_I18N`).
- **Auto-Repatch Diagnostics & Self-Healing Wrappers**: Added `user-data/auto-repatch-status.json` tracking in `auto-repatch.js` (shown in Control Center Diagnostics) and `ensureAutoRepatchWrappers()` in `main-enhancer.js` so in-app updates keep the zero-flash `.ps1`/`.vbs` wrappers synced.
- **Tier 2 E2E Coverage**: Added boundary tests for `ensureAutoRepatchWrappers`, `auto-repatch-status.json`, `ev.code` shortcut fallback, and 9-language Control Center localization.

---

### Translations

<details>
<summary>한국어</summary>

- **Control Center 기능 완성**: 커스텀 용어집 JSON 내보내기/가져오기, 수집된 미번역 문자열 보기·복사·비우기, 컴팩트 할당량 카드 토글, 72시간 기록 초기화 버튼 및 9개국어 실시간 모달 재번역을 추가했습니다.
- **자동 재패치 진단 및 래퍼 동기화**: `auto-repatch.js`가 마지막 점검 상태(`auto-repatch-status.json`)를 기록해 Control Center 진단 화면에 표시하며, `main-enhancer.js`가 인앱 업데이트 시에도 무창(`.ps1`/`.vbs`) 래퍼를 자동 보정합니다.
- **Tier 2 E2E 테스트 추가**: 래퍼 생성, 재패치 상태 저장, `ev.code` 단축키 폴백 및 9개국어 Control Center 현지화 경계 테스트를 추가했습니다.

</details>

<details>
<summary>日本語</summary>

- **Control Center 完全連携**: 用語集 JSON エクスポート/インポート、未翻訳リスト表示・コピー・消去、コンパクトカード切替、72時間履歴消去、9言語リアルタイム再翻訳を追加しました。
- **自動再パッチ診断・ラッパー同期**: `auto-repatch-status.json` 記録と診断表示、および `ensureAutoRepatchWrappers()` を追加しました。

</details>

<details>
<summary>简体中文</summary>

- **完善 Control Center 功能**：新增术语表 JSON 导出/导入、未翻译文本查看/复制/清空、紧凑配额卡片开关、清除 72 小时历史按钮及 9 种语言实时重译。
- **自动重打补丁诊断与同步**：新增 `auto-repatch-status.json` 状态记录与诊断展示，以及 `ensureAutoRepatchWrappers()` 自动同步。

</details>

<details>
<summary>繁體中文</summary>

- **完善 Control Center 功能**：新增詞彙表 JSON 匯出/匯入、未翻譯字串檢視/複製/清空、精簡配額卡片開關、清除 72 小時歷史按鈕及 9 種語言即時重譯。
- **自動重打修補診斷與同步**：新增 `auto-repatch-status.json` 狀態記錄與診斷顯示，以及 `ensureAutoRepatchWrappers()` 自動同步。

</details>

<details>
<summary>Español</summary>

- **Control Center completo**: Exportar/importar glosario JSON, visor de textos sin traducir, tarjeta compacta, limpiar historial de 72 h y localización dinámica en 9 idiomas.
- **Diagnóstico de auto-reparcheo**: Registro `auto-repatch-status.json` y sincronización automática de `auto-repatch.ps1`/`.vbs`.

</details>

<details>
<summary>Français</summary>

- **Control Center complet** : Export/import JSON du glossaire, liste des textes non traduits, mode carte compacte, effacement de l'historique 72 h et traduction dynamique en 9 langues.
- **Diagnostic d'auto-repatch** : Suivi `auto-repatch-status.json` et synchronisation des lanceurs `.ps1`/`.vbs`.

</details>

<details>
<summary>Deutsch</summary>

- **Control Center vervollständigt**: Glossar-JSON-Export/-Import, Liste unübersetzter Texte, kompakte Quota-Karten, 72h-Verlauf löschen und 9-Sprachen-Lokalisierung.
- **Auto-Repatch-Diagnose**: `auto-repatch-status.json` Status-Tracking und automatische `.ps1`/`.vbs`-Synchronisierung.

</details>

<details>
<summary>Русский</summary>

- **Полная интеграция Control Center**: Экспорт/импорт глоссария JSON, просмотр/копирование/очистка непереведённых строк, компактные карточки квот, сброс истории за 72 ч и локализация на 9 языков.
- **Диагностика авто-перепатча**: Запись `auto-repatch-status.json` и синхронизация обёрток `.ps1`/`.vbs`.

</details>
