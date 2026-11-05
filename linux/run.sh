#!/usr/bin/env bash
# Builds (if needed) and runs MLO Creator on Linux.
# All arguments are passed to the program; see --help.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
CONFIG="${CONFIG:-Release}"
OUT="$HERE/src/bin/$CONFIG/net9.0"

find_dotnet() {
    if [ -n "${DOTNET:-}" ] && [ -x "$DOTNET" ]; then echo "$DOTNET"; return; fi
    if command -v dotnet >/dev/null 2>&1; then command -v dotnet; return; fi
    for c in "$ROOT/.toolchain/dotnet/dotnet" "$HOME/.dotnet/dotnet"; do
        if [ -x "$c" ]; then echo "$c"; return; fi
    done
    return 1
}

if [ ! -f "$OUT/MloCreator.dll" ] || [ ! -x "$OUT/mlo-shell" ]; then
    "$HERE/build.sh"
fi
DOTNET_BIN="$(find_dotnet || true)"
if [ -z "$DOTNET_BIN" ]; then echo "The .NET 9 runtime was not found." >&2; exit 1; fi
export DOTNET_ROOT="${DOTNET_ROOT:-$(dirname "$DOTNET_BIN")}"
mkdir -p "$ROOT/.dotnet-home"
export DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-$ROOT/.dotnet-home}"
exec "$DOTNET_BIN" "$OUT/MloCreator.dll" "$@"
