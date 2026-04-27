/**
 * PRODUCT TOUR — интерактивное обучение
 * ======================================
 * Показывает серию подсказок на ключевых элементах UI при первом визите.
 * Подсвечивает элементы, показывает тултип, автоматически прокручивает.
 *
 * Каждая страница имеет свой набор шагов (см. TOURS ниже).
 *
 * Сбросить прогресс вручную:
 *   localStorage.removeItem('rh_tour_home')
 *   localStorage.removeItem('rh_tour_catalog')
 *   и т.д.
 *
 * Или через консоль:  window.RH_Tour.reset()
 */

(function () {
  'use strict';

  // ============================================================
  // TOUR STEP DEFINITIONS — по одному "туру" на страницу
  // ============================================================

  const TOURS = {
    home: {
      id: 'home',
      title: '👋 Добро пожаловать в Русский Урожай',
      steps: [
        {
          target: '.hero-search',
          title: 'Быстрый поиск',
          text: 'Здесь задаёте что ищете, тип заявки (купить или продать) и объём партии. Все поля интерактивны — попробуйте.',
          position: 'bottom'
        },
        {
          target: '.popular',
          title: 'Популярные запросы',
          text: 'Одним кликом ищите самые частые культуры — пшеницу, кукурузу, подсолнечник.',
          position: 'bottom'
        },
        {
          target: '.focus-wrap, .focus-card',
          title: 'Сегодня в фокусе',
          text: 'Топовое предложение дня — полная карточка с ценой, объёмом, качеством и эскроу-защитой.',
          position: 'left'
        },
        {
          target: '.region-chip',
          title: 'Ваш регион',
          text: 'Все расстояния и цены доставки считаются относительно этой точки. Кликните, чтобы сменить город — можно автоопределить по геолокации.',
          position: 'bottom'
        },
        {
          target: '.icon-btn',
          title: 'Поиск по сайту',
          text: 'Ищите страницы, культуры и регионы одной строкой. Горячие клавиши: ⌘K / Ctrl+K.',
          position: 'bottom'
        },
        {
          target: '.nav-main a[href*="auction"], .mobile-tabbar a[href*="auction"]',
          title: 'Аукционы в реальном времени',
          text: 'Новый раздел: живые торги с таймерами обратного отсчёта и конкурентными ставками.',
          position: 'bottom'
        },
        {
          target: '.nav-main a[href*="prices"], .mobile-tabbar a[href*="prices"]',
          title: 'Биржа котировок',
          text: 'Медианные цены по 30+ регионам обновляются каждые 3 секунды. Сверяйтесь с рынком перед сделкой.',
          position: 'bottom'
        },
        {
          target: '[data-open="login"]',
          title: 'Вход в кабинет',
          text: 'В демо-режиме доступны два тестовых аккаунта — Администратор и Пользователь. Откройте вкладку «🔑 Демо» в окне входа.',
          position: 'bottom'
        },
        {
          target: '.cards-grid',
          title: 'Каталог предложений',
          text: 'На главной — 8 свежих офферов. Весь каталог (30+) доступен по кнопке «Открыть весь каталог».',
          position: 'top'
        }
      ]
    },
    catalog: {
      id: 'catalog',
      title: '🔍 Навигация по каталогу',
      steps: [
        {
          target: '.filters-aside',
          title: 'Фильтры',
          text: 'Точная фильтрация по культуре, региону, цене, расстоянию и наличию доставки / НДС / лаб-анализа. Всё работает в реальном времени.',
          position: 'right'
        },
        {
          target: '.view-toggle',
          title: 'Сетка или список',
          text: 'Переключайте режим отображения карточек. Выбор сохраняется для следующего визита.',
          position: 'left'
        },
        {
          target: '.sort-select',
          title: 'Сортировка',
          text: 'По близости к вашему складу, по цене, по рейтингу поставщика. По умолчанию — ближайшие наверху.',
          position: 'left'
        },
        {
          target: '.distance-strip',
          title: 'Расстояние до склада',
          text: 'На каждой карточке видите точную дистанцию от вашего региона и ориентировочную стоимость доставки за тонну.',
          position: 'top'
        },
        {
          target: '.supplier-verify',
          title: 'Проверенные поставщики',
          text: 'Оранжевый бейдж означает, что поставщик прошёл проверку по ИНН, ОГРН и истории сделок. Данные раскрываются после оплаты через эскроу.',
          position: 'top'
        }
      ]
    },
    account: {
      id: 'account',
      title: '🏠 Ваш личный кабинет',
      steps: [
        {
          target: '.account-aside',
          title: 'Навигация кабинета',
          text: 'Все разделы: сделки, заявки, чаты, избранное, история, профиль, платежи.',
          position: 'right'
        },
        {
          target: '.account-stats',
          title: 'Ключевые метрики',
          text: 'Статус по активным сделкам, ожидающим откликам, обороту и рейтингу — одним взглядом.',
          position: 'bottom'
        },
        {
          target: '#adminPanel',
          title: 'Админ-панель',
          text: 'Этот блок виден только администраторам. Модерация офферов, пользователи, аналитика платформы.',
          position: 'bottom',
          skipIfHidden: true
        },
        {
          target: '.deals-list',
          title: 'Активные сделки',
          text: 'Каждая сделка показывает статус (в пути / подписание / оплачено), цену с доставкой и быстрые действия: чат, открыть, подписать.',
          position: 'top'
        }
      ]
    },
    auction: {
      id: 'auction',
      title: '🔨 Как работает аукцион',
      steps: [
        {
          target: '.live-pulse',
          title: 'Живые торги',
          text: 'Все ставки и таймеры обновляются в реальном времени, каждую секунду.',
          position: 'bottom'
        },
        {
          target: '.auction-timer-row',
          title: 'До конца торгов',
          text: 'Следите за временем — чем ближе к нулю, тем активнее ставки. Лоты < 1 часа подсвечены оранжевой пульсацией.',
          position: 'top'
        },
        {
          target: '.auction-bid',
          title: 'Текущая ставка',
          text: 'Обновляется с каждой новой ставкой участников. Победитель определяется автоматически в момент окончания.',
          position: 'top'
        },
        {
          target: '.auction-actions .btn-primary',
          title: 'Сделать ставку',
          text: 'Минимальный шаг обычно 100 ₽/т. Средства резервируются на эскроу в момент ставки.',
          position: 'top'
        }
      ]
    },
    prices: {
      id: 'prices',
      title: '📈 Биржа котировок',
      steps: [
        {
          target: '.live-pulse',
          title: 'Обновление каждые 3 секунды',
          text: 'Цена мигает зелёным при росте, красным при падении. Данные — медиана последних 24 часов сделок.',
          position: 'bottom'
        },
        {
          target: '.quotes-grid .quote-tile',
          title: 'Карточка котировки',
          text: 'Культура, текущая медианная цена и процент изменения. На мобилке — листайте горизонтально как виджеты.',
          position: 'top'
        },
        {
          target: '.reverse-card',
          title: 'Подписка на сводку',
          text: 'Получайте ежедневную сводку цен в Telegram или на email — бесплатно.',
          position: 'top'
        }
      ]
    },
    sale: {
      id: 'sale',
      title: '🌾 Продажа урожая',
      steps: [
        {
          target: '.filter-bar',
          title: 'Фильтры по заявкам покупателей',
          text: 'Ищите заявки по культуре, региону покупателя, объёму и НДС. Работает в реальном времени.',
          position: 'bottom'
        },
        {
          target: '.reverse-card',
          title: 'Разместите свой оффер',
          text: 'Или создайте собственное предложение о продаже — покупатели сами откликнутся.',
          position: 'top'
        }
      ]
    }
  };

  // ============================================================
  // CSS for tour UI (injected once)
  // ============================================================
  const TOUR_CSS = `
    .rh-tour-backdrop {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(15, 23, 42, .65);
      backdrop-filter: blur(2px);
      opacity: 0; pointer-events: none;
      transition: opacity .25s;
    }
    .rh-tour-backdrop.on { opacity: 1; pointer-events: auto; }
    .rh-tour-spotlight {
      position: absolute; z-index: 9999;
      border-radius: 14px; pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, .68), 0 0 0 4px var(--emerald, #10B981), 0 0 0 8px rgba(16, 185, 129, .25);
      transition: all .35s cubic-bezier(.4, 0, .2, 1);
      animation: rh-tour-pulse 2s ease-in-out infinite;
    }
    @keyframes rh-tour-pulse {
      0%, 100% { box-shadow: 0 0 0 9999px rgba(15, 23, 42, .68), 0 0 0 4px rgba(16, 185, 129, 1), 0 0 0 8px rgba(16, 185, 129, .25); }
      50%      { box-shadow: 0 0 0 9999px rgba(15, 23, 42, .68), 0 0 0 4px rgba(16, 185, 129, 1), 0 0 0 14px rgba(16, 185, 129, .05); }
    }
    .rh-tour-tooltip {
      position: absolute; z-index: 10000;
      background: #FFF; border-radius: 16px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, .35);
      max-width: 340px; min-width: 280px;
      padding: 20px 22px;
      opacity: 0; transform: scale(.94);
      transition: opacity .2s, transform .2s cubic-bezier(.4, 0, .2, 1);
      font-family: 'Manrope', system-ui, sans-serif;
    }
    .rh-tour-tooltip.on { opacity: 1; transform: scale(1); }
    .rh-tour-tooltip-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 6px;
    }
    .rh-tour-step-n {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; color: #94A3B8; font-weight: 600;
      letter-spacing: .04em;
    }
    .rh-tour-skip {
      background: none; border: none; cursor: pointer;
      color: #94A3B8; font-size: 12.5px; font-weight: 500;
      padding: 4px 8px; border-radius: 6px; font-family: inherit;
      transition: all .12s;
    }
    .rh-tour-skip:hover { color: #334155; background: #F1F5F9; }
    .rh-tour-tooltip h3 {
      font-size: 16px; font-weight: 700; color: #0F172A;
      letter-spacing: -.015em; line-height: 1.25;
      margin: 0 0 8px;
    }
    .rh-tour-tooltip p {
      font-size: 13.5px; line-height: 1.55; color: #475569;
      margin: 0 0 16px;
    }
    .rh-tour-progress {
      display: flex; gap: 4px; margin-bottom: 14px;
    }
    .rh-tour-progress span {
      flex: 1; height: 3px; border-radius: 999px;
      background: #E2E8F0; transition: background .2s;
    }
    .rh-tour-progress span.done { background: #10B981; }
    .rh-tour-progress span.current { background: #10B981; }
    .rh-tour-actions {
      display: flex; justify-content: space-between; gap: 8px; align-items: center;
    }
    .rh-tour-btn {
      padding: 9px 18px; border-radius: 10px;
      font-family: inherit; font-size: 13.5px; font-weight: 600;
      cursor: pointer; border: none; transition: all .15s;
    }
    .rh-tour-btn-prev {
      background: #F1F5F9; color: #475569;
    }
    .rh-tour-btn-prev:hover { background: #E2E8F0; }
    .rh-tour-btn-prev:disabled { opacity: 0; pointer-events: none; }
    .rh-tour-btn-next {
      background: #10B981; color: #FFF;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .rh-tour-btn-next:hover { background: #059669; }
    /* Arrow pointing to element */
    .rh-tour-tooltip::before {
      content: ""; position: absolute; z-index: 1;
      width: 0; height: 0;
      border: 8px solid transparent;
    }
    .rh-tour-tooltip[data-pos="top"]::before {
      bottom: -15px; left: 30px;
      border-top-color: #FFF;
    }
    .rh-tour-tooltip[data-pos="bottom"]::before {
      top: -15px; left: 30px;
      border-bottom-color: #FFF;
    }
    .rh-tour-tooltip[data-pos="left"]::before {
      right: -15px; top: 24px;
      border-left-color: #FFF;
    }
    .rh-tour-tooltip[data-pos="right"]::before {
      left: -15px; top: 24px;
      border-right-color: #FFF;
    }
    /* Launcher button (in header) */
    .rh-tour-launcher {
      position: fixed; bottom: 24px; right: 24px; z-index: 45;
      background: #0F172A; color: #FFF;
      width: auto; min-width: 52px; height: 52px; border-radius: 999px;
      padding: 0 20px; display: none; align-items: center; gap: 10px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, .28);
      font-family: inherit; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none;
      transition: all .2s;
    }
    .rh-tour-launcher:hover {
      background: #1E293B;
      transform: translateY(-2px);
      box-shadow: 0 16px 40px rgba(15, 23, 42, .36);
    }
    .rh-tour-launcher svg { flex-shrink: 0; }
    @media (max-width: 720px) {
      .rh-tour-launcher { bottom: 82px; right: 14px; padding: 0; width: 48px; min-width: 48px; height: 48px; }
      .rh-tour-launcher span { display: none; }
      .rh-tour-tooltip { max-width: calc(100vw - 32px); min-width: 0; }
    }
    /* First-visit pulse on launcher */
    .rh-tour-launcher.new::after {
      content: ""; position: absolute; top: 4px; right: 4px;
      width: 12px; height: 12px; border-radius: 50%;
      background: #F5A623; border: 2px solid #FFF;
      animation: rh-tour-pulse-dot 1.5s ease-in-out infinite;
    }
    @keyframes rh-tour-pulse-dot {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.3); }
    }
  `;

  // ============================================================
  // TOUR ENGINE
  // ============================================================

  let currentTour = null;
  let currentStepIdx = 0;
  let backdrop, spotlight, tooltip;
  let scrollWatcher = null;

  function ensureUI() {
    if (backdrop) return;

    // Inject CSS
    const style = document.createElement('style');
    style.id = 'rh-tour-css';
    style.textContent = TOUR_CSS;
    document.head.appendChild(style);

    // Backdrop
    backdrop = document.createElement('div');
    backdrop.className = 'rh-tour-backdrop';
    backdrop.addEventListener('click', endTour);
    document.body.appendChild(backdrop);

    // Spotlight
    spotlight = document.createElement('div');
    spotlight.className = 'rh-tour-spotlight';
    document.body.appendChild(spotlight);

    // Tooltip
    tooltip = document.createElement('div');
    tooltip.className = 'rh-tour-tooltip';
    document.body.appendChild(tooltip);
  }

  function findTarget(step) {
    if (!step.target) return null;
    // Try each selector in comma-separated list, return first visible
    const selectors = step.target.split(',').map(s => s.trim());
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function positionSpotlightAndTooltip(step) {
    const target = findTarget(step);
    if (!target) {
      // If target hidden and step says skip — skip automatically
      if (step.skipIfHidden) {
        nextStep();
        return;
      }
      // Otherwise center tooltip in viewport
      spotlight.style.display = 'none';
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      tooltip.removeAttribute('data-pos');
      return;
    }

    spotlight.style.display = '';

    // Scroll into view
    const rect = target.getBoundingClientRect();
    const needScroll = rect.top < 80 || rect.bottom > window.innerHeight - 80;
    if (needScroll) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to finish
      setTimeout(() => placeElements(target, step), 400);
    } else {
      placeElements(target, step);
    }
  }

  function placeElements(target, step) {
    const rect = target.getBoundingClientRect();
    const padding = 6;
    const top = rect.top + window.scrollY - padding;
    const left = rect.left + window.scrollX - padding;

    spotlight.style.top = top + 'px';
    spotlight.style.left = left + 'px';
    spotlight.style.width = (rect.width + padding * 2) + 'px';
    spotlight.style.height = (rect.height + padding * 2) + 'px';

    // Determine tooltip position
    const pos = step.position || 'bottom';
    const tooltipRect = tooltip.getBoundingClientRect();
    const tw = 340; // max tooltip width
    const th = tooltipRect.height || 180;
    const gap = 18;

    let tt, tl;
    switch (pos) {
      case 'top':
        tt = top - th - gap;
        tl = left + rect.width / 2 - tw / 2;
        break;
      case 'left':
        tt = top + rect.height / 2 - th / 2;
        tl = left - tw - gap;
        break;
      case 'right':
        tt = top + rect.height / 2 - th / 2;
        tl = left + rect.width + padding * 2 + gap;
        break;
      case 'bottom':
      default:
        tt = top + rect.height + padding * 2 + gap;
        tl = left + rect.width / 2 - tw / 2;
        break;
    }

    // Clamp to viewport
    const margin = 16;
    const maxLeft = document.documentElement.scrollWidth - tw - margin;
    const maxTop = window.scrollY + window.innerHeight - th - margin;
    if (tl < margin + window.scrollX) tl = margin + window.scrollX;
    if (tl > maxLeft) tl = maxLeft;
    if (tt < window.scrollY + margin) tt = window.scrollY + margin;
    if (tt > maxTop) tt = maxTop;

    tooltip.style.transform = '';
    tooltip.style.top = tt + 'px';
    tooltip.style.left = tl + 'px';
    tooltip.setAttribute('data-pos', pos);
  }

  function renderTooltip(step) {
    const total = currentTour.steps.length;
    const dots = Array(total).fill(0).map((_, i) => {
      let cls = '';
      if (i < currentStepIdx) cls = 'done';
      else if (i === currentStepIdx) cls = 'current';
      return `<span class="${cls}"></span>`;
    }).join('');

    tooltip.innerHTML = `
      <div class="rh-tour-progress">${dots}</div>
      <div class="rh-tour-tooltip-head">
        <span class="rh-tour-step-n">${currentStepIdx + 1} / ${total}</span>
        <button class="rh-tour-skip" type="button">Пропустить тур</button>
      </div>
      <h3>${escapeHtml(step.title)}</h3>
      <p>${step.text}</p>
      <div class="rh-tour-actions">
        <button class="rh-tour-btn rh-tour-btn-prev" type="button" ${currentStepIdx === 0 ? 'disabled' : ''}>← Назад</button>
        <button class="rh-tour-btn rh-tour-btn-next" type="button">
          ${currentStepIdx === total - 1 ? 'Завершить ✓' : 'Далее →'}
        </button>
      </div>
    `;

    tooltip.querySelector('.rh-tour-skip').addEventListener('click', endTour);
    tooltip.querySelector('.rh-tour-btn-prev').addEventListener('click', prevStep);
    tooltip.querySelector('.rh-tour-btn-next').addEventListener('click', nextStep);
  }

  function showStep(idx) {
    if (!currentTour) return;
    if (idx < 0 || idx >= currentTour.steps.length) {
      endTour();
      return;
    }
    currentStepIdx = idx;
    const step = currentTour.steps[idx];
    renderTooltip(step);
    positionSpotlightAndTooltip(step);
  }

  function nextStep() { showStep(currentStepIdx + 1); }
  function prevStep() { showStep(currentStepIdx - 1); }

  function startTour(tourKey) {
    const tour = TOURS[tourKey];
    if (!tour) return;
    currentTour = tour;
    currentStepIdx = 0;

    ensureUI();

    // Show UI
    backdrop.classList.add('on');
    setTimeout(() => tooltip.classList.add('on'), 50);
    document.body.style.overflow = 'hidden';

    showStep(0);

    // Re-position on resize/scroll
    if (!scrollWatcher) {
      scrollWatcher = () => {
        if (currentTour) positionSpotlightAndTooltip(currentTour.steps[currentStepIdx]);
      };
      window.addEventListener('resize', scrollWatcher);
    }

    // Remove pulse on launcher
    const launcher = document.querySelector('.rh-tour-launcher');
    if (launcher) launcher.classList.remove('new');
  }

  function endTour() {
    if (!currentTour) return;
    try {
      localStorage.setItem('rh_tour_' + currentTour.id, '1');
    } catch(e) {}
    backdrop.classList.remove('on');
    tooltip.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (spotlight) spotlight.style.display = 'none';
    }, 300);
    currentTour = null;
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ============================================================
  // AUTO-DETECT current page and tour
  // ============================================================

  function detectTourKey() {
    const path = location.pathname;
    if (/\/(index\.html)?$/.test(path) || path === '/') return 'home';
    if (/catalog/.test(path)) return 'catalog';
    if (/account/.test(path)) return 'account';
    if (/auction/.test(path)) return 'auction';
    if (/prices/.test(path)) return 'prices';
    if (/sale/.test(path)) return 'sale';
    return null;
  }

  function hasSeenTour(key) {
    try { return localStorage.getItem('rh_tour_' + key) === '1'; }
    catch(e) { return false; }
  }

  // ============================================================
  // LAUNCHER BUTTON (always-available "Start tour" help button)
  // ============================================================

  function installLauncher() {
    const tourKey = detectTourKey();
    if (!tourKey || !TOURS[tourKey]) return;

    const btn = document.createElement('button');
    btn.className = 'rh-tour-launcher';
    btn.setAttribute('aria-label', 'Запустить обучение');
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 3-3 3"/>
        <circle cx="12" cy="17" r=".5" fill="currentColor"/>
      </svg>
      <span>Обучение</span>
    `;
    if (!hasSeenTour(tourKey)) btn.classList.add('new');
    btn.addEventListener('click', () => startTour(tourKey));
    // Need UI to be visible — inject after DOM ready
    document.body.appendChild(btn);

    // Remove auto-hide for first-time — keep visible
    ensureUI();
    const launcherStyle = document.createElement('style');
    launcherStyle.textContent = '.rh-tour-launcher { display: inline-flex !important; }';
    document.head.appendChild(launcherStyle);
  }

  // ============================================================
  // AUTO-RUN ON FIRST VISIT
  // ============================================================

  function autorun() {
    const tourKey = detectTourKey();
    if (!tourKey || !TOURS[tourKey]) return;

    // Don't auto-run if user already saw this tour
    if (hasSeenTour(tourKey)) return;

    // Don't auto-run if onboarding modal is already showing
    // (give that priority on first home visit)
    const onbModal = document.getElementById('onbModal');
    if (onbModal && onbModal.classList.contains('on')) {
      // Wait for onboarding to close, then run tour
      const check = setInterval(() => {
        if (!onbModal.classList.contains('on')) {
          clearInterval(check);
          setTimeout(() => startTour(tourKey), 800);
        }
      }, 500);
      return;
    }

    // Delay slightly so page renders first
    setTimeout(() => startTour(tourKey), 1200);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  window.RH_Tour = {
    start: startTour,
    end: endTour,
    isSeen: hasSeenTour,
    reset: function(key) {
      if (key) {
        localStorage.removeItem('rh_tour_' + key);
      } else {
        // Reset all
        Object.keys(TOURS).forEach(k => localStorage.removeItem('rh_tour_' + k));
      }
      const launcher = document.querySelector('.rh-tour-launcher');
      if (launcher) launcher.classList.add('new');
      console.log('[Tour] Reset. Refresh to see auto-run on first-visit page.');
    },
    currentKey: detectTourKey,
    available: () => Object.keys(TOURS)
  };

  // ============================================================
  // BOOTSTRAP
  // ============================================================

  function boot() {
    installLauncher();
    autorun();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
