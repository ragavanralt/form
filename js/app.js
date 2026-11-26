// Form 2 entry point: routing, event delegation, boot.
import { S, R, render, on, save, afterSave } from './store.js';
import { todayK } from './core.js';
import { A, CH, $, $$, I, closeSheet, FX } from './ui.js';
import { initAI } from './ai.js';
import { Social, ping } from './social.js';
import { vToday } from './views/today.js';
import './views/log.js';
import { vTrain, paintDock, activeKey, liveCardio, onWorkout, resumeWorkout } from './views/train.js';
import { vProgress, recapDue, openRecap } from './views/progress.js';
import { vFriends, refresh, awaySheet, handleAddParam } from './views/friends.js';
import { applyTheme } from './views/settings.js';
import { startOnboarding } from './views/onboarding.js';
import { checkRewards } from './views/daily.js';
import { wrappedDue } from './season.js';
import { openWrapped } from './views/wrapped.js';
import { pushSync, prepPush } from './push.js';
import { calSync } from './calsync.js';
FX.on = () => on('celebrate');
afterSave.push(pushSync, () => calSync());

R.views = { today: vToday, train: vTrain, progress: vProgress, friends: vFriends };
const TABS = [['today', 'Today', I.home], ['train', 'Train', I.dumb], null, ['friends', 'Friends', I.users], ['progress', 'Progress', I.chart]];
function paintTabs() {
  const inb = Social.inbox || {}; const n = (inb.nudges || []).filter(x => x.new).length + (inb.reactions || []).filter(x => x.new).length + (inb.requests || []).length;
  const tabs = TABS.filter(t => !t || t[0] !== 'friends' || on('friends'));
  $('#tabbar').style.gridTemplateColumns = tabs.length === 5 ? '' : '1fr 1fr 70px 1fr';
  $('#tabbar').innerHTML = tabs.map(t => t ? `<button class="tab ${R.cur === t[0] ? 'on' : ''}" data-act="go" data-arg="${t[0]}">${t[2]}${t[1]}${t[0] === 'friends' && n ? '<i class="dotn"></i>' : ''}</button>` : `<button class="plus" data-act="log" aria-label="Log">${I.plus}</button>`).join('');
}
R.after.push(paintTabs, paintDock);

function show(v) {
  R.cur = v; $$('.view').forEach(el => el.classList.toggle('on', el.id === 'v-' + v));
}
A.go = v => {
  if (!R.views[v] || (v === 'friends' && !on('friends'))) return;
  onWorkout(false); // you chose another screen, so a relaunch shouldn't pull you back into the workout
  closeSheet();
  if (v === 'today') R.day = todayK();
  show(v);
  render(); window.scrollTo(0, 0);
  if (v === 'friends') refresh();
};

// One listener for every tap. Buttons carry data-act and an optional data-arg.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = A[el.dataset.act]; if (!f) return;
  if (el.tagName === 'A' && !el.hasAttribute('href')) e.preventDefault();
  try { const r = f(el.dataset.arg, el, e); if (r && r.catch) r.catch(err => console.error(err)); } catch (err) { console.error(err); }
});
document.addEventListener('input', e => { const el = e.target.closest('[data-ch]'); if (!el) return; const f = CH[el.dataset.ch]; if (f && el.type !== 'range' || f && e.type === 'input') f(el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (!el || el.tagName !== 'SELECT') return; const f = CH[el.dataset.ch]; if (f) f(el, e); });
// Closing a sheet by hand (X, tapping outside it, Escape) means you've left the workout screen on purpose.
const closeByHand = () => { if (!$('#sheetwrap').hidden) onWorkout(false); closeSheet(); };
A.closeSheet = closeByHand;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeByHand(); });

// Re-render when the date changes or the app comes back to the foreground.
let lastDay = todayK();
function wake() {
  if (todayK() !== lastDay) { lastDay = todayK(); R.day = todayK(); render(); }
  if (Social.on && on('friends')) refresh().then(() => setTimeout(awaySheet, 300));
  pushSync();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
setInterval(() => { if (todayK() !== lastDay) wake(); }, 60000);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// A tapped notification opens the screen it is about: ?n=meal&t=lunch, ?n=workout, ?n=recap, ?n=morning, ?n=friends, ?n=plan
function openFromNotification(url) {
  let q; try { q = new URL(url, location.href).searchParams; } catch (e) { return; }
  const n = q.get('n'); if (!n || !S.onboarded) return;
  setTimeout(() => {
    if (n === 'meal') { A.go('today'); A.mealNow(q.get('t')); }
    else if (n === 'workout') { A.go('train'); A.startPlanned(); }
    else if (n === 'recap') { A.go('today'); A.closeDay(); }
    else if (n === 'plan') A.planMeals();
    else if (n === 'friends' && on('friends')) A.go('friends');
    else A.go('today');
  }, 700);
  if (location.search.includes('n=')) history.replaceState(null, '', location.pathname);
}
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.open) openFromNotification(e.data.open); });
async function boot() {
  applyTheme();
  paintTabs();
  if (!S.onboarded) startOnboarding();
  // Mid-workout and the app was closed or reloaded (iOS does this to home-screen apps in the
  // background): open straight back onto the workout, unless you'd left it yourself.
  const resume = S.onboarded && (activeKey() || liveCardio()) && onWorkout();
  if (resume) show('train');
  render();
  if (resume) resumeWorkout();
  initAI();
  checkRewards();
  // On open, at most one thing pops up: a finished season's Wrapped, then last week's recap, then what friends did.
  const popup = () => { if (!S.onboarded || !$('#sheetwrap').hidden) return; const sn = on('seasons') ? wrappedDue(S) : 0; if (sn) { openWrapped(sn, true); return; } const ws = on('recap') ? recapDue() : null; if (ws) { openRecap(ws); return; } if (on('friends')) awaySheet(); };
  if (Social.on) { await refresh(); handleAddParam(); setTimeout(popup, 600); }
  else { ping().then(() => { if (R.cur === 'friends') vFriends(); }); handleAddParam(); setTimeout(popup, 600); }
  pushSync(); prepPush(); calSync(2000);
  openFromNotification(location.href);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
