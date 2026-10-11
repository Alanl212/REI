// Fills the Grand Hall: learning zones (the five design elements), House bays, the House Wheel,
// the Road to 2028 light pillars, the Town Hall, the graduation steps and the House Cup podium.
import * as THREE from 'three';
import gsap from 'gsap';
import { PALETTE, clay, paint, mesh, rbox, signTexture, signMesh, canvasTexture, roundRect, fitText, featherMesh, heartShape, blobShadow, rng } from '../kit.js';
import { NAVE_HALF, OUTER, BAYS, PILLAR_ZS, ARCH, ZONES, FAR_WALL_Z, STEPS } from './layout.js';
import { plant, pouf, sofa, rug, table, laptop, bookshelf, globe, telescope, easel, robotArm, floorLamp, wallMap, TEAL, POUF_COLORS } from './props.js';
import { buildWheel } from './wheel.js';
import { neonMaterial } from './architecture.js';

const rand = rng(2028);
const faceNave = (side) => (side > 0 ? -Math.PI / 2 : Math.PI / 2);

/** Put obj in bay (side,k): dx = metres in from the nave edge, dz along the hall. Faces the nave. */
function inBay(root, obj, side, k, dx, dz = 0, turn = 0) {
  obj.position.set(side * (NAVE_HALF + dx), obj.position.y, BAYS[k] + dz);
  obj.rotation.y = faceNave(side) + turn;
  root.add(obj);
  return obj;
}

function labelSprite(tex, w, h) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, toneMapped: false, transparent: true, alphaTest: 0.05 }));
  s.scale.set(w, h, 1);
  return s;
}

function backShelves(root, side, k, h = 6.2) {
  for (const dz of [-2.4, 2.4]) inBay(root, bookshelf(4.4, h, 0.8), side, k, OUTER - NAVE_HALF - 0.55, dz);
}

/* ------------------------------------------------------------------ the five design elements */
function streamZone(world, root) {
  const { side, k } = ZONES.stream;
  backShelves(root, side, k);
  const t = inBay(root, table(3.2, 1.5), side, k, 5.6, -2.2);
  const arm = robotArm();
  arm.position.set(0, 1.12, 0);
  t.add(arm);
  world.onTick(arm.userData.tick);
  const lt = laptop();
  lt.position.set(1.0, 1.12, 0.2);
  t.add(lt);
  inBay(root, telescope(), side, k, 3.4, 2.6, 0.6);
  const gl = inBay(root, globe(1.1), side, k, 6.8, 2.8);
  world.onTick(gl.userData.tick);
  inBay(root, easel(3, true), side, k, 2.3, -3.4, -0.4);
  inBay(root, easel(8), side, k, 3.4, -0.6, 0.25);
  inBay(root, plant(1.3, 1), side, k, 1.2, 3.6);
  inBay(root, floorLamp(), side, k, 7.8, 0.4);
}

function signpost(font) {
  const g = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.6, 12), clay('#2a2a2a'));
  pole.position.y = 2.8;
  g.add(pole);
  [['DISCOVER', PALETTE.aqua, 0.5], ['EXPLORE', PALETTE.yellow, -0.45], ['EXPERIENCE', PALETTE.orange, 0.3], ['PLAN', '#ffffff', -0.2]].forEach(([w, c, rot], i) => {
    const arrow = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.3); shape.lineTo(2.3, -0.3); shape.lineTo(2.7, 0); shape.lineTo(2.3, 0.3); shape.lineTo(0, 0.3); shape.closePath();
    const board = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), clay(c, { roughness: 0.5 }));
    board.position.z = -0.05;
    arrow.add(board);
    const label = signMesh(signTexture({ lines: [w], bg: c, font, w: 760, h: 170 }), 2.2, 0.49);
    label.position.set(1.18, 0, 0.1);
    arrow.add(label);
    arrow.position.y = 1.8 + i * 0.85;
    arrow.rotation.y = rot;
    g.add(arrow);
  });
  return g;
}

function careersZone(world, root) {
  const { side, k } = ZONES.careers;
  const map = wallMap();
  map.position.y = 4.0;
  inBay(root, map, side, k, OUTER - NAVE_HALF - 0.4, 0);
  inBay(root, bookshelf(3, 6.2), side, k, OUTER - NAVE_HALF - 0.55, -3.4);
  inBay(root, signpost(world.cfg.canvasFont), side, k, 3.0, 0.4, 0.2);
  for (const dz of [-2.6, 2.6]) {
    const t = inBay(root, table(2.6, 1.3), side, k, 6.4, dz);
    const l = laptop();
    l.position.set(0, 1.1, 0);
    t.add(l);
    for (const s of [-1, 1]) inBay(root, pouf(POUF_COLORS[(dz > 0 ? 0 : 2) + (s > 0 ? 1 : 0)], 0.7), side, k, 6.4 - s * 1.4, dz);
  }
  inBay(root, plant(1.3, 0), side, k, 1.2, -3.6);
}

function selZone(world, root) {
  const { side, k } = ZONES.sel;
  backShelves(root, side, k, 5.6);
  inBay(root, rug(TEAL, 3.3), side, k, 5.4, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const p = pouf(POUF_COLORS[i % POUF_COLORS.length], 0.8);
    p.position.set(side * (NAVE_HALF + 5.4 + Math.cos(a) * 2.4), 0, BAYS[k] + Math.sin(a) * 2.4);
    root.add(p);
  }
  const heart = mesh(new THREE.ExtrudeGeometry(heartShape(0.7), { depth: 0.35, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 4, curveSegments: 24 }), new THREE.MeshStandardMaterial({ color: '#FCA00C', emissive: '#FC7A0C', emissiveIntensity: 1.6, roughness: 0.3 }));
  heart.geometry.center();
  heart.position.set(side * (NAVE_HALF + 5.4), 2.4, BAYS[k]);
  root.add(heart);
  world.onTick((t) => {
    heart.scale.setScalar(1 + Math.max(0, Math.sin(t * 2.6)) * 0.12);
    heart.rotation.y = t * 0.5;
    heart.position.y = 2.4 + Math.sin(t * 1.2) * 0.12;
  });
  inBay(root, floorLamp(), side, k, 8.4, -3.2);
  inBay(root, plant(1.4, 2), side, k, 1.3, -3.6);
  inBay(root, plant(1.2, 0), side, k, 1.3, 3.6);
}

function advocacyZone(world, root) {
  const { side, k } = ZONES.advocacy;
  const font = world.cfg.canvasFont;
  backShelves(root, side, k, 5.6);
  const stage = mesh(rbox(4.6, 0.5, 8, 0.15), clay('#2b313b', { roughness: 0.5 }));
  stage.position.y = 0.25;
  inBay(root, stage, side, k, 6.6, 0);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 7.8), neonMaterial('#FCA00C', 3));
  lip.position.set(side * (NAVE_HALF + 4.25), 0.47, BAYS[k]);
  root.add(lip);
  const podium = mesh(rbox(1.2, 1.4, 0.8, 0.1), clay('#B9783F', { roughness: 0.45 }));
  podium.position.y = 1.2;
  inBay(root, podium, side, k, 6.2, 0);
  const mic = new THREE.Group();
  const stand = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), clay('#222'));
  stand.position.y = 0.3;
  const head = mesh(new THREE.SphereGeometry(0.09, 12, 10), clay('#444', { metalness: 0.6 }));
  head.position.y = 0.62;
  mic.add(stand, head);
  mic.position.y = 1.9;
  inBay(root, mic, side, k, 6.2, 0);
  // megaphone resting on the stage
  const mp = new THREE.Group();
  const horn = mesh(new THREE.CylinderGeometry(0.55, 0.16, 1.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.4, side: THREE.DoubleSide }));
  horn.rotation.z = Math.PI / 2;
  mp.add(horn);
  mp.position.y = 1.05;
  inBay(root, mp, side, k, 5.4, 2.6, 0.9);
  const sign = signMesh(signTexture({ lines: ['YOUR VOICE', 'MATTERS'], bg: '#ffffff', accent: PALETTE.orange, font, w: 900, h: 420 }), 3.4, 1.6);
  sign.position.y = 4.6;
  inBay(root, sign, side, k, OUTER - NAVE_HALF - 0.5, 0);
  for (let i = 0; i < 4; i++) inBay(root, pouf(POUF_COLORS[i], 0.7), side, k, 2.3, -3 + i * 2);
}

function trophyZone(world, root) {
  const at = ZONES.trophy;
  const g = new THREE.Group();
  const ped = mesh(new THREE.CylinderGeometry(1.2, 1.4, 1.4, 32), clay('#2b313b', { roughness: 0.4, metalness: 0.3 }));
  ped.position.y = 0.7;
  g.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.05, 6, 48), neonMaterial(PALETTE.aqua, 4));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  g.add(ring);
  const pts = [[0, 0], [0.9, 0], [0.9, 0.2], [0.35, 0.35], [0.25, 1.0], [0.35, 1.15], [1.0, 1.6], [1.2, 2.6], [1.24, 2.75], [1.1, 2.75], [1.02, 2.62], [0.01, 2.45]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = mesh(new THREE.LatheGeometry(pts, 40), clay('#F8C93A', { metalness: 0.85, roughness: 0.2 }));
  cup.position.y = 1.4;
  g.add(cup);
  ['#0FD1EB', '#FCD615', '#FCA00C', '#111111'].forEach((c, i) => {
    const f = featherMesh(c, 2.4, 0.85);
    f.position.set((i - 1.5) * 0.32, 3.9, 0);
    f.rotation.z = (1.5 - i) * 0.28;
    g.add(f);
  });
  g.position.copy(at);
  g.rotation.y = -0.5;
  root.add(g);
  world.addPiece(g, { kind: 'drop' });
}

/* ------------------------------------------------------------------ house bays */
function bannerTexture(h, font) {
  return canvasTexture(512, 1024, (ctx, w, hh) => {
    ctx.fillStyle = h.color;
    ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, 0, 26, hh);
    ctx.fillRect(w - 26, 0, 26, hh);
    // swallowtail bottom
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.lineTo(w / 2, hh - 110);
    ctx.lineTo(w, hh);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // feather crest
    ctx.save();
    ctx.translate(w / 2, 470);
    ctx.fillStyle = h.ink === '#FFFFFF' ? '#ffffff' : '#111111';
    ctx.beginPath();
    ctx.moveTo(0, 190);
    ctx.bezierCurveTo(-120, 60, -110, -110, 10, -230);
    ctx.bezierCurveTo(110, -100, 110, 70, 0, 190);
    ctx.fill();
    ctx.strokeStyle = h.color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, 230);
    ctx.quadraticCurveTo(14, 0, 8, -200);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = h.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, h.name.toUpperCase(), w - 70, 120, `800 {s}px ${font}`);
    ctx.fillText(h.name.toUpperCase(), w / 2, 130);
    ctx.font = `600 34px ${font}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(`${(h.language || '').toUpperCase()} · ${(h.meaning || '').toUpperCase()}`, w / 2, 210);
    ctx.globalAlpha = 1;
    fitText(ctx, (h.pillar || '').toUpperCase(), w - 90, 46, `800 {s}px ${font}`);
    ctx.fillText((h.pillar || '').toUpperCase(), w / 2, 780);
  });
}

export function houseNeonMap(houses) {
  const map = {};
  ZONES.houseBays.forEach((b, i) => {
    const h = houses[i];
    if (!h) return;
    const dark = /^#(000|111)/i.test(h.color);
    map[`${b.side}:${b.k}`] = dark ? '#ffffff' : h.color;
  });
  map[`${ZONES.wheelBay.side}:${ZONES.wheelBay.k}`] = '#FFB347';
  return map;
}

function houseBays(world, root, houses) {
  const font = world.cfg.canvasFont;
  return ZONES.houseBays.map((b, i) => {
    const h = houses[i];
    const g = new THREE.Group();
    g.name = 'house-' + h.key;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.8), new THREE.MeshStandardMaterial({ map: bannerTexture(h, font), side: THREE.DoubleSide, roughness: 0.75, transparent: true, alphaTest: 0.1 }));
    banner.position.set(b.side * (NAVE_HALF + 1.6), 9.4, b.z);
    banner.rotation.y = faceNave(b.side);
    g.add(banner);
    const rod = mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8), clay('#d8b07a', { metalness: 0.7, roughness: 0.3 }));
    rod.rotation.x = Math.PI / 2;
    rod.position.set(b.side * (NAVE_HALF + 1.6), 12.85, b.z);
    g.add(rod);
    world.onTick((t) => { banner.rotation.z = Math.sin(t * 0.8 + i) * 0.02; });
    const dark = /^#(000|111)/i.test(h.color);
    inBay(g, rug(h.color, 3.4), b.side, b.k, 5.4, 0);
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2 + 0.3;
      const p = pouf(j % 2 ? h.color : dark ? '#F2ECE8' : '#ffffff', 0.75);
      p.position.set(b.side * (NAVE_HALF + 5.4 + Math.cos(a) * 2.5), 0, b.z + Math.sin(a) * 2.5);
      g.add(p);
    }
    const feather = featherMesh(h.color, 7, 2.3);
    feather.position.set(b.side * (NAVE_HALF + 8.3), 0.2, b.z + 2.6);
    feather.rotation.set(-0.05, faceNave(b.side), b.side * 0.12);
    g.add(feather);
    world.onTick((t) => { feather.rotation.z = b.side * 0.12 + Math.sin(t * 0.9 + i) * 0.04; });
    for (const dz of [-2.6]) inBay(g, bookshelf(4.2, 8.5, 0.8), b.side, b.k, OUTER - NAVE_HALF - 0.55, dz);
    inBay(g, plant(1.3, i % 3), b.side, b.k, 1.2, 3.6);
    // invisible hit area covering the archway, so the whole bay is clickable
    const hit = new THREE.Mesh(new THREE.BoxGeometry(OUTER - NAVE_HALF, ARCH.springY + ARCH.halfWidth, ARCH.halfWidth * 2), new THREE.MeshBasicMaterial());
    hit.visible = false;
    hit.position.set(b.side * (NAVE_HALF + (OUTER - NAVE_HALF) / 2), (ARCH.springY + ARCH.halfWidth) / 2, b.z);
    g.add(hit);
    root.add(g);
    world.interactive(g, { label: `Visit House ${h.name}`, onClick: () => world.emit('house', h) });
    return g;
  });
}

/* ------------------------------------------------------------------ road to 2028 */
function roadPillars(world, root, enrollment) {
  const font = world.cfg.canvasFont;
  const { x, zs, ghostZ } = ZONES.road;
  const maxH = 11;
  const colors = ['#0FD1EB', '#FCD615', '#FCA00C', '#0FD1EB', '#FFFFFF'];
  const pillars = enrollment.map((e, i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, zs[i]);
    const base = mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.3, 32), clay('#2b313b', { metalness: 0.3, roughness: 0.4 }));
    base.position.y = 0.15;
    g.add(base);
    const grow = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(colors[i]).multiplyScalar(3) }));
    core.geometry.translate(0, 0.5, 0);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: colors[i], transparent: true, opacity: 0.28, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: colors[i], emissiveIntensity: 0.6 }));
    shell.geometry.translate(0, 0.5, 0);
    grow.add(core, shell);
    grow.scale.y = 0.001;
    grow.position.y = 0.3;
    g.add(grow);
    const label = labelSprite(signTexture({ lines: [`${e.students}`], sub: e.label.toUpperCase(), bg: '#fff', accent: colors[i] === '#FFFFFF' ? '#111' : colors[i], font, w: 640, h: 300 }), 2.8, 1.3);
    label.position.y = 1.2;
    label.visible = false;
    g.add(label);
    root.add(g);
    return { grow, label, h: (e.students / 432) * maxH };
  });
  const ghost = new THREE.Group();
  ghost.position.set(x, 0, ghostZ);
  const ghostH = (705 / 432) * maxH;
  const ghostGeo = new THREE.CylinderGeometry(1.0, 1.0, 1, 24, 1, true);
  ghostGeo.translate(0, 0.5, 0);
  const ghostGrow = new THREE.Group();
  ghostGrow.add(new THREE.Mesh(ghostGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.6, 1.9), wireframe: true, transparent: true, opacity: 0.35 })));
  ghostGrow.scale.y = 0.001;
  ghost.add(ghostGrow);
  const ghostLabel = labelSprite(signTexture({ lines: ['705'], sub: 'PROPOSED MAX', bg: '#fff', accent: PALETTE.aqua, font, w: 640, h: 300 }), 2.8, 1.3);
  ghostLabel.visible = false;
  ghost.add(ghostLabel);
  root.add(ghost);

  const start = signMesh(signTexture({ lines: ['FALL 2028'], sub: 'PLANNED OPENING*', bg: PALETTE.yellow, font, w: 900, h: 330 }), 3.6, 1.32);
  start.position.set(x, 1.6, zs[0] + 4.2);
  const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), clay('#222'));
  post.position.set(x, 0.5, zs[0] + 4.2);
  root.add(start, post);

  let shown = false;
  return {
    grow(on = true) {
      if (on === shown) return;
      shown = on;
      const d = world.cfg.reducedMotion ? 0.01 : 1.2;
      pillars.forEach((p, i) => {
        p.label.visible = true;
        gsap.to(p.grow.scale, { y: on ? p.h : 0.001, duration: d, delay: on ? i * 0.15 : 0, ease: on ? 'elastic.out(1, 0.6)' : 'power2.in' });
        gsap.to(p.label.position, { y: on ? p.h + 1.5 : 1.2, duration: d, delay: on ? i * 0.15 : 0, ease: on ? 'elastic.out(1, 0.6)' : 'power2.in', onComplete: () => { if (!on) p.label.visible = false; } });
      });
      ghostLabel.visible = true;
      gsap.to(ghostGrow.scale, { y: on ? ghostH : 0.001, duration: d * 1.4, delay: on ? 0.9 : 0, ease: 'power3.out' });
      gsap.to(ghostLabel.position, { y: on ? ghostH + 1.5 : 0.5, duration: d * 1.4, delay: on ? 0.9 : 0, ease: 'power3.out', onComplete: () => { if (!on) ghostLabel.visible = false; } });
    },
  };
}

/* ------------------------------------------------------------------ town hall */
function bubbleTexture(text, font, color) {
  return canvasTexture(768, 384, (ctx, w, h) => {
    const draw = (dx, dy, fill) => {
      ctx.fillStyle = fill;
      roundRect(ctx, 20 + dx, 20 + dy, w - 60, h - 120, 70);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(140 + dx, h - 104 + dy);
      ctx.lineTo(110 + dx, h - 30 + dy);
      ctx.lineTo(230 + dx, h - 104 + dy);
      ctx.closePath();
      ctx.fill();
    };
    draw(12, 12, 'rgba(0,0,0,0.6)');
    draw(0, 0, color);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = text.split(' ');
    const lines = [];
    let line = '';
    ctx.font = `800 58px ${font}`;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > w - 160 && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
    const lh = 64;
    const y0 = 20 + (h - 120) / 2 - ((lines.length - 1) * lh) / 2;
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, (w - 40) / 2, y0 + i * lh));
  });
}

function townHall(world, root, { stats, voices }) {
  const font = world.cfg.canvasFont;
  ZONES.townHall.forEach(({ side, k }, n) => {
    backShelves(root, side, k, 6.2);
    inBay(root, rug(n ? '#F59A1B' : TEAL, 3.4), side, k, 5.4, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = pouf(POUF_COLORS[(i + n) % POUF_COLORS.length], 0.72);
      p.position.set(side * (NAVE_HALF + 5.4 + Math.cos(a) * 2.6), 0, BAYS[k] + Math.sin(a) * 2.6);
      root.add(p);
    }
    inBay(root, floorLamp(), side, k, 8.6, 3.4);
    inBay(root, plant(1.3, n), side, k, 1.2, -3.6);
  });
  // stat totems along the left aisle
  const zs = [-57, -62.5, -68, -73.5];
  const heights = [6.2, 5.0, 3.9, 2.9];
  const colors = ['#0FD1EB', '#FCD615', '#FCA00C', '#FFFFFF'];
  stats.forEach((s, i) => {
    const g = new THREE.Group();
    g.position.set(-7.4, 0, zs[i]);
    const body = mesh(rbox(1.5, heights[i], 1.5, 0.3), clay('#20252d', { roughness: 0.35, metalness: 0.3 }));
    body.position.y = heights[i] / 2;
    g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.12, 1.56), neonMaterial(colors[i], 4));
    band.position.y = heights[i] - 0.25;
    g.add(band);
    const label = labelSprite(signTexture({ lines: [s.value], sub: s.label.toUpperCase(), bg: '#fff', accent: colors[i] === '#FFFFFF' ? '#111' : colors[i], font, w: 640, h: 300 }), 2.6, 1.22);
    label.position.y = heights[i] + 1.0;
    g.add(label);
    root.add(g);
    world.addPiece(g, { kind: 'rise' });
  });
  // what families told us, floating in front of the bays
  voices.forEach((v, i) => {
    const color = ['#ffffff', '#FCD615', '#0FD1EB', '#ffffff', '#FCA00C', '#ffffff'][i % 6];
    const b = labelSprite(bubbleTexture(v, font, color), 3.8, 1.9);
    const y = 9 + (i % 3) * 1.4 + rand() * 0.6;
    b.position.set(-11.5 + (i % 2) * 2.4, y, -56 - i * 3.6);
    const seed = rand() * 6;
    world.onTick((t) => { b.position.y = y + Math.sin(t * 0.9 + seed) * 0.3; });
    root.add(b);
  });
}

/* ------------------------------------------------------------------ graduation steps */
function graduation(world, root) {
  const font = world.cfg.canvasFont;
  const z = STEPS.from - 1.5;
  const pts = [];
  const sag = (x) => 14.5 - (1 - (x / 10) ** 2) * 1.6;
  for (let x = -10; x <= 10; x += 0.5) pts.push(new THREE.Vector3(x, sag(x), z));
  const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#222' }));
  root.add(string);
  ['#0FD1EB', '#FCD615', '#FCA00C', '#111111', '#0FD1EB', '#FCD615', '#FCA00C'].forEach((c, i) => {
    const x = -7.5 + i * 2.5;
    const s = new THREE.Shape();
    s.moveTo(-0.7, 0); s.lineTo(0.7, 0); s.lineTo(0, -1.6); s.closePath();
    const p = mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.7 }), { cast: false });
    p.position.set(x, sag(x), z);
    root.add(p);
    world.onTick((t) => { p.rotation.x = Math.sin(t * 1.6 + i) * 0.2; });
  });
  // mortarboards tossed into the air
  for (let i = 0; i < 6; i++) {
    const cap = new THREE.Group();
    const board = mesh(rbox(1.3, 0.08, 1.3, 0.03), clay('#111', { roughness: 0.4 }));
    const crown = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.34, 20), clay('#111', { roughness: 0.4 }));
    crown.position.y = -0.2;
    const tassel = mesh(new THREE.CapsuleGeometry(0.04, 0.5, 4, 6), clay(['#FCD615', '#0FD1EB', '#FCA00C'][i % 3]));
    tassel.position.set(0.62, -0.28, 0);
    cap.add(board, crown, tassel);
    const base = new THREE.Vector3(-7 + i * 2.8 + rand(), 7.5 + rand() * 4, z - 3 - rand() * 4);
    cap.position.copy(base);
    const seed = rand() * 6;
    world.onTick((t) => {
      cap.position.y = base.y + Math.sin(t * 0.8 + seed) * 0.6;
      cap.rotation.set(Math.sin(t * 0.5 + seed) * 0.5, t * 0.4 + seed, Math.cos(t * 0.6 + seed) * 0.4);
    });
    root.add(cap);
  }
  const sign = signMesh(signTexture({ lines: ['PORTRAIT OF A GRADUATE'], bg: '#ffffff', accent: PALETTE.orange, font, w: 1100, h: 230 }), 6.2, 1.3);
  sign.position.set(0, STEPS.count * STEPS.rise + 0.9, FAR_WALL_Z + 2.6);
  root.add(sign);
}

/* ------------------------------------------------------------------ house cup podium */
function houseCup(world, root, houses, points) {
  const font = world.cfg.canvasFont;
  const max = Math.max(...points);
  const cols = houses.map((h, i) => {
    const g = new THREE.Group();
    g.position.set(ZONES.cup.x, 0, ZONES.cup.zs[i]);
    g.rotation.y = -Math.PI / 2;
    const grow = new THREE.Group();
    const col = mesh(rbox(2.0, 1, 2.0, 0.25, 3), paint(h.color));
    col.geometry.translate(0, 0.5, 0);
    grow.add(col);
    grow.scale.y = 0.001;
    g.add(grow);
    const label = labelSprite(signTexture({ lines: [points[i].toLocaleString()], sub: 'POINTS (EXAMPLE)', bg: '#fff', accent: h.color, font, w: 640, h: 300 }), 2.3, 1.08);
    label.position.y = 0.8;
    label.visible = false;
    g.add(label);
    root.add(g);
    return { grow, label, h: (points[i] / max) * 5 };
  });
  let shown = false;
  return {
    show(on = true) {
      if (on === shown) return;
      shown = on;
      cols.forEach((c, i) => {
        c.label.visible = true;
        gsap.to(c.grow.scale, { y: on ? c.h : 0.001, duration: 1.2, delay: on ? i * 0.15 : 0, ease: on ? 'elastic.out(1,0.6)' : 'power2.in' });
        gsap.to(c.label.position, { y: on ? c.h + 0.9 : 0.8, duration: 1.2, delay: on ? i * 0.15 : 0, ease: on ? 'elastic.out(1,0.6)' : 'power2.in', onComplete: () => { if (!on) c.label.visible = false; } });
      });
    },
  };
}

/* ------------------------------------------------------------------ everything else */
function libraries(world, root) {
  ZONES.library.forEach(({ side, k }, i) => {
    backShelves(root, side, k, 6.2);
    if (i % 2 === 0) {
      inBay(root, sofa(['#F59A1B', TEAL, '#F8C93A'][i % 3]), side, k, 6.6, 0);
      inBay(root, rug('#2b313b', 2.6), side, k, 4.4, 0);
      inBay(root, pouf(POUF_COLORS[i % 5], 0.8), side, k, 3.4, -1.6);
      inBay(root, pouf(POUF_COLORS[(i + 2) % 5], 0.8), side, k, 3.4, 1.6);
    } else {
      const t = inBay(root, table(3.4, 1.4), side, k, 5.4, 0);
      const l = laptop();
      l.position.set(-0.8, 1.1, 0);
      t.add(l);
      const gl = globe(0.6);
      gl.position.set(1.0, 1.1, 0);
      t.add(gl);
      world.onTick(gl.userData.tick);
      for (const dz of [-1.1, 1.1]) inBay(root, pouf(POUF_COLORS[(i + (dz > 0 ? 1 : 3)) % 5], 0.7), side, k, 3.9, dz);
      inBay(root, easel(i + 11), side, k, 2.4, 3.2, -0.3);
    }
    inBay(root, floorLamp(), side, k, 8.6, -3.4);
    inBay(root, plant(1.2 + (i % 3) * 0.1, i % 3), side, k, 1.2, (i % 2 ? -1 : 1) * 3.6);
  });
  // big planters at the foot of the pillars, like the reference
  PILLAR_ZS.forEach((z, i) => {
    if (i === 0) return;
    for (const side of [-1, 1]) {
      if ((i + (side > 0 ? 1 : 0)) % 2) continue;
      const p = plant(1.7, (i + side + 2) % 3);
      p.position.set(side * (NAVE_HALF - 2.2), 0, z + 1.6);
      root.add(p);
      world.addPiece(p, { kind: 'pop' });
    }
  });
}

export function furnishHall(world, { houses, enrollment, stats, voices, cupPoints }) {
  const root = new THREE.Group();
  root.name = 'zones';
  streamZone(world, root);
  careersZone(world, root);
  selZone(world, root);
  advocacyZone(world, root);
  trophyZone(world, root);
  const houseGroups = houseBays(world, root, houses);
  const wheel = buildWheel(world, houses, { position: ZONES.wheel.pos, yaw: ZONES.wheel.yaw, onSpinResult: (h) => world.emit('spin', h) });
  wheel.wheel.scale.setScalar(0.88);
  const wb = ZONES.wheelBay;
  const stage = mesh(new THREE.CylinderGeometry(4.6, 4.9, 0.45, 64), clay('#20252d', { roughness: 0.3, metalness: 0.3 }));
  stage.position.set(ZONES.wheel.pos.x, 0.22, wb.z);
  root.add(stage);
  const stageRing = new THREE.Mesh(new THREE.TorusGeometry(4.75, 0.06, 6, 96), neonMaterial('#FCD615', 4));
  stageRing.rotation.x = Math.PI / 2;
  stageRing.position.set(ZONES.wheel.pos.x, 0.46, wb.z);
  root.add(stageRing);
  const curtain = mesh(new THREE.PlaneGeometry(9.6, 17), new THREE.MeshStandardMaterial({ color: '#4a1d2a', roughness: 0.9 }), { cast: false });
  curtain.position.set(wb.side * (OUTER - 0.1), 8.5, wb.z);
  curtain.rotation.y = faceNave(wb.side);
  root.add(curtain);
  const spot = new THREE.SpotLight('#ffd7a0', 260, 30, 0.55, 0.5, 1.6);
  spot.position.set(wb.side * (NAVE_HALF + 0.5), 16.5, wb.z + 2);
  spot.target.position.set(ZONES.wheel.pos.x, 6, wb.z);
  root.add(spot, spot.target);
  inBay(root, plant(1.4, 1), wb.side, wb.k, 1.2, -3.8);
  inBay(root, plant(1.4, 2), wb.side, wb.k, 1.2, 3.8);
  const road = roadPillars(world, root, enrollment);
  townHall(world, root, { stats, voices });
  graduation(world, root);
  const cup = houseCup(world, root, houses, cupPoints);
  libraries(world, root);
  // warm practical lights in the bays
  for (const side of [-1, 1]) {
    for (const z of [-12, -24, -42, -66]) {
      const l = new THREE.PointLight('#ffb870', 55, 24, 1.7);
      l.position.set(side * (NAVE_HALF + 5), 5.5, z);
      root.add(l);
    }
  }
  world.scene.add(root);
  return { root, wheel, road, cup, houseGroups };
}

export { blobShadow };
