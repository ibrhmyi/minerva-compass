// Vercel Edge Function — captures and lists email leads
// POST: capture email (public), GET: list emails (admin only)

export const config = {
  runtime: 'edge',
};

import { kvLpush, kvLrange, kvLtrim, kvEnabled } from './_lib/kv.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function checkAuth(request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const authHeader = request.headers.get('Authorization');
  if (authHeader === `Bearer ${token}`) return true;
  const url = new URL(request.url);
  if (url.searchParams.get('token') === token) return true;
  return false;
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  // POST — capture a new email (public endpoint)
  if (request.method === 'POST') {
    try {
      const { email, context } = await request.json();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const entry = {
        email: email.trim().toLowerCase(),
        context: context ? context.slice(0, 200) : null,
        timestamp: new Date().toISOString(),
      };

      if (kvEnabled()) {
        await kvLpush('emails:list', JSON.stringify(entry));
        // Keep only last 500 emails
        await kvLtrim('emails:list', 0, 499);
      }

      // Also log for Vercel Runtime Logs
      console.log(JSON.stringify({ event: 'email_capture', ...entry }));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  // GET — list captured emails (admin only)
  if (request.method === 'GET') {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!kvEnabled()) {
      return new Response(JSON.stringify({ error: 'KV store not configured' }), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const items = await kvLrange('emails:list', 0, -1);
      const emails = (items || []).map(item => {
        try { return typeof item === 'string' ? JSON.parse(item) : item; }
        catch { return { email: item }; }
      });

      return new Response(JSON.stringify({ emails }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to load emails' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
