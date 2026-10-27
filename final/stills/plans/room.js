// The shared helper of the home plans (./<slug>.js, one module per home, built by ../homes.js), and the plan syntax.
//
// A plan module's default export:
//   {
//     target: { m2, label },        the size the page states; the checker compares the rooms' indoor area to it
//     pal: { wood, cream, ... },    the home's palette (muted tints; ../lib.js homeMaterials reads it)
//     fill: 0.93,                   (optional) how much of the frame the overview fills
//     levels: [ level, ... ],       the floors, each a plan of rectangular rooms (see below)
//     links: [ {...} ],             (optional, old) loose stair flights drawn between the level models, see ../lib.js flight
//     stairs: [['stair', 'landing']],  (optional) extra vertical connections for the checker, besides the ones it finds
//   }
// A level: { at: [x, y, z] (where the model of this floor stands in the overview; the ground floor at y 0, a floor above
// at y 2.4, a basement at y -1.2), W, D (its size), rooms: [room(...)], open: [[a, b]], low: [[a, b]], doors: [...] }.
// Units: 1 = 40 cm; rooms on a 0.5 grid; the viewer looks from the front right: back = min z (far), front = max z (near),
// left = min x, right = max x. Area: m² = units² × 0.16.
//
// room(id, kind, [x0, x1], [z0, z1], floor = 'wood', options): ids are unique in the whole home (all levels).
//   kinds: entry, hall, living, kitchen, family, study, master, room (a bedroom), bath, dress, pantry, stair, terrace,
//   garden, void (an opening in the floor over a double-height room below: no floor, a shaft with a parapet on its
//   open sides; option floorBelow: the floor kind seen at its bottom)
//   floors: wood, stone, terracotta, cork, deck, gravel
//
// Walls come from the grid: a wall wherever two rooms (or a room and outside) meet, cut at 2.6 (walls facing the viewer
// lower). open: [a, b] pairs with no wall at all; low: [a, b] pairs with a sill-high wall (a window wall to a terrace).
// Either can cover only part of the shared wall: [a, b, [s, e]] (or [a, b, [[s, e], [s2, e2]]]), s..e in LEVEL
// coordinates along that wall; the rest stays a full wall (e.g. a kitchen open to the living room over half the
// boundary, with the built-ins on the wall that is left).
// In the cutaway, pieces that hug a wall (joinery, panels, bookshelves, the kitchen run, beds, desks, bath fixtures)
// only stand where a real wall is; on an open side they are left out (a sofa or a table may float).
//
// doors: a gap in the wall between two rooms, or between a room and outside (b = null):
//   [a, b, pos, width, { side }]     or     { a, b, pos, width, side }
//   a, b    room ids; b null = outside (the front door 현관문, a door from a room straight out)
//   pos     where along the wall its middle is, in LEVEL coordinates (x on a wall running along x, z on one along z);
//           null / left out: the middle of the wall. The gap keeps half a wall's thickness from the wall's ends.
//   width   clear width, default 2.1 (84 cm); a front door 2.2-2.5, a garden door (glass slider) 3-6
//   side    which wall of room a: 'back' | 'front' | 'left' | 'right' (when a and b share more than one wall, or for a
//           door to outside: the entry's back wall, its left wall...)
//   e.g. ['entry', null, 2.5, 2.3, { side: 'back' }]    ['living', 'garden', 20, 4.0]    ['master', 'terrace', null, 3.5]
// A door to outside or to a garden / terrace gets a stone sill. Doors to a garden or terrace can be in a 'low' wall.
//
// Furniture keeps clear of the doors by itself: a zone 2 units deep (80 cm) in front of every door, both sides. Beds,
// headboard panels, nightstands, desks, bookshelves, wardrobes / joinery, consoles, the kitchen run, vanities, toilets,
// showers and tubs are placed out of it; loose pieces (plants, lamps, side tables, lounge chairs, benches, poufs,
// consoles) slide out of it or are left out. What still stands in a zone, the checker lists.
//
// Per-room options (room(..., { ... })), besides the layout ones each kind already had (layout, kit, island, table,
// tall, sofaX, sofaLen, bedX, big, tubWindow, feature, plant, tv, close: {...}):
//   'at' is a position along that wall in the ROOM's own frame (units from the room's back-left corner: x on the back /
//   front walls, z on the left / right walls), or 'start' | 'mid' | 'end'.
//   master:  bed: { wall: 'back' | 'left' | 'right' | 'front', at }   (default: back wall, moved only if a door needs it)
//   room:    bed: { wall, at }   (default: head on the back wall in the left corner; at: 'end' = the right corner)
//            desk: { wall, at, len } | false      wardrobe: { wall, at, len } | false      shelf: { wall, at } | false
//   study:   shelf: false (no bookshelf)
//   bath:    vanity: { wall, at, len } | false    toilet: { wall, at }    tub: { wall, at } | true | false
//            shower: { corner: 'back-left' | 'back-right' | 'front-left' | 'front-right', w, d } | false
//            (every bath gets a toilet and a basin; 'big' / tubWindow also a tub and a shower; a small one a shower when
//            it fits)
//   dress:   walls: ['back', 'left']   (which walls get wardrobes)
//   entry:   shoe: { wall } | false   (the tall shoe cabinet)    bench: false
//   hall:    console: false
//   kitchen: tall: 'right' | false   (the tall unit: right end, or none; the run takes the back wall's longest stretch
//            no door needs)
//   any:     omit: ['floorLamp', 'loungeChair', ...]   leave pieces out by name (names: sofa, loungeChair, coffeeTable,
//            floorLamp, sideTable, plant, ottoman, bench, stool, console, bookshelf, tallCabinet, desk, deskChair, bed,
//            nightstand, headboard, vanity, toilet, shower, tub, island, dining, counter, rug, cushion, daybed)
//            close: { doorways: true }   the close-up draws the room's doors in its two back walls as openings (dark
//            beyond), so a gap the furniture leaves for a door reads as one (off by default)
// The living rooms' layouts (o.layout: classic, storage, side, bare, open, double, garden) are used in the overview too,
// sized to the room: what the overview shows of a room is what its close-up shows.
//
// Stairs between floors (the overview shows the floors side by side; give the floors the same plan coordinates where the
// stair is, so the flight and its void are at the same spot on both plans):
//   up:   { x: [x0, x1], z: [z0, z1], dir: '-z' }     a flight in this room (its own frame) climbing toward dir ('+x',
//         '-x', '+z', '-z'); real steps (26 cm treads, the storey's rise), drawn up to the cut and on past it as the
//         stair's mass cut flat. A turning stair: { runs: [{ x, z, dir }, { x, z, landing: true }, { x, z, dir }] }.
//         A 'stair' room without up draws its old short flight along its left wall; up: false draws none.
//   down: { x, z, dir } (or { runs }) a stair void in this room: the floor and the block under it open, the flight's
//         top steps going down inside (dir: the way you walk going DOWN), a parapet on its open sides. Put it on the
//         floor above, over the flight that comes up (and on the ground floor, over a flight down to the basement).
//   storey: (in up / down) floor-to-floor height in units, default 7 (2.8 m).
//   A straight flight to the next floor is about 10.4 units long (16 treads); a shorter stair room needs a turning one.
//   The viewer looks from the front right: a flight climbing away from it (dir '-z' or '-x') shows its steps; one
//   climbing toward it shows mostly its cut mass. Keep the way past the flight (and its foot) clear: the checker counts
//   the steps as furniture. Leave room in front of a void's top edge to step off (the landing's floor).
//   A 'stair' room with down but no up still draws its old flight: give it up too (or up: false).
//   The checker connects a flight up to the room above that holds its top end, and asks for a void (down) over it.
//   See ./_example.js for a whole small house with all of this (it is not one of the seven).
//
// Check a plan: node final/stills/check-plans.mjs --only <slug> [--png] (from the deepflat folder), or open
// stills.html?scene=home&slug=<slug>&shot=01&check=1&zones=1 (the door zones drawn on the floor; window.__planCheck).

export const room = (id, kind, x, z, floor = 'wood', o = {}) => ({ id, kind, x, z, floor, o, close: o.close });
