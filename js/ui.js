// UI plumbing: icons, sheets, toasts, haptics, celebrations, and the action registry used by data-act buttons.
import { esc } from './core.js';

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const A = {};   // click actions: A[name](arg, el, event)
export const CH = {};  // input/change handlers: CH[name](el, event)

const P = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const I = {
  home: P('<path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z"/>'),
  dumb: P('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>', 2.4),
  users: P('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>'),
  chart: P('<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>'),
  cam: P('<path d="M4 8h3l1.6-2.3h6.8L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>'),
  spark: P('<path d="M12 3.5l1.9 5.3 5.3 1.9-5.3 1.9L12 17.9l-1.9-5.3-5.3-1.9 5.3-1.9z"/><path d="M19 3v3M17.5 4.5h3"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  pen: P('<path d="M4 20l4-1 11-11-3-3L5 16z"/>'),
  drop: P('<path d="M12 3.5c3.5 4.4 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.5-6.2 6-10.6z"/>'),
  pill: P('<rect x="3" y="9" width="18" height="6.5" rx="3.25" transform="rotate(-35 12 12)"/><path d="m9.4 8.3 5.2 7.4"/>'),
  run: P('<circle cx="15" cy="4.5" r="1.8"/><path d="M8 21l3-5 3 2v4M6 11l3-3 4 1 2 3 3 1M11 16l2-5"/>'),
  shoe: P('<path d="M3 16.5h17.5a.5.5 0 0 0 .5-.5c0-1.6-1.2-2.6-3-3l-4-1-2-3.5H7L4.5 11 3 12.5z"/><path d="M3 19h18"/>'),
  scale: P('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.2 2.6"/>'),
  flame: P('<path d="M12 21c-4 0-7-2.8-7-6.6 0-3.8 3-5.6 4.2-9.4 2.6 1.3 3.3 3.6 3.3 5.2 1-.6 1.7-1.8 1.9-3.2 2.4 1.8 3.6 4.5 3.6 7.4 0 3.8-2.8 6.6-6 6.6z"/>'),
  bolt: P('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>'),
  check: P('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>', 2.2),
  chev: P('<path d="m9 6 6 6-6 6"/>', 2),
  back: P('<path d="m15 6-6 6 6 6"/>', 2),
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 1.5),
  bell: P('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  trophy: P('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>'),
  medal: P('<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 9.5 6 3h4l2 4 2-4h4l-2.5 6.5"/><path d="m12 12 .9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/>', 1.4),
  target: P('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  clock: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  share: P('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v7.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V12"/>'),
  trash: P('<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  heart: P('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  star: P('<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.6-5 2.6 1-5.6-4.1-3.9 5.6-.8z"/>'),
  upload: P('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>'),
  list: P('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', 2.2),
  book: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'),
  swap: P('<path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7"/>'),
  play: P('<path d="M7 4.5v15l12-7.5z"/>'),
  timer: P('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M9.5 2.5h5"/>'),
  info: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>', 2),
  bulb: P('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>'),
  moon: P('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  send: P('<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>'),
  wave: P('<path d="M7.5 11V6a1.5 1.5 0 0 1 3 0v4.5M10.5 10V4.5a1.5 1.5 0 0 1 3 0V10M13.5 10V5.5a1.5 1.5 0 0 1 3 0V12M7.5 11a1.5 1.5 0 0 0-3 0v2a8 8 0 0 0 8 8h.5a7 7 0 0 0 7-7v-4a1.5 1.5 0 0 0-3 0"/>', 1.5),
  dots: P('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
  copy: P('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  calendar: P('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  leaf: P('<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15zM5 19l7-7"/>'),
};

/* ---------- avatars ---------- */
export const AV_SEEDS = ['Felix', 'Aneka', 'Jade', 'Milo', 'Nala', 'Leo', 'Kai', 'Zoe', 'Remy', 'Iris', 'Theo', 'Luna', 'Omar', 'Sage', 'Ezra', 'Noor', 'Finn', 'Maya'];
export const AV_EMO = AV_SEEDS;
export const AV_BG = ['#c7d2fe', '#fbcfe8', '#bbf7d0', '#fde68a', '#bae6fd', '#ddd6fe', '#fed7aa'];
// Avatars are Notionists illustrations by Zoish (CC0), served by DiceBear. Only the picked seed name is sent.
export const avUrl = seed => 'https://api.dicebear.com/9.x/notionists/svg?seed=' + encodeURIComponent(seed || 'Felix');
export function avatar(a = {}, size = 'md', name = '') {
  const seed = a.s || (a.e && /^[A-Za-z]/.test(a.e) ? a.e : '') || AV_SEEDS[[...(name || 'me')].reduce((x, c) => x + c.charCodeAt(0), 0) % AV_SEEDS.length];
  return `<span class="av ${size}" style="--avbg:${AV_BG[(a.bg ?? 0) % AV_BG.length]}"><img src="${avUrl(seed)}" alt="" loading="lazy"></span>`;
}

/* ---------- sheet ---------- */
export const Sheet = { kind: '', onClose: null };
export function openSheet(kind, title, body, opts = {}) {
  Sheet.kind = kind; Sheet.onClose = opts.onClose || null;
  const el = $('#sheet');
  el.className = 'sheet' + (opts.full ? ' full' : '');
  el.innerHTML = `<div class="grab"></div>${title != null ? `<div class="shead"><h3>${title}</h3><button class="x" data-act="closeSheet" aria-label="Close">${I.x}</button></div>` : ''}<div id="sbody">${body}</div>`;
  $('#sheetwrap').hidden = false;
  document.body.style.overflow = 'hidden';
  el.scrollTop = 0;
}
export function setSheet(body) { const b = $('#sbody'); if (b) b.innerHTML = body; }
export function closeSheet() {
  if ($('#sheetwrap').hidden) return;
  $('#sheetwrap').hidden = true; document.body.style.overflow = '';
  const f = Sheet.onClose; Sheet.kind = ''; Sheet.onClose = null; if (f) f();
}
A.closeSheet = () => closeSheet();

/* ---------- toast ---------- */
let tTimer = null, undoFn = null;
export function toast(msg, undo, ms = 3200) {
  const t = $('#toast'); undoFn = undo || null;
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button data-act="undo">Undo</button>' : ''}`;
  t.classList.add('show'); clearTimeout(tTimer); tTimer = setTimeout(() => t.classList.remove('show'), undo ? 5000 : ms);
}
A.undo = () => { const f = undoFn; undoFn = null; $('#toast').classList.remove('show'); if (f) f(); };

/* ---------- feel ---------- */
export function haptic(ms = 10) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
let actx = null;
export function beep(f = 880, d = 0.12) {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(0.12, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d); o.start(); o.stop(actx.currentTime + d); } catch (e) {}
}
const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function confetti(n = 120) {
  if (reduce()) return;
  const cv = $('#fx'), ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  const cols = ['--acc', '--food', '--train', '--move', '--pro', '--body'].map(v => cs.getPropertyValue(v).trim() || '#fff');
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 3, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3 }));
  const t0 = performance.now();
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
    if (performance.now() - t0 < 2600) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ---------- small html helpers ---------- */
export const toggle = (act, on, arg = '') => `<button class="toggle ${on ? 'on' : ''}" data-act="${act}" data-arg="${esc(arg)}" role="switch" aria-checked="${on}"></button>`;
export const ago = iso => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; if (s < 604800) return Math.floor(s / 86400) + 'd'; return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); };
export async function share(text, title = 'Pace') { try { if (navigator.share) { await navigator.share({ title, text }); return true; } } catch (e) { return false; } try { await navigator.clipboard.writeText(text); toast('Copied'); return true; } catch (e) { return false; } }
export function download(name, text, type = 'application/json') { const b = new Blob([text], { type }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
export function pickFiles(accept = 'image/*', multiple = false, capture = false) {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple; if (capture) i.setAttribute('capture', 'environment'); i.onchange = () => res([...i.files]); i.click(); });
}
