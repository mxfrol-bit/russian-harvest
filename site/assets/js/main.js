/* ===== РУССКИЙ УРОЖАЙ — Shared JS ===== */

(function(){
  // ---------- Live price ticker ----------
  const tickerData = [
    {k:'Пшеница 3кл',   v:'14 200 ₽/т', d:'+1.8%', dir:'up'},
    {k:'Пшеница 4кл',   v:'12 100 ₽/т', d:'−0.4%', dir:'dn'},
    {k:'Ячмень',        v:'13 050 ₽/т', d:'+0.6%', dir:'up'},
    {k:'Кукуруза',      v:'15 100 ₽/т', d:'+2.3%', dir:'up'},
    {k:'Подсолнечник',  v:'28 400 ₽/т', d:'−1.1%', dir:'dn'},
    {k:'Овёс',          v:'10 800 ₽/т', d:'+0.8%', dir:'up'},
    {k:'Рапс',          v:'32 100 ₽/т', d:'+3.2%', dir:'up'},
    {k:'Соя',           v:'39 500 ₽/т', d:'−0.3%', dir:'dn'},
    {k:'Горох',         v:'18 200 ₽/т', d:'+0.9%', dir:'up'},
    {k:'Гречиха',       v:'22 400 ₽/т', d:'−2.0%', dir:'dn'},
  ];
  const ticker = document.getElementById('tickerTrack');
  if (ticker) {
    ticker.innerHTML = [...tickerData, ...tickerData].map(t =>
      `<span class="ticker-item"><span class="k">${t.k}</span><span class="v">${t.v}</span><span class="d ${t.dir}">${t.d}</span></span>`
    ).join('');
  }

  // ---------- Mobile drawer ----------
  const drawerTrigger = document.getElementById('menuTrigger');
  const drawer = document.getElementById('drawer');
  const drawerClose = document.getElementById('drawerClose');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const openDrawer = () => {
    if (drawer && drawerBackdrop) {
      drawer.classList.add('on');
      drawerBackdrop.classList.add('on');
      document.body.style.overflow = 'hidden';
    }
  };
  const closeDrawer = () => {
    if (drawer && drawerBackdrop) {
      drawer.classList.remove('on');
      drawerBackdrop.classList.remove('on');
      document.body.style.overflow = '';
    }
  };
  if (drawerTrigger) drawerTrigger.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // ---------- Quality accordion (event delegation — работает для динамически догруженных карточек) ----------
  document.addEventListener('click', e => {
    const btn = e.target.closest('.q-toggle');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.q;
    const body = document.querySelector(`.q-body[data-q="${id}"]`);
    const expanded = btn.classList.toggle('open');
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (body) {
      body.classList.toggle('open', expanded);
      if (expanded) body.removeAttribute('hidden');
      else body.setAttribute('hidden', '');
    }
  });

  // ---------- Tabs (Active / Archive) ----------
  document.querySelectorAll('.tabs-bar').forEach(bar => {
    const buttons = bar.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Find sibling panes
        let parent = bar.parentElement;
        parent.querySelectorAll('.tab-pane').forEach(pane => {
          pane.style.display = (pane.dataset.pane === tab) ? '' : 'none';
        });
      });
    });
  });

  // ---------- Catalog/sale chips: handled by per-group handlers below in filterRequests / catalog filters ----------

  // ---------- Popular chips → hero input (работает на главной, каталоге, продаже) ----------
  document.querySelectorAll('.pq').forEach(c => {
    c.addEventListener('click', () => {
      // Найдём input в той же hero-форме
      const form = c.closest('.page-hero, header')?.querySelector('form.hero-search');
      const input = form?.querySelector('input[type="text"], input[name="q"]')
        || document.getElementById('heroInput')
        || document.getElementById('catalogQ')
        || document.getElementById('saleQ');
      if (input) {
        input.value = c.textContent;
        input.focus();
        // Если это форма submit-фильтра (catalog/sale) — отправим автоматически
        if (form && form.id !== 'heroSearchForm') {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    });
  });

  // ---------- View-toggle handled later (in IIFE below) ----------

  // ---------- Site search overlay (⌘K) ----------
  const soBtn = document.getElementById('siteSearchBtn');
  const so = document.getElementById('so');
  const soBd = document.getElementById('soBackdrop');
  const soInput = document.getElementById('soInput');
  const kbdHint = document.getElementById('kbdHint');

  if (kbdHint) {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    if (!isMac) kbdHint.textContent = 'Ctrl K';
  }

  const openSO = () => {
    if (so && soBd) {
      so.classList.add('on');
      soBd.classList.add('on');
      setTimeout(() => soInput && soInput.focus(), 50);
    }
  };
  const closeSO = () => {
    if (so && soBd) {
      so.classList.remove('on');
      soBd.classList.remove('on');
      if (soInput) soInput.value = '';
      clearFocus();
    }
  };

  if (soBtn) soBtn.addEventListener('click', openSO);
  if (soBd) soBd.addEventListener('click', closeSO);

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (so) {
        so.classList.contains('on') ? closeSO() : openSO();
      }
    }
    if (e.key === 'Escape') {
      if (so && so.classList.contains('on')) closeSO();
      if (drawer && drawer.classList.contains('on')) closeDrawer();
    }
  });

  document.querySelectorAll('.sd-chip').forEach(c => {
    c.addEventListener('click', e => {
      e.stopPropagation();
      // Navigate to catalog with search query
      window.location = '/catalog.html?q=' + encodeURIComponent(c.textContent);
    });
  });

  // "Все результаты" link — include current search query
  const soAllLink = document.getElementById('soAllLink');
  if (soInput && soAllLink) {
    soInput.addEventListener('input', () => {
      const q = soInput.value.trim();
      soAllLink.href = q ? '/catalog.html?q=' + encodeURIComponent(q) : '/catalog.html';
    });
    // Enter in search → go to catalog
    soInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && kbdIdx < 0) {
        e.preventDefault();
        const q = soInput.value.trim();
        if (q) window.location = '/catalog.html?q=' + encodeURIComponent(q);
      }
    });
  }

  // Keyboard navigation in search results
  const soItems = () => so ? Array.from(so.querySelectorAll('.sd-item')) : [];
  let kbdIdx = -1;
  function clearFocus(){
    soItems().forEach(i => i.classList.remove('kbd-focus'));
    kbdIdx = -1;
  }
  function setFocus(i){
    const items = soItems();
    clearFocus();
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    kbdIdx = i;
    if (items[i]) {
      items[i].classList.add('kbd-focus');
      items[i].scrollIntoView({ block: 'nearest' });
    }
  }
  if (soInput) {
    soInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(kbdIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(kbdIdx - 1); }
      else if (e.key === 'Enter' && kbdIdx >= 0) { e.preventDefault(); soItems()[kbdIdx].click(); }
    });
  }

})();

/* ===== MODALS (onboarding, login) ===== */
(function(){
  const openModal = (key) => {
    const modal = document.getElementById(key + 'Modal');
    const bd = document.getElementById(key + 'Backdrop');
    if (!modal || !bd) return;
    bd.classList.add('on');
    modal.classList.add('on');
    document.body.style.overflow = 'hidden';
  };
  const closeModal = (key) => {
    const modal = document.getElementById(key + 'Modal');
    const bd = document.getElementById(key + 'Backdrop');
    if (!modal || !bd) return;
    bd.classList.remove('on');
    modal.classList.remove('on');
    document.body.style.overflow = '';
  };

  // Open triggers
  document.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.open;
      // If it also has data-close, close that one first
      const c = el.dataset.close;
      if (c) closeModal(c);
      openModal(k);
    });
  });
  // Close triggers (X buttons and backdrop-clicks)
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.dataset.close));
  });
  const onbBd = document.getElementById('onbBackdrop');
  const loginBd = document.getElementById('loginBackdrop');
  if (onbBd) onbBd.addEventListener('click', () => closeModal('onb'));
  if (loginBd) loginBd.addEventListener('click', () => closeModal('login'));

  // Escape closes the topmost modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('loginModal')?.classList.contains('on')) closeModal('login');
      else if (document.getElementById('onbModal')?.classList.contains('on')) closeModal('onb');
    }
  });

  // ---- Onboarding role choice routing ----
  document.querySelectorAll('.onb-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      try { sessionStorage.setItem('rh_role', role); sessionStorage.setItem('rh_seen', '1'); } catch(e){}
      window.location = role === 'seller' ? '/sale.html' : '/catalog.html';
    });
  });

  // ---- Skip = remember and close ----
  document.querySelectorAll('.onb-skip').forEach(btn => {
    btn.addEventListener('click', () => {
      try { sessionStorage.setItem('rh_seen', '1'); } catch(e){}
    });
  });

  // ---- First-visit auto-open onboarding on index only ----
  const isHome = /\/(index\.html)?$/.test(location.pathname);
  if (isHome) {
    let seen = false;
    try { seen = sessionStorage.getItem('rh_seen') === '1'; } catch(e){}
    if (!seen && document.getElementById('onbModal')) {
      setTimeout(() => openModal('onb'), 600);
    }
  }

  // ---- Login tabs ----
  document.querySelectorAll('.login-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.login-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const key = t.dataset.tab;
      document.querySelectorAll('.login-pane').forEach(p => {
        p.hidden = p.dataset.pane !== key;
      });
    });
  });

  // Segmented role toggle in signup
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
})();

/* ===== WORKING FILTERS (catalog) ===== */
(function(){
  const grid = document.getElementById('offersGrid');
  if (!grid) return;

  let cards = Array.from(grid.querySelectorAll('.card[data-offer]'));
  const state = {
    crops: new Set(),       // selected crops
    regions: new Set(),     // selected regions
    priceMin: null,
    priceMax: null,
    distMax: null,
    withDelivery: false,
    withLab: false,
    withVat: false,
    query: ''
  };

  // Live filter apply
  function apply(){
    // Если каталог ещё грузится из БД — не трогаем пустой UI
    // (иначе мигнёт "По фильтрам ничего не найдено" пока крутится loader)
    if (grid.querySelector('.cards-loading')) {
      const empty = document.getElementById('emptyFilterResult');
      if (empty) empty.style.display = 'none';
      return;
    }
    let visible = 0;
    cards.forEach(card => {
      const d = card.dataset;
      const cropTokens = (d.crop || '').split(/\s+/).filter(Boolean);
      let ok = true;
      if (state.crops.size) {
        // Match if ANY of the card's crop tokens is in the selected set
        const hit = cropTokens.some(t => state.crops.has(t));
        if (!hit) ok = false;
      }
      if (ok && state.regions.size && !state.regions.has(d.region)) ok = false;
      if (ok && state.priceMin != null && parseFloat(d.price) < state.priceMin) ok = false;
      if (ok && state.priceMax != null && parseFloat(d.price) > state.priceMax) ok = false;
      if (ok && state.distMax != null && parseFloat(d.distance) > state.distMax) ok = false;
      if (ok && state.query) {
        const q = state.query.toLowerCase();
        const hay = (d.crop + ' ' + d.region + ' ' + (d.title || '')).toLowerCase();
        if (hay.indexOf(q) === -1) ok = false;
      }
      card.style.display = ok ? '' : 'none';
      if (ok) visible++;
    });
    const counter = document.getElementById('filterCount');
    if (counter) counter.textContent = visible;
    const mobCounter = document.getElementById('mobileFilterCount');
    if (mobCounter) mobCounter.textContent = visible;
    const empty = document.getElementById('emptyFilterResult');
    if (empty) empty.style.display = visible === 0 ? 'block' : 'none';
  }

  // Crop checkboxes
  document.querySelectorAll('[data-filter="crop"]').forEach(inp => {
    inp.addEventListener('change', () => {
      if (inp.checked) state.crops.add(inp.value); else state.crops.delete(inp.value);
      apply();

      // Если выбрали родительскую культуру — раскрыть её подкатегории автоматически
      const sub = document.querySelector(`.filter-subitems[data-subitems="${inp.value}"]`);
      if (sub && inp.checked) {
        sub.removeAttribute('hidden');
        sub.classList.add('expanded');
        const tog = document.querySelector(`.crop-toggle[data-toggle="${inp.value}"]`);
        if (tog) tog.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Кнопки-стрелки раскрытия подкатегорий (независимо от чекбокса)
  document.querySelectorAll('.crop-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      const sub = document.querySelector(`.filter-subitems[data-subitems="${id}"]`);
      if (!sub) return;
      const expanded = sub.classList.toggle('expanded');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (expanded) sub.removeAttribute('hidden');
      // не убираем атрибут hidden чтобы display:flex от .filter-subitems[hidden] продолжал держать структуру для анимации
    });
  });
  // Region checkboxes
  document.querySelectorAll('[data-filter="region"]').forEach(inp => {
    inp.addEventListener('change', () => {
      if (inp.checked) state.regions.add(inp.value); else state.regions.delete(inp.value);
      apply();
    });
  });
  // Price range
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const distMax = document.getElementById('distMax');
  [priceMin, priceMax, distMax].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      state.priceMin = priceMin?.value ? parseFloat(priceMin.value) : null;
      state.priceMax = priceMax?.value ? parseFloat(priceMax.value) : null;
      state.distMax = distMax?.value ? parseFloat(distMax.value) : null;
      apply();
    });
  });
  // Switches
  const wDel = document.getElementById('swDelivery');
  const wLab = document.getElementById('swLab');
  const wVat = document.getElementById('swVat');
  [[wDel,'withDelivery'],[wLab,'withLab'],[wVat,'withVat']].forEach(([el,key]) => {
    if (!el) return;
    el.addEventListener('change', () => { state[key] = el.checked; apply(); });
  });

  // Quick crop chips (top)
  document.querySelectorAll('[data-chip-crop]').forEach(chip => {
    chip.addEventListener('click', () => {
      const crop = chip.dataset.chipCrop;
      if (crop === 'all') {
        state.crops.clear();
        document.querySelectorAll('[data-filter="crop"]').forEach(i => i.checked = false);
      } else {
        // Toggle this one, clear others for chip-as-tab behavior
        const was = state.crops.has(crop) && state.crops.size === 1;
        state.crops.clear();
        document.querySelectorAll('[data-filter="crop"]').forEach(i => i.checked = false);
        if (!was) {
          state.crops.add(crop);
          const cb = document.querySelector('[data-filter="crop"][value="'+crop+'"]');
          if (cb) cb.checked = true;
        }
      }
      document.querySelectorAll('[data-chip-crop]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      apply();
    });
  });

  // Reset
  const resetBtn = document.getElementById('filtersReset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    state.crops.clear(); state.regions.clear();
    state.priceMin = state.priceMax = state.distMax = null;
    state.withDelivery = state.withLab = state.withVat = false;
    document.querySelectorAll('[data-filter]').forEach(i => i.checked = false);
    [priceMin, priceMax, distMax, wDel, wLab, wVat].forEach(el => { if (el) el.value = ''; if (el && el.type === 'checkbox') el.checked = false; });
    document.querySelectorAll('[data-chip-crop]').forEach(c => c.classList.remove('active'));
    const allChip = document.querySelector('[data-chip-crop="all"]');
    if (allChip) allChip.classList.add('active');
    apply();
  });

  // Mobile filter toggle
  const trigger = document.getElementById('mobileFilterTrigger');
  const aside = document.querySelector('.filters-aside');
  if (trigger && aside) {
    trigger.addEventListener('click', () => aside.classList.toggle('open'));
  }

  // Apply URL parameters from incoming links (e.g. /catalog?crop=wheat)
  try {
    const params = new URLSearchParams(location.search);
    const cropParam = params.get('crop');
    if (cropParam) {
      const cb = document.querySelector('[data-filter="crop"][value="' + cropParam + '"]');
      if (cb) {
        cb.checked = true;
        state.crops.add(cropParam);
      }
    }
    const regionParam = params.get('region');
    if (regionParam) {
      const cb = document.querySelector('[data-filter="region"][value="' + regionParam + '"]');
      if (cb) { cb.checked = true; state.regions.add(regionParam); }
    }
    if (params.get('delivery') === '1') {
      const sw = document.getElementById('swDelivery');
      if (sw) { sw.checked = true; state.withDelivery = true; }
    }
    const q = params.get('q');
    if (q) state.query = q;
  } catch(e){}

  // Initial run
  apply();

  // Когда admin.js догрузил карточки из Supabase — пересобираем cards и пересчитываем
  window.addEventListener('rh:catalog-loaded', () => {
    cards = Array.from(grid.querySelectorAll('.card[data-offer]'));
    apply();
  });

  // Hero-search форма на catalog.html — combobox-стиль (Что/Тип/Объём)
  const catHeroForm = document.getElementById('catalogHeroSearch');
  if (catHeroForm) {
    catHeroForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = (document.getElementById('catalogQ')?.value || '').trim();
      const vol = document.getElementById('catalogVolume')?.value || '';
      const type = document.getElementById('catalogType')?.value || 'buy';
      // type=sell → редирект на /sale.html с теми же параметрами
      if (type === 'sell') {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (vol) params.set('vol', vol);
        location.href = '/sale.html' + (params.toString() ? '?' + params.toString() : '');
        return;
      }
      // Иначе — фильтруем in-place в каталоге
      state.query = q;
      // Volume от X — пишем в state, apply() будет искать в data-attribute карточки
      state.volMin = vol ? parseInt(vol) : null;
      apply();
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
})();

/* ===== INTEGRATION with RH_API (auth flow, logout, form submissions) ===== */
(function(){
  if (!window.RH_API) return;
  const api = window.RH_API;

  // ---- SIGN IN (email + password) ----
  const signinForm = document.getElementById('signinForm');
  if (signinForm) {
    const hint = document.getElementById('signinHint');
    const submit = document.getElementById('signinSubmit');

    signinForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(signinForm);
      const email = fd.get('email')?.trim();
      const password = fd.get('password');

      if (!email || !password) {
        if (hint) { hint.textContent = 'Заполните все поля'; hint.style.color = 'var(--red)'; }
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Входим…';
      if (hint) { hint.textContent = ''; hint.style.color = ''; }

      try {
        await api.signIn({ email, password });
        window.location = '/account.html';
      } catch (err) {
        if (hint) {
          hint.textContent = '⚠ ' + (err.message === 'Invalid login credentials'
            ? 'Неверный email или пароль'
            : err.message);
          hint.style.color = 'var(--red)';
        }
        submit.disabled = false;
        submit.innerHTML = 'Войти →';
      }
    });
  }

  // ---- SIGN UP ----
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    const hint = document.getElementById('signupHint');
    const submit = document.getElementById('signupSubmit');
    const roleInput = signupForm.querySelector('input[name="role"]');

    // Sync segmented role buttons to hidden input
    signupForm.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (roleInput) roleInput.value = btn.dataset.role;
      });
    });

    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(signupForm);
      const payload = {
        email: fd.get('email')?.trim(),
        password: fd.get('password'),
        full_name: fd.get('full_name'),
        company_name: fd.get('company_name'),
        inn: fd.get('inn'),
        phone: fd.get('phone'),
        role: fd.get('role') || 'buyer',
      };

      if (payload.password.length < 6) {
        if (hint) { hint.textContent = 'Пароль не короче 6 символов'; hint.style.color = 'var(--red)'; }
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Создаём…';
      if (hint) { hint.textContent = ''; hint.style.color = ''; }

      try {
        const res = await api.signUp(payload);
        // If email confirmation is required, session won't be set
        if (res.session) {
          window.location = '/account.html';
        } else {
          if (hint) {
            hint.innerHTML = '✓ Регистрация успешна! Проверьте email для подтверждения.';
            hint.style.color = 'var(--brand-dark)';
          }
          submit.disabled = false;
          submit.innerHTML = 'Перейти ко входу →';
          submit.onclick = () => {
            document.querySelector('.login-tab[data-tab="signin"]')?.click();
          };
        }
      } catch (err) {
        if (hint) {
          let msg = err.message;
          if (msg.includes('already registered')) msg = 'Этот email уже зарегистрирован';
          else if (msg.includes('Password')) msg = 'Пароль слишком слабый';
          hint.textContent = '⚠ ' + msg;
          hint.style.color = 'var(--red)';
        }
        submit.disabled = false;
        submit.innerHTML = 'Создать аккаунт →';
      }
    });
  }

  // ---- Contact form ----
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const inputs = contactForm.querySelectorAll('input, textarea');
      const payload = {
        company: inputs[0]?.value,
        name: inputs[1]?.value,
        phone: inputs[2]?.value,
        message: inputs[3]?.value,
      };
      try {
        const r = await api.sendContactForm(payload);
        const btn = contactForm.querySelector('button[type="submit"]');
        if (btn) { btn.textContent = '✓ Отправлено · тикет ' + r.ticket; btn.classList.add('btn-primary'); btn.disabled = true; }
        contactForm.reset();
      } catch (err) {
        alert('Ошибка: ' + err.message);
      }
    });
  }

  // ---- Reverse request forms (landing, catalog, sale) ----
  document.querySelectorAll('.reverse-form').forEach(f => {
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const inputs = f.querySelectorAll('input');
      const payload = {
        product: inputs[0]?.value,
        location: inputs[1]?.value,
      };
      try {
        const r = await api.createRequest(payload);
        const btn = f.querySelector('button[type="submit"]');
        if (btn) { btn.textContent = '✓ Заявка ' + r.id + ' создана'; btn.disabled = true; }
      } catch (err) {
        alert('Ошибка: ' + err.message);
      }
    });
  });

  // ---- Logout (account page) ----
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      try { await api.signOut(); } catch(e) {}
      window.location = '/index.html';
    });
  });

  // ---- Show user info in header if logged in (async) ----
  api.currentUser().then(user => {
    if (user) {
      document.querySelectorAll('[data-open="login"]').forEach(b => {
        b.style.display = 'none';
      });
      const cabinetBtn = document.querySelector('.bar a.btn-primary[href*="account"]');
      if (cabinetBtn && user.full_name) {
        cabinetBtn.innerHTML = `👤 ${user.full_name.split(' ')[0]}`;
      }
    }
  }).catch(() => {});

})();

/* ===== Theme helpers (preserve smooth anchors on in-page links) ===== */
document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ===== VIEW TOGGLE: grid vs list ===== */
(function(){
  document.querySelectorAll('.view-toggle').forEach(tog => {
    const targetId = tog.dataset.target;
    const grid = targetId ? document.getElementById(targetId) : null;
    if (!grid) return;

    // Load saved preference
    try {
      const saved = localStorage.getItem('rh_view_' + targetId);
      if (saved === 'list') {
        grid.classList.add('list-view');
        tog.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === 'list'));
      }
    } catch(e){}

    tog.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        tog.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        grid.classList.toggle('list-view', view === 'list');
        try { localStorage.setItem('rh_view_' + targetId, view); } catch(e){}
      });
    });
  });
})();

/* ===== SORT in catalog ===== */
(function(){
  const sortSelect = document.getElementById('sortSelect');
  const grid = document.getElementById('offersGrid');
  if (!sortSelect || !grid) return;

  sortSelect.addEventListener('change', () => {
    const mode = sortSelect.value;
    const cards = Array.from(grid.querySelectorAll('.card[data-offer]'));
    cards.sort((a, b) => {
      switch(mode){
        case 'price-asc':  return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
        case 'price-desc': return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
        case 'distance':   return parseFloat(a.dataset.distance) - parseFloat(b.dataset.distance);
        case 'new':        return parseInt(b.dataset.offer) - parseInt(a.dataset.offer);
        case 'rating':     return 0; // TODO: add rating attr
        default: return 0;
      }
    });
    cards.forEach(c => grid.appendChild(c));
  });
})();

/* ===== HERO SEARCH FORM — route to correct page ===== */
(function(){
  const form = document.getElementById('heroSearchForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = form.querySelector('#heroInput').value.trim();
    const type = form.querySelector('#heroType').value;
    const volume = form.querySelector('[name="volume"]').value;
    const base = type === 'sell' ? '/sale.html' : '/catalog.html';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (volume) params.set('vol', volume);
    window.location = base + (params.toString() ? '?' + params : '');
  });
})();

/* ===== SALE PAGE: filter requests in real time ===== */
function filterRequests(){
  const q = (document.getElementById('saleQ')?.value || '').toLowerCase().trim();
  const region = document.getElementById('saleRegion')?.value || '';
  const minVol = parseInt(document.getElementById('saleVolume')?.value || '0') || 0;
  const vat = document.getElementById('saleVat')?.value || '';

  // Map Russian search terms to crop keys
  const cropKeyMap = {
    'пшениц': 'wheat', 'ячмен': 'barley', 'кукуруз': 'corn',
    'подсолнечник': 'sunflower', 'овёс': 'oat', 'овес': 'oat',
    'рапс': 'rapeseed', 'соя': 'soy', 'горох': 'pea', 'гречих': 'buckwheat'
  };
  let queryCrop = '';
  for (const [keyword, key] of Object.entries(cropKeyMap)) {
    if (q.includes(keyword)) { queryCrop = key; break; }
  }

  // Sidebar filter-checks (Пшеница, 3 класс, ...) — multi-token match как в каталоге
  const selectedCrops = new Set();
  document.querySelectorAll('[data-filter="crop"]').forEach(cb => {
    if (cb.checked) selectedCrops.add(cb.value);
  });
  // Sidebar diapazon
  const sbPriceMin = parseFloat(document.getElementById('priceMin')?.value) || null;
  const sbPriceMax = parseFloat(document.getElementById('priceMax')?.value) || null;

  const cards = document.querySelectorAll('.req-card');
  let visible = 0;
  cards.forEach(card => {
    const title = (card.dataset.title || '').toLowerCase();
    const cropKey = (card.dataset.crop || '').toLowerCase();
    const cropTokens = cropKey.split(/\s+/).filter(Boolean);
    const r = card.dataset.region || '';
    const v = parseInt(card.dataset.volume || '0') || 0;
    const price = parseFloat(card.dataset.price || '0') || 0;
    const cardVat = card.dataset.vat || '';

    let ok = true;
    // Search by query: match against crop key, title, or region
    if (q) {
      const matchesQuery =
        title.includes(q) ||
        r.toLowerCase().includes(q) ||
        (queryCrop && cropTokens.includes(queryCrop));
      if (!matchesQuery) ok = false;
    }
    // Sidebar crops (multi-token)
    if (ok && selectedCrops.size) {
      const hit = cropTokens.some(t => selectedCrops.has(t));
      if (!hit) ok = false;
    }
    if (ok && region && !r.toLowerCase().includes(region.toLowerCase())) ok = false;
    if (ok && minVol && v < minVol) ok = false;
    if (ok && sbPriceMin != null && price < sbPriceMin) ok = false;
    if (ok && sbPriceMax != null && price > sbPriceMax) ok = false;
    if (ok && vat === 'yes' && cardVat !== 'yes') ok = false;
    if (ok && vat === 'no' && cardVat !== 'no') ok = false;

    card.style.display = ok ? '' : 'none';
    if (ok) visible++;
  });
  const counter = document.getElementById('saleCount');
  if (counter) counter.textContent = visible;
  const filterCount = document.getElementById('filterCount');
  if (filterCount) filterCount.textContent = visible;

  // Update active tab badges
  const activeTabBadge = document.querySelector('.tab-btn.active .tab-count');
  if (activeTabBadge && cards.length > 0) {
    activeTabBadge.textContent = visible;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ['saleQ','saleRegion','saleVolume','saleVat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', filterRequests);
      el.addEventListener('change', filterRequests);
    }
  });

  // Wire chip tabs (Все запросы / Срочные / Пшеница / etc.) to filter
  document.querySelectorAll('.req-chips .c-chip, .catalog-chips .c-chip').forEach(chip => {
    if (chip.tagName === 'A') return; // skip <a> chips on home (they're links)
    chip.addEventListener('click', () => {
      // visual active state
      const siblings = chip.parentElement?.querySelectorAll('.c-chip');
      siblings?.forEach(s => s.classList.remove('active'));
      chip.classList.add('active');

      // Apply chip-based filter
      const text = chip.textContent.toLowerCase().trim();
      const qInput = document.getElementById('saleQ');
      if (!qInput) return;

      if (text.includes('все') || text.includes('срочн')) {
        qInput.value = '';
      } else {
        // Extract just crop name (without count)
        const cropMatch = text.match(/(пшениц|ячмен|кукуруз|подсолнечник|рапс|овёс|овес|соя|горох|гречих)\S*/);
        qInput.value = cropMatch ? cropMatch[0] : '';
      }
      filterRequests();
    });
  });

  // Apply URL params from hero
  const p = new URLSearchParams(location.search);
  const q = p.get('q');
  if (q) {
    const qInp = document.getElementById('saleQ');
    if (qInp) { qInp.value = q; }
  }
  const vol = p.get('vol');
  if (vol) {
    const volSel = document.getElementById('saleVolume');
    if (volSel) {
      // Match closest available option
      const target = parseInt(vol);
      const opts = Array.from(volSel.options).map(o => parseInt(o.value) || 0);
      const closest = opts.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
      volSel.value = String(closest);
    }
  }
  // Run initial filter (catches URL params and any default state)
  if (document.querySelectorAll('.req-card').length > 0) {
    filterRequests();
  }

  // Sale-страница: sidebar filter-checks (Культура, цена) тоже должны триггерить filterRequests
  // (только если на странице есть .req-card — иначе мы на /catalog.html и фильтр свой)
  const saleSidebarTrigger = () => {
    if (document.querySelectorAll('.req-card').length > 0) filterRequests();
  };
  document.querySelectorAll('[data-filter="crop"]').forEach(cb => {
    cb.addEventListener('change', saleSidebarTrigger);
  });
  ['priceMin', 'priceMax', 'distMax'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saleSidebarTrigger);
  });

  // Sale hero search form: combobox-стиль (Что/Тип/Объём)
  const heroForm = document.getElementById('saleHeroSearch');
  if (heroForm) {
    heroForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = (document.getElementById('saleQ')?.value || '').trim();
      const vol = document.getElementById('saleVolume')?.value || '';
      const type = document.getElementById('saleType')?.value || 'sell';
      // type=buy → редирект на /catalog.html
      if (type === 'buy') {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (vol) params.set('vol', vol);
        location.href = '/catalog.html' + (params.toString() ? '?' + params.toString() : '');
        return;
      }
      // Иначе фильтруем in-place
      filterRequests();
      const grid = document.getElementById('reqsGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // После того как admin.js догрузил карточки из БД — пересчитываем фильтр
  window.addEventListener('rh:sale-loaded', () => {
    if (document.querySelectorAll('.req-card').length > 0) filterRequests();
  });
});

/* ===== GEOLOCATION + CITY PICKER ===== */
(function(){
  const STORAGE_KEY = 'rh_city';
  const DEFAULT_CITY = { name: 'Нижний Новгород', region: 'Нижегородская область', lat: 56.3269, lng: 44.0075 };

  function getCurrentCity() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (c && c.name && c.lat && c.lng) return c;
      }
    } catch(e){}
    return DEFAULT_CITY;
  }

  // Глобальный getter — admin.js читает отсюда координаты, НЕ полагаясь на race condition
  window.RH_getCity = getCurrentCity;

  function setCurrentCity(city) {
    // 1. Базовая валидация
    if (!city || !city.name) return;
    // Если у города нет координат — пытаемся найти в RH_CITIES по имени
    if ((!city.lat || !city.lng) && window.RH_CITIES) {
      const found = window.RH_CITIES.find(c => c.name === city.name);
      if (found) { city.lat = found.lat; city.lng = found.lng; city.region = city.region || found.region; }
    }
    // Если всё ещё нет координат — fallback на НН (чтобы distance не считался от undefined)
    if (!city.lat || !city.lng) {
      console.warn('[setCurrentCity] no coords for', city.name, '— fallback to НН');
      city.lat = 56.3269; city.lng = 44.0075;
    }

    // 2. Сохраняем в localStorage СИНХРОННО (это первичный источник истины)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(city)); } catch(e){}

    // 3. Глобальные переменные — для совместимости со старым кодом
    window.__rh_user_city = city.name;
    window.__rh_user_coords = { lat: city.lat, lng: city.lng };

    // 4. Обновляем все region-chip в шапке
    document.querySelectorAll('.region-chip').forEach(chip => {
      chip.innerHTML = `<span class="ico"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 18s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="10" cy="8" r="2"/></svg></span> ${city.name} <span class="change">изменить</span>`;
    });

    // 5. Обновляем существующие карточки на странице (маршрут + distance)
    //    Это работает даже если admin.js не успел перерисовать — для UX мгновенно меняется.
    document.querySelectorAll('.distance-strip .route').forEach(routeEl => {
      const card = routeEl.closest('[data-offer], [data-request]');
      // Найдём «откуда» — это city.from на оффере (data-region attribute или старый текст)
      const cityFrom = card?.dataset.region || routeEl.textContent.split('→')[0].trim() || '—';
      routeEl.textContent = `${cityFrom} → ${city.name}`;
    });

    // 6. Если юзер залогинен — асинхронно обновим его профиль (чтобы при перезагрузке город остался)
    if (window.RH_API && window.RH_API.getCurrentUser) {
      (async () => {
        try {
          const u = await window.RH_API.getCurrentUser();
          if (u && u.id && (u.city !== city.name)) {
            await window.RH_API.updateProfile?.({ city: city.name, region: city.region, city_lat: city.lat, city_lng: city.lng }).catch(() => {});
          }
        } catch(_) {}
      })();
    }

    // 7. Диспатч события — admin.js слушает чтобы перезагрузить карточки с новыми distance
    window.dispatchEvent(new CustomEvent('rh:city-changed', { detail: city }));
  }

  // Initial setup — выполняем сразу, не дожидаясь DOMContentLoaded
  // (если DOM ещё не готов — region-chip ещё не существуют, обновим на DOMContentLoaded)
  const current = getCurrentCity();
  // Уже на этапе парсинга устанавливаем глобальные переменные
  window.__rh_user_city = current.name;
  window.__rh_user_coords = { lat: current.lat, lng: current.lng };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setCurrentCity(current));
  } else {
    setCurrentCity(current);
  }

  // Handle clicks on region-chip → open city picker
  document.addEventListener('click', e => {
    const chip = e.target.closest('.region-chip');
    if (!chip) return;
    e.preventDefault();
    openCityPicker();
  });

  function openCityPicker() {
    let modal = document.getElementById('cityPickerModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cityPickerModal';
      modal.className = 'modal modal-city';
      modal.innerHTML = `
        <button class="modal-close" aria-label="Закрыть">✕</button>
        <div class="cp-head">
          <h2>Выберите ваш город</h2>
          <p>Мы пересчитаем расстояния до складов и стоимость доставки.</p>
        </div>
        <div class="cp-geo">
          <button class="btn btn-primary btn-block" id="cpGeoBtn">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="2" fill="currentColor"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3"/></svg>
            Определить автоматически
          </button>
          <div class="cp-geo-status" id="cpGeoStatus"></div>
        </div>
        <div class="cp-search">
          <input type="text" id="cpSearch" placeholder="Введите название города…" autocomplete="off" />
        </div>
        <div class="cp-results" id="cpResults"></div>
      `;
      document.body.appendChild(modal);

      const bd = document.createElement('div');
      bd.id = 'cityPickerBackdrop';
      bd.className = 'modal-backdrop';
      document.body.appendChild(bd);
      bd.addEventListener('click', closeCityPicker);
      modal.querySelector('.modal-close').addEventListener('click', closeCityPicker);

      // Search
      const search = modal.querySelector('#cpSearch');
      const results = modal.querySelector('#cpResults');
      function renderResults(list) {
        if (!list.length) {
          results.innerHTML = '<div class="cp-empty">Город не найден. Проверьте написание.</div>';
          return;
        }
        results.innerHTML = list.map(c =>
          `<button class="cp-item" data-city='${JSON.stringify(c).replace(/'/g,"&apos;")}'>
            <div class="cp-item-name">${c.name}</div>
            <div class="cp-item-region">${c.region}</div>
          </button>`
        ).join('');
        results.querySelectorAll('.cp-item').forEach(item => {
          item.addEventListener('click', () => {
            const c = JSON.parse(item.dataset.city.replace(/&apos;/g,"'"));
            setCurrentCity(c);
            closeCityPicker();
          });
        });
      }
      search.addEventListener('input', () => {
        renderResults(window.RH_CITIES_SEARCH(search.value, 12));
      });
      renderResults(window.RH_CITIES_SEARCH('', 12));

      // Geolocation
      modal.querySelector('#cpGeoBtn').addEventListener('click', () => {
        const status = modal.querySelector('#cpGeoStatus');
        if (!navigator.geolocation) {
          status.textContent = 'Геолокация не поддерживается вашим браузером';
          return;
        }
        status.textContent = 'Определяем ваше местоположение…';
        navigator.geolocation.getCurrentPosition(
          pos => {
            const c = window.RH_CITIES_FIND_BY_COORDS(pos.coords.latitude, pos.coords.longitude);
            if (c) {
              status.innerHTML = `✓ Определено: <b>${c.name}</b> (${c.region})`;
              status.style.color = 'var(--emerald-600)';
              setTimeout(() => { setCurrentCity(c); closeCityPicker(); }, 800);
            } else {
              status.textContent = 'Не удалось определить город. Введите вручную.';
            }
          },
          err => {
            status.textContent = err.code === 1
              ? 'Доступ к геолокации запрещён. Разрешите в настройках браузера.'
              : 'Не удалось определить местоположение. Попробуйте ввести город вручную.';
            status.style.color = 'var(--red)';
          },
          { timeout: 10000, maximumAge: 60000 }
        );
      });
    }
    document.getElementById('cityPickerBackdrop').classList.add('on');
    modal.classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.querySelector('#cpSearch')?.focus(), 100);
  }
  function closeCityPicker() {
    const modal = document.getElementById('cityPickerModal');
    const bd = document.getElementById('cityPickerBackdrop');
    if (modal) modal.classList.remove('on');
    if (bd) bd.classList.remove('on');
    document.body.style.overflow = '';
  }
  window.RH_openCityPicker = openCityPicker;
})();

/* ===== LIVE QUOTES — update prices every 30s with small fluctuations ===== */
(function(){
  const quoteEls = document.querySelectorAll('[data-quote-crop]');
  if (!quoteEls.length) return;

  function fluctuate(){
    quoteEls.forEach(el => {
      const base = parseFloat(el.dataset.basePrice || el.dataset.quotePrice || '0');
      if (!base) return;
      // ±0.5% random walk
      const delta = (Math.random() - 0.5) * 0.01;
      const newPrice = Math.round(base * (1 + delta));
      const changePct = ((newPrice - base) / base * 100).toFixed(2);
      const numEl = el.querySelector('.q-price');
      const chgEl = el.querySelector('.q-change');
      if (numEl) {
        numEl.textContent = newPrice.toLocaleString('ru-RU') + ' ₽/т';
        numEl.classList.remove('flash-up', 'flash-dn');
        void numEl.offsetWidth; // reflow
        numEl.classList.add(newPrice > base ? 'flash-up' : 'flash-dn');
      }
      if (chgEl) {
        chgEl.textContent = (changePct >= 0 ? '+' : '') + changePct + '%';
        chgEl.className = 'q-change ' + (changePct >= 0 ? 'up' : 'dn');
      }
    });
  }
  setInterval(fluctuate, 3000 + Math.random() * 2000);
})();

/* ===== AUCTION COUNTDOWN ===== */
(function(){
  const cards = document.querySelectorAll('[data-auction-ends]');
  if (!cards.length) return;

  function fmt(seconds){
    if (seconds <= 0) return 'Завершён';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}д ${h}ч ${m}м`;
    if (h > 0) return `${h}ч ${m}м ${String(s).padStart(2,'0')}с`;
    return `${m}м ${String(s).padStart(2,'0')}с`;
  }
  function tick(){
    const now = Date.now();
    cards.forEach(card => {
      const endsAt = new Date(card.dataset.auctionEnds).getTime();
      const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
      const el = card.querySelector('.auction-timer');
      if (el) el.textContent = fmt(remaining);
      // Highlight ending-soon
      if (remaining < 3600 && remaining > 0) card.classList.add('ending-soon');
      if (remaining <= 0) { card.classList.add('ended'); card.classList.remove('ending-soon'); }
    });
  }
  tick(); setInterval(tick, 1000);
})();

/* ===== LOGIN FORM (regular sign-in via Supabase Auth) =====
   SECURITY: Hard-coded demo accounts removed in v2.5.1.
   The "demo" buttons now require admin to manually create accounts in Supabase Auth.
   ===================================================== */
(function(){
  // Manual login form on login.html / sign-in modal
  const demoSubmit = document.getElementById('demoSubmit');
  const demoHint = document.getElementById('demoHint');
  const demoUser = document.getElementById('demoUsername');
  const demoPass = document.getElementById('demoPassword');

  if (demoSubmit) {
    demoSubmit.addEventListener('click', async (e) => {
      e.preventDefault();
      const u = demoUser?.value.trim();
      const p = demoPass?.value.trim();
      if (!u || !p) {
        if (demoHint) { demoHint.textContent = 'Заполните логин и пароль'; demoHint.style.color = 'var(--red)'; }
        return;
      }
      demoSubmit.disabled = true;
      demoSubmit.textContent = 'Проверяем…';
      try {
        // Sign in via Supabase (email + password). No more hardcoded demo accounts.
        await window.RH_API.signIn({ email: u, password: p });
        window.location = '/account.html';
      } catch (err) {
        if (demoHint) { demoHint.textContent = '⚠ ' + (err.message || 'Ошибка входа'); demoHint.style.color = 'var(--red)'; }
        demoSubmit.disabled = false;
        demoSubmit.innerHTML = 'Войти →';
      }
    });
  }

  // Hide any "one-click demo" buttons that might still be in legacy HTML
  document.querySelectorAll('.demo-account').forEach(btn => {
    btn.style.display = 'none';
  });
})();

/* ===== ACCOUNT PAGE: handled by admin.js (which uses async API) ===== */


/* ============================================================
   v2.5.0 — UNIVERSAL DICTIONARY: regions/districts/cities from DB
   ============================================================ */
(function() {
  const REGIONS_DL_ID  = 'rh-geo-regions-datalist';
  const DISTRICTS_DL_ID= 'rh-geo-districts-datalist';
  const CITIES_DL_ID   = 'rh-geo-cities-datalist';
  const ALL_DL_ID      = 'rh-geo-all-datalist';

  let cachedAllNames = null;

  async function ensureAllPlaces() {
    if (cachedAllNames) return cachedAllNames;
    if (!window.RH_API) return null;
    try {
      // Build a flat all-places list: regions + districts + cities
      const [regions] = await Promise.all([ window.RH_API.listGeoRegions() ]);
      const out = [...regions.map(r => ({ name: r.name, label: r.full_name || r.name }))];

      // Load districts for the (only) region — currently only Нижегородская
      for (const r of regions) {
        const districts = await window.RH_API.listGeoDistricts(r.id);
        out.push(...districts.map(d => ({ name: d.name, label: d.full_name || d.name })));
        // Cities of each district
        for (const d of districts) {
          const cities = await window.RH_API.listGeoCities(d.id);
          out.push(...cities.map(c => ({ name: c.name, label: c.full_name || c.name })));
        }
      }
      cachedAllNames = out;
      return out;
    } catch(e) {
      console.warn('[geo] dictionary load failed, falling back to cities.js', e);
      // Fallback to local cities.js
      if (window.RH_CITIES) {
        cachedAllNames = window.RH_CITIES.map(c => ({ name: c.name, label: c.name + ' · ' + (c.region||'') }));
        return cachedAllNames;
      }
      return [];
    }
  }

  async function setupGeoDatalists() {
    const places = await ensureAllPlaces();
    if (!places || !places.length) return;

    // Single combined datalist for ALL place names (city OR region OR district)
    let dl = document.getElementById(ALL_DL_ID);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = ALL_DL_ID;
      document.body.appendChild(dl);
    }
    dl.innerHTML = places.map(p =>
      `<option value="${escapeAttr(p.name)}">${escapeAttr(p.label)}</option>`
    ).join('');

    // Bind to relevant inputs
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(inp => {
      if (inp.list) return;
      const ph = (inp.placeholder || '').toLowerCase();
      const nm = (inp.name || '').toLowerCase();
      const id = (inp.id || '').toLowerCase();
      const all = ph + ' ' + nm + ' ' + id;
      if (
        all.includes('город') || all.includes('адрес') || all.includes('city') ||
        all.includes('address') || all.includes('регион') || all.includes('region') ||
        all.includes('область') || all.includes('район') || all.includes('district') ||
        all.includes('куда') || all.includes('откуда') || all.includes('доставк')
      ) {
        inp.setAttribute('list', ALL_DL_ID);
        inp.autocomplete = 'on';
      }
    });
  }

  function escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // Run after RH_API is ready (with retry until it appears)
  function bootstrapGeo() {
    if (!window.RH_API) {
      setTimeout(bootstrapGeo, 200);
      return;
    }
    setupGeoDatalists();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapGeo);
  } else {
    bootstrapGeo();
  }

  // Re-bind when dynamic content loads
  window.addEventListener('rh:catalog-loaded', () => setupGeoDatalists());
  window.addEventListener('rh:sale-loaded',    () => setupGeoDatalists());

  // Periodic rebind for modals
  let lastCount = 0;
  setInterval(() => {
    const cur = document.querySelectorAll('input[type="text"], input:not([type])').length;
    if (cur !== lastCount) {
      setupGeoDatalists();
      lastCount = cur;
    }
  }, 1500);
})();
