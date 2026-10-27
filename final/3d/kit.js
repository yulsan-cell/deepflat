// three.js building kit for the DEEPFLAT 3D hero (adapted from ../../3d/kit.js):
// light warm stone blocks with arched niches, the DEEP / FLAT letters, and the old cream miniature furniture (the study,
// the bath and the project stills in final/stills/homes.js still use it). The rooms the flight flies into are built from
// props.js (real-proportioned furniture, plants and ceramics).
//
// Daylight (2026-10-26): the world is lit like a sunny morning: a warm sun from the upper left (seen from the
// establishing camera), a sky / ground hemisphere fill, ACES Filmic tone mapping. Colours are specified as they should
// read on screen and turned into albedos by paint(): it inverts the tone curve and divides by the light a face of that
// orientation receives, so a block top reads #ECE6DB, a face toward the viewer's left #DCD3C4 and one toward the right
// #C4B9A6 (BRIEF.md, 2026-10-26).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { layout, toShape, isEmber, H, LEADING } from './glyphs.js';

export { THREE };

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.93, metalness: 0, ...extra });

// Repeated parts (chair legs, bulb sockets, equal boxes) share one geometry: less to build and upload.
// Cleared by makeMaterials(), which every boot calls first.
const geoCache = new Map();
export const shared = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};

// ── daylight ──────────────────────────────────────────────────────────────────
// One description of the light, used by the live hero (addLights), the still renders (final/stills) and paint().
// sunDir points from the scene toward the sun: from the viewer's upper left, low enough for long soft shadows.
export const DAY = {
  sunColor: 0xfff1dc,
  sunI: 9.0,
  sunDir: [-0.66, 0.66, 0.35],
  sky: 0xf1f2ee,
  ground: 0xa49a8c,
  hemiI: 5.6,
  exposure: 1.0,
  // what is left of the world far away: the floor and the air melt into a pale sage-grey (sRGB, applied after tone mapping)
  fog: 0xe9ede7,
  bgTop: 0xeef0ea,
  bgBottom: 0xdce3dd,
};

const sunDir = () => new THREE.Vector3(...DAY.sunDir).normalize();
const lin = (hex) => new THREE.Color(hex); // THREE.Color stores linear values (colour management on)

// three r160's ACES Filmic (tonemapping_pars_fragment), on linear rgb
const ACES_IN = [[0.59719, 0.076, 0.0284], [0.35458, 0.90834, 0.13383], [0.04823, 0.01566, 0.83777]];
const ACES_OUT = [[1.60475, -0.10208, -0.00327], [-0.53108, 1.10813, -0.07276], [-0.07367, -0.00605, 1.07602]];
const m3 = (m, v) => [0, 1, 2].map((r) => m[0][r] * v[0] + m[1][r] * v[1] + m[2][r] * v[2]);
const rrt = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
export function acesTone(rgb, exposure = DAY.exposure) {
  return m3(ACES_OUT, m3(ACES_IN, rgb.map((x) => (x * exposure) / 0.6)).map(rrt)).map((x) => Math.min(1, Math.max(0, x)));
}
// the linear colour that ACES turns into `target` (fixed-point iteration; the curve is monotone per channel)
export function acesUntone(target, exposure = DAY.exposure) {
  const t = target.map((v) => Math.min(Math.max(v, 1e-4), 0.985));
  let x = t.slice();
  for (let i = 0; i < 80; i++) {
    const y = acesTone(x, exposure);
    x = x.map((v, k) => v * Math.pow(t[k] / Math.max(1e-6, y[k]), 0.7));
  }
  return x;
}

// irradiance (already divided by pi, as three's Lambert term does) a face with normal n gets from DAY, per channel
export function dayIrradiance(n, { sun = true } = {}) {
  const L = sunDir();
  const s = lin(DAY.sunColor), sky = lin(DAY.sky), gr = lin(DAY.ground);
  const nl = sun ? Math.max(0, n.x * L.x + n.y * L.y + n.z * L.z) : 0;
  const w = 0.5 * n.y + 0.5;
  return ['r', 'g', 'b'].map((c) => (s[c] * DAY.sunI * nl + DAY.hemiI * (sky[c] * w + gr[c] * (1 - w))) / Math.PI);
}
const FACE = { top: new THREE.Vector3(0, 1, 0), left: new THREE.Vector3(0, 0, 1), right: new THREE.Vector3(1, 0, 0) };

// The albedo that makes a face read `hex` on screen in DAY. `on`: 'top' (sunlit, up), 'left' (+Z, the face toward the
// viewer's left), 'right' (+X), a THREE.Vector3 normal, or a number: that share of a sunlit top's light (0.6 for a
// surface that is partly turned from the sun, 0.45 for one in the open shade).
export function paint(hex, on = 'top') {
  let E;
  if (typeof on === 'number') E = dayIrradiance(FACE.top).map((v) => v * on);
  else E = dayIrradiance(on.isVector3 ? on : FACE[on]);
  const t = lin(hex);
  const pre = acesUntone([t.r, t.g, t.b]);
  const a = pre.map((v, i) => Math.min(0.92, v / E[i]));
  return new THREE.Color(a[0], a[1], a[2]);
}
// a matte material painted to read `hex` (see paint)
export const dayMat = (hex, on = 'top', extra = {}) => new THREE.MeshStandardMaterial({ color: paint(hex, on), roughness: 0.9, metalness: 0, ...extra });

// Lime plaster for the world's big stone faces (2026-10-26 review: by day the large blocks read as blank cream fields).
// The albedo is varied in the shader from the world position, so it needs no uv and looks the same on every box,
// extrusion and stair: a soft cloudy mottle (about ±amp of the albedo) and, on vertical faces, faint horizontal board
// lines every `board` units (board-formed plaster), each board a hair lighter or darker than the next. The lines fade
// out where they would be thinner than a pixel, so far towers do not shimmer. bake() keeps these materials per
// material (they are never merged into the plain vertex-colour buckets), so a niche box is still one draw call.
export function plaster(mat, { amp = 0.035, board = 2.5, line = 0.05, lineK = 0.06, boardK = 0.018 } = {}) {
  mat.userData.plaster = true;
  mat.extensions = { ...(mat.extensions || {}), derivatives: true };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPl = { value: new THREE.Vector4(amp, board, line, lineK) };
    sh.uniforms.uPlB = { value: boardK };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPlPos;\nvarying vec3 vPlNrm;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPlPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPlNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vPlPos;
        varying vec3 vPlNrm;
        uniform vec4 uPl;
        uniform float uPlB;
        float plHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float plNoise(vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(plHash(i), plHash(i + vec3(1, 0, 0)), f.x), mix(plHash(i + vec3(0, 1, 0)), plHash(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(plHash(i + vec3(0, 0, 1)), plHash(i + vec3(1, 0, 1)), f.x), mix(plHash(i + vec3(0, 1, 1)), plHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float n = plNoise(vPlPos * 0.22) * 0.55 + plNoise(vPlPos * 0.9 + 7.1) * 0.3 + plNoise(vPlPos * 3.1 + 2.3) * 0.15;
          float k = 1.0 + (n - 0.5) * 2.0 * uPl.x;
          float vert = 1.0 - smoothstep(0.5, 0.8, abs(vPlNrm.y));
          float yb = vPlPos.y / uPl.y;
          float fw = fwidth(yb) * uPl.y;
          float d = min(fract(yb), 1.0 - fract(yb)) * uPl.y;
          float ln = (1.0 - smoothstep(uPl.z * 0.4, uPl.z + fw, d)) * (1.0 - smoothstep(0.05, 0.16, fw));
          k *= 1.0 - uPl.w * ln * vert;
          k *= 1.0 + (plHash(vec3(floor(yb), 3.7, 1.3)) - 0.5) * 2.0 * uPlB * vert;
          diffuseColor.rgb *= k;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `plaster${amp}|${board}|${line}|${lineK}|${boardK}`;
  return mat;
}

// theme 'day' (the hero, 2026-10-26) or 'night' (the old charcoal clay, kept for the project stills in final/stills)
export function makeMaterials(theme = 'day') {
  geoCache.clear();
  vcMats.clear();
  if (theme === 'day') return dayMaterials();
  return {
    block: std(0x2a2927),
    blockSand: std(0x2a2927),
    blockDark: std(0x242321),
    floor: std(0x282725),
    recess: std(0x121211),
    bone: std(0xf3ede2),
    boneSide: std(0xbcae96),
    boneTop: std(0xd3cfc8),
    ember: std(0xe86225),
    emberSide: std(0xb5491d),
    emberTop: std(0xcb7143),
    cream: std(0xd3c9b7),
    sand: std(0xc2b49c),
    clay: std(0xa8977c),
    rug: std(0xa99c86),
    ink: std(0x1e1d1b, { roughness: 0.75 }),
    wood: std(0x4a3f33),
    wire: std(0x0f0f0e),
    twig: std(0x6f6553),
    leaf: std(0x7d7458),
    skin: std(0xdcbf9f),
    hair: std(0x3b2b22),
    coat: std(0x252422),
    // the bath mirror: a pale grey disc a little smoother than the clay round it, never metallic (no environment map)
    mirror: std(0x8f8a82, { roughness: 0.45 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xf1c47f, emissive: 0xf1c47f, emissiveIntensity: 2.2, roughness: 0.5 }),
    // lit niche backs: a muted warm grey (SVG fallback #756550), so the ember D and F stay the only orange
    warm: std(0x6e6252, { emissive: 0x6a5d4c, emissiveIntensity: 0.4 }),
  };
}

// The daylight set. Same keys as the night set (the old furniture builders and world.js use them), new values.
function dayMaterials() {
  const M = {
    // light warm stone in lime plaster: tops #ECE6DB, faces to the left #DCD3C4, to the right #C4B9A6 (one albedo, the
    // light does the rest). blockSand is the second tier tone (the long block behind the letters, the left ledge), so
    // neighbouring tiers read apart by day and the big faces are not one blank field.
    block: plaster(dayMat(0xece6db, 'top', { roughness: 0.95 })),
    blockSand: plaster(dayMat(0xe2d7c5, 'top', { roughness: 0.95 }), { amp: 0.04 }),
    blockDark: dayMat(0xe4e8e1, 'left', { roughness: 0.95 }), // the far backdrop wall: melts into the sage air
    floor: dayMat(0xdce3dd, 'top', { roughness: 0.97 }), // the sage-grey ground the world stands on
    recess: dayMat(0xcbbfab, 'left', { roughness: 0.95 }), // the back of an unlit niche (in its own shade it reads darker)
    // letters by day: the page's own logo colouring (index.html .flatlogo): ink fronts (they face +Z, the left), a warm
    // grey thickness, ink-brown tops; D and F keep ember. (Bone fronts on the pale stone measured about 1.05:1 and the
    // logo read as "D F".)
    bone: dayMat(0x23221f, 'left', { roughness: 0.8 }),
    boneSide: dayMat(0x8f8778, 'right', { roughness: 0.8 }),
    boneTop: dayMat(0x4a4640, 'top', { roughness: 0.8 }),
    ember: dayMat(0xde622e, 'left', { roughness: 0.7 }),
    emberSide: dayMat(0xae4a1c, 'right', { roughness: 0.7 }),
    emberTop: dayMat(0xe8834f, 'top', { roughness: 0.7 }),
    cream: dayMat(0xf1ebe1, 'top'),
    sand: dayMat(0xdccdb6, 'top'),
    clay: dayMat(0xc3a789, 'top'),
    rug: dayMat(0xd8ccb8, 'top'),
    ink: dayMat(0x46413b, 'top', { roughness: 0.6 }),
    wood: dayMat(0xa77a52, 'top', { roughness: 0.7 }),
    wire: dayMat(0x3a3632, 'top', { roughness: 0.6 }),
    twig: dayMat(0x8c7457, 'top'),
    leaf: dayMat(0x7f9a6e, 'top'),
    skin: dayMat(0xe9c9a8, 'top', { roughness: 0.7 }),
    hair: dayMat(0x5a4032, 'top'),
    coat: dayMat(0x7c8a82, 'top'), // the seated figure's coat: a muted sage, so it reads against the stone
    mirror: dayMat(0xc9d0cf, 'left', { roughness: 0.3 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xfff0d8, emissive: 0xffd9a0, emissiveIntensity: 2.2, roughness: 0.5 }),
    // lit niche backs: a lamp-warm pale plaster, a little self-lit (a room seen through the doorway, lamps on)
    warm: dayMat(0xf2e2cc, 'left', { emissive: 0xf0c58e, emissiveIntensity: 0.2 }),
  };
  M.theme = 'day';
  return M;
}

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// rounded box from ranges [x0,x1],[y0,y1],[z0,z1]; r = 0 gives sharp edges (used where two pieces must meet seamlessly)
function boxGeo(w, h, d, r) {
  return r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 0.002))) : new THREE.BoxGeometry(w, h, d);
}

export function blk(mat, [x0, x1], [y0, y1], [z0, z1], r = 0.08) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const geo = shared(`b${w.toFixed(4)},${h.toFixed(4)},${d.toFixed(4)},${r}`, () => boxGeo(w, h, d, r));
  const m = shadowed(new THREE.Mesh(geo, mat));
  m.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  return m;
}

// rounded box by its floor centre
export function rbox(mat, w, h, d, x, y, z, r = 0.12) {
  return blk(mat, [x - w / 2, x + w / 2], [y, y + h], [z - d / 2, z + d / 2], r);
}

export function cyl(mat, rTop, rBottom, h, x, y, z, seg = 28) {
  const m = shadowed(new THREE.Mesh(shared(`c${rTop},${rBottom},${h},${seg}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg)), mat));
  m.position.set(x, y + h / 2, z);
  return m;
}

export function sphere(mat, r, x, y, z, seg = 24) {
  const m = shadowed(new THREE.Mesh(shared(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75))), mat));
  m.position.set(x, y, z);
  return m;
}

// Stairs: n steps of size run x rise, each a box from the floor (y = 0 or base) up to its tread.
// axis 'x' | 'z' is the walking direction, sign +1 / -1 along it; up = true climbs as it goes.
// The steps are merged into one mesh (one draw call per flight).
export function stairs(mat, { x, z, base = 0, top, n, rise, run, width, axis = 'x', sign = 1, up = false }) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const t = up ? top - rise * (n - 1 - i) : top - rise * i;
    const a = sign * run * i, b = sign * run * (i + 1);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const [x0, x1, z0, z1] = axis === 'x' ? [x + lo, x + hi, z, z + width] : [x, x + width, z + lo, z + hi];
    const geo = boxGeo(x1 - x0, t - base, z1 - z0, 0.04);
    geo.translate((x0 + x1) / 2, (base + t) / 2, (z0 + z1) / 2);
    parts.push(geo);
  }
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return shadowed(new THREE.Mesh(merged, mat));
}

// ── arches and niches ────────────────────────────────────────────────────────
// an arched opening along a face: a0..a1 across the face, from v0 (bottom) up to v1 where the half circle starts

function archPath(target, u0, u1, v0, v1, asHole) {
  const r = (u1 - u0) / 2;
  if (asHole) {
    target.moveTo(u0, v0);
    target.lineTo(u1, v0);
    target.lineTo(u1, v1);
    target.absarc(u0 + r, v1, r, 0, Math.PI, false);
    target.lineTo(u0, v0);
  }
}

// a slab facing +Z (face 'z', front at z1) or +X (face 'x', front at x1) with arched openings cut through it
function archSlab(mat, face, [x0, x1], [y0, y1], [z0, z1], openings) {
  const W = face === 'z' ? x1 - x0 : z1 - z0;
  const T = face === 'z' ? z1 - z0 : x1 - x0;
  const Hh = y1 - y0;
  const toU = face === 'z' ? (a) => a - x0 : (a) => z1 - a;
  const ops = openings.map((o) => ({ u0: Math.min(toU(o.a0), toU(o.a1)), u1: Math.max(toU(o.a0), toU(o.a1)), v0: o.v0 - y0, v1: o.v1 - y0 }));
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  for (const d of ops.filter((o) => o.v0 <= 1e-4).sort((p, q) => p.u0 - q.u0)) {
    const r = (d.u1 - d.u0) / 2;
    s.lineTo(d.u0, 0);
    s.lineTo(d.u0, d.v1);
    s.absarc(d.u0 + r, d.v1, r, Math.PI, 0, true);
    s.lineTo(d.u1, 0);
  }
  s.lineTo(W, 0);
  s.lineTo(W, Hh);
  s.lineTo(0, Hh);
  s.lineTo(0, 0);
  for (const o of ops.filter((q) => q.v0 > 1e-4)) {
    const p = new THREE.Path();
    archPath(p, o.u0, o.u1, o.v0, o.v1, true);
    s.holes.push(p);
  }
  const m = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 20 }), mat));
  if (face === 'z') m.position.set(x0, y0, z0);
  else {
    m.rotation.y = Math.PI / 2; // local +Z -> world +X, local +X -> world -Z
    m.position.set(x0, y0, z1);
  }
  return m;
}

// thin arch-shaped panel (the back of a niche), facing +Z or +X, its front at `at`
function archPanel(mat, face, a0, a1, v0, v1, at, t = 0.05) {
  const r = (Math.abs(a1 - a0)) / 2;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(2 * r, 0);
  s.lineTo(2 * r, v1 - v0);
  s.absarc(r, v1 - v0, r, 0, Math.PI, false);
  s.lineTo(0, 0);
  const m = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 20 }), mat), false, true);
  if (face === 'z') m.position.set(Math.min(a0, a1), v0, at - t);
  else {
    m.rotation.y = Math.PI / 2;
    m.position.set(at - t, v0, Math.max(a0, a1));
  }
  return m;
}

// A charcoal box with arched niches or doorways cut into its +Z face (zOps) and/or +X face (xOps).
// Each opening { a0, a1, v0, v1, lit } is `depth` deep; lit ones get a warm back and a small warm light inside.
// Sharp edges, so the slab carrying the openings meets the rest of the box without a seam.
export function nicheBox(M, mat, { x, y, z, zOps = [], xOps = [], zDepth = 1.2, xDepth = 1.2, lights = true }) {
  const g = new THREE.Group();
  const lamps = [];
  const [x0, x1] = x, [z0, z1] = z;
  const zd = zOps.length ? zDepth : 0;
  const xd = xOps.length ? xDepth : 0;
  g.add(blk(mat, [x0, x1 - xd], y, [z0, z1 - zd], 0));
  if (zd) g.add(archSlab(mat, 'z', [x0, x1], y, [z1 - zd, z1], zOps));
  if (xd) g.add(archSlab(mat, 'x', [x1 - xd, x1], y, [z0, z1 - zd], xOps));
  const back = (face, o, depth, front) => {
    const at = front - depth + 0.002;
    g.add(archPanel(o.lit ? M.warm : M.recess, face, o.a0, o.a1, o.v0, o.v1, at));
    if (o.lit && lights) {
      const cu = (o.a0 + o.a1) / 2;
      // a pale warm light at three quarters of `lit`: the arch reads lit warm grey (about #9e8569), never a second orange
      const light = new THREE.PointLight(0xffd9b0, o.lit * 0.75, (o.v1 - o.v0) * 1.6 + 4, 2);
      if (face === 'z') light.position.set(cu, o.v0 + (o.v1 - o.v0) * 0.7, front - depth * 0.45);
      else light.position.set(front - depth * 0.45, o.v0 + (o.v1 - o.v0) * 0.7, cu);
      g.add(light);
      lamps.push({ light, base: o.lit * 0.75 });
    }
  };
  zOps.forEach((o) => back('z', o, zd, z1));
  xOps.forEach((o) => back('x', o, xd, x1));
  g.userData.lamps = lamps;
  return g;
}

// ── soft contact shadow under furniture (the miniature's ambient occlusion) ────
// Daylight: many contact shadows in one mesh (one draw call per room): [[x, y, z, rx, rz, opacity], ...] in world units.
// A warm umber, never black: on light stone and oak a black blob reads as dirt.
let contactTex = null;
export function contacts(list, color = 0x4a3c2e) {
  if (!contactTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.55)');
    gr.addColorStop(0.8, 'rgba(255,255,255,.16)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    contactTex = new THREE.CanvasTexture(c);
  }
  const pos = [], uv = [], al = [], idx = [];
  list.forEach(([x, y, z, rx, rz, o = 0.4], i) => {
    const b = i * 4;
    pos.push(x - rx, y + 0.012, z - rz, x + rx, y + 0.012, z - rz, x + rx, y + 0.012, z + rz, x - rx, y + 0.012, z + rz);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    al.push(o, o, o, o);
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('alpha', new THREE.Float32BufferAttribute(al, 1));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ color, map: contactTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // per-shadow strength: the alpha attribute scales the texture's alpha
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float alpha;\nvarying float vAlpha;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvAlpha = alpha;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;').replace('#include <map_fragment>', 'diffuseColor.a *= texture2D( map, vMapUv ).r * vAlpha;');
  };
  mat.customProgramCacheKey = () => 'contacts';
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 1;
  return m;
}

let blobTex = null;
export function blob(x, y, z, rx, rz, opacity = 0.5) {
  if (!blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(8,8,7,1)');
    gr.addColorStop(0.55, 'rgba(8,8,7,.55)');
    gr.addColorStop(1, 'rgba(8,8,7,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(rx * 2, rz * 2),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.01, z);
  m.renderOrder = 1;
  return m;
}

// ── furniture (floor centre x, y, z; rot about y; front faces +Z before rotation) ──
function placed(g, x, y, z, rot = 0, s = 1) {
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  return g;
}

// low soft sofa
export function sofa(M, { x, y, z, rot = 0, len = 4.2, s = 1 }) {
  const g = new THREE.Group();
  const d = 1.7;
  g.add(rbox(M.cream, len, 0.55, d, 0, 0.1, 0, 0.22));
  g.add(rbox(M.cream, len - 0.2, 0.78, 0.55, 0, 0.45, -d / 2 + 0.3, 0.26));
  g.add(rbox(M.cream, 0.55, 0.7, d, -len / 2 + 0.28, 0.32, 0, 0.26));
  g.add(rbox(M.cream, 0.55, 0.7, d, len / 2 - 0.28, 0.32, 0, 0.26));
  g.add(rbox(M.sand, len - 1.2, 0.18, d - 0.6, 0, 0.62, 0.15, 0.08));
  g.add(rbox(M.ink, len - 0.3, 0.12, d - 0.2, 0, 0, 0, 0.04));
  return placed(g, x, y, z, rot, s);
}

// boxy lounge armchair, as in the key visual: a low seat block, a back at the rear, an arm on each side,
// all soft rounded clay boxes standing on the floor, and a sand cushion on the seat
export function loungeChair(M, { x, y, z, rot = 0, s = 1 }) {
  const g = new THREE.Group();
  g.add(rbox(M.cream, 1.9, 0.55, 1.7, 0, 0, 0.05, 0.18)); // seat block
  g.add(rbox(M.cream, 1.9, 1.3, 0.42, 0, 0, -0.64, 0.18)); // back
  for (const side of [-1, 1]) g.add(rbox(M.cream, 0.42, 0.9, 1.7, side * 0.74, 0, 0.05, 0.16)); // arms
  g.add(rbox(M.sand, 1.06, 0.16, 1.18, 0, 0.55, 0.18, 0.07)); // cushion
  return placed(g, x, y, z, rot, s);
}

export function ottoman(M, { x, y, z, rot = 0, s = 1 }) {
  return placed(new THREE.Group().add(rbox(M.cream, 2.0, 0.6, 1.0, 0, 0, 0, 0.2)), x, y, z, rot, s);
}

// dining chair: seat, tall back, square legs
export function diningChair(M, { x, y, z, rot = 0, s = 1 }) {
  const g = new THREE.Group();
  g.add(rbox(M.cream, 1.0, 0.24, 1.0, 0, 0.9, 0, 0.1));
  g.add(rbox(M.cream, 1.0, 1.55, 0.22, 0, 1.0, -0.42, 0.11));
  for (const [lx, lz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) g.add(rbox(M.cream, 0.15, 0.92, 0.15, lx, 0, lz, 0.05));
  return placed(g, x, y, z, rot, s);
}

// mushroom lamp: dark base, cream dome shade
export function mushroomLamp(M, { x, y, z, s = 1 }) {
  const g = new THREE.Group();
  g.add(cyl(M.ink, 0.42, 0.5, 0.75, 0, 0, 0, 24));
  g.add(cyl(M.sand, 0.07, 0.07, 0.5, 0, 0.75, 0, 10));
  const shade = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.cream));
  shade.scale.set(1, 0.62, 1);
  shade.position.set(0, 1.18, 0);
  g.add(shade);
  // the underside closes the open dome for the shadow pass too, so the shade casts a solid round shadow, not a ring
  const under = shadowed(new THREE.Mesh(new THREE.CircleGeometry(0.93, 32), M.sand), true, false);
  under.rotation.x = Math.PI / 2;
  under.position.set(0, 1.17, 0);
  g.add(under);
  return placed(g, x, y, z, 0, s);
}

// square coffee table with a dark tray, two stacked books on it and a bowl
// (the black vase with a twig belongs to the dining table alone, so the two tables do not carry the same still life)
export function coffeeTable(M, { x, y, z, rot = 0, s = 1, w = 3.2, d = 2.2 }) {
  const g = new THREE.Group();
  g.add(rbox(M.cream, w, 0.22, d, 0, 0.5, 0, 0.06));
  g.add(rbox(M.sand, w - 0.6, 0.5, d - 0.6, 0, 0, 0, 0.06));
  g.add(rbox(M.ink, 1.1, 0.1, 0.9, 0.25, 0.72, -0.1, 0.03));
  g.add(rbox(M.sand, 1.0, 0.12, 0.7, 0.3, 0.82, -0.12, 0.03));
  g.add(rbox(M.clay, 1.0, 0.12, 0.7, 0.4, 0.94, -0.02, 0.03));
  g.add(bowl(M, { x: -0.55, y: 0.72, z: 0.45, r: 0.36, mat: M.sand }));
  return placed(g, x, y, z, rot, s);
}

// black vase with a twig
export function vaseTwig(M, { x, y, z, s = 1 }) {
  const g = new THREE.Group();
  g.add(cyl(M.ink, 0.22, 0.26, 0.9, 0, 0, 0, 20));
  const twig = (len, rx, rz) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, len, 5), M.twig);
    t.geometry.translate(0, len / 2, 0);
    t.position.set(0, 0.85, 0);
    t.rotation.set(rx, 0, rz);
    g.add(t);
    return new THREE.Vector3(0, len, 0).applyEuler(t.rotation).add(t.position);
  };
  for (const tp of [twig(1.5, 0.1, -0.12), twig(1.15, -0.25, 0.32), twig(0.95, 0.35, 0.18)]) {
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), M.leaf);
      leaf.scale.set(1, 0.5, 1.6);
      leaf.position.copy(tp).add(new THREE.Vector3(Math.sin(i * 2.1) * 0.14, -i * 0.13, Math.cos(i * 1.7) * 0.14));
      g.add(leaf);
    }
  }
  return placed(g, x, y, z, 0, s);
}

export function bowl(M, { x, y, z, r = 0.45, mat }) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  geo.scale(1, 0.55, 1);
  const material = (mat ?? M.ink).clone();
  material.side = THREE.DoubleSide;
  const m = shadowed(new THREE.Mesh(geo, material));
  m.position.y = r * 0.55;
  g.add(m);
  return placed(g, x, y, z);
}

// long oval (stadium) table on two dark legs, a black vase with a twig and a dark bowl on top
export function ovalTable(M, { x, y, z, half = 3, r = 2.65, h = 3.2, rot = 0 }) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.absarc(half, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(-half, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  const top = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2, curveSegments: 32 });
  top.rotateX(Math.PI / 2);
  const tm = shadowed(new THREE.Mesh(top, M.cream));
  tm.position.y = h;
  g.add(tm);
  g.add(rbox(M.ink, 0.55, h - 0.4, r * 1.1, -half * 0.75, 0, 0, 0.1));
  g.add(rbox(M.ink, 0.55, h - 0.4, r * 1.1, half * 0.75, 0, 0, 0.1));
  g.add(vaseTwig(M, { x: half * 0.55, y: h + 0.07, z: -0.7, s: 1.4 }));
  g.add(bowl(M, { x: -half * 0.35, y: h + 0.07, z: 0.6, r: 0.75 }));
  return placed(g, x, y, z, rot);
}

// ── one room per level (hero.js): each piece below appears once in the hero ──
// stadium (two half circles joined by straight sides) lying flat, `half` from the centre to each circle centre
function stadiumGeo(half, r, depth, bevel = 0.07) {
  const s = new THREE.Shape();
  s.absarc(half, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(-half, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 24 });
  geo.rotateX(Math.PI / 2); // lies flat, from y = 0 down to -depth: callers lift it into place
  return geo;
}

// living room: floor lamp with a round dark base, a thin pole and a cream drum shade
export function floorLamp(M, { x, y, z, s = 1 }) {
  const g = new THREE.Group();
  g.add(cyl(M.ink, 0.5, 0.56, 0.14, 0, 0, 0, 24));
  // the pole and shade cast no shadow: from this low key light their long shadow read as a dark object on the floor
  g.add(shadowed(cyl(M.ink, 0.06, 0.06, 4.4, 0, 0.14, 0, 8), false, true));
  g.add(shadowed(cyl(M.cream, 0.78, 0.98, 1.35, 0, 4.25, 0, 28), false, true));
  return placed(g, x, y, z, 0, s);
}

// kitchen: a run of cream base cabinets on a dark plinth, a sand worktop with a sink, a tall faucet and two jars.
// Its back stands against a wall; the doors face +Z.
export function kitchenCounter(M, { x, y, z, w = 8, d = 2.2, h = 3, rot = 0 }) {
  const g = new THREE.Group();
  g.add(rbox(M.ink, w - 0.3, 0.32, d - 0.35, 0, 0, -0.1, 0.04)); // recessed plinth
  g.add(rbox(M.cream, w, h - 0.55, d, 0, 0.3, 0, 0.08)); // cabinets
  g.add(rbox(M.sand, w + 0.12, 0.26, d + 0.1, 0, h - 0.26, 0.04, 0.05)); // worktop
  for (const u of [-w / 4, 0, w / 4]) g.add(rbox(M.clay, 0.05, h - 1.0, 0.04, u, 0.55, d / 2 + 0.01, 0)); // door seams
  g.add(rbox(M.ink, 1.5, 0.05, d * 0.5, w * 0.16, h, 0.12, 0.02)); // sink
  g.add(cyl(M.ink, 0.07, 0.07, 1.0, w * 0.16, h, -d / 2 + 0.35, 8)); // faucet
  g.add(rbox(M.ink, 0.12, 0.12, 0.6, w * 0.16, h + 0.9, -d / 2 + 0.6, 0.03));
  g.add(cyl(M.clay, 0.3, 0.3, 0.75, -w / 2 + 0.8, h, -0.2, 16)); // jars
  g.add(cyl(M.cream, 0.24, 0.26, 0.5, -w / 2 + 1.5, h, 0.1, 16));
  return placed(g, x, y, z, rot);
}

// bedroom: a low platform bed, head toward -Z: a sand base, a cream mattress, two pillows and a folded clay throw at the foot
export function bed(M, { x, y, z, w = 6, l = 7.6, rot = 0 }) {
  const g = new THREE.Group();
  g.add(rbox(M.sand, w, 0.75, l, 0, 0, 0, 0.12));
  g.add(rbox(M.cream, w - 0.25, 0.8, l - 0.3, 0, 0.7, 0.05, 0.3));
  for (const side of [-1, 1]) g.add(rbox(M.cream, w / 2 - 0.45, 0.5, 1.25, side * (w / 4 - 0.02), 1.42, -l / 2 + 1.0, 0.24));
  g.add(rbox(M.clay, w + 0.04, 0.42, 1.5, 0, 1.12, l / 2 - 1.35, 0.14)); // throw folded over the mattress
  return placed(g, x, y, z, rot);
}

// bedside table with one drawer and a small cream lamp
export function nightstand(M, { x, y, z, s = 1, rot = 0 }) {
  const g = new THREE.Group();
  g.add(rbox(M.cream, 1.6, 1.5, 1.5, 0, 0, 0, 0.1));
  g.add(rbox(M.clay, 1.2, 0.05, 0.04, 0, 1.0, 0.76, 0)); // drawer seam
  g.add(cyl(M.ink, 0.22, 0.26, 0.14, 0.15, 1.5, -0.1, 16));
  g.add(cyl(M.ink, 0.045, 0.045, 0.55, 0.15, 1.62, -0.1, 6));
  g.add(cyl(M.sand, 0.32, 0.44, 0.55, 0.15, 2.05, -0.1, 20));
  return placed(g, x, y, z, rot, s);
}

// bath: a freestanding oval tub, its long axis along X, with a darker basin inside the rim
export function tub(M, { x, y, z, half = 1.25, r = 1.0, h = 1.35, rot = 0 }) {
  const g = new THREE.Group();
  const shell = shadowed(new THREE.Mesh(stadiumGeo(half, r, h - 0.14, 0.12), M.cream));
  shell.position.y = h - 0.12;
  g.add(shell);
  const basin = shadowed(new THREE.Mesh(stadiumGeo(half - 0.05, r - 0.24, 0.05, 0), M.sand), false, true);
  basin.position.y = h + 0.006;
  g.add(basin);
  const water = shadowed(new THREE.Mesh(stadiumGeo(half - 0.15, r - 0.36, 0.02, 0), M.clay), false, true);
  water.position.y = h + 0.03;
  g.add(water);
  return placed(g, x, y, z, rot);
}

// bath: a slim wall-hung vanity with a vessel basin, and a round mirror on the wall above it (the wall is behind, at -Z).
// The counter top is at 3.2, a little above the dining table (2.87), as a real vanity is
export function vanity(M, { x, y, z, w = 3, mirrorY = 5.3, mirrorR = 0.95, rot = 0 }) {
  const g = new THREE.Group();
  g.add(rbox(M.cream, w, 0.55, 1.15, 0, 2.65, 0, 0.1));
  g.add(bowl(M, { x: w * 0.12, y: 3.2, z: 0.05, r: 0.42, mat: M.sand }));
  g.add(cyl(M.ink, 0.04, 0.04, 0.55, w * 0.12, 3.2, -0.45, 6));
  const disc = (mat, rr, t, dz) => {
    const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, t, 40), mat), true, true);
    m.rotation.x = Math.PI / 2;
    m.position.set(0, mirrorY, -0.575 + dz + t / 2);
    return m;
  };
  g.add(disc(M.cream, mirrorR, 0.12, 0));
  g.add(disc(M.mirror, mirrorR - 0.16, 0.05, 0.12));
  return placed(g, x, y, z, rot);
}

// study: a writing desk, a cream top on two sand slab legs, a slim drawer under one side
export function desk(M, { x, y, z, w = 5.4, d = 2.2, h = 2.4, rot = 0 }) {
  const g = new THREE.Group();
  g.add(rbox(M.cream, w, 0.24, d, 0, h - 0.24, 0, 0.06));
  for (const side of [-1, 1]) g.add(rbox(M.sand, 0.26, h - 0.24, d - 0.25, side * (w / 2 - 0.3), 0, 0, 0.05));
  g.add(rbox(M.sand, w * 0.36, 0.4, d - 0.4, w * 0.18, h - 0.64, 0, 0.04));
  g.add(rbox(M.ink, 1.3, 0.12, 0.9, -w * 0.18, h, 0.1, 0.03)); // an open notebook in dark card
  return placed(g, x, y, z, rot);
}

// study: a swivel chair (round dark foot, one post, round cream seat, a low curved back), facing +Z
export function deskChair(M, { x, y, z, s = 1, rot = 0 }) {
  const g = new THREE.Group();
  g.add(cyl(M.ink, 0.55, 0.6, 0.1, 0, 0, 0, 20));
  g.add(cyl(M.ink, 0.07, 0.07, 0.8, 0, 0.1, 0, 8));
  g.add(cyl(M.cream, 0.66, 0.62, 0.26, 0, 0.88, 0, 28));
  g.add(rbox(M.cream, 1.15, 0.7, 0.22, 0, 1.22, -0.5, 0.1));
  return placed(g, x, y, z, rot, s);
}

// study: a low open bookshelf, open toward +Z, two rows of books in clay, sand and dark card
export function bookshelf(M, { x, y, z, w = 4.4, h = 2.3, d = 1.3, rot = 0 }) {
  const g = new THREE.Group();
  const t = 0.16;
  g.add(rbox(M.sand, w - 0.1, h - 0.1, 0.12, 0, 0.05, -d / 2 + 0.07, 0)); // back
  for (const side of [-1, 1]) g.add(rbox(M.cream, t, h, d, side * (w / 2 - t / 2), 0, 0, 0.04));
  g.add(rbox(M.cream, w, t, d, 0, h - t, 0, 0.04)); // top
  // the bottom, the shelf and the books are plain boxes (12 triangles each, not 300): at a few pixels wide on screen
  // their rounding never shows
  g.add(rbox(M.cream, w - 2 * t, t, d - 0.05, 0, 0, 0, 0)); // bottom
  g.add(rbox(M.cream, w - 2 * t, 0.12, d - 0.1, 0, h / 2 - 0.06, 0, 0)); // shelf
  const rowH = h / 2 - t - 0.06;
  const mats = [M.clay, M.ink, M.sand, M.clay, M.wood, M.sand, M.ink];
  for (const [row, y0] of [[0, t], [1, h / 2 + 0.06]]) {
    let u = -w / 2 + t + 0.08;
    const end = row ? w * 0.08 : w / 2 - t - 0.08; // the upper row leaves room for a small bowl
    let i = row * 3;
    while (u < end - 0.2) {
      const bw = 0.2 + ((i * 37) % 5) * 0.03;
      const bh = rowH * (0.72 + ((i * 53) % 4) * 0.07);
      g.add(rbox(mats[i % mats.length], bw, bh, d * 0.62, u + bw / 2, y0, 0.05, 0));
      u += bw + 0.03;
      i++;
    }
  }
  g.add(bowl(M, { x: w * 0.28, y: h / 2 + 0.06, z: 0.05, r: 0.36, mat: M.ink }));
  return placed(g, x, y, z, rot);
}

// Furniture is many small meshes. Bake one piece (or a whole room) into few meshes, in world space, so each room costs a
// handful of draw calls instead of hundreds:
//   - plain-coloured opaque standard materials (no map, no glow) are merged by finish (roughness, metalness, side,
//     shadows) into one mesh with the colour carried per vertex: a sofa, its cushions, the books and the vases of a room
//     all become one draw call. A geometry's own vertex colours (leaves) are multiplied in.
//   - textured materials (wood grain, rugs, stone, prints) are merged per material and keep their uv.
//   - glowing, transparent or special materials stay as they are.
// Clipping planes, emissive or textured: kept per material. Night-theme callers get the same merge by material.
const vcMats = new Map();
function finishMaterial(rough, metal, side) {
  const key = `${rough}|${metal}|${side}`;
  if (!vcMats.has(key)) {
    vcMats.set(key, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: metal, side }));
  }
  return vcMats.get(key);
}
export function resetBakeCache() {
  vcMats.clear();
}
export function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const out = new THREE.Group();
  const plain = (m) =>
    m.isMeshStandardMaterial && !m.map && !m.transparent && !(m.emissiveIntensity > 0 && m.emissive && m.emissive.getHex() !== 0) && !m.clippingPlanes?.length && !m.userData.keep && !m.userData.plaster;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material;
    if (mat.transparent || mat.userData.keep || !mat.isMeshStandardMaterial) {
      const keep = o.clone();
      o.matrixWorld.decompose(keep.position, keep.quaternion, keep.scale);
      out.add(keep);
      return;
    }
    const sh = `${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}`;
    const vc = plain(mat);
    // finishes snap to three levels (glossy, satin, matte) and two of metalness: fewer buckets, fewer draw calls
    const rough = mat.roughness < 0.5 ? 0.35 : mat.roughness < 0.8 ? 0.65 : 0.93, metal = mat.metalness > 0.1 ? 0.25 : 0;
    const key = vc ? `vc|${rough}|${metal}|${mat.side}|${sh}` : `${mat.uuid}|${sh}`;
    if (!buckets.has(key)) buckets.set(key, { material: vc ? finishMaterial(rough, metal, mat.side) : mat, vc, cast: o.castShadow, receive: o.receiveShadow, geos: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const n = g.attributes.position.count;
    if (vc) {
      const col = new Float32Array(n * 3);
      const own = g.attributes.color;
      const c = mat.color;
      for (let i = 0; i < n; i++) {
        col[i * 3] = c.r * (own ? own.getX(i) : 1);
        col[i * 3 + 1] = c.g * (own ? own.getY(i) : 1);
        col[i * 3 + 2] = c.b * (own ? own.getZ(i) : 1);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const keepNames = vc ? ['position', 'normal', 'color'] : mat.map ? ['position', 'normal', 'uv'] : ['position', 'normal'];
    for (const name of Object.keys(g.attributes)) if (!keepNames.includes(name)) g.deleteAttribute(name);
    if (!vc && mat.map && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    g.clearGroups();
    g.applyMatrix4(o.matrixWorld);
    // a mirrored transform (negative scale) turns the triangles inside out: flip them back
    if (o.matrixWorld.determinant() < 0) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        for (const a of Object.values(g.attributes)) {
          for (let k = 0; k < a.itemSize; k++) {
            const t = a.array[(i + 1) * a.itemSize + k];
            a.array[(i + 1) * a.itemSize + k] = a.array[(i + 2) * a.itemSize + k];
            a.array[(i + 2) * a.itemSize + k] = t;
          }
        }
      }
    }
    buckets.get(key).geos.push(g);
  });
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.material);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    out.add(m);
  }
  return out;
}

// small seated figure in a cream knitted beanie, facing +Z: a big toy-like head on an upright coat, sitting cross-legged
// (knees out to the sides, shins crossed low in front, feet tucked under the opposite knees), the arms hanging from the
// shoulders close to the body and the hands resting on the knees
export function figure(M, { x, y, z, rot = 0, s = 1 }) {
  const g = new THREE.Group();
  const UP = new THREE.Vector3(0, 1, 0);
  // a capsule from joint a to joint b (round ends, so two limbs meeting at a joint make a smooth elbow or knee)
  const limb = (r, a, b, mat) => {
    const A = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(A);
    const m = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 12), mat));
    m.position.copy(A).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  };
  // the coat: a lathed toy body, the hips a little wider than the waist, round shoulders, a little flatter front to back
  const coat = [[0, 0.09], [0.2, 0.1], [0.28, 0.16], [0.3, 0.27], [0.28, 0.42], [0.26, 0.56], [0.262, 0.68], [0.24, 0.78], [0.18, 0.86], [0.09, 0.92], [0, 0.93]];
  const body = shadowed(new THREE.Mesh(new THREE.LatheGeometry(coat.map(([r, h]) => new THREE.Vector2(r, h)), 28), M.coat));
  body.scale.set(1, 1, 0.84);
  body.position.z = -0.02;
  g.add(body);
  for (const side of [-1, 1]) {
    const front = side > 0; // this leg's shin crosses in front of the other
    const knee = [side * 0.43, 0.165, 0.22];
    g.add(limb(0.125, [side * 0.12, 0.15, -0.01], knee, M.coat)); // thigh, out to the side
    // shin: from the knee, low across the front, the foot under the other knee
    const foot = [-side * 0.31, 0.085, front ? 0.24 : 0.1];
    g.add(limb(0.1, [side * 0.42, front ? 0.12 : 0.11, front ? 0.32 : 0.24], foot, M.coat));
    const shoe = sphere(M.ink, 0.075, -side * 0.42, 0.06, foot[2] + 0.06, 10); // only the toe shows under the knee
    shoe.scale.set(1.3, 0.7, 0.95);
    g.add(shoe);
    // arm hanging from the shoulder, the elbow against the coat, the forearm forward to the knee
    const shoulder = [side * 0.235, 0.74, -0.02], elbow = [side * 0.345, 0.47, 0.05], wrist = [side * 0.385, 0.345, 0.2];
    g.add(limb(0.072, shoulder, elbow, M.coat));
    g.add(limb(0.066, elbow, wrist, M.coat));
    const palm = sphere(M.skin, 0.072, side * 0.405, 0.315, 0.275, 10); // hand resting on the knee
    palm.scale.set(1, 0.78, 1.1);
    g.add(palm);
  }
  const head = sphere(M.skin, 0.34, 0, 1.22, 0.03, 24);
  g.add(head);
  for (const side of [-1, 1]) g.add(sphere(M.ink, 0.032, side * 0.12, 1.2, 0.35, 8)); // eyes
  // bob haircut round the back and sides of the head
  const hair = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 14, Math.PI * 0.95, Math.PI * 1.1, 0, Math.PI * 0.72), M.hair));
  hair.position.set(0, 1.24, 0.02);
  g.add(hair);
  // knitted beanie: dome, folded band, pompom
  const hat = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.cream));
  hat.scale.set(1, 1.08, 1);
  hat.position.set(0, 1.36, 0.01);
  g.add(hat);
  g.add(cyl(M.cream, 0.385, 0.385, 0.15, 0, 1.28, 0.01, 24));
  g.add(sphere(M.cream, 0.13, 0, 1.8, 0.01, 14));
  return placed(g, x, y, z, rot, s);
}

// warm halo sprite round a bulb
let haloTex = null;
function haloMaterial() {
  if (!haloTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,214,150,0.9)');
    gr.addColorStop(0.25, 'rgba(241,196,127,0.35)');
    gr.addColorStop(1, 'rgba(241,196,127,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    haloTex = new THREE.CanvasTexture(c);
    haloTex.colorSpace = THREE.SRGBColorSpace;
  }
  return new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 });
}

// small bulb hanging from the ceiling on a thin wire. Its glass is its own material so it can switch on by itself.
export function bulb(M, { x, y, z, top = 90, intensity = 12, distance = 8, light = true }) {
  const g = new THREE.Group();
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, top - y, 4), M.wire);
  wire.position.set(x, y + (top - y) / 2 + 0.25, z);
  g.add(wire);
  g.add(cyl(M.ink, 0.07, 0.07, 0.16, x, y + 0.2, z, 8));
  const glass = M.glow.clone();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), glass);
  b.scale.set(1, 1.3, 1);
  b.position.set(x, y + 0.05, z);
  g.add(b);
  const halo = new THREE.Sprite(haloMaterial());
  halo.scale.set(1.9, 1.9, 1);
  halo.position.set(x, y + 0.05, z);
  halo.renderOrder = 10;
  g.add(halo);
  g.userData = { glass, halo, base: intensity };
  if (light) {
    const p = new THREE.PointLight(0xffd9b0, intensity, distance, 2);
    p.position.set(x, y - 0.05, z);
    g.add(p);
    g.userData.light = p;
  }
  return g;
}

// cream picture frame on a +Z wall with a crescent in relief: a clay disc half covered by a raised cream disc
export function crescentFrame(M, { x0, x1, y0, y1, z, t = 0.3 }) {
  const g = new THREE.Group();
  g.add(blk(M.cream, [x0, x1], [y0, y1], [z, z + t], 0.05));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.min(x1 - x0, y1 - y0) * 0.3;
  const disc = (mat, rr, dx, dy, th) => {
    const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, th, 40), mat));
    m.rotation.x = Math.PI / 2;
    m.position.set(cx + dx, cy + dy, z + t + th / 2);
    return m;
  };
  g.add(disc(M.clay, r, 0, 0, 0.08));
  g.add(disc(M.cream, r * 0.9, r * 0.3, r * 0.3, 0.2));
  return g;
}

// ── DEEP / FLAT ──────────────────────────────────────────────────────────────
// Each letter sits in a pivot at its baseline and back plane, so it can rise out of the surface below it
// (a clipping plane per row hides what is still underneath) and push its face forward (scale.z).
// D and F use the ember materials, the rest bone; both share the same lights so they read as one clay.
// Each letter has three materials: front (and back) caps, sides, and the up-facing faces (tops), which are the brightest.
export function buildLetters(M, { depth = 1.35, base = 0 } = {}) {
  const group = new THREE.Group();
  const letters = [];
  const rowClip = [
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -(base + H + LEADING / 2)), // DEEP grows out of the seam above FLAT
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -base), // FLAT grows out of the plinth
  ];
  const mats = new Map();
  const matFor = (line, ember) => {
    const key = line + (ember ? 'e' : 'b');
    if (!mats.has(key)) {
      const f = (ember ? M.ember : M.bone).clone();
      const s = (ember ? M.emberSide : M.boneSide).clone();
      const t = (ember ? M.emberTop : M.boneTop).clone();
      for (const m of [f, s, t]) {
        m.clippingPlanes = [rowClip[line]];
        m.clipShadows = true;
      }
      mats.set(key, [f, s, t]);
    }
    return mats.get(key);
  };
  const back = -(depth + 0.14);
  for (const item of layout()) {
    const geo = new THREE.ExtrudeGeometry(toShape(THREE, item.glyph), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.translate(0, 0, 0.07);
    splitTops(geo);
    const ember = isEmber(item.line, item.index);
    const mesh = shadowed(new THREE.Mesh(geo, matFor(item.line, ember)));
    const pivot = new THREE.Group();
    pivot.position.set(item.x, base + item.y, back);
    pivot.add(mesh);
    group.add(pivot);
    letters.push({ pivot, y: base + item.y, line: item.line, index: item.index, ch: item.ch, ember });
  }
  return { group, letters, back };
}

// ExtrudeGeometry has two groups (0 caps, 1 sides). Move the side triangles that face up into a third group (material 2).
// The geometry is non-indexed with flat normals, so every triangle is three consecutive vertices.
function splitTops(geo) {
  const caps = geo.groups[0], sides = geo.groups[1];
  if (!caps || !sides) return;
  const ny = geo.attributes.normal;
  const side = [], top = [];
  for (let v = sides.start; v < sides.start + sides.count; v += 3) {
    const y = (ny.getY(v) + ny.getY(v + 1) + ny.getY(v + 2)) / 3;
    (y > 0.7 ? top : side).push(v, v + 1, v + 2);
  }
  const idx = [];
  for (let v = 0; v < sides.start; v++) idx.push(v);
  idx.push(...side, ...top);
  geo.setIndex(idx);
  geo.clearGroups();
  geo.addGroup(0, sides.start, 0);
  geo.addGroup(sides.start, side.length, 1);
  geo.addGroup(sides.start + side.length, top.length, 2);
}

// Daylight (DAY): a sky / ground hemisphere and the warm sun from the viewer's upper left, shadows from the sun only.
// Irradiance ratios (pre tone mapping): tops 1, faces to the viewer's left about 0.6, to the right about 0.36, a top in
// shadow about 0.57: soft shadows on a bright day. `soft` widens the shadow filter (PCF radius, in texels).
export function addLights(scene, { center = new THREE.Vector3(), span = 40, mapSize = 2048, soft = true } = {}) {
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemiI);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(DAY.sunColor, DAY.sunI);
  key.position.copy(center).addScaledVector(sunDir(), 160);
  key.target.position.copy(center);
  key.castShadow = true;
  key.shadow.mapSize.set(mapSize, mapSize);
  const c = key.shadow.camera;
  c.left = -span; c.right = span; c.top = span; c.bottom = -span; c.near = 1; c.far = 360;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.11; // about two texels of the world-wide map: no acne on grazing stone faces
  key.shadow.radius = soft === true ? 2.5 : soft || 1;
  scene.add(key, key.target);
  return { hemi, key, base: { hemi: hemi.intensity, key: key.intensity } };
}

// the backdrop: a soft vertical sage-grey gradient (sRGB, so it is shown as it is, not tone mapped)
export function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  const hex = (h) => '#' + h.toString(16).padStart(6, '0');
  gr.addColorStop(0, hex(DAY.bgTop));
  gr.addColorStop(1, hex(DAY.bgBottom));
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
