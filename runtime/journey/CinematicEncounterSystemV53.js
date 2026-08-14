import { CinematicEncounterSystem as Base } from './MobileCinematicEncounterSystemV50.js?v=20260813-50';
import { ThreeNebulaParticleFX } from '../particles/ThreeNebulaParticleFXV53.js?v=20260813-53';
export class CinematicEncounterSystem extends Base{
 constructor(scene,renderer=null){super(scene,renderer);this.particleFX=new ThreeNebulaParticleFX(scene);this.fxIds=new Set();this.stats.particleFX={...this.particleFX.stats};}
 spawnEncounter(e,meta={source:'llm'}){const ok=super.spawnEncounter(e,meta);if(!ok)return false;const a=this.active[this.active.length-1];if(!a||!['comet','debris'].includes(a.type))return true;const palette=Array.isArray(e?.palette)?e.palette:[];void this.particleFX.init().then(ready=>{if(!ready)return;const live=this.active.find(x=>x.id===a.id);if(!live)return;this.particleFX.attachEncounter(live.id,live.root,live.type,live.velocity,palette);this.fxIds.add(live.id);this.stats.particleFX={...this.particleFX.stats};});return true;}
 update(dt){super.update(dt);if(this.particleFX.ready){const liveIds=new Set(this.active.map(a=>a.id));for(const id of [...this.fxIds])if(!liveIds.has(id)){this.particleFX.detachEncounter(id);this.fxIds.delete(id);}for(const a of this.active)if(this.fxIds.has(a.id))this.particleFX.syncEncounter(a.id,a.root);this.particleFX.update(dt);this.stats.particleFX={...this.particleFX.stats};}}
 dispose(){this.particleFX.dispose();super.dispose();}
}
