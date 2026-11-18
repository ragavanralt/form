// Logging: the + sheet, AI photo and text food estimates with a "what the AI sees" review, food search, and quick logs.
import { S, R, day, get, touch, render } from '../store.js';
import { todayK, esc, fmt, nint, num, uid, clamp, MEALS, MEAL_L, totals } from '../core.js';
import { A, CH, I, $, openSheet, setSheet, closeSheet, toast, haptic, pickFiles, Sheet } from '../ui.js';
import { aiOn, foodPhoto, foodText, foodRefine, errMsg } from '../ai.js';
import { CARDIO, CARDIO_MET } from '../exercises.js';

const COLS = ['food', 'train', 'move', 'water', 'habit', 'pro', 'carb', 'fat'];
const L = { files: [], img: null, ar: 1, res: null, items: [], type: '', ctl: null, sel: -1, src: 'ai', thumb: '' };
const defType = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 22 ? 'dinner' : 'snack'; };
const emo = n => { const s = String(n).toLowerCase(); const t = [[/coffee|latte|espresso|tea|matcha/, '☕'], [/shake|whey|protein|milk|yogurt|skyr/, '🥛'], [/egg|omelet/, '🍳'], [/chicken|wings|tender/, '🍗'], [/beef|steak/, '🥩'], [/burger/, '🍔'], [/pizza/, '🍕'], [/wrap|burrito|taco/, '🌯'], [/rice|bowl/, '🍚'], [/pasta|spaghetti/, '🍝'], [/salad/, '🥗'], [/sushi|poke/, '🍣'], [/noodle|ramen|pho/, '🍜'], [/soup|curry|stew/, '🍲'], [/sandwich|sub/, '🥪'], [/banana/, '🍌'], [/berry|strawberr/, '🍓'], [/toast|bread|bagel/, '🍞'], [/pancake|waffle/, '🥞'], [/fries/, '🍟'], [/chocolate|bar/, '🍫'], [/cookie/, '🍪'], [/soda|juice|coke/, '🥤'], [/oil|butter/, '🧈'], [/apple/, '🍎'], [/oat/, '🥣'], [/fish|salmon|tuna/, '🐟'], [/potato/, '🥔']]; for (const [r, e] of t) if (r.test(s)) return e; return '🍽️'; };
const clean = m => ({ name: String(m.name || 'Food').slice(0, 80), emoji: m.emoji && m.emoji.length <= 8 ? m.emoji : emo(m.name), type: MEALS.includes(m.type) ? m.type : defType(), cal: nint(m.cal), p: nint(m.p), c: nint(m.c), f: nint(m.f) });
const fkey = m => (m.name || '').toLowerCase().trim() + '|' + (+m.cal || 0);

export function addMeals(items, k = R.day, src) {
  const d = day(k); const added = items.map(m => Object.assign(clean(m), { id: uid(), t: k === todayK() ? new Date().toTimeString().slice(0, 5) : '', src: src || m.src || '', img: m.img || '' }));
  d.meals.push(...added);
  added.forEach(m => { const f = clean(m), key = fkey(f); S.foods.recent = [f, ...S.foods.recent.filter(x => fkey(x) !== key)].slice(0, 40); });
  touch(k); haptic(15);
  const ids = added.map(a => a.id);
  toast(added.length === 1 ? added[0].name + ' added' : added.length + ' foods added', () => { const dd = day(k); dd.meals = dd.meals.filter(x => !ids.includes(x.id)); touch(k); render(); });
  render();
}

/* ---------- the + sheet ---------- */
A.log = () => {
  const m = S.modules, o = [];
  if (m.food) o.push(`<button class="lgo hero2" data-act="snap"><span class="i">${I.cam}</span><span><b>Snap a meal</b><small>${aiOn() ? 'AI finds every food, sizes the portions and shows its work' : 'Attach a photo and log it'}</small></span></button>`,
    `<button class="lgo c-food" data-act="describe"><span class="i">${I.spark}</span><b>Describe it</b><small>“2 eggs, toast, latte”</small></button>`,
    `<button class="lgo c-food" data-act="foodSearch"><span class="i">${I.search}</span><b>Foods</b><small>Recent, favourites, manual</small></button>`);
  if (m.train) o.push(`<button class="lgo c-train" data-act="pickWorkout"><span class="i">${I.dumb}</span><b>Workout</b><small>Start or pick a routine</small></button>`);
  if (m.cardio) o.push(`<button class="lgo c-move" data-act="cardio"><span class="i">${I.run}</span><b>Cardio</b><small>Minutes and type</small></button>`);
  if (m.steps) o.push(`<button class="lgo c-move" data-act="steps"><span class="i">${I.shoe}</span><b>Steps</b><small>From your phone</small></button>`);
  if (m.water) o.push(`<button class="lgo c-water" data-act="waterSheet"><span class="i">${I.drop}</span><b>Water</b><small>Glasses or ml</small></button>`);
  if (m.weight) o.push(`<button class="lgo c-body" data-act="weight"><span class="i">${I.scale}</span><b>Weigh in</b><small>Trend smooths daily noise</small></button>`);
  if (m.supps) o.push(`<button class="lgo c-habit" data-act="suppEdit"><span class="i">${I.pill}</span><b>Supplements</b><small>Tick or edit your stack</small></button>`);
  openSheet('log', 'Log', `<div class="logs">${o.join('')}</div>`);
};

/* ---------- snap ---------- */
async function loadImg(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const s = Math.min(1, 1100 / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  const big = cv.toDataURL('image/jpeg', 0.82);
  const t = document.createElement('canvas'), ts = 112 / Math.min(cv.width, cv.height); t.width = Math.round(cv.width * ts); t.height = Math.round(cv.height * ts);
  t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height); URL.revokeObjectURL(url);
  return { big, thumb: t.toDataURL('image/jpeg', 0.7), ar: cv.width / cv.height };
}
A.snap = async () => {
  const files = await pickFiles('image/*', false, true); if (!files.length) return;
  L.files = files; L.res = null; L.items = []; L.sel = -1; L.type = defType(); L.src = 'photo'; L.note = '';
  try { const r = await loadImg(files[0]); L.img = r.big; L.thumb = r.thumb; L.ar = r.ar; } catch (e) { toast('Couldn’t open that photo'); return; }
  if (!aiOn()) { L.items = [{ name: '', cal: 0, p: 0, c: 0, f: 0, base: null, conf: null, box: [] }]; openSheet('food', 'Log this meal', reviewHTML(), { full: true }); return; }
  openSheet('food', 'Analyzing', shotHTML(true) + `<div class="thinking"><span class="spin"></span>Finding each food and sizing the portions…</div><div class="field mt"><span>Add a detail while it works (optional)</span><input id="fnote" placeholder="e.g. cooked in olive oil, large size"></div><button class="btn ghost wide mt" data-act="foodCancel">Cancel</button>`, { full: true, onClose: () => L.ctl && L.ctl.abort() });
  runAI(() => foodPhoto(L.files, '', L.ctl.signal));
};
A.describe = () => {
  L.files = []; L.img = null; L.thumb = ''; L.res = null; L.items = []; L.type = defType(); L.src = 'ai';
  if (!aiOn()) { A.foodSearch('manual'); return; }
  openSheet('food', 'Describe your meal', `<div class="field"><textarea id="ftext" placeholder="Chipotle chicken bowl with white rice, black beans, cheese, guac" autofocus></textarea></div><p class="faint small">Amounts help: “200 g”, “a large”, “2 cups”. Brands and restaurants work too.</p><button class="btn wide mt" data-act="describeGo">${I.spark} Estimate</button>`, { full: false });
  setTimeout(() => { const t = $('#ftext'); if (t) t.focus(); }, 250);
};
A.describeGo = () => {
  const t = ($('#ftext') || {}).value || ''; if (!t.trim()) { toast('Type what you ate first'); return; }
  L.text = t.trim();
  setSheet(`<div class="thinking"><span class="spin"></span>Estimating “${esc(L.text.slice(0, 60))}”…</div><button class="btn ghost wide" data-act="foodCancel">Cancel</button>`);
  runAI(() => foodText(L.text, L.ctl.signal));
};
A.foodCancel = () => { if (L.ctl) L.ctl.abort(); closeSheet(); };
async function runAI(fn) {
  L.ctl = new AbortController();
  try {
    const res = await fn(); if (Sheet.kind !== 'food') return;
    take(res);
    const note = ($('#fnote') || {}).value; if (note && note.trim() && L.files.length) { L.note = note.trim(); setSheet(`<div class="thinking"><span class="spin"></span>Applying your note…</div>`); take(await foodRefine(L.res, note, L.files, L.ctl.signal)); }
    const sh = $('#sheet .shead h3'); if (sh) sh.textContent = 'Here’s what I see';
    setSheet(reviewHTML());
  } catch (e) {
    if (Sheet.kind !== 'food' || (e && e.code === 'cancelled')) return;
    L.items = L.items.length ? L.items : [{ name: L.text || '', cal: 0, p: 0, c: 0, f: 0, base: null, box: [] }];
    setSheet(`<div class="err">${esc(errMsg(e))}</div>` + reviewHTML());
  }
}
function take(res) {
  L.res = res || {}; const items = Array.isArray(res) ? res : res.items || [];
  if (res && MEALS.includes(res.meal_type)) L.type = res.meal_type;
  L.items = items.map(m => { const x = { name: String(m.name || 'Food'), emoji: m.emoji, grams: nint(m.grams), cal: nint(m.cal ?? m.calories), p: nint(m.p ?? m.protein), c: nint(m.c ?? m.carbs), f: nint(m.f ?? m.fat), conf: m.confidence != null ? clamp(+m.confidence, 0, 1) : null, why: m.why || m.note || '', box: Array.isArray(m.box) && m.box.length === 4 ? m.box.map(Number) : [] }; x.base = { cal: x.cal, p: x.p, c: x.c, f: x.f, g: x.grams }; x.mult = 1; return x; });
  if (!L.items.length) L.items = [{ name: '', cal: 0, p: 0, c: 0, f: 0, base: null, box: [] }];
}
function shotHTML(scan) {
  if (!L.img) return '';
  const boxes = scan ? '<div class="scan"></div>' : L.items.map((m, i) => m.box && m.box.length === 4 ? (() => { const [y0, x0, y1, x1] = m.box; return `<div class="bx c-${COLS[i % COLS.length]} ${L.sel >= 0 && L.sel !== i ? 'dim' : ''}" style="top:${y0 / 10}%;left:${x0 / 10}%;width:${(x1 - x0) / 10}%;height:${(y1 - y0) / 10}%"><span>${esc(m.name)}${m.grams ? ' · ' + m.grams + ' g' : ''}</span></div>`; })() : '').join('');
  return `<div class="shot" style="aspect-ratio:${L.ar};width:min(100%,calc(50vh * ${L.ar}));margin:0 auto"><img src="${L.img}" alt="Your meal" style="width:100%;height:100%;max-height:none">${boxes}</div>`;
}
const confCls = c => (c == null ? '' : c >= 0.75 ? 'hi' : c >= 0.5 ? 'md' : 'lo');
const confTxt = c => (c == null ? '' : c >= 0.75 ? 'Confident' : c >= 0.5 ? 'Fair guess' : 'Rough guess');
function reviewHTML() {
  const r = L.res || {}, t = L.items.reduce((a, m) => ({ cal: a.cal + (+m.cal || 0), p: a.p + (+m.p || 0), c: a.c + (+m.c || 0), f: a.f + (+m.f || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
  const avgConf = L.items.filter(m => m.conf != null); const ac = avgConf.length ? avgConf.reduce((a, m) => a + m.conf, 0) / avgConf.length : null;
  const q = r.question && r.question.q ? r.question : null;
  return `${shotHTML(false)}
  ${r.seen ? `<div class="seen"><span class="av2">${I.spark}</span><span>${esc(r.seen)}${ac != null ? ` <span class="conf ${confCls(ac)}" style="font-size:11.5px;font-weight:600;border-radius:99px;padding:2px 8px">${Math.round(ac * 100)}% confidence</span>` : ''}</span></div>` : ''}
  <div class="sumrow mt"><div><b class="n" id="tcal">${fmt(t.cal)}</b><small>KCAL</small></div><div><b class="n tc c-pro" id="tp">${t.p}</b><small>PROTEIN</small></div><div><b class="n tc c-carb" id="tc">${t.c}</b><small>CARBS</small></div><div><b class="n tc c-fat" id="tf">${t.f}</b><small>FAT</small></div></div>
  ${q ? `<div class="qbox mt"><b>${esc(q.q)}</b><div class="row wrap" style="gap:6px">${(q.options || []).slice(0, 4).map(o => `<button class="chip" data-act="foodAnswer" data-arg="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="row"><input id="fans" placeholder="Or type an answer"><button class="btn sm" data-act="foodAnswer">Update</button></div></div>` : ''}
  <div class="sec"><div class="lab">Items · tap to highlight</div>
  ${L.items.map((m, i) => `<div class="item c-${COLS[i % COLS.length]}" data-act="foodSel" data-arg="${i}">
    <div class="r1"><span class="sw"></span><input class="nmi" value="${esc(m.name)}" placeholder="Food name" data-ch="fItem" data-i="${i}" data-k="name">${m.conf != null ? `<span class="conf ${confCls(m.conf)}">${confTxt(m.conf)}</span>` : `<button class="x" data-act="fDel" data-arg="${i}" aria-label="Remove">${I.x}</button>`}</div>
    ${m.why ? `<div class="why">${esc(m.why)}</div>` : ''}
    ${m.base && m.base.cal ? `<div class="portion"><span>Portion</span><input type="range" min="25" max="250" step="5" value="${Math.round((m.mult || 1) * 100)}" data-ch="fMult" data-i="${i}"><b class="n" id="pm${i}">${m.grams ? Math.round(m.base.g * (m.mult || 1)) + ' g' : Math.round((m.mult || 1) * 100) + '%'}</b></div>` : ''}
    <div class="r2">${[['cal', 'kcal'], ['p', 'P'], ['c', 'C'], ['f', 'F']].map(([k2, l]) => `<label>${l}<input type="number" inputmode="numeric" value="${m[k2] || ''}" placeholder="0" data-ch="fItem" data-i="${i}" data-k="${k2}" id="fi${i}${k2}"></label>`).join('')}</div>
    ${m.conf != null ? `<div class="row between"><span></span><button class="link small" data-act="fDel" data-arg="${i}">Remove</button></div>` : ''}
  </div>`).join('')}
  <button class="btn ghost wide mt" data-act="fAdd">+ Add an item</button></div>
  ${(r.tips || []).length ? `<div class="sec"><div class="lab">Make it more accurate</div><div class="tips">${r.tips.slice(0, 4).map(t2 => `<div class="tip">${I.bulb}<span>${esc(t2)}</span></div>`).join('')}</div></div>` : ''}
  <div class="sec"><div class="lab">Meal</div><div class="seg">${MEALS.map(mt => `<button class="${L.type === mt ? 'on' : ''}" data-act="fType" data-arg="${mt}">${MEAL_L[mt]}</button>`).join('')}</div></div>
  <div class="row mt2"><button class="btn ghost" data-act="fFav" aria-label="Save as favourite">${I.star}</button><button class="btn grow" data-act="fSave">Add ${L.items.length > 1 ? L.items.length + ' items' : 'to ' + MEAL_L[L.type].toLowerCase()}</button></div>`;
}
function retotal() {
  const t = L.items.reduce((a, m) => ({ cal: a.cal + (+m.cal || 0), p: a.p + (+m.p || 0), c: a.c + (+m.c || 0), f: a.f + (+m.f || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
  const set = (id, v) => { const e = $('#' + id); if (e) e.textContent = id === 'tcal' ? fmt(v) : v; };
  set('tcal', t.cal); set('tp', t.p); set('tc', t.c); set('tf', t.f);
}
CH.fItem = el => { const i = +el.dataset.i, k = el.dataset.k, m = L.items[i]; if (!m) return; m[k] = k === 'name' ? el.value : nint(el.value); if (k !== 'name') m.base = null; retotal(); };
CH.fMult = el => {
  const i = +el.dataset.i, m = L.items[i]; if (!m || !m.base) return; m.mult = +el.value / 100;
  ['cal', 'p', 'c', 'f'].forEach(k => { m[k] = Math.round(m.base[k] * m.mult); const e = $('#fi' + i + k); if (e) e.value = m[k]; });
  const pm = $('#pm' + i); if (pm) pm.textContent = m.grams ? Math.round(m.base.g * m.mult) + ' g' : Math.round(m.mult * 100) + '%';
  retotal();
};
A.foodSel = (i, el, ev) => { if (ev && ev.target.closest('input,button')) return; L.sel = L.sel === +i ? -1 : +i; const s = $('#sbody .shot'); if (s) s.outerHTML = shotHTML(false); };
A.fDel = i => { L.items.splice(+i, 1); if (!L.items.length) L.items.push({ name: '', cal: 0, p: 0, c: 0, f: 0, base: null, box: [] }); setSheet(reviewHTML()); };
A.fAdd = () => { L.items.push({ name: '', cal: 0, p: 0, c: 0, f: 0, base: null, box: [] }); setSheet(reviewHTML()); };
A.fType = t => { L.type = t; setSheet(reviewHTML()); };
A.foodAnswer = async a => {
  const ans = a || (($('#fans') || {}).value || '').trim(); if (!ans) return;
  setSheet(shotHTML(true) + `<div class="thinking"><span class="spin"></span>Updating with “${esc(ans)}”…</div>`);
  L.ctl = new AbortController();
  try { take(await foodRefine(L.res, ans, L.files, L.ctl.signal)); } catch (e) { if (e.code === 'cancelled') return; toast(errMsg(e)); }
  setSheet(reviewHTML());
};
A.fSave = () => {
  const items = L.items.filter(m => (m.name || '').trim() || m.cal);
  if (!items.length) { toast('Add a food first'); return; }
  const thumb = L.thumb;
  addMeals(items.map((m, i) => Object.assign({}, m, { name: m.name || 'Food', type: L.type, img: i === 0 && thumb ? thumb : '', src: L.src === 'photo' ? 'photo' : L.res ? 'ai' : '' })), R.day);
  closeSheet();
};
A.fFav = () => { const items = L.items.filter(m => m.name); if (!items.length) return; const combo = items.length > 1; const f = combo ? { name: items.map(m => m.name).join(', ').slice(0, 60), emoji: '🍱', cal: items.reduce((a, m) => a + m.cal, 0), p: items.reduce((a, m) => a + m.p, 0), c: items.reduce((a, m) => a + m.c, 0), f: items.reduce((a, m) => a + m.f, 0) } : clean(items[0]); S.foods.fav = [clean(f), ...S.foods.fav.filter(x => fkey(x) !== fkey(f))]; touch(); toast('Saved to favourites'); };

/* ---------- search / manual ---------- */
A.foodSearch = tab => {
  L.q = ''; L.tab = tab || (S.foods.fav.length ? 'fav' : 'recent');
  openSheet('foods', 'Foods', foodsHTML(), { full: true });
};
function foodsHTML() {
  const q = (L.q || '').toLowerCase();
  const list = (L.tab === 'fav' ? S.foods.fav : S.foods.recent).filter(m => !q || m.name.toLowerCase().includes(q));
  const T = S.targets, t = totals(get(R.day));
  return `<div class="seg">${[['fav', 'Favourites'], ['recent', 'Recent'], ['manual', 'Manual']].map(([k, n]) => `<button class="${L.tab === k ? 'on' : ''}" data-act="fTab" data-arg="${k}">${n}</button>`).join('')}</div>
  ${L.tab === 'manual' ? manualHTML() : `<input type="search" class="mt" placeholder="Search" value="${esc(L.q || '')}" data-ch="fq" id="fqin">
  <p class="faint small mt">${Math.max(0, T.pro - t.p)} g protein and ${fmt(Math.max(0, T.cal - t.cal))} kcal left today</p>
  <div class="list">${list.length ? list.slice(0, 40).map((m, i) => `<button class="li" data-act="fQuick" data-arg="${L.tab}|${(L.tab === 'fav' ? S.foods.fav : S.foods.recent).indexOf(m)}"><span class="ic">${esc(m.emoji || '🍽️')}</span><span><span class="t ell">${esc(m.name)}</span><span class="s">${m.p}P · ${m.c}C · ${m.f}F</span></span><span class="r"><b>${fmt(m.cal)}</b> kcal</span></button>`).join('') : `<div class="empty">${I.search}<span>${L.tab === 'fav' ? 'Star a meal when you log it and it lands here.' : 'Foods you log show up here.'}</span></div>`}</div>`}`;
}
function manualHTML() {
  return `<div class="col mt"><div class="field"><span>Name</span><input id="mname" placeholder="Greek yogurt"></div>
  <div class="g4">${[['mcal', 'kcal'], ['mp', 'Protein'], ['mc', 'Carbs'], ['mf', 'Fat']].map(([id, l]) => `<label class="field"><span>${l}</span><input id="${id}" type="number" inputmode="numeric" placeholder="0"></label>`).join('')}</div>
  <div class="seg">${MEALS.map(mt => `<button class="${(L.type || defType()) === mt ? 'on' : ''}" data-act="mType" data-arg="${mt}">${MEAL_L[mt]}</button>`).join('')}</div>
  <button class="btn wide" data-act="mSave">Add food</button></div>`;
}
A.fTab = t => { L.tab = t; setSheet(foodsHTML()); };
A.mType = t => { L.type = t; const v = ['mname', 'mcal', 'mp', 'mc', 'mf'].map(id => ($('#' + id) || {}).value); setSheet(foodsHTML()); ['mname', 'mcal', 'mp', 'mc', 'mf'].forEach((id, i) => { const e = $('#' + id); if (e) e.value = v[i] || ''; }); };
CH.fq = el => { L.q = el.value; const pos = el.selectionStart; setSheet(foodsHTML()); const n = $('#fqin'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
A.fQuick = arg => { const [tab, i] = arg.split('|'); const m = (tab === 'fav' ? S.foods.fav : S.foods.recent)[+i]; if (!m) return; addMeals([Object.assign({}, m, { type: defType() })]); };
A.mSave = () => { const v = id => ($('#' + id) || {}).value || ''; if (!v('mname').trim() && !num(v('mcal'))) { toast('Add a name or calories'); return; } addMeals([{ name: v('mname').trim() || 'Food', cal: v('mcal'), p: v('mp'), c: v('mc'), f: v('mf'), type: L.type || defType() }]); closeSheet(); };

/* ---------- edit a logged meal ---------- */
A.mealEdit = id => {
  const d = day(R.day), m = d.meals.find(x => x.id === id); if (!m) return;
  openSheet('meal', esc(m.name), `${m.img ? `<img src="${m.img}" alt="" style="width:100%;max-height:200px;object-fit:cover;border-radius:16px;margin-bottom:12px">` : ''}
  <div class="col"><div class="field"><span>Name</span><input id="ename" value="${esc(m.name)}"></div>
  <div class="g4">${[['ecal', 'kcal', m.cal], ['ep', 'Protein', m.p], ['ec', 'Carbs', m.c], ['ef', 'Fat', m.f]].map(([i, l, v]) => `<label class="field"><span>${l}</span><input id="${i}" type="number" inputmode="numeric" value="${v}"></label>`).join('')}</div>
  <div class="seg">${MEALS.map(mt => `<button class="${m.type === mt ? 'on' : ''}" data-act="eType" data-arg="${id}|${mt}">${MEAL_L[mt]}</button>`).join('')}</div>
  <button class="btn wide" data-act="eSave" data-arg="${id}">Save</button>
  <div class="row"><button class="btn ghost grow" data-act="eDup" data-arg="${id}">Log again</button><button class="btn ghost grow" data-act="eFav" data-arg="${id}">${I.star} Favourite</button><button class="btn danger" data-act="eDel" data-arg="${id}" aria-label="Delete">${I.trash}</button></div></div>`);
};
const findMeal = id => day(R.day).meals.find(x => x.id === id);
A.eType = a => { const [id, t] = a.split('|'); const m = findMeal(id); if (m) { m.type = t; touch(R.day); A.mealEdit(id); render(); } };
A.eSave = id => { const m = findMeal(id); if (!m) return; const v = i => ($('#' + i) || {}).value; m.name = v('ename') || m.name; m.cal = nint(v('ecal')); m.p = nint(v('ep')); m.c = nint(v('ec')); m.f = nint(v('ef')); touch(R.day); closeSheet(); render(); };
A.eDel = id => { const d = day(R.day); const i = d.meals.findIndex(x => x.id === id); if (i < 0) return; const [m] = d.meals.splice(i, 1); touch(R.day); closeSheet(); render(); toast(m.name + ' removed', () => { day(R.day).meals.splice(i, 0, m); touch(R.day); render(); }); };
A.eDup = id => { const m = findMeal(id); if (m) { closeSheet(); addMeals([Object.assign({}, m, { img: m.img })], todayK()); } };
A.eFav = id => { const m = findMeal(id); if (!m) return; const f = clean(m); S.foods.fav = [f, ...S.foods.fav.filter(x => fkey(x) !== fkey(f))]; touch(); toast('Saved to favourites'); };

/* ---------- quick logs ---------- */
A.steps = () => { const d = get(R.day); openSheet('steps', 'Steps', `<p class="muted small" style="margin-top:-6px">Open Health or your watch app and type today’s total.</p><div class="field mt"><input id="stin" type="number" inputmode="numeric" value="${d.steps || ''}" placeholder="0" style="font-size:30px;font-weight:700;text-align:center"></div><div class="row wrap mt">${[2000, 5000, 8000, 10000, 12000].map(n => `<button class="chip" data-act="stSet" data-arg="${n}">${fmt(n)}</button>`).join('')}</div><button class="btn wide mt2" data-act="stSave">Save</button>`); setTimeout(() => { const e = $('#stin'); e && e.focus(); }, 250); };
A.stSet = n => { $('#stin').value = n; };
A.stSave = () => { day(R.day).steps = nint($('#stin').value); touch(R.day); closeSheet(); haptic(); render(); };
A.cardio = () => { L.ct = L.ct || 'Incline walk'; const d = get(R.day); openSheet('cardio', 'Cardio', `${d.cardio.length ? `<div class="list mb">${d.cardio.map(c => `<div class="li"><span class="ic c-move">${I.run}</span><span><span class="t">${esc(c.type)}</span><span class="s">${c.min} min${c.kcal ? ' · ~' + c.kcal + ' kcal' : ''}</span></span><button class="x" data-act="cDel" data-arg="${c.id}" aria-label="Remove">${I.x}</button></div>`).join('')}</div>` : ''}
  <div class="row wrap" style="gap:6px">${CARDIO.map(t => `<button class="chip ${L.ct === t ? 'on' : ''}" data-act="cType" data-arg="${t}">${t}</button>`).join('')}</div>
  <div class="field mt"><span>Minutes</span><input id="cmin" type="number" inputmode="numeric" placeholder="30" style="font-size:24px;font-weight:700"></div>
  <div class="row wrap mt">${[10, 20, 30, 45, 60].map(n => `<button class="chip" data-act="cSet" data-arg="${n}">${n} min</button>`).join('')}</div>
  <button class="btn wide mt2" data-act="cSave">Add cardio</button>`); };
A.cType = t => { L.ct = t; const v = ($('#cmin') || {}).value; A.cardio(); $('#cmin').value = v || ''; };
A.cSet = n => { $('#cmin').value = n; };
A.cSave = () => { const min = nint($('#cmin').value); if (!min) { toast('Add the minutes'); return; } const kg = +S.profile.weightKg || 75; day(R.day).cardio.push({ id: uid(), type: L.ct, min, kcal: Math.round(((CARDIO_MET[L.ct] || 5) * 3.5 * kg) / 200 * min) }); touch(R.day); closeSheet(); haptic(15); toast(min + ' min ' + L.ct.toLowerCase() + ' added'); render(); };
A.cDel = id => { const d = day(R.day); d.cardio = d.cardio.filter(c => c.id !== id); touch(R.day); A.cardio(); render(); };
A.waterSheet = () => { const d = get(R.day); openSheet('water', 'Water', `<div class="center"><div style="font-size:48px;font-weight:800" class="n">${fmt(d.water)}<span class="faint" style="font-size:18px"> ml</span></div><div class="muted small">Goal ${fmt(S.targets.water)} ml</div></div><div class="g3 mt2">${[250, 500, 750].map(n => `<button class="btn ghost" data-act="wAdd" data-arg="${n}">+${n}</button>`).join('')}</div><button class="btn line wide mt" data-act="wAdd" data-arg="-250">Remove 250 ml</button>`); };
A.wAdd = n => { const d = day(R.day); d.water = Math.max(0, d.water + +n); touch(R.day); haptic(); A.waterSheet(); render(); };
A.weight = () => { const d = get(R.day); openSheet('weight', 'Weigh in', `<p class="muted small" style="margin-top:-6px">Same time each morning works best. The trend line smooths out water and food swings.</p><div class="unit mt"><input id="wtin" type="number" inputmode="decimal" step="0.1" value="${d.weight || ''}" placeholder="${S.profile.weightKg || 75}" style="font-size:30px;font-weight:700;text-align:center"><i>${S.profile.units}</i></div><button class="btn wide mt2" data-act="wtSave">Save</button>${d.weight ? '<button class="btn ghost wide mt" data-act="wtClear">Clear today</button>' : ''}`); setTimeout(() => { const e = $('#wtin'); e && e.focus(); }, 250); };
A.wtSave = () => { const v = num($('#wtin').value); if (!v) return; day(R.day).weight = v; if (R.day === todayK()) S.profile.weightKg = S.profile.units === 'lb' ? Math.round(v / 2.2046 * 10) / 10 : v; touch(R.day); closeSheet(); haptic(15); render(); };
A.wtClear = () => { day(R.day).weight = 0; touch(R.day); closeSheet(); render(); };
A.suppEdit = () => { const d = get(R.day); openSheet('supps', 'Supplements', `<div class="list">${S.supps.map(x => `<div class="li"><button class="ic c-habit" data-act="supp" data-arg="${x.id}" style="${d.supps[x.id] ? 'background:var(--habit);color:#fff' : ''}">${d.supps[x.id] ? I.check : I.pill}</button><span><span class="t">${esc(x.name)}</span><span class="s">${esc(x.dose || '')}</span></span><button class="x" data-act="suppDel" data-arg="${x.id}" aria-label="Remove">${I.trash}</button></div>`).join('') || '<p class="muted small">Nothing in your stack yet.</p>'}</div>
  <div class="row mt"><input id="snm" placeholder="Creatine, vitamin D, fish oil"><input id="sds" placeholder="5 g" style="max-width:96px"></div><div class="row wrap mt" style="gap:6px">${['Creatine', 'Multivitamin', 'Vitamin D', 'Fish oil', 'Magnesium', 'Protein powder'].filter(n => !S.supps.some(x => x.name === n)).map(n => `<button class="chip" data-act="suppQuick" data-arg="${n}">+ ${n}</button>`).join('')}</div><button class="btn wide mt2" data-act="suppAdd">Add to stack</button>`); };
A.suppQuick = n => { $('#snm').value = n; $('#sds').value = { Creatine: '5 g', 'Vitamin D': '1000 IU', Magnesium: '200 mg' }[n] || ''; };
A.suppAdd = () => { const n = ($('#snm').value || '').trim(); if (!n) return; S.supps.push({ id: uid(), name: n, dose: ($('#sds').value || '').trim() }); S.modules.supps = true; touch(); A.suppEdit(); render(); };
A.suppDel = id => { S.supps = S.supps.filter(x => x.id !== id); touch(); A.suppEdit(); render(); };
const _supp = A.supp; A.supp = id => { if (_supp) _supp(id); else { const d = day(R.day); d.supps[id] = !d.supps[id]; touch(R.day); } if (Sheet.kind === 'supps') A.suppEdit(); };
