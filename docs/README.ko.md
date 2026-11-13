# Antigravity Enhancer

**Antigravity**를 위한 다국어 UI 번역 및 모델 사용량 표시 패치입니다.

[English](../README.md) · **한국어** · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![Download Latest (v3.3.1)](https://img.shields.io/badge/최신_버전_다운로드-v3.3.1_(Windows_x64)-A0A3F6?style=for-the-badge&logo=windows&logoColor=0B0B0E)](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)
[![All Releases](https://img.shields.io/badge/Releases-v3.3.1-0B0B0E?style=for-the-badge&labelColor=0B0B0E&color=CAD3F5)](https://github.com/x2tora/antigravity-enhancer/releases/latest)

직접 다운로드: [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe) · [`Antigravity-Enhancer-v3.3.1-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.1-Win.zip) · [`SHA256SUMS.txt`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/SHA256SUMS.txt)

---

## 주요 기능

- **9개 국어 UI 실시간 번역**
  English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`), Русский (`ru`)를 지원하며 상단 바, 설정 또는 `Alt + Shift + L`로 재시작 없이 즉시 전환합니다.
- **네이티브 메뉴 통합**
  제목 표시줄에 `AntigravityEnhanced`가 표시되며, `Antigravity` 메뉴 드롭다운 내에 `패치 버전`, `패치 업데이트 확인`, `원본 복구` 항목이 네이티브 스타일로 통합됩니다.
- **모델 사용량 표시**
  - **우측 상단 위젯**: 모든 모델 그룹의 5시간/주간 사용량을 표시하며, 클릭 시 전체 상세 팝오버와 초기화 카운트다운을 엽니다.
  - **입력 창 모델 배지**: 현재 선택한 모델 옆에 잔여 사용량을 표시하며, 마우스를 올리면 해당 모델 그룹의 상세 정보만 호버로 표시됩니다. 클릭 시에는 모델 선택만 정상 동작합니다.
- **업데이트 대응 구조**
  패치 모듈을 `%APPDATA%\Antigravity\enhancer`에 분리해 최소 부트스트래퍼(`asar-patcher.js`)로 로드하며, `manifest.json`의 SHA-256 해시 검증을 통해 앱 내 업데이트를 수행합니다. Windows 인스톨러는 OS 언어를 자동 인식합니다.

---

## 설치 방법

### 설치 프로그램 (`Antigravity-Enhancer-Setup.exe`)

1. [`Antigravity-Enhancer-Setup.exe`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)를 다운로드합니다.
2. 실행 후 **패치 설치 / 업데이트**를 클릭합니다. (언제든 **원본 복구**로 되돌릴 수 있습니다.)

### 무설치 압축 파일 (`.zip`)

1. [Releases](https://github.com/x2tora/antigravity-enhancer/releases/latest)에서 [`Antigravity-Enhancer-v3.3.1-Win.zip`](https://github.com/x2tora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-v3.3.1-Win.zip)을 받습니다.
2. 압축을 풀고 `Antigravity-Enhancer-Setup.exe`를 실행합니다.

---

## 소스에서 빌드 및 테스트

```powershell
# enhancer/manifest.json SHA-256 해시 재생성
node .\generate_enhancer_manifest.js

# Antigravity-Enhancer-Setup.exe, ZIP, SHA256SUMS.txt 빌드
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "3.3.1"

# E2E 테스트 실행
node .\tests\e2e\runner.js --summary -NoKill
```

---

*비공식 커뮤니티 패치입니다. Antigravity 공식 팀과 무관합니다.*
