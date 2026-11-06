// Up-and-over garages: separate script-controlled objects, never fixed MLO children.
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
namespace MloCreator
{
    public static partial class Exporter
    {
        class GarageInfo { public string Model; public double X, Y, Z, Heading, W, H, D, Clearance; }
        static string GarageRuntime(string name)
        {
            return Path.Combine(Path.GetDirectoryName(typeof(Exporter).Assembly.Location), "ui", "runtime", name);
        }
        static bool GarageNumber(Dictionary<string, object> d, string key, double min, double max, double fallback)
        {
            double n = J.D(J.G(d, key), fallback);
            return !double.IsNaN(n) && !double.IsInfinity(n) && n >= min && n <= max;
        }
        static void ValidateGarages(List<Dictionary<string, object>> interiors)
        {
            int count = 0;
            foreach (Dictionary<string, object> model in interiors)
            {
                Dictionary<string, object> fits = J.O(J.G(model, "fitted"));
                foreach (object obj in J.A(J.G(fits, "items")))
                {
                    Dictionary<string, object> d = J.O(obj);
                    if (J.S(J.G(d, "kind"), "") != "garage") continue;
                    count++;
                    if (!GarageNumber(d, "w", 1, 12, double.NaN) || !GarageNumber(d, "h", 1, 8, double.NaN) ||
                        !GarageNumber(d, "d", 0.02, 2, double.NaN) || !GarageNumber(d, "clearance", 0.05, 2, 0.15) ||
                        !GarageNumber(d, "cx", -100000, 100000, double.NaN) || !GarageNumber(d, "cy", -100000, 100000, double.NaN) ||
                        !GarageNumber(d, "zb", -10000, 10000, double.NaN) || !GarageNumber(d, "yaw", -1000, 1000, double.NaN))
                        throw new Exception("Invalid garage door dimensions, position or head clearance. Existing output has not been changed.");
                    string path = ImportHost.GlbPath(FitProject(J.S(J.G(fits, "project"), "")), J.S(J.G(d, "f"), ""));
                    if (path == null || !GlbFile.Load(path).Models.Exists(delegate(GlbModel m) { return m.Id == J.S(J.G(d, "m"), ""); }))
                        throw new Exception("A garage door model is unavailable. Restore its GLB file before exporting. Existing output has not been changed.");
                }
            }
            if (count > 0) foreach (string file in new string[] { "garage-client.lua", "garage-server.lua" })
                if (!File.Exists(GarageRuntime(file))) throw new Exception("Missing ui/runtime/" + file + ". Install the matching UI files alongside the updated executable. Existing output has not been changed.");
        }
        static string GarageArch(string name, string txd, V3 mn, V3 mx)
        {
            // Dynamic object and ambient scale; no hinged-door physics/special attribute.
            return DrawableArch(name, txd, 200, mn, mx).Replace("<flags value=\"0\" />", "<flags value=\"537001984\" />")
                .Replace("<physicsDictionary />", "<physicsDictionary>" + name + "</physicsDictionary>");
        }
        static List<GarageInfo> AllGarages(List<InteriorInfo> infos)
        {
            List<GarageInfo> result = new List<GarageInfo>();
            foreach (InteriorInfo info in infos) result.AddRange(info.Garages);
            return result;
        }
        static void WriteGarages(string dir, List<InteriorInfo> infos, StringBuilder manifest, List<string> files)
        {
            List<GarageInfo> doors = AllGarages(infos);
            if (doors.Count == 0) return; // no controller dependency for ordinary exports
            StringBuilder cfg = new StringBuilder("-- Public by default. Set ace to an ACE permission to restrict operation.\n-- Controller state resets closed on restart. bucket selects the routing bucket.\nMloGarageConfig = { bucket = 0, ace = '', durationMs = 4000, doors = {\n");
            foreach (GarageInfo d in doors)
                cfg.Append("    { model = '" + d.Model + "', x = " + F(d.X) + ", y = " + F(d.Y) + ", z = " + F(d.Z) + ", heading = " + F(d.Heading) +
                    ", width = " + F(d.W) + ", height = " + F(d.H) + ", depth = " + F(d.D) + ", clearance = " + F(d.Clearance) +
                    ", distance = " + F(Math.Max(4, Math.Max(d.W / 2 + 2, d.H + 1.5))) + " },\n");
            cfg.Append("} }\n");
            Directory.CreateDirectory(Path.Combine(dir, "server"));
            WriteText(Path.Combine(dir, "garage_config.lua"), cfg.ToString());
            WriteText(Path.Combine(dir, "client", "garages.lua"), File.ReadAllText(GarageRuntime("garage-client.lua")));
            WriteText(Path.Combine(dir, "server", "garages.lua"), File.ReadAllText(GarageRuntime("garage-server.lua")));
            manifest.Append("\ndependency '/onesync'\nshared_script 'garage_config.lua'\nclient_script 'client/garages.lua'\nserver_script 'server/garages.lua'\n");
            files.Add("garage_config.lua + client/server/garages.lua: " + doors.Count + " shared up-and-over garage door(s)");
        }
        static void AppendGarageReadme(List<InteriorInfo> infos, StringBuilder rd)
        {
            List<GarageInfo> doors = AllGarages(infos); if (doors.Count == 0) return;
            rd.Append("\n## Up-and-over garage doors\n\nRequires OneSync. Press E near a garage door to open or close it. The rigid panel rises and tips back opposite its front face, ending horizontally under the ceiling. Leave clear space behind the opening equal to the panel height, plus its head clearance. This is an up-and-over panel, not a sectional or rolling shutter.\n\nThe included controller synchronizes open/closed state, restores it for joining clients and moves the panel collision with it. Server-side proximity, routing-bucket and optional ACE checks protect toggle requests. People/vehicles in the movement area block operation; move clear and try again. Check vehicle clearance in-game before relying on this conservative obstruction check.\n\n`garage_config.lua` defaults to public use in routing bucket 0. Set `ace` to restrict access, for example `mlo.garage`, and grant that permission through your server's ACE configuration. Do not register these generated `gd` models with a second door controller. State is temporary and resets closed when the resource/server restarts.\n\nGenerated garage models:\n");
            foreach (GarageInfo d in doors) rd.Append("- `" + d.Model + "`: closed centre " + F(d.X) + ", " + F(d.Y) + ", " + F(d.Z) + ", heading " + F(d.Heading) + ".\n");
            rd.Append("\nAfter replacement, use a controlled restart and full client reconnect. Test from both sides, through the full movement, with vehicles and a second player, then leave/return and reconnect. Imported buildings still need their original wall faces and collision cleared behind the opening.\n");
        }
    }
}
