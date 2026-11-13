# Antigravity Enhancer

Mehrsprachiger UI-Lokalisierungs- und Modellkontingent-Patch für **Antigravity**.

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Español](README.es.md) · [Français](README.fr.md) · **Deutsch** · [Русский](README.ru.md)

[![Download Latest (v3.3.0)](https://img.shields.io/badge/Neueste_Version_laden-v3.3.0_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.3.0-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

Direktlinks: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.3.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.0-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## Funktionen

- **UI-Lokalisierung in 9 Sprachen**
  Unterstützt English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`) und Русский (`ru`) mit sofortigem Wechsel ohne Neustart über die obere Leiste, die Einstellungen oder `Alt + Shift + L`.
- **Native Menüintegration**
  Zeigt `AntigravityEnhanced` in der Titelleiste und integriert `Patch-Version`, `Nach Patch-Updates suchen` sowie `Original wiederherstellen` nativ in das `Antigravity`-Menü.
- **Modellkontingent-Anzeige**
  - **Widget oben rechts**: zeigt das 5-Stunden- und Wochenkontingent aller Modellgruppen; ein Klick öffnet das vollständige Detail-Popover samt Reset-Countdown.
  - **Inline-Badge im Eingabefeld**: zeigt das Restkontingent neben dem aktiven Modell; beim Darüberfahren werden nur die Details dieser Modellgruppe angezeigt, ohne den Klick auf die Modellauswahl zu überlagern.
- **Update-sichere Architektur**
  Lädt Patch-Module per minimalem ASAR-Bootstrapper (`asar-patcher.js`) aus `%APPDATA%\Antigravity\enhancer`, prüft In-App-Updates über SHA-256 in `manifest.json` und erkennt die Windows-Sprache im Installer automatisch.

---

## Installation

### Installer (`Antigravity-Enhancer-Setup.exe`)

1. Laden Sie [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) herunter.
2. Starten Sie die Datei und klicken Sie auf **Installieren / Aktualisieren** (über **Original wiederherstellen** jederzeit rückgängig machbar).

### Portables Archiv (`.zip`)

1. Laden Sie [`Antigravity-Enhancer-v3.3.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.0-Win.zip) unter [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest) herunter.
2. Entpacken Sie das Archiv und starten Sie `Antigravity-Enhancer-Setup.exe`.

---

## Build & Tests

```powershell
# SHA-256-Prüfsummen in enhancer/manifest.json neu erzeugen
node .\generate_enhancer_manifest.js

# Antigravity-Enhancer-Setup.exe, ZIP und SHA256SUMS.txt erstellen
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.3.0"

# E2E-Tests ausführen
node .\tests\e2e\runner.js --summary -NoKill
```

---

*Inoffizieller Community-Patch. Nicht mit dem offiziellen Antigravity-Team verbunden.*
