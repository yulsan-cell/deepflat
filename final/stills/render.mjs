// Renders the DEEPFLAT still images with headless Chrome (CDP, SwiftShader WebGL, device scale factor 2),
// keeps a PNG master of each, converts them with sharp to .webp and .avif, and writes manifest.json.
//
//   node final/stills/render.mjs                       everything (brand + every project shot)
//   node final/stills/render.mjs --only brand,pangyo-house[,mokdong-apartment:02]
//   node final/stills/render.mjs --encode-only         re-encode from the PNG masters, no rendering
//   node final/stills/render.mjs --manifest-only       only rewrite manifest.json
//   --samples N   frames averaged per image (default: the scene's own, 48)
//   --query "k=v&k2=v2"   extra URL parameters for every scene (tuning)
//   --base URL    where final/stills/stills.html is served (default http://localhost:4330/drafts/v2/deepflat/)
//   --preview     scale factor 1 and 12 samples, PNGs only into png/preview/ (quick look while tuning)
//
// manifest.json lists the renders only. The client's real photos live apart, in final/photos/photos.json (written by
// final/photos/ingest.mjs, files named images/<slug>/photo-*), so re-rendering never drops or overwrites them and
// there is nothing to re-run afterwards; as a guard, no file a photo entry names is ever written.
//
// Outputs (paths relative to the deepflat folder):
//   images/brand/brand-1200x1500.{webp,avif}, images/brand/brand-600x750.{webp,avif}
//   images/<slug>/NN.{webp,avif} (1600x1000), images/<slug>/NN-thumb.{webp,avif} (640x400)
//   final/stills/png/*.png masters (not used by the page; safe to delete, needed only for --encode-only)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { BRAND, PROJECTS } from './shots.js';

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
const preview = flag('preview');
const only = opt('only', '') ? opt('only').split(',') : null;
const extra = opt('query', '');
const samplesArg = opt('samples', preview ? '12' : '');
const DSF = preview ? 1 : 2;

const pngDir = join(here, 'png', preview ? 'preview' : '');
mkdirSync(pngDir, { recursive: true });

// the real photos (final/photos/photos.json, and real: true entries an older ingest.mjs left in the manifest): their
// files are never written
const MANIFEST = join(here, 'manifest.json');
const PHOTO_BOOK = join(root, 'final', 'photos', 'photos.json');
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const oldManifest = readJson(MANIFEST);
const isReal = (list) => Array.isArray(list) && list.some((e) => e && e.real);
const realFiles = new Set();
for (const list of [...Object.values(oldManifest?.projects ?? {}), ...Object.values(readJson(PHOTO_BOOK)?.projects ?? {})]) {
  if (!Array.isArray(list)) continue;
  for (const e of list) if (e?.real || e?.staged) for (const k of ['file', 'avif', 'thumb', 'thumbAvif']) if (e[k]) realFiles.add(e[k]);
}
const rel = (file) => relative(root, file).split('\\').join('/');

// ── jobs ──
const jobs = [];
const want = (slug, n) => !only || only.includes(slug) || only.includes(`${slug}:${n}`);
if (want('brand', '')) jobs.push({ key: 'brand', w: 1200, h: 1500, query: 'scene=brand', samples: BRAND.samples });
for (const p of PROJECTS) {
  for (const s of p.shots) {
    if (!want(p.slug, s.n)) continue;
    jobs.push({ key: `${p.slug}-${s.n}`, slug: p.slug, n: s.n, w: 1600, h: 1000, query: `scene=home&slug=${p.slug}&shot=${s.n}`, samples: s.samples });
  }
}

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
    await send('Emulation.setDeviceMetricsOverride', { width: job.w, height: job.h, deviceScaleFactor: DSF, mobile: false });
    events.length = 0;
    const samples = samplesArg || job.samples;
    const url = `${base}final/stills/stills.html?${job.query}${samples ? `&samples=${samples}` : ''}${extra ? `&${extra}` : ''}`;
    await send('Page.navigate', { url });
    let ready = false;
    for (let i = 0; i < 2400 && !ready; i++) {
      await sleep(500);
      try {
        ready = await evaluate('window.__stillReady === true');
      } catch {}
    }
    const err = await evaluate('window.__stillError || null');
    const info = await evaluate('window.__stillInfo || null');
    const errs = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
    if (err || !ready) {
      console.error(`✗ ${job.key}: ${err ?? 'timed out'}`);
      for (const e of errs) console.error('  ', JSON.stringify(e.params).slice(0, 400));
      continue;
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const raw = Buffer.from(data, 'base64');
    const file = join(pngDir, `${job.key}.png`);
    // the capture is DSF times the target size: downsample with lanczos (a second layer of anti-aliasing)
    await sharp(raw).resize(job.w, job.h, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(file);
    console.log(`✓ ${job.key} ${((Date.now() - t0) / 1000).toFixed(1)} s  (${info?.W}x${info?.H}, ${info?.samples} samples, ${info?.ms} ms gpu)${info?.note ? '  ' + info.note : ''}`);
    for (const e of errs) console.log('   console:', JSON.stringify(e.params).slice(0, 300));
  }
  ws.close();
  proc.kill();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}

// ── encoding ── tuned on these smooth, dark renders (checked with the dark range stretched 6x):
// AVIF 4:4:4 keeps the dark gradients as clean as the PNG at a fraction of the size, so it is the primary format.
// Lossy WebP leaves faint chroma blotches (about one level) in the darkest gradients even at q94; q90 is the fallback
// (30-60 KB). The brand image, the largest dark field on the page, gets near-lossless WebP instead (~130 KB / ~50 KB),
// and its AVIF (the file browsers actually take) a higher quality than the stills: at q60 the soft pendant halo and the
// lamp-lit arch showed square blocking.
const Q = {
  webp: { quality: 90, effort: 6, smartSubsample: true },
  avif: { quality: 60, effort: 6, chromaSubsampling: '4:4:4' },
  thumbWebp: { quality: 86, effort: 6, smartSubsample: true },
  thumbAvif: { quality: 56, effort: 6, chromaSubsampling: '4:4:4' },
  brandWebp: { nearLossless: true, quality: 40, effort: 6 },
  brandAvif: { quality: 80, effort: 6, chromaSubsampling: '4:4:4' },
};

async function encode(job) {
  const src = join(pngDir, `${job.key}.png`);
  if (!existsSync(src)) return null;
  const out = [];
  const put = async (pipeline, file) => {
    mkdirSync(dirname(file), { recursive: true });
    if (realFiles.has(rel(file))) {
      console.log(`  skipped ${rel(file)}: a real photo (manifest real: true)`);
      return;
    }
    await pipeline.toFile(file);
    out.push([relative(root, file).replaceAll('\\', '/'), statSync(file).size]);
  };
  if (job.key === 'brand') {
    const dir = join(root, 'images', 'brand');
    await put(sharp(src).webp(Q.brandWebp), join(dir, 'brand-1200x1500.webp'));
    await put(sharp(src).avif(Q.brandAvif), join(dir, 'brand-1200x1500.avif'));
    const small = sharp(src).resize(600, 750, { kernel: 'lanczos3' });
    await put(small.clone().webp(Q.brandWebp), join(dir, 'brand-600x750.webp'));
    await put(small.clone().avif(Q.brandAvif), join(dir, 'brand-600x750.avif'));
  } else {
    const dir = join(root, 'images', job.slug);
    await put(sharp(src).webp(Q.webp), join(dir, `${job.n}.webp`));
    await put(sharp(src).avif(Q.avif), join(dir, `${job.n}.avif`));
    const th = sharp(src).resize(640, 400, { kernel: 'lanczos3' }).sharpen({ sigma: 0.5 });
    await put(th.clone().webp(Q.thumbWebp), join(dir, `${job.n}-thumb.webp`));
    await put(th.clone().avif(Q.thumbAvif), join(dir, `${job.n}-thumb.avif`));
  }
  return out;
}

function writeManifest() {
  const has = (p) => existsSync(join(root, p));
  const manifest = {
    note: 'Rendered stills (final/stills/render.mjs). The page shows still 01 of each project as its whole-home miniature and the rest as stand-ins until real photos arrive; those are listed in final/photos/photos.json (final/photos/ingest.mjs), never here.',
    brand: {
      file: 'images/brand/brand-1200x1500.webp',
      avif: 'images/brand/brand-1200x1500.avif',
      small: 'images/brand/brand-600x750.webp',
      smallAvif: 'images/brand/brand-600x750.avif',
      w: 1200, h: 1500, smallW: 600, smallH: 750,
      caption: BRAND.caption,
      alt: BRAND.alt,
    },
    projects: {},
  };
  for (const p of PROJECTS) {
    manifest.projects[p.slug] = p.shots
      .filter((s) => has(`images/${p.slug}/${s.n}.webp`))
      .map((s) => ({
        file: `images/${p.slug}/${s.n}.webp`,
        avif: `images/${p.slug}/${s.n}.avif`,
        thumb: `images/${p.slug}/${s.n}-thumb.webp`,
        thumbAvif: `images/${p.slug}/${s.n}-thumb.avif`,
        w: 1600, h: 1000, thumbW: 640, thumbH: 400,
        caption: s.caption,
        alt: s.alt,
      }));
  }
  // a folder this run does not know keeps its rendered list (a list of real photos an older ingest.mjs left here is not
  // carried over: ingest.mjs puts the photos in again from photos/, into final/photos/photos.json)
  for (const [folder, list] of Object.entries(oldManifest?.projects ?? {})) {
    if (!(folder in manifest.projects) && !isReal(list)) manifest.projects[folder] = list;
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log('manifest.json written');
}

if (!flag('encode-only') && !flag('manifest-only')) await renderAll();
if (!preview && !flag('manifest-only')) {
  let total = 0;
  for (const job of jobs) {
    const out = await encode(job);
    if (!out) continue;
    for (const [f, b] of out) total += b;
    console.log(`  ${job.key}: ` + out.map(([f, b]) => `${f.split('/').pop()} ${(b / 1024).toFixed(0)}K`).join(', '));
  }
  console.log(`encoded ${(total / 1024 / 1024).toFixed(2)} MB`);
}
if (!preview) writeManifest();
process.exit(0);
