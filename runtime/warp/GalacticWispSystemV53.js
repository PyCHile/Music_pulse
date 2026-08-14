import * as THREE from 'three';
import { getGalaxyCloudTexture } from '../assets/SharedSpaceAssetsV53.js?v=20260813-53';
const clamp=v=>Math.max(0,Math.min(1,v));
const SPECS=[[-16,10,-72,28,18,0x315fca,.042],[15,-9,-88,30,19,0x6f43a5,.038],[-8,-15,-106,34,21,0xa75840,.034],[18,13,-122,31,20,0x37639c,.032],[-20,-5,-140,36,22,0x8c5878,.030],[5,20,-158,38,24,0x31547e,.028]];
export class GalacticWispSystem{
 constructor(){this.group=new THREE.Group();this.layers=[];this.time=0;this.ready=false;for(let i=0;i<SPECS.length;i++){const [x,y,z,w,h,c,a]=SPECS[i],mat=new THREE.SpriteMaterial({transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:i===2?THREE.AdditiveBlending:THREE.NormalBlending,color:c,toneMapped:i!==2}),sprite=new THREE.Sprite(mat);sprite.position.set(x,y,z);sprite.scale.set(w,h,1);sprite.material.rotation=(i-2.5)*.41;sprite.renderOrder=-700+i;this.group.add(sprite);this.layers.push({sprite,mat,x,y,z,w,h,a,spin:(i%2?1:-1)*.00016*(i+1)});}getGalaxyCloudTexture().then(t=>{for(const l of this.layers){l.mat.map=t;l.mat.needsUpdate=true;}this.ready=true;}).catch(()=>{});}
 get maxOpacity(){let m=0;for(const l of this.layers)m=Math.max(m,l.mat.opacity||0);return m;}
 update(dt,state,features){this.time+=dt;const presence=clamp(.025+(state.nebulaPresence||0)*.05+(state.galaxyReveal||0)*.10+(state.idealized||0)*.06+(state.lifeReview||0)*.04)*(1-clamp(state.finalFade||0)),audio=.96+(features?.mid||0)*.04;for(let i=0;i<this.layers.length;i++){const l=this.layers[i],phase=i*.83,drift=Math.sin(this.time*.025+phase);l.sprite.position.set(l.x+drift*.08,l.y+Math.cos(this.time*.021+phase)*.06,l.z);l.mat.rotation+=l.spin*dt*60;l.mat.opacity=this.ready?Math.min(.055,l.a*presence*audio):0;}this.group.visible=presence>.008;}
 dispose(){for(const l of this.layers)l.mat.dispose();}
}
