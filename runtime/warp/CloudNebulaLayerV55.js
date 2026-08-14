import * as THREE from 'three';
import { getGalaxyCloudTexture } from '../assets/SharedSpaceAssetsV53.js?v=20260813-53';

const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t);};
const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const GAS_COLORS=[0x617fb2,0x76659f,0x9b6d68,0x5c7691,0x8b607e,0x8a714f];

export class CloudNebulaLayer{
 constructor(){
  this.group=new THREE.Group();this.layers=[];this.ready=false;this.time=0;this.crossings=0;this.nearClouds=0;this.maxOpacity=0;this.mobile=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;
  const count=this.mobile?11:14;
  for(let i=0;i<count;i++)this.createLayer(i,count);
  getGalaxyCloudTexture().then(texture=>{for(const q of this.layers){q.material.map=texture;q.material.needsUpdate=true;}this.ready=true;}).catch(()=>{});
 }
 createLayer(i,count){
  const role=i%7===0?'dust':(i%5===0?'emission':'gas'),seed=17+i*13.17,center=i%3===0;
  const color=role==='dust'?0x06080e:(role==='emission'?0xb7c9e8:GAS_COLORS[i%GAS_COLORS.length]);
  const material=new THREE.SpriteMaterial({transparent:true,opacity:0,depthWrite:false,depthTest:false,color:new THREE.Color(color),blending:role==='emission'?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:role!=='emission'});
  const sprite=new THREE.Sprite(material),z=-18-i*(this.mobile?20:18),x=center?(hash(seed)-.5)*7:(hash(seed)-.5)*42,y=center?(hash(seed+2)-.5)*5:(hash(seed+2)-.5)*27,width=(center?92:72)+hash(seed+3)*(center?62:76),aspect=.55+hash(seed+4)*.42;
  sprite.position.set(x,y,z);sprite.scale.set(width,width*aspect,1);material.rotation=(hash(seed+5)-.5)*Math.PI*1.8;sprite.renderOrder=role==='dust'?8:(role==='emission'?-870:-900);this.group.add(sprite);
  this.layers.push({sprite,material,role,seed,center,width,aspect,speed:.78+hash(seed+6)*.34,spin:(hash(seed+7)>.5?1:-1)*(.00011+hash(seed+8)*.00020),base:role==='dust'?.052:(role==='emission'?.026:.072+hash(seed+9)*.026)});
 }
 recycle(q){
  let far=-160;for(const p of this.layers)far=Math.min(far,p.sprite.position.z);q.sprite.position.z=far-(this.mobile?18:15)-hash(q.seed+this.crossings)*9;q.sprite.position.x=q.center?(hash(q.seed+this.crossings*.71)-.5)*8:(hash(q.seed+this.crossings*.71)-.5)*44;q.sprite.position.y=q.center?(hash(q.seed+this.crossings*.93)-.5)*6:(hash(q.seed+this.crossings*.93)-.5)*29;this.crossings++;
 }
 update(dt,state){
  this.time+=dt;const n=clamp01(state.nebulaPresence||0),r=clamp01(state.galaxyReveal||0),light=clamp01(state.livingLight||0),tunnel=clamp01(state.tunnelDrive||0),fade=1-clamp01(state.finalFade||0),presence=Math.min(1,.72+n*.25+r*.18+light*.10+tunnel*.08)*fade,speed=Math.max(3.6,(state.speed||8)*.92);this.nearClouds=0;this.maxOpacity=0;
  for(const q of this.layers){
   q.sprite.position.z+=speed*q.speed*dt;if(q.sprite.position.z>3)this.recycle(q);
   const z=q.sprite.position.z,farFade=smooth01((z+245)/105),nearFade=1-smooth01((z+16)/18),nearBoost=.86+.44*Math.exp(-Math.pow((z+24)/31,2)),pulse=.92+.08*Math.sin(this.time*.13+q.seed),cap=q.role==='dust'?.105:(q.role==='emission'?.060:.155),opacity=this.ready?Math.min(cap,q.base*presence*farFade*nearFade*nearBoost*pulse):0;
   q.material.opacity=opacity;q.material.rotation+=q.spin*dt*60;const drift=(1-clamp01((-z)/220));q.sprite.position.x+=Math.sin(this.time*.017+q.seed)*dt*.025*(1+drift);q.sprite.position.y+=Math.cos(this.time*.014+q.seed*.7)*dt*.018*(1+drift);if(z>-46&&z<-3&&opacity>.018)this.nearClouds++;this.maxOpacity=Math.max(this.maxOpacity,opacity);
  }
 }
 get stats(){return{mode:'continuous-traversal',ready:this.ready,layers:this.layers.length,crossings:this.crossings,nearClouds:this.nearClouds,maxOpacity:+this.maxOpacity.toFixed(3)};}
 dispose(){for(const q of this.layers)q.material.dispose();this.layers.length=0;}
}
