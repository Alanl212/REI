// The REA world: renderer, lights, camera, interaction, the "world builds itself" intro.
import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { PALETTE } from './kit.js';
import { buildIsland } from './build/island.js';
import { buildMotto } from './build/motto.js';
import { buildHub } from './build/houses.js';
import { buildStations } from './build/stations.js';
import { buildRoad, buildArch, buildSquare, buildHouseCup } from './build/journey.js';
import { Mascot } from './Mascot.js';
import { Confetti } from './Confetti.js';
import { Tour, makePresets, sightlines } from './Tour.js';
import { HERO } from './layout.js';

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

export class World {
  constructor(host, cfg, houses) {
    this.host = host;
    this.cfg = cfg;
    this.houses = houses;
    this.ticks = [];
    this.pieces = [];
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(PALETTE.paper);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'rea-world__canvas';
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.paper);
    scene.fog = new THREE.Fog(PALETTE.paper, 95, 230);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    this.scene = scene;

    const hemi = new THREE.HemisphereLight('#ffffff', '#dccbc1', 1.25);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff4e6', 2.4);
    sun.position.set(34, 58, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = -54; sc.right = 54; sc.top = 54; sc.bottom = -54; sc.near = 5; sc.far = 160;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    scene.add(sun);
    this.sun = sun;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 420);
    this.camera.position.set(0, 90, 95);
    this.lookTarget = new THREE.Vector3(0, 0, 0);
    this.camera.lookAt(this.lookTarget);

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

  /** Register something that should "build in" during the intro. */
  addPiece(obj, { kind = 'pop', delay = null, at = null } = {}) {
    if (kind === 'none') return;
    const p = at || obj.getWorldPosition(new THREE.Vector3());
    const dist = Math.hypot(p.x, p.z);
    this.pieces.push({ obj, kind, delay: delay ?? 0, dist });
  }

  interactive(obj, { label, onClick }) {
    obj.userData.interactive = { label, onClick };
    this.interactives.push(obj);
  }

  /* ---------------------------------------------------------------- build */
  async build() {
    const font = await new FontLoader().loadAsync(this.cfg.font3d).catch((e) => { console.warn('[REA] 3D font failed', e); return null; });
    this.font = font;
    this.presets = makePresets(this.houses);
    this.sightlines = sightlines(this.presets);
    buildIsland(this);
    buildMotto(this);
    this.hub = buildHub(this, this.houses, { onSpinResult: (h) => this.emit('spin', h) });
    this.stations = buildStations(this);
    this.road = buildRoad(this, ENROLLMENT);
    this.arch = buildArch(this);
    this.square = buildSquare(this, { stats: STATS, voices: VOICES });
    this.cup = buildHouseCup(this, this.houses, [1240, 1180, 1305, 1210]);
    this.confetti = new Confetti(this);

    this.tour = new Tour(this, this.presets);
    this.tour.collect();

    this.mascot = new Mascot(this);
    await this.mascot.load(this.cfg);
    this.mascot.placeAt(this.tour.stops[0]?.preset.duck || HERO.duck);
    this.interactive(this.mascot.root, { label: 'Say hi', onClick: () => { this.mascot.react(); this.emit('duck'); } });

    this.on('stop', ({ name, preset }) => {
      if (preset.duck) this.mascot.moveTo(preset.duck);
      this.road.grow(['road', 'graduate'].includes(name));
      this.cup.show(name === 'houses-cup');
    });
    this.ready = true;
  }

  /** Hide everything, then pop it into place while the camera swoops in. */
  intro({ instant = false } = {}) {
    const first = this.tour.stops[0];
    const start = this.tour.framed(first ? first.preset : { pos: new THREE.Vector3(0, 20, 60), subject: new THREE.Vector3(), side: 0, shift: 0 });
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
    const island = this.island;
    island.position.y = -30;
    island.scale.setScalar(0.6);
    tl.to(island.position, { y: 0, duration: 1.6, ease: 'power3.out' }, 0)
      .to(island.scale, { x: 1, y: 1, z: 1, duration: 1.6, ease: 'elastic.out(1, 0.75)' }, 0);
    for (const p of this.pieces) {
      const o = p.obj;
      const base = o.scale.clone();
      const baseY = o.position.y;
      const t0 = 0.55 + (p.dist / 46) * 1.5 + p.delay + Math.random() * 0.12;
      if (p.kind === 'splat') {
        o.scale.set(0.001, 0.001, 0.001);
        tl.to(o.scale, { x: base.x, y: base.y, z: base.z, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, t0 * 0.8);
      } else if (p.kind === 'drop') {
        o.position.y = baseY + 28;
        o.visible = false;
        tl.set(o, { visible: true }, t0).to(o.position, { y: baseY, duration: 0.9, ease: 'bounce.out' }, t0);
      } else if (p.kind === 'rise') {
        o.scale.set(base.x, 0.001, base.z);
        tl.to(o.scale, { y: base.y, duration: 0.9, ease: 'elastic.out(1, 0.6)' }, t0);
      } else if (p.kind === 'drip') {
        o.scale.set(base.x, 0.001, base.z);
        tl.to(o.scale, { y: base.y, duration: 1.2, ease: 'power2.out' }, 1.2 + Math.random() * 0.6);
      } else {
        o.scale.set(0.001, 0.001, 0.001);
        tl.to(o.scale, { x: base.x, y: base.y, z: base.z, duration: 0.65, ease: 'back.out(2.2)' }, t0);
      }
    }
    // the duck drops in last
    const duck = this.mascot.body;
    duck.position.y = 40;
    tl.to(duck.position, { y: 0, duration: 1.0, ease: 'bounce.out' }, 2.5)
      .fromTo(duck.scale, { y: 1.25, x: 0.85 }, { y: 1, x: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 3.3);
    // camera: from high above, swoop down to the first stop
    this.camera.position.set(start.pos.x + 30, 95, start.pos.z + 70);
    this.lookTarget.set(0, 0, 0);
    tl.to(this.camera.position, { x: start.pos.x, y: start.pos.y, z: start.pos.z, duration: 3.6, ease: 'power3.inOut' }, 0.1)
      .to(this.lookTarget, { x: start.target.x, y: start.target.y, z: start.target.z, duration: 3.6, ease: 'power3.inOut' }, 0.1);
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
    if (this.hovered) gsap.to(this.hovered.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    this.hovered = hit;
    if (hit && hit !== this.mascot.root) gsap.to(hit.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
    this.renderer.domElement.style.cursor = hit ? 'pointer' : '';
    this.emit('hover', hit ? hit.userData.interactive.label : null);
  }

  /* ---------------------------------------------------------------- loop */
  resize() {
    this.width = this.host.clientWidth || window.innerWidth;
    this.height = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = this.camera.aspect < 1 ? 48 : 38;
    this.camera.updateProjectionMatrix();
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
        // pointer parallax
        this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));
        const dir = r.pos.clone().sub(r.target);
        const right = new THREE.Vector3().crossVectors(THREE.Object3D.DEFAULT_UP, dir).normalize();
        const amt = this.cfg.reducedMotion || this.mobile ? 0 : dir.length() * 0.025;
        r.pos.addScaledVector(right, -this.pointerSmooth.x * amt).addScaledVector(THREE.Object3D.DEFAULT_UP, this.pointerSmooth.y * amt * 0.6);
        this.camera.position.lerp(r.pos, k);
        this.lookTarget.lerp(r.target, k);
      }
      for (const fn of this.ticks) fn(t, dt);
      this.mascot.update(dt, t);
      this.confetti.update(dt);
      this.updateHover();
    }
    this.camera.lookAt(this.lookTarget);
    this.renderer.render(this.scene, this.camera);
  }

  /** Screen position (px) of a world point, for HTML speech bubbles. */
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.width, y: (-p.y * 0.5 + 0.5) * this.height, visible: p.z < 1 };
  }
}
