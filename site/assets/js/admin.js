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
          <p style="color:var(--slate-500);margin:0 auto 24px;max-width:400px">Чтобы пользоваться кабинетом — войдите или создайте аккаунт. У вас будет доступ к сделкам, заявкам, истории платежей и эскроу.</p>
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
              <button class="btn btn-outline btn-sm" disabled style="opacity:.5">Изменить</button>
            </div>
          </div>
        `;
      }).join('');
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
            <input name="delivery_city" placeholder="Нижний Новгород" />
          </div>
          <div class="form-group">
            <label>Описание</label>
            <textarea name="description" rows="3" placeholder="Дополнительные требования к качеству, доставке..." style="width:100%;padding:10px 12px;border:1px solid var(--slate-200);border-radius:10px;font-family:inherit;font-size:14px;resize:vertical"></textarea>
          </div>
          <div id="creqError" style="color:var(--red);font-size:13px;margin-top:8px;display:none"></div>
        </form>
        <div style="padding:18px 28px;border-top:1px solid var(--slate-100);display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-outline" id="creqCancel">Отмена</button>
          <button class="btn btn-primary" id="creqSubmit">Опубликовать</button>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.querySelector('#creqClose').addEventListener('click', close);
    wrap.querySelector('#creqCancel').addEventListener('click', close);
    wrap.querySelector('#creqBackdrop').addEventListener('click', close);

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
        if (text.includes('модерация')) {
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
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.querySelector('#ffClose').addEventListener('click', close);
    wrap.querySelector('#ffBackdrop').addEventListener('click', close);

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
  // MODERATION MODAL — list pending offers, approve/reject
  // ============================================================
  async function openModerationModal() {
    const html = `
      <div class="modal-backdrop on" id="modBackdrop"></div>
      <div class="modal on" id="modModal" style="max-width:780px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close" id="modClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700;color:var(--ink)">Модерация офферов</h2>
          <p style="color:var(--slate-500);margin-top:6px;font-size:14px">Офферы в статусе «pending» ожидают вашей проверки.</p>
        </div>
        <div id="modList" style="overflow-y:auto;padding:20px 28px;flex:1">
          <div style="text-align:center;padding:40px;color:var(--slate-500)">Загружаем...</div>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.querySelector('#modClose').addEventListener('click', close);
    wrap.querySelector('#modBackdrop').addEventListener('click', close);

    try {
      const offers = await api.adminListPendingOffers();
      const list = wrap.querySelector('#modList');
      if (!offers.length) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--slate-500)">✓ Нет офферов на модерации.</div>';
        return;
      }
      list.innerHTML = offers.map(o => `
        <div class="account-panel" data-offer-id="${o.id}" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap">
            <div style="flex:1;min-width:260px">
              <h4 style="font-size:15px;font-weight:700;color:var(--ink)">${o.crop?.emoji || '📦'} ${o.title}</h4>
              <div style="font-size:13px;color:var(--slate-600);margin-top:6px">
                ${api.formatRub(o.price_kopecks)}/т · ${o.volume_tons} т · ${o.region}
              </div>
              <div style="font-size:12px;color:var(--slate-500);margin-top:4px">
                Продавец: <b>${o.seller?.company_name || o.seller?.full_name || '—'}</b>
                ${o.seller?.inn ? ` · ИНН ${o.seller.inn}` : ''}
              </div>
              ${o.description ? `<div style="font-size:13px;color:var(--slate-600);margin-top:8px;background:var(--slate-50);padding:8px 12px;border-radius:8px">${escapeHtml(o.description)}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn btn-primary btn-sm" data-action="approve">✓ Одобрить</button>
              <button class="btn btn-outline btn-sm" data-action="reject" style="color:var(--red);border-color:var(--red)">✕ Отклонить</button>
            </div>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const card = btn.closest('[data-offer-id]');
          const id = card.dataset.offerId;
          btn.disabled = true;
          btn.textContent = '...';
          try {
            if (btn.dataset.action === 'approve') {
              await api.adminApproveOffer(id);
            } else {
              const reason = prompt('Причина отклонения:') || 'Не соответствует требованиям';
              await api.adminRejectOffer(id, reason);
            }
            card.style.opacity = '0.4';
            card.style.pointerEvents = 'none';
            setTimeout(() => card.remove(), 300);
          } catch(err) {
            alert('Ошибка: ' + err.message);
            btn.disabled = false;
            btn.textContent = btn.dataset.action === 'approve' ? '✓ Одобрить' : '✕ Отклонить';
          }
        });
      });
    } catch(err) {
      wrap.querySelector('#modList').innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${err.message}</div>`;
    }
  }

  // ============================================================
  // USERS MODAL — list all users, verify
  // ============================================================
  async function openUsersModal() {
    const html = `
      <div class="modal-backdrop on" id="usrBackdrop"></div>
      <div class="modal on" id="usrModal" style="max-width:880px;max-height:90vh;display:flex;flex-direction:column">
        <button class="modal-close" id="usrClose">✕</button>
        <div style="padding:24px 28px;border-bottom:1px solid var(--slate-100)">
          <h2 style="font-size:22px;font-weight:700">Пользователи платформы</h2>
        </div>
        <div id="usrList" style="overflow-y:auto;padding:20px 28px;flex:1">Загружаем...</div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.querySelector('#usrClose').addEventListener('click', close);
    wrap.querySelector('#usrBackdrop').addEventListener('click', close);

    try {
      const users = await api.adminListUsers();
      const list = wrap.querySelector('#usrList');
      list.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid var(--slate-100);text-align:left">
              <th style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500)">Имя</th>
              <th style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500)">Компания / ИНН</th>
              <th style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500)">Роль</th>
              <th style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500)">Сделок</th>
              <th style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500)">Действие</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr data-user-id="${u.id}" style="border-bottom:1px solid var(--slate-100)">
                <td style="padding:12px 8px">
                  <div style="font-weight:600">${u.full_name || '—'}</div>
                  <div style="font-size:11px;color:var(--slate-500)">${u.email || u.phone || ''}</div>
                </td>
                <td style="padding:12px 8px;font-size:12px">
                  <div>${u.company_name || '—'}</div>
                  ${u.inn ? `<div style="font-family:'JetBrains Mono',monospace;color:var(--slate-500)">${u.inn}</div>` : ''}
                </td>
                <td style="padding:12px 8px">
                  <select data-action="set-role" style="padding:3px 6px;border-radius:6px;background:var(--slate-100);font-size:11px;font-weight:600;border:1px solid var(--slate-200);cursor:pointer">
                    <option value="buyer" ${u.role === 'buyer' ? 'selected' : ''}>Покупатель</option>
                    <option value="seller" ${u.role === 'seller' ? 'selected' : ''}>Продавец</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>👑 Админ</option>
                  </select>
                </td>
                <td style="padding:12px 8px;font-family:'JetBrains Mono',monospace">${u.deals_count || 0}</td>
                <td style="padding:12px 8px">
                  ${u.is_verified
                    ? '<span style="color:var(--brand-dark);font-size:12px;font-weight:600">✓ Проверен</span>'
                    : '<button class="btn btn-outline btn-sm" data-action="verify" style="font-size:11px;padding:4px 10px">Подтвердить</button>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      list.querySelectorAll('[data-action="verify"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const row = btn.closest('[data-user-id]');
          btn.disabled = true; btn.textContent = '...';
          try {
            await api.adminVerifyUser(row.dataset.userId);
            btn.outerHTML = '<span style="color:var(--brand-dark);font-size:12px;font-weight:600">✓ Проверен</span>';
          } catch(err) {
            alert('Ошибка: ' + err.message);
            btn.disabled = false;
          }
        });
      });

      list.querySelectorAll('[data-action="set-role"]').forEach(sel => {
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
            showToast(`✓ Роль изменена на «${newRole}»`);
          } catch(err) {
            alert('Ошибка: ' + err.message);
            sel.value = originalRole;
          } finally {
            sel.disabled = false;
          }
        });
      });
    } catch(err) {
      wrap.querySelector('#usrList').innerHTML = `<div style="color:var(--red);padding:20px">Ошибка: ${err.message}</div>`;
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
              <input name="city" placeholder="Арзамас" />
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
          <button class="btn btn-outline" id="cofCancel">Отмена</button>
          <button class="btn btn-primary" id="cofSubmit">Разместить</button>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.querySelector('#cofClose').addEventListener('click', close);
    wrap.querySelector('#cofCancel').addEventListener('click', close);
    wrap.querySelector('#cofBackdrop').addEventListener('click', close);

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

    if (document.getElementById('accName')) {
      loadAccountPage();
    }
    document.addEventListener('rh:user-loaded', () => {
      if (document.getElementById('accName')) loadAccountPage();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for manual triggering
  window.RH_Admin = {
    openModeration: openModerationModal,
    openUsers: openUsersModal,
    openCreateOffer: openCreateOfferModal,
    openCreateRequest: openCreateRequestModal,
    openFeatureFlags: openFeatureFlagsModal,
    refresh: loadAccountPage
  };
})();
