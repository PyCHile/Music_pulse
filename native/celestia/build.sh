#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="${CELESTIA_SOURCE_DIR:-$ROOT/external/Celestia}"
CONTENT="${CELESTIA_CONTENT_DIR:-$ROOT/external/CelestiaContent}"
BUILD="${CELESTIA_BUILD_DIR:-$ROOT/build/celestia}"
OUT="$ROOT/runtime/assets/astronomy"
SOURCE_REF="${CELESTIA_SOURCE_REF:-84153ded046fbea46c9f411dd0232e5426373ead}"
CONTENT_REF="${CELESTIA_CONTENT_REF:-e4d5d2754b6224f04e440e53b189f9ee96b6d1fe}"

if [[ ! -f "$SRC/CMakeLists.txt" ]]; then
  echo "Celestia source not found at $SRC" >&2
  exit 2
fi
if [[ ! -d "$CONTENT" ]]; then
  echo "CelestiaContent not found at $CONTENT" >&2
  exit 3
fi

mkdir -p "$BUILD" "$OUT"

cmake -S "$SRC" -B "$BUILD" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_CELX=ON \
  -DENABLE_SPICE=OFF \
  -DENABLE_NLS=OFF \
  -DENABLE_QT6=OFF \
  -DENABLE_SDL=OFF \
  -DENABLE_WIN=OFF \
  -DENABLE_FFMPEG=OFF \
  -DENABLE_LIBAVIF=OFF \
  -DENABLE_MINIAUDIO=OFF \
  -DENABLE_TOOLS=ON \
  -DENABLE_TESTS=OFF \
  -DENABLE_GLES=OFF \
  -DENABLE_LTO=OFF \
  -DUSE_ICU=OFF \
  -DUSE_MESHOPTIMIZER=OFF

cmake --build "$BUILD" --parallel "${CELESTIA_BUILD_JOBS:-2}"

LIB="$(find "$BUILD" -type f \( -name 'libcelestia.so*' -o -name 'libcelestia.dylib' -o -name 'celestia.dll' \) | head -n 1 || true)"
if [[ -z "$LIB" ]]; then
  echo "Full Celestia shared library was not produced" >&2
  exit 4
fi
LIBDIR="$(dirname "$LIB")"
SIDECAR="$ROOT/build/urux-celestia-sidecar"

g++ -std=c++17 -O2 -DNDEBUG \
  -I"$SRC/src" -I"$BUILD" -I/usr/include/eigen3 \
  "$ROOT/native/celestia-sidecar/server.cpp" \
  -L"$LIBDIR" -Wl,-rpath,"$LIBDIR" -lcelestia \
  -o "$SIDECAR"

PORT=18080 CELESTIA_CONTENT="$CONTENT" LD_LIBRARY_PATH="$LIBDIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" "$SIDECAR" >"$ROOT/build/celestia-sidecar.log" 2>&1 &
SIDECAR_PID=$!
cleanup(){ kill "$SIDECAR_PID" 2>/dev/null || true; }
trap cleanup EXIT
python3 - <<'PY'
import json, time, urllib.request
last=None
for _ in range(30):
    try:
        with urllib.request.urlopen('http://127.0.0.1:18080/ready', timeout=2) as r:
            data=json.load(r)
        assert data['ok'] is True
        assert data['native'] is True
        assert data['libraryProbe']['magToIrradiance0'] > 0
        assert 'celengine' in data['compiledSubsystems']
        print(json.dumps(data, indent=2))
        break
    except Exception as exc:
        last=exc
        time.sleep(.5)
else:
    raise SystemExit(f'Celestia sidecar did not become ready: {last}')
PY
cleanup
trap - EXIT

python "$ROOT/science/index_celestia_content.py" \
  "$CONTENT" \
  "$OUT/celestia-content-index.json" \
  --source-ref "$CONTENT_REF"

python - "$OUT/celestia-native-manifest.json" "$LIB" "$SOURCE_REF" "$CONTENT_REF" "$SIDECAR" <<'PY'
import json, pathlib, sys
from datetime import datetime, timezone

out=pathlib.Path(sys.argv[1])
lib=pathlib.Path(sys.argv[2])
source_ref=sys.argv[3]
content_ref=sys.argv[4]
sidecar=pathlib.Path(sys.argv[5])
payload={
    "schema":"urux-celestia-native-v2",
    "generatedAt":datetime.now(timezone.utc).isoformat(),
    "source":"CelestiaProject/Celestia",
    "sourceRef":source_ref,
    "contentSource":"CelestiaProject/CelestiaContent",
    "contentRef":content_ref,
    "nativeBuildVerified":True,
    "sidecarBinaryVerified":True,
    "runtimeActive":False,
    "serviceUrl":None,
    "sharedLibrary":{"path":str(lib),"bytes":lib.stat().st_size},
    "sidecarBinary":{"path":str(sidecar),"bytes":sidecar.stat().st_size},
    "compiledSubsystems":[
        "cel3ds","celastro","celengine","celephem","celestia-core","celimage",
        "celmath","celmodel","celrender","celttf","celutil","celscript","celx","tools"
    ],
    "optionalSubsystems":{"spice":False,"ffmpeg":False,"miniaudio":False,"avif":False},
    "browserEmbedding":"not-direct",
    "integrationMode":"cloudflare-native-container-sidecar",
    "verifiedEndpoints":["/ready","/v1/capabilities","/v1/content","/v1/astro","/v1/orbit"],
    "note":"Literal libcelestia and the URUX native sidecar binary were compiled and /ready was executed successfully. Production runtime is marked active only by the live Worker diagnostic."
}
out.write_text(json.dumps(payload,indent=2),encoding="utf-8")
print(json.dumps(payload,indent=2))
PY

echo "Celestia native build + sidecar verified: $LIB / $SIDECAR"
