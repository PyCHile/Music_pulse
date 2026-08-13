import type * as THREE from 'three';
import { NarrativeStateMachine } from './NarrativeStateMachine';
import { EncounterPlanner } from './EncounterPlanner';
import { FocalTrajectoryEngine } from './FocalTrajectoryEngine';
import { CosmicPaletteDirector } from './CosmicPaletteDirector';

export class URUXJourneyAgent {
  readonly stateMachine = new NarrativeStateMachine();
  readonly trajectoryEngine = new FocalTrajectoryEngine();
  readonly paletteDirector = new CosmicPaletteDirector();
  private readonly planner = new EncounterPlanner(() => localStorage.getItem('urux_backend_url'));
  private encounterClock = 0;
  private started = false;
  private unsubscribeTransition: (() => void) | null = null;

  constructor(private readonly scene: THREE.Scene) {
    this.scene.add(this.trajectoryEngine.group);
    this.paletteDirector.beginTransition(this.stateMachine.current, 10);
    this.unsubscribeTransition = this.stateMachine.onTransition((stage) => {
      this.planner.clearBuffer();
      this.paletteDirector.beginTransition(stage, 10);
      void this.planner.refill(stage, true);
    });
  }
  start(): void { if(this.started)return; this.started=true; void this.planner.refill(this.stateMachine.current,true); }
  update(dt:number):void {
    const snapshot=this.stateMachine.update(dt);this.encounterClock+=dt;
    if(this.planner.pending<1)void this.planner.refill(snapshot.stage);
    if(this.encounterClock>=8){const encounter=this.planner.consume();if(encounter){this.trajectoryEngine.spawn(encounter);this.encounterClock=0;}}
    if(this.planner.pending<1)this.trajectoryEngine.updateAutonomous(dt,snapshot.stage);
    this.paletteDirector.applyNebula(this.planner.nebulaUpdate);
    this.paletteDirector.update(this.scene,dt);
    this.trajectoryEngine.update(dt);
  }
  dispose():void{this.unsubscribeTransition?.();this.unsubscribeTransition=null;this.scene.remove(this.trajectoryEngine.group);this.trajectoryEngine.dispose();}
}
