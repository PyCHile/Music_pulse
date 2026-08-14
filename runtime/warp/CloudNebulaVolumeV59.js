import * as THREE from 'three';

const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t);};
const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453123;return x-Math.floor(x);};
const signed=n=>hash(n)*2-1;
const GAS_COLORS=[
 new THREE.Color(0x6f9dff),new THREE.Color(0x9a78e8),new THREE.Color(0xf28a82),
 new THREE.Color(0xe5a05f),new THREE.Color(0x537ed1),new THREE.Color(0xc47fc9),
 new THREE.Color(0x79b8d9),new THREE.Color(0x9b6d86)
];

const vertexShader=`
precision mediump float;
attribute float aSize;attribute float aSeed;attribute float aDensity;attribute float aGlow;attribute vec3 color;
uniform float uTime;uniform float uPixelRatio;varying float vSeed;varying float vDensity;varying float vGlow;varying vec3 vColor;
void main(){vec3 p=position;float sway=sin(uTime*.10+aSeed*23.0)*.22;p.x+=sway;p.y+=cos(uTime*.075+aSeed*17.0)*.16;vec4 mv=modelViewMatrix*vec4(p,1.0);float perspective=280.0/max(1.0,-mv.z);gl_PointSize=clamp(aSize*uPixelRatio*perspective,1.5,290.0);gl_Position=projectionMatrix*mv;vSeed=aSeed;vDensity=aDensity;vGlow=aGlow;vColor=color;}`;

const fragmentShader=`
precision mediump float;uniform float uOpacity;uniform float uTime;varying float vSeed;varying float vDensity;varying float vGlow;varying vec3 vColor;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+vSeed*41.13)*43758.5453);}
void main(){vec2 p=gl_PointCoord-.5;float ang=atan(p.y,p.x);float warp=.070*sin(ang*3.0+vSeed*19.0)+.045*sin(ang*7.0-vSeed*13.0)+.026*sin(ang*11.0+uTime*.03);float r=length(p*vec2(1.0,.82))+warp;float body=1.0-smoothstep(.28,.545,r);float cellular=h(floor((p+.5)*13.0)+vec2(vSeed*7.0,vSeed*13.0));float wisps=.66+.34*sin((p.x*15.0+p.y*11.0+vSeed*29.0)*3.14159);float holes=smoothstep(.13,.78,cellular);float breakup=mix(.50,1.0,holes)*mix(.72,1.0,wisps);float alpha=body*breakup*vDensity*uOpacity;alpha*=smoothstep(.008,.105,alpha);if(alpha<.009)discard;float core=pow(max(0.0,1.0-r*1.62),2.2);vec3 hot=vec3(1.0,.91,.82);vec3 c=mix(vColor,hot,core*(.12+.25*vGlow));c*=.82+vGlow*.48;gl_FragColor=vec4(c,alpha);}`;

function makeMaterial(mobile,additive=false){return new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{uTime:{value:0},uOpacity:{value:0},uPixelRatio:{value:Math.min(devicePixelRatio||1,mobile?1:1.35)}},transparent:true,depthWrite:false,depthTest:false,toneMapped:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});}

function buildVolumeGeometry(seed,count,mobile,emissive=false){
 const positions=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count),densities=new Float32Array(count),glows=new Float32Array(count),colors=new Float32Array(count*3);const lobes=mobile?6:8,centers=[];
 for(let l=0;l<lobes;l++){const a=(l/lobes)*Math.PI*2+signed(seed+l*9.1)*.46,radius=3+hash(seed+l*4.3)*9.5;centers.push({x:Math.cos(a)*radius*(.72+hash(seed+l*5.7)*.62),y:Math.sin(a)*radius*(.48+hash(seed+l*7.9)*.48),z:signed(seed+l*11.3)*11});}
 for(let i=0;i<count;i++){const s=seed+i*1.731,l=i%lobes,c=centers[l],filament=i%6===0,rr=Math.pow(hash(s+2.1),filament?.42:.68),a=hash(s+4.7)*Math.PI*2,radial=(filament?12:8.4)*rr*(.58+hash(s+8.1)*.92),x=c.x+Math.cos(a)*radial+signed(s+12.7)*(filament?5.3:2.8),y=c.y+Math.sin(a)*radial*(.42+hash(s+14.2)*.48)+signed(s+15.1)*(filament?3.9:2.0),z=c.z+signed(s+17.3)*(filament?21:13)+signed(s+19.1)*radial*.36;positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;sizes[i]=(filament?10:14)+hash(s+23.7)*(filament?13:22);seeds[i]=hash(s+29.4);densities[i]=(emissive?.24:.34)+hash(s+31.7)*(emissive?.34:.46);glows[i]=emissive?(.62+hash(s+34.2)*.38):(.12+hash(s+34.2)*.30);const base=GAS_COLORS[(l+i+(emissive?2:0))%GAS_COLORS.length],brightness=(emissive?.92:.72)+hash(s+37.9)*(emissive?.52:.48);colors[i*3]=base.r*brightness;colors[i*3+1]=base.g*brightness;colors[i*3+2]=base.b*brightness;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));g.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));g.setAttribute('aDensity',new THREE.BufferAttribute(densities,1));g.setAttribute('aGlow',new THREE.BufferAttribute(glows,1));g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeBoundingSphere();return g;
}

export class CloudNebulaVolume{
 constructor(){this.group=new THREE.Group();this.volumes=[];this.time=0;this.crossings=0;this.nearClouds=0;this.maxOpacity=0;this.peakOpacity=0;this.ready=true;this.mobile=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;const volumeCount=this.mobile?4:5,particlesPerVolume=this.mobile?420:520;for(let i=0;i<volumeCount;i++)this.createVolume(i,particlesPerVolume,i%3===1);this.totalParticles=volumeCount*particlesPerVolume;}
 createVolume(i,count,emissive){const seed=71+i*47.3,geometry=buildVolumeGeometry(seed,count,this.mobile,emissive),material=makeMaterial(this.mobile,emissive),points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=-920+i;const z=-26-i*(this.mobile?58:54),x=signed(seed+2.4)*(i===0?3.0:7.5),y=signed(seed+5.1)*(i===0?2.2:5.5);points.position.set(x,y,z);points.rotation.z=signed(seed+8.2)*.42;this.group.add(points);this.volumes.push({points,geometry,material,seed,emissive,speed:.80+hash(seed+13.2)*.26,spin:signed(seed+19.4)*.00022});}
 recycle(q){let far=-175;for(const v of this.volumes)far=Math.min(far,v.points.position.z);q.points.position.z=far-(this.mobile?48:44)-hash(q.seed+this.crossings*1.17)*16;q.points.position.x=signed(q.seed+this.crossings*2.31)*8;q.points.position.y=signed(q.seed+this.crossings*3.17)*6;q.points.rotation.z=signed(q.seed+this.crossings*4.11)*.48;this.crossings++;}
 update(dt,state){this.time+=dt;const n=clamp01(state.nebulaPresence||0),g=clamp01(state.galaxyReveal||0),light=clamp01(state.livingLight||0),tunnel=clamp01(state.tunnelDrive||0),fade=1-clamp01(state.finalFade||0),presence=Math.min(1,.93+n*.18+g*.12+light*.10+tunnel*.08)*fade,speed=Math.max(4.1,(state.speed||8)*.92);this.nearClouds=0;this.maxOpacity=0;for(const q of this.volumes){q.points.position.z+=speed*q.speed*dt;if(q.points.position.z>38)this.recycle(q);const z=q.points.position.z,farFade=smooth01((z+245)/92),nearFade=1-smooth01((z-22)/38),nearBoost=.96+1.16*Math.exp(-Math.pow((z+16)/29,2)),base=q.emissive?.50:.67,cap=q.emissive?.74:.94,opacity=Math.min(cap,base*presence*farFade*nearFade*nearBoost);q.material.uniforms.uOpacity.value=opacity;q.material.uniforms.uTime.value=this.time;q.points.rotation.z+=q.spin*dt*60;q.points.position.x+=Math.sin(this.time*.021+q.seed)*dt*.020;q.points.position.y+=Math.cos(this.time*.017+q.seed*.71)*dt*.016;if(z>-62&&z<24&&opacity>.10)this.nearClouds++;this.maxOpacity=Math.max(this.maxOpacity,opacity);this.peakOpacity=Math.max(this.peakOpacity,opacity);}}
 get stats(){return{mode:'continuous-volumetric-traversal',ready:this.ready,volumeType:'3d-point-gas-v59',coloredGas:true,rectangularBillboards:false,supportGeometry:'THREE.Points',volumes:this.volumes.length,particles:this.totalParticles,layers:this.totalParticles,crossings:this.crossings,nearClouds:this.nearClouds,maxOpacity:+this.maxOpacity.toFixed(3),peakOpacity:+this.peakOpacity.toFixed(3),emissiveVolumes:this.volumes.filter(v=>v.emissive).length};}
 dispose(){for(const q of this.volumes){q.geometry.dispose();q.material.dispose();}this.volumes.length=0;}
}
