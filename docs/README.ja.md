# Antigravity Enhancer

**Antigravity** 向けの多言語 UI ローカライズおよびモデル使用量表示パッチです。

[English](../README.md) · [한국어](README.ko.md) · **日本語** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![Download Latest (v3.2.0)](https://img.shields.io/badge/最新版をダウンロード-v3.2.0_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.2.0-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

直接リンク: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.2.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.2.0-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## 主な機能

- **9言語 UI ローカライズ**
  English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`), Русский (`ru`) に対応し、上部バー・設定・`Alt + Shift + L` で再起動なしに切り替えできます。
- **ネイティブメニュー統合**
  タイトルバーに `Antigravity Enhanced` を表示し、`Antigravity` メニュー内に `パッチバージョン`、`パッチの更新を確認`、`オリジナルに戻す` をネイティブスタイルで統合しています。
- **モデル使用量表示**
  - **右上ウィジェット**: 全モデルグループの 5 時間・週間残量を表示し、クリックで詳細ポップオーバーとリセットカウントダウンを開きます。
  - **入力欄バッジ**: 選択中モデルの横に残量を表示し、ホバー時のみそのモデルグループの詳細を表示します。クリック時はモデル選択のみが開きます。
- **アップデート耐性構造**
  最小 ASAR ブートストラッパー（`asar-patcher.js`）経由で `%APPDATA%\Antigravity\enhancer` のモジュールを読み込み、`manifest.json` の SHA-256 検証付きアプリ内更新と Windows OS 言語の自動検出インストーラーを備えています。

---

## インストール

### インストーラー (`Antigravity-Enhancer-Setup.exe`)

1. [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) をダウンロードします。
2. 実行して **パッチ適用 / 更新** をクリックします（いつでも **オリジナル復元** で元に戻せます）。

### ポータブル版 (`.zip`)

1. [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest) から [`Antigravity-Enhancer-v3.2.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.2.0-Win.zip) をダウンロードします。
2. 展開して `Antigravity-Enhancer-Setup.exe` を実行します。

---

## ビルドとテスト

```powershell
# enhancer/manifest.json の SHA-256 を再生成
node .\generate_enhancer_manifest.js

# Antigravity-Enhancer-Setup.exe、ZIP、SHA256SUMS.txt をビルド
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.2.0"

# E2E テストを実行
node .\tests\e2e\runner.js --summary -NoKill
```

---

*非公式コミュニティパッチです。Antigravity 公式チームとは関係ありません。*
