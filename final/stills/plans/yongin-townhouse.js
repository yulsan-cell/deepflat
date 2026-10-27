// 용인 타운하우스 · 54평형 · 지하 1층~지상 2층: the home's plan for the stills (../homes.js builds it; ./room.js documents the shape, the door and
// stair syntax and the per-room options). Units: 1 = 40 cm; rooms on a 0.5 grid; back (min z) and left (min x) are
// away from the viewer.
//
// Redesigned 2026-10-27 as one stacked building: the three floors share plan coordinates (x from the left wall, z from
// the back wall), so the stairs line up. Two straight flights (16 treads of 26 cm, 2.8 m floor to floor) stand side by
// side at the right:
//   lane A (x 17.3..19.7): 지하 → 1층, climbing toward the front; on 1층 it is the stair void beside the glass wall
//                          (sill-high in the cutaway) that lets the living room's light down to the basement stair
//   lane B (x 21.2..23.6): 1층 → 2층, climbing toward the back from the 1층 stair hub in front; on 2층 its void, with
//                          the gallery beside it leading to the bedrooms and the terrace
// 1층: 현관문 in the back wall, 현관 → 홀 → 주방·거실 (open to each other), the stair hub off the living room, glass doors
// to the patio. 2층: 안방 (드레스룸, 안방 욕실), 방 둘, 공용 욕실, the terrace. 지하: the cork family room (the old
// storage floor), a shower bath, the laundry.
import { room } from './room.js';

// the 2층 baths are 1.6 m wide: a shower across the far end, the basin and the toilet facing each other, the door at the
// near end
const narrowBath = { shower: { corner: 'back-left', w: 3.5, d: 2.2 }, vanity: { wall: 'left', at: 3.4, len: 1.8 }, toilet: { wall: 'right', at: 3.1 } };

export default {
  // 54평형 of a townhouse: the floor area of the three floors together (연면적, 지하 포함), 54 × 3.3058 = 178.5 m²
  target: { m2: 178.5, label: '54평형: 연면적 약 178㎡ (지하 1층~지상 2층 합)' },
  // ash wood · terrazzo-look · cork
  pal: { wood: 0xb8ab91, woodDark: 0x8d806b, cream: 0xdad2c3, sand: 0xc9bda6, clay: 0xa89a82, cab: 0xc9bc9f, stone: 0xb9b1a3, stoneTop: 0xa9a49b, feature: 0xb0a48c, table: 0xb8ab91, rug: 0xa1978a, deck: 0x7c705f, cork: 0x9a7f62, terrazzo: { base: '#bab2a4', chips: ['#a39a8c', '#cbc3b5', '#8f877b', '#b1a796', '#d3ccc0'] } },
  fill: 0.94,
  levels: [
    // 지하 1층 (8.0 x 6.2 m): the old storage floor, now the family room with a cork floor, lit by a high window strip
    // from the light well on its left; the bath and the laundry beside it; lane A up at the right
    {
      at: [-26, -1.2, 6], W: 20, D: 15.5,
      rooms: [
        room('family', 'family', [0, 13], [0, 15.5], 'cork', {
          close: { az: 38, el: 31, left: [{ a0: 1.0, a1: 6.0, v0: 4.4, v1: 5.7 }] },
        }),
        room('bhall', 'hall', [13, 17], [0, 5], 'stone'),
        // the bath opens to the family room: a shower in the far corner, the basin and the toilet on the right
        room('bbath', 'bath', [13, 17], [5, 10.5], 'stone', { shower: { corner: 'back-left', w: 2.0, d: 2.3 }, toilet: { wall: 'back', at: 'end' }, vanity: { wall: 'right', at: 3.5, len: 1.8 } }),
        room('util', 'pantry', [13, 17], [10.5, 15.5], 'stone'),
        // lane A: from its foot at the back up toward the front, where it arrives in the 1층 stair hub
        room('bstair', 'stair', [17, 20], [0, 15.5], 'stone', { up: { x: [0.3, 2.7], z: [5, 15.4], dir: '+z' } }),
      ],
      open: [['family', 'bhall'], ['bhall', 'bstair']],
      doors: [['bbath', 'family', 9], ['util', 'family', 14.2]],
    },
    // 1층 (9.6 x 7.4 m) and the patio in front
    {
      W: 24, D: 23.5,
      rooms: [
        room('kitchen', 'kitchen', [0, 12.5], [0, 9.5], 'stone', {
          kit: 'islandRound', island: {},
          close: { az: 30, el: 31, left: [{ a0: 2.8, a1: 5.4, v0: 2.5, v1: 5.1 }] },
        }),
        room('entry', 'entry', [12.5, 17], [0, 5.5], 'stone', { bench: false }),
        room('hall', 'hall', [12.5, 17], [5.5, 9.5], 'stone'),
        room('powder', 'bath', [17, 24], [0, 5], 'stone'),
        // the living room: the daybed under the windows of its left (outside) wall, glass doors to the patio in front
        room('living', 'living', [0, 17], [9.5, 18.5], 'wood', {
          layout: 'garden',
          close: { az: 48, el: 30, left: [{ a0: 2.3, a1: 4.5, v0: 1.9, v1: 5.2 }, { a0: 5.5, a1: 7.7, v0: 1.9, v1: 5.2 }] },
        }),
        // the stair hall: lane A's void down to the basement beside the glass wall, lane B up to 2층, the hub in front
        room('stair', 'stair', [17, 24], [5, 18.5], 'stone', {
          up: { x: [4.2, 6.6], z: [0, 10.4], dir: '-z' },
          down: { x: [0.3, 2.7], z: [0, 10.4], dir: '-z' },
        }),
        room('patio', 'garden', [0, 24], [18.5, 23.5], 'gravel'),
      ],
      open: [['entry', 'hall'], ['kitchen', 'living'], ['hall', 'living'], ['stair', 'living', [15.5, 18.5]]],
      // the glass wall beside the stair void (sill-high in the cutaway), the window walls to the patio
      low: [['stair', 'hall'], ['stair', 'living', [9.5, 15.5]], ['living', 'patio'], ['stair', 'patio']],
      doors: [
        ['entry', null, 14.75, 2.3, { side: 'back' }], // 현관문
        ['entry', 'powder', 3.2],
        ['living', 'patio', 12.5, 3.6], // glass doors out to the patio
      ],
    },
    // 2층 (9.6 x 7.0 m) and the terrace in front
    {
      at: [30, 2.4, -6], W: 24, D: 22.5,
      rooms: [
        room('bed2', 'room', [0, 7], [0, 6.5]),
        room('bath2', 'bath', [7, 11], [0, 6.5], 'stone', narrowBath),
        room('bed3', 'room', [11, 18], [0, 6.5], 'wood', { wardrobe: { wall: 'right' } }),
        room('hall2', 'hall', [4, 18], [6.5, 9]),
        room('mbath', 'bath', [0, 4], [6.5, 13], 'stone', narrowBath),
        room('dress', 'dress', [0, 4], [13, 17.5], 'wood', { walls: ['left'] }),
        room('master', 'master', [4, 18], [9, 17.5], 'wood', { bed: { wall: 'back', at: 6.5 } }),
        // where lane B arrives: the landing at the back, the gallery along the void to the terrace door
        room('landing', 'hall', [18, 24], [0, 17.5], 'wood', { down: { x: [3.2, 5.6], z: [5, 15.4], dir: '+z' } }),
        room('terrace', 'terrace', [0, 24], [17.5, 22.5], 'deck'),
      ],
      open: [['landing', 'hall2']],
      low: [['master', 'terrace'], ['dress', 'terrace'], ['landing', 'terrace']],
      doors: [
        ['bed2', 'hall2', 5.5],
        ['bath2', 'hall2', 9],
        ['bed3', 'hall2', 16.5],
        ['master', 'hall2', 16.6],
        ['master', 'dress', 15.3],
        ['dress', 'mbath', 2],
        ['master', 'terrace', 14.5, 3.2], // glass doors to the terrace
        ['landing', 'terrace', 19.6, 2.3],
      ],
    },
  ],
};
