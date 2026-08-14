import * as THREE from 'three';
import { CinematicEncounterSystem as Base } from './CinematicEncounterSystemV59Route.js?v=20260814-65.2';

const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t);};
const hash=n=>{const x=Math.sin(n*91.733+17.113)*43758.5453;return x-Math.floor(x);};
const lerp=(a,b,t)=>a+(b-a)*t;
const BASE_AXIS=new THREE.Vector3(0,0,1);

const PLANET_FAMILIES=[
 {id:'amber-gas-giant',kind:0,tint:0xc19057,secondary:0x6a4023,cloud:0xf1d2aa,emissive:0x21140b,atmosphere:0xf0c795,roughness:.84,bands:.94,clouds:.42,emission:.025,cloudDrift:.010},
 {id:'cyan-gas-giant',kind:0,tint:0x4f8fc5,secondary:0x214f75,cloud:0xb5e8f2,emissive:0x08162b,atmosphere:0x94ddff,roughness:.80,bands:.86,clouds:.48,emission:.030,cloudDrift:.013},
 {id:'ice-world',kind:1,tint:0xb9d8e8,secondary:0x668ca8,cloud:0xf2fbff,emissive:0x0a1d2b,atmosphere:0xd8efff,roughness:.69,bands:.18,clouds:.25,emission:.018,cloudDrift:.004},
 {id:'red-rocky',kind:2,tint:0xa9573f,secondary:0x47251f,cloud:0xd5a18d,emissive:0x1b0c09,atmosphere:0xc77a68,roughness:.96,bands:.08,clouds:.10,emission:.010,cloudDrift:.002},
 {id:'volcanic-world',kind:3,tint:0x2a1915,secondary:0x090706,cloud:0x7c4934,emissive:0xff5a18,atmosphere:0xd46932,roughness:.93,bands:.10,clouds:.07,emission:.42,cloudDrift:.001},
 {id:'violet-green-exotic',kind:4,tint:0x766eaa,secondary:0x315b50,cloud:0xa8d6bd,emissive:0x24153a,atmosphere:0xc4b3ff,roughness:.74,bands:.38,clouds:.40,emission:.075,cloudDrift:.008}
];

function sessionSeed(){
 try{
  const a=new Uint32Array(2);
  crypto.getRandomValues(a);
  return (a[0]^a[1]^Math.floor(performance.timeOrigin||Date.now()))>>>0;
 }catch{
  return Math.floor((performance.timeOrigin||Date.now())+(Math.random()*0xffffffff))>>>0;
 }
}
function jitterHex(hex,seed,h=.028,s=.055,l=.035){
 const c=new THREE.Color(hex);
 c.offsetHSL((hash(seed)-.5)*h*2,(hash(seed+3.7)-.5)*s*2,(hash(seed+7.9)-.5)*l*2);
 return c.getHex();
}
function instanceFamily(base,seed){
 return{
  ...base,
  tint:jitterHex(base.tint,seed+1.1,.030,.060,.040),
  secondary:jitterHex(base.secondary,seed+2.3,.024,.050,.030),
  cloud:jitterHex(base.cloud,seed+3.7,.022,.045,.028),
  emissive:jitterHex(base.emissive,seed+5.1,.018,.035,.018),
  atmosphere:jitterHex(base.atmosphere,seed+7.9,.026,.050,.032),
  roughness:Math.max(.58,Math.min(1,base.roughness+(hash(seed+11.2)-.5)*.08)),
  bands:Math.max(.04,Math.min(1,base.bands*(.88+hash(seed+13.6)*.24))),
  clouds:Math.max(.04,Math.min(.62,base.clouds*(.86+hash(seed+17.4)*.30))),
  emission:Math.max(.006,Math.min(.52,base.emission*(.88+hash(seed+19.8)*.30))),
  cloudDrift:base.cloudDrift*(.78+hash(seed+23.1)*.50),
  instanceSeed:seed
 };
}
function makeBag(seed,cycle,lastId=null){
 const a=PLANET_FAMILIES.map((_,i)=>i);
 for(let i=a.length-1;i>0;i--){
  const j=Math.floor(hash(seed+cycle*37.17+i*9.73)*(i+1));
  [a[i],a[j]]=[a[j],a[i]];
 }
 if(lastId&&PLANET_FAMILIES[a[0]]?.id===lastId&&a.length>1)[a[0],a[1]]=[a[1],a[0]];
 return a;
}
function routeDefinition(mode,side,currentY=0){
 if(mode==='diagonal-cross')return{x0:-side*10.8,x1:side*11.6,y0:side*3.8,y1:-side*2.7,arc:side*1.25,speed:1.18,close:true};
 if(mode==='near-field-pass')return{x0:-side*6.4,x1:side*8.8,y0:side*1.35,y1:-side*.55,arc:-side*.75,speed:1.14,close:true};
 if(mode==='overtake')return{x0:side*2.4,x1:side*13.4,y0:currentY,y1:currentY*.35,arc:side*.35,speed:.88,close:false};
 if(mode==='distant-cross')return{x0:-side*16.2,x1:side*14.8,y0:side*5.4,y1:-side*4.6,arc:side*2.0,speed:1.04,close:false};
 return{x0:-side*9.2,x1:side*10.4,y0:side*2.2,y1:-side*1.35,arc:-side*.90,speed:1.10,close:true};
}

export class CinematicEncounterSystem extends Base{
 constructor(scene,renderer=null){
  super(scene,renderer);
  this.v65Seed=sessionSeed();
  this.planetBagCycle=0;
  this.planetBag=makeBag(this.v65Seed,0);
  this.planetBagCursor=0;
  this.lastPlanetFamily=null;
  this.v65CrossingIds=new Set();
  this.stats.planetVariants.selectionMode='seeded-shuffle-bag-v65';
  this.stats.planetVariants.noImmediateRepeat=true;
  this.stats.planetVariants.instanceColorJitter=true;
  this.stats.planetVariants.orderPreview=this.planetBag.map(i=>PLANET_FAMILIES[i].id);
  this.stats.planetVariants.recent=[];
  this.stats.cometRoute.kinematics='route-specific-parametric-v65';
  this.stats.cometRoute.actualCameraCrossings=0;
  this.stats.cometRoute.centerlineCrossings=0;
  this.stats.cometRoute.routeDefinitions=true;
  this.stats.cometRoute.depthCoupledCrossing=true;
  this.stats.cometRoute.guaranteedCloseRoute=true;
  this.stats.cometRoute.guaranteedRouteMode='diagonal-cross';
  this.stats.cometRoute.closestScreenApproach=null;
 }
 nextPlanetFamily(){
  if(this.planetBagCursor>=this.planetBag.length){
   this.planetBagCycle++;
   this.planetBag=makeBag(this.v65Seed,this.planetBagCycle,this.lastPlanetFamily);
   this.planetBagCursor=0;
   this.stats.planetVariants.orderPreview=this.planetBag.map(i=>PLANET_FAMILIES[i].id);
  }
  const index=this.planetBag[this.planetBagCursor++],base=PLANET_FAMILIES[index],seed=this.v65Seed+(this.stats.planetVariants.shown+1)*53.71+this.planetBagCycle*101.3;
  this.lastPlanetFamily=base.id;
  return instanceFamily(base,seed);
 }
 createPlanet(p){
  const root=super.createPlanet(p),v=this.nextPlanetFamily(),mesh=root.userData.surfaceMesh||root.userData.body?.children?.[0],surface=root.userData.surfaceLayer,clouds=root.userData.cloudLayer,atmosphere=root.userData.atmosphere;
  if(mesh?.material){
   mesh.material.color.set(v.tint);
   mesh.material.emissive?.set?.(v.emissive);
   mesh.material.emissiveIntensity=v.emission;
   mesh.material.roughness=v.roughness;
   mesh.material.metalness=.002;
  }
  if(surface?.material?.uniforms){
   const u=surface.material.uniforms;
   u.uKind.value=v.kind;u.uBandStrength.value=v.bands;u.uEmissionStrength.value=v.emission;
   u.uPrimary.value.set(v.tint);u.uSecondary.value.set(v.secondary);u.uEmission.value.set(v.emissive);
   surface.rotation.set((hash(v.instanceSeed+2)-.5)*.24,hash(v.instanceSeed+4)*Math.PI*2,(hash(v.instanceSeed+6)-.5)*.18);
   surface.scale.setScalar(1.006+hash(v.instanceSeed+8)*.004);
  }
  if(clouds?.material?.uniforms){
   clouds.material.uniforms.uCloudStrength.value=v.clouds;
   clouds.material.uniforms.uCloudColor.value.set(v.cloud);
   clouds.rotation.set((hash(v.instanceSeed+10)-.5)*.16,hash(v.instanceSeed+12)*Math.PI*2,(hash(v.instanceSeed+14)-.5)*.14);
   clouds.scale.setScalar(1.020+hash(v.instanceSeed+16)*.007);
  }
  if(atmosphere?.material?.uniforms?.uColor)atmosphere.material.uniforms.uColor.value.set(v.atmosphere);
  const halo=root.children.find(o=>o.isSprite);if(halo?.material?.color)halo.material.color.set(v.atmosphere);
  root.userData.planetVariant=v;
  root.userData.enhancements?.push('V65 shuffle bag sin repetición de familia inicial','variación cromática intra-familia por instancia','orientación superficial y nubosa por seed');
  this.stats.planetVariants.last=v.id;
  this.stats.planetVariants.recent.push(v.id);
  if(this.stats.planetVariants.recent.length>12)this.stats.planetVariants.recent.shift();
  return root;
 }
 applyCometRoute(a){
  const guaranteed=String(a?.id||'').startsWith('guaranteed-route-comet-'),cursorBefore=this.cometRouteCursor;
  if(guaranteed)this.cometRouteCursor=0;
  super.applyCometRoute(a);
  if(guaranteed){
   this.cometRouteCursor=cursorBefore;
   a.routeMode='diagonal-cross';
   a.root.userData.routeMode='diagonal-cross';
   this.stats.cometRoute.lastMode='diagonal-cross';
  }
  const mode=guaranteed?'diagonal-cross':a.routeMode,side=a.passSide||1,def=routeDefinition(mode,side,a.root.position.y),direction=new THREE.Vector3((def.x1-def.x0)*.036,(def.y1-def.y0)*.052,1).normalize();
  a.routeV65={...def,mode,side,crossed:false,guaranteed,orientation:new THREE.Quaternion().setFromUnitVectors(BASE_AXIS,direction)};
  a.root.position.x=def.x0;a.root.position.y=def.y0;a.speed*=def.speed;
  a.root.userData.enhancements?.push(guaranteed?'V65 encuentro cercano garantizado':'V65 trayectoria paramétrica independiente','cruce de encuadre acoplado a profundidad real','tangente física y cola alineada');
 }
 update(dt){
  super.update(dt);
  for(const a of this.active){
   if(a.type!=='comet'||!a.routeV65)continue;
   const r=a.routeV65,z=a.root.position.z,p=smooth01(clamp01((z+112)/174)),arc=Math.sin(p*Math.PI)*r.arc;
   const x=lerp(r.x0,r.x1,p),y=lerp(r.y0,r.y1,p)+arc;
   a.root.position.x=x;a.root.position.y=y;
   a.root.quaternion.slerp(r.orientation,1-Math.exp(-2.2*Math.max(.001,dt)));
   const tails=a.root.userData.routeFx;
   if(tails){
    const roll=Math.atan2(r.y1-r.y0,r.x1-r.x0);
    tails.rotation.z+=(roll*.18-tails.rotation.z)*(1-Math.exp(-2.0*Math.max(.001,dt)));
   }
   const screen=Math.hypot(x,y),prev=this.stats.cometRoute.closestScreenApproach;
   if(prev===null||screen<prev)this.stats.cometRoute.closestScreenApproach=+screen.toFixed(2);
   const centerline=Math.abs(x)<2.4&&Math.abs(y)<2.2,nearCamera=z>-42&&z<14;
   if(centerline&&!r.centerlineCounted){r.centerlineCounted=true;this.stats.cometRoute.centerlineCrossings++;}
   if(r.close&&nearCamera&&Math.abs(x)<5.2&&Math.abs(y)<3.4&&!r.crossed){
    r.crossed=true;this.stats.cometRoute.actualCameraCrossings++;this.v65CrossingIds.add(a.id);
    if(r.guaranteed)this.stats.cometRoute.guaranteedActualCameraCrossing=true;
   }
  }
 }
}
