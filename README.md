# Antigravity Enhancer (v3.0.0)

Community localization and usage-display patch for **Antigravity**.

---

## Features

1. **9-Language UI Localization**
   - Supports English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`), and Русский (`ru`).
   - Switch languages without restarting via the top-bar selector, Settings, or `Alt + Shift + L`.

2. **Model Quota & Usage Display**
   - Shows remaining **5-Hour** and **Weekly** quota percentages in the top bar and alongside the active model selector in the composer.
   - Displays per-group breakdown cards and reset countdown timers in a click popover.

3. **Persistence Across App Updates & In-App Updates**
   - Keeps enhancer modules outside `resources/app.asar` (`%APPDATA%\Antigravity\enhancer`) with a minimal bootstrapper (`asar-patcher`).
   - Includes a standalone launcher helper (`AntigravityEnhancerLauncher.exe`) to re-apply the bootstrapper after official app updates.
   - Open the Enhancer panel (`Alt + Shift + E` or top bar button) to check and apply updates from `x2tora/antigravity-enhancer` with SHA-256 verification and automatic rollback support.

---

## Installation

### Option 1: Standalone Installer (`Antigravity-Enhancer-Setup.exe`)
1. Download **[Antigravity-Enhancer-Setup.exe](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)** from **[Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest)**.
2. Verify checksum against `SHA256SUMS.txt` if desired.
3. Run `Antigravity-Enhancer-Setup.exe` and click install (or restore original files at any time).

### Option 2: Portable Archive (`.zip`)
1. Download `Antigravity-Enhancer-v3.0.0-Win.zip` from **[Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest)**.
2. Extract and run `Antigravity-Enhancer-Setup.exe`.

---

## Building from Source

```powershell
# Regenerate enhancer/manifest.json SHA-256 hashes
node .\generate_enhancer_manifest.js

# Build Antigravity-Enhancer-Setup.exe, AntigravityEnhancerLauncher.exe, SHA256SUMS.txt, and ZIP
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.0.0"

# Run E2E verification suite
node .\tests\e2e\runner.js --summary -NoKill
```

---

*Disclaimer: Unofficial community patch. Not affiliated with or endorsed by the official Antigravity team.*
