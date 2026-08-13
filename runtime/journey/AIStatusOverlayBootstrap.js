import { AIStatusOverlay } from './AIStatusOverlay.js?v=20260813-49';
const get=()=>window.URUXJourney?.diagnostics||{runtimeInitializing:true,runtimeVersion:(window.__URUX_BOOT__||{}).version||'—'};
const overlay=new AIStatusOverlay(get),base=overlay.update.bind(overlay);
overlay.update=()=>{base();if(!overlay.expanded){const v=String(get().runtimeVersion||'—');overlay.label.textContent=`${overlay.label.textContent.split(' · v')[0]} · v${v.split('.').pop()}`;}};
overlay.update();setInterval(()=>overlay.update(),800);window.__URUX_AI_OVERLAY__=overlay;
