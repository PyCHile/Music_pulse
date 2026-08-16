import * as THREE from 'three';
import { VisualFamilyLock } from '../warp/VisualFamilyLock.js';
import { ContinuityGuard } from '../warp/ContinuityGuard.js';
import { WarpVariationEngine } from '../warp/WarpVariationEngine.js';
import { WarpContinuityDirector } from '../warp/WarpContinuityDirector.js';
import { OpticalFlowController } from '../warp/OpticalFlowController.js?v=20260812-15';
import { JourneyNarrativeDirector } from '../warp/JourneyNarrativeDirector.js?v=20260812-14';
import { WarpFieldManager } from '../warp/WarpFieldManagerV53.js?v=20260815-66';
import { CachedVolumetricNebulaPass } from '../warp/CachedVolumetricNebulaPassV53.js?v=20260815-66';
import { MusicPulseDirector } from '../audio/MusicPulseDirectorV66.js?v=20260815-66';
import { PhysicalEncounterRuntimeV66 } from '../journey/PhysicalEncounterRuntimeV66.js?v=20260815-66.3';
import { runtimeCapabilities } from '../capabilities/RuntimeCapabilityRegistry.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
export class InterstellarWarpScene{
 constructor(container){this.container=container;this.mobile=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(64,1,.1,260);this.camera.position.set(0,0,0);this.renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',alpha:false,stencil:false,depth:true});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.54;this.renderer.autoClear=false;this.renderer.setClearColor(0x000000,1);container.appendChild(this.renderer.domElement);runtimeCapabilities.attachRenderer(this.renderer);runtimeCapabilities.mark('postprocessing',true,{active:false,reason:'production-layer-scheduler'});runtimeCapabilities.mark('webgpu-compute',false,{reason:'single-renderer-production-path'});this.nebulaPass=new CachedVolumetricNebulaPass();const maxStars=this.mobile?420:900;this.warpField=new WarpFieldManager(maxStars,this.nebulaPass);this.scene.add(this.warpField.group);this.familyLock=new VisualFamilyLock();this.continuityGuard=new ContinuityGuard();this.variationEngine=new WarpVariationEngine();this.director=new WarpContinuityDirector(this.variationEngine,this.familyLock,this.continuityGuard);this.journey=new JourneyNarrativeDirector();this.musicDirector=new MusicPulseDirector();this.musicDirection=this.musicDirector.snapshot;this.scene.userData.uruxMusicDirection=this.musicDirection;this.scene.userData.uruxEncounterBudget={closeComet:0};this.physicalEncounters=new PhysicalEncounterRuntimeV66(this.scene,this.renderer);this.opticalFlow=new OpticalFlowController();this.state=this.director.state;this.narrative={stage:'DETACHMENT'};this.externalHeartPulse=0;this.heartLightFade=0;this.resize=this.resize.bind(this);addEventListener('resize',this.resize,{passive:true});this.resize();}
 pixelRatio(w,h){const budget=this.mobile?900000:2200000,base=Math.sqrt(budget/Math.max(1,w*h));return clamp(Math.min(devicePixelRatio||1,base),this.mobile?.55:.65,this.mobile?1:1.25);}
 resize(){const w=Math.max(1,this.container.clientWidth||innerWidth),h=Math.max(1,this.container.clientHeight||innerHeight);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(this.pixelRatio(w,h));this.renderer.setSize(w,h,false);this.nebulaPass.resize(w,h);}
 setExternalHeartPulse(p,f){this.externalHeartPulse=clamp(p||0,0,1);this.heartLightFade=clamp(f||0,0,1);}
 update(dt,features,musicalState,progress=0){
  const direction=this.musicDirector.update(features,musicalState,progress,dt),base=this.director.update(features,musicalState,dt);this.narrative=this.journey.update(dt,features,musicalState,progress);this.state=this.journey.apply(base,this.narrative);this.scene.userData.uruxMusicDirection=direction;
  const narrativeForward=clamp((this.state.speed||0)/Math.max(.001,base.speed||1),0,1),encounterRelief=clamp(this.scene.userData.uruxEncounterBudget?.closeComet||0,0,.75);
  this.state.speed=Math.max(0,direction.speedTarget*narrativeForward);
  this.state.warpIntensity=Math.max(0,(this.state.warpIntensity||0)*direction.warpScale);
  this.state.streakLength=Math.max(.12,(this.state.streakLength||.5)*direction.streakScale);
  this.state.starDensity=Math.max(.16,(this.state.starDensity||.6)*direction.starScale);
  this.state.bloom=Math.max(.025,(this.state.bloom||.2)*direction.bloomScale*(1-encounterRelief*.35));
  this.state.dustDensity=Math.max(.012,(this.state.dustDensity||.1)*(.28+direction.visualEnergy*.72));
  this.state.nebulaPresence=Math.max(0,(this.state.nebulaPresence||0)*direction.nebulaScale);
  this.state.nebulaDirectorScale=direction.nebulaScale*(1-encounterRelief*.48);
  this.state.visualBudget=direction.whiteoutBudget*(1-encounterRelief*.18);
  this.state.musicPulse=direction.beatPulse;this.state.musicVisualEnergy=direction.visualEnergy;this.state.musicMacroArc=direction.macroArc;this.state.musicSpeedTarget=direction.speedTarget;this.state.musicSection=direction.section;this.state.musicDirectionRevision=direction.revision;
  this.state.fov=mix(60,this.state.fov,.32+direction.visualEnergy*.68);
  this.musicDirection={...direction,encounterRelief,nebulaAppliedScale:this.state.nebulaDirectorScale,effectiveForwardSpeed:this.state.speed,tunnelDepth:this.state.tunnelDepth,streakLength:this.state.streakLength};this.scene.userData.uruxMusicDirection=this.musicDirection;
  this.physicalEncounters.update(dt,this.musicDirection);
  this.state.audioHeartPulse=this.externalHeartPulse;this.state.heartLightFade=this.heartLightFade;this.opticalFlow.update(dt,this.state,features);this.camera.fov+=(this.state.fov-this.camera.fov)*(1-Math.exp(-1.8*dt));this.camera.position.x+=(0-this.camera.position.x)*(1-Math.exp(-3*dt));this.camera.position.y+=(0-this.camera.position.y)*(1-Math.exp(-3*dt));this.camera.lookAt(0,0,-1);this.camera.rotation.z+=(0-this.camera.rotation.z)*(1-Math.exp(-3*dt));this.camera.updateProjectionMatrix();this.warpField.update(dt,this.state,features);const l=this.state.livingLight||0,g=this.state.galaxyReveal||0,e=this.externalHeartPulse*this.heartLightFade,fade=this.state.finalFade||0,target=(.48+direction.visualEnergy*.12+l*.018+g*.024+e*.018)*(1-fade*(1-this.heartLightFade)*.99);this.renderer.toneMappingExposure+=(target-this.renderer.toneMappingExposure)*(1-Math.exp(-1.35*dt));
 }
 render(){this.nebulaPass.renderCache(this.renderer,this.camera);this.renderer.setRenderTarget(null);this.renderer.setClearColor(0x000000,1);this.renderer.clear(true,true,true);this.nebulaPass.composite(this.renderer);this.renderer.clearDepth();this.renderer.render(this.scene,this.camera);}
 dispose(){removeEventListener('resize',this.resize);this.physicalEncounters?.dispose?.();this.warpField.dispose();this.nebulaPass.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
 get performanceStats(){return{pixelRatio:this.renderer.getPixelRatio(),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,musicDirection:this.musicDirection,cinematic:this.physicalEncounters?.stats||null,warp:this.warpField.stats};}
}
