// The rooms of the DEEPFLAT world (world.js places them), furnished in daylight with props.js:
//   거실 (floor), 주방·다이닝 (right ledge), 침실 (upper right): the scroll flight flies into these three, so they are
//   furnished like real designed interiors (plaster walls in blush / sand / rose, oak floors, real-proportioned furniture,
//   plants, ceramics, books, prints, rugs).
//   서재 (left ledge) and 욕실 (in the raised wall's arch): seen in passing, furnished more simply with the same props.
// Every room returns { solid, glow, contacts, label }:
//   solid     a Group for kit.js bake() (everything opaque, merged to a few draw calls)
//   glow      pieces that switch on in the opening (lamp shades), kept out of the bake
//   contacts  soft contact shadows [x, y, z, rx, rz, opacity] in world units (kit.js contacts)
// Props are built in metres and placed with a scale s (world units per metre); each room keeps one scale.
// Real furniture (2026-10-26): where the model library (models.js, M.lib) has a model for a role (sofa, chairs, tables,
// lamps, sideboard, bed, plants, vases, bowls, books), the room places it instead of the props.js builder, at the same
// spot and in its true size; where the library is missing or a model failed to load, the builder is drawn as before.
// Pieces the library has nothing for (kitchen units, rugs, prints, curtains, the bench, the olive tree, the floor lamp)
// stay procedural. world.js bakes each room with models.js bakeRoom (repeated models instanced).
import { THREE, blk, bake, dayMat } from './kit.js';
import { propMaterials, PROPS as P, planarBox, PLANK_TILE, pillow, place, rng, VC, leafGeo, leafAt } from './props.js';
import { cloneMaterial } from './models.js';

const R90 = Math.PI / 2;

// the library model `name` placed at `at`, or null when the library lacks it (the caller then draws the builder)
const G = (M, name, at) => M.lib?.place(name, at) ?? null;
const has = (M, ...names) => names.every((n) => M.lib?.has(n));
// a model's height (its top: a table, a side table, a sideboard) in metres, as loaded
const top = (M, name) => M.lib.dims(name).h;
// the lower shelf of the library's side table (side_table_01: 0.353 m)
const SIDE_SHELF = 0.353;
// books on that shelf: the library's stack at 0.8, or drawn ones when the stack did not load (a partial library)
const shelfBooks = (M, { x, y, z, rot, s }) => G(M, 'books_stack', { x, y, z, rot, s, k: 0.8 }) ?? P.bookStack(M, { n: 2, w: 0.24, d: 0.17, x, y, z, rot, seed: 8, s });
// the study and the bath are only seen from afar: on phones (a library loaded with mobile) their small decor stays drawn,
// a few thousand triangles fewer where they would be a few pixels
const Gfar = (M, name, at) => (M.lib?.mobile ? null : G(M, name, at));
const hasFar = (M, ...names) => !M.lib?.mobile && has(M, ...names);
// throw pillows (props.js pillow) laid on a model's seat: [mat, x, yaw, roll] in the piece's own frame (metres)
function cushions(M, list, { y, z, tilt = -0.28, w = 0.46, h = 0.46, t = 0.15 }, at) {
  const g = new THREE.Group();
  for (const [mat, x, yaw = 0, roll = 0] of list) g.add(pillow(mat, w, h, t, { x, y, z, tilt, yaw, roll }));
  return place(g, at);
}
// the library table lamp's shade, glowing a little once the opening switches the lamps on
function modelGlow(M, name, matName) {
  const mat = M.lib?.material(name, matName);
  return mat ? { mat, base: mat.userData.glow ?? 0.18, emissive: true } : null;
}

// materials the rooms add to kit.js makeMaterials('day') (called once per boot, after makeMaterials)
export function roomMaterials(M) {
  propMaterials(M);
  // what a window shows: soft daylight, shown as it is (not lit, not tone mapped)
  M.daylight = new THREE.MeshBasicMaterial({ color: 0xf6f4ec, toneMapped: false });
  // the crane's dressing (faceDressing, landingLights): dark bronze window bars, faint glass, opal pendant globes that
  // glow with the lamps (world.js registers them)
  M.bronze = dayMat(0x6e5d4b, 'left', { roughness: 0.45, metalness: 0.2 });
  M.glazing = new THREE.MeshStandardMaterial({ color: 0xe4ece9, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false });
  M.opal = dayMat(0xfbf3e4, 'top', { roughness: 0.35, emissive: 0xffd6a0, emissiveIntensity: 0.85 });
  return M;
}

// a soft round spot (white centre to clear edge): lamp halos and the warm wash a wall light throws on its wall
let spotTex = null;
function spotTexture() {
  if (spotTex) return spotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  spotTex = new THREE.CanvasTexture(c);
  spotTex.colorSpace = THREE.SRGBColorSpace;
  return spotTex;
}
// a warm additive glow (a sprite halo, or a wash flat on a wall); `base` is its opacity once the lamps are on
function warmGlow(base, { sprite = false, color = 0xffd2a0 } = {}) {
  const opts = { map: spotTexture(), color, transparent: true, opacity: base, depthWrite: false, blending: THREE.AdditiveBlending };
  return sprite ? new THREE.SpriteMaterial(opts) : new THREE.MeshBasicMaterial(opts);
}
// a leaf (props.js leafGeo, built in metres) with its base at p, pointing along dir, its face toward n, scaled by s
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
function leafOn(p, dir, n, s) {
  _z.copy(dir).normalize();
  _x.crossVectors(n, _z).normalize();
  _y.crossVectors(_z, _x);
  return new THREE.Matrix4().makeBasis(_x, _y, _z).scale(new THREE.Vector3(s, s, s)).setPosition(p);
}

// a plaster wall along Z (its faces toward -X and +X), from z0 to z1, x0..x1 thick, with arched window holes
// { a0, a1 (z), v0 (sill), v1 (where the half circle starts) }
export function archWallZ(mat, { x0, x1, z0, z1, y0 = 0, y1, ops = [] }) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(z1 - z0, 0);
  s.lineTo(z1 - z0, y1 - y0);
  s.lineTo(0, y1 - y0);
  s.lineTo(0, 0);
  for (const o of ops) {
    const u0 = o.a0 - z0, u1 = o.a1 - z0, r = (u1 - u0) / 2;
    const p = new THREE.Path();
    p.moveTo(u0, o.v0 - y0);
    p.lineTo(u1, o.v0 - y0);
    p.lineTo(u1, o.v1 - y0);
    if (o.arch === false) p.lineTo(u0, o.v1 - y0);
    else p.absarc(u0 + r, o.v1 - y0, r, 0, Math.PI, false);
    p.lineTo(u0, o.v0 - y0);
    s.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false, curveSegments: 20 });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x1, y0, z0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}
// the daylight seen through a window in a wall along Z: a flat panel just outside it (facing +X), arched or square
function daylightX(M, { x, a0, a1, v0, v1, arch = true, grow = 0.3 }) {
  const r = (a1 - a0) / 2 + grow;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, v1 - v0);
  if (arch) s.absarc(0, v1 - v0, r, 0, Math.PI, false);
  else s.lineTo(-r, v1 - v0);
  s.lineTo(-r, 0);
  const geo = new THREE.ShapeGeometry(s, 20);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, M.daylight);
  m.position.set(x, v0 - grow, (a0 + a1) / 2);
  m.userData.kind = 'day';
  return m;
}
// lamp shades glow a little once the opening switches the lamps on
function shadeGlow(M) {
  return { mat: M.shade, base: M.shade.emissiveIntensity, emissive: true };
}

// ── 거실 (living room, on the floor in front of the plinth) ────────────────────────
// A corner room: the arched window wall at the left (x 5.4..6.8), the plinth's front face (z = 11) behind, dressed in
// blush plaster. The sofa backs onto the window, an oval oak coffee table, a lounge chair across, a walnut sideboard under
// a print, wall shelves, a bird of paradise in the corner. 1 m = 4.6 units (ceiling 13.2 = 2.87 m).
// The room is composed at x 5.4..28.8 and then moved by dx (2026-10-27, user: centre it on the plinth behind it): the
// plinth's front face runs x -2.67..25.83, so dx -5.5 puts the room (window wall included) on its centre line.
// flight.js LIVING_DX moves the living room's camera keys by the same amount.
export const LIVING = { s: 4.6, x0: 6.8, x1: 28.8, z0: 11, z1: 32.6, fy: 0.3, wallH: 13.2, win: { a0: 19.4, a1: 24.8, v0: 3.4, v1: 8.0 }, dx: -5.5 };
export function livingRoom(M) {
  const room = composeLiving(M);
  const { dx } = LIVING;
  for (const o of room.solid.children) o.position.x += dx;
  for (const o of room.glow) o.position.x += dx;
  for (const c of room.contacts) c[0] += dx;
  room.label.x += dx;
  return room;
}
function composeLiving(M) {
  const { s, x0, x1, z0, z1, fy, wallH, win } = LIVING;
  const solid = new THREE.Group();
  const C = [];
  const m = (v) => v * s; // metres to units
  // shell: oak floor slab, the window wall, a plaster skin on the plinth face (and a short return past its edge)
  solid.add(planarBox(M.floorOak, [x0 - 1.4, x1], [0, fy], [z0, z1], PLANK_TILE * s));
  solid.add(archWallZ(M.plasterBlush, { x0: 5.4, x1: x0, z0, z1, y1: wallH, ops: [win] }));
  solid.add(blk(M.plasterBlush, [x0, x1], [0, wallH], [z0, z0 + 0.3], 0));
  solid.add(P.windowFrame(M, { w: (win.a1 - win.a0) / s, h: (win.v1 - win.v0) / s, arch: true, t: 1.4 / s, x: x0, y: win.v0, z: (win.a0 + win.a1) / 2, rot: R90, s }));
  solid.add(P.skirting(M, { len: (x1 - x0) / s, x: (x0 + x1) / 2, y: fy, z: z0 + 0.3, s }));
  solid.add(P.skirting(M, { len: (z1 - z0) / s, x: x0, y: fy, z: (z0 + z1) / 2, rot: R90, s }));
  const Y = fy;
  const zb = z0 + 0.3; // the back wall's face
  // rug, sofa, coffee table, lounge chair
  solid.add(P.rug(M, { w: 3.1, d: 2.3, style: 'border', base: 0xece4d7, accent: 0xc8a688, x: 15.6, y: Y, z: 22.4, rot: R90, s }));
  const sofaX = x0 + m(0.06 + 0.475), sofaZ = 22.4;
  const glbSofa = G(M, 'sofa', { x: sofaX, y: Y, z: sofaZ, rot: R90, s }); // 2.2 m, sage linen on oak legs, seat 0.475 m
  if (glbSofa) {
    solid.add(glbSofa);
    solid.add(cushions(M, [[M.linen, -0.62, 0.12, 0.25], [M.clayFab, -0.24, -0.08, -0.15], [M.oat, 0.6, -0.1, 0.2]], { y: 0.685, z: -0.03 }, { x: sofaX, y: Y, z: sofaZ, rot: R90, s }));
  } else {
    solid.add(P.sofa(M, { len: 2.5, fabric: M.sage, pillows: [M.linen, M.clayFab, M.oat], throwOn: M.oat, x: sofaX, y: Y, z: sofaZ, rot: R90, s }));
  }
  // the coffee table: the library's round marble one at 1.1 m across (0.42 m high), 0.42 m of leg room in front of the
  // sofa; else the drawn oval oak one
  let tableX, tY;
  const glbTable = has(M, 'coffee_table');
  if (glbTable) {
    const r = (M.lib.dims('coffee_table').w / 2) * 0.85;
    tableX = sofaX + m(0.475 + 0.42 + r);
    tY = Y + m(top(M, 'coffee_table') * 0.85);
    solid.add(G(M, 'coffee_table', { x: tableX, y: Y, z: sofaZ, s, k: 0.85 }));
  } else {
    tableX = sofaX + m(0.475 + 0.42 + 0.31);
    tY = Y + m(0.4);
    solid.add(P.coffeeTable(M, { len: 1.25, wid: 0.62, x: tableX, y: Y, z: sofaZ, rot: R90, s }));
  }
  // a small flowering pot on the table (0.35 m: below the sofa's back, like the reference's small vase), a turned bowl
  if (glbTable && has(M, 'plant_flower')) solid.add(G(M, 'plant_flower', { x: tableX - m(0.1), y: tY, z: sofaZ - m(0.18), rot: 0.6, s, k: 0.6 }));
  else solid.add(P.flowers(M, { kind: 'ranunculus', vaseKind: 'pitcher', vaseMat: M.ceramicSage, k: 1.05, colors: ['blush', 'white', 'peach', 'coral'], n: 10, h: 0.26, x: tableX - 0.4, y: tY, z: sofaZ - m(0.32), s }));
  if (glbTable) {
    solid.add(G(M, 'bowl_wood', { x: tableX + m(0.2), y: tY, z: sofaZ + m(0.02), rot: 0.4, s, k: 1.6 }) ?? P.bowl(M, { r: 0.13, mat: M.stoneware, x: tableX + m(0.2), y: tY, z: sofaZ + m(0.02), s }));
    solid.add(G(M, 'books_stack', { x: tableX - m(0.12), y: tY, z: sofaZ + m(0.24), rot: 0.3, s }) ?? P.bookStack(M, { n: 2, x: tableX - m(0.12), y: tY, z: sofaZ + m(0.24), rot: 0.3, seed: 8, s }));
  } else {
    solid.add(P.bowl(M, { r: 0.13, mat: M.stoneware, x: tableX + 0.3, y: tY, z: sofaZ + m(0.05), s }));
    solid.add(P.bookStack(M, { n: 2, x: tableX - 0.1, y: tY, z: sofaZ + m(0.34), rot: 0.3, seed: 8, s }));
  }
  // across the table: a lounge chair turned toward the sofa, a small table at its side
  solid.add(G(M, 'lounge_chair', { x: 23.0, y: Y, z: 18.6, rot: -1.05, s }) ?? P.loungeChair(M, { fabric: M.linen, x: 23.0, y: Y, z: 18.6, rot: -1.05, s }));
  if (has(M, 'side_table')) {
    solid.add(G(M, 'side_table', { x: 24.8, y: Y, z: 22.6, rot: -1.05, s }));
    const st = Y + m(top(M, 'side_table'));
    solid.add(G(M, 'vase_wide', { x: 24.8, y: st, z: 22.6, s }) ?? P.vase(M, { kind: 'jar', mat: M.ceramicDark, k: 0.9, x: 24.8, y: st, z: 22.6, s }));
    solid.add(shelfBooks(M, { x: 24.8, y: Y + m(SIDE_SHELF), z: 22.6, rot: -0.9, s }));
  } else {
    solid.add(P.pedestalTable(M, { r: 0.24, h: 0.42, x: 24.8, y: Y, z: 22.6, s }));
    solid.add(P.vase(M, { kind: 'jar', mat: M.ceramicDark, k: 0.9, x: 24.8, y: Y + m(0.42), z: 22.6, s }));
  }
  // the corner: a tall potted plant (1.6 m); a side table with a lamp at the sofa's far end
  // (the model's leaves reach 0.47 m from its stem: it stands that far out of the corner, clear of both walls)
  const tall = G(M, 'plant_tall', { x: x0 + m(0.52), y: Y, z: zb + m(0.47), rot: 2.4, s, k: 1.2 });
  const tallAt = tall ? [x0 + m(0.52), zb + m(0.47)] : [x0 + m(0.36), zb + m(0.38)];
  solid.add(tall ?? P.plant(M, { kind: 'paradise', potKind: 'round', potR: 0.24, potH: 0.42, h: 1.65, x: tallAt[0], y: Y, z: tallAt[1], seed: 3, s }));
  const endZ = sofaZ + m(1.25 + 0.3);
  let endTop = 0.56;
  if (has(M, 'side_table')) {
    endTop = top(M, 'side_table');
    solid.add(G(M, 'side_table', { x: x0 + m(0.32), y: Y, z: endZ, rot: R90, s }));
    solid.add(shelfBooks(M, { x: x0 + m(0.32), y: Y + m(SIDE_SHELF), z: endZ, rot: R90 + 0.15, s }));
  } else {
    solid.add(P.sideTable(M, { r: 0.22, h: 0.56, x: x0 + m(0.32), y: Y, z: endZ, s }));
  }
  solid.add(G(M, 'table_lamp', { x: x0 + m(0.32), y: Y + m(endTop), z: endZ, s }) ?? P.tableLamp(M, { base: M.ceramic, h: 0.5, x: x0 + m(0.32), y: Y + m(endTop), z: endZ, s }));
  // the back wall: a walnut sideboard dressed with ceramics and books, a print above it, oak shelves to its right
  const sbX = 17.2;
  const glbSb = G(M, 'sideboard', { x: sbX, y: Y, z: zb + m(0.27), s }); // 2.44 m walnut with slatted doors
  solid.add(glbSb ?? P.sideboard(M, { len: 1.9, wood: M.walnut, x: sbX, y: Y, z: zb + m(0.225), s }));
  const sbY = Y + m(glbSb ? top(M, 'sideboard') : 0.62);
  if (glbSb && has(M, 'vase_bulb', 'vase_bottle', 'books_stack', 'plant_aloe')) {
    solid.add(G(M, 'vase_bulb', { x: sbX - m(0.9), y: sbY, z: zb + m(0.26), s }));
    solid.add(G(M, 'vase_bottle', { x: sbX - m(0.64), y: sbY, z: zb + m(0.3), rot: 0.8, s, k: 0.8 }));
    solid.add(G(M, 'books_stack', { x: sbX + m(0.12), y: sbY, z: zb + m(0.27), rot: 0.12, s }));
    // a stoneware bowl on the books (the turned wooden bowl is kept to the coffee table and the dining table)
    solid.add(P.bowl(M, { r: 0.11, mat: M.stoneware, x: sbX + m(0.12), y: sbY + m(0.074), z: zb + m(0.27), s }));
    solid.add(G(M, 'plant_aloe', { x: sbX + m(0.8), y: sbY, z: zb + m(0.26), rot: 0.5, s, k: 1.3 }));
  } else {
    solid.add(P.vase(M, { kind: 'amphora', mat: M.ceramicSand, k: 1.05, x: sbX - m(0.6), y: sbY, z: zb + m(0.2), s }));
    solid.add(P.flowers(M, { kind: 'tulip', vaseKind: 'bottle', vaseMat: M.ceramic, k: 0.85, colors: ['white', 'peach'], n: 5, h: 0.2, x: sbX - m(0.36), y: sbY, z: zb + m(0.26), s }));
    solid.add(P.bookStack(M, { n: 3, x: sbX + m(0.05), y: sbY, z: zb + m(0.22), seed: 5, s }));
    solid.add(P.bowl(M, { r: 0.11, mat: M.ceramicSage, x: sbX + m(0.05), y: sbY + m(0.09), z: zb + m(0.22), s }));
    solid.add(P.plant(M, { kind: 'pothos', potKind: 'cylinder', potR: 0.08, potH: 0.13, potMat: M.ceramic, h: 0.35, x: sbX + m(0.62), y: sbY, z: zb + m(0.2), seed: 2, s }));
  }
  solid.add(P.artFrame(M, { w: 1.0, h: 0.74, art: 'arch', frame: 'oak', x: sbX, y: Y + m(1.12), z: zb, s }));
  solid.add(P.wallShelf(M, { len: 0.8, rows: [0, 0.38], x: 25.6, y: Y + m(1.15), z: zb, s }));
  const sh0 = Y + m(1.174), sh1 = Y + m(1.554);
  if (has(M, 'books_row', 'vase_wide', 'plant_aloe', 'vase_bottle')) {
    solid.add(G(M, 'books_row', { x: 25.6 - m(0.2), y: sh0, z: zb + m(0.11), s }));
    solid.add(G(M, 'vase_wide', { x: 25.6 + m(0.2), y: sh0, z: zb + m(0.11), rot: 1.2, s, k: 0.75 }));
    solid.add(G(M, 'plant_aloe', { x: 25.6 - m(0.16), y: sh1, z: zb + m(0.11), rot: 2.2, s }));
    solid.add(G(M, 'vase_bottle', { x: 25.6 + m(0.2), y: sh1, z: zb + m(0.11), rot: -0.6, s, k: 0.7 }));
  } else {
    solid.add(P.bookRow(M, { len: 0.45, x: 25.6 - m(0.36), y: sh0, z: zb + m(0.11), seed: 4, hMax: 0.25, s }));
    solid.add(P.vase(M, { kind: 'jar', mat: M.ceramicSage, k: 0.8, x: 25.6 + m(0.25), y: sh0, z: zb + m(0.11), s }));
    solid.add(P.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.07, potH: 0.11, potMat: M.ceramicSand, h: 0.5, x: 25.6 - m(0.15), y: sh1, z: zb + m(0.11), seed: 6, s }));
    solid.add(P.vase(M, { kind: 'bud', mat: M.ceramicDark, k: 0.85, x: 25.6 + m(0.22), y: sh1, z: zb + m(0.1), s }));
  }
  // a print on the window wall, beside the window
  solid.add(P.artFrame(M, { w: 0.5, h: 0.65, art: 'botanical', frame: 'white', on: 'right', x: x0, y: Y + m(1.2), z: 15.6, rot: R90, s }));
  solid.add(P.floorLamp(M, { h: 1.6, x: 26.3, y: Y, z: 15.0, s }));
  C.push(
    [sofaX, Y, sofaZ, m(0.62), m(glbSofa ? 1.25 : 1.38), 0.5], [23.0, Y + 0.02, 18.6, m(0.5), m(0.5), 0.4],
    [tallAt[0], Y, tallAt[1], m(0.36), m(0.36), 0.45], [sbX, Y, zb + m(0.24), m(glbSb ? 1.32 : 1.05), m(0.32), 0.4], [24.8, Y + 0.02, 22.6, m(0.3), m(0.3), 0.3],
    [x0 + m(0.32), Y, endZ, m(0.28), m(0.28), 0.4],
    glbTable ? [tableX, Y + 0.02, sofaZ, m(0.62), m(0.62), 0.3] : [tableX, Y + 0.02, sofaZ, m(0.34), m(0.66), 0.16],
  );
  const glow = [daylightX(M, { x: 5.25, ...win })];
  const glows = [shadeGlow(M), modelGlow(M, 'table_lamp', 'lamp_shade')].filter(Boolean);
  return { solid, glow, glows, contacts: C, label: new THREE.Vector3(sofaX + 1.2, Y + m(0.5), sofaZ - 1.5) };
}

// ── 주방·다이닝 (kitchen and dining, on the right ledge, top y = L) ───────────────────
// The long block's face behind is dressed in sand plaster; an oak pantry wall, a sage run with a marble splash, a
// plaster hood and an oak shelf; an oak island with stools; the dining table under two pendants (pendantPair).
// 1 m = 3.33 units.
export function kitchenRoom(M, { L }) {
  const s = 3.33, x0 = 30, x1 = 50.83, zw = -3.33, zf = 9.17;
  const m = (v) => v * s;
  const Y = L + 0.1;
  const solid = new THREE.Group();
  const C = [];
  solid.add(planarBox(M.floorPale, [x0, x1], [L, Y], [zw, zf], PLANK_TILE * s));
  const zb = zw + 0.14;
  solid.add(blk(M.plasterSand, [x0, x1], [L, Y + m(2.55)], [zw, zb], 0));
  solid.add(P.skirting(M, { len: (x1 - x0) / s, x: (x0 + x1) / 2, y: Y, z: zb, s }));
  // pantry wall and the run
  for (const i of [0, 1]) solid.add(P.tallUnit(M, { len: 0.62, h: 2.3, front: M.oak, x: x0 + m(0.31 + i * 0.62) + 0.1, y: Y, z: zb + m(0.31), s }));
  const runX0 = x0 + m(1.24) + 0.1, runLen = 2.7;
  const runX = runX0 + m(runLen / 2);
  solid.add(P.kitchenRun(M, { len: runLen, front: M.cabSage, x: runX, y: Y, z: zb + m(0.31), sinkAt: -0.65, hobAt: 0.75, s }));
  const ctop = Y + m(0.9);
  solid.add(planarBox(M.marble, [runX0, runX0 + m(runLen)], [ctop, ctop + m(0.62)], [zb, zb + 0.05], 0.9 * s));
  solid.add(P.hood(M, { w: 0.72, d: 0.48, h: 0.55, mat: M.plasterWhite, x: runX + m(0.75), y: Y + m(1.72), z: zb, s }));
  const shX = runX - m(0.55), shY = Y + m(1.66);
  solid.add(P.floatShelf(M, { len: 1.1, x: shX, y: shY, z: zb, s }));
  const onShelf = shY + m(0.045);
  // two nested ceramic bowls (the wooden bowl is on the dining table, a few steps away)
  solid.add(P.bowl(M, { r: 0.1, mat: M.ceramic, x: shX - m(0.4), y: onShelf, z: zb + m(0.12), s }));
  solid.add(P.bowl(M, { r: 0.08, mat: M.ceramicSage, x: shX - m(0.4), y: onShelf + m(0.045), z: zb + m(0.12), s }));
  solid.add(P.vase(M, { kind: 'jar', mat: M.glassAmber, k: 0.9, x: shX - m(0.12), y: onShelf, z: zb + m(0.12), s }));
  solid.add(G(M, 'vase_bottle', { x: shX + m(0.14), y: onShelf, z: zb + m(0.12), rot: 0.9, s, k: 0.7 }) ?? P.vase(M, { kind: 'pitcher', mat: M.ceramicSand, k: 1, x: shX + m(0.14), y: onShelf, z: zb + m(0.12), s }));
  solid.add(P.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.07, potH: 0.11, potMat: M.ceramic, h: 0.45, x: shX + m(0.42), y: onShelf, z: zb + m(0.12), seed: 7, s }));
  solid.add(P.board(M, { w: 0.32, h: 0.44, x: runX - m(0.05), y: ctop, z: zb + 0.05, s }));
  solid.add(P.bottles(M, { x: runX + m(1.18), y: ctop, z: zb + m(0.12), s }));
  solid.add(G(M, 'plant_aloe', { x: runX - m(1.15), y: ctop, z: zb + m(0.2), rot: 0.3, s }) ?? P.plant(M, { kind: 'herb', potKind: 'terracotta', potR: 0.07, potH: 0.11, h: 0.16, x: runX - m(1.15), y: ctop, z: zb + m(0.2), seed: 5, s }));
  // the island and its stools (the library's stool is a bar stool: brought to counter height, seat 0.65 m)
  const isX = x0 + m(2.05), isZ = 3.1;
  solid.add(P.island(M, { len: 1.95, d: 0.88, front: M.oak, x: isX, y: Y, z: isZ, s }));
  for (const dx of [-0.62, 0, 0.62]) {
    const at = { x: isX + m(dx), y: Y, z: isZ + m(0.78), s };
    solid.add(G(M, 'bar_stool', { ...at, rot: dx * 0.8, maxH: 0.66 }) ?? P.barStool(M, { seat: M.leather, ...at }));
  }
  solid.add(P.fruitBowl(M, { x: isX - m(0.45), y: Y + m(0.9), z: isZ - m(0.05), s }));
  solid.add(P.flowers(M, { kind: 'branch', vaseKind: 'tall', vaseMat: M.ceramic, colors: ['white', 'blush'], n: 5, h: 0.42, x: isX + m(0.55), y: Y + m(0.9), z: isZ - m(0.1), s }));
  // dining: an oak table along x on a flat-weave rug, four chairs, a vase of tulips
  const tX = 46.75, tZ = 3.0;
  solid.add(P.rug(M, { w: 2.7, d: 2.0, style: 'stripe', base: 0xe2d7c4, accent: 0xb9a07f, key: 'dine', x: tX, y: Y, z: tZ, s }));
  const glbDine = G(M, 'dining_table', { x: tX, y: Y, z: tZ, s }); // 1800 x 900 oak, top 0.74 m, no apron
  solid.add(glbDine ?? P.diningTable(M, { len: 1.75, wid: 0.9, wood: M.oak, x: tX, y: Y, z: tZ, s }));
  for (const dx of [-0.42, 0.42]) {
    for (const [dz, rot] of [[-0.62, 0], [0.62, Math.PI]]) {
      const at = { x: tX + m(dx), y: Y, z: tZ + m(dz), rot, s };
      solid.add(G(M, 'dining_chair', at) ?? P.diningChair(M, at));
    }
  }
  const dY = Y + m(glbDine ? top(M, 'dining_table') : 0.75);
  solid.add(P.flowers(M, { kind: 'tulip', vaseKind: 'pitcher', vaseMat: M.ceramicSand, colors: ['white', 'peach', 'butter'], n: 7, h: 0.2, x: tX - m(0.1), y: dY, z: tZ, s }));
  solid.add(G(M, 'bowl_wood', { x: tX + m(0.45), y: dY, z: tZ + m(0.05), rot: 1.1, s, k: 1.8 }) ?? P.bowl(M, { r: 0.14, mat: M.stoneware, x: tX + m(0.45), y: dY, z: tZ + m(0.05), s }));
  solid.add(P.candle(M, { x: tX - m(0.5), y: dY, z: tZ - m(0.05), s }));
  // the wall over the table: a still life; an olive tree in the far corner
  solid.add(P.artFrame(M, { w: 0.7, h: 0.9, art: 'stilllife', frame: 'oak', x: tX, y: Y + m(1.2), z: zb, s }));
  solid.add(P.plant(M, { kind: 'olive', potKind: 'terracotta', potR: 0.24, potH: 0.42, h: 1.55, x: x1 - m(0.38), y: Y, z: zb + m(0.4), seed: 4, s }));
  C.push(
    [isX, Y + 0.02, isZ, m(1.15), m(0.62), 0.45], [x0 + m(0.66), Y, zb + m(0.33), m(0.75), m(0.42), 0.4], [runX, Y, zb + m(0.34), m(1.45), m(0.42), 0.35],
    [tX, Y + 0.02, tZ, m(0.95), m(0.55), 0.16], [x1 - m(0.38), Y, zb + m(0.4), m(0.34), m(0.34), 0.4],
  );
  for (const dx of [-0.62, 0, 0.62]) C.push([isX + m(dx), Y + 0.02, isZ + m(0.78), m(0.24), m(0.24), 0.3]);
  return { solid, glow: [], glows: [], contacts: C, label: new THREE.Vector3(tX, Y + m(0.9), tZ + 0.6), table: { x: tX, z: tZ, y: dY, s } };
}

// two dome pendants over the dining table: ceramic domes on short cords from slim brass arms that reach out from the
// kitchen wall behind (wallZ) at armY, the way a wall-mounted swing-arm pendant does. Returned in the shape kit.js bulb()
// gives (userData glass / halo / base), so the opening switches them on with the bulbs; in daylight they carry no light
// of their own.
// With the model library (M.lib has 'pendant_globe'), each arm carries the library's glass globe pendant instead,
// hanging from the arm's end (the model's origin is its ceiling plate; the glass glows with the bulbs, and at.y is not
// used: the globe hangs GLOBE_DROP below armY). Callers without a library (final/stills/carousel.js) get the domes
// exactly as before.
export const GLOBE_DROP = 0.952; // the globe pendant's height below its plate, metres (models/library.json)
export function pendantPair(M, { at, gap = 2.4, armY, wallZ = -3.19, s = 3.33, axis = 'x' }) {
  const out = [];
  const globe = M.lib?.has('pendant_globe');
  [-1, 1].forEach((side) => {
    const x = at.x + (axis === 'x' ? (side * gap) / 2 : 0), y = at.y, z = at.z + (axis === 'z' ? (side * gap) / 2 : 0);
    const g = new THREE.Group();
    if (globe) {
      const fixed = new THREE.Group(); // the brass arm and its wall plate
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * s, 0.011 * s, z - wallZ + 0.03 * s, 8), M.brass);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(x, armY + 0.011 * s, (z + wallZ) / 2 + 0.015 * s);
      arm.castShadow = true;
      fixed.add(arm);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.02 * s, 16), M.brass);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(x, armY + 0.011 * s, wallZ + 0.01 * s);
      fixed.add(plate);
      g.add(bake(fixed));
      const lamp = M.lib.place('pendant_globe', { x, y: armY, z, s });
      // each globe has its own glass material, so the two switch on one after the other
      let glass = null;
      for (const c of lamp.children) {
        if (!c.material.userData.glass) continue;
        c.material = glass = cloneMaterial(c.material);
        c.castShadow = false; // lit glass: no hard shadow of it on the table
      }
      g.add(lamp);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffe3bd, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.visible = false;
      g.add(halo);
      g.userData = { glass: glass ?? M.glow.clone(), halo, base: 0, x, wire: [armY, armY - 0.5 * s] };
      out.push(g);
      return;
    }
    const fixed = new THREE.Group(); // dome, cord, arm and plate: baked into a few meshes
    fixed.add(P.pendantLamp(M, { r: 0.22, cord: 0, mat: M.ceramic, x, y, z, s }));
    const cordBot = y + (0.22 * 0.7 + 0.05) * s;
    const cr = 0.006 * s;
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr, armY - cordBot, 5), M.black);
    wire.position.set(x, (armY + cordBot) / 2, z);
    fixed.add(wire);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * s, 0.011 * s, z - wallZ + 0.03 * s, 8), M.brass);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(x, armY, (z + wallZ) / 2 + 0.015 * s);
    arm.castShadow = true;
    fixed.add(arm);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.02 * s, 16), M.brass);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(x, armY, wallZ + 0.01 * s);
    fixed.add(plate);
    g.add(bake(fixed));
    // the lit underside: an emissive disc (the glass the opening switches on)
    const glass = M.glow.clone();
    const under = new THREE.Mesh(new THREE.CircleGeometry(0.2 * s, 28), glass);
    under.rotation.x = Math.PI / 2;
    under.position.set(x, y + 0.02, z);
    g.add(under);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffe3bd, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.visible = false;
    g.add(halo);
    g.userData = { glass, halo, base: 0, x };
    out.push(g);
  });
  return out;
}

// ── 침실 (bedroom, on the upper platform, top y = UT) ───────────────────────────────
// Rose plaster walls at the back and the left (a tall window with linen curtains), an oak floor: the bed with a sage
// channelled headboard between walnut nightstands, a bench at its foot, a reading chair by the window, a fiddle-leaf fig.
// 1 m = 3.33 units (walls 2.5 m).
export function bedroomRoom(M, { UT }) {
  const s = 3.33, x0 = 26.67, x1 = 47.5, z0 = -21.33, z1 = -8;
  const m = (v) => v * s;
  const Y = UT + 0.1;
  const wallH = m(2.5);
  const solid = new THREE.Group();
  const C = [];
  const tw = 0.5; // wall thickness
  const xl = x0 + tw, zb = z0 + tw;
  solid.add(planarBox(M.floorOak, [xl, x1], [UT, Y], [zb, z1], PLANK_TILE * s));
  solid.add(blk(M.plasterRose, [x0, x1], [UT, UT + wallH], [z0, zb], 0));
  const win = { a0: -17.6, a1: -12.6, v0: Y + m(0.55), v1: Y + m(2.15), arch: false };
  solid.add(archWallZ(M.plasterRose, { x0, x1: xl, z0: zb, z1, y0: UT, y1: UT + wallH, ops: [win] }));
  solid.add(P.windowFrame(M, { w: (win.a1 - win.a0) / s, h: (win.v1 - win.v0) / s, arch: false, t: tw / s, x: xl, y: win.v0, z: (win.a0 + win.a1) / 2, rot: R90, s }));
  solid.add(P.skirting(M, { len: (x1 - xl) / s, x: (xl + x1) / 2, y: Y, z: zb, s }));
  solid.add(P.skirting(M, { len: (z1 - zb) / s, x: xl, y: Y, z: (zb + z1) / 2, rot: R90, s }));
  // rug, bed, nightstands with lamps, a print above
  const bX = 38.4;
  const bZ = zb + m(2.1 / 2 + 0.09);
  solid.add(P.rug(M, { w: 2.9, d: 2.5, style: 'plain', base: 0xe8dfd1, accent: 0xd2c4ad, key: 'bedroom', x: bX, y: Y, z: bZ + m(0.35), s }));
  // the library's queen bed (oak frame, sand linen headboard, white bedding, sage throw; 2.145 m long, its headboard
  // 6 cm off the wall) with a rust lumbar cushion; else the drawn one
  const bedAt = { x: bX, y: Y, z: zb + m(0.06 - (M.lib?.dims('bed')?.min.z ?? -1.07)), s };
  const glbBed = G(M, 'bed', bedAt);
  if (glbBed) {
    solid.add(glbBed);
    solid.add(cushions(M, [[M.rust, 0]], { y: 0.655, z: -0.56, tilt: -0.5, w: 0.56, h: 0.3, t: 0.13 }, bedAt));
  } else {
    solid.add(P.bed(M, { w: 1.8, l: 2.1, wood: M.oak, head: M.sage, accent: M.rust, throwMat: M.oat, x: bX, y: Y, z: bZ, s }));
  }
  // nightstands: the library's two-tier oak side table (books on its lower shelf) under its sage lamp; else walnut ones
  const stands = has(M, 'side_table');
  for (const sx of [-1, 1]) {
    const nx = bX + sx * m(0.9 + 0.08 + 0.27);
    const standTop = Y + m(stands ? top(M, 'side_table') : 0.52);
    if (stands) {
      solid.add(G(M, 'side_table', { x: nx, y: Y, z: zb + m(0.245), s }));
      solid.add(shelfBooks(M, { x: nx, y: Y + m(SIDE_SHELF), z: zb + m(0.25), rot: sx * 0.12, s }));
    } else {
      solid.add(P.nightstand(M, { wood: M.walnut, x: nx, y: Y, z: zb + m(0.22), s }));
    }
    solid.add(G(M, 'table_lamp', { x: nx + sx * m(0.05), y: standTop, z: zb + m(0.22), s }) ?? P.tableLamp(M, { base: sx < 0 ? M.ceramicSand : M.ceramic, h: 0.44, shadeR: 0.15, x: nx + sx * m(0.06), y: standTop, z: zb + m(0.2), s }));
  }
  if (!stands) {
    const lnx = bX - m(1.25);
    solid.add(P.bookStack(M, { n: 2, w: 0.2, d: 0.14, x: lnx + m(0.1), y: Y + m(0.52), z: zb + m(0.27), seed: 2, s }));
    solid.add(P.flowers(M, { kind: 'tulip', vaseKind: 'bud', vaseMat: M.ceramic, colors: ['white', 'butter'], n: 3, h: 0.15, x: bX + m(1.15), y: Y + m(0.52), z: zb + m(0.3), s }));
  }
  solid.add(P.artFrame(M, { w: 1.2, h: 0.68, art: 'hills', frame: 'oak', x: bX, y: Y + m(1.38), z: zb, s }));
  solid.add(P.bench(M, { len: 1.35, wood: M.oak, fabric: M.boucle, x: bX, y: Y, z: bZ + m(1.05 + 0.38), s }));
  // the window: curtains drawn to its sides; a reading chair, a floor lamp and a little table in front of it
  solid.add(P.curtain(M, { w: 0.62, h: 2.42, folds: 5, x: xl, y: Y, z: win.a0 - m(0.33), rot: R90, s }));
  solid.add(P.curtain(M, { w: 0.62, h: 2.42, folds: 5, x: xl, y: Y, z: win.a1 + m(0.33), rot: R90, s }));
  solid.add(G(M, 'armchair', { x: xl + m(0.75), y: Y, z: -10.6, rot: 2.3, s }) ?? P.armchair(M, { fabric: M.boucle, x: xl + m(0.75), y: Y, z: -10.6, rot: 2.3, s }));
  solid.add(P.floorLamp(M, { h: 1.5, shadeR: 0.18, x: xl + m(0.28), y: Y, z: -8.9, s }));
  if (has(M, 'side_table', 'plant_flower')) {
    // by the window: the side table with a flowering plant on it and a cup on its lower shelf
    solid.add(G(M, 'side_table', { x: xl + m(1.5), y: Y, z: -9.2, rot: 0.7, s }));
    solid.add(G(M, 'plant_flower', { x: xl + m(1.5), y: Y + m(top(M, 'side_table')), z: -9.2, rot: 1.9, s, k: 0.75 })); // under the armchair's back
    solid.add(P.cup(M, { mat: M.ceramicSage, x: xl + m(1.5) + m(0.08), y: Y + m(SIDE_SHELF), z: -9.2, s }));
  } else {
    solid.add(P.sideTable(M, { r: 0.18, h: 0.48, x: xl + m(1.5), y: Y, z: -9.2, s }));
    solid.add(P.cup(M, { mat: M.ceramicSage, x: xl + m(1.5), y: Y + m(0.48), z: -9.2, s }));
  }
  // a big leafy plant in the far corner
  solid.add(G(M, 'plant_syngonium', { x: x1 - m(0.42), y: Y, z: zb + m(0.4), rot: 0.8, s, k: 1.25 }) ?? P.plant(M, { kind: 'fiddle', potKind: 'basket', potR: 0.2, potH: 0.3, h: 1.45, x: x1 - m(0.35), y: Y, z: zb + m(0.32), seed: 2, s }));
  C.push(
    [bX, Y + 0.02, bZ, m(1.0), m(1.2), 0.5], [bX - m(1.25), Y, zb + m(0.25), m(0.3), m(0.26), 0.4], [bX + m(1.25), Y, zb + m(0.25), m(0.3), m(0.26), 0.4],
    [bX, Y + 0.02, bZ + m(1.43), m(0.72), m(0.25), 0.22], [xl + m(0.75), Y, -10.6, m(0.45), m(0.45), 0.45], [x1 - m(0.35), Y, zb + m(0.32), m(0.3), m(0.3), 0.45],
  );
  const glow = [daylightX(M, { x: x0 - 0.12, ...win, arch: false, grow: 0.25 })];
  const glows = [modelGlow(M, 'table_lamp', 'lamp_shade')].filter(Boolean);
  return { solid, glow, glows, contacts: C, label: new THREE.Vector3(bX, Y + m(0.6), bZ + m(0.4)) };
}

// ── the ledges between the rooms (2026-10-26 review: by day the transit frames were blank stone) ─────────────
// The top of the long block (y 34.33), which the camera cranes past on its way up to the bedroom: an oak and linen
// bench against the bedroom platform's front face, an olive tree in terracotta and a tall stoneware jar beside it, and
// a bird of paradise left of the bedroom stairs. 1 m = 3.33 units, like the bedroom.
export function ledgeDressing(M, { y = 34.33 } = {}) {
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  const zf = -8; // the bedroom platform's front face
  solid.add(P.bench(M, { len: 1.5, d: 0.42, wood: M.oak, fabric: M.linen, x: 41.2, y, z: zf + m(0.32), s }));
  solid.add(P.bookStack(M, { n: 2, w: 0.24, d: 0.17, x: 40.1, y: y + m(0.45), z: zf + m(0.32), seed: 9, s }));
  solid.add(P.cup(M, { mat: M.ceramicSage, x: 42.6, y: y + m(0.45), z: zf + m(0.34), s }));
  solid.add(P.plant(M, { kind: 'olive', potKind: 'terracotta', potR: 0.26, potH: 0.44, h: 1.7, x: 45.6, y, z: zf + m(0.45), seed: 6, s }));
  solid.add(P.vase(M, { kind: 'urn', mat: M.stoneware, k: 2.3, x: 37.3, y, z: zf + m(0.32), s }));
  solid.add(P.plant(M, { kind: 'paradise', potKind: 'round', potR: 0.22, potH: 0.4, potMat: M.ceramic, h: 1.6, x: 24.6, y, z: -5.6, seed: 5, s }));
  return {
    solid,
    contacts: [
      [41.2, y, zf + m(0.32), m(0.85), m(0.32), 0.42], [45.6, y, zf + m(0.45), m(0.36), m(0.36), 0.45],
      [37.3, y, zf + m(0.32), m(0.3), m(0.3), 0.4], [24.6, y, -5.6, m(0.32), m(0.32), 0.45],
    ],
  };
}
// The ground between the plinth's lit doorway (its right face, x 25.83) and the kitchen ledge (x 30): a tall fiddle-leaf
// fig in a basket and a low stoneware stool, which the camera passes on its way into the kitchen.
export function archDressing(M) {
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  solid.add(P.plant(M, { kind: 'fiddle', potKind: 'basket', potR: 0.26, potH: 0.38, h: 2.0, x: 27.7, y: 0, z: 7.4, seed: 8, s }));
  solid.add(P.pot(M, { kind: 'cylinder', r: 0.17, h: 0.42, mat: M.stoneware, x: 27.4, y: 0, z: 9.9, s }));
  solid.add(P.vase(M, { kind: 'tall', mat: M.ceramicSand, k: 1.4, x: 27.9, y: 0, z: -1.6, s }));
  return { solid, contacts: [[27.7, 0, 7.4, m(0.36), m(0.36), 0.45], [27.4, 0, 9.9, m(0.22), m(0.22), 0.4], [27.9, 0, -1.6, m(0.2), m(0.2), 0.35]] };
}

// The long block's face above the kitchen, which the camera cranes up on its way from the kitchen to the bedroom
// (flight p 0.69-0.82; 2026-10-26 review: "주방에서 침실로 올라가는 구간에서 … 조명이 화면에 보이도록"). By day it was a blank
// stone face. Now it reads as the double-height wall of a lived-in house:
//   - its tall slit windows (world.js lights their backs warm, like the doorway on the same block) are glazed in
//     dark bronze, with a small opal globe pendant glowing inside each: a stair hall with its lamps on behind them;
//   - a planting bed on the parapet above (the ledge's front edge, in front of the bench and the olive tree) spills
//     trailing pothos down the face, between and over the windows.
// slits: [{ a0, a1, v0, v1 }] as world.js cuts them (front at z = zf, `depth` deep); `from`: the kitchen wall's top (the
// windows are hidden below it); top: the block's top. world.js puts this in the long block's own piece (it rises with
// the block) and registers `glows`. 1 m = 3.33 units, like the bedroom.
export function faceDressing(M, { slits, zf = -3.33, depth = 2.2, from = 17.92, top = 34.33, bed = [35.6, 47.2], mobile = false }) {
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  const glow = [];
  const glows = [{ mat: M.opal, base: M.opal.emissiveIntensity, emissive: true }];
  const halo = warmGlow(0.55, { sprite: true });
  glows.push({ mat: halo, base: 0.55 });
  const bw = m(0.032); // the bars: 3 cm steel
  for (const o of slits) {
    const w = o.a1 - o.a0, r = w / 2, cx = (o.a0 + o.a1) / 2;
    const zg = zf - m(0.16); // the glass, 16 cm into the reveal
    // stiles against the jambs, transoms every ~1 m down from the spring of the arch, the arched head
    for (const x of [o.a0 + bw / 2, o.a1 - bw / 2]) solid.add(blk(M.bronze, [x - bw / 2, x + bw / 2], [from, o.v1], [zg - bw / 2, zg + bw / 2], 0));
    for (let y = o.v1; y > from + 0.6; y -= m(1.05)) solid.add(blk(M.bronze, [o.a0, o.a1], [y - bw / 2, y + bw / 2], [zg - bw / 2, zg + bw / 2], 0));
    const arc = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      arc.push(new THREE.Vector3(cx + Math.cos(a) * (r - bw / 2), o.v1 + Math.sin(a) * (r - bw / 2), zg));
    }
    const head = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 24, bw / 2, 5, false), M.bronze);
    head.castShadow = true;
    solid.add(head);
    const pane = new THREE.Shape();
    pane.moveTo(-r, 0);
    pane.lineTo(r, 0);
    pane.lineTo(r, o.v1 - from);
    pane.absarc(0, o.v1 - from, r, 0, Math.PI, false);
    pane.lineTo(-r, 0);
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(pane, 16), M.glazing);
    glass.position.set(cx, from, zg - 0.01);
    solid.add(glass);
    // the pendant behind the glass: an opal globe on a cord from the head of the arch
    const zp = zf - depth * 0.6, gr = m(0.12), gy = o.v1 - m(0.55);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, o.v1 + r * 0.9 - gy - gr, 5), M.black);
    cord.position.set(cx, (o.v1 + r * 0.9 + gy + gr) / 2, zp);
    solid.add(cord);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(m(0.025), m(0.035), m(0.05), 12), M.brass);
    cap.position.set(cx, gy + gr + m(0.015), zp);
    solid.add(cap);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(gr, 20, 14), M.opal);
    globe.position.set(cx, gy, zp);
    globe.castShadow = false;
    solid.add(globe);
    const h = new THREE.Sprite(halo);
    h.position.set(cx, gy, zp + 0.2);
    h.scale.setScalar(m(0.62));
    glow.push(h);
  }

  // the planting bed: a low plaster trough flush with the face, its soil, a mound of pothos, vines down the face
  const [x0, x1] = bed;
  const bh = m(0.18), bd = m(0.3);
  solid.add(blk(M.blockSand, [x0, x1], [top, top + bh], [zf - bd, zf], 0.04));
  solid.add(blk(M.soil, [x0 + 0.12, x1 - 0.12], [top + bh - 0.05, top + bh + 0.01], [zf - bd + 0.12, zf - 0.12], 0));
  const r = rng(4242);
  const C = M.leafCol;
  const jit = (c, k = 0.07) => c.clone().offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.12, (r() - 0.5) * k);
  const vc = new VC();
  const segs = mobile ? 3 : 4;
  const leaf = (len, cA, cB) => leafGeo({ len, wid: len * 0.8, shape: 'heart', fold: 0.12, droop: 0.15, segs, c0: jit(cA), c1: jit(cB) });
  const soilY = top + bh;
  const tone = () => (r() < 0.3 ? C.light : r() < 0.75 ? C.mid : C.deep);
  // the plants: a few clumps along the bed (as if planted one by one), each a mound of leaves turned up and out, some
  // draped over the lip, and a handful of vines over the edge and down the face. The long vines fall between the
  // windows; those over a window stop above its arch.
  const archTop = Math.max(...slits.map((o) => o.v1 + (o.a1 - o.a0) / 2));
  const overSlit = (x) => slits.some((o) => x > o.a0 - 0.45 && x < o.a1 + 0.45);
  const nClumps = Math.max(3, Math.round((x1 - x0) / m(0.62)));
  for (let c = 0; c < nClumps; c++) {
    const cx = x0 + (x1 - x0) * ((c + 0.5 + (r() - 0.5) * 0.5) / nClumps);
    const zc = zf - bd * (0.45 + (r() - 0.5) * 0.2);
    const nLeaves = mobile ? 22 : 34;
    for (let i = 0; i < nLeaves; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * m(0.24);
      const p = new THREE.Vector3(Math.min(x1 - 0.15, Math.max(x0 + 0.15, cx + Math.cos(a) * rr)), soilY + m(0.03 + (1 - rr / m(0.24)) * 0.14 * r()), Math.min(zf - 0.1, zc + Math.sin(a) * rr * 0.5));
      vc.add(leaf(0.08 + r() * 0.05, C.mid, tone()), leafAt(p, a + (r() - 0.5) * 0.8, 0.15 + r() * 0.8, (r() - 0.5) * 0.6, s), null);
    }
    // over the lip
    for (let i = 0; i < (mobile ? 4 : 7); i++) {
      const p = new THREE.Vector3(cx + (r() - 0.5) * m(0.45), soilY + m(0.02), zf + 0.05);
      vc.add(leaf(0.08 + r() * 0.04, C.mid, tone()), leafOn(p, new THREE.Vector3((r() - 0.5) * 1.2, -0.5 - r() * 0.6, 1), new THREE.Vector3(0, 1, 0.4), s), null);
    }
    const nV = (mobile ? 2 : 3) + (r() < 0.5 ? 1 : 0);
    for (let v = 0; v < nV; v++) {
      const x = cx + (r() - 0.5) * m(0.4);
      const long = v === 0;
      let L = m(long ? 1.3 + r() * 1.7 : 0.35 + r() * 1.0);
      if (overSlit(x)) L = Math.min(L, top - archTop - 0.8);
      const sway = (r() - 0.5) * m(0.3), amp = m(0.04 + r() * 0.06), ph = r() * 6.28, fq = 1.5 + r() * 2;
      const pts = [new THREE.Vector3(cx, soilY + 0.05, zc), new THREE.Vector3(x, soilY + 0.15, zf + 0.08)];
      for (let k = 1; k <= 6; k++) {
        const t = k / 6;
        pts.push(new THREE.Vector3(x + sway * t + amp * Math.sin(ph + fq * t * 3.14), top - L * t, zf + 0.12 + 0.1 * Math.sin(ph * 2 + t * 4)));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      vc.add(new THREE.TubeGeometry(curve, 18, 0.016, 4, false), new THREE.Matrix4(), () => C.stem);
      const len = curve.getLength();
      let d = m(0.04);
      let side = r() < 0.5 ? 1 : -1;
      while (d < len) {
        const t = d / len;
        const p = curve.getPointAt(t);
        side = -side;
        const hang = p.y < top - 0.1; // on the face: the leaf lies on it, facing out, splayed down to one side
        const dir = hang ? new THREE.Vector3(side * (0.55 + r() * 0.6), -0.85, 0.3 + r() * 0.25) : new THREE.Vector3(side * 0.7, 0.2, 1);
        const nrm = hang ? new THREE.Vector3(side * 0.25 + (r() - 0.5) * 0.4, 0.3 + r() * 0.2, 1) : new THREE.Vector3(0, 1, -0.2);
        const sz = (0.105 - 0.05 * t) * (0.8 + r() * 0.4);
        vc.add(leaf(sz, C.mid, tone()), leafOn(p, dir, nrm, s), null);
        d += m(0.055 + 0.05 * t + r() * 0.03);
      }
    }
  }
  solid.add(vc.mesh(M.foliage));
  return { solid, glow, glows };
}

// Two wall lights on the bedroom platform's front face, over the bench on the ledge (rooms.js ledgeDressing): what the
// crane sees of the bedroom's lamps before it clears the platform's edge. Small brass arms with linen shades (props.js
// sconce, glowing with the lamps), each throwing a soft warm wash on the plaster. world.js puts them in the bedroom's
// piece and registers `glows`.
export function landingLights(M, { y = 34.33, zf = -8, xs = [39.05, 43.35] } = {}) {
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  const glow = [];
  const wash = warmGlow(0.3);
  for (const x of xs) {
    solid.add(P.sconce(M, { x, y: y + m(0.92), z: zf, s }));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(m(0.46), m(0.8)), wash);
    plane.position.set(x, y + m(1.02), zf + 0.03);
    plane.renderOrder = 1;
    glow.push(plane);
  }
  return { solid, glow, glows: [{ mat: wash, base: 0.3 }] };
}

// ── 서재 (study, on the left ledge, top y = 21) and 욕실 (bath, in the raised wall's arch) ──────
// Seen from afar on the establishing shot: the same props, fewer of them. 1 m = 3.33 units.
export function studyRoom(M, { y = 21 }) {
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  solid.add(P.rug(M, { w: 1.9, d: 1.5, style: 'stripe', base: 0xe8e0d2, accent: 0x9db3a2, key: 'study', x: -13.0, y, z: 4.0, s }));
  solid.add(P.bookcase(M, { len: 1.35, h: 0.82, d: 0.36, shelves: 2, wood: M.oak, x: -12.75, y, z: -2.4, s }));
  if (hasFar(M, 'books_row', 'vase_wide')) {
    solid.add(G(M, 'books_row', { x: -12.75 - m(0.45), y: y + m(0.025), z: -2.4, s }));
    solid.add(G(M, 'books_row', { x: -12.75 - m(0.15), y: y + m(0.025), z: -2.4, rot: 0.06, s }));
    solid.add(G(M, 'books_row', { x: -12.75 + m(0.05), y: y + m(0.42), z: -2.4, s }));
    solid.add(G(M, 'vase_wide', { x: -12.75 + m(0.45), y: y + m(0.82), z: -2.4, s }));
  } else {
    solid.add(P.bookRow(M, { len: 0.6, hMin: 0.2, hMax: 0.28, d: 0.24, x: -12.75 - m(0.6), y: y + m(0.025), z: -2.4, seed: 3, s }));
    solid.add(P.bookRow(M, { len: 0.45, hMin: 0.2, hMax: 0.28, d: 0.24, x: -12.75 + m(0.1), y: y + m(0.42), z: -2.4, seed: 6, s }));
    solid.add(P.vase(M, { kind: 'urn', mat: M.ceramicSand, k: 0.9, x: -12.75 + m(0.45), y: y + m(0.82), z: -2.4, s }));
  }
  solid.add(P.desk(M, { len: 1.6, wid: 0.7, wood: M.oak, x: -13.0, y, z: 5.4, s }));
  solid.add(P.deskChair(M, { shell: M.walnut, x: -13.5, y, z: 3.4, rot: Math.PI, s }));
  solid.add(Gfar(M, 'books_stack', { x: -14.6, y: y + m(0.74), z: 5.5, rot: 0.2, s }) ?? P.bookStack(M, { n: 2, x: -14.6, y: y + m(0.74), z: 5.5, seed: 7, s }));
  solid.add(P.plant(M, { kind: 'snake', potKind: 'cylinder', potR: 0.13, potH: 0.24, potMat: M.stoneware, h: 0.7, x: -16.6, y, z: -1.6, seed: 2, s }));
  return {
    solid,
    contacts: [[-13.0, y, 5.0, m(0.95), m(0.5), 0.4], [-12.75, y, -2.3, m(0.75), m(0.25), 0.4], [-13.5, y + 0.02, 3.4, m(0.3), m(0.3), 0.35]],
    label: new THREE.Vector3(-13.0, y + m(0.9), 5.9),
  };
}
export function bathRoom(M, { y = 21 }) {
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  solid.add(planarBox(M.tileSage, [-28.4, -19.8], [y, y + m(1.1)], [-2.83, -2.78], 0.8 * s));
  // the tub (1.5 m) leaves 0.3 m between its end and the arch's right jamb (x -19.8) for a small syngonium on the floor:
  // the whole plant, leaves included, stays inside the arch and off the jamb (2026-10-26 review: at 0.8 it cut 0.1 m
  // into the jamb); its leaves may lean over the tub's rim. On phones (no far-away models) an upright snake plant, whose
  // leaves do not spread out to the jamb the way a fern's fronds do
  solid.add(P.bathtub(M, { len: 1.5, wid: 0.74, h: 0.56, x: -23.3, y, z: -1.45, s }));
  solid.add(P.vanity(M, { len: 0.62, d: 0.45, h: 0.84, front: M.oak, top: M.travertine, x: -27.0, y, z: -2.78 + m(0.225), s }));
  solid.add(P.mirror(M, { r: 0.24, x: -27.0, y: y + m(1.45), z: -2.78, s }));
  solid.add(Gfar(M, 'plant_syngonium', { x: -20.45, y, z: -0.62, rot: 0.9, s, k: 0.55 }) ?? P.plant(M, { kind: 'snake', potKind: 'round', potR: 0.08, potH: 0.16, potMat: M.ceramic, h: 0.42, x: -20.45, y, z: -0.62, seed: 3, s }));
  return { solid, contacts: [[-23.3, y, -1.45, m(0.85), m(0.45), 0.45], [-20.45, y, -0.62, m(0.14), m(0.14), 0.35]], label: new THREE.Vector3(-23.3, y + m(0.55), -1.0) };
}
