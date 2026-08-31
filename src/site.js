(() => {
  const languageKey = 'portfolio-language';
  const viewKey = 'portfolio-works-view';
  const root = document.documentElement;
  const languageToggle = document.querySelector('.language-toggle');

  const setLanguage = (language) => {
    root.dataset.lang = language;
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem(languageKey, language);
    languageToggle?.setAttribute('aria-pressed', String(language === 'en'));
  };

  setLanguage(localStorage.getItem(languageKey) || 'zh');
  languageToggle?.addEventListener('click', () => setLanguage(root.dataset.lang === 'zh' ? 'en' : 'zh'));

  const shelf = document.querySelector('[data-works-shelf]');
  const viewToggle = document.querySelector('[data-view-toggle]');
  if (!shelf || !viewToggle) return;

  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const setView = (view, persist = true) => {
    root.dataset.worksView = view;
    viewToggle.querySelector('[data-view-label]').textContent = view === 'shelf' ? 'GRID' : 'SHELF';
    viewToggle.setAttribute('aria-label', view === 'shelf' ? 'Switch to grid view' : 'Switch to shelf view');
    viewToggle.setAttribute('aria-pressed', String(view === 'shelf'));
    if (persist) localStorage.setItem(viewKey, view);
  };

  const savedView = localStorage.getItem(viewKey);
  setView(savedView || (mobile ? 'grid' : 'shelf'), false);
  viewToggle.addEventListener('click', () => setView(root.dataset.worksView === 'shelf' ? 'grid' : 'shelf'));

  const viewport = shelf.querySelector('[data-shelf-viewport]');
  const items = [...shelf.querySelectorAll('[data-shelf-item]')];
  const info = shelf.querySelector('[data-shelf-info]');
  const title = shelf.querySelector('[data-shelf-title]');
  const type = shelf.querySelector('[data-shelf-type]');
  const year = shelf.querySelector('[data-shelf-year]');
  let activeItem = null;
  let animationFrame = 0;
  let infoTimer = 0;
  let drag = null;
  let suppressClick = false;

  const valueForLanguage = (item, key) => item.dataset[`${key}${root.dataset.lang === 'en' ? 'En' : 'Zh'}`] || '';
  const updateInfo = (item, fade = true) => {
    if (!item) return;
    const apply = () => {
      title.textContent = valueForLanguage(item, 'title');
      type.textContent = valueForLanguage(item, 'type');
      year.textContent = valueForLanguage(item, 'year');
      requestAnimationFrame(() => info.classList.remove('is-switching'));
    };
    if (fade) {
      window.clearTimeout(infoTimer);
      info.classList.add('is-switching');
      infoTimer = window.setTimeout(apply, 110);
    } else apply();
  };

  const setActive = (item, fade = true) => {
    if (!item || activeItem === item) return;
    activeItem?.classList.remove('is-active');
    activeItem = item;
    activeItem.classList.add('is-active');
    shelf.classList.add('has-active', 'has-interacted');
    updateInfo(activeItem, fade);
  };

  const selectClosest = () => {
    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    const closest = items.reduce((best, item) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const bestCenter = best.offsetLeft + best.offsetWidth / 2;
      return Math.abs(itemCenter - center) < Math.abs(bestCenter - center) ? item : best;
    }, items[0]);
    setActive(closest);
  };

  shelf.addEventListener('pointerenter', () => shelf.classList.add('has-interacted'));
  items.forEach((item) => {
    item.addEventListener('pointerenter', () => setActive(item));
    item.addEventListener('focus', () => setActive(item));
  });

  viewport.addEventListener('wheel', (event) => {
    if (root.dataset.worksView !== 'shelf') return;
    const amount = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? -event.deltaY : event.deltaX;
    if (!amount) return;
    event.preventDefault();
    shelf.classList.add('has-interacted');
    viewport.scrollLeft += amount;
  }, { passive: false });

  viewport.addEventListener('scroll', () => {
    if (!shelf.classList.contains('has-interacted')) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(selectClosest);
  }, { passive: true });

  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { pointerId: event.pointerId, startX: event.clientX, startScroll: viewport.scrollLeft, moved: false };
    shelf.classList.add('has-interacted');
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) drag.moved = true;
    if (!drag.moved) return;
    viewport.scrollLeft = drag.startScroll - distance;
    selectClosest();
  });

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    suppressClick = drag.moved;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    drag = null;
    selectClosest();
    window.setTimeout(() => { suppressClick = false; }, 0);
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('dragstart', (event) => event.preventDefault());
  viewport.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  new MutationObserver(() => activeItem && updateInfo(activeItem, false)).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
})();
