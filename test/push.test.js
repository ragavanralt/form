// Push notifications: the sender's schedule (what is due when), its encryption round trip, and the SQL in PGlite.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { due, encrypt, b64u, run } from '../supabase/functions/lifted-push/index.ts';

const t = async (name, f) => { await f(); console.log('ok', name); };
const at = (h, m, day = 23) => Date.UTC(2026, 10, day, h, m); // UTC; the phones below are UTC-5 (tz -300)
const plan = ['', 'Upper', 'Lower', '', 'Upper', 'Lower', ''];

await t('morning push names the plan and the drop', () => {
  const r = due({ tz: -300, state: { day: '2026-11-23', drop: { k: '2026-11-23', t: 'Hit 160 g protein' }, plan } }, at(13, 31));
  assert.equal(r.out[0].title, 'Upper today'); assert.match(r.out[0].body, /160 g protein/);
  assert.equal(due({ tz: -300, sent: r.sent, state: { plan } }, at(13, 41)).out.length, 0, 'never twice a day');
});
await t('nothing at night, nothing outside the windows', () => {
  assert.equal(due({ tz: -300, state: { plan } }, at(7, 0)).out.length, 0);
  assert.equal(due({ tz: -300, state: { plan } }, at(16, 0)).out.length, 0);
});
await t('streak at risk in the evening, only if it is', () => {
  const ev = at(2, 5, 24); // 21:05 local on the 23rd
  assert.match(due({ tz: -300, state: { day: '2026-11-23', score: 30, streak: 12 } }, ev).out[0].title, /12-day streak/);
  assert.match(due({ tz: -300, state: { day: '2026-11-22', score: 80, streak: 12 } }, ev).out[0].body, /45 more points/);
  assert.equal(due({ tz: -300, state: { day: '2026-11-23', score: 75, streak: 12 } }, ev).out.length, 0);
  assert.match(due({ tz: -300, prefs: { streak: false }, state: { day: '2026-11-23', score: 50, streak: 12 } }, ev).out[0].title, /Close out/);
});
await t('gym reminder skips days you trained or rest days', () => {
  const g = at(23, 2); // 18:02 local
  assert.match(due({ tz: -300, state: { day: '2026-11-23', trained: false, plan } }, g).out[0].title, /Upper is still on/);
  assert.equal(due({ tz: -300, state: { day: '2026-11-23', trained: true, plan } }, g).out.length, 0);
  assert.equal(due({ tz: -300, state: { plan: ['', '', '', '', '', '', ''] } }, g).out.length, 0);
});
await t('friends: nudges, and the duo partner doing their part', () => {
  const me = { handle: 'sam', stats: { duo: 'jay' } }, partner = { handle: 'jay', display: 'Jay K', stats: { duo: 'sam', day: '2026-11-23', score: 72 } };
  const r = due({ tz: -300, state: { day: '2026-11-23', score: 10 }, me, partner, nudges: [{ kind: 'flex', msg: 'Catch me', from: 'Jay K', at: '2026-11-23T17:00:00Z' }] }, at(19, 0));
  assert.equal(r.out[0].title, 'Jay is flexing on you'); assert.equal(r.out[1].tag, 'duo'); assert.equal(r.sent.ev, '2026-11-23T17:00:00Z');
  assert.equal(due({ tz: -300, prefs: { friends: false }, state: {}, me, partner, nudges: [{ kind: 'nudge', from: 'J', at: 'x' }] }, at(19, 0)).out.length, 0);
  const oneWay = { ...partner, stats: { ...partner.stats, duo: 'someone' } };
  assert.equal(due({ tz: -300, state: { day: '2026-11-23', score: 10 }, me, partner: oneWay }, at(19, 0)).out.length, 0, 'duo needs both sides');
});
await t('payload encryption round trip (aes128gcm)', async () => {
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); const auth = crypto.randomBytes(16);
  const body = Buffer.from(await encrypt({ keys: { p256dh: b64u.enc(ua.getPublicKey()), auth: b64u.enc(auth) } }, '{"title":"x"}'));
  const salt = body.subarray(0, 16), as = body.subarray(21, 86), ct = body.subarray(86);
  const shared = ua.computeSecret(as);
  const H = (s, k, i, n) => Buffer.from(crypto.hkdfSync('sha256', k, s, i, n));
  const ikm = H(auth, shared, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), as]), 32);
  const d = crypto.createDecipheriv('aes-128-gcm', H(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16), H(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12));
  d.setAuthTag(ct.subarray(-16)); const pt = Buffer.concat([d.update(ct.subarray(0, -16)), d.final()]);
  assert.equal(pt.subarray(0, -1).toString(), '{"title":"x"}'); assert.equal(pt.at(-1), 2);
});

await t('calendar file: daily reminders plus each training day, with alerts', async () => {
  const { ics } = await import('../supabase/functions/lifted-push/index.ts');
  const c = ics({ m: '8:30', g: '18:00', e: '21:30', p: '|Upper|Lower||Up;per\nx||' }, new Date('2026-11-25T12:00:00Z'));
  assert.match(c, /^BEGIN:VCALENDAR\r\n/); assert.match(c, /DTSTART:20261125T083000/); assert.match(c, /BYDAY=MO/); assert.match(c, /BYDAY=TU/);
  assert.equal((c.match(/BEGIN:VEVENT/g) || []).length, 5); assert.equal((c.match(/BEGIN:VALARM/g) || []).length, 5);
  assert.ok(!/Up;per/.test(c), 'names are cleaned'); assert.ok(!ics({ m: 'x', g: '', e: '' }).includes('VEVENT'));
});
await t('calendar feed: valid events only, text escaped, emoji never split', async () => {
  const { calFeedIcs } = await import('../supabase/functions/lifted-push/index.ts');
  const c = calFeedIcs([{ u: 'wo-2026-11-23', a: 0, s: '20261123T173000', e: '20261123T183000', t: '🏋️ Upper, push; day', d: 'line1\n' + '🏋️'.repeat(80) }, { u: 'bad', a: 0, s: 'nope', e: 'x', t: 'x' }, { u: 'day-1', a: 1, s: '20261123', e: '20261124', t: 'Built 80' }], new Date('2026-11-25T00:00:00Z'));
  assert.equal((c.match(/BEGIN:VEVENT/g) || []).length, 2); assert.match(c, /SUMMARY:🏋️ Upper\\, push\\; day/); assert.match(c, /DTSTART;VALUE=DATE:20261123/);
  const unfolded = c.replace(/\r\n /g, ''); assert.ok(unfolded.includes('🏋️'.repeat(80)), 'folding keeps emoji whole');
  assert.ok(c.split('\r\n').every(l => Array.from(l).length <= 75));
});
// SQL: needs PGlite (npm i --no-save @electric-sql/pglite); skipped without it.
let PGlite, pgcrypto;
try { ({ PGlite } = await import('@electric-sql/pglite')); ({ pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto')); } catch (e) { console.log('skip SQL: PGlite not installed'); }
if (PGlite) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec('create schema if not exists extensions; create role anon nologin;');
  await db.exec(fs.readFileSync(new URL('../supabase/form-schema.sql', import.meta.url), 'utf8'));
  const push = fs.readFileSync(new URL('../supabase/push.sql', import.meta.url), 'utf8');
  await db.exec(fs.readFileSync(new URL('../supabase/cal.sql', import.meta.url), 'utf8')); await db.exec(fs.readFileSync(new URL('../supabase/cal.sql', import.meta.url), 'utf8'));
  await db.exec(push); await db.exec(push);
  await db.exec(`update fm_push_keys set v = 's3cret' where k = 'cron'`);
  const call = async (fn, args) => { const keys = Object.keys(args); await db.exec('set role anon'); try { const r = await db.query(`select ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`, keys.map(k => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))); return r.rows[0].r; } finally { await db.exec('reset role'); } };
  await t('SQL: no signing key until the sender makes one; only with the secret, only once', async () => {
    assert.equal((await call('fm_push_vapid', {})).key, null);
    assert.equal((await call('fm_push_setkeys', { p_secret: 'nope', p_public: 'X', p_private: 'Y' })).ok, false);
    assert.equal((await call('fm_push_setkeys', { p_secret: 's3cret', p_public: 'PUB', p_private: 'PRIV' })).ok, true);
    assert.equal((await call('fm_push_setkeys', { p_secret: 's3cret', p_public: 'X', p_private: 'Y' })).kept, true);
    assert.equal((await call('fm_push_vapid', {})).key, 'PUB');
  });
  const a = await call('fm_signup', { p_handle: 'sam', p_display: 'Sam', p_avatar: {}, p_device: '' }), b = await call('fm_signup', { p_handle: 'jay', p_display: 'Jay', p_avatar: {}, p_device: '' });
  await call('fm_add_friend', { p_token: a.token, p_handle: 'jay' }); await call('fm_respond', { p_token: b.token, p_handle: 'sam', p_accept: true });
  await call('fm_update', { p_token: a.token, p_display: null, p_avatar: null, p_stats: { duo: 'jay' } });
  await call('fm_update', { p_token: b.token, p_display: null, p_avatar: null, p_stats: { duo: 'sam', day: '2026-11-23', score: 80 } });
  const sub = { endpoint: 'https://web.push.apple.com/x', keys: { p256dh: 'k', auth: 'a' } };
  await t('SQL: calendar feed saves, reads back, rejects bad tokens, deletes', async () => {
    const tok = 'a'.repeat(32);
    assert.equal((await call('fm_cal_save', { p_token: 'short', p_events: [] })).ok, false);
    assert.equal((await call('fm_cal_save', { p_token: tok, p_events: [{ u: 'x' }] })).ok, true);
    assert.deepEqual(await call('fm_cal_get', { p_token: tok }), [{ u: 'x' }]);
    await call('fm_cal_save', { p_token: tok, p_events: null });
    assert.equal(await call('fm_cal_get', { p_token: tok }), null);
    await db.exec('set role anon'); await assert.rejects(db.query('select * from fm_cal'), /permission/); await db.exec('reset role');
  });
  await t('SQL: register a phone, read it back with the secret only', async () => {
    assert.equal((await call('fm_push_save', { p_id: null, p_secret: null, p_token: a.token, p_sub: { endpoint: 'http://evil' }, p_prefs: {}, p_state: {}, p_tz: 0 })).ok, false);
    const r = await call('fm_push_save', { p_id: null, p_secret: null, p_token: a.token, p_sub: sub, p_prefs: { remind: true }, p_state: { day: 'd' }, p_tz: -300 });
    assert.ok(r.ok && r.id && r.secret);
    const r2 = await call('fm_push_save', { p_id: r.id, p_secret: r.secret, p_token: '', p_sub: sub, p_prefs: null, p_state: { day: 'e' }, p_tz: -300 });
    assert.equal(r2.id, r.id, 'same phone updates in place');
    assert.equal((await call('fm_push_batch', { p_secret: 'wrong' })).ok, false);
    await call('fm_nudge', { p_token: b.token, p_handle: 'sam', p_kind: 'nudge', p_msg: 'go' });
    const bt = await call('fm_push_batch', { p_secret: 's3cret' });
    assert.equal(bt.keys.private, 'PRIV'); assert.equal(bt.devices.length, 1);
    const d = bt.devices[0]; assert.equal(d.state.day, 'e'); assert.equal(d.me.handle, 'sam'); assert.equal(d.partner.handle, 'jay'); assert.equal(d.nudges[0].msg, 'go');
    await call('fm_push_mark', { p_secret: 's3cret', p_id: r.id, p_sent: { ev: new Date(Date.now() + 1000).toISOString() }, p_gone: false });
    assert.equal((await call('fm_push_batch', { p_secret: 's3cret' })).devices[0].nudges.length, 0, 'seen nudges are not sent again');
    await db.exec('set role anon'); await assert.rejects(db.query('select * from fm_push'), /permission/); await assert.rejects(db.query('select * from fm_push_keys'), /permission/); await db.exec('reset role');
    await call('fm_push_save', { p_id: r.id, p_secret: r.secret, p_token: '', p_sub: null, p_prefs: null, p_state: null, p_tz: null });
    assert.equal((await call('fm_push_batch', { p_secret: 's3cret' })).devices.length, 0, 'turning off removes the phone');
  });
  await t('run(): sends due pushes and drops dead phones', async () => {
    const r = await call('fm_push_save', { p_id: null, p_secret: null, p_token: a.token, p_sub: sub, p_prefs: {}, p_state: { day: '2026-11-23', score: 10, streak: 4 }, p_tz: -300 });
    const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); const v = crypto.createECDH('prime256v1'); v.generateKeys();
    await db.exec(`update fm_push set sub = '${JSON.stringify({ endpoint: 'https://web.push.apple.com/x', keys: { p256dh: b64u.enc(ua.getPublicKey()), auth: b64u.enc(crypto.randomBytes(16)) } })}'::jsonb; delete from fm_push_keys where k in ('public', 'private');`); void v;
    const hits = [];
    const f = async (url, init) => {
      if (url.startsWith('https://web.push')) { hits.push(init.headers); return { status: 410 }; }
      const fn = url.split('/rpc/')[1], args = JSON.parse(init.body); return { json: async () => call(fn, args) };
    };
    const out = await run('s3cret', { url: 'https://db', key: 'anon' }, f, Date.UTC(2026, 10, 24, 2, 5));
    assert.equal(out.ok, true); assert.ok(hits.length >= 1); assert.match(hits[0].Authorization, /^vapid t=/); assert.equal(out.gone, 1);
    assert.equal((await call('fm_push_batch', { p_secret: 's3cret' })).devices.length, 0, 'gone phone removed');
    assert.match((await call('fm_push_vapid', {})).key, /^[A-Za-z0-9_-]{87}$/, 'first run made a real key pair');
    const hits2 = [];
    await call('fm_push_save', { p_id: null, p_secret: null, p_token: '', p_sub: { endpoint: 'https://web.push.apple.com/y', keys: { p256dh: b64u.enc(ua.getPublicKey()), auth: b64u.enc(crypto.randomBytes(16)) } }, p_prefs: {}, p_state: {}, p_tz: 0 });
    const id2 = (await call('fm_push_batch', { p_secret: 's3cret' })).devices[0].id;
    const f2 = async (url, init) => { if (url.startsWith('https://web.push')) { hits2.push(url); return { status: 201 }; } const fn = url.split('/rpc/')[1]; return { json: async () => call(fn, JSON.parse(init.body)) }; };
    const o2 = await run('s3cret', { url: 'https://db', key: 'anon' }, f2, Date.UTC(2026, 10, 24, 15, 0), { only: id2, test: true });
    assert.equal(o2.sent, 1, 'a test push goes out at any hour'); assert.equal(hits2[0], 'https://web.push.apple.com/y');
    void r;
  });
}
console.log('all push tests passed');
