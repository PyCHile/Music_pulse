import * as THREE from 'three';
import { VisualFamilyLock } from '../warp/VisualFamilyLock.js';
import { ContinuityGuard } from '../warp/ContinuityGuard.js';
import { WarpVariationEngine } from '../warp/WarpVariationEngine.js';
import { WarpContinuityDirector } from '../warp/WarpContinuityDirector.js';
import { OpticalFlowController } from '../warp/OpticalFlowController.js?v=20260812-15';
import { JourneyNarrativeDirector } from '../warp/JourneyNarrativeDirector.js?v=20260812-14';
import { WarpFieldManager } from '../warp/WarpFieldManagerV50.js?v=20260813-50';
import { AdaptiveQualityManager } from '../performance/AdaptiveQualityManager.js?v=20260813-47';
import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';

export class InterstellarWarpScene{
 constructor(container){
  this.container=container;this.mobile=true;this.scene=new THREE.Scene();this.scene.background=null;this.camera=new THREE.PerspectiveCamera(64,1,.1,260);this.camera.position.set(0,0,0);this.camera.lookAt(0,0,-1);
  this.renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',alpha:true,premultipliedAlpha:true,stencil:false,depth:true});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.68;this.renderer.setClearColor(0x000000,0);this.container.appendChild(this.renderer.domElement);runtimeCapabilities.attachRenderer(this.renderer);
  runtimeCapabilities.mark('postprocessing',true,{version:'6.39.4',active:false,reason:'mobile-cinematic-render-path'});runtimeCapabilities.mark('webgpu-compute',false,{reason:'mobile-cinematic-render-path'});
  const maxStars=420;this.warpField=new WarpFieldManager(maxStars);this.scene.add(this.warpField.group);
  const nebula=this.warpField.nebula;if(nebula){nebula.baseSteps=8;nebula.minSteps=6;nebula.baseShadowSteps=1;if(nebula.material?.uniforms?.uRaySteps)nebula.material.uniforms.uRaySteps.value=8;if(nebula.material?.uniforms?.uShadowSteps)nebula.material.uniforms.uShadowSteps.value=1;}
  this.familyLock=new VisualFamilyLock();this.continuityGuard=new ContinuityGuard();this.variationEngine=new WarpVariationEngine();this.director=new WarpContinuityDirector(this.variationEngine,this.familyLock,this.continuityGuard);this.journey=new JourneyNarrativeDirector();this.narrative={stage:'DETACHMENT',heartbeat:0,livingLight:0,galaxyReveal:0,idealized:0,lifeReview:0,boundary:0,returnForce:0,returnFlash:0,finalFade:0,detachment:0,hookPresence:0,turnX:0,turnY:0};this.opticalFlow=new OpticalFlowController();this.quality=new AdaptiveQualityManager(this.renderer,null,maxStars);this.state=this.director.state;this.externalHeartPulse=0;this.heartLightFade=0;this.resize=this.resize.bind(this);addEventListener('resize',this.resize,{passive:true});this.resize();
 }
 setExternalHeartPulse(pulse,fade){this.externalHeartPulse=Math.max(0,Math.min(1,pulse||0));this.heartLightFade=Math.max(0,Math.min(1,fade||0));}
 resize(){const w=Math.max(1,this.container.clientWidth||innerWidth),h=Math.max(1,this.container.clientHeight||innerHeight);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 update(dt,features,musicalState,progress=0){const base=this.director.update(features,musicalState,dt);this.narrative=this.journey.update(dt,features,musicalState,progress);this.state=this.journey.apply(base,this.narrative);this.state.audioHeartPulse=this.externalHeartPulse;this.state.heartLightFade=this.heartLightFade;this.opticalFlow.update(dt,this.state,features);this.camera.fov+=(this.state.fov-this.camera.fov)*(1-Math.exp(-1.8*dt));this.camera.position.x+=(0-this.camera.position.x)*(1-Math.exp(-3*dt));this.camera.position.y+=(0-this.camera.position.y)*(1-Math.exp(-3*dt));this.camera.lookAt(0,0,-1);this.camera.rotation.z+=(0-this.camera.rotation.z)*(1-Math.exp(-3*dt));this.camera.updateProjectionMatrix();this.warpField.update(dt,this.state,features,{x:0,y:0,bank:0});const heart=this.state.heartPulse||0,living=this.state.livingLight||0,reveal=this.state.galaxyReveal||0,external=this.externalHeartPulse*this.heartLightFade,finalFade=this.state.finalFade||0,target=(.64+this.state.warpIntensity*.028+heart*.010+living*.025+reveal*.035+external*.025)*(1-finalFade*(1-this.heartLightFade)*.99);this.renderer.toneMappingExposure+=(target-this.renderer.toneMappingExposure)*(1-Math.exp(-1.5*dt));this.quality.update(dt,this.warpField.starTunnel);}
 render(){this.renderer.setClearColor(0x000000,0);this.renderer.render(this.scene,this.camera);}
 dispose(){removeEventListener('resize',this.resize);this.warpField.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
