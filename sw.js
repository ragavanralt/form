// Form 2 service worker: opens offline. Own files are network-first so updates land on the next open;
// fonts are cache-first. AI and friends-server calls are never cached. Form Classic (classic/) has its own worker.
const CACHE = 'form2-v17';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/app.js', 'js/core.js', 'js/store.js', 'js/ui.js', 'js/ai.js', 'js/social.js', 'js/charts.js', 'js/body.js', 'js/anatomy.js', 'js/exercises.js', 'js/backup.js', 'js/draw.js', 'js/build.js', 'js/drop.js', 'js/loot.js', 'js/season.js', 'js/duo.js', 'js/push.js',
  'js/views/today.js', 'js/views/log.js', 'js/views/train.js', 'js/views/progress.js', 'js/views/friends.js', 'js/views/settings.js', 'js/views/onboarding.js', 'js/views/daily.js', 'js/views/wrapped.js', 'icon-180.png', 'assets/avatars/violet1.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('form2-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (u.pathname.includes('/classic/')) return;
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'api.dicebear.com') {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  }
});

// Notifications sent by the lifted-push server function.
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Lifted', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Lifted', { body: d.body || '', tag: d.tag || 'lifted', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const c = cs.find(x => x.url.startsWith(self.registration.scope)); return c ? c.focus() : self.clients.openWindow(url); }));
});
