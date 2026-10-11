// Outside the hall: a golden-hour sky, the bay with sun glitter, a cable-stayed bridge silhouette
// (a nod to the Cochrane–Africatown bridge), and a warm environment map for reflections.
import * as THREE from 'three';
import { SKY_SUN, FAR_WALL_Z } from './layout.js';

const SKY_GLSL = /* glsl */ `
  uniform vec3 uSun;
  uniform float uTime;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  vec3 skyColor(vec3 dir) {
    float h = dir.y;
    float s = max(dot(dir, uSun), 0.0);
    vec3 zenith = vec3(0.07, 0.11, 0.26);
    vec3 mid = vec3(0.62, 0.28, 0.2);
    vec3 horizon = vec3(0.95, 0.43, 0.15);
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.16, h));
    col = mix(col, zenith, smoothstep(0.1, 0.6, h));
    // warm glow around the sun, kept gentle so bloom stays on the neon
    col += vec3(0.8, 0.32, 0.08) * pow(s, 9.0) * 0.55;
    col += vec3(1.2, 0.62, 0.22) * pow(s, 160.0);
    col += vec3(5.0, 3.2, 1.4) * smoothstep(0.9990, 0.9995, s); // sun disc
    // streaky golden-hour clouds
    if (h > 0.0) {
      vec2 uv = dir.xz / (h + 0.12);
      float c = fbm(uv * vec2(0.9, 3.2) + vec2(uTime * 0.004, 0.0));
      c = smoothstep(0.52, 0.78, c) * smoothstep(0.5, 0.05, h);
      vec3 cloud = mix(vec3(0.78, 0.3, 0.26), vec3(1.25, 0.62, 0.3), pow(s, 6.0));
      col = mix(col, cloud, c * 0.75);
    }
    if (h < 0.0) col = mix(horizon * 0.6, vec3(0.12, 0.1, 0.16), smoothstep(0.0, -0.25, h));
    return col;
  }
`;

export function makeSky(sunDir = SKY_SUN) {
  const uniforms = { uSun: { value: sunDir.clone() }, uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      ${SKY_GLSL}
      void main() { gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  sky.userData.uniforms = uniforms;
  return sky;
}

export function makeWater(sunDir = SKY_SUN) {
  const uniforms = { uSun: { value: sunDir.clone() }, uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld;
      ${SKY_GLSL}
      void main() {
        vec3 view = normalize(vWorld - cameraPosition);
        vec2 p = vWorld.xz * 0.06;
        float n1 = noise(p * vec2(1.0, 4.0) + vec2(0.0, uTime * 0.35));
        float n2 = noise(p * vec2(2.3, 7.0) - vec2(uTime * 0.2, uTime * 0.5));
        vec3 nrm = normalize(vec3((n1 - 0.5) * 0.18, 1.0, (n2 - 0.5) * 0.5));
        vec3 r = reflect(view, nrm);
        r.y = abs(r.y);
        vec3 col = skyColor(r) * 0.62 + vec3(0.03, 0.04, 0.08);
        // sun glitter path
        float g = pow(max(dot(r, uSun), 0.0), 260.0) * 3.0;
        col += vec3(1.8, 1.1, 0.5) * g;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1400), mat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -3, FAR_WALL_Z - 700);
  water.userData.uniforms = uniforms;
  return water;
}

/** Cable-stayed bridge + far shoreline, all as warm-dusk silhouettes. */
export function makeSkyline() {
  const g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a2430'), fog: false });
  const far = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7a4a4a'), fog: false });
  const z = FAR_WALL_Z - 230;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(420, 1.6, 4), dark);
  deck.position.set(0, 9, z);
  g.add(deck);
  for (const x of [-48, 48]) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 48, 2.2), dark);
      leg.position.set(x + s * 3.2, 24, z);
      leg.rotation.z = -s * 0.07;
      g.add(leg);
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 2.4), dark);
    cap.position.set(x, 46, z);
    g.add(cap);
    // fan of stay cables
    const pts = [];
    for (let i = 1; i <= 9; i++) {
      for (const s of [-1, 1]) {
        pts.push(new THREE.Vector3(x, 44 - i * 1.2, z), new THREE.Vector3(x + s * i * 6.5, 9.6, z));
      }
    }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#3a2430', fog: false })));
  }
  for (let i = 0; i < 14; i++) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), dark);
    pier.position.set(-200 + i * 30.8, 3, z);
    g.add(pier);
  }
  // far shore: low hills and a soft city line
  const shore = new THREE.Shape();
  shore.moveTo(-900, -3);
  for (let x = -900; x <= 900; x += 30) shore.lineTo(x, 3 + Math.sin(x * 0.013) * 3 + Math.sin(x * 0.041) * 1.5 + (Math.abs(x) < 160 ? (Math.sin(x * 0.7) > 0.2 ? 6 : 2) : 0));
  shore.lineTo(900, -3);
  const hills = new THREE.Mesh(new THREE.ShapeGeometry(shore), far);
  hills.position.set(0, 0, FAR_WALL_Z - 600);
  g.add(hills);
  return g;
}

/** Warm image-based lighting so glossy surfaces pick up the sunset. */
export function makeEnvMap(renderer, sky) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const s = sky.clone();
  s.material = sky.material.clone();
  s.material.uniforms = THREE.UniformsUtils.clone(sky.material.uniforms);
  envScene.add(s);
  // a few warm "practicals" so reflections aren't only sky
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1.1) });
  for (const x of [-30, 30]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), glow);
    panel.position.set(x, 10, 0);
    panel.lookAt(0, 10, 0);
    envScene.add(panel);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.07, 0.08) }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1;
  envScene.add(floor);
  const tex = pmrem.fromScene(envScene, 0.02, 0.1, 1000).texture;
  pmrem.dispose();
  return tex;
}
