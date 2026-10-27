// Renders the brand section's carousel rooms (final/stills/carousel.js) and encodes them for the page:
// headless Chrome (CDP, SwiftShader WebGL) opens stills.html?scene=carousel&room=<room> at 1600 x 1067, waits for the
// averaged frame, saves a PNG master, then sharp writes WebP and AVIF at 1600 and 800 px wide, and
// final/data/carousel.json lists them with their Korean title, caption and alt text.
//
//   node final/stills/render-carousel.mjs                     all five rooms
//   node final/stills/render-carousel.mjs --only living,bath  some of them
//   node final/stills/render-carousel.mjs --encode-only       re-encode from the PNG masters (and rewrite the json)
//   --samples N   frames averaged (default: the scene's, 64)   --base URL   where the deepflat folder is served
//   --no-encode   render the PNG masters only
//
// Outputs (relative to the deepflat folder):
//   images/carousel/<room>-1600.{webp,avif}, <room>-800.{webp,avif}
//   final/stills/png/carousel/<room>.png  (masters, not used by the page)
//   final/data/carousel.json              [{ src, srcAvif, srcSmall, srcSmallAvif, w, h, smallW, smallH, title, caption, alt, room }]
// These are interim pictures: a later phase replaces them with Blender renders under the same names and sizes.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const require = createRequire(import.meta.url);
const sharp = require(join(root, '..', '..', '..', 'node_modules', 'sharp'));

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const base = opt('base', 'http://localhost:4330/drafts/v2/deepflat/');
const samples = opt('samples', '');
const W = 1600, H = 1067, SMALL = 800;

// the order the carousel shows them in, and what each one says (Korean; the caption is one short line)
const ROOMS = [
  {
    room: 'living',
    title: '거실',
    caption: '오크 마루에 세이지 소파를 놓은 밝은 거실',
    alt: '블러시 핑크 벽과 오크 마루의 거실 단면 모형. 세이지색 소파와 타원형 오크 커피 테이블, 월넛 수납장, 극락조 화분, 아치 창이 있다.',
  },
  {
    room: 'kitchen',
    title: '주방·다이닝',
    caption: '세이지 하부장과 대리석 상판, 오크 아일랜드',
    alt: '샌드색 벽의 주방 단면 모형. 세이지색 하부장과 대리석 상판, 오크 키큰장, 가죽 스툴 세 개가 놓인 오크 아일랜드, 황동 팔에 매단 도자기 펜던트 두 개, 올리브 나무 화분이 있다.',
  },
  {
    room: 'bedroom',
    title: '침실',
    caption: '창가에 책 읽을 자리를 둔 차분한 침실',
    alt: '로즈 톤 벽의 침실 단면 모형. 세이지색 헤드보드의 침대와 월넛 협탁 두 개, 리넨 커튼이 걸린 창, 부클레 암체어와 스탠드, 떡갈잎 고무나무 화분이 있다.',
  },
  {
    room: 'study',
    title: '서재',
    caption: '벽 한 면을 책장으로 채운 서재',
    alt: '세이지 그린 벽의 서재 단면 모형. 벽 전체를 채운 오크 책장, 창 아래 오크 책상과 의자, 가죽 라운지 체어와 스탠드, 몬스테라 화분이 있다.',
  },
  {
    room: 'bath',
    title: '욕실',
    caption: '세이지 타일과 테라조 바닥의 욕실',
    alt: '세이지색 타일과 흰 벽의 욕실 단면 모형. 창 아래 독립 욕조, 오크 세면대와 둥근 거울, 줄무늬 러너, 수건을 올린 티크 벤치, 바구니에 심은 야자와 고사리, 산세베리아 화분, 테라조 바닥이 있다.',
  },
];

const only = opt('only', '') ? opt('only').split(',') : ROOMS.map((r) => r.room);
const pngDir = join(here, 'png', 'carousel');
const outDir = join(root, 'images', 'carousel');
mkdirSync(pngDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderAll() {
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  const port = 9300 + (process.pid % 600);
  const profile = mkdtempSync(join(tmpdir(), 'carousel-'));
  const proc = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    'about:blank',
  ]);
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) throw new Error('chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) events.push(msg);
  });
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const n = ++id;
      pending.set(n, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  await send('Page.enable');
  await send('Runtime.enable');
  for (const room of only) {
    const t0 = Date.now();
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    events.length = 0;
    await send('Page.navigate', { url: `${base}final/stills/stills.html?scene=carousel&room=${room}${samples ? `&samples=${samples}` : ''}` });
    let ready = false;
    for (let i = 0; i < 2400 && !ready; i++) {
      await sleep(500);
      try {
        ready = await evaluate('window.__stillReady === true');
      } catch {}
    }
    const err = await evaluate('window.__stillError || null');
    const info = await evaluate('window.__stillInfo || null');
    if (err || !ready) {
      console.error(`x ${room}: ${err ?? 'timed out'}`);
      for (const e of events.filter((e) => e.method === 'Runtime.exceptionThrown')) console.error('  ', JSON.stringify(e.params).slice(0, 600));
      continue;
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await sharp(Buffer.from(data, 'base64')).png({ compressionLevel: 9 }).toFile(join(pngDir, `${room}.png`));
    console.log(`ok ${room} ${((Date.now() - t0) / 1000).toFixed(1)} s (${info?.W}x${info?.H}, ${info?.samples} samples, ${info?.calls} calls, ${info?.ms} ms gpu)`);
  }
  ws.close();
  proc.kill();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}

const Q = { webp: { quality: 86, effort: 6, smartSubsample: true }, avif: { quality: 60, effort: 6, chromaSubsampling: '4:4:4' } };

async function encode() {
  const list = [];
  for (const r of ROOMS) {
    const src = join(pngDir, `${r.room}.png`);
    if (!existsSync(src)) continue;
    if (only.includes(r.room)) {
      await sharp(src).webp(Q.webp).toFile(join(outDir, `${r.room}-${W}.webp`));
      await sharp(src).avif(Q.avif).toFile(join(outDir, `${r.room}-${W}.avif`));
      const small = sharp(src).resize(SMALL, Math.round((SMALL * H) / W), { kernel: 'lanczos3' });
      await small.clone().webp(Q.webp).toFile(join(outDir, `${r.room}-${SMALL}.webp`));
      await small.clone().avif(Q.avif).toFile(join(outDir, `${r.room}-${SMALL}.avif`));
    }
    list.push({
      src: `images/carousel/${r.room}-${W}.webp`,
      srcAvif: `images/carousel/${r.room}-${W}.avif`,
      srcSmall: `images/carousel/${r.room}-${SMALL}.webp`,
      srcSmallAvif: `images/carousel/${r.room}-${SMALL}.avif`,
      w: W,
      h: H,
      smallW: SMALL,
      smallH: Math.round((SMALL * H) / W),
      title: r.title,
      caption: r.caption,
      alt: r.alt,
      room: r.room,
    });
  }
  const json = join(root, 'final', 'data', 'carousel.json');
  writeFileSync(json, JSON.stringify(list, null, 2) + '\n');
  console.log(`wrote ${list.length} entries to final/data/carousel.json`);
}

if (!flag('encode-only')) await renderAll();
if (!flag('no-encode')) await encode();
process.exit(0);
