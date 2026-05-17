/**
 * Russian Harvest · v2.6.28
 * ============================================================
 * СИСТЕМА РОЛЕЙ — покупатель / продавец
 * ============================================================
 * Концепция (согласовано с собственником):
 *  - При первом визите — модалка выбора роли
 *  - Покупатель видит раздел «Купить» (offers — что продают)
 *  - Продавец видит раздел «Продать» (buyer_requests — что хотят купить)
 *  - Нерелевантный пункт меню скрывается
 *  - Роль в localStorage, сброс только через ЛК
 *  - Дефолт если закрыл не выбрав — покупатель
 *  - Гость может смотреть без регистрации
 * ============================================================
 */

(function() {
  'use strict';

  const LS_KEY = 'rh_user_role';   // 'buyer' | 'seller'
  const DEFAULT_ROLE = 'buyer';

  // ============================================================
  // ХРАНИЛИЩЕ РОЛИ
  // ============================================================
  function getRole() {
    try {
      const r = localStorage.getItem(LS_KEY);
      return (r === 'buyer' || r === 'seller') ? r : null;
    } catch (e) {
      return null;
    }
  }

  function setRole(role) {
    if (role !== 'buyer' && role !== 'seller') return;
    try {
      localStorage.setItem(LS_KEY, role);
    } catch (e) {}
    applyRoleToMenu(role);
  }

  function clearRole() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
  }

  // ============================================================
  // АДАПТАЦИЯ МЕНЮ ПОД РОЛЬ
  // ============================================================
  // Покупатель → скрываем «Продать», показываем «Купить»
  // Продавец   → скрываем «Купить», показываем «Продать»
  function applyRoleToMenu(role) {
    role = role || getRole() || DEFAULT_ROLE;

    // Все ссылки в навигации, ведущие на каталоги
    const buyLinks  = document.querySelectorAll('a[href="/catalog.html"], a[href="catalog.html"]');
    const sellLinks = document.querySelectorAll('a[href="/sale.html"], a[href="sale.html"]');

    if (role === 'buyer') {
      // Покупатель: показываем Купить, прячем Продать
      sellLinks.forEach(a => hideNavItem(a));
      buyLinks.forEach(a => showNavItem(a));
    } else {
      // Продавец: показываем Продать, прячем Купить
      buyLinks.forEach(a => hideNavItem(a));
      sellLinks.forEach(a => showNavItem(a));
    }

    // Если пользователь на «чужой» странице — редиректим на правильную
    redirectIfWrongSection(role);
  }

  function hideNavItem(a) {
    // Скрываем сам элемент или его родительский <li>/обёртку
    const li = a.closest('li');
    (li || a).style.display = 'none';
  }
  function showNavItem(a) {
    const li = a.closest('li');
    (li || a).style.removeProperty('display');
  }

  // Если покупатель открыл /sale.html — перекинуть на /catalog.html, и наоборот.
  // Только для каталожных страниц, остальные (about, contacts) не трогаем.
  function redirectIfWrongSection(role) {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const isSale = /\/sale\.html$/.test(path);
    const isCatalog = /\/catalog\.html$/.test(path);

    if (role === 'buyer' && isSale) {
      location.replace('/catalog.html');
    } else if (role === 'seller' && isCatalog) {
      location.replace('/sale.html');
    }
  }

  // ============================================================
  // МОДАЛКА ВЫБОРА РОЛИ
  // ============================================================
  function showRoleModal() {
    // Не показываем второй раз если уже выбрано
    if (getRole()) {
      applyRoleToMenu();
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'rh-role-modal';
    modal.innerHTML = `
      <div class="rh-role-backdrop"></div>
      <div class="rh-role-panel">
        <div class="rh-role-head">
          <div class="rh-role-logo">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" fill="#3D5C19"/>
              <path d="M24 12c-3 6-3 12 0 18m0-18c3 6 3 12 0 18m0 0v6" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h2>Добро пожаловать в Русский Урожай</h2>
          <p>Выберите, что вы хотите делать на платформе</p>
        </div>
        <div class="rh-role-options">
          <button class="rh-role-card" data-role="buyer" type="button">
            <div class="rh-role-icon">🛒</div>
            <h3>Я покупатель</h3>
            <p>Хочу купить зерно, бобовые, масличные напрямую у производителей</p>
            <span class="rh-role-cta">Смотреть предложения →</span>
          </button>
          <button class="rh-role-card" data-role="seller" type="button">
            <div class="rh-role-icon">🌾</div>
            <h3>Я продавец</h3>
            <p>Хочу продать урожай — вижу заявки проверенных покупателей</p>
            <span class="rh-role-cta">Смотреть заявки →</span>
          </button>
        </div>
        <p class="rh-role-foot">Роль можно сменить позже в личном кабинете</p>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('is-open'));

    const choose = (role) => {
      setRole(role);
      modal.classList.remove('is-open');
      setTimeout(() => {
        modal.remove();
        // После выбора — отправляем на нужный раздел если на главной
        const path = location.pathname.replace(/\/+$/, '') || '/';
        if (path === '/' || /\/index\.html$/.test(path)) {
          // остаёмся на главной, просто меню применилось
        }
      }, 250);
    };

    modal.querySelectorAll('.rh-role-card').forEach(btn => {
      btn.addEventListener('click', () => choose(btn.dataset.role));
    });
    // Клик по фону = выбор дефолта (покупатель), чтобы не блокировать сайт
    modal.querySelector('.rh-role-backdrop').addEventListener('click', () => {
      choose(DEFAULT_ROLE);
    });
  }

  // ============================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================
  window.RH_ROLE = {
    get: getRole,
    set: setRole,
    clear: clearRole,
    apply: applyRoleToMenu,
    showModal: showRoleModal,
    DEFAULT: DEFAULT_ROLE,
  };

  // ============================================================
  // АВТОЗАПУСК
  // ============================================================
  function init() {
    // Меню адаптируем всегда (даже если роль уже выбрана)
    applyRoleToMenu();

    // Hero-форма поиска: action зависит от роли.
    // Продавец ищет в заявках (sale.html), покупатель — в офферах (catalog.html)
    const heroForm = document.getElementById('heroSearchForm');
    if (heroForm) {
      const role = getRole() || DEFAULT_ROLE;
      heroForm.setAttribute('action', role === 'seller' ? '/sale.html' : '/catalog.html');
    }

    // Модалку показываем только на главной и только если роль не выбрана
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const isHome = path === '/' || /\/index\.html$/.test(path);
    if (isHome && !getRole()) {
      showRoleModal();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
