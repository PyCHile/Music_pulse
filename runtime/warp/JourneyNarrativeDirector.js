const clamp01=v=>Math.max(0,Math.min(1,v));
const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const gaussian=(x,c,w)=>Math.exp(-Math.pow((x-c)/w,2)*.5);
export class JourneyNarrativeDirector{
  constructor(){this.heartClock=0;this.climaxReached=false;this.climaxAge=0;this.bridgeReached=false;this.bridgeAge=0;this.finalHookReached=false;this.stage='HEARTBEAT';}
  update(dt,features,musicalState,progress){
    const p=clamp01(progress||0);
    const climaxSignal=(musicalState.phase==='CLIMAX'&&features.energy>.40)||(features.climaxProbability>.72&&features.energy>.48);
    if(!this.climaxReached&&p>.28&&climaxSignal){this.climaxReached=true;this.climaxAge=0;this.stage='CLIMAX_STILLNESS';}
    if(this.climaxReached)this.climaxAge+=dt;
    const bridgeSignal=this.climaxReached&&p>.66&&((musicalState.phase==='RELEASING'||musicalState.phase==='RECOVERING')||features.calmness>.46||musicalState.trend<-.035);
    if(!this.bridgeReached&&(bridgeSignal||p>.80)){this.bridgeReached=true;this.bridgeAge=0;this.stage='BRIDGE_ARRIVAL';}
    if(this.bridgeReached)this.bridgeAge+=dt;
    const hookSignal=this.bridgeReached&&p>.80&&((musicalState.phase==='BUILDING'||musicalState.phase==='ACCELERATING'||musicalState.phase==='CLIMAX')||features.crescendo>.12);
    if(!this.finalHookReached&&(hookSignal||p>.91)){this.finalHookReached=true;this.stage='FINAL_HOOK_STILLNESS';}

    const ascent=smoothstep(.04,.62,p);
    const bpm=mix(70,50,ascent);
    const period=60/bpm;
    this.heartClock=(this.heartClock+dt)%period;
    const hp=this.heartClock/period;
    const lub=gaussian(hp,.070,.025);
    const dub=gaussian(hp,.205,.042)*.58;
    const preClimaxEnvelope=(1-smoothstep(.10,.68,p))*(1-clamp01(features.climaxProbability*.70));
    const heartbeat=this.climaxReached?0:clamp01((lub+dub)*(.92*preClimaxEnvelope+.05));

    const postSoft=this.climaxReached?smoothstep(0,13,this.climaxAge):0;
    const galaxyReveal=this.climaxReached?clamp01(smoothstep(1.0,15,this.climaxAge)*.72+smoothstep(.62,.88,p)*.42):smoothstep(.45,.72,p)*.08;
    const arrival=this.bridgeReached?smoothstep(0,9.5,this.bridgeAge):0;
    const fullStill=this.finalHookReached?Math.max(arrival,.92):arrival;
    const travelFade=clamp01(postSoft*.58+fullStill*.82);
    const perspectiveTurn=this.bridgeReached?smoothstep(0,5.5,this.bridgeAge)*(1-smoothstep(8,14,this.bridgeAge)):0;
    const turnX=perspectiveTurn*.19;
    const turnY=-perspectiveTurn*.11;
    return{stage:this.stage,progress:p,heartbeat,postSoftness:postSoft,galaxyReveal,arrival:fullStill,travelFade,turnX,turnY,climaxReached:this.climaxReached,bridgeReached:this.bridgeReached,finalHookReached:this.finalHookReached};
  }
  apply(state,narrative){
    const fade=narrative.travelFade,arrival=narrative.arrival,soft=narrative.postSoftness;
    return{...state,
      speed:Math.max(0,state.speed*mix(1,.34,soft)*mix(1,.025,arrival)),
      warpIntensity:Math.max(0.015,state.warpIntensity*mix(1,.34,soft)*mix(1,.08,arrival)),
      streakLength:Math.max(.025,state.streakLength*mix(1,.26,soft)*mix(1,.045,arrival)),
      starDensity:Math.max(.34,state.starDensity*mix(1,.80,soft)*mix(1,.68,arrival)),
      fov:mix(state.fov,62,clamp01(soft*.55+arrival*.9)),
      bloom:Math.max(.08,state.bloom*mix(1,.62,soft)*mix(1,.44,arrival)),
      dustDensity:Math.max(.035,state.dustDensity*mix(1,.72,soft)*mix(1,.42,arrival)),
      nebulaPresence:Math.min(.98,Math.max(state.nebulaPresence,narrative.galaxyReveal)),
      darkness:Math.max(.46,state.darkness-mix(0,.22,narrative.galaxyReveal)),
      shimmer:Math.max(.04,(state.shimmer??.1)*mix(1,.48,soft)),
      compression:(state.compression??0)*mix(1,.18,arrival),
      heartPulse:narrative.heartbeat,
      galaxyReveal:narrative.galaxyReveal,
      travelFade:fade,
      arrival:arrival,
      journeyStage:narrative.stage
    };
  }
}
