import * as THREE from 'three';
import { CinematicEncounterSystem as Base } from './CinematicEncounterSystemV53.js?v=20260813-53';

const COMET_67P_IMAGE='https://science.nasa.gov/wp-content/uploads/2024/12/comet-67p.jpg';
const COMET_PALETTE=['#5d6469','#dce6ec','#9ab7c9'];
const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t);};
const hash=n=>{const x=Math.sin(n*91.733+17.113)*43758.5453;return x-Math.floor(x);};

function roughLobe(radius,detail,seed){
 const g=new THREE.IcosahedronGeometry(radius,detail),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.max(.001,Math.hypot(x,y,z)),nx=x/r,ny=y/r,nz=z/r;
  const macro=Math.sin(nx*5.3+seed)*.075+Math.sin(ny*8.7-seed*.7)*.045+Math.sin(nz*11.9+seed*.31)*.035;
  const fine=(hash(i*1.73+seed)-.5)*.11;
  const crater1=Math.max(0,.33-Math.hypot(nx-.44,ny+.22,nz-.19))*.24;
  const crater2=Math.max(0,.28-Math.hypot(nx+.31,ny-.41,nz+.18))*.19;
  const s=1+macro+fine-crater1-crater2;x*=s;y*=s;z*=s;
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;g.computeVertexNormals();return g;
}
function makeRockMaterial(){return new THREE.MeshStandardMaterial({color:0x66686a,roughness:1,metalness:0,transparent:true,opacity:1,depthWrite:true,emissive:0x060708,emissiveIntensity:.08});}

export class CinematicEncounterSystem extends Base{
 constructor(scene,renderer=null){
  super(scene,renderer);this.rendererRef=renderer;this.cometTexturePromise=null;this.cometTexture=null;this.cometGeometries=[roughLobe(.78,2,11),roughLobe(.62,2,29),roughLobe(.48,1,47)];this.realCometTextures=0;this.stats.realComet={source:'NASA Science / ESA Rosetta NAVCAM 67P',loaded:false,overtakePasses:0,redThermalShell:false};
 }
 createPlanet(p){
  const root=super.createPlanet(p),mesh=root.userData.surfaceMesh||root.userData.body?.children?.[0];if(mesh?.material){mesh.material.color.set(0x46546a);mesh.material.emissive?.set?.(0x050914);mesh.material.emissiveIntensity=.035;}return root;
 }
 createComet(){
  const root=new THREE.Group(),body=new THREE.Group(),mat=makeRockMaterial(),main=new THREE.Mesh(this.cometGeometries[0],mat),upper=new THREE.Mesh(this.cometGeometries[1],mat.clone()),neck=new THREE.Mesh(this.cometGeometries[2],mat.clone());
  main.scale.set(1.28,.92,1.02);main.position.set(.08,-.24,.02);main.rotation.set(.26,-.31,.18);
  upper.scale.set(.82,.66,.74);upper.position.set(-.38,.62,.08);upper.rotation.set(-.38,.29,-.24);
  neck.scale.set(.62,.42,.48);neck.position.set(-.18,.20,.06);neck.rotation.set(.18,.12,-.16);body.add(main,neck,upper);root.add(body);
  const comaMat=new THREE.SpriteMaterial({map:this.glow,color:0xdce8ef,transparent:true,opacity:.10,depthWrite:false,blending:THREE.AdditiveBlending}),coma=new THREE.Sprite(comaMat);coma.scale.set(4.8,4.8,1);root.add(coma);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:0xb5cad8,transparent:true,opacity:.035,depthWrite:false,blending:THREE.AdditiveBlending}));halo.scale.set(8.5,8.5,1);root.add(halo);
  const tails=new THREE.Group();for(let i=0;i<8;i++){const dust=i%3===0,color=dust?0xc8bda9:0xc9dce8,s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color,transparent:true,opacity:(dust?.028:.040)*(1-i*.065),depthWrite:false,blending:THREE.AdditiveBlending}));s.position.set((hash(i*2.1)-.5)*.36,(hash(i*3.7)-.5)*.24,-1.8-i*1.55);const w=.85+i*.22,h=.42+i*.10;s.scale.set(w,h,1);tails.add(s);}root.add(tails);
  const jets=new THREE.Group();for(let i=0;i<3;i++){const j=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:i===2?0xa8c8dc:0xe1e8eb,transparent:true,opacity:.032,depthWrite:false,blending:THREE.AdditiveBlending}));j.position.set((i-1)*.35,.12+i*.08,-.72-i*.18);j.scale.set(.42,2.8+i*.65,1);j.material.rotation=(i-1)*.34;jets.add(j);}root.add(jets);
  root.userData.body=body;root.userData.routeFx=tails;root.userData.coma=coma;root.userData.comaHalo=halo;root.userData.jets=jets;root.userData.surfaceMeshes=[main,neck,upper];root.userData.enhancements=['morfología bilobulada tipo 67P','superficie irregular de bajo albedo','coma neutra','jets de sublimación','cola de polvo e iones','sin cáscara térmica roja','adelantamiento lateral cinematográfico'];return root;
 }
 async loadCometTexture(){
  if(this.cometTexture)return this.cometTexture;if(this.cometTexturePromise)return this.cometTexturePromise;const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');this.cometTexturePromise=loader.loadAsync(COMET_67P_IMAGE).then(texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.MirroredRepeatWrapping;texture.wrapT=THREE.MirroredRepeatWrapping;texture.repeat.set(1.35,1.35);texture.anisotropy=Math.min(2,this.rendererRef?.capabilities?.getMaxAnisotropy?.()||1);texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;this.rendererRef?.initTexture?.(texture);this.cometTexture=texture;this.stats.realComet.loaded=true;return texture;}).catch(error=>{this.stats.realComet.textureError=String(error);return null;});return this.cometTexturePromise;
 }
 applyCometTexture(root,texture){if(!texture||!root?.parent)return false;for(const mesh of root.userData.surfaceMeshes||[]){const m=mesh.material;if(!m)continue;m.map=texture;m.bumpMap=texture;m.bumpScale=.018;m.color.set(0x8b8b8b);m.roughness=1;m.metalness=0;m.needsUpdate=true;}root.userData.astronomyProfile={id:'67P',source:'NASA Science / ESA Rosetta NAVCAM',photographicDetail:true};root.userData.enhancements.push('detalle fotográfico 67P bajo demanda');this.realCometTextures++;return true;}
 spawnEncounter(e,meta={source:'llm'}){
  const comet=e?.objectType==='comet',payload=comet?{...e,palette:COMET_PALETTE,luminosity:Math.min(.68,Number(e?.luminosity)||.52),scale:Math.max(.92,Number(e?.scale)||1)}:e,ok=super.spawnEncounter(payload,meta);if(!ok)return false;const a=this.active[this.active.length-1];if(!a)return true;
  if(a.type==='comet'){
   a.speed*=.78;a.duration=Math.max(18,a.duration);a.passSide=(this.seq%2?1:-1);a.passHeight=(hash(this.seq*3.7)-.5)*2.6;a.root.userData.enhancements?.push('trayectoria de sobrepaso: foco → costado → cola atrás');void this.loadCometTexture().then(texture=>{const live=this.active.find(x=>x.id===a.id);if(live&&texture)this.applyCometTexture(live.root,texture);});
  }
  return true;
 }
 update(dt){
  super.update(dt);for(const a of this.active){if(a.type!=='comet')continue;const t=clamp01(a.age/a.duration),approach=smooth01((t-.10)/.58),pass=smooth01((t-.56)/.34),side=a.passSide||1,targetX=side*(1.1+pass*10.8),targetY=(a.passHeight||0)*(0.22+.78*pass),follow=1-Math.exp(-(1.3+pass*2.4)*dt);a.root.position.x+=(targetX-a.root.position.x)*follow;a.root.position.y+=(targetY-a.root.position.y)*follow;const body=a.root.userData.body;if(body){body.rotation.y+=dt*.16;body.rotation.x+=dt*.035;}const z=a.root.position.z,near=Math.exp(-Math.pow((z+7)/30,2)),coma=a.root.userData.coma,halo=a.root.userData.comaHalo,jets=a.root.userData.jets;if(coma){coma.material.opacity=.075+near*.12;coma.scale.setScalar(4.1+near*2.3);}if(halo){halo.material.opacity=.020+near*.045;halo.scale.setScalar(7.0+near*4.2);}if(jets)jets.scale.z=1+near*1.8;const tail=a.root.userData.routeFx;if(tail){tail.scale.z=1.2+approach*1.4+near*2.1;tail.scale.x=.86+near*.28;}if(pass>.72&&!a.overtakeCounted){a.overtakeCounted=true;this.stats.realComet.overtakePasses++;}}
 }
 dispose(){this.cometTexture?.dispose();for(const g of this.cometGeometries)g.dispose();super.dispose();}
}
