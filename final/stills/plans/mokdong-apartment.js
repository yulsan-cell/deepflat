// 목동 아파트 · 25평형 · 전용 59㎡: the home's plan for the stills (../homes.js builds it; ./room.js documents the shape, the door and
// stair syntax and the per-room options). Units: 1 = 40 cm; rooms on a 0.5 grid; back (min z) and left (min x) are
// away from the viewer.
import { room } from './room.js';

export default {
  // the size the page states (final/data/portfolio.mjs): the checker (check-plans.mjs) compares the rooms' area to it
  target: { m2: 59, label: '전용 59㎡ (25평형)' },
  // white oak · linen
  pal: { wood: 0xb4a385, woodDark: 0x8a7a62, cream: 0xddd5c6, sand: 0xcabea7, clay: 0xa99a80, cab: 0xc6b89c, stone: 0xb7b0a3, feature: 0xbcae93, table: 0xbba98a, rug: 0xa59a87 },
  levels: [{
    W: 24, D: 16.5,
    rooms: [
      room('entry', 'entry', [0, 4.5], [0, 4], 'stone'),
      room('bath', 'bath', [0, 4.5], [4, 8.5], 'stone'),
      room('kitchen', 'kitchen', [4.5, 14], [0, 8.5], 'wood', {
        kit: 'round', table: { x: 5.4, z: 5.4, len: 2.8 },
        close: { az: 40, left: [{ a0: 3.6, a1: 6.0, v0: 2.5, v1: 5.1 }] },
      }),
      room('bed3', 'room', [14, 19], [0, 8.5]),
      room('mbath', 'bath', [19, 24], [0, 8.5], 'stone'),
      room('bed2', 'room', [0, 6.5], [8.5, 16.5]),
      // the balcony was taken into the living room: a wide, low window; the storage runs along one whole wall
      room('living', 'living', [6.5, 16], [8.5, 16.5], 'wood', {
        sofaLen: 4.6, layout: 'storage',
        close: { az: 33, left: [{ a0: 2.4, a1: 6.8, v0: 0.6, v1: 5.0 }] },
      }),
      room('master', 'master', [16, 24], [8.5, 16.5]),
    ],
    open: [['kitchen', 'living']],
    doors: [['entry', 'kitchen'], ['bath', 'kitchen'], ['bed2', 'living', 10.3], ['master', 'living', 10.3], ['bed3', 'living', 15], ['master', 'mbath', 21.5]],
  }],
};
