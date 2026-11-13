# Antigravity Enhancer v3.3.0

## Changes

- Rendered `AntigravityEnhanced` flush without spacing in the top menu bar and Settings label.
- Added 10-minute background patch update checks and a native-style top-bar `Update Available` pill (`#A0A3F6` fill, `#0B0B0E` text, arrow icon) that opens the Patch Update dialog.
- Renamed the `Claude` / `Claude/Other` quota label to localized `Other` across all 9 languages (`기타 모델` in Korean) and fixed `ACTIVE` / `사용 중` pill vertical wrapping in the quota popover and composer hover card.
- Updated Gemini model tracking to include `Gemini 4 Hydrogen` and removed the nonexistent `Gemini Pro` entry from fallback lists and group matching.
- Added OS language auto-detection on first launch when no saved language preference exists.
- Localized the `Top-Bar Quota Widget` settings labels and `Code copied to clipboard` toast across all 9 supported languages.
- Removed unused main-process backup snapshot and rollback IPC code (`enhancer:rollback`), and updated the GitHub Actions release workflow to Node.js 24.

---

### Translations

<details>
<summary>한국어</summary>

- 상단 메뉴 바와 설정 화면에서 `AntigravityEnhanced`를 공백 없이 붙여 표시하도록 수정했습니다.
- 10분 주기로 패치 업데이트를 확인하고, 업데이트가 있을 때 상단 바에 네이티브 업데이트 권장 버튼 스타일의 `업데이트 가능` 배지(`#A0A3F6` 배경, `#0B0B0E` 텍스트, 화살표 아이콘)를 표시하도록 추가했습니다.
- 상단 바 및 팝오버의 `Claude` / `Claude/Other` 표기를 9개 국어 `기타 모델`(`Other`)로 변경하고, 사용량 팝오버와 입력 창 호버 카드에서 `사용 중` 배지가 세로로 꺾이던 레이아웃 오류를 수정했습니다.
- Gemini 사용량 모델 목록에 `Gemini 4 Hydrogen`을 포함하고, 존재하지 않는 `Gemini Pro` 항목을 제거했습니다.
- 저장된 언어 설정이 없는 최초 실행 시 OS 언어를 자동 감지해 9개 국어(미지원 언어는 영어)로 시작하도록 개선했습니다.
- 설정의 `상단 사용량 표시기` 제목/설명과 코드 복사 알림 토스트를 9개 국어로 확장했습니다.
- 미사용 백엔드 롤백/스냅샷 코드(`enhancer:rollback`)를 제거하고 GitHub Actions 릴리즈 워크플로의 Node.js 버전을 24로 업데이트했습니다.

</details>

<details>
<summary>日本語</summary>

- 上部メニューバーおよび設定画面の `AntigravityEnhanced` 表記をスペースなしで密着表示に修正しました。
- 10分間隔でパッチ更新を確認し、更新がある場合は上部バーにネイティブ風の `アップデート可能` ピル（`#A0A3F6` 背景、`#0B0B0E` 文字、矢印アイコン）を表示するようにしました。
- `Claude` / `Claude/Other` 表記を9言語対応の `その他`（`Other`）へ変更し、ポップオーバーと入力欄ホバーカードで `使用中` バッジが縦に折り返されるレイアウト崩れを修正しました。
- Gemini クォータのモデル一覧に `Gemini 4 Hydrogen` を含め、存在しない `Gemini Pro` を削除しました。
- 保存済み言語設定がない初回起動時に OS 言語を自動検出して適用するようにしました。
- 設定の「上部クォータ表示」ラベルとコピー完了トーストを9言語に対応させました。
- 未使用のバックアップ/ロールバック IPC コード（`enhancer:rollback`）を削除し、GitHub Actions リリースワークフローを Node.js 24 に更新しました。

</details>

<details>
<summary>简体中文</summary>

- 将顶部菜单栏与设置中的 `AntigravityEnhanced` 调整为无空格紧贴显示。
- 新增每 10 分钟检查一次补丁更新，有新版本时在顶部栏显示原生风格的 `有可用更新` 胶囊按钮（`#A0A3F6` 背景、`#0B0B0E` 文字及箭头图标）。
- 将 `Claude` / `Claude/Other` 标签替换为 9 种语言的 `其他模型`（`Other`），并修复配额弹窗和输入框悬停卡片中 `使用中` 徽章换行错位的问题。
- 在 Gemini 配额模型列表中加入 `Gemini 4 Hydrogen`，并移除不存在的 `Gemini Pro`。
- 首次启动且无已保存语言设置时自动识别系统语言。
- 为设置中的“顶部配额指示器”文本与复制提示框补全 9 种语言翻译。
- 清理未使用的主进程备份与回滚 IPC 代码（`enhancer:rollback`），并将 GitHub Actions 发布工作流升级至 Node.js 24。

</details>

<details>
<summary>繁體中文</summary>

- 將頂部選單列與設定中的 `AntigravityEnhanced` 調整為無空白緊貼顯示。
- 新增每 10 分鐘檢查一次修補更新，有新版本時在頂部列顯示原生風格的 `有可用更新` 膠囊按鈕（`#A0A3F6` 背景、`#0B0B0E` 文字與箭頭圖示）。
- 將 `Claude` / `Claude/Other` 標籤替換為 9 種語言的 `其他模型`（`Other`），並修復配額彈窗與輸入框懸停卡片中 `使用中` 徽章垂直換行跑版問題。
- 在 Gemini 配額模型清單中加入 `Gemini 4 Hydrogen`，並移除不存在的 `Gemini Pro`。
- 首次啟動且無已儲存語言設定時自動偵測系統語言。
- 為設定中的「頂部配額指示器」文字與複製提示訊息補齊 9 種語言翻譯。
- 移除未使用的主程序備份與回滾 IPC 程式碼（`enhancer:rollback`），並將 GitHub Actions 發佈工作流程升級至 Node.js 24。

</details>

<details>
<summary>Español</summary>

- Se ajustó `AntigravityEnhanced` para mostrarse sin espacio en la barra de menú superior y en Ajustes.
- Se añadió la comprobación automática cada 10 minutos con un botón superior estilo nativo `Actualización disponible` (`#A0A3F6`, texto `#0B0B0E` e icono de flecha).
- Se reemplazó `Claude` / `Claude/Other` por `Otros` en los 9 idiomas y se corrigió el salto de línea de la insignia `ACTIVO` en el panel y la tarjeta flotante.
- Se añadió `Gemini 4 Hydrogen` a la lista de modelos de Gemini y se eliminó `Gemini Pro`.
- Se añadió detección automática del idioma del sistema en el primer inicio cuando no hay idioma guardado.
- Se tradujeron los textos de ajuste de cuota superior y la notificación de código copiado a los 9 idiomas.
- Se eliminó el código sin uso de respaldo/reversión (`enhancer:rollback`) y se actualizó el flujo de GitHub Actions a Node.js 24.

</details>

<details>
<summary>Français</summary>

- Affichage accolé de `AntigravityEnhanced` sans espace dans la barre de menu supérieure et les Paramètres.
- Vérification des mises à jour toutes les 10 minutes avec un bouton supérieur de style natif `Mise à jour disponible` (`#A0A3F6`, texte `#0B0B0E`, icône flèche).
- Remplacement de `Claude` / `Claude/Other` par `Autres` dans les 9 langues et correction du retour à la ligne du badge `ACTIF` dans le popover et la carte au survol.
- Ajout de `Gemini 4 Hydrogen` dans la liste des modèles Gemini et suppression de `Gemini Pro`.
- Détection automatique de la langue du système au premier lancement lorsqu'aucune préférence n'est enregistrée.
- Traduction des libellés du widget de quota et de la notification de copie dans les 9 langues.
- Suppression du code inutilisé de sauvegarde/restauration (`enhancer:rollback`) et mise à jour du workflow GitHub Actions vers Node.js 24.

</details>

<details>
<summary>Deutsch</summary>

- `AntigravityEnhanced` wird in der oberen Menüleiste und in den Einstellungen ohne Leerzeichen direkt verbunden dargestellt.
- Automatische Patch-Prüfung alle 10 Minuten mit einer nativen `Update verfügbar`-Schaltfläche in der oberen Leiste (`#A0A3F6`, Text `#0B0B0E`, Pfeilsymbol).
- `Claude` / `Claude/Other` wurde in allen 9 Sprachen durch `Andere` ersetzt und der vertikale Zeilenumbruch des `AKTIV`-Badges im Popover und Hover-Overlay behoben.
- `Gemini 4 Hydrogen` wurde in die Gemini-Modellliste aufgenommen und das nicht existierende `Gemini Pro` entfernt.
- Automatische Erkennung der Betriebssystemsprache beim ersten Start ohne gespeicherte Einstellung.
- Beschriftungen für das Kontingent-Widget und die Zwischenablage-Benachrichtigung auf alle 9 Sprachen erweitert.
- Ungenutzten Backup-/Rollback-Code (`enhancer:rollback`) entfernt und den GitHub-Actions-Release-Workflow auf Node.js 24 aktualisiert.

</details>

<details>
<summary>Русский</summary>

- Надпись `AntigravityEnhanced` в верхней панели меню и настройках отображается слитно, без пробела.
- Добавлена проверка обновлений каждые 10 минут с нативной кнопкой `Доступно обновление` в верхней панели (`#A0A3F6`, текст `#0B0B0E`, иконка стрелки).
- Обозначение `Claude` / `Claude/Other` заменено на `Другие` для всех 9 языков, а также исправлен перенос бейджа `АКТИВНА` во всплывающем окне и карточке при наведении.
- В список моделей Gemini добавлена `Gemini 4 Hydrogen` и удалена несуществующая `Gemini Pro`.
- Добавлено автоматическое определение языка ОС при первом запуске, если язык не сохранён.
- Переведены на все 9 языков заголовки настройки виджета квот и уведомление о копировании кода.
- Удалён неиспользуемый код резервного копирования и отката (`enhancer:rollback`), а рабочий процесс GitHub Actions обновлён до Node.js 24.

</details>
