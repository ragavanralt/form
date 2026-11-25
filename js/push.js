// Phone notifications (Web Push). The phone subscribes once; after that it keeps the server up to date with a small
// summary of the day (score, streak, plan, today's drop) so the server can send the right reminder at the right time.
// On iPhone this works only when Built is opened from the Home Screen (iOS 16.4+).
import { S, on, streak, scoreOf, hist, build } from './store.js';
import { todayK, liftDone, routineName, planned, addDays } from './core.js';
import { Social, rpc } from './social.js';

const K = 'form2:push';
const ls = { get: () => { try { return JSON.parse(localStorage.getItem(K) || 'null') || {}; } catch (e) { return {}; } }, set: v => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} } };
export const Push = { d: ls.get(), status: '' };

export const pushCan = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const pushOnNow = () => !!(Push.d.on && Push.d.id);

const b64 = s => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
function prefs() { const n = S.settings.notif || {}, r = S.settings.remind || {}; return { remind: n.remind !== false, streak: n.streak !== false && on('streak'), drop: n.drop !== false && on('drop'), friends: n.friends !== false && on('friends'), morning: r.morning || '08:30', gym: r.gym || '18:00', evening: r.evening || '21:00' }; }
function state() {
  const t = todayK(), sc = scoreOf(t), st = streak(), d = S.days[t];
  const plan = Array.from({ length: 7 }, (_, i) => { const k = addDays(t, (i - new Date().getDay() + 7) % 7); const fx = planned(S, k); return fx === 'rest' ? '' : routineName(S, fx); });
  const dr = S.drops && S.drops[t];
  let drop = null; if (dr && on('drop')) { try { drop = { k: t, t: dropText(dr), done: !!dr.done }; } catch (e) {} }
  const b = S.modules.train && on('build') ? build() : null, cold = b && b.cooling[0] ? b.cooling[0].n : '';
  const fx = planned(S, t), r = S.routines.find(x => x.id === fx);
  const last = r && on('ghost') ? hist().sessions.filter(s => s.name === r.name && s.date < t).at(-1) : null;
  return { day: t, score: sc.total, streak: st.streak, trained: liftDone(d), plan, drop, cold, ghost: last ? Math.round(last.vol).toLocaleString('en-CA') + ' ' + (S.profile.units || 'kg') : '' };
}
let dropText = () => '';
export const setDropText = f => { dropText = f; };

async function save(sub) {
  const r = await rpc('fm_push_save', { p_id: Push.d.id || null, p_secret: Push.d.secret || null, p_token: Social.auth && Social.auth.token || '', p_sub: sub, p_prefs: prefs(), p_state: state(), p_tz: -new Date().getTimezoneOffset() });
  if (sub && r.id) { Push.d = { ...Push.d, id: r.id, secret: r.secret, on: true }; ls.set(Push.d); }
  return r;
}
// The server's public key, fetched ahead of time: iPhone only lets a web app subscribe right after a tap,
// so nothing slow (like a network call) may sit between the tap and subscribe().
const KK = 'form2:vapid';
Push.key = (() => { try { return localStorage.getItem(KK) || ''; } catch (e) { return ''; } })();
export async function prepPush() {
  if (!pushCan()) return '';
  try { const r = await rpc('fm_push_vapid'); if (r && r.key && r.key !== Push.key) { Push.key = r.key; localStorage.setItem(KK, r.key); } } catch (e) {}
  return Push.key;
}
const sameKey = (sub, key) => { try { const a = new Uint8Array(sub.options.applicationServerKey), b = b64(key); return a.length === b.length && a.every((x, i) => x === b[i]); } catch (e) { return true; } };
// Subscribe and register with the server. Call straight from a tap. Throws { code, msg } on failure.
export async function pushOn() {
  if (!pushCan()) throw { code: isIOS() && !standalone() ? 'install' : 'unsupported' };
  if (Notification.permission === 'denied') throw { code: 'denied' };
  const key = Push.key || await prepPush();
  if (!key) throw { code: 'down' };
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) { try { await sub.unsubscribe(); } catch (e) {} sub = null; } // left over from an older key
  try {
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }); // this asks permission on iPhone
  } catch (e) {
    if (Notification.permission === 'denied' || (e && e.name === 'NotAllowedError')) throw { code: 'denied' };
    throw { code: 'fail', msg: (e && (e.name + ': ' + e.message)) || String(e) };
  }
  if (Notification.permission !== 'granted') { const p = await Notification.requestPermission(); if (p !== 'granted') throw { code: 'denied' }; }
  try { await save(sub.toJSON()); } catch (e) { throw e && e.code ? e : { code: 'down' }; }
  lastSig = ''; Push.status = 'on';
}
// Ask the server to send this phone a test notification right now.
export async function pushTest() {
  const r = await rpc('fm_push_test', { p_id: Push.d.id || null, p_secret: Push.d.secret || null });
  if (r && r.ok === false) throw { code: r.error || 'fail' };
  return r;
}
export async function pushOff() {
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) {}
  try { await rpc('fm_push_save', { p_id: Push.d.id || null, p_secret: Push.d.secret || null, p_token: '', p_sub: null, p_prefs: null, p_state: null, p_tz: null }); } catch (e) {}
  Push.d = {}; ls.set(Push.d);
}
// Keep the server's copy of the day current. Cheap: only sends when something changed, at most every 20 s.
let lastSig = '', timer = null;
export function pushSync() {
  if (!pushOnNow()) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
      if (!sub) { Push.d.on = false; ls.set(Push.d); return; }
      const body = { sub: sub.toJSON(), p: prefs(), s: state(), tz: -new Date().getTimezoneOffset() }, sig = JSON.stringify(body);
      if (sig === lastSig) return;
      await save(body.sub); lastSig = sig;
    } catch (e) {}
  }, 20000);
}
export const pushErr = e => ({ install: 'On iPhone, add Built to your Home Screen first (Share → Add to Home Screen), then open it from there.', unsupported: 'This browser can’t do notifications.', denied: 'Notifications are blocked. Turn them on for Built in your phone’s Settings → Notifications.', nosetup: 'The notifications server isn’t set up yet.', down: 'Can’t reach the server right now. Try again in a bit.', warming: 'Notifications are still starting up on the server. Try again in about 10 minutes.', too_soon: 'Give it 30 seconds between tests.', not_found: 'This phone isn’t registered. Turn notifications off and on again.' })[e && e.code] || ('Couldn’t turn on notifications' + (e && e.msg ? ' (' + e.msg + ')' : '.'));
