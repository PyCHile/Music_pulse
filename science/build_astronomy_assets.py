#!/usr/bin/env python3
"""URUX astronomical data build pipeline.

This module executes the real Python astronomy stack outside the render loop and
writes compact assets consumed by the browser. It never fabricates astronomical
measurements: failed upstream queries are recorded as unavailable.
"""
from __future__ import annotations

import json
import os
import platform
import traceback
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import astropy
import astropy.units as u
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.time import Time
from astropy.utils.data import download_file
from astropy.visualization import ImageNormalize, PercentileInterval, AsinhStretch, make_lupton_rgb
from astropy.visualization.wcsaxes import add_scalebar
from astropy.wcs import WCS

import astroquery
from astroquery.simbad import Simbad
from astroquery.gaia import Gaia
from astroquery.jplhorizons import Horizons
from astroquery.skyview import SkyView

import aplpy
import reproject
from reproject import reproject_interp, reproject_adaptive, reproject_exact
from spectral_cube import SpectralCube
import spectral_cube

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "runtime" / "assets" / "astronomy"
OUT.mkdir(parents=True, exist_ok=True)

TARGET = os.getenv("URUX_ASTRONOMY_TARGET", "M 42")
IMAGE_RADIUS = float(os.getenv("URUX_ASTRONOMY_RADIUS_DEG", "0.25")) * u.deg
IMAGE_PIXELS = int(os.getenv("URUX_ASTRONOMY_PIXELS", "256"))
SPECTRAL_URL = os.getenv(
    "URUX_SPECTRAL_CUBE_URL",
    "http://data.astropy.org/tutorials/FITS-cubes/reduced_TAN_C14.fits",
)
ENABLE_SPECTRAL = os.getenv("URUX_ENABLE_SPECTRAL_CUBE", "1") != "0"

manifest: dict = {
    "schema": "urux-astronomy-assets-v1",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "target": TARGET,
    "libraries": {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "matplotlib": matplotlib.__version__,
        "astropy": astropy.__version__,
        "astroquery": astroquery.__version__,
        "aplpy": getattr(aplpy, "__version__", "unknown"),
        "reproject": reproject.__version__,
        "spectralCube": getattr(spectral_cube, "__version__", "unknown"),
    },
    "capabilities": {},
    "provenance": [],
    "files": {},
    "errors": {},
}


def record_error(key: str, exc: BaseException) -> None:
    manifest["errors"][key] = {
        "type": exc.__class__.__name__,
        "message": str(exc),
        "trace": traceback.format_exc(limit=3),
    }
    manifest["capabilities"][key] = False


def to_json_value(value):
    if value is None:
        return None
    if hasattr(value, "mask") and bool(getattr(value, "mask", False)):
        return None
    if hasattr(value, "value") and hasattr(value, "unit"):
        try:
            return {"value": float(value.value), "unit": str(value.unit)}
        except Exception:
            return str(value)
    if isinstance(value, (np.integer, np.floating)):
        value = value.item()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def table_records(table, columns, limit=128):
    rows = []
    if table is None:
        return rows
    present = [c for c in columns if c in table.colnames]
    for row in table[:limit]:
        rows.append({c: to_json_value(row[c]) for c in present})
    return rows


def save_json(name: str, payload) -> Path:
    path = OUT / name
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest["files"][name] = str(path.relative_to(ROOT)).replace("\\", "/")
    return path


def resolve_target() -> SkyCoord:
    simbad = Simbad()
    simbad.timeout = 30
    table = simbad.query_object(TARGET)
    if table is None or len(table) == 0:
        raise RuntimeError(f"SIMBAD did not resolve {TARGET}")
    ra = float(table["ra"][0])
    dec = float(table["dec"][0])
    coord = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, frame="icrs")
    save_json("simbad.json", {
        "source": "SIMBAD via astroquery.simbad",
        "queriedAt": Time.now().isot,
        "records": table_records(table, table.colnames, 8),
    })
    manifest["capabilities"]["astroquery.simbad"] = True
    manifest["provenance"].append("SIMBAD/CDS")
    return coord


def build_gaia(coord: SkyCoord) -> None:
    Gaia.ROW_LIMIT = 128
    job = Gaia.cone_search_async(
        coord,
        radius=0.12 * u.deg,
        table_name="gaiadr3.gaia_source",
        columns=("source_id", "ra", "dec", "parallax", "pmra", "pmdec", "phot_g_mean_mag", "bp_rp"),
        verbose=False,
    )
    table = job.get_results()
    save_json("gaia-dr3.json", {
        "source": "ESA Gaia DR3 via astroquery.gaia",
        "centerICRS": {"raDeg": coord.ra.deg, "decDeg": coord.dec.deg},
        "radiusDeg": 0.12,
        "records": table_records(table, ["source_id", "ra", "dec", "parallax", "pmra", "pmdec", "phot_g_mean_mag", "bp_rp"], 128),
    })
    manifest["capabilities"]["astroquery.gaia"] = True
    manifest["provenance"].append("ESA Gaia DR3")


def build_jpl() -> None:
    epoch = Time.now().tdb
    vectors = Horizons(id="399", location="@0", epochs=epoch.jd).vectors(refplane="earth")
    save_json("jpl-earth-vector.json", {
        "source": "NASA/JPL Horizons via astroquery.jplhorizons",
        "epochTDB": epoch.isot,
        "records": table_records(vectors, ["targetname", "datetime_jd", "x", "y", "z", "vx", "vy", "vz", "lighttime", "range", "range_rate"], 4),
    })
    manifest["capabilities"]["astroquery.jplhorizons"] = True
    manifest["provenance"].append("NASA/JPL Horizons")


def save_primary_hdu(hdul, filename: str) -> Path:
    path = OUT / filename
    hdul[0].writeto(path, overwrite=True)
    manifest["files"][filename] = str(path.relative_to(ROOT)).replace("\\", "/")
    return path


def build_sky_images(coord: SkyCoord) -> None:
    # NASA SkyView returns calibrated survey FITS products with WCS metadata.
    images = SkyView.get_images(
        position=coord,
        survey=["DSS2 Red"],
        radius=IMAGE_RADIUS,
        pixels=IMAGE_PIXELS,
        show_progress=False,
    )
    if not images:
        raise RuntimeError("SkyView returned no DSS2 Red image")
    dss_path = save_primary_hdu(images[0], "skyview-dss2-red.fits")
    manifest["capabilities"]["astroquery.skyview"] = True
    manifest["provenance"].append("NASA SkyView / DSS2 Red")

    with fits.open(dss_path) as hdul:
        hdu = hdul[0]
        data = np.asarray(hdu.data, dtype=np.float64)
        wcs = WCS(hdu.header).celestial

        # Astropy visualization: robust percentile + asinh normalization.
        interval = PercentileInterval(99.5)
        vmin, vmax = interval.get_limits(data[np.isfinite(data)])
        norm = ImageNormalize(vmin=vmin, vmax=vmax, stretch=AsinhStretch())
        fig = plt.figure(figsize=(6, 6), dpi=140)
        ax = fig.add_subplot(111, projection=wcs)
        ax.imshow(data, origin="lower", cmap="magma", norm=norm)
        ax.coords.grid(True, color="white", alpha=0.22, ls="dotted")
        ax.coords[0].set_axislabel("Right Ascension (ICRS)")
        ax.coords[1].set_axislabel("Declination (ICRS)")
        try:
            add_scalebar(ax, 5 * u.arcmin, label="5 arcmin", corner="bottom right", color="white")
        except Exception:
            pass
        wcs_png = OUT / "wcsaxes-dss2-red.png"
        fig.savefig(wcs_png, bbox_inches="tight", facecolor="black")
        plt.close(fig)
        manifest["files"][wcs_png.name] = str(wcs_png.relative_to(ROOT)).replace("\\", "/")
        manifest["capabilities"]["astropy.visualization"] = True
        manifest["capabilities"]["astropy.wcsaxes"] = True

        # Reproject the ICRS survey image into a Galactic TAN grid using all three
        # official algorithms so quality/performance can be compared offline.
        gal = coord.galactic
        target_wcs = WCS(naxis=2)
        target_wcs.wcs.ctype = ["GLON-TAN", "GLAT-TAN"]
        target_wcs.wcs.cunit = ["deg", "deg"]
        target_wcs.wcs.crval = [gal.l.deg, gal.b.deg]
        target_wcs.wcs.crpix = [IMAGE_PIXELS / 2 + 0.5, IMAGE_PIXELS / 2 + 0.5]
        scale = (IMAGE_RADIUS.to_value(u.deg) * 2) / IMAGE_PIXELS
        target_wcs.wcs.cdelt = [-scale, scale]
        shape = (IMAGE_PIXELS, IMAGE_PIXELS)
        reprojections = {}
        for name, fn, kwargs in (
            ("interp", reproject_interp, {}),
            ("adaptive", reproject_adaptive, {"conserve_flux": True}),
            ("exact", reproject_exact, {}),
        ):
            array, footprint = fn(hdu, target_wcs, shape_out=shape, **kwargs)
            fits_name = f"reproject-{name}-galactic.fits"
            fits.PrimaryHDU(data=array.astype(np.float32), header=target_wcs.to_header()).writeto(OUT / fits_name, overwrite=True)
            manifest["files"][fits_name] = str((OUT / fits_name).relative_to(ROOT)).replace("\\", "/")
            reprojections[name] = {
                "finiteFraction": float(np.isfinite(array).mean()),
                "footprintMean": float(np.nanmean(footprint)),
            }
        save_json("reproject-metrics.json", reprojections)
        manifest["capabilities"]["reproject.interp"] = True
        manifest["capabilities"]["reproject.adaptive"] = True
        manifest["capabilities"]["reproject.exact"] = True

    # APLpy uses WCSAxes internally and provides a second independent visualization path.
    fig = aplpy.FITSFigure(str(dss_path), auto_refresh=False)
    fig.show_colorscale(cmap="magma", stretch="arcsinh", pmin=0.5, pmax=99.5)
    fig.add_grid()
    fig.grid.set_color("white")
    fig.grid.set_alpha(0.2)
    apl_path = OUT / "aplpy-dss2-red.png"
    fig.save(str(apl_path), dpi=140)
    fig.close()
    manifest["files"][apl_path.name] = str(apl_path.relative_to(ROOT)).replace("\\", "/")
    manifest["capabilities"]["aplpy"] = True

    # 2MASS J/H/K are mapped explicitly as representational near-IR RGB, not claimed as true color.
    try:
        nir = SkyView.get_images(
            position=coord,
            survey=["2MASS-J", "2MASS-H", "2MASS-K"],
            radius=IMAGE_RADIUS,
            pixels=IMAGE_PIXELS,
            show_progress=False,
        )
        if len(nir) >= 3:
            ref = nir[1][0]
            ref_wcs = WCS(ref.header).celestial
            ref_shape = ref.data.shape
            channels = []
            for idx, hdul in enumerate(nir[:3]):
                hdu = hdul[0]
                if idx == 1:
                    arr = np.asarray(hdu.data, dtype=np.float64)
                else:
                    arr, _ = reproject_interp(hdu, ref_wcs, shape_out=ref_shape)
                finite = arr[np.isfinite(arr)]
                floor = np.percentile(finite, 1.0) if finite.size else 0.0
                channels.append(np.nan_to_num(arr - floor, nan=0.0, posinf=0.0, neginf=0.0))
            rgb = make_lupton_rgb(channels[2], channels[1], channels[0], stretch=5, Q=8)
            rgb_path = OUT / "2mass-jhk-representational-rgb.png"
            plt.imsave(rgb_path, rgb, origin="lower")
            manifest["files"][rgb_path.name] = str(rgb_path.relative_to(ROOT)).replace("\\", "/")
            manifest["capabilities"]["astropy.visualization.luptonRgb"] = True
            manifest["provenance"].append("NASA SkyView / 2MASS J-H-K (representational RGB)")
    except Exception as exc:
        record_error("skyview.2massRgb", exc)


def build_spectral_cube() -> None:
    if not ENABLE_SPECTRAL:
        manifest["capabilities"]["spectral-cube"] = False
        manifest["errors"]["spectral-cube"] = {"message": "disabled by URUX_ENABLE_SPECTRAL_CUBE=0"}
        return
    cube_path = download_file(SPECTRAL_URL, cache=True, show_progress=False, timeout=90)
    cube = SpectralCube.read(cube_path)
    slab = cube.with_spectral_unit(u.km / u.s).spectral_slab(-300 * u.km / u.s, 300 * u.km / u.s)
    moment0 = slab.moment(order=0)
    moment1 = slab.moment(order=1)
    m0_path = OUT / "hi21cm-moment0.fits"
    m1_path = OUT / "hi21cm-moment1.fits"
    moment0.write(m0_path, overwrite=True)
    moment1.write(m1_path, overwrite=True)
    manifest["files"][m0_path.name] = str(m0_path.relative_to(ROOT)).replace("\\", "/")
    manifest["files"][m1_path.name] = str(m1_path.relative_to(ROOT)).replace("\\", "/")

    fig = plt.figure(figsize=(7, 5), dpi=130)
    ax = fig.add_subplot(111, projection=moment1.wcs)
    data = np.asarray(moment1.hdu.data, dtype=float)
    finite = data[np.isfinite(data)]
    lo, hi = np.percentile(finite, [2, 98]) if finite.size else (0, 1)
    im = ax.imshow(data, origin="lower", cmap="RdBu_r", vmin=lo, vmax=hi)
    ax.coords.grid(True, color="white", alpha=.22, ls="dotted")
    overlay = ax.get_coords_overlay("fk5")
    overlay.grid(color="white", alpha=.14, ls="dotted")
    fig.colorbar(im, ax=ax, pad=.08, label=str(moment1.unit))
    png = OUT / "hi21cm-moment1-wcsaxes.png"
    fig.savefig(png, bbox_inches="tight", facecolor="black")
    plt.close(fig)
    manifest["files"][png.name] = str(png.relative_to(ROOT)).replace("\\", "/")
    manifest["capabilities"]["spectral-cube"] = True
    manifest["provenance"].append("Astropy tutorial reduced HI4PI 21cm cube")
    save_json("spectral-cube-metrics.json", {
        "source": SPECTRAL_URL,
        "shape": list(cube.shape),
        "unit": str(cube.unit),
        "slabShape": list(slab.shape),
        "moment0Unit": str(moment0.unit),
        "moment1Unit": str(moment1.unit),
    })


def main() -> None:
    coord = None
    try:
        coord = resolve_target()
        manifest["coordinates"] = {
            "icrs": {"raDeg": coord.ra.deg, "decDeg": coord.dec.deg},
            "galactic": {"lDeg": coord.galactic.l.deg, "bDeg": coord.galactic.b.deg},
        }
    except Exception as exc:
        record_error("astroquery.simbad", exc)

    if coord is not None:
        try:
            build_gaia(coord)
        except Exception as exc:
            record_error("astroquery.gaia", exc)
        try:
            build_sky_images(coord)
        except Exception as exc:
            record_error("astroquery.skyview", exc)

    try:
        build_jpl()
    except Exception as exc:
        record_error("astroquery.jplhorizons", exc)

    try:
        build_spectral_cube()
    except Exception as exc:
        record_error("spectral-cube", exc)

    save_json("manifest.json", manifest)
    print(json.dumps({"ok": True, "output": str(OUT), "capabilities": manifest["capabilities"], "errors": manifest["errors"]}, indent=2))


if __name__ == "__main__":
    main()
