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
        id:{type:'string'}, narrativeStage:{type:'string'}, objectType:{enum:['planet','comet','debris','light_filament','vessel','void_pulse']}, spawnDepth:{type:'number'}, spawnPosition:{type:'object',additionalProperties:false,required:['x','y'],properties:{x:{type:'number'},y:{type:'number'}}}, focalApproach:{type:'boolean'}, trajectoryVector:{type:'object',additionalProperties:false,required:['x','y','z'],properties:{x:{type:'number'},y:{type:'number'},z:{type:'number'}}}, scale:{type:'number'}, speed:{type:'number'}, palette:{type:'array',minItems:1,maxItems:6,items:{type:'string'}}, luminosity:{type:'number'}, durationSeconds:{type:'number'}
      }}},
      nebulaUpdate:{type:'object',additionalProperties:false,required:['darkZoneFraction','filamentDensity','luminousCore','chromaticRange'],properties:{darkZoneFraction:{type:'number',minimum:.3,maximum:1},filamentDensity:{type:'number',minimum:0,maximum:1},luminousCore:{type:'object',additionalProperties:false,required:['x','y'],properties:{x:{type:'number'},y:{type:'number'}}},chromaticRange:{type:'array',minItems:1,maxItems:8,items:{type:'string'}}}}
    }
  }
};

const DAILY_LIMIT = 50;
const BUDGET_KEY = 'urux_openrouter_daily_budget';

interface DailyBudget { day: string; requests: number; }

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

export class EncounterPlanner {
  private buffer: Encounter[] = [];
  private lastRequestAt = -Infinity;
  private inFlight = false;
  private lastNebulaUpdate: NebulaUpdate | null = null;
  private retryNotBefore = 0;

  constructor(private readonly getModel: () => Promise<string | null>, private readonly getApiKey: () => string | null) {}

  get pending(): number { return this.buffer.length; }
  get nebulaUpdate(): NebulaUpdate | null { return this.lastNebulaUpdate; }
  get dailyRequestsRemaining(): number { return Math.max(0, DAILY_LIMIT - this.readBudget().requests); }
  consume(): Encounter | null { return this.buffer.shift() ?? null; }

  async refill(stage: NarrativeStage, force = false): Promise<boolean> {
    const now = performance.now();
    if (this.inFlight || (!force && this.buffer.length >= 1) || now - this.lastRequestAt < 20_000 || Date.now() < this.retryNotBefore) return false;
    if (this.dailyRequestsRemaining <= 0) return false;

    const apiKey = this.getApiKey();
    if (!apiKey) return false;

    this.inFlight = true;
    this.lastRequestAt = now;
    try {
      const model = await this.getModel();
      if (!model) return false;

      this.incrementBudget();
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

      if (response.status === 429 || response.status === 503) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        if (Number.isFinite(retryAfter) && retryAfter > 0) this.retryNotBefore = Date.now() + retryAfter * 1000;
      }
      if (!response.ok) throw new Error(`OpenRouter completion failed: ${response.status}`);

      const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content;
      if (!content) return false;

      const parsed = JSON.parse(content) as EncounterBatch;
      if (!this.validateBatch(parsed, stage)) return false;

      parsed.nebulaUpdate.darkZoneFraction = Math.max(.3, parsed.nebulaUpdate.darkZoneFraction);
      this.buffer.push(...parsed.encounters.map((encounter) => ({ ...encounter, narrativeStage: stage.id, spawnDepth: 0 })));
      this.lastNebulaUpdate = parsed.nebulaUpdate;
      return true;
    } catch (error) {
      console.warn('[URUX] Encounter batch rejected; autonomous mode remains active.', error);
      return false;
    } finally {
      this.inFlight = false;
    }
  }

  private validateBatch(batch: EncounterBatch, stage: NarrativeStage): boolean {
    if (!batch || !Array.isArray(batch.encounters) || batch.encounters.length < 3 || batch.encounters.length > 6) return false;
    if (!batch.nebulaUpdate || !isFiniteNumber(batch.nebulaUpdate.darkZoneFraction) || batch.nebulaUpdate.darkZoneFraction < .3 || batch.nebulaUpdate.darkZoneFraction > 1) return false;
    if (!isFiniteNumber(batch.nebulaUpdate.filamentDensity) || batch.nebulaUpdate.filamentDensity < 0 || batch.nebulaUpdate.filamentDensity > 1) return false;
    if (!batch.nebulaUpdate.luminousCore || !isFiniteNumber(batch.nebulaUpdate.luminousCore.x) || !isFiniteNumber(batch.nebulaUpdate.luminousCore.y)) return false;
    if (!Array.isArray(batch.nebulaUpdate.chromaticRange) || batch.nebulaUpdate.chromaticRange.length < 1 || !batch.nebulaUpdate.chromaticRange.every(isHexColor)) return false;

    const ids = new Set<string>();
    for (const encounter of batch.encounters) {
      if (!encounter || typeof encounter.id !== 'string' || !encounter.id.trim() || ids.has(encounter.id)) return false;
      ids.add(encounter.id);
      if (encounter.narrativeStage !== stage.id) return false;
      if (!stage.encounterTypes.includes(encounter.objectType)) return false;
      if (!isFiniteNumber(encounter.spawnDepth) || encounter.spawnDepth !== 0) return false;
      if (!encounter.spawnPosition || !isFiniteNumber(encounter.spawnPosition.x) || !isFiniteNumber(encounter.spawnPosition.y)) return false;
      if (Math.abs(encounter.spawnPosition.x) > 1.5 || Math.abs(encounter.spawnPosition.y) > 1.5) return false;
      if (!encounter.trajectoryVector || !isFiniteNumber(encounter.trajectoryVector.x) || !isFiniteNumber(encounter.trajectoryVector.y) || !isFiniteNumber(encounter.trajectoryVector.z)) return false;
      if (Math.abs(encounter.trajectoryVector.x) + Math.abs(encounter.trajectoryVector.y) + Math.abs(encounter.trajectoryVector.z) < .001) return false;
      if (!isFiniteNumber(encounter.scale) || encounter.scale <= 0 || encounter.scale > 8) return false;
      if (!isFiniteNumber(encounter.speed) || encounter.speed <= 0 || encounter.speed > 4) return false;
      if (!isFiniteNumber(encounter.luminosity) || encounter.luminosity < 0 || encounter.luminosity > 3) return false;
      if (!isFiniteNumber(encounter.durationSeconds) || encounter.durationSeconds < 3 || encounter.durationSeconds > 45) return false;
      if (!Array.isArray(encounter.palette) || encounter.palette.length < 1 || !encounter.palette.every(isHexColor)) return false;
    }
    return true;
  }

  private readBudget(): DailyBudget {
    const day = new Date().toISOString().slice(0, 10);
    try {
      const stored = JSON.parse(localStorage.getItem(BUDGET_KEY) ?? 'null') as DailyBudget | null;
      if (stored?.day === day && Number.isInteger(stored.requests) && stored.requests >= 0) return stored;
    } catch { /* reset malformed local budget state */ }
    return { day, requests: 0 };
  }

  private incrementBudget(): void {
    const budget = this.readBudget();
    localStorage.setItem(BUDGET_KEY, JSON.stringify({ day: budget.day, requests: budget.requests + 1 } satisfies DailyBudget));
  }

  private systemPrompt(stage: NarrativeStage): string {
    return `Eres el director narrativo del tránsito cósmico de URUX. Generas instrucciones para el motor Three.js que renderiza el viaje de un alma a través del cosmos. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin backticks. El JSON debe seguir exactamente el schema de encounters + nebulaUpdate. Cada encuentro debe tener una razón narrativa coherente con el estado: ${stage.id}. Usa únicamente estos objectType para este estado: ${stage.encounterTypes.join(', ')}. Los objetos nacen desde la profundidad (spawnDepth: 0) y avanzan hacia el observador. Mantén zonas oscuras (darkZoneFraction >= 0.3) para que los encuentros tengan impacto visual. La paleta cromática del estado actual es: ${stage.paletteHint.join(', ')}.`;
  }
}
