type Capability={id:string;available:boolean;kind?:string};
type Input={stage:string;capabilities:Record<string,Capability>;recentActions?:string[];bufferDepth?:number};
export async function main(input:Input){
  const available=Object.values(input.capabilities||{}).filter(x=>x?.available).map(x=>x.id).sort();
  const forbidden=['render-loop-network','invented-shader','invented-texture','invented-library'];
  return{
    ok:true,
    stage:input.stage,
    availableCapabilities:available,
    bufferDepth:input.bufferDepth??0,
    directives:{
      onlyUseDeclaredCapabilities:true,
      noRenderLoopCalls:true,
      preferExistingBetterFunction:true,
      preserveProceduralFallback:true,
      minDarkZoneFraction:.3
    },
    forbidden,
    recentActions:(input.recentActions||[]).slice(-12),
    role:'orchestration/validation only; Three.js executes all per-frame rendering locally'
  };
}
