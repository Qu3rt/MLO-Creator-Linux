// Everything that is different on Linux: where the program keeps its files, where GTA V is installed,
// the native file dialogs, opening a folder and starting a browser as the fallback window.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace MloCreator
{
    public static class Linux
    {
        public static string AppDir;
        public static string Home { get { return Environment.GetEnvironmentVariable("HOME") ?? "/"; } }

        public static string XdgDataHome
        {
            get
            {
                string d = Environment.GetEnvironmentVariable("XDG_DATA_HOME");
                if (!string.IsNullOrEmpty(d)) return d;
                return Path.Combine(Home, ".local", "share");
            }
        }

        // A path from the Windows build's settings.json (Wine writes Z:\home\...): turn it into a Linux path.
        public static string FixPath(string p)
        {
            if (p == null) return null;
            p = p.Trim().Trim('"');
            if (p.Length == 0) return p;
            if (p.Length >= 2 && p[1] == ':' && (p[0] == 'Z' || p[0] == 'z')) p = p.Substring(2);
            p = p.Replace('\\', '/');
            if (p.Length >= 2 && p[1] == ':') p = p.Substring(2);         // another Windows drive: not reachable here
            return p;
        }

        public static bool Writable(string dir)
        {
            try
            {
                Directory.CreateDirectory(dir);
                string f = Path.Combine(dir, ".write-test-" + Guid.NewGuid().ToString("N").Substring(0, 6));
                File.WriteAllText(f, "x"); File.Delete(f); return true;
            }
            catch (Exception) { return false; }
        }

        // ---------------- GTA V ----------------
        static string SteamExe(string gta)
        {
            if (string.IsNullOrWhiteSpace(gta)) return null;
            string[] names = new string[] { "GTA5.exe", "GTA5_Enhanced.exe" };
            foreach (string n in names) { string p = Path.Combine(gta, n); if (File.Exists(p)) return p; }
            return null;
        }

        static List<string> SteamRoots()
        {
            List<string> l = new List<string>();
            Action<string> add = delegate (string p) { if (!string.IsNullOrEmpty(p) && Directory.Exists(p) && !l.Contains(p)) l.Add(p); };
            add(Path.Combine(Home, ".steam", "steam"));
            add(Path.Combine(Home, ".steam", "root"));
            add(Path.Combine(Home, ".local", "share", "Steam"));
            add(Path.Combine(Home, ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam"));
            add(Path.Combine(Home, ".var", "app", "com.valvesoftware.Steam", "data", "Steam"));
            add("/usr/share/steam"); add("/usr/local/share/steam");
            return l;
        }

        // the usual places (every Steam library, Flatpak Steam, the GTA5_PATH variable), "" when it is nowhere
        public static string GtaDefault(string settingsPath)
        {
            List<string> cands = new List<string>();
            if (!string.IsNullOrWhiteSpace(settingsPath)) cands.Add(FixPath(settingsPath));
            string env = Environment.GetEnvironmentVariable("GTA5_PATH"); if (!string.IsNullOrEmpty(env)) cands.Add(FixPath(env));
            foreach (string steam in SteamRoots())
            {
                cands.Add(Path.Combine(steam, "steamapps", "common", "Grand Theft Auto V"));
                try
                {
                    string vdf = Path.Combine(steam, "steamapps", "libraryfolders.vdf");
                    if (File.Exists(vdf))
                        foreach (Match m in Regex.Matches(File.ReadAllText(vdf), "\"path\"\\s+\"([^\"]+)\""))
                            cands.Add(Path.Combine(m.Groups[1].Value.Replace("\\\\", "\\"), "steamapps", "common", "Grand Theft Auto V"));
                }
                catch (Exception) { }
            }
            // a folder that was picked by hand: next to the program, or a mount point
            cands.Add(Path.Combine(Home, "Games", "Grand Theft Auto V"));
            cands.Add(Path.Combine(Home, "Desktop", "Grand Theft Auto V"));
            foreach (string c in cands) { try { if (SteamExe(c) != null) return c; } catch (Exception) { } }
            return "";
        }

        // ---------------- the native window and the file dialogs ----------------
        public static string ShellPath()
        {
            string env = Environment.GetEnvironmentVariable("MLO_SHELL");
            if (!string.IsNullOrEmpty(env) && File.Exists(env)) return env;
            string[] cands = new string[] {
                AppDir == null ? null : Path.Combine(AppDir, "mlo-shell"),
                AppDir == null ? null : Path.Combine(AppDir, "native", "mlo-shell"),
                AppDir == null ? null : Path.Combine(AppDir, "..", "native", "mlo-shell"),
                "/usr/lib/mlo-creator/mlo-shell",
                "/usr/local/lib/mlo-creator/mlo-shell"
            };
            foreach (string c in cands) { try { if (c != null && File.Exists(c)) return Path.GetFullPath(c); } catch (Exception) { } }
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string d in path.Split(':')) { try { string p = Path.Combine(d, "mlo-shell"); if (File.Exists(p)) return p; } catch (Exception) { } }
            return null;
        }

        static string OnPath(string exe)
        {
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string d in path.Split(':')) { try { string p = Path.Combine(d, exe); if (File.Exists(p)) return p; } catch (Exception) { } }
            return null;
        }

        // The file / folder picker. Uses the program's own GTK dialog (mlo-shell --pick-files / --pick-folder), and
        // falls back to zenity / kdialog when the native window is not installed (for example when --browser is used).
        public static string[] Pick(bool folder, string last)
        {
            string shell = ShellPath();
            if (shell != null)
            {
                ProcessStartInfo psi = new ProcessStartInfo(shell);
                psi.ArgumentList.Add(folder ? "--pick-folder" : "--pick-files");
                if (!string.IsNullOrEmpty(last) && Directory.Exists(last)) { psi.ArgumentList.Add("--last"); psi.ArgumentList.Add(last); }
                psi.UseShellExecute = false; psi.RedirectStandardOutput = true; psi.RedirectStandardError = true;
                try
                {
                    using (Process p = Process.Start(psi))
                    {
                        StringBuilder err = new StringBuilder();
                        p.ErrorDataReceived += delegate (object s, DataReceivedEventArgs e) { if (e.Data != null) err.AppendLine(e.Data); };
                        p.BeginErrorReadLine();
                        string outp = p.StandardOutput.ReadToEnd();
                        if (!p.WaitForExit(30 * 60 * 1000)) { try { p.Kill(true); } catch (Exception) { } return null; }
                        if (p.ExitCode != 0 && outp.Trim().Length == 0) return null;
                        List<string> list = new List<string>();
                        foreach (string line in outp.Replace("\r", "").Split('\n')) { string t = line.Trim(); if (t.Length > 0) list.Add(t); }
                        return list.Count == 0 ? null : list.ToArray();
                    }
                }
                catch (Exception) { /* fall through to zenity */ }
            }
            return PickWithZenity(folder, last) ?? PickWithKdialog(folder, last);
        }

        static string[] PickWithZenity(bool folder, string last)
        {
            string z = OnPath("zenity"); if (z == null) return null;
            ProcessStartInfo psi = new ProcessStartInfo(z);
            psi.ArgumentList.Add("--file-selection");
            if (folder) psi.ArgumentList.Add("--directory");
            psi.ArgumentList.Add("--multiple"); psi.ArgumentList.Add("--separator=\n");
            psi.ArgumentList.Add("--title=" + (folder ? "Pick the folder that holds the model files (.ydr, .ytd, .ybn, .ymap, .glb)" : "Import model files"));
            if (!folder) psi.ArgumentList.Add("--file-filter=Model files (*.ydr, *.ytd, *.ybn, *.ymap, *.glb) | *.ydr *.ytd *.ybn *.ymap *.glb");
            if (!string.IsNullOrEmpty(last)) psi.ArgumentList.Add("--filename=" + last + "/");
            psi.UseShellExecute = false; psi.RedirectStandardOutput = true; psi.RedirectStandardError = true;
            try
            {
                using (Process p = Process.Start(psi))
                {
                    string outp = p.StandardOutput.ReadToEnd(); p.WaitForExit();
                    if (p.ExitCode != 0) return null;
                    List<string> list = new List<string>();
                    foreach (string line in outp.Replace("\r", "").Split('\n')) { string t = line.Trim(); if (t.Length > 0) list.Add(t); }
                    return list.Count == 0 ? null : list.ToArray();
                }
            }
            catch (Exception) { return null; }
        }

        static string[] PickWithKdialog(bool folder, string last)
        {
            string k = OnPath("kdialog"); if (k == null) return null;
            ProcessStartInfo psi = new ProcessStartInfo(k);
            if (folder) { psi.ArgumentList.Add("--getexistingdirectory"); psi.ArgumentList.Add(!string.IsNullOrEmpty(last) ? last : Home); }
            else
            {
                psi.ArgumentList.Add("--getopenfilename"); psi.ArgumentList.Add(!string.IsNullOrEmpty(last) ? last : Home);
                psi.ArgumentList.Add("*.ydr *.ytd *.ybn *.ymap *.glb | Model files"); psi.ArgumentList.Add("--multiple"); psi.ArgumentList.Add("--separate-output");
            }
            psi.UseShellExecute = false; psi.RedirectStandardOutput = true; psi.RedirectStandardError = true;
            try
            {
                using (Process p = Process.Start(psi))
                {
                    string outp = p.StandardOutput.ReadToEnd(); p.WaitForExit();
                    if (p.ExitCode != 0) return null;
                    List<string> list = new List<string>();
                    foreach (string line in outp.Replace("\r", "").Split('\n')) { string t = line.Trim(); if (t.Length > 0) list.Add(t); }
                    return list.Count == 0 ? null : list.ToArray();
                }
            }
            catch (Exception) { return null; }
        }

        public static void Reveal(string dir)
        {
            if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir)) return;
            string x = OnPath("xdg-open");
            if (x != null) { try { ProcessStartInfo psi = new ProcessStartInfo(x); psi.ArgumentList.Add(dir); psi.UseShellExecute = false; Process.Start(psi); return; } catch (Exception) { } }
            string g = OnPath("gio");
            if (g != null) { try { ProcessStartInfo psi = new ProcessStartInfo(g); psi.ArgumentList.Add("open"); psi.ArgumentList.Add(dir); psi.UseShellExecute = false; Process.Start(psi); return; } catch (Exception) { } }
        }

        // ---------------- fallback window: a Chromium app window, else the default browser ----------------
        public static Process OpenBrowser(string url, string dataDir)
        {
            string[] names = new string[] { "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "brave-browser", "microsoft-edge", "microsoft-edge-stable", "vivaldi-stable" };
            foreach (string n in names)
            {
                string exe = OnPath(n); if (exe == null) continue;
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo(exe);
                    psi.ArgumentList.Add("--app=" + url);
                    psi.ArgumentList.Add("--user-data-dir=" + dataDir);
                    psi.ArgumentList.Add("--window-size=1600,960");
                    psi.ArgumentList.Add("--no-first-run");
                    psi.ArgumentList.Add("--no-default-browser-check");
                    psi.ArgumentList.Add("--disable-features=Translate");
                    psi.ArgumentList.Add("--ozone-platform-hint=auto");
                    psi.UseShellExecute = false;
                    return Process.Start(psi);
                }
                catch (Exception) { }
            }
            string x = OnPath("xdg-open");
            if (x != null) { try { ProcessStartInfo psi = new ProcessStartInfo(x); psi.ArgumentList.Add(url); psi.UseShellExecute = false; return Process.Start(psi); } catch (Exception) { } }
            return null;
        }

        public static void Message(string title, string text)
        {
            string z = OnPath("zenity");
            if (z != null)
            {
                try { ProcessStartInfo psi = new ProcessStartInfo(z); psi.ArgumentList.Add("--error"); psi.ArgumentList.Add("--title=" + title); psi.ArgumentList.Add("--text=" + text); psi.UseShellExecute = false; Process.Start(psi); return; } catch (Exception) { }
            }
            string k = OnPath("kdialog");
            if (k != null)
            {
                try { ProcessStartInfo psi = new ProcessStartInfo(k); psi.ArgumentList.Add("--title"); psi.ArgumentList.Add(title); psi.ArgumentList.Add("--error"); psi.ArgumentList.Add(text); psi.UseShellExecute = false; Process.Start(psi); return; } catch (Exception) { }
            }
            Console.Error.WriteLine(title + ": " + text);
        }
    }
}
