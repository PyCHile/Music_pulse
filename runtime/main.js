const critical=['./scene/InterstellarWarpSceneV53.js?v=20260814-58','./warp/WarpFieldManagerV53.js?v=20260814-61','./warp/CachedVolumetricNebulaPassV53.js?v=20260813-53','./warp/VolumetricNebulaRaymarcherV53.js?v=20260813-53','./warp/VolumetricNebulaRaymarcherV65.js?v=20260814-65','./warp/DeepSpaceSectorSystemV53.js?v=20260813-53','./warp/CloudNebulaVolumeV59.js?v=20260814-61','./warp/CloudNebulaVolumeV65.js?v=20260814-65','./warp/GalacticWispSystemV53.js?v=20260813-53','./journey/CinematicSelectorV51.js?v=20260813-51','./journey/CinematicEncounterSystemV65.js?v=20260814-65','./journey/CinematicEncounterSystemV59Route.js?v=20260814-64','./journey/CinematicEncounterSystemV59.js?v=20260814-64','./journey/CinematicEncounterSystemV55.js?v=20260814-55','./journey/CinematicEncounterSystemV53.js?v=20260813-53','./journey/MobileCinematicEncounterSystemV50.js?v=20260813-50','./journey/MobileCinematicEncounterSystem.js?v=20260813-49','./assets/MobileAstronomicalTexturePool.js?v=20260813-50','./particles/ThreeNebulaParticleFXV53.js?v=20260813-53','./audio/AudioEngineV53.js?v=20260813-53','./audio/AudioReactiveEngineV51.js?v=20260813-51','./journey/SecureURUXJourneyAgent.js?v=20260813-10','./journey/URUXBackendClient.js?v=20260813-10','./journey/NebulaDirectiveBridge.js?v=20260812-1'];
await Promise.allSettled(critical.map(path=>fetch(new URL(path,import.meta.url),{cache:'reload'})));
window.__URUX_MODULE_WARMUP__=Promise.allSettled([
 import('./journey/CinematicSelectorV51.js?v=20260813-51'),
 import('./journey/CinematicEncounterSystemV65.js?v=20260814-65'),
 import('./journey/SecureURUXJourneyAgent.js?v=20260813-10'),
 import('./journey/NebulaDirectiveBridge.js?v=20260812-1')
]);
await import('./mainCoreV53.js?v=20260814-65');
