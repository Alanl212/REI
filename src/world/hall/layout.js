// The Grand Hall floor plan. The hall runs along -Z: entrance near z=+20, round sunset window at z=-102.
// x < 0 is the left side (as you walk in), x > 0 the right side.
import * as THREE from 'three';

export const NAVE_HALF = 11; // nave runs x = -11..11
export const BAY_DEPTH = 10; // side bays run from |x| = 11 to 21
export const OUTER = NAVE_HALF + BAY_DEPTH;
export const SPRING = 24; // where the glass vault starts
export const ENTRANCE_Z = 20;
export const FAR_WALL_Z = -102;
export const WINDOW = { y: 16, r: 13 };
export const STEPS = { from: -90, to: -101.5, count: 6, rise: 0.35 };
export const BAY_SPACING = 12;
export const BAYS = [0, -12, -24, -36, -48, -60, -72, -84]; // bay centre z
export const PILLAR_ZS = [6, -6, -18, -30, -42, -54, -66, -78, -90];
export const ARCH = { halfWidth: 4.4, springY: 13.5 };

// The sun as painted in the sky: sitting just above the water, centred in the round window.
export const SKY_SUN = new THREE.Vector3(0, 0.075, -1).normalize();
// The sunlight that lights the hall comes in a little steeper, so the golden patch lands on the floor.
export const SUN_DIR = new THREE.Vector3(0, 0.3, -1).normalize();

export const bay = (side, k) => ({ x: side * (NAVE_HALF + BAY_DEPTH / 2), z: BAYS[k], side, k });

// what lives where
export const ZONES = {
  stream: bay(-1, 1),
  careers: bay(1, 1),
  sel: bay(-1, 2),
  advocacy: bay(1, 2),
  trophy: new THREE.Vector3(4.5, 0, -27),
  houseBays: [bay(-1, 3), bay(1, 3), bay(-1, 4), bay(1, 4)], // lumiere, pluma, igboya, umoja
  wheelBay: bay(1, 5),
  wheel: { pos: new THREE.Vector3(15.4, 0, -60), yaw: -Math.PI / 2 }, // on a stage in its own alcove, facing the nave
  cup: { x: 7.6, zs: [-55.5, -58.5, -61.5, -64.5] },
  road: { x: 0, zs: [-62, -67, -72, -77, -82], ghostZ: -87 },
  townHall: [bay(-1, 5), bay(-1, 6)],
  library: [bay(1, 0), bay(-1, 0), bay(1, 6), bay(-1, 7), bay(1, 7)],
};

/** Unit vector the House Wheel faces. */
export const wheelNormal = () => new THREE.Vector3(Math.sin(ZONES.wheel.yaw), 0, Math.cos(ZONES.wheel.yaw));
