// The program's own window on Linux: it starts the small native shell (native/mlo-shell.c: GTK3 + WebKit2GTK,
// one window, no browser tabs) and waits until it is closed. The page still talks to the local server of this
// program. The shell is a separate program on purpose: GTK wants its own main loop, and the host is a server.
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace MloCreator
{
    public static class AppWindow
    {
        public static bool Available { get { return Linux.ShellPath() != null; } }

        // opens the window and returns its exit code when it is closed (0 = closed normally, 3 = no display)
        public static int Run(string url, string appDataDir, bool devTools)
        {
            string shell = Linux.ShellPath();
            if (shell == null) throw new Exception("the window program (mlo-shell) was not found next to the program");
            Directory.CreateDirectory(appDataDir);
            ProcessStartInfo psi = new ProcessStartInfo(shell);
            psi.ArgumentList.Add("--url"); psi.ArgumentList.Add(url);
            psi.ArgumentList.Add("--data"); psi.ArgumentList.Add(appDataDir);
            string icon = Path.Combine(Linux.AppDir ?? "", "ui", "logo.png");
            if (File.Exists(icon)) { psi.ArgumentList.Add("--icon"); psi.ArgumentList.Add(icon); }
            psi.ArgumentList.Add("--parent"); psi.ArgumentList.Add(Environment.ProcessId.ToString());
            if (devTools) psi.ArgumentList.Add("--devtools");
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            using (Process p = Process.Start(psi))
            {
                if (p == null) throw new Exception("the window program (" + shell + ") could not be started");
                p.OutputDataReceived += delegate (object s, DataReceivedEventArgs e) { LogLine(e.Data); };
                p.ErrorDataReceived += delegate (object s, DataReceivedEventArgs e) { LogLine(e.Data); };
                p.BeginOutputReadLine();
                p.BeginErrorReadLine();
                p.WaitForExit();
                Program.LogWindow("window process exited with code " + p.ExitCode);
                return p.ExitCode;
            }
        }
        // The shell and its WebKit processes also print driver/environment warnings that are not the program's
        // business (a sandbox without dconf, Mesa probing a GPU it cannot open). Keep the log to what matters.
        static void LogLine(string line)
        {
            if (string.IsNullOrEmpty(line)) return;
            if (line.Contains("dconf-CRITICAL") || line.Contains("MESA") || line.Contains("amdgpu") ||
                line.Contains("failed to load driver") || line.Contains("appmenu-gtk-module") || line.StartsWith("Gtk-Message", StringComparison.Ordinal)) return;
            Program.LogWindow("webview: " + line);
        }
    }
}
