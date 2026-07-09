import { handleProxy } from './proxy.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/api/proxy' && request.method === 'POST') {
      return handleProxy(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
