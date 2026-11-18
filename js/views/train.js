// Train: weekly plan, routines, exercise library with muscle diagrams, live workout sessions, AI import.
import { S, R, day, get, touch, render, hist, scoreOf } from '../store.js';
import { todayK, addDays, wkStart, pdk, esc, fmt, uid, num, nint, DOW, DOWL, planned, routineName, liftDone, prCheck, overload, e1rm, tierOf } from '../core.js';
import { A, CH, I, $, openSheet, setSheet, closeSheet, toast, haptic, beep, confetti, pickFiles, Sheet } from '../ui.js';
import { EXERCISES, MUSCLES, GROUPS, EQUIP, PROGRAMS, findEx, allEx, groupOf } from '../exercises.js';
import { bodyMap, heatMap } from '../body.js';
import { line } from '../charts.js';
import { aiOn, importWorkouts, errMsg } from '../ai.js';
import { postWorkout } from './friends.js';

const exInfo = n => findEx(n, S.customEx) || { n, p: ['other'], s: [], e: '', c: '' };
const thumb = n => { const x = exInfo(n); return bodyMap(x.p, x.s, { only: ['lats', 'upper', 'lower', 'traps', 'rdelt', 'triceps', 'glutes', 'hams'].includes(x.p[0]) ? 'back' : 'front', crop: true }); };
const unit = () => S.profile.units || 'kg';

export function vTrain() {
  const t = todayK(), ws = wkStart(t), h = hist();
  const wkDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  let x = `<div class="top"><div><div class="sub">${h.sessions.length} workouts logged</div><h1>Train</h1></div><div class="row"><button class="iconbtn" data-act="library" aria-label="Exercise library">${I.book}</button><button class="iconbtn" data-act="importSheet" aria-label="Import">${I.upload}</button></div></div>`;
  x += `<div class="week">${wkDays.map(k => { const fx = planned(S, k), d = get(k), done = liftDone(d); return `<button class="wd ${k === t ? 'today' : ''}" data-act="planDay" data-arg="${k}"><span>${DOW[pdk(k).getDay()]}</span><b>${pdk(k).getDate()}</b><span class="p">${fx === 'rest' ? 'Rest' : esc(routineName(S, fx))}</span><i class="d ${done ? 'done' : k < t && fx !== 'rest' ? 'miss' : ''}"></i></button>`; }).join('')}</div>`;
  const d = get(t);
  if (d.wo && d.wo.status === 'active') x += `<div class="card wo"><span class="pill acc">${I.timer} In progress</span><h2 style="font-size:24px;margin:6px 0">${esc(d.wo.name)}</h2><button class="btn wide" data-act="openSession">Continue</button></div>`;
  else { const fx = planned(S, t); if (fx !== 'rest' && !liftDone(d)) x += `<div class="card wo"><span class="pill acc">Today</span><h2 style="font-size:24px;margin:6px 0">${esc(routineName(S, fx))}</h2><div class="row"><button class="btn grow" data-act="startPlanned">${I.play} Start</button><button class="btn ghost" data-act="pickWorkout">Other</button></div></div>`;
    else x += `<button class="btn ghost wide" data-act="pickWorkout">${I.play} Start a workout</button>`; }
  // muscle heat for the week
  const vol = {}; h.sessions.filter(s => s.date >= ws).forEach(s => s.ex.forEach(e => { const info = exInfo(e.name); info.p.forEach(m => { vol[m] = (vol[m] || 0) + e.sets; }); info.s.forEach(m => { vol[m] = (vol[m] || 0) + e.sets * 0.5; }); }));
  const hv = {}; Object.keys(vol).forEach(m => { hv[m] = Math.min(1, vol[m] / 12); });
  x += `<div class="card"><div class="chd"><h3>Muscles this week</h3><span class="r">Sets per muscle</span></div><div class="exhero" style="border:0;padding:0">${heatMap(hv)}</div>
    <div class="row wrap" style="gap:6px;margin-top:8px">${Object.entries(vol).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m, n]) => `<span class="pill">${MUSCLES[m] || m} ${Math.round(n)}</span>`).join('') || '<span class="faint small">Finish a workout and the map fills in.</span>'}</div></div>`;
  x += `<div class="sect"><h2>Routines</h2><button class="link" data-act="routineNew">+ New</button></div>`;
  x += S.routines.length ? `<div class="col">${S.routines.map(r => { const mus = [...new Set(r.ex.flatMap(e => exInfo(e.name).p))].slice(0, 5); const days = Object.entries(S.plan).filter(([, v]) => v === r.id).map(([k2]) => DOW[k2]); return `<button class="rt" data-act="routine" data-arg="${r.id}"><span><b>${esc(r.name)}</b><span class="faint small" style="display:block">${r.ex.length} exercises${days.length ? ' · ' + days.join(', ') : ''}</span><span class="mus">${mus.map(m => `<span class="pill">${MUSCLES[m] || m}</span>`).join('')}</span></span><span class="chev">${I.chev}</span></button>`; }).join('')}</div>`
    : `<div class="card empty">${I.dumb}<b>No routines yet</b><span class="small">Pick a proven program, build your own, or import what you already do.</span><div class="row wrap" style="justify-content:center"><button class="btn sm" data-act="programs">Programs</button><button class="btn sm ghost" data-act="importSheet">Import with AI</button></div></div>`;
  if (S.routines.length) x += `<button class="btn line wide" data-act="programs">Browse programs</button>`;
  // recent sessions + top lifts
  if (h.sessions.length) {
    x += `<div class="sect"><h2>Recent</h2></div><div class="card"><div class="list">${h.sessions.slice(-6).reverse().map(s => `<button class="li" data-act="sessionDetail" data-arg="${s.date}"><span class="ic c-train">${I.dumb}</span><span><span class="t">${esc(s.name)}</span><span class="s">${pdk(s.date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })} · ${s.sets} sets${s.prs ? ' · ' + s.prs + ' PR' : ''}</span></span><span class="r">${fmt(s.vol)} ${unit()}</span></button>`).join('')}</div></div>`;
    const top = Object.entries(h.map).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
    x += `<div class="sect"><h2>Your lifts</h2></div><div class="card"><div class="list">${top.map(([n, rows]) => { const best = Math.max(...rows.map(r => r.e1)); const first = rows[0].e1, ch = first ? ((best - first) / first) * 100 : 0; return `<button class="exrow" data-act="exDetail" data-arg="${esc(n)}"><span class="th">${thumb(n)}</span><span><b>${esc(n)}</b><span>Best ${rows.at(-1).top.w} × ${rows.at(-1).top.r} last · est. 1RM ${Math.round(best)}</span></span><span class="pill ${ch > 0 ? 'win' : ''}">${ch > 0 ? '+' : ''}${Math.round(ch)}%</span></button>`; }).join('')}</div></div>`;
  }
  $('#v-train').innerHTML = x;
}

/* ---------- plan ---------- */
A.planDay = k => {
  const fx = planned(S, k), dow = pdk(k).getDay();
  openSheet('plan', DOWL[dow] + ', ' + pdk(k).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }), `<div class="lab faint small b" style="margin-bottom:8px">THIS DAY ONLY</div><div class="row wrap" style="gap:6px">${[['rest', 'Rest'], ...S.routines.map(r => [r.id, r.name])].map(([id, n]) => `<button class="chip ${fx === id ? 'on' : ''}" data-act="planSet" data-arg="${k}|${id}|once">${esc(n)}</button>`).join('')}</div>
  <div class="lab faint small b" style="margin:18px 0 8px">EVERY ${DOWL[dow].toUpperCase()}</div><div class="row wrap" style="gap:6px">${[['rest', 'Rest'], ...S.routines.map(r => [r.id, r.name])].map(([id, n]) => `<button class="chip ${S.plan[dow] === id ? 'on' : ''}" data-act="planSet" data-arg="${k}|${id}|always">${esc(n)}</button>`).join('')}</div>
  ${k === todayK() && fx !== 'rest' ? `<button class="btn wide mt2" data-act="startPlanned">${I.play} Start ${esc(routineName(S, fx))}</button>` : ''}`);
};
A.planSet = a => { const [k, id, mode] = a.split('|'); if (mode === 'always') { S.plan[pdk(k).getDay()] = id; delete S.planOv[k]; } else S.planOv[k] = id; touch(); closeSheet(); render(); toast(mode === 'always' ? 'Weekly plan updated' : 'Changed for this day'); };
A.planMenu = () => A.planDay(todayK());

/* ---------- programs ---------- */
A.programs = () => openSheet('progs', 'Programs', `<p class="muted small" style="margin-top:-6px">Proven starting points. Everything is editable after.</p><div class="col mt">${Object.entries(PROGRAMS).map(([id, p]) => `<button class="rt" data-act="useProgram" data-arg="${id}"><span><b>${p.n}</b><span class="faint small" style="display:block">${p.d}</span></span><span class="chev">${I.chev}</span></button>`).join('')}</div>`);
export function applyProgram(id, replacePlan = true) {
  const p = PROGRAMS[id]; if (!p) return;
  const ids = {};
  Object.entries(p.r).forEach(([key, [name, ex]]) => { const r = { id: uid(), name, ex: ex.map(([n, s, rp]) => ({ name: n, sets: s, reps: rp, note: '' })) }; S.routines.push(r); ids[key] = r.id; });
  if (replacePlan) { for (let i = 0; i < 7; i++) S.plan[i] = 'rest'; Object.entries(p.days).forEach(([dw, key]) => { S.plan[dw] = ids[key]; }); }
}
A.useProgram = id => { applyProgram(id); touch(); closeSheet(); render(); toast(PROGRAMS[id].n + ' added to your week'); };

/* ---------- routines ---------- */
let ED = null;
A.routineNew = () => { ED = { id: uid(), name: 'New routine', ex: [], fresh: true }; routineEditor(); };
A.routine = id => { const r = S.routines.find(x => x.id === id); if (!r) return; ED = JSON.parse(JSON.stringify(r)); routineEditor(); };
function routineEditor() {
  openSheet('routine', '', `<div class="field"><span>Name</span><input value="${esc(ED.name)}" data-ch="rName" style="font-size:20px;font-weight:700"></div>
  <div class="sec"><div class="lab">Exercises</div><div class="list">${ED.ex.map((e, i) => `<div class="exrow" style="grid-template-columns:52px minmax(0,1fr) auto"><button class="th" data-act="exDetail" data-arg="${esc(e.name)}">${thumb(e.name)}</button><span><b class="ell">${esc(e.name)}</b><span class="row" style="gap:6px;margin-top:4px"><input type="number" inputmode="numeric" value="${e.sets}" data-ch="rSets" data-i="${i}" style="width:56px;padding:6px;text-align:center;font-size:14px"> <span class="faint small">sets of</span> <input value="${esc(e.reps)}" data-ch="rReps" data-i="${i}" style="width:74px;padding:6px;text-align:center;font-size:14px"></span></span><span class="col" style="gap:4px"><button class="x" data-act="rUp" data-arg="${i}" aria-label="Move up" style="transform:rotate(-90deg)">${I.chev}</button><button class="x" data-act="rDel" data-arg="${i}" aria-label="Remove">${I.x}</button></span></div>`).join('') || '<p class="muted small">No exercises yet.</p>'}</div>
  <button class="btn ghost wide mt" data-act="exPick" data-arg="routine">+ Add exercise</button></div>
  <div class="row mt2">${!ED.fresh ? `<button class="btn danger" data-act="rRemove" aria-label="Delete routine">${I.trash}</button>` : ''}<button class="btn ghost grow" data-act="rStart">${I.play} Start now</button><button class="btn grow" data-act="rSave">Save</button></div>`, { full: true });
}
CH.rName = el => { ED.name = el.value; };
CH.rSets = el => { ED.ex[+el.dataset.i].sets = Math.max(1, nint(el.value) || 1); };
CH.rReps = el => { ED.ex[+el.dataset.i].reps = el.value; };
A.rUp = i => { i = +i; if (i > 0) { [ED.ex[i - 1], ED.ex[i]] = [ED.ex[i], ED.ex[i - 1]]; routineEditor(); } };
A.rDel = i => { ED.ex.splice(+i, 1); routineEditor(); };
A.rSave = () => { const i = S.routines.findIndex(r => r.id === ED.id); const r = { id: ED.id, name: ED.name.trim() || 'Routine', ex: ED.ex }; if (i >= 0) S.routines[i] = r; else S.routines.push(r); touch(); closeSheet(); render(); toast('Routine saved'); };
A.rRemove = () => { if (!confirm('Delete this routine? Past workouts stay in your history.')) return; S.routines = S.routines.filter(r => r.id !== ED.id); Object.keys(S.plan).forEach(k => { if (S.plan[k] === ED.id) S.plan[k] = 'rest'; }); touch(); closeSheet(); render(); };
A.rStart = () => { A.rSave(); startWorkout(ED.id); };

/* ---------- exercise library ---------- */
const LIB = { q: '', g: 'All', e: '', mode: 'browse' };
A.library = () => { LIB.mode = 'browse'; openSheet('lib', 'Exercises', libHTML(), { full: true }); };
A.exPick = mode => { LIB.mode = mode; openSheet('lib', 'Add exercise', libHTML(), { full: true }); };
function libHTML() {
  const q = LIB.q.toLowerCase();
  const list = allEx(S.customEx).filter(x => (LIB.g === 'All' || (GROUPS[LIB.g] || []).includes(x.p[0])) && (!LIB.e || x.e === LIB.e) && (!q || x.n.toLowerCase().includes(q) || x.p.some(m => (MUSCLES[m] || '').toLowerCase().includes(q))));
  return `<input type="search" placeholder="Search ${EXERCISES.length + S.customEx.length} exercises or a muscle" value="${esc(LIB.q)}" data-ch="libQ" id="libq">
  <div class="chips mt">${['All', ...Object.keys(GROUPS)].map(g => `<button class="chip ${LIB.g === g ? 'on' : ''}" data-act="libG" data-arg="${g}">${g}</button>`).join('')}</div>
  <div class="chips mt">${['', ...EQUIP].map(e => `<button class="chip ${LIB.e === e ? 'on' : ''}" data-act="libE" data-arg="${e}">${e || 'Any equipment'}</button>`).join('')}</div>
  <div class="list mt">${list.slice(0, 120).map(x => `<button class="exrow" data-act="${LIB.mode === 'browse' ? 'exDetail' : 'exAdd'}" data-arg="${esc(x.n)}"><span class="th">${thumb(x.n)}</span><span><b>${esc(x.n)}</b><span>${x.p.map(m => MUSCLES[m] || m).join(', ')} · ${x.e}</span></span>${LIB.mode === 'browse' ? `<span class="chev">${I.chev}</span>` : `<span class="iconbtn" style="width:32px;height:32px">${I.plus}</span>`}</button>`).join('') || '<p class="muted small center">No match.</p>'}</div>
  <button class="btn line wide mt" data-act="exCustom">Create a custom exercise</button>`;
}
CH.libQ = el => { LIB.q = el.value; const p = el.selectionStart; setSheet(libHTML()); const n = $('#libq'); if (n) { n.focus(); n.setSelectionRange(p, p); } };
A.libG = g => { LIB.g = g; setSheet(libHTML()); };
A.libE = e => { LIB.e = e; setSheet(libHTML()); };
A.exAdd = n => {
  const x = exInfo(n); const reps = ['abs', 'obliques', 'calves', 'delts', 'rdelt', 'biceps', 'triceps', 'forearms'].includes(x.p[0]) ? '10–15' : '8–12';
  if (LIB.mode === 'routine') { ED.ex.push({ name: n, sets: 3, reps, note: '' }); routineEditor(); }
  else if (LIB.mode === 'session') { const w = get(todayK()).wo; w.ex.push(mkEx({ name: n, sets: 3, reps })); touch(); openSession(); }
};
A.exCustom = () => { setSheet(`<div class="col"><div class="field"><span>Name</span><input id="cxn" placeholder="Cable Y-Raise"></div><div class="field"><span>Main muscle</span><select id="cxm">${Object.entries(MUSCLES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div><div class="field"><span>Equipment</span><select id="cxe">${EQUIP.map(e => `<option>${e}</option>`).join('')}</select></div><button class="btn wide" data-act="exCustomSave">Save exercise</button><button class="btn ghost wide" data-act="libBack">Back</button></div>`); };
A.exCustomSave = () => { const n = ($('#cxn').value || '').trim(); if (!n) return; S.customEx.push({ n, p: [$('#cxm').value], s: [], e: $('#cxe').value, c: '' }); touch(); LIB.q = n; setSheet(libHTML()); };
A.libBack = () => setSheet(libHTML());
A.exDetail = n => {
  const x = exInfo(n), rows = hist().map[n] || [];
  const best = rows.length ? rows.reduce((b, r) => (r.e1 > b.e1 ? r : b), rows[0]) : null;
  openSheet('ex', esc(n), `<div class="exhero">${bodyMap(x.p, x.s)}</div>
  <div class="row wrap mt" style="gap:6px">${x.p.map(m => `<span class="pill acc">${MUSCLES[m] || m}</span>`).join('')}${x.s.map(m => `<span class="pill">${MUSCLES[m] || m}</span>`).join('')}${x.e ? `<span class="pill">${x.e}</span>` : ''}</div>
  ${x.c ? `<div class="note mt"><b style="color:var(--ink)">How to</b><br>${esc(x.c)}</div>` : ''}
  ${rows.length ? `<div class="g3 mt"><div class="stat"><small>Est. 1RM</small><b class="n">${Math.round(best.e1)}</b></div><div class="stat"><small>Best set</small><b class="n">${best.top.w}×${best.top.r}</b></div><div class="stat"><small>Sessions</small><b class="n">${rows.length}</b></div></div>
  <div class="card mt"><div class="chd"><h3>Estimated 1RM</h3><span class="r">${unit()}</span></div>${line(rows.slice(-20).map(r => ({ x: pdk(r.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }), y: Math.round(r.e1) })), { c: 'train', dots: true, area: true })}</div>
  <div class="list mt">${rows.slice(-8).reverse().map(r => `<div class="li noic"><span><span class="t">${pdk(r.date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}</span><span class="s">${r.sets.map(s => s.w + '×' + s.r).join(', ')}</span></span><span class="r">${fmt(r.vol)}</span></div>`).join('')}</div>` : '<p class="muted small mt">No history yet. Your sets and records show up here.</p>'}`, { full: true });
};

/* ---------- sessions ---------- */
function mkEx(e) { const info = exInfo(e.name); return { id: uid(), name: e.name, muscle: info.p[0], reps: e.reps || '8–12', note: e.note || '', sets: Array.from({ length: +e.sets || 3 }, () => ({ w: '', r: '', k: 'N', done: false })) }; }
export function startWorkout(rid, name) {
  const t = todayK(), d = day(t);
  if (d.wo && d.wo.status === 'active') { openSession(); return; }
  if (liftDone(d) && !confirm('You already finished a workout today. Start another? It replaces today’s.')) return;
  const r = S.routines.find(x => x.id === rid);
  d.wo = { id: uid(), rid: r ? r.id : '', name: r ? r.name : name || 'Workout', status: 'active', start: Date.now(), end: 0, ex: r ? r.ex.map(mkEx) : [] };
  // prefill weights from last time
  const h = hist(); d.wo.ex.forEach(e => { const last = (h.map[e.name] || []).at(-1); if (last) e.sets.forEach((s, i) => { const p = last.sets[i] || last.sets.at(-1); if (p) { s.w = String(p.w); s.ph = p.r; } }); });
  touch(t); closeSheet(); openSession(); render();
}
A.startPlanned = () => { const fx = planned(S, todayK()); if (fx === 'rest') { A.pickWorkout(); return; } startWorkout(fx); };
A.pickWorkout = () => openSheet('pickwo', 'Start a workout', `<div class="col">${S.routines.map(r => `<button class="rt" data-act="startR" data-arg="${r.id}"><span><b>${esc(r.name)}</b><span class="faint small" style="display:block">${r.ex.length} exercises</span></span><span class="chev">${I.play}</span></button>`).join('')}<button class="rt" data-act="startEmpty"><span><b>Empty workout</b><span class="faint small" style="display:block">Add exercises as you go</span></span><span class="chev">${I.plus}</span></button></div>${!S.routines.length ? `<button class="btn ghost wide mt" data-act="programs">Browse programs</button>` : ''}`);
A.startR = id => startWorkout(id);
A.startEmpty = () => startWorkout('', 'Workout');
A.openSession = () => openSession();
const curWo = () => { const d = get(todayK()); return d.wo && d.wo.status === 'active' ? d.wo : null; };
function openSession() {
  const w = curWo(); if (!w) return;
  const kind = Sheet.kind; const sc = kind === 'session' ? $('#sheet').scrollTop : 0;
  openSheet('session', esc(w.name), sessionHTML(w), { full: true, onClose: () => paintDock() });
  if (kind === 'session') $('#sheet').scrollTop = sc;
  paintDock();
}
function sessionHTML(w) {
  const h = hist(), t = todayK();
  const done = w.ex.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0), all = w.ex.reduce((a, e) => a + e.sets.length, 0);
  const vol = w.ex.reduce((a, e) => a + e.sets.filter(s => s.done && s.k !== 'W').reduce((b, s) => b + num(s.w) * num(s.r), 0), 0);
  return `<div class="row between"><span class="faint small"><span id="welap">${elapsed(w.start)}</span> · ${done}/${all} sets · ${fmt(vol)} ${unit()}</span><button class="btn xs ghost" data-act="woRename">Rename</button></div>
  <div class="pbar c-train mt" style="height:6px"><i style="width:${all ? (done / all) * 100 : 0}%"></i></div>
  <div class="session mt">${w.ex.map((e, i) => { const o = overload(h, e.name, e.reps, t); const exDone = e.sets.length && e.sets.every(s => s.done); return `<div class="sx ${exDone ? 'done' : ''}">
    <div class="sxh"><button class="th" data-act="exDetail" data-arg="${esc(e.name)}">${thumb(e.name)}</button><span><b>${esc(e.name)}</b><span>${e.sets.length} × ${esc(e.reps)}${exInfo(e.name).c ? ' · ' + esc(exInfo(e.name).c.split('.')[0]) : ''}</span></span><button class="x" data-act="exMenu" data-arg="${i}" aria-label="Exercise options">${I.dots}</button></div>
    <div class="hint">${esc(o.line)}${o.next ? ` · try <b>${o.next.w} × ${o.next.r}</b>` : ''}</div>${o.stall ? `<div class="note small" style="margin-top:6px">${esc(o.stall)}</div>` : ''}
    <div class="sets"><div class="set h"><span>Set</span><span>Prev</span><span>${unit()}</span><span>Reps</span><span></span></div>
    ${e.sets.map((s, j) => { const prev = (h.map[e.name] || []).filter(r => r.date !== t).at(-1); const pv = prev && (prev.sets[j] || null); return `<div class="set ${s.done ? 'done' : ''}"><button class="k ${s.k}" data-act="setKind" data-arg="${i}|${j}">${s.k === 'W' ? 'W' : j + 1 - e.sets.slice(0, j).filter(x => x.k === 'W').length}</button><span class="pv">${pv ? pv.w + '×' + pv.r : '–'}</span><input type="number" inputmode="decimal" value="${esc(s.w)}" placeholder="${pv ? pv.w : '0'}" data-ch="setW" data-i="${i}" data-j="${j}"><input type="number" inputmode="numeric" value="${esc(s.r)}" placeholder="${s.ph || (pv ? pv.r : '') || String(e.reps).split(/[–-]/)[0]}" data-ch="setR" data-i="${i}" data-j="${j}"><button class="ck" data-act="setDone" data-arg="${i}|${j}" aria-label="Complete set">${I.check}</button></div>${s.pr ? `<div style="margin:-2px 0 2px 37px"><span class="prtag">${esc(s.pr)}</span></div>` : ''}`; }).join('')}</div>
    <div class="row mt" style="gap:6px"><button class="btn xs ghost" data-act="setAdd" data-arg="${i}">+ Set</button>${e.sets.length > 1 ? `<button class="btn xs ghost" data-act="setRem" data-arg="${i}">− Set</button>` : ''}</div></div>`; }).join('')}</div>
  <button class="btn ghost wide mt" data-act="exPick" data-arg="session">+ Add exercise</button>
  <div class="row mt2"><button class="btn danger" data-act="woDiscard" aria-label="Discard workout">${I.trash}</button><button class="btn grow" data-act="woFinish">Finish workout</button></div>`;
}
const elapsed = s => { const m = Math.floor((Date.now() - s) / 60000); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min'; };
CH.setW = el => { const w = curWo(); if (!w) return; w.ex[+el.dataset.i].sets[+el.dataset.j].w = el.value; touch(); };
CH.setR = el => { const w = curWo(); if (!w) return; w.ex[+el.dataset.i].sets[+el.dataset.j].r = el.value; touch(); };
A.setKind = a => { const [i, j] = a.split('|').map(Number); const s = curWo().ex[i].sets[j]; s.k = s.k === 'W' ? 'N' : 'W'; touch(); openSession(); };
A.setDone = a => {
  const [i, j] = a.split('|').map(Number), w = curWo(), e = w.ex[i], s = e.sets[j];
  if (!s.done) {
    if (!s.w) { const inp = document.querySelector(`[data-ch="setW"][data-i="${i}"][data-j="${j}"]`); s.w = inp && inp.placeholder !== '0' ? inp.placeholder : s.w; }
    if (!s.r) { const inp = document.querySelector(`[data-ch="setR"][data-i="${i}"][data-j="${j}"]`); s.r = inp ? inp.placeholder : ''; }
    if (!num(s.r)) { toast('Add the reps first'); return; }
    s.done = true; s.pr = s.k === 'W' ? '' : prCheck(hist(), e.name, num(s.w), num(s.r), todayK());
    if (s.pr) { haptic([20, 40, 20]); confetti(60); toast(s.pr + '! ' + e.name); }
    else haptic(12);
    startRest(['abs', 'obliques', 'calves', 'biceps', 'triceps', 'delts', 'rdelt', 'forearms'].includes(exInfo(e.name).p[0]) ? Math.min(S.settings.rest, 75) : S.settings.rest);
  } else { s.done = false; s.pr = ''; }
  touch(); openSession();
};
A.setAdd = i => { const e = curWo().ex[+i]; const last = e.sets.at(-1) || {}; e.sets.push({ w: last.w || '', r: '', k: 'N', done: false }); touch(); openSession(); };
A.setRem = i => { const e = curWo().ex[+i]; e.sets.pop(); touch(); openSession(); };
A.exMenu = i => { i = +i; const w = curWo(), e = w.ex[i]; openSheet('exm', esc(e.name), `<div class="list"><button class="li noic" data-act="exSwap" data-arg="${i}"><span class="t">Swap exercise</span><span class="chev">${I.chev}</span></button><button class="li noic" data-act="exMove" data-arg="${i}|-1"><span class="t">Move up</span><span></span></button><button class="li noic" data-act="exMove" data-arg="${i}|1"><span class="t">Move down</span><span></span></button><button class="li noic" data-act="exRemove" data-arg="${i}"><span class="t" style="color:#ff6b6b">Remove</span><span></span></button></div><button class="btn ghost wide mt" data-act="openSession">Back to workout</button>`); };
A.exMove = a => { const [i, d] = a.split('|').map(Number), w = curWo(), j = i + d; if (j < 0 || j >= w.ex.length) { openSession(); return; } [w.ex[i], w.ex[j]] = [w.ex[j], w.ex[i]]; touch(); openSession(); };
A.exRemove = i => { curWo().ex.splice(+i, 1); touch(); openSession(); };
let swapIdx = -1;
A.exSwap = i => { swapIdx = +i; const cur = exInfo(curWo().ex[swapIdx].name); const alts = allEx(S.customEx).filter(x => x.p[0] === cur.p[0] && x.n !== cur.n); openSheet('swap', 'Swap for', `<div class="list">${alts.map(x => `<button class="exrow" data-act="exSwapTo" data-arg="${esc(x.n)}"><span class="th">${thumb(x.n)}</span><span><b>${esc(x.n)}</b><span>${x.e}</span></span><span class="chev">${I.chev}</span></button>`).join('')}</div>`); };
A.exSwapTo = n => { const w = curWo(), e = w.ex[swapIdx]; const ne = mkEx({ name: n, sets: e.sets.length, reps: e.reps }); w.ex[swapIdx] = ne; touch(); openSession(); };
A.woRename = () => { const w = curWo(); const n = prompt('Workout name', w.name); if (n) { w.name = n.trim(); touch(); openSession(); } };
A.woDiscard = () => { if (!confirm('Discard this workout? Sets you logged will be deleted.')) return; const d = day(todayK()); d.wo = null; touch(); endRest(); closeSheet(); render(); };
A.woFinish = () => {
  const w = curWo(); if (!w) return;
  w.ex.forEach(e => { e.sets = e.sets.filter(s => s.done || num(s.r)); });
  w.ex = w.ex.filter(e => e.sets.length);
  if (!w.ex.some(e => e.sets.some(s => s.done))) { toast('Complete at least one set first'); openSession(); return; }
  w.ex.forEach(e => e.sets.forEach(s => { if (!s.done && num(s.r)) { s.done = true; s.pr = prCheck(hist(), e.name, num(s.w), num(s.r), todayK()); } }));
  w.status = 'done'; w.end = Date.now();
  // remember the edited lineup back into the routine
  const r = S.routines.find(x => x.id === w.rid);
  if (r) r.ex = w.ex.map(e => ({ name: e.name, sets: e.sets.filter(s => s.k !== 'W').length || e.sets.length, reps: e.reps, note: e.note }));
  touch(); endRest(); closeSheet(); render();
  summary(todayK(), true);
  postWorkout(todayK());
};
A.sessionDetail = k => summary(k, false);
function summary(k, fresh) {
  const w = get(k).wo; if (!w) return;
  const sets = w.ex.reduce((a, e) => a + e.sets.filter(s => s.done && s.k !== 'W').length, 0);
  const vol = w.ex.reduce((a, e) => a + e.sets.filter(s => s.done && s.k !== 'W').reduce((b, s) => b + num(s.w) * num(s.r), 0), 0);
  const prs = w.ex.flatMap(e => e.sets.filter(s => s.pr).map(s => ({ n: e.name, s })));
  const mus = [...new Set(w.ex.flatMap(e => exInfo(e.name).p))], sec = [...new Set(w.ex.flatMap(e => exInfo(e.name).s))].filter(m => !mus.includes(m));
  if (fresh) { confetti(prs.length ? 160 : 90); beep(988, 0.15); }
  openSheet('sum', fresh ? 'Workout complete' : esc(w.name), `<div class="exhero">${bodyMap(mus, sec)}</div>
  <div class="sumgrid mt"><div class="stat"><small>Time</small><b class="n">${w.end && w.start ? Math.round((w.end - w.start) / 60000) : '–'}<span class="faint small"> min</span></b></div><div class="stat"><small>Volume</small><b class="n">${fmt(vol)}</b></div><div class="stat"><small>Sets</small><b class="n">${sets}</b></div></div>
  ${prs.length ? `<div class="card mt"><div class="chd"><h3>${I.trophy} ${prs.length} personal record${prs.length > 1 ? 's' : ''}</h3></div><div class="list">${prs.map(p => `<div class="li noic"><span><span class="t">${esc(p.n)}</span><span class="s">${esc(p.s.pr)}</span></span><span class="r b">${p.s.w} × ${p.s.r}</span></div>`).join('')}</div></div>` : ''}
  <div class="list mt">${w.ex.map(e => `<div class="li noic"><span><span class="t">${esc(e.name)}</span><span class="s">${e.sets.filter(s => s.done).map(s => (s.k === 'W' ? 'W ' : '') + s.w + '×' + s.r).join(', ')}</span></span><span></span></div>`).join('')}</div>
  ${fresh ? `<p class="faint small center mt">${scoreOf(k).total} day score · training points locked in</p>` : ''}
  <button class="btn wide mt" data-act="closeSheet">Done</button>`, { full: true });
}

/* ---------- rest timer dock ---------- */
const REST = { end: 0, total: 0, t: null };
function startRest(sec) { REST.total = sec; REST.end = Date.now() + sec * 1000; clearInterval(REST.t); REST.t = setInterval(tick, 250); paintDock(); }
function endRest() { REST.end = 0; clearInterval(REST.t); paintDock(); }
function tick() { const left = Math.ceil((REST.end - Date.now()) / 1000); if (left <= 0) { if (S.settings.sound) beep(880, 0.2); haptic([30, 60, 30]); endRest(); return; } const el = $('#restT'); if (el) el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); const e2 = $('#welap'); const w = curWo(); if (e2 && w) e2.textContent = elapsed(w.start); }
export function paintDock() {
  const dk = $('#dock'), w = curWo(), sheetOpen = !$('#sheetwrap').hidden;
  if (REST.end > Date.now()) { const left = Math.ceil((REST.end - Date.now()) / 1000); dk.hidden = false; dk.style.bottom = sheetOpen ? 'calc(14px + env(safe-area-inset-bottom,0px))' : ''; dk.style.zIndex = sheetOpen ? 55 : 29; dk.innerHTML = `<div class="dock"><span class="iconbtn" style="color:var(--train)">${I.timer}</span><span><span class="t" id="restT">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span><small class="faint" style="display:block;font-size:12px">Rest</small></span><span class="row" style="gap:6px"><button class="btn xs ghost" data-act="restAdd" data-arg="-15">−15</button><button class="btn xs ghost" data-act="restAdd" data-arg="15">+15</button><button class="btn xs" data-act="restSkip">Skip</button></span></div>`; return; }
  if (w && !sheetOpen) { dk.hidden = false; dk.style.bottom = ''; dk.style.zIndex = 29; dk.innerHTML = `<button class="dock" data-act="openSession" style="width:100%;text-align:left"><span class="iconbtn" style="color:var(--train)">${I.dumb}</span><span><b>${esc(w.name)}</b><small class="faint" style="display:block;font-size:12px">${elapsed(w.start)} · tap to continue</small></span><span class="chev">${I.chev}</span></button>`; return; }
  dk.hidden = true; dk.innerHTML = '';
}
A.restAdd = n => { REST.end += +n * 1000; if (REST.end <= Date.now()) endRest(); else tick(); };
A.restSkip = () => endRest();

/* ---------- AI import ---------- */
A.importSheet = () => openSheet('import', 'Import your training', `<p class="muted small" style="margin-top:-6px">Paste your plan or log from anywhere (Notes, Strong, Hevy, a spreadsheet, a coach’s PDF text), or add screenshots. The AI turns it into routines and history.</p>
  <textarea id="imtx" placeholder="Push: Incline DB press 3x8, Pec deck 2x12…&#10;or&#10;Oct 12 Bench 185x5, 185x5, 175x7…" style="min-height:150px"></textarea>
  <div class="row mt"><button class="btn ghost grow" data-act="imPics">${I.cam} Add screenshots</button></div><div id="impics" class="faint small mt"></div>
  ${aiOn() ? '' : '<div class="note mt">Turn on AI in Settings to import. It takes a free Gemini key.</div>'}
  <button class="btn wide mt2" data-act="imGo" ${aiOn() ? '' : 'disabled'}>${I.spark} Read it</button>`, { full: true });
let IMF = [];
A.imPics = async () => { IMF = await pickFiles('image/*', true); $('#impics').textContent = IMF.length ? IMF.length + ' screenshot' + (IMF.length > 1 ? 's' : '') + ' attached' : ''; };
let IMR = null;
A.imGo = async () => {
  const tx = ($('#imtx') || {}).value || '';
  if (!tx.trim() && !IMF.length) { toast('Paste something or add a screenshot'); return; }
  setSheet(`<div class="thinking"><span class="spin"></span>Reading your training…</div>`);
  try { IMR = await importWorkouts(tx, IMF); } catch (e) { setSheet(`<div class="err">${esc(errMsg(e))}</div><button class="btn wide mt" data-act="importSheet">Try again</button>`); return; }
  const rs = IMR.routines || [], ss = IMR.sessions || [];
  setSheet(`${rs.length ? `<div class="lab faint small b">ROUTINES</div><div class="col mt">${rs.map(r => `<div class="rt"><span><b>${esc(r.name)}</b><span class="faint small" style="display:block">${(r.ex || []).map(e => esc(e.name) + ' ' + e.sets + '×' + esc(e.reps)).join(' · ')}</span></span><span class="pill">${r.day >= 0 && r.day <= 6 ? DOW[r.day] : ''}</span></div>`).join('')}</div>` : ''}
  ${ss.length ? `<div class="lab faint small b mt2">HISTORY</div><p class="muted small">${ss.length} past workout${ss.length > 1 ? 's' : ''}${IMR.unit ? ' in ' + IMR.unit : ''}.</p>` : ''}
  ${IMR.notes ? `<div class="note mt">${esc(IMR.notes)}</div>` : ''}
  ${!rs.length && !ss.length ? '<div class="err">Couldn’t find workouts in that. Try pasting more detail.</div>' : `<label class="row mt2" style="gap:10px"><input type="checkbox" id="implan" checked style="width:20px;height:20px"> Use the days for my weekly plan</label><button class="btn wide mt" data-act="imSave">Import</button>`}`);
};
A.imSave = () => {
  const usePlan = ($('#implan') || {}).checked; let nr = 0, ns = 0;
  (IMR.routines || []).forEach(r => { const id = uid(); S.routines.push({ id, name: r.name || 'Routine', ex: (r.ex || []).map(e => ({ name: (findEx(e.name, S.customEx) || {}).n || e.name, sets: +e.sets || 3, reps: String(e.reps || '8–12'), note: e.note || '' })) }); nr++; if (usePlan && r.day >= 0 && r.day <= 6) S.plan[r.day] = id; });
  (IMR.sessions || []).forEach(s => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date || '')) return; const d = day(s.date); if (d.wo) return; const conv = IMR.unit && IMR.unit !== unit() ? (IMR.unit === 'lb' ? 1 / 2.2046 : 2.2046) : 1; d.wo = { id: uid(), name: s.name || 'Workout', status: 'done', start: 0, end: 0, ex: (s.ex || []).map(e => ({ id: uid(), name: (findEx(e.name, S.customEx) || {}).n || e.name, muscle: exInfo(e.name).p[0], reps: '8–12', note: '', sets: (e.sets || []).map(x => ({ w: String(Math.round(num(x.w) * conv * 2) / 2), r: String(nint(x.r)), k: 'N', done: true, pr: '' })) })) }; ns++; if (s.date < S.profile.start) S.profile.start = s.date; });
  touch(); closeSheet(); render(); toast(`Imported ${nr} routine${nr === 1 ? '' : 's'}${ns ? ' and ' + ns + ' workouts' : ''}`);
};
export { exInfo, thumb };
