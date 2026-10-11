// The floating paper island: ground, rim paint drips, paths, paint splats, droplet trees, floating feathers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, BRAND, clay, paint, mesh, rng, blobShape, featherMesh, polar, rbox } from '../kit.js';
import { ISLAND_RADIUS as R, HERO, SQUARE, ROAD, ARCH, isClear } from '../layout.js';

const decal = (color, order = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 - order, polygonOffsetUnits: -4 - order * 2 });

export function buildIsland(world) {
  const rand = rng(2028);
  const root = new THREE.Group();
  root.name = 'island';
  const ground = new THREE.Group();
  root.add(ground);

  /* top slab + soft rim */
  const top = mesh(new THREE.CylinderGeometry(R, R, 1.2, 160, 1), clay(PALETTE.cream, { roughness: 0.92 }), { cast: false });
  top.position.y = -0.6;
  ground.add(top);
  const rim = mesh(new THREE.TorusGeometry(R, 0.62, 18, 200), clay(PALETTE.white, { roughness: 0.8 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.6;
  ground.add(rim);

  /* underside: lathe with gentle noise + vertex-colour gradient */
  const profile = [[R + 0.3, -1.0], [R - 0.2, -2.6], [R - 2.6, -5.2], [R - 8, -8.8], [R - 16, -13.5], [R - 26, -19.5], [R - 36, -25], [0.01, -29]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const under = new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(40), 140);
  const pos = under.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cTop = new THREE.Color(PALETTE.sand);
  const cBot = new THREE.Color('#C9B8AE');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const n = (Math.sin(a * 7) * 0.5 + Math.sin(a * 13 + y * 0.4) * 0.35 + Math.sin(y * 0.9) * 0.3) * Math.min(1, -y / 6);
    const r = Math.hypot(x, z);
    if (r > 0.1) { pos.setX(i, x + (x / r) * n * 0.9); pos.setZ(i, z + (z / r) * n * 0.9); }
    tmp.copy(cTop).lerp(cBot, THREE.MathUtils.clamp(-y / 26, 0, 1));
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  under.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  under.computeVertexNormals();
  ground.add(mesh(under, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), { cast: false }));

  /* paint poured over the rim, dripping down the side (echoes the preloader) */
  const pours = [[18, PALETTE.aqua], [64, PALETTE.yellow], [128, PALETTE.orange], [196, PALETTE.aqua], [244, PALETTE.black], [300, PALETTE.orange], [338, PALETTE.yellow]];
  for (const [deg, color] of pours) {
    const g = new THREE.Group();
    const arc = THREE.MathUtils.degToRad(6 + rand() * 7);
    const band = mesh(new THREE.TorusGeometry(R, 0.7, 14, 40, arc), paint(color));
    band.rotation.x = Math.PI / 2;
    band.rotation.z = THREE.MathUtils.degToRad(90 - deg) - arc / 2;
    band.position.y = -0.58;
    g.add(band);
    const drips = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < drips; i++) {
      const a = THREE.MathUtils.degToRad(deg) + (rand() - 0.5) * arc * 0.9;
      const len = 0.8 + rand() * 2.6;
      const rad = 0.18 + rand() * 0.22;
      const d = mesh(new THREE.CapsuleGeometry(rad, len, 6, 10), paint(color));
      d.position.set(Math.sin(a) * (R + 0.45), -0.9 - len / 2, Math.cos(a) * (R + 0.45));
      g.add(d);
      const drop = mesh(new THREE.SphereGeometry(rad * 1.25, 14, 12), paint(color));
      drop.position.set(d.position.x, d.position.y - len / 2 - rad * 0.4, d.position.z);
      drop.scale.y = 1.25;
      g.add(drop);
    }
    root.add(g);
    world.addPiece(g, { kind: 'drip', at: polar(R, deg) });
  }

  /* paths and plazas (flat decals) */
  const decals = new THREE.Group();
  const ring = mesh(new THREE.RingGeometry(25.6, 27.6, 160), decal(PALETTE.sand, 0), { cast: false });
  ring.rotation.x = -Math.PI / 2;
  decals.add(ring);
  const spine = mesh(new THREE.PlaneGeometry(3.6, 26), decal(PALETTE.sand, 0), { cast: false });
  spine.rotation.x = -Math.PI / 2;
  spine.position.set(0, 0, 19);
  decals.add(spine);
  const hubPlaza = mesh(new THREE.CircleGeometry(19.5, 120), decal('#EFE7E1', 1), { cast: false });
  hubPlaza.rotation.x = -Math.PI / 2;
  decals.add(hubPlaza);
  BRAND.forEach((c, i) => {
    const q = mesh(new THREE.RingGeometry(8.2, 9.0, 60, 1, THREE.MathUtils.degToRad(i * 90 + 8), THREE.MathUtils.degToRad(74)), decal(c, 2), { cast: false });
    q.rotation.x = -Math.PI / 2;
    decals.add(q);
  });
  const heroPlaza = mesh(new THREE.CircleGeometry(10.5, 90), decal('#EFE7E1', 1), { cast: false });
  heroPlaza.rotation.x = -Math.PI / 2;
  heroPlaza.position.copy(HERO.center);
  decals.add(heroPlaza);
  const square = mesh(new THREE.CircleGeometry(9.5, 90), decal('#EFE7E1', 1), { cast: false });
  square.rotation.x = -Math.PI / 2;
  square.position.set(SQUARE.x, 0, SQUARE.z);
  decals.add(square);
  const roadSpur = mesh(new THREE.PlaneGeometry(3.2, 9), decal(PALETTE.sand, 0), { cast: false });
  roadSpur.rotation.x = -Math.PI / 2;
  roadSpur.position.set(ARCH.x, 0, ARCH.z + 4);
  decals.add(roadSpur);
  root.add(decals);

  /* paint splats */
  const splatGeo = (radius) => {
    const parts = [new THREE.ExtrudeGeometry(blobShape(radius, rand), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2 })];
    const n = 3 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const d = radius * (1.35 + rand() * 0.7);
      const c = new THREE.CylinderGeometry(radius * (0.06 + rand() * 0.1), radius * 0.12, 0.06, 18);
      c.rotateX(Math.PI / 2);
      c.translate(Math.cos(a) * d, Math.sin(a) * d, 0.03);
      parts.push(c);
    }
    const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
    g.rotateX(-Math.PI / 2);
    return g;
  };
  let placed = 0;
  for (let tries = 0; placed < 30 && tries < 400; tries++) {
    const r = 6 + Math.sqrt(rand()) * 38;
    const a = rand() * 360;
    const p = polar(r, a);
    const radius = 0.9 + rand() * 2.4;
    if (!isClear(p.x, p.z, radius * 0.6) || r + radius * 1.5 > R - 1) continue;
    const color = BRAND[placed % 4];
    const s = mesh(splatGeo(radius), paint(color), { cast: false });
    s.position.set(p.x, 0.02, p.z);
    s.rotation.y = rand() * Math.PI * 2;
    root.add(s);
    world.addPiece(s, { kind: 'splat' });
    placed++;
  }

  /* droplet trees (paint-drop canopies) */
  // paint-drop silhouette: round bottom, pointed tip
  const dropProfile = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    const r = t < 0.42 ? 1.3 * Math.sqrt(1 - Math.pow(1 - t / 0.42, 2)) : 1.3 * Math.pow(Math.max(0, 1 - (t - 0.42) / 0.58), 1.35);
    dropProfile.push(new THREE.Vector2(Math.max(r, 0.001), t * 3.4));
  }
  const dropGeo = new THREE.LatheGeometry(dropProfile, 28);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.22, 1.4, 10);
  // keep every camera's line of sight clear of trees
  const segDist = (px, pz, a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(px - (a.x + dx * t), pz - (a.z + dz * t));
  };
  const inSight = (x, z) => (world.sightlines || []).some(([a, b]) => segDist(x, z, a, b) < 4.5);
  let trees = 0;
  for (let tries = 0; trees < 34 && tries < 900; tries++) {
    const r = 15 + rand() * 29;
    const a = rand() * 360;
    const p = polar(r, a);
    if (!isClear(p.x, p.z, 2) || r > R - 2.5 || inSight(p.x, p.z)) continue;
    const s = 0.7 + rand() * 0.75;
    const tree = new THREE.Group();
    const trunk = mesh(trunkGeo, clay(PALETTE.white));
    trunk.position.y = 0.7;
    tree.add(trunk);
    const canopy = mesh(dropGeo, clay(rand() < 0.22 ? PALETTE.black : BRAND[Math.floor(rand() * 3)], { roughness: 0.45 }));
    canopy.position.y = 1.15;
    tree.add(canopy);
    tree.position.copy(p);
    tree.scale.setScalar(s);
    tree.rotation.y = rand() * 6.28;
    tree.userData.sway = rand() * 6.28;
    root.add(tree);
    world.addPiece(tree, { kind: 'pop' });
    world.onTick((t) => { tree.rotation.z = Math.sin(t * 0.9 + tree.userData.sway) * 0.025; });
    trees++;
  }

  /* the giant paintbrush from the preloader, resting near the hero plaza */
  const brush = new THREE.Group();
  const handle = mesh(new THREE.CylinderGeometry(0.32, 0.42, 7, 20), clay('#C98B54', { roughness: 0.5 }));
  handle.rotation.z = Math.PI / 2;
  handle.position.x = -4.2;
  const ferrule = mesh(rbox(1.6, 1.1, 2.6, 0.2), clay('#B8BEC4', { metalness: 0.6, roughness: 0.3 }));
  const bristle = mesh(rbox(2.2, 1.0, 2.5, 0.25), clay('#D9B98A', { roughness: 0.9 }));
  bristle.position.x = 1.8;
  const tip = mesh(rbox(1.3, 1.05, 2.55, 0.3), paint(PALETTE.teal));
  tip.position.x = 3.1;
  brush.add(handle, ferrule, bristle, tip);
  brush.position.set(12.5, 0.55, 37);
  brush.rotation.y = -0.6;
  root.add(brush);
  world.addPiece(brush, { kind: 'drop' });
  const trail = mesh(new THREE.ExtrudeGeometry(blobShape(1.8, rand, { wobble: 0.35, spikes: 3 }), { depth: 0.02, bevelEnabled: false }), paint(PALETTE.teal), { cast: false });
  trail.rotation.x = -Math.PI / 2;
  trail.scale.set(2.2, 0.8, 1);
  trail.position.set(16.2, 0.03, 34.6);
  trail.rotation.z = 0.6;
  root.add(trail);
  world.addPiece(trail, { kind: 'splat' });

  /* floating feathers and paint droplets around the island */
  for (let i = 0; i < 12; i++) {
    const color = BRAND[i % 4];
    const f = featherMesh(color, 2.2 + rand() * 1.2, 0.8);
    const a = rand() * 360;
    const r = 20 + rand() * 34;
    const p = polar(r, a, 9 + rand() * 12);
    f.position.copy(p);
    f.rotation.set(rand() * 0.8, rand() * 6.28, 0.4 + rand() * 0.8);
    const seed = rand() * 10;
    const baseY = p.y;
    world.onTick((t) => {
      f.position.y = baseY + Math.sin(t * 0.6 + seed) * 0.8;
      f.rotation.y += 0.0025;
      f.rotation.z = 0.6 + Math.sin(t * 0.8 + seed) * 0.25;
    });
    root.add(f);
    world.addPiece(f, { kind: 'pop' });
  }
  for (let i = 0; i < 18; i++) {
    const d = mesh(new THREE.SphereGeometry(0.25 + rand() * 0.55, 16, 14), paint(BRAND[i % 4]), { receive: false });
    const p = polar(R + 4 + rand() * 18, rand() * 360, -6 + rand() * 18);
    d.position.copy(p);
    d.scale.y = 1.2;
    const seed = rand() * 10;
    world.onTick((t) => { d.position.y = p.y + Math.sin(t * 0.7 + seed) * 0.6; });
    root.add(d);
    world.addPiece(d, { kind: 'pop' });
  }

  world.scene.add(root);
  world.island = root;
  return root;
}
