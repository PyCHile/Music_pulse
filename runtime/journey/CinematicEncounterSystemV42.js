import { CinematicEncounterSystem as BaseCinematicEncounterSystem } from './CinematicEncounterSystem.js?v=20260813-46';
import { AstronomicalTextureManager } from '../assets/AstronomicalTextureManager.js?v=20260813-42';

export class CinematicEncounterSystem extends BaseCinematicEncounterSystem{
  constructor(scene,renderer=null){
    const mobile=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;
    super(scene,null);
    this.mobilePerformanceProfile=mobile;
    if(renderer&&!mobile){
      this.textureManager=new AstronomicalTextureManager(renderer);
      this.stats.textures={...this.textureManager.stats};
    }else if(mobile){
      this.textureManager=null;
      this.stats.textures={disabled:true,reason:'mobile-audio-first-profile'};
    }
  }
}
