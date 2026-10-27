// 성수동 아파트 · 34평형 · 전용 84㎡: the home's plan for the stills (../homes.js builds it; ./room.js documents the shape, the door and
// stair syntax and the per-room options). Units: 1 = 40 cm; rooms on a 0.5 grid; back (min z) and left (min x) are
// away from the viewer.
// The plan (2026-10-27): a corner living room (windows on its left and front walls) with the merged study behind it,
// through the steel-framed glass slider; the kitchen open to the living room, the 다용도실 behind it; the 현관 and a short
// hall at the back, the common bath off the hall; the master suite on the right (dress room and bath off its back
// wall). 11.6 × 7.8 m, 90.5 m² indoors: 전용 84㎡ with the balcony extended.
import { room } from './room.js';

export default {
  // the size the page states (final/data/portfolio.mjs): the checker (check-plans.mjs) compares the rooms' area to it
  target: { m2: 84, label: '전용 84㎡ (34평형)' },
  // smoked oak · plaster concrete · black steel
  pal: { wood: 0x75624d, woodDark: 0x5a4b3c, cream: 0xd5cdbd, sand: 0xc4b7a0, clay: 0xa3957e, cab: 0xbdb3a3, stone: 0xa9a297, stoneTop: 0x8f8a82, feature: 0x8a857d, table: 0x8f7a60, rug: 0x978d7c },
  levels: [{
    W: 29, D: 19.5,
    rooms: [
      room('entry', 'entry', [11, 15], [0, 4.5], 'stone'),
      room('hall', 'hall', [11, 15], [4.5, 11.5]),
      // the common bath: the shower in the back corner, the toilet on the left wall and the basin on the right wall, where
      // the cutaway's walls leave them in view
      room('bath', 'bath', [15, 19.5], [0, 7.5], 'stone', { shower: { corner: 'back-left' }, toilet: { wall: 'left', at: 3.75 }, vanity: { wall: 'right', at: 4.2 } }),
      // the 다용도실 off the kitchen: a washer and dryer, a tall cabinet
      room('util', 'pantry', [15, 21], [7.5, 11.5], 'stone', { laundry: true }),
      room('dress', 'dress', [19.5, 24.5], [0, 7.5]),
      room('mbath', 'bath', [24.5, 29], [0, 7.5], 'stone'),
      // the two small rooms became one study: two desks face to face, a long bookshelf, a plaster-concrete wall (panel:
      // the cutaway shows it too)
      room('study', 'study', [0, 11], [0, 8.5], 'wood', {
        layout: 'twin', panel: true,
        close: { az: 36, left: [{ a0: 3.2, a1: 6.0, v0: 1.0, v1: 5.0 }] },
      }),
      // the sofa stands with its back to the window wall; the steel-framed glass slider in the back wall shows the lit
      // study (the same opening as the plan's door, x 1.4..5.8); chair: the lounge chair in the cutaway too
      room('living', 'living', [0, 11], [8.5, 19.5], 'wood', {
        layout: 'side', chair: true,
        close: {
          az: 46, el: 30,
          left: [{ a0: 0.8, a1: 3.2, v0: 1.0, v1: 5.2 }],
          back: [{ a0: 1.4, a1: 5.8, v0: 0, v1: 5.0, kind: 'lit', glass: true, deep: 1.6, study: true }],
        },
      }),
      // the run with the sink, the hob (hob: on this short run too) and the tall unit (the fridge) on the back wall, the
      // plaster-concrete island; the close-up shows the part left of the 다용도실 door (W 7.5)
      room('kitchen', 'kitchen', [11, 21], [11.5, 19.5], 'wood', {
        kit: 'islandOnly', tall: 'right', hob: true,
        close: { W: 7.5, az: 52, el: 32, left: [{ a0: 3.4, a1: 6.0, v0: 2.5, v1: 5.1 }] },
      }),
      // the bed's head on the right (outer) wall: the back wall has the doors to the dress room and the bath
      room('master', 'master', [21, 29], [7.5, 19.5], 'wood', { bed: { wall: 'right', at: 7 } }),
    ],
    open: [['entry', 'hall'], ['hall', 'living'], ['kitchen', 'living']],
    doors: [
      ['entry', null, 13, 2.3, { side: 'back' }], // the front door (현관문)
      ['bath', 'hall', 6],
      ['util', 'kitchen', 19.6],
      ['study', 'living', 3.6, 4.4, { glass: true }], // the steel-framed glass slider, one leaf open
      ['master', 'kitchen', 13],
      ['dress', 'master', 22.6],
      ['mbath', 'master', 26.5],
    ],
  }],
};
