# Changelog

All notable changes to **Antigravity Enhancer** are documented in this file.
Older pre-v3 legacy patch logs have been consolidated into milestone summaries below.

## [4.0.4.1] - 2026-11-24

### Changed
- **Silent Auto-Repatch Execution**: Replaced `powershell.exe` invocation in `auto-repatch.vbs` with direct `Antigravity.exe` execution under `ELECTRON_RUN_AS_NODE=1` after a WMI process check, eliminating periodic terminal/PowerShell window popups.
- **Auto-Repatch Schedule Interval**: Changed `AntigravityEnhancerAutoRepatch` scheduled task interval from every 5 minutes to every 1 hour (`/SC HOURLY /MO 1`).

---

## [4.0.4] - 2026-11-23

### Added
- **SSH Host, Automations & Marketplace Translations**: Added 44 static UI strings (352 entries across 8 languages) covering SSH Host connection dialogs, Automations/Scheduled runs, Terminal header/input, Side Question prompts, and Marketplace categories/descriptions, plus 14 dynamic regex rules × 8 languages (`Install ...`, `Add ...`, `Details for ...`, `More actions for ...`, `Plugins in ...`, `See more in ...`, `See N more ...`, `N tools disabled`, `Filter skills and rules: ...`, `Today ...`, `Daily at ...`).

### Improved
- **Collector Filtering**: Excluded repeated-character terminal measurements (`WWWW...`), `user@host:port`, `PowerShell 7.6.10`, marketplace plugin brand names, 6+ digit CI run IDs, and dynamic marketplace/automation patterns.

---

## [4.0.3] - 2026-11-23

### Added
- **Viewer, Subagent & Dynamic Counter Translations**: Added 18 static UI translations (`View File`, `Viewing Diff`, `Side Questions`, `Fold code block`, `Unread`, `Queued message sent`, `Subagent Conversation`, `User cancelled agent execution`, `Chat Layout`, `Zoom 100%, reset to fit`, `Download image`, `Low`/`Medium`/`High`, model descriptions) and 24 dynamic regex rules (`lines added, lines removed`, `excluded`, `active and archived conversations`) across all 8 target languages.

### Improved
- **Patch Settings Modal Centering & Glossary Grid Layout**: Removed external `.agy-overlay` class interference and enforced explicit viewport centering (`100vw × 100vh`) so Patch Settings always centers horizontally; switched the custom glossary add row to CSS Grid (`minmax(0, 1fr) minmax(0, 1fr) auto`) with `white-space: nowrap` to prevent button wrapping or overflow; unified the Settings page `AntigravityEnhanced` card into a single `패치 설정` button.
- **Collector Noise Filtering**: Excluded quoted code literals (`'fs'`), MCP tool IDs (`mcp:rea:...`), leading-ellipsis fragments (`…`), code comments (`// ...`), model names (`Claude Opus/Sonnet 5.5`), and `Delete side question:` titles.

---

## [4.0.2] - 2026-11-23

### Added
- **Expanded UI & Dynamic Pattern Translations**: Added 34 static UI strings (251 entries across 8 languages) including `Orchestrator Settings`, `Interface Layout`, `Give Feedback`, `Side Question header`, `File Viewer header`, `Raw`, `System`/`Light`/`Dark`, color pickers, and customization loading states, plus 9 dynamic pattern rules × 8 languages (`Shortcut ... for ...`, `Remove shortcut ... for ...`, `Add shortcut for ...`, `Send feedback as ...`, `N active conversations`, `Rules/Skills/Subagents/Mcp Tools: N tokens`).

### Improved
- **Untranslated Collector Noise Filtering**: Excluded email addresses, trailing-slash folder names, CSS size units (`14px`), standalone key names, `Side Question:` titles, model names (`Gemini 4 Neon`/`Hydrogen`), split markdown/changelog fragments, and versioned commit/agent logs.

---

## [4.0.1] - 2026-11-23

### Added
- **Full 9-Language Typography & Webfont Stack**: Added per-language font prioritization and webfont stylesheets (`Pretendard Variable`, `Pretendard JP Variable`, `Noto Sans SC`, `Noto Sans TC`, `Noto Sans`) with native OS fallbacks so Korean, Japanese, Simplified/Traditional Chinese, Cyrillic (Russian), and European languages render cleanly without mixed CJK glyphs.

### Improved
- **Centered Max-Height Modal Anchor**: Positioned Patch Settings (`#ag-enhancer-control-center`) so its maximum height (`min(86vh, 680px)`) sits vertically centered on screen while keeping the top edge fixed during height transitions.
- **Installer Logo & Discord Release Webhook**: Replaced the installer icon with the `antigravity.xitora.cc` mark (`assets/icon.png`, `assets/icon.ico`) and updated Discord release notifications with `AntigravityEnhancer` branding, custom avatar, `https://antigravity.xitora.cc` title link, and a `릴리스 다운로드` link button.

---

## [4.0.0.1] - 2026-11-23

### Improved
- **Dynamic Patch Settings Sizing & Top-Anchored Modal**: Replaced fixed modal body height (`360px`) with dynamic `auto` height + smooth GSAP vertical height transitions, widened the modal (`540px` → `660px`), and anchored the modal to the top (`align-items: flex-start`) so tab positions never shift while switching tabs or expanding changelog cards.
- **Unclipped Changelog Cards & 4-Part Semver**: Added `flex-shrink: 0` to changelog cards so release notes never clip inside the flex container, and updated `compareSemver` and installer assembly versioning to support 4-segment versions (`4.0.0.1`).

---

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
