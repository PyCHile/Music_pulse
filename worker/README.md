# URUX Journey API — Cloudflare Worker

Este Worker es la única capa autorizada para comunicarse con OpenRouter. GitHub Pages nunca recibe ni almacena `OPENROUTER_API_KEY`.

## Autenticación Cloudflare

Usar OAuth interactivo de Wrangler en la máquina de despliegue:

```bash
cd worker
npm install
npx wrangler login --use-keyring
npx wrangler whoami
```

`--use-keyring` mantiene las credenciales OAuth de Wrangler protegidas mediante el keychain del sistema operativo cuando la plataforma lo soporta.

## Registrar el secreto de OpenRouter

```bash
npx wrangler secret put OPENROUTER_API_KEY
```

Ingresar el valor únicamente en el prompt interactivo de Wrangler. No usar `vars`, argumentos CLI con el valor, archivos versionados ni código frontend.

## Despliegue

```bash
npm run deploy
```

Wrangler devolverá la URL HTTPS del Worker. Configurar esa URL una sola vez en el navegador de URUX:

```js
window.URUXJourney.configureBackendURL('https://<worker-host>')
```

Comprobar conexión:

```js
await window.URUXJourney.backendHealth()
```

El resultado esperado debe incluir `ok: true` y `openrouterConfigured: true`.

## Prueba end-to-end

1. Abrir URUX y configurar la URL del Worker.
2. Iniciar la experiencia.
3. Esperar el primer batch narrativo.
4. Verificar:

```js
window.URUXJourney.diagnostics
window.__MUSIC_PULSE_QA__.secureBackendConfigured
window.__MUSIC_PULSE_QA__.llmEncounterRendered
window.__MUSIC_PULSE_QA__.llmNebulaApplied
```

Cuando el circuito esté operativo, `llmEncounterRendered` y `llmNebulaApplied` pasan a `true` después de aceptar y consumir un batch.

## Frontera de seguridad

- CORS limitado al origen configurado.
- `OPENROUTER_API_KEY` existe solo como Secret binding de Cloudflare.
- Selección de modelos gratuitos y validación JSON ocurren en servidor.
- El frontend solo envía `{ stage }`.
- El Worker vuelve a validar el batch antes de retornarlo.
- Rate limiting protege el presupuesto de OpenRouter.
- Si el backend falla, Three.js continúa en modo procedural.
