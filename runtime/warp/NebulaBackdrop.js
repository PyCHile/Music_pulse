import * as THREE from 'three';

const vertexShader=`
varying vec3 vDir;
void main(){
  vDir=normalize(position);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;

const fragmentShader=`
precision highp float;
varying vec3 vDir;
uniform float uTime;
uniform float uTravel;
uniform float uEnergy;
uniform float uCrescendo;
uniform float uVisibility;
uniform vec2 uTurn;

float hash31(vec3 p){
  p=fract(p*.1031);
  p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float hash21(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}
float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  float n000=hash31(i+vec3(0,0,0));
  float n100=hash31(i+vec3(1,0,0));
  float n010=hash31(i+vec3(0,1,0));
  float n110=hash31(i+vec3(1,1,0));
  float n001=hash31(i+vec3(0,0,1));
  float n101=hash31(i+vec3(1,0,1));
  float n011=hash31(i+vec3(0,1,1));
  float n111=hash31(i+vec3(1,1,1));
  float nx00=mix(n000,n100,f.x),nx10=mix(n010,n110,f.x);
  float nx01=mix(n001,n101,f.x),nx11=mix(n011,n111,f.x);
  return mix(mix(nx00,nx10,f.y),mix(nx01,nx11,f.y),f.z);
}
float fbm(vec3 p){
  float v=0.0,a=.53;
  for(int i=0;i<4;i++){
    v+=noise3(p)*a;
    p=p*2.03+vec3(7.1,-5.2,3.7);
    a*=.49;
  }
  return v;
}

void main(){
  vec3 d=normalize(vDir);
  vec3 travel=vec3(uTravel*.010,uTravel*.004,-uTravel*.014);
  vec3 steer=vec3(uTurn.x*1.6,uTurn.y*1.25,0.0);
  vec3 p=d*3.15+travel+steer;

  float n1=fbm(p*1.05+vec3(0.0,uTime*.003,0.0));
  float n2=fbm(p*2.05+vec3(4.7,-3.2,uTime*.005));
  float n3=fbm(p*3.75+vec3(-6.1,5.4,-2.7));

  float cloud=smoothstep(.42,.76,n1*.60+n2*.31+n3*.09);
  float ridge=1.0-abs(n2*2.0-1.0);
  float filament=smoothstep(.49,.78,ridge*.62+n3*.38)*cloud;
  float dustField=fbm(p*2.85+vec3(11.8,-8.0,5.2));
  float dustLane=smoothstep(.52,.69,dustField)*smoothstep(.20,.72,cloud);

  float warmField=fbm(p*1.42+vec3(-2.4,7.8,3.4));
  float violetField=fbm(p*1.70+vec3(6.0,-4.9,8.2));
  float warmMask=smoothstep(.58,.84,warmField)*cloud;
  float violetMask=smoothstep(.46,.79,violetField)*cloud;

  vec3 deep=vec3(.0015,.0025,.0060);
  vec3 blue=vec3(.018,.060,.175);
  vec3 cyan=vec3(.035,.145,.220);
  vec3 violet=vec3(.165,.048,.255);
  vec3 magenta=vec3(.300,.060,.180);
  vec3 amber=vec3(.330,.090,.018);
  vec3 gold=vec3(.520,.205,.035);

  vec3 gas=mix(blue,violet,violetMask*.82);
  gas=mix(gas,magenta,violetMask*warmMask*.30);
  gas=mix(gas,amber,warmMask*.78);
  gas+=cyan*filament*.24*(1.0-warmMask);
  gas+=gold*pow(warmMask,2.0)*.24;

  float density=cloud*(.58+uEnergy*.22+uCrescendo*.13)+filament*.20;
  vec3 col=deep+gas*density;
  col*=1.0-dustLane*(.58-uEnergy*.10);

  float pi=3.14159265359;
  vec2 uv=vec2(atan(d.z,d.x)/(2.0*pi)+.5,asin(clamp(d.y,-1.0,1.0))/pi+.5);
  vec2 starUv=uv*vec2(1180.0,590.0);
  vec2 cell=floor(starUv);
  vec2 f=fract(starUv)-.5;
  vec2 off=vec2(hash21(cell+2.3),hash21(cell+9.7))-.5;
  off*=.72;
  float starRnd=hash21(cell+17.1);
  float r=length(f-off);
  float starCore=smoothstep(.050,0.0,r)*step(.9885,starRnd);
  float brightMask=step(.9986,starRnd);
  float cross=(smoothstep(.020,0.0,abs(f.x-off.x))*smoothstep(.30,0.0,abs(f.y-off.y))+
               smoothstep(.020,0.0,abs(f.y-off.y))*smoothstep(.30,0.0,abs(f.x-off.x)))*brightMask;
  float temp=hash21(cell+31.2);
  vec3 starColor=temp<.72?vec3(.72,.84,1.0):(temp<.92?vec3(1.0,.92,.76):vec3(1.0,.62,.28));
  col+=starColor*(starCore*(.40+uVisibility*.35)+cross*.42);

  col*=uVisibility;
  gl_FragColor=vec4(col,1.0);
}`;

export class NebulaBackdrop{
  constructor(){
    this.travel=0;
    this.geometry=new THREE.SphereGeometry(220,40,24);
    this.material=new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side:THREE.BackSide,
      depthWrite:false,
      depthTest:false,
      transparent:false,
      uniforms:{
        uTime:{value:0},
        uTravel:{value:0},
        uEnergy:{value:.12},
        uCrescendo:{value:0},
        uVisibility:{value:.82},
        uTurn:{value:new THREE.Vector2()}
      }
    });
    this.mesh=new THREE.Mesh(this.geometry,this.material);
    this.mesh.frustumCulled=false;
    this.mesh.renderOrder=-1000;
  }
  update(dt,state,features,vanishingPoint){
    this.travel+=state.speed*dt;
    this.material.uniforms.uTime.value+=dt;
    this.material.uniforms.uTravel.value=this.travel;
    this.material.uniforms.uEnergy.value=features.energy||0;
    this.material.uniforms.uCrescendo.value=features.crescendo||0;
    this.material.uniforms.uVisibility.value=Math.min(.98,.76+(state.nebulaPresence||0)*.75+(features.mid||0)*.10);
    this.material.uniforms.uTurn.value.set(vanishingPoint.x||0,vanishingPoint.y||0);
  }
  dispose(){
    this.geometry.dispose();
    this.material.dispose();
  }
}
