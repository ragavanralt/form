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
const DEF = { remind: true, streak: true, drop: true, friends: true, morning: '08:30', gym: '18:00', evening: '21:00' };
const mins = hm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : -1; };
const first = s => String(s || 'Your friend').split(' ')[0];
// dev: { prefs, state, tz (minutes east of UTC), sent, me, partner, nudges, reactions }
export function due(dev, now = Date.now()) {
  const p = { ...DEF, ...(dev.prefs || {}) }, st = dev.state || {}, sent = dev.sent || {};
  const local = new Date(now + (dev.tz || 0) * 60000), day = local.toISOString().slice(0, 10), m = local.getUTCHours() * 60 + local.getUTCMinutes(), dow = local.getUTCDay();
  const at = (hm) => { const t = mins(hm); return t >= 0 && m >= t && m < t + 40; };
  const today = st.day === day, score = today ? st.score || 0 : 0, plan = (st.plan || [])[dow] || '', trained = today && st.trained;
  const streak = st.day === day || st.day === prevDay(day) ? st.streak || 0 : 0;
  const ps = dev.partner && dev.partner.stats || {}, duoOn = !!(dev.me && dev.partner && ps.duo === dev.me.handle && (dev.me.stats || {}).duo === dev.partner.handle);
  const theyDid = duoOn && ps.day === day && (ps.score || 0) >= 45, pname = dev.partner ? first(dev.partner.display || dev.partner.handle) : '';
  const out = [], mark = {};
  if ((p.remind || p.drop) && sent.morning !== day && at(p.morning)) {
    mark.morning = day;
    const drop = st.drop && st.drop.k === day ? st.drop : null;
    out.push({ tag: 'morning', title: plan ? `${plan} today` : 'Rest day', body: p.drop ? (drop ? `Today’s drop: ${drop.t}` : 'Today’s drop is live. Open to see it.') : plan ? `${plan} is on the plan. ${st.cold ? `Your ${st.cold.toLowerCase()} could use it too.` : ''}`.trim() : 'Recover today. Walk, eat well, sleep.' });
  }
  if (p.remind && plan && !trained && sent.gym !== day && at(p.gym)) {
    mark.gym = day;
    out.push({ tag: 'gym', title: `${plan} is still on for today`, body: st.ghost ? `Your ghost from last time: ${st.ghost}. Beat it.` : 'Your last session is waiting to be beaten.' });
  }
  if ((p.streak || p.remind) && sent.evening !== day && at(p.evening)) {
    mark.evening = day;
    if (duoOn && theyDid && score < 45 && p.friends) out.push({ tag: 'evening', title: `${pname} did their part`, body: `Your duo streak needs ${45 - score} more points from you before midnight.` });
    else if (p.streak && streak > 0 && score < 45) out.push({ tag: 'evening', title: `${streak}-day streak on the line`, body: `${45 - score} more points before midnight keeps it alive.` });
    else if (p.remind && score < 70) out.push({ tag: 'evening', title: 'Close out today', body: score ? `${score} so far. ${70 - score} more for a win.` : 'Nothing logged yet today. A meal and a walk still count.' });
  }
  if (p.friends && m >= 8 * 60 && m < 22 * 60 + 30) {
    const n = dev.nudges || [], r = dev.reactions || [];
    const verb = { nudge: 'nudged you', flex: 'is flexing on you', cheer: 'is cheering you on', challenge: 'challenged you' };
    if (n.length) { const x = n[n.length - 1]; out.push({ tag: 'nudge', title: `${first(x.from)} ${verb[x.kind] || 'pinged you'}`, body: x.msg || (n.length > 1 ? `And ${n.length - 1} more` : 'Open Lifted to reply') }); }
    else if (r.length) { const x = r[r.length - 1]; out.push({ tag: 'react', title: `${first(x.from)} reacted ${x.emoji}`, body: r.length > 1 ? `${r.length} new reactions on your posts` : `On your ${x.kind === 'workout' ? 'workout' : x.kind === 'day' ? 'day' : 'post'}` }); }
    if (n.length || r.length) mark.ev = [...n, ...r].map(x => x.at).sort().pop();
    if (theyDid && score < 45 && sent.duo !== day && !out.some(o => o.tag === 'evening')) { mark.duo = day; out.push({ tag: 'duo', title: `${pname} did their part`, body: 'Your duo streak is waiting on you today.' }); }
  }
  return { out: out.slice(0, 2), sent: { ...sent, ...mark }, changed: Object.keys(mark).length > 0 };
}
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
      try { const s = await sendPush(dev.sub, { ...msg, url: './' }, b.keys, f); if (s === 404 || s === 410) { dead = true; break; } if (s < 300) sent++; } catch (e) { /* one bad phone shouldn't stop the rest */ }
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
// Deno only: the HTTP entry point. pg_cron sends the shared secret in x-cron. (Turn off "Enforce JWT verification" for this function: the secret is the check.)
if (typeof Deno !== 'undefined') {
  Deno.serve(async (req) => {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.searchParams.get('ics')) return new Response(ics(Object.fromEntries(u.searchParams)), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'inline; filename="built-reminders.ics"', 'cache-control': 'no-store' } });
    let body = {}; try { body = await req.json(); } catch (e) {}
    const out = await run(req.headers.get('x-cron') || '', { url: Deno.env.get('SUPABASE_URL'), key: Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') }, fetch, Date.now(), { only: body.only, test: !!body.test });
    return new Response(JSON.stringify(out), { status: out.ok ? 200 : 401, headers: { 'content-type': 'application/json' } });
  });
}
