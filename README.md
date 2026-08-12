# URUX Interestelar — Music Pulse

Experiencia audiovisual de viaje interestelar continuo. La música controla velocidad, densidad, streaks, profundidad, FOV y energía visual, pero la composición queda bloqueada permanentemente en la familia `INTERSTELLAR_WARP`.

## Principio de continuidad

La escena nunca cambia a data grids, paneles, cajas flotantes o composiciones abstractas. El centro de fuga, el flujo radial y el movimiento hacia adelante se mantienen durante toda la reproducción.

## Arquitectura

- `runtime/`: versión estática que GitHub Pages ejecuta directamente desde `index.html`.
- `src/`: fuente modular React + TypeScript + React Three Fiber para desarrollo y QA.
- `src/audio/`: Web Audio API, FFT, energía, transientes y estados musicales.
- `src/warp/`: `VisualFamilyLock`, `ContinuityGuard`, `WarpVariationEngine`, `WarpContinuityDirector`, `StarTunnelSystem`, optical flow y streak control.
- `src/shaders/`: shaders GLSL de estrellas y streaks.
- `tests/unit/`: pruebas de invariantes del viaje warp y análisis musical.
- `tests/e2e/`: smoke test de navegador con Playwright.
- `.github/workflows/qa.yml`: gate QA automático en cada push/PR.

## Desarrollo

```bash
npm install
npm run dev
```

Abrir `/source/` para la versión de desarrollo.

## QA

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

El workflow de GitHub Actions repite estas validaciones y además audita la estructura física del repositorio y rechaza placeholders en componentes críticos.

## GitHub Pages

La raíz del repositorio mantiene una versión modular estática en `runtime/`, por lo que el sitio publicado no depende del bundle antiguo generado anteriormente. `music.mp3` permanece como audio principal.
