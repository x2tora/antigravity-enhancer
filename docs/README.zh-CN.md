# Antigravity Enhancer

适用于 **Antigravity** 的多语言界面本地化与模型配额显示补丁。

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![Download Latest (v3.3.2)](https://img.shields.io/badge/下载最新版本-v3.3.2_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.3.2-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

直接下载: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.3.2-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.2-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## 功能特性

- **9 种语言实时切换**
  支持 English (`en`)、한국어 (`ko`)、日本語 (`ja`)、简体中文 (`zh-CN`)、繁體中文 (`zh-TW`)、Español (`es`)、Français (`fr`)、Deutsch (`de`)、Русский (`ru`)，可通过顶栏、设置或 `Alt + Shift + L` 免重启切换。
- **原生菜单集成**
  标题栏显示 `AntigravityEnhanced`，并在原生 `Antigravity` 下拉菜单中集成 `补丁版本`、`检查补丁更新` 与 `恢复原版`。
- **模型配额显示**
  - **右上角组件**：显示所有模型组的 5 小时及每周配额，点击可查看完整分组详情与重置倒计时。
  - **输入框内联徽章**：在当前模型选择器旁显示剩余配额，悬停仅显示当前所选模型组的详细信息，点击仅触发模型选择。
- **可更新架构**
  通过精简 ASAR 引导器（`asar-patcher.js`）从 `%APPDATA%\Antigravity\enhancer` 加载补丁模块，支持基于 `manifest.json` SHA-256 校验的应用内更新，安装器自动识别 Windows 系统语言。

---

## 安装方式

### 安装程序 (`Antigravity-Enhancer-Setup.exe`)

1. 下载 [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)。
2. 运行并点击 **安装 / 更新**（随时可点击 **恢复原版** 还原）。

### 便携压缩包 (`.zip`)

1. 从 [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest) 下载 [`Antigravity-Enhancer-v3.3.2-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.2-Win.zip)。
2. 解压后运行 `Antigravity-Enhancer-Setup.exe`。

---

## 从源码构建与测试

```powershell
# 重新生成 enhancer/manifest.json SHA-256 校验值
node .\generate_enhancer_manifest.js

# 构建 Antigravity-Enhancer-Setup.exe、ZIP 与 SHA256SUMS.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.3.2"

# 运行端到端测试
node .\tests\e2e\runner.js --summary -NoKill
```

---

*非官方社区补丁，与 Antigravity 官方团队无关联。*
