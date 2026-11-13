# Antigravity Enhancer

Parche de localización multilingüe y visualización de cuota de modelos para **Antigravity**.

[English](../README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![Download Latest (v3.2.0)](https://img.shields.io/badge/Descargar_última_versión-v3.2.0_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.2.0-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

Descargas directas: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.2.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.2.0-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## Características

- **Interfaz en 9 idiomas**
  Compatible con English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`) y Русский (`ru`), con cambio instantáneo sin reinicio desde la barra superior, Ajustes o `Alt + Shift + L`.
- **Integración en el menú nativo**
  Muestra `Antigravity Enhanced` en la barra de título e integra `Versión del parche`, `Buscar actualizaciones del parche` y `Restaurar original` dentro del menú desplegable `Antigravity`.
- **Visualización de cuota de modelos**
  - **Widget superior derecho**: muestra la cuota de 5 horas y semanal de todos los grupos; al hacer clic abre el panel completo con cuentas regresivas.
  - **Indicador junto al selector de modelo**: muestra la cuota restante del modelo activo; al pasar el cursor muestra solo el detalle de ese grupo sin interferir con el clic de selección de modelo.
- **Arquitectura persistente**
  Carga los módulos desde `%APPDATA%\Antigravity\enhancer` mediante un arranque mínimo en ASAR (`asar-patcher.js`), verifica actualizaciones con SHA-256 usando `manifest.json` y detecta automáticamente el idioma de Windows en el instalador.

---

## Instalación

### Instalador (`Antigravity-Enhancer-Setup.exe`)

1. Descarga [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe).
2. Ejecútalo y haz clic en **Instalar / Actualizar** (puedes usar **Restaurar original** en cualquier momento).

### Archivo portable (`.zip`)

1. Descarga [`Antigravity-Enhancer-v3.2.0-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.2.0-Win.zip) desde [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest).
2. Extrae el contenido y ejecuta `Antigravity-Enhancer-Setup.exe`.

---

## Compilación y pruebas

```powershell
# Regenerar hashes SHA-256 de enhancer/manifest.json
node .\generate_enhancer_manifest.js

# Compilar Antigravity-Enhancer-Setup.exe, ZIP y SHA256SUMS.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.2.0"

# Ejecutar pruebas E2E
node .\tests\e2e\runner.js --summary -NoKill
```

---

*Parche comunitario no oficial. No afiliado ni respaldado por el equipo oficial de Antigravity.*
