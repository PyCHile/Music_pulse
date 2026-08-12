/*
 * URUX browser port of the TrueColorTools color-processing core.
 * Source: https://github.com/Askaniy/TrueColorTools
 * Copyright (c) 2024 Askaniy Anpilogov
 * MIT License.
 *
 * Ported concepts/code structure:
 * - CIE 1931 XYZ color processing
 * - RGB primary/white-point matrix construction
 * - Bradford chromatic adaptation
 * - out-of-gamut desaturation
 * - sRGB gamma correction
 * The CIE 1931 2-degree CMF data files are vendored under assets/truecolor/.
 */

const MATRIX_B = [
  [ 0.8951000,  0.2664000, -0.1614000],
  [-0.7502000,  1.7135000,  0.0367000],
  [ 0.0389000, -0.0685000,  1.0296000]
];
const MATRIX_B_INV = [
  [ 0.9869929, -0.1470543,  0.1599627],
  [ 0.4323053,  0.5183603,  0.0492912],
  [-0.0085287,  0.0400428,  0.9684867]
];

export const SUPPORTED_COLOR_SPACES = {
  'CIE 1931 XYZ': {primaries:[[1,0],[0,1],[0,0]],white:'Illuminant E'},
  'sRGB': {primaries:[[.64,.33],[.30,.60],[.15,.06]],white:'Illuminant D65'},
  'Display P3': {primaries:[[.68,.32],[.265,.69],[.15,.06]],white:'Illuminant D65'},
  'UHDTV': {primaries:[[.708,.292],[.170,.797],[.13,.046]],white:'Illuminant D65'}
};
export const SUPPORTED_WHITE_POINTS = {
  'Illuminant D50':[.34567,.35850],
  'Illuminant D55':[.33242,.34743],
  'Illuminant D65':[.31272,.32903],
  'Illuminant D75':[.29902,.31485],
  'Illuminant E':[1/3,1/3]
};

const mul3=(a,b)=>[
  a[0][0]*b[0][0]+a[0][1]*b[1][0]+a[0][2]*b[2][0],a[0][0]*b[0][1]+a[0][1]*b[1][1]+a[0][2]*b[2][1],a[0][0]*b[0][2]+a[0][1]*b[1][2]+a[0][2]*b[2][2],
  a[1][0]*b[0][0]+a[1][1]*b[1][0]+a[1][2]*b[2][0],a[1][0]*b[0][1]+a[1][1]*b[1][1]+a[1][2]*b[2][1],a[1][0]*b[0][2]+a[1][1]*b[1][2]+a[1][2]*b[2][2],
  a[2][0]*b[0][0]+a[2][1]*b[1][0]+a[2][2]*b[2][0],a[2][0]*b[0][1]+a[2][1]*b[1][1]+a[2][2]*b[2][1],a[2][0]*b[0][2]+a[2][1]*b[1][2]+a[2][2]*b[2][2]
].reduce((m,v,i)=>{(m[Math.floor(i/3)]??=[])[i%3]=v;return m;},[]);
const mulVec=(m,v)=>[
  m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],
  m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],
  m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]
];
const diag=(v)=>[[v[0],0,0],[0,v[1],0],[0,0,v[2]]];
function inv3(m){const a=m[0][0],b=m[0][1],c=m[0][2],d=m[1][0],e=m[1][1],f=m[1][2],g=m[2][0],h=m[2][1],i=m[2][2],A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,D=-(b*i-c*h),E=a*i-c*g,F=-(a*h-b*g),G=b*f-c*e,H=-(a*f-c*d),I=a*e-b*d,det=a*A+b*B+c*C,k=1/det;return[[A*k,D*k,G*k],[B*k,E*k,H*k],[C*k,F*k,I*k]];}
function xyToXYZ([x,y]){return[x/y,1,(1-x-y)/y];}

export class ColorSystem {
  constructor(colorSpace='sRGB', adaptationWhitePoint=''){
    const spec=SUPPORTED_COLOR_SPACES[colorSpace];
    if(!spec)throw new Error(`Unsupported color space: ${colorSpace}`);
    this.colorSpaceName=colorSpace;this.whitePointName=adaptationWhitePoint;
    const p=spec.primaries;
    const M=[[p[0][0],p[1][0],p[2][0]],[p[0][1],p[1][1],p[2][1]],[1-p[0][0]-p[0][1],1-p[1][0]-p[1][1],1-p[2][0]-p[2][1]]];
    const WP=xyToXYZ(SUPPORTED_WHITE_POINTS[spec.white]);
    const Minv=inv3(M),S=mulVec(Minv,WP);
    this.matrix=mul3(M,diag(S));
    this.invMatrix=inv3(this.matrix);
    if(adaptationWhitePoint&&adaptationWhitePoint!==spec.white){
      const WPa=xyToXYZ(SUPPORTED_WHITE_POINTS[adaptationWhitePoint]);
      const Bi=mulVec(MATRIX_B,WP),Ba=mulVec(MATRIX_B,WPa),A=[Bi[0]/Ba[0],Bi[1]/Ba[1],Bi[2]/Ba[2]];
      this.matrix=mul3(mul3(mul3(MATRIX_B,diag(A.map(v=>1/v))),MATRIX_B_INV),this.matrix);
      this.invMatrix=inv3(this.matrix);
    }
  }
  xyzToRgb(xyz){return mulVec(this.invMatrix,xyz);}
  rgbToXyz(rgb){return mulVec(this.matrix,rgb);}
}

export const sRGBSystem = new ColorSystem('sRGB');
export const displayP3System = new ColorSystem('Display P3');

export function desaturateOutOfGamut(rgb){const min=Math.min(...rgb);return min<0?rgb.map(v=>v-min):rgb.slice();}
export function applySRGBGamma(value){const v=Math.max(0,value);return v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055;}
export function normalizeRgb(rgb){const m=Math.max(...rgb,1e-12);return rgb.map(v=>v/m);}
export function xyzToSRGB(xyz,{maximizeBrightness=true,gammaCorrection=true}={}){let rgb=desaturateOutOfGamut(sRGBSystem.xyzToRgb(xyz));if(maximizeBrightness)rgb=normalizeRgb(rgb);if(gammaCorrection)rgb=rgb.map(applySRGBGamma);return rgb.map(v=>Math.max(0,Math.min(1,v)));}

function parseTwoColumn(text){return text.trim().split(/\r?\n/).map(line=>line.trim().split(/\s+/).slice(0,2).map(Number)).filter(v=>v.length===2&&Number.isFinite(v[0])&&Number.isFinite(v[1]));}
let cmfPromise=null;
export function loadCIE1931CMF(){if(cmfPromise)return cmfPromise;cmfPromise=Promise.all(['x','y','z'].map(axis=>fetch(`./assets/truecolor/CIE_1931_2deg.${axis}.txt?v=1`).then(r=>{if(!r.ok)throw new Error(`CMF ${axis} ${r.status}`);return r.text();}).then(parseTwoColumn))).then(([x,y,z])=>({x,y,z}));return cmfPromise;}
function interp(samples,nm){if(nm<samples[0][0]||nm>samples[samples.length-1][0])return 0;let lo=0,hi=samples.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid][0]<=nm)lo=mid;else hi=mid;}const a=samples[lo],b=samples[hi],t=(nm-a[0])/(b[0]-a[0]||1);return a[1]+(b[1]-a[1])*t;}
export function parseSpectrumText(text,{wavelengthUnit='nm'}={}){const factor=wavelengthUnit==='um'?1000:wavelengthUnit==='angstrom'?0.1:1;return parseTwoColumn(text).map(([w,v])=>[w*factor,v]);}
export async function spectrumToXYZ(samples){const cmf=await loadCIE1931CMF();let X=0,Y=0,Z=0,weight=0;for(let i=0;i<samples.length;i++){const[nm,v]=samples[i];if(nm<360||nm>830)continue;const step=i===0?(samples[1]?.[0]-nm||5):i===samples.length-1?(nm-samples[i-1][0]||5):(samples[i+1][0]-samples[i-1][0])*.5;X+=v*interp(cmf.x,nm)*step;Y+=v*interp(cmf.y,nm)*step;Z+=v*interp(cmf.z,nm)*step;weight+=Math.max(0,v)*step;}const denom=Math.max(1e-12,Y);return[X/denom,1,Z/denom];}
export async function spectrumToSRGB(samples,options){return xyzToSRGB(await spectrumToXYZ(samples),options);}
export async function spectralTextToSRGB(text,parseOptions={},colorOptions={}){return spectrumToSRGB(parseSpectrumText(text,parseOptions),colorOptions);}
export function rgbToHex(rgb){return Number.parseInt(rgb.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join(''),16);}
