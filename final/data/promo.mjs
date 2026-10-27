// DEEPFLAT brand page: the 프로모션 section (#promotion; first called 이벤트), built into index.html by
// final/svg/promo.mjs (GEN:promo).
// Content only. Added 2026-10-27 at the owner's request ("프로모션 이벤트를 진행하고 카테고리에 이벤트 또는 프로모션
// 공간이 있으면 좋겠어"); written as one journey (consultation, design contract, move-in day), services rather than
// cash discounts. The owner keeps these three offers on the page as written for now (2026-10-27), but the event itself
// is NOT confirmed ("이벤트는 확정이 아니야"): ask before treating any offer, its period or its terms as final, and before
// the page goes public. Lines held in arrays break exactly there. Chosen from three drafts by an editor pass
// (wf_6433332c-559).
// 2026-10-27 (owner): the word 프로모션 instead of 이벤트, and the title and intro shaped after apartmentary.com/service
// (a small lead line over the big heading; each card opens with the customer's worry, "~라면"); its structure and tone
// only, in DEEPFLAT's own words (editor pass wf_5ae4c4c5-d50).
//   nav        the menu's label and the big heading (index.html's nav and footer links say the same)
//   kicker     the small line over the heading;  title  the lead in the right column (set lines)
//   periodLabel shown before the period
//   offers     badge (at most 6 characters), lead (the customer's worry, set lines of at most 13 characters), title,
//              benefit (two set lines of at most 15 characters, so each fits a card on a 320px phone), condition
export const PROMO = {
  nav: '프로모션',
  // the kicker speaks of the period (year-end): change it together with `period` below
  kicker: '올해가 가기 전에',
  title: ['집 고쳐 볼까 싶던 날부터', '같은 디자이너가 곁에 있어요'],
  intro: ['입주하는 날까지 마음이 가볍도록,', '단계마다 혜택을 하나씩 챙겨 드려요.'],
  periodLabel: '연말 프로모션',
  period: '2026년 12월 31일까지',
  offers: [
    {
      badge: '상담 혜택',
      lead: ['어디까지 바꿀 수 있을지', '궁금하다면'],
      title: '무료 실측과 평면 검토',
      benefit: ['시공까지 맡을 디자이너가', '집을 재고 평면을 함께 봐요.'],
      condition: '기간 안에 카카오톡으로 상담을 신청하신 분',
    },
    {
      badge: '계약 혜택',
      lead: ['생각한 그대로 나올지', '걱정된다면'],
      title: '우리 집 3D 미니어처',
      benefit: ['설계안을 3D 미니어처로 지어', '공사 전에 화면으로 둘러봐요.'],
      condition: '기간 안에 설계 계약을 하신 분',
    },
    {
      badge: '착공 혜택',
      lead: ['이삿날 짐을 어디에 둘지', '막막하다면'],
      title: '입주하는 날 가구 배치',
      benefit: ['도면을 그린 디자이너가 와서', '가구 자리를 함께 잡아요.'],
      condition: '착공 자리가 남은 달로 예약하신 분',
    },
  ],
  cta: '카카오톡으로 상담하기',
};
