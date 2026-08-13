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
export interface NebulaUpdate { darkZoneFraction: number; filamentDensity: number; luminousCore: { x: number; y: number }; chromaticRange: string[]; }
export interface EncounterBatch { encounters: Encounter[]; nebulaUpdate: NebulaUpdate; model?: string; }
const isFiniteNumber=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const isHexColor=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
const normalizeBackend=(value:string|null):string|null=>{if(!value)return null;const url=value.trim().replace(/\/$/,'');return /^https:\/\//i.test(url)?url:null;};
export class EncounterPlanner {
  private buffer: Encounter[]=[];
  private lastRequestAt=-Infinity;
  private inFlight=false;
  private lastNebulaUpdate:NebulaUpdate|null=null;
  private retryNotBefore=0;
  constructor(private readonly getBackendUrl:()=>string|null){}
  get pending():number{return this.buffer.length;}
  get nebulaUpdate():NebulaUpdate|null{return this.lastNebulaUpdate;}
  consume():Encounter|null{return this.buffer.shift()??null;}
  clearBuffer():void{this.buffer.length=0;}
  async refill(stage:NarrativeStage,force=false):Promise<boolean>{
    const now=performance.now();
    if(this.inFlight||(!force&&this.buffer.length>=1)||now-this.lastRequestAt<20_000||Date.now()<this.retryNotBefore)return false;
    const backend=normalizeBackend(this.getBackendUrl());
    if(!backend)return false;
    this.inFlight=true;this.lastRequestAt=now;
    try{
      const response=await fetch(`${backend}/v1/encounters`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({stage:stage.id})});
      if(response.status===429){const retryAfter=Number(response.headers.get('Retry-After'))||20;this.retryNotBefore=Date.now()+retryAfter*1000;}
      if(!response.ok)throw new Error(`URUX backend request failed: ${response.status}`);
      const parsed=await response.json() as EncounterBatch;
      if(!this.validateBatch(parsed,stage))return false;
      parsed.nebulaUpdate.darkZoneFraction=Math.max(.3,parsed.nebulaUpdate.darkZoneFraction);
      this.buffer.push(...parsed.encounters.map(encounter=>({...encounter,narrativeStage:stage.id,spawnDepth:0})));
      this.lastNebulaUpdate=parsed.nebulaUpdate;
      return true;
    }catch(error){console.warn('[URUX] Secure backend unavailable; autonomous mode remains active.',error);return false;}finally{this.inFlight=false;}
  }
  private validateBatch(batch:EncounterBatch,stage:NarrativeStage):boolean{
    if(!batch||!Array.isArray(batch.encounters)||batch.encounters.length<3||batch.encounters.length>6)return false;
    if(!batch.nebulaUpdate||!isFiniteNumber(batch.nebulaUpdate.darkZoneFraction)||batch.nebulaUpdate.darkZoneFraction<.3||batch.nebulaUpdate.darkZoneFraction>1)return false;
    if(!isFiniteNumber(batch.nebulaUpdate.filamentDensity)||batch.nebulaUpdate.filamentDensity<0||batch.nebulaUpdate.filamentDensity>1)return false;
    if(!batch.nebulaUpdate.luminousCore||!isFiniteNumber(batch.nebulaUpdate.luminousCore.x)||!isFiniteNumber(batch.nebulaUpdate.luminousCore.y))return false;
    if(!Array.isArray(batch.nebulaUpdate.chromaticRange)||batch.nebulaUpdate.chromaticRange.length<1||!batch.nebulaUpdate.chromaticRange.every(isHexColor))return false;
    const ids=new Set<string>();
    for(const encounter of batch.encounters){
      if(!encounter||typeof encounter.id!=='string'||!encounter.id.trim()||ids.has(encounter.id))return false;ids.add(encounter.id);
      if(encounter.narrativeStage!==stage.id||!stage.encounterTypes.includes(encounter.objectType))return false;
      if(!isFiniteNumber(encounter.spawnDepth)||encounter.spawnDepth!==0)return false;
      if(!encounter.spawnPosition||!isFiniteNumber(encounter.spawnPosition.x)||!isFiniteNumber(encounter.spawnPosition.y)||Math.abs(encounter.spawnPosition.x)>1.5||Math.abs(encounter.spawnPosition.y)>1.5)return false;
      if(!encounter.trajectoryVector||!isFiniteNumber(encounter.trajectoryVector.x)||!isFiniteNumber(encounter.trajectoryVector.y)||!isFiniteNumber(encounter.trajectoryVector.z))return false;
      if(Math.abs(encounter.trajectoryVector.x)+Math.abs(encounter.trajectoryVector.y)+Math.abs(encounter.trajectoryVector.z)<.001)return false;
      if(!isFiniteNumber(encounter.scale)||encounter.scale<=0||encounter.scale>8||!isFiniteNumber(encounter.speed)||encounter.speed<=0||encounter.speed>4)return false;
      if(!isFiniteNumber(encounter.luminosity)||encounter.luminosity<0||encounter.luminosity>3||!isFiniteNumber(encounter.durationSeconds)||encounter.durationSeconds<3||encounter.durationSeconds>45)return false;
      if(!Array.isArray(encounter.palette)||encounter.palette.length<1||!encounter.palette.every(isHexColor))return false;
    }
    return true;
  }
}
