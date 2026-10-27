// 반포동 아파트 · 41평형 · 전용 102㎡: the home's plan for the stills (../homes.js builds it; ./room.js documents the shape, the door and
// stair syntax and the per-room options). Units: 1 = 40 cm; rooms on a 0.5 grid; back (min z) and left (min x) are
// away from the viewer.
//
// Redrawn 2026-10-27 (the plan audit): a 4-bay 판상형 flat, 14.4 × 7.6 m = 109 m² of floor (전용 102㎡ and the extended
// balcony). The front row, by the windows: 작은방 bed3, 방 bed2, 거실, 안방. The back row: the 현관 with its front door in
// the back (corridor) wall and a built-in shoe wall, a 다용도실 (pantry), the shared bath, the corridor (hall) that leads
// from the 현관 past the two children's rooms to the kitchen-dining room, the 안방 욕실 and the 드레스룸.
// The way in: 현관 → hall → kitchen (open) → a 96 cm opening in the kitchen / living wall, at its left end → 거실 →
// 안방 (a door in the living room's right wall, near the windows) → 드레스룸 → 안방 욕실 (a walk-through closet).
// The project's change, in the overview too: the kitchen / living wall is a real wall now, and the oak built-ins stand
// in it (left of the sofa's lime-plaster wall), so the living floor holds only the sofa, the low table and the lamp;
// the children's rooms have their wardrobes built into a wall, the corridor and the 현관 floors stay empty.
import { room } from './room.js';

export default {
  // the size the page states (final/data/portfolio.mjs): the checker (check-plans.mjs) compares the rooms' area to it
  target: { m2: 102, label: '전용 102㎡ (41평형)' },
  // lime plaster · natural oak · beige limestone · brass
  pal: { wood: 0x5f4d3d, woodDark: 0x4a3b2f, cream: 0xd8cebc, sand: 0xc7b99f, clay: 0xa7967a, cab: 0xae9473, stone: 0xc9baa0, stoneTop: 0xcfc1a5, feature: 0xc4b9a6, table: 0x9d8466, rug: 0x9b8e79, brass: 0xa08857 },
  levels: [{
    W: 36, D: 19,
    rooms: [
      // the 현관: the front door in its back wall, the tall shoe cabinet built into its left wall, nothing on the floor
      room('entry', 'entry', [0, 5], [0, 6], 'stone', { bench: false }),
      // the 다용도실 (laundry and storage) beside the 현관, off the corridor
      room('pantry', 'pantry', [5, 7.5], [0, 6], 'stone'),
      // the shared bath: basin on the back wall, the toilet on the left wall beside it (a right-hand wall hides what
      // stands against it from the camera), a shower in the front-left corner, the door at the front-right
      room('bath', 'bath', [7.5, 13], [0, 6], 'stone', { toilet: { wall: 'left', at: 2.4 } }),
      // the corridor: no console, its floor left empty
      room('hall', 'hall', [0, 13], [6, 9.5], 'wood', { console: false }),
      room('kitchen', 'kitchen', [13, 25.5], [0, 9.5], 'wood', {
        kit: 'longTable', tall: 'right',
        close: { az: 28, left: [{ a0: 3.2, a1: 6.0, v0: 2.5, v1: 5.1 }] },
      }),
      // the 안방 욕실, through the dressing room: a shower in the back-left corner, the toilet on the left wall in front of
      // it, the free-standing tub along that wall nearer the front, the basin on the back wall
      room('mbath', 'bath', [25.5, 30.5], [0, 9.5], 'stone', { big: true, toilet: { wall: 'left', at: 3.75 }, tub: { wall: 'left', at: 6.55 } }),
      room('dress', 'dress', [30.5, 36], [0, 9.5], 'wood', { omit: ['bench'] }),
      // the children's rooms: the bed's head on the corridor wall, a desk by the window, the wardrobe built into the
      // left wall
      room('bed3', 'room', [0, 6.5], [9.5, 19], 'wood', { wardrobe: { wall: 'left', len: 2.6 }, shelf: false }),
      room('bed2', 'room', [6.5, 13], [9.5, 19], 'wood', { wardrobe: { wall: 'left', len: 2.6 }, shelf: false }),
      // built-ins set flush into the back (kitchen) wall, right of the opening's zone; lime plaster behind the sofa on the
      // right; the floor left almost empty: a sofa, a low table and a lamp only. The close-up draws the opening to the
      // dining room in its back wall (the door below, a0..a1 in the room's own frame), with the floor running on beyond it
      // (deep), so it reads as a way through and not as a hole
      room('living', 'living', [13, 25.5], [9.5, 19], 'wood', {
        feature: true, layout: 'bare',
        close: { az: 30, el: 31, left: [{ a0: 2.8, a1: 5.4, v0: 0.9, v1: 5.6 }], back: [{ a0: 0.225, a1: 2.625, v0: 0, v1: 5.25, deep: 1.5 }] },
      }),
      room('master', 'master', [25.5, 36], [9.5, 19]),
    ],
    open: [['entry', 'hall'], ['hall', 'kitchen']],
    doors: [
      ['entry', null, 3.4, 2.3, { side: 'back' }], // the front door (현관문), in the corridor wall of the building
      ['pantry', 'hall', 6.25],
      ['bath', 'hall', 11.725], // at the bath's front-right, clear of the shower
      ['bed3', 'hall', 5.225],
      ['bed2', 'hall', 11.725],
      ['living', 'kitchen', 14.425, 2.4], // the opening to the dining room, at the living room's back-left corner (x 13.225..15.625)
      ['living', 'master', 17.0], // near the windows: the sofa keeps the back of that wall
      ['master', 'dress', 34.725], // at the right end of the 안방's back wall, beside the bed and its nightstands
      ['dress', 'mbath', 5.05],
    ],
  }],
};
