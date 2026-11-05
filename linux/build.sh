#!/usr/bin/env bash
# Builds the Linux port (the .NET host and the native GTK/WebKitGTK window).
#
# Requirements:
#   - the .NET 9 SDK (dotnet on PATH), or DOTNET=/path/to/dotnet
#   - GTK 3 and WebKit2GTK 4.1 development files (pkg-config must find them)
#     Arch:      sudo pacman -S dotnet-sdk gtk3 webkit2gtk-4.1 pkgconf
#     Debian:    sudo apt install dotnet-sdk-9.0 libgtk-3-dev libwebkit2gtk-4.1-dev pkg-config
#     Fedora:    sudo dnf install dotnet-sdk-9.0 gtk3-devel webkit2gtk4.1-devel pkgconf
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
CONFIG="${CONFIG:-Release}"

find_dotnet() {
    if [ -n "${DOTNET:-}" ] && [ -x "$DOTNET" ]; then echo "$DOTNET"; return; fi
    if command -v dotnet >/dev/null 2>&1; then command -v dotnet; return; fi
    # the SDK that this workspace was built with (not part of the source tree)
    for c in "$ROOT/.toolchain/dotnet/dotnet" "$HERE/../.toolchain/dotnet/dotnet" "$HOME/.dotnet/dotnet"; do
        if [ -x "$c" ]; then echo "$c"; return; fi
    done
    return 1
}
DOTNET_BIN="$(find_dotnet || true)"
if [ -z "$DOTNET_BIN" ]; then
    cat >&2 <<'EOF'
The .NET 9 SDK was not found.
Install it (Arch: sudo pacman -S dotnet-sdk; Debian/Ubuntu: sudo apt install dotnet-sdk-9.0)
or set DOTNET=/path/to/dotnet.
EOF
    exit 1
fi

export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_NOLOGO=1
export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
# keep NuGet and the CLI's state inside the checkout when the home directory is not writable
export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-$ROOT/.dotnet-home}"
export NUGET_PACKAGES="${NUGET_PACKAGES:-$ROOT/.nuget}"
export NUGET_HTTP_CACHE_PATH="${NUGET_HTTP_CACHE_PATH:-$ROOT/.nuget-http}"
mkdir -p "$DOTNET_CLI_HOME" "$NUGET_PACKAGES" "$NUGET_HTTP_CACHE_PATH"

echo "dotnet: $DOTNET_BIN"
echo "build:  $HERE/src/MloCreator.csproj ($CONFIG)"
"$DOTNET_BIN" build "$HERE/src/MloCreator.csproj" -c "$CONFIG" -v minimal "$@"
OUT="$HERE/src/bin/$CONFIG/net9.0"
echo
echo "built:  $OUT"
echo "run:    $HERE/run.sh"
