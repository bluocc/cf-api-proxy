import { applySigner } from './signers/index.js';

export async function handleProxy(request) {
  try {
    const config = await request.json();

    if (config.signer && config.signer.type) {
      await applySigner(config);
    }

    const { url, method, body } = config;
    let { headers, queryParams } = config;

    let targetUrl = config.url || url;

    if (queryParams && queryParams.length > 0) {
      const u = new URL(targetUrl);
      u.search = '';
      for (const p of queryParams) {
        if (p.key) u.searchParams.append(p.key, p.value);
      }
      targetUrl = u.toString();
    }

    const fetchOpts = {
      method: method || 'GET',
      headers: { ...(headers || {}) },
    };

    if (body && method !== 'GET' && method !== 'DELETE') {
      fetchOpts.body = body;
    }

    const start = Date.now();
    const response = await fetch(targetUrl, fetchOpts);
    const timeMs = Date.now() - start;

    const resHeaders = {};
    response.headers.forEach((v, k) => { resHeaders[k] = v; });

    const data = await response.text();

    return new Response(JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
      data,
      timeMs,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      status: 0,
      statusText: 'Proxy Error',
      headers: {},
      data: err.message,
      timeMs: 0,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
