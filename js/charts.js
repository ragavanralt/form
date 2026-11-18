// Small SVG charts. Colours come from CSS variables, so they follow the theme.

// Activity rings: concentric arcs, one per item {f: 0..1, c: 'food'|'train'|...}.
export function rings(items, size = 168, stroke = 14, gap = 4) {
  const c = size / 2;
  let out = '';
  items.forEach((it, i) => {
    const r = c - stroke / 2 - i * (stroke + gap);
    if (r <= stroke / 2) return;
    const L = 2 * Math.PI * r, f = Math.max(0, Math.min(1, it.f || 0));
    out += `<circle cx="${c}" cy="${c}" r="${r}" class="rtrack c-${it.c}" stroke-width="${stroke}"/>`;
    out += `<circle cx="${c}" cy="${c}" r="${r}" class="rfill c-${it.c}" stroke-width="${stroke}" stroke-dasharray="${(L * f).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 ${c} ${c})" style="--L:${L.toFixed(1)}"/>`;
  });
  return `<svg class="rings" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${out}</svg>`;
}
// One ring with a label in the middle.
export function ring(f, c, size = 64, stroke = 7, inner = '') {
  return `<span class="ring1" style="width:${size}px;height:${size}px">${rings([{ f, c }], size, stroke)}<span class="rin">${inner}</span></span>`;
}
// Score dial: segmented arc split by score parts.
export function dial(parts, total, size = 210) {
  const c = size / 2, stroke = 16, r = c - stroke;
  const sweep = 270, start = 135, L = 2 * Math.PI * r * (sweep / 360);
  const arc = (a0, a1) => { const p = a => [c + r * Math.cos((a * Math.PI) / 180), c + r * Math.sin((a * Math.PI) / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  let segs = '', a = start; const gapDeg = 2.2;
  parts.forEach(p => {
    const span = (p.w / 100) * sweep;
    const a0 = a + gapDeg / 2, a1 = a + span - gapDeg / 2;
    if (a1 > a0) {
      segs += `<path d="${arc(a0, a1)}" class="dtrack c-${p.c}" stroke-width="${stroke}"/>`;
      if (p.f > 0) segs += `<path d="${arc(a0, a0 + (a1 - a0) * Math.min(1, p.f))}" class="dfill c-${p.c}" stroke-width="${stroke}"/>`;
    }
    a += span;
  });
  const mark = a2 => { const rr = r + stroke / 2 + 5; const x = c + rr * Math.cos((a2 * Math.PI) / 180), y = c + rr * Math.sin((a2 * Math.PI) / 180); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" class="dmark"/>`; };
  return `<svg class="dial" viewBox="0 0 ${size} ${size}" aria-hidden="true">${segs}${mark(start + 0.7 * sweep)}${mark(start + 0.45 * sweep)}</svg>`;
}
// Line chart with optional dots, area and a goal line. pts: [{x label, y}] (y may be null).
export function line(pts, o = {}) {
  const W = o.w || 340, H = o.h || 150, P = { l: 30, r: 10, t: 12, b: 22 };
  const ys = pts.map(p => p.y).filter(v => v != null).concat(o.goal != null ? [o.goal] : []).concat(o.extra || []);
  if (!ys.length) return `<div class="empty-chart">${o.empty || 'Nothing to chart yet'}</div>`;
  let lo = o.min != null ? o.min : Math.min(...ys), hi = o.max != null ? o.max : Math.max(...ys);
  if (hi === lo) { hi += 1; lo -= 1; }
  const padv = (hi - lo) * 0.12; if (o.min == null) lo -= padv; if (o.max == null) hi += padv;
  const X = i => P.l + (i * (W - P.l - P.r)) / Math.max(1, pts.length - 1), Y = v => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  let d = '', area = '', first = null, last = null;
  pts.forEach((p, i) => { if (p.y == null) return; const s = `${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`; d += (d ? 'L' : 'M') + s; if (first == null) first = i; last = i; });
  if (o.area && first != null) area = `<path d="${d}L${X(last).toFixed(1)} ${H - P.b}L${X(first).toFixed(1)} ${H - P.b}Z" class="larea c-${o.c || 'accent'}"/>`;
  const grid = [0, 0.5, 1].map(t => { const v = lo + t * (hi - lo); return `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="grid"/><text x="${P.l - 6}" y="${(Y(v) + 3).toFixed(1)}" class="axis" text-anchor="end">${o.fmt ? o.fmt(v) : Math.round(v)}</text>`; }).join('');
  const step = Math.max(1, Math.ceil(pts.length / 6));
  const xl = pts.map((p, i) => (i % step === 0 || i === pts.length - 1) && p.x ? `<text x="${X(i).toFixed(1)}" y="${H - 6}" class="axis" text-anchor="middle">${p.x}</text>` : '').join('');
  const goal = o.goal != null ? `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(o.goal).toFixed(1)}" y2="${Y(o.goal).toFixed(1)}" class="goal"/>` : '';
  const dots = o.dots ? pts.map((p, i) => (p.y == null ? '' : `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${i === last ? 3.8 : 2.2}" class="ldot c-${o.c || 'accent'}${i === last ? ' last' : ''}"/>`)).join('') : '';
  const sec = o.second ? (() => { let d2 = ''; o.second.forEach((p, i) => { if (p.y == null) return; d2 += (d2 ? 'L' : 'M') + `${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`; }); return `<path d="${d2}" class="lline2"/>`; })() : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${goal}${area}${sec}<path d="${d}" class="lline c-${o.c || 'accent'}"/>${dots}${xl}</svg>`;
}
// Vertical bars. bars: [{x, y, c?, hl?}]
export function bars(arr, o = {}) {
  const W = o.w || 340, H = o.h || 140, P = { l: 6, r: 6, t: 14, b: 20 };
  const max = Math.max(o.max || 0, ...arr.map(b => b.y || 0), 1);
  const bw = (W - P.l - P.r) / arr.length;
  const goal = o.goal != null ? `<line x1="${P.l}" x2="${W - P.r}" y1="${(P.t + (1 - o.goal / max) * (H - P.t - P.b)).toFixed(1)}" y2="${(P.t + (1 - o.goal / max) * (H - P.t - P.b)).toFixed(1)}" class="goal"/>` : '';
  const g = arr.map((b, i) => {
    const h = ((b.y || 0) / max) * (H - P.t - P.b), x = P.l + i * bw + bw * 0.18, w = bw * 0.64, y = H - P.b - h;
    return `<rect x="${x.toFixed(1)}" y="${(H - P.b - (H - P.t - P.b)).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - P.t - P.b).toFixed(1)}" rx="${Math.min(6, w / 2).toFixed(1)}" class="btrack"/>` +
      (h > 0 ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(2, h).toFixed(1)}" rx="${Math.min(6, w / 2).toFixed(1)}" class="bfill c-${b.c || o.c || 'accent'}${b.hl ? ' hl' : ''}"/>` : '') +
      (b.x ? `<text x="${(x + w / 2).toFixed(1)}" y="${H - 6}" class="axis${b.hl ? ' strong' : ''}" text-anchor="middle">${b.x}</text>` : '') +
      (o.labels && b.y ? `<text x="${(x + w / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" class="vlab" text-anchor="middle">${o.fmt ? o.fmt(b.y) : Math.round(b.y)}</text>` : '');
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${goal}${g}</svg>`;
}
// Calendar heatmap: weeks as columns, Mon..Sun rows. cells: [{k, v (0..100|null), today}]
export function heat(cells, o = {}) {
  const cs = o.cell || 13, gp = 3, rows = 7, cols = Math.ceil(cells.length / rows);
  const W = cols * (cs + gp), H = rows * (cs + gp);
  const lvl = v => (v == null ? 'n' : v >= 70 ? 'l4' : v >= 45 ? 'l3' : v >= 20 ? 'l2' : v > 0 ? 'l1' : 'l0');
  const g = cells.map((c, i) => { const col = Math.floor(i / rows), row = i % rows; return `<rect x="${col * (cs + gp)}" y="${row * (cs + gp)}" width="${cs}" height="${cs}" rx="3" class="hc ${lvl(c.v)}${c.today ? ' today' : ''}" data-act="dayDetail" data-arg="${c.k}"><title>${c.k}: ${c.v == null ? '–' : c.v}</title></rect>`; }).join('');
  return `<svg class="heat" viewBox="0 0 ${W} ${H}" style="max-width:${W * 1.6}px">${g}</svg>`;
}
// Horizontal stacked macro bar.
export function macroBar(p, c, f) {
  const kc = p * 4 + c * 4 + f * 9 || 1;
  return `<div class="mbar"><i class="c-pro" style="width:${(p * 400) / kc}%"></i><i class="c-carb" style="width:${(c * 400) / kc}%"></i><i class="c-fat" style="width:${(f * 900) / kc}%"></i></div>`;
}
export function spark(vals, o = {}) {
  const W = o.w || 80, H = o.h || 26; const v = vals.filter(x => x != null); if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v) || 1; let d = '';
  vals.forEach((y, i) => { if (y == null) return; const x = (i * W) / (vals.length - 1), yy = H - 3 - ((y - lo) / (hi - lo || 1)) * (H - 6); d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + yy.toFixed(1); });
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${d}" class="lline c-${o.c || 'accent'}"/></svg>`;
}

// Activity rings in the Apple Fitness style: gradient strokes, rounded caps, dimmed tracks.
// items: [{f: 0..1+, k: 'fuel'|'train'|'move'}]
let ringId = 0;
export function arings(items, size = 150, stroke = 16, gap = 3) {
  const c = size / 2, id = 'ar' + ++ringId;
  let defs = '', out = '';
  items.forEach((it, i) => {
    const r = c - stroke / 2 - i * (stroke + gap); if (r <= stroke / 2) return;
    const L = 2 * Math.PI * r, f = Math.max(0, Math.min(1, it.f || 0));
    defs += `<linearGradient id="${id}${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--ring-${it.k})"/><stop offset="1" stop-color="var(--ring-${it.k}2)"/></linearGradient>`;
    out += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--ring-${it.k})" stroke-opacity=".22" stroke-width="${stroke}"/>`;
    if (f > 0) out += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#${id}${i})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${Math.max(0.01, L * f - 0.01).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>`;
  });
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs>${defs}</defs>${out}</svg>`;
}
