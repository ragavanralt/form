// The Build, Daily Drop, rewards, seasons, duo streaks, feature switches and exercise drawings.
import assert from 'node:assert/strict';
import { seedState } from './seed.js';
import { todayK, addDays, streakInfo, normalize, feat, FEATURES, freshState } from '../js/core.js';
import { buildOf, levelUps, levelFor, heatOf } from '../js/build.js';
import { dropFor } from '../js/drop.js';
import { grant, openCrate, unopened, owned } from '../js/loot.js';
import { seasonOf, seasonStats, wrappedDue, EPOCH } from '../js/season.js';
import { holdString, duoStreak } from '../js/duo.js';
import { exDrawing, patternFor, PATTERNS } from '../js/draw.js';
import { EXERCISES } from '../js/exercises.js';

const t = (name, f) => { f(); console.log('ok', name); };
const T = '2026-11-23';

t('feature switches default on, survive normalize, and can be off', () => {
  const s = normalize({});
  assert.equal(FEATURES.every(f => feat(s, f.id)), true);
  s.settings.features.drop = false;
  const s2 = normalize(JSON.parse(JSON.stringify(s)));
  assert.equal(feat(s2, 'drop'), false); assert.equal(feat(s2, 'build'), true);
});

t('build: levels come from sets, never drop, and cool off', () => {
  assert.equal(levelFor(0), 1); assert.equal(levelFor(3), 2); assert.ok(levelFor(500) > levelFor(100));
  const S = seedState(70, T), b = buildOf(S, T);
  assert.ok(b.m.chest.level > 1 && b.m.quads.level > 1);
  assert.equal(b.m.abs.sets, 0, 'no ab work in the program');
  const later = buildOf(S, addDays(T, 30));
  assert.equal(later.m.chest.level, b.m.chest.level, 'levels never drop');
  assert.equal(later.m.chest.state, 'cold'); assert.ok(later.cooling.length > 0);
  const h = heatOf(b); assert.ok(h.chest > 0 && h.abs === 0);
});
t('build: a workout shows which muscles levelled up', () => {
  const S = seedState(70, T), k = Object.keys(S.days).sort().reverse().find(d => S.days[d].wo);
  const ups = levelUps(S, k); assert.ok(Array.isArray(ups)); ups.forEach(u => assert.equal(u.to, u.from + 1));
});

t('drop: picked once, kept all day, and ticks off when done', () => {
  const S = seedState(70, T);
  const d = dropFor(S, todayK()); assert.ok(d && d.t && d.prog === 0);
  const again = dropFor(S, todayK()); assert.equal(again.t, d.t, 'same drop all day');
  assert.equal(dropFor(S, addDays(todayK(), -3)), null, 'past days without a saved drop show nothing');
  S.drops[todayK()] = { id: 'protein', p: { g: 100 } };
  S.days[todayK()] = { meals: [{ cal: 500, p: 120, c: 0, f: 0 }], cardio: [], supps: {}, steps: 0, water: 0, weight: 0 };
  assert.equal(dropFor(S, todayK()).done, true);
});

t('rewards: one per drop, opened once, freezes protect the streak', () => {
  const S = seedState(30, T), k = addDays(T, -1);
  S.drops[k] = { id: 'protein', p: { g: 1 }, done: true };
  const c = grant(S, T); assert.ok(c.some(x => x.src === 'drop:' + k));
  assert.equal(grant(S, T).length, 0, 'never granted twice');
  unopened(S).forEach(x => openCrate(S, x.id));
  assert.equal(unopened(S).length, 0); assert.ok(S.loot.items.length >= 1);
  const F = freshState(); F.profile.start = addDays(T, -5);
  for (let i = 5; i >= 1; i--) F.days[addDays(T, -i)] = { meals: [], cardio: [], supps: {}, steps: 99999, water: 99999, weight: 0, wo: null };
  F.modules = { food: false, train: false, cardio: false, steps: true, water: true, supps: false, weight: false };
  F.days[addDays(T, -2)].steps = 0; F.days[addDays(T, -2)].water = 0;
  assert.equal(streakInfo(F, T).streak, 1, 'a missed day breaks it');
  F.loot.items.push({ kind: 'freeze', v: 'freeze', at: addDays(T, -4) });
  assert.equal(streakInfo(F, T).streak, 4, 'a reward freeze covers it');
  assert.equal(owned(S, 'title').length + owned(S, 'frame').length + owned(S, 'freeze').length, S.loot.items.length);
});

t('seasons: 6-week blocks from the epoch, tiers from wins, Wrapped due once', () => {
  assert.equal(seasonOf(EPOCH).n, 1); assert.equal(seasonOf(addDays(EPOCH, 41)).n, 1); assert.equal(seasonOf(addDays(EPOCH, 42)).n, 2);
  const se = seasonOf(T); assert.equal(se.day >= 1 && se.day <= 42, true);
  const S = seedState(120, T), st = seasonStats(S, se.n - 1, T);
  assert.ok(st.done && st.days === 42 && st.workouts > 0 && st.tier[0]);
  assert.equal(wrappedDue(S, T), se.n - 1);
  S.seen.wrapped = se.n - 1; assert.equal(wrappedDue(S, T), 0);
  const fresh = seedState(3, T); assert.equal(wrappedDue(fresh, T), 0, 'no Wrapped for a season you weren’t in');
});

t('duo: counts days both of you kept alive', () => {
  const me = '0'.repeat(55) + '11111', them = '0'.repeat(56) + '1111';
  assert.equal(duoStreak(me, { hold: them, day: T }, T).n, 4);
  assert.equal(duoStreak(me, { hold: them.slice(0, -1) + '0', day: T }, T).n, 3, 'today not done yet does not break it');
  assert.equal(duoStreak(me, { hold: them.slice(0, -1), day: addDays(T, -1) }, T).n, 3, 'their stats from yesterday still line up');
  assert.equal(duoStreak(me, null, T).n, 0);
  assert.equal(holdString(seedState(70, T), T).length, 60);
});

t('drawings: every exercise maps to a pattern and draws clean SVG', () => {
  EXERCISES.forEach(x => {
    const [p] = patternFor(x); assert.ok(PATTERNS.includes(p), x.n + ' → ' + p);
    for (const anim of [false, true]) { const svg = exDrawing(x, { anim }); assert.ok(svg.startsWith('<svg') && !/NaN|undefined/.test(svg), x.n); }
  });
  assert.ok(PATTERNS.includes(patternFor({ n: 'Cable Y-Raise', p: ['delts'], e: 'Cable' })[0]));
  assert.ok(PATTERNS.includes(patternFor({ n: 'Mystery move', p: ['glutes'], e: 'Band' })[0]));
});

t('drop: never water if you never log water, and one swap a day', async () => {
  const { swapDrop } = await import('../js/drop.js');
  const S = seedState(30, T); Object.values(S.days).forEach(d => { d.water = 0; });
  for (let i = 0; i < 40; i++) { S.drops = {}; S.profile.start = addDays(T, -30 - i); assert.notEqual(dropFor(S, todayK()).id, 'water'); }
  S.drops = { [todayK()]: { id: 'water', p: { ml: 2500 }, done: false } };
  assert.notEqual(dropFor(S, todayK()).id, 'water', 'an old water drop gets re-picked');
  const first = dropFor(S, todayK()).id, sw = swapDrop(S);
  assert.ok(sw && sw.id !== first); assert.equal(swapDrop(S), null, 'only one swap');
});
t('calendar: workouts at their time, days with food, planned workouts ahead', async () => {
  const { calEvents } = await import('../js/cal.js');
  const S = seedState(20, T), ev = calEvents(S, T);
  const wo = ev.filter(e => e.u.startsWith('wo-')), days = ev.filter(e => e.u.startsWith('day-')), plan = ev.filter(e => e.u.startsWith('plan-'));
  assert.ok(wo.length > 3 && days.length > 10 && plan.length > 3);
  wo.forEach(e => { assert.match(e.s, /^\d{8}T\d{6}$/); assert.ok(e.e > e.s); assert.match(e.d, /min · .* sets/); });
  days.forEach(e => { assert.equal(e.a, 1); assert.match(e.t, /^Built \d+ · /); });
  assert.ok(days.some(e => /Food: .* kcal/.test(e.d) && /Oats/.test(e.d)), 'meals listed');
  assert.ok(plan.every(e => e.s > T.replace(/-/g, '')), 'plan is in the future');
  S.modules.food = false; assert.ok(!calEvents(S, T).some(e => /Food:/.test(e.d)), 'no food when food is off');
});
console.log('all feature tests passed');
