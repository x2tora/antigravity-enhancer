# Antigravity Enhancer

Патч мультиязычной локализации интерфейса и отображения квот моделей для **Antigravity**.

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Русский**

[![Download Latest (v3.4.1)](https://img.shields.io/badge/Скачать_последнюю_версию-v3.4.1_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.4.1-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

Прямые ссылки: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.4.1-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.4.1-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## Возможности

- **Локализация интерфейса на 9 языков**
  Поддерживает English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`) и Русский (`ru`) с переключением без перезапуска через верхнюю панель, настройки или `Alt + Shift + L`.
- **Интеграция в нативное меню**
  Отображает `AntigravityEnhanced` в заголовке меню и добавляет пункты `Версия патча`, `Проверить обновления патча` и `Восстановить оригинал` прямо в выпадающее меню `Antigravity`.
- **Отображение квот моделей**
  - **Виджет в правом верхнем углу**: показывает 5-часовую и недельную квоты всех групп моделей; клик открывает подробное окно со счётчиками сброса.
  - **Значок в поле ввода**: показывает остаток квоты рядом с активной моделью; при наведении отображает детали только этой группы моделей, не мешая выбору модели по клику.
- **Устойчивая к обновлениям архитектура**
  Загружает модули патча из `%APPDATA%\Antigravity\enhancer` через минимальный ASAR-загрузчик (`asar-patcher.js`), проверяет обновления по SHA-256 в `manifest.json` и автоматически определяет язык Windows в установщике.

---

## Установка

### Установщик (`Antigravity-Enhancer-Setup.exe`)

1. Скачайте [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe).
2. Запустите установщик и нажмите **Установить / Обновить** (при необходимости верните исходные файлы через **Восстановить оригинал**).

### Портативный архив (`.zip`)

1. Скачайте [`Antigravity-Enhancer-v3.4.1-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.4.1-Win.zip) со страницы [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest).
2. Распакуйте архив и запустите `Antigravity-Enhancer-Setup.exe`.

---

## Сборка и тестирование

```powershell
# Пересоздать SHA-256 хэши в enhancer/manifest.json
node .\generate_enhancer_manifest.js

# Собрать Antigravity-Enhancer-Setup.exe, ZIP и SHA256SUMS.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.4.1"

# Запустить E2E-тесты
node .\tests\e2e\runner.js --summary -NoKill
```

---

*Неофициальный патч сообщества. Не связан с официальной командой Antigravity.*
