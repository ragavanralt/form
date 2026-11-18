// Restore must read every backup format the app has ever produced.
import assert from 'node:assert/strict';
import { readBackup, extractJSON } from '../js/backup.js';
import { freshState } from '../js/core.js';

const t = (name, f) => { f(); console.log('ok', name); };
const fx = () => null;

t('Lifted backup file restores everything', () => {
  const s = freshState(); s.onboarded = true; s.profile.name = 'Sam';
  s.days['2026-11-01'] = { meals: [{ id: 'a', name: 'Eggs', cal: 300, p: 20, c: 2, f: 20, type: 'breakfast' }], steps: 9000 };
  const r = readBackup(JSON.stringify({ form2: true, at: 'x', state: s }), fx);
  assert.equal(r.kind, 'full');
  assert.equal(r.state.profile.name, 'Sam');
  assert.equal(r.state.days['2026-11-01'].meals[0].name, 'Eggs');
});

t('raw Lifted state (copied, with a BOM and smart quotes) restores', () => {
  const s = freshState(); s.days['2026-11-02'] = { steps: 5000 };
  const txt = '﻿Here you go:\n```json\n' + JSON.stringify(s).replace(/"steps":5000/, '“steps”:5000') + '\n```';
  const r = readBackup(txt, fx);
  assert.equal(r.kind, 'full');
  assert.equal(r.state.days['2026-11-02'].steps, 5000);
});

t('Form Classic backup merges in', () => {
  const classic = { form: 1, exported: 'x', state: { profile: { name: 'Sam', start: '2026-01-01' }, targets: { cal: 2400, pro: 180 }, fixtures: { 1: 'Push', 0: 'Rest' }, customTemplates: [],
    days: { '2026-10-10': { u: 1, meals: [{ name: 'Rice', type: 'lunch', cal: 400, p: 8, c: 80, f: 2 }], steps: 8000, water: 2000, creatine: true, cardio: [], wo: { name: 'Push', status: 'done', ex: [{ name: 'Bench', sets: [{ w: '100', r: '8', done: true }] }] } } } } };
  const r = readBackup(JSON.stringify(classic), fx);
  assert.equal(r.kind, 'old');
  assert.equal(r.state.targets.cal, 2400);
  assert.equal(r.state.days['2026-10-10'].wo.ex[0].sets[0].w, '100');
  assert.ok(r.state.routines.some(x => x.name === 'Push'));
});

t('older app JSON backup (workout/exercises/sets) merges in', () => {
  const v6 = { days: { '2026-05-05': { meals: [{ name: 'Oats', mealType: 'Breakfast', cal: 350, p: 12, c: 60, f: 6 }], steps: 7000, water: 1500, creatine: true,
    workout: { type: 'Pull', exercises: [{ name: 'Lat Pulldown', repTarget: '8–12', sets: [{ weight: 60, reps: 10, completed: true }, { weight: 60, reps: 9, completed: false }] }] } } },
    customTemplates: [{ name: 'Pull', exercises: [{ name: 'Lat Pulldown', sets: 3 }] }] };
  const r = readBackup(JSON.stringify(v6), fx);
  assert.equal(r.kind, 'old');
  const d = r.state.days['2026-05-05'];
  assert.equal(d.meals[0].type, 'breakfast');
  assert.equal(d.wo.ex[0].sets.length, 2);
  assert.equal(d.steps, 7000);
  assert.ok(r.state.routines.some(x => x.name === 'Pull'));
});

t('older app text export merges in', () => {
  const txt = `FITNESS JARVIS EXPORT\n--- 2026-04-01 ---\nNutrition: 2100 kcal, 150P/200C/60F, 9000 steps, 2500ml water, creatine yes\n  food: Chicken wrap (600 kcal, 45P/50C/20F, lunch)\nWorkout: Legs (done)\n  Leg Press: 140x10, 140x9\n`;
  const r = readBackup(txt, fx);
  assert.equal(r.kind, 'old');
  const d = r.state.days['2026-04-01'];
  assert.equal(d.meals[0].name, 'Chicken wrap');
  assert.equal(d.wo.ex[0].sets[1].r, '9');
  assert.equal(d.steps, 9000);
});

t('junk is rejected', () => {
  assert.equal(readBackup('hello', fx), null);
  assert.equal(readBackup('', fx), null);
  assert.equal(readBackup('[1,2]', fx), null);
  assert.equal(readBackup('{"name":"Eggs"}', fx), null);
  assert.equal(extractJSON('nothing here'), null);
});

console.log('all backup tests passed');
