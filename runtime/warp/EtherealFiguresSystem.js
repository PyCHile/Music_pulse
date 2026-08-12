import * as THREE from 'three';

const clamp01=v=>Math.max(0,Math.min(1,v));
const gaussian=(x,c,w)=>Math.exp(-.5*Math.pow((x-c)/w,2));
const REFERENCES=[
  {url:'./assets/ethereal/reference-01.b64',aspect:.75,width:17.0,center:.05,maxOpacity:.34,x:-1.2,y:.3,z:-30},
  {url:'./assets/ethereal/reference-02.b64',aspect:16/9,width:29.0,center:.34,maxOpacity:.31,x:.8,y:.2,z:-34},
  {url:'./assets/ethereal/reference-03.b64',aspect:480/312,width:27.0,center:.63,maxOpacity:.30,x:-.5,y:.4,z:-32},
  {url:'./assets/ethereal/reference-04.b64',aspect:16/9,width:28.0,center:.90,maxOpacity:.18,x:.7,y:.1,z:-35,crop:{repeatX:.88,repeatY:.82,offsetX:.12,offsetY:.15}}
];

export class EtherealFiguresSystem{
  constructor(){
    this.group=new THREE.Group();
    this.layers=[];
    this.time=0;
    this.readyCount=0;
    for(const ref of REFERENCES){
      const material=new THREE.SpriteMaterial({
        color:0xffffff,
        transparent:true,
        opacity:0,
        depthWrite:false,
        depthTest:false,
        blending:THREE.AdditiveBlending,
        toneMapped:true
      });
      const sprite=new THREE.Sprite(material);
      sprite.position.set(ref.x,ref.y,ref.z);
      sprite.scale.set(ref.width,ref.width/ref.aspect,1);
      sprite.renderOrder=26;
      this.group.add(sprite);
      const layer={...ref,material,sprite,texture:null};
      this.layers.push(layer);
      this.loadReference(layer);
    }
    this.group.visible=false;
  }
  async loadReference(layer){
    try{
      const response=await fetch(layer.url,{cache:'force-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const b64=(await response.text()).trim();
      if(!b64)throw new Error('empty image payload');
      const dataUrl=`data:image/jpeg;base64,${b64}`;
      const texture=await new Promise((resolve,reject)=>new THREE.TextureLoader().load(dataUrl,resolve,undefined,reject));
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.generateMipmaps=false;
      texture.minFilter=THREE.LinearFilter;
      texture.magFilter=THREE.LinearFilter;
      if(layer.crop){
        texture.wrapS=THREE.ClampToEdgeWrapping;
        texture.wrapT=THREE.ClampToEdgeWrapping;
        texture.repeat.set(layer.crop.repeatX,layer.crop.repeatY);
        texture.offset.set(layer.crop.offsetX,layer.crop.offsetY);
      }
      layer.texture=texture;
      layer.material.map=texture;
      layer.material.needsUpdate=true;
      this.readyCount++;
    }catch(error){
      console.warn('URUX ethereal reference could not be loaded',layer.url,error);
    }
  }
  update(dt,state,features,vanishingPoint){
    this.time+=dt;
    const stage=state.journeyStage||'';
    const living=clamp01(state.livingLight||0),ideal=clamp01(state.idealized||0),review=clamp01(state.lifeReview||0);
    const boundary=clamp01(state.boundary||0),ret=clamp01(state.returnForce||0),finalFade=clamp01(state.finalFade||0);
    const stageEligible=stage==='LIVING_LIGHT'||stage==='IDEALIZED_COSMOS'||stage==='LIFE_REVIEW';
    const presence=clamp01(Math.max(living*.92,ideal*.98,review*.92,stageEligible ? .14 : 0))*(1-boundary*.94)*(1-ret)*(1-finalFade);
    const p=clamp01(state.soulProgress||0);
    const sequence=clamp01((p-.55)/.30);
    const vpX=(vanishingPoint?.x||0),vpY=(vanishingPoint?.y||0);
    this.group.position.x=vpX*.65;
    this.group.position.y=vpY*.50;
    let totalWeight=0;
    const weights=this.layers.map(layer=>{const w=gaussian(sequence,layer.center,.205);totalWeight+=w;return w;});
    const norm=Math.max(1,totalWeight*.82);
    for(let i=0;i<this.layers.length;i++){
      const layer=this.layers[i];
      const weight=weights[i]/norm;
      const loaded=layer.texture?1:0;
      const breathe=1+Math.sin(this.time*.18+i*1.71)*.008;
      const driftX=Math.sin(this.time*.055+i*1.9)*.12;
      const driftY=Math.cos(this.time*.047+i*1.4)*.09;
      layer.sprite.position.x=layer.x+driftX;
      layer.sprite.position.y=layer.y+driftY;
      layer.sprite.position.z=layer.z;
      const width=layer.width*breathe;
      layer.sprite.scale.set(width,width/layer.aspect,1);
      const audioSoftening=.92+(features?.mid||0)*.035;
      layer.material.opacity=loaded*presence*weight*layer.maxOpacity*audioSoftening;
    }
    this.group.visible=this.readyCount>0&&presence>.008;
  }
  dispose(){
    for(const layer of this.layers){
      layer.material.dispose();
      if(layer.texture)layer.texture.dispose();
    }
  }
}
