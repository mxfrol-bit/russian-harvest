/**
 * ADMIN & SELLER FUNCTIONALITY
 * =============================
 * Реальные операции с данными через RH_API:
 *  - модерация офферов (admin)
 *  - управление пользователями (admin)
 *  - создание оффера (seller)
 *  - создание заявки (buyer)
 *  - персонализация кабинета по роли
 */

(function () {
  'use strict';

  if (!window.RH_API) return;
  const api = window.RH_API;

  // ============================================================
  // POPULATE ACCOUNT PAGE FROM REAL USER DATA
  // ============================================================
  async function loadAccountPage() {
    if (!document.getElementById('accName')) return; // not on account page

    try {
      const user = await api.currentUser();
      if (!user) {
        renderLoggedOutAccount();
        return;
      }

      // Fill sidebar
      const initials = (user.full_name || user.company_name || user.email || '?')
        .trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';

      const set = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
      };
      const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      set('accAvatar', initials);
      setText('accName', user.full_name || 'Пользователь');
      setText('accCompany', user.company_name || user.email || '');

      const balance = api.formatRub(user.balance_kopecks || 0);
      set('accBalance', balance.replace(' ₽', '<small>₽</small>'));

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
          roleEl.style.background = 'var(--brand-soft)';
          roleEl.style.color = '#3D5C19';
        }
      }

      // Greeting
      const firstName = (user.full_name || 'пользователь').split(' ')[0];
      const greetEl = document.getElementById('accGreeting');
      if (greetEl) {
        greetEl.textContent = user.role === 'admin'
          ? `Админ-панель, ${firstName} 👑`
          : `Здравствуйте, ${firstName} 👋`;
      }
      const subEl = document.getElementById('accSubtitle');
      if (subEl) {
        if (user.role === 'admin') {
          subEl.textContent = 'Полный контроль платформы: модерация, пользователи, сделки, аналитика.';
        } else if (user.role === 'seller') {
          subEl.textContent = 'Управляйте офферами и откликайтесь на заявки покупателей.';
        } else {
          subEl.textContent = 'Найдите поставщика в каталоге или разместите заявку — мы поможем со сделкой.';
        }
      }

      // Avatar background per role
      const avEl = document.getElementById('accAvatar');
      if (avEl) {
        if (user.role === 'admin') {
          avEl.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
        } else if (user.role === 'seller') {
          avEl.style.background = 'linear-gradient(135deg, #F5A623, #D97706)';
        }
      }

      // Show admin panel only for admin
      if (user.role === 'admin') {
        const panel = document.getElementById('adminPanel');
        if (panel) panel.style.display = '';
        await loadAdminPanel();
      }

      // Show seller offers panel
      if (user.role === 'seller' || user.role === 'admin') {
        const panel = document.getElementById('myOffersPanel');
        if (panel) panel.style.display = '';
        await loadMyOffers(user);
      }

      // Wire up buttons
      wireUpAccountButtons(user);

      // Load real data
      await Promise.all([
        loadUserDeals(user),
        loadUserRequests(user),
        loadUserKpis(user)
      ]);

    } catch (err) {
      console.error('[Account] Load failed:', err);
    }
  }

  function renderLoggedOutAccount() {
    const main = document.querySelector('.account-main');
    const aside = document.querySelector('.account-aside');
    if (aside) aside.style.display = 'none';
    if (main) {
      main.innerHTML = `
        <div class="account-panel" style="text-align:center;padding:60px 20px;max-width:520px;margin:0 auto">
          <div style="font-size:48px;margin-bottom:14px">🔒</div>
          <h2 style="font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px">Войдите в аккаунт</h2>
          <p style="color:var(--slate-500);margin:0 auto 24px;max-width:400px">Чтобы пользоваться кабинетом — войдите или создайте аккаунт. У вас будет доступ к сделкам, заявкам, истории платежей и сделок.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary btn-lg" data-open="login">Войти</button>
            <a class="btn btn-outline btn-lg" href="/index.html">На главную</a>
          </div>
        </div>
      `;
      const openBtn = main.querySelector('[data-open="login"]');
      if (openBtn) {
        openBtn.addEventListener('click', () => {
          const bd = document.getElementById('loginBackdrop');
          const modal = document.getElementById('loginModal');
          if (bd) bd.classList.add('on');
          if (modal) modal.classList.add('on');
          // Switch to signin tab
          const tab = document.querySelector('.login-tab[data-tab="signin"]');
          if (tab) tab.click();
        });
      }
    }
  }

  function wireUpAccountButtons(user) {
    // Create request button
    const reqBtn = document.getElementById('createRequestBtn');
    if (reqBtn) {
      reqBtn.onclick = () => openCreateRequestModal(user);
    }
    // Create offer buttons
    const offerBtn = document.getElementById('createOfferBtn2');
    if (offerBtn) {
      offerBtn.onclick = openCreateOfferModal;
    }

    // Sidebar navigation
    document.querySelectorAll('.account-nav a').forEach(link => {
      const label = link.querySelector('span')?.textContent?.trim().toLowerCase() || '';
      link.addEventListener('click', e => {
        e.preventDefault();
        // Highlight active link
        document.querySelectorAll('.account-nav a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        if (label.includes('история')) {
          const el = document.getElementById('historyDealsList');
          if (el) el.closest('.account-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (label.includes('профиль')) {
          openProfileModal(user);
        } else if (label.includes('сделки')) {
          const el = document.getElementById('activeDealsList');
          if (el) el.closest('.account-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (label.includes('заявки')) {
          const el = document.getElementById('openRequestsList');
          if (el) el.closest('.account-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (label.includes('платежи')) {
          showToast('Раздел платежей скоро будет доступен');
        } else if (label.includes('настройки')) {
          showToast('Настройки скоро будут доступны');
        } else if (label.includes('чаты')) {
          showToast('Чаты скоро будут доступны');
        } else if (label.includes('избранное')) {
          showToast('Избранное скоро будет доступно');
        } else if (label.includes('обзор')) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  // Profile edit modal
  async function openProfileModal(user) {
    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:520px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:20px;font-weight:700">Профиль компании</h2>
        </div>
        <form id="profileForm" style="padding:20px 28px;flex:1;overflow-y:auto">
          <div class="form-group">
            <label>ФИО</label>
            <input name="full_name" value="${escapeHtml(user.full_name || '')}" />
          </div>
          <div class="form-group">
            <label>Название компании</label>
            <input name="company_name" value="${escapeHtml(user.company_name || '')}" />
          </div>
          <div class="form-group">
            <label>ИНН</label>
            <input name="inn" value="${escapeHtml(user.inn || '')}" />
          </div>
          <div class="form-group">
            <label>ОГРН</label>
            <input name="ogrn" value="${escapeHtml(user.ogrn || '')}" />
          </div>
          <div class="form-group">
            <label>Телефон</label>
            <input name="phone" value="${escapeHtml(user.phone || '')}" />
          </div>
          <div class="form-group">
            <label>Регион</label>
            <input name="region" value="${escapeHtml(user.region || '')}" />
          </div>
          <div class="form-group">
            <label>Город</label>
            <input name="city" list="rhCityList" value="${escapeHtml(user.city || '')}" />
          </div>
          <div class="form-group">
            <label>О компании</label>
            <textarea name="bio" rows="3" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical">${escapeHtml(user.bio || '')}</textarea>
          </div>
          <div id="profileError" style="color:var(--red);font-size:13px;display:none"></div>
        </form>
        <div style="padding:16px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close">Отмена</button>
          <button class="btn btn-primary" id="profileSubmit">Сохранить</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    wrap.querySelector('#profileSubmit').addEventListener('click', async () => {
      const fd = new FormData(wrap.querySelector('#profileForm'));
      const submit = wrap.querySelector('#profileSubmit');
      const errEl = wrap.querySelector('#profileError');
      submit.disabled = true;
      submit.textContent = 'Сохраняем...';
      try {
        await api.updateProfile({
          full_name: fd.get('full_name')?.trim() || null,
          company_name: fd.get('company_name')?.trim() || null,
          inn: fd.get('inn')?.trim() || null,
          ogrn: fd.get('ogrn')?.trim() || null,
          phone: fd.get('phone')?.trim() || null,
          region: fd.get('region')?.trim() || null,
          city: fd.get('city')?.trim() || null,
          bio: fd.get('bio')?.trim() || null
        });
        wrap.remove();
        showToast('✓ Профиль обновлён');
        setTimeout(() => location.reload(), 800);
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Сохранить';
      }
    });
  }

  async function loadUserKpis(user) {
    try {
      const deals = await api.listMyDeals();
      const active = deals.filter(d => ['pending','paid','shipping'].includes(d.status)).length;
      const pending = deals.filter(d => d.status === 'pending').length;
      const completed = deals.filter(d => d.status === 'completed').length;
      const turnoverK = deals
        .filter(d => d.status === 'completed')
        .reduce((s, d) => s + (d.grand_total_kopecks || 0), 0);

      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

      set('userActiveDeals', active);
      set('userPendingDeals', pending);
      set('userCompletedDeals', completed);

      // Hide hints when 0
      if (active === 0) document.getElementById('userActiveDealsHint')?.style.setProperty('opacity', '.4');
      else { const h = document.getElementById('userActiveDealsHint'); if (h) { h.textContent = 'в работе'; h.style.opacity = '1'; } }
      if (pending === 0) document.getElementById('userPendingDealsHint')?.style.setProperty('opacity', '.4');

      // Turnover
      const turnover_rub = turnoverK / 100;
      let turnover_display;
      if (turnover_rub === 0) {
        turnover_display = `0 <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">₽</small>`;
      } else if (turnover_rub >= 1_000_000) {
        turnover_display = `${(turnover_rub / 1_000_000).toFixed(1)} <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">млн ₽</small>`;
      } else if (turnover_rub >= 1_000) {
        turnover_display = `${(turnover_rub / 1_000).toFixed(0)} <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">тыс ₽</small>`;
      } else {
        turnover_display = `${Math.round(turnover_rub).toLocaleString('ru-RU')} <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">₽</small>`;
      }
      setHTML('userTurnover', turnover_display);

      // Update sidebar counts
      set('sideDeals', deals.length);

      // Requests count
      try {
        const requests = await api.myRequests();
        set('sideRequests', requests.length);
      } catch(e) {}

      // Favorites count
      try {
        const favs = await api.myFavorites();
        set('sideFavorites', favs.length);
      } catch(e) {}

      // Hide zeros
      ['sideDeals','sideRequests','sideChats','sideFavorites'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.textContent === '0') el.style.opacity = '.3';
        else if (el) el.style.opacity = '1';
      });

    } catch(e) {
      console.warn('[KPIs]', e);
    }
  }

  async function loadUserDeals(user) {
    const list = document.getElementById('activeDealsList');
    if (!list) return;
    try {
      const deals = await api.listMyDeals();
      const active = deals.filter(d => ['pending','paid','shipping','delivered'].includes(d.status));
      const history = deals.filter(d => ['completed','cancelled','disputed'].includes(d.status));

      if (active.length === 0) {
        // Keep empty-state already in HTML
      } else {
        list.innerHTML = active.slice(0, 10).map(d => renderDealRow(d, user)).join('');
      }

      // History
      const histList = document.getElementById('historyDealsList');
      if (histList && history.length > 0) {
        histList.innerHTML = history.slice(0, 10).map(d => renderDealRow(d, user, true)).join('');
      }
    } catch(e) {
      console.warn('[Deals]', e);
    }
  }

  function renderDealRow(d, user, isHistory = false) {
    const isBuyer = d.buyer_id === user.id;
    const counterparty = isBuyer ? d.seller : d.buyer;
    const statusLabel = ({
      pending: 'Ожидает', paid: 'Оплачено', shipping: 'В пути',
      delivered: 'Доставлено', completed: 'Завершена',
      cancelled: 'Отменена', disputed: 'Спор'
    })[d.status] || d.status;
    const statusCls = ['paid','shipping','delivered'].includes(d.status) ? 'active'
      : d.status === 'pending' ? 'pending'
      : d.status === 'completed' ? 'done'
      : 'cancelled';
    return `
      <div class="deal-row">
        <div class="deal-status ${statusCls}">${d.crop?.emoji || '📦'}</div>
        <div class="deal-info">
          <div class="title">${escapeHtml(d.crop?.name || 'Товар')} · ${d.volume_tons} т</div>
          <div class="meta">
            <span>Сделка ${d.deal_number}</span>
            <span class="dot">·</span>
            <span>${escapeHtml(counterparty?.company_name || counterparty?.full_name || 'Контрагент')}</span>
          </div>
        </div>
        <div class="deal-price">${api.formatRub(d.grand_total_kopecks)}<small>${isBuyer ? 'покупка' : 'продажа'}</small></div>
        <span class="deal-label ${statusCls}">${statusLabel}</span>
        <div class="deal-actions">
          <button class="btn btn-outline btn-sm" disabled style="opacity:.5">Открыть</button>
        </div>
      </div>
    `;
  }

  async function loadUserRequests(user) {
    const list = document.getElementById('openRequestsList');
    if (!list) return;
    try {
      const requests = await api.myRequests();
      if (!requests.length) return; // keep empty state

      list.innerHTML = requests.slice(0, 10).map(r => `
        <div class="deal-row">
          <div class="deal-status pending">💬</div>
          <div class="deal-info">
            <div class="title">${escapeHtml(r.crop?.name || r.title || 'Заявка')} · ${r.volume_tons || '?'} т</div>
            <div class="meta">
              <span>Заявка от ${new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
              ${r.target_price_kopecks ? `<span class="dot">·</span><span>цена ${api.formatRub(r.target_price_kopecks)}/т</span>` : ''}
            </div>
          </div>
          <div class="deal-price">${r.responses_count || 0} <small>откликов</small></div>
          <span class="deal-label ${r.status === 'open' ? 'pending' : 'done'}">${r.status === 'open' ? 'Активна' : 'Закрыта'}</span>
          <div class="deal-actions">
            <button class="btn btn-outline btn-sm" disabled style="opacity:.5">Открыть</button>
          </div>
        </div>
      `).join('');
    } catch(e) {
      console.warn('[Requests]', e);
    }
  }

  async function loadMyOffers(user) {
    const list = document.getElementById('myOffersList');
    if (!list) return;
    try {
      const offers = await api.myOffers();
      if (!offers.length) return; // keep empty state

      list.innerHTML = offers.slice(0, 10).map(o => {
        const statusLabel = ({
          draft: 'Черновик', pending: 'На модерации', active: 'Опубликован',
          sold: 'Продан', archived: 'Архив', rejected: 'Отклонён'
        })[o.status] || o.status;
        const statusCls = o.status === 'active' ? 'active'
          : o.status === 'pending' ? 'pending'
          : o.status === 'rejected' ? 'cancelled'
          : 'done';
        return `
          <div class="deal-row">
            <div class="deal-status ${statusCls}">${o.crop?.emoji || '📦'}</div>
            <div class="deal-info">
              <div class="title">${escapeHtml(o.title)} · ${o.volume_tons} т</div>
              <div class="meta">
                <span>${escapeHtml(o.region)}</span>
                <span class="dot">·</span>
                <span>${api.formatRub(o.price_kopecks)}/т</span>
              </div>
            </div>
            <div class="deal-price">${o.views_count || 0} <small>просмотров</small></div>
            <span class="deal-label ${statusCls}">${statusLabel}</span>
            <div class="deal-actions">
              <button class="btn btn-outline btn-sm" data-action="edit-my-offer" data-offer-id="${o.id}">Изменить</button>
            </div>
          </div>
        `;
      }).join('');

      // Wire edit buttons
      list.querySelectorAll('[data-action="edit-my-offer"]').forEach(btn => {
        btn.addEventListener('click', () => {
          openEditOfferModal(btn.dataset.offerId, async () => {
            // Refresh the offers list after editing
            await loadMyOffers(user);
            showToast('✓ Оффер обновлён');
          });
        });
      });
    } catch(e) {
      console.warn('[MyOffers]', e);
    }
  }

  // ============================================================
  // CREATE REQUEST MODAL — for buyers
  // ============================================================
  async function openCreateRequestModal(user) {
    const crops = await api.listCrops().catch(() => []);
    const html = `
      <div class="modal-backdrop on" id="creqBackdrop"></div>
      <div class="modal on" id="creqModal" style="max-width:540px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close" id="creqClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Создать заявку на закупку</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Поставщики увидят заявку и смогут предложить вам свой товар.</p>
        </div>
        <form id="creqForm" style="overflow-y:auto;padding:20px 28px;flex:1">
          <div class="form-group">
            <label>Культура <span class="req">*</span></label>
            <select name="crop_id" required style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
              <option value="">— выберите —</option>
              ${crops.map(c => `<option value="${c.id}">${c.emoji || ''} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Объём, т <span class="req">*</span></label>
              <input name="volume_tons" type="number" min="0" step="1" required placeholder="100" />
            </div>
            <div class="form-group">
              <label>Целевая цена, ₽/т</label>
              <input name="target_price" type="number" min="0" step="100" placeholder="14000" />
            </div>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>НДС</label>
              <select name="vat" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
                <option value="with_vat_10">с НДС 10%</option>
                <option value="with_vat_20">с НДС 20%</option>
                <option value="with_vat_5">с НДС 5%</option>
                <option value="with_vat_7">с НДС 7%</option>
                <option value="with_vat_22">с НДС 22%</option>
                <option value="without_vat">без НДС</option>
              </select>
            </div>
            <div class="form-group">
              <label>Нужно к дате</label>
              <input name="needed_by" type="date" />
            </div>
          </div>
          <div class="form-group">
            <label>Регион доставки <span class="req">*</span></label>
            <input name="delivery_region" required placeholder="Нижегородская область" value="Нижегородская область" />
          </div>
          <div class="form-group">
            <label>Город</label>
            <input name="delivery_city" list="rhCityList" placeholder="Нижний Новгород" />
          </div>
          <div class="form-group">
            <label>Описание</label>
            <textarea name="description" rows="3" placeholder="Дополнительные требования к качеству, доставке..." style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical"></textarea>
          </div>
          <div id="creqError" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></div>
        </form>
        <div style="padding:18px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close" id="creqCancel">Отмена</button>
          <button class="btn btn-primary" id="creqSubmit">Опубликовать</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);


    wrap.querySelector('#creqSubmit').addEventListener('click', async () => {
      const form = wrap.querySelector('#creqForm');
      const errEl = wrap.querySelector('#creqError');
      errEl.style.display = 'none';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd);

      // Find crop name for title
      const crop = crops.find(c => c.id === payload.crop_id);
      payload.title = crop?.name || 'Заявка на закупку';

      const submit = wrap.querySelector('#creqSubmit');
      submit.disabled = true;
      submit.textContent = 'Сохраняем...';

      try {
        await api.createRequest(payload);
        close();
        showToast('✓ Заявка опубликована');
        setTimeout(() => loadUserRequests(user), 500);
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Опубликовать';
      }
    });
  }

  // ============================================================
  // ADMIN PANEL — load real platform stats
  // ============================================================
  async function loadAdminPanel() {
    try {
      const stats = await api.adminStats();
      const panel = document.getElementById('adminPanel');
      if (!panel) return;

      const statValues = panel.querySelectorAll('.account-stat .v');
      // Order in HTML: users / pending / escrow deals / turnover
      if (statValues[0]) statValues[0].textContent = (stats.users_count || 0).toLocaleString('ru-RU');
      if (statValues[1]) statValues[1].textContent = stats.pending_offers || 0;
      if (statValues[2]) statValues[2].textContent = stats.escrow_deals || 0;
      if (statValues[3]) {
        const mln = (stats.total_turnover_kopecks / 100 / 1_000_000).toFixed(1);
        statValues[3].innerHTML = `${mln} <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">млн ₽</small>`;
      }

      // Update deltas
      const deltas = panel.querySelectorAll('.account-stat .d');
      if (deltas[2]) {
        const escrowM = (stats.escrow_amount_kopecks / 100 / 1_000_000).toFixed(1);
        deltas[2].innerHTML = `↑ ${escrowM} млн ₽ в работе`;
      }

      // Wire all action buttons in admin panel
      const allButtons = panel.querySelectorAll('a');
      allButtons.forEach(b => {
        const text = b.textContent.toLowerCase();
        if (text.includes('модерация') || text.includes('офферов')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openModerationModal(); });
        } else if (text.includes('пользователи')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openUsersModal(); });
        } else if (text.includes('настройки')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openFeatureFlagsModal(); });
        } else if (text.includes('все сделки')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openDealsModal(); });
        } else if (text.includes('все заявки')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openRequestsModal(); });
        } else if (text.includes('споры') || text.includes('жалобы')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openDealsModal('disputed'); });
        } else if (text.includes('аналитика')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openAnalyticsModal(); });
        }
      });
    } catch(err) {
      console.error('[Admin] Stats load failed:', err);
    }
  }

  // ============================================================
  // FEATURE FLAGS MODAL — admin can toggle Auctions/Prices/etc
  // ============================================================
  async function openFeatureFlagsModal() {
    const flags = await api.getFeatureFlags();
    const features = [
      { key: 'auctions',  label: 'Раздел «Аукцион»',     desc: 'Живые торги с таймерами и ставками' },
      { key: 'prices',    label: 'Биржа котировок',       desc: 'Раздел с ценами рынка в реальном времени' },
      { key: 'realtime',  label: 'Real-time уведомления', desc: 'Push-обновления через WebSocket' },
      { key: 'messaging', label: 'Чаты по сделкам',       desc: 'Внутренние сообщения между сторонами' }
    ];

    const html = `
      <div class="modal-backdrop on" id="ffBackdrop"></div>
      <div class="modal on" id="ffModal" style="max-width:560px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close" id="ffClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Настройки платформы</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Включайте и отключайте разделы для всех пользователей.</p>
        </div>
        <div style="overflow-y:auto;padding:20px 28px;flex:1;display:flex;flex-direction:column;gap:14px">
          ${features.map(f => `
            <label style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:var(--slate-50);border-radius:12px;cursor:pointer">
              <input type="checkbox" data-feature-key="${f.key}" ${flags[f.key] ? 'checked' : ''} style="margin-top:3px;width:18px;height:18px;accent-color:#97C524;cursor:pointer">
              <div style="flex:1">
                <div style="font-weight:600;color:var(--ink);font-size:14.5px">${f.label}</div>
                <div style="font-size:12.5px;color:var(--slate-500);margin-top:4px">${f.desc}</div>
              </div>
              <span class="ff-status" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;${flags[f.key] ? 'background:var(--brand-soft);color:#3D5C19' : 'background:var(--slate-100);color:var(--slate-500)'}">${flags[f.key] ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </label>
          `).join('')}
          <div id="ffStatus" style="font-size:13px;color:var(--slate-500);padding:8px 0"></div>
        </div>
      </div>
    `;
    const wrap = openModal(html);


    wrap.querySelectorAll('[data-feature-key]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const key = cb.dataset.featureKey;
        const status = wrap.querySelector('#ffStatus');
        status.textContent = 'Сохраняем…';
        try {
          await api.adminToggleFeature(key, cb.checked);
          // Update visual badge
          const badge = cb.closest('label').querySelector('.ff-status');
          if (cb.checked) {
            badge.textContent = 'ВКЛ';
            badge.style.background = 'var(--brand-soft)';
            badge.style.color = '#3D5C19';
          } else {
            badge.textContent = 'ВЫКЛ';
            badge.style.background = 'var(--slate-100)';
            badge.style.color = 'var(--slate-500)';
          }
          status.textContent = '✓ Сохранено. Изменения применятся на странице через 5 секунд.';
          status.style.color = 'var(--brand-dark)';
          // Apply to current page
          await api.applyFeatureFlags();
        } catch(err) {
          cb.checked = !cb.checked;
          status.textContent = '⚠ ' + err.message;
          status.style.color = 'var(--red)';
        }
      });
    });
  }

  // ============================================================
  // OFFERS MODAL — full CRUD, filter by status
  // ============================================================
  async function openModerationModal() {
    const html = `
      <div class="modal-backdrop on" id="modBackdrop"></div>
      <div class="modal on" id="modModal" style="max-width:920px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close" id="modClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700;color:var(--ink)">Управление офферами</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Просмотр всех офферов на платформе с возможностью изменения статуса и удаления.</p>
          <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap" id="modFilters">
            <button class="ff-tab active" data-status="">Все</button>
            <button class="ff-tab" data-status="pending">⏳ На модерации</button>
            <button class="ff-tab" data-status="active">✓ Активные</button>
            <button class="ff-tab" data-status="rejected">✕ Отклонённые</button>
            <button class="ff-tab" data-status="sold">💰 Проданные</button>
            <button class="ff-tab" data-status="archived">📦 Архив</button>
          </div>
        </div>
        <div id="modList" style="overflow-y:auto;padding:20px 28px;flex:1">
          <div style="text-align:center;padding:40px;color:var(--slate-500)">Загружаем...</div>
        </div>
      </div>
    `;
    const wrap = openModal(html);


    let currentStatus = '';

    async function loadList() {
      const list = wrap.querySelector('#modList');
      list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">Загружаем...</div>';
      try {
        const offers = await api.adminListAllOffers(currentStatus || null);
        if (!offers.length) {
          list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">Нет офферов в этой категории.</div>';
          return;
        }
        list.innerHTML = offers.map(o => renderOfferAdminRow(o)).join('');
        wireOfferRowActions(list, loadList);
      } catch(err) {
        list.innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${escapeHtml(err.message)}</div>`;
      }
    }

    // Tabs
    wrap.querySelectorAll('#modFilters .ff-tab').forEach(t => {
      t.addEventListener('click', () => {
        wrap.querySelectorAll('#modFilters .ff-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        currentStatus = t.dataset.status;
        loadList();
      });
    });

    loadList();
  }

  function renderOfferAdminRow(o) {
    const statusBadge = ({
      pending:  '<span class="adm-badge pending">⏳ Модерация</span>',
      active:   '<span class="adm-badge active">✓ Активен</span>',
      sold:     '<span class="adm-badge done">💰 Продан</span>',
      archived: '<span class="adm-badge done">📦 Архив</span>',
      rejected: '<span class="adm-badge cancelled">✕ Отклонён</span>',
      draft:    '<span class="adm-badge">📝 Черновик</span>'
    })[o.status] || `<span class="adm-badge">${o.status}</span>`;

    return `
      <div class="adm-row" data-offer-id="${o.id}" data-status="${o.status}" style="cursor:pointer">
        <div class="adm-row-main" data-clickable="1">
          <div class="adm-row-title">
            ${o.crop?.emoji || '📦'} ${escapeHtml(o.title)}
            ${statusBadge}
          </div>
          <div class="adm-row-meta">
            ${api.formatRub(o.price_kopecks)}/т · ${o.volume_tons} т · ${escapeHtml(o.region)}
          </div>
          <div class="adm-row-sub">
            Продавец: <b>${escapeHtml(o.seller?.company_name || o.seller?.full_name || '—')}</b>
            ${o.seller?.inn ? ` · ИНН ${o.seller.inn}` : ''}
            ${o.seller?.email ? ` · ${o.seller.email}` : ''}
            · Создано ${new Date(o.created_at).toLocaleDateString('ru-RU')}
            · Просмотров ${o.views_count || 0}
          </div>
        </div>
        <div class="adm-row-actions" onclick="event.stopPropagation()">
          <select data-action="status" class="adm-select">
            <option value="pending" ${o.status==='pending'?'selected':''}>⏳ Модерация</option>
            <option value="active" ${o.status==='active'?'selected':''}>✓ Активен</option>
            <option value="rejected" ${o.status==='rejected'?'selected':''}>✕ Отклонён</option>
            <option value="sold" ${o.status==='sold'?'selected':''}>💰 Продан</option>
            <option value="archived" ${o.status==='archived'?'selected':''}>📦 Архив</option>
          </select>
          <button class="btn btn-outline btn-sm" data-action="edit-offer" style="font-size:11px;padding:6px 10px">✏ Изменить</button>
          <button class="btn btn-outline btn-sm" data-action="delete" style="color:var(--red);border-color:var(--red)">✕ Удалить</button>
        </div>
      </div>
    `;
  }

  function wireOfferRowActions(container, reload) {
    // Click on row body opens editor
    container.querySelectorAll('.adm-row [data-clickable="1"]').forEach(area => {
      area.addEventListener('click', () => {
        const row = area.closest('[data-offer-id]');
        openEditOfferModal(row.dataset.offerId, reload);
      });
    });

    // Explicit edit button
    container.querySelectorAll('[data-action="edit-offer"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const row = btn.closest('[data-offer-id]');
        openEditOfferModal(row.dataset.offerId, reload);
      });
    });

    container.querySelectorAll('[data-action="status"]').forEach(sel => {
      const original = sel.value;
      sel.addEventListener('change', async () => {
        const row = sel.closest('[data-offer-id]');
        const newStatus = sel.value;
        sel.disabled = true;
        try {
          await api.adminUpdateOfferStatus(row.dataset.offerId, newStatus);
          showToast(`✓ Статус изменён на «${newStatus}»`);
          row.dataset.status = newStatus;
        } catch(err) {
          alert('Ошибка: ' + err.message);
          sel.value = original;
        } finally {
          sel.disabled = false;
        }
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const row = btn.closest('[data-offer-id]');
        if (!confirm('Удалить оффер навсегда? Это действие необратимо.')) return;
        btn.disabled = true; btn.textContent = '...';
        try {
          await api.adminDeleteOffer(row.dataset.offerId);
          row.style.opacity = '0';
          setTimeout(() => row.remove(), 250);
          showToast('✓ Оффер удалён');
        } catch(err) {
          alert('Ошибка: ' + err.message);
          btn.disabled = false;
          btn.textContent = '✕ Удалить';
        }
      });
    });
  }

  // ============================================================
  // USERS MODAL — full CRUD: roles, verify, delete
  // ============================================================
  async function openUsersModal() {
    const html = `
      <div class="modal-backdrop on" id="usrBackdrop"></div>
      <div class="modal on" id="usrModal" style="max-width:1080px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close" id="usrClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Пользователи платформы</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Управление аккаунтами: смена роли, верификация, удаление.</p>
          <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap" id="usrFilters">
            <button class="ff-tab active" data-role="">Все</button>
            <button class="ff-tab" data-role="buyer">🛒 Покупатели</button>
            <button class="ff-tab" data-role="seller">🌾 Продавцы</button>
            <button class="ff-tab" data-role="admin">👑 Админы</button>
          </div>
        </div>
        <div id="usrList" style="overflow-y:auto;padding:20px 28px;flex:1">Загружаем...</div>
      </div>
    `;
    const wrap = openModal(html);

    let currentRole = '';
    const me = await api.currentUser().catch(() => null);

    async function loadList() {
      const list = wrap.querySelector('#usrList');
      list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">Загружаем...</div>';
      try {
        const users = await api.adminListUsers(currentRole || null);
        if (!users.length) {
          list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">Нет пользователей.</div>';
          return;
        }
        list.innerHTML = `
          <table class="adm-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Компания</th>
                <th>Роль</th>
                <th>Сделок</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const isMe = me && u.id === me.id;
                return `
                <tr data-user-id="${u.id}">
                  <td>
                    <div style="font-weight:600">${escapeHtml(u.full_name || '—')}</div>
                    <div style="font-size:11px;color:var(--slate-500)">${escapeHtml(u.email || u.phone || '')}</div>
                  </td>
                  <td style="font-size:12px">
                    <div>${escapeHtml(u.company_name || '—')}</div>
                    ${u.inn ? `<div style="font-family:'JetBrains Mono',monospace;color:var(--slate-500)">ИНН ${u.inn}</div>` : ''}
                  </td>
                  <td>
                    <select data-action="set-role" class="adm-select" ${isMe ? 'disabled title="Нельзя менять свою роль"' : ''}>
                      <option value="buyer"  ${u.role === 'buyer'  ? 'selected' : ''}>🛒 Покупатель</option>
                      <option value="seller" ${u.role === 'seller' ? 'selected' : ''}>🌾 Продавец</option>
                      <option value="admin"  ${u.role === 'admin'  ? 'selected' : ''}>👑 Админ</option>
                    </select>
                  </td>
                  <td style="font-family:'JetBrains Mono',monospace">${u.deals_count || 0}</td>
                  <td>
                    ${u.is_verified
                      ? '<span style="color:var(--brand-dark);font-size:12px;font-weight:600">✓ Проверен</span>'
                      : '<button class="btn btn-outline btn-sm" data-action="verify" style="font-size:11px;padding:4px 10px">Подтвердить</button>'}
                  </td>
                  <td>
                    ${isMe
                      ? '<span style="font-size:11px;color:var(--slate-400)">это вы</span>'
                      : '<button class="btn-icon-del" data-action="delete-user" title="Удалить пользователя">🗑</button>'}
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

        wireUserRowActions(list);
      } catch(err) {
        list.innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${escapeHtml(err.message)}</div>`;
      }
    }

    function wireUserRowActions(container) {
      container.querySelectorAll('[data-action="verify"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const row = btn.closest('[data-user-id]');
          btn.disabled = true; btn.textContent = '...';
          try {
            await api.adminVerifyUser(row.dataset.userId);
            btn.outerHTML = '<span style="color:var(--brand-dark);font-size:12px;font-weight:600">✓ Проверен</span>';
            showToast('✓ Пользователь подтверждён');
          } catch(err) {
            alert('Ошибка: ' + err.message);
            btn.disabled = false;
          }
        });
      });

      container.querySelectorAll('[data-action="set-role"]').forEach(sel => {
        const originalRole = sel.value;
        sel.addEventListener('change', async () => {
          const row = sel.closest('[data-user-id]');
          const newRole = sel.value;
          if (!confirm(`Изменить роль пользователя на «${newRole}»?`)) {
            sel.value = originalRole;
            return;
          }
          sel.disabled = true;
          try {
            await api.adminSetUserRole(row.dataset.userId, newRole);
            showToast(`✓ Роль изменена`);
          } catch(err) {
            alert('Ошибка: ' + err.message);
            sel.value = originalRole;
          } finally {
            sel.disabled = false;
          }
        });
      });

      container.querySelectorAll('[data-action="delete-user"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const row = btn.closest('[data-user-id]');
          if (!confirm('УДАЛИТЬ пользователя навсегда?\n\nВНИМАНИЕ: вместе с ним удалятся все его офферы, заявки и сделки.\nЭто действие необратимо.')) return;
          btn.disabled = true;
          btn.textContent = '...';
          try {
            await api.adminDeleteUser(row.dataset.userId);
            row.style.transition = 'opacity .25s, transform .25s';
            row.style.opacity = '0';
            row.style.transform = 'translateX(-20px)';
            setTimeout(() => row.remove(), 250);
            showToast('✓ Пользователь удалён');
          } catch(err) {
            alert('Ошибка: ' + err.message);
            btn.disabled = false;
            btn.textContent = '🗑';
          }
        });
      });
    }

    // Tabs
    wrap.querySelectorAll('#usrFilters .ff-tab').forEach(t => {
      t.addEventListener('click', () => {
        wrap.querySelectorAll('#usrFilters .ff-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        currentRole = t.dataset.role;
        loadList();
      });
    });

    loadList();
  }

  // ============================================================
  // DEALS MODAL — view all deals across platform
  // ============================================================
  async function openDealsModal(initialStatus = null) {
    const html = `
      <div class="modal-backdrop on" id="dlsBackdrop"></div>
      <div class="modal on" id="dlsModal" style="max-width:1080px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close" id="dlsClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">${initialStatus === 'disputed' ? 'Споры и жалобы' : 'Все сделки на платформе'}</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Полный обзор сделок с возможностью изменения статуса.</p>
          <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap" id="dlsFilters">
            <button class="ff-tab ${!initialStatus ? 'active' : ''}" data-status="">Все</button>
            <button class="ff-tab" data-status="pending">⏳ Ожидают</button>
            <button class="ff-tab" data-status="paid">💰 Оплачено</button>
            <button class="ff-tab" data-status="shipping">🚚 В пути</button>
            <button class="ff-tab" data-status="completed">✓ Завершены</button>
            <button class="ff-tab" data-status="cancelled">✕ Отменены</button>
            <button class="ff-tab ${initialStatus === 'disputed' ? 'active' : ''}" data-status="disputed">⚠ Споры</button>
          </div>
        </div>
        <div id="dlsList" style="overflow-y:auto;padding:20px 28px;flex:1">Загружаем...</div>
      </div>
    `;
    const wrap = openModal(html);


    let currentStatus = initialStatus || '';

    async function loadList() {
      const list = wrap.querySelector('#dlsList');
      list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">Загружаем...</div>';
      try {
        const deals = await api.adminListAllDeals(currentStatus || null);
        if (!deals.length) {
          list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">Нет сделок в этой категории.</div>';
          return;
        }
        list.innerHTML = `
          <table class="adm-table">
            <thead>
              <tr>
                <th>Сделка</th>
                <th>Стороны</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${deals.map(d => `
                <tr data-deal-id="${d.id}">
                  <td>
                    <div style="font-weight:600">${d.crop?.emoji || '📦'} ${escapeHtml(d.crop?.name || 'Товар')}</div>
                    <div style="font-size:11px;color:var(--slate-500)">${d.deal_number} · ${d.volume_tons} т · ${new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
                  </td>
                  <td style="font-size:12px">
                    <div>🛒 ${escapeHtml(d.buyer?.company_name || d.buyer?.full_name || '—')}</div>
                    <div>🌾 ${escapeHtml(d.seller?.company_name || d.seller?.full_name || '—')}</div>
                  </td>
                  <td style="font-family:'JetBrains Mono',monospace;font-weight:700">${api.formatRub(d.grand_total_kopecks)}</td>
                  <td>
                    <select data-action="deal-status" class="adm-select">
                      <option value="pending"   ${d.status==='pending'?'selected':''}>⏳ Ожидает</option>
                      <option value="paid"      ${d.status==='paid'?'selected':''}>💰 Оплачено</option>
                      <option value="shipping"  ${d.status==='shipping'?'selected':''}>🚚 В пути</option>
                      <option value="delivered" ${d.status==='delivered'?'selected':''}>📦 Доставлено</option>
                      <option value="completed" ${d.status==='completed'?'selected':''}>✓ Завершена</option>
                      <option value="cancelled" ${d.status==='cancelled'?'selected':''}>✕ Отменена</option>
                      <option value="disputed"  ${d.status==='disputed'?'selected':''}>⚠ Спор</option>
                    </select>
                  </td>
                  <td>
                    <button class="btn-icon-del" data-action="deal-delete" title="Удалить сделку">🗑</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        list.querySelectorAll('[data-action="deal-status"]').forEach(sel => {
          const orig = sel.value;
          sel.addEventListener('change', async () => {
            const row = sel.closest('[data-deal-id]');
            sel.disabled = true;
            try {
              await api.adminUpdateDealStatus(row.dataset.dealId, sel.value);
              showToast('✓ Статус сделки изменён');
            } catch(err) {
              alert('Ошибка: ' + err.message);
              sel.value = orig;
            } finally {
              sel.disabled = false;
            }
          });
        });

        list.querySelectorAll('[data-action="deal-delete"]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const row = btn.closest('[data-deal-id]');
            if (!confirm('Удалить сделку навсегда?')) return;
            btn.disabled = true; btn.textContent = '...';
            try {
              await api.adminDeleteDeal(row.dataset.dealId);
              row.style.opacity = '0';
              setTimeout(() => row.remove(), 250);
              showToast('✓ Сделка удалена');
            } catch(err) {
              alert('Ошибка: ' + err.message);
              btn.disabled = false;
              btn.textContent = '🗑';
            }
          });
        });
      } catch(err) {
        list.innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${escapeHtml(err.message)}</div>`;
      }
    }

    wrap.querySelectorAll('#dlsFilters .ff-tab').forEach(t => {
      t.addEventListener('click', () => {
        wrap.querySelectorAll('#dlsFilters .ff-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        currentStatus = t.dataset.status;
        loadList();
      });
    });

    loadList();
  }

  // ============================================================
  // REQUESTS MODAL — view all buyer requests
  // ============================================================
  async function openRequestsModal() {
    const html = `
      <div class="modal-backdrop on" id="rqsBackdrop"></div>
      <div class="modal on" id="rqsModal" style="max-width:1000px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close" id="rqsClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Заявки на закупку</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Все заявки покупателей с возможностью модерации.</p>
        </div>
        <div id="rqsList" style="overflow-y:auto;padding:20px 28px;flex:1">Загружаем...</div>
      </div>
    `;
    const wrap = openModal(html);


    try {
      const requests = await api.adminListAllRequests();
      const list = wrap.querySelector('#rqsList');
      if (!requests.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">Нет заявок.</div>';
        return;
      }
      list.innerHTML = `
        <table class="adm-table">
          <thead>
            <tr>
              <th>Заявка</th>
              <th>Покупатель</th>
              <th>Цена / Объём</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(r => `
              <tr data-request-id="${r.id}" style="cursor:pointer">
                <td data-action="open-details">
                  <div style="font-weight:600">${r.crop?.emoji || '📦'} ${escapeHtml(r.title || r.crop?.name || 'Заявка')}</div>
                  <div style="font-size:11px;color:var(--slate-500)">${escapeHtml(r.delivery_region)} · ${new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
                </td>
                <td style="font-size:12px">
                  <div>${escapeHtml(r.buyer?.company_name || r.buyer?.full_name || '—')}</div>
                  <div style="color:var(--slate-500)">${escapeHtml(r.buyer?.email || '')}</div>
                </td>
                <td style="font-family:'JetBrains Mono',monospace">
                  ${r.target_price_kopecks ? api.formatRub(r.target_price_kopecks) + '/т' : '—'}<br>
                  <small style="color:var(--slate-500)">${r.volume_tons} т</small>
                </td>
                <td>
                  <select data-action="req-status" class="adm-select" onclick="event.stopPropagation()">
                    <option value="open"    ${r.status==='open'?'selected':''}>🟢 Открыта</option>
                    <option value="matched" ${r.status==='matched'?'selected':''}>🤝 Матч</option>
                    <option value="closed"  ${r.status==='closed'?'selected':''}>🔒 Закрыта</option>
                    <option value="expired" ${r.status==='expired'?'selected':''}>⏱ Истекла</option>
                  </select>
                </td>
                <td onclick="event.stopPropagation()" style="white-space:nowrap">
                  <button class="btn btn-outline btn-sm" data-action="req-edit" title="Редактировать" style="font-size:11px;padding:6px 10px;margin-right:4px">✏ Изменить</button>
                  <button class="btn-icon-del" data-action="req-delete" title="Удалить заявку">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Click on row → open details/edit
      list.querySelectorAll('tr[data-request-id]').forEach(row => {
        row.addEventListener('click', e => {
          if (e.target.closest('[data-action]')) return;  // ignore if clicked on button
          if (e.target.closest('select')) return;
          openEditRequestModal(row.dataset.requestId, () => {
            // Refresh list after edit
            wrap.remove();
            openRequestsModal();
          });
        });
      });

      list.querySelectorAll('[data-action="req-edit"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const row = btn.closest('[data-request-id]');
          openEditRequestModal(row.dataset.requestId, () => {
            wrap.remove();
            openRequestsModal();
          });
        });
      });

      list.querySelectorAll('[data-action="req-status"]').forEach(sel => {
        const orig = sel.value;
        sel.addEventListener('change', async (e) => {
          e.stopPropagation();
          const row = sel.closest('[data-request-id]');
          sel.disabled = true;
          try {
            await api.adminUpdateRequestStatus(row.dataset.requestId, sel.value);
            showToast('✓ Статус заявки изменён');
          } catch(err) {
            alert('Ошибка: ' + err.message);
            sel.value = orig;
          } finally {
            sel.disabled = false;
          }
        });
      });

      list.querySelectorAll('[data-action="req-delete"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const row = btn.closest('[data-request-id]');
          if (!confirm('Удалить заявку?')) return;
          btn.disabled = true; btn.textContent = '...';
          try {
            await api.adminDeleteRequest(row.dataset.requestId);
            row.style.opacity = '0';
            setTimeout(() => row.remove(), 250);
            showToast('✓ Заявка удалена');
          } catch(err) {
            alert('Ошибка: ' + err.message);
            btn.disabled = false;
            btn.textContent = '🗑';
          }
        });
      });
    } catch(err) {
      wrap.querySelector('#rqsList').innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ============================================================
  // EDIT OFFER MODAL — admin can edit ALL offer fields
  // ============================================================
  async function openEditOfferModal(offerId, onSaved) {
    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:600px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Редактирование оффера</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px;font-family:'JetBrains Mono',monospace">ID ${offerId.slice(0,8)}…</p>
        </div>
        <div id="editOfferBody" style="overflow-y:auto;padding:20px 28px;flex:1">Загружаем...</div>
        <div id="editOfferFooter" style="padding:18px 28px;border-top:1px solid var(--slate-100);display:none;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close">Отмена</button>
          <button class="btn btn-primary" id="editOfferSubmit">Сохранить</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    try {
      const [offer, crops] = await Promise.all([
        api.adminGetOffer(offerId),
        api.listCrops()
      ]);

      // Build quality fields editor
      const qEntries = Object.entries(offer.quality || {});
      const qHtml = qEntries.map((entry, i) => `
        <div class="qrow" style="display:grid;grid-template-columns:1fr 1fr 36px;gap:8px;margin-top:6px">
          <input data-q-key="${i}" placeholder="Параметр" value="${escapeHtml(entry[0])}" />
          <input data-q-val="${i}" placeholder="Значение" value="${escapeHtml(entry[1])}" />
          <button type="button" class="btn-icon-del" data-q-remove="${i}">🗑</button>
        </div>
      `).join('');

      const body = wrap.querySelector('#editOfferBody');
      body.innerHTML = `
        <form id="editOfferForm">
          <!-- Продавец (read-only) -->
          <div style="background:var(--slate-50);padding:14px 16px;border-radius:12px;margin-bottom:16px">
            <div style="font-size:11px;color:var(--slate-500);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:6px">Продавец</div>
            <div style="font-weight:600;color:var(--ink)">${escapeHtml(offer.seller?.company_name || offer.seller?.full_name || '—')}</div>
            <div style="font-size:12px;color:var(--slate-500);margin-top:2px">
              ${escapeHtml(offer.seller?.email || '')} · ИНН ${escapeHtml(offer.seller?.inn || '—')}
            </div>
          </div>

          <div class="form-group">
            <label>Заголовок *</label>
            <input name="title" required value="${escapeHtml(offer.title || '')}" />
          </div>
          <div class="form-group">
            <label>Культура *</label>
            <select name="crop_id" required style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
              ${crops.map(c => `<option value="${c.id}" ${c.id === offer.crop_id ? 'selected' : ''}>${c.emoji || ''} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Цена за тонну, ₽ *</label>
              <input name="price_per_ton" type="number" min="0" step="100" required value="${offer.price_kopecks ? offer.price_kopecks/100 : ''}" />
            </div>
            <div class="form-group">
              <label>Объём, т *</label>
              <input name="volume_tons" type="number" min="0" step="0.1" required value="${offer.volume_tons}" />
            </div>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>НДС</label>
              <select name="vat" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
                <option value="with_vat_10" ${offer.vat === 'with_vat_10' ? 'selected' : ''}>с НДС 10%</option>
                <option value="with_vat_20" ${offer.vat === 'with_vat_20' ? 'selected' : ''}>с НДС 20%</option>
                <option value="with_vat_5" ${offer.vat === 'with_vat_5' ? 'selected' : ''}>с НДС 5%</option>
                <option value="with_vat_7" ${offer.vat === 'with_vat_7' ? 'selected' : ''}>с НДС 7%</option>
                <option value="with_vat_22" ${offer.vat === 'with_vat_22' ? 'selected' : ''}>с НДС 22%</option>
                <option value="without_vat" ${offer.vat === 'without_vat' ? 'selected' : ''}>без НДС</option>
              </select>
            </div>
            <div class="form-group">
              <label>Год урожая</label>
              <input name="harvest_year" type="number" min="2020" max="2030" value="${offer.harvest_year || 2025}" />
            </div>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Регион *</label>
              <input name="region" required value="${escapeHtml(offer.region || '')}" />
            </div>
            <div class="form-group">
              <label>Город склада</label>
              <input name="city" list="rhCityList" value="${escapeHtml(offer.city || '')}" />
            </div>
          </div>
          <div class="form-group">
            <label>Адрес склада</label>
            <input name="warehouse_address" value="${escapeHtml(offer.warehouse_address || '')}" placeholder="Полный адрес" />
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">
              <input type="checkbox" name="has_delivery" ${offer.has_delivery ? 'checked' : ''} /> Возможна доставка
            </label>
          </div>
          <div class="form-group">
            <label>Стоимость доставки за тонну, ₽</label>
            <input name="delivery_price" type="number" min="0" step="50" value="${offer.delivery_price_per_ton_kopecks ? offer.delivery_price_per_ton_kopecks/100 : ''}" placeholder="0 = бесплатно" />
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">
              <input type="checkbox" name="has_lab_analysis" ${offer.has_lab_analysis ? 'checked' : ''} /> Есть лабораторный анализ
            </label>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Бейдж</label>
              <input name="badge" value="${escapeHtml(offer.badge || '')}" placeholder="Хит, Премиум, Горячее..." />
            </div>
            <div class="form-group">
              <label>Статус</label>
              <select name="status" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
                <option value="draft" ${offer.status === 'draft' ? 'selected' : ''}>📝 Черновик</option>
                <option value="pending" ${offer.status === 'pending' ? 'selected' : ''}>⏳ Модерация</option>
                <option value="active" ${offer.status === 'active' ? 'selected' : ''}>✓ Активен</option>
                <option value="sold" ${offer.status === 'sold' ? 'selected' : ''}>💰 Продан</option>
                <option value="archived" ${offer.status === 'archived' ? 'selected' : ''}>📦 Архив</option>
                <option value="rejected" ${offer.status === 'rejected' ? 'selected' : ''}>✕ Отклонён</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label style="display:flex;justify-content:space-between;align-items:center">
              <span>Показатели качества</span>
              <button type="button" class="btn btn-outline btn-sm" id="addQRow" style="font-size:11px;padding:4px 10px">+ Добавить</button>
            </label>
            <div id="qRows">${qHtml}</div>
          </div>

          <div class="form-group">
            <label>Описание</label>
            <textarea name="description" rows="3" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical">${escapeHtml(offer.description || '')}</textarea>
          </div>

          <div class="form-group">
            <label>Просмотры (ручной ввод)</label>
            <input name="views_count" type="number" min="0" value="${offer.views_count || 0}" />
          </div>

          <div id="editOfferError" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></div>
          <div style="font-size:11px;color:var(--slate-400);margin-top:14px">
            Создано: ${new Date(offer.created_at).toLocaleString('ru-RU')} ·
            Обновлено: ${new Date(offer.updated_at).toLocaleString('ru-RU')}
          </div>
        </form>
      `;

      wrap.querySelector('#editOfferFooter').style.display = 'flex';

      // Quality fields management
      let qIndex = qEntries.length;
      const qRows = wrap.querySelector('#qRows');
      const addQ = wrap.querySelector('#addQRow');
      addQ.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'qrow';
        div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 36px;gap:8px;margin-top:6px';
        div.innerHTML = `
          <input data-q-key="${qIndex}" placeholder="Параметр" />
          <input data-q-val="${qIndex}" placeholder="Значение" />
          <button type="button" class="btn-icon-del" data-q-remove="${qIndex}">🗑</button>
        `;
        qRows.appendChild(div);
        qIndex++;
        wireQRemove();
      });
      function wireQRemove() {
        qRows.querySelectorAll('[data-q-remove]').forEach(btn => {
          btn.onclick = () => btn.closest('.qrow').remove();
        });
      }
      wireQRemove();

      // Submit handler
      wrap.querySelector('#editOfferSubmit').addEventListener('click', async () => {
        const form = wrap.querySelector('#editOfferForm');
        const errEl = wrap.querySelector('#editOfferError');
        errEl.style.display = 'none';

        const fd = new FormData(form);

        // Collect quality
        const quality = {};
        qRows.querySelectorAll('.qrow').forEach(row => {
          const k = row.querySelector('[data-q-key]')?.value.trim();
          const v = row.querySelector('[data-q-val]')?.value.trim();
          if (k && v) quality[k] = v;
        });

        const payload = {
          title: fd.get('title')?.trim(),
          crop_id: fd.get('crop_id'),
          price_per_ton: fd.get('price_per_ton'),
          volume_tons: fd.get('volume_tons'),
          vat: fd.get('vat'),
          harvest_year: fd.get('harvest_year'),
          region: fd.get('region')?.trim(),
          city: fd.get('city')?.trim() || null,
          warehouse_address: fd.get('warehouse_address')?.trim() || null,
          has_delivery: !!fd.get('has_delivery'),
          delivery_price_per_ton_kopecks: fd.get('delivery_price')
            ? Math.round(parseFloat(fd.get('delivery_price')) * 100)
            : 0,
          has_lab_analysis: !!fd.get('has_lab_analysis'),
          badge: fd.get('badge')?.trim() || null,
          status: fd.get('status'),
          quality,
          description: fd.get('description')?.trim() || null,
          views_count: parseInt(fd.get('views_count') || '0') || 0
        };

        const submit = wrap.querySelector('#editOfferSubmit');
        submit.disabled = true;
        submit.textContent = 'Сохраняем...';

        try {
          await api.adminUpdateOffer(offerId, payload);
          wrap.remove();
          showToast('✓ Оффер обновлён');
          if (onSaved) onSaved();
        } catch(err) {
          errEl.textContent = err.message;
          errEl.style.display = '';
          submit.disabled = false;
          submit.textContent = 'Сохранить';
        }
      });
    } catch(err) {
      wrap.querySelector('#editOfferBody').innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ============================================================
  // EDIT REQUEST MODAL — admin can edit ALL fields
  // ============================================================
  async function openEditRequestModal(requestId, onSaved) {
    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:560px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Редактирование заявки</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px;font-family:'JetBrains Mono',monospace">ID ${requestId.slice(0,8)}…</p>
        </div>
        <div id="editReqBody" style="overflow-y:auto;padding:20px 28px;flex:1">Загружаем...</div>
        <div id="editReqFooter" style="padding:18px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end;display:none">
          <button class="btn btn-outline" data-action="cancel">Отмена</button>
          <button class="btn btn-primary" id="editReqSubmit">Сохранить</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    try {
      const [request, crops] = await Promise.all([
        api.adminGetRequest(requestId),
        api.listCrops()
      ]);

      const body = wrap.querySelector('#editReqBody');
      body.innerHTML = `
        <form id="editReqForm">
          <!-- Заявитель (read-only) -->
          <div style="background:var(--slate-50);padding:14px 16px;border-radius:12px;margin-bottom:16px">
            <div style="font-size:11px;color:var(--slate-500);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:6px">Покупатель</div>
            <div style="font-weight:600;color:var(--ink)">${escapeHtml(request.buyer?.company_name || request.buyer?.full_name || '—')}</div>
            <div style="font-size:12px;color:var(--slate-500);margin-top:2px">
              ${escapeHtml(request.buyer?.email || '')} · ИНН ${escapeHtml(request.buyer?.inn || '—')}
            </div>
          </div>

          <div class="form-group">
            <label>Заголовок заявки</label>
            <input name="title" required value="${escapeHtml(request.title || '')}" />
          </div>
          <div class="form-group">
            <label>Культура</label>
            <select name="crop_id" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
              <option value="">— любая —</option>
              ${crops.map(c => `<option value="${c.id}" ${c.id === request.crop_id ? 'selected' : ''}>${c.emoji || ''} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Объём, т *</label>
              <input name="volume_tons" type="number" min="0" step="1" required value="${request.volume_tons}" />
            </div>
            <div class="form-group">
              <label>Целевая цена, ₽/т</label>
              <input name="target_price" type="number" min="0" step="100" value="${request.target_price_kopecks ? request.target_price_kopecks/100 : ''}" placeholder="—" />
            </div>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>НДС</label>
              <select name="vat" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
                <option value="with_vat_10" ${request.vat === 'with_vat_10' ? 'selected' : ''}>с НДС 10%</option>
                <option value="with_vat_20" ${request.vat === 'with_vat_20' ? 'selected' : ''}>с НДС 20%</option>
                <option value="with_vat_5" ${request.vat === 'with_vat_5' ? 'selected' : ''}>с НДС 5%</option>
                <option value="with_vat_7" ${request.vat === 'with_vat_7' ? 'selected' : ''}>с НДС 7%</option>
                <option value="with_vat_22" ${request.vat === 'with_vat_22' ? 'selected' : ''}>с НДС 22%</option>
                <option value="without_vat" ${request.vat === 'without_vat' ? 'selected' : ''}>без НДС</option>
              </select>
            </div>
            <div class="form-group">
              <label>Нужно к дате</label>
              <input name="needed_by" type="date" value="${request.needed_by || ''}" />
            </div>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Регион доставки *</label>
              <input name="delivery_region" required value="${escapeHtml(request.delivery_region || '')}" />
            </div>
            <div class="form-group">
              <label>Город доставки</label>
              <input name="delivery_city" list="rhCityList" value="${escapeHtml(request.delivery_city || '')}" />
            </div>
          </div>
          <div class="form-group">
            <label>Статус</label>
            <select name="status" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
              <option value="open" ${request.status === 'open' ? 'selected' : ''}>🟢 Открыта</option>
              <option value="matched" ${request.status === 'matched' ? 'selected' : ''}>🤝 Матч</option>
              <option value="closed" ${request.status === 'closed' ? 'selected' : ''}>🔒 Закрыта</option>
              <option value="expired" ${request.status === 'expired' ? 'selected' : ''}>⏱ Истекла</option>
            </select>
          </div>
          <div class="form-group">
            <label>Описание</label>
            <textarea name="description" rows="4" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical">${escapeHtml(request.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Кол-во откликов (ручной ввод)</label>
            <input name="responses_count" type="number" min="0" value="${request.responses_count || 0}" />
          </div>
          <div id="editReqError" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></div>
          <div style="font-size:11px;color:var(--slate-400);margin-top:14px">
            Создано: ${new Date(request.created_at).toLocaleString('ru-RU')} ·
            Обновлено: ${new Date(request.updated_at).toLocaleString('ru-RU')}
          </div>
        </form>
      `;

      wrap.querySelector('#editReqFooter').style.display = 'flex';

      wrap.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        wrap.remove();
      });

      wrap.querySelector('#editReqSubmit').addEventListener('click', async () => {
        const form = wrap.querySelector('#editReqForm');
        const errEl = wrap.querySelector('#editReqError');
        errEl.style.display = 'none';

        const fd = new FormData(form);
        const payload = {
          title: fd.get('title')?.trim() || null,
          crop_id: fd.get('crop_id') || null,
          volume_tons: fd.get('volume_tons'),
          target_price: fd.get('target_price') || null,
          vat: fd.get('vat'),
          needed_by: fd.get('needed_by') || null,
          delivery_region: fd.get('delivery_region')?.trim(),
          delivery_city: fd.get('delivery_city')?.trim() || null,
          status: fd.get('status'),
          description: fd.get('description')?.trim() || null,
          responses_count: parseInt(fd.get('responses_count') || '0') || 0
        };

        const submit = wrap.querySelector('#editReqSubmit');
        submit.disabled = true;
        submit.textContent = 'Сохраняем...';

        try {
          await api.adminUpdateRequest(requestId, payload);
          wrap.remove();
          showToast('✓ Заявка обновлена');
          if (onSaved) onSaved();
        } catch(err) {
          errEl.textContent = err.message;
          errEl.style.display = '';
          submit.disabled = false;
          submit.textContent = 'Сохранить';
        }
      });
    } catch(err) {
      wrap.querySelector('#editReqBody').innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ============================================================
  // ANALYTICS MODAL — platform stats
  // ============================================================
  async function openAnalyticsModal() {
    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:780px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Аналитика платформы</h2>
        </div>
        <div id="anlBody" style="overflow-y:auto;padding:24px 28px;flex:1">Загружаем...</div>
      </div>
    `;
    const wrap = openModal(html);

    try {
      const stats = await api.adminStats();

      wrap.querySelector('#anlBody').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px">
          <div class="anl-stat">
            <div class="k">Пользователей</div>
            <div class="v">${stats.users_count}</div>
            <div class="d">${stats.verified_count} проверены</div>
          </div>
          <div class="anl-stat">
            <div class="k">Офферов</div>
            <div class="v">${stats.offers_count}</div>
            <div class="d">${stats.active_offers} активных</div>
          </div>
          <div class="anl-stat">
            <div class="k">Сделок</div>
            <div class="v">${stats.deals_count}</div>
            <div class="d">${stats.completed_deals} завершено</div>
          </div>
          <div class="anl-stat">
            <div class="k">Заявок</div>
            <div class="v">${stats.requests_count}</div>
            <div class="d">${stats.open_requests} открыто</div>
          </div>
        </div>

        <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:12px">Финансы</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px">
          <div class="anl-stat" style="background:var(--brand-soft)">
            <div class="k">Оборот завершённых сделок</div>
            <div class="v" style="color:#3D5C19">${api.formatRub(stats.total_revenue_kopecks)}</div>
          </div>
          <div class="anl-stat" style="background:#FEF3C7">
            <div class="k">В работе сейчас</div>
            <div class="v" style="color:#92400E">${api.formatRub(stats.in_escrow_kopecks)}</div>
          </div>
        </div>

        <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:12px">Распределение ролей</h3>
        <div style="display:flex;gap:14px;margin-bottom:24px">
          <div class="anl-mini">🛒 Покупатели<br><b>${stats.buyers_count}</b></div>
          <div class="anl-mini">🌾 Продавцы<br><b>${stats.sellers_count}</b></div>
          <div class="anl-mini">👑 Админы<br><b>${stats.admins_count}</b></div>
        </div>

        <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:12px">Статусы офферов</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:24px">
          <div class="anl-mini">⏳ Модерация<br><b>${stats.pending_offers}</b></div>
          <div class="anl-mini">✓ Активные<br><b>${stats.active_offers}</b></div>
          <div class="anl-mini">💰 Проданы<br><b>${stats.sold_offers}</b></div>
          <div class="anl-mini">✕ Отклонены<br><b>${stats.rejected_offers}</b></div>
          <div class="anl-mini">📦 Архив<br><b>${stats.archived_offers}</b></div>
        </div>

        <h3 style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:12px">Статусы сделок</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
          <div class="anl-mini">💰 Оплачено<br><b>${stats.paid_deals}</b></div>
          <div class="anl-mini">🚚 В пути<br><b>${stats.shipping_deals}</b></div>
          <div class="anl-mini">✓ Завершено<br><b>${stats.completed_deals}</b></div>
          <div class="anl-mini">✕ Отменено<br><b>${stats.cancelled_deals}</b></div>
          <div class="anl-mini">⚠ Спор<br><b>${stats.disputed_deals}</b></div>
        </div>
      `;
    } catch(err) {
      wrap.querySelector('#anlBody').innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${escapeHtml(err.message)}</div>`;
    }
  }

  // ============================================================
  // CREATE OFFER MODAL — for sellers
  // ============================================================
  async function openCreateOfferModal() {
    const crops = await api.listCrops().catch(() => []);
    const html = `
      <div class="modal-backdrop on" id="cofBackdrop"></div>
      <div class="modal on" id="cofModal" style="max-width:560px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close" id="cofClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Разместить оффер</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">После сохранения оффер уйдёт на модерацию.</p>
        </div>
        <form id="cofForm" style="overflow-y:auto;padding:20px 28px;flex:1">
          <div class="form-group">
            <label>Культура <span class="req">*</span></label>
            <select name="crop_id" required style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
              ${crops.map(c => `<option value="${c.id}">${c.emoji || ''} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Заголовок <span class="req">*</span></label>
            <input name="title" required placeholder="Например: Пшеница 3 класс, протеин 12.8%" />
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Цена за тонну, ₽ <span class="req">*</span></label>
              <input name="price_per_ton" type="number" min="0" step="100" required placeholder="14200" />
            </div>
            <div class="form-group">
              <label>Объём, т <span class="req">*</span></label>
              <input name="volume_tons" type="number" min="0" step="0.1" required placeholder="120" />
            </div>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>НДС</label>
              <select name="vat" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
                <option value="with_vat_10">с НДС 10%</option>
                <option value="with_vat_20">с НДС 20%</option>
                <option value="with_vat_5">с НДС 5%</option>
                <option value="with_vat_7">с НДС 7%</option>
                <option value="with_vat_22">с НДС 22%</option>
                <option value="without_vat">без НДС</option>
              </select>
            </div>
            <div class="form-group">
              <label>Год урожая</label>
              <input name="harvest_year" type="number" min="2020" max="2030" value="2025" />
            </div>
          </div>
          <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label>Регион <span class="req">*</span></label>
              <input name="region" required placeholder="Нижегородская область" value="Нижегородская область" />
            </div>
            <div class="form-group">
              <label>Город склада</label>
              <input name="city" list="rhCityList" placeholder="Арзамас" />
            </div>
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">
              <input type="checkbox" name="has_delivery" /> Возможна доставка
            </label>
          </div>
          <div class="form-group" data-delivery-group style="display:none">
            <label>Стоимость доставки за тонну, ₽</label>
            <input name="delivery_price" type="number" min="0" step="50" placeholder="450" />
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">
              <input type="checkbox" name="has_lab_analysis" /> Есть лабораторный анализ
            </label>
          </div>
          <div class="form-group">
            <label>Описание</label>
            <textarea name="description" rows="3" placeholder="Дополнительная информация о партии..." style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical"></textarea>
          </div>
          <div id="cofError" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></div>
        </form>
        <div style="padding:18px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close" id="cofCancel">Отмена</button>
          <button class="btn btn-primary" id="cofSubmit">Разместить</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);


    // Toggle delivery group
    const delCb = wrap.querySelector('input[name="has_delivery"]');
    const delGrp = wrap.querySelector('[data-delivery-group]');
    delCb.addEventListener('change', () => {
      delGrp.style.display = delCb.checked ? '' : 'none';
    });

    wrap.querySelector('#cofSubmit').addEventListener('click', async () => {
      const form = wrap.querySelector('#cofForm');
      const errEl = wrap.querySelector('#cofError');
      errEl.style.display = 'none';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd);
      payload.has_delivery = !!fd.get('has_delivery');
      payload.has_lab_analysis = !!fd.get('has_lab_analysis');

      const submit = wrap.querySelector('#cofSubmit');
      submit.disabled = true;
      submit.textContent = 'Сохраняем...';

      try {
        await api.createOffer(payload);
        close();
        showToast('✓ Оффер отправлен на модерацию');
        // Reload page to refresh deals/offers
        setTimeout(() => location.reload(), 800);
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Разместить';
      }
    });
  }

  // ============================================================
  // TOAST notification
  // ============================================================
  function showToast(msg, kind = 'success') {
    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
      background:#1A2410;color:#fff;padding:14px 22px;border-radius:12px;
      font-size:14px;font-weight:600;z-index:99999;
      box-shadow:0 16px 40px rgba(15,23,42,.3);
      animation:rh-toast-in .3s ease-out;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => t.remove(), 300);
    }, 2500);
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // Toast animation keyframes
  if (!document.getElementById('rh-toast-css')) {
    const style = document.createElement('style');
    style.id = 'rh-toast-css';
    style.textContent = `
      @keyframes rh-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // BOOTSTRAP
  // ============================================================
  function init() {
    // Apply feature flags on every page (show/hide auctions, prices etc.)
    if (api.applyFeatureFlags) {
      api.applyFeatureFlags().catch(err => console.warn('[features]', err));
    }

    // Inject city datalist for autocomplete in all forms
    if (window.RH_CITIES && !document.getElementById('rhCityList')) {
      const dl = document.createElement('datalist');
      dl.id = 'rhCityList';
      window.RH_CITIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name || c;
        dl.appendChild(opt);
      });
      document.body.appendChild(dl);
    }

    if (document.getElementById('accName')) {
      loadAccountPage();
    }
    document.addEventListener('rh:user-loaded', () => {
      if (document.getElementById('accName')) loadAccountPage();
    });

    // ===== GLOBAL PURCHASE / RESPOND HANDLERS =====
    // Кнопки на карточках товаров и заявок (как на статичных, так и на динамических)
    document.addEventListener('click', async e => {
      // Купить / Купить с доставкой / Купить с самовывозом
      const buyBtn = e.target.closest('[data-action="buy"]');
      if (buyBtn) {
        e.preventDefault();
        await handlePurchase(buyBtn);
        return;
      }

      // Сделать ценовое предложение
      const proposeBtn = e.target.closest('[data-action="propose"]');
      if (proposeBtn) {
        e.preventDefault();
        await handleProposal(proposeBtn);
        return;
      }

      // Откликнуться (на заявку покупателя)
      const respondBtn = e.target.closest('[data-action="respond"]');
      if (respondBtn) {
        e.preventDefault();
        await handleRespond(respondBtn);
        return;
      }

      // Карточка оффера в каталоге → /product.html?id=...
      // (уже работает через <a href>, но запасной handler если кликнули по карточке без id)
    });

    // ===== GLOBAL MODAL CLOSE HANDLER =====
    // Работает ТОЛЬКО для динамически созданных модалок (admin-панель, edit-форма и т.д.)
    // Статические модалки login/onboarding/cityPicker имеют свои data-close обработчики (в main.js)
    document.addEventListener('click', e => {
      // Close button — only inside DYNAMIC modal wraps
      const closeBtn = e.target.closest('.modal-close');
      if (closeBtn && !closeBtn.hasAttribute('data-close')) {
        const wrap = findModalWrap(closeBtn);
        if (wrap) {
          e.preventDefault();
          e.stopPropagation();
          closeModalWrap(wrap);
        }
        return;
      }
      // Backdrop click — only on backdrop in dynamic wrap
      if (e.target.classList.contains('modal-backdrop')
          && e.target.classList.contains('on')
          && !e.target.id.match(/^(loginBackdrop|onbBackdrop|cityPickerBackdrop|soBackdrop|drawerBackdrop)$/)) {
        const wrap = findModalWrap(e.target);
        if (wrap) closeModalWrap(wrap);
      }
    }, true);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        // Close topmost dynamic modal
        const wraps = Array.from(document.body.children).filter(c =>
          c.tagName === 'DIV'
          && !c.id  // dynamic wraps have no id
          && c.querySelector('.modal-backdrop.on')
          && c.querySelector('.modal.on')
          && !c._closing
        );
        if (wraps.length) {
          closeModalWrap(wraps[wraps.length - 1]);
        }
      }
    });
  }

  // ============================================================
  // PURCHASE / PROPOSE / RESPOND HANDLERS
  // ============================================================

  // Find offer ID — supports real IDs, URL params, and fallback search for static product page
  async function findOfferIdAsync(btn) {
    // 1. Real ID on button
    if (btn.dataset.offerId && btn.dataset.offerId !== 'demo') return btn.dataset.offerId;
    // 2. Parent card
    const card = btn.closest('[data-offer]');
    if (card) return card.dataset.offer;
    // 3. URL param ?id=
    const params = new URLSearchParams(location.search);
    const urlId = params.get('id');
    if (urlId) return urlId;
    // 4. Static product page — search by title on the page
    const titleEl = document.querySelector('.product-title, .card-title, h1');
    if (titleEl) {
      const title = titleEl.textContent.trim();
      try {
        const offers = await api.listOffers({ search: title.slice(0, 20), limit: 1 });
        if (offers && offers.length) return offers[0].id;
      } catch(e) {}
    }
    return null;
  }

  async function requireLogin(action) {
    const user = await api.currentUser();
    if (!user) {
      const proceed = confirm(`Чтобы ${action}, нужно войти в аккаунт.\n\nПерейти на страницу входа?`);
      if (proceed) {
        // Open login modal
        const bd = document.getElementById('loginBackdrop');
        const modal = document.getElementById('loginModal');
        if (bd) bd.classList.add('on');
        if (modal) modal.classList.add('on');
        document.body.style.overflow = 'hidden';
      }
      return null;
    }
    return user;
  }

  async function handlePurchase(btn) {
    const user = await requireLogin('купить');
    if (!user) return;

    const offerId = await findOfferIdAsync(btn);
    if (!offerId) {
      alert('Не удалось определить оффер. Откройте страницу товара.');
      return;
    }

    const withDelivery = btn.dataset.delivery === '1';
    const offer = await api.getOffer(offerId).catch(() => null);
    if (!offer) {
      alert('Оффер не найден или удалён.');
      return;
    }

    openPurchaseModal(offer, withDelivery, user);
  }

  function openPurchaseModal(offer, withDelivery, user) {
    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:520px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Оформление сделки</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">${escapeHtml(offer.title)} · ${offer.volume_tons} т доступно</p>
        </div>
        <form id="buyForm" style="overflow-y:auto;padding:20px 28px;flex:1">
          <div class="form-group">
            <label>Объём, т *</label>
            <input name="volume" type="number" min="1" max="${offer.volume_tons}" step="0.1" required value="${offer.volume_tons}" />
            <div class="form-hint">Доступно ${offer.volume_tons} т</div>
          </div>
          <div class="form-group">
            <label>Адрес доставки${withDelivery ? ' *' : ''}</label>
            <input name="address" ${withDelivery ? 'required' : ''} value="${escapeHtml(user.region || 'Нижегородская область')}" placeholder="Куда доставить" />
            ${!withDelivery ? '<div class="form-hint">Самовывоз — укажите контактный регион</div>' : ''}
          </div>
          <div style="background:var(--slate-50);padding:14px;border-radius:12px;margin:14px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
              <span>Цена за тонну</span>
              <span class="mono" style="font-family:'JetBrains Mono',monospace">${api.formatRub(offer.price_kopecks)}</span>
            </div>
            ${withDelivery && offer.delivery_price_per_ton_kopecks ? `
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
                <span>Доставка за тонну</span>
                <span class="mono" style="font-family:'JetBrains Mono',monospace">${api.formatRub(offer.delivery_price_per_ton_kopecks)}</span>
              </div>
            ` : ''}
            <div id="totalRow" style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--slate-200);padding-top:10px;margin-top:10px">
              <span>Итого</span>
              <span class="mono" id="totalAmount" style="font-family:'JetBrains Mono',monospace">${api.formatRub(offer.price_kopecks * offer.volume_tons + (withDelivery ? offer.delivery_price_per_ton_kopecks * offer.volume_tons : 0))}</span>
            </div>
          </div>
          <div id="buyError" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></div>
          <p style="font-size:12px;color:var(--slate-500);line-height:1.5;margin-top:14px">
            После создания сделки средства резервируются на эскроу-счёте платформы и переводятся продавцу только после подтверждения приёмки товара.
          </p>
        </form>
        <div style="padding:18px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close">Отмена</button>
          <button class="btn btn-primary" id="buySubmit">Создать сделку</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    // Live total recalculation
    const volInput = wrap.querySelector('input[name="volume"]');
    const totalEl = wrap.querySelector('#totalAmount');
    volInput.addEventListener('input', () => {
      const v = parseFloat(volInput.value) || 0;
      const total = offer.price_kopecks * v + (withDelivery ? (offer.delivery_price_per_ton_kopecks || 0) * v : 0);
      totalEl.textContent = api.formatRub(total);
    });

    wrap.querySelector('#buySubmit').addEventListener('click', async () => {
      const fd = new FormData(wrap.querySelector('#buyForm'));
      const volume = parseFloat(fd.get('volume'));
      const address = fd.get('address')?.trim();
      const errEl = wrap.querySelector('#buyError');
      errEl.style.display = 'none';

      if (!volume || volume <= 0) {
        errEl.textContent = 'Укажите объём';
        errEl.style.display = '';
        return;
      }
      if (volume > offer.volume_tons) {
        errEl.textContent = `Максимум ${offer.volume_tons} т`;
        errEl.style.display = '';
        return;
      }

      const submit = wrap.querySelector('#buySubmit');
      submit.disabled = true;
      submit.textContent = 'Создаём...';

      try {
        const deal = await api.createDeal({
          offer_id: offer.id,
          volume_tons: volume,
          delivery_address: address || null
        });
        wrap.remove();
        showToast(`✓ Сделка ${deal.deal_number || ''} создана`);
        // Redirect to account
        setTimeout(() => { location.href = '/account.html'; }, 1200);
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Создать сделку';
      }
    });
  }

  async function handleProposal(btn) {
    const user = await requireLogin('сделать ценовое предложение');
    if (!user) return;

    const offerId = await findOfferIdAsync(btn);
    if (!offerId) return alert('Не удалось определить оффер.');

    const offer = await api.getOffer(offerId).catch(() => null);
    if (!offer) return alert('Оффер не найден.');

    const currentPrice = api.formatRub(offer.price_kopecks);

    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:480px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:20px;font-weight:700">Ценовое предложение</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">${escapeHtml(offer.title)} · ${offer.volume_tons} т</p>
        </div>
        <form id="proposeForm" style="padding:20px 28px;flex:1;overflow-y:auto">
          <div style="background:var(--slate-50);padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:13px">
            Текущая цена: <b>${currentPrice}/т</b>
          </div>
          <div class="form-group">
            <label>Ваша цена, ₽/т *</label>
            <input name="price" type="number" min="0" step="100" required placeholder="${Math.round(offer.price_kopecks/100*0.95)}" />
          </div>
          <div class="form-group">
            <label>Объём, т *</label>
            <input name="volume" type="number" min="1" step="1" required value="${offer.volume_tons}" />
          </div>
          <div class="form-group">
            <label>Комментарий</label>
            <textarea name="comment" rows="3" placeholder="Условия, сроки, требования к качеству..." style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical"></textarea>
          </div>
          <div id="proposeError" style="color:var(--red);font-size:13px;display:none"></div>
        </form>
        <div style="padding:16px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close">Отмена</button>
          <button class="btn btn-primary" id="proposeSubmit">Отправить предложение</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    wrap.querySelector('#proposeSubmit').addEventListener('click', async () => {
      const fd = new FormData(wrap.querySelector('#proposeForm'));
      const price = parseFloat(fd.get('price'));
      const volume = parseFloat(fd.get('volume'));
      const comment = fd.get('comment')?.trim() || '';
      const errEl = wrap.querySelector('#proposeError');

      if (!price || price <= 0) { errEl.textContent = 'Укажите цену'; errEl.style.display = ''; return; }
      if (!volume || volume <= 0) { errEl.textContent = 'Укажите объём'; errEl.style.display = ''; return; }

      const submit = wrap.querySelector('#proposeSubmit');
      submit.disabled = true;
      submit.textContent = 'Отправляем...';

      try {
        await api.createRequest({
          crop_id: offer.crop_id,
          title: 'Ценовое предложение: ' + offer.title,
          target_price: price,
          vat: offer.vat,
          volume_tons: volume,
          delivery_region: user.region || 'Нижегородская область',
          delivery_city: user.city || '',
          description: 'Предложение к лоту ' + (offer.id || '').slice(-8) + '. ' + comment
        });
        wrap.remove();
        showToast('✓ Предложение отправлено! Отслеживайте в кабинете → Заявки');
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Отправить предложение';
      }
    });
  }

  async function handleRespond(btn) {
    const user = await requireLogin('откликнуться на заявку');
    if (!user) return;

    // Only sellers and admins can respond to buyer requests
    if (user.role === 'buyer') {
      const html = `
        <div class="modal-backdrop on"></div>
        <div class="modal on" style="max-width:440px;text-align:center;padding:40px 30px">
          <button class="modal-close">✕</button>
          <div style="font-size:42px;margin-bottom:14px">🌾</div>
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Только для продавцов</h2>
          <p style="color:var(--slate-500);margin-bottom:20px;line-height:1.6">Чтобы откликаться на заявки покупателей, вам нужен аккаунт продавца. Зарегистрируйтесь как продавец или обратитесь к администратору для смены роли.</p>
          <button class="btn btn-outline modal-close">Понятно</button>
        </div>
      `;
      const wrap = openModal(html);
      return;
    }

    const requestId = btn.dataset.requestId;
    if (!requestId) return alert('Не удалось определить заявку.');

    // Get request card info from DOM
    const card = btn.closest('.req-card, [data-request]');
    const title = card?.querySelector('.req-card-title')?.textContent || 'Заявка';

    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:480px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:20px;font-weight:700">Откликнуться на заявку</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">${escapeHtml(title)}</p>
        </div>
        <form id="respondForm" style="padding:20px 28px;flex:1;overflow-y:auto">
          <div class="form-group">
            <label>Ваша цена, ₽/т *</label>
            <input name="price" type="number" min="0" step="100" required placeholder="14200" />
          </div>
          <div class="form-group">
            <label>Ваш объём, т *</label>
            <input name="volume" type="number" min="1" step="1" required placeholder="100" />
          </div>
          <div class="form-group">
            <label>Регион / город склада *</label>
            <input name="region" required value="${escapeHtml(user.region || user.city || 'Нижегородская область')}" />
          </div>
          <div class="form-group">
            <label>Комментарий к отклику</label>
            <textarea name="comment" rows="3" placeholder="Качество, условия отгрузки, готовность..." style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical"></textarea>
          </div>
          <div id="respondError" style="color:var(--red);font-size:13px;display:none"></div>
        </form>
        <div style="padding:16px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close">Отмена</button>
          <button class="btn btn-primary" id="respondSubmit">Отправить отклик</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    wrap.querySelector('#respondSubmit').addEventListener('click', async () => {
      const fd = new FormData(wrap.querySelector('#respondForm'));
      const price = parseFloat(fd.get('price'));
      const volume = parseFloat(fd.get('volume'));
      const region = fd.get('region')?.trim();
      const comment = fd.get('comment')?.trim() || '';
      const errEl = wrap.querySelector('#respondError');

      if (!price) { errEl.textContent = 'Укажите цену'; errEl.style.display = ''; return; }
      if (!volume) { errEl.textContent = 'Укажите объём'; errEl.style.display = ''; return; }
      if (!region) { errEl.textContent = 'Укажите регион'; errEl.style.display = ''; return; }

      const submit = wrap.querySelector('#respondSubmit');
      submit.disabled = true;
      submit.textContent = 'Отправляем...';

      try {
        // Create offer as response to buyer request
        await api.createOffer({
          crop_id: card?.dataset?.crop || 'wheat-3',
          title: 'Отклик: ' + title,
          price_per_ton: price,
          vat: 'with_vat_10',
          volume_tons: volume,
          region: region,
          city: '',
          description: 'Отклик на заявку ' + requestId.slice(-8) + '. ' + comment,
          has_delivery: false
        });
        wrap.remove();
        btn.disabled = true;
        btn.textContent = '✓ Отклик отправлен';
        btn.style.opacity = '.6';
        showToast('✓ Отклик отправлен! Отслеживайте в кабинете → Мои офферы');
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Отправить отклик';
      }
    });
  }

  // Find the wrapper div that contains a dynamic modal element.
  // A dynamic wrap is a direct child of <body> with NO id and contains both backdrop and modal.
  function findModalWrap(el) {
    let cur = el;
    while (cur && cur.parentNode !== document.body) cur = cur.parentNode;
    if (!cur || cur.tagName !== 'DIV') return null;
    // Static modals (loginModal, onbModal, cityPickerModal) have an id — skip them.
    if (cur.id) return null;
    // Verify wrap actually contains both backdrop and modal
    if (cur.querySelector('.modal-backdrop') && cur.querySelector('.modal')) {
      return cur;
    }
    return null;
  }

  // Close modal wrap with fade-out animation
  function closeModalWrap(wrap) {
    if (!wrap || wrap._closing) return;
    wrap._closing = true;
    const bd = wrap.querySelector('.modal-backdrop');
    const modal = wrap.querySelector('.modal');
    if (bd) bd.classList.remove('on');
    if (modal) modal.classList.remove('on');
    setTimeout(() => {
      try { wrap.remove(); } catch(e) {}
    }, 200);
  }

  // Close ALL dynamic modals at once (prevents stacking)
  function closeAllDynamicModals() {
    Array.from(document.body.children).forEach(c => {
      if (c.tagName === 'DIV' && !c.id && !c.className
          && c.querySelector('.modal-backdrop') && c.querySelector('.modal')) {
        try { c.remove(); } catch(e) {}
      }
    });
  }

  // Wrapper: close existing modals before opening new one
  function openModal(htmlString) {
    closeAllDynamicModals();
    const wrap = document.createElement('div');
    wrap.innerHTML = htmlString;
    document.body.appendChild(wrap);
    return wrap;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for manual triggering
  window.RH_Admin = {
    openModeration: openModerationModal,
    openOffers: openModerationModal,
    openUsers: openUsersModal,
    openDeals: openDealsModal,
    openRequests: openRequestsModal,
    openAnalytics: openAnalyticsModal,
    openCreateOffer: openCreateOfferModal,
    openCreateRequest: openCreateRequestModal,
    openFeatureFlags: openFeatureFlagsModal,
    refresh: loadAccountPage
  };
})();

// ============================================================
// CATALOG / SALE PAGE — replace hardcoded cards with DB content
// ============================================================
(function(){
  if (!api.isSupabase) return;

  // Catalog: replace #offersGrid contents with offers from DB
  async function syncCatalog() {
    const grid = document.getElementById('offersGrid');
    if (!grid) return;
    try {
      const offers = await api.listOffers({ limit: 100 });
      if (!offers || !offers.length) return;  // keep static fallback

      grid.innerHTML = offers.map(o => renderCatalogCard(o)).join('');

      // Update counter
      const counter = document.getElementById('filterCount');
      if (counter) counter.textContent = offers.length;

      // Re-trigger filter handlers if they exist
      window.dispatchEvent(new CustomEvent('rh:catalog-loaded'));
    } catch(e) {
      console.warn('[Catalog] DB sync failed, using static fallback:', e.message);
    }
  }

  function renderCatalogCard(o) {
    const featured = ['Горячее','Хит недели','Премиум','Лаб. анализ'].includes(o.badge);
    const isFeatured = featured && Math.random() < 0.15; // some featured

    const cropKey = o.crop_id?.split('-')[0] || 'other';
    const priceR = (o.price_kopecks / 100).toLocaleString('ru-RU');
    const vatLabel = ({with_vat_5: 'с НДС 5%', with_vat_7: 'с НДС 7%', with_vat_10: 'с НДС 10%', with_vat_20: 'с НДС 20%', with_vat_22: 'с НДС 22%', without_vat: 'без НДС'})[o.vat] || 'с НДС';
    const distance = estimateDistance(o.region);
    const deliveryPrice = o.delivery_price_per_ton_kopecks > 0
      ? `Доставка ${(o.delivery_price_per_ton_kopecks/100).toLocaleString('ru-RU')} ₽/т`
      : (o.has_delivery ? 'Есть доставка' : 'Самовывоз');
    const sellerSid = 'A-' + (o.seller?.id || '').slice(-4).toUpperCase();
    const rating = o.seller?.rating || '4.9';
    const dealsCount = o.seller?.deals_count || 0;
    const cls = isFeatured ? 'card card-featured' : 'card';
    const badgeCls = ['Премиум','Хит недели','Лаб. анализ'].includes(o.badge) ? 'badge orange' : 'badge featured';

    // Quality params
    const qEntries = Object.entries(o.quality || {});
    const qRows = qEntries.map(([k, v]) => `
      <div class="q-row"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>
    `).join('');
    const qWord = qEntries.length === 1 ? 'параметр' : (qEntries.length < 5 ? 'параметра' : 'параметров');
    const dealsWord = dealsCount === 1 ? 'сделка' : (dealsCount < 5 ? 'сделки' : 'сделок');

    return `
      <article class="${cls}"
        data-offer="${o.id}" data-crop="${cropKey}" data-region="${escapeHtml(o.region)}"
        data-price="${o.price_kopecks/100}" data-distance="${distance}"
        data-delivery="${o.has_delivery ? '1' : '0'}"
        data-vat="${o.vat !== 'without_vat' ? '1' : '0'}"
        data-lab="${o.has_lab_analysis ? '1' : '0'}"
        data-title="${escapeHtml(o.title)}">
        <div class="card-head">
          <div class="card-top">
            <div>
              <span class="${badgeCls}">${escapeHtml(o.badge || 'Проверено')}</span>
              <h3 class="card-title">${escapeHtml(o.title)}</h3>
            </div>
            <div class="card-price-pill">
              <span class="num">${priceR} ₽/т</span>
              <span class="small">${vatLabel}</span>
            </div>
          </div>
          <div class="card-meta">
            <div class="cell"><div class="k">Объём</div><div class="v">${o.volume_tons} т</div></div>
            <div class="cell"><div class="k">Урожай</div><div class="v">${o.harvest_year || '2025'}</div></div>
            <div class="cell"><div class="k">Регион</div><div class="v">${escapeHtml(o.region)}</div></div>
          </div>
        </div>
        ${qEntries.length > 0 ? `
          <button class="q-toggle" data-q="${o.id}">
            <span class="lbl">
              <span class="lbl-ic">ⓘ</span>
              Показатели качества
            </span>
            <span class="right"><span class="count">${qEntries.length} ${qWord}</span><span class="chev">▼</span></span>
          </button>
          <div class="q-body" data-q="${o.id}"><div class="q-body-inner">${qRows}</div></div>
        ` : ''}
        <div class="distance-strip">
          <div class="distance-from">
            <span class="pin-ic">📍</span>
            <div>
              <div class="route">${escapeHtml(o.region)} → Нижний Новгород</div>
              <div class="km"><b>${distance}</b> км до вас</div>
            </div>
          </div>
          ${o.delivery_price_per_ton_kopecks > 0 ? `<span class="distance-cost">🚚 Доставка ${(o.delivery_price_per_ton_kopecks/100).toLocaleString('ru-RU')} ₽/т</span>` : ''}
        </div>
        <div class="supplier-strip">
          <span class="supplier-verify"><span class="bc">✓</span>Проверено платформой</span>
          <div class="supplier-stat">
            <span class="rating"><span class="star">★</span>4.9</span>
            <span class="dot"></span>
            <span>Эскроу-защита</span>
            <span class="dot"></span>
            <span class="id">Лот ${(o.id || '').slice(-4).toUpperCase()}</span>
          </div>
        </div>
        <div class="card-foot">
          <span class="delivery-tag">🚚 ${deliveryPrice}</span>
          <a class="cta" href="/product.html?id=${o.id}">Купить →</a>
        </div>
      </article>
    `;
  }

  // Quick distance estimate from region name (matches the static catalog ordering)
  const REGION_DISTANCES = {
    'Нижний Новгород': 18, 'Кстово': 24, 'Богородск': 45, 'Балахна': 39, 'Дзержинск': 38,
    'Семёнов': 71, 'Павлово': 79, 'Лысково': 92, 'Арзамас': 112, 'Муром': 137,
    'Сергач': 158, 'Выкса': 186, 'Ковров': 195, 'Иваново': 207, 'Касимов': 223,
    'Чебоксары': 235, 'Владимир': 248, 'Йошкар-Ола': 273, 'Рязань': 287,
    'Пенза': 340, 'Тамбов': 378, 'Ульяновск': 402, 'Казань': 407, 'Саранск': 413,
    'Тула': 428, 'Балаково': 539, 'Воронеж': 580, 'Самара': 612, 'Липецк': 634, 'Саратов': 689
  };
  function estimateDistance(region) {
    return REGION_DISTANCES[region] || 250;
  }

  // SALE page: replace #requestsGrid contents
  async function syncSale() {
    const grids = document.querySelectorAll('.req-grid');
    if (!grids.length) return;
    try {
      const requests = await api.listRequests({ limit: 100 });
      if (!requests || !requests.length) return;

      // Replace first grid (active) with DB requests
      grids[0].innerHTML = requests.map(r => renderRequestCard(r)).join('');
      window.dispatchEvent(new CustomEvent('rh:sale-loaded'));
    } catch(e) {
      console.warn('[Sale] DB sync failed:', e.message);
    }
  }

  function renderRequestCard(r) {
    const cropKey = r.crop_id?.split('-')[0] || 'other';
    const priceR = r.target_price_kopecks ? (r.target_price_kopecks/100).toLocaleString('ru-RU') + ' ₽/т' : 'Договорная';
    const vatLabel = ({with_vat_10:'с НДС 10%',with_vat_20:'с НДС 20%',without_vat:'без НДС'})[r.vat] || 'с НДС';
    const buyerSid = 'B-' + (r.id || '').slice(-4).toUpperCase();
    const ageH = Math.floor((Date.now() - new Date(r.created_at)) / 36e5);
    const ageStr = ageH < 24 ? `${ageH} ч назад` : `${Math.floor(ageH/24)} дн назад`;
    const isUrgent = ageH < 8;
    const neededBy = r.needed_by ? `до ${new Date(r.needed_by).toLocaleDateString('ru-RU')}` : 'Не указан';
    const buyerCompany = r.buyer?.company_name || 'Покупатель';
    const buyerType = guessBuyerType(buyerCompany, r.crop_id);

    return `
      <article class="req-card"
        data-request="${r.id}" data-crop="${cropKey}"
        data-region="${escapeHtml(r.delivery_city || r.delivery_region || '')}"
        data-volume="${r.volume_tons}"
        data-vat="${r.vat !== 'without_vat' ? 'yes' : 'no'}"
        data-title="${escapeHtml(r.title || r.crop?.name || '')}">
        <div class="req-card-head">
          <div>
            <div class="req-badges">
              ${isUrgent ? '<span class="badge orange">🔥 Срочно</span>' : ''}
              ${ageH < 24 ? '<span class="badge featured">Новый</span>' : ''}
              <span class="badge gray">№ Q-${(r.id || '').slice(-4).toUpperCase()}</span>
            </div>
            <h3 class="req-card-title">${escapeHtml(r.title || r.crop?.name || 'Заявка')}</h3>
          </div>
          <div class="req-target-price">
            <span class="num">${priceR}</span>
            <span class="small">${vatLabel}</span>
          </div>
        </div>
        <div class="req-attrs">
          <div class="cell"><div class="k">Объём</div><div class="v">${r.volume_tons} т</div></div>
          <div class="cell"><div class="k">Куда</div><div class="v">${escapeHtml(r.delivery_city || r.delivery_region || '—')}</div></div>
          <div class="cell"><div class="k">Срок</div><div class="v">${neededBy}</div></div>
        </div>
        <div class="req-meta">
          <span class="item">👤 ${escapeHtml(buyerType)}</span>
          <span class="dot"></span>
          <span class="item mono" style="color:var(--slate-500);font-family:'JetBrains Mono',monospace">ID ${buyerSid}</span>
          <span class="dot"></span>
          <span class="item">🕐 ${ageStr}</span>
        </div>
        <div class="req-foot">
          <span class="req-buyer">Проверено платформой · ✓ ★ ${r.buyer?.rating || '4.9'}</span>
          <button class="cta" data-action="respond" data-request-id="${r.id}">Откликнуться →</button>
        </div>
      </article>
    `;
  }

  function guessBuyerType(company, crop) {
    if (/птицеф/i.test(company)) return 'Птицефабрика';
    if (/хлебоз/i.test(company)) return 'Хлебозавод';
    if (/комбикорм/i.test(company)) return 'Комбикормовый завод';
    if (/мукомол/i.test(company)) return 'Мукомольный комбинат';
    if (/пивовар/i.test(company)) return 'Пивоваренный завод';
    if (crop?.includes('barley-malt')) return 'Пивоваренный завод';
    if (crop?.includes('sunflower')) return 'Маслозавод';
    return 'Закупочная компания';
  }

  // Run after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncCatalog();
      syncSale();
    });
  } else {
    syncCatalog();
    syncSale();
  }
})();
