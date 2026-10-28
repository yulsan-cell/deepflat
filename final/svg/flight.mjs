// GEN:flight for index.html: the hero's four scenes (world, 거실, 주방·다이닝, 침실) from final/data/flight.mjs.
// One markup serves both heroes:
//   3D     the scenes' words sit over the pinned 3D stage and fade in while the camera lingers in each scene;
//          the route rail marks the scene and jumps to it. The pictures are not shown (and, lazy, not fetched).
//   static reduced motion, no WebGL, or the 3D not ready in time: the four pictures (rendered from the flight's own
//          camera keyframes by final/stills/render-flight.mjs) stack with their words over them.
// The world scene's title is the page's h1.
import { SCENES, RAIL_LABELS } from '../data/flight.mjs';
import { yulsanLine } from './yulsan.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// a body given as lines (final/data/flight.mjs) breaks exactly there; each line is short enough for a phone's plate
const lines = (a) => [].concat(a).map(esc).join('<br>');

// what each still shows, for its alt text (the pictures are renders of the miniature world, and say so)
const ALT = {
  world: '짙은 숯색 DEEP FLAT 글자(D와 F는 주황)가 선 밝은 크림색 미니어처 세계. 층마다 거실, 주방·다이닝, 서재, 욕실, 침실이 있고, 높은 벽에는 불 켜진 세로 창과 늘어진 덩굴이 있다',
  // (the stills show the model library's furniture, final/models: keep these in step with what rooms.js places)
  living: '아치 창으로 오후 햇빛이 드는 블러시 톤 미니어처 거실. 세이지색 리넨 소파와 흰 대리석 원형 커피 테이블, 월넛 수납장, 가죽 라운지 체어, 테라코타 화분',
  kitchen: '아일랜드와 식탁이 마주 보는 미니어처 주방. 세이지색 하부장과 대리석 상판, 오크 아일랜드와 스툴, 오크 식탁 위 유리 구 펜던트 두 개',
  bedroom: '로즈 톤 벽에 샌드 리넨 헤드보드 침대와 오크 협탁, 리넨 커튼이 걸린 창이 있는 미니어처 침실',
};

// sizes written by render-flight.mjs: 16:9 for landscape screens, 9:16 for portrait ones
export const STILL_SIZES = { wide: [[1280, 720], [1920, 1080]], tall: [[720, 1280], [1080, 1920]] };
const src = (id, shape, w, ext) => `images/flight/${id}-${shape === 'wide' ? '16x9' : '9x16'}-${w}.${ext}`;
const set = (id, shape, ext) => STILL_SIZES[shape].map(([w]) => `${src(id, shape, w, ext)} ${w}w`).join(', ');

function picture(id) {
  const tall = '(max-aspect-ratio: 4/5)';
  const [W, H] = STILL_SIZES.wide[1];
  return (
    `<picture class="fl-still">` +
    `<source type="image/avif" media="${tall}" srcset="${set(id, 'tall', 'avif')}" sizes="100vw">` +
    `<source type="image/webp" media="${tall}" srcset="${set(id, 'tall', 'webp')}" sizes="100vw">` +
    `<source type="image/avif" srcset="${set(id, 'wide', 'avif')}" sizes="100vw">` +
    `<source type="image/webp" srcset="${set(id, 'wide', 'webp')}" sizes="100vw">` +
    `<img src="${src(id, 'wide', STILL_SIZES.wide[0][0], 'webp')}" width="${W}" height="${H}" loading="lazy" decoding="async" alt="${esc(ALT[id])}">` +
    `</picture>`
  );
}

function copy(s, i) {
  const tag = (t) =>
    typeof t === 'string'
      ? esc(t)
      : `<a href="${esc(t.href)}"${t.pf ? ` data-pf="${esc(t.pf)}"` : ''}${t.band ? ` data-pf-band="${esc(t.band)}"` : ''}>${esc(t.label)}</a>`;
  const tags = s.tags.length ? `<ul class="fl-tags" aria-label="${esc(s.label)}에서 하는 일">${s.tags.map((t) => `<li>${tag(t)}</li>`).join('')}</ul>` : '';
  const cta = s.cta ? `<a class="btn-block fl-cta" href="${esc(s.cta.href)}">${esc(s.cta.label)}</a>` : '';
  if (i === 0) {
    // the first scene: its eyebrow and title are the page's heading (with a space between them, which the block
    // eyebrow hides, so the heading's text never reads '딥플랫하이엔드'); the way on to the portfolio (shown from the
    // first paint) and the scroll hint (it comes in with the opening) close it
    const skip = s.skip ? `<a class="fl-skip" href="${esc(s.skip.href)}">${esc(s.skip.label)}</a>` : '';
    return (
      `<div class="fl-copy" data-avoid>` +
      `<h1 class="fl-title" id="hero-title"><span class="fl-eyebrow">${esc(s.eyebrow)}</span> ${esc(s.title)}</h1>` +
      `<p class="fl-body">${lines(s.body)}</p>${tags}` +
      // 율산 인테리어's track record under the first words (owner 2026-10-28), from final/data/yulsan.mjs
      `<p class="fl-heritage">${yulsanLine()}</p>` +
      `<div class="fl-next">${skip}<p class="fl-hint"><span>${esc(s.hint)}</span><i aria-hidden="true"></i></p></div>` +
      `</div>`
    );
  }
  return (
    `<div class="fl-copy">` +
    `<p class="fl-eyebrow">${esc(s.eyebrow)}</p>` +
    `<h2 class="fl-title">${esc(s.title)}</h2>` +
    `<p class="fl-body">${lines(s.body)}</p>${tags}${cta}` +
    `</div>`
  );
}

export function buildFlight() {
  const scenes = SCENES.map((s, i) => `<li class="fl-scene" data-scene="${s.id}">${picture(s.id)}${copy(s, i)}</li>`).join('');
  const rail =
    `<nav class="fl-rail" aria-label="첫 화면 장면 이동" data-avoid>` +
    `<ol>${SCENES.map((s, i) => `<li><button type="button" data-go="${s.id}"><i aria-hidden="true"></i><span>${esc(RAIL_LABELS[i])}</span></button></li>`).join('')}</ol>` +
    `<span class="fl-rail-line" aria-hidden="true"><span class="fl-rail-fill"></span></span>` +
    `</nav>`;
  // the rail first: Tab reaches the scene stops before the last scene's link (which would fly the camera to the bedroom)
  return { flight: `${rail}<ol class="fl-scenes">${scenes}</ol>` };
}
