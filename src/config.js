// Runtime configuration. In Webflow, set window.REA_WORLD before the bundle loads, e.g.
//   <script>window.REA_WORLD = { assets: 'https://your-host.example/assets/', model: 'models/rea-duck.glb' }</script>
// Anything omitted falls back to the defaults below. A data-* attribute on the
// [data-rea-world] element (data-model="...") also works.
const script = document.currentScript;
const scriptBase = script && script.src ? new URL('../assets/', script.src).href : new URL('assets/', location.href).href;

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
    // Rigged mascot: drop rea-duck.glb into assets/models and set model to 'models/rea-duck.glb'.
    model: abs(user.model || (host && host.dataset.model) || null),
    modelClips: { idle: /idle|breath|stand/i, hop: /jump|hop/i, walk: /walk|run/i, wave: /wave|hello|greet/i, dance: /dance|cheer|celebrat/i, ...(user.modelClips || {}) },
    duckViews: {
      front: abs('img/duck-front.webp'),
      left: abs('img/duck-left.webp'),
      back: abs('img/duck-back.webp'),
      right: abs('img/duck-right.webp'),
    },
    font3d: abs('fonts/bricolage-800.typeface.json'),
    canvasFont: user.canvasFont || '"Bricolage Grotesque", system-ui, sans-serif',
    markerFont: user.markerFont || '"Permanent Marker", "Bricolage Grotesque", cursive',
    introSessionKey: 'rea-intro-seen',
    debug: /[?&]debug\b/.test(location.search),
    snap: /[?&]snap\b/.test(location.search), // jump the camera straight to each stop (testing)
  };
}
