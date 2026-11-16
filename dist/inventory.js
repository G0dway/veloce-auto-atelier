(() => {
  'use strict';
  const labels = Object.freeze({ available: 'В наличии', reserved: 'В резерве', sold: 'Продан' });
  const text = (value, field, max = 600) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${field}`);
    return value.trim();
  };
  const integer = (value, field, min, max) => {
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${field}`);
    return value;
  };
  function normalize(payload) {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.vehicles) || typeof payload.isDemo !== 'boolean') throw new Error('Unsupported inventory format');
    const ids = new Set();
    const vehicles = payload.vehicles.map((record) => {
      const id = text(record.id, 'id', 100);
      if (ids.has(id)) throw new Error('Duplicate vehicle id');
      ids.add(id);
      if (!Object.hasOwn(labels, record.status) || record.condition !== 'used') throw new Error('Invalid vehicle status or condition');
      const image = text(record.image, 'image', 2048);
      if (!/^assets\/[a-zA-Z0-9_/-]+\.(?:jpe?g|png|webp|avif)$/.test(image) && !/^https:\/\//i.test(image)) throw new Error('Invalid vehicle image');
      const brand = text(record.brand, 'brand', 80), model = text(record.model, 'model', 100);
      const year = integer(record.year, 'year', 1970, 2100);
      const mileageKm = integer(record.mileageKm, 'mileageKm', 0, 3000000);
      const priceRub = integer(record.priceRub, 'priceRub', 1, 1000000000);
      const fuel = text(record.fuel, 'fuel', 60), body = text(record.body, 'body', 60);
      const mileage = `${mileageKm.toLocaleString('ru-RU')} км`;
      return Object.freeze({
        id, brand, name: `${brand} ${model}`, model, year, mileageKm, mileage,
        priceRub, price: `${priceRub.toLocaleString('ru-RU')} ₽`,
        status: record.status, statusLabel: labels[record.status], stockNumber: text(record.stockNumber, 'stockNumber', 100),
        body, engine: fuel, transmission: text(record.transmission, 'transmission', 80),
        image, alt: text(record.imageAlt, 'imageAlt', 250),
        character: text(record.character, 'character', 80), description: text(record.description, 'description', 1500),
        featured: record.featured === true,
        position: /^center \d{1,3}%$/.test(record.heroPosition || '') ? record.heroPosition : 'center 60%',
        meta: `${year} · ${mileage} · ${fuel}`
      });
    });
    return Object.freeze({isDemo: payload.isDemo, source: payload.source || 'inventory', updatedAt: payload.updatedAt || null, vehicles});
  }
  window.VeloceInventory = Object.freeze({normalize, labels});
})();
