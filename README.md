# URUX

Experiencia audiovisual de viaje interestelar continuo. La música controla velocidad, densidad, streaks, profundidad, FOV y energía visual, mientras el punto focal permanece matemáticamente centrado.

## Arquitectura activa

- `index.html` + `runtime/`: aplicación publicada directamente por GitHub Pages.
- `runtime/spacekit/SpaceKitAstronomicalLayer.js`: capa astronómica activa basada literalmente en SpaceKit.js para cielo, estrellas y cuerpos planetarios.
- `runtime/thirdparty/`: ports activos de Celestia, TrueColorTools y webgpu-galaxy utilizados por el campo profundo.
- `runtime/warp/DeepSpaceSectorSystem.js`: sectores galácticos/nebulosos atravesables.
- `runtime/warp/StarTunnelSystem.js`: viaje radial con punto focal fijo.
- `src/`: implementación React + TypeScript usada para desarrollo, typecheck, build y QA del núcleo warp.
- `tests/unit/` y `tests/e2e/`: invariantes del vuelo, audio, continuidad visual y SpaceKit.

## Regla de continuidad

La escena no cambia a paneles, grids ni composiciones abstractas. El centro de fuga permanece en `(0,0)` y los objetos astronómicos aparecen desde ese punto, crecen por perspectiva y solo se desplazan lateralmente al acercarse para producir la sensación de sobrevuelo.

## Limpieza de código

Los sistemas visuales sustituidos se eliminan físicamente del repositorio. El workflow de QA bloquea la reintroducción de módulos deprecados, assets huérfanos y dependencias no utilizadas identificadas durante la evolución de URUX.

## Desarrollo

```bash
npm install
npm run dev
```

Abrir `/source/` para la aplicación React de desarrollo.

## QA

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

GitHub Actions repite estas validaciones, audita la estructura del repositorio y rechaza placeholders y archivos deprecados.

## GitHub Pages

La versión publicada se ejecuta desde la raíz del repositorio y utiliza `music.mp3`, `light-theme.mp3` y `fetal-heartbeat.mp3` como arquitectura de audio activa.
