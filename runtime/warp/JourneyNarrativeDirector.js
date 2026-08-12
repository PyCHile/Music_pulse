const clamp01=v=>Math.max(0,Math.min(1,v));
const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const gaussian=(x,c,w)=>Math.exp(-Math.pow((x-c)/w,2)*.5);
export class JourneyNarrativeDirector{
  constructor(){this.heartClock=0;this.climaxReached=false;this.climaxAge=0;this.bridgeReached=false;this.bridgeAge=0;this.returnReached=false;this.returnAge=0;this.stage='DETACHMENT';this.stageAge=0;}
  update(dt,features,musicalState,progress){
    const p=clamp01(progress||0);
    const climaxSignal=(p>.32&&musicalState.phase==='CLIMAX'&&features.energy>.38)||(p>.38&&features.climaxProbability>.72&&features.energy>.44)||p>.62;
    if(!this.climaxReached&&climaxSignal){this.climaxReached=true;this.climaxAge=0;}
    if(this.climaxReached)this.climaxAge+=dt;
    const bridgeSignal=this.climaxReached&&p>.79&&((musicalState.phase==='RELEASING'||musicalState.phase==='RECOVERING')||musicalState.trend<-.035||features.calmness>.50);
    if(!this.bridgeReached&&(bridgeSignal||p>.895)){this.bridgeReached=true;this.bridgeAge=0;}
    if(this.bridgeReached)this.bridgeAge+=dt;
    const finalHookSignal=this.bridgeReached&&p>.88&&((musicalState.phase==='BUILDING'||musicalState.phase==='ACCELERATING'||musicalState.phase==='CLIMAX')||features.crescendo>.13||features.energy>features.mediumTermEnergy+.055);
    if(!this.returnReached&&(finalHookSignal||p>.965)){this.returnReached=true;this.returnAge=0;}
    if(this.returnReached)this.returnAge+=dt;
    let next='DETACHMENT';if(this.returnReached)next='RETURN';else if(this.bridgeReached)next='BOUNDARY';else if(this.climaxReached&&p>.78)next='LIFE_REVIEW';else if(this.climaxReached&&(this.climaxAge>13||p>.69))next='IDEALIZED_COSMOS';else if(this.climaxReached)next='LIVING_LIGHT';else if(p>.09)next='DARK_TUNNEL';if(next!==this.stage){this.stage=next;this.stageAge=0;}else this.stageAge+=dt;
    const detachment=smoothstep(.006,.034,p)*(1-smoothstep(.075,.115,p));
    const heartJourney=smoothstep(.015,.60,p),bpm=mix(76,49,heartJourney),period=60/bpm;this.heartClock=(this.heartClock+dt)%period;const hp=this.heartClock/period,lub=gaussian(hp,.060,.021),dub=gaussian(hp,.205,.038)*.60,heartDecay=(1-smoothstep(.08,.59,p))*(1-clamp01(features.climaxProbability*.68)),heartbeat=this.climaxReached?0:clamp01((lub+dub)*heartDecay);
    const tunnelDrive=this.climaxReached?0:smoothstep(.075,.17,p);
    const preBridgeGlow=this.climaxReached?smoothstep(1.8,18.0,this.climaxAge)*smoothstep(.60,.77,p):0;
    const livingLight=preBridgeGlow*(1-smoothstep(.86,.93,p));
    const galaxyReveal=this.climaxReached?clamp01(smoothstep(5.0,30.0,this.climaxAge)*.52+smoothstep(.69,.90,p)*.56):0;
    const idealized=this.climaxReached?smoothstep(.67,.76,p)*(1-smoothstep(.82,.90,p)):0;
    const lifeReview=this.climaxReached?smoothstep(.75,.82,p)*(1-smoothstep(.88,.93,p)):0;
    const boundary=this.bridgeReached?smoothstep(0,9.5,this.bridgeAge):0;
    const returnForce=this.returnReached?smoothstep(0,2.4,this.returnAge):0;
    const returnFlash=this.returnReached?gaussian(this.returnAge,.80,.42):0;
    const finalFade=this.returnReached?smoothstep(1.6,5.8,this.returnAge):0;
    const travelFade=clamp01(livingLight*.34+idealized*.50+boundary*.72+returnForce*.94);
    const hookEnergy=clamp01((features.energy*.72+features.mid*.18+features.highMid*.10-.22)*2.35);const hookPhase=(musicalState.phase==='BUILDING'||musicalState.phase==='ACCELERATING')?1:.48;const hookWindow=Math.max(smoothstep(.18,.22,p)*(1-smoothstep(.31,.35,p)),smoothstep(.39,.43,p)*(1-smoothstep(.52,.56,p)));const preHook=this.climaxReached?0:Math.max(hookEnergy*hookPhase,hookWindow*.70);const finalHook=this.returnReached?gaussian(this.returnAge,.88,.66):0;const hookPresence=clamp01(Math.max(preHook,finalHook*.92));
    const boundaryTurn=boundary*(1-smoothstep(5.5,11.5,this.bridgeAge)),reviewSweep=lifeReview*Math.sin(p*92.0)*.075,turnX=boundaryTurn*.18+reviewSweep,turnY=detachment*.105-boundaryTurn*.10+lifeReview*Math.cos(p*77.0)*.038;
    return{stage:this.stage,stageAge:this.stageAge,progress:p,detachment,heartbeat,heartStopped:this.climaxReached,tunnelDrive,livingLight,galaxyReveal,idealized,lifeReview,boundary,returnForce,returnFlash,finalFade,travelFade,hookPresence,turnX,turnY,climaxReached:this.climaxReached,bridgeReached:this.bridgeReached,returnReached:this.returnReached};
  }
  apply(state,n){
    const light=n.livingLight,ideal=n.idealized,review=n.lifeReview,boundary=n.boundary,ret=n.returnForce,fade=n.finalFade;const calmAfterClimax=clamp01(light*.52+ideal*.72+review*.78+boundary*.92),forwardFactor=mix(1,.52,light)*mix(1,.32,ideal)*mix(1,.22,review)*mix(1,.065,boundary),returnCut=mix(1,.02,ret)*(1-fade);
    return{...state,speed:Math.max(0,state.speed*forwardFactor*returnCut),warpIntensity:Math.max(0,state.warpIntensity*mix(1,.46,light)*mix(1,.26,ideal)*mix(1,.18,review)*mix(1,.09,boundary)*returnCut),streakLength:Math.max(0,state.streakLength*mix(1,.34,light)*mix(1,.16,ideal)*mix(1,.11,review)*mix(1,.05,boundary)*returnCut),starDensity:Math.max(.18,state.starDensity*mix(1,.90,light)*mix(1,.94,ideal)*mix(1,.96,review)*mix(1,.80,boundary)*mix(1,.58,ret)),fov:mix(state.fov,60,clamp01(calmAfterClimax*.74+ret)),bloom:Math.max(.03,state.bloom*mix(1,.80,light)*mix(1,.84,ideal)*mix(1,.88,review)*mix(1,.62,boundary)*mix(1,.34,ret)),dustDensity:Math.max(.018,state.dustDensity*mix(1,.78,light)*mix(1,.68,ideal)*mix(1,.56,boundary)),nebulaPresence:Math.min(1,Math.max(state.nebulaPresence,n.galaxyReveal*.96+n.idealized*.18)),darkness:Math.max(.20,state.darkness-mix(0,.38,n.galaxyReveal)-mix(0,.04,n.livingLight)),shimmer:Math.max(.018,(state.shimmer??.1)*mix(1,.48,light)+review*.10),compression:(state.compression??0)*mix(1,.10,boundary),heartPulse:n.heartbeat,heartStopped:n.heartStopped,soulProgress:n.progress,detachment:n.detachment,tunnelDrive:n.tunnelDrive,livingLight:n.livingLight,galaxyReveal:n.galaxyReveal,idealized:n.idealized,lifeReview:n.lifeReview,boundary:n.boundary,returnForce:n.returnForce,returnFlash:n.returnFlash,finalFade:n.finalFade,travelFade:n.travelFade,hookPresence:n.hookPresence,journeyStage:n.stage};
  }
}
