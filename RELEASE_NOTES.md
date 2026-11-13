# Antigravity Enhancer v3.3.2

## Changes

- Fixed a `ReferenceError: activeLanguage is not defined` inside the main-world quota widget script (`mainWorldQuotaLogic`) when no saved language existed in `localStorage`, restoring both the top-bar quota widget and composer inline quota badge.

---

### Translations

<details>
<summary>한국어</summary>

- 저장된 언어 설정이 없는 상태에서 메인 월드 사용량 위젯 스크립트(`mainWorldQuotaLogic`)가 프리로드 전용 변수 `activeLanguage`를 참조해 발생하던 `ReferenceError`를 수정하여 상단 바 및 입력 창 사용량 표시기가 정상 동작하도록 복구했습니다.

</details>

<details>
<summary>日本語</summary>

- 保存された言語設定がない状態でメインワールドのクォータスクリプト（`mainWorldQuotaLogic`）がプリロード専用変数 `activeLanguage` を参照して発生していた `ReferenceError` を修正し、上部バーと入力欄のクォータ表示を復旧しました。

</details>

<details>
<summary>简体中文</summary>

- 修复了未保存语言设置时主世界配额脚本（`mainWorldQuotaLogic`）引用预加载作用域变量 `activeLanguage` 导致的 `ReferenceError`，恢复了顶部栏和输入框配额指示器显示。

</details>

<details>
<summary>繁體中文</summary>

- 修復了未儲存語言設定時主世界配額腳本（`mainWorldQuotaLogic`）參照預載作用域變數 `activeLanguage` 所導致的 `ReferenceError`，恢復頂部列與輸入框配額指示器顯示。

</details>

<details>
<summary>Español</summary>

- Se corrigió un error `ReferenceError: activeLanguage is not defined` en el script de cuota del mundo principal (`mainWorldQuotaLogic`) cuando no había idioma guardado en `localStorage`, restaurando el widget superior y el indicador del compositor.

</details>

<details>
<summary>Français</summary>

- Correction d'une erreur `ReferenceError: activeLanguage is not defined` dans le script de quota du monde principal (`mainWorldQuotaLogic`) lorsqu'aucune langue n'était enregistrée dans `localStorage`, rétablissant le widget supérieur et le badge de l'éditeur.

</details>

<details>
<summary>Deutsch</summary>

- Fehler `ReferenceError: activeLanguage is not defined` im Main-World-Kontingent-Skript (`mainWorldQuotaLogic`) bei fehlender `localStorage`-Sprache behoben und damit das obere Widget sowie das Composer-Badge wiederhergestellt.

</details>

<details>
<summary>Русский</summary>

- Исправлена ошибка `ReferenceError: activeLanguage is not defined` в скрипте виджета квот (`mainWorldQuotaLogic`) при отсутствии сохранённого языка в `localStorage`, что восстановило отображение индикаторов в верхней панели и поле ввода.

</details>
