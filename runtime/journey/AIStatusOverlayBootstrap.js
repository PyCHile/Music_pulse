import { AIStatusOverlay } from './AIStatusOverlay.js?v=20260813-3';
const overlay=new AIStatusOverlay(()=>window.URUXJourney?.diagnostics||{});
function tick(){overlay.update();requestAnimationFrame(tick);}requestAnimationFrame(tick);
