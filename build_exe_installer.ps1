param(
    [string]$Version = "4.1.1",
    [string]$OutputExe = "",
    [string]$SignCertThumbprint = ""
)

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputExe)) {
    $OutputExe = Join-Path $projectRoot "Antigravity-Enhancer-Setup.exe"
}
$enhancerSrcDir = Join-Path $projectRoot "enhancer"
$installerSrcDir = Join-Path $projectRoot "installer"
$assetsDir = Join-Path $projectRoot "assets"
$patchDir = Join-Path $projectRoot "Antigravity_MultiLang_Patch"
$pngPath = Join-Path $assetsDir "icon.png"
if (-not (Test-Path $pngPath)) { $pngPath = Join-Path $projectRoot "extracted_korean\icon.png" }
$icoPath = Join-Path $assetsDir "icon.ico"
if (-not (Test-Path $icoPath)) {
    $fallbackIco = Join-Path $patchDir "icon.ico"
    if (Test-Path $fallbackIco) { $icoPath = $fallbackIco }
}
$manifestPath = Join-Path $installerSrcDir "app.manifest"

if (-not (Test-Path (Join-Path $enhancerSrcDir "main-enhancer.js"))) { throw "enhancer modules not found at $enhancerSrcDir" }
if (-not (Test-Path (Join-Path $installerSrcDir "AsarMicroPatcher.cs"))) { throw "AsarMicroPatcher.cs not found at $installerSrcDir" }
if (-not (Test-Path $manifestPath)) { throw "app.manifest not found at $manifestPath" }

# 1. Convert icon.png to valid Windows .ico if needed
if ((Test-Path $pngPath) -and (-not (Test-Path $icoPath))) {
    $pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]1)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$pngBytes.Length)
    $bw.Write([uint32]22)
    $bw.Write($pngBytes)
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
    $bw.Close()
}

# 2. WPF Installer C# Source (.NET 4.0)
# Palette tokens: #0B0B0E (base), #121319 (card), #181A23 (raised), #CAD3F5 (primary text), #A0A3F6 (accent)
$csSource = @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using Microsoft.Win32;

[assembly: AssemblyTitle("Antigravity Enhancer Setup")]
[assembly: AssemblyDescription("Antigravity Multilingual UI and Model Quota Installer")]
[assembly: AssemblyCompany("x2tora")]
[assembly: AssemblyProduct("Antigravity Enhancer")]
[assembly: AssemblyCopyright("Copyright (C) 2026 x2tora")]
[assembly: AssemblyVersion("__ASM_VERSION__")]
[assembly: AssemblyFileVersion("__ASM_VERSION__")]

namespace AntigravityEnhancer
{
    public static class InstallerI18n
    {
        public static readonly string[] SupportedLanguages = new string[]
        {
            "en", "ko", "ja", "zh-CN", "zh-TW", "es", "fr", "de", "ru",
            "pt-BR", "vi", "it", "id", "tr", "pl"
        };

        public static string GetLanguageNativeLabel(string lang)
        {
            switch (lang)
            {
                case "ko": return "한국어";
                case "ja": return "日本語";
                case "zh-CN": return "简体中文";
                case "zh-TW": return "繁體中文";
                case "es": return "Español";
                case "fr": return "Français";
                case "de": return "Deutsch";
                case "ru": return "Русский";
                case "pt-BR": return "Português (BR)";
                case "vi": return "Tiếng Việt";
                case "it": return "Italiano";
                case "id": return "Bahasa Indonesia";
                case "tr": return "Türkçe";
                case "pl": return "Polski";
                default: return "English";
            }
        }

        public static string ResolveCultureCode(string cultureName, string twoLetterIso)
        {
            string name = (cultureName ?? "").Trim();
            string lowerName = name.ToLowerInvariant().Replace('_', '-');
            string two = (twoLetterIso ?? "").Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(two) && !string.IsNullOrEmpty(lowerName))
            {
                int dash = lowerName.IndexOf('-');
                two = (dash > 0) ? lowerName.Substring(0, dash) : lowerName;
            }

            if (two == "ko") return "ko";
            if (two == "ja") return "ja";
            if (two == "zh")
            {
                if (lowerName.Contains("-tw") || lowerName.Contains("-hk") || lowerName.Contains("-mo") || lowerName.Contains("hant"))
                {
                    return "zh-TW";
                }
                return "zh-CN";
            }
            if (two == "pt") return "pt-BR";
            if (two == "vi") return "vi";
            if (two == "it") return "it";
            if (two == "id" || two == "in") return "id";
            if (two == "tr") return "tr";
            if (two == "pl") return "pl";
            if (two == "es") return "es";
            if (two == "fr") return "fr";
            if (two == "de") return "de";
            if (two == "ru") return "ru";
            return "en";
        }

        public static string DetectLanguage()
        {
            try
            {
                string envLang = Environment.GetEnvironmentVariable("ANTIGRAVITY_ENHANCER_LANG");
                if (!string.IsNullOrEmpty(envLang))
                {
                    string trimmed = envLang.Trim();
                    foreach (string s in SupportedLanguages)
                    {
                        if (string.Equals(s, trimmed, StringComparison.OrdinalIgnoreCase)) return s;
                    }
                    return ResolveCultureCode(trimmed, "");
                }
            }
            catch { }

            try
            {
                CultureInfo ui = CultureInfo.CurrentUICulture;
                if (ui == null || string.IsNullOrEmpty(ui.Name)) ui = CultureInfo.InstalledUICulture;
                if (ui != null) return ResolveCultureCode(ui.Name, ui.TwoLetterISOLanguageName);
            }
            catch { }
            return "en";
        }

        private static readonly Dictionary<string, Dictionary<string, string>> Tables = BuildTables();

        private static void AddAll(Dictionary<string, Dictionary<string, string>> t, string key,
            string en, string ko, string ja, string zhCn, string zhTw, string es, string fr, string de, string ru)
        {
            t["en"][key] = en;
            t["ko"][key] = ko;
            t["ja"][key] = ja;
            t["zh-CN"][key] = zhCn;
            t["zh-TW"][key] = zhTw;
            t["es"][key] = es;
            t["fr"][key] = fr;
            t["de"][key] = de;
            t["ru"][key] = ru;
        }

        private static Dictionary<string, Dictionary<string, string>> BuildTables()
        {
            var t = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);
            foreach (string lang in SupportedLanguages)
            {
                t[lang] = new Dictionary<string, string>(StringComparer.Ordinal);
            }

            AddAll(t, "HeroTitle",
                "Antigravity Language & Usage Patch",
                "Antigravity 다국어 · 사용량 패치",
                "Antigravity 多言語・使用量パッチ",
                "Antigravity 多语言与用量补丁",
                "Antigravity 多語言與用量修補",
                "Parche de idioma y uso de Antigravity",
                "Patch langue et quota Antigravity",
                "Antigravity Sprach- & Kontingent-Patch",
                "Патч локализации и квот Antigravity");

            AddAll(t, "Step1Label",
                "Configure", "설정 확인", "設定確認", "确认设置", "確認設定", "Configurar", "Configurer", "Konfiguration", "Настройка");

            AddAll(t, "Step2Label",
                "Apply & Restart", "작업 진행", "適用と再起動", "执行与重启", "執行與重啟", "Aplicar y reiniciar", "Appliquer", "Ausführen", "Выполнение");

            AddAll(t, "BadgeVerified",
                "Detected", "자동 인식됨", "自動検出", "已自动识别", "已自動識別", "Detectado", "Détecté", "Erkannt", "Обнаружено");

            AddAll(t, "BadgePatched",
                "Patch Active", "패치 적용됨", "適用済み", "补丁已生效", "修補已生效", "Parche activo", "Patch actif", "Patch aktiv", "Патч активен");

            AddAll(t, "BadgeNotFound",
                "Not Found", "경로 미감지", "未検出", "未检测到", "未偵測到", "No detectado", "Introuvable", "Nicht gefunden", "Не найдено");

            AddAll(t, "BadgeCheckPath",
                "Invalid Path", "경로 확인 필요", "パス要確認", "路径无效", "路徑無效", "Ruta no válida", "Chemin invalide", "Ungültiger Pfad", "Неверный путь");

            AddAll(t, "PathLabel",
                "Installation Directory", "설치 경로", "インストール先", "安装路径", "安裝路徑", "Carpeta de instalación", "Dossier d’installation", "Installationspfad", "Папка установки");

            AddAll(t, "BtnBrowse",
                "Change", "변경", "変更", "更改", "變更", "Cambiar", "Modifier", "Ändern", "Изменить");

            AddAll(t, "BrowseDesc",
                "Select the Antigravity installation folder",
                "Antigravity가 설치된 폴더를 선택하세요",
                "Antigravity のインストール先フォルダを選択してください",
                "请选择 Antigravity 安装文件夹",
                "請選擇 Antigravity 安裝資料夾",
                "Seleccione la carpeta de instalación de Antigravity",
                "Sélectionnez le dossier d’installation d’Antigravity",
                "Wählen Sie den Installationsordner von Antigravity",
                "Выберите папку установки Antigravity");

            AddAll(t, "WhatsNewTitle",
                "What's Changed", "변경 사항 요약", "主な変更点", "更新摘要", "變更摘要", "Novedades", "Nouveautés", "Änderungen", "Что нового");

            AddAll(t, "DefaultNotes",
                "Expanded UI, model, and Worktree translations across 9 languages\nRefined step-by-step setup with automatic restart\nImproved quota tracking and silent background maintenance",
                "9개 언어 UI · 모델 설명 · 워크트리 번역 대폭 확충\n단계별 설치 화면 개편 및 완료 후 자동 재시작 지원\n실시간 사용량 표시 및 무음 백그라운드 유지 관리",
                "9言語のUI・モデル説明・ワークツリー翻訳を拡充\nステップ形式のセットアップと完了後の自動再起動に対応\nクォータ表示の改善とサイレント自動保守",
                "扩展 9 种语言的界面、模型说明与工作树翻译\n全新分步安装流程，完成后自动重启应用\n优化配额监控与静默后台维护",
                "擴充 9 種語言的介面、模型說明與工作樹翻譯\n全新分步安裝流程，完成後自動重新啟動\n最佳化配額監控與靜默背景維護",
                "Traducciones ampliadas para modelos, árboles de trabajo e interfaz en 9 idiomas\nInstalación paso a paso con reinicio automático al finalizar\nSeguimiento de cuota mejorado y mantenimiento silencioso",
                "Traductions étendues pour les modèles, arbres de travail et l’interface en 9 langues\nInstallation étape par étape avec redémarrage automatique\nSuivi des quotas amélioré et maintenance silencieuse",
                "Erweiterte Übersetzungen für Modelle, Worktrees und Oberfläche in 9 Sprachen\nSchrittweise Einrichtung mit automatischem Neustart\nVerbesserte Kontingentanzeige und lautlose Hintergrundwartung",
                "Расширен перевод моделей, рабочих деревьев и интерфейса на 9 языках\nПошаговая установка с автоматическим перезапуском\nУлучшенный мониторинг квот и тихое фоновое обслуживание");

            AddAll(t, "BtnInstall",
                "Install Patch", "패치 설치", "パッチをインストール", "安装补丁", "安裝修補", "Instalar parche", "Installer le patch", "Patch installieren", "Установить патч");

            AddAll(t, "BtnRestore",
                "Restore Original", "원본 복구", "オリジナルに戻す", "恢复原版", "還原原版", "Restaurar original", "Restaurer l’original", "Original wiederherstellen", "Восстановить оригинал");

            AddAll(t, "BtnBack",
                "Back", "돌아가기", "戻る", "返回", "返回", "Volver", "Retour", "Zurück", "Назад");

            AddAll(t, "RunInstallTitle",
                "Installing Patch", "패치 설치 진행 중", "パッチを適用しています", "正在安装补丁", "正在安裝修補", "Instalando parche", "Installation du patch", "Patch wird installiert", "Установка патча");

            AddAll(t, "RunRestoreTitle",
                "Restoring Original", "원본 복구 진행 중", "オリジナルを復元しています", "正在恢复原版", "正在還原原版", "Restaurando original", "Restauration de l’original", "Original wird wiederhergestellt", "Восстановление оригинала");

            AddAll(t, "LogTitle",
                "Activity Log", "작업 로그", "作業ログ", "操作日志", "作業日誌", "Registro de actividad", "Journal d’activité", "Aktivitätsprotokoll", "Журнал операций");

            AddAll(t, "PrepInstall",
                "Preparing installation", "패치 설치를 준비합니다", "インストールの準備中", "正在准备安装", "正在準備安裝", "Preparando instalación", "Préparation de l’installation", "Installation wird vorbereitet", "Подготовка установки");

            AddAll(t, "PrepRestore",
                "Preparing restore", "원본 복구를 준비합니다", "復元の準備中", "正在准备恢复", "正在準備還原", "Preparando restauración", "Préparation de la restauration", "Wiederherstellung wird vorbereitet", "Подготовка восстановления");

            AddAll(t, "ProgKill",
                "Closing running Antigravity processes", "실행 중인 Antigravity 종료 중", "実行中の Antigravity を終了中", "正在关闭运行中的 Antigravity", "正在關閉執行中的 Antigravity", "Cerrando procesos de Antigravity", "Fermeture d’Antigravity", "Antigravity wird beendet", "Завершение процессов Antigravity");

            AddAll(t, "ProgDeploy",
                "Deploying language and enhancer modules", "다국어 및 패치 모듈 배치 중", "翻訳・拡張モジュールを配置中", "正在部署多语言与增强模块", "正在部署多語言與增強模組", "Copiando módulos del parche", "Copie des modules du patch", "Patch-Module werden bereitgestellt", "Копирование модулей патча");

            AddAll(t, "ProgAsar",
                "Applying lossless bootstrapper to app.asar", "app.asar 부트스트랩 적용 중", "app.asar にブートストラップを適用中", "正在向 app.asar 写入引导程序", "正在向 app.asar 寫入引導程式", "Aplicando arranque en app.asar", "Application sur app.asar", "Bootstrapper wird auf app.asar angewendet", "Применение загрузчика к app.asar");

            AddAll(t, "ProgClean",
                "Refreshing application cache", "캐시 정리 중", "キャッシュを整理中", "正在清理应用缓存", "正在清理應用快取", "Limpiando caché", "Nettoyage du cache", "Cache wird bereinigt", "Очистка кэша");

            AddAll(t, "ProgInstallDone",
                "Patch installed. Restarting Antigravity", "설치 완료 · Antigravity 자동 재시작 중", "完了しました。Antigravity を再起動します", "安装完成，正在自动重启 Antigravity", "安裝完成，正在自動重新啟動 Antigravity", "Parche instalado. Reiniciando Antigravity", "Patch installé. Redémarrage d’Antigravity", "Patch installiert. Antigravity startet neu", "Патч установлен. Перезапуск Antigravity");

            AddAll(t, "ProgRestoring",
                "Restoring original application files", "원본 애플리케이션 파일 복원 중", "オリジナルファイルを復元中", "正在恢复原始应用文件", "正在還原原始應用檔案", "Restaurando archivos originales", "Restauration des fichiers d’origine", "Originaldateien werden wiederhergestellt", "Восстановление оригинальных файлов");

            AddAll(t, "ProgRestoreDone",
                "Original restored. Restarting Antigravity", "복구 완료 · Antigravity 자동 재시작 중", "復元完了。Antigravity を再起動します", "已恢复原版，正在自动重启 Antigravity", "已還原原版，正在自動重新啟動 Antigravity", "Original restaurado. Reiniciando Antigravity", "Original restauré. Redémarrage d’Antigravity", "Original wiederhergestellt. Neustart läuft", "Оригинал восстановлен. Перезапуск Antigravity");

            AddAll(t, "ErrStatus",
                "Operation could not be completed", "작업을 완료하지 못했습니다", "処理を完了できませんでした", "操作未能完成", "作業未能完成", "No se pudo completar la operación", "L’opération a échoué", "Vorgang fehlgeschlagen", "Не удалось завершить операцию");

            AddAll(t, "ErrPrefix",
                "Error: ", "오류: ", "エラー: ", "错误: ", "錯誤: ", "Error: ", "Erreur : ", "Fehler: ", "Ошибка: ");

            AddAll(t, "ErrMissingResFmt",
                "Embedded resource not found: {0}",
                "내장 리소스를 찾을 수 없습니다: {0}",
                "埋め込みリソースが見つかりません: {0}",
                "找不到内置资源: {0}",
                "找不到內建資源: {0}",
                "Recurso incrustado no encontrado: {0}",
                "Ressource intégrée introuvable : {0}",
                "Eingebettete Ressource fehlt: {0}",
                "Встроенный ресурс не найден: {0}");

            AddAll(t, "LogLaunching",
                "Launching Antigravity", "Antigravity 실행 중", "Antigravity を起動しています", "正在启动 Antigravity", "正在啟動 Antigravity", "Iniciando Antigravity", "Lancement d’Antigravity", "Antigravity wird gestartet", "Запуск Antigravity");

            AddAll(t, "LogLaunchFail",
                "Launch failed: ", "실행 실패: ", "起動失敗: ", "启动失败: ", "啟動失敗: ", "Error al iniciar: ", "Échec du lancement : ", "Start fehlgeschlagen: ", "Ошибка запуска: ");

            AddAll(t, "LogExeMissing",
                "Executable not found: ", "실행 파일 없음: ", "実行ファイルが見つかりません: ", "未找到可执行文件: ", "找不到可執行檔: ", "Ejecutable no encontrado: ", "Exécutable introuvable : ", "Datei nicht gefunden: ", "Файл не найден: ");

            AddExt(t, "HeroTitle",
                "Patch de idioma e cota do Antigravity",
                "Bản vá đa ngôn ngữ & hạn mức Antigravity",
                "Patch lingua e quota per Antigravity",
                "Patch bahasa & kuota Antigravity",
                "Antigravity Dil ve Kota Yaması",
                "Łatka języka i limitów Antigravity");
            AddExt(t, "Step1Label", "Configurar", "Cấu hình", "Configura", "Konfigurasi", "Yapılandır", "Konfiguracja");
            AddExt(t, "Step2Label", "Aplicar e reiniciar", "Áp dụng & khởi động lại", "Applica e riavvia", "Terapkan & mulai ulang", "Uygula ve yeniden başlat", "Zastosuj i uruchom");
            AddExt(t, "BadgeVerified", "Detectado", "Đã nhận diện", "Rilevato", "Terdeteksi", "Algılandı", "Wykryto");
            AddExt(t, "BadgePatched", "Patch ativo", "Đã cài bản vá", "Patch attiva", "Patch aktif", "Yama etkin", "Łatka aktywna");
            AddExt(t, "BadgeNotFound", "Não encontrado", "Không tìm thấy", "Non trovato", "Tidak ditemukan", "Bulunamadı", "Nie znaleziono");
            AddExt(t, "BadgeCheckPath", "Caminho inválido", "Đường dẫn không hợp lệ", "Percorso non valido", "Jalur tidak valid", "Geçersiz yol", "Nieprawidłowa ścieżka");
            AddExt(t, "PathLabel", "Pasta de instalação", "Thư mục cài đặt", "Cartella di installazione", "Direktori instalasi", "Kurulum dizini", "Katalog instalacji");
            AddExt(t, "BtnBrowse", "Alterar", "Thay đổi", "Cambia", "Ubah", "Değiştir", "Zmień");
            AddExt(t, "BrowseDesc",
                "Selecione a pasta de instalação do Antigravity",
                "Chọn thư mục cài đặt Antigravity",
                "Seleziona la cartella di installazione di Antigravity",
                "Pilih folder instalasi Antigravity",
                "Antigravity kurulum klasörünü seçin",
                "Wybierz folder instalacji Antigravity");
            AddExt(t, "WhatsNewTitle", "Resumo das alterações", "Tóm tắt thay đổi", "Riepilogo novità", "Ringkasan perubahan", "Değişiklik özeti", "Podsumowanie zmian");
            AddExt(t, "DefaultNotes",
                "Tradução completa em 15 idiomas para modelos, Worktree e menus\nInstalação em etapas com reinício automático ao concluir\nMonitoramento de cota em tempo real e manutenção silenciosa",
                "Hỗ trợ đầy đủ 15 ngôn ngữ cho mô hình, Worktree và menu\nCài đặt theo từng bước và tự động khởi động lại khi hoàn tất\nTheo dõi hạn mức thời gian thực và tự bảo trì ngầm",
                "Traduzione completa in 15 lingue per modelli, Worktree e menu\nInstallazione guidata con riavvio automatico al termine\nMonitoraggio quota in tempo reale e manutenzione silenziosa",
                "Terjemahan lengkap 15 bahasa untuk model, Worktree, dan menu\nPemasangan bertahap dengan mulai ulang otomatis saat selesai\nPemantauan kuota waktu nyata dan pemeliharaan senyap",
                "Modeller, Worktree ve menüler için 15 dilde tam çeviri\nTamamlandığında otomatik yeniden başlatmalı adım adım kurulum\nGerçek zamanlı kota takibi ve sessiz arka plan bakımı",
                "Pełne tłumaczenie na 15 języków dla modeli, Worktree i menu\nInstalacja krok po kroku z automatycznym restartem po zakończeniu\nMonitorowanie limitów na żywo i cicha konserwacja w tle");
            AddExt(t, "BtnInstall", "Instalar patch", "Cài đặt bản vá", "Installa patch", "Pasang patch", "Yamayı kur", "Zainstaluj łatkę");
            AddExt(t, "BtnRestore", "Restaurar original", "Khôi phục bản gốc", "Ripristina originale", "Pulihkan asli", "Orijinale dön", "Przywróć oryginał");
            AddExt(t, "BtnBack", "Voltar", "Quay lại", "Indietro", "Kembali", "Geri", "Wstecz");
            AddExt(t, "RunInstallTitle", "Instalando patch", "Đang cài đặt bản vá", "Installazione patch", "Memasang patch", "Yama kuruluyor", "Instalowanie łatki");
            AddExt(t, "RunRestoreTitle", "Restaurando original", "Đang khôi phục bản gốc", "Ripristino originale", "Memulihkan versi asli", "Orijinal geri yükleniyor", "Przywracanie oryginału");
            AddExt(t, "LogTitle", "Registro de atividade", "Nhật ký hoạt động", "Registro attività", "Log aktivitas", "İşlem günlüğü", "Dziennik działań");
            AddExt(t, "PrepInstall", "Preparando instalação", "Đang chuẩn bị cài đặt", "Preparazione installazione", "Menyiapkan pemasangan", "Kurulum hazırlanıyor", "Przygotowywanie instalacji");
            AddExt(t, "PrepRestore", "Preparando restauração", "Đang chuẩn bị khôi phục", "Preparazione ripristino", "Menyiapkan pemulihan", "Geri yükleme hazırlanıyor", "Przygotowywanie przywracania");
            AddExt(t, "ProgKill", "Fechando processos do Antigravity", "Đang đóng tiến trình Antigravity", "Chiusura processi Antigravity", "Menutup proses Antigravity", "Antigravity işlemleri kapatılıyor", "Zamykanie procesów Antigravity");
            AddExt(t, "ProgDeploy", "Copiando módulos de idioma e patch", "Đang triển khai mô-đun ngôn ngữ", "Copia moduli lingua e patch", "Menyalin modul bahasa dan patch", "Dil ve yama modülleri kopyalanıyor", "Kopiowanie modułów językowych");
            AddExt(t, "ProgAsar", "Aplicando bootstrapper em app.asar", "Đang áp dụng vào app.asar", "Applicazione bootstrapper a app.asar", "Menerapkan bootstrapper ke app.asar", "app.asar önyükleyicisi uygulanıyor", "Aktualizowanie pliku app.asar");
            AddExt(t, "ProgClean", "Limpando cache do aplicativo", "Đang làm mới bộ nhớ đệm", "Pulizia cache applicazione", "Membersihkan cache aplikasi", "Uygulama önbelleği temizleniyor", "Czyszczenie pamięci podręcznej");
            AddExt(t, "ProgInstallDone", "Patch instalado. Reiniciando Antigravity", "Đã cài xong. Đang khởi động lại Antigravity", "Patch installata. Riavvio di Antigravity", "Patch terpasang. Memulai ulang Antigravity", "Yama kuruldu. Antigravity yeniden başlatılıyor", "Zainstalowano. Ponowne uruchamianie Antigravity");
            AddExt(t, "ProgRestoring", "Restaurando arquivos originais", "Đang khôi phục tệp gốc", "Ripristino file originali", "Memulihkan file asli", "Orijinal dosyalar geri yükleniyor", "Przywracanie oryginalnych plików");
            AddExt(t, "ProgRestoreDone", "Original restaurado. Reiniciando Antigravity", "Đã khôi phục. Đang khởi động lại Antigravity", "Originale ripristinato. Riavvio in corso", "Versi asli dipulihkan. Memulai ulang Antigravity", "Orijinale dönüldü. Yeniden başlatılıyor", "Przywrócono oryginał. Ponowne uruchamianie");
            AddExt(t, "ErrStatus", "Não foi possível concluir a operação", "Không thể hoàn tất thao tác", "Impossibile completare l’operazione", "Operasi tidak dapat diselesaikan", "İşlem tamamlanamadı", "Nie udało się ukończyć operacji");
            AddExt(t, "ErrPrefix", "Erro: ", "Lỗi: ", "Errore: ", "Kesalahan: ", "Hata: ", "Błąd: ");
            AddExt(t, "ErrMissingResFmt", "Recurso interno não encontrado: {0}", "Không tìm thấy tài nguyên: {0}", "Risorsa interna mancante: {0}", "Sumber daya tidak ditemukan: {0}", "Gömülü kaynak bulunamadı: {0}", "Brak zasobu wewnętrznego: {0}");
            AddExt(t, "LogLaunching", "Iniciando Antigravity", "Đang khởi chạy Antigravity", "Avvio di Antigravity", "Menjalankan Antigravity", "Antigravity başlatılıyor", "Uruchamianie Antigravity");
            AddExt(t, "LogLaunchFail", "Falha ao iniciar: ", "Khởi chạy thất bại: ", "Avvio non riuscito: ", "Gagal menjalankan: ", "Başlatma hatası: ", "Błąd uruchamiania: ");
            AddExt(t, "LogExeMissing", "Executável não encontrado: ", "Không tìm thấy tệp thực thi: ", "Eseguibile non trovato: ", "File eksekusi tidak ditemukan: ", "Çalıştırılabilir dosya yok: ", "Nie znaleziono pliku: ");

            return t;
        }

        private static void AddExt(Dictionary<string, Dictionary<string, string>> t, string key,
            string ptBr, string vi, string it, string id, string tr, string pl)
        {
            t["pt-BR"][key] = ptBr;
            t["vi"][key] = vi;
            t["it"][key] = it;
            t["id"][key] = id;
            t["tr"][key] = tr;
            t["pl"][key] = pl;
        }

        public static string Get(string lang, string key)
        {
            Dictionary<string, string> dict;
            string val;
            if (!string.IsNullOrEmpty(lang) && Tables.TryGetValue(lang, out dict) && dict.TryGetValue(key, out val))
            {
                return val;
            }
            if (Tables.TryGetValue("en", out dict) && dict.TryGetValue(key, out val))
            {
                return val;
            }
            return key;
        }
    }

    public class App : Application
    {
        [STAThread]
        public static void Main()
        {
            App app = new App();
            app.Run(new MainWindow());
        }
    }

    public class MainWindow : Window
    {
        // Strict neutral ramp + single accent (#0B0B0E, #CAD3F5, #A0A3F6)
        private static readonly Color BgPrimary = Color.FromRgb(11, 11, 14);         // #0B0B0E
        private static readonly Color BgSurface = Color.FromRgb(18, 19, 25);         // #121319
        private static readonly Color BgRaised = Color.FromRgb(24, 26, 35);          // #181A23
        private static readonly Color BgRaisedHover = Color.FromRgb(32, 35, 47);     // #20232F
        private static readonly Color BorderHairline = Color.FromArgb(22, 202, 211, 245);
        private static readonly Color BorderFocus = Color.FromArgb(150, 160, 163, 246);
        private static readonly Color TextPrimary = Color.FromRgb(202, 211, 245);    // #CAD3F5
        private static readonly Color TextSecondary = Color.FromRgb(155, 164, 196);  // #9BA4C4
        private static readonly Color TextMuted = Color.FromRgb(110, 118, 148);     // #6E7694
        private static readonly Color AccentColor = Color.FromRgb(160, 163, 246);    // #A0A3F6
        private static readonly Color AccentHover = Color.FromRgb(178, 181, 250);    // #B2B5FA
        private static readonly Color SemanticOk = Color.FromRgb(76, 195, 138);      // #4CC38A
        private static readonly Color SemanticErr = Color.FromRgb(229, 72, 77);      // #E5484D

        // Window frame radius (14) vs unified inner UI curvature (8)
        private static readonly CornerRadius WindowRadius = new CornerRadius(14);
        private static readonly CornerRadius UniformRadius = new CornerRadius(8);

        private Border outerBorder;
        private ScaleTransform windowScale;
        private TranslateTransform windowTranslate;
        private Grid clipHost;

        // Top bar & language switcher
        private Button btnLangTrigger;
        private TextBlock lblLangCurrent;
        private Popup langPopup;
        private StackPanel langMenuStack;

        // Step indicator
        private Border step1Dot;
        private TextBlock lblStep1;
        private Border stepConnectorFill;
        private Border step2Dot;
        private TextBlock lblStep2;

        // Views
        private Grid stageHost;
        private Grid step1View;
        private Grid step2View;

        // Step 1 controls
        private Border pathCard;
        private TextBlock lblPathTitle;
        private Border statusBadge;
        private Ellipse statusBadgeDot;
        private TextBlock lblPathStatus;
        private Border pathInputBorder;
        private TextBox txtPath;
        private Button btnBrowse;
        private TextBlock lblBrowseText;

        private Border notesCard;
        private TextBlock lblNotesTitle;
        private StackPanel notesBulletsPanel;

        private Grid actionGrid;
        private Button btnInstall;
        private TextBlock lblInstallBtn;
        private Button btnRestore;
        private TextBlock lblRestoreBtn;

        // Step 2 controls
        private TextBlock lblRunTitle;
        private TextBlock lblRunPercent;
        private TextBlock lblRunStatus;
        private Border prgTrack;
        private Border prgFill;
        private TextBlock lblLogHeader;
        private ScrollViewer logScrollViewer;
        private StackPanel logItemsStack;
        private Button btnBack;
        private TextBlock lblBackBtn;

        private BackgroundWorker worker;
        private double currentProgress = 0.0;
        private bool isClosingAnimated = false;
        private bool isMinimizingAnimated = false;
        private bool isBusy = false;
        private string currentStep = "Step1";

        private string detectedAppDir = "";
        private string appExePath = "";
        private string asarPath = "";
        private string backupAsarPath = "";
        private string uiLang = InstallerI18n.DetectLanguage();
        private Dictionary<string, List<string>> embeddedChangelogNotes;

        private string T(string key)
        {
            return InstallerI18n.Get(uiLang, key);
        }

        public MainWindow()
        {
            this.Title = "Antigravity Enhancer";
            this.Width = 640;
            this.Height = 516;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.ResizeMode = ResizeMode.NoResize;
            this.FontFamily = new FontFamily("Segoe UI, Malgun Gothic, Yu Gothic UI, Microsoft YaHei UI");
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Display);
            UseLayoutRounding = true;
            SnapsToDevicePixels = true;

            LoadWindowIcon();
            embeddedChangelogNotes = LoadEmbeddedLatestChangelog();

            BuildUI();
            ApplyLocalizedTexts(false);
            DetectAntigravity();

            this.Loaded += (s, e) => { RunWindowEntrance(); };
            this.StateChanged += MainWindow_StateChanged;
        }

        private BitmapSource LoadWindowIconBitmap()
        {
            try
            {
                using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("app_icon.ico.gz"))
                {
                    if (resStream == null) return null;
                    using (GZipStream gz = new GZipStream(resStream, CompressionMode.Decompress))
                    using (MemoryStream ms = new MemoryStream())
                    {
                        byte[] buf = new byte[16384];
                        int n;
                        while ((n = gz.Read(buf, 0, buf.Length)) > 0) ms.Write(buf, 0, n);
                        ms.Position = 0;
                        BitmapFrame frame = BitmapFrame.Create(ms, BitmapCreateOptions.None, BitmapCacheOption.OnLoad);
                        this.Icon = frame;
                        return frame;
                    }
                }
            }
            catch { return null; }
        }

        private void LoadWindowIcon()
        {
            LoadWindowIconBitmap();
        }

        private Dictionary<string, List<string>> LoadEmbeddedLatestChangelog()
        {
            var result = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
            try
            {
                using (Stream res = Assembly.GetExecutingAssembly().GetManifestResourceStream("enhancer_CHANGELOG.md.gz"))
                {
                    if (res == null) return result;
                    using (GZipStream gz = new GZipStream(res, CompressionMode.Decompress))
                    using (StreamReader sr = new StreamReader(gz, Encoding.UTF8))
                    {
                        string md = sr.ReadToEnd().Replace("\r\n", "\n");
                        Match secMatch = Regex.Match(md, @"^##\s+\[[^\]]+\][^\n]*\n([\s\S]*?)(?:\n---\n|\n##\s+\[|$)", RegexOptions.Multiline);
                        if (!secMatch.Success) return result;
                        string rawSec = secMatch.Groups[1].Value;

                        var map = new Dictionary<string, string>();
                        map["한국어"] = "ko";
                        map["日本語"] = "ja";
                        map["简体中文"] = "zh-CN";
                        map["繁體中文"] = "zh-TW";
                        map["Español"] = "es";
                        map["Français"] = "fr";
                        map["Deutsch"] = "de";
                        map["Русский"] = "ru";
                        map["Português (Brasil)"] = "pt-BR";
                        map["Português"] = "pt-BR";
                        map["Tiếng Việt"] = "vi";
                        map["Italiano"] = "it";
                        map["Bahasa Indonesia"] = "id";
                        map["Türkçe"] = "tr";
                        map["Polski"] = "pl";

                        foreach (Match dm in Regex.Matches(rawSec, @"<details>\s*<summary>([^<]+)</summary>([\s\S]*?)</details>", RegexOptions.IgnoreCase))
                        {
                            string label = dm.Groups[1].Value.Trim();
                            string langCode;
                            if (map.TryGetValue(label, out langCode))
                            {
                                List<string> items = ExtractBulletLines(dm.Groups[2].Value);
                                if (items.Count > 0) result[langCode] = items;
                            }
                        }

                        string enRaw = Regex.Replace(rawSec, @"<details>[\s\S]*?</details>", "", RegexOptions.IgnoreCase);
                        List<string> enItems = ExtractBulletLines(enRaw);
                        if (enItems.Count > 0) result["en"] = enItems;
                    }
                }
            }
            catch { }
            return result;
        }

        private List<string> ExtractBulletLines(string block)
        {
            var list = new List<string>();
            if (string.IsNullOrEmpty(block)) return list;
            foreach (string rawLine in block.Split('\n'))
            {
                string line = rawLine.Trim();
                if (line.StartsWith("- ") || line.StartsWith("* "))
                {
                    string cleaned = line.Substring(2).Trim();
                    cleaned = Regex.Replace(cleaned, @"\*\*([^*]+)\*\*", "$1");
                    cleaned = Regex.Replace(cleaned, @"`([^`]+)`", "$1");
                    if (cleaned.EndsWith(".")) cleaned = cleaned.Substring(0, cleaned.Length - 1);
                    if (!string.IsNullOrEmpty(cleaned)) list.Add(cleaned);
                    if (list.Count >= 3) break;
                }
            }
            return list;
        }

        private void BuildUI()
        {
            Grid rootGrid = new Grid { Margin = new Thickness(16) };

            windowScale = new ScaleTransform(1.0, 1.0);
            windowTranslate = new TranslateTransform(0.0, 0.0);
            TransformGroup winTg = new TransformGroup();
            winTg.Children.Add(windowScale);
            winTg.Children.Add(windowTranslate);

            outerBorder = new Border
            {
                CornerRadius = WindowRadius,
                Background = new SolidColorBrush(BgPrimary),
                BorderBrush = new SolidColorBrush(BorderHairline),
                BorderThickness = new Thickness(1),
                RenderTransformOrigin = new Point(0.5, 0.5),
                RenderTransform = winTg,
                Opacity = 0.0,
                Effect = new DropShadowEffect
                {
                    BlurRadius = 24,
                    ShadowDepth = 4,
                    Direction = 270,
                    Opacity = 0.52,
                    Color = Colors.Black
                }
            };

            // Strict interior mask so title-bar hover/press effects never bleed past window corners
            clipHost = new Grid();
            clipHost.SizeChanged += (s, e) =>
            {
                double r = Math.Max(0.0, WindowRadius.TopLeft - 1.0);
                clipHost.Clip = new RectangleGeometry(new Rect(0, 0, e.NewSize.Width, e.NewSize.Height), r, r);
            };

            clipHost.RowDefinitions.Add(new RowDefinition { Height = new GridLength(44) }); // 0: Title Bar
            clipHost.RowDefinitions.Add(new RowDefinition { Height = new GridLength(40) }); // 1: Step Strip
            clipHost.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // 2: Stage Host

            // ----------------------------------------------------------------
            // Row 0: Quiet Title Bar (masked inside clipHost)
            // ----------------------------------------------------------------
            Border titleBar = new Border
            {
                Background = new SolidColorBrush(BgSurface),
                BorderBrush = new SolidColorBrush(BorderHairline),
                BorderThickness = new Thickness(0, 0, 0, 1)
            };
            titleBar.MouseLeftButtonDown += (s, e) =>
            {
                if (e.LeftButton == MouseButtonState.Pressed)
                {
                    try { this.DragMove(); } catch { }
                }
            };

            Grid titleGrid = new Grid();
            titleGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            titleGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            StackPanel brandStack = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(16, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            BitmapSource iconBmp = LoadWindowIconBitmap();
            if (iconBmp != null)
            {
                Image imgIcon = new Image
                {
                    Source = iconBmp,
                    Width = 16,
                    Height = 16,
                    Margin = new Thickness(0, 0, 8, 0),
                    VerticalAlignment = VerticalAlignment.Center
                };
                RenderOptions.SetBitmapScalingMode(imgIcon, BitmapScalingMode.HighQuality);
                brandStack.Children.Add(imgIcon);
            }

            TextBlock tbBrand1 = new TextBlock
            {
                Text = "Antigravity",
                Foreground = new SolidColorBrush(TextPrimary),
                FontWeight = FontWeights.Medium,
                FontSize = 13,
                VerticalAlignment = VerticalAlignment.Center
            };
            TextBlock tbBrand2 = new TextBlock
            {
                Text = "Enhancer",
                Foreground = new SolidColorBrush(AccentColor),
                FontWeight = FontWeights.SemiBold,
                FontSize = 13,
                Margin = new Thickness(4, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            TextBlock tbVerMeta = new TextBlock
            {
                Text = "v__ENHANCER_VERSION__",
                Foreground = new SolidColorBrush(TextMuted),
                FontFamily = new FontFamily("Consolas"),
                FontSize = 11,
                Margin = new Thickness(8, 1, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            brandStack.Children.Add(tbBrand1);
            brandStack.Children.Add(tbBrand2);
            brandStack.Children.Add(tbVerMeta);

            StackPanel titleRight = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 6, 0)
            };

            BuildLanguageSelector();
            titleRight.Children.Add(btnLangTrigger);

            Button btnMin = CreateMaskedCaptionButton(false);
            btnMin.Margin = new Thickness(4, 0, 2, 0);
            btnMin.Click += (s, e) => { MinimizeWithAnimation(); };

            Button btnClose = CreateMaskedCaptionButton(true);
            btnClose.Click += (s, e) => { CloseWithAnimation(null); };

            titleRight.Children.Add(btnMin);
            titleRight.Children.Add(btnClose);

            Grid.SetColumn(brandStack, 0);
            Grid.SetColumn(titleRight, 1);
            titleGrid.Children.Add(brandStack);
            titleGrid.Children.Add(titleRight);
            titleBar.Child = titleGrid;
            Grid.SetRow(titleBar, 0);
            clipHost.Children.Add(titleBar);

            // ----------------------------------------------------------------
            // Row 1: Two-Step Process Indicator
            // ----------------------------------------------------------------
            Border stepStrip = new Border
            {
                Padding = new Thickness(20, 12, 20, 0)
            };
            Grid stepGrid = new Grid { VerticalAlignment = VerticalAlignment.Center };
            stepGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            stepGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(36) });
            stepGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            StackPanel s1Stack = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
            step1Dot = new Border
            {
                Width = 20,
                Height = 20,
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(AccentColor),
                Margin = new Thickness(0, 0, 8, 0)
            };
            step1Dot.Child = new TextBlock
            {
                Text = "1",
                FontFamily = new FontFamily("Consolas"),
                FontSize = 11,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(BgPrimary),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            lblStep1 = new TextBlock
            {
                FontSize = 12,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextPrimary),
                VerticalAlignment = VerticalAlignment.Center
            };
            s1Stack.Children.Add(step1Dot);
            s1Stack.Children.Add(lblStep1);

            Border stepConnTrack = new Border
            {
                Height = 2,
                Background = new SolidColorBrush(BgRaised),
                Margin = new Thickness(10, 0, 10, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            stepConnectorFill = new Border
            {
                Height = 2,
                Background = new SolidColorBrush(AccentColor),
                HorizontalAlignment = HorizontalAlignment.Left,
                Width = 0
            };
            stepConnTrack.Child = stepConnectorFill;

            StackPanel s2Stack = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
            step2Dot = new Border
            {
                Width = 20,
                Height = 20,
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(BgRaised),
                BorderBrush = new SolidColorBrush(BorderHairline),
                BorderThickness = new Thickness(1),
                Margin = new Thickness(0, 0, 8, 0)
            };
            TextBlock tbS2Num = new TextBlock
            {
                Text = "2",
                FontFamily = new FontFamily("Consolas"),
                FontSize = 11,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextMuted),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            step2Dot.Child = tbS2Num;
            lblStep2 = new TextBlock
            {
                FontSize = 12,
                FontWeight = FontWeights.Normal,
                Foreground = new SolidColorBrush(TextMuted),
                VerticalAlignment = VerticalAlignment.Center
            };
            s2Stack.Children.Add(step2Dot);
            s2Stack.Children.Add(lblStep2);

            Grid.SetColumn(s1Stack, 0);
            Grid.SetColumn(stepConnTrack, 1);
            Grid.SetColumn(s2Stack, 2);
            stepGrid.Children.Add(s1Stack);
            stepGrid.Children.Add(stepConnTrack);
            stepGrid.Children.Add(s2Stack);
            stepStrip.Child = stepGrid;
            Grid.SetRow(stepStrip, 1);
            clipHost.Children.Add(stepStrip);

            // ----------------------------------------------------------------
            // Row 2: Stage Host (Step 1 Main View & Step 2 Activity Log View)
            // ----------------------------------------------------------------
            stageHost = new Grid { Margin = new Thickness(20, 12, 20, 20) };
            BuildStep1View();
            BuildStep2View();
            stageHost.Children.Add(step1View);
            stageHost.Children.Add(step2View);
            Grid.SetRow(stageHost, 2);
            clipHost.Children.Add(stageHost);

            outerBorder.Child = clipHost;
            rootGrid.Children.Add(outerBorder);
            this.Content = rootGrid;

            worker = new BackgroundWorker { WorkerReportsProgress = true };
            worker.DoWork += Worker_DoWork;
            worker.ProgressChanged += Worker_ProgressChanged;
            worker.RunWorkerCompleted += Worker_RunWorkerCompleted;
        }

        private void BuildLanguageSelector()
        {
            lblLangCurrent = new TextBlock
            {
                Text = InstallerI18n.GetLanguageNativeLabel(uiLang),
                FontSize = 11.5,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextSecondary),
                VerticalAlignment = VerticalAlignment.Center
            };

            System.Windows.Shapes.Path chevron = new System.Windows.Shapes.Path
            {
                Data = Geometry.Parse("M 0 0 L 3.5 3.5 L 7 0"),
                Stroke = new SolidColorBrush(TextMuted),
                StrokeThickness = 1.3,
                Margin = new Thickness(6, 1, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            StackPanel content = new StackPanel { Orientation = Orientation.Horizontal };
            content.Children.Add(lblLangCurrent);
            content.Children.Add(chevron);

            btnLangTrigger = CreateSurfaceButton(content, BgRaised, BgRaisedHover, 28, new Thickness(10, 0, 10, 0), true);

            langMenuStack = new StackPanel();
            ScrollViewer langScroll = new ScrollViewer
            {
                MaxHeight = 252,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Content = langMenuStack
            };
            ApplyDarkScrollBarStyle(langScroll);

            Border menuBorder = new Border
            {
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(BgSurface),
                BorderBrush = new SolidColorBrush(BorderHairline),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(4),
                Margin = new Thickness(8),
                MinWidth = 156,
                RenderTransform = new TranslateTransform(0, -6),
                Effect = new DropShadowEffect
                {
                    BlurRadius = 16,
                    ShadowDepth = 3,
                    Direction = 270,
                    Opacity = 0.45,
                    Color = Colors.Black
                }
            };
            menuBorder.Child = langScroll;

            langPopup = new Popup
            {
                PlacementTarget = btnLangTrigger,
                Placement = PlacementMode.Bottom,
                HorizontalOffset = -12,
                VerticalOffset = 2,
                AllowsTransparency = true,
                StaysOpen = false,
                Child = menuBorder
            };

            PopulateLanguageMenu();

            btnLangTrigger.Click += (s, e) =>
            {
                if (isBusy) return;
                if (langPopup.IsOpen)
                {
                    langPopup.IsOpen = false;
                }
                else
                {
                    PopulateLanguageMenu();
                    langPopup.IsOpen = true;
                    menuBorder.Opacity = 0;
                    TranslateTransform tt = (TranslateTransform)menuBorder.RenderTransform;
                    tt.Y = -6;
                    menuBorder.BeginAnimation(UIElement.OpacityProperty,
                        new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(140)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
                    tt.BeginAnimation(TranslateTransform.YProperty,
                        new DoubleAnimation(-6, 0, TimeSpan.FromMilliseconds(160)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
                }
            };
        }

        private void PopulateLanguageMenu()
        {
            langMenuStack.Children.Clear();
            foreach (string code in InstallerI18n.SupportedLanguages)
            {
                string captured = code;
                bool active = string.Equals(code, uiLang, StringComparison.OrdinalIgnoreCase);

                Grid rowGrid = new Grid { Width = 138 };
                rowGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                rowGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                TextBlock tb = new TextBlock
                {
                    Text = InstallerI18n.GetLanguageNativeLabel(code),
                    FontSize = 12,
                    FontWeight = active ? FontWeights.SemiBold : FontWeights.Normal,
                    Foreground = new SolidColorBrush(active ? TextPrimary : TextSecondary),
                    VerticalAlignment = VerticalAlignment.Center
                };
                rowGrid.Children.Add(tb);

                if (active)
                {
                    Ellipse dot = new Ellipse
                    {
                        Width = 6,
                        Height = 6,
                        Fill = new SolidColorBrush(AccentColor),
                        VerticalAlignment = VerticalAlignment.Center
                    };
                    Grid.SetColumn(dot, 1);
                    rowGrid.Children.Add(dot);
                }

                Button itemBtn = CreateSurfaceButton(
                    rowGrid,
                    active ? BgRaised : BgSurface,
                    BgRaisedHover,
                    28,
                    new Thickness(8, 0, 8, 0),
                    false);
                itemBtn.Click += (s, e) =>
                {
                    langPopup.IsOpen = false;
                    if (!string.Equals(uiLang, captured, StringComparison.OrdinalIgnoreCase))
                    {
                        uiLang = captured;
                        ApplyLocalizedTexts(true);
                    }
                };
                langMenuStack.Children.Add(itemBtn);
            }
        }

        private void BuildStep1View()
        {
            step1View = new Grid
            {
                RenderTransform = new TranslateTransform(0, 0)
            };
            step1View.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 0: Path Card
            step1View.RowDefinitions.Add(new RowDefinition { Height = new GridLength(12) });
            step1View.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // 2: Changelog Card
            step1View.RowDefinitions.Add(new RowDefinition { Height = new GridLength(16) });
            step1View.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 4: Two Action Buttons

            // 1. Path Card
            pathCard = CreateCardContainer(new Thickness(16, 14, 16, 14));
            StackPanel pathStack = new StackPanel();

            Grid pathHeader = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            pathHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            pathHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            lblPathTitle = new TextBlock
            {
                FontSize = 12,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextSecondary),
                VerticalAlignment = VerticalAlignment.Center
            };

            statusBadge = new Border
            {
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(BgRaised),
                BorderBrush = new SolidColorBrush(BorderHairline),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8, 3, 8, 3),
                VerticalAlignment = VerticalAlignment.Center
            };
            StackPanel badgeInner = new StackPanel { Orientation = Orientation.Horizontal };
            statusBadgeDot = new Ellipse
            {
                Width = 6,
                Height = 6,
                Fill = new SolidColorBrush(SemanticOk),
                Margin = new Thickness(0, 0, 6, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            lblPathStatus = new TextBlock
            {
                FontSize = 11,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextPrimary),
                VerticalAlignment = VerticalAlignment.Center
            };
            badgeInner.Children.Add(statusBadgeDot);
            badgeInner.Children.Add(lblPathStatus);
            statusBadge.Child = badgeInner;

            Grid.SetColumn(lblPathTitle, 0);
            Grid.SetColumn(statusBadge, 1);
            pathHeader.Children.Add(lblPathTitle);
            pathHeader.Children.Add(statusBadge);

            Grid pathRow = new Grid();
            pathRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            pathRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(8) });
            pathRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            SolidColorBrush inputBorderBrush = new SolidColorBrush(BorderHairline);
            pathInputBorder = new Border
            {
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(BgPrimary),
                BorderBrush = inputBorderBrush,
                BorderThickness = new Thickness(1),
                Height = 36,
                Padding = new Thickness(10, 0, 10, 0)
            };

            txtPath = new TextBox
            {
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(TextPrimary),
                CaretBrush = new SolidColorBrush(AccentColor),
                BorderThickness = new Thickness(0),
                FontFamily = new FontFamily("Consolas"),
                FontSize = 12,
                VerticalContentAlignment = VerticalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            txtPath.GotKeyboardFocus += (s, e) =>
            {
                AnimateBrushColor(inputBorderBrush, BorderFocus, 150);
            };
            txtPath.LostKeyboardFocus += (s, e) =>
            {
                AnimateBrushColor(inputBorderBrush, BorderHairline, 150);
            };
            txtPath.TextChanged += (s, e) => { OnPathChanged(); };
            pathInputBorder.Child = txtPath;

            lblBrowseText = new TextBlock
            {
                FontSize = 12,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextPrimary),
                VerticalAlignment = VerticalAlignment.Center
            };
            btnBrowse = CreateSurfaceButton(lblBrowseText, BgRaised, BgRaisedHover, 36, new Thickness(14, 0, 14, 0), true);
            btnBrowse.Click += (s, e) => { BrowseFolder(); };

            Grid.SetColumn(pathInputBorder, 0);
            Grid.SetColumn(btnBrowse, 2);
            pathRow.Children.Add(pathInputBorder);
            pathRow.Children.Add(btnBrowse);

            pathStack.Children.Add(pathHeader);
            pathStack.Children.Add(pathRow);
            pathCard.Child = pathStack;
            Grid.SetRow(pathCard, 0);
            step1View.Children.Add(pathCard);

            // 2. Concise Localized Changelog Card
            notesCard = CreateCardContainer(new Thickness(16, 14, 16, 14));
            Grid notesGrid = new Grid();
            notesGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            notesGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(10) });
            notesGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            Grid notesHeader = new Grid();
            notesHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            notesHeader.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            lblNotesTitle = new TextBlock
            {
                FontSize = 12,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextSecondary),
                VerticalAlignment = VerticalAlignment.Center
            };
            TextBlock tbNotesVer = new TextBlock
            {
                Text = "v__ENHANCER_VERSION__",
                FontFamily = new FontFamily("Consolas"),
                FontSize = 11,
                Foreground = new SolidColorBrush(AccentColor),
                VerticalAlignment = VerticalAlignment.Center
            };
            Grid.SetColumn(lblNotesTitle, 0);
            Grid.SetColumn(tbNotesVer, 1);
            notesHeader.Children.Add(lblNotesTitle);
            notesHeader.Children.Add(tbNotesVer);

            notesBulletsPanel = new StackPanel { VerticalAlignment = VerticalAlignment.Top };

            ScrollViewer notesScroll = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Content = notesBulletsPanel
            };
            ApplyDarkScrollBarStyle(notesScroll);

            Grid.SetRow(notesHeader, 0);
            Grid.SetRow(notesScroll, 2);
            notesGrid.Children.Add(notesHeader);
            notesGrid.Children.Add(notesScroll);
            notesCard.Child = notesGrid;
            Grid.SetRow(notesCard, 2);
            step1View.Children.Add(notesCard);

            // 3. Action Buttons (Strictly 2 buttons: Install Patch & Restore Original)
            actionGrid = new Grid();
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.35, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(10) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.0, GridUnitType.Star) });

            lblInstallBtn = new TextBlock
            {
                FontSize = 13.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(BgPrimary),
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center
            };
            btnInstall = CreatePrimaryButton(lblInstallBtn, 44);
            btnInstall.Click += (s, e) => { StartStep2Action("Install"); };

            lblRestoreBtn = new TextBlock
            {
                FontSize = 13,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextPrimary),
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center
            };
            btnRestore = CreateSurfaceButton(lblRestoreBtn, BgSurface, BgRaisedHover, 44, new Thickness(16, 0, 16, 0), true);
            btnRestore.Click += (s, e) => { StartStep2Action("Restore"); };

            Grid.SetColumn(btnInstall, 0);
            Grid.SetColumn(btnRestore, 2);
            actionGrid.Children.Add(btnInstall);
            actionGrid.Children.Add(btnRestore);
            Grid.SetRow(actionGrid, 4);
            step1View.Children.Add(actionGrid);
        }

        private void BuildStep2View()
        {
            step2View = new Grid
            {
                Visibility = Visibility.Collapsed,
                Opacity = 0.0,
                RenderTransform = new TranslateTransform(16, 0)
            };
            step2View.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 0: Progress Card
            step2View.RowDefinitions.Add(new RowDefinition { Height = new GridLength(12) });
            step2View.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // 2: Activity Log Card
            step2View.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 3: Error Back Button (collapsed unless error)

            Border progCard = CreateCardContainer(new Thickness(16, 14, 16, 14));
            StackPanel progStack = new StackPanel();

            Grid progTop = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            progTop.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            progTop.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            lblRunTitle = new TextBlock
            {
                FontSize = 13.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(TextPrimary),
                VerticalAlignment = VerticalAlignment.Center
            };
            lblRunPercent = new TextBlock
            {
                Text = "0%",
                FontFamily = new FontFamily("Consolas"),
                FontSize = 12.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(AccentColor),
                VerticalAlignment = VerticalAlignment.Center
            };
            Grid.SetColumn(lblRunTitle, 0);
            Grid.SetColumn(lblRunPercent, 1);
            progTop.Children.Add(lblRunTitle);
            progTop.Children.Add(lblRunPercent);

            prgTrack = new Border
            {
                Height = 8,
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(BgPrimary),
                ClipToBounds = true
            };
            prgFill = new Border
            {
                Height = 8,
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(AccentColor),
                HorizontalAlignment = HorizontalAlignment.Left,
                Width = 0
            };
            prgTrack.Child = prgFill;
            prgTrack.SizeChanged += (s, e) => { UpdateProgressFillWidth(false); };

            lblRunStatus = new TextBlock
            {
                FontSize = 12,
                Foreground = new SolidColorBrush(TextSecondary),
                Margin = new Thickness(0, 10, 0, 0),
                TextTrimming = TextTrimming.CharacterEllipsis
            };

            progStack.Children.Add(progTop);
            progStack.Children.Add(prgTrack);
            progStack.Children.Add(lblRunStatus);
            progCard.Child = progStack;
            Grid.SetRow(progCard, 0);
            step2View.Children.Add(progCard);

            // Activity Log Card
            Border logCard = CreateCardContainer(new Thickness(0));
            Grid logGrid = new Grid();
            logGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(32) });
            logGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            Border logHeader = new Border
            {
                BorderBrush = new SolidColorBrush(BorderHairline),
                BorderThickness = new Thickness(0, 0, 0, 1),
                Padding = new Thickness(16, 0, 16, 0)
            };
            lblLogHeader = new TextBlock
            {
                FontSize = 11.5,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextMuted),
                VerticalAlignment = VerticalAlignment.Center
            };
            logHeader.Child = lblLogHeader;

            logItemsStack = new StackPanel();
            logScrollViewer = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Padding = new Thickness(16, 10, 16, 10),
                Content = logItemsStack
            };
            ApplyDarkScrollBarStyle(logScrollViewer);

            Grid.SetRow(logHeader, 0);
            Grid.SetRow(logScrollViewer, 1);
            logGrid.Children.Add(logHeader);
            logGrid.Children.Add(logScrollViewer);
            logCard.Child = logGrid;
            Grid.SetRow(logCard, 2);
            step2View.Children.Add(logCard);

            // Error recovery Back button (hidden during normal automatic restart flow)
            lblBackBtn = new TextBlock
            {
                FontSize = 12.5,
                FontWeight = FontWeights.Medium,
                Foreground = new SolidColorBrush(TextPrimary),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            btnBack = CreateSurfaceButton(lblBackBtn, BgRaised, BgRaisedHover, 38, new Thickness(20, 0, 20, 0), true);
            btnBack.Margin = new Thickness(0, 12, 0, 0);
            btnBack.HorizontalAlignment = HorizontalAlignment.Right;
            btnBack.Visibility = Visibility.Collapsed;
            btnBack.Click += (s, e) => { TransitionToStep1(); };
            Grid.SetRow(btnBack, 3);
            step2View.Children.Add(btnBack);
        }

        private Border CreateCardContainer(Thickness padding)
        {
            return new Border
            {
                CornerRadius = UniformRadius,
                Background = new SolidColorBrush(BgSurface),
                BorderBrush = new SolidColorBrush(BorderHairline),
                BorderThickness = new Thickness(1),
                Padding = padding,
                RenderTransform = new TranslateTransform(0, 0)
            };
        }

        private Button CreateMaskedCaptionButton(bool isClose)
        {
            Button btn = new Button
            {
                Width = 30,
                Height = 28,
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                FocusVisualStyle = null
            };

            SolidColorBrush bgBrush = new SolidColorBrush(Color.FromArgb(0, 32, 35, 47));
            SolidColorBrush strokeBrush = new SolidColorBrush(TextMuted);
            ScaleTransform pressScale = new ScaleTransform(1.0, 1.0);

            Border inner = new Border
            {
                CornerRadius = UniformRadius,
                Background = bgBrush,
                Width = 30,
                Height = 28,
                RenderTransformOrigin = new Point(0.5, 0.5),
                RenderTransform = pressScale
            };

            System.Windows.Shapes.Path icon = new System.Windows.Shapes.Path
            {
                Stroke = strokeBrush,
                StrokeThickness = 1.4,
                StrokeStartLineCap = PenLineCap.Round,
                StrokeEndLineCap = PenLineCap.Round,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                Data = isClose
                    ? Geometry.Parse("M 0 0 L 8 8 M 8 0 L 0 8")
                    : Geometry.Parse("M 0 4 L 8.5 4")
            };
            inner.Child = icon;
            btn.Content = inner;

            ControlTemplate tpl = new ControlTemplate(typeof(Button));
            FrameworkElementFactory cp = new FrameworkElementFactory(typeof(ContentPresenter));
            tpl.VisualTree = cp;
            Style st = new Style(typeof(Button));
            st.Setters.Add(new Setter(Button.TemplateProperty, tpl));
            btn.Style = st;

            Color hoverColor = isClose ? SemanticErr : BgRaisedHover;
            Color hoverIcon = isClose ? Colors.White : TextPrimary;

            btn.MouseEnter += (s, e) =>
            {
                AnimateBrushColor(bgBrush, hoverColor, 130);
                AnimateBrushColor(strokeBrush, hoverIcon, 130);
            };
            btn.MouseLeave += (s, e) =>
            {
                AnimateBrushColor(bgBrush, Color.FromArgb(0, 32, 35, 47), 150);
                AnimateBrushColor(strokeBrush, TextMuted, 150);
                AnimateScale(pressScale, 1.0, 110);
            };
            btn.PreviewMouseLeftButtonDown += (s, e) => { AnimateScale(pressScale, 0.92, 90); };
            btn.PreviewMouseLeftButtonUp += (s, e) => { AnimateScale(pressScale, 1.0, 120); };

            return btn;
        }

        private Button CreatePrimaryButton(UIElement content, double height)
        {
            SolidColorBrush bgBrush = new SolidColorBrush(AccentColor);
            ScaleTransform pressScale = new ScaleTransform(1.0, 1.0);

            Border bdr = new Border
            {
                CornerRadius = UniformRadius,
                Background = bgBrush,
                Height = height,
                Padding = new Thickness(18, 0, 18, 0),
                RenderTransformOrigin = new Point(0.5, 0.5),
                RenderTransform = pressScale,
                Child = content
            };

            Button btn = new Button
            {
                Content = bdr,
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                FocusVisualStyle = null
            };

            ControlTemplate tpl = new ControlTemplate(typeof(Button));
            tpl.VisualTree = new FrameworkElementFactory(typeof(ContentPresenter));
            Style st = new Style(typeof(Button));
            st.Setters.Add(new Setter(Button.TemplateProperty, tpl));
            btn.Style = st;

            btn.MouseEnter += (s, e) =>
            {
                if (btn.IsEnabled) AnimateBrushColor(bgBrush, AccentHover, 140);
            };
            btn.MouseLeave += (s, e) =>
            {
                if (btn.IsEnabled) AnimateBrushColor(bgBrush, AccentColor, 160);
                AnimateScale(pressScale, 1.0, 110);
            };
            btn.PreviewMouseLeftButtonDown += (s, e) =>
            {
                if (btn.IsEnabled) AnimateScale(pressScale, 0.978, 95);
            };
            btn.PreviewMouseLeftButtonUp += (s, e) =>
            {
                AnimateScale(pressScale, 1.0, 125);
            };
            btn.IsEnabledChanged += (s, e) =>
            {
                bdr.Opacity = btn.IsEnabled ? 1.0 : 0.42;
                btn.Cursor = btn.IsEnabled ? Cursors.Hand : Cursors.Arrow;
            };

            return btn;
        }

        private Button CreateSurfaceButton(UIElement content, Color normalBg, Color hoverBg, double height, Thickness padding, bool showBorder)
        {
            SolidColorBrush bgBrush = new SolidColorBrush(normalBg);
            SolidColorBrush borderBrush = new SolidColorBrush(showBorder ? BorderHairline : Color.FromArgb(0, 0, 0, 0));
            ScaleTransform pressScale = new ScaleTransform(1.0, 1.0);

            Border bdr = new Border
            {
                CornerRadius = UniformRadius,
                Background = bgBrush,
                BorderBrush = borderBrush,
                BorderThickness = new Thickness(showBorder ? 1 : 0),
                Height = height,
                Padding = padding,
                RenderTransformOrigin = new Point(0.5, 0.5),
                RenderTransform = pressScale,
                Child = content
            };

            Button btn = new Button
            {
                Content = bdr,
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                FocusVisualStyle = null
            };

            ControlTemplate tpl = new ControlTemplate(typeof(Button));
            tpl.VisualTree = new FrameworkElementFactory(typeof(ContentPresenter));
            Style st = new Style(typeof(Button));
            st.Setters.Add(new Setter(Button.TemplateProperty, tpl));
            btn.Style = st;

            btn.MouseEnter += (s, e) =>
            {
                if (btn.IsEnabled) AnimateBrushColor(bgBrush, hoverBg, 140);
            };
            btn.MouseLeave += (s, e) =>
            {
                if (btn.IsEnabled) AnimateBrushColor(bgBrush, normalBg, 160);
                AnimateScale(pressScale, 1.0, 110);
            };
            btn.PreviewMouseLeftButtonDown += (s, e) =>
            {
                if (btn.IsEnabled) AnimateScale(pressScale, 0.978, 95);
            };
            btn.PreviewMouseLeftButtonUp += (s, e) =>
            {
                AnimateScale(pressScale, 1.0, 125);
            };
            btn.IsEnabledChanged += (s, e) =>
            {
                bdr.Opacity = btn.IsEnabled ? 1.0 : 0.42;
                btn.Cursor = btn.IsEnabled ? Cursors.Hand : Cursors.Arrow;
            };

            return btn;
        }

        private void ApplyLocalizedTexts(bool animate)
        {
            lblLangCurrent.Text = InstallerI18n.GetLanguageNativeLabel(uiLang);
            lblStep1.Text = T("Step1Label");
            lblStep2.Text = T("Step2Label");
            lblPathTitle.Text = T("PathLabel");
            lblBrowseText.Text = T("BtnBrowse");
            lblNotesTitle.Text = T("WhatsNewTitle");
            lblInstallBtn.Text = T("BtnInstall");
            lblRestoreBtn.Text = T("BtnRestore");
            lblLogHeader.Text = T("LogTitle");
            lblBackBtn.Text = T("BtnBack");

            RenderLocalizedChangelogBullets();
            OnPathChanged();

            if (animate && currentStep == "Step1")
            {
                step1View.Opacity = 0.35;
                TranslateTransform tt = (TranslateTransform)step1View.RenderTransform;
                tt.Y = 4;
                step1View.BeginAnimation(UIElement.OpacityProperty,
                    new DoubleAnimation(0.35, 1.0, TimeSpan.FromMilliseconds(180)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
                tt.BeginAnimation(TranslateTransform.YProperty,
                    new DoubleAnimation(4, 0, TimeSpan.FromMilliseconds(200)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            }
        }

        private void RenderLocalizedChangelogBullets()
        {
            notesBulletsPanel.Children.Clear();
            List<string> bullets = null;
            if (embeddedChangelogNotes != null)
            {
                if (!embeddedChangelogNotes.TryGetValue(uiLang, out bullets))
                {
                    embeddedChangelogNotes.TryGetValue("en", out bullets);
                }
            }
            if (bullets == null || bullets.Count == 0)
            {
                bullets = new List<string>(T("DefaultNotes").Split('\n'));
            }

            for (int i = 0; i < bullets.Count; i++)
            {
                string item = bullets[i].Trim();
                if (string.IsNullOrEmpty(item)) continue;

                Grid row = new Grid { Margin = new Thickness(0, i == 0 ? 2 : 8, 0, 0) };
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14) });
                row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

                Ellipse dot = new Ellipse
                {
                    Width = 5,
                    Height = 5,
                    Fill = new SolidColorBrush(AccentColor),
                    HorizontalAlignment = HorizontalAlignment.Left,
                    VerticalAlignment = VerticalAlignment.Top,
                    Margin = new Thickness(1, 6, 0, 0)
                };

                TextBlock tb = new TextBlock
                {
                    Text = item,
                    FontSize = 12.5,
                    LineHeight = 18,
                    Foreground = new SolidColorBrush(TextPrimary),
                    TextWrapping = TextWrapping.Wrap
                };

                Grid.SetColumn(dot, 0);
                Grid.SetColumn(tb, 1);
                row.Children.Add(dot);
                row.Children.Add(tb);
                notesBulletsPanel.Children.Add(row);
            }
        }

        // --------------------------------------------------------------------
        // Window & Step Motion
        // --------------------------------------------------------------------
        private void RunWindowEntrance()
        {
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };

            outerBorder.Opacity = 0.0;
            windowScale.ScaleX = 0.96;
            windowScale.ScaleY = 0.96;
            windowTranslate.Y = 10;

            outerBorder.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0.0, 1.0, TimeSpan.FromMilliseconds(240)) { EasingFunction = ease });
            windowScale.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(0.96, 1.0, TimeSpan.FromMilliseconds(280)) { EasingFunction = ease });
            windowScale.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(0.96, 1.0, TimeSpan.FromMilliseconds(280)) { EasingFunction = ease });
            windowTranslate.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(10.0, 0.0, TimeSpan.FromMilliseconds(280)) { EasingFunction = ease });

            // Staggered Step 1 card entrance
            AnimateElementStagger(pathCard, 40);
            AnimateElementStagger(notesCard, 90);
            AnimateElementStagger(actionGrid, 140);
        }

        private void AnimateElementStagger(UIElement el, int delayMs)
        {
            if (el == null) return;
            TranslateTransform tt = el.RenderTransform as TranslateTransform;
            if (tt == null)
            {
                tt = new TranslateTransform(0, 8);
                el.RenderTransform = tt;
            }
            else
            {
                tt.Y = 8;
            }
            el.Opacity = 0.0;
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
            var fade = new DoubleAnimation(0.0, 1.0, TimeSpan.FromMilliseconds(240))
            {
                BeginTime = TimeSpan.FromMilliseconds(delayMs),
                EasingFunction = ease
            };
            var rise = new DoubleAnimation(8.0, 0.0, TimeSpan.FromMilliseconds(260))
            {
                BeginTime = TimeSpan.FromMilliseconds(delayMs),
                EasingFunction = ease
            };
            el.BeginAnimation(UIElement.OpacityProperty, fade);
            tt.BeginAnimation(TranslateTransform.YProperty, rise);
        }

        private void CloseWithAnimation(Action beforeShutdown)
        {
            if (isClosingAnimated) return;
            isClosingAnimated = true;
            if (langPopup != null) langPopup.IsOpen = false;

            var ease = new CubicEase { EasingMode = EasingMode.EaseIn };
            var dur = TimeSpan.FromMilliseconds(190);

            DoubleAnimation fadeOut = new DoubleAnimation(outerBorder.Opacity, 0.0, dur) { EasingFunction = ease };
            windowScale.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(1.0, 0.965, dur) { EasingFunction = ease });
            windowScale.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(1.0, 0.965, dur) { EasingFunction = ease });
            windowTranslate.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(0.0, 8.0, dur) { EasingFunction = ease });

            fadeOut.Completed += (s, e) =>
            {
                if (beforeShutdown != null)
                {
                    try { beforeShutdown(); } catch { }
                }
                Application.Current.Shutdown();
            };
            outerBorder.BeginAnimation(UIElement.OpacityProperty, fadeOut);
        }

        private void MinimizeWithAnimation()
        {
            if (isMinimizingAnimated || isClosingAnimated) return;
            isMinimizingAnimated = true;
            if (langPopup != null) langPopup.IsOpen = false;

            var ease = new CubicEase { EasingMode = EasingMode.EaseIn };
            var dur = TimeSpan.FromMilliseconds(130);
            DoubleAnimation fade = new DoubleAnimation(1.0, 0.0, dur) { EasingFunction = ease };
            windowScale.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(1.0, 0.96, dur) { EasingFunction = ease });
            windowScale.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(1.0, 0.96, dur) { EasingFunction = ease });

            fade.Completed += (s, e) =>
            {
                this.WindowState = WindowState.Minimized;
                isMinimizingAnimated = false;
            };
            outerBorder.BeginAnimation(UIElement.OpacityProperty, fade);
        }

        private void MainWindow_StateChanged(object sender, EventArgs e)
        {
            if (this.WindowState == WindowState.Normal && !isClosingAnimated)
            {
                var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
                var dur = TimeSpan.FromMilliseconds(200);
                outerBorder.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0.0, 1.0, dur) { EasingFunction = ease });
                windowScale.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(0.96, 1.0, dur) { EasingFunction = ease });
                windowScale.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(0.96, 1.0, dur) { EasingFunction = ease });
            }
        }

        private void TransitionToStep2()
        {
            currentStep = "Step2";
            var easeOut = new CubicEase { EasingMode = EasingMode.EaseOut };
            var easeIn = new CubicEase { EasingMode = EasingMode.EaseIn };

            // Animate step indicator connector & dot 2
            stepConnectorFill.BeginAnimation(FrameworkElement.WidthProperty,
                new DoubleAnimation(0, 36, TimeSpan.FromMilliseconds(240)) { EasingFunction = easeOut });
            step2Dot.Background = new SolidColorBrush(AccentColor);
            step2Dot.BorderThickness = new Thickness(0);
            TextBlock tb2 = step2Dot.Child as TextBlock;
            if (tb2 != null)
            {
                tb2.Foreground = new SolidColorBrush(BgPrimary);
                tb2.FontWeight = FontWeights.SemiBold;
            }
            lblStep2.Foreground = new SolidColorBrush(TextPrimary);
            lblStep2.FontWeight = FontWeights.Medium;

            TranslateTransform t1 = (TranslateTransform)step1View.RenderTransform;
            DoubleAnimation outFade = new DoubleAnimation(1.0, 0.0, TimeSpan.FromMilliseconds(150)) { EasingFunction = easeIn };
            t1.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(0, -16, TimeSpan.FromMilliseconds(150)) { EasingFunction = easeIn });
            outFade.Completed += (s, e) =>
            {
                step1View.Visibility = Visibility.Collapsed;
                step2View.Visibility = Visibility.Visible;
                TranslateTransform t2 = (TranslateTransform)step2View.RenderTransform;
                t2.X = 16;
                step2View.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0.0, 1.0, TimeSpan.FromMilliseconds(230)) { EasingFunction = easeOut });
                t2.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(16, 0, TimeSpan.FromMilliseconds(250)) { EasingFunction = easeOut });
            };
            step1View.BeginAnimation(UIElement.OpacityProperty, outFade);
        }

        private void TransitionToStep1()
        {
            currentStep = "Step1";
            var easeOut = new CubicEase { EasingMode = EasingMode.EaseOut };
            var easeIn = new CubicEase { EasingMode = EasingMode.EaseIn };

            stepConnectorFill.BeginAnimation(FrameworkElement.WidthProperty,
                new DoubleAnimation(36, 0, TimeSpan.FromMilliseconds(200)) { EasingFunction = easeOut });
            step2Dot.Background = new SolidColorBrush(BgRaised);
            step2Dot.BorderThickness = new Thickness(1);
            TextBlock tb2 = step2Dot.Child as TextBlock;
            if (tb2 != null)
            {
                tb2.Foreground = new SolidColorBrush(TextMuted);
                tb2.FontWeight = FontWeights.Medium;
            }
            lblStep2.Foreground = new SolidColorBrush(TextMuted);
            lblStep2.FontWeight = FontWeights.Normal;

            TranslateTransform t2 = (TranslateTransform)step2View.RenderTransform;
            DoubleAnimation outFade = new DoubleAnimation(1.0, 0.0, TimeSpan.FromMilliseconds(140)) { EasingFunction = easeIn };
            t2.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(0, 16, TimeSpan.FromMilliseconds(140)) { EasingFunction = easeIn });
            outFade.Completed += (s, e) =>
            {
                step2View.Visibility = Visibility.Collapsed;
                step1View.Visibility = Visibility.Visible;
                TranslateTransform t1 = (TranslateTransform)step1View.RenderTransform;
                t1.X = -16;
                step1View.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0.0, 1.0, TimeSpan.FromMilliseconds(220)) { EasingFunction = easeOut });
                t1.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(-16, 0, TimeSpan.FromMilliseconds(240)) { EasingFunction = easeOut });
            };
            step2View.BeginAnimation(UIElement.OpacityProperty, outFade);
        }

        private void AnimateBrushColor(SolidColorBrush brush, Color toColor, int ms)
        {
            if (brush == null) return;
            brush.BeginAnimation(SolidColorBrush.ColorProperty,
                new ColorAnimation(toColor, TimeSpan.FromMilliseconds(ms))
                {
                    EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
                });
        }

        private void AnimateScale(ScaleTransform st, double target, int ms)
        {
            if (st == null) return;
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
            st.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(target, TimeSpan.FromMilliseconds(ms)) { EasingFunction = ease });
            st.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(target, TimeSpan.FromMilliseconds(ms)) { EasingFunction = ease });
        }

        private void SetProgressAnimated(double percent)
        {
            currentProgress = Math.Max(0.0, Math.Min(100.0, percent));
            lblRunPercent.Text = ((int)Math.Round(currentProgress)).ToString() + "%";
            UpdateProgressFillWidth(true);
        }

        private void UpdateProgressFillWidth(bool animate)
        {
            if (prgTrack == null || prgFill == null) return;
            double totalW = prgTrack.ActualWidth;
            if (totalW <= 0) return;
            double targetW = totalW * (currentProgress / 100.0);
            if (animate)
            {
                prgFill.BeginAnimation(FrameworkElement.WidthProperty,
                    new DoubleAnimation(targetW, TimeSpan.FromMilliseconds(220))
                    {
                        EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
                    });
            }
            else
            {
                prgFill.BeginAnimation(FrameworkElement.WidthProperty, null);
                prgFill.Width = targetW;
            }
        }

        private void ApplyDarkScrollBarStyle(ScrollViewer sv)
        {
            try
            {
                string xaml = @"
                    <Style xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='ScrollBar'>
                        <Setter Property='Width' Value='6'/>
                        <Setter Property='Background' Value='Transparent'/>
                        <Setter Property='Template'>
                            <Setter.Value>
                                <ControlTemplate TargetType='ScrollBar'>
                                    <Grid Background='Transparent'>
                                        <Track x:Name='PART_Track' IsDirectionReversed='True' xmlns:x='http://schemas.microsoft.com/winfx/2006/xaml'>
                                            <Track.Thumb>
                                                <Thumb>
                                                    <Thumb.Template>
                                                        <ControlTemplate TargetType='Thumb'>
                                                            <Border CornerRadius='8' Background='#262938'/>
                                                        </ControlTemplate>
                                                    </Thumb.Template>
                                                </Thumb>
                                            </Track.Thumb>
                                        </Track>
                                    </Grid>
                                </ControlTemplate>
                            </Setter.Value>
                        </Setter>
                    </Style>";
                Style s = (Style)System.Windows.Markup.XamlReader.Parse(xaml);
                sv.Resources.Add(typeof(ScrollBar), s);
            }
            catch { }
        }

        // --------------------------------------------------------------------
        // Path Detection & Validation
        // --------------------------------------------------------------------
        private void DetectAntigravity()
        {
            string candidate = "";

            try
            {
                Process[] procs = Process.GetProcessesByName("Antigravity");
                if (procs != null && procs.Length > 0)
                {
                    candidate = System.IO.Path.GetDirectoryName(procs[0].MainModule.FileName);
                }
            }
            catch { }

            if (string.IsNullOrEmpty(candidate))
            {
                try
                {
                    using (var key = Registry.CurrentUser.OpenSubKey(@"Software\AntigravityEnhancer"))
                    {
                        if (key != null)
                        {
                            string regDir = key.GetValue("AppDir") as string;
                            if (!string.IsNullOrEmpty(regDir) && Directory.Exists(regDir)) candidate = regDir;
                        }
                    }
                }
                catch { }
            }

            if (string.IsNullOrEmpty(candidate))
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string p1 = System.IO.Path.Combine(localApp, @"Programs\Antigravity");
                string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                string p2 = System.IO.Path.Combine(progFiles, @"Antigravity");

                if (Directory.Exists(p1)) candidate = p1;
                else if (Directory.Exists(p2)) candidate = p2;
            }

            if (!string.IsNullOrEmpty(candidate))
            {
                txtPath.Text = candidate;
            }
            else
            {
                lblPathStatus.Text = T("BadgeNotFound");
                lblPathStatus.Foreground = new SolidColorBrush(SemanticErr);
                statusBadgeDot.Fill = new SolidColorBrush(SemanticErr);
                btnInstall.IsEnabled = false;
                btnRestore.IsEnabled = false;
            }
        }

        private void OnPathChanged()
        {
            detectedAppDir = (txtPath != null ? txtPath.Text : "").Trim();
            appExePath = string.IsNullOrEmpty(detectedAppDir) ? "" : System.IO.Path.Combine(detectedAppDir, "Antigravity.exe");
            asarPath = string.IsNullOrEmpty(detectedAppDir) ? "" : System.IO.Path.Combine(detectedAppDir, @"resources\app.asar");
            backupAsarPath = string.IsNullOrEmpty(detectedAppDir) ? "" : System.IO.Path.Combine(detectedAppDir, @"resources\app.asar.original");

            if (!string.IsNullOrEmpty(asarPath) && File.Exists(asarPath))
            {
                bool patched = AsarMicroPatcher.IsBootstrapped(asarPath);
                lblPathStatus.Text = patched ? T("BadgePatched") : T("BadgeVerified");
                Color c = patched ? AccentColor : SemanticOk;
                lblPathStatus.Foreground = new SolidColorBrush(TextPrimary);
                statusBadgeDot.Fill = new SolidColorBrush(c);
                if (!isBusy)
                {
                    btnInstall.IsEnabled = true;
                    btnRestore.IsEnabled = patched || File.Exists(backupAsarPath);
                }
            }
            else
            {
                lblPathStatus.Text = string.IsNullOrEmpty(detectedAppDir) ? T("BadgeNotFound") : T("BadgeCheckPath");
                lblPathStatus.Foreground = new SolidColorBrush(SemanticErr);
                statusBadgeDot.Fill = new SolidColorBrush(SemanticErr);
                btnInstall.IsEnabled = false;
                btnRestore.IsEnabled = false;
            }
        }

        private void BrowseFolder()
        {
            using (var dlg = new System.Windows.Forms.FolderBrowserDialog())
            {
                dlg.Description = T("BrowseDesc");
                if (Directory.Exists(txtPath.Text)) dlg.SelectedPath = txtPath.Text;
                if (dlg.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    txtPath.Text = dlg.SelectedPath;
                }
            }
        }

        // --------------------------------------------------------------------
        // Step 2 Execution & Automatic Restart
        // --------------------------------------------------------------------
        private void StartStep2Action(string action)
        {
            if (isBusy) return;
            isBusy = true;
            btnLangTrigger.IsEnabled = false;
            btnBack.Visibility = Visibility.Collapsed;
            logItemsStack.Children.Clear();

            lblRunTitle.Text = (action == "Install") ? T("RunInstallTitle") : T("RunRestoreTitle");
            lblRunTitle.Foreground = new SolidColorBrush(TextPrimary);
            lblRunStatus.Foreground = new SolidColorBrush(TextSecondary);
            prgFill.Background = new SolidColorBrush(AccentColor);
            SetProgressAnimated(0);

            string prepMsg = (action == "Install") ? T("PrepInstall") : T("PrepRestore");
            lblRunStatus.Text = prepMsg;
            AppendLogRow(prepMsg, false);

            TransitionToStep2();
            worker.RunWorkerAsync(action);
        }

        private void Worker_DoWork(object sender, DoWorkEventArgs e)
        {
            string action = e.Argument as string;
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string enhancerDir = System.IO.Path.Combine(appData, @"Antigravity\enhancer");
            string legacyLauncherDir = System.IO.Path.Combine(localAppData, "AntigravityEnhancer");

            try
            {
                Thread.Sleep(180);
                worker.ReportProgress(15, T("ProgKill"));
                CloseAntigravityProcesses();
                Thread.Sleep(350);

                if (action == "Install")
                {
                    worker.ReportProgress(38, T("ProgDeploy"));
                    Directory.CreateDirectory(enhancerDir);
                    string disabledFlag = System.IO.Path.Combine(enhancerDir, "disabled.flag");
                    if (File.Exists(disabledFlag)) { try { File.Delete(disabledFlag); } catch { } }
                    string stateFile = System.IO.Path.Combine(enhancerDir, "state.json");
                    if (File.Exists(stateFile)) { try { File.Delete(stateFile); } catch { } }

                    string[] moduleFiles = new string[]
                    {
                        "manifest.json",
                        "main-enhancer.js",
                        "renderer-enhancer.js",
                        "gsap-core.js",
                        "dictionaries.json",
                        "asar-patcher.js",
                        "auto-repatch.js",
                        "CHANGELOG.md"
                    };
                    foreach (string mf in moduleFiles)
                    {
                        ExtractEmbeddedGzip("enhancer_" + mf + ".gz", System.IO.Path.Combine(enhancerDir, mf));
                    }

                    worker.ReportProgress(70, T("ProgAsar"));
                    AsarMicroPatcher.EnsureBootstrapped(asarPath, false);

                    RegisterAutoRepatchTask(detectedAppDir, enhancerDir);

                    using (var key = Registry.CurrentUser.CreateSubKey(@"Software\AntigravityEnhancer"))
                    {
                        if (key != null) key.SetValue("AppDir", detectedAppDir);
                    }

                    if (Directory.Exists(legacyLauncherDir))
                    {
                        try { Directory.Delete(legacyLauncherDir, true); } catch { }
                    }

                    worker.ReportProgress(90, T("ProgClean"));
                    PurgeCacheDirectories();
                    Thread.Sleep(180);

                    worker.ReportProgress(100, T("ProgInstallDone"));
                    e.Result = "InstallSuccess";
                }
                else if (action == "Restore")
                {
                    worker.ReportProgress(45, T("ProgRestoring"));
                    UnregisterAutoRepatchTask();
                    try { if (Directory.Exists(enhancerDir)) File.WriteAllText(System.IO.Path.Combine(enhancerDir, "disabled.flag"), "restored-vanilla\n"); } catch { }
                    AsarMicroPatcher.UnpatchVanilla(asarPath);

                    if (Directory.Exists(legacyLauncherDir))
                    {
                        try { Directory.Delete(legacyLauncherDir, true); } catch { }
                    }

                    worker.ReportProgress(88, T("ProgClean"));
                    PurgeCacheDirectories();
                    Thread.Sleep(180);

                    worker.ReportProgress(100, T("ProgRestoreDone"));
                    e.Result = "RestoreSuccess";
                }
            }
            catch (Exception ex)
            {
                e.Result = "Error: " + ex.Message;
            }
        }

        private void Worker_ProgressChanged(object sender, ProgressChangedEventArgs e)
        {
            SetProgressAnimated(e.ProgressPercentage);
            string msg = e.UserState as string;
            if (!string.IsNullOrEmpty(msg))
            {
                lblRunStatus.Opacity = 0.4;
                lblRunStatus.Text = msg;
                lblRunStatus.BeginAnimation(UIElement.OpacityProperty,
                    new DoubleAnimation(0.4, 1.0, TimeSpan.FromMilliseconds(150)));
                AppendLogRow(msg, false);
            }
        }

        private void Worker_RunWorkerCompleted(object sender, RunWorkerCompletedEventArgs e)
        {
            string result = e.Result as string;

            if (result != null && result.StartsWith("Error: "))
            {
                isBusy = false;
                btnLangTrigger.IsEnabled = true;
                OnPathChanged();

                string detail = result.Substring(7);
                lblRunTitle.Text = T("ErrStatus");
                lblRunTitle.Foreground = new SolidColorBrush(SemanticErr);
                lblRunStatus.Text = detail;
                lblRunStatus.Foreground = new SolidColorBrush(SemanticErr);
                prgFill.Background = new SolidColorBrush(SemanticErr);
                AppendLogRow(T("ErrPrefix") + detail, true);

                btnBack.Visibility = Visibility.Visible;
                AnimateElementStagger(btnBack, 0);
                return;
            }

            SetProgressAnimated(100);
            prgFill.Background = new SolidColorBrush(SemanticOk);
            lblRunPercent.Foreground = new SolidColorBrush(SemanticOk);
            OnPathChanged();

            // Automatic restart without requiring any extra button press
            AppendLogRow(T("LogLaunching"), false);
            DispatcherTimer restartTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(650)
            };
            restartTimer.Tick += (s, ev) =>
            {
                restartTimer.Stop();
                CloseWithAnimation(() => { LaunchAntigravity(); });
            };
            restartTimer.Start();
        }

        private void AppendLogRow(string text, bool isError)
        {
            string ts = DateTime.Now.ToString("HH:mm:ss");
            TranslateTransform tt = new TranslateTransform(0, 6);

            Grid row = new Grid
            {
                Margin = new Thickness(0, 0, 0, 6),
                Opacity = 0.0,
                RenderTransform = tt
            };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(64) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(12) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            TextBlock tbTime = new TextBlock
            {
                Text = ts,
                FontFamily = new FontFamily("Consolas"),
                FontSize = 11,
                Foreground = new SolidColorBrush(TextMuted),
                VerticalAlignment = VerticalAlignment.Top,
                Margin = new Thickness(0, 1, 0, 0)
            };

            Ellipse dot = new Ellipse
            {
                Width = 5,
                Height = 5,
                Fill = new SolidColorBrush(isError ? SemanticErr : AccentColor),
                HorizontalAlignment = HorizontalAlignment.Left,
                VerticalAlignment = VerticalAlignment.Top,
                Margin = new Thickness(0, 6, 0, 0)
            };

            TextBlock tbMsg = new TextBlock
            {
                Text = text,
                FontSize = 12,
                Foreground = new SolidColorBrush(isError ? SemanticErr : TextPrimary),
                TextWrapping = TextWrapping.Wrap
            };

            Grid.SetColumn(tbTime, 0);
            Grid.SetColumn(dot, 1);
            Grid.SetColumn(tbMsg, 2);
            row.Children.Add(tbTime);
            row.Children.Add(dot);
            row.Children.Add(tbMsg);

            logItemsStack.Children.Add(row);
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
            row.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0.0, 1.0, TimeSpan.FromMilliseconds(180)) { EasingFunction = ease });
            tt.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(6.0, 0.0, TimeSpan.FromMilliseconds(200)) { EasingFunction = ease });

            logScrollViewer.ScrollToEnd();
        }

        // --------------------------------------------------------------------
        // System Operations
        // --------------------------------------------------------------------
        private void CloseAntigravityProcesses()
        {
            Process[] procs = Process.GetProcessesByName("Antigravity");
            if (procs != null && procs.Length > 0)
            {
                foreach (Process p in procs)
                {
                    try { p.CloseMainWindow(); } catch { }
                }

                for (int i = 0; i < 6; i++)
                {
                    Thread.Sleep(500);
                    if (Process.GetProcessesByName("Antigravity").Length == 0) break;
                }

                foreach (Process p in Process.GetProcessesByName("Antigravity"))
                {
                    try { p.Kill(); } catch { }
                }
            }
        }

        private void RegisterAutoRepatchTask(string appDir, string enhancerDir)
        {
            try
            {
                string exePath = System.IO.Path.Combine(appDir, "Antigravity.exe");
                string scriptPath = System.IO.Path.Combine(enhancerDir, "auto-repatch.js");
                string psWrapperPath = System.IO.Path.Combine(enhancerDir, "auto-repatch.ps1");
                string vbsWrapperPath = System.IO.Path.Combine(enhancerDir, "auto-repatch.vbs");
                string psBody =
                    "$ErrorActionPreference = 'SilentlyContinue'\r\n" +
                    "if (-not (Get-Process Antigravity -ErrorAction SilentlyContinue)) {\r\n" +
                    "  $env:ELECTRON_RUN_AS_NODE = '1'\r\n" +
                    "  & '" + exePath.Replace("'", "''") + "' '" + scriptPath.Replace("'", "''") + "'\r\n" +
                    "}\r\n";
                File.WriteAllText(psWrapperPath, psBody, new UTF8Encoding(false));

                string vbsBody =
                    "On Error Resume Next\r\n" +
                    "Set wmi = GetObject(\"winmgmts:\\\\.\\root\\cimv2\")\r\n" +
                    "Set procs = wmi.ExecQuery(\"Select ProcessId from Win32_Process where Name='Antigravity.exe'\")\r\n" +
                    "If procs.Count = 0 Then\r\n" +
                    "  Set sh = CreateObject(\"WScript.Shell\")\r\n" +
                    "  sh.Environment(\"PROCESS\")(\"ELECTRON_RUN_AS_NODE\") = \"1\"\r\n" +
                    "  sh.Run \"\"\"" + exePath + "\"\" \"\"" + scriptPath + "\"\"\", 0, False\r\n" +
                    "End If\r\n";
                File.WriteAllText(vbsWrapperPath, vbsBody, Encoding.ASCII);

                string tr = "wscript.exe //B //Nologo \"" + vbsWrapperPath + "\"";
                var psi = new ProcessStartInfo("schtasks.exe", "/Create /F /TN \"AntigravityEnhancerAutoRepatch\" /SC HOURLY /MO 1 /RL LIMITED /TR \"" + tr.Replace("\"", "\\\"") + "\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(5000);
                }
            }
            catch { }
        }

        private void UnregisterAutoRepatchTask()
        {
            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string psWrapperPath = System.IO.Path.Combine(appData, @"Antigravity\enhancer\auto-repatch.ps1");
                string vbsWrapperPath = System.IO.Path.Combine(appData, @"Antigravity\enhancer\auto-repatch.vbs");
                if (File.Exists(psWrapperPath)) { try { File.Delete(psWrapperPath); } catch { } }
                if (File.Exists(vbsWrapperPath)) { try { File.Delete(vbsWrapperPath); } catch { } }
                var psi = new ProcessStartInfo("schtasks.exe", "/Delete /TN \"AntigravityEnhancerAutoRepatch\" /F")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(5000);
                }
            }
            catch { }
        }

        private void ExtractEmbeddedGzip(string resourceName, string outputPath)
        {
            using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
            {
                if (resStream == null)
                {
                    throw new FileNotFoundException(string.Format(T("ErrMissingResFmt"), resourceName));
                }
                using (GZipStream gz = new GZipStream(resStream, CompressionMode.Decompress))
                using (FileStream fs = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    byte[] buffer = new byte[65536];
                    int read;
                    while ((read = gz.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        fs.Write(buffer, 0, read);
                    }
                }
            }
        }

        private void PurgeCacheDirectories()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string baseCache = System.IO.Path.Combine(appData, "Antigravity");

            string[] targets = new string[]
            {
                System.IO.Path.Combine(baseCache, "Cache"),
                System.IO.Path.Combine(baseCache, "Code Cache"),
                System.IO.Path.Combine(baseCache, "GPUCache")
            };

            foreach (string t in targets)
            {
                if (Directory.Exists(t))
                {
                    try { Directory.Delete(t, true); } catch { }
                }
            }
        }

        private void LaunchAntigravity()
        {
            string targetExe = appExePath;
            if (!string.IsNullOrEmpty(targetExe) && File.Exists(targetExe))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = targetExe,
                        WorkingDirectory = detectedAppDir,
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                }
                catch { }
            }
        }
    }
}
'@

$buildTmp = Join-Path $env:TEMP ("agy_exe_build_" + [Guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Path $buildTmp -Force | Out-Null

try {
    function Compress-ToGzipFile([string]$srcFile, [string]$dstGz) {
        $inBytes = [System.IO.File]::ReadAllBytes($srcFile)
        $fsOut = New-Object System.IO.FileStream($dstGz, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
        $gz = New-Object System.IO.Compression.GZipStream($fsOut, [System.IO.Compression.CompressionLevel]::Optimal)
        $gz.Write($inBytes, 0, $inBytes.Length)
        $gz.Close()
        $fsOut.Close()
    }

    $csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    if (-not (Test-Path $csc)) {
        throw "csc.exe not found at $csc"
    }

    # Ensure enhancer/manifest.json SHA-256 digests are current
    $manifestGen = Join-Path $projectRoot "generate_enhancer_manifest.js"
    if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $manifestGen)) {
        Write-Host "[1/4] Refreshing enhancer/manifest.json SHA-256 digests..." -ForegroundColor Cyan
        & node $manifestGen
        if ($LASTEXITCODE -ne 0) { throw "Manifest generation failed" }
    }

    function Maybe-SignBinary([string]$targetFile) {
        if ([string]::IsNullOrWhiteSpace($SignCertThumbprint)) { return "Unsigned" }
        $cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue |
            Where-Object { $_.Thumbprint -eq $SignCertThumbprint } | Select-Object -First 1
        if (-not $cert) { throw "Specified -SignCertThumbprint not found in Cert:\CurrentUser\My: $SignCertThumbprint" }
        $res = Set-AuthenticodeSignature -FilePath $targetFile -Certificate $cert -HashAlgorithm SHA256 -TimestampServer "http://timestamp.digicert.com"
        return $res.Status
    }

    $asarPatcherCs = Join-Path $installerSrcDir "AsarMicroPatcher.cs"

    # Embed enhancer modules and icon asset (no nested PE binaries or temp source compilers)
    Write-Host "[2/4] Compressing modular enhancer & icon payloads (GZip)..." -ForegroundColor Cyan
    $resourceFlags = @()
    $iconGz = Join-Path $buildTmp "app_icon.ico.gz"
    Compress-ToGzipFile -srcFile $icoPath -dstGz $iconGz
    $resourceFlags += "/resource:$iconGz,app_icon.ico.gz"

    $moduleNames = @("manifest.json", "main-enhancer.js", "renderer-enhancer.js", "gsap-core.js", "dictionaries.json", "asar-patcher.js", "auto-repatch.js", "CHANGELOG.md")
    foreach ($mod in $moduleNames) {
        $srcMod = Join-Path $enhancerSrcDir $mod
        $dstGz = Join-Path $buildTmp ("enhancer_$mod.gz")
        Compress-ToGzipFile -srcFile $srcMod -dstGz $dstGz
        $resourceFlags += "/resource:$dstGz,enhancer_$mod.gz"
    }

    $csFile = Join-Path $buildTmp "InstallerWPF.cs"
    $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
    $asmVer = if (($Version -split '\.').Count -ge 4) { $Version } else { "$Version.0" }
    $csCompiledSource = $csSource.Replace('__ASM_VERSION__', $asmVer).Replace('__ENHANCER_VERSION__', $Version)
    [System.IO.File]::WriteAllText($csFile, $csCompiledSource, $utf8WithBom)

    Write-Host "[3/4] Compiling Antigravity-Enhancer-Setup.exe v$Version..." -ForegroundColor Cyan
    Get-Process -Name "Antigravity-Enhancer-Setup", "Antigravity-Enhancer-v*-Setup" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 150
    $cscArgs = @(
        "/nologo",
        "/target:winexe",
        "/optimize+",
        "/platform:x64",
        "/codepage:65001",
        "/win32manifest:$manifestPath",
        "/out:$OutputExe",
        "/lib:C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF",
        "/r:System.dll",
        "/r:System.Web.Extensions.dll",
        "/r:System.Xaml.dll",
        "/r:System.Windows.Forms.dll",
        "/r:WindowsBase.dll",
        "/r:PresentationCore.dll",
        "/r:PresentationFramework.dll"
    ) + $resourceFlags
    if (Test-Path $icoPath) {
        $cscArgs += "/win32icon:$icoPath"
    }
    $cscArgs += $asarPatcherCs
    $cscArgs += $csFile

    & $csc @cscArgs
    if ($LASTEXITCODE -ne 0) {
        throw "csc.exe compilation failed with exit code $LASTEXITCODE"
    }

    $sigStatus = Maybe-SignBinary $OutputExe

    $versionedExe = Join-Path $projectRoot "Antigravity-Enhancer-v$Version-Setup.exe"
    Copy-Item -Path $OutputExe -Destination $versionedExe -Force

    # Generate SHA256SUMS.txt and release archive
    Write-Host "[4/4] Writing SHA256SUMS.txt & packaging Antigravity-Enhancer-v$Version-Win.zip..." -ForegroundColor Cyan
    $shaFile = Join-Path $projectRoot "SHA256SUMS.txt"
    $hashLines = @()
    foreach ($f in @($OutputExe, $versionedExe)) {
        $h = (Get-FileHash -Path $f -Algorithm SHA256).Hash.ToLowerInvariant()
        $hashLines += "$h  $(Split-Path $f -Leaf)"
    }
    [System.IO.File]::WriteAllLines($shaFile, $hashLines, (New-Object System.Text.UTF8Encoding($false)))

    $zipPath = Join-Path $projectRoot "Antigravity-Enhancer-v$Version-Win.zip"
    $zipItems = @(
        $OutputExe,
        $enhancerSrcDir,
        $icoPath,
        $shaFile
    )
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path $zipItems -DestinationPath $zipPath -CompressionLevel Optimal

    $sizeMb = [math]::Round((Get-Item $OutputExe).Length / 1MB, 2)
    $zipMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host "`n[SUCCESS] Build Complete:" -ForegroundColor Green
    Write-Host "  Setup EXE  : $OutputExe ($sizeMb MB) [$sigStatus]" -ForegroundColor White
    Write-Host "  Versioned  : $versionedExe" -ForegroundColor White
    Write-Host "  Checksums  : $shaFile" -ForegroundColor White
    Write-Host "  ZIP Archive: $zipPath ($zipMb MB)" -ForegroundColor White
}
finally {
    if (Test-Path $buildTmp) {
        Remove-Item -Path $buildTmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
