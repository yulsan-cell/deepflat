// DEEPFLAT brand page: the brands that roll slowly by between 회사 소개 and the portfolio (GEN:partners, built by
// final/svg/partners.mjs). Owner 2026-10-28: "회사소개와 포트폴리오 사이에 파트너사 로고가 천천히 지나갔으면 좋겠는데".
// Content only. Only brands the team really worked for: for now the commercial sites in the portfolio (final/data/
// portfolio.mjs, from 율산's record). Until the owner sends a brand's logo file (and the brand is fine with being shown),
// the brand shows as its name in the page's type; with `logo` (a path under images/partners/, SVG or PNG on a clear
// ground) the logo shows instead, in one muted ink tone. Never a logo redrawn by us, never a brand we did not work for.
//   title   the small label at the start of the band (also what screen readers hear for the list)
//   brands  name (the logo's alt text too), logo (null until the owner sends it)
export const PARTNERS = {
  title: '함께한 브랜드',
  brands: [
    { name: '랑데자뷰', logo: null },
    { name: '베이비하우스', logo: null },
    { name: '산학가든', logo: null },
    { name: '오프약국', logo: null },
    { name: '샌두', logo: null },
  ],
};
