import { CinematicEncounterSystem as Base } from './CinematicEncounterSystemV59.js?v=20260814-64';

const GUARANTEED_PALETTES={
 DESPRENDIMIENTO:['#eef7ff','#8ec9ff','#d9e9f5'],
 TUNEL:['#ffffff','#79a9ff','#b9d5f4'],
 LUZ:['#fffbe9','#9ccaff','#ead8ba'],
 MEMORIA:['#f7f4eb','#adc7db','#d9c7ae'],
 FRONTERA:['#f4f8ff','#7da5e8','#c8d8ee'],
 RETORNO:['#fffaf0','#9ec3e5','#ead9bd']
};

export class CinematicEncounterSystem extends Base{
 constructor(scene,renderer=null){
  super(scene,renderer);
  this.nextAt=Math.max(this.nextAt,5.5);
  this._guaranteeTimer=null;
  this._guaranteeStopped=false;
  this._guaranteeStartedAt=performance.now();
  this.stats.cometRoute.wallClockGuarantee=true;
  this.stats.cometRoute.guaranteeAttempts=0;
  this.stats.cometRoute.guaranteeSpawned=false;
  this.stats.cometRoute.guaranteedAfterMs=null;
  this.scheduleGuaranteedComet(1200);
 }
 spawnGuaranteedComet(){
  if(this._guaranteeStopped||this.stats.cometRoute.guaranteeSpawned)return true;
  this.stats.cometRoute.guaranteeAttempts++;
  const previousMax=this.maxActive;
  this.maxActive=Math.max(previousMax,this.active.length+1);
  const side=this.stats.cometRoute.guaranteeAttempts%2===1?-1:1;
  const palette=GUARANTEED_PALETTES[this.stage]||GUARANTEED_PALETTES.DESPRENDIMIENTO;
  const ok=this.spawnEncounter({
   id:`guaranteed-route-comet-${this.seq+1}`,
   narrativeStage:this.stage,
   objectType:'comet',
   spawnPosition:{x:side*.78,y:side*.10},
   focalApproach:true,
   trajectoryVector:{x:-side*.072,y:-side*.006,z:1},
   scale:1.24,
   speed:.96,
   palette,
   luminosity:.74,
   durationSeconds:20
  },{source:'procedural-guaranteed'});
  this.maxActive=previousMax;
  if(ok){
   this.stats.cometRoute.timerGuaranteed=true;
   this.stats.cometRoute.guaranteeSpawned=true;
   this.stats.cometRoute.guaranteedAfterMs=Math.round(performance.now()-this._guaranteeStartedAt);
   return true;
  }
  return false;
 }
 scheduleGuaranteedComet(delay=1200){
  clearTimeout(this._guaranteeTimer);
  this._guaranteeTimer=setTimeout(()=>{
   if(this._guaranteeStopped||this.stats.cometRoute.guaranteeSpawned)return;
   if(!this.spawnGuaranteedComet())this.scheduleGuaranteedComet(600);
  },delay);
 }
 dispose(){
  this._guaranteeStopped=true;
  clearTimeout(this._guaranteeTimer);
  super.dispose();
 }
}
