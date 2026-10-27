// Not a portfolio home: a small two-storey house that uses every building block of ./room.js (a front door on a chosen
// wall, a garden door in a low wall, an opening over part of a wall, a flight up with its void on the floor above, a
// double-height void with a parapet, a terrace door). Both floors share plan coordinates where the stair is (x 6..12,
// z 0..14), so the flight below and its void above are at the same spot. Look at it with
// stills.html?scene=home&slug=_example&shot=01&check=1&zones=1, or node final/stills/check-plans.mjs --only _example --png
// (it borrows 판교's interior style).
import { room } from './room.js';

export default {
  style: 'pangyo-house',
  target: { m2: 150, label: 'example' },
  pal: { block: 0x2e2e2c, wood: 0x9d8b6d, woodDark: 0x6c5d4b, cream: 0xd4ccbd, sand: 0xc2b6a1, clay: 0xa2957f, cab: 0xa69479, stone: 0x8e8c87, feature: 0x6b6a66, table: 0x8c7357, rug: 0x958b7b, deck: 0x75685a, gravel: 0x5a5852, stair: 0x9a886b, louver: 0xa88a66, terracotta: 0x9c7b5f, plaster: 0x9a8670 },
  fill: 0.9,
  levels: [
    {
      W: 24, D: 22,
      rooms: [
        // close.doorways: its close-up shows the front door in its back wall
        room('entry', 'entry', [0, 6], [0, 6], 'stone', { close: { doorways: true } }),
        room('bath', 'bath', [0, 6], [6, 11], 'stone'),
        // a straight flight along the stair hall's right wall, climbing toward the front (16 treads of 26 cm); the hall's
        // left part is the way past it
        room('stair', 'stair', [6, 12], [0, 11], 'stone', { up: { x: [3.9, 5.75], z: [0.6, 11.0], dir: '+z' } }),
        room('kitchen', 'kitchen', [12, 24], [0, 11], 'wood', { kit: 'islandRound', island: {} }),
        room('bed', 'room', [0, 6], [11, 18]),
        room('living', 'living', [6, 24], [11, 18], 'wood', { layout: 'classic', sofaX: 11, sofaLen: 4.2 }),
        room('garden', 'garden', [0, 24], [18, 22], 'gravel'),
      ],
      // the stair hall is open to the living room only over x 6..9.9 (beside the flight); the rest of that wall stays
      open: [['entry', 'stair'], ['kitchen', 'living'], ['stair', 'living', [6, 9.9]]],
      low: [['living', 'garden'], ['bed', 'garden']],
      doors: [
        ['entry', null, 3, 2.3, { side: 'back' }], // the front door (현관문) in the entry's back wall
        ['bath', 'entry'],
        ['bed', 'living', 16.5],
        ['living', 'garden', 17, 4.0], // glass doors out to the garden, in the low window wall
      ],
    },
    {
      at: [30, 2.4, -4], W: 24, D: 18,
      rooms: [
        room('mbath', 'bath', [0, 6], [0, 8], 'stone', { big: true }),
        room('dress', 'dress', [0, 6], [8, 14]),
        // where the flight arrives: its void (the way down, toward the back), the landing's floor in front of it
        room('landing', 'hall', [6, 12], [0, 14], 'wood', { down: { x: [3.9, 5.75], z: [0.6, 11.0], dir: '-z' }, console: false }),
        room('master', 'master', [12, 24], [0, 14]),
        room('terrace', 'terrace', [0, 6], [14, 18], 'deck'),
        // over the living room's double height: an opening in the floor, a parapet where it meets the landing
        room('over', 'void', [6, 24], [14, 18], 'wood', { floorBelow: 'wood' }),
      ],
      open: [['landing', 'over']],
      low: [['dress', 'terrace']],
      doors: [['landing', 'mbath', 3], ['landing', 'dress', 12.5], ['landing', 'master', 12.5], ['dress', 'terrace', null, 3.0]],
    },
  ],
};
