// The plan checker for the seven sample homes: opens each home's whole-home overview (stills.html?scene=home&slug=..
// &shot=01&check=1) in headless Chrome (the same CDP set-up as render.mjs) and prints layout.js planCheck's report:
// every door / opening with its clear width and what stands in its 2-unit clearance zone, which rooms cannot be reached
// from the front door over ways at least 2 units (80 cm) wide, the front door (현관문) and the garden / terrace doors,
// each bath's fixtures, the stairs between floors, and the indoor area per floor against the size the page states.
//
//   node final/stills/check-plans.mjs                          all seven homes (from the deepflat folder)
//   node final/stills/check-plans.mjs --only pangyo-house[,yongin-townhouse]
//   --json          the raw reports as one JSON array instead of the text
//   --png           also save a quick look at each overview with the door zones drawn on the floor (green: clear, red:
//                   blocked, blue: an open side) to final/stills/png/check/<slug>.png
//   --samples N     frames averaged for --png (default 4)
//   --query "k=v"   extra URL parameters for the quick look (e.g. "el=70" to look down into the rooms, "az=20")
//   --base URL      where the deepflat folder is served (default http://localhost:4330/drafts/v2/deepflat/)
// Exit code 0 even when a home has problems (the report says so); 1 when a home fails to build.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECTS } from './shots.js';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const base = opt('base', 'http://localhost:4330/drafts/v2/deepflat/');
const only = opt('only', '') ? opt('only').split(',') : null;
const png = flag('png');
const asJson = flag('json');
const samples = Number(opt('samples', png ? '4' : '1'));
const extra = opt('query', '');
const slugs = only ?? PROJECTS.map((p) => p.slug); // --only may also name a plan that is not a portfolio home (_example)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  const port = 9900 + (process.pid % 90);
  const profile = mkdtempSync(join(tmpdir(), 'plancheck-'));
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

  const reports = [];
  let failed = 0;
  for (const slug of slugs) {
    events.length = 0;
    const url = `${base}final/stills/stills.html?scene=home&slug=${slug}&shot=01&check=1&samples=${png ? samples : 1}${png ? '&zones=1' : ''}${extra ? `&${extra}` : ''}`;
    await send('Page.navigate', { url });
    let ready = false;
    for (let i = 0; i < 1200 && !ready; i++) {
      await sleep(250);
      try {
        ready = await evaluate('window.__stillReady === true');
      } catch {}
    }
    const err = await evaluate('window.__stillError || null');
    const rep = await evaluate('window.__planCheck ? JSON.stringify(window.__planCheck) : null');
    const errs = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
    if (err || !ready || !rep) {
      failed++;
      reports.push({ slug, error: err ?? (ready ? 'no report' : 'timed out'), console: errs.map((e) => JSON.stringify(e.params).slice(0, 300)) });
      continue;
    }
    const r = JSON.parse(rep);
    for (const k of r.links) delete k.zone;
    reports.push(r);
    if (png) {
      const dir = join(here, 'png', 'check');
      mkdirSync(dir, { recursive: true });
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(dir, `${slug}.png`), Buffer.from(data, 'base64'));
      r.png = `final/stills/png/check/${slug}.png`;
    }
  }
  ws.close();
  proc.kill();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
  return { reports, failed };
}

const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
function print(r) {
  const out = [];
  const line = (s = '') => out.push(s);
  if (r.error) {
    line(`== ${r.slug}: FAILED TO BUILD`);
    line(`   ${r.error.split('\n').slice(0, 6).join('\n   ')}`);
    for (const c of r.console ?? []) line(`   console: ${c}`);
    return out.join('\n');
  }
  line(`== ${r.slug}  ${r.ok ? 'ok' : `${r.problems.length} problem${r.problems.length === 1 ? '' : 's'}`}`);
  const tgt = r.total.target ? ` vs ${r.total.target.label}: ${r.total.off > 0 ? '+' : ''}${r.total.off}%` : '';
  line(`   area: ${r.levels.map((l) => `${l.name} ${l.m2} m²${l.outdoorM2 ? ` (+${l.outdoorM2} outdoor)` : ''}`).join(' · ')} = ${r.total.m2} m² (${r.total.py}평)${tgt}`);
  for (const l of r.levels) {
    const bits = [];
    if (l.frontDoor.length) bits.push(`front door: ${l.frontDoor.join(', ')}`);
    else if (l.name === '1F') bits.push('front door: NONE');
    if (l.outdoorDoors.length) bits.push(`outdoor: ${l.outdoorDoors.join(', ')}`);
    if (l.emptyM2) bits.push(`${l.emptyM2} m² of the ${l.W}x${l.D} plate has no room`);
    if (bits.length) line(`   ${l.name}: ${bits.join(' · ')}`);
  }
  line('   links (width / clear, units; 2.0 = 80 cm):');
  for (const k of r.links) {
    const name = `${k.kind.padEnd(4)} ${`${k.a}–${k.b ?? 'outside'}`.padEnd(22)} ${k.level}${k.side ? ` ${k.side}` : ''}`;
    const bl = k.kind === 'open' ? (k.ok ? [] : k.blockers) : k.blockers;
    line(`     ${k.ok && !bl.length ? '  ' : '!!'} ${name.padEnd(38)} ${f2(k.width)} / ${f2(k.clear)}${bl.length ? `   in zone: ${bl.map((b) => `${b.room}.${b.piece}`).join(', ')}` : ''}`);
  }
  if (r.baths.length) line(`   baths: ${r.baths.map((b) => `${b.id} [${['toilet', 'basin', 'shower', 'tub'].filter((k) => b[k]).join(' ')}]`).join(' · ')}`);
  if (r.outdoor.length) line(`   outdoor rooms: ${r.outdoor.map((o) => `${o.id} <- ${o.doors.length ? o.doors.map((d) => `${d.from} (${d.kind} ${f2(d.clear)})`).join(', ') : 'NO DOOR'}`).join(' · ')}`);
  if (r.stairs.length) line(`   stairs: ${r.stairs.map((s) => `${s.from} (${s.level}) ${s.dir} -> ${s.to ? `${s.to} (${s.toLevel}, ${s.toKind})${s.matched ? '' : ' no matching void/flight'}` : 'nowhere'}`).join(' · ')}`);
  const lost = r.rooms.filter((q) => q.reachable === false).map((q) => `${q.id} (${q.level})`);
  if (lost.length) line(`   unreachable from the ${r.reachFrom}: ${lost.join(', ')}`);
  if (r.problems.length) {
    line('   problems:');
    for (const p of r.problems) if (!p.startsWith('not reachable from')) line(`     - ${p}`);
  }
  if (r.png) line(`   look: ${r.png}`);
  return out.join('\n');
}

const { reports, failed } = await run();
if (asJson) console.log(JSON.stringify(reports, null, 2));
else console.log(reports.map(print).join('\n\n'));
process.exit(failed ? 1 : 0);
