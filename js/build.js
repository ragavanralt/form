// The Build: every muscle has its own level from the hard sets you have done for it.
// Primary muscle = 1 set, secondary = half a set. Levels never go down; muscles you skip just cool off.
// Pure: node tests import it.
import { addDays, dayDiff, wkStart, num, todayK } from './core.js';
import { findEx, MUSCLES } from './exercises.js';

export const MUSCLE_IDS = Object.keys(MUSCLES);
export const levelFor = sets => 1 + Math.floor(Math.sqrt(Math.max(0, sets) / 2.5));
export const setsFor = L => 2.5 * (L - 1) * (L - 1); // sets needed to reach level L
export const WEEK_SETS = 10; // a solid weekly dose per muscle

// Hard sets per muscle for each day. excl skips one day (to compare before/after a session).
function perDay(S, until, excl) {
  const out = [];
  Object.keys(S.days).sort().forEach(k => {
    if (k > until || k === excl) return;
    const w = S.days[k].wo; if (!w || w.status !== 'done' || !Array.isArray(w.ex)) return;
    const m = {};
    w.ex.forEach(e => {
      const n = (e.sets || []).filter(s => s.done && s.k !== 'W' && num(s.r) > 0).length; if (!n) return;
      const x = findEx(e.name, S.customEx) || { p: e.muscle ? [e.muscle] : [], s: [] };
      (x.p || []).forEach(id => { m[id] = (m[id] || 0) + n; });
      (x.s || []).forEach(id => { m[id] = (m[id] || 0) + n * 0.5; });
    });
    if (Object.keys(m).length) out.push({ k, m });
  });
  return out;
}

export function buildOf(S, today = todayK(), excl) {
  const rows = perDay(S, today, excl), ws = wkStart(today), m = {};
  MUSCLE_IDS.forEach(id => { m[id] = { id, n: MUSCLES[id], sets: 0, week: 0, last: '', days: Infinity }; });
  rows.forEach(({ k, m: dm }) => Object.entries(dm).forEach(([id, v]) => {
    const x = m[id]; if (!x) return;
    x.sets += v; if (k >= ws) x.week += v;
    if (dm[id] >= 1 && (!x.last || k > x.last)) x.last = k;
  }));
  Object.values(m).forEach(x => {
    x.level = levelFor(x.sets);
    const lo = setsFor(x.level), hi = setsFor(x.level + 1);
    x.frac = (x.sets - lo) / (hi - lo);
    x.days = x.last ? dayDiff(x.last, today) : Infinity;
    x.state = x.days <= 3 ? 'fresh' : x.days <= 7 ? 'ok' : x.days <= 14 ? 'cooling' : 'cold';
  });
  const list = Object.values(m), trained = list.filter(x => x.sets > 0);
  const total = list.reduce((a, x) => a + x.level, 0);
  const cooling = trained.filter(x => x.days >= 8).sort((a, b) => b.days - a.days);
  return { m, list, total, top: trained.slice().sort((a, b) => b.sets - a.sets)[0] || null, cooling, sessions: rows.length };
}

// Muscles that went up a level because of the workout on day k.
export function levelUps(S, k) {
  const before = buildOf(S, k, k), after = buildOf(S, k);
  return MUSCLE_IDS.filter(id => after.m[id].level > before.m[id].level).map(id => ({ id, n: MUSCLES[id], from: before.m[id].level, to: after.m[id].level }));
}

// Intensity 0..1 for the body map: level relative to your best muscle, dimmed as it cools off.
export function heatOf(b) {
  const max = Math.max(2, ...b.list.map(x => x.level)), out = {};
  b.list.forEach(x => {
    if (!x.sets) { out[x.id] = 0; return; }
    const cool = x.state === 'fresh' ? 1 : x.state === 'ok' ? 0.85 : x.state === 'cooling' ? 0.6 : 0.4;
    out[x.id] = Math.max(0.12, (x.level / max) * cool);
  });
  return out;
}
export const daysAgo = d => (d === Infinity ? 'never' : d === 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago');
export { addDays };
