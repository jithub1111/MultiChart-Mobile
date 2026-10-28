// Multichart's Schwab helper: a small Cloudflare Worker that holds the Schwab app keys,
// signs in, keeps the sign-in fresh, and passes market data requests through to Schwab.
// It also fetches what the Fundamentals panel shows: news from Yahoo Finance and Google News,
// and company details and filings from the SEC (browsers can't read those sites directly).
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

/* ---------- Fundamentals: news, company profile and SEC filings ---------- */
const AGENT = 'Mozilla/5.0 (compatible; MultiChart-Mobile/1.0; +https://github.com/jithub1111/MultiChart-Mobile)';
const tidy = t => t.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const tagText = (x, t) => { const m = x.match(new RegExp(`<${t}\\b[^>]*>([\\s\\S]*?)</${t}>`)); return m ? tidy(m[1]) : ''; };
async function rss(url) {
  const r = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: 'application/rss+xml, application/xml, text/xml' } });
  if (!r.ok) throw new Error(`returned ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map(([x]) => ({
    title: tagText(x, 'title'), link: tagText(x, 'link'), time: Date.parse(tagText(x, 'pubDate')) || 0, source: tagText(x, 'source')
  })).filter(i => i.title && /^https?:\/\//.test(i.link));
}
// Company names as people write them in headlines: "APPLE INC" -> "APPLE".
const plainName = n => {
  let t = String(n || '').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim(), was;
  do { was = t; t = t.replace(/\s+(inc|corp|corporation|co|company|ltd|limited|plc|sa|nv|ag|se|lp|llc|holdings?|group|common stock|class [a-z]|ordinary shares|shares|shs|com|new)$/i, '').trim(); } while (t !== was);
  return t.length > 2 ? t : '';
};
// Yahoo Finance's headlines for the ticker plus a Google News search for the ticker and company
// name, merged, without repeats, newest first.
async function news(sym, name) {
  const words = plainName(name);
  const q = (words ? `("${sym}" OR "${words}")` : `"${sym}" stock`) + ' when:14d';
  const feeds = {
    yahoo: rss(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(sym)}&region=US&lang=en-US`),
    google: rss(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`)
  };
  const names = Object.keys(feeds), done = await Promise.allSettled(Object.values(feeds)), got = {}, all = [];
  done.forEach((d, n) => {
    const k = names[n];
    if (d.status === 'rejected') { got[k] = String(d.reason && d.reason.message || d.reason); return; }
    got[k] = d.value.length;
    d.value.forEach(i => {
      if (k === 'yahoo') { const host = new URL(i.link).hostname; i.source = /(^|\.)yahoo\.com$/.test(host) ? 'Yahoo Finance' : host.replace(/^www\./, ''); }
      else if (i.source && i.title.endsWith(' - ' + i.source)) i.title = i.title.slice(0, -(i.source.length + 3));
      all.push(i);
    });
  });
  const seen = new Set(), cutoff = Date.now() - 30 * 864e5;
  const items = all.sort((a, b) => b.time - a.time).filter(i => {
    const key = i.title.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '').slice(0, 70);
    if (seen.has(key) || (i.time && i.time < cutoff)) return false;
    seen.add(key);
    return true;
  }).slice(0, 60);
  return { items, feeds: got };
}
// The SEC turns away automated requests that don't name a contact email, so the helper sends the
// one saved from the app (kept here in the helper, never in the app's public code).
const SEC_KEY = 'sec-contact';
const isEmail = v => typeof v === 'string' && v.length <= 120 && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(v);
async function sec(env, url, as = 'json') {
  const contact = await env.TOKENS.get(SEC_KEY);
  const agent = contact ? `MultiChart-Mobile personal app ${contact}` : AGENT;
  const r = await fetch(url, { headers: { 'User-Agent': agent, Accept: as === 'json' ? 'application/json' : 'text/plain' } });
  if (r.status === 403 && !contact) throw new Fail('The SEC asks apps that read its site to include a contact email.', 502, 'seccontact');
  if (r.status === 403) throw new Fail("The SEC's site turned the request away (403). It may be limiting requests for a while; try again later.", 502, 'sec');
  if (!r.ok) throw new Fail(`The SEC's site returned an error (${r.status}).`, 502, 'sec');
  return as === 'json' ? r.json() : r.text();
}
// The SEC's company number for a ticker, remembered for a week. Empty when the company doesn't file with the SEC.
async function cikFor(env, sym) {
  const key = 'cik:' + sym, hit = await env.TOKENS.get(key);
  if (hit !== null) return hit;
  const list = await sec(env, 'https://www.sec.gov/include/ticker.txt', 'text');
  const t = sym.toLowerCase().replace(/[./]/g, '-').replace(/[^a-z0-9-]/g, '');
  const m = t && list.match(new RegExp(`^${t}\\t(\\d+)`, 'm'));
  const cik = m ? m[1] : '';
  await env.TOKENS.put(key, cik, { expirationTtl: 7 * 86400 });
  return cik;
}
// The company's Wikipedia summary, found through Wikidata by its SEC number so it is the right company.
async function wikiSummary(cik) {
  const q = `SELECT ?a WHERE { VALUES ?c { "${cik.padStart(10, '0')}" "${cik}" } ?i wdt:P5531 ?c . ?a schema:about ?i ; schema:isPartOf <https://en.wikipedia.org/> . } LIMIT 1`;
  const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { 'User-Agent': AGENT, Accept: 'application/sparql-results+json' } });
  const hit = r.ok && (await r.json()).results.bindings[0];
  if (!hit) return null;
  const page = hit.a.value, title = page.split('/wiki/')[1];
  const s = await (await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, { headers: { 'User-Agent': AGENT } })).json();
  return s.extract ? { text: s.extract, url: (s.content_urls && s.content_urls.desktop && s.content_urls.desktop.page) || page } : null;
}
async function company(env, sym) {
  const cik = String(+(await cikFor(env, sym)) || '');
  if (!cik) return { cik: null };
  const [sub, wiki] = await Promise.allSettled([sec(env, `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`), wikiSummary(cik)]);
  if (sub.status === 'rejected') throw sub.reason;
  const s = sub.value, f = s.filings.recent, a = (s.addresses && s.addresses.business) || {};
  const filings = f.form.slice(0, 80).map((form, i) => {
    const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber[i].replace(/-/g, '')}/`;
    return { form, date: f.filingDate[i], report: f.reportDate[i], items: f.items[i], desc: f.primaryDocDescription[i], url: folder + (f.primaryDocument[i] || `${f.accessionNumber[i]}-index.htm`) };
  });
  return {
    cik, name: s.name, industry: s.sicDescription, sic: s.sic, category: s.category, entityType: s.entityType,
    exchanges: s.exchanges, tickers: s.tickers, fiscalYearEnd: s.fiscalYearEnd, incorporated: s.stateOfIncorporationDescription,
    website: s.website || s.investorWebsite, phone: s.phone, description: s.description,
    address: [a.street1, a.street2, a.city, [a.stateOrCountry, a.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    formerNames: (s.formerNames || []).slice(0, 3).map(n => n.name),
    wiki: wiki.status === 'fulfilled' ? wiki.value : null,
    filings
  };
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
  if (p === '/settings') {
    if (req.method === 'POST') {
      const { secContact } = await req.json().catch(() => ({}));
      if (secContact === '') await env.TOKENS.delete(SEC_KEY);
      else if (isEmail(String(secContact || '').trim())) await env.TOKENS.put(SEC_KEY, String(secContact).trim());
      else throw new Fail('That does not look like an email address.', 400, 'email');
    }
    return json({ secContact: await env.TOKENS.get(SEC_KEY) || '' });
  }
  if (p === '/pricehistory' || p === '/quotes' || p === '/instruments') return json(await schwab(env, `/marketdata/v1${p}${url.search}`));
  const sym = (url.searchParams.get('symbol') || '').toUpperCase().trim();
  if ((p === '/news' || p === '/company') && !/^[A-Z0-9.\/^-]{1,12}$/.test(sym)) throw new Fail('Missing or odd symbol.', 400, 'symbol');
  if (p === '/news') return json(await news(sym, url.searchParams.get('name') || ''));
  if (p === '/company') return json(await company(env, sym));
  throw new Fail('Not found', 404, 'notfound');
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try { return await route(req, env, new URL(req.url)); }
    catch (e) { return json({ error: e.message, code: e.code || 'error' }, e.status || 500); }
  }
};
