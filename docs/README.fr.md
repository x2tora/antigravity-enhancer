# Antigravity Enhancer

Correctif de localisation multilingue et d’affichage des quotas de modèles pour **Antigravity**.

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![Download Latest (v3.3.4)](https://img.shields.io/badge/Télécharger_la_dernière_version-v3.3.4_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.3.4-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

Liens directs : [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.3.4-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.4-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## Fonctionnalités

- **Interface en 9 langues**
  Prend en charge English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`) et Русский (`ru`) avec changement sans redémarrage via la barre supérieure, les Paramètres ou `Alt + Shift + L`.
- **Intégration au menu natif**
  Affiche `AntigravityEnhanced` dans la barre de titre et intègre `Version du patch`, `Vérifier les mises à jour du patch` et `Restaurer l’original` dans le menu natif `Antigravity`.
- **Affichage des quotas de modèles**
  - **Widget en haut à droite** : affiche les quotas sur 5 heures et hebdomadaires pour tous les groupes ; un clic ouvre le détail complet et les comptes à rebours.
  - **Badge dans l’éditeur** : affiche le quota restant du modèle actif ; le survol affiche uniquement les détails de ce groupe sans bloquer l’ouverture du sélecteur de modèle au clic.
- **Architecture durable**
  Charge les modules depuis `%APPDATA%\Antigravity\enhancer` via un amorceur ASAR minimal (`asar-patcher.js`), vérifie les mises à jour intégrées par SHA-256 (`manifest.json`) et détecte la langue Windows dans l’installateur.

---

## Installation

### Installateur (`Antigravity-Enhancer-Setup.exe`)

1. Téléchargez [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe).
2. Exécutez-le puis cliquez sur **Installer / Mettre à jour** (ou **Restaurer l’original** à tout moment).

### Archive portable (`.zip`)

1. Téléchargez [`Antigravity-Enhancer-v3.3.4-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.4-Win.zip) depuis [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest).
2. Extrayez l’archive et lancez `Antigravity-Enhancer-Setup.exe`.

---

## Compilation et tests

```powershell
# Régénérer les empreintes SHA-256 de enhancer/manifest.json
node .\generate_enhancer_manifest.js

# Compiler Antigravity-Enhancer-Setup.exe, ZIP et SHA256SUMS.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.3.4"

# Lancer la suite E2E
node .\tests\e2e\runner.js --summary -NoKill
```

---

*Correctif communautaire non officiel. Non affilié ni approuvé par l’équipe officielle d’Antigravity.*
