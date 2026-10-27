// DEEPFLAT hero world, redrawn from the key visual (assets/deepflat-key.png).
import { Out, P, box, stairs, stairsUp, niche, archShape, rectShape, wallPanel, cyl, halfCyl, dome, bowl, prism, circle2, hull, shadow, bulb, figure, letter, LW, LH, SX, poly, R } from './iso.mjs';

// hairline seams: DEEP / FLAT reads as one dense slab, as in the key visual
export const LOGO = { gap: 1.5, rowGap: 2, depth: 16, z0: 200 };
const COL = LW * SX + LOGO.gap;

// ---------- furniture (cream clay) ----------
// soft toy-like clay: the back and arms are boxes capped with half cylinders, the seat sits just below the arms
export function sofaY(o, x, y, len, s = 1) {
  // long axis along y, facing +x
  shadow(o, x + 22 * s, y + len / 2, 0, 36 * s, len / 2 + 12, 0.9);
  const rb = 6 * s; // back cap radius (half the back thickness)
  const ra = 5.5 * s; // arm cap radius (half the arm width)
  box(o, x, y, 0, 12 * s, len, 27 * s - rb, 'c'); // back
  halfCyl(o, { axis: 'y', a0: y, a1: y + len, c: x + rb, z: 27 * s - rb, r: rb });
  box(o, x, y, 0, 40 * s, 11 * s, 24 * s - ra, 'c'); // far arm
  halfCyl(o, { axis: 'x', a0: x, a1: x + 40 * s, c: y + ra, z: 24 * s - ra, r: ra });
  box(o, x + 12 * s, y + 11 * s, 0, 28 * s, len - 22 * s, 18 * s, 'c'); // seat
  box(o, x, y + len - 11 * s, 0, 40 * s, 11 * s, 24 * s - ra, 'c'); // near arm
  halfCyl(o, { axis: 'x', a0: x, a1: x + 40 * s, c: y + len - ra, z: 24 * s - ra, r: ra });
}
export function loungeChair(o, x, y, z, s = 1) {
  // facing +y (toward the viewer's left)
  shadow(o, x + 13 * s, y + 14 * s, z, 20 * s, 18 * s, 0.85);
  const rb = 4 * s;
  const ra = 3 * s;
  box(o, x, y, z, 26 * s, 8 * s, 27 * s - rb, 'c'); // back
  halfCyl(o, { axis: 'x', a0: x, a1: x + 26 * s, c: y + rb, z: z + 27 * s - rb, r: rb });
  box(o, x, y + 8 * s, z, 6 * s, 18 * s, 19 * s - ra, 'c'); // far arm
  halfCyl(o, { axis: 'y', a0: y + 8 * s, a1: y + 26 * s, c: x + ra, z: z + 19 * s - ra, r: ra });
  box(o, x + 6 * s, y + 8 * s, z, 14 * s, 18 * s, 14 * s, 'c'); // seat
  box(o, x + 20 * s, y + 8 * s, z, 6 * s, 18 * s, 19 * s - ra, 'c'); // near arm
  halfCyl(o, { axis: 'y', a0: y + 8 * s, a1: y + 26 * s, c: x + 20 * s + ra, z: z + 19 * s - ra, r: ra });
}
export function diningChair(o, x, y, z, s = 1) {
  // facing -x: the back is on the +x side
  shadow(o, x + 9 * s, y + 8 * s, z, 14 * s, 12 * s, 0.85);
  box(o, x, y, z, 15 * s, 3 * s, 16 * s, 'c');
  box(o, x, y + 3 * s, z + 12 * s, 15 * s, 10 * s, 4 * s, 'c');
  box(o, x, y + 13 * s, z, 15 * s, 3 * s, 16 * s, 'c');
  box(o, x + 12 * s, y, z + 16 * s, 3 * s, 16 * s, 24 * s, 'c');
}
export function coffeeTable(o, x, y, w, d) {
  shadow(o, x + w / 2, y + d / 2, 0, w / 2 + 14, d / 2 + 14, 0.9);
  box(o, x + 7, y + 7, 0, w - 14, d - 14, 10, 'c');
  box(o, x, y, 10, w, d, 8, 'c');
  box(o, x + 14, y + 12, 18, 40, 32, 3.5, 'd'); // tray
  // two stacked books (the black vase with a twig is the dining table's alone)
  box(o, x + 16, y + 13, 21.5, 36, 25, 4.3, 'sa');
  box(o, x + 19.6, y + 16.6, 25.8, 36, 25, 4.3, 'cd');
  bowl(o, x + 38, y + 52, 18, 10, 5.5, 'cbowl', 'cbrim');
}
// stadium (two half circles joined by straight sides) round (cx, cy), long axis along x; convex
const stadium = (cx, cy, half, r, n = 14) => {
  const shape = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    shape.push([cx + half + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / n;
    shape.push([cx - half + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return shape;
};
// the long oval table of the key visual (a cream pedestal, a black vase with a twig, a dark bowl): now the dining table
export function ovalTable(o, cx, cy, { half = 36, r = 32, z = 0, h = 45 } = {}) {
  const k = r / 32;
  shadow(o, cx, cy, z, half + r + 8, r + 10, 0.9);
  cyl(o, cx + 6 * k, cy + 4 * k, z, 14 * k, h - 7 * k, 'cs', 'ct', 24);
  prism(o, stadium(cx, cy, half, r), z + h - 7 * k, z + h, 'cs', 'ct');
  const vx0 = cx + half * 0.55, vy0 = cy - 8.4;
  cyl(o, vx0, vy0, z + h, 3.7, 15, 'ds', 'dt', 16);
  const [vx, vy] = P(vx0, vy0, z + h + 15);
  const t = (n) => R(n * 0.78);
  o.add(
    `<g class="twig"><path d="M${R(vx)} ${R(vy)}c${t(-1)}${t(-10)} ${t(1)}${t(-19)} ${t(-3)}${t(-30)}M${R(vx)} ${R(vy - t(9))}c${t(4)}${t(-6)} ${t(10)}${t(-9)} ${t(11)}${t(-17)}M${R(vx - t(1))} ${R(vy - t(18))}c${t(-5)}${t(-3)} ${t(-8)}${t(-9)} ${t(-9)}${t(-13)}M${R(vx + t(4))} ${R(vy - t(15))}c${t(3)}${t(-1)} ${t(7)}${t(-4)} ${t(7)}${t(-9)}"/>` +
      `<circle cx="${R(vx - t(3))}" cy="${R(vy - t(30))}" r="1.5"/><circle cx="${R(vx + t(11))}" cy="${R(vy - t(26))}" r="1.3"/><circle cx="${R(vx - t(10))}" cy="${R(vy - t(31))}" r="1.2"/><circle cx="${R(vx + t(11))}" cy="${R(vy - t(24))}" r="1.1"/></g>`,
  );
  bowl(o, cx - half * 0.35, cy + 7.2, z + h, 9, 5, 'dbowl', 'dbrim');
}
export function mushroomLamp(o, x, y, z, s = 1) {
  shadow(o, x, y, z, 18 * s, 15 * s, 0.85);
  cyl(o, x, y, z, 8 * s, 4 * s, 'cs', 'ct');
  cyl(o, x, y, z + 4 * s, 3.4 * s, 18 * s, 'cs', 'ct');
  dome(o, x, y, z + 20 * s, 17 * s, 12 * s, 'cdome');
}

// ---------- one room per level (each piece appears once; sizes follow final/3d/hero.js, 12 units here to 1 there) ----------
// tapered drum standing at z0: bottom radius r0, top radius r1
function frustum(o, cx, cy, z0, r0, r1, h, side = 'cs', top = 'ct') {
  const bot = circle2(cx, cy, r0, 22).map(([x, y]) => P(x, y, z0));
  const tp = circle2(cx, cy, r1, 22).map(([x, y]) => P(x, y, z0 + h));
  poly(o, hull(bot.concat(tp)), side);
  poly(o, tp, top);
}
// living room: floor lamp, a round dark base, a thin pole and a cream drum shade
export function floorLamp(o, x, y, z, s = 1) {
  shadow(o, x + 2, y + 2, z, 13 * s, 12 * s, 0.8);
  cyl(o, x, y, z, 6.7 * s, 1.7 * s, 'ds', 'dt', 20);
  cyl(o, x, y, z + 1.7 * s, 0.9 * s, 50 * s, 'ds', 'dt', 6);
  frustum(o, x, y, z + 51 * s, 11.8 * s, 9.4 * s, 16.2 * s, 'cs', 'ct');
}
// kitchen: base cabinets against a wall at y0 (doors face +y), a sand worktop with a sink and a tall faucet, two jars
export function kitchenCounter(o, x0, y0, z, w, d, h) {
  shadow(o, x0 + w / 2, y0 + d + 2, z, w / 2 + 8, 9, 0.7);
  box(o, x0 + 2, y0, z, w - 4, d - 3, 4, 'd');
  box(o, x0, y0, z + 3.6, w, d, h - 6.7, 'c');
  for (const u of [w / 4, w / 2, (3 * w) / 4]) {
    poly(o, [P(x0 + u - 0.35, y0 + d + 0.2, z + 6.6), P(x0 + u + 0.35, y0 + d + 0.2, z + 6.6), P(x0 + u + 0.35, y0 + d + 0.2, z + h - 4.6), P(x0 + u - 0.35, y0 + d + 0.2, z + h - 4.6)], 'cdl');
  }
  box(o, x0 - 0.7, y0, z + h - 3.1, w + 1.4, d + 1.2, 3.1, 'sa');
  const sx = x0 + w / 2 + w * 0.16;
  poly(o, [P(sx - 9, y0 + 7.8, z + h + 0.1), P(sx + 9, y0 + 7.8, z + h + 0.1), P(sx + 9, y0 + 21, z + h + 0.1), P(sx - 9, y0 + 21, z + h + 0.1)], 'dt');
  cyl(o, sx, y0 + 4.2, z + h, 0.9, 12, 'ds', 'dt', 6);
  box(o, sx - 0.7, y0 + 3.6, z + h + 10.8, 1.4, 7.2, 1.4, 'd');
  cyl(o, x0 + 9.6, y0 + 8.6, z + h, 3.6, 9, 'cdl', 'cdt', 14);
  cyl(o, x0 + 18, y0 + 12.2, z + h, 3, 6, 'cs', 'ct', 14);
}
// dining chair facing +x (the mirror of diningChair above): a solid back down to the floor at the -x end, two side
// panels, the seat between; (x, y) is its far corner
export function diningChairPX(o, x, y, z, s = 1) {
  shadow(o, x + 9 * s, y + 8 * s, z, 13 * s, 12 * s, 0.85);
  box(o, x, y, z, 3 * s, 16 * s, 40 * s, 'c');
  box(o, x + 3 * s, y, z, 12 * s, 3 * s, 16 * s, 'c');
  box(o, x + 3 * s, y + 3 * s, z + 12 * s, 12 * s, 10 * s, 4 * s, 'c');
  box(o, x + 3 * s, y + 13 * s, z, 12 * s, 3 * s, 16 * s, 'c');
}
// bedroom: a low platform bed round (cx, cy), head toward -y: sand base, cream mattress, two pillows, a clay throw at the foot
export function bed(o, cx, cy, z, w, l) {
  const x0 = cx - w / 2, y0 = cy - l / 2;
  shadow(o, cx + 3, cy + 3, z, w / 2 + 10, l / 2 + 10, 0.85);
  box(o, x0, y0, z, w, l, 9, 'sa');
  box(o, x0 + 1.5, y0 + 1.8, z + 8.4, w - 3, l - 3.6, 9.6, 'c');
  const pw = w / 2 - 5.4;
  for (const side of [-1, 1]) box(o, cx + side * (w / 4 - 0.2) - pw / 2, y0 + 4.5, z + 17, pw, 15, 6, 'c');
  box(o, x0 - 0.2, cy + l / 2 - 25.2, z + 13.4, w + 0.4, 18, 5.1, 'cd');
}
// bedside table with a drawer and a small lamp
export function nightstand(o, cx, cy, z) {
  shadow(o, cx + 2, cy + 2, z, 15, 14, 0.75);
  box(o, cx - 9.6, cy - 9, z, 19.2, 18, 18, 'c');
  poly(o, [P(cx - 7.2, cy + 9.1, z + 11.4), P(cx + 7.2, cy + 9.1, z + 11.4), P(cx + 7.2, cy + 9.1, z + 12), P(cx - 7.2, cy + 9.1, z + 12)], 'cdl');
  cyl(o, cx + 1.8, cy - 1.2, z + 18, 2.9, 1.7, 'ds', 'dt', 12);
  cyl(o, cx + 1.8, cy - 1.2, z + 19.4, 0.6, 6.6, 'ds', 'dt', 6);
  frustum(o, cx + 1.8, cy - 1.2, z + 24.6, 5.3, 3.8, 6.6, 'cs', 'ct');
}
// bath: a freestanding oval tub, long axis along x, a darker basin inside the rim
export function tub(o, cx, cy, z, half, r, h) {
  shadow(o, cx + 2, cy + 2, z, half + r + 5, r + 4, 0.75);
  prism(o, stadium(cx, cy, half, r), z, z + h, 'cs', 'ct');
  poly(o, stadium(cx, cy, half - 0.6, r - 2.9).map(([x, y]) => P(x, y, z + h)), 'sal');
  poly(o, stadium(cx + 0.6, cy + 1, half - 1.8, r - 4.6).map(([x, y]) => P(x, y, z + h)), 'cdt');
}
// bath: a slim wall-hung vanity with a vessel basin, a round mirror above it, on a wall facing +y at y = wy.
// The counter top is at 38.4, a little above the dining table, as a real vanity is
export function vanity(o, cx, wy, z, w) {
  const ring = (rr, dy, cls) => poly(o, circle2(0, 0, rr, 32).map(([a, b]) => P(cx + a, wy + dy, z + 63.6 + b)), cls);
  ring(9.6, 0.4, 'ct');
  ring(7.8, 1.2, 'mir');
  shadow(o, cx, wy + 8, z, w / 2 + 3, 7, 0.55);
  box(o, cx - w / 2, wy, z + 31.8, w, 13.8, 6.6, 'c');
  bowl(o, cx + w * 0.12, wy + 7.5, z + 38.4, 5, 3, 'cbowl', 'cbrim');
}
// study: a writing desk round (cx, cy), cream top on two sand slab legs, a slim drawer, a dark notebook
export function desk(o, cx, cy, z, w, d, h) {
  const x0 = cx - w / 2, y0 = cy - d / 2;
  shadow(o, cx + 3, cy + 3, z, w / 2 + 9, d / 2 + 9, 0.8);
  box(o, x0 + 2.4, y0 + 1.5, z, 3.1, d - 3, h - 2.9, 'sa');
  box(o, x0 + w * 0.5, y0 + 2.4, z + h - 7.7, w * 0.36, d - 4.8, 4.8, 'sa');
  box(o, x0 + w - 5.5, y0 + 1.5, z, 3.1, d - 3, h - 2.9, 'sa');
  box(o, x0, y0, z + h - 2.9, w, d, 2.9, 'c');
  box(o, x0 + w * 0.32 - 7.8, cy - 4.2, z + h, 15.6, 10.8, 1.4, 'd');
}
// study: a swivel chair facing +y; s = units per 3D chair unit
export function deskChair(o, cx, cy, z, s) {
  shadow(o, cx + 1, cy + 1, z, 0.8 * s, 0.75 * s, 0.7);
  cyl(o, cx, cy, z, 0.6 * s, 0.1 * s, 'ds', 'dt', 18);
  cyl(o, cx, cy, z + 0.1 * s, 0.07 * s, 0.8 * s, 'ds', 'dt', 6);
  cyl(o, cx, cy, z + 0.88 * s, 0.64 * s, 0.26 * s, 'cs', 'ct', 22);
  box(o, cx - 0.575 * s, cy - 0.61 * s, z + 1.22 * s, 1.15 * s, 0.22 * s, 0.7 * s, 'c');
}
// study: a low open bookshelf, open toward +y, two rows of books
export function bookshelf(o, x0, y0, z, w, d, h) {
  shadow(o, x0 + w / 2 + 2, y0 + d / 2 + 3, z, w / 2 + 7, d / 2 + 7, 0.7);
  box(o, x0, y0, z, w, d, h, 'c');
  const t = 2;
  const books = ['cd', 'd', 'sa', 'cd', 'r', 'sa', 'd'];
  const rows = [
    [t, h / 2 - 0.8, w - t],
    [h / 2 + 0.8, h - t, w * 0.58],
  ];
  rows.forEach(([v0, v1, end], row) =>
    niche(o, {
      c: y0 + d,
      shape: rectShape(x0 + t, x0 + w - t, z + v0, z + v1),
      depth: d - 1.6,
      back: 'sal',
      floor: 'cl',
      jamb: 'cr',
      inside: (q) => {
        let u = x0 + t + 1;
        let i = row * 3;
        while (u < x0 + end - 3) {
          const bw = 3.2 + ((i * 37) % 5) * 0.45;
          const bh = (v1 - v0) * (0.72 + ((i * 53) % 4) * 0.07);
          box(q, u, y0 + 2.2, z + v0, bw, d - 5, bh, books[i % books.length]);
          u += bw + 0.36;
          i++;
        }
        if (row) bowl(q, x0 + w * 0.78, y0 + d / 2, z + v0, 4.3, 2.6, 'dbowl', 'dbrim');
      },
    }),
  );
}

// ---------- the world ----------
// Every level is a different room of a home:
//   floor 거실 (living) · right ledge 다이닝·주방 (dining, kitchen) · upper right 침실 (bedroom)
//   upper left, in the raised wall 욕실 (bath) · left ledge in front of it 서재 (study)
// ROOMS: the point each room label is pinned to, and the layer it is drawn in (0 back, 1 mid, 2 front), for index.html
export const ROOMS = [
  { k: 'living', at: [139.2, 262, 21], l: 2 },
  { k: 'dining', at: [496.8, 62.4, 147.4], l: 1 },
  { k: 'study', at: [-156, 70.8, 283.2], l: 1 },
  { k: 'bath', at: [-278.4, -12, 273.6], l: 1 },
  { k: 'bed', at: [430.8, -172.8, 487], l: 1 },
];
// the bulb hanging over the dining table (its wire reads like a tag's leader, so no tag name may sit on it)
const PENDANT = [495.6, 48, 196.8];
// each room's furniture on screen, [x0, y0, x1, y1] in scene units, filled while buildHero draws it (see roomPins)
const ROOM_BOX = {};
const track = (o, key, fn) => {
  const i0 = o.s.length;
  fn();
  const box = ROOM_BOX[key] || [Infinity, Infinity, -Infinity, -Infinity];
  for (const m of o.s.slice(i0).join('').matchAll(/points="([^"]+)"/g)) {
    for (const pr of m[1].split(' ')) {
      const [x, y] = pr.split(',').map(Number);
      box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y);
    }
  }
  ROOM_BOX[key] = box;
};
export function buildHero() {
  const back = new Out();
  const mid = new Out();
  const front = new Out();
  const lift = (o, i, fn) => {
    o.add(`<g class="rise" style="--i:${i}">`);
    fn(o);
    o.add('</g>');
  };

  // BACK: floor, far wall, towers
  lift(back, 0, (o) => {
    poly(o, [P(-1500, -620, 0), P(1500, -620, 0), P(1500, 1100, 0), P(-1500, 1100, 0)], 'flo');
    poly(o, [P(-1500, -520, 0), P(1700, -520, 0), P(1700, -520, 1500), P(-1500, -520, 1500)], 'fw');
    box(o, -760, -520, 0, 200, 150, 1200, 'k');
    niche(o, { c: -370, shape: archShape(-700, -676, 300, 640), depth: 18 });
    niche(o, { c: -370, shape: archShape(-640, -616, 300, 640), depth: 18 });
  });
  lift(back, 1, (o) => {
    // tower behind the logo, carrying the framed crescent
    box(o, 40, -400, 0, 150, 120, 1200, 'k');
    // hung low enough that the whole picture stays inside the frame on landscape screens
    wallPanel(o, { plane: 'y', c: -280, u0: 72, u1: 156, v0: 404, v1: 491, t: 3.5 });
    const ring = (r, dx, dz, cls) => poly(o, circle2(0, 0, r, 32).map(([a, b]) => P(114 + a + dx, -276.4, 447 + b + dz)), cls);
    ring(25, 0, 0, 'cmoon');
    ring(23.5, 5, 5, 'ct');
    // left: a wall with a tall slit, right: two towers
    box(o, -560, -440, 0, 330, 130, 900, 'k');
    niche(o, { c: -310, shape: archShape(-470, -446, 180, 470), depth: 16 });
    box(o, 780, -460, 0, 160, 190, 1200, 'k');
    niche(o, { c: -270, shape: archShape(820, 868, 150, 340), depth: 22 });
    niche(o, { plane: 'x', c: 940, shape: archShape(-420, -392, 320, 560), depth: 16 });
  });
  back.add('<g class="late">');
  bulb(back, -500, -290, 340, 1100, 18);
  back.add('</g>');

  // MID: back block, platforms, plinth, letters, figure
  lift(mid, 2, (o) => {
    // long block behind the letters
    box(o, -70, -270, 0, 820, 230, 412, 'k', 'kt');
    // stairs climbing into a lit doorway on its face
    stairsUp(o, { x: 640, y: -40 + 7 * 15, zt: 7 * 15, n: 7, run: 15, width: 58, dir: '-y' });
    niche(o, { c: -40, shape: archShape(644, 694, 105, 205), depth: 40, back: 'klit', floor: 'kfloorlit' });
    niche(o, { c: -40, shape: archShape(560, 582, 150, 340), depth: 14 });
    niche(o, { c: -40, shape: archShape(470, 492, 150, 340), depth: 14 });
    // upper platform (the bedroom)
    box(o, 320, -256, 412, 250, 160, 56, 'k', 'kt');
    stairs(o, { x: 570, y: -232, zb: 412, zt: 468 - 14, zend: 412, n: 3, run: 18, width: 104, dir: '+x' });
    stairs(o, { x: 330, y: -96, zb: 412, zt: 468 - 14, zend: 412, n: 3, run: 16, width: 90, dir: '+y' });
  });
  lift(mid, 3, (o) => {
    // bedroom: the key visual's tall cream panel, turned to face the room and widened into the headboard wall
    track(o, 'bed', () => {
      box(o, 376.8, -255, 468, 129.6, 10.8, 67.2, 'c');
      bed(o, 430.8, -197.4, 468, 74.4, 91.2);
      nightstand(o, 487.2, -233.4, 468);
    });
    // left ledge: a dark doorway at the back, stairs to the plinth and to the floor
    box(o, -360, -40, 0, 240, 160, 252, 'k', 'kt');
    niche(o, { c: 120, shape: archShape(-258, -172, 0, 120), depth: 40, back: 'kin', floor: 'kt1' });
    // the raised wall at its back is the bath: a wide lit arch with the vanity and round mirror, and the tub
    box(o, -360, -40, 252, 178, 40, 156, 'k', 'kt');
    niche(o, {
      c: 0,
      shape: archShape(-340.8, -237.6, 252, 340.8),
      depth: 34,
      back: 'klit',
      floor: 'kfloorlit',
      inside: (q) =>
        track(q, 'bath', () => {
          // to the same scale as the other rooms: the tub about 80% of the bed's length, the vanity at counter height
          vanity(q, -327.6, -34, 252, 24);
          tub(q, -278.4, -17, 252, 18, 13.2, 20.4);
        }),
    });
    stairs(o, { x: -120, y: 2, zt: 252 - 10.4, zend: 200, n: 4, run: 22, width: 108, dir: '+x' });
    stairs(o, { x: -360, y: 120, zt: 252 - 22.9, zend: 0, n: 10, run: 24, width: 84, dir: '+y' });
  });
  lift(mid, 4, (o) => {
    // the plinth the letters stand on, with a warm arch on its right face
    box(o, -32, -40, 0, 334, 172, 200, 'k', 'kt');
    niche(o, { plane: 'x', c: 302, shape: archShape(-6, 52, 0, 120), depth: 44, back: 'klit2', floor: 'kfloorlit' });
  });
  lift(mid, 5, (o) => {
    // study, on the front of the left ledge: low bookshelf, swivel chair, desk, the mushroom lamp on the desk
    track(o, 'study', () => {
      bookshelf(o, -178.8, -38, 252, 51.6, 15.6, 27.6);
      deskChair(o, -163.2, 36.6, 252, 17.4);
      desk(o, -156, 63, 252, 67.2, 27.6, 30);
      mushroomLamp(o, -135.6, 60.6, 282, 0.55); // the key visual's mushroom lamp, at desk-lamp size
    });
    // right ledge: the kitchen counter against the wall, the oval dining table with a chair at each end
    box(o, 360, -40, 0, 250, 150, 112, 'k', 'kt2');
    o.add('<g class="room-dining">'); // left out on portrait screens (index.html), where the right edge would cut it
    track(o, 'dining', () => {
      kitchenCounter(o, 371.4, -39.6, 112, 79.2, 26.4, 36);
      diningChairPX(o, 440.2, 41.1, 112, 1.31);
      ovalTable(o, 508.8, 51.6, { half: 25.2, r: 22.4, z: 112, h: 33.6 });
      diningChair(o, 557.8, 41.1, 112, 1.31);
    });
    o.add('</g>');
    stairs(o, { x: 528, y: 110, zt: 112 - 18.7, zend: 0, n: 6, run: 16, width: 80, dir: '+y' });
  });
  // soft contact shadow where FLAT meets the plinth, so the letters sit heavily on it (fades in as they push out)
  mid.add('<g class="ao">');
  shadow(mid, 2 * COL, -LOGO.depth / 2, LOGO.z0, 2 * COL + 16, LOGO.depth + 12, 0.85);
  mid.add('</g>');
  // letters (own group so they can extrude)
  mid.add('<g class="logo3d">');
  // brand rule: the D of DEEP and the F of FLAT are ember, the rest bone on the night page (index-svg.html). The daylight
  // page (index.html) repaints lf / lt / lr in its own stylesheet ("the generated drawings by day"): ink faces, a warm
  // grey thickness and ink-brown tops, as the 3D letters by day; defs.mjs keeps the night colours for index-svg.html
  const EMBER = { front: 'ef', sideTop: 'et', sideR: 'er' };
  ['F', 'L', 'A', 'T'].forEach((ch, i) => letter(mid, ch, { x0: i * COL, z0: LOGO.z0, depth: LOGO.depth, i: i + 4, ...(i === 0 ? EMBER : {}) }));
  ['D', 'E', 'E', 'P'].forEach((ch, i) => letter(mid, ch, { x0: i * COL, z0: LOGO.z0 + LH + LOGO.rowGap, depth: LOGO.depth, i, ...(i === 0 ? EMBER : {}) }));
  mid.add('</g>');
  mid.add('<g class="late">');
  figure(mid, 74, 84, 200, 1.15);
  // the two in front of the bath arch hang above its round mirror, keeping their staggered heights
  bulb(mid, -296, 26, 401, 1100, 20);
  bulb(mid, -270, 26, 381, 1100, 20);
  bulb(mid, 214, -70, 548, 1100, 16);
  // hangs low over the dining table, and goes with it on portrait screens
  mid.add('<g class="room-dining">');
  bulb(mid, ...PENDANT, 1100, 18);
  mid.add('</g>');
  mid.add('</g>');

  // FRONT: the living room on the floor: rug, floor lamp, sofa, coffee table
  lift(front, 6, (o) => {
    box(o, 96, 180, 0, 250, 200, 3, 'r');
    track(o, 'living', () => {
      floorLamp(o, 118.8, 189, 3, 1.15);
      sofaY(o, 108, 200, 156, 1.1);
      coffeeTable(o, 212, 230, 98, 90);
    });
  });

  return { back: back.toString(), mid: mid.toString(), front: front.toString() };
}

// the room pins (point, layer, the room's extent), the outline of the letters' block and the dining pendant's bulb
// (its wire hangs straight up from there), in screen units of the scene, for the labels in index.html; call after buildHero()
export function roomPins() {
  const rooms = ROOMS.map((r) => {
    const [x, y] = P(...r.at);
    return `${r.k}:${[x, y, r.l, ...ROOM_BOX[r.k]].map(R).join(',')}`;
  }).join(';');
  const x1 = 4 * LW * SX + 3 * LOGO.gap;
  const zt = LOGO.z0 + 2 * LH + LOGO.rowGap;
  const corners = [];
  for (const x of [0, x1]) for (const y of [-LOGO.depth, 0]) for (const z of [LOGO.z0, zt]) corners.push(P(x, y, z));
  const [wx, wy] = P(...PENDANT);
  return { rooms, hull: hull(corners).map(([x, y]) => `${R(x)},${R(y)}`).join(' '), wire: `${R(wx)},${R(wy)}` };
}

// logo bbox in screen units (used to fit the viewBox)
export function logoBox() {
  const x1 = 4 * LW * SX + 3 * LOGO.gap;
  const zt = LOGO.z0 + 2 * LH + LOGO.rowGap;
  const a = P(0, 0, zt);
  const b = P(x1, 0, LOGO.z0);
  const e = P(0, -LOGO.depth, 0);
  return { x: a[0], y: a[1] + e[1], w: b[0] - a[0] + e[0], h: b[1] - (a[1] + e[1]) };
}
