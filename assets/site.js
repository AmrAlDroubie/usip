/* Framework-free enhancements. Page content and navigation are already in HTML. */
(() => {
  'use strict';
  const script = document.querySelector('script[src$="assets/site.js"]');
  const root = new URL('../', script.src);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  // Match Header/MainNav: a 24px scroll threshold and one travelling underline.
  const header = document.querySelector('header[data-condensed]');
  if (header) {
    const row = header.firstElementChild;
    row.classList.add('static-header-row');
    row.querySelector(':scope > a > span')?.classList.add('static-wordmark');
    const controls = row.lastElementChild;
    $$('button, a', controls).forEach(control => control.classList.add('static-header-chip'));
    const syncHeader = () => { header.dataset.condensed = String(window.scrollY > 24); };
    window.addEventListener('scroll', syncHeader, { passive: true });
    window.addEventListener('pageshow', syncHeader);
    syncHeader();

    const list = header.querySelector('nav[aria-label="Main"] > ul');
    const indicator = list?.querySelector(':scope > li[aria-hidden="true"]');
    if (list && indicator) {
      indicator.classList.add('static-nav-indicator');
      const items = [...list.children].filter(item => item !== indicator);
      let pointed = null;
      const active = items.find(item => item.querySelector('[aria-current="page"]'));
      const moveTo = item => {
        if (!item) { indicator.style.opacity = '0'; return; }
        const target = item.querySelector('[data-dropdown-trigger]') ? item : item.querySelector('a');
        const box = target.getBoundingClientRect();
        const parent = list.getBoundingClientRect();
        indicator.style.left = `${box.left - parent.left}px`;
        indicator.style.width = `${box.width}px`;
        indicator.style.opacity = box.width ? '1' : '0';
      };
      const settle = () => moveTo(pointed || items.find(item => item.contains(document.activeElement)) || active);
      items.forEach(item => {
        item.addEventListener('mouseenter', () => { pointed = item; moveTo(item); });
        item.addEventListener('focusin', () => moveTo(item));
      });
      list.addEventListener('mouseleave', () => { pointed = null; settle(); });
      list.addEventListener('focusout', () => queueMicrotask(settle));
      window.addEventListener('resize', settle);
      document.fonts?.ready.then(settle);
      settle();
    }
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'static-dialog';
  dialog.setAttribute('aria-label', 'USIP');
  document.body.append(dialog);
  // Keep wheel input inside the popup, including over its fixed header/footer.
  // Use the bounded content pane rather than the locked document as scroller.
  dialog.addEventListener('wheel', event => {
    if (!dialog.open || event.ctrlKey || event.metaKey) return;
    const scroller = dialog.dataset.kind === 'search'
      ? dialog.querySelector('[role="listbox"]')
      : dialog.querySelector('.static-dialog-content');
    if (!scroller || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1
      ? (parseFloat(getComputedStyle(scroller).lineHeight) || 20)
      : event.deltaMode === 2 ? scroller.clientHeight : 1;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTop = Math.max(0, Math.min(max, scroller.scrollTop + event.deltaY * unit));
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false });

  let opener, galleryNavigate = null;
  function openDialog(title, fill, kind = '') {
    const alreadyOpen = dialog.open;
    if (!alreadyOpen) opener = document.activeElement;
    galleryNavigate = null;
    dialog.dataset.kind = kind;
    dialog.replaceChildren();
    dialog.removeAttribute('aria-label');
    dialog.setAttribute('aria-labelledby', 'static-dialog-title');
    const bar = document.createElement('div'); bar.className = 'static-dialog-bar';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.setAttribute('aria-label', 'Close dialog'); close.onclick = () => dialog.close();
    const heading = document.createElement('h2'); heading.id = 'static-dialog-title'; heading.textContent = title;
    bar.append(heading, close);
    const content = document.createElement('div'); content.className = 'static-dialog-content';
    dialog.append(bar, content); fill(content);
    if (!alreadyOpen) dialog.showModal();
  }
  dialog.addEventListener('close', () => { galleryNavigate = null; opener?.focus({ preventScroll: true }); });
  dialog.addEventListener('keydown', e => {
    if (galleryNavigate && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault(); galleryNavigate(e.key === 'ArrowRight' ? 1 : -1);
    }
  });
  dialog.addEventListener('click', e => { if(e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  $$('[data-dropdown-trigger]').forEach(button => {
    const menu = document.getElementById(button.getAttribute('aria-controls'));
    const wrapper = button.closest('li');
    let closeTimer;
    const toggle = open => { clearTimeout(closeTimer); button.setAttribute('aria-expanded', String(open)); menu.inert = !open; menu.classList.toggle('static-dropdown-open', open); };
    button.onclick = () => toggle(button.getAttribute('aria-expanded') !== 'true');
    wrapper.addEventListener('mouseenter', () => toggle(true));
    wrapper.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => toggle(false), 140); });
    wrapper.addEventListener('focusin', () => toggle(true));
    wrapper.addEventListener('focusout', e => { if(!wrapper.contains(e.relatedTarget)) toggle(false); });
    wrapper.addEventListener('keydown', e => { if(e.key === 'Escape') { button.focus(); toggle(false); } });
    document.addEventListener('click', e => { if(!wrapper.contains(e.target)) toggle(false); });
  });
  const menuButton = document.querySelector('[aria-label="Open menu"]');
  const menuTemplate = document.getElementById('static-mobile-menu-template');
  if (menuButton && menuTemplate) {
    const menu = document.createElement('dialog');
    menu.className = 'static-mobile-menu';
    menu.id = 'static-mobile-menu';
    menu.setAttribute('aria-label', 'Site menu');
    menu.innerHTML = menuTemplate.content.querySelector('[role="dialog"]').innerHTML;
    document.body.append(menu);
    menuButton.setAttribute('aria-controls', menu.id);
    let closing = false;
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const closeMenu = (immediate = false) => {
      if (!menu.open || closing) return;
      closing = true;
      const finish = () => { menu.close(); closing = false; };
      if (immediate || reduced() || !menu.animate) finish();
      else menu.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
        { duration: 400, easing: ease }).finished.then(finish, finish);
    };
    menuButton.addEventListener('click', () => {
      if (menu.open) return;
      menu.showModal();
      menuButton.setAttribute('aria-expanded', 'true');
      menu.querySelector('[aria-label="Close menu"]').focus({ preventScroll: true });
      if (!reduced() && menu.animate) {
        menu.animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 400, easing: ease });
        $$('nav[aria-label="Mobile"] > ul > li', menu).forEach((item, index) => {
          item.animate([{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'translateX(0)' }],
            { duration: 350, delay: 80 + index * 55, easing: ease, fill: 'backwards' });
        });
      }
    });
    menu.querySelector('[aria-label="Close menu"]').onclick = () => closeMenu();
    menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
    menu.addEventListener('close', () => { menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus({ preventScroll: true }); });
    menu.addEventListener('click', event => {
      if (event.target.closest('a[href]')) { closeMenu(true); return; }
      if (event.target === menu) {
        const rect = menu.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', event => { if (event.matches) closeMenu(true); });
  }
  let searchPromise;
  function loadSearch() {
    if (window.USIP_SEARCH) return Promise.resolve(window.USIP_SEARCH);
    if (!searchPromise) searchPromise = new Promise((resolve, reject) => {
      const index = document.createElement('script');
      index.src = new URL('assets/search-index.js', root);
      index.onload = () => resolve(window.USIP_SEARCH || []);
      index.onerror = () => { index.remove(); searchPromise = null; reject(new Error('Search unavailable')); };
      document.head.append(index);
    });
    return searchPromise;
  }
  function showSearch() {
    const template = document.getElementById('static-search-template');
    if (!template) return;
    opener = document.activeElement;
    galleryNavigate = null;
    dialog.dataset.kind = 'search';
    dialog.removeAttribute('aria-labelledby');
    dialog.setAttribute('aria-label', 'Search USIP');
    const source = template.content.querySelector('[role="dialog"]');
    dialog.innerHTML = source.innerHTML;
    const input = dialog.querySelector('#global-search');
    const results = dialog.querySelector('#global-search-results');
    const firstRow = results.querySelector('[role="option"]')?.cloneNode(true);
    const prompt = results.querySelector('p')?.cloneNode(true);
    let records = null, visible = [], active = 0;
    const highlight = (element, text, query) => {
      element.replaceChildren();
      const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
      if (index < 0) { element.textContent = text; return; }
      const mark = document.createElement('mark'); mark.textContent = text.slice(index, index + query.length);
      element.append(text.slice(0, index), mark, text.slice(index + query.length));
    };
    const select = index => {
      active = visible.length ? (index + visible.length) % visible.length : 0;
      $$('[role="option"]', results).forEach((option, i) => {
        option.setAttribute('aria-selected', String(i === active));
        option.classList.toggle('bg-surface-200', i === active);
      });
      if (visible[active]) input.setAttribute('aria-activedescendant', `result-${visible[active].id}`);
      else input.removeAttribute('aria-activedescendant');
    };
    const update = () => {
      if (!records || !dialog.open || dialog.dataset.kind !== 'search') return;
      const query = input.value.trim();
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      visible = records.filter(record => words.every(word => `${record.title} ${record.subtitle}`.toLowerCase().includes(word))).slice(0,12);
      results.replaceChildren();
      if (!query || !visible.length) {
        const message = prompt?.cloneNode(true) || document.createElement('p');
        message.textContent = !query ? 'Start typing to search across the whole festival.' : `No results for “${query}”.`;
        results.append(message);
      }
      const tones = { Page:'text-ink-faint', News:'text-blue-300', Event:'text-red-300', Member:'text-green-300', Sport:'text-yellow-300' };
      visible.forEach((record, i) => {
        const option = firstRow.cloneNode(true);
        option.id = `result-${record.id}`;
        const kind = option.firstElementChild;
        kind.className = `text-meta w-14 shrink-0 font-bold uppercase ${tones[record.kind]}`;
        kind.textContent = record.kind;
        const copy = option.lastElementChild;
        highlight(copy.firstElementChild, record.title, query);
        highlight(copy.lastElementChild, record.subtitle, query);
        option.onmouseenter = () => select(i);
        option.onclick = () => { location.href = new URL(record.url, root).href; dialog.close(); };
        results.append(option);
      });
      input.setAttribute('aria-expanded', String(visible.length > 0));
      select(0);
    };
    input.oninput = update;
    dialog.onkeydown = event => {
      if (dialog.dataset.kind !== 'search') return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); select(active + (event.key === 'ArrowDown' ? 1 : -1));
        results.querySelector('[aria-selected="true"]')?.scrollIntoView?.({block:'nearest'});
      } else if (event.key === 'Enter' && visible[active]) {
        event.preventDefault(); results.querySelector('[aria-selected="true"]')?.click();
      }
    };
    dialog.showModal();
    loadSearch().then(data => { if(input.isConnected) { records = data; update(); } }).catch(() => {
      if (input.isConnected) results.textContent = 'Search could not load. Close and reopen to retry.';
    });
    input.focus();
  }
  document.querySelector('[aria-label^="Search —"]')?.addEventListener('click', showSearch);
  document.addEventListener('keydown', e => { if(e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !e.target.isContentEditable && !dialog.open) { e.preventDefault(); showSearch(); } });
  const configurations = [
    ['.members-reference-grid', '.members-reference-card', null],
    ['[aria-labelledby="gallery-heading"] > ul', ':scope > li', 12],
    ['[aria-labelledby="all-news-heading"]', 'article', 6],
    ['[aria-labelledby="upcoming-heading"]', 'article', null],
  ];
  configurations.forEach(([selector, itemSelector, step]) => {
    const grid = document.querySelector(selector); if(!grid) return;
    const section = grid.closest('section'); const items = $$(itemSelector, grid); if(!items.length) return;
    const input = section.querySelector('input[type="search"]'); const tabs = $$('[role="radio"]', section); const sort = section.querySelector('select');
    const statuses = $$('[role="status"]', section);
    const status = document.createElement('p'); status.className = 'static-status'; status.setAttribute('role','status'); grid.after(status);
    statuses.forEach(s => s.hidden = true);
    let active = new URLSearchParams(location.search).get('region') || 'All', limit = step || Infinity;
    const more = document.createElement('button'); more.textContent = 'Load more'; more.className = 'group/btn relative inline-flex items-center justify-center rounded-[var(--radius-pill)] font-semibold select-none lift lift-sm hover:[will-change:transform] disabled:pointer-events-none disabled:opacity-50 bg-transparent text-ink border rule-hairline hover:border-[var(--color-gold)] hover:text-[var(--color-gold-2)] min-h-12 px-5 text-[1.0625rem] gap-2'; more.type = 'button'; const pagination = document.createElement('div'); pagination.className = 'flex flex-col items-center gap-4 pt-4'; grid.after(pagination); pagination.append(status, more);
    function update() {
      const query = input?.value.trim().toLowerCase() || '';
      let matches = items.filter(el => (active === 'All' || el.dataset.filter === active) && (el.dataset.search || el.textContent).toLowerCase().includes(query));
      if(sort) { const value = sort.value; matches.sort((a,b) => value.includes('title') ? (a.dataset.title||'').localeCompare(b.dataset.title||'') : (a.dataset.date||'').localeCompare(b.dataset.date||'') * (value.includes('asc') ? 1 : -1)); matches.forEach(el => el.parentElement.append(el)); }
      items.forEach(el => el.hidden = true); matches.slice(0,limit).forEach(el => el.hidden = false);
      status.textContent = matches.length ? `Showing ${Math.min(limit,matches.length)} of ${matches.length} results` : 'No results found. Try another search or filter.';
      more.hidden = limit >= matches.length;
      tabs.forEach(tab => { const selected = tab.dataset.value === active; tab.setAttribute('aria-checked', String(selected)); tab.tabIndex = selected ? 0 : -1; });
    }
    more.onclick = () => { limit += step; update(); };
    input?.addEventListener('input', () => { limit = step || Infinity; update(); }); sort?.addEventListener('change', update);
    tabs.forEach((tab, i) => {
      tab.onclick = () => { active = tab.dataset.value; limit = step || Infinity; update(); };
      tab.onkeydown = e => { const keys = ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','Home','End',' ','Enter']; if(!keys.includes(e.key)) return; e.preventDefault(); let next = i; if(['ArrowLeft','ArrowUp'].includes(e.key)) next = (i-1+tabs.length)%tabs.length; if(['ArrowRight','ArrowDown'].includes(e.key)) next = (i+1)%tabs.length; if(e.key === 'Home') next = 0; if(e.key === 'End') next = tabs.length-1; tabs[next].click(); tabs[next].focus(); };
    });
    if(tabs.length && !tabs.some(t => t.dataset.value === active)) active = 'All';
    update();
  });
  const photos = $$('[aria-labelledby="gallery-heading"] > ul > li');
  function showPhoto(item, focusLabel) {
    const visible = photos.filter(p => !p.hidden), i = visible.indexOf(item);
    openDialog(item.dataset.caption, box => {
      const controls = document.createElement('div'); controls.className = 'static-gallery-controls';
      for(const [label, offset] of [['Previous', -1], ['Next', 1]]) {
        const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', label + ' item'); button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 20 20"><path d="${offset < 0 ? 'M12.5 4.5L7 10l5.5 5.5 1.06-1.06L9.12 10l4.44-4.44z' : 'M7.5 4.5L13 10l-5.5 5.5-1.06-1.06L10.88 10 6.44 5.56z'}"/></svg>`;
        button.disabled = visible.length < 2;
        button.onclick = () => showPhoto(visible[(i+offset+visible.length)%visible.length], label);
        controls.append(button);
      }
      const count = document.createElement('span'); count.textContent = `${i + 1} / ${visible.length}`; controls.append(count);
      const figure = document.createElement('figure');
      const img = document.createElement('img'); img.src = item.querySelector('img').src; img.alt = item.querySelector('img').alt; img.className = 'static-gallery-image'; img.width = 1280; img.height = 800;
      const caption = document.createElement('figcaption'); caption.textContent = item.dataset.caption;
      const credit = document.createElement('p'); credit.textContent = item.dataset.credit || item.querySelector('button > span:not(.sr-only):last-of-type')?.textContent || '';
      figure.append(img, caption);
      if(item.dataset.credit) figure.append(credit);
      if(item.dataset.transcript) { const text = document.createElement('p'); text.textContent = item.dataset.transcript; figure.append(text); }
      box.append(figure); const bar = dialog.querySelector('.static-dialog-bar'); const close = bar.querySelector('button'); controls.prepend(count); controls.append(close); bar.append(controls); close.innerHTML = '<svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 8.94l3.53-3.53 1.06 1.06L11.06 10l3.53 3.53-1.06 1.06L10 11.06l-3.53 3.53-1.06-1.06L8.94 10 5.41 6.47l1.06-1.06L10 8.94z"/></svg>';
      if(item.dataset.video) { const a = document.createElement('a'); a.href = item.dataset.video; a.textContent = 'Watch video'; a.target = '_blank'; a.rel = 'noopener'; box.append(a); }
    }, 'gallery');
    galleryNavigate = offset => showPhoto(visible[(i+offset+visible.length)%visible.length], offset > 0 ? 'Next' : 'Previous');
    if(focusLabel) $$('button', dialog).find(button => button.getAttribute('aria-label') === focusLabel + ' item')?.focus({ preventScroll: true });
  }
  photos.forEach(item => item.querySelector('button').onclick = () => showPhoto(item));
  $$('button').filter(b => b.textContent.trim() === 'Share').forEach(b => b.onclick = async () => {
    const url = b.closest('article')?.querySelector('a')?.href || location.href;
    try { if(navigator.share) await navigator.share({title: document.title, url}); else { await navigator.clipboard.writeText(url); b.textContent = 'Link copied'; } } catch { openDialog('Share this link', box => { const field = document.createElement('input'); field.value = url; field.readOnly = true; box.append(field); field.select(); }); }
  });
  $$('form[data-contact]').forEach(form => {
    for(const name of ['firstName','lastName']) form.elements[name].minLength = 2;
    form.elements.message.minLength = 20;
    form.elements.phone.pattern = '[+0-9 ().\\-]{7,20}';
    const topic = new URLSearchParams(location.search).get('topic'); if(topic) form.elements.topic.value = topic;
    form.onsubmit = e => { e.preventDefault(); if(!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form));
      const body = `${values.firstName} ${values.lastName}\nEmail: ${values.email}\nPhone: ${values.phone}\n\n${values.message}`;
      location.href = 'mailto:usiphq@usip.info?subject=' + encodeURIComponent('USIP enquiry: '+values.topic) + '&body=' + encodeURIComponent(body);
    };
  });
  $$('.partner-scroll-row').forEach(row => {
    row.tabIndex = 0;
    let target = row.scrollLeft, frame = null, dragging = false, startX = 0, startScroll = 0;
    const clamp = value => Math.max(0, Math.min(value, row.scrollWidth - row.clientWidth));
    const stopAnimation = () => { if(frame !== null) cancelAnimationFrame(frame); frame = null; };
    const animate = () => {
      frame = null;
      const difference = target - row.scrollLeft;
      if(Math.abs(difference) <= .45) { row.scrollLeft = target; return; }
      row.scrollLeft += difference * Math.min(.58, .11 + Math.abs(difference) / 520);
      frame = requestAnimationFrame(animate);
    };
    const move = value => {
      target = clamp(value);
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) { stopAnimation(); row.scrollLeft = target; }
      else if(frame === null) frame = requestAnimationFrame(animate);
    };
    row.addEventListener('pointermove', e => {
      if(e.pointerType !== 'mouse') return;
      if(dragging) { row.scrollLeft = clamp(startScroll - (e.clientX - startX) * 1.35); target = row.scrollLeft; return; }
      const rect = row.getBoundingClientRect();
      if(rect.width) move(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (row.scrollWidth - row.clientWidth));
    });
    row.addEventListener('pointerdown', e => {
      if(e.pointerType !== 'mouse' || e.button !== 0) return;
      stopAnimation(); dragging = true; startX = e.clientX; startScroll = row.scrollLeft;
      row.classList.add('is-dragging'); row.setPointerCapture(e.pointerId); e.preventDefault();
    });
    const stopDrag = () => { dragging = false; row.classList.remove('is-dragging'); target = row.scrollLeft; };
    row.addEventListener('pointerup', stopDrag);
    row.addEventListener('pointercancel', stopDrag);
    row.addEventListener('lostpointercapture', stopDrag);
    row.addEventListener('pointerleave', () => { if(!dragging) stopAnimation(); });
    row.addEventListener('wheel', stopAnimation, { passive: true });
    row.addEventListener('keydown', e => {
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault();
      move(e.key === 'Home' ? 0 : e.key === 'End' ? row.scrollWidth : row.scrollLeft + (e.key === 'ArrowRight' ? 1 : -1) * row.clientWidth * .7);
    });
    window.addEventListener('pagehide', stopAnimation);
  });
})();
