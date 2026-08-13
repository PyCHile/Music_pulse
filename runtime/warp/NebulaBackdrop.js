import * as THREE from 'three';

const vertexShader=`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

const fragmentShader=`
precision highp float;
varying vec3 vDir;
uniform float uTime;uniform float uTravel;uniform float uEnergy;uniform float uCrescendo;uniform float uVisibility;uniform float uTunnelDrive;uniform float uLivingLight;uniform float uGalaxyReveal;uniform float uIdealized;uniform float uLifeReview;uniform float uBoundary;uniform float uReturn;uniform float uFinalFade;uniform float uAudioHeartPulse;uniform float uHeartLightFade;uniform float uRaySteps;
uniform float uNarrativeBlend;uniform float uNarrativeDarkZone;uniform float uNarrativeFilaments;uniform vec2 uNarrativeCore;uniform vec3 uNarrativeColor0;uniform vec3 uNarrativeColor1;uniform vec3 uNarrativeColor2;

float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);} 
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);} 
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float n000=hash31(i),n100=hash31(i+vec3(1,0,0)),n010=hash31(i+vec3(0,1,0)),n110=hash31(i+vec3(1,1,0)),n001=hash31(i+vec3(0,0,1)),n101=hash31(i+vec3(1,0,1)),n011=hash31(i+vec3(0,1,1)),n111=hash31(i+vec3(1,1,1));float nx00=mix(n000,n100,f.x),nx10=mix(n010,n110,f.x),nx01=mix(n001,n101,f.x),nx11=mix(n011,n111,f.x);return mix(mix(nx00,nx10,f.y),mix(nx01,nx11,f.y),f.z);} 
float fbm(vec3 p){float v=0.0,a=.52;for(int i=0;i<5;i++){v+=noise3(p)*a;p=p*2.02+vec3(7.1,-5.2,3.7);a*=.48;}return v;} 
float ridge(float v){return 1.0-abs(v*2.0-1.0);} 
float hg(float c,float g){float g2=g*g;return (1.0-g2)/(12.56637*pow(max(.05,1.0+g2-2.0*g*c),1.5));}
float gauss2(vec2 p,vec2 c,float k){vec2 q=p-c;return exp(-dot(q,q)*k);} 

vec4 densityField(vec3 p){
 vec3 drift=vec3(uTravel*.00034,uTravel*.00011,-uTravel*.00052);
 vec3 q=p+drift+vec3(0.0,uTime*.0032,0.0);
 vec3 warp=vec3(fbm(q*.19+vec3(4.2,-1.7,6.1)),fbm(q*.21+vec3(-2.8,5.4,1.3)),fbm(q*.18+vec3(7.0,2.2,-4.6)))*2.0-1.0;
 vec3 w=q+warp*(1.05+.35*uNarrativeFilaments);
 float macro=fbm(w*.34);
 float middle=fbm(w*.72+vec3(5.4,-2.1,3.3));
 float detail=fbm(w*1.58+vec3(-6.0,4.7,2.2));
 float filament=ridge(fbm(w*(1.42+uNarrativeFilaments*.58)+warp*.55));
 float body=smoothstep(.39,.69,macro*.67+middle*.24+detail*.09);
 float filamentMask=smoothstep(mix(.73,.52,uNarrativeFilaments),mix(.89,.72,uNarrativeFilaments),filament)*body;
 float dustNoise=fbm(w*.92+vec3(11.2,-8.4,5.7));
 float dustRidge=ridge(fbm(w*1.86+vec3(-8.0,3.2,9.0)));
 float dust=smoothstep(.50,.76,dustNoise*.72+dustRidge*.28)*body;
 float emissionNoise=fbm(w*.56+vec3(-3.1,8.0,4.6));
 float emission=smoothstep(.55,.80,emissionNoise*.58+filamentMask*.72)*body;
 float carved=1.0-smoothstep(.54,.81,fbm(w*.46+vec3(14.0,-3.0,-7.0)))*mix(.35,.82,uNarrativeDarkZone);
 float density=body*carved*(.52+filamentMask*.48);
 return vec4(density,dust,emission,filamentMask);
}

void main(){
 vec3 rd=normalize(vDir);float forward=smoothstep(.02,1.0,-rd.z);vec2 screen=rd.xy/max(.30,abs(rd.z));
 float steps=max(12.0,uRaySteps),stepSize=8.4/steps,t=.35;vec3 accum=vec3(0.0);float trans=1.0;
 vec3 cold=vec3(.018,.045,.115),violet=vec3(.18,.045,.27),warm=vec3(.52,.115,.028),white=vec3(.96,.90,.82);
 vec3 c0=mix(cold,uNarrativeColor0,uNarrativeBlend),c1=mix(violet,uNarrativeColor1,uNarrativeBlend),c2=mix(warm,uNarrativeColor2,uNarrativeBlend);
 vec3 lightDir=normalize(vec3(-.38,.28,-.88));float phase=hg(dot(rd,lightDir),.42);
 float coreField=gauss2(screen,uNarrativeCore,3.4)*uNarrativeBlend;
 for(int i=0;i<28;i++){
  if(float(i)>=steps)break;
  vec3 p=rd*t;
  vec4 f=densityField(p);
  float density=f.x*(.58+.32*uGalaxyReveal+.18*uTunnelDrive);
  float dust=f.y*mix(.75,1.65,uNarrativeDarkZone);
  float emissive=f.z*(.42+.58*uCrescendo)+coreField*.16;
  float extinction=density*(.72+dust*1.65);
  float alpha=1.0-exp(-extinction*stepSize*.82);
  float scatter=density*(.13+phase*2.2)*(1.0-dust*.62);
  vec3 gas=mix(c0,c1,clamp(f.w*.72+f.z*.22,0.0,1.0));gas=mix(gas,c2,clamp(f.z*.72+coreField*.28,0.0,1.0));
  vec3 emission=gas*emissive*.48+white*emissive*emissive*.11;
  vec3 inscatter=gas*scatter*.34;
  accum+=(emission+inscatter)*trans*alpha;
  trans*=1.0-alpha;
  if(trans<.035)break;
  t+=stepSize;
 }
 float darkPocket=smoothstep(.56,.82,fbm(vec3(screen*1.15,uTime*.0018)+vec3(4.0,-2.0,7.0)))*mix(.18,.62,uNarrativeDarkZone);
 accum*=1.0-darkPocket;
 accum*=forward;
 float radial=length(rd.xy);float preAura=exp(-radial*radial*4.0)*forward*uLivingLight,orb=smoothstep(.74,.99,uLivingLight),core=exp(-radial*radial*34.0)*forward*uLivingLight*orb,aura=exp(-radial*radial*7.6)*forward*uLivingLight*(.18+.82*orb);
 accum+=mix(vec3(.62,.80,1.0),vec3(1.0,.97,.91),uLivingLight)*preAura*.035+vec3(1.0,.97,.91)*core*.40+vec3(.62,.80,1.0)*aura*.055;
 float fetalPresence=clamp(uHeartLightFade,0.0,1.0),fetalPulse=clamp(uAudioHeartPulse,0.0,1.0)*fetalPresence;accum+=vec3(1.0,.97,.91)*exp(-radial*radial*mix(42.0,28.0,fetalPulse))*forward*fetalPresence*(.17+fetalPulse*.24);
 float pi=3.14159265359;vec2 uv=vec2(atan(rd.z,rd.x)/(2.0*pi)+.5,asin(clamp(rd.y,-1.0,1.0))/pi+.5),starUv=uv*vec2(1160.0,580.0),cell=floor(starUv),fp=fract(starUv)-.5;float rnd=hash21(cell+17.1),sr=length(fp-(vec2(hash21(cell+2.3),hash21(cell+9.7))-.5)*.70),star=smoothstep(.035,0.0,sr)*step(.9972,rnd);accum+=mix(vec3(.68,.78,1.0),vec3(1.0,.91,.76),hash21(cell+31.2))*star*.11;
 accum*=uVisibility;accum=mix(accum,vec3(0.0),uFinalFade*(1.0-fetalPresence*.92));
 gl_FragColor=vec4(accum,1.0);
}`;

export class NebulaBackdrop{
 constructor(){
  this.travel=0;
  const mobile=/iPad|iPhone|Android/i.test(navigator.userAgent||'')||innerWidth<800;
  this.geometry=new THREE.SphereGeometry(220,mobile?48:72,mobile?30:48);
  this.material=new THREE.ShaderMaterial({vertexShader,fragmentShader,side:THREE.BackSide,depthWrite:false,depthTest:false,transparent:false,uniforms:{uTime:{value:0},uTravel:{value:0},uEnergy:{value:.12},uCrescendo:{value:0},uVisibility:{value:.20},uTunnelDrive:{value:0},uLivingLight:{value:0},uGalaxyReveal:{value:0},uIdealized:{value:0},uLifeReview:{value:0},uBoundary:{value:0},uReturn:{value:0},uFinalFade:{value:0},uAudioHeartPulse:{value:0},uHeartLightFade:{value:0},uRaySteps:{value:mobile?18:28},uNarrativeBlend:{value:0},uNarrativeDarkZone:{value:.6},uNarrativeFilaments:{value:.3},uNarrativeCore:{value:new THREE.Vector2(0,0)},uNarrativeColor0:{value:new THREE.Color('#0d1b4b')},uNarrativeColor1:{value:new THREE.Color('#6a0572')},uNarrativeColor2:{value:new THREE.Color('#d07a35')}}});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=-1000;
 }
 get visibility(){return this.material.uniforms.uVisibility.value||0;}
 update(dt,state,features){
  this.travel+=Math.max(0,state.speed)*dt;const u=this.material.uniforms;u.uTime.value+=dt;u.uTravel.value=this.travel;u.uEnergy.value=features.energy||0;u.uCrescendo.value=features.crescendo||0;
  const tunnel=state.tunnelDrive||0,reveal=state.galaxyReveal||0,light=state.livingLight||0,nebula=state.nebulaPresence||0;u.uVisibility.value=Math.min(.42,.16+nebula*.11+tunnel*.055+(features.mid||0)*.014+reveal*.085+light*.030);u.uTunnelDrive.value=tunnel;u.uLivingLight.value=light;u.uGalaxyReveal.value=reveal;u.uIdealized.value=state.idealized||0;u.uLifeReview.value=state.lifeReview||0;u.uBoundary.value=state.boundary||0;u.uReturn.value=state.returnForce||0;u.uFinalFade.value=state.finalFade||0;u.uAudioHeartPulse.value=state.audioHeartPulse||0;u.uHeartLightFade.value=state.heartLightFade||0;
 }
 dispose(){this.geometry.dispose();this.material.dispose();}
}
