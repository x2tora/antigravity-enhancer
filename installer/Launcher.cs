using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading;
using Microsoft.Win32;

[assembly: AssemblyTitle("Antigravity Enhancer Launcher")]
[assembly: AssemblyDescription("Startup verification and update recovery helper for Antigravity Enhancer")]
[assembly: AssemblyCompany("x2tora")]
[assembly: AssemblyProduct("Antigravity Enhancer")]
[assembly: AssemblyCopyright("Copyright (C) 2026 x2tora")]
[assembly: AssemblyVersion("3.0.0.0")]
[assembly: AssemblyFileVersion("3.0.0.0")]

namespace AntigravityEnhancer
{
    public static class Program
    {
        private const string RegKeyPath = @"Software\AntigravityEnhancer";

        public static string ResolveAppDir(string overrideDir = null)
        {
            if (!string.IsNullOrEmpty(overrideDir) && File.Exists(Path.Combine(overrideDir, "Antigravity.exe")))
                return overrideDir;

            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(RegKeyPath))
                {
                    if (key != null)
                    {
                        var val = key.GetValue("AppDir") as string;
                        if (!string.IsNullOrEmpty(val) && File.Exists(Path.Combine(val, "Antigravity.exe")))
                            return val;
                    }
                }
            }
            catch { }

            string defDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Antigravity");
            return defDir;
        }

        public static string ResolveEnhancerDataDir()
        {
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"Antigravity\enhancer");
        }

        private static bool IsEnhancerDisabled()
        {
            try
            {
                return File.Exists(Path.Combine(ResolveEnhancerDataDir(), "disabled.flag"));
            }
            catch
            {
                return false;
            }
        }

        private static string QuoteArg(string arg)
        {
            if (string.IsNullOrEmpty(arg)) return "\"\"";
            if (arg.IndexOfAny(new[] { ' ', '\t', '"', '\n', '\r' }) == -1) return arg;
            var sb = new StringBuilder();
            sb.Append('"');
            int backslashes = 0;
            for (int i = 0; i < arg.Length; i++)
            {
                char c = arg[i];
                if (c == '\\')
                {
                    backslashes++;
                }
                else if (c == '"')
                {
                    sb.Append('\\', backslashes * 2 + 1);
                    sb.Append('"');
                    backslashes = 0;
                }
                else
                {
                    if (backslashes > 0)
                    {
                        sb.Append('\\', backslashes);
                        backslashes = 0;
                    }
                    sb.Append(c);
                }
            }
            if (backslashes > 0) sb.Append('\\', backslashes * 2);
            sb.Append('"');
            return sb.ToString();
        }

        private static string JoinArgs(string[] args)
        {
            if (args == null || args.Length == 0) return "";
            var sb = new StringBuilder();
            for (int i = 0; i < args.Length; i++)
            {
                if (i > 0) sb.Append(' ');
                sb.Append(QuoteArg(args[i]));
            }
            return sb.ToString();
        }

        private static void EnsureShortcutsAndProtocol(string appDir, string launcherPath, bool enable)
        {
            string appExe = Path.Combine(appDir, "Antigravity.exe");
            if (!File.Exists(appExe)) return;

            try
            {
                Type wshType = Type.GetTypeFromProgID("WScript.Shell");
                if (wshType != null)
                {
                    object wsh = Activator.CreateInstance(wshType);
                    var lnkPaths = new List<string>();
                    string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);

                    foreach (string root in new[] { desktop, programs })
                    {
                        if (!Directory.Exists(root)) continue;
                        try
                        {
                            lnkPaths.AddRange(Directory.GetFiles(root, "*Antigravity*.lnk", SearchOption.AllDirectories));
                        }
                        catch { }
                    }

                    foreach (string lnk in lnkPaths)
                    {
                        try
                        {
                            object shortcut = wshType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, wsh, new object[] { lnk });
                            Type scType = shortcut.GetType();
                            string curTarget = (scType.InvokeMember("TargetPath", BindingFlags.GetProperty, null, shortcut, null) as string) ?? "";

                            if (enable)
                            {
                                if (string.Equals(curTarget, appExe, StringComparison.OrdinalIgnoreCase))
                                {
                                    scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { launcherPath });
                                    scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { appDir });
                                    scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { appExe + ",0" });
                                    scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                                }
                            }
                            else
                            {
                                if (string.Equals(curTarget, launcherPath, StringComparison.OrdinalIgnoreCase))
                                {
                                    scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { appExe });
                                    scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { appDir });
                                    scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { appExe + ",0" });
                                    scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
                                }
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }

        private static void WaitForPidExit(int pid, int maxMs)
        {
            if (pid <= 0) return;
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < maxMs)
            {
                try
                {
                    using (var p = Process.GetProcessById(pid))
                    {
                        if (p.HasExited) return;
                    }
                }
                catch
                {
                    return;
                }
                Thread.Sleep(250);
            }
        }

        private static void WaitAndRepatchAfterUpdate(string appDir, string launcherPath, int pid)
        {
            string asarPath = Path.Combine(appDir, @"resources\app.asar");
            string origHash = File.Exists(asarPath) ? new FileInfo(asarPath).Length + ":" + File.GetLastWriteTimeUtc(asarPath).Ticks : "";

            if (pid > 0) WaitForPidExit(pid, 60000);

            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < 180000)
            {
                Thread.Sleep(750);
                if (IsEnhancerDisabled()) return;

                if (File.Exists(asarPath) && !AsarMicroPatcher.IsBootstrapped(asarPath))
                {
                    try
                    {
                        AsarMicroPatcher.EnsureBootstrapped(asarPath, false);
                        EnsureShortcutsAndProtocol(appDir, launcherPath, true);
                        return;
                    }
                    catch { }
                }

                // If Antigravity already relaunched itself cleanly and stays bootstrapped for 20s+, exit
                string curStamp = File.Exists(asarPath) ? new FileInfo(asarPath).Length + ":" + File.GetLastWriteTimeUtc(asarPath).Ticks : "";
                if (curStamp != origHash && File.Exists(asarPath))
                {
                    origHash = curStamp;
                    if (!AsarMicroPatcher.IsBootstrapped(asarPath))
                    {
                        try
                        {
                            AsarMicroPatcher.EnsureBootstrapped(asarPath, false);
                            EnsureShortcutsAndProtocol(appDir, launcherPath, true);
                            return;
                        }
                        catch { }
                    }
                }
            }
        }

        [STAThread]
        public static void Main(string[] args)
        {
            string selfPath = Assembly.GetExecutingAssembly().Location;
            string overrideDir = null;
            if (args != null && args.Length >= 3 && args[0].Equals("--check-only", StringComparison.OrdinalIgnoreCase))
            {
                for (int i = 1; i < args.Length - 1; i++)
                {
                    if (args[i].Equals("--app-dir", StringComparison.OrdinalIgnoreCase))
                    {
                        overrideDir = args[i + 1];
                        break;
                    }
                }
            }
            string appDir = ResolveAppDir(overrideDir);
            string appExe = Path.Combine(appDir, "Antigravity.exe");
            string asarPath = Path.Combine(appDir, @"resources\app.asar");

            if (args != null && args.Length > 0)
            {
                string first = args[0].ToLowerInvariant();
                if (first == "--check-only")
                {
                    if (!IsEnhancerDisabled() && File.Exists(asarPath))
                    {
                        try
                        {
                            if (!AsarMicroPatcher.IsBootstrapped(asarPath))
                                AsarMicroPatcher.EnsureBootstrapped(asarPath, false);
                        }
                        catch { }
                    }
                    return;
                }

                if (first == "--setup-shortcuts")
                {
                    EnsureShortcutsAndProtocol(appDir, selfPath, true);
                    return;
                }

                if (first == "--watch-update")
                {
                    int pid = 0;
                    for (int i = 1; i < args.Length - 1; i++)
                    {
                        if (args[i].Equals("--pid", StringComparison.OrdinalIgnoreCase) || i == 1)
                        {
                            if (int.TryParse(args[i], out pid)) break;
                        }
                    }
                    if (pid == 0 && args.Length > 1) int.TryParse(args[1], out pid);
                    WaitAndRepatchAfterUpdate(appDir, selfPath, pid);
                    return;
                }

                if (first == "--restore-vanilla")
                {
                    int pid = 0;
                    bool relaunch = false;
                    for (int i = 1; i < args.Length; i++)
                    {
                        if (args[i] == "--pid" && i + 1 < args.Length) int.TryParse(args[i + 1], out pid);
                        if (args[i] == "--relaunch") relaunch = true;
                    }
                    if (pid > 0) WaitForPidExit(pid, 15000);
                    Thread.Sleep(300);

                    foreach (var p in Process.GetProcessesByName("Antigravity"))
                    {
                        try { p.CloseMainWindow(); } catch { }
                    }
                    Thread.Sleep(400);

                    try
                    {
                        if (File.Exists(asarPath)) AsarMicroPatcher.UnpatchVanilla(asarPath);
                    }
                    catch { }

                    EnsureShortcutsAndProtocol(appDir, selfPath, false);

                    if (relaunch && File.Exists(appExe))
                    {
                        try
                        {
                            Process.Start(new ProcessStartInfo { FileName = appExe, WorkingDirectory = appDir, UseShellExecute = true });
                        }
                        catch { }
                    }
                    return;
                }
            }

            // Default Smart Launch mode: guarantee ASAR micro-bootstrap in <40ms, then launch real Antigravity.exe
            if (!IsEnhancerDisabled() && File.Exists(asarPath))
            {
                try
                {
                    if (!AsarMicroPatcher.IsBootstrapped(asarPath))
                    {
                        AsarMicroPatcher.EnsureBootstrapped(asarPath, false);
                    }
                }
                catch { }
            }

            if (File.Exists(appExe))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = appExe,
                        Arguments = JoinArgs(args),
                        WorkingDirectory = appDir,
                        UseShellExecute = true
                    });
                }
                catch { }
            }
        }
    }
}
