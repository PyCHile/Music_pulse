const critical=['./scene/InterstellarWarpScene.js?v=20260813-46','./scene/MobileInterstellarWarpScene.js?v=20260813-47','./journey/CinematicEncounterSystemV42.js?v=20260813-47','./spacekit/SpaceKitAstronomicalLayer.js?v=20260813-46','./audio/AudioReactiveEngine.js'];
await Promise.allSettled(critical.map(path=>fetch(new URL(path,import.meta.url),{cache:'reload'})));
await import('./mainCoreV50.js?v=20260813-51');
