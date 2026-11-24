#!/usr/bin/env node
/**
 * Antigravity Enhancer - Cross-Platform CLI Installer (macOS, Linux, Windows)
 * Zero external dependencies. Supports --install, --restore, --status, --app-dir, --user-data, --no-relaunch, --no-kill.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ENHANCER_SRC_DIR = path.join(ROOT_DIR, 'enhancer');
const require = createRequire(import.meta.url);
const asarPatcher = require(path.join(ENHANCER_SRC_DIR, 'asar-patcher.js'));

const MODULE_FILES = [
  'manifest.json',
  'main-enhancer.js',
  'renderer-enhancer.js',
  'gsap-core.js',
  'dictionaries.json',
  'asar-patcher.js',
  'auto-repatch.js',
  'CHANGELOG.md'
];

const CLI_I18N = {
  en: {
    installing: 'Installing Antigravity Enhancer',
    restoring: 'Restoring original Antigravity files',
    closing: 'Closing running Antigravity processes',
    deploying: 'Deploying enhancer modules',
    patching: 'Applying lossless bootstrapper to app.asar',
    codesign: 'Applying ad-hoc macOS bundle signature',
    cache: 'Refreshing application cache',
    doneInstall: 'Patch installed successfully',
    doneRestore: 'Original state restored successfully',
    notFound: 'Could not locate Antigravity app.asar. Pass --app-dir <path>.'
  },
  ko: {
    installing: 'Antigravity Enhancer 패치 설치 중',
    restoring: 'Antigravity 원본 복구 중',
    closing: '실행 중인 Antigravity 프로세스 종료 중',
    deploying: '다국어 및 패치 모듈 배치 중',
    patching: 'app.asar 무손실 부트스트랩 적용 중',
    codesign: 'macOS 앱 번들 서명 갱신 중',
    cache: '애플리케이션 캐시 정리 중',
    doneInstall: '패치 설치가 완료되었습니다',
    doneRestore: '원본 상태 복구가 완료되었습니다',
    notFound: 'Antigravity 설치 경로(app.asar)를 찾을 수 없습니다. --app-dir <경로>를 지정하세요.'
  },
  ja: {
    installing: 'Antigravity Enhancer をインストール中',
    restoring: 'オリジナルファイルを復元中',
    closing: '実行中のプロセスを終了中',
    deploying: '拡張モジュールを配置中',
    patching: 'app.asar にブートストラップを適用中',
    codesign: 'macOS アプリ署名を更新中',
    cache: 'キャッシュを整理中',
    doneInstall: 'パッチのインストールが完了しました',
    doneRestore: 'オリジナル状態の復元が完了しました',
    notFound: 'Antigravity の app.asar が見つかりません。--app-dir <path> を指定してください。'
  },
  'zh-CN': {
    installing: '正在安装 Antigravity Enhancer',
    restoring: '正在恢复 Antigravity 原始文件',
    closing: '正在关闭运行中的进程',
    deploying: '正在部署多语言与增强模块',
    patching: '正在更新 app.asar 引导程序',
    codesign: '正在更新 macOS 应用签名',
    cache: '正在清理应用缓存',
    doneInstall: '补丁安装完成',
    doneRestore: '已成功恢复为原始状态',
    notFound: '未找到 Antigravity 的 app.asar，请使用 --app-dir <路径> 指定。'
  },
  'zh-TW': {
    installing: '正在安裝 Antigravity Enhancer',
    restoring: '正在還原 Antigravity 原始檔案',
    closing: '正在關閉執行中的處理程序',
    deploying: '正在部署多語言與增強模組',
    patching: '正在更新 app.asar 引導程式',
    codesign: '正在更新 macOS 應用程式簽章',
    cache: '正在清理應用快取',
    doneInstall: '修補安裝完成',
    doneRestore: '已成功還原為原始狀態',
    notFound: '找不到 Antigravity 的 app.asar，請使用 --app-dir <路徑> 指定。'
  },
  es: { installing: 'Instalando Antigravity Enhancer', restoring: 'Restaurando archivos originales', closing: 'Cerrando procesos activos', deploying: 'Copiando módulos del parche', patching: 'Aplicando arranque en app.asar', codesign: 'Actualizando firma en macOS', cache: 'Limpiando caché', doneInstall: 'Parche instalado correctamente', doneRestore: 'Estado original restaurado', notFound: 'No se encontró app.asar. Usa --app-dir <ruta>.' },
  fr: { installing: 'Installation d’Antigravity Enhancer', restoring: 'Restauration des fichiers d’origine', closing: 'Fermeture des processus actifs', deploying: 'Copie des modules du patch', patching: 'Application sur app.asar', codesign: 'Signature du paquet macOS', cache: 'Nettoyage du cache', doneInstall: 'Patch installé avec succès', doneRestore: 'État d’origine restauré', notFound: 'app.asar introuvable. Utilisez --app-dir <chemin>.' },
  de: { installing: 'Antigravity Enhancer wird installiert', restoring: 'Originaldateien werden wiederhergestellt', closing: 'Laufende Prozesse werden beendet', deploying: 'Patch-Module werden kopiert', patching: 'Bootstrapper wird auf app.asar angewendet', codesign: 'macOS-Signatur wird erneuert', cache: 'Cache wird bereinigt', doneInstall: 'Patch erfolgreich installiert', doneRestore: 'Originalzustand wiederhergestellt', notFound: 'app.asar nicht gefunden. Bitte --app-dir <Pfad> angeben.' },
  ru: { installing: 'Установка Antigravity Enhancer', restoring: 'Восстановление оригинальных файлов', closing: 'Завершение процессов Antigravity', deploying: 'Копирование модулей патча', patching: 'Обновление app.asar', codesign: 'Обновление подписи macOS', cache: 'Очистка кэша', doneInstall: 'Патч успешно установлен', doneRestore: 'Оригинальное состояние восстановлено', notFound: 'Файл app.asar не найден. Укажите --app-dir <путь>.' },
  'pt-BR': { installing: 'Instalando Antigravity Enhancer', restoring: 'Restaurando arquivos originais', closing: 'Fechando processos em execução', deploying: 'Copiando módulos do patch', patching: 'Aplicando bootstrapper em app.asar', codesign: 'Atualizando assinatura no macOS', cache: 'Limpando cache', doneInstall: 'Patch instalado com sucesso', doneRestore: 'Estado original restaurado', notFound: 'app.asar não encontrado. Use --app-dir <caminho>.' },
  vi: { installing: 'Đang cài đặt Antigravity Enhancer', restoring: 'Đang khôi phục tệp gốc', closing: 'Đang đóng tiến trình Antigravity', deploying: 'Đang chép mô-đun ngôn ngữ', patching: 'Đang cập nhật app.asar', codesign: 'Đang ký lại gói ứng dụng macOS', cache: 'Đang xóa bộ nhớ đệm', doneInstall: 'Đã cài đặt bản vá thành công', doneRestore: 'Đã khôi phục bản gốc thành công', notFound: 'Không tìm thấy app.asar. Hãy truyền --app-dir <đường_dẫn>.' },
  it: { installing: 'Installazione di Antigravity Enhancer', restoring: 'Ripristino dei file originali', closing: 'Chiusura dei processi attivi', deploying: 'Copia dei moduli della patch', patching: 'Applicazione bootstrapper su app.asar', codesign: 'Aggiornamento firma macOS', cache: 'Pulizia della cache', doneInstall: 'Patch installata correttamente', doneRestore: 'Stato originale ripristinato', notFound: 'app.asar non trovato. Usa --app-dir <percorso>.' },
  id: { installing: 'Memasang Antigravity Enhancer', restoring: 'Memulihkan file asli', closing: 'Menutup proses yang berjalan', deploying: 'Menyalin modul patch', patching: 'Menerapkan bootstrapper ke app.asar', codesign: 'Memperbarui tanda tangan macOS', cache: 'Membersihkan cache', doneInstall: 'Patch berhasil dipasang', doneRestore: 'Kondisi asli berhasil dipulihkan', notFound: 'app.asar tidak ditemukan. Gunakan --app-dir <jalur>.' },
  tr: { installing: 'Antigravity Enhancer kuruluyor', restoring: 'Orijinal dosyalar geri yükleniyor', closing: 'Çalışan işlemler kapatılıyor', deploying: 'Yama modülleri kopyalanıyor', patching: 'app.asar önyükleyicisi uygulanıyor', codesign: 'macOS uygulama imzası yenileniyor', cache: 'Önbellek temizleniyor', doneInstall: 'Yama başarıyla kuruldu', doneRestore: 'Orijinal durum geri yüklendi', notFound: 'app.asar bulunamadı. --app-dir <yol> parametresini kullanın.' },
  pl: { installing: 'Instalowanie Antigravity Enhancer', restoring: 'Przywracanie oryginalnych plików', closing: 'Zamykanie aktywnych procesów', deploying: 'Kopiowanie modułów łatki', patching: 'Aktualizowanie pliku app.asar', codesign: 'Odświeżanie podpisu macOS', cache: 'Czyszczenie pamięci podręcznej', doneInstall: 'Łatka została zainstalowana', doneRestore: 'Przywrócono oryginalny stan', notFound: 'Nie znaleziono app.asar. Użyj --app-dir <ścieżka>.' }
};

function detectCliLang(explicit) {
  const raw = String(explicit || process.env.ANTIGRAVITY_ENHANCER_LANG || process.env.LC_ALL || process.env.LANG || 'en')
    .split('.')[0]
    .replace('_', '-')
    .trim();
  const low = raw.toLowerCase();
  if (low.startsWith('ko')) return 'ko';
  if (low.startsWith('ja')) return 'ja';
  if (low.startsWith('zh')) return (low.includes('tw') || low.includes('hk') || low.includes('hant')) ? 'zh-TW' : 'zh-CN';
  if (low.startsWith('pt')) return 'pt-BR';
  if (low.startsWith('vi')) return 'vi';
  if (low.startsWith('it')) return 'it';
  if (low.startsWith('id') || low.startsWith('in')) return 'id';
  if (low.startsWith('tr')) return 'tr';
  if (low.startsWith('pl')) return 'pl';
  if (low.startsWith('es')) return 'es';
  if (low.startsWith('fr')) return 'fr';
  if (low.startsWith('de')) return 'de';
  if (low.startsWith('ru')) return 'ru';
  return 'en';
}

function parseArgs(argv) {
  const opts = {
    action: 'install',
    appDir: '',
    userDataDir: '',
    lang: '',
    json: false,
    noKill: false,
    noRelaunch: false,
    skipCodesign: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--install') opts.action = 'install';
    else if (a === '--restore' || a === '--uninstall') opts.action = 'restore';
    else if (a === '--status') opts.action = 'status';
    else if (a === '--json') opts.json = true;
    else if (a === '--no-kill') opts.noKill = true;
    else if (a === '--no-relaunch') opts.noRelaunch = true;
    else if (a === '--skip-codesign') opts.skipCodesign = true;
    else if (a === '--app-dir' && argv[i + 1]) opts.appDir = argv[++i];
    else if (a === '--user-data' && argv[i + 1]) opts.userDataDir = argv[++i];
    else if (a === '--lang' && argv[i + 1]) opts.lang = argv[++i];
  }
  return opts;
}

function resolveUserDataDir(explicitDir) {
  if (explicitDir) return path.resolve(explicitDir);
  const home = os.homedir();
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Antigravity');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Antigravity');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Antigravity');
}

function resolveAsarFromDir(candidate) {
  if (!candidate) return null;
  const resolved = path.resolve(candidate);
  const probes = [
    resolved.endsWith('app.asar') ? resolved : '',
    path.join(resolved, 'Contents', 'Resources', 'app.asar'),
    path.join(resolved, 'resources', 'app.asar'),
    path.join(resolved, 'Resources', 'app.asar')
  ].filter(Boolean);
  for (const p of probes) {
    if (fs.existsSync(p)) {
      let macBundle = '';
      const idx = p.indexOf('.app' + path.sep);
      if (idx !== -1) macBundle = p.slice(0, idx + 4);
      return { appDir: resolved, asarPath: p, macBundle };
    }
  }
  return null;
}

function detectInstallation(explicitAppDir) {
  if (explicitAppDir) return resolveAsarFromDir(explicitAppDir);
  const home = os.homedir();
  const candidates = [];
  if (process.platform === 'darwin') {
    candidates.push('/Applications/Antigravity.app', path.join(home, 'Applications', 'Antigravity.app'));
  } else if (process.platform === 'win32') {
    candidates.push(
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Antigravity')
    );
  } else {
    candidates.push(
      '/opt/Antigravity',
      '/opt/antigravity',
      '/usr/lib/antigravity',
      '/usr/share/antigravity',
      path.join(home, '.local', 'share', 'Antigravity')
    );
  }
  for (const c of candidates) {
    const hit = resolveAsarFromDir(c);
    if (hit) return hit;
  }
  return null;
}

function stopRunningAntigravity() {
  try {
    if (process.platform === 'darwin') {
      execFileSync('pkill', ['-x', 'Antigravity'], { stdio: 'ignore' });
    } else if (process.platform === 'linux') {
      execFileSync('pkill', ['-f', '/[aA]ntigravity'], { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      execFileSync('taskkill', ['/F', '/IM', 'Antigravity.exe'], { stdio: 'ignore' });
    }
  } catch {
    // Not running
  }
}

function purgeCaches(userDataDir) {
  for (const sub of ['Cache', 'Code Cache', 'GPUCache']) {
    const dir = path.join(userDataDir, sub);
    if (fs.existsSync(dir)) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }
}

function relaunchApp(installInfo) {
  try {
    if (process.platform === 'darwin' && installInfo.macBundle) {
      const child = spawn('open', ['-a', installInfo.macBundle], { detached: true, stdio: 'ignore' });
      child.unref();
    } else if (process.platform === 'linux') {
      for (const bin of [path.join(installInfo.appDir, 'antigravity'), path.join(installInfo.appDir, 'Antigravity')]) {
        if (fs.existsSync(bin)) {
          const child = spawn(bin, [], { detached: true, stdio: 'ignore' });
          child.unref();
          break;
        }
      }
    } else if (process.platform === 'win32') {
      const exe = path.join(installInfo.appDir, 'Antigravity.exe');
      if (fs.existsSync(exe)) {
        const child = spawn(exe, [], { detached: true, stdio: 'ignore' });
        child.unref();
      }
    }
  } catch {}
}

export function runCli(rawArgs = process.argv.slice(2)) {
  const opts = parseArgs(rawArgs);
  const lang = detectCliLang(opts.lang);
  const t = CLI_I18N[lang] || CLI_I18N.en;
  const userDataDir = resolveUserDataDir(opts.userDataDir);
  const enhancerDir = path.join(userDataDir, 'enhancer');
  const installInfo = detectInstallation(opts.appDir);

  if (opts.action === 'status') {
    const manifestPath = path.join(enhancerDir, 'manifest.json');
    const localManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
    const status = {
      ok: Boolean(installInfo),
      platform: process.platform,
      lang,
      userDataDir,
      enhancerDir,
      asarPath: installInfo ? installInfo.asarPath : null,
      bootstrapped: installInfo ? Boolean(asarPatcher.inspectAsarStatus(installInfo.asarPath).bootstrapped) : false,
      installedVersion: localManifest ? localManifest.version : null
    };
    if (opts.json) console.log(JSON.stringify(status));
    else console.log(status);
    return status;
  }

  if (!installInfo) {
    if (!opts.json) console.error(`[ERROR] ${t.notFound}`);
    const errRes = { ok: false, error: t.notFound };
    if (opts.json) console.log(JSON.stringify(errRes));
    process.exitCode = 1;
    return errRes;
  }

  const log = (msg) => {
    if (!opts.json) console.log(`  • ${msg}`);
  };

  if (opts.action === 'install') {
    if (!opts.json) console.log(`\n[Antigravity Enhancer] ${t.installing}`);
    if (!opts.noKill) {
      log(t.closing);
      stopRunningAntigravity();
    }
    log(t.deploying);
    fs.mkdirSync(enhancerDir, { recursive: true });
    for (const stale of ['disabled.flag', 'state.json']) {
      const sp = path.join(enhancerDir, stale);
      if (fs.existsSync(sp)) fs.unlinkSync(sp);
    }
    for (const mf of MODULE_FILES) {
      fs.copyFileSync(path.join(ENHANCER_SRC_DIR, mf), path.join(enhancerDir, mf));
    }
    log(t.patching);
    asarPatcher.patchAsar(installInfo.asarPath);

    if (process.platform === 'darwin' && installInfo.macBundle && !opts.skipCodesign) {
      log(t.codesign);
      try {
        execFileSync('codesign', ['--force', '--deep', '--sign', '-', installInfo.macBundle], { stdio: 'ignore' });
      } catch {}
    }

    log(t.cache);
    purgeCaches(userDataDir);
    log(t.doneInstall);
    if (!opts.noRelaunch) relaunchApp(installInfo);
    const out = { ok: true, action: 'install', asarPath: installInfo.asarPath, enhancerDir };
    if (opts.json) console.log(JSON.stringify(out));
    return out;
  }

  if (!opts.json) console.log(`\n[Antigravity Enhancer] ${t.restoring}`);
  if (!opts.noKill) {
    log(t.closing);
    stopRunningAntigravity();
  }
  fs.mkdirSync(enhancerDir, { recursive: true });
  fs.writeFileSync(path.join(enhancerDir, 'disabled.flag'), 'restored-vanilla\n', 'utf8');
  asarPatcher.unpatchAsar(installInfo.asarPath);

  if (process.platform === 'darwin' && installInfo.macBundle && !opts.skipCodesign) {
    log(t.codesign);
    try {
      execFileSync('codesign', ['--force', '--deep', '--sign', '-', installInfo.macBundle], { stdio: 'ignore' });
    } catch {}
  }

  log(t.cache);
  purgeCaches(userDataDir);
  log(t.doneRestore);
  if (!opts.noRelaunch) relaunchApp(installInfo);
  const out = { ok: true, action: 'restore', asarPath: installInfo.asarPath, enhancerDir };
  if (opts.json) console.log(JSON.stringify(out));
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli();
}
