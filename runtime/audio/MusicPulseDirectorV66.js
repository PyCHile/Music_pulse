const clamp01=v=>Math.max(0,Math.min(1,v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/Math.max(.0001,b-a));return t*t*(3-2*t);};
const smooth=(a,b,dt,speed)=>a+(b-a)*(1-Math.exp(-speed*dt));

function macroArc(progress){
 const p=clamp01(progress);
 if(p<.10)return mix(.08,.22,smoothstep(0,.10,p));
 if(p<.34)return mix(.22,.48,smoothstep(.10,.34,p));
 if(p<.62)return mix(.48,.74,smoothstep(.34,.62,p));
 if(p<.82)return mix(.74,1.0,smoothstep(.62,.82,p));
 return mix(.94,.38,smoothstep(.82,1.0,p));
}
function sectionFor(p){
 if(p<.10)return'INTRO';
 if(p<.34)return'DEVELOPMENT';
 if(p<.62)return'EXPANSION';
 if(p<.84)return'CLIMAX';
 return'RESOLUTION';
}
const PHASE_BOOST={CALM:0,BUILDING:.12,ACCELERATING:.22,CLIMAX:.30,RELEASING:.08,RECOVERING:.03};

export class MusicPulseDirector{
 constructor(){
  this.clock=0;this.energy=0;this.crescendo=0;this.beatPulse=0;this.lastBeatAt=-10;
  this.snapshot={revision:'v66-music-crescendo-director',section:'INTRO',progress:0,macroArc:.08,smoothedEnergy:0,crescendo:0,beatPulse:0,speedTarget:4,nebulaScale:.04,visualEnergy:.05,allowCloseComet:false,eventReadiness:0,whiteoutBudget:1};
 }
 update(features={},musicalState={},progress=0,dt=1/60){
  const d=clamp(Number(dt)||1/60,.001,.12),p=clamp01(progress||0);this.clock+=d;
  const rawEnergy=clamp01((features.shortTermEnergy||features.energy||0)*.48+(features.rms||0)*.22+(features.bass||0)*.16+(features.mid||0)*.08+(features.highMid||0)*.06);
  this.energy=smooth(this.energy,rawEnergy,d,rawEnergy>this.energy?2.5:.72);
  const phase=musicalState.phase||'CALM',phaseBoost=PHASE_BOOST[phase]||0;
  const crescendoTarget=clamp01((features.crescendo||0)*.56+Math.max(0,musicalState.trend||0)*1.15+phaseBoost);
  this.crescendo=smooth(this.crescendo,crescendoTarget,d,crescendoTarget>this.crescendo?1.8:.55);
  const onset=clamp01((features.transient||0)*.46+(features.spectralFlux||0)*.34+(features.bass||0)*.12+Math.max(0,(features.shortTermEnergy||0)-(features.mediumTermEnergy||0))*1.4);
  if(onset>.43&&this.clock-this.lastBeatAt>.24){this.beatPulse=Math.max(this.beatPulse,clamp01(.68+onset*.42));this.lastBeatAt=this.clock;}
  else this.beatPulse*=Math.exp(-d*5.7);
  const arc=macroArc(p),section=sectionFor(p),musicGate=.54+.46*this.energy;
  const visualEnergy=clamp01(arc*musicGate+this.crescendo*.14+this.beatPulse*.045);
  const speedBase=3.4+arc*18.5+this.energy*7.2+this.crescendo*4.8;
  const speedTarget=Math.min(8+arc*30.5,speedBase+this.beatPulse*(1.0+arc*2.2));
  const n1=smoothstep(.07,.23,p),n2=smoothstep(.23,.58,p),n3=smoothstep(.58,.78,p),resolution=1-.56*smoothstep(.86,1,p);
  const nebulaScale=clamp((.045+n1*.18+n2*.36+n3*.20)*(.66+.34*this.energy)*resolution,.035,.78);
  const starScale=clamp(.42+arc*.50+this.energy*.08,.40,.95);
  const streakScale=clamp(.26+visualEnergy*.70,.25,.93);
  const bloomScale=clamp(.36+visualEnergy*.42,.36,.78);
  const eventReadiness=clamp01(smoothstep(.10,.22,p)*(.34+arc*.32+this.energy*.20+this.crescendo*.22));
  const allowCloseComet=p>.12&&eventReadiness>.34&&section!=='RESOLUTION';
  const cometIntensity=clamp(.30+visualEnergy*.28,.30,.58);
  const warpScale=clamp(.30+visualEnergy*.68,.30,.94);
  const whiteoutBudget=clamp(1-nebulaScale*.12-cometIntensity*(allowCloseComet?0.06:0),.78,1);
  this.snapshot={revision:'v66-music-crescendo-director',section,progress:p,macroArc:arc,smoothedEnergy:this.energy,crescendo:this.crescendo,beatPulse:this.beatPulse,visualEnergy,speedTarget,nebulaScale,starScale,streakScale,bloomScale,warpScale,eventReadiness,allowCloseComet,cometIntensity,whiteoutBudget,audioPhase:phase};
  return this.snapshot;
 }
}
