# Antigravity Enhancer

適用於 **Antigravity** 的多語言介面在地化與模型配額顯示修補程式。

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![Download Latest (v3.3.4)](https://img.shields.io/badge/下載最新版本-v3.3.4_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.3.4-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

直接下載: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.3.4-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.4-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## 功能特色

- **9 種語言免重啟切換**
  支援 English (`en`)、한국어 (`ko`)、日本語 (`ja`)、简体中文 (`zh-CN`)、繁體中文 (`zh-TW`)、Español (`es`)、Français (`fr`)、Deutsch (`de`)、Русский (`ru`)，可透過頂部列、設定或 `Alt + Shift + L` 即時切換。
- **原生選單整合**
  標題列顯示 `AntigravityEnhanced`，並在原生 `Antigravity` 下拉選單整合 `修補版本`、`檢查修補更新` 與 `還原原版`。
- **模型配額顯示**
  - **右上角元件**：顯示所有模型群組的 5 小時與每週配額，點擊可開啟完整分組詳情與重設倒數計時。
  - **輸入框內嵌徽章**：於目前模型選擇器旁顯示剩餘配額，滑鼠懸停僅顯示該模型群組詳情；點擊僅開啟模型選擇清單。
- **可更新架構**
  透過精簡 ASAR 引導程式（`asar-patcher.js`）自 `%APPDATA%\Antigravity\enhancer` 載入修補模組，支援依 `manifest.json` SHA-256 驗證的應用程式內更新，安裝程式自動偵測 Windows 系統語言。

---

## 安裝方式

### 安裝程式 (`Antigravity-Enhancer-Setup.exe`)

1. 下載 [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)。
2. 執行後點擊 **安裝 / 更新**（隨時可點擊 **還原原版** 回復原始檔案）。

### 可攜式壓縮檔 (`.zip`)

1. 至 [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest) 下載 [`Antigravity-Enhancer-v3.3.4-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.4-Win.zip)。
2. 解壓縮並執行 `Antigravity-Enhancer-Setup.exe`。

---

## 自原始碼建置與測試

```powershell
# 重新產生 enhancer/manifest.json SHA-256 雜湊
node .\generate_enhancer_manifest.js

# 建置 Antigravity-Enhancer-Setup.exe、ZIP 與 SHA256SUMS.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.3.4"

# 執行 E2E 測試
node .\tests\e2e\runner.js --summary -NoKill
```

---

*非官方社群修補程式，與 Antigravity 官方團隊無關。*
