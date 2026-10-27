// GEN:carousel for index.html: the brand section's rooms carousel (#rc), so the first paint already has the slides at
// their final size (no layout shift when the page script reads the same file).
// Source (2026-10-26): final/data/carousel-blender.json, the five finished Blender cutaways (images/carousel-blender/,
// 2400 px masters in final/models/blender/renders/). final/data/carousel.json is the interim three.js list that
// final/stills/render-carousel.mjs writes; it is read only when the Blender list is missing, so a re-run of that script
// can no longer swap the interim renders back in. The file used is written on #rc as data-src, and the page script
// fetches that same file.
// The markup is the one the page script's slideHtml() / build() makes (index.html, "the rooms carousel"): keep the two
// in step. The page script fetches the JSON again at runtime and rebuilds only when it differs (data-rc, a hash of the
// slide list). Without either file (or with empty ones) the brand picture is the one slide, as before.
// Without JS (html without data-hero) the slides scroll sideways with scroll snap, each with its own caption, and the
// controls stay hidden. With JS the captions show under the controls (.rc-caps, one per room stacked in one cell, so
// the block never changes height), and the slide's own figcaption stays for assistive technology.
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url); // the deepflat folder
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SOURCES = ['final/data/carousel-blender.json', 'final/data/carousel.json'];
// the same as the page script: paths are relative to the page; one that climbs out with ../ means the JSON's folder
let jsonUrl = SOURCES[0];
const path = (p) => (/^\.\.\//.test(String(p).trim()) ? new URL(String(p).trim(), new URL(jsonUrl, 'http://x/')).pathname.slice(1) : String(p).trim());
const one = (p) => path(p).replace(/ /g, '%20');
// the carousel's width: the brand grid's 7 of 12 columns (677 px at 1440, 517 at 1024), the whole content width below 861
export const RC_SIZES = '(max-width: 860px) calc(100vw - 32px), min(50vw, 680px)';
// a short hash of the slide list (djb2 over its JSON), the same function as the page script's rcKey()
export function rcKey(list) {
  const s = JSON.stringify(list);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const valid = (s) => !!s && typeof s === 'object' && typeof s.src === 'string' && s.src.trim() !== '' && +s.w > 0 && +s.h > 0;

export function slideHtml(s, k, n) {
  const pair = (small, big) => `${one(small)} ${+s.smallW}w, ${one(big)} ${+s.w}w`;
  const avifSet = s.srcsetAvif ? s.srcsetAvif : s.srcAvif && s.srcSmallAvif && +s.smallW > 0 ? pair(s.srcSmallAvif, s.srcAvif) : '';
  const avif = avifSet ? `<source type="image/avif" srcset="${esc(avifSet)}" sizes="${RC_SIZES}">` : s.srcAvif ? `<source type="image/avif" srcset="${esc(one(s.srcAvif))}">` : '';
  const imgSet = s.srcset ? s.srcset : s.srcSmall && +s.smallW > 0 ? pair(s.srcSmall, s.src) : '';
  const set = imgSet ? ` srcset="${esc(imgSet)}" sizes="${RC_SIZES}"` : '';
  const title = String(s.title || '');
  return (
    // (no aria-hidden here: without JS every room scrolls into view, and the page script's turn(0) hides the rest at
    // start. The label in the natural Korean form the live region and the bars use, not '1 / 5', read as '일 슬래시 오')
    `<figure class="rc-slide" role="group" aria-roledescription="슬라이드" aria-label="${esc(`${n}개 중 ${k + 1}번째${title ? ': ' + title : ''}`)}">` +
    `<div class="rc-media"><picture>${avif}<img src="${esc(path(s.src))}"${set} width="${Math.round(+s.w)}" height="${Math.round(+s.h)}" alt="${esc(s.alt || title)}" loading="lazy" decoding="async" draggable="false"></picture></div>` +
    `<figcaption class="rc-cap"><span class="rc-title">${esc(title)}</span>${s.caption ? `<span class="rc-text">${esc(s.caption)}</span>` : ''}</figcaption></figure>`
  );
}
// the caption under the controls: one per room, stacked in one grid cell; only the current one shows (aria-hidden: the
// slide's own figcaption and the live region say the same to assistive technology)
export const capHtml = (s, k) =>
  `<p class="rc-cv${k === 0 ? ' is-on' : ''}"><span class="rc-title">${esc(String(s.title || ''))}</span>${s.caption ? `<span class="rc-text">${esc(s.caption)}</span>` : ''}</p>`;
export const dotHtml = (s, k) =>
  `<li><button class="rc-dot" type="button" aria-label="${esc(`${k + 1}번째 방${s.title ? ', ' + s.title : ''}`)}" aria-current="${k === 0}" tabindex="${k === 0 ? 0 : -1}"></button></li>`;

// the brand picture: the one slide when there is no slide list (portrait 4:5, as the brand section had it)
const BRAND_SLIDE =
  '<figure class="rc-slide" role="group" aria-roledescription="슬라이드" aria-label="해가 낮게 드는 오후의 거실">' +
  '<div class="rc-media"><picture><source type="image/avif" srcset="images/brand/brand-600x750.avif 600w, images/brand/brand-1200x1500.avif 1200w" sizes="(max-width: 860px) min(calc(100vw - 32px), 440px), 500px"><source type="image/webp" srcset="images/brand/brand-600x750.webp 600w, images/brand/brand-1200x1500.webp 1200w" sizes="(max-width: 860px) min(calc(100vw - 32px), 440px), 500px"><img src="images/brand/brand-600x750.webp" width="1200" height="1500" loading="lazy" decoding="async" draggable="false" alt="아치 창으로 오후 햇빛이 드는 밝은 거실 단면 모형, 소파와 스탠드가 있다"></picture></div>' +
  '<figcaption class="rc-cap"><span class="rc-title">오후의 거실</span><span class="rc-text">해가 낮게 드는 시간에 맞춰 소파와 스탠드 자리를 정했어요.</span></figcaption></figure>';

const PREV = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" fill="none"/></svg>';
const NEXT = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" fill="none"/></svg>';

export function readSlides() {
  for (const url of SOURCES) {
    const file = new URL(url, root);
    if (!existsSync(file)) continue;
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      const list = (Array.isArray(data) ? data : data && Array.isArray(data.slides) ? data.slides : []).filter(valid);
      if (list.length) {
        jsonUrl = url;
        return list;
      }
    } catch {}
  }
  jsonUrl = SOURCES[0];
  return [];
}

export function buildCarousel() {
  const list = readSlides();
  const n = list.length;
  const multi = n >= 2;
  const portrait = n ? +list[0].h > +list[0].w : true;
  const ar = n ? `${+list[0].w} / ${+list[0].h}` : '1200 / 1500';
  const cls = ['rc', n < 2 ? 'is-single' : '', portrait ? 'is-portrait' : ''].filter(Boolean).join(' ');
  const slides = n ? list.map((s, k) => slideHtml(s, k, n)).join('') : BRAND_SLIDE;
  const role = multi ? ' aria-roledescription="캐러셀" aria-describedby="rc-help"' : '';
  const html =
    // data-src only when a list was found: with neither file the brand slide stays, and the page asks for nothing (no 404)
    `<div class="${cls}" id="rc" role="region"${role} aria-label="딥플랫이 설계한 방 둘러보기" style="--rc-ar: ${ar}"${n ? ` data-src="${esc(jsonUrl)}"` : ''} data-rc="${n ? rcKey(list) : ''}">` +
    `<p class="sr-only" id="rc-help">이전·다음 버튼이나 키보드의 왼쪽·오른쪽 화살표 키로 다른 방을 볼 수 있어요. 화면을 옆으로 밀어도 넘어가요.</p>` +
    `<div class="rc-viewport"><div class="rc-track" id="rc-track" aria-live="off">${slides}</div></div>` +
    `<div class="rc-bar"${multi ? '' : ' hidden'}>` +
    `<ol class="rc-dots" aria-label="방 고르기">${multi ? list.map(dotHtml).join('') : ''}</ol>` +
    `<div class="rc-caps" aria-hidden="true">${multi ? list.map(capHtml).join('') : ''}</div>` +
    `<div class="rc-ctl"><p class="rc-count" aria-hidden="true"><b class="rc-now">1</b><span class="rc-of">/</span><span class="rc-all">${Math.max(1, n)}</span></p>` +
    `<div class="rc-btns"><button class="rc-btn rc-prev" type="button" aria-controls="rc-track" aria-label="이전 방" aria-disabled="true">${PREV}</button>` +
    `<button class="rc-btn rc-next" type="button" aria-controls="rc-track" aria-label="다음 방" aria-disabled="${!multi}">${NEXT}</button></div></div>` +
    `</div>` +
    `<p class="sr-only rc-live" aria-live="polite" aria-atomic="true"></p>` +
    `</div>`;
  return { carousel: html };
}
