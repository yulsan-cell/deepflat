// Recolour the D (of DEEP) and F (of FLAT) fronts in the DEEPFLAT key visual to ember #DE622E, keeping the photo's shading.
// Writes deepflat-key-df.png/.webp/.avif (the poster in the brand section) from the untouched original assets/deepflat-key.png.
// usage (from the deepflat folder): node final/img/recolor-key.cjs ../../../node_modules/sharp assets/deepflat-key.png final/img [preview.png]
const [sharpDir, src, outDir, preview] = process.argv.slice(2);
const path = require('path');
const sharp = require(path.resolve(sharpDir));

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const srgb = (v) => { v = Math.min(Math.max(v, 0), 1); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
const Y = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const Ls = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b; // sRGB-weighted, for thresholds
const EMBER = [0xde, 0x62, 0x2e].map(lin);
const smooth = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };

// The D and the F fill one column of the key visual: x 100..160 (the dark seam to E and L is at x 160..161), y 105..300.
// Only cream pixels in it are the two letter fronts; the wall above and the slits stay as they are.
const X0 = 100, X1 = 160, Y0 = 105, Y1 = 300;

(async () => {
  const img = sharp(src);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  // reference: the median luminance of the cream fronts maps to #DE622E
  const ys = [];
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = (y * W + x) * C;
    if (Ls(data[i], data[i + 1], data[i + 2]) > 140) ys.push(Y(data[i], data[i + 1], data[i + 2]));
  }
  ys.sort((a, b) => a - b);
  const Yref = ys[Math.floor(ys.length / 2)];
  let n = 0;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const w = smooth(45, 110, Ls(r, g, b));
    if (w <= 0) continue;
    const s = Y(r, g, b) / Yref;
    const o = EMBER.map((e) => srgb(e * s));
    data[i] = Math.round(r + (o[0] - r) * w);
    data[i + 1] = Math.round(g + (o[1] - g) * w);
    data[i + 2] = Math.round(b + (o[2] - b) * w);
    n++;
  }
  const raw = { raw: { width: W, height: info.height, channels: C } };
  const base = path.join(outDir, 'deepflat-key-df');
  await sharp(data, raw).removeAlpha().png({ compressionLevel: 9 }).toFile(base + '.png');
  await sharp(data, raw).removeAlpha().webp({ quality: 82 }).toFile(base + '.webp');
  await sharp(data, raw).removeAlpha().avif({ quality: 58 }).toFile(base + '.avif');
  if (preview) {
    const crop = { left: 60, top: 80, width: 200, height: 260 };
    const a = await sharp(src).extract(crop).resize(600, 780, { kernel: 'lanczos3' }).png().toBuffer();
    const b = await sharp(base + '.avif').extract(crop).resize(600, 780, { kernel: 'lanczos3' }).png().toBuffer();
    await sharp({ create: { width: 1210, height: 780, channels: 3, background: '#808080' } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: 610, top: 0 }]).png().toFile(preview);
  }
  console.log(JSON.stringify({ recoloured: n, medianFrontGrey: srgb(Yref) }));
})();
