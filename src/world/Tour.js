// Scroll-driven camera tour. Each page section with [data-world-stop="name"] is a stop; the
// camera glides (with a little arc) to that stop's preset as the section scrolls into view,
// and the duck hops over to meet you.
import * as THREE from 'three';
import { polar } from './kit.js';
import { HERO, HUB, STATION_R, STATION_ANGLES, PAVILION_R, HOUSE_ANGLES, ROAD, ARCH, SQUARE } from './layout.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Camera presets. Each shot is: pos (camera), subject (what we look at), side (+1 = text card on
 * the left so the subject sits right of centre, -1 = card on the right, 0 = centred) and duck
 * (where the duck hops to). The aim point is worked out live from the screen aspect, see framed().
 */
export function makePresets(houses) {
  const shot = (pos, subject, side, duck, shift = 0.3) => ({ pos, subject, side, duck, shift });
  const P = {
    hero: shot(v(-6.5, 7.2, 64), v(1.5, 4, 27), 1, HERO.duck, 0.32),
    why: shot(v(12.5, 3.6, 44.5), v(3.6, 2.2, 34.5), -1, v(3.6, 0, 34.5)),
    model: shot(v(42, 15, 40), polar(STATION_R, 80, 2), 1, polar(STATION_R + 3, STATION_ANGLES[0] - 7)),
    houses: shot(v(-1, 11.5, 22), v(0, 6.3, 0), 1, v(3.2, 0, 7.5)),
    road: shot(v(-2, 12, -66), v(2.5, 4.5, -29), -1, v(ROAD.fromX - 2.2, 0, ROAD.z - 3.6), 0.2),
    graduate: shot(v(-15, 7, -51), v(ARCH.x, 5.5, ARCH.z), 1, v(ARCH.x, 0, ARCH.z - 2.6)),
    codesign: shot(v(-50, 12, 18), v(SQUARE.x, 4.5, SQUARE.z), -1, v(SQUARE.x + 4.5, 0, SQUARE.z + 4)),
    founder: shot(v(-5, 2.6, 45.5), v(3.6, 2.6, 34.5), 1, HERO.duck),
    join: shot(v(40, 34, 64), v(0, 0, 0), -1, v(2.2, 0, 8), 0.25),
    faq: shot(v(-46, 30, 52), v(0, 0, 0), 1, v(2.2, 0, 8), 0.25),

    'houses-intro': shot(v(22, 20, 36), v(0, 4, 0), 1, v(3.2, 0, 7.5)),
    'houses-how': shot(v(7, 9, 17.5), v(0, 6.2, 0), -1, v(-3.4, 0, 7)),
    'houses-sorting': shot(v(-1.5, 8.2, 17.2), v(0, 6.6, 0), 1, v(3.6, 0, 6.2)),
    'houses-cup': shot(v(-3, 10.5, 18.5), v(0, 4, 4), -1, v(-6.6, 0, 8.6)),
    'houses-cta': shot(v(-38, 30, 46), v(0, 0, 0), 1, v(3.2, 0, 7.5), 0.25),
  };
  STATION_ANGLES.forEach((deg, i) => {
    P[`el-${i + 1}`] = shot(polar(STATION_R + 12.5, deg - 14, 6.8), polar(STATION_R, deg, 2.4), 1, polar(STATION_R + 2.8, deg + 9));
  });
  houses.forEach((h, i) => {
    const deg = HOUSE_ANGLES[i];
    P[`house-${h.key}`] = shot(polar(PAVILION_R + 19, deg - 8, 8), polar(PAVILION_R, deg, 4.2), i % 2 ? -1 : 1, polar(PAVILION_R + 6.5, deg + 2));
  });
  return P;
}

/** Camera-to-subject segments, so scenery can keep these lines of sight clear. */
export function sightlines(presets) {
  return Object.values(presets).map((p) => [p.pos, p.subject]);
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
