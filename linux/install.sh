#!/usr/bin/env bash
# Installs MLO Creator into the user's home:
#   ~/.local/share/mlo-creator/       the program
#   ~/.local/bin/mlo-creator          a launcher
#   ~/.local/share/applications/      a desktop entry (KDE/GNOME application menu)
#   ~/.local/share/icons/...          the icon
# Nothing needs root. Run it from the source tree (uses dist/MloCreator, or builds it) or from the
# unpacked release folder (next to MloCreator).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
DEST="${DEST:-$HOME/.local/share/mlo-creator}"
BIN="${BIN:-$HOME/.local/bin}"
APPS="${APPS:-$HOME/.local/share/applications}"
ICONS="${ICONS:-$HOME/.local/share/icons/hicolor/256x256/apps}"

SRC=""
if [ -x "$HERE/MloCreator" ] && [ -f "$HERE/ui/index.html" ]; then
    SRC="$HERE"                       # running from an unpacked release
elif [ -x "$HERE/dist/MloCreator/MloCreator" ]; then
    SRC="$HERE/dist/MloCreator"
else
    "$HERE/package.sh"
    SRC="$HERE/dist/MloCreator"
fi
if [ ! -x "$SRC/MloCreator" ]; then echo "the program was not found in $SRC" >&2; exit 1; fi

echo "installing $SRC -> $DEST"
mkdir -p "$DEST"
cp -a "$SRC/." "$DEST/"
mkdir -p "$DEST/projects" "$DEST/output"

mkdir -p "$BIN" "$APPS" "$ICONS"
ln -sfn "$DEST/MloCreator" "$BIN/mlo-creator"
if [ -f "$DEST/ui/logo.png" ]; then cp -f "$DEST/ui/logo.png" "$ICONS/mlo-creator.png"; fi
if [ -f "$DEST/mlo-creator.desktop" ]; then
    cp -f "$DEST/mlo-creator.desktop" "$APPS/mlo-creator.desktop"
elif [ -f "$HERE/desktop/mlo-creator.desktop" ]; then
    cp -f "$HERE/desktop/mlo-creator.desktop" "$APPS/mlo-creator.desktop"
fi
if command -v update-desktop-database >/dev/null 2>&1; then update-desktop-database "$APPS" >/dev/null 2>&1 || true; fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then gtk-update-icon-cache -f -t "$(dirname "$(dirname "$ICONS")")" >/dev/null 2>&1 || true; fi

echo
echo "installed."
echo "  start it from the application menu as \"MLO Creator\", or run: $BIN/mlo-creator"
echo "  the program keeps projects next to itself ($DEST/projects) because that folder is writable;"
echo "  to keep them somewhere else use: mlo-creator --root DIR"
