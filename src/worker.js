import { handleProxy } from './proxy.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/proxy' && request.method === 'POST') {
      return handleProxy(request);
    }

    if (url.pathname === '/' || url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) {
      const file = url.pathname === '/' ? '/index.html' : url.pathname;
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
