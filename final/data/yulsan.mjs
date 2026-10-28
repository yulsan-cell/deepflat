// DEEPFLAT brand page: 율산 인테리어, the company DEEPFLAT grew out of (owner, 2026-10-28: "딥플랫 브랜드 페이지 안에 율산이라는
// 회사 업력과 이력을 끌고갈거야 … 율산을 알고있는 사람들이 있기 때문에"). Built into the brand section (GEN:yulsan) and the
// first screen's line (final/svg/flight.mjs) by final/svg/yulsan.mjs.
// 2026-10-28 (owner): "사업 구조가 율산 그룹 아래 딥플랫이 있는 구조": the company is 율산 그룹 and DEEPFLAT its interior
// brand, said once in the first sentence of 회사 소개 (the 대표's greeting; the owner asked not to draw the structure).
// 2026-10-28 (owner): DEEPFLAT is one brand for commercial spaces and homes, and the only one that will run. 율산's record
// is told as the team's own past ("그 안에 율산을 녹여서 어필"), never as a hand-over: no "율산에서 딥플랫으로", no
// "새 출발", and the word 블로그 is not shown on the page.
// Content only. 율산 has no website: its record is the Naver blog "Design by Yulsan" (blog.naver.com/ruin118), which our
// tools cannot open; the facts marked [blog] were read from the owner's capture of its first page on 2026-10-28
// (screencapture-blog-naver-ruin118-2026-10-28). The rest comes from the owner. A null shows as a placeholder (pale 00 for
// numbers, "입력 예정" for words) until it is filled.
//   since     the year 율산 인테리어 was registered as a business (업력 is counted from it) — owner: 2016
//   total     누적 시공 (all finished jobs, homes and commercial spaces). Only a number the owner confirms as true:
//             a made-up count would be a false advertising claim (표시·광고법). Owner, 2026-10-28: 986건
//   totalNote the line under the count in the record band
//   credentials what the record band shows after the numbers (owner 2026-10-28: "실내건축공사업 면허, 하자보증"):
//             word (the big word in the tile), label, sub. Keep the papers ready: a customer may ask to see them
//   posts     the blog's "Design by Yulsan" posts (시공 기록), with the month counted  [blog]. Off the page since the
//             owner gave the 누적 시공 count (2026-10-28: "시공기록을 누적시공으로 바꿔줘")
//   brand     랑데자뷰, the café brand the 대표 started: 홍대 1호점 2018, 40 stores in 3 years [blog]
//   roadTitle the timeline's small title
//   timeline  the years worth telling, oldest first; the last row is DEEPFLAT now
//   projects  big 율산 projects, newest first (names as the blog titles write them); image: a path under images/yulsan/
//             once the owner sends the photos
export const YULSAN = {
  name: '율산 인테리어',
  since: 2016, // 사업자 등록 2016년 (owner, 2026-10-28)
  total: 986, // owner, 2026-10-28
  totalNote: '설계와 시공을 마친 현장',
  credentials: [
    { word: '면허', label: '실내건축공사업', sub: '면허를 갖춘 팀이 직접 시공해요' },
    { word: '보증', label: '하자보증', sub: '완공 뒤 하자도 책임지고 고쳐요' },
  ],
  split: [
    { label: '주거', value: null },
    { label: '상업 공간', value: null },
  ],
  posts: { count: 657, asOf: '2026년 10월' },
  brand: { name: '랑데자뷰', first: 2018, place: '홍대', stores: 40, years: 3 },
  // beside the brand words (GEN:yulsan); 율산's name is in the brand paragraph, so not here (owner 2026-10-28)
  roadTitle: '지나온 현장',
  timeline: [
    { year: 2016, text: '첫 현장을 맡은 해' },
    { year: 2018, text: '제주 감성 카페 랑데자뷰 홍대 1호점' },
    { year: 2026, text: '딥플랫, 상업 공간부터 집까지' },
  ],
  projects: [
    { name: '마곡 마케팅 오피스', kind: '오피스 200평', place: '서울 마곡', year: 2026, image: null },
    { name: '베이비하우스', kind: '육아 편집숍', place: '부천', year: 2026, image: null },
    { name: '산학가든', kind: '식당', place: '이천 롯데아울렛', year: 2026, image: null },
    { name: '오프약국', kind: '약국', place: '서울 홍대', year: 2026, image: null },
    { name: '샌두', kind: '프랜차이즈 매장 35평', place: '서산', year: 2026, image: null },
    { name: '랑데자뷰', kind: '카페 브랜드', place: '서울 홍대 1호점', year: 2018, image: null },
  ],
};

// 업력 in whole years up to the build year (null while `since` is unknown)
export const yulsanYears = (now = new Date().getFullYear()) => (YULSAN.since ? now - YULSAN.since : null);
