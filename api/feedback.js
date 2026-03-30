// Vercel Edge Function — logs user feedback for analytics
// Stores in Vercel KV + Vercel Runtime Logs

export const config = {
  runtime: 'edge',
};

import { kvIncr, kvLpush, kvLtrim, kvEnabled } from './_lib/kv.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { type } = body;

    // Handle stage selection tracking (from pre-chat survey)
    if (type === 'stage' && body.stage && kvEnabled()) {
      await kvIncr(`stats:stage:${body.stage}`);
      console.log(JSON.stringify({ event: 'stage_selected', stage: body.stage }));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { question, answer, timestamp } = body;

    const entry = {
      feedback: type,
      question: question ? question.slice(0, 500) : null,
      answerPreview: answer || null,
      timestamp: timestamp || new Date().toISOString(),
    };

    // Log to Vercel Runtime Logs
    console.log(JSON.stringify({ event: 'user_feedback', ...entry }));

    // Store in KV if configured (non-blocking)
    if (kvEnabled()) {
      Promise.all([
        kvIncr(`stats:feedback:${type === 'positive' ? 'positive' : 'negative'}`),
        kvLpush('feedback:items', JSON.stringify(entry)),
        kvLtrim('feedback:items', 0, 199), // Keep last 200
      ]).catch(() => {});
    }

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
