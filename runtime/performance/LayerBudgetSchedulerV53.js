export class LayerBudgetScheduler{
  constructor(){this.acc={clouds:0,deepSpace:0,wisps:0,dust:0};this.hz={clouds:15,deepSpace:24,wisps:15,dust:30};}
  due(name,dt){this.acc[name]=(this.acc[name]||0)+dt;const step=1/(this.hz[name]||60);if(this.acc[name]+1e-6<step)return 0;const elapsed=this.acc[name];this.acc[name]=0;return Math.min(.12,elapsed);}
  setRate(name,hz){this.hz[name]=Math.max(1,Math.min(60,Number(hz)||1));}
  snapshot(){return{rates:{...this.hz},accumulators:{...this.acc}};}
}
