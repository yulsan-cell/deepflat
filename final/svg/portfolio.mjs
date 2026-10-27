// Portfolio and schedule blocks for index.html, built from final/data/portfolio.mjs (content), the rendered stills
// (final/stills/manifest.json, mapped to projects in final/data/portfolio-images.mjs) and the client's real photos
// (final/photos/photos.json, written by final/photos/ingest.mjs; absent while no project has photos).
//   pf-types   the 공간 종류 chips (the 평형 chips are drawn by the page script from pf-data once a type is chosen)
//   cards      one card per project: its cover miniature (COVER in portfolio-images.mjs, the room its summary is about;
//              the card keeps it after real photos arrive), the corner badge (미니어처 · 실제 사진 N장 or 미니어처), the place
//              (동), the size and the 설계/시공 weeks
//   pf-data    JSON for the page script: types and bands, each project's detail text and slides, and the viewer's words
//   durations  평형별 예상 기간 rows and the week axis (SCHEDULE_DURATIONS)
//
// Slides in the viewer, in order (each carries `kind`):
//   1.  overview  the whole-home miniature (still 01), always first
//   2+. photo     the real photos, in the order ingest.mjs gave them (real: true), or
//       staged    the 연출 이미지 (AI-made or retouched pictures; staged: true, ingest.mjs's default), or, while there are none,
//       standin   the other rendered stills, marked on the picture as stand-ins for the photos to come
import { existsSync, readFileSync } from 'node:fs';
import { TYPES, PROJECTS, SCHEDULE_DURATIONS, COPY, typeById } from '../data/portfolio.mjs';
import { IMAGE_FOLDER, IMAGE_TEXT, COVER } from '../data/portfolio-images.mjs';
import { miniSvg } from './minis.mjs';

const root = new URL('../../', import.meta.url); // the deepflat folder
const has = (rel) => existsSync(new URL(rel, root));
const readJson = (rel, d) => (has(rel) ? JSON.parse(readFileSync(new URL(rel, root), 'utf8')) : d);
const manifest = readJson('final/stills/manifest.json', { projects: {} });
const photoBook = readJson('final/photos/photos.json', { projects: {} });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// the first size number in display digits: "25평형 · 전용 59㎡" -> "<b>25</b>평형 · 전용 59㎡"
const sizeHtml = (s) => esc(s).replace(/(\d+)(평형|평)/, '<b>$1</b>$2');
const folderOf = (p) => IMAGE_FOLDER[p.slug] || p.slug;
const placeOf = (p) => [p.location, p.dong].filter(Boolean).join(' ');

const asImage = (s, caption, alt, kind) => ({
  webp: s.file,
  avif: s.avif,
  thumbWebp: s.thumb,
  thumbAvif: s.thumbAvif,
  w: s.w,
  h: s.h,
  tw: s.thumbW,
  th: s.thumbH,
  caption,
  alt,
  kind,
  ...(kind === 'photo' ? { real: true } : {}),
});
const onDisk = (im) => has(im.webp) && has(im.thumbWebp);

// the rendered stills of a project that exist on disk, with the page's caption and alt text (an entry an older
// ingest.mjs left in the manifest with real: true is not a render and is skipped; ingest.mjs moves it out)
function rendersOf(p) {
  const text = IMAGE_TEXT[p.slug] || [];
  return (manifest.projects[folderOf(p)] || [])
    .map((s, i) => (s.real ? null : asImage(s, (text[i] && text[i].caption) || s.caption, (text[i] && text[i].alt) || s.alt, 'standin')))
    .filter((im) => im && onDisk(im));
}
// the client's real photos of a project, as ingest.mjs ordered them
function photosOf(p) {
  return (photoBook.projects?.[folderOf(p)] || []).map((s) => asImage(s, s.caption, s.alt, s.staged ? 'staged' : 'photo')).filter(onDisk);
}
// what the viewer shows: the overview, then the photos (or the stand-ins while there are none)
function slidesOf(p) {
  const renders = rendersOf(p);
  const photos = photosOf(p);
  if (!renders.length) return photos;
  const [overview, ...rest] = renders;
  return [{ ...overview, kind: 'overview' }, ...(photos.length ? photos : rest)];
}

// phones: the swiping row shows each card at 84% of the screen (index.html, .cards under 740px)
const SIZES_CARD = '(max-width: 739px) 84vw, (max-width: 1099px) 46vw, 400px';

function card(p) {
  const renders = rendersOf(p);
  const pics = photosOf(p);
  const photos = pics.filter((im) => im.kind === 'photo').length;
  const staged = pics.length - photos;
  const cover = renders[COVER[p.slug]] || renders[0];
  let art;
  if (cover) {
    const set = (thumb, full) => `${thumb} ${cover.tw}w, ${full} ${cover.w}w`;
    const avif = has(cover.avif) && has(cover.thumbAvif) ? `<source type="image/avif" srcset="${set(cover.thumbAvif, cover.avif)}" sizes="${SIZES_CARD}">` : '';
    art = `<picture>${avif}<source type="image/webp" srcset="${set(cover.thumbWebp, cover.webp)}" sizes="${SIZES_CARD}"><img src="${cover.thumbWebp}" width="${cover.tw}" height="${cover.th}" alt="" loading="lazy" decoding="async"></picture>`;
  } else {
    art = miniSvg(p.slug) || '';
  }
  // the badge says what the pictures behind the card are: the client's photos, or the miniature alone; the title
  // button's name repeats it with the place, so it is heard by keyboard and heading navigation too
  // (연출 이미지 keep the paper badge: only real photos take the solid ink one)
  const badgeText = photos ? COPY.portfolio.badgeReal(photos) : staged ? COPY.portfolio.badgeStaged(staged) : COPY.portfolio.badgeModel;
  const badge = `<span class="${photos ? 'tag-real' : 'tag-ex'}">${esc(badgeText)}</span>`;
  const py = p.type === 'house' ? `연면적 <b>${p.pyeong}</b>평` : `<b>${p.pyeong}</b>평형`;
  const label = COPY.portfolio.cardOpenLabel({ ...p, size: p.size.replace(/ · /g, ', '), badge: badgeText, place: placeOf(p) });
  return `<li class="card${cover ? '' : ' is-drawn'}" data-type="${p.type}" data-band="${p.band}" data-slug="${p.slug}" data-photos="${photos}">
<div class="card-art">${art}${badge}</div>
<h3 class="card-title"><button class="card-open" type="button" aria-haspopup="dialog" aria-label="${esc(label)}">${esc(p.title)}</button></h3>
<p class="card-where">${esc(placeOf(p))}</p>
<p class="card-meta"><span class="card-py">${py}</span> <span class="card-dur">${esc(COPY.portfolio.cardDuration(p.duration))}</span></p>
<p class="card-note">${esc(p.summary)}</p>
</li>`;
}

function typeChips() {
  // the count is shown as a bare number and read out with its meaning (", 프로젝트 7개"); the page script updates both
  const n = (k) => `<span class="n" aria-hidden="true">${k}</span><span class="sr-only nn">, 프로젝트 ${k}개</span>`;
  const all = `<button class="chip" type="button" data-value="all" aria-pressed="true">${COPY.portfolio.all} ${n(PROJECTS.length)}</button>`;
  const rest = TYPES.map((t) => {
    const k = PROJECTS.filter((p) => p.type === t.id).length;
    return `<button class="chip" type="button" data-value="${t.id}" aria-pressed="false">${esc(t.label)} ${n(k)}</button>`;
  });
  return [all, ...rest].join('');
}

function data() {
  const D = COPY.detail;
  const out = {
    // the viewer's words (final/data/portfolio.mjs COPY.detail); counts are filled in by the page script at {n}
    text: {
      kind: D.kind,
      thumb: D.thumb,
      tallyReal: D.tallyReal('{n}'),
      tallyStandin: D.tallyStandin('{n}'),
      tallyStaged: D.tallyStaged('{n}'),
    },
    types: TYPES.map((t) => ({
      id: t.id,
      label: t.label,
      basis: t.basis,
      sizeLabel: t.sizeLabel,
      basisNote: t.basisNote,
      bands: t.bands.map((b) => ({ id: b.id, label: b.label, hint: b.hint || '' })),
    })),
    projects: PROJECTS.map((p) => {
      const slides = slidesOf(p);
      return {
        slug: p.slug,
        title: p.title,
        type: p.type,
        band: p.band,
        size: p.size,
        sizeHtml: sizeHtml(p.size),
        location: placeOf(p),
        scope: p.scope,
        duration: p.duration.label,
        completed: p.completedLabel,
        description: p.description,
        materials: p.materials.map((m) => ({ name: m.name, use: m.use })),
        photos: slides.filter((im) => im.kind === 'photo').length,
        staged: slides.filter((im) => im.kind === 'staged').length,
        images: slides.map((im) => ({ ...im, avif: has(im.avif) ? im.avif : '', thumbAvif: has(im.thumbAvif) ? im.thumbAvif : '' })),
      };
    }),
  };
  // safe inside <script>: no "</" can close the element early
  return `<script type="application/json" id="pf-data">${JSON.stringify(out).replace(/</g, '\\u003c')}</script>`;
}

function durations() {
  const weeks = Math.ceil(Math.max(...SCHEDULE_DURATIONS.map((d) => d.total + (d.plus ? 1 : 0))) / 4) * 4; // 20
  const rows = SCHEDULE_DURATIONS.map((d) => {
    const total = d.plus ? `<b>${d.total}</b>주 이상` : `약 <b>${d.total}</b>주`;
    const hint = d.hint ? `<small>${esc(d.hint)}</small>` : '';
    return `<li class="dur-row${d.plus ? ' is-plus' : ''}"><span class="dur-label">${esc(d.label)}${hint}</span><span class="dur-bar" aria-hidden="true"><span class="seg seg-d" style="--w:${d.design}"></span><span class="seg seg-c" style="--w:${d.build}"></span></span><span class="dur-total">${total}</span><span class="dur-detail">${esc(d.detail)}</span></li>`;
  }).join('');
  const ticks = [];
  for (let w = 0; w <= weeks; w += 4) ticks.push(`<span style="left:${+((w / weeks) * 100).toFixed(1)}%">${w ? w + '주' : '0'}</span>`);
  return `<ul class="dur" style="--weeks:${weeks}">${rows}</ul><div class="dur-scale" aria-hidden="true" style="--weeks:${weeks}"><span></span><span class="dur-ticks">${ticks.join('')}</span><span></span></div>`;
}

export function buildPortfolio() {
  return {
    'pf-types': typeChips(),
    cards: PROJECTS.map(card).join('\n').replace(/\n/g, '\r\n'), // index.html uses CRLF line ends
    'pf-data': data(),
    durations: durations(),
  };
}
