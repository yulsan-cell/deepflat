// GEN:promo for index.html: the 프로모션 section's words and offer cards, from final/data/promo.mjs.
// The section shell (its id, the night band) is in index.html; this writes what goes inside its .wrap.
// Shaped after the owner's reference (apartmentary.com/service, 2026-10-27): a small lead line over the big heading,
// and on each card the customer's own worry ("~라면") before the offer's name.
// Lines held in arrays are broken exactly there (<br>), so the line breaks hold on PC and phones alike.
import { PROMO } from '../data/promo.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const lines = (a) => [].concat(a).map(esc).join('<br>');

export function buildPromo() {
  const P = PROMO;
  const head =
    `<header class="sec-head promo-head"><div><p class="promo-kicker">${esc(P.kicker)}</p><h2 id="pm-title">${esc(P.nav)}</h2></div>` +
    `<div><p class="promo-lead">${lines(P.title)}</p><p class="promo-intro">${lines(P.intro)}</p>` +
    `<p class="promo-period">${esc(P.periodLabel)} · ${esc(P.period)}</p></div></header>`;
  const cards = P.offers
    .map(
      (o, i) =>
        `<li class="promo-card"><p class="promo-badge"><span class="promo-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>${esc(o.badge)}</p>` +
        `<p class="promo-q">${lines(o.lead)}</p><h3>${esc(o.title)}</h3>` +
        `<p class="promo-benefit">${lines(o.benefit)}</p><p class="promo-cond">${esc(o.condition)}</p></li>`,
    )
    .join('');
  const foot = `<div class="promo-foot"><a class="btn-block promo-cta" href="#contact">${esc(P.cta)}</a></div>`;
  // the slim bar under the record band (owner 2026-10-28: the block sits after the portfolio, so the bar keeps the
  // offer in sight from the top): the period, the three offers, and a link down to the block
  const bar =
    `<a class="promo-bar-link" href="#promotion"><span class="pb-tag"><i aria-hidden="true"></i>${esc(P.periodLabel)}</span>` +
    `<span class="pb-when">${esc(P.period)}</span>` +
    `<span class="pb-offers">${P.offers.map((o) => esc(o.title)).join(' · ')}</span>` +
    `<span class="pb-more">${esc(P.bar.more)}</span></a>`;
  return { promo: `${head}<ul class="promo-cards">${cards}</ul>${foot}`, 'promo-bar': bar };
}
