# Third-party code and data used by URUX

URUX intentionally incorporates and adapts code/data from the following open-source projects.

## Celestia

Upstream: https://github.com/celestiaproject/Celestia

License: GNU General Public License, version 2 or (at your option) any later version.

Copyright: Celestia Development Team; portions originally by Chris Laurel.

URUX-derived files include `runtime/thirdparty/CelestiaPhotometry.js` and `src/thirdparty/CelestiaPhotometry.ts`. They port selected magnitude/irradiance conversion, reflected-luminosity, stellar temperature-color, and PSF/glow soft-clipping logic from Celestia sources including `src/celastro/astro.cpp`, `src/celastro/astro.h`, `src/celengine/pointstarrenderer.cpp`, and `src/celengine/starcolors.cpp`/`.h`.

Because URUX contains GPL-derived Celestia code, URUX is distributed under GPL-2.0-or-later.

## TrueColorTools

Upstream: https://github.com/Askaniy/TrueColorTools

License: MIT License.

Copyright (c) 2024 Askaniy Anpilogov.

URUX-derived files include `runtime/thirdparty/TrueColorToolsColor.js` and `src/thirdparty/TrueColorToolsColor.ts`. They port the `ColorSystem` approach, RGB-primary/white-point matrix construction, Bradford chromatic adaptation, out-of-gamut handling and sRGB gamma behavior from TrueColorTools. URUX also vendors CIE 1931 2-degree color-matching data and selected visible-range planetary spectral/albedo samples from the TrueColorTools repository under `assets/truecolor/`.

MIT notice:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to inclusion of the copyright and permission notice. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

## webgpu-galaxy

Upstream: https://github.com/dgreenheck/webgpu-galaxy

License: MIT License.

Copyright (c) 2025 dgreenheck.

URUX-derived files include `runtime/thirdparty/WebGPUGalaxyModel.js` and `src/thirdparty/WebGPUGalaxyModel.ts`. The WebGPU/TSL execution backend is adapted to CPU/WebGL for iPad compatibility, while retaining the upstream structural equations for pseudo-random hashing, radial distribution, spiral-arm assignment, spiral angle, arm/random offsets, vertical thickness and differential rotation. Those routines drive `DeepSpaceSectorSystem`.

MIT notice:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to inclusion of the copyright and permission notice. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
