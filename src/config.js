// Runtime configuration. In Webflow, set window.REA_WORLD before the bundle loads, e.g.
//   <script>window.REA_WORLD = { assets: 'https://your-host.example/assets/', model: 'models/rea-duck.glb' }</script>
// Anything omitted falls back to the defaults below. A data-* attribute on the
// [data-rea-world] element (data-model="...") also works.
const script = document.currentScript;
const scriptBase = script && script.src ? new URL('../assets/', script.src).href : new URL('assets/', location.href).href;

function modelSetting(user, host, abs) {
  if (user.model === false || (host && host.dataset.model === 'none')) return null;
  return abs(user.model || (host && host.dataset.model) || 'models/rea-duck.glb');
}

export function getConfig() {
  const user = window.REA_WORLD || {};
  const host = document.querySelector('[data-rea-world]');
  const assets = user.assets || (host && host.dataset.assets) || scriptBase;
  const abs = (p) => (p ? new URL(p, assets).href : null);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    assets,
    abs,
    reducedMotion: user.reducedMotion ?? reduced,
    // Rigged 3D duck. Defaults to assets/models/rea-duck.glb; set model: false (or data-model="none")
    // to keep only the lightweight paper duck.
    model: modelSetting(user, host, abs),
    modelClips: { idle: /idle|breath|stand|expression/i, wave: /wave|hello|greet/i, ...(user.modelClips || {}) },
    modelHeadBone: user.modelHeadBone || /(^|[^a-z])head$|spine\.006$/i,
    modelGlow: user.modelGlow ?? 0.14,
    duckViews: {
      front: abs('img/duck-front.webp'),
      left: abs('img/duck-left.webp'),
      back: abs('img/duck-back.webp'),
      right: abs('img/duck-right.webp'),
    },
    font3d: abs('fonts/bricolage-800.typeface.json'),
    quality: user.quality || null, // 'high' | 'low' (auto by default)
    // numbers shown inside the 3D world (keep in sync with the page copy)
    enrollment: user.enrollment || null,
    stats: user.stats || null,
    voices: user.voices || null,
    cupPoints: user.cupPoints || null,
    canvasFont: user.canvasFont || '"Bricolage Grotesque", system-ui, sans-serif',
    markerFont: user.markerFont || '"Permanent Marker", "Bricolage Grotesque", cursive',
    introSessionKey: 'rea-intro-seen',
    debug: /[?&]debug\b/.test(location.search),
    snap: /[?&]snap\b/.test(location.search), // jump the camera straight to each stop (testing)
  };
}
