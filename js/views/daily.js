// Today's extras: the Build card, the Daily Drop, rewards, and you-vs-last-week. Each one can be switched off.
import { S, R, save, touch, render, build, on, week, scoreOf } from '../store.js';
import { todayK, addDays, wkStart, fmt, esc, pdk, WIN } from '../core.js';
import { A, I, $, openSheet, setSheet, closeSheet, toast, haptic, confetti, avatar, FRAME_BG } from '../ui.js';
import { buildMap } from '../body.js';
import { heatOf, daysAgo, WEEK_SETS, setsFor } from '../build.js';
import { dropFor, dropsDone, swapDrop } from '../drop.js';
import { grant, openCrate, unopened, owned, rarityOf, itemName, TITLES, FRAMES } from '../loot.js';
import { findEx, allEx, MUSCLES } from '../exercises.js';
import { exDrawing } from '../draw.js';
import { setDropText } from '../push.js';
setDropText(() => { const d = dropFor(S, todayK(), false); return d ? d.t : ''; });

/* ---------- the Build ---------- */
export function buildCard() {
  if (!on('build') || !S.modules.train) return '';
  const b = build(), heat = heatOf(b);
  if (!b.sessions) return `<button class="card buildc" data-act="buildSheet"><div class="chd2"><span>Your build</span><b class="faint small">Level 0</b></div><div class="bmap">${buildMap(heat, { labels: false })}</div><p class="muted small center" style="margin:4px 0 0">Finish a workout and the muscles you trained light up.</p></button>`;
  const cool = b.cooling[0], top = b.top;
  return `<div class="card buildc"><button class="chd2" data-act="buildSheet" style="width:100%"><span>Your build</span><b>${b.total}<small> total level</small></b></button>
    <div class="bmap">${buildMap(heat, { labels: false })}</div>
    <div class="bfoot">${top ? `<button class="bchip" data-act="muscle" data-arg="${top.id}"><i class="dot hot"></i>${esc(top.n)} <b>${top.level}</b></button>` : ''}${cool ? `<button class="bchip" data-act="muscle" data-arg="${cool.id}"><i class="dot cold"></i>${esc(cool.n)} cooling · ${cool.days}d</button>` : `<span class="bchip"><i class="dot ok"></i>Nothing cooling off</span>`}</div></div>`;
}
A.buildSheet = () => {
  const b = build(), heat = heatOf(b);
  const rows = b.list.slice().sort((a, c) => c.level - a.level || c.sets - a.sets);
  openSheet('build', 'Your build', `<p class="muted small" style="margin-top:-6px">Every hard set levels up the muscles it works (half for helpers). Levels never drop. Muscles you skip fade on the map until you train them again.</p>
  <div class="exhero">${buildMap(heat)}</div>
  <div class="list mt">${rows.map(x => `<button class="li noic" data-act="muscle" data-arg="${x.id}"><span><span class="t">${esc(x.n)} <span class="faint">· Lv ${x.level}</span></span><span class="s">${x.sets ? `${Math.round(x.week)} sets this week · ${daysAgo(x.days)}` : 'Not trained yet'}</span></span><span class="r"><span class="pbar c-accent" style="width:64px;height:6px;display:inline-block"><i style="width:${Math.round(x.frac * 100)}%"></i></span></span></button>`).join('')}</div>`, { full: true });
};
A.muscle = id => {
  const b = build(), x = b.m[id]; if (!x) return;
  const ex = allEx(S.customEx).filter(e => e.p[0] === id).slice(0, 6);
  const toNext = Math.max(0, Math.ceil(setsFor(x.level + 1) - x.sets));
  openSheet('muscle', esc(x.n), `<div class="g3"><div class="stat center"><small>Level</small><b class="n">${x.level}</b></div><div class="stat center"><small>This week</small><b class="n">${Math.round(x.week)}<span class="faint small">/${WEEK_SETS}</span></b></div><div class="stat center"><small>Last trained</small><b class="n" style="font-size:16px">${daysAgo(x.days)}</b></div></div>
  <div class="pbar c-accent mt" style="height:8px"><i style="width:${Math.round(x.frac * 100)}%"></i></div><p class="faint small" style="margin:6px 0 0">${toNext} more set${toNext === 1 ? '' : 's'} to level ${x.level + 1}. About ${WEEK_SETS} hard sets a week is a strong dose for most people.</p>
  ${ex.length ? `<div class="sec"><div class="lab">Good picks</div><div class="list">${ex.map(e => `<button class="exrow" data-act="exDetail" data-arg="${esc(e.n)}"><span class="th">${exDrawing(e)}</span><span><b>${esc(e.n)}</b><span>${e.e}</span></span><span class="chev">${I.chev}</span></button>`).join('')}</div></div>` : ''}`);
};

/* ---------- Daily Drop ---------- */
export function dropCard() {
  if (!on('drop') || R.day !== todayK()) return '';
  const d = dropFor(S, todayK()); if (!d) return '';
  if (!d.rec.saved) { d.rec.saved = 1; setTimeout(save, 0); }
  if (d.done && !d.rec.done) setTimeout(() => dropDone(d), 50);
  const n = unopened(S).length;
  return `<div class="card dropc ${d.done ? 'done' : ''}" data-act="dropGo" role="button"><div class="dtop"><span class="dlab">${I.bolt}Today’s drop</span>${d.done ? '<span class="faint small">Done</span>' : d.rec.sw ? '<span class="faint small">Ends at midnight</span>' : '<button class="link small" data-act="dropSwap">Swap</button>'}</div>
    <b class="dt">${esc(d.t)}</b><span class="ds">${esc(d.s)}</span>
    <div class="pbar c-accent" style="height:6px;margin-top:10px"><i style="width:${Math.round(d.prog * 100)}%"></i></div>
    ${on('loot') && n ? `<button class="btn sm wide mt" data-act="rewards">${I.star} Open your reward${n > 1 ? 's (' + n + ')' : ''}</button>` : ''}</div>`;
}
// Tapping the drop takes you straight to whatever logs it.
const DROP_GO = { beat: 'startPlanned', volume: 'startPlanned', cold: 'pickWorkout', protein: 'log', window: 'log', steps: 'steps', cardio: 'cardio', weigh: 'weight', score: 'closeDay' };
A.dropGo = () => {
  const d = dropFor(S, todayK()); if (!d || d.done) return;
  if (d.id === 'water') { A.water(250); toast('+250 ml water'); return; }
  const f = A[DROP_GO[d.id]]; if (f) f();
};
A.dropSwap = () => { const d = swapDrop(S); if (!d) return; save(); render(); toast('New drop: ' + d.t); };
function dropDone(d) {
  if (d.rec.done) return;
  d.rec.done = true; d.rec.at = Date.now();
  haptic([20, 40, 20]); confetti(70);
  if (on('loot')) { grant(S); toast('Drop done. You earned a reward'); } else toast('Daily Drop done');
  save(); render();
}

/* ---------- rewards ---------- */
export function checkRewards() { if (!on('loot')) return 0; const n = grant(S).length; if (n) save(); return n; }
A.rewards = () => {
  checkRewards();
  const crates = unopened(S), eq = S.profile.avatar || {};
  const titles = owned(S, 'title'), frames = owned(S, 'frame'), fz = owned(S, 'freeze').length;
  openSheet('rewards', 'Rewards', `<p class="muted small" style="margin-top:-6px">Earned for finishing a Daily Drop or a week with 5+ wins. ${dropsDone(S)} drop${dropsDone(S) === 1 ? '' : 's'} done so far.</p>
  ${crates.length ? `<div class="crates">${crates.map(c => `<button class="crate" data-act="crateOpen" data-arg="${c.id}"><span class="cbox">${I.star}</span><b>Tap to open</b><span>${esc(c.why)}</span></button>`).join('')}</div>` : '<div class="card empty" style="padding:18px">' + I.star + '<span class="small">Nothing to open. Finish today’s drop for the next one.</span></div>'}
  <div class="sec"><div class="lab">Title${titles.length ? 's' : ''}</div>${titles.length ? `<div class="chips">${['', ...titles].map(t => `<button class="chip ${(eq.ti || '') === t ? 'on' : ''}" data-act="equip" data-arg="ti|${esc(t)}">${t ? esc(t) : 'None'}</button>`).join('')}</div>` : '<p class="faint small">None yet.</p>'}</div>
  <div class="sec"><div class="lab">Avatar frames</div><div class="frames">${['', ...Object.keys(FRAMES)].map(f => { const have = !f || frames.includes(f); return `<button class="${(eq.f || '') === f ? 'on' : ''} ${have ? '' : 'lock'}" ${have ? `data-act="equip" data-arg="f|${f}"` : 'disabled'} aria-label="${f ? FRAMES[f][0] : 'No frame'}">${avatar({ ...eq, f }, 'md', S.profile.name)}<small>${f ? FRAMES[f][0] : 'None'}</small></button>`; }).join('')}</div></div>
  <div class="li noic mt"><span><span class="t">Streak freezes from rewards</span><span class="s">Used automatically on a missed day</span></span><span class="r b">${fz}</span></div>`, { full: true });
};
A.crateOpen = id => {
  const c = openCrate(S, id); if (!c || !c.item) return;
  save(); haptic([15, 30, 15]);
  const it = c.item, rar = rarityOf(it);
  const look = it.kind === 'frame' ? avatar({ ...(S.profile.avatar || {}), f: it.v }, 'lg', S.profile.name) : it.kind === 'freeze' ? `<span class="fzi">❄️</span>` : `<span class="tti">${I.medal}</span>`;
  if (rar !== 'Common') confetti(rar === 'Epic' ? 140 : 70);
  setSheet(`<div class="reveal r-${rar.toLowerCase()}"><div class="rcard">${look}<small>${rar}</small><b>${esc(itemName(it))}</b><span class="muted small">${it.kind === 'title' ? 'Shows under your name for friends' : it.kind === 'frame' ? 'A ring around your avatar' : 'Saves your streak on one missed day'}</span></div></div>
  <div class="row mt2">${it.kind !== 'freeze' ? `<button class="btn grow" data-act="equip" data-arg="${it.kind === 'title' ? 'ti' : 'f'}|${esc(it.v)}">Use it</button>` : ''}<button class="btn ${it.kind !== 'freeze' ? 'ghost' : ''} grow" data-act="rewards">${unopened(S).length ? 'Next' : 'Done'}</button></div>`);
};
A.equip = a => { const [k, v] = a.split('|'); S.profile.avatar = { ...(S.profile.avatar || {}), [k]: v || undefined }; if (!v) delete S.profile.avatar[k]; touch(); render(); A.rewards(); toast(v ? 'Equipped' : 'Removed'); import('./friends.js').then(m => m.syncStats(true)).catch(() => {}); };

/* ---------- you vs last week ---------- */
export function ghostWeekCard() {
  if (!on('ghost') || R.day !== todayK()) return '';
  const t = todayK(), ws = wkStart(t), i = Math.round((pdk(t) - pdk(ws)) / 864e5);
  const now = week(), prev = week(addDays(ws, -7));
  if (!prev.days) return '';
  const pts = now.out.slice(0, i + 1).reduce((a, s) => a + (s ? s.total : 0), 0), was = prev.out.slice(0, i + 1).reduce((a, s) => a + (s ? s.total : 0), 0);
  const tot = Math.max(pts, was, 1), lead = pts - was, today = scoreOf(t).total, need = Math.max(0, was - pts + 1);
  return `<div class="card ghostc"><div class="chd2"><span>You vs last week</span><b class="small ${lead >= 0 ? 'up' : 'down'}">${lead >= 0 ? '+' : ''}${fmt(lead)}</b></div>
    <div class="lane"><span>This week</span><div class="track"><i style="width:${(pts / tot) * 100}%;background:var(--acc)"></i></div><b class="n">${fmt(pts)}</b></div>
    <div class="lane ghost"><span>Last week</span><div class="track"><i style="width:${(was / tot) * 100}%"></i></div><b class="n">${fmt(was)}</b></div>
    <p class="faint small" style="margin:8px 0 0">${lead >= 0 ? `Ahead of where you were by ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]} last week.` : `${need} more point${need === 1 ? '' : 's'} today to pass last week’s you${today ? '' : '. Today hasn’t started'}.`}</p></div>`;
}
export { WIN };
