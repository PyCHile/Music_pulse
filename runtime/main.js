import { AudioEngine } from './audio/AudioEngine.js?v=20260813-47';
import { AudioReactiveEngine, DEFAULT_FEATURES } from './audio/AudioReactiveEngine.js';
import { MusicalStateAnalyzer } from './audio/MusicalStateAnalyzer.js';

const app=document.getElementById('app'),spacekitHost=document.getElementById('spacekitLayer'),startGate=document.getElementById('startGate'),enterBtn=document.getElementById('enterBtn'),controls=document.getElementById('controls'),pauseBtn=document.getElementById('pauseBtn'),fullBtn=document.getElementById('fullBtn'),status=document.getElementById('status');
const audio=new AudioEngine('./music.mp3','./light-theme.mp3','./fetal-heartbeat.mp3'),audioReactive=new AudioReactiveEngine(audio),musical=new MusicalStateAnalyzer();

let started=false,starting=false,runtimeReady=false,runtimeInitPromise=null,secondaryInitializing=false,renderLoopStarted=false,last=performance.now(),nextFrameAt=0,lastAudioSampleAt=0,hideTimer=0,features={...DEFAULT_FEATURES},musicalState={phase:'CALM',intensity:0,trend:0,duration:0},journeySnapshot=null,lastNebulaDirective=null;
let scene=null,spacekit=null,cinematicEncounters=null,journeyAgent=null,nebulaBridge=null,scientificAstronomy=null,runtimeCapabilities=null,configureURUXBackendURL=null,clearURUXBackendURL=null;
const mobile=/iPad|iPhone|iPod|Android/i.test(navigator.userAgent||'')||innerWidth<800;
const frameInterval=navigator.webdriver?50:(mobile?1000/30:0);
const audioSampleInterval=mobile?1000/15:0;

const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
const boot=()=>window.__URUX_BOOT__||{};
const setPhase=phase=>{boot().runtimePhase=phase;};
function baseDiagnostics(){const b=boot();return{runtimeInitializing:!runtimeReady||secondaryInitializing,startState:starting?'visual-initializing':(started?(runtimeReady?(secondaryInitializing?'ai-initializing':'visual-ready'):'audio-ready'):'waiting-for-enter'),runtimePhase:b.runtimePhase||'bootstrap',backendConfigured:Boolean(journeyAgent?.diagnostics?.backendConfigured),backendStatus:journeyAgent?.diagnostics?.backendStatus??'—',llmActive:false,runtimeVersion:b.version||'—',runtimeBuild:b.build||'—',runtimeReleasedAt:b.releasedAt||null,cacheCleared:Boolean(b.cacheCleared),serviceWorkersCleared:Boolean(b.serviceWorkersCleared),bootStartedAt:b.startedAt||null,runtimeError:b.runtimeError||null,mobilePerformanceProfile:mobile,frameTargetHz:frameInterval?Math.round(1000/frameInterval):0};}
function fullDiagnostics(){if(!runtimeReady||!journeyAgent||!scene||!cinematicEncounters||!nebulaBridge||!runtimeCapabilities)return baseDiagnostics();const b=boot();return{...journeyAgent.diagnostics,runtimeInitializing:false,runtimePhase:b.runtimePhase||'ready',llmActive:Boolean(journeyAgent.diagnostics.backendConfigured&&journeyAgent.diagnostics.acceptedBatches>0),cinematic:cinematicEncounters.stats,nebulaDirective:nebulaBridge.stats,nebulaRaySteps:scene.warpField?.nebula?.raySteps||0,nebulaLightSteps:scene.warpField?.nebula?.lightSteps||0,scientificAstronomy:scientificAstronomy?.snapshot?.()||null,capabilities:runtimeCapabilities.snapshot(),allowedAgentCapabilities:runtimeCapabilities.allowedForAgent(),canonicalLegacyStage:scene.state?.journeyStage||null,runtimeVersion:b.version||'—',runtimeBuild:b.build||'—',runtimeReleasedAt:b.releasedAt||null,cacheCleared:Boolean(b.cacheCleared),serviceWorkersCleared:Boolean(b.serviceWorkersCleared),bootStartedAt:b.startedAt||null,mobilePerformanceProfile:mobile,frameTargetHz:frameInterval?Math.round(1000/frameInterval):0};}

window.URUXJourney={
 configureBackendURL(url){if(configureURUXBackendURL)return configureURUXBackendURL(url);localStorage.setItem('urux_backend_url',String(url||''));return String(url||'');},
 clearBackendURL(){if(clearURUXBackendURL)return clearURUXBackendURL();localStorage.removeItem('urux_backend_url');},
 async backendHealth(){if(journeyAgent?.backend)return journeyAgent.backend.health();return{ok:false,status:secondaryInitializing?'ai_initializing':'runtime_initializing'};},
 get diagnostics(){return fullDiagnostics();},
 get stage(){return journeySnapshot?.stage?.id||journeyAgent?.diagnostics?.stage||'DESPRENDIMIENTO';}
};

function showControls(){if(!started||!runtimeReady)return;controls.classList.remove('dim');clearTimeout(hideTimer);hideTimer=setTimeout(()=>controls.classList.add('dim'),2600);}
['pointerdown','pointermove','touchstart'].forEach(evt=>addEventListener(evt,showControls,{passive:true}));
addEventListener('resize',()=>spacekit?.resize?.(),{passive:true});

async function initializeSpaceKit(SpaceKitAstronomicalLayer){if(mobile||spacekit||!SpaceKitAstronomicalLayer)return spacekit;setPhase('spacekit');await nextPaint();try{spacekit=new SpaceKitAstronomicalLayer(spacekitHost);setPhase('ready');return spacekit;}catch(error){console.warn('URUX SpaceKit deferred initialization failed',error);boot().spaceKitError=String(error);setPhase('ready');return null;}}

async function initializeSecondarySystems(){
 if(secondaryInitializing||journeyAgent)return;
 secondaryInitializing=true;setPhase('ai-modules');
 try{
  await nextPaint();
  const agentPromise=import('./journey/SecureURUXJourneyAgent.js?v=20260813-10');
  const encounterPromise=import('./journey/CinematicEncounterSystemV42.js?v=20260813-47');
  const nebulaPromise=import('./journey/NebulaDirectiveBridge.js?v=20260812-1');
  const capabilityPromise=import('./capabilities/RuntimeCapabilityRegistry.js?v=20260813-42');
  const sciencePromise=mobile?Promise.resolve(null):import('./astronomy/ScientificAstronomyRuntime.js?v=20260813-43');
  const spacekitPromise=mobile?Promise.resolve(null):import('./spacekit/SpaceKitAstronomicalLayer.js?v=20260813-46');
  const [agentModule,encounterModule,nebulaModule,capabilityModule,scienceModule,spacekitModule]=await Promise.all([agentPromise,encounterPromise,nebulaPromise,capabilityPromise,sciencePromise,spacekitPromise]);
  configureURUXBackendURL=agentModule.configureURUXBackendURL;clearURUXBackendURL=agentModule.clearURUXBackendURL;scientificAstronomy=scienceModule?.scientificAstronomy||null;runtimeCapabilities=capabilityModule.runtimeCapabilities;
  setPhase('ai-runtime');await nextPaint();
  cinematicEncounters=new encounterModule.CinematicEncounterSystem(scene.scene,scene.renderer);
  journeyAgent=new agentModule.URUXJourneyAgent(scene.scene,(encounter,meta)=>cinematicEncounters.spawnEncounter(encounter,meta));
  nebulaBridge=new nebulaModule.NebulaDirectiveBridge();
  secondaryInitializing=false;boot().aiRuntimeReady=true;setPhase('ai-ready');
  void journeyAgent.start();
  if(scientificAstronomy)void scientificAstronomy.readyPromise;
  if(!mobile&&spacekitModule)setTimeout(()=>void initializeSpaceKit(spacekitModule.SpaceKitAstronomicalLayer),1800);
 }catch(error){secondaryInitializing=false;boot().secondaryError=String(error);setPhase('visual-ready');console.warn('[URUX] Secondary AI runtime unavailable; visual journey remains active.',error);}
}

function scheduleSecondarySystems(){
 const launch=()=>void initializeSecondarySystems();
 if(!mobile){setTimeout(launch,80);return;}
 /* Keep the first seconds of iOS playback free of module parse/compile spikes. */
 if('requestIdleCallback'in window)window.requestIdleCallback(launch,{timeout:9000});
 else setTimeout(launch,7000);
}

async function initializeRuntime(){
 if(runtimeInitPromise)return runtimeInitPromise;
 runtimeInitPromise=(async()=>{
  setPhase('visual-module');status.textContent='Preparando motor visual…';await nextPaint();
  const sceneModule=await import('./scene/InterstellarWarpScene.js?v=20260813-47');
  setPhase('visual-scene');status.textContent='Inicializando viaje…';await nextPaint();
  scene=new sceneModule.InterstellarWarpScene(app);
  runtimeReady=true;boot().runtimeReady=true;setPhase('visual-ready');status.textContent='';
  startRenderLoop();
  scheduleSecondarySystems();
  return true;
 })().catch(error=>{runtimeInitPromise=null;runtimeReady=false;boot().runtimeError=String(error);setPhase('visual-error');throw error;});
 return runtimeInitPromise;
}

enterBtn.addEventListener('click',async()=>{
 if(starting||started)return;
 starting=true;enterBtn.disabled=true;enterBtn.textContent='Iniciando…';status.textContent='Activando audio…';boot().enterAccepted=true;setPhase('audio-unlock');
 try{
  await audio.play();
  started=true;boot().audioUnlocked=true;
  startGate.classList.add('hidden');controls.hidden=false;setPhase('entered');
  await nextPaint();
  await initializeRuntime();
  starting=false;enterBtn.textContent='Entrar';showControls();
 }catch(err){console.error('[URUX] startup failed',err);started=false;starting=false;runtimeReady=false;startGate.classList.remove('hidden');controls.hidden=true;enterBtn.disabled=false;enterBtn.textContent='Tocar para iniciar';status.textContent='No fue posible iniciar. Toca nuevamente.';boot().runtimeError=String(err);setPhase('startup-error');}
});
boot().interactionReady=true;setPhase('waiting-for-enter');

pauseBtn.addEventListener('click',async()=>{try{const playing=await audio.toggle();pauseBtn.textContent=playing?'Ⅱ':'▶';showControls();}catch(err){console.error(err);}});
fullBtn.addEventListener('click',async()=>{try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else if(document.exitFullscreen)await document.exitFullscreen();}catch(err){console.warn('Fullscreen no disponible',err);}showControls();});

function syncNarrativeAudio(){const s=scene?.state;if(!started||!s)return;if(audio.mixStage==='MAIN'&&(s.livingLight||0)>.15)audio.transitionToLight(24).catch(err=>console.warn('Light-theme transition unavailable',err));if((audio.mixStage==='LIGHT'||audio.mixStage==='MAIN')&&((s.boundary||0)>.075||s.journeyStage==='BOUNDARY'))audio.transitionToFetal(22).catch(err=>console.warn('Fetal-theme transition unavailable',err));if(audio.mixStage==='FETAL'&&audio.getFetalElapsed()>=60&&s.journeyStage==='RETURN'&&(s.finalFade||0)>.68)audio.fadeToSilence(10);}
function syncNebulaDirective(){const directive=journeyAgent?.planner?.nebulaUpdate||null;if(directive&&directive!==lastNebulaDirective){nebulaBridge?.setDirective?.(directive);lastNebulaDirective=directive;}}
function frameDue(now){if(!frameInterval)return true;if(!nextFrameAt){nextFrameAt=now;return true;}if(now<nextFrameAt-1)return false;nextFrameAt=now+frameInterval;return true;}
function loop(now){
 requestAnimationFrame(loop);
 if(!runtimeReady||!scene||!frameDue(now))return;
 const dt=Math.min(.05,Math.max(.001,(now-last)/1000));last=now;
 if(started&&!audio.paused&&!audio.ended){
  if(!audioSampleInterval||now-lastAudioSampleAt>=audioSampleInterval){const sampleDt=lastAudioSampleAt?Math.min(.12,(now-lastAudioSampleAt)/1000):dt;lastAudioSampleAt=now;features=audioReactive.sample(sampleDt);musicalState=musical.update(features,sampleDt);}
 }else if(!started){features={...DEFAULT_FEATURES,energy:.06,bass:.04,high:.04,calmness:.94};musicalState={phase:'CALM',intensity:.06,trend:0,duration:0};}else if(audio.ended){features={...DEFAULT_FEATURES,energy:.025,bass:.012,high:.012,calmness:.98};musicalState={phase:'RECOVERING',intensity:.025,trend:-.02,duration:0};}
 const fetalPulse=audio.getFetalPulse(),heartLightFade=audio.getFetalLightFade();scene.setExternalHeartPulse(fetalPulse,heartLightFade);const progress=audio.duration>0?Math.max(0,Math.min(1,audio.currentTime/audio.duration)):0;spacekit?.update?.(progress,dt);scene.update(dt,features,musicalState,progress);
 if(started&&!audio.paused&&journeyAgent&&cinematicEncounters&&nebulaBridge){journeyAgent.synchronizeWithLegacyStage(scene.state?.journeyStage||scene.narrative?.stage||'DETACHMENT');journeySnapshot=journeyAgent.update(dt);syncNebulaDirective();const semanticStage=journeySnapshot?.stage?.id||journeyAgent.diagnostics.stage;cinematicEncounters.setStage(semanticStage);cinematicEncounters.update(dt);nebulaBridge.update(dt,scene.warpField);}
 syncNarrativeAudio();scene.render();
}
function startRenderLoop(){if(renderLoopStarted)return;renderLoopStarted=true;last=performance.now();nextFrameAt=0;lastAudioSampleAt=0;requestAnimationFrame(loop);}

window.__MUSIC_PULSE_QA__={
 get started(){return started;},get runtimeReady(){return runtimeReady;},get runtimePhase(){return boot().runtimePhase||null;},get phase(){return musicalState.phase;},get warpState(){return scene?.state||null;},get family(){return scene?.state?.family||null;},get pulse(){return scene?.warpField?.starTunnel?.pulseLevel||0;},get heartbeat(){return scene?.state?.heartPulse||0;},get heartStopped(){return Boolean(scene?.state?.heartStopped);},get fetalPulse(){return audio.getFetalPulse();},get fetalElapsed(){return audio.getFetalElapsed();},get heartLightFade(){return audio.getFetalLightFade();},get sleepBedActive(){return Boolean(audio.sleepBedStarted);},get journeyStage(){return scene?.state?.journeyStage||scene?.narrative?.stage||null;},get semanticJourneyStage(){return journeySnapshot?.stage?.id||journeyAgent?.diagnostics?.stage||'DESPRENDIMIENTO';},get journeySynchronized(){return Boolean(journeyAgent?.diagnostics?.synchronized&&journeyAgent.diagnostics.legacyStage===(scene?.state?.journeyStage||scene?.narrative?.stage));},get journeyDiagnostics(){return journeyAgent?.diagnostics||baseDiagnostics();},get secureBackendConfigured(){return Boolean(journeyAgent?.diagnostics?.backendConfigured);},get secureBackendStatus(){return journeyAgent?.diagnostics?.backendStatus??'—';},get llmActive(){return Boolean(journeyAgent?.diagnostics?.backendConfigured&&journeyAgent?.diagnostics?.acceptedBatches>0);},get runtimeVersion(){return boot().version||null;},get cacheCleared(){return Boolean(boot().cacheCleared);},get nebulaRaySteps(){return scene?.warpField?.nebula?.raySteps||0;},get nebulaLightSteps(){return scene?.warpField?.nebula?.lightSteps||0;},get volumetricSelfShadowing(){return Boolean(runtimeCapabilities?.get?.('volumetric-raymarch')?.selfShadowing);},get threeNebulaReady(){return Boolean(runtimeCapabilities?.has?.('three-nebula'));},get postprocessingReady(){return Boolean(runtimeCapabilities?.has?.('postprocessing'));},get ktx2Ready(){return Boolean(runtimeCapabilities?.has?.('ktx2'));},get webgpuComputeReady(){return Boolean(runtimeCapabilities?.has?.('webgpu-compute'));},get scientificAstronomy(){return scientificAstronomy?.snapshot?.()||null;},get celestiaLiteralReady(){return Boolean(runtimeCapabilities?.has?.('celestia-literal'));},get allowedAgentCapabilities(){return runtimeCapabilities?.allowedForAgent?.()||[];},get runtimeCapabilities(){return runtimeCapabilities?.snapshot?.()||{};},get cinematicEncounterStats(){return cinematicEncounters?.stats||{};},get llmEncounterRendered(){return Boolean((cinematicEncounters?.stats?.llmSpawned||0)>0&&(journeyAgent?.diagnostics?.dispatched||0)>0);},get nebulaDirectiveStats(){return nebulaBridge?.stats||{};},get llmNebulaApplied(){return Boolean(nebulaBridge?.stats?.active&&scene?.warpField?.nebula?.material?.uniforms?.uNarrativeBlend?.value>0);},get livingLight(){return scene?.state?.livingLight||0;},get galaxyReveal(){return scene?.state?.galaxyReveal||0;},get nebulaVisibility(){return scene?.warpField?.nebula?.visibility||0;},get deepSpacePresence(){return scene?.warpField?.deepSpace?.maxPresence||0;},get activeSpaceSectorCount(){return scene?.warpField?.deepSpace?.activeSectorCount||0;},get deepSpaceCloudReady(){return Boolean(scene?.warpField?.deepSpace?.cloudReady);},get physicalNebulaPaletteReady(){return Boolean(scene?.warpField?.deepSpace?.physicalPaletteReady);},get spaceKitReady(){return Boolean(spacekit?.ready);},get spaceKitLiteral(){return Boolean(spacekit?.usesLiteralSpaceKit);},get spaceKitActivePlanetCount(){return spacekit?.activePlanetCount||0;},get spaceKitClosestPlanetZ(){return spacekit?.closestPlanetZ??-999999;},get spaceKitFocalOriginError(){return spacekit?.focalOriginError||0;},get spaceKitLateralOffset(){return spacekit?.lateralOffset||0;},get spaceKitFlybyProgress(){return spacekit?.flybyProgress||0;},get galacticWispOpacity(){return scene?.warpField?.galacticWisps?.maxOpacity||0;},get hookPresence(){return scene?.state?.hookPresence||0;},get lifeReview(){return scene?.state?.lifeReview||0;},get boundary(){return scene?.state?.boundary||0;},get returnForce(){return scene?.state?.returnForce||0;},get finalFade(){return scene?.state?.finalFade||0;},get audioStage(){return audio.mixStage;},get audioMix(){return audio.getMixSnapshot();},get audioTime(){return audio.currentTime;},get duration(){return audio.duration;},get deprecatedVisualSystemsRemoved(){return true;},get performanceProfile(){return mobile?'mobile-audio-stable':'desktop-full';},get activeStars(){return scene?.warpField?.starTunnel?.activeCount||0;},seek(time){const target=Math.max(0,Math.min(Number(time)||0,audio.duration||Number(time)||0));audio.audio.currentTime=target;return target;}
};
