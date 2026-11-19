# Antigravity Enhancer v3.5.0

## Changes

- **Translation Engine 2.0**: Added active-language IPC slicing (`buildLanguageSlice`), custom user glossary overrides (`user-glossary.json`), opt-in untranslated string collector, and frame-batched `MutationObserver` DOM translation.
- **Quota Intelligence**: Added 72-hour local ring-buffer quota history (`quota-history.json`), burn-rate & time-to-empty ETA calculation, inline `#A0A3F6` SVG sparklines in the quota popover, and opt-in low-quota / reset desktop alerts.
- **Enhancer Control Center**: Added a unified 4-tab settings modal (`Control Center...` in the `AntigravityEnhanced` title menu) with custom shortcut remapping, glossary management, alert thresholds, and diagnostics.

---

### Translations

<details>
<summary>한국어</summary>

- **번역 엔진 2.0**: 활성 언어만 IPC로 전달하는 슬라이스 로딩(`buildLanguageSlice`), 사용자 커스텀 용어집(`user-glossary.json`), 미번역 문자열 수집(Opt-in), 프레임 배칭 `MutationObserver` 최적화를 추가했습니다.
- **할당량 인텔리전스**: 72시간 로컬 할당량 히스토리(`quota-history.json`), 소진 속도·고갈 예상 시간(ETA), 팝오버 인라인 `#A0A3F6` SVG 스파크라인 및 저잔량·리셋 데스크톱 알림(Opt-in)을 추가했습니다.
- **Control Center 통합 모달**: `AntigravityEnhanced` 타이틀 메뉴에 4탭 통합 설정 모달(`Control Center...`)을 추가해 커스텀 단축키 재지정, 용어집 편집, 알림 임계치, 시스템 진단을 지원합니다.

</details>

<details>
<summary>日本語</summary>

- **翻訳エンジン 2.0**: アクティブ言語のみを IPC 配信するスライス読み込み、カスタム用語集（`user-glossary.json`）、未翻訳文字列収集（Opt-in）、フレームバッチ処理 `MutationObserver` を追加しました。
- **クォータ・インテリジェンス**: 72時間ローカル履歴（`quota-history.json`）、消費速度・枯渇予測（ETA）、インライン SVG スパークライン、残量低下・リセット通知（Opt-in）を追加しました。
- **Control Center**: `AntigravityEnhanced` メニューに 4 タブ統合設定モーダルを追加し、ショートカット変更・用語集・通知しきい値・診断機能を提供します。

</details>

<details>
<summary>简体中文</summary>

- **翻译引擎 2.0**：新增按激活语言切片的 IPC 加载、自定义术语表（`user-glossary.json`）、未翻译文本收集（可选）及帧批处理 `MutationObserver` 优化。
- **配额智能分析**：新增 72 小时本地配额历史（`quota-history.json`）、消耗速率与耗尽 ETA 预测、弹窗内联 SVG 趋势线及低配额/重置桌面通知（可选）。
- **Control Center 控制中心**：在 `AntigravityEnhanced` 菜单中新增 4 标签页设置弹窗，支持自定义快捷键录制、术语管理、告警阈值与系统诊断。

</details>

<details>
<summary>繁體中文</summary>

- **翻譯引擎 2.0**：新增依啟用語言切片的 IPC 載入、自訂詞彙表（`user-glossary.json`）、未翻譯字串收集（選用）及影格批次處理 `MutationObserver` 最佳化。
- **配額智慧分析**：新增 72 小時本機配額歷史（`quota-history.json`）、消耗速率與耗盡 ETA 預測、彈窗內嵌 SVG 趨勢線及低配額/重設桌面通知（選用）。
- **Control Center 控制中心**：於 `AntigravityEnhanced` 選單新增 4 分頁設定視窗，支援自訂快捷鍵錄製、詞彙管理、警示閾值與系統診斷。

</details>

<details>
<summary>Español</summary>

- **Motor de traducción 2.0**: Carga IPC segmentada por idioma activo, glosario personalizado (`user-glossary.json`), recopilación opcional de textos sin traducir y `MutationObserver` por lotes de fotograma.
- **Inteligencia de cuota**: Historial local de 72 h (`quota-history.json`), tasa de consumo y ETA, minigráficos SVG inline y alertas de cuota baja o reinicio (opcionales).
- **Control Center**: Modal unificado de 4 pestañas en el menú `AntigravityEnhanced` con reasignación de atajos, gestión de glosario, umbrales y diagnósticos.

</details>

<details>
<summary>Français</summary>

- **Moteur de traduction 2.0** : Chargement IPC par tranche de langue active, glossaire personnalisé (`user-glossary.json`), collecte optionnelle des chaînes non traduites et `MutationObserver` groupé par image.
- **Intelligence de quota** : Historique local sur 72 h (`quota-history.json`), taux de consommation et ETA, sparklines SVG intégrés et alertes de seuil ou de réinitialisation (optionnelles).
- **Control Center** : Fenêtre unifiée à 4 onglets dans le menu `AntigravityEnhanced` pour raccourcis personnalisés, glossaire, seuils d'alerte et diagnostics.

</details>

<details>
<summary>Deutsch</summary>

- **Übersetzungs-Engine 2.0**: Aktives Sprach-Slicing per IPC, benutzerdefiniertes Glossar (`user-glossary.json`), optionale Erfassung unübersetzter Texte und Frame-gebatchter `MutationObserver`.
- **Quota-Intelligenz**: Lokaler 72-Stunden-Verlauf (`quota-history.json`), Verbrauchsrate & ETA-Prognose, Inline-SVG-Sparklines und optionale Schwellenwert-/Reset-Benachrichtigungen.
- **Control Center**: Einheitliches 4-Tab-Einstellungsmodal im Menü `AntigravityEnhanced` für benutzerdefinierte Shortcuts, Glossar, Warnschwellen und Diagnose.

</details>

<details>
<summary>Русский</summary>

- **Движок перевода 2.0**: Выборочная IPC-загрузка активного языка, пользовательский глоссарий (`user-glossary.json`), опциональный сбор непереведённых строк и покадровая пакетная обработка `MutationObserver`.
- **Аналитика квот**: Локальная 72-часовая история (`quota-history.json`), расчёт скорости расхода и ETA, встроенные SVG-спарклайны и опциональные уведомления о низком остатке/сбросе.
- **Control Center**: Единое окно настроек с 4 вкладками в меню `AntigravityEnhanced` для переназначения горячих клавиш, управления глоссарием и диагностики.

</details>
