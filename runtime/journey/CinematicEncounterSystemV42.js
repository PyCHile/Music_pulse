const mobile=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;
let CinematicEncounterSystem;
if(mobile){
 ({CinematicEncounterSystem}=await import('./MobileCinematicEncounterSystem.js?v=20260813-47'));
}else{
 const [{CinematicEncounterSystem:BaseCinematicEncounterSystem},{AstronomicalTextureManager}]=await Promise.all([
  import('./CinematicEncounterSystem.js?v=20260813-46'),
  import('../assets/AstronomicalTextureManager.js?v=20260813-42')
 ]);
 CinematicEncounterSystem=class DesktopCinematicEncounterSystem extends BaseCinematicEncounterSystem{
  constructor(scene,renderer=null){super(scene,null);this.mobilePerformanceProfile=false;if(renderer){this.textureManager=new AstronomicalTextureManager(renderer);this.stats.textures={...this.textureManager.stats};}}
 };
}
export { CinematicEncounterSystem };
