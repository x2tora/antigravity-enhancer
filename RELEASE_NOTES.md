# Antigravity Enhancer v3.3.1

## Changes

- Localized in-app patch update release notes (`manifest.json` `releaseNotesI18n` and GitHub Release body parsing) to match the active in-app language across all 9 supported languages.
- Immediately re-renders an open Patch Update or Restore modal when the active UI language changes (`antigravity-lang-changed`).
- Immediately hides the top-bar `Update Available` pill as soon as an in-app update succeeds.
- Upgraded GitHub Actions workflow actions (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `action-gh-release@v3`) for Node.js 24.
- Removed unused legacy scripts and temporary files from the repository.

---

### Translations

<details>
<summary>한국어</summary>

- 인앱 패치 업데이트 창에 표시되는 변경사항(`manifest.json`의 `releaseNotesI18n` 및 GitHub 릴리즈 본문)이 현재 앱 내 언어(9개 국어)와 동일하게 표시되도록 개선했습니다.
- 업데이트 또는 원본 복구 창이 열려 있는 상태에서 언어를 변경(`antigravity-lang-changed`)하면 창 문구와 변경사항이 즉시 다시 렌더링되도록 수정했습니다.
- 인앱 패치 업데이트가 완료되면 창을 다시 로드하기 전에도 상단 바의 `업데이트 가능` 배지가 즉시 사라지도록 개선했습니다.
- GitHub Actions 워크플로 액션을 Node.js 24 호환 최신 메이저 버전(`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `action-gh-release@v3`)으로 업그레이드했습니다.
- 리포지토리 내 미사용 구버전 보조 스크립트와 임시 파일을 정리했습니다.

</details>

<details>
<summary>日本語</summary>

- アプリ内パッチ更新ダイアログに表示される変更点（`manifest.json` の `releaseNotesI18n` および GitHub Release 本文）が現在のアプリ内言語（9言語）で表示されるようにしました。
- 更新または復元モーダルを開いた状態で言語を切り替えた場合（`antigravity-lang-changed`）、モーダル内のテキストと変更点が即座に再描画されるようにしました。
- アプリ内更新が完了した時点で、ウィンドウを再読み込みする前でも上部バーの `アップデート可能` ピルが即座に非表示になるようにしました。
- GitHub Actions ワークフローのアクションを Node.js 24 対応バージョン（`checkout@v7`、`setup-node@v7`、`upload-artifact@v7`、`action-gh-release@v3`）へ更新しました。
- リポジトリ内の未使用スクリプトおよび一時ファイルを整理しました。

</details>

<details>
<summary>简体中文</summary>

- 将应用内补丁更新弹窗显示的更新说明（`manifest.json` 中的 `releaseNotesI18n` 及 GitHub Release 正文）适配为随当前应用语言（9 种语言）自动切换显示。
- 当更新或恢复弹窗处于打开状态时切换语言（`antigravity-lang-changed`），弹窗文案与更新说明会立即重新渲染。
- 应用内更新成功后立即隐藏顶部栏的 `有可用更新` 胶囊按钮，无需等待窗口重载。
- 将 GitHub Actions 工作流操作升级至兼容 Node.js 24 的最新版本（`checkout@v7`、`setup-node@v7`、`upload-artifact@v7`、`action-gh-release@v3`）。
- 清理了仓库中未使用的旧版脚本与临时文件。

</details>

<details>
<summary>繁體中文</summary>

- 將應用程式內修補更新視窗顯示的變更說明（`manifest.json` 的 `releaseNotesI18n` 與 GitHub Release 內容）調整為自動符合目前介面語言（9 種語言）。
- 當更新或還原視窗開啟時切換語言（`antigravity-lang-changed`），視窗內容與變更說明會立即重新繪製。
- 應用程式內更新成功後立即隱藏頂部列的 `有可用更新` 膠囊按鈕，無需等待重新載入。
- 將 GitHub Actions 工作流程動作升級至相容 Node.js 24 的最新版本（`checkout@v7`、`setup-node@v7`、`upload-artifact@v7`、`action-gh-release@v3`）。
- 清理了儲存庫中未使用的舊版腳本與暫存檔案。

</details>

<details>
<summary>Español</summary>

- Se adaptaron las notas de cambios de la actualización en la app (`releaseNotesI18n` en `manifest.json` y cuerpo de GitHub Release) para mostrarse en el idioma activo entre los 9 idiomas compatibles.
- Los diálogos de actualización o restauración abiertos ahora se vuelven a renderizar inmediatamente al cambiar el idioma (`antigravity-lang-changed`).
- El botón superior `Actualización disponible` se oculta al instante en cuanto finaliza la actualización en la app.
- Se actualizaron las acciones de GitHub Actions (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `action-gh-release@v3`) para Node.js 24.
- Se eliminaron scripts heredados y archivos temporales sin uso del repositorio.

</details>

<details>
<summary>Français</summary>

- Localisation des notes de mise à jour intégrées (`releaseNotesI18n` dans `manifest.json` et corps de release GitHub) selon la langue active parmi les 9 langues prises en charge.
- Rafraîchissement immédiat de la fenêtre de mise à jour ou de restauration ouverte lors d'un changement de langue (`antigravity-lang-changed`).
- Masquage immédiat du badge supérieur `Mise à jour disponible` dès que la mise à jour intégrée réussit.
- Mise à niveau des actions GitHub (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `action-gh-release@v3`) pour Node.js 24.
- Nettoyage des scripts obsolètes et fichiers temporaires inutilisés du dépôt.

</details>

<details>
<summary>Deutsch</summary>

- Änderungsnotizen im In-App-Update-Dialog (`releaseNotesI18n` in `manifest.json` und GitHub-Release-Text) werden nun passend zur aktiven App-Sprache in allen 9 Sprachen angezeigt.
- Ein geöffneter Update- oder Wiederherstellungsdialog wird beim Sprachwechsel (`antigravity-lang-changed`) sofort neu gerendert.
- Die obere `Update verfügbar`-Schaltfläche wird unmittelbar nach erfolgreichem In-App-Update ausgeblendet.
- GitHub-Actions-Workflow-Aktionen für Node.js 24 aktualisiert (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `action-gh-release@v3`).
- Ungenutzte Legacy-Skripte und temporäre Dateien aus dem Repository entfernt.

</details>

<details>
<summary>Русский</summary>

- Примечания к обновлению внутри приложения (`releaseNotesI18n` в `manifest.json` и текст GitHub Release) теперь отображаются на активном языке интерфейса (9 языков).
- Открытое окно обновления или восстановления теперь мгновенно перерисовывается при смене языка (`antigravity-lang-changed`).
- Кнопка `Доступно обновление` на верхней панели скрывается сразу после успешного завершения обновления внутри приложения.
- Действия GitHub Actions обновлены до версий с поддержкой Node.js 24 (`checkout@v7`, `setup-node@v7`, `upload-artifact@v7`, `action-gh-release@v3`).
- Удалены неиспользуемые устаревшие скрипты и временные файлы из репозитория.

</details>
