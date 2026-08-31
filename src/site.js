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
  viewToggle.addEventListener('click', () => {
    setView(root.dataset.worksView === 'shelf' ? 'grid' : 'shelf');
    requestAnimationFrame(setEdgePadding);
  });

  const viewport = shelf.querySelector('[data-shelf-viewport]');
  const track = shelf.querySelector('[data-shelf-track]');
  const items = [...shelf.querySelectorAll('[data-shelf-item]')];
  const infoPanel = shelf.querySelector('.shelf-info');
  const info = shelf.querySelector('[data-shelf-info]');
  const title = shelf.querySelector('[data-shelf-title]');
  const type = shelf.querySelector('[data-shelf-type]');
  const year = shelf.querySelector('[data-shelf-year]');
  let activeItem = null;
  let activeSource = 'none';
  let animationFrame = 0;
  let infoTimer = 0;
  let drag = null;
  let suppressClick = false;
  let edgePadding = 0;

  const setEdgePadding = () => {
    const cardWidth = items[0]?.offsetWidth || 0;
    edgePadding = Math.max(0, Math.round(viewport.clientWidth / 2 - cardWidth / 2));
    track.style.paddingLeft = `${edgePadding}px`;
    track.style.paddingRight = `${edgePadding}px`;
  };
  setEdgePadding();
  requestAnimationFrame(() => { viewport.scrollLeft = Math.min(edgePadding + 28, Math.max(0, viewport.scrollWidth - viewport.clientWidth)); });
  window.addEventListener('resize', setEdgePadding);

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

  const clearActive = () => {
    if (!activeItem) return;
    activeItem.classList.remove('is-active');
    activeItem = null;
    activeSource = 'none';
    shelf.classList.remove('has-active');
    window.clearTimeout(infoTimer);
    info.classList.add('is-switching');
    infoTimer = window.setTimeout(() => {
      title.textContent = '';
      type.textContent = '';
      year.textContent = '';
    }, 110);
  };

  const setActive = (item, fade = true, source = 'hover') => {
    if (!item) return;
    if (activeItem === item) {
      activeSource = source;
      return;
    }
    activeItem?.classList.remove('is-active');
    activeItem = item;
    activeSource = source;
    activeItem.classList.add('is-active');
    shelf.classList.add('has-active', 'has-interacted');
    infoPanel.style.setProperty('--info-anchor', `${Math.max(0, activeItem.offsetTop - activeItem.offsetHeight * 0.43)}px`);
    updateInfo(activeItem, fade);
  };

  const selectClosest = (source = 'scroll') => {
    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    const closest = items.reduce((best, item) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const bestCenter = best.offsetLeft + best.offsetWidth / 2;
      return Math.abs(itemCenter - center) < Math.abs(bestCenter - center) ? item : best;
    }, items[0]);
    setActive(closest, true, source);
  };

  shelf.addEventListener('pointerenter', () => shelf.classList.add('has-interacted'));
  items.forEach((item) => {
    item.addEventListener('focus', () => setActive(item, true, 'focus'));
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
    animationFrame = requestAnimationFrame(() => selectClosest('scroll'));
  }, { passive: true });

  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const link = event.target.closest('[data-shelf-item]');
    drag = { pointerId: event.pointerId, startX: event.clientX, startScroll: viewport.scrollLeft, moved: false, href: link?.href || '' };
    shelf.classList.add('has-interacted');
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
    if (link) event.preventDefault();
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) drag.moved = true;
    if (!drag.moved) return;
    viewport.scrollLeft = drag.startScroll - distance;
    selectClosest('drag');
  });

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const moved = drag.moved;
    suppressClick = moved;
    const href = drag.href;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    drag = null;
    selectClosest(moved ? 'drag' : 'hover');
    if (event.type === 'pointerup' && !moved && href) window.location.assign(href);
    window.setTimeout(() => { suppressClick = false; }, 0);
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('dragstart', (event) => event.preventDefault());
  viewport.addEventListener('pointermove', (event) => {
    if (drag || event.pointerType !== 'mouse') return;
    const x = event.clientX - viewport.getBoundingClientRect().left + viewport.scrollLeft;
    const hovered = items.find((item) => x >= item.offsetLeft && x <= item.offsetLeft + item.offsetWidth);
    if (hovered) setActive(hovered, true, 'hover');
    else if (activeSource === 'hover') clearActive();
  });
  viewport.addEventListener('pointerleave', () => {
    if (activeSource === 'hover') clearActive();
  });
  viewport.addEventListener('click', (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  new MutationObserver(() => activeItem && updateInfo(activeItem, false)).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
})();
