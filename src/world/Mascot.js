// The REA duck, our guide through the hall. Two looks behind one API:
//  - "paper": the four turnaround renders as a camera-facing cut-out that picks the right view
//    (front / left / back / right) from the camera angle. Tiny, so it shows up instantly.
//  - "model": the rigged GLB (assets/models/rea-duck.glb). Loads in the background and swaps in
//    when ready. Idles on its Expressions clip, waves Hello when it arrives or is clicked,
//    blinks, and turns its head toward the camera.
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { blobShadow } from './kit.js';

const HEIGHT = 3.2;
// transparent margin under the feet in each source image (fraction of image height)
const FOOT_PAD = { front: 0.04, left: 0.019, back: 0.019, right: 0.037 };
const ASPECT = 419 / 887;
const wrap = (a) => THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;

export class Mascot {
  constructor(world) {
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'mascot';
    this.body = new THREE.Group(); // hop / squash target
    this.root.add(this.body);
    this.shadow = blobShadow(1.2, 0.42);
    this.root.add(this.shadow);
    this.yaw = 0; // logical facing (radians, 0 = +Z)
    this.view = 'front';
    this.mode = 'paper';
    this.busy = null;
    this.idleTimer = 0;
    this.lookAway = 0;
    this.headBone = null;
    this.headOffset = 0;
    this.eyelids = [];
    this.blinkAt = 2;
    this.lastWave = -99;
    this.mixer = null;
    this.actions = {};
    world.scene.add(this.root);
  }

  /** Resolves as soon as the paper duck is visible; the 3D model upgrades it when it arrives. */
  async load(cfg) {
    await this.loadPaper(cfg.duckViews);
    if (!cfg.model) return;
    this.modelReady = this.loadModel(cfg)
      .then(() => this.swapToModel())
      .catch((e) => console.warn('[REA] Could not load the 3D duck, keeping the paper duck.', e));
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
    const geo = new THREE.PlaneGeometry(HEIGHT * ASPECT, HEIGHT);
    geo.translate(0, HEIGHT / 2, 0);
    this.card = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.textures.front, color: new THREE.Color(1.08, 1.03, 1.0), transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }));
    this.card.renderOrder = 2;
    this.body.add(this.card);
    this.setView('front', true);
  }

  async loadModel(cfg) {
    // plain, Draco- and Meshopt-compressed GLB files all work
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(cfg.abs('draco/'));
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(cfg.model);
    draco.dispose();

    const model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false; // skinned bounds are bind-pose only
        if (o.morphTargetDictionary && 'Close' in o.morphTargetDictionary) this.eyelids.push(o);
        // a touch of self-light keeps the painted teal / orange / gold true under the warm hall light
        const m = o.material;
        if (m && m.map && cfg.modelGlow > 0) {
          m.emissive = new THREE.Color('#ffffff');
          m.emissiveMap = m.map;
          m.emissiveIntensity = cfg.modelGlow;
        }
      }
      if (!this.headBone && o.isBone && cfg.modelHeadBone.test(o.name)) this.headBone = o;
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = HEIGHT / (size.y || 1);
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    model.visible = false;
    this.body.add(model);
    this.model = model;

    if (gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(model);
      for (const [key, re] of Object.entries(cfg.modelClips)) {
        const clip = gltf.animations.find((c) => (re instanceof RegExp ? re.test(c.name) : c.name === re));
        if (clip) this.actions[key] = this.mixer.clipAction(clip);
      }
      this.actions.idle ||= this.mixer.clipAction(gltf.animations[0]);
      this.mixer.addEventListener('finished', (e) => {
        if (e.action === this.current && e.action !== this.actions.idle) this.play('idle', { fade: 0.6 });
      });
    }
  }

  swapToModel() {
    if (!this.model) return;
    const card = this.card;
    const show = () => {
      this.model.visible = true;
      this.mode = 'model';
      this.play('idle', { fade: 0 });
      if (card) card.visible = false;
    };
    if (this.world.cfg.reducedMotion || !card) { show(); return; }
    gsap.to(card.scale, { x: 0.01, y: 1.15, duration: 0.18, ease: 'power2.in', onComplete: () => {
      show();
      const s = this.model.scale.x;
      gsap.fromTo(this.model.scale, { x: s * 0.6, y: s * 1.3, z: s * 0.6 }, { x: s, y: s, z: s, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      this.wave(true);
    } });
  }

  play(name, { once = false, fade = 0.35 } = {}) {
    const next = this.actions[name];
    if (!next) return false;
    if (this.current === next && !once) return true;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (this.current && this.current !== next && fade > 0) next.crossFadeFrom(this.current, fade, false);
    else if (this.current && this.current !== next) this.current.stop();
    next.play();
    this.current = next;
    return true;
  }

  /** Wave hello (model only). Throttled so scrolling past stops doesn't make it frantic. */
  wave(force = false) {
    if (this.mode !== 'model' || this.world.cfg.reducedMotion) return false;
    const now = performance.now() / 1000;
    if (!force && now - this.lastWave < 7) return false;
    this.lastWave = now;
    return this.play('wave', { once: true, fade: 0.3 });
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
    const land = () => {
      this.busy = null;
      this.faceCamera();
      this.wave();
      onLand?.();
    };
    if (dist < 0.3) { this.faceCamera(); return; }
    if (this.world.cfg.reducedMotion || this.world.cfg.snap) {
      this.root.position.copy(to);
      this.body.position.y = 0;
      land();
      return;
    }
    this.yaw = Math.atan2(to.x - from.x, to.z - from.z);
    const big = dist > 14;
    const hops = big ? 1 : Math.max(1, Math.round(dist / 3.2));
    const height = big ? Math.min(11, 3.5 + dist * 0.12) : 1.0;
    const per = big ? Math.min(1.5, 0.7 + dist * 0.012) : 0.36;
    if (this.current === this.actions.wave) this.play('idle', { fade: 0.2 });
    const tl = gsap.timeline({ onComplete: land });
    for (let i = 0; i < hops; i++) {
      const a = from.clone().lerp(to, i / hops);
      const b = from.clone().lerp(to, (i + 1) / hops);
      const proxy = { t: 0 };
      tl.to(this.body.scale, { y: 0.82, x: 1.12, z: 1.12, duration: 0.07, ease: 'power1.out' })
        .to(this.body.scale, { y: 1.08, x: 0.94, z: 0.94, duration: 0.08 })
        .to(proxy, {
          t: 1,
          duration: per,
          ease: 'none',
          onUpdate: () => {
            this.root.position.lerpVectors(a, b, proxy.t);
            this.body.position.y = Math.sin(Math.PI * proxy.t) * height;
          },
        })
        .to(this.body.scale, { y: 0.84, x: 1.1, z: 1.1, duration: 0.07 })
        .to(this.body.scale, { y: 1, x: 1, z: 1, duration: 0.18, ease: 'back.out(3)' });
    }
    this.busy = tl;
  }

  /** Click reaction: the model waves; the paper duck does a jump-spin through all four views. */
  react() {
    if (this.busy) return;
    if (this.wave(true)) {
      gsap.fromTo(this.body.scale, { y: 0.88, x: 1.08, z: 1.08 }, { y: 1, x: 1, z: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      return;
    }
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
    return v.set(0, HEIGHT * 0.9 + this.body.position.y, 0).applyMatrix4(this.root.matrixWorld);
  }

  update(dt, t) {
    const cam = this.world.camera.position;
    const p = this.root.position;

    // idle: a little bounce, and now and then a glance away
    if (!this.busy) {
      if (this.mode === 'paper') this.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.06;
      this.idleTimer += dt;
      if (this.idleTimer > 9 && !this.world.cfg.reducedMotion && !this.world.cfg.snap) {
        this.idleTimer = 0;
        this.lookAway = (Math.random() < 0.5 ? -1 : 1) * (this.mode === 'model' ? 0.6 : 1.5);
        gsap.delayedCall(1.2, () => { this.lookAway = 0; });
      }
    } else this.idleTimer = 0;

    const toCam = Math.atan2(cam.x - p.x, cam.z - p.z);
    const yaw = this.yaw + (this.busy ? 0 : this.lookAway);
    this.shadow.scale.setScalar(1 - Math.min(0.6, this.body.position.y / 10));

    if (this.mode === 'model') {
      // undo last frame's head offset so it never accumulates when clips don't drive the head
      if (this.headBone) this.headBone.rotation.y -= this.headOffset;
      this.mixer?.update(dt);
      this.body.rotation.y += wrap(yaw - this.body.rotation.y) * Math.min(1, dt * 7);
      if (this.headBone) {
        const want = this.busy ? 0 : THREE.MathUtils.clamp(wrap(toCam - this.body.rotation.y), -0.6, 0.6) * 0.7;
        this.headOffset += (want - this.headOffset) * Math.min(1, dt * 4);
        this.headBone.rotation.y += this.headOffset;
      }
      // blink: Close = b, Follow eye curvature = 4b(1-b), as the rig's notes describe
      if (t > this.blinkAt + 0.2) this.blinkAt = t + 2.2 + Math.random() * 3.2;
      const phase = (t - this.blinkAt) / 0.18;
      if (phase > 0 && phase < 1 && !this.world.cfg.reducedMotion) {
        const b = Math.sin(Math.PI * phase);
        for (const lid of this.eyelids) {
          const d = lid.morphTargetDictionary;
          const inf = lid.morphTargetInfluences;
          inf[d.Close] = Math.max(inf[d.Close], b);
          if (d['Follow eye curvature'] !== undefined) inf[d['Follow eye curvature']] = Math.max(inf[d['Follow eye curvature']], 4 * b * (1 - b));
        }
      }
      return;
    }
    if (!this.card) return;
    // billboard around Y, pick the view from the camera angle relative to the duck's facing
    this.card.rotation.y = toCam;
    const rel = THREE.MathUtils.radToDeg(wrap(toCam - yaw));
    const pick = (deg) => (Math.abs(deg) < 45 ? 'front' : Math.abs(deg) > 135 ? 'back' : deg > 0 ? 'left' : 'right');
    const candidate = pick(rel);
    if (candidate !== this.view) {
      const nearEdge = [45, 135, -45, -135].some((e) => Math.abs(rel - e) < 7);
      if (!nearEdge || this.busy) this.setView(candidate);
    }
  }
}
