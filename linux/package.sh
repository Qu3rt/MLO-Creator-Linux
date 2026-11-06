#!/usr/bin/env bash
# Makes a self-contained Linux folder (and a zip) that runs without a .NET installation:
#   dist/MloCreator/MloCreator        the program (bundles the .NET runtime)
#   dist/MloCreator/mlo-shell         the native GTK/WebKitGTK window
#   dist/MloCreator/ui, models, docs  the editor, the bundled models and the documentation
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
CONFIG="${CONFIG:-Release}"
DIST="$HERE/dist/MloCreator"
ZIP="$HERE/dist/MloCreator-linux-x64.zip"
RID="${RID:-linux-x64}"

find_dotnet() {
    if [ -n "${DOTNET:-}" ] && [ -x "$DOTNET" ]; then echo "$DOTNET"; return; fi
    if command -v dotnet >/dev/null 2>&1; then command -v dotnet; return; fi
    for c in "$ROOT/.toolchain/dotnet/dotnet" "$HOME/.dotnet/dotnet"; do
        if [ -x "$c" ]; then echo "$c"; return; fi
    done
    return 1
}
DOTNET_BIN="$(find_dotnet || true)"
if [ -z "$DOTNET_BIN" ]; then echo "The .NET 9 SDK was not found (set DOTNET=/path/to/dotnet)." >&2; exit 1; fi
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-$ROOT/.dotnet-home}"
export NUGET_PACKAGES="${NUGET_PACKAGES:-$ROOT/.nuget}"
export NUGET_HTTP_CACHE_PATH="${NUGET_HTTP_CACHE_PATH:-$ROOT/.nuget-http}"
mkdir -p "$DOTNET_CLI_HOME" "$NUGET_PACKAGES" "$NUGET_HTTP_CACHE_PATH"

# Never wipe a folder that holds the user's projects or exports.
if [ -d "$DIST/projects" ] && find "$DIST/projects" -maxdepth 1 -name '*.mlo.json' -print -quit | grep -q .; then
    echo "refusing to replace $DIST: it contains projects. Move them out of the package folder first." >&2
    exit 1
fi
if [ -d "$DIST/output" ] && [ -n "$(find "$DIST/output" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
    echo "refusing to replace $DIST: it contains exports. Move them out of the package folder first." >&2
    exit 1
fi
rm -rf "$DIST" "$ZIP"
mkdir -p "$DIST"
echo "publishing $RID (self-contained)..."
"$DOTNET_BIN" publish "$HERE/src/MloCreator.csproj" \
    -c "$CONFIG" -r "$RID" --self-contained true \
    -p:PublishSingleFile=false -p:DebugType=none -o "$DIST" -v minimal

# the native window is built into the publish folder by the csproj; check it is there
if [ ! -x "$DIST/mlo-shell" ]; then
    echo "mlo-shell was not built into $DIST; building it now" >&2
    bash "$HERE/native/build-shell.sh" "$DIST"
fi
if [ ! -f "$DIST/ui/index.html" ] || [ ! -f "$DIST/models/door_frame.glb" ] || \
   [ ! -f "$DIST/ui/runtime/garage-client.lua" ] || [ ! -f "$DIST/models/garage_up_and_over.glb" ] || \
   [ ! -f "$DIST/ui/tex/smdz_floor_001_oak_wide_natural.png" ]; then
    echo "the editor files, the texture library or the bundled models are missing from $DIST" >&2
    exit 1
fi

# documentation and licences
mkdir -p "$DIST/docs" "$DIST/projects" "$DIST/output"
cp "$HERE/docs/HOW-IT-WORKS.md" "$DIST/docs/"
cp "$HERE/docs/MODIFIED-BUILD.md" "$DIST/docs/"
mkdir -p "$DIST/docs/screenshots"
cp -f "$HERE/docs/screenshots/"*.png "$DIST/docs/screenshots/"
cp "$ROOT/README.md" "$DIST/README-Windows.md"
cp "$HERE/README.md" "$DIST/README.md"
cp "$ROOT/source/LICENSE" "$DIST/LICENSE"
cp "$ROOT/THIRD-PARTY-NOTICES.md" "$DIST/THIRD-PARTY-NOTICES.md"
cp "$HERE/desktop/mlo-creator.desktop" "$DIST/"
cp "$HERE/install.sh" "$DIST/install.sh"
chmod +x "$DIST/install.sh" "$DIST/MloCreator" 2>/dev/null || true

# a zip with forward slashes and the folder at the top
echo "zipping..."
( cd "$HERE/dist" && rm -f "$(basename "$ZIP")" && zip -qr "$(basename "$ZIP")" "MloCreator" )
MB=$(du -sm "$DIST" | cut -f1)
echo
echo "packaged $MB MB -> $DIST"
echo "zip:      $ZIP"
echo "run:      $DIST/MloCreator"
echo "install:  $DIST/install.sh   (or $HERE/install.sh)"
