// DEEPFLAT hero: the key visual rebuilt as a live 3D clay miniature, and a scroll flight through its rooms.
// Imported by the small classic script right after .hero-gl in index.html, only when the <head> gate chose to try 3D
// (WebGL works, no ?hero=static, no reduced motion, no slow link or low-end device). The gate keeps the stage dark,
// falls back to the static scenes if this module has not claimed the stage in time, and hands over the WebGL canvas it
// already probed, so no second context is created.
//
// boot() is async and cancellable: the world (world.js) is built in small steps with a yield between them, shaders
// compile without blocking, and after every step it checks that the gate is still waiting.
//
// Daylight (2026-10-26): ACES tone mapping, a warm sun from the upper left and a sage-grey sky (kit.js DAY); the rooms
// are furnished with props.js. Camera path and opening choreography are unchanged.
// Opening (about 3.4 s, only when the page opens at the top): the world assembles on the pale ground. The blocks and
// platforms rise into place in a wave from the back toward the viewer, while the sun comes up; FLAT then DEEP extrude
// out of the plinth (D and F ember); the bulbs and lamps switch on; the camera settles on the establishing shot and the
// route rail and scroll hint come in. The page's heading is on screen from the first paint (it does not wait for the
// opening). A visitor who scrolls during the opening does not wait for it either: what is left of it plays five times
// faster, so the first room arrives lit and framed.
// While this module loads, the stage shows the finished world as a still (index.html: the world picture behind the
// canvas), so the first screen is never empty. The canvas fades in over it and the opening starts at OPEN_FROM, where
// the far blocks already stand: what is left raises the front rooms and the letters (2026-10-26 review).
// Quality: the opening also measures what a frame costs on this device (govern()). A slow GPU gets fewer pixels, a fast
// phone more (they start at 1x); one too slow even at the lowest setting gets the static scenes. ?hero=3d (review on
// slow machines) skips this and keeps full quality.
// Flight: the hero is a tall track with the stage stuck to the top of the screen. Scroll position, smoothed, is the
// flight progress p; the camera follows one continuous path (flight.js): world -> 거실 -> 주방·다이닝 -> 침실, then the
// page scrolls on. Each scene's words show while the camera lingers there; the route rail marks the scene and jumps.
// Frames are drawn only while something moves (the opening, the camera catching up with the scroll), never off screen.
// Real furniture (2026-10-26): the rooms are furnished with the CC0 glTF models of final/models (models.js), loaded in
// parallel with everything else (the gate starts the downloads). The opening never waits on them for long and is never
// empty: the build pauses before the first furnished room only when most downloads are in and the gate's pacing
// target leaves time (at most 1.6 s, keeping 1.1 s for the rest of the build and the shaders; with ?hero=3d it waits for
// the library to settle), and any room whose models are not there yet is furnished with the drawn props.js pieces. When
// the rest of the library arrives later, the rooms are built again in the background once the opening is over, their
// shaders compiled and textures uploaded, and swapped in between two frames while the camera is not in a furnished room
// (models.js disposeUnused frees what they replace). ?models=0 keeps the drawn props.
import { THREE, makeMaterials, addLights, DAY, skyTexture } from './kit.js';
import { roomMaterials } from './rooms.js';
import { worldSteps, logoBox } from './world.js';
import { makeFlight, applyCamera, copyLevels, sceneAt, railAt, basis, SCENES, STOP, DWELL } from './flight.js';
import { loadLibrary, settleWithin, disposeUnused } from './models.js';

const INTRO = 3.4;
// While the 3D loads, the stage shows the finished world as a still picture (index.html: the poster behind the canvas).
// The canvas then fades in over it (POSTER_FADE s) and the opening starts at OPEN_FROM, where the far blocks already
// stand: what is left of it raises the front rooms and the letters into place. The camera's settle is left out on this
// path (it would show the poster's frame and the moving one doubled during the fade). replay() plays it from 0.
const OPEN_FROM = 0.95;
const POSTER_FADE = 0.45;
const RUSH = 5; // how much faster the rest of the opening plays once the visitor scrolls
const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
const ease = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeQuart = (t) => 1 - Math.pow(1 - clamp01(t), 4);
const easeOutBack = (t) => {
  t = clamp01(t);
  const c1 = 1.3, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// give the main thread back between build steps: a message-channel task, which background tabs do not clamp to 1 s the
// way they clamp setTimeout. Not scheduler.yield: its continuations run ahead of ordinary tasks, so a chain of them held
// back the gate's timer and the model downloads' bodies for the whole build (2026-10-26 review); a plain task lets both
// in between the steps, so the models load while the world is built.
const yieldNow = () =>
  new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(0);
  });

export async function boot(gate, host) {
  if (gate.mode !== 'wait') return;
  const stage = host.closest('.fl-stage') || host.parentElement;
  const track = host.closest('.fl-track') || stage;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const query = new URLSearchParams(location.search);
  const forced = query.get('hero') === '3d';
  const mobile = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const timing = { steps: [] };
  const tBoot = performance.now();
  // the furniture models: their downloads already started in the gate; parsed here as they arrive
  const lib = loadLibrary({ mobile, prefetched: gate.models ?? null, off: query.get('models') === '0' });
  // how long the build may wait for them before the first furnished room (see the head of this file): only once most
  // downloads are in (gate.modelsIn: the bodies received), so the build never waits for models still on the network;
  // review only: ?modelwait=<ms> sets it (0 builds the drawn props first and shows the late refurnish)
  const waitParam = query.get('modelwait');
  const modelWait = () => {
    if (waitParam != null) return Number(waitParam);
    if (forced) return 20000;
    if (gate.models && (gate.modelsIn || 0) < 16) return 0;
    return Math.min(1600, (gate.deadline ?? tBoot + 2200) - performance.now() - 1100);
  };
  // upload textures a few at a time, giving the main thread back between them
  const uploadTextures = async (list) => {
    for (let i = 0; i < list.length; i++) {
      renderer.initTexture(list[i]);
      if (i % 6 === 5) await yieldNow();
    }
  };

  const renderer = new THREE.WebGLRenderer({ canvas: gate.canvas || undefined, context: gate.gl || undefined, antialias: true });
  const canvas = renderer.domElement;
  let scene = null;
  let disposed = false;
  // every listener this module adds goes through on(), so one abort() removes them all when the static scenes take over
  const ac = new AbortController();
  const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: ac.signal });
  let io = null;
  let ro = null;
  let raf = 0;
  // free the GPU and stop listening: the static scenes have the stage for good. The context is released first, so the
  // deletes after it are silent no-ops (after a lost and restored context they would each warn).
  const disposeAll = () => {
    if (disposed) return;
    disposed = true;
    // the models are no longer needed: stop the downloads and the parsing (on a device just judged too slow)
    try {
      gate.abortModels?.();
    } catch {}
    lib.cancelled = true;
    cancelAnimationFrame(raf);
    raf = 0;
    ac.abort();
    io?.disconnect();
    ro?.disconnect();
    try {
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    } catch {}
    scene?.traverse((o) => {
      if (o.isLight) o.shadow?.dispose?.();
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => {
        for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
        m.dispose();
      });
    });
    renderer.dispose();
    canvas.remove();
    if (gate.onStatic === onStatic) gate.onStatic = null;
    delete window.__dfHero;
    delete window.__dfFlight;
  };
  // the gate (or anything else) handed the stage to the static scenes after this module claimed it: let go of the GPU.
  // A lost context is the exception: three keeps it restorable, and the 3D takes the stage back when it returns.
  const onStatic = (reason) => {
    if (reason !== 'WebGL context lost') disposeAll();
  };
  gate.onStatic = onStatic;
  // a shader that fails to compile or link does not throw: three only reports it, and the material draws nothing
  let glFailed = false;
  renderer.debug.onShaderError = () => {
    glFailed = true;
  };
  const stillWaiting = () => {
    if (gate.mode === 'wait') return true;
    disposeAll(); // the static scenes already took the stage: free the GPU and stay out of their way
    return false;
  };

  let M, world, lights, camera, flight;
  try {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // daylight: ACES Filmic at the exposure kit.js paint() calibrated every colour for
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = DAY.exposure;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // filtered over the sun's shadow radius: soft daylight edges
    renderer.setClearColor(DAY.fog, 1);
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.opacity = '0';
    host.appendChild(canvas);

    scene = new THREE.Scene();
    // far floor and walls melt into the pale sage air instead of ending in a line (near / far follow the camera, see
    // frame()); where nothing is drawn, a soft sage-grey gradient
    scene.fog = new THREE.Fog(DAY.fog, 200, 600);
    scene.background = skyTexture();
    M = roomMaterials(makeMaterials());
    M.lib = lib.snapshot();
    world = {};
    for (const step of worldSteps(scene, M, { mobile }, world)) {
      if (step.models) {
        const tw = performance.now();
        await settleWithin(lib, modelWait());
        if (!stillWaiting()) return;
        M.lib = lib.snapshot(); // the rooms are furnished from what has arrived by now
        timing.models = { wait: Math.round(performance.now() - tw), used: M.lib.size };
      }
      const t = performance.now();
      step();
      timing.steps.push(Math.round(performance.now() - t));
      await yieldNow();
      if (!stillWaiting()) return;
    }
    lights = addLights(scene, { center: new THREE.Vector3(16, 14, -4), span: 60, mapSize: mobile ? 1024 : 2048, soft: mobile ? 1.5 : 2.5 });
    camera = new THREE.PerspectiveCamera(9, 1, 1, 2000);
    flight = makeFlight(logoBox(world.letterBack));
  } catch (err) {
    disposeAll();
    gate.fallback('3D scene could not be built: ' + err.message);
    return;
  }

  // ── opening: each piece rises in turn, the farthest from the viewer first ──
  {
    const { dir } = basis((37 * Math.PI) / 180, (32 * Math.PI) / 180); // toward the establishing camera
    const box = new THREE.Box3();
    const c = new THREE.Vector3();
    const ranked = world.pieces.map((g) => ({ g, d: box.setFromObject(g).getCenter(c).dot(dir) })).sort((a, b) => a.d - b.d);
    ranked.forEach((r, i) => {
      r.g.userData.delay = 0.05 + (0.95 * i) / Math.max(1, ranked.length - 1);
    });
  }

  // ── sizing ──
  // pixel ratio: capped (1.5 desktop, 1 phones) and kept within a pixel budget for very large screens,
  // but never below 1, so a big 1x monitor still renders at its own resolution. govern() then scales it by qual.k:
  // down to 0.75 on a slow GPU, up to 1.75 on a phone with room to spare (still within the budget).
  const cap = mobile ? 1 : 1.5;
  const budget = mobile ? 1.0e6 : 2.6e6;
  const size = { w: 1, h: 1, A: 1 };
  const span = { top: 0, run: 1 };
  const qual = { k: 1, costs: [], done: forced }; // ?hero=3d keeps full quality
  function prFor(w, h) {
    const dpr = devicePixelRatio || 1;
    const room = Math.max(1, Math.sqrt(budget / (w * h)));
    const base = Math.min(dpr, cap, room);
    const hi = Math.min(dpr, mobile ? 1.75 : cap, room);
    return Math.min(hi, Math.max(Math.min(base, 0.75), base * qual.k));
  }
  function measure() {
    const r = track.getBoundingClientRect();
    span.top = r.top + scrollY;
    span.run = Math.max(1, track.offsetHeight - stage.offsetHeight);
  }
  function fit() {
    const w = host.clientWidth || innerWidth;
    const h = host.clientHeight || innerHeight;
    size.w = w;
    size.h = h;
    size.A = w / h;
    renderer.setPixelRatio(prFor(w, h));
    renderer.setSize(w, h, false);
    flight.setAspect(size.A);
    measure();
  }

  // ── room labels: an HTML overlay (index.html, window.__dfRooms) pinned to 3D points, shown on the establishing shot
  // only (inside the rooms the scene's own words name the place) ──
  const rooms = () => window.__dfRooms;
  const lb = logoBox(world.letterBack);
  const hull = [];
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const toPx = (v) => {
    tmp.copy(v).project(camera);
    return [((tmp.x + 1) / 2) * size.w, ((1 - tmp.y) / 2) * size.h];
  };
  function placeRooms() {
    if (!rooms()) return;
    hull.length = 0;
    for (let i = 0; i < 8; i++) {
      hull.push(toPx(tmp2.set(i & 1 ? lb.max.x : lb.min.x, i & 2 ? lb.max.y : lb.min.y, i & 4 ? lb.max.z : lb.min.z)));
    }
    // the dining pendants' wires, from their ceiling rose down to just above each shade: no tag name may sit on them
    const bars = world.wires.map((w) => {
      const [bx, by] = toPx(w.bottom);
      const [, ty] = toPx(w.top);
      return [bx - 7, ty - 4, bx + 7, by - 14];
    });
    rooms().place(
      world.rooms.map((r) => {
        const [x, y] = toPx(r.at);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < 8; i++) {
          const b = r.box;
          const [px, py] = toPx(tmp2.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
          x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
        return { k: r.k, x, y, on: true, box: [x0, y0, x1, y1] };
      }),
      [hull],
      bars,
    );
  }

  // ── the page around the stage: each scene's words, the route rail, the scroll hint ──
  const ui = {
    copies: SCENES.map((id) => stage.querySelector(`.fl-scene[data-scene="${id}"] .fl-copy`)),
    rail: stage.querySelector('.fl-rail'),
    fill: stage.querySelector('.fl-rail-fill'), // --p goes here only: on .fl-rail it restyled the whole rail every frame
    stops: [...stage.querySelectorAll('.fl-rail [data-go]')],
    hint: stage.querySelector('.fl-hint'),
    last: { copy: [], active: -1, fill: -1, chrome: -1, hint: -1 },
  };
  function setUI(p, intro) {
    // intro: 0..1 how far the opening has brought the rail and the hint in (1 once it has settled). The first scene's
    // words (the page's h1) do not wait for it: they are on screen from the first paint.
    const lv = copyLevels(p);
    lv.forEach((v, i) => {
      const el = ui.copies[i];
      if (!el) return;
      const q = Math.round(v * 1000) / 1000;
      if (ui.last.copy[i] === q) return;
      ui.last.copy[i] = q;
      el.style.opacity = String(q);
      // a short rise as the words come in; they settle while the camera lingers
      el.style.transform = q >= 1 ? '' : `translate3d(0, ${((1 - q) * 16).toFixed(1)}px, 0)`;
      el.classList.toggle('is-shown', q > 0.5);
    });
    const chrome = Math.round(clamp01(intro * 1.0) * 1000) / 1000;
    if (ui.rail && chrome !== ui.last.chrome) {
      ui.last.chrome = chrome;
      ui.rail.style.opacity = String(chrome);
      ui.rail.style.visibility = chrome > 0 ? 'visible' : 'hidden';
    }
    const active = sceneAt(p);
    if (active !== ui.last.active) {
      ui.last.active = active;
      ui.stops.forEach((b, i) => (i === active ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    }
    const f = Math.round(railAt(p) * 1000) / 1000;
    if (ui.rail && f !== ui.last.fill) {
      ui.last.fill = f;
      (ui.fill || ui.rail).style.setProperty('--p', String(f)); // the rail's line fills to here (vertical on desktop, across on phones)
    }
    const h = Math.round(intro * (1 - clamp01(p / 0.035)) * 1000) / 1000;
    if (ui.hint && h !== ui.last.hint) {
      ui.last.hint = h;
      ui.hint.style.opacity = String(h);
      ui.hint.classList.toggle('is-gone', h === 0);
    }
  }

  // ── state ──
  let t0 = 0;
  let tFrom = 0; // where the opening starts: OPEN_FROM once the stage is ours (the poster showed the world till then)
  let introDone = false;
  let frozenT = null; // set by __dfHero.at(t)
  let frozenP = null; // set by __dfFlight.seek(p)
  let customPose = null; // set by __dfFlight.pose({...}) (review only)
  let rushAt = null; // [t, now] when a scroll during the opening sped up the rest of it
  let pTarget = 0;
  let pCur = 0;
  let visible = true;
  let last = 0;
  let readyFired = false;
  let labelsOn = false;
  const cam = {};

  let openT = 0; // the opening's time last set (a late refurnish puts the new rooms in the same state)
  function setOpening(t) {
    openT = t;
    // the canvas shows only once the stage is ours: before that it has not been drawn (an undrawn canvas is opaque
    // black) and the poster must stay on screen
    if (gate.mode === '3d') canvas.style.opacity = String(tFrom ? ease((t - tFrom) / POSTER_FADE) : ease(t / 0.6));
    // daylight comes up from a soft early light to the full sun (never out of the dark: the page around it is light)
    const lk = 0.5 + 0.5 * ease(t / 1.6);
    lights.hemi.intensity = lights.base.hemi * lk;
    lights.key.intensity = lights.base.key * lk;
    for (const g of world.pieces) {
      const r = (t - g.userData.delay) / 0.95;
      g.visible = r > 0;
      g.position.y = -g.userData.rise * (1 - easeQuart(r));
    }
    for (const Lt of world.letters) {
      const start = (Lt.line === 1 ? 1.2 : 1.75) + Lt.index * 0.11;
      const r = (t - start) / 0.75;
      Lt.pivot.visible = r > 0;
      Lt.pivot.position.y = Lt.y - 10 * (1 - ease(r));
      Lt.pivot.scale.z = Math.max(0.06, easeOutBack((t - start - 0.28) / 0.7));
    }
    // bulbs switch on one by one with a short flicker
    world.bulbs.forEach((bl, i) => {
      const s = t - (2.4 + i * 0.12);
      const k = s <= 0 ? 0 : s < 0.07 ? 1 : s < 0.14 ? 0.2 : ease((s - 0.14) / 0.3);
      const u = bl.userData;
      u.glass.emissiveIntensity = 0.15 + 2.05 * k;
      const hb = u.halo.userData.glow?.base ?? 0.8;
      u.halo.material.opacity = hb * k;
      if (u.light) u.light.intensity = u.base * k;
    });
    // the lit niches, the room lamps and their glows warm up together; daylight comes with the room light
    const nk = ease((t - 2.25) / 0.75);
    const dk = ease((t - 0.7) / 1.4);
    M.warm.emissiveIntensity = 0.04 + 0.16 * nk;
    for (const l of world.lamps) l.light.intensity = l.base * nk;
    for (const g of world.glows) {
      const kk = g.kind === 'day' ? dk : nk;
      if (g.emissive) g.mat.emissiveIntensity = g.base * kk;
      else if (g.basic) g.mat.color.copy(g.color0).multiplyScalar(0.2 + 0.8 * kk);
      else if (g.uniform) g.mat.uniforms.opacity.value = g.base * kk;
      else g.mat.opacity = g.base * kk;
    }
  }

  // the camera's settle during the opening: from a little left, higher and farther, onto the establishing shot
  const openMods = (t) => {
    const k = 1 - ease(t / 3.2);
    return { daz: -9 * k, del: 4 * k, dist: 1 + 0.3 * k, dy: -2 * k };
  };

  function frame(p, t) {
    if (customPose) {
      Object.assign(cam, customPose);
    } else {
      flight.at(p, t < INTRO && !tFrom ? openMods(t) : {}, cam);
    }
    applyCamera(camera, cam, size.A);
    scene.fog.near = cam.d + 80;
    scene.fog.far = cam.d + 340;
  }

  let dprSeen = devicePixelRatio;
  function draw(now) {
    raf = 0;
    try {
      // a resolution change the media query below did not report (some browsers, emulators): refit before drawing
      if (devicePixelRatio !== dprSeen) {
        dprSeen = devicePixelRatio;
        fit();
      }
      const gap = last ? now - last : 0; // since the frame before, when frames run back to back
      const dt = last ? Math.min(0.1, gap / 1000) : 1 / 60;
      last = now;
      if (!t0) t0 = now;
      let active = false;
      let t = INTRO;
      if (frozenT != null) t = frozenT;
      else if (!introDone) {
        t = rushAt ? rushAt[0] + (RUSH * (now - rushAt[1])) / 1000 : tFrom + (now - t0) / 1000;
        // the visitor is already scrolling: play the rest of the opening fast, so the lamps are on and the settle is
        // over before the camera reaches the first room
        if (!rushAt && pTarget > 0.02) rushAt = [t, now];
        if (t >= INTRO) {
          t = INTRO;
          setOpening(INTRO + 1);
          onIntroDone();
        } else {
          setOpening(t);
          active = true;
        }
      }
      // the flight: damped toward the scroll position (frame-rate independent), exact when seeked
      if (frozenP != null) pCur = frozenP;
      else if (reduceMQ.matches) pCur = pTarget; // no easing: the frame follows the scroll exactly
      else if (pCur !== pTarget) {
        const k = 1 - Math.exp(-dt / (mobile ? 0.07 : 0.09));
        pCur += (pTarget - pCur) * k;
        if (Math.abs(pTarget - pCur) < 2e-5) pCur = pTarget;
        else active = true;
      }
      frame(pCur, t);
      renderer.render(scene, camera);
      // frames that run back to back (the opening, the camera catching up with the scroll): the gaps between them are
      // what a frame costs here
      const live = frozenT == null && frozenP == null && !customPose;
      if (!qual.done && live && gap && (introDone || t >= 0.6)) qual.costs.push(gap);
      const intro = frozenT != null || !introDone ? ease((t - 2.5) / 0.7) : 1;
      setUI(pCur, intro);
      const wantLabels = (introDone || (frozenT != null && t >= INTRO)) && pCur < 0.02 && !customPose;
      if (wantLabels !== labelsOn) {
        labelsOn = wantLabels;
        rooms()?.show(labelsOn);
      }
      if (labelsOn) placeRooms();
      // decide at the end of the opening (when a scroll cut it short, as soon as a few more frames have been timed)
      if (!qual.done && live && qual.costs.length >= 4 && (introDone || t >= 3.2) && govern()) return; // handed over
      // phones: once more while flying (the rooms can cost more than the opening view), over 40 back-to-back frames
      if (qual.flight && live && gap && introDone && active) {
        qual.flight.push(gap);
        if (qual.flight.length >= 40) {
          const f = qual.flight.sort((a, b) => a - b)[30];
          qual.flight = null;
          timing.flightCost = Math.round(f * 10) / 10;
          if (f > 28) {
            gate.fallback('slow phone (flight)');
            disposeAll();
            return;
          }
        }
      }
      if (active) request();
      else last = 0;
    } catch (err) {
      // a frame that throws would leave a blank or half-drawn stage for good: hand it to the static scenes
      cancelAnimationFrame(raf);
      raf = 0;
      gate.fallback('3D frame failed: ' + err.message);
      disposeAll();
    }
  }

  function request() {
    if (disposed || raf || !visible || document.hidden || gate.mode !== '3d') return;
    raf = requestAnimationFrame(draw);
  }

  // Once, when the opening ends (or a few frames later, if a scroll cut it short): what a frame cost (the median gap
  // between back-to-back frames; the opening also redraws the shadow map every frame, so this errs on the slow side). Over 22 ms (under 45 frames a second):
  // fewer pixels, down to 0.75x. A phone under 12 ms (a 90 or 120 Hz screen with time to spare): more pixels, up to
  // 1.75x within the budget. If even 0.75x would stay over 50 ms (under 20 frames a second), the flight would crawl:
  // the static scenes take over. Returns true when it handed the stage over.
  // (The window fill light and the pendant light are not dropped here as they are on phones: changing the number of
  // lights would recompile every shader, a long freeze on exactly the GPUs this is for.)
  function govern() {
    qual.done = true;
    const c = qual.costs.slice().sort((a, b) => a - b);
    timing.frameCost = c.map((v) => Math.round(v * 10) / 10);
    if (c.length < 4) return false;
    // phones are judged by their slower frames (the 75th percentile): that is the stutter a finger feels. A phone that
    // cannot keep about 36 frames a second hands the stage to the still scenes, which scroll smoothly (owner
    // 2026-10-28: "부드럽게 보여지지가 않아"); phones are never given more pixels (it cost frames on 120 Hz screens)
    const m = mobile ? c[Math.floor(c.length * 0.75)] : c[c.length >> 1];
    qual.flight = mobile ? [] : null;
    if (mobile && m > 28) {
      timing.quality = { cost: Math.round(m * 10) / 10, to: 'stills' };
      gate.fallback('slow phone');
      disposeAll();
      return true;
    }
    let k = 1;
    if (m > (mobile ? 18 : 22)) k = Math.sqrt(16 / m);
    if (k === 1) return false;
    const pr0 = renderer.getPixelRatio();
    qual.k = k;
    fit();
    const pr1 = renderer.getPixelRatio();
    timing.quality = { cost: Math.round(m * 10) / 10, from: +pr0.toFixed(2), to: +pr1.toFixed(2) };
    const r = pr1 / pr0;
    if (m * (0.3 + 0.7 * r * r) > 50) {
      gate.fallback('slow GPU');
      disposeAll();
      return true;
    }
    renderer.shadowMap.needsUpdate = true;
    request();
    return false;
  }

  function onIntroDone() {
    introDone = true;
    renderer.shadowMap.autoUpdate = false; // nothing moves any more: keep the shadow map
    renderer.shadowMap.needsUpdate = true;
    if (!readyFired) {
      readyFired = true;
      dispatchEvent(new CustomEvent('df:hero-ready', { detail: { mode: '3d' } }));
    }
  }

  const readScroll = () => {
    pTarget = clamp01((scrollY - span.top) / span.run);
  };

  // ── first frame while the stage is still dark, then take over from the gate ──
  try {
    fit();
    readScroll();
    pCur = pTarget;
    setOpening(0);
    frame(pCur, 0);
    // compile the shaders without one long block: with KHR_parallel_shader_compile the driver links them in the
    // background; without it, each program is linked in its own task (getUniforms() waits for its link)
    let t = performance.now();
    // compile with everything switched on and in place, so no program is missing when the lamps come up. The canvas
    // stays hidden: it is not drawn yet, so the poster stays on screen (2026-10-26 review: it went black here)
    setOpening(INTRO + 1);
    canvas.style.opacity = '0';
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
      timing.link = [Math.round(performance.now() - t)];
      for (const prog of renderer.info.programs.slice()) {
        await yieldNow();
        if (!stillWaiting()) return;
        const tl = performance.now();
        prog.getUniforms();
        timing.link.push(Math.round(performance.now() - tl));
      }
    }
    timing.compile = Math.round(performance.now() - t);
    await yieldNow();
    if (!stillWaiting()) return;
    // the models' textures, uploaded now in small batches rather than all in the first frame
    t = performance.now();
    await uploadTextures(M.lib.textures());
    timing.textures = Math.round(performance.now() - t);
    if (!stillWaiting()) return;
    // one hidden frame of the finished world: the programs three makes only when it first draws (the shadow map's
    // depth programs, the letters' clipped shadows) are made now, behind the poster, not in the opening's first frames
    t = performance.now();
    setOpening(INTRO + 1);
    renderer.shadowMap.needsUpdate = true;
    frame(pCur, INTRO);
    renderer.render(scene, camera);
    timing.warm = Math.round(performance.now() - t);
    await yieldNow();
    if (!stillWaiting()) return;
    // opening the page part way down (a reload, a link into the flight), or with reduced motion (only when 3D was
    // forced with ?hero=3d; otherwise the gate shows the static scenes): no opening, the finished frame at once.
    // The scroll is read again here: the page may have moved while the shaders compiled (a fast first swipe, the
    // browser restoring the scroll position).
    readScroll();
    pCur = pTarget;
    if (pTarget > 0.02 || reduceMQ.matches) onIntroDone();
    else setOpening(0);
    t = performance.now();
    frame(pCur, introDone ? INTRO : 0);
    renderer.render(scene, camera);
    timing.first = Math.round(performance.now() - t);
  } catch (err) {
    disposeAll();
    gate.fallback('3D first frame failed: ' + err.message);
    return;
  }
  if (glFailed) {
    disposeAll();
    gate.fallback('3D shader error');
    return;
  }
  if (!stillWaiting()) return;
  gate.claim();
  timing.claimed = Math.round(performance.now());
  timing.boot = Math.round(performance.now() - tBoot);
  // the track's height follows the mode the gate set; measure again now that the stage is ours
  measure();
  readScroll();
  if ((pTarget > 0.02 || reduceMQ.matches) && !introDone) {
    // the page moved after the decision above: skip the opening, and show the world it would have built
    setOpening(INTRO + 1);
    onIntroDone(); // asks for a new shadow map, drawn with the finished world
  }
  if (introDone) {
    pCur = pTarget;
    canvas.style.opacity = '1';
  } else {
    // the poster showed the finished world while this loaded: fade in over it, from the point where the far blocks stand
    tFrom = OPEN_FROM;
    setOpening(tFrom);
  }

  on(canvas, 'webglcontextlost', () => {
    cancelAnimationFrame(raf);
    raf = 0;
    gate.fallback('WebGL context lost');
  });
  // three.js keeps the lost context restorable (it calls preventDefault): when it comes back, take the stage again
  on(canvas, 'webglcontextrestored', () => {
    if (gate.restore && gate.restore()) {
      renderer.shadowMap.needsUpdate = true;
      requestAnimationFrame(() => {
        measure();
        readScroll();
        pCur = pTarget;
        request();
      });
    }
  });

  io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) {
      // back on screen after a jump (a menu link, the browser's back button): no long catch-up flight
      readScroll();
      if (Math.abs(pTarget - pCur) > 0.12) pCur = pTarget;
      request();
    }
  });
  io.observe(stage);
  on(document, 'visibilitychange', () => !document.hidden && request());
  // the stage is one large-viewport tall, so a phone's address bar sliding in or out does not resize it; a rotation or
  // a window resize does, and the track's height changes with it
  ro = new ResizeObserver(() => {
    fit();
    readScroll();
    pCur = frozenP ?? pTarget;
    request();
  });
  ro.observe(stage);
  // a resolution change alone (window moved to a Retina screen, browser zoom) does not resize the stage
  const watchDpr = () => {
    on(
      matchMedia(`(resolution: ${devicePixelRatio}dppx)`),
      'change',
      () => {
        watchDpr();
        dprSeen = devicePixelRatio;
        fit();
        request();
      },
      { once: true },
    );
  };
  watchDpr();

  on(
    window,
    'scroll',
    () => {
      const before = pTarget;
      readScroll();
      if (pTarget !== before) request();
    },
    { passive: true },
  );
  // content below the hero can change height (fonts, the portfolio filter): the track's place is measured again
  on(window, 'load', () => {
    measure();
    readScroll();
    request();
  });

  // the route rail: each stop scrolls to the middle of its scene's dwell
  const go = (id) => {
    const top = span.top + STOP[id] * span.run;
    scrollTo({ top: Math.round(top), behavior: reduceMQ.matches ? 'auto' : 'smooth' });
  };
  ui.stops.forEach((b) => on(b, 'click', () => go(b.dataset.go)));
  // keyboard focus moving into a scene's words (its link) brings that scene on screen at once: a smooth flight across
  // the track would keep the focused link invisible until the camera got there
  SCENES.forEach((id, i) => {
    if (!ui.copies[i]) return;
    on(ui.copies[i], 'focusin', () => {
      const [a, b] = DWELL[id];
      if (pTarget >= a - 0.001 && pTarget <= b + 0.001) return;
      scrollTo({ top: Math.round(span.top + STOP[id] * span.run), behavior: 'instant' });
      readScroll();
      pCur = pTarget;
      request();
    });
  });

  // reduced motion switched on while the flight is showing: the static scenes take over
  on(reduceMQ, 'change', () => {
    if (reduceMQ.matches && !forced) {
      gate.fallback('reduced motion');
      disposeAll();
    }
  });

  // review hooks draw at full quality: they stop a governor that has not decided yet and undo what it did
  const reviewQuality = () => {
    qual.done = true;
    if (qual.k !== 1) {
      qual.k = 1;
      fit();
    }
  };
  // the opening at its end state (also after __dfHero.at() left it part way)
  const finishIntro = () => {
    if (!introDone || frozenT != null) {
      frozenT = null;
      setOpening(INTRO + 1);
      renderer.shadowMap.needsUpdate = true;
      onIntroDone();
    }
  };

  // review hooks: __dfHero.at(t) freezes the opening at t seconds (at the top of the flight), replay() plays it again
  window.__dfHero = {
    get mode() { return gate.mode; },
    renderer, scene, camera, world, timing, flight,
    request,
    get quality() { return { k: qual.k, pr: renderer.getPixelRatio(), done: qual.done, ...timing.quality }; },
    // the model library: loaded / used in the rooms / failed, and whether the rooms were refurnished after the build
    get models() { return { state: lib.state, loaded: lib.size, used: M.lib.size, failed: lib.failed.slice(), ms: lib.ms, refurnished: refurnished > 0, refurnishes: refurnished, settled: lib.state !== 'loading', textures: M.lib.textures().length }; },
    // review only: run the governor as if the opening had measured `ms` per frame (it may hand over to the static scenes)
    testGovern(ms) {
      qual.k = 1;
      fit();
      qual.costs = [ms, ms, ms, ms];
      qual.done = false;
      return { static: govern(), ...this.quality };
    },
    at(t) {
      reviewQuality();
      tFrom = 0; // review: the whole opening, as it plays without the poster
      frozenT = t;
      frozenP = 0;
      pCur = 0;
      renderer.shadowMap.autoUpdate = true;
      setOpening(t);
      draw(performance.now());
      renderer.shadowMap.autoUpdate = false;
      return t;
    },
    replay() {
      frozenT = null;
      frozenP = null;
      t0 = 0;
      tFrom = 0;
      introDone = false;
      renderer.shadowMap.autoUpdate = true;
      setOpening(0);
      request();
      return true;
    },
  };
  // __dfFlight.seek(p) draws the flight at exactly p (scroll is ignored until release()); stops / dwell describe it
  window.__dfFlight = {
    get p() { return pCur; },
    get target() { return pTarget; },
    stops: STOP,
    dwell: DWELL,
    scenes: SCENES,
    // measured afresh: the gate calls it right after swapping heroes, before the stage's ResizeObserver has run
    scrollFor(p) {
      measure();
      return Math.round(span.top + (typeof p === 'string' ? STOP[p] : p) * span.run);
    },
    seek(p) {
      if (typeof p === 'string') p = STOP[p];
      reviewQuality();
      finishIntro();
      customPose = null;
      frozenP = clamp01(p);
      draw(performance.now());
      return { p: frozenP, scene: SCENES[sceneAt(frozenP)], cam: cam.pos.toArray().map((v) => +v.toFixed(2)), fov: +cam.fov.toFixed(1) };
    },
    release() {
      frozenP = null;
      customPose = null;
      readScroll();
      request();
    },
    // review only: draw an arbitrary view { T: [x,y,z], az, el (degrees), d, fov }
    pose({ T, az, el, d, fov = 40 }) {
      reviewQuality();
      finishIntro();
      const r = Math.PI / 180;
      const target = new THREE.Vector3(...T);
      const pos = target.clone().add(new THREE.Vector3(Math.cos(el * r) * Math.sin(az * r), Math.sin(el * r), Math.cos(el * r) * Math.cos(az * r)).multiplyScalar(d));
      customPose = { target, pos, fov, d, near: Math.max(0.4, Math.min(d * 0.5, d - 220)), far: d + 520 };
      draw(performance.now());
      return pos.toArray().map((v) => +v.toFixed(2));
    },
  };

  // the rest of the model library, arriving after the build: the rooms are furnished again in the background (one room
  // per task), their new shaders compiled and textures uploaded, then swapped in between two frames.
  // When (2026-10-26 review): never during the opening (that work would land in the frames the governor times, and the
  // swap would show), only once it is over and the browser is idle; and the swap waits while the camera lingers in a
  // furnished room, so it lands on the establishing shot (tiny furniture), between rooms, or off screen. It runs again
  // whenever more models arrive (1.5 s after the last one), so one stalled download does not hold back the rest.
  let refurnished = 0;
  const lingering = () => visible && !document.hidden && ['living', 'kitchen', 'bedroom'].some((id) => pCur >= DWELL[id][0] - 0.03 && pCur <= DWELL[id][1] + 0.03);
  async function refurnish() {
    if (disposed || lib.size <= M.lib.size) return;
    const t = performance.now();
    M.lib = lib.snapshot();
    const job = world.refurnishSteps();
    for (const st of job.steps) {
      st();
      await yieldNow();
      if (disposed) return;
    }
    // compile without one long block (as at boot): in the background where the driver can, else one link per task
    const fresh = job.group();
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(fresh, camera, scene);
    } else {
      const known = new Set(renderer.info.programs);
      renderer.compile(fresh, camera, scene);
      for (const prog of renderer.info.programs.slice()) {
        if (known.has(prog)) continue;
        await yieldNow();
        if (disposed) return;
        prog.getUniforms();
      }
    }
    if (disposed) return;
    await uploadTextures(M.lib.textures());
    if (disposed) return;
    while (lingering() && frozenP == null && !customPose) {
      await new Promise((r) => setTimeout(r, 250));
      if (disposed) return;
    }
    disposeUnused(job.apply(), scene);
    setOpening(openT); // the new rooms in the opening's current state (risen, lamps on)
    renderer.shadowMap.needsUpdate = true;
    refurnished++;
    timing.refurnish = Math.round(performance.now() - t);
    request();
  }
  {
    const opened = new Promise((r) => (introDone ? r() : on(window, 'df:hero-ready', () => r(), { once: true })));
    const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 2000 }) : setTimeout(r, 300)));
    let quiet = 0;
    let busy = false;
    const upgrade = async () => {
      // phones keep the furniture they were furnished with: a late rebuild froze the first scroll for up to 0.36 s
      if (busy || disposed || mobile || lib.size <= M.lib.size) return;
      busy = true;
      try {
        await opened;
        await idle();
        await refurnish();
      } catch (err) {
        console.warn('[deepflat] refurnish failed:', err);
      } finally {
        busy = false;
      }
      if (!disposed && lib.size > M.lib.size) upgrade(); // more arrived while it ran
    };
    lib.onAdd = () => {
      clearTimeout(quiet);
      quiet = setTimeout(upgrade, 1500);
    };
    if (lib.size > M.lib.size) lib.onAdd(); // models that arrived after the rooms were furnished, before this was set
    lib.settled.then(() => {
      clearTimeout(quiet);
      upgrade();
    });
  }
  request();
}
