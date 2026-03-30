// Vercel KV (Upstash Redis) REST API utility
// Used by Edge Functions for analytics, feedback, and email storage

function getConfig() {
  return {
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  };
}

async function kvCommand(...args) {
  const { url, token } = getConfig();
  if (!url || !token) return null;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  const data = await res.json();
  return data.result;
}

export async function kvGet(key) {
  return kvCommand('GET', key);
}

export async function kvSet(key, value) {
  return kvCommand('SET', key, typeof value === 'string' ? value : JSON.stringify(value));
}

export async function kvIncr(key) {
  return kvCommand('INCR', key);
}

export async function kvLpush(key, value) {
  return kvCommand('LPUSH', key, typeof value === 'string' ? value : JSON.stringify(value));
}

export async function kvLrange(key, start, stop) {
  return kvCommand('LRANGE', key, String(start), String(stop));
}

export async function kvLtrim(key, start, stop) {
  return kvCommand('LTRIM', key, String(start), String(stop));
}

export async function kvKeys(pattern) {
  return kvCommand('KEYS', pattern);
}

export async function kvMget(...keys) {
  return kvCommand('MGET', ...keys);
}

// Check if KV is configured
export function kvEnabled() {
  const { url, token } = getConfig();
  return !!(url && token);
}
