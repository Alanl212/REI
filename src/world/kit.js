// Shared palette, materials, procedural shapes and canvas-texture helpers for the REA world.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PALETTE = {
  aqua: '#0FD1EB',
  yellow: '#FCD615',
  orange: '#FCA00C',
  black: '#111111',
  white: '#FFFFFF',
  paper: '#EBE4E2', // matches the last frame of the preloader video
  cream: '#F7F2EE',
  sand: '#E6DDD7',
  stone: '#D9CEC7',
  ink: '#16120F',
  teal: '#06959D', // the paint colour from the preloader
};
export const BRAND = [PALETTE.aqua, PALETTE.yellow, PALETTE.orange, PALETTE.black];

const matCache = new Map();
/** Clay-like standard material, cached by colour + options. */
export function clay(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, envMapIntensity: 0.75, ...opts }));
  }
  return matCache.get(key);
}
/** Glossy wet-paint material. */
export function paint(color) {
  const key = 'paint' + color;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1 }));
  }
  return matCache.get(key);
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export const rbox = (w, h, d, r = 0.15, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));

/** Deterministic PRNG so the world looks the same on every visit. */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Organic paint-splat outline. */
export function blobShape(radius, rand, { points = 48, wobble = 0.22, spikes = 5 } = {}) {
  const shape = new THREE.Shape();
  const phase = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const spikeAt = Array.from({ length: spikes }, () => rand() * Math.PI * 2);
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    let r = 1 + wobble * (0.5 * Math.sin(3 * a + phase[0]) + 0.3 * Math.sin(5 * a + phase[1]) + 0.2 * Math.sin(8 * a + phase[2]));
    for (const s of spikeAt) {
      const d = Math.atan2(Math.sin(a - s), Math.cos(a - s));
      r += 0.35 * Math.exp(-(d * d) / 0.006);
    }
    const x = Math.cos(a) * r * radius;
    const y = Math.sin(a) * r * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

/** Feather outline, base at (0,0), tip at (0,h). */
export function featherShape(h = 6, w = 1.5) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w * 0.45, h * 0.12, w * 0.72, h * 0.3, w * 0.62, h * 0.52);
  s.lineTo(w * 0.44, h * 0.55); // barb notch
  s.lineTo(w * 0.58, h * 0.6);
  s.bezierCurveTo(w * 0.5, h * 0.8, w * 0.22, h * 0.94, 0.04, h);
  s.bezierCurveTo(-w * 0.24, h * 0.92, -w * 0.48, h * 0.74, -w * 0.52, h * 0.5);
  s.lineTo(-w * 0.36, h * 0.44);
  s.lineTo(-w * 0.55, h * 0.38);
  s.bezierCurveTo(-w * 0.6, h * 0.22, -w * 0.35, h * 0.08, 0, 0);
  return s;
}

/** Extruded, gently curved feather with a quill. Origin at the quill base. */
export function featherMesh(color, h = 6, w = 1.6) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(featherShape(h, w), {
    depth: 0.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 20,
  });
  geo.translate(0, h * 0.12, -0.05);
  // curve the vane backwards like a real feather
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / h;
    p.setZ(i, p.getZ(i) - 0.55 * y * y * h * 0.25 + 0.15 * Math.abs(p.getX(i)) * (1 - y));
  }
  geo.computeVertexNormals();
  const vane = mesh(geo, clay(color, { roughness: 0.5 }));
  g.add(vane);
  const quillCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 6 }, (_, i) => {
      const y = (i / 5) * h * 1.02;
      const t = y / h;
      return new THREE.Vector3(0, y, 0.09 - 0.55 * t * t * h * 0.25);
    }),
  );
  const quill = mesh(new THREE.TubeGeometry(quillCurve, 24, 0.07, 6), clay(color === PALETTE.black ? '#3a3a3a' : '#ffffff', { roughness: 0.4 }));
  g.add(quill);
  return g;
}

export function heartShape(s = 1) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.9 * s);
  h.bezierCurveTo(0.3 * s, -0.55 * s, 1.05 * s, -0.15 * s, 1.0 * s, 0.35 * s);
  h.bezierCurveTo(0.95 * s, 0.9 * s, 0.25 * s, 1.0 * s, 0, 0.5 * s);
  h.bezierCurveTo(-0.25 * s, 1.0 * s, -0.95 * s, 0.9 * s, -1.0 * s, 0.35 * s);
  h.bezierCurveTo(-1.05 * s, -0.15 * s, -0.3 * s, -0.55 * s, 0, -0.9 * s);
  return h;
}

/* ---------------------------------------------------------------- canvas textures */

export function canvasTexture(w, h, draw, { anisotropy = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Fit text into maxWidth by shrinking the font size. Returns the size used. */
export function fitText(ctx, text, maxWidth, size, weightFamily) {
  let s = size;
  do {
    ctx.font = `${weightFamily.replace('{s}', s)}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= 2;
  } while (s > 10);
  return s;
}

/** Sticker-style sign: rounded rect, black outline, hard offset shadow. */
export function signTexture({ lines, bg = '#fff', fg = '#111', accent = null, w = 1024, h = 384, font, sub = null, subFont }) {
  return canvasTexture(w, h, (ctx) => {
    const pad = 22;
    ctx.fillStyle = '#111';
    roundRect(ctx, pad + 14, pad + 14, w - pad * 2 - 14, h - pad * 2 - 14, 48);
    ctx.fill();
    ctx.fillStyle = bg;
    roundRect(ctx, pad, pad, w - pad * 2 - 14, h - pad * 2 - 14, 48);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#111';
    ctx.stroke();
    if (accent) {
      ctx.fillStyle = accent;
      roundRect(ctx, pad + 36, pad + 30, 26, h - pad * 2 - 74, 13);
      ctx.fill();
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = (w - 14) / 2 + (accent ? 18 : 0);
    const inner = w - pad * 2 - 110;
    const total = lines.length + (sub ? 0.7 : 0);
    const lineH = (h - pad * 2 - 40) / Math.max(total, 1.6);
    let y = (h - 14) / 2 - ((total - 1) * lineH) / 2;
    for (const line of lines) {
      fitText(ctx, line, inner, Math.min(lineH * 0.92, 150), `800 {s}px ${font}`);
      ctx.fillText(line, cx, y);
      y += lineH;
    }
    if (sub) {
      fitText(ctx, sub, inner, lineH * 0.5, `600 {s}px ${subFont || font}`);
      ctx.globalAlpha = 0.75;
      ctx.fillText(sub, cx, y - lineH * 0.2);
      ctx.globalAlpha = 1;
    }
  });
}

export function signMesh(tex, width, height) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, toneMapped: false, side: THREE.DoubleSide }),
  );
  return m;
}

/** Soft radial blob for contact shadows. */
let shadowTex;
export function blobShadow(radius = 1, opacity = 0.32) {
  shadowTex ||= canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(40,25,20,0.9)');
    g.addColorStop(0.55, 'rgba(40,25,20,0.35)');
    g.addColorStop(1, 'rgba(40,25,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  m.renderOrder = 1;
  return m;
}

/** Place on the ground ring: angle measured from +Z toward +X (0 = south/hero side). */
export function polar(r, deg, y = 0) {
  const a = THREE.MathUtils.degToRad(deg);
  return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
}

/** Rotate an object so its local +Z faces the point (x, z) on the ground plane. */
export function faceToward(obj, x, z) {
  obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z);
}
