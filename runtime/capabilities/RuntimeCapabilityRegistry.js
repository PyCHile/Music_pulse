import * as THREE from 'three';

const registry=new Map();
const set=(id,available,details={})=>registry.set(id,{id,available:Boolean(available),...details});

export class RuntimeCapabilityRegistry{
  constructor(){
    this.startedAt=new Date().toISOString();
    set('three',true,{version:THREE.REVISION,kind:'renderer'});
    set('webgl2',false,{kind:'renderer'});
    set('webgpu',Boolean(navigator.gpu),{kind:'renderer',progressive:true});
    set('spacekit',Boolean(window.Spacekit),{kind:'astronomy'});
    set('three-nebula',false,{version:'12.1.0',kind:'particles'});
    set('postprocessing',false,{version:'6.39.4',kind:'postfx'});
    set('ktx2',false,{kind:'textures'});
    set('pbr-astronomy',false,{kind:'textures'});
    set('shader-noise',false,{kind:'shader'});
    set('volumetric-raymarch',false,{kind:'shader'});
    set('celestia-photometry',true,{kind:'astronomy'});
    set('truecolor-tools',true,{kind:'astronomy'});
    set('webgpu-galaxy-model',true,{kind:'astronomy'});
    set('nasa-jpl-catalog',false,{kind:'data'});
    set('windmill',false,{kind:'orchestration',renderLoop:false});
  }
  attachRenderer(renderer){
    const gl=renderer?.getContext?.();set('webgl2',typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext,{kind:'renderer'});
  }
  mark(id,available,details={}){set(id,available,{...(registry.get(id)||{}),...details});return this.get(id);}
  get(id){return registry.get(id)||{id,available:false};}
  has(id){return Boolean(this.get(id).available);}
  allowedForAgent(){return [...registry.values()].filter(x=>x.available).map(x=>x.id);}
  snapshot(){return Object.fromEntries([...registry.entries()].map(([k,v])=>[k,{...v}]));}
}

export const runtimeCapabilities=new RuntimeCapabilityRegistry();
