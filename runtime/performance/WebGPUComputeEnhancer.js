import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

const WGSL=`
struct Params { seed: f32, count: u32, pad0: u32, pad1: u32 };
@group(0) @binding(0) var<storage, read_write> output: array<f32>;
@group(0) @binding(1) var<uniform> params: Params;
fn hash11(p0:f32)->f32{
  var p=fract(p0*.1031);
  p=p*(p+33.33);
  p=p*(p+p);
  return fract(p);
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id:vec3<u32>){
  let i=id.x;
  if(i>=params.count){return;}
  let x=f32(i)+params.seed*19.73;
  let a=hash11(x+1.7);
  let b=hash11(x*1.91+17.3);
  let c=hash11(x*2.71+41.9);
  output[i]=fract(a*.47+b*.33+c*.20);
}`;

export class WebGPUComputeEnhancer{
  constructor(){this.ready=false;this.values=null;this.stats={supported:Boolean(navigator.gpu),ready:false,count:0,lastError:null};}
  async init(count=256){
    if(!navigator.gpu){runtimeCapabilities.mark('webgpu-compute',false,{reason:'navigator.gpu unavailable',progressive:true});return null;}
    try{
      const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
      if(!adapter)throw new Error('webgpu_adapter_unavailable');
      const device=await adapter.requestDevice();
      const n=Math.max(64,Math.min(1024,Math.ceil(count/64)*64));
      const storage=device.createBuffer({size:n*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
      const readback=device.createBuffer({size:n*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const params=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      const seed=(performance.timeOrigin%9973)/9973;
      const ab=new ArrayBuffer(16),dv=new DataView(ab);dv.setFloat32(0,seed,true);dv.setUint32(4,n,true);device.queue.writeBuffer(params,0,ab);
      const module=device.createShaderModule({code:WGSL});
      const pipeline=device.createComputePipeline({layout:'auto',compute:{module,entryPoint:'main'}});
      const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:storage}},{binding:1,resource:{buffer:params}}]});
      const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(n/64);pass.end();encoder.copyBufferToBuffer(storage,0,readback,0,n*4);device.queue.submit([encoder.finish()]);
      await readback.mapAsync(GPUMapMode.READ);this.values=new Float32Array(readback.getMappedRange().slice(0));readback.unmap();
      const sample=[this.values[3]||.3,this.values[17]||.5,this.values[61]||.7];
      this.ready=true;this.stats={supported:true,ready:true,count:n,lastError:null,sample};
      runtimeCapabilities.mark('webgpu-compute',true,{progressive:true,workgroupSize:64,count:n,usage:'one-shot volumetric coefficients',sample});
      storage.destroy();readback.destroy();params.destroy();device.destroy?.();
      return {values:this.values,sample};
    }catch(error){this.stats.lastError=String(error);runtimeCapabilities.mark('webgpu-compute',false,{progressive:true,error:String(error)});return null;}
  }
  applyToRaymarcher(raymarcher){if(!this.ready||!raymarcher?.material?.uniforms)return false;const u=raymarcher.material.uniforms,a=this.values?.[3]||.3,b=this.values?.[17]||.5,c=this.values?.[61]||.7;if(u.uLightDir?.value)u.uLightDir.value.set(-.55+a*.45,-.10+b*.50,-.92+c*.12).normalize();if(u.uAnisotropy)u.uAnisotropy.value=Math.max(.22,Math.min(.48,.24+b*.20));if(u.uNarrativeCore?.value)u.uNarrativeCore.value.set((a-.5)*.16,(c-.5)*.12);raymarcher.webgpuEnhancement={sample:[a,b,c],applied:true};return true;}
}
