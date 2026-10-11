// HTML layers over the world: cursor label, House drawer, wheel result toast, duck speech bubble,
// mobile nav and demo forms.
import gsap from 'gsap';

/* ---------------------------------------------------------------- cursor */
export function initCursor(world) {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const el = document.createElement('div');
  el.className = 'rea-cursor';
  el.innerHTML = '<span class="rea-cursor__dot"></span><span class="rea-cursor__label"></span>';
  document.body.appendChild(el);
  const label = el.querySelector('.rea-cursor__label');
  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
  const set = (text) => {
    el.classList.toggle('has-label', !!text);
    if (text) label.textContent = text;
  };
  world?.on('hover', set);
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('[data-cursor]');
    if (t) set(t.dataset.cursor);
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest?.('[data-cursor]');
    if (t && !t.contains(e.relatedTarget)) set(null);
  });
}

/* ---------------------------------------------------------------- house drawer */
export function initHouseDrawer(houses) {
  const dialog = document.createElement('dialog');
  dialog.className = 'rea-drawer';
  dialog.setAttribute('aria-label', 'House details');
  dialog.innerHTML = '<button class="rea-drawer__close" type="button" aria-label="Close">×</button><div class="rea-drawer__body"></div>';
  document.body.appendChild(dialog);
  const body = dialog.querySelector('.rea-drawer__body');
  dialog.querySelector('.rea-drawer__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  function fallbackDetail(h) {
    const wrap = document.createElement('div');
    wrap.className = 'rea-house-detail';
    const tag = document.createElement('p');
    tag.className = 'rea-eyebrow';
    tag.textContent = `${h.language} · “${h.meaning}” · say ${h.say}`;
    const title = document.createElement('h3');
    title.className = 'rea-house-detail__name';
    title.textContent = h.name;
    const pillar = document.createElement('p');
    pillar.className = 'rea-house-detail__pillar';
    pillar.textContent = h.pillar;
    const blurb = document.createElement('p');
    blurb.textContent = h.blurb;
    const traits = document.createElement('ul');
    traits.className = 'rea-chips';
    (h.traits || []).forEach((t) => { const li = document.createElement('li'); li.textContent = t; traits.appendChild(li); });
    wrap.append(tag, title, pillar, blurb, traits);
    return wrap;
  }

  function open(key) {
    const h = houses.find((x) => x.key === key);
    if (!h) return;
    const tpl = document.querySelector(`[data-house-detail="${CSS.escape(key)}"]`);
    body.replaceChildren(tpl ? tpl.cloneNode(true) : fallbackDetail(h));
    body.firstElementChild.removeAttribute('hidden');
    dialog.style.setProperty('--house', h.color);
    dialog.style.setProperty('--house-ink', h.ink);
    dialog.showModal();
    gsap.fromTo(dialog, { x: 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-open-house]');
    if (b) { e.preventDefault(); open(b.dataset.openHouse); }
  });
  return { open, close: () => dialog.close() };
}

/* ---------------------------------------------------------------- toast */
export function createToast() {
  const el = document.createElement('div');
  el.className = 'rea-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  let timer;
  return {
    show({ title, text, color = '#FCD615', ink = '#111', action }) {
      clearTimeout(timer);
      el.replaceChildren();
      el.style.setProperty('--toast', color);
      el.style.setProperty('--toast-ink', ink);
      const t = document.createElement('strong');
      t.textContent = title;
      const p = document.createElement('span');
      p.textContent = text;
      el.append(t, p);
      if (action) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rea-btn rea-btn--small';
        b.textContent = action.label;
        b.addEventListener('click', () => { action.onClick(); el.classList.remove('is-on'); });
        el.appendChild(b);
      }
      el.classList.add('is-on');
      timer = setTimeout(() => el.classList.remove('is-on'), 7000);
    },
  };
}

/* ---------------------------------------------------------------- duck speech bubble */
const QUACKS = ['Quack! Think critically.', 'Write powerfully!', 'Advocate boldly!', 'Welcome to the flock!', 'Which House are you?', 'Built with Mobile, for Mobile.', 'K–8, tuition-free. Quack.'];
export function initDuckBubble(world) {
  const el = document.createElement('div');
  el.className = 'rea-bubble';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  let i = 0;
  let until = 0;
  world.on('duck', () => {
    el.textContent = QUACKS[i++ % QUACKS.length];
    el.classList.add('is-on');
    until = performance.now() + 2600;
  });
  gsap.ticker.add(() => {
    if (!el.classList.contains('is-on')) return;
    if (performance.now() > until) { el.classList.remove('is-on'); return; }
    const p = world.project(world.mascot.headWorldPosition());
    el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  });
}

/* ---------------------------------------------------------------- nav + forms */
export function initNav() {
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-nav-toggle]');
  if (!nav || !toggle) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }));
}

/** Prototype-only: fake a successful submit. In Webflow, use native Webflow forms instead. */
export function initDemoForms() {
  document.querySelectorAll('[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = form.parentElement.querySelector('[data-form-success]');
      form.hidden = true;
      if (ok) { ok.hidden = false; ok.focus?.(); }
    });
  });
}
