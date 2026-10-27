// DEEPFLAT isometric SVG engine.
import { glyph as glyph3d, W as GW, H as GH } from '../3d/glyphs.js';
// Axonometric camera matched to the key visual: the letter plane (x axis) rises gently (~20deg),
// the depth axis (y) falls more steeply (~37deg). No vanishing point.
const TH = (35 * Math.PI) / 180;
const PH = (32 * Math.PI) / 180;
export const AX = [Math.cos(TH), Math.sin(TH) * Math.sin(PH)];
export const AY = [-Math.sin(TH), Math.cos(TH) * Math.sin(PH)];
export const AZ = [0, -Math.cos(PH)];
// direction toward the viewer, used for face visibility
export const VIEW = [Math.sin(TH) * Math.cos(PH), Math.cos(TH) * Math.cos(PH), Math.sin(PH)];

export const P = (x, y, z = 0) => [x * AX[0] + y * AY[0], x * AX[1] + y * AY[1] + z * AZ[1]];
const r1 = (n) => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? 0 : v;
};
export const R = r1;
export const pts = (a) => a.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ');
export const pathD = (rings) => rings.map((r) => 'M' + r.map((p) => r1(p[0]) + ',' + r1(p[1])).join('L') + 'Z').join('');

let uid = 0;
export const nextId = (p = 'c') => p + (uid++).toString(36);

export class Out {
  constructor() {
    this.s = [];
  }
  add(x) {
    this.s.push(x);
    return this;
  }
  open(tag) {
    this.s.push(tag);
    return this;
  }
  toString() {
    return this.s.join('');
  }
}

export function poly(o, p, cls, extra = '') {
  o.add(`<polygon class="${cls}" points="${pts(p)}"${extra}/>`);
}

// ---------- boxes ----------
// material m -> classes m+'t' (top), m+'l' (+y face), m+'r' (+x face)
export function box(o, x, y, z, dx, dy, dz, m = 'k', topCls) {
  const L = [P(x, y + dy, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)];
  const Rf = [P(x + dx, y, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x + dx, y, z + dz)];
  const T = [P(x, y, z + dz), P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)];
  poly(o, L, m + 'l');
  poly(o, Rf, m + 'r');
  poly(o, T, topCls || m + 't');
}

// stairs. dir '+x': descending toward +x (risers face +x). dir '+y': descending toward +y.
// (x,y) = corner of the highest step; treads go from zt down by (zt - zend) / n; boxes start at zb
export function stairs(o, { x, y, zb = 0, zt, zend = 0, n, run, width, dir = '+x', m = 'k', topCls }) {
  const rise = (zt - zend) / n;
  for (let i = 0; i < n; i++) {
    const h = zt - i * rise - zb;
    if (dir === '+x') box(o, x + i * run, y, zb, run, width, h, m, topCls);
    else box(o, x, y + i * run, zb, width, run, h, m, topCls);
  }
}
// ascending stairs placed against a wall: highest at the far end. dir '-x' means climbing toward -x.
export function stairsUp(o, { x, y, zb = 0, zt, n, run, width, dir = '-x', m = 'k', topCls }) {
  const rise = (zt - zb) / n;
  // draw from far (high) to near (low)
  if (dir === '-x') {
    for (let i = n - 1; i >= 0; i--) box(o, x - (i + 1) * run, y, zb, run, width, rise * (i + 1), m, topCls);
  } else if (dir === '-y') {
    for (let i = n - 1; i >= 0; i--) box(o, x, y - (i + 1) * run, zb, width, run, rise * (i + 1), m, topCls);
  }
}

// ---------- arches and niches ----------
export function archShape(u0, u1, v0, v1, n = 16) {
  const r = (u1 - u0) / 2;
  const cu = (u0 + u1) / 2;
  const out = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
  ];
  for (let i = 1; i < n; i++) {
    const a = (Math.PI * i) / n;
    out.push([cu + r * Math.cos(a), v1 + r * Math.sin(a)]);
  }
  out.push([u0, v1]);
  return out;
}
export const rectShape = (u0, u1, v0, v1) => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];

// niche / doorway in a face. plane 'y': face at y=c, shape in (x,z). plane 'x': face at x=c, shape in (y,z)
// returns { clip } id so callers can draw things inside the opening.
export function niche(o, { plane = 'y', c, shape, depth, back = 'kin', floor = 'kt', jamb, inside }) {
  const proj = plane === 'y' ? (u, v, d = 0) => P(u, c - d, v) : (u, v, d = 0) => P(c - d, u, v);
  const open = shape.map(([u, v]) => proj(u, v));
  const bk = shape.map(([u, v]) => proj(u, v, depth));
  const id = nextId('n');
  o.add(`<clipPath id="${id}"><polygon points="${pts(open)}"/></clipPath>`);
  poly(o, open, jamb || (plane === 'y' ? 'kr' : 'kl'));
  o.add(`<g clip-path="url(#${id})">`);
  const [b0, b1] = [shape[0], shape[1]];
  poly(o, [proj(b0[0], b0[1]), proj(b1[0], b1[1]), proj(b1[0], b1[1], depth), proj(b0[0], b0[1], depth)], floor);
  poly(o, bk, back);
  if (inside) inside(o);
  o.add('</g>');
  return id;
}

// flat panel on a wall (picture frame etc.), slightly raised
export function wallPanel(o, { plane = 'y', c, u0, u1, v0, v1, t = 3, m = 'c' }) {
  if (plane === 'y') box(o, u0, c, v0, u1 - u0, t, v1 - v0, m);
  else box(o, c, u0, v0, t, u1 - u0, v1 - v0, m);
}

// ---------- round things ----------
export function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  up.pop();
  lo.pop();
  return lo.concat(up);
}
export const circle2 = (cx, cy, r, n = 36) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

// vertical prism of a convex horizontal shape [(x,y)...]
export function prism(o, shape, z0, z1, side = 'cs', top = 'ct') {
  const bot = shape.map(([x, y]) => P(x, y, z0));
  const tp = shape.map(([x, y]) => P(x, y, z1));
  poly(o, hull(bot.concat(tp)), side);
  poly(o, tp, top);
}
export function cyl(o, cx, cy, z0, r, h, side = 'cs', top = 'ct', n = 36) {
  prism(o, circle2(cx, cy, r, n), z0, z0 + h, side, top);
}
// rounded top for a clay box: a horizontal half cylinder lying on the box top at height z.
// axis 'x': runs from a0 to a1 along x, centred on y = c. axis 'y': runs along y, centred on x = c.
export function halfCyl(o, { axis = 'x', a0, a1, c, z, r, n = 12, side = 'ccap', end }) {
  const ring = Array.from({ length: n + 1 }, (_, i) => {
    const t = (Math.PI * i) / n;
    return [c + r * Math.cos(t), z + r * Math.sin(t)];
  });
  const at = (a, [u, zz]) => (axis === 'x' ? P(a, u, zz) : P(u, a, zz));
  poly(o, hull(ring.map((q) => at(a0, q)).concat(ring.map((q) => at(a1, q)))), side);
  // the end that faces the viewer (+x or +y)
  poly(o, ring.map((q) => at(a1, q)), end || (axis === 'x' ? 'cr' : 'cl'));
}
// dome (half ellipsoid) sitting at z0
export function dome(o, cx, cy, z0, r, h, cls = 'cdome') {
  const all = [];
  for (let k = 0; k <= 6; k++) {
    const a = (Math.PI / 2) * (k / 6);
    for (const [x, y] of circle2(cx, cy, r * Math.cos(a), 28)) all.push(P(x, y, z0 + h * Math.sin(a)));
  }
  poly(o, hull(all), cls);
}
export function bowl(o, cx, cy, z0, r, h, cls = 'dbowl', rim = 'dbrim') {
  const all = [];
  for (let k = 0; k <= 5; k++) {
    const a = (Math.PI / 2) * (k / 5);
    for (const [x, y] of circle2(cx, cy, r * Math.sin(a) + 0.01, 28)) all.push(P(x, y, z0 + h - h * Math.cos(a)));
  }
  poly(o, hull(all), cls);
  poly(o, circle2(cx, cy, r * 0.82, 28).map(([x, y]) => P(x, y, z0 + h)), rim);
}
export function shadow(o, cx, cy, z, rx, ry, op = 1) {
  const pts2 = Array.from({ length: 28 }, (_, i) => {
    const a = (2 * Math.PI * i) / 28;
    return P(cx + rx * Math.cos(a), cy + ry * Math.sin(a), z);
  });
  poly(o, pts2, 'shd', op < 1 ? ` opacity="${op}"` : '');
}

// ---------- hanging bulb ----------
export function bulb(o, x, y, z, len = 600, glow = 18) {
  const [X, Y] = P(x, y, z);
  o.add(
    `<g class="bulb"><line class="wire" x1="${r1(X)}" y1="${r1(Y - len)}" x2="${r1(X)}" y2="${r1(Y - 3)}"/>` +
      `<circle class="halo" cx="${r1(X)}" cy="${r1(Y + 1)}" r="${glow}"/>` +
      `<rect class="cap" x="${r1(X - 1.3)}" y="${r1(Y - 4.6)}" width="2.6" height="2.6"/>` +
      `<ellipse class="glass" cx="${r1(X)}" cy="${r1(Y)}" rx="1.9" ry="2.5"/></g>`,
  );
}

// ---------- seated figure (screen space, s = scale) ----------
export function figure(o, x, y, z, s = 1) {
  const [X, Y] = P(x, y, z);
  o.add(
    `<g class="fig" transform="translate(${r1(X)} ${r1(Y)}) scale(${s})">` +
      `<ellipse cx="1" cy="0.5" rx="15" ry="5" class="shd"/>` +
      `<ellipse cx="0" cy="-3" rx="10.5" ry="4.4" fill="#161615"/>` +
      `<path d="M-7-3.5C-7.5-9-6.8-13.5-4.6-15.2L4.6-15.2C6.8-13.5 7.5-9 7-3.5Z" fill="#1d1c1b"/>` +
      `<path d="M-4.6-15.2C-2.5-16.4 2.5-16.4 4.6-15.2L3.4-12.6-3.4-12.6Z" fill="#262523"/>` +
      `<circle cx="-4.2" cy="-5.6" r="1.35" fill="#d9c4a6"/><circle cx="4.4" cy="-5.4" r="1.35" fill="#d9c4a6"/>` +
      `<path d="M-5.6-19C-6.2-15.5-5.6-13.4-4.2-12.6L4.2-12.6C5.6-13.4 6.2-15.5 5.6-19Z" fill="#2e231c"/>` +
      `<ellipse cx="0" cy="-17.9" rx="4" ry="4.3" fill="#e4cfb2"/>` +
      `<circle cx="-1.5" cy="-17.6" r=".45" fill="#2a211c"/><circle cx="1.5" cy="-17.6" r=".45" fill="#2a211c"/>` +
      `<path d="M-5.9-20.2C-5.9-25.8 5.9-25.8 5.9-20.2Z" fill="#ece5d8"/>` +
      `<rect x="-6.4" y="-21.6" width="12.8" height="2.6" rx="1.3" fill="#d6ccba"/>` +
      `<circle cx="0" cy="-25.6" r="1.4" fill="#ece5d8"/>` +
      `</g>`,
  );
}

// ---------- letters ----------
export const LW = 60;
export const LH = 120;
// horizontal stretch of every glyph: the key visual's letters are about 0.65 wide to 1 tall, the drawn glyphs 0.5
export const SX = 1.2;
const dedupe = (a) => a.filter((p, i) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-6);
// The letterforms come from the 3D hero's glyph grid (final/3d/glyphs.js: W 6.2 x H 10, square D and P with a
// small corner radius, hairline counters, flat-topped A), scaled into this file's LW x LH box, so the SVG hero,
// the header and footer logos and the 3D hero all draw the same letters. Curves are flattened into short segments.
function ringsFrom(cmds) {
  const sx = LW / GW, sy = LH / GH;
  const out = [];
  for (const c of cmds) {
    if (c[0] === 'M' || c[0] === 'L') out.push([c[1], c[2]]);
    else if (c[0] === 'C') {
      const [x0, y0] = out[out.length - 1];
      for (let i = 1; i <= 6; i++) {
        const t = i / 6, m = 1 - t;
        out.push([
          m * m * m * x0 + 3 * m * m * t * c[1] + 3 * m * t * t * c[3] + t * t * t * c[5],
          m * m * m * y0 + 3 * m * m * t * c[2] + 3 * m * t * t * c[4] + t * t * t * c[6],
        ]);
      }
    }
  }
  return dedupe(out.map(([x, y]) => [x * sx, y * sy]));
}
const glyphsAt = (slit) =>
  Object.fromEntries(
    ['D', 'E', 'P', 'F', 'L', 'A', 'T'].map((ch) => {
      const g = glyph3d(ch, slit);
      return [ch, { outer: ringsFrom(g.outline), holes: g.holes.map(ringsFrom) }];
    }),
  );
export const GLYPHS = glyphsAt();
const area = (r) => r.reduce((s, p, i) => s + (p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1]), 0) / 2;
const orient = (r, ccw) => ((area(r) > 0) === ccw ? r : r.slice().reverse());

// Extruded letter standing in the plane y = y0 (front), extruding toward -y by depth.
// anim: sides grow out of the back plane (scaleY on a local frame), the face slides forward.
export function letter(o, ch, { x0, z0, y0 = 0, depth = 16, i = 0, sideTop = 'lt', sideR = 'lr', front = 'lf' }) {
  const g = GLYPHS[ch];
  const rings = [orient(g.outer, true), ...g.holes.map((h) => orient(h, false))];
  const W = (u, v) => P(x0 + u * SX, y0, z0 + v);
  const e = [-AY[0] * depth, -AY[1] * depth]; // screen offset of the back plane
  let sides = '';
  for (const ring of rings) {
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k];
      const b = ring[(k + 1) % ring.length];
      const du = (b[0] - a[0]) * SX;
      const dv = b[1] - a[1];
      const len = Math.hypot(du, dv);
      const nu = dv / len;
      const nv = -du / len;
      if (nu * VIEW[0] + nv * VIEW[2] <= 1e-6) continue;
      const cls = nv > 0.55 ? sideTop : sideR;
      const A = W(a[0], a[1]);
      const B = W(b[0], b[1]);
      // local frame: origin at back-plane A, x axis along edge, y axis toward the front
      sides += `<g transform="matrix(${r1(B[0] - A[0])} ${r1(B[1] - A[1])} ${r1(-e[0])} ${r1(-e[1])} ${r1(A[0] + e[0])} ${r1(A[1] + e[1])})"><rect class="xs ${cls}" width="1" height="1"/></g>`;
    }
  }
  const face = pathD(rings.map((r) => r.map(([u, v]) => W(u, v))));
  o.add(
    `<g class="ltr" style="--i:${i};--ex:${r1(e[0])}px;--ey:${r1(e[1])}px"><g class="ltr-s">${sides}</g><path class="ltr-f ${front}" d="${face}" fill-rule="evenodd"/></g>`,
  );
}

// flat 2D logo (front view) for nav/footer, with a small extrusion toward up-right
// slit: the counter and arm-gap width in glyph units (final/3d/glyphs.js; undefined keeps the hero's 0.5)
export function flatLogo({ scale = 1, depth = 7, gap = 1.5, rowGap = 2, slit } = {}) {
  const rows = [
    ['D', 'E', 'E', 'P'],
    ['F', 'L', 'A', 'T'],
  ];
  const G = slit === undefined ? GLYPHS : glyphsAt(slit);
  const ex = depth * 0.8;
  const ey = depth * 0.6;
  // bone letters and the two ember letters (D of DEEP, F of FLAT) are kept apart so each gets its own colour
  let back = '';
  let front = '';
  let emberBack = '';
  let emberFront = '';
  const totalW = 4 * LW * SX + 3 * gap;
  const totalH = 2 * LH + rowGap;
  rows.forEach((row, ri) => {
    row.forEach((ch, ci) => {
      const g = G[ch];
      const ox = ci * (LW * SX + gap);
      const oy = ri * (LH + rowGap);
      const rings = [g.outer, ...g.holes].map((r) => r.map(([u, v]) => [ox + u * SX, oy + (LH - v)]));
      const d = pathD(rings);
      // extrusion: a few stacked copies
      let b = '';
      for (let s = depth; s > 0; s -= 1.5) b += `<path d="${d}" transform="translate(${r1((s / depth) * ex)} ${r1(-(s / depth) * ey)})"/>`;
      if (ci === 0) {
        emberBack += b;
        emberFront += `<path d="${d}"/>`;
      } else {
        back += b;
        front += `<path d="${d}"/>`;
      }
    });
  });
  return { back, front, emberBack, emberFront, w: totalW + ex, h: totalH + ey, ex, ey };
}
