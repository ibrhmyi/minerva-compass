// Vercel Edge Function — server-side session recording
// POST: save/update session (public), GET: list sessions (admin only)

export const config = {
  runtime: 'edge',
};

import { kvSet, kvGet, kvLpush, kvLrange, kvLtrim, kvIncr, kvKeys, kvMget, kvEnabled } from './_lib/kv.js';

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

  if (!kvEnabled()) {
    // Silently accept but don't store if KV not configured
    if (request.method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'KV store not configured' }), {
      status: 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // POST — save/update a session
  if (request.method === 'POST') {
    try {
      const { sessionId, messages, stage, userAgent, userFlagged } = await request.json();

      if (!sessionId || !messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid session data' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Detect if bot couldn't answer (auto-flagging)
      let flagged = false;
      let flagReason = null;
      for (const msg of messages) {
        if (msg.role === 'assistant') {
          const t = (msg.content || '').toLowerCase();
          if (t.includes("i'm not sure") || t.includes('not covered') || t.includes('check with admissions@') || t.includes('having trouble connecting')) {
            flagged = true;
            flagReason = 'unanswered';
            break;
          }
        }
      }

      // User-reported flag takes priority
      if (userFlagged) {
        flagged = true;
        flagReason = flagReason ? flagReason + ', user-reported' : 'user-reported';
      }

      // Build session object
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 60) : 'No messages';
      const messageCount = messages.filter(m => m.role === 'user').length;

      const session = {
        id: sessionId,
        title,
        messages: messages.slice(-30), // Keep last 30 messages
        messageCount,
        stage: stage || null,
        flagged,
        flagReason,
        userAgent: userAgent ? userAgent.slice(0, 150) : null,
        updatedAt: new Date().toISOString(),
      };

      // Check if session already exists (for flag/stage dedup)
      const existingData = await kvGet(`session:${sessionId}`);
      let wasNew = false;
      let wasFlagged = false;
      let prevStage = null;
      if (existingData) {
        try {
          const prev = typeof existingData === 'string' ? JSON.parse(existingData) : existingData;
          wasFlagged = !!prev.flagged;
          prevStage = prev.stage;
        } catch (e) {}
      } else {
        wasNew = true;
      }

      // Store the session data
      await kvSet(`session:${sessionId}`, JSON.stringify(session));

      // Add to session index — only if new
      if (wasNew) {
        await kvSet(`session:seen:${sessionId}`, '1');
        await kvLpush('sessions:index', sessionId);
        await kvLtrim('sessions:index', 0, 499);
        await kvIncr('stats:sessions:total');
      }

      // Track flagged count — only increment when transitioning to flagged
      if (flagged && !wasFlagged) {
        await kvIncr('stats:sessions:flagged');
      }

      // Stage is tracked via /api/feedback on button press, not here

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

  // GET — list sessions (admin only)
  if (request.method === 'GET') {
    if (!checkAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const url = new URL(request.url);
      const filter = url.searchParams.get('filter'); // 'flagged', 'all'
      const sessionId = url.searchParams.get('id'); // single session detail

      // Single session detail
      if (sessionId) {
        const data = await kvGet(`session:${sessionId}`);
        if (!data) {
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const session = typeof data === 'string' ? JSON.parse(data) : data;
        return new Response(JSON.stringify({ session }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // List sessions
      const ids = await kvLrange('sessions:index', 0, 99); // Last 100
      if (!ids || ids.length === 0) {
        return new Response(JSON.stringify({ sessions: [], stats: {} }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Fetch all session data
      const sessionKeys = ids.map(id => `session:${id}`);
      const rawSessions = await kvMget(...sessionKeys);
      let sessions = (rawSessions || []).map(raw => {
        if (!raw) return null;
        try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
        catch { return null; }
      }).filter(Boolean);

      // Filter
      if (filter === 'flagged') {
        sessions = sessions.filter(s => s.flagged);
      }

      // Sort by updatedAt descending
      sessions.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

      // Strip messages from list view (just metadata)
      const list = sessions.map(s => ({
        id: s.id,
        title: s.title,
        messageCount: s.messageCount,
        stage: s.stage,
        flagged: s.flagged,
        flagReason: s.flagReason,
        updatedAt: s.updatedAt,
      }));

      // Get stats
      const totalSessions = parseInt(await kvGet('stats:sessions:total')) || 0;
      const flaggedSessions = parseInt(await kvGet('stats:sessions:flagged')) || 0;

      // Stage breakdown
      const stageKeys = await kvKeys('stats:stage:*');
      let stages = [];
      if (stageKeys && stageKeys.length > 0) {
        const stageValues = await kvMget(...stageKeys);
        stages = stageKeys.map((k, i) => ({
          stage: k.replace('stats:stage:', ''),
          count: parseInt(stageValues?.[i]) || 0,
        }));
      }

      return new Response(JSON.stringify({
        sessions: list,
        stats: { total: totalSessions, flagged: flaggedSessions, stages },
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.error('Sessions error:', e);
      return new Response(JSON.stringify({ error: 'Failed to load sessions' }), {
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
