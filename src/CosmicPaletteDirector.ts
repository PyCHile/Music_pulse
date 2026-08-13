import * as THREE from 'three';
import type { NarrativeStage } from './NarrativeStateMachine';
import type { NebulaUpdate } from './EncounterPlanner';

export class CosmicPaletteDirector {
  private current = new THREE.Color('#02030a');
  private target = new THREE.Color('#02030a');
  private transitionAge = 0;
  private transitionDuration = 10;
  private darkZoneFraction = 0.6;
  private filamentDensity = 0.3;

  beginTransition(stage: NarrativeStage, duration = 10): void {
    this.current.copy(this.target);
    this.target.set(stage.paletteHint[0] ?? '#02030a');
    this.transitionAge = 0;
    this.transitionDuration = Math.max(8, Math.min(12, duration));
    this.darkZoneFraction = Math.max(0.3, stage.nebulaProfile.darkZoneFraction);
    this.filamentDensity = stage.nebulaProfile.filamentDensity;
  }

  applyNebula(update: NebulaUpdate | null): void {
    if (!update) return;
    this.darkZoneFraction = Math.max(0.3, update.darkZoneFraction);
    this.filamentDensity = Math.max(0, Math.min(1, update.filamentDensity));
    if (update.chromaticRange[0]) this.target.set(update.chromaticRange[0]);
  }

  update(scene: THREE.Scene, dt: number): void {
    this.transitionAge = Math.min(this.transitionDuration, this.transitionAge + dt);
    const t = this.transitionDuration > 0 ? this.transitionAge / this.transitionDuration : 1;
    const eased = t * t * (3 - 2 * t);
    const color = this.current.clone().lerp(this.target, eased);
    const darkness = THREE.MathUtils.lerp(0.018, 0.11, 1 - this.darkZoneFraction);
    color.multiplyScalar(darkness);
    scene.background = color;
    if (!scene.fog) scene.fog = new THREE.FogExp2(color, 0.008);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(color);
      scene.fog.density = THREE.MathUtils.lerp(0.004, 0.012, this.filamentDensity);
    }
  }
}
