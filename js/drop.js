// Daily Drop: one small challenge a day, picked from what you actually track, gone at midnight.
// The pick is stored the first time it is shown, so it doesn't change as the day goes on. Pure.
import { totals, cardioMin, liftDone, planned, score, num, e1rm, fmt, calFrac, todayK } from './core.js';
import { buildOf } from './build.js';
import { findEx } from './exercises.js';

const hash = s => [...String(s)].reduce((x, c) => (x * 33 + c.charCodeAt(0)) >>> 0, 5381);
const lastOf = (S, name, k) => {
  const ks = Object.keys(S.days).filter(d => d < k).sort().reverse();
  for (const d of ks) { const w = S.days[d].wo; if (!w || w.status !== 'done') continue; const e = (w.ex || []).find(x => x.name === name); if (!e) continue; const sets = e.sets.filter(s => s.done && s.k !== 'W' && num(s.r) > 0); if (sets.length) return sets.reduce((b, s) => (e1rm(num(s.w), num(s.r)) > e1rm(num(b.w), num(b.r)) ? s : b), sets[0]); }
  return null;
};
const woVol = w => (w && w.ex || []).reduce((a, e) => a + e.sets.filter(s => s.done && s.k !== 'W').reduce((b, s) => b + num(s.w) * num(s.r), 0), 0);
const doneSets = (d, name) => d.wo && d.wo.status === 'done' ? ((d.wo.ex || []).find(e => e.name === name) || { sets: [] }).sets.filter(s => s.done && s.k !== 'W') : [];

// Each kind: when it can show, its parameters, its text, and how far along today is (0..1).
const KINDS = {
  beat: {
    ok: (S, k, c) => c.train && c.routine && c.routine.ex.some(e => lastOf(S, e.name, k)),
    make: (S, k, c) => { const opts = c.routine.ex.filter(e => lastOf(S, e.name, k)); const e = opts[hash(k) % opts.length], l = lastOf(S, e.name, k); return { ex: e.name, w: num(l.w), r: num(l.r) }; },
    text: (p, S) => ({ t: `Beat last time on ${p.ex}`, s: `${p.w} ${S.profile.units} × ${p.r + 1}, or more weight` }),
    prog: (S, d, p) => (doneSets(d, p.ex).some(s => (num(s.w) >= p.w && num(s.r) > p.r) || (num(s.w) > p.w && num(s.r) >= p.r)) ? 1 : 0),
  },
  volume: {
    ok: (S, k, c) => c.train && c.lastSame,
    make: (S, k, c) => ({ v: Math.round(woVol(c.lastSame) * 1.03 / 10) * 10, name: c.routine.name }),
    text: (p, S) => ({ t: `Out-lift your last ${p.name}`, s: `${fmt(p.v)} ${S.profile.units} total volume` }),
    prog: (S, d, p) => Math.min(1, woVol(d.wo) / (p.v || 1)),
  },
  cold: {
    ok: (S, k, c) => S.modules.train && c.cold,
    make: (S, k, c) => ({ m: c.cold.id, n: c.cold.n, days: c.cold.days }),
    text: p => ({ t: `Wake up your ${p.n.toLowerCase()}`, s: `Not trained in ${p.days} days. Any exercise for it counts` }),
    prog: (S, d, p) => (d.wo && d.wo.status === 'done' && (d.wo.ex || []).some(e => e.sets.some(s => s.done) && ((findEx(e.name, S.customEx) || {}).p || []).includes(p.m)) ? 1 : 0),
  },
  protein: {
    ok: S => S.modules.food,
    make: S => ({ g: S.targets.pro }),
    text: p => ({ t: `Hit ${p.g} g protein`, s: 'Every gram logged counts' }),
    prog: (S, d, p) => Math.min(1, totals(d).p / (p.g || 1)),
  },
  window: {
    ok: S => S.modules.food,
    make: S => ({ cal: S.targets.cal }),
    text: p => ({ t: 'Three meals, on target', s: `Log 3 or more meals and land near ${fmt(p.cal)} kcal` }),
    prog: (S, d) => { const m = d.meals.length; return m >= 3 && calFrac(totals(d).cal, S.targets.cal, S.profile.goal) >= 1 ? 1 : Math.min(0.9, m / 3 * 0.9); },
  },
  steps: {
    ok: S => S.modules.steps,
    make: S => ({ n: Math.round((S.targets.steps + 2000) / 500) * 500 }),
    text: p => ({ t: `${fmt(p.n)} steps`, s: 'A bit past your usual goal' }),
    prog: (S, d, p) => Math.min(1, (d.steps || 0) / p.n),
  },
  cardio: {
    ok: S => S.modules.cardio,
    make: S => ({ n: (S.targets.cardio || 20) + 10 }),
    text: p => ({ t: `${p.n} minutes of cardio`, s: 'Walks, rides, anything that counts' }),
    prog: (S, d, p) => Math.min(1, cardioMin(d) / p.n),
  },
  water: {
    ok: S => S.modules.water,
    make: S => ({ ml: S.targets.water }),
    text: p => ({ t: `Finish ${+(p.ml / 1000).toFixed(1)} L of water`, s: 'Tap the glasses as you go' }),
    prog: (S, d, p) => Math.min(1, (d.water || 0) / p.ml),
  },
  weigh: {
    ok: S => S.modules.weight,
    make: () => ({}),
    text: () => ({ t: 'Weigh in', s: 'Same time each day keeps the trend honest' }),
    prog: (S, d) => (d.weight > 0 ? 1 : 0),
  },
  score: {
    ok: () => true,
    make: () => ({ n: 85 }),
    text: p => ({ t: `Score ${p.n} or more today`, s: 'Close out every ring' }),
    prog: (S, d, p, k) => Math.min(1, score(S, k).total / p.n),
  },
};

function context(S, k) {
  const fx = planned(S, k), routine = fx !== 'rest' ? S.routines.find(r => r.id === fx) : null;
  const train = !!(S.modules.train && routine && routine.ex.length);
  let lastSame = null;
  if (train) { const ks = Object.keys(S.days).filter(d => d < k).sort().reverse(); for (const d of ks) { const w = S.days[d].wo; if (w && w.status === 'done' && w.rid === routine.id && woVol(w) > 0) { lastSame = w; break; } } }
  const b = S.modules.train ? buildOf(S, k) : null;
  const cold = b && b.cooling.find(x => x.days >= 8 && x.days < 60) || null;
  return { routine, train, lastSame, cold };
}

// The drop for day k. For today it is picked and saved on first sight; past days only show what was saved.
export function dropFor(S, k = todayK(), save = true) {
  let rec = S.drops && S.drops[k];
  if (!rec) {
    if (k !== todayK() || !save) return null;
    const c = context(S, k);
    const pool = Object.keys(KINDS).filter(id => { try { return KINDS[id].ok(S, k, c); } catch (e) { return false; } });
    const trainy = pool.filter(id => ['beat', 'volume', 'cold'].includes(id)), other = pool.filter(id => !trainy.includes(id));
    const h = hash(k + (S.profile.start || ''));
    const list = trainy.length && (h % 10 < 6 || !other.length) ? trainy : other.length ? other : trainy;
    if (!list.length) return null;
    const id = list[(h >> 3) % list.length];
    rec = S.drops[k] = { id, p: KINDS[id].make(S, k, c), done: false };
  }
  const K = KINDS[rec.id]; if (!K) return null;
  const d = S.days[k] || { meals: [], cardio: [], supps: {}, steps: 0, water: 0, weight: 0 };
  let prog = 0; try { prog = K.prog(S, d, rec.p, k); } catch (e) {}
  return { k, id: rec.id, ...K.text(rec.p, S), prog: Math.max(0, Math.min(1, prog || 0)), done: prog >= 1, rec };
}
// Drops completed so far (counts once per day).
export const dropsDone = S => Object.values(S.drops || {}).filter(r => r.done).length;
