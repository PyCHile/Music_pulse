import { VolumetricNebulaRaymarcher as Base } from './VolumetricNebulaRaymarcherV65.js?v=20260814-65.3';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class VolumetricNebulaRaymarcher extends Base{
 constructor(){super();this.perceptualRevision='v66-music-directed-raymarch';this.musicDirected=true;this.whiteoutProtection=true;this.lastDirectorScale=.04;}
 update(dt,state,features){super.update(dt,state,features);const u=this.material.uniforms,scale=clamp(state?.nebulaDirectorScale??.04,.035,.82),budget=clamp(state?.visualBudget??1,.72,1),visibilityFactor=.10+scale*.90;this.lastDirectorScale=scale;u.uVisibility.value=clamp(u.uVisibility.value*visibilityFactor*budget,.012,this.mobile?.38:.42);u.uScattering.value=clamp(u.uScattering.value*(.84+scale*.16),.82,1.08);u.uEmission.value=clamp(u.uEmission.value*(.80+scale*.20),.78,1.03);}
}