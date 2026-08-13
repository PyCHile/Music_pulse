import * as THREE from 'three';
import { VolumetricNebulaRaymarcher as BaseRaymarcher } from './VolumetricNebulaRaymarcher.js?v=20260813-49';

export class VolumetricNebulaRaymarcher extends BaseRaymarcher{
  constructor(){
    super();
    if(!this.mobile)return;
    const u=this.material.uniforms;
    u.uNarrativeBlend.value=.38;
    u.uNarrativeColor0.value=new THREE.Color('#285fa8');
    u.uNarrativeColor1.value=new THREE.Color('#8d55bd');
    u.uNarrativeColor2.value=new THREE.Color('#dd6a2f');
    u.uNarrativeFilaments.value=.58;
    u.uNarrativeDarkZone.value=.48;
    u.uScattering.value=.92;
    u.uEmission.value=.88;
  }
  update(dt,state,features){
    super.update(dt,state,features);
    if(!this.mobile)return;
    const u=this.material.uniforms,nebula=state.nebulaPresence||0,reveal=state.galaxyReveal||0,tunnel=state.tunnelDrive||0,light=state.livingLight||0;
    u.uVisibility.value=Math.min(.38,.19+nebula*.10+reveal*.075+tunnel*.035+light*.025+(features?.mid||0)*.008);
    u.uScattering.value=.90+reveal*.20+light*.12;
    u.uEmission.value=.82+reveal*.24+light*.22;
    u.uExtinction.value=.76+nebula*.20+(state.dustDensity||0)*.12;
  }
}
