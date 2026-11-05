# MLO Creator — Linux

A complete native Linux port of MLO Creator, the program in the source tree's [`source/`](../source) folder
that builds FiveM interiors (MLOs) inside an existing GTA V building. The editor is the same HTML/WebGL
page; the host is the same C# program, ported to modern .NET, and the Windows-only parts (WebView2,
WinForms, `System.Drawing`, the registry, `System.Web.Script.Serialization`, CodeWalker's Windows path
handling) are replaced by native Linux equivalents. It runs under **both X11 and Wayland**.

> The links to `../source/...` in this file point at the original Windows source tree. In the packaged
> folder the same information is in `README-Windows.md` and `docs/HOW-IT-WORKS.md`.

It is not a Wine wrapper: there is no `MloCreator.exe`, no WebView2 runtime and no Windows API.

![X11](docs/screenshots/x11.png)

*The real project (`projects/My Interior.mlo.json`) opened under X11: the imported Paleto house, the
checklist, the tools and the 3D view.*

![Native file dialog](docs/screenshots/file-dialog.png)

*The native GTK file chooser (or the desktop portal's own dialog) used to import model files; the same
dialog is used for folders.*

![Wayland](docs/screenshots/wayland.png)

*The same view under Wayland (KDE). The window is a normal GTK window, not a browser.*

## What works

Everything in [`../source/docs/HOW-IT-WORKS.md`](../source/docs/HOW-IT-WORKS.md) that does not need the
game running. Verified on Linux with the local GTA V install:

- **Import** `.ydr`, `.ytd`, `.ybn` and `.ymap` files, through the native GTK file dialog, a path, or
  drag & drop; the models, textures, collision and entities are read with CodeWalker.Core.
- **Cutting** the model (XML round-trip through CodeWalker) and the collision, deleting faces/parts,
  filling holes, clearing the model and the collision out of the rooms.
- **Export** a complete resource: `fxmanifest.lua`, `client/ipl.lua`, `README.md`, `<prefix>_int.ydr`,
  `_glass.ydr`, `_mlo.ybn`, `_tex.ytd`, `_types.ytyp`, `_milo_.ymap`, `_manifest_<prefix>.ymf`, the cut
  building `.ydr`/`.ybn` files, window and door parts from `.glb` models, and the door props with their
  collision and door flags. Every file re-opens with CodeWalker.
- **Window and door models** from `.glb` files (the three bundled ones and your own), including their
  textures, the frame opening, double doors and the door physics/collision.
- **Game lookups** from your own GTA V install: the building's entity, collision files, detail model
  placements, props and plants, and the "grab a vanilla house" workflow with its debug picture.
- **Projects** (open, save, save as, rename, duplicate, delete, thumbnails), the checklist, the walk
  check, the whole editor UI, WebGL 2.0.

The port was tested with a real project (the Paleto house with 1.2 MB model, 40+ collision files,
3 openings and 6 deleted faces): the export completed and the generated files were loaded again with
CodeWalker (MLO with 2 rooms and 3 portals, 2 textures, the cut model and the cut collision).

Still to be seen in the game: streaming, lighting, portals, collision and door behaviour. That is true
of the Windows version as well; the program cannot test the game for you.

## Requirements

- 64-bit Linux with a desktop (X11 or Wayland).
- **GTK 3** and **WebKit2GTK 4.1** (the window and the editor view).
- **.NET 9** to build and to run the framework-dependent build. The packaged self-contained build
  includes the runtime and needs no .NET installation.
- A copy of **GTA V (Legacy edition)**, and CodeWalker to extract the game files you want to edit, as
  described in the [Windows README](../source/README.md). The lookups read your install directly; the
  files you edit are the ones you import.

Install the build dependencies:

```bash
# Arch / CachyOS / Manjaro
sudo pacman -S dotnet-sdk gtk3 webkit2gtk-4.1 pkgconf

# Debian / Ubuntu (24.04+)
sudo apt install dotnet-sdk-9.0 libgtk-3-dev libwebkit2gtk-4.1-dev pkg-config

# Fedora
sudo dnf install dotnet-sdk-9.0 gtk3-devel webkit2gtk4.1-devel pkgconf
```

The runtime libraries alone are enough for the packaged build: `gtk3` and `webkit2gtk-4.1` on Arch,
`libgtk-3-0` and `libwebkit2gtk-4.1-0` on Debian/Ubuntu.

## Build and run

```bash
cd linux
./build.sh          # .NET host + the native window (native/mlo-shell.c)
./run.sh            # start it
```

`run.sh` builds first when the output is missing, then starts the program. It takes the same arguments
as the Windows program (`--port`, `--browser`, `--devtools`, `--no-window`, `--start`, `--grab`, ...).

Make a self-contained folder and zip that runs without .NET:

```bash
./package.sh        # -> dist/MloCreator/ and dist/MloCreator-linux-x64.zip
./install.sh        # install into ~/.local (application menu entry, ~/.local/bin/mlo-creator)
```

`install.sh` copies the program to `~/.local/share/mlo-creator`, creates
`~/.local/bin/mlo-creator`, adds `mlo-creator.desktop` and the icon, and runs
`update-desktop-database`. It needs no root.

### Where the program keeps its files

As on Windows, projects, cache, exports and `settings.json` live next to the program when that folder is
writable (the portable behaviour, and what the existing `projects/` and `output/` here use). When the
program is installed in a read-only place (`/opt`, a package), it falls back to
`$XDG_DATA_HOME/MloCreator` (`~/.local/share/MloCreator`). Use `--root DIR` to choose explicitly.

`settings.json` and the `GTA5_PATH` environment variable still set `gtaPath` and `outDir`. The port also
understands the Wine paths the old build wrote (`Z:\home\leo\...`), converts them to `/home/leo/...` on
load, and detects the game in the usual Linux Steam libraries by itself (native Steam, Flatpak Steam,
`libraryfolders.vdf`, plus `~/Games`/`~/Desktop`). The **Legacy edition** folder is the one to point at
(the one with `GTA5.exe`).

## How the port is built

| Windows | Linux |
|---|---|
| WinForms + Microsoft WebView2 window (`AppWindow.cs`) | `native/mlo-shell.c`: a small GTK 3 window with a WebKit2GTK view. It is a separate process with its own main loop; the .NET host starts it and waits for it, like the old WebView2 path. The same binary is the GTK file/folder picker (`--pick-files`, `--pick-folder`). |
| .NET Framework 4.8 + `csc.exe` | .NET 9 SDK project (`src/MloCreator.csproj`), `dotnet build` / `dotnet publish`. |
| CodeWalker DLLs from a Windows build | `CodeWalker.Core` 1.0.3 from NuGet (the same library, `netstandard2.0`) + SharpDX mathematics. The RPF/`ydr`/`ybn`/`ytd`/`ytyp`/`ymap` code is unchanged. |
| `GTA5Keys.LoadFromPath` (builds `path + "\gta5.exe"`) | `src/GameKeys.cs`: reads `GTA5.exe` itself, finds the AES key with `GenerateV2`, then unlocks CodeWalker's NG keys/hash LUT with its `UseMagicData` step. |
| `System.Web.Script.Serialization.JavaScriptSerializer` | `src/Compat/Json.cs`: a drop-in class with the same shape (`Dictionary<string,object>`, `List<object>`, ...) on `System.Text.Json`. |
| `System.Drawing` (GDI+) for `.glb` textures and the house-fit debug PNG | `StbImageSharp` decodes PNG/JPEG; `src/Compat/ImageUtil.cs` scales to the game's power-of-two square, and writes the 720×720 debug PNG with a small built-in PNG encoder. |
| WinForms `OpenFileDialog` / `FolderBrowserDialog` | the GTK native file chooser (`GtkFileChooserNative`, so the desktop portal is used when there is one), with `zenity`/`kdialog` fallbacks. |
| `explorer.exe`, registry, `LOCALAPPDATA`, Edge/Chrome paths | `xdg-open`, Steam library discovery, `~/.local/share`, and a Chromium/Chrome/Brave/Edge app window (or the default browser) as the `--browser` fallback. |
| Serve the editor from `ui\` with backslashes | the same server, with `/` path handling and a traversal check. |

The editor in [`../source/ui`](../source/ui) is **shared**, not copied into this folder: the csproj copies
it into the build/publish output. Changes to the page still only need a reload; changes to the C# need a
rebuild.

The X11/Wayland choice is made by GTK. Set `GDK_BACKEND=x11` or `GDK_BACKEND=wayland` to force one (the
port logs which backend it used in `logs/window.log`).

### The native window

`native/mlo-shell.c` (about 400 lines) does:

- one 1600×960 GTK window, title `MLO Creator`, window icon from `ui/logo.png`, size memory in
  `cache/window/window.txt`;
- WebKit settings: WebGL on, hardware acceleration, console messages to stdout, clipboard access for the
  "Copy details"/"Copy ensure" buttons, no browser context menu, no page zoom/reload/back-forward keys
  (F12 opens the inspector only with `--devtools`);
- it refuses navigation away from the editor (a file dropped on the page cannot replace it) and blocks
  new windows;
- on close it asks the page to save (`MLO.Model.save()`), gives it a moment, then closes; the host also
  waits for a running export to finish before exiting, so a closed window cannot leave a half-written
  resource folder;
- it exits if the host process disappears (`--parent`).

### Developer hooks

The window program has three hooks used while porting and for automated checks:

```bash
mlo-shell --url URL --eval-file script.js [--eval-exit]   # run a JS body in the page, print MLO_EVAL_RESULT
mlo-shell --url URL --screenshot out.png [--screenshot-exit]  # save the window contents (X11)
mlo-shell --url URL --close-after 12                      # close the window as the user would (testing)
mlo-shell --url URL --devtools                            # WebKit inspector (F12)
```

The host has `--debug-api` (writes the last `/api/export` request to `logs/export-payload.json`) and
`--no-window` (server only, for curl/automation). `--dev` fixes the API token to `dev`.

## Verification done

- `dotnet build` and the native shell build cleanly on .NET 9 / GTK 3.24 / WebKitGTK 2.54.
- The editor loads in WebKitGTK with **WebGL 2.0** (checked with an in-page probe), on Wayland and on
  X11 (`GDK_BACKEND=x11`, XWayland): both windows render the UI and the imported model
  (screenshots above).
- Opening `projects/My Interior.mlo.json`: 3 imported `.ydr` files, 16 textures, 3 openings, 6 deleted
  faces; the UI meshes 26 interior triangles and draws the 7,415-triangle building.
- Exporting that project from the UI: the resource is written to `output/mlo_paleto` (interior `.ydr`,
  glass/tex `.ytd`, collision `.ybn`, `_types.ytyp` with 2 rooms and 3 portals, `_milo_.ymap`, manifest,
  the cut 1.2 MB building `.ydr`, `cs1_07_9.ybn` and `hi@cs1_07_7.ybn`), and every file was loaded again
  with CodeWalker. The cut model and collision contain the expected changed/removed/added counts.
- Window/door/frame export from the three bundled `.glb` files: 2 window parts baked, the door written as
  a prop with a box collision and door flags, 8 textures; all files re-open with CodeWalker.
- Game lookups on the local GTA V install: the building entity in `cs1_07_strm_0.ymap`, 86 collision
  files with polygon counts, the detail-model placements, 52 plants / 95 props around the building, and
  the full `--grab` house fit (frame, outline, door) with the debug PNG.
- `--no-window` API runs for import, cut preview, collision preview, export and all game lookups.

## Troubleshooting

**A blank white or black window.** WebKitGTK's GPU path can fail on some drivers (especially in a VM or
a remote session). Try:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./run.sh
WEBKIT_DISABLE_COMPOSITING_MODE=1 ./run.sh      # slower, software compositing
LIBGL_ALWAYS_SOFTWARE=1 ./run.sh                # software WebGL
```

The port logs the reason to `logs/window.log`. `./run.sh --browser` opens the same editor in a Chromium
or Chrome app window (or the default browser) if WebKitGTK cannot start; the native file dialogs still
work through `zenity`/`kdialog` if installed.

**No window at all.** Check `logs/window.log` for "the native window (mlo-shell) is not there"; build it
with `./build.sh` or `bash native/build-shell.sh <folder>`. Check that the display is reachable
(`DISPLAY` or `WAYLAND_DISPLAY`).

**The game is not found.** Put the folder in `settings.json` as `"gtaPath"`, or set `GTA5_PATH`. The
program looks for `GTA5.exe` (Legacy). The Enhanced edition is not supported by this CodeWalker version;
point it at the Legacy install.

**The file dialog does not open.** The native picker needs GTK; if it is missing, install `zenity` or
`kdialog` as a fallback. On a minimal Wayland session without the desktop portal, GTK shows its own
dialog.

**Clipboard buttons do nothing.** WebKit asks for clipboard permission; the window allows it. On a very
old WebKitGTK (before 2.40) the Clipboard API may be disabled; the text is still shown in the error
details.

**Logs.** `logs/window.log` (window start, backend, WebKit messages, exit code), `logs/errors.log` (what
the page reports), and the terminal output when run from a shell.

## Limits

- The Windows build is untouched in [`../source`](../source); this is a parallel tree. The shared `ui/`
  is the canonical editor.
- Everything that needs the game running (streaming, lights, portals, doors) still has to be tested in
  game, exactly as the Windows version says.
- The Enhanced edition, and a GTA V installed through a non-Steam launcher that is not in a Steam
  library, need `gtaPath` set by hand.
- `.glb` textures are decoded by StbImageSharp; unusual image formats inside a `.glb` fall back to the
  material colour, like a GTA texture that the files do not contain.
- The native window is GTK 3 (the installed `webkit2gtk-4.1` is a GTK 3 library). A GTK 4/WebKit 6.0
  variant would be a separate shell; the host and the editor would not change.

## Layout

| Path | Content |
|---|---|
| `src/Program.cs` | local server, routes, settings, game detection, window start |
| `src/AppWindow.cs` | starts the native window and the fallback browser |
| `src/Linux.cs` | Linux paths, Steam/GTA detection, GTK dialogs, `xdg-open`, browser fallback |
| `src/GameKeys.cs` | CodeWalker keys from `GTA5.exe` on Linux |
| `src/ImportHost.cs`, `ModelCut.cs`, `CollisionCut.cs` | import, cutting (unchanged logic) |
| `src/Vanilla.cs`, `HouseFit.cs`, `Patcher.cs` | game file lookups and the vanilla house workflow |
| `src/Exporter.cs`, `FitExport.cs` | the resource and the door/window props |
| `src/GlbModels.cs`, `Dds.cs` | `.glb` reading and DDS writing |
| `src/Compat/Json.cs`, `Compat/ImageUtil.cs` | `JavaScriptSerializer` and `System.Drawing` replacements |
| `native/mlo-shell.c` | the GTK 3 + WebKit2GTK window and the file dialogs |
| `desktop/mlo-creator.desktop` | the application-menu entry |
| `build.sh`, `run.sh`, `package.sh`, `install.sh` | build, run, package (self-contained + zip) and install |

## Credits and licences

MLO Creator's own code is MIT ([`../source/LICENSE`](../source/LICENSE)). The Linux port adds:

- **StbImageSharp** (public domain) for decoding the pictures in `.glb` files.
- **GTK 3** (LGPL-2.1) and **WebKitGTK** (LGPL-2.1 / BSD) — system libraries, not redistributed in the
  source tree. The self-contained package links them at run time.
- **.NET 9** (MIT) — the self-contained package includes the runtime.
- **CodeWalker.Core** (the same CodeWalker library the Windows build uses; see the repository's
  `THIRD-PARTY-NOTICES.md`) and **SharpDX** mathematics (MIT).

The three models in `models/` keep their own licences (one is non-commercial); see
[`../source/models/CREDITS.txt`](../source/models/CREDITS.txt) and
[`../source/THIRD-PARTY-NOTICES.md`](../source/THIRD-PARTY-NOTICES.md). GTA V and its assets belong to
Rockstar Games; this project ships none of them.
