// DEEPFLAT brand page: copy for the scroll flight through the hero world (homes only).
// Content only. The flight goes world -> 거실 -> 주방·다이닝 -> 침실, one entry per stop, in this order.
//
// Shape follows the scroll-world copy grammar: eyebrow (short label), title (the headline), body, tags (0-3 pills),
// and a cta on the last stop only.
// 2026-10-27 (owner): each room title names the room's concept in one phrase (no "so what kind of room?"), and each
// body is two set lines: how DEEPFLAT designs it, then what the homeowner gets. final/svg/flight.mjs breaks the lines
// exactly there (<br>), so they read cleanly on PC and phones. Limits: titles at most 10 characters, body lines at
// most 20, so each fits one line on a 320px phone. Chosen from three drafts by an editor pass (wf_6433332c-559).
//   world   title and body are the page's current hero line and sub line (COPY.hero.line / COPY.hero.sub in
//           portfolio.mjs; the body adds only the closing period). `hint` is the invitation to scroll, `skip` the
//           link past the flight to the portfolio.
//   rooms   tags name work DEEPFLAT does in that room; each is a usual scope for a high-end home, and most also
//           appear in the sample projects (발코니 확장, 붙박이 수납, 아일랜드, 석재 상판, 울 카펫).
// `label` is the stop's short name for the route rail; RAIL_LABELS lists the same names in SCENES order.
// Korean copy was checked with humanize-korean (light path, change 7.6%, gate OK).

export const SCENES = [
  {
    id: 'world',
    label: '딥플랫',
    eyebrow: 'DEEPFLAT 딥플랫',
    title: '하이엔드 주거 인테리어 스튜디오',
    body: ['식구의 하루를 듣고 도면을 그리고,', '같은 팀이 그대로 시공까지 맡아요.'],
    hint: '화면을 내려 거실부터 둘러보세요',
    // before the hint (screens 768 wide and up, and the static scenes): straight on to the portfolio
    skip: { label: '포트폴리오 바로 보기', href: '#portfolio' },
    tags: [],
  },
  {
    id: 'living',
    label: '거실',
    eyebrow: '01 거실',
    title: '온종일 화사한 거실',
    body: ['볕이 머무는 자리에 소파를 놓고,', '저녁엔 숨은 조명이 빛을 이어요.'],
    tags: ['발코니 확장', '간접 조명', '붙박이 수납'],
  },
  {
    id: 'kitchen',
    label: '주방',
    eyebrow: '02 주방·다이닝',
    title: '식구가 모이는 주방',
    body: ['아일랜드를 식탁 쪽으로 돌려놓아,', '요리하면서도 가족과 눈을 맞춰요.'],
    tags: ['아일랜드', '석재 상판', '식탁 조명'],
  },
  {
    id: 'bedroom',
    label: '침실',
    eyebrow: '03 침실',
    title: '깊이 잠드는 침실',
    body: ['바깥 빛은 가리고 발소리는 줄여,', '아침까지 푹 잘 수 있게 꾸며요.'],
    tags: ['머리맡 조명', '암막 커튼', '울 카펫'],
    cta: { label: '포트폴리오 보기', href: '#portfolio' },
  },
];

// short names for the route rail, in SCENES order (same as each scene's `label`)
export const RAIL_LABELS = SCENES.map((s) => s.label);

// the scroll invitation on its own, for a hint element outside the first scene's copy block
export const SCROLL_HINT = SCENES[0].hint;
