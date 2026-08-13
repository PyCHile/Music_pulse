#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="${CELESTIA_SOURCE_DIR:-$ROOT/external/Celestia}"
CONTENT="${CELESTIA_CONTENT_DIR:-$ROOT/external/CelestiaContent}"
BUILD="${CELESTIA_BUILD_DIR:-$ROOT/build/celestia}"
OUT="$ROOT/runtime/assets/astronomy"
SOURCE_REF="${CELESTIA_SOURCE_REF:-84153ded046fbea46c9f411dd0232e5426373ead}"
CONTENT_REF="${CELESTIA_CONTENT_REF:-e4d5d2754b6224f04e440e53b189f9ee96b6d1fe}"
SIDECAR_TOKEN="${URUX_SIDECAR_TOKEN:-urux-github-actions-ephemeral-token-20260813}"

if [[ ! -f "$SRC/CMakeLists.txt" ]]; then echo "Celestia source not found at $SRC" >&2; exit 2; fi
if [[ ! -d "$CONTENT" ]]; then echo "CelestiaContent not found at $CONTENT" >&2; exit 3; fi
mkdir -p "$BUILD" "$OUT"

cmake -S "$SRC" -B "$BUILD" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DENABLE_CELX=ON -DENABLE_SPICE=OFF -DENABLE_NLS=OFF \
  -DENABLE_QT6=OFF -DENABLE_SDL=OFF -DENABLE_WIN=OFF -DENABLE_FFMPEG=OFF \
  -DENABLE_LIBAVIF=OFF -DENABLE_MINIAUDIO=OFF -DENABLE_TOOLS=ON -DENABLE_TESTS=OFF \
  -DENABLE_GLES=OFF -DENABLE_LTO=OFF -DUSE_ICU=OFF -DUSE_MESHOPTIMIZER=OFF
cmake --build "$BUILD" --parallel "${CELESTIA_BUILD_JOBS:-2}"

LIB="$(find "$BUILD" -type f \( -name 'libcelestia.so*' -o -name 'libcelestia.dylib' -o -name 'celestia.dll' \) | head -n 1 || true)"
if [[ -z "$LIB" ]]; then echo "Full Celestia shared library was not produced" >&2; exit 4; fi
LIBDIR="$(dirname "$LIB")"
SIDECAR="$ROOT/build/urux-celestia-sidecar"
SIDE_SRC="$ROOT/scientific/celestia/sidecar/server_v2.cpp"
SIM_PROBE_SRC="$ROOT/scientific/celestia/simulation_probe.cpp"
SIM_PROBE="$ROOT/build/urux-celestia-simulation-probe"
if [[ ! -f "$SIDE_SRC" || ! -f "$SIM_PROBE_SRC" ]]; then echo "Celestia integration source missing" >&2; exit 5; fi

g++ -std=c++17 -O2 -DNDEBUG -I"$SRC/src" -I"$BUILD" -I/usr/include/eigen3 \
  "$SIDE_SRC" -L"$LIBDIR" -Wl,-rpath,"$LIBDIR" -lcelestia -pthread -o "$SIDECAR"
g++ -std=c++17 -O2 -DNDEBUG -I"$SRC/src" -I"$BUILD" -I/usr/include/eigen3 \
  "$SIM_PROBE_SRC" -L"$LIBDIR" -Wl,-rpath,"$LIBDIR" -lcelestia -pthread -o "$SIM_PROBE"

python "$ROOT/science/index_celestia_content.py" "$CONTENT" "$OUT/celestia-content-index.json" --source-ref "$CONTENT_REF"

# Build an ephemeral Celestia data root: official CelestiaContent provides all
# astronomy resources while the upstream source/build provides base cfg/scripts.
CELESTIA_RUNTIME="$ROOT/build/celestia-runtime"
rm -rf "$CELESTIA_RUNTIME" && mkdir -p "$CELESTIA_RUNTIME"
for dir in data models textures extras-standard extras fonts; do
  if [[ -e "$CONTENT/$dir" ]]; then ln -s "$CONTENT/$dir" "$CELESTIA_RUNTIME/$dir"; fi
done
for file in demo.cel guide.cel start.cel controls.txt COPYING; do
  if [[ -f "$SRC/$file" ]]; then cp "$SRC/$file" "$CELESTIA_RUNTIME/$file"; fi
done
cp "$BUILD/celestia.cfg" "$CELESTIA_RUNTIME/celestia.cfg"

# Literal high-level engine verification: initialize CelestiaCore -> Simulation
# -> Universe and query the loaded star, deep-sky and solar-system catalogs.
LD_LIBRARY_PATH="$LIBDIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
  "$SIM_PROBE" "$CELESTIA_RUNTIME" "$CELESTIA_RUNTIME/celestia.cfg" "$OUT/celestia-simulation.json"

PORT=18080 URUX_SIDECAR_TOKEN="$SIDECAR_TOKEN" LD_LIBRARY_PATH="$LIBDIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" "$SIDECAR" >"$ROOT/build/celestia-sidecar.log" 2>&1 &
SIDECAR_PID=$!
cleanup(){ kill "$SIDECAR_PID" 2>/dev/null || true; }
trap cleanup EXIT

SIDECAR_TOKEN="$SIDECAR_TOKEN" python3 - <<'PY'
import json, os, time, urllib.request
last=None;token=os.environ['SIDECAR_TOKEN']
for _ in range(40):
    try:
        with urllib.request.urlopen('http://127.0.0.1:18080/health',timeout=2) as r: health=json.load(r)
        req=urllib.request.Request('http://127.0.0.1:18080/v1/capabilities',headers={'Authorization':f'Bearer {token}','Accept':'application/json'})
        with urllib.request.urlopen(req,timeout=2) as r: caps=json.load(r)
        assert health['ok'] is True and health['native'] is True
        assert caps['ok'] is True and caps['native'] is True
        for module in ('celengine','celephem','celrender','celscript'): assert module in caps['modules']
        assert 'magToIrradiance' in caps['nativeFunctions']
        print(json.dumps({'health':health,'capabilities':caps},indent=2));break
    except Exception as exc: last=exc;time.sleep(.5)
else: raise SystemExit(f'Celestia sidecar did not become ready: {last}')
PY

python "$ROOT/science/export_celestia_static_runtime.py" --base "http://127.0.0.1:18080" --token "$SIDECAR_TOKEN" --output "$OUT" --content-index "$OUT/celestia-content-index.json"
cleanup; trap - EXIT

python - "$OUT/celestia-native-manifest.json" "$LIB" "$SOURCE_REF" "$CONTENT_REF" "$SIDECAR" "$OUT/celestia-simulation.json" <<'PY'
import json,pathlib,sys
from datetime import datetime,timezone
out=pathlib.Path(sys.argv[1]);lib=pathlib.Path(sys.argv[2]);source_ref=sys.argv[3];content_ref=sys.argv[4];sidecar=pathlib.Path(sys.argv[5]);simulation_path=pathlib.Path(sys.argv[6]);sim=json.loads(simulation_path.read_text())
payload={
 "schema":"urux-celestia-native-v6","generatedAt":datetime.now(timezone.utc).isoformat(),
 "source":"CelestiaProject/Celestia","sourceRef":source_ref,"contentSource":"CelestiaProject/CelestiaContent","contentRef":content_ref,
 "nativeBuildVerified":True,"sidecarBinaryVerified":True,"ephemeralSidecarExecuted":True,"simulationInitialized":bool(sim.get('simulationInitialized')),"staticRuntimeActive":True,"runtimeActive":False,"serviceUrl":None,
 "sharedLibrary":{"path":str(lib),"bytes":lib.stat().st_size},"sidecarBinary":{"path":str(sidecar),"bytes":sidecar.stat().st_size},
 "compiledSubsystems":["cel3ds","celastro","celengine","celephem","celestia-core","celimage","celmath","celmodel","celrender","celttf","celutil","celscript","celx","tools"],
 "executedHighLevelAPIs":["CelestiaCore::initSimulation","CelestiaCore::getSimulation","Simulation::getUniverse","Simulation::findObjectFromPath","Selection::getVelocity","StarDatabase::size","DSODatabase::size","SolarSystemCatalog::size"],
 "catalogCounts":sim.get('catalogCounts',{}),"objectsFound":sim.get('objectsFound',0),
 "headlessUses":["Simulation/Universe initialization","star catalog","deep-sky catalog","solar-system catalog","object lookup","ephemeris velocity","photometry","physical constants","equatorial coordinate conversion","orbital anomaly solving","mean ecliptic obliquity","CelestiaContent resource discovery"],
 "optionalSubsystems":{"spice":False,"ffmpeg":False,"miniaudio":False,"avif":False},
 "browserEmbedding":"static-precompute","integrationMode":"github-actions-static-precompute",
 "staticAssets":["celestia-simulation.json","celestia-static-runtime.json","celestia-content-index.json"],
 "verifiedEndpoints":["/health","/v1/capabilities","/v1/constants","/v1/photometry","/v1/equatorial","/v1/anomaly","/v1/obliquity"],
 "rendering":{"celestiaNativeRenderer":False,"reason":"Three.js + postprocessing is the existing URUX renderer and is better integrated for this interactive experience; Celestia native OpenGL rendering would replace, not augment, that superior project-specific pipeline."},
 "note":"Literal libcelestia is compiled and both CelestiaCore/Simulation/Universe plus native astronomy functions are executed in GitHub Actions. Results are exported as static Pages assets, requiring no permanent server or paid container."
}
out.write_text(json.dumps(payload,indent=2),encoding='utf-8');print(json.dumps(payload,indent=2))
PY

echo "Celestia native Simulation + static runtime verified: $LIB / $SIM_PROBE / $SIDECAR"
