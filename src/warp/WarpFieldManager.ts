import * as THREE from 'three';
import type { AudioFeatures, WarpState } from '../types';
import { StarTunnelSystem } from './StarTunnelSystem';
import { NebulaBackdrop } from './NebulaBackdrop';
import { DeepSpaceSectorSystem } from './DeepSpaceSectorSystem';
import { GalacticWispSystem } from './GalacticWispSystem';

export class WarpFieldManager {
  readonly group=new THREE.Group();
  readonly starTunnel:StarTunnelSystem;
  readonly nebula:NebulaBackdrop;
  readonly deepSpace:DeepSpaceSectorSystem;
  readonly galacticWisps:GalacticWispSystem;

  constructor(maxStars:number){
    this.nebula=new NebulaBackdrop();
    this.deepSpace=new DeepSpaceSectorSystem();
    this.galacticWisps=new GalacticWispSystem(maxStars<=1200?28:36);
    this.starTunnel=new StarTunnelSystem(maxStars);
    this.group.add(this.nebula.mesh,this.deepSpace.group,this.galacticWisps.group,this.starTunnel.group);
  }

  update(dt:number,s:WarpState,f:AudioFeatures,vp:{x:number;y:number}){
    this.deepSpace.update(dt,s);
    const sector=this.deepSpace.maxPresence||0;
    (s as WarpState & {spaceSectorPresence?:number}).spaceSectorPresence=sector;
    this.nebula.update(dt,s,f,vp);
    this.galacticWisps.update(dt,s,f);
    this.starTunnel.update(dt,s,f,vp);
    if(sector>.01){
      const tunnel=this.starTunnel as unknown as {activeCount:number;pointAlpha:Float32Array;lineAlpha:Float32Array;pointGeometry:THREE.BufferGeometry;lineGeometry:THREE.BufferGeometry;lineMaterial:THREE.ShaderMaterial};
      const pointRelief=.18+.82*(1-sector*.88),lineRelief=.08+.92*(1-sector*.92);
      for(let i=0;i<tunnel.activeCount;i++){tunnel.pointAlpha[i]*=pointRelief;tunnel.lineAlpha[i*2]*=lineRelief;tunnel.lineAlpha[i*2+1]*=lineRelief;}
      tunnel.pointGeometry.attributes.aAlpha.needsUpdate=true;tunnel.lineGeometry.attributes.aAlpha.needsUpdate=true;
      tunnel.lineMaterial.uniforms.uIntensity.value*=.18+.82*(1-sector*.90);
    }
  }

  dispose(){this.nebula.dispose();this.deepSpace.dispose();this.galacticWisps.dispose();this.starTunnel.dispose();}
}
