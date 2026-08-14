const critical=['./scene/InterstellarWarpSceneV53.js?v=20260813-53','./warp/WarpFieldManagerV53.js?v=20260813-53','./warp/CachedVolumetricNebulaPassV53.js?v=20260813-53','./warp/DeepSpaceSectorSystemV53.js?v=20260813-53','./audio/AudioEngineV53.js?v=20260813-53','./audio/AudioReactiveEngineV51.js?v=20260813-51'];
await Promise.allSettled(critical.map(path=>fetch(new URL(path,import.meta.url),{cache:'reload'})));
await import('./mainCoreV53.js?v=20260813-53');
