// Muscle map: front and back figures. Primary muscles glow in the accent colour, secondary ones in a softer tint.
const FRONT = {
  delts: '<ellipse cx="27" cy="47" rx="7" ry="7.5"/><ellipse cx="73" cy="47" rx="7" ry="7.5"/>',
  chest: '<path d="M36 44c5-3 11-3 13.5-1v15c-4 3-11 3-16-1-3-4-2-10 2.5-13z"/><path d="M64 44c-5-3-11-3-13.5-1v15c4 3 11 3 16-1 3-4 2-10-2.5-13z"/>',
  biceps: '<ellipse cx="22.5" cy="65" rx="4.6" ry="10" transform="rotate(8 22.5 65)"/><ellipse cx="77.5" cy="65" rx="4.6" ry="10" transform="rotate(-8 77.5 65)"/>',
  forearms: '<ellipse cx="17.5" cy="90" rx="4" ry="12" transform="rotate(12 17.5 90)"/><ellipse cx="82.5" cy="90" rx="4" ry="12" transform="rotate(-12 82.5 90)"/>',
  abs: '<rect x="43" y="61" width="14" height="33" rx="5"/>',
  obliques: '<path d="M35 63c2 8 4 18 7 28l-5 2c-3-8-4-19-4-29z"/><path d="M65 63c-2 8-4 18-7 28l5 2c3-8 4-19 4-29z"/>',
  quads: '<path d="M33 104c5-2 11-1 15 2l-1 34c-3 5-9 5-12 1-3-12-4-25-2-37z"/><path d="M67 104c-5-2-11-1-15 2l1 34c3 5 9 5 12 1 3-12 4-25 2-37z"/>',
  adductors: '<path d="M47.5 108l2 22-3 6-2-26z"/><path d="M52.5 108l-2 22 3 6 2-26z"/>',
  calves: '<ellipse cx="39" cy="170" rx="4.6" ry="13"/><ellipse cx="61" cy="170" rx="4.6" ry="13"/>',
  traps: '<path d="M41 36l9-3 9 3-9 4z"/>',
};
const BACK = {
  traps: '<path d="M38 38l12-6 12 6-5 18-7 6-7-6z"/>',
  delts: '<ellipse cx="27" cy="47" rx="7" ry="7.5"/><ellipse cx="73" cy="47" rx="7" ry="7.5"/>',
  rdelt: '<ellipse cx="28" cy="49" rx="5" ry="5"/><ellipse cx="72" cy="49" rx="5" ry="5"/>',
  upper: '<path d="M37 46l8 12-1 8-8-3z"/><path d="M63 46l-8 12 1 8 8-3z"/>',
  lats: '<path d="M34 55c3 10 6 20 12 27l2-14-11-15z"/><path d="M66 55c-3 10-6 20-12 27l-2-14 11-15z"/>',
  lower: '<rect x="44" y="78" width="12" height="16" rx="4"/>',
  triceps: '<ellipse cx="22.5" cy="65" rx="4.6" ry="10" transform="rotate(8 22.5 65)"/><ellipse cx="77.5" cy="65" rx="4.6" ry="10" transform="rotate(-8 77.5 65)"/>',
  forearms: '<ellipse cx="17.5" cy="90" rx="4" ry="12" transform="rotate(12 17.5 90)"/><ellipse cx="82.5" cy="90" rx="4" ry="12" transform="rotate(-12 82.5 90)"/>',
  glutes: '<ellipse cx="42" cy="104" rx="8.5" ry="8.5"/><ellipse cx="58" cy="104" rx="8.5" ry="8.5"/>',
  hams: '<path d="M34 115c4-2 10-2 14 1l-1 27c-3 3-8 3-11 0-2-9-3-19-2-28z"/><path d="M66 115c-4-2-10-2-14 1l1 27c3 3 8 3 11 0 2-9 3-19 2-28z"/>',
  calves: '<ellipse cx="39.5" cy="166" rx="5.6" ry="13"/><ellipse cx="60.5" cy="166" rx="5.6" ry="13"/>',
};
const SIL = '<circle cx="50" cy="16" r="10"/><rect x="45" y="25" width="10" height="9" rx="3"/>' +
  '<path d="M30 38c6-4 34-4 40 0 5 2 7 6 7 10l1 14 3 16 5 22-6 2-6-21-3-13-1 8c1 9 0 18-1 25l2 43 1 30-8 2-4-30-3-36h-2l-3 36-4 30-8-2 1-30 2-43c-1-7-2-16-1-25l-1-8-3 13-6 21-6-2 5-22 3-16 1-14c0-4 2-8 7-10z"/>';

function fig(map, hi, lo, label) {
  const parts = Object.entries(map).map(([id, svg]) => `<g class="m ${hi.includes(id) ? 'hi' : lo.includes(id) ? 'lo' : ''}">${svg}</g>`).join('');
  return `<g><g class="sil">${SIL}</g>${parts}<text x="50" y="205" class="bl">${label}</text></g>`;
}
export function bodyMap(primary = [], secondary = [], opts = {}) {
  const both = !opts.only;
  const showBack = both || opts.only === 'back', showFront = both || opts.only === 'front';
  const w = (showBack && showFront ? 200 : 100);
  return `<svg class="body" viewBox="0 0 ${w} 212" role="img" aria-label="Muscles worked">${showFront ? fig(FRONT, primary, secondary, 'Front') : ''}${showBack ? `<g transform="translate(${showFront ? 100 : 0} 0)">${fig(BACK, primary, secondary, 'Back')}</g>` : ''}</svg>`;
}
// Heat version: values 0..1 per muscle, for weekly volume.
export function heatMap(vals) {
  const lvl = v => (v >= 0.75 ? 'h3' : v >= 0.4 ? 'h2' : v > 0 ? 'h1' : '');
  const f = (map, label) => `<g><g class="sil">${SIL}</g>${Object.entries(map).map(([id, svg]) => `<g class="m ${lvl(vals[id] || 0)}">${svg}</g>`).join('')}<text x="50" y="205" class="bl">${label}</text></g>`;
  return `<svg class="body" viewBox="0 0 200 212" role="img" aria-label="Weekly muscle volume">${f(FRONT, 'Front')}<g transform="translate(100 0)">${f(BACK, 'Back')}</g></svg>`;
}
