// Your log as a calendar: every workout at the time you did it, every day's score and food as an all-day event,
// and the next two weeks of planned workouts. The phone builds the events (it knows your time zone and has the data);
// the server only stores them under a random token and serves them as a calendar feed you subscribe to once.
import { addDays, todayK, pad, dk, logged, score, totals, cardioMin, liftDone, planned, routineName, num, fmt, tierOf, TIER_L } from './core.js';

const ymd = k => k.replace(/-/g, '');
const at = ms => { const x = new Date(ms); return ymd(dk(x)) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; };
const hm = (k, t) => ymd(k) + 'T' + (/^\d{1,2}:\d{2}$/.test(t || '') ? t.split(':').map(x => x.padStart(2, '0')).join('') : '1800') + '00';

// Events are { u: uid, a: all-day, s: start, e: end, t: title, d: description } with local "floating" times.
export function calEvents(S, today = todayK(), back = 120, ahead = 14) {
  const out = [], u = S.profile.units || 'kg';
  for (let i = back; i >= 0; i--) {
    const k = addDays(today, -i), d = S.days[k];
    if (!d || !logged(d) || k < (S.profile.start || k)) continue;
    const sc = score(S, k), t = totals(d), lines = [];
    if (S.modules.food && d.meals.length) {
      lines.push(`Food: ${fmt(t.cal)} kcal · ${Math.round(t.p)} g protein · ${Math.round(t.c)} g carbs · ${Math.round(t.f)} g fat`);
      d.meals.forEach(m => lines.push(`  ${m.name} (${fmt(+m.cal || 0)} kcal${m.p ? ', ' + Math.round(m.p) + ' g protein' : ''})`));
    }
    if (liftDone(d)) lines.push(`Workout: ${d.wo.name}`);
    else if (S.modules.train) lines.push(sc.fx === 'rest' ? 'Rest day' : 'Workout: not done');
    if (cardioMin(d)) lines.push(`Cardio: ${d.cardio.map(c => `${c.type} ${c.min} min`).join(', ')}`);
    if (d.steps) lines.push(`Steps: ${fmt(d.steps)}`);
    if (d.water) lines.push(`Water: ${+(d.water / 1000).toFixed(2)} L`);
    const food = S.modules.food && d.meals.length ? ` · ${fmt(t.cal)} kcal` : '';
    out.push({ u: 'day-' + k, a: 1, s: ymd(k), e: ymd(addDays(k, 1)), t: `Built ${sc.total} · ${TIER_L[tierOf(sc.total)]}${food}`, d: lines.join('\n') });
    if (liftDone(d)) {
      const w = d.wo, sets = w.ex.flatMap(e => e.sets.filter(s => s.done && s.k !== 'W').map(s => ({ e, s })));
      const vol = sets.reduce((a, x) => a + num(x.s.w) * num(x.s.r), 0), prs = sets.filter(x => x.s.pr).length;
      const start = w.start || new Date(k + 'T18:00:00').getTime(), end = w.end && w.end > start ? w.end : start + 3600000, min = Math.round((end - start) / 60000);
      const desc = [`${min} min · ${fmt(vol)} ${u} · ${sets.length} sets${prs ? ` · ${prs} PR${prs > 1 ? 's' : ''}` : ''}`, ...w.ex.filter(e => e.sets.some(s => s.done)).map(e => `${e.name}: ${e.sets.filter(s => s.done).map(s => (s.k === 'W' ? 'W ' : '') + s.w + '×' + s.r + (s.pr ? ' (PR)' : '')).join(', ')}`)];
      out.push({ u: 'wo-' + k, a: 0, s: at(start), e: at(end), t: `🏋️ ${w.name}${prs ? ' · ' + prs + ' PR' : ''}`, d: desc.join('\n') });
    }
  }
  for (let i = 1; i <= ahead; i++) {
    const k = addDays(today, i), fx = planned(S, k);
    if (!S.modules.train || fx === 'rest') continue;
    const r = S.routines.find(x => x.id === fx), s = hm(k, S.settings.remind && S.settings.remind.gym);
    const e = s.slice(0, 9) + pad(Math.min(23, +s.slice(9, 11) + 1)) + s.slice(11);
    out.push({ u: 'plan-' + k, a: 0, s, e, t: `${routineName(S, fx)} (planned)`, d: r ? r.ex.map(x => `${x.name}: ${x.sets} × ${x.reps}`).join('\n') : '' });
  }
  return out;
}
