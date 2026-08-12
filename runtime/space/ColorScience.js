const clamp01=v=>Math.max(0,Math.min(1,v));
const gammaEncode=v=>v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055;
export function xyYToSRGB(x,y,Y=1){const safeY=Math.max(1e-5,y),X=x*Y/safeY,Z=(1-x-y)*Y/safeY;const r=3.2404542*X-1.5371385*Y-.4985314*Z,g=-.9692660*X+1.8760108*Y+.0415560*Z,b=.0556434*X-.2040259*Y+1.0572252*Z;return[clamp01(gammaEncode(Math.max(0,r))),clamp01(gammaEncode(Math.max(0,g))),clamp01(gammaEncode(Math.max(0,b)))];}
export function temperatureToSRGB(kelvin){const T=Math.max(1700,Math.min(25000,kelvin));let x;if(T<=4000)x=-.2661239e9/(T*T*T)-.2343580e6/(T*T)+.8776956e3/T+.179910;else x=-3.0258469e9/(T*T*T)+2.1070379e6/(T*T)+.2226347e3/T+.240390;let y;if(T<=2222)y=-1.1063814*x*x*x-1.34811020*x*x+2.18555832*x-.20219683;else if(T<=4000)y=-.9549476*x*x*x-1.37418593*x*x+2.09137015*x-.16748867;else y=3.0817580*x*x*x-5.87338670*x*x+3.75112997*x-.37001483;return xyYToSRGB(x,y,1);}
export function rgbToHex(rgb){const c=rgb.map(v=>Math.round(clamp01(v)*255).toString(16).padStart(2,'0'));return Number.parseInt(c.join(''),16);}
export function rgbCss(rgb,a=1){const c=rgb.map(v=>Math.round(clamp01(v)*255));return`rgba(${c[0]},${c[1]},${c[2]},${a})`;}
export const TRUE_COLOR_PALETTES={
 ionizedBlue:xyYToSRGB(.245,.245,.72),
 oxygenTeal:xyYToSRGB(.265,.335,.54),
 hydrogenRose:xyYToSRGB(.385,.285,.58),
 amberDust:xyYToSRGB(.445,.395,.42),
 iceBlue:xyYToSRGB(.285,.305,.64),
 stone:xyYToSRGB(.355,.345,.40),
 methaneBlue:xyYToSRGB(.245,.285,.52)
};
