const clamp01=v=>Math.max(0,Math.min(1,v));
const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const gaussian=(x,c,w)=>Math.exp(-Math.pow((x-c)/w,2)*.5);
export class JourneyNarrativeDirector{
  constructor(){this.heartClock=0;this.climaxReached=false;this.climaxAge=0;this.bridgeReached=false;this.bridgeAge=0;this.returnReached=false;this.returnAge=0;this.stage='DETACHMENT';this.stageAge=0;}
  update(dt,features,musicalState,progress){
    const p=clamp01(progress||0);
    const climaxSignal=(p>.30&&musicalState.phase==='CLIMAX'&&features.energy>.38)||(p>.34&&features.climaxProbability>.70&&features.energy>.44)||p>.60;
    if(!this.climaxReached&&climaxSignal){this.climaxReached=true;this.climaxAge=0;}
    if(this.climaxReached)this.climaxAge+=dt;

    const bridgeSignal=this.climaxReached&&p>.76&&((musicalState.phase==='RELEASING'||musicalState.phase==='RECOVERING')||musicalState.trend<-.035||features.calmness>.50);
    if(!this.bridgeReached&&(bridgeSignal||p>.875)){this.bridgeReached=true;this.bridgeAge=0;}
    if(this.bridgeReached)this.bridgeAge+=dt;

    const finalHookSignal=this.bridgeReached&&p>.86&&((musicalState.phase==='BUILDING'||musicalState.phase==='ACCELERATING'||musicalState.phase==='CLIMAX')||features.crescendo>.13||features.energy>features.mediumTermEnergy+.055);
    if(!this.returnReached&&(finalHookSignal||p>.955)){this.returnReached=true;this.returnAge=0;}
    if(this.returnReached)this.returnAge+=dt;

    let next='DETACHMENT';
    if(this.returnReached)next='RETURN';
    else if(this.bridgeReached)next='BOUNDARY';
    else if(this.climaxReached&&p>.72)next='LIFE_REVIEW';
    else if(this.climaxReached&&(this.climaxAge>7||p>.62))next='IDEALIZED_COSMOS';
    else if(this.climaxReached)next='LIVING_LIGHT';
    else if(p>.09)next='DARK_TUNNEL';
    if(next!==this.stage){this.stage=next;this.stageAge=0;}else this.stageAge+=dt;

    const detachment=smoothstep(.006,.034,p)*(1-smoothstep(.075,.115,p));
    const heartJourney=smoothstep(.015,.58,p);
    const bpm=mix(76,49,heartJourney);
    const period=60/bpm;
    this.heartClock=(this.heartClock+dt)%period;
    const hp=this.heartClock/period;
    const lub=gaussian(hp,.060,.021);
    const dub=gaussian(hp,.205,.038)*.60;
    const heartDecay=(1-smoothstep(.08,.56,p))*(1-clamp01(features.climaxProbability*.68));
    const heartbeat=this.climaxReached?0:clamp01((lub+dub)*heartDecay);

    const tunnelDrive=this.climaxReached?0:smoothstep(.075,.17,p);
    const livingLight=this.climaxReached?smoothstep(.05,8.5,this.climaxAge)*(1-smoothstep(.60,.72,p)):0;
    const galaxyReveal=this.climaxReached?clamp01(smoothstep(2.0,18,this.climaxAge)*.72+smoothstep(.60,.82,p)*.52):0;
    const idealized=this.climaxReached?smoothstep(.60,.68,p)*(1-smoothstep(.77,.84,p)):0;
    const lifeReview=this.climaxReached?smoothstep(.70,.76,p)*(1-smoothstep(.84,.90,p)):0;
    const boundary=this.bridgeReached?smoothstep(0,6.8,this.bridgeAge):0;
    const returnForce=this.returnReached?smoothstep(0,1.15,this.returnAge):0;
    const returnFlash=this.returnReached?gaussian(this.returnAge,.42,.24):0;
    const finalFade=this.returnReached?smoothstep(.58,2.45,this.returnAge):0;
    const travelFade=clamp01(livingLight*.45+idealized*.58+boundary*.82+returnForce*.96);
    const boundaryTurn=boundary*(1-smoothstep(3.8,8.5,this.bridgeAge));
    const reviewSweep=lifeReview*Math.sin(p*92.0)*.085;
    const turnX=boundaryTurn*.20+reviewSweep;
    const turnY=detachment*.105-boundaryTurn*.115+lifeReview*Math.cos(p*77.0)*.045;

    return{stage:this.stage,stageAge:this.stageAge,progress:p,detachment,heartbeat,heartStopped:this.climaxReached,tunnelDrive,livingLight,galaxyReveal,idealized,lifeReview,boundary,returnForce,returnFlash,finalFade,travelFade,turnX,turnY,climaxReached:this.climaxReached,bridgeReached:this.bridgeReached,returnReached:this.returnReached};
  }
  apply(state,n){
    const light=n.livingLight,ideal=n.idealized,review=n.lifeReview,boundary=n.boundary,ret=n.returnForce,fade=n.finalFade;
    const calmAfterClimax=clamp01(light*.62+ideal*.78+review*.82+boundary*.94);
    const forwardFactor=mix(1,.40,light)*mix(1,.24,ideal)*mix(1,.17,review)*mix(1,.045,boundary);
    const returnCut=mix(1,.015,ret)*(1-fade);
    return{...state,
      speed:Math.max(0,state.speed*forwardFactor*returnCut),
      warpIntensity:Math.max(0,state.warpIntensity*mix(1,.34,light)*mix(1,.20,ideal)*mix(1,.14,review)*mix(1,.07,boundary)*returnCut),
      streakLength:Math.max(0,state.streakLength*mix(1,.24,light)*mix(1,.11,ideal)*mix(1,.08,review)*mix(1,.035,boundary)*returnCut),
      starDensity:Math.max(.18,state.starDensity*mix(1,.88,light)*mix(1,.93,ideal)*mix(1,.96,review)*mix(1,.78,boundary)*mix(1,.56,ret)),
      fov:mix(state.fov,60,clamp01(calmAfterClimax*.78+ret)),
      bloom:Math.max(.03,state.bloom*mix(1,.76,light)*mix(1,.82,ideal)*mix(1,.86,review)*mix(1,.58,boundary)*mix(1,.32,ret)),
      dustDensity:Math.max(.018,state.dustDensity*mix(1,.72,light)*mix(1,.62,ideal)*mix(1,.52,boundary)),
      nebulaPresence:Math.min(1,Math.max(state.nebulaPresence,n.galaxyReveal*.96+n.idealized*.18)),
      darkness:Math.max(.20,state.darkness-mix(0,.42,n.galaxyReveal)-mix(0,.06,n.livingLight)),
      shimmer:Math.max(.018,(state.shimmer??.1)*mix(1,.38,light)+review*.11),
      compression:(state.compression??0)*mix(1,.08,boundary),
      heartPulse:n.heartbeat,
      heartStopped:n.heartStopped,
      soulProgress:n.progress,
      detachment:n.detachment,
      tunnelDrive:n.tunnelDrive,
      livingLight:n.livingLight,
      galaxyReveal:n.galaxyReveal,
      idealized:n.idealized,
      lifeReview:n.lifeReview,
      boundary:n.boundary,
      returnForce:n.returnForce,
      returnFlash:n.returnFlash,
      finalFade:n.finalFade,
      travelFade:n.travelFade,
      journeyStage:n.stage
    };
  }
}
