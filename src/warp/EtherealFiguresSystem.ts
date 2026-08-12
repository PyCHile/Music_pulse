import * as THREE from'three';
import type{WarpState}from'../types';

const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const gaussian=(x:number,c:number,w:number)=>Math.exp(-.5*Math.pow((x-c)/w,2));
type RefSpec={url:string;width:number;center:number;maxOpacity:number;x:number;y:number;z:number};
type Layer=RefSpec&{material:THREE.SpriteMaterial;sprite:THREE.Sprite;texture:THREE.Texture|null;aspect:number};
const REFERENCES:RefSpec[]=[
 {url:'./assets/ethereal/angel-01.png',width:19.5,center:.28,maxOpacity:.30,x:-1.0,y:.25,z:-30},
 {url:'./assets/ethereal/angel-02.png',width:24.0,center:.70,maxOpacity:.34,x:.9,y:.15,z:-33}
];
export class EtherealFiguresSystem{
 readonly group=new THREE.Group();private readonly layers:Layer[]=[];private time=0;private readyCount=0;private readonly loader=new THREE.TextureLoader();
 constructor(){for(const ref of REFERENCES){const material=new THREE.SpriteMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,depthTest:false,alphaTest:.035,blending:THREE.AdditiveBlending,toneMapped:true});const sprite=new THREE.Sprite(material);sprite.position.set(ref.x,ref.y,ref.z);sprite.renderOrder=26;this.group.add(sprite);const layer:Layer={...ref,material,sprite,texture:null,aspect:1};this.layers.push(layer);this.loadReference(layer);}this.group.position.set(0,0,0);this.group.visible=false;}
 private loadReference(layer:Layer){this.loader.load(layer.url,texture=>{const image=texture.image as HTMLImageElement|undefined;layer.aspect=image?.width&&image?.height?image.width/image.height:1;texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.premultiplyAlpha=true;layer.texture=texture;layer.material.map=texture;layer.material.needsUpdate=true;layer.sprite.scale.set(layer.width,layer.width/layer.aspect,1);this.readyCount++;},undefined,error=>console.warn('URUX transparent PNG could not be loaded',layer.url,error));}
 update(dt:number,state:WarpState){this.time+=dt;const stage=state.journeyStage||'',living=clamp01(state.livingLight||0),ideal=clamp01(state.idealized||0),review=clamp01(state.lifeReview||0),boundary=clamp01(state.boundary||0),ret=clamp01(state.returnForce||0),finalFade=clamp01(state.finalFade||0);const eligible=stage==='LIVING_LIGHT'||stage==='IDEALIZED_COSMOS'||stage==='LIFE_REVIEW';const presence=clamp01(Math.max(living*.90,ideal*.98,review*.94,eligible ? .13 : 0))*(1-boundary*.96)*(1-ret)*(1-finalFade),sequence=clamp01(((state.soulProgress||0)-.56)/.29);this.group.position.set(0,0,0);let total=0;const weights=this.layers.map(l=>{const w=gaussian(sequence,l.center,.28);total+=w;return w}),norm=Math.max(1,total*.86);for(let i=0;i<this.layers.length;i++){const l=this.layers[i],weight=weights[i]/norm,breathe=1+Math.sin(this.time*.14+i*1.61)*.004;l.sprite.position.set(l.x,l.y,l.z);const width=l.width*breathe;l.sprite.scale.set(width,width/l.aspect,1);l.material.opacity=(l.texture?1:0)*presence*weight*l.maxOpacity;}this.group.visible=this.readyCount>0&&presence>.006;}
 dispose(){for(const l of this.layers){l.material.dispose();l.texture?.dispose();}}
}
