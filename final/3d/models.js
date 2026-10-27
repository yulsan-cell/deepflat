// The furniture library: the CC0 glTF models in ../models (library.json lists them: Poly Haven assets, and pieces built
// in Blender with Poly Haven textures), used by rooms.js in place of the drawn props.js builders wherever a model fits
// the role. Each model is in metres, standing on y = 0, front toward +Z, centred on x = z = 0 (the pendant hangs from
// its origin), so it is placed exactly like a props.js builder: { x, y, z } in world units, rot about y, s = world
// units per metre; k scales the piece as a whole (a smaller size of the same design), ky its height only.
//
// Loading (see hero.js for when it is waited for):
//   - every model is fetched and parsed once, in parallel; the <head> gate in index.html starts the downloads at low
//     priority as soon as three.js has arrived, and loadLibrary() takes those responses (it fetches any it lacks);
//   - placements share the parsed geometry and materials; bakeRoom() turns a model placed more than once in a room
//     (dining chairs, stools, side tables) into one InstancedMesh per part, so each model costs one draw call per room;
//   - a model that fails to load (or ?models=0) is simply absent: lib.has(name) is false and rooms.js draws its
//     procedural builder instead. Nothing waits on a failure.
// Colour: the model textures are albedos made for a neutral light; this world's sun and sky are calibrated so a colour
// reads as given on a sunlit top (kit.js paint). Each texel is therefore treated as the colour it should read and turned
// into an albedo in the shader, the way props.js texMat does for the drawn textures, so the models sit in the same light
// as everything else. Metals are kept mostly dielectric (there is no environment for them to reflect). On phones the
// normal maps are dropped (fewer textures to upload and sample; the detail is below a pixel at that size) and the rest
// are uploaded at 256 px. Models that carry the same image (the oak, linen and ceramic maps of the Blender-built pieces)
// share one texture (Library.prepare).
import { THREE, dayIrradiance, paint, DAY, bake } from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// the models rooms.js uses (file name without .glb)
export const MODELS = [
  'sofa', 'lounge_chair', 'armchair', 'coffee_table', 'side_table', 'table_lamp', 'sideboard', 'dining_table',
  'dining_chair', 'bar_stool', 'pendant_globe', 'bed', 'plant_tall', 'plant_syngonium', 'plant_flower', 'plant_aloe',
  'vase_bulb', 'vase_wide', 'vase_bottle', 'bowl_wood', 'books_row', 'books_stack',
];
const BASE = new URL('../models/', import.meta.url);
// the Draco decoder of the same three.js release the import map pins (three@0.160.0)
const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/';

// per-model finishing, as it should read in the rooms (BRIEF 2026-10-26 palette: oak #B98B5E, sage, blush, linen).
// `tint` multiplies every texture of the model: a hex colour, or [r, g, b] factors on the screen value (1.3 = a third
// lighter); `sat` scales the texture's saturation (0.5 = half as colourful); `dark: { to, below }` repaints the texels
// darker than `below` (linear luminance) in the colour `to` (a near-black part baked into one atlas with lighter ones);
// `contrast: [k, mid]` evens the texture's values round `mid` (linear luminance; k < 1 flattens, keeping the hue);
// `mats` addresses one material by name: tint, sat, dark, colour (replaces the texture), roughness, and the roles glow
// (a lamp shade the opening switches on) and glass (the pendant globe, lit with the bulbs). Materials not named keep the
// model's own look. (A material the library no longer has is simply not found: nothing breaks.)
// Value key (2026-10-26 review): the rooms are light and pastel like assets/ref-room.jpg; nothing in the living room
// reads darker than about #4A3E34 except the walnut sideboard, and no accent is a saturated dark spot.
// `maxTex` caps a model's textures (pixels on the long side) where its detail is far below a pixel on screen.
const OAK = [1.3, 1.25, 1.15]; // the library's oak veneer, brought to the kitchen's honey oak (drawn oak #A7805F..#CAA785)
const TUNE = {
  side_table: { tint: [1.3, 1.38, 1.45] }, // the Poly Haven teak reads dark here: brought to the rooms' light oak
  // walnut as one even mid-tone, like the drawn walnut #7B5640: the near-black body lifted, the pale slat edges toned
  // down to it (they read as glowing orange stripes between them)
  // (2026-10-26 review: at [1.3, 1.24, 1.18] it rendered #35291d, the darkest thing in the brightest room; lifted to a
  // warm mid walnut, about #6e5442, like the case piece in assets/ref-room.jpg)
  sideboard: { tint: [1.8, 1.66, 1.52], sat: 0.6, contrast: [0.3, 0.36] },
  // cognac leather (about #8a5a3c on screen, not the #432c1e it read), calm; the shell and alloy base warm with it
  lounge_chair: { tint: [1.85, 1.62, 1.38], sat: 0.62 },
  // the white marble, warmed to the room; the black ribbon base of the same atlas repainted a soft bronze. It stands in
  // the table top's shade, so its colour is set light: it reads as a warm graphite-bronze (about #6b5d4e in the room),
  // a step lighter than the page's ink #23221F, not as a black hole under the table
  coffee_table: { tint: [1.12, 1.06, 0.97], dark: { to: 0xb09c86, below: 0.06 } },
  armchair: { mats: { modern_arm_chair_01_pillow: { color: 0xc9ad8c, rough: 0.6 } } }, // black leather -> a soft tan
  // a pale sage glaze (BRIEF sage #9DB3A2 on its shaded side); the shade gets a linen diffuser across its top
  // (capShade), so from the flight's high camera the harp does not read as a dark cross or a hole
  table_lamp: { capShade: { mat: 'lamp_shade', lift: 0.012 }, mats: { lamp_shade: { glow: 0.18 }, lamp_base_ceramic_sage: { color: 0xb3c7b7, rough: 0.35 }, lamp_brass: { color: 0xc9a26a } } },
  pendant_globe: { mats: { modern_ceiling_lamp_01_glass: { glass: true } } },
  bed: { mats: { plinth_dark: { color: 0x4a4038 } } },
  dining_table: { tint: OAK },
  dining_chair: { mats: { oak: { tint: OAK } } },
  bar_stool: { mats: { oak: { tint: OAK } } },
  // leaves a little fresher in the sun; the urn and the pot (dark red-brown in their textures, #55301f..#62382a on
  // screen) lifted to a light warm terracotta like the Blender renders (images/carousel-blender) and assets/ref-room.jpg
  // The textures themselves are a mid terracotta (#b8673e); on the pots' shaded sides they read far darker. Tinted up
  // toward orange-ochre (the red was dominating), a little less saturated (kept well clear of the logo's ember), then
  // evened round a terracotta value: a plain lift turned the textures' pale blotches yellow. On the screen the pots now
  // read about #ad6040..#c4714b (Blender renders #aa6534..#b26b3c). The same materials carry the soil (a grey-green
  // gravel top now) and the urn tree's stems (a pale sage).
  plant_tall: { mats: { potted_plant_01_leaves: { tint: [1.3, 1.3, 1.22] }, potted_plant_01_pot: { tint: [1.45, 1.72, 1.55], sat: 0.72, contrast: [0.52, 0.55] } } },
  plant_syngonium: { mats: { potted_plant_02_leaves: { tint: [1.2, 1.2, 1.15] }, potted_plant_02_pot: { tint: [1.45, 1.72, 1.55], sat: 0.72, contrast: [0.52, 0.55] } } },
  // terracotta, not maroon
  plant_flower: { mats: { soil: { color: 0x5a4636 }, periwinkle_plant: { tint: [1.25, 1.25, 1.2] }, planter_pot_clay: { tint: [1.55, 1.45, 1.32], sat: 0.75, contrast: [0.6, 0.35] } } }, // with the big pots
  // a quiet light turned wood, not a copper accent (on the coffee table it read a dark red-brown)
  bowl_wood: { sat: 0.35, tint: [1.55, 1.48, 1.32], contrast: [0.7, 0.3] },
  // the baked covers toward the palette's warm neutrals (they were cool saturated blues and greens); books are 10-30 px
  // on screen, so their atlases are uploaded at 512
  books_stack: { sat: 0.4, tint: [1.08, 1.02, 0.92], maxTex: 512 },
  books_row: { sat: 0.5, tint: [1.05, 1.0, 0.94], maxTex: 512 },
};
// on phones every model texture is uploaded at most this size (a 512 texture on a piece a hundred pixels wide)
const MOBILE_TEX = 256;
// a tint as linear factors (an sRGB-ish multiplier f is about f^2.2 in linear light)
const tintColor = (t) => (Array.isArray(t) ? new THREE.Color(...t.map((f) => Math.pow(f, 2.2))) : new THREE.Color(t));

// (the texel as tinted, then: saturation, the dark repaint keeping a little of the texel's own variation, the contrast
// round its pivot, then the texel -> albedo inversion)
const ALBEDO = /* glsl */ `#include <map_fragment>
{
  float lum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  diffuseColor.rgb = mix( vec3( lum ), diffuseColor.rgb, uSat );
  if ( uDarkBelow > 0.0 ) {
    vec3 to = uDarkTo * ( 0.82 + 0.36 * clamp( lum / uDarkBelow, 0.0, 1.0 ) );
    diffuseColor.rgb = mix( to, diffuseColor.rgb, smoothstep( 0.5 * uDarkBelow, uDarkBelow, lum ) );
  }
  if ( uCon.x != 1.0 ) {
    float l = max( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-4 );
    diffuseColor.rgb *= uCon.y * pow( l / uCon.y, uCon.x ) / l;
  }
}
{
  vec3 y = clamp( diffuseColor.rgb, 0.0, 0.97 );
  vec3 qa = y * 0.983729 - 1.0;
  vec3 qb = y * 0.432951 - 0.0245786;
  vec3 qc = y * 0.238081 + 0.000090537;
  vec3 v = ( - qb - sqrt( max( qb * qb - 4.0 * qa * qc, 0.0 ) ) ) / ( 2.0 * qa );
  diffuseColor.rgb = min( v * uAlbK / uAlbE, vec3( 0.92 ) );
}`;

const finished = new WeakSet();
function finish(mat, tune, mobile) {
  if (finished.has(mat)) return;
  finished.add(mat);
  const t = tune?.mats?.[mat.name] ?? {};
  const tint = t.tint ?? tune?.tint;
  if (t.color != null) {
    mat.map = null;
    mat.color.setHex(t.color);
  } else if (tint != null) {
    mat.color.multiply(tintColor(tint));
  }
  if (t.rough != null) {
    mat.roughnessMap = null;
    mat.roughness = t.rough;
  }
  mat.metalness = Math.min(mat.metalness, 0.25);
  if (mobile) mat.normalMap = null;
  if (mat.map) {
    // the texel is the colour this surface should read in sunlight: invert three's ACES curve, divide by the light.
    // Every library material gets the same shader source (the per-material looks are uniforms), so one program serves
    // them all ('glbAlbedo').
    const E = new THREE.Vector3(...dayIrradiance(new THREE.Vector3(0, 1, 0)));
    const d = t.dark ?? tune?.dark;
    const darkTo = new THREE.Color(d?.to ?? 0);
    const darkBelow = d?.below ?? 0;
    const sat = t.sat ?? tune?.sat ?? 1;
    const con = new THREE.Vector2(...(t.contrast ?? tune?.contrast ?? [1, 0.1]));
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uAlbE = { value: E };
      sh.uniforms.uAlbK = { value: 0.6 / DAY.exposure };
      sh.uniforms.uDarkTo = { value: darkTo };
      sh.uniforms.uDarkBelow = { value: darkBelow };
      sh.uniforms.uSat = { value: sat };
      sh.uniforms.uCon = { value: con };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uAlbE;\nuniform float uAlbK;\nuniform vec3 uDarkTo;\nuniform float uDarkBelow;\nuniform float uSat;\nuniform vec2 uCon;')
        .replace('#include <map_fragment>', ALBEDO);
    };
    mat.customProgramCacheKey = () => 'glbAlbedo';
  } else {
    mat.color.copy(paint(mat.color.getHex(), 'top'));
  }
  if (t.glow != null) {
    mat.emissive.setHex(0xffe2b8);
    mat.emissiveIntensity = t.glow;
    mat.userData.glow = t.glow;
  }
  if (t.glass) {
    mat.emissive.setHex(0xffd9a0).multiplyScalar(0.32);
    mat.emissiveIntensity = 0.15;
    mat.userData.glass = true;
  }
  mat.userData.keep = true; // kit.js bake() leaves the model's meshes as they are
  mat.needsUpdate = true;
}

// a texture at most `cap` pixels on its long side (a smaller copy of its image; the full one is released)
async function shrink(t, cap) {
  const img = t.image;
  const w = img?.width ?? 0, h = img?.height ?? 0;
  if (!w || !h || Math.max(w, h) <= cap) return;
  const k = cap / Math.max(w, h);
  const rw = Math.max(1, Math.round(w * k)), rh = Math.max(1, Math.round(h * k));
  let out = null;
  try {
    out = await createImageBitmap(img, { resizeWidth: rw, resizeHeight: rh, resizeQuality: 'high', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  } catch {}
  if (!out || out.width !== rw || out.height !== rh) {
    // no resize options (older Safari): a canvas
    out?.close?.();
    out = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(rw, rh) : Object.assign(document.createElement('canvas'), { width: rw, height: rh });
    const g = out.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, rw, rh);
  }
  img.close?.();
  t.image = out;
  t.needsUpdate = true;
}
const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];

class Library {
  constructor(mobile) {
    this.mobile = mobile;
    this.models = new Map(); // name -> [{ geometry, material }]
    this.failed = [];
    this.state = 'loading';
    this.ms = 0;
    this.shared = new Map(); // texture id -> the one Texture every model with that image uses
  }
  // One texture per image: the Blender-built pieces carry the same oak, linen and ceramic maps (byte-identical; the
  // name and size identify them, models/library.json), so each is uploaded once instead of once per model. Textures are
  // capped in size (phones: MOBILE_TEX; TUNE maxTex) before anything uploads them; on phones the normal maps, which
  // finish() drops, are released at once.
  async prepare(name, gltf) {
    const cap = Math.min(this.mobile ? MOBILE_TEX : Infinity, TUNE[name]?.maxTex ?? Infinity);
    const meshes = [];
    gltf.scene.traverse((o) => o.isMesh && meshes.push(o));
    const dropped = new Set(); // image sources of the textures replaced or dropped here
    for (const { material: m } of meshes) {
      if (this.mobile && m.normalMap) {
        dropped.add(m.normalMap.source);
        m.normalMap = null;
      }
      for (const key of TEX_KEYS) {
        const t = m[key];
        if (!t?.isTexture) continue;
        const id = t.name && [t.name, t.image?.width, t.image?.height, t.colorSpace, t.flipY, t.wrapS, t.wrapT, t.channel, t.offset.x, t.offset.y, t.repeat.x, t.repeat.y].join(':');
        const have = id && this.shared.get(id);
        if (have && have !== t) {
          m[key] = have;
          dropped.add(t.source);
          t.dispose();
        } else if (!have && id) {
          this.shared.set(id, t);
        }
      }
    }
    // (the loader's clones of one image share its source: release a source only when no texture kept uses it)
    const kept = new Set();
    for (const { material: m } of meshes) for (const key of TEX_KEYS) if (m[key]?.isTexture) kept.add(m[key]);
    for (const t of kept) dropped.delete(t.source);
    for (const t of this.shared.values()) dropped.delete(t.source);
    for (const src of dropped) src?.data?.close?.();
    // the size cap, once per image source (the textures sharing it see the smaller image)
    const waits = [];
    if (cap < Infinity) {
      this.shrunk ??= new WeakMap();
      for (const t of kept) {
        if (!this.shrunk.has(t.source)) this.shrunk.set(t.source, shrink(t, cap).catch(() => {}));
        waits.push(this.shrunk.get(t.source));
      }
    }
    await Promise.all(waits);
  }
  has(name) {
    return this.models.has(name);
  }
  // the library as it is now: the rooms are furnished from one fixed set, even while later models keep arriving
  snapshot() {
    const v = Object.create(Library.prototype);
    return Object.assign(v, this, { models: new Map(this.models), failed: this.failed.slice() });
  }
  get size() {
    return this.models.size;
  }
  parts(name) {
    return this.models.get(name) ?? [];
  }
  // the material of a model by name (lamp shades, the pendant globe)
  material(name, matName) {
    return this.parts(name).find((p) => p.material.name === matName)?.material ?? null;
  }
  textures() {
    const out = new Set();
    for (const parts of this.models.values()) {
      for (const { material: m } of parts) for (const v of Object.values(m)) if (v?.isTexture) out.add(v);
    }
    return [...out];
  }
  // the model's extent in metres, as loaded: { w, h, d, min, max } (rooms.js reads table tops and the bed's length
  // from it, so a re-exported model still lands on the floor and against its wall)
  dims(name) {
    const b = this.boxes?.get(name);
    if (!b) return null;
    return { w: b.max.x - b.min.x, h: b.max.y - b.min.y, d: b.max.z - b.min.z, min: b.min, max: b.max };
  }
  // a placement: a group of meshes sharing the model's geometry and materials (bakeRoom() instances repeated ones).
  // maxH (metres): a model taller than this is brought down to it in height only (a bar stool at a counter)
  place(name, { x = 0, y = 0, z = 0, rot = 0, s = 1, k = 1, ky = 1, maxH } = {}) {
    const parts = this.models.get(name);
    if (!parts) return null;
    const g = new THREE.Group();
    for (const p of parts) {
      const m = new THREE.Mesh(p.geometry, p.material);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
    const h = this.dims(name).h * k * ky;
    if (maxH && h > maxH) ky *= maxH / h;
    g.position.set(x, y, z);
    g.rotation.y = rot;
    g.scale.set(s * k, s * k * ky, s * k);
    g.userData.glb = name;
    return g;
  }
  add(name, gltf) {
    const parts = [];
    const box = new THREE.Box3();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const geometry = o.geometry;
      if (!o.matrixWorld.equals(new THREE.Matrix4())) geometry.applyMatrix4(o.matrixWorld);
      for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(key)) geometry.deleteAttribute(key);
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
      box.union(geometry.boundingBox);
      finish(o.material, TUNE[name], this.mobile);
      parts.push({ geometry, material: o.material });
    });
    // a diffuser across the top of a lamp shade (TUNE capShade: { mat, lift }): a closed band of the shade's own
    // material as wide as its rim, rising `lift` m above it (over the harp's spider and finial, which sit in the rim:
    // the shade reads a centimetre taller), merged into the shade (no extra draw call)
    const cap = TUNE[name]?.capShade;
    const shade = cap && parts.find((p) => p.material.name === cap.mat);
    if (shade) {
      const g = shade.geometry;
      const pos = g.attributes.position;
      const bb = g.boundingBox;
      const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
      let r = 0;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > bb.max.y - 0.004) r = Math.max(r, Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz));
      const h = (cap.lift ?? 0) + 0.002;
      const disc = new THREE.CylinderGeometry(r, r, h, 40, 1, false);
      disc.translate(cx, bb.max.y - 0.002 + h / 2, cz);
      const merged = r > 0 && !!g.index === !!disc.index && mergeGeometries([g, disc]);
      if (merged) {
        merged.computeBoundingSphere();
        merged.computeBoundingBox();
        shade.geometry = merged;
        g.dispose();
      }
      disc.dispose();
    }
    if (!parts.length) return;
    this.models.set(name, parts);
    (this.boxes ??= new Map()).set(name, box);
  }
}

// loadLibrary({ mobile, prefetched, off }) -> a Library at once; lib.settled resolves (never rejects) when every model
// has loaded or failed. prefetched: Map name -> Promise<ArrayBuffer | null> (the gate's downloads).
// lib.onAdd(name), when set, is called as each model joins the library (hero.js refurnishes on that, not only once
// every model has settled, so one stalled download does not hold back the rest). lib.cancelled = true (the static scenes
// took the stage) stops it: nothing more is parsed. A download that takes over 20 s counts as failed.
export function loadLibrary({ names = MODELS, mobile = false, prefetched = null, off = false, base = BASE } = {}) {
  const lib = new Library(mobile);
  const t0 = performance.now();
  if (off) {
    lib.state = 'off';
    lib.settled = Promise.resolve(lib);
    return lib;
  }
  lib.settled = (async () => {
    // the loader and the downloads at the same time: a model that cannot be downloaded fails at once.
    // The meshes are Draco-compressed (KHR_draco_mesh_compression, 2026-10-26: 5.3 MB of models down to 2.1 MB; the
    // WebP textures are unchanged): the decoder (about 75 KB, wasm) comes from the same pinned three.js on the CDN and
    // starts loading with the loader, while the model downloads are still under way.
    const loading = Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js')]).then(([{ GLTFLoader }, { DRACOLoader }]) => {
      const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
      draco.preload();
      return new GLTFLoader().setDRACOLoader(draco);
    });
    loading.catch((err) => (lib.error = String(err?.message ?? err)));
    await Promise.all(
      names.map(async (name) => {
        try {
          let buf = prefetched?.has(name) ? await prefetched.get(name) : undefined;
          if (buf === undefined && !lib.cancelled) {
            const r = await fetch(new URL(name + '.glb', base), AbortSignal.timeout ? { signal: AbortSignal.timeout(20000) } : {});
            buf = r.ok ? await r.arrayBuffer() : null;
          }
          if (!buf || lib.cancelled) throw new Error(lib.cancelled ? 'cancelled' : 'not loaded');
          const gltf = await (await loading).parseAsync(buf, base.href);
          if (lib.cancelled) throw new Error('cancelled');
          await lib.prepare(name, gltf);
          if (lib.cancelled) throw new Error('cancelled');
          lib.add(name, gltf);
          try {
            lib.onAdd?.(name);
          } catch {}
        } catch {
          lib.failed.push(name);
        }
      }),
    );
    lib.ms = Math.round(performance.now() - t0);
    lib.state = lib.failed.length === 0 ? 'ready' : lib.models.size ? 'partial' : 'failed';
    return lib;
  })();
  return lib;
}

// a copy of a library material that keeps its colour handling (Material.clone does not copy onBeforeCompile)
export function cloneMaterial(mat) {
  const c = mat.clone();
  c.onBeforeCompile = mat.onBeforeCompile;
  c.customProgramCacheKey = mat.customProgramCacheKey;
  return c;
}

// wait for the library, at most ms (resolves either way)
export function settleWithin(lib, ms) {
  if (!lib) return Promise.resolve();
  return Promise.race([lib.settled, new Promise((r) => setTimeout(r, Math.max(0, ms)))]);
}

// Bake a room (kit.js bake) with its models kept apart: each model placed once stays a mesh; one placed more often
// becomes an InstancedMesh per part (four dining chairs: one draw call). Everything ends up in world space, like bake().
const _m = new THREE.Matrix4();
export function bakeRoom(root) {
  root.updateMatrixWorld(true);
  const placed = new Map(); // name -> { parts, mats: [Matrix4] }
  const holders = [];
  root.traverse((o) => {
    if (o.userData.glb) holders.push(o);
  });
  for (const h of holders) {
    const name = h.userData.glb;
    if (!placed.has(name)) placed.set(name, { parts: h.children.map((c) => ({ geometry: c.geometry, material: c.material })), mats: [] });
    placed.get(name).mats.push(h.matrixWorld.clone());
    h.parent.remove(h);
  }
  const out = bake(root);
  for (const [name, { parts, mats }] of placed) {
    for (const p of parts) {
      let m;
      if (mats.length === 1) {
        m = new THREE.Mesh(p.geometry, p.material);
        mats[0].decompose(m.position, m.quaternion, m.scale);
      } else {
        m = new THREE.InstancedMesh(p.geometry, p.material, mats.length);
        mats.forEach((mx, i) => m.setMatrixAt(i, mx));
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
        m.computeBoundingBox();
      }
      m.castShadow = m.receiveShadow = true;
      m.userData.glb = name;
      out.add(m);
    }
  }
  return out;
}

// after a swap: free what the old objects held that nothing in `scene` uses any more (geometries and materials; the
// textures are shared caches and stay)
export function disposeUnused(oldRoots, scene) {
  const geos = new Set(), mats = new Set();
  scene.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    [].concat(o.material || []).forEach((m) => mats.add(m));
  });
  for (const r of oldRoots) {
    r?.traverse((o) => {
      if (o.geometry && !geos.has(o.geometry)) o.geometry.dispose();
      [].concat(o.material || []).forEach((m) => !mats.has(m) && m.dispose());
      if (o.isInstancedMesh) o.dispose(); // its own instance buffers
    });
  }
}
