import * as THREE from 'three';
import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

export class ThreeNebulaParticleFX{
  constructor(scene){this.scene=scene;this.system=null;this.api=null;this.emitters=new Map();this.ready=false;this.failed=false;this.stats={ready:false,emitters:0,particles:'three-nebula',lastEffect:null};}
  async init(){if(this.ready||this.failed)return this.ready;try{const mod=await import('three-nebula');this.api=mod;const System=mod.default||mod.System;this.system=new System();this.system.addRenderer(new mod.SpriteRenderer(this.scene,THREE));this.ready=true;this.stats.ready=true;runtimeCapabilities.mark('three-nebula',true,{version:'12.1.0',renderer:'SpriteRenderer'});return true;}catch(error){this.failed=true;runtimeCapabilities.mark('three-nebula',false,{error:String(error)});console.warn('[URUX] three-nebula unavailable',error);return false;}}
  makeEmitter(id,position,velocity,palette,kind='dust'){
    if(!this.ready||!this.api)return null;const N=this.api,dir=velocity.clone().multiplyScalar(-1),v=new N.Vector3D(dir.x*(kind==='plasma'?10:6),dir.y*(kind==='plasma'?10:6),dir.z*(kind==='plasma'?10:6));const emitter=new N.Emitter();
    emitter.setPosition(position).setRate(new N.Rate(new N.Span(kind==='fragment'?1:2,kind==='fragment'?3:7),new N.Span(.035,.075))).setInitializers([new N.Position(new N.PointZone(0,0,0)),new N.Mass(1),new N.Radius(kind==='fragment'?.035:.06,kind==='fragment'?.11:.18),new N.Life(kind==='plasma'?.75:1.2,kind==='plasma'?1.7:2.8),new N.VectorVelocity(v,kind==='fragment'?28:12)]).setBehaviours([new N.Alpha(kind==='plasma'?.72:.46,0),new N.Scale(1,.12),new N.Color(new THREE.Color(palette?.[1]||'#9ab8ff'),new THREE.Color(palette?.[2]||'#fff1d6'))]).emit();
    this.system.addEmitter(emitter);this.emitters.set(id,{emitter,kind,position:position.clone(),velocity:velocity.clone(),born:performance.now()});this.stats.emitters=this.emitters.size;this.stats.lastEffect=kind;return emitter;
  }
  attachEncounter(id,root,type,velocity,palette){if(!this.ready||!root)return;const p=root.getWorldPosition(new THREE.Vector3());if(type==='comet'){this.makeEmitter(`${id}:plasma`,p,velocity,palette,'plasma');this.makeEmitter(`${id}:dust`,p,velocity,palette,'dust');}else if(type==='debris'){this.makeEmitter(`${id}:fragment`,p,velocity,palette,'fragment');}}
  syncEncounter(id,root,velocity){if(!this.ready||!root)return;const p=root.getWorldPosition(new THREE.Vector3());for(const [key,item] of this.emitters){if(!key.startsWith(`${id}:`))continue;item.emitter.setPosition(p);item.velocity.copy(velocity);}}
  detachEncounter(id){for(const [key,item] of [...this.emitters]){if(!key.startsWith(`${id}:`))continue;item.emitter.stopEmit();this.emitters.delete(key);}this.stats.emitters=this.emitters.size;}
  update(){if(this.ready)this.system?.update?.();}
  dispose(){for(const item of this.emitters.values())item.emitter.stopEmit();this.emitters.clear();this.system?.destroy?.();}
}
