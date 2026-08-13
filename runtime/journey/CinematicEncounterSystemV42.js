import { CinematicEncounterSystem as BaseCinematicEncounterSystem } from './CinematicEncounterSystem.js?v=20260813-41';
import { AstronomicalTextureManager } from '../assets/AstronomicalTextureManager.js?v=20260813-42';

export class CinematicEncounterSystem extends BaseCinematicEncounterSystem{
  constructor(scene,renderer=null){
    super(scene,renderer);
    if(renderer){
      try{this.textureManager?.dispose?.();}catch{}
      this.textureManager=new AstronomicalTextureManager(renderer);
      this.stats.textures={...this.textureManager.stats};
    }
  }
}
