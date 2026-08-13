#!/usr/bin/env python3
from __future__ import annotations

import json
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import aplpy
import astropy
import astropy.units as u
from astropy.coordinates import SkyCoord
from astropy.visualization import ImageNormalize, ZScaleInterval, AsinhStretch
from astropy.visualization.wcsaxes import WCSAxes
from astropy.wcs import WCS
from astroquery.gaia import Gaia
from astroquery.jplhorizons import Horizons
from reproject import reproject_interp
from spectral_cube import SpectralCube


def main() -> int:
    w = WCS(naxis=2)
    w.wcs.crpix = [16, 16]
    w.wcs.cdelt = [-0.001, 0.001]
    w.wcs.crval = [83.82208, -5.39111]
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    image = np.arange(1024, dtype=float).reshape(32, 32)
    reproj, footprint = reproject_interp((image, w), w, shape_out=image.shape)
    norm = ImageNormalize(reproj, interval=ZScaleInterval(), stretch=AsinhStretch())
    fig = plt.figure()
    ax = fig.add_subplot(111, projection=w)
    assert isinstance(ax, WCSAxes)
    ax.imshow(reproj, origin="lower", norm=norm)
    plt.close(fig)

    assert SkyCoord(0 * u.deg, 0 * u.deg, frame="galactic").icrs is not None
    assert Gaia is not None and Horizons is not None
    assert aplpy is not None and SpectralCube is not None
    assert np.mean(footprint) > 0.99

    print(json.dumps({
        "ok": True,
        "astropy": astropy.__version__,
        "numpy": np.__version__,
        "wcsaxes": True,
        "reproject": True,
        "astroquery": True,
        "aplpy": True,
        "spectralCube": True,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
