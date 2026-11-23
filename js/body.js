// Muscle maps drawn from real anatomy polygons (js/anatomy.js). Primary muscles light up fully, secondary ones softly.
import { ANATOMY } from './anatomy.js';

const poly = pts => `<polygon points="${pts}"/>`;
function figure(side, cls) {
  return ANATOMY[side].map(([ids, parts]) => `<g class="m ${ids.length ? cls(ids) : 'n'}">${parts.map(poly).join('')}</g>`).join('');
}
const BACKISH = ['lats', 'upper', 'lower', 'traps', 'rdelt', 'triceps', 'glutes', 'hams'];
export function bodyMap(primary = [], secondary = [], opts = {}) {
  const cls = ids => (ids.some(i => primary.includes(i)) ? 'hi' : ids.some(i => secondary.includes(i)) ? 'lo' : '');
  if (opts.only) {
    const side = opts.only === 'auto' ? (BACKISH.includes(primary[0]) ? 'back' : 'front') : opts.only;
    const legs = ['quads', 'hams', 'glutes', 'calves', 'adductors'].includes(primary[0]);
    const vb = opts.crop ? (legs ? '5 88 90 90' : '5 12 90 90') : '0 0 100 200';
    return `<svg class="body" viewBox="${vb}" role="img" aria-label="Muscles worked">${figure(side, cls)}</svg>`;
  }
  return `<svg class="body" viewBox="0 0 230 214" role="img" aria-label="Muscles worked"><g>${figure('front', cls)}</g><g transform="translate(130 0)">${figure('back', cls)}</g>${opts.labels === false ? '' : '<text x="50" y="211" class="bl">Front</text><text x="180" y="211" class="bl">Back</text>'}</svg>`;
}
// Heat version: values 0..1 per muscle, for weekly volume.
export function heatMap(vals) {
  const lvl = ids => { const v = Math.max(0, ...ids.map(i => vals[i] || 0)); return v >= 0.75 ? 'h3' : v >= 0.4 ? 'h2' : v > 0 ? 'h1' : ''; };
  return `<svg class="body" viewBox="0 0 230 214" role="img" aria-label="Weekly muscle volume"><g>${figure('front', lvl)}</g><g transform="translate(130 0)">${figure('back', lvl)}</g><text x="50" y="211" class="bl">Front</text><text x="180" y="211" class="bl">Back</text></svg>`;
}

// The Build: each muscle tinted by its level (0..1 in vals). Tap a muscle to see it (data-act="muscle").
export function buildMap(vals, opts = {}) {
  const g = (side) => ANATOMY[side].map(([ids, parts]) => {
    if (!ids.length) return `<g class="m n">${parts.map(poly).join('')}</g>`;
    const v = Math.max(0, ...ids.map(i => vals[i] || 0)), id = ids.find(i => (vals[i] || 0) === v) || ids[0];
    return `<g class="m bm" data-act="muscle" data-arg="${id}" style="--lv:${Math.round(v * 100)}%">${parts.map(poly).join('')}</g>`;
  }).join('');
  return `<svg class="body build" viewBox="0 0 230 ${opts.labels === false ? 204 : 214}" role="img" aria-label="Your muscles by level"><g>${g('front')}</g><g transform="translate(130 0)">${g('back')}</g>${opts.labels === false ? '' : '<text x="50" y="211" class="bl">Front</text><text x="180" y="211" class="bl">Back</text>'}</svg>`;
}
