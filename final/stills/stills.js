// Builds the scene named by the URL, renders it as an average of many jittered frames, then raises window.__stillReady.
import { THREE, makeRenderer, accumulate } from './lib.js';

const params = new URLSearchParams(location.search);
const status = document.getElementById('status');
window.__stillReady = false;

async function main() {
  const renderer = makeRenderer(document.getElementById('c'));
  const scene = new THREE.Scene();
  const name = params.get('scene') ?? 'brand';
  let built;
  if (name === 'brand') {
    const { buildBrand } = await import('./brand.js');
    built = await buildBrand(scene, params);
  } else if (name === 'flight') {
    const { buildFlightStill } = await import('./flight.js');
    built = await buildFlightStill(scene, params);
  } else if (name === 'carousel') {
    const { buildCarousel } = await import('./carousel.js');
    built = await buildCarousel(scene, params);
  } else {
    const { buildHome } = await import('./homes.js');
    built = await buildHome(scene, params);
  }
  const samples = params.get('debug') ? 1 : Number(params.get('samples') ?? built.samples ?? 48);
  status.textContent = 'rendering…';
  const info = await accumulate(renderer, scene, built.camera, {
    samples,
    jitters: built.jitters,
    vignette: Number(params.get('vig') ?? built.vignette ?? 0.35),
    edge: built.edge ?? null,
    tone: built.tone ?? null,
    onProgress: (n, ms) => (status.textContent = `${n}/${samples} · ${Math.round(ms)} ms`),
  });
  window.__stillInfo = { ...info, samples, programs: renderer.info.programs.length, calls: renderer.info.render.calls, note: built.note || '' };
  document.body.classList.add('done');
  window.__stillReady = true;
}

main().catch((err) => {
  window.__stillError = String(err && err.stack ? err.stack : err);
  status.textContent = 'error: ' + err.message;
  window.__stillReady = true;
});
