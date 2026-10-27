// composite the final renders and write the page images: images/studio/<name>-{300,600}.{webp,avif}
// node export.js            -> all three
const sharp = require('C:/Users/joung/클로드 코드/yulsan-web/node_modules/sharp');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const SC = 'C:/Users/joung/AppData/Local/Temp/claude/C--Users-joung-------/459c3502-71df-4eac-810f-eaac68dcd55f/scratchpad/studio';
const DEST = 'C:/Users/joung/클로드 코드/yulsan-web/drafts/v2/deepflat/images/studio';
fs.mkdirSync(DEST, { recursive: true });
const SCENES = [
  { scene: 'build', name: 'design-build', niche: '#EBD5CB', shadow: '#6E4A3A' },
  { scene: 'estimate', name: 'estimate-by-trade', niche: '#D7E0D9', shadow: '#3F5A4A' },
  { scene: 'light', name: 'light-and-finish', niche: '#EADFCD', shadow: '#6B5534', glow: true },
];
(async () => {
  const only = process.argv.slice(2);
  for (const s of SCENES) {
    if (only.length && !only.includes(s.scene)) continue;
    const r = `${SC}/out/studio-${s.scene}-final.png`;
    const sh = `${SC}/out/studio-${s.scene}-final-shadow.png`;
    const comp = `${SC}/out/final-${s.scene}.png`;
    const args = [path.join(__dirname, 'comp_studio.js'), r, sh, comp, s.shadow, '0.85', '0.5'];
    if (s.glow) {
      // the globe's pixel position from the render log (PROBES), as fractions of the frame width
      const log = fs.readFileSync(`${SC}/out/${s.scene}-final.log`, 'utf8');
      const m = log.match(/PROBES (\{.*\})/);
      const p = JSON.parse(m[1]).globe;
      const meta = await sharp(r).metadata();
      args.push(`${(p[0] / meta.width).toFixed(4)},${(p[1] / meta.width).toFixed(4)},0.17,#FFE6BE,0.75`);
    }
    execFileSync('node', args, { stdio: 'inherit' });
    for (const w of [300, 600]) {
      const base = sharp(comp).resize(w, Math.round((w * 6) / 5), { kernel: 'lanczos3' });
      const webp = `${DEST}/${s.name}-${w}.webp`;
      const avif = `${DEST}/${s.name}-${w}.avif`;
      await base.clone().webp({ quality: w === 300 ? 84 : 80, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(webp);
      await base.clone().avif({ quality: w === 300 ? 62 : 56, effort: 6 }).toFile(avif);
      console.log(s.name, w, 'webp', Math.round(fs.statSync(webp).size / 1024) + 'KB', 'avif', Math.round(fs.statSync(avif).size / 1024) + 'KB');
    }
    // a niche-coloured check image of the 600 version inside the arch (scratch only)
    const W = 600, H = 720, rr = W / 2;
    const img = await sharp(`${DEST}/${s.name}-600.webp`).toBuffer();
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="M0 ${rr}A${rr} ${rr} 0 0 1 ${W} ${rr}V${H}H0Z" fill="#fff"/></svg>`);
    const bg = await sharp({ create: { width: W, height: H, channels: 4, background: s.niche } }).composite([{ input: img }]).png().toBuffer();
    const arch = await sharp(bg).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    await sharp({ create: { width: W + 40, height: H + 40, channels: 3, background: '#f5f3ee' } }).composite([{ input: arch, left: 20, top: 20 }]).png().toFile(`${SC}/out/check-${s.scene}.png`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
