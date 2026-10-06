/* Original RingStage timeline, ported to the DOM without React or GSAP. */
(() => {
  'use strict';
  const stage = document.querySelector('[data-intro-stage]');
  const scene = document.querySelector('[data-intro-scene]');
  if (!stage || !scene) return;
  const root = document.documentElement;
  const copy = document.querySelector('[data-hero-text]');
  const chrome = document.querySelector('[data-intro-chrome]');
  const rings = [...scene.querySelectorAll('[data-ring]')];
  const arcs = [...scene.querySelectorAll('[data-mark] path')];
  const speeds = [1, 0.78, 0.6, 0.46, 0.34];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const previousOverflow = root.style.overflow;
  const previousRestoration = history.scrollRestoration;
  let frame = 0, hold = 0, safety = 0, finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(hold);
    clearTimeout(safety);
    cancelAnimationFrame(frame);
    root.classList.remove('intro-playing');
    root.style.overflow = previousOverflow;
    if ('scrollRestoration' in history) history.scrollRestoration = previousRestoration;
    stage.remove();
    // Preserve the page heading for assistive technology after the splash.
    if (copy) {
      copy.removeAttribute('style');
      copy.className = 'sr-only';
      copy.removeAttribute('data-hero-text');
    }
    chrome?.remove();
    reduced.removeEventListener('change', onMotionChange);
    window.removeEventListener('pagehide', finish);
  }
  function onMotionChange(event) { if (event.matches) finish(); }
  if (reduced.matches) { finish(); return; }
  function apply(progress, entranceRatio) {
    const eased = 1 - Math.pow(1 - progress, 3);
    const opacity = Math.max(0, 1 - (progress - 0.75) * 8);
    stage.style.opacity = String(opacity);
    if (copy) copy.style.opacity = String(Math.max(0, 1 - Math.max(0, progress - 0.35) * 2.6));
    if (chrome) chrome.style.opacity = String(opacity);
    scene.style.transform = `translate3d(0,0,${eased * 700}px) scale(${1 + eased * 7.5})`;
    arcs.forEach((arc, i) => arc.setAttribute('transform', `rotate(${(eased * 210 * (speeds[i] || 0.34)).toFixed(2)} 55.5 55)`));
    rings.forEach((ring, i) => {
      const depth = Number(ring.dataset.depth || 1);
      const rise = i >= 5 ? Math.min(1, 0.35 + eased * 0.6) : i <= 2 ? Math.max(0, 0.9 - eased * 1.1) : 0.85;
      const tail = Math.min(1, Math.max(0, (0.86 - progress) / 0.16));
      const entrance = Math.min(1, Math.max(0, (entranceRatio - i * 0.035) / 0.25));
      ring.style.opacity = ((i >= 3 ? rise * tail : rise) * entrance).toFixed(3);
      ring.style.transform = `translate3d(0,0,${eased * depth * 220}px) scale(${1 + eased * depth * 1.4})`;
    });
    return opacity;
  }
  root.classList.add('intro-playing');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  root.style.overflow = 'hidden';
  apply(0, 0);
  reduced.addEventListener('change', onMotionChange);
  window.addEventListener('pagehide', finish);
  // Never leave the page locked if a background tab delays animation frames.
  safety = window.setTimeout(finish, 8000);
  hold = window.setTimeout(() => {
    stage.style.willChange = 'opacity';
    scene.style.willChange = 'transform';
    let start;
    function loop(timestamp) {
      if (finished) return;
      if (start === undefined) start = timestamp;
      const t = Math.min(1, Math.max(0, (timestamp - start) / 5000));
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const opacity = apply(0.92 * eased, t);
      if (t >= 1 || opacity <= 0) finish();
      else frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
  }, 2000);
})();
