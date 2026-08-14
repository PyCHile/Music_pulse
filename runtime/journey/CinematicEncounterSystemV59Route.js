import { CinematicEncounterSystem as Base } from './CinematicEncounterSystemV59.js?v=20260814-59';

export class CinematicEncounterSystem extends Base{
 constructor(scene,renderer=null){
  super(scene,renderer);
  this.nextAt=Math.min(this.nextAt,2.8);
  this._guaranteeTimer=null;
  this._guaranteeStopped=false;
  this.scheduleGuaranteedComet(3200);
 }
 scheduleGuaranteedComet(delay=3200){
  clearTimeout(this._guaranteeTimer);
  this._guaranteeTimer=setTimeout(()=>{
   if(this._guaranteeStopped)return;
   if(this.active.length===0){
    this.spawnProcedural();
    this.stats.cometRoute.timerGuaranteed=true;
   }else this.scheduleGuaranteedComet(1800);
  },delay);
 }
 dispose(){
  this._guaranteeStopped=true;
  clearTimeout(this._guaranteeTimer);
  super.dispose();
 }
}
