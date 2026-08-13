#!/usr/bin/env python3
"""URUX scientific astronomy asset pipeline.

This pipeline is intentionally outside the browser render loop. It queries and
normalizes real astronomical data when network services are available, creates
WCS-aware products, validates the full scientific stack, and emits compact JSON
and FITS/PNG assets that the Three.js runtime can consume cheaply.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import math
import os
from pathlib import Path
import subprocess
from typing import Any

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import aplpy

import astropy.units as u
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.time import Time
from astropy.visualization import ImageNormalize, ZScaleInterval, AsinhStretch
from astropy.visualization.wcsaxes import WCSAxes
from astropy.wcs import WCS

from astroquery.gaia import Gaia
from astroquery.jplhorizons import Horizons
from astroquery.skyview import SkyView
from reproject import reproject_interp
from spectral_cube import SpectralCube


def pkg_version(name: str) -> str:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return "unknown"


def finite(value: Any) -> float | None:
    try:
        v = float(value)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def query_gaia(limit: int = 256) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    center = SkyCoord(l=0 * u.deg, b=0 * u.deg, frame="galactic").icrs
    Gaia.ROW_LIMIT = limit
    try:
        job = Gaia.cone_search_async(center, radius=0.18 * u.deg)
        table = job.get_results()
        stars: list[dict[str, Any]] = []
        available = set(table.colnames)
        for row in table[:limit]:
            get = lambda key: row[key] if key in available else None
            stars.append({
                "sourceId": str(get("source_id") or ""),
                "raDeg": finite(get("ra")),
                "decDeg": finite(get("dec")),
                "parallaxMas": finite(get("parallax")),
                "gMag": finite(get("phot_g_mean_mag")),
                "bpRp": finite(get("bp_rp")),
                "temperatureK": finite(get("teff_gspphot")),
            })
        return stars, {"ok": True, "service": "ESA Gaia Archive", "count": len(stars)}
    except Exception as exc:
        return [], {"ok": False, "service": "ESA Gaia Archive", "error": str(exc)}


def query_horizons(epoch_jd: float) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    bodies = [
        ("199", "Mercury"), ("299", "Venus"), ("399", "Earth"), ("499", "Mars"),
        ("599", "Jupiter"), ("699", "Saturn"), ("799", "Uranus"), ("899", "Neptune"),
    ]
    result: list[dict[str, Any]] = []
    errors: list[str] = []
    for object_id, name in bodies:
        try:
            vectors = Horizons(id=object_id, id_type="majorbody", location="@sun", epochs=epoch_jd).vectors()
            row = vectors[0]
            result.append({
                "id": object_id,
                "name": name,
                "xAu": finite(row["x"]), "yAu": finite(row["y"]), "zAu": finite(row["z"]),
                "vxAuDay": finite(row["vx"]), "vyAuDay": finite(row["vy"]), "vzAuDay": finite(row["vz"]),
                "lightTimeDay": finite(row["lighttime"]) if "lighttime" in vectors.colnames else None,
            })
        except Exception as exc:
            errors.append(f"{name}: {exc}")
    return result, {"ok": bool(result), "service": "NASA/JPL Horizons", "count": len(result), "errors": errors}


def synthetic_wcs_image() -> fits.PrimaryHDU:
    size = 512
    y, x = np.mgrid[0:size, 0:size]
    cx, cy = size / 2, size / 2
    r2 = ((x - cx) / 92.0) ** 2 + ((y - cy) / 74.0) ** 2
    filament = np.exp(-r2) + 0.32 * np.exp(-(((x - 330) / 44.0) ** 2 + ((y - 210) / 120.0) ** 2))
    data = filament.astype(np.float32)
    w = WCS(naxis=2)
    w.wcs.crpix = [size / 2, size / 2]
    w.wcs.cdelt = np.array([-0.0002777778, 0.0002777778])
    w.wcs.crval = [83.82208, -5.39111]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    header = w.to_header()
    header["ORIGIN"] = "URUX synthetic fallback - not observational data"
    return fits.PrimaryHDU(data=data, header=header)


def obtain_reference_fits(output: Path) -> tuple[Path, dict[str, Any]]:
    path = output / "reference-m42.fits"
    try:
        images = SkyView.get_images(position="M42", survey=["DSS2 Red"], radius=0.35 * u.deg)
        if not images:
            raise RuntimeError("SkyView returned no images")
        images[0][0].writeto(path, overwrite=True)
        return path, {"ok": True, "service": "NASA SkyView", "survey": "DSS2 Red", "target": "M42"}
    except Exception as exc:
        synthetic_wcs_image().writeto(path, overwrite=True)
        return path, {"ok": False, "service": "NASA SkyView", "fallback": "synthetic WCS validation image", "error": str(exc)}


def build_wcs_products(reference_path: Path, output: Path) -> dict[str, Any]:
    with fits.open(reference_path) as hdul:
        hdu = hdul[0]
        data = np.squeeze(np.asarray(hdu.data, dtype=np.float32))
        if data.ndim != 2:
            raise RuntimeError(f"reference FITS is not 2D after squeeze: {data.shape}")
        source_wcs = WCS(hdu.header).celestial

    target_wcs = source_wcs.deepcopy()
    target_wcs.wcs.crpix = np.asarray(target_wcs.wcs.crpix) + np.array([7.0, -5.0])
    reprojected, footprint = reproject_interp((data, source_wcs), target_wcs, shape_out=data.shape)
    reprojected = np.nan_to_num(reprojected, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)
    reproj_path = output / "reference-m42-reprojected.fits"
    fits.PrimaryHDU(reprojected, header=target_wcs.to_header()).writeto(reproj_path, overwrite=True)

    norm = ImageNormalize(reprojected, interval=ZScaleInterval(), stretch=AsinhStretch())
    fig = plt.figure(figsize=(8, 6), dpi=130)
    ax = fig.add_subplot(111, projection=target_wcs)
    if not isinstance(ax, WCSAxes):
        raise RuntimeError("Matplotlib did not instantiate Astropy WCSAxes")
    ax.imshow(reprojected, origin="lower", cmap="gray", norm=norm)
    ax.coords.grid(True, color="white", alpha=0.24, linestyle=":")
    ax.set_xlabel("Right Ascension")
    ax.set_ylabel("Declination")
    wcs_png = output / "wcsaxes-preview.png"
    fig.tight_layout()
    fig.savefig(wcs_png)
    plt.close(fig)

    aplpy_png = output / "aplpy-preview.png"
    ff = aplpy.FITSFigure(str(reproj_path), figsize=(8, 6))
    ff.show_grayscale(stretch="arcsinh", pmin=1.0, pmax=99.7)
    ff.add_grid()
    ff.grid.set_alpha(0.25)
    ff.save(str(aplpy_png), dpi=130)
    ff.close()

    return {
        "reprojectedFits": reproj_path.name,
        "wcsAxesPreview": wcs_png.name,
        "aplpyPreview": aplpy_png.name,
        "footprintCoverage": float(np.mean(np.asarray(footprint) > 0)),
        "normalization": "ZScaleInterval + AsinhStretch",
    }


def build_spectral_cube(reference_path: Path, output: Path) -> dict[str, Any]:
    with fits.open(reference_path) as hdul:
        base = np.squeeze(np.asarray(hdul[0].data, dtype=np.float32))
        base_wcs = WCS(hdul[0].header).celestial
    base = np.nan_to_num(base, nan=0.0, posinf=0.0, neginf=0.0)
    if base.shape[0] > 256 or base.shape[1] > 256:
        sy = max(1, base.shape[0] // 256)
        sx = max(1, base.shape[1] // 256)
        base = base[::sy, ::sx]

    channels = 16
    velocity = np.linspace(-50.0, 50.0, channels)
    profile = np.exp(-0.5 * (velocity / 15.0) ** 2).astype(np.float32)
    cube_data = profile[:, None, None] * base[None, :, :]

    w = WCS(naxis=3)
    w.wcs.crpix = [base.shape[1] / 2, base.shape[0] / 2, 1]
    w.wcs.cdelt = [float(base_wcs.wcs.cdelt[0]), float(base_wcs.wcs.cdelt[1]), (velocity[1] - velocity[0]) * 1000]
    w.wcs.crval = [float(base_wcs.wcs.crval[0]), float(base_wcs.wcs.crval[1]), velocity[0] * 1000]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN", "VRAD"]
    w.wcs.cunit = ["deg", "deg", "m/s"]
    header = w.to_header()
    header["BUNIT"] = "Jy/beam"
    header["HISTORY"] = "Derived validation cube from reference image; spectral axis is synthetic."
    cube_path = output / "spectral-validation-cube.fits"
    fits.PrimaryHDU(cube_data.astype(np.float32), header=header).writeto(cube_path, overwrite=True)

    cube = SpectralCube.read(cube_path)
    slab = cube.spectral_slab(-25 * u.km / u.s, 25 * u.km / u.s)
    moment0 = slab.moment(order=0)
    moment_path = output / "spectral-moment0.fits"
    moment0.write(moment_path, overwrite=True)
    return {
        "cube": cube_path.name,
        "moment0": moment_path.name,
        "channels": channels,
        "spectralAxis": "VRAD",
        "observationalSpectra": False,
        "purpose": "spectral-cube API validation using astronomical WCS imagery",
    }


def celestia_bridge(root: Path) -> dict[str, Any]:
    candidate = Path(os.environ.get("URUX_CELESTIA_BRIDGE", root / ".local/celestia/bin/urux-celestia-bridge"))
    if not candidate.exists():
        return {"ok": False, "bridge": str(candidate), "reason": "native bridge not built"}
    try:
        raw = subprocess.check_output([str(candidate), "constants"], text=True, timeout=10)
        constants = json.loads(raw)
        photometry = json.loads(subprocess.check_output([str(candidate), "photometry", "0"], text=True, timeout=10))
        return {"ok": True, "bridge": str(candidate), "constants": constants, "photometryZeroMag": photometry}
    except Exception as exc:
        return {"ok": False, "bridge": str(candidate), "error": str(exc)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="assets/astronomy")
    parser.add_argument("--epoch", default=os.environ.get("URUX_ASTRO_EPOCH", "now"))
    parser.add_argument("--gaia-limit", type=int, default=256)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    epoch = Time.now() if args.epoch == "now" else Time(args.epoch)

    stars, gaia_status = query_gaia(args.gaia_limit)
    bodies, horizons_status = query_horizons(float(epoch.jd))
    reference_path, skyview_status = obtain_reference_fits(output)

    wcs_status: dict[str, Any]
    try:
        wcs_status = {"ok": True, **build_wcs_products(reference_path, output)}
    except Exception as exc:
        wcs_status = {"ok": False, "error": str(exc)}

    cube_status: dict[str, Any]
    try:
        cube_status = {"ok": True, **build_spectral_cube(reference_path, output)}
    except Exception as exc:
        cube_status = {"ok": False, "error": str(exc)}

    payload = {
        "schemaVersion": 2,
        "generatedAt": Time.now().isot,
        "epoch": {"isot": epoch.isot, "jd": float(epoch.jd)},
        "libraries": {
            "astropy": pkg_version("astropy"),
            "astroquery": pkg_version("astroquery"),
            "aplpy": pkg_version("aplpy"),
            "reproject": pkg_version("reproject"),
            "matplotlib": pkg_version("matplotlib"),
            "numpy": pkg_version("numpy"),
            "spectral-cube": pkg_version("spectral-cube"),
            "wcsaxes": "astropy.visualization.wcsaxes",
        },
        "stars": stars,
        "solarSystem": bodies,
        "products": {"wcs": wcs_status, "spectralCube": cube_status},
        "celestia": celestia_bridge(root),
        "sources": {"gaia": gaia_status, "horizons": horizons_status, "skyview": skyview_status},
    }

    out = output / "runtime-catalog.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
