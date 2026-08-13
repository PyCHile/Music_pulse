import { Container, getContainer } from '@cloudflare/containers';
import uruxWorker from './index.js';

export class CelestiaContainer extends Container {
  defaultPort = 8080;
  requiredPorts = [8080];
  sleepAfter = '30m';
  enableInternet = false;
  pingEndpoint = 'localhost/ready';

  onStart() {
    console.log('[URUX] Celestia native sidecar started');
  }

  onStop({ exitCode, reason } = {}) {
    console.log('[URUX] Celestia native sidecar stopped', { exitCode, reason });
  }

  onError(error) {
    console.error('[URUX] Celestia native sidecar error', error);
    throw error;
  }
}

const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || 'https://pychile.github.io').split(',').map(x => x.trim());
  if (!allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
};

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  }
});

function celestiaStub(env) {
  if (!env.CELESTIA_CONTAINER) return null;
  return getContainer(env.CELESTIA_CONTAINER, 'urux-celestia-native-v1');
}

async function celestiaFetch(env, path, timeoutMs = 12000) {
  const stub = celestiaStub(env);
  if (!stub) throw new Error('celestia_container_binding_missing');
  const request = new Request(`http://celestia${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('celestia_sidecar_timeout')), timeoutMs);
  });
  try {
    return await Promise.race([stub.fetch(request), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function proxyCelestia(request, env, sidecarPath, headers) {
  try {
    const response = await celestiaFetch(env, sidecarPath);
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-URUX-Celestia-Sidecar': 'native',
        ...headers
      }
    });
  } catch (error) {
    return json({
      ok: false,
      connected: false,
      native: true,
      error: 'celestia_sidecar_unavailable',
      detail: String(error?.message || error)
    }, 503, headers);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = corsHeaders(request, env);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/v1/celestia/')) {
      return Object.keys(headers).length ? new Response(null, { status: 204, headers }) : new Response(null, { status: 403 });
    }

    if (url.pathname === '/diagnostics/celestia' && request.method === 'GET') {
      const proxied = await proxyCelestia(request, env, '/v1/capabilities', headers);
      if (!proxied.ok) return proxied;
      const payload = await proxied.json().catch(() => ({}));
      return json({
        ...payload,
        connected: true,
        transport: 'cloudflare-container',
        renderLoop: false,
        binding: 'CELESTIA_CONTAINER'
      }, 200, headers);
    }

    if (url.pathname === '/v1/celestia/content' && request.method === 'GET') {
      return proxyCelestia(request, env, '/v1/content', headers);
    }

    if (url.pathname === '/v1/celestia/astro' && request.method === 'GET') {
      return proxyCelestia(request, env, `/v1/astro${url.search}`, headers);
    }

    if (url.pathname === '/v1/celestia/orbit' && request.method === 'GET') {
      return proxyCelestia(request, env, `/v1/orbit${url.search}`, headers);
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      const baseResponse = await uruxWorker.fetch(request, env, ctx);
      const base = await baseResponse.json().catch(() => ({}));
      return json({
        ...base,
        celestia: {
          configured: Boolean(env.CELESTIA_CONTAINER),
          nativeSidecar: true,
          transport: 'cloudflare-container',
          diagnostics: '/diagnostics/celestia'
        }
      }, baseResponse.status, headers);
    }

    // Pre-warm Celestia only when the narrative agent asks for a new batch.
    // This is never called from the Three.js render loop and never blocks the
    // OpenRouter request: the sidecar health check runs as background work.
    if (url.pathname === '/v1/encounters' && request.method === 'POST' && env.CELESTIA_CONTAINER) {
      ctx?.waitUntil?.(
        celestiaFetch(env, '/ready', 12000)
          .then(r => r.arrayBuffer())
          .catch(error => console.warn('[URUX] Celestia prewarm failed', String(error?.message || error)))
      );
    }

    return uruxWorker.fetch(request, env, ctx);
  }
};
