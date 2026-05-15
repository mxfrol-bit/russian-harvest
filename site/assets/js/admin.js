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
        loadUserThreads(user),
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
        wireViewDealButtons(list);
      }

      // History
      const histList = document.getElementById('historyDealsList');
      if (histList && history.length > 0) {
        histList.innerHTML = history.slice(0, 10).map(d => renderDealRow(d, user, true)).join('');
        wireViewDealButtons(histList);
      }
    } catch(e) {
      console.warn('[Deals]', e);
    }
  }

  function wireViewDealButtons(container) {
    container.querySelectorAll('[data-action="view-deal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        openChatModal({ deal_id: btn.dataset.dealId });
      });
    });
  }

  function renderDealRow(d, user, isHistory = false) {
    const isBuyer = d.buyer_id === user.id;
    const counterparty = isBuyer ? d.seller : d.buyer;
    const cpHandle = counterparty?.handle || (isBuyer ? 'Продавец' : 'Покупатель');
    const cpVerified = counterparty?.is_verified ? ' · ✓' : '';
    const cpRating = counterparty?.rating > 0 ? ` · ★ ${parseFloat(counterparty.rating).toFixed(1)}` : '';
    const statusLabel = ({
      pending: 'Ожидает оплаты', paid: 'Оплачено', shipping: 'В пути',
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
            <span>${escapeHtml(cpHandle)}${cpRating}${cpVerified}</span>
          </div>
        </div>
        <div class="deal-price">${api.formatRub(d.grand_total_kopecks)}<small>${isBuyer ? 'покупка' : 'продажа'}</small></div>
        <span class="deal-label ${statusCls}">${statusLabel}</span>
        <div class="deal-actions">
          <button class="btn btn-primary btn-sm" data-action="view-deal" data-deal-id="${d.id}">Открыть чат →</button>
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
            <button class="btn btn-outline btn-sm" data-action="view-request" data-id="${r.id}">Открыть</button>
          </div>
        </div>
      `).join('');

      // Wire "Открыть" buttons
      list.querySelectorAll('[data-action="view-request"]').forEach(btn => {
        btn.addEventListener('click', () => {
          openEditRequestModal(btn.dataset.id, () => loadUserRequests(user));
        });
      });
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
    const cropsSelectHtml = await renderCropsSelect({ name: 'crop_id', label: 'Культура' });
    const html = `
      <div class="modal-backdrop on" id="creqBackdrop"></div>
      <div class="modal on" id="creqModal" style="max-width:540px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close" id="creqClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Создать заявку на закупку</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Поставщики увидят заявку и смогут предложить вам свой товар.</p>
        </div>
        <form id="creqForm" style="overflow-y:auto;padding:20px 28px;flex:1">
          ${cropsSelectHtml}
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
              <label>Активна до</label>
              <input name="needed_by" type="date" />
            </div>
          </div>
          <div class="form-group" id="creqGeoMount"></div>
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
    // Mount cascade (region → district → city)
    await mountGeoCascade(wrap.querySelector('#creqGeoMount'), { prefix: 'delivery' });

    wrap.querySelector('#creqSubmit').addEventListener('click', async () => {
      const form = wrap.querySelector('#creqForm');
      const errEl = wrap.querySelector('#creqError');
      errEl.style.display = 'none';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd);

      // Find crop name for title — try tree first, fallback to flat
      let cropName = 'Заявка на закупку';
      try {
        const tree = await api.listCropsTree();
        for (const p of tree) {
          if (p.id === payload.crop_id) { cropName = p.name; break; }
          const child = (p.children || []).find(c => c.id === payload.crop_id);
          if (child) { cropName = child.name; break; }
        }
      } catch(_) {}
      payload.title = cropName;

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
        } else if (text.includes('чаты платформы') || text.includes('чаты')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openThreadsModal(); });
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

      // Version footer
      const cfg = window.RH_CONFIG || {};
      const tag = panel.querySelector('#adminVersionTag');
      const dateEl = panel.querySelector('#adminVersionDate');
      const footer = panel.querySelector('#adminVersionFooter');
      if (tag) tag.textContent = 'v' + (cfg.VERSION || '?');
      if (dateEl) dateEl.textContent = cfg.BUILD_DATE || '';
      if (footer) {
        footer.addEventListener('click', () => openChangelogModal());
      }
    } catch(err) {
      console.error('[Admin] Stats load failed:', err);
    }
  }

  // ============================================================
  // CHANGELOG MODAL — release history for admins
  // ============================================================
  function openChangelogModal() {
    const log = (window.RH_CONFIG && window.RH_CONFIG.CHANGELOG) || [];
    const releasesHtml = log.length ? log.map(rel => `
      <div style="border-left:3px solid var(--brand);padding:14px 18px;margin-bottom:14px;background:#fafbfc;border-radius:0 10px 10px 0">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap">
          <div>
            <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:15px;color:var(--brand-dark)">v${escapeHtml(rel.version)}</span>
            <span style="margin-left:10px;font-size:14px;color:var(--ink);font-weight:600">${escapeHtml(rel.summary || '')}</span>
          </div>
          <span style="font-size:12px;color:var(--slate-500)">${escapeHtml(rel.date || '')}</span>
        </div>
        ${rel.changes && rel.changes.length ? `
          <ul style="margin-top:10px;padding-left:18px;color:var(--slate-700);font-size:13px;line-height:1.65">
            ${rel.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('') : '<p style="color:var(--slate-500);text-align:center;padding:30px">Записей пока нет.</p>';

    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:760px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">📦 Журнал релизов</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">История обновлений платформы. Последняя версия — наверху.</p>
        </div>
        <div style="overflow-y:auto;padding:22px 28px;flex:1">
          ${releasesHtml}
        </div>
      </div>
    `;
    openModal(html);
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
          <button class="btn btn-sm" data-action="vip-toggle" data-is-premium="${o.is_premium ? '1' : '0'}" style="font-size:11px;padding:6px 10px;background:${o.is_premium ? 'linear-gradient(135deg,#FFD700,#FFA500)' : '#fff'};color:${o.is_premium ? '#3d2900' : 'var(--ink)'};border:1px solid ${o.is_premium ? '#FFA500' : 'var(--slate-200)'};font-weight:700">${o.is_premium ? '⭐ VIP активен' : '⭐ Сделать VIP'}</button>
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
          showToast('⚠ ' + err.message);
          sel.value = original;
        } finally {
          sel.disabled = false;
        }
      });
    });

    container.querySelectorAll('[data-action="vip-toggle"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const row = btn.closest('[data-offer-id]');
        const isPremium = btn.dataset.isPremium === '1';
        if (isPremium) {
          if (!confirm('Деактивировать VIP-статус оффера?')) return;
          btn.disabled = true;
          try {
            await api.deactivateVip(row.dataset.offerId);
            showToast('✓ VIP деактивирован');
            reload();
          } catch(err) {
            showToast('⚠ ' + err.message);
            btn.disabled = false;
          }
        } else {
          // Ask for tier and duration
          const days = parseInt(prompt('На сколько дней активировать VIP?', '30') || '0', 10);
          if (!days || days < 1) return;
          const amountStr = prompt('Стоимость промо (₽), для отчётности (можно 0):', '0');
          const amount = parseFloat(amountStr) || 0;
          btn.disabled = true;
          try {
            await api.activateVip(row.dataset.offerId, { tier: 'vip', days, amount_rub: amount });
            showToast(`✓ VIP активирован на ${days} дней`);
            reload();
          } catch(err) {
            showToast('⚠ ' + err.message);
            btn.disabled = false;
          }
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
          showToast('⚠ ' + err.message);
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
            showToast('⚠ ' + err.message);
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
            showToast('⚠ ' + err.message);
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
            showToast('⚠ ' + err.message);
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
                <th>Чат</th>
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
                    <div title="${escapeHtml(d.buyer?.email || '')}">🛒 ${escapeHtml(d.buyer?.company_name || d.buyer?.full_name || '—')}</div>
                    <div title="${escapeHtml(d.seller?.email || '')}">🌾 ${escapeHtml(d.seller?.company_name || d.seller?.full_name || '—')}</div>
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
                    <button class="btn btn-outline btn-sm" data-action="deal-chat" title="Открыть чат сделки">💬</button>
                  </td>
                  <td>
                    <button class="btn-icon-del" data-action="deal-delete" title="Удалить сделку">🗑</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        list.querySelectorAll('[data-action="deal-chat"]').forEach(btn => {
          btn.addEventListener('click', () => {
            const row = btn.closest('[data-deal-id]');
            openChatModal({ deal_id: row.dataset.dealId });
          });
        });

        list.querySelectorAll('[data-action="deal-status"]').forEach(sel => {
          const orig = sel.value;
          sel.addEventListener('change', async () => {
            const row = sel.closest('[data-deal-id]');
            sel.disabled = true;
            try {
              await api.adminUpdateDealStatus(row.dataset.dealId, sel.value);
              showToast('✓ Статус сделки изменён');
            } catch(err) {
              showToast('⚠ ' + err.message);
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
              showToast('⚠ ' + err.message);
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
  // THREADS MODAL — admin overview of all chats on the platform
  // ============================================================
  async function openThreadsModal() {
    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:1100px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">💬 Чаты платформы</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Все переговоры между покупателями и продавцами. Клик по строке — открыть чат, написать как модератор.</p>
          <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap" id="thrFilters">
            <button class="ff-tab active" data-filter="active">Активные</button>
            <button class="ff-tab" data-filter="with_deal">Со сделкой</button>
            <button class="ff-tab" data-filter="no_deal">Без сделки</button>
            <button class="ff-tab" data-filter="all">Все</button>
          </div>
        </div>
        <div id="thrList" style="overflow-y:auto;padding:0;flex:1">
          <div style="padding:40px;text-align:center;color:var(--slate-500)">Загружаем…</div>
        </div>
      </div>
    `;
    const wrap = openModal(html);
    let currentFilter = 'active';
    let allThreads = [];

    function applyFilter(threads, f) {
      if (f === 'with_deal') return threads.filter(t => t.deal_id);
      if (f === 'no_deal')   return threads.filter(t => !t.deal_id);
      if (f === 'active')    return threads.filter(t => !t.deal_status || ['pending','paid','shipping','delivered','disputed'].includes(t.deal_status));
      return threads;
    }

    function renderList(threads) {
      const list = wrap.querySelector('#thrList');
      if (!threads.length) {
        list.innerHTML = '<div style="padding:60px;text-align:center;color:var(--slate-500)">Нет чатов в этой категории.</div>';
        return;
      }
      list.innerHTML = `
        <table class="adm-table" style="margin:0">
          <thead>
            <tr>
              <th>Контекст</th>
              <th>Покупатель</th>
              <th>Продавец</th>
              <th>Сделка</th>
              <th>Сообщений</th>
              <th>Последнее</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${threads.map(t => {
              const ctx = t.deal_id    ? `🤝 <b>${t.deal_number || 'сделка'}</b>`
                        : t.offer_id   ? `💼 ${escapeHtml((t.offer_title || '').slice(0, 30))}`
                        : t.request_id ? `📋 ${escapeHtml((t.request_title || 'заявка').slice(0, 30))}`
                        : 'Чат';
              const dealLabel = t.deal_status ? ({
                pending: '⏳', paid: '💰', shipping: '🚚', delivered: '📦',
                completed: '✓', cancelled: '✕', disputed: '⚠'
              })[t.deal_status] + ' ' + ({
                pending: 'Ожидает', paid: 'Оплачено', shipping: 'В пути', delivered: 'Доставлено',
                completed: 'Завершена', cancelled: 'Отменена', disputed: 'Спор'
              })[t.deal_status] : '—';
              const lastTime = t.last_message_at ? new Date(t.last_message_at).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : '—';
              const lastBody = t.last_message_body ? escapeHtml(t.last_message_body.slice(0, 60)) + (t.last_message_body.length > 60 ? '…' : '') : '<i style="color:var(--slate-400)">пусто</i>';
              return `
                <tr data-thread-id="${t.id}" style="cursor:pointer">
                  <td style="font-size:13px">${ctx}</td>
                  <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${escapeHtml(t.buyer_handle || '—')}</td>
                  <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${escapeHtml(t.seller_handle || '—')}</td>
                  <td style="font-size:12px">${dealLabel}</td>
                  <td style="text-align:center;font-weight:700">${t.message_count || 0}</td>
                  <td style="font-size:11.5px;color:var(--slate-600);max-width:240px">
                    <div>${lastBody}</div>
                    <div style="color:var(--slate-400);font-size:10.5px">${lastTime}</div>
                  </td>
                  <td><button class="btn btn-primary btn-sm" data-action="open-thread">Открыть →</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      list.querySelectorAll('[data-thread-id]').forEach(row => {
        row.addEventListener('click', () => openChatModal({ thread_id: row.dataset.threadId }));
      });
    }

    async function loadThreads() {
      const list = wrap.querySelector('#thrList');
      list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--slate-500)">Загружаем…</div>';
      try {
        allThreads = await api.adminListThreads(false);
        renderList(applyFilter(allThreads, currentFilter));
      } catch(e) {
        list.innerHTML = `<div style="padding:30px;color:var(--red)">Ошибка: ${escapeHtml(e.message)}</div>`;
      }
    }

    wrap.querySelectorAll('#thrFilters .ff-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        wrap.querySelectorAll('#thrFilters .ff-tab').forEach(x => x.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderList(applyFilter(allThreads, currentFilter));
      });
    });

    loadThreads();
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
            showToast('⚠ ' + err.message);
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
            showToast('⚠ ' + err.message);
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
    const F = window.RH_CONFIG?.FEATURES || {};
    const crops = await api.listCrops().catch(() => []);

    // Загружаем справочник параметров качества из БД
    let qualitySpecs = [];
    try {
      const cfg = window.RH_CONFIG;
      const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/crop_quality_specs?select=*&order=family.asc,sort_order.asc`, {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      if (r.ok) qualitySpecs = await r.json();
    } catch(_) {}

    const html = `
      <div class="modal-backdrop on" id="cofBackdrop"></div>
      <div class="modal on" id="cofModal" style="max-width:620px;max-height:92vh;display:flex;flex-direction:column">
        <button class="modal-close" id="cofClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Разместить оффер</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">После сохранения оффер уйдёт на модерацию.</p>
        </div>
        <form id="cofForm" style="overflow-y:auto;padding:20px 28px;flex:1">
          <div class="form-group">
            <label>Культура <span class="req">*</span></label>
            <select name="crop_id" id="cofCropSelect" required style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
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
              <input name="region" required list="rhCityList" placeholder="Нижегородская область" value="Нижегородская область" />
            </div>
            <div class="form-group">
              <label>Город склада</label>
              <input name="city" list="rhCityList" placeholder="Арзамас" />
            </div>
          </div>

          <!-- Чекбокс доставки скрываем когда логистика выключена -->
          <div class="form-group" data-feature="delivery" style="${F.delivery_enabled === false ? 'display:none' : ''}">
            <label style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">
              <input type="checkbox" name="has_delivery" /> Возможна доставка
            </label>
          </div>

          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;font-weight:500;font-size:14px">
              <input type="checkbox" name="has_lab_analysis" /> Есть лабораторный анализ
            </label>
          </div>

          <!-- ПОКАЗАТЕЛИ КАЧЕСТВА: динамически по выбранной культуре -->
          <div class="form-group" id="cofQualityWrap">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="margin:0">Показатели качества</label>
              <span class="form-hint" id="cofQualityHint" style="font-size:12px;color:var(--slate-400)">Зависят от выбранной культуры</span>
            </div>
            <div id="cofQualityFields" style="display:flex;flex-direction:column;gap:8px"></div>
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

    // Динамические quality-поля по выбранной культуре
    const cropSel = wrap.querySelector('#cofCropSelect');
    const qFields = wrap.querySelector('#cofQualityFields');
    const qHint   = wrap.querySelector('#cofQualityHint');

    function familyOf(cropId) {
      // Пшеница 3/4/5 класс → wheat; corn-silage → corn; etc.
      if (!cropId) return '';
      // Если crop_id уже совпадает с family — вернём как есть
      const parts = cropId.split('-');
      return parts[0];
    }

    function renderQualityFields() {
      const fam = familyOf(cropSel.value);
      const specs = qualitySpecs.filter(s => s.family === fam);
      if (!specs.length) {
        qFields.innerHTML = '<div style="color:var(--slate-400);font-size:13px;padding:8px 0">Для этой культуры параметры качества не заданы — заполните в описании.</div>';
        qHint.textContent = '';
        return;
      }
      qHint.textContent = `${specs.length} параметров — заполните те, что есть в анализе`;
      qFields.innerHTML = specs.map(s => `
        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:8px;align-items:start">
          <div style="padding:9px 4px 9px 0">
            <div style="font-size:13.5px;color:var(--slate-700);font-weight:500">${escapeHtml(s.param_key)}${s.unit ? ` <span style="color:var(--slate-400);font-weight:400">(${escapeHtml(s.unit)})</span>` : ''}</div>
            ${s.description ? `<div style="font-size:11.5px;color:var(--slate-400);margin-top:1px">${escapeHtml(s.description)}</div>` : ''}
          </div>
          <input type="text"
                 data-quality-key="${escapeHtml(s.param_key)}"
                 placeholder="${escapeHtml(s.example || '—')}"
                 style="padding:8px 10px;border:1px solid var(--slate-200);border-radius:8px;font-family:inherit;font-size:13.5px;width:100%" />
        </div>
      `).join('');
    }

    cropSel.addEventListener('change', renderQualityFields);
    renderQualityFields();

    wrap.querySelector('#cofSubmit').addEventListener('click', async () => {
      const form = wrap.querySelector('#cofForm');
      const errEl = wrap.querySelector('#cofError');
      errEl.style.display = 'none';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd);
      payload.has_delivery = !!fd.get('has_delivery');
      payload.has_lab_analysis = !!fd.get('has_lab_analysis');

      // Собираем quality JSON только из заполненных полей
      const quality = {};
      wrap.querySelectorAll('[data-quality-key]').forEach(inp => {
        const v = (inp.value || '').trim();
        if (v) quality[inp.dataset.qualityKey] = v;
      });
      if (Object.keys(quality).length) payload.quality = quality;

      const submit = wrap.querySelector('#cofSubmit');
      submit.disabled = true;
      submit.textContent = 'Сохраняем...';

      try {
        await api.createOffer(payload);
        close();
        showToast('✓ Оффер отправлен на модерацию');
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

  // ============================================================
  // DICTIONARY HELPERS — culture & geo cascades from DB
  // ============================================================

  /** Returns HTML for a <select name="..."> with crops grouped by parent.
   *  Use with: form innerHTML += await renderCropsSelect({name: 'crop_id', selected: 'wheat-3'})
   */
  async function renderCropsSelect({ name = 'crop_id', selected = '', required = true, label = 'Культура' } = {}) {
    let tree = [];
    try { tree = await api.listCropsTree(); } catch(e) { console.warn('crops tree', e); }

    let opts = '<option value="">— выберите —</option>';
    if (tree.length) {
      // Render nested optgroups (parent + children)
      for (const parent of tree) {
        if (parent.children && parent.children.length) {
          opts += `<optgroup label="${escapeHtml(parent.emoji || '')} ${escapeHtml(parent.name)}">`;
          // Allow selecting parent itself if no children
          opts += `<option value="${escapeHtml(parent.id)}"${selected === parent.id ? ' selected' : ''}>${escapeHtml(parent.name)} (любая)</option>`;
          for (const child of parent.children) {
            opts += `<option value="${escapeHtml(child.id)}"${selected === child.id ? ' selected' : ''}>${escapeHtml(child.name)}</option>`;
          }
          opts += `</optgroup>`;
        } else {
          opts += `<option value="${escapeHtml(parent.id)}"${selected === parent.id ? ' selected' : ''}>${escapeHtml(parent.emoji || '')} ${escapeHtml(parent.name)}</option>`;
        }
      }
    } else {
      // Fallback flat list
      const crops = await api.listCrops().catch(() => []);
      opts += crops.map(c => `<option value="${escapeHtml(c.id)}"${selected === c.id ? ' selected' : ''}>${escapeHtml(c.emoji || '')} ${escapeHtml(c.name)}</option>`).join('');
    }

    return `
      <div class="form-group rh-crops-group">
        <label>${escapeHtml(label)} <span class="req">*</span></label>
        <select name="${escapeHtml(name)}" ${required ? 'required' : ''} style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px">
          ${opts}
        </select>
      </div>
    `;
  }

  /** Mounts a cascade Region → District → City selector inside container.
   *  Triggers form fields: <input name="${prefix}_region">, <input name="${prefix}_district">, <input name="${prefix}_city">
   *  Also sets data-* attrs for parent-child wiring.
   */
  async function mountGeoCascade(container, { prefix = 'delivery', selected = {}, label = 'Регион / район / город' } = {}) {
    container.innerHTML = `
      <div class="rh-geo-cascade">
        <label style="display:block;font-size:13px;color:var(--slate-700);margin-bottom:6px;font-weight:600">${escapeHtml(label)}</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <select name="${prefix}_region_id" data-geo-level="1" style="padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:13px">
            <option value="">— регион —</option>
          </select>
          <select name="${prefix}_district_id" data-geo-level="2" disabled style="padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:13px;background:var(--slate-50)">
            <option value="">— район —</option>
          </select>
          <select name="${prefix}_city_id" data-geo-level="3" disabled style="padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:13px;background:var(--slate-50)">
            <option value="">— город —</option>
          </select>
        </div>
        <input type="hidden" name="${prefix}_region" />
        <input type="hidden" name="${prefix}_city" />
      </div>
    `;

    const regionSel   = container.querySelector('[data-geo-level="1"]');
    const districtSel = container.querySelector('[data-geo-level="2"]');
    const citySel     = container.querySelector('[data-geo-level="3"]');
    const regionHidden= container.querySelector(`input[name="${prefix}_region"]`);
    const cityHidden  = container.querySelector(`input[name="${prefix}_city"]`);

    // Load regions
    try {
      const regions = await api.listGeoRegions();
      regions.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id; opt.textContent = r.name; opt.dataset.name = r.name;
        if (selected.region_id === r.id) opt.selected = true;
        regionSel.appendChild(opt);
      });
      // Auto-select if only one region
      if (regions.length === 1) {
        regionSel.value = regions[0].id;
        regionHidden.value = regions[0].name;
        await loadDistricts(regions[0].id);
      } else if (selected.region_id) {
        regionHidden.value = regionSel.options[regionSel.selectedIndex]?.dataset.name || '';
        await loadDistricts(selected.region_id);
      }
    } catch(e) { console.warn('geo regions', e); }

    async function loadDistricts(region_id) {
      districtSel.innerHTML = '<option value="">— район —</option>';
      citySel.innerHTML = '<option value="">— город —</option>';
      citySel.disabled = true; citySel.style.background = 'var(--slate-50)';
      if (!region_id) {
        districtSel.disabled = true; districtSel.style.background = 'var(--slate-50)';
        return;
      }
      districtSel.disabled = false; districtSel.style.background = '';
      try {
        const districts = await api.listGeoDistricts(region_id);
        districts.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id; opt.textContent = d.name; opt.dataset.name = d.name;
          if (selected.district_id === d.id) opt.selected = true;
          districtSel.appendChild(opt);
        });
        if (selected.district_id) {
          await loadCities(selected.district_id);
        }
      } catch(e) { console.warn('geo districts', e); }
    }

    async function loadCities(district_id) {
      citySel.innerHTML = '<option value="">— город —</option>';
      if (!district_id) { citySel.disabled = true; citySel.style.background = 'var(--slate-50)'; return; }
      citySel.disabled = false; citySel.style.background = '';
      try {
        const cities = await api.listGeoCities(district_id);
        cities.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id; opt.textContent = c.name; opt.dataset.name = c.name;
          if (selected.city_id === c.id) { opt.selected = true; cityHidden.value = c.name; }
          citySel.appendChild(opt);
        });
      } catch(e) { console.warn('geo cities', e); }
    }

    regionSel.addEventListener('change', async () => {
      regionHidden.value = regionSel.options[regionSel.selectedIndex]?.dataset.name || '';
      cityHidden.value = '';
      await loadDistricts(regionSel.value);
    });
    districtSel.addEventListener('change', async () => {
      cityHidden.value = '';
      await loadCities(districtSel.value);
    });
    citySel.addEventListener('change', () => {
      cityHidden.value = citySel.options[citySel.selectedIndex]?.dataset.name || '';
    });

    return container;
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
    if (!document.getElementById('rhCityList')) {
      const dl = document.createElement('datalist');
      dl.id = 'rhCityList';
      // 1. Сначала из статичного списка RH_CITIES (cities.js)
      const seen = new Set();
      if (window.RH_CITIES) {
        window.RH_CITIES.forEach(c => {
          const name = c.name || c;
          if (seen.has(name)) return;
          seen.add(name);
          const opt = document.createElement('option');
          opt.value = name;
          dl.appendChild(opt);
        });
      }
      document.body.appendChild(dl);

      // 2. Дополняем из geo_units (БД) — асинхронно, чтобы автокомплит был полнее
      try {
        const cfg = window.RH_CONFIG || {};
        if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
          fetch(`${cfg.SUPABASE_URL}/rest/v1/geo_units?select=name,full_name,kind&order=sort_order.asc&limit=500`, {
            headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
          })
            .then(r => r.ok ? r.json() : [])
            .then(rows => {
              (rows || []).forEach(row => {
                const name = row.name;
                if (!name || seen.has(name)) return;
                seen.add(name);
                const opt = document.createElement('option');
                opt.value = name;
                dl.appendChild(opt);
              });
            })
            .catch(() => {});
        }
      } catch(_) {}
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

    // ===== FALLBACK HANDLER: лупа в шапке (site search) =====
    // Основной handler сидит в main.js (closure над soBtn). Если main.js
    // загрузился раньше DOM-элементов (cached/legacy) или упал на промежуточной
    // ошибке — лупа перестаёт открывать overlay. Этот делегированный handler
    // работает даже если main.js не успел навеситься: ловит клик по
    // #siteSearchBtn (или любому потомку) и переключает .so / .so-backdrop.
    document.addEventListener('click', e => {
      const sBtn = e.target.closest('#siteSearchBtn');
      if (!sBtn) return;
      const so = document.getElementById('so');
      const soBd = document.getElementById('soBackdrop');
      if (!so || !soBd) return;
      // Если main.js уже навесил handler — overlay уже откроется им; делегат
      // только зеркалит поведение, повторное добавление .on безопасно.
      if (!so.classList.contains('on')) {
        so.classList.add('on');
        soBd.classList.add('on');
        setTimeout(() => document.getElementById('soInput')?.focus(), 50);
      }
    });
    // Закрытие overlay по клику на backdrop / Esc — делегат-зеркало.
    document.addEventListener('click', e => {
      if (e.target && e.target.id === 'soBackdrop') {
        const so = document.getElementById('so');
        const soBd = document.getElementById('soBackdrop');
        if (so) so.classList.remove('on');
        if (soBd) soBd.classList.remove('on');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const so = document.getElementById('so');
        if (so && so.classList.contains('on')) {
          so.classList.remove('on');
          const bd = document.getElementById('soBackdrop');
          if (bd) bd.classList.remove('on');
        }
      }
      // ⌘K / Ctrl+K — fallback toggle
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const so = document.getElementById('so');
        const soBd = document.getElementById('soBackdrop');
        if (!so || !soBd) return;
        const open = so.classList.contains('on');
        so.classList.toggle('on', !open);
        soBd.classList.toggle('on', !open);
        if (!open) setTimeout(() => document.getElementById('soInput')?.focus(), 50);
      }
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

  // Find offer ID — supports real UUIDs, URL params, and fallback search
  async function findOfferIdAsync(btn) {
    // 1. Real UUID on button
    if (btn.dataset.offerId && btn.dataset.offerId !== 'demo' && btn.dataset.offerId.includes('-')) {
      return btn.dataset.offerId;
    }
    // 2. Parent card with UUID
    const card = btn.closest('[data-offer]');
    if (card && card.dataset.offer && card.dataset.offer.includes('-')) {
      return card.dataset.offer;
    }
    // 3. URL param ?id= (only if it looks like UUID)
    const params = new URLSearchParams(location.search);
    const urlId = params.get('id');
    if (urlId && urlId.includes('-')) return urlId;

    // 4. Fallback: search by page title
    const titleEl = document.querySelector('h1');
    if (titleEl) {
      const title = titleEl.textContent.trim();
      // Skip generic page titles
      if (title.length > 3 && !title.includes('Купить') && !title.includes('Продавайте') && !title.includes('Покупайте')) {
        try {
          const offers = await api.listOffers({ search: title, limit: 1 });
          if (offers && offers.length) return offers[0].id;
        } catch(e) { console.warn('[findOffer] search failed:', e); }
      }
    }
    return null;
  }

  async function requireLogin(action) {
    const user = await api.currentUser();
    if (!user) {
      // Show custom modal instead of browser confirm()
      const html = `
        <div class="modal-backdrop on"></div>
        <div class="modal on" style="max-width:420px;text-align:center;padding:40px 30px">
          <button class="modal-close">✕</button>
          <div style="font-size:48px;margin-bottom:14px">🔐</div>
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Требуется авторизация</h2>
          <p style="color:var(--slate-500);margin-bottom:24px;line-height:1.6">Чтобы ${escapeHtml(action)}, войдите в аккаунт или зарегистрируйтесь на платформе.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" id="authGoLogin">Войти / Регистрация</button>
            <button class="btn btn-outline modal-close">Отмена</button>
          </div>
        </div>
      `;
      const wrap = openModal(html);
      wrap.querySelector('#authGoLogin').addEventListener('click', () => {
        wrap.remove();
        const bd = document.getElementById('loginBackdrop');
        const modal = document.getElementById('loginModal');
        if (bd) bd.classList.add('on');
        if (modal) modal.classList.add('on');
        document.body.style.overflow = 'hidden';
      });
      return null;
    }
    return user;
  }

  /**
   * Записывает обращение пользователя (купить/откликнуться/предложить цену)
   * в admin_inbox для ручной обработки админом.
   * v2.6.4: использует RPC submit_purchase_lead (вместо прямого INSERT) —
   *         RPC проверяет offer/request, нормализует payload и работает от anon.
   */
  async function sendToAdminInbox({ kind, offer = null, request = null, message = '', volume = null, user = null }) {
    const cfg = window.RH_CONFIG || {};

    try {
      const body = {
        p_kind: kind,
        p_offer_id: offer?.id || null,
        p_request_id: request?.id || null,
        p_volume_tons: volume != null ? volume : (offer?.volume_tons ?? null),
        p_message: message || null,
        p_user_phone: user?.phone || null,
        p_user_email: user?.email || null,
        p_user_name: user?.full_name || user?.company_name || null,
      };
      const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/submit_purchase_lead`, {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const txt = await r.text();
        console.warn('[submit_purchase_lead]', r.status, txt.slice(0, 240));
      } else {
        const result = await r.json().catch(() => null);
        if (result && result.success === false) {
          console.warn('[submit_purchase_lead] RPC reported failure:', result.message);
        }
      }
    } catch(e) {
      console.warn('[submit_purchase_lead] failed:', e.message);
    }

    // Показываем благодарность независимо от того, записалось ли в БД —
    // юзеру важнее увидеть номер телефона/телеграм, чем код ошибки.
    showAdminContactModal(kind, offer || request);
  }

  function showAdminContactModal(kind, item) {
    const cfg = window.RH_CONFIG || {};
    const title = ({
      purchase_request:    'Спасибо! Заявка принята',
      price_proposal:      'Спасибо! Предложение отправлено',
      respond_to_request:  'Спасибо! Отклик отправлен',
    })[kind] || 'Спасибо! Обращение принято';
    const subtitle = ({
      purchase_request:    'Администратор свяжется с вами в течение 30 минут и поможет оформить покупку.',
      price_proposal:      'Администратор передаст ваше предложение продавцу и вернётся с ответом.',
      respond_to_request:  'Администратор передаст ваш отклик покупателю и вернётся с ответом.',
    })[kind] || 'Администратор скоро свяжется с вами.';

    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:460px;text-align:center;padding:36px 30px">
        <button class="modal-close">✕</button>
        <div style="font-size:48px;margin-bottom:14px">✓</div>
        <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">${escapeHtml(title)}</h2>
        <p style="color:var(--slate-500);margin-bottom:18px;line-height:1.55">${escapeHtml(subtitle)}</p>
        ${item?.title ? `<div style="background:var(--slate-50);padding:12px 16px;border-radius:10px;margin-bottom:18px;font-size:13px;color:var(--slate-700)"><b>${escapeHtml(item.title)}</b></div>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          <a class="btn btn-primary" href="tel:${escapeHtml(cfg.SUPPORT_PHONE || '+79300129797')}">📞 Позвонить: ${escapeHtml(cfg.SUPPORT_PHONE || '+7 930 012-97-97')}</a>
          <a class="btn btn-outline" href="https://t.me/${escapeHtml(cfg.SUPPORT_TELEGRAM || 'tdrusagro')}" target="_blank">Написать в Telegram</a>
          <button class="btn btn-outline modal-close">Закрыть</button>
        </div>
      </div>
    `;
    openModal(html);
  }

  async function handlePurchase(btn) {
    const F = window.RH_CONFIG?.FEATURES || {};
    const user = await api.currentUser().catch(() => null);

    const offerId = await findOfferIdAsync(btn);
    if (!offerId) {
      showToast('Не удалось определить оффер. Откройте страницу товара.');
      return;
    }
    const offer = await api.getOffer(offerId).catch(() => null);
    if (!offer) { showToast('Оффер не найден или удалён'); return; }

    // ⏸ Эскроу выключен — направляем в admin_inbox для ручной обработки
    if (!F.escrow_enabled) {
      await sendToAdminInbox({ kind: 'purchase_request', offer, user, volume: offer.volume_tons });
      return;
    }

    // С эскроу — старый flow
    if (!user) { await requireLogin('купить'); return; }
    const withDelivery = btn.dataset.delivery === '1';
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
    const F = window.RH_CONFIG?.FEATURES || {};
    const user = await api.currentUser().catch(() => null);

    const offerId = await findOfferIdAsync(btn);
    if (!offerId) { showToast('Не удалось определить оффер. Откройте страницу товара.'); return; }
    const offer = await api.getOffer(offerId).catch(() => null);
    if (!offer) { showToast('Оффер не найден или удалён'); return; }

    // ⏸ Чат выключен — отправляем в admin_inbox
    if (!F.realtime_chat) {
      await sendToAdminInbox({ kind: 'price_proposal', offer, user });
      return;
    }

    if (!user) { await requireLogin('сделать ценовое предложение'); return; }
    if (user.role === 'seller' && offer.seller_id === user.id) { showToast('Это ваш собственный оффер'); return; }
    if (user.role === 'seller') { showToast('Откликаются на офферы только покупатели'); return; }

    const currentPrice = api.formatRub(offer.price_kopecks);

    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on" style="max-width:480px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:20px;font-weight:700">Ценовое предложение</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">${escapeHtml(offer.title)} · ${offer.volume_tons} т · продавец ${escapeHtml(offer.seller?.handle || '—')}</p>
        </div>
        <form id="proposeForm" style="padding:20px 28px;flex:1;overflow-y:auto">
          <div style="background:var(--slate-50);padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:13px">
            Текущая цена: <b>${currentPrice}/т</b>
          </div>
          <div class="form-group">
            <label>Сообщение продавцу *</label>
            <textarea name="message" rows="4" required placeholder="Готов взять ${Math.min(50, offer.volume_tons)} т по ${Math.round(offer.price_kopecks/100*0.95)} ₽/т, оплата по факту, самовывоз. Готовы обсудить?" style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical"></textarea>
          </div>
          <div style="font-size:12px;color:var(--slate-500);line-height:1.5;background:var(--emerald-soft);padding:10px 14px;border-radius:8px">
            💬 Откроется чат с продавцом. Реквизиты компании скрыты до оформления сделки через эскроу.
          </div>
          <div id="proposeError" style="color:var(--red);font-size:13px;display:none;margin-top:10px"></div>
        </form>
        <div style="padding:16px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close">Отмена</button>
          <button class="btn btn-primary" id="proposeSubmit">Открыть чат с продавцом</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    wrap.querySelector('#proposeSubmit').addEventListener('click', async () => {
      const fd = new FormData(wrap.querySelector('#proposeForm'));
      const message = (fd.get('message') || '').trim();
      const errEl = wrap.querySelector('#proposeError');

      if (!message || message.length < 5) {
        errEl.textContent = 'Напишите сообщение продавцу (минимум 5 символов)';
        errEl.style.display = '';
        return;
      }

      const submit = wrap.querySelector('#proposeSubmit');
      submit.disabled = true;
      submit.textContent = 'Открываем чат…';

      try {
        const result = await api.respondToOffer(offerId, message);
        wrap.remove();
        showToast('✓ Чат открыт');
        // Open the chat modal with full thread
        openChatModal({ thread_id: result.thread_id });
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Открыть чат с продавцом';
      }
    });
  }

  async function handleRespond(btn) {
    const F = window.RH_CONFIG?.FEATURES || {};
    const user = await api.currentUser().catch(() => null);

    const requestId = btn.dataset.requestId;
    let request = null;
    if (requestId && requestId.includes('-')) {
      try {
        const cfg = window.RH_CONFIG || {};
        const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/buyer_requests?id=eq.${requestId}&select=*`, {
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
        });
        if (r.ok) {
          const arr = await r.json();
          request = arr?.[0] || null;
        }
      } catch(_) {}
    }
    // Если запрос не нашли — возьмём данные из карточки
    if (!request) {
      const card = btn.closest('.req-card, [data-request]');
      request = {
        id: requestId,
        title: card?.querySelector('.req-card-title')?.textContent || 'Заявка',
      };
    }

    // ⏸ Чат выключен — пишем в admin_inbox и показываем благодарность
    if (!F.realtime_chat) {
      await sendToAdminInbox({ kind: 'respond_to_request', request, user });
      return;
    }

    // Старый flow с чатом
    if (!user) { await requireLogin('откликнуться на заявку'); return; }

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
      openModal(html);
      return;
    }

    if (!requestId || !requestId.includes('-')) {
      showToast('Эта карточка демонстрационная — откликнитесь на реальную заявку');
      return;
    }

    // Get request card info from DOM
    const card = btn.closest('.req-card, [data-request]');
    const title = card?.querySelector('.req-card-title')?.textContent || 'Заявка';
    const cardVolume = parseFloat(card?.dataset?.volume) || '';

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
            <input name="volume" type="number" min="1" step="1" required ${cardVolume ? `value="${cardVolume}"` : 'placeholder="100"'} />
          </div>
          <div class="form-group">
            <label>Регион / город склада *</label>
            <input name="region" required value="${escapeHtml(user.region || user.city || 'Нижегородская область')}" />
          </div>
          <div class="form-group">
            <label>Сообщение покупателю *</label>
            <textarea name="message" rows="3" required placeholder="Качество — 3 класс, ИДК 78, влажность 12%. Готов отгрузить в течение 5 дней. Самовывоз или доставка." style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical"></textarea>
          </div>
          <div style="font-size:12px;color:var(--slate-500);line-height:1.5;background:var(--emerald-soft);padding:10px 14px;border-radius:8px">
            💬 Откроется чат с покупателем. Реквизиты компании скрыты до оформления сделки через эскроу.
          </div>
          <div id="respondError" style="color:var(--red);font-size:13px;display:none;margin-top:10px"></div>
        </form>
        <div style="padding:16px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline modal-close">Отмена</button>
          <button class="btn btn-primary" id="respondSubmit">Открыть чат и отправить</button>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    wrap.querySelector('#respondSubmit').addEventListener('click', async () => {
      const fd = new FormData(wrap.querySelector('#respondForm'));
      const price = parseFloat(fd.get('price'));
      const volume = parseFloat(fd.get('volume'));
      const region = (fd.get('region') || '').trim();
      const message = (fd.get('message') || '').trim();
      const errEl = wrap.querySelector('#respondError');

      if (!price || price <= 0) { errEl.textContent = 'Укажите цену'; errEl.style.display = ''; return; }
      if (!volume || volume <= 0) { errEl.textContent = 'Укажите объём'; errEl.style.display = ''; return; }
      if (!region) { errEl.textContent = 'Укажите регион'; errEl.style.display = ''; return; }
      if (message.length < 5) { errEl.textContent = 'Напишите сообщение покупателю'; errEl.style.display = ''; return; }

      const submit = wrap.querySelector('#respondSubmit');
      submit.disabled = true;
      submit.textContent = 'Отправляем…';

      try {
        const result = await api.respondToRequest(requestId, {
          price_per_ton: price, volume_tons: volume, message, region
        });
        wrap.remove();
        btn.disabled = true;
        btn.textContent = '✓ Отклик отправлен';
        btn.style.opacity = '.6';
        showToast('✓ Чат с покупателем открыт');
        openChatModal({ thread_id: result.thread_id });
      } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = '';
        submit.disabled = false;
        submit.textContent = 'Открыть чат и отправить';
      }
    });
  }

  // ============================================================
  // CHAT MODAL — full conversation + role-based deal actions
  // ============================================================

  const DEAL_STATUS_LABELS = {
    pending:   { label: 'Ожидает оплаты', cls: 'pending', icon: '⏳' },
    paid:      { label: 'Оплачено · в эскроу', cls: 'active', icon: '💰' },
    shipping:  { label: 'В пути', cls: 'active', icon: '🚚' },
    delivered: { label: 'Доставлено', cls: 'active', icon: '📦' },
    completed: { label: 'Завершена', cls: 'done', icon: '✅' },
    cancelled: { label: 'Отменена', cls: 'cancelled', icon: '❌' },
    disputed:  { label: 'Спор', cls: 'cancelled', icon: '⚠️' }
  };

  // Build the action button list visible to the current user given a deal status & role.
  function dealActionsFor(deal, my_role) {
    const out = [];
    if (!deal) return out;
    const isBuyer  = my_role === 'buyer';
    const isSeller = my_role === 'seller';

    if (deal.status === 'pending') {
      if (isBuyer) out.push({ key: 'paid',     label: 'Я оплатил',           cls: 'btn-primary' });
      out.push(           { key: 'cancelled',  label: 'Отменить сделку',     cls: 'btn-outline' });
    }
    if (deal.status === 'paid') {
      if (isSeller) out.push({ key: 'shipping', label: 'Отгрузил товар',     cls: 'btn-primary' });
      out.push(            { key: 'disputed',   label: 'Открыть спор',       cls: 'btn-outline' });
    }
    if (deal.status === 'shipping') {
      if (isSeller) out.push({ key: 'delivered', label: 'Доставлено',        cls: 'btn-primary' });
      out.push(            { key: 'disputed',    label: 'Открыть спор',      cls: 'btn-outline' });
    }
    if (deal.status === 'delivered') {
      if (isBuyer) out.push({ key: 'completed', label: 'Подтверждаю получение', cls: 'btn-primary' });
      out.push(           { key: 'disputed',    label: 'Открыть спор',           cls: 'btn-outline' });
    }
    return out;
  }

  function renderMessage(m, myId) {
    const isMine = m.sender_id === myId;
    const isSystem = /^[✅🚚📦🎉❌⚠️💼🤝]/u.test(m.body || '');
    const time = new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const handle = m.sender?.handle || (isMine ? 'Вы' : '—');
    if (isSystem) {
      return `
        <div style="text-align:center;margin:16px 0">
          <div style="display:inline-block;background:var(--slate-50);color:var(--slate-700);padding:8px 14px;border-radius:14px;font-size:12.5px;line-height:1.5;max-width:90%;white-space:pre-wrap;text-align:left">${escapeHtml(m.body)}</div>
          <div style="font-size:10.5px;color:var(--slate-400);margin-top:4px">${time}</div>
        </div>
      `;
    }
    const align = isMine ? 'flex-end' : 'flex-start';
    const bg = isMine ? 'var(--brand)' : 'var(--slate-50)';
    const fg = isMine ? '#fff' : 'var(--ink)';
    return `
      <div style="display:flex;justify-content:${align};margin:6px 0">
        <div style="max-width:75%">
          <div style="font-size:11px;color:var(--slate-500);margin-bottom:3px;text-align:${isMine?'right':'left'}">
            ${isMine ? 'Вы' : escapeHtml(handle)} · ${time}
          </div>
          <div style="background:${bg};color:${fg};padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word">${escapeHtml(m.body)}</div>
        </div>
      </div>
    `;
  }

  function renderChatHeader(thread, deal) {
    const cp = thread.counterparty;
    const cpRating = cp?.rating > 0 ? ` · ★ ${parseFloat(cp.rating).toFixed(1)}` : '';
    const cpRegion = cp?.city || cp?.region ? ` · ${escapeHtml(cp.city || cp.region)}` : '';
    const cpVerified = cp?.is_verified ? ' <span style="color:var(--brand);font-size:11px">✓ проверен</span>' : '';

    let contextLine = '';
    let title = 'Переговоры';
    if (deal) {
      title = `Сделка ${deal.deal_number}`;
      contextLine = `${deal.crop?.emoji || '📦'} ${escapeHtml(deal.crop?.name || '')} · ${deal.volume_tons} т · ${api.formatRub(deal.grand_total_kopecks)}`;
    } else if (thread.offer) {
      title = `Переговоры: ${escapeHtml(thread.offer.title)}`;
      contextLine = `${thread.offer.crop?.emoji || '📦'} ${api.formatRub(thread.offer.price_kopecks)}/т · ${thread.offer.volume_tons} т доступно`;
    } else if (thread.request) {
      title = `Заявка: ${escapeHtml(thread.request.title)}`;
      contextLine = `${thread.request.crop?.emoji || '🌾'} ${thread.request.target_price_kopecks ? api.formatRub(thread.request.target_price_kopecks) + '/т · ' : ''}${thread.request.volume_tons} т нужно`;
    }

    let statusBadge = '';
    if (deal) {
      const s = DEAL_STATUS_LABELS[deal.status] || { label: deal.status, cls: 'pending', icon: '·' };
      statusBadge = `<span class="deal-label ${s.cls}" style="margin-left:auto">${s.icon} ${s.label}</span>`;
    }

    return `
      <div style="padding:18px 24px 14px;border-bottom:1px solid var(--slate-100);padding-right:48px">
        <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h2 style="font-size:17px;font-weight:700;margin:0">${title}</h2>
              ${statusBadge}
            </div>
            <div style="margin-top:6px;font-size:13px;color:var(--slate-600)">${contextLine}</div>
            <div style="margin-top:4px;font-size:12.5px;color:var(--slate-500)">
              Контрагент: <b>${escapeHtml(cp?.handle || '—')}</b>${cpRating}${cpRegion}${cpVerified}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // The chat-modal element is reused (not recreated) across opens to keep WS alive on close-and-reopen.
  let _chatChannel = null;
  let _chatDealChannel = null;

  async function openChatModal({ thread_id, deal_id }) {
    const user = await requireLogin('открыть чат');
    if (!user) return;

    // Resolve thread_id from deal_id if needed
    if (!thread_id && deal_id) {
      try {
        const r = await api.startDealThread(deal_id);
        thread_id = r.thread_id;
      } catch(e) {
        showToast(e.message || 'Не удалось открыть чат сделки');
        return;
      }
    }
    if (!thread_id) { showToast('Чат не найден'); return; }

    // Open empty modal first so user sees instant feedback
    const html = `
      <div class="modal-backdrop on"></div>
      <div class="modal on chat-modal" style="max-width:640px;width:96vw;max-height:88vh;height:88vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
        <button class="modal-close">✕</button>
        <div id="chatHeader" style="flex:0 0 auto">
          <div style="padding:40px;text-align:center;color:var(--slate-500)">Загрузка чата…</div>
        </div>
        <div id="chatBody" style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 22px;background:#fafbfc"></div>
        <div id="chatActions" style="flex:0 0 auto;padding:10px 22px;border-top:1px solid var(--slate-100);display:none;flex-wrap:wrap;gap:8px"></div>
        <div id="chatComposer" style="flex:0 0 auto;padding:14px 22px;border-top:1px solid var(--slate-100);background:#fff">
          <form id="msgForm" style="display:flex;gap:10px;align-items:flex-end">
            <textarea id="msgInput" rows="2" placeholder="Напишите сообщение…" style="flex:1;padding:10px 14px;border:1px solid var(--slate-200);border-radius:12px;font-family:inherit;font-size:14px;resize:none;max-height:120px"></textarea>
            <button class="btn btn-primary" id="msgSend" type="submit" style="height:44px;padding:0 18px">Отправить</button>
          </form>
        </div>
      </div>
    `;
    const wrap = openModal(html);

    const headerEl   = wrap.querySelector('#chatHeader');
    const bodyEl     = wrap.querySelector('#chatBody');
    const actionsEl  = wrap.querySelector('#chatActions');
    const formEl     = wrap.querySelector('#msgForm');
    const inputEl    = wrap.querySelector('#msgInput');
    const sendBtn    = wrap.querySelector('#msgSend');
    const myId = user.id;

    let thread = null;
    let messages = [];

    async function refreshHeader() {
      try {
        thread = await api.getThread(thread_id);
        const deal = thread.deal || null;
        headerEl.innerHTML = renderChatHeader(thread, deal);
        // Render action buttons
        const acts = dealActionsFor(deal, thread.my_role);
        if (acts.length === 0) {
          actionsEl.style.display = 'none';
          actionsEl.innerHTML = '';
        } else {
          actionsEl.style.display = 'flex';
          actionsEl.innerHTML = acts.map(a => `
            <button class="btn ${a.cls} btn-sm" data-deal-action="${a.key}">${a.label}</button>
          `).join('');
          actionsEl.querySelectorAll('[data-deal-action]').forEach(btn => {
            btn.addEventListener('click', () => onDealAction(btn.dataset.dealAction, deal));
          });
        }
        // If thread has no deal yet AND I am the buyer, show "Оформить сделку" bar
        if (!deal && thread.my_role === 'buyer') {
          const offerPrice = thread.offer?.price_kopecks ? thread.offer.price_kopecks/100 : '';
          const offerVol = thread.offer?.volume_tons || thread.request?.volume_tons || '';
          actionsEl.style.display = 'flex';
          actionsEl.innerHTML = `<button class="btn btn-primary btn-sm" id="createDealBtn">🤝 Оформить сделку</button>`;
          actionsEl.querySelector('#createDealBtn').addEventListener('click', () => onCreateDeal(thread, offerPrice, offerVol));
        }
      } catch(e) {
        console.warn('[chat header]', e);
      }
    }

    async function refreshMessages(scroll=true) {
      try {
        messages = await api.listMessages(thread_id);
        bodyEl.innerHTML = messages.map(m => renderMessage(m, myId)).join('') ||
          `<div style="padding:40px;text-align:center;color:var(--slate-500);font-size:14px">Сообщений пока нет — напишите первое.</div>`;
        if (scroll) bodyEl.scrollTop = bodyEl.scrollHeight;
      } catch(e) { console.warn('[chat messages]', e); }
    }

    async function onDealAction(key, deal) {
      let comment = '';
      if (key === 'cancelled' || key === 'disputed') {
        comment = window.prompt(key === 'cancelled' ? 'Причина отмены?' : 'Опишите проблему:') || '';
        if (key === 'disputed' && !comment.trim()) { showToast('Опишите суть спора'); return; }
      }
      try {
        await api.advanceDeal(deal.id, key, comment);
        showToast('✓ Статус сделки обновлён');
        await refreshHeader();
        await refreshMessages();
      } catch(e) {
        showToast(e.message || 'Не удалось обновить статус');
      }
    }

    async function onCreateDeal(thread, defaultPrice, defaultVolume) {
      const priceStr  = window.prompt('Финальная цена за тонну (₽)?', defaultPrice ? String(Math.round(defaultPrice)) : '');
      if (priceStr === null) return;
      const volumeStr = window.prompt('Объём (т)?', defaultVolume ? String(defaultVolume) : '');
      if (volumeStr === null) return;
      const addr      = window.prompt('Адрес доставки (опционально):', '') || '';

      const price = parseFloat(priceStr);
      const volume = parseFloat(volumeStr);
      if (!price || !volume) { showToast('Цена и объём обязательны'); return; }

      try {
        const r = await api.createDealFromThread(thread.id, {
          price_per_ton: price, volume_tons: volume, delivery_address: addr
        });
        showToast('✓ Сделка оформлена. Покупатель — переходите к оплате.');
        await refreshHeader();
        await refreshMessages();
        // Subscribe to the newly-created deal for realtime status updates
        if (r?.deal_id && !_chatDealChannel) {
          _chatDealChannel = await api.subscribeToDeal(r.deal_id, async () => {
            await refreshHeader();
          });
        }
      } catch(e) {
        showToast(e.message || 'Не удалось оформить сделку');
      }
    }

    // Submit handler
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = inputEl.value.trim();
      if (!body) return;
      sendBtn.disabled = true;
      try {
        await api.sendMessage(thread_id, body);
        inputEl.value = '';
      } catch(err) {
        showToast(err.message || 'Не удалось отправить');
      } finally {
        sendBtn.disabled = false;
        inputEl.focus();
      }
    });

    // Enter to send, Shift+Enter for new line
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        formEl.requestSubmit();
      }
    });

    // Initial load
    await refreshHeader();
    await refreshMessages();
    api.markThreadRead(thread_id);

    // Realtime subscription — new messages append, deal updates re-render header
    if (_chatChannel) { try { _chatChannel.unsubscribe(); } catch(_){} _chatChannel = null; }
    if (_chatDealChannel) { try { _chatDealChannel.unsubscribe(); } catch(_){} _chatDealChannel = null; }

    _chatChannel = await api.subscribeToThread(thread_id, async (event, payload) => {
      if (event === 'new_message') {
        // If it's our own message we already have it from the optimistic INSERT; skip duplicate
        if (messages.some(m => m.id === payload.id)) return;
        await refreshMessages();
        if (payload.sender_id !== myId) {
          api.markThreadRead(thread_id);
        }
      }
    });

    if (thread.deal_id) {
      _chatDealChannel = await api.subscribeToDeal(thread.deal_id, async () => {
        await refreshHeader();
      });
    }

    // Cleanup on close
    const cleanup = () => {
      if (_chatChannel) { try { _chatChannel.unsubscribe(); } catch(_){} _chatChannel = null; }
      if (_chatDealChannel) { try { _chatDealChannel.unsubscribe(); } catch(_){} _chatDealChannel = null; }
    };
    // openModal binds modal-close click → wrap.remove(); piggyback via MutationObserver
    const observer = new MutationObserver(() => {
      if (!document.body.contains(wrap)) { cleanup(); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true });
  }

  // Expose for direct linking from elsewhere
  window.openChatModal = openChatModal;

  // ============================================================
  // THREAD LIST — pre-deal negotiations panel in account page
  // ============================================================

  async function loadUserThreads(user) {
    const list = document.getElementById('threadsList');
    if (!list) return;
    try {
      const threads = await api.listMyThreads();
      // Show only threads without a deal (active negotiations)
      const active = threads.filter(t => !t.deal_id);
      if (!active.length) {
        return; // keep empty state
      }
      list.innerHTML = active.slice(0, 20).map(t => {
        const cp = t.counterparty;
        const cpHandle = cp?.handle || '—';
        const ctx = t.offer ? ('💼 ' + (t.offer.title || ''))
                  : t.request ? ('📋 ' + (t.request.title || 'Заявка'))
                  : 'Чат';
        const last = t.last_message_at ? new Date(t.last_message_at).toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
        const unread = t.unread_count > 0 ? `<span style="background:var(--brand);color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px">${t.unread_count}</span>` : '';
        return `
          <div class="deal-row" data-action="open-thread" data-thread-id="${t.id}" style="cursor:pointer">
            <div class="deal-status pending">💬</div>
            <div class="deal-info">
              <div class="title">${escapeHtml(ctx)}${unread}</div>
              <div class="meta">
                <span>с ${escapeHtml(cpHandle)}</span>
                ${last ? `<span class="dot">·</span><span>${last}</span>` : ''}
              </div>
            </div>
            <div class="deal-actions">
              <button class="btn btn-primary btn-sm">Открыть чат →</button>
            </div>
          </div>
        `;
      }).join('');
      list.querySelectorAll('[data-action="open-thread"]').forEach(row => {
        row.addEventListener('click', () => openChatModal({ thread_id: row.dataset.threadId }));
      });
    } catch(e) { console.warn('[threads]', e); }
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
  // ВАЖНО: эта IIFE отдельная от первой — поэтому объявляем api здесь же
  // через window.RH_API, иначе ReferenceError → весь блок не выполнится.
  if (!window.RH_API) return;
  const api = window.RH_API;
  if (!api.isSupabase) return;

  // Локальный escapeHtml (тот, что в первой IIFE, недоступен из этого замыкания)
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // ============================================================
  // SANITIZERS — чистка данных от 1С перед показом
  // ============================================================
  // Поставщики кладут в title хвосты с компаниями/адресами/районами.
  // На публичной карточке клиент не должен видеть "ООО Заречье, Рязанская обл." —
  // только сам товар. Чистка строго клиентская, БД не правится.
  function sanitizeOfferTitle(s) {
    if (!s) return '';
    let t = String(s).trim();
    // 1. Срез по тире/дефису с пробелами (em-dash, en-dash, hyphen)
    t = t.split(/\s+[—–-]\s+/)[0];
    // 2. Срез скобок с юр.формами / адресами
    t = t.replace(/\s*\((?:ООО|ИП|СПК|АО|ОАО|ЗАО|КФХ|ТД|ФХ|ОП|НПО)[^)]*\)/gi, '');
    t = t.replace(/\s*\([^)]*(?:обл\.|область|район|р-н|край|респ\.|респ )[^)]*\)/gi, '');
    // 3. Триггеры юр.форм и адресов: "ООО ...", "ИП Иванов ...", ", Рязанская обл.", ", Тульский р-н"
    t = t.replace(/[\s,]+(?:ООО|ИП|СПК|АО|ОАО|ЗАО|КФХ|ТД|ФХ|ОП|НПО)\s.+$/i, '');
    t = t.replace(/[\s,]+(?:[А-ЯЁA-Z][а-яёa-z]+(?:ская|ский|ское|ской)?\s+(?:обл\.?|область|край|респ\.?|респ\s)).*$/i, '');
    // \b на кириллице в JS не работает — заменили на (?=\s|$|,)
    t = t.replace(/[\s,]+(?:[А-ЯЁA-Z][а-яёa-z]+\s+)?(?:р-н|район)(?=\s|$|,).*$/i, '');
    t = t.replace(/[\s,]+(?:с\.|с\s|д\.|д\s|пос\.|пос\s|г\.|г\s|пгт\.|пгт\s)\s*\S.*$/i, '');
    return t.trim().replace(/[\s,]+$/, '');
  }

  // Русские лейблы для технических ключей quality jsonb (case-insensitive lookup ниже).
  // Ключи здесь — всегда lowercase. Включает транслитерации, которые льёт 1С.
  const Q_LABELS = {
    // Соответствие
    gost: 'Соответствие ГОСТ',
    iso: 'Соответствие ISO',
    // Клейковина
    gluten: 'Клейковина',
    gluten_pct: 'Клейковина, %',
    klejkovina: 'Клейковина',
    klejkovina_pct: 'Клейковина, %',
    klejk: 'Клейковина',
    klejk_pct: 'Клейковина, %',
    // Белок
    protein: 'Белок',
    protein_pct: 'Белок, %',
    belok: 'Белок',
    belok_pct: 'Белок, %',
    // Влажность
    moisture: 'Влажность',
    moisture_pct: 'Влажность, %',
    moisture_content: 'Влажность',
    vlaga: 'Влажность',
    vlaga_pct: 'Влажность, %',
    vlazhnost: 'Влажность',
    vlazhnost_pct: 'Влажность, %',
    // Масличность
    oil: 'Масличность',
    oil_pct: 'Масличность, %',
    oil_content: 'Масличность',
    maslichnost: 'Масличность',
    maslichnost_pct: 'Масличность, %',
    // Число падения
    falling_number: 'Число падения',
    falling_num: 'Число падения',
    chp: 'Число падения',
    chislo_padeniya: 'Число падения',
    // АСВ (абсолютно сухое вещество / сырая клейковина — оставляем как «АСВ»)
    asv: 'АСВ',
    asv_pct: 'АСВ, %',
    // Натура
    nature: 'Натура',
    natura: 'Натура',
    natura_gl: 'Натура, г/л',
    weight_per_litre: 'Натура, г/л',
    // Зольность
    ash: 'Зольность',
    ash_pct: 'Зольность, %',
    ash_content: 'Зольность',
    zolnost: 'Зольность',
    zolnost_pct: 'Зольность, %',
    // Примеси
    impurity: 'Сорная примесь',
    impurity_pct: 'Сорная примесь, %',
    weed_impurity: 'Сорная примесь',
    weed_pct: 'Сорная примесь, %',
    sornaya_primes: 'Сорная примесь',
    grain_impurity: 'Зерновая примесь',
    grain_impurity_pct: 'Зерновая примесь, %',
    zernovaya_primes: 'Зерновая примесь',
    primesi: 'Примеси',
    // Повреждения
    damaged: 'Повреждённые зёрна',
    damaged_pct: 'Повреждённые зёрна, %',
    broken: 'Битые зёрна',
    broken_pct: 'Битые зёрна, %',
    // Прочие показатели
    class: 'Класс',
    klass: 'Класс',
    grade: 'Класс',
    variety: 'Сорт',
    sort: 'Сорт',
    crop_year: 'Год урожая',
    harvest_year: 'Год урожая',
    starch: 'Крахмал',
    starch_pct: 'Крахмал, %',
    krahmal: 'Крахмал',
    fat: 'Жирность',
    fat_pct: 'Жирность, %',
    fiber: 'Клетчатка',
    fiber_pct: 'Клетчатка, %',
    sediment: 'Седиментация',
    color: 'Цвет',
    smell: 'Запах',
    extractivity: 'Экстрактивность',
    germination: 'Всхожесть',
    germination_pct: 'Всхожесть, %',
    type: 'Тип',
    gmo: 'ГМО',
    pesticides: 'Пестициды',
    radiation: 'Радионуклиды',
    // Прорастаемость
    prorost: 'Проросшие зёрна',
    prorost_pct: 'Проросшие зёрна, %'
  };

  // Case-insensitive lookup: 1С может прислать "Klejkovina_pct" вместо "klejkovina_pct"
  function qLabelFor(key) {
    if (!key) return '';
    const lk = String(key).toLowerCase();
    if (Q_LABELS[lk]) return Q_LABELS[lk];
    // Если ключ выглядит как технический (латиница + _), декорируем первой заглавной
    if (/^[a-zа-я_]+$/i.test(key)) return key.charAt(0).toUpperCase() + key.slice(1);
    return key;
  }

  // Если ключ заканчивается на _pct и в значении нет «%», дописываем единицу.
  // Это спасает случай, когда лейбл уже несёт «, %» — браузер не покажет дубль.
  function qFormatValue(key, value) {
    if (value == null) return '';
    const s = String(value).trim();
    if (!s) return '';
    const lk = String(key || '').toLowerCase();
    // лейбл «Клейковина, %» уже содержит %, поэтому в value % не добавляем
    return s;
  }

  // Операционная каша от менеджеров 1С, которая не относится к качеству
  const Q_NOISE_PATTERNS = [
    /весь\s*объ[её]м/i,
    /готов[ао]?\s*продать/i,
    /продаётся/i,
    /продается/i,
    /available/i,
    /на\s*склад/i,
    /отгруз/i,
    /ждёт.*цен/i,
    /ждет.*цен/i,
    /нужна\s*цен/i,
    /не\s*помнит/i,
    /говорит/i,
    /хорошо/i,
    /^\s*-?\s*$/,
    /^нет$/i,
    /^none$/i,
    /^null$/i,
    /^—+$/
  ];

  function isNoise(v) {
    if (v == null || v === '') return true;
    const s = String(v).trim();
    if (!s) return true;
    return Q_NOISE_PATTERNS.some(re => re.test(s));
  }

  // Ключи raw/notes — всегда свободный текст менеджера. Структурированные данные
  // лежат в *_pct полях рядом. Никогда не рендерим raw/notes в публичной карточке.
  const Q_ALWAYS_DROP = new Set(['raw', 'notes', 'comment', 'comments', 'note', 'manager_note', 'kommentarij']);

  // Приводим quality jsonb к виду [{label, value}], отфильтровывая мусор
  // и схлопывая дубли. Дедуп по паре (label+value) — чтобы две истинно разные
  // характеристики со значением «Да» (например, ГОСТ и Лаб.анализ) обе сохранились,
  // а два gost-флага не повторились.
  function sanitizeQuality(q) {
    if (!q || typeof q !== 'object') return [];
    const out = [];
    const seenPairs = new Set();
    for (const [k, raw] of Object.entries(q)) {
      if (raw == null) continue;
      const lk = String(k).toLowerCase();
      if (Q_ALWAYS_DROP.has(lk)) continue;
      let value;
      if (typeof raw === 'boolean') {
        value = raw ? 'Да' : 'Нет';
      } else if (typeof raw === 'number') {
        value = String(raw);
      } else {
        const s = String(raw).trim();
        if (isNoise(s)) continue;
        value = s;
      }
      value = qFormatValue(k, value);
      if (!value) continue;
      const label = qLabelFor(k);
      const pair = label.toLowerCase() + '::' + value.toLowerCase();
      if (seenPairs.has(pair)) continue;
      seenPairs.add(pair);
      out.push({ label, value });
    }
    return out;
  }

  /**
   * v2.6.22: ЕДИНЫЙ РЕНДЕРЕР качества. До этого каталог рендерил из o.quality (jsonb),
   * а страница продукта — из flat.quality_specs (массив normalized). Это давало РАЗНЫЙ
   * вид одного и того же оффера: в карточке одни параметры, после клика — другие.
   *
   * Теперь единая функция собирает данные из ОБОИХ источников, прогоняет через
   * один и тот же sanitize-движок (qLabelFor + qFormatValue + isNoise + Q_ALWAYS_DROP)
   * и возвращает уже отдедуплицированный массив [{label, value}].
   *
   * Приоритеты при коллизии (один параметр в обоих источниках):
   *   quality_specs (нормализованная таблица) > quality jsonb (legacy)
   * — quality_specs обычно заполняется явно менеджером или RPC, jsonb приходит
   *   сырым из 1С и нужен только если specs пустой.
   *
   * @param {Object} offer  — оффер с полями quality (jsonb) и/или quality_specs (array)
   * @returns {Array<{label, value}>}
   */
  function renderQualityRows(offer) {
    if (!offer) return [];
    const out = [];
    const seenPairs = new Set();
    const seenLabels = new Set();   // для приоритета specs над jsonb

    // 1) Сначала specs (выше приоритет)
    if (Array.isArray(offer.quality_specs)) {
      for (const s of offer.quality_specs) {
        if (!s || s.value == null || s.value === '') continue;
        const key = String(s.param_key || '').toLowerCase();
        if (!key || Q_ALWAYS_DROP.has(key)) continue;
        if (isNoise(s.value)) continue;
        const label = qLabelFor(s.param_key);
        const value = qFormatValue(s.param_key, s.value);
        if (!value) continue;
        const pair = label.toLowerCase() + '::' + value.toLowerCase();
        if (seenPairs.has(pair)) continue;
        seenPairs.add(pair);
        seenLabels.add(label.toLowerCase());
        out.push({ label, value });
      }
    }

    // 2) Затем quality jsonb — только те ключи, чьи лейблы ещё не показаны
    const fromJsonb = sanitizeQuality(offer.quality);
    for (const row of fromJsonb) {
      const lblLow = row.label.toLowerCase();
      if (seenLabels.has(lblLow)) continue;   // specs победил — не дублируем
      const pair = lblLow + '::' + row.value.toLowerCase();
      if (seenPairs.has(pair)) continue;
      seenPairs.add(pair);
      out.push(row);
    }

    return out;
  }

  // ============================================================
  // DIAGNOSTIC HELPERS
  // ============================================================
  // Активируется через ?debug=1 в URL. Выводит на страницу
  // развёрнутый отчёт о том, что отвечает Supabase.
  const DEBUG = new URLSearchParams(location.search).has('debug');
  const __diag = [];
  function diagLog(label, data) {
    __diag.push({ label, data, ts: new Date().toISOString().slice(11,23) });
    if (DEBUG) console.log('[diag]', label, data);
  }
  function renderDiag(grid) {
    if (!DEBUG || !grid) return;
    const html = '<div style="grid-column:1/-1;background:#1a1a1a;color:#9efa9e;font-family:monospace;font-size:12px;padding:20px;border-radius:8px;white-space:pre-wrap;line-height:1.5;overflow:auto;max-height:600px">'
      + '<div style="color:#fff;font-weight:700;margin-bottom:10px;font-size:14px">🔍 ДИАГНОСТИКА КАТАЛОГА</div>'
      + __diag.map(e => `<div><span style="color:#888">[${e.ts}]</span> <span style="color:#fc6">${escapeHtml(e.label)}</span>\n${escapeHtml(typeof e.data === 'string' ? e.data : JSON.stringify(e.data, null, 2))}</div>`).join('\n\n')
      + '</div>';
    grid.insertAdjacentHTML('afterbegin', html);
  }

  /**
   * Прямой вызов RPC offers_with_distance, минуя api.js.
   * Сделан defense-in-depth: если на проде закэширован старый api.js
   * (без последних правок), эта функция всё равно работает.
   * Возвращает массив офферов в формате, готовом для renderCatalogCard.
   */
  async function fetchOffersDirect() {
    const cfg = window.RH_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw new Error('SUPABASE_URL/KEY не сконфигурированы');

    // Координаты — единый источник истины: localStorage > __rh_user_coords > профиль > НН
    let lat = 56.3269, lng = 44.0075;
    try {
      // Приоритет 1: localStorage (читается синхронно, без race condition)
      if (typeof window.RH_getCity === 'function') {
        const c = window.RH_getCity();
        if (c?.lat && c?.lng) { lat = parseFloat(c.lat); lng = parseFloat(c.lng); }
      } else {
        const raw = localStorage.getItem('rh_city');
        if (raw) {
          const c = JSON.parse(raw);
          if (c?.lat && c?.lng) { lat = parseFloat(c.lat); lng = parseFloat(c.lng); }
        }
      }
    } catch(_) {}
    // Приоритет 2: глобальные __rh_user_coords (для случая если localStorage недоступен)
    if ((lat === 56.3269 && lng === 44.0075) && window.__rh_user_coords?.lat && window.__rh_user_coords?.lng) {
      lat = parseFloat(window.__rh_user_coords.lat);
      lng = parseFloat(window.__rh_user_coords.lng);
    }

    const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/offers_with_distance`, {
      method: 'POST',
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ p_lat: lat, p_lng: lng })
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
    }
    const rows = await r.json();
    return (rows || []).map(o => ({
      ...o,
      crop: o.crop_name ? { name: o.crop_name, emoji: o.crop_emoji, category: o.crop_category } : null,
      seller: o.seller_handle ? {
        id: o.seller_id, handle: o.seller_handle, role: o.seller_role,
        rating: o.seller_rating, deals_count: o.seller_deals_count,
        is_verified: o.seller_is_verified, city: o.seller_city, region: o.seller_region
      } : null,
    }));
  }

  // Catalog: replace #offersGrid contents with offers from DB
  async function syncCatalog() {
    const grid = document.getElementById('offersGrid');
    if (!grid) return;

    diagLog('start', { url: location.href, debug: DEBUG });
    try {
      // Читаем актуальный город из localStorage (через RH_getCity если доступен)
      // НЕ перезаписываем профилем БД — единый источник истины это localStorage
      try {
        const c = (typeof window.RH_getCity === 'function')
          ? window.RH_getCity()
          : JSON.parse(localStorage.getItem('rh_city') || 'null');
        if (c?.name) window.__rh_user_city = c.name;
      } catch(_) {}
      if (!window.__rh_user_city) window.__rh_user_city = 'Нижний Новгород';

      // Кеш на всю страницу — чтобы syncFocus/syncHomeOffers не дёргали RPC ещё раз
      let offers = window.__rh_offers_cache || null;
      let lastError = null;

      // Шаг 1: RPC напрямую через fetch (минует api.js — работает даже если api.js закэширован старый)
      if (!offers) {
        try {
          const t0 = performance.now();
          offers = await fetchOffersDirect();
          window.__rh_offers_cache = offers;
          diagLog('fetchOffersDirect OK', { count: offers.length, ms: Math.round(performance.now()-t0) });
        } catch(e) {
          lastError = e;
          diagLog('fetchOffersDirect FAILED', { message: e?.message });
          console.warn('[catalog] direct RPC failed', e);
        }
      }

      // Шаг 2: api.listOffers как fallback (если api.js свежий и есть листинг без RPC)
      if (!offers || !offers.length) {
        try {
          const t0 = performance.now();
          offers = await api.listOffers({ limit: 100 });
          diagLog('listOffers OK', { count: offers?.length || 0, ms: Math.round(performance.now()-t0) });
        } catch(e) {
          lastError = e;
          diagLog('listOffers FAILED', { message: e?.message, code: e?.code, hint: e?.hint, details: e?.details });
        }
      }

      // Шаг 3: raw REST fetch без джойнов (последний крик о помощи)
      if (!offers || !offers.length) {
        try {
          const cfg = window.RH_CONFIG;
          const url = `${cfg.SUPABASE_URL}/rest/v1/offers?select=id,title,status,price_kopecks,region,city,crop_id,seller_id,volume_tons,vat,quality,expires_at,created_at,is_premium,premium_tier,premium_until,harvest_year,has_delivery,has_lab_analysis&status=eq.active&limit=100`;
          const r = await fetch(url, { headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }});
          const body = await r.text();
          diagLog('raw GET /offers', { status: r.status, statusText: r.statusText, body_preview: body.slice(0, 300) });
          if (r.ok) {
            const rows = JSON.parse(body);
            offers = (rows || []).map(o => ({ ...o, crop: null, seller: null, distance_km: null }));
          }
        } catch(e) {
          diagLog('raw GET /offers FAILED', { message: e?.message });
        }
      }

      // Если всё ещё пусто и была ошибка — показываем подробное сообщение
      if (!offers || !offers.length) {
        const msg = lastError ? `Ошибка БД: ${lastError.message || lastError}` : 'Пока нет активных предложений';
        const hint = lastError
          ? 'Откройте каталог с <code>?debug=1</code> для деталей или проверьте Supabase Dashboard → Table Editor → offers (есть ли строки со status=\'active\') и RLS-политики для anon.'
          : 'В таблице <code>offers</code> нет ни одной строки со status=\'active\'. Залейте данные через Supabase Dashboard или 1С-pipeline.';
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--slate-500)">
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:${lastError ? '#b00020' : 'inherit'}">${escapeHtml(msg)}</div>
          <div style="font-size:13px;max-width:560px;margin:0 auto">${hint}</div>
        </div>`;
        renderDiag(grid);
        const counter = document.getElementById('filterCount');
        if (counter) counter.textContent = '0';
        window.dispatchEvent(new CustomEvent('rh:catalog-loaded'));
        return;
      }

      grid.innerHTML = offers.map(o => renderCatalogCard(o)).join('');

      // Update total counter (filter sidebar)
      const counter = document.getElementById('filterCount');
      if (counter) counter.textContent = offers.length;

      // Считаем оффера в двух разрезах:
      //  1) по полному crop_id (wheat-3, corn-silage) — для подкатегорий-чекбоксов
      //  2) по parent (wheat, corn) — для чипсов сверху и родительских чекбоксов
      const cropCounts = {};   // полный id → count
      const parentCounts = {}; // родитель → count
      offers.forEach(o => {
        const id = o.crop_id;
        if (!id) return;
        cropCounts[id] = (cropCounts[id] || 0) + 1;
        const parent = id.split('-')[0];
        parentCounts[parent] = (parentCounts[parent] || 0) + 1;
      });

      // Чипсы сверху (data-chip-crop=wheat / barley / corn / ...) — используют parent
      document.querySelectorAll('[data-chip-crop]').forEach(chip => {
        const crop = chip.dataset.chipCrop;
        if (crop === 'all') {
          const span = chip.querySelector('span');
          if (span) span.textContent = String(offers.length);
          return;
        }
        const n = parentCounts[crop] || 0;
        const span = chip.querySelector('span');
        if (span) span.textContent = String(n);
      });

      // Чекбоксы в сайдбаре: для родителей — parentCounts, для подкатегорий — cropCounts
      document.querySelectorAll('.filter-check input[data-filter="crop"]').forEach(cb => {
        const v = cb.value;
        const isParent = !v.includes('-');
        const count = isParent ? (parentCounts[v] || 0) : (cropCounts[v] || 0);
        const lbl = cb.closest('.filter-check');
        const countEl = lbl?.querySelector('.count');
        if (countEl) countEl.textContent = String(count);
      });

      // Re-trigger filter handlers if they exist
      window.dispatchEvent(new CustomEvent('rh:catalog-loaded'));
      diagLog('rendered', { cards: offers.length });
      renderDiag(grid);
    } catch(e) {
      console.error('[Catalog] DB sync failed:', e);
      diagLog('outer catch', { message: e?.message, stack: e?.stack?.slice(0, 500) });
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--slate-500)"><div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#b00020">Не удалось загрузить предложения</div><div style="font-size:13px;max-width:560px;margin:0 auto">' + (e?.message ? escapeHtml(String(e.message)) : 'Проверьте подключение и обновите страницу.') + '<br><br>Откройте каталог с <code>?debug=1</code> для подробной диагностики.</div></div>';
      renderDiag(grid);
      const counter = document.getElementById('filterCount');
      if (counter) counter.textContent = '0';
      window.dispatchEvent(new CustomEvent('rh:catalog-loaded'));
    }
  }

  function renderCatalogCard(o) {
    // crop family для фильтра-родителя (wheat-3 → wheat) + полный id для подкатегории
    const cropFull = o.crop_id || '';
    const cropParent = cropFull.split('-')[0] || 'other';
    // data-crop содержит оба токена через пробел — фильтр поддерживает multi-token match
    const cropDataAttr = cropParent === cropFull ? cropParent : `${cropParent} ${cropFull}`;
    const cropKey = cropParent;
    const priceR = (o.price_kopecks / 100).toLocaleString('ru-RU');
    const vatLabel = ({with_vat_5: 'с НДС 5%', with_vat_7: 'с НДС 7%', with_vat_10: 'с НДС 10%', with_vat_20: 'с НДС 20%', with_vat_22: 'с НДС 22%', without_vat: 'без НДС'})[o.vat] || 'с НДС';
    // Real Haversine distance from user's city (computed server-side via offers_with_distance RPC)
    // Fallback to text-based estimate when offer has no city_id linked yet.
    const distance = (o.distance_km != null) ? o.distance_km : estimateDistance(o);
    const cityFrom = o.city || o.region || '—';
    // Anonymized seller handle from profiles_public — нужен ниже для возможных шильдиков
    const sellerSid = o.seller?.handle || ('A-' + (o.seller?.id || o.id || '').slice(-4).toUpperCase());
    // Уникальный номер ЛОТА — на основе UUID оффера, не селлера.
    // Все офферы из 1С-импорта идут под одним системным селлером, поэтому
    // sellerSid у них совпадает и шильдик "Лот" выглядит одинаковым на всех карточках.
    const lotSid = 'L-' + String(o.id || '').replace(/-/g, '').slice(-5).toUpperCase();

    // VIP / premium classes
    const isPremium = o.is_premium && (!o.premium_until || new Date(o.premium_until) > new Date());
    // Не используем card-featured — текущий CSS делает её нечитаемой
    // (тёмно-зелёный фон + белый текст конфликтуют). Оставляем обычную карточку
    // и небольшой VIP-бейдж в углу.
    const cardCls = 'card';
    const vipBadge = isPremium
      ? `<span class="badge" style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#3d2900;font-weight:700;letter-spacing:.04em">⭐ VIP</span>`
      : '';

    // Active until — use offer.expires_at if exists, otherwise default to created+30d
    let activeUntil = '—';
    if (o.expires_at) {
      activeUntil = new Date(o.expires_at).toLocaleDateString('ru-RU');
    } else if (o.created_at) {
      const d = new Date(o.created_at);
      d.setDate(d.getDate() + 30);
      activeUntil = d.toLocaleDateString('ru-RU');
    }

    // v2.6.22: единый источник истины — renderQualityRows() обрабатывает
    // и quality jsonb, и quality_specs (если RPC отдаст). Тот же путь
    // используется на странице продукта — карточка и продукт показывают одно.
    const qClean = renderQualityRows(o);
    const qRows = qClean.map(({ label, value }) => `
      <div class="q-row"><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(value)}</span></div>
    `).join('');
    const qWord = qClean.length === 1 ? 'параметр' : (qClean.length < 5 ? 'параметра' : 'параметров');

    // Чистим название от хвостов с компаниями/адресами
    const cleanTitle = sanitizeOfferTitle(o.title);

    return `
      <article class="${cardCls}"
        data-offer="${o.id}" data-crop="${cropDataAttr}" data-region="${escapeHtml(o.region)}"
        data-price="${o.price_kopecks/100}" data-distance="${distance}"
        data-delivery="${o.has_delivery ? '1' : '0'}"
        data-vat="${o.vat !== 'without_vat' ? '1' : '0'}"
        data-premium="${isPremium ? '1' : '0'}"
        data-title="${escapeHtml(cleanTitle)}">
        <!-- Ячейки для list-view (скрыты в grid через CSS).
             v2.6.4: Заголовок — настоящий <span> (не ::before content), порядок
             совпадает с grid-template-columns в .cards-grid.list-view .card -->
        <span class="card-list-cell title">${escapeHtml(cleanTitle)}</span>
        <span class="card-list-cell muted">${escapeHtml(o.crop?.name || cropFull || '—')}</span>
        <span class="card-list-cell price">${priceR} ₽/т</span>
        <span class="card-list-cell">${o.volume_tons || '—'} т</span>
        <span class="card-list-cell muted">${escapeHtml(o.region || '—')}</span>
        <span class="card-list-cell muted">${distance != null ? distance + ' км' : '—'}</span>
        <span class="card-list-cell cta"><a href="/product.html?id=${o.id}">Купить</a></span>

        <div class="card-head">
          <div class="card-top">
            <div>
              ${vipBadge}
              <h3 class="card-title">${escapeHtml(cleanTitle)}</h3>
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
          <div class="card-meta" style="margin-top:8px">
            <div class="cell"><div class="k">Активно до</div><div class="v">${activeUntil}</div></div>
          </div>
        </div>
        ${qClean.length > 0 ? `
          <button class="q-toggle" data-q="${o.id}" type="button" aria-expanded="false">
            <span class="lbl">
              <span class="lbl-ic">ⓘ</span>
              Показатели качества
            </span>
            <span class="right"><span class="count">${qClean.length} ${qWord}</span><span class="chev">▼</span></span>
          </button>
          <div class="q-body" data-q="${o.id}" hidden><div class="q-body-inner">${qRows}</div></div>
        ` : ''}
        <div class="distance-strip">
          <div class="distance-from">
            <span class="pin-ic">📍</span>
            <div>
              <div class="route">${escapeHtml(cityFrom)} → ${escapeHtml(window.__rh_user_city || 'Нижний Новгород')}</div>
              <div class="km"><b>${distance}</b> км до вас</div>
            </div>
          </div>
        </div>
        <div class="supplier-strip">
          <span class="supplier-verify"><span class="bc">✓</span>Проверено платформой</span>
          <div class="supplier-stat">
            <span data-feature="escrow">Эскроу-защита</span>
            <span class="dot" data-feature="escrow"></span>
            <span class="id mono" style="font-family:'JetBrains Mono',monospace">Лот ${escapeHtml(lotSid)}</span>
          </div>
        </div>
        <div class="card-foot">
          <a class="cta" href="/product.html?id=${o.id}">Купить →</a>
        </div>
      </article>
    `;
  }

  // Quick distance estimate from region name (matches the static catalog ordering)
  // Захардкоженные дистанции от Заволжья (legacy fallback v2.6.x).
  // Используется только если оффер в БД БЕЗ warehouse_lat/lng,
  // или RH_GEO не смог отрезолвить регион.
  const REGION_DISTANCES = {
    'Нижний Новгород': 18, 'Кстово': 24, 'Богородск': 45, 'Балахна': 39, 'Дзержинск': 38,
    'Семёнов': 71, 'Павлово': 79, 'Лысково': 92, 'Арзамас': 112, 'Муром': 137,
    'Сергач': 158, 'Выкса': 186, 'Ковров': 195, 'Иваново': 207, 'Касимов': 223,
    'Чебоксары': 235, 'Владимир': 248, 'Йошкар-Ола': 273, 'Рязань': 287,
    'Пенза': 340, 'Тамбов': 378, 'Ульяновск': 402, 'Казань': 407, 'Саранск': 413,
    'Тула': 428, 'Балаково': 539, 'Воронеж': 580, 'Самара': 612, 'Липецк': 634, 'Саратов': 689
  };

  // v2.6.27: координаты пользователя по умолчанию — Заволжье (Нижегородская обл.)
  // TODO: брать из выбранного юзером региона в виджете «Заволжье / изменить»
  const USER_COORDS = { lat: 56.6398, lng: 43.3848 };

  /**
   * Считает дистанцию от пользователя до точки.
   * Каскад: warehouse_lat/lng → RH_GEO по region/city → legacy словарь → 250 по дефолту.
   *
   * @param {Object} item — может быть offer {warehouse_lat, warehouse_lng, region, city}
   *                        или request {delivery_lat, delivery_lng, delivery_region, delivery_city}
   * @returns {number} км
   */
  function estimateDistance(item) {
    // Если строка — старый вызов с одним region. Просто словарь.
    if (typeof item === 'string') return REGION_DISTANCES[item] || 250;
    if (!item) return 250;

    // 1. Самый точный — точки из БД
    const lat = item.warehouse_lat || item.delivery_lat;
    const lng = item.warehouse_lng || item.delivery_lng;
    if (lat != null && lng != null && window.RH_GEO) {
      return window.RH_GEO.distance(USER_COORDS.lat, USER_COORDS.lng, Number(lat), Number(lng));
    }

    // 2. Через справочник regions/cities из города или региона
    const region = item.region || item.delivery_region;
    const city   = item.city   || item.delivery_city;
    if (window.RH_GEO && (region || city)) {
      const geo = window.RH_GEO.resolve({ region, city });
      if (geo) {
        return window.RH_GEO.distance(USER_COORDS.lat, USER_COORDS.lng, geo.lat, geo.lng);
      }
    }

    // 3. Legacy словарь
    if (city && REGION_DISTANCES[city]) return REGION_DISTANCES[city];
    if (region && REGION_DISTANCES[region]) return REGION_DISTANCES[region];

    // 4. Дефолт
    return 250;
  }

  // SALE page: replace #requestsGrid contents
  /**
   * Прямой fetch на buyer_requests, минуя api.js и его джойны на view.
   * Возвращает массив заявок в формате готовом для renderRequestCard.
   */
  async function fetchRequestsDirect() {
    const cfg = window.RH_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw new Error('SUPABASE_URL/KEY не сконфигурированы');
    // crops загружаем простым джойном — это настоящая таблица
    const url = `${cfg.SUPABASE_URL}/rest/v1/buyer_requests?select=*,crop:crops(name,emoji,category)&status=eq.open&order=created_at.desc&limit=200`;
    const r = await fetch(url, {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
    }
    return await r.json();
  }

  async function syncSale() {
    const grids = document.querySelectorAll('.req-grid');
    if (!grids.length) return;
    try {
      let requests = window.__rh_requests_cache;
      if (!requests) {
        try {
          requests = await fetchRequestsDirect();
          window.__rh_requests_cache = requests;
        } catch(e) {
          console.warn('[sale] fetchRequestsDirect failed, trying api.listRequests', e);
          try { requests = await api.listRequests({ limit: 200 }); }
          catch(_) { requests = []; }
        }
      }

      if (!requests || !requests.length) {
        grids[0].innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--slate-500)"><div style="font-size:15px;font-weight:600;margin-bottom:6px">Пока нет активных заявок</div><div style="font-size:13px">Покупатели ещё не разместили заявки. Загляните позже.</div></div>';
        const saleCount = document.getElementById('saleCount');
        if (saleCount) saleCount.textContent = '0';
        window.dispatchEvent(new CustomEvent('rh:sale-loaded'));
        return;
      }

      grids[0].innerHTML = requests.map(r => renderRequestCard(r)).join('');

      // Счётчики: по родителю и по полному crop_id (как в каталоге)
      const cropCounts = {};
      const parentCounts = {};
      requests.forEach(r => {
        const id = r.crop_id;
        if (!id) return;
        cropCounts[id] = (cropCounts[id] || 0) + 1;
        const parent = id.split('-')[0];
        parentCounts[parent] = (parentCounts[parent] || 0) + 1;
      });

      // Чипсы сверху
      document.querySelectorAll('[data-chip-crop]').forEach(chip => {
        const crop = chip.dataset.chipCrop;
        if (crop === 'all') {
          const span = chip.querySelector('span');
          if (span) span.textContent = String(requests.length);
          return;
        }
        const n = parentCounts[crop] || 0;
        const span = chip.querySelector('span');
        if (span) span.textContent = String(n);
      });

      // Чекбоксы в сайдбаре
      document.querySelectorAll('.filter-check input[data-filter="crop"]').forEach(cb => {
        const v = cb.value;
        const isParent = !v.includes('-');
        const count = isParent ? (parentCounts[v] || 0) : (cropCounts[v] || 0);
        const lbl = cb.closest('.filter-check');
        const countEl = lbl?.querySelector('.count');
        if (countEl) countEl.textContent = String(count);
      });

      // Общий счётчик
      const saleCount = document.getElementById('saleCount');
      if (saleCount) saleCount.textContent = String(requests.length);
      const filterCount = document.getElementById('filterCount');
      if (filterCount) filterCount.textContent = String(requests.length);

      window.dispatchEvent(new CustomEvent('rh:sale-loaded'));
    } catch(e) {
      console.error('[Sale] DB sync failed:', e);
      grids[0].innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#b00020"><div style="font-size:15px;font-weight:600;margin-bottom:8px">Не удалось загрузить заявки</div><div style="font-size:13px">' + escapeHtml(e?.message || '') + '</div></div>';
    }
  }

  function renderRequestCard(r) {
    // v2.6.10: переписан под структуру catalog card — sale-карточки теперь
    // визуально идентичны catalog-карточкам (тот же класс .card, та же сетка
    // card-head + card-meta + distance-strip + supplier-strip + card-foot).
    // Различия: данные из buyer_requests (нет seller, есть needed_by);
    // CTA — «Откликнуться» (data-action="respond") вместо «Купить».
    const cropFull = r.crop_id || '';
    const cropParent = cropFull.split('-')[0] || 'other';
    const cropDataAttr = cropParent === cropFull ? cropParent : `${cropParent} ${cropFull}`;
    const priceR = r.target_price_kopecks ? (r.target_price_kopecks/100).toLocaleString('ru-RU') : 'Договор';
    const priceUnit = r.target_price_kopecks ? ' ₽/т' : '';
    const vatLabel = ({with_vat_5:'с НДС 5%',with_vat_7:'с НДС 7%',with_vat_10:'с НДС 10%',with_vat_20:'с НДС 20%',with_vat_22:'с НДС 22%',without_vat:'без НДС'})[r.vat] || 'с НДС';
    const buyerSid = r.buyer?.handle || ('B-' + (r.buyer_id || r.id || '').slice(-4).toUpperCase());
    const region = r.delivery_city || r.delivery_region || '—';
    const cityFrom = window.__rh_user_city || 'Нижний Новгород';
    const distance = (r.distance_km != null) ? r.distance_km : estimateDistance(r);
    const neededBy = r.needed_by ? new Date(r.needed_by).toLocaleDateString('ru-RU') : '—';
    const title = r.title || r.crop?.name || 'Заявка';

    // VAT флаг: для совместимости с catalog'ным фильтром («с НДС / без НДС»)
    // используем '1' / '0' (как у offers), а не yes/no.
    const vatFlag = r.vat && r.vat !== 'without_vat' ? '1' : '0';

    return `
      <article class="card req-card"
        data-request="${r.id}" data-crop="${cropDataAttr}"
        data-region="${escapeHtml(region)}"
        data-volume="${r.volume_tons || 0}"
        data-price="${(r.target_price_kopecks || 0) / 100}"
        data-distance="${distance}"
        data-vat="${vatFlag}"
        data-title="${escapeHtml(title)}">
        <!-- Ячейки для list-view (скрыты в grid через CSS) — те же что у catalog-карточки -->
        <span class="card-list-cell title">${escapeHtml(title)}</span>
        <span class="card-list-cell muted">${escapeHtml(r.crop?.name || cropFull || '—')}</span>
        <span class="card-list-cell price">${priceR}${priceUnit}</span>
        <span class="card-list-cell">${r.volume_tons || '—'} т</span>
        <span class="card-list-cell muted">${escapeHtml(region)}</span>
        <span class="card-list-cell muted">${distance != null ? distance + ' км' : '—'}</span>
        <span class="card-list-cell cta"><button type="button" data-action="respond" data-request-id="${r.id}">Откликнуться</button></span>

        <div class="card-head">
          <div class="card-top">
            <div>
              <h3 class="card-title">${escapeHtml(title)}</h3>
            </div>
            <div class="card-price-pill">
              <span class="num">${priceR}${priceUnit}</span>
              <span class="small">${r.target_price_kopecks ? vatLabel : ' '}</span>
            </div>
          </div>
          <div class="card-meta">
            <div class="cell"><div class="k">Объём</div><div class="v">${r.volume_tons || '—'} т</div></div>
            <div class="cell"><div class="k">Куда</div><div class="v">${escapeHtml(region)}</div></div>
            <div class="cell"><div class="k">Поставка до</div><div class="v">${neededBy}</div></div>
          </div>
        </div>
        <div class="distance-strip">
          <div class="distance-from">
            <span class="pin-ic">📍</span>
            <div>
              <div class="route">${escapeHtml(cityFrom)} → ${escapeHtml(region)}</div>
              <div class="km"><b>${distance}</b> км от вас</div>
            </div>
          </div>
        </div>
        <div class="supplier-strip">
          <span class="supplier-verify"><span class="bc">✓</span>Проверено платформой</span>
          <div class="supplier-stat">
            <span data-feature="escrow">Эскроу-защита</span>
            <span class="dot" data-feature="escrow"></span>
            <span class="id mono" style="font-family:'JetBrains Mono',monospace">Покупатель ${escapeHtml(buyerSid)}</span>
          </div>
        </div>
        <div class="card-foot">
          <button class="cta" type="button" data-action="respond" data-request-id="${r.id}">Откликнуться →</button>
        </div>
      </article>
    `;
  }

  function guessBuyerType(company, crop) {
    // Privacy-aware: company is intentionally null in current calls — guess from crop only.
    // Legacy regex on company kept for completeness in case admin callers pass it in the future.
    if (company) {
      if (/птицеф/i.test(company)) return 'Птицефабрика';
      if (/хлебоз/i.test(company)) return 'Хлебозавод';
      if (/комбикорм/i.test(company)) return 'Комбикормовый завод';
      if (/мукомол/i.test(company)) return 'Мукомольный комбинат';
      if (/пивовар/i.test(company)) return 'Пивоваренный завод';
    }
    if (crop?.includes('barley-malt')) return 'Пивоваренный завод';
    if (crop?.includes('sunflower')) return 'Маслозавод';
    if (crop?.includes('rapeseed')) return 'Маслозавод';
    if (crop?.includes('wheat-3') || crop?.includes('wheat-4')) return 'Хлебозавод';
    if (crop?.includes('corn') || crop?.includes('barley')) return 'Комбикормовый завод';
    return 'Закупочная компания';
  }

  // Product page: load quality data from DB offer
  // Product page: load real offer data into the page (title, price, buttons, quality, supplier)
  async function syncProduct() {
    // Detect product page either by quality block or by buy-card presence
    const qualityEl = document.getElementById('productQuality');
    const qualityList = document.getElementById('productQualityList');
    const buyCard = document.querySelector('.buy-card');
    if (!buyCard && !qualityEl) return; // not on product page

    try {
      // Find the offer for this page — берём ?id= из URL, fallback по h1
      const params = new URLSearchParams(location.search);
      let offerId = params.get('id');
      if (!offerId || !offerId.includes('-')) {
        const h1 = document.querySelector('h1');
        if (h1) {
          const title = h1.textContent.trim();
          if (title.length > 3 && !title.includes('Купить') && !title.includes('Покупайте')) {
            const offers = await api.listOffers({ search: title, limit: 1 }).catch(() => []);
            if (offers && offers.length) offerId = offers[0].id;
          }
        }
      }
      if (!offerId) return;

      // v2.6.4: один RPC-вызов get_offer_full даёт оффер + продавца (handle) +
      // культуру + полные ГОСТ-параметры + Haversine distance. Никаких чейнов,
      // никаких race condition с api.js → кнопки получают data-offer-id СРАЗУ.
      const cfg = window.RH_CONFIG || {};
      const city = window.RH_getCity ? window.RH_getCity() : null;
      const rpcBody = {
        p_offer_id: offerId,
        p_user_lat: city?.lat ?? null,
        p_user_lng: city?.lng ?? null
      };

      let offer = null;
      try {
        const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/get_offer_full`, {
          method: 'POST',
          headers: {
            'apikey': cfg.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(rpcBody)
        });
        if (r.ok) offer = await r.json();
      } catch(e) {
        console.warn('[syncProduct] get_offer_full RPC failed, falling back to api.getOffer', e);
      }

      // Fallback на старый путь, если RPC по какой-то причине не вернул jsonb
      if (!offer) {
        offer = await api.getOffer(offerId).catch(() => null);
        if (!offer) return;
      }

      // RPC возвращает плоский объект: оффер + nested crop/seller + quality_specs[] + distance_km.
      // Никакой обёртки {offer:..., seller:...} нет — поле seller просто вложено.
      const flat = offer;

      // Update title (page + h1) — чистим хвосты от 1С
      const productTitle = sanitizeOfferTitle(flat.title);
      const titleEl = document.querySelector('h1');
      if (titleEl && productTitle) titleEl.textContent = productTitle;
      if (productTitle) document.title = `${productTitle} — Русский Урожай`;

      // Breadcrumb «Главная / Купить / <чистое название>»
      const crumb = document.getElementById('productCrumb');
      if (crumb && productTitle) crumb.textContent = productTitle;

      // Subtitle: «<культура> · урожай <год> · ID оффера <короткий код>»
      // v2.6.23: defense-in-depth — если на хостинге залит product.html
      // без id-атрибутов (mismatch с моей сборкой), ищем элементы по
      // тексту-метке в .product-attrs и заполняем их.
      const findAttrCell = (labelText) => {
        const cells = document.querySelectorAll('.product-attrs .cell');
        for (const c of cells) {
          const k = c.querySelector('.k');
          if (k && k.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
            return c.querySelector('.v');
          }
        }
        return null;
      };
      const offerCode = 'L-' + String(flat.id || '').replace(/-/g, '').slice(-5).toUpperCase();
      const offerCodeEl = document.getElementById('productOfferCode');
      if (offerCodeEl) offerCodeEl.textContent = offerCode;

      // Subtitle: обновляем содержимое чистым HTML с правильным offer code
      const subtitleEl = document.getElementById('productSubtitle')
                       || document.querySelector('.product-main .subtitle');
      if (subtitleEl) {
        const cropName = flat.crop?.name || '';
        const year = flat.harvest_year || '';
        const parts = [];
        if (cropName) parts.push(escapeHtml(cropName));
        if (year) parts.push('урожай ' + escapeHtml(String(year)));
        parts.push('ID оффера <span class="mono">' + escapeHtml(offerCode) + '</span>');
        subtitleEl.innerHTML = parts.join(' · ');
      }

      // Attrs: объём, мин.партия, год, регион, дистанция, активно до.
      // Каждый элемент берём по id ИЛИ fallback по тексту .k метки.
      const volumeEl = document.getElementById('productVolume') || findAttrCell('Объём партии');
      if (volumeEl && flat.volume_tons != null) volumeEl.textContent = flat.volume_tons + ' тонн';

      const minLotEl = document.getElementById('productMinLot') || findAttrCell('Мин. партия');
      if (minLotEl) {
        if (flat.min_volume_tons) minLotEl.textContent = flat.min_volume_tons + ' тонн';
        else minLotEl.textContent = '—';
      }

      const yearEl = document.getElementById('productHarvestYear') || findAttrCell('Год урожая');
      if (yearEl) yearEl.textContent = flat.harvest_year || '—';

      const regionEl = document.getElementById('productRegion') || findAttrCell('Регион отгрузки');
      if (regionEl) {
        const city = flat.city || '';
        const region = flat.region || '';
        regionEl.textContent = (city && region) ? `${city}, ${region}` : (region || city || '—');
      }

      const distEl = document.getElementById('productDistance') || findAttrCell('Расстояние до вас');
      if (distEl) {
        if (flat.distance_km != null) distEl.textContent = String(flat.distance_km).replace('.', ',');
        else distEl.textContent = '—';
      }

      const activeEl = document.getElementById('productActiveUntil') || findAttrCell('Активно до');
      if (activeEl) {
        if (flat.expires_at) {
          activeEl.textContent = new Date(flat.expires_at).toLocaleDateString('ru-RU');
        } else if (flat.created_at) {
          const d = new Date(flat.created_at); d.setDate(d.getDate() + 30);
          activeEl.textContent = d.toLocaleDateString('ru-RU');
        } else {
          activeEl.textContent = '—';
        }
      }

      // Mobile sticky bottom bar — цена и НДС
      const mPrice = document.getElementById('mobilePrice');
      if (mPrice && flat.price_kopecks != null) {
        mPrice.textContent = (flat.price_kopecks/100).toLocaleString('ru-RU') + ' ₽/т';
      }
      const mVat = document.getElementById('mobileVat');
      if (mVat) {
        const vatMap = {
          with_vat_5:'с НДС 5%', with_vat_7:'с НДС 7%', with_vat_10:'с НДС 10%',
          with_vat_20:'с НДС 20%', with_vat_22:'с НДС 22%', without_vat:'без НДС'
        };
        mVat.textContent = vatMap[flat.vat] || 'с НДС';
      }

      // Update price card
      if (buyCard) {
        const priceEl = buyCard.querySelector('.price');
        if (priceEl && flat.price_kopecks != null) {
          const price = (flat.price_kopecks/100).toLocaleString('ru-RU');
          priceEl.innerHTML = `${price} <span class="unit">₽/т</span>`;
        }
        const vatEl = buyCard.querySelector('.vat');
        if (vatEl) {
          const vatMap = {
            with_vat_5: 'с НДС 5%', with_vat_7: 'с НДС 7%',
            with_vat_10: 'с НДС 10%', with_vat_20: 'с НДС 20%', with_vat_22: 'с НДС 22%',
            without_vat: 'без НДС'
          };
          vatEl.textContent = vatMap[flat.vat] || 'с НДС';
        }
        // КРИТИЧЕСКИ ВАЖНО: сразу пишем реальный UUID на кнопки.
        // До этого они имели data-offer-id="demo" — клик не работал.
        buyCard.querySelectorAll('[data-action="buy"], [data-action="propose"]').forEach(b => {
          b.dataset.offerId = flat.id;
        });
        // Update supplier rating and handle (anonymous)
        const supplierBlock = buyCard.querySelector('.supplier-block .info');
        if (supplierBlock && flat.seller) {
          const handleSpan = supplierBlock.querySelector('span:first-child');
          if (handleSpan) {
            const rating = flat.seller.rating > 0 ? parseFloat(flat.seller.rating).toFixed(1) : '—';
            handleSpan.innerHTML = `<span style="color:var(--brand)">★</span>${rating}`;
            if (flat.seller.handle && !supplierBlock.querySelector('.handle-tag')) {
              const handleItem = document.createElement('span');
              handleItem.style.cssText = 'color:var(--slate-500);font-family:"JetBrains Mono",monospace;font-size:11.5px;margin-left:8px';
              handleItem.textContent = flat.seller.handle;
              handleItem.className = 'handle-tag';
              handleSpan.after(handleItem);
            }
          }
        }
      }

      // Show quality. v2.6.22: единый renderQualityRows(flat) обрабатывает
      // обоих источников (quality_specs массив + quality jsonb) — тот же путь
      // что и в каталоге. Раньше каталог рендерил из quality jsonb, а продукт
      // из quality_specs — это давало РАЗНЫЙ вид одного оффера.
      if (qualityEl && qualityList) {
        const clean = renderQualityRows(flat);
        const rows = clean.map(({ label, value }) =>
          `<div class="row"><span class="k">${escapeHtml(label)}</span><span class="v">${escapeHtml(value)}</span></div>`
        ).join('');
        if (rows) {
          qualityList.innerHTML = rows;
          qualityEl.style.display = '';
          if (flat.has_lab_analysis) {
            const h3 = qualityEl.querySelector('h3');
            if (h3) h3.innerHTML = '✅ Показатели качества (лабораторный анализ)';
          }
        } else {
          // если после чистки не осталось ничего полезного — прячем блок
          qualityEl.style.display = 'none';
        }
      }
    } catch(e) {
      console.warn('[Product] sync failed:', e);
    }
  }

  // Index page: "Сегодня в фокусе" — first VIP or top offer from DB
  async function syncFocus() {
    const wrap = document.getElementById('focusWrap');
    if (!wrap) return;
    try {
      // Используем общий кеш или дёргаем RPC напрямую
      let offers = window.__rh_offers_cache;
      if (!offers) {
        try { offers = await fetchOffersDirect(); window.__rh_offers_cache = offers; }
        catch(_) { offers = await api.listOffers({ limit: 1 }); }
      }
      if (!offers || !offers.length) {
        wrap.style.display = 'none';
        return;
      }
      const o = offers[0];
      const priceR = (o.price_kopecks/100).toLocaleString('ru-RU');
      document.getElementById('focusTitle').textContent  = sanitizeOfferTitle(o.title);
      document.getElementById('focusPrice').textContent  = priceR + ' ₽/т';
      document.getElementById('focusVolume').textContent = (o.volume_tons || '—') + (o.volume_tons ? ' тонн' : '');
      document.getElementById('focusYear').textContent   = o.harvest_year || '—';
      document.getElementById('focusRegion').textContent = o.region || '—';
      let until = '—';
      if (o.expires_at) until = new Date(o.expires_at).toLocaleDateString('ru-RU');
      else if (o.created_at) {
        const d = new Date(o.created_at); d.setDate(d.getDate() + 30);
        until = d.toLocaleDateString('ru-RU');
      }
      document.getElementById('focusUntil').textContent = until;
      const cta = document.getElementById('focusCta');
      if (cta) cta.href = '/product.html?id=' + o.id;
    } catch(e) { console.warn('[focus]', e); wrap.style.display = 'none'; }
  }

  // Index page: "Recent offers" grid (id=homeGrid) — top 8
  async function syncHomeOffers() {
    const grid = document.getElementById('homeGrid');
    if (!grid) return;
    try {
      let offers = window.__rh_offers_cache;
      if (!offers) {
        try { offers = await fetchOffersDirect(); window.__rh_offers_cache = offers; }
        catch(_) { offers = await api.listOffers({ limit: 8 }); }
      }
      offers = (offers || []).slice(0, 8);
      if (!offers.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--slate-500)">Пока нет активных предложений.</div>';
        return;
      }
      grid.innerHTML = offers.map(o => renderCatalogCard(o)).join('');
    } catch(e) {
      console.warn('[home grid]', e);
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--slate-500)">Не удалось загрузить предложения. Попробуйте обновить страницу.</div>';
    }
  }

  // Применяем feature flags к <body> — CSS скрывает .escrow-only / [data-feature="escrow"] и аналогично chat/delivery
  function applyFeatureBodyAttrs() {
    const F = window.RH_CONFIG?.FEATURES || {};
    document.body.setAttribute('data-feature-escrow', F.escrow_enabled ? 'on' : 'off');
    document.body.setAttribute('data-feature-chat',   F.realtime_chat   ? 'on' : 'off');
    document.body.setAttribute('data-feature-delivery', F.delivery_enabled ? 'on' : 'off');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFeatureBodyAttrs);
  } else {
    applyFeatureBodyAttrs();
  }

  // Слушаем смену города → чистим кеш и перезагружаем грид с новыми расстояниями
  window.addEventListener('rh:city-changed', e => {
    const city = e?.detail || {};
    window.__rh_user_city = city.name || 'Нижний Новгород';
    window.__rh_offers_cache = null;  // важно — чтобы fetchOffersDirect пересчитал distance
    window.__rh_requests_cache = null;
    if (window.RH_API && window.RH_API.currentUser) {
      // Если у пользователя нет своих координат — fetchOffersDirect возьмёт из __rh_user_coords
      window.__rh_user_coords = (city.lat && city.lng) ? { lat: city.lat, lng: city.lng } : null;
    }
    // Перерисовываем сетки, на каких бы страницах мы ни были
    syncCatalog();
    syncFocus();
    syncHomeOffers();
    syncSale();
  });

  // Run after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncCatalog();
      syncSale();
      syncProduct();
      syncFocus();
      syncHomeOffers();
    });
  } else {
    syncCatalog();
    syncSale();
    syncProduct();
    syncFocus();
    syncHomeOffers();
  }
})();
