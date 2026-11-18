// App state: one object saved to localStorage, plus render plumbing shared by every view.
import { normalize, freshState, todayK, blankDay, normDay, score, streakInfo, xpTotal, levelOf, weekSummary, wkStart, liftHistory } from './core.js';

export const KEY = 'form2:state';
export const V1_KEY = 'form-v1';
function load() { try { const r = localStorage.getItem(KEY); if (r) return normalize(JSON.parse(r)); } catch (e) {} return freshState(); }
export let S = load();
export function replaceState(n) { S = normalize(n); save(); }
let ver = 0;
export const version = () => ver;
export function save() { ver++; S.u = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} afterSave.forEach(f => { try { f(); } catch (e) {} }); }
export const afterSave = [];
export function get(k = todayK()) { return S.days[k] || blankDay(); }
export function day(k = todayK()) { if (!S.days[k]) S.days[k] = blankDay(); normDay(S.days[k]); return S.days[k]; }
export function touch(k = todayK()) { day(k).u = Date.now(); save(); }
export function hasV1() { try { return !!localStorage.getItem(V1_KEY); } catch (e) { return false; } }
export function readV1() { try { return JSON.parse(localStorage.getItem(V1_KEY) || 'null'); } catch (e) { return null; } }

// Cached derived values: recomputed only when state changes.
const memo = {};
function cached(name, f) { const m = memo[name]; if (m && m.v === ver && m.d === todayK()) return m.val; const val = f(); memo[name] = { v: ver, d: todayK(), val }; return val; }
export const scoreOf = k => cached('sc:' + k, () => score(S, k));
export const streak = () => cached('streak', () => streakInfo(S));
export const level = () => cached('level', () => levelOf(xpTotal(S)));
export const week = (ws = wkStart(todayK())) => cached('wk:' + ws, () => weekSummary(S, ws));
export const hist = () => cached('hist', () => liftHistory(S));

// Views register render functions; renderAll repaints the current one plus the tab bar.
export const R = { views: {}, cur: 'today', after: [] };
export function render() { const f = R.views[R.cur]; if (f) f(); R.after.forEach(g => g()); }
