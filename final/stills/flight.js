// The hero's four scenes as still pictures, for the static hero (reduced motion, no WebGL, the 3D not ready in time):
// the very world of the 3D hero (../3d/world.js) in its daylight, every lamp on, seen from the flight's own camera
// (../3d/flight.js) at the middle of each scene's dwell, at the aspect of the picture (16:9 for landscape screens, 9:16
// for portrait ones).
//   stills.html?scene=flight&shot=world|living|kitchen|bedroom   (the window size sets the aspect)
// Rendered and encoded by render-flight.mjs into images/flight/.
// A still has time the live hero does not: the sun wanders over a small disc (soft penumbras) and part of the sky
// becomes a shadowed light walking over the dome (soft occlusion in corners and under furniture); the average is tone
// mapped with the hero's ACES curve and exposure, so the pictures match the live frames.
import { THREE, makeMaterials, addLights, DAY, acesUntone } from '../3d/kit.js';
import { roomMaterials } from '../3d/rooms.js';
import { worldSteps, logoBox } from '../3d/world.js';
import { makeFlight, applyCamera, STOP } from '../3d/flight.js';
import { loadLibrary } from '../3d/models.js';
import { halton } from './lib.js';

// the colour that reads as `hex` once tone mapped (fog and clear colour are mixed before the still's tone mapping,
// where the live hero mixes its fog after it)
const pre = (hex) => {
  const c = new THREE.Color(hex);
  const [r, g, b] = acesUntone([c.r, c.g, c.b]);
  return new THREE.Color(r, g, b);
};

export async function buildFlightStill(scene, params, renderer) {
  const shot = params.get('shot') ?? 'world';
  if (!(shot in STOP)) throw new Error('unknown shot ' + shot);
  const M = roomMaterials(makeMaterials());
  // the rooms' real furniture (../3d/models.js), all of it loaded before the world is built (a model that fails to load
  // is drawn by its props.js builder, as in the live hero); ?models=0 renders the drawn props only
  const lib = await loadLibrary({ off: params.get('models') === '0' }).settled;
  M.lib = lib.snapshot();
  const world = {};
  for (const step of worldSteps(scene, M, { mobile: false }, world)) step();

  // the opening's end state: every bulb, lamp, lit niche and glow on
  M.warm.emissiveIntensity = 0.2;
  for (const l of world.lamps) l.light.intensity = l.base;
  for (const b of world.bulbs) {
    const u = b.userData;
    u.glass.emissiveIntensity = 2.2;
    u.halo.material.opacity = u.halo.userData.glow?.base ?? 0.8;
    if (u.light) u.light.intensity = u.base;
  }
  for (const g of world.glows) {
    if (g.emissive) g.mat.emissiveIntensity = g.base;
    else if (g.basic) g.mat.color.copy(g.color0);
    else if (g.uniform) g.mat.uniforms.opacity.value = g.base;
    else g.mat.opacity = g.base;
  }

  const center = new THREE.Vector3(16, 14, -4);
  const lights = addLights(scene, { center, span: 60, mapSize: 4096, soft: 1 });
  // part of the sky as a wandering shadowed light (see above); the hemisphere keeps the rest
  const skyShare = 0.42;
  lights.hemi.intensity = DAY.hemiI * (1 - skyShare);
  const sky = new THREE.DirectionalLight(DAY.sky, (DAY.hemiI * skyShare) / 0.667); // a cosine-weighted dome gives 2/3 on a top
  sky.castShadow = true;
  sky.shadow.mapSize.set(2048, 2048);
  const sc = sky.shadow.camera;
  sc.left = -64; sc.right = 64; sc.top = 64; sc.bottom = -64; sc.near = 1; sc.far = 420;
  sky.shadow.bias = -0.0006;
  sky.shadow.normalBias = 0.14;
  sky.target.position.copy(center);
  scene.add(sky, sky.target);

  const A = innerWidth / innerHeight;
  const flight = makeFlight(logoBox(world.letterBack));
  flight.setAspect(A);
  const c = flight.at(STOP[shot], {}, {});
  const camera = new THREE.PerspectiveCamera(c.fov, A, c.near, c.far);
  applyCamera(camera, c, A);
  scene.fog = new THREE.Fog(pre(DAY.fog), c.d + 80, c.d + 340);
  scene.background = pre(DAY.fog);

  // soft shadows: the sun wanders over a small disc round its direction from frame to frame
  const key = lights.key;
  const dir0 = key.position.clone().sub(center).normalize();
  const far = key.position.distanceTo(center);
  const a = Math.abs(dir0.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(dir0, a).normalize();
  const v = new THREE.Vector3().crossVectors(dir0, u).normalize();
  const jitter = (i) => {
    const r = 0.035 * Math.sqrt(halton(i + 1, 5)), t = 2 * Math.PI * halton(i + 1, 7);
    const d = dir0.clone().addScaledVector(u, r * Math.cos(t)).addScaledVector(v, r * Math.sin(t)).normalize();
    key.position.copy(center).addScaledVector(d, far);
    const rr = Math.sqrt(halton(i + 1, 11)) * 0.92, ph = 2 * Math.PI * halton(i + 1, 13);
    sky.position.copy(center).addScaledVector(new THREE.Vector3(rr * Math.cos(ph), Math.sqrt(1 - rr * rr), rr * Math.sin(ph)), 200);
  };
  // what is shown as it is in the live hero (window daylight: not tone mapped there) must read the same here
  const seen = new Set();
  scene.traverse((o) => {
    const m = o.material;
    if (m && m.isMeshBasicMaterial && m.toneMapped === false && !seen.has(m)) {
      seen.add(m);
      m.color.copy(pre(m.color.getHex()));
    }
  });
  void renderer;
  return {
    camera,
    samples: 40,
    jitters: [jitter],
    vignette: 0.16,
    edge: new THREE.Color(DAY.fog),
    tone: { exposure: DAY.exposure },
    note: `${shot} p=${STOP[shot]} A=${A.toFixed(3)} models=${lib.state} ${lib.size}${lib.failed.length ? ' failed: ' + lib.failed.join(',') : ''}`,
  };
}
