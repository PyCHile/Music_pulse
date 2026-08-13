#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENDOR_DIR="${URUX_VENDOR_DIR:-$ROOT/.vendor}"
SRC_DIR="$VENDOR_DIR/celestia"
BUILD_ROOT="${URUX_CELESTIA_BUILD_DIR:-$ROOT/.build/celestia}"
UPSTREAM_BUILD="$BUILD_ROOT/upstream"
BRIDGE_BUILD="$BUILD_ROOT/bridge"
INSTALL_DIR="${URUX_CELESTIA_INSTALL_DIR:-$ROOT/.local/celestia}"
CELESTIA_REPO="https://github.com/CelestiaProject/Celestia.git"
CELESTIA_COMMIT="84153ded046fbea46c9f411dd0232e5426373ead"

mkdir -p "$VENDOR_DIR" "$UPSTREAM_BUILD" "$BRIDGE_BUILD" "$INSTALL_DIR"

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

cmake -S "$SRC_DIR" -B "$UPSTREAM_BUILD" \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_CELX=ON \
  -DENABLE_TOOLS=ON \
  -DENABLE_QT6=OFF \
  -DENABLE_SDL=OFF \
  -DENABLE_WIN=OFF \
  -DENABLE_TESTS=OFF \
  -DENABLE_GLES=OFF \
  -DENABLE_LTO=ON \
  -DENABLE_SPICE="$SPICE" \
  -DENABLE_FFMPEG="$FFMPEG" \
  -DENABLE_LIBAVIF="$LIBAVIF" \
  -DENABLE_MINIAUDIO="$MINIAUDIO" \
  -DUSE_MESHOPTIMIZER="$MESHOPT"

# This builds Celestia's literal shared library plus the upstream scientific tools.
cmake --build "$UPSTREAM_BUILD" --parallel

cmake -S "$ROOT/scientific/celestia/bridge" -B "$BRIDGE_BUILD" \
  -DCELESTIA_SOURCE_DIR="$SRC_DIR" \
  -DCELESTIA_BUILD_DIR="$UPSTREAM_BUILD" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$INSTALL_DIR"
cmake --build "$BRIDGE_BUILD" --parallel
cmake --install "$BRIDGE_BUILD"

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
  "scientificFeatures": ["catalog loading","star database","deep-sky database","simulation","observer frames","VSOP87","TASS17","JPL ephemerides","precession","nutation","custom orbits","custom rotations","CELX scripting","spectrum2rgb","stardb tools","galaxy tools","atmosphere tools"],
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
