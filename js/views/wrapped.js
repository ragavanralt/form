// Seasons and Wrapped: the season sheet, the full-screen Wrapped story, and a shareable image of it.
import { S, save, on } from '../store.js';
import { todayK, addDays, pdk, fmt, esc } from '../core.js';
import { A, I, $, openSheet, closeSheet, toast, avatar, download, haptic, confetti } from '../ui.js';
import { seasonOf, seasonStats, TIERS, EPOCH, LEN } from '../season.js';

const md = k => pdk(k).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
const range = st => `${md(st.start)} – ${md(st.end)}`;

/* ---------- season card + sheet ---------- */
export function seasonCard() {
  if (!on('seasons')) return '';
  const se = seasonOf(), st = seasonStats(S, se.n), nx = st.next, prevAt = st.tier[1];
  const frac = nx ? (st.wins - prevAt) / (nx[1] - prevAt) : 1;
  return `<button class="card seasonc" data-act="seasonSheet" style="--tc:${st.tier[2]}"><div class="chd2"><span>Season ${se.n} · week ${se.week} of 6</span><b class="small faint">${se.left} days left</b></div>
    <div class="row" style="gap:14px;margin-top:6px"><span class="tierbig">${st.tier[0]}</span><span class="grow"><div class="pbar" style="height:7px"><i style="width:${Math.round(frac * 100)}%;background:var(--tc)"></i></div><span class="faint small" style="display:block;margin-top:6px">${nx ? `${nx[1] - st.wins} more win${nx[1] - st.wins === 1 ? '' : 's'} to ${nx[0]}` : 'Top tier. Hold it'}</span></span></div></button>`;
}
A.seasonSheet = () => {
  const se = seasonOf(), st = seasonStats(S, se.n);
  const past = []; for (let n = se.n - 1; n >= 1; n--) { const p = seasonOf(addDays(EPOCH, (n - 1) * LEN)); if (p.end < (S.profile.start || todayK())) break; past.push(seasonStats(S, n)); }
  openSheet('season', `Season ${se.n}`, `<p class="muted small" style="margin-top:-6px">${range(st)} · Seasons are 6 weeks and everyone’s on the same one. Your tier comes from wins (days at 70+). When it ends you get a Wrapped to share.</p>
  <div class="tiers mt">${TIERS.map(t => `<div class="${st.tier[0] === t[0] ? 'on' : ''} ${st.wins >= t[1] ? 'got' : ''}" style="--tc:${t[2]}"><i></i><b>${t[0]}</b><small>${t[1]}+ wins</small></div>`).join('')}</div>
  <div class="g3 mt"><div class="stat center"><small>Wins</small><b class="n">${st.wins}</b></div><div class="stat center"><small>Workouts</small><b class="n">${st.workouts}</b></div><div class="stat center"><small>Best run</small><b class="n">${st.streak}</b></div></div>
  <button class="btn wide mt2" data-act="wrapNow" data-arg="${se.n}">${I.play} Watch your season so far</button>
  ${past.length ? `<div class="sec"><div class="lab">Past seasons</div><div class="list">${past.map(p => `<button class="li noic" data-act="wrapNow" data-arg="${p.n}"><span><span class="t">Season ${p.n} · ${p.tier[0]}</span><span class="s">${range(p)} · ${p.wins} wins · ${p.workouts} workouts</span></span><span class="chev">${I.play}</span></button>`).join('')}</div></div>` : ''}`);
};
A.wrapNow = n => { closeSheet(); openWrapped(+n, false); };

/* ---------- the story ---------- */
let W = null;
function slides(st) {
  const name = S.profile.name || 'You', out = [];
  out.push({ bg: 'intro', k: `Season ${st.n}${st.done ? '' : ' so far'}`, big: 'Wrapped', s: `${name} · ${range(st)}`, av: true });
  out.push({ bg: 'a', k: 'You showed up', big: `${st.showed}<small>/${st.days}</small>`, s: `days logged. Your longest run was ${st.streak} day${st.streak === 1 ? '' : 's'} in a row.` });
  if (st.workouts) out.push({ bg: 'b', k: 'Under the bar', big: fmt(st.workouts), s: `workouts, ${Math.round(st.mins / 60)} hours, and ${fmt(st.vol)} ${S.profile.units} moved. That’s about ${Math.max(1, Math.round(st.vol / (S.profile.units === 'lb' ? 3300 : 1500)))} cars.` });
  if (st.lift) out.push({ bg: 'c', k: 'Biggest jump', big: `+${Math.round(st.lift.pct * 100)}%`, s: `${esc(st.lift.name)}: estimated max went from ${st.lift.from} to ${st.lift.to} ${S.profile.units}.${st.prs ? ` Plus ${st.prs} PR${st.prs === 1 ? '' : 's'} along the way.` : ''}` });
  if (st.levels) out.push({ bg: 'd', k: 'Your build grew', big: `+${st.levels}`, s: `muscle levels.${st.top ? ` Most work went to your ${esc(st.top.n.toLowerCase())}.` : ''}`, chips: st.ups.slice(0, 4).map(u => `${esc(u.n)} ${u.from}→${u.to}`) });
  if (st.avgPro) out.push({ bg: 'e', k: 'Fuel', big: `${st.avgPro}<small>g</small>`, s: `protein on an average day. You hit your target ${st.proDays} time${st.proDays === 1 ? '' : 's'}.` });
  if (st.bestDay) out.push({ bg: 'f', k: 'Best day', big: String(st.bestDay.total), s: `${pdk(st.bestDay.k).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}.${st.favDay ? ` ${st.favDay}s were your gym day.` : ''}` });
  out.push({ bg: 'tier', k: st.done ? 'You finished' : 'You’re on track for', big: st.tier[0], s: `${st.wins} wins this season.${st.next && !st.done ? ` ${st.next[1] - st.wins} more for ${st.next[0]}.` : ''}`, end: true });
  return out;
}
export function openWrapped(n, auto) {
  const st = seasonStats(S, n); if (!st.days) return;
  if (auto) { S.seen.wrapped = Math.max(S.seen.wrapped || 0, n); save(); }
  W = { st, sl: slides(st), i: 0, t: null };
  let el = $('#wrapped'); if (!el) { el = document.createElement('div'); el.id = 'wrapped'; document.body.appendChild(el); }
  el.hidden = false; document.body.style.overflow = 'hidden';
  paint();
}
function paint() {
  const el = $('#wrapped'), s = W.sl[W.i], st = W.st;
  clearTimeout(W.t);
  el.style.setProperty('--tc', st.tier[2]);
  el.innerHTML = `<div class="wr bg-${s.bg}"><div class="wbars">${W.sl.map((_, i) => `<i class="${i < W.i ? 'done' : i === W.i ? 'now' : ''}"></i>`).join('')}</div>
    <button class="wx" data-act="wrapClose" aria-label="Close">${I.x}</button>
    <div class="wbody">${s.av ? `<div class="wav">${avatar(S.profile.avatar || {}, 'lg', S.profile.name)}</div>` : ''}<span class="wk">${s.k}</span><b class="wbig ${/^[A-Za-z]/.test(s.big) ? 'word' : ''}">${s.big}</b><p class="ws">${s.s}</p>${s.chips ? `<div class="wchips">${s.chips.map(c => `<span>${c}</span>`).join('')}</div>` : ''}
    ${s.end ? `<div class="wgrid"><div><small>Workouts</small><b>${st.workouts}</b></div><div><small>Wins</small><b>${st.wins}</b></div><div><small>PRs</small><b>${st.prs}</b></div><div><small>Best run</small><b>${st.streak}</b></div></div><div class="row mt2" style="gap:10px;justify-content:center"><button class="btn" data-act="wrapShare">${I.share} Share</button><button class="btn ghost" data-act="wrapClose">Done</button></div>` : ''}</div>
    ${s.end ? '' : '<button class="wnav wprev" data-act="wrapPrev" aria-label="Back"></button><button class="wnav wnext" data-act="wrapNext" aria-label="Next"></button>'}</div>`;
  if (s.end) { confetti(120); haptic([20, 40, 20]); } else W.t = setTimeout(() => A.wrapNext(), 5200);
}
A.wrapNext = () => { if (!W) return; if (W.i < W.sl.length - 1) { W.i++; paint(); } };
A.wrapPrev = () => { if (!W) return; if (W.i > 0) { W.i--; paint(); } };
A.wrapClose = () => { if (W) clearTimeout(W.t); W = null; const el = $('#wrapped'); if (el) { el.hidden = true; el.innerHTML = ''; } document.body.style.overflow = ''; };

/* ---------- share image (1080 × 1920, drawn on a canvas) ---------- */
export async function card(st) {
  try { await document.fonts.load('800 100px Sora'); await document.fonts.load('600 40px Sora'); } catch (e) {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const x = c.getContext('2d'), cs = getComputedStyle(document.documentElement), acc = cs.getPropertyValue('--acc').trim() || '#8b6cff', tc = st.tier[2];
  const g = x.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, '#0b0c10'); g.addColorStop(0.55, '#121320'); g.addColorStop(1, '#07070a'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
  const glow = (cx, cy, r, col) => { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, col + '66'); rg.addColorStop(1, col + '00'); x.fillStyle = rg; x.fillRect(0, 0, 1080, 1920); };
  glow(880, 260, 760, acc.length === 7 ? acc : '#8b6cff'); glow(120, 1700, 700, tc);
  const F = (w, s) => `${w} ${s}px Sora, -apple-system, sans-serif`;
  x.fillStyle = 'rgba(255,255,255,.55)'; x.font = F(600, 34); x.fillText('LIFTED  ·  SEASON ' + st.n + (st.done ? ' WRAPPED' : ' SO FAR'), 90, 170);
  x.fillStyle = '#fff'; x.font = F(800, 92); x.fillText(S.profile.name || 'My season', 90, 290);
  x.fillStyle = 'rgba(255,255,255,.6)'; x.font = F(500, 38); x.fillText(range(st), 90, 350);
  x.fillStyle = tc; x.font = F(800, 190); x.fillText(st.tier[0], 82, 600);
  x.fillStyle = 'rgba(255,255,255,.7)'; x.font = F(500, 40); x.fillText(`${st.wins} wins · ${st.showed} of ${st.days} days logged`, 90, 680);
  const cells = [['Workouts', fmt(st.workouts)], ['Volume', st.vol >= 10000 ? Math.round(st.vol / 1000) + 'k' : fmt(st.vol)], ['PRs', fmt(st.prs)], ['Best run', st.streak + 'd'], ['Muscle levels', '+' + st.levels], ['Protein / day', st.avgPro ? st.avgPro + 'g' : '–']];
  cells.forEach(([l, v], i) => {
    const cx = 90 + (i % 2) * 460, cy = 800 + Math.floor(i / 2) * 250;
    x.fillStyle = 'rgba(255,255,255,.06)'; roundRect(x, cx, cy, 420, 210, 36); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.font = F(600, 32); x.fillText(l, cx + 40, cy + 66);
    x.fillStyle = '#fff'; x.font = F(800, 92); x.fillText(v, cx + 38, cy + 170);
  });
  if (st.lift) { x.fillStyle = 'rgba(255,255,255,.55)'; x.font = F(600, 32); x.fillText('BIGGEST JUMP', 90, 1640); x.fillStyle = '#fff'; x.font = F(700, 52); x.fillText(`${st.lift.name}  +${Math.round(st.lift.pct * 100)}%`, 90, 1712); }
  x.fillStyle = 'rgba(255,255,255,.4)'; x.font = F(600, 30); x.fillText('Made with Lifted', 90, 1830);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
A.wrapShare = async () => {
  if (!W) return;
  const st = W.st, blob = await card(st); if (!blob) { toast('Couldn’t make the image'); return; }
  const file = new File([blob], `lifted-season-${st.n}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `Season ${st.n} Wrapped` }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); toast('Image saved');
};
export { download };
