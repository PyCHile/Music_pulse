import type{AudioFeatures,WarpState}from'../types';
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export class OpticalFlowController{private time=0;private bank=0;update(dt:number,state:WarpState,f?:AudioFeatures){this.time+=dt;this.bank+=(0-this.bank)*(1-Math.exp(-4*dt));const radialBreath=Math.sin((this.time/4)*Math.PI*2)*.0035,drive=clamp01((state.warpIntensity||0)*.6+(f?.energy||0)*.4);return{x:0,y:0,bank:this.bank,radialBreath,drive};}}
