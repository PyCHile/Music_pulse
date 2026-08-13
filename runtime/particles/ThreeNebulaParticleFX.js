import * as THREE from 'three';
import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

export class ThreeNebulaParticleFX{
  constructor(scene){this.scene=scene;this.system=null;this.api=null;this.emitters=new Map();this.ready=false;this.mobileDisabled=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;this.failed=this.mobileDisabled;this.stats={ready:false,emitters:0,count:0,engine:'three-nebula',lastEffect:null,mobileDisabled:this.mobileDisabled};if(this.mobileDisabled)runtimeCapabilities.mark('three-nebula',false,{version:'12.1.0',reason:'mobile-audio-first-profile'});}
  async init(){if(this.mobileDisabled)return false;if(this.ready||this.failed)return this.ready;try{const mod=await import('three-nebula');this.api=mod;const System=mod.default||mod.System;this.system=new System();this.system.addRenderer(new mod.SpriteRenderer(this.scene,THREE));this.ready=true;this.stats.ready=true;runtimeCapabilities.mark('three-nebula',true,{version:'12.1.0',renderer:'SpriteRenderer'});return true;}catch(error){this.failed=true;runtimeCapabilities.mark('three-nebula',false,{version:'12.1.0',error:String(error)});console.warn('[URUX] three-nebula unavailable',error);return false;}}
  makeEmitter(id,position,velocity,palette,kind='dust'){
    if(!this.ready||!this.api||this.emitters.has(id))return null;const N=this.api,dir=velocity.clone().multiplyScalar(-1),gain=kind==='plasma'?10:(kind==='fragment'?4.2:6.5),v=new N.Vector3D(dir.x*gain,dir.y*gain,dir.z*gain),emitter=new N.Emitter();
    emitter.setPosition(position).setRate(new N.Rate(new N.Span(kind==='fragment'?1:2,kind==='fragment'?3:7),new N.Span(.035,.075))).setInitializers([new N.Position(new N.PointZone(0,0,0)),new N.Mass(1),new N.Radius(kind==='fragment'?.035:.06,kind==='fragment'?.11:.18),new N.Life(kind==='plasma'?.75:1.2,kind==='plasma'?1.7:2.8),new N.VectorVelocity(v,kind==='fragment'?28:12)]).setBehaviours([new N.Alpha(kind==='plasma'?.72:.46,0),new N.Scale(1,.12),new N.Color(new THREE.Color(palette?.[1]||'#9ab8ff'),new THREE.Color(palette?.[2]||'#fff1d6'))]).emit();
    this.system.addEmitter(emitter);this.emitters.set(id,{emitter,kind});this.stats.emitters=this.emitters.size;this.stats.lastEffect=kind;return emitter;
  }
  attachEncounter(id,root,type,velocity,palette){if(!this.ready||!root)return;const p=root.getWorldPosition(new THREE.Vector3());if(type==='comet'){this.makeEmitter(`${id}:plasma`,p,velocity,palette,'plasma');this.makeEmitter(`${id}:dust`,p,velocity,palette,'dust');}else if(type==='debris'){this.makeEmitter(`${id}:fragment`,p,velocity,palette,'fragment');}}
  syncEncounter(id,root){if(!this.ready||!root)return;const p=root.getWorldPosition(new THREE.Vector3());for(const [key,item] of this.emitters){if(key.startsWith(`${id}:`))item.emitter.setPosition(p);}}
  detachEncounter(id){for(const [key,item] of [...this.emitters]){if(!key.startsWith(`${id}:`))continue;item.emitter.stopEmit();this.emitters.delete(key);}this.stats.emitters=this.emitters.size;}
  update(dt){if(!this.ready)return;this.system?.update?.(Math.min(.05,Math.max(.001,dt||1/60)));this.stats.count=this.system?.getCount?.()||0;}
  dispose(){for(const item of this.emitters.values())item.emitter.stopEmit();this.emitters.clear();this.system?.destroy?.();this.stats.ready=false;}
}
