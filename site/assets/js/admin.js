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
        // not logged in
        const main = document.querySelector('.account-main');
        if (main) {
          main.innerHTML = `
            <div class="account-panel" style="text-align:center;padding:60px 20px">
              <h2>Войдите в аккаунт</h2>
              <p style="color:var(--slate-500);margin:12px 0 24px">Чтобы использовать кабинет — войдите или зарегистрируйтесь.</p>
              <button class="btn btn-primary btn-lg" data-open="login">Войти / Регистрация</button>
            </div>
          `;
          // re-attach modal opener
          main.querySelector('[data-open="login"]').addEventListener('click', () => {
            const bd = document.getElementById('loginBackdrop');
            const modal = document.getElementById('loginModal');
            if (bd) bd.classList.add('on');
            if (modal) modal.classList.add('on');
          });
        }
        return;
      }

      // Fill sidebar
      const initials = (user.full_name || user.company_name || user.email || '?')
        .split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();

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
      if (subEl && user.role === 'admin') {
        subEl.textContent = 'Полный контроль платформы: модерация, пользователи, сделки, аналитика.';
      }

      // Avatar style for admin
      const avEl = document.getElementById('accAvatar');
      if (user.role === 'admin' && avEl) {
        avEl.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
      }

      // Show admin panel only for admin
      if (user.role === 'admin') {
        const panel = document.getElementById('adminPanel');
        if (panel) panel.style.display = '';
        await loadAdminPanel();
      }

      // Load real deals
      await loadUserDeals(user);

      // Add "create offer" button for sellers
      if (user.role === 'seller' || user.role === 'admin') {
        injectCreateOfferButton();
      }
    } catch (err) {
      console.error('[Account] Load failed:', err);
    }
  }

  async function loadUserDeals(user) {
    try {
      const deals = await api.listMyDeals();
      const dealsLists = document.querySelectorAll('.account-panel .deals-list');
      if (!dealsLists.length || !deals.length) return;

      // Replace first deals-list with real data
      const list = dealsLists[0];
      list.innerHTML = deals.slice(0, 5).map(d => {
        const isBuyer = d.buyer_id === user.id;
        const counterparty = isBuyer ? d.seller : d.buyer;
        const statusLabel = ({
          pending: 'Ожидает', paid: 'Оплачено', shipping: 'В пути',
          delivered: 'Доставлено', completed: 'Завершена',
          cancelled: 'Отменена', disputed: 'Спор'
        })[d.status] || d.status;
        const statusCls = ['paid','shipping'].includes(d.status) ? 'active'
          : d.status === 'pending' ? 'pending'
          : d.status === 'completed' ? 'done'
          : 'cancelled';
        return `
          <div class="deal-row">
            <div class="deal-status ${statusCls}">${d.crop?.emoji || '📦'}</div>
            <div class="deal-info">
              <div class="title">${d.crop?.name || 'Товар'} · ${d.volume_tons} т</div>
              <div class="meta">
                <span>Сделка ${d.deal_number}</span>
                <span class="dot">·</span>
                <span>${counterparty?.company_name || counterparty?.full_name || 'Контрагент'}</span>
              </div>
            </div>
            <div class="deal-price">${api.formatRub(d.grand_total_kopecks)}<small>${isBuyer ? 'покупка' : 'продажа'}</small></div>
            <span class="deal-label ${statusCls}">${statusLabel}</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-outline btn-sm">Открыть</a>
            </div>
          </div>
        `;
      }).join('');
    } catch(e) {
      console.warn('[Deals] Load failed:', e);
    }
  }

  function injectCreateOfferButton() {
    const head = document.querySelector('.account-head');
    if (!head) return;
    const existing = head.querySelector('.btn-create-offer');
    if (existing) return;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-create-offer';
    btn.innerHTML = '+ Разместить оффер';
    btn.addEventListener('click', openCreateOfferModal);
    // Replace existing button or append
    const oldBtn = head.querySelector('a.btn-primary');
    if (oldBtn) oldBtn.replaceWith(btn);
    else head.appendChild(btn);
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

      // Wire moderation button
      const modBtn = panel.querySelector('a[href="#"]');
      if (modBtn && modBtn.textContent.includes('Модерация')) {
        modBtn.removeAttribute('href');
        modBtn.style.cursor = 'pointer';
        modBtn.addEventListener('click', e => { e.preventDefault(); openModerationModal(); });
      }

      const allButtons = panel.querySelectorAll('a');
      allButtons.forEach(b => {
        if (b.textContent.includes('Пользователи')) {
          b.removeAttribute('href');
          b.style.cursor = 'pointer';
          b.addEventListener('click', e => { e.preventDefault(); openUsersModal(); });
        }
      });
    } catch(err) {
      console.error('[Admin] Stats load failed:', err);
    }
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
                <td style="padding:12px 8px"><span style="padding:3px 8px;border-radius:6px;background:var(--slate-100);font-size:11px;font-weight:600">${u.role}</span></td>
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
    refresh: loadAccountPage
  };
})();
