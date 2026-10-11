// The hub: the House Wheel (an homage to RCA's famous sorting wheel) and four House pavilions.
import * as THREE from 'three';
import gsap from 'gsap';
import { PALETTE, clay, paint, mesh, rbox, canvasTexture, signTexture, signMesh, featherMesh, polar, faceToward, fitText, blobShadow } from '../kit.js';
import { HUB, PAVILION_R, HOUSE_ANGLES } from '../layout.js';

const SEGMENTS = 8;

function wheelFaceTexture(houses, font) {
  return canvasTexture(1024, 1024, (ctx, w) => {
    const c = w / 2;
    const r = c - 6;
    const step = (Math.PI * 2) / SEGMENTS;
    for (let k = 0; k < SEGMENTS; k++) {
      const h = houses[k % houses.length];
      // segment k covers local angles [k*step, (k+1)*step], counter-clockwise from +X (canvas y is flipped)
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, r, -(k + 1) * step, -k * step);
      ctx.closePath();
      ctx.fillStyle = h.color;
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#111';
      ctx.stroke();
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(-(k + 0.5) * step);
      ctx.fillStyle = h.ink;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      fitText(ctx, h.name.toUpperCase(), r * 0.62, 74, `800 {s}px ${font}`);
      ctx.fillText(h.name.toUpperCase(), r - 46, 0);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(c, c, r * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = `800 64px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REA', c, c + 4);
  });
}

function wheelBackTexture(font) {
  return canvasTexture(512, 512, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(c, c, c - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 54px ${font}`;
    ctx.fillText('ONE FLOCK', c, c - 30);
    ctx.font = `800 40px ${font}`;
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillText('FOUR HOUSES', c, c + 32);
  });
}

export function buildHub(world, houses, { onSpinResult } = {}) {
  const font = world.cfg.canvasFont;
  const root = new THREE.Group();
  root.name = 'hub';

  /* ---------- House Wheel ---------- */
  const wheel = new THREE.Group();
  wheel.name = 'house-wheel';
  const base = mesh(new THREE.CylinderGeometry(3.4, 3.8, 0.7, 48), clay(PALETTE.white));
  base.position.y = 0.35;
  wheel.add(base);
  const baseRing = mesh(new THREE.TorusGeometry(3.6, 0.12, 8, 64), clay(PALETTE.black));
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.7;
  wheel.add(baseRing);
  for (const side of [-1, 1]) {
    const leg = mesh(rbox(0.7, HUB.wheelY + 0.2, 0.7, 0.25), clay(PALETTE.black, { roughness: 0.4 }));
    leg.position.set(side * 1.25, (HUB.wheelY + 0.2) / 2 + 0.4, -0.75);
    leg.rotation.z = side * 0.2;
    wheel.add(leg);
  }
  const spinner = new THREE.Group();
  spinner.position.set(0, HUB.wheelY, 0);
  const R = HUB.wheelR;
  const disc = mesh(new THREE.CylinderGeometry(R, R, 0.6, 80), clay(PALETTE.white, { roughness: 0.5 }));
  disc.rotation.x = Math.PI / 2;
  spinner.add(disc);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.12, 96), new THREE.MeshStandardMaterial({ map: wheelFaceTexture(houses, font), roughness: 0.45 }));
  face.position.z = 0.31;
  spinner.add(face);
  const back = new THREE.Mesh(new THREE.CircleGeometry(R - 0.12, 64), new THREE.MeshStandardMaterial({ map: wheelBackTexture(font), roughness: 0.5 }));
  back.position.z = -0.31;
  back.rotation.y = Math.PI;
  spinner.add(back);
  const tire = mesh(new THREE.TorusGeometry(R, 0.26, 14, 96), clay(PALETTE.black, { roughness: 0.35 }));
  spinner.add(tire);
  const bulbs = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: i % 2 ? PALETTE.yellow : '#ffffff', emissiveIntensity: 0.6 }));
    b.position.set(Math.cos(a) * R, Math.sin(a) * R, 0.3);
    spinner.add(b);
    bulbs.push(b);
  }
  const cap = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 32), clay(PALETTE.yellow, { roughness: 0.3 }));
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.4;
  spinner.add(cap);
  wheel.add(spinner);

  // pointer at 12 o'clock
  const pointer = new THREE.Group();
  pointer.position.set(0, HUB.wheelY + R + 0.55, 0.55);
  const tri = mesh(new THREE.ConeGeometry(0.6, 1.4, 3), paint(PALETTE.orange));
  tri.rotation.z = Math.PI;
  tri.rotation.y = Math.PI / 6;
  tri.position.y = -0.1;
  pointer.add(tri);
  const knob = mesh(new THREE.SphereGeometry(0.42, 18, 14), clay(PALETTE.black, { roughness: 0.3 }));
  knob.position.y = 0.6;
  pointer.add(knob);
  wheel.add(pointer);

  const spinSign = signMesh(signTexture({ lines: ['SPIN ME!'], bg: PALETTE.yellow, font, w: 640, h: 220 }), 2.9, 1.0);
  spinSign.position.set(R + 1.2, HUB.wheelY + R - 0.2, 0.4);
  spinSign.rotation.z = -0.18;
  wheel.add(spinSign);
  world.onTick((t) => { spinSign.position.y = HUB.wheelY + R - 0.2 + Math.sin(t * 3) * 0.12; });

  root.add(wheel);
  world.addPiece(wheel, { kind: 'drop', delay: 0.2 });

  const state = { spinning: false, lastSeg: -1 };
  // blinking marquee bulbs
  world.onTick((t) => {
    const speed = state.spinning ? 14 : 3;
    bulbs.forEach((b, i) => { b.material.emissiveIntensity = 0.25 + 0.85 * Math.max(0, Math.sin(t * speed + i * 0.8)); });
  });

  const step = (Math.PI * 2) / SEGMENTS;
  const segmentUnderPointer = () => {
    // pointer sits at local angle +90°. The face rotates with spinner.rotation.z.
    const a = THREE.MathUtils.euclideanModulo(Math.PI / 2 - spinner.rotation.z, Math.PI * 2);
    return Math.floor(a / step) % SEGMENTS;
  };

  function spin() {
    if (state.spinning) return null;
    state.spinning = true;
    const turns = 4 + Math.random() * 2;
    const target = spinner.rotation.z - (turns * Math.PI * 2 + Math.random() * Math.PI * 2);
    const tl = gsap.to(spinner.rotation, {
      z: target,
      duration: world.cfg.reducedMotion ? 1.2 : 5.2,
      ease: 'power4.out',
      onUpdate() {
        const seg = segmentUnderPointer();
        if (seg !== state.lastSeg) {
          state.lastSeg = seg;
          gsap.fromTo(pointer.rotation, { z: 0.35 }, { z: 0, duration: 0.22, ease: 'elastic.out(1, 0.4)', overwrite: true });
        }
      },
      onComplete() {
        state.spinning = false;
        const house = houses[segmentUnderPointer() % houses.length];
        world.confetti?.burst(new THREE.Vector3(0, HUB.wheelY + 1, 1.2), house.color);
        onSpinResult?.(house);
      },
    });
    return tl;
  }
  world.interactive(wheel, { label: 'Spin the House Wheel', onClick: spin });

  /* ---------- Pavilions ---------- */
  const pavilions = {};
  houses.forEach((h, i) => {
    const p = buildPavilion(world, h, font);
    const at = polar(PAVILION_R, HOUSE_ANGLES[i]);
    p.position.copy(at);
    faceToward(p, at.x * 2, at.z * 2);
    root.add(p);
    world.addPiece(p, { kind: 'rise', delay: 0.35 + i * 0.12 });
    pavilions[h.key] = p;
    world.interactive(p, { label: `Visit House ${h.name}`, onClick: () => world.emit('house', h) });
  });

  world.scene.add(root);
  return { root, wheel, spinner, spin, pavilions, isSpinning: () => state.spinning };
}

function buildPavilion(world, h, font) {
  const g = new THREE.Group();
  g.name = 'pavilion-' + h.key;
  const isDark = h.color.toLowerCase() === '#111111' || h.color.toLowerCase() === '#000000';
  const plinth = mesh(new THREE.CylinderGeometry(4.4, 4.7, 0.6, 64), clay(PALETTE.white));
  plinth.position.y = 0.3;
  g.add(plinth);
  const body = mesh(new THREE.CylinderGeometry(3.2, 3.3, 4.4, 64), clay(h.color, { roughness: isDark ? 0.4 : 0.55 }));
  body.position.y = 2.8;
  g.add(body);
  for (const y of [1.0, 5.0]) {
    const band = mesh(new THREE.TorusGeometry(3.27, 0.16, 10, 72), clay(isDark ? PALETTE.yellow : PALETTE.white));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  const dome = mesh(new THREE.SphereGeometry(3.3, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), clay(isDark ? '#2a2a2a' : PALETTE.white, { roughness: 0.45 }));
  dome.scale.y = 0.55;
  dome.position.y = 5.0;
  g.add(dome);

  // arched door
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-0.85, 0);
  doorShape.lineTo(-0.85, 1.6);
  doorShape.absarc(0, 1.6, 0.85, Math.PI, 0, true);
  doorShape.lineTo(0.85, 0);
  doorShape.closePath();
  const door = mesh(new THREE.ExtrudeGeometry(doorShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 2 }), clay(isDark ? '#F2ECE8' : '#1C1A19', { roughness: 0.6 }));
  door.position.set(0, 1.05, 3.12);
  g.add(door);
  for (const s of [-1, 1]) {
    const win = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 24), clay(isDark ? '#F2ECE8' : '#1C1A19'));
    const a = s * 0.95;
    const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    win.position.copy(out).multiplyScalar(3.24).setY(3.5);
    win.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
    g.add(win);
  }
  const sign = signMesh(signTexture({ lines: [h.name.toUpperCase()], sub: `${(h.language || '').toUpperCase()} · ${(h.meaning || '').toUpperCase()}`, bg: isDark ? '#111' : '#fff', fg: isDark ? '#fff' : '#111', accent: isDark ? PALETTE.yellow : h.color, font, w: 1024, h: 360 }), 4.3, 1.5);
  sign.position.set(0, 4.15, 3.55);
  g.add(sign);

  // the house feather on the roof
  const feather = featherMesh(h.color, 6.2, 2.0);
  feather.position.set(0, 6.4, -0.2);
  feather.rotation.set(-0.1, 0, 0.18);
  g.add(feather);
  const seed = Math.random() * 6;
  world.onTick((t) => { feather.rotation.z = 0.18 + Math.sin(t * 1.1 + seed) * 0.07; });

  // pennant flag
  const pole = mesh(new THREE.CylinderGeometry(0.07, 0.07, 7.5, 8), clay(PALETTE.black));
  pole.position.set(3.9, 3.75, 1.6);
  g.add(pole);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(2.0, -0.55);
  flagShape.lineTo(0, -1.1);
  flagShape.closePath();
  const flag = mesh(new THREE.ShapeGeometry(flagShape), new THREE.MeshStandardMaterial({ color: h.color, side: THREE.DoubleSide, roughness: 0.6 }));
  flag.position.set(3.95, 7.4, 1.6);
  g.add(flag);
  world.onTick((t) => { flag.rotation.y = Math.sin(t * 2.2 + seed) * 0.35; });

  g.add(blobShadow(5.4, 0.25));
  return g;
}
