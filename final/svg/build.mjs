// node final/svg/build.mjs  -> regenerates the GEN blocks in both DEEPFLAT pages: ../../index.html (the final page)
//                              and ../../index-svg.html (the same page with the illustrated hero), so they never drift
// node final/svg/build.mjs --target some.html  -> only that page (a path relative to the deepflat folder, or absolute)
// node build.mjs --preview  -> also writes preview.html (whole world, debug frames)
// In index-svg.html the SVG hero (GEN:hero) is the hero. index.html has no GEN:hero marker any more (the unshown copy
// in a <template> was removed 2026-10-26; a missing marker is simply skipped): the 3D scroll flight in final/3d took its
// place, and its static fallback is GEN:flight, written by ./flight.mjs. Check SVG letter colours on index-svg.html.
// Always run with --target index.html: without it, index-svg.html is rewritten too.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFS } from './defs.mjs';
import { buildHero, logoBox, roomPins } from './scene.mjs';
import { buildIcons, buildFlatLogo, buildFavicon, NAV_LOGO } from './minis.mjs';
import { buildPortfolio } from './portfolio.mjs';
import { buildMonths, buildLegend, buildStair } from './blocks.mjs';
import { buildFlight } from './flight.mjs';
import { buildCarousel } from './carousel.mjs';
import { buildPromo } from './promo.mjs';
import { buildSocial } from './social.mjs';
import { buildYulsan } from './yulsan.mjs';
import { buildPartners } from './partners.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const hero = buildHero();
const lb = logoBox();
const pins = roomPins(); // room label pins and the letters' outline, read by the label script in index.html

const layer = (name, body) =>
  `<svg class="df hero-layer hero-${name}" viewBox="-400 -520 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${body}</svg>`;

const heroHtml = `<div class="hero-stage" data-logo="${[lb.x, lb.y, lb.w, lb.h].map((n) => Math.round(n * 10) / 10).join(' ')}" data-rooms="${pins.rooms}" data-hull="${pins.hull}" data-wire="${pins.wire}">${layer('back', hero.back)}${layer('mid', hero.mid)}${layer('front', hero.front)}</div>`;

if (process.argv.includes('--preview')) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#242422}.wrap{position:relative;width:100vw;height:100vh}.wrap svg.df{position:absolute;inset:0;width:100%;height:100%}</style></head><body>${DEFS}
<div class="wrap">${['back', 'mid', 'front'].map((n) => `<svg class="df" id="L${n}" preserveAspectRatio="xMidYMid meet">${hero[n]}</svg>`).join('')}
<svg class="df" id="Lframes" preserveAspectRatio="xMidYMid meet" style="pointer-events:none"></svg></div>
<script>
const lb=${JSON.stringify(lb)};
const q=new URLSearchParams(location.search);const mode=q.get('m')||'all';
function win(A){const vh=Math.max(lb.h/0.46,(lb.w/0.56)/A);const vw=vh*A;const cx=lb.x+lb.w/2,cy=lb.y+lb.h/2;return [cx-vw/2,cy-0.43*vh,vw,vh];}
let vb=mode==='all'?[-900,-900,1900,1250]:win(innerWidth/innerHeight);
document.querySelectorAll('svg.df').forEach(s=>s.setAttribute('viewBox',vb.join(' ')));
if(mode==='all'){const f=document.getElementById('Lframes');f.innerHTML=[win(1.6),win(390/844),win(2.37),win(768/1024)].map((w,i)=>'<rect x="'+w[0]+'" y="'+w[1]+'" width="'+w[2]+'" height="'+w[3]+'" fill="none" stroke="'+['#f55','#5f5','#55f','#ff5'][i]+'" stroke-width="2"/>').join('')+'<rect x="'+lb.x+'" y="'+lb.y+'" width="'+lb.w+'" height="'+lb.h+'" fill="none" stroke="#f0f"/>';}
</script></body></html>`;
  writeFileSync(join(here, 'preview.html'), html);
}

const folder = join(here, '..', '..');
const ti = process.argv.indexOf('--target');
let targets;
if (ti > 0) {
  const arg = process.argv[ti + 1];
  if (!arg || arg.startsWith('--')) throw new Error('--target needs a file name');
  const one = resolve(folder, arg);
  if (!existsSync(one)) throw new Error('target not found: ' + one);
  targets = [one];
} else {
  targets = ['index.html', 'index-svg.html'].map((n) => join(folder, n)).filter(existsSync);
}
const portfolio = buildPortfolio(); // pf-types, cards, pf-data, durations (final/data/portfolio.mjs)
const icons = buildIcons();
const blocks = { defs: DEFS, hero: heroHtml, logo: buildFlatLogo(), 'logo-nav': buildFlatLogo(NAV_LOGO), favicon: buildFavicon(), ...portfolio, ...icons, months: buildMonths(), ...buildLegend(), stair: buildStair(4), 'stair-idle': buildStair(-1), ...buildFlight(), ...buildCarousel(), ...buildPromo(), ...buildSocial(), ...buildYulsan(), ...buildPartners() };
for (const target of targets) {
  let src = readFileSync(target, 'utf8');
  for (const [k, v] of Object.entries(blocks)) {
    const re = new RegExp(`(<!--GEN:${k}-->)[\\s\\S]*?(<!--/GEN:${k}-->)`, 'g');
    src = src.replace(re, (_, a, b) => a + v + b);
  }
  writeFileSync(target, src);
  console.log('updated', target, Math.round(src.length / 1024) + 'KB');
}
console.log('logo box', lb);
