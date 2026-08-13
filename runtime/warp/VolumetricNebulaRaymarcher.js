import * as THREE from 'three';
import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

const vertexShader=`
varying vec3 vDir;
void main(){
  vDir=normalize(position);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;

const fragmentShader=`
precision highp float;
varying vec3 vDir;
uniform float uTime,uTravel,uVisibility,uTunnelDrive,uLivingLight,uGalaxyReveal,uFinalFade,uAudioHeartPulse,uHeartLightFade,uRaySteps,uShadowSteps,uNarrativeBlend,uNarrativeDarkZone,uNarrativeFilaments;
uniform float uExtinction,uScattering,uEmission,uAnisotropy,uShadowStrength;
uniform vec2 uNarrativeCore;
uniform vec3 uNarrativeColor0,uNarrativeColor1,uNarrativeColor2,uLightDir;

float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
vec3 hash33(vec3 p3){p3=fract(p3*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yxz+33.33);return fract((p3.xxy+p3.yxx)*p3.zyx);}
float valueNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float n000=hash11(dot(i+vec3(0,0,0),vec3(1,57,113))),n100=hash11(dot(i+vec3(1,0,0),vec3(1,57,113))),n010=hash11(dot(i+vec3(0,1,0),vec3(1,57,113))),n110=hash11(dot(i+vec3(1,1,0),vec3(1,57,113))),n001=hash11(dot(i+vec3(0,0,1),vec3(1,57,113))),n101=hash11(dot(i+vec3(1,0,1),vec3(1,57,113))),n011=hash11(dot(i+vec3(0,1,1),vec3(1,57,113))),n111=hash11(dot(i+vec3(1,1,1),vec3(1,57,113)));float x00=mix(n000,n100,f.x),x10=mix(n010,n110,f.x),x01=mix(n001,n101,f.x),x11=mix(n011,n111,f.x);return mix(mix(x00,x10,f.y),mix(x01,x11,f.y),f.z);}
float worley(vec3 p){vec3 ip=floor(p),fp=fract(p);float md=10.0;for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 o=vec3(float(x),float(y),float(z));vec3 r=o+hash33(ip+o)-fp;md=min(md,dot(r,r));}return sqrt(md);}
float fbm(vec3 p){float v=0.0,a=.52;for(int i=0;i<4;i++){v+=valueNoise(p)*a;p=p*2.02+vec3(7.1,-3.4,5.6);a*=.49;}return v;}
float ridged(vec3 p){float n=fbm(p);return 1.0-abs(n*2.0-1.0);}
float hg(float c,float g){float q=1.0+g*g-2.0*g*c;return (1.0-g*g)/(12.5663706*pow(max(.045,q),1.5));}
float gauss(vec2 p,vec2 c,float k){vec2 q=p-c;return exp(-dot(q,q)*k);}

vec4 densityField(vec3 p){
  vec3 q=p+vec3(uTravel*.00022,uTime*.0018,-uTravel*.00038);
  float macro=fbm(q*.30);
  float curlX=valueNoise(q*.22+vec3(13.2,-4.7,2.1))-.5;
  float curlY=valueNoise(q*.24+vec3(-6.3,8.9,5.4))-.5;
  float curlZ=valueNoise(q*.20+vec3(3.7,1.4,-9.8))-.5;
  q+=vec3(curlX,curlY,curlZ)*(1.35+.75*uNarrativeFilaments);
  float medium=fbm(q*.72+vec3(4.1,-2.8,1.2));
  float filament=ridged(q*(1.15+uNarrativeFilaments*.62)+vec3(8.2,2.7,-5.3));
  float cellular=1.0-clamp(worley(q*.58),0.0,1.0);
  float body=smoothstep(.38,.70,macro*.52+medium*.30+cellular*.18);
  float fil=smoothstep(mix(.78,.52,uNarrativeFilaments),mix(.95,.72,uNarrativeFilaments),filament)*body;
  float voids=smoothstep(.58,.84,fbm(q*.43+vec3(14.0,-7.0,3.0)));
  float darkCarve=1.0-voids*mix(.34,.86,uNarrativeDarkZone);
  float dust=smoothstep(.54,.80,fbm(q*.90+vec3(-7.0,3.0,5.0)))*body;
  float emit=smoothstep(.60,.86,medium*.58+fil*.72)*body;
  float density=max(0.0,body*darkCarve*(.65+.35*fil));
  return vec4(density,dust,emit,fil);
}

float shadowTransmittance(vec3 p,vec3 ld){
  float tau=0.0;
  float ds=1.35;
  for(int j=0;j<4;j++){
    if(float(j)>=uShadowSteps)break;
    vec3 sp=p+ld*(float(j)+1.0)*ds;
    vec4 f=densityField(sp);
    float sigma=uExtinction*(f.x*(.72+f.y*.95));
    tau+=sigma*ds;
  }
  return exp(-tau*uShadowStrength);
}

void main(){
  vec3 rd=normalize(vDir);
  float forward=smoothstep(.03,1.0,-rd.z);
  vec2 screen=rd.xy/max(.30,abs(rd.z));
  float steps=max(8.0,uRaySteps);
  float maxDistance=8.6;
  float ds=maxDistance/steps;
  float t=.36;
  float trans=1.0;
  vec3 accum=vec3(0.0);
  vec3 ld=normalize(uLightDir);
  float phase=hg(dot(rd,ld),clamp(uAnisotropy,-.65,.75));
  float core=gauss(screen,uNarrativeCore,4.0)*uNarrativeBlend;
  vec3 c0=mix(vec3(.012,.028,.070),uNarrativeColor0,uNarrativeBlend*.76);
  vec3 c1=mix(vec3(.075,.055,.135),uNarrativeColor1,uNarrativeBlend*.76);
  vec3 c2=mix(vec3(.34,.105,.028),uNarrativeColor2,uNarrativeBlend*.66);

  for(int i=0;i<24;i++){
    if(float(i)>=steps)break;
    vec3 p=rd*t;
    vec4 f=densityField(p);
    float density=f.x*(.46+.24*uTunnelDrive+.20*uGalaxyReveal+.10*uLivingLight);
    float dust=f.y*mix(.72,1.50,uNarrativeDarkZone);
    float sigmaT=uExtinction*density*(.72+dust*1.22);
    float alpha=1.0-exp(-sigmaT*ds);
    vec3 gas=mix(c0,c1,clamp(f.w*.82+f.z*.12,0.0,1.0));
    gas=mix(gas,c2,clamp(f.z*.66+core*.24,0.0,1.0));
    float shadow=shadowTransmittance(p,ld);
    float scatter=uScattering*density*(.11+phase*1.65)*(1.0-dust*.52)*shadow;
    vec3 emission=gas*(f.z*uEmission*.32)+vec3(.98,.93,.86)*(f.z*f.z*uEmission*.052);
    vec3 source=emission+gas*scatter*.30;
    accum+=trans*alpha*source;
    trans*=1.0-alpha;
    if(trans<.035)break;
    t+=ds;
  }

  float pocket=smoothstep(.60,.84,fbm(vec3(screen*1.10,uTime*.0011)+vec3(3.0,-2.0,6.0)))*mix(.16,.56,uNarrativeDarkZone);
  accum*=1.0-pocket;
  accum*=forward;
  float r=length(rd.xy),light=uLivingLight;
  accum+=vec3(.74,.85,1.0)*exp(-r*r*5.2)*light*.020+vec3(1.0,.97,.91)*exp(-r*r*31.0)*light*light*.18;
  float fetal=clamp(uHeartLightFade,0.0,1.0),pulse=clamp(uAudioHeartPulse,0.0,1.0);
  accum+=vec3(1.0,.96,.90)*exp(-r*r*mix(38.0,26.0,pulse))*fetal*(.10+pulse*.15);
  accum*=uVisibility;
  accum=mix(accum,vec3(0.0),uFinalFade*(1.0-fetal*.90));
  gl_FragColor=vec4(accum,1.0);
}`;

export class VolumetricNebulaRaymarcher{
  constructor(){
    this.travel=0;this.avgDt=1/60;this.qualityClock=0;
    const mobile=/iPad|iPhone|Android/i.test(navigator.userAgent||'')||innerWidth<800;
    this.mobile=mobile;this.baseSteps=mobile?12:20;this.minSteps=mobile?8:12;this.baseShadowSteps=mobile?2:4;
    this.geometry=new THREE.SphereGeometry(220,mobile?32:48,mobile?20:30);
    this.material=new THREE.ShaderMaterial({vertexShader,fragmentShader,side:THREE.BackSide,depthWrite:false,depthTest:false,transparent:false,uniforms:{
      uTime:{value:0},uTravel:{value:0},uVisibility:{value:.14},uTunnelDrive:{value:0},uLivingLight:{value:0},uGalaxyReveal:{value:0},uFinalFade:{value:0},uAudioHeartPulse:{value:0},uHeartLightFade:{value:0},
      uRaySteps:{value:this.baseSteps},uShadowSteps:{value:this.baseShadowSteps},uNarrativeBlend:{value:0},uNarrativeDarkZone:{value:.60},uNarrativeFilaments:{value:.34},uNarrativeCore:{value:new THREE.Vector2(0,0)},
      uNarrativeColor0:{value:new THREE.Color('#0d1b4b')},uNarrativeColor1:{value:new THREE.Color('#4b3f64')},uNarrativeColor2:{value:new THREE.Color('#b66d32')},
      uExtinction:{value:.92},uScattering:{value:.86},uEmission:{value:.72},uAnisotropy:{value:.34},uShadowStrength:{value:.78},uLightDir:{value:new THREE.Vector3(-.36,.25,-.90).normalize()}
    }});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=-1000;
    runtimeCapabilities.mark('shader-noise',true,{kind:'shader',features:['value-noise','worley','fbm','ridged']});
    runtimeCapabilities.mark('volumetric-raymarch',true,{kind:'shader',features:['3d-density-field','beer-lambert-extinction','henyey-greenstein-scattering','emission','secondary-light-march','self-shadowing'],mobileSteps:this.baseSteps,shadowSteps:this.baseShadowSteps});
  }
  get visibility(){return this.material.uniforms.uVisibility.value||0;}
  get raySteps(){return this.material.uniforms.uRaySteps.value||0;}
  update(dt,state,features){
    this.travel+=Math.max(0,state.speed||0)*dt;this.avgDt=this.avgDt*.94+dt*.06;this.qualityClock+=dt;
    const u=this.material.uniforms;u.uTime.value+=dt;u.uTravel.value=this.travel;
    if(this.qualityClock>1){
      this.qualityClock=0;
      const slow=this.avgDt>.027,medium=this.avgDt>.021;
      u.uRaySteps.value=slow?this.minSteps:(medium?Math.max(this.minSteps,this.baseSteps-4):this.baseSteps);
      u.uShadowSteps.value=slow?1:(medium?Math.max(1,this.baseShadowSteps-1):this.baseShadowSteps);
    }
    const tunnel=state.tunnelDrive||0,reveal=state.galaxyReveal||0,light=state.livingLight||0,nebula=state.nebulaPresence||0;
    u.uVisibility.value=Math.min(.25,.105+nebula*.060+tunnel*.024+reveal*.048+light*.015+(features.mid||0)*.006);
    u.uTunnelDrive.value=tunnel;u.uLivingLight.value=light;u.uGalaxyReveal.value=reveal;u.uFinalFade.value=state.finalFade||0;u.uAudioHeartPulse.value=state.audioHeartPulse||0;u.uHeartLightFade.value=state.heartLightFade||0;
    u.uExtinction.value=.82+nebula*.28+(state.dustDensity||0)*.18;
    u.uScattering.value=.72+reveal*.22+light*.16;
    u.uEmission.value=.56+light*.32+reveal*.18;
    u.uAnisotropy.value=.28+tunnel*.12;
    u.uShadowStrength.value=.70+u.uNarrativeDarkZone.value*.22;
  }
  dispose(){this.geometry.dispose();this.material.dispose();}
}
