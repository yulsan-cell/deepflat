// 한남동 아파트 · 52평형 · 전용 129㎡: the home's plan for the stills (../homes.js builds it; ./room.js documents the shape, the door and
// stair syntax and the per-room options). Units: 1 = 40 cm; rooms on a 0.5 grid; back (min z) and left (min x) are
// away from the viewer.
//
// Re-planned 2026-10-27 as a real 52평형 flat: the front door (현관문) opens from the back into the 현관 and a corridor
// (복도, 1.2 m) that runs along the back rooms (다용도실, 방3, 욕실, 방2) and, through a door at its back-right corner,
// into the LDK. The LDK is one room, as the cover (02) shows it: the walnut kitchen run on its back wall, the long
// travertine island with stools, an oval walnut table in front of it, the bouclé sofa against the walnut wall (the wall
// that stood between living room and kitchen is gone). Off the LDK: 안방 on the left (its 드레스룸 and, through it, the
// 안방 욕실 behind it, the tub along the window wall, the outer left wall) and the 서재 on the right.
// 15.2 × 9.2 m = 139.8 m² (전용 129 + the extended balcony): LDK 8.2 × 5.0, 안방 4.2 × 5.0, 서재 2.8 × 5.0, 방2 and
// 방3 3.0 × 3.0, 안방 욕실 2.4 × 4.2, 드레스룸 1.8 × 4.2, 현관 1.8 × 3.0, 다용도실 1.4 × 3.0, 욕실 1.8 × 3.0.
// The LDK's dining table is the 'open' layout's o.dining (../homes.js, added for this home). Every door is at least
// 80 cm clear and kept free by the layouts: node final/stills/check-plans.mjs --only hannam-apartment reports it clean.
import { room } from './room.js';

export default {
  // the size the page states (final/data/portfolio.mjs): the checker (check-plans.mjs) compares the rooms' area to it
  target: { m2: 129, label: '전용 129㎡ (52평형)' },
  // walnut · travertine · bouclé
  pal: { wood: 0x564a3e, woodDark: 0x3f362e, cream: 0xdcd5c8, sand: 0xbcb2a2, clay: 0x9c9182, cab: 0x5a4636, stone: 0xbfb19a, stoneTop: 0xcbbb9c, feature: 0x5c4838, table: 0x5a4636, rug: 0x8a8275 },
  levels: [{
    W: 38, D: 23,
    rooms: [
      // the back: the master suite's bath and dressing room, the entry, the utility room, two bedrooms, the bath
      // the tub stands along the window wall (the outer left wall); the toilet beside the vanity on the back wall
      room('mbath', 'bath', [0, 6], [0, 10.5], 'stone', {
        big: true, tubWindow: true, wallMat: 'stone', toilet: { wall: 'back', at: 1.0 },
        close: { az: 34, el: 32, left: [{ a0: 3.8, a1: 7.8, v0: 1.9, v1: 5.0 }] },
      }),
      room('dress', 'dress', [6, 10.5], [0, 10.5], 'wood', { omit: ['bench'] }),
      room('entry', 'entry', [10.5, 15], [0, 7.5], 'stone'),
      room('utility', 'pantry', [15, 18.5], [0, 7.5], 'stone'), // 다용도실
      room('bed3', 'room', [18.5, 26], [0, 7.5], 'wood', { wardrobe: { wall: 'front', at: 1.7, len: 2.6 } }),
      // the toilet on the back wall, where the cutaway shows it
      room('bath', 'bath', [26, 30.5], [0, 7.5], 'stone', { toilet: { wall: 'back', at: 'end' } }),
      room('bed2', 'room', [30.5, 38], [0, 7.5], 'wood', { wardrobe: { wall: 'front', at: 1.7, len: 2.6 } }),
      room('hall', 'hall', [10.5, 38], [7.5, 10.5]),
      // the front: 안방, the LDK, the study
      room('master', 'master', [0, 10.5], [10.5, 23]),
      // kitchen, dining and living in one room (the cover, 02, is its back-left 15 × 12); no pendants: the lights are
      // hidden in the ceiling
      room('living', 'living', [10.5, 31], [10.5, 23], 'wood', {
        feature: true, layout: 'open', dining: { x: 5.5, z: 9.7 }, omit: ['pendant'],
        close: { W: 15, D: 12, az: 40, el: 30, fill: 0.84, left: [{ a0: 1.4, a1: 4.0, v0: 2.5, v1: 5.3 }] },
      }),
      // its door (from the LDK) is drawn in the close-up's left wall, the window moved back to make room for it
      room('study', 'study', [31, 38], [10.5, 23], 'wood', {
        close: { doorways: true, left: [{ a0: 0.8, a1: 3.4, v0: 1.0, v1: 5.0 }] },
      }),
    ],
    open: [['entry', 'hall']],
    doors: [
      ['entry', null, 12.75, 2.4, { side: 'back' }], // the front door (현관문)
      ['living', 'hall', 29.7], // into the LDK from the corridor, past the sofa's end
      ['master', 'living', 17.05], // 안방 off the LDK, between the island and the table
      ['study', 'living', 16.05], // 서재 off the LDK, in the middle of its left wall
      ['master', 'dress', 9.25, 2.0], // 80 cm: the bed and both nightstands keep the rest of 안방's back wall
      ['dress', 'mbath', 9.0],
      ['utility', 'hall', 16.75],
      ['bed3', 'hall', 24.5],
      ['bath', 'hall', 27.3],
      ['bed2', 'hall', 36.25],
    ],
  }],
};
