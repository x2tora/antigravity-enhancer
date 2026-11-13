# Antigravity Enhancer

Multi-language UI localization and model quota viewer for **Antigravity**.

**English** · [한국어](docs/README.ko.md) · [日本語](docs/README.ja.md) · [简体中文](docs/README.zh-CN.md) · [繁體中文](docs/README.zh-TW.md) · [Español](docs/README.es.md) · [Français](docs/README.fr.md) · [Deutsch](docs/README.de.md) · [Русский](docs/README.ru.md)

[![Download Latest (v3.2.0)](https://img.shields.io/badge/Download_Latest-v3.2.0_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.2.0-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

Direct files: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.2.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.2.0-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## Features

- **9-Language UI Localization**
  Supports English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`), and Русский (`ru`) with zero-restart switching via the top bar, Settings, or `Alt + Shift + L`.
- **Native Menu Integration**
  Displays `Antigravity Enhanced` in the title menu bar and integrates `Patch Version`, `Check Patch Updates`, and `Restore Original` directly into the native `Antigravity` dropdown menu.
- **Model Quota Display**
  - **Top-right widget**: displays 5-hour and weekly quotas across all model groups; click to open the full breakdown popover with reset countdowns.
  - **Composer inline badge**: displays the remaining quota next to the active model selector; hover to inspect detailed 5-hour and weekly quotas for that model group only without colliding with model selection clicks.
- **Update-Safe Architecture**
  Loads patch modules from `%APPDATA%\Antigravity\enhancer` through a minimal ASAR bootstrapper (`asar-patcher.js`), verifies in-app updates against `manifest.json` SHA-256 digests, and detects the Windows OS UI language in the GUI installer.

---

## Installation

### Installer (`Antigravity-Enhancer-Setup.exe`)

1. Download [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe).
2. Run the installer and click **Install / Update** (or **Restore Original** to revert to unmodified files).

### Portable Archive (`.zip`)

1. Download [`Antigravity-Enhancer-v3.2.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.2.0-Win.zip) from [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest).
2. Extract the archive and run `Antigravity-Enhancer-Setup.exe`.

---

## Build & Test

```powershell
# Regenerate enhancer/manifest.json SHA-256 digests
node .\generate_enhancer_manifest.js

# Build Antigravity-Enhancer-Setup.exe, ZIP archive, and SHA256SUMS.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.2.0"

# Run E2E tests
node .\tests\e2e\runner.js --summary -NoKill
```

---

*Unofficial community patch. Not affiliated with or endorsed by the official Antigravity team.*
