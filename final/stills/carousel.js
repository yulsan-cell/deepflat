// The brand section's carousel: five bright isometric cutaway rooms (two walls and a floor on a sage-grey ground), in
// the spirit of the reference image (assets/ref-room.jpg) but furnished as DEEPFLAT would: 거실, 주방·다이닝, 침실,
// 서재, 욕실. Interim pictures: a later phase replaces them with Blender renders (same file names and sizes).
//   stills.html?scene=carousel&room=living|kitchen|bedroom|study|bath   (render-carousel.mjs renders and encodes them)
// Rooms are 4.2 m square, in metres; the props come from ../3d/props.js (one builder per prop type).
import { THREE, makeMaterials, DAY, paint, dayMat, bake, contacts, acesUntone } from '../3d/kit.js';
import { propMaterials, PROPS as P, planarBox, PLANK_TILE, box, boxR } from '../3d/props.js';
import { pendantPair } from '../3d/rooms.js';
import { wall, frameCamera, halton } from './lib.js';

export const ROOMS = ['living', 'kitchen', 'bedroom', 'study', 'bath'];

const W = 4.2, D = 4.2, HT = 2.7, T = 0.14, FL = 0.16;
const X0 = -W / 2, Z0 = -D / 2; // the inner faces of the left wall (x) and the back wall (z)
const R90 = Math.PI / 2;

// the shell: floor slab, back wall (along x) and left wall (along z), skirting. leftMat: the left wall's own paint when
// it must read lighter than the same colour would in its shade (its inside faces away from the sun)
function shell(M, g, { floor, wallMat, leftMat, backOps = [], leftOps = [], floorTile = PLANK_TILE, skirting = true }) {
  g.add(planarBox(floor, [X0 - T, W / 2], [-FL, 0], [Z0 - T, D / 2], floorTile));
  g.add(wall(wallMat, { axis: 'x', at: Z0 - T / 2, from: X0 - T, to: W / 2, y0: -FL, y1: HT, t: T, ops: backOps }));
  g.add(wall(leftMat ?? wallMat, { axis: 'z', at: X0 - T / 2, from: Z0, to: D / 2, y0: -FL, y1: HT, t: T, ops: leftOps }));
  for (const o of leftOps) g.add(P.windowFrame(M, { w: o.a1 - o.a0, h: o.v1 - o.v0, arch: o.arch, t: T, x: X0, y: o.v0, z: (o.a0 + o.a1) / 2, rot: R90 }));
  for (const o of backOps) g.add(P.windowFrame(M, { w: o.a1 - o.a0, h: o.v1 - o.v0, arch: o.arch, t: T, x: (o.a0 + o.a1) / 2, y: o.v0, z: Z0 }));
  if (skirting) {
    g.add(P.skirting(M, { len: W, x: 0, z: Z0 }));
    g.add(P.skirting(M, { len: D, x: X0, z: 0, rot: R90 }));
  }
}

// ── 거실 ──────────────────────────────────────────────────────────────────────
function living(M, g, C) {
  shell(M, g, { floor: M.floorOak, wallMat: M.plasterBlush, leftOps: [{ a0: 0.45, a1: 1.6, v0: 0.85, v1: 1.75, arch: true }] });
  g.add(P.rug(M, { w: 2.7, d: 2.0, style: 'border', base: 0xebe3d6, accent: 0xc8a688, x: -0.05, z: -0.5 }));
  g.add(P.sofa(M, { len: 2.2, fabric: M.sage, pillows: [M.linen, M.rust, M.oat], throwOn: M.oat, x: -0.15, z: Z0 + 0.5 }));
  g.add(P.coffeeTable(M, { len: 1.15, wid: 0.6, x: -0.1, z: -0.55 }));
  g.add(P.flowers(M, { kind: 'ranunculus', vaseKind: 'bud', vaseMat: M.ceramicSage, colors: ['blush', 'white', 'peach'], n: 6, h: 0.2, x: -0.38, y: 0.4, z: -0.5 }));
  g.add(P.bowl(M, { r: 0.12, mat: M.stoneware, x: 0.18, y: 0.4, z: -0.42 }));
  g.add(P.bookStack(M, { n: 2, x: 0.2, y: 0.12 + 0.02, z: -0.55, seed: 8 }));
  g.add(P.loungeChair(M, { fabric: M.linen, x: 1.35, z: 0.3, rot: -2.1 }));
  g.add(P.sideTable(M, { x: 1.4, z: -1.62 }));
  g.add(P.tableLamp(M, { base: M.ceramic, h: 0.48, x: 1.4, y: 0.55, z: -1.66 }));
  g.add(P.plant(M, { kind: 'paradise', potKind: 'round', potR: 0.21, potH: 0.36, h: 1.45, x: -1.68, z: -1.66, seed: 3 }));
  g.add(P.sideboard(M, { len: 1.5, wood: M.walnut, x: X0 + 0.23, z: -0.42, rot: R90 }));
  g.add(P.vase(M, { kind: 'amphora', mat: M.ceramicSand, k: 1.0, x: X0 + 0.22, y: 0.62, z: -0.95 }));
  g.add(P.bookStack(M, { n: 3, x: X0 + 0.24, y: 0.62, z: -0.35, seed: 5 }));
  g.add(P.plant(M, { kind: 'pothos', potKind: 'cylinder', potR: 0.07, potH: 0.12, potMat: M.ceramic, h: 0.3, x: X0 + 0.24, y: 0.62, z: 0.08, seed: 2 }));
  g.add(P.artFrame(M, { w: 0.62, h: 0.8, art: 'botanical', frame: 'white', on: 'right', x: X0, y: 1.15, z: -0.42, rot: R90 }));
  g.add(P.artFrame(M, { w: 0.95, h: 0.68, art: 'arch', frame: 'oak', x: -0.15, y: 1.2, z: Z0 }));
  const sh = P.wallShelf(M, { len: 0.78, rows: [0, 0.38], x: 1.4, y: 1.25, z: Z0 });
  g.add(sh);
  g.add(P.bookRow(M, { len: 0.42, x: 1.05, y: 1.274, z: Z0 + 0.11, seed: 4, hMax: 0.24 }));
  g.add(P.vase(M, { kind: 'jar', mat: M.ceramicSage, k: 0.8, x: 1.62, y: 1.274, z: Z0 + 0.11 }));
  g.add(P.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.07, potH: 0.11, potMat: M.ceramicSand, h: 0.45, x: 1.25, y: 1.654, z: Z0 + 0.11, seed: 6 }));
  g.add(P.vase(M, { kind: 'bud', mat: M.ceramicDark, k: 0.8, x: 1.6, y: 1.654, z: Z0 + 0.1 }));
  C.push([-0.15, 0, Z0 + 0.5, 1.3, 0.62, 0.55], [-0.1, 0.012, -0.55, 0.75, 0.42, 0.4], [1.35, 0.012, 0.3, 0.5, 0.5, 0.45], [-1.68, 0, -1.66, 0.32, 0.32, 0.5], [X0 + 0.23, 0, -0.42, 0.34, 0.85, 0.4], [1.4, 0, -1.62, 0.28, 0.28, 0.4]);
}

// ── 주방·다이닝 ────────────────────────────────────────────────────────────────
function kitchen(M, g, C) {
  shell(M, g, { floor: M.floorPale, wallMat: M.plasterSand, leftOps: [{ a0: -0.55, a1: 0.65, v0: 1.05, v1: 2.15 }] });
  // the back wall: tall pantry in the corner, a run with sink and hob, a marble splash, a plaster hood, an oak shelf
  g.add(P.tallUnit(M, { len: 0.62, h: 2.3, front: M.oak, x: X0 + 0.31, z: Z0 + 0.31, doors: 1 }));
  g.add(P.tallUnit(M, { len: 0.62, h: 2.3, front: M.oak, x: X0 + 0.93, z: Z0 + 0.31, doors: 1 }));
  g.add(P.kitchenRun(M, { len: 2.3, front: M.cabSage, x: 0.39, z: Z0 + 0.31, sinkAt: -0.55, hobAt: 0.6 }));
  g.add(planarBox(M.marble, [-0.76, 1.54], [0.9, 1.5], [Z0, Z0 + 0.02], 0.9));
  g.add(P.hood(M, { w: 0.7, d: 0.46, h: 0.5, mat: M.plasterWhite, x: 0.99, y: 1.7, z: Z0 }));
  g.add(P.floatShelf(M, { len: 0.95, x: -0.2, y: 1.62, z: Z0 }));
  g.add(P.bowl(M, { r: 0.1, mat: M.ceramic, x: -0.55, y: 1.665, z: Z0 + 0.12 }));
  g.add(P.bowl(M, { r: 0.08, mat: M.ceramicSage, x: -0.55, y: 1.71, z: Z0 + 0.12 }));
  g.add(P.vase(M, { kind: 'jar', mat: M.glassAmber, k: 0.9, x: -0.25, y: 1.665, z: Z0 + 0.12 }));
  g.add(P.vase(M, { kind: 'pitcher', mat: M.ceramicSand, k: 1, x: 0.05, y: 1.665, z: Z0 + 0.12 }));
  g.add(P.plant(M, { kind: 'herb', potKind: 'terracotta', potR: 0.06, potH: 0.1, h: 0.14, x: 0.17, y: 1.665, z: Z0 + 0.12, seed: 3 }));
  g.add(P.board(M, { w: 0.3, h: 0.42, x: 0.15, y: 0.9, z: Z0 + 0.02 }));
  g.add(P.bottles(M, { x: 1.35, y: 0.9, z: Z0 + 0.12 }));
  g.add(P.plant(M, { kind: 'herb', potKind: 'terracotta', potR: 0.07, potH: 0.11, h: 0.16, x: -0.6, y: 0.9, z: Z0 + 0.2, seed: 5 }));
  // the island with stools, two pendants over it
  g.add(P.island(M, { len: 1.8, d: 0.85, front: M.oak, x: 0.35, z: 0.05 }));
  for (const sx of [-0.35, 0.35, 1.05]) g.add(P.barStool(M, { seat: M.leather, x: sx, z: 0.82 }));
  g.add(P.fruitBowl(M, { x: 0.0, y: 0.9, z: -0.02 }));
  g.add(P.flowers(M, { kind: 'branch', vaseKind: 'tall', vaseMat: M.ceramic, colors: ['white', 'blush'], n: 5, h: 0.4, x: 0.85, y: 0.9, z: -0.05 }));
  // two ceramic domes over it, on short cords from slim brass arms reaching out of the back wall (as in the hero's
  // kitchen): no cord ends in the air above the cutaway
  for (const pd of pendantPair(M, { at: { x: 0.35, y: 1.62, z: 0.05 }, gap: 0.8, armY: 2.28, wallZ: Z0, s: 1 })) {
    pd.userData.glass.emissiveIntensity = 0.55;
    g.add(pd);
  }
  // the left wall: a window with a herb pot on its sill, open shelf with plates, a rug runner
  g.add(P.plant(M, { kind: 'herb', potKind: 'terracotta', potR: 0.06, potH: 0.1, h: 0.15, x: X0 + 0.08, y: 1.06, z: 0.3, seed: 8 }));
  g.add(P.floatShelf(M, { len: 0.9, x: X0, y: 1.45, z: -1.35, rot: R90 }));
  for (let i = 0; i < 4; i++) g.add(P.plate(M, { r: 0.12, x: X0 + 0.13, y: 1.495 + i * 0.022, z: -1.6 }));
  g.add(P.cup(M, { mat: M.ceramicSage, x: X0 + 0.12, y: 1.495, z: -1.3 }));
  g.add(P.cup(M, { mat: M.ceramic, x: X0 + 0.12, y: 1.495, z: -1.18 }));
  g.add(P.vase(M, { kind: 'urn', mat: M.stoneware, k: 0.8, x: X0 + 0.13, y: 1.495, z: -0.98 }));
  g.add(P.rug(M, { w: 2.2, d: 0.7, style: 'jute', base: 0xd8c7a8, accent: 0xb89b74, x: 0.35, z: -1.1 }));
  g.add(P.plant(M, { kind: 'olive', potKind: 'terracotta', potR: 0.22, potH: 0.38, h: 1.5, x: 1.75, z: 1.55, seed: 4 }));
  C.push([0.35, 0.012, 0.05, 1.1, 0.6, 0.5], [0.35, 0.012, Z0 + 0.35, 1.5, 0.45, 0.4], [X0 + 0.62, 0, Z0 + 0.35, 0.75, 0.42, 0.45], [1.75, 0, 1.55, 0.32, 0.32, 0.45]);
  for (const sx of [-0.35, 0.35, 1.05]) C.push([sx, 0.012, 0.82, 0.24, 0.24, 0.35]);
}

// ── 침실 ──────────────────────────────────────────────────────────────────────
function bedroom(M, g, C) {
  // the left wall's inside is in the open shade: painted for that light, so it reads a soft rose (#D8AFA3), not mauve
  const roseShade = dayMat(0xe9c4b8, new THREE.Vector3(1, 0, 0), { roughness: 0.97 });
  shell(M, g, { floor: M.floorOak, wallMat: M.plasterRose, leftMat: roseShade, leftOps: [{ a0: 0.2, a1: 1.5, v0: 0.6, v1: 2.25 }] });
  g.add(P.rug(M, { w: 2.6, d: 2.3, style: 'plain', base: 0xe6ddcf, accent: 0xd0c2ab, key: 'bed', x: 0.25, z: -0.95 }));
  g.add(P.bed(M, { w: 1.6, l: 2.05, wood: M.oak, head: M.sage, accent: M.rust, throwMat: M.oat, x: 0.25, z: Z0 + 1.1 }));
  for (const sx of [-1, 1]) {
    const nx = 0.25 + sx * 1.15;
    g.add(P.nightstand(M, { wood: M.walnut, x: nx, z: Z0 + 0.26 }));
    g.add(P.tableLamp(M, { base: sx < 0 ? M.ceramicSand : M.ceramic, h: 0.42, shadeR: 0.14, x: nx + sx * 0.07, y: 0.52, z: Z0 + 0.24 }));
  }
  g.add(P.bookStack(M, { n: 2, w: 0.2, d: 0.14, x: -0.97, y: 0.52, z: Z0 + 0.3, seed: 2 }));
  g.add(P.flowers(M, { kind: 'tulip', vaseKind: 'bud', vaseMat: M.ceramic, colors: ['white', 'butter'], n: 3, h: 0.15, x: 1.33, y: 0.52, z: Z0 + 0.32 }));
  g.add(P.artFrame(M, { w: 1.1, h: 0.62, art: 'hills', frame: 'oak', x: 0.25, y: 1.3, z: Z0 }));
  g.add(P.bench(M, { len: 1.3, wood: M.oak, fabric: M.boucle, x: 0.25, z: 0.55 }));
  g.add(P.plant(M, { kind: 'fiddle', potKind: 'basket', potR: 0.2, potH: 0.3, h: 1.45, x: 1.8, z: -1.65, seed: 2 }));
  // the window on the left wall with linen curtains drawn to its sides, a reading corner in front of it
  g.add(P.curtain(M, { w: 0.55, h: 2.45, folds: 5, x: X0 + 0.0, z: -0.15, rot: R90 }));
  g.add(P.curtain(M, { w: 0.55, h: 2.45, folds: 5, x: X0 + 0.0, z: 1.85, rot: R90 }));
  g.add(P.armchair(M, { fabric: M.boucle, x: -1.35, z: 1.25, rot: 2.2 }));
  g.add(P.floorLamp(M, { h: 1.5, shadeR: 0.18, x: -1.85, z: 1.85 }));
  g.add(P.sideTable(M, { r: 0.18, h: 0.48, x: -0.75, z: 1.65 }));
  g.add(P.cup(M, { mat: M.ceramicSage, x: -0.7, y: 0.48, z: 1.62 }));
  C.push([0.25, 0.012, Z0 + 1.1, 0.95, 1.2, 0.5], [-0.9, 0, Z0 + 0.26, 0.3, 0.26, 0.4], [1.4, 0, Z0 + 0.26, 0.3, 0.26, 0.4], [0.25, 0.012, 0.55, 0.7, 0.25, 0.35], [1.8, 0, -1.65, 0.3, 0.3, 0.45], [-1.35, 0, 1.25, 0.45, 0.45, 0.45]);
}

// ── 서재 ──────────────────────────────────────────────────────────────────────
function study(M, g, C) {
  shell(M, g, { floor: M.floorOak, wallMat: M.plasterSage, leftOps: [{ a0: -0.5, a1: 0.7, v0: 0.95, v1: 2.2 }] });
  g.add(P.rug(M, { w: 2.4, d: 1.8, style: 'stripe', base: 0xe8e0d2, accent: 0x9db3a2, x: 0.35, z: 0.2 }));
  // a built-in bookcase along the back wall, filled
  const bc = P.bookcase(M, { len: 2.6, h: 2.25, d: 0.34, shelves: 5, wood: M.oak, x: 0.35, z: Z0 + 0.17 });
  g.add(bc);
  const rows = bc.userData.rows;
  rows.forEach((y, i) => {
    const x0 = -0.9 + (i % 2) * 0.15;
    g.add(P.bookRow(M, { len: 0.75 + (i % 3) * 0.2, hMin: 0.2, hMax: 0.3, d: 0.22, x: x0, y, z: Z0 + 0.19, seed: 10 + i }));
    if (i === 1) g.add(P.vase(M, { kind: 'urn', mat: M.ceramicSand, k: 0.9, x: 1.2, y, z: Z0 + 0.19 }));
    if (i === 2) g.add(P.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.08, potH: 0.12, potMat: M.ceramic, h: 0.42, x: 1.25, y, z: Z0 + 0.19, seed: 9 }));
    if (i === 3) g.add(P.bookStack(M, { n: 3, x: 1.15, y, z: Z0 + 0.19, seed: 3 }));
    if (i === 0) g.add(P.vase(M, { kind: 'jar', mat: M.ceramicBlue, k: 0.9, x: 1.3, y, z: Z0 + 0.19 }));
    if (i === 4) g.add(P.bowl(M, { r: 0.1, mat: M.stoneware, x: 1.2, y, z: Z0 + 0.19 }));
  });
  // the desk under the window, its chair, a lamp, a laptop and a cup
  g.add(P.desk(M, { len: 1.4, wid: 0.65, wood: M.oak, x: X0 + 0.36, z: 0.1, rot: R90 }));
  g.add(P.deskChair(M, { shell: M.walnut, x: X0 + 0.95, z: 0.15, rot: -R90 + 0.2 }));
  g.add(P.tableLamp(M, { base: M.black, h: 0.42, shadeR: 0.12, x: X0 + 0.22, y: 0.74, z: 0.62 }));
  g.add(box(M.ceramicDark, 0.34, 0.012, 0.24, X0 + 0.4, 0.74, 0.0)); // laptop
  g.add(P.cup(M, { mat: M.ceramic, x: X0 + 0.48, y: 0.74, z: -0.38 }));
  g.add(P.bookStack(M, { n: 2, w: 0.2, d: 0.15, x: X0 + 0.25, y: 0.74, z: -0.3, seed: 7 }));
  // a reading corner: lounge chair, floor lamp, side table; a tall plant
  g.add(P.loungeChair(M, { fabric: M.leather, wood: M.walnut, x: 1.35, z: 0.9, rot: -2.4 }));
  g.add(P.floorLamp(M, { h: 1.5, x: 1.9, z: 0.15 }));
  g.add(P.sideTable(M, { r: 0.2, h: 0.5, wood: M.walnut, x: 0.75, z: 1.55 }));
  g.add(P.bookStack(M, { n: 2, w: 0.2, d: 0.15, x: 0.75, y: 0.5, z: 1.55, seed: 11 }));
  g.add(P.plant(M, { kind: 'monstera', potKind: 'cylinder', potR: 0.2, potH: 0.34, potMat: M.ceramicDark, h: 1.2, x: X0 + 0.38, z: 1.55, seed: 5 }));
  g.add(P.artFrame(M, { w: 0.5, h: 0.65, art: 'lines', frame: 'black', on: 'right', x: X0, y: 1.35, z: -1.35, rot: R90 }));
  C.push([X0 + 0.36, 0, 0.1, 0.45, 0.8, 0.35], [1.35, 0, 0.9, 0.45, 0.45, 0.45], [0.35, 0, Z0 + 0.17, 1.35, 0.25, 0.45], [X0 + 0.38, 0, 1.55, 0.3, 0.3, 0.45]);
}

// ── 욕실 ──────────────────────────────────────────────────────────────────────
function bath(M, g, C) {
  shell(M, g, { floor: M.terrazzo, floorTile: 1.2, wallMat: M.plasterWhite, backOps: [{ a0: 0.2, a1: 1.6, v0: 1.25, v1: 2.25 }], skirting: false });
  // tiles up to 1.2 m on both walls (a thin skin in front of the plaster), with the window cut out of nothing below it
  g.add(planarBox(M.tileSage, [X0, W / 2], [0, 1.2], [Z0, Z0 + 0.012], 0.8));
  g.add(planarBox(M.tileSage, [X0, X0 + 0.012], [0, 1.2], [Z0, D / 2], 0.8));
  g.add(boxR(M.paintWhite, [X0, W / 2], [1.2, 1.23], [Z0, Z0 + 0.11])); // a ledge along the back wall
  g.add(boxR(M.paintWhite, [X0, X0 + 0.03], [1.2, 1.23], [Z0, D / 2]));
  g.add(P.bathtub(M, { len: 1.7, wid: 0.78, x: 0.75, z: Z0 + 0.6 }));
  g.add(P.toiletries(M, { x: 0.05, y: 1.23, z: Z0 + 0.05 }));
  g.add(P.vanity(M, { len: 1.1, front: M.oak, top: M.travertine, x: X0 + 0.27, z: -0.15, rot: R90 }));
  g.add(P.mirror(M, { r: 0.36, x: X0 + 0.012, y: 1.62, z: -0.15, rot: R90 }));
  g.add(P.sconce(M, { x: X0 + 0.012, y: 1.65, z: -0.75, rot: R90 }));
  g.add(P.toiletries(M, { x: X0 + 0.27, y: 0.86, z: -0.62, rot: R90 }));
  g.add(P.towelRail(M, { len: 0.6, x: -1.2, y: 1.05, z: Z0 + 0.012 }));
  g.add(P.plant(M, { kind: 'fern', potKind: 'round', potR: 0.17, potH: 0.36, potMat: M.ceramic, h: 0.75, x: 1.5, z: 1.2, seed: 4 }));
  // a teak stool with a folded towel and a candle beside the tub
  g.add(P.bench(M, { len: 0.4, d: 0.32, h: 0.45, wood: M.teak, fabric: M.linen, x: -0.45, z: Z0 + 0.55 }));
  g.add(P.candle(M, { x: -0.38, y: 0.46, z: Z0 + 0.55 }));
  // a striped runner in front of the vanity, a teak bench by the tub's end with towels and a pothos, a tall palm in a
  // basket in the back corner, a linen laundry basket by the shower
  g.add(P.rug(M, { w: 1.8, d: 0.62, style: 'stripe', base: 0xebe4d8, accent: 0x9db3a2, key: 'runner', x: -0.25, z: 0.15 }));
  g.add(P.plant(M, { kind: 'snake', potKind: 'cylinder', potR: 0.12, potH: 0.22, potMat: M.stoneware, h: 0.6, x: X0 + 0.3, z: 1.3, seed: 2 }));
  g.add(P.showerScreen(M, { len: 0.95, h: 2.0, x: -1.6, z: 1.1 }));
  g.add(P.bench(M, { len: 0.85, d: 0.36, h: 0.44, wood: M.teak, fabric: M.oat, x: 1.55, z: -0.5, rot: R90 }));
  g.add(box(M.linen, 0.26, 0.07, 0.34, 1.55, 0.44, -0.72, 0.02));
  g.add(box(M.sage, 0.24, 0.06, 0.32, 1.55, 0.51, -0.72, 0.02));
  g.add(P.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.09, potH: 0.14, potMat: M.ceramicSand, h: 0.45, x: 1.55, y: 0.44, z: -0.25, seed: 3 }));
  g.add(P.plant(M, { kind: 'palm', potKind: 'basket', potR: 0.22, potH: 0.34, h: 1.6, x: 1.84, z: -1.78, seed: 6 }));
  g.add(P.pot(M, { kind: 'basket', r: 0.2, h: 0.42, x: -0.95, z: 1.75 }));
  g.add(box(M.linen, 0.3, 0.08, 0.26, -0.95, 0.4, 1.75, 0.04));
  C.push([0.75, 0, Z0 + 0.6, 0.95, 0.45, 0.5], [X0 + 0.27, 0, -0.15, 0.3, 0.6, 0.3], [1.5, 0, 1.2, 0.25, 0.25, 0.45], [-0.45, 0, Z0 + 0.55, 0.25, 0.2, 0.4]);
  C.push([1.55, 0.012, -0.5, 0.26, 0.55, 0.4], [1.84, 0, -1.78, 0.32, 0.32, 0.45], [-0.95, 0, 1.75, 0.26, 0.26, 0.4]);
}

const BUILD = { living, kitchen, bedroom, study, bath };
// sun direction per room (toward the sun): from the viewer's upper left, through the open side
const SUN = {
  living: [-0.5, 0.72, 0.48],
  kitchen: [-0.42, 0.75, 0.52],
  bedroom: [-0.55, 0.68, 0.48],
  study: [-0.5, 0.7, 0.5],
  bath: [-0.4, 0.74, 0.54],
};

export async function buildCarousel(scene, params) {
  const room = params.get('room') ?? 'living';
  if (!BUILD[room]) throw new Error('unknown room ' + room);
  const M = propMaterials(makeMaterials('day'));
  const A = innerWidth / innerHeight;

  // the ground: a sage plane far beyond the frame, deeper sage toward the back (the top of the picture) and paler toward
  // the viewer (as in the reference, assets/ref-room.jpg), so cream and sage walls stand off it. Vertex colours (linear
  // albedo, painted for a sunlit top) by the distance along the view: d = (x + z) / sqrt 2, the camera looks from +x +z.
  const gGeo = new THREE.PlaneGeometry(80, 80, 80, 80);
  gGeo.rotateX(-Math.PI / 2);
  const far = paint(0xc3cfc6, 'top'), near = paint(0xdde4de, 'top');
  const gp = gGeo.attributes.position;
  const gc = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const d = (gp.getX(i) + gp.getZ(i)) / Math.SQRT2;
    const t = Math.min(1, Math.max(0, (d + 7) / 10));
    const k = t * t * (3 - 2 * t);
    gc[i * 3] = far.r + (near.r - far.r) * k;
    gc[i * 3 + 1] = far.g + (near.g - far.g) * k;
    gc[i * 3 + 2] = far.b + (near.b - far.b) * k;
  }
  gGeo.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }));
  ground.position.y = -FL;
  ground.receiveShadow = true;
  scene.add(ground);

  const g = new THREE.Group();
  const C = [];
  BUILD[room](M, g, C);
  scene.add(g);
  const baked = bake(g);
  scene.remove(g);
  scene.add(baked);
  scene.add(contacts(C, 0x4a3c2e));

  // light: the hero's sky and sun (kit.js DAY). Part of the sky becomes a shadowed light wandering over the dome between
  // frames (soft occlusion in corners and under furniture); the sun wanders over a small disc (soft penumbras).
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemiI * 0.55);
  scene.add(hemi);
  const center = new THREE.Vector3(0, 0.8, 0);
  const sunDir = new THREE.Vector3(...SUN[room]).normalize();
  const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sunI * 0.95);
  const sky = new THREE.DirectionalLight(DAY.sky, DAY.hemiI * 0.62);
  for (const L of [sun, sky]) {
    L.castShadow = true;
    L.shadow.mapSize.set(4096, 4096);
    const c = L.shadow.camera;
    c.left = -5.5; c.right = 5.5; c.top = 5.5; c.bottom = -5.5; c.near = 0.5; c.far = 40;
    L.shadow.bias = -0.00025;
    L.shadow.normalBias = 0.012;
    L.target.position.copy(center);
    scene.add(L, L.target);
  }
  sky.shadow.mapSize.set(2048, 2048);
  sky.shadow.normalBias = 0.02;
  const frame = (n) => {
    const a = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(n, a).normalize();
    return [u, new THREE.Vector3().crossVectors(n, u).normalize()];
  };
  const [su, sv] = frame(sunDir);
  const jitter = (i) => {
    const r = 0.045 * Math.sqrt(halton(i + 1, 5)), t = 2 * Math.PI * halton(i + 1, 7);
    sun.position.copy(center).addScaledVector(sunDir.clone().addScaledVector(su, r * Math.cos(t)).addScaledVector(sv, r * Math.sin(t)).normalize(), 18);
    const rr = Math.sqrt(halton(i + 1, 11)) * 0.92, ph = 2 * Math.PI * halton(i + 1, 13);
    sky.position.copy(center).addScaledVector(new THREE.Vector3(rr * Math.cos(ph), Math.sqrt(1 - rr * rr), rr * Math.sin(ph)), 18);
  };

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1200);
  const box3 = new THREE.Box3(new THREE.Vector3(X0 - T, -FL, Z0 - T), new THREE.Vector3(W / 2, HT, D / 2));
  frameCamera(camera, box3, { aspect: A, az: (45 * Math.PI) / 180, el: (30 * Math.PI) / 180, fill: 0.9, dy: -0.01 });
  return {
    camera,
    samples: 64,
    jitters: [jitter],
    vignette: 0.22,
    edge: new THREE.Color(0xcfd9d1),
    tone: { exposure: DAY.exposure },
    note: `carousel ${room}`,
  };
}
void acesUntone;
