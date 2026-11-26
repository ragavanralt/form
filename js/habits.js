// Your habits, learned from your log: when you usually eat each meal and when you usually train.
// Reminders go out at YOUR times, not fixed ones. Pure: node tests import it.
import { addDays, todayK, pad, liftDone } from './core.js';

export const MEAL_DEF = { breakfast: '08:00', lunch: '12:30', dinner: '18:30' };
const toMin = hm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : null; };
export const toHM = n => pad(Math.floor(n / 60) % 24) + ':' + pad(Math.round(n % 60));
const median = a => { const s = a.slice().sort((x, y) => x - y), i = s.length >> 1; return s.length % 2 ? s.at(i) : (s.at(i - 1) + s.at(i)) / 2; };
const round5 = n => Math.round(n / 5) * 5;

// { breakfast: { at, learned, n }, … } — at least 3 logged meals of a type in the last 3 weeks to trust it.
export function mealTimes(S, today = todayK()) {
  const got = { breakfast: [], lunch: [], dinner: [] };
  for (let i = 1; i <= 21; i++) { const d = S.days[addDays(today, -i)]; if (!d) continue; (d.meals || []).forEach(m => { const t = toMin(m.t); if (t != null && got[m.type]) got[m.type].push(t); }); }
  const own = (S.settings.notif && S.settings.notif.times) || {}, out = {};
  Object.keys(got).forEach(k => {
    if (own[k]) out[k] = { at: own[k], learned: false, set: true, n: got[k].length };
    else if (got[k].length >= 3) out[k] = { at: toHM(round5(median(got[k]))), learned: true, n: got[k].length };
    else out[k] = { at: MEAL_DEF[k], learned: false, n: got[k].length };
  });
  return out;
}
// When you usually start a workout (from the last 10 with a real start time), else your set reminder time.
export function workoutTime(S, today = todayK()) {
  const own = (S.settings.notif && S.settings.notif.times) || {};
  if (own.workout) return { at: own.workout, learned: false, set: true };
  const ts = [];
  Object.keys(S.days).filter(k => k < today).sort().reverse().forEach(k => { const w = S.days[k].wo; if (ts.length < 10 && liftDone(S.days[k]) && w.start) { const d = new Date(w.start); ts.push(d.getHours() * 60 + d.getMinutes()); } });
  if (ts.length >= 3) return { at: toHM(round5(median(ts))), learned: true, n: ts.length };
  return { at: (S.settings.remind && S.settings.remind.gym) || '18:00', learned: false };
}
// What the server needs about a day's meals: when, whether logged, what's planned.
export function mealDay(S, k, times) {
  const d = S.days[k] || {}, out = {};
  ['breakfast', 'lunch', 'dinner'].forEach(t => {
    const plan = (d.plan || []).filter(m => m.type === t);
    out[t] = { at: times[t].at, logged: (d.meals || []).some(m => m.type === t), plan: plan.map(m => m.name).slice(0, 3), kcal: plan.reduce((a, m) => a + (+m.cal || 0), 0) };
  });
  return out;
}
