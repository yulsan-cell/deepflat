// The seven example homes as miniature models in the hero's world.
// Units: 1 = 40 cm. Each home is a list of levels; each level a plan of rectangular rooms on a 0.5 grid, with the
// back (min z) and left (min x) away from the viewer, who looks from the front right as in the hero.
//   01 overview: the whole home as a cutaway model. Walls are generated from the room grid and cut at 2.6 (about 1 m);
//      walls facing the viewer are cut lower, at window-sill height, so every room can be seen.
//   02.. close-up: one room on its own as a diorama: a plinth, its two back walls at full height with a window
//      (the sun falls through it onto the floor), the same furniture as in the cutaway.
// Daylight (2026-10-26): the hero's sun and sky (lib.js dayLights), the home's palette lifted to read in the sun
// (lib.js homeMaterials), a sage ground deeper toward the back, ACES tone mapping at the hero's exposure. The night
// rig (key light, window beams, hanging bulbs, lamp-lit doorways) is gone: the sun through the windows does the beams.
// Each home's rooms carry their own options (layout, kit, close), so no two projects show the same room: the living
// rooms and kitchens below are built from the story each project tells on the page (final/data/portfolio.mjs).
// Real interiors (2026-10-26, second pass): the rooms are furnished with the 3D hero's real furniture (homekit.js: the
// CC0 model library and the drawn props.js pieces in their true sizes) instead of the toy clay blocks, and each home
// has its own interior style (STYLE below: plaster colours per room, floors, joinery, stone, fabrics, which sofa, chairs,
// tables and plants), in the bright palette of assets/ref-room.jpg.
// Plans apart (2026-10-27): each home's plan (rooms, open / low / doors, per-room options, its palette) is its own module,
// ./plans/<slug>.js, documented in ./plans/room.js. Doors are cut where the plan says (a side, a position), a front door
// (현관문) and garden / terrace doors to outside too (layout.js levelLinks); every room's furniture keeps clear of its
// doors (layout.js roomCtx, keepClear); the cutaway furnishes each room with its own layout (o.layout), as the close-up
// does; stair rooms rise past the cut (o.up) and stair voids open the floor above (o.down, kind 'void'); &check=1 runs
// the plan checker (layout.js planCheck, final/stills/check-plans.mjs).
import { THREE, homeMaterials, daylit, dayLights, dayGround, wall, windowGlow, frameCamera, toilet as libToilet, shower as libShower, flight as libFlight, rbox, cyl, sphere, blob as libBlob } from './lib.js';
import { dayMat, DAY } from '../3d/kit.js';
import { propMaterials, texMat, PLANK_TILE, WOOD_TILE, PROPS as PP, softBox, rod } from '../3d/props.js';
import { loadLibrary, MODELS } from '../3d/models.js';
import * as K from './homekit.js';
import { PROJECTS } from './shots.js';
import { T, HC, STOREY, levelLinks, roomSides, localSides, roomCtx, keepClear, planCheck, flightRuns, flightRect, isOutdoor } from './layout.js';

// every piece a layout adds carries its name (userData.piece): layout.js keepClear and the plan checker read it
const named = (o, name) => {
  if (o) o.userData.piece = name;
  return o;
};
const tagged = (name, fn) => (...a) => {
  const o = fn(...a);
  if (o && !o.userData.piece) o.userData.piece = name;
  return o;
};
// the furniture builders (homekit.js) under the names the layouts below use
const sofa = tagged('sofa', K.sofa), loungeChair = tagged('loungeChair', K.loungeChair), coffeeTable = tagged('coffeeTable', K.coffeeTable);
const floorLamp = tagged('floorLamp', K.floorLamp), diningChair = tagged('diningChair', K.diningChair), bed = tagged('bed', K.bed);
const nightstand = tagged('nightstand', K.nightstand), tub = tagged('tub', K.tub), desk = tagged('desk', K.desk), deskChair = tagged('deskChair', K.deskChair);
const bookshelf = tagged('bookshelf', K.bookshelf), ottoman = tagged('ottoman', K.ottoman), tallCabinet = tagged('tallCabinet', K.tallCabinet);
const consoleLow = tagged('console', K.consoleLow), island = tagged('island', K.island), stool = tagged('stool', K.stool), vanityLow = tagged('vanity', K.vanityLow);
const sideTable = tagged('sideTable', K.sideTable), pottedTree = tagged('plant', K.pottedTree), bench = tagged('bench', K.bench);
const pendant = tagged('pendant', K.pendant), bowl = tagged('bowl', K.bowl);
const mushroomLamp = tagged('deskLamp', K.deskLamp);
const blk = tagged('block', K.jblk);
const toilet = tagged('toilet', libToilet), shower = tagged('shower', libShower), flight = tagged('stair', libFlight), blob = tagged('blob', libBlob);
let CUR = null; // the materials of the home being built (the rug builder reads the room kind from it)
const rug = (mat, x0, x1, z0, z1, y) => named(K.rug(mat, x0, x1, z0, z1, y, CUR), 'rug');
const S = K.S;
const R90 = Math.PI / 2;

const Y = 0.06; // floor finish thickness: furniture stands on it
// T (wall thickness in the cutaway, 0.45), HC (its cut height, 2.6) and LOW (walls toward the viewer, cut at sill
// height, 0.9) live in layout.js
const TC = 0.6; // wall thickness in a close-up
const GROUND = -2.4;

// ── palettes: each home's materials as muted tints of the hero's cream / sand / clay (no saturated colour), now in the
// home's plan (plans/<slug>.js pal). Extra keys read by extraMaterials(): plaster (a kitchen wall panel), louver (wood
// battens), terracotta, cork, brass

// the extras some homes read, lifted for daylight like the rest of the palette (lib.js daylit)
const day = (hex, lift, extra = {}) => dayMat(daylit(hex, lift), 'top', { roughness: 0.9, ...extra });
function extraMaterials(M, p) {
  M.plaster = day(p.plaster ?? p.feature ?? 0x8b8478, 0.36);
  M.louver = day(p.louver ?? p.wood ?? 0x9d8b6d, 0.24, { roughness: 0.7 });
  M.floorTerracotta = day(p.terracotta ?? 0x947866, 0.3, { roughness: 0.85 });
  M.floorCork = day(p.cork ?? 0x9a7f62, 0.3, { roughness: 0.95 });
  M.brass = day(p.brass ?? 0xa08857, 0.32, { roughness: 0.35, metalness: 0.25 });
  return M;
}

// ── interior styles (daylight, real furniture) ────────────────────────────────
// a plaster colour as it reads on a wall in open light (props.js plasters)
const plasterMat = (hex) => dayMat(hex, 0.62, { roughness: 0.97 });
const plainTop = (hex, rough = 0.4) => dayMat(hex, 'top', { roughness: rough });
// canvas tiles for the floors props.js has no texture for (terracotta tiles, cork), read as they are in the sun
function canvasMat(key, draw, tileM) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  draw(c.getContext('2d'), 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.name = key;
  const m = texMat(t, { roughness: 0.8 });
  m.userData.tileM = tileM;
  return m;
}
function rngOf(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const terracottaTiles = () =>
  canvasMat('terracotta', (g, n) => {
    // 4 x 4 square tiles of 30 cm, each a little lighter or warmer than the next, pale grout
    const r = rngOf(7), k = n / 4;
    g.fillStyle = '#e7d6c3';
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const l = 62 + r() * 8, h = 18 + r() * 6;
        g.fillStyle = `hsl(${h}, 48%, ${l}%)`;
        g.fillRect(i * k + 3, j * k + 3, k - 6, k - 6);
        for (let q = 0; q < 40; q++) {
          g.fillStyle = `rgba(${r() < 0.5 ? '255,240,225' : '150,80,50'},0.07)`;
          g.fillRect(i * k + 3 + r() * (k - 12), j * k + 3 + r() * (k - 12), 4 + r() * 10, 3 + r() * 8);
        }
      }
  }, 1.2);
const corkFloor = () =>
  canvasMat('cork', (g, n) => {
    const r = rngOf(3);
    g.fillStyle = '#d2ac7f';
    g.fillRect(0, 0, n, n);
    for (let q = 0; q < 5200; q++) {
      g.fillStyle = r() < 0.55 ? `rgba(140,90,45,${0.1 + r() * 0.2})` : `rgba(250,225,190,${0.1 + r() * 0.2})`;
      const s = 1 + r() * 3.5;
      g.fillRect(r() * n, r() * n, s, s);
    }
    g.strokeStyle = 'rgba(120,80,40,0.25)';
    g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      g.beginPath();
      g.moveTo(0, (i * n) / 2);
      g.lineTo(n, (i * n) / 2);
      g.moveTo((i * n) / 2, 0);
      g.lineTo((i * n) / 2, n);
      g.stroke();
    }
  }, 1.2);

// Each home's interior, kept to the materials its story names (final/data/portfolio.mjs) and lifted into the bright
// palette: walls (cut: the cutaway's walls; walls: the close-ups' plaster per room kind), floors, joinery (cab), stone
// (worktops), fabrics, and which pieces stand in it (homekit.js reads M.st).
const STYLE = {
  // 목동: white oak floors and joinery, linen, a terrazzo entry; a young family: soft sage and blush in the rooms
  'mokdong-apartment': (M) => ({
    cut: 0xf1ece3,
    walls: { living: 0xeee4d3, kitchen: 0xf3efe7, room: 0xd8e1d5, master: 0xedd6ca, bath: 0xf3efe7, default: 0xf0e9dd },
    floorWood: M.floorPale, floorStone: M.terrazzo, cab: M.ash, stone: plainTop(0xeeeae2), feature: M.ash,
    sofa: { glb: true, tint: [1.42, 1.22, 1.3], pillows: [M.sage, M.blushFab, M.oat] },
    chair: 'tub', chairFabric: M.oat, roundTable: 'marble', coffee: 'oval', coffeeWood: M.ash, coffeeDecor: 'plant',
    dining: { round: M.ash }, islandFront: M.ash,
    bed: { head: M.oat, wood: M.ash, accent: M.sage, throwMat: M.blushFab, small: { head: M.blushFab, wood: M.ash, accent: M.ochre, throwMat: M.sage } },
    nightWood: M.ash, deskWood: M.ash, deskShell: M.ash, shelfWood: M.ash, consoleWood: M.ash, benchWood: M.ash,
    plants: ['syngonium', 'tall', 'fiddle', 'monstera'], pot: 'round', potMat: M.ceramic,
    rug: { style: 'border', base: 0xefe8dc, accent: 0xa9bba9 }, rugs: { room: { style: 'arc', base: 0xf0e6d6, accent: 0xe6c3b4 }, master: { style: 'plain', base: 0xebe3d6, accent: 0xd0c2ab } },
    curtains: ['living', 'master'], art: { living: 'botanical', master: 'hills', room: 'sun' }, flowers: ['white', 'blush', 'butter'],
  }),
  // 성수: smoked oak, plaster concrete, black steel; warm white walls, greige linen, a cognac leather chair
  'seongsu-apartment': (M) => {
    const concrete = plasterMat(0xcdc8bf);
    return {
      cut: 0xebe8e2,
      walls: { living: 0xebe5db, kitchen: 0xece7df, study: 0xefebe3, master: 0xe8e0d4, bath: 0xefece6, default: 0xeeebe4 },
      floorWood: K.toned(M.floorOak, [0.82, 0.76, 0.7]), floorStone: M.tileWhite, cab: M.cabCream, stone: plainTop(0xc6c1b8, 0.6),
      feature: concrete, islandFront: concrete, islandTop: plainTop(0xbdb8af, 0.6),
      sofa: { glb: true, tint: [1.42, 1.17, 1.19], pillows: [M.rust, M.linen, M.oat] },
      chair: 'lounge', coffee: 'stone', coffeeMat: plainTop(0xc9c4bb, 0.7), coffeeDecor: 'books',
      dining: {}, deskWood: K.toned(M.oak, [0.8, 0.74, 0.68]), deskFrame: M.black, deskShell: M.oak, shelfWood: K.toned(M.oak, [0.8, 0.74, 0.68]),
      bed: { glb: true, swaps: { headboard_linen_sand: [0.92, 0.92, 0.95], throw_linen_sage: [1.08, 0.98, 0.96] } }, nightWood: M.oak,
      consoleWood: K.toned(M.oak, [0.8, 0.74, 0.68]), pendantMat: M.ceramicDark,
      plants: ['snake', 'tall', 'monstera'], pot: 'cylinder', potMat: M.stoneware,
      rug: { style: 'stripe', base: 0xe8e3da, accent: 0x9b958c }, rugs: { study: { style: 'plain', base: 0xe4ddd0, accent: 0xc9bfae } },
      curtains: ['master'], art: { living: 'lines', study: 'lines', master: 'arch' }, artFrame: 'black', flowers: ['white', 'peach'],
    };
  },
  // 반포: lime plaster, natural oak built-ins, beige limestone, brass; the library's sage sofa and walnut sideboard
  'banpo-apartment': (M) => ({
    cut: 0xefe7da,
    walls: { living: 0xeee2cf, kitchen: 0xf1e8da, master: 0xeed8cc, bath: 0xe9dfcf, default: 0xeee5d6 },
    floorWood: M.floorOak, floorStone: M.travertine, cab: M.oak, stone: M.travertine, feature: plasterMat(0xe4d5bf),
    sofa: { glb: true, pillows: [M.linen, M.rust, M.oat] }, chair: 'frame', chairFabric: M.oat,
    coffee: 'oval', coffeeWood: M.oak, coffeeDecor: 'flowers', console: 'glb',
    dining: {}, islandFront: M.oak, bed: { glb: true }, nightWood: M.walnut, vanityFront: M.oak, vanityTop: M.travertine,
    plants: ['olive', 'tall', 'paradise'], pot: 'terracotta',
    rug: { style: 'border', base: 0xece4d7, accent: 0xc8a688 },
    curtains: ['master'], art: { living: 'arch', master: 'botanical' }, flowers: ['blush', 'white', 'peach', 'coral'],
  }),
  // 한남: walnut walls and kitchen, a travertine island and bath, a long bouclé sofa; blush plaster
  'hannam-apartment': (M) => ({
    cut: 0xf0e6de,
    walls: { living: 0xedd5c9, kitchen: 0xedd5c9, study: 0xe8ddd0, master: 0xeedad0, bath: 0xe6d6bf, default: 0xefe2d8 },
    floorWood: M.floorOak, floorStone: M.travertine, cab: M.walnut, stone: M.travertine, feature: M.walnut,
    islandFront: M.travertine, islandTop: M.travertine,
    sofa: { glb: false, fabric: M.boucle, pillows: [M.rust, M.oat, M.sage], throwOn: M.oat },
    chair: 'lounge', coffee: 'marble', coffeeDecor: 'flowers', console: 'glb',
    dining: { oval: M.walnut }, bed: { glb: true, swaps: { headboard_linen_sand: [1.04, 0.94, 0.9] } }, nightWood: M.walnut,
    shelfWood: M.walnut, deskWood: M.walnut, vanityFront: M.walnut, vanityTop: M.travertine,
    plants: ['tall', 'paradise', 'syngonium'], pot: 'round', potMat: M.ceramic,
    rug: { style: 'border', base: 0xf0e9de, accent: 0xb9a07f }, rugs: { study: { style: 'jute', base: 0xdccdb3, accent: 0xb89b74 } },
    curtains: ['master', 'study'], art: { living: 'sun', master: 'arch', study: 'botanical' }, artFrame: 'walnut', flowers: ['white', 'blush', 'peach'],
  }),
  // 청담: grey marble and fumed oak, bronze, wool; white walls, a long linen sofa, the library's armchairs
  'cheongdam-penthouse': (M) => ({
    cut: 0xf2f0eb,
    walls: { living: 0xf0ebe3, kitchen: 0xf1ede6, master: 0xebe2d6, bath: 0xeeebe6, default: 0xf1eee8 },
    floorWood: K.toned(M.floorOak, [0.9, 0.83, 0.77]), floorStone: K.toned(M.marble, [0.95, 0.95, 0.96]), cab: M.walnut, stone: M.marble,
    feature: plasterMat(0xe2ddd5), // a pale grey stone panel (the marble's veining read as cracks at this size) islandFront: M.walnut, islandTop: M.marble,
    sofa: { glb: false, fabric: M.linen, pillows: [M.sageDeep, M.oat, M.rust], throwOn: M.oat },
    chair: 'arm', coffee: 'marble', coffeeDecor: 'vase', console: 'glb',
    dining: { oval: M.walnut }, bed: { head: M.oat, wood: M.walnut, accent: M.sage, throwMat: M.sage }, nightWood: M.walnut,
    shelfWood: M.walnut, vanityFront: M.walnut, vanityTop: M.marble, stair: dayMat(0xe6ded2, 'top', { roughness: 0.6 }),
    plants: ['paradise', 'palm', 'tall'], pot: 'cylinder', potMat: M.ceramic,
    rug: { style: 'plain', base: 0xe8e1d5, accent: 0xd0c2ab }, rugs: { master: { style: 'plain', base: 0xddd4c6, accent: 0xc8bba7 } },
    curtains: ['master'], art: { living: 'hills', master: 'lines' }, flowers: ['white', 'lilac'],
  }),
  // 판교: Douglas-fir battens, terracotta tiles and ochre plaster in the kitchen, oak floors, a gravel garden
  'pangyo-house': (M) => ({
    cut: 0xeee8de,
    walls: { living: 0xf1ece4, kitchen: 0xe8d2ae, stair: 0xf1ece4, study: 0xd8e1d5, master: 0xeee2cf, family: 0xeee6da, bath: 0xf0ece4, default: 0xf0eadf },
    floorWood: M.floorOak, floorStone: plainTop(0xdcd6cc, 0.6), floorTerracotta: terracottaTiles(), cab: M.oak, stone: plainTop(0xe9e4da, 0.45),
    feature: plasterMat(0xe8e1d6), plaster: plasterMat(0xdcc097), louver: dayMat(0xd6b089, 0.62, { roughness: 0.7 }), stair: dayMat(0xdcc4a2, 'top', { roughness: 0.7 }),
    sofa: { glb: true, pillows: [M.oat, M.ochre, M.linen] }, chair: 'lounge', coffee: 'oval', coffeeDecor: 'plant',
    dining: { rect: M.oak }, islandFront: M.oak, bed: { glb: true }, nightWood: M.oak, benchWood: M.oak,
    plants: ['olive', 'tall', 'fiddle'], pot: 'terracotta', gravel: plainTop(0xddd8ce, 1), basalt: plainTop(0x6a6661, 0.8),
    rug: { style: 'jute', base: 0xdccbad, accent: 0xb89b74 }, rugs: { master: { style: 'border', base: 0xefe8dc, accent: 0xb9a07f } },
    curtains: ['master'], art: { living: 'botanical', master: 'hills', study: 'sun' }, flowers: ['white', 'butter', 'peach'],
  }),
  // 용인: white ash and a ceramic-slab top in the kitchen, terrazzo, a cork family room; sage and blush plaster
  'yongin-townhouse': (M) => ({
    cut: 0xebeee8,
    walls: { living: 0xd9e2d7, kitchen: 0xf3efe7, family: 0xeed8cd, master: 0xeee4d3, bath: 0xe4ebe3, default: 0xeef0ea },
    floorWood: K.toned(M.floorPale, [1.0, 0.99, 0.97]), floorStone: M.terrazzo, floorCork: corkFloor(), cab: M.ash, stone: plainTop(0xcac6bf, 0.5),
    feature: M.ash, islandFront: M.ash, islandTop: plainTop(0xc4c0b8, 0.5),
    sofa: { glb: false, fabric: M.oat, pillows: [M.sage, M.rust, M.linen] }, daybed: M.linen,
    chair: 'arm', roundTable: 'stone', coffee: 'stone', coffeeMat: M.travertine, coffeeDecor: 'plant',
    dining: { round: M.ash }, bed: { glb: true }, nightWood: M.ash, shelfWood: M.ash, deskWood: M.ash, consoleWood: M.ash,
    plants: ['syngonium', 'tall', 'monstera', 'snake'], pot: 'round', potMat: M.ceramicSand, gravel: plainTop(0xd8d5cc, 1),
    rug: { style: 'arc', base: 0xefe7da, accent: 0xa9bba9 }, rugs: { family: { style: 'stripe', base: 0xebe4d8, accent: 0x9db3a2 } },
    curtains: ['master'], art: { family: 'sun', master: 'botanical', living: 'arch' }, flowers: ['white', 'blush', 'lilac'],
  }),
};

// the home's materials: the old palette's keys (lib.js homeMaterials), the props.js materials, then the home's style
function makeHomeMaterials(slug, pal) {
  const M = extraMaterials(homeMaterials(pal), pal);
  const brass = M.brass;
  propMaterials(M);
  M.brass = brass;
  // walnut a step lighter than the hero's (a whole kitchen or wall of it here, not one sideboard): a warm mid brown
  M.walnut = K.toned(M.walnut, [1.24, 1.19, 1.14]);
  for (const [k, t] of [['floorOak', PLANK_TILE], ['floorPale', PLANK_TILE], ['oak', WOOD_TILE], ['walnut', WOOD_TILE], ['ash', WOOD_TILE], ['teak', WOOD_TILE], ['marble', 1.2], ['travertine', 1.2], ['terrazzo', 1.2], ['tileWhite', 0.8], ['tileSage', 0.8]]) M[k].userData.tileM = t;
  const st = STYLE[slug](M);
  M.st = st;
  M.block = dayMat(st.cut, 'top', { roughness: 0.95 });
  M.block.shadowSide = THREE.FrontSide;
  M.floorWood = st.floorWood ?? M.floorOak;
  M.floorStone = st.floorStone ?? M.tileWhite;
  if (st.floorTerracotta) M.floorTerracotta = st.floorTerracotta;
  if (st.floorCork) M.floorCork = st.floorCork;
  M.cab = st.cab ?? M.oak;
  M.stone = st.stone ?? M.marble;
  M.feature = st.feature ?? M.cab;
  if (st.plaster) M.plaster = st.plaster;
  if (st.louver) M.louver = st.louver;
  M.stair = st.stair ?? M.block;
  if (st.gravel) M.gravel = st.gravel;
  M.table = st.dining?.oval ?? st.dining?.rect ?? st.dining?.round ?? M.oak;
  M.cream = st.sofa?.fabric ?? M.linen; // the soft pieces drawn here (a daybed, a chaise)
  M.sand = M.oat;
  M.seam = dayMat(0x9c8f7e, 'left', { roughness: 0.8 }); // the hairline between joinery doors
  M.closeWall = {};
  return M;
}
// the plaster of a close-up's walls (by the room's kind)
function roomWall(M, kind) {
  const hex = M.st.walls[kind] ?? M.st.walls.default;
  return (M.closeWall[hex] ??= plasterMat(hex));
}

// ── plans ── each home's plan is its own module, ./plans/<slug>.js (./plans/room.js documents its shape: rooms, open /
// low / doors pairs, the door and stair syntax, the per-room options), loaded when the home is built
export async function loadPlan(slug) {
  try {
    return (await import(`./plans/${slug}.js`)).default;
  } catch (err) {
    throw new Error(`no plan ${slug}: ${err.message}`);
  }
}

// ── furniture, room by room ─────────────────────────────────────────────────
// Every room is furnished in its own frame: back wall along x at z = 0, left wall along z at x = 0, W wide, D deep,
// furniture facing +z. ctx.close: built as a close-up (the back walls are there and full height, the front is open).
// ctx also holds the room's doors (layout.js roomCtx): ctx.gaps, the clearance zones 2 units deep in front of them
// (ctx.zones), and the helpers that keep the wall-hugging pieces out of them: ctx.fit (a place along a wall), ctx.slide
// (where the layout wants it, unless that is in a door's way), ctx.spans (the stretches of a wall no door needs),
// ctx.hitsZone, ctx.take. After the layout, layout.js keepClear slides the loose pieces (plants, lamps, chairs...) out of
// the zones. ctx.wf: where a wall's face is (in the cutaway the walls stand half in the room, T/2; in a close-up 0).
const capH = (ctx, h) => (ctx.close ? h : Math.min(h, HC));
const put = (g, x, y, z, rot = 0) => {
  g.position.set(x, y, z);
  g.rotation.y = rot;
  return g;
};
// a piece's place in the room, kept where the layout put it unless that is in a door's way (then the nearest place
// along the same wall that is not): returns the centre along the wall
const slide = (ctx, spec) => {
  const d0 = spec.d0 ?? 0.25;
  const body = ctx.rect(spec.side, spec.at - spec.len / 2, spec.at + spec.len / 2, d0, d0 + spec.dep);
  if (!ctx.hitsZone(body)) return spec.at;
  return ctx.fit({ ...spec, d0 })?.c ?? spec.at;
};
// a block against wall `side`: a0..a1 along it, d0..d1 out from it, y0..y1 high
const wallBlk = (ctx, mat, side, a0, a1, y0, y1, d0, d1, r = 0) => {
  const R = ctx.rect(side, a0, a1, d0, d1);
  return blk(mat, [R.x0, R.x1], [y0, y1], [R.z0, R.z1], r);
};
// an offset that takes a rect (a desk and its chair, a table) out of the door zones, nearest first
function clearOffset(ctx, R, reach = 4) {
  if (!ctx.hitsZone(R)) return [0, 0];
  const c = [];
  for (let dx = -reach; dx <= reach + 1e-6; dx += 0.25) for (let dz = -reach; dz <= reach + 1e-6; dz += 0.25) c.push([dx, dz, Math.hypot(dx, dz)]);
  c.sort((p, q) => p[2] - q[2]);
  for (const [dx, dz] of c) {
    const S2 = { x0: R.x0 + dx, x1: R.x1 + dx, z0: R.z0 + dz, z1: R.z1 + dz };
    if (ctx.inside(S2, 0.2) && !ctx.hitsZone(S2) && !ctx.hitsTaken(S2)) return [dx, dz];
  }
  return [0, 0];
}

// a run of base cabinets with a worktop, sink and hob, doors facing +Z (homekit.js: props.js kitchenRun, dressed with
// a board, a pot of aloe and bottles); handles: brass pulls (every run has them now)
const counterRun = (M, { x, z, w, d = 1.6, rot = 0, body, top, sink = true, hob = null }) => named(K.counterRun(M, { x, y: Y, z, w, d, rot, body, top, sink, hob }), 'counter');
// a row of wall cabinets on the back wall, with door seams
const uppers = (M, o) => named(K.uppers(M, o), 'uppers');

// a dining table and its chairs (sizes in units). shape 'oval' (default), 'round' (len is the diameter) or 'rect';
// bench: a long bench on the +Z side instead of chairs. The rectangular table is the library's oak table (stretched to
// the room's length), the oval one is drawn in the home's wood, the round one a pedestal table; chairs are the
// library's oak chairs (homekit.js diningChair); a vase of flowers, a turned bowl and a candle on top.
function diningSet(M, { x, y, z, len = 5, wid = 2.3, rot = 0, chairs = 6, shape = 'oval', bench: withBench = false }) {
  const st = M.st.dining ?? {};
  const L = Math.min(2.6, Math.max(0.9, len / S)), Wd = Math.min(1.0, Math.max(0.78, wid / S));
  const g = new THREE.Group();
  let top = 0.75;
  if (shape === 'round') {
    g.add(PP.pedestalTable(M, { r: L / 2, h: 0.75, mat: st.round ?? M.table, s: S }));
  } else if (shape === 'rect' && M.lib?.has('dining_table')) {
    const t = M.lib.place('dining_table', { s: S });
    t.scale.x *= L / 1.8;
    t.scale.z *= Wd / 0.9;
    g.add(t);
    top = M.lib.dims('dining_table').h;
  } else {
    g.add(PP.diningTable(M, { len: L, wid: Wd, h: 0.75, oval: shape === 'oval', wood: st.oval ?? st.rect ?? M.table, s: S }));
  }
  const at = (mx, mz, r) => ({ x: mx * S, y: 0, z: mz * S, rot: r });
  if (shape === 'round') {
    const R = L / 2 + 0.3;
    for (let i = 0; i < chairs; i++) {
      const a = (i / chairs) * Math.PI * 2 + Math.PI / 4;
      g.add(diningChair(M, at(Math.sin(a) * R, Math.cos(a) * R, a + Math.PI)));
    }
  } else {
    const k = Math.min(3, Math.max(1, Math.floor((L - 0.3) / 0.62)));
    for (let i = 0; i < k; i++) {
      const cx = -L / 2 + ((i + 0.5) * L) / k;
      g.add(diningChair(M, at(cx, -(Wd / 2 + 0.26), 0)));
      if (!withBench) g.add(diningChair(M, at(cx, Wd / 2 + 0.26, Math.PI)));
    }
    if (withBench) g.add(bench(M, { x: 0, y: 0, z: (Wd / 2 + 0.3) * S, w: (L - 0.25) * S, d: 0.4 * S, mat: st.rect ?? M.table }));
    if (shape === 'oval' && chairs > 2 * k) for (const sx of [-1, 1]) g.add(diningChair(M, at(sx * (L / 2 + 0.24), 0, -sx * R90)));
  }
  const ty = top * S;
  g.add(PP.flowers(M, { kind: 'tulip', vaseKind: 'pitcher', vaseMat: M.ceramicSand, colors: M.st.flowers ?? ['white', 'peach', 'butter'], n: 7, h: 0.2, x: (shape === 'round' ? 0.05 : -L * 0.08) * S, y: ty, z: 0, s: S }));
  g.add(bowl(M, { x: (shape === 'round' ? -0.22 : L * 0.22) * S, y: ty, z: 0.05 * S, r: 0.34 }));
  if (shape !== 'round') g.add(PP.candle(M, { x: -L * 0.3 * S, y: ty, z: -0.06 * S, s: S }));
  g.position.set(x, y, z);
  g.rotation.y = rot;
  return named(g, 'dining');
}

// a low round table on one foot (stone, or the library's marble table) with a small still life
const roundLowTable = (M, { x, z, r = 1.0 }) => named(K.roundTable(M, { x, y: Y, z, r }), 'coffeeTable');

// pendants over a table or an island; the cutaway has no ceiling to hang them from, so only the close-ups get them
const pendants = (M, ctx, xs, z, o = {}) => (ctx.close ? xs.map((px) => pendant(M, { x: px, y: 3.9, z, top: ctx.H, r: o.r ?? 0.55 })) : []);

// a framed print on a close-up's back wall (z = 0) or left wall (x = 0), in the home's art for the room kind
function wallArt(M, ctx, { x = 0, z = 0, y = 3.4, w = 1.0, h = 0.75, back = true, kind }) {
  if (!ctx.close) return null;
  const k = kind ?? M.st.art?.[M.cur];
  if (!k) return null;
  return named(K.art(M, { x, z, y, w, h, kind: k, frame: M.st.artFrame ?? 'oak', back }), 'art');
}

// ── living rooms: each home's own layout (o.layout), in the close-up and, scaled to the room, in the cutaway ──
const LIVING = {
  classic(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const s = 1.2;
    const len = o.sofaLen ?? Math.min(5.6, (W - 5.4) / s);
    const SL = len * s;
    const sz = (ctx.close && o.close?.sofaZ) || 0.4 + 0.85 * s;
    const sx = slide(ctx, { side: 'back', at: o.sofaX ?? W * 0.46, len: SL + 0.6, dep: 2.2, d0: Math.max(0, sz - 1.1) });
    const tz = sz + 3.3;
    add(rug(M.rug, sx - SL / 2 - 0.4, sx + SL / 2 + 0.4, sz + 0.1, Math.min(D - 1.0, tz + 2.6), Y));
    add(sofa(M, { x: sx, y: Y, z: sz, len, s }), blob(sx, Y, sz + 0.1, SL / 2 + 0.3, 1.3, 0.3));
    add(coffeeTable(M, { x: sx - 0.3, y: Y + 0.08, z: tz, w: 3.3, d: 2.2, s: 0.9 }), blob(sx - 0.3, Y + 0.08, tz, 1.8, 1.3, 0.25));
    if (sx - SL / 2 - 1.1 > 0.5) add(floorLamp(M, { x: sx - SL / 2 - 0.95, y: Y, z: sz - 0.42, s: 0.8 }));
    const rx = sx + SL / 2;
    if (rx + 1.25 < W - 0.2) add(sideTable(M, { x: rx + 0.75, y: Y, z: sz - 0.42, r: 0.5, h: 1.15 }));
    if (rx + 2.0 < W) add(loungeChair(M, { x: Math.min(W - 1.3, rx + 1.0), y: Y, z: tz + 0.5, rot: -2.0, s: 0.92 }), blob(Math.min(W - 1.3, rx + 1.0), Y, tz + 0.5, 1.2, 1.2, 0.3));
    if (!ctx.close && o.tv !== false && D > 7.5 && ctx.hasWall('front', sx - 2, sx + 2)) add(consoleLow(M, { x: sx, y: Y, z: D - 0.75, w: Math.min(6, W - 5), rot: Math.PI }));
    if (o.plant || (ctx.close && sx - SL / 2 > 3.4)) add(pottedTree(M, { x: 1.2, y: Y, z: ctx.close ? 1.3 : D - 1.4, s: 0.85 }));
    if (ctx.close && o.feature) add(blk(M.feature, [sx - SL / 2 - 1.3, sx + SL / 2 + 1.3], [Y, ctx.H], [0, 0.12], 0));
    add(wallArt(M, ctx, { x: sx, z: o.feature ? 0.12 : 0, y: 3.0, w: 1.3, h: 0.95 }));
  },

  // 목동: the sofa sits in a niche of full-height white-oak storage that fills the back wall; a round low table and a
  // pouf on the rug, no floor lamp or armchair. The storage stops short of any door in that wall.
  storage(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const s = 1.15, len = 3.8, SL = len * s, cd = 1.5;
    const sz = 0.3 + 0.85 * s + 0.12;
    const sx = slide(ctx, { side: 'back', at: W * 0.5, len: SL + 0.5, dep: 2.3, d0: 0 });
    const top = ctx.close ? Math.min(ctx.H - 0.5, 5.8) : HC;
    const l1 = sx - SL / 2 - 0.25, r0 = sx + SL / 2 + 0.25;
    const runs = [];
    for (const [a, b] of [[0.3, l1], [r0, W - 0.3]])
      for (const [s0, s1] of ctx.spans({ side: 'back', d0: 0.3, dep: cd, lo: a, hi: b, inset: 0.3, min: 1.0, needWall: !ctx.close, taken: false })) {
        add(tallCabinet(M, { x: (s0 + s1) / 2, y: Y, z: 0.3 + cd / 2, w: s1 - s0, h: top - Y, d: cd }));
        runs.push([s0, s1]);
      }
    // the bridge over the sofa, when the storage stands on both sides of it
    const near = (v) => runs.some(([s0, s1]) => Math.abs(s0 - v) < 0.05 || Math.abs(s1 - v) < 0.05);
    if (ctx.close && near(l1) && near(r0)) add(uppers(M, { x0: l1, x1: r0, y0: 3.9, y1: top, d: 1.4 }));
    add(sofa(M, { x: sx, y: Y, z: sz, len, s }), blob(sx, Y, sz + 0.1, SL / 2 + 0.3, 1.2, 0.3));
    const tz = sz + 3.0;
    add(rug(M.rug, sx - SL / 2 - 0.3, sx + SL / 2 + 0.3, sz + 0.7, Math.min(D - 0.6, tz + 2.0), Y));
    add(roundLowTable(M, { x: sx - 0.2, z: tz, r: 1.05 }), blob(sx - 0.2, Y, tz, 1.3, 1.3, 0.3));
    add(ottoman(M, { x: sx + 1.9, y: Y, z: tz + 0.8, s: 0.6, fabric: M.sage }));
    if (ctx.close) add(pottedTree(M, { x: W - 1.0, y: Y, z: D - 1.3, s: 0.62 }));
  },

  // 성수: the sofa with its back to the window wall, facing into the room; a steel-framed glass slider (drawn by the
  // close-up's back opening) shows the lit study; a slim floor lamp in the corner
  side(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const s = 1.2, len = 3.8, SL = len * s;
    const sx = 0.3 + 0.85 * s;
    const sz = slide(ctx, { side: 'left', at: Math.min(D - 0.5 - SL / 2, D * 0.62), len: SL + 0.4, dep: 2.2, d0: 0 });
    add(sofa(M, { x: sx, y: Y, z: sz, len, s, rot: Math.PI / 2 }), blob(sx + 0.1, Y, sz, 1.3, SL / 2 + 0.3, 0.3));
    const tx = sx + 3.0;
    add(rug(M.rug, sx + 0.6, Math.min(W - 0.6, tx + (ctx.close || o.chair ? 4.3 : 2.3)), sz - SL / 2 - 0.2, Math.min(D - 0.3, sz + SL / 2 + 0.3), Y));
    add(coffeeTable(M, { x: tx, y: Y + 0.08, z: sz, w: 3.0, d: 1.9, s: 0.9, rot: Math.PI / 2 }), blob(tx, Y + 0.08, sz, 1.2, 1.6, 0.25));
    add(floorLamp(M, { x: 0.95, y: Y, z: sz - SL / 2 - 0.85, s: 0.8 }));
    add(sideTable(M, { x: 0.95, y: Y, z: sz + SL / 2 + 0.6, r: 0.45, h: 1.1 }));
    // o.chair: the lounge chair across the table in the cutaway too (as the close-up has it)
    if (ctx.close || o.chair) add(loungeChair(M, { x: tx + 2.9, y: Y, z: sz - 0.2, rot: -R90 - 0.35 }), blob(tx + 2.9, Y, sz - 0.2, 1.2, 1.2, 0.3));
    if (ctx.close) {
      add(pottedTree(M, { x: W - 1.1, y: Y, z: 1.2, s: 0.82 }));
      add(wallArt(M, ctx, { x: (5.8 + W - 1.6) / 2, y: 2.9, w: 0.9, h: 1.15 }));
    }
  },

  // 반포: oak built-ins set flush into the back wall on the left, lime plaster behind the sofa on the right; the floor
  // stays empty but for the sofa and one low table. In the cutaway the built-ins are a skin of oak on the wall's face.
  bare(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const split = W * 0.46, H = ctx.close ? ctx.H : HC, wf = ctx.wf;
    const top = ctx.close ? H - 0.35 : H;
    for (const [s0, s1] of ctx.spans({ side: 'back', d0: 0, dep: 0.6, lo: 0, hi: split, inset: 0, min: 1.0, needWall: !ctx.close, taken: false })) {
      add(blk(M.cab, [s0, s1], [Y, top], [wf, wf + 0.16], 0));
      const n = Math.max(1, Math.round((s1 - s0) / 1.15)), dw = (s1 - s0) / n;
      for (let i = 1; i < n; i++) add(blk(M.seam, [s0 + dw * i - 0.018, s0 + dw * i + 0.018], [Y + 0.25, Math.min(H - 0.6, top - 0.1)], [wf + 0.16, wf + 0.175], 0));
      if (ctx.close) add(blk(M.seam, [s0 + 0.05, s1], [H - 0.62, H - 0.58], [0.16, 0.175], 0));
      const [p0, p1] = ctx.close ? [2.4, 3.2] : [1.8, 2.4];
      for (let i = 0; i < n; i++) add(blk(M.brass, [s0 + dw * (i + 0.5) - 0.02, s0 + dw * (i + 0.5) + 0.02], [p0, p1], [wf + 0.16, wf + 0.2], 0.01));
    }
    for (const [s0, s1] of ctx.spans({ side: 'back', d0: 0, dep: 0.6, lo: split + 0.04, hi: W, inset: 0, min: 0.5, needWall: !ctx.close, taken: false }))
      add(blk(M.feature, [s0, s1], [Y, H], [wf, wf + 0.12], 0));
    const s = 1.2, len = 4.2, SL = len * s;
    const sx = slide(ctx, { side: 'back', at: split + (W - split) / 2 + 0.1, len: SL + 0.4, dep: 2.2, d0: 0, lo: split }), sz = 0.12 + 0.85 * s + 0.08 + wf;
    add(sofa(M, { x: sx, y: Y, z: sz, len, s }), blob(sx, Y, sz + 0.1, SL / 2 + 0.3, 1.3, 0.3));
    add(coffeeTable(M, { x: sx - 0.3, y: Y + 0.08, z: sz + 3.0, w: 2.8, d: 1.7, s: 0.85 }), blob(sx - 0.3, Y + 0.08, sz + 3.0, 1.5, 1.1, 0.25));
    add(rug(M.rug, sx - SL / 2 - 0.2, Math.min(W - 0.3, sx + SL / 2 + 0.2), sz + 0.5, sz + 5.0, Y));
    add(floorLamp(M, { x: sx - SL / 2 - 0.7, y: Y, z: sz - 0.3 }));
    add(wallArt(M, ctx, { x: sx, z: 0.12, y: 3.1, w: 1.4, h: 1.0 }));
    if (ctx.close) add(pottedTree(M, { x: 1.2, y: Y, z: D - 1.5, s: 0.85 }));
  },

  // 한남: one room from the window to the sofa: a walnut kitchen run on the back wall, a travertine island with stools,
  // and the living group in front of a walnut-panelled wall. In the cutaway the kitchen half stands only where the room
  // has a back wall of its own (with the kitchen as a room of its own behind an open side, that room shows it).
  open(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const cd = 1.6, ch = 2.25, kx1 = W * 0.5, wf = ctx.wf;
    const kitchen = ctx.close || (ctx.hasWall('back', 0.3, kx1) && !ctx.hitsZone(ctx.rect('back', 0.3, kx1, 0, 0.3 + cd)));
    if (kitchen) {
      add(tallCabinet(M, { x: 0.3 + 1.2, y: Y, z: 0.3 + cd / 2, w: 2.4, h: capH(ctx, 5.4), d: cd, mat: M.cab }));
      add(counterRun(M, { x: (2.7 + kx1) / 2, z: 0.3 + cd / 2, w: kx1 - 2.7, d: cd, h: ch, body: M.cab, top: M.stone }));
      if (ctx.close) add(blk(M.feature, [2.7, kx1], [3.9, 5.5], [0, 0.5], 0.03)); // a walnut shelf box over the run
    }
    for (const [s0, s1] of ctx.spans({ side: 'back', d0: 0, dep: 0.6, lo: kx1 + 0.1, hi: W, inset: 0, min: 0.5, needWall: !ctx.close, taken: false }))
      add(blk(M.feature, [s0, s1], [Y, ctx.close ? ctx.H : HC], [wf, wf + 0.14], 0)); // walnut panelling behind the sofa
    if (kitchen) {
      const iw = 4.6, ix = W * 0.27, iz = 0.3 + cd + 2.3;
      add(island(M, { x: ix, y: Y, z: iz, w: iw, d: 2.0, h: ch }), blob(ix, Y, iz, iw / 2 + 0.3, 1.3, 0.3));
      for (const k of [-1, 0, 1]) add(stool(M, { x: ix + k * 1.4, y: Y, z: iz + 1.55, h: 1.7 }));
      add(...pendants(M, ctx, [ix - 1.2, ix + 1.2], iz, { r: 0.45, i: 4 }));
    }
    const s = 1.2, len = 4.6, SL = len * s;
    const sx = slide(ctx, { side: 'back', at: kx1 + (W - kx1) / 2 + 0.1, len: SL + 0.4, dep: 2.2, d0: 0, lo: kx1 }), sz = 0.14 + 0.85 * s + 0.1 + wf, tz = sz + 3.2;
    add(rug(M.rug, sx - SL / 2 - 0.4, Math.min(W - 0.3, sx + SL / 2 + 0.5), sz + 0.1, Math.min(D - 0.8, tz + 2.6), Y));
    add(sofa(M, { x: sx, y: Y, z: sz, len, s }), blob(sx, Y, sz + 0.1, SL / 2 + 0.3, 1.3, 0.3));
    add(coffeeTable(M, { x: sx - 0.4, y: Y + 0.08, z: tz, w: 3.2, d: 2.0, s: 0.9 }), blob(sx - 0.4, Y + 0.08, tz, 1.8, 1.3, 0.25));
    add(loungeChair(M, { x: Math.min(W - 1.3, sx + SL / 2 - 0.4), y: Y, z: tz + 1.6, rot: -2.3, s: 0.92 }), blob(Math.min(W - 1.3, sx + SL / 2 - 0.4), Y, tz + 1.6, 1.2, 1.2, 0.3));
    add(wallArt(M, ctx, { x: sx, z: 0.14, y: 3.1, w: 1.5, h: 1.0 }));
    if (ctx.close) add(pottedTree(M, { x: W - 0.9, y: Y, z: 1.1, s: 0.8 }));
    if (ctx.close) add(pottedTree(M, { x: 1.0, y: Y, z: D - 1.6, s: 0.62 }), floorLamp(M, { x: 0.8, y: Y, z: D - 3.0 }));
    // o.dining ({ x, z, len, wid } in the room's frame): an oval table and its chairs in front of the island, so kitchen,
    // dining and living are one room (한남, 2026-10-27)
    if (o.dining) {
      const t = { x: W * 0.33, z: D - 2.6, len: 4.2, wid: 2.1, ...o.dining };
      add(diningSet(M, { x: t.x, y: Y, z: t.z, len: t.len, wid: t.wid }), blob(t.x, Y, t.z, t.len / 2 + 1.2, t.wid / 2 + 1.2, 0.3));
    }
  },

  // 판교: two storeys high; what is left of the upper floor is a gallery on the right with a cream parapet; Douglas-fir
  // battens run up the back wall; the window on the left runs down to the floor. (In the cutaway, everything above the
  // cut is gone: the sofa group and the low shelf stay; the upper floor's plan shows the opening.)
  double(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const H = ctx.H, gy = 7.0, gx0 = W * 0.58, gz = 3.4;
    if (ctx.close) {
      add(blk(M.stair, [gx0, W], [gy - 0.55, gy], [0, gz], 0.03));
      add(blk(M.cream, [gx0, W], [gy, gy + 1.05], [gz - 0.12, gz], 0.02));
      add(blk(M.cream, [gx0, gx0 + 0.12], [gy, gy + 1.05], [0, gz], 0.02));
      add(blk(M.stair, [gx0 + 0.15, gx0 + 0.65], [Y, gy - 0.55], [gz - 0.65, gz - 0.15], 0.03)); // the column under its corner
    }
    const bw = Math.min(5.6, W - gx0 - 0.8);
    const bx = slide(ctx, { side: 'back', at: gx0 + (W - gx0) / 2, len: bw, dep: 1.2, d0: 0.3, lo: gx0 });
    if (ctx.close || ctx.hasWall('back', bx - bw / 2, bx + bw / 2)) add(bookshelf(M, { x: bx, y: Y, z: 0.3 + 0.6, w: bw, h: 2.2, d: 1.2 }));
    if (ctx.close) {
      for (let x = 0.6; x < gx0 - 0.3; x += 0.48) add(blk(M.louver, [x, x + 0.2], [gy + 1.4, H - 0.35], [0, 0.32], 0.02));
      add(blk(M.louver, [0.4, gx0 - 0.2], [H - 0.35, H - 0.15], [0, 0.4], 0.02));
    }
    const s = 1.25, len = 4.8, SL = len * s;
    const sx = slide(ctx, { side: 'back', at: W * 0.34, len: SL + 0.4, dep: 2.3, d0: 0 }), sz = 0.4 + 0.85 * s, tz = sz + 3.4;
    add(rug(M.rug, sx - SL / 2 - 0.5, sx + SL / 2 + 2.6, sz + 0.1, Math.min(D - 0.8, tz + 2.6), Y));
    add(sofa(M, { x: sx, y: Y, z: sz, len, s }), blob(sx, Y, sz + 0.1, SL / 2 + 0.3, 1.3, 0.3));
    add(coffeeTable(M, { x: sx + 0.2, y: Y + 0.08, z: tz, w: 3.3, d: 2.2, s: 0.9 }), blob(sx + 0.2, Y + 0.08, tz, 1.8, 1.3, 0.25));
    add(loungeChair(M, { x: sx + SL / 2 + 2.3, y: Y, z: tz + 0.2, rot: -1.75, s: 0.98 }), blob(sx + SL / 2 + 2.3, Y, tz + 0.2, 1.2, 1.2, 0.3));
    add(loungeChair(M, { x: sx + SL / 2 + 1.7, y: Y, z: tz + 2.6, rot: -2.5, s: 0.98 }), blob(sx + SL / 2 + 1.7, Y, tz + 2.6, 1.2, 1.2, 0.3));
    add(pottedTree(M, { x: 1.3, y: Y, z: D - 1.6, s: 1.15 }));
  },

  // 용인 1층: glass doors to the patio in the back wall; a low daybed along the left wall faces the room, two lounge
  // chairs across a round table, a tree between the doors (no sofa)
  garden(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const dl = 5.4, dd = 2.0, dx = 0.3 + dd / 2;
    const dz = slide(ctx, { side: 'left', at: D * 0.56, len: dl + 0.4, dep: dd + 0.3, d0: 0 });
    const DB = M.st.daybed ?? M.linen;
    const day = new THREE.Group();
    day.add(rbox(M.oak, dd - 0.3, 0.2, dl - 0.4, dx, Y, dz, 0.03));
    day.add(rbox(DB, dd, 0.75, dl, dx, Y + 0.18, dz, 0.2));
    day.add(rbox(DB, 0.6, 0.95, dl - 0.2, 0.3 + 0.31, Y + 0.85, dz, 0.24));
    for (const [pz, pm] of [[-1.4, M.sage], [0, M.oat], [1.3, M.rust]]) day.add(rbox(pm, 0.32, 0.9, 1.0, 0.3 + 0.85, Y + 0.95, dz + pz, 0.14));
    add(named(day, 'daybed'), blob(dx, Y, dz, 1.3, dl / 2 + 0.3, 0.3));
    const tx = 0.3 + dd + 2.7, tz = dz;
    add(rug(M.rug, 0.3 + dd + 0.4, Math.min(W - 0.6, tx + 4.2), tz - 3.0, Math.min(D - 0.4, tz + 3.0), Y));
    add(roundLowTable(M, { x: tx, z: tz, r: 1.0 }), blob(tx, Y, tz, 1.2, 1.2, 0.3));
    add(bowl(M, { x: tx + 0.2, y: Y + 0.95, z: tz - 0.1, r: 0.34, mat: M.cream }));
    add(loungeChair(M, { x: tx + 2.4, y: Y, z: tz - 1.4, rot: -1.95, s: 0.94 }), blob(tx + 2.4, Y, tz - 1.4, 1.2, 1.2, 0.3));
    add(loungeChair(M, { x: tx + 2.4, y: Y, z: tz + 1.5, rot: -1.2, s: 0.94 }), blob(tx + 2.4, Y, tz + 1.5, 1.2, 1.2, 0.3));
    add(pottedTree(M, { x: 7.5, y: Y, z: 0.95, s: 0.78 }), pottedTree(M, { x: 1.2, y: Y, z: 1.2, s: 0.85 }));
    add(floorLamp(M, { x: 0.9, y: Y, z: dz + dl / 2 + 0.8 }));
    if (ctx.close) add(pottedTree(M, { x: W - 1.3, y: Y, z: D - 1.4, s: 0.7 }), sideTable(M, { x: dx + 0.2, y: Y, z: dz - dl / 2 - 0.9, decor: 'vase' }));
    if (ctx.close || ctx.hasWall('back', W - 3.6, W - 0.4)) add(bookshelf(M, { x: W - 2.0, y: Y, z: 0.3 + 0.6, w: 3.2, h: 2.0, d: 1.1 }));
  },
};

// the bath fixtures, placed against the walls clear of the doors (layout.js ctx.fit): the vanity, the toilet (every bath
// has one; never in a door's way), a shower in a corner, a tub along a wall. o.vanity / o.toilet / o.tub: { wall, at,
// len } to choose the wall and the spot along it (at: units from the room's back-left corner, or 'start' | 'mid' |
// 'end'); o.shower: { corner: 'back-left' | 'back-right' | 'front-left' | 'front-right', w, d }; false leaves one out.
function packBath(W, D, o, ctx, kind) {
  const big = kind === 'big', tw = kind === 'tubWindow';
  const pick = (k) => (o[k] === false ? false : typeof o[k] === 'object' ? o[k] : {});
  const vo = pick('vanity'), to = pick('toilet'), so = pick('shower');
  const tuo = o.tub === false ? false : big || tw || o.tub ? (typeof o.tub === 'object' ? o.tub : {}) : false;
  const vw = vo.len ?? (tw ? Math.min(3.2, W - 1.2) : big ? Math.max(1.8, Math.min(3, W - 3.0)) : Math.min(2.6, W - 1.0));
  const showerSize = so && (so.w ? [so.w, so.d ?? so.w] : tw ? [Math.min(2.75, W - 1.65), 2.35] : big ? [2.25, 2.85] : [Math.min(2.35, W - 1.85), 2.55]);
  const tubHalf = tw ? 1.15 : 1.1, tubLen = 2 * tubHalf + 1.84;
  // the first wall at the spot the layout likes, the others from their corners
  const along = (walls, first, spec) => {
    for (const [i, side] of walls.entries()) {
      const s = ctx.fit({ ...spec, side, at: i === 0 ? first : 'start' }) ?? (i === 0 ? null : ctx.fit({ ...spec, side, at: 'end' }));
      if (s) return s;
    }
    return null;
  };
  let vlen = vw;
  const steps = {
    vanity: () => vo && along(vo.wall ? [vo.wall] : ['back', 'left', 'right', 'front'], vo.at ?? (big || tw ? 'end' : 'mid'), { len: vlen, dep: 1.25, d0: 0.3, inset: 0.3, front: 1.0, needWall: !ctx.close }),
    toilet: () => to && along(to.wall ? [to.wall] : ['right', 'left', 'back', 'front'], to.at ?? (big || tw ? D * 0.55 : D * 0.62), { len: 1.1, dep: 1.35, d0: 0, inset: 0.3, front: 1.0, needWall: !ctx.close }),
    shower: () => {
      if (!so || showerSize[0] < 2.0) return null;
      const corners = so.corner ? [so.corner] : big ? ['back-left', 'front-left', 'back-right', 'front-right'] : ['front-left', 'back-left', 'front-right', 'back-right'];
      return ctx.corner({ corners, w: showerSize[0], d: showerSize[1] });
    },
    tub: () => tuo && along(tuo.wall ? [tuo.wall] : ['left', 'back', 'right', 'front'], tuo.at ?? (tw ? Math.min(D - 3.2, 6.4) : Math.min(D - 2.6, 5.8)), { len: tubLen + 0.1, dep: 1.9, d0: 0.35, inset: 0.3, needWall: !ctx.close }),
  };
  // the layout's own order first (the look it had), then others, with shorter vanities, until everything fits
  const first = big || tw ? ['vanity', 'shower', 'tub', 'toilet'] : ['vanity', 'toilet', 'shower'];
  const orders = [first, ['shower', 'vanity', 'toilet', 'tub'], ['vanity', 'toilet', 'shower', 'tub'], ['shower', 'tub', 'toilet', 'vanity'], ['toilet', 'shower', 'vanity', 'tub'], ['toilet', 'vanity', 'shower', 'tub'], ['toilet', 'vanity']];
  const lens = [...new Set([vw, 2.2, 1.8].filter((v) => v <= vw + 1e-6))]; // a vanity is never drawn under 70 cm (1.75)
  const wanted = ['vanity', 'toilet', 'shower', 'tub'].filter((k) => ({ vanity: vo, toilet: to, shower: so && showerSize[0] >= 2.0, tub: tuo })[k]);
  let best = null;
  search: for (const L of lens)
    for (const order of orders) {
      vlen = L;
      const taken = ctx.taken.slice(), kept = ctx.kept.slice();
      const got = {};
      for (const k of order) {
        if (!wanted.includes(k)) continue;
        const s = steps[k]();
        if (s) ctx.take(s), (got[k] = s);
      }
      const ok = (!vo || got.vanity) && (!to || got.toilet);
      const score = wanted.filter((k) => got[k]).length + (ok ? 10 : 0);
      if (!best || score > best.score) best = { score, got, vlen: L, taken: ctx.taken.slice(), kept: ctx.kept.slice() };
      ctx.taken = taken;
      ctx.kept = kept;
      if (ok && wanted.every((k) => got[k])) break search;
    }
  ctx.taken = best.taken;
  ctx.kept = best.kept;
  if (!best.got.toilet && to) ctx.notes.push('no room for a toilet clear of the doors');
  return { ...best.got, showerSize, tubHalf, vw: best.vlen };
}

// a shower in a room corner (x0..x1 by z0..z1): the glass on the side facing the room (lib.js shower draws it for the
// left corners; the right ones are the mirror image)
function cornerShower(M, ctx, corner, { x0, x1, z0, z1 }, h) {
  const back = corner.startsWith('back'), right = corner.endsWith('right');
  if (!right) return shower(M, { x0, x1, z0, z1, y: Y, h, screenSide: back ? 'z' : 'x' });
  const g = new THREE.Group();
  g.add(shower(M, { x0: ctx.W - x1, x1: ctx.W - x0, z0, z1, y: Y, h, screenSide: back ? 'z' : 'x' }));
  g.scale.x = -1;
  g.position.x = ctx.W;
  return named(g, 'shower');
}

const F = {
  living(g, W, D, M, o, ctx) {
    (LIVING[o.layout ?? 'classic'] ?? LIVING.classic)(g, W, D, M, o, ctx);
  },

  // the family room: an L-shaped sectional on the back wall, an ottoman, a big soft rug, floor cushions and a low toy shelf
  family(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const s = 1.15, len = Math.min(5.0, (W - 4.4) / s), SL = len * s;
    const gc = slide(ctx, { side: 'back', at: 0.9 + (SL + 1.9) / 2, len: SL + 1.9, dep: 2.3, d0: 0 });
    const sx = gc - (SL + 1.9) / 2 + SL / 2, sz = 0.3 + 0.85 * s;
    add(sofa(M, { x: sx, y: Y, z: sz, len, s }));
    // the chaise: a seat block running forward at the sofa's right end, its own back on the wall and an arm outside
    const cx = sx + SL / 2 + 0.95, cl = Math.min(3.8, D - 3.0);
    const ch = new THREE.Group();
    ch.add(rbox(M.ink, 1.6, 0.12, cl - 0.3, cx, Y, 0.3 + cl / 2, 0.04));
    ch.add(rbox(M.cream, 1.9, 0.68, cl, cx, Y + 0.1, 0.3 + cl / 2, 0.24));
    ch.add(rbox(M.cream, 1.9, 0.92, 0.62, cx, Y + 0.5, 0.3 + 0.31, 0.26));
    ch.add(rbox(M.cream, 0.6, 0.85, cl, cx + 0.65, Y + 0.35, 0.3 + cl / 2, 0.26));
    ch.add(rbox(M.sand, 1.0, 0.16, cl - 1.4, cx - 0.2, Y + 0.78, 0.3 + cl / 2 + 0.3, 0.07));
    add(named(ch, 'sofa'));
    add(blob(sx + 0.9, Y, sz + 0.6, SL / 2 + 1.4, 1.6, 0.3));
    const tz = sz + 3.0;
    add(rug(M.rug, 0.6, Math.min(W - 0.5, cx + 2.4), sz + 0.8, Math.min(D - 0.4, tz + 3.2), Y));
    add(ottoman(M, { x: sx - 0.2, y: Y, z: tz, s: 1.25 }), blob(sx - 0.2, Y, tz, 1.4, 0.8, 0.3));
    add(named(rbox(M.sage, 1.2, 0.32, 1.2, sx - 2.0, Y + 0.03, tz + 2.0, 0.28), 'cushion'), named(rbox(M.blushFab, 1.1, 0.3, 1.1, sx - 0.5, Y + 0.03, tz + 2.4, 0.28), 'cushion'));
    add(wallArt(M, ctx, { x: sx, y: 3.3, w: 1.3, h: 0.9 }));
    const fz = Math.min(D - 2.0, tz + 2.2);
    if (D > 9 && (ctx.close || ctx.hasWall('left', fz - 1.6, fz + 1.6))) add(bookshelf(M, { x: 0.3 + 0.55, y: Y, z: fz, w: 3.2, h: 2.0, d: 1.1, rot: Math.PI / 2 }));
    if (ctx.close) add(pottedTree(M, { x: W - 1.2, y: Y, z: 1.3, s: 0.85 }));
  },

  // the kitchen run stands on the back wall's longest stretch no door needs (o.tall: 'right' puts the tall unit at the
  // right end, false leaves it out); islands and tables are slid out of the door zones after (layout.js keepClear)
  kitchen(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const kit = o.kit ?? (o.island ? 'islandTable' : 'oval');
    const cd = 1.6, ch = 2.25, cz = 0.3 + cd / 2;
    let tallW = o.tall === false ? 0 : 2.4;
    const right = o.tall === 'right';
    let [s0, s1] = [0.3, W - 0.3];
    const sp = ctx.spans({ side: 'back', d0: 0, dep: 0.3 + cd, inset: 0.3, needWall: !ctx.close, taken: false }).sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
    if (sp && sp[1] - sp[0] >= 3.0) [s0, s1] = sp;
    if (tallW && s1 - s0 < tallW + 0.3 + 3.0) tallW = 0;
    const cw = Math.min(s1 - s0 - tallW - 0.3, kit === 'farm' ? 9.5 : 10.5);
    const r0 = right ? s0 : s0 + tallW; // where the base run starts
    if (tallW) add(tallCabinet(M, { x: right ? r0 + cw + 0.05 + tallW / 2 : s0 + tallW / 2, y: Y, z: cz, w: tallW, h: capH(ctx, 5.2), d: cd }));
    const body = kit === 'longTable' || kit === 'islandTable' || kit === 'islandRound' ? M.cab : M.cream;
    const top = M.stone;
    add(counterRun(M, { x: r0 + cw / 2, z: cz, w: cw, d: cd, h: ch, body, top, handles: kit === 'longTable' ? M.brass : null, hob: o.hob ?? null })); // o.hob: true, the hob on a short run too
    ctx.take(ctx.rect('back', Math.min(s0, r0), r0 + cw + (right ? tallW + 0.05 : 0), 0.3, 0.3 + cd));
    if (ctx.close) {
      if (kit === 'round' || kit === 'islandTable') add(uppers(M, { x0: r0 + 0.2, x1: r0 + cw - 0.2 }));
      else if (kit === 'longTable') add(uppers(M, { x0: r0 + 0.2, x1: r0 + cw * 0.55 }));
      else if (kit === 'islandRound') add(uppers(M, { x0: r0 + cw * 0.45, x1: r0 + cw - 0.2, mat: M.cab }));
      else if (kit === 'islandOnly') add(blk(M.feature, [r0, r0 + cw], [ch + Y, ctx.H], [0, 0.12], 0)); // plaster concrete
      else if (kit === 'farm') add(blk(M.plaster, [0, W], [ch + Y, ctx.H], [0, 0.12], 0)); // ochre plaster
    }
    const pend = (xs, z, opt) => add(...pendants(M, ctx, xs, z, opt));
    if (kit === 'round') {
      const t = { x: W * 0.55, z: D - 2.9, len: 2.8, ...(o.table ?? {}) };
      add(diningSet(M, { x: t.x, y: Y, z: t.z, len: t.len, shape: 'round', chairs: 4 }), blob(t.x, Y, t.z, t.len / 2 + 1.1, t.len / 2 + 1.1, 0.3));
      pend([t.x], t.z);
    } else if (kit === 'islandOnly') {
      const iw = Math.min(5.2, W * 0.55), ix = W * 0.5, iz = 0.3 + cd + 2.4 + 1.0;
      add(island(M, { x: ix, y: Y, z: iz, w: iw, d: 2.2, h: ch }), blob(ix, Y, iz, iw / 2 + 0.3, 1.4, 0.3));
      for (const k of [-0.6, 0.6]) add(stool(M, { x: ix + k * 1.6, y: Y, z: iz + 1.6, h: 1.7 }));
      pend([ix - 1.3, ix + 1.3], iz, { r: 0.42, i: 4 });
      if (ctx.close) {
        // an oak shelf on the plaster-concrete wall with ceramics, a runner between the run and the island
        const shx = r0 + cw * 0.3, shy = 4.1;
        add(PP.floatShelf(M, { len: 1.5, wood: M.st.shelfWood, x: shx, y: shy, z: 0.12, s: S }));
        const on = shy + 0.045 * S, zz = 0.12 + 0.12 * S;
        add(M.lib?.place('vase_bulb', { x: shx - 1.2, y: on, z: zz, s: S, k: 0.7 }), M.lib?.place('vase_bottle', { x: shx - 0.55, y: on, z: zz, s: S, k: 0.7 }));
        add(PP.bowl(M, { r: 0.1, mat: M.stoneware, x: shx + 0.3, y: on, z: zz, s: S }), PP.plant(M, { kind: 'pothos', potKind: 'round', potR: 0.07, potH: 0.11, potMat: M.ceramic, h: 0.42, x: shx + 1.2, y: on, z: zz, seed: 4, s: S }));
        add(rug(M.rug, ix - iw / 2, ix + iw / 2, 0.3 + cd + 0.4, iz - 1.35, Y));
      }
    } else if (kit === 'longTable') {
      const len = Math.min(6.2, W - 3.6), tx = W * 0.5 + 0.2, tz = D - 3.0;
      add(diningSet(M, { x: tx, y: Y, z: tz, len, wid: 2.2, shape: 'rect' }), blob(tx, Y, tz, len / 2 + 1.0, 2.2, 0.3));
      pend([tx - len * 0.24, tx + len * 0.24], tz, { r: 0.42 });
    } else if (kit === 'farm') {
      // an L: the run on the back wall and a short run under the window on the left wall, a long table with a bench
      const lz = slide(ctx, { side: 'left', at: 0.3 + cd + 0.1 + 1.6, len: 3.2, dep: cd, d0: 0.3, lo: 0.3 + cd + 0.1 });
      if (!ctx.hitsZone(ctx.rect('left', lz - 1.6, lz + 1.6, 0.3, 0.3 + cd)) && (ctx.close || ctx.hasWall('left', lz - 1.6, lz + 1.6))) add(counterRun(M, { x: 0.3 + cd / 2, z: lz, w: 3.2, d: cd, h: ch, rot: Math.PI / 2, body, top, sink: false }));
      const len = Math.min(6.0, W - 5.0), tx = W * 0.5 + 0.8, tz = D - 3.3;
      add(diningSet(M, { x: tx, y: Y, z: tz, len, wid: 2.3, shape: 'rect', bench: true }), blob(tx, Y, tz, len / 2 + 1.0, 2.2, 0.3));
      pend([tx - len * 0.25, tx + len * 0.25], tz, { r: 0.5 });
    } else if (kit === 'islandRound') {
      const iw = Math.min(5.0, W * 0.34), ix = W * 0.32, iz = 0.3 + cd + 2.1 + 1.0;
      add(island(M, { x: ix, y: Y, z: iz, w: iw, d: 2.0, h: ch }), blob(ix, Y, iz, iw / 2 + 0.3, 1.3, 0.3));
      for (const k of [-1, 0, 1]) add(stool(M, { x: ix + k * 1.45, y: Y, z: iz + 1.55, h: 1.7 }));
      const t = { x: W * 0.74, z: Math.min(D - 2.6, iz + 0.9), len: 2.9 };
      add(diningSet(M, { x: t.x, y: Y, z: t.z, len: t.len, shape: 'round', chairs: 4 }), blob(t.x, Y, t.z, t.len / 2 + 1.1, t.len / 2 + 1.1, 0.3));
      pend([t.x], t.z);
      if (ctx.close) pend([ix], iz, { r: 0.4, i: 3.5 });
    } else {
      // 'islandTable' and 'oval': the cutaways of 한남 and 청담 and 청담's close-up
      const wide = W >= 14;
      let table = { x: W / 2, z: D - 2.3, len: Math.min(5.2, W - 4.4), wid: 2.3, rot: 0, ...(o.table ?? {}) };
      if (o.island) {
        const iw = Math.min(wide ? 5.6 : cw * 0.62, 6.4);
        const ix = wide ? W * 0.3 : W - 0.6 - iw / 2, iz = 0.3 + cd + 2.1 + 1.0;
        add(island(M, { x: ix, y: Y, z: iz, w: iw, d: 2.0, h: ch }), blob(ix, Y, iz, iw / 2 + 0.3, 1.3, 0.3));
        if (wide) {
          for (const k of [-1, 0, 1]) add(stool(M, { x: ix + k * 1.5, y: Y, z: iz + 1.55, h: 1.7 }));
          table = { ...table, x: W * 0.72, z: iz + 0.9, len: Math.min(5.2, W * 0.36) };
        } else {
          table = { ...table, x: Math.min(W * 0.36, ix - iw / 2 + 0.4), z: Math.max(table.z, iz + 3.4), len: Math.min(table.len, 4.2), wid: 2.0 };
        }
      }
      if (o.table !== false) {
        add(diningSet(M, { x: table.x, y: Y, z: table.z, len: table.len, wid: table.wid, rot: table.rot }), blob(table.x, Y, table.z, table.len / 2 + 1.2, table.wid / 2 + 1.2, 0.3));
        const n = table.len > 4.6 ? 2 : 1;
        pend(Array.from({ length: n }, (_, i) => table.x + (n === 1 ? 0 : (i - 0.5) * table.len * 0.45)), table.z);
      }
    }
    // a plant in the near corner of every kitchen close-up
    if (ctx.close) add(pottedTree(M, { x: W - 1.0, y: Y, z: D - 1.1, s: 0.66 }));
  },

  // the master bedroom: the bed's head on a wall with a nightstand each side and a panel behind; o.bed: { wall, at }
  // (or o.bedX: at on the back wall). Without them the bed stays on the back wall unless a door needs that spot; then
  // it goes to the nearest free spot on the back wall, else to the left, right or front wall. A nightstand in a door's
  // way is left out.
  master(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const bw = 4.4, bl = 5.6, head = 0.24, ns = 1.9;
    const want = o.bed ?? {};
    const walls = want.wall ? [want.wall] : o.bedX != null ? ['back'] : ['back', 'left', 'right', 'front'];
    const at0 = (side) => (typeof want.at === 'number' ? want.at : side === 'back' && o.bedX != null ? o.bedX : side === 'back' ? Math.max(W * 0.55, bw / 2 + ns) : ctx.len(side) / 2);
    let side = walls[0], c = at0(side);
    if (ctx.hitsZone(ctx.rect(side, c - bw / 2 - 0.3, c + bw / 2 + 0.3, head, head + bl + 0.05))) {
      let spot = null;
      for (const sd of walls) {
        spot = ctx.fit({ side: sd, len: bw + 2 * ns - 0.6, dep: bl + 0.05, d0: head, at: at0(sd), needWall: !ctx.close }) ?? ctx.fit({ side: sd, len: bw + 0.2, dep: bl + 0.05, d0: head, at: at0(sd), needWall: !ctx.close });
        if (spot) break;
      }
      if (spot) [side, c] = [spot.side, spot.c];
      else ctx.notes.push('the bed found no wall clear of the doors');
    }
    const deep = side === 'back' || side === 'front' ? D : W; // the room's depth seen from the bed's wall
    const bz = head + bl / 2 + 0.05;
    const R = (a0, a1, d0, d1) => ctx.rect(side, a0, a1, d0, d1);
    const rr = R(c - bw / 2 - 1.5, c + bw / 2 + 1.5, bz - 1.2, Math.min(deep - 0.6, bz + bl / 2 + 1.7));
    add(rug(M.rug, rr.x0, rr.x1, rr.z0, rr.z1, Y));
    // the panel behind the bed, in the stretch of wall around it that no door needs
    const pan = ctx.spans({ side, d0: 0, dep: 0.5, lo: Math.max(0.25, c - bw / 2 - 2.0), hi: Math.min(ctx.len(side) - 0.25, c + bw / 2 + 2.0), inset: 0, taken: false, needWall: !ctx.close }).find(([s0, s1]) => s0 <= c && s1 >= c);
    if (pan) add(named(wallBlk(ctx, ctx.close ? M.feature : M.cab, side, pan[0], pan[1], Y, ctx.close ? 3.4 : 2.2, 0.02, head, 0.03), 'headboard'));
    const p = ctx.pose(side, c, bz);
    const across = side === 'back' || side === 'front';
    add(bed(M, { x: p.x, y: Y, z: p.z, w: bw, l: bl, rot: p.rot }), blob(p.x, Y, p.z, across ? bw / 2 + 0.6 : bl / 2 + 0.4, across ? bl / 2 + 0.4 : bw / 2 + 0.6, 0.35));
    ctx.take(R(c - bw / 2, c + bw / 2, head, head + bl));
    for (const sx of [-1, 1]) {
      const a = c + sx * (bw / 2 + 0.95);
      if (ctx.hitsZone(R(a - 0.65, a + 0.65, head, head + 1.1))) continue;
      const q = ctx.pose(side, a, head + 0.55);
      add(nightstand(M, { x: q.x, y: Y, z: q.z, s: 0.72, rot: q.rot }));
    }
    if (side === 'back') add(wallArt(M, ctx, { x: c, z: head, y: 3.75, w: 1.3, h: 0.62 }));
    else if (side === 'left') add(wallArt(M, ctx, { x: head, z: c, y: 3.75, w: 1.3, h: 0.62, back: false }));
    if (deep > bl + 2.6) {
      const q = ctx.pose(side, c, head + bl + 1.0);
      add(bench(M, { x: q.x, y: Y, z: q.z, w: bw - 0.8, d: 1.0, h: 1.0, rot: q.rot }));
    }
    if (side === 'back' && c - bw / 2 - 1.9 > 3.6 && D > bl + 1.5) {
      add(loungeChair(M, { x: 1.7, y: Y, z: D - 2.0, rot: 0.75, s: 0.9 }));
      add(floorLamp(M, { x: 0.8, y: Y, z: D - 3.6, s: 0.72 }));
    }
  },

  // a child's room: the bed's head on the back wall in the left corner (its long side along the left wall), a desk at
  // the back wall's right end, else a wardrobe on the right wall, a bookshelf on the front wall. Each keeps clear of the
  // doors; o.bed / o.desk / o.wardrobe / o.shelf: { wall, at } to choose, false to leave one out.
  room(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const bw = 2.8, bl = 5.0;
    const bo = o.bed ?? {};
    let side = bo.wall ?? 'back', c = typeof bo.at === 'number' ? bo.at : 0.35 + bw / 2;
    if (bo.at === 'end') c = ctx.len(side) - 0.35 - bw / 2;
    if (ctx.hitsZone(ctx.rect(side, c - bw / 2, c + bw / 2, 0.3, 0.3 + bl))) {
      const sides = bo.wall ? [bo.wall] : ['back', 'front', 'left', 'right'];
      const f = ctx.fit({ side: sides, len: bw, dep: bl, d0: 0.3, at: 'start', inset: 0.35, needWall: !ctx.close }) ?? ctx.fit({ side: sides, len: bw, dep: bl, d0: 0.3, at: 'end', inset: 0.35, needWall: !ctx.close });
      if (f) [side, c] = [f.side, f.c];
      else ctx.notes.push('the bed found no wall clear of the doors');
    }
    const bedBody = ctx.rect(side, c - bw / 2, c + bw / 2, 0.3, 0.3 + bl);
    ctx.take(bedBody);
    const p = ctx.pose(side, c, 0.3 + bl / 2);
    const across = side === 'back' || side === 'front';
    add(bed(M, { x: p.x, y: Y, z: p.z, w: bw, l: bl, rot: p.rot }), blob(p.x, Y, p.z, across ? bw / 2 + 0.4 : bl / 2 + 0.3, across ? bl / 2 + 0.3 : bw / 2 + 0.4, 0.3));
    const free = W - bw - 0.6;
    // the desk (and its chair in front of it)
    let desked = false;
    const dop = o.desk ?? {};
    const dw0 = dop.len ?? Math.min(3.4, free - 0.6);
    if (dop !== false && (dw0 >= 2.4 || dop.wall)) {
      const dw = Math.max(2.4, dw0);
      const sd0 = dop.wall ?? 'back';
      const c0 = typeof dop.at === 'number' ? dop.at : ctx.len(sd0) - 0.3 - dw / 2;
      let f = null;
      const body = ctx.rect(sd0, c0 - dw / 2, c0 + dw / 2, 0.3, 1.8), use = ctx.rect(sd0, c0 - dw / 2, c0 + dw / 2, 1.8, 3.0);
      if (ctx.inside(body) && !ctx.hitsZone(body) && !ctx.hitsTaken(body) && !ctx.hitsZone(use)) f = { side: sd0, c: c0, body, use };
      else f = ctx.fit({ side: dop.wall ? [dop.wall] : ['back', 'right', 'left', 'front'], len: dw, dep: 1.5, d0: 0.3, at: dop.at ?? 'end', front: 1.2, frontZone: true, needWall: !ctx.close });
      if (f) {
        ctx.take(f);
        const q = ctx.pose(f.side, f.c, 0.3 + 0.75), ch = ctx.pose(f.side, f.c + (f.side === 'back' ? 0.2 : 0), 0.3 + 1.5 + 0.55);
        add(desk(M, { x: q.x, y: Y, z: q.z, w: dw, d: 1.5, h: 1.85, rot: q.rot }), deskChair(M, { x: ch.x, y: Y, z: ch.z, rot: ch.rot + Math.PI, s: 0.82 }));
        desked = true;
        if (f.side === 'back' && side === 'back' && c < W / 2) add(rug(M.rug, bw + 0.9, W - 0.6, 3.0, Math.min(D - 0.8, 6.2), Y));
        else {
          const rx0 = across && c < W / 2 ? bedBody.x1 + 0.6 : 0.8, rx1 = across && c >= W / 2 ? bedBody.x0 - 0.6 : W - 0.6;
          if (rx1 - rx0 > 1.5) add(rug(M.rug, rx0, rx1, Math.max(2.4, D * 0.35), Math.min(D - 0.8, D * 0.35 + 3.2), Y));
        }
      }
    }
    // a wardrobe on the right wall near the front, when the desk found no place (or when asked for)
    const wo = o.wardrobe;
    if (wo !== false && (wo || (!desked && free >= 1.4 && D > 6.5))) {
      const w = wo?.len ?? 2.6;
      const sd = wo?.wall ?? 'right';
      const f = ctx.fit({ side: wo?.wall ? [sd] : ['right', 'left', 'front', 'back'], len: w, dep: 1.3, d0: 0.3, at: typeof wo?.at === 'number' ? wo.at : sd === 'right' || sd === 'left' ? D - 0.4 - 1.4 : 'end', front: 0.8, needWall: !ctx.close });
      if (f) {
        ctx.take(f);
        const q = f.pose(0.3 + 0.65);
        add(tallCabinet(M, { x: q.x, y: Y, z: q.z, w, h: capH(ctx, 5.0), d: 1.3, rot: q.rot }));
      }
    }
    // a bookshelf against the front wall's right end
    const so = o.shelf;
    if (so !== false && (so || (D > 7.5 && free >= 2.2))) {
      const sd = so?.wall ?? 'front';
      const f = ctx.fit({ side: so?.wall ? [sd] : ['front', 'right', 'left'], len: 2.6, dep: 1.1, d0: 0.45, at: typeof so?.at === 'number' ? so.at : sd === 'front' ? W - 1.6 : 'end', needWall: !ctx.close });
      if (f) {
        ctx.take(f);
        const q = f.pose(1.0);
        add(bookshelf(M, { x: q.x, y: Y, z: q.z, w: 2.6, h: 2.2, d: 1.1, rot: q.rot }));
      }
    }
  },

  study(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    // the bookshelf on the back wall, in its longest stretch no door needs
    const shelfSpan = (lo, hi, want) => {
      const sp = ctx.spans({ side: 'back', d0: 0.3, dep: 1.2, lo, hi, inset: 0, min: 2.0, needWall: !ctx.close, taken: false });
      if (!sp.length) return null;
      const inside = sp.find(([a, b]) => a <= lo + 0.01 && b >= Math.min(hi, lo + want) - 0.01);
      const [a, b] = inside ?? sp.sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
      return [a, Math.min(b, a + want)];
    };
    if (o.layout === 'twin') {
      // 성수: two desks pushed together face to face, a long bookshelf on the back wall, a plaster-concrete panel beside it
      const shW = Math.min(W * 0.56, 7.2);
      const sp = o.shelf === false ? null : shelfSpan(0.5, W - 0.5, shW);
      if (sp) add(bookshelf(M, { x: (sp[0] + sp[1]) / 2, y: Y, z: 0.3 + 0.6, w: sp[1] - sp[0], h: capH(ctx, 4.6), d: 1.2 }));
      if (sp) ctx.take(ctx.rect('back', sp[0], sp[1], 0.3, 1.5));
      if (ctx.close) add(blk(M.feature, [0.5 + shW + 0.3, W], [Y, ctx.H], [0, 0.12], 0));
      // o.panel: the cutaway shows that panel too, on the face of the wall where one stands, cut with it
      else if (o.panel) for (const [s0, s1] of ctx.spans({ side: 'back', d0: 0, dep: 0.3, lo: 0.5 + shW + 0.3, hi: W, inset: ctx.wf, needWall: true, taken: false })) add(blk(M.feature, [s0, s1], [Y, HC], [ctx.wf, ctx.wf + 0.1], 0));
      let cx = Math.max(W * 0.5, 0.5 + shW / 2 + 0.4), cz = Math.max(4.4, D * 0.56);
      const dw = 3.4, dd = 1.5;
      const [ox, oz] = clearOffset(ctx, { x0: cx - dd - 1.1, x1: cx + dd + 1.1, z0: cz - dw / 2, z1: cz + dw / 2 });
      cx += ox, (cz += oz);
      add(rug(M.rug, cx - dd - 2.0, cx + dd + 2.0, cz - dw / 2 - 0.9, Math.min(D - 0.4, cz + dw / 2 + 0.9), Y));
      add(desk(M, { x: cx - dd / 2, y: Y, z: cz, w: dw, d: dd, h: 1.85, rot: Math.PI / 2 }), desk(M, { x: cx + dd / 2, y: Y, z: cz, w: dw, d: dd, h: 1.85, rot: -Math.PI / 2 }));
      add(blk(M.sand, [cx - 0.04, cx + 0.04], [Y + 1.85, Y + 2.55], [cz - dw / 2 + 0.25, cz + dw / 2 - 0.25], 0.02)); // a low screen
      add(blob(cx, Y, cz, dd + 0.3, dw / 2 + 0.4, 0.3));
      add(deskChair(M, { x: cx - dd - 0.62, y: Y, z: cz + 0.3, rot: Math.PI / 2, s: 0.88 }), deskChair(M, { x: cx + dd + 0.62, y: Y, z: cz - 0.3, rot: -Math.PI / 2, s: 0.88 }));
      add(mushroomLamp(M, { x: cx - dd / 2 - 0.1, y: Y + 1.85, z: cz - dw / 2 + 0.5, s: 0.42 }));
      if (ctx.close && W > 10) add(loungeChair(M, { x: W - 1.6, y: Y, z: D - 2.0, rot: -2.4, s: 0.9 }), floorLamp(M, { x: W - 0.8, y: Y, z: D - 3.6, s: 0.72 }));
      if (ctx.close) add(pottedTree(M, { x: 1.1, y: Y, z: D - 1.3, s: 0.7 }));
      return;
    }
    const shW = Math.min(W - 1.0, 7.2);
    const mid = [W / 2 - shW / 2, W / 2 + shW / 2];
    const sp = o.shelf === false ? null : !ctx.hitsZone(ctx.rect('back', mid[0], mid[1], 0.3, 1.5)) ? mid : shelfSpan(0.5, W - 0.5, shW);
    if (sp) add(bookshelf(M, { x: (sp[0] + sp[1]) / 2, y: Y, z: 0.3 + 0.6, w: sp[1] - sp[0], h: capH(ctx, 4.6), d: 1.2 }));
    if (sp) ctx.take(ctx.rect('back', sp[0], sp[1], 0.3, 1.5));
    let dz = 0.3 + 1.2 + 2.6, dx = W / 2 + 0.3;
    const [ox, oz] = clearOffset(ctx, { x0: dx - 2.1, x1: dx + 2.1, z0: dz - 2.0, z1: dz + 0.95 });
    dx += ox, (dz += oz);
    add(desk(M, { x: dx, y: Y, z: dz, w: 4.2, d: 1.9, h: 1.85 }), blob(dx, Y, dz, 2.4, 1.3, 0.3));
    add(deskChair(M, { x: dx - 0.3, y: Y, z: dz - 1.45, s: 0.88 }));
    add(mushroomLamp(M, { x: dx + 1.3, y: Y + 1.85, z: dz - 0.35, s: 0.42 }));
    add(rug(M.rug, 0.9, W - 0.9, dz - 2.0, Math.min(D - 0.6, dz + 2.6), Y));
    if (D > 9) {
      add(loungeChair(M, { x: 1.7, y: Y, z: D - 1.9, rot: 0.6, s: 0.88 }));
      add(floorLamp(M, { x: 0.75, y: Y, z: D - 3.3, s: 0.72 }));
    }
  },

  bath(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const big = o.big || (W >= 4.5 && D >= 9);
    const panel = o.wallMat === 'stone' ? M.stone : M.feature;
    if (ctx.close) {
      add(blk(panel, [0.0, W], [Y, ctx.H], [0, 0.1], 0));
      add(blk(panel, [0, 0.1], [Y, o.tubWindow ? 1.8 : 3.0], [0.1, D], 0));
    }
    const P2 = packBath(W, D, o, ctx, o.tubWindow ? 'tubWindow' : big ? 'big' : 'small');
    if (P2.vanity) {
      const q = P2.vanity.pose(0.3 + 0.62);
      add(vanityLow(M, { x: q.x, y: Y, z: q.z, w: P2.vw, rot: q.rot, mirror: ctx.close && (P2.vanity.side === 'back' || P2.vanity.side === 'left') }));
    }
    if (P2.shower) add(cornerShower(M, ctx, P2.shower.corner, P2.shower.body, capH(ctx, 5.4)));
    if (P2.tub) {
      const q = P2.tub.pose(1.3);
      const across = P2.tub.side === 'back' || P2.tub.side === 'front';
      add(tub(M, { x: q.x, y: Y, z: q.z, half: P2.tubHalf, r: 0.92, h: 1.4, rot: across ? 0 : Math.PI / 2 }), blob(q.x, Y, q.z, across ? 2.4 : 1.3, across ? 1.3 : 2.4, 0.3));
      if (o.tubWindow) {
        // a stool by the tub, where it leaves the way and the toilet free
        for (const da of [0.6, -0.6, 1.5, -1.5]) {
          const s = ctx.pose(P2.tub.side, P2.tub.c + da, 2.9);
          const r = { x0: s.x - 0.4, x1: s.x + 0.4, z0: s.z - 0.4, z1: s.z + 0.4 };
          if (!ctx.free(r)) continue;
          add(named(rbox(M.sand, 0.8, 1.0, 0.8, s.x, Y, s.z, 0.2), 'stool'));
          break;
        }
      }
    }
    if (P2.toilet) {
      const q = P2.toilet.pose(0.75);
      add(toilet(M, { x: q.x, y: Y, z: q.z, rot: q.rot }));
    }
    if (ctx.close) {
      if (o.tubWindow) add(pottedTree(M, { x: W - 0.9, y: Y, z: Math.min(D - 3.2, 6.4) - 0.6, s: 0.55 }));
      else if (big) add(pottedTree(M, { x: W - 1.0, y: Y, z: D - 1.2, s: 0.55 }));
    }
  },

  // a dressing room: wardrobes along the back and left walls (o.walls to choose), stopped short of every door
  dress(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    const h = capH(ctx, 5.2);
    const walls = o.walls ?? ['back', 'left'];
    const hasBack = walls.includes('back');
    for (const side of walls) {
      if ((side === 'left' || side === 'right') && D <= 4) continue;
      const lo = side === 'left' || side === 'right' ? (hasBack ? 2.1 : 0.3) : side === 'front' ? (walls.includes('left') ? 1.8 : 0.3) : 0.3;
      const hi = side === 'left' || side === 'right' ? D - 0.4 : W - 0.3;
      for (const [s0, s1] of ctx.spans({ side, d0: 0.3, dep: 1.5, lo, hi, inset: 0, min: 1.2, needWall: !ctx.close, taken: false })) {
        const q = ctx.pose(side, (s0 + s1) / 2, 0.3 + 0.75);
        add(tallCabinet(M, { x: q.x, y: Y, z: q.z, w: s1 - s0, h, d: 1.5, rot: q.rot }));
        ctx.take(ctx.rect(side, s0, s1, 0.3, 1.8));
      }
    }
    if (W > 3.6 && D > 6) add(bench(M, { x: W / 2 + 0.7, y: Y, z: D / 2 + 0.8, w: 1.4, d: 2.2, h: 1.0, mat: M.sand }));
  },

  // the entry: a tall shoe cabinet on the left wall (o.shoe: { wall } to choose, false to leave it out), a bench
  entry(g, W, D, M, o, ctx) {
    const so = o.shoe ?? {};
    if (so !== false) {
      const sides = so.wall ? [so.wall] : ['left', 'right', 'back', 'front'];
      for (const side of sides) {
        const L = ctx.len(side);
        const sp = ctx.spans({ side, d0: 0.3, dep: 1.4, lo: 0.4, hi: L - 0.4, inset: 0, min: 1.5, needWall: !ctx.close, taken: false }).sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
        if (!sp) continue;
        const q = ctx.pose(side, (sp[0] + sp[1]) / 2, 0.3 + 0.7);
        g.add(tallCabinet(M, { x: q.x, y: Y, z: q.z, w: sp[1] - sp[0], h: capH(ctx, 5.2), d: 1.4, rot: q.rot }));
        ctx.take(ctx.rect(side, sp[0], sp[1], 0.3, 1.7));
        break;
      }
    }
    if (W > 4 && o.bench !== false) g.add(bench(M, { x: W - 1.3, y: Y, z: 0.3 + 0.55, w: 1.9, d: 0.9, h: 1.0 }));
  },

  // o.laundry (a 다용도실): a front-loading washer with its dryer stacked on top at the start of the wall, the cabinet on
  // the rest (white boxes, a black ring round a grey door each; cut with the walls in the cutaway)
  pantry(g, W, D, M, o, ctx) {
    for (const side of ['back', 'left', 'right']) {
      let sp = ctx.spans({ side, d0: 0.3, dep: 1.4, lo: 0.3, hi: ctx.len(side) - 0.3, inset: 0, min: 1.2, needWall: !ctx.close, taken: false }).sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
      if (!sp) continue;
      if (o.laundry && sp[1] - sp[0] >= 1.7) {
        const wg = new THREE.Group(), h = capH(ctx, 4.3);
        for (const y0 of [0, 2.15]) {
          if (y0 + 0.3 > h) break;
          wg.add(blk(M.ceramic ?? M.cream, [-0.75, 0.75], [Y + y0, Y + Math.min(y0 + 2.1, h)], [-0.75, 0.75], 0.06));
          if (y0 + 1.6 > h) continue;
          for (const [r, t, mat] of [[0.48, 0.05, M.ink], [0.37, 0.07, M.stone]]) {
            const c = cyl(mat, r, r, t, 0, 0, 0, 28);
            c.rotation.x = R90;
            c.position.set(0, Y + y0 + 1.05, 0.75 + t / 2);
            wg.add(c);
          }
        }
        const q = ctx.pose(side, sp[0] + 0.8, 0.3 + 0.75);
        g.add(named(put(wg, q.x, 0, q.z, q.rot), 'washer'));
        sp = [sp[0] + 1.7, sp[1]];
        if (sp[1] - sp[0] < 1.2) break;
      }
      const q = ctx.pose(side, (sp[0] + sp[1]) / 2, 0.3 + 0.7);
      g.add(tallCabinet(M, { x: q.x, y: Y, z: q.z, w: sp[1] - sp[0], h: capH(ctx, 5.2), d: 1.4, rot: q.rot }));
      break;
    }
  },

  hall(g, W, D, M, o, ctx) {
    if (W >= 6 && D >= 4 && o.console !== false) {
      const w = Math.min(4, W - 2.4);
      const f = ctx.hitsZone(ctx.rect('back', W / 2 - w / 2, W / 2 + w / 2, 0.3, 1.3)) ? ctx.fit({ side: 'back', len: w, dep: 1.0, d0: 0.3, at: W / 2, needWall: !ctx.close }) : { c: W / 2 };
      if (f) g.add(consoleLow(M, { x: f.c, y: Y, z: 0.3 + 0.5, w, d: 0.9, h: 1.6, mat: M.cab }));
    }
    // o.battens: { a0, a1, y0 } Douglas-fir battens up the back wall from y0, over a0..a1 along it, clear of its doors
    // (판교's gallery: the upper part of the double-height living room's back wall, as in its close-up)
    if (o.battens) {
      const b = o.battens, y0 = b.y0 ?? 1.4, top = ctx.close ? ctx.H - 0.35 : HC;
      for (const [s0, s1] of ctx.spans({ side: 'back', d0: 0, dep: 0.6, lo: b.a0 ?? 0.4, hi: b.a1 ?? W - 0.4, inset: 0, min: 0.5, taken: false, needWall: !ctx.close }))
        for (let x = s0 + 0.1; x + 0.2 <= s1; x += 0.48) g.add(named(blk(M.louver, [x, x + 0.2], [y0, top], [ctx.wf, ctx.wf + 0.32], 0.02), 'battens'));
    }
  },

  stair(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    if (!ctx.close && (o.up || o.up === false)) return; // the room's own flight (o.up) is drawn by stairsIn
    const top = ctx.close ? 7.9 : HC;
    const n = Math.max(4, Math.round((top - Y) / 0.5));
    const land = ctx.close ? 3.2 : 0;
    const run = Math.min(0.75, (D - 0.4 - land) / n);
    const sw = Math.min(2.8, W - 1.6);
    add(flight(M.stair, { x: 0.05, z: land + n * run, base: Y, y0: Y, top, n, run, width: sw, axis: 'z', sign: -1 }));
    if (ctx.close) {
      add(blk(M.stair, [0, W], [top - 0.5, top], [0, land], 0.03)); // the upper floor's edge, reached by the flight
      add(blk(M.cream, [0.1, W], [top, top + 1.0], [land - 0.12, land], 0.02)); // a low cream parapet along it
      add(bench(M, { x: W - 0.75, y: Y, z: D - 3.4, w: 2.8, d: 1.0, rot: R90, fabric: M.oat }));
      add(pottedTree(M, { x: W - 1.1, y: Y, z: D - 0.9, s: 0.75 }));
      // under the landing: a low console with a lamp and a print, a runner along the floor
      add(consoleLow(M, { x: (sw + 0.3 + W) / 2, y: Y, z: 0.3 + 0.6, w: W - sw - 0.6 }));
      add(wallArt(M, ctx, { x: (sw + 0.3 + W) / 2, y: 3.1, w: 0.8, h: 1.05, kind: 'botanical' }));
      add(rug(M.rug, sw + 0.4, W - 1.7, land + 1.0, D - 0.7, Y));
    }
  },

  terrace(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    add(loungeChair(M, { x: W * 0.36, y: Y, z: D * 0.5, rot: 0.35, s: 0.9 }), loungeChair(M, { x: W * 0.36 + 3.2, y: Y, z: D * 0.5 + 0.2, rot: -0.35, s: 0.9 }));
    add(coffeeTable(M, { x: W * 0.36 + 1.6, y: Y, z: D * 0.5 + 2.0, w: 2.0, d: 1.6, s: 0.8 }));
    add(pottedTree(M, { x: 1.2, y: Y, z: 1.3, s: 0.95 }), pottedTree(M, { x: W - 1.3, y: Y, z: 1.3, s: 0.8 }));
    add(bench(M, { x: W - 3.0, y: Y, z: D - 0.9, w: 3.6, d: 0.9, h: 1.0, mat: M.teak }));
    add(rug(M.rug, W * 0.36 - 2.0, W * 0.36 + 5.2, D * 0.5 - 1.6, Math.min(D - 0.3, D * 0.5 + 3.2), Y));
    if (ctx.close) {
      add(blk(M.clay, [0.15, 1.1], [Y, 0.9], [2.4, D - 0.4], 0.04));
      for (let z = 2.8; z < D - 0.6; z += 0.55) add(sphere(M.leafDark, 0.34, 0.62, 1.0, z, 10));
    }
  },

  garden(g, W, D, M, o, ctx) {
    const add = (...a) => a.forEach((x) => x && g.add(x));
    add(pottedTree(M, { x: W * 0.12, y: Y, z: D * 0.5, s: 1.5, pot: false }), pottedTree(M, { x: W * 0.86, y: Y, z: D * 0.45, s: 1.1, pot: false }));
    for (let i = 0; i < 4; i++) add(blk(M.st.basalt ?? M.stoneware, [W * 0.4 + i * 1.6, W * 0.4 + i * 1.6 + 1.1], [Y, Y + 0.08], [D * 0.35, D * 0.35 + 1.6], 0.03));
    add(bench(M, { x: W * 0.64, y: Y, z: D * 0.62, w: 3.2, d: 1.0, h: 1.0, mat: M.teak }));
  },

  // an opening in the floor over a double-height room below (the cutaway shows it as a shaft with a parapet where no
  // wall stands): nothing to furnish
  void() {},
};

// ── stairs between levels (the cutaway): a flight up (o.up) rising to the cut and on past it as the cut stair mass; a
// stair void (o.down, kind 'void') where a flight arrives from below or leads down: a shaft through the floor and the
// block under it, the flight's top steps going down inside, a low parapet on its open sides ──
const TREAD = 0.65; // 26 cm
function stepRects(run, n) {
  const ax = run.dir[1], sg = run.dir[0] === '+' ? 1 : -1;
  const [a0, a1] = ax === 'x' ? run.x : run.z;
  const t = (a1 - a0) / n;
  return Array.from({ length: n }, (_, j) => {
    const s = sg > 0 ? a0 + j * t : a1 - (j + 1) * t;
    return ax === 'x' ? { x: [s, s + t], z: run.z } : { x: run.x, z: [s, s + t] };
  });
}
function upFlight(g, M, spec, ctx) {
  const runs = flightRuns(spec);
  const counts = runs.map((r) => (r.landing ? 0 : Math.max(1, Math.round(((r.dir[1] === 'x' ? r.x[1] - r.x[0] : r.z[1] - r.z[0]) / TREAD)))));
  const N = counts.reduce((a, b) => a + b, 0) || 1;
  const rise = (spec.storey ?? STOREY) / N;
  let k = 0;
  const box = (x, z, h, y0 = 0) => {
    if (h <= HC) return g.add(named(blk(M.stair, x, [y0, Y + h], z, 0.03), 'stair'));
    // above the cut: the stair's mass, cut flat at the cut height like the walls
    g.add(named(blk(M.stair, x, [y0, HC - 0.04], z, 0.02), 'stair'));
    g.add(named(blk(M.block, x, [HC - 0.04, HC], z, 0), 'stair'));
  };
  // spec.shelf (true | { side, h }): a low bookshelf built in under the flight where it is high enough, its face flush
  // with the flight's side ('front' | 'back' | 'left' | 'right'; default: the front of a run along x, the left of one
  // along z); the steps over it rest on it (청담)
  const sh = spec.shelf ? { h: 2.0, d: 1.0, ...(spec.shelf === true ? {} : spec.shelf) } : null;
  runs.forEach((r, i) => {
    if (r.landing) return box(r.x, r.z, rise * k);
    const side = sh && (sh.side ?? (r.dir[1] === 'x' ? 'front' : 'left'));
    let lo = Infinity, hi = -Infinity;
    for (const st of stepRects(r, counts[i])) {
      const h = rise * ++k;
      if (!sh || Y + h < sh.h + 0.45) {
        box(st.x, st.z, h);
        continue;
      }
      const [x0, x1] = st.x, [z0, z1] = st.z, d = sh.d;
      const [band, rest] = side === 'front' ? [[st.x, [z1 - d, z1]], [st.x, [z0, z1 - d]]] : side === 'back' ? [[st.x, [z0, z0 + d]], [st.x, [z0 + d, z1]]]
        : side === 'left' ? [[[x0, x0 + d], st.z], [[x0 + d, x1], st.z]] : [[[x1 - d, x1], st.z], [[x0, x1 - d], st.z]];
      box(rest[0], rest[1], h);
      box(band[0], band[1], h, sh.h);
      const [a0, a1] = r.dir[1] === 'x' ? st.x : st.z;
      lo = Math.min(lo, a0), (hi = Math.max(hi, a1));
    }
    if (hi - lo < 1.2) return;
    const along = r.dir[1] === 'x', c = (lo + hi) / 2;
    const at = side === 'front' ? r.z[1] - sh.d / 2 : side === 'back' ? r.z[0] + sh.d / 2 : side === 'left' ? r.x[0] + sh.d / 2 : r.x[1] - sh.d / 2;
    const rot = { front: 0, back: Math.PI, left: -R90, right: R90 }[side];
    g.add(bookshelf(M, { x: along ? c : at, y: Y, z: along ? at : c, w: hi - lo - 0.1, h: sh.h - Y - 0.02, d: sh.d, rot }));
  });
}
// the shaft's rectangles in the level (for the floor and the block under it to leave open)
function pitsOf(L) {
  const out = [];
  for (const r of L.rooms) {
    if (r.kind === 'void') out.push({ x0: r.x[0] + T / 2, x1: r.x[1] - T / 2, z0: r.z[0] + T / 2, z1: r.z[1] - T / 2, room: r, floor: r.o.floorBelow });
    else if (r.o.down) {
      const f = flightRect(r.o.down);
      out.push({ x0: r.x[0] + f.x0, x1: r.x[0] + f.x1, z0: r.z[0] + f.z0, z1: r.z[0] + f.z1, room: r, floor: r.o.down.floor });
    }
  }
  return out;
}
function downFlight(g, M, r, ctx, depth) {
  const spec = r.kind === 'void' ? null : r.o.down;
  const f = spec ? flightRect(spec) : { x0: T / 2, x1: ctx.W - T / 2, z0: T / 2, z1: ctx.D - T / 2 };
  if (spec) {
    const runs = flightRuns(spec);
    const counts = runs.map((q) => (q.landing ? 0 : Math.max(1, Math.round(((q.dir[1] === 'x' ? q.x[1] - q.x[0] : q.z[1] - q.z[0]) / TREAD)))));
    const N = counts.reduce((a, b) => a + b, 0) || 1;
    const rise = (spec.storey ?? STOREY) / N;
    let k = 0;
    const box = (x, z, h) => g.add(named(blk(M.stair, x, [-depth, Math.max(-depth + 0.06, Y - h)], z, 0.02), 'stairDown'));
    runs.forEach((q, i) => {
      if (q.landing) return box(q.x, q.z, rise * k);
      for (const st of stepRects(q, counts[i])) box(st.x, st.z, rise * ++k);
    });
  }
  // a low parapet on the shaft's open sides: not along a wall, not where the flight starts down
  const first = spec ? flightRuns(spec)[0] : null;
  const entry = first && !first.landing ? { '+x': 'x0', '-x': 'x1', '+z': 'z0', '-z': 'z1' }[first.dir] : null;
  const edges = [
    ['z0', 'back', [f.x0, f.x1], f.z0], ['z1', 'front', [f.x0, f.x1], f.z1],
    ['x0', 'left', [f.z0, f.z1], f.x0], ['x1', 'right', [f.z0, f.z1], f.x1],
  ];
  const t = 0.12, hp = 1.0;
  for (const [key, side, [a0, a1], at] of edges) {
    if (key === entry) continue;
    const toWall = side === 'back' ? at : side === 'front' ? ctx.D - at : side === 'left' ? at : ctx.W - at;
    if (toWall < T / 2 + 0.15 && ctx.hasWall(side, a0, a1)) continue;
    const x = key[0] === 'z' ? [a0, a1] : key === 'x0' ? [at - t, at] : [at, at + t];
    const z = key[0] === 'x' ? [a0, a1] : key === 'z0' ? [at - t, at] : [at, at + t];
    if (r.o.rail !== 'bronze') {
      g.add(named(blk(M.cream, x, [0, Y + hp], z, 0.02), 'guard'));
      continue;
    }
    // r.o.rail 'bronze': a slim bronze rail (a top rail on thin posts) instead of the cream parapet (청담)
    const br = (M.bronzeRail ??= dayMat(0x7d6648, 'top', { roughness: 0.45, metalness: 0.2 }));
    const rl = new THREE.Group();
    const mid = key[0] === 'z' ? (z[0] + z[1]) / 2 : (x[0] + x[1]) / 2, q = 0.04;
    const bar = (b0, b1, y0, y1) => rl.add(key[0] === 'z' ? blk(br, [b0, b1], [y0, y1], [mid - q, mid + q], 0) : blk(br, [mid - q, mid + q], [y0, y1], [b0, b1], 0));
    bar(a0, a1, Y + hp - 0.08, Y + hp);
    const n = Math.max(1, Math.round((a1 - a0) / 1.0));
    for (let j = 0; j <= n; j++) {
      const p = a0 + 0.05 + ((a1 - a0 - 0.1) * j) / n;
      bar(p - 0.03, p + 0.03, 0, Y + hp - 0.04);
    }
    g.add(named(rl, 'guard'));
  }
}

// ── furnishing a room ─────────────────────────────────────────────────────────
// furnish one room into `parent`, in world coordinates of its level. ctx0: { close, H, sides (layout.js roomSides), room
// (the plan's room, for a close-up whose frame is cropped), pitDepth }. Returns the room's furniture group and context.
function furnish(parent, r, M, ctx0) {
  const w = r.x[1] - r.x[0], d = r.z[1] - r.z[0];
  const g = new THREE.Group();
  const left = r.o.face === 'left';
  M.cur = r.kind;
  const loc = ctx0.sides
    ? localSides(ctx0.sides, ctx0.room ?? r, { close: ctx0.close, w, d })
    : { W: left ? d : w, D: left ? w : d, gaps: [], walls: null };
  const ctx = roomCtx({ ...loc, close: !!ctx0.close, H: ctx0.H ?? HC, kind: r.kind, id: r.id });
  ctx.wf = ctx0.close ? 0 : T / 2;
  F[r.kind]?.(g, ctx.W, ctx.D, M, r.o, ctx);
  if (r.o.omit) for (const k of g.children.slice()) if (r.o.omit.includes(k.userData.piece)) g.remove(k);
  keepClear(g, ctx);
  if (!ctx0.close && !left) {
    if (r.o.up) upFlight(g, M, r.o.up, ctx);
    if (r.o.down || r.kind === 'void') downFlight(g, M, r, ctx, ctx0.pitDepth ?? 2);
  }
  if (left) {
    g.rotation.y = Math.PI / 2; // the room's frame: its back wall is the world's left wall
    g.position.set(r.x[0], 0, r.z[1]);
  } else g.position.set(r.x[0], 0, r.z[0]);
  parent.add(g);
  return { g, ctx };
}

// the boxes of a slab x0..x1 by z0..z1 with rectangular holes left open
function boxesAround([x0, x1], [z0, z1], holes) {
  const hs = holes.filter((h) => h.x1 > x0 && h.x0 < x1 && h.z1 > z0 && h.z0 < z1);
  if (!hs.length) return [[[x0, x1], [z0, z1]]];
  const cut = (lo, hi, vals) => [...new Set([lo, hi, ...vals.filter((v) => v > lo && v < hi)])].sort((a, b) => a - b);
  const xs = cut(x0, x1, hs.flatMap((h) => [h.x0, h.x1])), zs = cut(z0, z1, hs.flatMap((h) => [h.z0, h.z1]));
  const out = [];
  for (let j = 0; j < zs.length - 1; j++) {
    let run = null;
    for (let i = 0; i < xs.length - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
      if (hs.some((h) => cx > h.x0 && cx < h.x1 && cz > h.z0 && cz < h.z1)) {
        if (run) out.push(run);
        run = null;
      } else if (run) run[0][1] = xs[i + 1];
      else run = [[xs[i], xs[i + 1]], [zs[j], zs[j + 1]]];
    }
    if (run) out.push(run);
  }
  return out;
}

function floorSlab(mat, [x0, x1], [z0, z1], holes = []) {
  if (holes.length) {
    const g = new THREE.Group();
    for (const [xr, zr] of boxesAround([x0, x1], [z0, z1], holes)) g.add(floorSlab(mat, xr, zr));
    return g;
  }
  if (mat.map) return K.jblk(mat, [x0, x1], [0, Y], [z0, z1], 0);
  return K.jblk(mat, [x0, x1], [0, Y], [z0, z1], 0);
}

function floorMat(M, kind) {
  return { wood: M.floorWood, stone: M.floorStone, deck: M.deck, gravel: M.gravel, terracotta: M.floorTerracotta, cork: M.floorCork }[kind] ?? M.floorWood;
}

// the floor's albedo luminance (linear): light floors get a weaker sun beam, so the patch stays below the bone colour
function floorLuma(pal, kind) {
  const hex = kind === 'stone' ? (pal.terrazzo ? new THREE.Color(pal.terrazzo.base).getHex() : pal.stone) : pal[{ wood: 'wood', terracotta: 'terracotta', cork: 'cork', deck: 'deck', gravel: 'gravel' }[kind] ?? 'wood'];
  const c = new THREE.Color(hex ?? 0x8f8069);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

// ── cutaway walls from the room grid (layout.js levelLinks: the runs, with the doors cut in) ──
function gridWalls(L, M, lk = levelLinks(L)) {
  const g = new THREE.Group();
  for (const r of lk.runs) {
    const s = r.s - (r.freeS ? 0 : T / 2), e = r.e + (r.freeE ? 0 : T / 2);
    if (e - s < 0.05) continue;
    const across = [r.line - T / 2, r.line + T / 2];
    const m = r.axis === 'z' ? blk(M.block, across, [0, r.h], [s, e], 0.03) : blk(M.block, [s, e], [0, r.h], across, 0.03);
    m.userData.wall = true;
    g.add(m);
  }
  // a stone sill across every doorway to outside (the 현관문) or out to a garden or terrace
  for (const d of lk.gaps) {
    if (d.kind !== 'exit' && !isOutdoor(lk.kindOf[d.a]) && !isOutdoor(lk.kindOf[d.b])) continue;
    const across = [d.line - T / 2, d.line + T / 2];
    g.add(d.axis === 'z' ? blk(M.floorStone, across, [0, Y], [d.g0, d.g1], 0) : blk(M.floorStone, [d.g0, d.g1], [0, Y], across, 0));
  }
  // a steel-framed glass slider (a door with glass: true, or 'end' to stack the leaves at that end; 성수's study door):
  // two leaves in the wall, one slid open over the other, cut flat with the walls; they count as wall for the checker
  for (const d of lk.gaps) {
    if (!d.spec?.glass) continue;
    const lw = (d.g1 - d.g0) / 2 + 0.05, a0 = d.spec.glass === 'end' ? d.g1 - lw : d.g0, a1 = a0 + lw, h = d.h;
    for (const off of [-0.07, 0.07]) {
      const part = (mat, p0, p1, y0, y1, t) => {
        const c = [d.line + off - t / 2, d.line + off + t / 2];
        const m = d.axis === 'z' ? blk(mat, c, [y0, y1], [p0, p1], 0) : blk(mat, [p0, p1], [y0, y1], c, 0);
        m.userData.wall = true;
        g.add(m);
        return m;
      };
      part(M.glass, a0 + 0.05, a1 - 0.05, 0.1, h, 0.03).castShadow = false;
      for (const [p0, p1] of [[a0, a0 + 0.1], [a1 - 0.1, a1]]) part(M.ink, p0, p1, 0, h, 0.09);
      for (const [y0, y1] of [[0, 0.14], [1.75, 1.85]]) part(M.ink, a0, a1, y0, y1, 0.09);
    }
  }
  return g;
}

// ── 01: the whole home as a cutaway model ────────────────────────────────
function buildOverview(scene, M, P, params, slug) {
  const add = (...o) => o.forEach((x) => x && scene.add(x));
  const az = ((Number(params.get('az') ?? 37)) * Math.PI) / 180;
  const box = new THREE.Box3();
  const built = { levels: [] };
  for (const L of P.levels) {
    const [ox, oy, oz] = L.at ?? [0, 0, 0];
    const lk = levelLinks(L);
    const lv = new THREE.Group();
    lv.position.set(ox, oy, oz);
    // the plate under the level (and on the ground level the plinth), open where a stair void goes down through it
    const holes = pitsOf(L);
    const bottom = oy === 0 ? GROUND : GROUND - oy;
    const pitDepth = Math.min(3.2, -bottom - 0.25);
    const rr = holes.length ? 0 : 0.04;
    if (oy === 0) {
      for (const [xr, zr] of boxesAround([-T, L.W + T], [-T, L.D + T], holes)) lv.add(blk(M.plate, xr, [-1.2, 0], zr, rr));
      for (const [xr, zr] of boxesAround([-T - 1.2, L.W + T + 1.2], [-T - 1.2, L.D + T + 1.2], holes)) lv.add(blk(M.floor, xr, [GROUND, -1.2], zr, rr));
    } else {
      for (const [xr, zr] of boxesAround([-T, L.W + T], [-T, L.D + T], holes)) lv.add(blk(M.plate, xr, [bottom, 0], zr, rr)); // a clay block from the ground up
    }
    for (const h of holes) lv.add(blk(h.floor ? floorMat(M, h.floor) : M.plate, [h.x0, h.x1], [bottom, -pitDepth], [h.z0, h.z1], 0)); // the shaft's floor
    const groups = new Map();
    for (const r of L.rooms) {
      if (r.kind !== 'void') lv.add(floorSlab(floorMat(M, r.floor), r.x, r.z, holes.filter((h) => h.room === r)));
      const { g } = furnish(lv, r, M, { close: false, H: HC, sides: roomSides(r, lk), pitDepth });
      groups.set(r.id, g);
    }
    const walls = gridWalls(L, M, lk);
    lv.add(walls);
    add(lv);
    built.levels.push({ L, at: [ox, oy, oz], lk, groups, walls });
    box.union(new THREE.Box3(new THREE.Vector3(ox - T - 1.2, GROUND, oz - T - 1.2), new THREE.Vector3(ox + L.W + T + 1.2, oy + HC, oz + L.D + T + 1.2)));
  }
  for (const k of P.links ?? []) add(flight(M.stair, { ...k, base: GROUND }));
  // the plan checker (&check=1): window.__planCheck; &zones=1 also lays every link's clearance zone on the floor
  // (green: clear; red: something stands in it or the way is under 80 cm)
  if (params.get('check')) {
    scene.updateMatrixWorld(true);
    const report = planCheck({ slug, P, built });
    window.__planCheck = report;
    if (params.get('zones')) {
      for (const k of report.links) {
        const z = k.zone, bad = !k.ok || (k.kind !== 'open' && k.blockers.length);
        const m = new THREE.Mesh(new THREE.BoxGeometry(z.x1 - z.x0, 0.04, z.z1 - z.z0), new THREE.MeshBasicMaterial({ color: bad ? 0xd0453a : k.kind === 'open' ? 0x6a9fd0 : 0x3fae6a, transparent: true, opacity: 0.75, depthWrite: false }));
        m.position.set((z.x0 + z.x1) / 2, z.y + Y + 0.05, (z.z0 + z.z1) / 2);
        m.userData.ghost = true;
        m.renderOrder = 2;
        add(m);
      }
    }
  }
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2 + 4;
  const cd = center.x * Math.sin(az) + center.z * Math.cos(az);
  add(dayGround(600, GROUND, { az, d0: cd - radius * 1.6, d1: cd + radius * 0.9 }));
  const lights = dayLights(scene, { center, radius, sunDir: SUN_FRONT, unit: 2.5 });
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  frameCamera(camera, box, {
    aspect: innerWidth / innerHeight,
    az,
    el: ((Number(params.get('el') ?? 38)) * Math.PI) / 180,
    fill: Number(params.get('fill') ?? P.fill ?? 0.86),
    dx: Number(params.get('dx') ?? 0),
    dy: Number(params.get('dy') ?? 0),
  });
  return { camera, jitters: [lights.jitter], samples: params.get('check') ? 1 : 48, ...DAY_OUT };
}

// the sun (toward it): from the viewer's upper left, through the left walls' windows; for a room lit only through its
// back wall (garden doors), from behind on the left, so the light falls in through them
const SUN_FRONT = [-0.52, 0.7, 0.46];
const SUN_BACK = [-0.45, 0.72, -0.5];
// what every daylight still hands to stills.js accumulate(): the hero's tone curve, a faint vignette to the sage ground
const DAY_OUT = { tone: { exposure: DAY.exposure }, vignette: 0.2, edge: new THREE.Color(0xcfd9d1) };

// ── 02..: one room as a diorama ──────────────────────────────────────────
function defaultClose(kind, w, d) {
  const win = (f, width, v0, v1, arch = false) => {
    const a0 = Math.max(0.6, Math.min(d - width - 0.6, d * f));
    return { a0, a1: a0 + width, v0, v1, arch };
  };
  switch (kind) {
    case 'living': case 'family': return { left: [win(0.36, Math.min(3.6, d * 0.36), 0.9, 5.1)] };
    case 'kitchen': return { left: [win(0.42, Math.min(3.0, d * 0.3), 2.5, 5.1)] };
    case 'master': case 'room': case 'study': return { left: [win(0.46, Math.min(3.0, d * 0.32), 1.0, 5.0)] };
    case 'bath': return { left: [win(0.5, 1.6, 3.4, 5.4)] };
    default: return { left: [win(0.4, 2.4, 1.0, 5.0)] };
  }
}

function buildCloseup(scene, M, P, roomId, params) {
  const add = (...o) => o.forEach((x) => x && scene.add(x));
  const lvl = P.levels.find((L) => L.rooms.some((q) => q.id === roomId));
  const r = lvl?.rooms.find((q) => q.id === roomId);
  if (!r) throw new Error(`no room ${roomId}`);
  const w = r.close?.W ?? Math.min(r.x[1] - r.x[0], r.close?.maxW ?? 15), d = r.close?.D ?? Math.min(r.z[1] - r.z[0], r.close?.maxD ?? 11.5);
  const spec = { H: 6.4, key: 0.8, ...defaultClose(r.kind, w, d), ...(r.close ?? {}) };
  const H = spec.H;
  const sides = roomSides(r, levelLinks(lvl));
  // close.doorways: the room's doors in its two back walls drawn as openings (dark beyond), like the plan's
  if (spec.doorways) {
    const loc = localSides(sides, r, { close: true, w, d });
    const dh = Math.min(5.25, H - 0.9);
    spec.back = [...(spec.back ?? []), ...loc.gaps.filter((q) => q.side === 'back' && q.kind !== 'open').map((q) => ({ a0: q.a0, a1: q.a1, v0: 0, v1: dh }))];
    spec.leftDoors = loc.gaps.filter((q) => q.side === 'left' && q.kind !== 'open').map((q) => ({ a0: q.a0, a1: q.a1, v0: 0, v1: dh }));
    spec.left = [...(spec.left ?? []), ...spec.leftDoors];
  }
  const az = ((Number(params.get('az') ?? spec.az ?? 37)) * Math.PI) / 180;
  const cd = (w / 2) * Math.sin(az) + (d / 2) * Math.cos(az);
  add(dayGround(600, GROUND, { az, d0: cd - Math.max(w, d) * 1.3, d1: cd + Math.max(w, d) * 0.8 }));
  add(blk(M.plate, [-TC, w + 0.25], [-1.2, 0], [-TC, d + 0.25], 0.04));
  add(blk(M.floor, [-TC - 1.2, w + 1.45], [GROUND, -1.2], [-TC - 1.2, d + 1.45], 0.04));
  add(floorSlab(floorMat(M, r.floor), [0, w], [0, d]));

  // the two back walls
  // in the room's own plaster (STYLE walls), with white skirting; window frames, and linen curtains where the home has them
  const leftH = spec.leftH ?? H;
  const pl = roomWall(M, r.kind);
  add(wall(pl, { axis: 'z', at: -TC / 2, from: -TC, to: d, y1: leftH, t: TC, ops: spec.left ?? [] }));
  add(wall(pl, { axis: 'x', at: -TC / 2, from: -TC, to: w, y1: H, t: TC, ops: spec.back ?? [] }));
  if (r.kind !== 'bath') {
    add(PP.skirting(M, { len: w / S, x: w / 2, y: Y, z: 0, s: S }));
    add(PP.skirting(M, { len: d / S, x: 0, y: Y, z: d / 2, rot: R90, s: S }));
  }
  for (const op of spec.left ?? []) {
    if (op.v0 <= 0) continue;
    add(PP.windowFrame(M, { w: (op.a1 - op.a0) / S, h: (op.v1 - op.v0) / S, arch: op.arch, t: TC / S, x: 0, y: op.v0, z: (op.a0 + op.a1) / 2, rot: R90, s: S }));
    if (M.st.curtains?.includes(r.kind) && op.v1 < H - 0.6) {
      const ch = Math.min(H - 0.3, op.v1 + (op.arch ? (op.a1 - op.a0) / 2 : 0) + 0.45) / S;
      for (const [cz, cw] of [[op.a0 - 0.55, 0.5], [op.a1 + 0.55, 0.5]]) if (cz > 0.5 && cz < d - 0.5) add(PP.curtain(M, { w: cw, h: ch, folds: 4, x: 0, z: cz, rot: R90, s: S }));
    }
  }
  for (const op of spec.back ?? []) if (op.kind === 'day') add(PP.windowFrame(M, { w: (op.a1 - op.a0) / S, h: (op.v1 - op.v0) / S, t: TC / S, x: (op.a0 + op.a1) / 2, y: op.v0, z: 0, s: S }));

  // windows (in the left wall, and daylight doors in the back wall): a bright sky panel behind each; the sun falls in
  // through them (dayLights below), so the patches on the floor follow the openings' own shapes
  const jitters = [];
  const openings = [
    ...(spec.left ?? []).filter((op) => op.v0 > 0).map((op) => ({ ...op, axis: 'z' })),
    ...(spec.back ?? []).filter((op) => op.kind === 'day').map((op) => ({ ...op, axis: 'x' })),
  ];
  for (const op of openings) {
    const back = op.axis === 'x';
    add(windowGlow(M, { axis: op.axis, at: -TC / 2, a0: op.a0, a1: op.a1, v0: op.v0, v1: op.v1, arch: op.arch, t: TC, side: -1 }));
  }
  // lit only through the back wall: the sun comes from behind on the left
  const backLit = !openings.some((op) => op.axis === 'z') && openings.some((op) => op.axis === 'x');
  // doorways in the back wall: dark beyond, or warmly lit rooms beyond (kind 'lit'); glass: a steel-framed glass slider
  for (const op of spec.back ?? []) {
    if (op.kind === 'day') continue;
    const lit = op.kind === 'lit';
    const top = op.v1 + (op.arch ? (op.a1 - op.a0) / 2 : 0);
    const hb = op.deep ? top + 0.1 : Math.min(top + 0.4, H - 0.9); // a deep room stays low, so its ceiling never shows above the wall
    const dd = op.deep ?? 1.5; // how far the room beyond reaches
    const mat = lit ? M.warm : M.recess;
    add(blk(mat, [op.a0 - 0.9, op.a1 + 0.9], [0, hb], [-TC - dd, -TC - dd + 0.2], 0));
    for (const e of [op.a0 - 0.9, op.a1 + 0.7]) add(blk(mat, [e, e + 0.2], [0, hb], [-TC - dd, -TC], 0));
    add(blk(op.deep ? M.block : mat, [op.a0 - 0.9, op.a1 + 0.9], [hb - 0.2, hb], [-TC - dd, -TC], 0)); // a deep room's lid is clay: if a sliver shows over the wall it reads as wall
    if (op.deep) add(blk(floorMat(M, r.floor), [op.a0 - 0.9, op.a1 + 0.9], [-0.2, Y], [-TC - dd, -TC], 0));
    if (op.study) {
      // the study seen through the glass: a desk with its lamp against the far wall, a low shelf beside it
      // (the room stays shallow so its ceiling never shows above the wall)
      const dz = -TC - dd + 0.2 + 0.5;
      add(desk(M, { x: (op.a0 + op.a1) / 2 - 0.4, y: Y, z: dz, w: 2.6, d: 1.0, h: 1.85 }));
      add(mushroomLamp(M, { x: (op.a0 + op.a1) / 2 + 0.4, y: Y + 1.85, z: dz - 0.1, s: 0.4 }));
      add(bookshelf(M, { x: op.a1 - 0.2, y: Y, z: dz, w: 1.6, h: 2.0, d: 1.0 }));
    }
    if (op.glass) {
      // two sliding leaves: clear glass in a thin black steel frame, three muntins high
      const zg = -TC / 2;
      const gl = blk(M.ink, [op.a0, op.a1], [Y, op.v1], [zg - 0.03, zg + 0.03], 0);
      gl.material = M.glass;
      gl.castShadow = false;
      add(gl);
      const mid = (op.a0 + op.a1) / 2;
      for (const a of [op.a0 + 0.06, mid, op.a1 - 0.06]) add(blk(M.ink, [a - 0.06, a + 0.06], [Y, op.v1], [zg - 0.07, zg + 0.07], 0));
      for (const y of [Y + 0.06, op.v1 * 0.36, op.v1 * 0.68, op.v1 - 0.06]) add(blk(M.ink, [op.a0, op.a1], [y - 0.05, y + 0.05], [zg - 0.07, zg + 0.07], 0));
    }
  }
  // doorways in the left wall (close.doorways): the same dark room beyond, turned to the left wall
  for (const op of spec.leftDoors ?? []) {
    const hb = Math.min(op.v1 + 0.4, H - 0.9), dd = 1.5;
    add(blk(M.recess, [-TC - dd, -TC - dd + 0.2], [0, hb], [op.a0 - 0.9, op.a1 + 0.9], 0));
    for (const e of [op.a0 - 0.9, op.a1 + 0.7]) add(blk(M.recess, [-TC - dd, -TC], [0, hb], [e, e + 0.2], 0));
    add(blk(M.recess, [-TC - dd, -TC], [hb - 0.2, hb], [op.a0 - 0.9, op.a1 + 0.9], 0));
  }
  if (lit(spec)) M.warm.emissiveIntensity = 0.3;

  furnish(scene, { ...r, x: [0, w], z: [0, d] }, M, { close: true, H, sides, room: r });

  // double-height living: a mezzanine slab in the back-left corner (clear of the arched windows), reached by a
  // stair that climbs along the back wall toward it; the sofa floats in front (close.sofaZ)
  if (spec.mezz) {
    const mx = 6, mz = 3.0, my = 7.4, n = 12, run = 0.55;
    add(blk(M.stair, [0, mx], [my - 0.55, my], [0, mz], 0.03));
    if (spec.mezzRail === 'bronze') {
      // close.mezzRail 'bronze' (청담): a slim bronze rail along the mezzanine's edge instead of the cream parapet
      const br = (M.bronzeRail ??= dayMat(0x7d6648, 'top', { roughness: 0.45, metalness: 0.2 }));
      const zr = mz - 0.06;
      add(rod(br, new THREE.Vector3(0, my + 1.1, zr), new THREE.Vector3(mx, my + 1.1, zr), 0.045, 0.045, 8));
      for (let x = 0.35; x < mx - 0.1; x += 0.5) add(rod(br, new THREE.Vector3(x, my, zr), new THREE.Vector3(x, my + 1.1, zr), 0.022, 0.022, 6));
    } else add(blk(M.cream, [0, mx], [my, my + 1.1], [mz - 0.12, mz], 0.02));
    if (spec.underShelf) {
      // close.underShelf (청담): a low bookshelf built in under the flight's high end, its face flush with the flight's
      // open side; the steps over it rest on it
      const sh = 2.0, sd = 1.0, z0 = 0.05, z1 = 0.05 + 2.4, rs = (my - Y) / n;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < n; i++) {
        const t = Y + rs * (i + 1), x1 = mx + (n - i) * run, x0 = x1 - run;
        if (t < sh + 0.45) add(blk(M.stair, [x0, x1], [Y, t], [z0, z1], 0.03));
        else {
          add(blk(M.stair, [x0, x1], [Y, t], [z0, z1 - sd], 0.03), blk(M.stair, [x0, x1], [sh, t], [z1 - sd, z1], 0.03));
          lo = Math.min(lo, x0), (hi = Math.max(hi, x1));
        }
      }
      add(bookshelf(M, { x: (lo + hi) / 2, y: Y, z: z1 - sd / 2, w: hi - lo - 0.1, h: sh - Y - 0.02, d: sd }));
    } else add(flight(M.stair, { x: mx + n * run, z: 0.05, base: Y, y0: Y, top: my, n, run, width: 2.4, axis: 'x', sign: -1 }));
    // a slim bronze handrail on the open side of the flight, on posts every second step
    const bronze = dayMat(0x7d6648, 'top', { roughness: 0.45, metalness: 0.2 });
    const zr = 0.05 + 2.4 - 0.12, hr = 2.3, rise = (my - Y) / n;
    add(rod(bronze, new THREE.Vector3(mx + n * run - 0.3, Y + rise + hr, zr), new THREE.Vector3(mx, my + hr, zr), 0.045, 0.045, 8));
    for (let i = 0; i < n; i += 2) {
      const x = mx + (n - i) * run - run / 2, y = Y + rise * (i + 1);
      add(rod(bronze, new THREE.Vector3(x, y, zr), new THREE.Vector3(x, y + hr - (run / 2) * (rise / run), zr), 0.025, 0.025, 6));
    }
  }

  const lights = dayLights(scene, {
    center: new THREE.Vector3(w / 2, H / 3, d / 2),
    radius: Math.max(w, d) * 0.85 + H * 0.6,
    sunDir: backLit ? SUN_BACK : SUN_FRONT,
    unit: 2.5,
  });
  jitters.unshift(lights.jitter);
  const box = new THREE.Box3(new THREE.Vector3(-TC, -1.2, -TC), new THREE.Vector3(w + 0.25, H, d + 0.25));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  frameCamera(camera, box, {
    aspect: innerWidth / innerHeight,
    az,
    el: ((Number(params.get('el') ?? spec.el ?? 30)) * Math.PI) / 180,
    fill: Number(params.get('fill') ?? spec.fill ?? 0.8),
    dx: Number(params.get('dx') ?? 0),
    dy: Number(params.get('dy') ?? spec.dy ?? 0),
  });
  return { camera, jitters, samples: 48, ...DAY_OUT };
}

const lit = (spec) => (spec.back ?? []).some((o) => o.kind === 'lit');

export async function buildHome(scene, params) {
  const slug = params.get('slug');
  const shotN = params.get('shot') ?? '01';
  const P = await loadPlan(slug);
  const shot = PROJECTS.find((p) => p.slug === slug)?.shots.find((s) => s.n === shotN);
  const roomId = params.get('room') ?? shot?.room ?? 'overview';
  const M = makeHomeMaterials(P.style ?? slug, P.pal); // P.style: borrow another home's interior style (plans/_example.js)
  CUR = M;
  // the furniture library (../3d/models.js), loaded in full before the home is built (?models=0: drawn props only)
  const lib = await loadLibrary({ names: MODELS, off: params.get('models') === '0' }).settled;
  M.lib = lib.snapshot();
  return roomId === 'overview' ? buildOverview(scene, M, P, params, slug) : buildCloseup(scene, M, P, roomId, params);
}
