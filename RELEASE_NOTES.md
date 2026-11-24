# Antigravity Enhancer v4.0.6

## Changes
- **Updater Tag-Ref Fallback & Instant Relaunch**: Falls back to the release tag manifest when `main` branch CDN cache lags behind GitHub Releases, adds a release-page fallback button, and automatically relaunches Antigravity after an in-app update succeeds.
- **Localized In-App Changelog**: Added per-language `<details>` localization support in `CHANGELOG.md` and the in-app Changelog viewer across all 9 supported languages.
- **Translation & Collector Improvements**: Fixed missing `rep` templates on weekly/5-hour quota limit rules, corrected `Select an option...` Korean translation, enabled nested capture-group translation in dynamic rules, added 9 missing UI strings, and filtered `localhost`/IPv4:port noise from the untranslated collector.

<details>
<summary>한국어</summary>

- **업데이트 버튼 미표시 및 즉시 재시작 수정**: `main` 브랜치 CDN 캐시 지연 시 릴리스 태그 기준 `manifest.json`으로 폴백하도록 수정하고, 업데이트 완료 후 자동으로 재시작되도록 변경했습니다.
- **인앱 변경 기록 다국어 지원**: `CHANGELOG.md` 및 인앱 변경 기록 뷰어가 지원하는 9개 언어 전체를 `<details>` 블록으로 표시하도록 개선했습니다.
- **번역 사전 및 수집기 개선**: 주간/5시간 한도 동적 규칙의 누락된 치환값과 `Select an option...` 번역을 수정하고, 동적 규칙 캡처 그룹 하위 번역, 신규 UI 문구 9종 추가 및 `localhost`/IP:포트 노이즈 필터링을 적용했습니다.

</details>

<details>
<summary>日本語</summary>

- **更新ボタン表示と即時再起動**: `main` ブランチのCDNキャッシュ遅延時にリリースタグのマニフェストへフォールバックし、更新完了後に自動で再起動するようにしました。
- **アプリ内変更履歴の多言語対応**: `CHANGELOG.md` とアプリ内変更履歴ビューアが対応する全9言語で表示されるようになりました。
- **翻訳辞書と収集フィルター改善**: 週間/5時間制限ルールの欠落テンプレートと `Select an option...` を修正し、キャプチャグループ翻訳、UI文字列9件追加、`localhost`/IP:ポート除外を適用しました。

</details>

<details>
<summary>简体中文</summary>

- **更新按钮显示与自动重启**：当 `main` 分支 CDN 缓存滞后时回退至发布标签清单，并在应用内更新完成后自动重启应用。
- **应用内更新日志多语言支持**：`CHANGELOG.md` 及应用内更新日志查看器现支持全部 9 种语言的本地化显示。
- **翻译与收集器改进**：修复配额规则缺失模板与 `Select an option...` 翻译，支持动态规则捕获组嵌套翻译，新增 9 条 UI 词条并过滤 `localhost`/IP:端口噪点。

</details>

<details>
<summary>繁體中文</summary>

- **更新按鈕顯示與自動重新啟動**：當 `main` 分支 CDN 快取延遲時回退至發佈標籤清單，並在套用更新後自動重新啟動應用程式。
- **應用程式內更新日誌多語言支援**：`CHANGELOG.md` 與應用程式內更新日誌檢視器現支援全部 9 種語言的在地化顯示。
- **翻譯與收集器改進**：修復配額規則遺失範本與 `Select an option...` 翻譯，支援動態規則擷取群組巢狀翻譯，新增 9 條 UI 詞條並過濾 `localhost`/IP:連接埠雜訊。

</details>

<details>
<summary>Español</summary>

- **Botón de actualización y reinicio automático**: Respaldo por etiqueta de lanzamiento cuando la caché CDN de `main` se retrasa y reinicio automático tras completar la actualización.
- **Historial de cambios localizado**: Soporte multilenguaje en `CHANGELOG.md` y el visor integrado para los 9 idiomas compatibles.
- **Mejoras de traducción y colector**: Corrección de plantillas faltantes en reglas de cuota, traducción anidada de grupos capturados, 9 cadenas de interfaz nuevas y filtrado de `localhost`/IP:puerto.

</details>

<details>
<summary>Français</summary>

- **Bouton de mise à jour et redémarrage automatique** : Repli sur le manifeste du tag de version lorsque le cache CDN de `main` est en retard, et redémarrage automatique après la mise à jour.
- **Journal des modifications localisé** : Prise en charge multilingue de `CHANGELOG.md` et de la visionneuse intégrée pour les 9 langues prises en charge.
- **Améliorations des traductions et du collecteur** : Correction des modèles manquants sur les règles de quota, traduction imbriquée des groupes capturés, ajout de 9 chaînes UI et filtrage du bruit `localhost`/IP:port.

</details>

<details>
<summary>Deutsch</summary>

- **Update-Button & automatischer Neustart**: Tag-Manifest-Fallback bei verzögertem `main`-CDN-Cache sowie automatischer Neustart nach abgeschlossenem In-App-Update.
- **Lokalisierter Änderungsverlauf**: Mehrsprachige Unterstützung in `CHANGELOG.md` und im integrierten Changelog-Viewer für alle 9 unterstützten Sprachen.
- **Übersetzungs- & Collector-Verbesserungen**: Fehlende Vorlagen in Kontingent-Regeln behoben, verschachtelte Capture-Gruppen-Übersetzung aktiviert, 9 UI-Texte ergänzt und `localhost`/IP:Port-Rauschen gefiltert.

</details>

<details>
<summary>Русский</summary>

- **Кнопка обновления и автоперезапуск**: Резервная загрузка манифеста по тегу релиза при задержке CDN-кеша `main` и автоматический перезапуск после обновления.
- **Локализованный журнал изменений**: Поддержка всех 9 языков в `CHANGELOG.md` и встроенном просмотре истории изменений.
- **Улучшения перевода и сборщика**: Восстановлены шаблоны в правилах квот, добавлен вложенный перевод групп захвата, 9 новых строк интерфейса и фильтрация `localhost`/IP:порт.

</details>
