// Still-render helpers for DEEPFLAT images (brand picture, project details, the hero's static scenes, the carousel).
// Daylight (2026-10-26): the same world and light as the 3D hero (../3d/kit.js DAY): pale stone, the home's woods and
// fabrics as they read in the sun, a warm sun from the viewer's upper left and a sage-grey sky. A still has time the
// live hero does not, so each image is an average of many frames: the camera jitters by a sub-pixel (anti-aliasing),
// the sun jitters inside a small disc (soft penumbras), and a shadowed "sky" light walks over the upper hemisphere (soft
// ambient occlusion in corners); the average is tone mapped with the hero's ACES curve (accumulate({ tone })).
// The night helpers (stillLights, beamLight, the night branch of accumulate) are kept for reference renders.
import { THREE, blk, rbox, cyl, sphere, bowl, blob, makeMaterials, dayMat, paint, DAY } from '../3d/kit.js';
import { texMat } from '../3d/props.js';

export { THREE };

// ── materials ───────────────────────────────────────────────────────────────
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.93, metalness: 0, ...extra });

// A home's palette, read as the colours its materials show in the sun (paint): the palettes in homes.js were drawn for
// the old charcoal clay, so each is lifted toward the light by `lift` of its distance to white in HSL lightness (its hue
// and a little more of its saturation kept): linen creams come out near the hero's #F1EBE1, a walnut floor a warm mid
// brown, never the night's near-black. keys: cream (fabric, furniture), sand, clay, wood (floor boards), woodDark
// (accents), stone (wet rooms, tops), cab (built-in joinery), feature (one wall panel), block (the walls), and the
// extras homes.js reads (plaster, louver, terracotta, cork, brass, deck, gravel, stair, table, leaf).
const hsl = {};
export function daylit(hex, lift = 0.3, sat = 1.1) {
  const c = new THREE.Color(hex);
  c.getHSL(hsl, THREE.SRGBColorSpace);
  c.setHSL(hsl.h, Math.min(1, hsl.s * sat), hsl.l + (1 - hsl.l) * lift, THREE.SRGBColorSpace);
  return c.getHex(THREE.SRGBColorSpace);
}
export function homeMaterials(p = {}) {
  const M = makeMaterials('day');
  const mat = (hex, lift, extra = {}, on = 'top') => dayMat(daylit(hex, lift), on, { roughness: 0.9, ...extra });
  const set = (k, hex, lift) => hex != null && M[k].color.copy(paint(daylit(hex, lift), 'top'));
  set('cream', p.cream, 0.45);
  set('sand', p.sand, 0.38);
  set('clay', p.clay, 0.3);
  set('rug', p.rug, 0.36);
  set('wood', p.woodDark, 0.22);
  // the walls: the hero's pale warm stone, smooth (the hero's board-formed plaster is for the world's outside blocks;
  // inside a home it would read as lines across every room). A home's own wall tone (p.block) is not lifted: by day
  // a pale tint of a grey concrete read cold blue in the shade.
  M.block = dayMat(0xece6db, 'top', { roughness: 0.95 });
  M.floorWood = mat(p.wood ?? 0x8f8069, 0.24, { roughness: 0.62 });
  M.floorStone = mat(p.stone ?? 0x9d978c, 0.4, { roughness: 0.5 });
  M.cab = mat(p.cab ?? 0xc9bfad, 0.3, { roughness: 0.6 });
  M.feature = mat(p.feature ?? 0x8b8478, 0.36);
  M.stone = mat(p.stoneTop ?? p.stone ?? 0xb9b2a5, 0.4, { roughness: 0.45 });
  M.inner = M.block; // the wall faces inside a room close-up: the same plaster
  M.plate = dayMat(0xe0d6c6, 'top', { roughness: 0.95 }); // the sand plinth a home stands on
  M.floor = dayMat(0xe9e3d8, 'top', { roughness: 0.95 }); // the wider model base under the plinth (overviews)
  M.ground = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }); // see dayGround()
  M.shade = mat(p.cream ?? 0xd3c9b7, 0.5, { emissive: 0xffe2b8, emissiveIntensity: 0.12 });
  M.daylight = new THREE.MeshBasicMaterial({ color: 0xf4f5f0, side: THREE.DoubleSide }); // what a window shows: bright sky
  M.glass = new THREE.MeshStandardMaterial({ color: 0xdfe6e3, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
  M.leafDark = dayMat(p.leaf ? daylit(p.leaf, 0.25, 1.4) : 0x6f8a62, 'top', { roughness: 0.7 });
  M.table = mat(p.table ?? p.cab ?? 0xc9bfad, 0.24, { roughness: 0.6 });
  M.deck = mat(p.deck ?? 0x6d6152, 0.3, { roughness: 0.8 });
  M.gravel = mat(p.gravel ?? 0x55524b, 0.62, { roughness: 1 }, 'top');
  M.stair = p.stair ? mat(p.stair, 0.3) : M.block;
  M.glow.emissiveIntensity = 0.5; // a pendant's lit underside, by day
  if (p.terrazzo) M.floorStone = texMat(terrazzoTexture(dayTerrazzo(p.terrazzo)), { roughness: 0.5 });
  // Thick walls cast from their outer faces: by default three.js stores the far (inner) face in the shadow map, so light
  // from outside leaked as a thin bright line where an inner wall face meets the floor or another wall.
  for (const k of ['block', 'blockDark', 'warm', 'plate']) M[k].shadowSide = THREE.FrontSide;
  return M;
}

// The ground under a still: a sage plane, deeper toward the back of the picture and paler toward the viewer (as in the
// reference image), as vertex colours (linear albedo for a sunlit top). az: the camera's azimuth (it looks from
// (sin az, cos az)); [d0, d1]: the distances along the view, in scene units, over which it turns from far to near.
export function dayGround(size, y, { az = (37 * Math.PI) / 180, d0 = -40, d1 = 20, far = 0xc3cfc6, near = 0xdde4de, seg = 120 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const F = paint(far, 'top'), N = paint(near, 'top');
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const sx = Math.sin(az), sz = Math.cos(az);
  for (let i = 0; i < pos.count; i++) {
    const d = pos.getX(i) * sx + pos.getZ(i) * sz;
    const t = Math.min(1, Math.max(0, (d - d0) / (d1 - d0)));
    const k = t * t * (3 - 2 * t);
    col[i * 3] = F.r + (N.r - F.r) * k;
    col[i * 3 + 1] = F.g + (N.g - F.g) * k;
    col[i * 3 + 2] = F.b + (N.b - F.b) * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 }));
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

// Daylight for a still (the carousel's rig, in any units): the hero's sky as a hemisphere plus a shadowed light that
// wanders over the dome between frames, and the sun from `sunDir` (toward the sun) wandering over a small disc.
// radius: the half size of the shadow cameras (scene units). Returns { jitter(i) }.
export function dayLights(scene, { center, radius, sunDir = [-0.5, 0.72, 0.48], sunK = 0.95, hemiK = 0.55, skyK = 0.62, soft = 0.045, unit = 1 }) {
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemiI * hemiK);
  scene.add(hemi);
  const dir = new THREE.Vector3(...sunDir).normalize();
  const sun = new THREE.DirectionalLight(DAY.sunColor, DAY.sunI * sunK);
  const sky = new THREE.DirectionalLight(DAY.sky, DAY.hemiI * skyK);
  const far = radius * 3 + 20;
  for (const L of [sun, sky]) {
    L.castShadow = true;
    L.shadow.mapSize.set(4096, 4096);
    const c = L.shadow.camera;
    c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius; c.near = 0.5; c.far = far * 2;
    L.shadow.bias = -0.00025;
    L.shadow.normalBias = 0.012 * unit;
    L.target.position.copy(center);
    scene.add(L, L.target);
  }
  sky.shadow.mapSize.set(2048, 2048);
  sky.shadow.normalBias = 0.02 * unit;
  const [su, sv] = frameOf(dir);
  return {
    hemi, sun, sky,
    jitter(i) {
      const r = soft * Math.sqrt(halton(i + 1, 5)), t = 2 * Math.PI * halton(i + 1, 7);
      sun.position.copy(center).addScaledVector(dir.clone().addScaledVector(su, r * Math.cos(t)).addScaledVector(sv, r * Math.sin(t)).normalize(), far);
      const rr = Math.sqrt(halton(i + 1, 11)) * 0.92, ph = 2 * Math.PI * halton(i + 1, 13);
      sky.position.copy(center).addScaledVector(new THREE.Vector3(rr * Math.cos(ph), Math.sqrt(1 - rr * rr), rr * Math.sin(ph)), far);
    },
  };
}

// muted terrazzo-look: a pale base with small low-contrast chips (canvas texture; homes.js repeats it every 2 units)
function terrazzoTexture({ base = '#b9b1a3', chips = ['#8f8576', '#d5ccbd', '#5b564e', '#a39885'] }) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = chips[i % chips.length];
    const x = rnd() * 256, y = rnd() * 256, r = 1.2 + rnd() * 2.4;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// a terrazzo palette lifted for daylight (the chips keep their contrast, the base comes up to a pale stone)
export const dayTerrazzo = ({ base, chips }) => ({ base: '#' + daylit(parseInt(base.slice(1), 16), 0.55).toString(16).padStart(6, '0'), chips: chips.map((c) => '#' + daylit(parseInt(c.slice(1), 16), 0.4).toString(16).padStart(6, '0')) });

// ── walls ───────────────────────────────────────────────────────────────────
// A straight wall along x (axis 'x', centred on z = at) or along z (axis 'z', centred on x = at), from a = from to a = to,
// y0..y1 high and t thick. Openings { a0, a1, v0, v1, arch }: v0 at the wall's foot makes a doorway (a notch),
// higher ones are windows (holes). arch = true puts a half circle on top, starting at v1.
export function wall(mat, { axis, at, from, to, y0 = 0, y1, t = 0.5, ops = [] }) {
  const L = to - from, Hh = y1 - y0;
  const s = new THREE.Shape();
  const loc = ops.map((o) => ({ ...o, u0: Math.min(o.a0, o.a1) - from, u1: Math.max(o.a0, o.a1) - from, v0: o.v0 - y0, v1: o.v1 - y0 }));
  s.moveTo(0, 0);
  for (const d of loc.filter((o) => o.v0 <= 1e-4).sort((p, q) => p.u0 - q.u0)) {
    s.lineTo(d.u0, 0);
    if (d.arch) {
      const r = (d.u1 - d.u0) / 2;
      s.lineTo(d.u0, d.v1);
      s.absarc(d.u0 + r, d.v1, r, Math.PI, 0, true);
    } else {
      s.lineTo(d.u0, Math.min(d.v1, Hh));
      s.lineTo(d.u1, Math.min(d.v1, Hh));
    }
    s.lineTo(d.u1, 0);
  }
  s.lineTo(L, 0);
  s.lineTo(L, Hh);
  s.lineTo(0, Hh);
  s.lineTo(0, 0);
  for (const o of loc.filter((q) => q.v0 > 1e-4)) {
    const p = new THREE.Path();
    p.moveTo(o.u0, o.v0);
    p.lineTo(o.u1, o.v0);
    if (o.arch) {
      const r = (o.u1 - o.u0) / 2;
      p.lineTo(o.u1, o.v1);
      p.absarc(o.u0 + r, o.v1, r, 0, Math.PI, false);
    } else {
      p.lineTo(o.u1, o.v1);
      p.lineTo(o.u0, o.v1);
    }
    p.lineTo(o.u0, o.v0);
    s.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 24 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  if (axis === 'x') m.position.set(from, y0, at - t / 2);
  else {
    m.rotation.y = -Math.PI / 2; // local +X -> world +Z, the extrusion (local +Z) -> world -X
    m.position.set(at + t / 2, y0, from);
  }
  return m;
}

// a pale panel set into a window opening, a little behind the wall's outer face: reads as daylight
export function windowGlow(M, { axis, at, a0, a1, v0, v1, arch = false, t = 0.5, side = -1 }) {
  const w = a1 - a0, h = v1 - v0 + (arch ? w / 2 : 0);
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(w, 0);
  if (arch) {
    s.lineTo(w, v1 - v0);
    s.absarc(w / 2, v1 - v0, w / 2, 0, Math.PI, false);
  } else {
    s.lineTo(w, h);
    s.lineTo(0, h);
  }
  s.lineTo(0, 0);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), M.daylight);
  const off = side * (t / 2 + 0.25);
  if (axis === 'x') m.position.set(a0, v0, at + off);
  else {
    m.rotation.y = -Math.PI / 2;
    m.position.set(at + off, v0, a0);
  }
  return m;
}

// ── extra furniture (same toy grammar as kit.js; floor centre x, y, z; front faces +Z before rot) ──
function placed(g, x, y, z, rot = 0, s = 1) {
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  return g;
}

export function rug(mat, x0, x1, z0, z1, y = 0) {
  return blk(mat, [x0, x1], [y, y + 0.08], [z0, z1], 0.03);
}

// a run of tall joinery (wardrobe, pantry, shoe cabinet) against a wall, doors facing +Z
export function tallCabinet(M, { x, y, z, w = 4, h = 5.6, d = 1.5, rot = 0, mat, doors = 0 }) {
  const g = new THREE.Group();
  const m = mat ?? M.cab;
  g.add(rbox(M.ink, w - 0.2, 0.2, d - 0.2, 0, 0, -0.05, 0.02));
  g.add(rbox(m, w, h - 0.2, d, 0, 0.2, 0, 0.05));
  const n = doors || Math.max(2, Math.round(w / 1.2));
  for (let i = 1; i < n; i++) g.add(rbox(M.clay, 0.04, h - 0.6, 0.03, -w / 2 + (w * i) / n, 0.4, d / 2 + 0.005, 0));
  return placed(g, x, y, z, rot);
}

// low media console: a long slab on a dark plinth, one dark book stack and a bowl
export function consoleLow(M, { x, y, z, w = 5.5, d = 1.1, h = 1.1, rot = 0, mat }) {
  const g = new THREE.Group();
  g.add(rbox(M.ink, w - 0.4, 0.18, d - 0.2, 0, 0, 0, 0.02));
  g.add(rbox(mat ?? M.wood, w, h - 0.18, d, 0, 0.18, 0, 0.05));
  g.add(rbox(M.sand, 0.9, 0.12, 0.7, -w * 0.3, h, 0, 0.03));
  g.add(rbox(M.clay, 0.8, 0.12, 0.6, -w * 0.3, h + 0.12, 0.02, 0.03));
  g.add(bowl(M, { x: w * 0.28, y: h, z: 0, r: 0.38, mat: M.sand }));
  return placed(g, x, y, z, rot);
}

// a flat dark screen panel on a wall (a television), its back at -Z
export function screen(M, { x, y, z, w = 4.2, h = 2.4, rot = 0 }) {
  const g = new THREE.Group();
  g.add(rbox(M.ink, w, h, 0.12, 0, 0, 0.06, 0.02));
  return placed(g, x, y, z, rot);
}

// kitchen island: a cream block with a stone top overhanging toward +Z, stools not included
export function island(M, { x, y, z, w = 5, d = 2, h = 2.25, rot = 0, top }) {
  const g = new THREE.Group();
  g.add(rbox(M.ink, w - 0.4, 0.25, d - 0.4, 0, 0, 0, 0.03));
  g.add(rbox(M.cab, w - 0.1, h - 0.45, d - 0.25, 0, 0.25, -0.1, 0.06));
  g.add(rbox(top ?? M.stone, w + 0.2, 0.22, d + 0.25, 0, h - 0.22, 0.05, 0.05));
  return placed(g, x, y, z, rot);
}

// stool: round seat on a thin post
export function stool(M, { x, y, z, h = 1.75, s = 1 }) {
  const g = new THREE.Group();
  g.add(cyl(M.ink, 0.38, 0.42, 0.08, 0, 0, 0, 20));
  g.add(cyl(M.ink, 0.06, 0.06, h - 0.25, 0, 0.08, 0, 8));
  g.add(cyl(M.cream, 0.48, 0.44, 0.22, 0, h - 0.22, 0, 24));
  return placed(g, x, y, z, 0, s);
}

// toilet, its back at -Z
export function toilet(M, { x, y, z, rot = 0 }) {
  const g = new THREE.Group();
  g.add(rbox(M.cream, 1.0, 1.25, 0.5, 0, 0.55, -0.55, 0.12)); // tank on the wall
  const bowlG = new THREE.Group();
  bowlG.add(cyl(M.cream, 0.42, 0.34, 1.0, 0, 0, 0, 24));
  bowlG.add(cyl(M.sand, 0.44, 0.44, 0.08, 0, 1.0, 0, 24)); // seat
  bowlG.scale.set(1, 1, 1.3);
  bowlG.position.set(0, 0, 0.05);
  g.add(bowlG);
  return placed(g, x, y, z, rot);
}

// shower: a low stone tray and a thin dark frame with a clear screen along its +Z side (x0..x1 by z0..z1, world)
export function shower(M, { x0, x1, z0, z1, y = 0, h = 5.2, screenSide = 'z' }) {
  const g = new THREE.Group();
  g.add(blk(M.stone, [x0, x1], [y, y + 0.12], [z0, z1], 0.02));
  if (screenSide === 'z') {
    g.add(blk(M.ink, [x0 + 0.2, x1], [y + 0.12, y + h], [z1 - 0.06, z1], 0));
    g.children[g.children.length - 1].material = M.glass;
    g.add(blk(M.ink, [x0 + 0.2, x1], [y + h - 0.08, y + h], [z1 - 0.08, z1 + 0.02], 0));
    g.add(blk(M.ink, [x1 - 0.08, x1], [y + 0.12, y + h], [z1 - 0.08, z1 + 0.02], 0));
  } else {
    g.add(blk(M.ink, [x1 - 0.06, x1], [y + 0.12, y + h], [z0, z1 - 0.2], 0));
    g.children[g.children.length - 1].material = M.glass;
    g.add(blk(M.ink, [x1 - 0.08, x1 + 0.02], [y + h - 0.08, y + h], [z0, z1 - 0.2], 0));
    g.add(blk(M.ink, [x1 - 0.08, x1 + 0.02], [y + 0.12, y + h], [z1 - 0.28, z1 - 0.2], 0));
  }
  // a round rain head on a dark arm
  g.add(cyl(M.ink, 0.03, 0.03, 1.4, x0 + 0.5, y + h - 1.4, z0 + 0.5, 6));
  g.add(cyl(M.ink, 0.36, 0.36, 0.06, x0 + 0.9, y + h - 0.6, z0 + 0.9, 20));
  return g;
}

// a plain wash basin counter for wall placement, scaled to real proportions (top 2.2 = 88 cm), back at -Z
export function vanityLow(M, { x, y, z, w = 3, rot = 0, mirror = true, top }) {
  const g = new THREE.Group();
  g.add(rbox(M.cab, w, 0.85, 1.25, 0, 1.15, 0, 0.06));
  g.add(rbox(top ?? M.stone, w + 0.1, 0.18, 1.35, 0, 2.0, 0.03, 0.04));
  g.add(bowl(M, { x: w * 0.15, y: 2.18, z: 0.1, r: 0.42, mat: M.cream }));
  g.add(cyl(M.ink, 0.035, 0.035, 0.5, w * 0.15, 2.18, -0.42, 6));
  if (mirror) {
    const disc = (mat, rr, tt, dz) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, tt, 40), mat);
      m.castShadow = m.receiveShadow = true;
      m.rotation.x = Math.PI / 2;
      m.position.set(w * 0.15, 4.0, -0.62 + dz + tt / 2);
      return m;
    };
    g.add(disc(M.cream, 0.85, 0.1, 0), disc(M.mirror, 0.7, 0.04, 0.1));
  }
  return placed(g, x, y, z, rot);
}

// small round side table with a vase
export function sideTable(M, { x, y, z, r = 0.6, h = 1.3, vase = true }) {
  const g = new THREE.Group();
  g.add(cyl(M.sand, r, r, 0.12, 0, h - 0.12, 0, 28));
  g.add(cyl(M.ink, 0.07, 0.07, h - 0.12, 0, 0, 0, 8));
  g.add(cyl(M.ink, r * 0.6, r * 0.65, 0.06, 0, 0, 0, 20));
  if (vase) g.add(cyl(M.cream, 0.16, 0.2, 0.5, 0.1, h, 0, 16));
  return placed(g, x, y, z);
}

// a potted tree: a dark pot, a thin trunk and a few muted leaf clusters (no green that shouts)
export function pottedTree(M, { x, y, z, s = 1, pot = true }) {
  const g = new THREE.Group();
  if (pot) g.add(cyl(M.ink, 0.55, 0.45, 1.0, 0, 0, 0, 20));
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3.6, 6), M.twig);
  trunk.position.set(0, 2.6, 0);
  trunk.rotation.z = 0.06;
  trunk.castShadow = true;
  g.add(trunk);
  const spots = [[0, 4.6, 0, 0.9], [0.6, 4.0, 0.3, 0.7], [-0.55, 4.1, -0.2, 0.72], [0.2, 3.5, -0.5, 0.55], [-0.2, 5.1, 0.3, 0.6]];
  for (const [px, py, pz, r] of spots) {
    const leaf = sphere(M.leafDark, r, px, py, pz, 14);
    leaf.scale.set(1, 0.78, 1);
    g.add(leaf);
  }
  return placed(g, x, y, z, 0, s);
}

// a stair flight from level y0 up to `top`, climbing along +X or +Z (sign -1: along -X / -Z);
// every step is a clay mass from `base` (the ground under it) up to its tread
export function flight(mat, { x, z, base, y0 = base, top, n, run, width, axis = 'x', sign = 1 }) {
  const g = new THREE.Group();
  const rise = (top - y0) / n;
  for (let i = 0; i < n; i++) {
    const t = y0 + rise * (i + 1);
    const a = sign * run * i, b = sign * run * (i + 1);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (axis === 'x') g.add(blk(mat, [x + lo, x + hi], [base, t], [z, z + width], 0.03));
    else g.add(blk(mat, [x, x + width], [base, t], [z + lo, z + hi], 0.03));
  }
  return g;
}

// an armless bench / ottoman
export function bench(M, { x, y, z, w = 3.2, d = 1.1, h = 1.1, rot = 0, mat }) {
  const g = new THREE.Group();
  g.add(rbox(mat ?? M.sand, w, h, d, 0, 0, 0, 0.18));
  return placed(g, x, y, z, rot);
}

// pendant: a shade on a wire, warm light under it (a bigger sister of kit.js bulb, for dining tables).
// wire = false leaves the wire out (the roofless cutaway passes a short `top` instead, so no hairline crosses the frame)
export function pendant(M, { x, y, z, top = 40, r = 0.75, intensity = 6, distance = 9, light = true, wire = true }) {
  const g = new THREE.Group();
  if (wire && top > y) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, top - y, 4), M.wire);
    w.position.set(x, y + (top - y) / 2, z);
    g.add(w);
  }
  const shade = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.cream);
  shade.scale.set(1, 0.55, 1);
  shade.position.set(x, y, z);
  shade.castShadow = true;
  g.add(shade);
  const under = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 28), M.glow);
  under.rotation.x = Math.PI / 2;
  under.position.set(x, y - 0.01, z);
  g.add(under);
  if (light) {
    const p = new THREE.PointLight(0xffdcb4, intensity, distance, 2);
    p.position.set(x, y - 0.4, z);
    g.add(p);
  }
  return g;
}

export { blk, rbox, cyl, sphere, bowl, blob };

// ── lights ──────────────────────────────────────────────────────────────────
// The hero's lights (kit.js addLights): a sky light and a key light from the upper left front. Here the sky is split:
// part stays an even hemisphere light, part becomes a shadowed directional light that wanders over the sky between
// frames, so creases and the feet of walls darken softly. Ratios are kept so tops, left faces and right faces read
// ash, slate and night as in the hero.
export const KEY_DIR = new THREE.Vector3(-0.27, 0.76, 0.59).normalize();

export function stillLights(scene, { center, radius, key = 3.0, hemi = 1.15, sky = 1.25, keyDir = KEY_DIR, keySoft = 0.035 }) {
  const h = new THREE.HemisphereLight(0xffffff, 0x5f5e5b, hemi);
  scene.add(h);
  const k = new THREE.DirectionalLight(0xfffaf2, key);
  k.castShadow = true;
  k.shadow.mapSize.set(4096, 4096);
  const shadowCam = (L, r) => {
    const c = L.shadow.camera;
    c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 1; c.far = 4 * r + 200;
    c.updateProjectionMatrix();
  };
  shadowCam(k, radius);
  k.shadow.bias = -0.0003;
  k.shadow.normalBias = 0.03;
  k.shadow.radius = 2;
  k.target.position.copy(center);
  scene.add(k, k.target);
  const s = new THREE.DirectionalLight(0xf6f3ee, sky);
  s.castShadow = true;
  s.shadow.mapSize.set(2048, 2048);
  shadowCam(s, radius);
  s.shadow.bias = -0.0005;
  s.shadow.normalBias = 0.05;
  s.shadow.radius = 3;
  s.target.position.copy(center);
  scene.add(s, s.target);
  const far = radius * 2 + 60;
  const basis = frameOf(keyDir);
  return {
    hemi: h, key: k, sky: s,
    // sample i of n: move the key inside a small disc round its direction and put the sky light somewhere on the dome
    jitter(i) {
      const [u, v] = [halton(i + 1, 5), halton(i + 1, 7)];
      const r = keySoft * Math.sqrt(u), a = 2 * Math.PI * v;
      const d = keyDir.clone().addScaledVector(basis[0], r * Math.cos(a)).addScaledVector(basis[1], r * Math.sin(a)).normalize();
      k.position.copy(center).addScaledVector(d, far);
      const [p, q] = [halton(i + 1, 11), halton(i + 1, 13)];
      const rr = Math.sqrt(p) * 0.94, ph = 2 * Math.PI * q;
      const sd = new THREE.Vector3(rr * Math.cos(ph), Math.sqrt(1 - rr * rr), rr * Math.sin(ph));
      s.position.copy(center).addScaledVector(sd, far);
    },
  };
}

// a beam of low warm daylight through an opening: a soft spot light from outside, aimed through the window to `aim`
// (it casts the window's shape on the floor), jittered over a small disc for soft edges
// `win`: the window's corners (world). Then the light carries a cookie (SpotLight.map) cut to the window's outline
// as seen from the lamp, plus a margin, so no light passes beside the wall where it ends.
export function beamLight(scene, { from, aim, intensity = 160, angle = 0.32, penumbra = 0.55, distance = 0, soft = 0.45, color = 0xffe2bd, win = null }) {
  const L = new THREE.SpotLight(color, intensity, distance, angle, penumbra, 1.2);
  L.position.copy(from);
  L.target.position.copy(aim);
  L.castShadow = true;
  L.shadow.mapSize.set(2048, 2048);
  L.shadow.bias = -0.0002;
  L.shadow.normalBias = 0.02;
  L.shadow.radius = 2;
  L.shadow.camera.near = 1;
  L.shadow.camera.far = from.distanceTo(aim) * 3;
  if (win) {
    const cam = new THREE.PerspectiveCamera((2 * angle * 180) / Math.PI, 1, 1, 1000);
    cam.position.copy(from);
    cam.lookAt(aim);
    cam.updateMatrixWorld();
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    const pts = win.map((p) => p.clone().project(cam)).map((p) => [((p.x + 1) / 2) * S, ((1 - p.y) / 2) * S]);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    g.filter = 'blur(3px)';
    g.fillStyle = '#fff';
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const X = cx + (x - cx) * 1.25, Yy = cy + (y - cy) * 1.25; // a margin for the jittered lamp and the soft edge
      i ? g.lineTo(X, Yy) : g.moveTo(X, Yy);
    });
    g.closePath();
    g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    L.map = tex;
  }
  scene.add(L, L.target);
  const dir = aim.clone().sub(from).normalize();
  const basis = frameOf(dir);
  return {
    light: L,
    jitter(i) {
      const [u, v] = [halton(i + 1, 3), halton(i + 1, 2)];
      const r = soft * Math.sqrt(u), a = 2 * Math.PI * v;
      L.position.copy(from).addScaledVector(basis[0], r * Math.cos(a)).addScaledVector(basis[1], r * Math.sin(a));
    },
  };
}

// faint light shaft: a slab of air from a window toward the floor, additive and fading out (barely there)
export function shaft(points, { opacity = 0.06, color = 0xffe4c2 } = {}) {
  // points: the 4 corners of the window (in order) and the matching 4 corners on the floor
  const [a, b, c, d, e, f, g, h] = points;
  const pos = [], fade = [];
  const quad = (p, q, r, s, fp, fq, fr, fs) => {
    pos.push(...p.toArray(), ...q.toArray(), ...r.toArray(), ...p.toArray(), ...r.toArray(), ...s.toArray());
    fade.push(fp, fq, fr, fp, fr, fs);
  };
  quad(a, b, f, e, 1, 1, 0, 0);
  quad(b, c, g, f, 1, 1, 0, 0);
  quad(c, d, h, g, 1, 1, 0, 0);
  quad(d, a, e, h, 1, 1, 0, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('fade', new THREE.Float32BufferAttribute(fade, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity } },
    vertexShader: 'attribute float fade; varying float vF; void main(){ vF = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 color; uniform float opacity; varying float vF; void main(){ gl_FragColor = vec4(color * opacity * (0.25 + 0.75 * vF), 1.0); }',
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 5;
  return m;
}

function frameOf(n) {
  const a = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(n, a).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return [u, v];
}

export function halton(i, b) {
  let f = 1, r = 0;
  while (i > 0) {
    f /= b;
    r += f * (i % b);
    i = Math.floor(i / b);
  }
  return r;
}

// ── camera ──────────────────────────────────────────────────────────────────
export const AZ = (37 * Math.PI) / 180; // the hero's azimuth and elevation
export const EL = (32 * Math.PI) / 180;

// An orthographic camera looking at `box` from (az, el), framed so the box fills `fill` of the frame (the rest is
// the dark around it), nudged by (dx, dy) in fractions of the frame
export function frameCamera(camera, box, { aspect, az = AZ, el = EL, fill = 0.72, dx = 0, dy = 0, points } = {}) {
  const target = box.getCenter(new THREE.Vector3());
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  camera.position.copy(target).addScaledVector(dir, 500);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const inv = camera.matrixWorldInverse;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const pts = points ?? [];
  if (!points) for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  for (const q of pts) {
    const p = q.clone().applyMatrix4(inv);
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  const w = x1 - x0, h = y1 - y0;
  const vh = Math.max(h / fill, w / fill / aspect);
  const vw = vh * aspect;
  const cx = (x0 + x1) / 2 - dx * vw, cy = (y0 + y1) / 2 - dy * vh;
  camera.left = cx - vw / 2;
  camera.right = cx + vw / 2;
  camera.top = cy + vh / 2;
  camera.bottom = cy - vh / 2;
  camera.near = 1;
  camera.far = 1200;
  camera.updateProjectionMatrix();
  return camera;
}

// ── progressive render ──────────────────────────────────────────────────────
// Renders `samples` frames into a float accumulation target and shows their average on the canvas, with a faint
// vignette toward the night colour at the edges (the image melts into the page's dark instead of ending in a box).
// `edge`: the colour the vignette fades to (default the night colour, a little darker); the brand image passes the
// section colour so its corners end exactly on the page.
// Highlights roll off: above a knee the luminance is compressed smoothly toward `peak` (about sRGB 235, a hair over
// the hero's bone #e8e0d1), so sun patches keep their gradient and never clip to flat white.
export async function accumulate(renderer, scene, camera, { samples = 48, jitters = [], vignette = 0.35, edge = null, knee = 0.7, peak = 0.83, tone = null, onProgress } = {}) {
  if (tone) return accumulateDay(renderer, scene, camera, { samples, jitters, vignette, edge, tone, onProgress });
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const W = size.x, H = size.y;
  const opts = { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
  const rtS = new THREE.WebGLRenderTarget(W, H, { ...opts, depthBuffer: true, samples: 0 });
  const rtA = new THREE.WebGLRenderTarget(W, H, { ...opts, depthBuffer: false });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const addMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, w: { value: 1 / samples } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * w, 1.0); }',
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  // linear working colour the edges fade to: the page's night a little darker, or the given edge colour as it is
  const night = edge != null ? new THREE.Color(edge) : new THREE.Color(0x1b1b1a).multiplyScalar(0.82);
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rtA.texture }, night: { value: night }, vig: { value: vignette }, aspect: { value: W / H }, knee: { value: knee }, peak: { value: peak } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tex; uniform vec3 night; uniform float vig; uniform float aspect; uniform float knee; uniform float peak; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tex, vUv).rgb;
        float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
        if (L > knee) {
          float f = knee + (peak - knee) * (1.0 - exp(-(L - knee) / (peak - knee)));
          c *= f / L;
        }
        c = min(c, vec3(0.93)); // no channel reaches 255 (a warm highlight keeps its hue below this)
        vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) / max(aspect, 1.0);
        float k = smoothstep(0.32, 0.78, length(p) * 1.18) * vig;
        c = mix(c, night, k);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(quadGeo, addMat);
  const qs = new THREE.Scene();
  qs.add(quad);

  const clear = renderer.getClearColor(new THREE.Color());
  const clearA = renderer.getClearAlpha();
  renderer.setRenderTarget(rtA);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.setClearColor(clear, clearA);
  const fullW = W, fullH = H;
  const t0 = performance.now();
  for (let i = 0; i < samples; i++) {
    const jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
    camera.setViewOffset(fullW, fullH, jx, jy, fullW, fullH);
    for (const j of jitters) j(i);
    renderer.setRenderTarget(rtS);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(rtA);
    renderer.autoClear = false;
    quad.material = addMat;
    addMat.uniforms.tex.value = rtS.texture;
    renderer.render(qs, quadCam);
    renderer.autoClear = true;
    if (i % 4 === 3) {
      onProgress?.(i + 1, performance.now() - t0);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  camera.clearViewOffset();
  renderer.setRenderTarget(null);
  quad.material = outMat;
  renderer.render(qs, quadCam);
  return { ms: Math.round(performance.now() - t0), W, H };
}

// Daylight renders (the hero's stills, the carousel): the same averaging, then three's ACES Filmic with the hero's
// exposure (tone = { exposure }), exactly as the live hero shows it, and an optional soft vignette toward `edge` (sRGB hex).
async function accumulateDay(renderer, scene, camera, { samples, jitters, vignette, edge, tone, onProgress }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const W = size.x, H = size.y;
  const opts = { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
  const rtS = new THREE.WebGLRenderTarget(W, H, { ...opts, depthBuffer: true, samples: 0 });
  const rtA = new THREE.WebGLRenderTarget(W, H, { ...opts, depthBuffer: false });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const addMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, w: { value: 1 / samples } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * w, 1.0); }',
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const edgeC = new THREE.Color(edge ?? 0xdce3dd); // linear; mixed after tone mapping, before the sRGB encode
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rtA.texture }, edge: { value: edgeC }, vig: { value: vignette }, aspect: { value: W / H }, exposure: { value: tone.exposure ?? 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tex; uniform vec3 edge; uniform float vig; uniform float aspect; uniform float exposure; varying vec2 vUv;
      vec3 RRTAndODTFit( vec3 v ) {
        vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
        vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
        return a / b;
      }
      vec3 aces( vec3 color ) {
        const mat3 ACESInputMat = mat3( vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );
        const mat3 ACESOutputMat = mat3( vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );
        color *= exposure / 0.6;
        color = ACESInputMat * color;
        color = RRTAndODTFit( color );
        color = ACESOutputMat * color;
        return clamp( color, 0.0, 1.0 );
      }
      void main(){
        vec3 c = aces( texture2D(tex, vUv).rgb );
        vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) / max(aspect, 1.0);
        float k = smoothstep(0.38, 0.85, length(p) * 1.12) * vig;
        c = mix(c, edge, k);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), addMat);
  const qs = new THREE.Scene();
  qs.add(quad);
  const clear = renderer.getClearColor(new THREE.Color());
  const clearA = renderer.getClearAlpha();
  renderer.setRenderTarget(rtA);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.setClearColor(clear, clearA);
  const t0 = performance.now();
  for (let i = 0; i < samples; i++) {
    const jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
    camera.setViewOffset(W, H, jx, jy, W, H);
    for (const j of jitters) j(i);
    renderer.setRenderTarget(rtS);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(rtA);
    renderer.autoClear = false;
    quad.material = addMat;
    addMat.uniforms.tex.value = rtS.texture;
    renderer.render(qs, quadCam);
    renderer.autoClear = true;
    if (i % 4 === 3) {
      onProgress?.(i + 1, performance.now() - t0);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  camera.clearViewOffset();
  renderer.setRenderTarget(null);
  quad.material = outMat;
  renderer.render(qs, quadCam);
  return { ms: Math.round(performance.now() - t0), W, H };
}

export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x1b1b1a, 1);
  renderer.setPixelRatio(devicePixelRatio || 1);
  renderer.setSize(innerWidth, innerHeight, false);
  return renderer;
}

