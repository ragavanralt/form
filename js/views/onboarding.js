// Onboarding: a short guided setup that builds the app around what this person wants to track.
import { S, save, replaceState, hasV1, readV1, render } from '../store.js';
import { MODULES, ACTIVITY, suggestTargets, migrateV1, todayK, esc, num, nint, uid, normalize, freshState } from '../core.js';
import { A, CH, I, $, toast, haptic, confetti, pickFiles } from '../ui.js';
import { arings as rings0 } from '../charts.js';
const rings = (it, size) => rings0(it.map((x, i) => ({ f: x.f, k: ['fuel', 'train', 'move'][i] })), size, 20, 5);
import { PROGRAMS, findEx } from '../exercises.js';
import { applyProgram } from './train.js';
import { aiOn, setGemKey, testKey, planFromText, errMsg, gemKey } from '../ai.js';

const GOALS = [['fat', 'Lose fat', I.flame, 'food'], ['muscle', 'Build muscle', I.dumb, 'train'], ['strength', 'Get stronger', I.bolt, 'train'], ['eat', 'Eat better', I.leaf, 'move'], ['fit', 'Fitter and healthier', I.run, 'move'], ['habit', 'Build a routine I stick to', I.calendar, 'habit']];
const MOD_IC = { food: [I.cam, 'food'], train: [I.dumb, 'train'], cardio: [I.run, 'move'], steps: [I.shoe, 'move'], water: [I.drop, 'water'], supps: [I.pill, 'habit'], weight: [I.scale, 'body'] };
const OB = { i: 0, p: {}, ai: '', busy: false, plan: null };
const STEPS = ['welcome', 'name', 'goals', 'modules', 'body', 'targets', 'training', 'supps', 'social', 'ai', 'done'];
const skip = s => ({ body: !S.modules.food, targets: !(S.modules.food || S.modules.steps || S.modules.water || S.modules.cardio), training: !S.modules.train, supps: !S.modules.supps })[s] || false;

export function startOnboarding() { OB.i = 0; const f = freshState(); S.modules = f.modules; $('#onboard').hidden = false; draw(); }
function go(d) { let i = OB.i + d; while (i > 0 && i < STEPS.length - 1 && skip(STEPS[i])) i += d; OB.i = Math.max(0, Math.min(STEPS.length - 1, i)); draw(); $('#onboard').scrollTop = 0; }
A.obNext = () => { if (!collect()) return; haptic(); go(1); };
A.obBack = () => go(-1);
function bar() { const n = STEPS.length - 2, i = Math.min(OB.i, n); return `<div class="obbar">${OB.i > 0 ? `<button class="iconbtn" data-act="obBack" aria-label="Back">${I.back}</button>` : ''}<div class="track"><i style="width:${(i / n) * 100}%"></i></div></div>`; }
function opt(act, arg, on, icon, c, title, sub) { return `<button class="opt c-${c} ${on ? 'on' : ''}" data-act="${act}" data-arg="${arg}"><span class="oi">${icon}</span><span><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</span><span class="ck2">${I.check}</span></button>`; }

function draw() {
  const s = STEPS[OB.i], P = S.profile; let h = '';
  if (s === 'welcome') {
    h = `<div class="hello">${rings([{ f: 0.82, c: 'food' }, { f: 0.64, c: 'train' }, { f: 0.9, c: 'move' }], 220, 18, 6)}<h1>Stack</h1><p>Food, training and habits. One daily score.</p></div>
    <div class="col" style="gap:14px"><div class="feat"><span class="fi">${I.cam}</span><span><b>Snap your food</b><span>AI counts it and shows its work.</span></span></div>
    <div class="feat"><span class="fi">${I.dumb}</span><span><b>Train smarter</b><span>Routines, PRs and 100+ exercises.</span></span></div>
    <div class="feat"><span class="fi">${I.users}</span><span><b>Better with friends</b><span>Nudge friends and race a weekly league.</span></span></div></div>
    <div class="foot"><button class="btn wide" data-act="obNext">Get started</button>${hasV1() ? `<button class="btn ghost wide" data-act="obV1">Bring in my data from the old Form</button>` : ''}<button class="btn line wide" data-act="obRestore">Restore a backup</button></div>`;
  } else if (s === 'name') {
    h = `${bar()}<h1>What should we call you?</h1><p class="lead">Just a first name is fine.</p><input id="obn" value="${esc(P.name)}" placeholder="Your name" style="font-size:22px;font-weight:600" autocomplete="given-name">
    <div class="foot"><button class="btn wide" data-act="obNext">Continue</button></div>`;
  } else if (s === 'goals') {
    const g = P.goals || [];
    h = `${bar()}<h1>What are you here for?</h1><p class="lead">Pick any. This shapes your targets and what shows up first.</p><div class="opts">${GOALS.map(([id, n, ic, c]) => opt('obGoal', id, g.includes(id), ic, c, n)).join('')}</div>
    <div class="foot"><button class="btn wide" data-act="obNext" ${g.length ? '' : 'disabled'}>Continue</button></div>`;
  } else if (s === 'modules') {
    h = `${bar()}<h1>What do you want to track?</h1><p class="lead">Your day score is built from these. Change it any time in Settings.</p><div class="opts">${MODULES.map(m => opt('obMod', m.id, S.modules[m.id], MOD_IC[m.id][0], MOD_IC[m.id][1], m.n, m.d)).join('')}</div>
    <div class="foot"><button class="btn wide" data-act="obNext" ${Object.values(S.modules).some(Boolean) ? '' : 'disabled'}>Continue</button></div>`;
  } else if (s === 'body') {
    const u = P.units;
    h = `${bar()}<h1>A bit about you</h1><p class="lead">Used to work out sensible calorie and protein targets. Stays on your phone.</p>
    <div class="seg">${[['kg', 'kg / cm'], ['lb', 'lb / ft']].map(([k, l]) => `<button class="${u === k ? 'on' : ''}" data-act="obUnit" data-arg="${k}">${l}</button>`).join('')}</div>
    <div class="seg">${[['male', 'Male'], ['female', 'Female'], ['', 'Prefer not to say']].map(([k, l]) => `<button class="${P.sex === k ? 'on' : ''}" data-act="obSex" data-arg="${k}">${l}</button>`).join('')}</div>
    <div class="g3"><label class="field"><span>Age</span><input id="oba" type="number" inputmode="numeric" value="${P.age || ''}" placeholder="25"></label>
    ${u === 'lb' ? `<label class="field"><span>Height (ft.in)</span><input id="obh" inputmode="decimal" value="${P.heightCm ? (Math.floor(P.heightCm / 30.48) + '.' + Math.round((P.heightCm / 2.54) % 12)) : ''}" placeholder="5.10"></label><label class="field"><span>Weight (lb)</span><input id="obw" type="number" inputmode="decimal" value="${P.weightKg ? Math.round(P.weightKg * 2.2046) : ''}" placeholder="170"></label>`
      : `<label class="field"><span>Height (cm)</span><input id="obh" type="number" inputmode="numeric" value="${P.heightCm || ''}" placeholder="178"></label><label class="field"><span>Weight (kg)</span><input id="obw" type="number" inputmode="decimal" value="${P.weightKg || ''}" placeholder="77"></label>`}</div>
    <div class="field"><span>How active are you outside the gym?</span><select id="obact">${ACTIVITY.map(([k, l]) => `<option value="${k}" ${P.activity === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><span>Right now I want to</span><div class="seg">${[['cut', 'Lose fat'], ['maintain', 'Maintain'], ['bulk', 'Gain muscle']].map(([k, l]) => `<button class="${P.goal === k ? 'on' : ''}" data-act="obMode" data-arg="${k}">${l}</button>`).join('')}</div></div>
    <div class="foot"><button class="btn wide" data-act="obNext">Continue</button><button class="btn ghost wide" data-act="obSkipBody">Skip, I’ll set targets myself</button></div>`;
  } else if (s === 'targets') {
    const T = S.targets, sg = suggestTargets(P);
    const row = (k, n, sub, u2) => `<div class="tgt"><span><b>${n}</b><span>${sub}</span></span><div class="unit"><input type="number" inputmode="numeric" value="${T[k]}" data-ch="obT" data-k="${k}"><i>${u2}</i></div></div>`;
    h = `${bar()}<h1>Your daily targets</h1><p class="lead">${bmrLine(sg)}</p>
    <div class="card">${S.modules.food ? row('cal', 'Calories', P.goal === 'cut' ? 'A steady deficit' : P.goal === 'bulk' ? 'A small surplus' : 'Maintenance', 'kcal') + row('pro', 'Protein', 'About 1.8–2 g per kg', 'g') + row('carb', 'Carbs', '', 'g') + row('fat', 'Fat', '', 'g') : ''}${S.modules.steps ? row('steps', 'Steps', '', '') : ''}${S.modules.cardio ? row('cardio', 'Cardio', 'Per day', 'min') : ''}${S.modules.water ? row('water', 'Water', '', 'ml') : ''}</div>
    <div class="card" style="background:var(--accs);border-color:transparent"><div class="row" style="gap:8px;margin-bottom:8px"><span style="color:var(--acc)">${I.spark}</span><b>Or let the AI set you up</b></div><textarea id="obai" placeholder="e.g. 21, 5'10 175 lb, want to lean out for summer, gym 4x a week push pull legs, take creatine, hate cardio" style="min-height:84px">${esc(OB.ai)}</textarea>
    ${aiOn() ? `<button class="btn sm mt" data-act="obAI">${OB.busy ? '<span class="spin"></span> Building…' : 'Build my plan'}</button>` : `<p class="faint small" style="margin:8px 0 0">Add a free Gemini key at the AI step to use this. You can come back.</p>`}<div id="obaiout">${OB.plan ? `<div class="note mt">${esc(OB.plan.summary || '')}</div>${(OB.plan.tips || []).map(t => `<div class="tip mt">${I.bulb}<span>${esc(t)}</span></div>`).join('')}` : ''}</div></div>
    <div class="foot"><button class="btn wide" data-act="obNext">Looks good</button></div>`;
  } else if (s === 'training') {
    const has = S.routines.length;
    h = `${bar()}<h1>Your training</h1><p class="lead">${has ? `${S.routines.length} routine${S.routines.length > 1 ? 's' : ''} ready: ${esc(S.routines.map(r => r.name).join(', '))}.` : 'Start from a proven program, or bring in what you already do.'}</p>
    <div class="opts">${Object.entries(PROGRAMS).map(([id, p]) => opt('obProg', id, OB.prog === id, I.dumb, 'train', p.n, p.d)).join('')}
    ${opt('obProg', 'import', OB.prog === 'import', I.upload, 'accent', 'Import my own', 'Paste or screenshot your plan from Notes, Strong, Hevy… AI reads it')}
    ${opt('obProg', 'later', OB.prog === 'later', I.clock, 'habit', 'Set it up later', 'Log any workout and build routines as you go')}</div>
    ${OB.prog === 'import' ? `<textarea id="obimp" class="mt" placeholder="Mon Push: Incline DB 3x8-10, Machine press 3x10…" style="min-height:120px"></textarea><div class="row"><button class="btn ghost grow" data-act="obImpPics">${I.cam} Screenshots</button><button class="btn grow" data-act="obImp" ${aiOn() ? '' : 'disabled'}>${OB.busy ? '<span class="spin"></span>' : I.spark} Read it</button></div>${aiOn() ? '' : '<p class="faint small">Needs AI. Add a key at the AI step, then import from Train.</p>'}<div id="obimpout"></div>` : ''}
    <div class="foot"><button class="btn wide" data-act="obNext">${OB.prog || has ? 'Continue' : 'Skip for now'}</button></div>`;
  } else if (s === 'supps') {
    const names = ['Creatine', 'Protein powder', 'Multivitamin', 'Vitamin D', 'Fish oil', 'Magnesium', 'Pre-workout', 'Electrolytes'];
    h = `${bar()}<h1>Your daily stack</h1><p class="lead">Tick them off each day. They count toward your score.</p><div class="row wrap" style="gap:8px">${names.map(n => `<button class="chip ${S.supps.some(x => x.name === n) ? 'on' : ''}" data-act="obSupp" data-arg="${n}">${n}</button>`).join('')}</div>
    <div class="row"><input id="obsx" placeholder="Something else"><button class="btn ghost" data-act="obSuppAdd">Add</button></div>
    <div class="foot"><button class="btn wide" data-act="obNext">Continue</button></div>`;
  } else if (s === 'social') {
    h = `${bar()}<h1>Solo or with friends?</h1><p class="lead">Friends see your scores and workouts. Meals and weight stay private unless you share them.</p>
    <div class="opts">${opt('obSoc', 'friends', P.social === 'friends', I.users, 'accent', 'With friends', 'Feed, nudges, flexes and a weekly league')}${opt('obSoc', 'solo', P.social === 'solo', I.target, 'habit', 'Just me', 'Fully private. Everything stays on this phone')}</div>
    <div class="foot"><button class="btn wide" data-act="obNext">Continue</button></div>`;
  } else if (s === 'ai') {
    h = `${bar()}<h1>Turn on AI</h1><p class="lead">Photo food logging, meal descriptions, workout import and weekly coaching. Free with your own Google Gemini key, which never leaves this phone.</p>
    <div class="card"><ol class="muted small" style="margin:0;padding-left:18px;display:grid;gap:6px"><li>Open <a class="link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com/app/apikey</a> and sign in with Google.</li><li>Tap <b>Create API key</b> and copy it.</li><li>Paste it here.</li></ol>
    <input id="obkey" class="mt" type="password" placeholder="Paste your key" value="${esc(gemKey())}" autocomplete="off"><div id="obkeyout"></div>
    <button class="btn sm ghost mt" data-act="obKey">Test key</button></div>
    <div class="foot"><button class="btn wide" data-act="obNext">${gemKey() ? 'Continue' : 'Continue'}</button><button class="btn ghost wide" data-act="obNextNoKey">Skip, I’ll log by hand</button></div>`;
  } else if (s === 'done') {
    h = `<div class="hello" style="min-height:300px">${rings([{ f: 1, c: 'food' }, { f: 1, c: 'train' }, { f: 1, c: 'move' }], 220, 18, 6)}<h1>You’re set${P.name ? ', ' + esc(P.name.split(' ')[0]) : ''}.</h1><p>Every day gets a score out of 100. 70 is a win. Stack wins to build your streak and climb levels.</p></div>
    <div class="col" style="gap:14px"><div class="feat"><span class="fi">${I.plus}</span><span><b>The + button logs anything</b><span>Snap a meal, start a workout, tick your stack.</span></span></div>
    <div class="feat"><span class="fi">${I.bolt}</span><span><b>The coach shows your next best move</b><span>It ranks what’s left by how many points it’s worth.</span></span></div>
    <div class="feat"><span class="fi">${I.calendar}</span><span><b>Close out each night</b><span>Get your recap${P.social === 'friends' ? ' and post it for your friends' : ''}.</span></span></div></div>
    <div class="foot"><button class="btn wide" data-act="obFinish">Let’s go</button></div>`;
  }
  $('#onboard').innerHTML = `<div class="ob">${h}</div>`;
}
function bmrLine(sg) { const P = S.profile; if (!P.weightKg || !P.age || !P.heightCm) return 'Starting points you can tune any time.'; return `You burn about ${sg.tdee.toLocaleString()} kcal a day. ${P.goal === 'cut' ? 'A ~450 kcal deficit loses roughly 0.4 kg a week.' : P.goal === 'bulk' ? 'A ~300 kcal surplus builds muscle without much fat.' : 'Eating around that holds your weight.'}`; }
function collect() {
  const s = STEPS[OB.i], P = S.profile;
  if (s === 'name') { P.name = ($('#obn').value || '').trim(); }
  if (s === 'body') {
    const lb = P.units === 'lb'; P.age = nint($('#oba').value);
    const hv = ($('#obh').value || '').trim(); if (lb) { const [ft, inch] = hv.split(/[.' ]+/).map(Number); P.heightCm = ft ? Math.round((ft * 12 + (inch || 0)) * 2.54) : 0; } else P.heightCm = nint(hv);
    const wv = num($('#obw').value); P.weightKg = lb ? Math.round((wv / 2.2046) * 10) / 10 : wv; P.activity = $('#obact').value;
    if (!OB.keep) { const sg = suggestTargets(P); Object.assign(S.targets, { cal: sg.cal, pro: sg.pro, carb: sg.carb, fat: sg.fat, water: sg.water }); }
  }
  if (s === 'targets') { const t = ($('#obai') || {}).value; if (t != null) OB.ai = t; }
  if (s === 'training') { if (OB.prog && PROGRAMS[OB.prog] && !OB.progApplied) { applyProgram(OB.prog); OB.progApplied = true; } }
  if (s === 'ai') { const k = ($('#obkey').value || '').trim(); if (k && k !== gemKey()) setGemKey(k); }
  save(); return true;
}
A.obGoal = id => { const g = S.profile.goals = S.profile.goals || []; const i = g.indexOf(id); if (i >= 0) g.splice(i, 1); else g.push(id);
  S.profile.goal = g.includes('fat') ? 'cut' : g.includes('muscle') ? 'bulk' : 'maintain';
  if (g.includes('fat') || g.includes('eat')) S.modules.food = true; if (g.includes('muscle') || g.includes('strength')) S.modules.train = true; draw(); };
A.obMod = id => { S.modules[id] = !S.modules[id]; draw(); };
A.obUnit = u => { collectBodySoft(); S.profile.units = u; draw(); };
A.obSex = v => { collectBodySoft(); S.profile.sex = v; draw(); };
A.obMode = v => { collectBodySoft(); S.profile.goal = v; draw(); };
function collectBodySoft() { try { const P = S.profile, lb = P.units === 'lb'; P.age = nint($('#oba').value) || P.age; const hv = ($('#obh').value || '').trim(); if (hv) { if (lb) { const [ft, inch] = hv.split(/[.' ]+/).map(Number); P.heightCm = Math.round((ft * 12 + (inch || 0)) * 2.54); } else P.heightCm = nint(hv); } const wv = num($('#obw').value); if (wv) P.weightKg = lb ? Math.round((wv / 2.2046) * 10) / 10 : wv; P.activity = $('#obact').value; } catch (e) {} }
A.obSkipBody = () => { go(1); };
CH.obT = el => { S.targets[el.dataset.k] = nint(el.value); save(); };
A.obAI = async () => {
  const t = ($('#obai').value || '').trim(); if (!t) { toast('Tell the AI a little about you first'); return; }
  OB.ai = t; OB.busy = true; draw();
  try {
    const r = await planFromText(t, { name: S.profile.name, sex: S.profile.sex, age: S.profile.age, heightCm: S.profile.heightCm, weightKg: S.profile.weightKg, activity: S.profile.activity, goals: S.profile.goals, modules: S.modules });
    OB.plan = r;
    if (r.targets) Object.keys(S.targets).forEach(k => { if (+r.targets[k] > 0) S.targets[k] = Math.round(+r.targets[k]); });
    if (['cut', 'maintain', 'bulk'].includes(r.goal)) S.profile.goal = r.goal;
    if (r.modules) Object.keys(S.modules).forEach(k => { if (typeof r.modules[k] === 'boolean') S.modules[k] = r.modules[k]; });
    (r.supps || []).forEach(n => { if (n && !S.supps.some(x => x.name.toLowerCase() === String(n).toLowerCase())) S.supps.push({ id: uid(), name: String(n), dose: '' }); });
    if (S.supps.length) S.modules.supps = true;
    if ((r.routines || []).length) { r.routines.forEach(rt => { const id = uid(); S.routines.push({ id, name: rt.name || 'Workout', ex: (rt.ex || []).map(e => ({ name: (findEx(e.name, S.customEx) || {}).n || e.name, sets: +e.sets || 3, reps: String(e.reps || '8–12'), note: '' })) }); if (rt.day >= 0 && rt.day <= 6) S.plan[rt.day] = id; }); OB.prog = 'ai'; S.modules.train = true; }
    save(); toast('Plan built. Tweak anything below');
  } catch (e) { toast(errMsg(e)); }
  OB.busy = false; draw();
};
A.obProg = id => { OB.prog = id; draw(); };
let OBF = [];
A.obImpPics = async () => { OBF = await pickFiles('image/*', true); toast(OBF.length + ' screenshot' + (OBF.length === 1 ? '' : 's') + ' attached'); };
A.obImp = async () => {
  const { importWorkouts } = await import('../ai.js');
  const t = ($('#obimp') || {}).value || ''; if (!t.trim() && !OBF.length) { toast('Paste your plan or add screenshots'); return; }
  OB.busy = true; const out = $('#obimpout'); out.innerHTML = '<div class="thinking"><span class="spin"></span>Reading…</div>';
  try { const r = await importWorkouts(t, OBF); (r.routines || []).forEach(rt => { const id = uid(); S.routines.push({ id, name: rt.name || 'Workout', ex: (rt.ex || []).map(e => ({ name: (findEx(e.name, S.customEx) || {}).n || e.name, sets: +e.sets || 3, reps: String(e.reps || '8–12'), note: '' })) }); if (rt.day >= 0 && rt.day <= 6) S.plan[rt.day] = id; }); save(); OB.busy = false; OB.prog = 'imported'; draw(); toast(`${(r.routines || []).length} routines imported`); }
  catch (e) { OB.busy = false; out.innerHTML = `<div class="err mt">${esc(errMsg(e))}</div>`; }
};
A.obSupp = n => { const i = S.supps.findIndex(x => x.name === n); if (i >= 0) S.supps.splice(i, 1); else S.supps.push({ id: n === 'Creatine' ? 'creatine' : uid(), name: n, dose: { Creatine: '5 g', 'Vitamin D': '1000 IU' }[n] || '' }); draw(); };
A.obSuppAdd = () => { const n = ($('#obsx').value || '').trim(); if (n) { S.supps.push({ id: uid(), name: n, dose: '' }); draw(); } };
A.obSoc = v => { S.profile.social = v; draw(); };
A.obKey = async () => { const k = ($('#obkey').value || '').trim(); const out = $('#obkeyout'); if (!k) return; out.innerHTML = '<div class="thinking"><span class="spin"></span>Testing…</div>'; try { await testKey(k); out.innerHTML = `<div class="note mt" style="color:var(--win)">${I.check.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"')} Key works. AI is on.</div>`; } catch (e) { out.innerHTML = `<div class="err mt">${esc(errMsg(e))}</div>`; } };
A.obNextNoKey = () => { go(1); };
A.obFinish = () => {
  S.onboarded = true; S.profile.start = S.profile.start && S.profile.start <= todayK() ? S.profile.start : todayK();
  if (!S.supps.length) S.modules.supps = false;
  save(); $('#onboard').hidden = true; confetti(100); render();
};
A.obV1 = () => {
  const o = readV1(); if (!o) { toast('Couldn’t read the old data'); return; }
  const n = migrateV1(o, n2 => { const x = findEx(n2); return x ? { m: x.p[0] } : null; });
  n.profile.goals = []; n.profile.social = 'solo';
  replaceState(n); OB.keep = true;
  const days = Object.keys(S.days).length;
  toast(`Brought in ${days} days, ${S.routines.length} routines`);
  OB.i = 1; draw();
};
A.obRestore = async () => {
  const [f] = await pickFiles('application/json,.json'); if (!f) return;
  try { const j = JSON.parse(await f.text()); const st = j.form2 ? j.state : j.form && j.state ? migrateV1(j.state, n2 => { const x = findEx(n2); return x ? { m: x.p[0] } : null; }) : j.v === 2 ? j : null; if (!st) throw 0; replaceState(normalize(st)); S.onboarded = true; save(); $('#onboard').hidden = true; render(); toast('Backup restored'); }
  catch (e) { toast('That file isn’t a Stack backup'); }
};
