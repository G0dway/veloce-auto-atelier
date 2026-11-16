(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const reduce = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  const finePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover) and (pointer: fine)')
    : { matches: false };
  const toggle = $('#motion-toggle');
  const label = $('#motion-label');
  const progress = $('#reading-progress');
  if (progress) progress.setAttribute('aria-hidden', 'true');
  const hero = $('.hero-stage');
  const visual = $('.hero-visual');
  const ownedAnimations = new Set();
  const seen = new WeakSet();
  const observed = new Set();
  const magneticElements = [...document.querySelectorAll('[data-magnetic]')];
  const magneticCleanup = [];
  let observer = null;
  let scrollFrame = 0;
  let userPreference = null;
  let disposed = false;
  let enabled = false;

  try {
    const stored = localStorage.getItem('veloce-motion');
    if (stored === 'on' || stored === 'off') userPreference = stored;
  } catch (_) { /* Motion remains available when storage is blocked. */ }

  const requestFrame = typeof window.requestAnimationFrame === 'function'
    ? (callback) => window.requestAnimationFrame(callback)
    : (callback) => window.setTimeout(callback, 16);
  const cancelFrame = typeof window.cancelAnimationFrame === 'function'
    ? (id) => window.cancelAnimationFrame(id)
    : (id) => window.clearTimeout(id);

  function animate(element, frames, options) {
    if (!enabled || !element || typeof element.animate !== 'function') return null;
    try {
      const animation = element.animate(frames, options);
      ownedAnimations.add(animation);
      const release = () => ownedAnimations.delete(animation);
      // Finished promises reject after cancel; always handle that rejection.
      if (animation.finished && typeof animation.finished.then === 'function') {
        animation.finished.then(release, release);
      } else if (typeof animation.addEventListener === 'function') {
        animation.addEventListener('finish', release, { once: true });
        animation.addEventListener('cancel', release, { once: true });
      }
      return animation;
    } catch (_) {
      // The unanimated page is the fallback; no inline hidden styles are applied.
      return null;
    }
  }

  function cancelOwnedAnimations() {
    ownedAnimations.forEach((animation) => {
      try { animation.cancel(); } catch (_) { /* Already completed. */ }
    });
    ownedAnimations.clear();
  }

  function reveal(element, immediate = false) {
    if (!element) return;
    seen.add(element);
    element.classList.add('is-visible');
    element.classList.remove('motion-pending');
    if (immediate) element.style.setProperty('--reveal-delay', '0ms');
    if (observer) observer.unobserve(element);
    observed.delete(element);
  }

  function revealAll() {
    document.querySelectorAll('.motion-pending, .reveal, .car-card, .philosophy-image, .contact-main')
      .forEach((element) => reveal(element, true));
    observed.clear();
  }

  function prepareReveals() {
    const candidates = [...document.querySelectorAll('.reveal, .car-card, .philosophy-image, .contact-main')];
    if (!enabled || !observer) {
      candidates.forEach((element) => reveal(element, true));
      return;
    }
    candidates.forEach((element) => {
      if (seen.has(element) || observed.has(element) || element.hidden) return;
      const cardIndex = Number(element.dataset.card || 0);
      const delay = element.matches('.car-card') ? Math.min(cardIndex % 2, 1) * 100 : 0;
      element.style.setProperty('--reveal-delay', `${delay}ms`);
      // Only add a hidden state after a working observer has accepted this item.
      try {
        observer.observe(element);
        observed.add(element);
        element.classList.add('motion-pending');
      } catch (_) {
        reveal(element, true);
      }
    });
  }

  if ('IntersectionObserver' in window) {
    try {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || !enabled) reveal(entry.target, !enabled);
        });
      }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
    } catch (_) { observer = null; }
  }

  function resetMagnets() {
    magneticElements.forEach((element) => {
      element.style.setProperty('--magnet-x', '0px');
      element.style.setProperty('--magnet-y', '0px');
    });
  }

  function renderScroll() {
    scrollFrame = 0;
    if (disposed) return;
    const viewport = window.innerHeight || root.clientHeight || 1;
    const offset = Math.max(0, window.scrollY || window.pageYOffset || 0);
    const height = Math.max(root.scrollHeight || 0, document.body?.scrollHeight || 0) - viewport;
    const fraction = height > 0 ? Math.min(1, offset / height) : 0;
    if (progress) progress.style.transform = `scaleX(${fraction.toFixed(4)})`;
    if (!hero) return;
    if (!enabled) {
      hero.style.setProperty('--hero-shift', '0px');
      return;
    }
    const rect = hero.getBoundingClientRect();
    if (rect.bottom >= -viewport * 0.25 && rect.top <= viewport * 1.25) {
      const distance = Math.max(0, Math.min(60, -rect.top * 0.075));
      hero.style.setProperty('--hero-shift', `${distance.toFixed(2)}px`);
    }
  }

  function scheduleScroll() {
    if (!disposed && !scrollFrame) scrollFrame = requestFrame(renderScroll);
  }

  function syncPreference(announce = true) {
    enabled = !reduce.matches && userPreference !== 'off';
    root.dataset.motion = enabled ? 'on' : 'off';
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.disabled = Boolean(reduce.matches);
      toggle.title = reduce.matches
        ? 'Анимация отключена в настройках вашего устройства'
        : 'Включить или отключить анимацию';
    }
    if (label) label.textContent = enabled ? 'Анимация: вкл' : 'Анимация: выкл';
    if (!enabled) {
      cancelOwnedAnimations();
      resetMagnets();
      revealAll();
    } else {
      prepareReveals();
    }
    scheduleScroll();
    if (announce) window.dispatchEvent(new Event('veloce:motion-change'));
  }

  function toggleMotion() {
    if (reduce.matches) return;
    userPreference = enabled ? 'off' : 'on';
    try { localStorage.setItem('veloce-motion', userPreference); } catch (_) { /* Session preference still applies. */ }
    syncPreference();
  }

  function preferenceChanged() { syncPreference(); }
  function pointerPreferenceChanged() { if (!finePointer.matches) resetMagnets(); }

  toggle?.addEventListener('click', toggleMotion);
  if (typeof reduce.addEventListener === 'function') reduce.addEventListener('change', preferenceChanged);
  else reduce.addListener?.(preferenceChanged);
  if (typeof finePointer.addEventListener === 'function') finePointer.addEventListener('change', pointerPreferenceChanged);
  else finePointer.addListener?.(pointerPreferenceChanged);

  magneticElements.forEach((element) => {
    let frame = 0;
    let x = 0;
    let y = 0;
    function renderMagnet() {
      frame = 0;
      if (!enabled || !finePointer.matches || disposed) return;
      element.style.setProperty('--magnet-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--magnet-y', `${y.toFixed(2)}px`);
    }
    function move(event) {
      if (!enabled || !finePointer.matches || event.pointerType === 'touch') return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      x = Math.max(-5, Math.min(5, ((event.clientX - rect.left) / rect.width - 0.5) * 10));
      y = Math.max(-5, Math.min(5, ((event.clientY - rect.top) / rect.height - 0.5) * 10));
      if (!frame) frame = requestFrame(renderMagnet);
    }
    function leave() {
      if (frame) cancelFrame(frame);
      frame = 0;
      x = 0;
      y = 0;
      element.style.setProperty('--magnet-x', '0px');
      element.style.setProperty('--magnet-y', '0px');
    }
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', leave);
    element.addEventListener('blur', leave);
    magneticCleanup.push(() => {
      leave();
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
      element.removeEventListener('blur', leave);
    });
  });

  function catalogUpdated() {
    // Filtering owns its own transition. Newly exposed cards must not inherit an
    // unfinished initial reveal or animate twice when the catalog changes.
    document.querySelectorAll('.car-card').forEach((card) => {
      if (card.hidden || !seen.has(card)) reveal(card, true);
    });
    scheduleScroll();
  }

  document.addEventListener('veloce:catalog-updated', catalogUpdated);
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  syncPreference(false);

  if (enabled) {
    root.classList.add('motion-ready');
    const easing = 'cubic-bezier(.22,1,.36,1)';
    [...document.querySelectorAll('.hero-title-line > span')].forEach((line, index) => {
      animate(line, [
        { transform: 'translate3d(0,112%,0) rotate(2deg)' },
        { transform: 'translate3d(0,0,0) rotate(0deg)' }
      ], { duration: 1100, delay: 120 + index * 120, easing, fill: 'backwards' });
    });
    [$('.hero-eyebrow'), $('.hero-side'), $('.hero-caption')].forEach((element, index) => {
      animate(element, [
        { opacity: 0, transform: 'translate3d(0,16px,0)' },
        { opacity: 1, transform: 'translate3d(0,0,0)' }
      ], { duration: 900, delay: 220 + index * 100, easing, fill: 'backwards' });
    });
    animate(visual, [
      { transform: 'translate3d(0,var(--hero-shift,0px),0) scale(1.1)' },
      { transform: 'translate3d(0,var(--hero-shift,0px),0) scale(1.035)' }
    ], { duration: 1700, easing, fill: 'backwards' });
  }

  function cleanup(event) {
    // Preserve listeners during back/forward cache suspension; the browser
    // resumes them together with the restored page.
    if (event?.persisted) return;
    disposed = true;
    if (scrollFrame) cancelFrame(scrollFrame);
    scrollFrame = 0;
    cancelOwnedAnimations();
    observer?.disconnect();
    revealAll();
    magneticCleanup.forEach((remove) => remove());
    toggle?.removeEventListener('click', toggleMotion);
    document.removeEventListener('veloce:catalog-updated', catalogUpdated);
    window.removeEventListener('scroll', scheduleScroll);
    window.removeEventListener('resize', scheduleScroll);
    if (typeof reduce.removeEventListener === 'function') reduce.removeEventListener('change', preferenceChanged);
    else reduce.removeListener?.(preferenceChanged);
    if (typeof finePointer.removeEventListener === 'function') finePointer.removeEventListener('change', pointerPreferenceChanged);
    else finePointer.removeListener?.(pointerPreferenceChanged);
    window.removeEventListener('pagehide', cleanup);
  }
  window.addEventListener('pagehide', cleanup);
})();
