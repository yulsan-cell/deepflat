// Schedule pieces drawn with the same axonometric camera and clay materials as the hero:
// - month blocks: a strip of land with three house lots (small finished house = booked, dashed house outline on a
//   dashed lot = open place to start building); legend swatches legend-booked / legend-open / legend-last match them
// - lookup stair: six steps, the seated figure on the current step
import { Out, P, box, shadow, figure, R, pts, hull } from './iso.mjs';

function fit(svg, m = 4) {
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
  return `${R(x0 - m)} ${R(y0 - m)} ${R(x1 - x0 + 2 * m)} ${R(y1 - y0 + 2 * m)}`;
}
const ghost = (o, ps) => o.add(`<polygon class="ghost" points="${pts(ps)}"/>`);

// ---------- month blocks: a little street of three house lots ----------
// 2026-10-27: the oak cubes on a stone tray read as parcels. Each month is now a strip of land with three lots:
// a booked lot carries a small finished house (gable front with an arched door and a window, oak roof),
// an open lot is the same house drawn as a dashed plan outline over a dashed lot ("a house will stand here").
// Colours are presentation attributes, so the drawing needs no new page CSS; the open lot keeps the class
// slot-open, so the page's rules still apply (dashed ink outline; on '예약 가능' months the open lots are sage, on
// '잔여 1팀' months the last lot glows #f1c47f; the dashed houses take sage ink; booked-out months recede).
const HOUSE = {
  wallL: '#fbf8f2', // the gable front (+y face, toward the viewer's left): lime-washed white
  wallR: '#e2d8c8', // the side wall (+x face): the same white in shade
  roofT: '#b98b5e', // the visible roof slope: oak
  roofE: '#93693f', // the roof's cut edge on the front: dark oak
  door: '#9b7350', // arched oak door
  win: '#5f7468', // window glass: deep sage, crisp at 25 px
  sill: '#d9cdb9',
  ghost: '#23221f',
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const VIEW3 = [Math.sin((35 * Math.PI) / 180) * Math.cos((32 * Math.PI) / 180), Math.cos((35 * Math.PI) / 180) * Math.cos((32 * Math.PI) / 180), Math.sin((32 * Math.PI) / 180)];
const proj = (q) => P(q[0], q[1], q[2]);
const ptsAttr = (ps) => ps.map((q) => { const [X, Y] = proj(q); return R(X) + ',' + R(Y); }).join(' ');

// faces of one convex solid: drop the ones whose outward normal n is turned away from the viewer
function solid(faces) {
  return faces.filter(({ n }) => dot(n, VIEW3) > 1e-6);
}
// a house on the footprint x..x+w, y..y+d standing at z: walls h high, the ridge (along y) rh above them
function houseFaces(x, y, z, w, d, h, rh) {
  const xm = x + w / 2;
  const zt = z + h;
  const zr = zt + rh;
  const ov = 1.4; // eaves overhang
  const th = 1.6; // roof thickness
  const k = rh / (w / 2);
  const ze = zt - ov * k; // eave height at the overhang
  const walls = solid([
    { v: [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, zt], [xm, y + d, zr], [x, y + d, zt]], n: [0, 1, 0], fill: HOUSE.wallL, part: 'front' },
    { v: [[x + w, y, z], [x + w, y, zt], [x + w, y + d, zt], [x + w, y + d, z]], n: [1, 0, 0], fill: HOUSE.wallR, part: 'side' },
  ]);
  const y0 = y - ov * 0.6;
  const y1 = y + d + ov;
  // right slope: a slab from the ridge to the right eave
  const rA = [xm, y0, zr + th];
  const rB = [x + w + ov, y0, ze + th * 0.4];
  const rC = [x + w + ov, y0, ze - th * 0.6];
  const rD = [xm, y0, zr];
  const sh = (q) => [q[0], y1, q[2]];
  const right = solid([
    { v: [rA, sh(rA), sh(rB), rB], n: [k, 0, 1], fill: HOUSE.roofT, part: 'roof' },
    { v: [sh(rA), sh(rD), sh(rC), sh(rB)], n: [0, 1, 0], fill: HOUSE.roofE },
    { v: [rB, sh(rB), sh(rC), rC], n: [1, 0, -0.2], fill: HOUSE.roofE },
  ]);
  // left slope: only its cut edge on the front shows
  const lA = [xm, y0, zr + th];
  const lB = [x - ov, y0, ze + th * 0.4];
  const lC = [x - ov, y0, ze - th * 0.6];
  const lD = [xm, y0, zr];
  const left = solid([
    { v: [sh(lA), sh(lB), sh(lC), sh(lD)], n: [0, 1, 0], fill: HOUSE.roofE },
    { v: [lA, lB, sh(lB), sh(lA)], n: [-k, 0, 1], fill: HOUSE.roofT },
  ]);
  return { walls, left, right, xm, zt, zr };
}
const facePoly = (f, extra = '') => `<polygon points="${ptsAttr(f.v)}" fill="${f.fill}" stroke="${f.fill}" stroke-width=".35" stroke-linejoin="round"${extra}/>`;

function house(o, x, y, z, w, d, h, rh) {
  const { walls, left, right, xm, zt } = houseFaces(x, y, z, w, d, h, rh);
  for (const f of walls) o.add(facePoly(f));
  // the front: an arched door (left) and a window (right), set on the gable wall at y + d
  const yf = y + d + 0.05;
  const dw = w * 0.24;
  const dx0 = x + w * 0.16;
  const dh = h * 0.68;
  const arch = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI - (Math.PI * i) / 10;
    arch.push([dx0 + dw / 2 + (dw / 2) * Math.cos(a), yf, z + dh - dw / 2 + (dw / 2) * Math.sin(a)]);
  }
  o.add(`<polygon points="${ptsAttr([[dx0, yf, z], ...arch, [dx0 + dw, yf, z]])}" fill="${HOUSE.door}"/>`);
  const wx0 = x + w * 0.54;
  const ww = w * 0.3;
  const wz0 = z + h * 0.34;
  const wh = h * 0.42;
  o.add(`<polygon points="${ptsAttr([[wx0, yf, wz0], [wx0 + ww, yf, wz0], [wx0 + ww, yf, wz0 + wh], [wx0, yf, wz0 + wh]])}" fill="${HOUSE.win}"/>`);
  o.add(`<polygon points="${ptsAttr([[wx0 - 0.6, yf, wz0 - 0.9], [wx0 + ww + 0.6, yf, wz0 - 0.9], [wx0 + ww + 0.6, yf, wz0], [wx0 - 0.6, yf, wz0]])}" fill="${HOUSE.sill}"/>`);
  // a small round window in the gable
  const gz = zt + (rh * 0.38);
  const gr = w * 0.07;
  const ring = Array.from({ length: 16 }, (_, i) => [xm + gr * Math.cos((2 * Math.PI * i) / 16), yf, gz + gr * Math.sin((2 * Math.PI * i) / 16)]);
  o.add(`<polygon points="${ptsAttr(ring)}" fill="${HOUSE.win}"/>`);
  for (const f of left) o.add(facePoly(f));
  for (const f of right) o.add(facePoly(f));
}

// the same house as a dashed plan outline: its silhouette and (front = true) its gable front, over a faint body.
// The legend swatch, about 38 px wide, leaves the gable front out: three dashed outlines on a house that small run
// into one scribble
function ghostHouse(o, x, y, z, w, d, h, rh, front = true) {
  const { walls, left, right } = houseFaces(x, y, z, w, d, h, rh);
  const all = [...walls, ...left, ...right];
  const sil = hull(all.flatMap((f) => f.v.map(proj)));
  const line = 'fill="none" stroke="' + HOUSE.ghost + '" stroke-opacity=".6" stroke-width="1.1" stroke-dasharray="2.6 2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
  o.add(`<polygon points="${pts(sil)}" fill="${HOUSE.ghost}" fill-opacity=".04"/>`);
  o.add(`<polygon points="${pts(sil)}" ${line}/>`);
  const gable = front && walls.find((f) => f.part === 'front');
  if (gable) o.add(`<polygon points="${ptsAttr(gable.v)}" ${line}/>`);
}

const LOT = 22; // lot size (x and y)
const LOT_GAP = 6;
const EDGE = 5; // land beyond the lots
const LAND_H = 5;
const HW = 16; // house width (x), depth (y), wall height, roof rise
const HD = 15;
const HH = 11.5;
const HR = 10;
function lot(o, x, y, z, cls) {
  const ring = [P(x, y, z), P(x + LOT, y, z), P(x + LOT, y + LOT, z), P(x, y + LOT, z)];
  o.add(`<path class="${cls}" d="M${ring.map((q) => R(q[0]) + ' ' + R(q[1])).join('L')}Z"/>`);
}
function slotBlock(taken) {
  const o = new Out();
  const w = EDGE * 2 + LOT * 3 + LOT_GAP * 2;
  const d = LOT + EDGE * 2;
  // the land: a pale stone slab with a thin sage lawn on top
  box(o, 0, 0, 0, w, d, LAND_H - 1.4, 'k');
  o.add(`<polygon points="${ptsAttr([[0, d, LAND_H - 1.4], [w, d, LAND_H - 1.4], [w, d, LAND_H], [0, d, LAND_H]])}" fill="#b9cabd"/>`);
  o.add(`<polygon points="${ptsAttr([[w, 0, LAND_H - 1.4], [w, d, LAND_H - 1.4], [w, d, LAND_H], [w, 0, LAND_H]])}" fill="#9fb4a5"/>`);
  o.add(`<polygon points="${ptsAttr([[0, 0, LAND_H], [w, 0, LAND_H], [w, d, LAND_H], [0, d, LAND_H]])}" fill="#dfe7df"/>`);
  for (let i = 0; i < 3; i++) {
    const x = EDGE + i * (LOT + LOT_GAP);
    const y = EDGE;
    const hx = x + (LOT - HW) / 2;
    const hy = y + (LOT - HD) / 2 - 1;
    if (i < taken) {
      // a paved lot under the finished house, then its soft shadow toward the back right
      o.add(`<polygon points="${ptsAttr([[x, y, LAND_H], [x + LOT, y, LAND_H], [x + LOT, y + LOT, LAND_H], [x, y + LOT, LAND_H]])}" fill="#efe9de"/>`);
      shadow(o, hx + HW / 2 + 4, hy + HD / 2 - 3, LAND_H, HW * 0.62, HD * 0.62, 0.55);
      house(o, hx, hy, LAND_H, HW, HD, HH, HR);
    } else {
      lot(o, x, y, LAND_H, 'slot-open');
      ghostHouse(o, hx, hy, LAND_H, HW, HD, HH, HR);
    }
  }
  const body = o.toString();
  return `<svg class="df slot-block" viewBox="${fit(body)}" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const MONTH_STATUS = [
  ['is-full', '마감', 3],
  ['is-full', '마감', 3],
  ['is-one', '잔여 1팀', 2],
  ['is-open', '예약 가능', 1],
  ['is-one', '잔여 1팀', 2],
  ['is-open', '예약 가능', 0],
];

// the visible count under each status (2026-10-27, user: show '3자리 중 2자리 예약'); it replaces the old sr-only line.
// Each half is kept whole so the narrow phone columns break between them
function monthCount(taken) {
  const [a, b] = taken === 3 ? ['3자리', '모두 예약'] : taken === 0 ? ['3자리', '모두 남음'] : ['3자리 중', `${taken}자리 예약`];
  return `<span class="m-count"><span>${a}</span> <span>${b}</span></span>`;
}

// months are filled in again by the page script from today's date; these are the build-time values
export function buildMonths(now = new Date()) {
  return MONTH_STATUS.map(([cls, label, taken], k) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + k, 1);
    const m = d.getMonth() + 1;
    const showYear = k === 0 || m === 1;
    return `<li class="month ${cls}">${slotBlock(taken)}<span class="m-year">${showYear ? d.getFullYear() + '년' : ''}</span><span class="m-num">${m}<small>월</small></span><span class="m-status">${label}</span>${monthCount(taken)}</li>`;
  }).join('');
}

// legend swatches: one finished house on its lot (예약된 공사), one open lot with the dashed house (남은 자리, sage
// like the 예약 가능 months' lots) and the same open lot in pale gold (마지막 한 자리, as on the 잔여 1팀 months).
// The lot colours come from the page CSS (.legend .lg-ico .slot-open, .lg-ico.is-last .slot-open)
export function buildLegend() {
  const one = (taken, cls = '') => {
    const o = new Out();
    const hx = (LOT - HW) / 2;
    const hy = (LOT - HD) / 2 - 1;
    if (taken) {
      o.add(`<polygon points="${ptsAttr([[0, 0, 0], [LOT, 0, 0], [LOT, LOT, 0], [0, LOT, 0]])}" fill="#dfe7df"/>`);
      house(o, hx, hy, 0, HW, HD, HH, HR);
    } else {
      lot(o, 0, 0, 0, 'slot-open');
      ghostHouse(o, hx, hy, 0, HW, HD, HH, HR, false);
    }
    const b = o.toString();
    return `<svg class="df lg-ico${cls}" viewBox="${fit(b, 1.5)}" aria-hidden="true" focusable="false">${b}</svg>`;
  };
  return { 'legend-booked': one(true), 'legend-open': one(false), 'legend-last': one(false, ' is-last') };
}

// ---------- lookup stair ----------
export function buildStair(current = 4) {
  const o = new Out();
  const RUN = 15;
  const RISE = 11;
  const WID = 36;
  for (let i = 5; i >= 0; i--) {
    const m = i < current ? 'cd' : i === current ? 'c' : 'k';
    box(o, 0, -(i + 1) * RUN, 0, WID, RUN, RISE * (i + 1), m);
    if (i === current) {
      figure(o, WID * 0.5, -(i + 0.5) * RUN, RISE * (i + 1), 0.82);
      ghost(o, [P(WID * 0.5 - 4, -(i + 0.5) * RUN, RISE * (i + 1) + 34), P(WID * 0.5 + 4, -(i + 0.5) * RUN, RISE * (i + 1) + 34), P(WID * 0.5, -(i + 0.5) * RUN, RISE * (i + 1) + 36)]);
    }
  }
  const body = o.toString();
  return `<svg class="df lk-stair" viewBox="${fit(body, 6)}" aria-hidden="true" focusable="false">${body}</svg>`;
}
