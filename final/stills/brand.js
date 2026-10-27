// The brand picture (portrait 4:5, images/brand/brand-*): the brand section's carousel shows it as its one slide when
// final/data/carousel.json is missing (index.html GEN:carousel, final/svg/carousel.mjs).
// Daylight (2026-10-26): it is the carousel's living room (carousel.js: blush plaster, an arched window, a sage sofa, an
// oval oak table, a lamp on a side table), framed for the portrait picture, so the fallback looks like the carousel it
// stands in for. The night version (a dark clay corner with a lamp-lit arch) is gone.
import { buildCarousel } from './carousel.js';

export async function buildBrand(scene, params) {
  const q = new URLSearchParams(params);
  q.set('room', 'living');
  const built = await buildCarousel(scene, q);
  return { ...built, note: 'brand (carousel living room, portrait)' };
}
