// Hero monument: THINK / WRITE / ADVOCATE as giant extruded letters on stepped risers.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { PALETTE, clay, mesh, rbox } from '../kit.js';
import { MOTTO_Z } from '../layout.js';

function textMesh(font, str, size, depth, color, opts = {}) {
  const geo = new TextGeometry(str, {
    font, size, depth, curveSegments: 6,
    bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: size * 0.035, bevelSegments: 3, ...opts,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -depth / 2);
  return mesh(geo, clay(color, { roughness: 0.38 }));
}

export function buildMotto(world) {
  const font = world.font;
  const root = new THREE.Group();
  root.name = 'motto';
  root.position.set(0.8, 0, MOTTO_Z);

  const rows = [
    { word: 'ADVOCATE', adverb: 'BOLDLY', color: PALETTE.orange, size: 1.75, w: 17.5, h: 1.3, z: 4.4 },
    { word: 'WRITE', adverb: 'POWERFULLY', color: PALETTE.yellow, size: 2.15, w: 13.2, h: 3.7, z: 0.6 },
    { word: 'THINK', adverb: 'CRITICALLY', color: PALETTE.aqua, size: 2.35, w: 11.2, h: 6.3, z: -3.2 },
  ];

  rows.forEach((row, i) => {
    const step = new THREE.Group();
    step.position.z = row.z;
    const riser = mesh(rbox(row.w, row.h, 3.4, 0.35, 4), clay(PALETTE.white, { roughness: 0.75 }));
    riser.position.y = row.h / 2;
    step.add(riser);
    // coloured lip along the top edge
    const lip = mesh(rbox(row.w + 0.05, 0.22, 3.45, 0.1, 2), clay(row.color, { roughness: 0.4 }));
    lip.position.y = row.h - 0.02;
    step.add(lip);
    if (font) {
      const word = textMesh(font, row.word, row.size, 0.75, row.color);
      word.position.set(0, row.h + 0.08, 0.2);
      word.name = 'motto-' + row.word.toLowerCase();
      step.add(word);
      const adverb = textMesh(font, row.adverb, 0.5, 0.12, PALETTE.ink, { bevelEnabled: false });
      adverb.position.set(0, row.h - 0.95, 1.72);
      step.add(adverb);
      word.userData.bob = i;
      world.onTick((t) => { word.position.y = row.h + 0.08 + Math.max(0, Math.sin(t * 1.4 - i * 0.7)) * 0.08; });
    }
    root.add(step);
    world.addPiece(step, { kind: 'rise', delay: 0.15 * (2 - i) });
  });

  world.scene.add(root);
  return root;
}
