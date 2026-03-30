// Vercel Edge Function — serves analytics data for the admin dashboard
// Protected by ADMIN_TOKEN environment variable

export const config = {
  runtime: 'edge',
};

import { kvGet, kvKeys, kvMget, kvLrange, kvEnabled } from './_lib/kv.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function checkAuth(request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader === `Bearer ${token}`) return true;

  // Check query param
  const url = new URL(request.url);
  if (url.searchParams.get('token') === token) return true;

  return false;
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

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
    // Get total questions
    const total = (await kvGet('stats:total')) || 0;

    // Get daily stats for last 14 days
    const dailyKeys = [];
    const dailyLabels = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `stats:daily:${d.toISOString().slice(0, 10)}`;
      dailyKeys.push(key);
      dailyLabels.push(d.toISOString().slice(0, 10));
    }
    const dailyValues = dailyKeys.length > 0 ? await kvMget(...dailyKeys) : [];
    const daily = dailyLabels.map((label, i) => ({
      date: label,
      count: parseInt(dailyValues?.[i]) || 0,
    }));

    // Get topic stats
    const topicKeys = await kvKeys('stats:topics:*');
    let topics = [];
    if (topicKeys && topicKeys.length > 0) {
      const topicValues = await kvMget(...topicKeys);
      topics = topicKeys.map((key, i) => ({
        topic: key.replace('stats:topics:', ''),
        count: parseInt(topicValues?.[i]) || 0,
      })).sort((a, b) => b.count - a.count);
    }

    // Get feedback counts
    const positive = parseInt(await kvGet('stats:feedback:positive')) || 0;
    const negative = parseInt(await kvGet('stats:feedback:negative')) || 0;

    // Get recent feedback entries (last 50)
    const feedbackItems = await kvLrange('feedback:items', 0, 49);
    const feedback = (feedbackItems || []).map(item => {
      try { return typeof item === 'string' ? JSON.parse(item) : item; }
      catch { return item; }
    });

    // Get email count
    const emailItems = await kvLrange('emails:list', 0, -1);
    const emailCount = emailItems ? emailItems.length : 0;

    // Get sessions + flags count
    const totalSessions = parseInt(await kvGet('stats:sessions:total')) || 0;
    const flaggedSessions = parseInt(await kvGet('stats:sessions:flagged')) || 0;

    // Get stage breakdown (journey data)
    const stageKeys = await kvKeys('stats:stage:*');
    let stages = [];
    if (stageKeys && stageKeys.length > 0) {
      const stageValues = await kvMget(...stageKeys);
      stages = stageKeys.map((k, i) => ({
        stage: k.replace('stats:stage:', ''),
        count: parseInt(stageValues?.[i]) || 0,
      })).sort((a, b) => b.count - a.count);
    }

    return new Response(JSON.stringify({
      total: parseInt(total) || 0,
      daily,
      topics,
      feedback: { positive, negative, items: feedback },
      emailCount,
      sessions: totalSessions,
      flagged: flaggedSessions,
      stages,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Analytics error:', e);
    return new Response(JSON.stringify({ error: 'Failed to load analytics' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
