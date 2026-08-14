import * as THREE from 'three';
import { VolumetricNebulaRaymarcher as Base } from './VolumetricNebulaRaymarcherV53.js?v=20260813-53';

export class VolumetricNebulaRaymarcher extends Base{
 constructor(){
  super();
  const u=this.material.uniforms;
  u.uNarrativeBlend.value=.84;
  u.uNarrativeColor0.value=new THREE.Color('#2f7ed7');
  u.uNarrativeColor1.value=new THREE.Color('#ad54df');
  u.uNarrativeColor2.value=new THREE.Color('#ef6857');
  u.uNarrativeFilaments.value=.86;
  u.uNarrativeDarkZone.value=.48;
  u.uScattering.value=1.28;
  u.uEmission.value=1.20;
  u.uExtinction.value=1.06;
  this.perceptualRevision='v65-high-presence-raymarch';
 }
 update(dt,state,features){
  super.update(dt,state,features);
  const u=this.material.uniforms,floor=this.mobile?.28:.26,cap=this.mobile?.60:.68;
  u.uVisibility.value=Math.min(cap,Math.max(floor,u.uVisibility.value*1.055+.012));
  u.uNarrativeBlend.value=Math.max(.80,u.uNarrativeBlend.value);
  u.uNarrativeFilaments.value=Math.max(.82,u.uNarrativeFilaments.value);
  u.uNarrativeDarkZone.value=Math.min(.52,u.uNarrativeDarkZone.value);
  u.uScattering.value=Math.max(1.20,u.uScattering.value);
  u.uEmission.value=Math.max(1.14,u.uEmission.value);
  u.uExtinction.value=Math.max(1.00,u.uExtinction.value);
 }
}
