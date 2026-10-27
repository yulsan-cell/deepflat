// textures for the studio renders: the floor plan on the drafting table, the estimate sheet on the clipboard
const sharp = require('C:/Users/joung/클로드 코드/yulsan-web/node_modules/sharp');
const path = require('path');
const out = (n) => path.join(__dirname, n);
const INK = '#2b2926';
const FONT = 'Malgun Gothic';

// ---- 1. floor plan (landscape 1200 x 860): the same room the designer is building ----
function plan() {
  const W = 1200, H = 860;
  const s = [];
  s.push(`<rect width="${W}" height="${H}" fill="#f7f4ee"/>`);
  // faint grid
  for (let x = 40; x < W; x += 40) s.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#e3e7e6" stroke-width="2"/>`);
  for (let y = 40; y < H; y += 40) s.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e3e7e6" stroke-width="2"/>`);
  // room walls (thick poché)
  const x0 = 170, y0 = 130, x1 = 930, y1 = 690, t = 48;
  s.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#efe1d8"/>`);
  s.push(`<path d="M${x0 - t} ${y0 - t}H${x1 + t}V${y1 + t}H${x0 - t}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="${INK}" fill-rule="evenodd"/>`);
  // window on the left wall: a gap with three thin lines
  s.push(`<rect x="${x0 - t}" y="300" width="${t}" height="200" fill="#f7f4ee"/>`);
  for (const dx of [6, 17, 28]) s.push(`<line x1="${x0 - t + dx}" y1="300" x2="${x0 - t + dx}" y2="500" stroke="${INK}" stroke-width="3"/>`);
  // door on the bottom wall with its swing
  s.push(`<rect x="700" y="${y1}" width="150" height="${t}" fill="#f7f4ee"/>`);
  s.push(`<line x1="700" y1="${y1}" x2="700" y2="${y1 - 150}" stroke="${INK}" stroke-width="7"/>`);
  s.push(`<path d="M700 ${y1 - 150}A150 150 0 0 1 850 ${y1}" fill="none" stroke="${INK}" stroke-width="5" stroke-dasharray="14 10"/>`);
  // furniture: sofa, rug, table, armchair, sideboard
  s.push(`<rect x="230" y="190" width="130" height="340" rx="18" fill="#9db3a2" stroke="${INK}" stroke-width="6"/>`);
  s.push(``);
  s.push(`<rect x="420" y="220" width="320" height="280" fill="#f7f1e9" stroke="${INK}" stroke-width="4"/>`);
  s.push(`<circle cx="580" cy="360" r="86" fill="#d9b48c" stroke="${INK}" stroke-width="6"/>`);
  s.push(`<rect x="790" y="300" width="100" height="100" rx="22" fill="#c49a6c" stroke="${INK}" stroke-width="6"/>`);
  s.push(`<rect x="420" y="${y0 + 6}" width="300" height="60" fill="#8f6a4c" stroke="${INK}" stroke-width="6"/>`);
  // dimension lines
  const dim = (xa, ya, xb, yb, label, vertical) => {
    s.push(`<line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}" stroke="#b5552b" stroke-width="4"/>`);
    for (const [px, py] of [[xa, ya], [xb, yb]]) s.push(`<line x1="${px - 9}" y1="${py + 9}" x2="${px + 9}" y2="${py - 9}" stroke="#b5552b" stroke-width="3"/>`);
    const mx = (xa + xb) / 2, my = (ya + yb) / 2;
    s.push(`<text x="${mx}" y="${my - 12}" font-family="${FONT}" font-size="30" fill="#b5552b" text-anchor="middle"${vertical ? ` transform="rotate(-90 ${mx} ${my})"` : ''}>${label}</text>`);
  };
  dim(x0 - t, 70, x1 + t, 70, '4,200', false);
  dim(1010, y0 - t, 1010, y1 + t, '3,600', true);
  // title block
  s.push(`<rect x="830" y="760" width="340" height="80" fill="none" stroke="${INK}" stroke-width="3"/>`);
  s.push(`<text x="850" y="812" font-family="${FONT}" font-weight="700" font-size="34" fill="${INK}">거실 평면도  1:50</text>`);
  s.push(`<text x="60" y="820" font-family="${FONT}" font-weight="700" font-size="34" fill="${INK}">도면 A-01</text>`);
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s.join('')}</svg>`)).png().toFile(out('plan.png'));
}

// ---- 2. estimate sheet (portrait 900 x 1200): one line per trade, with the trade's sample colour ----
// each line ends in a price column: a grey bar where the amount goes and the unit 원 after it (no invented figures),
// so the sheet reads as a 견적서 with a price per trade, not a checklist
function estimate() {
  const W = 900, H = 1200;
  const s = [];
  s.push(`<rect width="${W}" height="${H}" fill="#fbfaf6"/>`);
  s.push(`<text x="70" y="150" font-family="${FONT}" font-weight="700" font-size="92" fill="${INK}">견적서</text>`);
  s.push(`<text x="72" y="215" font-family="${FONT}" font-size="38" fill="#6d675c">공정별 내역</text>`);
  s.push(`<rect x="70" y="250" width="760" height="7" fill="${INK}"/>`);
  const rows = [
    ['철거', '#8f8778'],
    ['설비', '#b9c4c8'],
    ['목공', '#c49a6c'],
    ['전기', '#3b3934'],
    ['타일', '#e9e6df'],
    ['도장', '#9db3a2'],
  ];
  const widths = [150, 230, 290, 170, 210, 190];
  rows.forEach(([name, col], i) => {
    const y = 330 + i * 118;
    s.push(`<rect x="72" y="${y - 44}" width="54" height="54" rx="8" fill="${col}" stroke="#3b3934" stroke-opacity=".35" stroke-width="2"/>`);
    s.push(`<text x="150" y="${y}" font-family="${FONT}" font-weight="700" font-size="54" fill="${INK}">${name}</text>`);
    s.push(`<line x1="300" y1="${y - 14}" x2="${770 - widths[i] - 24}" y2="${y - 14}" stroke="#c9c2b5" stroke-width="4" stroke-dasharray="4 12" stroke-linecap="round"/>`);
    s.push(`<rect x="${770 - widths[i]}" y="${y - 34}" width="${widths[i]}" height="30" rx="6" fill="#bdb4a4"/>`);
    s.push(`<text x="790" y="${y}" font-family="${FONT}" font-weight="700" font-size="50" fill="${INK}">원</text>`);
    s.push(`<line x1="70" y1="${y + 38}" x2="830" y2="${y + 38}" stroke="#e1dbcf" stroke-width="3"/>`);
  });
  const yt = 330 + 6 * 118 + 20;
  s.push(`<rect x="70" y="${yt - 50}" width="760" height="5" fill="${INK}"/>`);
  s.push(`<text x="72" y="${yt + 40}" font-family="${FONT}" font-weight="700" font-size="58" fill="${INK}">합계</text>`);
  s.push(`<rect x="470" y="${yt + 2}" width="300" height="40" rx="7" fill="#7f5631"/>`);
  s.push(`<text x="790" y="${yt + 40}" font-family="${FONT}" font-weight="700" font-size="54" fill="${INK}">원</text>`);
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s.join('')}</svg>`)).png().toFile(out('estimate.png'));
}

Promise.all([plan(), estimate()]).then(() => console.log('textures ok'));
