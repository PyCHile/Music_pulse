import * as THREE from 'three';
import { CinematicEncounterSystem as Base } from './CinematicEncounterSystemV65.js?v=20260814-65.3';

const clamp01=v=>Math.max(0,Math.min(1,v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const BASE_AXIS=new THREE.Vector3(0,0,1);

function routeDefinitionV66(mode,side){
 if(mode==='overtake')return{x0:side*1.35,x1:side*2.15,y0:-1.55,y1:-2.20,arc:side*.10,z0:-108,z1:9,travelMs:9200,close:true};
 if(mode==='near-field-pass')return{x0:-side*4.8,x1:side*5.1,y0:side*1.45,y1:-side*.95,arc:-side*.34,z0:-90,z1:7,travelMs:8200,close:true};
 if(mode==='diagonal-cross')return{x0:-side*7.4,x1:side*7.6,y0:side*2.6,y1:-side*2.0,arc:side*.52,z0:-98,z1:8,travelMs:8400,close:true};
 if(mode==='distant-cross')return{x0:-side*13.5,x1:side*12.8,y0:side*4.2,y1:-side*3.4,arc:side*1.15,z0:-132,z1:-24,travelMs:9800,close:false};
 return{x0:-side*6.2,x1:side*6.5,y0:side*1.8,y1:-side*1.2,arc:-side*.44,z0:-102,z1:5,travelMs:9000,close:true};
}
function routePosition(r,p,out=new THREE.Vector3()){
 const arc=Math.sin(p*Math.PI)*r.arc;return out.set(lerp(r.x0,r.x1,p),lerp(r.y0,r.y1,p)+arc,lerp(r.z0,r.z1,p));
}

export class CinematicEncounterSystem extends Base{
 constructor(scene,renderer=null){
  super(scene,renderer);this.rendererRef=renderer;this.tuneTailGeometry();
  const s=this.stats.cometRoute;s.kinematics='relative-velocity-aligned-v66';s.wallClockKinematics=true;s.tailFollowsRelativeVelocity=true;s.tailBehindMotion=true;s.tailAlignmentCosine=null;s.guaranteedRouteMode='overtake';s.guaranteedCloseRoute=true;s.guaranteedActualCameraCrossing=false;s.actualCameraCrossings=0;s.actualCrossingPose=null;s.whiteoutProtected=true;s.physicalCorePriority=true;s.musicGated=true;s.musicGateRetries=0;s.suppressedIntroEvents=0;s.cometBrightnessCap=.58;s.tailParticleSizeGain={ion:.58,dust:.50};
  this.stats.musicDirection={revision:'v66-music-crescendo-director',lastSection:'INTRO',eventReadiness:0};
 }
 musicContext(){return this.scene?.userData?.uruxMusicDirection||{section:'INTRO',progress:0,macroArc:.08,visualEnergy:.05,nebulaScale:.04,cometIntensity:.30,eventReadiness:0,allowCloseComet:false};}
 tuneTailGeometry(){
  const tune=(geometry,sizeGain,kind)=>{const size=geometry?.getAttribute?.('aSize'),color=geometry?.getAttribute?.('color');if(size&&!geometry.userData?.v66Sized){for(let i=0;i<size.count;i++)size.setX(i,size.getX(i)*sizeGain);size.needsUpdate=true;geometry.userData.v66Sized=true;}if(color&&!geometry.userData?.v66Colored){for(let i=0;i<color.count;i++){let r=color.getX(i),g=color.getY(i),b=color.getZ(i);if(kind==='ion'){r*=.62;g*=.78;b=Math.min(1,b*.96);}else{r*=.70;g*=.62;b*=.50;}color.setXYZ(i,r,g,b);}color.needsUpdate=true;geometry.userData.v66Colored=true;}};
  tune(this.ionTailGeometry,.58,'ion');tune(this.dustTailGeometry,.50,'dust');
 }
 scheduleGuaranteedComet(delay=1200){
  clearTimeout(this._guaranteeTimer);const first=!this._v66GuaranteeScheduled;this._v66GuaranteeScheduled=true,wait=first?10000:Math.max(850,delay);
  this._guaranteeTimer=setTimeout(()=>{if(this._guaranteeStopped||this.stats?.cometRoute?.guaranteeSpawned)return;const ctx=this.musicContext();if(!ctx.allowCloseComet){if(this.stats?.cometRoute)this.stats.cometRoute.musicGateRetries=(this.stats.cometRoute.musicGateRetries||0)+1;this.scheduleGuaranteedComet(900);return;}if(!this.spawnGuaranteedComet())this.scheduleGuaranteedComet(900);},wait);
 }
 spawnEncounter(e,meta={source:'llm'}){
  const ctx=this.musicContext(),type=e?.objectType,guaranteed=meta?.source==='procedural-guaranteed';
  if(type==='comet'&&!guaranteed&&!ctx.allowCloseComet){if(this.stats?.cometRoute)this.stats.cometRoute.suppressedIntroEvents=(this.stats.cometRoute.suppressedIntroEvents||0)+1;return false;}
  if(type==='planet'&&ctx.section==='INTRO'&&e?.focalApproach){this.stats.musicDirection.suppressedIntroPlanets=(this.stats.musicDirection.suppressedIntroPlanets||0)+1;return false;}
  const payload=type==='comet'?{...e,luminosity:Math.min(.46,Number(e?.luminosity)||.42),scale:Math.min(1.08,Math.max(.88,Number(e?.scale)||.96))}:e;
  return super.spawnEncounter(payload,meta);
 }
 createComet(){
  const root=super.createComet(),ion=root.userData.ionTail,dust=root.userData.dustTail,coma=root.userData.coma,halo=root.userData.comaHalo,jets=root.userData.jets;
  for(const mesh of root.userData.surfaceMeshes||[]){const m=mesh.material;if(!m)continue;m.color.set(0x3a3c3d);m.emissive?.set?.(0x010203);m.emissiveIntensity=.012;m.roughness=1;m.metalness=0;m.opacity=1;}
  if(ion?.material){ion.material.blending=THREE.AdditiveBlending;ion.material.depthTest=true;ion.material.needsUpdate=true;if(ion.material.uniforms?.uOpacity)ion.material.uniforms.uOpacity.value=.18;}
  if(dust?.material){dust.material.blending=THREE.NormalBlending;dust.material.depthTest=true;dust.material.needsUpdate=true;if(dust.material.uniforms?.uOpacity)dust.material.uniforms.uOpacity.value=.09;}
  if(coma?.material){coma.material.blending=THREE.NormalBlending;coma.material.opacity=.055;coma.material.color.set(0xaec2cf);coma.material.needsUpdate=true;coma.scale.setScalar(3.1);}
  if(halo?.material){halo.material.blending=THREE.NormalBlending;halo.material.opacity=.010;halo.material.color.set(0x809aaa);halo.material.needsUpdate=true;halo.scale.setScalar(5.4);}
  if(jets)for(const j of jets.children){if(j.material){j.material.opacity=.012;j.material.blending=THREE.NormalBlending;j.material.needsUpdate=true;}}
  root.userData.enhancements?.push('V66 núcleo oscuro prioritario','cola iónica fina y cola de polvo separada','luminancia local limitada','cola alineada al vector de velocidad relativa');
  return root;
 }
 applyCometRoute(a){
  super.applyCometRoute(a);const guaranteed=String(a?.id||'').startsWith('guaranteed-route-comet-'),mode=guaranteed?'overtake':(a.routeMode||'near-field-pass'),side=a.passSide||1,def=routeDefinitionV66(mode,side);
  if(a.routeV65)a.routeV65.close=false;
  a.routeMode=mode;a.root.userData.routeMode=mode;a.root.position.set(def.x0,def.y0,def.z0);a.routeV66={...def,mode,side,guaranteed,wallStart:performance.now(),crossed:false,centerlineCounted:false,oriented:false,lastVelocity:new THREE.Vector3(0,0,1)};
  this.stats.cometRoute.lastMode=mode;this.stats.cometRoute.guaranteedRouteMode='overtake';a.root.userData.enhancements?.push(guaranteed?'V66 adelantamiento superior garantizado':'V66 ruta física musical','cola siempre detrás del desplazamiento relativo');
 }
 update(dt){
  super.update(dt);const now=performance.now(),ctx=this.musicContext();this.stats.musicDirection.lastSection=ctx.section;this.stats.musicDirection.eventReadiness=+Number(ctx.eventReadiness||0).toFixed(3);let maxNear=0;
  for(const a of this.active){if(a.type!=='comet'||!a.routeV66)continue;const r=a.routeV66,raw=clamp01((now-r.wallStart)/r.travelMs),p=smooth01(raw),pos=routePosition(r,p),p2=Math.min(1,p+.006),next=routePosition(r,p2),velocity=next.clone().sub(pos);if(velocity.lengthSq()<1e-7)velocity.copy(r.lastVelocity);else r.lastVelocity.copy(velocity);const velocityDir=velocity.normalize();a.root.position.copy(pos);const targetQ=new THREE.Quaternion().setFromUnitVectors(BASE_AXIS,velocityDir);if(!r.oriented){a.root.quaternion.copy(targetQ);r.oriented=true;}else a.root.quaternion.slerp(targetQ,1-Math.exp(-9*Math.max(.001,dt)));
   const tailBack=new THREE.Vector3(0,0,-1).applyQuaternion(a.root.quaternion).normalize(),alignment=tailBack.dot(velocityDir.clone().multiplyScalar(-1));this.stats.cometRoute.tailAlignmentCosine=+alignment.toFixed(3);
   const z=pos.z,near=Math.exp(-Math.pow((z+12)/25,2)),intensity=clamp(ctx.cometIntensity??.34,.28,.58),ion=a.root.userData.ionTail,dust=a.root.userData.dustTail,coma=a.root.userData.coma,halo=a.root.userData.comaHalo,jets=a.root.userData.jets;
   maxNear=Math.max(maxNear,near*intensity);
   if(ion?.material?.uniforms){ion.material.uniforms.uOpacity.value=(.12+near*.11)*intensity/.58;ion.scale.set(.76+near*.06,.76+near*.06,.80+near*.16+(ctx.visualEnergy||0)*.08);}
   if(dust?.material?.uniforms){dust.material.uniforms.uOpacity.value=(.055+near*.055)*intensity/.58;dust.scale.set(.68+near*.08,.68+near*.08,.72+near*.12);}
   if(coma?.material){coma.material.opacity=(.035+near*.055)*intensity/.58;coma.scale.setScalar(2.8+near*1.5);}
   if(halo?.material){halo.material.opacity=(.006+near*.012)*intensity/.58;halo.scale.setScalar(4.8+near*2.0);}
   if(jets)for(const j of jets.children)if(j.material)j.material.opacity=(.007+near*.010)*intensity/.58;
   for(const mesh of a.root.userData.surfaceMeshes||[])if(mesh.material)mesh.material.opacity=clamp(.90+near*.10,.90,1);
   const screen=Math.hypot(pos.x,pos.y),pose={mode:r.mode,p:+p.toFixed(3),x:+pos.x.toFixed(2),y:+pos.y.toFixed(2),z:+pos.z.toFixed(2),tailAlignment:+alignment.toFixed(3)};const centerline=Math.abs(pos.x)<2.8&&Math.abs(pos.y)<2.8,nearCamera=z>-56&&z<10;
   if(centerline&&!r.centerlineCounted){r.centerlineCounted=true;this.stats.cometRoute.centerlineCrossings=(this.stats.cometRoute.centerlineCrossings||0)+1;}
   if(r.close&&nearCamera&&Math.abs(pos.x)<5.2&&Math.abs(pos.y)<3.4&&!r.crossed){r.crossed=true;this.stats.cometRoute.actualCameraCrossings=(this.stats.cometRoute.actualCameraCrossings||0)+1;this.stats.cometRoute.actualCrossingPose=pose;if(r.guaranteed)this.stats.cometRoute.guaranteedActualCameraCrossing=true;}
   if(r.guaranteed)this.stats.cometRoute.lastGuaranteedPose=pose;
  }
  if(this.scene?.userData)this.scene.userData.uruxEncounterBudget={closeComet:clamp(maxNear,0,.55),whiteoutProtection:true,updatedAt:now};
 }
}