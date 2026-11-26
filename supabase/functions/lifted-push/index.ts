// Lifted push sender (Supabase Edge Function "lifted-push").
// pg_cron calls this every 10 minutes. It asks the database which phones have notifications on, works out what is due
// in each phone's own time zone, and sends it as a Web Push. Web Push encryption (RFC 8291) and VAPID signing (RFC 8292)
// are done with Web Crypto below, so there are no dependencies. Plain JS syntax so node tests can import this file.

/* ---------- base64url ---------- */
export const b64u = {
  enc: (buf) => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: (str) => { const s = atob(String(str).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(str).length + 3) % 4)); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; },
};
const te = new TextEncoder();
const cat = (...parts) => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let i = 0; parts.forEach(p => { o.set(p, i); i += p.length; }); return o; };
const subtle = globalThis.crypto.subtle;
async function hkdf(salt, ikm, info, len) {
  const k = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

/* ---------- VAPID (RFC 8292) ---------- */
// pub: base64url raw P-256 public key (65 bytes); priv: base64url private scalar d (32 bytes)
export async function vapidHeader(endpoint, pub, priv, subject, now = Date.now()) {
  const raw = b64u.dec(pub);
  const key = await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u.enc(raw.slice(1, 33)), y: b64u.enc(raw.slice(33, 65)), d: priv, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u.enc(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u.enc(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(head + '.' + body)));
  return `vapid t=${head}.${body}.${b64u.enc(sig)}, k=${pub}`;
}

/* ---------- payload encryption (RFC 8291, aes128gcm) ---------- */
export async function encrypt(sub, text, salt = globalThis.crypto.getRandomValues(new Uint8Array(16))) {
  const ua = b64u.dec(sub.keys.p256dh), auth = b64u.dec(sub.keys.auth);
  const eph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const as = new Uint8Array(await subtle.exportKey('raw', eph.publicKey));
  const uaKey = await subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(te.encode('WebPush: info\0'), ua, as), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(te.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return cat(salt, rs, new Uint8Array([as.length]), as, ct);
}
export async function sendPush(sub, payload, keys, f = fetch) {
  const body = await encrypt(sub, JSON.stringify(payload));
  const r = await f(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(sub.endpoint, keys.public, keys.private, keys.subject), TTL: '43200', Urgency: 'normal', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' }, body });
  return r.status;
}

export async function newVapid() {
  const k = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await subtle.exportKey('raw', k.publicKey)), jwk = await subtle.exportKey('jwk', k.privateKey);
  return { public: b64u.enc(pub), private: jwk.d };
}

/* ---------- what is due for one phone ---------- */
// Kinds (each can be off): morning plan, meal reminders at the person's usual times (naming what they planned),
// a workout reminder at their usual training time, a nightly recap (or a streak warning), and friends.
// At most 6 a day, at most 2 per run, nothing twice. Times are the phone's local time.
const DEF = { morning: '08:00', meals: true, workout: true, recap: '21:30', streak: true, drop: true, friends: true };
const MAX_DAY = 6;
const mins = hm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : -1; };
const first = s => String(s || 'Your friend').split(' ')[0];
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const cut = (s, n = 110) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
// dev: { prefs, state, tz (minutes east of UTC), sent, me, partner, nudges, reactions }
export function due(dev, now = Date.now()) {
  const raw = dev.prefs || {}, p = { ...DEF, ...raw }, st = dev.state || {}, sent = dev.sent || {};
  if (!('recap' in raw) && raw.evening) p.recap = raw.evening; // phones on the older settings
  if (raw.remind === false && !('meals' in raw)) { p.morning = ''; p.meals = false; p.workout = false; }
  const local = new Date(now + (dev.tz || 0) * 60000), day = local.toISOString().slice(0, 10), m = local.getUTCHours() * 60 + local.getUTCMinutes(), dow = local.getUTCDay();
  const at = (hm) => { const t = mins(hm); return t >= 0 && m >= t && m < t + 40; };
  const today = st.day === day, score = today ? st.score || 0 : 0, plan = (st.plan || [])[dow] || '', trained = today && st.trained;
  const meals = today ? st.meals : st.tmr && st.tmr.day === day ? st.tmr.meals : null;
  const streak = st.day === day || st.day === prevDay(day) ? st.streak || 0 : 0;
  const ps = dev.partner && dev.partner.stats || {}, duoOn = !!(dev.me && dev.partner && ps.duo === dev.me.handle && (dev.me.stats || {}).duo === dev.partner.handle);
  const theyDid = duoOn && ps.day === day && (ps.score || 0) >= 45, pname = dev.partner ? first(dev.partner.display || dev.partner.handle) : '';
  const out = [], mark = {};
  const add = (tag, title, body, url = './') => out.push({ tag, title: cut(title, 60), body: cut(body), url });
  if (p.morning && sent.morning !== day && at(p.morning)) {
    mark.morning = day;
    const drop = st.drop && st.drop.k === day ? st.drop : null, bf = meals && meals.breakfast && meals.breakfast.plan && meals.breakfast.plan.length ? meals.breakfast.plan.join(', ') : '';
    const bits = [bf ? `Breakfast: ${bf}.` : '', p.drop ? (drop ? `Drop: ${drop.t}.` : 'Today’s drop is live.') : '', !plan && !bf ? 'Recover: walk, eat well, sleep.' : ''].filter(Boolean);
    add('morning', plan ? `${plan} today` : 'Rest day', bits.join(' ') || `${plan} is on the plan.`, './?n=morning');
  }
  if (p.meals && meals) ['breakfast', 'lunch', 'dinner'].forEach(t => {
    const x = meals[t]; if (!x || sent['m_' + t] === day || !at(x.at)) return;
    mark['m_' + t] = day;
    if (today && x.logged) return;
    const planned = (x.plan || []).length;
    add('meal-' + t, cap1(t), planned ? `Planned: ${x.plan.join(', ')}${x.kcal ? ` · ${x.kcal} kcal` : ''}. Tap when you’ve eaten it.` : `${cap1(t)} time? Snap it so today counts.`, './?n=meal&t=' + t);
  });
  if (p.workout && plan && !trained && sent.gym !== day && at(st.woAt || '18:00')) {
    mark.gym = day;
    add('workout', `Time for ${plan}`, st.ghost ? `Your ghost lifted ${st.ghost} last time. Beat it.` : 'Your session is ready. Tap to start.', './?n=workout');
  }
  if ((p.recap || p.streak) && sent.evening !== day && at(p.recap || '21:30')) {
    mark.evening = day;
    if (duoOn && theyDid && score < 45 && p.friends) add('evening', `${pname} did their part`, `Your duo streak needs ${45 - score} more points from you before midnight.`, './?n=recap');
    else if (p.streak && streak > 0 && score < 45) add('evening', `${streak}-day streak on the line`, `${45 - score} more points before midnight keeps it alive.`, './?n=recap');
    else if (p.recap) {
      const tp = st.tmr && st.tmr.day === nextDay(day) && st.tmr.planned ? '' : ' Plan tomorrow’s meals?';
      if (!today) add('recap', 'Nothing logged today', 'Two minutes of logging still counts.' + tp, './?n=recap');
      else add('recap', `Today: ${score} · ${st.tier || ''}`.replace(/ · $/, ''), (st.parts || []).map(([n, ok]) => (ok ? '✓ ' : '✗ ') + n).join(' · ') + '.' + tp, './?n=recap');
    }
  }
  if (p.friends && m >= 8 * 60 && m < 22 * 60 + 30) {
    const n = dev.nudges || [], r = dev.reactions || [];
    const verb = { nudge: 'nudged you', flex: 'is flexing on you', cheer: 'is cheering you on', challenge: 'challenged you' };
    if (n.length) { const x = n[n.length - 1]; add('nudge', `${first(x.from)} ${verb[x.kind] || 'pinged you'}`, x.msg || (n.length > 1 ? `And ${n.length - 1} more` : 'Open Built to reply'), './?n=friends'); }
    else if (r.length) { const x = r[r.length - 1]; add('react', `${first(x.from)} reacted ${x.emoji}`, r.length > 1 ? `${r.length} new reactions on your posts` : `On your ${x.kind === 'workout' ? 'workout' : x.kind === 'day' ? 'day' : 'post'}`, './?n=friends'); }
    if (n.length || r.length) mark.ev = [...n, ...r].map(x => x.at).sort().pop();
    if (theyDid && score < 45 && sent.duo !== day && !out.some(o => o.tag === 'evening')) { mark.duo = day; add('duo', `${pname} did their part`, 'Your duo streak is waiting on you today.', './?n=recap'); }
  }
  const used = sent.n && sent.n.day === day ? sent.n.c : 0, send = out.slice(0, Math.max(0, Math.min(2, MAX_DAY - used)));
  if (send.length) mark.n = { day, c: used + send.length };
  return { out: send, sent: { ...sent, ...mark }, changed: Object.keys(mark).length > 0 };
}
function nextDay(day) { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
function prevDay(day) { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }

/* ---------- the function ---------- */
export async function run(secret, env, f = fetch, now = Date.now(), opts = {}) {
  const rpc = (fn, args) => f(`${env.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: env.key, authorization: 'Bearer ' + env.key, 'content-type': 'application/json' }, body: JSON.stringify(args) }).then(r => r.json());
  let b = await rpc('fm_push_batch', { p_secret: secret });
  if (!b || !b.ok) return { ok: false, error: (b && b.error) || 'batch' };
  // First run: make the VAPID signing key pair here, so no key ever has to be pasted anywhere.
  if (!b.keys || !b.keys.public || !b.keys.private) {
    const k = await newVapid();
    await rpc('fm_push_setkeys', { p_secret: secret, p_public: k.public, p_private: k.private });
    b = await rpc('fm_push_batch', { p_secret: secret });
    if (!b || !b.ok || !b.keys || !b.keys.public) return { ok: false, error: 'keys' };
  }
  let sent = 0, gone = 0;
  const devs = (b.devices || []).filter(x => !opts.only || x.id === opts.only);
  for (const dev of devs) {
    const d = due(dev, now);
    if (opts.test) d.out = [{ tag: 'test', title: 'Notifications are on', body: 'This is how Built will reach you. Change what you get in Settings → Notifications.' }];
    let dead = false;
    for (const msg of d.out) {
      try { const s = await sendPush(dev.sub, { ...msg, url: msg.url || './' }, b.keys, f); if (s === 404 || s === 410) { dead = true; break; } if (s < 300) sent++; } catch (e) { /* one bad phone shouldn't stop the rest */ }
    }
    if (dead) { gone++; await rpc('fm_push_mark', { p_secret: secret, p_id: dev.id, p_sent: d.sent, p_gone: true }); }
    else if (d.changed) await rpc('fm_push_mark', { p_secret: secret, p_id: dev.id, p_sent: d.sent, p_gone: false });
  }
  return { ok: true, devices: (b.devices || []).length, sent, gone };
}

/* ---------- calendar file (GET ?ics=1): reminders as events with alerts, for phones without push ---------- */
// m, g, e: times (HH:MM); p: the 7 weekday workout names Sunday first, joined by |, empty for rest days.
export function ics(q, now = new Date()) {
  const t = hm => (/^\d{1,2}:\d{2}$/.test(hm || '') ? hm.split(':').map(x => x.padStart(2, '0')).join('') + '00' : '');
  const day = now.toISOString().slice(0, 10).replace(/-/g, ''), stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const clean = x => String(x || '').replace(/[\r\n,;\\]/g, ' ').slice(0, 60);
  const ev = [], add = (id, hm, title, desc, rule) => { const tt = t(hm); if (!tt) return; ev.push(['BEGIN:VEVENT', `UID:built-${id}@built`, 'DTSTAMP:' + stamp, `DTSTART:${day}T${tt}`, 'DURATION:PT10M', 'RRULE:' + rule, 'SUMMARY:' + title, 'DESCRIPTION:' + desc, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + title, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n')); };
  add('am', q.m, 'Built: plan your day', 'Open Built for today’s drop and your next best move.', 'FREQ=DAILY');
  add('pm', q.e, 'Built: close out today', 'Log what’s left and keep your streak alive.', 'FREQ=DAILY');
  const names = String(q.p || '').split('|'), BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  BY.forEach((d, i) => { const n = clean(names[i]); if (n) add('gym-' + d, q.g, `Built: ${n} day`, `${n} is on the plan today.`, 'FREQ=WEEKLY;BYDAY=' + d); });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Built//Reminders//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Built', 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
/* ---------- your log as a calendar feed (GET ?cal=<token>) ---------- */
// events: [{ u, a (all-day), s, e, t (title), d (description) }], built on the phone in its own time zone.
const icsText = x => String(x || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = line => { const ch = Array.from(line), out = []; for (let i = 0; i < ch.length; i += 60) out.push((i ? ' ' : '') + ch.slice(i, i + 60).join('')); return out.join('\r\n'); }; // by characters, so emoji never split
export function calFeedIcs(events, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'), D = /^\d{8}$/, T = /^\d{8}T\d{6}$/;
  const ev = (Array.isArray(events) ? events : []).filter(e => e && (e.a ? D.test(e.s) && D.test(e.e) : T.test(e.s) && T.test(e.e))).slice(0, 2000).map(e => [
    'BEGIN:VEVENT', `UID:built-${String(e.u).replace(/[^a-z0-9-]/gi, '')}@built`, 'DTSTAMP:' + stamp,
    e.a ? `DTSTART;VALUE=DATE:${e.s}` : `DTSTART:${e.s}`, e.a ? `DTEND;VALUE=DATE:${e.e}` : `DTEND:${e.e}`,
    fold('SUMMARY:' + icsText(e.t)), ...(e.d ? [fold('DESCRIPTION:' + icsText(e.d))] : []), 'TRANSP:TRANSPARENT', 'END:VEVENT'].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Built//Log//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Built', 'X-WR-CALDESC:Your workouts\\, food and days from Built', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
// Deno only: the HTTP entry point. pg_cron sends the shared secret in x-cron. (Turn off "Enforce JWT verification" for this function: the secret is the check.)
if (typeof Deno !== 'undefined') {
  Deno.serve(async (req) => {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.searchParams.get('ics')) return new Response(ics(Object.fromEntries(u.searchParams)), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'inline; filename="built-reminders.ics"', 'cache-control': 'no-store' } });
    if (req.method === 'GET' && u.searchParams.get('cal')) {
      const env = { url: Deno.env.get('SUPABASE_URL'), key: Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') };
      const r = await fetch(`${env.url}/rest/v1/rpc/fm_cal_get`, { method: 'POST', headers: { apikey: env.key, authorization: 'Bearer ' + env.key, 'content-type': 'application/json' }, body: JSON.stringify({ p_token: u.searchParams.get('cal') }) });
      const events = r.ok ? await r.json() : null;
      if (!Array.isArray(events)) return new Response('Not found', { status: 404 });
      return new Response(calFeedIcs(events), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'inline; filename="built.ics"', 'cache-control': 'no-store' } });
    }
    let body = {}; try { body = await req.json(); } catch (e) {}
    const out = await run(req.headers.get('x-cron') || '', { url: Deno.env.get('SUPABASE_URL'), key: Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') }, fetch, Date.now(), { only: body.only, test: !!body.test });
    return new Response(JSON.stringify(out), { status: out.ok ? 200 : 401, headers: { 'content-type': 'application/json' } });
  });
}
