#!/usr/bin/env bash
# Builds the small native window (GTK3 + WebKit2GTK) into the folder given as the first argument.
# Called by the .NET build automatically (see MloCreator.csproj), and by build.sh.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$HERE}"
mkdir -p "$OUT"
if ! command -v pkg-config >/dev/null 2>&1; then
    echo "mlo-shell: pkg-config is missing; install it with your package manager." >&2
    exit 1
fi
if ! pkg-config --exists gtk+-3.0; then
    echo "mlo-shell: GTK 3 development files are missing (Arch: gtk3; Debian/Ubuntu: libgtk-3-dev)." >&2
    exit 1
fi
if ! pkg-config --exists webkit2gtk-4.1 && ! pkg-config --exists webkit2gtk-4.0; then
    echo "mlo-shell: WebKit2GTK development files are missing (Arch: webkit2gtk-4.1; Debian/Ubuntu: libwebkit2gtk-4.1-dev)." >&2
    exit 1
fi
WEBKIT_PC="webkit2gtk-4.1"
if ! pkg-config --exists webkit2gtk-4.1; then WEBKIT_PC="webkit2gtk-4.0"; fi
CC="${CC:-cc}"
"$CC" -O2 -Wall -Wextra -Wno-unused-parameter -o "$OUT/mlo-shell" "$HERE/mlo-shell.c" \
    $(pkg-config --cflags "gtk+-3.0" "$WEBKIT_PC") \
    $(pkg-config --libs "gtk+-3.0" "$WEBKIT_PC")
echo "mlo-shell -> $OUT/mlo-shell"
