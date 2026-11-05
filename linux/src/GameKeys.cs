// Game keys on Linux. CodeWalker's GTA5Keys.LoadFromPath builds its file names with a hard-coded backslash
// ("gta5.exe"), which is not a separator on Linux, so it is replaced here by the same two steps done explicitly:
// find the AES key in the game's exe, then unlock CodeWalker's copy of the newer (NG) keys with it.
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using CodeWalker.GameFiles;

namespace MloCreator
{
    public static class GameKeys
    {
        static readonly object gate = new object();
        static readonly HashSet<string> done = new HashSet<string>(StringComparer.Ordinal);

        // the exe of the installed game: the legacy one, else the Enhanced one
        public static string ExePath(string gta)
        {
            if (string.IsNullOrWhiteSpace(gta) || !Directory.Exists(gta)) return null;
            string legacy = Path.Combine(gta, "GTA5.exe");
            if (File.Exists(legacy)) return legacy;
            string enhanced = Path.Combine(gta, "GTA5_Enhanced.exe");
            if (File.Exists(enhanced)) return enhanced;
            return null;
        }

        public static bool IsEnhanced(string gta)
        {
            return !File.Exists(Path.Combine(gta, "GTA5.exe")) && File.Exists(Path.Combine(gta, "GTA5_Enhanced.exe"));
        }

        public static bool Loaded { get { return GTA5Keys.PC_AES_KEY != null && GTA5Keys.PC_NG_KEYS != null && GTA5Keys.PC_LUT != null; } }

        public static void Load(string gta)
        {
            if (string.IsNullOrWhiteSpace(gta) || !Directory.Exists(gta))
                throw new Exception("GTA V was not found" + (string.IsNullOrEmpty(gta) ? "" : " in \"" + gta + "\"") + ". Put its folder in settings.json next to the program as \"gtaPath\" (or set the GTA5_PATH environment variable).");
            string exe = ExePath(gta);
            if (exe == null) throw new Exception("GTA V was not found in \"" + gta + "\": neither GTA5.exe nor GTA5_Enhanced.exe is there.");
            lock (gate)
            {
                if (done.Contains(gta) && Loaded) return;
                byte[] data = File.ReadAllBytes(exe);
                GTA5Keys.GenerateV2(data, delegate (string s) { });
                if (GTA5Keys.PC_AES_KEY == null || GTA5Keys.PC_AES_KEY.Length != 32)
                    throw new Exception("The AES key could not be found in " + Path.GetFileName(exe) + ". Is this a complete GTA V installation?");
                // Unlock the NG keys, the hash LUT and the AWC key that CodeWalker ships (its "magic" data). The private
                // UseMagicData is the part of CodeWalker that does this; passing the key makes it skip its Windows-only
                // path handling. (The same data and the same AES step are what LoadFromPath calls on Windows.)
                MethodInfo mi = typeof(GTA5Keys).GetMethod("UseMagicData", BindingFlags.NonPublic | BindingFlags.Static);
                if (mi == null) throw new Exception("This CodeWalker.Core build cannot unlock the game keys (UseMagicData is missing).");
                try { mi.Invoke(null, new object[] { gta, Convert.ToBase64String(GTA5Keys.PC_AES_KEY) }); }
                catch (TargetInvocationException tie) { throw new Exception("The game keys could not be unlocked: " + (tie.InnerException == null ? tie.Message : tie.InnerException.Message), tie.InnerException ?? tie); }
                if (!Loaded) throw new Exception("The game keys could not be unlocked from " + Path.GetFileName(exe) + ".");
                done.Add(gta);
            }
        }
    }
}
