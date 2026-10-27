// DEEPFLAT: puts each project's pictures ("연출 이미지" or real post-construction photos) into its detail viewer.
//
// 연출 이미지 by default (owner, 2026-10-27): pictures made with AI or retouched to show the finished home are labelled
// "연출 이미지" on the card and in the viewer, never "실제 시공 사진" (표시·광고법). Only a project folder that also holds a
// marker file whose name starts with 실제 or real and ends in .txt (e.g. "실제 사진.txt") is labelled 실제 시공 사진.
//
//   cd "C:\Users\joung\클로드 코드\yulsan-web\drafts\v2\deepflat"
//   node final/photos/ingest.mjs
//
// What the viewer shows (final/svg/portfolio.mjs): slide 1 is always the project's rendered whole-home miniature
// (images/<folder>/01.*); the real photos come after it. While a project has no photos, slides 2+ are its rendered
// room close-ups, marked on the page as stand-ins. The portfolio card keeps its miniature thumbnail either way and
// says "실제 시공 · 사진 N장" once photos are in (otherwise "미니어처").
//
// For every project in final/data/portfolio.mjs it reads photos/<slug>/ (the client's originals: .jpg .jpeg .jfif .png
// .webp) and:
//   - orders them: the photos captions.txt names ("01 거실.jpg: …") first, in the order of those lines; the rest after
//     them in file-name order (numbers counted as numbers). The guide suggests 전체 → 거실 → 주방 → 침실 → 디테일;
//   - writes web images next to the renders in images/<folder>/ (folder from IMAGE_FOLDER in
//     final/data/portfolio-images.mjs), named by the photo's fingerprint so a re-ordered or unchanged photo is never
//     re-encoded and a replaced one never shows a stale cached file:
//       photo-<fp>.webp / .avif              1600px on the long side, never enlarged
//       photo-<fp>-thumb.webp / -thumb.avif  640px wide
//     turned upright from the EXIF orientation, converted to sRGB, metadata (GPS included) stripped;
//   - takes captions from captions.txt: one line per photo, "file name: caption" or just the caption, in order
//     (lines starting with # are ignored);
//   - writes the list to final/photos/photos.json ({ projects: { <folder>: [ …, real: true ] } }; the file is removed
//     when no project has photos). final/stills/manifest.json (the renders, owned by final/stills/render.mjs) is never
//     changed, so re-rendering the stills never drops the photos and taking the photos out brings the stand-ins back;
//   - regenerates the portfolio blocks of index.html (cards, pf-data, pf-types, durations) with final/svg/portfolio.mjs.
//
// It never changes or deletes anything in photos/ (it only creates missing project folders and photos/README.txt), never
// writes a render's file (01.webp, 02-thumb.avif, …), and deletes nothing but its own photo-* outputs that no photo
// needs any more. Anything it cannot place is reported with "!", never skipped silently. Running it again with the same
// photos changes nothing.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..'); // the deepflat folder
const rel = (p) => relative(root, p).split(sep).join('/'); // paths as the page uses them, relative to the deepflat folder

const require = createRequire(import.meta.url);
let sharp;
for (const p of [join(root, '..', '..', '..', 'node_modules', 'sharp'), 'C:/Users/joung/클로드 코드/yulsan-web/node_modules/sharp']) {
  try {
    sharp = require(p);
    break;
  } catch {}
}
if (!sharp) {
  console.error('사진 변환 도구(sharp)를 찾지 못했어요. yulsan-web 폴더에서 "npm install"을 한 번 실행한 뒤 다시 해 주세요.');
  process.exit(1);
}

const { PROJECTS } = await import(pathToFileURL(join(root, 'final', 'data', 'portfolio.mjs')).href);
const { IMAGE_FOLDER } = await import(pathToFileURL(join(root, 'final', 'data', 'portfolio-images.mjs')).href);

const PHOTOS = join(root, 'photos');
const BOOK = join(here, 'photos.json'); // the real photos, by image folder (read by final/svg/portfolio.mjs)
const MANIFEST = join(root, 'final', 'stills', 'manifest.json'); // the renders: only read, except the one-time move below
const LEGACY = join(here, 'rendered.json'); // an older version of this tool kept replaced render lists here
const PAGE = join(root, 'index.html');
const PAGE_URL = 'http://localhost:4330/drafts/v2/deepflat/index.html';

const PHOTO_EXT = new Set(['.jpg', '.jpeg', '.jfif', '.png', '.webp']); // .jfif: how Windows often saves a downloaded JPEG
const NOT_PHOTOS = new Set(['thumbs.db', 'desktop.ini', '.ds_store']);
const CAPTIONS = /^captions(\.txt)+$/i; // also "captions.txt.txt", what Windows makes when extensions are hidden
// the marker that a project folder holds real post-construction photos (anything else is labelled 연출 이미지)
const REAL_MARK = /^(실제|real)[^.]*(\.txt)+$/i;
const OUR_FILE = /^photo-[0-9a-f]+(-thumb)?\.(webp|avif)$/; // this tool's outputs (also the older photo-01.* names)
const LARGE = 1600; // the long side of the large image
const THUMB = 640; // thumbnail width
const SMALL = 1200; // a photo whose long side is under this is flagged as possibly soft
const Q = {
  webp: { quality: 82, effort: 5, smartSubsample: true },
  avif: { quality: 56, effort: 5 },
  thumbWebp: { quality: 80, effort: 5, smartSubsample: true },
  thumbAvif: { quality: 52, effort: 5 },
};
// part of each photo's fingerprint: a change to the settings above re-encodes every photo on the next run
const SETTINGS = JSON.stringify({ v: 2, LARGE, THUMB, Q });

const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
const pad = (n) => String(n).padStart(2, '0');
const readJson = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const json = (o) => JSON.stringify(o, null, 2) + '\n';
const writeIfChanged = (f, text) => {
  if (existsSync(f) && readFileSync(f, 'utf8') === text) return false;
  writeFileSync(f, text);
  return true;
};

// ── report ──
const sum = { real: 0, photos: 0, encoded: 0, kept: 0, removed: 0, problems: 0 };
const say = (s = '') => console.log(s);
const warn = (s) => {
  sum.problems++;
  say(s);
};

// ── photos/ folders and README ──
mkdirSync(PHOTOS, { recursive: true });
for (const p of PROJECTS) mkdirSync(join(PHOTOS, p.slug), { recursive: true });
writeIfChanged(join(PHOTOS, 'README.txt'), readme());

const manifest = readJson(MANIFEST, null);
if (!manifest || !manifest.projects) {
  console.error('final\\stills\\manifest.json 파일을 읽지 못했어요. 이 파일(미니어처 그림 목록)이 있어야 사진을 넣을 수 있어요.');
  process.exit(1);
}
const oldBook = readJson(BOOK, { projects: {} });
const book = { note: 'Real photos by image folder, in viewer order after the whole-home miniature. Written by final/photos/ingest.mjs; do not edit by hand.', projects: {} };
const withPhotos = [];

say('DEEPFLAT 시공 사진 반영');
say(`사진 폴더: ${PHOTOS}`);

// an older version of this tool put the photos into the manifest in place of the renders: give the renders back
{
  const legacy = readJson(LEGACY, {});
  let moved = 0;
  for (const [folder, list] of Object.entries(manifest.projects)) {
    if (!Array.isArray(list) || !list.some((s) => s && s.real)) continue;
    manifest.projects[folder] = legacy[folder] || rendersOnDisk(join(root, 'images', folder));
    moved++;
  }
  if (moved) {
    writeFileSync(MANIFEST, json(manifest));
    say(`예전 방식으로 넣었던 사진 목록 ${moved}곳을 정리했어요. 미니어처 그림 목록을 원래대로 돌려놓고, 사진은 아래에서 다시 넣어요.`);
  }
  if (existsSync(LEGACY)) unlinkSync(LEGACY);
}

// what is in photos/ but belongs to no project: said first, so a missing photo is never a mystery
{
  const slugs = new Set(PROJECTS.map((p) => p.slug));
  const stray = [];
  for (const n of readdirSync(PHOTOS)) {
    const st = statSync(join(PHOTOS, n));
    if (st.isDirectory() && !slugs.has(n)) stray.push(`! photos\\${n}: 프로젝트 폴더 이름이 아니라서 건너뛰었어요. 사진은 아래 폴더 이름 중 하나에 넣어 주세요.`);
    else if (st.isFile() && !/^readme/i.test(n) && !NOT_PHOTOS.has(n.toLowerCase()))
      stray.push(`! photos\\${n}: photos 폴더 바로 아래에 있는 파일은 쓰지 않아요. 프로젝트 폴더 안에 넣어 주세요.`);
  }
  if (stray.length) {
    say('');
    for (const s of stray) warn(s);
    say(`  프로젝트 폴더: ${PROJECTS.map((p) => p.slug).join(', ')}`);
  }
}

// ── each project ──
for (const p of PROJECTS) {
  const folder = IMAGE_FOLDER[p.slug] || p.slug;
  const dir = join(PHOTOS, p.slug);
  const out = join(root, 'images', folder);
  const renders = Array.isArray(manifest.projects[folder]) ? manifest.projects[folder] : [];
  say('');
  say(`■ ${p.title} (photos\\${p.slug})`);

  for (const n of readdirSync(dir)) {
    if (statSync(join(dir, n)).isDirectory()) warn(`  ! ${n}: 폴더 안의 폴더는 읽지 않아요. 사진을 ${p.slug} 폴더로 꺼내 주세요.`);
  }
  const names = readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile());
  const files = names
    .filter((n) => PHOTO_EXT.has(extname(n).toLowerCase()) && !n.startsWith('~$') && !n.startsWith('.'))
    .sort(collator.compare);
  for (const n of names) {
    if (files.includes(n) || NOT_PHOTOS.has(n.toLowerCase()) || CAPTIONS.test(n) || REAL_MARK.test(n) || /^readme/i.test(n)) continue;
    const ext = extname(n).toLowerCase();
    if (ext === '.heic' || ext === '.heif') warn(`  ! ${n}: 아이폰 HEIC 사진은 바로 쓸 수 없어요. JPG로 바꿔서 넣어 주세요.`);
    else warn(`  ! ${n}: 사진 파일(jpg, jfif, png, webp)이 아니라서 건너뛰었어요.`);
  }

  if (!files.length) {
    sum.removed += removeOurs(out, new Set());
    const had = (oldBook.projects?.[folder] || []).length;
    const standins = Math.max(0, renders.length - 1);
    say(
      had
        ? `  사진이 없어서 미니어처로 되돌렸어요. 첫 장은 집 전체 미니어처, 그다음 ${standins}장은 방별 미니어처예요.`
        : `  사진 없음. 지금처럼 집 전체 미니어처 1장과 방별 미니어처 ${standins}장을 보여 줘요.`,
    );
    continue;
  }

  const { captions, order } = readCaptions(dir, files);
  const isReal = names.some((n) => REAL_MARK.test(n));
  say(isReal ? '  표시: 실제 시공 사진 (폴더에 "실제 사진" 표시 파일이 있어요)' : '  표시: 연출 이미지 (실제 현장 사진이면 이 폴더에 "실제 사진.txt" 파일을 하나 넣어 주세요)');
  if (renders.length) say('  01  집 전체 미니어처 (그대로 첫 장)');
  const list = [];
  const keep = new Set();
  const seen = new Map(); // fingerprint -> file name: the same photo twice
  for (const name of order) {
    let size;
    let fp;
    let paths;
    try {
      const src = readFileSync(join(dir, name));
      fp = createHash('sha1').update(src).update(SETTINGS).digest('hex').slice(0, 12);
      if (seen.has(fp)) {
        warn(`  ! ${name}: ${seen.get(fp)}와(과) 똑같은 사진이라 한 번만 넣었어요.`);
        continue;
      }
      seen.set(fp, name);
      paths = {
        file: join(out, `photo-${fp}.webp`),
        avif: join(out, `photo-${fp}.avif`),
        thumb: join(out, `photo-${fp}-thumb.webp`),
        thumbAvif: join(out, `photo-${fp}-thumb.avif`),
      };
      if (Object.values(paths).every(existsSync)) {
        const [a, t] = await Promise.all([sharp(paths.file).metadata(), sharp(paths.thumb).metadata()]);
        size = { w: a.width, h: a.height, thumbW: t.width, thumbH: t.height };
        sum.kept++;
      } else {
        mkdirSync(out, { recursive: true });
        size = await encode(src, paths);
        sum.encoded++;
      }
    } catch (e) {
      warn(`  ! ${name}: 사진을 읽지 못해서 건너뛰었어요. 파일이 깨졌거나 다 복사되지 않았을 수 있어요.`);
      continue;
    }
    for (const f of Object.values(paths)) keep.add(f.split(sep).pop());
    const k = list.length + 1;
    const caption = captions.get(name) || (isReal ? `시공 사진 ${k}` : `연출 이미지 ${k}`);
    list.push({
      file: rel(paths.file),
      avif: rel(paths.avif),
      thumb: rel(paths.thumb),
      thumbAvif: rel(paths.thumbAvif),
      w: size.w,
      h: size.h,
      thumbW: size.thumbW,
      thumbH: size.thumbH,
      caption,
      alt: `${p.title} ${caption}`,
      ...(isReal ? { real: true } : { staged: true }),
      source: `photos/${p.slug}/${name}`,
      hash: fp,
    });
    say(`  ${pad(k + 1)}  ${name}  →  ${size.w}×${size.h}${captions.has(name) ? `  "${caption}"` : '  (설명 없음)'}`);
    if (Math.max(size.w, size.h) < SMALL) warn(`      ! 사진이 작아서(${size.w}×${size.h}) 큰 화면에서는 흐릿할 수 있어요. 가로 2000px 이상인 원본을 권해요.`);
  }

  sum.removed += removeOurs(out, keep);
  if (!list.length) {
    say('  넣을 수 있는 사진이 없어서 이 프로젝트는 방별 미니어처 그대로 둬요.');
    continue;
  }
  book.projects[folder] = list;
  const untitled = list.filter((s) => !captions.has(s.source.split('/').pop())).length;
  say(
    `  사진 ${list.length}장을 넣었어요. 창에서는 01번 집 전체 미니어처 다음에 02번부터 이 순서로 나와요.` +
      (untitled ? ` 설명이 없는 ${untitled}장은 "${isReal ? '시공 사진' : '연출 이미지'} N"으로 보여요(captions.txt에 적으면 바뀌어요).` : ''),
  );
  if (!renders.length) say('  (이 프로젝트는 미니어처 그림이 없어서 사진만 나와요.)');
  sum.real++;
  sum.photos += list.length;
  withPhotos.push(p.slug);
}

// ── save: the photo list, the page ──
let bookChanged;
if (Object.keys(book.projects).length) bookChanged = writeIfChanged(BOOK, json(book));
else if ((bookChanged = existsSync(BOOK))) unlinkSync(BOOK);
const pageChanged = await updatePage();

say('');
say('── 정리 ──');
say(
  `실제 사진이 들어간 프로젝트 ${sum.real}곳(사진 ${sum.photos}장: 새로 변환 ${sum.encoded}장, 전에 변환해 둔 그대로 ${sum.kept}장)` +
    (sum.removed ? `, 더 쓰지 않는 웹용 사진 파일 ${sum.removed}개 정리` : '') +
    '.',
);
say(bookChanged ? '사진 목록(final\\photos\\photos.json)을 고쳤어요.' : '사진 목록은 바뀐 것이 없어요.');
say(pageChanged === null ? '! index.html을 찾지 못해서 페이지는 고치지 못했어요.' : pageChanged ? 'index.html의 포트폴리오 부분을 새로 만들었어요.' : 'index.html은 바뀐 것이 없어요.');
if (sum.problems) say(`살펴볼 것 ${sum.problems}건: 위에서 "!" 표시가 붙은 줄을 확인해 주세요.`);
say('원본 사진(photos 폴더)과 미니어처 그림은 건드리지 않았어요.');
say('');
say('확인: 미리보기 서버가 켜져 있으면 아래 주소를 열고 Ctrl+F5를 눌러 주세요.');
for (const s of withPhotos) say(`  ${PAGE_URL}#project=${s}`);
if (!withPhotos.length) say(`  ${PAGE_URL}#portfolio`);

// ────────────────────────────────────────────────────────────────────────────

// one photo -> four files; returns their sizes
async function encode(src, files) {
  // upright (EXIF orientation), sRGB (an embedded profile such as Display P3 is converted), no metadata,
  // any transparency on the page's paper colour
  const base = sharp(src, { autoOrient: true, failOn: 'truncated' }).toColorspace('srgb').flatten({ background: '#F5F3EE' });
  const large = base.clone().resize({ width: LARGE, height: LARGE, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' });
  const thumb = base.clone().resize({ width: THUMB, withoutEnlargement: true, kernel: 'lanczos3' }).sharpen({ sigma: 0.5 });
  const a = await put(large.clone().webp(Q.webp), files.file);
  await put(large.clone().avif(Q.avif), files.avif);
  const t = await put(thumb.clone().webp(Q.thumbWebp), files.thumb);
  await put(thumb.clone().avif(Q.thumbAvif), files.thumbAvif);
  return { w: a.width, h: a.height, thumbW: t.width, thumbH: t.height };
}
async function put(pipeline, file) {
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  writeFileSync(file, data);
  return info;
}

// delete this tool's own outputs (photo-*) in an image folder, except the names in keep; returns how many went
function removeOurs(dir, keep) {
  if (!existsSync(dir)) return 0;
  let k = 0;
  for (const n of readdirSync(dir)) {
    if (OUR_FILE.test(n) && !keep.has(n)) {
      unlinkSync(join(dir, n));
      k++;
    }
  }
  return k;
}

// the rendered list rebuilt from the files on disk (only for the one-time move above, when rendered.json is gone; the
// page takes the captions and alt text of rendered images from final/data/portfolio-images.mjs)
function rendersOnDisk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => /^\d{2}\.webp$/.test(n))
    .sort()
    .map((n) => {
      const k = n.slice(0, 2);
      const r = (f) => rel(join(dir, f));
      return { file: r(`${k}.webp`), avif: r(`${k}.avif`), thumb: r(`${k}-thumb.webp`), thumbAvif: r(`${k}-thumb.avif`), w: 1600, h: 1000, thumbW: 640, thumbH: 400, caption: '', alt: '' };
    });
}

// captions.txt -> { captions: Map(photo file name -> caption), order: the photo file names in viewer order }
function readCaptions(dir, photos) {
  const captions = new Map();
  const f = readdirSync(dir).filter((n) => CAPTIONS.test(n)).sort()[0];
  if (!f) return { captions, order: photos };
  const buf = readFileSync(join(dir, f));
  let text;
  // Notepad's '유니코드' (UTF-16 with its byte-order mark), UTF-8, or ANSI (CP949, an older Notepad)
  if (buf[0] === 0xff && buf[1] === 0xfe) text = new TextDecoder('utf-16le').decode(buf);
  else if (buf[0] === 0xfe && buf[1] === 0xff) text = new TextDecoder('utf-16be').decode(buf);
  else {
    text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('\uFFFD')) {
      try {
        text = new TextDecoder('euc-kr').decode(buf);
      } catch {}
    }
  }
  if (text.includes('\uFFFD') || text.includes('\u0000')) {
    warn(`  ! ${f}를 읽지 못했어요. 메모장에서 '다른 이름으로 저장 → 인코딩: UTF-8'로 다시 저장해 주세요. 사진은 파일 이름 순서로 넣었어요.`);
    return { captions, order: photos };
  }
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'));
  const byName = new Map();
  for (const n of photos) {
    byName.set(n.toLowerCase(), n);
    byName.set(n.slice(0, n.length - extname(n).length).toLowerCase(), n);
  }
  const named = new Map(); // in the order of the lines
  const inOrder = [];
  for (const row of rows) {
    // "file name: caption" when the part before the first colon is one of this folder's photos (with or without its
    // extension); otherwise the whole line is a caption, so "거실: 오크 수납 벽" stays a caption
    const m = /^(.+?)\s*[:：]\s*(.*)$/.exec(row);
    const key = m ? m[1].trim() : '';
    const hit = m && byName.get(key.toLowerCase());
    if (hit) {
      if (named.has(hit)) warn(`  ! captions.txt: "${key}" 줄이 두 번 있어서 첫 줄만 썼어요.`);
      else named.set(hit, m[2].trim());
    } else if (m && /\.(jpe?g|jfif|png|webp|heic|heif|gif|tiff?)$/i.test(key)) warn(`  ! captions.txt: "${key}" 사진이 폴더에 없어서 그 줄은 쓰지 않았어요.`);
    else inOrder.push(row);
  }
  // the order: the photos named in captions.txt, in the order of their lines, then the rest in file-name order
  const order = [...named.keys(), ...photos.filter((n) => !named.has(n))];
  // lines without a file name go, in order, to the photos that have no line of their own
  let j = 0;
  for (const n of order) {
    if (named.has(n)) {
      if (named.get(n)) captions.set(n, named.get(n));
    } else if (j < inOrder.length) captions.set(n, inOrder[j++]);
  }
  if (j < inOrder.length) warn(`  ! captions.txt: 설명 줄이 사진보다 ${inOrder.length - j}줄 많아서 남는 줄은 쓰지 않았어요.`);
  return { captions, order };
}

// index.html: regenerate the portfolio GEN blocks. final/svg/portfolio.mjs reads photos.json and the manifest when it
// is imported, so it is imported only now. Everything outside those blocks stays byte for byte.
async function updatePage() {
  if (!existsSync(PAGE)) return null;
  const { buildPortfolio } = await import(pathToFileURL(join(root, 'final', 'svg', 'portfolio.mjs')).href);
  let src = readFileSync(PAGE, 'utf8');
  for (const [k, v] of Object.entries(buildPortfolio())) {
    const open = `<!--GEN:${k}-->`;
    const close = `<!--/GEN:${k}-->`;
    let from = 0;
    for (;;) {
      const a = src.indexOf(open, from);
      const b = a < 0 ? -1 : src.indexOf(close, a);
      if (b < 0) break;
      src = src.slice(0, a + open.length) + v + src.slice(b);
      from = a + open.length + v.length + close.length;
    }
  }
  return writeIfChanged(PAGE, src);
}

function readme() {
  const rows = PROJECTS.map((p) => `  ${p.slug.padEnd(24)} ${p.title} (${p.size})`).join('\r\n');
  return [
    '이 폴더에 프로젝트별 사진을 넣어 주세요.',
    '넣은 사진은 "연출 이미지"로 표시돼요(AI로 만들거나 보정한 그림). 실제 현장에서 찍은 시공 사진이면',
    '그 프로젝트 폴더에 "실제 사진.txt"라는 빈 파일을 하나 넣어 주세요. 그 폴더만 "실제 시공 사진"으로 표시돼요.',
    '',
    '폴더 이름과 프로젝트',
    rows,
    '',
    '1. 프로젝트 폴더에 사진(jpg, png, webp)을 넣어요.',
    '   폴더 이름을 바꾸거나 폴더 안에 새 폴더를 만들면 사진이 들어가지 않아요.',
    '2. 순서는 파일 이름 순서예요. 집 전체 → 거실 → 주방 → 침실 → 디테일 순서를 권해요.',
    '   예: 01 전체.jpg, 02 거실.jpg, 03 주방.jpg, 04 침실.jpg, 05 디테일.jpg',
    '   창을 열면 첫 장은 늘 집 전체 미니어처이고, 사진은 그다음부터 나와요.',
    '3. 사진 설명은 같은 폴더의 captions.txt에 한 줄에 하나씩 적어요.',
    '   "파일이름: 설명"으로 적거나, 사진 순서대로 설명만 적어요.',
    '4. deepflat 폴더에서 아래 명령을 실행해요.',
    '   node final/photos/ingest.mjs',
    '',
    '사이트를 실제로 올릴 때 이 photos 폴더는 절대 올리지 마세요. 원본 사진에는 찍은 위치(고객 집 주소)와',
    '기기 정보가 들어 있을 수 있어요. 페이지는 images 폴더의 웹용 사진만 쓰고, 웹용 사진에서는 이런 정보를 지웠어요.',
    '',
    '자세한 방법: deepflat 폴더의 "사진-넣는-법.md"',
    '이 파일은 명령을 실행할 때마다 다시 만들어져요.',
    '',
  ].join('\r\n');
}
