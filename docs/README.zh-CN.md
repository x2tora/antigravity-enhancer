# Antigravity Enhancer

面向 **Antigravity** 的 15 语言界面本地化、模型配额监控与跨平台补丁套件。

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português (BR)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Italiano](README.it.md) · [Bahasa Indonesia](README.id.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md)

[![下载最新版 (v4.1.0)](https://img.shields.io/badge/%E4%B8%8B%E8%BD%BD%E6%9C%80%E6%96%B0%E7%89%88-v4.1.0_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![所有版本](https://img.shields.io/badge/%E6%89%80%E6%9C%89%E7%89%88%E6%9C%AC-v4.1.0-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

直接下载: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v4.1.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v4.1.0-Win.zip) · [`Antigravity-Enhancer-v4.1.0-Unix.tar.gz`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v4.1.0-Unix.tar.gz) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## 核心功能

- **15 种语言界面与右键菜单本地化**：自动检测系统语言、免重启实时切换，并支持包含链接的自然语序翻译。
- **统一补丁设置与自定义术语表**：集中管理应用内更新、多语言更新日志、自定义术语表（点击未翻译文本自动填充与 JSON 导入导出）与快捷键。
- **模型配额显示与 72 小时历史**：在顶部栏显示 `Gemini` 与 `Other` 的 5 小时/每周配额、72 小时趋势图与重置倒计时。
- **无损还原与跨平台支持**：无损保留原始文件并支持一键还原，提供 Windows 两步图形安装器与 macOS/Linux CLI 脚本。

---

## 安装方式

### Windows (`Antigravity-Enhancer-Setup.exe`)

1. 下载 [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)。
2. 运行安装程序并点击 **安装补丁**（或 **恢复原版**），完成后将自动重启 Antigravity。

### macOS 与 Linux (`install.sh`)

```bash
tar -xzf Antigravity-Enhancer-v4.1.0-Unix.tar.gz
sh ./install.sh --install
# Restore:
sh ./install.sh --restore
```

---

*非官方社区补丁，与官方 Antigravity 团队无关。*
