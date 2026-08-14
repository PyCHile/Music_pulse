import * as THREE from 'three';

const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t);};
const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453123;return x-Math.floor(x);};
const signed=n=>hash(n)*2-1;
const GAS_COLORS=[
  new THREE.Color(0x557fb8),
  new THREE.Color(0x7765a8),
  new THREE.Color(0xb06d75),
  new THREE.Color(0xb18362),
  new THREE.Color(0x405f8f),
  new THREE.Color(0x8e7398)
];

const vertexShader=`
attribute float aSize;
attribute float aSeed;
attribute float aDensity;
attribute vec3 color;
uniform float uTime;
uniform float uPixelRatio;
varying float vSeed;
varying float vDensity;
varying vec3 vColor;
void main(){
  vec3 p=position;
  float sway=sin(uTime*.11+aSeed*23.0)*.18;
  p.x+=sway;
  p.y+=cos(uTime*.09+aSeed*17.0)*.12;
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  float perspective=250.0/max(1.0,-mv.z);
  gl_PointSize=clamp(aSize*uPixelRatio*perspective,1.0,220.0);
  gl_Position=projectionMatrix*mv;
  vSeed=aSeed;
  vDensity=aDensity;
  vColor=color;
}`;

const fragmentShader=`
precision mediump float;
uniform float uOpacity;
uniform float uTime;
varying float vSeed;
varying float vDensity;
varying vec3 vColor;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+vSeed*41.13)*43758.5453);}
void main(){
  vec2 p=gl_PointCoord-.5;
  float ang=atan(p.y,p.x);
  float warp=.055*sin(ang*3.0+vSeed*19.0)+.034*sin(ang*7.0-vSeed*13.0)+.020*sin(ang*11.0+uTime*.035);
  float r=length(p*vec2(1.0,.86))+warp;
  float body=1.0-smoothstep(.31,.54,r);
  float cellular=h(floor((p+.5)*11.0)+vec2(vSeed*7.0,vSeed*13.0));
  float fine=.72+.28*sin((p.x*17.0+p.y*13.0+vSeed*29.0)*3.14159);
  float breakup=mix(.72,1.0,cellular)*fine;
  float alpha=body*breakup*vDensity*uOpacity;
  alpha*=smoothstep(.01,.13,alpha);
  if(alpha<.012)discard;
  float core=pow(max(0.0,1.0-r*1.75),2.0);
  vec3 c=mix(vColor,vec3(1.0,.94,.88),core*.18);
  gl_FragColor=vec4(c,alpha);
}`;

function makeMaterial(mobile){
  return new THREE.ShaderMaterial({
    vertexShader,fragmentShader,
    uniforms:{uTime:{value:0},uOpacity:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio||1,mobile?1:1.35)}},
    transparent:true,depthWrite:false,depthTest:false,toneMapped:false,
    blending:THREE.NormalBlending
  });
}

function buildVolumeGeometry(seed,count,mobile){
  const positions=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count),densities=new Float32Array(count),colors=new Float32Array(count*3);
  const lobes=mobile?5:7;
  const centers=[];
  for(let l=0;l<lobes;l++){
    const a=(l/lobes)*Math.PI*2+signed(seed+l*9.1)*.38;
    const radius=3.0+hash(seed+l*4.3)*8.5;
    centers.push({x:Math.cos(a)*radius*(.75+hash(seed+l*5.7)*.55),y:Math.sin(a)*radius*(.52+hash(seed+l*7.9)*.42),z:signed(seed+l*11.3)*9.0});
  }
  for(let i=0;i<count;i++){
    const s=seed+i*1.731,l=i%lobes,c=centers[l];
    const filament=i%7===0;
    const rr=Math.pow(hash(s+2.1),filament?.45:.72);
    const a=hash(s+4.7)*Math.PI*2;
    const radial=(filament?10.5:7.0)*rr*(.60+hash(s+8.1)*.85);
    const x=c.x+Math.cos(a)*radial+signed(s+12.7)*(filament?4.5:2.5);
    const y=c.y+Math.sin(a)*radial*(.45+hash(s+14.2)*.45)+signed(s+15.1)*(filament?3.2:1.8);
    const z=c.z+signed(s+17.3)*(filament?18:11)+signed(s+19.1)*radial*.32;
    positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
    sizes[i]=(filament?7.5:10.5)+hash(s+23.7)*(filament?8.5:15.0);
    seeds[i]=hash(s+29.4);
    densities[i]=(filament?.18:.24)+hash(s+31.7)*(filament?.23:.34);
    const base=GAS_COLORS[(l+i)%GAS_COLORS.length];
    const brightness=.62+hash(s+37.9)*.56;
    colors[i*3]=base.r*brightness;colors[i*3+1]=base.g*brightness;colors[i*3+2]=base.b*brightness;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
  g.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  g.setAttribute('aDensity',new THREE.BufferAttribute(densities,1));
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  g.computeBoundingSphere();
  return g;
}

export class CloudNebulaVolume{
  constructor(){
    this.group=new THREE.Group();this.volumes=[];this.time=0;this.crossings=0;this.nearClouds=0;this.maxOpacity=0;this.peakOpacity=0;this.ready=true;
    this.mobile=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;
    const volumeCount=this.mobile?3:4,particlesPerVolume=this.mobile?320:430;
    for(let i=0;i<volumeCount;i++)this.createVolume(i,particlesPerVolume);
    this.totalParticles=volumeCount*particlesPerVolume;
  }
  createVolume(i,count){
    const seed=71+i*47.3,geometry=buildVolumeGeometry(seed,count,this.mobile),material=makeMaterial(this.mobile),points=new THREE.Points(geometry,material);
    points.frustumCulled=false;points.renderOrder=-910+i;
    const z=-32-i*(this.mobile?74:68),x=signed(seed+2.4)*(i===0?3.5:8.5),y=signed(seed+5.1)*(i===0?2.5:6.0);
    points.position.set(x,y,z);points.rotation.z=signed(seed+8.2)*.42;
    this.group.add(points);
    this.volumes.push({points,geometry,material,seed,speed:.78+hash(seed+13.2)*.28,spin:signed(seed+19.4)*.00022});
  }
  recycle(q){
    let far=-170;for(const v of this.volumes)far=Math.min(far,v.points.position.z);
    q.points.position.z=far-(this.mobile?58:52)-hash(q.seed+this.crossings*1.17)*18;
    q.points.position.x=signed(q.seed+this.crossings*2.31)*9;
    q.points.position.y=signed(q.seed+this.crossings*3.17)*6.5;
    q.points.rotation.z=signed(q.seed+this.crossings*4.11)*.48;
    this.crossings++;
  }
  update(dt,state){
    this.time+=dt;
    const n=clamp01(state.nebulaPresence||0),g=clamp01(state.galaxyReveal||0),light=clamp01(state.livingLight||0),tunnel=clamp01(state.tunnelDrive||0),fade=1-clamp01(state.finalFade||0);
    const presence=Math.min(1,.84+n*.20+g*.12+light*.08+tunnel*.08)*fade;
    const speed=Math.max(3.8,(state.speed||8)*.90);
    this.nearClouds=0;this.maxOpacity=0;
    for(const q of this.volumes){
      q.points.position.z+=speed*q.speed*dt;
      if(q.points.position.z>34)this.recycle(q);
      const z=q.points.position.z,farFade=smooth01((z+245)/100),nearFade=1-smooth01((z-18)/34),nearBoost=.92+1.08*Math.exp(-Math.pow((z+18)/30,2));
      const opacity=Math.min(.88,.56*presence*farFade*nearFade*nearBoost);
      q.material.uniforms.uOpacity.value=opacity;
      q.material.uniforms.uTime.value=this.time;
      q.points.rotation.z+=q.spin*dt*60;
      q.points.position.x+=Math.sin(this.time*.021+q.seed)*dt*.018;
      q.points.position.y+=Math.cos(this.time*.017+q.seed*.71)*dt*.014;
      if(z>-58&&z<22&&opacity>.08)this.nearClouds++;
      this.maxOpacity=Math.max(this.maxOpacity,opacity);this.peakOpacity=Math.max(this.peakOpacity,opacity);
    }
  }
  get stats(){return{mode:'continuous-volumetric-traversal',ready:this.ready,volumeType:'3d-point-gas',rectangularBillboards:false,supportGeometry:'THREE.Points',volumes:this.volumes.length,particles:this.totalParticles,layers:this.totalParticles,crossings:this.crossings,nearClouds:this.nearClouds,maxOpacity:+this.maxOpacity.toFixed(3),peakOpacity:+this.peakOpacity.toFixed(3)};}
  dispose(){for(const q of this.volumes){q.geometry.dispose();q.material.dispose();}this.volumes.length=0;}
}
