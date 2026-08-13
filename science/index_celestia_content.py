#!/usr/bin/env python3
"""Index the official CelestiaContent tree without changing its data.

The resulting manifest is metadata only. URUX does not claim that Celestia is
available in the browser; it records exactly which native/content resources were
present in the verified native build.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

INTERESTING = {
    ".ssc": "solarSystemCatalogs",
    ".stc": "starCatalogs",
    ".dsc": "deepSkyCatalogs",
    ".cel": "celScripts",
    ".celx": "celxScripts",
    ".cmod": "celestiaModels",
    ".3ds": "legacyModels",
    ".ctx": "virtualTextures",
    ".jpg": "jpegTextures",
    ".jpeg": "jpegTextures",
    ".png": "pngTextures",
    ".dds": "ddsTextures",
    ".avif": "avifTextures",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("content_dir", type=Path)
    ap.add_argument("output", type=Path)
    ap.add_argument("--source-ref", default="unknown")
    args = ap.parse_args()

    root = args.content_dir.resolve()
    if not root.exists():
        raise SystemExit(f"CelestiaContent not found: {root}")

    counts = Counter()
    bytes_by_kind = Counter()
    samples: dict[str, list[str]] = {}
    total_files = 0
    total_bytes = 0
    digest = hashlib.sha256()

    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        rel = path.relative_to(root).as_posix()
        size = path.stat().st_size
        total_files += 1
        total_bytes += size
        digest.update(rel.encode("utf-8"))
        digest.update(str(size).encode("ascii"))
        kind = INTERESTING.get(path.suffix.lower(), "other")
        counts[kind] += 1
        bytes_by_kind[kind] += size
        bucket = samples.setdefault(kind, [])
        if len(bucket) < 40:
            bucket.append(rel)

    payload = {
        "schema": "urux-celestia-content-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "CelestiaProject/CelestiaContent",
        "sourceRef": args.source_ref,
        "rootTreeFingerprint": digest.hexdigest(),
        "totalFiles": total_files,
        "totalBytes": total_bytes,
        "counts": dict(sorted(counts.items())),
        "bytesByKind": dict(sorted(bytes_by_kind.items())),
        "samples": samples,
        "resourceFamilies": {
            "solarSystem": counts["solarSystemCatalogs"],
            "stars": counts["starCatalogs"],
            "deepSky": counts["deepSkyCatalogs"],
            "scripts": counts["celScripts"] + counts["celxScripts"],
            "models": counts["celestiaModels"] + counts["legacyModels"],
            "textures": counts["jpegTextures"] + counts["pngTextures"] + counts["ddsTextures"] + counts["avifTextures"] + counts["virtualTextures"],
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload["resourceFamilies"], indent=2))


if __name__ == "__main__":
    main()
