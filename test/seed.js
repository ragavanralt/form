// Builds a realistic Lifted state for tests and local previews: ~10 weeks of food, steps and an upper/lower split.
// In the browser: import('/test/seed.js').then(m => m.seedBrowser())
import { freshState, addDays, todayK, uid, pdk } from '../js/core.js';
import { PROGRAMS } from '../js/exercises.js';

function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

export function seedState(days = 70, today = todayK(), seed = 7) {
  const r = rng(seed), S = freshState();
  Object.assign(S.profile, { name: 'Sam', sex: 'male', age: 24, heightCm: 180, weightKg: 80, goal: 'bulk', start: addDays(today, -days), units: 'kg', experience: 'intermediate' });
  S.onboarded = true; S.seen.tour = true; S.seen.recap = addDays(today, -7);
  Object.assign(S.targets, { cal: 2900, pro: 160, carb: 340, fat: 85, steps: 9000, water: 3000, cardio: 20 });
  const p = PROGRAMS.ul4, ids = {};
  Object.entries(p.r).forEach(([key, [name, ex]]) => { const rt = { id: uid(), name, ex: ex.map(([n, s, rp]) => ({ name: n, sets: s, reps: rp, note: '' })) }; S.routines.push(rt); ids[key] = rt.id; });
  for (let i = 0; i < 7; i++) S.plan[i] = 'rest';
  Object.entries(p.days).forEach(([dw, key]) => { S.plan[dw] = ids[key]; });
  const base = { 'Incline Dumbbell Press': 30, 'Chest-Supported Row': 60, 'Machine Chest Press': 70, 'Lat Pulldown': 65, 'Machine Shoulder Press': 50, 'Cable Lateral Raise': 10, 'Hammer Curl': 16, 'Rope Pushdown': 30, 'Leg Press': 160, 'Romanian Deadlift': 90, 'Leg Extension': 55, 'Seated Leg Curl': 50, 'Bulgarian Split Squat': 20, 'Calf Raise': 80 };
  for (let i = days; i >= 1; i--) {
    const k = addDays(today, -i), dow = pdk(k).getDay(), lazy = r() < 0.12;
    const d = { u: 1, meals: [], steps: 0, water: 0, supps: {}, cardio: [], wo: null, weight: 0, closed: false, note: '' };
    if (!lazy) {
      const cal = 2900 + Math.round((r() - 0.5) * 700), pro = 160 + Math.round((r() - 0.6) * 60);
      [['breakfast', 0.25], ['lunch', 0.35], ['dinner', 0.3], ['snack', 0.1]].forEach(([type, f]) => d.meals.push({ id: uid(), name: { breakfast: 'Oats and eggs', lunch: 'Chicken rice bowl', dinner: 'Steak and potatoes', snack: 'Protein shake' }[type], emoji: '', type, cal: Math.round(cal * f), p: Math.round(pro * f), c: Math.round(340 * f), f: Math.round(85 * f), t: '' }));
      d.steps = 5000 + Math.round(r() * 7000); d.water = 1500 + Math.round(r() * 6) * 250;
      if (r() < 0.4) d.cardio.push({ id: uid(), type: 'Incline walk', min: 20 });
      if (r() < 0.5) d.weight = +(80 + (days - i) * 0.03 + (r() - 0.5)).toFixed(1);
    }
    const rid = S.plan[dow];
    if (rid !== 'rest' && !lazy && r() < 0.9) {
      const rt = S.routines.find(x => x.id === rid), wk = (days - i) / 7, st = pdk(k).getTime() + 17 * 3600000;
      d.wo = { id: uid(), rid, name: rt.name, status: 'done', start: st, end: st + 3600000 * (0.9 + r() * 0.5), ex: rt.ex.map(e => { const w = Math.round((base[e.name] || 40) * (1 + wk * 0.012) / 2.5) * 2.5; return { id: uid(), name: e.name, muscle: '', reps: e.reps, note: '', rest: 0, sets: Array.from({ length: e.sets }, (_, j) => ({ w: String(w), r: String(Math.max(5, 11 - j - Math.round(r() * 2))), k: 'N', done: true, pr: '' })) }; }) };
    }
    S.days[k] = d;
  }
  return S;
}
export function seedBrowser(days = 70) { localStorage.setItem('form2:state', JSON.stringify(seedState(days))); location.reload(); }
