import * as THREE from 'three';

const THREE_PLANETS='https://cdn.jsdelivr.net/npm/three@0.185.1/examples/textures/planets/';
const PROFILES={
  earth:{id:'earth',source:'Three.js / Solar System Scope',albedo:`${THREE_PLANETS}earth_atmos_2048.jpg`,normal:`${THREE_PLANETS}earth_normal_2048.jpg`,roughness:.48,normalScale:.42},
  jupiter:{id:'jupiter',source:'NASA/JPL-Caltech',albedo:'https://assets.science.nasa.gov/dynamicimage/assets/science/cds/3d/resources/image/jupiter/preview.webp?w=1024',roughness:.86,normalScale:0},
  saturn:{id:'saturn',source:'SpaceKit astronomical texture',albedo:'https://typpo.github.io/spacekit/examples/saturn/th_saturn.png',roughness:.82,normalScale:0}
};
const STAGE_PROFILE={DESPRENDIMIENTO:'earth',TUNEL:'jupiter',LUZ:'jupiter',MEMORIA:'earth',FRONTERA:'saturn',RETORNO:'earth'};

export class MobileAstronomicalTexturePool{
  constructor(renderer){
    this.renderer=renderer;this.loader=new THREE.TextureLoader();this.loader.setCrossOrigin('anonymous');this.cache=new Map();
    this.stats={ready:true,loaded:0,lastProfile:null,lastError:null,mode:'mobile-real-albedo'};
    this.schedulePrewarm();
  }
  profileFor(stage){return PROFILES[STAGE_PROFILE[stage]||'earth'];}
  async loadTexture(url,color=true){
    if(!url)return null;if(this.cache.has(url))return this.cache.get(url);
    const promise=this.loader.loadAsync(url).then(texture=>{
      if(color)texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(2,this.renderer?.capabilities?.getMaxAnisotropy?.()||1);
      texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.wrapS=THREE.RepeatWrapping;
      this.renderer?.initTexture?.(texture);this.stats.loaded++;return texture;
    }).catch(error=>{this.cache.delete(url);this.stats.lastError=String(error);throw error;});
    this.cache.set(url,promise);return promise;
  }
  async loadProfile(profile){
    const [albedo,normal]=await Promise.all([this.loadTexture(profile.albedo,true),profile.normal?this.loadTexture(profile.normal,false):Promise.resolve(null)]);
    return{profile,albedo,normal};
  }
  schedulePrewarm(){
    const run=async()=>{for(const id of['jupiter','earth']){try{await this.loadProfile(PROFILES[id]);}catch{}}};
    if('requestIdleCallback'in window)requestIdleCallback(()=>void run(),{timeout:6500});else setTimeout(()=>void run(),4200);
  }
  async enhancePlanet(root,encounter={}){
    const mesh=root?.userData?.surfaceMesh;if(!mesh?.material)return false;const profile=this.profileFor(encounter.narrativeStage);this.stats.lastProfile=profile.id;
    try{
      const {albedo,normal}=await this.loadProfile(profile);if(!root.parent)return false;const mat=mesh.material;
      mat.map=albedo;mat.color.set(0xffffff);mat.roughness=profile.roughness;mat.metalness=.002;
      if(normal){mat.normalMap=normal;mat.normalScale.set(profile.normalScale,profile.normalScale);}
      mat.needsUpdate=true;root.userData.astronomyProfile={id:profile.id,source:profile.source,loaded:{albedo:true,normal:Boolean(normal)},mobile:true};
      root.userData.enhancements=root.userData.enhancements||[];root.userData.enhancements.push(`albedo astronómico real ${profile.id}`,normal?'normal map astronómico':'roughness física',`fuente ${profile.source}`);return true;
    }catch(error){this.stats.lastError=String(error);return false;}
  }
  dispose(){for(const p of this.cache.values())Promise.resolve(p).then(t=>t?.dispose?.()).catch(()=>{});this.cache.clear();}
}
