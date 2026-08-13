import { AIStatusOverlay } from './AIStatusOverlay.js?v=20260813-47';
const overlay=new AIStatusOverlay(()=>{
 const boot=window.__URUX_BOOT__||{};
 return window.URUXJourney?.diagnostics||{runtimeInitializing:true,startState:boot.interactionReady?'waiting-for-enter':'bootstrapping',runtimeVersion:boot.version||'—',runtimeBuild:boot.build||'—',runtimeReleasedAt:boot.releasedAt||null,cacheCleared:Boolean(boot.cacheCleared),serviceWorkersCleared:Boolean(boot.serviceWorkersCleared),runtimeError:boot.runtimeError||boot.moduleError||null};
});
function tick(){overlay.update();requestAnimationFrame(tick);}requestAnimationFrame(tick);
window.__URUX_AI_OVERLAY__=overlay;
