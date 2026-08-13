#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENDOR_DIR="${URUX_VENDOR_DIR:-$ROOT/.vendor}"
SRC_DIR="$VENDOR_DIR/celestia"
BUILD_DIR="${URUX_CELESTIA_BUILD_DIR:-$ROOT/.build/celestia}"
INSTALL_DIR="${URUX_CELESTIA_INSTALL_DIR:-$ROOT/.local/celestia}"
CELESTIA_REPO="https://github.com/CelestiaProject/Celestia.git"
CELESTIA_COMMIT="84153ded046fbea46c9f411dd0232e5426373ead"

mkdir -p "$VENDOR_DIR" "$BUILD_DIR" "$INSTALL_DIR"

if [[ ! -d "$SRC_DIR/.git" ]]; then
  git clone --filter=blob:none "$CELESTIA_REPO" "$SRC_DIR"
fi

git -C "$SRC_DIR" fetch --depth=1 origin "$CELESTIA_COMMIT"
git -C "$SRC_DIR" checkout --detach "$CELESTIA_COMMIT"
git -C "$SRC_DIR" submodule update --init --recursive

SPICE="${URUX_CELESTIA_ENABLE_SPICE:-OFF}"
FFMPEG="${URUX_CELESTIA_ENABLE_FFMPEG:-OFF}"
LIBAVIF="${URUX_CELESTIA_ENABLE_LIBAVIF:-OFF}"
MINIAUDIO="${URUX_CELESTIA_ENABLE_MINIAUDIO:-OFF}"
MESHOPT="${URUX_CELESTIA_USE_MESHOPTIMIZER:-OFF}"

cmake -S "$ROOT/scientific/celestia/bridge" -B "$BUILD_DIR" \
  -DCELESTIA_SOURCE_DIR="$SRC_DIR" \
  -DURUX_CELESTIA_ENABLE_SPICE="$SPICE" \
  -DURUX_CELESTIA_ENABLE_FFMPEG="$FFMPEG" \
  -DURUX_CELESTIA_ENABLE_LIBAVIF="$LIBAVIF" \
  -DURUX_CELESTIA_ENABLE_MINIAUDIO="$MINIAUDIO" \
  -DURUX_CELESTIA_USE_MESHOPTIMIZER="$MESHOPT" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$INSTALL_DIR"

cmake --build "$BUILD_DIR" --parallel
cmake --install "$BUILD_DIR"

BRIDGE="$INSTALL_DIR/bin/urux-celestia-bridge"
if [[ ! -x "$BRIDGE" ]]; then
  echo "Celestia bridge was not produced" >&2
  exit 3
fi

mkdir -p "$ROOT/assets/astronomy"
"$BRIDGE" constants > "$ROOT/assets/astronomy/celestia-constants.json"
cat > "$ROOT/assets/astronomy/celestia-manifest.json" <<JSON
{
  "source": "CelestiaProject/Celestia",
  "commit": "$CELESTIA_COMMIT",
  "version": "1.7.0",
  "literalSharedLibrary": true,
  "bridge": "urux-celestia-bridge",
  "components": ["cel3ds","celastro","celengine","celephem","celestia","celimage","celmath","celmodel","celrender","celscript","celttf","celutil","tools"],
  "features": {
    "CELX": true,
    "SPICE": "$SPICE",
    "FFMPEG": "$FFMPEG",
    "LIBAVIF": "$LIBAVIF",
    "MINIAUDIO": "$MINIAUDIO",
    "MESHOPTIMIZER": "$MESHOPT"
  }
}
JSON

echo "Celestia literal integration ready: $INSTALL_DIR"
echo "Bridge: $BRIDGE"
