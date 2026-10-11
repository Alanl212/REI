// Paint-droplet burst used when the House Wheel lands.
import * as THREE from 'three';

export class Confetti {
  constructor(world, count = 160) {
    this.world = world;
    this.count = count;
    const geo = new THREE.SphereGeometry(0.16, 10, 8);
    const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 1 });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.p = Array.from({ length: count }, () => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, landed: false, s: 1 }));
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.sc = new THREE.Vector3();
    const c = new THREE.Color('#ffffff');
    for (let i = 0; i < count; i++) this.mesh.setColorAt(i, c);
    world.scene.add(this.mesh);
  }

  burst(origin, color) {
    const brand = [color, color, color, '#FFFFFF', '#111111'];
    const c = new THREE.Color();
    this.p.forEach((p, i) => {
      p.pos.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const up = 6 + Math.random() * 9;
      const out = 3 + Math.random() * 7;
      p.vel.set(Math.cos(a) * out, up, Math.sin(a) * out * 0.6 + 3);
      p.life = 3.2 + Math.random() * 1.5;
      p.landed = false;
      p.s = 0.6 + Math.random() * 1.2;
      this.mesh.setColorAt(i, c.set(brand[i % brand.length]));
    });
    this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = true;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    let alive = 0;
    this.p.forEach((p, i) => {
      p.life -= dt;
      if (p.life > 0) alive++;
      if (!p.landed) {
        p.vel.y -= 22 * dt;
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y <= 0.05) { p.pos.y = 0.04; p.landed = true; }
      }
      const fade = THREE.MathUtils.clamp(p.life / 0.8, 0, 1);
      if (p.landed) this.sc.set(p.s * 2.2 * fade, 0.25 * fade, p.s * 2.2 * fade);
      else this.sc.set(p.s * 0.9, p.s * 1.25, p.s * 0.9);
      this.m.compose(p.pos, this.q, this.sc);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (!alive) { this.active = false; this.mesh.visible = false; }
  }
}
