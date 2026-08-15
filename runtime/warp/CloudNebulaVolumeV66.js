import { CloudNebulaVolume as Base } from './CloudNebulaVolumeV65.js?v=20260814-65.3';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class CloudNebulaVolume extends Base{
 constructor(){super();this.v66PeakOpacity=0;this.v66LastScale=.04;}
 update(dt,state){super.update(dt,state);const directorScale=clamp(state?.nebulaDirectorScale??.04,.035,.82),budget=clamp(state?.visualBudget??1,.72,1);this.v66LastScale=directorScale;let actualMax=0;for(const q of this.volumes){const cap=q.emissive?.34:.58,u=q.material.uniforms.uOpacity;u.value=clamp(u.value*directorScale*budget,0,cap);actualMax=Math.max(actualMax,u.value);}this.maxOpacity=actualMax;this.v66PeakOpacity=Math.max(this.v66PeakOpacity,actualMax);this.peakOpacity=this.v66PeakOpacity;}
 get stats(){return{...super.stats,perceptualRevision:'v66-directed-crescendo-gas',musicDirected:true,crescendoDriven:true,whiteoutProtection:true,directorScale:+this.v66LastScale.toFixed(3),peakOpacity:+this.v66PeakOpacity.toFixed(3),opacityCapNormal:.58,opacityCapEmissive:.34};}
}