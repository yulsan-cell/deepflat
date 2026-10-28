// GEN:partners for index.html: the band of brands between 회사 소개 and the portfolio, from final/data/partners.mjs.
// Screen readers get the brands once, as a plain list; the moving row is for the eye (aria-hidden). The row holds the
// same group twice and slides left by one group's width, then starts over, so it never shows a seam; each group repeats
// the brands until it is wider than a wide screen. The motion is CSS only (index.html, .pt-row): slow, paused on hover,
// and still for prefers-reduced-motion.
import { PARTNERS } from '../data/partners.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// about 12 brands in a group keeps one group wider than a 1920 px screen
const PER_GROUP = 12;

export function buildPartners() {
  const P = PARTNERS;
  const mark = (b) =>
    b.logo
      ? `<li><img src="${esc(b.logo)}" alt="" loading="lazy" decoding="async"></li>`
      : `<li><span class="pt-name">${esc(b.name)}</span></li>`;
  const once = P.brands.map(mark).join('');
  const group = `<ul class="pt-group">${once.repeat(Math.max(1, Math.ceil(PER_GROUP / P.brands.length)))}</ul>`;
  return {
    partners:
      `<p class="pt-title" id="pt-title">${esc(P.title)}</p>` +
      `<ul class="sr-only">${P.brands.map((b) => `<li>${esc(b.name)}</li>`).join('')}</ul>` +
      `<div class="pt-view" aria-hidden="true"><div class="pt-row">${group}${group}</div></div>`,
  };
}
