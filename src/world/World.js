// The REA world: the Grand Hall. Renderer + post-processing, golden-hour lighting, camera,
// interaction, and the intro where the lights come up and the neon arches flicker on.
import * as THREE from 'three';
import gsap from 'gsap';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeSky, makeWater, makeSkyline, makeEnvMap } from './hall/env.js';
import { buildHall } from './hall/architecture.js';
import { furnishHall, houseNeonMap } from './hall/zones.js';
import { plant } from './hall/props.js';
import { SUN_DIR, ENTRANCE_Z, FAR_WALL_Z, ZONES } from './hall/layout.js';
import { Mascot } from './Mascot.js';
import { Confetti } from './Confetti.js';
import { Tour, makePresets } from './Tour.js';

export const ENROLLMENT = [
  { students: 164, label: 'Year 1 · K–2 + 6' },
  { students: 276, label: 'Year 2 · + 3 & 7' },
  { students: 368, label: 'Year 3 · + 4 & 8' },
  { students: 432, label: 'Year 4 · full K–8' },
  { students: 432, label: 'Year 5 · full K–8' },
];
export const STATS = [
  { value: '300+', label: 'Survey responses' },
  { value: '100+', label: '1:1 conversations' },
  { value: '10+', label: 'Community events' },
  { value: '4', label: 'Town halls' },
];
export const VOICES = ['High expectations + cultural pride', 'Strong literacy & math', 'Mental-health support', 'Arts, tech & careers', 'A real voice in decisions', 'Honor our history'];
const EXPOSURE = 0.9;

export class World {
  constructor(host, cfg, houses) {
    this.host = host;
    this.cfg = cfg;
    this.houses = houses;
    this.ticks = [];
    this.resizers = [];
    this.pieces = [];
    this.neons = [];
    this.interactives = [];
    this.listeners = {};
    this.clock = new THREE.Timer();
    this.clock.connect(document); // pauses delta while the tab is hidden
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerSmooth = new THREE.Vector2(0, 0);
    this.ready = false;
    this.hovered = null;

    const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    this.mobile = mobile;
    this.quality = cfg.quality || (mobile ? 'low' : 'high');
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 1.6 : 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.setClearColor('#120d0b');
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'rea-world__canvas';
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.sky = makeSky();
    scene.add(this.sky);
    this.water = makeWater();
    scene.add(this.water);
    scene.add(makeSkyline());
    scene.environment = makeEnvMap(renderer, this.sky);
    scene.environmentIntensity = 0.45;
    scene.fog = new THREE.FogExp2('#6e4a36', 0.0011);
    this.scene = scene;

    this.hemi = new THREE.HemisphereLight('#9fb2d4', '#3a271b', 0.62);
    scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#ff9d52', 2.2);
    sun.target.position.set(0, 0, -45);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 170);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.quality === 'high' ? 2048 : 1024, this.quality === 'high' ? 2048 : 1024);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 42; sc.bottom = -42; sc.near = 20; sc.far = 330;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 2;
    scene.add(sun, sun.target);
    this.sun = sun;

    this.camera = new THREE.PerspectiveCamera(44, 1, 0.3, 1500);
    this.camera.position.set(0, 28, 15);
    this.lookTarget = new THREE.Vector3(0, 6, -60);
    this.camera.lookAt(this.lookTarget);

    // post-processing: HDR render -> bloom -> tone mapping
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.quality === 'high' ? 4 : 0 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), this.quality === 'high' ? 0.42 : 0.36, 0.42, 1.3);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.raycaster = new THREE.Raycaster();
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.bindPointer();
  }

  /* ---------------------------------------------------------------- events */
  on(name, fn) { (this.listeners[name] ||= []).push(fn); return this; }
  emit(name, data) { (this.listeners[name] || []).forEach((fn) => fn(data)); }
  onTick(fn) { this.ticks.push(fn); }
  onResize(fn) { this.resizers.push(fn); }

  /** Register something that should "build in" during the intro. */
  addPiece(obj, { kind = 'pop', delay = 0, at = null } = {}) {
    const p = at || obj.getWorldPosition(new THREE.Vector3());
    this.pieces.push({ obj, kind, delay, depth: THREE.MathUtils.clamp((ENTRANCE_Z - p.z) / (ENTRANCE_Z - FAR_WALL_Z), 0, 1) });
  }

  interactive(obj, { label, onClick, hoverScale = true }) {
    obj.userData.interactive = { label, onClick, hoverScale };
    this.interactives.push(obj);
  }

  /* ---------------------------------------------------------------- build */
  async build() {
    this.font = await new FontLoader().loadAsync(this.cfg.font3d).catch((e) => { console.warn('[REA] 3D font failed', e); return null; });
    const hall = buildHall(this, { quality: this.quality, houseNeon: houseNeonMap(this.houses), plantFactory: (s) => plant(s) });
    this.hall = hall;
    hall.arches.forEach((a) => this.neons.push({ mat: a.mat, z: a.z }));
    hall.neonRibs.forEach((r) => this.neons.push({ mat: r.mat, z: r.z }));
    hall.sign?.mats.forEach((m) => this.neons.push({ mat: m, z: -34, sign: true }));
    this.neons.push({ mat: hall.windowRing, z: FAR_WALL_Z });

    const zones = furnishHall(this, {
      houses: this.houses,
      enrollment: this.cfg.enrollment || ENROLLMENT,
      stats: this.cfg.stats || STATS,
      voices: this.cfg.voices || VOICES,
      cupPoints: this.cfg.cupPoints || [1240, 1180, 1305, 1210],
    });
    this.zones = zones;
    this.hub = zones.wheel; // spin() lives here (kept name for the UI layer)
    this.road = zones.road;
    this.cup = zones.cup;
    zones.houseGroups.forEach((g) => { g.userData.interactive.hoverScale = false; });
    this.confetti = new Confetti(this);

    this.presets = makePresets(this.houses);
    this.tour = new Tour(this, this.presets);
    this.tour.collect();

    this.mascot = new Mascot(this);
    await this.mascot.load(this.cfg);
    this.mascot.placeAt(this.tour.stops[0]?.preset.duck || new THREE.Vector3(2.8, 0, 4));
    this.interactive(this.mascot.root, { label: 'Say hi', onClick: () => { this.mascot.react(); this.emit('duck'); } });

    this.on('stop', ({ name, preset }) => {
      if (preset.duck) this.mascot.moveTo(preset.duck);
      this.road.grow(name === 'road');
      this.cup.show(name === 'houses-cup');
    });
    this.onTick((t) => {
      this.sky.userData.uniforms.uTime.value = t;
      this.water.userData.uniforms.uTime.value = t;
    });
    this.ready = true;
  }

  /** The hall powers up: lights rise, neon arches flicker on down the hall, the duck drops in. */
  intro({ instant = false } = {}) {
    const first = this.tour.stops[0];
    const start = this.tour.framed(first ? first.preset : { pos: new THREE.Vector3(0, 4, 18), subject: new THREE.Vector3(0, 8, -90), side: 0, shift: 0 });
    const finish = () => {
      this.tour.enabled = true;
      this.tour.active = 0;
      this.mascot.faceCamera();
      this.emit('introdone');
    };
    if (instant || this.cfg.reducedMotion) {
      this.camera.position.copy(start.pos);
      this.lookTarget.copy(start.target);
      finish();
      return gsap.timeline();
    }
    const tl = gsap.timeline({ onComplete: finish });
    // lights come up
    this.renderer.toneMappingExposure = 0.08;
    tl.to(this.renderer, { toneMappingExposure: EXPOSURE, duration: 2.6, ease: 'power2.inOut' }, 0);
    // neon flickers on, nearest first
    for (const n of this.neons) {
      const set = n.mat.userData.setGlow;
      if (!set) continue;
      set(0);
      const proxy = { v: 0 };
      const at = n.sign ? 2.2 : 0.35 + (ENTRANCE_Z - n.z) / (ENTRANCE_Z - FAR_WALL_Z) * 1.9 + Math.random() * 0.1;
      tl.to(proxy, { keyframes: [{ v: 1, duration: 0.05 }, { v: 0.1, duration: 0.07 }, { v: 0.9, duration: 0.05 }, { v: 0.25, duration: 0.09 }, { v: 1, duration: 0.25 }], onUpdate: () => set(proxy.v) }, at);
    }
    for (const p of this.pieces) {
      const o = p.obj;
      const base = o.scale.clone();
      const baseY = o.position.y;
      const t0 = 0.6 + p.depth * 1.6 + p.delay;
      if (p.kind === 'drop') {
        o.position.y = baseY + 20;
        o.visible = false;
        tl.set(o, { visible: true }, t0).to(o.position, { y: baseY, duration: 0.9, ease: 'bounce.out' }, t0);
      } else if (p.kind === 'rise') {
        o.scale.set(base.x, 0.001, base.z);
        tl.to(o.scale, { y: base.y, duration: 0.9, ease: 'elastic.out(1, 0.6)' }, t0);
      } else {
        o.scale.set(0.001, 0.001, 0.001);
        tl.to(o.scale, { x: base.x, y: base.y, z: base.z, duration: 0.7, ease: 'back.out(2)' }, t0);
      }
    }
    const duck = this.mascot.body;
    duck.position.y = 18;
    tl.to(duck.position, { y: 0, duration: 1.0, ease: 'bounce.out' }, 2.4)
      .fromTo(duck.scale, { y: 1.25, x: 0.85 }, { y: 1, x: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 3.2);
    // camera glides down from the vault to the first stop
    this.camera.position.set(start.pos.x, 26, start.pos.z - 4);
    this.lookTarget.set(start.target.x, start.target.y + 6, start.target.z);
    tl.to(this.camera.position, { x: start.pos.x, y: start.pos.y, z: start.pos.z, duration: 3.8, ease: 'power3.inOut' }, 0.1)
      .to(this.lookTarget, { x: start.target.x, y: start.target.y, z: start.target.z, duration: 3.8, ease: 'power3.inOut' }, 0.1);
    this.introTl = tl;
    return tl;
  }

  /* ---------------------------------------------------------------- pointer + picking */
  bindPointer() {
    const el = this.renderer.domElement;
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
      this.pointerDirty = true;
      this.pointerTarget = e.target;
    }, { passive: true });
    el.addEventListener('click', (e) => {
      this.pointer.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
      const hit = this.pick();
      if (hit) hit.userData.interactive.onClick();
    });
  }

  pick() {
    if (!this.ready) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactives, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.interactive) o = o.parent;
      if (o) return o;
    }
    return null;
  }

  updateHover() {
    if (!this.pointerDirty) return;
    this.pointerDirty = false;
    const overCanvas = this.pointerTarget === this.renderer.domElement;
    const hit = overCanvas ? this.pick() : null;
    if (hit === this.hovered) return;
    const scaleable = (o) => o && o !== this.mascot.root && o.userData.interactive.hoverScale;
    if (scaleable(this.hovered)) gsap.to(this.hovered.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    this.hovered = hit;
    if (scaleable(hit)) gsap.to(hit.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    this.renderer.domElement.style.cursor = hit ? 'pointer' : '';
    this.emit('hover', hit ? hit.userData.interactive.label : null);
  }

  /* ---------------------------------------------------------------- loop */
  resize() {
    this.width = this.host.clientWidth || window.innerWidth;
    this.height = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = this.camera.aspect < 1 ? 58 : 44;
    this.camera.updateProjectionMatrix();
    this.resizers.forEach((fn) => fn());
    this.tour?.measure();
  }

  frame(scrollY) {
    this.clock.update();
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsed();
    if (this.ready) {
      const r = this.tour.update(scrollY);
      if (r) {
        const k = this.cfg.snap ? 1 : 1 - Math.exp(-dt * (this.cfg.reducedMotion ? 12 : 3.2));
        this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));
        const dir = r.pos.clone().sub(r.target);
        const right = new THREE.Vector3().crossVectors(THREE.Object3D.DEFAULT_UP, dir).normalize();
        const amt = this.cfg.reducedMotion || this.mobile ? 0 : Math.min(dir.length(), 40) * 0.02;
        r.pos.addScaledVector(right, -this.pointerSmooth.x * amt).addScaledVector(THREE.Object3D.DEFAULT_UP, this.pointerSmooth.y * amt * 0.5);
        this.camera.position.lerp(r.pos, k);
        this.lookTarget.lerp(r.target, k);
      }
      for (const fn of this.ticks) fn(t, dt);
      this.mascot.update(dt, t);
      this.confetti.update(dt);
      this.updateHover();
    }
    this.camera.lookAt(this.lookTarget);
    this.composer.render(dt);
  }

  /** Screen position (px) of a world point, for HTML speech bubbles. */
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.width, y: (-p.y * 0.5 + 0.5) * this.height, visible: p.z < 1 };
  }
}

export { ZONES };
