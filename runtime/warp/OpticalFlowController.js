const clamp01=v=>Math.max(0,Math.min(1,v));
export class OpticalFlowController{
  constructor(){this.time=0;this.bank=0;}
  update(dt,state,features){
    this.time+=dt;
    // Permanent hypnotic travel invariant: normalized origin is exactly (0.5,0.5), represented here as scene offset (0,0).
    // No lateral drift, oscillation, directional jumps or camera banking are permitted.
    this.bank+=(0-this.bank)*(1-Math.exp(-4*dt));
    const breath=Math.sin((this.time/4)*Math.PI*2)*.0035;
    return{x:0,y:0,bank:this.bank,radialBreath:breath,drive:clamp01((state?.warpIntensity||0)*.6+(features?.energy||0)*.4)};
  }
}
