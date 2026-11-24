# Antigravity Enhancer

15-language UI localization, model quota viewer, and cross-platform patch suite for **Antigravity**.

**English** · [한국어](docs/README.ko.md) · [日本語](docs/README.ja.md) · [简体中文](docs/README.zh-CN.md) · [繁體中文](docs/README.zh-TW.md) · [Español](docs/README.es.md) · [Français](docs/README.fr.md) · [Deutsch](docs/README.de.md) · [Русский](docs/README.ru.md) · [Português (BR)](docs/README.pt-BR.md) · [Tiếng Việt](docs/README.vi.md) · [Italiano](docs/README.it.md) · [Bahasa Indonesia](docs/README.id.md) · [Türkçe](docs/README.tr.md) · [Polski](docs/README.pl.md)

[![Download Latest (v4.1.0)](https://img.shields.io/badge/Download_Latest-v4.1.0_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v4.1.0-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

Direct files: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v4.1.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v4.1.0-Win.zip) · [`Antigravity-Enhancer-v4.1.0-Unix.tar.gz`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v4.1.0-Unix.tar.gz) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## Features

- **15-Language UI & Context Menu Localization**
  Supports English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`), Русский (`ru`), Português (Brasil) (`pt-BR`), Tiếng Việt (`vi`), Italiano (`it`), Bahasa Indonesia (`id`), Türkçe (`tr`), and Polski (`pl`) with OS language auto-detection, zero-restart switching, natural inline-link sentence translation, and native right-click context menu localization.
- **Unified Patch Settings & Custom Glossary**
  Manage language, in-app updates, localized changelogs, custom glossary overrides (with 1-click pre-fill from collected untranslated strings, inline editing, and JSON import/export), quota alerts, and custom keyboard shortcuts in one modal.
- **Model Quota Display & 72h History**
  Displays 5-hour and weekly quotas for `Gemini` and `Other` in the top bar and composer badge, with a detailed breakdown popover, 72-hour usage sparklines, and optional low-quota / reset desktop notifications.
- **Update-Safe & Cross-Platform**
  Preserves byte-identical original files with one-click restore, verifies in-app updates with SHA-256 digests and automatic restart, and supports Windows (2-step GUI installer) plus macOS & Linux (zero-dependency CLI installer).

---

## Installation

### Windows (`Antigravity-Enhancer-Setup.exe`)

1. Download [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe).
2. Run the 2-step installer, confirm the auto-detected path, and click **Install Patch** (or **Restore Original**). Antigravity restarts automatically when finished.

### macOS & Linux (`install.sh`)

```bash
tar -xzf Antigravity-Enhancer-v4.1.0-Unix.tar.gz
cd Antigravity-Enhancer-v4.1.0-Unix 2>/dev/null || true
sh ./install.sh --install
# To restore original files:
sh ./install.sh --restore
```

---

## Build & Test

```powershell
# Regenerate enhancer/manifest.json SHA-256 digests
node .\generate_enhancer_manifest.js

# Build Windows installer, ZIP archive, and SHA256SUMS.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "4.1.0"

# Run full E2E test suite
node .\tests\e2e\runner.js --summary -NoKill
```

---

*Unofficial community patch. Not affiliated with or endorsed by the official Antigravity team.*
