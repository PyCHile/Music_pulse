#!/usr/bin/env python3
"""Export deterministic static runtime products from the literal Celestia sidecar.

Executed only in GitHub Actions while the native sidecar is alive. The produced
JSON is committed to GitHub Pages and consumed by Three.js without a permanent
Celestia server.
"""
from __future__ import annotations

import argparse
import json
import math
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def request_json(base: str, token: str, path: str, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{base.rstrip('/')}{path}",
        data=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            **({"Content-Type": "application/json"} if body is not None else {}),
        },
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=8) as response:
        return json.load(response)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:18080")
    ap.add_argument("--token", required=True)
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--content-index", type=Path, required=True)
    args = ap.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    capabilities = request_json(args.base, args.token, "/v1/capabilities")
    constants = request_json(args.base, args.token, "/v1/constants")

    magnitudes = [-8, -4, 0, 2, 4, 6, 8, 10, 12]
    photometry = [request_json(args.base, args.token, "/v1/photometry", {"magnitude": m}) for m in magnitudes]

    coords = []
    for ra, dec, distance in [(0, 0, 1), (6, -30, 1), (12, 0, 1), (18, 45, 1), (23.5, -60, 1)]:
        coords.append(request_json(args.base, args.token, "/v1/equatorial", {"raHours": ra, "decDeg": dec, "distance": distance}))

    anomaly = []
    for eccentricity in (0.0, 0.0167, 0.0934, 0.2056, 0.5, 0.9):
        for mean_deg in (0, 45, 90, 180, 270):
            anomaly.append(request_json(args.base, args.token, "/v1/anomaly", {
                "meanAnomalyRad": math.radians(mean_deg),
                "eccentricity": eccentricity,
            }))

    obliquity = []
    for jd in (2415020.0, 2451545.0, 2462502.5, 2488070.0):
        obliquity.append(request_json(args.base, args.token, "/v1/obliquity", {"julianDate": jd}))

    content = json.loads(args.content_index.read_text(encoding="utf-8"))
    payload = {
        "schema": "urux-celestia-static-runtime-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "engine": "Celestia",
        "native": True,
        "execution": "GitHub Actions ephemeral native sidecar",
        "runtimeDelivery": "GitHub Pages static JSON",
        "renderLoopDependency": False,
        "capabilities": capabilities,
        "constants": constants,
        "photometryLut": photometry,
        "equatorialLut": coords,
        "anomalyLut": anomaly,
        "obliquityLut": obliquity,
        "content": {
            "source": content.get("source"),
            "sourceRef": content.get("sourceRef"),
            "fingerprint": content.get("rootTreeFingerprint"),
            "resourceFamilies": content.get("resourceFamilies", {}),
            "counts": content.get("counts", {}),
        },
        "usage": {
            "photometry": True,
            "coordinateTransforms": True,
            "orbitalAnomaly": True,
            "precessionObliquitySupport": True,
            "physicalConstants": True,
            "solarSystemCatalogs": bool(content.get("resourceFamilies", {}).get("solarSystem")),
            "starCatalogs": bool(content.get("resourceFamilies", {}).get("stars")),
            "deepSkyCatalogs": bool(content.get("resourceFamilies", {}).get("deepSky")),
            "models": bool(content.get("resourceFamilies", {}).get("models")),
            "textures": bool(content.get("resourceFamilies", {}).get("textures")),
            "scripts": bool(content.get("resourceFamilies", {}).get("scripts")),
            "nativeRenderer": False,
            "nativeRendererReason": "Three.js/postprocessing is the active URUX renderer; duplicating Celestia OpenGL rendering would replace rather than enhance the existing visual pipeline."
        }
    }
    out = args.output / "celestia-static-runtime.json"
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(out), "usage": payload["usage"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
