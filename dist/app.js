(() => {
  'use strict';

  const cars = [
    {
      brand: 'PORSCHE', name: 'Porsche 911', shortName: '911', type: 'sport',
      image: 'assets/porsche-silver.jpg', alt: 'Серебристый Porsche 911, вид спереди в три четверти',
      meta: 'Купе · Бензин', price: 'от 18,9 млн ₽', body: 'Купе', engine: 'Бензин', character: 'Точность',
      description: 'Узнаваемый силуэт и особенное ощущение связи с дорогой. Для тех, кто выбирает автомобиль не только по маршруту, но и по тому, как он проходит каждый поворот.'
    },
    {
      brand: 'MERCEDES-AMG', name: 'Mercedes-AMG GT', shortName: 'GT', type: 'sport',
      image: 'assets/amg-gt.jpg', alt: 'Матовый серый Mercedes-AMG GT на городской улице',
      meta: 'Купе · Бензин', price: 'от 16,4 млн ₽', body: 'Купе', engine: 'Бензин', character: 'Сила',
      description: 'Длинный капот, низкая посадка и выразительные пропорции. Гран-туризмо с характером, который одинаково уместен на вечернем проспекте и на загородной дороге.'
    },
    {
      brand: 'FERRARI', name: 'Ferrari 488', shortName: '488', type: 'sport',
      image: 'assets/ferrari.jpg', alt: 'Красный Ferrari 488 у современного здания',
      meta: 'Купе · Бензин', price: 'от 26,5 млн ₽', body: 'Купе', engine: 'Бензин', character: 'Эмоция',
      description: 'Итальянская скульптура, созданная для движения. Яркий образ и бескомпромиссный спортивный характер превращают даже короткую поездку в отдельное событие.'
    },
    {
      brand: 'RANGE ROVER', name: 'Range Rover', shortName: 'Range Rover', type: 'suv',
      image: 'assets/range-rover.jpg', alt: 'Белый Range Rover на загородной грунтовой дороге',
      meta: 'Внедорожник · Дизель', price: 'от 14,8 млн ₽', body: 'Внедорожник', engine: 'Дизель', character: 'Свобода',
      description: 'Спокойная уверенность в каждом маршруте. Пространство, выразительный дизайн и характер большого путешественника — для города и дорог за его пределами.'
    }
  ];

  const storageKey = 'veloce-favorites-v1';
  let favorites = new Set();
  let activeFilter = 'all';
  let requestText = '';
  const $ = (selector) => document.querySelector(selector);
  const arrow = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.5"/></svg>';
  const bookmark = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M6.5 4.5h11v15L12 16l-5.5 3.5z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) {
      favorites = new Set(stored.filter((id) => Number.isInteger(id) && id >= 0 && id < cars.length));
    }
  } catch (_) {
    favorites = new Set();
  }

  const carGrid = $('#car-grid');
  if (carGrid) {
    carGrid.innerHTML = cars.map((car, index) => `
      <article class="car-card" data-card="${index}">
        <button class="car-image" data-car="${index}" aria-label="Подробнее о ${car.name}">
          <img src="${car.image}" alt="${car.alt}" loading="lazy" width="1200" height="800">
          <span class="card-number">${String(index + 1).padStart(2, '0')}</span>
        </button>
        <button class="save-car" data-save="${index}" aria-pressed="false" aria-label="Сохранить ${car.name}">${bookmark}</button>
        <div class="car-info">
          <small class="car-brand">${car.brand}</small>
          <h3><button data-car="${index}">${car.name}</button></h3>
          <p class="car-meta">${car.meta}</p>
          <div class="car-bottom">
            <span class="car-price">${car.price}</span>
            <button class="round-arrow" data-car="${index}" aria-label="Подробнее о ${car.name}">${arrow}</button>
          </div>
        </div>
      </article>`).join('');
  }

  function applyFilter() {
    let count = 0;
    document.querySelectorAll('[data-card]').forEach((card) => {
      const index = Number(card.dataset.card);
      const car = cars[index];
      const visible = activeFilter === 'all' || (activeFilter === 'saved' ? favorites.has(index) : car.type === activeFilter);
      card.hidden = !visible;
      if (visible) count += 1;
      const saveButton = card.querySelector('[data-save]');
      const saved = favorites.has(index);
      saveButton.classList.toggle('is-saved', saved);
      saveButton.setAttribute('aria-pressed', String(saved));
      saveButton.setAttribute('aria-label', `${saved ? 'Убрать из избранного' : 'Сохранить'} ${car.name}`);
    });
    document.querySelectorAll('[data-filter]').forEach((button) => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const countElement = $('#result-count');
    if (countElement) countElement.textContent = `${String(count).padStart(2, '0')} / ${String(cars.length).padStart(2, '0')}`;
    const empty = $('#empty-state');
    if (empty) empty.hidden = count > 0;
  }

  function toggleFavorite(index) {
    if (!cars[index]) return;
    if (favorites.has(index)) favorites.delete(index);
    else favorites.add(index);
    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch (_) { /* Favorites still work for this visit. */ }
    applyFilter();
  }

  const carDialog = $('#car-dialog');
  const requestDialog = $('#request-dialog');
  const requestForm = $('#request-form');
  const requestSuccess = $('#request-success');

  function showDialog(dialog) {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function showCar(index) {
    const car = cars[index];
    const content = $('#car-dialog-content');
    if (!car || !content || !carDialog) return;
    content.innerHTML = `
      <img class="detail-image" src="${car.image}" alt="${car.alt}" width="1200" height="800">
      <div class="detail-body">
        <p class="detail-label">КОЛЛЕКЦИЯ VELOCE / ${String(index + 1).padStart(2, '0')}</p>
        <h2 id="car-dialog-title">${car.name}</h2>
        <p class="detail-description">${car.description}</p>
        <dl class="detail-specs">
          <div><dt>Кузов</dt><dd>${car.body}</dd></div>
          <div><dt>Двигатель</dt><dd>${car.engine}</dd></div>
          <div><dt>Характер</dt><dd>${car.character}</dd></div>
        </dl>
        <div class="detail-price"><small>Ориентировочная стоимость</small><strong>${car.price}</strong></div>
        <button class="button button-red" data-pick="${index}">Подобрать этот автомобиль ${arrow}</button>
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

  function openRequest(index) {
    closeDialog(carDialog);
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
      if (!['all', 'sport', 'suv', 'saved'].includes(button.dataset.filter)) return;
      activeFilter = button.dataset.filter;
      applyFilter();
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
    dialog.addEventListener('close', () => {
      if (!carDialog?.open && !requestDialog?.open) document.body.classList.remove('dialog-open');
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
  }
  menuToggle?.addEventListener('click', () => {
    if (!mobileMenu) return;
    const isOpen = mobileMenu.hidden;
    mobileMenu.hidden = !isOpen;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
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

  const slides = [
    { image: 'assets/porsche-night.jpg', alt: 'Серебристый Porsche 911 Carrera S в движении по ночному городу', name: 'Porsche 911 Carrera S', carIndex: 0 },
    { image: 'assets/ferrari.jpg', alt: 'Красный Ferrari 488 у современного здания', name: 'Ferrari 488', carIndex: 2 },
    { image: 'assets/amg-gt.jpg', alt: 'Матовый серый Mercedes-AMG GT', name: 'Mercedes-AMG GT', carIndex: 1 }
  ];
  let heroIndex = 0;
  function updateHero() {
    const slide = slides[heroIndex];
    const heroImage = $('#hero-image');
    if (heroImage) {
      heroImage.src = slide.image;
      heroImage.alt = slide.alt;
      heroImage.style.objectPosition = heroIndex === 0 ? 'center 83%' : 'center 60%';
    }
    const model = $('#hero-model');
    if (model) model.textContent = slide.name;
    const index = $('#hero-index');
    if (index) index.textContent = String(heroIndex + 1).padStart(2, '0');
    const discover = $('#hero-discover');
    if (discover) discover.setAttribute('aria-label', `Подробнее о ${slide.name}`);
  }
  $('#hero-prev')?.addEventListener('click', () => { heroIndex = (heroIndex - 1 + slides.length) % slides.length; updateHero(); });
  $('#hero-next')?.addEventListener('click', () => { heroIndex = (heroIndex + 1) % slides.length; updateHero(); });
  $('#hero-discover')?.addEventListener('click', (event) => { event.preventDefault(); showCar(slides[heroIndex].carIndex); });

  const reveals = [...document.querySelectorAll('.reveal')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach((element) => observer.observe(element));
    document.documentElement.classList.add('js');
    reducedMotion.addEventListener?.('change', (event) => {
      if (event.matches) {
        observer.disconnect();
        reveals.forEach((element) => element.classList.add('is-visible'));
      }
    });
  } else {
    reveals.forEach((element) => element.classList.add('is-visible'));
  }

  applyFilter();
  updateHero();
})();
