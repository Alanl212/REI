// The Grand Hall shell: terrazzo floor with inlays (+ live reflections), arcades with neon arches,
// warm wood bays with mezzanines, the glass barrel vault, the round sunset window and the steps.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { clay, mesh, rbox, canvasTexture, rng, PALETTE } from '../kit.js';
import { NAVE_HALF, OUTER, SPRING, ENTRANCE_Z, FAR_WALL_Z, WINDOW, STEPS, BAYS, PILLAR_ZS, ARCH } from './layout.js';

export const NEON = {
  aqua: new THREE.Color('#12E4FF'),
  gold: new THREE.Color('#FFB347'),
  warm: new THREE.Color('#FFD9A0'),
};
/** HDR emissive material for neon tubes; .userData.base + setGlow(v) let the intro flicker them on. */
export function neonMaterial(color, strength = 5) {
  const base = new THREE.Color(color);
  const m = new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(strength) });
  m.userData.base = base;
  m.userData.strength = strength;
  m.userData.setGlow = (v) => m.color.copy(base).multiplyScalar(strength * v);
  return m;
}

const LENGTH = ENTRANCE_Z - FAR_WALL_Z;
const MID_Z = (ENTRANCE_Z + FAR_WALL_Z) / 2;
const WOOD = '#B9783F';
const SLATE = '#2B313B';

/* ------------------------------------------------------------------ floor */
function terrazzoTexture() {
  const W = 1024, H = 2976;
  const rand = rng(91);
  return canvasTexture(W, H, (ctx) => {
    const px = (x) => ((x + OUTER) / (OUTER * 2)) * W;
    const py = (z) => ((z - FAR_WALL_Z) / LENGTH) * H;
    ctx.fillStyle = '#1B222D';
    ctx.fillRect(0, 0, W, H);
    // terrazzo chips
    const chips = ['#3a4452', '#5b6573', '#8b939e', '#c9cdd2', '#2a3240', '#0FD1EB', '#FCA00C', '#e9e2d8'];
    for (let i = 0; i < 26000; i++) {
      const c = chips[Math.floor(Math.pow(rand(), 1.6) * chips.length)];
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.25 + rand() * 0.6;
      const r = 0.6 + rand() * 1.8;
      ctx.beginPath();
      ctx.ellipse(rand() * W, rand() * H, r, r * (0.6 + rand() * 0.6), rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // slab seams
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (let z = FAR_WALL_Z; z < ENTRANCE_Z; z += 6) { ctx.beginPath(); ctx.moveTo(0, py(z)); ctx.lineTo(W, py(z)); ctx.stroke(); }
    // flowing inlaid bands (aqua + orange + thin gold), mirrored on both sides of the nave
    const band = (side, offset, width, color, phase) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = (width / (OUTER * 2)) * W;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let z = ENTRANCE_Z; z >= FAR_WALL_Z + 10; z -= 0.5) {
        const t = (ENTRANCE_Z - z) / LENGTH;
        const x = side * (offset + 2.6 * Math.sin(z * 0.055 + phase) * (1 - t * 0.6) - t * 2.2);
        if (z === ENTRANCE_Z) ctx.moveTo(px(x), py(z)); else ctx.lineTo(px(x), py(z));
      }
      ctx.stroke();
    };
    for (const side of [-1, 1]) {
      band(side, 7.2, 1.25, '#13B8CC', side * 0.7);
      band(side, 8.6, 0.55, '#F08A12', side * 0.7 + 0.15);
      band(side, 9.3, 0.14, '#F7C64A', side * 0.7 + 0.25);
    }
    // a sweeping S-curve medallion near the entrance
    ctx.lineWidth = (0.5 / (OUTER * 2)) * W;
    ctx.strokeStyle = '#F7C64A';
    ctx.beginPath();
    ctx.ellipse(px(0), py(6), (5 / (OUTER * 2)) * W, (5 / LENGTH) * H, 0, 0, Math.PI * 2);
    ctx.stroke();
  }, { anisotropy: 16 });
}

const ReflectShader = {
  name: 'FloorReflection',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) }, uStrength: { value: 0.55 } },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    uniform float uStrength;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vec2 uv = vUv.xy / vUv.w;
      vec3 c = vec3(0.0);
      // soft, slightly smeared reflection (polished stone, not a mirror)
      for (int i = -2; i <= 2; i++) {
        for (int j = -3; j <= 3; j++) {
          c += texture2D(tDiffuse, uv + uTexel * vec2(float(i) * 1.5, float(j) * 2.5)).rgb;
        }
      }
      c /= 35.0;
      vec3 v = normalize(cameraPosition - vWorld);
      float fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 2.5);
      float a = uStrength * mix(0.25, 1.0, fres);
      gl_FragColor = vec4(c * color, a);
    }`,
};

function buildFloor(world, root, quality) {
  const geo = new THREE.PlaneGeometry(OUTER * 2, LENGTH);
  const floor = mesh(geo, new THREE.MeshStandardMaterial({ map: terrazzoTexture(), roughness: 0.22, metalness: 0.05, envMapIntensity: 0.7 }), { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, MID_Z);
  root.add(floor);
  if (quality === 'high') {
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const reflector = new Reflector(new THREE.PlaneGeometry(OUTER * 2, LENGTH), {
      shader: ReflectShader,
      textureWidth: Math.round(window.innerWidth * dpr * 0.5),
      textureHeight: Math.round(window.innerHeight * dpr * 0.5),
      color: new THREE.Color(0.95, 0.9, 0.85),
      multisample: 0,
    });
    reflector.material.transparent = true;
    reflector.material.depthWrite = false;
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.set(0, 0.012, MID_Z);
    reflector.renderOrder = 1;
    root.add(reflector);
    world.reflector = reflector;
    world.onResize(() => {
      const w = Math.round(world.width * dpr * 0.5);
      const h = Math.round(world.height * dpr * 0.5);
      reflector.getRenderTarget().setSize(w, h);
      reflector.material.uniforms.uTexel.value.set(1 / w, 1 / h);
    });
  }
}

/* ------------------------------------------------------------------ arcades */
function archOutline(zc, half, springY, top) {
  // a U-shaped panel: wall from the floor to `top`, with an arched opening cut from below
  const s = new THREE.Shape();
  const outer = 6;
  s.moveTo(zc - outer, 0);
  s.lineTo(zc - outer, top);
  s.lineTo(zc + outer, top);
  s.lineTo(zc + outer, 0);
  s.lineTo(zc + half, 0);
  s.lineTo(zc + half, springY);
  s.absarc(zc, springY, half, 0, Math.PI, false);
  s.lineTo(zc - half, 0);
  s.closePath();
  return s;
}

function archPath(half, springY, inset = 0.3) {
  const pts = [];
  const h = half - inset;
  for (let y = 0.15; y <= springY; y += 0.5) pts.push(new THREE.Vector3(0, y, -h));
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI - (i / 40) * Math.PI;
    pts.push(new THREE.Vector3(0, springY + Math.sin(a) * h, Math.cos(a) * h));
  }
  for (let y = springY; y >= 0.15; y -= 0.5) pts.push(new THREE.Vector3(0, y, h));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
}

function buildArcades(world, root, houseNeon) {
  const slate = clay(SLATE, { roughness: 0.55, metalness: 0.1 });
  const wood = clay(WOOD, { roughness: 0.55 });
  const woodDark = clay('#7a4a26', { roughness: 0.6 });
  const neonCurve = archPath(ARCH.halfWidth, ARCH.springY);
  const neonGeo = new THREE.TubeGeometry(neonCurve, 220, 0.11, 8, false);
  const arches = [];
  const slatGeo = new THREE.BoxGeometry(OUTER - NAVE_HALF - 0.4, 0.12, 0.42);
  const slatCount = BAYS.length * 2 * 15;
  const slats = new THREE.InstancedMesh(slatGeo, wood, slatCount);
  slats.castShadow = false;
  slats.receiveShadow = true;
  let si = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);

  for (const side of [-1, 1]) {
    const x = side * NAVE_HALF;
    // spandrel walls with arched openings, one per bay
    BAYS.forEach((zc, k) => {
      const panel = mesh(new THREE.ExtrudeGeometry(archOutline(zc, ARCH.halfWidth, ARCH.springY, SPRING), { depth: 0.9, bevelEnabled: false, curveSegments: 24 }), slate);
      // shape x -> world z; the 0.9 extrusion ends up spanning world x [pos - 0.9, pos]
      panel.rotation.y = -Math.PI / 2;
      panel.position.set(side > 0 ? x + 0.9 : x, 0, 0);
      root.add(panel);

      const key = houseNeon?.[`${side}:${k}`];
      const mat = neonMaterial(key || NEON.aqua, key ? 4 : 5);
      const tube = new THREE.Mesh(neonGeo, mat);
      tube.position.set(x - side * 0.08, 0, zc);
      root.add(tube);
      arches.push({ mat, z: zc, side, k, tube });

      // warm wooden barrel ceiling inside the bay
      for (let i = 0; i < 15; i++) {
        const a = (i / 14) * Math.PI;
        const p = new THREE.Vector3(side * (NAVE_HALF + (OUTER - NAVE_HALF) / 2), ARCH.springY + Math.sin(a) * (ARCH.halfWidth + 0.3), zc + Math.cos(a) * (ARCH.halfWidth + 0.3));
        q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -a + Math.PI / 2);
        m4.compose(p, q, one);
        slats.setMatrixAt(si++, m4);
      }
      // bay side walls (between neighbouring bays) and ceiling
      const wall = mesh(new THREE.BoxGeometry(OUTER - NAVE_HALF, SPRING, 0.6), woodDark);
      wall.position.set(side * (NAVE_HALF + (OUTER - NAVE_HALF) / 2), SPRING / 2, zc - 6);
      root.add(wall);
    });
    // back wall + bay roof
    const back = mesh(new THREE.BoxGeometry(0.6, SPRING, LENGTH), clay('#5a3a22', { roughness: 0.7 }));
    back.position.set(side * (OUTER + 0.3), SPRING / 2, MID_Z);
    root.add(back);
    const roof = mesh(new THREE.BoxGeometry(OUTER - NAVE_HALF, 0.6, LENGTH), slate);
    roof.position.set(side * (NAVE_HALF + (OUTER - NAVE_HALF) / 2), ARCH.springY + ARCH.halfWidth + 0.8, MID_Z);
    root.add(roof);
    // pillars
    for (const z of PILLAR_ZS) {
      const p = mesh(rbox(2.0, SPRING, 2.6, 0.3), slate);
      p.position.set(side * (NAVE_HALF - 0.2), SPRING / 2, z);
      root.add(p);
      const foot = mesh(rbox(2.6, 1.0, 3.2, 0.2), clay('#1f242c', { roughness: 0.4 }));
      foot.position.set(side * (NAVE_HALF - 0.2), 0.5, z);
      root.add(foot);
    }
    // cornice with a warm cove light where the vault springs
    const cornice = mesh(new THREE.BoxGeometry(1.8, 0.9, LENGTH), slate);
    cornice.position.set(side * (NAVE_HALF - 0.4), SPRING - 0.2, MID_Z);
    root.add(cornice);
    const cove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, LENGTH), neonMaterial(NEON.warm, 3));
    cove.position.set(side * (NAVE_HALF - 1.35), SPRING - 0.7, MID_Z);
    root.add(cove);
  }
  slats.count = si;
  slats.instanceMatrix.needsUpdate = true;
  root.add(slats);
  return arches;
}

/* ------------------------------------------------------------------ mezzanines */
function buildMezzanines(world, root, plantFactory) {
  const wood = clay(WOOD, { roughness: 0.5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8ee', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
  const strip = neonMaterial(NEON.warm, 3.2);
  for (const side of [-1, 1]) {
    BAYS.forEach((zc, k) => {
      if (k === 3 || k === 4 || (side > 0 && k === 5)) return; // house bays + the wheel stage keep their full height
      const deck = mesh(rbox(6.4, 0.7, 9.6, 0.25), wood);
      deck.position.set(side * (OUTER - 3.2), 7.2, zc);
      root.add(deck);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 9.2), strip);
      lip.position.set(side * (OUTER - 6.45), 6.82, zc);
      root.add(lip);
      const rail = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 1.1), glass);
      rail.rotation.y = Math.PI / 2;
      rail.position.set(side * (OUTER - 6.35), 8.1, zc);
      root.add(rail);
      const cap = mesh(new THREE.BoxGeometry(0.16, 0.1, 9.4), clay('#d8b07a', { metalness: 0.6, roughness: 0.3 }));
      cap.position.set(side * (OUTER - 6.35), 8.68, zc);
      root.add(cap);
      if (plantFactory) {
        for (const dz of [-3.2, 0.4, 3.4]) {
          const p = plantFactory(0.75 + ((k + dz) % 3) * 0.08);
          p.position.set(side * (OUTER - 4.5 - (dz > 0 ? 0.6 : 0)), 7.55, zc + dz);
          root.add(p);
        }
      }
    });
  }
}

/* ------------------------------------------------------------------ vault */
function buildVault(world, root) {
  const steel = clay('#262a31', { metalness: 0.5, roughness: 0.35 });
  const ribGeo = new THREE.TorusGeometry(NAVE_HALF, 0.26, 10, 56, Math.PI);
  const neonRibs = [];
  for (let z = ENTRANCE_Z - 2; z >= FAR_WALL_Z + 2; z -= 6) {
    const rib = mesh(ribGeo, steel, { cast: false });
    rib.position.set(0, SPRING, z);
    root.add(rib);
    if (PILLAR_ZS.some((pz) => Math.abs(pz - z) < 1)) {
      const mat = neonMaterial(NEON.aqua, 4);
      const n = new THREE.Mesh(new THREE.TorusGeometry(NAVE_HALF - 0.32, 0.06, 6, 64, Math.PI), mat);
      n.position.set(0, SPRING, z);
      root.add(n);
      neonRibs.push({ mat, z });
    }
  }
  for (const deg of [12, 34, 58, 90, 122, 146, 168]) {
    const a = THREE.MathUtils.degToRad(deg);
    const p = mesh(new THREE.BoxGeometry(0.16, 0.16, LENGTH), steel, { cast: false });
    p.position.set(Math.cos(a) * NAVE_HALF, SPRING + Math.sin(a) * NAVE_HALF, MID_Z);
    p.rotation.z = a;
    root.add(p);
  }
  // faint glass so the roof catches a little light
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(NAVE_HALF - 0.05, NAVE_HALF - 0.05, LENGTH, 48, 1, true, Math.PI / 2, Math.PI),
    new THREE.MeshPhysicalMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.07, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
  );
  glass.rotation.x = Math.PI / 2;
  glass.rotation.y = 0;
  glass.position.set(0, SPRING, MID_Z);
  root.add(glass);
  return neonRibs;
}

/* ------------------------------------------------------------------ end walls */
function endWallShape(withHole) {
  const s = new THREE.Shape();
  s.moveTo(-OUTER, 0);
  s.lineTo(OUTER, 0);
  s.lineTo(OUTER, SPRING);
  s.lineTo(NAVE_HALF, SPRING);
  s.absarc(0, SPRING, NAVE_HALF, 0, Math.PI, false);
  s.lineTo(-OUTER, SPRING);
  s.closePath();
  if (withHole === 'window') {
    const h = new THREE.Path();
    h.absarc(0, WINDOW.y, WINDOW.r, 0, Math.PI * 2, true);
    s.holes.push(h);
  } else if (withHole === 'door') {
    const h = new THREE.Path();
    h.moveTo(-4.2, 0.01);
    h.lineTo(4.2, 0.01);
    h.lineTo(4.2, 9);
    h.absarc(0, 9, 4.2, 0, Math.PI, false);
    h.lineTo(-4.2, 0.01);
    s.holes.push(h);
  }
  return s;
}

function buildFarWall(world, root) {
  const slate = clay(SLATE, { roughness: 0.55 });
  const wall = mesh(new THREE.ExtrudeGeometry(endWallShape('window'), { depth: 1.6, bevelEnabled: false, curveSegments: 64 }), slate);
  wall.position.set(0, 0, FAR_WALL_Z - 1.6);
  root.add(wall);
  const frame = mesh(new THREE.TorusGeometry(WINDOW.r, 0.55, 16, 120), clay('#1d2128', { metalness: 0.5, roughness: 0.3 }));
  frame.position.set(0, WINDOW.y, FAR_WALL_Z + 0.2);
  root.add(frame);
  const ringMat = neonMaterial(NEON.gold, 5);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(WINDOW.r + 0.85, 0.09, 8, 160), ringMat);
  ring.position.set(0, WINDOW.y, FAR_WALL_Z + 0.35);
  root.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(WINDOW.r + 2.3, 0.07, 8, 160), neonMaterial(NEON.aqua, 3.5));
  ring2.position.set(0, WINDOW.y, FAR_WALL_Z + 0.35);
  root.add(ring2);
  // mullions
  const steel = clay('#1d2128', { metalness: 0.5, roughness: 0.35 });
  for (const x of [-4.2, 4.2]) {
    const h = 2 * Math.sqrt(WINDOW.r * WINDOW.r - x * x);
    const m = mesh(new THREE.BoxGeometry(0.28, h, 0.28), steel);
    m.position.set(x, WINDOW.y, FAR_WALL_Z - 0.6);
    root.add(m);
  }
  const yh = WINDOW.y - 5.5;
  const hw = 2 * Math.sqrt(WINDOW.r * WINDOW.r - (yh - WINDOW.y) ** 2);
  const bar = mesh(new THREE.BoxGeometry(hw, 0.28, 0.28), steel);
  bar.position.set(0, yh, FAR_WALL_Z - 0.6);
  root.add(bar);
  // steps up to the window
  const stepMat = clay('#d9cfc4', { roughness: 0.35 });
  const nose = neonMaterial(NEON.warm, 2.2);
  const depth = (STEPS.from - STEPS.to) / STEPS.count;
  for (let i = 0; i < STEPS.count; i++) {
    const h = (i + 1) * STEPS.rise;
    const zFront = STEPS.from - i * depth;
    const step = mesh(new THREE.BoxGeometry(17 - i * 0.6, h, STEPS.from - STEPS.to - i * depth + 0.6), stepMat);
    step.position.set(0, h / 2, (zFront + FAR_WALL_Z) / 2);
    root.add(step);
    const led = new THREE.Mesh(new THREE.BoxGeometry(17 - i * 0.6, 0.05, 0.05), nose);
    led.position.set(0, h - 0.06, zFront + 0.3);
    root.add(led);
  }
  return { ringMat };
}

function buildEntranceWall(world, root) {
  const wall = mesh(new THREE.ExtrudeGeometry(endWallShape('door'), { depth: 1.2, bevelEnabled: false, curveSegments: 48 }), clay(SLATE, { roughness: 0.55 }));
  wall.position.set(0, 0, ENTRANCE_Z);
  root.add(wall);
  const light = new THREE.Mesh(new THREE.PlaneGeometry(9, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.7) }));
  light.position.set(0, 7, ENTRANCE_Z + 1.5);
  light.rotation.y = Math.PI;
  root.add(light);
  const ring = new THREE.Mesh(new THREE.TubeGeometry(archPath(4.6, 9, 0), 120, 0.1, 8, false), neonMaterial(NEON.aqua, 4));
  ring.rotation.y = Math.PI / 2;
  ring.position.set(0, 0, ENTRANCE_Z - 0.1);
  root.add(ring);
}

/* ------------------------------------------------------------------ ribbons */
function buildRibbons(world, root) {
  const specs = [
    { color: '#16B7C9', phase: 0, amp: 5.5, y: 26.5, w: 2.6 },
    { color: '#F59A1B', phase: 2.1, amp: 6.5, y: 28.5, w: 2.2 },
    { color: '#F8C93A', phase: 4.0, amp: 4.5, y: 25.5, w: 1.6 },
  ];
  const uTime = { value: 0 };
  const ribbons = specs.map((s) => {
    const N = 260;
    const pos = new Float32Array((N + 1) * 2 * 3);
    const uv = new Float32Array((N + 1) * 2 * 2);
    const idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const z = ENTRANCE_Z - 4 - t * (LENGTH - 10);
      const x = Math.sin(t * Math.PI * 2.4 + s.phase) * s.amp;
      const y = s.y + Math.sin(t * Math.PI * 4 + s.phase) * 2.2 - Math.sin(t * Math.PI) * 3;
      const twist = Math.sin(t * Math.PI * 3 + s.phase) * 1.1;
      const dx = Math.cos(twist) * s.w * 0.5;
      const dy = Math.sin(twist) * s.w * 0.5;
      pos.set([x - dx, y - dy, z, x + dx, y + dy, z], i * 6);
      uv.set([0, t, 1, t], i * 4);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.35, roughness: 0.55, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(uTime * 0.55 + position.z * 0.09) * 0.45;\ntransformed.x += cos(uTime * 0.4 + position.z * 0.05) * 0.3;');
    };
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = false;
    m.receiveShadow = false;
    root.add(m);
    return m;
  });
  world.onTick((t) => { uTime.value = t; });
  return ribbons;
}

/* ------------------------------------------------------------------ lights, rays, dust */
function buildLightsAndAir(world, root, quality) {
  const rand = rng(5);
  const count = quality === 'high' ? 90 : 50;
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 1.8) }), count);
  const wires = [];
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const x = (rand() * 2 - 1) * (NAVE_HALF - 1.5);
    const z = ENTRANCE_Z - 6 - rand() * (LENGTH - 18);
    const roof = SPRING + Math.sqrt(Math.max(0, NAVE_HALF * NAVE_HALF - x * x)) - 0.4;
    const y = 15 + rand() * 8;
    m4.makeTranslation(x, y, z);
    bulbs.setMatrixAt(i, m4);
    wires.push(new THREE.Vector3(x, y + 0.15, z), new THREE.Vector3(x, roof, z));
  }
  root.add(bulbs);
  root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wires), new THREE.LineBasicMaterial({ color: '#3a3128', transparent: true, opacity: 0.5 })));

  // floating dust catching the light
  const n = quality === 'high' ? 700 : 300;
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(rand() * 2 - 1) * NAVE_HALF, 1 + rand() * 20, ENTRANCE_Z - rand() * LENGTH], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const dotTex = canvasTexture(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,230,190,1)');
    g.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.12, map: dotTex, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(2, 1.6, 1.1) }));
  root.add(dust);
  world.onTick((t) => { dust.position.y = Math.sin(t * 0.1) * 0.6; dust.position.x = Math.sin(t * 0.07) * 0.8; });
}

/* ------------------------------------------------------------------ neon motto sign */
function buildMottoSign(world, root) {
  if (!world.font) return null;
  const g = new THREE.Group();
  const lines = [
    ['THINK CRITICALLY', NEON.aqua],
    ['WRITE POWERFULLY', new THREE.Color('#FFD84A')],
    ['ADVOCATE BOLDLY', new THREE.Color('#FF9A1F')],
  ];
  const mats = [];
  lines.forEach(([text, color], i) => {
    const geo = new TextGeometry(text, { font: world.font, size: 1.05, depth: 0.12, curveSegments: 5, bevelEnabled: false });
    geo.computeBoundingBox();
    geo.translate(-(geo.boundingBox.max.x + geo.boundingBox.min.x) / 2, 0, 0);
    const mat = neonMaterial(color, 4.2);
    mats.push(mat);
    for (const face of [1, -1]) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, (1 - i) * 1.65 - 0.5, face * 0.22);
      if (face < 0) m.rotation.y = Math.PI;
      g.add(m);
    }
  });
  const panel = mesh(rbox(15, 5.6, 0.3, 0.35), new THREE.MeshStandardMaterial({ color: '#14171c', roughness: 0.3, metalness: 0.4 }), { cast: false });
  g.add(panel);
  const cables = [];
  for (const x of [-6.5, 6.5]) cables.push(new THREE.Vector3(x, 2.8, 0), new THREE.Vector3(x, 30, 0));
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cables), new THREE.LineBasicMaterial({ color: '#222' })));
  g.position.set(0, 17.5, -34);
  world.onTick((t) => { g.rotation.y = Math.sin(t * 0.25) * 0.02; });
  root.add(g);
  return { group: g, mats };
}

/* ------------------------------------------------------------------ assemble */
export function buildHall(world, { quality = 'high', houseNeon, plantFactory } = {}) {
  const root = new THREE.Group();
  root.name = 'hall';
  buildFloor(world, root, quality);
  const arches = buildArcades(world, root, houseNeon);
  buildMezzanines(world, root, plantFactory);
  const neonRibs = buildVault(world, root);
  const far = buildFarWall(world, root);
  buildEntranceWall(world, root);
  const ribbons = buildRibbons(world, root);
  buildLightsAndAir(world, root, quality);
  const sign = buildMottoSign(world, root);
  world.scene.add(root);
  return { root, arches, neonRibs, ribbons, sign, windowRing: far.ringMat };
}

export { PALETTE };
