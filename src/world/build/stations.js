// The Five School Design Elements as five playful kiosks along the eastern path.
import * as THREE from 'three';
import { PALETTE, clay, paint, mesh, rbox, signTexture, signMesh, polar, faceToward, heartShape, featherMesh, blobShadow } from '../kit.js';
import { STATION_R, STATION_ANGLES } from '../layout.js';

const plinth = (accent) => {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(3.3, 3.5, 0.5, 48), clay(PALETTE.white));
  base.position.y = 0.25;
  const ring = mesh(new THREE.TorusGeometry(3.32, 0.12, 8, 64), clay(accent));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.5;
  g.add(base, ring, blobShadow(4.4, 0.18));
  return g;
};

function books() {
  const g = new THREE.Group();
  const specs = [[PALETTE.aqua, 0], [PALETTE.orange, 0.25], [PALETTE.yellow, -0.18], [PALETTE.black, 0.1]];
  specs.forEach(([c, rot], i) => {
    const b = new THREE.Group();
    const cover = mesh(rbox(3.2, 0.62, 2.3, 0.12), clay(c, { roughness: 0.5 }));
    const pages = mesh(rbox(3.0, 0.46, 2.2, 0.06), clay('#FBF7F0'));
    pages.position.x = 0.14;
    b.add(cover, pages);
    b.position.y = 0.82 + i * 0.64;
    b.rotation.y = rot;
    g.add(b);
  });
  // pencil
  const pencil = new THREE.Group();
  const shaft = mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 6), clay(PALETTE.yellow, { roughness: 0.4 }));
  const tip = mesh(new THREE.ConeGeometry(0.22, 0.6, 6), clay('#E8C9A0'));
  tip.position.y = -2.0;
  tip.rotation.x = Math.PI;
  const lead = mesh(new THREE.ConeGeometry(0.08, 0.22, 6), clay(PALETTE.black));
  lead.position.y = -2.25;
  lead.rotation.x = Math.PI;
  const eraser = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 12), clay('#F28BA8'));
  eraser.position.y = 1.9;
  pencil.add(shaft, tip, lead, eraser);
  pencil.position.set(0.6, 4.95, 0.2);
  pencil.rotation.z = 0.35;
  g.add(pencil);
  // atom rings (STREAM+H: science + humanities)
  const atom = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = mesh(new THREE.TorusGeometry(0.9, 0.06, 8, 48), clay(PALETTE.black));
    r.rotation.set(Math.PI / 2, (i * Math.PI) / 3, 0);
    atom.add(r);
  }
  atom.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), paint(PALETTE.orange)));
  atom.position.set(-1.1, 4.9, 0);
  g.add(atom);
  g.userData.tick = (t) => { atom.rotation.y = t * 0.8; atom.rotation.x = t * 0.5; pencil.position.y = 4.95 + Math.sin(t * 1.6) * 0.15; };
  return g;
}

function signpost(font) {
  const g = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.16, 0.18, 6.4, 12), clay(PALETTE.black));
  pole.position.y = 3.6;
  g.add(pole);
  const words = [['DISCOVER', PALETTE.aqua, 0.6], ['EXPLORE', PALETTE.yellow, -0.5], ['EXPERIENCE', PALETTE.orange, 0.35], ['PLAN', PALETTE.white, -0.25]];
  words.forEach(([w, c, rot], i) => {
    const arrow = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.38); shape.lineTo(2.9, -0.38); shape.lineTo(3.4, 0); shape.lineTo(2.9, 0.38); shape.lineTo(0, 0.38); shape.closePath();
    const board = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 }), clay(c, { roughness: 0.5 }));
    board.position.z = -0.07;
    arrow.add(board);
    const label = signMesh(signTexture({ lines: [w], bg: c, font, w: 760, h: 170 }), 2.75, 0.62);
    label.position.set(1.48, 0, 0.13);
    arrow.add(label);
    arrow.position.set(0, 2.2 + i * 1.05, 0);
    arrow.rotation.y = rot;
    g.add(arrow);
  });
  const ball = mesh(new THREE.SphereGeometry(0.3, 16, 12), paint(PALETTE.orange));
  ball.position.y = 6.9;
  g.add(ball);
  return g;
}

function circle() {
  const g = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const stool = mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.9, 20), clay([PALETTE.aqua, PALETTE.yellow, PALETTE.orange, PALETTE.white][i % 4], { roughness: 0.5 }));
    stool.position.set(Math.cos(a) * 2.2, 0.95, Math.sin(a) * 2.2);
    g.add(stool);
  }
  const heart = mesh(new THREE.ExtrudeGeometry(heartShape(0.95), { depth: 0.45, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14, bevelSegments: 4, curveSegments: 24 }), paint(PALETTE.orange));
  heart.geometry.center();
  heart.position.y = 3.2;
  g.add(heart);
  g.userData.tick = (t) => {
    const s = 1 + Math.max(0, Math.sin(t * 2.6)) * 0.12;
    heart.scale.setScalar(s);
    heart.rotation.y = Math.sin(t * 0.7) * 0.6;
    heart.position.y = 3.2 + Math.sin(t * 1.3) * 0.15;
  };
  return g;
}

function megaphone() {
  const g = new THREE.Group();
  const podium = mesh(rbox(2.4, 2.2, 1.8, 0.2), clay(PALETTE.black, { roughness: 0.45 }));
  podium.position.y = 1.6;
  g.add(podium);
  const mp = new THREE.Group();
  const horn = mesh(new THREE.CylinderGeometry(1.1, 0.32, 2.4, 32, 1, true), new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.4, side: THREE.DoubleSide }));
  horn.rotation.z = -Math.PI / 2;
  const bell = mesh(new THREE.TorusGeometry(1.1, 0.1, 8, 40), clay(PALETTE.black));
  bell.rotation.y = Math.PI / 2;
  bell.position.x = 1.2;
  const grip = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 12), clay(PALETTE.black));
  grip.position.set(-0.7, -0.6, 0);
  mp.add(horn, bell, grip);
  mp.position.set(0, 3.6, 0);
  mp.rotation.y = -Math.PI / 2; // point toward the viewer (+Z)
  mp.rotation.z = 0;
  const pivot = new THREE.Group();
  pivot.add(mp);
  pivot.rotation.x = -0.35;
  pivot.position.y = 0.4;
  g.add(pivot);
  const waves = [];
  for (let i = 0; i < 3; i++) {
    const w = mesh(new THREE.TorusGeometry(1.0 + i * 0.6, 0.08, 6, 40, Math.PI * 0.9), paint([PALETTE.aqua, PALETTE.orange, PALETTE.yellow][i]));
    w.rotation.z = Math.PI * 0.05;
    w.position.set(0, 4.3, 1.8 + i * 0.5);
    g.add(w);
    waves.push(w);
  }
  g.userData.tick = (t) => {
    waves.forEach((w, i) => {
      const k = (t * 0.8 + i / 3) % 1;
      w.scale.setScalar(0.6 + k * 0.8);
      w.position.z = 1.6 + k * 1.8;
      w.visible = k < 0.92;
    });
  };
  return g;
}

function trophy() {
  const g = new THREE.Group();
  const pts = [[0, 0], [1.3, 0], [1.3, 0.3], [0.5, 0.5], [0.35, 1.4], [0.5, 1.6], [1.4, 2.2], [1.7, 3.6], [1.75, 3.8], [1.55, 3.8], [1.45, 3.62], [0.01, 3.4]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = mesh(new THREE.LatheGeometry(pts, 40), clay(PALETTE.yellow, { metalness: 0.55, roughness: 0.25 }));
  cup.position.y = 0.5;
  g.add(cup);
  for (const s of [-1, 1]) {
    const handle = mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 24, Math.PI * 1.2), clay(PALETTE.yellow, { metalness: 0.55, roughness: 0.25 }));
    handle.position.set(s * 1.75, 3.2, 0);
    handle.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 1.6;
    g.add(handle);
  }
  [PALETTE.aqua, PALETTE.yellow, PALETTE.orange, PALETTE.black].forEach((c, i) => {
    const f = featherMesh(c, 3.2, 1.1);
    f.position.set((i - 1.5) * 0.45, 3.6, 0);
    f.rotation.z = (1.5 - i) * 0.3;
    g.add(f);
  });
  g.userData.tick = (t) => { g.children.slice(-4).forEach((f, i) => { f.rotation.z = (1.5 - i) * 0.3 + Math.sin(t * 1.5 + i) * 0.05; }); };
  return g;
}

export function buildStations(world) {
  const font = world.cfg.canvasFont;
  const root = new THREE.Group();
  root.name = 'stations';
  const accents = [PALETTE.aqua, PALETTE.yellow, PALETTE.orange, PALETTE.black, PALETTE.aqua];
  const titles = [['01', 'STREAM+H'], ['02', 'CAREERS'], ['03', 'SEL + RESTORATIVE'], ['04', 'ADVOCACY'], ['05', 'HOUSE SYSTEM']];
  const makers = [books, () => signpost(font), circle, megaphone, trophy];
  const stations = [];
  STATION_ANGLES.forEach((deg, i) => {
    const g = new THREE.Group();
    g.add(plinth(accents[i]));
    const obj = makers[i]();
    g.add(obj);
    const sign = signMesh(signTexture({ lines: [titles[i][1]], sub: `DESIGN ELEMENT ${titles[i][0]}`, accent: accents[i], font, w: 1024, h: 330 }), 3.6, 1.16);
    sign.position.set(-2.3, 1.15, 2.7);
    sign.rotation.y = 0.35;
    sign.rotation.x = -0.25;
    g.add(sign);
    const at = polar(STATION_R, deg);
    g.position.copy(at);
    faceToward(g, at.x * 1.6, at.z * 1.6);
    if (obj.userData.tick) world.onTick(obj.userData.tick);
    root.add(g);
    world.addPiece(g, { kind: 'rise' });
    stations.push(g);
  });
  world.scene.add(root);
  return stations;
}
