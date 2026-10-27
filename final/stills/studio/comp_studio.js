// studio compositor: the pieces (RGBA, straight alpha) over a tinted, soft alpha shadow -> one RGBA PNG.
// node comp_studio.js <render.png> <shadow.png> <out.png> <shadowHex> [k] [max]
const sharp = require('C:/Users/joung/클로드 코드/yulsan-web/node_modules/sharp');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
(async () => {
  const [rp, sp, op, shHex = '#6E4A3A', k = '0.85', mx = '0.5', glowArg] = process.argv.slice(2);
  // optional bloom around a lamp: glowArg = 'x,y,r,#hex,alpha' with x, y, r as fractions of the frame width
  const SH = hex(shHex), K = +k, MX = +mx;
  const room = await sharp(rp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = room.info;
  const sh = await sharp(sp).ensureAlpha().extractChannel(3).resize(w, h, { kernel: 'cubic' }).blur(Math.max(0.6, 1.6 * w / 1200)).raw().toBuffer();
  const out = Buffer.alloc(w * h * 4);
  const R = room.data;
  let G = null;
  if (glowArg) {
    const [gx, gy, gr, gc, ga] = glowArg.split(',');
    G = { x: +gx * w, y: +gy * w, r: +gr * w, c: hex(gc), a: +ga };
  }
  for (let i = 0; i < w * h; i++) {
    const ra = R[i * 4 + 3] / 255;
    const sa = Math.min(MX, (sh[i] / 255) * K);
    // straight-alpha "over": pieces over shadow
    let a = ra + sa * (1 - ra);
    let col = [0, 1, 2].map((c) => (a > 0 ? (R[i * 4 + c] * ra + SH[c] * sa * (1 - ra)) / a : 0));
    if (G) {
      const d = Math.hypot((i % w) - G.x, Math.floor(i / w) - G.y) / G.r;
      if (d < 1) {
        const t = 1 - d;
        const ga = G.a * t * t * (3 - 2 * t);
        // the glow is light: screen it over what is there, and let it add its own alpha where the frame is empty
        const na = a + ga * (1 - a);
        col = col.map((v, c) => {
          const lit = 255 - ((255 - v) * (255 - G.c[c])) / 255;
          const mixed = a > 0 ? v + (lit - v) * ga : G.c[c];
          return na > 0 ? (mixed * a + G.c[c] * ga * (1 - a)) / na : 0;
        });
        a = na;
      }
    }
    out[i * 4 + 3] = Math.round(a * 255);
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(col[c])));
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(op);
  console.log('comp', op.split(/[\/]/).pop(), w + 'x' + h);
})().catch((e) => { console.error(e); process.exit(1); });
