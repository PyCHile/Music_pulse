import * as THREE from 'three';
import { DeepSpaceSectorSystem as BaseDeepSpace } from './DeepSpaceSectorSystem.js?v=20260813-49';
import { generateCloudPosition, webgpuGalaxyHash } from '../thirdparty/WebGPUGalaxyModel.js?v=20260812-1';

const CLOUD_URL='https://cdn.jsdelivr.net/gh/dgreenheck/webgpu-galaxy@main/public/cloud.png';
const SPECTRAL=[[.73,.34,.47],[.34,.52,.70],[.61,.43,.58]];
const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth01=x=>{const t=clamp01(x);return t*t*(3-2*t);};

export class DeepSpaceSectorSystem extends BaseDeepSpace{
  constructor(){
    super();this.mobileCloudTexture=null;this.mobileGalaxyLayers=[];
    if(!this.mobile)return;
    for(const sector of this.sectors){
      const layers=[],cfg=sector.cluster.config,base=SPECTRAL[sector.spec.spectrum]||SPECTRAL[0];
      for(let i=0;i<7;i++){
        const m=generateCloudPosition(i,cfg),mat=new THREE.SpriteMaterial({map:null,color:new THREE.Color(base[0],base[1],base[2]).multiplyScalar(1.45),transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:i===0?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:i!==0}),s=new THREE.Sprite(mat),w=(14+m.size*21)*(i===0?.72:1);
        s.position.set(m.position[0]*.92,m.position[1]*2.05,m.position[2]*.68);s.scale.set(w,w*(.54+webgpuGalaxyHash(sector.spec.seed*100+i)*.42),1);s.material.rotation=m.rotation;s.renderOrder=i===0?-804:-842;sector.group.add(s);layers.push({sprite:s,material:mat,baseOpacity:i===0?.17:.105,core:i===0,dust:false});
      }
      for(let i=0;i<2;i++){
        const m=generateCloudPosition(100+i,cfg),mat=new THREE.SpriteMaterial({map:null,color:0x020106,transparent:true,opacity:0,depthWrite:false,depthTest:false,blending:THREE.NormalBlending,toneMapped:false}),s=new THREE.Sprite(mat),w=20+m.size*24;
        s.position.set(m.position[0]*.82,m.position[1]*1.9,m.position[2]*.64);s.scale.set(w,w*.63,1);s.material.rotation=m.rotation;s.renderOrder=-826;sector.group.add(s);layers.push({sprite:s,material:mat,baseOpacity:.14,dust:true,core:false});
      }
      this.mobileGalaxyLayers.push({sector,layers});
    }
    const load=()=>{const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');loader.load(CLOUD_URL,t=>{t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;this.mobileCloudTexture=t;this.cloudReady=true;for(const g of this.mobileGalaxyLayers)for(const l of g.layers){l.material.map=t;l.material.needsUpdate=true;}},undefined,()=>{});};
    if('requestIdleCallback'in window)requestIdleCallback(load,{timeout:5000});else setTimeout(load,2600);
  }
  update(dt,state){
    super.update(dt,state);if(!this.mobile)return;
    const p=clamp01(state.soulProgress||0),fade=1-clamp01(state.finalFade||0);this.maxPresence=0;this.activeSectorCount=0;
    for(const g of this.mobileGalaxyLayers){const sector=g.sector,raw=(p-sector.spec.start)/(sector.spec.end-sector.spec.start);if(raw<=0||raw>=1){sector.group.visible=false;continue;}
      const entry=smooth01(raw/.12),exit=1-smooth01((raw-.93)/.065),env=entry*exit*fade,approach=1-Math.pow(1-clamp01(raw),3.05),near=Math.max(0,1-Math.abs(raw-.54)/.46);
      this.maxPresence=Math.max(this.maxPresence,env);this.activeSectorCount++;sector.group.visible=env>.003;
      sector.group.position.set(sector.spec.x*(1-approach*.72),sector.spec.y*(1-approach*.58),-228+approach*252);
      const scale=.78+approach*2.75;sector.group.scale.setScalar(scale);sector.cluster.material.uniforms.uOpacity.value=Math.min(.80,env*(.24+approach*.56));
      for(const l of g.layers){if(!this.cloudReady){l.material.opacity=0;continue;}const breathe=.94+.06*Math.sin((state.soulProgress||0)*28+sector.spec.seed+(l.core?0:1.7));l.material.opacity=Math.min(l.dust?.20:(l.core?.20:.145),l.baseOpacity*env*(.62+near*.72)*breathe);}
    }
  }
  dispose(){super.dispose();for(const g of this.mobileGalaxyLayers)for(const l of g.layers)l.material.dispose();this.mobileCloudTexture?.dispose();}
}
