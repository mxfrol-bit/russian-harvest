/**
 * PRODUCT TOUR — обучение по клику
 * =================================
 * Запускается ТОЛЬКО при клике на плавающую кнопку «Подсказки» внизу справа.
 * Никакого автозапуска, никаких setInterval в фоне, лёгкий рендеринг.
 */

(function () {
  'use strict';

  // ============================================================
  // TOUR STEP DEFINITIONS
  // ============================================================
  const TOURS = {
    home: {
      id: 'home',
      title: 'Обзор главной',
      steps: [
        {
          target: '.hero-search',
          title: 'Быстрый поиск',
          text: 'Здесь задаёте что ищете, тип заявки и объём партии. Все поля интерактивные.',
          position: 'bottom'
        },
        {
          target: '.popular',
          title: 'Популярные запросы',
          text: 'Одним кликом ищите частые культуры — пшеницу, кукурузу, подсолнечник.',
          position: 'bottom'
        },
        {
          target: '.region-chip',
          title: 'Ваш регион',
          text: 'Все расстояния и цены доставки считаются от этой точки. Кликните — смените город.',
          position: 'bottom'
        },
        {
          target: '.icon-btn',
          title: 'Поиск по сайту',
          text: 'Глобальный поиск страниц и товаров. Хоткей: ⌘K / Ctrl+K.',
          position: 'bottom'
        },
        {
          target: '[data-open="login"]',
          title: 'Демо-доступ',
          text: 'Откройте «Войти» → вкладка «Демо». Логины: admin/admin или user/user.',
          position: 'bottom'
        },
        {
          target: '.cards-grid',
          title: 'Каталог предложений',
          text: 'На главной — 8 свежих офферов. Полный каталог по кнопке внизу.',
          position: 'top'
        }
      ]
    },
    catalog: {
      id: 'catalog',
      title: 'Навигация по каталогу',
      steps: [
        {
          target: '.filters-aside',
          title: 'Фильтры',
          text: 'Фильтрация по культуре, региону, цене и расстоянию — в реальном времени.',
          position: 'right'
        },
        {
          target: '.view-toggle',
          title: 'Сетка или список',
          text: 'Переключайте режим. Выбор сохранится для следующего визита.',
          position: 'left'
        },
        {
          target: '.distance-strip',
          title: 'Расстояние',
          text: 'На каждой карточке — точная дистанция от вашего региона и стоимость доставки.',
          position: 'top'
        },
        {
          target: '.supplier-verify',
          title: 'Проверенные поставщики',
          text: 'Бейдж означает прохождение проверки. Данные раскрываются после оплаты через эскроу.',
          position: 'top'
        }
      ]
    },
    account: {
      id: 'account',
      title: 'Личный кабинет',
      steps: [
        {
          target: '.account-aside',
          title: 'Навигация кабинета',
          text: 'Сделки, заявки, чаты, избранное, история, профиль, платежи.',
          position: 'right'
        },
        {
          target: '.account-stats',
          title: 'Ключевые метрики',
          text: 'Активные сделки, ожидающие отклики, оборот — одним взглядом.',
          position: 'bottom'
        },
        {
          target: '#adminPanel',
          title: 'Админ-панель',
          text: 'Виден только администраторам. Модерация, пользователи, аналитика.',
          position: 'bottom',
          skipIfHidden: true
        },
        {
          target: '.deals-list',
          title: 'Активные сделки',
          text: 'Каждая сделка показывает статус, цену с доставкой и быстрые действия.',
          position: 'top'
        }
      ]
    },
    auction: {
      id: 'auction',
      title: 'Аукционы',
      steps: [
        {
          target: '.live-pulse',
          title: 'Живые торги',
          text: 'Все ставки и таймеры обновляются в реальном времени.',
          position: 'bottom'
        },
        {
          target: '.auction-timer-row',
          title: 'До конца торгов',
          text: 'Лоты с менее чем 1 часом до окончания подсвечены оранжевой пульсацией.',
          position: 'top'
        },
        {
          target: '.auction-actions',
          title: 'Сделать ставку',
          text: 'Минимальный шаг — 100 ₽/т. Средства резервируются на эскроу.',
          position: 'top'
        }
      ]
    },
    prices: {
      id: 'prices',
      title: 'Биржа котировок',
      steps: [
        {
          target: '.live-pulse',
          title: 'Обновление каждые 3 секунды',
          text: 'Цена мигает зелёным при росте, красным при падении.',
          position: 'bottom'
        },
        {
          target: '.quote-tile',
          title: 'Карточка котировки',
          text: 'Текущая медианная цена и процент изменения за период.',
          position: 'top'
        }
      ]
    },
    sale: {
      id: 'sale',
      title: 'Продажа урожая',
      steps: [
        {
          target: '.filter-bar',
          title: 'Фильтры заявок',
          text: 'Ищите заявки покупателей по культуре, региону, объёму, НДС.',
          position: 'bottom'
        },
        {
          target: '.reverse-card',
          title: 'Свой оффер',
          text: 'Создайте предложение о продаже — покупатели сами откликнутся.',
          position: 'top'
        }
      ]
    }
  };

  // ============================================================
  // CSS
  // ============================================================
  const TOUR_CSS = `
    .rh-tour-backdrop {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(15, 23, 42, .55);
      opacity: 0; pointer-events: none;
      transition: opacity .2s;
    }
    .rh-tour-backdrop.on { opacity: 1; pointer-events: auto; }

    .rh-tour-spotlight {
      position: absolute; z-index: 9999;
      border-radius: 14px;
      pointer-events: none;
      outline: 3px solid #97C524;
      outline-offset: 2px;
      box-shadow: 0 0 0 4000px rgba(15, 23, 42, .55);
      transition: top .25s ease, left .25s ease, width .25s ease, height .25s ease;
    }

    .rh-tour-tooltip {
      position: absolute; z-index: 10000;
      background: #FFFFFF;
      border-radius: 14px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, .25);
      max-width: 340px;
      min-width: 280px;
      padding: 18px 20px;
      opacity: 0;
      transform: scale(.96);
      transition: opacity .18s, transform .18s;
      font-family: 'Manrope', system-ui, sans-serif;
    }
    .rh-tour-tooltip.on { opacity: 1; transform: scale(1); }

    .rh-tour-progress {
      display: flex; gap: 4px; margin-bottom: 12px;
    }
    .rh-tour-progress span {
      flex: 1; height: 3px; border-radius: 999px;
      background: #E2E8F0;
    }
    .rh-tour-progress span.done,
    .rh-tour-progress span.current {
      background: #97C524;
    }
    .rh-tour-tooltip-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 4px;
    }
    .rh-tour-step-n {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; color: #94A3B8; font-weight: 600;
    }
    .rh-tour-skip {
      background: none; border: none; cursor: pointer;
      color: #94A3B8; font-size: 12px; font-weight: 500;
      padding: 4px 8px; border-radius: 6px;
      font-family: inherit;
    }
    .rh-tour-skip:hover { color: #334155; background: #F1F5F9; }
    .rh-tour-tooltip h3 {
      font-size: 16px; font-weight: 700; color: #1A2410;
      letter-spacing: -.015em; line-height: 1.3;
      margin: 0 0 6px;
    }
    .rh-tour-tooltip p {
      font-size: 13.5px; line-height: 1.55; color: #475569;
      margin: 0 0 14px;
    }
    .rh-tour-actions {
      display: flex; justify-content: space-between; gap: 8px;
    }
    .rh-tour-btn {
      padding: 9px 16px; border-radius: 9px;
      font-family: inherit; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none;
      transition: background .12s;
    }
    .rh-tour-btn-prev {
      background: #F1F5F9; color: #475569;
    }
    .rh-tour-btn-prev:hover { background: #E2E8F0; }
    .rh-tour-btn-prev:disabled {
      opacity: .4; cursor: not-allowed;
    }
    .rh-tour-btn-next {
      background: #97C524; color: #FFFFFF;
    }
    .rh-tour-btn-next:hover { background: #618B27; }

    @media (max-width: 720px) {
      .rh-tour-tooltip {
        max-width: calc(100vw - 32px);
        min-width: 0;
      }
    }
  `;

  // ============================================================
  // STATE
  // ============================================================
  let currentTour = null;
  let currentStepIdx = 0;
  let backdrop, spotlight, tooltip;
  let resizeHandler = null;
  let uiInjected = false;

  function injectCSS() {
    if (document.getElementById('rh-tour-css')) return;
    const style = document.createElement('style');
    style.id = 'rh-tour-css';
    style.textContent = TOUR_CSS;
    document.head.appendChild(style);
  }

  function ensureUI() {
    if (uiInjected) return;
    injectCSS();

    backdrop = document.createElement('div');
    backdrop.className = 'rh-tour-backdrop';
    backdrop.addEventListener('click', endTour);
    document.body.appendChild(backdrop);

    spotlight = document.createElement('div');
    spotlight.className = 'rh-tour-spotlight';
    spotlight.style.display = 'none';
    document.body.appendChild(spotlight);

    tooltip = document.createElement('div');
    tooltip.className = 'rh-tour-tooltip';
    document.body.appendChild(tooltip);

    uiInjected = true;
  }

  function findTarget(step) {
    if (!step.target) return null;
    const selectors = step.target.split(',').map(s => s.trim());
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) return el;
      } catch (e) { /* bad selector */ }
    }
    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.offsetParent === null && el.tagName !== 'BODY') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function placeElements(step) {
    const target = findTarget(step);

    // No target found — center the tooltip
    if (!target) {
      spotlight.style.display = 'none';
      tooltip.style.top = (window.scrollY + window.innerHeight / 2 - 100) + 'px';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.removeAttribute('data-pos');
      return;
    }

    spotlight.style.display = '';
    tooltip.style.transform = '';

    const rect = target.getBoundingClientRect();
    const padding = 6;
    const top = rect.top + window.scrollY - padding;
    const left = rect.left + window.scrollX - padding;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;

    spotlight.style.top = top + 'px';
    spotlight.style.left = left + 'px';
    spotlight.style.width = width + 'px';
    spotlight.style.height = height + 'px';

    const pos = step.position || 'bottom';
    const tw = 340;
    const th = tooltip.offsetHeight || 180;
    const gap = 16;

    let tt, tl;
    switch (pos) {
      case 'top':
        tt = top - th - gap;
        tl = left + width / 2 - tw / 2;
        break;
      case 'left':
        tt = top + height / 2 - th / 2;
        tl = left - tw - gap;
        break;
      case 'right':
        tt = top + height / 2 - th / 2;
        tl = left + width + gap;
        break;
      default: // bottom
        tt = top + height + gap;
        tl = left + width / 2 - tw / 2;
    }

    // Clamp to viewport
    const margin = 16;
    const vpTop = window.scrollY + margin;
    const vpBottom = window.scrollY + window.innerHeight - th - margin;
    const vpLeft = margin;
    const vpRight = window.innerWidth - tw - margin;

    if (tl < vpLeft) tl = vpLeft;
    if (tl > vpRight) tl = vpRight;
    if (tt < vpTop) tt = vpTop;
    if (tt > vpBottom) tt = vpBottom;

    tooltip.style.top = tt + 'px';
    tooltip.style.left = tl + 'px';
    tooltip.setAttribute('data-pos', pos);
  }

  function scrollToTargetIfNeeded(step) {
    const target = findTarget(step);
    if (!target) return false;
    const rect = target.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      } catch (e) {
        target.scrollIntoView();
        return true;
      }
    }
    return false;
  }

  function renderTooltip(step) {
    const total = currentTour.steps.length;
    let dots = '';
    for (let i = 0; i < total; i++) {
      let cls = '';
      if (i < currentStepIdx) cls = 'done';
      else if (i === currentStepIdx) cls = 'current';
      dots += `<span class="${cls}"></span>`;
    }

    tooltip.innerHTML = `
      <div class="rh-tour-progress">${dots}</div>
      <div class="rh-tour-tooltip-head">
        <span class="rh-tour-step-n">${currentStepIdx + 1} / ${total}</span>
        <button class="rh-tour-skip" type="button">Закрыть</button>
      </div>
      <h3>${escapeHtml(step.title)}</h3>
      <p>${escapeHtml(step.text)}</p>
      <div class="rh-tour-actions">
        <button class="rh-tour-btn rh-tour-btn-prev" type="button" ${currentStepIdx === 0 ? 'disabled' : ''}>← Назад</button>
        <button class="rh-tour-btn rh-tour-btn-next" type="button">${
          currentStepIdx === total - 1 ? 'Готово ✓' : 'Далее →'
        }</button>
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

    // Skip hidden steps with skipIfHidden flag (limit iterations to prevent infinite loops)
    let safety = 20;
    while (idx < currentTour.steps.length && safety-- > 0) {
      const step = currentTour.steps[idx];
      const target = findTarget(step);
      if (!target && step.skipIfHidden) {
        idx++;
        continue;
      }
      currentStepIdx = idx;
      renderTooltip(step);
      const scrolled = scrollToTargetIfNeeded(step);
      if (scrolled) {
        setTimeout(() => placeElements(step), 350);
      } else {
        placeElements(step);
      }
      return;
    }

    // All remaining steps were skipped
    endTour();
  }

  function nextStep() { showStep(currentStepIdx + 1); }
  function prevStep() { showStep(currentStepIdx - 1); }

  function startTour(tourKey) {
    const tour = TOURS[tourKey];
    if (!tour) {
      console.warn('[Tour] Unknown tour key:', tourKey);
      return;
    }

    ensureUI();
    currentTour = tour;
    currentStepIdx = 0;

    backdrop.classList.add('on');
    requestAnimationFrame(() => tooltip.classList.add('on'));

    showStep(0);

    // Reposition on resize while tour is active
    if (!resizeHandler) {
      let rafPending = false;
      resizeHandler = () => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          if (currentTour) placeElements(currentTour.steps[currentStepIdx]);
        });
      };
      window.addEventListener('resize', resizeHandler, { passive: true });
      window.addEventListener('scroll', resizeHandler, { passive: true });
    }

    try { localStorage.setItem('rh_tour_' + tour.id, '1'); } catch (e) {}
  }

  function endTour() {
    if (!uiInjected) return;
    if (backdrop) backdrop.classList.remove('on');
    if (tooltip) tooltip.classList.remove('on');
    setTimeout(() => {
      if (spotlight) spotlight.style.display = 'none';
    }, 200);
    currentTour = null;

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler);
      resizeHandler = null;
    }
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ============================================================
  // PAGE DETECTION
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

  // ============================================================
  // LAUNCHER — bind to header button #tourHelpBtn only.
  // No floating button, no autorun.
  // ============================================================
  function installLauncher() {
    injectCSS();

    const btn = document.getElementById('tourHelpBtn');
    if (btn && !btn.dataset.tourBound) {
      btn.dataset.tourBound = '1';
      btn.addEventListener('click', () => {
        if (currentTour) {
          endTour();
          return;
        }
        const tourKey = detectTourKey();
        if (tourKey && TOURS[tourKey]) {
          startTour(tourKey);
        } else {
          // No tour for this page — show short notification
          const t = document.createElement('div');
          t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1A2410;color:#fff;padding:14px 22px;border-radius:12px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 16px 40px rgba(15,23,42,.3)';
          t.textContent = 'Подсказки доступны на страницах: Главная, Каталог, Продать, Кабинет';
          document.body.appendChild(t);
          setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
        }
      });
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.RH_Tour = {
    start: startTour,
    end: endTour,
    available: () => Object.keys(TOURS),
    currentKey: detectTourKey,
    reset: function (key) {
      try {
        if (key) localStorage.removeItem('rh_tour_' + key);
        else Object.keys(TOURS).forEach(k => localStorage.removeItem('rh_tour_' + k));
      } catch (e) {}
    }
  };

  // ============================================================
  // BOOTSTRAP — only install launcher button. NO AUTORUN.
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installLauncher);
  } else {
    installLauncher();
  }
})();
