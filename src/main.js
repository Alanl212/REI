// REA World — entry point. Works on the prototype pages and inside Webflow (see docs/webflow-build-guide.md).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getConfig } from './config.js';
import { readHousesFromDOM } from './data/houses.js';
import { World } from './world/World.js';
import { createPreloader } from './ui/preloader.js';
import { createScroll, initReveals, heroIn, initMarquees, initRail } from './ui/motion.js';
import { initCursor, initHouseDrawer, createToast, initDuckBubble, initNav, initDemoForms } from './ui/overlay.js';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

async function boot() {
  const cfg = getConfig();
  const root = document.documentElement;
  root.classList.add('rea-js');
  if (cfg.reducedMotion) root.classList.add('rea-reduced');

  const houses = readHousesFromDOM();
  const preloader = createPreloader(cfg);
  const scroll = createScroll(cfg);
  scroll.lock();
  window.scrollTo(0, 0);

  const host = document.querySelector('[data-rea-world]');
  let world = null;
  if (host && webglAvailable()) {
    try {
      world = new World(host, cfg, houses);
      gsap.ticker.add(() => world.frame(scroll.y()));
    } catch (e) {
      console.error('[REA] WebGL world failed to start', e);
      world = null;
    }
  }
  if (!world) root.classList.add('rea-no-webgl');

  // load fonts used on canvas signs, then build the world
  const fonts = Promise.all([
    document.fonts?.load(`800 64px ${cfg.canvasFont}`),
    document.fonts?.load(`600 32px ${cfg.canvasFont}`),
  ]).catch(() => null);
  preloader.setProgress(0.15);
  await fonts;
  preloader.setProgress(0.35);
  if (world) {
    try {
      await world.build();
    } catch (e) {
      console.error('[REA] World build failed', e);
      root.classList.add('rea-no-webgl');
      world = null;
    }
  }
  preloader.setProgress(1);
  await preloader.videoDone;

  // UI
  initNav();
  initDemoForms();
  initMarquees();
  initRail(scroll);
  const drawer = initHouseDrawer(houses);
  const toast = createToast();

  // analytics hooks: listen for these on document (e.g. send to GA4 / Plausible from Webflow)
  const track = (name, detail) => document.dispatchEvent(new CustomEvent(`rea:${name}`, { detail }));
  document.addEventListener('click', (e) => {
    const cta = e.target.closest?.('a.rea-btn, button.rea-btn, [data-track]');
    if (cta) track('cta', { label: cta.dataset.track || cta.textContent.trim(), href: cta.getAttribute('href') });
  });

  const goToHouse = (h) => {
    track('house', { key: h.key, name: h.name });
    const el = world?.tour.scrollTargetFor(`house-${h.key}`);
    if (el) scroll.to(el);
    else drawer.open(h.key);
  };

  if (world) {
    initCursor(world);
    initDuckBubble(world);
    world.on('house', goToHouse);
    world.on('stop', ({ name }) => track('stop', { name }));
    world.on('spin', (h) => {
      track('spin', { key: h.key, name: h.name });
      toast.show({
        title: `House ${h.name}!`,
        text: `${h.language} for “${h.meaning}” · ${h.pillar}`,
        color: h.color,
        ink: h.ink,
        action: { label: `Meet ${h.name}`, onClick: () => goToHouse(h) },
      });
      document.querySelectorAll('[data-spin-result]').forEach((el) => { el.textContent = `The wheel picked House ${h.name} (${h.language}, “${h.meaning}”).`; });
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest?.('[data-world-action="spin"]')) world.hub.spin();
    });
    window.addEventListener('load', () => { world.tour.measure(); ScrollTrigger.refresh(); });
    ScrollTrigger.addEventListener('refresh', () => world.tour.measure());
  } else {
    initCursor(null);
    // no WebGL: spin buttons pick a House at random so the experience still works
    document.addEventListener('click', (e) => {
      if (!e.target.closest?.('[data-world-action="spin"]')) return;
      const h = houses[Math.floor(Math.random() * houses.length)];
      toast.show({ title: `House ${h.name}!`, text: `${h.language} for “${h.meaning}”`, color: h.color, ink: h.ink, action: { label: `Meet ${h.name}`, onClick: () => goToHouse(h) } });
    });
  }

  await preloader.hide();
  let hash = null;
  try { hash = location.hash ? document.querySelector(decodeURIComponent(location.hash)) : null; } catch { hash = null; }
  if (world) world.intro({ instant: !!hash });
  heroIn(cfg, hash || !world ? 0.1 : 1.6);
  initReveals(cfg);
  scroll.unlock();
  if (hash) scroll.to(hash, { immediate: true });

  window.REA = { world, scroll, drawer, houses, cfg };
  document.dispatchEvent(new CustomEvent('rea:ready', { detail: window.REA }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
