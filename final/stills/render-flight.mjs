// Renders the hero's four scenes as still pictures for the static hero (reduced motion, no WebGL, or the 3D not ready
// in time), from the flight's own camera keyframes: final/stills/stills.html?scene=flight&shot=<scene>, headless Chrome
// (CDP, SwiftShader WebGL), then sharp to .webp and .avif. It does not touch manifest.json (the project images).
//
//   node final/stills/render-flight.mjs                 all four scenes, both shapes
//   node final/stills/render-flight.mjs --only living   one scene (comma list: world,living,kitchen,bedroom)
//   node final/stills/render-flight.mjs --encode-only   re-encode from the PNG masters
//   --samples N   frames averaged per picture (default 36)   --base URL   where the deepflat folder is served
//
// Outputs (relative to the deepflat folder), the names GEN:flight (final/svg/flight.mjs) uses:
//   images/flight/<scene>-16x9-1920.{webp,avif}, <scene>-16x9-1280.{webp,avif}   landscape screens
//   images/flight/<scene>-9x16-1080.{webp,avif}, <scene>-9x16-720.{webp,avif}    portrait screens
//   final/stills/png/flight/<scene>-16x9.png, <scene>-9x16.png                    masters (not used by the page)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..'); // the deepflat folder
const require = createRequire(import.meta.url);
const sharp = require(join(root, '..', '..', '..', 'node_modules', 'sharp')); // yulsan-web/node_modules/sharp

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const base = opt('base', 'http://localhost:4330/drafts/v2/deepflat/');
const samples = opt('samples', '36');
const SCENES = ['world', 'living', 'kitchen', 'bedroom'];
const only = opt('only', '') ? opt('only').split(',') : SCENES;
const SHAPES = [
  { tag: '16x9', w: 1920, h: 1080, small: [1280, 720] },
  { tag: '9x16', w: 1080, h: 1920, small: [720, 1280] },
];
const pngDir = join(here, 'png', 'flight');
const outDir = join(root, 'images', 'flight');
mkdirSync(pngDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const jobs = [];
for (const id of SCENES.filter((s) => only.includes(s))) for (const sh of SHAPES) jobs.push({ id, ...sh, key: `${id}-${sh.tag}` });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderAll() {
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  const port = 9300 + (process.pid % 600);
  const profile = mkdtempSync(join(tmpdir(), 'stills-'));
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

  for (const job of jobs) {
    const t0 = Date.now();
    await send('Emulation.setDeviceMetricsOverride', { width: job.w, height: job.h, deviceScaleFactor: 1, mobile: false });
    events.length = 0;
    await send('Page.navigate', { url: `${base}final/stills/stills.html?scene=flight&shot=${job.id}&samples=${samples}` });
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
      console.error(`x ${job.key}: ${err ?? 'timed out'}`);
      for (const e of events.filter((e) => e.method === 'Runtime.exceptionThrown')) console.error('  ', JSON.stringify(e.params).slice(0, 400));
      continue;
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await sharp(Buffer.from(data, 'base64')).png({ compressionLevel: 9 }).toFile(join(pngDir, `${job.key}.png`));
    console.log(`ok ${job.key} ${((Date.now() - t0) / 1000).toFixed(1)} s  (${info?.W}x${info?.H}, ${info?.samples} samples, ${info?.ms} ms gpu)  ${info?.note ?? ''}`);
  }
  ws.close();
  proc.kill();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}

// same settings as the project stills (render.mjs): AVIF 4:4:4 keeps the dark gradients clean; WebP is the fallback
const Q = { webp: { quality: 88, effort: 6, smartSubsample: true }, avif: { quality: 58, effort: 6, chromaSubsampling: '4:4:4' } };

async function encode(job) {
  const src = join(pngDir, `${job.key}.png`);
  if (!existsSync(src)) return [];
  const out = [];
  const put = async (pipeline, file) => {
    await pipeline.toFile(file);
    out.push([relative(root, file).replaceAll('\\', '/'), statSync(file).size]);
  };
  await put(sharp(src).webp(Q.webp), join(outDir, `${job.id}-${job.tag}-${job.w}.webp`));
  await put(sharp(src).avif(Q.avif), join(outDir, `${job.id}-${job.tag}-${job.w}.avif`));
  const small = sharp(src).resize(job.small[0], job.small[1], { kernel: 'lanczos3' });
  await put(small.clone().webp(Q.webp), join(outDir, `${job.id}-${job.tag}-${job.small[0]}.webp`));
  await put(small.clone().avif(Q.avif), join(outDir, `${job.id}-${job.tag}-${job.small[0]}.avif`));
  return out;
}

if (!flag('encode-only')) await renderAll();
let total = 0;
for (const job of jobs) {
  const out = await encode(job);
  for (const [, b] of out) total += b;
  if (out.length) console.log(`  ${job.key}: ` + out.map(([f, b]) => `${f.split('/').pop()} ${(b / 1024).toFixed(0)}K`).join(', '));
}
console.log(`encoded ${(total / 1024 / 1024).toFixed(2)} MB`);
process.exit(0);
