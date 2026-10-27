// 판교 단독주택 · 연면적 62평(공사 후) · 지상 2층: the home's plan for the stills (../homes.js builds it; ./room.js documents the shape, the door and
// stair syntax and the per-room options). Units: 1 = 40 cm; rooms on a 0.5 grid; back (min z) and left (min x) are
// away from the viewer.
// Redrawn 2026-10-27 to the stated size (연면적 205 m² over both floors; the opening over the living room is not floor
// area): an 11.2 x 10.4 m house with the gravel 마당 in front of it.
//   1층: the 현관 on the back (street) side, its front door in the back wall, a door to the kitchen, open to the stair hall
//   (the flight climbs along its left wall toward the back, as in the close-up; the way past it on the right); at the
//   flight's foot a hall open to the double-height living room, with the bathroom and the guest room off it; the
//   farmhouse kitchen-dining (terracotta, ochre plaster) behind the living room, with its 다용도실 (washer). The living
//   room's left wall is the house's outside wall (the close-up's floor-to-top window), its back wall a real wall (the
//   fir battens above the sofa) open to the kitchen only near its right end, under the upper floor (drawn in the
//   close-up); its front wall to the 마당 has the widened glass doors with the basalt stepping stones outside.
//   2층: the flight arrives at the back of the landing; a family study corner and a gallery along the void over the
//   living room (a low parapet, the fir battens up its back wall) lead to the master suite (bedroom, walk-in dressing
//   room, bath with tub, shower and toilet); two children's rooms over the 마당 and a shared bath. Both floors share plan
//   coordinates, so the flight (stair, up) and its void (landing, down) are at the same spot, and the void ('over') is
//   over the living room. 3 bedrooms + a guest room, 3 bathrooms, 1층 116.5 + 2층 89.6 = 206 m².
import { room } from './room.js';

export default {
  // the size the page states (final/data/portfolio.mjs): the checker (check-plans.mjs) compares the rooms' area to it
  target: { m2: 205, label: '연면적 62평 = 205㎡ (모든 층 합)' },
  // concrete-tone plaster · oak · Douglas fir · terracotta · ochre plaster
  pal: { block: 0x2e2e2c, wood: 0x9d8b6d, woodDark: 0x6c5d4b, cream: 0xd4ccbd, sand: 0xc2b6a1, clay: 0xa2957f, cab: 0xa69479, stone: 0x8e8c87, feature: 0x6b6a66, table: 0x8c7357, rug: 0x958b7b, deck: 0x75685a, gravel: 0x5a5852, stair: 0x9a886b, louver: 0xa88a66, terracotta: 0x9c7b5f, plaster: 0x9a8670 },
  fill: 0.93,
  levels: [
    {
      // 1층: the house 11.2 x 10.4 m (x 0..28, z 0..26), the 마당 3.2 m deep in front of it
      W: 28, D: 34,
      rooms: [
        // terracotta floor, ochre plaster, a long table with a bench (no island); its window is in the house's left wall
        room('kitchen', 'kitchen', [0, 16], [0, 12], 'terracotta', {
          kit: 'farm',
          close: { az: 46, el: 31, left: [{ a0: 5.6, a1: 8.0, v0: 2.6, v1: 5.1 }] },
        }),
        // the 현관 on the back (street) side: the front door in its back wall, a door to the kitchen, open to the stair hall
        room('entry', 'entry', [16, 21], [0, 6], 'stone', { bench: false }),
        room('utility', 'pantry', [16, 21], [6, 9.5], 'stone', { laundry: true }), // 다용도실: washer and dryer, off the kitchen
        room('bath1', 'bath', [16, 21], [9.5, 15.5], 'stone'),
        // the flight along the left wall, climbing toward the back (16 treads); the way past it on the right. The close-up's
        // arched window is high in that wall, above the 2층 floor, where the family study corner is on the other side
        room('stair', 'stair', [21, 28], [0, 15.5], 'stone', {
          up: { x: [0.25, 2.7], z: [2.5, 12.9], dir: '-z' },
          close: { H: 13, left: [{ a0: 7.2, a1: 8.8, v0: 7.6, v1: 11.4, arch: true }], key: 0.62, fill: 0.88, el: 26 },
        }),
        // part of the upper floor was taken out: the living room is two storeys high, its window runs to the floor
        room('living', 'living', [0, 16], [12, 26], 'wood', {
          layout: 'double',
          omit: ['bookshelf'],
          close: {
            H: 13, key: 0.72, el: 25, fill: 0.86, double: true, maxW: 16,
            left: [{ a0: 1.6, a1: 6.6, v0: 0.15, v1: 10.2 }],
            // the way through to the kitchen-dining, under what is left of the upper floor
            back: [{ a0: 11.1, a1: 13.9, v0: 0, v1: 5.25, deep: 1.5 }],
          },
        }),
        // the hall at the foot of the stair, open to the living room
        room('hall', 'hall', [16, 28], [15.5, 19.5], 'wood', { console: false }),
        room('guest', 'room', [16, 28], [19.5, 26], 'wood', { bed: { at: 'end' } }),
        room('garden', 'garden', [0, 28], [26, 34], 'gravel'),
      ],
      open: [['kitchen', 'living', [11, 14]], ['living', 'hall'], ['hall', 'stair'], ['entry', 'stair']],
      low: [['living', 'garden'], ['guest', 'garden']],
      doors: [
        ['entry', null, 18.5, 2.3, { side: 'back' }], // the front door (현관문)
        ['living', 'garden', 13.6, 4.2], // the widened glass doors out to the 마당 and its stepping stones
        ['entry', 'kitchen', 4.2],
        ['kitchen', 'utility', 7.75],
        ['bath1', 'hall', 18.5],
        ['guest', 'hall', 19.0],
      ],
    },
    {
      // 2층: the same plan coordinates as the 1층 (the house's footprint), the void over the living room at the front left
      at: [34, 2.4, -4], W: 28, D: 26,
      rooms: [
        room('master', 'master', [0, 9], [0, 12]),
        room('dress', 'dress', [9, 16], [0, 5]),
        room('mbath', 'bath', [9, 16], [5, 12], 'stone', { big: true }),
        room('bath2', 'bath', [16, 21], [0, 6], 'stone'),
        room('nook', 'study', [16, 21], [6, 15.5]),
        // where the flight arrives (at the back): its void, the way past it on the right
        room('landing', 'hall', [21, 28], [0, 15.5], 'wood', { down: { x: [0.25, 2.7], z: [2.5, 12.9], dir: '+z' }, console: false }),
        // the gallery along the void, behind a low parapet; the Douglas-fir battens up its back wall (the close-up's)
        room('gallery', 'hall', [0, 16], [12, 15.5], 'wood', { console: false, battens: { a0: 0.6, a1: 9.0 } }),
        room('over', 'void', [0, 16], [15.5, 26], 'wood', { floorBelow: 'wood' }),
        room('kids1', 'room', [16, 22], [15.5, 26], 'wood', { bed: { at: 'end' } }),
        room('kids2', 'room', [22, 28], [15.5, 26]),
      ],
      open: [['gallery', 'over'], ['gallery', 'nook'], ['nook', 'landing', [13, 15.5]]],
      doors: [
        ['master', 'gallery', 7.3],
        ['master', 'dress', 3.7],
        ['dress', 'mbath', 12.5],
        ['bath2', 'nook', 18.5],
        ['kids1', 'nook', 17.3],
        ['kids2', 'landing', 26.5],
      ],
    },
  ],
};
