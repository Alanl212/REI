// Road to Fall 2028 (enrollment columns), the Portrait-of-a-Graduate arch, the Town Square,
// and the House Cup columns used on the Houses page.
import * as THREE from 'three';
import gsap from 'gsap';
import { PALETTE, BRAND, clay, paint, mesh, rbox, signTexture, signMesh, canvasTexture, roundRect, fitText, polar, blobShadow, rng } from '../kit.js';
import { ROAD, ARCH, SQUARE } from '../layout.js';

function labelSprite(tex, w, h) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, toneMapped: false, transparent: true, alphaTest: 0.05 }));
  s.scale.set(w, h, 1);
  return s;
}

/* ------------------------------------------------------------------ road */
export function buildRoad(world, enrollment) {
  const font = world.cfg.canvasFont;
  const root = new THREE.Group();
  root.name = 'road';
  const length = ROAD.fromX - ROAD.toX;
  const road = mesh(rbox(length, 0.16, 4.2, 0.08), clay('#2A2622', { roughness: 0.85 }), { cast: false });
  road.position.set((ROAD.fromX + ROAD.toX) / 2, 0.08, ROAD.z);
  root.add(road);
  for (let x = ROAD.toX + 1; x < ROAD.fromX - 1; x += 2.2) {
    const dash = mesh(new THREE.BoxGeometry(1.1, 0.04, 0.22), clay(PALETTE.yellow), { cast: false });
    dash.position.set(x, 0.18, ROAD.z);
    root.add(dash);
  }

  // start banner
  const banner = new THREE.Group();
  for (const s of [-1, 1]) {
    const pole = mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 10), clay(PALETTE.black));
    pole.position.set(0, 3, s * 2.8);
    banner.add(pole);
  }
  const cloth = signMesh(signTexture({ lines: ['FALL 2028'], sub: 'PLANNED OPENING*', bg: PALETTE.yellow, font, w: 1024, h: 330 }), 5.6, 1.8);
  cloth.position.set(0, 5.0, 0);
  cloth.rotation.y = -Math.PI / 2;
  banner.add(cloth);
  banner.position.set(ROAD.fromX - 0.5, 0, ROAD.z);
  root.add(banner);
  world.addPiece(banner, { kind: 'drop' });

  // enrollment columns: heights relative to the 432 full-build target
  const maxH = 9.5;
  const columns = enrollment.map((e, i) => {
    const g = new THREE.Group();
    g.position.set(ROAD.xs[i], 0, ROAD.columnZ);
    const color = [PALETTE.aqua, PALETTE.yellow, PALETTE.orange, PALETTE.aqua, PALETTE.black][i % 5];
    const h = (e.students / 432) * maxH;
    const col = mesh(rbox(2.7, 1, 2.7, 0.3, 3), clay(color, { roughness: 0.45 }));
    col.geometry.translate(0, 0.5, 0);
    const grow = new THREE.Group();
    grow.add(col);
    grow.scale.y = 0.001;
    g.add(grow);
    const cap = labelSprite(signTexture({ lines: [`${e.students}`], sub: e.label.toUpperCase(), bg: '#fff', accent: color, font, w: 640, h: 300 }), 3.0, 1.4);
    cap.position.y = 0.9;
    g.add(cap);
    g.add(blobShadow(2.4, 0.22));
    root.add(g);
    return { g, grow, cap, h };
  });

  // ghost column: proposed authorized maximum (705)
  const ghostH = (705 / 432) * maxH;
  const ghost = new THREE.Group();
  ghost.position.set(ROAD.ghostX, 0, ROAD.columnZ);
  const ghostMesh = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1, 2.7), new THREE.MeshStandardMaterial({ color: PALETTE.aqua, transparent: true, opacity: 0.18, depthWrite: false }));
  ghostMesh.geometry.translate(0, 0.5, 0);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(ghostMesh.geometry), new THREE.LineDashedMaterial({ color: '#111', dashSize: 0.3, gapSize: 0.2 }));
  edges.computeLineDistances();
  const ghostGrow = new THREE.Group();
  ghostGrow.add(ghostMesh, edges);
  ghostGrow.scale.y = 0.001;
  ghost.add(ghostGrow);
  const ghostCap = labelSprite(signTexture({ lines: ['705'], sub: 'PROPOSED MAX', bg: '#fff', accent: PALETTE.aqua, font, w: 640, h: 300 }), 3.0, 1.4);
  ghostCap.position.y = 0.9;
  ghost.add(ghostCap);
  root.add(ghost);

  let grown = false;
  function grow(on = true) {
    if (on === grown) return;
    grown = on;
    const dur = world.cfg.reducedMotion ? 0.01 : 1.1;
    columns.forEach((c, i) => {
      gsap.to(c.grow.scale, { y: on ? c.h : 0.001, duration: dur, delay: on ? i * 0.14 : 0, ease: on ? 'elastic.out(1, 0.55)' : 'power2.in' });
      gsap.to(c.cap.position, { y: on ? c.h + 1.0 : 0.9, duration: dur, delay: on ? i * 0.14 : 0, ease: on ? 'elastic.out(1, 0.55)' : 'power2.in' });
    });
    gsap.to(ghostGrow.scale, { y: on ? ghostH : 0.001, duration: dur * 1.3, delay: on ? 0.8 : 0, ease: 'power3.out' });
    gsap.to(ghostCap.position, { y: on ? ghostH + 1.0 : 0.9, duration: dur * 1.3, delay: on ? 0.8 : 0, ease: 'power3.out' });
  }

  world.scene.add(root);
  world.addPiece(root, { kind: 'pop', at: new THREE.Vector3(0, 0, ROAD.z) });
  return { root, grow };
}

/* ------------------------------------------------------------------ graduation arch */
export function buildArch(world) {
  const font = world.cfg.canvasFont;
  const g = new THREE.Group();
  g.name = 'arch';
  for (const s of [-1, 1]) {
    const pillar = mesh(rbox(1.3, 7, 1.3, 0.3), clay(PALETTE.white));
    pillar.position.set(s * 3.4, 3.5, 0);
    g.add(pillar);
    const foot = mesh(rbox(1.8, 0.5, 1.8, 0.15), clay(PALETTE.black));
    foot.position.set(s * 3.4, 0.25, 0);
    g.add(foot);
  }
  const top = mesh(new THREE.TorusGeometry(3.4, 0.65, 16, 48, Math.PI), clay(PALETTE.white));
  top.position.y = 7;
  g.add(top);
  const stripe = mesh(new THREE.TorusGeometry(3.4, 0.68, 16, 48, Math.PI * 0.34), clay(PALETTE.orange));
  stripe.position.y = 7;
  stripe.rotation.z = Math.PI * 0.33;
  g.add(stripe);
  // mortarboard
  const cap = new THREE.Group();
  const board = mesh(rbox(3.2, 0.2, 3.2, 0.06), clay(PALETTE.black, { roughness: 0.4 }));
  const crown = mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.8, 24), clay(PALETTE.black, { roughness: 0.4 }));
  crown.position.y = -0.5;
  const button = mesh(new THREE.SphereGeometry(0.16, 12, 10), clay(PALETTE.yellow));
  button.position.y = 0.16;
  const tassel = mesh(new THREE.CapsuleGeometry(0.1, 1.3, 4, 8), clay(PALETTE.yellow));
  tassel.position.set(1.5, -0.7, 0);
  cap.add(board, crown, button, tassel);
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 11.5;
  g.add(cap);
  world.onTick((t) => { cap.position.y = 11.5 + Math.sin(t * 1.4) * 0.2; cap.rotation.y = Math.PI / 4 + Math.sin(t * 0.6) * 0.2; });
  // bunting with five pennants (the five graduate traits)
  const colors = [PALETTE.aqua, PALETTE.yellow, PALETTE.orange, PALETTE.black, PALETTE.aqua];
  colors.forEach((c, i) => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, -1.1); s.closePath();
    const p = mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.6 }));
    const x = (i - 2) * 1.25;
    p.position.set(x, 6.55 - Math.cos((x / 3.4) * 1.2) * 0.3 + 0.3, 0);
    g.add(p);
    world.onTick((t) => { p.rotation.x = Math.sin(t * 2 + i) * 0.25; });
  });
  const sign = signMesh(signTexture({ lines: ['PORTRAIT OF A GRADUATE'], bg: '#fff', accent: PALETTE.orange, font, w: 1100, h: 230 }), 6.4, 1.34);
  sign.position.set(0, 1.6, 1.4);
  g.add(sign);
  g.position.copy(ARCH);
  g.rotation.y = Math.PI; // face north, toward the road camera
  g.add(blobShadow(5, 0.2));
  world.scene.add(g);
  world.addPiece(g, { kind: 'rise' });
  return g;
}

/* ------------------------------------------------------------------ town square */
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
    draw(14, 14, '#111');
    draw(0, 0, color);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#111';
    roundRect(ctx, 20, 20, w - 60, h - 120, 70);
    ctx.stroke();
    ctx.fillStyle = color === '#111111' ? '#fff' : '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = text.split(' ');
    const lines = [];
    let line = '';
    ctx.font = `800 60px ${font}`;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > w - 160 && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
    const lh = 66;
    const y0 = 20 + (h - 120) / 2 - ((lines.length - 1) * lh) / 2;
    lines.slice(0, 3).forEach((l, i) => {
      fitText(ctx, l, w - 140, 60, `800 {s}px ${font}`);
      ctx.fillText(l, (w - 40) / 2, y0 + i * lh);
    });
  });
}

export function buildSquare(world, { stats, voices }) {
  const font = world.cfg.canvasFont;
  const rand = rng(11);
  const root = new THREE.Group();
  root.name = 'square';
  root.position.set(SQUARE.x, 0, SQUARE.z);

  const totems = [];
  const heights = [5.6, 4.5, 3.5, 2.6];
  stats.forEach((s, i) => {
    const g = new THREE.Group();
    const a = (-0.9 + i * 0.6);
    g.position.set(Math.sin(a) * 4.2, 0, Math.cos(a) * 4.2);
    const color = BRAND[i];
    const body = mesh(new THREE.CylinderGeometry(1.05, 1.15, heights[i], 32), clay(color, { roughness: 0.45 }));
    body.position.y = heights[i] / 2;
    g.add(body);
    const top = mesh(new THREE.TorusGeometry(1.05, 0.14, 8, 40), clay(color === '#111111' ? PALETTE.yellow : PALETTE.white));
    top.rotation.x = Math.PI / 2;
    top.position.y = heights[i];
    g.add(top);
    const label = labelSprite(signTexture({ lines: [s.value], sub: s.label.toUpperCase(), bg: '#fff', accent: color, font, w: 640, h: 300 }), 3.0, 1.4);
    label.position.y = heights[i] + 1.1;
    g.add(label);
    g.add(blobShadow(1.8, 0.2));
    root.add(g);
    totems.push(g);
  });

  // benches around the edge
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 0.75 + (i / 5) * Math.PI * 1.5;
    const bench = mesh(rbox(2.4, 0.5, 0.9, 0.18), clay(i % 2 ? PALETTE.white : PALETTE.sand));
    bench.position.set(Math.sin(a) * 7.6, 0.45, Math.cos(a) * 7.6);
    bench.rotation.y = a;
    root.add(bench);
  }

  // floating speech bubbles: "what we heard"
  voices.forEach((v, i) => {
    const color = [PALETTE.white, PALETTE.yellow, PALETTE.aqua, PALETTE.white, PALETTE.orange, PALETTE.white][i % 6];
    const b = labelSprite(bubbleTexture(v, font, color), 4.4, 2.2);
    const a = (i / voices.length) * Math.PI * 2 + 0.3;
    const r = 5 + rand() * 2.5;
    const y = 6.5 + rand() * 3.5;
    b.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    const seed = rand() * 6;
    world.onTick((t) => { b.position.y = y + Math.sin(t * 0.9 + seed) * 0.35; });
    root.add(b);
  });

  world.scene.add(root);
  world.addPiece(root, { kind: 'rise' });
  return root;
}

/* ------------------------------------------------------------------ house cup columns */
export function buildHouseCup(world, houses, points) {
  const font = world.cfg.canvasFont;
  const max = Math.max(...points);
  const cols = houses.map((h, i) => {
    const g = new THREE.Group();
    // a podium-style bar chart in front of the House Wheel
    g.position.set(-4.8 + i * 3.2, 0, 6.2);
    const grow = new THREE.Group();
    const col = mesh(rbox(2.3, 1, 2.3, 0.3, 3), paint(h.color));
    col.geometry.translate(0, 0.5, 0);
    grow.add(col);
    grow.scale.y = 0.001;
    g.add(grow);
    const label = labelSprite(signTexture({ lines: [points[i].toLocaleString()], sub: 'POINTS (EXAMPLE)', bg: '#fff', accent: h.color, font, w: 640, h: 300 }), 2.6, 1.22);
    label.position.y = 0.8;
    label.visible = false;
    g.add(label);
    world.scene.add(g);
    g.add(blobShadow(1.9, 0.2));
    return { g, grow, label, h: (points[i] / max) * 5.5 };
  });
  let shown = false;
  return {
    show(on = true) {
      if (on === shown) return;
      shown = on;
      cols.forEach((c, i) => {
        c.label.visible = true;
        gsap.to(c.grow.scale, { y: on ? c.h : 0.001, duration: 1.2, delay: on ? i * 0.15 : 0, ease: on ? 'elastic.out(1,0.6)' : 'power2.in' });
        gsap.to(c.label.position, { y: on ? c.h + 1 : 0.8, duration: 1.2, delay: on ? i * 0.15 : 0, ease: on ? 'elastic.out(1,0.6)' : 'power2.in', onComplete: () => { if (!on) c.label.visible = false; } });
      });
    },
  };
}
