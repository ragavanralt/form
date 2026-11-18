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
