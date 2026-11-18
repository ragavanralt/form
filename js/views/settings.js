// Settings: profile, modules, targets, appearance, AI, friends and privacy, reminders, data.
import { S, save, touch, render, replaceState, hasV1, readV1, KEY } from '../store.js';
import { MODULES, ACTIVITY, suggestTargets, weights, PART, esc, fmt, nint, num, todayK, migrateV1, normalize, freshState, addDays, pdk } from '../core.js';
import { A, CH, I, $, openSheet, setSheet, closeSheet, toast, toggle, download, pickFiles, avatar, AV_EMO, AV_BG } from '../ui.js';
import { aiLabel, gemKey, setGemKey, testKey, errMsg } from '../ai.js';
import { Social, socialErr } from '../social.js';
import { socialSignOut, socialDelete, syncStats } from './friends.js';
import { findEx } from '../exercises.js';

export function applyTheme() {
  const r = document.documentElement, th = S.settings.theme;
  const dark = th === 'dark' || (th === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  r.dataset.theme = dark ? 'dark' : 'light'; r.dataset.acc = S.settings.accent || 'violet';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#09090b' : '#f3f3f6';
}
const ACC = [['violet', '#7c5cff'], ['blue', '#3b82f6'], ['teal', '#14b8a6'], ['lime', '#a3e635'], ['orange', '#ff6b35'], ['pink', '#ec4899'], ['mono', '#9a9aa3']];
const row = (act, ic, c, t, s, r = `<span class="chev">${I.chev}</span>`, arg = '') => `<button class="li" data-act="${act}" data-arg="${arg}"><span class="ic c-${c}">${ic}</span><span><span class="t">${t}</span>${s ? `<span class="s">${s}</span>` : ''}</span>${r}</button>`;

A.settings = () => {
  const P = S.profile, me = Social.auth && Social.auth.me;
  openSheet('settings', 'Settings', `<button class="card tight row" data-act="setProfile" style="width:100%;text-align:left;gap:12px">${avatar(me ? me.avatar : P.avatar || {}, 'md', P.name)}<span class="grow"><b style="display:block">${esc(P.name || 'Your profile')}</b><span class="faint small">${me ? '@' + esc(me.handle) + ' · ' : ''}${{ cut: 'Losing fat', maintain: 'Maintaining', bulk: 'Building muscle' }[P.goal]}</span></span><span class="chev">${I.chev}</span></button>
  <div class="sec"><div class="lab">Your app</div><div class="card tight"><div class="list">
    ${row('setModules', I.list, 'accent', 'What I track', MODULES.filter(m => S.modules[m.id]).map(m => m.n).join(', '))}
    ${row('setTargets', I.target, 'food', 'Targets', `${fmt(S.targets.cal)} kcal · ${S.targets.pro} g protein`)}
    ${row('setScore', I.chart, 'train', 'How scoring works', 'What each part is worth')}
    ${row('setLook', I.moon, 'habit', 'Appearance', { system: 'Match system', dark: 'Dark', light: 'Light' }[S.settings.theme] + ' · ' + S.settings.accent)}
  </div></div></div>
  <div class="sec"><div class="lab">Smart features</div><div class="card tight"><div class="list">
    ${row('setAI', I.spark, 'accent', 'AI', aiLabel())}
    ${row('setFriends', I.users, 'move', 'Friends and privacy', Social.on ? 'Signed in as @' + esc(me.handle) : 'Not signed in')}
    ${row('setRemind', I.bell, 'water', 'Reminders', S.settings.remind.on ? 'On, in your calendar' : 'Off')}
    ${row('setTraining', I.dumb, 'train', 'Workout settings', S.settings.rest + ' s rest · ' + P.units)}
  </div></div></div>
  <div class="sec"><div class="lab">Data</div><div class="card tight"><div class="list">
    ${row('exportData', I.upload, 'habit', 'Back up', 'Download everything as a file')}
    ${row('importData', I.copy, 'habit', 'Restore or import', 'A Form backup, or the old Form app')}
    ${row('resetApp', I.trash, 'pro', 'Start over', 'Wipe this phone and run setup again', '')}
  </div></div></div>
  <p class="faint tiny center mt">Form 2 · Your log lives on this phone. Friends see only what you share.<br><a class="link" href="classic/">Open Form Classic</a></p>`, { full: true });
};

/* ---------- profile ---------- */
A.setProfile = () => {
  const P = S.profile, a = P.avatar = P.avatar || { e: AV_EMO[0], bg: 0 };
  openSheet('prof', 'Profile', `<div class="center">${avatar(a, 'lg', P.name)}</div><div class="avpick mt">${AV_EMO.map(e => `<button class="${a.e === e ? 'on' : ''}" data-act="pAv" data-arg="${e}">${e}</button>`).join('')}</div><div class="swatches mt" style="justify-content:center">${AV_BG.map((b, i) => `<button style="background:${b}" class="${a.bg === i ? 'on' : ''}" data-act="pBg" data-arg="${i}" aria-label="Colour"></button>`).join('')}</div>
  <div class="field mt2"><span>Name</span><input value="${esc(P.name)}" data-ch="pName"></div>
  <div class="field mt"><span>Goal</span><div class="seg">${[['cut', 'Lose fat'], ['maintain', 'Maintain'], ['bulk', 'Gain']].map(([k, l]) => `<button class="${P.goal === k ? 'on' : ''}" data-act="pGoal" data-arg="${k}">${l}</button>`).join('')}</div></div>
  <div class="g3 mt"><label class="field"><span>Age</span><input type="number" value="${P.age || ''}" data-ch="pNum" data-k="age"></label><label class="field"><span>Height cm</span><input type="number" value="${P.heightCm || ''}" data-ch="pNum" data-k="heightCm"></label><label class="field"><span>Weight kg</span><input type="number" step="0.1" value="${P.weightKg || ''}" data-ch="pNum" data-k="weightKg"></label></div>
  <div class="field mt"><span>Activity</span><select data-ch="pAct">${ACTIVITY.map(([k, l]) => `<option value="${k}" ${P.activity === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <button class="btn wide mt2" data-act="settings">Done</button>`);
};
A.pAv = e => { S.profile.avatar.e = e; save(); A.setProfile(); syncStats(true); };
A.pBg = i => { S.profile.avatar.bg = +i; save(); A.setProfile(); syncStats(true); };
A.pGoal = g => { S.profile.goal = g; touch(); A.setProfile(); render(); };
CH.pName = el => { S.profile.name = el.value; save(); };
CH.pNum = el => { S.profile[el.dataset.k] = num(el.value); save(); };
CH.pAct = el => { S.profile.activity = el.value; save(); };

/* ---------- modules ---------- */
A.setModules = () => openSheet('mods', 'What I track', `<p class="muted small" style="margin-top:-6px">Turn things off and the rest of your score rebalances to 100.</p><div class="list">${MODULES.map(m => `<div class="li noic"><span><span class="t">${m.n}</span><span class="s">${m.d}</span></span>${toggle('modT', S.modules[m.id], m.id)}</div>`).join('')}</div><button class="btn wide mt2" data-act="settings">Done</button>`);
A.modT = id => { S.modules[id] = !S.modules[id]; if (id === 'supps' && S.modules.supps && !S.supps.length) S.supps.push({ id: 'creatine', name: 'Creatine', dose: '5 g' }); touch(); A.setModules(); render(); };

/* ---------- targets ---------- */
A.setTargets = () => {
  const T = S.targets, sg = suggestTargets(S.profile);
  const r = (k, n, u, note) => `<div class="tgt"><span><b>${n}</b>${note ? `<span>${note}</span>` : ''}</span><div class="unit"><input type="number" inputmode="numeric" value="${T[k]}" data-ch="tSet" data-k="${k}"><i>${u}</i></div></div>`;
  openSheet('tg', 'Targets', `<div class="card tight">${r('cal', 'Calories', 'kcal', sg.tdee ? 'Suggested ' + fmt(sg.cal) : '')}${r('pro', 'Protein', 'g', sg.tdee ? 'Suggested ' + sg.pro : '')}${r('carb', 'Carbs', 'g')}${r('fat', 'Fat', 'g')}${r('steps', 'Steps', '')}${r('cardio', 'Cardio', 'min')}${r('water', 'Water', 'ml')}</div>
  ${sg.tdee ? `<button class="btn ghost wide mt" data-act="tSuggest">Use suggested (${fmt(sg.cal)} kcal, ${sg.pro} g)</button>` : '<p class="faint small mt">Add your age, height and weight in Profile for suggestions.</p>'}<button class="btn wide mt" data-act="settings">Done</button>`);
};
CH.tSet = el => { S.targets[el.dataset.k] = nint(el.value); touch(); render(); };
A.tSuggest = () => { const sg = suggestTargets(S.profile); Object.assign(S.targets, { cal: sg.cal, pro: sg.pro, carb: sg.carb, fat: sg.fat }); touch(); A.setTargets(); render(); };
A.setScore = () => { const w = weights(S); openSheet('sc', 'How scoring works', `<p class="muted" style="margin-top:-6px">Each day is scored out of 100 from the things you track. <b style="color:var(--ink)">70+ is a win</b>, 45+ keeps your streak alive.</p><div class="card tight"><div class="list">${Object.entries(w).map(([k, v]) => `<div class="li noic"><span><span class="t">${PART[k].n}</span><span class="s">${{ cal: S.profile.goal === 'cut' ? 'Full points from 600 under your goal to 100 over' : S.profile.goal === 'bulk' ? 'Full points from 100 under to anything over' : 'Full points within 150 of your goal', pro: 'Full at your goal, scales up from 30%', train: 'Finish the planned workout. Rest days count', cardio: 'Scales up to your daily minutes', steps: 'Scales up to your step goal', water: 'Scales up to your water goal', supps: 'Share of your stack taken' }[k]}</span></span><span class="r b">${Math.round(v)}</span></div>`).join('')}</div></div><button class="btn wide mt2" data-act="settings">Done</button>`); };

/* ---------- look ---------- */
A.setLook = () => openSheet('look', 'Appearance', `<div class="lab faint small b">THEME</div><div class="seg mt">${[['system', 'System'], ['dark', 'Dark'], ['light', 'Light']].map(([k, l]) => `<button class="${S.settings.theme === k ? 'on' : ''}" data-act="lkTheme" data-arg="${k}">${l}</button>`).join('')}</div>
  <div class="lab faint small b mt2">ACCENT</div><div class="swatches mt">${ACC.map(([k, c]) => `<button style="background:${c}" class="${S.settings.accent === k ? 'on' : ''}" data-act="lkAcc" data-arg="${k}" aria-label="${k}"></button>`).join('')}</div><button class="btn wide mt2" data-act="settings">Done</button>`);
A.lkTheme = t => { S.settings.theme = t; save(); applyTheme(); A.setLook(); };
A.lkAcc = a => { S.settings.accent = a; save(); applyTheme(); A.setLook(); render(); };

/* ---------- AI ---------- */
A.setAI = () => openSheet('ai', 'AI', `<p class="muted small" style="margin-top:-6px">Powers photo logging, meal descriptions, plan building, workout import and coaching. Uses your own free Google Gemini key, stored only on this phone.</p>
  <div class="card tight"><div class="li noic" style="padding-top:2px"><span><span class="t">Status</span></span><span class="r">${aiLabel()}</span></div></div>
  <ol class="muted small" style="padding-left:18px;display:grid;gap:5px"><li>Go to <a class="link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com/app/apikey</a></li><li>Create an API key and copy it</li><li>Paste it below and test</li></ol>
  <input id="aikey" type="password" placeholder="Gemini API key" value="${esc(gemKey())}" autocomplete="off"><div id="aiout"></div>
  <div class="row mt"><button class="btn grow" data-act="aiSave">Test and save</button>${gemKey() ? `<button class="btn ghost" data-act="aiClear">Remove</button>` : ''}</div>`);
A.aiSave = async (a, btn) => { const k = $('#aikey').value.trim(); if (!k) return; btn.disabled = true; $('#aiout').innerHTML = '<div class="thinking"><span class="spin"></span>Testing…</div>'; try { await testKey(k); toast('AI is on'); A.setAI(); } catch (e) { btn.disabled = false; $('#aiout').innerHTML = `<div class="err">${esc(errMsg(e))}</div>`; } };
A.aiClear = () => { setGemKey(''); A.setAI(); render(); };

/* ---------- friends + privacy ---------- */
A.setFriends = () => {
  const sh = S.settings.share;
  openSheet('fp', 'Friends and privacy', `${Social.on ? `<div class="card tight row" style="gap:12px">${avatar(Social.auth.me.avatar, 'md', Social.auth.me.display)}<span class="grow"><b style="display:block">${esc(Social.auth.me.display)}</b><span class="faint small">@${esc(Social.auth.me.handle)}</span></span></div>` : `<div class="note">Not signed in. <button class="link" data-act="go" data-arg="friends">Set up friends</button></div>`}
  <div class="sec"><div class="lab">What friends can see</div><div class="card tight"><div class="list">${[['scores', 'Day scores and streak', 'Powers the league and head to head'], ['workouts', 'Workouts', 'Name, time, volume, muscles'], ['prs', 'Personal records', 'Shown on your workout posts']].map(([k, t, s]) => `<div class="li noic"><span><span class="t">${t}</span><span class="s">${s}</span></span>${toggle('shareT', sh[k], k)}</div>`).join('')}</div></div><p class="faint small">Meals, photos and body weight are never shared.</p></div>
  ${Social.on ? `<div class="sec"><div class="row"><button class="btn ghost grow" data-act="sOut">Sign out</button><button class="btn danger grow" data-act="sDel">Delete account</button></div></div>` : ''}`);
};
A.shareT = k => { S.settings.share[k] = !S.settings.share[k]; save(); A.setFriends(); syncStats(true); };
A.sOut = async () => { await socialSignOut(); toast('Signed out'); A.setFriends(); };
A.sDel = async () => { if (!confirm('Delete your friends profile, posts and reactions from the server? Your log on this phone stays.')) return; try { await socialDelete(); toast('Account deleted'); A.setFriends(); } catch (e) { toast(socialErr(e)); } };

/* ---------- reminders (calendar file: iPhone web apps can't schedule notifications) ---------- */
A.setRemind = () => { const R2 = S.settings.remind; openSheet('rem', 'Reminders', `<p class="muted small" style="margin-top:-6px">Web apps on iPhone can’t schedule their own alerts yet, so Form adds them to your Calendar instead. Download once, tap Add All.</p>
  <div class="card tight"><div class="list">${[['morning', 'Morning check-in', 'Plan the day and log breakfast'], ['gym', 'Training days', 'On days you have a workout'], ['evening', 'Close out', 'Log what’s left and see your score']].map(([k, t, s]) => `<div class="li noic"><span><span class="t">${t}</span><span class="s">${s}</span></span><input type="time" value="${R2[k]}" data-ch="remT" data-k="${k}" style="width:118px;padding:8px"></div>`).join('')}</div></div>
  <button class="btn wide mt2" data-act="remDl">${I.calendar} Add to Calendar</button><p class="faint small center">Change the times, then add again. Delete the old ones from Calendar.</p>`); };
CH.remT = el => { S.settings.remind[el.dataset.k] = el.value; save(); };
A.remDl = () => {
  const R2 = S.settings.remind, stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'), t = todayK().replace(/-/g, ''), ev = [];
  const add = (id, hm, title, desc, rule) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); if (!m) return; ev.push(['BEGIN:VEVENT', `UID:form2-${id}-${t}@form`, 'DTSTAMP:' + stamp, `DTSTART:${t}T${m[1].padStart(2, '0')}${m[2]}00`, 'DURATION:PT10M', 'RRULE:' + rule, 'SUMMARY:' + title, 'DESCRIPTION:' + desc, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + title, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n')); };
  add('am', R2.morning, 'Form: plan your day', 'Open Form and check your next best move.', 'FREQ=DAILY');
  add('pm', R2.evening, 'Form: close out the day', 'Log what’s left and see your score.', 'FREQ=DAILY');
  const days = Object.entries(S.plan).filter(([, v]) => v !== 'rest').map(([d]) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d]);
  if (days.length) add('gym', R2.gym, 'Form: training day', 'Your workout is planned for today.', 'FREQ=WEEKLY;BYDAY=' + days.join(','));
  S.settings.remind.on = true; save();
  download('form-reminders.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Form//Reminders//EN', 'X-WR-CALNAME:Form', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n', 'text/calendar');
};

/* ---------- workout settings ---------- */
A.setTraining = () => openSheet('trs', 'Workout settings', `<div class="field"><span>Default rest</span><div class="seg">${[60, 90, 120, 180].map(v => `<button class="${S.settings.rest === v ? 'on' : ''}" data-act="trRest" data-arg="${v}">${v < 120 ? v + ' s' : v / 60 + ' min'}</button>`).join('')}</div></div>
  <div class="field mt"><span>Units</span><div class="seg">${['kg', 'lb'].map(u => `<button class="${S.profile.units === u ? 'on' : ''}" data-act="trUnit" data-arg="${u}">${u}</button>`).join('')}</div></div>
  <div class="li noic mt"><span><span class="t">Rest timer sound</span></span>${toggle('trSound', S.settings.sound)}</div><button class="btn wide mt2" data-act="settings">Done</button>`);
A.trRest = v => { S.settings.rest = +v; save(); A.setTraining(); };
A.trUnit = u => { S.profile.units = u; save(); A.setTraining(); render(); };
A.trSound = () => { S.settings.sound = !S.settings.sound; save(); A.setTraining(); };

/* ---------- data ---------- */
A.exportData = () => { download(`form-backup-${todayK()}.json`, JSON.stringify({ form2: true, at: new Date().toISOString(), state: S })); toast('Backup downloaded'); };
A.importData = () => openSheet('imp', 'Restore or import', `<div class="col">${hasV1() ? `<button class="rt" data-act="impV1"><span><b>Bring in data from Form Classic</b><span class="faint small" style="display:block">Found on this phone. Days, workouts, routines and foods.</span></span><span class="chev">${I.chev}</span></button>` : ''}<button class="rt" data-act="impFile"><span><b>Restore a backup file</b><span class="faint small" style="display:block">A Form 2 backup, or a Form Classic export (.json)</span></span><span class="chev">${I.chev}</span></button></div>`);
function mergeDays(n) { let c = 0; Object.entries(n.days).forEach(([k, d]) => { const cur = S.days[k]; if (!cur || (!cur.meals.length && !cur.wo)) { S.days[k] = d; c++; } }); n.routines.forEach(r => { if (!S.routines.some(x => x.name === r.name)) S.routines.push(r); }); if (n.profile.start < S.profile.start) S.profile.start = n.profile.start; S.foods.fav = [...S.foods.fav, ...n.foods.fav].slice(0, 80); return c; }
const fx = n2 => { const x = findEx(n2); return x ? { m: x.p[0] } : null; };
A.impV1 = () => { const o = readV1(); if (!o) return; const n = migrateV1(o, fx); const c = mergeDays(n); touch(); closeSheet(); render(); toast(`Imported ${c} days from Form Classic`); };
A.impFile = async () => { const [f] = await pickFiles('application/json,.json'); if (!f) return; try { const j = JSON.parse(await f.text()); if (j.form2 && j.state) { if (!confirm('Replace everything on this phone with this backup?')) return; replaceState(j.state); S.onboarded = true; save(); } else if (j.form && j.state) { const c = mergeDays(migrateV1(j.state, fx)); touch(); toast(`Imported ${c} days`); } else throw 0; closeSheet(); render(); } catch (e) { toast('That isn’t a Form backup'); } };
A.resetApp = () => { if (!confirm('Erase everything on this phone and start setup again? Download a backup first if you want to keep it.')) return; localStorage.removeItem(KEY); location.reload(); };
