// DEEP / FLAT letter shapes for the 3D hero (adapted from ../../3d/glyphs.js).
// Matched to the key visual: tall, narrow, very heavy block letters on one column grid
// (D over F, E over L, E over A, P over T), D and P square with only slightly rounded corners,
// a flat-topped A, and hairline counters and seams.
// Units: letter height H = 10, origin at the bottom-left of each letter (baseline), y up.

export const H = 10;
export const W = 6.2; // every column is the same width, as in the key visual
// Seams wide enough that every letter shows its own dark gap and side, as in the key visual,
// so the D and the F read as two separate ember letters instead of one orange pillar.
export const KERN = 0.5; // seam between letters
export const LEADING = 0.45; // seam between DEEP and FLAT

const K = 0.55; // bezier factor of a quarter circle
const R = 1.0; // corner radius of D and P: square, only slightly softened
const SLIT = 0.5; // counters and the gaps between E and F arms
// Every letter takes the slit width (sl). Only the small header logo passes a wider one (final/svg/minis.mjs): at 50px
// the 0.5 slit is about 1px, filled by the letter's own side, and the D and F read as solid ember bars.
const arm = (sl) => (H - 2 * sl) / 3;

// right edge from (w, y0) to (w, y1) with rounded corners rb (bottom) and rt (top)
function roundRight(cmds, w, y0, y1, rb, rt) {
  cmds.push(['L', w - rb, y0]);
  cmds.push(['C', w - rb + rb * K, y0, w, y0 + rb - rb * K, w, y0 + rb]);
  cmds.push(['L', w, y1 - rt]);
  cmds.push(['C', w, y1 - rt + rt * K, w - rt + rt * K, y1, w - rt, y1]);
}

const rect = (x0, y0, x1, y1) => [['M', x0, y0], ['L', x0, y1], ['L', x1, y1], ['L', x1, y0], ['Z']];

// the counters of D, P and A stay centred where the 0.5 slit has them as they widen
function D(sl = SLIT) {
  const o = [['M', 0, 0]];
  roundRight(o, W, 0, H, R, R);
  o.push(['L', 0, H], ['Z']);
  return { w: W, outline: o, holes: [rect(3 - sl / 2, 2.6, 3 + sl / 2, 7.4)] };
}

function E(sl = SLIT) {
  const s = 2.9, ARM = arm(sl);
  const a = ARM, b = ARM + sl, c = 2 * ARM + sl, d = 2 * ARM + 2 * sl;
  return {
    w: W,
    outline: [['M', 0, 0], ['L', W, 0], ['L', W, a], ['L', s, a], ['L', s, b], ['L', W, b], ['L', W, c], ['L', s, c], ['L', s, d], ['L', W, d], ['L', W, H], ['L', 0, H], ['Z']],
    holes: [],
  };
}

function P(sl = SLIT) {
  const s = 3.0, yb = arm(sl) + sl;
  const o = [['M', 0, 0], ['L', s, 0], ['L', s, yb]];
  roundRight(o, W, yb, H, R * 0.8, R);
  o.push(['L', 0, H], ['Z']);
  return { w: W, outline: o, holes: [rect(3 - sl / 2, 5.3, 3 + sl / 2, 8.0)] };
}

function F(sl = SLIT) {
  const s = 2.9, ARM = arm(sl);
  const b = ARM + sl, c = 2 * ARM + sl, d = 2 * ARM + 2 * sl;
  return {
    w: W,
    outline: [['M', 0, 0], ['L', s, 0], ['L', s, b], ['L', W - 0.35, b], ['L', W - 0.35, c], ['L', s, c], ['L', s, d], ['L', W, d], ['L', W, H], ['L', 0, H], ['Z']],
    holes: [],
  };
}

function L(sl = SLIT) {
  const s = 3.1, ARM = arm(sl);
  return { w: W, outline: [['M', 0, 0], ['L', W, 0], ['L', W, ARM], ['L', s, ARM], ['L', s, H], ['L', 0, H], ['Z']], holes: [] };
}

// flat-topped trapezoid with a notch between the legs and a hairline counter
function A(sl = SLIT) {
  const inset = 0.85, n0 = 3.1 - sl / 2, n1 = n0 + sl;
  return {
    w: W,
    outline: [['M', 0, 0], ['L', n0, 0], ['L', n0, 2.4], ['L', n1, 2.4], ['L', n1, 0], ['L', W, 0], ['L', W - inset, H], ['L', inset, H], ['Z']],
    holes: [rect(n0, 3.9, n1, 7.5)],
  };
}

function T(sl = SLIT) {
  const s0 = 1.55, s1 = W - 1.55, y = 2 * arm(sl) + 2 * sl;
  return { w: W, outline: [['M', s0, 0], ['L', s1, 0], ['L', s1, y], ['L', W, y], ['L', W, H], ['L', 0, H], ['L', 0, y], ['L', s0, y], ['Z']], holes: [] };
}

const GLYPHS = { D, E, P, F, L, A, T };

// one letter's outline commands ({ w, outline, holes }); the SVG logos (final/svg/iso.mjs) and the favicon are drawn
// from these too, so every DEEPFLAT logo on the page has the same letterforms (slit: see SLIT above)
export const glyph = (ch, slit = SLIT) => GLYPHS[ch](slit);

// brand rule: the D of DEEP and the F of FLAT are ember, the other letters bone
export const isEmber = (line, index) => index === 0;

// two rows: [{ ch, glyph, x, y, line, index }] (y = baseline)
export function layout() {
  const lines = ['DEEP', 'FLAT'];
  const out = [];
  lines.forEach((word, li) => {
    const y = (lines.length - 1 - li) * (H + LEADING);
    [...word].forEach((ch, i) => {
      out.push({ ch, glyph: GLYPHS[ch](), x: i * (W + KERN), y, line: li, index: i });
    });
  });
  return out;
}

export function bounds() {
  return { w: 4 * W + 3 * KERN, h: 2 * H + LEADING };
}

export function toShape(THREE, glyph) {
  const shape = new THREE.Shape();
  draw(shape, glyph.outline);
  for (const hole of glyph.holes) {
    const p = new THREE.Path();
    draw(p, hole);
    shape.holes.push(p);
  }
  return shape;
}

function draw(target, cmds) {
  for (const c of cmds) {
    if (c[0] === 'M') target.moveTo(c[1], c[2]);
    else if (c[0] === 'L') target.lineTo(c[1], c[2]);
    else if (c[0] === 'C') target.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
  }
}
