// The DEEPFLAT miniature world (moved out of hero.js so the still renders in final/stills can build the same place).
// Laid out like final/svg/scene.mjs (the old SVG hero). That file uses x along the letters, y toward the viewer and
// z up, in units where a letter is 120 tall; here a letter is 10 tall.
// Every level of the world is a different room of a home:
//   floor 거실 (living) · right ledge 주방·다이닝 (kitchen, dining) · upper right 침실 (bedroom)
//   upper left, in the raised wall 욕실 (bath) · left ledge in front of it 서재 (study)
// Daylight (2026-10-26): light warm stone, a sage-grey ground, rooms dressed as real interiors (rooms.js, props.js).
// The flight (flight.js) flies into the living room, the kitchen and the bedroom, so those three are furnished in
// full; the study and the bath are seen in passing and carry fewer pieces.
//
// Two stone tones by tier (2026-10-26 review): M.block (pale stone) for the towers, the plinth, the kitchen ledge, the
// bedroom platform and the bath wall; M.blockSand (warm sand) for the long block behind the letters and the left ledge.
// Both are lime plaster (kit.js plaster()). Soft contact bands darken the feet of walls on the ledges they rise from.
// worldSteps() returns a list of build steps, so the hero can yield between them. A furnished room is composed in one
// step and baked in the next, so no single step is a long task on a phone. Each step fills `world`:
//   world.pieces   groups that rise into place during the opening (each with userData.rise, its depth of travel)
//   world.letters  the DEEP / FLAT letter pivots (kit.js buildLetters)
//   world.bulbs    the dining pendants (switch on in the opening). The night world's hanging bulbs are gone by day:
//                  in sunlight they read as white specks on long dark wires.
//   world.lamps    lamps with a light of their own { light, base } (none in daylight: the sun does the work)
//   world.glows    emissive / additive pieces that warm up in the opening { mat, base, emissive | basic | uniform }
//   world.rooms    label pins { k, at, box }; world.wires the dining pendants' cords (no label may sit on them)
//   world.furnished the rooms furnished from the model library (M.lib, models.js): { k, piece, baked, shadow, pin, build }
// Real furniture (2026-10-26): the rooms place the library's glTF models where it has them (rooms.js); each room is
// baked with models.js bakeRoom (the models kept apart, repeated ones instanced). The first step that furnishes a room
// is marked step.models: the hero waits there (briefly) for the library. A library that arrives after the build
// refurnishes the rooms in place: world.refurnishSteps() builds them again and apply() swaps them in.
// The mixed world (owner 2026-10-29, `mix`; shops.js): the kitchen ledge is a café, the bath arch a shop, the study an
// office, and the seated figure a builder beside a corner still being built; living room and bedroom stay homes.
// Only the stills build it so far (final/stills/flight.js ?mix=1); the 3D hero keeps the homes.
import { THREE, blk, stairs, nicheBox, bake, figure, crescentFrame, buildLetters, mushroomLamp, contacts } from './kit.js';
import { bounds } from './glyphs.js';
import { livingRoom, kitchenRoom, bedroomRoom, studyRoom, bathRoom, pendantPair, ledgeDressing, archDressing, faceDressing, landingLights, GLOBE_DROP } from './rooms.js';
import { bakeRoom } from './models.js';
import { cafeRoom, shopRoom, officeRoom, buildCorner } from './shops.js';

const k = 1 / 12;
export const P = 200 * k; // top of the plinth = FLAT baseline
export const LX = -0.3; // left edge of the letters
export const L = 9.33; // top of the right ledge (kitchen)
export const UT = 39; // top of the upper-right platform (bedroom)

// the letters' block, for framing: [x0, y0, z0] .. [x1, y1, z1]
export function logoBox(back = -(0.85 + 0.14)) {
  const b = bounds();
  return new THREE.Box3(new THREE.Vector3(LX, P, back), new THREE.Vector3(LX + b.w, P + b.h, 0));
}

export function worldSteps(scene, M, { mobile = false, mix = false } = {}, world) {
  Object.assign(world, { P, lx: LX, pieces: [], letters: [], bulbs: [], lamps: [], glows: [], rooms: [], wires: [], furnished: [] });
  // a piece rises `rise` units into place during the opening, out of the floor or the block under it
  const piece = (rise, ...objs) => {
    const g = new THREE.Group();
    objs.forEach((o) => o && g.add(o));
    g.userData.rise = rise;
    world.pieces.push(g);
    scene.add(g);
    return g;
  };
  // a niche box is several pieces of the same stone: baked into one or two meshes
  const niche = (mat, opts) => {
    const g = nicheBox(M, mat, { ...opts, lights: false });
    world.lamps.push(...g.userData.lamps);
    return bake(g);
  };
  // a room's lamp shades and daylight panels warm up with the opening
  const takeGlow = (room) => {
    for (const o of room.glow ?? []) {
      if (o.material?.isMeshBasicMaterial) world.glows.push({ kind: o.userData.kind, mat: o.material, basic: true, color0: o.material.color.clone() });
    }
    for (const g of room.glows ?? []) if (!world.glows.some((w) => w.mat === g.mat)) world.glows.push(g);
    return room.glow ?? [];
  };
  // a furnished room: baked with its models kept apart, its soft contact shadows, its label pin; recorded with the
  // function that builds it, so refurnishSteps() can build it again from a fuller library
  const furnish = (k, room, build) => {
    const baked = bakeRoom(room.solid);
    const shadow = contacts(room.contacts);
    const pin = { k, at: room.label, box: new THREE.Box3().setFromObject(baked) };
    const rec = { k, baked, shadow, pin, build, piece: null };
    world.furnished.push(rec);
    return rec;
  };
  // the two pendants over the dining table, from world.diningTable: the library's globe hangs from its arm with its
  // bottom 0.77 m over the table (the arm 2.46 m above the floor, under the 2.55 m wall); the drawn domes' rims are
  // 0.8 m over it on arms 2.3 m up
  const hangPendants = () => {
    const t = world.diningTable;
    const globe = M.lib?.has('pendant_globe');
    const py = t.y + 0.8 * t.s;
    const armY = t.y + (globe ? 0.77 + GLOBE_DROP : 1.55) * t.s;
    const pend = pendantPair(M, { at: { x: t.x, y: py, z: t.z }, gap: 0.9 * t.s, armY, s: t.s });
    world.wires = pend.map((g) => {
      const x = g.userData.x;
      const [top, bottom] = g.userData.wire ?? [armY, py];
      return { top: new THREE.Vector3(x, top, t.z), bottom: new THREE.Vector3(x, bottom, t.z) };
    });
    return pend;
  };
  // build the furnished rooms again (now that the library holds more models) without touching the scene; apply()
  // then swaps them in and returns what it took out (for models.js disposeUnused)
  world.refurnishSteps = () => {
    const fresh = [];
    let pend = [];
    const steps = world.furnished.map((rec) => () => {
      const room = rec.build();
      for (const o of room.glow ?? []) o.geometry?.dispose(); // the daylight panels in place stay
      const baked = bakeRoom(room.solid);
      fresh.push({ rec, room, baked, shadow: contacts(room.contacts), box: new THREE.Box3().setFromObject(baked) });
    });
    steps.push(() => {
      const kitchen = fresh.find((f) => f.rec.k === 'dining' || f.rec.k === 'cafe');
      if (kitchen) world.diningTable = kitchen.room.table;
      pend = hangPendants();
    });
    return {
      steps,
      // everything new in one group, to compile before it is shown
      group() {
        const g = new THREE.Group();
        for (const f of fresh) g.add(f.baked, f.shadow);
        for (const p of pend) g.add(p);
        return g;
      },
      apply() {
        const old = [];
        for (const f of fresh) {
          const { rec } = f;
          rec.piece.remove(rec.baked, rec.shadow);
          rec.piece.add(f.baked, f.shadow);
          old.push(rec.baked, rec.shadow);
          rec.baked = f.baked;
          rec.shadow = f.shadow;
          rec.pin.box = f.box;
          for (const g of f.room.glows ?? []) if (!world.glows.some((w) => w.mat === g.mat)) world.glows.push(g);
        }
        for (const b of world.bulbs) {
          b.parent?.remove(b);
          old.push(b);
        }
        world.bulbs.splice(0, world.bulbs.length, ...pend);
        world.dining.add(...pend);
        return old;
      },
    };
  };

  const held = {}; // a room composed in one step, baked in the next
  const bedStep = () => {
    held.bed = bedroomRoom(M, { UT });
  };
  bedStep.models = true; // the first step that furnishes a room: the hero waits here for the model library
  return [
    // the ground and the far backdrop wall (they stay where they are: the world rises out of this floor)
    () => {
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), M.floor);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      const back = blk(M.blockDark, [-130, 150], [0, 130], [-46, -43.33], 0);
      back.castShadow = false;
      scene.add(back);
    },

    // back towers: slit niches, and the tower behind the logo carrying the crescent frame
    () => {
      piece(14, niche(M.block, { x: [-63.33, -46.67], y: [0, 100], z: [-43.33, -30.83], zDepth: 1.5, zOps: [{ a0: -58.33, a1: -56.33, v0: 25, v1: 53.33 }, { a0: -53.33, a1: -51.33, v0: 25, v1: 53.33 }] }));
    },
    () => {
      piece(12, niche(M.block, { x: [-46.67, -19.17], y: [0, 75], z: [-36.67, -25.83], zDepth: 1.3, zOps: [{ a0: -39.17, a1: -37.17, v0: 15, v1: 39.17 }] }));
    },
    () => {
      piece(14, blk(M.block, [3.33, 15.83], [0, 100], [-33.33, -23.33], 0.08), crescentFrame(M, { x0: 6, x1: 13, y0: 33.67, y1: 40.9, z: -23.33 }));
    },
    () => {
      piece(14, niche(M.block, { x: [65, 78.33], y: [0, 100], z: [-38.33, -22.5], zDepth: 1.8, xDepth: 1.3, zOps: [{ a0: 68.33, a1: 72.33, v0: 12.5, v1: 28.33 }], xOps: [{ a0: -35, a1: -32.67, v0: 26.67, v1: 46.67 }] }));
    },

    // long block behind the letters: a lit doorway reached by stairs, three tall slit windows over the kitchen (lit warm
    // like the doorway, glazed, a pendant glowing in each, a planting bed spilling pothos down the face above them:
    // rooms.js faceDressing, what the camera sees as it cranes up from the kitchen to the bedroom)
    () => {
      // (the third window, left, keeps the two old slits' rhythm of 7.5 units: the face reads as a calm row of three)
      const slits = [46.67, 39.17, 31.67].map((a0) => ({ a0, a1: a0 + 1.83, v0: 12.5, v1: 28.33, lit: 7 }));
      const face = faceDressing(M, { slits, zf: -3.33, depth: 2.2, from: L + 0.1 + 2.55 * 3.33, top: 34.33, mobile });
      piece(
        12,
        niche(M.blockSand, {
          x: [-5.83, 62.5], y: [0, 34.33], z: [-22.5, -3.33], zDepth: 2.2,
          zOps: [{ a0: 53.67, a1: 57.83, v0: 8.75, v1: 17.08, lit: 7 }, ...slits],
        }),
        bake(face.solid),
        ...face.glow,
      );
      world.glows.push(...face.glows);
      piece(7, stairs(M.blockSand, { x: 53.33, z: 5.42, top: 8.75, n: 7, rise: 1.25, run: 1.25, width: 4.83, axis: 'z', sign: -1, up: true }));
    },

    // upper right: raised platform with stairs down two sides; the bedroom on it (rooms.js)
    () => {
      piece(6, stairs(M.block, { x: 47.5, z: -19.33, base: 34.33, top: UT - 1.17, n: 3, rise: 1.17, run: 1.5, width: 8.67, axis: 'x', sign: 1 }));
      piece(6, stairs(M.block, { x: 27.5, z: -8, base: 34.33, top: UT - 1.17, n: 3, rise: 1.17, run: 1.33, width: 7.5, axis: 'z', sign: 1 }));
    },
    bedStep,
    () => {
      const room = held.bed;
      const rec = furnish('bed', room, () => bedroomRoom(M, { UT }));
      // the wall lights on the platform's front, over the ledge's bench (seen on the crane up to the bedroom)
      const ll = landingLights(M, { y: 34.33, zf: -8 });
      world.glows.push(...ll.glows);
      const g = piece(8, blk(M.block, [26.67, 47.5], [34.33, UT], [-21.33, -8]), rec.baked, rec.shadow, ...takeGlow(room), bake(ll.solid), ...ll.glow);
      rec.piece = g;
      world.rooms.push(rec.pin);
      world.bedroom = g;
    },
    // the ledge the camera cranes past on its way up to the bedroom (the top of the long block): an olive tree, a bench
    // and a tall jar by the bedroom stairs, and soft contact bands where the platform and the towers meet it
    () => {
      const d = ledgeDressing(M, { y: 34.33 });
      piece(
        7,
        bake(d.solid),
        contacts([
          ...d.contacts,
          [37.1, 34.33, -8.1, 11.5, 1.5, 0.42], // the bedroom platform's foot
          [59, 34.33, -22.6, 4.5, 1.2, 0.3], // the back tower's foot, right of the bedroom
          [6, 34.33, -22.6, 22, 1.4, 0.32], // the towers' feet, left of the bedroom
        ]),
      );
    },

    // upper left: a ledge with a dark doorway, stairs down to the plinth and to the floor.
    // The raised wall at its back holds the bath: a wide arch with the tub and the vanity.
    // The front of the ledge is the study: desk, chair, low bookcase, and the key visual's mushroom lamp on the desk.
    () => {
      piece(9, niche(M.blockSand, { x: [-30, -10], y: [0, 21], z: [-3.33, 10], zDepth: 3.33, zOps: [{ a0: -21.5, a1: -14.33, v0: 0, v1: 10 }] }));
    },
    () => {
      held.bath = mix ? shopRoom(M, { y: 21 }) : bathRoom(M, { y: 21 });
      held.study = mix ? officeRoom(M, { y: 21 }) : studyRoom(M, { y: 21 });
      if (!mix) held.study.solid.add(mushroomLamp(M, { x: -14.2, y: 21 + 0.74 * 3.33, z: 5.6, s: 0.62 }));
    },
    () => {
      const bathBuild = () => {
        const r = mix ? shopRoom(M, { y: 21 }) : bathRoom(M, { y: 21 });
        r.contacts.push([-22.6, 21, 0.1, 8.2, 1.1, 0.3]); // the foot of the arch's back wall
        return r;
      };
      held.bath.contacts.push([-22.6, 21, 0.1, 8.2, 1.1, 0.3]);
      const bath = furnish(mix ? 'shop' : 'bath', held.bath, bathBuild);
      bath.piece = piece(8, niche(M.block, { x: [-30, -15.17], y: [21, 34], z: [-3.33, 0], zDepth: 2.83, zOps: [{ a0: -28.4, a1: -19.8, v0: 21, v1: 28.4, lit: 6 }] }), bath.baked, bath.shadow);
      world.rooms.push(bath.pin);

      const studyBuild = () => {
        if (mix) return officeRoom(M, { y: 21 });
        const r = studyRoom(M, { y: 21 });
        r.solid.add(mushroomLamp(M, { x: -14.2, y: 21 + 0.74 * 3.33, z: 5.6, s: 0.62 }));
        return r;
      };
      const study = furnish(mix ? 'office' : 'study', held.study, studyBuild);
      study.piece = piece(5, study.baked, study.shadow);
      world.rooms.push(study.pin);

      piece(6, stairs(M.block, { x: -10, z: 0.17, top: 20.13, n: 4, rise: 0.867, run: 1.833, width: 9, axis: 'x', sign: 1 }));
      piece(8, stairs(M.blockSand, { x: -30, z: 10, top: 19.09, n: 10, rise: 1.908, run: 2, width: 7, axis: 'z', sign: 1 }));
    },

    // the plinth the letters stand on, a warm doorway on its right face, and the seated figure on it
    () => {
      world.plinth = piece(
        10,
        niche(M.block, { x: [-2.67, 25.83], y: [0, P], z: [-3.33, 11], xDepth: 3.67, xOps: [{ a0: -0.5, a1: 4.33, v0: 0, v1: 10, lit: 12 }] }),
        // the figure's own contact shadow: small and light, so it grounds it without reading as a hole in the stone
        contacts(mix ? [[11, P, 5.6, 1.1, 0.9, 0.3], [11, P, -3.2, 15, 1.1, 0.3], [21.6, P, 8.6, 4.6, 1.3, 0.25]] : [[11, P, 4.65, 1.2, 1.05, 0.3], [11, P, -3.2, 15, 1.1, 0.3]]),
        bake(mix ? buildCorner(M, { P }) : figure(M, { x: 11, y: P, z: 4.6, rot: 0.55, s: 2.35 })),
      );
      // on the ground between the plinth's lit doorway and the kitchen ledge: a tall plant and a stool, so the doorway
      // wall the camera passes on its way into the kitchen has a subject
      const by = archDressing(M);
      piece(6, bake(by.solid), contacts([...by.contacts, [25.83, 0, 4.2, 1.2, 7.4, 0.3]]));
    },

    // the right ledge: kitchen against the long block, the island, the dining table (rooms.js)
    () => {
      held.kitchen = mix ? cafeRoom(M, { L }) : kitchenRoom(M, { L });
    },
    () => {
      const room = held.kitchen;
      const rec = furnish(mix ? 'cafe' : 'dining', room, () => (mix ? cafeRoom(M, { L }) : kitchenRoom(M, { L })));
      world.dining = rec.piece = piece(8, blk(M.block, [30, 50.83], [0, L], [-3.33, 9.17]), rec.baked, rec.shadow, ...takeGlow(room));
      world.diningTable = room.table;
      rec.pin.group = world.dining;
      world.rooms.push(rec.pin);
      piece(6, stairs(M.block, { x: 44, z: 9.17, top: 7.78, n: 6, rise: 1.296, run: 1.333, width: 6.67, axis: 'z', sign: 1 }));
    },

    // DEEP / FLAT, with a contact shadow as wide as the word (the letters rise on their own, see hero.js)
    () => {
      const { group, letters, back } = buildLetters(M, { depth: 0.85, base: P }); // thin slabs: the key shows only a narrow side and top
      group.position.x = LX;
      scene.add(group);
      const half = bounds().w / 2;
      world.plinth.add(contacts([[LX + half, P, -0.3, half + 1.6, 1.6, 0.4]]));
      world.letters = letters;
      world.letterBack = back;
    },

    // the two dome pendants over the dining table (the night world's hanging bulbs are left out by day). They carry no
    // light of their own; they still switch on in the opening and glow.
    () => {
      const pend = hangPendants();
      world.dining.add(...pend); // they rise with the dining ledge
      world.bulbs = pend;
    },

    // front, on the floor: the living room (rooms.js)
    () => {
      held.living = livingRoom(M);
    },
    () => {
      const room = held.living;
      const rec = furnish('living', room, () => livingRoom(M));
      world.living = rec.piece = piece(6, rec.baked, rec.shadow, ...takeGlow(room));
      // pinned toward the sofa's near end, so its leader keeps clear of the floor lamp
      world.rooms.push(rec.pin);
    },
  ];
}
