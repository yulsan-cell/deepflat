// Real furniture for the sample-home stills (homes.js), 2026-10-26: the rooms of the seven example homes furnished like
// the 3D hero's rooms (../3d/rooms.js): the CC0 model library (../3d/models.js, M.lib) where a model fits the role (sofa,
// lounge chair, armchair, coffee table, side table, table lamp, sideboard, dining table and chairs, bar stools, bed,
// plants, vases, bowls, books), the drawn props of ../3d/props.js for everything else (kitchen runs, islands, tall units,
// rugs, prints, curtains, beds and sofas in a home's own fabric, drawn plants). Each home picks its pieces and finishes
// in a style (M.st, homes.js STYLE), so the seven homes read as seven different interiors.
//
// Every builder keeps the signature of the toy builder it replaces (../3d/kit.js and ./lib.js: position in home units,
// 1 unit = 40 cm, floor centre, front toward +Z, rot about y), so homes.js lays the rooms out as before; the pieces now
// come in their true sizes (S units per metre).
import { THREE, blk as kblk, rbox, cyl, blob } from '../3d/kit.js';
import { PROPS as P, planarBox, PLANK_TILE, WOOD_TILE, pillow, softBox, box, place, tubChair } from '../3d/props.js';
import { cloneMaterial } from '../3d/models.js';

export const S = 2.5; // home units per metre
const um = (u) => u / S; // home units -> metres
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const G = (M, name, at) => M.lib?.place(name, at) ?? null;
const has = (M, ...names) => names.every((n) => M.lib?.has(n));
const topOf = (M, name) => M.lib.dims(name).h;
const group = (...kids) => {
  const g = new THREE.Group();
  for (const k of kids) if (k) g.add(k);
  return g;
};

// ── materials ────────────────────────────────────────────────────────────────
// a library material with its colour multiplied by `tint` ([r, g, b] factors on the screen value, as models.js TUNE),
// cached per home; the clone keeps the library's texel-to-albedo shader (cloneMaterial)
const tintColor = (t) => new THREE.Color(...t.map((f) => Math.pow(f, 2.2)));
export function restyle(M, g, swaps) {
  if (!g || !swaps) return g;
  M._rc ??= new Map();
  g.traverse((o) => {
    if (!o.isMesh) return;
    const s = swaps[o.material.name];
    if (!s) return;
    if (s.isMaterial) {
      o.material = s;
      return;
    }
    const key = o.material.uuid + ':' + s.join(',');
    if (!M._rc.has(key)) {
      const c = cloneMaterial(o.material);
      c.name = o.material.name;
      c.color.multiply(tintColor(s));
      M._rc.set(key, c);
    }
    o.material = M._rc.get(key);
  });
  return g;
}
// a textured props.js material (wood grain, planks, stone) in another tone: the texel is the colour it reads, so the
// colour multiplies what is seen ([r, g, b] factors)
export function toned(mat, f) {
  const c = cloneMaterial(mat);
  c.color.multiply(tintColor(f));
  c.userData = { ...mat.userData };
  return c;
}
// world units per repeat of a textured material (planks 1.52 m, wood grain 0.6 m, stone 1.2 m); set by homes.js
const tileOf = (mat) => (mat.userData.tileM ?? WOOD_TILE) * S;

// a box from ranges: textured materials get world-aligned uv (planarBox), plain ones the rounded clay box
export function jblk(mat, xr, yr, zr, r = 0.03) {
  return mat.map ? planarBox(mat, xr, yr, zr, tileOf(mat)) : kblk(mat, xr, yr, zr, r);
}

// ── seating ──────────────────────────────────────────────────────────────────
// sofa: the library's sage linen sofa (in the home's fabric tint, stretched a little to the room's length) or the drawn
// sofa in the home's fabric. len * s: its length in units (arms included)
export function sofa(M, { x, y, z, rot = 0, len = 4.2, s = 1, kind }) {
  const st = { ...(M.st.sofa ?? {}), ...(kind ?? {}) };
  const Lm = clamp((len * s) / S, 1.7, 3.0);
  const at = { x, y, z, rot, s: S };
  if (st.glb && has(M, 'sofa')) {
    const k = clamp(Lm / 2.2, 0.82, 1.22);
    const body = restyle(M, G(M, 'sofa', {}), st.tint ? { sofa_linen_sage: st.tint } : null);
    body.scale.x = k;
    const g = group(body);
    const pl = st.pillows ?? [M.linen, M.rust, M.oat];
    const spots = [[-0.62, 0.12, 0.25], [-0.24, -0.08, -0.15], [0.6, -0.1, 0.2]];
    pl.forEach((mat, i) => {
      if (!mat) return;
      const [px, yaw, roll] = spots[i];
      g.add(pillow(mat, 0.46, 0.46, 0.15, { x: px * k, y: 0.685, z: -0.03, tilt: -0.28, yaw, roll }));
    });
    return place(g, at);
  }
  return P.sofa(M, { len: Lm, depth: 0.95, fabric: st.fabric ?? M.linen, pillows: st.pillows, legs: st.legs, throwOn: st.throwOn ?? false, ...at });
}

// a lounge chair: kind 'lounge' (the library's walnut and cognac leather lounge chair), 'arm' (its oak and tan leather
// armchair), 'tub' (a drawn bouclé tub chair), 'soft' (a drawn upholstered armchair), 'frame' (a drawn oak frame chair)
export function loungeChair(M, { x, y, z, rot = 0, kind }) {
  const k = kind ?? M.st.chair ?? 'lounge';
  const at = { x, y, z, rot, s: S };
  const fab = M.st.chairFabric ?? M.boucle;
  if (k === 'lounge' && has(M, 'lounge_chair')) return G(M, 'lounge_chair', { ...at, k: 0.9 });
  if (k === 'arm' && has(M, 'armchair')) return G(M, 'armchair', at);
  if (k === 'tub') return tubChair(M, { fabric: fab, ...at });
  if (k === 'frame') return P.loungeChair(M, { fabric: fab, wood: M.st.chairWood, ...at });
  return P.armchair(M, { fabric: fab, ...at });
}

export function ottoman(M, { x, y, z, rot = 0, s = 1, fabric }) {
  const w = clamp((2.0 * s) / S, 0.6, 1.2), d = clamp((1.0 * s) / S, 0.45, 0.7);
  return place(group(softBox(fabric ?? M.st.ottomanFabric ?? M.oat, w, 0.4, d, 0, 0, 0, 0.1, 0.03)), { x, y, z, rot, s: S });
}

export function diningChair(M, { x, y, z, rot = 0 }) {
  const at = { x, y, z, rot, s: S };
  const st = M.st.dining ?? {};
  if (st.glbChairs !== false && has(M, 'dining_chair')) return restyle(M, G(M, 'dining_chair', at), st.chairSwaps);
  return P.diningChair(M, { wood: st.wood ?? M.oak, seat: st.seat ?? M.oat, ...at });
}

export function stool(M, { x, y, z }) {
  const at = { x, y, z, rot: 0.3 * Math.sin(x * 3.1), s: S };
  if (M.st.stool !== 'drawn' && has(M, 'bar_stool')) return restyle(M, G(M, 'bar_stool', { ...at, maxH: 0.66 }), M.st.stoolSwaps);
  return P.barStool(M, { seat: M.st.stoolSeat ?? M.leather, wood: M.st.stoolWood, ...at });
}

export function bench(M, { x, y, z, w = 3.2, d = 1.1, rot = 0, mat, fabric }) {
  const wood = mat?.map ? mat : M.st.benchWood ?? M.oak;
  return P.bench(M, { len: clamp(um(w), 0.5, 2.6), d: clamp(um(d), 0.34, 0.6), h: 0.45, wood, fabric: fabric ?? (mat?.map ? wood : M.st.benchFabric ?? M.boucle), x, y, z, rot, s: S });
}

// ── tables ───────────────────────────────────────────────────────────────────
// a still life on a table top at `top` (metres), in the table's own frame (metres). kind: 'flowers' | 'books' | 'vase'
// | 'plant' | 'bowl'
export function stillLife(M, g, top, kind = 'flowers', o = {}) {
  const sp = o.spread ?? 1;
  const books = () => G(M, 'books_stack', { x: -0.08 * sp, y: top, z: 0.16 * sp, rot: 0.3 }) ?? P.bookStack(M, { n: 2, x: -0.08 * sp, y: top, z: 0.16 * sp, rot: 0.3, seed: 8 });
  const woodBowl = (bx, bz) => G(M, 'bowl_wood', { x: bx, y: top, z: bz, rot: 0.4, k: 1.7 }) ?? P.bowl(M, { r: 0.12, mat: M.stoneware, x: bx, y: top, z: bz });
  if (kind === 'flowers') {
    g.add(P.flowers(M, { kind: o.flower ?? 'ranunculus', vaseKind: 'pitcher', vaseMat: o.vaseMat ?? M.ceramicSage, k: 1, colors: o.colors ?? ['blush', 'white', 'peach', 'coral'], n: 9, h: 0.24, x: -0.2 * sp, y: top, z: -0.06 }));
    g.add(woodBowl(0.22 * sp, 0.04));
    g.add(books());
  } else if (kind === 'plant') {
    g.add(G(M, 'plant_flower', { x: -0.16 * sp, y: top, z: -0.06, rot: 0.6, k: 0.6 }) ?? P.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.08, potH: 0.12, h: 0.3, x: -0.16 * sp, y: top, z: -0.06, seed: 3 }));
    g.add(woodBowl(0.2 * sp, 0.06));
    g.add(books());
  } else if (kind === 'vase') {
    g.add(G(M, 'vase_bulb', { x: -0.18 * sp, y: top, z: -0.04, k: 0.75 }) ?? P.vase(M, { kind: 'amphora', mat: M.ceramicSand, k: 0.8, x: -0.18 * sp, y: top, z: -0.04 }));
    g.add(books());
    g.add(P.bowl(M, { r: 0.1, mat: M.stoneware, x: 0.2 * sp, y: top, z: 0.02 }));
  } else if (kind === 'books') {
    g.add(books());
    g.add(P.candle(M, { x: 0.18 * sp, y: top, z: -0.08 }));
    g.add(woodBowl(-0.22 * sp, -0.05));
  } else if (kind === 'bowl') {
    g.add(woodBowl(0, 0));
  }
  return g;
}

// coffee table: 'marble' (the library's round marble table), 'stone' (a drawn travertine pedestal), 'oval' (a drawn oak
// oval with a shelf). w * s by d * s units: the space the layout keeps for it
export function coffeeTable(M, { x, y, z, rot = 0, s = 1, w = 3.2, d = 2.2, kind, decor }) {
  const k0 = kind ?? M.st.coffee ?? 'oval';
  const wm = um(w * s), dm = um(d * s);
  const g = new THREE.Group();
  let top;
  if (k0 === 'marble' && has(M, 'coffee_table')) {
    const k = clamp(Math.min(wm, dm * 1.35) / 1.3, 0.68, 0.88);
    g.add(G(M, 'coffee_table', { k }));
    top = topOf(M, 'coffee_table') * k;
  } else if (k0 === 'stone') {
    top = 0.38;
    g.add(P.pedestalTable(M, { r: clamp(Math.min(wm, dm) * 0.55, 0.35, 0.55), h: top, mat: M.st.coffeeMat ?? M.travertine }));
  } else {
    top = 0.4;
    g.add(P.coffeeTable(M, { len: clamp(wm, 0.9, 1.4), wid: clamp(dm, 0.5, 0.75), h: top, wood: M.st.coffeeWood ?? M.oak }));
  }
  stillLife(M, g, top, decor ?? M.st.coffeeDecor ?? 'flowers', { spread: k0 === 'oval' ? 1.1 : 1, colors: M.st.flowers });
  // the old toy table stood 0.08 up for the old rug; the woven rug is 0.03 thick
  return place(g, { x, y: y - 0.05, z, rot, s: S });
}

// a low round table on one foot (homes.js roundLowTable): stone, or the library's marble table
export function roundTable(M, { x, y, z, r = 1.0, decor }) {
  const g = new THREE.Group();
  let top = 0.38;
  if (M.st.roundTable === 'marble' && has(M, 'coffee_table')) {
    const k = clamp(um(2 * r) / 1.3, 0.6, 0.85);
    g.add(G(M, 'coffee_table', { k }));
    top = topOf(M, 'coffee_table') * k;
  } else g.add(P.pedestalTable(M, { r: clamp(um(r), 0.3, 0.55), h: top, mat: M.st.coffeeMat ?? M.travertine }));
  stillLife(M, g, top, decor ?? 'plant', { spread: 0.8 });
  return place(g, { x, y, z, s: S });
}

export function sideTable(M, { x, y, z, decor = 'lamp' }) {
  const g = new THREE.Group();
  let top;
  if (has(M, 'side_table') && M.st.sideTable !== 'drawn') {
    g.add(G(M, 'side_table', {}));
    top = topOf(M, 'side_table');
    g.add(G(M, 'books_stack', { y: 0.353, rot: 0.15, k: 0.8 }) ?? new THREE.Group());
  } else {
    top = 0.55;
    g.add(P.sideTable(M, { r: 0.22, h: top, wood: M.st.sideWood }));
  }
  if (decor === 'lamp') g.add(lamp(M, { y: top }));
  else g.add(G(M, 'vase_wide', { y: top }) ?? P.vase(M, { kind: 'jar', mat: M.ceramicSage, k: 0.9, y: top }));
  return place(g, { x, y, z, s: S });
}

// a table lamp in metres (inside a piece's frame)
function lamp(M, { x = 0, y = 0, z = 0, k = 0.85 }) {
  if (has(M, 'table_lamp') && M.st.lamp !== 'drawn') return G(M, 'table_lamp', { x, y, z, k });
  return P.tableLamp(M, { base: M.st.lampBase ?? M.ceramic, h: 0.48 * k, x, y, z });
}

// a lamp standing on a desk or a table (kit.js mushroomLamp: y is the top it stands on, in units)
export function deskLamp(M, { x, y, z }) {
  return place(lamp(M, { k: 0.72 }), { x, y, z, s: S });
}

export function floorLamp(M, { x, y, z }) {
  return P.floorLamp(M, { h: 1.55, shadeR: 0.21, x, y, z, s: S });
}

// a bowl on a surface (r: its radius in units)
export function bowl(M, { x, y, z, r = 0.4 }) {
  const k = clamp((2 * um(r)) / 0.131, 1.2, 2.2);
  return G(M, 'bowl_wood', { x, y, z, rot: x * 0.7, s: S, k }) ?? P.bowl(M, { r: clamp(um(r), 0.08, 0.16), mat: M.stoneware, x, y, z, s: S });
}

// ── storage ──────────────────────────────────────────────────────────────────
// a run of tall joinery (wardrobe, pantry, shoe cabinet): full-height doors in the home's joinery
export function tallCabinet(M, { x, y, z, w = 4, h = 5.6, d = 1.5, rot = 0, mat }) {
  const wm = um(w), hm = um(h), dm = clamp(um(d), 0.35, 0.65);
  const n = Math.max(1, Math.round(wm / 0.6));
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) g.add(P.tallUnit(M, { len: wm / n, d: dm, h: hm, front: mat ?? M.cab, doors: 1, x: -wm / 2 + (wm / n) * (i + 0.5) }));
  return place(g, { x, y, z, rot, s: S });
}

// a low console or sideboard with its still life: the library's walnut sideboard (M.st.console 'glb') or a drawn one
export function consoleLow(M, { x, y, z, w = 5.5, rot = 0, mat, decor = true }) {
  const wm = um(w);
  const g = new THREE.Group();
  let top, len;
  if (M.st.console === 'glb' && has(M, 'sideboard') && wm >= 1.7) {
    const k = clamp(wm / 2.44, 0.72, 1.0);
    const sb = G(M, 'sideboard', {});
    sb.scale.x = k;
    g.add(sb);
    top = topOf(M, 'sideboard');
    len = 2.44 * k;
  } else {
    len = clamp(wm, 0.9, 2.4);
    g.add(P.sideboard(M, { len, d: 0.45, h: 0.62, wood: mat?.map ? mat : M.st.consoleWood ?? M.walnut }));
    top = 0.62;
  }
  if (decor) {
    const a = -len / 2 + 0.22, b = len / 2 - 0.22;
    g.add(G(M, 'vase_bulb', { x: a, y: top, z: 0.02, k: 0.85 }) ?? P.vase(M, { kind: 'amphora', mat: M.ceramicSand, x: a, y: top, z: 0.02 }));
    g.add(G(M, 'vase_bottle', { x: a + 0.25, y: top, z: 0.05, k: 0.75, rot: 0.8 }) ?? new THREE.Group());
    g.add(G(M, 'books_stack', { x: (a + b) / 2 + 0.1, y: top, z: 0, rot: 0.12 }) ?? P.bookStack(M, { n: 3, x: (a + b) / 2 + 0.1, y: top, z: 0, seed: 5 }));
    if (len > 1.3) g.add(G(M, 'plant_aloe', { x: b, y: top, z: 0.02, rot: 0.5, k: 1.25 }) ?? P.plant(M, { kind: 'pothos', potKind: 'cylinder', potR: 0.07, potH: 0.12, h: 0.32, x: b, y: top, z: 0.02, seed: 2 }));
  }
  return place(g, { x, y, z, rot, s: S });
}

// an open bookcase filled with books, a vase, a plant, a bowl (w, h, d in units)
export function bookshelf(M, { x, y, z, w = 4.4, h = 2.3, d = 1.3, rot = 0 }) {
  const wm = um(w), hm = um(h), dm = clamp(um(d), 0.28, 0.4);
  const shelves = Math.max(2, Math.round(hm / 0.38));
  const bc = P.bookcase(M, { len: wm, h: hm, d: dm, shelves, wood: M.st.shelfWood ?? M.cab });
  const g = group(bc);
  const rows = bc.userData.rows;
  const zb = -dm / 2 + 0.02;
  rows.forEach((ry, i) => {
    const free = wm - 0.1;
    const bl = Math.min(free * (0.45 + ((i * 37) % 4) * 0.1), free - 0.3);
    const x0 = i % 2 ? -wm / 2 + 0.06 : wm / 2 - 0.06 - bl;
    if (bl > 0.15) g.add(P.bookRow(M, { len: bl, hMin: 0.18, hMax: Math.min(0.3, (hm / shelves) * 0.85), d: Math.min(0.22, dm - 0.06), x: x0, y: ry, z: zb + 0.11, seed: 10 + i + Math.round(x * 3) }));
    const ox = i % 2 ? wm / 2 - 0.2 : -wm / 2 + 0.2;
    const pick = (i + Math.round(x)) % 4;
    if (pick === 0) g.add(G(M, 'vase_wide', { x: ox, y: ry, z: 0, k: 0.8 }) ?? P.vase(M, { kind: 'jar', mat: M.ceramicSage, x: ox, y: ry, z: 0 }));
    else if (pick === 1) g.add(G(M, 'plant_aloe', { x: ox, y: ry, z: 0, k: 1.1 }) ?? P.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.07, potH: 0.11, h: 0.3, x: ox, y: ry, z: 0, seed: i }));
    else if (pick === 2) g.add(G(M, 'books_stack', { x: ox, y: ry, z: 0, rot: 0.2, k: 0.7 }) ?? P.bookStack(M, { n: 2, x: ox, y: ry, z: 0, seed: i }));
    else g.add(G(M, 'vase_bottle', { x: ox, y: ry, z: 0, k: 0.7 }) ?? P.bowl(M, { r: 0.09, mat: M.stoneware, x: ox, y: ry, z: 0 }));
  });
  return place(g, { x, y, z, rot, s: S });
}

// ── kitchen ──────────────────────────────────────────────────────────────────
// a run of base cabinets with a worktop, sink and hob (homes.js counterRun): w, d, h in units; hob: true puts the hob
// on a run too short for it by default (under 2.2 m; it still fits from about 1.6 m)
export function counterRun(M, { x, y, z, w, d = 1.6, rot = 0, body, top, sink = true, dress = true, hob = null }) {
  const wm = um(w);
  const g = new THREE.Group();
  g.add(P.kitchenRun(M, { len: wm, d: clamp(um(d), 0.55, 0.65), h: 0.9, front: body ?? M.cab, top: top ?? M.stone, sinkAt: sink ? wm * 0.18 : null, hobAt: sink && (hob ?? wm > 2.2) ? -wm * 0.22 : null }));
  if (dress && wm > 1.4) {
    const e = wm / 2 - 0.25;
    g.add(P.board(M, { w: 0.3, h: 0.42, x: -e + 0.15, y: 0.9, z: -0.27 }));
    g.add(G(M, 'plant_aloe', { x: e, y: 0.9, z: -0.08, rot: 0.3 }) ?? P.plant(M, { kind: 'herb', potKind: 'terracotta', potR: 0.07, potH: 0.11, h: 0.16, x: e, y: 0.9, z: -0.08, seed: 5 }));
    if (wm > 2.6) g.add(P.bottles(M, { x: e - 0.35, y: 0.9, z: -0.15 }));
  }
  return place(g, { x, y, z, rot, s: S });
}

export function island(M, { x, y, z, w = 5, d = 2, rot = 0, top, dress = true }) {
  const wm = um(w), dm = clamp(um(d), 0.75, 1.0);
  const g = group(P.island(M, { len: wm, d: dm, h: 0.9, front: M.st.islandFront ?? M.cab, top: top ?? M.st.islandTop ?? M.stone }));
  if (dress) {
    g.add(P.fruitBowl(M, { x: -wm * 0.22, y: 0.9, z: -0.05 }));
    g.add(P.flowers(M, { kind: 'branch', vaseKind: 'tall', vaseMat: M.ceramic, colors: ['white', 'blush'], n: 5, h: 0.4, x: wm * 0.25, y: 0.9, z: -0.08 }));
  }
  return place(g, { x, y, z, rot, s: S });
}

// wall cabinets over a run (homes.js uppers): a box in the joinery with door seams
export function uppers(M, { x0, x1, y0 = 4.0, y1 = 5.3, d = 0.85, mat }) {
  const g = new THREE.Group();
  const m = mat ?? M.cab;
  g.add(jblk(m, [x0, x1], [y0, y1], [0, d], 0.02));
  const n = Math.max(2, Math.round((x1 - x0) / 1.4));
  for (let i = 1; i < n; i++) {
    const sx = x0 + ((x1 - x0) * i) / n;
    g.add(kblk(M.seam, [sx - 0.012, sx + 0.012], [y0 + 0.03, y1 - 0.03], [d, d + 0.012], 0));
  }
  return g;
}

// a pendant over a table or an island: a ceramic dome on a cord up to the height of the room's walls (top), where a
// small brass canopy stands for the ceiling the cutaway leaves out
export function pendant(M, { x, y, z, top = 6.4, r = 0.55 }) {
  const rm = clamp(um(r), 0.16, 0.26);
  const cord = Math.max(0, um(top - y) - rm * 0.7 - 0.04);
  const g = P.pendantLamp(M, { r: rm, cord, mat: M.st.pendantMat ?? M.ceramic });
  g.add(cylinderCap(M, rm * 0.7 + 0.04 + cord));
  return place(g, { x, y, z, s: S });
}
function cylinderCap(M, y) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 20), M.brass);
  m.position.y = y;
  m.castShadow = true;
  return m;
}

// ── beds ─────────────────────────────────────────────────────────────────────
// a bed, head toward -Z (w by l units): the library's bed (M.st.bed.glb, in the home's linens) for a double, else drawn
export function bed(M, { x, y, z, w = 6, l = 7.6, rot = 0, small = false }) {
  const st = M.st.bed ?? {};
  const wm = um(w), lm = um(l);
  small = small || wm < 1.4; // a single bed (a child's room) is always drawn, in its own linens
  if (!small && st.glb && has(M, 'bed')) {
    const dm = M.lib.dims('bed');
    const k = clamp(wm / dm.w, 0.85, 1.05);
    const inner = restyle(M, G(M, 'bed', { z: -((dm.min.z + dm.max.z) / 2) * k, k }), st.swaps);
    return place(group(inner), { x, y, z, rot, s: S });
  }
  const pick = small ? st.small ?? {} : st;
  return P.bed(M, { w: clamp(wm, 0.9, 1.9), l: clamp(lm, 1.95, 2.15), wood: pick.wood ?? M.oak, head: pick.head ?? M.sage, accent: pick.accent ?? M.rust, throwMat: pick.throwMat ?? M.oat, x, y, z, rot, s: S });
}

export function nightstand(M, { x, y, z, rot = 0 }) {
  const g = group(P.nightstand(M, { wood: M.st.nightWood ?? M.walnut }));
  g.add(lamp(M, { y: 0.52, z: -0.03, k: 0.78 }));
  return place(g, { x, y, z, rot, s: S });
}

// ── study ────────────────────────────────────────────────────────────────────
export function desk(M, { x, y, z, w = 5.4, d = 2.2, rot = 0, dress = true }) {
  const wm = clamp(um(w), 0.9, 2.0), dm = clamp(um(d), 0.55, 0.8);
  const g = group(P.desk(M, { len: wm, wid: dm, h: 0.74, wood: M.st.deskWood ?? M.oak, frame: M.st.deskFrame }));
  if (dress) {
    g.add(box(M.ceramicDark, 0.34, 0.012, 0.24, -wm * 0.12, 0.74, 0.04)); // a laptop
    g.add(G(M, 'books_stack', { x: wm * 0.3, y: 0.74, z: -0.08, rot: 0.25, k: 0.75 }) ?? P.bookStack(M, { n: 2, w: 0.2, d: 0.15, x: wm * 0.3, y: 0.74, z: -0.08, seed: 7 }));
    g.add(P.cup(M, { mat: M.ceramicSage, x: wm * 0.12, y: 0.74, z: 0.12 }));
  }
  return place(g, { x, y, z, rot, s: S });
}

export function deskChair(M, { x, y, z, rot = 0 }) {
  if (M.st.deskChair === 'dining' && has(M, 'dining_chair')) return restyle(M, G(M, 'dining_chair', { x, y, z, rot, s: S }), M.st.dining?.chairSwaps);
  return P.deskChair(M, { shell: M.st.deskShell ?? M.walnut, wood: M.st.deskShellLegs ?? M.oak, x, y, z, rot, s: S });
}

// ── bath ─────────────────────────────────────────────────────────────────────
// kit.js tub: a stadium `half` from its centre to each end circle of radius r, long axis along X
export function tub(M, { x, y, z, half = 1.25, r = 1.0, rot = 0 }) {
  return P.bathtub(M, { len: clamp(um(2 * half + 2 * r), 1.4, 1.8), wid: clamp(um(2 * r), 0.7, 0.85), h: 0.56, x, y, z, rot, s: S });
}

// a wall-hung vanity with a stone top and a vessel basin, a round brass mirror over it (the wall behind, at -Z)
export function vanityLow(M, { x, y, z, w = 3, rot = 0, mirror = true }) {
  const wm = clamp(um(w), 0.7, 1.4);
  const g = group(P.vanity(M, { len: wm, d: 0.5, h: 0.86, front: M.st.vanityFront ?? M.cab, top: M.st.vanityTop ?? M.stone }));
  g.add(P.toiletries(M, { x: -wm / 2 + 0.16, y: 0.86, z: -0.12 }));
  if (mirror) g.add(P.mirror(M, { r: 0.34, x: 0, y: 1.58, z: -0.25 }));
  return place(g, { x, y, z: z - 0.06, rot, s: S });
}

// ── plants ───────────────────────────────────────────────────────────────────
// a potted plant (kit pottedTree: about 5.6 * s units tall). Each home has a list of kinds (M.st.plants), taken in turn
// round the house: 'tall' and 'syngonium' are library models, the rest drawn (props.js plant). pot = false: a tree in
// the ground (a garden)
export function pottedTree(M, { x, y, z, s = 1, pot = true, kind }) {
  const list = M.st.plants ?? ['tall', 'olive', 'syngonium', 'fiddle'];
  M._plant = (M._plant ?? -1) + 1;
  const k0 = kind ?? (pot ? list[M._plant % list.length] : 'olive');
  const h = clamp((5.6 * s) / S, 0.7, pot ? 2.3 : 3.6);
  const seed = 3 + M._plant;
  const at = { x, y, z, s: S, rot: seed * 1.3 };
  if (!pot) {
    const g = P.plant(M, { kind: k0, potKind: 'round', potR: 0.12, potH: 0.2, h, seed });
    g.position.y = -0.18; // its pot sunk into the gravel
    return place(group(g), at);
  }
  if (k0 === 'tall' && has(M, 'plant_tall')) return G(M, 'plant_tall', { ...at, k: clamp(h / 1.35, 0.7, 1.45) });
  if (k0 === 'syngonium' && has(M, 'plant_syngonium')) return G(M, 'plant_syngonium', { ...at, k: clamp(h / 0.84, 0.7, 1.35) });
  const potKind = M.st.pot ?? 'terracotta';
  const big = h > 1.2;
  return P.plant(M, { kind: k0 === 'tall' || k0 === 'syngonium' ? 'fiddle' : k0, potKind, potR: big ? 0.22 : 0.16, potH: big ? 0.38 : 0.28, potMat: M.st.potMat, h: h - (big ? 0.38 : 0.28), seed, ...at });
}

// ── textiles and walls ───────────────────────────────────────────────────────
// a woven rug from ranges (units), in the style of the room kind being furnished (M.cur) or the home's default
export function rug(mat, x0, x1, z0, z1, y = 0, M) {
  const st = (M.st.rugs?.[M.cur] ?? M.st.rug) || { style: 'border', base: 0xebe3d6, accent: 0xc8a688 };
  return P.rug(M, { w: um(x1 - x0), d: um(z1 - z0), style: st.style, base: st.base, accent: st.accent, x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, s: S });
}

// a framed print on a wall: back = true on the back wall (z = 0, facing +Z), else on the left wall (x = 0, facing +X)
export function art(M, { x = 0, z = 0, y, w = 1.0, h = 0.75, kind = 'arch', frame = 'oak', back = true }) {
  return P.artFrame(M, { w, h, art: kind, frame, on: back ? 'left' : 'right', x, y, z, rot: back ? 0 : Math.PI / 2, s: S });
}

export { blob, rbox, cyl, um };
