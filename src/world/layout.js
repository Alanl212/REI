// World map. Angles are measured from +Z (the hero side, "south") toward +X ("east").
import * as THREE from 'three';
import { polar } from './kit.js';

export const ISLAND_RADIUS = 46;

export const HERO = { center: new THREE.Vector3(0, 0, 30), duck: new THREE.Vector3(3.6, 0, 34.5) };
export const MOTTO_Z = 23;

export const HUB = { center: new THREE.Vector3(0, 0, 0), wheelY: 6.9, wheelR: 4.6 };
export const PAVILION_R = 14.5;
export const HOUSE_ANGLES = [315, 45, 135, 225]; // lumiere SW, pluma SE, igboya NE, umoja NW

export const STATION_R = 30.5;
export const STATION_ANGLES = [52, 74, 96, 118, 140];

export const ROAD = { z: -31, columnZ: -28.2, xs: [14, 8.5, 3, -2.5, -8], ghostX: -13.8, fromX: 19.5, toX: -27 };
export const ARCH = new THREE.Vector3(-21.5, 0, -28.2);
export const SQUARE = polar(28, 282);

/** Zones the decoration scatter should keep clear of: [x, z, radius]. */
export const KEEP_CLEAR = [
  [0, 27, 13], [0, 0, 21], [SQUARE.x, SQUARE.z, 10], [ARCH.x, ARCH.z, 6], [0, -31, 0],
  ...STATION_ANGLES.map((a) => { const p = polar(STATION_R, a); return [p.x, p.z, 5]; }),
];

export function isClear(x, z, extra = 0) {
  if (Math.abs(z - ROAD.z) < 5.5 && x < ROAD.fromX + 3 && x > ROAD.toX - 3) return false;
  return KEEP_CLEAR.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) > r + extra);
}
