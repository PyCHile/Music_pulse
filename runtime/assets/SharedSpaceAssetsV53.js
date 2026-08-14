import * as THREE from 'three';
const CLOUD='https://cdn.jsdelivr.net/gh/dgreenheck/webgpu-galaxy@main/public/cloud.png';
let cloudPromise=null,cloudTexture=null;
export function getGalaxyCloudTexture(){
 if(cloudTexture)return Promise.resolve(cloudTexture);
 if(cloudPromise)return cloudPromise;
 cloudPromise=new Promise((resolve,reject)=>{const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');loader.load(CLOUD,t=>{t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.premultiplyAlpha=true;cloudTexture=t;resolve(t);},undefined,reject);});
 return cloudPromise;
}
export function disposeSharedSpaceAssets(){cloudTexture?.dispose();cloudTexture=null;cloudPromise=null;}
