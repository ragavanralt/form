// Core logic tests: scoring, streaks, levels, lifting history, targets and the Form v1 migration.
import * as C from '../js/core.js';
import { findEx, EXERCISES, PROGRAMS } from '../js/exercises.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } else console.log('ok', m); };
const T = '2026-11-17';
const S0 = () => { const s = C.freshState(); s.profile.start = '2026-11-01'; s.onboarded = true; s.modules = { food: true, train: true, cardio: true, steps: true, water: true, supps: false, weight: true }; s.targets = { cal: 2200, pro: 160, carb: 250, fat: 65, steps: 8000, water: 2500, cardio: 20 }; return s; };
const meal = (cal, p) => ({ id: C.uid(), name: 'x', cal, p, c: 0, f: 0, type: 'lunch' });
const full = (s, k) => { const d = C.blankDay(); d.meals = [meal(2150, 165)]; d.steps = 9000; d.water = 2500; d.cardio = [{ min: 25 }]; s.days[k] = d; };

// weights always sum to 100
{ const s = S0(); ok(Math.round(Object.values(C.weights(s)).reduce((a, b) => a + b, 0)) === 100, 'weights sum to 100'); s.modules = { food: true, train: false, cardio: false, steps: false, water: false, supps: false, weight: false }; const w = C.weights(s); ok(Math.round(w.cal + w.pro) === 100 && w.train == null, 'weights rebalance when modules are off'); }
// a full day on a rest day is 100
{ const s = S0(); full(s, T); ok(C.score(s, T).total === 100, 'perfect rest day scores 100'); }
// a planned lift that isn't done costs the training points
{ const s = S0(); s.routines = [{ id: 'r1', name: 'Push', ex: [] }]; s.plan[C.pdk(T).getDay()] = 'r1'; full(s, T); const sc = C.score(s, T); ok(sc.total === 100 - Math.round(C.weights(s).train), 'missed lift loses training points');
  s.days[T].wo = { status: 'done', ex: [{ name: 'Bench', sets: [{ w: '60', r: '8', done: true, k: 'N' }] }] }; ok(C.score(s, T).total === 100, 'finished lift earns them back'); }
// calorie curve
ok(C.calFrac(2200, 2200, 'cut') === 1 && C.calFrac(2550, 2200, 'cut') === 0 && C.calFrac(1700, 2200, 'cut') === 1, 'cut calorie window');
ok(C.calFrac(2600, 2200, 'bulk') === 1 && C.calFrac(1850, 2200, 'bulk') === 0, 'bulk calorie window');
ok(C.calFrac(2300, 2200, 'maintain') === 1 && C.calFrac(2900, 2200, 'maintain') === 0, 'maintain calorie window');
ok(C.proFrac(160, 160) === 1 && C.proFrac(40, 160) === 0 && C.proFrac(104, 160) > 0.4, 'protein curve');
// empty day scores only rest-day training
{ const s = S0(); ok(C.score(s, T).total === Math.round(C.weights(s).train), 'empty rest day only gets training'); }
// streaks
{ const s = S0(); for (let i = 1; i <= 5; i++) full(s, C.addDays(T, -i)); const st = C.streakInfo(s, T); ok(st.streak === 5 && st.atRisk, 'five day streak, today at risk'); full(s, T); ok(C.streakInfo(s, T).streak === 6, 'today counts once it’s good'); }
{ const s = S0(); s.profile.start = '2026-10-27'; for (let k = '2026-10-27'; k <= '2026-11-02'; k = C.addDays(k, 1)) full(s, k); for (let k = '2026-11-04'; k < T; k = C.addDays(k, 1)) full(s, k);
  const st = C.streakInfo(s, T); ok(st.frozen['2026-11-03'] && st.streak > 7, 'perfect week earns a freeze that covers a missed day'); }
// week summary
{ const s = S0(); const ws = C.wkStart(T); for (let k = ws; k < T; k = C.addDays(k, 1)) full(s, k); const w = C.weekSummary(s, ws, T); ok(w.W === w.days && w.pts === 100 * w.days, 'week summary'); }
// lifting: history, PR, overload
{ const s = S0(); const mk = (k, w, r) => { s.days[k] = C.blankDay(); s.days[k].wo = { status: 'done', name: 'Push', ex: [{ name: 'Bench Press', sets: [{ w: String(w), r: String(r), done: true, k: 'N' }, { w: '20', r: '10', done: true, k: 'W' }] }] }; };
  mk('2026-11-03', 60, 8); mk('2026-11-06', 60, 8); mk('2026-11-10', 60, 8);
  const h = C.liftHistory(s); ok(h.sessions.length === 3 && h.map['Bench Press'][0].sets.length === 1, 'history skips warm-ups');
  ok(C.prCheck(h, 'Bench Press', 62.5, 6, T) === 'Weight PR' && C.prCheck(h, 'Bench Press', 60, 10, T) === 'Strength PR' && C.prCheck(h, 'Bench Press', 60, 8, T) === '', 'PR detection');
  const o = C.overload(h, 'Bench Press', '6–8', T); ok(o.next.w === 65 && o.stall, 'overload suggests a jump at the top of the range and flags a stall'); }
// levels
ok(C.levelOf(0).level === 1 && C.levelOf(C.levelReq(1)).level === 2 && C.levelOf(C.levelReq(3) + 5).level === 4, 'levels');
// targets
{ const t = C.suggestTargets({ sex: 'male', age: 25, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'cut' }); ok(t.cal > 2000 && t.cal < 2600 && t.pro === 160, 'suggested targets are sensible'); }
// coach
{ const s = S0(); s.routines = [{ id: 'r1', name: 'Legs', ex: [] }]; s.plan[C.pdk(T).getDay()] = 'r1'; const mv = C.nextMoves(s, T); ok(mv[0].id === 'cal' || mv[0].id === 'train', 'coach ranks the biggest gap first'); }
// achievements
{ const s = S0(); full(s, C.addDays(T, -1)); const a = C.achievements(s, T); ok(a.find(x => x.id === 'first').got && a.find(x => x.id === 'perfect').got && !a.find(x => x.id === 'w1').got, 'achievements'); }
// migration from Form v1
{
  const v1 = { profile: { name: 'Ragavan', mode: 'cut', start: '2026-10-15' }, targets: { cal: 2100, pro: 170, steps: 9000, water: 3000 },
    fixtures: { 0: 'Rest', 1: 'Push', 2: 'Pull', 3: 'Rest', 4: 'My Legs', 5: 'Push', 6: 'Rest' },
    customTemplates: [{ id: 'c1', name: 'My Legs', ex: [['Leg Press', 'Quads', 3, '8–12', ''], ['Seated Leg Curl', 'Hamstrings / Glutes', 3, '10–15', '']] }],
    foods: { fav: [{ name: 'Shake', cal: 160, p: 30 }], recent: [], combos: [] },
    days: { '2026-11-10': { u: 5, meals: [{ id: 'm', name: 'Eggs', type: 'breakfast', cal: 300, p: 20, c: 2, f: 22 }], steps: 9000, water: 2000, creatine: true, cardio: [{ id: 'c', type: 'Incline walk', min: 30 }], wo: { name: 'Push', type: 'Push', status: 'done', start: 1, end: 2, ex: [{ name: 'Pec Deck', cat: 'Chest', reps: '12–20', sets: [{ w: '50', r: '12', k: 'N', done: true, pr: 'Rep PR' }] }] }, ft: { at: 1 }, sub: false } } };
  const s = C.migrateV1(v1, n => { const x = findEx(n); return x ? { m: x.p[0] } : null; });
  ok(s.profile.goal === 'cut' && s.targets.cal === 2100 && s.targets.pro === 170, 'migration keeps goal and targets');
  ok(s.routines.length === 3 && s.routines.find(r => r.name === 'My Legs').ex.length === 2 && s.routines.find(r => r.name === 'Push').ex.length === 6, 'migration builds routines from custom and built-in templates');
  ok(s.plan[1] === s.plan[5] && s.plan[0] === 'rest' && C.routineName(s, s.plan[4]) === 'My Legs', 'migration keeps the weekly plan');
  const d = s.days['2026-11-10'];
  ok(d.meals.length === 1 && d.supps.creatine && d.cardio[0].min === 30 && d.closed, 'migration keeps meals, creatine, cardio and full time');
  ok(d.wo.ex[0].muscle === 'chest' && d.wo.ex[0].sets[0].pr === 'Rep PR' && C.liftDone(d), 'migration keeps workouts and PRs');
  ok(C.normalize(JSON.parse(JSON.stringify(s))).days['2026-11-10'].meals.length === 1, 'migrated state survives a save and load');
}
// exercise library
ok(EXERCISES.length >= 100 && new Set(EXERCISES.map(e => e.n)).size === EXERCISES.length, 'library has 100+ unique exercises');
ok(Object.values(PROGRAMS).every(p => Object.values(p.r).every(([, ex]) => ex.every(([n]) => findEx(n)))), 'every program exercise is in the library');
ok(findEx('rdl').n === 'Romanian Deadlift' && findEx('Lat Pulldowns').n === 'Lat Pulldown', 'exercise lookup handles aliases and plurals');

if (fails) { console.error(fails + ' failed'); process.exit(1); }
console.log('all core tests passed');
