// 청담동 펜트하우스 · 78평형 · 복층: the home's plan for the stills (../homes.js builds it; ./room.js documents the shape, the door and
// stair syntax and the per-room options). Units: 1 = 40 cm; rooms on a 0.5 grid; back (min z) and left (min x) are
// away from the viewer.
// Redrawn 2026-10-27 to the stated size (전용 about 195 m² over both floors) with a real penthouse's rooms: lower floor a
// front door into the 현관, an open stair hall (the walls round the stair taken out) between the kitchen and the
// double-height living room, the kitchen with its 다용도실, three bedrooms and two baths; upper floor the master suite
// (bedroom, dressing room, bath with tub, shower and toilet), a study with glass doors to the terrace, and the gallery
// where the flight arrives, open over the living room behind a slim bronze rail. Both floors share plan coordinates, so
// the flight (stairs, up) and its void (landing, down) are at the same spot, and the void 'over' is over the living room.
// Options this home adds to ../homes.js (each off unless asked for): up.shelf (the low bookshelf built in under the
// flight), rail: 'bronze' (a slim bronze rail instead of the cream parapet round a void), close.underShelf and
// close.mezzRail (the same two in the living room's close-up).
import { room } from './room.js';

export default {
  // the size the page states (final/data/portfolio.mjs): the checker (check-plans.mjs) compares the rooms' area to it
  target: { m2: 195, label: '78평형 복층: 전용 약 195㎡ (두 층 합, 공급의 약 76%)' },
  // dark walnut · marble-look stone
  pal: { wood: 0x473b31, woodDark: 0x382e26, cream: 0xd9d3c8, sand: 0xc6beb0, clay: 0xa39a8b, cab: 0x473b31, stone: 0xc4bfb6, stoneTop: 0xd6d1c8, feature: 0xb5afa5, table: 0xd0cbc2, rug: 0x9c9487 },
  fill: 0.93,
  levels: [
    {
      // lower floor: 13.6 x 10.4 m
      W: 34, D: 26,
      rooms: [
        // back row: the kitchen behind the stair, its utility room, the 현관 (front door in its back wall), a bedroom
        room('kitchen', 'kitchen', [0, 15], [0, 9], 'wood', { island: {} }),
        room('utility', 'pantry', [15, 19], [0, 9], 'stone'),
        room('entry', 'entry', [19, 24], [0, 9], 'stone'),
        room('bed4', 'room', [24, 34], [0, 9]),
        // the stair hall, open to the kitchen (beside the flight's top), the 현관, the hall and the living room: the flight
        // climbs along its back wall toward the left, a low bookshelf built in under its high end
        room('stairs', 'stair', [0, 24], [9, 14], 'stone', { up: { x: [5, 13.5], z: [0.25, 2.65], dir: '-x', shelf: true } }),
        room('hall', 'hall', [24, 34], [9, 14]),
        // the double-height living room (grey marble floor); its close-up shows the open stair on its back wall
        room('living', 'living', [0, 16], [14, 26], 'stone', {
          feature: true, sofaX: 9.5, sofaLen: 6.2,
          close: {
            H: 13.5, key: 0.7,
            left: [{ a0: 3.2, a1: 5.4, v0: 1.0, v1: 8.6, arch: true }, { a0: 7.0, a1: 9.2, v0: 1.0, v1: 8.6, arch: true }],
            mezz: true, mezzRail: 'bronze', underShelf: true, sofaZ: 5.5,
          },
        }),
        room('bed2', 'room', [16, 22.5], [14, 26]),
        // the shared bath off the hall, and bed2's own bath: each a basin, a toilet and a glass shower clear of its door
        room('bath', 'bath', [22.5, 27.5], [14, 20], 'stone', { vanity: { wall: 'back', at: 'start' }, toilet: { wall: 'left', at: 3.8 }, shower: { corner: 'front-right' } }),
        room('bath2', 'bath', [22.5, 27.5], [20, 26], 'stone', { vanity: { wall: 'back', at: 'start', len: 2.2 }, toilet: { wall: 'right', at: 'start' }, shower: { corner: 'front-right' } }),
        room('bed3', 'room', [27.5, 34], [14, 26]),
      ],
      open: [['kitchen', 'stairs', [0, 4.5]], ['entry', 'stairs'], ['stairs', 'hall'], ['stairs', 'living']],
      doors: [
        ['entry', null, 21.5, 2.3, { side: 'back' }], // the front door (현관문)
        ['kitchen', 'utility', 2.0],
        ['bed2', 'stairs', 21.0],
        ['bed4', 'hall', 26.5],
        ['bath', 'hall', 26.2],
        ['bed3', 'hall', 32.3],
        ['bath2', 'bed2', 24.5],
      ],
    },
    {
      // upper floor, over the left part of the lower one (same plan coordinates)
      at: [39, 2.4, -2], W: 24, D: 26,
      rooms: [
        room('master', 'master', [0, 12], [0, 9], 'wood', { bedX: 6.6 }),
        room('dress', 'dress', [12, 16], [0, 9], 'wood', { walls: ['back', 'front'] }),
        room('mbath', 'bath', [16, 24], [0, 9], 'stone', { big: true }),
        // the gallery: where the flight arrives (its void, the way down toward the right), open over the living room
        room('landing', 'hall', [0, 16], [9, 14], 'wood', { down: { x: [5, 13.5], z: [0.25, 2.65], dir: '+x' }, console: false, rail: 'bronze' }),
        room('study', 'study', [16, 24], [9, 17]),
        // over the living room: its double height, a slim bronze rail along the gallery
        room('over', 'void', [0, 16], [14, 26], 'wood', { floorBelow: 'stone', rail: 'bronze' }),
        room('terrace', 'terrace', [16, 24], [17, 26], 'deck'),
      ],
      open: [['landing', 'over']],
      low: [['over', 'terrace']],
      doors: [
        ['master', 'landing', 2.5],
        ['master', 'dress', 6.0],
        ['dress', 'mbath', 6.0],
        ['landing', 'study', 12.7],
        ['study', 'terrace', 20, 3.0], // glass doors out to the terrace
      ],
    },
  ],
};
