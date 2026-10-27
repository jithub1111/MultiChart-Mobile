// Multichart's Schwab helper: a small Cloudflare Worker that holds the Schwab app keys,
// signs in, keeps the sign-in fresh, and passes market data requests through to Schwab.
// Every route except /login needs the app password (X-App-Password header).
const API = 'https://api.schwabapi.com';
const CALLBACK = 'https://127.0.0.1';
const REFRESH_LIFE = 7 * 864e5;  // Schwab ends a sign-in after 7 days

class Fail extends Error {
  constructor(msg, status = 500, code = '') { super(msg); this.status = status; this.code = code; }
}
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Password',
  'Access-Control-Max-Age': '86400'
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function sameText(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function tokenRequest(env, params) {
  const r = await fetch(`${API}/v1/oauth/token`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${env.SCHWAB_APP_KEY}:${env.SCHWAB_APP_SECRET}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Fail(`Schwab sign-in failed: ${j.error_description || j.error || r.status}. Sign in again.`, 401, 'signin');
  return j;
}
async function loadTokens(env) { return JSON.parse(await env.TOKENS.get('schwab') || 'null'); }
async function saveTokens(env, t) { await env.TOKENS.put('schwab', JSON.stringify(t)); }

// A fresh access token, refreshing it when it is within a minute of expiring.
async function accessToken(env, force) {
  const t = await loadTokens(env), now = Date.now();
  if (!t) throw new Fail('Not signed in to Schwab yet.', 401, 'signin');
  if (now > t.refreshExp) throw new Fail('Your weekly Schwab sign-in has expired. Sign in again.', 401, 'signin');
  if (!force && t.accessExp - 60e3 > now) return t.access;
  const j = await tokenRequest(env, { grant_type: 'refresh_token', refresh_token: t.refresh });
  t.access = j.access_token;
  t.accessExp = now + (j.expires_in || 1800) * 1000;
  if (j.refresh_token) t.refresh = j.refresh_token;
  await saveTokens(env, t);
  return t.access;
}
async function schwab(env, path) {
  for (const force of [false, true]) {
    const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + await accessToken(env, force), Accept: 'application/json' } });
    if (r.status === 401 && !force) continue;
    const body = await r.text();
    if (!r.ok) {
      let msg = body;
      try { const j = JSON.parse(body); msg = j.message || j.error || (j.errors && j.errors.map(e => e.detail || e.title).join(', ')) || body; } catch (e) {}
      throw new Fail(`Schwab returned an error (${r.status}): ${String(msg).slice(0, 200)}`, r.status === 429 ? 429 : 502, r.status === 429 ? 'rate' : 'schwab');
    }
    return JSON.parse(body);
  }
}

async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return new Response('Multichart Schwab helper is running.', { headers: cors });
  if (p === '/login') {
    return Response.redirect(`${API}/v1/oauth/authorize?client_id=${encodeURIComponent(env.SCHWAB_APP_KEY)}&redirect_uri=${encodeURIComponent(CALLBACK)}`, 302);
  }
  if (!env.APP_PASSWORD || !sameText(req.headers.get('X-App-Password') || '', env.APP_PASSWORD)) {
    throw new Fail('Wrong app password.', 401, 'password');
  }
  if (p === '/token' && req.method === 'POST') {
    const { url: pasted = '' } = await req.json().catch(() => ({}));
    const m = String(pasted).match(/[?&]code=([^&#\s]+)/);
    if (!m) throw new Fail('That address has no sign-in code in it. Copy the whole address from the page Schwab sent you to.', 400, 'code');
    const j = await tokenRequest(env, { grant_type: 'authorization_code', code: decodeURIComponent(m[1]), redirect_uri: CALLBACK });
    const now = Date.now();
    await saveTokens(env, { access: j.access_token, accessExp: now + (j.expires_in || 1800) * 1000, refresh: j.refresh_token, refreshExp: now + REFRESH_LIFE });
    await env.TOKENS.delete('streamer');
    return json({ signedIn: true, refreshExp: now + REFRESH_LIFE });
  }
  if (p === '/status') {
    const t = await loadTokens(env);
    return json({ signedIn: !!t && Date.now() < t.refreshExp, refreshExp: t ? t.refreshExp : null });
  }
  if (p === '/session') {
    const access = await accessToken(env);
    let streamer = JSON.parse(await env.TOKENS.get('streamer') || 'null');
    if (!streamer) {
      const pref = await schwab(env, '/trader/v1/userPreference');
      streamer = (pref.streamerInfo || [])[0];
      if (!streamer) throw new Fail('Schwab did not return streaming details for this account.', 502, 'schwab');
      await env.TOKENS.put('streamer', JSON.stringify(streamer));
    }
    const t = await loadTokens(env);
    return json({ accessToken: access, accessExp: t.accessExp, refreshExp: t.refreshExp, streamer });
  }
  if (p === '/pricehistory' || p === '/quotes') return json(await schwab(env, `/marketdata/v1${p}${url.search}`));
  throw new Fail('Not found', 404, 'notfound');
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try { return await route(req, env, new URL(req.url)); }
    catch (e) { return json({ error: e.message, code: e.code || 'error' }, e.status || 500); }
  }
};
