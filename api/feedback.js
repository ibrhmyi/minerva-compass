// Vercel Edge Function — logs user feedback for analytics
// Feedback appears in Vercel Runtime Logs for the admissions team to review

export const config = {
  runtime: 'edge',
};

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
    const { type, question, answer, timestamp } = await request.json();

    // Log to Vercel Runtime Logs — admissions team can view these in the Vercel dashboard
    console.log(JSON.stringify({
      event: 'user_feedback',
      feedback: type, // 'positive' or 'negative'
      question: question ? question.slice(0, 200) : null,
      answerPreview: answer ? answer.slice(0, 200) : null,
      timestamp: timestamp || new Date().toISOString(),
    }));

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
