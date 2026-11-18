import { S, R, get, day, touch, scoreOf, streak, level, week } from '../store.js';
import { todayK, addDays, pdk, esc, fmt, totals, cardioMin, liftDone, nextMoves, routineName, tierOf, TIER_L, WIN, HOLD, MEAL_L, MEALS, calWindow, DOWL, weightTrend, rankOf } from '../core.js';
import { $, A, I, avatar, toast, haptic, openSheet, closeSheet, confetti } from '../ui.js';
import { dial, ring, macroBar } from '../charts.js';
import { Social } from '../social.js';
import { findEx } from '../exercises.js';

R.day = todayK();
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const dayLabel = k => (k === todayK() ? 'Today' : k === addDays(todayK(), -1) ? 'Yesterday' : pdk(k).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' }));

export function vToday() {
  const k = R.day, sc = scoreOf(k), d = sc.d, st = streak(), lv = level(), wk = week(), T = S.targets, isT = k === todayK();
  const tier = tierOf(sc.total);
  const toWin = Math.max(0, WIN - sc.total);
  const inboxN = Social.inbox ? (Social.inbox.nudges || []).filter(x => x.new).length + (Social.inbox.reactions || []).filter(x => x.new).length + (Social.inbox.requests || []).length : 0;
  const me = Social.auth && Social.auth.me;
  let h = `<div class="top"><div><div class="sub">${isT ? greet() + (S.profile.name ? ', ' + esc(S.profile.name.split(' ')[0]) : '') : 'Looking back'}</div>
    <h1><button data-act="pickDay" class="row" style="gap:6px">${dayLabel(k)}${!isT ? '' : ''}</button></h1></div>
    <div class="row">${!isT ? `<button class="btn sm ghost" data-act="dayGo" data-arg="${todayK()}">Today</button>` : ''}
    <button class="iconbtn" data-act="go" data-arg="friends" aria-label="Activity" style="position:relative">${I.bell}${inboxN ? `<span class="dotn" style="position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;background:#ff4d6d;border:2px solid var(--s2)"></span>` : ''}</button>
    <button data-act="settings" aria-label="Settings">${avatar(me ? me.avatar : S.profile.avatar || {}, 'md', S.profile.name)}</button></div></div>`;

  // score hero
  const legend = sc.parts.map(p => `<div class="lg c-${p.c}"><i></i><span>${p.n}</span><b>${Math.round(p.pts)}<span class="faint">/${Math.round(p.w)}</span></b></div>`).join('');
  h += `<div class="card hero"><div class="dialw">${dial(sc.parts, sc.total, 210)}<div class="mid"><b class="n">${sc.total}</b><small>Day score</small></div></div>
    <div><div class="state"><span class="pill ${tier}">${TIER_L[tier]}</span>${toWin && isT ? `<span class="faint small">${toWin} to a win</span>` : sc.total >= WIN ? `<span class="faint small">Streak safe</span>` : ''}</div><div class="legend">${legend}</div></div></div>`;

  // streak, level, week
  h += `<div class="strip">
    <button class="tile" data-act="streakInfo"><small>Streak</small><b><span class="flame ${st.streak ? '' : 'cold'}">${I.flame}</span><span class="n">${st.streak}</span></b><span class="tiny faint">${st.atRisk && isT ? 'Log today to keep it' : st.bank ? st.bank + ' freeze' + (st.bank > 1 ? 's' : '') + ' banked' : 'Best ' + st.best}</span></button>
    <button class="tile" data-act="levelInfo"><small>Level ${lv.level}</small><b class="n">${rankOf(lv.level)}</b><div class="bar"><i style="width:${Math.round(lv.frac * 100)}%"></i></div></button>
    <button class="tile" data-act="go" data-arg="progress"><small>This week</small><b class="n">${wk.pts}<span class="tiny faint" style="font-weight:500">pts</span></b><span class="tiny faint">${wk.W} win${wk.W === 1 ? '' : 's'} · avg ${wk.avg}</span></button></div>`;

  // coach
  if (isT) {
    const mv = nextMoves(S, k).filter(m => m.gain > 0.5).slice(0, 2);
    if (mv.length) h += `<div class="card tight"><div class="col" style="gap:12px">${mv.map((m, i) => `<button class="coach" data-act="${m.act}"><span class="av">${i ? I.target : I.bolt}</span><span><b>${esc(m.t)}</b><span>${esc(m.d)}</span></span><span class="gain">+${Math.round(m.gain)}</span></button>`).join('')}</div></div>`;
    else if (sc.total >= WIN && !d.closed) h += `<div class="card tight"><button class="coach" data-act="closeDay"><span class="av">${I.check}</span><span><b>That’s a win. Close out the day</b><span>See your recap and share it with friends.</span></span><span class="chev">${I.chev}</span></button></div>`;
  }

  // friends today
  if (Social.on && Social.friends.length) {
    const fr = Social.friends.map(f => { const s = f.stats || {}; const sc2 = s.day === todayK() ? s.score || 0 : 0; return { f, sc2, w: s.wo && s.day === todayK() }; }).sort((a, b) => b.sc2 - a.sc2);
    h += `<div class="sect"><h2>Friends today</h2><button class="link" data-act="go" data-arg="friends">See all</button></div>
      <div class="fstrip"><div class="fs"><div class="rw">${ring(sc.total / 100, 'accent', 60, 4)}${avatar(me ? me.avatar : S.profile.avatar || {}, '', S.profile.name)}<span class="badge">${sc.total}</span></div><span>You</span></div>
      ${fr.map(({ f, sc2, w }) => `<button class="fs" data-act="friend" data-arg="${esc(f.handle)}"><div class="rw">${ring(sc2 / 100, sc2 >= WIN ? 'win' : 'accent', 60, 4)}${avatar(f.avatar, '', f.display)}<span class="badge">${sc2}</span></div><span class="ell" style="max-width:64px">${esc((f.display || f.handle).split(' ')[0])}${w ? ' 💪' : ''}</span></button>`).join('')}</div>`;
  } else if (S.profile.social === 'friends' && !Social.on && isT) {
    h += `<button class="card tight press coach" data-act="go" data-arg="friends"><span class="av">${I.users}</span><span><b>Bring your friends in</b><span>See when they train, nudge them, and race the weekly league.</span></span><span class="chev">${I.chev}</span></button>`;
  }

  // training
  if (S.modules.train) h += workoutCard(k, sc);
  // nutrition
  if (S.modules.food) h += foodCard(k, d);
  // minis
  const minis = [];
  if (S.modules.steps) minis.push(`<button class="mini c-move" data-act="steps"><div class="h"><span>Steps</span>${I.shoe}</div><b class="n">${fmt(d.steps)}<small> / ${fmt(T.steps)}</small></b><div class="pbar"><i style="width:${Math.min(100, (d.steps / T.steps) * 100)}%"></i></div></button>`);
  if (S.modules.cardio) minis.push(`<button class="mini c-move" data-act="cardio"><div class="h"><span>Cardio</span>${I.run}</div><b class="n">${cardioMin(d)}<small> / ${T.cardio} min</small></b><div class="pbar"><i style="width:${Math.min(100, (cardioMin(d) / (T.cardio || 20)) * 100)}%"></i></div></button>`);
  if (S.modules.water) { const gl = Math.round(T.water / 250), f = Math.floor(d.water / 250); minis.push(`<div class="mini c-water"><div class="h"><span>Water</span>${I.drop}</div><b class="n">${+(d.water / 1000).toFixed(2)}<small> / ${(T.water / 1000).toFixed(1)} L</small></b><div class="row" style="gap:6px"><button class="btn xs ghost grow" data-act="water" data-arg="250">+ Glass</button><button class="btn xs ghost" data-act="water" data-arg="-250" aria-label="Remove a glass">−</button></div><div class="glass">${Array.from({ length: Math.min(12, gl) }, (_, i) => `<i class="${i < f ? 'f' : ''}"></i>`).join('')}</div></div>`); }
  if (S.modules.weight) { const tr = weightTrend(S, 30, k).filter(x => x.t != null); const t = tr.at(-1); const t7 = tr.length > 7 ? tr.at(-8) : tr[0]; const dd = t && t7 ? t.t - t7.t : 0; minis.push(`<button class="mini c-body" data-act="weight"><div class="h"><span>Weight</span>${I.scale}</div><b class="n">${d.weight ? d.weight : t ? t.t.toFixed(1) : '–'}<small> ${S.profile.units}</small></b><span class="tiny faint">${d.weight ? 'Weighed in today' : t ? 'Trend ' + (dd >= 0 ? '+' : '') + dd.toFixed(1) + ' this week' : 'Tap to weigh in'}</span></button>`); }
  if (minis.length) h += `<div class="minis">${minis.join('')}</div>`;
  if (S.modules.supps && S.supps.length) h += `<div class="card c-habit"><div class="chd"><h3><span class="dot"></span>Supplements</h3><button class="r" data-act="suppEdit">Edit</button></div><div class="supp">${S.supps.map(x => `<button class="sp ${d.supps[x.id] ? 'on' : ''}" data-act="supp" data-arg="${x.id}"><i>${d.supps[x.id] ? I.check : ''}</i>${esc(x.name)}${x.dose ? `<span class="faint small">${esc(x.dose)}</span>` : ''}</button>`).join('')}</div></div>`;

  if (isT || !d.closed) h += `<button class="btn ${sc.total >= WIN ? '' : 'ghost'} wide" data-act="closeDay">${d.closed ? 'Day closed · view recap' : 'Close out the day'}</button>`;
  else h += `<button class="btn ghost wide" data-act="closeDay">View recap</button>`;
  $('#v-today').innerHTML = h;
}

function workoutCard(k, sc) {
  const d = sc.d, fx = sc.fx;
  if (d.wo && d.wo.status === 'active') return `<div class="card wo"><div class="pill acc">${I.timer} In progress</div><h2>${esc(d.wo.name)}</h2><div class="ex">${d.wo.ex.filter(e => e.sets.some(s => s.done)).length} of ${d.wo.ex.length} exercises started</div><button class="btn wide" data-act="openSession">Continue workout</button></div>`;
  if (liftDone(d)) { const vol = d.wo.ex.reduce((a, e) => a + e.sets.filter(s => s.done && s.k !== 'W').reduce((b, s) => b + (+s.w || 0) * (+s.r || 0), 0), 0); const prs = d.wo.ex.reduce((a, e) => a + e.sets.filter(s => s.pr).length, 0); return `<button class="card wo press" data-act="sessionDetail" data-arg="${k}" style="text-align:left;width:100%"><div class="row between"><span class="pill win">${I.check} Done</span><span class="faint small">${d.wo.end && d.wo.start ? Math.round((d.wo.end - d.wo.start) / 60000) + ' min' : ''}</span></div><h2>${esc(d.wo.name)}</h2><div class="ex">${fmt(vol)} ${S.profile.units} moved${prs ? ` · ${prs} PR${prs > 1 ? 's' : ''}` : ''}</div></button>`; }
  if (fx === 'rest') return `<div class="card wo rest"><div class="pill">${I.moon} Rest day</div><h2>Recover</h2><div class="ex">Training points are yours today. Walk, stretch, sleep well.</div><div class="row"><button class="btn sm ghost" data-act="pickWorkout">Train anyway</button></div></div>`;
  const r = S.routines.find(x => x.id === fx);
  const exs = r ? r.ex : [];
  const mus = [...new Set(exs.map(e => (findEx(e.name, S.customEx) || {}).p).filter(Boolean).flat())].slice(0, 4);
  return `<div class="card wo"><div class="row between"><span class="pill acc">${I.dumb} ${DOWL[pdk(k).getDay()]}</span><span class="faint small">${exs.length} exercises · ~${Math.round(exs.reduce((a, e) => a + (+e.sets || 3), 0) * 2.6)} min</span></div><h2>${esc(routineName(S, fx))}</h2><div class="ex">${esc(exs.slice(0, 4).map(e => e.name).join(' · '))}${exs.length > 4 ? ' · +' + (exs.length - 4) : ''}</div>
    <div class="row"><button class="btn grow" data-act="startPlanned">${I.play} Start workout</button><button class="btn ghost" data-act="planMenu" aria-label="Change">${I.swap}</button></div></div>`;
}

function foodCard(k, d) {
  const T = S.targets, t = totals(d), left = T.cal - t.cal, [w0, w1] = calWindow(T.cal, S.profile.goal);
  const max = Math.max(w1, t.cal) * 1.04;
  const groups = MEALS.map(mt => ({ mt, ms: d.meals.filter(m => (m.type || 'snack') === mt) })).filter(g => g.ms.length);
  return `<div class="card c-food"><div class="chd"><h3><span class="dot"></span>Nutrition</h3><span class="r">${d.meals.length ? d.meals.length + ' item' + (d.meals.length > 1 ? 's' : '') : ''}</span></div>
    <div class="kcal"><div><div class="big n">${fmt(Math.abs(left))}<small>${left >= 0 ? 'kcal left' : 'kcal over'}</small></div><div class="faint small" style="margin-top:6px">${fmt(t.cal)} eaten · goal ${fmt(T.cal)}</div></div>${ring(Math.min(1, t.cal / T.cal), 'food', 58, 7, `<span class="tiny">${Math.round((t.cal / T.cal) * 100)}%</span>`)}</div>
    <div class="pbar mt" style="height:8px"><span class="win" style="left:${(w0 / max) * 100}%;width:${((w1 - w0) / max) * 100}%"></span><i style="width:${Math.min(100, (t.cal / max) * 100)}%"></i></div>
    <div class="macros">${[['Protein', t.p, T.pro, 'pro'], ['Carbs', t.c, T.carb, 'carb'], ['Fat', t.f, T.fat, 'fat']].map(([n, v, g, c]) => `<div class="mac c-${c}"><small>${n}</small><b class="n">${Math.round(v)}<span> / ${g} g</span></b><div class="pbar"><i style="width:${Math.min(100, (v / (g || 1)) * 100)}%"></i></div></div>`).join('')}</div>
    ${groups.map(g => `<div class="mhead"><span>${MEAL_L[g.mt]}</span><span>${fmt(g.ms.reduce((a, m) => a + (+m.cal || 0), 0))} kcal</span></div>${g.ms.map(m => `<button class="meal" data-act="mealEdit" data-arg="${m.id}"><span class="ph">${m.img ? `<img src="${m.img}" alt="">` : esc(m.emoji || '🍽️')}</span><span class="grow"><span class="nm ell" style="display:block">${esc(m.name)}</span><span class="mm">${m.p}P · ${m.c}C · ${m.f}F${m.src === 'photo' ? ' · 📷' : m.src === 'ai' ? ' · AI' : ''}</span></span><span class="kc n">${fmt(m.cal)}<small>${m.p}g</small></span></button>`).join('')}`).join('')}
    <div class="actions"><button class="act hot" data-act="snap">${I.cam}Snap</button><button class="act" data-act="describe">${I.spark}Describe</button><button class="act" data-act="foodSearch">${I.search}Search</button></div></div>`;
}

/* ---------- actions ---------- */
A.dayGo = k => { R.day = k; closeSheet(); vToday(); window.scrollTo(0, 0); };
A.pickDay = () => {
  const t = todayK(); const ks = Array.from({ length: 14 }, (_, i) => addDays(t, -i));
  openSheet('pick', 'Jump to a day', `<div class="list">${ks.map(k => { const s = scoreOf(k); return `<button class="li" data-act="dayGo" data-arg="${k}"><span class="ic">${ring(s.total / 100, tierOf(s.total) === 'win' ? 'win' : 'accent', 40, 4, `<span class="tiny">${s.total}</span>`)}</span><span><span class="t">${dayLabel(k)}</span><span class="s">${s.logged ? TIER_L[tierOf(s.total)] : 'Nothing logged'}</span></span><span class="chev">${I.chev}</span></button>`; }).join('')}</div>`);
};
A.water = n => { const d = day(R.day); d.water = Math.max(0, d.water + +n); touch(R.day); haptic(); vToday(); };
A.supp = id => { const d = day(R.day); d.supps[id] = !d.supps[id]; touch(R.day); haptic(); vToday(); };
A.streakInfo = () => { const st = streak(); openSheet('streak', 'Your streak', `<div class="center" style="padding:6px 0 14px"><div class="flame" style="width:64px;height:64px;margin:0 auto">${I.flame}</div><div style="font-size:56px;font-weight:800;letter-spacing:-.04em" class="n">${st.streak}</div><div class="muted">day${st.streak === 1 ? '' : 's'} in a row · best ${st.best}</div></div>
  <div class="list"><div class="li noic"><span><span class="t">Keep it alive</span><span class="s">Score ${HOLD} or more in a day. A win is ${WIN}.</span></span><span></span></div><div class="li noic"><span><span class="t">Streak freezes</span><span class="s">Earn one for every week with 5+ wins. Up to 2 bank up and cover a missed day automatically.</span></span><span class="r b">${st.bank} banked</span></div></div>`); };
A.levelInfo = () => { const lv = level(); openSheet('lvl', 'Level ' + lv.level, `<div class="center" style="padding:4px 0 14px"><div class="levelup"><div class="big n">${lv.level}</div><b>${rankOf(lv.level)}</b><span class="muted small">${fmt(lv.into)} / ${fmt(lv.need)} XP to level ${lv.level + 1}</span></div><div class="pbar c-accent mt"><i style="width:${lv.frac * 100}%"></i></div></div>
  <div class="list"><div class="li noic"><span class="t">Every day</span><span class="r">Your day score in XP</span></div><div class="li noic"><span class="t">Finished workout</span><span class="r">+40 XP</span></div><div class="li noic"><span class="t">Personal record</span><span class="r">+25 XP</span></div></div><p class="faint small mt">Ranks change every 5 levels: Rookie, Regular, Committed, Dialed, Locked in, Elite, Legend.</p>`); };
export { dayLabel };
