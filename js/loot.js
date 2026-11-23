// Rewards: earned quietly for real effort (a finished Daily Drop, a week with 5+ wins), opened with one tap.
// Inside: a title for your profile, an avatar frame, or a streak freeze. Nothing to buy, nothing to grind. Pure.
import { uid, todayK, addDays, wkStart, weekSummary } from './core.js';

export const TITLES = ['Gym Regular', 'Iron Regular', 'Protein Goblin', 'Leg Day Survivor', 'Early Bird', 'Night Shift', 'Rep Machine', 'Plate Collector', 'Form Police', 'Quiet Grinder', 'The Consistent One', 'Pump Chaser', 'Chalk Hands', 'No Days Off', 'Spotter', 'Big Back Energy', 'Meal Prepper', 'Step Counter', 'Hydrated', 'Progressive Overloader'];
export const FRAMES = { aurora: ['Aurora', 'linear-gradient(135deg,#8b6cff,#22c8e6)'], ember: ['Ember', 'linear-gradient(135deg,#ff7a2f,#ff3d6e)'], gold: ['Gold', 'linear-gradient(135deg,#ffe08a,#ffb020)'], mint: ['Mint', 'linear-gradient(135deg,#6ee7c8,#0f9f78)'], ice: ['Ice', 'linear-gradient(135deg,#e0f2ff,#7cc0ff)'], rose: ['Rose', 'linear-gradient(135deg,#ff9ad0,#ff4f9a)'], neon: ['Neon', 'linear-gradient(135deg,#c6f432,#22c8e6)'], holo: ['Holo', 'conic-gradient(from 0deg,#ff4f9a,#ffc233,#2fd6a3,#22c8e6,#8b6cff,#ff4f9a)'] };
export const RARITY = { title: 'Common', freeze: 'Rare', frame: 'Rare', holo: 'Epic' };

const hash = s => [...String(s)].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7);
function roll(S, seed) {
  const owned = new Set((S.loot.items || []).map(i => i.kind + ':' + i.v)), r = hash(seed) % 100;
  const left = arr => arr.filter(v => !owned.has(v));
  if (r < 18) return { kind: 'freeze', v: 'freeze' };
  const frames = left(Object.keys(FRAMES).map(f => 'frame:' + f)).map(x => x.split(':')[1]);
  if (r < 45 && frames.length) { const pick = frames.filter(f => f !== 'holo' || r < 25); const f = (pick.length ? pick : frames)[hash(seed + 'f') % (pick.length || frames.length)]; return { kind: 'frame', v: f }; }
  const titles = left(TITLES.map(t => 'title:' + t)).map(x => x.slice(6));
  if (titles.length) return { kind: 'title', v: titles[hash(seed + 't') % titles.length] };
  return { kind: 'freeze', v: 'freeze' };
}

// Grants any rewards earned up to today. Returns the new crates (unopened).
export function grant(S, today = todayK()) {
  const L = S.loot, have = new Set(L.crates.map(c => c.src)), out = [];
  if (!L.since) L.since = addDays(today, -7); // rewards start from about when you turned them on, not your whole history
  const add = (src, at, why) => { if (have.has(src) || at < L.since) return; const c = { id: uid(), src, at, why, open: false, item: null }; L.crates.push(c); have.add(src); out.push(c); };
  Object.entries(S.drops || {}).forEach(([k, r]) => { if (r.done) add('drop:' + k, k, 'Daily Drop done'); });
  const ws = wkStart(today);
  for (let w = wkStart([S.profile.start || today, L.since].sort()[1]), g = 0; w < ws && g < 200; w = addDays(w, 7), g++) { const s = weekSummary(S, w, today); if (s.W >= 5) add('week:' + w, addDays(w, 6), `${s.W} wins in a week`); }
  return out;
}
export function openCrate(S, id) {
  const c = S.loot.crates.find(x => x.id === id); if (!c || c.open) return c;
  c.item = roll(S, c.src + (S.profile.start || ''));
  c.open = true;
  S.loot.items.push({ kind: c.item.kind, v: c.item.v, at: todayK(), src: c.src });
  return c;
}
export const unopened = S => (S.loot.crates || []).filter(c => !c.open);
export const owned = (S, kind) => (S.loot.items || []).filter(i => i.kind === kind).map(i => i.v);
export const rarityOf = it => (it.kind === 'frame' && it.v === 'holo' ? 'Epic' : RARITY[it.kind] || 'Common');
export const itemName = it => (it.kind === 'frame' ? (FRAMES[it.v] || [it.v])[0] + ' frame' : it.kind === 'freeze' ? 'Streak freeze' : '“' + it.v + '”');
// Freezes earned from rewards, keyed by the day they were earned (used by the streak count).
export const freezeDays = S => (S.loot && S.loot.items || []).filter(i => i.kind === 'freeze').reduce((m, i) => { m[i.at] = (m[i.at] || 0) + 1; return m; }, {});
