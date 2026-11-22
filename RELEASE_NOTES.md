# Antigravity Enhancer v4.0.0

## Changes

- **Unified Patch Settings & Changelog Viewer**: Consolidated Update Check, Restore Original, and title-bar dropdown items into **패치 설정 (`Patch Settings`)**, added a dedicated in-app **Changelog** viewer (`CHANGELOG.md`) with version cards, markdown release-notes rendering, GSAP animations, fixed modal height (`360px`), and inline confirmation for **Clear 72h History**.
- **Native Right-Click Context Menu Localization**: Hooked Electron `Menu.buildFromTemplate` and synced renderer/main active language preferences so project, group, and conversation right-click menus translate across all supported languages.
- **Smart Untranslated Collector & Dictionary Expansion**: Filtered out project names, conversation titles, file paths, brand/model names (`Antigravity`, `Argon`, `Gemini`), agent tool/step logs, and dynamic timers (`Still thinking, Ns`), and added 62 new static UI & context-menu translations across 8 languages.
- **Consolidated `CHANGELOG.md`**: Streamlined historical release logs into clean milestone summaries for v3.0.0–v4.0.0.

---

### Translations

<details>
<summary>한국어</summary>

- **패치 설정 통합 UI 및 변경 기록 뷰어**: 업데이트 확인·원본 복구 창과 중복 타이틀 메뉴를 **패치 설정** 모달로 통합하고, 지난 업데이트 기록까지 볼 수 있는 전용 **변경 기록 (`CHANGELOG.md`) 뷰어**, 마크다운 변경 로그 렌더링, GSAP 전환 애니메이션, 고정 높이(`360px`) 및 **72시간 기록 초기화 인라인 확인**을 추가했습니다.
- **네이티브 우클릭 컨텍스트 메뉴 번역**: Electron `Menu.buildFromTemplate` 후킹과 렌더러-메인 활성 언어 동기화를 통해 프로젝트·그룹·대화 우클릭 메뉴 56종이 선택 언어로 즉시 번역됩니다.
- **미번역 수집기 필터 고도화 및 사전 확장**: 프로젝트명, 대화 제목, 파일 경로, 브랜드/모델명(`Antigravity`, `Argon`, `Gemini`), 에이전트 작업 로그, 동적 타이머(`Still thinking, Ns`) 노이즈를 걸러내고 62개 신규 UI/컨텍스트 메뉴 번역을 추가했습니다.
- **`CHANGELOG.md` 정리 및 통합**: 오래된 초기 패치 기록을 정리하고 v3.0.0~v4.0.0 핵심 마일스톤으로 깔끔하게 통합했습니다.

</details>

<details>
<summary>日本語</summary>

- **パッチ設定統合 UI と変更履歴ビューア**: 更新確認・復元画面と重複メニューを **パッチ設定** に統合し、過去の更新履歴を確認できる専用 **変更履歴 (`CHANGELOG.md`) ビューア**、Markdown リリースノート描画、GSAP アニメーション、固定高さ、72時間履歴消去の確認手順を追加しました。
- **ネイティブ右クリックメニュー翻訳**: `Menu.buildFromTemplate` のフックと言語同期により、プロジェクト・グループ・会話の右クリックメニューを即時翻訳します。
- **未翻訳収集フィルター強化と辞書拡充**: プロジェクト名・ファイルパス・エージェントログ等のノイズを除外し、62個の新規 UI・メニュー翻訳を追加しました。

</details>

<details>
<summary>简体中文</summary>

- **统一补丁设置与更新日志查看器**：将更新检查与还原功能整合进 **补丁设置** 弹窗，新增专用 **更新日志 (`CHANGELOG.md`) 查看器**、Markdown 渲染、GSAP 动画、固定高度及清除 72 小时历史确认步骤。
- **原生右键菜单本地化**：通过拦截 `Menu.buildFromTemplate` 并同步活动语言，实现项目、分组和对话右键菜单的即时翻译。
- **未翻译收集过滤与词典扩展**：过滤项目名、路径与代理工具日志噪声，新增 62 条界面与右键菜单翻译。

</details>

<details>
<summary>繁體中文</summary>

- **統一修補設定與變更紀錄檢視器**：將檢查更新與還原功能整合進 **修補設定** 視窗，新增專用 **變更紀錄 (`CHANGELOG.md`) 檢視器**、Markdown 渲染、GSAP 動畫、固定高度及清除 72 小時歷史確認步驟。
- **原生右鍵選單在地化**：透過攔截 `Menu.buildFromTemplate` 並同步使用語言，實現專案、群組與對話右鍵選單的即時翻譯。
- **未翻譯收集過濾與詞典擴充**：過濾專案名稱、路徑與代理工具日誌雜訊，新增 62 筆介面與右鍵選單翻譯。

</details>

<details>
<summary>Español</summary>

- **Ajustes del parche unificados y visor de Changelog**: Se unificaron las ventanas de actualización y restauración, añadiendo un visor de **Changelog (`CHANGELOG.md`)**, renderizado Markdown, animaciones GSAP y confirmación para limpiar el historial de 72 h.
- **Traducción de menús contextuales nativos**: Traducción automática de los menús de clic derecho de proyectos, grupos y conversaciones mediante `Menu.buildFromTemplate`.
- **Filtro de textos y diccionario ampliado**: Filtrado de rutas y registros de agente, más 62 nuevas traducciones de UI y menú contextual.

</details>

<details>
<summary>Français</summary>

- **Paramètres du patch unifiés et visionneuse de Changelog** : Intégration des mises à jour/restauration, ajout d’une visionneuse **Changelog (`CHANGELOG.md`)**, rendu Markdown, animations GSAP et confirmation d’effacement de l’historique 72 h.
- **Traduction des menus contextuels natifs** : Traduction des menus clic droit de projets, groupes et conversations via `Menu.buildFromTemplate`.
- **Filtrage amélioré et dictionnaire étendu** : Exclusion des chemins/journaux d’agent et ajout de 62 traductions d’interface et menus contextuels.

</details>

<details>
<summary>Deutsch</summary>

- **Vereinheitlichte Patch-Einstellungen & Changelog-Viewer**: Update-Prüfung und Wiederherstellung integriert, eigener **Changelog (`CHANGELOG.md`)**-Viewer, Markdown-Rendering, GSAP-Animationen und Bestätigung beim Löschen des 72h-Verlaufs.
- **Native Kontextmenü-Übersetzung**: Rechtsklickmenüs für Projekte, Gruppen und Unterhaltungen über `Menu.buildFromTemplate` übersetzt.
- **Erweiterte Filter & Wörterbuch**: Projekt-/Pfad-/Agent-Log-Filterung sowie 62 neue UI- und Kontextmenü-Übersetzungen.

</details>

<details>
<summary>Русский</summary>

- **Единые настройки патча и просмотрщик Changelog**: Объединены проверка обновлений и восстановление, добавлен просмотрщик **Changelog (`CHANGELOG.md`)**, Markdown-рендеринг, GSAP-анимации и подтверждение сброса истории за 72 ч.
- **Перевод нативных контекстных меню**: Перевод контекстных меню проектов, групп и бесед через `Menu.buildFromTemplate`.
- **Улучшенная фильтрация и словарь**: Фильтрация путей и логов агента, плюс 62 новых перевода UI и контекстных меню.

</details>
