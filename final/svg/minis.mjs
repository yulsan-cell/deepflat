// Portfolio miniatures (same grammar as the key visual), studio icons and the flat logo.
import { Out, P, box, niche, archShape, rectShape, wallPanel, cyl, bowl, shadow, bulb, stairsUp, flatLogo, R } from './iso.mjs';
import { sofaY, loungeChair, diningChair, mushroomLamp } from './scene.mjs';
import { EMBER } from './defs.mjs';
import { glyph as glyph3d, W as GW, H as GH } from '../3d/glyphs.js';

// viewBox from every polygon point in the markup
function fit(svg, m = 10, minW = 0) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const mm of svg.matchAll(/points="([^"]+)"/g)) {
    for (const pr of mm[1].split(' ')) {
      const [x, y] = pr.split(',').map(Number);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  let w = x1 - x0 + 2 * m;
  if (w < minW) {
    x0 -= (minW - w) / 2;
    w = minW;
  }
  return `${R(x0 - m)} ${R(y0 - m)} ${R(w)} ${R(y1 - y0 + 2 * m)}`;
}

const W = 150;
const D = 120;
const HW = 82;
function room(o, { w = W, d = D, h = HW } = {}) {
  const t = 8;
  box(o, -t, -t, -18, w + t, d + t, 18, 'k', 'mfl');
  box(o, -t, -t, 0, t, d + t, h, 'k');
  box(o, 0, -t, 0, w, t, h, 'k');
}
function sofaX(o, x, y, len, s = 1) {
  // long axis along x, facing +y
  shadow(o, x + len / 2, y + 20 * s, 0, len / 2 + 10, 30 * s, 0.85);
  box(o, x, y, 0, len, 12 * s, 30 * s, 'c');
  box(o, x, y, 0, 11 * s, 38 * s, 21 * s, 'c');
  box(o, x + 11 * s, y + 12 * s, 0, len - 22 * s, 26 * s, 13 * s, 'c');
  box(o, x + len - 11 * s, y, 0, 11 * s, 38 * s, 21 * s, 'c');
}
function roundTable(o, x, y, r = 12, h = 26) {
  shadow(o, x, y, 0, r + 8, r + 8, 0.8);
  cyl(o, x, y, 0, 3, h - 3, 'cs', 'ct');
  cyl(o, x, y, h - 3, r, 3, 'cs', 'ct');
}
function stool(o, x, y) {
  shadow(o, x, y, 0, 9, 9, 0.7);
  cyl(o, x, y, 0, 6, 16, 'cs', 'ct');
}
function shelfNiches(o, c, u0, u1, rows) {
  for (const [v0, v1] of rows) niche(o, { c, shape: rectShape(u0, u1, v0, v1), depth: 10, back: 'kin', floor: 'cr', jamb: 'cr' });
}

// card fallbacks: drawn only when a project's rendered thumbnail is missing (final/svg/portfolio.mjs)
const SCENES = {
  'mokdong-apt-25'(o) {
    room(o);
    // the white oak storage wall along the back
    box(o, 62, 0, 0, 84, 14, 72, 'c');
    for (const u of [83, 104, 125]) wallPanel(o, { c: 14, u0: u - 0.4, u1: u + 0.4, v0: 4, v1: 68, t: 0.6, m: 'cd' });
    box(o, 18, 36, 0, 96, 64, 2, 'r');
    sofaX(o, 24, 40, 72, 0.85);
    box(o, 50, 82, 0, 28, 16, 9, 'c');
    mushroomLamp(o, 128, 96, 0, 0.7);
  },
  'seongsu-apt-34'(o) {
    room(o);
    box(o, 64, 0, 0, 80, 14, 72, 'c');
    shelfNiches(o, 14, 68, 102, [
      [6, 24],
      [28, 46],
      [50, 68],
    ]);
    shelfNiches(o, 14, 106, 140, [
      [6, 24],
      [28, 46],
      [50, 68],
    ]);
    box(o, 0, 30, 0, 30, 3, 24, 'c');
    box(o, 0, 79, 0, 30, 3, 24, 'c');
    box(o, 0, 30, 24, 32, 52, 4, 'c');
    diningChair(o, 32, 46, 0, 1);
    loungeChair(o, 96, 62, 0, 1.15);
    mushroomLamp(o, 136, 52, 0, 0.75);
  },
  'banpo-apt-41'(o) {
    room(o);
    for (let i = 0; i < 4; i++) wallPanel(o, { c: 0, u0: 10 + i * 34, u1: 42 + i * 34, v0: 0, v1: 66, t: 1.6 });
    mushroomLamp(o, 22, 30, 0, 0.75);
    box(o, 28, 40, 0, 96, 64, 2, 'r');
    sofaX(o, 36, 42, 80, 0.85);
    roundTable(o, 124, 98, 11, 20);
    box(o, 64, 86, 0, 30, 18, 9, 'c');
  },
  'hannam-apt-52'(o) {
    room(o);
    niche(o, { plane: 'x', c: 0, shape: archShape(16, 44, 10, 46), depth: 6, back: 'klit2', floor: 'kt' });
    box(o, 82, 0, 0, 64, 14, 27, 'c', 'dt');
    wallPanel(o, { c: 0, u0: 86, u1: 142, v0: 46, v1: 66, t: 3 });
    box(o, 18, 36, 0, 76, 72, 2, 'r');
    sofaY(o, 16, 42, 62, 0.82);
    box(o, 58, 58, 0, 28, 34, 10, 'c');
    cyl(o, 70, 70, 10, 3.5, 9, 'ds', 'dt');
    box(o, 100, 42, 0, 42, 18, 25, 'c');
    bulb(o, 112, 51, 58, 300, 10);
    bulb(o, 130, 51, 58, 300, 10);
  },
  'cheongdam-penthouse-78'(o) {
    room(o);
    niche(o, { c: 0, shape: archShape(58, 92, 16, 52), depth: 6, back: 'klit2', floor: 'kt' });
    box(o, 12, 26, 0, 120, 86, 2, 'r');
    sofaY(o, 10, 22, 92, 1);
    box(o, 64, 44, 0, 44, 50, 13, 'd');
    bowl(o, 86, 66, 13, 8, 4.5, 'cbowl', 'cbrim');
    loungeChair(o, 112, 18, 0, 1.05);
    loungeChair(o, 112, 70, 0, 1.05);
  },
  'pangyo-house-62'(o) {
    room(o, { h: 100 });
    // the window opened to the floor on the yard side, and a stair climbing the back wall
    niche(o, { plane: 'x', c: 0, shape: rectShape(26, 96, 0, 70), depth: 6, back: 'klit2', floor: 'kt' });
    stairsUp(o, { x: 146, y: 2, zb: 0, zt: 60, n: 6, run: 9, width: 20, dir: '-x', m: 'k' });
    box(o, 20, 34, 0, 92, 70, 2, 'r');
    sofaY(o, 18, 40, 60, 0.82);
    loungeChair(o, 96, 66, 0, 1.1);
    mushroomLamp(o, 132, 96, 0, 0.7);
  },
  'yongin-townhouse-54'(o) {
    room(o);
    box(o, 64, 0, 0, 82, 16, 30, 'c', 'dt');
    box(o, 70, 0, 50, 70, 10, 16, 'c');
    box(o, 14, 36, 0, 64, 68, 2, 'r');
    sofaY(o, 14, 40, 58, 0.8);
    box(o, 88, 44, 0, 50, 18, 28, 'c', 'dt');
    stool(o, 100, 76);
    stool(o, 124, 76);
  },
};

/** the card's fallback miniature for a project slug (null when there is no scene for it) */
export function miniSvg(slug) {
  const scene = SCENES[slug];
  if (!scene) return null;
  const o = new Out();
  scene(o);
  const body = o.toString();
  return `<svg class="df mini" viewBox="${fit(body, 8)}" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function buildIcons() {
  const make = (fn, m = 8) => {
    const o = new Out();
    fn(o);
    const body = o.toString();
    return `<svg class="df icon" viewBox="${fit(body, m)}" aria-hidden="true" focusable="false">${body}</svg>`;
  };
  // one person from drawing to site: a drawing sheet, then the same block built with stairs
  const iconBuild = make((o) => {
    box(o, 0, 40, 0, 56, 44, 3, 'c');
    for (const v of [10, 20, 30]) box(o, 6, 40 + v, 3, 30, 1.6, 0.6, 'cd');
    box(o, 76, 0, 0, 52, 52, 46, 'k');
    niche(o, { c: 52, shape: archShape(86, 104, 0, 20), depth: 6, back: 'klit2', floor: 'kt' });
    for (let i = 0; i < 3; i++) box(o, 128 + i * 10, 8, 0, 10, 36, 34 - i * 11, 'k');
  });
  // itemised estimate: slabs stacked one item at a time
  const iconItems = make((o) => {
    const rows = [80, 64, 72, 48, 58];
    rows.forEach((len, i) => box(o, 0, 0, i * 10, len, 40, 7, i === 4 ? 'c' : i % 2 ? 'k' : 'c'));
  });
  // light and material: a warm bulb over material samples
  const iconLight = make((o) => {
    shadow(o, 50, 34, 0, 62, 40, 0.9);
    box(o, 0, 0, 0, 40, 40, 40, 'k');
    box(o, 46, 8, 0, 34, 34, 24, 'c');
    box(o, 86, 16, 0, 28, 28, 13, 'r');
    bulb(o, 52, 26, 86, 160, 24);
    o.add(`<polygon class="ghost" points="${[P(52, 26, 98), P(46, 26, 98), P(52, 32, 98)].map((q) => q.map(R).join(',')).join(' ')}"/>`);
  }, 10);
  return { 'icon-build': iconBuild, 'icon-items': iconItems, 'icon-light': iconLight };
}

// the header's small logo (42px, 50 on phones, scaling down to about 39px on 320px screens): counters and arm gaps
// 2.4 times the hero's, a shallower extrusion and wider seams, so at that size the D and F show their counters and
// every letter its own edge (the footer keeps the full-size letters). Compared at 2x and 3x in drafts/tools/shots/logo-cands.
export const NAV_LOGO = { depth: 5, slit: 1.2, gap: 5, rowGap: 5 };

export function buildFlatLogo(opts = { depth: 9 }) {
  const l = flatLogo(opts);
  // every extrusion is painted before every face, so a neighbour's extrusion never covers a face
  return `<svg class="flatlogo" viewBox="0 ${R(-l.ey)} ${R(l.w)} ${R(l.h)}" role="img" aria-label="DEEPFLAT"><g fill-rule="evenodd"><g class="fl-b">${l.back}</g><g class="fl-eb">${l.emberBack}</g><g class="fl-f">${l.front}</g><g class="fl-ef">${l.emberFront}</g></g></svg>`;
}

// favicon: the ember D on night, with its back offset up-right like the logos. Drawn from the same D as every other
// logo (final/3d/glyphs.js), in the same ember values (defs.mjs EMBER). The counter stays 2 units wide (1px at 16px).
export function buildFavicon() {
  const g = glyph3d('D');
  const s = 22 / GH; // the D is 22 units tall
  const x0 = (32 - (GW * s + 1.5)) / 2;
  const y0 = 28.5;
  const n = (v) => String(Math.round(v * 100) / 100);
  const path = (dx, dy) =>
    g.outline
      .map((c) => {
        if (c[0] === 'Z') return 'Z';
        const pts = [];
        for (let i = 1; i < c.length; i += 2) pts.push(n(x0 + dx + c[i] * s) + ' ' + n(y0 + dy - c[i + 1] * s));
        return c[0] + pts.join(' ');
      })
      .join('');
  const [hole] = g.holes;
  const hx = [hole[0][1], hole[2][1]], hy = [hole[0][2], hole[1][2]];
  const cx = x0 + ((hx[0] + hx[1]) / 2) * s;
  const slit = `M${n(cx - 1)} ${n(y0 - Math.max(...hy) * s)}h2V${n(y0 - Math.min(...hy) * s)}h-2Z`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='#1b1b1a'/>` +
    `<path d='${path(1.5, -1.5)}' fill='${EMBER.side}'/><path d='${path(0, 0)}' fill='${EMBER.front}'/><path d='${slit}' fill='#1b1b1a'/></svg>`;
  return `<link rel="icon" href="data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}">`;
}
