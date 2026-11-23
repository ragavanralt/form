// Seasons: 6-week blocks on a shared calendar (so friends are in the same season), each ending in a Wrapped.
// Tier comes from wins in the season. Pure.
import { addDays, dayDiff, todayK, score, totals, liftDone, liftHistory, logged, WIN, HOLD, pdk, wkStart } from './core.js';
import { buildOf } from './build.js';

export const EPOCH = '2026-01-05', LEN = 42;
export const TIERS = [['Bronze', 0, '#c98a5b'], ['Silver', 8, '#b8c2d1'], ['Gold', 16, '#ffc233'], ['Platinum', 24, '#7ee7e0'], ['Diamond', 32, '#a593ff']];
export function seasonOf(k = todayK()) {
  const n = Math.floor(dayDiff(EPOCH, k) / LEN) + 1, start = addDays(EPOCH, (n - 1) * LEN), end = addDays(start, LEN - 1);
  return { n, start, end, day: dayDiff(start, k) + 1, week: Math.floor(dayDiff(start, k) / 7) + 1, left: dayDiff(k, end) };
}
export const seasonName = n => 'Season ' + n;
export const tierOf = wins => TIERS.reduce((t, x) => (wins >= x[1] ? x : t), TIERS[0]);
export const nextTier = wins => TIERS.find(x => x[1] > wins) || null;

// Everything Wrapped needs, for season n up to today (or its end).
export function seasonStats(S, n, today = todayK()) {
  const s0 = seasonOf(addDays(EPOCH, (n - 1) * LEN)), last = today < s0.end ? today : s0.end, s = seasonOf(last);
  const ks = []; for (let k = s.start; k <= last; k = addDays(k, 1)) if (k >= (S.profile.start || k)) ks.push(k);
  const scs = ks.map(k => score(S, k));
  const wins = scs.filter(x => x.total >= WIN).length, holds = scs.filter(x => x.total >= HOLD).length;
  let best = 0, cur = 0; scs.forEach(x => { cur = x.total >= HOLD ? cur + 1 : 0; best = Math.max(best, cur); });
  const showed = ks.filter(k => logged(S.days[k])).length;
  const h = liftHistory(S), ses = h.sessions.filter(x => x.date >= s.start && x.date <= last);
  const vol = ses.reduce((a, x) => a + x.vol, 0), prs = ses.reduce((a, x) => a + x.prs, 0), mins = ses.reduce((a, x) => a + (x.dur || 0), 0) / 60000;
  // the lift that went up the most (estimated 1RM, first vs best this season)
  let lift = null;
  Object.entries(h.map).forEach(([name, rows]) => {
    const inS = rows.filter(r => r.date >= s.start && r.date <= last), before = rows.filter(r => r.date < s.start).at(-1) || inS[0];
    if (inS.length < 2 || !before) return;
    const from = before.e1, to = Math.max(...inS.map(r => r.e1)), gain = to - from;
    if (gain > 0 && (!lift || gain / from > lift.pct)) lift = { name, from: Math.round(from), to: Math.round(to), pct: gain / from };
  });
  const b0 = buildOf(S, addDays(s.start, -1)), b1 = buildOf(S, last);
  const ups = b1.list.map(x => ({ id: x.id, n: x.n, from: b0.m[x.id].level, to: x.level, sets: x.sets - b0.m[x.id].sets })).filter(x => x.to > x.from).sort((a, b) => b.to - b.from - (a.to - a.from));
  const top = b1.list.map(x => ({ n: x.n, sets: x.sets - b0.m[x.id].sets })).sort((a, b) => b.sets - a.sets)[0];
  const food = ks.map(k => totals(S.days[k] || { meals: [] })).filter(t => t.cal > 0);
  const proDays = food.filter(t => t.p >= S.targets.pro).length, avgPro = food.length ? Math.round(food.reduce((a, t) => a + t.p, 0) / food.length) : 0;
  const bestDay = scs.slice().sort((a, b) => b.total - a.total)[0];
  const steps = ks.reduce((a, k) => a + ((S.days[k] || {}).steps || 0), 0);
  const drops = ks.filter(k => S.drops && S.drops[k] && S.drops[k].done).length;
  const dow = [0, 0, 0, 0, 0, 0, 0]; ses.forEach(x => { dow[pdk(x.date).getDay()]++; });
  const favDay = ses.length ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow.indexOf(Math.max(...dow))] : '';
  return { ...s, days: ks.length, showed, wins, holds, streak: best, tier: tierOf(wins), next: nextTier(wins), workouts: ses.length, vol, prs, mins: Math.round(mins), lift, ups, levels: ups.reduce((a, x) => a + x.to - x.from, 0), top: top && top.sets > 0 ? top : null, proDays, avgPro, bestDay: bestDay && bestDay.total ? { k: bestDay.k, total: bestDay.total } : null, steps, drops, favDay, trained: ks.filter(k => liftDone(S.days[k])).length, done: today > s.end };
}
// The most recent finished season that started after you did, if its Wrapped hasn't been seen.
export function wrappedDue(S, today = todayK()) {
  const cur = seasonOf(today), prev = cur.n - 1; if (prev < 1) return 0;
  const p = seasonOf(addDays(EPOCH, (prev - 1) * LEN));
  if ((S.profile.start || today) > p.end || (S.seen.wrapped || 0) >= prev) return 0;
  return prev;
}
export { wkStart };
