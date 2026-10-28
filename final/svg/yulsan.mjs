// GEN:proof and GEN:yulsan for index.html: the team's numbers under the first screen and the 걸어온 길 timeline in the brand section, from final/data/yulsan.mjs, and the
// first screen's one-line track record (yulsanLine, used by final/svg/flight.mjs).
// Until the owner gives the facts, numbers show as pale 00 and words as "입력 예정", so the layout can be judged as it will be.
import { YULSAN, yulsanYears } from '../data/yulsan.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// counts get thousands separators; years (plain) do not
const num = (v, blank, plain = false) => (v == null ? `<span class="her-todo">${blank}</span>` : esc(plain ? String(v) : Number(v).toLocaleString('ko-KR')));
const word = (v, blank = '입력 예정') => (v == null ? `<span class="her-todo">${esc(blank)}</span>` : esc(v));

// the first screen's line, from what is known: "현장 경력 10년 · 누적 시공 480건"; while the years or the count are
// not given, the blog's record stands in for it ("현장 경력 10년 · 시공 기록 657편"), never a made-up number
export function yulsanLine() {
  const Y = YULSAN;
  const y = yulsanYears();
  // the first screen speaks of the team, not the old name (율산 is named once, in the brand block; owner 2026-10-28)
  const parts = [y == null ? '' : `현장 경력 ${y}년`].filter(Boolean);
  if (Y.total != null) parts.push(`누적 시공 ${Number(Y.total).toLocaleString('ko-KR')}건`);
  else if (Y.posts) parts.push(`시공 기록 ${Number(Y.posts.count).toLocaleString('ko-KR')}편`);
  return parts.join(' · ');
}

export function buildYulsan() {
  const Y = YULSAN;
  const years = yulsanYears();
  const creds = Y.credentials || [];
  const stats =
    `<ul class="proof-list${creds.length ? ' has-creds' : ''}" aria-label="딥플랫 팀의 기록" style="--n:${3 + creds.length}">` +
    `<li><span class="her-num">${num(years, '00')}<small>년</small></span><span class="her-label">현장 경력</span>` +
    `<span class="her-sub">${Y.since ? `${Y.since}년부터` : word(null, '시작 연도 입력 예정')}</span></li>` +
    // 누적 시공 shows only once the owner gives a true count (no placeholder, never an estimate: 표시·광고법); until
    // then the blog's 시공 기록 stands in
    (Y.total != null
      ? `<li><span class="her-num">${num(Y.total, '000')}<small>건</small></span><span class="her-label">누적 시공</span><span class="her-sub">${esc(Y.totalNote)}</span></li>`
      : Y.posts
        ? `<li><span class="her-num">${num(Y.posts.count, '000')}<small>편</small></span><span class="her-label">시공 기록</span>` +
          `<span class="her-sub">카페·식당·리테일·오피스</span></li>`
        : '') +
    (Y.brand
      ? `<li><span class="her-num">${num(Y.brand.stores, '00')}<small>개 매장</small></span><span class="her-label">${esc(Y.brand.name)}</span>` +
        `<span class="her-sub">${esc(String(Y.brand.first))}년 ${esc(Y.brand.place)} 1호점에서 ${esc(String(Y.brand.years))}년 만에</span></li>`
      : '') +
    creds.map((c) => `<li class="is-cred"><span class="her-num her-word">${esc(c.word)}</span><span class="her-label">${esc(c.label)}</span><span class="her-sub">${esc(c.sub)}</span></li>`).join('') +
    `</ul>`;
  const timeline =
    `<ol class="her-timeline">` +
    Y.timeline.map((t) => `<li><span class="her-year">${num(t.year, '0000', true)}</span><span class="her-text">${word(t.text)}</span></li>`).join('') +
    `</ol>`;
  return {
    // the team's record in three numbers, as a band right under the first screen (owner 2026-10-28); no 율산 name there
    proof: stats,
    // the short road from the first site to now (지나온 현장). Off the page since 2026-10-28, when 회사 소개 became the
    // 대표's greeting; kept for a GEN:yulsan marker if the owner wants the timeline back.
    // Y.projects stay in the data for the portfolio's 상업 공간, which shows them.
    yulsan: `<div class="heritage" role="group" aria-labelledby="yl-title"><p class="her-kicker" id="yl-title">${esc(Y.roadTitle)}</p>${timeline}</div>`,
  };
}
