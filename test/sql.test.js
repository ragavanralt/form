// Friends server tests: runs supabase/form-schema.sql in PGlite (in-process Postgres) and calls the functions as the anon role.
// Needs PGlite: npm i --no-save @electric-sql/pglite. Skips cleanly when it isn't installed.
import fs from 'node:fs';
let PGlite, pgcrypto;
try { ({ PGlite } = await import('@electric-sql/pglite')); ({ pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto')); }
catch (e) { console.log('skip: PGlite not installed (npm i --no-save @electric-sql/pglite)'); process.exit(0); }

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec('create schema if not exists extensions; create role anon nologin;');
const sql = fs.readFileSync(new URL('../supabase/form-schema.sql', import.meta.url), 'utf8');
await db.exec(sql); await db.exec(sql); // must be safe to run twice
const call = async (fn, args) => {
  const keys = Object.keys(args); const ph = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
  await db.exec('set role anon');
  try { const r = await db.query(`select ${fn}(${ph}) as r`, keys.map(k => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))); return r.rows[0].r; }
  finally { await db.exec('reset role'); }
};
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok', m); };

ok((await call('fm_ping', {})).ok, 'ping');
const a = await call('fm_signup', { p_handle: 'alex', p_display: 'Alex', p_avatar: { e: '🦁', bg: 0 }, p_device: 'test' });
ok(a.ok && a.token && a.code, 'signup');
ok(!(await call('fm_signup', { p_handle: 'alex', p_display: 'x', p_avatar: {}, p_device: '' })).ok, 'duplicate handle rejected');
ok(!(await call('fm_signup', { p_handle: 'A!', p_display: 'x', p_avatar: {}, p_device: '' })).ok, 'bad handle rejected');
const b = await call('fm_signup', { p_handle: 'sam', p_display: 'Sam', p_avatar: {}, p_device: '' });
ok((await call('fm_login', { p_handle: 'alex', p_code: a.code.toLowerCase(), p_device: 'phone' })).ok, 'login with code (any case)');
ok(!(await call('fm_login', { p_handle: 'alex', p_code: 'nope', p_device: '' })).ok, 'bad code rejected');
ok((await call('fm_add_friend', { p_token: a.token, p_handle: 'sam' })).status === 'pending', 'friend request');
let fl = await call('fm_friends_list', { p_token: b.token });
ok(fl.incoming.length === 1 && fl.friends.length === 0, 'incoming request visible');
ok((await call('fm_add_friend', { p_token: b.token, p_handle: 'alex' })).status === 'accepted', 'adding back accepts');
fl = await call('fm_friends_list', { p_token: a.token });
ok(fl.friends.length === 1 && fl.friends[0].handle === 'sam', 'friends list');
await call('fm_update', { p_token: b.token, p_display: null, p_avatar: null, p_stats: { day: '2026-11-17', score: 80, week: 300 } });
fl = await call('fm_friends_list', { p_token: a.token });
ok(fl.friends[0].stats.score === 80, 'stats visible to a friend');
const p = await call('fm_post', { p_token: b.token, p_kind: 'workout', p_day: '2026-11-17', p_ref: 'w1', p_data: { name: 'Push', vol: 9000 } });
ok(p.ok, 'post');
const p2 = await call('fm_post', { p_token: b.token, p_kind: 'workout', p_day: '2026-11-17', p_ref: 'w1', p_data: { name: 'Push', vol: 9500 } });
ok(p2.id === p.id, 're-posting updates the same event');
ok(!(await call('fm_post', { p_token: b.token, p_kind: 'hack', p_day: '2026-11-17', p_ref: '', p_data: {} })).ok, 'unknown kind rejected');
let f = await call('fm_feed', { p_token: a.token, p_before: null, p_limit: 40 });
ok(f.items.length === 1 && f.items[0].data.vol === 9500 && !f.items[0].mine, 'feed shows a friend’s post');
ok((await call('fm_react', { p_token: a.token, p_event: p.id, p_emoji: '🔥' })).ok, 'react');
f = await call('fm_feed', { p_token: b.token, p_before: null, p_limit: 40 });
ok(f.items[0].reactions['🔥'] === 1 && f.items[0].mine, 'reaction counted');
ok((await call('fm_nudge', { p_token: a.token, p_handle: 'sam', p_kind: 'nudge', p_msg: 'go' })).ok, 'nudge');
ok(!(await call('fm_nudge', { p_token: a.token, p_handle: 'sam', p_kind: 'nudge', p_msg: 'go' })).ok, 'repeat nudge throttled');
const c = await call('fm_signup', { p_handle: 'stranger', p_display: 'S', p_avatar: {}, p_device: '' });
ok(!(await call('fm_nudge', { p_token: c.token, p_handle: 'sam', p_kind: 'nudge', p_msg: '' })).ok, 'stranger cannot nudge');
f = await call('fm_feed', { p_token: c.token, p_before: null, p_limit: 40 });
ok(f.items.length === 0, 'stranger sees an empty feed');
ok(!(await call('fm_react', { p_token: c.token, p_event: p.id, p_emoji: '🔥' })).ok, 'stranger cannot react');
const inb = await call('fm_inbox', { p_token: b.token });
ok(inb.nudges.length === 1 && inb.reactions.length === 1 && inb.nudges[0].new, 'inbox has the nudge and reaction');
await call('fm_inbox_seen', { p_token: b.token });
let threw = false; try { await call('fm_feed', { p_token: 'bad', p_before: null, p_limit: 5 }); } catch (e) { threw = /bad_token/.test(e.message); }
ok(threw, 'bad token is refused');
await db.exec('set role anon'); let denied = false; try { await db.query('select * from fm_users'); } catch (e) { denied = true; } await db.exec('reset role');
ok(denied, 'anon cannot read tables directly');
ok((await call('fm_delete_me', { p_token: c.token })).ok, 'delete account');
if (fails) { console.error(fails + ' failed'); process.exit(1); }
console.log('all SQL tests passed');
