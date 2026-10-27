// GEN:social for index.html: the footer's row of channel icons (YouTube, blog, Instagram), from final/data/social.mjs.
// One ink line weight for all three (the page's icons are drawn, not brand-coloured: ember stays on the logo's D and F).
// A channel with a url is a link that opens in a new tab; one without is the icon alone, named for screen readers.
import { SOCIAL } from '../data/social.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const ICON = {
  // a rounded screen with the play triangle cut out of it
  youtube:
    '<path fill="currentColor" fill-rule="evenodd" d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1Z"/>',
  // a speech bubble with a small b, as blog marks are drawn
  blog:
    '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" d="M5 3.6h14a2.4 2.4 0 0 1 2.4 2.4v9a2.4 2.4 0 0 1-2.4 2.4h-5.1L12 20.2l-1.9-2.8H5A2.4 2.4 0 0 1 2.6 15V6A2.4 2.4 0 0 1 5 3.6Z"/>' +
    '<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M8.7 7.2v7M8.7 11.9a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 1 0-4.6 0"/>',
  // a rounded camera body, its lens and the small flash dot
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5.2" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
    '<circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.3" cy="6.7" r="1.25" fill="currentColor"/>',
};

export function buildSocial() {
  const items = SOCIAL.map((c) => {
    const svg = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[c.id]}</svg>`;
    return c.url
      ? `<li><a class="sns" href="${esc(c.url)}" target="_blank" rel="noopener" aria-label="${esc(c.label)} (새 창)">${svg}</a></li>`
      : `<li><span class="sns" role="img" aria-label="${esc(c.label)}">${svg}</span></li>`;
  }).join('');
  return { social: `<div class="foot-sns"><p class="foot-sns-label">FOLLOW US</p><ul class="sns-list" aria-label="딥플랫 채널">${items}</ul></div>` };
}
