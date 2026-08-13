import type { EncounterType, NarrativeStage } from './NarrativeStateMachine';

export interface Encounter {
  id: string;
  narrativeStage: string;
  objectType: EncounterType;
  spawnDepth: number;
  spawnPosition: { x: number; y: number };
  focalApproach: boolean;
  trajectoryVector: { x: number; y: number; z: number };
  scale: number;
  speed: number;
  palette: string[];
  luminosity: number;
  durationSeconds: number;
}

export interface NebulaUpdate {
  darkZoneFraction: number;
  filamentDensity: number;
  luminousCore: { x: number; y: number };
  chromaticRange: string[];
}

export interface EncounterBatch { encounters: Encounter[]; nebulaUpdate: NebulaUpdate; }

const RESPONSE_SCHEMA = {
  name: 'urux_encounter_batch', strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['encounters', 'nebulaUpdate'],
    properties: {
      encounters: { type: 'array', minItems: 3, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['id','narrativeStage','objectType','spawnDepth','spawnPosition','focalApproach','trajectoryVector','scale','speed','palette','luminosity','durationSeconds'], properties: {
        id:{type:'string'}, narrativeStage:{type:'string'}, objectType:{enum:['planet','comet','debris','light_filament','vessel','void_pulse']}, spawnDepth:{type:'number'}, spawnPosition:{type:'object',additionalProperties:false,required:['x','y'],properties:{x:{type:'number'},y:{type:'number'}}}, focalApproach:{type:'boolean'}, trajectoryVector:{type:'object',additionalProperties:false,required:['x','y','z'],properties:{x:{type:'number'},y:{type:'number'},z:{type:'number'}}}, scale:{type:'number'}, speed:{type:'number'}, palette:{type:'array',items:{type:'string'}}, luminosity:{type:'number'}, durationSeconds:{type:'number'}
      }}},
      nebulaUpdate:{type:'object',additionalProperties:false,required:['darkZoneFraction','filamentDensity','luminousCore','chromaticRange'],properties:{darkZoneFraction:{type:'number',minimum:.3,maximum:1},filamentDensity:{type:'number',minimum:0,maximum:1},luminousCore:{type:'object',additionalProperties:false,required:['x','y'],properties:{x:{type:'number'},y:{type:'number'}}},chromaticRange:{type:'array',items:{type:'string'}}}}
    }
  }
};

export class EncounterPlanner {
  private buffer: Encounter[] = [];
  private lastRequestAt = -Infinity;
  private inFlight = false;
  private lastNebulaUpdate: NebulaUpdate | null = null;

  constructor(private readonly getModel: () => Promise<string | null>, private readonly getApiKey: () => string | null) {}

  get pending(): number { return this.buffer.length; }
  get nebulaUpdate(): NebulaUpdate | null { return this.lastNebulaUpdate; }
  consume(): Encounter | null { return this.buffer.shift() ?? null; }

  async refill(stage: NarrativeStage, force = false): Promise<boolean> {
    const now = performance.now();
    if (this.inFlight || (!force && this.buffer.length >= 1) || now - this.lastRequestAt < 20_000) return false;
    const apiKey = this.getApiKey();
    if (!apiKey) return false;
    this.inFlight = true;
    this.lastRequestAt = now;
    try {
      const model = await this.getModel();
      if (!model) return false;
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': location.origin, 'X-Title': 'URUX Journey Director' },
        body: JSON.stringify({
          model,
          temperature: .72,
          provider: { require_parameters: true },
          response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
          messages: [{ role: 'system', content: this.systemPrompt(stage) }, { role: 'user', content: `Generate 3 to 6 future encounters for ${stage.id}.` }]
        })
      });
      if (!response.ok) throw new Error(`OpenRouter completion failed: ${response.status}`);
      const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content;
      if (!content) return false;
      const parsed = JSON.parse(content) as EncounterBatch;
      if (!Array.isArray(parsed.encounters) || parsed.encounters.length < 3 || parsed.encounters.length > 6) return false;
      parsed.nebulaUpdate.darkZoneFraction = Math.max(.3, parsed.nebulaUpdate.darkZoneFraction);
      this.buffer.push(...parsed.encounters.map((e) => ({ ...e, narrativeStage: stage.id, spawnDepth: 0 })));
      this.lastNebulaUpdate = parsed.nebulaUpdate;
      return true;
    } catch (error) {
      console.warn('[URUX] Encounter batch rejected; autonomous mode remains active.', error);
      return false;
    } finally { this.inFlight = false; }
  }

  private systemPrompt(stage: NarrativeStage): string {
    return `Eres el director narrativo del tránsito cósmico de URUX. Generas instrucciones para el motor Three.js que renderiza el viaje de un alma a través del cosmos. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin backticks. El JSON debe seguir exactamente el schema de encounters + nebulaUpdate. Cada encuentro debe tener una razón narrativa coherente con el estado: ${stage.id}. Los objetos nacen desde la profundidad (spawnDepth: 0) y avanzan hacia el observador. Mantén zonas oscuras (darkZoneFraction >= 0.3) para que los encuentros tengan impacto visual. La paleta cromática del estado actual es: ${stage.paletteHint.join(', ')}.`;
  }
}
