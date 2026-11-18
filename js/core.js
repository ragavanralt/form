// Form core: dates, state shape, scoring, streaks, levels, achievements, migration.
// Pure logic with no DOM, so node tests can import it directly.

export const pad = n => String(n).padStart(2, '0');
export const dk = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const pdk = k => new Date(k + 'T12:00:00');
export const addDays = (k, n) => { const d = pdk(k); d.setDate(d.getDate() + n); return dk(d); };
export const todayK = () => dk();
export const wkStart = k => { const d = pdk(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dk(d); };
export const dayDiff = (a, b) => Math.round((pdk(b) - pdk(a)) / 864e5);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const num = x => { const n = parseFloat(String(x ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; };
export const nint = x => Math.round(num(x));
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clone = o => JSON.parse(JSON.stringify(o));
export const fmt = n => Math.round(n).toLocaleString('en-CA');
export const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_L = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

export const MODULES = [
  { id: 'food', n: 'Nutrition', d: 'Calories and macros, with AI photo logging', c: 'food' },
  { id: 'train', n: 'Strength training', d: 'Routines, sets, PRs and progressive overload', c: 'train' },
  { id: 'cardio', n: 'Cardio', d: 'Runs, walks, rides, any session with minutes', c: 'move' },
  { id: 'steps', n: 'Steps', d: 'A daily step goal', c: 'move' },
  { id: 'water', n: 'Water', d: 'Hydration through the day', c: 'habit' },
  { id: 'supps', n: 'Supplements', d: 'Creatine, vitamins, pills, anything daily', c: 'habit' },
  { id: 'weight', n: 'Body weight', d: 'Weigh-ins and a smoothed trend line', c: 'body' },
];

export function freshState() {
  return {
    v: 2, u: 0, onboarded: false, created: Date.now(),
    profile: { name: '', sex: '', age: 0, heightCm: 0, weightKg: 0, activity: 'moderate', goal: 'maintain', goals: [], units: 'kg', experience: 'beginner', start: todayK(), social: 'solo' },
    modules: { food: true, train: true, cardio: true, steps: true, water: true, supps: false, weight: true },
    targets: { cal: 2200, pro: 140, carb: 230, fat: 70, steps: 8000, water: 2500, cardio: 20 },
    supps: [],
    plan: { 0: 'rest', 1: 'rest', 2: 'rest', 3: 'rest', 4: 'rest', 5: 'rest', 6: 'rest' },
    planOv: {},
    routines: [],
    customEx: [],
    foods: { fav: [], recent: [] },
    settings: { theme: 'dark', accent: 'lime', rest: 90, sound: true, haptics: true, share: { workouts: true, scores: true, prs: true, meals: false }, remind: { on: false, morning: '08:30', evening: '21:30', gym: '18:00' } },
    seen: { recap: '', ach: [], tour: false, feed: 0, level: 0 },
    days: {},
  };
}

export function normalize(s) {
  const f = freshState();
  if (!s || typeof s !== 'object') return f;
  const ob = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const o = Object.assign(f, s);
  o.profile = Object.assign(freshState().profile, ob(s.profile));
  o.modules = Object.assign(freshState().modules, ob(s.modules));
  o.targets = Object.assign(freshState().targets, ob(s.targets));
  o.plan = Object.assign(freshState().plan, ob(s.plan));
  o.planOv = ob(s.planOv);
  o.settings = Object.assign(freshState().settings, ob(s.settings));
  o.settings.share = Object.assign(freshState().settings.share, ob(o.settings.share));
  o.settings.remind = Object.assign(freshState().settings.remind, ob(o.settings.remind));
  o.seen = Object.assign(freshState().seen, ob(s.seen));
  if (!Array.isArray(o.seen.ach)) o.seen.ach = [];
  o.foods = Object.assign({ fav: [], recent: [] }, ob(s.foods));
  ['routines', 'customEx', 'supps'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  o.days = ob(s.days);
  Object.values(o.days).forEach(normDay);
  return o;
}
export function blankDay() { return { u: 0, meals: [], steps: 0, water: 0, supps: {}, cardio: [], wo: null, weight: 0, closed: false, note: '' }; }
export function normDay(d) {
  if (!Array.isArray(d.meals)) d.meals = [];
  if (!Array.isArray(d.cardio)) d.cardio = [];
  d.steps = +d.steps || 0; d.water = +d.water || 0; d.weight = +d.weight || 0;
  if (!d.supps || typeof d.supps !== 'object') d.supps = {};
  return d;
}

/* ---------- targets ---------- */
const ACT = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
export const ACTIVITY = [['sedentary', 'Mostly sitting'], ['light', 'Light, on my feet some'], ['moderate', 'Moderate, active most days'], ['active', 'Very active'], ['athlete', 'Athlete or physical job']];
export function bmr(p) {
  const w = +p.weightKg, h = +p.heightCm, a = +p.age;
  if (!w || !h || !a) return 0;
  return 10 * w + 6.25 * h - 5 * a + (p.sex === 'female' ? -161 : p.sex === 'male' ? 5 : -78);
}
export function suggestTargets(p) {
  const b = bmr(p);
  const tdee = b ? b * (ACT[p.activity] || 1.55) : 2300;
  const delta = p.goal === 'cut' ? -450 : p.goal === 'bulk' ? 300 : 0;
  const cal = Math.round((tdee + delta) / 10) * 10;
  const w = +p.weightKg || 75;
  const pro = Math.round(w * (p.goal === 'cut' ? 2.0 : 1.8) / 5) * 5;
  const fat = Math.round(cal * 0.27 / 9 / 5) * 5;
  const carb = Math.max(50, Math.round((cal - pro * 4 - fat * 9) / 4 / 5) * 5);
  const water = Math.round(w * 35 / 250) * 250;
  return { cal, pro, carb, fat, tdee: Math.round(tdee), water: clamp(water, 1500, 4500) };
}

/* ---------- day helpers ---------- */
export function totals(d) {
  let cal = 0, p = 0, c = 0, f = 0;
  (d.meals || []).forEach(m => { cal += +m.cal || 0; p += +m.p || 0; c += +m.c || 0; f += +m.f || 0; });
  return { cal, p, c, f };
}
export const cardioMin = d => (d.cardio || []).reduce((a, c) => a + (+c.min || 0), 0);
export function liftDone(d) { return !!(d && d.wo && d.wo.status === 'done' && (d.wo.ex || []).some(e => (e.sets || []).some(s => s.done && s.k !== 'W'))); }
export function planned(S, k) { const o = S.planOv && S.planOv[k]; if (o) return o; return S.plan[pdk(k).getDay()] || 'rest'; }
export function logged(d) { return !!(d && ((d.meals || []).length || cardioMin(d) || liftDone(d) || d.steps || d.water || Object.values(d.supps || {}).some(Boolean) || d.weight)); }

/* ---------- scoring ---------- */
// Calories: fraction of full points depending on the goal. Same shape as the original Form rules.
export function calFrac(cal, T, goal) {
  if (!T) return 0;
  const x = cal - T;
  if (goal === 'bulk') return x <= -300 ? 0 : x < -200 ? 0.6 : x < -100 ? 0.85 : 1;
  if (goal === 'maintain') { const a = Math.abs(x); return a <= 150 ? 1 : a <= 300 ? 0.75 : a <= 450 ? 0.5 : a <= 600 ? 0.25 : 0; }
  if (x >= 300) return 0; if (x > 200) return 0.5; if (x > 100) return 0.75; if (x >= -600) return 1; if (x >= -900) return 0.75; return 0.5;
}
export function calWindow(T, goal) { return goal === 'bulk' ? [T - 100, T + 300] : goal === 'maintain' ? [T - 150, T + 150] : [T - 600, T + 100]; }
export const proFrac = (p, T) => (T ? clamp((p - 0.3 * T) / (0.7 * T), 0, 1) : 0);

export const BASE_WEIGHTS = { cal: 28, pro: 20, train: 22, cardio: 10, steps: 10, water: 5, supps: 5 };
export function weights(S) {
  const m = S.modules, w = {};
  if (m.food) { w.cal = BASE_WEIGHTS.cal; w.pro = BASE_WEIGHTS.pro; }
  if (m.train) w.train = BASE_WEIGHTS.train;
  if (m.cardio) w.cardio = BASE_WEIGHTS.cardio;
  if (m.steps) w.steps = BASE_WEIGHTS.steps;
  if (m.water) w.water = BASE_WEIGHTS.water;
  if (m.supps && S.supps.length) w.supps = BASE_WEIGHTS.supps;
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  Object.keys(w).forEach(k => { w[k] = (w[k] * 100) / sum; });
  return w;
}
export const PART = {
  cal: { n: 'Calories', c: 'food' }, pro: { n: 'Protein', c: 'pro' }, train: { n: 'Training', c: 'train' },
  cardio: { n: 'Cardio', c: 'move' }, steps: { n: 'Steps', c: 'move' }, water: { n: 'Water', c: 'water' }, supps: { n: 'Supplements', c: 'habit' },
};
export function score(S, k) {
  const d = S.days[k] || blankDay(), T = S.targets, t = totals(d), w = weights(S), fx = planned(S, k);
  const frac = {};
  if (w.cal != null) frac.cal = d.meals.length ? calFrac(t.cal, T.cal, S.profile.goal) : 0;
  if (w.pro != null) frac.pro = proFrac(t.p, T.pro);
  if (w.train != null) frac.train = fx === 'rest' || liftDone(d) ? 1 : 0;
  if (w.cardio != null) frac.cardio = clamp(cardioMin(d) / (T.cardio || 20), 0, 1);
  if (w.steps != null) frac.steps = clamp((d.steps || 0) / (T.steps || 8000), 0, 1);
  if (w.water != null) frac.water = clamp((d.water || 0) / (T.water || 2500), 0, 1);
  if (w.supps != null) { const n = S.supps.length; frac.supps = n ? S.supps.filter(x => d.supps[x.id]).length / n : 0; }
  const parts = Object.keys(w).map(id => ({ id, w: w[id], f: frac[id], pts: w[id] * frac[id], ...PART[id] }));
  const total = Math.round(parts.reduce((a, p) => a + p.pts, 0));
  return { k, total, parts, t, d, fx, logged: logged(d) };
}
export const WIN = 70, HOLD = 45;
export const tierOf = n => (n >= WIN ? 'win' : n >= HOLD ? 'hold' : 'miss');
export const TIER_L = { win: 'Win', hold: 'Hold', miss: 'Miss', freeze: 'Freeze', rest: 'Off' };

// Streak: consecutive days at or above HOLD. Today never breaks it while still in progress.
// One freeze is earned per week with 5+ wins (max 2 banked); a banked freeze covers a missed day automatically.
export function streakInfo(S, today = todayK()) {
  const start = S.profile.start || today;
  let bank = 0, cur = 0, best = 0, k = start;
  const frozen = {};
  let weekWins = 0, g = 0;
  while (k < today && g++ < 4000) {
    const sc = score(S, k).total;
    if (sc >= HOLD) { cur++; if (sc >= WIN) weekWins++; }
    else if (bank > 0 && cur > 0) { bank--; frozen[k] = true; }
    else cur = 0;
    best = Math.max(best, cur);
    if (pdk(k).getDay() === 0) { if (weekWins >= 5) bank = Math.min(2, bank + 1); weekWins = 0; }
    k = addDays(k, 1);
  }
  const ts = score(S, today).total;
  const todayCounts = ts >= HOLD;
  const shown = cur + (todayCounts ? 1 : 0);
  return { streak: shown, best: Math.max(best, shown), bank, frozen, todayCounts, atRisk: !todayCounts && cur > 0 };
}

export function weekSummary(S, ws, today = todayK()) {
  let pts = 0, W = 0, H = 0, M = 0, days = 0, perfect = 0;
  const out = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i);
    if (k > today || k < S.profile.start) { out.push(null); continue; }
    const s = score(S, k); out.push(s);
    if (k === today && s.total < HOLD) continue;
    days++; pts += s.total;
    const t = tierOf(s.total); if (t === 'win') W++; else if (t === 'hold') H++; else M++;
    if (s.total >= 95) perfect++;
  }
  return { ws, pts, W, H, M, days, perfect, out, avg: days ? Math.round(pts / days) : 0, complete: addDays(ws, 6) < today };
}

/* ---------- lifting history ---------- */
export const e1rm = (w, r) => (r > 0 ? w * (1 + Math.min(r, 12) / 30) : 0);
export function liftHistory(S) {
  const map = {}, sessions = [];
  Object.keys(S.days).sort().forEach(k => {
    const w = S.days[k].wo; if (!w || !Array.isArray(w.ex) || w.status !== 'done') return;
    const ss = { date: k, name: w.name || 'Workout', dur: w.end && w.start ? w.end - w.start : 0, sets: 0, vol: 0, prs: 0, ex: [] };
    w.ex.forEach(e => {
      const sets = (e.sets || []).filter(s => s.done && s.k !== 'W' && num(s.r) > 0).map(s => ({ w: num(s.w), r: num(s.r) }));
      if (!sets.length) return;
      const top = sets.reduce((b, s) => (e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b), sets[0]);
      const vol = Math.round(sets.reduce((a, s) => a + s.w * s.r, 0));
      const best = Math.max(...sets.map(s => e1rm(s.w, s.r)));
      const prs = (e.sets || []).filter(s => s.pr).length;
      (map[e.name] = map[e.name] || []).push({ date: k, sets, top, vol, e1: best, muscle: e.muscle });
      ss.sets += sets.length; ss.vol += vol; ss.prs += prs; ss.ex.push({ name: e.name, sets: sets.length, top, muscle: e.muscle });
    });
    if (ss.sets) sessions.push(ss);
  });
  return { map, sessions };
}
export function prCheck(hist, name, w, r, excl) {
  const h = (hist.map[name] || []).filter(x => x.date !== excl);
  if (!h.length || !(w > 0) || !(r > 0)) return '';
  const maxW = Math.max(...h.map(x => Math.max(...x.sets.map(s => s.w))));
  const maxE = Math.max(...h.map(x => x.e1));
  if (w > maxW) return 'Weight PR';
  if (e1rm(w, r) > maxE + 0.05) return 'Strength PR';
  const same = h.flatMap(x => x.sets.filter(s => s.w === w).map(s => s.r));
  if (same.length && r > Math.max(...same)) return 'Rep PR';
  return '';
}
// Progressive overload hint from the last session of this exercise.
export function overload(hist, name, repRange = '8–12', excl) {
  const h = (hist.map[name] || []).filter(x => x.date !== excl), last = h.at(-1);
  if (!last) return { line: 'First time. Pick a weight you could do for a couple more reps.', next: null, stall: '' };
  const [lo, hi] = String(repRange).split(/[–-]/).map(x => parseInt(x, 10));
  const top = last.top, step = top.w >= 40 ? 2.5 : 1;
  const hiR = hi || lo || 12;
  const next = top.r >= hiR ? { w: Math.round((top.w + step * 2) * 2) / 2, r: lo || Math.max(5, hiR - 4) } : { w: top.w, r: top.r + 1 };
  let stall = '';
  if (h.length >= 3) { const l3 = h.slice(-3); if (l3.every(x => x.top.w === l3[0].top.w && x.top.r === l3[0].top.r)) stall = 'Same top set three sessions running. Try a new rep range, or drop about 10% for a week and build back.'; }
  return { line: 'Last time ' + last.sets.map(s => s.w + '×' + s.r).join(', '), next, stall };
}

/* ---------- XP and levels ---------- */
export function xpTotal(S, today = todayK()) {
  let xp = 0; let k = S.profile.start || today, g = 0;
  while (k <= today && g++ < 4000) { xp += score(S, k).total; k = addDays(k, 1); }
  const h = liftHistory(S);
  xp += h.sessions.length * 40 + h.sessions.reduce((a, s) => a + s.prs, 0) * 25;
  return xp;
}
export const levelReq = L => 150 * L * (L + 1); // xp needed to reach level L+1 from 0
export function levelOf(xp) {
  let L = 0; while (xp >= levelReq(L + 1) && L < 200) L++;
  const lo = levelReq(L), hi = levelReq(L + 1);
  return { level: L + 1, xp, into: xp - lo, need: hi - lo, frac: (xp - lo) / (hi - lo) };
}
export const RANKS = ['Rookie', 'Regular', 'Committed', 'Dialed', 'Locked in', 'Elite', 'Legend'];
export const rankOf = level => RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 5))];

/* ---------- achievements ---------- */
export function achievements(S, today = todayK()) {
  const h = liftHistory(S), st = streakInfo(S, today);
  const ks = Object.keys(S.days).filter(k => k >= S.profile.start && k <= today).sort();
  const scores = ks.map(k => score(S, k).total);
  const maxPR = Math.max(0, ...h.sessions.map(s => s.prs));
  const proDays = ks.filter(k => totals(S.days[k]).p >= S.targets.pro).length;
  const photoMeals = ks.reduce((a, k) => a + S.days[k].meals.filter(m => m.src === 'photo').length, 0);
  const weighIns = ks.filter(k => S.days[k].weight > 0).length;
  const weeks = new Set(ks.map(wkStart));
  let perfectWeek = false; weeks.forEach(ws => { const w = weekSummary(S, ws, today); if (w.complete && w.W === 7) perfectWeek = true; });
  const L = [
    ['first', 'First log', 'Logged your first day', ks.some(k => logged(S.days[k]))],
    ['win1', 'First win', 'Scored 70 or more in a day', scores.some(s => s >= WIN)],
    ['perfect', 'Perfect day', 'Scored 95 or more', scores.some(s => s >= 95)],
    ['s3', 'Warming up', '3 day streak', st.best >= 3],
    ['s7', 'One week strong', '7 day streak', st.best >= 7],
    ['s30', 'Habit formed', '30 day streak', st.best >= 30],
    ['s100', 'Triple digits', '100 day streak', st.best >= 100],
    ['w1', 'Session one', 'Finished a workout', h.sessions.length >= 1],
    ['w10', 'Ten down', '10 workouts', h.sessions.length >= 10],
    ['w50', 'Gym regular', '50 workouts', h.sessions.length >= 50],
    ['w100', 'Centurion', '100 workouts', h.sessions.length >= 100],
    ['pr1', 'New best', 'Set a personal record', maxPR >= 1],
    ['pr3', 'Hat trick', '3 PRs in one session', maxPR >= 3],
    ['vol', 'Heavy lifting', '10,000 kg in one session', h.sessions.some(s => s.vol >= 10000)],
    ['pro7', 'Protein pro', 'Hit protein on 7 days', proDays >= 7],
    ['pro30', 'Built different', 'Hit protein on 30 days', proDays >= 30],
    ['snap', 'Snap happy', 'Logged 10 meals from photos', photoMeals >= 10],
    ['weigh', 'On the scale', '10 weigh-ins', weighIns >= 10],
    ['pweek', 'Perfect week', 'Seven wins in one week', perfectWeek],
  ];
  return L.map(([id, n, d, got]) => ({ id, n, d, got: !!got }));
}

/* ---------- body weight trend (exponential moving average) ---------- */
export function weightTrend(S, n = 90, today = todayK()) {
  const out = []; let ema = null;
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(today, -i), w = S.days[k] && S.days[k].weight;
    if (w) ema = ema == null ? w : ema + 0.15 * (w - ema);
    out.push({ k, w: w || null, t: ema });
  }
  return out;
}

/* ---------- coach: the next best move, rule based ---------- */
export function nextMoves(S, k = todayK()) {
  const s = score(S, k), T = S.targets, d = s.d, out = [];
  const gap = id => { const p = s.parts.find(x => x.id === id); return p ? p.w * (1 - p.f) : 0; };
  if (S.modules.train && s.fx !== 'rest' && !liftDone(d)) out.push({ id: 'train', gain: gap('train'), t: `Train ${routineName(S, s.fx)}`, d: 'Your planned session is the biggest chunk left today.', act: 'startPlanned' });
  if (S.modules.food) {
    const pl = T.pro - s.t.p;
    if (pl > 5) out.push({ id: 'pro', gain: gap('pro'), t: `${Math.round(pl)} g protein to go`, d: pl > 60 ? 'A proper protein meal plus a shake covers it.' : pl > 25 ? 'One shake or a chicken breast gets you there.' : 'A yogurt or a few eggs closes it out.', act: 'log' });
    if (!d.meals.length) out.push({ id: 'cal', gain: gap('cal'), t: 'Log your first meal', d: 'Snap a photo. The AI counts it for you.', act: 'snap' });
  }
  if (S.modules.cardio && cardioMin(d) < (T.cardio || 20)) out.push({ id: 'cardio', gain: gap('cardio'), t: `${(T.cardio || 20) - cardioMin(d)} min of cardio`, d: 'A brisk walk counts.', act: 'cardio' });
  if (S.modules.steps && d.steps < T.steps) out.push({ id: 'steps', gain: gap('steps'), t: `${fmt(T.steps - d.steps)} steps left`, d: 'Update from your phone’s Health app.', act: 'steps' });
  if (S.modules.water && d.water < T.water) out.push({ id: 'water', gain: gap('water'), t: `${fmt(T.water - d.water)} ml water`, d: 'Tap the water card to add a glass.', act: 'water' });
  if (S.modules.supps && S.supps.some(x => !d.supps[x.id])) out.push({ id: 'supps', gain: gap('supps'), t: 'Take ' + S.supps.filter(x => !d.supps[x.id]).map(x => x.name).join(', '), d: 'Quick tick.', act: 'supps' });
  return out.sort((a, b) => b.gain - a.gain);
}
export function routineName(S, id) { if (id === 'rest') return 'Rest'; const r = S.routines.find(x => x.id === id); return r ? r.name : 'Workout'; }

/* ---------- migration from Form v1 (form-v1) ---------- */
export function migrateV1(o, findEx) {
  const S = freshState();
  if (!o || typeof o !== 'object') return S;
  const p = o.profile || {};
  S.onboarded = false;
  S.profile.name = p.name || '';
  S.profile.goal = ['cut', 'bulk', 'maintain'].includes(p.mode) ? p.mode : 'maintain';
  S.profile.start = p.start || todayK();
  const t = o.targets || {};
  if (t.cal) S.targets.cal = +t.cal; if (t.pro) S.targets.pro = +t.pro;
  if (t.steps) S.targets.steps = +t.steps; if (t.water) S.targets.water = +t.water;
  S.supps = [{ id: 'creatine', name: 'Creatine', dose: '5 g' }];
  S.modules.supps = true;
  const toEx = x => {
    if (Array.isArray(x)) return { name: x[0], sets: +x[2] || 3, reps: x[3] || '8–12', note: x[4] || '' };
    return { name: x.name, sets: +(x.sets && x.sets.length ? x.sets.length : x.sets) || 3, reps: x.reps || x.repTarget || '8–12', note: x.note || '' };
  };
  const byName = {};
  (o.customTemplates || []).forEach(tp => { const r = { id: uid(), name: tp.name, ex: (tp.ex || []).map(toEx) }; S.routines.push(r); byName[tp.name] = r.id; });
  const V1T = { Push: [['Incline Dumbbell Press', 3, '6–10'], ['Machine Chest Press', 3, '8–12'], ['Pec Deck', 2, '12–20'], ['Cable Lateral Raise', 2, '12–20'], ['Overhead Triceps Extension', 2, '10–15'], ['Rope Pushdown', 2, '10–15']], Pull: [['Lat Pulldown', 3, '8–12'], ['Seated Row', 3, '8–12'], ['V-Grip Row', 2, '10–15'], ['Reverse Pec Deck', 2, '12–20'], ['Preacher Curl', 2, '8–12'], ['Hammer Curl', 2, '10–15']], 'Legs + Shoulders': [['Leg Press', 3, '8–12'], ['Romanian Deadlift', 3, '8–12'], ['Leg Extension', 2, '12–15'], ['Seated Leg Curl', 3, '10–15'], ['Calf Raise', 2, '10–15'], ['Shoulder Press', 3, '8–12'], ['Cable Lateral Raise', 3, '12–20']], Upper: [['Incline Dumbbell Press', 3, '8–12'], ['Chest-Supported Row', 3, '8–12'], ['Machine Chest Press', 2, '10–15'], ['Lat Pulldown', 2, '10–15'], ['Machine Shoulder Press', 2, '8–12'], ['Cable Lateral Raise', 2, '12–20'], ['Hammer Curl', 2, '10–15'], ['Rope Pushdown', 2, '10–15']], Lower: [['Leg Press', 3, '8–12'], ['Romanian Deadlift', 3, '8–12'], ['Leg Extension', 3, '12–15'], ['Seated Leg Curl', 3, '10–15'], ['Bulgarian Split Squat', 2, '8–12'], ['Calf Raise', 3, '10–15']] };
  Object.entries(o.fixtures || {}).forEach(([dow, name]) => {
    if (!name || name === 'Rest') { S.plan[dow] = 'rest'; return; }
    if (!byName[name]) { const tp = V1T[name]; const r = { id: uid(), name, ex: tp ? tp.map(([n, s, rp]) => ({ name: n, sets: s, reps: rp, note: '' })) : [] }; S.routines.push(r); byName[name] = r.id; }
    S.plan[dow] = byName[name];
  });
  const f = o.foods || {};
  S.foods.fav = (f.fav || []).slice(0, 60); S.foods.recent = (f.recent || []).slice(0, 40);
  Object.entries(o.days || {}).forEach(([k, d]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !d) return;
    const nd = blankDay();
    nd.u = d.u || 0;
    nd.meals = (d.meals || []).map(m => ({ id: m.id || uid(), name: m.name, emoji: m.emoji, type: m.type, cal: +m.cal || 0, p: +m.p || 0, c: +m.c || 0, f: +m.f || 0, t: m.t || '' }));
    nd.steps = +d.steps || 0; nd.water = +d.water || 0;
    if (d.creatine) nd.supps.creatine = true;
    nd.cardio = (d.cardio || []).map(c => ({ id: c.id || uid(), type: c.type || 'Cardio', min: +c.min || 0 }));
    nd.closed = !!d.ft;
    if (d.wo && Array.isArray(d.wo.ex)) {
      nd.wo = { id: uid(), name: d.wo.name || d.wo.type || 'Workout', status: d.wo.status === 'done' ? 'done' : 'done', start: d.wo.start || 0, end: d.wo.end || 0,
        ex: d.wo.ex.map(e => ({ id: e.id || uid(), name: e.name, muscle: (findEx && findEx(e.name) || {}).m || e.cat || 'Other', reps: e.reps || '8–12', note: e.note || '', sets: (e.sets || []).map(s => ({ w: String(s.w ?? ''), r: String(s.r ?? ''), k: s.k === 'W' ? 'W' : 'N', done: !!s.done, pr: s.pr || '' })) })) };
    }
    S.days[k] = nd;
  });
  return S;
}
