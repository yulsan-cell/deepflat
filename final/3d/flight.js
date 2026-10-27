// The scroll flight's camera: one continuous path through the miniature, driven by flight progress p (0..1).
//   p 0.00-0.07  world    the establishing shot (a long lens far away: the old isometric look), a slow push-in that
//                         already leans toward the living room
//   p 0.07-0.27           the dive: the camera dollies down into the living room while the lens widens. The lens is
//                         set from the dolly so the picture grows at one smooth rate, picking up from the world's
//                         push-in and easing into the living room's drift (see `dive` in makeFlight): the dive opens
//                         as a push-in, never a pause where the widening lens cancels the dolly
//   p 0.27-0.40  living   dwell: the camera settles in the corner of the room and drifts
//   p 0.40-0.56           rise and glide across to the right ledge (via p 0.50)
//   p 0.56-0.68  kitchen  dwell
//   p 0.68-0.84           crane up the long block's face until the bedroom platform clears its edge (via p 0.775).
//                         Each via sits about where its share of the path's length puts it, so the camera does not
//                         rush the first part of a transit and crawl through the rest
//   p 0.84-1.00  bedroom  dwell, easing back a little at the very end; then the page scrolls on
// The lingering lives in the keyframe spacing: a dwell moves the camera a little over a long stretch of p, a transit a
// lot over a short one. Every channel (look-at point, azimuth, elevation, log distance, field of view) runs through a
// monotone cubic (Fritsch-Butland), so nothing overshoots and the speed changes smoothly at every keyframe: the camera
// slows into each dwell and picks up again without ever jumping or rewinding. Scrolling up plays the same path back.
// The two transits' via keyframes sit between their neighbours in every channel (their distance is the log midpoint of
// the two dwells', `mix`), so each transit is one arc, not a pull-back, a pause and a push-in.
//
// Framing adapts to the screen's shape: a keyframe names its subject (a look-at point and the size that must fit) and
// where on screen the subject sits, with optional overrides for portrait screens (`tall`), blended by aspect.
// No pure function here touches the DOM, so the still renders (final/stills/flight.js) use the very same keyframes.
import { THREE } from './kit.js';

export const SCENES = ['world', 'living', 'kitchen', 'bedroom'];
// a scene's copy is fully shown inside its dwell [a, b] and fades over FADE on either side (the world's is shown from
// the start, the bedroom's to the end)
export const DWELL = { world: [0, 0.07], living: [0.27, 0.4], kitchen: [0.56, 0.68], bedroom: [0.84, 1] };
export const FADE = 0.035;
// where the route rail takes each scene: the middle of its dwell (the world is the very top)
export const STOP = { world: 0, living: 0.335, kitchen: 0.62, bedroom: 0.92 };

const D2R = Math.PI / 180;

// Keyframes. Angles in degrees. A room keyframe: T look-at point, az / el the camera's direction from T, fov,
// size [w, h] the subject that must fit, off [x, y] where T sits on screen (fractions of the frame from its centre,
// +x right, +y up). A via keyframe gives the distance d instead of a size, or `mix`: its distance between its
// neighbours' (0 the one before .. 1 the one after, in log distance); with `tmix` its look-at point is likewise taken
// on the line between theirs (T is then only a fallback), moved by dT. `tall` overrides fields on portrait screens.
// The world keyframes are framed on the letters (see worldFrame), like the old hero; `lead` moves the look-at that many
// units toward the living room's, where the dive goes next.
// The living room's keys move with the room (rooms.js LIVING.dx, 2026-10-27: the room was centred on the plinth), so
// the dive and the dwell frame it exactly as before
const LIVING_DX = -5.5;
const lx = ([x, y, z]) => [x + LIVING_DX, y, z];
const LIVING_T = lx([14.2, 3.6, 20.6]);
export const KEYS = [
  { p: 0, world: true },
  { p: 0.07, world: true, daz: 1.4, del: -0.8, zoom: 1.06, lead: 3.5 },
  {
    p: 0.27, T: LIVING_T, az: 40.5, el: 18.5, fov: 36, size: [33, 15], off: [0.12, 0.06],
    tall: { T: lx([13.4, 3.6, 21.8]), az: 50, el: 16, size: [17.5, 19], off: [0, 0.1] },
  },
  {
    p: 0.4, T: lx([14.9, 3.7, 20.2]), az: 38, el: 19.5, fov: 36, size: [31.5, 14.4], off: [0.12, 0.06],
    tall: { T: lx([14.0, 3.7, 21.4]), az: 47.5, el: 17, size: [17, 18.5], off: [0, 0.1] },
  },
  { p: 0.5, T: [28.5, 9.0, 11.5], tmix: 0.55, dT: [0, 1.5, 0], az: 33, el: 19.75, fov: 38, mix: 0.5 },
  {
    p: 0.56, T: [40.4, 12.2, 2.2], az: 27, el: 20, fov: 40, size: [27, 13], off: [0.12, 0.04],
    tall: { T: [39.1, 12.6, 3.4], az: 24, el: 21, size: [18.5, 17.5], off: [0, 0.1] },
  },
  {
    p: 0.68, T: [41.3, 12.5, 1.8], az: 25, el: 21, fov: 40, size: [26, 12.5], off: [0.12, 0.04],
    tall: { T: [39.7, 12.9, 3.0], az: 22.5, el: 22, size: [18, 17], off: [0, 0.1] },
  },
  { p: 0.775, T: [38, 32, -7], az: 30, el: 22, fov: 40, mix: 0.5 },
  {
    p: 0.84, T: [36.2, 41.4, -15.0], az: 31, el: 23, fov: 40, size: [24, 12], off: [0.12, 0.04],
    tall: { T: [36.6, 41.6, -14.6], az: 30, el: 24, size: [15.5, 17], off: [0, 0.1] },
  },
  {
    p: 1, T: [35.8, 41.8, -15.4], az: 33, el: 25, fov: 40, size: [26.5, 13], off: [0.12, 0.04],
    tall: { T: [36.2, 42.0, -15.0], az: 32, el: 26, size: [17, 18.5], off: [0, 0.1] },
  },
];

const AZ0 = 37, EL0 = 32, FOV0 = 9; // the establishing shot: the old isometric view through a long lens
// the establishing shot's framing (worldFrame). Landscape: the logo's share of the frame height and the world's slide
// right (units) on 16:10 and wider screens (fh, s) and on 4:3 ones (fh43, s43), blended from aspect g0 to g1.
// Portrait tablets (mid) and phones (ph): the logo's share of the height and width, the look-at moved right (s) and up
// (up) in units, and where the logo's centre sits above the frame's (oy).
// Since the living room moved left (LIVING_DX) the world sits a little further right and a few per cent smaller, so the
// living room keeps its old clearance from the heading (left) and the bedroom its old place at the right edge
// (was fh 0.31 s 18, fh43 0.27 s43 24; mid fh 0.27 fw 0.42 s 9; ph fh 0.245 fw 0.345 s 13).
export const WF = {
  fh: 0.30, s: 21.5, fh43: 0.26, s43: 27.5, g0: 1.2, g1: 1.45,
  mid: { fh: 0.26, fw: 0.40, s: 6, up: 0, oy: 0.22 },
  ph: { fh: 0.235, fw: 0.33, s: 9, up: 4, oy: 0.14 },
};

const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// camera axes for a view from azimuth / elevation (radians): dir points from the look-at point to the camera
export function basis(az, el) {
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
  const up = new THREE.Vector3().crossVectors(right, dir.clone().negate()).normalize();
  return { dir, right, up };
}

// the establishing shot, framed on the letters as the old orthographic hero was: the logo takes about the same share of
// the frame and sits a little above centre. Landscape screens slide the world right, so the living room in front of the
// letters clears the heading at the lower left (the first room the scroll hint names); phones frame it a little smaller
// and higher, so the kitchen ledge and the bedroom platform, the flight's later stops, are in the opening frame too.
function worldFrame(logo, A, { daz = 0, del = 0, zoom = 1, lead = 0 } = {}) {
  const az = (AZ0 + daz) * D2R, el = (EL0 + del) * D2R;
  const { right, up } = basis(AZ0 * D2R, EL0 * D2R);
  const c = logo.getCenter(new THREE.Vector3());
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const p = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? logo.max.x : logo.min.x, i & 2 ? logo.max.y : logo.min.y, i & 4 ? logo.max.z : logo.min.z).sub(c);
    const u = p.dot(right), v = p.dot(up);
    x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
  }
  const lw = x1 - x0, lh = y1 - y0;
  const wide = A >= 0.8, phone = A < 0.6;
  const g = smooth(WF.g0, WF.g1, A); // 4:3 .. 16:10 and wider
  const n = phone ? WF.ph : WF.mid; // narrow screens
  const fh = wide ? lerp(WF.fh43, WF.fh, g) : n.fh; // the logo's share of the frame height
  const H = Math.max(lh / fh, lw / (wide ? 0.5 : n.fw) / A) / zoom;
  // the frame's centre, right of the logo's (world units along the screen's x)
  const shift = wide ? 0.12 * lw - lerp(WF.s43, WF.s, g) : (phone ? -0.38 : -0.12) * lw + n.s;
  const ox = -shift / (H * A);
  const oy = wide ? 0.13 : n.oy - n.up / H;
  const T = c.clone();
  if (lead) T.add(new THREE.Vector3(...LIVING_T).sub(c).normalize().multiplyScalar(lead));
  return { T: T.toArray(), az: AZ0 + daz, el: EL0 + del, fov: FOV0, H, off: [ox, oy], _az: az, _el: el };
}

// one keyframe resolved for aspect A: look-at point (already shifted so the subject sits at `off`), angles, distance
function resolve(key, A, logo) {
  let k = key;
  if (key.world) {
    const f = worldFrame(logo, A, key);
    k = { ...f };
  } else if (key.tall) {
    const w = smooth(0.62, 1.25, A); // 0 portrait .. 1 landscape
    k = { ...key };
    for (const [f, tv] of Object.entries(key.tall)) {
      const wv = key[f];
      k[f] = Array.isArray(tv) ? tv.map((v, i) => lerp(v, wv[i], w)) : lerp(tv, wv, w);
    }
  }
  const fov = k.fov;
  const tanH = Math.tan((fov * D2R) / 2);
  const H = k.H ?? (k.size ? Math.max(k.size[1], k.size[0] / A) : 2 * (k.d ?? 1) * tanH); // `mix`: see setAspect
  const d = H / (2 * tanH);
  const { right, up } = basis(k.az * D2R, k.el * D2R);
  const [ox, oy] = k.off ?? [0, 0];
  const T = new THREE.Vector3(...(k.T ?? [0, 0, 0])).addScaledVector(right, -ox * H * A).addScaledVector(up, -oy * H);
  return { p: key.p, Tx: T.x, Ty: T.y, Tz: T.z, az: k.az, el: k.el, ld: Math.log(d), fov };
}

// monotone cubic through (xs, ys) with the Fritsch-Butland weighted harmonic slopes; zero slope at both ends
function monotone(xs, ys) {
  const n = xs.length;
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(xs[i + 1] - xs[i]);
    m.push((ys[i + 1] - ys[i]) / dx[i]);
  }
  const t = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) continue;
    t[i] = (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = dx[i], s = (x - xs[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * t[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * t[i + 1];
  };
}

const CH = ['Tx', 'Ty', 'Tz', 'az', 'el', 'ld', 'fov'];

// The flight for one screen shape. setAspect(A) rebuilds the splines; at(p) gives the camera at progress p.
export function makeFlight(logo) {
  let A = 0;
  let fn = null;
  let resolved = null;
  let dive = null;
  const flight = {
    get aspect() { return A; },
    setAspect(a) {
      if (Math.abs(a - A) < 1e-4 && fn) return;
      A = a;
      const keys = KEYS.map((k) => resolve(k, A, logo));
      keys.forEach((k, i) => {
        if (KEYS[i].mix != null) k.ld = lerp(keys[i - 1].ld, keys[i + 1].ld, KEYS[i].mix) + Math.log(KEYS[i].bow ?? 1);
        // `tmix`: the look-at point on the line between the neighbours' (as resolved for this screen), moved by dT
        if (KEYS[i].tmix != null) {
          const [q, n, f] = [keys[i - 1], keys[i + 1], KEYS[i].tmix];
          const o = KEYS[i].dT ?? [0, 0, 0];
          [k.Tx, k.Ty, k.Tz] = [lerp(q.Tx, n.Tx, f) + o[0], lerp(q.Ty, n.Ty, f) + o[1], lerp(q.Tz, n.Tz, f) + o[2]];
        }
      });
      const xs = keys.map((k) => k.p);
      fn = Object.fromEntries(CH.map((c) => [c, monotone(xs, keys.map((k) => k[c]))]));
      resolved = keys;
      // The dive's lens. The frame's visible height (log) runs a cubic from the world dwell's end to the living room's
      // start whose slopes there match the dwells' own (where the lens is fixed and only the dolly zooms), so the rate
      // the picture grows at rises and falls once, smoothly; the lens is whatever gives that height at the dolly's
      // distance.
      const p0 = DWELL.world[1], p1 = DWELL.living[0], e = 1e-4;
      const lhv = (x) => fn.ld(x) + Math.log(2 * Math.tan((fn.fov(x) * D2R) / 2));
      const L0 = lhv(p0), L1 = lhv(p1);
      const rate = (L1 - L0) / (p1 - p0);
      const slope = (x) => (fn.ld(x + e) - fn.ld(x)) / e / rate;
      dive = { a: p0, b: p1, L0, L1, m0: slope(p0), m1: slope(p1), f0: fn.fov(p0), f1: fn.fov(p1) };
    },
    // the keyframes as resolved for the current aspect (review: distances, angles)
    get keys() { return resolved; },
    // camera at progress p; `mods` nudges it (the opening's settle): daz / del degrees, dist factor
    at(p, mods = {}, out = {}) {
      const target = (out.target ??= new THREE.Vector3());
      const pos = (out.pos ??= new THREE.Vector3());
      target.set(fn.Tx(p), fn.Ty(p), fn.Tz(p));
      const az = (fn.az(p) + (mods.daz ?? 0)) * D2R;
      const el = (fn.el(p) + (mods.del ?? 0)) * D2R;
      const d = Math.exp(fn.ld(p)) * (mods.dist ?? 1);
      if (mods.dy) target.y += mods.dy;
      const { dir } = basis(az, el);
      pos.copy(target).addScaledVector(dir, d);
      out.fov = fn.fov(p);
      if (p > dive.a && p < dive.b) {
        const s = (p - dive.a) / (dive.b - dive.a), s2 = s * s, s3 = s2 * s;
        const u = 3 * s2 - 2 * s3 + dive.m0 * (s3 - 2 * s2 + s) + dive.m1 * (s3 - s2);
        const hv = Math.exp(dive.L0 + (dive.L1 - dive.L0) * u);
        const fov = (2 * Math.atan(hv / (2 * Math.exp(fn.ld(p))))) / D2R;
        out.fov = Math.min(Math.max(fov, dive.f0), dive.f1);
      }
      out.d = d;
      // depth range: tight round the world when far away (precision), close in when inside a room
      out.near = Math.max(0.4, Math.min(d * 0.5, d - 220));
      out.far = d + 520;
      return out;
    },
  };
  return flight;
}

export function applyCamera(camera, c, aspect) {
  camera.fov = c.fov;
  camera.aspect = aspect;
  camera.near = c.near;
  camera.far = c.far;
  camera.position.copy(c.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(c.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// copy visibility of each scene at progress p (0..1 each)
export function copyLevels(p) {
  return SCENES.map((id, i) => {
    const [a, b] = DWELL[id];
    if (i === 0) return 1 - smooth(b, b + FADE, p);
    if (i === SCENES.length - 1) return smooth(a - FADE, a, p);
    return smooth(a - FADE, a, p) * (1 - smooth(b, b + FADE, p));
  });
}

// the scene the route rail marks at progress p: the one whose dwell is nearest
export function sceneAt(p) {
  let best = 0, bd = Infinity;
  SCENES.forEach((id, i) => {
    const [a, b] = DWELL[id];
    const dd = p < a ? a - p : p > b ? p - b : 0;
    if (dd < bd - 1e-9) { bd = dd; best = i; }
  });
  return best;
}

// how far the route rail's line is filled at progress p: it reaches each stop's marker (evenly spaced on the rail)
// exactly when the flight reaches that stop
export function railAt(p) {
  const xs = SCENES.map((id) => STOP[id]);
  if (p <= xs[0]) return 0;
  for (let i = 1; i < xs.length; i++) {
    if (p <= xs[i]) return (i - 1 + (p - xs[i - 1]) / (xs[i] - xs[i - 1])) / (xs.length - 1);
  }
  return 1;
}
