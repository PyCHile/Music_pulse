const clamp01=v=>Math.max(0,Math.min(1,v));
const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const gaussian=(x,c,w)=>Math.exp(-Math.pow((x-c)/w,2)*.5);
export class JourneyNarrativeDirector{
  constructor(){this.heartClock=0;this.climaxReached=false;this.climaxAge=0;this.bridgeReached=false;this.bridgeAge=0;this.returnReached=false;this.returnAge=0;this.stage='DETACHMENT';}
  update(dt,features,musicalState,progress){
    const p=clamp01(progress||0);
    const climaxSignal=(p>.30&&musicalState.phase==='CLIMAX'&&features.energy>.38)||(p>.34&&features.climaxProbability>.70&&features.energy>.44)||p>.58;
    if(!this.climaxReached&&climaxSignal){this.climaxReached=true;this.climaxAge=0;}
    if(this.climaxReached)this.climaxAge+=dt;
    const bridgeSignal=this.climaxReached&&p>.72&&((musicalState.phase==='RELEASING'||musicalState.phase==='RECOVERING')||musicalState.trend<-.035||features.calmness>.52);
    if(!this.bridgeReached&&(bridgeSignal||p>.86)){this.bridgeReached=true;this.bridgeAge=0;}
    if(this.bridgeReached)this.bridgeAge+=dt;
    const finalHookSignal=this.bridgeReached&&p>.84&&((musicalState.phase==='BUILDING'||musicalState.phase==='ACCELERATING'||musicalState.phase==='CLIMAX')||features.crescendo>.13||features.energy>features.mediumTermEnergy+.06);
    if(!this.returnReached&&(finalHookSignal||p>.945)){this.returnReached=true;this.returnAge=0;}
    if(this.returnReached)this.returnAge+=dt;
    if(this.returnReached)this.stage='RETURN';else if(this.bridgeReached)this.stage='BOUNDARY';else if(this.climaxReached&&p>.72)this.stage='LIFE_REVIEW';else if(this.climaxReached&&p>.57)this.stage='IDEALIZED_COSMOS';else if(this.climaxReached)this.stage='LIVING_LIGHT';else if(p>.10)this.stage='DARK_TUNNEL';else this.stage='DETACHMENT';
    const ascent=smoothstep(.03,.55,p),bpm=mix(72,48,ascent),period=60/bpm;this.heartClock=(this.heartClock+dt)%period;const hp=this.heartClock/period,lub=gaussian(hp,.065,.022),dub=gaussian(hp,.205,.038)*.62,heartbeatEnvelope=this.climaxReached?0:(1-smoothstep(.08,.53,p))*(1-clamp01(features.climaxProbability*.58)),heartbeat=clamp01((lub+dub)*(.96*heartbeatEnvelope));
    const light=this.climaxReached?Math.max(smoothstep(.1,10,this.climaxAge),smoothstep(.54,.64,p)):smoothstep(.46,.58,p)*.06;
    const galaxyReveal=this.climaxReached?clamp01(Math.max(smoothstep(2,17,this.climaxAge)*.72,smoothstep(.58,.83,p))):0;
    const idealized=smoothstep(.57,.69,p)*(1-smoothstep(.78,.87,p));
    const lifeReview=smoothstep(.70,.77,p)*(1-smoothstep(.84,.90,p));
    const boundary=this.bridgeReached?Math.max(smoothstep(0,7.5,this.bridgeAge),smoothstep(.86,.925,p)):0;
    const returnForce=this.returnReached?Math.max(smoothstep(0,3.6,this.returnAge),smoothstep(.945,.978,p)):0;
    const finalFade=this.returnReached?Math.max(smoothstep(2.0,7.5,this.returnAge),smoothstep(.975,1.0,p)):0;
    const travelFade=clamp01(light*.48+boundary*.68+returnForce*.90);
    const perspectiveTurn=boundary*(1-returnForce)*(1-smoothstep(.94,.985,p)),turnX=perspectiveTurn*.22,turnY=-perspectiveTurn*.13;
    return{stage:this.stage,progress:p,heartbeat,light,galaxyReveal,idealized,lifeReview,boundary,returnForce,finalFade,travelFade,turnX,turnY,climaxReached:this.climaxReached,bridgeReached:this.bridgeReached,returnReached:this.returnReached};
  }
  apply(state,n){
    const soft=n.light,arrival=n.boundary,ret=n.returnForce,remaining=1-n.finalFade;
    return{...state,speed:Math.max(0,state.speed*mix(1,.42,soft)*mix(1,.09,arrival)*mix(1,.015,ret)*remaining),warpIntensity:Math.max(0,state.warpIntensity*mix(1,.36,soft)*mix(1,.12,arrival)*mix(1,.02,ret)*remaining),streakLength:Math.max(0,state.streakLength*mix(1,.28,soft)*mix(1,.07,arrival)*mix(1,.01,ret)*remaining),starDensity:Math.max(.18,state.starDensity*mix(1,.86,soft)*mix(1,.74,arrival)*mix(1,.55,ret)),fov:mix(state.fov,60,clamp01(soft*.48+arrival*.82+ret)),bloom:Math.max(.035,state.bloom*mix(1,.72,soft)*mix(1,.52,arrival)*mix(1,.30,ret)),dustDensity:Math.max(.02,state.dustDensity*mix(1,.70,soft)*mix(1,.42,arrival)),nebulaPresence:Math.min(1,Math.max(state.nebulaPresence,n.galaxyReveal)),darkness:Math.max(.28,state.darkness-mix(0,.34,n.galaxyReveal)),shimmer:Math.max(.02,(state.shimmer??.1)*mix(1,.44,soft)*remaining),compression:(state.compression??0)*mix(1,.10,arrival),heartPulse:n.heartbeat,galaxyReveal:n.galaxyReveal,idealized:n.idealized,lifeReview:n.lifeReview,boundary:n.boundary,returnForce:n.returnForce,finalFade:n.finalFade,travelFade:n.travelFade,journeyStage:n.stage};
  }
}
