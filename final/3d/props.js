// DEEPFLAT props: furniture, plants, ceramics, textiles and fittings for the daylight rooms (rooms.js, the hero's
// 거실 / 주방·다이닝 / 침실) and the carousel cutaways (final/stills/carousel.js).
//
// Every builder works in METRES, in its own frame: standing on y = 0, front toward +Z, centred on x = 0 (unless it says
// otherwise), and returns a THREE.Group placed with place(): { x, y, z } in world units, rot about y, s = world units per
// metre. One builder per prop type, so a later phase can swap any of them for a loaded glTF model (also in metres, front
// +Z) with the same call: PROPS[name](M, opts) -> Group.
//
// Colours are given as they should read on screen in sunlight (kit.js paint()); textures are drawn in screen colours and
// converted to albedo with the same light (texMat), so a print, a rug or an oak board reads as drawn.
// Geometry is plain three.js (boxes, rounded boxes, lathes, extrusions, tubes) plus a few procedural shapes (leaves,
// petals, pillows); kit.js bake() merges a room into a handful of draw calls.
import { THREE, shared, paint, dayMat, dayIrradiance, DAY } from './kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;

// ── small utilities ─────────────────────────────────────────────────────────
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function place(g, { x = 0, y = 0, z = 0, rot = 0, s = 1 } = {}) {
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  return g;
}
const sh = (m, cast = true, receive = true) => {
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
};
const mesh = (geo, mat, cast = true, receive = true) => sh(new THREE.Mesh(geo, mat), cast, receive);

// box by its floor centre (metres); r > 0 rounds the edges
export function box(mat, w, h, d, x = 0, y = 0, z = 0, r = 0) {
  const key = `pb${w.toFixed(4)},${h.toFixed(4)},${d.toFixed(4)},${r}`;
  const geo = shared(key, () =>
    r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 0.001))) : new THREE.BoxGeometry(w, h, d),
  );
  const m = mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  return m;
}
// box from ranges
export function boxR(mat, [x0, x1], [y0, y1], [z0, z1], r = 0) {
  return box(mat, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2, r);
}
export function cylinder(mat, rTop, rBot, h, x = 0, y = 0, z = 0, seg = 20, open = false) {
  const geo = shared(`pc${rTop},${rBot},${h},${seg},${open}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open));
  const m = mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  return m;
}
export function ball(mat, r, x = 0, y = 0, z = 0, seg = 16) {
  const m = mesh(shared(`ps${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))), mat);
  m.position.set(x, y, z);
  return m;
}
// a lathe from a profile [[r, y], ...] (bottom to top), seg around
export function lathe(mat, profile, seg = 28) {
  const key = 'pl' + seg + ':' + profile.map((p) => p.map((v) => v.toFixed(4)).join(',')).join(';');
  const geo = shared(key, () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), seg));
  return mesh(geo, mat);
}
// a cylinder from a to b (two Vector3), radius r0 at a and r1 at b
export function rod(mat, a, b, r0 = 0.01, r1 = r0, seg = 6) {
  const d = new V3().subVectors(b, a);
  const L = d.length();
  const m = mesh(shared(`pr${r0},${r1},${L.toFixed(4)},${seg}`, () => new THREE.CylinderGeometry(r1, r0, L, seg)), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  return m;
}
// a tube along points (CatmullRom), for stems, branches, a faucet's spout, a chair's bent rail
export function tube(mat, pts, r = 0.01, seg = 6, steps = 12) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : new V3(...p))));
  return mesh(new THREE.TubeGeometry(curve, steps, r, seg, false), mat);
}

// Rounded box whose top swells a little (a seat cushion), metres; bulge in metres at the centre
function softBoxGeo(w, h, d, r, bulge = 0.02) {
  return shared(`soft${w},${h},${d},${r},${bulge}`, () => {
    const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y > 0) {
        const fx = Math.max(0, 1 - Math.pow((2 * x) / w, 4)), fz = Math.max(0, 1 - Math.pow((2 * z) / d, 4));
        p.setY(i, y + bulge * fx * fz * (y / (h / 2)));
      }
    }
    g.computeVertexNormals();
    return g;
  });
}
export function softBox(mat, w, h, d, x = 0, y = 0, z = 0, r = 0.04, bulge = 0.02) {
  const m = mesh(softBoxGeo(w, h, d, r, bulge), mat);
  m.position.set(x, y + h / 2, z);
  return m;
}
// a pillow: w wide, h tall, t thick at the middle, pinched to a seam at the edges (lies in the XY plane, faces +Z)
function pillowGeo(w, h, t) {
  return shared(`pil${w},${h},${t}`, () => {
    const g = new THREE.SphereGeometry(0.5, 24, 16);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // a sphere squared off toward a cushion: push x, y outward toward the square, flatten z
      let x = p.getX(i) * 2, y = p.getY(i) * 2, z = p.getZ(i) * 2;
      const ax = Math.abs(x), ay = Math.abs(y);
      const sq = Math.max(ax, ay) > 1e-4 ? Math.hypot(x, y) / Math.max(ax, ay) : 1;
      const k = 0.78 + 0.22 * Math.min(1, Math.hypot(x, y));
      x *= Math.pow(sq, 0.85) * k;
      y *= Math.pow(sq, 0.85) * k;
      const edge = Math.max(Math.abs(x), Math.abs(y));
      z *= 0.18 + 0.82 * Math.pow(Math.max(0, 1 - Math.pow(edge, 3)), 0.8);
      p.setXYZ(i, (x * w) / 2, (y * h) / 2, (z * t) / 2);
    }
    g.computeVertexNormals();
    return g;
  });
}
export function pillow(mat, w, h, t, { x = 0, y = 0, z = 0, tilt = 0, yaw = 0, roll = 0 } = {}) {
  const m = mesh(pillowGeo(w, h, t), mat);
  m.position.set(x, y, z);
  m.rotation.set(tilt, yaw, roll, 'YXZ');
  return m;
}

// ── vertex-coloured geometry (leaves, petals, many small things in one mesh) ──────────────
export class VC {
  constructor() {
    this.parts = [];
  }
  // geo: a BufferGeometry (not modified), matrix: Matrix4, color: THREE.Color or (y01) => Color for a gradient along y
  add(geo, matrix, color) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
    if (!g.attributes.color) {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      const c = color.isColor ? color : null;
      for (let i = 0; i < n; i++) {
        const cc = c ?? color(i, n);
        col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    this.parts.push(g);
    return this;
  }
  mesh(mat, cast = true, receive = true) {
    const geo = mergeGeometries(this.parts);
    this.parts.forEach((p) => p.dispose());
    return mesh(geo, mat, cast, receive);
  }
}

// A leaf: base at the origin, pointing along +Z, face up (+Y), length len, width wid (metres).
// shape: 'lance' | 'oval' | 'paddle' | 'heart' | 'sword' | 'round' | 'petal' | 'cup'
// fold lifts the edges (a V along the midrib), droop bends it down toward the tip, twist turns it about its axis.
// The colours run from c0 at the base to c1 at the tip; the edges are a little lighter.
export function leafGeo({ len = 0.3, wid = 0.1, shape = 'oval', segs = 7, fold = 0.25, droop = 0.25, cupY = 0, c0, c1 }) {
  const prof = {
    lance: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9),
    oval: (t) => Math.pow(Math.max(0, 1 - Math.pow(2 * t - 1.08, 2)), 0.55),
    paddle: (t) => Math.pow(Math.max(0, 1 - Math.pow(2 * t - 1, 8)), 0.5) * (0.85 + 0.15 * Math.sin(Math.PI * t)),
    heart: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.62))), 0.8) * (1 - 0.25 * t),
    sword: (t) => Math.pow(1 - Math.pow(t, 2.5), 0.6) * (0.75 + 0.25 * Math.sin(Math.PI * t)),
    round: (t) => Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2))),
    petal: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.75))), 0.7),
    cup: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.6))), 0.6),
  }[shape];
  const pos = [], col = [], idx = [];
  const A = new THREE.Color(c0 ?? 0x557a46), B = new THREE.Color(c1 ?? 0x7fa463);
  const across = [-1, -0.5, 0, 0.5, 1];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const hw = (wid / 2) * prof(t);
    const zc = len * t;
    const yc = -droop * len * t * t;
    for (const a of across) {
      const x = a * hw;
      const lift = fold * Math.abs(a) * hw + cupY * (1 - a * a) * -1 * hw; // fold: edges up; cupY: middle down (a cup)
      pos.push(x, yc + lift, zc);
      const c = A.clone().lerp(B, Math.pow(t, 0.8)).lerp(B, Math.abs(a) * 0.25);
      col.push(c.r, c.g, c.b);
    }
  }
  const n = across.length;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = a + 1, c = a + n, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// a matrix that puts a leaf's base at p, pointing along direction (yaw about Y, pitch up from horizontal), rolled
export function leafAt(p, yaw, pitch, roll = 0, s = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, yaw, roll, 'YXZ'));
  return m.compose(p, q, new V3(s, s, s));
}

// ── textures (canvas, drawn in screen colours; the material turns them into albedo on the GPU) ──────────
// A texture is drawn as it should read on screen in sunlight. texMat() gives it a material whose shader inverts the tone
// curve and divides by the light that orientation receives (kit.js paint, per texel), so no pixels are read back on
// the CPU (a canvas read-back stalls the GPU and cost seconds on slow devices).
const texCache = new Map();
function canvasTex(key, w, h, draw, { on = 'top', repeat = true, aniso = 4 } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.userData.on = on;
  texCache.set(key, t);
  return t;
}
// the light a surface oriented like `on` receives (see kit.js paint)
const irradianceFor = (on) =>
  typeof on === 'number' ? dayIrradiance(new V3(0, 1, 0)).map((v) => v * on) : dayIrradiance(on === 'left' ? new V3(0, 0, 1) : on === 'right' ? new V3(1, 0, 0) : new V3(0, 1, 0));
// a standard material showing a screen-colour texture: per texel, the inverse of three's ACES curve on the grey axis
// (its RRT fit is a ratio of quadratics, solved for v) times 0.6 / exposure, divided by the light
export function texMat(tex, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, ...extra });
  const E = irradianceFor(tex.userData.on ?? 'top');
  const uE = new THREE.Vector3(...E);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uAlbE = { value: uE };
    sh.uniforms.uAlbK = { value: 0.6 / DAY.exposure };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uAlbE;\nuniform float uAlbK;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 y = clamp( diffuseColor.rgb, 0.0, 0.97 );
          vec3 qa = y * 0.983729 - 1.0;
          vec3 qb = y * 0.432951 - 0.0245786;
          vec3 qc = y * 0.238081 + 0.000090537;
          vec3 v = ( - qb - sqrt( max( qb * qb - 4.0 * qa * qc, 0.0 ) ) ) / ( 2.0 * qa );
          diffuseColor.rgb = min( v * uAlbK / uAlbE, vec3( 0.92 ) );
        }`,
      );
  };
  m.customProgramCacheKey = () => 'albedoMap';
  return m;
}
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  return '#' + c.offsetHSL(0, 0, k).getHexString();
};

// wood: long grain along u (the texture's x), for boards, legs, cabinet fronts. One tile is 0.6 m of wood.
export const WOOD_TILE = 0.6;
function woodTex(kind) {
  const base = { oak: 0xc89f72, walnut: 0x7b5640, ash: 0xdcc6a6, teak: 0xa77a52 }[kind] ?? 0xc89f72;
  return canvasTex('wood-' + kind, 512, 512, (g, w, h) => {
    const r = rng(kind.length * 97 + 3);
    g.fillStyle = css(base);
    g.fillRect(0, 0, w, h);
    // broad tone bands
    for (let i = 0; i < 14; i++) {
      const y = r() * h, hh = 10 + r() * 50;
      g.fillStyle = r() < 0.5 ? 'rgba(255,240,220,0.06)' : 'rgba(60,35,15,0.06)';
      g.fillRect(0, y, w, hh);
    }
    // grain lines, gently waving, wrapping seamlessly across the tile
    for (let i = 0; i < 150; i++) {
      const y0 = r() * h, amp = 1 + r() * 4, f = (1 + Math.floor(r() * 3)) * TAU / w, ph = r() * TAU;
      g.strokeStyle = `rgba(${kind === 'walnut' ? '35,20,10' : '90,55,25'},${0.05 + r() * 0.12})`;
      g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * f + ph) * amp;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      if (y0 < 8 || y0 > h - 8) {
        g.save();
        g.translate(0, y0 < 8 ? h : -h);
        g.stroke();
        g.restore();
      }
    }
    // short pores
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(50,30,15,${0.05 + r() * 0.08})`;
      g.fillRect(r() * w, r() * h, 3 + r() * 10, 0.8);
    }
  });
}
// floor boards: planks 0.19 m wide, staggered; one tile is 1.52 m square (8 boards)
export const PLANK_TILE = 1.52;
function planksTex(kind = 'oak') {
  const base = { oak: 0xd2ad84, pale: 0xe3cfb2, walnut: 0x8a6448 }[kind] ?? 0xd2ad84;
  return canvasTex('planks-' + kind, 768, 768, (g, w, h) => {
    const r = rng(11);
    const rows = 8, bw = h / rows;
    g.fillStyle = css(base);
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < rows; row++) {
      let x = -r() * w * 0.6;
      while (x < w) {
        const L = w * (0.45 + r() * 0.5);
        const tone = shade(base, (r() - 0.5) * 0.045);
        const grain = Array.from({ length: 14 }, () => [4 + r() * (bw - 8), 0.04 + r() * 0.09, 0.5 + r() * 1.3, (r() - 0.5) * 6, (r() - 0.5) * 6, (r() - 0.5) * 4]);
        const draw = (ox) => {
          g.fillStyle = tone;
          g.fillRect(x + ox, row * bw, L, bw);
          for (const [dy, a, lw, c1, c2, e] of grain) {
            const yy = row * bw + dy;
            g.strokeStyle = `rgba(110,70,35,${a})`;
            g.lineWidth = lw;
            g.beginPath();
            g.moveTo(x + ox, yy);
            g.bezierCurveTo(x + ox + L * 0.3, yy + c1, x + ox + L * 0.7, yy + c2, x + ox + L, yy + e);
            g.stroke();
          }
          g.fillStyle = 'rgba(70,45,25,0.28)';
          g.fillRect(x + ox, row * bw, 1.5, bw); // end joint
        };
        draw(0);
        if (x + L > w) draw(-w);
        if (x < 0) draw(w);
        x += L;
      }
      g.fillStyle = 'rgba(70,45,25,0.26)';
      g.fillRect(0, row * bw, w, 1.6); // long joint
    }
  });
}
// stone: honed marble (white with soft grey veins) or travertine (warm, with small pores)
function stoneTex(kind = 'marble') {
  return canvasTex('stone-' + kind, 512, 512, (g, w, h) => {
    const r = rng(kind === 'marble' ? 5 : 9);
    if (kind === 'travertine') {
      g.fillStyle = '#e6d9c6';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '200,180,150' : '245,236,222'},0.25)`;
        g.fillRect(0, r() * h, w, 2 + r() * 14);
      }
      for (let i = 0; i < 500; i++) {
        g.fillStyle = 'rgba(150,125,95,0.35)';
        g.fillRect(r() * w, r() * h, 2 + r() * 8, 1 + r() * 1.5);
      }
      return;
    }
    g.fillStyle = kind === 'green' ? '#7f9585' : '#f1eee9';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      g.strokeStyle = kind === 'green' ? `rgba(230,240,232,${0.2 + r() * 0.3})` : `rgba(150,145,140,${0.12 + r() * 0.22})`;
      g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      let x = r() * w, y = r() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        const nx = x + (r() - 0.3) * 160, ny = y + (r() - 0.5) * 120;
        g.quadraticCurveTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 80, nx, ny);
        x = nx;
        y = ny;
      }
      g.stroke();
    }
  });
}
// tiles: small glazed squares (zellige-like) with light grout; colour as on screen
function tileTex(hex = 0xe9e4da, n = 8, key = 'tiles') {
  return canvasTex(key + hex, 512, 512, (g, w, h) => {
    const r = rng(hex & 255);
    g.fillStyle = '#d9d2c6';
    g.fillRect(0, 0, w, h);
    const s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        g.fillStyle = shade(hex, (r() - 0.5) * 0.06);
        g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
        gr.addColorStop(0, 'rgba(255,255,255,0.12)');
        gr.addColorStop(1, 'rgba(0,0,0,0.05)');
        g.fillStyle = gr;
        g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      }
  }, { on: 'left' });
}
function terrazzoTex() {
  return canvasTex('terrazzo', 512, 512, (g, w, h) => {
    const r = rng(77);
    g.fillStyle = '#ebe5dc';
    g.fillRect(0, 0, w, h);
    const chips = ['#d3c4b0', '#dcd2c4', '#b4c2b4', '#cfae98', '#f6f2ec', '#a9a197'];
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = chips[i % chips.length];
      const x = r() * w, y = r() * h, rr = 0.7 + r() * 2.2;
      g.beginPath();
      g.ellipse(x, y, rr, rr * (0.5 + r() * 0.5), r() * 3, 0, TAU);
      g.fill();
    }
  });
}
// a 64 px tile of woven speckle, light and dark threads (CPU pixels, drawn once)
let weave = null;
function weaveTile() {
  if (weave) return weave;
  weave = document.createElement('canvas');
  weave.width = weave.height = 64;
  const g = weave.getContext('2d');
  const im = g.createImageData(64, 64);
  const r = rng(91);
  for (let i = 0; i < 64 * 64; i++) {
    const x = i % 64, y = (i / 64) | 0;
    const thread = (x + (y >> 1)) % 2 ? 1 : -1;
    const v = r() < 0.5 ? 255 : 30;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
    im.data[i * 4 + 3] = Math.round((0.025 + 0.03 * r() + 0.012 * thread) * 255);
  }
  g.putImageData(im, 0, 0);
  return weave;
}
// rugs: the whole rug is one texture (no repeat). style: 'border' | 'stripe' | 'arc' | 'jute' | 'plain'
function rugTex(style, base, accent, key) {
  return canvasTex(`rug-${key ?? style}-${base}-${accent}`, 512, 512, (g, w, h) => {
    const r = rng(base & 1023);
    g.fillStyle = css(base);
    g.fillRect(0, 0, w, h);
    if (style === 'border') {
      g.strokeStyle = css(accent);
      g.lineWidth = 10;
      g.strokeRect(26, 26, w - 52, h - 52);
      g.lineWidth = 3;
      g.strokeRect(46, 46, w - 92, h - 92);
    } else if (style === 'stripe') {
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 2 ? css(accent) : shade(base, -0.03);
        g.globalAlpha = 0.55;
        g.fillRect(0, 40 + i * 48, w, i % 2 ? 6 : 18);
      }
      g.globalAlpha = 1;
    } else if (style === 'arc') {
      g.globalAlpha = 0.85;
      g.fillStyle = css(accent);
      g.beginPath();
      g.arc(w * 0.78, h * 0.85, w * 0.42, 0, TAU);
      g.fill();
      g.fillStyle = shade(base, -0.05);
      g.beginPath();
      g.arc(w * 0.15, h * 0.1, w * 0.3, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = shade(accent, -0.08);
      g.lineWidth = 3;
      g.beginPath();
      g.arc(w * 0.78, h * 0.85, w * 0.5, Math.PI, Math.PI * 1.6);
      g.stroke();
    } else if (style === 'jute') {
      for (let y = 0; y < h; y += 8)
        for (let x = 0; x < w; x += 8) {
          g.fillStyle = (x / 8 + y / 8) % 2 ? shade(base, -0.05) : shade(base, 0.03);
          g.fillRect(x, y, 8, 8);
        }
    }
    // woven speckle (one noise tile, repeated) and a soft edge
    g.fillStyle = g.createPattern(weaveTile(), 'repeat');
    g.fillRect(0, 0, w, h);
    const e = g.createLinearGradient(0, 0, 0, 12);
    g.strokeStyle = 'rgba(40,30,20,0.12)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    void e;
  }, { repeat: false });
}
// prints for the frames: 'botanical' | 'arch' | 'hills' | 'lines' | 'sun' | 'stilllife'
function artTex(kind, on = 'left') {
  return canvasTex('art-' + kind + on, 384, 384, (g, w, h) => {
    const r = rng(kind.length * 31);
    g.fillStyle = '#f4efe6';
    g.fillRect(0, 0, w, h);
    if (kind === 'botanical') {
      g.strokeStyle = '#6f7f5f';
      g.fillStyle = '#8fa07c';
      g.lineWidth = 2.5;
      const stem = (x, y, len, ang, n) => {
        g.beginPath();
        g.moveTo(x, y);
        const ex = x + Math.cos(ang) * len, ey = y - Math.sin(ang) * len;
        g.quadraticCurveTo(x + (ex - x) * 0.4 + 12, y + (ey - y) * 0.5, ex, ey);
        g.stroke();
        for (let i = 1; i <= n; i++) {
          const t = i / (n + 1), px = x + (ex - x) * t, py = y + (ey - y) * t;
          for (const sd of [-1, 1]) {
            g.save();
            g.translate(px, py);
            g.rotate(-ang + sd * 0.9 + Math.PI / 2 - Math.PI / 2);
            g.beginPath();
            g.ellipse(sd * 14, -6, 16, 6, sd * 0.5, 0, TAU);
            g.fill();
            g.restore();
          }
        }
      };
      stem(w * 0.5, h * 0.88, h * 0.62, Math.PI / 2 + 0.08, 7);
      stem(w * 0.47, h * 0.8, h * 0.4, Math.PI / 2 + 0.6, 4);
      stem(w * 0.53, h * 0.75, h * 0.36, Math.PI / 2 - 0.55, 4);
    } else if (kind === 'arch') {
      g.fillStyle = '#e7c9b8';
      g.fillRect(w * 0.18, h * 0.3, w * 0.64, h * 0.6);
      g.beginPath();
      g.arc(w * 0.5, h * 0.3, w * 0.32, Math.PI, 0);
      g.fill();
      g.fillStyle = '#c98f6f';
      g.beginPath();
      g.arc(w * 0.62, h * 0.62, w * 0.12, 0, TAU);
      g.fill();
      g.fillStyle = '#9db3a2';
      g.fillRect(w * 0.18, h * 0.78, w * 0.64, h * 0.12);
    } else if (kind === 'hills') {
      const bands = ['#e9dfcf', '#cdd7c8', '#aebfaf', '#8fa293', '#d9b9a0'];
      bands.forEach((c, i) => {
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(0, h);
        const y0 = h * (0.35 + i * 0.12);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.012 + i * 1.7) * 18 + Math.sin(x * 0.031 + i) * 6);
        g.lineTo(w, h);
        g.fill();
      });
      g.fillStyle = '#e8a77f';
      g.beginPath();
      g.arc(w * 0.7, h * 0.27, w * 0.08, 0, TAU);
      g.fill();
    } else if (kind === 'lines') {
      g.strokeStyle = '#3d3a35';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(w * 0.2, h * 0.75);
      g.bezierCurveTo(w * 0.3, h * 0.2, w * 0.55, h * 0.9, w * 0.62, h * 0.4);
      g.bezierCurveTo(w * 0.67, h * 0.15, w * 0.8, h * 0.3, w * 0.78, h * 0.5);
      g.stroke();
      g.fillStyle = '#d98d68';
      g.beginPath();
      g.arc(w * 0.36, h * 0.35, w * 0.07, 0, TAU);
      g.fill();
    } else if (kind === 'sun') {
      g.fillStyle = '#efe3d0';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#d9a17c';
      g.beginPath();
      g.arc(w * 0.5, h * 0.55, w * 0.26, Math.PI, 0);
      g.fill();
      g.fillStyle = '#b8c4b3';
      g.fillRect(0, h * 0.55, w, h * 0.45);
      g.fillStyle = '#9fb0a0';
      g.fillRect(0, h * 0.7, w, h * 0.3);
    } else {
      // still life: a jug, a bowl, a pear
      g.fillStyle = '#ebe2d4';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#d7c7b0';
      g.fillRect(0, h * 0.68, w, h * 0.32);
      g.fillStyle = '#7f927f';
      g.beginPath();
      g.ellipse(w * 0.38, h * 0.52, w * 0.12, h * 0.2, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#c9805e';
      g.beginPath();
      g.ellipse(w * 0.64, h * 0.64, w * 0.13, h * 0.06, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#d8b25a';
      g.beginPath();
      g.ellipse(w * 0.55, h * 0.6, w * 0.045, h * 0.06, 0.3, 0, TAU);
      g.fill();
    }
    void r;
  }, { on, repeat: false });
}

// uv for a box-like part from its own vertices (metres): u along the longest axis (the grain), v across
export function grainUV(geo, tile = WOOD_TILE) {
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const ext = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  const long = ext.indexOf(Math.max(...ext));
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  const r = (Math.abs(b.min.x * 7.1 + b.min.z * 3.3 + b.min.y * 1.7) % 1) * 0.7; // offset: neighbours do not repeat
  for (let i = 0; i < p.count; i++) {
    const c = [p.getX(i), p.getY(i), p.getZ(i)];
    const nn = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
    const ax = nn.indexOf(Math.max(...nn)); // the face's axis
    let ua = long === ax ? (long + 1) % 3 : long;
    let va = [0, 1, 2].find((k) => k !== ax && k !== ua);
    uv[i * 2] = c[ua] / tile + r;
    uv[i * 2 + 1] = c[va] / tile + r * 0.37;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
// a wooden box part (metres) with the grain along its length; r rounds the edges
export function wbox(mat, w, h, d, x = 0, y = 0, z = 0, r = 0.004) {
  const key = `wb${w.toFixed(4)},${h.toFixed(4)},${d.toFixed(4)},${r}`;
  const geo = shared(key, () => grainUV(r > 0 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(r, Math.min(w, h, d) / 2 - 0.0005)) : new THREE.BoxGeometry(w, h, d)));
  const m = mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  return m;
}
export function wcyl(mat, rTop, rBot, h, x = 0, y = 0, z = 0, seg = 12) {
  const geo = shared(`wc${rTop},${rBot},${h},${seg}`, () => {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * (h / WOOD_TILE), uv.getX(i) * 0.15);
    return g;
  });
  const m = mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  return m;
}
// a flat extruded shape (a table top, a shelf), lying flat from y to y + t, outline from a THREE.Shape in x / z (metres)
export function slab(mat, shape, t, y = 0, bevel = 0.004, wood = true) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 28 });
  geo.rotateX(Math.PI / 2); // shape x -> x, shape y -> z; extrusion -> -y
  geo.translate(0, t - bevel, 0);
  if (wood) grainUV(geo);
  const m = mesh(geo, mat);
  m.position.y = y;
  return m;
}
export const stadium = (len, wid) => {
  const s = new THREE.Shape();
  const r = wid / 2, h = len / 2 - r;
  s.absarc(h, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(-h, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  return s;
};
export const roundRect = (w, d, r) => {
  const s = new THREE.Shape();
  const x = -w / 2, z = -d / 2;
  s.moveTo(x + r, z);
  s.lineTo(x + w - r, z);
  s.quadraticCurveTo(x + w, z, x + w, z + r);
  s.lineTo(x + w, z + d - r);
  s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
  s.lineTo(x + r, z + d);
  s.quadraticCurveTo(x, z + d, x, z + d - r);
  s.lineTo(x, z + r);
  s.quadraticCurveTo(x, z, x + r, z);
  return s;
};
export const circle = (r) => {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  return s;
};

// ── materials ────────────────────────────────────────────────────────────────
// Added to M (kit.js makeMaterials('day')) once per boot. Fabrics, ceramics, metals and paints are plain colours (bake
// merges them); wood, floors, stone, rugs and prints carry canvas textures.
export function propMaterials(M) {
  texCache.clear();
  const wood = (kind) => texMat(woodTex(kind), { roughness: 0.62 });
  Object.assign(M, {
    oak: wood('oak'),
    walnut: wood('walnut'),
    ash: wood('ash'),
    teak: wood('teak'),
    // fabrics
    linen: dayMat(0xece5d8, 'top', { roughness: 0.95 }),
    oat: dayMat(0xdccfb9, 'top', { roughness: 0.95 }),
    sage: dayMat(0xa3b8a3, 'top', { roughness: 0.95 }),
    sageDeep: dayMat(0x7f9a84, 'top', { roughness: 0.95 }),
    boucle: dayMat(0xf1ece2, 'top', { roughness: 1 }),
    rust: dayMat(0xc5784f, 'top', { roughness: 0.95 }),
    // the soft terracotta of the Blender carousel's cushions (the living room's sofa: rust read #562818 there)
    clayFab: dayMat(0xd18e74, 0.55, { roughness: 0.95 }),
    ochre: dayMat(0xd6aa62, 'top', { roughness: 0.95 }),
    blushFab: dayMat(0xe6c3b4, 'top', { roughness: 0.95 }),
    charcoalFab: dayMat(0x6b6a66, 'top', { roughness: 0.95 }),
    leather: dayMat(0xa8724b, 'top', { roughness: 0.55 }),
    sheet: dayMat(0xf6f3ee, 'top', { roughness: 0.95 }),
    // ceramics and glass
    ceramic: dayMat(0xf4f1ec, 'top', { roughness: 0.32 }),
    ceramicSand: dayMat(0xe2d3bd, 'top', { roughness: 0.4 }),
    ceramicSage: dayMat(0xa9bba9, 'top', { roughness: 0.35 }),
    ceramicBlue: dayMat(0x9fb3bf, 'top', { roughness: 0.35 }),
    ceramicDark: dayMat(0x55504a, 'top', { roughness: 0.45 }),
    stoneware: dayMat(0xcbb79f, 'top', { roughness: 0.75 }),
    terracotta: dayMat(0xcf8a64, 'top', { roughness: 0.85 }),
    glassGreen: dayMat(0x8fa491, 'top', { roughness: 0.15 }),
    glassAmber: dayMat(0xc19a64, 'top', { roughness: 0.15 }),
    // metals (no environment to reflect, so they are dielectric-looking with a tight highlight)
    black: dayMat(0x3b3936, 'top', { roughness: 0.42 }),
    brass: dayMat(0xc9a26a, 'top', { roughness: 0.3, metalness: 0.25 }),
    steel: dayMat(0xc6c4bf, 'top', { roughness: 0.3, metalness: 0.2 }),
    // paints and plasters (their colour as on a wall in open light)
    paintWhite: dayMat(0xf6f2ea, 'top', { roughness: 0.85 }),
    // the living room's and the bedroom's walls: painted for 48% of a sunlit top's light, not 62%, so the walls turned
    // from the sun read a light blush in shade (about #d6ab9d..#dcb2a4, assets/ref-room.jpg) and not a dusty terracotta
    // (the bedroom's rose also a step lighter, 0xe6c3b6 -> 0xedd0c3: its window wall read #b08074)
    plasterBlush: dayMat(0xedd3c6, 0.48, { roughness: 0.97 }),
    plasterSand: dayMat(0xeee2cf, 0.62, { roughness: 0.97 }),
    plasterSage: dayMat(0xd4ddd2, 0.62, { roughness: 0.97 }),
    plasterRose: dayMat(0xedd0c3, 0.48, { roughness: 0.97 }),
    plasterWhite: dayMat(0xf3efe7, 0.62, { roughness: 0.97 }),
    cabSage: dayMat(0x9fb29f, 'top', { roughness: 0.6 }),
    cabCream: dayMat(0xece5d8, 'top', { roughness: 0.6 }),
    paper: dayMat(0xf3eee2, 'top', { roughness: 0.9 }),
    soil: dayMat(0x5a4636, 'top', { roughness: 1 }),
    mirrorGlass: dayMat(0xdbe3e2, 'left', { roughness: 0.08 }),
    water: dayMat(0xd7e3e0, 'top', { roughness: 0.05 }),
    // textured
    marble: texMat(stoneTex('marble'), { roughness: 0.3 }),
    travertine: texMat(stoneTex('travertine'), { roughness: 0.7 }),
    terrazzo: texMat(terrazzoTex(), { roughness: 0.5 }),
    floorOak: texMat(planksTex('oak'), { roughness: 0.55 }),
    floorPale: texMat(planksTex('pale'), { roughness: 0.55 }),
    tileWhite: texMat(tileTex(0xeee9df, 8, 'tw'), { roughness: 0.25 }),
    tileSage: texMat(tileTex(0xb7c6b4, 8, 'ts'), { roughness: 0.25 }),
    // vertex-coloured: leaves and petals (both sides lit), and anything else built with VC
    foliage: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
    vc: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8 }),
    // a lit lamp shade: linen that glows a little from inside
    shade: dayMat(0xf3ebdc, 'top', { roughness: 0.9, emissive: 0xffe2b8, emissiveIntensity: 0.18 }),
  });
  // plant colours: albedo (linear) for leaves; vertex colours multiply a white material
  M.leafCol = {
    deep: paint(0x4f6e45, 0.7),
    mid: paint(0x6f8f5a, 0.7),
    light: paint(0x9ab877, 0.7),
    olive: paint(0x8a9a7a, 0.7),
    oliveLight: paint(0xb3bea3, 0.7),
    snake: paint(0x5e7a52, 0.7),
    snakeEdge: paint(0xc9c58a, 0.7),
    stem: paint(0x6f7a50, 0.7),
    bark: paint(0x8a7560, 0.7),
    twig: paint(0x6e5a48, 0.7),
  };
  M.petalCol = {
    white: paint(0xf7f3ec, 0.75),
    cream: paint(0xf3e6cf, 0.75),
    blush: paint(0xf0c8bb, 0.75),
    peach: paint(0xf2b495, 0.75),
    coral: paint(0xe98b6f, 0.75),
    butter: paint(0xf2da8a, 0.75),
    lilac: paint(0xc9b8d6, 0.75),
    centre: paint(0xb98f45, 0.75),
  };
  M.rugMat = (style, base, accent, key) => texMat(rugTex(style, base, accent, key), { roughness: 1 });
  M.artMat = (kind, on = 'left') => texMat(artTex(kind, on), { roughness: 0.85 });
  return M;
}

// ═════════════════════════════════════════════════════════════════════════════
// PROPS (metres; front +Z; standing on y = 0)
// ═════════════════════════════════════════════════════════════════════════════

// ── seating ─────────────────────────────────────────────────────────────────
// A low modern sofa: upholstered base and arms, separate seat cushions (the gaps read as seams), leaning back cushions,
// a few throw pillows, tapered wooden legs. len 2.0..3.0 m.
export function sofa(M, { len = 2.3, depth = 0.95, fabric, pillows, legs, throwOn = false, ...at } = {}) {
  const g = new THREE.Group();
  const F = fabric ?? M.sage, W = legs ?? M.oak;
  const legH = 0.1, baseH = 0.2, armW = 0.17, armH = 0.6;
  const inner = len - 2 * armW;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(wcyl(W, 0.018, 0.024, legH, sx * (len / 2 - 0.09), 0, sz * (depth / 2 - 0.09), 10));
  g.add(softBox(F, len - 0.02, baseH, depth - 0.02, 0, legH, 0, 0.05, 0));
  for (const sx of [-1, 1]) g.add(softBox(F, armW, armH - legH, depth, sx * (len / 2 - armW / 2), legH, 0, 0.06, 0.015));
  g.add(softBox(F, inner + 0.02, 0.44, 0.2, 0, legH + baseH - 0.02, -depth / 2 + 0.1, 0.06, 0.01)); // back frame
  const n = inner > 1.7 ? 3 : 2;
  const cw = inner / n;
  for (let i = 0; i < n; i++) {
    const cx = -inner / 2 + cw * (i + 0.5);
    g.add(softBox(F, cw - 0.012, 0.15, depth - 0.24, cx, legH + baseH, 0.1, 0.05, 0.025)); // seat cushion
    g.add(pillow(F, cw - 0.03, 0.46, 0.2, { x: cx, y: legH + baseH + 0.15 + 0.22, z: -depth / 2 + 0.25, tilt: -0.16 })); // back cushion
  }
  const pl = pillows ?? [M.linen, M.rust, M.oat];
  const spots = [
    [-inner / 2 + 0.24, 0.12, 0.25],
    [-inner / 2 + 0.6, -0.08, -0.15],
    [inner / 2 - 0.26, -0.1, 0.2],
  ];
  pl.forEach((mat, i) => {
    if (!mat || !spots[i]) return;
    const [px, yaw, roll] = spots[i];
    g.add(pillow(mat, 0.46, 0.46, 0.15, { x: px, y: legH + baseH + 0.15 + 0.22, z: -depth / 2 + 0.38, tilt: -0.28, yaw, roll }));
  });
  if (throwOn) {
    // a throw folded over the left arm: over its top and down its outer side
    const T = typeof throwOn === 'object' ? throwOn : M.oat;
    const ax = -len / 2 + armW / 2;
    g.add(box(T, armW + 0.06, 0.025, 0.5, ax, armH, 0.08, 0.01));
    g.add(box(T, 0.025, 0.42, 0.5, ax - armW / 2 - 0.035, armH - 0.42, 0.08, 0.01));
  }
  return place(g, at);
}

// A lounge chair: an oak frame (legs, arm rails) with a linen seat and a reclined back cushion.
export function loungeChair(M, { fabric, wood, ...at } = {}) {
  const g = new THREE.Group();
  const F = fabric ?? M.linen, W = wood ?? M.oak;
  const w = 0.72, d = 0.76;
  for (const sx of [-1, 1]) {
    g.add(wbox(W, 0.04, 0.56, 0.045, sx * (w / 2 - 0.03), 0, d / 2 - 0.06)); // front leg
    g.add(wbox(W, 0.04, 0.56, 0.045, sx * (w / 2 - 0.03), 0, -d / 2 + 0.08)); // back leg
    g.add(wbox(W, 0.07, 0.03, d + 0.02, sx * (w / 2 - 0.03), 0.56, 0, 0.01)); // arm rail
    g.add(wbox(W, 0.03, 0.05, d - 0.1, sx * (w / 2 - 0.03), 0.22, 0)); // side stretcher
  }
  g.add(wbox(W, w - 0.08, 0.05, 0.04, 0, 0.26, d / 2 - 0.06));
  g.add(softBox(F, w - 0.1, 0.13, d - 0.14, 0, 0.28, 0.04, 0.045, 0.02));
  const back = pillow(F, w - 0.12, 0.56, 0.16, { x: 0, y: 0.68, z: -d / 2 + 0.12, tilt: -0.3 });
  g.add(back);
  return place(g, at);
}

// A soft rounded armchair (bouclé): a wide tub seat with a low curved back.
export function armchair(M, { fabric, legs, ...at } = {}) {
  const g = new THREE.Group();
  const F = fabric ?? M.boucle;
  const L = legs ?? M.oak;
  const w = 0.86, d = 0.82;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(wcyl(L, 0.016, 0.02, 0.08, sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1), 8));
  g.add(softBox(F, w, 0.3, d, 0, 0.08, 0, 0.1, 0)); // base
  for (const sx of [-1, 1]) g.add(softBox(F, 0.17, 0.32, d, sx * (w / 2 - 0.085), 0.36, 0, 0.08, 0.02)); // arms
  g.add(softBox(F, w - 0.06, 0.4, 0.2, 0, 0.36, -d / 2 + 0.1, 0.09, 0.02)); // back
  g.add(softBox(F, w - 0.36, 0.13, d - 0.24, 0, 0.36, 0.08, 0.06, 0.03)); // seat cushion
  g.add(pillow(M.oat, 0.42, 0.32, 0.13, { x: 0, y: 0.62, z: -d / 2 + 0.26, tilt: -0.3 }));
  return place(g, at);
}
export function tubChair(M, { fabric, legs, ...at } = {}) {
  const g = new THREE.Group();
  const F = fabric ?? M.boucle;
  g.add(lathe(F, [[0.001, 0.08], [0.36, 0.08], [0.42, 0.12], [0.44, 0.24], [0.42, 0.38], [0.38, 0.42], [0.001, 0.42]], 32));
  // the back: a thick curved band round the rear half
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.44, Math.PI * 0.05, Math.PI * 0.95, false);
  s.absarc(0, 0, 0.3, Math.PI * 0.95, Math.PI * 0.05, true);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  const b = mesh(geo, F);
  b.position.set(0, 0.4, 0.02);
  g.add(b);
  g.add(pillow(F, 0.5, 0.12, 0.12, { x: 0, y: 0.47, z: 0.05, tilt: -Math.PI / 2 }));
  const L = legs ?? M.oak;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    g.add(wcyl(L, 0.018, 0.02, 0.09, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 8));
  }
  return place(g, at);
}

// Dining chair: an oak frame with a curved top rail, spindles and a woven (paper cord) seat. Faces +Z.
export function diningChair(M, { wood, seat, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak, S = seat ?? M.oat;
  const w = 0.5, d = 0.48, sh = 0.45;
  for (const sx of [-1, 1]) {
    g.add(wcyl(W, 0.016, 0.019, sh, sx * (w / 2 - 0.03), 0, d / 2 - 0.04, 10)); // front legs
    g.add(rod(W, new V3(sx * (w / 2 - 0.03), 0, -d / 2 + 0.04), new V3(sx * (w / 2 - 0.04), 0.78, -d / 2 + 0.01), 0.019, 0.015, 8)); // back legs
  }
  g.add(wbox(W, w - 0.02, 0.035, d - 0.02, 0, sh - 0.035, 0, 0.006)); // seat frame
  g.add(softBox(S, w - 0.07, 0.03, d - 0.08, 0, sh, 0.005, 0.012, 0.008)); // woven seat
  // curved top rail and two spindles
  const rail = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 8));
    rail.push(new V3(Math.cos(a) * -(w / 2 - 0.035) / Math.cos(Math.PI * 0.15), 0.74, -d / 2 + 0.01 - Math.sin(a) * 0.05 + 0.03));
  }
  g.add(tube(W, rail, 0.016, 6, 10));
  for (const sx of [-0.06, 0.06]) g.add(rod(W, new V3(sx, sh, -d / 2 + 0.04), new V3(sx, 0.74, -d / 2 + 0.0), 0.009, 0.009, 6));
  for (const sz of [-1, 1]) g.add(wbox(W, w - 0.08, 0.02, 0.02, 0, 0.14, sz * (d / 2 - 0.05))); // stretchers
  return place(g, at);
}

// Counter stool: four oak legs with a foot ring, a round upholstered seat. h: seat height (0.65 for a 0.9 m counter)
export function barStool(M, { wood, seat, h = 0.65, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak, S = seat ?? M.leather;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    g.add(rod(W, new V3(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2), new V3(Math.cos(a) * 0.15, h - 0.03, Math.sin(a) * 0.15), 0.016, 0.014, 8));
  }
  const ring = mesh(shared('stoolring', () => new THREE.TorusGeometry(0.17, 0.009, 6, 28)), M.brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.24;
  g.add(ring);
  g.add(wcyl(W, 0.18, 0.18, 0.03, 0, h - 0.04, 0, 24));
  g.add(lathe(S, [[0.001, h - 0.01], [0.18, h - 0.01], [0.19, h + 0.02], [0.17, h + 0.05], [0.001, h + 0.055]], 24));
  return place(g, at);
}

// Bench (foot of a bed, a hall): an oak frame and a soft seat
export function bench(M, { len = 1.4, d = 0.42, h = 0.45, wood, fabric, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak, F = fabric ?? M.boucle;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(wbox(W, 0.04, h - 0.1, 0.04, sx * (len / 2 - 0.05), 0, sz * (d / 2 - 0.05)));
  g.add(wbox(W, len, 0.04, d, 0, h - 0.12, 0, 0.006));
  g.add(softBox(F, len - 0.02, 0.1, d - 0.02, 0, h - 0.09, 0, 0.04, 0.02));
  return place(g, at);
}

// ── tables and storage ───────────────────────────────────────────────────────
// Coffee table: an oval oak top on four tapered legs with a lower shelf
export function coffeeTable(M, { len = 1.2, wid = 0.62, h = 0.4, wood, shelf, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak;
  g.add(slab(W, stadium(len, wid), 0.032, h - 0.032, 0.006));
  g.add(slab(shelf ?? W, stadium(len - 0.16, wid - 0.12), 0.02, 0.12, 0.004));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(wcyl(W, 0.018, 0.014, h - 0.032, sx * (len / 2 - 0.2), 0, sz * (wid / 2 - 0.12), 10));
  return place(g, at);
}
// Round pedestal table in stone (a coffee or side table): travertine or marble
export function pedestalTable(M, { r = 0.4, h = 0.38, mat, ...at } = {}) {
  const g = new THREE.Group();
  const S = mat ?? M.travertine;
  g.add(lathe(S, [[0.001, 0], [r * 0.55, 0], [r * 0.5, 0.03], [r * 0.42, h - 0.04], [r, h - 0.04], [r, h], [0.001, h]], 36));
  return place(g, at);
}
// Side table: two round oak tiers on three legs
export function sideTable(M, { r = 0.22, h = 0.55, wood, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak;
  g.add(slab(W, circle(r), 0.025, h - 0.025, 0.004));
  g.add(slab(W, circle(r - 0.02), 0.02, 0.16, 0.003));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    g.add(wcyl(W, 0.012, 0.012, h - 0.025, Math.cos(a) * (r - 0.05), 0, Math.sin(a) * (r - 0.05), 8));
  }
  return place(g, at);
}
// Dining table: a rounded-rectangle (or oval) oak top, a slim apron and four square tapered legs
export function diningTable(M, { len = 1.8, wid = 0.9, h = 0.75, oval = false, wood, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak;
  g.add(slab(W, oval ? stadium(len, wid) : roundRect(len, wid, 0.06), 0.035, h - 0.035, 0.006));
  g.add(wbox(W, len - 0.34, 0.07, 0.025, 0, h - 0.105, wid / 2 - 0.17));
  g.add(wbox(W, len - 0.34, 0.07, 0.025, 0, h - 0.105, -wid / 2 + 0.17));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(rod(W, new V3(sx * (len / 2 - 0.2), 0, sz * (wid / 2 - 0.15)), new V3(sx * (len / 2 - 0.17), h - 0.035, sz * (wid / 2 - 0.13)), 0.022, 0.03, 8));
  return place(g, at);
}
// Desk: an oak top on two trestle frames, with a slim drawer
export function desk(M, { len = 1.4, wid = 0.65, h = 0.74, wood, frame, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak, Fr = frame ?? M.black;
  g.add(wbox(W, len, 0.03, wid, 0, h - 0.03, 0, 0.005));
  for (const sx of [-1, 1]) {
    g.add(box(Fr, 0.025, h - 0.03, 0.025, sx * (len / 2 - 0.08), 0, wid / 2 - 0.06));
    g.add(box(Fr, 0.025, h - 0.03, 0.025, sx * (len / 2 - 0.08), 0, -wid / 2 + 0.06));
    g.add(box(Fr, 0.025, 0.025, wid - 0.1, sx * (len / 2 - 0.08), h - 0.055, 0));
  }
  g.add(wbox(W, len * 0.4, 0.07, wid - 0.1, len * 0.22, h - 0.1, 0));
  g.add(box(M.brass, 0.08, 0.012, 0.012, len * 0.22, h - 0.07, wid / 2 - 0.045));
  return place(g, at);
}
// Desk chair: a moulded shell (bent plywood look) on four oak legs
export function deskChair(M, { shell, wood, ...at } = {}) {
  const g = new THREE.Group();
  const S = shell ?? M.oak, W = wood ?? M.oak;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(rod(W, new V3(sx * 0.2, 0, sz * 0.2), new V3(sx * 0.15, 0.42, sz * 0.15), 0.014, 0.012, 8));
  g.add(softBox(M.linen, 0.44, 0.05, 0.42, 0, 0.42, 0.02, 0.02, 0.012));
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.24, Math.PI * 0.08, Math.PI * 0.92, false);
  s.absarc(0, 0, 0.215, Math.PI * 0.92, Math.PI * 0.08, true);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 18 });
  geo.rotateX(-Math.PI / 2);
  grainUV(geo);
  const b = mesh(geo, S);
  b.position.set(0, 0.46, 0.04);
  g.add(b);
  return place(g, at);
}
// Sideboard / media console: a walnut (or oak) body on slim legs, three doors and one open cubby with brass pulls.
// fill(g, top) gets a group in sideboard space to dress the top (y = top) and the cubby.
export function sideboard(M, { len = 1.8, d = 0.45, h = 0.62, wood, legs, cubby = 'left', ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.walnut, L = legs ?? M.black;
  const legH = 0.16, bodyH = h - legH;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cylinder(L, 0.012, 0.012, legH, sx * (len / 2 - 0.08), 0, sz * (d / 2 - 0.07), 8));
  g.add(wbox(W, len, 0.025, d, 0, h - 0.025, 0, 0.004)); // top
  g.add(wbox(W, len, 0.025, d, 0, legH, 0, 0.003)); // bottom
  for (const sx of [-1, 1]) g.add(wbox(W, 0.025, bodyH - 0.05, d, sx * (len / 2 - 0.0125), legH + 0.025, 0)); // ends
  g.add(box(W, len - 0.05, bodyH - 0.05, 0.015, 0, legH + 0.025, -d / 2 + 0.01)); // back
  const n = 4, cw = (len - 0.05) / n;
  const open = cubby === 'left' ? 0 : cubby === 'right' ? n - 1 : -1;
  for (let i = 0; i < n; i++) {
    const cx = -len / 2 + 0.025 + cw * (i + 0.5);
    if (i === open) {
      g.add(box(M.ceramicDark, cw - 0.01, bodyH - 0.06, 0.01, cx, legH + 0.03, -d / 2 + 0.02)); // shadowed back of the cubby
      g.add(wbox(W, cw - 0.01, 0.018, d - 0.04, cx, legH + 0.025 + (bodyH - 0.05) / 2, 0)); // its shelf
      continue;
    }
    g.add(wbox(W, cw - 0.008, bodyH - 0.058, 0.02, cx, legH + 0.029, d / 2 - 0.012, 0.002)); // door
    g.add(cylinder(M.brass, 0.008, 0.008, 0.07, cx + (i % 2 ? -1 : 1) * (cw / 2 - 0.04), legH + bodyH / 2 - 0.035, d / 2 + 0.004, 8)); // pull
  }
  if (open >= 0) g.userData.cubby = { x: -len / 2 + 0.025 + cw * (open + 0.5), y0: legH + 0.025, y1: legH + 0.025 + (bodyH - 0.05) / 2 + 0.018, w: cw, d };
  g.userData.top = h;
  return place(g, at);
}
// Wall shelves: oak boards on a slim black frame hung on a wall (the wall is behind, at z = 0; boards toward +Z).
// rows: heights of the boards above y = 0 (the bottom of the unit)
export function wallShelf(M, { len = 0.9, d = 0.22, rows = [0, 0.36, 0.72], wood, frame, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak, Fr = frame ?? M.black;
  const top = rows[rows.length - 1];
  for (const sx of [-1, 1]) {
    g.add(box(Fr, 0.012, top + 0.02, 0.012, sx * (len / 2 - 0.03), -0.01, d - 0.02));
    for (const y of rows) g.add(box(Fr, 0.012, 0.012, d - 0.01, sx * (len / 2 - 0.03), y - 0.012, d / 2));
  }
  for (const y of rows) g.add(wbox(W, len, 0.024, d, 0, y, d / 2, 0.003));
  g.userData.rows = rows;
  return place(g, at);
}
// Open bookcase (built-in look): an oak carcass with shelves; open toward +Z
export function bookcase(M, { len = 1.6, h = 2.0, d = 0.32, shelves = 5, wood, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak;
  const t = 0.025;
  g.add(box(M.plasterWhite, len - 2 * t, h - 2 * t, 0.012, 0, t, -d / 2 + 0.006));
  for (const sx of [-1, 1]) g.add(wbox(W, t, h, d, sx * (len / 2 - t / 2), 0, 0));
  const ys = [];
  for (let i = 0; i <= shelves; i++) {
    const y = i === shelves ? h - t : (i * (h - t)) / shelves;
    g.add(wbox(W, len - 2 * t, t, d, 0, y, 0));
    ys.push(y + t);
  }
  g.userData.rows = ys.slice(0, -1);
  return place(g, at);
}

// ── kitchen ──────────────────────────────────────────────────────────────────
// A run of base cabinets against a wall (back at -Z): toe kick, doors with slim pulls, a stone worktop with a
// sink and a brass faucet, an induction hob. len along x; sinkAt / hobAt: x of their centres (null leaves them out).
export function kitchenRun(M, { len = 2.6, d = 0.62, h = 0.9, front, top, sinkAt = -0.5, hobAt = 0.7, ...at } = {}) {
  const g = new THREE.Group();
  const Fr = front ?? M.cabSage, T = top ?? M.marble;
  g.add(box(M.ceramicDark, len - 0.02, 0.1, d - 0.08, 0, 0, -0.04)); // toe kick
  g.add(box(Fr, len, h - 0.13, d - 0.04, 0, 0.1, -0.02, 0)); // carcass
  const n = Math.max(2, Math.round(len / 0.6));
  const dw = len / n;
  for (let i = 0; i < n; i++) {
    const cx = -len / 2 + dw * (i + 0.5);
    g.add(box(Fr, dw - 0.006, h - 0.15, 0.02, cx, 0.11, d / 2 - 0.03, 0.003)); // door front
    g.add(box(M.brass, 0.12, 0.012, 0.016, cx, h - 0.12, d / 2 - 0.012, 0.004)); // pull
  }
  g.add(slab(T, roundRect(len + 0.02, d + 0.02, 0.006), 0.03, h - 0.03, 0.003, false));
  stoneUV(g.children[g.children.length - 1].geometry);
  if (sinkAt != null) {
    g.add(box(M.steel, 0.5, 0.012, 0.38, sinkAt, h - 0.008, 0.02, 0.01));
    g.add(box(M.ceramicDark, 0.46, 0.006, 0.34, sinkAt, h + 0.002, 0.02, 0)); // the basin's dark inside, seen from above
    g.add(faucet(M, { x: sinkAt, y: h, z: -d / 2 + 0.08 }));
  }
  if (hobAt != null) {
    g.add(box(M.ceramicDark, 0.58, 0.008, 0.5, hobAt, h, 0.02, 0.01));
    for (const [hx, hz, r] of [[-0.14, -0.1, 0.09], [0.14, -0.1, 0.07], [-0.14, 0.12, 0.07], [0.14, 0.12, 0.09]]) {
      const ringM = mesh(shared(`hob${r}`, () => new THREE.RingGeometry(r - 0.006, r, 24)), M.black, false, true);
      ringM.rotation.x = -Math.PI / 2;
      ringM.position.set(hobAt + hx, h + 0.009, 0.02 + hz);
      g.add(ringM);
    }
  }
  g.userData.top = h;
  return place(g, at);
}
function stoneUV(geo, tile = 0.9) {
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / tile;
    uv[i * 2 + 1] = (p.getZ(i) + p.getY(i)) / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
export function faucet(M, { mat, ...at } = {}) {
  const g = new THREE.Group();
  const B = mat ?? M.brass;
  g.add(cylinder(B, 0.022, 0.026, 0.04, 0, 0, 0, 12));
  g.add(tube(B, [[0, 0.03, 0], [0, 0.26, 0], [0, 0.33, 0.06], [0, 0.29, 0.17], [0, 0.24, 0.19]], 0.011, 8, 14));
  g.add(cylinder(B, 0.006, 0.006, 0.06, 0.05, 0.03, 0, 6));
  return place(g, at);
}
// A tall unit (pantry, integrated fridge): oak doors full height, slim recessed pulls
export function tallUnit(M, { len = 0.65, d = 0.62, h = 2.3, front, doors = 1, ...at } = {}) {
  const g = new THREE.Group();
  const Fr = front ?? M.oak;
  g.add(box(M.ceramicDark, len - 0.02, 0.1, d - 0.08, 0, 0, -0.04));
  g.add(wbox(Fr, len, h - 0.1, d - 0.04, 0, 0.1, -0.02, 0.002));
  const dw = len / doors;
  for (let i = 0; i < doors; i++) {
    const cx = -len / 2 + dw * (i + 0.5);
    g.add(wbox(Fr, dw - 0.006, h - 0.13, 0.02, cx, 0.11, d / 2 - 0.03, 0.002));
    g.add(box(M.brass, 0.012, 0.32, 0.016, cx + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), 1.0, d / 2 - 0.012, 0.004));
  }
  return place(g, at);
}
// Island: a cabinet block with a stone top overhanging the seating side (+Z)
export function island(M, { len = 1.9, d = 0.85, h = 0.9, front, top, ...at } = {}) {
  const g = new THREE.Group();
  const Fr = front ?? M.oak, T = top ?? M.marble;
  g.add(box(M.ceramicDark, len - 0.1, 0.1, d - 0.3, 0, 0, -0.1));
  g.add(wbox(Fr, len - 0.04, h - 0.13, d - 0.25, 0, 0.1, -0.11, 0.004));
  // vertical fluting on the seating side
  for (let x = -len / 2 + 0.06; x < len / 2 - 0.04; x += 0.045) g.add(wcyl(Fr, 0.016, 0.016, h - 0.15, x, 0.11, d / 2 - 0.25 + 0.02, 8));
  const s = slab(T, roundRect(len, d, 0.02), 0.04, h - 0.04, 0.004, false);
  stoneUV(s.geometry);
  g.add(s);
  return place(g, at);
}
// Open shelf for the kitchen wall (wall at z = 0): one thick oak board on hidden brackets
export function floatShelf(M, { len = 1.2, d = 0.24, t = 0.045, wood, ...at } = {}) {
  const g = new THREE.Group();
  g.add(wbox(wood ?? M.oak, len, t, d, 0, 0, d / 2, 0.004));
  return place(g, at);
}
// Range hood clad in plaster (wall at z = 0): a tapering box
export function hood(M, { w = 0.8, d = 0.5, h = 0.75, mat, ...at } = {}) {
  const g = new THREE.Group();
  const P = mat ?? M.plasterSand;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w * 0.32, h);
  s.lineTo(-w * 0.32, h);
  s.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
  g.add(mesh(geo, P));
  g.add(box(P, w + 0.03, 0.06, d + 0.03, 0, -0.06, d / 2));
  return place(g, at);
}

// ── beds ─────────────────────────────────────────────────────────────────────
// A bed (head toward -Z): a wooden base, an upholstered headboard with vertical channels, mattress, duvet folded back
// at the head, sleeping and euro pillows, a lumbar cushion, a knitted throw over the foot.
export function bed(M, { w = 1.8, l = 2.1, wood, head, duvet, throwMat, accent, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.oak, Hd = head ?? M.sage, D = duvet ?? M.sheet;
  const baseH = 0.3;
  g.add(wbox(W, w + 0.06, baseH - 0.08, l + 0.04, 0, 0.08, 0.02, 0.01)); // base
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(M.black, 0.05, 0.08, 0.05, sx * (w / 2 - 0.08), 0, sz * (l / 2 - 0.1)));
  // headboard: channels (vertical soft tubes side by side) on a wooden back
  const hbH = 1.05, ch = 7;
  g.add(wbox(W, w + 0.12, hbH + 0.06, 0.06, 0, 0.0, -l / 2 - 0.05, 0.01));
  for (let i = 0; i < ch; i++) {
    const cw = (w + 0.04) / ch;
    g.add(softBox(Hd, cw - 0.006, hbH - 0.06, 0.09, -(w + 0.04) / 2 + cw * (i + 0.5), 0.06 + 0.0, -l / 2 + 0.02, 0.04, 0));
  }
  g.add(softBox(M.sheet, w - 0.02, 0.22, l - 0.06, 0, baseH, 0.01, 0.05, 0.01)); // mattress
  // duvet: covers the mattress from the foot to 0.45 m short of the head, hangs over the sides, folded back
  const dl = l - 0.48;
  g.add(softBox(D, w + 0.12, 0.08, dl, 0, baseH + 0.2, l / 2 - dl / 2 + 0.03, 0.04, 0.03));
  for (const sx of [-1, 1]) g.add(box(D, 0.035, 0.3, dl, sx * (w / 2 + 0.045), baseH - 0.05, l / 2 - dl / 2 + 0.03, 0.015)); // side drape
  g.add(box(D, w + 0.12, 0.3, 0.035, 0, baseH - 0.05, l / 2 + 0.045, 0.015)); // foot drape
  g.add(softBox(D, w + 0.12, 0.07, 0.34, 0, baseH + 0.26, l / 2 - dl + 0.2, 0.035, 0.02)); // the fold
  // pillows: two euro squares against the headboard, two sleeping pillows in front, one lumbar
  for (const sx of [-1, 1]) {
    g.add(pillow(M.linen, 0.62, 0.62, 0.18, { x: sx * w * 0.24, y: baseH + 0.5, z: -l / 2 + 0.16, tilt: -0.22 }));
    g.add(pillow(M.sheet, 0.68, 0.46, 0.16, { x: sx * w * 0.24, y: baseH + 0.36, z: -l / 2 + 0.36, tilt: -0.75 }));
  }
  g.add(pillow(accent ?? M.rust, 0.56, 0.3, 0.13, { x: 0, y: baseH + 0.36, z: -l / 2 + 0.52, tilt: -0.55 }));
  // throw across the foot
  const T = throwMat ?? M.oat;
  g.add(softBox(T, w + 0.13, 0.035, 0.46, 0, baseH + 0.275, l / 2 - 0.32, 0.017, 0.012));
  for (const sx of [-1, 1]) g.add(box(T, 0.03, 0.16, 0.46, sx * (w / 2 + 0.075), baseH + 0.13, l / 2 - 0.32, 0.012));
  return place(g, at);
}
// Nightstand: a walnut box on legs with a drawer and an open shelf
export function nightstand(M, { w = 0.5, d = 0.4, h = 0.52, wood, ...at } = {}) {
  const g = new THREE.Group();
  const W = wood ?? M.walnut;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(wcyl(W, 0.014, 0.012, 0.16, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), 8));
  g.add(wbox(W, w, 0.02, d, 0, 0.16, 0));
  g.add(wbox(W, w, 0.02, d, 0, h - 0.02, 0));
  for (const sx of [-1, 1]) g.add(wbox(W, 0.02, h - 0.2, d, sx * (w / 2 - 0.01), 0.18, 0));
  g.add(box(W, w - 0.04, h - 0.2, 0.012, 0, 0.18, -d / 2 + 0.006));
  g.add(wbox(W, w - 0.046, 0.15, 0.02, 0, h - 0.18, d / 2 - 0.012, 0.002)); // drawer
  g.add(cylinder(M.brass, 0.012, 0.012, 0.02, 0, h - 0.11, d / 2 + 0.004, 10).rotateX(Math.PI / 2));
  g.userData.top = h;
  return place(g, at);
}

// ── lights ───────────────────────────────────────────────────────────────────
// Table lamp: a glazed ceramic base and a linen shade (glowing a little: M.shade)
export function tableLamp(M, { base, h = 0.5, shadeR = 0.17, ...at } = {}) {
  const g = new THREE.Group();
  const B = base ?? M.ceramicSand;
  const bh = h * 0.52;
  g.add(lathe(B, [[0.001, 0], [0.06, 0], [0.1, bh * 0.25], [0.11, bh * 0.55], [0.07, bh * 0.92], [0.025, bh], [0.001, bh]], 28));
  g.add(cylinder(M.brass, 0.008, 0.008, h * 0.2, 0, bh, 0, 6));
  const shadeM = cylinder(M.shade, shadeR * 0.78, shadeR, h * 0.36, 0, h - h * 0.36 + 0.04, 0, 28);
  shadeM.castShadow = false;
  g.add(shadeM);
  return place(g, at);
}
// Floor lamp: a round base, a thin black pole and a linen drum shade
export function floorLamp(M, { h = 1.55, shadeR = 0.22, ...at } = {}) {
  const g = new THREE.Group();
  g.add(cylinder(M.black, 0.14, 0.15, 0.025, 0, 0, 0, 24));
  g.add(cylinder(M.black, 0.01, 0.01, h - 0.32, 0, 0.025, 0, 6));
  g.add(cylinder(M.brass, 0.014, 0.014, 0.04, 0, h - 0.36, 0, 8));
  const s = cylinder(M.shade, shadeR, shadeR * 1.05, 0.32, 0, h - 0.32, 0, 32);
  s.castShadow = false;
  g.add(s);
  return place(g, at);
}
// Pendant: a ceramic or linen dome with a brass cap on a cord from y = top (metres above the dome's rim; 0 = no cord)
export function pendantLamp(M, { r = 0.24, cord = 0.6, mat, ...at } = {}) {
  const g = new THREE.Group();
  const D = mat ?? M.ceramic;
  g.add(lathe(D, [[r, 0], [r * 0.98, r * 0.18], [r * 0.85, r * 0.42], [r * 0.55, r * 0.62], [0.03, r * 0.7], [0.001, r * 0.7]], 32));
  const inner = mesh(shared(`pin${r}`, () => new THREE.CircleGeometry(r * 0.96, 32)), M.shade, false, false);
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.004;
  g.add(inner);
  g.add(cylinder(M.brass, 0.03, 0.035, 0.05, 0, r * 0.68, 0, 16));
  if (cord > 0) g.add(cylinder(M.black, 0.006, 0.006, cord, 0, r * 0.7 + 0.04, 0, 5));
  return place(g, at);
}
// Wall sconce (wall at z = 0): a brass arm and a small linen shade
export function sconce(M, at = {}) {
  const g = new THREE.Group();
  g.add(cylinder(M.brass, 0.05, 0.05, 0.015, 0, 0, 0.007, 16).rotateX(Math.PI / 2));
  g.add(tube(M.brass, [[0, 0, 0.01], [0, 0.02, 0.12], [0, 0.08, 0.2]], 0.007, 6, 8));
  const s = cylinder(M.shade, 0.07, 0.09, 0.13, 0, 0.06, 0.2, 20);
  s.castShadow = false;
  g.add(s);
  return place(g, at);
}

// ── textiles and wall things ─────────────────────────────────────────────────
// Rug: a flat woven slab with its pattern texture. w along x, d along z
export function rug(M, { w = 2.4, d = 1.7, style = 'border', base = 0xe7dccb, accent = 0xc9a98c, key, ...at } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, 0.012, d);
  g.add(mesh(geo, M.rugMat(style, base, accent, key), false, true));
  g.children[0].position.y = 0.006;
  return place(g, at);
}
// Framed print on a wall (the wall at z = 0, the print facing +Z): frame, white mat, the print
export function artFrame(M, { w = 0.6, h = 0.8, art = 'botanical', frame = 'oak', on = 'left', depth = 0.03, ...at } = {}) {
  const g = new THREE.Group();
  const Fm = frame === 'oak' ? M.oak : frame === 'black' ? M.black : frame === 'walnut' ? M.walnut : M.paintWhite;
  const b = 0.025;
  g.add(wbox(Fm, w, b, depth, 0, 0, depth / 2));
  g.add(wbox(Fm, w, b, depth, 0, h - b, depth / 2));
  g.add(wbox(Fm, b, h - 2 * b, depth, -w / 2 + b / 2, b, depth / 2));
  g.add(wbox(Fm, b, h - 2 * b, depth, w / 2 - b / 2, b, depth / 2));
  g.add(box(M.paper, w - 2 * b, h - 2 * b, 0.01, 0, b, 0.012));
  const pw = (w - 2 * b) * 0.72, ph = (h - 2 * b) * 0.72;
  const print = mesh(new THREE.PlaneGeometry(pw, ph), M.artMat(art, on), false, true);
  print.position.set(0, h / 2, 0.0235);
  g.add(print);
  return place(g, at);
}
// Mirror on a wall: a round brass-framed glass (wall at z = 0)
export function mirror(M, { r = 0.35, frame, ...at } = {}) {
  const g = new THREE.Group();
  const ring = mesh(shared(`mir${r}`, () => new THREE.TorusGeometry(r, 0.014, 8, 48)), frame ?? M.brass);
  ring.position.z = 0.016;
  g.add(ring);
  const glass = mesh(shared(`mirg${r}`, () => new THREE.CircleGeometry(r - 0.004, 48)), M.mirrorGlass, false, true);
  glass.position.z = 0.012;
  g.add(glass);
  return place(g, at);
}
// Linen curtain: a pleated panel hanging from y = h down to the floor, w wide along x, facing +Z, on a slim rod
export function curtain(M, { w = 1.0, h = 2.4, folds = 7, depth = 0.11, fabric, rod: rodOn = true, ...at } = {}) {
  const g = new THREE.Group();
  const F = fabric ?? M.linen;
  const nx = folds * 8, ny = 6;
  const geo = new THREE.PlaneGeometry(w, h - 0.04, nx, ny);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const t = (x / w + 0.5) * folds * TAU;
    const flare = 0.75 + 0.25 * (0.5 - y / h); // folds open a little toward the hem
    p.setZ(i, Math.sin(t) * depth * 0.5 * flare);
    // the light a fold catches: the deep of each fold darker (in open shade only the sky lights the curtain, and the sky
    // alone would not show its folds)
    const k = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(t));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  geo.translate(0, (h - 0.04) / 2, depth * 0.6);
  const mat = F.clone();
  mat.side = THREE.DoubleSide;
  g.add(mesh(geo, mat));
  if (rodOn) g.add(rod(M.brass, new V3(-w / 2 - 0.05, h, depth * 0.6), new V3(w / 2 + 0.05, h, depth * 0.6), 0.012, 0.012, 8));
  return place(g, at);
}
// Skirting board along a wall (white, 8 cm)
export function skirting(M, { len = 3, ...at } = {}) {
  return place(new THREE.Group().add(box(M.paintWhite, len, 0.08, 0.015, 0, 0, 0.0075)), at);
}

// ── books, ceramics and small things ─────────────────────────────────────────
const BOOK_COLS = [0xe9e1d2, 0xc5a684, 0x8fa592, 0xd8a58c, 0x56645b, 0xe2cfa6, 0xb3694a, 0xf1ece2, 0x6f8299, 0x6e5b4b, 0xc9bfa8, 0x3f4a55, 0xd9b45f, 0x9a4f3c];
// A row of books standing on a shelf, from x = 0 toward +x, len metres long (the last one may lean)
export function bookRow(M, { len = 0.5, hMin = 0.18, hMax = 0.27, d = 0.16, seed = 1, lean = true, ...at } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const vc = new VC();
  let x = 0;
  const cover = (hex) => paint(hex, 0.75);
  const pages = paint(0xf2ecdf, 0.75);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  while (x < len - 0.02) {
    const t = 0.018 + r() * 0.03, h = hMin + r() * (hMax - hMin), dd = d * (0.85 + r() * 0.15);
    const col = cover(BOOK_COLS[Math.floor(r() * BOOK_COLS.length)]);
    const leanIt = lean && x + t > len - 0.06 && r() < 0.8;
    const m = new THREE.Matrix4();
    if (leanIt) {
      const a = -0.35;
      m.compose(new V3(x + Math.sin(-a) * h * 0.5 + t / 2, (Math.cos(a) * h) / 2, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a)), new V3(t, h, dd));
    } else m.compose(new V3(x + t / 2, h / 2, 0), new THREE.Quaternion(), new V3(t, h, dd));
    vc.add(geo, m, col); // the spine faces the room; the page edges face the wall
    void pages;
    x += t + 0.002;
    if (leanIt) break;
  }
  g.add(vc.mesh(M.vc));
  return place(g, at);
}
// A stack of books lying flat, centred on x = z = 0
export function bookStack(M, { n = 3, w = 0.24, d = 0.17, seed = 3, ...at } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const vc = new VC();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = 0.022 + r() * 0.025, ww = w * (0.8 + r() * 0.25), dd = d * (0.85 + r() * 0.2), yaw = (r() - 0.5) * 0.3;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    vc.add(geo, new THREE.Matrix4().compose(new V3(0, y + t / 2, 0), q, new V3(ww, t, dd)), paint(BOOK_COLS[Math.floor(r() * BOOK_COLS.length)], 0.85));
    vc.add(geo, new THREE.Matrix4().compose(new V3(0.006, y + t / 2, 0), q, new V3(ww * 0.97, t * 0.86, dd * 1.005)), paint(0xf2ecdf, 0.85));
    y += t;
  }
  g.add(vc.mesh(M.vc));
  g.userData.top = y;
  return place(g, at);
}
const PROFILES = {
  bud: [[0.001, 0], [0.035, 0], [0.05, 0.03], [0.055, 0.08], [0.03, 0.15], [0.014, 0.19], [0.016, 0.22], [0.012, 0.22]],
  bottle: [[0.001, 0], [0.06, 0], [0.075, 0.04], [0.078, 0.14], [0.05, 0.2], [0.022, 0.24], [0.022, 0.3], [0.018, 0.3]],
  amphora: [[0.001, 0], [0.05, 0], [0.09, 0.06], [0.11, 0.14], [0.09, 0.24], [0.055, 0.29], [0.06, 0.33], [0.052, 0.33]],
  jar: [[0.001, 0], [0.07, 0], [0.085, 0.03], [0.09, 0.12], [0.07, 0.17], [0.05, 0.18], [0.05, 0.2], [0.044, 0.2]],
  urn: [[0.001, 0], [0.06, 0], [0.1, 0.05], [0.12, 0.13], [0.11, 0.2], [0.08, 0.26], [0.085, 0.3], [0.075, 0.3]],
  cylinder: [[0.001, 0], [0.06, 0], [0.065, 0.01], [0.065, 0.26], [0.058, 0.26]],
  pitcher: [[0.001, 0], [0.05, 0], [0.07, 0.04], [0.072, 0.12], [0.055, 0.18], [0.06, 0.22], [0.054, 0.22]],
  tall: [[0.001, 0], [0.05, 0], [0.065, 0.06], [0.07, 0.25], [0.05, 0.38], [0.04, 0.42], [0.044, 0.45], [0.038, 0.45]],
};
// a ceramic vase (lathe). kind: bud | bottle | amphora | jar | urn | cylinder | pitcher | tall; scale k
export function vase(M, { kind = 'bottle', mat, k = 1, ...at } = {}) {
  const g = new THREE.Group();
  const prof = PROFILES[kind].map(([r, y]) => [r * k, y * k]);
  // an inner wall so the open mouth shows a dark inside
  const inner = prof.slice().reverse().map(([r, y]) => [Math.max(0.001, r - 0.006 * k), Math.max(0.01 * k, y - 0.004)]);
  g.add(lathe(mat ?? M.ceramic, [...prof, ...inner.slice(1)], 28));
  g.userData.top = prof[prof.length - 1][1];
  return place(g, at);
}
// a bowl (lathe), r its rim radius
export function bowl(M, { r = 0.14, h, mat, ...at } = {}) {
  const g = new THREE.Group();
  const H = h ?? r * 0.45;
  const outer = [[0.001, 0], [r * 0.4, 0], [r * 0.45, H * 0.08], [r * 0.82, H * 0.45], [r, H]];
  const innerP = [[r - 0.006, H], [r * 0.78, H * 0.5], [r * 0.4, H * 0.18], [0.001, H * 0.16]];
  g.add(lathe(mat ?? M.ceramic, [...outer, ...innerP], 32));
  return place(g, at);
}
export function plate(M, { r = 0.13, mat, ...at } = {}) {
  const g = new THREE.Group();
  g.add(lathe(mat ?? M.ceramic, [[0.001, 0], [r * 0.6, 0], [r * 0.7, 0.008], [r, 0.02], [r - 0.004, 0.022], [r * 0.68, 0.01], [0.001, 0.01]], 32));
  return place(g, at);
}
export function cup(M, { r = 0.04, h = 0.09, mat, ...at } = {}) {
  const g = new THREE.Group();
  g.add(lathe(mat ?? M.ceramic, [[0.001, 0], [r * 0.8, 0], [r, h * 0.2], [r, h], [r - 0.004, h], [r - 0.004, h * 0.2], [0.001, h * 0.15]], 20));
  return place(g, at);
}
export function candle(M, { r = 0.03, h = 0.18, ...at } = {}) {
  const g = new THREE.Group();
  g.add(lathe(M.brass, [[0.001, 0], [0.04, 0], [0.04, 0.01], [0.012, 0.02], [0.016, 0.05], [0.001, 0.05]], 16));
  g.add(cylinder(M.paper, r * 0.6, r * 0.6, h, 0, 0.05, 0, 10));
  return place(g, at);
}
// a fruit bowl: a wide bowl with lemons and oranges
export function fruitBowl(M, { r = 0.17, seed = 4, ...at } = {}) {
  const g = new THREE.Group();
  g.add(bowl(M, { r, h: r * 0.42, mat: M.stoneware }));
  const vc = new VC();
  const rr = rng(seed);
  const sph = new THREE.SphereGeometry(1, 14, 10);
  const cols = [paint(0xe9c75a, 0.8), paint(0xe39a4a, 0.8), paint(0xd9c060, 0.8), paint(0x9bb46a, 0.8)];
  const spots = [[0, 0.06, 0], [0.07, 0.055, 0.04], [-0.07, 0.055, 0.03], [0.02, 0.055, -0.07], [-0.03, 0.11, -0.01], [0.05, 0.1, -0.02]];
  spots.forEach(([x, y, z], i) => {
    const s = 0.036 + rr() * 0.01;
    vc.add(sph, new THREE.Matrix4().compose(new V3(x * r * 6, y * r * 5.5, z * r * 6), new THREE.Quaternion(), new V3(s, s * 0.92, s * 1.08)), cols[i % cols.length]);
  });
  g.add(vc.mesh(M.vc));
  return place(g, at);
}
// a cutting board leaning on the wall (wall at z = 0)
export function board(M, { w = 0.3, h = 0.45, ...at } = {}) {
  const g = new THREE.Group();
  const b = wbox(M.oak, w, h, 0.02, 0, 0, 0);
  b.rotation.x = -0.12;
  b.position.z = 0.05;
  g.add(b);
  return place(g, at);
}
// a few bottles and jars (kitchen counter)
export function bottles(M, at = {}) {
  const g = new THREE.Group();
  g.add(vase(M, { kind: 'bottle', mat: M.glassGreen, k: 0.9, x: 0, z: 0 }));
  g.add(vase(M, { kind: 'cylinder', mat: M.ceramicSand, k: 0.7, x: 0.13, z: 0.02 }));
  g.add(vase(M, { kind: 'jar', mat: M.glassAmber, k: 0.7, x: -0.12, z: 0.03 }));
  return place(g, at);
}

// ── plants and flowers ───────────────────────────────────────────────────────
// Pot (lathe) with soil. kind: 'round' (glazed, tapering), 'cylinder', 'bowl', 'terracotta' (rimmed), 'basket'.
// r: rim radius, h: height. Returns the group; userData.soil is the soil level.
export function pot(M, { kind = 'round', r = 0.18, h = 0.32, mat, saucer = false, ...at } = {}) {
  const g = new THREE.Group();
  let prof;
  if (kind === 'terracotta') prof = [[0.001, 0], [r * 0.68, 0], [r * 0.86, h * 0.8], [r * 1.04, h * 0.82], [r * 1.04, h], [r * 0.96, h]];
  else if (kind === 'cylinder') prof = [[0.001, 0], [r * 0.96, 0], [r, h * 0.04], [r, h], [r * 0.93, h]];
  else if (kind === 'bowl') prof = [[0.001, 0], [r * 0.5, 0], [r * 0.85, h * 0.4], [r, h], [r * 0.93, h]];
  else if (kind === 'basket') prof = [[0.001, 0], [r * 0.8, 0], [r * 0.95, h * 0.5], [r, h], [r * 0.92, h]];
  else prof = [[0.001, 0], [r * 0.62, 0], [r * 0.95, h * 0.45], [r, h * 0.9], [r * 0.97, h], [r * 0.9, h]];
  const P = mat ?? (kind === 'terracotta' ? M.terracotta : kind === 'basket' ? M.stoneware : M.ceramic);
  g.add(lathe(P, prof, kind === 'basket' ? 36 : 32));
  if (kind === 'basket') {
    // woven bands
    for (let i = 1; i < 6; i++) {
      const y = (h * i) / 6;
      const rr = r * (0.82 + 0.18 * (i / 6)) + 0.004;
      const t = mesh(shared(`bk${rr.toFixed(3)}`, () => new THREE.TorusGeometry(rr, 0.006, 4, 36)), M.oat);
      t.rotation.x = Math.PI / 2;
      t.position.y = y;
      g.add(t);
    }
  }
  const soil = cylinder(M.soil, r * 0.9, r * 0.9, 0.01, 0, h - 0.04, 0, 24);
  soil.castShadow = false;
  g.add(soil);
  if (saucer) g.add(lathe(P, [[0.001, 0], [r * 0.85, 0], [r * 0.9, 0.025], [r * 0.84, 0.025], [0.001, 0.012]], 28));
  g.userData.soil = h - 0.03;
  return place(g, at);
}

// The plants are all leaves (vertex-coloured, both sides lit) and stems in one mesh each, standing in their pot.
// kind:
//   'paradise'  bird of paradise: long stalks with big paddle leaves, arching out (1.2-1.6 m)
//   'fiddle'    fiddle-leaf fig: a slim trunk with large rounded leaves up its upper half
//   'olive'     olive tree: a small trunk, branches, many narrow silvery leaves
//   'palm'      kentia palm: arching fronds with many leaflets
//   'snake'     snake plant: upright sword leaves with pale edges
//   'pothos'    trailing pothos: heart leaves on vines that spill over the pot's rim
//   'fern'      a Boston fern: many arching fronds of small leaflets
//   'monstera'  monstera: broad split leaves on long stalks
//   'herb'      a small herb pot (basil): many small rounded leaves
// h: overall height of the plant above the soil (metres), seed: variation.
export function plant(M, { kind = 'fiddle', potKind = 'round', potR = 0.18, potH = 0.32, potMat, h = 1.2, seed = 1, ...at } = {}) {
  const g = new THREE.Group();
  const p = pot(M, { kind: potKind, r: potR, h: potH, mat: potMat });
  g.add(p);
  const y0 = p.userData.soil;
  const r = rng(seed * 7919 + kind.length);
  const vc = new VC();
  const C = M.leafCol;
  const jitter = (c, k = 0.06) => c.clone().offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * k);
  const stemCol = (c) => () => c;
  const addStem = (pts, rad, col) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    vc.add(new THREE.TubeGeometry(curve, 8, rad, 5, false), new THREE.Matrix4(), stemCol(col));
  };
  const addLeaf = (opts, pos, yaw, pitch, roll = 0, sc = 1) => {
    const c0 = jitter(opts.c0 ?? C.deep), c1 = jitter(opts.c1 ?? C.mid);
    vc.add(leafGeo({ ...opts, c0, c1 }), leafAt(pos, yaw, pitch, roll, sc), null);
  };

  if (kind === 'paradise' || kind === 'monstera') {
    const n = kind === 'paradise' ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const yaw = (i / n) * TAU + r() * 0.6;
      const tilt = 0.14 + r() * 0.38; // how far the stalk leans out
      const L = h * (kind === 'paradise' ? 0.38 + r() * 0.36 : 0.55 + r() * 0.4);
      const top = new V3(Math.sin(yaw) * L * Math.sin(tilt), y0 + L * Math.cos(tilt) * 0.85, Math.cos(yaw) * L * Math.sin(tilt));
      const mid = new V3(top.x * 0.4, y0 + (top.y - y0) * 0.55, top.z * 0.4);
      addStem([new V3(0, y0, 0), mid, top], 0.008, C.stem);
      const leafLen = kind === 'paradise' ? h * (0.38 + r() * 0.14) : h * (0.3 + r() * 0.1);
      addLeaf(
        { len: leafLen, wid: kind === 'paradise' ? leafLen * 0.38 : leafLen * 0.9, shape: kind === 'paradise' ? 'paddle' : 'heart', fold: 0.2, droop: 0.3 + r() * 0.3, segs: 8, c0: C.deep, c1: kind === 'paradise' ? C.mid : C.light },
        top, yaw + (r() - 0.5) * 0.5, 0.65 + r() * 0.55, (r() - 0.5) * 0.6,
      );
      if (kind === 'monstera') {
        // the splits: a second, narrower leaf on top makes the cut-leaf silhouette read
        addLeaf({ len: leafLen * 0.8, wid: leafLen * 0.25, shape: 'lance', fold: 0.1, droop: 0.4, c0: C.deep, c1: C.mid }, top, yaw + 0.5, 0.45, 0.2);
        addLeaf({ len: leafLen * 0.8, wid: leafLen * 0.25, shape: 'lance', fold: 0.1, droop: 0.4, c0: C.deep, c1: C.mid }, top, yaw - 0.5, 0.45, -0.2);
      }
    }
  } else if (kind === 'fiddle') {
    const trunkTop = new V3(0.03, y0 + h, -0.02);
    addStem([new V3(0, y0, 0), new V3(0.02, y0 + h * 0.5, 0.01), trunkTop], 0.016, C.bark);
    const n = 26;
    for (let i = 0; i < n; i++) {
      const t = 0.32 + 0.68 * (i / n);
      const pos = new V3(0.02 + (r() - 0.5) * 0.03, y0 + h * t, (r() - 0.5) * 0.03);
      const yaw = i * 2.4 + r() * 0.4;
      const L = 0.2 + r() * 0.12 - t * 0.04;
      addLeaf({ len: L, wid: L * 0.68, shape: 'oval', fold: 0.12, droop: 0.15 + r() * 0.15, segs: 6, c0: C.deep, c1: C.mid }, pos, yaw, 0.35 + r() * 0.6 - (1 - t) * 0.3, (r() - 0.5) * 0.5);
    }
  } else if (kind === 'olive') {
    const trunk = [new V3(0, y0, 0), new V3(0.03, y0 + h * 0.3, 0.01), new V3(-0.01, y0 + h * 0.5, 0.02)];
    addStem(trunk, 0.02, C.bark);
    const tips = [];
    for (let b = 0; b < 8; b++) {
      const yaw = (b / 8) * TAU + r() * 0.5;
      const L = h * (0.25 + r() * 0.2);
      const start = trunk[2].clone().add(new V3(0, -r() * 0.1, 0));
      const end = start.clone().add(new V3(Math.sin(yaw) * L * 0.7, L * (0.6 + r() * 0.5), Math.cos(yaw) * L * 0.7));
      addStem([start, start.clone().lerp(end, 0.5).add(new V3(0, 0.03, 0)), end], 0.009, C.bark);
      tips.push([start, end]);
    }
    for (const [a, b] of tips)
      for (let i = 0; i < 60; i++) {
        const t = 0.2 + 0.8 * r();
        const pos = a.clone().lerp(b, t).add(new V3((r() - 0.5) * 0.3, (r() - 0.4) * 0.24, (r() - 0.5) * 0.3));
        addLeaf({ len: 0.1 + r() * 0.04, wid: 0.026, shape: 'lance', fold: 0.1, droop: 0.15, segs: 3, c0: C.olive, c1: C.oliveLight }, pos, r() * TAU, (r() - 0.3) * 1.2, r());
      }
  } else if (kind === 'palm' || kind === 'fern') {
    const n = kind === 'palm' ? 9 : 22;
    for (let i = 0; i < n; i++) {
      const yaw = (i / n) * TAU + r() * 0.5;
      const up = kind === 'palm' ? 0.9 + r() * 0.5 : 0.3 + r() * 0.8;
      const L = kind === 'palm' ? h * (0.7 + r() * 0.3) : h * (0.6 + r() * 0.5);
      // the frond's midrib arches out and down
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const a = up * (1 - t * 1.25);
        pts.push(new V3(Math.sin(yaw) * L * t * 0.7, y0 + L * Math.sin(Math.max(-0.4, a)) * t * 0.9 + (kind === 'palm' ? h * 0.25 * (1 - (1 - t) ** 2) : 0), Math.cos(yaw) * L * t * 0.7));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      if (kind === 'palm') vc.add(new THREE.TubeGeometry(curve, 10, 0.005, 4, false), new THREE.Matrix4(), stemCol(C.stem));
      const m = kind === 'palm' ? 16 : 14;
      for (let k = 2; k <= m; k++) {
        const t = k / (m + 1);
        const pos = curve.getPoint(t);
        const tan = curve.getTangent(t);
        const yawT = Math.atan2(tan.x, tan.z);
        const pitchT = Math.asin(Math.max(-1, Math.min(1, tan.y)));
        const len = (kind === 'palm' ? 0.22 : 0.08) * (1 - Math.abs(t - 0.45) * 0.9);
        for (const sd of [-1, 1])
          addLeaf(
            { len, wid: kind === 'palm' ? 0.03 : 0.025, shape: 'lance', fold: 0.15, droop: kind === 'palm' ? 0.5 : 0.2, segs: 4, c0: C.mid, c1: kind === 'palm' ? C.mid : C.light },
            pos, yawT + sd * (kind === 'palm' ? 0.9 : 1.2), pitchT - 0.2, sd * 0.3,
          );
      }
    }
  } else if (kind === 'snake') {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const yaw = r() * TAU;
      const pos = new V3((r() - 0.5) * potR, y0, (r() - 0.5) * potR);
      const L = h * (0.55 + r() * 0.45);
      addLeaf({ len: L, wid: 0.06 + r() * 0.02, shape: 'sword', fold: 0.35, droop: -0.02, segs: 6, c0: C.snake, c1: C.snakeEdge }, pos, yaw, Math.PI / 2 - 0.05 - r() * 0.2, r() * 0.5);
    }
  } else if (kind === 'pothos') {
    const vines = 7;
    for (let v = 0; v < vines; v++) {
      const yaw = (v / vines) * TAU + r() * 0.4;
      const out = potR * 0.9;
      const drop = h * (0.4 + r() * 0.8);
      const pts = [new V3(Math.sin(yaw) * 0.03, y0 + 0.05, Math.cos(yaw) * 0.03), new V3(Math.sin(yaw) * out, y0 + 0.08, Math.cos(yaw) * out), new V3(Math.sin(yaw) * (out + 0.06), y0 - drop * 0.4, Math.cos(yaw) * (out + 0.06)), new V3(Math.sin(yaw + 0.2) * (out + 0.04), y0 - drop, Math.cos(yaw + 0.2) * (out + 0.04))];
      const curve = new THREE.CatmullRomCurve3(pts);
      vc.add(new THREE.TubeGeometry(curve, 10, 0.003, 4, false), new THREE.Matrix4(), stemCol(C.stem));
      for (let k = 0; k < 9; k++) {
        const pos = curve.getPoint(k / 9);
        addLeaf({ len: 0.06, wid: 0.05, shape: 'heart', fold: 0.15, droop: 0.2, segs: 4, c0: C.mid, c1: C.light }, pos, yaw + (k % 2 ? 1 : -1) * 1.2, -0.2 + r() * 0.4, 0);
      }
    }
    for (let i = 0; i < 9; i++) addLeaf({ len: 0.07, wid: 0.055, shape: 'heart', fold: 0.15, droop: 0.2, segs: 4, c0: C.mid, c1: C.light }, new V3((r() - 0.5) * 0.1, y0 + 0.04, (r() - 0.5) * 0.1), r() * TAU, 0.6, 0);
  } else if (kind === 'herb') {
    for (let s = 0; s < 6; s++) {
      const base = new V3((r() - 0.5) * potR, y0, (r() - 0.5) * potR);
      const top = base.clone().add(new V3((r() - 0.5) * 0.04, h * (0.6 + r() * 0.4), (r() - 0.5) * 0.04));
      addStem([base, top], 0.003, C.stem);
      for (let k = 0; k < 4; k++) {
        const pos = base.clone().lerp(top, 0.35 + k * 0.2);
        for (const sd of [0, Math.PI]) addLeaf({ len: 0.04, wid: 0.03, shape: 'oval', fold: 0.3, droop: 0.2, segs: 3, c0: C.mid, c1: C.light }, pos, k * 1.6 + sd, 0.3, 0);
      }
    }
  }
  g.add(vc.mesh(M.foliage));
  g.userData.potH = potH;
  return place(g, at);
}

// Flowers in a vase. kind: 'tulip' | 'ranunculus' | 'branch' (blossom branches) | 'eucalyptus' | 'dried' (dried stems)
// colors: petal colour keys of M.petalCol. h: stem height above the vase's mouth.
export function flowers(M, { kind = 'ranunculus', vaseKind = 'bud', vaseMat, k = 1, colors = ['blush', 'white', 'peach'], n = 7, h = 0.28, seed = 2, ...at } = {}) {
  const g = new THREE.Group();
  const v = vase(M, { kind: vaseKind, mat: vaseMat ?? M.ceramic, k });
  g.add(v);
  const mouth = v.userData.top;
  const r = rng(seed * 131 + kind.length);
  const vc = new VC();
  const C = M.leafCol, P = M.petalCol;
  const stem = (pts, rad = 0.003, col = C.stem) => vc.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, rad, 4, false), new THREE.Matrix4(), () => col);
  const petal = (pos, yaw, pitch, len, wid, col, shape = 'cup', droop = -0.3) => {
    const c = col.clone().offsetHSL(0, 0, (r() - 0.5) * 0.05);
    vc.add(leafGeo({ len, wid, shape, fold: 0.5, droop, segs: 4, c0: c.clone().multiplyScalar(0.85), c1: c }), leafAt(pos, yaw, pitch), null);
  };
  const leaf = (pos, yaw, pitch, len, wid) => vc.add(leafGeo({ len, wid, shape: 'lance', fold: 0.2, droop: 0.3, segs: 4, c0: C.deep, c1: C.mid }), leafAt(pos, yaw, pitch), null);
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * TAU + r() * 0.7;
    const spread = kind === 'branch' || kind === 'eucalyptus' || kind === 'dried' ? 0.18 + r() * 0.2 : 0.08 + r() * 0.12;
    const L = h * (0.75 + r() * 0.45);
    const top = new V3(Math.sin(yaw) * L * spread * 1.6, mouth + L, Math.cos(yaw) * L * spread * 1.6);
    const base = new V3(0, mouth * 0.6, 0);
    const mid = base.clone().lerp(top, 0.55).add(new V3(0, 0.01, 0));
    if (kind === 'branch' || kind === 'dried' || kind === 'eucalyptus') {
      stem([base, mid, top], kind === 'branch' ? 0.004 : 0.0025, kind === 'branch' ? C.twig : kind === 'dried' ? paint(0xb59b72, 0.75) : C.stem);
      const curve = new THREE.CatmullRomCurve3([base, mid, top]);
      const m = kind === 'eucalyptus' ? 10 : kind === 'dried' ? 7 : 12;
      for (let k2 = 3; k2 < m; k2++) {
        const pos = curve.getPoint(k2 / m);
        if (kind === 'branch') {
          // blossoms: little five-petal flowers
          const col = P[colors[k2 % colors.length]] ?? P.white;
          for (let pI = 0; pI < 5; pI++) petal(pos.clone().add(new V3((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.03)), (pI / 5) * TAU + k2, 0.3, 0.032, 0.028, col, 'round', 0);
          for (let pI = 0; pI < 5; pI++) petal(pos.clone().add(new V3(0.025, 0.02, -0.01)), (pI / 5) * TAU + k2 + 0.6, 0.35, 0.028, 0.024, col, 'round', 0);
        } else if (kind === 'eucalyptus') {
          for (const sd of [-1, 1]) vc.add(leafGeo({ len: 0.035, wid: 0.032, shape: 'round', fold: 0.05, droop: 0.1, segs: 4, c0: C.olive, c1: C.oliveLight }), leafAt(pos, yaw + sd * 1.4 + k2, -0.4), null);
        } else {
          // dried: small seed heads
          vc.add(new THREE.SphereGeometry(0.012, 6, 4), new THREE.Matrix4().makeTranslation(pos.x + (r() - 0.5) * 0.03, pos.y, pos.z + (r() - 0.5) * 0.03), () => paint(0xcfb489, 0.75));
        }
      }
      continue;
    }
    stem([base, mid, top]);
    const col = P[colors[i % colors.length]] ?? P.white;
    if (kind === 'tulip') {
      for (let pI = 0; pI < 6; pI++) petal(top.clone().add(new V3(0, -0.01, 0)), (pI / 6) * TAU, 1.15 + (pI % 2) * 0.12, 0.055, 0.04, col, 'cup', -0.6);
      leaf(base.clone().lerp(top, 0.3), yaw + 0.5, 0.9, 0.12, 0.03);
    } else {
      // ranunculus / peony: layered rings of cupped petals round a small centre
      vc.add(new THREE.SphereGeometry(0.014, 8, 6), new THREE.Matrix4().makeTranslation(top.x, top.y + 0.008, top.z), () => P.centre);
      for (const [ring, cnt, pitch, len] of [[0, 6, 1.25, 0.03], [1, 8, 0.85, 0.04], [2, 9, 0.45, 0.045]])
        for (let pI = 0; pI < cnt; pI++) petal(top, (pI / cnt) * TAU + ring * 0.4, pitch, len, len * 0.95, col, 'round', -0.45);
      if (i % 2) leaf(base.clone().lerp(top, 0.5), yaw - 0.6, 0.4, 0.07, 0.025);
    }
  }
  g.add(vc.mesh(M.foliage));
  return place(g, at);
}

// ── bath ─────────────────────────────────────────────────────────────────────
// Freestanding oval tub (long axis along x)
export function bathtub(M, { len = 1.7, wid = 0.78, h = 0.58, mat, ...at } = {}) {
  const g = new THREE.Group();
  const T = mat ?? M.ceramic;
  // shell: a stadium ring (outer outline with the basin as a hole), soft bevelled rim, closed by a floor inside
  const ring = stadium(len - 0.1, wid - 0.1);
  ring.holes.push(stadium(len - 0.22, wid - 0.22));
  const shell = new THREE.ExtrudeGeometry(ring, { depth: h - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 32 });
  shell.rotateX(Math.PI / 2);
  shell.translate(0, h - 0.05, 0);
  g.add(mesh(shell, T));
  g.add(slab(T, stadium(len - 0.12, wid - 0.12), 0.06, 0.06, 0.02, false));
  const water = slab(M.water, stadium(len - 0.2, wid - 0.2), 0.01, h - 0.16, 0, false);
  water.castShadow = false;
  g.add(water);
  g.add(box(M.ceramicDark, 0.02, 0.012, 0.02, 0, h - 0.04, 0));
  return place(g, at);
}
// Vanity: an oak cabinet hung on the wall (wall at z = -d/2), a stone top, a vessel basin and a wall-mounted spout
export function vanity(M, { len = 1.0, d = 0.5, h = 0.86, front, top, ...at } = {}) {
  const g = new THREE.Group();
  const Fr = front ?? M.oak, T = top ?? M.travertine;
  g.add(wbox(Fr, len, 0.36, d - 0.02, 0, h - 0.4, -0.01, 0.006));
  g.add(box(M.black, len - 0.1, 0.008, 0.01, 0, h - 0.23, d / 2 - 0.016));
  const s = slab(T, roundRect(len + 0.02, d, 0.01), 0.04, h - 0.04, 0.003, false);
  stoneUV(s.geometry);
  g.add(s);
  g.add(bowl(M, { r: 0.2, h: 0.13, mat: M.ceramic, x: 0, y: h, z: 0.02 }));
  g.add(tube(M.brass, [[0, h + 0.3, -d / 2], [0, h + 0.3, -d / 2 + 0.12], [0, h + 0.27, -d / 2 + 0.16]], 0.01, 8, 6));
  return place(g, at);
}
// Towel rail on a wall (wall at z = 0) with one or two folded towels
export function towelRail(M, { len = 0.6, towels = [M => M.linen, M => M.sage], ...at } = {}) {
  const g = new THREE.Group();
  g.add(rod(M.brass, new V3(-len / 2, 0, 0.08), new V3(len / 2, 0, 0.08), 0.009, 0.009, 8));
  for (const sx of [-1, 1]) g.add(rod(M.brass, new V3(sx * len * 0.45, 0, 0), new V3(sx * len * 0.45, 0, 0.08), 0.007, 0.007, 6));
  towels.forEach((tm, i) => {
    const mat = tm(M);
    const x = (i - (towels.length - 1) / 2) * (len * 0.45);
    g.add(box(mat, len * 0.4, 0.5, 0.02, x, -0.48, 0.07, 0.008));
    g.add(box(mat, len * 0.4, 0.38, 0.02, x, -0.36, 0.1, 0.008));
  });
  return place(g, at);
}
// Shower screen: a clear pane in a slim black frame along x, h tall (glass reads as a pale tint)
export function showerScreen(M, { len = 1.0, h = 2.0, ...at } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xdfe8e6, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false });
  g.add(mesh(new THREE.BoxGeometry(len, h, 0.008), glass, false, false));
  g.children[0].position.y = h / 2;
  g.add(box(M.black, len, 0.02, 0.02, 0, h - 0.02, 0));
  g.add(box(M.black, 0.02, h, 0.02, len / 2, 0, 0));
  g.add(box(M.black, len, 0.02, 0.02, 0, 0, 0));
  return place(g, at);
}
// Toiletries: a few bottles and a soap dish
export function toiletries(M, at = {}) {
  const g = new THREE.Group();
  g.add(vase(M, { kind: 'bottle', mat: M.glassAmber, k: 0.6, x: 0, z: 0 }));
  g.add(vase(M, { kind: 'cylinder', mat: M.ceramic, k: 0.55, x: 0.08, z: 0.01 }));
  g.add(bowl(M, { r: 0.05, h: 0.015, mat: M.stoneware, x: -0.09, z: 0.02 }));
  return place(g, at);
}

// ── room shell parts (world units in, world units out: floors, plaster skins) ──
// A box from ranges whose uv follow the world (tile = world units per texture repeat): floors, worktops, tiled walls
export function planarBox(mat, [x0, x1], [y0, y1], [z0, z1], tile = 1) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ay > 0.5 ? [p.getX(i), -p.getZ(i)] : ax > 0.5 ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, u / tile, v / tile);
  }
  return mesh(geo, mat);
}
// A panelled door in a wall (the wall's face at z = 0, the door toward +Z): white leaf, two panels, brass lever
export function door(M, { w = 0.9, h = 2.1, mat, ...at } = {}) {
  const g = new THREE.Group();
  const D = mat ?? M.paintWhite;
  g.add(box(D, w + 0.12, h + 0.06, 0.02, 0, 0, 0.01)); // casing
  g.add(box(D, w, h, 0.045, 0, 0, 0.03, 0.004));
  for (const [y0, y1] of [[0.12, h * 0.42], [h * 0.48, h - 0.12]]) g.add(box(D, w - 0.22, y1 - y0, 0.012, 0, y0, 0.056, 0.004));
  g.add(rod(M.brass, new V3(w / 2 - 0.08, 1.0, 0.06), new V3(w / 2 - 0.08, 1.0, 0.11), 0.01, 0.01, 8));
  g.add(rod(M.brass, new V3(w / 2 - 0.08, 1.0, 0.11), new V3(w / 2 - 0.22, 1.0, 0.11), 0.009, 0.009, 8));
  return place(g, at);
}

// Window joinery for an opening in a wall (the wall's inner face at z = 0, the wall behind it, t thick; the opening w wide
// from y = 0 (the sill) to h, plus a half circle on top when arch): a painted frame in the middle of the reveal, a mullion
// and a transom, a deep sill, and a faint pane
export function windowFrame(M, { w = 1.1, h = 1.2, arch = false, t = 0.14, mat, ...at } = {}) {
  const g = new THREE.Group();
  const F = mat ?? M.paintWhite;
  const zc = -t / 2, b = 0.045;
  g.add(box(F, w + 0.12, 0.035, t / 2 + 0.06, 0, -0.035, zc / 2 + 0.03, 0.006)); // sill, proud of the wall
  for (const sx of [-1, 1]) g.add(box(F, b, h, 0.05, sx * (w / 2 - b / 2), 0, zc));
  const top = arch ? h + w / 2 : h;
  g.add(box(F, 0.03, top - 0.02, 0.04, 0, 0, zc)); // mullion
  g.add(box(F, w, 0.035, 0.04, 0, arch ? h : h * 0.62, zc)); // transom
  if (arch) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      pts.push(new V3(Math.cos(a) * (w / 2 - b / 2), h + Math.sin(a) * (w / 2 - b / 2), zc));
    }
    g.add(tube(F, pts, b / 2, 6, 24));
  } else g.add(box(F, w, b, 0.05, 0, h - b, zc));
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  if (arch) s.absarc(0, h, w / 2, 0, Math.PI, false);
  else s.lineTo(-w / 2, h);
  s.lineTo(-w / 2, 0);
  const pane = mesh(new THREE.ShapeGeometry(s, 16), new THREE.MeshStandardMaterial({ color: 0xe3ece9, roughness: 0.05, transparent: true, opacity: 0.14, depthWrite: false }), false, false);
  pane.position.z = zc - 0.01;
  g.add(pane);
  return place(g, at);
}

// glTF swap point: every builder by name (rooms.js and carousel.js call them through PROPS, so a loader can replace any
// entry with a function returning a loaded model in the same frame and scale)
export const PROPS = {
  sofa, loungeChair, armchair, diningChair, barStool, bench, coffeeTable, pedestalTable, sideTable, diningTable, desk,
  deskChair, sideboard, wallShelf, bookcase, kitchenRun, tallUnit, island, floatShelf, hood, faucet, bed, nightstand,
  tableLamp, floorLamp, pendantLamp, sconce, rug, artFrame, mirror, curtain, skirting, bookRow, bookStack, vase, bowl,
  plate, cup, candle, fruitBowl, board, bottles, pot, plant, flowers, bathtub, vanity, towelRail, showerScreen, toiletries,
  door, windowFrame,
};
