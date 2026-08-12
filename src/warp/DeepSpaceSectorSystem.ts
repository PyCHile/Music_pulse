import * as THREE from 'three';
import type { WarpState } from '../types';
import {
  generateSpiralPosition,
  generateCloudPosition,
  applyDifferentialRotation,
  webgpuGalaxyHash,
  DEFAULT_WEBGPU_GALAXY_CONFIG,
  type GalaxyConfig,
} from '../thirdparty/WebGPUGalaxyModel';
import { normalizedStellarRadiance, celestiaEnhancedTemperatureColor } from '../thirdparty/CelestiaPhotometry';
import { parseSpectrumText, spectrumToSRGB, rgbToHex } from '../thirdparty/TrueColorToolsColor';

const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth01=(x:number)=>{const t=clamp01(x);return t*t*(3-2*t);};
type RGB=[number,number,number];
const mix3=(a:RGB,b:RGB,t:number):RGB=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const WEBGPU_CLOUD='https://cdn.jsdelivr.net/gh/dgreenheck/webgpu-galaxy@main/public/cloud.png';
const TRUECOLOR_DSO=[
  'https://cdn.jsdelivr.net/gh/Askaniy/TrueColorTools@master/spectra/files/FiorucciMunari2002/PN_high_Ne.datA',
  'https://cdn.jsdelivr.net/gh/Askaniy/TrueColorTools@master/spectra/files/FiorucciMunari2002/PN_low_Ne.datA',
  'https://cdn.jsdelivr.net/gh/Askaniy/TrueColorTools@master/spectra/files/FiorucciMunari2002/Nova.datA',
];
const FALLBACK_SPECTRAL:RGB[]=[
  [.73,.34,.47],
  [.34,.52,.70],
  [.61,.43,.58],
];
const tonePhysical=(rgb:number[]):RGB=>{const y=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;return rgb.map(v=>clamp01((y+(v-y)*.58)*.82+.025)) as RGB;};

type Spec={start:number;end:number;x:number;y:number;seed:number;starK:number;arms:number;spectrum:number};
const SECTORS:Spec[]=[
  {start:.055,end:.205,x:-7.0,y:3.2,seed:11,starK:10500,arms:4,spectrum:0},
  {start:.245,end:.385,x:7.4,y:-3.1,seed:29,starK:7200,arms:3,spectrum:1},
  {start:.415,end:.555,x:-7.8,y:-1.0,seed:47,starK:12800,arms:5,spectrum:2},
  {start:.595,end:.725,x:7.1,y:3.8,seed:73,starK:8600,arms:4,spectrum:0},
  {start:.765,end:.895,x:-6.4,y:1.6,seed:101,starK:6200,arms:3,spectrum:1},
];

const galaxyConfig=(spec:Spec):GalaxyConfig=>({...DEFAULT_WEBGPU_GALAXY_CONFIG,galaxyRadius:23,galaxyThickness:6.4,spiralTightness:1.12+(spec.seed%5)*.065,armCount:spec.arms,armWidth:6.2,randomness:1.18,rotationSpeed:.042});

function makeStarCluster(spec:Spec){
  const count=680,cfg=galaxyConfig(spec),positions=new Float32Array(count*3),sizes=new Float32Array(count),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const m=generateSpiralPosition(i,cfg,spec.seed*100),p=i*3;
    positions[p]=m.position[0];positions[p+1]=m.position[1];positions[p+2]=m.position[2];
    const appMag=-1.1+m.normalizedRadius*5.8+m.sparsityFactor*1.7,rad=normalizedStellarRadiance(appMag,.22,.0012,4.6);
    sizes[i]=.48+Math.min(3.6,rad*.74)+(1-m.normalizedRadius)*.76;
    const dense=celestiaEnhancedTemperatureColor(spec.starK*1.08) as RGB,sparse=celestiaEnhancedTemperatureColor(Math.max(3600,spec.starK*.52)) as RGB,rgb=mix3(dense,sparse,m.sparsityFactor);
    colors[p]=rgb[0];colors[p+1]=rgb[1];colors[p+2]=rgb[2];
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));
  const vertex=`attribute float aSize;attribute vec3 aColor;varying vec3 vColor;void main(){vColor=aColor;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=aSize*clamp(128.0/max(7.0,-mv.z),.48,4.2);gl_Position=projectionMatrix*mv;}`;
  const fragment=`varying vec3 vColor;uniform float uOpacity;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p);float core=smoothstep(.46,.025,d),halo=smoothstep(.51,.14,d);gl_FragColor=vec4(vColor,(core+halo*.18)*uOpacity);}`;
  const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{uOpacity:{value:0}}});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=-820;
  return {points,geometry,material,config:cfg,positions,count};
}

type Layer={sprite:THREE.Sprite;material:THREE.SpriteMaterial;baseOpacity:number;rotationSpeed:number;dust:boolean;role:'core'|'primary'|'secondary'|'dust';localPosition:[number,number,number]};
type Sector={spec:Spec;group:THREE.Group;layers:Layer[];cluster:ReturnType<typeof makeStarCluster>};

export class DeepSpaceSectorSystem{
  readonly group=new THREE.Group();
  private readonly sectors:Sector[]=[];
  private spectralColors:RGB[]=FALLBACK_SPECTRAL.map(tonePhysical);
  private cloudTexture:THREE.Texture|null=null;
  maxPresence=0;
  activeSectorCount=0;
  cloudReady=false;
  physicalPaletteReady=false;

  constructor(){
    for(const spec of SECTORS){
      const group=new THREE.Group(),layers:Layer[]=[],cfg=galaxyConfig(spec);
      for(let i=0;i<44;i++){
        const model=generateCloudPosition(i,cfg),seed=spec.seed*1000+i,role:Layer['role']=i%7===0?'core':(i%3===0?'secondary':'primary');
        const material=new THREE.SpriteMaterial({map:null,color:0xffffff,transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:role==='core'?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:role!=='core'});
        const sprite=new THREE.Sprite(material),width=(17+model.size*24)*(role==='core'?.72:1),aspect=.58+webgpuGalaxyHash(seed+9)*.50,localPosition:[number,number,number]=[model.position[0]*.96,model.position[1]*2.25,model.position[2]*.72];
        sprite.position.set(...localPosition);sprite.scale.set(width,width*aspect,1);sprite.material.rotation=model.rotation;sprite.renderOrder=role==='core'?-808:-850;group.add(sprite);
        layers.push({sprite,material,baseOpacity:role==='core'?.052:(.035+(1-model.normalizedRadius)*.045),rotationSpeed:(i%2?1:-1)*(.00012+webgpuGalaxyHash(seed+10)*.00018),dust:false,role,localPosition});
      }
      for(let i=0;i<12;i++){
        const model=generateCloudPosition(100+i,cfg),seed=spec.seed*2000+i,material=new THREE.SpriteMaterial({map:null,color:0x030207,transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:THREE.NormalBlending,toneMapped:false}),sprite=new THREE.Sprite(material),width=20+model.size*29,localPosition:[number,number,number]=[model.position[0]*.82,model.position[1]*2.05,model.position[2]*.66];
        sprite.position.set(...localPosition);sprite.scale.set(width,width*(.55+webgpuGalaxyHash(seed+3)*.36),1);sprite.material.rotation=model.rotation;sprite.renderOrder=-826;group.add(sprite);
        layers.push({sprite,material,baseOpacity:.07+(1-model.normalizedRadius)*.085,rotationSpeed:(i%2?1:-1)*.00009,dust:true,role:'dust',localPosition});
      }
      const cluster=makeStarCluster(spec);group.add(cluster.points);group.visible=false;this.group.add(group);this.sectors.push({spec,group,layers,cluster});
    }
    this.loadWebGPUCloud();void this.loadTrueColorNebulaSpectra();
  }

  private loadWebGPUCloud(){
    const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');loader.load(WEBGPU_CLOUD,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.premultiplyAlpha=true;this.cloudTexture=texture;this.cloudReady=true;for(const sector of this.sectors)for(const layer of sector.layers){layer.material.map=texture;layer.material.needsUpdate=true;}},undefined,e=>console.warn('URUX webgpu-galaxy cloud texture unavailable',e));
  }

  private async loadTrueColorNebulaSpectra(){
    try{this.spectralColors=await Promise.all(TRUECOLOR_DSO.map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${url}`);const text=await r.text();return tonePhysical(await spectrumToSRGB(parseSpectrumText(text,{wavelengthUnit:'angstrom'})));}));this.physicalPaletteReady=true;}catch(e){console.warn('URUX TrueColorTools deep-sky spectra fallback',e);}
  }

  update(dt:number,state:WarpState){
    const p=clamp01(state.soulProgress||0),finalFade=1-clamp01(state.finalFade||0),narrative=.76+clamp01(state.nebulaPresence||0)*.12+clamp01(state.galaxyReveal||0)*.12;
    this.maxPresence=0;this.activeSectorCount=0;
    for(const sector of this.sectors){
      const raw=(p-sector.spec.start)/(sector.spec.end-sector.spec.start);
      if(raw<=0||raw>=1){sector.group.visible=false;sector.cluster.material.uniforms.uOpacity.value=0;continue;}
      const entry=smooth01(raw/.13),exit=1-smooth01((raw-.80)/.17),env=entry*exit*finalFade,approach=1-Math.pow(1-clamp01(raw),3.05),nearFade=1-smooth01((raw-.73)/.19);
      this.maxPresence=Math.max(this.maxPresence,env);this.activeSectorCount++;sector.group.visible=env>.004;
      sector.group.position.set(sector.spec.x*(1-approach*.48),sector.spec.y*(1-approach*.28),Math.max(-31,-238+approach*207));
      sector.group.scale.setScalar(.72+approach*2.18);sector.group.rotation.x=.17+Math.sin(sector.spec.seed)*.10;sector.group.rotation.z=.11*Math.sin(sector.spec.seed*.71);
      for(let i=0;i<sector.cluster.count;i++){const k=i*3,r=applyDifferentialRotation([sector.cluster.positions[k],sector.cluster.positions[k+1],sector.cluster.positions[k+2]],sector.cluster.config.rotationSpeed,dt);sector.cluster.positions[k]=r[0];sector.cluster.positions[k+1]=r[1];sector.cluster.positions[k+2]=r[2];}
      sector.cluster.geometry.attributes.position.needsUpdate=true;
      const base=this.spectralColors[sector.spec.spectrum]||FALLBACK_SPECTRAL[sector.spec.spectrum],starTone=celestiaEnhancedTemperatureColor(sector.spec.starK*.78) as RGB,secondary=mix3(base,starTone,.28);
      for(const layer of sector.layers){layer.localPosition=applyDifferentialRotation(layer.localPosition,sector.cluster.config.rotationSpeed*.72,dt) as [number,number,number];layer.sprite.position.set(...layer.localPosition);layer.sprite.material.rotation+=dt*layer.rotationSpeed;if(layer.dust){layer.material.color.setRGB(.018,.012,.018);layer.material.opacity=(this.cloudReady?1:0)*Math.min(.20,layer.baseOpacity*env*(.78+approach*.22)*nearFade);}else{const color=layer.role==='secondary'?secondary:base;layer.material.color.setRGB(color[0],color[1],color[2]);const boost=layer.role==='core'?1.16:1;layer.material.opacity=(this.cloudReady?1:0)*Math.min(layer.role==='core'?.10:.115,layer.baseOpacity*env*narrative*(.88+approach*.24)*nearFade*boost);}}
      sector.cluster.material.uniforms.uOpacity.value=Math.min(.72,env*(.20+approach*.48)*nearFade);
    }
  }

  dispose(){for(const s of this.sectors){for(const l of s.layers)l.material.dispose();s.cluster.geometry.dispose();s.cluster.material.dispose();}this.cloudTexture?.dispose();}
}
