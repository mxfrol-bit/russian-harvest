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
  const minVol = parseInt(document.getElementById('saleVolume')?.value || '0');
  const vat = document.getElementById('saleVat')?.value || '';

  const cards = document.querySelectorAll('.request-card');
  let visible = 0;
  cards.forEach(card => {
    const title = (card.dataset.title || '').toLowerCase();
    const r = card.dataset.region || '';
    const v = parseInt(card.dataset.volume || '0');
    const cardVat = card.dataset.vat || '';
    let ok = true;
    if (q && !title.includes(q) && !r.toLowerCase().includes(q)) ok = false;
    if (ok && region && r !== region) ok = false;
    if (ok && minVol && v < minVol) ok = false;
    if (ok && vat === 'yes' && cardVat !== 'yes') ok = false;
    if (ok && vat === 'no' && cardVat !== 'no') ok = false;
    card.style.display = ok ? '' : 'none';
    if (ok) visible++;
  });
  const counter = document.getElementById('saleCount');
  if (counter) counter.textContent = visible;
}
document.addEventListener('DOMContentLoaded', () => {
  ['saleQ','saleRegion','saleVolume','saleVat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', filterRequests);
    if (el) el.addEventListener('change', filterRequests);
  });
  // Apply URL params from hero if landed from home
  const p = new URLSearchParams(location.search);
  const q = p.get('q');
  if (q) {
    const qInp = document.getElementById('saleQ') || document.getElementById('catalogQ');
    if (qInp) { qInp.value = q; qInp.dispatchEvent(new Event('input')); }
  }
});

/* ===== GEOLOCATION + CITY PICKER ===== */
(function(){
  const STORAGE_KEY = 'rh_city';
  const DEFAULT_CITY = { name: 'Нижний Новгород', region: 'Нижегородская область', lat: 56.3269, lng: 44.0075 };

  function getCurrentCity() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e){}
    return DEFAULT_CITY;
  }
  function setCurrentCity(city) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(city)); } catch(e){}
    // Update all region-chip buttons in the DOM
    document.querySelectorAll('.region-chip').forEach(chip => {
      const text = chip.childNodes[2]; // after icon and space
      const allText = chip.textContent;
      // Rebuild safely
      chip.innerHTML = `<span class="ico"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 18s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="10" cy="8" r="2"/></svg></span> ${city.name} <span class="change">изменить</span>`;
    });
    window.dispatchEvent(new CustomEvent('rh:city-changed', { detail: city }));
  }

  // Initial setup
  const current = getCurrentCity();
  document.addEventListener('DOMContentLoaded', () => {
    setCurrentCity(current);
  });

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

/* ===== DEMO LOGIN (admin/admin, user/user) ===== */
(function(){
  // One-click demo account buttons
  document.querySelectorAll('.demo-account').forEach(btn => {
    btn.addEventListener('click', async () => {
      const username = btn.dataset.login;
      const password = btn.dataset.pass;
      const originalBg = btn.style.background;
      btn.style.background = 'var(--emerald-soft)';
      btn.style.borderColor = 'var(--emerald)';

      try {
        if (window.RH_API) {
          await window.RH_API.loginWithCredentials(username, password);
        }
        window.location = '/account.html';
      } catch (err) {
        alert('Ошибка входа: ' + err.message);
        btn.style.background = originalBg;
        btn.style.borderColor = '';
      }
    });
  });

  // Manual form
  const demoForm = document.getElementById('demoForm');
  const demoSubmit = document.getElementById('demoSubmit');
  const demoHint = document.getElementById('demoHint');
  const demoUser = document.getElementById('demoUsername');
  const demoPass = document.getElementById('demoPassword');

  if (demoForm && demoSubmit) {
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
        if (window.RH_API) {
          await window.RH_API.loginWithCredentials(u, p);
        }
        window.location = '/account.html';
      } catch (err) {
        if (demoHint) { demoHint.textContent = '⚠ ' + err.message; demoHint.style.color = 'var(--red)'; }
        demoSubmit.disabled = false;
        demoSubmit.innerHTML = 'Войти →';
      }
    });
  }
})();

/* ===== ACCOUNT PAGE: populate from logged-in user ===== */
(function(){
  // Only run on account page
  if (!document.getElementById('accName')) return;

  const user = window.RH_API?.currentUser();
  if (!user) {
    // Not logged in — redirect to login
    setTimeout(() => {
      alert('Необходимо войти в аккаунт. Используйте admin/admin или user/user.');
      window.location = '/index.html';
    }, 100);
    return;
  }

  // Build initials
  const parts = (user.name || '').split(' ').filter(Boolean);
  const initials = parts.slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';

  // Update sidebar
  const avEl = document.getElementById('accAvatar');
  if (avEl) avEl.textContent = initials;
  const nameEl = document.getElementById('accName');
  if (nameEl) nameEl.textContent = user.name || 'Пользователь';
  const companyEl = document.getElementById('accCompany');
  if (companyEl) companyEl.textContent = user.company || '';

  const balanceEl = document.getElementById('accBalance');
  if (balanceEl) {
    balanceEl.innerHTML = (user.balance || 0).toLocaleString('ru-RU') + '<small>₽</small>';
  }

  // Role chip
  const roleEl = document.getElementById('accRole');
  if (roleEl) {
    if (user.role === 'admin') {
      roleEl.innerHTML = '👑 Администратор';
      roleEl.style.background = '#FEF3C7';
      roleEl.style.color = '#92400E';
    } else if (user.role === 'seller') {
      roleEl.innerHTML = '🌾 Продавец';
      roleEl.style.background = 'var(--orange-soft)';
      roleEl.style.color = '#92400E';
    } else {
      roleEl.innerHTML = '🛒 Покупатель';
    }
  }

  // Greeting
  const firstName = parts[0] || 'пользователь';
  const greetEl = document.getElementById('accGreeting');
  if (greetEl) {
    if (user.role === 'admin') {
      greetEl.textContent = `Админ-панель, ${firstName} 👑`;
    } else {
      greetEl.textContent = `Здравствуйте, ${firstName} 👋`;
    }
  }
  const subEl = document.getElementById('accSubtitle');
  if (subEl && user.role === 'admin') {
    subEl.textContent = 'Полный контроль над платформой: модерация, пользователи, сделки и аналитика.';
  }

  // Show admin panel for admin role
  if (user.role === 'admin') {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) adminPanel.style.display = '';
  }

  // Update avatar background for admin
  if (user.role === 'admin' && avEl) {
    avEl.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
  }
})();
