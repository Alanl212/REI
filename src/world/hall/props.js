// Furniture kit for the learning zones. Geometry is cached and shared so the hall stays light.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clay, mesh, rbox, canvasTexture, rng, PALETTE } from '../kit.js';

const cache = new Map();
const once = (key, make) => (cache.has(key) ? cache.get(key) : (cache.set(key, make()), cache.get(key)));
const rand = rng(404);

export const TEAL = '#14A9B8';
export const POUF_COLORS = [TEAL, '#F59A1B', '#F8C93A', '#0E7F8C', '#E9873A'];

/* ------------------------------------------------------------------ plants */
function leafGeo(len, width, curl) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(width, len * 0.45, 0, len);
  s.quadraticCurveTo(-width, len * 0.45, 0, 0);
  const g = new THREE.ShapeGeometry(s, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / len;
    p.setZ(i, curl * y * y * len + Math.abs(p.getX(i)) * 0.35);
  }
  g.computeVertexNormals();
  return g;
}

function foliage(variant) {
  return once('foliage' + variant, () => {
    const parts = [];
    const r = rng(variant * 31 + 7);
    const n = variant === 0 ? 14 : variant === 1 ? 9 : 22;
    for (let i = 0; i < n; i++) {
      const len = variant === 0 ? 1.6 + r() * 0.9 : variant === 1 ? 2.4 + r() * 0.8 : 0.9 + r() * 0.5;
      const w = variant === 0 ? 0.45 : variant === 1 ? 0.22 : 0.35;
      const g = leafGeo(len, w, variant === 1 ? 0.55 : 0.3);
      const tilt = 0.25 + r() * (variant === 1 ? 0.9 : 0.7);
      g.rotateX(tilt);
      g.rotateY((i / n) * Math.PI * 2 + r() * 0.5);
      g.translate(0, 0.1 + r() * 0.3, 0);
      parts.push(g);
    }
    return mergeGeometries(parts);
  });
}

export function plant(scale = 1, variant = Math.floor(rand() * 3)) {
  const g = new THREE.Group();
  const potGeo = once('pot', () => new THREE.CylinderGeometry(0.55, 0.42, 0.9, 24));
  const pot = mesh(potGeo, clay('#ECE7E1', { roughness: 0.4 }));
  pot.position.y = 0.45;
  const leaves = mesh(foliage(variant), clay(['#2F7D3B', '#3E8E41', '#2B6E35'][variant], { roughness: 0.6, side: THREE.DoubleSide }), { cast: true, receive: false });
  leaves.position.y = 0.8;
  g.add(pot, leaves);
  g.scale.setScalar(scale);
  return g;
}

/* ------------------------------------------------------------------ seating */
export function pouf(color = TEAL, s = 1) {
  const geo = once('pouf', () => {
    const pts = [[0, 0], [0.62, 0], [0.72, 0.08], [0.75, 0.25], [0.75, 0.58], [0.7, 0.72], [0.55, 0.78], [0, 0.8]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 28);
  });
  const m = mesh(geo, clay(color, { roughness: 0.85 }));
  m.scale.setScalar(s);
  return m;
}

export function sofa(color = '#F59A1B') {
  const g = new THREE.Group();
  const mat = clay(color, { roughness: 0.85 });
  const seat = mesh(rbox(3.6, 0.6, 1.3, 0.25), mat);
  seat.position.y = 0.55;
  const back = mesh(rbox(3.6, 1.1, 0.4, 0.2), mat);
  back.position.set(0, 1.05, -0.5);
  const base = mesh(rbox(3.4, 0.25, 1.1, 0.08), clay('#2b2b2b'));
  base.position.y = 0.13;
  g.add(seat, back, base);
  for (const s of [-1, 1]) {
    const arm = mesh(rbox(0.4, 0.8, 1.3, 0.18), mat);
    arm.position.set(s * 1.75, 0.75, 0);
    g.add(arm);
  }
  return g;
}

export function rug(color, r = 3.2) {
  const m = mesh(new THREE.CylinderGeometry(r, r, 0.04, 64), clay(color, { roughness: 0.95 }), { cast: false });
  m.position.y = 0.025;
  const ring = mesh(new THREE.TorusGeometry(r - 0.25, 0.05, 6, 72), clay('#ffffff', { roughness: 0.8 }), { cast: false });
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  const g = new THREE.Group();
  g.add(m, ring);
  return g;
}

/* ------------------------------------------------------------------ tables & tech */
export function table(w = 3, d = 1.4, h = 1.05) {
  const g = new THREE.Group();
  const top = mesh(rbox(w, 0.12, d, 0.05), clay('#B9783F', { roughness: 0.45 }));
  top.position.y = h;
  g.add(top);
  const legGeo = once('leg', () => new THREE.CylinderGeometry(0.05, 0.05, 1, 8));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = mesh(legGeo, clay('#222', { metalness: 0.5, roughness: 0.4 }));
    leg.scale.y = h;
    leg.position.set(sx * (w / 2 - 0.15), h / 2, sz * (d / 2 - 0.15));
    g.add(leg);
  }
  return g;
}

export function laptop() {
  const g = new THREE.Group();
  const base = mesh(rbox(0.7, 0.04, 0.5, 0.02), clay('#c9ced6', { metalness: 0.6, roughness: 0.3 }));
  const lid = mesh(rbox(0.7, 0.46, 0.03, 0.02), clay('#c9ced6', { metalness: 0.6, roughness: 0.3 }));
  lid.position.set(0, 0.23, -0.25);
  lid.rotation.x = -0.25;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.2, 1.4) }));
  screen.position.set(0, 0.23, -0.23);
  screen.rotation.x = -0.25;
  g.add(base, lid, screen);
  return g;
}

export function bookshelf(w = 4, h = 6, d = 0.8) {
  const g = new THREE.Group();
  const frameMat = clay('#6b4426', { roughness: 0.6 });
  const back = mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat);
  back.position.set(0, h / 2, -d / 2);
  g.add(back);
  for (const sx of [-1, 1]) {
    const side = mesh(new THREE.BoxGeometry(0.12, h, d), frameMat);
    side.position.set(sx * (w / 2 - 0.06), h / 2, 0);
    g.add(side);
  }
  const shelves = Math.max(3, Math.round(h / 1.15));
  const bookGeo = once('book', () => new THREE.BoxGeometry(1, 1, 1));
  const colors = ['#14A9B8', '#F59A1B', '#F8C93A', '#c0392b', '#2d3e50', '#e9e2d8', '#7d5ba6', '#1e824c', '#d35400', '#34495e'];
  let total = 0;
  const plan = [];
  for (let s = 0; s < shelves; s++) {
    const y = 0.15 + (s * (h - 0.3)) / shelves;
    const shelf = mesh(new THREE.BoxGeometry(w - 0.2, 0.08, d), frameMat);
    shelf.position.set(0, y, 0);
    g.add(shelf);
    let x = -w / 2 + 0.2;
    while (x < w / 2 - 0.4) {
      const bw = 0.08 + rand() * 0.1;
      const bh = 0.55 + rand() * 0.35;
      const lean = rand() < 0.06 ? 0.25 : 0;
      plan.push({ x: x + bw / 2, y: y + 0.04 + bh / 2, bw, bh, bd: d * (0.7 + rand() * 0.2), lean, c: colors[Math.floor(rand() * colors.length)] });
      x += bw + 0.01 + (rand() < 0.08 ? 0.3 : 0);
      total++;
    }
  }
  const books = new THREE.InstancedMesh(bookGeo, clay('#ffffff', { roughness: 0.7 }), total);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  plan.forEach((b, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), b.lean);
    m4.compose(new THREE.Vector3(b.x, b.y, 0), q, new THREE.Vector3(b.bw, b.bh, b.bd));
    books.setMatrixAt(i, m4);
    books.setColorAt(i, c.set(b.c));
  });
  books.castShadow = false;
  books.receiveShadow = true;
  g.add(books);
  return g;
}

function globeTexture() {
  return once('globeTex', () => canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1f6fb0';
    ctx.fillRect(0, 0, w, h);
    const r = rng(12);
    ctx.fillStyle = '#F8C93A';
    for (let i = 0; i < 14; i++) {
      const cx = r() * w, cy = h * 0.2 + r() * h * 0.6, rx = 20 + r() * 60, ry = 12 + r() * 40;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.3) {
        const k = 0.7 + r() * 0.5;
        ctx.lineTo(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
      }
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }));
}

export function globe(s = 1) {
  const g = new THREE.Group();
  const stand = mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.12, 20), clay('#B9783F'));
  stand.position.y = 0.06;
  const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), clay('#B9783F'));
  post.position.y = 0.4;
  const ball = mesh(new THREE.SphereGeometry(0.55, 32, 20), new THREE.MeshStandardMaterial({ map: globeTexture(), roughness: 0.35 }));
  ball.position.y = 1.2;
  ball.rotation.z = 0.4;
  const arc = mesh(new THREE.TorusGeometry(0.65, 0.035, 6, 40, Math.PI * 1.2), clay('#d8b07a', { metalness: 0.7, roughness: 0.3 }));
  arc.position.y = 1.2;
  arc.rotation.z = -0.4 - Math.PI * 0.6;
  g.add(stand, post, ball, arc);
  g.scale.setScalar(s);
  g.userData.tick = (t) => { ball.rotation.y = t * 0.3; };
  return g;
}

export function telescope() {
  const g = new THREE.Group();
  const legMat = clay('#2a2a2a', { metalness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), legMat);
    leg.position.set(Math.cos(a) * 0.35, 1.0, Math.sin(a) * 0.35);
    leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    g.add(leg);
  }
  const tube = mesh(new THREE.CylinderGeometry(0.18, 0.13, 1.9, 20), clay('#f2f2f2', { metalness: 0.3, roughness: 0.3 }));
  tube.position.set(0, 2.25, 0);
  tube.rotation.z = -1.05;
  const ring = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 20), clay('#14A9B8'));
  ring.position.copy(tube.position);
  ring.rotation.z = -1.05;
  g.add(tube, ring);
  return g;
}

function paintingTexture(seed, sunset = false) {
  return once('paint' + seed + sunset, () => canvasTexture(256, 320, (ctx, w, h) => {
    const r = rng(seed);
    if (sunset) {
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#2d4b8c');
      gr.addColorStop(0.5, '#f7a24a');
      gr.addColorStop(0.62, '#ffd36b');
      gr.addColorStop(0.63, '#1d5c7a');
      gr.addColorStop(1, '#0f3346');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.6, 26, Math.PI, 0);
      ctx.fill();
      return;
    }
    ctx.fillStyle = '#f7f2ea';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = ['#0FD1EB', '#FCD615', '#FCA00C', '#111', '#14A9B8'][i % 5];
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      const cx = r() * w, cy = r() * h, rr = 20 + r() * 60;
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.25) {
        const k = 0.6 + r() * 0.7;
        ctx.lineTo(cx + Math.cos(a) * rr * k, cy + Math.sin(a) * rr * k);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }));
}

export function easel(seed = 1, sunset = false) {
  const g = new THREE.Group();
  const wood = clay('#B9783F', { roughness: 0.5 });
  for (const s of [-1, 1]) {
    const leg = mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), wood);
    leg.position.set(s * 0.55, 1.25, 0);
    leg.rotation.z = s * 0.12;
    g.add(leg);
  }
  const back = mesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), wood);
  back.position.set(0, 1.15, -0.5);
  back.rotation.x = -0.35;
  g.add(back);
  const canvas = mesh(new THREE.BoxGeometry(1.2, 1.5, 0.05), new THREE.MeshStandardMaterial({ map: paintingTexture(seed, sunset), roughness: 0.8 }));
  canvas.position.set(0, 1.75, 0.08);
  canvas.rotation.x = -0.12;
  const ledge = mesh(new THREE.BoxGeometry(1.3, 0.06, 0.18), wood);
  ledge.position.set(0, 0.98, 0.1);
  g.add(canvas, ledge);
  return g;
}

export function robotArm() {
  const g = new THREE.Group();
  const yellow = clay('#F8C93A', { roughness: 0.35, metalness: 0.2 });
  const dark = clay('#2a2a2a', { roughness: 0.4, metalness: 0.4 });
  const base = mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.25, 24), dark);
  base.position.y = 0.12;
  g.add(base);
  const turret = new THREE.Group();
  turret.position.y = 0.25;
  g.add(turret);
  const j1 = mesh(new THREE.SphereGeometry(0.2, 16, 12), dark);
  turret.add(j1);
  const lower = new THREE.Group();
  turret.add(lower);
  const seg1 = mesh(rbox(0.22, 1.1, 0.22, 0.08), yellow);
  seg1.position.y = 0.55;
  lower.add(seg1);
  const elbow = new THREE.Group();
  elbow.position.y = 1.1;
  lower.add(elbow);
  elbow.add(mesh(new THREE.SphereGeometry(0.17, 16, 12), dark));
  const seg2 = mesh(rbox(0.18, 0.9, 0.18, 0.07), yellow);
  seg2.position.y = 0.45;
  elbow.add(seg2);
  const claw = mesh(new THREE.ConeGeometry(0.14, 0.3, 4), dark);
  claw.position.y = 1.0;
  claw.rotation.x = Math.PI;
  elbow.add(claw);
  g.userData.tick = (t) => {
    turret.rotation.y = Math.sin(t * 0.4) * 0.8;
    lower.rotation.z = -0.35 + Math.sin(t * 0.7) * 0.2;
    elbow.rotation.z = 1.1 + Math.sin(t * 0.9 + 1) * 0.35;
  };
  return g;
}

export function floorLamp() {
  const g = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), clay('#222', { metalness: 0.5 }));
  pole.position.y = 1.2;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 0.45, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.4, 1.3), side: THREE.DoubleSide }));
  shade.position.y = 2.45;
  const foot = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), clay('#222'));
  g.add(pole, shade, foot);
  return g;
}

export function wallMap() {
  const tex = once('mapTex', () => canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#123a5c';
    ctx.fillRect(0, 0, w, h);
    const r = rng(77);
    ctx.fillStyle = '#e9d9a6';
    [[0.22, 0.32, 70, 50], [0.28, 0.65, 40, 70], [0.5, 0.3, 60, 40], [0.53, 0.58, 45, 60], [0.72, 0.35, 90, 55], [0.82, 0.7, 40, 28]].forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.2) {
        const k = 0.75 + r() * 0.4;
        ctx.lineTo(x * w + Math.cos(a) * rx * k, y * h + Math.sin(a) * ry * k);
      }
      ctx.fill();
    });
    ctx.strokeStyle = '#d8b07a';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  }));
  const m = mesh(new THREE.BoxGeometry(3.6, 2.25, 0.08), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), { cast: false });
  return m;
}

export { PALETTE };
