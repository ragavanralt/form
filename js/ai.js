// AI layer. Uses the user's own free Gemini key (kept on this device only, same key slot as Form v1),
// or built-in Claude when the page runs inside Claude. Every call asks for strict JSON.
const GEM_KEY = 'form-gemini', GEM_MODEL = 'form-gemini-model2';
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
const ls = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} } };

const AI = { claude: null, photo: false };
export async function initAI() {
  try { if (window.claude && typeof window.claude.use === 'function') { const s = await window.claude.use('sample'); if (s) { AI.claude = s; try { const l = await s.limits(); AI.photo = !!(l && l.images); } catch (e) {} } } } catch (e) {}
}
export const gemKey = () => ls.get(GEM_KEY);
export const setGemKey = v => ls.set(GEM_KEY, v.trim());
export const aiOn = () => !!(AI.claude || gemKey());
export const aiLabel = () => (AI.claude ? 'Built-in Claude' : gemKey() ? 'Gemini (your key, on this device)' : 'Off');

export function errMsg(e) {
  const c = (e && e.code) || '';
  return ({ gem_key: 'Gemini didn’t accept that key. Check it in Settings → AI.', nokey: 'Turn on AI in Settings with a free Gemini key.', offline: 'You’re offline. Try again when you’re connected.', busy: 'The AI is busy right now. Try again in a minute.', rate: 'Too many requests in a row. Give it a minute.' + (e.detail ? ' (' + e.detail + ')' : ''), image: 'That photo couldn’t be read. Try another.', json: 'The AI answered in a strange format. Try again.', cancelled: 'Cancelled.' })[c] || 'Something went wrong with the AI. Try again.';
}

async function toJpegB64(file, max = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.naturalWidth * s)); cv.height = Math.max(1, Math.round(img.naturalHeight * s));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.84).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}
export function extractJSON(raw) {
  let t = String(raw || '').trim().replace(/^﻿/, '').replace(/[“”]/g, '"');
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1].trim();
  const s = t.search(/[\[{]/); if (s < 0) throw { code: 'json' }; t = t.slice(s);
  try { return JSON.parse(t); } catch (e) {}
  const e2 = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (e2 > 0) { try { return JSON.parse(t.slice(0, e2 + 1)); } catch (e) {} }
  throw { code: 'json' };
}

async function gemini(prompt, files, signal, maxTok = 2048) {
  const key = gemKey(); if (!key) throw { code: 'nokey' };
  if (navigator.onLine === false) throw { code: 'offline' };
  const parts = [{ text: prompt }];
  for (const f of files || []) { try { parts.push({ inline_data: { mime_type: 'image/jpeg', data: await toJpegB64(f) } }); } catch (e) { throw { code: 'image' }; } }
  let models = MODELS.slice(); const pref = ls.get(GEM_MODEL); if (pref && MODELS.includes(pref)) models = [pref, ...models.filter(m => m !== pref)];
  const deadline = Date.now() + 60000, wait = ms => new Promise(r => setTimeout(r, ms));
  const stop = () => { if (signal && signal.aborted) throw { code: 'cancelled' }; };
  const think = m => (/^gemini-2\.5/.test(m) ? { thinkingConfig: { thinkingBudget: 0 } } : { thinkingConfig: { thinkingLevel: 'minimal' } });
  const call = async (m, th) => {
    stop(); const ctl = new AbortController(); const fwd = () => ctl.abort(); if (signal) signal.addEventListener('abort', fwd, { once: true });
    const to = setTimeout(() => ctl.abort(), 30000);
    try {
      return await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: Object.assign({ temperature: 0.2, maxOutputTokens: maxTok, responseMimeType: 'application/json' }, th ? think(m) : {}) }),
      });
    } catch (e) { stop(); return null; } finally { clearTimeout(to); if (signal) signal.removeEventListener('abort', fwd); }
  };
  let last = null;
  for (const m of models) {
    if (Date.now() > deadline) break;
    for (let a = 0; a < 2 && Date.now() < deadline; a++) {
      let res = await call(m, true);
      if (res && res.status === 400) { const b = await res.text().catch(() => ''); if (/api[_ ]?key/i.test(b)) throw { code: 'gem_key' }; res = await call(m, false); }
      if (!res) { if (navigator.onLine === false) throw { code: 'offline' }; last = { code: 'busy' }; await wait(700 * (a + 1)); continue; }
      if (res.status === 404) { last = last || { code: 'busy' }; break; }
      if (res.status === 429) { let dm = ''; try { dm = String((JSON.parse(await res.text()).error || {}).message || '').slice(0, 140); } catch (e) {} last = { code: 'rate', detail: dm }; break; }
      if (res.status >= 500) { last = { code: 'busy' }; await wait(700 * (a + 1)); continue; }
      if (!res.ok) { const b = await res.text().catch(() => ''); throw { code: res.status === 401 || res.status === 403 || /api[_ ]?key/i.test(b) ? 'gem_key' : 'busy' }; }
      let j; try { j = await res.json(); } catch (e) { last = { code: 'busy' }; continue; }
      const txt = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(x => x.text || '').join('');
      if (!txt) { last = { code: 'json' }; break; }
      const out = extractJSON(txt); ls.set(GEM_MODEL, m); return out;
    }
  }
  throw last || { code: 'busy' };
}
export async function askJSON(prompt, files = [], signal, maxTok) {
  if (AI.claude) {
    const o = { modelTier: 'default', effort: 'low', signal }; if (files.length && AI.photo) o.images = files;
    try { const r = await AI.claude.json(prompt, o); return typeof r === 'string' ? extractJSON(r) : r; } catch (e) { if (!gemKey()) throw { code: e && e.code === 'rate_limited' ? 'rate' : 'busy' }; }
  }
  return gemini(prompt, files, signal, maxTok);
}
export async function testKey(k) { const old = gemKey(); setGemKey(k); try { await gemini('Reply with only this JSON: {"ok":true}', [], null, 50); return true; } catch (e) { setGemKey(old); throw e; } }

/* ---------- food ---------- */
const FOOD_SCHEMA = `Return JSON only, shaped exactly like:
{"seen":"one or two sentences on what you can see, the portion sizes you assumed and why",
 "items":[{"name":"short food name","emoji":"one emoji","grams":0,"cal":0,"p":0,"c":0,"f":0,"confidence":0.0,"box":[ymin,xmin,ymax,xmax],"why":"how you sized it, e.g. palm-sized fillet about 150 g"}],
 "meal_type":"breakfast|lunch|dinner|snack",
 "tips":["specific ways the user could make this estimate more accurate next time"],
 "question":{"q":"one short follow-up question that would change the numbers most, or empty","options":["2 to 4 short answers"]}}
Rules: cal in kcal, p/c/f in grams, all integers except confidence (0 to 1). box is the bounding box of the item in the photo on a 0 to 1000 scale, or [] when there is no photo or the item is not visible (like oil, a drink out of frame or a sauce mixed in).
Count hidden calories (cooking oil, butter, dressing, sauces) as their own line item when they are likely. Use typical restaurant or packaged values when a brand is named or visible.
Sizing: compare with plates (about 26 cm), forks, hands, cans and packaging. Lower confidence when the depth, the oil or what is under the top layer can’t be seen.`;
export async function foodPhoto(files, note, signal) {
  return askJSON(`You are a precise nutrition estimator like a dietitian looking at a meal photo. Identify each separate food in the photo and estimate its portion and macros.
${note ? 'The user says: "' + note + '". Trust this over what you see when they conflict.\n' : ''}${FOOD_SCHEMA}`, files, signal, 2500);
}
export async function foodText(text, signal) {
  return askJSON(`You are a precise nutrition estimator. The user ate: "${text}". Split it into separate items with realistic portions (use the amounts they give; otherwise typical servings).
${FOOD_SCHEMA}`, [], signal, 2000);
}
export async function foodRefine(prev, answer, files, signal) {
  return askJSON(`You estimated this meal earlier: ${JSON.stringify({ items: prev.items, seen: prev.seen })}
You asked: "${prev.question && prev.question.q}". The user answered: "${answer}". Update the estimate with that answer.
${FOOD_SCHEMA}`, files || [], signal, 2500);
}

/* ---------- onboarding and plans ---------- */
export async function planFromText(text, profile, signal) {
  return askJSON(`You are a friendly, evidence-based fitness coach setting up a tracking app for a new user.
Profile: ${JSON.stringify(profile)}. They describe themselves and their goals: "${text}".
Return JSON only:
{"summary":"two sentences, plain language, what the plan is and why",
 "goal":"cut|maintain|bulk",
 "targets":{"cal":0,"pro":0,"carb":0,"fat":0,"steps":0,"water":0,"cardio":0},
 "modules":{"food":true,"train":true,"cardio":true,"steps":true,"water":true,"supps":false,"weight":true},
 "supps":["names of supplements they mention taking"],
 "days_per_week":0,
 "routines":[{"name":"Upper","day":1,"ex":[{"name":"Lat Pulldown","sets":3,"reps":"8–12"}]}],
 "tips":["three short, specific tips"]}
Rules: water in ml, cardio in minutes per day. day is 0=Sunday to 6=Saturday. Use common gym exercise names. Only include routines if they train with weights. Keep targets realistic and safe.`, [], signal, 3000);
}
export async function importWorkouts(text, files, signal) {
  return askJSON(`Read this workout plan or workout log${files && files.length ? ' (from the attached screenshots)' : ''} and turn it into structured data.
${text ? 'Text:\n"""' + text.slice(0, 12000) + '"""' : ''}
Return JSON only:
{"routines":[{"name":"Push","day":-1,"ex":[{"name":"Incline Dumbbell Press","sets":3,"reps":"6–10","note":""}]}],
 "sessions":[{"date":"YYYY-MM-DD","name":"Push","ex":[{"name":"Incline Dumbbell Press","sets":[{"w":30,"r":8}]}]}],
 "unit":"kg|lb",
 "notes":"anything you could not read"}
day is 0=Sunday..6=Saturday or -1 when not given. Use standard exercise names (e.g. "Lat Pulldown", "Romanian Deadlift"). sessions are only for past dated logs with weights and reps; leave it empty for a plan.`, files || [], signal, 6000);
}
export async function coachNote(summary, signal) {
  return askJSON(`You are a sharp, encouraging coach. Here is the user's last 7 days as data: ${JSON.stringify(summary)}.
Return JSON only: {"headline":"max 8 words","body":"2 to 3 sentences with one concrete insight from the numbers and one specific thing to do this week. No fluff, no emojis."}`, [], signal, 600);
}
