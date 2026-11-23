// Reads any backup this app (or its older versions) ever made, from a file or pasted text.
// Pure: no DOM, so it can be tested in node.
import { migrateV1, normalize, uid } from './core.js';

const isDay = k => /^\d{4}-\d{2}-\d{2}$/.test(k);
const n0 = v => Math.max(0, Math.round(+v || 0));

// Pull JSON out of text that may carry a BOM, smart quotes, a code fence or chatter around it.
export function extractJSON(raw) {
  let t = String(raw || '').trim().replace(/^﻿/, '');
  if (!t) return null;
  try { return JSON.parse(t); } catch (e) {}
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1].trim();
  const s = t.search(/[[{]/); if (s < 0) return null;
  t = t.slice(s);
  try { return JSON.parse(t); } catch (e) {}
  const e = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (e > 0) { try { return JSON.parse(t.slice(0, e + 1)); } catch (e2) {} }
  return null;
}

const food = m => ({ id: uid(), name: String(m.name || 'Food'), emoji: m.emoji || '', type: ['breakfast', 'lunch', 'dinner', 'snack'].includes(String(m.type || m.mealType || '').toLowerCase()) ? String(m.type || m.mealType).toLowerCase() : 'snack', cal: n0(m.cal), p: n0(m.p), c: n0(m.c), f: n0(m.f), t: '' });

// The pre-Form app ("Fitness Jarvis") saved days with workout/exercises/sets objects.
function oldDays(src) {
  const out = {};
  Object.entries(src || {}).forEach(([k, d]) => {
    if (!isDay(k) || !d) return;
    const meals = (d.meals || []).map(food);
    let wo = null; const w = d.workout;
    if (w && Array.isArray(w.exercises) && w.exercises.some(e => (e.sets || []).some(s => s.completed))) {
      const name = w.type === 'Custom' ? (w.customName || 'Custom') : (w.type || 'Workout');
      wo = { name, status: 'done', start: w.startedAt || 0, end: 0, ex: w.exercises.filter(e => !e.skipped).map(e => ({ name: e.name, reps: e.repTarget || '8–12', note: e.note || '', sets: (e.sets || []).map(s => ({ w: String(s.weight ?? ''), r: String(s.reps ?? ''), k: 'N', done: !!s.completed })) })) };
    }
    const cardio = d.cardio && d.cardio.completed && d.cardio.minutes ? [{ type: d.cardio.type || 'Cardio', min: n0(d.cardio.minutes) }] : [];
    if (!meals.length && !wo && !d.steps && !cardio.length) return;
    out[k] = { u: 1, meals, steps: n0(d.steps), water: n0(d.water), creatine: !!d.creatine, cardio, wo };
  });
  return out;
}

// The pre-Form text export ("FITNESS JARVIS EXPORT").
function oldText(t) {
  const out = {}; let cur = null;
  t.split(/\r?\n/).forEach(line => {
    let m;
    if ((m = /^---\s*(\d{4}-\d{2}-\d{2})\s*---/.exec(line))) { cur = out[m[1]] = { u: 1, meals: [], steps: 0, water: 0, creatine: false, cardio: [], wo: null }; return; }
    if (!cur) return;
    if ((m = /^Nutrition:\s*(\d+)\s*kcal,\s*(\d+)P\/(\d+)C\/(\d+)F,\s*(\d+)\s*steps,\s*(\d+)ml water,\s*creatine\s*(yes|no)/i.exec(line))) { cur.steps = +m[5]; cur.water = +m[6]; cur.creatine = m[7].toLowerCase() === 'yes'; return; }
    if ((m = /^\s+food:\s*(.*)$/.exec(line))) {
      const s = m[1], i = s.lastIndexOf(' ('); if (i < 0) return;
      const mm = /(\d+)\s*kcal,\s*(\d+)P\/(\d+)C\/(\d+)F(?:,\s*(\w+))?/i.exec(s.slice(i + 2)); if (!mm) return;
      cur.meals.push(food({ name: s.slice(0, i), type: mm[5], cal: mm[1], p: mm[2], c: mm[3], f: mm[4] })); return;
    }
    if ((m = /^Workout:\s*(.+?)\s*\((done|planned)\)/.exec(line))) { cur.wo = { name: m[1], status: 'done', start: 0, end: 0, ex: [] }; return; }
    if ((m = /^Cardio:\s*(.+?)\s+(\d+)min/.exec(line))) { cur.cardio.push({ type: m[1], min: +m[2] }); return; }
    if (cur.wo && (m = /^\s{2}(.+?):\s*(.+)$/.exec(line))) {
      const rest = m[2].split(' — note: ')[0];
      const sets = rest.split(',').map(x => /(\d+(?:\.\d+)?)\s*x\s*(\d+)/i.exec(x)).filter(Boolean).map(a => ({ w: a[1], r: a[2], k: 'N', done: true }));
      if (sets.length) cur.wo.ex.push({ name: m[1], reps: '8–12', note: '', sets });
    }
  });
  Object.keys(out).forEach(k => { const d = out[k]; if (d.wo && !d.wo.ex.length) d.wo = null; if (!d.meals.length && !d.wo && !d.steps && !d.cardio.length) delete out[k]; });
  return out;
}

// Returns { kind: 'full', state } for a Built backup (replaces everything),
// { kind: 'old', state, label } for older apps (merged in), or null if it isn't a backup.
export function readBackup(text, findEx) {
  const raw = String(text || '');
  if (/FITNESS JARVIS EXPORT/i.test(raw)) { const days = oldText(raw); return Object.keys(days).length ? { kind: 'old', label: 'history export', state: migrateV1({ days }, findEx) } : null; }
  const j = extractJSON(raw);
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const st = j.form2 && j.state ? j.state : j;
  if (st && st.v === 2 && st.days && typeof st.days === 'object') return { kind: 'full', state: normalize(st) };
  const c = j.form && j.state ? j.state : j;
  if (c && c.days && typeof c.days === 'object' && !Array.isArray(c.days)) {
    const sample = Object.values(c.days).find(Boolean) || {};
    if ('workout' in sample || (sample.meals || []).some(m => 'mealType' in m)) {
      const tpl = (j.customTemplates || []).map(t => ({ name: t.name, ex: (t.exercises || []).map(e => (typeof e === 'string' ? { name: e } : e)) }));
      return { kind: 'old', label: 'older app backup', state: migrateV1({ days: oldDays(c.days), customTemplates: tpl }, findEx) };
    }
    return { kind: 'old', label: 'Form Classic backup', state: migrateV1(c, findEx) };
  }
  return null;
}
