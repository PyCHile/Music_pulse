#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV="${URUX_SCIENCE_VENV:-$ROOT/.venv-astronomy}"

"$PYTHON_BIN" -m venv "$VENV"
# shellcheck disable=SC1091
source "$VENV/bin/activate"
python -m pip install --upgrade pip wheel setuptools
python -m pip install astropy astroquery aplpy reproject matplotlib numpy spectral-cube
python -m pip install -r "$ROOT/scientific/requirements-astronomy.txt"
python "$ROOT/scientific/astronomy_pipeline.py" --output "$ROOT/assets/astronomy"
