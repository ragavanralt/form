// Friends: account, weekly league, head-to-head, feed with reactions, nudges/flexes, "while you were away", day recap.
import { S, R, get, day, touch, render, scoreOf, streak, level, week, hist, afterSave, save } from '../store.js';
import { todayK, addDays, wkStart, pdk, esc, fmt, num, tierOf, TIER_L, WIN, rankOf, liftDone, achievements } from '../core.js';
import { A, CH, I, $, openSheet, setSheet, closeSheet, toast, haptic, avatar, ago, share, confetti, AV_EMO, AV_BG } from '../ui.js';
import { Social, ping, signup, login, logout, updateMe, loadFriends, addFriend, respond, loadFeed, post, react, nudge, loadInbox, inboxSeen, socialErr, deleteMe } from '../social.js';
import { findEx, MUSCLES } from '../exercises.js';

const RX = ['🔥', '💪', '👏', '😤'];
const F = { tab: 'feed', loading: false, err: '' };
const name = u => esc((u && (u.display || u.handle)) || 'Someone');
const first = u => esc(((u && (u.display || u.handle)) || 'They').split(' ')[0]);

export function vFriends() {
  const el = $('#v-friends');
  let h = `<div class="top"><div><div class="sub">${Social.on ? '@' + esc(Social.auth.me.handle) : 'Train together'}</div><h1>Friends</h1></div>${Social.on ? `<div class="row"><button class="iconbtn" data-act="inviteSheet" aria-label="Add friends">${I.plus}</button><button class="iconbtn" data-act="refreshSocial" aria-label="Refresh">${I.swap}</button></div>` : ''}</div>`;
  if (!Social.on) { el.innerHTML = h + joinHTML(); return; }
  const inb = Social.inbox || {};
  const req = (inb.requests || Social.incoming || []);
  if (req.length) h += `<div class="card"><div class="chd"><h3>Friend requests</h3></div><div class="list">${req.map(u => `<div class="li">${avatar(u.avatar, 'md', u.display)}<span><span class="t">${name(u)}</span><span class="s">@${esc(u.handle)}</span></span><span class="row" style="gap:6px"><button class="btn xs" data-act="frAccept" data-arg="${esc(u.handle)}">Accept</button><button class="btn xs ghost" data-act="frDecline" data-arg="${esc(u.handle)}">${I.x}</button></span></div>`).join('')}</div></div>`;
  if (!Social.friends.length && !req.length) h += `<div class="card empty">${I.users}<b>Add your first friend</b><span class="small">Share your invite link. When they join, you’ll see each other’s workouts, nudge each other and race the weekly league.</span><button class="btn sm" data-act="inviteSheet">Invite friends</button></div>`;
  else h += vsCard() + leagueCard();
  h += `<div class="seg">${[['feed', 'Feed'], ['inbox', 'Inbox' + (newCount() ? ' · ' + newCount() : '')]].map(([k, n]) => `<button class="${F.tab === k ? 'on' : ''}" data-act="frTab" data-arg="${k}">${n}</button>`).join('')}</div>`;
  h += F.tab === 'feed' ? feedHTML() : inboxHTML();
  el.innerHTML = h;
}
const newCount = () => { const i = Social.inbox || {}; return (i.nudges || []).filter(x => x.new).length + (i.reactions || []).filter(x => x.new).length; };

function joinHTML() {
  if (Social.status === 'nosetup') return `<div class="card"><div class="empty">${I.users}<b>Friends server not set up yet</b><span class="small">Everything else works on your own. To turn on friends, run <code>supabase/form-schema.sql</code> once in your Supabase project (SQL Editor → Run). It takes about a minute.</span><button class="btn sm ghost" data-act="refreshSocial">Check again</button></div></div>`;
  if (Social.status === 'down') return `<div class="card"><div class="empty">${I.users}<b>Can’t reach the friends server</b><span class="small">You might be offline. Everything you log is saved on this phone.</span><button class="btn sm ghost" data-act="refreshSocial">Try again</button></div></div>`;
  return `<div class="card" style="background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--acc) 28%,transparent),transparent 60%),var(--s1)">
    <div class="col" style="gap:14px"><div class="feat"><span class="fi">${I.bell}</span><span><b>Know when they train</b><span>Open the app and see who hit a workout, who closed their day, who’s slacking.</span></span></div>
    <div class="feat"><span class="fi">${I.wave}</span><span><b>Nudge, cheer, flex</b><span>One tap to push a friend, or show off a PR.</span></span></div>
    <div class="feat"><span class="fi">${I.trophy}</span><span><b>Weekly league</b><span>Day scores add up. Highest week wins. Resets every Monday.</span></span></div>
    <div class="feat"><span class="fi">${I.target}</span><span><b>You choose what’s shared</b><span>Scores and workouts by default. Meals and weight stay private unless you say so.</span></span></div></div>
    <div class="col mt2"><button class="btn wide" data-act="joinSheet">Create your profile</button><button class="btn ghost wide" data-act="loginSheet">I already have one</button></div></div>`;
}
A.joinSheet = () => {
  const a = S.profile.avatar || { e: AV_EMO[0], bg: 0 }; S.profile.avatar = a;
  openSheet('join', 'Your profile', `<div class="center">${avatar(a, 'lg')}</div><div class="avpick mt">${AV_EMO.map(e => `<button class="${a.e === e ? 'on' : ''}" data-act="avE" data-arg="${e}">${e}</button>`).join('')}</div><div class="swatches mt" style="justify-content:center">${AV_BG.map((b, i) => `<button style="background:${b}" class="${a.bg === i ? 'on' : ''}" data-act="avB" data-arg="${i}" aria-label="Colour ${i + 1}"></button>`).join('')}</div>
  <div class="field mt2"><span>Display name</span><input id="jdn" value="${esc(S.profile.name)}" placeholder="Alex"></div>
  <div class="field mt"><span>Username</span><input id="jh" placeholder="alex_lifts" autocapitalize="off" autocorrect="off" value="${esc((S.profile.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16))}"></div>
  <p class="faint small">Friends add you by username. You’ll get a sign-in code for your other devices.</p><div id="jerr"></div><button class="btn wide mt" data-act="joinGo">Create profile</button>`);
};
A.avE = e => { S.profile.avatar.e = e; const v = [$('#jdn') && $('#jdn').value, $('#jh') && $('#jh').value]; A.joinSheet(); if (v[0] != null) { $('#jdn').value = v[0]; $('#jh').value = v[1]; } };
A.avB = i => { S.profile.avatar.bg = +i; const v = [$('#jdn').value, $('#jh').value]; A.joinSheet(); $('#jdn').value = v[0]; $('#jh').value = v[1]; };
A.joinGo = async (a, btn) => {
  const dn = $('#jdn').value.trim(), hd = $('#jh').value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(hd)) { $('#jerr').innerHTML = `<div class="err">${socialErr({ code: 'handle_format' })}</div>`; return; }
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    const r = await signup(hd, dn || hd, S.profile.avatar);
    if (dn) S.profile.name = S.profile.name || dn; S.profile.social = 'friends'; save();
    await syncStats(true); await loadFriends();
    setSheet(`<div class="center col" style="align-items:center"><div class="badge-big">${I.check}</div><h3 style="font-size:22px">You’re in, @${esc(hd)}</h3><p class="muted small">Your sign-in code for other devices. Screenshot it or save it in your passwords.</p><div style="font-size:30px;font-weight:800;letter-spacing:.12em;background:var(--s2);border-radius:14px;padding:12px 18px" class="n">${esc(r.code)}</div><button class="btn wide mt" data-act="inviteSheet">Invite friends</button><button class="btn ghost wide" data-act="closeSheet">Later</button></div>`);
    render();
  } catch (e) { btn.disabled = false; btn.textContent = 'Create profile'; $('#jerr').innerHTML = `<div class="err">${esc(socialErr(e))}</div>`; }
};
A.loginSheet = () => openSheet('login', 'Sign in', `<div class="field"><span>Username</span><input id="lh" autocapitalize="off" autocorrect="off"></div><div class="field mt"><span>Sign-in code</span><input id="lc" autocapitalize="characters" style="letter-spacing:.1em"></div><div id="lerr"></div><button class="btn wide mt2" data-act="loginGo">Sign in</button>`);
A.loginGo = async (a, btn) => { btn.disabled = true; try { await login($('#lh').value, $('#lc').value); S.profile.social = 'friends'; save(); closeSheet(); await refresh(); toast('Signed in'); } catch (e) { btn.disabled = false; $('#lerr').innerHTML = `<div class="err mt">${esc(socialErr(e))}</div>`; } };

/* ---------- invite ---------- */
const link = () => location.origin + location.pathname.replace(/[^/]*$/, '') + '?add=' + encodeURIComponent(Social.auth.me.handle);
A.inviteSheet = () => openSheet('invite', 'Add friends', `<div class="card tight" style="background:var(--s2)"><div class="faint small">Your invite link</div><div class="ell b" style="margin-top:2px">${esc(link())}</div></div>
  <div class="row mt"><button class="btn grow" data-act="shareInvite">${I.share} Share link</button><button class="btn ghost" data-act="copyInvite" aria-label="Copy">${I.copy}</button></div>
  <div class="sec"><div class="lab">Or add by username</div><div class="row"><input id="addh" placeholder="username" autocapitalize="off" autocorrect="off"><button class="btn" data-act="addGo">Add</button></div><div id="adderr"></div></div>
  ${Social.outgoing.length ? `<div class="sec"><div class="lab">Waiting on</div><div class="list">${Social.outgoing.map(u => `<div class="li">${avatar(u.avatar, 'sm', u.display)}<span><span class="t">${name(u)}</span><span class="s">@${esc(u.handle)}</span></span><span class="pill">Pending</span></div>`).join('')}</div></div>` : ''}`);
A.shareInvite = () => share(`Add me on Form, the fitness app I’m using. Let’s keep each other honest: ${link()}`, 'Join me on Form');
A.copyInvite = async () => { try { await navigator.clipboard.writeText(link()); toast('Link copied'); } catch (e) { toast('Copy failed'); } };
A.addGo = async (a, btn) => { const hd = ($('#addh').value || '').trim().replace(/^@/, ''); if (!hd) return; btn.disabled = true; try { const r = await addFriend(hd); toast(r.status === 'accepted' ? 'You’re now friends' : 'Request sent'); await loadFriends(); A.inviteSheet(); render(); } catch (e) { btn.disabled = false; $('#adderr').innerHTML = `<div class="err mt">${esc(socialErr(e))}</div>`; } };
export async function handleAddParam() {
  const p = new URLSearchParams(location.search).get('add'); if (!p) return;
  history.replaceState(null, '', location.pathname);
  if (!Social.on) { S._pendingAdd = p; toast('Create your profile to add @' + p); return; }
  if (Social.auth.me.handle === p) return;
  try { const r = await addFriend(p); toast(r.status === 'accepted' ? 'You and @' + p + ' are now friends' : 'Friend request sent to @' + p); await loadFriends(); render(); } catch (e) { toast(socialErr(e)); }
}
A.frAccept = async h => { try { await respond(h, true); haptic(); toast('Friend added'); await refresh(); } catch (e) { toast(socialErr(e)); } };
A.frDecline = async h => { try { await respond(h, false); await refresh(); } catch (e) { toast(socialErr(e)); } };

/* ---------- league + head to head ---------- */
function myWeekStats() { const w = week(); return { pts: w.pts, W: w.W }; }
const fWeek = f => { const s = f.stats || {}; return s.ws === wkStart(todayK()) ? s.week || 0 : 0; };
function leagueCard() {
  const me = Social.auth.me, mw = myWeekStats().pts;
  const rows = [{ u: me, pts: mw, me: true }, ...Social.friends.map(f => ({ u: f, pts: fWeek(f) }))].sort((a, b) => b.pts - a.pts);
  const daysLeft = 7 - ((new Date().getDay() + 6) % 7) - 1;
  return `<div class="card"><div class="chd"><h3>${I.trophy} Weekly league</h3><span class="r">${daysLeft ? daysLeft + ' day' + (daysLeft > 1 ? 's' : '') + ' left' : 'Last day'}</span></div><div class="lb">${rows.map((r, i) => `<button class="lbr ${r.me ? 'me' : ''}" ${r.me ? '' : `data-act="friend" data-arg="${esc(r.u.handle)}"`} style="text-align:left;width:100%"><span class="rk">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>${avatar(r.u.avatar, 'sm', r.u.display)}<span><b>${r.me ? 'You' : name(r.u)}</b><span style="display:block">${r.me ? streak().streak + ' day streak' : statLine(r.u)}</span></span><span class="pts">${fmt(r.pts)}</span></button>`).join('')}</div></div>`;
}
function statLine(f) { const s = f.stats || {}; const parts = []; if (s.day === todayK()) parts.push(s.score + ' today'); if (s.streak) parts.push(s.streak + '🔥'); if (s.lastWo === todayK()) parts.push('trained'); return parts.join(' · ') || 'Quiet today'; }
function vsCard() {
  if (!Social.friends.length) return '';
  const mw = myWeekStats().pts;
  const rival = Social.friends.slice().sort((a, b) => Math.abs(fWeek(a) - mw) - Math.abs(fWeek(b) - mw))[0];
  const rw = fWeek(rival), me = Social.auth.me, tot = mw + rw || 1;
  const lead = mw - rw, rs = rival.stats || {};
  const myDay = scoreOf(todayK()).total, theirDay = rs.day === todayK() ? rs.score || 0 : 0;
  const msg = lead > 0 ? `You’re up ${fmt(lead)} on ${first(rival)} this week.` : lead < 0 ? `${first(rival)} is ${fmt(-lead)} ahead. ${theirDay > myDay ? 'They’re winning today too.' : 'Today’s your chance.'}` : 'Dead even this week.';
  return `<div class="card"><div class="chd"><h3>Head to head</h3><span class="r">This week</span></div>
  <div class="vs"><div class="side">${avatar(me.avatar, 'md', me.display)}<b class="n">${fmt(mw)}</b><span>You · ${myDay} today</span></div><div class="mid">VS</div><button class="side" data-act="friend" data-arg="${esc(rival.handle)}">${avatar(rival.avatar, 'md', rival.display)}<b class="n">${fmt(rw)}</b><span>${first(rival)} · ${theirDay} today</span></button></div>
  <div class="vsbar"><i style="width:${(mw / tot) * 100}%;background:var(--acc)"></i><i style="width:${(rw / tot) * 100}%;background:var(--ink3)"></i></div>
  <p class="muted small" style="margin:12px 0 0">${msg}</p>
  <div class="row mt">${lead >= 0 ? `<button class="btn sm grow" data-act="sendNudge" data-arg="${esc(rival.handle)}|flex">💪 Flex on ${first(rival)}</button>` : ''}<button class="btn sm ${lead >= 0 ? 'ghost' : ''} grow" data-act="sendNudge" data-arg="${esc(rival.handle)}|nudge">👀 Nudge</button></div></div>`;
}

/* ---------- feed ---------- */
function feedHTML() {
  if (F.loading && !Social.feed.length) return `<div class="col"><div class="skel" style="height:120px"></div><div class="skel" style="height:120px"></div></div>`;
  if (!Social.feed.length) return `<div class="empty">${I.list}<span>Workouts, PRs, streaks and closed days from you and your friends land here.</span></div>`;
  return `<div class="feed">${Social.feed.map(postHTML).join('')}</div>`;
}
function postHTML(p) {
  const u = p.user, d = p.data || {};
  let body = '';
  if (p.kind === 'workout') body = `<h4>${esc(d.name || 'Workout')}</h4><div class="kv">${d.min ? `<div><small>Time</small><b>${d.min} min</b></div>` : ''}<div><small>Volume</small><b>${fmt(d.vol || 0)} ${esc(d.unit || 'kg')}</b></div><div><small>Sets</small><b>${d.sets || 0}</b></div></div>${(d.prs || []).length ? `<div class="prs">${d.prs.slice(0, 4).map(x => `<span class="prtag" style="margin:0">PR ${esc(x.n)} ${x.w}×${x.r}</span>`).join('')}</div>` : ''}${(d.muscles || []).length ? `<div class="row wrap mt" style="gap:5px">${d.muscles.slice(0, 5).map(m => `<span class="pill">${esc(MUSCLES[m] || m)}</span>`).join('')}</div>` : ''}`;
  else if (p.kind === 'day') body = `<h4>${d.score >= WIN ? 'Won the day' : 'Closed out the day'} · ${d.score}</h4><span class="muted small">${d.streak ? d.streak + ' day streak' : ''}${d.parts ? ' · ' + esc(d.parts) : ''}</span>`;
  else if (p.kind === 'streak') body = `<h4>🔥 ${d.n} day streak</h4>`;
  else if (p.kind === 'level') body = `<h4>Reached level ${d.level}</h4><span class="muted small">${esc(d.rank || '')}</span>`;
  else if (p.kind === 'badge') body = `<h4>🏅 ${esc(d.n)}</h4><span class="muted small">${esc(d.d || '')}</span>`;
  else body = `<h4>${esc(p.kind)}</h4>`;
  const rx = p.reactions || {};
  return `<div class="post"><div class="ph">${avatar(u.avatar, 'md', u.display)}<span><b>${p.mine ? 'You' : name(u)}</b><span style="display:block">${ago(p.at)} · ${kindLabel(p.kind)}</span></span>${!p.mine ? `<button class="iconbtn" data-act="friend" data-arg="${esc(u.handle)}" aria-label="Profile">${I.chev}</button>` : ''}</div>
  <div class="body2">${body}</div>
  <div class="reacts">${RX.map(e => `<button class="rx ${p.my === e ? 'on' : ''}" data-act="react" data-arg="${p.id}|${e}">${e}${rx[e] ? ' ' + rx[e] : ''}</button>`).join('')}${(p.by || []).length && p.mine ? `<span class="faint tiny">${esc(p.by.slice(0, 3).join(', '))}${p.by.length > 3 ? ' +' + (p.by.length - 3) : ''}</span>` : ''}</div></div>`;
}
const kindLabel = k => ({ workout: 'Workout', day: 'Day closed', streak: 'Streak', level: 'Level up', badge: 'Badge' })[k] || k;
A.react = async a => {
  const [id, e] = a.split('|'); const p = Social.feed.find(x => String(x.id) === id); if (!p) return;
  const rx = p.reactions = p.reactions || {};
  if (p.my) { rx[p.my] = Math.max(0, (rx[p.my] || 1) - 1); if (!rx[p.my]) delete rx[p.my]; }
  if (p.my === e) p.my = null; else { p.my = e; rx[e] = (rx[e] || 0) + 1; }
  haptic(); vFriends();
  try { await react(+id, e); } catch (err) { toast(socialErr(err)); }
};

/* ---------- inbox ---------- */
function inboxHTML() {
  const i = Social.inbox || {}; const items = [];
  (i.nudges || []).forEach(n => items.push({ at: n.at, new: n.new, h: `${avatar(n.from.avatar, 'sm', n.from.display)}<span><b>${nudgeText(n)}</b><span class="faint small" style="display:block">${ago(n.at)}${n.msg ? ' · “' + esc(n.msg) + '”' : ''}</span></span>${n.kind === 'nudge' || n.kind === 'flex' ? `<button class="btn xs ghost" data-act="sendNudge" data-arg="${esc(n.from.handle)}|${n.kind === 'flex' ? 'flex' : 'cheer'}">${n.kind === 'flex' ? 'Flex back' : 'On it'}</button>` : '<span></span>'}` }));
  (i.reactions || []).forEach(r => items.push({ at: r.at, new: r.new, h: `${avatar(r.from.avatar, 'sm', r.from.display)}<span><b>${name(r.from)} ${esc(r.emoji)} your ${kindLabel(r.kind).toLowerCase()}</b><span class="faint small" style="display:block">${ago(r.at)}${r.data && r.data.name ? ' · ' + esc(r.data.name) : ''}</span></span><span></span>` }));
  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  if (!items.length) return `<div class="empty">${I.bell}<span>Nudges and reactions from friends show up here.</span></div>`;
  return `<div class="card"><div>${items.map(x => `<div class="inb ${x.new ? 'new' : ''}">${x.h}</div>`).join('')}</div></div>`;
}
const nudgeText = n => ({ nudge: `${name(n.from)} nudged you`, flex: `${name(n.from)} is flexing on you`, cheer: `${name(n.from)} is cheering you on`, challenge: `${name(n.from)} challenged you` })[n.kind] || name(n.from);
A.frTab = async t => { F.tab = t; vFriends(); if (t === 'inbox' && newCount()) { try { await inboxSeen(); } catch (e) {} } };

/* ---------- friend profile + nudges ---------- */
A.friend = h => {
  const f = Social.friends.find(x => x.handle === h); if (!f) return;
  const s = f.stats || {}, today = s.day === todayK();
  const posts = Social.feed.filter(p => p.user.handle === h).slice(0, 6);
  const my = scoreOf(todayK()).total;
  openSheet('friend', '', `<div class="center col" style="align-items:center;gap:6px">${avatar(f.avatar, 'lg', f.display)}<h3 style="font-size:24px;margin-top:6px">${name(f)}</h3><span class="faint small">@${esc(f.handle)} · active ${ago(f.last_seen)}</span></div>
  <div class="g3 mt2"><div class="stat center"><small>Today</small><b class="n">${today ? s.score || 0 : '–'}</b></div><div class="stat center"><small>Streak</small><b class="n">${s.streak || 0}🔥</b></div><div class="stat center"><small>Level</small><b class="n">${s.level || 1}</b></div></div>
  <div class="card mt"><div class="vs"><div class="side"><b class="n">${my}</b><span>You today</span></div><div class="mid">VS</div><div class="side"><b class="n">${today ? s.score || 0 : 0}</b><span>${first(f)} today</span></div></div>
  <p class="muted small center" style="margin:10px 0 0">${s.lastWo === todayK() ? `${first(f)} trained today${s.woName ? ' (' + esc(s.woName) + ')' : ''}.` : `${first(f)} hasn’t trained today.`} ${liftDone(get(todayK())) ? 'You have.' : S.modules.train ? 'Neither have you.' : ''}</p></div>
  <div class="g3 mt"><button class="btn ghost" data-act="sendNudge" data-arg="${esc(h)}|nudge">👀 Nudge</button><button class="btn ghost" data-act="sendNudge" data-arg="${esc(h)}|cheer">👏 Cheer</button><button class="btn ghost" data-act="sendNudge" data-arg="${esc(h)}|flex">💪 Flex</button></div>
  ${posts.length ? `<div class="sec"><div class="lab">Recent</div><div class="feed">${posts.map(postHTML).join('')}</div></div>` : ''}`, { full: true });
};
const NUDGE_MSG = {
  nudge: () => liftDone(get(todayK())) ? 'I already trained. Your move.' : 'Get your workout in today.',
  cheer: () => 'You’ve got this.',
  flex: () => { const sc = scoreOf(todayK()).total, st = streak().streak; return `${sc} today, ${st} day streak. Catch me if you can.`; },
};
A.sendNudge = async a => {
  const [h, kind] = a.split('|');
  try { await nudge(h, kind, NUDGE_MSG[kind] ? NUDGE_MSG[kind]() : ''); haptic(20); toast({ nudge: 'Nudge sent', cheer: 'Cheer sent', flex: 'Flex sent' }[kind] || 'Sent'); } catch (e) { toast(socialErr(e)); }
};

/* ---------- syncing stats and posts ---------- */
let statTimer = null, lastStats = '';
export async function syncStats(force) {
  if (!Social.on) return;
  const t = todayK(), sc = scoreOf(t), st = streak(), lv = level(), w = week();
  const d = get(t), share2 = S.settings.share;
  const h = hist(); const last = h.sessions.at(-1);
  const stats = { day: t, score: share2.scores ? sc.total : 0, streak: st.streak, level: lv.level, ws: wkStart(t), week: share2.scores ? w.pts : 0, lastWo: last ? last.date : '', woName: liftDone(d) && share2.workouts ? d.wo.name : '', goal: S.profile.goal };
  const sig = JSON.stringify(stats);
  if (!force && sig === lastStats) return;
  lastStats = sig;
  try { await updateMe({ display: S.profile.name || undefined, avatar: S.profile.avatar, stats }); } catch (e) {}
}
afterSave.push(() => { if (!Social.on) return; clearTimeout(statTimer); statTimer = setTimeout(() => syncStats(), 2500); });
export async function postWorkout(k) {
  if (!Social.on || !S.settings.share.workouts) return;
  const w = get(k).wo; if (!w || w.status !== 'done') return;
  const done = w.ex.flatMap(e => e.sets.filter(s => s.done && s.k !== 'W').map(s => ({ e, s })));
  const prs = S.settings.share.prs ? done.filter(x => x.s.pr).map(x => ({ n: x.e.name, w: num(x.s.w), r: num(x.s.r) })) : [];
  const muscles = [...new Set(w.ex.flatMap(e => (findEx(e.name, S.customEx) || { p: [] }).p))];
  try { await post('workout', k, w.id, { name: w.name, min: w.end && w.start ? Math.round((w.end - w.start) / 60000) : 0, vol: Math.round(done.reduce((a, x) => a + num(x.s.w) * num(x.s.r), 0)), sets: done.length, prs, muscles, unit: S.profile.units }); syncStats(true); loadFeed().then(() => R.cur === 'friends' && vFriends()).catch(() => {}); } catch (e) {}
}
async function postMilestones() {
  if (!Social.on) return;
  const st = streak(), lv = level(), t = todayK();
  const seen = S.seen;
  if ([3, 7, 14, 30, 50, 100, 200, 365].includes(st.streak) && seen.lastStreakPost !== st.streak) { seen.lastStreakPost = st.streak; post('streak', t, String(st.streak), { n: st.streak }).catch(() => {}); }
  if (lv.level > (seen.lastLevelPost || 1)) { seen.lastLevelPost = lv.level; post('level', t, String(lv.level), { level: lv.level, rank: rankOf(lv.level) }).catch(() => {}); }
}

/* ---------- close the day ---------- */
A.closeDay = () => {
  const k = R.day, sc = scoreOf(k), st = streak(), tier = tierOf(sc.total), d = day(k);
  const wasClosed = d.closed;
  if (!d.closed) { d.closed = true; touch(k); }
  if (!wasClosed && sc.total >= WIN) confetti(110);
  const fr = Social.on ? Social.friends.map(f => ({ f, s: (f.stats || {}).day === k ? (f.stats || {}).score || 0 : null })).filter(x => x.s != null).sort((a, b) => b.s - a.s) : [];
  const beat = fr.filter(x => x.s < sc.total).length;
  openSheet('recap', '', `<div class="center col" style="align-items:center;gap:4px"><span class="pill ${tier}">${TIER_L[tier]}</span><div style="font-size:84px;font-weight:800;letter-spacing:-.05em;line-height:1" class="n">${sc.total}</div><span class="muted">${k === todayK() ? 'Today' : pdk(k).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })} · ${st.streak} day streak</span></div>
  <div class="card mt2"><div class="legend">${sc.parts.map(p => `<div class="lg c-${p.c}"><i></i><span>${p.n}</span><b>${Math.round(p.pts)}<span class="faint">/${Math.round(p.w)}</span></b></div>`).join('')}</div></div>
  ${fr.length ? `<div class="card mt"><div class="chd"><h3>Friends today</h3><span class="r">${beat ? 'You beat ' + beat : 'Not your day'}</span></div><div class="list">${fr.slice(0, 5).map(x => `<div class="li">${avatar(x.f.avatar, 'sm', x.f.display)}<span><span class="t">${name(x.f)}</span></span><span class="r b">${x.s}</span></div>`).join('')}</div></div>` : ''}
  <div class="row mt2">${Social.on && S.settings.share.scores ? `<button class="btn grow" data-act="postDay" data-arg="${k}">${I.send} Post to friends</button>` : ''}<button class="btn ${Social.on ? 'ghost' : ''} grow" data-act="shareDay" data-arg="${k}">${I.share} Share</button></div>
  ${wasClosed || k !== todayK() ? '' : '<p class="faint small center mt">You can still log after closing. The score updates.</p>'}`);
  render();
};
A.postDay = async k => { const sc = scoreOf(k); try { await post('day', k, '', { score: sc.total, streak: streak().streak, parts: sc.parts.filter(p => p.f >= 0.99).map(p => p.n).join(', ') }); toast('Posted'); haptic(); closeSheet(); loadFeed().catch(() => {}); } catch (e) { toast(socialErr(e)); } };
A.shareDay = k => { const sc = scoreOf(k), st = streak(); share(`Form: ${sc.total}/100 today (${TIER_L[tierOf(sc.total)]}). ${st.streak} day streak 🔥`); };

/* ---------- refresh + away sheet ---------- */
export async function refresh() {
  if (!Social.on) { await ping(); if (R.cur === 'friends') vFriends(); return; }
  F.loading = true; if (R.cur === 'friends') vFriends();
  try { await Promise.all([loadFriends(), loadFeed(), loadInbox()]); Social.status = 'ready'; } catch (e) { if (e.code === 'nosetup') Social.status = 'nosetup'; else if (e.code === 'down') Social.status = 'down'; }
  F.loading = false; render(); postMilestones();
}
A.refreshSocial = () => refresh();
A.go_friends_hook = () => {};
// On open: show what friends did since you were last here.
export function awaySheet() {
  if (!Social.on || Social.status !== 'ready' || !$('#sheetwrap').hidden || !S.onboarded) return;
  const since = S.seen.feed || 0;
  const items = Social.feed.filter(p => !p.mine && new Date(p.at).getTime() > since && ['workout', 'day', 'streak', 'level'].includes(p.kind));
  const nud = ((Social.inbox || {}).nudges || []).filter(n => n.new);
  S.seen.feed = Date.now(); save();
  if (!items.length && !nud.length) return;
  const me = liftDone(get(todayK())), myScore = scoreOf(todayK()).total;
  const trained = [...new Map(items.filter(p => p.kind === 'workout' && p.day === todayK()).map(p => [p.user.handle, p])).values()];
  openSheet('away', 'While you were away', `${nud.map(n => `<div class="card tight mb"><div class="inb" style="border:0;padding:0">${avatar(n.from.avatar, 'sm', n.from.display)}<span><b>${nudgeText(n)}</b><span class="faint small" style="display:block">${n.msg ? '“' + esc(n.msg) + '”' : ago(n.at)}</span></span><button class="btn xs" data-act="sendNudge" data-arg="${esc(n.from.handle)}|${n.kind === 'flex' ? 'flex' : 'cheer'}">${n.kind === 'flex' ? 'Flex back' : 'Reply'}</button></div></div>`).join('')}
  ${trained.length ? `<div class="card"><div class="chd"><h3>${trained.length === 1 ? first(trained[0].user) + ' trained today' : trained.length + ' friends trained today'}</h3><span class="r">${me ? 'So did you 💪' : 'You haven’t yet'}</span></div><div class="list">${trained.map(p => `<div class="li">${avatar(p.user.avatar, 'sm', p.user.display)}<span><span class="t">${name(p.user)} · ${esc(p.data.name || 'Workout')}</span><span class="s">${fmt(p.data.vol || 0)} ${esc(p.data.unit || 'kg')}${(p.data.prs || []).length ? ' · ' + p.data.prs.length + ' PR' : ''}</span></span><button class="rx" data-act="react" data-arg="${p.id}|🔥">🔥</button></div>`).join('')}</div></div>` : ''}
  ${items.filter(p => p.kind !== 'workout').slice(0, 5).map(postHTML).join('')}
  <div class="row mt2">${!me && S.modules.train ? `<button class="btn grow" data-act="startPlanned">${I.play} Your turn</button>` : `<button class="btn grow" data-act="closeSheet">${myScore >= WIN ? 'Nice. Keep it going' : 'Let’s go'}</button>`}</div>`);
}
export const socialSignOut = async () => { await logout(); render(); };
export const socialDelete = async () => { await deleteMe(); render(); };
