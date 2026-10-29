// The businesses of the mixed DEEPFLAT world. Owner 2026-10-29: "딥플랫이라는 월드에서 상업 공간과 주거 공간을 꾸미는
// 설계하고 시공한다는 브랜드로 인식시키고 싶은데 대문에 지금 주거 환경만 구성했어". Three of the world's five rooms become
// businesses and two stay homes:
//   right ledge (the kitchen's place)   카페: a back bar with the espresso machine, a counter facing the guests with a
//                                        pastry case, small round tables, a barista and two guests, a sign on the ledge
//   upper-left arch (the bath's place)  매장: shelves of small product boxes, a counter, a striped awning, a hanging sign
//   left ledge (the study's place)      오피스: two desks with screens, task chairs, one person at work
//   living room, bedroom                 homes, as before (rooms.js)
// and the seated figure on the plinth becomes a builder with rolled drawings beside a small corner still being built
// (설계하고 시공한다, in one picture).
// Built only with worldSteps(..., { mix: true }) (final/stills/flight.js ?mix=1). The 3D hero keeps the homes.
// Signs carry pictograms only: no words, no brand, no red cross. A miniature must never pass as a real client's shop.
// Units as in rooms.js: s = 3.33 world units per metre, m(v) metres to units; props are built in metres and placed
// with s.
import { THREE, blk } from './kit.js';
import { PROPS as P, planarBox, box, boxR, cylinder, ball, lathe, wbox, rng } from './props.js';

const G = (M, name, at) => M.lib?.place(name, at) ?? null;
const UP = new THREE.Vector3(0, 1, 0);
// a group built in metres, set at x, y, z (world units) and scaled by s
const put = (g, x, y, z, s) => {
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  return g;
};

// shared materials for the shops, made once per material set
function shopMats(M) {
  if (M.shop) return M.shop;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra });
  M.shop = {
    screen: std(0xcfdcd6, { emissive: 0xbfd2cb, emissiveIntensity: 0.35, roughness: 0.35 }),
    board: std(0x2c2b28, { roughness: 0.85 }),
    chalk: std(0xf3efe6, { roughness: 0.9 }),
    stripeA: std(0xf3ede1, { roughness: 0.8 }),
    stripeB: std(0x9db3a2, { roughness: 0.8 }),
    hat: std(0xf6f3ec, { roughness: 0.4 }),
    jeans: std(0x4a5a6a, { roughness: 0.85 }),
    shirt: std(0xf1ece2, { roughness: 0.85 }),
    apron: std(0x4a6352, { roughness: 0.85 }),
    sweater: std(0xc9a98c, { roughness: 0.9 }),
    coatB: std(0x7d8f86, { roughness: 0.9 }),
    pastry: std(0xd9a066, { roughness: 0.7 }),
    goods: [0xf3efe6, 0xdfe7df, 0xe9cfc4, 0xd9cfbf, 0xb9c9bd, 0xc7d3dd, 0xefe3cf].map((c) => std(c, { roughness: 0.7 })),
  };
  return M.shop;
}

const shade = (m, cast = true) => {
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
};
// a capsule from a to b (metres), for the people's limbs
function limb(r, a, b, mat) {
  const A = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(A);
  const m = shade(new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 12), mat));
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// An architect's scale figure (M.look === 'model', owner 2026-10-29: the toy people read cheap): true proportions
// (1.7 m, a small head), one matte white, no face, no hair, the way people stand in a presentation model. Standing or
// seated, facing +z before rot; options as person() (apron, hat, roll, bag are left out: a model figure has no props)
function scaleFigure(M, { sit = false, ...at } = {}) {
  const S = shopMats(M);
  S.figure ??= new THREE.MeshStandardMaterial({ color: 0xf1ede5, roughness: 0.92, metalness: 0 });
  const F = S.figure;
  const g = new THREE.Group();
  const hip = sit ? 0.46 : 0.86;
  for (const sx of [-1, 1]) {
    if (sit) {
      g.add(limb(0.055, [sx * 0.08, hip, 0], [sx * 0.08, hip, 0.4], F));
      g.add(limb(0.048, [sx * 0.08, hip, 0.42], [sx * 0.08, 0.05, 0.45], F));
    } else g.add(limb(0.055, [sx * 0.08, 0.05, 0], [sx * 0.075, hip, 0], F));
  }
  const torso = limb(0.13, [0, hip + 0.06, 0], [0, hip + 0.5, 0], F);
  torso.scale.set(1, 1, 0.72);
  g.add(torso);
  const sh = hip + 0.52;
  for (const sx of [-1, 1]) {
    const hand = sit ? [sx * 0.16, sh - 0.4, 0.3] : [sx * 0.2, sh - 0.62, 0.02];
    g.add(limb(0.035, [sx * 0.17, sh, 0], hand, F));
  }
  g.add(ball(F, 0.1, 0, sh + 0.17, 0, 18));
  const { x = 0, y = 0, z = 0, rot = 0, s = 1 } = at;
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  return g;
}

// A toy person in the world figure's manner (kit.js figure: a lathed coat, round limbs, a big round head), standing or
// seated, facing +z before rot. Metres; about 1.55 m standing. Options: coat, legs (trousers), apron, hat 'hard' (a
// builder's helmet), roll (rolled drawings under the right arm), hair colour.
export function person(M, { sit = false, coat, legs, apron = null, hat = null, roll = false, bag = null, ...at } = {}) {
  if (M.look === 'model') return scaleFigure(M, { sit, ...at });
  const S = shopMats(M);
  const g = new THREE.Group();
  const C = coat ?? S.shirt, Lg = legs ?? S.jeans;
  const hip = sit ? 0.46 : 0.66;
  if (sit) {
    for (const sx of [-1, 1]) {
      g.add(limb(0.068, [sx * 0.09, hip, 0], [sx * 0.09, hip, 0.36], Lg));
      g.add(limb(0.06, [sx * 0.09, hip - 0.02, 0.38], [sx * 0.09, 0.08, 0.42], Lg));
      const shoe = ball(M.ink, 0.055, sx * 0.09, 0.045, 0.47, 10);
      shoe.scale.set(0.9, 0.6, 1.3);
      g.add(shoe);
    }
  } else {
    for (const sx of [-1, 1]) {
      g.add(limb(0.068, [sx * 0.09, 0.1, 0], [sx * 0.09, hip + 0.02, 0], Lg));
      const shoe = ball(M.ink, 0.06, sx * 0.09, 0.04, 0.04, 10);
      shoe.scale.set(0.9, 0.6, 1.4);
      g.add(shoe);
    }
  }
  // the coat: hips a little wider than the waist, round shoulders
  const b = hip - 0.06;
  const prof = [[0, b], [0.17, b], [0.2, b + 0.06], [0.195, b + 0.3], [0.19, b + 0.46], [0.16, b + 0.56], [0.09, b + 0.62], [0, b + 0.63]];
  const body = shade(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 24), C));
  body.scale.set(1, 1, 0.8);
  g.add(body);
  if (apron) g.add(box(apron, 0.3, 0.5, 0.02, 0, b + 0.02, 0.15, 0.004));
  const sh = b + 0.5;
  for (const sx of [-1, 1]) {
    // right arm: forward to a counter or a table when seated, holding the roll when asked; left arm hangs
    const fwd = sit || (sx > 0 && !roll && at.reach);
    const elbow = [sx * 0.23, sh - 0.24, fwd ? 0.12 : 0.02];
    const hand = fwd ? [sx * 0.15, sh - 0.27, 0.36] : [sx * 0.23, sh - 0.44, 0.06];
    g.add(limb(0.052, [sx * 0.19, sh, 0], elbow, C));
    g.add(limb(0.048, elbow, hand, C));
    g.add(ball(M.skin, 0.05, ...hand, 10));
  }
  if (roll) {
    const r = cylinder(M.paper, 0.035, 0.035, 0.56, 0, 0, 0, 14);
    r.rotation.z = Math.PI / 2 - 0.25;
    r.position.set(0.27, sh - 0.3, 0.1);
    g.add(r);
  }
  if (bag) {
    g.add(box(bag, 0.22, 0.24, 0.08, -0.27, sh - 0.62, 0.06, 0.006));
    g.add(limb(0.008, [-0.33, sh - 0.38, 0.06], [-0.23, sh - 0.38, 0.06], bag));
  }
  const hy = sh + 0.24;
  g.add(ball(M.skin, 0.16, 0, hy, 0.01, 22));
  for (const sx of [-1, 1]) g.add(ball(M.ink, 0.016, sx * 0.055, hy - 0.01, 0.155, 8));
  if (hat === 'hard') {
    const dome = shade(new THREE.Mesh(new THREE.SphereGeometry(0.175, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), S.hat));
    dome.position.set(0, hy + 0.03, 0);
    g.add(dome);
    g.add(cylinder(S.hat, 0.2, 0.2, 0.018, 0, hy + 0.02, 0.02, 22));
  } else {
    const hair = shade(new THREE.Mesh(new THREE.SphereGeometry(0.172, 22, 12, Math.PI * 0.95, Math.PI * 1.1, 0, Math.PI * 0.62), M.hair));
    hair.position.set(0, hy + 0.01, 0.0);
    g.add(hair);
  }
  const { x = 0, y = 0, z = 0, rot = 0, s = 1 } = at;
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  return g;
}

// a round sign plate with a pictogram, facing +z (metres): 'cup', 'bag'
function pictoSign(M, kind, { r = 0.22, ...at }) {
  const S = shopMats(M);
  const g = new THREE.Group();
  const plate = cylinder(S.board, r, r, 0.03, 0, -0.015, 0, 32);
  plate.rotation.x = Math.PI / 2;
  plate.position.set(0, 0, 0.015);
  g.add(plate);
  const z = 0.035;
  if (kind === 'cup') {
    g.add(box(S.chalk, r * 0.62, r * 0.55, 0.012, -r * 0.08, -r * 0.35, z, 0.01));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.15, r * 0.045, 8, 18), S.chalk);
    handle.position.set(r * 0.27, -r * 0.08, z);
    g.add(handle);
    g.add(box(S.chalk, r * 0.9, r * 0.06, 0.012, 0, -r * 0.48, z));
    for (const dx of [-0.12, 0.08]) g.add(box(S.chalk, r * 0.05, r * 0.24, 0.012, dx * r * 2, r * 0.3, z, 0.004));
  } else {
    g.add(box(S.chalk, r * 0.7, r * 0.62, 0.012, 0, -r * 0.42, z, 0.01));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.17, r * 0.045, 8, 18, Math.PI), S.chalk);
    handle.position.set(0, r * 0.2, z);
    g.add(handle);
  }
  const { x = 0, y = 0, z: z0 = 0, rot = 0, s = 1 } = at;
  g.position.set(x, y, z0);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  return g;
}

// 카페, on the right ledge (the kitchen's footprint, rooms.js kitchenRoom): back bar against the wall, the counter
// facing the guests, three small tables toward the stairs. Returns the room shape rooms.js rooms return, and `table`
// for the two globe pendants (they hang over the counter here).
export function cafeRoom(M, { L }) {
  const S = shopMats(M);
  const s = 3.33, x0 = 30, x1 = 50.83, zw = -3.33, zf = 9.17;
  const m = (v) => v * s;
  const Y = L + 0.1;
  const solid = new THREE.Group();
  const C = [];
  solid.add(planarBox(M.terrazzo, [x0, x1], [L, Y], [zw, zf], 1.4 * s));
  const zb = zw + 0.14;
  solid.add(blk(M.plasterSage, [x0, x1], [L, Y + m(2.55)], [zw, zb], 0));
  solid.add(planarBox(M.tileWhite, [x0, x1], [Y, Y + m(1.05)], [zb, zb + 0.04], 0.6 * s));
  // back storage and the back bar
  solid.add(P.tallUnit(M, { len: 0.62, h: 2.3, front: M.cabCream, x: x0 + m(0.31) + 0.1, y: Y, z: zb + m(0.31), s }));
  const barX = x0 + m(2.05), barLen = 2.6;
  solid.add(P.island(M, { len: barLen, d: 0.62, front: M.cabSage, top: M.marble, x: barX, y: Y, z: zb + m(0.31), s }));
  const top = Y + m(0.9);
  // the espresso machine: a steel body, a black drip tray, two group heads; the grinder beside it; cups on top
  const em = new THREE.Group();
  em.add(box(M.steel, 0.66, 0.4, 0.46, 0, 0, 0, 0.03));
  em.add(box(M.black, 0.68, 0.035, 0.18, 0, 0.0, 0.29, 0.006));
  for (const dx of [-0.16, 0.16]) {
    em.add(cylinder(M.black, 0.045, 0.05, 0.06, dx, 0.16, 0.26, 14));
    em.add(box(M.black, 0.025, 0.025, 0.14, dx, 0.13, 0.34, 0.005));
  }
  for (const dx of [-0.2, -0.07, 0.06, 0.19]) em.add(P.cup(M, { r: 0.035, h: 0.07, x: dx, y: 0.4, z: 0.02, s: 1 }));
  solid.add(put(em, barX - m(0.55), top, zb + m(0.27), s));
  const grinder = new THREE.Group();
  grinder.add(cylinder(M.black, 0.075, 0.09, 0.3, 0, 0, 0, 18));
  grinder.add(lathe(M.glassAmber, [[0.03, 0.3], [0.1, 0.42], [0.11, 0.5], [0.001, 0.5]], 18));
  solid.add(put(grinder, barX + m(0.05), top, zb + m(0.3), s));
  for (let i = 0; i < 4; i++) solid.add(P.cup(M, { r: 0.04, h: 0.085, x: barX + m(0.45 + i * 0.11), y: top, z: zb + m(0.36), s }));
  solid.add(P.vase(M, { kind: 'jar', mat: M.glassAmber, k: 1, x: barX + m(1.0), y: top, z: zb + m(0.2), s }));
  // shelf of cups and jars, and the menu board (lines only, no words)
  const shY = Y + m(1.62);
  solid.add(P.floatShelf(M, { len: 1.3, x: barX - m(0.55), y: shY, z: zb, s }));
  for (let i = 0; i < 6; i++) solid.add(P.cup(M, { r: 0.04, h: 0.085, mat: i % 2 ? M.ceramicSage : M.ceramic, x: barX - m(1.05 - i * 0.2), y: shY + m(0.045), z: zb + m(0.12), s }));
  const mbX = barX + m(0.75), mbY = Y + m(1.42);
  solid.add(box(S.board, m(1.15), m(0.78), m(0.03), mbX, mbY, zb + m(0.02)));
  const R = rng(11);
  for (let i = 0; i < 5; i++) {
    const w = 0.35 + R() * 0.35;
    solid.add(box(S.chalk, m(w), m(0.022), m(0.01), mbX - m(0.45) + m(w / 2), mbY + m(0.62 - i * 0.12), zb + m(0.045)));
    solid.add(box(S.chalk, m(0.08), m(0.022), m(0.01), mbX + m(0.43), mbY + m(0.62 - i * 0.12), zb + m(0.045)));
  }
  // the counter facing the guests, with the pastry case and the till; the barista behind it
  const cX = x0 + m(2.0), cZ = zb + m(1.85);
  solid.add(P.island(M, { len: 2.2, d: 0.72, front: M.oak, top: M.marble, x: cX, y: Y, z: cZ, rot: 0, s }));
  const cTop = Y + m(0.9);
  const pc = new THREE.Group();
  pc.add(box(M.oak, 0.78, 0.04, 0.42, 0, 0, 0, 0.004));
  for (let i = 0; i < 6; i++) pc.add(ball(S.pastry, 0.045, -0.28 + (i % 3) * 0.14, 0.08 + (i > 2 ? 0.12 : 0), 0.06 - (i > 2 ? 0.08 : 0), 10));
  pc.add(box(M.oak, 0.78, 0.02, 0.36, 0, 0.17, -0.02));
  pc.add(box(M.glazing, 0.78, 0.32, 0.42, 0, 0.0, 0, 0.01));
  solid.add(put(pc, cX - m(0.55), cTop, cZ, s));
  solid.add(box(M.black, m(0.3), m(0.16), m(0.26), cX + m(0.6), cTop, cZ - m(0.05), 0.02));
  solid.add(P.cup(M, { r: 0.045, h: 0.09, mat: M.ceramicSage, x: cX + m(0.2), y: cTop, z: cZ + m(0.15), s }));
  solid.add(person(M, { coat: S.shirt, legs: M.ink, apron: S.apron, x: cX + m(0.1), y: Y, z: zb + m(1.05), rot: 0, s, reach: true }));
  // the guests' side: stools at the counter, three small tables, two guests
  for (const dx of [-0.75, -0.05]) {
    const at = { x: cX + m(dx), y: Y, z: cZ + m(0.62), s };
    solid.add(G(M, 'bar_stool', { ...at, rot: dx, maxH: 0.66 }) ?? P.barStool(M, { seat: M.leather, ...at }));
  }
  const tables = [[x0 + m(4.15), zb + m(0.9)], [x0 + m(5.45), zb + m(1.55)], [x0 + m(4.3), zb + m(2.75)]];
  tables.forEach(([tx, tz], i) => {
    solid.add(P.pedestalTable(M, { r: 0.32, h: 0.74, mat: M.marble, x: tx, y: Y, z: tz, s }));
    for (const side of [-1, 1]) {
      const cx = tx + side * m(0.55);
      const at = { x: cx, y: Y, z: tz, rot: side > 0 ? -Math.PI / 2 : Math.PI / 2, s };
      solid.add(G(M, 'dining_chair', at) ?? P.diningChair(M, at));
      C.push([cx, Y + 0.02, tz, m(0.25), m(0.25), 0.3]);
    }
    solid.add(P.cup(M, { r: 0.04, h: 0.08, x: tx - m(0.12), y: Y + m(0.74), z: tz + m(0.05), s }));
    C.push([tx, Y + 0.02, tz, m(0.33), m(0.33), 0.35]);
    if (i === 0) solid.add(person(M, { sit: true, coat: S.sweater, legs: M.ink, x: tx - m(0.55), y: Y, z: tz, rot: Math.PI / 2, s }));
    if (i === 1) solid.add(person(M, { sit: true, coat: S.coatB, legs: S.jeans, x: tx + m(0.55), y: Y, z: tz, rot: -Math.PI / 2, s }));
  });
  solid.add(P.plant(M, { kind: 'olive', potKind: 'terracotta', potR: 0.24, potH: 0.42, h: 1.55, x: x1 - m(0.38), y: Y, z: zb + m(0.4), seed: 4, s }));
  // the sign on the ledge's front face, over the stairs' side: a round plate with a cup, on an oak band
  solid.add(boxR(M.oak, [x0 + m(0.5), x0 + m(3.1)], [L - m(0.85), L - m(0.25)], [zf, zf + 0.12], 0.02));
  solid.add(pictoSign(M, 'cup', { r: 0.26, x: x0 + m(1.8), y: L - m(0.55), z: zf + 0.12, s }));
  C.push([cX, Y + 0.02, cZ, m(1.25), m(0.5), 0.45], [barX, Y, zb + m(0.33), m(1.45), m(0.42), 0.35], [x0 + m(0.66), Y, zb + m(0.33), m(0.4), m(0.42), 0.4], [x1 - m(0.38), Y, zb + m(0.4), m(0.34), m(0.34), 0.4]);
  return { solid, glow: [], glows: [], contacts: C, label: new THREE.Vector3(x0 + m(4.6), Y + m(0.9), zb + m(1.6)), table: { x: cX, z: cZ, y: cTop, s } };
}

// 매장, in the upper-left arch (the bath's place, rooms.js bathRoom): shelves of small product boxes on the back wall,
// a white counter at the left, a striped awning over the arch and a hanging sign beside it (outside the arch)
export function shopRoom(M, { y = 21 }) {
  const S = shopMats(M);
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  solid.add(planarBox(M.tileWhite, [-28.4, -19.8], [y, y + m(2.2)], [-2.83, -2.78], 0.8 * s));
  const R = rng(5);
  for (const sx of [-26.0, -22.4]) {
    const rows = [0.25, 0.62, 0.99, 1.36];
    solid.add(P.wallShelf(M, { len: 1.0, d: 0.24, rows, x: sx, y, z: -2.78, s }));
    for (const ry of rows) {
      let u = -0.44;
      while (u < 0.4) {
        const w = 0.07 + R() * 0.06, h = 0.1 + R() * 0.12;
        solid.add(box(S.goods[Math.floor(R() * S.goods.length)], m(w), m(h), m(0.12), sx + m(u + w / 2), y + m(ry + 0.024), -2.78 + m(0.12), 0.01));
        u += w + 0.015;
      }
    }
  }
  solid.add(box(M.paintWhite, m(0.95), m(0.92), m(0.45), -27.0, y, -0.95, 0.02));
  solid.add(box(M.oak, m(1.0), m(0.04), m(0.5), -27.0, y + m(0.92), -0.95, 0.01));
  solid.add(box(M.black, m(0.24), m(0.14), m(0.2), -27.2, y + m(0.96), -1.0, 0.02));
  solid.add(P.plant(M, { kind: 'snake', potKind: 'round', potR: 0.08, potH: 0.16, potMat: M.ceramic, h: 0.42, x: -20.45, y, z: -0.62, seed: 3, s }));
  // a customer under the awning, a shopping bag in hand, looking in
  solid.add(person(M, { coat: S.sweater, legs: S.jeans, bag: S.stripeB, x: -23.6, y, z: 3.2, rot: Math.PI + 0.35, s }));
  // the awning over the arch (its opening runs x -28.4 .. -19.8 up to y 28.4 on the face z = 0)
  const aw = new THREE.Group();
  const n = 9, W = 8.9, D = 2.2;
  for (let i = 0; i < n; i++) aw.add(box(i % 2 ? S.stripeB : S.stripeA, W / n, 0.08, D, -W / 2 + (i + 0.5) * (W / n), 0, D / 2));
  for (let i = 0; i < n; i++) aw.add(box(i % 2 ? S.stripeB : S.stripeA, W / n, 0.5, 0.06, -W / 2 + (i + 0.5) * (W / n), -0.5, D));
  aw.position.set(-24.1, y + 7.9, 0);
  aw.rotation.x = 0.42;
  solid.add(aw);
  // a round sign on the wall right of the arch (solid face from x -19.8 to -15.17)
  solid.add(pictoSign(M, 'bag', { r: 0.26, x: -17.5, y: y + 4.8, z: 0.02, s }));
  return {
    solid,
    contacts: [[-27.0, y, -0.95, m(0.55), m(0.3), 0.4], [-24.2, y, -2.6, m(1.2), m(0.2), 0.3]],
    label: new THREE.Vector3(-24.2, y + m(0.7), -1.0),
  };
}

// 오피스, on the left ledge in front of the shop (the study's place, rooms.js studyRoom): two desks side by side with
// screens facing out, task chairs, one person at work, the low bookcase of binders, a plant
export function officeRoom(M, { y = 21 }) {
  const S = shopMats(M);
  const s = 3.33;
  const m = (v) => v * s;
  const solid = new THREE.Group();
  solid.add(P.rug(M, { w: 2.0, d: 1.6, style: 'border', base: 0xe6e1d6, accent: 0xb9c9bd, key: 'office', x: -13.2, y, z: 4.4, s }));
  solid.add(P.bookcase(M, { len: 1.35, h: 0.82, d: 0.36, shelves: 2, wood: M.oak, x: -12.75, y, z: -2.4, s }));
  solid.add(P.bookRow(M, { len: 0.6, hMin: 0.22, hMax: 0.26, d: 0.24, x: -12.75 - m(0.35), y: y + m(0.025), z: -2.4, seed: 9, s }));
  solid.add(P.bookRow(M, { len: 0.5, hMin: 0.22, hMax: 0.26, d: 0.24, x: -12.75 + m(0.2), y: y + m(0.42), z: -2.4, seed: 4, s }));
  for (const [dX, who] of [[-15.6, true], [-11.95, false]]) {
    const dZ = 3.3;
    solid.add(P.desk(M, { len: 1.1, wid: 0.6, wood: M.oak, x: dX, y, z: dZ, s }));
    const dt = y + m(0.74);
    solid.add(box(M.black, m(0.05), m(0.16), m(0.05), dX, dt, dZ - m(0.15)));
    solid.add(box(M.black, m(0.56), m(0.34), m(0.03), dX, dt + m(0.14), dZ - m(0.17), 0.01));
    solid.add(box(S.screen, m(0.52), m(0.3), m(0.005), dX, dt + m(0.16), dZ - m(0.152)));
    solid.add(box(M.paintWhite, m(0.36), m(0.015), m(0.12), dX, dt, dZ + m(0.05), 0.005));
    solid.add(P.deskChair(M, { shell: who ? M.walnut : M.oak, x: dX, y, z: dZ + m(0.55), rot: Math.PI, s }));
    if (who) solid.add(person(M, { sit: true, coat: S.coatB, legs: M.ink, x: dX, y: y + m(0.02), z: dZ + m(0.62), rot: Math.PI, s }));
  }
  solid.add(P.plant(M, { kind: 'fiddle', potKind: 'cylinder', potR: 0.15, potH: 0.28, potMat: M.stoneware, h: 1.1, x: -17.2, y, z: -1.6, seed: 2, s }));
  return {
    solid,
    contacts: [[-15.6, y, 3.3, m(0.6), m(0.35), 0.4], [-11.95, y, 3.3, m(0.6), m(0.35), 0.4], [-12.75, y, -2.3, m(0.75), m(0.25), 0.4]],
    label: new THREE.Vector3(-13.2, y + m(0.9), 4.4),
  };
}

// the builder on the plinth (in place of the seated figure) and the small corner still being built: a stud frame,
// a board leaning on it, a step ladder. Plinth top at y = P; the letters stand behind z = 0.
export function buildCorner(M, { P: y }) {
  const S = shopMats(M);
  const s = 3.33;
  const m = (v) => v * s;
  const g = new THREE.Group();
  g.add(person(M, { coat: S.sweater, legs: M.ink, hat: 'hard', roll: true, x: 11, y, z: 5.6, rot: 0.5, s: s * (M.look === 'model' ? 1 : 1.25) }));
  // stud frame, 1.5 m wide and 1.3 m tall, along x near the plinth's front right
  const fx = 20.6, fz = 8.4;
  g.add(boxR(M.oak, [fx - m(0.75), fx + m(0.75)], [y, y + m(0.05)], [fz - m(0.045), fz + m(0.045)]));
  g.add(boxR(M.oak, [fx - m(0.75), fx + m(0.75)], [y + m(1.25), y + m(1.3)], [fz - m(0.045), fz + m(0.045)]));
  for (const u of [-0.72, -0.24, 0.24, 0.72]) g.add(boxR(M.oak, [fx + m(u) - m(0.025), fx + m(u) + m(0.025)], [y + m(0.05), y + m(1.25)], [fz - m(0.045), fz + m(0.045)]));
  // half of it already boarded
  g.add(boxR(M.paintWhite, [fx - m(0.75), fx], [y + m(0.05), y + m(1.25)], [fz + m(0.05), fz + m(0.065)]));
  // a step ladder at the frame's right end
  const lx = fx + m(1.05), lz = fz + m(0.25);
  for (const sx of [-1, 1]) {
    g.add(limb(0.11, [lx + sx * m(0.2), y, lz - m(0.25)], [lx + sx * m(0.18), y + m(1.0), lz], M.oak));
    g.add(limb(0.11, [lx + sx * m(0.2), y, lz + m(0.25)], [lx + sx * m(0.18), y + m(1.0), lz], M.oak));
  }
  for (const t of [0.3, 0.6, 0.9]) g.add(boxR(M.oak, [lx - m(0.2), lx + m(0.2)], [y + m(t), y + m(t) + 0.12], [lz - m(0.25) * (1 - t) - 0.2, lz - m(0.25) * (1 - t) + 0.2]));
  return g;
}
