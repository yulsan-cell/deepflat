// DEEPFLAT brand page: portfolio, schedule and page copy (homes only).
// Content only. Every project, date, duration and photo here is a sample for the draft: the page no longer marks
// them (owner, 2026-10-27), so they must give way to real projects before it goes public.
//
// Size bands: `min` is inclusive, `max` is exclusive, `max: null` has no upper limit.
//   apartments, penthouses, townhouses/villas: 공급면적 평형 (e.g. 34평형)
//   detached houses: 연면적 평 (all floors added together)
// `location` + `dong` is the place shown on the card and in the viewer ("서울 양천구 목동"); `duration.design` and
// `duration.build` are the card's 설계/시공 weeks. `sample: true` records that the project's text (its story, place,
// dates) is still invented; set it to false once the text is the real project's.
// Image slots (`images` below) describe each room for the stills pipeline; `kit` names the furniture builders in
// final/3d/kit.js the room calls for. What the page actually shows comes from final/stills/manifest.json (the rendered
// miniatures) and final/photos/photos.json (the client's real photos, written by final/photos/ingest.mjs): see
// final/svg/portfolio.mjs.


export const TYPES = [
  {
    id: 'apt',
    label: '아파트',
    basis: '공급면적',
    unit: '평형',
    sizeLabel: '평형',
    basisNote: '공급면적 기준 평형이에요. 함께 적은 ㎡는 그 평형대에서 흔한 전용면적이에요.',
    bands: [
      { id: 'apt-20', label: '20평형대', min: 20, max: 30, hint: '전용 59㎡' },
      { id: 'apt-30', label: '30평형대', min: 30, max: 40, hint: '전용 84㎡' },
      { id: 'apt-40', label: '40평형대', min: 40, max: 50, hint: '전용 99~114㎡' },
      { id: 'apt-50', label: '50평형대', min: 50, max: 60, hint: '전용 125~135㎡' },
      { id: 'apt-60', label: '60평형 이상', min: 60, max: null },
    ],
  },
  {
    id: 'penthouse',
    label: '펜트하우스',
    basis: '공급면적',
    unit: '평형',
    sizeLabel: '평형',
    basisNote: '공급면적 기준 평형이에요. 복층은 두 층을 더한 면적이에요.',
    bands: [
      { id: 'ph-u60', label: '60평형 미만', min: 0, max: 60 },
      { id: 'ph-60', label: '60~80평형', min: 60, max: 80 },
      { id: 'ph-80', label: '80평형 이상', min: 80, max: null },
    ],
  },
  {
    id: 'house',
    label: '단독주택',
    basis: '연면적',
    unit: '평',
    sizeLabel: '연면적',
    basisNote: '모든 층의 바닥 면적을 더한 연면적 기준이에요.',
    bands: [
      { id: 'house-u40', label: '40평 미만', min: 0, max: 40 },
      { id: 'house-40', label: '40~60평', min: 40, max: 60 },
      { id: 'house-60', label: '60~80평', min: 60, max: 80 },
      { id: 'house-80', label: '80평 이상', min: 80, max: null },
    ],
  },
  {
    id: 'townhouse',
    label: '타운하우스·빌라',
    basis: '공급면적',
    unit: '평형',
    sizeLabel: '평형',
    basisNote: '공급면적 기준 평형이에요. 지하층이나 다락은 분양 조건에 따라 빠지기도 해서 상담 때 도면으로 다시 확인해요.',
    bands: [
      { id: 'th-40', label: '40평형대', min: 40, max: 50 },
      { id: 'th-50', label: '50평형대', min: 50, max: 60 },
      { id: 'th-60', label: '60평형 이상', min: 60, max: null },
    ],
  },
];

export const typeById = (id) => TYPES.find((t) => t.id === id) || null;
export const bandById = (id) => TYPES.flatMap((t) => t.bands).find((b) => b.id === id) || null;
/** the band a size falls in for a space type (min inclusive, max exclusive) */
export const bandOf = (typeId, pyeong) =>
  typeById(typeId)?.bands.find((b) => pyeong >= b.min && (b.max === null || pyeong < b.max)) || null;

const img = (slug, key, room, caption, alt, kit) => ({ key, room, caption, alt, kit, src: `images/${slug}/${key}.jpg` });

export const PROJECTS = [
  {
    slug: 'mokdong-apt-25',
    title: '목동 아파트',
    type: 'apt',
    band: 'apt-20',
    pyeong: 25,
    size: '25평형 · 전용 59㎡',
    location: '서울 양천구',
    dong: '목동',
    scope: '전체 리모델링, 거실 발코니 확장, 붙박이 수납',
    duration: { design: 3, build: 5, label: '설계 3주, 시공 5주' },
    completed: '2026-03',
    completedLabel: '2026년 3월',
    sample: true,
    summary: '수납을 벽 한 면에 모으고 발코니를 넓힌 세 식구의 집',
    description:
      '부부와 어린아이가 사는 집인데 방 세 개가 모두 좁아 둘 곳 없는 짐이 거실까지 나와 있었어요. ' +
      '거실 발코니를 확장한 뒤 현관에서 거실 끝까지 이어지는 벽 한 면에 수납장을 모았어요. ' +
      '바닥과 수납장 문을 같은 화이트 오크로 맞추니 집이 실제보다 넓어 보여요. ' +
      '아이 방은 창가에 낮은 침대와 책상을 붙이고 가운데를 놀 자리로 비워 두었어요.',
    materials: [
      { name: '화이트 오크', use: '바닥, 수납장 문', tone: '#c9b08a' },
      { name: '리넨', use: '거실 커튼', tone: '#d9d0bf' },
      { name: '테라초', use: '현관 바닥', tone: '#bdb5a8' },
    ],
    palette: '화이트 오크 · 리넨 · 테라초',
    images: [
      img('mokdong-apt-25', 'living', '거실', '확장한 발코니까지 하나로 이어진 거실', '밝은 오크 바닥 거실에 낮은 소파와 커피 테이블이 있다. 넓힌 창에는 리넨 커튼이 드리워져 있다.', ['sofa', 'coffeeTable', 'floorLamp']),
      img('mokdong-apt-25', 'storage', '현관·수납 벽', '현관에서 거실 끝까지 이어지는 화이트 오크 수납 벽', '현관에서 시작한 화이트 오크 수납장이 한 면을 따라 거실 끝까지 이어진다.', ['bookshelf']),
      img('mokdong-apt-25', 'kids', '아이 방', '창가에 낮은 침대와 책상을 붙인 아이 방', '창가 쪽 벽에 낮은 침대와 작은 책상이 붙어 있고 방 가운데는 비어 있다.', ['bed', 'desk', 'deskChair']),
    ],
  },
  {
    slug: 'seongsu-apt-34',
    title: '성수동 아파트',
    type: 'apt',
    band: 'apt-30',
    pyeong: 34,
    size: '34평형 · 전용 84㎡',
    location: '서울 성동구',
    dong: '성수동',
    scope: '전체 리모델링, 방 구조 변경(칸막이벽 철거)',
    duration: { design: 4, build: 7, label: '설계 4주, 시공 7주(칸막이벽 철거로 1주 추가)' },
    completed: '2025-11',
    completedLabel: '2025년 11월',
    sample: true,
    summary: '작은 방 두 개를 합쳐 서재 하나로 바꾼 구조 변경',
    description:
      '두 사람 모두 집에서 일하는데 작은 방 두 개에는 짐만 쌓여 있었어요. ' +
      '방 사이 칸막이벽을 헐고 책상 두 개를 마주 놓은 서재 하나로 합쳤어요. ' +
      '서재 문은 흑철 틀 유리 미닫이예요. 닫아 두어도 거실 빛이 서재 안까지 들어요. ' +
      '바닥에는 스모크 오크를 깔고 서재 벽 한 면과 주방 아일랜드는 미장 콘크리트로 마감했어요.',
    materials: [
      { name: '스모크 오크', use: '바닥', tone: '#6e5a45' },
      { name: '미장 콘크리트', use: '서재 벽, 주방 아일랜드', tone: '#8f8a82' },
      { name: '흑철', use: '유리 미닫이 틀', tone: '#2b2a28' },
    ],
    palette: '스모크 오크 · 미장 콘크리트 · 흑철',
    images: [
      img('seongsu-apt-34', 'study', '서재', '책상 두 개를 마주 놓은 서재', '두 방을 합친 서재에 책상 두 개가 마주 놓여 있고 벽 한 면은 회색 미장 마감이다.', ['desk', 'deskChair', 'bookshelf']),
      img('seongsu-apt-34', 'living', '거실', '유리 미닫이 너머로 서재가 보이는 거실', '스모크 오크 바닥 거실 너머로 흑철 틀 유리 미닫이와 서재가 보인다.', ['sofa', 'floorLamp']),
      img('seongsu-apt-34', 'kitchen', '주방', '미장 콘크리트 아일랜드를 둔 주방', '회색 미장 콘크리트 아일랜드와 의자 두 개가 놓인 주방.', ['kitchenCounter', 'diningChair']),
    ],
  },
  {
    slug: 'banpo-apt-41',
    title: '반포동 아파트',
    type: 'apt',
    band: 'apt-40',
    pyeong: 41,
    size: '41평형 · 전용 102㎡',
    location: '서울 서초구',
    dong: '반포동',
    scope: '전체 리모델링, 붙박이장 매립',
    duration: { design: 5, build: 8, label: '설계 5주, 시공 8주' },
    completed: '2025-06',
    completedLabel: '2025년 6월',
    sample: true,
    summary: '수납장을 벽 안으로 넣어 바닥을 넓게 비운 집',
    description:
      '20년 가까이 산 집이라 가구와 수납장이 해마다 늘었고 방마다 지나다닐 자리가 좁아져 있었어요. ' +
      '벽을 조금씩 두껍게 세워 그 안에 붙박이장을 넣었고 바닥에는 꼭 쓰는 가구만 남겼어요. ' +
      '거실과 복도 벽은 라임 플라스터로 마감해서 해가 기울면 벽 표면의 결이 드러나요. ' +
      '주방 상판은 베이지 석회암으로, 손잡이는 황동으로 골랐어요.',
    materials: [
      { name: '라임 플라스터', use: '거실·복도 벽', tone: '#d8cfbf' },
      { name: '내추럴 오크', use: '붙박이장', tone: '#b8956a' },
      { name: '베이지 석회암', use: '주방 상판', tone: '#cbbb9c' },
      { name: '황동', use: '손잡이', tone: '#a8874f' },
    ],
    palette: '라임 플라스터 · 내추럴 오크 · 베이지 석회암 · 황동',
    images: [
      img('banpo-apt-41', 'living', '거실', '가구를 줄여 바닥을 비운 거실', '라임 플라스터 벽 앞에 소파와 낮은 테이블만 놓인 넓은 거실.', ['sofa', 'coffeeTable', 'mushroomLamp']),
      img('banpo-apt-41', 'hall', '복도', '벽 안에 넣은 붙박이장과 라임 플라스터 벽', '복도 벽 안에 오크 붙박이장이 들어가 있고 바닥에는 아무것도 없다.', ['bookshelf']),
      img('banpo-apt-41', 'kitchen', '주방', '베이지 석회암 상판과 황동 손잡이', '베이지 석회암 상판을 얹은 주방장에 작은 황동 손잡이가 달려 있다.', ['kitchenCounter']),
    ],
  },
  {
    slug: 'hannam-apt-52',
    title: '한남동 아파트',
    type: 'apt',
    band: 'apt-50',
    pyeong: 52,
    size: '52평형 · 전용 129㎡',
    location: '서울 용산구',
    dong: '한남동',
    scope: '전체 리모델링, 거실·주방 사이 벽 철거',
    duration: { design: 6, build: 9, label: '설계 6주, 시공 9주' },
    completed: '2026-05',
    completedLabel: '2026년 5월',
    sample: true,
    summary: '거실과 주방 사이 벽을 터서 한 공간으로 이은 전체 리모델링',
    description:
      '거실과 주방이 벽으로 나뉘어 있어서 식구가 다 모여도 서로 얼굴을 보기 어려웠어요. ' +
      '사이에 있던 비내력벽을 헐고 긴 트래버틴 아일랜드를 두어 거실과 주방, 다이닝을 한 공간으로 이었어요. ' +
      '거실 벽과 주방장은 월넛으로 감쌌고 조명은 천장 안에 숨겨서 빛만 보여요. ' +
      '안방 욕실에는 창 쪽으로 욕조를 놓았어요.',
    materials: [
      { name: '월넛', use: '거실 벽, 주방장', tone: '#5a4030' },
      { name: '트래버틴', use: '아일랜드, 욕실 벽', tone: '#cdb894' },
      { name: '부클레', use: '거실 소파', tone: '#e3dccf' },
    ],
    palette: '월넛 · 트래버틴 · 부클레',
    images: [
      img('hannam-apt-52', 'living', '거실·주방', '벽을 헐고 하나로 이은 거실과 주방', '월넛 벽 거실과 트래버틴 아일랜드가 있는 주방이 벽 없이 이어진다.', ['sofa', 'kitchenCounter', 'floorLamp']),
      img('hannam-apt-52', 'dining', '다이닝', '트래버틴 아일랜드 옆 다이닝', '아일랜드 옆에 타원형 식탁과 의자가 놓여 있다.', ['ovalTable', 'diningChair']),
      img('hannam-apt-52', 'bath', '안방 욕실', '창 쪽에 놓은 욕조', '트래버틴 벽 욕실에서 욕조가 창 쪽을 향해 놓여 있다.', ['tub', 'vanity']),
    ],
  },
  {
    slug: 'cheongdam-penthouse-78',
    title: '청담동 펜트하우스',
    type: 'penthouse',
    band: 'ph-60',
    pyeong: 78,
    size: '78평형 · 복층',
    location: '서울 강남구',
    dong: '청담동',
    scope: '전체 리모델링, 계단 둘레 벽 철거, 난간 교체',
    duration: { design: 8, build: 12, label: '설계 8주, 시공 12주' },
    completed: '2025-09',
    completedLabel: '2025년 9월',
    sample: true,
    summary: '벽에 둘러싸였던 계단을 열어 위아래 층이 서로 보이는 복층',
    description:
      '계단이 벽에 둘러싸여 있어서 두 층짜리 펜트하우스의 위층이 따로 떨어진 집처럼 쓰였어요. ' +
      '계단 둘레의 벽을 걷어 내고 난간을 얇은 브론즈로 바꾸자 거실에서 위층까지 한눈에 보여요. ' +
      '계단 아래에는 낮은 서가를 짜 넣었고 아래층 바닥은 그레이 대리석과 훈증 오크로 마감했어요. ' +
      '위층 침실에는 울 카펫을 깔아 발소리를 줄였어요.',
    materials: [
      { name: '그레이 대리석', use: '아래층 거실 바닥', tone: '#9c9894' },
      { name: '훈증 오크', use: '아래층 바닥, 서가', tone: '#4a3a2c' },
      { name: '브론즈', use: '계단 난간', tone: '#6b5638' },
      { name: '울 카펫', use: '위층 침실', tone: '#a79c8c' },
    ],
    palette: '그레이 대리석 · 훈증 오크 · 브론즈 · 울',
    images: [
      img('cheongdam-penthouse-78', 'living', '거실·계단', '벽을 걷어 내 거실에서 보이는 계단', '대리석 바닥 거실 뒤로 얇은 브론즈 난간의 계단이 위층까지 드러나 있다.', ['sofa', 'loungeChair', 'stairs']),
      img('cheongdam-penthouse-78', 'library', '계단 아래 서가', '계단 아래에 짜 넣은 낮은 서가', '계단 아래 낮은 오크 서가 앞에 라운지 의자 하나가 놓여 있다.', ['bookshelf', 'loungeChair', 'mushroomLamp']),
      img('cheongdam-penthouse-78', 'bedroom', '위층 침실', '울 카펫을 깐 위층 침실', '울 카펫을 깐 위층 침실에 낮은 침대와 협탁이 있다.', ['bed', 'nightstand']),
    ],
  },
  {
    slug: 'pangyo-house-62',
    title: '판교 단독주택',
    type: 'house',
    band: 'house-60',
    pyeong: 62,
    size: '연면적 62평(공사 후) · 지상 2층',
    location: '경기 성남시',
    dong: '판교동',
    scope: '실내 전체 리모델링, 거실 창 확장, 2층 바닥 일부 철거·구조 보강',
    duration: { design: 8, build: 14, label: '설계 8주, 시공 14주' },
    completed: '2026-08',
    completedLabel: '2026년 8월',
    sample: true,
    summary: '거실 천장을 두 층 높이로 열고 마당 쪽 창을 넓힌 단독주택',
    description:
      '지은 지 15년 된 2층 주택이에요. 마당은 넓은데 거실 창이 작아서 집 안에서는 마당이 잘 보이지 않았어요. ' +
      '거실 창을 바닥까지 넓히고 창밖에 현무암 디딤돌을 놓아 마당으로 바로 나가게 했어요. ' +
      '2층 바닥 일부를 터서 거실 천장을 두 층 높이로 열었고 천장에는 더글러스 퍼 루버를 둘렀어요. ' +
      '주방과 다이닝 바닥은 테라코타 타일, 벽은 황토 미장이에요.',
    materials: [
      { name: '더글러스 퍼', use: '거실 천장 루버', tone: '#c28e5c' },
      { name: '테라코타 타일', use: '주방·다이닝 바닥', tone: '#a87458' },
      { name: '황토 미장', use: '주방·다이닝 벽', tone: '#c2a27a' },
      { name: '현무암', use: '마당 디딤돌', tone: '#3f3d3b' },
    ],
    palette: '더글러스 퍼 · 테라코타 · 황토 미장 · 현무암',
    images: [
      img('pangyo-house-62', 'living', '거실', '두 층 높이로 연 거실 천장', '두 층 높이로 열린 거실 천장에 나무 루버가 둘려 있고 아래에 소파가 놓여 있다.', ['sofa', 'loungeChair', 'floorLamp']),
      img('pangyo-house-62', 'garden', '마당 쪽 창', '바닥까지 넓힌 창과 현무암 디딤돌', '바닥까지 내려온 넓은 창밖으로 검은 현무암 디딤돌이 마당까지 이어진다.', ['loungeChair', 'ottoman']),
      img('pangyo-house-62', 'kitchen', '주방·다이닝', '테라코타 타일을 깐 주방과 다이닝', '테라코타 타일 바닥 위에 주방 카운터와 타원형 식탁이 있다.', ['kitchenCounter', 'ovalTable', 'diningChair']),
    ],
  },
  {
    slug: 'yongin-townhouse-54',
    title: '용인 타운하우스',
    type: 'townhouse',
    band: 'th-50',
    pyeong: 54,
    size: '54평형 · 지하 1층~지상 2층',
    location: '경기 용인시',
    dong: '고기동',
    scope: '전체 리모델링, 지하층 방습·환기 공사',
    duration: { design: 6, build: 10, label: '설계 6주, 시공 10주' },
    completed: '2024-12',
    completedLabel: '2024년 12월',
    sample: true,
    summary: '창고로만 쓰던 지하층을 가족실로 바꾼 타운하우스',
    description:
      '세 층 가운데 지하층은 짐을 쌓아 두는 창고로만 쓰였어요. ' +
      '지하층에는 습기를 막는 벽을 새로 세우고 환기 설비를 넣었어요. ' +
      '바닥에는 코르크를 깔아 아이들이 뛰어도 되는 가족실로 바꿨어요. ' +
      '1층 주방은 세라믹 슬랩 상판과 화이트 애쉬 수납장으로 맞췄어요. ' +
      '계단 옆 벽 한쪽을 유리로 바꾸자 1층 빛이 지하 계단까지 내려와요.',
    materials: [
      { name: '화이트 애쉬', use: '주방 수납장', tone: '#d6c7a8' },
      { name: '세라믹 슬랩', use: '주방 상판', tone: '#b9b4ab' },
      { name: '코르크', use: '지하 가족실 바닥', tone: '#a9825a' },
    ],
    palette: '화이트 애쉬 · 세라믹 슬랩 · 코르크',
    images: [
      img('yongin-townhouse-54', 'family', '지하 가족실', '코르크를 깐 지하 가족실', '코르크 바닥을 깐 지하 가족실에 낮은 소파와 오토만이 있다.', ['sofa', 'ottoman']),
      img('yongin-townhouse-54', 'kitchen', '1층 주방', '세라믹 슬랩 상판과 화이트 애쉬 수납장', '밝은 애쉬 수납장 위에 회색 세라믹 상판을 얹은 1층 주방.', ['kitchenCounter', 'diningChair']),
      img('yongin-townhouse-54', 'stair', '계단', '유리 벽으로 빛이 내려가는 계단', '계단 옆 유리 벽으로 위층 빛이 지하 계단까지 내려온다.', ['stairs']),
    ],
  },
];

// 평형별 예상 기간: apartment full remodelling, aligned to the apartment bands above (예시).
export const SCHEDULE_DURATIONS = [
  { band: 'apt-20', label: '20평형대', hint: '전용 59㎡', design: 3, build: 5, total: 8, plus: false, totalLabel: '약 8주', detail: '설계 3주, 시공 5주' },
  { band: 'apt-30', label: '30평형대', hint: '전용 84㎡', design: 4, build: 6, total: 10, plus: false, totalLabel: '약 10주', detail: '설계 4주, 시공 6주' },
  { band: 'apt-40', label: '40평형대', hint: '전용 99~114㎡', design: 5, build: 8, total: 13, plus: false, totalLabel: '약 13주', detail: '설계 5주, 시공 8주' },
  { band: 'apt-50', label: '50평형대', hint: '전용 125~135㎡', design: 6, build: 9, total: 15, plus: false, totalLabel: '약 15주', detail: '설계 6주, 시공 9주' },
  { band: 'apt-60', label: '60평형 이상', hint: '', design: 7, build: 11, total: 18, plus: true, totalLabel: '18주 이상', detail: '설계 7주, 시공 11주 이상' },
];
export const SCHEDULE_DURATIONS_SAMPLE = true;

// Korean object/topic particle after a word (받침 → 은/을, otherwise 는/를)
export const josa = (w, withFinal, withoutFinal) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0 ? withFinal : withoutFinal;
};

export const COPY = {
  meta: {
    description:
      '딥플랫(DEEPFLAT)은 아파트와 단독주택을 설계하고 시공하는 하이엔드 주거 인테리어 스튜디오예요. 처음 도면을 그린 디자이너가 마지막 마감까지 현장을 맡아요.',
  },
  hero: {
    h1: 'DEEPFLAT 딥플랫, 하이엔드 주거 인테리어 스튜디오',
    line: '하이엔드 주거 인테리어 스튜디오',
    sub: '식구의 하루를 듣고 도면을 그리고, 같은 팀이 그대로 시공까지 맡아요',
  },
  brand: {
    // title verbatim (2026-10-23); paragraphs rewritten in 해요체 at the user's request (2026-10-27)
    title: '집의 깊이를 설계합니다',
    titleHtml: '집의 깊이를<br>설계합니다',
    paragraphs: [
      '딥플랫은 아파트와 단독주택을 설계하고 시공하는 하이엔드 주거 인테리어 스튜디오예요. 이름에는 깊이(DEEP)와 집(FLAT), 두 단어를 담았어요.',
      '집을 맡으면 해가 드는 방향과 가족의 하루, 오래 손에 닿을 재료부터 살펴봐요. 처음 도면을 그린 디자이너가 마지막 마감까지 현장을 지켜요. 그래서 도면에서 함께\u00a0본 장면이 그대로 집이 돼요.',
    ],
    paragraphsHtml: [
      '딥플랫은 아파트와 단독주택을 설계하고 시공하는 하이엔드 주거 인테리어 스튜디오예요. 이름에는 <strong>깊이(DEEP)</strong>와 <strong>집(FLAT)</strong>, 두 단어를 담았어요.',
      '집을 맡으면 해가 드는 방향과 가족의 하루, 오래 손에 닿을 재료부터 살펴봐요. 처음 도면을 그린 디자이너가 마지막 마감까지 현장을 지켜요. 그래서 도면에서 함께&nbsp;본 장면이 그대로 집이 돼요.',
    ],
    // the sensory space image beside the copy (decision 4): replaces the recoloured key-visual poster
    image: {
      caption: '해가 낮게 드는 오후의 거실',
      // as on the page (index.html) and in final/stills/shots.js: one line, the scene itself
      alt: '아치 안의 소파와 스탠드, 창으로 비스듬히 드는 햇빛이 있는 어두운 거실',
      // as rendered (final/stills/brand.js): the corner of a clay room as a model on its plinth, in the hero's tone
      scene: {
        kit: ['sofa', 'floorLamp', 'vaseTwig', 'bulb'],
        light: 'a slit window in the left wall casts one long warm patch of low sun across the rug; the floor lamp lights the arched recess; one small glow bulb',
        space: 'mostly empty charcoal room; walls end inside the frame; the picture edges are the section colour #242422',
      },
    },
  },
  portfolio: {
    // as on the page (#portfolio .sec-head p). The draft's 예시/시안 marks were taken off the page at the owner's
    // request (2026-10-27): before it goes public, the sample projects must give way to real ones (or AI pictures be
    // labelled 연출 이미지), so nothing invented is shown to customers as finished work
    intro:
      '공간 종류를 고르고 평형이나 연면적으로 좁혀 보세요. 프로젝트를 누르면 집 전체 미니어처부터 방별 모습과 마감재까지 차례로 볼 수 있어요.',
    typeLabel: '공간 종류',
    all: '전체',
    // the size row before a type is chosen
    sizeLabelNoType: '면적',
    sizeHintNoType: '공간 종류를 고르면 여기에 면적 구간이 나와요. 아파트는 평형, 단독주택은 연면적으로 나눠요.',
    // after a type is chosen: label + basis line, e.g. "평형 · 공급면적 기준"
    sizeLabel: (type) => type.sizeLabel,
    sizeBasis: (type) => `${type.basis} 기준`,
    countAll: (n) => `전체 <b>${n}개</b> 프로젝트`,
    countFiltered: (parts, n) => `${parts.join(', ')}: <b>${n}개</b> 프로젝트`,
    cardOpen: '자세히 보기',
    // the title button's name: the visible title first (Label in Name), then the place and the badge, which sit
    // outside the button and would otherwise never be heard by someone moving by Tab or by heading
    cardOpenLabel: (p) => `${p.title} ${p.size} 자세히 보기, ${p.place}, ${p.badge}`,
    // the card's corner badge: real photos in (final/photos/ingest.mjs) or the miniature alone. It sits on the
    // cover miniature (the thumbnail stays a render), so it names the picture too, never letting it pass for a photo
    badgeReal: (n) => `미니어처 · 실제 사진 ${n}장`,
    // pictures made with AI or retouched (final/photos/ingest.mjs's default): never called 실제 (표시·광고법)
    badgeStaged: (n) => `미니어처 · 연출 이미지 ${n}장`,
    badgeModel: '미니어처',
    // the card's numbers row: 설계 3주 · 시공 5주
    cardDuration: (d) => `설계 ${d.design}주 · 시공 ${d.build}주`,
  },
  empty: {
    title: (parts) => `${parts.join(' ')} 프로젝트는 아직 없어요.`,
    hintDefault: '다른 평형이나 공간 종류를 골라 보세요.',
    hintHave: (typeLabel, bandLabels) => `${typeLabel}${josa(typeLabel, '은', '는')} ${bandLabels.join(', ')} 프로젝트가 있어요.`,
    actionAllSizes: (typeLabel, k) => `${typeLabel} 모두 보기 (${k}개)`,
    actionNearest: (typeLabel, bandLabel, k) => `${typeLabel} ${bandLabel} 보기 (${k}개)`,
    actionAll: (n) => `전체 보기 (${n}개)`,
  },
  // the project viewer. Slide 1 is always the home's whole-space miniature; the client's real photos follow it, and
  // until a project has them the rendered room close-ups stand in, each marked as a stand-in on the picture.
  // The page reads these from pf-data (`text`), written by final/svg/portfolio.mjs.
  detail: {
    close: '닫기',
    prev: '이전 이미지',
    next: '다음 이미지',
    counter: (i, n) => `${i} / ${n}`,
    counterLabel: (i, n) => `이미지 ${n}장 중 ${i}번째`,
    facts: { location: '위치', size: '면적', scope: '공사 범위', duration: '기간', completed: '완공', materials: '마감재' },
    // the chip on the picture, by kind of slide
    // (the room close-ups are renders of the same miniature, named as such so none passes for a photo)
    kind: {
      overview: '미니어처',
      standin: '방별 미니어처',
      photo: '실제 시공 사진',
      staged: '연출 이미지',
    },
    // the thumbnail names read out by screen readers ("사진 2: 거실: …")
    thumb: { overview: '미니어처', standin: '방별 미니어처', photo: '사진', staged: '연출 이미지' },
    // the line under the strip: what the set is made of
    tallyReal: (n) => `미니어처 1장 + 실제 시공 사진 ${n}장`,
    tallyStandin: (n) => `미니어처 1장 + 방별 미니어처 ${n}장`,
    tallyStaged: (n) => `미니어처 1장 + 연출 이미지 ${n}장`,
  },
  schedule: {
    durationSub:
      '아파트 전체 리모델링을 기준으로 설계와 시공을 합친 기간이에요. 현장 상태와 공사 범위에 따라 달라져요. 펜트하우스, 단독주택, 타운하우스·빌라는 상담 때 따로 알려 드릴게요.',
    lookupTitle: '망원동 아파트 32평형',
  },
  contact: {
    typeRow: { dt: '공간 종류', dd: '아파트, 펜트하우스, 단독주택, 타운하우스·빌라' },
    sizeRow: { dt: '면적', dd: '단독주택은 연면적, 나머지는 공급\u00a0평형이나 전용면적' },
    kakaoTemplate:
      '[딥플랫 상담]\n공간 종류(아파트/펜트하우스/단독주택/타운하우스·빌라): \n면적(공급 평형, 전용면적, 연면적 중 아는 것): \n위치: \n범위: \n예산: \n일정: ',
  },
  footer: {
    desc: '아파트와 단독주택 인테리어, 설계부터 시공까지',
  },
};
