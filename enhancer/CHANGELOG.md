# Changelog

All notable changes to **Antigravity Enhancer** are documented in this file.
Older pre-v3 legacy patch logs have been consolidated into milestone summaries below.

## [4.0.0] - 2026-11-23

### Added
- **Unified Patch Settings & Changelog Viewer**: Consolidated Update Check, Restore Original, and title-bar dropdown items into a unified **패치 설정 (`Patch Settings`)** modal with a dedicated in-app **Changelog** viewer (`CHANGELOG.md`), markdown release-notes rendering, and inline confirmation for **Clear 72h History**.
- **Native Right-Click Context Menu Localization**: Hooked Electron `Menu.buildFromTemplate` in `main-enhancer.js` and synced active language preferences between renderer and main process so project, group, and conversation right-click menus translate across all supported languages.
- **Enhanced UI Animations & Fixed-Height Layout**: Added GSAP entrance, sliding tab pill, horizontal content transitions, native-styled controls, and fixed modal height (`360px`) without layout shift.

### Improved
- **Untranslated Collector Noise Filtering**: Filtered out project names, conversation titles, file paths, brand/model names (`Antigravity`, `Argon`, `Gemini`), agent tool/step logs, and dynamic timers (`Still thinking, Ns`).
- **Dictionary Expansion**: Added 62 new static UI & context-menu entries (project/group/conversation menus, `Breadcrumb`, `Artifact Viewer header`, `Record Audio`, `Working`, `Walkthrough`) across all 8 target languages.

---

## [3.5.0 – 3.5.4] - 2026-11

### Added
- **Translation Engine 2.0**: Active-language IPC dictionary slicing, local custom glossary (`user-glossary.json`) with JSON Import/Export, and opt-in untranslated string collection.
- **Quota Intelligence**: 72-hour local ring-buffer persistence, 72h usage sparklines, compact quota card toggle, and opt-in low-quota / reset desktop alerts.
- **Control Center & Zero-Flash Auto-Repatch**: 9-language Control Center modal, custom keyboard shortcuts (`ev.code` fallback), `wscript.exe` zero-flash auto-repatch wrappers, and `auto-repatch-status.json` diagnostics.

---

## [3.3.0 – 3.4.3] - 2026-11

### Added
- **In-App Localized Release Notes**: Automatically displays GitHub release notes in the active app language inside the updater UI.
- **Antigravity 2.34.0 Compatibility**: Full UI/model compatibility, composer hover single-model quota separation, and improved installer palette (`#0B0B0E` / `#CAD3F5` / `#A0A3F6`).

---

## [3.0.0 – 3.2.0] - 2026-11

### Added
- **Lossless ASAR v4 Micro-Bootstrapper**: Safe byte-identical original `app.asar` preservation, one-click vanilla restore, and modular `%APPDATA%\Antigravity\enhancer` runtime.
- **Secure In-App Self-Updater**: Strict GitHub allowlist (`x2tora/antigravity-enhancer`), SHA-256 manifest verification, atomic staging, and crash failsafe rollback.
