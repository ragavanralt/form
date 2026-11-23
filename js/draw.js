// Exercise drawings: a pictogram figure doing the lift, drawn from joint angles (no image files).
// Each pattern has a start pose A and an end pose B; the animation moves through the angles so limbs keep their length.
// Angles are degrees: 0 points right, 90 points down, -90 points up. Side-view figures face right.

const L = { to: 26, ua: 14, fa: 13, th: 19, sh: 19, ft: 6, hr: 5.6, nk: 2.6 };
const rad = a => (a * Math.PI) / 180;
const dir = (a, l) => [Math.cos(rad(a)) * l, Math.sin(rad(a)) * l];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
const r1 = n => Math.round(n * 10) / 10;
const pt = p => r1(p[0]) + ' ' + r1(p[1]);

/* ---------- joints ---------- */
function side(p) {
  let hip, knee, ankle;
  if (p.f) { ankle = p.f; knee = add(ankle, dir(p.s, L.sh)); hip = add(knee, dir(p.q, L.th)); }
  else { hip = p.h; knee = add(hip, dir(p.l[0], L.th)); ankle = add(knee, dir(p.l[1], L.sh)); }
  const toe = add(ankle, dir(p.ft ?? (p.l && p.l[2]) ?? 0, L.ft));
  const sh = add(hip, dir(p.t, L.to)), head = add(sh, dir(p.hd ?? p.t, L.nk + L.hr));
  const arm = a => { const e = add(sh, dir(a[0], a[2] || L.ua)); return [sh, e, add(e, dir(a[1], a[3] || L.fa))]; };
  const leg2 = p.l2 ? (() => { const k = add(hip, dir(p.l2[0], L.th)), an = add(k, dir(p.l2[1], L.sh)); return [hip, k, an, add(an, dir(p.l2[2] ?? 0, L.ft))]; })() : null;
  const a = arm(p.a), a2 = p.a2 ? arm(p.a2) : null;
  return { hip, sh, head, a, a2, leg: [hip, knee, ankle, toe], leg2, hand: a[2], hand2: a2 ? a2[2] : a[2], elbow: a[1], ankle, knee, toe };
}
// Front view: x is mirrored around 50. Angles describe the figure's left side (screen right).
function front(p) {
  const y = p.y, ys = y - 24, lift = p.sr || 0;
  const S = [[50 + 10, ys - lift], [50 - 10, ys - lift]], H = [[50 + 6, y], [50 - 6, y]];
  const head = [50, ys - L.nk - L.hr - 1];
  const m = (a, s) => (s ? a : 180 - a);
  const arm = s => { const e = add(S[s ? 0 : 1], dir(m(p.a[0], s), p.a[2] || L.ua)); return [S[s ? 0 : 1], e, add(e, dir(m(p.a[1], s), p.a[3] || L.fa))]; };
  const leg = s => { const k = add(H[s ? 0 : 1], dir(m(p.l[0], s), p.l[2] || L.th)), an = add(k, dir(m(p.l[1], s), p.l[3] || L.sh)); return [H[s ? 0 : 1], k, an, add(an, dir(m(-4, s), 4))]; };
  const aR = arm(1), aL = arm(0);
  return { S, H, head, aR, aL, lR: leg(1), lL: leg(0), hand: aR[2], hand2: aL[2], hip: [50, y], sh: [50, ys] };
}

/* ---------- patterns ---------- */
// W in eq is the weight; it becomes a plate, dumbbell, kettlebell or handle from the exercise's equipment.
const STAND = { f: [50, 89], s: -90, q: -90, t: -90 };
const SEAT = [{ k: 'rect', x: 22, y: 63, w: 30, h: 5 }, { k: 'line', x1: 36, y1: 68, x2: 36, y2: 91, w: 3 }];
const BENCH = [{ k: 'rect', x: 18, y: 66, w: 50, h: 5 }, { k: 'line', x1: 26, y1: 71, x2: 26, y2: 91, w: 3 }, { k: 'line', x1: 60, y1: 71, x2: 60, y2: 91, w: 3 }];
const P = {
  squat: { A: { ...STAND, t: -88, a: [150, -30] }, B: { f: [54, 89], s: -52, q: -172, t: -52, a: [160, -40] }, eq: [{ k: 'W', at: 'sh', dx: -3, dy: 1 }], still: 'B' },
  goblet: { A: { ...STAND, t: -88, a: [100, -70] }, B: { f: [54, 89], s: -52, q: -172, t: -58, a: [110, -60] }, eq: [{ k: 'W', at: 'hand', dx: 3 }], still: 'B' },
  legPress: { A: { h: [36, 66], t: -148, l: [-42, 28, -60], a: [95, 20] }, B: { h: [36, 66], t: -148, l: [-24, -24, -70], a: [95, 20] }, eq: [{ k: 'sled', at: 'ankle' }], props: [{ k: 'line', x1: 34, y1: 70, x2: 14, y2: 56, w: 5 }, { k: 'rect', x: 26, y: 68, w: 16, h: 5 }], still: 'A', floor: true },
  lunge: { A: { h: [50, 52.4], t: -90, l: [70, 100], l2: [110, 80], a: [92, 90] }, B: { h: [50, 65], t: -88, l: [15, 90], l2: [112, 170], a: [92, 90] }, eq: [{ k: 'W', at: 'hand' }], still: 'B', both: true },
  legExt: { A: { h: [40, 61], t: -96, l: [0, 90], a: [95, 70] }, B: { h: [40, 61], t: -96, l: [-2, -4], a: [95, 70] }, eq: [{ k: 'pad', at: 'ankle' }], props: SEAT, still: 'B' },
  legCurlSeated: { A: { h: [40, 61], t: -96, l: [0, -6], a: [95, 70] }, B: { h: [40, 61], t: -96, l: [0, 120], a: [95, 70] }, eq: [{ k: 'pad', at: 'ankle', dy: -4 }], props: SEAT, still: 'B' },
  legCurlLying: { A: { h: [56, 61], t: 180, hd: 186, l: [2, 2], a: [100, 175] }, B: { h: [56, 61], t: 180, hd: 186, l: [2, -95], a: [100, 175] }, eq: [{ k: 'pad', at: 'ankle', dx: 2, dy: -3 }], props: [{ k: 'rect', x: 18, y: 65, w: 56, h: 5 }, { k: 'line', x1: 28, y1: 70, x2: 28, y2: 91, w: 3 }, { k: 'line', x1: 64, y1: 70, x2: 64, y2: 91, w: 3 }], still: 'B' },
  nordic: { A: { f: [32, 87], s: 0, q: -90, t: -90, a: [70, -110], ft: 180 }, B: { f: [32, 87], s: 0, q: -42, t: -42, a: [40, 30], ft: 180 }, props: [{ k: 'rect', x: 24, y: 82, w: 8, h: 4 }], still: 'M' },
  rdl: { A: { ...STAND, a: [92, 92] }, B: { f: [52, 89], s: -82, q: -112, t: -14, a: [90, 90] }, eq: [{ k: 'W', at: 'hand' }], still: 'B' },
  goodMorning: { A: { ...STAND, a: [150, -30] }, B: { f: [52, 89], s: -82, q: -112, t: -14, a: [160, -10] }, eq: [{ k: 'W', at: 'sh', dx: -1, dy: -2 }], still: 'B' },
  deadlift: { A: { f: [54, 89], s: -62, q: -150, t: -34, a: [90, 90] }, B: { ...STAND, f: [54, 89], a: [92, 92] }, eq: [{ k: 'W', at: 'hand' }], still: 'A' },
  hipThrust: { A: { f: [72, 89], s: -100, q: 140, t: -158, hd: -150, a: [22, 22] }, B: { f: [72, 89], s: -92, q: 180, t: 180, hd: 190, a: [0, 0] }, eq: [{ k: 'W', at: 'hip', dy: -4 }], props: [{ k: 'rect', x: 12, y: 70, w: 18, h: 5 }, { k: 'line', x1: 21, y1: 75, x2: 21, y2: 91, w: 3 }], still: 'B' },
  bridge: { A: { f: [72, 89], s: -110, q: 160, t: 178, hd: 182, a: [0, 0] }, B: { f: [72, 89], s: -100, q: 180, t: 158, hd: 166, a: [-18, -18] }, still: 'B' },
  calf: { A: { ...STAND, a: [92, 92] }, B: { ...STAND, f: [50, 83], ft: 42, a: [92, 92] }, eq: [{ k: 'W', at: 'hand' }], props: [{ k: 'rect', x: 44, y: 89, w: 20, h: 4 }], still: 'B' },
  kbSwing: { A: { f: [52, 89], s: -78, q: -118, t: -24, a: [110, 125] }, B: { ...STAND, f: [52, 89], a: [-2, -2] }, eq: [{ k: 'kb', at: 'hand' }], still: 'B' },
  bench: { A: { h: [62, 63], t: 180, hd: 182, l: [28, 100], a: [62, -90] }, B: { h: [62, 63], t: 180, hd: 182, l: [28, 100], a: [-86, -86] }, eq: [{ k: 'W', at: 'hand' }], props: BENCH, still: 'B' },
  incline: { A: { h: [60, 64], t: -150, hd: -140, l: [24, 104], a: [70, -88] }, B: { h: [60, 64], t: -150, hd: -140, l: [24, 104], a: [-96, -96] }, eq: [{ k: 'W', at: 'hand' }], props: [{ k: 'line', x1: 62, y1: 68, x2: 34, y2: 52, w: 5 }, { k: 'line', x1: 52, y1: 68, x2: 52, y2: 91, w: 3 }], still: 'B' },
  decline: { A: { h: [64, 60], t: 166, hd: 170, l: [40, 120], a: [62, -86] }, B: { h: [64, 60], t: 166, hd: 170, l: [40, 120], a: [-82, -82] }, eq: [{ k: 'W', at: 'hand' }], props: [{ k: 'line', x1: 68, y1: 63, x2: 22, y2: 75, w: 5 }, { k: 'line', x1: 44, y1: 70, x2: 44, y2: 91, w: 3 }], still: 'B' },
  pullover: { A: { h: [62, 63], t: 180, hd: 182, l: [28, 100], a: [-172, -172] }, B: { h: [62, 63], t: 180, hd: 182, l: [28, 100], a: [-84, -84] }, eq: [{ k: 'W', at: 'hand' }], props: BENCH, still: 'A' },
  skull: { A: { h: [62, 63], t: 180, hd: 182, l: [28, 100], a: [-100, 150] }, B: { h: [62, 63], t: 180, hd: 182, l: [28, 100], a: [-100, -96] }, eq: [{ k: 'W', at: 'hand' }], props: BENCH, still: 'A' },
  seatPress: { A: { h: [40, 61], t: -92, l: [0, 90], a: [150, -12] }, B: { h: [40, 61], t: -92, l: [0, 90], a: [2, 0] }, eq: [{ k: 'W', at: 'hand' }], props: SEAT, still: 'B' },
  standPress: { A: { ...STAND, a: [150, -12] }, B: { ...STAND, a: [2, 0] }, eq: [{ k: 'W', at: 'hand' }], still: 'B' },
  dip: { A: { h: [48, 61], t: -72, l: [100, -160], a: [150, 62] }, B: { h: [49, 52], t: -80, l: [100, -160], a: [94, 90] }, props: [{ k: 'line', x1: 36, y1: 57, x2: 66, y2: 57, w: 3.5 }, { k: 'line', x1: 64, y1: 57, x2: 64, y2: 92, w: 3 }], still: 'A', floor: true },
  pushup: { A: { h: [46, 80], t: -6, hd: -4, l: [174, 176, 120], a: [150, 70] }, B: { h: [46, 68], t: -16, hd: -14, l: [162, 166, 110], a: [92, 90] }, still: 'B' },
  ohp: { A: { ...STAND, a: [100, -82] }, B: { ...STAND, hd: -74, a: [-96, -94] }, eq: [{ k: 'W', at: 'hand' }], still: 'B' },
  seatOhp: { A: { h: [40, 61], t: -90, l: [0, 90], a: [100, -82] }, B: { h: [40, 61], t: -90, hd: -74, l: [0, 90], a: [-96, -94] }, eq: [{ k: 'W', at: 'hand' }], props: SEAT, still: 'B' },
  frontRaise: { A: { ...STAND, a: [88, 88] }, B: { ...STAND, a: [-4, -6] }, eq: [{ k: 'W', at: 'hand' }], still: 'B' },
  uprightRow: { A: { ...STAND, a: [90, 90] }, B: { ...STAND, a: [-150, 62] }, eq: [{ k: 'W', at: 'hand' }], still: 'M' },
  facePull: { A: { ...STAND, a: [-12, -8] }, B: { ...STAND, a: [-176, -40] }, eq: [{ k: 'cable', at: 'hand', to: [92, 30] }, { k: 'handle', at: 'hand' }], still: 'B' },
  curl: { A: { ...STAND, a: [92, 90] }, B: { ...STAND, a: [96, -70] }, eq: [{ k: 'W', at: 'hand' }], still: 'M' },
  preacher: { A: { h: [36, 61], t: -84, l: [0, 90], a: [48, 40] }, B: { h: [36, 61], t: -84, l: [0, 90], a: [48, -108] }, eq: [{ k: 'W', at: 'hand' }], props: [...SEAT, { k: 'line', x1: 50, y1: 40, x2: 62, y2: 52, w: 5 }, { k: 'line', x1: 62, y1: 52, x2: 62, y2: 91, w: 3 }], still: 'B' },
  pushdown: { A: { ...STAND, a: [94, -42] }, B: { ...STAND, a: [94, 88] }, eq: [{ k: 'cable', at: 'hand', to: [64, 4] }, { k: 'handle', at: 'hand' }], still: 'M' },
  ohExt: { A: { ...STAND, t: -86, hd: -74, a: [-104, 112] }, B: { ...STAND, t: -86, hd: -74, a: [-104, -92] }, eq: [{ k: 'W', at: 'hand' }], still: 'M' },
  kickback: { A: { f: [54, 89], s: -80, q: -118, t: -12, a: [176, 92], a2: [84, 92] }, B: { f: [54, 89], s: -80, q: -118, t: -12, a: [176, 178], a2: [84, 92] }, eq: [{ k: 'W', at: 'hand' }], props: [{ k: 'rect', x: 62, y: 60, w: 26, h: 4 }, { k: 'line', x1: 80, y1: 64, x2: 80, y2: 91, w: 3 }], still: 'B' },
  gluteKick: { A: { h: [46, 54], t: -78, l: [92, 92], l2: [88, 90], a: [20, 10] }, B: { h: [46, 54], t: -74, l: [150, 128], l2: [88, 90], a: [20, 10] }, eq: [{ k: 'cable', at: 'ankle', to: [72, 90] }], props: [{ k: 'line', x1: 74, y1: 30, x2: 74, y2: 92, w: 3 }], still: 'B', both: true },
  bentRow: { A: { f: [52, 89], s: -76, q: -112, t: -28, a: [90, 90] }, B: { f: [52, 89], s: -76, q: -112, t: -28, a: [168, 78] }, eq: [{ k: 'W', at: 'hand' }], still: 'B' },
  cableRow: { A: { h: [34, 70], t: -68, l: [-12, 6], a: [4, 0] }, B: { h: [34, 70], t: -94, l: [-12, 6], a: [158, 6] }, eq: [{ k: 'cable', at: 'hand', to: [94, 74] }, { k: 'handle', at: 'hand' }], props: [{ k: 'rect', x: 22, y: 72, w: 24, h: 5 }, { k: 'rect', x: 78, y: 62, w: 4, h: 16 }], still: 'B' },
  straightArm: { A: { ...STAND, t: -80, a: [-42, -42] }, B: { ...STAND, t: -80, a: [78, 78] }, eq: [{ k: 'cable', at: 'hand', to: [92, 6] }, { k: 'handle', at: 'hand' }], still: 'B' },
  backExt: { A: { h: [48, 54], t: 70, hd: 74, l: [146, 146], a: [100, 30] }, B: { h: [48, 54], t: -30, hd: -28, l: [146, 146], a: [20, 150] }, props: [{ k: 'rect', x: 44, y: 55, w: 10, h: 5 }, { k: 'line', x1: 50, y1: 60, x2: 36, y2: 91, w: 3 }, { k: 'rect', x: 14, y: 76, w: 6, h: 5 }], still: 'B', floor: true },
  plank: { A: { h: [46, 74], t: -8, hd: -6, l: [174, 176, 110], a: [94, 2] }, B: { h: [46, 73], t: -10, hd: -8, l: [173, 176, 110], a: [94, 2] }, still: 'B' },
  legRaise: { A: { h: [50, 58], t: -90, hd: -66, l: [90, 90], a: [-90, -90] }, B: { h: [50, 58], t: -96, hd: -70, l: [-4, -4], a: [-90, -90] }, props: [{ k: 'line', x1: 30, y1: 4.5, x2: 70, y2: 4.5, w: 3 }], still: 'B', floor: false },
  crunch: { A: { h: [52, 85], t: 180, hd: 180, l: [-58, 62, 0], a: [0, 0] }, B: { h: [52, 85], t: -148, hd: -140, l: [-58, 62, 0], a: [-14, -14] }, still: 'B' },
  cableCrunch: { A: { f: [36, 87], s: 0, q: -90, t: -90, a: [-30, 150], ft: 180 }, B: { f: [36, 87], s: 0, q: -80, t: 18, a: [60, -120], ft: 180 }, eq: [{ k: 'cable', at: 'hand', to: [62, 4] }, { k: 'handle', at: 'hand' }], still: 'B' },
  abWheel: { A: { f: [30, 87], s: 0, q: -70, t: -52, a: [80, 80], ft: 180 }, B: { f: [30, 87], s: 0, q: -16, t: -8, a: [-4, -2], ft: 180 }, eq: [{ k: 'wheel', at: 'hand' }], still: 'B' },
  carry: { A: { h: [50, 54], t: -90, l: [72, 98], l2: [108, 82], a: [92, 90] }, B: { h: [50, 54], t: -90, l: [108, 82], l2: [72, 98], a: [92, 90] }, eq: [{ k: 'W', at: 'hand', dx: 3 }], still: 'A', both: true },
  sled: { A: { h: [40, 58], t: -38, l: [68, 104, 10], l2: [128, 82, 20], a: [-12, -8] }, B: { h: [40, 58], t: -38, l: [128, 82, 20], l2: [68, 104, 10], a: [-12, -8] }, props: [{ k: 'rect', x: 76, y: 66, w: 16, h: 24 }, { k: 'line', x1: 74, y1: 46, x2: 76, y2: 66, w: 3 }], still: 'A', both: true },
  ropes: { A: { f: [52, 89], s: -70, q: -128, t: -70, a: [10, -20] }, B: { f: [52, 89], s: -70, q: -128, t: -70, a: [40, 40] }, eq: [{ k: 'rope', at: 'hand', to: [94, 90] }], still: 'A' },
  // front views
  pullup: { v: 'front', A: { y: 57, a: [-72, -88], l: [92, 96] }, B: { y: 38, a: [25, -95], l: [96, 110] }, props: [{ k: 'line', x1: 22, y1: 6, x2: 78, y2: 6, w: 3 }], still: 'B', floor: false },
  pulldown: { v: 'front', A: { y: 66, a: [-66, -86], l: [80, 92, 8] }, B: { y: 66, a: [36, -110], l: [80, 92, 8] }, eq: [{ k: 'bar2' }, { k: 'cable', at: 'mid', to: [50, 2] }], props: [{ k: 'rect', x: 34, y: 66, w: 32, h: 5 }], still: 'B' },
  latRaise: { v: 'front', A: { y: 54, a: [82, 86], l: [94, 90] }, B: { y: 54, a: [-4, -2], l: [94, 90] }, eq: [{ k: 'W', at: 'hand' }, { k: 'W', at: 'hand2' }], still: 'B' },
  shrug: { v: 'front', A: { y: 54, a: [82, 86], l: [94, 90] }, B: { y: 54, sr: 4, a: [82, 86], l: [94, 90] }, eq: [{ k: 'W', at: 'hand' }, { k: 'W', at: 'hand2' }], still: 'B' },
  fly: { v: 'front', A: { y: 54, a: [-6, 4], l: [94, 90] }, B: { y: 54, a: [70, 160, 9, 9], l: [94, 90] }, eq: [{ k: 'handle', at: 'hand' }, { k: 'handle', at: 'hand2' }], still: 'A' },
  rearFly: { v: 'front', A: { y: 54, a: [70, 160, 9, 9], l: [94, 90] }, B: { y: 54, a: [-4, 4], l: [94, 90] }, eq: [{ k: 'W', at: 'hand' }, { k: 'W', at: 'hand2' }], still: 'B' },
  abduct: { v: 'front', A: { y: 66, a: [100, 70], l: [86, 90, 8] }, B: { y: 66, a: [100, 70], l: [40, 80, 8] }, props: [{ k: 'rect', x: 34, y: 66, w: 32, h: 5 }], still: 'B' },
  adduct: { v: 'front', A: { y: 66, a: [100, 70], l: [40, 80, 8] }, B: { y: 66, a: [100, 70], l: [86, 90, 8] }, props: [{ k: 'rect', x: 34, y: 66, w: 32, h: 5 }], still: 'B' },
  twist: { v: 'front', A: { y: 70, a: [60, 150, 10, 9], l: [40, 100, 9] }, B: { y: 70, a: [40, 120, 10, 9], l: [40, 100, 9] }, still: 'B' },
};

// [pattern, weight kind]. Weight kinds: bar, db, kb, cable, machine, none.
const MAP = {
  'Barbell Bench Press': ['bench', 'bar'], 'Incline Barbell Press': ['incline', 'bar'], 'Flat Dumbbell Press': ['bench', 'db'], 'Incline Dumbbell Press': ['incline', 'db'],
  'Machine Chest Press': ['seatPress', 'machine'], 'Smith Incline Press': ['incline', 'bar'], 'Pec Deck': ['fly', 'none'], 'Cable Fly': ['fly', 'cableHigh'], 'Low-to-High Cable Fly': ['fly', 'cableLow'],
  'Dips': ['dip', 'none'], 'Push-Up': ['pushup', 'none'], 'Decline Bench Press': ['decline', 'bar'], 'Dumbbell Pullover': ['pullover', 'db'],
  'Pull-Up': ['pullup', 'none'], 'Chin-Up': ['pullup', 'none'], 'Lat Pulldown': ['pulldown', 'none'], 'Neutral-Grip Pulldown': ['pulldown', 'none'], 'Straight-Arm Pulldown': ['straightArm', 'none'],
  'Seated Cable Row': ['cableRow', 'none'], 'Chest-Supported Row': ['cableRow', 'none'], 'Barbell Row': ['bentRow', 'bar'], 'Dumbbell Row': ['bentRow', 'db'], 'T-Bar Row': ['bentRow', 'bar'],
  'Single-Arm Cable Row': ['cableRow', 'none'], 'Machine Row': ['cableRow', 'none'], 'Deadlift': ['deadlift', 'bar'], 'Rack Pull': ['deadlift', 'bar'], 'Back Extension': ['backExt', 'none'],
  'Barbell Shrug': ['shrug', 'db'], 'Dumbbell Shrug': ['shrug', 'db'],
  'Overhead Press': ['ohp', 'bar'], 'Shoulder Press': ['seatOhp', 'db'], 'Machine Shoulder Press': ['seatOhp', 'machine'], 'Arnold Press': ['seatOhp', 'db'],
  'Dumbbell Lateral Raise': ['latRaise', 'db'], 'Cable Lateral Raise': ['latRaise', 'machine'], 'Machine Lateral Raise': ['latRaise', 'machine'], 'Front Raise': ['frontRaise', 'db'],
  'Reverse Pec Deck': ['rearFly', 'machine'], 'Face Pull': ['facePull', 'none'], 'Rear Delt Fly': ['rearFly', 'db'], 'Upright Row': ['uprightRow', 'cable'],
  'Barbell Curl': ['curl', 'bar'], 'Dumbbell Curl': ['curl', 'db'], 'Incline Dumbbell Curl': ['curl', 'db'], 'Preacher Curl': ['preacher', 'machine'], 'Hammer Curl': ['curl', 'db'],
  'Cable Curl': ['curl', 'cable'], 'Bayesian Curl': ['curl', 'cable'], 'Machine Curl': ['preacher', 'machine'], 'EZ-Bar Curl': ['curl', 'bar'],
  'Rope Pushdown': ['pushdown', 'none'], 'Straight-Bar Pushdown': ['pushdown', 'none'], 'Overhead Triceps Extension': ['ohExt', 'machine'], 'Skull Crushers': ['skull', 'bar'],
  'Close-Grip Bench Press': ['bench', 'bar'], 'Machine Triceps Extension': ['preacher', 'machine'], 'Dumbbell Kickback': ['kickback', 'db'], 'Wrist Curl': ['curl', 'db'], 'Farmer Carry': ['carry', 'db'],
  'Back Squat': ['squat', 'bar'], 'Front Squat': ['squat', 'bar'], 'Smith Squat': ['squat', 'bar'], 'Hack Squat': ['squat', 'none'], 'Leg Press': ['legPress', 'none'], 'Goblet Squat': ['goblet', 'db'],
  'Bulgarian Split Squat': ['lunge', 'db'], 'Walking Lunge': ['lunge', 'db'], 'Step-Up': ['lunge', 'db'], 'Leg Extension': ['legExt', 'none'],
  'Romanian Deadlift': ['rdl', 'bar'], 'Dumbbell Romanian Deadlift': ['rdl', 'db'], 'Seated Leg Curl': ['legCurlSeated', 'none'], 'Lying Leg Curl': ['legCurlLying', 'none'], 'Nordic Curl': ['nordic', 'none'],
  'Good Morning': ['goodMorning', 'bar'], 'Hip Thrust': ['hipThrust', 'bar'], 'Glute Bridge': ['bridge', 'none'], 'Cable Kickback': ['gluteKick', 'none'], 'Hip Abduction': ['abduct', 'none'], 'Hip Adduction': ['adduct', 'none'],
  'Standing Calf Raise': ['calf', 'none'], 'Calf Raise': ['calf', 'none'], 'Seated Calf Raise': ['calf', 'none'], 'Kettlebell Swing': ['kbSwing', 'kb'],
  'Plank': ['plank', 'none'], 'Side Plank': ['plank', 'none'], 'Hanging Leg Raise': ['legRaise', 'none'], 'Cable Crunch': ['cableCrunch', 'none'], 'Ab Wheel Rollout': ['abWheel', 'none'],
  'Crunch': ['crunch', 'none'], 'Russian Twist': ['twist', 'none'], 'Pallof Press': ['standPress', 'machine'], 'Dead Bug': ['crunch', 'none'], 'Machine Crunch': ['crunch', 'none'],
  'Power Clean': ['deadlift', 'bar'], 'Thruster': ['goblet', 'db'], 'Burpee': ['pushup', 'none'], 'Battle Ropes': ['ropes', 'none'], 'Sled Push': ['sled', 'none'], 'Band Pull-Apart': ['rearFly', 'none'],
};
// Custom exercises: guess from the name, then the main muscle.
const WORDS = [[/squat/, 'squat'], [/lunge|split/, 'lunge'], [/leg press/, 'legPress'], [/bench|chest press|floor press/, 'bench'], [/incline/, 'incline'], [/fly|flye|pec/, 'fly'], [/dip/, 'dip'], [/push.?up/, 'pushup'],
  [/pull.?up|chin/, 'pullup'], [/pulldown|pull.?down/, 'pulldown'], [/row/, 'bentRow'], [/deadlift|rdl|hinge/, 'rdl'], [/shrug/, 'shrug'], [/press|overhead/, 'ohp'], [/lateral|side raise|y.?raise/, 'latRaise'],
  [/raise/, 'frontRaise'], [/curl/, 'curl'], [/pushdown|push.?down/, 'pushdown'], [/extension/, 'ohExt'], [/kickback/, 'kickback'], [/thrust|bridge/, 'hipThrust'], [/calf/, 'calf'], [/plank/, 'plank'], [/crunch|sit.?up/, 'crunch'], [/swing/, 'kbSwing'], [/carry|walk/, 'carry']];
const BY_MUSCLE = { chest: 'bench', delts: 'ohp', rdelt: 'rearFly', biceps: 'curl', triceps: 'pushdown', forearms: 'curl', abs: 'crunch', obliques: 'twist', traps: 'shrug', lats: 'pulldown', upper: 'cableRow', lower: 'backExt', glutes: 'hipThrust', quads: 'squat', hams: 'rdl', calves: 'calf', adductors: 'adduct' };
const EQ_KIND = { Barbell: 'bar', Dumbbell: 'db', Kettlebell: 'kb', Cable: 'cable', Machine: 'machine', Smith: 'bar', Bodyweight: 'none', Band: 'none' };
export function patternFor(x) {
  if (!x) return ['curl', 'none'];
  if (MAP[x.n]) return MAP[x.n];
  const l = String(x.n || '').toLowerCase(), w = WORDS.find(([re]) => re.test(l));
  return [w ? w[1] : BY_MUSCLE[(x.p || [])[0]] || 'curl', EQ_KIND[x.e] || 'none'];
}

/* ---------- frames ---------- */
const lerp = (a, b, t) => (Array.isArray(a) ? a.map((v, i) => lerp(v, b[i] ?? v, t)) : typeof a === 'number' ? a + ((b ?? a) - a) * t : a);
function mix(A, B, t) { const o = {}; new Set([...Object.keys(A), ...Object.keys(B)]).forEach(k => { o[k] = A[k] == null ? B[k] : B[k] == null ? A[k] : lerp(A[k], B[k], t); }); return o; }
const ease = t => t * t * (3 - 2 * t);

// One frame becomes a list of shapes with stable keys, so frames can be animated attribute by attribute.
function shapes(pat, kind, pose) {
  const J = pat.v === 'front' ? front(pose) : side(pose), out = [];
  const path = (key, cls, pts) => out.push({ key, tag: 'path', cls, a: { d: 'M' + pts.map(pt).join('L') } });
  if (pat.v === 'front') {
    path('lL', 'lb', J.lL); path('lR', 'lb', J.lR);
    out.push({ key: 'tor', tag: 'path', cls: 'tor', a: { d: `M${pt(J.S[1])}L${pt(J.S[0])}L${pt(J.H[0])}L${pt(J.H[1])}Z` } });
    path('aL', 'lb', J.aL); path('aR', 'lb', J.aR);
  } else {
    const far = pat.both ? 'lb' : 'lb far';
    if (J.leg2) path('l2', far, J.leg2);
    if (J.a2) path('a2', 'lb far', J.a2);
    path('tor', 'tor', [J.hip, J.sh]);
    path('leg', 'lb', J.leg);
  }
  out.push({ key: 'hd', tag: 'circle', cls: 'hd', a: { cx: r1(J.head[0]), cy: r1(J.head[1]), r: L.hr } });
  if (pat.v !== 'front') path('arm', 'lb', J.a);
  (pat.eq || []).forEach((e, i) => {
    const at = e.at === 'mid' ? [(J.hand[0] + J.hand2[0]) / 2, (J.hand[1] + J.hand2[1]) / 2] : e.at ? J[e.at] : null;
    const p = at ? [at[0] + (e.dx || 0), at[1] + (e.dy || 0)] : null, key = 'e' + i;
    let k = e.k;
    if (k === 'W') k = { bar: 'plate', db: 'db', kb: 'kb', cable: 'handle', machine: 'handle', none: '' }[kind] || '';
    if (k === 'plate') out.push({ key, tag: 'circle', cls: 'eq plate', a: { cx: r1(p[0]), cy: r1(p[1]), r: 8 } });
    else if (k === 'db') out.push({ key, tag: 'rect', cls: 'eq', a: { x: r1(p[0] - 5.5), y: r1(p[1] - 2.6), width: 11, height: 5.2, rx: 2 } });
    else if (k === 'kb') out.push({ key, tag: 'circle', cls: 'eq', a: { cx: r1(p[0]), cy: r1(p[1] + 4.5), r: 4.5 } });
    else if (k === 'handle') out.push({ key, tag: 'circle', cls: 'eq', a: { cx: r1(p[0]), cy: r1(p[1]), r: 2.6 } });
    else if (k === 'wheel') out.push({ key, tag: 'circle', cls: 'eq ring', a: { cx: r1(p[0] + 1), cy: r1(p[1] + 1), r: 4.5 } });
    else if (k === 'pad') out.push({ key, tag: 'circle', cls: 'pad', a: { cx: r1(p[0]), cy: r1(p[1]), r: 3.6 } });
    else if (k === 'cable' || k === 'rope') out.push({ key, tag: 'line', cls: k === 'rope' ? 'eq rope' : 'cab', a: { x1: r1(p[0]), y1: r1(p[1]), x2: e.to[0], y2: e.to[1] } });
    else if (k === 'bar2') out.push({ key, tag: 'line', cls: 'eq bar', a: { x1: r1(J.hand2[0] - 4), y1: r1(J.hand2[1]), x2: r1(J.hand[0] + 4), y2: r1(J.hand[1]) } });
    else if (k === 'sled') { const s = pose.l ? pose.l[1] - 90 : 0, a2 = add(J.toe, dir(s - 90, 9)), b2 = add(J.toe, dir(s + 90, 9)); out.push({ key, tag: 'line', cls: 'eq bar', a: { x1: r1(a2[0]), y1: r1(a2[1]), x2: r1(b2[0]), y2: r1(b2[1]) } }); }
  });
  return out;
}

const attrs = a => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
const propSVG = p => (p.k === 'rect' ? `<rect class="prop" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${Math.min(2.5, p.h / 2)}"/>` : `<line class="prop" x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke-width="${p.w}"/>`);

// Draw an exercise. opts.anim loops the movement; otherwise it shows the most telling position.
export function exDrawing(x, opts = {}) {
  const [pid, kind] = patternFor(x), pat = P[pid] || P.curl;
  let props = (pat.props || []).map(propSVG).join('');
  if (kind === 'cableHigh') props += '<circle class="prop" cx="8" cy="10" r="2.5"/><circle class="prop" cx="92" cy="10" r="2.5"/>';
  if (kind === 'cableLow') props += '<circle class="prop" cx="8" cy="88" r="2.5"/><circle class="prop" cx="92" cy="88" r="2.5"/>';
  const floor = pat.floor === false ? '' : '<line class="floor" x1="6" y1="92" x2="94" y2="92"/>';
  const cab = kind === 'cableHigh' || kind === 'cableLow' ? (f => { const J = pat.v === 'front' ? front(f) : side(f), y = kind === 'cableHigh' ? 10 : 88; return [{ key: 'c1', tag: 'line', cls: 'cab', a: { x1: r1(J.hand[0]), y1: r1(J.hand[1]), x2: 92, y2: y } }, { key: 'c2', tag: 'line', cls: 'cab', a: { x1: r1(J.hand2[0]), y1: r1(J.hand2[1]), x2: 8, y2: y } }]; }) : () => [];
  const frame = pose => [...cab(pose), ...shapes(pat, kind, pose)];
  const lbl = `aria-label="${String(x && x.n || 'Exercise').replace(/"/g, '')}"`;
  if (!opts.anim || matchesReduce()) {
    const f = frame(pat.still === 'A' ? pat.A : pat.still === 'M' ? mix(pat.A, pat.B, 0.5) : pat.B);
    return `<svg class="exd" viewBox="0 0 100 100" role="img" ${lbl}>${floor}${props}${f.map(s => `<${s.tag} class="${s.cls}" ${attrs(s.a)}/>`).join('')}</svg>`;
  }
  const N = 8, fr = Array.from({ length: N + 1 }, (_, i) => frame(mix(pat.A, pat.B, ease(i / N))));
  const seq = [...fr, ...fr.slice(0, -1).reverse()], dur = (opts.dur || 2.8) + 's';
  const body = fr[0].map((s, i) => {
    const anims = Object.keys(s.a).filter(k => seq.some(f => f[i].a[k] !== s.a[k])).map(k => `<animate attributeName="${k}" dur="${dur}" repeatCount="indefinite" values="${seq.map(f => f[i].a[k]).join(';')}"/>`).join('');
    return `<${s.tag} class="${s.cls}" ${attrs(s.a)}>${anims}</${s.tag}>`;
  }).join('');
  return `<svg class="exd" viewBox="0 0 100 100" role="img" ${lbl}>${floor}${props}${body}</svg>`;
}
const matchesReduce = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const PATTERNS = Object.keys(P);
