# Antigravity Enhancer v3.2.0

## Changes

- Integrated patch controls into the native `Antigravity` title menu dropdown (`Patch Version 3.2.0`, `Check Patch Updates`, `Restore Original`) and removed the standalone top-bar Enhancer button.
- Added an `#A0A3F6` accent `Enhanced` label after `Antigravity` in the title menu bar when patched.
- Removed the persistence Verify & Repair (`점검 및 복구`) and Rollback (`이전 버전 복원`) UI controls.
- Unified Enhancer dialogs, dropdown menus, settings controls, and tooltips with Antigravity's native overlay/card layout while preserving the `#0B0B0E` / `#CAD3F5` / `#A0A3F6` color scheme.
- Separated composer badge clicks from quota popovers: clicking the composer model selector opens only the model selector, the top-right quota widget opens the full multi-group popover, and hovering the composer quota badge displays detailed 5-hour and weekly quota bars strictly for that model group.
- Rewrote `README.md` with English as the base, a Latest Version Download button at the top, and 9-language documentation under `docs/`.

---

### Translations

<details>
<summary>한국어</summary>

- 상단 별도의 Enhancer 버튼을 제거하고 네이티브 `Antigravity` 메뉴 드롭다운에 `패치 버전 3.2.0`, `패치 업데이트 확인`, `원본 복구` 항목을 동일 스타일로 통합했습니다.
- 패치 적용 상태에서 상단 `Antigravity` 뒤에 강조색(`#A0A3F6`) `Enhanced` 표기를 추가했습니다.
- 불필요한 `점검 및 복구` 및 `이전 버전 복원` UI 기능을 삭제했습니다.
- 기존 색상(`#0B0B0E` / `#CAD3F5` / `#A0A3F6`)을 유지하면서 모든 Enhancer 창·팝오버·메뉴를 네이티브 UI 형태로 통일했습니다.
- 입력 창 모델 사용량 클릭 시 모델 선택과 사용량 팝오버가 겹쳐 열리지 않도록 수정해, 전체 사용량은 우측 상단에서만 열고 입력 창에서는 호버 시 해당 모델 그룹의 상세 정보만 표시하도록 변경했습니다.
- `README.md`를 영어 베이스 및 9개 국어 전환 구조로 재구성하고 상단에 최신 버전 다운로드 버튼을 배치했습니다.

</details>

<details>
<summary>日本語</summary>

- 上部バーの単独 Enhancer ボタンを削除し、ネイティブ `Antigravity` メニュー内に `パッチバージョン 3.2.0`、`パッチの更新を確認`、`オリジナルに戻す` を統合しました。
- パッチ適用時に `Antigravity` の後ろへ強調色（`#A0A3F6`）の `Enhanced` 表示を追加しました。
- 不要な「確認 / 修復」および「前バージョンに戻す」UI を削除しました。
- `#0B0B0E` / `#CAD3F5` / `#A0A3F6` の配色を維持したまま、すべての Enhancer 画面・メニュー・ポップオーバーをネイティブ UI スタイルに統一しました。
- 入力欄の使用量バッジクリックで全体ポップオーバーが同時表示されないようにし、クリック時はモデル選択のみ、ホバー時は該当モデルグループの詳細のみを表示（全体ポップオーバーは右上からのみ開く）へ変更しました。
- `README.md` を英語ベース・9言語切替構成へ刷新し、上部に最新版ダウンロードボタンを配置しました。

</details>

<details>
<summary>简体中文</summary>

- 移除顶栏独立 Enhancer 按钮，在原生 `Antigravity` 菜单中集成 `补丁版本 3.2.0`、`检查补丁更新` 与 `恢复原版`。
- 已安装补丁时在 `Antigravity` 后显示 `#A0A3F6` 高亮 `Enhanced` 标识。
- 移除多余的“检查并修复”与“回滚上一版”界面功能。
- 保持 `#0B0B0E` / `#CAD3F5` / `#A0A3F6` 配色不变，将所有 Enhancer 弹窗与菜单统一为原生 UI 样式。
- 修复点击输入框模型配额徽章会同时弹出完整配额面板的问题：完整配额面板仅从右上角打开，输入框内仅在悬停时显示当前所选模型组的详细信息。
- 重写 `README.md` 为英文基准并支持 9 种语言切换，在顶部加入最新版本下载按钮。

</details>

<details>
<summary>繁體中文</summary>

- 移除頂部列獨立 Enhancer 按鈕，改為在原生 `Antigravity` 下拉選單中整合 `修補版本 3.2.0`、`檢查修補更新` 與 `還原原版`。
- 套用修補後於 `Antigravity` 後方顯示 `#A0A3F6` 強調色 `Enhanced` 標籤。
- 刪除不需要的「檢查並修復」與「復原前一版本」UI 功能。
- 保留 `#0B0B0E` / `#CAD3F5` / `#A0A3F6` 配色並將所有 Enhancer 視窗與選單統一為原生 UI 風格。
- 修正點擊輸入框內配額徽章會與模型選擇器同時開啟的問題：完整配額面板僅從右上角開啟，輸入框內僅於滑鼠懸停時顯示該模型群組詳情。
- 重寫 `README.md` 為英文基準並提供 9 種語言切換，於頂部配置最新版本下載按鈕。

</details>

<details>
<summary>Español</summary>

- Se eliminó el botón independiente de Enhancer de la barra superior y se integraron `Versión del parche 3.2.0`, `Buscar actualizaciones del parche` y `Restaurar original` dentro del menú nativo `Antigravity`.
- Se añadió la etiqueta `Enhanced` en color `#A0A3F6` junto a `Antigravity` cuando el parche está activo.
- Se eliminaron las opciones de interfaz «Verificar y reparar» y «Revertir».
- Se unificaron todas las ventanas, menús y paneles emergentes de Enhancer con el estilo nativo manteniendo la paleta `#0B0B0E` / `#CAD3F5` / `#A0A3F6`.
- Al hacer clic en la insignia de cuota del editor ahora solo se abre el selector de modelo; el desglose completo se abre únicamente desde arriba a la derecha y al pasar el cursor en el editor se muestra solo el detalle de ese grupo de modelos.
- Se reescribió `README.md` con inglés como base, botón de descarga en la parte superior y versiones en los 9 idiomas.

</details>

<details>
<summary>Français</summary>

- Suppression du bouton Enhancer autonome et intégration de `Version du patch 3.2.0`, `Vérifier les mises à jour du patch` et `Restaurer l’original` dans le menu natif `Antigravity`.
- Ajout de la mention `Enhanced` (`#A0A3F6`) après `Antigravity` lorsque le correctif est actif.
- Suppression des contrôles « Vérifier et réparer » et « Rétablir ».
- Harmonisation de toutes les fenêtres et menus Enhancer avec le style natif tout en conservant les couleurs `#0B0B0E` / `#CAD3F5` / `#A0A3F6`.
- Le clic sur le badge de quota dans l’éditeur n’ouvre plus le popover global en même temps que le sélecteur de modèle : le popover complet s’ouvre uniquement en haut à droite et le survol dans l’éditeur affiche uniquement les détails du groupe du modèle sélectionné.
- Réécriture du `README.md` en anglais de référence avec bouton de téléchargement en haut et pages dédiées dans les 9 langues.

</details>

<details>
<summary>Deutsch</summary>

- Eigenständigen Enhancer-Button in der oberen Leiste entfernt und `Patch-Version 3.2.0`, `Nach Patch-Updates suchen` sowie `Original wiederherstellen` nativ in das `Antigravity`-Menü integriert.
- Akzentuierten `Enhanced`-Zusatz (`#A0A3F6`) hinter `Antigravity` bei aktivem Patch hinzugefügt.
- Unnötige UI-Funktionen für „Prüfen / Reparieren“ und „Zurücksetzen“ entfernt.
- Alle Enhancer-Fenster, Popovers und Menüs unter Beibehaltung der Farben `#0B0B0E` / `#CAD3F5` / `#A0A3F6` an das native UI-Design angeglichen.
- Klick auf die Kontingent-Anzeige im Eingabefeld öffnet nicht mehr gleichzeitig das Gesamt-Popover; dieses öffnet nur noch oben rechts, während beim Hovern im Eingabefeld ausschließlich die Details der gewählten Modellgruppe erscheinen.
- `README.md` auf englischer Basis mit Download-Button oben und 9-Sprachen-Dokumentation unter `docs/` neu aufgebaut.

</details>

<details>
<summary>Русский</summary>

- Удалена отдельная кнопка Enhancer в верхней панели; в нативное меню `Antigravity` добавлены пункты `Версия патча 3.2.0`, `Проверить обновления патча` и `Восстановить оригинал`.
- При активном патче после `Antigravity` отображается акцентная метка `Enhanced` (`#A0A3F6`).
- Удалены лишние элементы интерфейса «Проверить / восстановить» и «Откатить».
- Все окна, меню и всплывающие панели Enhancer приведены к нативному стилю с сохранением палитры `#0B0B0E` / `#CAD3F5` / `#A0A3F6`.
- Нажатие на значок квоты в поле ввода больше не открывает общую панель квот поверх выбора модели: полная статистика открывается только в правом верхнем углу, а при наведении в поле ввода отображаются детали только выбранной группы моделей.
- Файл `README.md` переработан на базе английского языка с кнопкой скачивания вверху и поддержкой всех 9 языков.

</details>
