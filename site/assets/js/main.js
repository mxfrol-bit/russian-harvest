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

  // ---------- Quality accordion ----------
  document.querySelectorAll('.q-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.q;
      const body = document.querySelector(`.q-body[data-q="${id}"]`);
      btn.classList.toggle('open');
      if (body) body.classList.toggle('open');
    });
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

  // ---------- Catalog chips ----------
  document.querySelectorAll('.c-chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.c-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    });
  });

  // ---------- Popular chips → hero input ----------
  document.querySelectorAll('.pq').forEach(c => {
    c.addEventListener('click', () => {
      const input = document.getElementById('heroInput');
      if (input) {
        input.value = c.textContent;
        input.focus();
      }
    });
  });

  // ---------- View-toggle (Grid / List / Map) ----------
  document.querySelectorAll('.view-toggle button').forEach(b => {
    b.addEventListener('click', () => {
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

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
      if (soInput) {
        soInput.value = c.textContent;
        soInput.focus();
      }
    });
  });

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

  const cards = Array.from(grid.querySelectorAll('.card[data-offer]'));
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
    let visible = 0;
    cards.forEach(card => {
      const d = card.dataset;
      let ok = true;
      if (state.crops.size && !state.crops.has(d.crop)) ok = false;
      if (ok && state.regions.size && !state.regions.has(d.region)) ok = false;
      if (ok && state.priceMin != null && parseFloat(d.price) < state.priceMin) ok = false;
      if (ok && state.priceMax != null && parseFloat(d.price) > state.priceMax) ok = false;
      if (ok && state.distMax != null && parseFloat(d.distance) > state.distMax) ok = false;
      if (ok && state.withDelivery && d.delivery !== '1') ok = false;
      if (ok && state.withLab && d.lab !== '1') ok = false;
      if (ok && state.withVat && d.vat !== '1') ok = false;
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

  // Initial run
  apply();
})();

/* ===== INTEGRATION with RH_API (auth flow, logout, form submissions) ===== */
(function(){
  if (!window.RH_API) return;
  const api = window.RH_API;

  // ---- Login form (SMS flow) ----
  const signinForm = document.querySelector('[data-pane="signin"] form');
  if (signinForm) {
    const phoneInput = signinForm.querySelector('input[type="tel"]');
    const codeInput = signinForm.querySelector('input[type="text"]');
    const hint = signinForm.querySelector('.form-hint');
    let smsSent = false;

    // When user types 11+ chars of phone, trigger SMS send
    if (phoneInput) {
      phoneInput.addEventListener('blur', async () => {
        const phone = phoneInput.value.replace(/\D/g, '');
        if (phone.length >= 11 && !smsSent) {
          try {
            const r = await api.sendSmsCode(phone);
            smsSent = true;
            if (hint) hint.innerHTML = (api.isDemo ? '✓ ' + r.message : '✓ Код отправлен на ' + phoneInput.value);
            if (hint) hint.style.color = 'var(--emerald-600)';
          } catch (e) {
            if (hint) { hint.textContent = '⚠ ' + e.message; hint.style.color = 'var(--red)'; }
          }
        }
      });
    }

    signinForm.addEventListener('submit', async e => {
      e.preventDefault();
      const phone = phoneInput.value.replace(/\D/g, '');
      const code = (codeInput?.value || '').trim();
      if (!code) {
        if (hint) { hint.textContent = 'Введите код из SMS'; hint.style.color = 'var(--red)'; }
        return;
      }
      try {
        const btn = signinForm.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Проверяем…'; }
        await api.verifyCode(phone, code);
        window.location = '/account.html';
      } catch (err) {
        if (hint) { hint.textContent = '⚠ ' + err.message; hint.style.color = 'var(--red)'; }
        const btn = signinForm.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Войти →'; }
      }
    });
  }

  // ---- Signup form ----
  const signupForm = document.querySelector('[data-pane="signup"] form');
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const inputs = signupForm.querySelectorAll('input');
      const role = signupForm.querySelector('.seg-btn.active')?.dataset.role || 'buyer';
      const payload = {
        company: inputs[0]?.value,
        inn: inputs[1]?.value,
        phone: inputs[2]?.value,
        email: inputs[3]?.value,
        role,
      };
      try {
        const btn = signupForm.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Создаём…'; }
        await api.register(payload);
        window.location = '/account.html';
      } catch (err) {
        alert('Ошибка регистрации: ' + err.message);
        const btn = signupForm.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Создать аккаунт →'; }
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
      await api.logout();
      window.location = '/index.html';
    });
  });

  // ---- Show user info in header if logged in ----
  const user = api.currentUser();
  if (user) {
    // Replace "Войти" button with user name/avatar
    document.querySelectorAll('[data-open="login"]').forEach(b => {
      b.style.display = 'none';
    });
    // Optionally update "Кабинет" button to show name
    const cabinetBtn = document.querySelector('.bar a.btn-primary[href*="account"]');
    if (cabinetBtn && user.name) {
      cabinetBtn.innerHTML = `👤 ${user.name.split(' ')[0]}`;
    }
  }

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
