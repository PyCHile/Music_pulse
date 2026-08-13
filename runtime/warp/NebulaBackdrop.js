import * as THREE from 'three';

const vertexShader=`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader=`
precision highp float;
varying vec3 vDir;
uniform float uTime,uTravel,uVisibility,uTunnelDrive,uLivingLight,uGalaxyReveal,uFinalFade,uAudioHeartPulse,uHeartLightFade,uRaySteps,uNarrativeBlend,uNarrativeDarkZone,uNarrativeFilaments;
uniform vec2 uNarrativeCore;uniform vec3 uNarrativeColor0,uNarrativeColor1,uNarrativeColor2;
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=h31(i),b=h31(i+vec3(1,0,0)),c=h31(i+vec3(0,1,0)),d=h31(i+vec3(1,1,0)),e=h31(i+vec3(0,0,1)),g=h31(i+vec3(1,0,1)),h=h31(i+vec3(0,1,1)),j=h31(i+vec3(1,1,1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,j,f.x),f.y),f.z);}float fbm3(vec3 p){float v=.0,a=.56;for(int i=0;i<3;i++){v+=n3(p)*a;p=p*2.03+vec3(5.2,-3.7,2.4);a*=.46;}return v;}float ridge(float v){return 1.-abs(v*2.-1.);}float gauss(vec2 p,vec2 c,float k){vec2 q=p-c;return exp(-dot(q,q)*k);}float hg(float c,float g){float q=1.+g*g-2.*g*c;return (1.-g*g)/(12.56637*pow(max(.08,q),1.5));}
vec4 field(vec3 p){vec3 q=p+vec3(uTravel*.00028,uTime*.0022,-uTravel*.00044);float w=n3(q*.28+vec3(3.1,5.7,-2.4));q+=vec3(w-.5,n3(q*.31+7.1)-.5,n3(q*.24-4.8)-.5)*(1.15+.35*uNarrativeFilaments);float macro=fbm3(q*.34),mid=fbm3(q*.78+vec3(5.2,-2.7,1.9)),fil=ridge(fbm3(q*(1.25+uNarrativeFilaments*.45)+8.3));float body=smoothstep(.43,.68,macro*.72+mid*.28);float f=smoothstep(mix(.76,.54,uNarrativeFilaments),mix(.91,.72,uNarrativeFilaments),fil)*body;float dust=smoothstep(.56,.78,fbm3(q*.92+vec3(-7.,3.,5.)))*body;float emit=smoothstep(.61,.82,mid*.62+f*.65)*body;float carve=1.-smoothstep(.64,.84,fbm3(q*.49+vec3(11.,-6.,2.)))*mix(.38,.78,uNarrativeDarkZone);return vec4(body*carve*(.72+.28*f),dust,emit,f);}
void main(){vec3 rd=normalize(vDir);float forward=smoothstep(.04,1.,-rd.z);vec2 screen=rd.xy/max(.32,abs(rd.z));float steps=max(8.,uRaySteps),stepSize=7.2/steps,t=.45,trans=1.;vec3 accum=vec3(0.);vec3 cold=vec3(.015,.03,.075),mid=vec3(.10,.08,.16),warm=vec3(.42,.13,.04),c0=mix(cold,uNarrativeColor0,uNarrativeBlend*.62),c1=mix(mid,uNarrativeColor1,uNarrativeBlend*.62),c2=mix(warm,uNarrativeColor2,uNarrativeBlend*.48);float phase=hg(dot(rd,normalize(vec3(-.36,.25,-.90))),.35),core=gauss(screen,uNarrativeCore,4.2)*uNarrativeBlend;
for(int i=0;i<16;i++){if(float(i)>=steps)break;vec4 f=field(rd*t);float density=f.x*(.48+.26*uTunnelDrive+.18*uGalaxyReveal),dust=f.y*mix(.70,1.45,uNarrativeDarkZone),ext=density*(.66+dust*1.25),alpha=1.-exp(-ext*stepSize*.78);vec3 gas=mix(c0,c1,clamp(f.w*.78+f.z*.18,0.,1.));gas=mix(gas,c2,clamp(f.z*.68+core*.22,0.,1.));float scatter=density*(.10+phase*1.55)*(1.-dust*.58);vec3 emission=gas*f.z*.30+vec3(.95,.90,.82)*f.z*f.z*.055;accum+=(emission+gas*scatter*.26)*trans*alpha;trans*=1.-alpha;if(trans<.055)break;t+=stepSize;}
float pocket=smoothstep(.62,.83,fbm3(vec3(screen*1.15,uTime*.0012)+vec3(3.,-2.,6.)))*mix(.15,.52,uNarrativeDarkZone);accum*=1.-pocket;accum*=forward;float r=length(rd.xy),light=uLivingLight;accum+=vec3(.75,.86,1.)*exp(-r*r*5.4)*light*.022+vec3(1.,.97,.91)*exp(-r*r*31.)*light*light*.20;float fetal=clamp(uHeartLightFade,0.,1.),pulse=clamp(uAudioHeartPulse,0.,1.);accum+=vec3(1.,.96,.90)*exp(-r*r*mix(38.,26.,pulse))*fetal*(.11+pulse*.16);accum*=uVisibility;accum=mix(accum,vec3(0.),uFinalFade*(1.-fetal*.9));gl_FragColor=vec4(accum,1.);}`;

export class NebulaBackdrop{
 constructor(){
  this.travel=0;this.avgDt=1/60;this.qualityClock=0;
  const mobile=/iPad|iPhone|Android/i.test(navigator.userAgent||'')||innerWidth<800;this.mobile=mobile;this.baseSteps=mobile?10:16;this.minSteps=mobile?8:12;
  this.geometry=new THREE.SphereGeometry(220,mobile?32:48,mobile?20:30);
  this.material=new THREE.ShaderMaterial({vertexShader,fragmentShader,side:THREE.BackSide,depthWrite:false,depthTest:false,transparent:false,uniforms:{uTime:{value:0},uTravel:{value:0},uVisibility:{value:.15},uTunnelDrive:{value:0},uLivingLight:{value:0},uGalaxyReveal:{value:0},uFinalFade:{value:0},uAudioHeartPulse:{value:0},uHeartLightFade:{value:0},uRaySteps:{value:this.baseSteps},uNarrativeBlend:{value:0},uNarrativeDarkZone:{value:.6},uNarrativeFilaments:{value:.3},uNarrativeCore:{value:new THREE.Vector2(0,0)},uNarrativeColor0:{value:new THREE.Color('#0d1b4b')},uNarrativeColor1:{value:new THREE.Color('#4b3f64')},uNarrativeColor2:{value:new THREE.Color('#b66d32')}}});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=-1000;
 }
 get visibility(){return this.material.uniforms.uVisibility.value||0;}
 get raySteps(){return this.material.uniforms.uRaySteps.value||0;}
 update(dt,state,features){
  this.travel+=Math.max(0,state.speed)*dt;this.avgDt=this.avgDt*.94+dt*.06;this.qualityClock+=dt;
  const u=this.material.uniforms;u.uTime.value+=dt;u.uTravel.value=this.travel;
  if(this.qualityClock>1){this.qualityClock=0;u.uRaySteps.value=this.avgDt>.027?this.minSteps:(this.avgDt>.021?Math.max(this.minSteps,this.baseSteps-2):this.baseSteps);}
  const tunnel=state.tunnelDrive||0,reveal=state.galaxyReveal||0,light=state.livingLight||0,nebula=state.nebulaPresence||0;
  u.uVisibility.value=Math.min(.24,.105+nebula*.055+tunnel*.025+reveal*.045+light*.015+(features.mid||0)*.006);u.uTunnelDrive.value=tunnel;u.uLivingLight.value=light;u.uGalaxyReveal.value=reveal;u.uFinalFade.value=state.finalFade||0;u.uAudioHeartPulse.value=state.audioHeartPulse||0;u.uHeartLightFade.value=state.heartLightFade||0;
 }
 dispose(){this.geometry.dispose();this.material.dispose();}
}
