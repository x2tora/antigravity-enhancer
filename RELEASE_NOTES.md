# Antigravity Enhancer v4.0.0.1

## Changes

- **Dynamic Modal Sizing & Top-Anchored Layout**: Widened Patch Settings (`540px` → `660px`), replaced fixed `360px` body height with dynamic `auto` height + smooth GSAP height transitions, and anchored the modal top position so tab buttons never shift.
- **Unclipped Changelog Cards**: Fixed `flex-shrink` clipping inside the Changelog viewer so all version cards and markdown notes render cleanly without truncation, with smooth accordion height animations.
- **4-Segment Version Support**: Updated `compareSemver` and Windows installer assembly metadata to handle `4.0.0.1` cleanly.

---

### Translations

<details>
<summary>한국어</summary>

- **패치 설정 동적 높이 및 상단 고정 레이아웃**: 패치 설정 모달의 좌우 너비를 넓히고(`540px` → `660px`), 고정 높이(`360px`) 대신 콘텐츠에 맞춘 동적 높이 및 부드러운 GSAP 상하 전환 애니메이션을 적용했습니다. 모달 상단 위치를 고정해 높이 변화 시에도 상단 탭 목록이 흔들리지 않습니다.
- **변경 기록 카드 잘림 수정**: 변경 기록 뷰어 내 버전 카드에 `flex-shrink: 0`을 적용해 패치 로그가 잘리지 않고 온전히 표시되도록 수정했으며, 아코디언 펼치기/접기 시에도 상하 폭이 부드럽게 전환됩니다.
- **4자리 버전(`4.0.0.1`) 지원**: `compareSemver`와 인스톨러 어셈블리 버전 처리가 4자리 버전을 정상 인식하도록 개선했습니다.

</details>

<details>
<summary>日本語</summary>

- **動的モーダル高さと上端固定レイアウト**: モーダル幅を拡張（`540px` → `660px`）し、コンテンツに応じた動的高さと滑らかな GSAP 高さアニメーションを適用しました。上端位置を固定したためタブ一覧がずれません。
- **変更履歴カードの切り捨て修正**: `flex-shrink: 0` を適用してログが途切れないように修正しました。

</details>

<details>
<summary>简体中文</summary>

- **动态弹窗高度与顶部固定布局**：加宽设置弹窗（`540px` → `660px`），改为自适应内容高度并配合 GSAP 平滑高度过渡，固定弹窗顶部位置以防标签栏偏移。
- **修复更新日志卡片裁剪**：为日志卡片添加 `flex-shrink: 0`，彻底解决内容被裁剪的问题。

</details>

<details>
<summary>繁體中文</summary>

- **動態視窗高度與頂部固定版面**：加寬設定視窗（`540px` → `660px`），改為自適應內容高度並搭配 GSAP 平滑高度過渡，固定視窗頂部位置避免頁籤列偏移。
- **修正變更紀錄卡片裁切**：為紀錄卡片加入 `flex-shrink: 0`，解決內容被裁切的問題。

</details>

<details>
<summary>Español</summary>

- **Tamaño dinámico y anclaje superior**: Modal ampliado (`660px`) con altura dinámica y transiciones suaves GSAP manteniendo fija la parte superior.
- **Corrección de recorte en Changelog**: Se añadió `flex-shrink: 0` para evitar que se recorten las tarjetas de historial.

</details>

<details>
<summary>Français</summary>

- **Hauteur dynamique et ancrage supérieur** : Fenêtre élargie (`660px`) avec hauteur adaptative, transitions GSAP fluides et position haute fixe.
- **Correction de l’affichage du Changelog** : Ajout de `flex-shrink: 0` pour afficher toutes les notes sans troncature.

</details>

<details>
<summary>Deutsch</summary>

- **Dynamische Höhe & obere Verankerung**: Modal verbreitert (`660px`) mit dynamischer Höhe, sanfter GSAP-Animation und fester Oberkante.
- **Changelog-Zuschnitt behoben**: `flex-shrink: 0` hinzugefügt, damit Versionskarten nicht abgeschnitten werden.

</details>

<details>
<summary>Русский</summary>

- **Динамическая высота и фиксация сверху**: Окно расширено до `660px` с плавной GSAP-анимацией высоты и фиксированным верхним краем.
- **Исправление обрезки Changelog**: Добавлено `flex-shrink: 0` для корректного отображения всех карточек версий.

</details>
