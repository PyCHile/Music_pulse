export type NarrativeStageId = 'DESPRENDIMIENTO' | 'TUNEL' | 'LUZ' | 'MEMORIA' | 'FRONTERA' | 'RETORNO';
export type EncounterType = 'planet' | 'comet' | 'debris' | 'light_filament' | 'vessel' | 'void_pulse';

export interface NebulaProfile {
  density: number;
  filamentDensity: number;
  darkZoneFraction: number;
}

export interface NarrativeStage {
  id: NarrativeStageId;
  label: string;
  durationRange: [number, number];
  paletteHint: string[];
  encounterTypes: EncounterType[];
  nebulaProfile: NebulaProfile;
}

export interface NarrativeSnapshot {
  stage: NarrativeStage;
  elapsed: number;
  targetDuration: number;
  transitionProgress: number;
  transitioning: boolean;
}

const STAGES: NarrativeStage[] = [
  { id: 'DESPRENDIMIENTO', label: 'Desprendimiento', durationRange: [42, 68], paletteHint: ['#02030a', '#07152d', '#17265e'], encounterTypes: ['debris', 'void_pulse', 'light_filament'], nebulaProfile: { density: .22, filamentDensity: .24, darkZoneFraction: .72 } },
  { id: 'TUNEL', label: 'Túnel', durationRange: [55, 82], paletteHint: ['#02020a', '#0d1b4b', '#4b0082'], encounterTypes: ['debris', 'comet', 'light_filament', 'void_pulse'], nebulaProfile: { density: .42, filamentDensity: .58, darkZoneFraction: .58 } },
  { id: 'LUZ', label: 'Luz', durationRange: [45, 70], paletteHint: ['#13051e', '#6a0572', '#d946a8', '#ffffff'], encounterTypes: ['light_filament', 'planet', 'comet'], nebulaProfile: { density: .54, filamentDensity: .67, darkZoneFraction: .38 } },
  { id: 'MEMORIA', label: 'Memoria', durationRange: [58, 92], paletteHint: ['#08061c', '#37206f', '#a23885', '#ffb25c'], encounterTypes: ['planet', 'vessel', 'light_filament', 'debris'], nebulaProfile: { density: .48, filamentDensity: .50, darkZoneFraction: .44 } },
  { id: 'FRONTERA', label: 'Frontera', durationRange: [46, 74], paletteHint: ['#02030b', '#18244b', '#6d3b7e', '#ffd08a'], encounterTypes: ['void_pulse', 'vessel', 'light_filament'], nebulaProfile: { density: .36, filamentDensity: .34, darkZoneFraction: .62 } },
  { id: 'RETORNO', label: 'Retorno', durationRange: [52, 84], paletteHint: ['#050916', '#183d6d', '#8c5f9e', '#fff4d6'], encounterTypes: ['comet', 'debris', 'light_filament', 'planet'], nebulaProfile: { density: .31, filamentDensity: .45, darkZoneFraction: .50 } },
];

export class NarrativeStateMachine {
  private index = 0;
  private elapsed = 0;
  private targetDuration = this.pickDuration(STAGES[0]);
  private transitionAge = 0;
  private transitionDuration = 10;
  private transitioning = false;
  private listeners = new Set<(stage: NarrativeStage) => void>();

  get current(): NarrativeStage { return STAGES[this.index]; }

  onTransition(listener: (stage: NarrativeStage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(dt: number): NarrativeSnapshot {
    this.elapsed += dt;
    if (!this.transitioning && this.elapsed >= this.targetDuration) this.advance();
    if (this.transitioning) {
      this.transitionAge += dt;
      if (this.transitionAge >= this.transitionDuration) this.transitioning = false;
    }
    return this.snapshot();
  }

  private advance(): void {
    this.index = (this.index + 1) % STAGES.length;
    this.elapsed = 0;
    this.targetDuration = this.pickDuration(this.current);
    this.transitionDuration = 8 + Math.random() * 4;
    this.transitionAge = 0;
    this.transitioning = true;
    this.listeners.forEach((listener) => listener(this.current));
  }

  private pickDuration(stage: NarrativeStage): number {
    const [min, max] = stage.durationRange;
    return min + Math.random() * (max - min);
  }

  private snapshot(): NarrativeSnapshot {
    return {
      stage: this.current,
      elapsed: this.elapsed,
      targetDuration: this.targetDuration,
      transitioning: this.transitioning,
      transitionProgress: this.transitioning ? Math.min(1, this.transitionAge / this.transitionDuration) : 1,
    };
  }
}
