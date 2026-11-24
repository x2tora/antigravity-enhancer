# Changelog

All notable changes to **Antigravity Enhancer** are documented in this file.
Older pre-v3 legacy patch logs have been consolidated into milestone summaries below.

## [4.0.6] - 2026-11-24

### Added
- **Localized In-App Changelog**: Added per-language `<details>` localization support in `CHANGELOG.md` and the in-app Changelog viewer across all 9 supported languages.
- **UI & Dynamic Translation Expansion**: Added 9 missing UI strings (`Scroll turns up/down`, `Open Diff`, `Edit Conversation Title`, `Inspect element to comment`, `Set up`, `Your This Computer setting`, `This Conversation`, `Only this conversation uses this preset.`) and enabled nested capture-group translation inside `dynamicRules`.

### Fixed
- **Updater Button & Instant Relaunch**: Added tag-ref manifest fallback when `main` branch CDN cache lags behind GitHub Releases, added a release-page fallback button, and made in-app updates automatically relaunch Antigravity upon completion.
- **Translation & Collector Fixes**: Fixed empty `rep` templates on weekly/5-hour quota limit rules, corrected `Select an option...` Korean translation, and filtered `localhost`/IPv4:port noise from the untranslated collector.

<details>
<summary>한국어</summary>

### 추가됨
- **인앱 변경 기록 다국어 지원**: `CHANGELOG.md` 및 인앱 변경 기록 뷰어가 지원하는 9개 언어 전체를 `<details>` 블록으로 표시하도록 개선했습니다.
- **UI 및 동적 번역 확장**: 누락된 UI 문구 9종(`Scroll turns up/down`, `Open Diff`, `Edit Conversation Title`, `Inspect element to comment`, `Set up`, `Your This Computer setting`, `This Conversation`, `Only this conversation uses this preset.`)을 추가하고 동적 규칙 캡처 그룹(`$1`, `$2`) 하위 번역을 지원합니다.

### 수정됨
- **업데이트 버튼 미표시 및 즉시 재시작**: `main` 브랜치 CDN 캐시 지연 시 릴리스 태그 기준 `manifest.json`으로 폴백하도록 수정하고, 업데이트 완료 후 자동으로 재시작되도록 변경했습니다.
- **번역 사전 및 수집기 수정**: 주간/5시간 한도 동적 규칙의 누락된 치환값과 `Select an option...` 번역을 수정하고, `localhost`/IP:포트 노이즈를 수집기에서 제외했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **アプリ内変更履歴の多言語対応**: `CHANGELOG.md` とアプリ内変更履歴ビューアが対応する全9言語で表示されるようになりました。
- **UIおよび動的翻訳の拡張**: 未翻訳UI文字列9件を追加し、動的ルール内のキャプチャグループ翻訳に対応しました。

### 修正
- **更新ボタン表示と即時再起動**: `main` ブランチのCDNキャッシュ遅延時にリリースタグのマニフェストへフォールバックし、更新完了後に自動で再起動するようにしました。
- **翻訳辞書と収集フィルターの修正**: 週間/5時間制限ルールの欠落した置換テンプレートと `Select an option...` を修正し、`localhost`/IP:ポートのノイズを除外しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **应用内更新日志多语言支持**：`CHANGELOG.md` 及应用内更新日志查看器现支持全部 9 种语言的本地化显示。
- **UI 与动态翻译扩展**：新增 9 条界面词条，并支持动态正则规则捕获组的嵌套翻译。

### 修复
- **更新按钮显示与自动重启**：当 `main` 分支 CDN 缓存滞后时自动回退至发布标签清单，并在应用内更新完成后自动重启应用。
- **词典与收集器修复**：修复每周/5小时配额规则缺失的替换模板及 `Select an option...` 翻译，并过滤 `localhost`/IP:端口噪点。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **應用程式內更新日誌多語言支援**：`CHANGELOG.md` 與應用程式內更新日誌檢視器現支援全部 9 種語言的在地化顯示。
- **UI 與動態翻譯擴充**：新增 9 條介面詞條，並支援動態正則規則擷取群組的巢狀翻譯。

### 修復
- **更新按鈕顯示與自動重新啟動**：當 `main` 分支 CDN 快取延遲時自動回退至發佈標籤清單，並在套用更新後自動重新啟動應用程式。
- **詞典與收集器修復**：修復每週/5小時配額規則遺失的替換範本及 `Select an option...` 翻譯，並過濾 `localhost`/IP:連接埠雜訊。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Historial de cambios localizado**: Se añadió soporte multilenguaje en `CHANGELOG.md` y en el visor integrado para los 9 idiomas compatibles.
- **Expansión de traducciones**: Se añadieron 9 cadenas de interfaz faltantes y traducción anidada de grupos capturados en reglas dinámicas.

### Corregido
- **Botón de actualización y reinicio automático**: Se agregó respaldo por etiqueta de lanzamiento cuando la caché CDN de `main` se retrasa y reinicio automático tras completar la actualización.
- **Correcciones de diccionario y colector**: Se restauraron plantillas faltantes en reglas de cuota y se filtró ruido de `localhost`/IP:puerto.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Journal des modifications localisé** : Prise en charge multilingue de `CHANGELOG.md` et de la visionneuse intégrée pour les 9 langues prises en charge.
- **Extension des traductions** : Ajout de 9 chaînes d’interface manquantes et traduction imbriquée des groupes capturés dans les règles dynamiques.

### Corrigé
- **Bouton de mise à jour et redémarrage automatique** : Repli sur le manifeste du tag de version lorsque le cache CDN de `main` est en retard, et redémarrage automatique après la mise à jour.
- **Correctifs du dictionnaire et du collecteur** : Correction des modèles manquants sur les règles de quota et filtrage du bruit `localhost`/IP:port.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Lokalisierter Änderungsverlauf**: Mehrsprachige Unterstützung in `CHANGELOG.md` und im integrierten Changelog-Viewer für alle 9 unterstützten Sprachen.
- **Erweiterte Übersetzungen**: 9 fehlende UI-Texte ergänzt und verschachtelte Übersetzung von Capture-Gruppen in dynamischen Regeln aktiviert.

### Behoben
- **Update-Button & automatischer Neustart**: Tag-Manifest-Fallback bei verzögertem `main`-CDN-Cache sowie automatischer Neustart nach abgeschlossenem In-App-Update.
- **Wörterbuch- & Collector-Korrekturen**: Fehlende `rep`-Vorlagen bei Kontingent-Regeln behoben und `localhost`/IP:Port-Rauschen herausgefiltert.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Локализованный журнал изменений**: Поддержка всех 9 языков в `CHANGELOG.md` и встроенном просмотре истории изменений.
- **Расширение переводов**: Добавлены 9 недостающих строк интерфейса и вложенный перевод групп захвата в динамических правилах.

### Исправлено
- **Кнопка обновления и автоперезапуск**: Резервная загрузка манифеста по тегу релиза при задержке CDN-кеша `main` и автоматический перезапуск после обновления.
- **Исправления словаря и сборщика**: Восстановлены шаблоны замены в правилах квот и отфильтрован шум `localhost`/IP:порт.

</details>

---

## [4.0.5] - 2026-11-24

### Changed
- **Quota Group Simplification**: Removed the separate `Argon` quota group from the top-bar widget, quota popover, 72h history tracking, and quota alerts; consolidated quota display into `Gemini` and `Other`.

<details>
<summary>한국어</summary>

### 변경됨
- **할당량 그룹 간소화**: 상단 위젯, 할당량 팝오버, 72시간 기록 및 알림에서 분리되어 있던 `Argon` 그룹을 제거하고 `Gemini`와 `Other`로 통합했습니다.

</details>

<details>
<summary>日本語</summary>

### 変更
- **クォータグループの簡素化**: 上部ウィジェット、クォータポップオーバー、72時間履歴および通知から `Argon` グループを削除し、`Gemini` と `Other` に統合しました。

</details>

<details>
<summary>简体中文</summary>

### 变更
- **配额分组简化**：从顶部组件、配额弹窗、72小时历史及提醒中移除了独立的 `Argon` 分组，统一合并为 `Gemini` 与 `Other`。

</details>

<details>
<summary>繁體中文</summary>

### 變更
- **配額分組簡化**：從頂部元件、配額彈窗、72小時歷史及提醒中移除了獨立的 `Argon` 分組，統一合併為 `Gemini` 與 `Other`。

</details>

<details>
<summary>Español</summary>

### Cambiado
- **Simplificación de grupos de cuota**: Se eliminó el grupo separado `Argon` del widget superior, historial de 72 h y alertas, unificándolo en `Gemini` y `Other`.

</details>

<details>
<summary>Français</summary>

### Modifié
- **Simplification des groupes de quota** : Suppression du groupe `Argon` du widget supérieur, de l’historique 72 h et des alertes ; consolidation dans `Gemini` et `Other`.

</details>

<details>
<summary>Deutsch</summary>

### Geändert
- **Vereinfachung der Kontingentgruppen**: Separate `Argon`-Gruppe aus Widget, Popover, 72h-Verlauf und Benachrichtigungen entfernt und in `Gemini` sowie `Other` zusammengeführt.

</details>

<details>
<summary>Русский</summary>

### Изменено
- **Упрощение групп квот**: Отдельная группа `Argon` удалена из виджета, истории за 72 ч и уведомлений; квоты объединены в `Gemini` и `Other`.

</details>

---

## [4.0.4.1] - 2026-11-24

### Changed
- **Silent Auto-Repatch Execution**: Replaced `powershell.exe` invocation in `auto-repatch.vbs` with direct `Antigravity.exe` execution under `ELECTRON_RUN_AS_NODE=1` after a WMI process check, eliminating periodic terminal/PowerShell window popups.
- **Auto-Repatch Schedule Interval**: Changed `AntigravityEnhancerAutoRepatch` scheduled task interval from every 5 minutes to every 1 hour (`/SC HOURLY /MO 1`).

<details>
<summary>한국어</summary>

### 변경됨
- **자동 재패치 무창 실행**: `auto-repatch.vbs`에서 `powershell.exe` 실행을 제거하고 WMI 프로세스 확인 후 `ELECTRON_RUN_AS_NODE=1` 모드로 `Antigravity.exe`를 직접 실행하도록 변경해 주기적인 창 깜빡임을 없앴습니다.
- **패치 점검 주기 변경**: `AntigravityEnhancerAutoRepatch` 예약 작업 실행 주기를 5분에서 1시간 간격으로 변경했습니다.

</details>

<details>
<summary>日本語</summary>

### 変更
- **自動再パッチのサイレント実行**: `auto-repatch.vbs` から `powershell.exe` 呼び出しを削除し、`ELECTRON_RUN_AS_NODE=1` で `Antigravity.exe` を直接起動するように変更しました。
- **再パッチ間隔の変更**: `AntigravityEnhancerAutoRepatch` の実行間隔を5分から1時間に変更しました。

</details>

<details>
<summary>简体中文</summary>

### 变更
- **静默自动重打补丁**：移除 `auto-repatch.vbs` 中的 `powershell.exe` 调用，改为在 WMI 检查后以 `ELECTRON_RUN_AS_NODE=1` 直接启动 `Antigravity.exe`，消除弹窗闪烁。
- **计划任务周期调整**：将 `AntigravityEnhancerAutoRepatch` 计划任务频率从每 5 分钟调整为每 1 小时。

</details>

<details>
<summary>繁體中文</summary>

### 變更
- **靜默自動重新修補**：移除 `auto-repatch.vbs` 中的 `powershell.exe` 呼叫，改為以 `ELECTRON_RUN_AS_NODE=1` 直接啟動 `Antigravity.exe`，消除視窗閃爍。
- **排程週期調整**：將 `AntigravityEnhancerAutoRepatch` 排程頻率從每 5 分鐘調整為每 1 小時。

</details>

<details>
<summary>Español</summary>

### Cambiado
- **Reparcheo automático silencioso**: Se reemplazó `powershell.exe` en `auto-repatch.vbs` por ejecución directa de `Antigravity.exe` con `ELECTRON_RUN_AS_NODE=1`.
- **Intervalo de programación**: Se cambió `AntigravityEnhancerAutoRepatch` de cada 5 minutos a cada 1 hora.

</details>

<details>
<summary>Français</summary>

### Modifié
- **Ré-application silencieuse** : Remplacement de `powershell.exe` dans `auto-repatch.vbs` par l’exécution directe d’`Antigravity.exe` sous `ELECTRON_RUN_AS_NODE=1`.
- **Intervalle de planification** : Passage de la tâche `AntigravityEnhancerAutoRepatch` de 5 minutes à 1 heure.

</details>

<details>
<summary>Deutsch</summary>

### Geändert
- **Lautloses Auto-Repatch**: `powershell.exe` in `auto-repatch.vbs` durch direkten Aufruf von `Antigravity.exe` mit `ELECTRON_RUN_AS_NODE=1` ersetzt.
- **Zeitplan-Intervall**: `AntigravityEnhancerAutoRepatch` von 5 Minuten auf 1 Stunde umgestellt.

</details>

<details>
<summary>Русский</summary>

### Изменено
- **Тихое авто-перепатчивание**: Вызов `powershell.exe` в `auto-repatch.vbs` заменён прямым запуском `Antigravity.exe` с `ELECTRON_RUN_AS_NODE=1`.
- **Интервал планировщика**: Период задачи `AntigravityEnhancerAutoRepatch` изменён с 5 минут на 1 час.

</details>

---

## [4.0.4] - 2026-11-23

### Added
- **SSH Host, Automations & Marketplace Translations**: Added 44 static UI strings (352 entries across 8 languages) covering SSH Host connection dialogs, Automations/Scheduled runs, Terminal header/input, Side Question prompts, and Marketplace categories/descriptions, plus 14 dynamic regex rules × 8 languages (`Install ...`, `Add ...`, `Details for ...`, `More actions for ...`, `Plugins in ...`, `See more in ...`, `See N more ...`, `N tools disabled`, `Filter skills and rules: ...`, `Today ...`, `Daily at ...`).

### Improved
- **Collector Filtering**: Excluded repeated-character terminal measurements (`WWWW...`), `user@host:port`, `PowerShell 7.6.10`, marketplace plugin brand names, 6+ digit CI run IDs, and dynamic marketplace/automation patterns.

<details>
<summary>한국어</summary>

### 추가됨
- **SSH 호스트 · 자동화 · 마켓플레이스 번역**: SSH 호스트 연결, 자동화/예약 실행, 터미널, 마켓플레이스 카테고리 관련 정적 UI 문구 44종 및 8개 언어 동적 정규식 규칙 14종을 추가했습니다.

### 개선됨
- **수집기 필터링**: 반복 문자 측정값(`WWWW...`), `user@host:port`, 플러그인 브랜드명, 6자리 이상 CI 실행 ID 등을 미번역 수집기에서 제외했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **SSHホスト・自動化・マーケットプレイス翻訳**: 静的UI文字列44件および動的正規表現ルール14件を全8言語に追加しました。

### 改善
- **収集フィルター**: ターミナル測定文字列や `user@host:port`、ブランド名、CI実行IDを除外しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **SSH 主机、自动化与插件市场翻译**：新增 44 条静态词条及 14 条动态正则规则（覆盖全部 8 种目标语言）。

### 改进
- **收集器过滤**：排除终端测量字符、`user@host:port`、插件品牌名及 6 位以上 CI 运行 ID。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **SSH 主機、自動化與外掛市集翻譯**：新增 44 條靜態詞條及 14 條動態正則規則（涵蓋全部 8 種目標語言）。

### 改進
- **收集器過濾**：排除終端測量字元、`user@host:port`、外掛品牌名及 6 位以上 CI 執行 ID。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Traducciones de SSH, Automatizaciones y Marketplace**: 44 cadenas estáticas y 14 reglas dinámicas en los 8 idiomas.

### Mejorado
- **Filtrado del colector**: Exclusión de mediciones de terminal, `user@host:port`, marcas e IDs de CI.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Traductions SSH, Automatisations et Marketplace** : 44 chaînes statiques et 14 règles dynamiques sur 8 langues.

### Amélioré
- **Filtrage du collecteur** : Exclusion des mesures terminal, `user@host:port`, marques et identifiants CI.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **SSH-, Automatisierungs- & Marketplace-Übersetzungen**: 44 statische Texte und 14 dynamische Regeln in 8 Sprachen ergänzt.

### Verbessert
- **Collector-Filterung**: Terminal-Messzeilen, `user@host:port`, Markennamen und CI-IDs ausgeschlossen.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Переводы SSH, автоматизации и маркетплейса**: 44 статические строки и 14 динамических правил для 8 языков.

### Улучшено
- **Фильтрация сборщика**: Исключены тестовые строки терминала, `user@host:port`, названия брендов и ID сборок CI.

</details>

---

## [4.0.3] - 2026-11-23

### Added
- **Viewer, Subagent & Dynamic Counter Translations**: Added 18 static UI translations (`View File`, `Viewing Diff`, `Side Questions`, `Fold code block`, `Unread`, `Queued message sent`, `Subagent Conversation`, `User cancelled agent execution`, `Chat Layout`, `Zoom 100%, reset to fit`, `Download image`, `Low`/`Medium`/`High`, model descriptions) and 24 dynamic regex rules (`lines added, lines removed`, `excluded`, `active and archived conversations`) across all 8 target languages.

### Improved
- **Patch Settings Modal Centering & Glossary Grid Layout**: Removed external `.agy-overlay` class interference and enforced explicit viewport centering (`100vw × 100vh`) so Patch Settings always centers horizontally; switched the custom glossary add row to CSS Grid (`minmax(0, 1fr) minmax(0, 1fr) auto`) with `white-space: nowrap` to prevent button wrapping or overflow; unified the Settings page `AntigravityEnhanced` card into a single `패치 설정` button.
- **Collector Noise Filtering**: Excluded quoted code literals (`'fs'`), MCP tool IDs (`mcp:rea:...`), leading-ellipsis fragments (`…`), code comments (`// ...`), model names (`Claude Opus/Sonnet 5.5`), and `Delete side question:` titles.

<details>
<summary>한국어</summary>

### 추가됨
- **뷰어 · 서브에이전트 · 동적 카운터 번역**: 파일/Diff 뷰어, 사이드 질문, 줌/이미지 다운로드, 변경 라인 수 및 활성/보관 대화 수 등 18개 정적 문구와 24개 동적 규칙을 추가했습니다.

### 개선됨
- **패치 설정 모달 중앙 정렬 및 용어집 레이아웃**: `100vw × 100vh` 기준 가로 중앙 정렬을 보장하고 커스텀 용어집 입력 행을 CSS Grid로 정비했습니다.
- **수집기 노이즈 필터링**: 코드 리터럴, MCP 도구 ID, 말줄임 조각, 주석, 모델명 등을 제외했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **ビューア・サブエージェント・動的カウンター翻訳**: 静的文字列18件と動的ルール24件を追加しました。

### 改善
- **設定モーダル中央配置と用語集グリッド**: モーダルの中央配置と用語集入力行のレイアウトを改善しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **查看器、子代理与动态计数翻译**：新增 18 条静态词条与 24 条动态规则。

### 改进
- **设置弹窗居中与术语表布局**：修复弹窗水平居中及术语表按钮换行问题，并增强噪点过滤。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **檢視器、子代理與動態計數翻譯**：新增 18 條靜態詞條與 24 條動態規則。

### 改進
- **設定彈窗置中與詞彙表版面**：修正彈窗水平置中與詞彙表按鈕換行問題，並強化雜訊過濾。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Traducciones de visor, subagente y contadores**: 18 cadenas estáticas y 24 reglas dinámicas en 8 idiomas.

### Mejorado
- **Centrado del modal y diseño del glosario**: Centrado horizontal exacto y filtros de ruido ampliados.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Traductions visionneuse, sous-agent et compteurs** : 18 chaînes statiques et 24 règles dynamiques.

### Amélioré
- **Centrage de la fenêtre et grille du glossaire** : Centrage garanti et filtrage de bruit renforcé.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Viewer-, Subagent- & Zähler-Übersetzungen**: 18 statische Texte und 24 dynamische Regeln ergänzt.

### Verbessert
- **Modal-Zentrierung & Glossar-Layout**: Horizontale Zentrierung korrigiert und Rauschfilter erweitert.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Переводы просмотрщика, субагента и счётчиков**: 18 статических строк и 24 динамических правила.

### Улучшено
- **Центрирование окна и сетка глоссария**: Исправлено выравнивание и расширена фильтрация шума.

</details>

---

## [4.0.2] - 2026-11-23

### Added
- **Expanded UI & Dynamic Pattern Translations**: Added 34 static UI strings (251 entries across 8 languages) including `Orchestrator Settings`, `Interface Layout`, `Give Feedback`, `Side Question header`, `File Viewer header`, `Raw`, `System`/`Light`/`Dark`, color pickers, and customization loading states, plus 9 dynamic pattern rules × 8 languages (`Shortcut ... for ...`, `Remove shortcut ... for ...`, `Add shortcut for ...`, `Send feedback as ...`, `N active conversations`, `Rules/Skills/Subagents/Mcp Tools: N tokens`).

### Improved
- **Untranslated Collector Noise Filtering**: Excluded email addresses, trailing-slash folder names, CSS size units (`14px`), standalone key names, `Side Question:` titles, model names (`Gemini 4 Neon`/`Hydrogen`), split markdown/changelog fragments, and versioned commit/agent logs.

<details>
<summary>한국어</summary>

### 추가됨
- **UI 및 동적 패턴 번역 확장**: `Orchestrator Settings`, `Interface Layout`, `Give Feedback`, 색상 선택기 등 34개 정적 문구와 단축키/토큰 카운터 등 9개 동적 규칙을 추가했습니다.

### 개선됨
- **미번역 수집기 필터링 강화**: 이메일, 폴더명(`/`), CSS 단위(`14px`), 단독 키 이름, 모델명, 분할된 마크다운 조각을 제외했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **UIおよび動的パターン翻訳の拡張**: 静的文字列34件と動的パターン9件を8言語に追加しました。

### 改善
- **収集ノイズフィルタリング**: メールアドレスやCSS単位、モデル名などを除外しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **UI 与动态模式翻译扩展**：新增 34 条静态词条与 9 条动态规则。

### 改进
- **收集器噪点过滤**：排除邮箱、目录名、CSS 单位、模型名及 Markdown 片段。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **UI 與動態模式翻譯擴充**：新增 34 條靜態詞條與 9 條動態規則。

### 改進
- **收集器雜訊過濾**：排除信箱、目錄名稱、CSS 單位、模型名稱與 Markdown 片段。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Expansión de traducciones de interfaz**: 34 cadenas estáticas y 9 reglas dinámicas en 8 idiomas.

### Mejorado
- **Filtrado de ruido**: Exclusión de correos, unidades CSS, nombres de modelos y fragmentos Markdown.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Extension des traductions UI** : 34 chaînes statiques et 9 règles dynamiques sur 8 langues.

### Amélioré
- **Filtrage du bruit** : Exclusion des e-mails, unités CSS, noms de modèles et fragments Markdown.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Erweiterte UI- & Muster-Übersetzungen**: 34 statische Texte und 9 dynamische Regeln ergänzt.

### Verbessert
- **Rauschfilterung**: E-Mails, CSS-Einheiten, Modellnamen und Markdown-Fragmente ausgeschlossen.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Расширенные переводы интерфейса**: 34 статические строки и 9 динамических правил.

### Улучшено
- **Фильтрация шума**: Исключены адреса почты, единицы CSS, названия моделей и фрагменты Markdown.

</details>

---

## [4.0.1] - 2026-11-23

### Added
- **Full 9-Language Typography & Webfont Stack**: Added per-language font prioritization and webfont stylesheets (`Pretendard Variable`, `Pretendard JP Variable`, `Noto Sans SC`, `Noto Sans TC`, `Noto Sans`) with native OS fallbacks so Korean, Japanese, Simplified/Traditional Chinese, Cyrillic (Russian), and European languages render cleanly without mixed CJK glyphs.

### Improved
- **Centered Max-Height Modal Anchor**: Positioned Patch Settings (`#ag-enhancer-control-center`) so its maximum height (`min(86vh, 680px)`) sits vertically centered on screen while keeping the top edge fixed during height transitions.
- **Installer Logo & Discord Release Webhook**: Replaced the installer icon with the `antigravity.xitora.cc` mark (`assets/icon.png`, `assets/icon.ico`) and updated Discord release notifications with `AntigravityEnhancer` branding, custom avatar, `https://antigravity.xitora.cc` title link, and a `릴리스 다운로드` link button.

<details>
<summary>한국어</summary>

### 추가됨
- **9개 언어 전용 타이포그래피 및 웹폰트 스택**: 한국어(`Pretendard`), 일본어, 중국어 간체/번체, 키릴 문자 및 유럽어에 맞는 언어별 폰트 우선순위를 적용했습니다.

### 개선됨
- **모달 최대 높이 중앙 앵커**: 패치 설정 모달의 상단 기준점을 유지하면서 화면 세로 중앙에 안정적으로 배치했습니다.
- **설치 프로그램 로고 및 Discord 웹훅 개편**: `antigravity.xitora.cc` 아이콘과 브랜딩으로 교체했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **全9言語タイポグラフィ・Webフォント対応**: 各言語に最適化されたフォント優先順位とフォールバックを追加しました。

### 改善
- **モーダル配置とインストーラーロゴ**: モーダルの垂直位置を安定化し、アイコンとDiscord通知を刷新しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **全 9 种语言字体栈支持**：为简繁中文、韩日文及西里尔/欧洲语言配置专属字体优先级。

### 改进
- **弹窗定位与安装器图标**：优化弹窗垂直居中锚点，并更新安装器图标与 Discord 通知样式。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **全 9 種語言字體堆疊支援**：為繁簡中文、韓日文及西里爾/歐洲語言配置專屬字體優先順序。

### 改進
- **彈窗定位與安裝程式圖示**：優化彈窗垂直置中錨點，並更新圖示與 Discord 通知樣式。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Tipografía para los 9 idiomas**: Pila de fuentes web y del sistema por idioma.

### Mejorado
- **Anclaje del modal y logotipo**: Centrado vertical estable y nuevo icono del instalador.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Typographie pour 9 langues** : Polices web et système dédiées par langue.

### Amélioré
- **Ancrage de la fenêtre et logo** : Centrage vertical stable et nouvelle icône de l’installateur.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Typografie für alle 9 Sprachen**: Sprachspezifische Webfont- und System-Font-Stacks.

### Verbessert
- **Modal-Anker & Installer-Logo**: Stabile vertikale Zentrierung und aktualisiertes Logo.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Типографика для всех 9 языков**: Индивидуальный стек веб- и системных шрифтов.

### Улучшено
- **Позиционирование окна и логотип**: Стабильное центрирование и обновлённая иконка установщика.

</details>

---

## [4.0.0.1] - 2026-11-23

### Improved
- **Dynamic Patch Settings Sizing & Top-Anchored Modal**: Replaced fixed modal body height (`360px`) with dynamic `auto` height + smooth GSAP vertical height transitions, widened the modal (`540px` → `660px`), and anchored the modal to the top (`align-items: flex-start`) so tab positions never shift while switching tabs or expanding changelog cards.
- **Unclipped Changelog Cards & 4-Part Semver**: Added `flex-shrink: 0` to changelog cards so release notes never clip inside the flex container, and updated `compareSemver` and installer assembly versioning to support 4-segment versions (`4.0.0.1`).

<details>
<summary>한국어</summary>

### 개선됨
- **패치 설정 동적 높이 및 상단 고정**: 탭 전환 시 높이가 자연스럽게 변하되 탭 위치가 흔들리지 않도록 개선하고 너비를 `660px`로 확장했습니다.
- **변경 기록 카드 잘림 방지 및 4자리 버전 지원**: 카드 `flex-shrink: 0` 적용 및 4자리 세그먼트 버전(`4.0.0.1`) 비교를 지원합니다.

</details>

<details>
<summary>日本語</summary>

### 改善
- **設定モーダルの動的リサイズ**: タブ切替時の位置ズレを解消し、幅を `660px` に拡張しました。
- **変更履歴カードと4セグメントバージョン**: カードのクリップを防止し、4桁バージョンに対応しました。

</details>

<details>
<summary>简体中文</summary>

### 改进
- **弹窗动态高度与顶部锚定**：切换标签时保持标签栏位置固定，并将宽度扩展至 `660px`。
- **更新日志卡片防裁剪与四段版本号**：修复卡片裁剪并支持四段版本号比较。

</details>

<details>
<summary>繁體中文</summary>

### 改進
- **彈窗動態高度與頂部錨定**：切換分頁時維持分頁列位置固定，並將寬度擴展至 `660px`。
- **更新日誌卡片防裁剪與四段版本號**：修復卡片裁剪並支援四段版本號比較。

</details>

<details>
<summary>Español</summary>

### Mejorado
- **Altura dinámica del modal**: Transiciones suaves de altura sin desplazar las pestañas y soporte de versiones de 4 segmentos.

</details>

<details>
<summary>Français</summary>

### Amélioré
- **Hauteur dynamique de la fenêtre** : Transitions fluides sans décalage des onglets et prise en charge des versions à 4 segments.

</details>

<details>
<summary>Deutsch</summary>

### Verbessert
- **Dynamische Modal-Höhe**: Sanfte Höhenübergänge ohne Tab-Versatz sowie Unterstützung für 4-stellige Versionen.

</details>

<details>
<summary>Русский</summary>

### Улучшено
- **Динамическая высота окна**: Плавные переходы без смещения вкладок и поддержка 4-компонентных версий.

</details>

---

## [4.0.0] - 2026-11-23

### Added
- **Unified Patch Settings & Changelog Viewer**: Consolidated Update Check, Restore Original, and title-bar dropdown items into a unified **패치 설정 (`Patch Settings`)** modal with a dedicated in-app **Changelog** viewer (`CHANGELOG.md`), markdown release-notes rendering, and inline confirmation for **Clear 72h History**.
- **Native Right-Click Context Menu Localization**: Hooked Electron `Menu.buildFromTemplate` in `main-enhancer.js` and synced active language preferences between renderer and main process so project, group, and conversation right-click menus translate across all supported languages.
- **Enhanced UI Animations & Fixed-Height Layout**: Added GSAP entrance, sliding tab pill, horizontal content transitions, native-styled controls, and fixed modal height (`360px`) without layout shift.

### Improved
- **Untranslated Collector Noise Filtering**: Filtered out project names, conversation titles, file paths, brand/model names (`Antigravity`, `Argon`, `Gemini`), agent tool/step logs, and dynamic timers (`Still thinking, Ns`).
- **Dictionary Expansion**: Added 62 new static UI & context-menu entries (project/group/conversation menus, `Breadcrumb`, `Artifact Viewer header`, `Record Audio`, `Working`, `Walkthrough`) across all 8 target languages.

<details>
<summary>한국어</summary>

### 추가됨
- **통합 패치 설정 및 변경 기록 뷰어**: 업데이트 확인, 원본 복구, 용어집, 할당량, 단축키 설정을 **패치 설정** 모달로 통합하고 인앱 변경 기록 뷰어를 추가했습니다.
- **네이티브 우클릭 컨텍스트 메뉴 번역**: Electron `Menu.buildFromTemplate`을 후킹해 프로젝트/그룹/대화 우클릭 메뉴를 9개 언어로 번역합니다.
- **UI 애니메이션 개선**: GSAP 기반 모달 진입 및 탭 전환 애니메이션을 적용했습니다.

### 개선됨
- **사전 확장 및 노이즈 필터링**: 컨텍스트 메뉴 포함 62개 정적 UI 문구를 추가하고 비UI 노이즈 필터를 강화했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **統合パッチ設定と変更履歴ビューア**: 更新確認、復元、用語集、クォータ、ショートカットを1つのモーダルに統合しました。
- **右クリックメニューの多言語化**: Electron メニューテンプレートをフックして全言語で翻訳します。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **统一补丁设置与更新日志查看器**：整合更新检查、恢复原版、术语表、配额与快捷键设置。
- **原生右键菜单本地化**：拦截 Electron 菜单模板以翻译项目与对话右键菜单。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **統一修補設定與更新日誌檢視器**：整合更新檢查、還原原版、詞彙表、配額與快速鍵設定。
- **原生右鍵選單在地化**：攔截 Electron 選單範本以翻譯專案與對話右鍵選單。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Ajustes unificados y visor de cambios**: Modal unificado con historial de cambios integrado y traducción de menús contextuales nativos.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Paramètres unifiés et journal des modifications** : Fenêtre unifiée avec visionneuse intégrée et traduction des menus contextuels natifs.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Einheitliche Patch-Einstellungen & Changelog-Viewer**: Zentrales Modal mit integriertem Änderungsverlauf und Übersetzung nativer Kontextmenüs.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Единые настройки патча и просмотр истории**: Объединённое окно настроек и перевод нативных контекстных меню.

</details>

---

## [3.5.0 – 3.5.4] - 2026-11

### Added
- **Translation Engine 2.0**: Active-language IPC dictionary slicing, local custom glossary (`user-glossary.json`) with JSON Import/Export, and opt-in untranslated string collection.
- **Quota Intelligence**: 72-hour local ring-buffer persistence, 72h usage sparklines, compact quota card toggle, and opt-in low-quota / reset desktop alerts.
- **Control Center & Zero-Flash Auto-Repatch**: 9-language Control Center modal, custom keyboard shortcuts (`ev.code` fallback), `wscript.exe` zero-flash auto-repatch wrappers, and `auto-repatch-status.json` diagnostics.

<details>
<summary>한국어</summary>

### 추가됨
- **번역 엔진 2.0**: 활성 언어별 IPC 사전 슬라이싱, 로컬 커스텀 용어집(`user-glossary.json`) JSON 내보내기/가져오기, Opt-in 미번역 문자열 수집기를 추가했습니다.
- **할당량 인텔리전스**: 72시간 사용량 링 버퍼 저장, 스파크라인 그래프, 컴팩트 카드 및 저잔량/리셋 알림을 추가했습니다.
- **제어 센터 및 무창 자동 재패치**: 9개 언어 제어 센터, 사용자 지정 단축키, `wscript.exe` 무창 래퍼를 도입했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **翻訳エンジン 2.0 / クォータ分析 / コントロールセンター**: 言語別IPCスライシング、カスタム用語集、72時間履歴スパークライン、通知機能を追加しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **翻译引擎 2.0 / 配额分析 / 控制中心**：新增按语言 IPC 切片、自定义术语表、72 小时趋势图与桌面通知。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **翻譯引擎 2.0 / 配額分析 / 控制中心**：新增依語言 IPC 切片、自訂詞彙表、72 小時趨勢圖與桌面通知。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Motor de traducción 2.0 y analítica de cuota**: Glosario personalizado, historial de 72 h con gráficos y alertas de escritorio.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Moteur de traduction 2.0 et suivi des quotas** : Glossaire personnalisé, historique 72 h avec graphiques et alertes bureau.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Übersetzungs-Engine 2.0 & Kontingentanalyse**: Benutzerdefiniertes Glossar, 72h-Verlauf mit Sparklines und Desktop-Benachrichtigungen.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Движок перевода 2.0 и аналитика квот**: Пользовательский глоссарий, 72-часовая история со спарклайнами и уведомления.

</details>

---

## [3.3.0 – 3.4.3] - 2026-11

### Added
- **In-App Localized Release Notes**: Automatically displays GitHub release notes in the active app language inside the updater UI.
- **Antigravity 2.34.0 Compatibility**: Full UI/model compatibility, composer hover single-model quota separation, and improved installer palette (`#0B0B0E` / `#CAD3F5` / `#A0A3F6`).

<details>
<summary>한국어</summary>

### 추가됨
- **인앱 다국어 릴리스 노트**: 업데이터 UI에서 GitHub 릴리스 노트를 현재 앱 언어로 자동 표시합니다.
- **Antigravity 2.34.0 호환성**: UI/모델 호환성, 입력창 호버 단일 모델 할당량 분리 및 설치 프로그램 팔레트를 개선했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **アプリ内多言語リリースノート & 2.34.0 互換性**: アクティブ言語でのリリースノート表示と 2.34.0 UI に対応しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **应用内多语言发布说明与 2.34.0 兼容性**：支持按当前语言显示更新说明并兼容 2.34.0 界面。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **應用程式內多語言發佈說明與 2.34.0 相容性**：支援依目前語言顯示更新說明並相容 2.34.0 介面。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Notas de versión localizadas y compatibilidad 2.34.0**: Visualización automática en el idioma activo.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Notes de version localisées et compatibilité 2.34.0** : Affichage automatique dans la langue active.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Lokalisierte Release Notes & 2.34.0-Kompatibilität**: Automatische Anzeige in der aktiven Sprache.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Локализованные заметки о выпуске и совместимость с 2.34.0**: Автоматическое отображение на активном языке.

</details>

---

## [3.0.0 – 3.2.0] - 2026-11

### Added
- **Lossless ASAR v4 Micro-Bootstrapper**: Safe byte-identical original `app.asar` preservation, one-click vanilla restore, and modular `%APPDATA%\Antigravity\enhancer` runtime.
- **Secure In-App Self-Updater**: Strict GitHub allowlist (`x2tora/antigravity-enhancer`), SHA-256 manifest verification, atomic staging, and crash failsafe rollback.

<details>
<summary>한국어</summary>

### 추가됨
- **무손실 ASAR v4 마이크로 부트스트래퍼**: 바이트 단위 원본 `app.asar` 보존, 원클릭 원본 복구 및 모듈형 런타임을 도입했습니다.
- **보안 인앱 자가 업데이터**: GitHub 허용 목록 검증, SHA-256 무결성 확인, 원자적 스테이징 및 크래시 롤백을 구현했습니다.

</details>

<details>
<summary>日本語</summary>

### 追加
- **ロスレス ASAR v4 マイクロブートストラッパー & 安全な自己更新**: 元の `app.asar` の保存、ワンクリック復元、SHA-256 検証付きアップデータを実装しました。

</details>

<details>
<summary>简体中文</summary>

### 新增
- **无损 ASAR v4 微型引导程序与安全自更新**：支持原版无损保留、一键还原及 SHA-256 校验更新。

</details>

<details>
<summary>繁體中文</summary>

### 新增
- **無損 ASAR v4 微型引導程式與安全自更新**：支援原版無損保留、一鍵還原與 SHA-256 校驗更新。

</details>

<details>
<summary>Español</summary>

### Añadido
- **Micro-arrancador ASAR v4 sin pérdidas y autoactualizador seguro**: Restauración en un clic y verificación SHA-256.

</details>

<details>
<summary>Français</summary>

### Ajouté
- **Micro-amorceur ASAR v4 sans perte et mise à jour sécurisée** : Restauration en un clic et vérification SHA-256.

</details>

<details>
<summary>Deutsch</summary>

### Hinzugefügt
- **Verlustfreier ASAR v4 Micro-Bootstrapper & sicherer Updater**: Ein-Klick-Wiederherstellung und SHA-256-Verifizierung.

</details>

<details>
<summary>Русский</summary>

### Добавлено
- **Загрузчик ASAR v4 без потерь и безопасное автообновление**: Восстановление в один клик и проверка SHA-256.

</details>
