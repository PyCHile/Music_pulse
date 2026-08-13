import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

// Real WebGPU compute path inspired by the distribution model already ported
// from dgreenheck/webgpu-galaxy. It runs only during initialization/reseed,
// never in the Three.js frame loop. CPU-created positions remain the fallback.
export class WebGPUGalaxyCompute {
  constructor(){
    this.device=null;
    this.adapter=null;
    this.ready=false;
    this.failed=false;
    this.lastError=null;
  }

  async init(){
    if(this.ready||this.failed)return this.ready;
    if(!navigator.gpu){
      this.failed=true;
      runtimeCapabilities.mark('webgpu-galaxy-compute',false,{reason:'navigator.gpu unavailable',fallback:'cpu'});
      return false;
    }
    try{
      this.adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
      if(!this.adapter)throw new Error('webgpu_adapter_unavailable');
      this.device=await this.adapter.requestDevice();
      this.ready=true;
      runtimeCapabilities.mark('webgpu',true,{kind:'renderer/compute',progressive:true,verified:true});
      runtimeCapabilities.mark('webgpu-galaxy-compute',true,{kind:'compute',backend:'WebGPU',renderLoop:false,fallback:'cpu'});
      return true;
    }catch(error){
      this.failed=true;this.lastError=String(error);
      runtimeCapabilities.mark('webgpu-galaxy-compute',false,{error:String(error),fallback:'cpu'});
      return false;
    }
  }

  async generate(count=64,seed=1){
    if(!await this.init())return null;
    const n=Math.max(1,Math.min(4096,Math.floor(count)));
    const byteLength=n*16;
    const out=this.device.createBuffer({size:byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
    const read=this.device.createBuffer({size:byteLength,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const params=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const p=new Uint32Array([n,Math.max(1,Math.floor(seed))>>>0,4,0]);
    this.device.queue.writeBuffer(params,0,p);
    const shader=this.device.createShaderModule({code:`
struct Params { count:u32, seed:u32, arms:u32, pad:u32 }
@group(0) @binding(0) var<storage,read_write> positions:array<vec4<f32>>;
@group(0) @binding(1) var<uniform> params:Params;
fn hash(x:u32)->f32{
  var v=x;
  v ^= v >> 16u; v *= 0x7feb352du; v ^= v >> 15u; v *= 0x846ca68bu; v ^= v >> 16u;
  return f32(v & 0x00ffffffu)/16777215.0;
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid:vec3<u32>){
  let i=gid.x;
  if(i>=params.count){return;}
  let s=params.seed+i*747796405u+2891336453u;
  let r0=hash(s);
  let r1=hash(s+1u);
  let r2=hash(s+2u);
  let r3=hash(s+3u);
  let radius=pow(r0,0.58)*26.0+2.0;
  let arm=f32(i%max(params.arms,1u))/f32(max(params.arms,1u));
  let base=arm*6.28318530718;
  let twist=radius*0.145;
  let scatter=(r1-0.5)*(0.32+radius*0.022);
  let angle=base+twist+scatter;
  let radialScatter=(r2-0.5)*(1.2+radius*0.08);
  let rr=max(0.2,radius+radialScatter);
  let x=cos(angle)*rr;
  let y=(r3-0.5)*(1.1+rr*0.055);
  let z=sin(angle)*rr;
  positions[i]=vec4<f32>(x,y,z,1.0);
}`});
    const pipeline=this.device.createComputePipeline({layout:'auto',compute:{module:shader,entryPoint:'main'}});
    const bind=this.device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:out}},{binding:1,resource:{buffer:params}}]});
    const encoder=this.device.createCommandEncoder();
    const pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(n/64));pass.end();
    encoder.copyBufferToBuffer(out,0,read,0,byteLength);
    this.device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const copy=new Float32Array(read.getMappedRange().slice(0));
    read.unmap();out.destroy();read.destroy();params.destroy();
    runtimeCapabilities.mark('webgpu-galaxy-compute',true,{kind:'compute',backend:'WebGPU',verified:true,lastCount:n,renderLoop:false,fallback:'cpu'});
    return copy;
  }
}

export const webgpuGalaxyCompute=new WebGPUGalaxyCompute();
