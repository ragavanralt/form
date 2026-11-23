import { S, R, get, day, touch, scoreOf, streak, level, week, on } from '../store.js';
import { todayK, addDays, pdk, esc, fmt, totals, cardioMin, liftDone, nextMoves, routineName, tierOf, TIER_L, WIN, HOLD, MEAL_L, MEALS, DOWL, weightTrend, rankOf } from '../core.js';
import { $, A, CH, I, avatar, haptic, openSheet, closeSheet } from '../ui.js';
import { ring, arings, bars, spark } from '../charts.js';
import { Social } from '../social.js';
import { findEx } from '../exercises.js';
import { bodyMap } from '../body.js';
import { buildCard, dropCard, ghostWeekCard } from './daily.js';
import { duoCard } from './friends.js';
import { seasonOf, seasonStats } from '../season.js';
import { exDrawing } from '../draw.js';

R.day = todayK();
const dayLabel = k => (k === todayK() ? 'Today' : k === addDays(todayK(), -1) ? 'Yesterday' : pdk(k).toLocaleDateString('en-CA', { weekday: 'long' }));
const dateLine = k => pdk(k).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
const tick = `<span class="ok">${I.check}</span>`;

// The three rings: Fuel (calories + protein), Train, Move (cardio + steps). Only the ones you track show.
export function ringParts(sc) {
  const p = id => sc.parts.find(x => x.id === id), grp = ids => { const ps = ids.map(p).filter(Boolean); const w = ps.reduce((a, x) => a + x.w, 0); return ps.length ? ps.reduce((a, x) => a + x.pts, 0) / w : null; };
  return [['fuel', 'Fuel', grp(['cal', 'pro'])], ['train', 'Train', grp(['train'])], ['move', 'Move', grp(['cardio', 'steps'])]].filter(r => r[2] != null).map(([k, n, f]) => ({ k, n, f }));
}

export function vToday() {
  const k = R.day, sc = scoreOf(k), d = sc.d, st = streak(), lv = level(), wk = week(), T = S.targets, isT = k === todayK();
  const tier = tierOf(sc.total), t = totals(d);
  const inboxN = Social.inbox ? (Social.inbox.nudges || []).filter(x => x.new).length + (Social.inbox.reactions || []).filter(x => x.new).length + (Social.inbox.requests || []).length : 0;
  const me = Social.auth && Social.auth.me;
  let h = `<div class="top"><div><div class="sub">${dateLine(k)}</div><h1><button data-act="pickDay">${dayLabel(k)}</button></h1></div>
    <div class="row">${!isT ? `<button class="btn sm ghost" data-act="dayGo" data-arg="${todayK()}">Today</button>` : ''}
    <button class="iconbtn" data-act="go" data-arg="friends" aria-label="Activity" style="position:relative">${I.bell}${inboxN ? '<span class="dotn2"></span>' : ''}</button>
    <button data-act="settings" aria-label="Settings">${avatar(me ? me.avatar : S.profile.avatar || {}, 'md', S.profile.name)}</button></div></div>`;

  // Hero: the day score as a big gauge, with streak and level beside it.
  const se = on('seasons') ? seasonOf(k) : null, ss = se ? seasonStats(S, se.n, k) : null;
  h += `<div class="hero4"><button class="gauge" data-act="closeDay">${ring(sc.total / 100, 'accent', 156, 13, `<b>${sc.total}</b><small>day score</small>`)}</button>
    <div class="hstats"><span class="pill ${tier}">${TIER_L[tier]}</span>
      ${on('streak') ? `<button class="hs" data-act="streakInfo"><span class="flame ${st.streak ? '' : 'cold'}">${I.flame}</span><b>${st.streak}</b><small>day streak${st.atRisk && isT ? ' · at risk' : ''}</small></button>` : ''}
      ${on('levels') ? `<button class="hs" data-act="levelInfo"><span class="lvl">${lv.level}</span><b>${rankOf(lv.level)}</b><small>${Math.floor(lv.frac * 100)}% to ${lv.level + 1}</small></button>` : ''}
      ${ss ? `<button class="hs" data-act="seasonSheet"><span class="tierdot" style="--tc:${ss.tier[2]}"></span><b>${ss.tier[0]}</b><small>Season ${se.n} · ${se.left ? se.left + ' days left' : 'last day'}</small></button>` : ''}</div></div>`;
  h += dropCard() + duoCard();

  // Three rings: what each part of the day looks like at a glance.
  const rp = ringParts(sc);
  const val = r => r.k === 'fuel' ? [fmt(t.cal), 'kcal'] : r.k === 'train' ? (sc.fx === 'rest' ? ['Rest', ''] : liftDone(d) ? ['Done', ''] : ['To do', '']) : [S.modules.steps ? (d.steps >= 1000 ? (d.steps / 1000).toFixed(1) + 'k' : d.steps) : cardioMin(d), S.modules.steps ? 'steps' : 'min'];
  h += `<div class="trio">${rp.map(r => { const [v, u] = val(r); return `<button class="tri r-${r.k}" data-act="${r.k === 'fuel' ? 'log' : r.k === 'train' ? 'startPlanned' : S.modules.steps ? 'steps' : 'cardio'}"><span class="tring">${arings([r], 58, 7, 0)}<i>${r.f >= 0.999 ? I.check : Math.round(r.f * 100) + '%'}</i></span><b>${v}${u ? `<small> ${u}</small>` : ''}</b><span class="tl">${r.n}</span></button>`; }).join('')}</div>`;

  h += buildCard();
  // This week: you vs last week, or plain bars
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const gw = ghostWeekCard();
  if (gw) h += gw; else h += `<button class="card wkc" data-act="go" data-arg="progress"><div class="chd2"><span>This week</span><b>${wk.pts}<small> pts</small></b></div>${bars(wk.out.map((s, i) => ({ x: days[i], y: s ? s.total : 0, hl: s && s.k === todayK(), c: s && s.total >= WIN ? 'accent' : 'dim' })), { max: 100, goal: WIN, h: 110 })}</button>`;

  if (isT) { const mv = nextMoves(S, k).filter(m => m.gain > 0.5)[0]; if (mv) h += `<button class="next" data-act="${mv.act}"><span class="ic">${I.bolt}</span><span><b>${esc(mv.t)}</b><span>+${Math.round(mv.gain)} points</span></span><span class="chev">${I.chev}</span></button>`; }

  if (Social.on && Social.friends.length && on('friends')) {
    const fr = Social.friends.map(f => { const s = f.stats || {}; return { f, sc2: s.day === todayK() ? s.score || 0 : 0 }; }).sort((a, b) => b.sc2 - a.sc2);
    h += `<div class="sect"><h2>Friends</h2><button class="link" data-act="go" data-arg="friends">All</button></div><div class="fstrip"><div class="fs"><div class="rw">${ring(sc.total / 100, 'accent', 60, 4)}${avatar(me ? me.avatar : S.profile.avatar || {}, '', S.profile.name)}</div><span>You</span></div>${fr.map(({ f, sc2 }) => `<button class="fs" data-act="friend" data-arg="${esc(f.handle)}"><div class="rw">${ring(sc2 / 100, 'accent', 60, 4)}${avatar(f.avatar, '', f.display)}</div><span class="ell" style="max-width:64px">${esc((f.display || f.handle).split(' ')[0])}</span></button>`).join('')}</div>`;
  }

  if (S.modules.train) h += workoutCard(k, sc);
  if (S.modules.food) h += foodCard(k, d);

  // Habits as graphics: glasses of water and supplement pills
  if (S.modules.water || (S.modules.supps && S.supps.length)) {
    const gl = Math.max(1, Math.round(T.water / 250)), f = Math.floor(d.water / 250);
    h += `<div class="card habc">${S.modules.water ? `<div class="hrow"><div class="hlab"><span>Water</span><b>${+(d.water / 1000).toFixed(2)}<small> / ${+(T.water / 1000).toFixed(1)} L</small></b></div><div class="glasses">${Array.from({ length: Math.min(12, gl) }, (_, i) => `<button class="gls ${i < f ? 'f' : ''}" data-act="water" data-arg="${i < f ? -250 : 250}" aria-label="Glass ${i + 1}">${I.drop}</button>`).join('')}</div></div>` : ''}
      ${S.modules.supps && S.supps.length ? `<div class="hrow"><div class="hlab"><span>Supplements</span><b>${S.supps.filter(x => d.supps[x.id]).length}<small> / ${S.supps.length}</small></b></div><div class="pills2">${S.supps.map(x => `<button class="pl ${d.supps[x.id] ? 'on' : ''}" data-act="supp" data-arg="${x.id}">${d.supps[x.id] ? I.check : I.pill}<span>${esc(x.name)}</span></button>`).join('')}</div></div>` : ''}</div>`;
  }

  // Movement and body: numbers with a 7-day trend line
  const last7 = f => Array.from({ length: 7 }, (_, i) => f(get(addDays(k, i - 6))));
  const minis = [];
  if (S.modules.steps) minis.push(`<button class="hcard c-move" data-act="steps"><div class="hh"><span>${I.shoe}Steps</span></div><div class="vv">${fmt(d.steps)}</div>${spark(last7(x => x.steps || 0), { c: 'move', w: 140, h: 30 })}</button>`);
  if (S.modules.cardio) minis.push(`<button class="hcard c-move" data-act="cardio"><div class="hh"><span>${I.run}Cardio</span></div><div class="vv">${cardioMin(d)}<small>min</small></div>${spark(last7(x => cardioMin(x)), { c: 'move', w: 140, h: 30 })}</button>`);
  if (S.modules.weight) { const tr = weightTrend(S, 14, k).filter(x => x.t != null), last = tr.at(-1); minis.push(`<button class="hcard c-body" data-act="weight"><div class="hh"><span>${I.scale}Weight</span></div><div class="vv">${d.weight || (last ? last.t.toFixed(1) : '–')}<small>${S.profile.units}</small></div>${spark(tr.map(x => x.t), { c: 'body', w: 140, h: 30 })}</button>`); }
  if (minis.length) h += `<div class="minis">${minis.join('')}</div>`;
  $('#v-today').innerHTML = h;
}

function workoutCard(k, sc) {
  const d = sc.d, fx = sc.fx;
  const head = (right = '') => `<div class="hh"><span>${I.dumb}Workout</span>${right}</div>`;
  if (d.wo && d.wo.status === 'active') return `<button class="hcard c-train" data-act="openSession">${head(`<i>In progress${I.chev}</i>`)}<div class="vv">${esc(d.wo.name)}</div></button>`;
  if (liftDone(d)) { const vol = d.wo.ex.reduce((a, e) => a + e.sets.filter(s => s.done && s.k !== 'W').reduce((b, s) => b + (+s.w || 0) * (+s.r || 0), 0), 0); const prs = d.wo.ex.reduce((a, e) => a + e.sets.filter(s => s.pr).length, 0); return `<button class="hcard c-train" data-act="sessionDetail" data-arg="${k}">${head(`<i style="color:var(--train)">${I.check} Done</i>`)}<div class="vv">${esc(d.wo.name)}</div><div class="sub2">${fmt(vol)} ${S.profile.units}${prs ? ` · ${prs} PR${prs > 1 ? 's' : ''}` : ''}</div></button>`; }
  if (fx === 'rest') return `<button class="hcard c-train" data-act="pickWorkout">${head(`<i>Train anyway${I.chev}</i>`)}<div class="vv">Rest day</div></button>`;
  const r = S.routines.find(x => x.id === fx), n = r ? r.ex.length : 0;
  const mus = r ? [...new Set(r.ex.flatMap(e => (findEx(e.name, S.customEx) || { p: [] }).p))] : [];
  const first = r && r.ex[0] ? findEx(r.ex[0].name, S.customEx) || { n: r.ex[0].name, p: [], s: [] } : null;
  return `<div class="hcard c-train woc"><div class="wotxt">${head(`<i>${n} exercises</i>`)}<div class="vv">${esc(routineName(S, fx))}</div><div class="row mt"><button class="btn grow" data-act="startPlanned">${I.play} Start</button><button class="btn ghost" data-act="planMenu" aria-label="Change workout">${I.swap}</button></div></div><div class="womap">${first ? exDrawing(first, { anim: on('anim') }) : bodyMap(mus, [], { labels: false })}</div></div>`;
}

function foodCard(k, d) {
  const T = S.targets, t = totals(d), left = T.cal - t.cal;
  const mac = (n, v, g, c) => `<div class="mring c-${c}">${ring(Math.min(1, v / (g || 1)), c, 52, 6, `<span>${Math.round(v)}</span>`)}<small>${n}</small></div>`;
  return `<div class="card foodc"><div class="chd2"><span>Nutrition</span>${d.meals.length ? `<button class="link" data-act="mealsAll">${d.meals.length} meals</button>` : ''}</div>
    <div class="fhero">${ring(Math.min(1, t.cal / (T.cal || 1)), 'food', 108, 10, `<b>${fmt(Math.abs(left))}</b><small>${left >= 0 ? 'left' : 'over'}</small>`)}
      <div class="mrings">${mac('Protein', t.p, T.pro, 'pro')}${mac('Carbs', t.c, T.carb, 'carb')}${mac('Fat', t.f, T.fat, 'fat')}</div></div>
    ${d.meals.length ? `<div class="thumbs">${d.meals.slice().reverse().map(m => `<button class="thumb" data-act="mealEdit" data-arg="${m.id}">${m.img ? `<img src="${m.img}" alt="">` : `<span>${esc(m.emoji || '🍽️')}</span>`}<b>${fmt(m.cal)}</b></button>`).join('')}</div>` : ''}
    <div class="actions"><button class="act hot" data-act="snap">${I.cam}Snap</button><button class="act" data-act="describe">${I.spark}Describe</button><button class="act" data-act="foodSearch">${I.search}Foods</button></div></div>`;
}
const mealRow = m => `<button class="meal" data-act="mealEdit" data-arg="${m.id}"><span class="ph">${m.img ? `<img src="${m.img}" alt="">` : esc(m.emoji || '🍽️')}</span><span class="grow"><span class="nm ell" style="display:block">${esc(m.name)}</span><span class="mm">${MEAL_L[m.type] || ''} · ${m.p}g protein</span></span><span class="kc">${fmt(m.cal)}</span></button>`;
A.mealsAll = () => { const d = get(R.day); openSheet('meals', 'Meals', MEALS.map(mt => { const ms = d.meals.filter(m => (m.type || 'snack') === mt); return ms.length ? `<div class="mhead"><span>${MEAL_L[mt]}</span><span>${fmt(ms.reduce((a, m) => a + (+m.cal || 0), 0))} kcal</span></div>${ms.map(mealRow).join('')}` : ''; }).join('')); };

/* ---------- actions ---------- */
CH.dayAny = el => { if (/^\d{4}-\d{2}-\d{2}$/.test(el.value) && el.value <= todayK()) A.dayGo(el.value); };
A.dayGo = k => { R.day = k; closeSheet(); vToday(); window.scrollTo(0, 0); };
A.pickDay = () => {
  const t = todayK(); const ks = Array.from({ length: 14 }, (_, i) => addDays(t, -i));
  openSheet('pick', 'Jump to a day', `<div class="field"><span>Any date</span><input type="date" max="${t}" data-ch="dayAny"></div><div class="list mt">${ks.map(k => { const s = scoreOf(k); return `<button class="li" data-act="dayGo" data-arg="${k}"><span class="ic" style="width:44px;height:44px;background:none">${arings(ringParts(s), 44, 5, 1.5)}</span><span><span class="t">${dayLabel(k)}</span><span class="s">${pdk(k).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span></span><span class="r b">${s.logged ? s.total : '–'}</span></button>`; }).join('')}</div>`);
};
A.water = n => { const d = day(R.day); d.water = Math.max(0, d.water + +n); touch(R.day); haptic(); vToday(); };
A.supp = id => { const d = day(R.day); d.supps[id] = !d.supps[id]; touch(R.day); haptic(); vToday(); };
A.streakInfo = () => { const st = streak(); openSheet('streak', '', `<div class="center" style="padding:6px 0 14px"><div class="flame" style="width:56px;height:56px;margin:0 auto">${I.flame}</div><div style="font-size:64px;font-weight:800;letter-spacing:-.04em;font-family:var(--round)">${st.streak}</div><div class="muted">day streak · best ${st.best}</div></div>
  <div class="list"><div class="li noic"><span class="t">Keeps going at ${HOLD}+ a day</span><span></span></div><div class="li noic"><span class="t">Freezes banked</span><span class="r b">${st.bank}</span></div></div><p class="faint small">Earn a freeze with a 5-win week. It covers one missed day.</p>`); };
A.levelInfo = () => { const lv = level(); openSheet('lvl', '', `<div class="center" style="padding:4px 0 14px"><div class="levelup"><div class="big">${lv.level}</div><b>${rankOf(lv.level)}</b><span class="muted small">${fmt(lv.need - lv.into)} XP to level ${lv.level + 1}</span></div><div class="pbar c-accent mt"><i style="width:${lv.frac * 100}%"></i></div></div>
  <div class="list"><div class="li noic"><span class="t">Each day</span><span class="r">Your score</span></div><div class="li noic"><span class="t">Workout</span><span class="r">+40</span></div><div class="li noic"><span class="t">PR</span><span class="r">+25</span></div></div>`); };
export { dayLabel };
