import * as THREE from 'three';
import { StarTunnelSystem } from './StarTunnelSystem.js?v=20260813-47';
import { VolumetricNebulaRaymarcher } from './VolumetricNebulaRaymarcherV51.js?v=20260813-51';
import { DeepSpaceSectorSystem } from './DeepSpaceSectorSystemV51.js?v=20260813-51';
import { CloudNebulaLayer } from './CloudNebulaLayerV51.js?v=20260813-51';
import { GalacticWispSystem } from './GalacticWispSystem.js?v=20260812-3';
export class WarpFieldManager{
 constructor(maxStars=900){this.group=new THREE.Group();this.clouds=new CloudNebulaLayer();this.nebula=new VolumetricNebulaRaymarcher();this.deepSpace=new DeepSpaceSectorSystem();this.galacticWisps=new GalacticWispSystem(10);this.starTunnel=new StarTunnelSystem(maxStars);this.group.add(this.clouds.group,this.nebula.mesh,this.deepSpace.group,this.galacticWisps.group,this.starTunnel.group);const n=64,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=(Math.random()-.5)*60;p[i*3+1]=(Math.random()-.5)*34;p[i*3+2]=-10-Math.random()*120;}this.dustGeometry=new THREE.BufferGeometry();this.dustGeometry.setAttribute('position',new THREE.BufferAttribute(p,3));this.dustMaterial=new THREE.PointsMaterial({size:.06,color:0x6d86aa,transparent:true,opacity:.12,depthWrite:false});this.dust=new THREE.Points(this.dustGeometry,this.dustMaterial);this.group.add(this.dust);this.dustPos=p;}
 update(dt,state,features){this.clouds.update(dt,state);this.deepSpace.update(dt,state);state.spaceSectorPresence=this.deepSpace.maxPresence||0;this.nebula.update(dt,state,features);this.galacticWisps.update(dt,state,features);this.starTunnel.update(dt,state,features);const sp=(state.speed||0)*.42;for(let i=0;i<this.dustPos.length;i+=3){this.dustPos[i+2]+=sp*dt;if(this.dustPos[i+2]>-1)this.dustPos[i+2]=-130-Math.random()*20;}this.dustGeometry.attributes.position.needsUpdate=true;}
 dispose(){this.clouds.dispose();this.nebula.dispose();this.deepSpace.dispose();this.galacticWisps.dispose();this.starTunnel.dispose();this.dustGeometry.dispose();this.dustMaterial.dispose();}
}
