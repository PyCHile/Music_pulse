type Encounter={id:string;narrativeStage:string;objectType:string;spawnDepth:number;spawnPosition:{x:number;y:number};focalApproach:boolean;trajectoryVector:{x:number;y:number;z:number};scale:number;speed:number;palette:string[];luminosity:number;durationSeconds:number};
type Batch={encounters:Encounter[];nebulaUpdate:{darkZoneFraction:number;filamentDensity:number;luminousCore:{x:number;y:number};chromaticRange:string[]}};
const stages=['DESPRENDIMIENTO','TUNEL','LUZ','MEMORIA','FRONTERA','RETORNO'];
const types=['planet','comet','debris','light_filament','vessel','void_pulse'];
const hex=(v:string)=>/^#[0-9a-fA-F]{6}$/.test(v);
const finite=(v:number)=>Number.isFinite(v);
export async function main(batch:Batch,allowedCapabilities:string[]=[]){
  const errors:string[]=[];
  if(!batch||!Array.isArray(batch.encounters)||batch.encounters.length<3||batch.encounters.length>6)errors.push('encounters_count');
  const ids=new Set<string>();
  for(const e of batch?.encounters||[]){if(!e?.id||ids.has(e.id))errors.push('encounter_id');else ids.add(e.id);if(!stages.includes(e.narrativeStage))errors.push(`${e.id}:stage`);if(!types.includes(e.objectType))errors.push(`${e.id}:type`);if(e.spawnDepth!==0)errors.push(`${e.id}:spawnDepth`);if(!finite(e.spawnPosition?.x)||!finite(e.spawnPosition?.y)||Math.abs(e.spawnPosition.x)>1.5||Math.abs(e.spawnPosition.y)>1.5)errors.push(`${e.id}:spawnPosition`);if(!finite(e.trajectoryVector?.x)||!finite(e.trajectoryVector?.y)||!finite(e.trajectoryVector?.z)||Math.abs(e.trajectoryVector.x)+Math.abs(e.trajectoryVector.y)+Math.abs(e.trajectoryVector.z)<.001)errors.push(`${e.id}:trajectory`);if(!finite(e.scale)||e.scale<=0||e.scale>8)errors.push(`${e.id}:scale`);if(!finite(e.speed)||e.speed<=0||e.speed>4)errors.push(`${e.id}:speed`);if(!finite(e.luminosity)||e.luminosity<0||e.luminosity>3)errors.push(`${e.id}:luminosity`);if(!finite(e.durationSeconds)||e.durationSeconds<3||e.durationSeconds>45)errors.push(`${e.id}:duration`);if(!Array.isArray(e.palette)||!e.palette.length||!e.palette.every(hex))errors.push(`${e.id}:palette`);}
  const n=batch?.nebulaUpdate;if(!n||!finite(n.darkZoneFraction)||n.darkZoneFraction<.3||n.darkZoneFraction>1)errors.push('nebula.darkZoneFraction');if(!n||!finite(n.filamentDensity)||n.filamentDensity<0||n.filamentDensity>1)errors.push('nebula.filamentDensity');if(!n?.chromaticRange?.length||!n.chromaticRange.every(hex))errors.push('nebula.chromaticRange');
  return{ok:errors.length===0,errors,allowedCapabilities:[...new Set(allowedCapabilities)].sort(),policy:'Windmill validates/orchestrates only; never runs in Three.js render loop'};
}
