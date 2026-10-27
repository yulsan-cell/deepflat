// Doors, openings and clearances of the sample homes (homes.js), 2026-10-27.
//   levelLinks(L)   a level's walls as runs on the 0.5 grid, its doors cut into them as gaps (a door to outside, the
//                   현관문, too), and every link between two rooms: 'door' (a gap in a wall), 'exit' (a gap to outside),
//                   'open' (no wall between the two rooms at all)
//   roomSides(r)    one room's doors and real walls, by side, in the room's own coordinates
//   roomCtx(...)    what a room's furniture layout gets as ctx: its doors (ctx.gaps), clearance zones 2 units deep in
//                   front of every door on both sides (ctx.zones), and the helpers that keep pieces out of them
//                   (ctx.fit, ctx.spans, ctx.hitsZone, ctx.take ...)
//   keepClear(g)    after a layout: the small loose pieces (plants, lamps, side tables, chairs, benches, consoles...)
//                   still standing in a door's zone slide out of it, or are left out when there is no room
//   planCheck(...)  the plan checker behind stills.html?...&check=1 (window.__planCheck, check-plans.mjs)
// Sides are named as the viewer sees the model: back = min z (far), front = max z (near), left = min x, right = max x.
// Along a wall, positions are measured from the room's back-left corner: x on the back and front walls, z on the left
// and right walls, in the room's own frame (0 = the room's left / back edge).
import { THREE } from './lib.js';

export const G = 0.5; // the plan grid
export const T = 0.45; // wall thickness in the cutaway
export const HC = 2.6; // cut height of the cutaway walls
export const LOW = 0.9; // walls toward the viewer are cut at sill height
export const DOOR_W = 2.1; // a door's default clear width (84 cm)
export const ZONE = 2.0; // the clearance kept in front of a door, on both sides (80 cm)
export const PASS = 2.0; // the narrowest way through that counts as a way (80 cm)
export const STOREY = 7.0; // floor to floor of a real home (2.8 m): the flights are drawn with real steps
const AM = 0.25; // a zone reaches this far past the door's jambs (pieces overhang their nominal size a little)
const EPS = 1e-6;
const OUTDOOR = new Set(['garden', 'terrace']);
export const isOutdoor = (kind) => OUTDOOR.has(kind);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const keyOf = (a, b) => [a ?? '~', b ?? '~'].sort().join('|');

// a door from a plan: [a, b, pos, width, opts] or { a, b, pos, width, side }; b null (or missing) = outside
export function parseDoor(d) {
  if (Array.isArray(d)) {
    const [a, b = null, pos = null, width = null, opts = {}] = d;
    return { ...opts, a, b: b ?? null, pos: pos ?? opts.pos ?? null, width: width ?? opts.width ?? DOOR_W };
  }
  return { ...d, b: d.b ?? null, pos: d.pos ?? null, width: d.width ?? DOOR_W };
}

// which side of room r a wall line is on (axis 'x': a wall along x at z = line; axis 'z': along z at x = line)
export function sideAt(r, axis, line) {
  if (axis === 'x') return Math.abs(line - r.z[0]) < 1e-6 ? 'back' : Math.abs(line - r.z[1]) < 1e-6 ? 'front' : null;
  return Math.abs(line - r.x[0]) < 1e-6 ? 'left' : Math.abs(line - r.x[1]) < 1e-6 ? 'right' : null;
}

// ── a level's walls, doors and links ──────────────────────────────────────────
export function levelLinks(L) {
  const nx = Math.round(L.W / G), nz = Math.round(L.D / G);
  const cell = new Array(nx * nz).fill(null);
  const byId = {}, kindOf = {};
  let overlap = 0;
  for (const r of L.rooms) {
    byId[r.id] = r;
    kindOf[r.id] = r.kind;
    for (let k = Math.round(r.z[0] / G); k < Math.round(r.z[1] / G); k++)
      for (let i = Math.round(r.x[0] / G); i < Math.round(r.x[1] / G); i++) {
        if (i < 0 || k < 0 || i >= nx || k >= nz) continue;
        if (cell[k * nx + i] !== null) overlap++;
        cell[k * nx + i] = r.id;
      }
  }
  const empty = cell.filter((c) => c === null).length;
  const at = (i, k) => (i < 0 || k < 0 || i >= nx || k >= nz ? null : cell[k * nx + i]);
  // open / low pairs: [a, b] for their whole shared wall, or [a, b, [s, e]] (or [[s, e], ...]) for only that stretch of
  // it (level coordinates along the wall); the rest stays a full wall
  const spanMap = (list) => {
    const m = new Map();
    for (const [a, b, sp] of list ?? []) {
      const k = keyOf(a, b);
      const spans = sp == null ? null : Array.isArray(sp[0]) ? sp : [sp];
      m.set(k, spans === null || m.get(k) === null ? null : [...(m.get(k) ?? []), ...spans]);
    }
    return m;
  };
  const inSpans = (spans, mid) => spans === null || spans.some(([s, e]) => mid > Math.min(s, e) - 1e-6 && mid < Math.max(s, e) + 1e-6);
  const open = spanMap(L.open), low = spanMap(L.low);
  const outdoor = (id) => isOutdoor(kindOf[id]);
  const heightOf = (a, b, front, mid) => {
    const key = keyOf(a, b);
    if (open.has(key) && inSpans(open.get(key), mid)) return 0;
    if (low.has(key) && inSpans(low.get(key), mid)) return LOW;
    if (a === null || b === null) {
      const r = a ?? b;
      if (kindOf[r] === 'garden') return 0;
      if (kindOf[r] === 'terrace') return front ? 0.7 : 1.1;
      return front ? LOW : HC;
    }
    if (outdoor(a) && outdoor(b)) return 0;
    return HC;
  };
  const segs = [], zero = [];
  for (let i = 0; i <= nx; i++)
    for (let k = 0; k < nz; k++) {
      const a = at(i - 1, k), b = at(i, k);
      if (a === b) continue;
      const h = heightOf(a, b, b === null, (k + 0.5) * G);
      const sg = { axis: 'z', line: i * G, s: k * G, e: (k + 1) * G, key: keyOf(a, b), h, a, b };
      if (h > 0) segs.push(sg);
      else if (a !== null && b !== null) zero.push(sg);
    }
  for (let k = 0; k <= nz; k++)
    for (let i = 0; i < nx; i++) {
      const a = at(i, k - 1), b = at(i, k);
      if (a === b) continue;
      const h = heightOf(a, b, b === null, (i + 0.5) * G);
      const sg = { axis: 'x', line: k * G, s: i * G, e: (i + 1) * G, key: keyOf(a, b), h, a, b };
      if (h > 0) segs.push(sg);
      else if (a !== null && b !== null) zero.push(sg);
    }
  const merge = (list, same) => {
    list.sort((p, q) => (p.axis + p.line).localeCompare(q.axis + q.line) || p.line - q.line || p.s - q.s);
    const out = [];
    for (const sg of list) {
      const last = out[out.length - 1];
      if (last && last.axis === sg.axis && last.line === sg.line && last.key === sg.key && same(last, sg) && Math.abs(last.e - sg.s) < 1e-6) last.e = sg.e;
      else out.push({ ...sg, freeS: false, freeE: false });
    }
    return out;
  };
  const runs = merge(segs, (p, q) => p.h === q.h);
  const opens = merge(zero, () => true).map((o) => ({ kind: 'open', a: o.a, b: o.b, axis: o.axis, line: o.line, g0: o.s, g1: o.e, want: o.e - o.s, h: 0 }));

  // doors: a gap in the wall between the two rooms (or the room and outside). The run: on the side asked for (side),
  // the one holding pos (else the nearest to it), else the longest. The gap keeps half a wall's thickness from the run's
  // ends, so the walls meeting there leave it its full width.
  const problems = [];
  const gaps = [];
  for (const spec of L.doors ?? []) {
    const d = parseDoor(spec);
    const A = byId[d.a];
    const name = `${d.a}–${d.b ?? 'outside'}`;
    if (!A || (d.b !== null && !byId[d.b])) {
      problems.push(`door ${name}: no such room`);
      continue;
    }
    const key = keyOf(d.a, d.b);
    let cands = runs.filter((r) => r.key === key && r.e - r.s > 0.05);
    if (d.side) cands = cands.filter((r) => sideAt(A, r.axis, r.line) === d.side);
    if (!cands.length) {
      const anyOpen = opens.some((o) => keyOf(o.a, o.b) === key);
      problems.push(`door ${name}${d.side ? ` (${d.side})` : ''}: no wall between them${anyOpen ? ' (they are open to each other)' : ''}`);
      continue;
    }
    const dist = (r, p) => (p < r.s ? r.s - p : p > r.e ? p - r.e : 0);
    const r = d.pos != null
      ? cands.slice().sort((p, q) => dist(p, d.pos) - dist(q, d.pos) || q.e - q.s - (p.e - p.s))[0]
      : cands.slice().sort((p, q) => q.e - q.s - (p.e - p.s))[0];
    const w = d.width, len = r.e - r.s;
    let g0, g1;
    if (len >= w + T) {
      const c = clamp(d.pos ?? (r.s + r.e) / 2, r.s + w / 2 + T / 2, r.e - w / 2 - T / 2);
      [g0, g1] = [c - w / 2, c + w / 2];
    } else if (len >= w) {
      const c = (r.s + r.e) / 2;
      [g0, g1] = [c - w / 2, c + w / 2];
    } else [g0, g1] = [r.s, r.e];
    if (d.pos != null && (d.pos < g0 - 0.5 || d.pos > g1 + 0.5)) problems.push(`door ${name}: pos ${d.pos} is off its wall, the gap went to ${g0.toFixed(2)}..${g1.toFixed(2)}`);
    const tail = { ...r, s: g1, freeS: true };
    r.e = g0;
    r.freeE = true;
    runs.push(tail);
    gaps.push({ kind: d.b === null ? 'exit' : 'door', a: d.a, b: d.b, axis: r.axis, line: r.line, g0, g1, want: w, h: r.h, side: sideAt(A, r.axis, r.line), spec: d });
  }
  return { L, runs, gaps, opens, links: [...gaps, ...opens], byId, kindOf, cell, nx, nz, overlapCells: overlap, emptyCells: empty, problems };
}

// ── one room's doors and walls ──────────────────────────────────────────────
// gaps: [{ side, a0, a1, kind, to, link }], walls: { side: [[a0, a1], ...] } where a real wall stands (any height),
// in world-aligned room coordinates
export function roomSides(r, lk) {
  const gaps = [], walls = { back: [], front: [], left: [], right: [] };
  for (const l of lk.links) {
    if (l.a !== r.id && l.b !== r.id) continue;
    const side = sideAt(r, l.axis, l.line);
    if (!side) continue;
    const off = l.axis === 'x' ? r.x[0] : r.z[0];
    gaps.push({ side, a0: l.g0 - off, a1: l.g1 - off, kind: l.kind, to: l.a === r.id ? l.b : l.a, link: l });
  }
  for (const run of lk.runs) {
    if (run.e - run.s < 0.01 || !run.key.split('|').includes(r.id)) continue;
    const side = sideAt(r, run.axis, run.line);
    if (!side) continue;
    const off = run.axis === 'x' ? r.x[0] : r.z[0];
    walls[side].push([run.s - off, run.e - off]);
  }
  return { gaps, walls };
}

// the same in the frame the room is furnished in: turned for face 'left' (its back wall is the world's left wall), and
// for a close-up (w by d, maybe cropped from the room): its back and left walls are always there; a door on its right or
// front side is kept only when the close-up is the whole room
export function localSides(sides, r, { close = false, w, d } = {}) {
  const rw = r.x[1] - r.x[0], rd = r.z[1] - r.z[0];
  const left = r.o?.face === 'left';
  const map = (side, a0, a1) => {
    if (!left) return [side, a0, a1];
    return { left: ['back', rd - a1, rd - a0], front: ['left', a0, a1], right: ['front', rd - a1, rd - a0], back: ['right', a0, a1] }[side];
  };
  const Wl = left ? rd : rw, Dl = left ? rw : rd;
  const W = close ? w : Wl, D = close ? d : Dl;
  const whole = !close || (Math.abs(W - Wl) < 0.01 && Math.abs(D - Dl) < 0.01);
  const lenOf = (side) => (side === 'back' || side === 'front' ? W : D);
  const keep = (side) => side === 'back' || side === 'left' || whole;
  const gaps = [];
  for (const g of sides.gaps) {
    const [side, a0, a1] = map(g.side, g.a0, g.a1);
    if (!keep(side)) continue;
    const b0 = Math.max(0, a0), b1 = Math.min(lenOf(side), a1);
    if (b1 - b0 > (close ? 1.0 : 0.05)) gaps.push({ ...g, side, a0: b0, a1: b1 }); // a close-up keeps a door only if most of it is in its frame
  }
  const walls = { back: [], front: [], left: [], right: [] };
  for (const [s, list] of Object.entries(sides.walls))
    for (const [a0, a1] of list) {
      const [side, b0, b1] = map(s, a0, a1);
      walls[side].push([b0, b1]);
    }
  if (close) {
    walls.back = [[0, W]];
    walls.left = [[0, D]];
    if (!whole) walls.right = [[0, D]], (walls.front = [[0, W]]);
  }
  return { W, D, gaps, walls };
}

// ── a room's layout context ─────────────────────────────────────────────────
const overlap = (a, b, e = 0.02) => a.x0 < b.x1 - e && a.x1 > b.x0 + e && a.z0 < b.z1 - e && a.z1 > b.z0 + e;
const covered = (spans, a0, a1, tol = 0.35) => {
  let at = a0;
  for (const [s, e] of spans.slice().sort((p, q) => p[0] - q[0])) {
    if (s > at + tol) break;
    at = Math.max(at, e);
  }
  return at >= a1 - tol;
};
// free sub-intervals of [a, b] once `cuts` are taken out
export function subtract(a, b, cuts) {
  let free = [[a, b]];
  for (const [c0, c1] of cuts) {
    const next = [];
    for (const [s, e] of free) {
      if (c1 <= s || c0 >= e) next.push([s, e]);
      else {
        if (c0 > s) next.push([s, c0]);
        if (c1 < e) next.push([c1, e]);
      }
    }
    free = next;
  }
  return free.filter(([s, e]) => e - s > 1e-6);
}

export function roomCtx({ W, D, gaps = [], walls = null, close = false, H, kind, id }) {
  const ctx = { W, D, close, H, kind, id, gaps, walls, taken: [], kept: [], notes: [] };
  const lenOf = (side) => (side === 'back' || side === 'front' ? W : D);
  ctx.len = lenOf;
  // a rectangle hugging wall `side`: a0..a1 along it, d0..d1 out from it
  ctx.rect = (side, a0, a1, d0, d1) =>
    side === 'back' ? { x0: a0, x1: a1, z0: d0, z1: d1 }
      : side === 'front' ? { x0: a0, x1: a1, z0: D - d1, z1: D - d0 }
        : side === 'left' ? { x0: d0, x1: d1, z0: a0, z1: a1 }
          : { x0: W - d1, x1: W - d0, z0: a0, z1: a1 };
  // where a piece's centre goes, `d` out from wall `side` at `c` along it, and its turn so its front faces the room
  ctx.pose = (side, c, d) =>
    side === 'back' ? { x: c, z: d, rot: 0 }
      : side === 'front' ? { x: c, z: D - d, rot: Math.PI }
        : side === 'left' ? { x: d, z: c, rot: Math.PI / 2 }
          : { x: W - d, z: c, rot: -Math.PI / 2 };
  ctx.doors = (side) => gaps.filter((g) => g.kind !== 'open' && (!side || g.side === side));
  ctx.zones = gaps.filter((g) => g.kind !== 'open').map((g) => ({ ...ctx.rect(g.side, g.a0 - AM, g.a1 + AM, -1, ZONE), gap: g }));
  ctx.hitsZone = (r) => ctx.zones.some((z) => overlap(r, z));
  ctx.hitsTaken = (r) => ctx.taken.some((t) => overlap(r, t)) || ctx.kept.some((t) => overlap(r, t));
  ctx.inside = (r, m = 0) => r.x0 >= m - 0.01 && r.z0 >= m - 0.01 && r.x1 <= W - m + 0.01 && r.z1 <= D - m + 0.01;
  ctx.hasWall = (side, a0, a1) => !walls || covered(walls[side] ?? [], a0, a1);
  ctx.free = (r) => ctx.inside(r) && !ctx.hitsZone(r) && !ctx.hitsTaken(r);
  // mark a placed piece (a rect, or a spot from fit) as taken; its `use` rect (the room kept in front of it) too
  ctx.take = (s) => {
    if (!s) return s;
    if (s.body) {
      ctx.taken.push(s.body);
      if (s.use) ctx.kept.push(s.use);
    } else ctx.taken.push(s);
    return s;
  };
  // the stretches of wall `side` (lo..hi along it) where a band d0..d0+dep deep is clear of doors (and of taken
  // pieces, and, with needWall, where a real wall stands): [[a0, a1], ...] at least `min` long
  ctx.spans = ({ side, dep = 1.5, d0 = 0, lo = 0, hi, inset = 0.25, min = 0, needWall = false, taken = true }) => {
    const A = Math.max(lo, inset), B = Math.min(hi ?? lenOf(side), lenOf(side) - inset);
    if (B <= A) return [];
    const band = ctx.rect(side, A, B, d0, d0 + dep);
    const along = side === 'back' || side === 'front' ? (r) => [r.x0, r.x1] : (r) => [r.z0, r.z1];
    const cuts = [];
    for (const z of [...ctx.zones, ...(taken ? [...ctx.taken] : [])]) if (overlap(band, z)) cuts.push(along(z));
    if (needWall) {
      const ws = (walls?.[side] ?? []).map(([s, e]) => [s, e]);
      if (walls) for (const hole of subtract(A, B, ws)) if (hole[1] - hole[0] > 0.35) cuts.push(hole);
    }
    return subtract(A, B, cuts).filter(([s, e]) => e - s >= min - 1e-6);
  };
  // a place for a piece against wall `side` (or the first of a list of walls that has one): `len` along it, `dep` out
  // from it starting d0 out, as near `at` as the doors and the pieces already placed allow ('start' | 'end' | 'mid' |
  // a number along the wall). front: room kept clear in front of it (a chair, a toilet's knees); frontZone: that room
  // must stay out of the door zones too. needWall: only where a real wall stands behind it.
  // Returns { side, c, body, use, pose(d) } or null.
  ctx.fit = ({ side = 'back', len, dep, at = 'mid', d0 = 0.25, front = 0, frontZone = false, lo = 0, hi, inset = 0.25, needWall = false, step = 0.25, ignoreTaken = false }) => {
    for (const sd of Array.isArray(side) ? side : [side]) {
      const Ls = lenOf(sd);
      const A = Math.max(lo, inset) + len / 2, B = Math.min(hi ?? Ls, Ls - inset) - len / 2;
      if (B < A - 1e-6) continue;
      let c0 = at === 'start' ? A : at === 'end' ? B : at === 'mid' || at == null ? Ls / 2 : at;
      c0 = clamp(c0, A, Math.max(A, B));
      const cands = [c0];
      for (let k = 1; k < 400; k++) {
        const p = c0 + k * step, m = c0 - k * step;
        if (p > B + 1e-6 && m < A - 1e-6) break;
        if (p <= B + 1e-6) cands.push(p);
        if (m >= A - 1e-6) cands.push(m);
      }
      // the two ends too (right into the corners), in their turn by distance
      for (const e of [A, Math.max(A, B)]) if (!cands.some((q) => Math.abs(q - e) < 1e-6)) cands.push(e);
      cands.sort((p, q) => Math.abs(p - c0) - Math.abs(q - c0));
      for (const c of cands) {
        const body = ctx.rect(sd, c - len / 2, c + len / 2, d0, d0 + dep);
        if (!ctx.inside(body) || ctx.hitsZone(body) || (!ignoreTaken && ctx.hitsTaken(body))) continue;
        if (needWall && !ctx.hasWall(sd, c - len / 2, c + len / 2)) continue;
        let use = null;
        if (front > 0) {
          use = ctx.rect(sd, c - len / 2, c + len / 2, d0 + dep, d0 + dep + front);
          if (!ctx.inside(use) || (!ignoreTaken && ctx.taken.some((t) => overlap(use, t))) || (frontZone && ctx.hitsZone(use))) continue;
        }
        return { side: sd, c, len, dep, d0, body, use, pose: (d = d0 + dep / 2) => ctx.pose(sd, c, d) };
      }
    }
    return null;
  };
  // a corner for a square-ish piece (a shower): 'back-left' | 'back-right' | 'front-left' | 'front-right'
  ctx.corner = ({ corners = ['back-left', 'back-right', 'front-left', 'front-right'], w, d, inset = 0.25, front = 0, needWall = true }) => {
    for (const cn of corners) {
      const [fb, lr] = cn.split('-');
      const x0 = lr === 'left' ? inset : W - inset - w, z0 = fb === 'back' ? inset : D - inset - d;
      const body = { x0, x1: x0 + w, z0, z1: z0 + d };
      if (!ctx.inside(body) || ctx.hitsZone(body) || ctx.hitsTaken(body)) continue;
      if (needWall && !(ctx.hasWall(fb, x0, x0 + w) && ctx.hasWall(lr, z0, z0 + d))) continue;
      // the way in: along the side facing the room
      const use = fb === 'back' ? { x0, x1: x0 + w, z0: z0 + d, z1: z0 + d + front } : { x0, x1: x0 + w, z0: z0 - front, z1: z0 };
      if (front > 0 && (!ctx.inside(use) || ctx.taken.some((t) => overlap(use, t)))) continue;
      return { corner: cn, body, use: front > 0 ? use : null };
    }
    return null;
  };
  return ctx;
}

// ── keeping the doors clear after a layout ──────────────────────────────────
// loose pieces that may slide out of a door's zone (else are left out); 'shift' ones only slide, never leave
const SLIDE = new Set(['plant', 'floorLamp', 'sideTable', 'loungeChair', 'ottoman', 'bench', 'stool', 'cushion', 'console']);
const SHIFT = new Set(['coffeeTable', 'dining', 'island', 'bookshelf']);
const DROP = new Set(['nightstand', 'deskLamp']);
const box3 = new THREE.Box3();

// the footprint of a piece in its parent's frame, from its solid meshes (thin rugs and shadows, and anything hanging
// above 2.2 units, left out); null when it has none
export function footprint(obj, base = 0) {
  let fp = null;
  obj.updateMatrixWorld(true);
  obj.traverse((m) => {
    if (!m.isMesh || m.userData.ghost) return;
    box3.setFromObject(m);
    if (box3.isEmpty() || box3.max.y - base < 0.2 || box3.min.y - base > 2.2) return;
    if (!fp) fp = { x0: box3.min.x, x1: box3.max.x, z0: box3.min.z, z1: box3.max.z, y0: box3.min.y, y1: box3.max.y };
    else {
      fp.x0 = Math.min(fp.x0, box3.min.x), fp.x1 = Math.max(fp.x1, box3.max.x);
      fp.z0 = Math.min(fp.z0, box3.min.z), fp.z1 = Math.max(fp.z1, box3.max.z);
      fp.y0 = Math.min(fp.y0, box3.min.y), fp.y1 = Math.max(fp.y1, box3.max.y);
    }
  });
  return fp;
}
// the meshes of a piece that would stand in a zone (per mesh, so a dining set's open middle does not count)
function meshesIn(obj, zones) {
  let hit = false;
  obj.traverse((m) => {
    if (hit || !m.isMesh || m.userData.ghost) return;
    box3.setFromObject(m);
    if (box3.isEmpty() || box3.max.y < 0.2 || box3.min.y > 2.2) return;
    const r = { x0: box3.min.x, x1: box3.max.x, z0: box3.min.z, z1: box3.max.z };
    if (zones.some((z) => overlap(r, z))) hit = true;
  });
  return hit;
}

export function keepClear(g, ctx) {
  if (!ctx.zones.length) return;
  const p0 = g.position.clone(), r0 = g.rotation.y;
  g.position.set(0, 0, 0);
  g.rotation.y = 0;
  g.updateMatrixWorld(true);
  const kids = g.children.slice();
  const info = new Map();
  for (const k of kids) {
    const piece = k.userData.piece ?? 'piece';
    if (piece === 'rug' || piece === 'art' || piece === 'pendant') continue;
    if (piece === 'blob') {
      info.set(k, { piece, blob: true, c: [k.position.x, k.position.z] });
      continue;
    }
    const fp = footprint(k);
    if (fp) info.set(k, { piece, fp });
  }
  const solids = [...info.entries()].filter(([, v]) => v.fp);
  const ridersOf = (k, fp) =>
    [...info.entries()].filter(([o, v]) => {
      if (o === k) return false;
      if (v.blob) return v.c[0] > fp.x0 - 0.4 && v.c[0] < fp.x1 + 0.4 && v.c[1] > fp.z0 - 0.4 && v.c[1] < fp.z1 + 0.4;
      // resting on it: inside its footprint and off the floor
      return v.fp.y0 > 0.3 && v.fp.x0 >= fp.x0 - 0.2 && v.fp.x1 <= fp.x1 + 0.2 && v.fp.z0 >= fp.z0 - 0.2 && v.fp.z1 <= fp.z1 + 0.2;
    }).map(([o]) => o);
  for (const [k, v] of solids) {
    if (!g.children.includes(k)) continue;
    const { piece, fp } = v;
    if (!ctx.zones.some((z) => overlap(fp, z)) || !meshesIn(k, ctx.zones)) continue;
    const big = Math.max(fp.x1 - fp.x0, fp.z1 - fp.z0);
    const canSlide = SLIDE.has(piece) || (SHIFT.has(piece) && (piece !== 'bookshelf' || big <= 4.2));
    const riders = ridersOf(k, fp);
    const move = (dx, dz) => {
      for (const o of [k, ...riders]) o.position.x += dx, (o.position.z += dz);
      v.fp = { ...fp, x0: fp.x0 + dx, x1: fp.x1 + dx, z0: fp.z0 + dz, z1: fp.z1 + dz };
      for (const o of riders) {
        const ov = info.get(o);
        if (ov?.fp) ov.fp = { ...ov.fp, x0: ov.fp.x0 + dx, x1: ov.fp.x1 + dx, z0: ov.fp.z0 + dz, z1: ov.fp.z1 + dz };
      }
    };
    if (canSlide) {
      const reach = SHIFT.has(piece) ? 2.5 : 4.5;
      // a piece against a wall slides along it rather than out into the room
      const nearX = fp.x0 < 0.9 || fp.x1 > ctx.W - 0.9, nearZ = fp.z0 < 0.9 || fp.z1 > ctx.D - 0.9;
      const cands = [];
      for (let dx = -reach; dx <= reach + 1e-6; dx += 0.25)
        for (let dz = -reach; dz <= reach + 1e-6; dz += 0.25) {
          if (Math.hypot(dx, dz) > reach) continue;
          cands.push([dx, dz, Math.abs(dx) * (nearX && !nearZ ? 3 : 1) + Math.abs(dz) * (nearZ && !nearX ? 3 : 1)]);
        }
      cands.sort((p, q) => p[2] - q[2]);
      const others = solids.filter(([o]) => o !== k && !riders.includes(o) && g.children.includes(o)).map(([, ov]) => ov.fp);
      let done = false;
      for (const [dx, dz] of cands) {
        const r = { x0: fp.x0 + dx, x1: fp.x1 + dx, z0: fp.z0 + dz, z1: fp.z1 + dz };
        if (!ctx.inside(r, 0.2) || ctx.zones.some((z) => overlap(r, z)) || others.some((o) => overlap(r, o, 0.05))) continue;
        move(dx, dz);
        done = true;
        break;
      }
      if (done) continue;
    }
    if (SLIDE.has(piece) || DROP.has(piece)) {
      for (const o of [k, ...riders]) g.remove(o);
      ctx.notes.push(`left out ${piece} (it stood in a door's way)`);
    } else ctx.notes.push(`${piece} stands in a door's zone`);
  }
  g.position.copy(p0);
  g.rotation.y = r0;
  g.updateMatrixWorld(true);
}

// ── stairs in a room ────────────────────────────────────────────────────────
// a flight spec: { x: [x0, x1], z: [z0, z1], dir: '-z' } (the room's own frame; dir is the way you walk going UP for
// o.up, going DOWN for o.down), or { runs: [ {x, z, dir}, {x, z, landing: true}, {x, z, dir} ] } for a turning stair
export function flightRuns(spec) {
  if (!spec) return [];
  const list = spec.runs ?? [spec];
  return list.map((r) => ({ x: r.x, z: r.z, dir: r.dir ?? '-z', landing: !!r.landing }));
}
// the point where a flight arrives (up: the far end of its last run; down: the far end of its last run too)
export function flightEnd(spec) {
  const runs = flightRuns(spec);
  const r = runs[runs.length - 1];
  if (!r) return null;
  const cx = (r.x[0] + r.x[1]) / 2, cz = (r.z[0] + r.z[1]) / 2;
  const ax = r.dir[1], sg = r.dir[0] === '+' ? 1 : -1;
  if (r.landing) return { x: cx, z: cz };
  return ax === 'x' ? { x: sg > 0 ? r.x[1] - 0.3 : r.x[0] + 0.3, z: cz } : { x: cx, z: sg > 0 ? r.z[1] - 0.3 : r.z[0] + 0.3 };
}
export function flightRect(spec) {
  const runs = flightRuns(spec);
  if (!runs.length) return null;
  return { x0: Math.min(...runs.map((r) => r.x[0])), x1: Math.max(...runs.map((r) => r.x[1])), z0: Math.min(...runs.map((r) => r.z[0])), z1: Math.max(...runs.map((r) => r.z[1])) };
}
// the default flight of a 'stair' room in the cutaway (homes.js F.stair): along its left wall, climbing toward the back
export function defaultUp(W, D) {
  const sw = Math.min(2.8, W - 1.6), n = 5, run = Math.min(0.75, (D - 0.4) / n);
  return { x: [0.05, 0.05 + sw], z: [0, n * run], dir: '-z' };
}

// ── the plan checker ────────────────────────────────────────────────────────
// built: { levels: [{ L, at: [ox, oy, oz], lk, groups: Map(id -> furniture group), walls: Group }] } after the overview
// is in the scene (world matrices up to date)
export function planCheck({ slug, P, built }) {
  const report = { slug, levels: [], links: [], rooms: [], baths: [], outdoor: [], stairs: [], problems: [], notes: [] };
  const lvls = built.levels.map((b, i) => ({ ...b, i, oy: b.at[1] }));
  const ys = [...new Set(lvls.map((l) => l.oy))].sort((a, b) => a - b);
  const ground = lvls.find((l) => l.oy === 0) ?? lvls.slice().sort((a, b) => Math.abs(a.oy) - Math.abs(b.oy))[0];
  const gi = ys.indexOf(ground.oy);
  for (const l of lvls) {
    const k = ys.indexOf(l.oy) - gi;
    l.name = k < 0 ? `B${-k}` : `${k + 1}F`;
  }
  const levelOf = {}, roomOf = {};
  const ids = new Set();
  for (const l of lvls)
    for (const r of l.L.rooms) {
      if (ids.has(r.id)) report.problems.push(`room id ${r.id} is used twice (ids must be unique in the home)`);
      ids.add(r.id);
      levelOf[r.id] = l;
      roomOf[r.id] = r;
    }
  const box = new THREE.Box3();
  const pieceName = (m, root) => {
    for (let o = m; o && o !== root; o = o.parent) if (o.userData.piece) return o.userData.piece;
    return 'piece';
  };
  // solid furniture and walls, per level, in world coordinates
  for (const l of lvls) {
    l.solids = [];
    for (const [id, grp] of l.groups) {
      grp.traverse((m) => {
        if (!m.isMesh || m.userData.ghost) return;
        box.setFromObject(m);
        if (box.isEmpty() || box.max.y - l.oy < 0.2 || box.min.y - l.oy > 2.2) return;
        const piece = pieceName(m, grp);
        if (piece === 'rug' || piece === 'blob') return;
        l.solids.push({ x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, room: id, piece });
      });
    }
    l.wallBoxes = [];
    l.walls?.traverse((m) => {
      if (!m.isMesh || !m.userData.wall) return;
      box.setFromObject(m);
      l.wallBoxes.push({ x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z });
    });
  }
  // every link: its gap, what stands in its zone, how wide the way through really is
  const edges = [];
  for (const l of lvls) {
    const [ox, , oz] = l.at;
    for (const k of l.lk.links) {
      if (l.lk.kindOf[k.a] === 'void' || l.lk.kindOf[k.b] === 'void') continue;
      const dz = k.kind === 'open' ? 1.0 : ZONE;
      const alongX = k.axis === 'x';
      const off = alongX ? ox : oz, offA = alongX ? oz : ox;
      const g0 = k.g0 + off, g1 = k.g1 + off, line = k.line + offA;
      const zone = alongX ? { x0: g0, x1: g1, z0: line - dz, z1: line + dz } : { x0: line - dz, x1: line + dz, z0: g0, z1: g1 };
      const band = alongX ? { x0: g0, x1: g1, z0: line - T / 2 - 0.01, z1: line + T / 2 + 0.01 } : { x0: line - T / 2 - 0.01, x1: line + T / 2 + 0.01, z0: g0, z1: g1 };
      const proj = (r) => (alongX ? [r.x0, r.x1] : [r.z0, r.z1]);
      const cuts = [];
      const blockers = new Map();
      for (const s of l.solids)
        if ((s.room === k.a || s.room === k.b) && overlap(s, zone, 0.03)) {
          cuts.push(proj(s));
          const key = `${s.room}:${s.piece}`;
          blockers.set(key, { room: s.room, piece: s.piece });
        }
      for (const w of l.wallBoxes) if (overlap(w, band, 0.03)) cuts.push(proj(w));
      const free = subtract(g0, g1, cuts);
      const clear = free.reduce((m, [s, e]) => Math.max(m, e - s), 0);
      const rec = {
        level: l.name, kind: k.kind, a: k.a, b: k.b, side: k.side ?? null, want: +k.want.toFixed(2), width: +(k.g1 - k.g0).toFixed(2), clear: +clear.toFixed(2),
        at: [+k.g0.toFixed(2), +k.g1.toFixed(2)], axis: k.axis, line: k.line, ok: clear >= PASS - 1e-6, blockers: [...blockers.values()],
        zone: { ...zone, y: l.oy },
      };
      report.links.push(rec);
      if (rec.ok) edges.push([k.a, k.b ?? '@out']);
      if (k.kind !== 'open' && rec.blockers.length) report.problems.push(`${k.kind} ${k.a}–${k.b ?? 'outside'} (${l.name}): ${rec.blockers.map((b) => `${b.room}.${b.piece}`).join(', ')} in its 2-unit zone; clear ${rec.clear}`);
      else if (!rec.ok) report.problems.push(`${k.kind} ${k.a}–${k.b ?? 'outside'} (${l.name}): only ${rec.clear} units clear (needs ${PASS})`);
    }
    for (const p of l.lk.problems) report.problems.push(`${l.name}: ${p}`);
  }
  // stairs between levels: a flight up (o.up, or a 'stair' room's own flight when there is a level above) arrives in the
  // room above that holds its top end; a flight down (o.down, a stair void) leads to the room below that holds its end
  const near = (l, dir) => {
    const k = ys.indexOf(l.oy) + dir;
    return k < 0 || k >= ys.length ? null : lvls.find((q) => q.oy === ys[k]);
  };
  const roomAt = (l, x, z) => l.L.rooms.find((r) => x > r.x[0] && x < r.x[1] && z > r.z[0] && z < r.z[1]) ?? null;
  for (const l of lvls)
    for (const r of l.L.rooms) {
      if (r.kind === 'void') continue; // an opening over a double-height room: nobody walks there
      const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0];
      const ups = r.o?.up ? [r.o.up] : r.kind === 'stair' && near(l, +1) && r.o?.up !== false ? [defaultUp(w, d)] : [];
      for (const [spec, dir] of [...ups.map((s) => [s, +1]), ...(r.o?.down ? [[r.o.down, -1]] : [])]) {
        const other = near(l, dir);
        if (!other) {
          report.stairs.push({ from: r.id, level: l.name, dir: dir > 0 ? 'up' : 'down', to: null });
          if (dir > 0 && r.o?.up) report.problems.push(`stair ${r.id} (${l.name}) goes up but there is no level above`);
          if (dir < 0) report.problems.push(`stair ${r.id} (${l.name}) goes down but there is no level below`);
          continue;
        }
        const end = flightEnd(spec), fr = flightRect(spec);
        const px = r.x[0] + end.x, pz = r.z[0] + end.z;
        const to = roomAt(other, px, pz);
        let voidOk = null;
        if (to) {
          // the other end should show the stair too: a void (o.down) above, a flight (o.up / a stair room) below
          const tw = to.x[1] - to.x[0], td = to.z[1] - to.z[0];
          const otherSpec = dir > 0 ? to.o?.down : to.o?.up ?? (to.kind === 'stair' ? defaultUp(tw, td) : null);
          const orc = otherSpec ? flightRect(otherSpec) : null;
          const a = { x0: r.x[0] + fr.x0, x1: r.x[0] + fr.x1, z0: r.z[0] + fr.z0, z1: r.z[0] + fr.z1 };
          voidOk = !!orc && overlap(a, { x0: to.x[0] + orc.x0, x1: to.x[0] + orc.x1, z0: to.z[0] + orc.z0, z1: to.z[0] + orc.z1 });
          edges.push([r.id, to.id]);
        }
        report.stairs.push({ from: r.id, level: l.name, dir: dir > 0 ? 'up' : 'down', to: to?.id ?? null, toLevel: other.name, toKind: to?.kind ?? null, matched: voidOk });
        if (!to) report.problems.push(`stair ${r.id} (${l.name}) ${dir > 0 ? 'up' : 'down'}: its end (${px.toFixed(1)}, ${pz.toFixed(1)}) is in no room on ${other.name}`);
        else if (!voidOk) report.problems.push(`stair ${r.id} (${l.name}) ${dir > 0 ? 'up' : 'down'} arrives in ${to.id} (${other.name}, ${to.kind}) where no ${dir > 0 ? 'stair void (o.down)' : 'flight (o.up / a stair room)'} is drawn over the same spot`);
      }
    }
  for (const [a, b] of P.stairs ?? []) edges.push([a, b]);
  // reachable from outside, through the doors to outside, over links at least PASS wide (with no door to outside yet:
  // from the entry, so the rest of the plan can still be read)
  const adj = new Map();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }
  const anyExit = lvls.some((l) => l.lk.gaps.some((g) => g.kind === 'exit'));
  const starts = anyExit ? ['@out'] : lvls.flatMap((l) => l.L.rooms.filter((r) => r.kind === 'entry').map((r) => r.id));
  const seen = new Set(starts);
  const queue = starts.slice();
  while (queue.length) for (const n of adj.get(queue.shift()) ?? []) if (!seen.has(n)) seen.add(n), queue.push(n);
  report.reachFrom = anyExit ? 'front door' : 'entry (no door to outside yet)';
  const lost = [];
  // areas, front doors, outdoor doors, baths
  let total = 0, totalOut = 0;
  for (const l of lvls) {
    let inM2 = 0, outM2 = 0;
    for (const r of l.L.rooms) {
      const m2 = (r.x[1] - r.x[0]) * (r.z[1] - r.z[0]) * 0.16;
      const outdoor = isOutdoor(r.kind);
      if (outdoor) outM2 += m2;
      else if (r.kind !== 'void') inM2 += m2;
      report.rooms.push({ id: r.id, kind: r.kind, level: l.name, m2: +m2.toFixed(1), reachable: r.kind === 'void' ? null : seen.has(r.id) });
      if (!seen.has(r.id) && r.kind !== 'void') lost.push(`${r.id} (${l.name})`);
    }
    const exits = l.lk.gaps.filter((g) => g.kind === 'exit' && !isOutdoor(l.lk.kindOf[g.a]));
    const outDoors = [];
    for (const r of l.L.rooms.filter((q) => isOutdoor(q.kind))) {
      const ways = report.links.filter((k) => k.level === l.name && (k.a === r.id || k.b === r.id) && !isOutdoor(l.lk.kindOf[k.a === r.id ? k.b : k.a]) && (k.a === r.id ? k.b : k.a) !== null);
      const rec = { id: r.id, kind: r.kind, level: l.name, doors: ways.map((k) => ({ from: k.a === r.id ? k.b : k.a, kind: k.kind, clear: k.clear })) };
      report.outdoor.push(rec);
      outDoors.push(...rec.doors.map((d) => `${d.from}→${r.id}`));
      if (!ways.length) report.problems.push(`${r.id} (${l.name}, ${r.kind}) has no door from the house`);
      else if (!ways.some((k) => k.ok)) report.problems.push(`${r.id} (${l.name}, ${r.kind}): no door from the house is ${PASS} units clear`);
    }
    const rec = {
      name: l.name, oy: l.oy, W: l.L.W, D: l.L.D, m2: +inM2.toFixed(1), outdoorM2: +outM2.toFixed(1), py: +(inM2 / 3.3058).toFixed(1),
      emptyM2: +(l.lk.emptyCells * G * G * 0.16).toFixed(1), overlapM2: +(l.lk.overlapCells * G * G * 0.16).toFixed(1),
      frontDoor: exits.map((g) => `${g.a} (${g.side}, ${(g.g1 - g.g0).toFixed(2)})`), outdoorDoors: outDoors,
    };
    report.levels.push(rec);
    if (rec.overlapM2 > 0) report.problems.push(`${l.name}: rooms overlap (${rec.overlapM2} m²)`);
    total += inM2;
    totalOut += outM2;
  }
  if (lost.length) report.problems.push(`not reachable from the ${report.reachFrom} over ways ${PASS} units wide: ${lost.join(', ')}`);
  const groundRec = report.levels.find((r) => r.name === ground.name);
  if (!groundRec.frontDoor.length) report.problems.push(`${ground.name}: no front door (현관문): add ['entry', null, pos, width, { side }] to doors`);
  for (const l of lvls)
    for (const r of l.L.rooms.filter((q) => q.kind === 'bath')) {
      const tags = new Set();
      l.groups.get(r.id)?.traverse((o) => o.userData.piece && tags.add(o.userData.piece));
      const rec = { id: r.id, level: l.name, toilet: tags.has('toilet'), basin: tags.has('vanity'), shower: tags.has('shower'), tub: tags.has('tub'), big: !!r.o?.big };
      report.baths.push(rec);
      const miss = ['toilet', 'basin'].filter((k) => !rec[k]);
      if (!rec.shower && !rec.tub && (r.x[1] - r.x[0]) * (r.z[1] - r.z[0]) > 26) miss.push('shower or tub');
      if (miss.length) report.problems.push(`bath ${r.id} (${l.name}) has no ${miss.join(', ')}`);
    }
  report.total = { m2: +total.toFixed(1), py: +(total / 3.3058).toFixed(1), outdoorM2: +totalOut.toFixed(1) };
  if (P.target?.m2) {
    const k = total / P.target.m2 - 1;
    report.total.target = P.target;
    report.total.off = +(k * 100).toFixed(0);
    if (Math.abs(k) > 0.1) report.problems.push(`indoor area ${total.toFixed(1)} m² is ${k > 0 ? '+' : ''}${(k * 100).toFixed(0)}% off ${P.target.label}`);
  }
  report.ok = report.problems.length === 0;
  return report;
}
