// Scroll-driven camera tour. Each page section with [data-world-stop="name"] is a stop; the
// camera glides (with a little lift) to that stop's shot as the section scrolls into view,
// and the duck hops over to meet you.
import * as THREE from 'three';
import { ZONES, BAYS, NAVE_HALF } from './hall/layout.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Camera shots in the Grand Hall. Each shot is: pos (camera), subject (what we look at), side
 * (+1 = text card on the left so the subject sits right of centre, -1 = card on the right,
 * 0 = centred), duck (where the duck hops to) and shift (how far the subject moves off-centre).
 * The aim point is worked out live from the screen aspect, see framed().
 */
export function makePresets(houses) {
  const shot = (pos, subject, side, duck, shift = 0.3) => ({ pos, subject, side, duck, shift });
  const W = ZONES.wheel.pos;
  const bayShot = (side, k, cardSide) => shot(v(-side * 3, 4.6, BAYS[k] + 6.5), v(side * 16, 3.6, BAYS[k]), cardSide, v(side * (NAVE_HALF - 2.4), 0, BAYS[k] + 3.4));
  const P = {
    hero: shot(v(-1.2, 3.6, 17.5), v(1, 9, -95), 1, v(2.8, 0, 4), 0.16),
    why: shot(v(8.5, 2.4, 12.5), v(2.8, 2.1, 4), -1, v(2.8, 0, 4)),
    model: shot(v(2.5, 7, 12), v(-3, 4.5, -20), 1, v(-1.5, 0, -4), 0.25),
    'el-1': bayShot(ZONES.stream.side, ZONES.stream.k, 1),
    'el-2': bayShot(ZONES.careers.side, ZONES.careers.k, 1),
    'el-3': bayShot(ZONES.sel.side, ZONES.sel.k, 1),
    'el-4': bayShot(ZONES.advocacy.side, ZONES.advocacy.k, 1),
    'el-5': shot(v(-2.5, 3.6, -16), v(ZONES.trophy.x, 3.4, ZONES.trophy.z), 1, v(-1.5, 0, -24), 0.28),
    houses: shot(v(-6, 7, -50), v(W.x, 6, W.z), 1, v(9, 0, -56), 0.22),
    road: shot(v(5.5, 7.5, -51), v(0, 6, -74), -1, v(-2.6, 0, -58), 0.2),
    graduate: shot(v(2, 3.6, -70), v(0, 13, -102), 1, v(0, 0, -88), 0.22),
    codesign: shot(v(7, 8, -48), v(-13, 5, -66), -1, v(-4, 0, -61), 0.25),
    founder: shot(v(-3.5, 2.4, 11.5), v(2.8, 2.3, 4), 1, v(2.8, 0, 4)),
    join: shot(v(0, 19.5, 16), v(0, 2, -55), -1, v(0, 0, -6), 0.18),
    faq: shot(v(0, 15, -94), v(0, 4, -20), 1, v(0, 0, -6), 0.18),

    'houses-intro': shot(v(0, 12, -16), v(0, 5, -44), 1, v(2.4, 0, -30), 0.2),
    'houses-how': shot(v(-6, 7.5, -60), v(W.x, 6.4, W.z), -1, v(9, 0, -56)),
    'houses-sorting': shot(v(-3.5, 7.2, -57), v(W.x, 6.4, W.z), 1, v(9, 0, -64)),
    'houses-cup': shot(v(-4, 9, -51), v(ZONES.cup.x, 3.5, -60), -1, v(5.2, 0, -53)),
    'houses-cta': shot(v(0, 19.5, 16), v(0, 2, -55), 1, v(0, 0, -6), 0.18),
  };
  houses.forEach((h, i) => {
    const b = ZONES.houseBays[i];
    // pulled back and aimed higher so the House banner stays in frame
    if (b) P[`house-${h.key}`] = shot(v(-b.side * 4.5, 5.4, b.z + 10), v(b.side * 14, 6.8, b.z), i % 2 ? -1 : 1, v(b.side * (NAVE_HALF + 1.2), 0, b.z + 2.2));
  });
  return P;
}

const smooth = (t) => t * t * (3 - 2 * t);

export class Tour {
  constructor(world, presets) {
    this.world = world;
    this.presets = presets;
    this.stops = [];
    this.active = -1;
    this.pending = null;
    this.desired = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
    this.enabled = false;
  }

  collect(root = document) {
    this.stops = [...root.querySelectorAll('[data-world-stop]')]
      .map((el) => ({ el, name: el.dataset.worldStop, preset: this.presets[el.dataset.worldStop] }))
      .filter((s) => {
        if (!s.preset) console.warn('[REA] Unknown world stop:', s.name);
        return s.preset;
      });
    this.measure();
  }

  measure() {
    const y = window.scrollY;
    this.vh = window.innerHeight;
    this.anchors = this.stops.map((s) => s.el.getBoundingClientRect().top + y);
  }

  /** Resolve a shot for the current screen: offset the aim so the subject clears the text card. */
  framed(preset) {
    const cam = this.world.camera;
    const aspect = this.world.width / this.world.height;
    const subject = preset.subject;
    const D = preset.pos.distanceTo(subject);
    if (aspect < 1) {
      // portrait: centre the subject, pull back a little, and lift it above the bottom text card
      const k = 1 + (1 - aspect) * 0.55;
      const pos = subject.clone().add(preset.pos.clone().sub(subject).multiplyScalar(k));
      const target = subject.clone();
      target.y -= 0.42 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * D * k;
      return { ...preset, pos, target };
    }
    const fwd = subject.clone().sub(preset.pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * aspect * D;
    const target = subject.clone().addScaledVector(right, -(preset.side || 0) * preset.shift * half);
    return { ...preset, target };
  }

  /** Where the camera wants to be for a given scroll position. */
  compute(scrollY) {
    const n = this.stops.length;
    if (!n) return null;
    let idx = 0;
    let t = 0;
    let hold = 0;
    for (let i = 1; i < n; i++) {
      const start = this.anchors[i] - this.vh * 0.92;
      const end = this.anchors[i] - this.vh * 0.18;
      if (scrollY >= end) { idx = i; t = 0; continue; }
      if (scrollY > start) { idx = i - 1; t = (scrollY - start) / (end - start); }
      break;
    }
    // drift while reading a section
    const holdStart = idx === 0 ? 0 : this.anchors[idx] - this.vh * 0.18;
    const holdEnd = idx + 1 < n ? this.anchors[idx + 1] - this.vh * 0.92 : document.documentElement.scrollHeight - this.vh;
    if (t === 0 && holdEnd > holdStart) hold = THREE.MathUtils.clamp((scrollY - holdStart) / (holdEnd - holdStart), 0, 1);

    const a = this.framed(this.stops[idx].preset);
    const b = this.framed(this.stops[Math.min(idx + 1, n - 1)].preset);
    const e = smooth(t);
    const pos = this.desired.pos.lerpVectors(a.pos, b.pos, e);
    const target = this.desired.target.lerpVectors(a.target, b.target, e);
    pos.y += Math.sin(Math.PI * e) * Math.min(14, a.pos.distanceTo(b.pos) * 0.2);
    if (hold > 0) {
      const off = pos.clone().sub(target);
      off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, (hold - 0.5) * 0.12);
      off.multiplyScalar(1 - hold * 0.05);
      pos.copy(target).add(off);
    }
    const nearest = e < 0.5 ? idx : Math.min(idx + 1, n - 1);
    return { pos, target, nearest };
  }

  update(scrollY) {
    if (!this.enabled) return null;
    const r = this.compute(scrollY);
    if (!r) return null;
    if (r.nearest !== this.active && this.pending?.index !== r.nearest) {
      clearTimeout(this.pending?.timer);
      const index = r.nearest;
      this.pending = {
        index,
        timer: setTimeout(() => {
          this.pending = null;
          if (index === this.active) return;
          const prev = this.active;
          this.active = index;
          this.world.emit('stop', { index, prev, name: this.stops[index].name, el: this.stops[index].el, preset: this.stops[index].preset });
        }, 220),
      };
    }
    return r;
  }

  scrollTargetFor(name) {
    const i = this.stops.findIndex((s) => s.name === name);
    return i < 0 ? null : this.stops[i].el;
  }
}
