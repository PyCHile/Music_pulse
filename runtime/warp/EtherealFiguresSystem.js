import * as THREE from 'three';

const clamp01=v=>Math.max(0,Math.min(1,v));
const gaussian=(x,c,w)=>Math.exp(-.5*Math.pow((x-c)/w,2));
const REFERENCES=[
  {url:'./assets/ethereal/angel-01.png',aspect:128/85,width:19.5,center:.28,maxOpacity:.34,x:-1.0,y:.25,z:-30},
  {url:'./assets/ethereal/angel-02.png',aspect:128/72,width:24.0,center:.70,maxOpacity:.38,x:.9,y:.15,z:-33}
];

export class EtherealFiguresSystem{
  constructor(){
    this.group=new THREE.Group();
    this.layers=[];
    this.time=0;
    this.readyCount=0;
    this.loader=new THREE.TextureLoader();
    for(const ref of REFERENCES){
      const material=new THREE.SpriteMaterial({
        color:0xffffff,
        transparent:true,
        opacity:0,
        depthWrite:false,
        depthTest:false,
        alphaTest:.015,
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
  loadReference(layer){
    this.loader.load(layer.url,texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.generateMipmaps=false;
      texture.minFilter=THREE.LinearFilter;
      texture.magFilter=THREE.LinearFilter;
      texture.premultiplyAlpha=true;
      layer.texture=texture;
      layer.material.map=texture;
      layer.material.needsUpdate=true;
      this.readyCount++;
    },undefined,error=>console.warn('URUX transparent ethereal PNG could not be loaded',layer.url,error));
  }
  update(dt,state,features,vanishingPoint){
    this.time+=dt;
    const stage=state.journeyStage||'';
    const living=clamp01(state.livingLight||0),ideal=clamp01(state.idealized||0),review=clamp01(state.lifeReview||0);
    const boundary=clamp01(state.boundary||0),ret=clamp01(state.returnForce||0),finalFade=clamp01(state.finalFade||0);
    const stageEligible=stage==='LIVING_LIGHT'||stage==='IDEALIZED_COSMOS'||stage==='LIFE_REVIEW';
    const presence=clamp01(Math.max(living*.90,ideal*.98,review*.94,stageEligible?.13:0))*(1-boundary*.96)*(1-ret)*(1-finalFade);
    const p=clamp01(state.soulProgress||0);
    const sequence=clamp01((p-.56)/.29);
    const vpX=vanishingPoint?.x||0,vpY=vanishingPoint?.y||0;
    this.group.position.x=vpX*.22;
    this.group.position.y=vpY*.18;
    let totalWeight=0;
    const weights=this.layers.map(layer=>{const w=gaussian(sequence,layer.center,.28);totalWeight+=w;return w;});
    const norm=Math.max(1,totalWeight*.86);
    for(let i=0;i<this.layers.length;i++){
      const layer=this.layers[i];
      const weight=weights[i]/norm;
      const loaded=layer.texture?1:0;
      const breathe=1+Math.sin(this.time*.16+i*1.71)*.006;
      const driftX=Math.sin(this.time*.045+i*1.9)*.055;
      const driftY=Math.cos(this.time*.040+i*1.4)*.045;
      layer.sprite.position.x=layer.x+driftX;
      layer.sprite.position.y=layer.y+driftY;
      layer.sprite.position.z=layer.z;
      const width=layer.width*breathe;
      layer.sprite.scale.set(width,width/layer.aspect,1);
      const softness=.94+(features?.mid||0)*.025;
      layer.material.opacity=loaded*presence*weight*layer.maxOpacity*softness;
    }
    this.group.visible=this.readyCount>0&&presence>.006;
  }
  dispose(){
    for(const layer of this.layers){
      layer.material.dispose();
      if(layer.texture)layer.texture.dispose();
    }
  }
}
