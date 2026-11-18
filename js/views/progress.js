// Progress: trends, calendar heatmap, nutrition and body charts, training volume, achievements, weekly recap.
import { S, R, get, scoreOf, streak, level, week, hist, save } from '../store.js';
import { todayK, addDays, wkStart, pdk, esc, fmt, totals, cardioMin, tierOf, TIER_L, WIN, achievements, weightTrend, rankOf, liftDone } from '../core.js';
import { A, I, $, openSheet, setSheet, toast, confetti } from '../ui.js';
import { line, bars, heat, rings } from '../charts.js';
import { aiOn, coachNote, errMsg } from '../ai.js';
import { post } from '../social.js';
import { Social } from '../social.js';

const P = { range: 30 };
const lbl = k => pdk(k).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

export function vProgress() {
  const t = todayK(), n = P.range, ks = Array.from({ length: n }, (_, i) => addDays(t, i - n + 1)).filter(k => k >= S.profile.start || k === t);
  const scs = ks.map(k => scoreOf(k)), past = scs.filter(s => s.k < t || s.total >= 45);
  const avg = past.length ? Math.round(past.reduce((a, s) => a + s.total, 0) / past.length) : 0;
  const wins = past.filter(s => s.total >= WIN).length, st = streak(), lv = level(), h = hist();
  const wos = h.sessions.filter(s => s.date >= ks[0]).length;
  let x = `<div class="top"><div><div class="sub">Level ${lv.level} · ${rankOf(lv.level)}</div><h1>Progress</h1></div><button class="iconbtn" data-act="weekRecap" aria-label="Weekly recap">${I.calendar}</button></div>
  <div class="seg">${[[7, '7 days'], [30, '30 days'], [90, '90 days']].map(([v, l]) => `<button class="${P.range === v ? 'on' : ''}" data-act="pRange" data-arg="${v}">${l}</button>`).join('')}</div>
  <div class="g2"><div class="stat"><small>Average score</small><b class="n">${avg}</b></div><div class="stat"><small>Win rate</small><b class="n">${past.length ? Math.round((wins / past.length) * 100) : 0}%</b></div><div class="stat"><small>Best streak</small><b class="n">${st.best}</b></div><div class="stat"><small>Workouts</small><b class="n">${wos}</b></div></div>`;
  x += `<div class="card"><div class="chd"><h3>Day score</h3><span class="r">Dashed line is a win (70)</span></div>${line(scs.map(s => ({ x: lbl(s.k), y: s.k <= t ? s.total : null })), { min: 0, max: 100, goal: WIN, area: true, dots: n <= 30, c: 'accent' })}</div>`;
  // heatmap: last 18 weeks aligned to Monday
  const startH = addDays(wkStart(t), -7 * 17), cells = [];
  for (let k = startH; k <= addDays(wkStart(t), 6); k = addDays(k, 1)) cells.push({ k, v: k > t || k < S.profile.start ? null : scoreOf(k).total, today: k === t });
  x += `<div class="card"><div class="chd"><h3>Consistency</h3><span class="r">18 weeks</span></div><div class="row" style="align-items:flex-start;gap:8px"><div class="col" style="gap:3px;font-size:10px;color:var(--ink3);padding-top:1px">${['M', '', 'W', '', 'F', '', 'S'].map(d => `<span style="height:13px;line-height:13px">${d}</span>`).join('')}</div><div class="grow">${heat(cells)}</div></div><div class="row tiny faint mt" style="gap:6px;justify-content:flex-end">Less ${['l0', 'l1', 'l2', 'l3', 'l4'].map(c => `<svg width="11" height="11"><rect width="11" height="11" rx="3" class="hc ${c}"/></svg>`).join('')} More</div></div>`;
  if (S.modules.food) {
    const T = S.targets, tots = ks.map(k => totals(get(k))), logged = tots.filter(q => q.cal > 0);
    const a = q => (logged.length ? Math.round(logged.reduce((s, z) => s + z[q], 0) / logged.length) : 0);
    const proHit = logged.filter(q => q.p >= T.pro).length;
    x += `<div class="card"><div class="chd"><h3><span class="dot c-food" style="background:var(--food)"></span>Calories</h3><span class="r">avg ${fmt(a('cal'))} · goal ${fmt(T.cal)}</span></div>${bars(tots.slice(-Math.min(n, 30)).map((q, i, arr) => ({ x: n <= 7 || i % 5 === 0 ? lbl(ks[ks.length - arr.length + i]).split(' ')[1] : '', y: q.cal, c: q.cal > T.cal + 150 ? 'pro' : 'food', hl: i === arr.length - 1 })), { goal: T.cal, h: 130 })}
      <div class="g3 mt"><div><div class="faint tiny">Protein avg</div><b class="n tc c-pro">${a('p')} g</b></div><div><div class="faint tiny">Carbs avg</div><b class="n tc c-carb">${a('c')} g</b></div><div><div class="faint tiny">Fat avg</div><b class="n tc c-fat">${a('f')} g</b></div></div>
      <p class="faint small" style="margin:10px 0 0">Protein goal hit on ${proHit} of ${logged.length} logged days.</p></div>`;
  }
  if (S.modules.weight) {
    const wt = weightTrend(S, Math.max(n, 30), t).slice(-Math.max(n, 30)); const has = wt.filter(z => z.w);
    if (has.length) { const f = wt.find(z => z.t != null), l = wt.at(-1); const ch = f && l && l.t != null ? l.t - f.t : 0; const perWk = has.length > 6 ? (ch / Math.max(1, (wt.length - wt.indexOf(f)) / 7)) : 0;
      x += `<div class="card"><div class="chd"><h3><span class="dot" style="background:var(--body)"></span>Body weight</h3><span class="r">${ch >= 0 ? '+' : ''}${ch.toFixed(1)} ${S.profile.units}${perWk ? ' · ' + (perWk >= 0 ? '+' : '') + perWk.toFixed(2) + '/wk' : ''}</span></div>${line(wt.map(z => ({ x: lbl(z.k), y: z.t != null ? +z.t.toFixed(1) : null })), { c: 'body', second: wt.map(z => ({ y: z.w })), extra: has.map(z => z.w), fmt: v => v.toFixed(1) })}<p class="faint small" style="margin:8px 0 0">Solid line is your trend. Dotted is the scale. ${S.profile.goal === 'cut' ? 'Around 0.5–1% of body weight a week is a healthy cut.' : S.profile.goal === 'bulk' ? 'Around 0.25–0.5% a week keeps a bulk lean.' : 'Holding within a kilo is maintenance.'}</p></div>`; }
  }
  if (S.modules.train && h.sessions.length) {
    const wks = Array.from({ length: 8 }, (_, i) => addDays(wkStart(t), -7 * (7 - i)));
    const vol = wks.map(ws => h.sessions.filter(s => s.date >= ws && s.date < addDays(ws, 7)).reduce((a, s) => a + s.vol, 0));
    x += `<div class="card"><div class="chd"><h3><span class="dot" style="background:var(--train)"></span>Training volume</h3><span class="r">${S.profile.units} per week</span></div>${bars(wks.map((ws, i) => ({ x: lbl(ws).split(' ')[1], y: vol[i], hl: i === 7 })), { c: 'train', labels: true, fmt: v => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)), h: 140 })}</div>`;
  }
  x += `<div class="card"><div class="chd"><h3>${I.spark} Coach’s read</h3><span class="r">Last 7 days</span></div><div id="coachOut">${S.seen.coach && S.seen.coach.d === t ? coachHTML(S.seen.coach) : `<p class="muted small" style="margin:0 0 10px">${aiOn() ? 'Get a short, honest read on your week with one thing to change.' : 'Turn on AI in Settings for a weekly coaching read.'}</p><button class="btn sm ${aiOn() ? '' : 'ghost'}" data-act="coach" ${aiOn() ? '' : 'disabled'}>Read my week</button>`}</div></div>`;
  const ach = achievements(S), got = ach.filter(a2 => a2.got).length;
  x += `<div class="sect"><h2>Badges</h2><span class="faint small">${got} of ${ach.length}</span></div><div class="ach">${ach.map(a2 => `<div class="ac ${a2.got ? 'got' : ''}"><span class="md">${a2.got ? I.medal : I.star}</span><b>${esc(a2.n)}</b><small>${esc(a2.d)}</small></div>`).join('')}</div>`;
  $('#v-progress').innerHTML = x;
}
A.pRange = v => { P.range = +v; vProgress(); };
const coachHTML = c => `<b style="display:block;font-size:16px">${esc(c.headline)}</b><p class="muted" style="margin:6px 0 0;font-size:14px">${esc(c.body)}</p>`;
A.coach = async (a, btn) => {
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Reading…';
  const t = todayK(), days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)).map(k => { const s = scoreOf(k), tt = totals(s.d); return { date: k, score: s.total, kcal: tt.cal, protein: tt.p, trained: liftDone(s.d), planned: s.fx !== 'rest', cardio_min: cardioMin(s.d), steps: s.d.steps, weight: s.d.weight || null }; });
  try { const r = await coachNote({ goal: S.profile.goal, targets: S.targets, days, streak: streak().streak }); S.seen.coach = { d: t, headline: r.headline, body: r.body }; save(); $('#coachOut').innerHTML = coachHTML(S.seen.coach); }
  catch (e) { $('#coachOut').innerHTML = `<div class="err">${esc(errMsg(e))}</div>`; }
};

/* ---------- weekly recap ---------- */
export function recapDue() { const ws = addDays(wkStart(todayK()), -7); if (ws < wkStart(S.profile.start) || (S.seen.recap || '') >= ws) return null; return ws; }
A.weekRecap = ws => openRecap(ws && /^\d{4}/.test(ws) ? ws : addDays(wkStart(todayK()), -7));
export function openRecap(ws) {
  S.seen.recap = S.seen.recap > ws ? S.seen.recap : ws; save();
  const w = week(ws), prev = week(addDays(ws, -7)), h = hist();
  const wos = h.sessions.filter(s => s.date >= ws && s.date < addDays(ws, 7));
  const vol = wos.reduce((a, s) => a + s.vol, 0), prs = wos.reduce((a, s) => a + s.prs, 0);
  const diff = w.pts - prev.pts;
  if (w.W >= 5) confetti(100);
  const best = w.out.filter(Boolean).sort((a, b) => b.total - a.total)[0];
  const rank = Social.on ? [{ me: true, pts: w.pts }, ...Social.friends.map(f => ({ pts: (f.stats || {}).ws === ws ? f.stats.week || 0 : 0 }))].sort((a, b) => b.pts - a.pts).findIndex(r => r.me) + 1 : 0;
  openSheet('recap', '', `<div class="center"><div class="faint small b">WEEK OF ${lbl(ws).toUpperCase()}</div><div style="font-size:72px;font-weight:800;letter-spacing:-.05em;line-height:1.05" class="n">${fmt(w.pts)}</div><div class="muted">points · ${diff >= 0 ? '+' : ''}${fmt(diff)} vs the week before</div></div>
  <div class="week mt2">${w.out.map((s, i) => `<div class="wd"><span>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span><b>${s ? s.total : '–'}</b><i class="d ${s ? tierOf(s.total) : ''}"></i></div>`).join('')}</div>
  <div class="g3 mt"><div class="stat center"><small>Wins</small><b class="n">${w.W}</b></div><div class="stat center"><small>Workouts</small><b class="n">${wos.length}</b></div><div class="stat center"><small>PRs</small><b class="n">${prs}</b></div></div>
  <div class="list mt">${best ? `<div class="li noic"><span><span class="t">Best day</span><span class="s">${pdk(best.k).toLocaleDateString('en-CA', { weekday: 'long' })}</span></span><span class="r b">${best.total}</span></div>` : ''}<div class="li noic"><span class="t">Volume lifted</span><span class="r b">${fmt(vol)} ${S.profile.units}</span></div>${rank ? `<div class="li noic"><span class="t">League finish</span><span class="r b">#${rank} of ${Social.friends.length + 1}</span></div>` : ''}</div>
  <p class="muted center small mt">${w.W >= 6 ? 'Elite week. Do it again.' : w.W >= 4 ? 'Strong week. One more win next week and you’re flying.' : w.days ? 'New week, clean slate. Aim for four wins.' : 'Log a few days this week to start your streak.'}</p>
  <button class="btn wide mt" data-act="closeSheet">Start the new week</button>`);
}
