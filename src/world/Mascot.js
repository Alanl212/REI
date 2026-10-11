// The REA duck. Two render modes behind one API:
//  - "paper" (default): the four turnaround renders as a camera-facing cut-out that picks the
//    correct view (front / left / back / right) from the camera angle, Paper-Mario style.
//  - "model": the rigged GLB (set window.REA_WORLD.model). Plays idle / hop / wave clips when
//    the file contains them, and turns the head toward the camera.
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { blobShadow } from './kit.js';

const HEIGHT = 3.4;
// transparent margin under the feet in each source image (fraction of image height)
const FOOT_PAD = { front: 0.04, left: 0.019, back: 0.019, right: 0.037 };
const ASPECT = 419 / 887;

export class Mascot {
  constructor(world) {
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'mascot';
    this.body = new THREE.Group(); // hop / squash target
    this.root.add(this.body);
    this.shadow = blobShadow(1.25, 0.38);
    this.root.add(this.shadow);
    this.yaw = 0; // logical facing (radians, 0 = +Z)
    this.view = 'front';
    this.mode = 'paper';
    this.busy = null;
    this.idleTimer = 0;
    this.lookAway = 0;
    this.headBone = null;
    this.mixer = null;
    this.actions = {};
    world.scene.add(this.root);
  }

  async load(cfg) {
    if (cfg.model) {
      try {
        await this.loadModel(cfg.model, cfg.modelClips, cfg.abs('draco/'));
        this.mode = 'model';
        return;
      } catch (e) {
        console.warn('[REA] Could not load mascot model, using the paper duck instead.', e);
      }
    }
    await this.loadPaper(cfg.duckViews);
  }

  async loadPaper(urls) {
    const loader = new THREE.TextureLoader();
    const entries = await Promise.all(
      Object.entries(urls).map(async ([k, url]) => {
        const t = await loader.loadAsync(url);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return [k, t];
      }),
    );
    this.textures = Object.fromEntries(entries);
    const w = HEIGHT * ASPECT;
    const geo = new THREE.PlaneGeometry(w, HEIGHT);
    geo.translate(0, HEIGHT / 2, 0);
    this.card = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.textures.front, transparent: true, alphaTest: 0.08, toneMapped: false, side: THREE.DoubleSide }));
    this.card.renderOrder = 2;
    this.body.add(this.card);
    this.setView('front', true);
  }

  async loadModel(url, clipNames, dracoPath) {
    // supports plain, Draco-compressed and Meshopt-compressed GLB files
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(dracoPath);
    draco.setDecoderConfig({ type: 'wasm' });
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url);
    draco.dispose();
    const model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      if (!this.headBone && o.isBone && /head/i.test(o.name)) this.headBone = o;
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = HEIGHT / (size.y || 1);
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    this.body.add(model);
    this.model = model;
    if (gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(model);
      for (const [key, re] of Object.entries(clipNames)) {
        const clip = gltf.animations.find((c) => (re instanceof RegExp ? re.test(c.name) : c.name === re));
        if (clip) this.actions[key] = this.mixer.clipAction(clip);
      }
      this.actions.idle ||= this.mixer.clipAction(gltf.animations[0]);
      this.actions.idle.play();
    }
    this.shadow.visible = true;
  }

  play(name, { once = false, fade = 0.25 } = {}) {
    const next = this.actions[name];
    if (!next || this.current === next) return !!next;
    next.reset();
    if (once) { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    next.fadeIn(fade).play();
    this.current?.fadeOut(fade);
    this.current = next;
    if (once) {
      const done = (e) => {
        if (e.action !== next) return;
        this.mixer.removeEventListener('finished', done);
        this.play('idle');
      };
      this.mixer.addEventListener('finished', done);
    }
    return true;
  }

  setView(view, instant = false) {
    if (!this.card || (view === this.view && !instant)) return;
    this.view = view;
    this.card.material.map = this.textures[view];
    this.card.material.needsUpdate = true;
    this.card.position.y = -FOOT_PAD[view] * HEIGHT;
    if (!instant && !this.world.cfg.reducedMotion) {
      gsap.fromTo(this.card.scale, { x: 0.25 }, { x: 1, duration: 0.2, ease: 'back.out(2)', overwrite: true });
    }
  }

  placeAt(p) {
    this.root.position.set(p.x, 0, p.z);
  }

  faceCamera() {
    const c = this.world.camera.position;
    this.yaw = Math.atan2(c.x - this.root.position.x, c.z - this.root.position.z);
  }

  /** Hop to a new spot. Long distances become one big cartoon leap. */
  moveTo(target, { onLand } = {}) {
    const from = this.root.position.clone();
    const to = new THREE.Vector3(target.x, 0, target.z);
    const dist = from.distanceTo(to);
    this.busy?.kill();
    if (dist < 0.3) { this.faceCamera(); return; }
    if (this.world.cfg.reducedMotion || this.world.cfg.snap) {
      this.root.position.copy(to);
      this.faceCamera();
      onLand?.();
      return;
    }
    this.yaw = Math.atan2(to.x - from.x, to.z - from.z);
    const hops = dist > 14 ? 1 : Math.max(1, Math.round(dist / 3.2));
    const height = dist > 14 ? Math.min(16, 4 + dist * 0.22) : 1.1;
    const per = dist > 14 ? Math.min(1.6, 0.7 + dist * 0.015) : 0.36;
    const tl = gsap.timeline({
      onComplete: () => {
        this.busy = null;
        this.faceCamera();
        onLand?.();
      },
    });
    this.play(dist > 14 ? 'hop' : 'walk');
    for (let i = 0; i < hops; i++) {
      const a = from.clone().lerp(to, i / hops);
      const b = from.clone().lerp(to, (i + 1) / hops);
      const proxy = { t: 0 };
      tl.to(this.body.scale, { y: 0.82, x: 1.12, duration: 0.07, ease: 'power1.out' })
        .to(this.body.scale, { y: 1.08, x: 0.94, duration: 0.08 })
        .to(proxy, {
          t: 1,
          duration: per,
          ease: 'none',
          onUpdate: () => {
            this.root.position.lerpVectors(a, b, proxy.t);
            this.body.position.y = Math.sin(Math.PI * proxy.t) * height;
          },
        })
        .to(this.body.scale, { y: 0.84, x: 1.1, duration: 0.07 })
        .to(this.body.scale, { y: 1, x: 1, duration: 0.18, ease: 'back.out(3)' });
    }
    tl.add(() => this.play('idle'));
    this.busy = tl;
  }

  /** Click reaction: jump and spin (shows every view of the paper duck). */
  react() {
    if (this.busy) return;
    if (this.mode === 'model' && this.play('wave', { once: true })) return;
    const start = this.yaw;
    const proxy = { t: 0 };
    this.busy = gsap.timeline({ onComplete: () => { this.busy = null; this.faceCamera(); } })
      .to(this.body.scale, { y: 0.8, x: 1.15, duration: 0.08 })
      .to(proxy, {
        t: 1,
        duration: this.world.cfg.reducedMotion ? 0.01 : 0.8,
        ease: 'power2.out',
        onUpdate: () => {
          this.body.position.y = Math.sin(Math.PI * proxy.t) * 1.8;
          this.yaw = start + proxy.t * Math.PI * 2;
        },
      }, '>')
      .to(this.body.scale, { y: 1, x: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' }, '<0.1');
  }

  headWorldPosition(v = new THREE.Vector3()) {
    return v.set(0, HEIGHT * 0.88 + this.body.position.y, 0).applyMatrix4(this.root.matrixWorld);
  }

  update(dt, t) {
    const cam = this.world.camera.position;
    const p = this.root.position;

    // idle: bob, and now and then glance away so the turnaround shows off
    if (!this.busy) {
      this.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.06;
      this.idleTimer += dt;
      if (this.idleTimer > 9 && !this.world.cfg.reducedMotion && !this.world.cfg.snap) {
        this.idleTimer = 0;
        this.lookAway = (Math.random() < 0.5 ? -1 : 1) * 1.5;
        gsap.delayedCall(1.1, () => { this.lookAway = 0; });
      }
    } else this.idleTimer = 0;

    const toCam = Math.atan2(cam.x - p.x, cam.z - p.z);
    const yaw = this.yaw + (this.busy ? 0 : this.lookAway);
    this.shadow.scale.setScalar(1 - Math.min(0.6, this.body.position.y / 10));

    if (this.mode === 'model') {
      const wrap = (a) => THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;
      // undo last frame's head offset so it never accumulates when clips don't animate the head
      if (this.headBone) this.headBone.rotation.y -= this.headOffset || 0;
      this.mixer?.update(dt);
      this.body.rotation.y += wrap(yaw - this.body.rotation.y) * Math.min(1, dt * 8);
      if (this.headBone) {
        const want = this.busy ? 0 : THREE.MathUtils.clamp(wrap(toCam - this.body.rotation.y), -0.7, 0.7) * 0.6;
        this.headOffset = (this.headOffset || 0) + (want - (this.headOffset || 0)) * Math.min(1, dt * 5);
        this.headBone.rotation.y += this.headOffset;
      }
      return;
    }
    if (!this.card) return;
    // billboard around Y, pick the view from the camera angle relative to the duck's facing
    this.card.rotation.y = toCam;
    const rel = THREE.MathUtils.radToDeg(THREE.MathUtils.euclideanModulo(toCam - yaw + Math.PI, Math.PI * 2) - Math.PI);
    const pick = (deg) => (Math.abs(deg) < 45 ? 'front' : Math.abs(deg) > 135 ? 'back' : deg > 0 ? 'left' : 'right');
    const candidate = pick(rel);
    if (candidate !== this.view) {
      const edges = [45, 135, -45, -135];
      const nearEdge = edges.some((e) => Math.abs(rel - e) < 7);
      if (!nearEdge || this.busy) this.setView(candidate);
    }
  }
}
