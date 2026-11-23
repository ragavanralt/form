// Form 2 entry point: routing, event delegation, boot.
import { S, R, render, on, save, afterSave } from './store.js';
import { todayK } from './core.js';
import { A, CH, $, $$, I, closeSheet, FX } from './ui.js';
import { initAI } from './ai.js';
import { Social, ping } from './social.js';
import { vToday } from './views/today.js';
import './views/log.js';
import { vTrain, paintDock } from './views/train.js';
import { vProgress, recapDue, openRecap } from './views/progress.js';
import { vFriends, refresh, awaySheet, handleAddParam } from './views/friends.js';
import { applyTheme } from './views/settings.js';
import { startOnboarding } from './views/onboarding.js';
import { checkRewards } from './views/daily.js';
import { wrappedDue } from './season.js';
import { openWrapped } from './views/wrapped.js';
import { pushSync } from './push.js';
FX.on = () => on('celebrate');
afterSave.push(pushSync);

R.views = { today: vToday, train: vTrain, progress: vProgress, friends: vFriends };
const TABS = [['today', 'Today', I.home], ['train', 'Train', I.dumb], null, ['friends', 'Friends', I.users], ['progress', 'Progress', I.chart]];
function paintTabs() {
  const inb = Social.inbox || {}; const n = (inb.nudges || []).filter(x => x.new).length + (inb.reactions || []).filter(x => x.new).length + (inb.requests || []).length;
  const tabs = TABS.filter(t => !t || t[0] !== 'friends' || on('friends'));
  $('#tabbar').style.gridTemplateColumns = tabs.length === 5 ? '' : '1fr 1fr 70px 1fr';
  $('#tabbar').innerHTML = tabs.map(t => t ? `<button class="tab ${R.cur === t[0] ? 'on' : ''}" data-act="go" data-arg="${t[0]}">${t[2]}${t[1]}${t[0] === 'friends' && n ? '<i class="dotn"></i>' : ''}</button>` : `<button class="plus" data-act="log" aria-label="Log">${I.plus}</button>`).join('');
}
R.after.push(paintTabs, paintDock);

A.go = v => {
  if (!R.views[v] || (v === 'friends' && !on('friends'))) return;
  closeSheet();
  if (v === 'today') R.day = todayK();
  R.cur = v; $$('.view').forEach(el => el.classList.toggle('on', el.id === 'v-' + v));
  render(); window.scrollTo(0, 0);
  if (v === 'friends') refresh();
};

// One listener for every tap. Buttons carry data-act and an optional data-arg.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = A[el.dataset.act]; if (!f) return;
  if (el.tagName === 'A') e.preventDefault();
  try { const r = f(el.dataset.arg, el, e); if (r && r.catch) r.catch(err => console.error(err)); } catch (err) { console.error(err); }
});
document.addEventListener('input', e => { const el = e.target.closest('[data-ch]'); if (!el) return; const f = CH[el.dataset.ch]; if (f && el.type !== 'range' || f && e.type === 'input') f(el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (!el || el.tagName !== 'SELECT') return; const f = CH[el.dataset.ch]; if (f) f(el, e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

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

async function boot() {
  applyTheme();
  paintTabs();
  if (!S.onboarded) startOnboarding();
  render();
  initAI();
  checkRewards();
  // On open, at most one thing pops up: a finished season's Wrapped, then last week's recap, then what friends did.
  const popup = () => { if (!S.onboarded || !$('#sheetwrap').hidden) return; const sn = on('seasons') ? wrappedDue(S) : 0; if (sn) { openWrapped(sn, true); return; } const ws = on('recap') ? recapDue() : null; if (ws) { openRecap(ws); return; } if (on('friends')) awaySheet(); };
  if (Social.on) { await refresh(); handleAddParam(); setTimeout(popup, 600); }
  else { ping().then(() => { if (R.cur === 'friends') vFriends(); }); handleAddParam(); setTimeout(popup, 600); }
  pushSync();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
