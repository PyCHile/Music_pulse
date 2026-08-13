import { CinematicEncounterSystem as BaseCinematicEncounterSystem } from './CinematicEncounterSystem.js?v=20260813-45';
import { AstronomicalTextureManager } from '../assets/AstronomicalTextureManager.js?v=20260813-42';

export class CinematicEncounterSystem extends BaseCinematicEncounterSystem{
  constructor(scene,renderer=null){
    /* Base receives no renderer so KTX2/Basis workers and probes are created only once. */
    super(scene,null);
    if(renderer){
      this.textureManager=new AstronomicalTextureManager(renderer);
      this.stats.textures={...this.textureManager.stats};
    }
  }
}