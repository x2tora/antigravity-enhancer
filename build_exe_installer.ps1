param(
    [string]$Version = "3.3.0",
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
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Microsoft.Win32;

[assembly: AssemblyTitle("Antigravity Enhancer Setup")]
[assembly: AssemblyDescription("Antigravity Multilingual UI and Model Quota Installer")]
[assembly: AssemblyCompany("x2tora")]
[assembly: AssemblyProduct("Antigravity Enhancer")]
[assembly: AssemblyCopyright("Copyright (C) 2026 x2tora")]
[assembly: AssemblyVersion("__ENHANCER_VERSION__.0")]
[assembly: AssemblyFileVersion("__ENHANCER_VERSION__.0")]

namespace AntigravityEnhancer
{
    public static class InstallerI18n
    {
        public static readonly string[] SupportedLanguages = new string[]
        {
            "en", "ko", "ja", "zh-CN", "zh-TW", "es", "fr", "de", "ru"
        };

        public static string ResolveCultureCode(string cultureName, string twoLetterIso)
        {
            string name = (cultureName ?? "").Trim();
            string lowerName = name.ToLowerInvariant();
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

            AddAll(t, "HeroSub",
                "9 languages · In-app updates · Quota viewer",
                "9개 언어 지원 · 인앱 업데이트 · 사용량 표시",
                "9言語対応 · アプリ内更新 · 使用量表示",
                "支持 9 种语言 · 应用内更新 · 用量显示",
                "支援 9 種語言 · 應用程式內更新 · 用量顯示",
                "9 idiomas · Actualización integrada · Visor de uso",
                "9 langues · Mises à jour intégrées · Quotas",
                "9 Sprachen · In-App-Updates · Kontingentanzeige",
                "9 языков · Обновления в приложении · Индикатор квот");

            AddAll(t, "BadgeVerified",
                "Verified", "확인됨", "確認済み", "已验证", "已驗證", "Verificado", "Vérifié", "Bestätigt", "Проверено");

            AddAll(t, "BadgePatched",
                "Patched", "패치 적용됨", "パッチ適用済み", "已应用补丁", "已套用修補", "Parcheado", "Patch appliqué", "Gepatcht", "Патч активен");

            AddAll(t, "BadgeNotFound",
                "Path Not Found", "설치 경로 미감지", "パス未検出", "未检测到路径", "未偵測到路徑", "Ruta no detectada", "Chemin introuvable", "Pfad nicht gefunden", "Путь не найден");

            AddAll(t, "BadgeCheckPath",
                "Check Path", "경로 확인 필요", "パス要確認", "请检查路径", "請檢查路徑", "Verificar ruta", "Vérifier le chemin", "Pfad prüfen", "Проверьте путь");

            AddAll(t, "PathLabel",
                "Install Location", "설치 경로", "インストール先", "安装路径", "安裝路徑", "Ruta de instalación", "Dossier d’installation", "Installationspfad", "Путь установки");

            AddAll(t, "BtnBrowse",
                "Browse", "찾아보기", "参照", "浏览", "瀏覽", "Examinar", "Parcourir", "Durchsuchen", "Обзор");

            AddAll(t, "BrowseDesc",
                "Select the Antigravity installation folder.",
                "Antigravity가 설치된 디렉터리를 선택하세요.",
                "Antigravity がインストールされているフォルダを選択してください。",
                "请选择 Antigravity 的安装目录。",
                "請選擇 Antigravity 的安裝目錄。",
                "Seleccione la carpeta donde está instalado Antigravity.",
                "Sélectionnez le dossier d’installation d’Antigravity.",
                "Wählen Sie den Installationsordner von Antigravity.",
                "Выберите папку установки Antigravity.");

            AddAll(t, "BtnInstall",
                "Install Patch", "패치 설치", "パッチ適用", "安装补丁", "安裝修補", "Instalar parche", "Installer le patch", "Patch installieren", "Установить патч");

            AddAll(t, "BtnRestore",
                "Restore Original", "원본 복구", "オリジナル復元", "恢复原版", "還原原版", "Restaurar original", "Restaurer l’original", "Original wiederherstellen", "Восстановить оригинал");

            AddAll(t, "BtnLaunch",
                "Launch Antigravity", "Antigravity 실행", "Antigravity を起動", "启动 Antigravity", "啟動 Antigravity", "Iniciar Antigravity", "Lancer Antigravity", "Antigravity starten", "Запустить Antigravity");

            AddAll(t, "StatusReady",
                "Ready", "준비됨", "準備完了", "就绪", "就緒", "Listo", "Prêt", "Bereit", "Готово");

            AddAll(t, "LogTitle",
                "Activity Log", "작업 로그", "作業ログ", "操作日志", "作業日誌", "Registro", "Journal", "Protokoll", "Журнал");

            AddAll(t, "CountdownFmt",
                "Launching in {0}s", "{0}초 후 실행", "{0}秒後に起動", "{0}秒后启动", "{0}秒後啟動", "Iniciando en {0}s", "Lancement dans {0}s", "Start in {0}s", "Запуск через {0} с");

            AddAll(t, "CountdownLaunching",
                "Launching...", "실행 중", "起動中", "正在启动", "啟動中", "Iniciando", "Lancement", "Starte...", "Запуск...");

            AddAll(t, "BtnLaunchNow",
                "Launch Now", "바로 실행", "今すぐ起動", "立即启动", "立即啟動", "Iniciar ahora", "Lancer", "Jetzt starten", "Запустить");

            AddAll(t, "BtnCancel",
                "Cancel", "취소", "キャンセル", "取消", "取消", "Cancelar", "Annuler", "Abbrechen", "Отмена");

            AddAll(t, "LogCancelled",
                "Auto-launch cancelled.",
                "자동 실행이 취소되었습니다.",
                "自動起動をキャンセルしました。",
                "已取消自动启动。",
                "已取消自動啟動。",
                "Inicio automático cancelado.",
                "Lancement automatique annulé.",
                "Automatischer Start abgebrochen.",
                "Автозапуск отменён.");

            AddAll(t, "LogReadyFmt",
                "Ready (v{0})", "준비됨 (v{0})", "準備完了 (v{0})", "就绪 (v{0})", "就緒 (v{0})", "Listo (v{0})", "Prêt (v{0})", "Bereit (v{0})", "Готово (v{0})");

            AddAll(t, "PrepInstall",
                "Preparing install...", "설치 준비 중...", "インストールを準備中...", "正在准备安装...", "正在準備安裝...", "Preparando instalación...", "Préparation de l’installation...", "Installation wird vorbereitet...", "Подготовка установки...");

            AddAll(t, "PrepRestore",
                "Preparing restore...", "복구 준비 중...", "復元を準備中...", "正在准备恢复...", "正在準備還原...", "Preparando restauración...", "Préparation de la restauration...", "Wiederherstellung wird vorbereitet...", "Подготовка восстановления...");

            AddAll(t, "ProgKill",
                "Closing Antigravity...", "Antigravity 프로세스 종료 중...", "Antigravity を終了中...", "正在关闭 Antigravity 进程...", "正在關閉 Antigravity 處理程序...", "Cerrando Antigravity...", "Fermeture d’Antigravity...", "Antigravity wird beendet...", "Закрытие Antigravity...");

            AddAll(t, "ProgDeploy",
                "Copying patch files...", "패치 파일 배치 중...", "パッチファイルを配置中...", "正在部署补丁文件...", "正在部署修補檔案...", "Copiando archivos del parche...", "Copie des fichiers du patch...", "Patch-Dateien werden kopiert...", "Копирование файлов патча...");

            AddAll(t, "ProgAsar",
                "Updating app.asar...", "app.asar 적용 중...", "app.asar に適用中...", "正在应用 app.asar...", "正在套用 app.asar...", "Aplicando en app.asar...", "Application sur app.asar...", "app.asar wird angepasst...", "Применение к app.asar...");

            AddAll(t, "ProgClean",
                "Clearing cache...", "캐시 정리 중...", "キャッシュを整理中...", "正在清理缓存...", "正在清理快取...", "Limpiando caché...", "Nettoyage du cache...", "Cache wird geleert...", "Очистка кэша...");

            AddAll(t, "ProgInstallDone",
                "Installation complete.", "설치가 완료되었습니다.", "インストールが完了しました。", "安装完成。", "安裝完成。", "Instalación completada.", "Installation terminée.", "Installation abgeschlossen.", "Установка завершена.");

            AddAll(t, "ProgRestoring",
                "Restoring original files...", "원본 상태 복원 중...", "オリジナル状態を復元中...", "正在恢复原版状态...", "正在還原原版狀態...", "Restaurando archivos originales...", "Restauration des fichiers d’origine...", "Originalzustand wird wiederhergestellt...", "Восстановление оригинала...");

            AddAll(t, "ProgRestoreDone",
                "Restored to original state.", "원본 상태로 복구되었습니다.", "オリジナル状態に復元しました。", "已恢复为原版状态。", "已還原為原版狀態。", "Restaurado al estado original.", "État d’origine restauré.", "Originalzustand wiederhergestellt.", "Оригинал восстановлен.");

            AddAll(t, "ErrStatus",
                "Action Failed", "작업 실패", "処理に失敗しました", "操作失败", "作業失敗", "Operación fallida", "Échec de l’opération", "Vorgang fehlgeschlagen", "Ошибка");

            AddAll(t, "ErrPrefix",
                "Error: ", "오류: ", "エラー: ", "错误: ", "錯誤: ", "Error: ", "Erreur : ", "Fehler: ", "Ошибка: ");

            AddAll(t, "ErrTitle",
                "Error", "오류", "エラー", "错误", "錯誤", "Error", "Erreur", "Fehler", "Ошибка");

            AddAll(t, "ErrMissingResFmt",
                "Embedded resource not found: {0}",
                "임베디드 리소스를 찾을 수 없습니다: {0}",
                "埋め込みリソースが見つかりません: {0}",
                "找不到嵌入式资源: {0}",
                "找不到內嵌資源: {0}",
                "Recurso incrustado no encontrado: {0}",
                "Ressource intégrée introuvable : {0}",
                "Eingebettete Ressource nicht gefunden: {0}",
                "Встроенный ресурс не найден: {0}");

            AddAll(t, "LogAutoLaunch",
                "Done. Launching Antigravity in 3s.",
                "완료되었습니다. 3초 후 Antigravity를 실행합니다.",
                "完了しました。3秒後に Antigravity を起動します。",
                "已完成。将在 3 秒后启动 Antigravity。",
                "已完成。將於 3 秒後啟動 Antigravity。",
                "Completado. Iniciando Antigravity en 3s.",
                "Terminé. Lancement d’Antigravity dans 3s.",
                "Fertig. Antigravity startet in 3s.",
                "Готово. Запуск Antigravity через 3 с.");

            AddAll(t, "LogLaunching",
                "Launching Antigravity...", "Antigravity를 실행합니다.", "Antigravity を起動します。", "正在启动 Antigravity。", "正在啟動 Antigravity。", "Iniciando Antigravity...", "Lancement d’Antigravity...", "Antigravity wird gestartet...", "Запуск Antigravity...");

            AddAll(t, "LogLaunched",
                "Antigravity launched.", "Antigravity를 실행했습니다.", "Antigravity を起動しました。", "已启动 Antigravity。", "已啟動 Antigravity。", "Antigravity iniciado.", "Antigravity lancé.", "Antigravity gestartet.", "Antigravity запущен.");

            AddAll(t, "LogLaunchFail",
                "Launch failed: ", "실행 실패: ", "起動に失敗しました: ", "启动失败: ", "啟動失敗: ", "Error al iniciar: ", "Échec du lancement : ", "Start fehlgeschlagen: ", "Ошибка запуска: ");

            AddAll(t, "LogExeMissing",
                "Executable not found: ", "실행 파일을 찾을 수 없습니다: ", "実行ファイルが見つかりません: ", "找不到可执行文件: ", "找不到可執行檔: ", "Ejecutable no encontrado: ", "Exécutable introuvable : ", "Ausführbare Datei nicht gefunden: ", "Исполняемый файл не найден: ");

            return t;
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
        private static readonly Color BgPrimary = Color.FromRgb(11, 11, 14);      // #0B0B0E
        private static readonly Color BgSurface = Color.FromRgb(18, 19, 25);      // #121319
        private static readonly Color BorderSubtle = Color.FromRgb(33, 35, 48);   // #212330
        private static readonly Color TextPrimary = Color.FromRgb(202, 211, 245); // #CAD3F5
        private static readonly Color TextMuted = Color.FromRgb(138, 147, 178);   // #8A93B2
        private static readonly Color AccentColor = Color.FromRgb(160, 163, 246); // #A0A3F6

        // UI Elements
        private Border outerBorder;
        private Border titleBorder;
        private Border heroCard;
        private Border pathCard;
        private Grid actionGrid;
        private Button btnInstall;
        private Button btnRestore;
        private Button btnLaunch;
        private StackPanel progressStack;
        private Border termBorder;

        private TextBox txtPath;
        private TextBlock lblPathStatus;
        private Border statusBadgeDot;
        private ProgressBar prgBar;
        private TextBlock lblStatus;
        private Border pnlCountdown;
        private TextBlock lblCountdownText;
        private Button btnImmediateLaunch;
        private Button btnCancelLaunch;
        private TextBox txtLog;
        private ScrollViewer logScrollViewer;

        private DispatcherTimer autoLaunchTimer;
        private int countdownSeconds = 3;
        private BackgroundWorker worker;

        private string detectedAppDir = "";
        private string appExePath = "";
        private string asarPath = "";
        private string backupAsarPath = "";
        private readonly string uiLang = InstallerI18n.DetectLanguage();

        private string T(string key)
        {
            return InstallerI18n.Get(uiLang, key);
        }

        public MainWindow()
        {
            this.Title = "Antigravity Enhancer";
            this.Width = 680;
            this.Height = 580;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.ResizeMode = ResizeMode.NoResize;
            LoadWindowIcon();

            BuildUI();
            DetectAntigravity();

            this.Loaded += (s, e) => { RunFadeEntrance(); };
        }

        private void LoadWindowIcon()
        {
            try
            {
                using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("app_icon.ico.gz"))
                {
                    if (resStream == null) return;
                    using (GZipStream gz = new GZipStream(resStream, CompressionMode.Decompress))
                    using (MemoryStream ms = new MemoryStream())
                    {
                        byte[] buf = new byte[16384];
                        int n;
                        while ((n = gz.Read(buf, 0, buf.Length)) > 0) ms.Write(buf, 0, n);
                        ms.Position = 0;
                        this.Icon = BitmapFrame.Create(ms, BitmapCreateOptions.None, BitmapCacheOption.OnLoad);
                    }
                }
            }
            catch { }
        }

        private void BuildUI()
        {
            // Outer shadow container
            Grid rootGrid = new Grid();
            rootGrid.Margin = new Thickness(12);

            outerBorder = new Border();
            outerBorder.CornerRadius = new CornerRadius(12);
            outerBorder.Background = new SolidColorBrush(BgPrimary);
            outerBorder.BorderBrush = new SolidColorBrush(BorderSubtle);
            outerBorder.BorderThickness = new Thickness(1);
            outerBorder.Effect = new DropShadowEffect
            {
                BlurRadius = 20,
                ShadowDepth = 2,
                Opacity = 0.55,
                Color = Colors.Black
            };

            Grid contentGrid = new Grid();
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(44) }); // Title Bar
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });    // Header Card
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });    // Path Card
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });    // Action Buttons
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });    // Progress & Countdown
            contentGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Log Output

            // 1. Title Bar
            titleBorder = new Border();
            titleBorder.Background = new SolidColorBrush(BgSurface);
            titleBorder.CornerRadius = new CornerRadius(11, 11, 0, 0);
            titleBorder.BorderBrush = new SolidColorBrush(BorderSubtle);
            titleBorder.BorderThickness = new Thickness(0, 0, 0, 1);
            titleBorder.MouseLeftButtonDown += (s, e) => { this.DragMove(); };

            Grid titleGrid = new Grid();
            titleGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            titleGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            StackPanel titleLeft = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(16, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
            TextBlock tbBrand1 = new TextBlock { Text = "ANTIGRAVITY", Foreground = new SolidColorBrush(TextPrimary), FontWeight = FontWeights.Bold, FontSize = 12, VerticalAlignment = VerticalAlignment.Center };
            TextBlock tbBrand2 = new TextBlock { Text = " ENHANCER", Foreground = new SolidColorBrush(AccentColor), FontWeight = FontWeights.Bold, FontSize = 12, VerticalAlignment = VerticalAlignment.Center };

            Border badge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 160, 163, 246)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(110, 160, 163, 246)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(6, 1, 6, 1),
                Margin = new Thickness(10, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            TextBlock tbVersion = new TextBlock { Text = "v__ENHANCER_VERSION__", Foreground = new SolidColorBrush(AccentColor), FontSize = 10, FontWeight = FontWeights.SemiBold };
            badge.Child = tbVersion;

            titleLeft.Children.Add(tbBrand1);
            titleLeft.Children.Add(tbBrand2);
            titleLeft.Children.Add(badge);

            StackPanel titleRight = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };

            Button btnMin = CreateTitleButton(false);
            btnMin.Click += (s, e) => { this.WindowState = WindowState.Minimized; };

            Button btnClose = CreateTitleButton(true);
            btnClose.Click += (s, e) => { Application.Current.Shutdown(); };

            titleRight.Children.Add(btnMin);
            titleRight.Children.Add(btnClose);

            Grid.SetColumn(titleLeft, 0);
            Grid.SetColumn(titleRight, 1);
            titleGrid.Children.Add(titleLeft);
            titleGrid.Children.Add(titleRight);
            titleBorder.Child = titleGrid;
            Grid.SetRow(titleBorder, 0);
            contentGrid.Children.Add(titleBorder);

            // 2. Summary Card
            heroCard = new Border
            {
                Background = new SolidColorBrush(BgSurface),
                BorderBrush = new SolidColorBrush(BorderSubtle),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Margin = new Thickness(18, 14, 18, 10),
                Padding = new Thickness(14, 12, 14, 12)
            };

            Grid heroGrid = new Grid();
            heroGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            heroGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            StackPanel heroLeft = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            TextBlock tbHeroTitle = new TextBlock
            {
                Text = T("HeroTitle"),
                FontWeight = FontWeights.Bold,
                FontSize = 13.5,
                Foreground = new SolidColorBrush(TextPrimary)
            };
            TextBlock tbHeroSub = new TextBlock
            {
                Text = T("HeroSub"),
                FontSize = 11,
                Foreground = new SolidColorBrush(TextMuted),
                Margin = new Thickness(0, 4, 0, 0)
            };
            heroLeft.Children.Add(tbHeroTitle);
            heroLeft.Children.Add(tbHeroSub);

            Border statusBadge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(24, 160, 163, 246)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(110, 160, 163, 246)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(10, 4, 10, 4),
                VerticalAlignment = VerticalAlignment.Center
            };

            StackPanel statusBadgeStack = new StackPanel { Orientation = Orientation.Horizontal };
            statusBadgeDot = new Border
            {
                Width = 6,
                Height = 6,
                CornerRadius = new CornerRadius(3),
                Background = new SolidColorBrush(AccentColor),
                Margin = new Thickness(0, 0, 6, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            lblPathStatus = new TextBlock
            {
                Text = T("BadgeVerified"),
                Foreground = new SolidColorBrush(AccentColor),
                FontWeight = FontWeights.SemiBold,
                FontSize = 11,
                VerticalAlignment = VerticalAlignment.Center
            };
            statusBadgeStack.Children.Add(statusBadgeDot);
            statusBadgeStack.Children.Add(lblPathStatus);
            statusBadge.Child = statusBadgeStack;

            Grid.SetColumn(heroLeft, 0);
            Grid.SetColumn(statusBadge, 1);
            heroGrid.Children.Add(heroLeft);
            heroGrid.Children.Add(statusBadge);
            heroCard.Child = heroGrid;
            Grid.SetRow(heroCard, 1);
            contentGrid.Children.Add(heroCard);

            // 3. Path Card
            pathCard = new Border
            {
                Background = new SolidColorBrush(BgSurface),
                BorderBrush = new SolidColorBrush(BorderSubtle),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Margin = new Thickness(18, 0, 18, 10),
                Padding = new Thickness(14, 10, 14, 10)
            };

            StackPanel pathStack = new StackPanel();
            TextBlock tbPathLabel = new TextBlock
            {
                Text = T("PathLabel"),
                Foreground = new SolidColorBrush(TextMuted),
                FontSize = 11,
                Margin = new Thickness(0, 0, 0, 6)
            };

            Grid pathInputGrid = new Grid();
            pathInputGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            pathInputGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            txtPath = new TextBox
            {
                Background = new SolidColorBrush(BgPrimary),
                Foreground = new SolidColorBrush(TextPrimary),
                BorderBrush = new SolidColorBrush(BorderSubtle),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8, 5, 8, 5),
                FontFamily = new FontFamily("Consolas"),
                FontSize = 11.5,
                VerticalAlignment = VerticalAlignment.Center
            };
            txtPath.TextChanged += (s, e) => { OnPathChanged(); };

            Button btnBrowse = CreateActionButton(T("BtnBrowse"), BgSurface, Color.FromRgb(28, 30, 40), new SolidColorBrush(TextPrimary), 11, 28);
            btnBrowse.Margin = new Thickness(8, 0, 0, 0);
            btnBrowse.Padding = new Thickness(12, 0, 12, 0);
            btnBrowse.Click += (s, e) => { BrowseFolder(); };

            Grid.SetColumn(txtPath, 0);
            Grid.SetColumn(btnBrowse, 1);
            pathInputGrid.Children.Add(txtPath);
            pathInputGrid.Children.Add(btnBrowse);

            pathStack.Children.Add(tbPathLabel);
            pathStack.Children.Add(pathInputGrid);
            pathCard.Child = pathStack;
            Grid.SetRow(pathCard, 2);
            contentGrid.Children.Add(pathCard);

            // 4. Action Buttons
            actionGrid = new Grid { Margin = new Thickness(18, 0, 18, 10) };
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(2.0, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(10) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(2.0, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(10) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(2.0, GridUnitType.Star) });

            btnInstall = CreateAccentButton(T("BtnInstall"));
            btnInstall.Click += (s, e) => { StartAction("Install"); };

            btnRestore = CreateActionButton(T("BtnRestore"), BgSurface, Color.FromRgb(28, 30, 40), new SolidColorBrush(TextPrimary), 12.0, 40);
            btnRestore.Click += (s, e) => { StartAction("Restore"); };

            btnLaunch = CreateActionButton(T("BtnLaunch"), BgSurface, Color.FromRgb(26, 28, 42), new SolidColorBrush(AccentColor), 12.0, 40, true, AccentColor);
            btnLaunch.Click += (s, e) => { LaunchAntigravity(); };

            Grid.SetColumn(btnInstall, 0);
            Grid.SetColumn(btnRestore, 2);
            Grid.SetColumn(btnLaunch, 4);
            actionGrid.Children.Add(btnInstall);
            actionGrid.Children.Add(btnRestore);
            actionGrid.Children.Add(btnLaunch);
            Grid.SetRow(actionGrid, 3);
            contentGrid.Children.Add(actionGrid);

            // 5. Progress and Status / Auto-Launch
            progressStack = new StackPanel { Margin = new Thickness(18, 0, 18, 8) };

            prgBar = new ProgressBar
            {
                Height = 5,
                Background = new SolidColorBrush(BgSurface),
                Foreground = new SolidColorBrush(AccentColor),
                BorderThickness = new Thickness(0),
                Value = 0
            };

            Grid statusRow = new Grid { Margin = new Thickness(2, 6, 2, 0) };
            statusRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            statusRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            lblStatus = new TextBlock
            {
                Text = T("StatusReady"),
                Foreground = new SolidColorBrush(TextPrimary),
                FontSize = 11,
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis
            };

            pnlCountdown = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(24, 160, 163, 246)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(110, 160, 163, 246)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(8, 3, 8, 3),
                Visibility = Visibility.Collapsed
            };

            StackPanel countdownStack = new StackPanel { Orientation = Orientation.Horizontal };
            lblCountdownText = new TextBlock
            {
                Text = string.Format(T("CountdownFmt"), 3),
                Foreground = new SolidColorBrush(AccentColor),
                FontWeight = FontWeights.SemiBold,
                FontSize = 11,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 8, 0)
            };

            btnImmediateLaunch = CreateSmallButton(T("BtnLaunchNow"), AccentColor, new SolidColorBrush(BgPrimary));
            btnImmediateLaunch.Click += (s, e) => { StopAutoLaunchTimer(); LaunchAntigravity(); Application.Current.Shutdown(); };

            btnCancelLaunch = CreateSmallButton(T("BtnCancel"), Color.FromRgb(38, 40, 56), new SolidColorBrush(TextPrimary));
            btnCancelLaunch.Margin = new Thickness(4, 0, 0, 0);
            btnCancelLaunch.Click += (s, e) => { StopAutoLaunchTimer(); pnlCountdown.Visibility = Visibility.Collapsed; Log(T("LogCancelled")); };

            countdownStack.Children.Add(lblCountdownText);
            countdownStack.Children.Add(btnImmediateLaunch);
            countdownStack.Children.Add(btnCancelLaunch);
            pnlCountdown.Child = countdownStack;

            Grid.SetColumn(lblStatus, 0);
            Grid.SetColumn(pnlCountdown, 1);
            statusRow.Children.Add(lblStatus);
            statusRow.Children.Add(pnlCountdown);

            progressStack.Children.Add(prgBar);
            progressStack.Children.Add(statusRow);
            Grid.SetRow(progressStack, 4);
            contentGrid.Children.Add(progressStack);

            // 6. Log Panel
            termBorder = new Border
            {
                Background = new SolidColorBrush(BgPrimary),
                BorderBrush = new SolidColorBrush(BorderSubtle),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Margin = new Thickness(18, 0, 18, 16)
            };

            Grid termGrid = new Grid();
            termGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(28) });
            termGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            Border termHeader = new Border
            {
                Background = new SolidColorBrush(BgSurface),
                BorderBrush = new SolidColorBrush(BorderSubtle),
                BorderThickness = new Thickness(0, 0, 0, 1),
                CornerRadius = new CornerRadius(7, 7, 0, 0),
                Padding = new Thickness(10, 0, 10, 0)
            };

            TextBlock tbTermTitle = new TextBlock
            {
                Text = T("LogTitle"),
                Foreground = new SolidColorBrush(TextMuted),
                FontSize = 10.5,
                FontWeight = FontWeights.SemiBold,
                VerticalAlignment = VerticalAlignment.Center
            };
            termHeader.Child = tbTermTitle;
            Grid.SetRow(termHeader, 0);
            termGrid.Children.Add(termHeader);

            logScrollViewer = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Padding = new Thickness(10, 8, 10, 8)
            };

            txtLog = new TextBox
            {
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(TextPrimary),
                BorderThickness = new Thickness(0),
                IsReadOnly = true,
                TextWrapping = TextWrapping.Wrap,
                FontFamily = new FontFamily("Consolas"),
                FontSize = 11.0
            };
            logScrollViewer.Content = txtLog;
            ApplyDarkScrollBarStyle(logScrollViewer);
            Grid.SetRow(logScrollViewer, 1);
            termGrid.Children.Add(logScrollViewer);

            termBorder.Child = termGrid;
            Grid.SetRow(termBorder, 5);
            contentGrid.Children.Add(termBorder);

            outerBorder.Child = contentGrid;
            rootGrid.Children.Add(outerBorder);
            this.Content = rootGrid;

            // Timer & Worker
            autoLaunchTimer = new DispatcherTimer();
            autoLaunchTimer.Interval = TimeSpan.FromSeconds(1);
            autoLaunchTimer.Tick += AutoLaunchTimer_Tick;

            worker = new BackgroundWorker();
            worker.WorkerReportsProgress = true;
            worker.DoWork += Worker_DoWork;
            worker.ProgressChanged += Worker_ProgressChanged;
            worker.RunWorkerCompleted += Worker_RunWorkerCompleted;

            Log(string.Format(T("LogReadyFmt"), "__ENHANCER_VERSION__"));
        }

        private void RunFadeEntrance()
        {
            outerBorder.Opacity = 0.0;
            DoubleAnimation fade = new DoubleAnimation
            {
                From = 0.0,
                To = 1.0,
                Duration = TimeSpan.FromMilliseconds(120),
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
            };
            outerBorder.BeginAnimation(UIElement.OpacityProperty, fade);
        }

        private void AnimateProgressBar(double targetValue)
        {
            DoubleAnimation da = new DoubleAnimation
            {
                To = targetValue,
                Duration = TimeSpan.FromMilliseconds(120),
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
            };
            prgBar.BeginAnimation(ProgressBar.ValueProperty, da);
        }

        private Button CreateTitleButton(bool isClose)
        {
            Button btn = new Button
            {
                Width = 44,
                Height = 44,
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand
            };

            System.Windows.Shapes.Path icon = new System.Windows.Shapes.Path
            {
                Stroke = new SolidColorBrush(TextMuted),
                StrokeThickness = 1.4,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            if (isClose)
            {
                icon.Data = Geometry.Parse("M 0 0 L 8.5 8.5 M 8.5 0 L 0 8.5");
            }
            else
            {
                icon.Data = Geometry.Parse("M 0 5 L 9 5");
            }
            btn.Content = icon;

            Style style = new Style(typeof(Button));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            FrameworkElementFactory border = new FrameworkElementFactory(typeof(Border));
            border.Name = "bdr";
            border.SetValue(Border.BackgroundProperty, Brushes.Transparent);
            FrameworkElementFactory cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            border.AppendChild(cp);
            template.VisualTree = border;

            Trigger trgHover = new Trigger { Property = Button.IsMouseOverProperty, Value = true };
            trgHover.Setters.Add(new Setter(Border.BackgroundProperty, isClose ? new SolidColorBrush(Color.FromRgb(185, 55, 65)) : new SolidColorBrush(Color.FromRgb(30, 32, 44)), "bdr"));
            template.Triggers.Add(trgHover);

            btn.MouseEnter += (s, e) => { icon.Stroke = new SolidColorBrush(TextPrimary); };
            btn.MouseLeave += (s, e) => { icon.Stroke = new SolidColorBrush(TextMuted); };

            style.Setters.Add(new Setter(Button.TemplateProperty, template));
            btn.Style = style;
            return btn;
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
                                                            <Border CornerRadius='3' Background='#2B2E40'/>
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

        private Button CreateAccentButton(string text)
        {
            TextBlock tb = new TextBlock
            {
                Text = text,
                FontWeight = FontWeights.Bold,
                FontSize = 13,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            Button btn = new Button
            {
                Content = tb,
                Height = 40,
                Foreground = new SolidColorBrush(BgPrimary),
                Cursor = Cursors.Hand
            };

            Style style = new Style(typeof(Button));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            FrameworkElementFactory bdr = new FrameworkElementFactory(typeof(Border));
            bdr.Name = "bdr";
            bdr.SetValue(Border.CornerRadiusProperty, new CornerRadius(8));
            bdr.SetValue(Border.BorderThicknessProperty, new Thickness(0));
            bdr.SetValue(Border.BackgroundProperty, new SolidColorBrush(AccentColor));

            FrameworkElementFactory cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            bdr.AppendChild(cp);
            template.VisualTree = bdr;

            Trigger trgHover = new Trigger { Property = Button.IsMouseOverProperty, Value = true };
            trgHover.Setters.Add(new Setter(Border.BackgroundProperty, new SolidColorBrush(Color.FromRgb(176, 179, 250)), "bdr"));
            template.Triggers.Add(trgHover);

            Trigger trgDisabled = new Trigger { Property = Button.IsEnabledProperty, Value = false };
            trgDisabled.Setters.Add(new Setter(Border.BackgroundProperty, new SolidColorBrush(Color.FromRgb(28, 30, 42)), "bdr"));
            trgDisabled.Setters.Add(new Setter(Button.ForegroundProperty, new SolidColorBrush(Color.FromRgb(95, 102, 128))));
            template.Triggers.Add(trgDisabled);

            style.Setters.Add(new Setter(Button.TemplateProperty, template));
            btn.Style = style;
            return btn;
        }

        private Button CreateActionButton(string text, Color bg, Color hoverBg, Brush fg, double fontSize, double height, bool bold = false, Color? borderColor = null)
        {
            TextBlock tb = new TextBlock
            {
                Text = text,
                FontWeight = bold ? FontWeights.Bold : FontWeights.Normal,
                FontSize = fontSize,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            Button btn = new Button
            {
                Content = tb,
                Height = height,
                Foreground = fg,
                Cursor = Cursors.Hand
            };

            Style style = new Style(typeof(Button));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            FrameworkElementFactory bdr = new FrameworkElementFactory(typeof(Border));
            bdr.Name = "bdr";
            bdr.SetValue(Border.CornerRadiusProperty, new CornerRadius(8));
            bdr.SetValue(Border.BorderThicknessProperty, new Thickness(1));
            bdr.SetValue(Border.BorderBrushProperty, new SolidColorBrush(borderColor ?? BorderSubtle));
            bdr.SetValue(Border.BackgroundProperty, new SolidColorBrush(bg));

            FrameworkElementFactory cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            bdr.AppendChild(cp);
            template.VisualTree = bdr;

            Trigger trgHover = new Trigger { Property = Button.IsMouseOverProperty, Value = true };
            trgHover.Setters.Add(new Setter(Border.BackgroundProperty, new SolidColorBrush(hoverBg), "bdr"));
            template.Triggers.Add(trgHover);

            Trigger trgDisabled = new Trigger { Property = Button.IsEnabledProperty, Value = false };
            trgDisabled.Setters.Add(new Setter(Border.BackgroundProperty, new SolidColorBrush(Color.FromRgb(18, 19, 25)), "bdr"));
            trgDisabled.Setters.Add(new Setter(Border.BorderBrushProperty, new SolidColorBrush(Color.FromRgb(28, 30, 42)), "bdr"));
            trgDisabled.Setters.Add(new Setter(Button.ForegroundProperty, new SolidColorBrush(Color.FromRgb(85, 90, 110))));
            template.Triggers.Add(trgDisabled);

            style.Setters.Add(new Setter(Button.TemplateProperty, template));
            btn.Style = style;
            return btn;
        }

        private Button CreateSmallButton(string text, Color bg, Brush fg)
        {
            TextBlock tb = new TextBlock
            {
                Text = text,
                FontSize = 10,
                FontWeight = FontWeights.SemiBold,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            Button btn = new Button
            {
                Content = tb,
                Padding = new Thickness(8, 2, 8, 2),
                Foreground = fg,
                Cursor = Cursors.Hand
            };

            Style style = new Style(typeof(Button));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            FrameworkElementFactory bdr = new FrameworkElementFactory(typeof(Border));
            bdr.Name = "bdr";
            bdr.SetValue(Border.CornerRadiusProperty, new CornerRadius(4));
            bdr.SetValue(Border.BackgroundProperty, new SolidColorBrush(bg));

            FrameworkElementFactory cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            bdr.AppendChild(cp);
            template.VisualTree = bdr;

            style.Setters.Add(new Setter(Button.TemplateProperty, template));
            btn.Style = style;
            return btn;
        }

        private void DetectAntigravity()
        {
            string candidate = "";

            try
            {
                Process[] procs = Process.GetProcessesByName("Antigravity");
                if (procs != null && procs.Length > 0)
                {
                    candidate = Path.GetDirectoryName(procs[0].MainModule.FileName);
                }
            }
            catch { }

            if (string.IsNullOrEmpty(candidate))
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string p1 = Path.Combine(localApp, @"Programs\Antigravity");
                string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                string p2 = Path.Combine(progFiles, @"Antigravity");

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
                lblPathStatus.Foreground = new SolidColorBrush(Color.FromRgb(248, 113, 113));
                statusBadgeDot.Background = new SolidColorBrush(Color.FromRgb(248, 113, 113));
            }
        }

        private void OnPathChanged()
        {
            detectedAppDir = txtPath.Text.Trim();
            appExePath = Path.Combine(detectedAppDir, "Antigravity.exe");
            asarPath = Path.Combine(detectedAppDir, @"resources\app.asar");
            backupAsarPath = Path.Combine(detectedAppDir, @"resources\app.asar.original");

            if (File.Exists(asarPath))
            {
                bool patched = AsarMicroPatcher.IsBootstrapped(asarPath);
                lblPathStatus.Text = patched ? T("BadgePatched") : T("BadgeVerified");
                lblPathStatus.Foreground = new SolidColorBrush(AccentColor);
                statusBadgeDot.Background = new SolidColorBrush(AccentColor);
                btnInstall.IsEnabled = true;
                btnRestore.IsEnabled = patched || File.Exists(backupAsarPath);
                btnLaunch.IsEnabled = File.Exists(appExePath);
            }
            else
            {
                lblPathStatus.Text = T("BadgeCheckPath");
                lblPathStatus.Foreground = new SolidColorBrush(Color.FromRgb(248, 113, 113));
                statusBadgeDot.Background = new SolidColorBrush(Color.FromRgb(248, 113, 113));
                btnInstall.IsEnabled = false;
                btnRestore.IsEnabled = false;
                btnLaunch.IsEnabled = false;
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

        private void SetUIBusy(bool busy)
        {
            btnInstall.IsEnabled = !busy && File.Exists(asarPath);
            btnRestore.IsEnabled = !busy && ((File.Exists(asarPath) && AsarMicroPatcher.IsBootstrapped(asarPath)) || File.Exists(backupAsarPath));
            btnLaunch.IsEnabled = !busy && File.Exists(appExePath);
            txtPath.IsEnabled = !busy;
        }

        private void StartAction(string action)
        {
            StopAutoLaunchTimer();
            SetUIBusy(true);
            AnimateProgressBar(0);
            lblStatus.Foreground = new SolidColorBrush(TextPrimary);
            lblStatus.Text = (action == "Install") ? T("PrepInstall") : T("PrepRestore");
            worker.RunWorkerAsync(action);
        }

        private void Worker_DoWork(object sender, DoWorkEventArgs e)
        {
            string action = e.Argument as string;
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string enhancerDir = Path.Combine(appData, @"Antigravity\enhancer");
            string legacyLauncherDir = Path.Combine(localAppData, "AntigravityEnhancer");

            try
            {
                worker.ReportProgress(10, T("ProgKill"));
                CloseAntigravityProcesses();
                Thread.Sleep(400);

                if (action == "Install")
                {
                    worker.ReportProgress(25, T("ProgDeploy"));
                    Directory.CreateDirectory(enhancerDir);
                    string disabledFlag = Path.Combine(enhancerDir, "disabled.flag");
                    if (File.Exists(disabledFlag)) { try { File.Delete(disabledFlag); } catch { } }
                    string stateFile = Path.Combine(enhancerDir, "state.json");
                    if (File.Exists(stateFile)) { try { File.Delete(stateFile); } catch { } }

                    string[] moduleFiles = new string[]
                    {
                        "manifest.json",
                        "main-enhancer.js",
                        "renderer-enhancer.js",
                        "gsap-core.js",
                        "dictionaries.json",
                        "asar-patcher.js"
                    };
                    foreach (string mf in moduleFiles)
                    {
                        ExtractEmbeddedGzip("enhancer_" + mf + ".gz", Path.Combine(enhancerDir, mf));
                    }

                    worker.ReportProgress(60, T("ProgAsar"));
                    AsarMicroPatcher.EnsureBootstrapped(asarPath, false);

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

                    worker.ReportProgress(100, T("ProgInstallDone"));
                    e.Result = "InstallSuccess";
                }
                else if (action == "Restore")
                {
                    worker.ReportProgress(35, T("ProgRestoring"));
                    AsarMicroPatcher.UnpatchVanilla(asarPath);

                    if (Directory.Exists(legacyLauncherDir))
                    {
                        try { Directory.Delete(legacyLauncherDir, true); } catch { }
                    }

                    worker.ReportProgress(85, T("ProgClean"));
                    PurgeCacheDirectories();

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
            AnimateProgressBar(Math.Max(0, Math.Min(100, e.ProgressPercentage)));
            string msg = e.UserState as string;
            if (!string.IsNullOrEmpty(msg))
            {
                lblStatus.Text = msg;
                Log(msg);
            }
        }

        private void Worker_RunWorkerCompleted(object sender, RunWorkerCompletedEventArgs e)
        {
            SetUIBusy(false);
            string result = e.Result as string;

            if (result != null && result.StartsWith("Error: "))
            {
                string detail = result.Substring(7);
                lblStatus.Text = T("ErrStatus");
                lblStatus.Foreground = new SolidColorBrush(Color.FromRgb(248, 113, 113));
                Log(T("ErrPrefix") + detail);
                MessageBox.Show(this, detail, T("ErrTitle"), MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            lblStatus.Foreground = new SolidColorBrush(AccentColor);
            AnimateProgressBar(100);
            OnPathChanged();

            StartAutoLaunchCountdown();
        }

        private void StartAutoLaunchCountdown()
        {
            countdownSeconds = 3;
            lblCountdownText.Text = string.Format(T("CountdownFmt"), countdownSeconds);
            pnlCountdown.Visibility = Visibility.Visible;
            autoLaunchTimer.Start();
            Log(T("LogAutoLaunch"));
        }

        private void StopAutoLaunchTimer()
        {
            autoLaunchTimer.Stop();
            pnlCountdown.Visibility = Visibility.Collapsed;
        }

        private void AutoLaunchTimer_Tick(object sender, EventArgs e)
        {
            countdownSeconds--;
            if (countdownSeconds > 0)
            {
                lblCountdownText.Text = string.Format(T("CountdownFmt"), countdownSeconds);
            }
            else
            {
                autoLaunchTimer.Stop();
                lblCountdownText.Text = T("CountdownLaunching");
                Log(T("LogLaunching"));
                LaunchAntigravity();

                DispatcherTimer exitTimer = new DispatcherTimer();
                exitTimer.Interval = TimeSpan.FromMilliseconds(1200);
                exitTimer.Tick += (s, ev) =>
                {
                    exitTimer.Stop();
                    Application.Current.Shutdown();
                };
                exitTimer.Start();
            }
        }

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
            string baseCache = Path.Combine(appData, "Antigravity");

            string[] targets = new string[]
            {
                Path.Combine(baseCache, "Cache"),
                Path.Combine(baseCache, "Code Cache"),
                Path.Combine(baseCache, "GPUCache")
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

            if (File.Exists(targetExe))
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
                    Log(T("LogLaunched"));
                }
                catch (Exception ex)
                {
                    Log(T("LogLaunchFail") + ex.Message);
                }
            }
            else
            {
                Log(T("LogExeMissing") + targetExe);
            }
        }

        private void Log(string text)
        {
            string timestamp = DateTime.Now.ToString("HH:mm:ss");
            txtLog.AppendText(string.Format("[{0}] {1}\r\n", timestamp, text));
            logScrollViewer.ScrollToEnd();
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

    $moduleNames = @("manifest.json", "main-enhancer.js", "renderer-enhancer.js", "gsap-core.js", "dictionaries.json", "asar-patcher.js")
    foreach ($mod in $moduleNames) {
        $srcMod = Join-Path $enhancerSrcDir $mod
        $dstGz = Join-Path $buildTmp ("enhancer_$mod.gz")
        Compress-ToGzipFile -srcFile $srcMod -dstGz $dstGz
        $resourceFlags += "/resource:$dstGz,enhancer_$mod.gz"
    }

    $csFile = Join-Path $buildTmp "InstallerWPF.cs"
    $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
    $csCompiledSource = $csSource.Replace('__ENHANCER_VERSION__', $Version)
    [System.IO.File]::WriteAllText($csFile, $csCompiledSource, $utf8WithBom)

    Write-Host "[3/4] Compiling Antigravity-Enhancer-Setup.exe v$Version..." -ForegroundColor Cyan
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
