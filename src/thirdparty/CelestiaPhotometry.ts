/*
 * URUX TypeScript port of the Celestia stellar photometry used by the active
 * deep-space renderer.
 * Source: https://github.com/celestiaproject/Celestia
 * Original copyright (C) 2001-present, Celestia Development Team.
 * Original version by Chris Laurel <claurel@gmail.com>.
 * Licensed under GNU GPL v2 or later.
 */
export const CELESTIA_LN_MAG=1.0857362;
export const magToIrradiance=(mag:number)=>Math.exp(-mag/CELESTIA_LN_MAG);
export function celestiaDimGateSoftClip(peak:number,gate:number){return peak<=gate?0:Math.sqrt(peak*peak-gate*gate)}
export function celestiaGlowSoftClip(peak:number,maxIrr:number){return maxIrr>0?(1-1/(peak/maxIrr+1))*maxIrr:peak}
export function normalizedStellarRadiance(appMag:number,exposure=1,dimGate=.0015,maxIrradiance=7.5){return celestiaGlowSoftClip(celestiaDimGateSoftClip(exposure*magToIrradiance(appMag),dimGate),maxIrradiance)}
const C:number[][]=[[0,0,0],[.75,.20,.20],[1,.40,.40],[1,.70,.70],[1,.90,.70],[1,1,.75],[1,1,.88],[1,1,.95],[1,1,1],[.95,.98,1],[.90,.95,1],[.85,.93,1],[.80,.90,1],[.79,.89,1],[.78,.88,1],[.77,.87,1],[.76,.86,1],[.75,.85,1],[.74,.84,1],[.73,.83,1],[.72,.82,1],[.71,.81,1],[.70,.80,1],[.69,.79,1],[.68,.78,1],[.67,.77,1],[.66,.76,1],[.65,.75,1],[.65,.75,1],[.64,.74,1],[.64,.74,1],[.63,.73,1],[.63,.73,1],[.62,.72,1],[.62,.72,1],[.61,.71,1],[.61,.71,1],[.60,.70,1],[.60,.70,1],[.60,.70,1],[.60,.70,1]];
export function celestiaEnhancedTemperatureColor(k:number):[number,number,number]{const x=Math.max(0,Math.min(40000,k))/1000,i0=Math.floor(x),i1=Math.min(40,i0+1),t=x-i0,a=C[i0],b=C[i1];return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
