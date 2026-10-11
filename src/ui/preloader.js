// Paint-swipe preloader video. Resolves `done` when the video has finished (or was skipped)
// AND the caller has called ready(). Shows once per browser session.
export function createPreloader(cfg) {
  const el = document.querySelector('[data-rea-preloader]');
  let resolveVideo;
  const videoDone = new Promise((r) => (resolveVideo = r));
  const api = { el, videoDone, setProgress() {}, hide: async () => {} };
  if (!el) { resolveVideo(); return api; }

  const video = el.querySelector('video');
  const skip = el.querySelector('[data-rea-preloader-skip]');
  const bar = el.querySelector('[data-rea-preloader-bar]');
  const seen = (() => { try { return sessionStorage.getItem(cfg.introSessionKey) === '1'; } catch { return false; } })();
  const skipVideo = cfg.reducedMotion || seen || /[?&]nointro\b/.test(location.search) || !video;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.classList.add('is-video-done');
    resolveVideo();
  };

  if (skipVideo) {
    if (video) { video.pause(); video.removeAttribute('autoplay'); video.style.display = 'none'; }
    el.classList.add('is-short');
    finish();
  } else {
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('ended', finish, { once: true });
    video.addEventListener('error', () => setTimeout(finish, 400), { once: true });
    const p = video.play();
    if (p && p.catch) p.catch(() => setTimeout(finish, 400)); // autoplay blocked (e.g. low-power mode)
    setTimeout(finish, 12000); // never hold the site hostage
  }
  skip?.addEventListener('click', finish);

  api.setProgress = (v) => {
    if (bar) bar.style.transform = `scaleX(${Math.max(0.04, Math.min(1, v))})`;
  };
  api.hide = () =>
    new Promise((resolve) => {
      try { sessionStorage.setItem(cfg.introSessionKey, '1'); } catch { /* private mode */ }
      el.classList.add('is-done');
      setTimeout(() => {
        el.setAttribute('hidden', '');
        if (video) { video.pause(); video.removeAttribute('src'); video.querySelectorAll('source').forEach((s) => s.remove()); video.load(); }
        resolve();
      }, cfg.reducedMotion ? 50 : 650);
    });
  return api;
}
