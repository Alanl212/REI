// Smooth scroll (Lenis) + GSAP scroll reveals, split headings, counters, marquees, progress rail.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export function createScroll(cfg) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const lenis = cfg.reducedMotion ? null : new Lenis({ autoRaf: false, lerp: 0.09, wheelMultiplier: 0.9, touchMultiplier: 1.2 });
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
  }
  gsap.ticker.lagSmoothing(0);
  const root = document.documentElement;
  return {
    lenis,
    y: () => (lenis ? lenis.scroll : window.scrollY),
    lock() { root.classList.add('rea-locked'); lenis?.stop(); },
    unlock() { root.classList.remove('rea-locked'); lenis?.start(); ScrollTrigger.refresh(); },
    to(target, opts = {}) {
      if (lenis) lenis.scrollTo(target, { duration: 1.6, offset: 0, ...opts });
      else (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView({ behavior: cfg.reducedMotion ? 'auto' : 'smooth' }));
    },
  };
}

/** Wrap each word in a mask so it can slide up. Keeps inline elements (mark, em, strong, br). */
export function splitWords(el) {
  if (el.dataset.splitDone) return el.querySelectorAll('.rea-w__i');
  const wrap = (node) => {
    const out = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'rea-w';
      const i = document.createElement('span');
      i.className = 'rea-w__i';
      i.textContent = part;
      w.appendChild(i);
      out.appendChild(w);
    });
    return out;
  };
  [...el.childNodes].forEach((n) => {
    if (n.nodeType === 3) n.replaceWith(wrap(n));
    else if (n.nodeType === 1 && n.tagName !== 'BR') {
      const w = document.createElement('span');
      w.className = 'rea-w';
      const i = document.createElement('span');
      i.className = 'rea-w__i';
      n.replaceWith(w);
      i.appendChild(n);
      w.appendChild(i);
    }
  });
  el.dataset.splitDone = '1';
  return el.querySelectorAll('.rea-w__i');
}

export function initReveals(cfg) {
  if (cfg.reducedMotion) return;
  // headings: words slide up
  document.querySelectorAll('[data-split]:not([data-hero-in])').forEach((el) => {
    const words = splitWords(el);
    gsap.set(words, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.035 }),
    });
  });
  // blocks: fade and rise in batches
  const blocks = gsap.utils.toArray('[data-reveal]:not([data-hero-in])');
  gsap.set(blocks, { autoAlpha: 0, y: 46 });
  ScrollTrigger.batch(blocks, {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });
  // counters
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    el.textContent = '0' + suffix;
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString() + suffix; } }),
    });
  });
  // bars (e.g. the House Cup standings)
  document.querySelectorAll('[data-bar]').forEach((el) => {
    gsap.set(el, { scaleX: 0 });
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(el, { scaleX: parseFloat(el.dataset.bar), duration: 1.4, ease: 'elastic.out(1, 0.7)' }) });
  });
}

/** Hero copy entrance, played after the preloader. */
export function heroIn(cfg, delay = 0) {
  const els = gsap.utils.toArray('[data-hero-in]');
  if (cfg.reducedMotion) { gsap.set(els, { autoAlpha: 1 }); return; }
  els.forEach((el, i) => {
    if (el.hasAttribute('data-split')) {
      gsap.set(el, { autoAlpha: 1 });
      gsap.fromTo(splitWords(el), { yPercent: 115 }, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.05, delay: delay + i * 0.12 });
    } else {
      gsap.fromTo(el, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: delay + 0.25 + i * 0.12 });
    }
  });
}

export function initMarquees() {
  document.querySelectorAll('[data-marquee]').forEach((el) => {
    const track = el.querySelector('[data-marquee-track]');
    if (!track || track.dataset.cloned) return;
    track.dataset.cloned = '1';
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    el.appendChild(clone);
  });
}

/** Right-side progress rail built from the world stops. */
export function initRail(scroll) {
  const rail = document.querySelector('[data-rea-rail]');
  const stops = [...document.querySelectorAll('[data-world-stop][data-stop-label]')];
  if (!rail || !stops.length) return;
  const list = document.createElement('ol');
  list.className = 'rea-rail__list';
  const items = stops.map((el) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rea-rail__dot';
    const label = document.createElement('span');
    label.className = 'rea-rail__label';
    label.textContent = el.dataset.stopLabel;
    b.appendChild(label);
    b.setAttribute('aria-label', `Go to ${el.dataset.stopLabel}`);
    b.addEventListener('click', () => scroll.to(el));
    li.appendChild(b);
    list.appendChild(li);
    return b;
  });
  rail.appendChild(list);
  stops.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) items.forEach((x) => x.classList.toggle('is-active', x === items[i])); },
    });
  });
}
