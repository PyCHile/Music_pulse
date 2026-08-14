import * as THREE from 'three';
import { CloudNebulaVolume as Base } from './CloudNebulaVolumeV59.js?v=20260814-61';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class CloudNebulaVolume extends Base{
 constructor(){
  super();
  this.v65DensityGain=this.mobile?1.16:1.22;
  this.v65SizeGain=this.mobile?1.13:1.18;
  this.v65ChromaGain=1.16;
  this.v65OpacityGain=this.mobile?1.18:1.24;
  for(const q of this.volumes){
   const size=q.geometry.getAttribute('aSize'),density=q.geometry.getAttribute('aDensity'),glow=q.geometry.getAttribute('aGlow'),color=q.geometry.getAttribute('color');
   for(let i=0;i<size.count;i++){
    size.setX(i,size.getX(i)*this.v65SizeGain);
    density.setX(i,clamp(density.getX(i)*this.v65DensityGain+(q.emissive?.025:.045),0,1.05));
    glow.setX(i,clamp(glow.getX(i)*(q.emissive?1.10:1.06),0,1.10));
    const r=color.getX(i),g=color.getY(i),b=color.getZ(i),avg=(r+g+b)/3;
    color.setXYZ(i,clamp((avg+(r-avg)*this.v65ChromaGain)*1.035,0,1.35),clamp((avg+(g-avg)*this.v65ChromaGain)*1.035,0,1.35),clamp((avg+(b-avg)*this.v65ChromaGain)*1.035,0,1.35));
   }
   size.needsUpdate=true;density.needsUpdate=true;glow.needsUpdate=true;color.needsUpdate=true;
   q.points.scale.set(1.06,1.04,1.12);
  }
 }
 update(dt,state){
  super.update(dt,state);
  let actualMax=0;
  for(const q of this.volumes){
   const z=q.points.position.z,near=Math.exp(-Math.pow((z+8)/31,2)),u=q.material.uniforms.uOpacity;
   const lift=near*(q.emissive?.018:.034),gain=q.emissive?1.12:this.v65OpacityGain;
   u.value=clamp(u.value*gain+lift,0,q.emissive?.90:1.0);
   actualMax=Math.max(actualMax,u.value);
  }
  this.maxOpacity=actualMax;
  this.peakOpacity=Math.max(this.peakOpacity,actualMax);
 }
 get stats(){
  return{
   ...super.stats,
   perceptualRevision:'v65-dense-colored-gas',
   densityGain:this.v65DensityGain,
   sizeGain:this.v65SizeGain,
   chromaGain:this.v65ChromaGain,
   nearAlphaLift:true,
   cameraVolumeExpansion:true
  };
 }
}
