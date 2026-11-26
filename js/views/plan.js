// Meal planning: line up a day's meals ahead (usually tomorrow, the night before), then tap Eaten when you have them.
// Planned meals live in day.plan and don't count until eaten. Meal-time notifications name what's planned.
import { S, R, day, get, touch, render } from '../store.js';
import { todayK, addDays, esc, fmt, uid, MEALS, MEAL_L, totals, pdk } from '../core.js';
import { A, CH, I, $, openSheet, setSheet, closeSheet, toast, haptic } from '../ui.js';
import { addMeals } from './log.js';

const P = { k: '', type: 'breakfast', q: '', tab: 'fav' };
const dayName = k => (k === todayK() ? 'Today' : k === addDays(todayK(), 1) ? 'Tomorrow' : pdk(k).toLocaleDateString('en-CA', { weekday: 'long' }));
const plan = k => { const d = day(k); if (!Array.isArray(d.plan)) d.plan = []; return d.plan; };
const pick = m => ({ id: uid(), name: m.name, emoji: m.emoji || '', type: m.type, cal: +m.cal || 0, p: +m.p || 0, c: +m.c || 0, f: +m.f || 0 });

/* ---------- the planner ---------- */
A.planMeals = k => { P.k = /^\d{4}-\d{2}-\d{2}$/.test(k || '') ? k : addDays(todayK(), 1); openSheet('plan', 'Plan meals', plannerHTML(), { full: true }); };
function plannerHTML() {
  const k = P.k, list = (get(k).plan || []), kcal = list.reduce((a, m) => a + m.cal, 0), pro = list.reduce((a, m) => a + m.p, 0);
  const prev = addDays(k, -1), prevMeals = get(prev).meals.length ? get(prev).meals : get(prev).plan || [];
  return `<div class="seg">${[todayK(), addDays(todayK(), 1)].map(d => `<button class="${k === d ? 'on' : ''}" data-act="planDay" data-arg="${d}">${dayName(d)}</button>`).join('')}</div>
  <p class="muted small mt">${list.length ? `${fmt(kcal)} of ${fmt(S.targets.cal)} kcal · ${Math.round(pro)} of ${S.targets.pro} g protein planned` : 'Plan the meals you already know you’ll eat. At meal time you get a reminder naming them, and one tap logs each.'}</p>
  ${['breakfast', 'lunch', 'dinner', 'snack'].map(t => { const its = list.filter(m => m.type === t); return `<div class="sec"><div class="lab row between"><span>${MEAL_L[t]}</span><button class="link small" data-act="planAddFor" data-arg="${t}">+ Add</button></div>${its.length ? `<div class="card tight"><div class="list">${its.map(m => `<div class="li"><span class="ic">${esc(m.emoji || '🍽️')}</span><span><span class="t ell">${esc(m.name)}</span><span class="s">${fmt(m.cal)} kcal · ${Math.round(m.p)} g protein</span></span><button class="x" data-act="planDel" data-arg="${m.id}" aria-label="Remove">${I.x}</button></div>`).join('')}</div></div>` : ''}</div>`; }).join('')}
  ${prevMeals.length ? `<button class="btn ghost wide mt2" data-act="planCopy">${I.copy} Same as ${dayName(prev).toLowerCase()} (${prevMeals.length} item${prevMeals.length > 1 ? 's' : ''})</button>` : ''}
  <button class="btn wide mt" data-act="closeSheet">Done</button>`;
}
A.planDay = k => { P.k = k; setSheet(plannerHTML()); };
A.planDel = id => { const d = day(P.k); d.plan = (d.plan || []).filter(m => m.id !== id); touch(P.k); setSheet(plannerHTML()); render(); };
A.planCopy = () => { const prev = addDays(P.k, -1), src = get(prev).meals.length ? get(prev).meals : get(prev).plan || []; const have = new Set(plan(P.k).map(m => m.type + m.name)); src.forEach(m => { if (!have.has(m.type + m.name)) plan(P.k).push(pick(m)); }); touch(P.k); haptic(); setSheet(plannerHTML()); render(); };

/* ---------- pick a food for the plan (favourites and recents) ---------- */
A.planAddFor = t => { P.type = t; P.q = ''; P.tab = S.foods.fav.length ? 'fav' : 'recent'; setSheet(pickerHTML()); };
function pickerHTML() {
  const src = P.tab === 'fav' ? S.foods.fav : S.foods.recent, q = P.q.toLowerCase(), list = src.map((m, i) => [m, i]).filter(([m]) => !q || m.name.toLowerCase().includes(q));
  return `<button class="link small" data-act="planBack">${I.back} ${MEAL_L[P.type]} · ${dayName(P.k)}</button>
  <div class="seg mt">${[['fav', 'Favourites'], ['recent', 'Recent'], ['new', 'New']].map(([k, n]) => `<button class="${P.tab === k ? 'on' : ''}" data-act="planTab" data-arg="${k}">${n}</button>`).join('')}</div>
  ${P.tab === 'new' ? `<div class="col mt"><div class="field"><span>Name</span><input id="pnm" placeholder="Chicken rice bowl"></div><div class="g4">${[['pcal', 'kcal'], ['pp', 'Protein'], ['pc', 'Carbs'], ['pf', 'Fat']].map(([id, l]) => `<label class="field"><span>${l}</span><input id="${id}" type="number" inputmode="numeric" placeholder="0"></label>`).join('')}</div><button class="btn wide" data-act="planNew">Add to plan</button></div>`
  : `<input type="search" class="mt" placeholder="Search" value="${esc(P.q)}" data-ch="planQ" id="planq"><div class="list mt">${list.length ? list.slice(0, 40).map(([m, i]) => `<button class="li" data-act="planPickGo" data-arg="${P.tab}|${i}"><span class="ic">${esc(m.emoji || '🍽️')}</span><span><span class="t ell">${esc(m.name)}</span><span class="s">${m.p}P · ${m.c}C · ${m.f}F</span></span><span class="r"><b>${fmt(m.cal)}</b> kcal</span></button>`).join('') : `<p class="muted small">${P.tab === 'fav' ? 'No favourites yet. Star meals when you log them, or add a new one.' : 'Nothing logged yet. Add a new one.'}</p>`}</div>`}`;
}
A.planBack = () => setSheet(plannerHTML());
A.planTab = t => { P.tab = t; setSheet(pickerHTML()); };
CH.planQ = el => { P.q = el.value; const pos = el.selectionStart; setSheet(pickerHTML()); const n = $('#planq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
A.planPickGo = a => { const [tab, i] = a.split('|'), m = (tab === 'fav' ? S.foods.fav : S.foods.recent)[+i]; if (!m) return; plan(P.k).push(pick({ ...m, type: P.type })); touch(P.k); haptic(); toast(`${m.name} planned for ${MEAL_L[P.type].toLowerCase()}`); setSheet(plannerHTML()); render(); };
A.planNew = () => { const v = id => ($('#' + id) || {}).value || ''; if (!v('pnm').trim()) { toast('Add a name'); return; } plan(P.k).push(pick({ name: v('pnm').trim(), type: P.type, cal: v('pcal'), p: v('pp'), c: v('pc'), f: v('pf') })); touch(P.k); haptic(); setSheet(plannerHTML()); render(); };

/* ---------- eating what you planned ---------- */
export function planRows(k) {
  const list = get(k).plan || []; if (!list.length) return '';
  return `<div class="planned"><div class="lab faint small b">PLANNED</div>${list.map(m => `<div class="pli"><span>${esc(m.emoji || '🍽️')}</span><span class="grow ell">${esc(m.name)} <span class="faint">· ${MEAL_L[m.type]} · ${fmt(m.cal)} kcal</span></span><button class="btn xs" data-act="planEat" data-arg="${m.id}">Eaten</button></div>`).join('')}</div>`;
}
A.planEat = (id, el, ev, k = R.day) => { const d = day(k), m = (d.plan || []).find(x => x.id === id); if (!m) return; d.plan = d.plan.filter(x => x.id !== id); addMeals([{ ...m }], k); };
// From a meal-time notification: what was planned for this meal, one tap each, or log something else.
A.mealNow = t => {
  P.mt = t;
  const type = MEALS.includes(t) ? t : 'lunch', k = todayK(), its = (get(k).plan || []).filter(m => m.type === type), done = get(k).meals.filter(m => m.type === type);
  openSheet('mealnow', MEAL_L[type], `${done.length ? `<p class="muted small" style="margin-top:-6px">Already logged: ${done.map(m => esc(m.name)).join(', ')}</p>` : ''}
  ${its.length ? `<div class="card tight"><div class="list">${its.map(m => `<div class="li"><span class="ic">${esc(m.emoji || '🍽️')}</span><span><span class="t ell">${esc(m.name)}</span><span class="s">${fmt(m.cal)} kcal · planned</span></span><button class="btn xs" data-act="mealNowEat" data-arg="${m.id}">Ate it</button></div>`).join('')}</div></div>` : ''}
  <div class="g3 mt"><button class="btn ghost" data-act="snap">${I.cam} Snap</button><button class="btn ghost" data-act="describe">${I.spark} Describe</button><button class="btn ghost" data-act="foodSearch">${I.search} Foods</button></div>`);
};
A.mealNowEat = id => { A.planEat(id, null, null, todayK()); const left = (get(todayK()).plan || []).filter(m => m.type === P.mt).length; if (left) A.mealNow(P.mt); else closeSheet(); };
export { totals };
