(() => {
  'use strict';

  let inventoryError = false;
  let inventory;
  try { inventory = window.VeloceInventory.normalize(window.VELOCE_INVENTORY_DATA); }
  catch (_) { inventoryError = true; inventory = { isDemo: true, vehicles: [] }; }
  const cars = inventory.vehicles;
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const htmlCar = (car) => car && Object.fromEntries(Object.entries(car).map(([key, value]) => [key, typeof value === 'string' ? escapeHTML(value) : value]));

  const storageKey = 'veloce-favorites-v2';
  let favorites = new Set();
  let activeFilter = 'available';
  let requestText = '';
  const $ = (selector) => document.querySelector(selector);
  const signature = '<span class="signature-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const activeAnimations = new Set();
  const motionAllowed = () => !motionPreference.matches && document.documentElement.dataset.motion !== 'off';
  const canAnimate = (element) => motionAllowed() && typeof element?.animate === 'function';

  function trackAnimation(animation) {
    activeAnimations.add(animation);
    animation.finished.then(() => activeAnimations.delete(animation), () => activeAnimations.delete(animation));
    return animation;
  }

  function animateElement(element, frames, options) {
    if (!canAnimate(element)) return null;
    return trackAnimation(element.animate(frames, options));
  }
  const bookmark = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M6.5 4.5h11v15L12 16l-5.5 3.5z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) {
      favorites = new Set(stored.filter((id) => typeof id === 'string' && cars.some((car) => car.id === id)));
    }
  } catch (_) {
    favorites = new Set();
  }

  const carGrid = $('#car-grid');
  if (carGrid) {
    carGrid.innerHTML = cars.map((record, index) => { const car = htmlCar(record); return `
      <article class="car-card" data-card="${index}" style="--card-index:${index}">
        <button class="car-image" data-car="${index}" aria-label="Подробнее о ${car.name}">
          <img src="${car.image}" alt="${car.alt}" loading="lazy" width="1200" height="800">
          <span class="card-number">${String(index + 1).padStart(2, '0')}</span>
          <span class="stock-badge stock-${car.status}">${car.statusLabel}</span>
          <span class="car-character">${car.character}</span>
          <span class="car-image-label">Открыть историю ${signature}</span>
        </button>
        <button class="save-car" data-save="${index}" aria-pressed="false" aria-label="Сохранить ${car.name}">${bookmark}</button>
        <div class="car-info">
          <small class="car-brand">${car.brand}</small>
          <h3><button data-car="${index}">${car.name}</button></h3>
          <p class="car-meta">${car.meta}</p>
          <div class="car-bottom">
            <span class="car-price">${car.price}</span>
            <button class="car-detail-link" data-car="${index}" aria-label="Исследовать ${car.name}">Исследовать ${signature}</button>
          </div>
        </div>
      </article>`; }).join('');
  }

  let filterInitialized = false;
  const cardAnimations = new Map();
  function applyFilter() {
    let count = 0;
    let entering = 0;
    document.querySelectorAll('[data-card]').forEach((card) => {
      const index = Number(card.dataset.card);
      const car = cars[index];
      const wasVisible = !card.hidden;
      const visible = activeFilter === 'saved' ? favorites.has(car.id) : car.status === activeFilter;
      card.hidden = !visible;
      if (!visible) {
        cardAnimations.get(card)?.cancel();
        cardAnimations.delete(card);
      }
      if (visible) {
        count += 1;
        if (filterInitialized && !wasVisible) {
          cardAnimations.get(card)?.cancel();
          const animation = animateElement(card,
            [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { duration: 480, delay: Math.min(entering * 65, 195), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
          if (animation) {
            cardAnimations.set(card, animation);
            const cleanup = () => {
              if (cardAnimations.get(card) === animation) cardAnimations.delete(card);
            };
            animation.finished.then(cleanup, cleanup);
          }
          entering += 1;
        }
      }
      const saveButton = card.querySelector('[data-save]');
      const saved = favorites.has(car.id);
      saveButton.classList.toggle('is-saved', saved);
      saveButton.setAttribute('aria-pressed', String(saved));
      saveButton.setAttribute('aria-label', `${saved ? 'Убрать из избранного' : 'Сохранить'} ${car.name}`);
    });
    document.querySelectorAll('[data-filter]').forEach((button) => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (carGrid) carGrid.dataset.filter = activeFilter;
    document.querySelectorAll('[data-status-count]').forEach((element) => {
      element.textContent = String(cars.filter((car) => car.status === element.dataset.statusCount).length).padStart(2, '0');
    });
    document.querySelectorAll('[data-inventory-count]').forEach((element) => { element.textContent = String(cars.length).padStart(2, '0'); });
    const countElement = $('#result-count');
    if (countElement) countElement.textContent = `${String(count).padStart(2, '0')} / ${String(cars.length).padStart(2, '0')}`;
    const empty = $('#empty-state');
    if (empty) {
      empty.hidden = count > 0;
      const saved = activeFilter === 'saved';
      empty.querySelector('h3').textContent = inventoryError ? 'Каталог временно недоступен.' : saved ? 'Место для вашего фаворита.' : 'В этом разделе пока нет автомобилей.';
      empty.querySelector('p').textContent = inventoryError ? 'Не удалось прочитать данные автомобилей. Попробуйте обновить страницу позже.' : saved ? 'Нажмите на закладку у автомобиля — он появится в вашем гараже.' : 'Выберите другой статус, чтобы продолжить просмотр.';
      empty.querySelector('button').hidden = !saved;
    }
    filterInitialized = true;
    document.dispatchEvent(new CustomEvent('veloce:catalog-updated', { detail: { filter: activeFilter, count } }));
  }

  function toggleFavorite(index) {
    if (!cars[index]) return;
    const id = cars[index].id;
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch (_) { /* Favorites still work for this visit. */ }
    applyFilter();
  }

  const carDialog = $('#car-dialog');
  const requestDialog = $('#request-dialog');
  const requestForm = $('#request-form');
  const requestSuccess = $('#request-success');

  const dialogEntries = new Map();
  const dialogExits = new Map();
  let requestOpenTicket = 0;

  function showDialog(dialog) {
    if (!dialog) return;
    const exit = dialogExits.get(dialog);
    if (exit) {
      dialogExits.delete(dialog);
      exit.animation.cancel();
    }
    if (dialog.open) return;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    syncAutoplay();
    const animation = animateElement(dialog,
      [{ opacity: 0, transform: 'translateY(24px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
      { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
    if (animation) {
      dialogEntries.set(dialog, animation);
      const cleanup = () => { if (dialogEntries.get(dialog) === animation) dialogEntries.delete(dialog); };
      animation.finished.then(cleanup, cleanup);
    }
  }

  function closeDialog(dialog, immediate = false) {
    if (!dialog?.open) return Promise.resolve();
    dialogEntries.get(dialog)?.cancel();
    dialogEntries.delete(dialog);
    const previousExit = dialogExits.get(dialog);
    if (previousExit && !immediate) return previousExit.promise;
    if (previousExit) {
      dialogExits.delete(dialog);
      previousExit.animation.cancel();
    }
    if (immediate || !canAnimate(dialog)) {
      dialog.close();
      return Promise.resolve();
    }
    const animation = animateElement(dialog,
      [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(16px) scale(.99)' }],
      { duration: 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    const job = { animation, promise: null };
    const finish = () => {
      if (dialogExits.get(dialog) !== job) return;
      dialogExits.delete(dialog);
      if (dialog.open) dialog.close();
      animation.cancel();
    };
    job.promise = animation.finished.then(finish, finish);
    dialogExits.set(dialog, job);
    return job.promise;
  }

  function showCar(index) {
    requestOpenTicket += 1;
    const car = htmlCar(cars[index]);
    const content = $('#car-dialog-content');
    if (!car || !content || !carDialog) return;
    content.innerHTML = `
      <img class="detail-image" src="${car.image}" alt="${car.alt}" width="1200" height="800">
      <div class="detail-body">
        <p class="detail-label">LADA С ПРОБЕГОМ / ${car.stockNumber} / ${car.statusLabel}</p>
        <h2 id="car-dialog-title">${car.name}</h2>
        <p class="detail-description">${car.description}</p>
        <dl class="detail-specs">
          <div><dt>Кузов</dt><dd>${car.body}</dd></div>
          <div><dt>Двигатель</dt><dd>${car.engine}</dd></div>
          <div><dt>Коробка</dt><dd>${car.transmission}</dd></div>
          <div><dt>Год выпуска</dt><dd>${car.year}</dd></div>
          <div><dt>Пробег</dt><dd>${car.mileage}</dd></div>
          <div><dt>Статус</dt><dd>${car.statusLabel}</dd></div>
        </dl>
        <div class="detail-price"><small>${car.status === 'sold' ? 'Цена в демонстрационном объявлении' : 'Демонстрационная стоимость'}</small><strong>${car.price}</strong></div>
        <button class="button button-red" data-pick="${index}">${car.status === 'available' ? 'Обсудить этот автомобиль' : 'Подобрать похожий автомобиль'} ${signature}</button>
        <p class="detail-note">Демонстрационная подборка. Фото, цены и характеристики иллюстрируют концепцию; наличие и комплектация не подтверждены.</p>
      </div>`;
    carDialog.setAttribute('aria-labelledby', 'car-dialog-title');
    showDialog(carDialog);
  }

  function resetRequest() {
    requestText = '';
    if (requestForm) {
      requestForm.reset();
      requestForm.querySelectorAll('input').forEach((input) => input.setCustomValidity(''));
      requestForm.hidden = false;
    }
    if (requestSuccess) requestSuccess.hidden = true;
    requestDialog?.setAttribute('aria-labelledby', 'request-title');
  }

  async function openRequest(index) {
    const ticket = ++requestOpenTicket;
    await closeDialog(carDialog);
    if (ticket !== requestOpenTicket) return;
    resetRequest();
    const select = $('#request-car');
    if (select && cars[index]) {
      const option = [...select.options].find((entry) => entry.value === cars[index].name || entry.textContent.trim() === cars[index].name);
      if (option) select.value = option.value;
    }
    showDialog(requestDialog);
    requestForm?.querySelector('input, select, button')?.focus();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-save')) {
      toggleFavorite(Number(button.dataset.save));
    } else if (button.hasAttribute('data-car')) {
      showCar(Number(button.dataset.car));
    } else if (button.hasAttribute('data-filter')) {
      if (!['available', 'reserved', 'sold', 'saved'].includes(button.dataset.filter)) return;
      if (activeFilter !== button.dataset.filter) {
        activeFilter = button.dataset.filter;
        applyFilter();
      }
    } else if (button.hasAttribute('data-pick')) {
      openRequest(Number(button.dataset.pick));
    } else if (button.hasAttribute('data-open-request')) {
      openRequest(-1);
    }
  });

  // Links can use the same request trigger as buttons.
  document.querySelectorAll('a[data-open-request]').forEach((link) => {
    link.addEventListener('click', (event) => { event.preventDefault(); openRequest(-1); });
  });
  $('#close-car')?.addEventListener('click', () => closeDialog(carDialog));
  $('#close-request')?.addEventListener('click', () => closeDialog(requestDialog));
  [carDialog, requestDialog].forEach((dialog) => {
    if (!dialog) return;
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('cancel', (event) => {
      if (!canAnimate(dialog)) return;
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      dialogEntries.get(dialog)?.cancel();
      dialogEntries.delete(dialog);
      const exit = dialogExits.get(dialog);
      if (exit) {
        dialogExits.delete(dialog);
        exit.animation.cancel();
      }
      if (!carDialog?.open && !requestDialog?.open) document.body.classList.remove('dialog-open');
      syncAutoplay();
    });
  });

  if (requestForm) {
    requestForm.addEventListener('input', (event) => {
      if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
    });
    requestForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameField = requestForm.elements.namedItem('name');
      const phoneField = requestForm.elements.namedItem('phone');
      if (nameField) nameField.setCustomValidity(nameField.value.trim() ? '' : 'Введите ваше имя.');
      if (phoneField) {
        const digits = phoneField.value.replace(/\D/g, '');
        phoneField.setCustomValidity(digits.length >= 7 && digits.length <= 15 ? '' : 'Введите номер телефона, содержащий от 7 до 15 цифр.');
      }
      if (!requestForm.reportValidity()) return;
      const data = new FormData(requestForm);
      const name = String(data.get('name') || '').trim();
      const phone = String(data.get('phone') || '').trim();
      const carSelect = $('#request-car');
      const car = carSelect?.selectedOptions[0]?.textContent.trim() || String(data.get('car') || 'Помогите выбрать');
      const purpose = data.get('purpose') === 'testdrive' ? 'Тест-драйв' : 'Индивидуальный подбор';
      requestText = [
        'VELOCE — ваш автомобильный маршрут', '',
        'Демонстрационная заявка. Она не отправлена в автосалон и не является бронированием.', '',
        `Имя: ${name}`, `Телефон: ${phone}`, `Автомобиль: ${car}`, `Интересует: ${purpose}`, '',
        'Сохраните этот файл, чтобы обсудить пожелания с выбранным автосалоном.',
        'Цены и автомобили на сайте представлены для иллюстрации концепции.'
      ].join('\n');
      requestForm.hidden = true;
      if (requestSuccess) {
        requestSuccess.hidden = false;
        let heading = requestSuccess.querySelector('h2');
        if (!heading) { heading = document.createElement('h2'); requestSuccess.prepend(heading); }
        heading.id = 'request-success-title';
        heading.textContent = 'Ваш маршрут готов';
        requestDialog?.setAttribute('aria-labelledby', 'request-success-title');
        let explanation = requestSuccess.querySelector('p:not(#success-detail)');
        if (!explanation) { explanation = document.createElement('p'); heading.after(explanation); }
        explanation.textContent = `${name ? name + ', это' : 'Это'} демонстрационная заявка: она не отправлена в автосалон. Скачайте свои пожелания, чтобы вернуться к ним позже.`;
        const detail = $('#success-detail');
        if (detail) detail.textContent = `${car} · ${purpose}`;
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  }

  $('#download-request')?.addEventListener('click', () => {
    if (!requestText) return;
    const blob = new Blob(['\uFEFF', requestText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const download = document.createElement('a');
    download.href = url;
    download.download = 'veloce-my-route.txt';
    document.body.append(download);
    download.click();
    download.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#new-request')?.addEventListener('click', () => {
    resetRequest();
    requestForm?.querySelector('input, select, button')?.focus();
  });

  const menuToggle = $('#menu-toggle');
  const mobileMenu = $('#mobile-menu');
  function closeMenu() {
    if (mobileMenu) mobileMenu.hidden = true;
    menuToggle?.setAttribute('aria-expanded', 'false');
    syncAutoplay();
  }
  menuToggle?.addEventListener('click', () => {
    if (!mobileMenu) return;
    const isOpen = mobileMenu.hidden;
    mobileMenu.hidden = !isOpen;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    syncAutoplay();
  });
  mobileMenu?.addEventListener('click', (event) => {
    if (event.target.closest('a, [data-open-request]')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileMenu && !mobileMenu.hidden) {
      closeMenu();
      menuToggle?.focus();
    }
  });

  const slides = cars.map((car, carIndex) => ({ ...car, carIndex })).filter((car) => car.featured).slice(0, 3);
  const requestSelect = $('#request-car');
  if (requestSelect) {
    requestSelect.replaceChildren(new Option('Ещё выбираю', 'Ещё выбираю'), ...cars.map((car) => new Option(car.name, car.name)));
  }
  document.querySelectorAll('[data-hero-slide]').forEach((button, index) => {
    button.hidden = index >= slides.length;
    if (slides[index]) button.setAttribute('aria-label', `Кадр ${index + 1} — ${slides[index].name}`);
  });
  if ($('#hero-total')) $('#hero-total').textContent = String(slides.length).padStart(2, '0');
  if ($('#hero-discover')) $('#hero-discover').disabled = !slides.length;
  const heroImage = $('#hero-image');
  const heroNextImage = $('#hero-image-next');
  const heroStage = $('.hero-stage');
  const heroStatus = $('#hero-status');
  const heroButtons = [...document.querySelectorAll('[data-hero-slide]')];
  const loadedSlides = new Map();
  let heroIndex = 0;
  let heroTicket = 0;
  let heroTransition = null;

  function updateHeroLabels() {
    const slide = slides[heroIndex];
    if (!slide) return;
    const model = $('#hero-model');
    if (model) model.textContent = slide.name;
    const index = $('#hero-index');
    if (index) index.textContent = String(heroIndex + 1).padStart(2, '0');
    $('#hero-discover')?.setAttribute('aria-label', `Подробнее о ${slide.name}`);
    if (heroStage) heroStage.dataset.slide = String(heroIndex);
    heroButtons.forEach((button) => {
      const selected = Number(button.dataset.heroSlide) === heroIndex;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function commitHero(index) {
    if (!slides[index]) return;
    heroIndex = index;
    const slide = slides[index];
    if (heroImage) {
      heroImage.src = slide.image;
      heroImage.alt = slide.alt;
      heroImage.style.objectPosition = slide.position;
      heroImage.style.opacity = '1';
    }
    if (heroNextImage) heroNextImage.style.opacity = '0';
    updateHeroLabels();
  }

  function settleHeroTransition() {
    const transition = heroTransition;
    if (!transition) return;
    heroTransition = null;
    commitHero(transition.index);
    transition.animations.forEach((animation) => animation.cancel());
  }

  function preloadSlide(index) {
    if (loadedSlides.has(index)) return loadedSlides.get(index);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      const fail = () => reject(new Error('Image unavailable'));
      image.onload = () => {
        if (typeof image.decode !== 'function') resolve();
      };
      image.onerror = fail;
      image.src = slides[index].image;
      if (typeof image.decode === 'function') image.decode().then(resolve, fail);
      else if (image.complete && image.naturalWidth > 0) resolve();
    }).catch((error) => {
      loadedSlides.delete(index);
      throw error;
    });
    loadedSlides.set(index, promise);
    return promise;
  }

  async function selectHero(index, { automatic = false } = {}) {
    if (!Number.isInteger(index) || !slides[index] || !heroImage) return;
    clearAutoplay();
    const ticket = ++heroTicket;
    settleHeroTransition();
    if (heroStatus) heroStatus.textContent = '';
    if (index === heroIndex) {
      heroStage?.removeAttribute('aria-busy');
      syncAutoplay();
      return;
    }
    heroStage?.setAttribute('aria-busy', 'true');
    try {
      await preloadSlide(index);
      if (ticket !== heroTicket) return;
      if (automatic && !canAutoplay()) { heroStage?.removeAttribute('aria-busy'); return; }
      if (!heroNextImage || !canAnimate(heroImage) || !canAnimate(heroNextImage)) {
        commitHero(index);
        heroStage?.removeAttribute('aria-busy');
        return;
      }
      heroNextImage.src = slides[index].image;
      heroNextImage.alt = '';
      heroNextImage.style.objectPosition = slides[index].position;
      heroIndex = index;
      updateHeroLabels();
      const transition = { index, animations: [] };
      heroTransition = transition;
      transition.animations.push(animateElement(heroImage,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.025)' }],
        { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }));
      const incoming = animateElement(heroNextImage,
        [{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      transition.animations.push(incoming);
      try { await incoming.finished; } catch (_) { /* A newer selection owns the visible scene. */ }
      if (ticket !== heroTicket || heroTransition !== transition) return;
      settleHeroTransition();
      heroStage?.removeAttribute('aria-busy');
    } catch (_) {
      if (ticket !== heroTicket) return;
      heroStage?.removeAttribute('aria-busy');
      if (heroStatus) heroStatus.textContent = 'Кадр не загрузился. Попробуйте выбрать его ещё раз.';
    } finally {
      if (ticket === heroTicket) syncAutoplay();
    }
  }

  const autoplayToggle = $('#hero-autoplay');
  const heroRoot = $('.hero');
  const AUTOPLAY_DELAY = 6000;
  const hoveredControls = new Set();
  let autoplayTimer = 0;
  let autoplayPaused = false;
  let heroInView = true;
  let heroHasFocus = false;
  let autoplayDisposed = false;

  function clearAutoplay() {
    window.clearTimeout(autoplayTimer);
    autoplayTimer = 0;
  }

  function canAutoplay() {
    return slides.length > 1 && !autoplayDisposed && !autoplayPaused && motionAllowed()
      && !document.hidden && heroInView && !heroHasFocus && !hoveredControls.size
      && !carDialog?.open && !requestDialog?.open && (!mobileMenu || mobileMenu.hidden);
  }

  function syncAutoplay() {
    clearAutoplay();
    const allowed = motionAllowed() && slides.length > 1;
    if (autoplayToggle) {
      autoplayToggle.disabled = !allowed;
      autoplayToggle.setAttribute('aria-pressed', String(allowed && !autoplayPaused));
      autoplayToggle.textContent = !allowed ? 'Авто: выкл' : autoplayPaused ? 'Авто' : 'Пауза';
      autoplayToggle.setAttribute('aria-label', !allowed ? 'Автосмена отключена настройками анимации' : autoplayPaused ? 'Включить автоматическую смену кадров' : 'Приостановить автоматическую смену кадров');
    }
    $('#hero-model')?.setAttribute('aria-live', canAutoplay() ? 'off' : 'polite');
    if (!canAutoplay() || heroTransition || heroStage?.getAttribute('aria-busy') === 'true') return;
    autoplayTimer = window.setTimeout(() => {
      autoplayTimer = 0;
      if (canAutoplay()) selectHero((heroIndex + 1) % slides.length, { automatic: true });
    }, AUTOPLAY_DELAY);
  }

  autoplayToggle?.addEventListener('click', () => { autoplayPaused = !autoplayPaused; syncAutoplay(); });
  [$('.hero-controls'), $('#hero-discover')].filter(Boolean).forEach((element) => {
    element.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      hoveredControls.add(element); syncAutoplay();
    });
    element.addEventListener('pointerleave', () => { hoveredControls.delete(element); syncAutoplay(); });
  });
  heroRoot?.addEventListener('focusin', (event) => {
    heroHasFocus = event.target !== autoplayToggle;
    syncAutoplay();
  });
  heroRoot?.addEventListener('focusout', (event) => {
    heroHasFocus = Boolean(event.relatedTarget && heroRoot.contains(event.relatedTarget) && event.relatedTarget !== autoplayToggle);
    syncAutoplay();
  });
  document.addEventListener('visibilitychange', syncAutoplay);
  document.addEventListener('DOMContentLoaded', syncAutoplay, { once: true });
  if ('IntersectionObserver' in window && heroStage) {
    const autoplayObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.target === heroStage) heroInView = entry.isIntersecting && entry.intersectionRatio >= 0.1;
      syncAutoplay();
    }, {threshold: 0.1});
    autoplayObserver.observe(heroStage);
  }
  window.addEventListener('pagehide', () => { autoplayDisposed = true; clearAutoplay(); });
  window.addEventListener('pageshow', () => { autoplayDisposed = false; syncAutoplay(); });

  heroButtons.forEach((button) => {
    button.addEventListener('click', () => selectHero(Number(button.dataset.heroSlide)));
  });
  $('.hero-controls')?.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const current = event.target.closest('[data-hero-slide]');
    if (!current) return;
    const currentIndex = Number(current.dataset.heroSlide);
    let nextIndex;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + slides.length) % slides.length;
    else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % slides.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = slides.length - 1;
    else return;
    event.preventDefault();
    heroButtons.find((button) => Number(button.dataset.heroSlide) === nextIndex)?.focus();
    selectHero(nextIndex);
  });
  $('#hero-discover')?.addEventListener('click', (event) => {
    event.preventDefault();
    showCar(slides[heroIndex]?.carIndex);
  });

  function settleMotion() {
    heroTicket += 1;
    settleHeroTransition();
    heroStage?.removeAttribute('aria-busy');
    if (heroStatus) heroStatus.textContent = '';
    [...activeAnimations].forEach((animation) => animation.cancel());
    cardAnimations.clear();
    syncAutoplay();
  }
  window.addEventListener('veloce:motion-change', settleMotion);
  motionPreference.addEventListener?.('change', settleMotion);

  applyFilter();
  commitHero(0);
  syncAutoplay();
})();
