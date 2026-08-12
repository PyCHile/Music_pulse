/*
 * URUX JavaScript port of selected Celestia photometric routines.
 * Source: https://github.com/celestiaproject/Celestia
 * Original copyright (C) 2001-present, Celestia Development Team.
 * Original version by Chris Laurel <claurel@gmail.com>.
 * Licensed under GNU GPL v2 or later.
 *
 * This file intentionally preserves the core formulas used by Celestia for
 * magnitude <-> irradiance conversion and bright-star soft clipping.
 */

export const CELESTIA_LN_MAG = 1.0857362;
export const CELESTIA_LY_PER_PARSEC = 3.2615637771674336;
export const CELESTIA_SOLAR_ABSMAG = 4.81;
export const CELESTIA_SOLAR_TEMPERATURE = 5772.0;

export function magToIrradiance(mag) {
  return Math.exp(-mag / CELESTIA_LN_MAG); // 10^(-0.4 * mag)
}

export function irradianceToMag(irradiance) {
  return -Math.log(Math.max(1e-30, irradiance)) * CELESTIA_LN_MAG;
}

export function distanceModulus(lightYears) {
  return 5 * Math.log10(Math.max(1e-12, lightYears) / CELESTIA_LY_PER_PARSEC) - 5;
}

export function absToAppMag(absMag, lightYears) {
  return absMag + distanceModulus(lightYears);
}

export function appToAbsMag(appMag, lightYears) {
  return appMag - distanceModulus(lightYears);
}

export function absMagToLum(absMag) {
  return Math.exp((CELESTIA_SOLAR_ABSMAG - absMag) / CELESTIA_LN_MAG);
}

export function reflectedLuminosity(sunLuminosity, distanceFromSun, objectRadius) {
  const ratio = objectRadius / Math.max(1e-9, distanceFromSun);
  return sunLuminosity * 0.25 * ratio * ratio;
}

// Port of the hyperbolic dim-gate used by Celestia's PSF star renderer.
export function celestiaDimGateSoftClip(peakRadiance, dimGate) {
  if (peakRadiance <= dimGate) return 0;
  return Math.sqrt(peakRadiance * peakRadiance - dimGate * dimGate);
}

// Port of Celestia's bounded glow peak calculation used to prevent runaway bloom.
export function celestiaGlowSoftClip(peakRadiance, maxIrradiance) {
  if (!(maxIrradiance > 0)) return peakRadiance;
  return (1 - 1 / (peakRadiance / maxIrradiance + 1)) * maxIrradiance;
}

export function normalizedStellarRadiance(apparentMagnitude, exposure = 1, dimGate = 0.0015, maxIrradiance = 7.5) {
  const irradiance = magToIrradiance(apparentMagnitude);
  const peak = celestiaDimGateSoftClip(exposure * irradiance, dimGate);
  return celestiaGlowSoftClip(peak, maxIrradiance);
}

// Celestia's legacy enhanced temperature table, kept as an optional rendering mode.
// Values are sampled every 1000K from the original StarColors_Enhanced table.
const ENHANCED_STAR_COLORS = [
  [0,0,0],[.75,.20,.20],[1,.40,.40],[1,.70,.70],[1,.90,.70],[1,1,.75],[1,1,.88],[1,1,.95],[1,1,1],
  [.95,.98,1],[.90,.95,1],[.85,.93,1],[.80,.90,1],[.79,.89,1],[.78,.88,1],[.77,.87,1],[.76,.86,1],
  [.75,.85,1],[.74,.84,1],[.73,.83,1],[.72,.82,1],[.71,.81,1],[.70,.80,1],[.69,.79,1],[.68,.78,1],
  [.67,.77,1],[.66,.76,1],[.65,.75,1],[.65,.75,1],[.64,.74,1],[.64,.74,1],[.63,.73,1],[.63,.73,1],
  [.62,.72,1],[.62,.72,1],[.61,.71,1],[.61,.71,1],[.60,.70,1],[.60,.70,1],[.60,.70,1],[.60,.70,1]
];

export function celestiaEnhancedTemperatureColor(kelvin) {
  const k = Math.max(0, Math.min(40000, kelvin));
  const x = k / 1000;
  const i0 = Math.floor(x);
  const i1 = Math.min(40, i0 + 1);
  const t = x - i0;
  const a = ENHANCED_STAR_COLORS[i0];
  const b = ENHANCED_STAR_COLORS[i1];
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}
