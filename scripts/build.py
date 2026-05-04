#!/usr/bin/env python3
"""Russian Harvest — multi-page static site builder."""
import os
import time
from pathlib import Path

# Cache-busting: version stamp for assets, regenerated on every build.
# This forces browsers to reload CSS/JS even if Caddy/CDN cached them.
BUILD_ID = os.environ.get('BUILD_ID') or str(int(time.time()))

# Resolve site directory robustly:
#   - If script is in scripts/ subdir: SITE = ../site (parent.parent / site)
#   - If script is in repo root:       SITE = ./site (parent / site)
#   - Override with $SITE_DIR env var in any environment.
_here = Path(__file__).resolve().parent
if (_here.parent / 'site').exists():
    _default_site = _here.parent / 'site'
elif (_here / 'site').exists():
    _default_site = _here / 'site'
else:
    _default_site = Path.cwd() / 'site'

SITE = Path(os.environ.get('SITE_DIR', str(_default_site)))
SITE.mkdir(parents=True, exist_ok=True)
print(f'[build] Writing pages to: {SITE}')

# ================= SHARED COMPONENTS =================

def icon(name):
    """SVG icons used across the site."""
    icons = {
        'search':       '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="6"/><path d="m17 17-3.5-3.5"/></svg>',
        'search-lg':    '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="6"/><path d="m17 17-3.5-3.5"/></svg>',
        'pin':          '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 18s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="10" cy="8" r="2"/></svg>',
        'phone':        '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h4l2 4-2 1s1 3 4 6l1-2 4 2v4a2 2 0 0 1-2 2A14 14 0 0 1 2 6a2 2 0 0 1 2-2z"/></svg>',
        'menu':         '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
        'grid':         '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>',
        'list':         '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h14M3 10h14M3 15h14"/><circle cx="3" cy="5" r=".8" fill="currentColor"/><circle cx="3" cy="10" r=".8" fill="currentColor"/><circle cx="3" cy="15" r=".8" fill="currentColor"/></svg>',
        'close':        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg>',
        'check':        '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="10" cy="10" r="8"/><path d="m7 10 2 2 4-4"/></svg>',
        'check-big':    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z"/><path d="m7 10 2 2 4-4"/></svg>',
        'sparkles':     '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1l2.4 6.1 6.6.5-5 4.4 1.5 6.4L10 15l-5.5 3.4L6 12 1 7.6l6.6-.5z"/></svg>',
        'arrow':        '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h12M11 5l5 5-5 5"/></svg>',
        'arrow-sm':     '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 10h12M11 5l5 5-5 5"/></svg>',
        'clock':        '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 2"/></svg>',
        'shield':       '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z"/><path d="m7 10 2 2 4-4"/></svg>',
        'user':         '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>',
        'truck':        '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 7h10v7H2zM12 10h4l2 3v1h-6zM5 17a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM14 17a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>',
        'tractor':      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h5l2-4h6l2 4h5v6H2zM5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>',
        'coins':        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>',
        'chart':        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="13" y="8" width="3" height="10"/><rect x="19" y="5" width="3" height="13"/></svg>',
        'headset':      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2 2a12 12 0 0 0 6 6l2-2 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
        'message':      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18v12H8l-5 4V5z"/></svg>',
        'mail':         '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
        'calendar':     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>',
        'handshake':    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 11 2 2 4-4 2 2-8 8-6-6 2-2 2 2 2-2z"/><path d="m15 7 3-3"/></svg>',
        'lock':         '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/></svg>',
        'alert':        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2 2 16h16z"/><path d="M10 8v4M10 14v.5"/></svg>',
        'info':         '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 13v.5"/></svg>',
        'tg':           '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.6 8.2l-1.9 8.9c-.1.6-.5.8-1.1.5l-3-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.7-5.1c.2-.2 0-.3-.4-.1l-7 4.4-3-.9c-.7-.2-.7-.7.1-1l11.7-4.5c.5-.2 1 .1.7 1z"/></svg>',
        'vk':           '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.8 17.2c-5.6 0-8.8-3.8-8.9-10.1h2.8c.1 4.6 2.1 6.5 3.7 6.9V7.1h2.6v4c1.6-.2 3.3-2 3.9-4h2.6c-.4 2.5-2.2 4.3-3.5 5 1.3.6 3.4 2.2 4.2 5.1h-2.9c-.6-2-2.1-3.5-3.9-3.8v3.8h-.6z"/></svg>',
        'wa':           '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.5 5.9L0 24l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12S18.6 0 12 0z"/></svg>',
        'verify':       '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="m7.5 10 2 2 3.5-4 1.4 1.4L9.5 15 6 11.4z"/></svg>',
        'buyer':        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16l-1.5 11H5.5z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>',
        'seller':       '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h18v12H3zM7 8V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3"/><path d="M9 12h6"/></svg>',
    }
    return icons.get(name, '')


def header(active=''):
    """Returns the header HTML. active = catalog|sale|about|how|contacts|prices"""
    def nav_item(href, label, key):
        cls = 'active' if active == key else ''
        return f'<a href="{href}" class="{cls}">{label}</a>'

    return f'''<div class="ticker"><div class="ticker-track" id="tickerTrack"></div></div>

<header class="site-header">
  <div class="bar">
    <a class="brand" href="/index.html">
      <img src="https://russian-harvest.ru/img/logo.svg" alt="Русский Урожай" />
      <div class="brand-sub"><span class="s">Растим будущее агробизнеса</span></div>
    </a>
    <nav class="nav-main">
      {nav_item('/catalog.html', 'Купить', 'catalog')}
      {nav_item('/sale.html', 'Продать', 'sale')}
      {nav_item('/auction.html', 'Аукцион', 'auction')}
      {nav_item('/prices.html', 'Биржа', 'prices')}
      {nav_item('/about.html', 'О компании', 'about')}
      {nav_item('/how.html', 'Помощь', 'how')}
      {nav_item('/contacts.html', 'Контакты', 'contacts')}
    </nav>
    <div class="spacer"></div>
    <button class="icon-btn" id="siteSearchBtn" title="Поиск по сайту (⌘K)" aria-label="Поиск">
      {icon('search-lg')}
    </button>
    <button class="icon-btn" id="tourHelpBtn" title="Подсказки по странице" aria-label="Обучение">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </button>
    <button class="region-chip" title="Ваш адрес доставки — все расстояния считаются от него">
      <span class="ico">{icon('pin')}</span>
      Нижний Новгород
      <span class="change">изменить</span>
    </button>
    <span class="phone-link">
      <span class="ico">{icon('phone')}</span>
      <a href="tel:+79300129797">+7 930 012-97-97</a>
    </span>
    <button class="btn btn-ghost btn-sm" data-open="login">Войти</button>
    <a class="btn btn-primary btn-sm" href="/account.html">Кабинет</a>
    <button class="menu-trigger" id="menuTrigger" aria-label="Меню">{icon('menu')}</button>
  </div>
</header>

<!-- Mobile drawer -->
<div class="drawer-backdrop" id="drawerBackdrop"></div>
<aside class="drawer" id="drawer">
  <div class="drawer-head">
    <img src="https://russian-harvest.ru/img/logo.svg" alt="Русский Урожай" />
    <button class="drawer-close" id="drawerClose" aria-label="Закрыть">{icon('close')}</button>
  </div>
  <div class="drawer-body">
    <nav class="drawer-nav">
      <a href="/catalog.html" class="{'active' if active=='catalog' else ''}">Купить</a>
      <a href="/sale.html" class="{'active' if active=='sale' else ''}">Продать</a>
      <a href="/auction.html" class="{'active' if active=='auction' else ''}">Аукцион</a>
      <a href="/prices.html" class="{'active' if active=='prices' else ''}">Биржа цен</a>
      <a href="/about.html" class="{'active' if active=='about' else ''}">О компании</a>
      <a href="/how.html" class="{'active' if active=='how' else ''}">Помощь</a>
      <a href="/contacts.html" class="{'active' if active=='contacts' else ''}">Контакты</a>
    </nav>
  </div>
  <div class="drawer-foot">
    <a href="tel:+79300129797" class="phone">{icon('phone')} +7 930 012-97-97</a>
    <a class="btn btn-primary btn-block" href="/account.html">Личный кабинет</a>
    <button class="btn btn-outline btn-block" data-open="login">Войти</button>
  </div>
</aside>'''


def footer():
    return f'''<footer class="site-footer">
  <div class="foot-wrap">
    <div class="foot-brand">
      <img src="https://russian-harvest.ru/img/logo.svg" alt="Русский Урожай" />
      <p>Онлайн-площадка для прямых сделок между фермерами и покупателями сельхозпродукции. Прозрачно, быстро, надёжно.</p>
      <span class="mono" style="font-size:11px;color:var(--slate-400)">ИП Фролов В.А.</span>
    </div>
    <div class="foot-col">
      <h5>Разделы</h5>
      <a href="/catalog.html">Купить</a>
      <a href="/sale.html">Продать</a>
      <a href="/about.html">О компании</a>
      <a href="/how.html">Помощь</a>
      <a href="/contacts.html">Контакты</a>
    </div>
    <div class="foot-col">
      <h5>Документы</h5>
      <a href="/offer.html">Публичная оферта</a>
      <a href="/regulations.html">Правила площадки</a>
      <a href="/policy.html">Политика конфиденциальности</a>
      <a href="/dispute.html">Регламент споров</a>
    </div>
    <div class="foot-col">
      <h5>Контакты</h5>
      <a href="tel:+79300129797">+7 930 012-97-97</a>
      <a href="mailto:support@russian-harvest.ru">support@russian-harvest.ru</a>
      <span class="txt">Нижний Новгород</span>
      <div class="foot-soc" style="margin-top:8px">
        <a href="https://t.me/tdrusagro" title="Telegram">{icon('tg')}</a>
        <a href="#" title="VK">{icon('vk')}</a>
        <a href="#" title="WhatsApp">{icon('wa')}</a>
      </div>
    </div>
  </div>
  <div class="foot-bot">
    <span class="c">© 2026 Русский Урожай</span>
    <span style="font-size:12px;color:var(--slate-400)">Сайт использует файлы cookies для улучшения работы.</span>
  </div>
</footer>'''


def search_overlay():
    return '''<div class="so-backdrop" id="soBackdrop"></div>
<div class="so" id="so">
  <div class="so-in">
    ''' + icon('search-lg') + '''
    <input type="text" id="soInput" placeholder="Поиск по сайту: культуры, регионы, поставщики…" autocomplete="off" />
    <span class="esc">Esc</span>
  </div>
  <div class="so-body">
    <div class="sd-sec">
      <div class="sd-title">Популярные запросы</div>
      <div class="sd-chips">
        <button class="sd-chip">пшеница 3 класс</button>
        <button class="sd-chip">кукуруза с НДС</button>
        <button class="sd-chip">рапс с доставкой</button>
        <button class="sd-chip">ячмень кормовой</button>
        <button class="sd-chip">подсолнечник опт</button>
      </div>
    </div>
    <div class="sd-sec">
      <div class="sd-title">Культуры <span class="cnt">9 категорий</span></div>
      <a class="sd-item" href="/catalog.html"><div class="sd-ic">🌾</div><div class="sd-main"><div class="sd-lbl">Пшеница 3 класс</div><div class="sd-meta"><span>412 офферов</span><span class="dot"></span><span class="price">от 14 200 ₽/т</span></div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/catalog.html"><div class="sd-ic">🌽</div><div class="sd-main"><div class="sd-lbl">Кукуруза</div><div class="sd-meta"><span>143 оффера</span><span class="dot"></span><span class="price">от 15 000 ₽/т</span></div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/catalog.html"><div class="sd-ic">🌻</div><div class="sd-main"><div class="sd-lbl">Подсолнечник</div><div class="sd-meta"><span>112 офферов</span><span class="dot"></span><span class="price">от 28 400 ₽/т</span></div></div><span class="sd-arrow">→</span></a>
    </div>
    <div class="sd-sec">
      <div class="sd-title">Регионы</div>
      <a class="sd-item" href="/catalog.html"><div class="sd-ic orange">📍</div><div class="sd-main"><div class="sd-lbl">Нижегородская область</div><div class="sd-meta"><span>142 оффера</span></div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/catalog.html"><div class="sd-ic orange">📍</div><div class="sd-main"><div class="sd-lbl">Рязанская область</div><div class="sd-meta"><span>89 офферов</span></div></div><span class="sd-arrow">→</span></a>
    </div>
    <div class="sd-sec">
      <div class="sd-title">Разделы сайта</div>
      <a class="sd-item" href="/how.html"><div class="sd-ic">🔒</div><div class="sd-main"><div class="sd-lbl">Как работает эскроу</div><div class="sd-meta"><span>защита сделки</span></div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/about.html"><div class="sd-ic">ℹ️</div><div class="sd-main"><div class="sd-lbl">О компании</div><div class="sd-meta"><span>миссия, команда, партнёры</span></div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/contacts.html"><div class="sd-ic">📞</div><div class="sd-main"><div class="sd-lbl">Поддержка · контакты</div><div class="sd-meta"><span>регистрация, споры, оплата</span></div></div><span class="sd-arrow">→</span></a>
    </div>
  </div>
  <div class="so-ft">
    <div class="hints">
      <span><kbd>↑</kbd><kbd>↓</kbd> навигация</span>
      <span><kbd>↵</kbd> открыть</span>
      <span><kbd>Esc</kbd> закрыть</span>
    </div>
    <span class="all">Все результаты →</span>
  </div>
</div>'''


def onboarding_modal():
    """First-visit modal: are you buying or selling?"""
    return f'''<div class="modal-backdrop" id="onbBackdrop"></div>
<div class="modal modal-onb" id="onbModal" role="dialog" aria-labelledby="onbTitle">
  <button class="modal-close" data-close="onb" aria-label="Закрыть">{icon('close')}</button>
  <div class="onb-head">
    <img src="https://russian-harvest.ru/img/logo.svg" alt="Русский Урожай" class="onb-logo" />
    <h2 id="onbTitle">Здравствуйте! Что вас интересует?</h2>
    <p>Выберите сценарий — мы подстроим интерфейс под ваши задачи. Это можно будет изменить в любой момент.</p>
  </div>
  <div class="onb-choices">
    <button class="onb-choice" data-role="buyer">
      <div class="onb-choice-ic">{icon('buyer')}</div>
      <div class="onb-choice-body">
        <h3>Я хочу купить урожай</h3>
        <p>Покажем каталог офферов, биржу цен и калькулятор доставки до вашего склада.</p>
        <span class="onb-choice-go">Перейти в каталог {icon('arrow-sm')}</span>
      </div>
    </button>
    <button class="onb-choice" data-role="seller">
      <div class="onb-choice-ic">{icon('seller')}</div>
      <div class="onb-choice-body">
        <h3>Я хочу продать урожай</h3>
        <p>Покажем заявки покупателей, подскажем рыночную цену и поможем разместить оффер.</p>
        <span class="onb-choice-go">Смотреть заявки {icon('arrow-sm')}</span>
      </div>
    </button>
  </div>
  <div class="onb-foot">
    <button class="onb-skip" data-close="onb">Пропустить — я просто смотрю</button>
    <button class="onb-login" data-open="login" data-close="onb">Уже есть аккаунт? Войти</button>
  </div>
</div>'''


def login_modal():
    return f'''<div class="modal-backdrop" id="loginBackdrop"></div>
<div class="modal modal-login" id="loginModal" role="dialog" aria-labelledby="loginTitle">
  <button class="modal-close" data-close="login" aria-label="Закрыть">{icon('close')}</button>

  <div class="login-tabs">
    <button class="login-tab active" data-tab="signin">Вход</button>
    <button class="login-tab" data-tab="signup">Регистрация</button>
    <button class="login-tab demo-tab" data-tab="demo">🔑 Демо</button>
  </div>

  <!-- SIGN IN -->
  <div class="login-pane" data-pane="signin">
    <h2 id="loginTitle">Вход в личный кабинет</h2>
    <p class="login-sub">Введите email и пароль вашего аккаунта.</p>
    <form class="login-form" id="signinForm">
      <div class="form-group">
        <label>Email <span class="req">*</span></label>
        <input type="email" name="email" required placeholder="mail@company.ru" autocomplete="email" />
      </div>
      <div class="form-group">
        <label>Пароль <span class="req">*</span></label>
        <input type="password" name="password" required placeholder="••••••••" autocomplete="current-password" minlength="6" />
        <div class="form-hint" id="signinHint">Минимум 6 символов</div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit" id="signinSubmit">Войти {icon('arrow-sm')}</button>
    </form>
  </div>

  <!-- SIGN UP -->
  <div class="login-pane" data-pane="signup" hidden>
    <h2>Регистрация на платформе</h2>
    <p class="login-sub">Создайте аккаунт за 1 минуту.</p>
    <form class="login-form" id="signupForm">
      <div class="form-row">
        <div class="form-group">
          <label>Я хочу</label>
          <div class="seg">
            <button type="button" class="seg-btn active" data-role="buyer">Покупать</button>
            <button type="button" class="seg-btn" data-role="seller">Продавать</button>
          </div>
          <input type="hidden" name="role" value="buyer" />
        </div>
      </div>
      <div class="form-group">
        <label>Название компании <span class="req">*</span></label>
        <input type="text" name="company_name" required placeholder="ООО «АгроКомпания» / ИП Иванов" />
      </div>
      <div class="form-group">
        <label>ФИО контактного лица <span class="req">*</span></label>
        <input type="text" name="full_name" required placeholder="Иванов Иван Иванович" />
      </div>
      <div class="form-group">
        <label>ИНН <span class="req">*</span></label>
        <input type="text" name="inn" required placeholder="10 или 12 цифр" maxlength="12" inputmode="numeric" pattern="[0-9]+" />
      </div>
      <div class="form-group">
        <label>Телефон</label>
        <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" />
      </div>
      <div class="form-group">
        <label>Email <span class="req">*</span></label>
        <input type="email" name="email" required placeholder="mail@company.ru" autocomplete="email" />
      </div>
      <div class="form-group">
        <label>Пароль <span class="req">*</span></label>
        <input type="password" name="password" required minlength="6" placeholder="Минимум 6 символов" autocomplete="new-password" />
        <div class="form-hint" id="signupHint"></div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit" id="signupSubmit">Создать аккаунт {icon('arrow-sm')}</button>
      <p class="form-note" style="margin-top:12px">
        Нажимая «Создать аккаунт», вы принимаете <a href="/offer.html">оферту</a> и <a href="/policy.html">политику конфиденциальности</a>.
      </p>
    </form>
  </div>

  <!-- DEMO LOGIN -->
  <div class="login-pane" data-pane="demo" hidden>
    <h2>Демо-доступ</h2>
    <p class="login-sub">Войдите в один из тестовых аккаунтов, чтобы оценить интерфейс без регистрации.</p>

    <div class="demo-accounts">
      <button class="demo-account" data-login="admin" data-pass="admin">
        <div class="demo-account-ic">👑</div>
        <div class="demo-account-body">
          <div class="demo-account-name">Администратор</div>
          <div class="demo-account-creds">
            <code>admin</code> / <code>admin</code>
          </div>
          <div class="demo-account-desc">Модерация офферов, управление сделками, статистика платформы</div>
        </div>
      </button>

      <button class="demo-account" data-login="user" data-pass="user">
        <div class="demo-account-ic">👤</div>
        <div class="demo-account-body">
          <div class="demo-account-name">Обычный пользователь</div>
          <div class="demo-account-creds">
            <code>user</code> / <code>user</code>
          </div>
          <div class="demo-account-desc">Покупатель с активными сделками, заявками и историей</div>
        </div>
      </button>
    </div>

    <form class="login-form" id="demoForm" onsubmit="event.preventDefault();return false">
      <div class="form-group">
        <label>Или введите вручную</label>
        <input type="text" id="demoUsername" placeholder="Логин (admin или user)" autocomplete="username" />
      </div>
      <div class="form-group">
        <input type="password" id="demoPassword" placeholder="Пароль" autocomplete="current-password" />
        <div class="form-hint" id="demoHint">В демо-режиме: <b>admin/admin</b> или <b>user/user</b></div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit" id="demoSubmit">Войти {icon('arrow-sm')}</button>
    </form>
  </div>
</div>'''


def page(title, body, active='', description=None):
    """Wrap body with full page HTML."""
    desc = description or 'Русский Урожай — онлайн-площадка для покупки и продажи сельхозпродукции напрямую между фермерами и покупателями.'

    # Mobile app-style bottom tabbar
    def tab(href, label, key, svg):
        cls = 'active' if active == key else ''
        return f'<a href="{href}" class="{cls}">{svg}<span>{label}</span></a>'

    tabbar = f'''<nav class="mobile-tabbar">
      {tab('/index.html', 'Главная', 'home', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></svg>')}
      {tab('/catalog.html', 'Каталог', 'catalog', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>')}
      {tab('/auction.html', 'Аукцион', 'auction', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3l7 7-4 4-7-7zM12 11l-7 7 3 3 7-7zM4 22h10"/></svg>')}
      {tab('/prices.html', 'Биржа', 'prices', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>')}
      {tab('/account.html', 'Кабинет', 'account', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>')}
    </nav>'''

    return f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>{title} — Русский Урожай</title>
<meta name="description" content="{desc}" />
<meta name="theme-color" content="#97C524" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Русский Урожай" />
<meta name="mobile-web-app-capable" content="yes" />
<link rel="manifest" href="/manifest.json" />
<link rel="icon" type="image/svg+xml" href="https://russian-harvest.ru/img/logo.svg" />
<link rel="apple-touch-icon" href="https://russian-harvest.ru/img/logo.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/main.css?v={BUILD_ID}">
</head>
<body>

{header(active)}

{body}

{footer()}

{tabbar}

{search_overlay()}
{onboarding_modal()}
{login_modal()}

<script src="/assets/js/config.js?v={BUILD_ID}"></script>
<script src="/assets/js/cities.js?v={BUILD_ID}"></script>
<script src="/assets/js/api.js?v={BUILD_ID}"></script>
<script src="/assets/js/main.js?v={BUILD_ID}"></script>
<script src="/assets/js/admin.js?v={BUILD_ID}"></script>
<script src="/assets/js/tour.js?v={BUILD_ID}"></script>
</body>
</html>'''


# ================= CARD COMPONENT =================

def offer_card(data, featured=False):
    """Build one offer card HTML."""
    classes = ['card']
    if featured:
        classes.append('card-featured')
    if data.get('archive'):
        classes.append('card-archive')
    cls = ' '.join(classes)
    badge_cls = f"badge {data.get('badge_class', '')}".strip()
    if data.get('archive'):
        badge_cls = 'badge archive'
        data = {**data, 'badge': 'В архиве'}

    quality_rows = ''.join(
        f'<div class="q-row">{icon("check")}<span class="k">{k}</span><span class="v">{v}</span></div>'
        for k, v in data.get('quality', {}).items()
    )
    n_q = len(data.get('quality', {}))
    q_word = plural_ru(n_q, ('параметр', 'параметра', 'параметров'))

    # Deals pluralization
    n_deals = data.get('deals_count', 34)
    deals_word = plural_ru(n_deals, ('сделка', 'сделки', 'сделок'))

    cta_label = 'В архиве' if data.get('archive') else 'Купить'

    # Normalize crop category for filtering
    title = data['title']
    crop_key = 'other'
    if 'Пшеница' in title: crop_key = 'wheat'
    elif 'Ячмень' in title: crop_key = 'barley'
    elif 'Кукуруза' in title: crop_key = 'corn'
    elif 'Подсолнечник' in title: crop_key = 'sunflower'
    elif 'Овёс' in title or 'Овес' in title: crop_key = 'oat'
    elif 'Рапс' in title: crop_key = 'rapeseed'
    elif 'Соя' in title: crop_key = 'soy'
    elif 'Горох' in title: crop_key = 'pea'
    elif 'Гречиха' in title: crop_key = 'buckwheat'

    # Numeric price for filtering (strip spaces/spaces)
    price_num = data['price'].replace(' ', '').replace(' ', '')
    has_delivery = '1' if data.get('delivery_cost') is not None else '0'
    has_vat = '1' if 'с НДС' in data.get('vat', '') else '0'
    has_lab = '1' if n_q >= 4 else '0'

    data_attrs = (
        f'data-offer="{data["id"]}" data-crop="{crop_key}" data-region="{data["region"]}" '
        f'data-price="{price_num}" data-distance="{data["distance_km"]}" '
        f'data-delivery="{has_delivery}" data-vat="{has_vat}" data-lab="{has_lab}" '
        f'data-title="{title}"'
    )

    return f'''<article class="{cls}" {data_attrs}>
  <div class="card-head">
    <div class="card-top">
      <div>
        <span class="{badge_cls}">{data.get('badge', 'Проверено')}</span>
        <h3 class="card-title">{data['title']}</h3>
      </div>
      <div class="card-price-pill">
        <span class="num">{data['price']} ₽/т</span>
        <span class="small">{data.get('vat', 'с НДС')}</span>
      </div>
    </div>
    <div class="card-meta">
      <div class="cell"><div class="k">Объём</div><div class="v">{data['volume']}</div></div>
      <div class="cell"><div class="k">Урожай</div><div class="v">{data['harvest']}</div></div>
      <div class="cell"><div class="k">Регион</div><div class="v">{data['region']}</div></div>
    </div>
  </div>
  <button class="q-toggle" data-q="{data['id']}">
    <span class="lbl">
      <span class="lbl-ic">{icon('info')}</span>
      Показатели качества
    </span>
    <span class="right"><span class="count">{n_q} {q_word}</span><span class="chev">▼</span></span>
  </button>
  <div class="q-body" data-q="{data['id']}"><div class="q-body-inner">{quality_rows}</div></div>
  {distance_strip(data)}
  <div class="supplier-strip">
    <span class="supplier-verify"><span class="bc">{icon('verify')}</span>Поставщик проверен</span>
    <div class="supplier-stat">
      <span class="rating"><span class="star">★</span>{data.get('rating', '4.9')}</span>
      <span class="dot"></span>
      <span>{n_deals} {deals_word}</span>
      <span class="dot"></span>
      <span class="id">ID {data.get('sid', 'A-0000')}</span>
    </div>
  </div>
  <div class="card-foot">
    <span class="delivery-tag">{icon('truck')}{data.get('delivery', 'Самовывоз')}</span>
    <a class="cta" href="{'#' if data.get('archive') else '/product.html'}">{cta_label} {icon('arrow-sm') if not data.get('archive') else ''}</a>
  </div>
</article>'''


# ================= OFFERS DATA =================

OFFERS = [
    # Near NN (<100 km) — sorted by distance
    {'id':0,'title':'Ячмень кормовой','price':'13 000','vat':'с НДС 10%','volume':'10 т','harvest':'2025','region':'Балахна','distance_km':39,'delivery_cost':450,'badge':'Горячее','badge_class':'featured','quality':{'Влажность':'5 %','Сорная примесь':'1 %','Протеин':'11 %','Натура':'570 г/л','Зараженность':'нет'},'rating':'4.9','deals_count':34,'sid':'A-8832','delivery':'Есть доставка'},
    {'id':1,'title':'Кукуруза','price':'15 000','vat':'с НДС 10%','volume':'80 т','harvest':'2025','region':'Дзержинск','distance_km':38,'delivery_cost':450,'badge':'Хит недели','badge_class':'orange','quality':{'Влажность':'14 %','Сорная примесь':'5 %','Зерно битое':'1,1 %'},'rating':'5.0','deals_count':91,'sid':'A-1934','delivery':'Доставка 450 ₽/т'},
    {'id':2,'title':'Пшеница кормовая','price':'12 000','vat':'с НДС 10%','volume':'20 т','harvest':'2025','region':'Семёнов','distance_km':71,'delivery_cost':None,'badge':'Быстрый отклик','quality':{'Влажность':'5 %','Сорная примесь':'1 %'},'rating':'4.7','deals_count':12,'sid':'A-6718','delivery':'Самовывоз'},
    {'id':3,'title':'Подсолнечник','price':'28 400','vat':'без НДС','volume':'60 т','harvest':'2025','region':'Лысково','distance_km':92,'delivery_cost':0,'badge':'Премиум','badge_class':'orange','quality':{'Масличность':'46,2 %','Влажность':'7,1 %','Сорная примесь':'1,4 %','Кислотное число':'1,2'},'rating':'4.9','deals_count':47,'sid':'A-3312','delivery':'Доставка включена'},

    # Mid-range (100-300 km)
    {'id':4,'title':'Овёс фуражный','price':'10 800','vat':'с НДС 10%','volume':'45 т','harvest':'2025','region':'Арзамас','distance_km':112,'delivery_cost':None,'badge':'Проверено','quality':{'Влажность':'14,0 %','Сорная примесь':'2,8 %'},'rating':'4.6','deals_count':23,'sid':'A-6712','delivery':'Самовывоз'},
    {'id':5,'title':'Пшеница 3 класс','price':'14 800','vat':'с НДС 10%','volume':'150 т','harvest':'2025','region':'Муром','distance_km':137,'delivery_cost':600,'badge':'Лаб. анализ','quality':{'Протеин':'13,1 %','Клейковина':'28 %','Влажность':'12,8 %','Натура':'785 г/л','Сорная примесь':'1,0 %','Число падения':'290 с'},'rating':'4.9','deals_count':62,'sid':'A-4005','delivery':'Доставка 600 ₽/т'},
    {'id':6,'title':'Пшеница 4 класс','price':'12 000','vat':'с НДС 10%','volume':'100 т','harvest':'2026','region':'Сергач','distance_km':158,'delivery_cost':None,'badge':'Проверено','quality':{'Протеин':'11 %','Клейковина':'18 %','Влажность':'13 %','Натура':'780 г/л','Сорная примесь':'5 %'},'rating':'4.8','deals_count':56,'sid':'A-2045','delivery':'Самовывоз'},
    {'id':7,'title':'Рапс','price':'32 100','vat':'без НДС','volume':'40 т','harvest':'2025','region':'Выкса','distance_km':186,'delivery_cost':None,'badge':'Новый','quality':{'Масличность':'42 %','Влажность':'8 %','Сорная примесь':'2 %'},'rating':'4.8','deals_count':19,'sid':'A-5502','delivery':'Самовывоз'},
    {'id':8,'title':'Горох','price':'18 500','vat':'с НДС 10%','volume':'30 т','harvest':'2025','region':'Иваново','distance_km':207,'delivery_cost':800,'badge':'Проверено','quality':{'Влажность':'14 %','Сорная примесь':'2 %','Битые зёрна':'3 %'},'rating':'4.7','deals_count':28,'sid':'A-2201','delivery':'Доставка 800 ₽/т'},
    {'id':9,'title':'Гречиха','price':'22 400','vat':'без НДС','volume':'25 т','harvest':'2025','region':'Касимов','distance_km':223,'delivery_cost':None,'badge':'Премиум','badge_class':'orange','quality':{'Натура':'620 г/л','Влажность':'13 %','Сорная примесь':'2,5 %'},'rating':'4.9','deals_count':41,'sid':'A-7788','delivery':'Самовывоз'},
    {'id':10,'title':'Ячмень пивоваренный','price':'16 200','vat':'с НДС 10%','volume':'200 т','harvest':'2025','region':'Чебоксары','distance_km':235,'delivery_cost':900,'badge':'Лаб. анализ','quality':{'Белок':'10,5 %','Влажность':'12,5 %','Способность прорастания':'96 %','Крупность':'85 %','Натура':'680 г/л'},'rating':'4.9','deals_count':74,'sid':'A-5512','delivery':'Доставка 900 ₽/т'},
    {'id':11,'title':'Соя','price':'39 500','vat':'без НДС','volume':'50 т','harvest':'2025','region':'Владимир','distance_km':248,'delivery_cost':1000,'badge':'Премиум','badge_class':'orange','quality':{'Протеин':'38 %','Масличность':'20 %','Влажность':'12 %','Сорная примесь':'2 %'},'rating':'5.0','deals_count':53,'sid':'A-3399','delivery':'Доставка 1 000 ₽/т'},
    {'id':12,'title':'Пшеница 3 класс','price':'14 300','vat':'с НДС 10%','volume':'180 т','harvest':'2025','region':'Йошкар-Ола','distance_km':273,'delivery_cost':1100,'badge':'Проверено','quality':{'Протеин':'12,6 %','Клейковина':'25 %','Влажность':'13,5 %','Натура':'775 г/л','Сорная примесь':'1,5 %'},'rating':'4.8','deals_count':38,'sid':'A-9045','delivery':'Доставка 1 100 ₽/т'},
    {'id':13,'title':'Кукуруза','price':'14 500','vat':'с НДС 10%','volume':'250 т','harvest':'2025','region':'Рязань','distance_km':287,'delivery_cost':1200,'badge':'Хит недели','badge_class':'orange','quality':{'Влажность':'13 %','Сорная примесь':'3 %','Зерно битое':'0,8 %'},'rating':'4.9','deals_count':102,'sid':'A-1122','delivery':'Доставка 1 200 ₽/т'},

    # Far (300-500 km)
    {'id':14,'title':'Подсолнечник','price':'27 900','vat':'без НДС','volume':'120 т','harvest':'2025','region':'Пенза','distance_km':340,'delivery_cost':1400,'badge':'Лаб. анализ','quality':{'Масличность':'45 %','Влажность':'7,5 %','Сорная примесь':'1,8 %','Кислотное число':'1,5'},'rating':'4.8','deals_count':66,'sid':'A-6630','delivery':'Доставка 1 400 ₽/т'},
    {'id':15,'title':'Пшеница 4 класс','price':'11 500','vat':'с НДС 10%','volume':'300 т','harvest':'2025','region':'Тамбов','distance_km':378,'delivery_cost':1500,'badge':'Проверено','quality':{'Протеин':'10,8 %','Клейковина':'18 %','Влажность':'13,8 %','Натура':'760 г/л','Сорная примесь':'4 %'},'rating':'4.7','deals_count':49,'sid':'A-8890','delivery':'Доставка 1 500 ₽/т'},
    {'id':16,'title':'Ячмень кормовой','price':'12 100','vat':'с НДС 10%','volume':'160 т','harvest':'2025','region':'Ульяновск','distance_km':402,'delivery_cost':1500,'badge':'Проверено','quality':{'Влажность':'13 %','Сорная примесь':'2 %','Натура':'580 г/л'},'rating':'4.8','deals_count':31,'sid':'A-4455','delivery':'Доставка 1 500 ₽/т'},
    {'id':17,'title':'Рапс','price':'31 800','vat':'без НДС','volume':'80 т','harvest':'2025','region':'Саранск','distance_km':413,'delivery_cost':1600,'badge':'Премиум','badge_class':'orange','quality':{'Масличность':'43 %','Влажность':'7,8 %','Сорная примесь':'1,5 %','Кислотное число':'1,1'},'rating':'4.9','deals_count':44,'sid':'A-7722','delivery':'Доставка 1 600 ₽/т'},
    {'id':18,'title':'Гречиха','price':'21 800','vat':'без НДС','volume':'45 т','harvest':'2025','region':'Тула','distance_km':428,'delivery_cost':1700,'badge':'Проверено','quality':{'Натура':'615 г/л','Влажность':'13,5 %','Сорная примесь':'3 %'},'rating':'4.7','deals_count':18,'sid':'A-5599','delivery':'Доставка 1 700 ₽/т'},
    {'id':19,'title':'Пшеница 3 класс','price':'14 200','vat':'с НДС 10%','volume':'120 т','harvest':'2025','region':'Балаково','distance_km':539.4,'delivery_cost':1800,'badge':'Лаб. анализ','quality':{'Протеин':'12,8 %','Клейковина':'26 %','Влажность':'13,2 %','Натура':'780 г/л','Сорная примесь':'1,2 %','Число падения':'280 с','Зерновая примесь':'3,5 %'},'rating':'4.9','deals_count':34,'sid':'A-4721','delivery':'Есть доставка'},
    {'id':20,'title':'Кукуруза','price':'13 900','vat':'с НДС 10%','volume':'400 т','harvest':'2025','region':'Воронеж','distance_km':580,'delivery_cost':1900,'badge':'Хит недели','badge_class':'orange','quality':{'Влажность':'13,2 %','Сорная примесь':'2 %','Зерно битое':'0,6 %'},'rating':'5.0','deals_count':128,'sid':'A-3301','delivery':'Доставка 1 900 ₽/т'},
    {'id':21,'title':'Овёс голозёрный','price':'14 500','vat':'с НДС 10%','volume':'60 т','harvest':'2025','region':'Самара','distance_km':612,'delivery_cost':2000,'badge':'Премиум','badge_class':'orange','quality':{'Влажность':'12,5 %','Сорная примесь':'1,5 %','Натура':'570 г/л'},'rating':'4.8','deals_count':27,'sid':'A-1177','delivery':'Доставка 2 000 ₽/т'},
    {'id':22,'title':'Подсолнечник','price':'28 100','vat':'без НДС','volume':'200 т','harvest':'2025','region':'Липецк','distance_km':634,'delivery_cost':2100,'badge':'Лаб. анализ','quality':{'Масличность':'45,8 %','Влажность':'7,2 %','Сорная примесь':'1,2 %','Кислотное число':'1,3'},'rating':'4.9','deals_count':81,'sid':'A-6655','delivery':'Доставка 2 100 ₽/т'},
    {'id':23,'title':'Пшеница 5 класс','price':'10 800','vat':'с НДС 10%','volume':'500 т','harvest':'2025','region':'Саратов','distance_km':689,'delivery_cost':2200,'badge':'Проверено','quality':{'Протеин':'9,5 %','Влажность':'13,5 %','Натура':'750 г/л','Сорная примесь':'5 %'},'rating':'4.6','deals_count':35,'sid':'A-2233','delivery':'Доставка 2 200 ₽/т'},
    {'id':24,'title':'Соя','price':'38 900','vat':'без НДС','volume':'100 т','harvest':'2025','region':'Казань','distance_km':407,'delivery_cost':1600,'badge':'Премиум','badge_class':'orange','quality':{'Протеин':'39 %','Масличность':'21 %','Влажность':'11,8 %','Сорная примесь':'1,5 %'},'rating':'4.9','deals_count':58,'sid':'A-7799','delivery':'Доставка 1 600 ₽/т'},
    {'id':25,'title':'Ячмень кормовой','price':'12 800','vat':'с НДС 10%','volume':'70 т','harvest':'2025','region':'Ковров','distance_km':195,'delivery_cost':800,'badge':'Проверено','quality':{'Влажность':'13,5 %','Сорная примесь':'2,2 %','Натура':'565 г/л'},'rating':'4.7','deals_count':22,'sid':'A-8844','delivery':'Доставка 800 ₽/т'},
    {'id':26,'title':'Пшеница 3 класс','price':'14 600','vat':'с НДС 10%','volume':'220 т','harvest':'2025','region':'Нижний Новгород','distance_km':18,'delivery_cost':200,'badge':'Горячее','badge_class':'featured','quality':{'Протеин':'12,9 %','Клейковина':'27 %','Влажность':'13,0 %','Натура':'782 г/л','Сорная примесь':'1,1 %'},'rating':'5.0','deals_count':115,'sid':'A-0001','delivery':'Доставка 200 ₽/т'},
    {'id':27,'title':'Горох','price':'19 200','vat':'с НДС 10%','volume':'40 т','harvest':'2025','region':'Кстово','distance_km':24,'delivery_cost':200,'badge':'Рядом','badge_class':'featured','quality':{'Влажность':'13,5 %','Сорная примесь':'1,8 %','Битые зёрна':'2 %'},'rating':'4.9','deals_count':39,'sid':'A-0044','delivery':'Доставка 200 ₽/т'},
    {'id':28,'title':'Кукуруза','price':'15 400','vat':'с НДС 10%','volume':'60 т','harvest':'2025','region':'Богородск','distance_km':45,'delivery_cost':500,'badge':'Новый','quality':{'Влажность':'13,8 %','Сорная примесь':'2,5 %','Зерно битое':'1,0 %'},'rating':'4.8','deals_count':33,'sid':'A-0088','delivery':'Доставка 500 ₽/т'},
    {'id':29,'title':'Подсолнечник','price':'28 700','vat':'без НДС','volume':'35 т','harvest':'2025','region':'Павлово','distance_km':79,'delivery_cost':700,'badge':'Лаб. анализ','quality':{'Масличность':'46 %','Влажность':'7,4 %','Сорная примесь':'1,3 %'},'rating':'4.9','deals_count':52,'sid':'A-0099','delivery':'Доставка 700 ₽/т'},
]

ARCHIVE_OFFERS = [
    {'id':90,'title':'Пшеница 3 класс','price':'13 800','vat':'с НДС 10%','volume':'200 т','harvest':'2024','region':'Арзамас','distance_km':112,'delivery_cost':450,'quality':{'Протеин':'12,5 %','Клейковина':'25 %','Влажность':'13 %'},'rating':'4.9','deals_count':67,'sid':'A-3401','delivery':'Продано','archive':True},
    {'id':91,'title':'Ячмень кормовой','price':'12 200','vat':'с НДС 10%','volume':'150 т','harvest':'2024','region':'Выкса','distance_km':186,'delivery_cost':None,'quality':{'Влажность':'13 %','Сорная примесь':'2 %'},'rating':'4.7','deals_count':41,'sid':'A-2205','delivery':'Продано','archive':True},
    {'id':92,'title':'Кукуруза','price':'14 100','vat':'с НДС 10%','volume':'300 т','harvest':'2024','region':'Дзержинск','distance_km':38,'delivery_cost':400,'quality':{'Влажность':'14 %','Сорная примесь':'3 %'},'rating':'5.0','deals_count':89,'sid':'A-1901','delivery':'Продано','archive':True},
    {'id':93,'title':'Подсолнечник','price':'26 500','vat':'без НДС','volume':'80 т','harvest':'2024','region':'Балахна','distance_km':39,'delivery_cost':450,'quality':{'Масличность':'45 %','Влажность':'7 %'},'rating':'4.8','deals_count':28,'sid':'A-7701','delivery':'Продано','archive':True},
    {'id':94,'title':'Рапс','price':'30 800','vat':'без НДС','volume':'60 т','harvest':'2024','region':'Семёнов','distance_km':71,'delivery_cost':600,'quality':{'Масличность':'42 %','Влажность':'8 %'},'rating':'4.9','deals_count':35,'sid':'A-4403','delivery':'Продано','archive':True},
    {'id':95,'title':'Овёс','price':'10 200','vat':'с НДС 10%','volume':'90 т','harvest':'2024','region':'Муром','distance_km':137,'delivery_cost':None,'quality':{'Влажность':'14 %','Натура':'530 г/л'},'rating':'4.6','deals_count':19,'sid':'A-6601','delivery':'Продано','archive':True},
]

# ================= BUYER REQUESTS (Продать) =================
# From the buyer side — what companies are looking for
REQUESTS = [
    {'id':'Q-001','title':'Пшеница 3 класс','target_price':'14 500','vat':'с НДС','volume':'200 т','delivery_where':'Нижний Новгород','needed_by':'до 10.05.2026','buyer_type':'Хлебозавод','buyer_sid':'B-0121','posted':'2 часа назад','urgent':True},
    {'id':'Q-002','title':'Ячмень кормовой','target_price':'12 500','vat':'с НДС','volume':'500 т','delivery_where':'Дзержинск','needed_by':'до 20.05.2026','buyer_type':'Птицефабрика','buyer_sid':'B-0074','posted':'5 часов назад'},
    {'id':'Q-003','title':'Кукуруза','target_price':'14 800','vat':'с НДС','volume':'150 т','delivery_where':'Арзамас','needed_by':'до 15.05.2026','buyer_type':'Комбикормовый завод','buyer_sid':'B-0203','posted':'6 часов назад'},
    {'id':'Q-004','title':'Подсолнечник','target_price':'28 000','vat':'без НДС','volume':'80 т','delivery_where':'Нижний Новгород','needed_by':'до 25.04.2026','buyer_type':'МЭЗ','buyer_sid':'B-0099','posted':'1 день назад','urgent':True},
    {'id':'Q-005','title':'Рапс','target_price':'31 500','vat':'без НДС','volume':'100 т','delivery_where':'Балахна','needed_by':'до 30.05.2026','buyer_type':'МЭЗ','buyer_sid':'B-0114','posted':'1 день назад'},
    {'id':'Q-006','title':'Пшеница 4 класс','target_price':'11 800','vat':'с НДС','volume':'350 т','delivery_where':'Нижний Новгород','needed_by':'до 05.06.2026','buyer_type':'Мукомольное предприятие','buyer_sid':'B-0302','posted':'2 дня назад'},
    {'id':'Q-007','title':'Овёс фуражный','target_price':'10 500','vat':'с НДС','volume':'60 т','delivery_where':'Семёнов','needed_by':'до 01.05.2026','buyer_type':'Животноводческий комплекс','buyer_sid':'B-0188','posted':'2 дня назад'},
    {'id':'Q-008','title':'Соя','target_price':'39 000','vat':'без НДС','volume':'70 т','delivery_where':'Нижний Новгород','needed_by':'до 10.06.2026','buyer_type':'Кормопроизводство','buyer_sid':'B-0155','posted':'3 дня назад'},
    {'id':'Q-009','title':'Горох','target_price':'18 500','vat':'с НДС','volume':'40 т','delivery_where':'Кстово','needed_by':'до 20.05.2026','buyer_type':'Пищевое производство','buyer_sid':'B-0077','posted':'3 дня назад'},
    {'id':'Q-010','title':'Гречиха','target_price':'22 000','vat':'без НДС','volume':'35 т','delivery_where':'Нижний Новгород','needed_by':'до 15.06.2026','buyer_type':'Пищевое производство','buyer_sid':'B-0221','posted':'4 дня назад'},
    {'id':'Q-011','title':'Ячмень пивоваренный','target_price':'16 500','vat':'с НДС','volume':'250 т','delivery_where':'Чебоксары','needed_by':'до 01.07.2026','buyer_type':'Солодовня','buyer_sid':'B-0408','posted':'4 дня назад'},
    {'id':'Q-012','title':'Пшеница 3 класс','target_price':'14 300','vat':'с НДС','volume':'180 т','delivery_where':'Муром','needed_by':'до 20.05.2026','buyer_type':'Хлебозавод','buyer_sid':'B-0099','posted':'5 дней назад'},
    {'id':'Q-013','title':'Кукуруза','target_price':'15 200','vat':'с НДС','volume':'120 т','delivery_where':'Арзамас','needed_by':'до 25.05.2026','buyer_type':'Комбикормовый завод','buyer_sid':'B-0312','posted':'5 дней назад'},
    {'id':'Q-014','title':'Подсолнечник','target_price':'27 800','vat':'без НДС','volume':'150 т','delivery_where':'Нижний Новгород','needed_by':'до 10.06.2026','buyer_type':'МЭЗ','buyer_sid':'B-0155','posted':'6 дней назад'},
    {'id':'Q-015','title':'Рапс','target_price':'32 000','vat':'без НДС','volume':'200 т','delivery_where':'Дзержинск','needed_by':'до 15.06.2026','buyer_type':'МЭЗ','buyer_sid':'B-0411','posted':'6 дней назад'},
    {'id':'Q-016','title':'Пшеница 5 класс','target_price':'10 800','vat':'с НДС','volume':'400 т','delivery_where':'Нижний Новгород','needed_by':'до 20.06.2026','buyer_type':'Комбикормовый завод','buyer_sid':'B-0188','posted':'1 неделю назад'},
    {'id':'Q-017','title':'Ячмень кормовой','target_price':'12 300','vat':'с НДС','volume':'220 т','delivery_where':'Балахна','needed_by':'до 01.06.2026','buyer_type':'Животноводческий комплекс','buyer_sid':'B-0074','posted':'1 неделю назад'},
    {'id':'Q-018','title':'Пшеница 4 класс','target_price':'12 100','vat':'с НДС','volume':'500 т','delivery_where':'Выкса','needed_by':'до 10.06.2026','buyer_type':'Птицефабрика','buyer_sid':'B-0133','posted':'1 неделю назад'},
    {'id':'Q-019','title':'Соя','target_price':'38 500','vat':'без НДС','volume':'120 т','delivery_where':'Нижний Новгород','needed_by':'до 25.06.2026','buyer_type':'МЭЗ','buyer_sid':'B-0099','posted':'8 дней назад'},
    {'id':'Q-020','title':'Горох','target_price':'18 800','vat':'с НДС','volume':'80 т','delivery_where':'Арзамас','needed_by':'до 30.05.2026','buyer_type':'Пищевое производство','buyer_sid':'B-0203','posted':'9 дней назад'},
    {'id':'Q-021','title':'Кукуруза','target_price':'14 500','vat':'с НДС','volume':'300 т','delivery_where':'Нижний Новгород','needed_by':'до 20.06.2026','buyer_type':'Кормопроизводство','buyer_sid':'B-0302','posted':'10 дней назад'},
    {'id':'Q-022','title':'Подсолнечник','target_price':'28 500','vat':'без НДС','volume':'90 т','delivery_where':'Семёнов','needed_by':'до 01.07.2026','buyer_type':'МЭЗ','buyer_sid':'B-0411','posted':'10 дней назад'},
    {'id':'Q-023','title':'Пшеница 3 класс','target_price':'14 700','vat':'с НДС','volume':'250 т','delivery_where':'Муром','needed_by':'до 10.06.2026','buyer_type':'Хлебозавод','buyer_sid':'B-0121','posted':'12 дней назад'},
    {'id':'Q-024','title':'Овёс голозёрный','target_price':'14 200','vat':'с НДС','volume':'50 т','delivery_where':'Нижний Новгород','needed_by':'до 15.06.2026','buyer_type':'Пищевое производство','buyer_sid':'B-0155','posted':'12 дней назад'},
    {'id':'Q-025','title':'Ячмень пивоваренный','target_price':'16 800','vat':'с НДС','volume':'180 т','delivery_where':'Чебоксары','needed_by':'до 01.08.2026','buyer_type':'Солодовня','buyer_sid':'B-0408','posted':'14 дней назад'},
    {'id':'Q-026','title':'Рапс','target_price':'31 200','vat':'без НДС','volume':'150 т','delivery_where':'Балахна','needed_by':'до 10.07.2026','buyer_type':'МЭЗ','buyer_sid':'B-0114','posted':'14 дней назад'},
    {'id':'Q-027','title':'Гречиха','target_price':'21 500','vat':'без НДС','volume':'45 т','delivery_where':'Нижний Новгород','needed_by':'до 20.07.2026','buyer_type':'Пищевое производство','buyer_sid':'B-0221','posted':'16 дней назад'},
    {'id':'Q-028','title':'Пшеница 4 класс','target_price':'12 000','vat':'с НДС','volume':'600 т','delivery_where':'Дзержинск','needed_by':'до 15.07.2026','buyer_type':'Мукомольное предприятие','buyer_sid':'B-0302','posted':'18 дней назад'},
    {'id':'Q-029','title':'Кукуруза','target_price':'14 200','vat':'с НДС','volume':'200 т','delivery_where':'Богородск','needed_by':'до 25.07.2026','buyer_type':'Комбикормовый завод','buyer_sid':'B-0312','posted':'20 дней назад'},
    {'id':'Q-030','title':'Подсолнечник','target_price':'27 500','vat':'без НДС','volume':'110 т','delivery_where':'Выкса','needed_by':'до 30.07.2026','buyer_type':'МЭЗ','buyer_sid':'B-0099','posted':'22 дня назад'},
]

ARCHIVE_REQUESTS = [
    {'id':'Q-901','title':'Пшеница 3 класс','target_price':'14 000','vat':'с НДС','volume':'300 т','delivery_where':'Нижний Новгород','needed_by':'Закрыта 15.03.2026','buyer_type':'Хлебозавод','buyer_sid':'B-0121','posted':'Закрыта','archive':True},
    {'id':'Q-902','title':'Ячмень кормовой','target_price':'12 100','vat':'с НДС','volume':'400 т','delivery_where':'Дзержинск','needed_by':'Закрыта 10.03.2026','buyer_type':'Птицефабрика','buyer_sid':'B-0074','posted':'Закрыта','archive':True},
    {'id':'Q-903','title':'Кукуруза','target_price':'14 500','vat':'с НДС','volume':'200 т','delivery_where':'Арзамас','needed_by':'Закрыта 05.03.2026','buyer_type':'Комбикорм. завод','buyer_sid':'B-0203','posted':'Закрыта','archive':True},
    {'id':'Q-904','title':'Подсолнечник','target_price':'27 200','vat':'без НДС','volume':'120 т','delivery_where':'Нижний Новгород','needed_by':'Закрыта 28.02.2026','buyer_type':'МЭЗ','buyer_sid':'B-0099','posted':'Закрыта','archive':True},
    {'id':'Q-905','title':'Рапс','target_price':'30 500','vat':'без НДС','volume':'90 т','delivery_where':'Балахна','needed_by':'Закрыта 20.02.2026','buyer_type':'МЭЗ','buyer_sid':'B-0114','posted':'Закрыта','archive':True},
    {'id':'Q-906','title':'Соя','target_price':'37 800','vat':'без НДС','volume':'80 т','delivery_where':'Нижний Новгород','needed_by':'Закрыта 10.02.2026','buyer_type':'Кормопроизводство','buyer_sid':'B-0155','posted':'Закрыта','archive':True},
]


def request_card(data):
    """Render a buyer request card."""
    cls = 'req-card'
    if data.get('archive'):
        cls += ' req-archive'

    urgent = '<span class="badge orange">🔥 Срочно</span>' if data.get('urgent') else ''
    archived = '<span class="badge archive">Закрыта</span>' if data.get('archive') else ''
    new = '<span class="badge featured">Новый</span>' if not data.get('archive') and 'час' in data.get('posted', '') else ''

    cta = 'Закрыта' if data.get('archive') else 'Откликнуться'

    return f'''<article class="{cls}">
  <div class="req-card-head">
    <div>
      <div class="req-badges">
        {urgent}{new}{archived}
        <span class="badge gray">№ {data['id']}</span>
      </div>
      <h3 class="req-card-title">{data['title']}</h3>
    </div>
    <div class="req-target-price">
      <span class="num">{data['target_price']} ₽/т</span>
      <span class="small">{data['vat']}</span>
    </div>
  </div>

  <div class="req-attrs">
    <div class="cell"><div class="k">Объём</div><div class="v">{data['volume']}</div></div>
    <div class="cell"><div class="k">Куда</div><div class="v">{data['delivery_where']}</div></div>
    <div class="cell"><div class="k">Срок</div><div class="v">{data['needed_by']}</div></div>
  </div>

  <div class="req-meta">
    <span class="item">{icon('buyer')}{data['buyer_type']}</span>
    <span class="dot"></span>
    <span class="item mono" style="color:var(--slate-500);font-family:'JetBrains Mono',monospace">ID {data['buyer_sid']}</span>
    <span class="dot"></span>
    <span class="item">{icon('clock')}{data['posted']}</span>
  </div>

  <div class="req-foot">
    <span class="req-buyer">Покупатель проверен · {icon('verify')} ★ 4.9</span>
    <a class="cta" href="#">{cta} {icon('arrow-sm') if not data.get('archive') else ''}</a>
  </div>
</article>'''


def plural_ru(n, forms):
    """forms = ('параметр', 'параметра', 'параметров'). Russian pluralization."""
    n = abs(n) % 100
    n1 = n % 10
    if 10 < n < 20:
        return forms[2]
    if 1 < n1 < 5:
        return forms[1]
    if n1 == 1:
        return forms[0]
    return forms[2]


def format_km(km):
    """Format kilometers: 539.4 -> '539,4', 39 -> '39'. Without unit."""
    if isinstance(km, float):
        return f"{km:.1f}".replace('.', ',')
    return str(int(km))


def format_money(n):
    """Format rubles: 14200 -> '14 200'."""
    return f"{int(n):,}".replace(',', ' ')


def distance_strip(o, dark=False):
    """Render distance + delivery cost strip for a card."""
    km_str = format_km(o['distance_km'])
    cost = o.get('delivery_cost')
    if cost is None:
        cost_html = f'<span class="distance-cost">{icon("truck")}Самовывоз</span>'
    elif cost == 0:
        cost_html = f'<span class="distance-cost free">{icon("truck")}<span class="mono">Доставка включена</span></span>'
    else:
        cost_html = f'<span class="distance-cost">{icon("truck")}Доставка <span class="mono">{cost} ₽/т</span></span>'
    return f'''<div class="distance-strip">
    <div class="distance-from">
      <div class="pin-ic">{icon('pin')}</div>
      <div class="txt">
        <span class="route">{o['region']} → Нижний Новгород</span>
        <span class="km">{km_str} км<small>до вас</small></span>
      </div>
    </div>
    {cost_html}
  </div>'''


# ================= PAGE BUILDERS =================

def build_index():
    body = f'''<section class="hero">
  <div class="blob-2"></div>
  <div class="hero-inner">
    <div class="hero-left">
      <div class="hero-chips">
        <span class="hero-chip dot">Только проверенные поставщики</span>
        <span class="hero-chip">Прозрачные условия</span>
        <span class="hero-chip">Быстрый отклик</span>
      </div>
      <h1>Покупайте урожай <em>напрямую</em> — быстро, прозрачно и без переплат</h1>
      <p class="lead">Современная B2B-платформа для закупки и продажи сельхозпродукции. Удобный поиск, понятные карточки, живые предложения и сопровождение сделки от заявки до поставки.</p>

      <form class="hero-search" action="/catalog.html" method="get" id="heroSearchForm">
        <label class="field" for="heroInput">
          <span class="k">Что ищете</span>
          <input id="heroInput" name="q" type="text" placeholder="Пшеница, ячмень, кукуруза…" autocomplete="off" />
        </label>
        <label class="field select-field">
          <span class="k">Тип заявки</span>
          <select name="type" id="heroType">
            <option value="buy">Купить</option>
            <option value="sell">Продать</option>
          </select>
        </label>
        <label class="field select-field">
          <span class="k">Объём партии</span>
          <select name="volume">
            <option value="">любой</option>
            <option value="20">от 20 т</option>
            <option value="50">от 50 т</option>
            <option value="100">от 100 т</option>
            <option value="200">от 200 т</option>
            <option value="500">от 500 т</option>
          </select>
        </label>
        <button class="hero-search-submit" type="submit">
          {icon('search')}
          Найти
        </button>
      </form>

      <div class="popular">
        <span class="label">Часто ищут:</span>
        <button class="pq">пшеница 3 класс</button>
        <button class="pq">кукуруза с НДС</button>
        <button class="pq">рапс с доставкой</button>
        <button class="pq">подсолнечник опт</button>
        <button class="pq">ячмень кормовой</button>
      </div>

      <div class="hero-stats">
        <div class="hero-stat"><div class="n">450+</div><div class="l">активных поставщиков</div></div>
        <div class="hero-stat"><div class="n">24/7</div><div class="l">приём заявок</div></div>
        <div class="hero-stat"><div class="n">3 часа</div><div class="l">средний отклик</div></div>
      </div>
    </div>

    <div>
      <div class="focus-wrap">
        <div class="focus-head">
          <div>
            <div class="label"><span class="dot"></span>СЕГОДНЯ В ФОКУСЕ</div>
            <div class="title">Пшеница 3 класс</div>
          </div>
          <div class="focus-price">14 200 ₽/т</div>
        </div>
        <div class="focus-card">
          <div class="focus-grid">
            <div class="focus-cell"><div class="k">Объём</div><div class="v">120 тонн</div></div>
            <div class="focus-cell"><div class="k">Урожай</div><div class="v">2025</div></div>
            <div class="focus-cell"><div class="k">Регион</div><div class="v">Арзамас</div></div>
            <div class="focus-cell"><div class="k">Статус</div><div class="v">Проверено</div></div>
          </div>
          <div class="focus-benefits">
            <div class="h">{icon('check-big')} Ключевые преимущества</div>
            <div class="row">{icon('check')}Прозрачные показатели качества</div>
            <div class="row">{icon('check')}Доступна логистика через платформу</div>
            <div class="row">{icon('check')}Эскроу-защита сделки</div>
          </div>
          <a class="cta" href="/product.html">Открыть предложение {icon('arrow-sm')}</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="catalog-head">
    <div>
      <span class="eyebrow">{icon('sparkles')} Каталог</span>
      <h2 class="h2">Актуальные предложения от фермеров</h2>
      <p class="section-lead">Чистая структура карточек, фокус на цене, качестве и объёме. Всё, что нужно, чтобы быстро принять решение.</p>
    </div>
    <div class="top-row">
      <div class="catalog-chips">
        <a class="c-chip active" href="/catalog.html">Все товары</a>
        <a class="c-chip" href="/catalog.html?crop=wheat">Пшеница</a>
        <a class="c-chip" href="/catalog.html?crop=barley">Ячмень</a>
        <a class="c-chip" href="/catalog.html?crop=corn">Кукуруза</a>
        <a class="c-chip" href="/catalog.html?crop=sunflower">Подсолнечник</a>
        <a class="c-chip" href="/catalog.html?delivery=1">С доставкой</a>
      </div>
      <div class="view-tools">
        <div class="view-toggle" data-target="homeGrid">
          <button class="active" data-view="grid" title="Сетка">{icon('grid')}<span>Сетка</span></button>
          <button data-view="list" title="Список">{icon('list')}<span>Список</span></button>
        </div>
        <a class="btn btn-outline btn-sm" href="/catalog.html">Весь каталог {icon('arrow-sm')}</a>
      </div>
    </div>
  </div>

  <div class="cards-grid" id="homeGrid">
    {offer_card(OFFERS[0], featured=True)}
    {''.join(offer_card(o) for o in OFFERS[1:8])}
  </div>
  <div style="text-align:center;margin-top:28px">
    <a class="btn btn-dark btn-lg" href="/catalog.html">Открыть весь каталог · {len(OFFERS)} предложений {icon('arrow-sm')}</a>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Среднее время отклика — 3 часа</span>
      <h3>Не нашли подходящее предложение?</h3>
      <p class="lead">Создайте заявку и получите персональные предложения от фермеров и поставщиков по вашим параметрам. 86% заявок закрываются за сутки.</p>
    </div>
    <form class="reverse-form" onsubmit="event.preventDefault();alert('Заявка отправлена.')">
      <input type="text" placeholder="Наименование продукта" />
      <input type="text" placeholder="Адрес доставки" />
      <div class="sel"><span>Тип заявки</span><span class="chev">▾</span></div>
      <div class="sel"><span>Объём партии (т)</span><span class="chev">▾</span></div>
      <button class="submit" type="submit">Отправить заявку {icon('arrow-sm')}</button>
    </form>
  </div>
</section>

<section class="section">
  <div class="how-grid">
    <div>
      <span class="eyebrow">{icon('sparkles')} Как это работает</span>
      <h2 class="h2">Платформа, где агросделки выглядят современно и понятно</h2>
      <p class="section-lead">Редизайн строится вокруг доверия, ясной структуры и удобства принятия решения — как для покупателя, так и для продавца.</p>
    </div>
    <div class="steps-grid">
      <div class="step">
        <div class="ic-wrap">{icon('user')}</div>
        <h4>Создайте кабинет</h4>
        <p>Регистрация за пару минут, без лишней бюрократии и сложных настроек.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('tractor')}</div>
        <h4>Разместите предложение</h4>
        <p>Укажите товар, регион, качество, объём, цену и удобные условия поставки.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('search-lg')}</div>
        <h4>Получайте заявки</h4>
        <p>Покупатели видят только понятные, структурированные и доверительные карточки.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('coins')}</div>
        <h4>Закрывайте сделки</h4>
        <p>Платформа ведёт коммуникацию, эскроу защищает оплату, а логистика решается в едином окне.</p>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="adv-grid">
    <div class="adv-card">
      <span class="eyebrow">{icon('sparkles')} Почему выбирают нас</span>
      <h2 class="h2">Прямой контракт с фермером — без посредников и сюрпризов</h2>
      <p class="section-lead">Вы видите партию, её показатели качества, расстояние до склада и итоговую цену с доставкой — ещё до того, как свяжетесь с поставщиком. Решение принимаете на данных, а не на обещаниях.</p>
      <div class="adv-list">
        <div class="adv-item">{icon('shield')}<span class="txt"><b>Прозрачная цена.</b> Показываем цену за тонну, НДС, стоимость доставки и расстояние до склада. Итоговая цифра видна сразу — без запросов и пересчётов.</span></div>
        <div class="adv-item">{icon('shield')}<span class="txt"><b>Только проверенные поставщики.</b> Каждого проверяем по ИНН, ОГРН, истории сделок и банковской дисциплине. Анонимный ID раскрывается только после оплаты через эскроу.</span></div>
        <div class="adv-item">{icon('shield')}<span class="txt"><b>Эскроу-защита платежа.</b> Деньги резервируются платформой и переводятся поставщику только после подтверждения приёмки партии. Не пришёл товар — возврат автоматический.</span></div>
        <div class="adv-item">{icon('shield')}<span class="txt"><b>Качество из лаборатории.</b> Протеин, клейковина, влажность, натура — все показатели с приложением акта лабораторного анализа в карточке партии.</span></div>
      </div>
    </div>
    <div class="adv-side">
      <div class="adv-side-card dark">
        <div class="ic-wrap">{icon('chart')}</div>
        <h4>Цены рынка в реальном времени</h4>
        <p>Биржа котировок по 30+ регионам обновляется каждую минуту. Сравнивайте цену оффера с медианой по региону — платформа сама подсветит выгодные предложения.</p>
      </div>
      <div class="adv-side-card green">
        <div class="ic-wrap">{icon('headset')}</div>
        <h4>Сопровождаем каждую сделку</h4>
        <p>Помогаем с документами, логистикой и спорами — от первого отклика до отгрузки. Средний отклик команды — 15 минут в рабочие часы.</p>
        <a href="/contacts.html" class="btn btn-white" style="margin-top:20px">Связаться с поддержкой {icon('arrow-sm')}</a>
      </div>
    </div>
  </div>
</section>'''
    return page('Главная', body, active='')


def build_catalog():
    # Sort by distance ascending — nearest suppliers first
    sorted_offers = sorted(OFFERS, key=lambda o: o['distance_km'])
    cards_html = ''.join(offer_card(o, featured=(i==0)) for i, o in enumerate(sorted_offers))
    archive_html = ''.join(offer_card(o) for o in ARCHIVE_OFFERS)

    # Count crops for sidebar
    crop_counts = {}
    for o in OFFERS:
        t = o['title']
        k = 'Другое'
        if 'Пшеница' in t: k = 'wheat'
        elif 'Ячмень' in t: k = 'barley'
        elif 'Кукуруза' in t: k = 'corn'
        elif 'Подсолнечник' in t: k = 'sunflower'
        elif 'Овёс' in t or 'Овес' in t: k = 'oat'
        elif 'Рапс' in t: k = 'rapeseed'
        elif 'Соя' in t: k = 'soy'
        elif 'Горох' in t: k = 'pea'
        elif 'Гречиха' in t: k = 'buckwheat'
        crop_counts[k] = crop_counts.get(k, 0) + 1

    # Region counts
    region_counts = {}
    for o in OFFERS:
        r = o['region']
        region_counts[r] = region_counts.get(r, 0) + 1
    top_regions = sorted(region_counts.items(), key=lambda x: -x[1])[:10]

    def crop_row(key, label):
        n = crop_counts.get(key, 0)
        return f'<label class="filter-check"><input type="checkbox" data-filter="crop" value="{key}"><span>{label}</span><span class="count">{n}</span></label>'

    def region_row(name, n):
        return f'<label class="filter-check"><input type="checkbox" data-filter="region" value="{name}"><span>{name}</span><span class="count">{n}</span></label>'

    body = f'''<section class="page-hero">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Купить</span>
    </div>
    <h1>Купить урожай напрямую у фермеров</h1>
    <p>{len(OFFERS)} активных предложений от проверенных поставщиков. Сортировка по близости к вам, эскроу-защита на каждой сделке.</p>
  </div>
</section>

<section class="section">

  <!-- Quick crop chips (top of content) -->
  <div class="catalog-chips" style="margin-bottom:20px">
    <button class="c-chip active" data-chip-crop="all">Все товары</button>
    <button class="c-chip" data-chip-crop="wheat">Пшеница <span style="opacity:.5">{crop_counts.get('wheat',0)}</span></button>
    <button class="c-chip" data-chip-crop="barley">Ячмень <span style="opacity:.5">{crop_counts.get('barley',0)}</span></button>
    <button class="c-chip" data-chip-crop="corn">Кукуруза <span style="opacity:.5">{crop_counts.get('corn',0)}</span></button>
    <button class="c-chip" data-chip-crop="sunflower">Подсолнечник <span style="opacity:.5">{crop_counts.get('sunflower',0)}</span></button>
    <button class="c-chip" data-chip-crop="rapeseed">Рапс <span style="opacity:.5">{crop_counts.get('rapeseed',0)}</span></button>
    <button class="c-chip" data-chip-crop="oat">Овёс <span style="opacity:.5">{crop_counts.get('oat',0)}</span></button>
  </div>

  <!-- Mobile filter trigger -->
  <button class="mobile-filter-trigger" id="mobileFilterTrigger">
    {icon('search')} Фильтры <span class="count" id="mobileFilterCount">{len(OFFERS)}</span>
  </button>

  <div class="catalog-layout">

    <!-- Sidebar filters -->
    <aside class="filters-aside">
      <div class="filters-head">
        <h3>Фильтры</h3>
        <button class="reset" id="filtersReset">Сбросить</button>
      </div>

      <div class="filters-scroll">

        <div class="filter-group">
          <h4>Культура</h4>
          <div class="filter-checks">
            {crop_row('wheat', 'Пшеница')}
            {crop_row('barley', 'Ячмень')}
            {crop_row('corn', 'Кукуруза')}
            {crop_row('sunflower', 'Подсолнечник')}
            {crop_row('rapeseed', 'Рапс')}
            {crop_row('oat', 'Овёс')}
            {crop_row('soy', 'Соя')}
            {crop_row('pea', 'Горох')}
            {crop_row('buckwheat', 'Гречиха')}
          </div>
        </div>

        <div class="filter-group">
          <h4>Цена, ₽/т</h4>
          <div class="filter-range">
            <input type="number" placeholder="от" id="priceMin" />
            <input type="number" placeholder="до" id="priceMax" />
          </div>
        </div>

        <div class="filter-group">
          <h4>Расстояние</h4>
          <div class="filter-range">
            <input type="number" placeholder="до вас, км" id="distMax" />
          </div>
        </div>

        <div class="filter-group">
          <h4>Регионы</h4>
          <div class="filter-checks">
            {''.join(region_row(r, n) for r, n in top_regions)}
          </div>
        </div>

        <div class="filter-group">
          <h4>Дополнительно</h4>
          <label class="filter-switch">
            <span class="label">С доставкой</span>
            <input type="checkbox" id="swDelivery">
            <span class="toggle"></span>
          </label>
          <label class="filter-switch">
            <span class="label">Лабораторный анализ</span>
            <input type="checkbox" id="swLab">
            <span class="toggle"></span>
          </label>
          <label class="filter-switch">
            <span class="label">Только с НДС</span>
            <input type="checkbox" id="swVat">
            <span class="toggle"></span>
          </label>
        </div>

      </div>

      <div class="filter-apply-bar">
        <div class="count">Найдено: <strong id="filterCount">{len(OFFERS)}</strong> предложений</div>
      </div>
    </aside>

    <!-- Main grid -->
    <div class="catalog-main">
      <div class="catalog-head" style="margin-bottom:18px">
        <div class="top-row">
          <div class="view-tools" style="margin-left:auto">
            <div class="view-toggle" data-target="offersGrid">
              <button class="active" data-view="grid" title="Сетка">{icon('grid')}<span>Сетка</span></button>
              <button data-view="list" title="Список">{icon('list')}<span>Список</span></button>
            </div>
            <div class="sort-select">
              <select id="sortSelect">
                <option value="distance">По близости (ближайшие сверху)</option>
                <option value="price-asc">Цена: по возрастанию</option>
                <option value="price-desc">Цена: по убыванию</option>
                <option value="rating">По рейтингу поставщика</option>
                <option value="new">Новые</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="cards-grid" id="offersGrid">
        {cards_html}
      </div>

      <div id="emptyFilterResult" class="empty-panel" style="display:none;background:var(--paper);border-radius:var(--radius-xl);margin-top:24px">
        <div class="ic">{icon('search-lg')}</div>
        <h4>По фильтрам ничего не найдено</h4>
        <p>Попробуйте снять часть условий или расширить диапазон цены / расстояния.</p>
        <button class="btn btn-outline" onclick="document.getElementById('filtersReset').click()">Сбросить фильтры</button>
      </div>
    </div>

  </div>

  <!-- Archive section -->
  <div class="archive-section">
    <div class="archive-head">
      <div>
        <h2>Архив предложений</h2>
        <p>Завершённые и проданные партии — для понимания исторических цен и рыночных трендов.</p>
      </div>
      <span class="mono" style="color:var(--slate-400);font-size:12px">{len(ARCHIVE_OFFERS)} записей</span>
    </div>
    <div class="cards-grid">
      {archive_html}
    </div>
  </div>

</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Среднее время отклика — 3 часа</span>
      <h3>Не нашли нужную партию?</h3>
      <p class="lead">Разместите обратную заявку — поставщики сами предложат условия по вашим параметрам.</p>
    </div>
    <form class="reverse-form" onsubmit="event.preventDefault();alert('Заявка отправлена.')">
      <input type="text" placeholder="Наименование продукта" />
      <input type="text" placeholder="Адрес доставки" />
      <div class="sel"><span>Тип заявки</span><span class="chev">▾</span></div>
      <div class="sel"><span>Объём партии (т)</span><span class="chev">▾</span></div>
      <button class="submit" type="submit">Отправить заявку {icon('arrow-sm')}</button>
    </form>
  </div>
</section>'''
    return page('Купить · Каталог', body, active='catalog',
                description='Каталог предложений от фермеров: пшеница, ячмень, кукуруза, подсолнечник, рапс. Прямые сделки без посредников с эскроу-защитой.')


def build_product():
    # Balakovo -> NN example (539.4 km, 1800 ₽/т доставка)
    distance_km = 539.4
    delivery_per_ton = 1800
    base_price = 14200
    total_per_ton = base_price + delivery_per_ton  # 16 000

    body = f'''<section class="page-hero" style="padding-bottom:20px">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <a href="/catalog.html">Купить</a>
      <span class="sep">/</span>
      <span>Пшеница 3 класс</span>
    </div>
  </div>
</section>

<section class="section" style="padding-top:28px">
  <div class="product-layout">

    <div class="product-main">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="badge featured" style="background:var(--emerald-soft);color:#065F46">Лаб. анализ</span>
        <span class="badge">Новый оффер</span>
        <span class="badge orange">С доставкой</span>
      </div>
      <h1>Пшеница 3 класс</h1>
      <p class="subtitle">Продовольственная · урожай 2025 · ID оффера <span class="mono">ОФ-4721/25</span></p>

      <div class="product-attrs">
        <div class="cell"><div class="k">Объём партии</div><div class="v">120 тонн</div></div>
        <div class="cell"><div class="k">Мин. партия</div><div class="v">20 тонн</div></div>
        <div class="cell"><div class="k">Год урожая</div><div class="v">2025</div></div>
        <div class="cell"><div class="k">Регион отгрузки</div><div class="v">Балаково, Саратовская обл.</div></div>
        <div class="cell"><div class="k">Расстояние до вас</div><div class="v mono">{format_km(distance_km)}</div></div>
        <div class="cell"><div class="k">Активно до</div><div class="v">24.04.2026</div></div>
      </div>

      <div class="product-quality">
        <h3>{icon('check-big')} Показатели качества (лабораторный анализ)</h3>
        <div class="list">
          <div class="row"><span class="k">Протеин</span><span class="v">12,8 %</span></div>
          <div class="row"><span class="k">Клейковина</span><span class="v">26 %</span></div>
          <div class="row"><span class="k">Влажность</span><span class="v">13,2 %</span></div>
          <div class="row"><span class="k">Натура</span><span class="v">780 г/л</span></div>
          <div class="row"><span class="k">Сорная примесь</span><span class="v">1,2 %</span></div>
          <div class="row"><span class="k">Число падения</span><span class="v">280 с</span></div>
          <div class="row"><span class="k">Зерновая примесь</span><span class="v">3,5 %</span></div>
          <div class="row"><span class="k">Зараженность</span><span class="v">нет</span></div>
        </div>
      </div>

      <div class="product-section">
        <h3>Условия отгрузки и доставки</h3>
        <p>Партия хранится на элеваторе в Балаково (Саратовская обл.). Расстояние до Нижнего Новгорода — <b>{format_km(distance_km)}</b>. Доставка возможна через партнёров платформы: ориентировочная стоимость <b>{delivery_per_ton} ₽/т</b> (зерновоз 25 т, автотранспорт). Срок — до 3 рабочих дней после подтверждения оплаты через эскроу. Самовывоз также возможен.</p>
      </div>

      <div class="product-section">
        <h3>Документы</h3>
        <p>Поставщик предоставляет полный пакет: договор поставки (типовой платформы или согласованный), УПД, ТТН, сертификат качества, паспорт на партию. Счёт-фактура с НДС 10%.</p>
      </div>
    </div>

    <aside class="product-aside">
      <div class="buy-card">
        <div class="price">{base_price:,} <span class="unit">₽/т</span></div>
        <span class="vat">с НДС 10%</span>
        <div class="delta">{icon('check')} На 380 ₽ ниже медианы по региону</div>

        <!-- DISTANCE & DELIVERY CALCULATOR -->
        <div class="delivery-calc">
          <div class="delivery-calc-head">
            {icon('truck')}
            <span class="t">Расчёт доставки</span>
          </div>
          <div class="delivery-calc-route">
            <div class="from">
              <span class="k">ОТ (склад)</span>
              <span class="v">Балаково</span>
            </div>
            <span class="arrow">→</span>
            <div class="to">
              <span class="k">ДО ВАС</span>
              <span class="v">Нижний Новгород</span>
              <span class="change">изменить адрес</span>
            </div>
          </div>
          <div class="delivery-calc-stats">
            <div class="stat">
              <div class="k">Расстояние</div>
              <div class="v">{format_km(distance_km)}</div>
            </div>
            <div class="stat">
              <div class="k">Доставка, ₽/т</div>
              <div class="v">{delivery_per_ton:,}</div>
            </div>
          </div>
          <div class="total-with-delivery">
            <span>Итого с доставкой</span>
            <span class="mono">{total_per_ton:,} ₽/т</span>
          </div>
        </div>

        <div class="actions">
          <a class="btn btn-primary btn-block" href="#">Купить с доставкой {icon('arrow-sm')}</a>
          <a class="btn btn-outline btn-block" href="#">Купить с самовывозом</a>
          <a class="btn btn-ghost btn-block" href="#">Сделать ценовое предложение</a>
        </div>

        <div class="divider"></div>

        <div class="supplier-block">
          <div style="font-size:11.5px;font-weight:700;color:var(--slate-500);text-transform:uppercase;letter-spacing:.1em">Поставщик</div>
          <span class="supplier-verify verify" style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:var(--orange);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;align-self:flex-start">
            <span class="bc" style="width:20px;height:20px;border-radius:50%;background:#fff;display:grid;place-items:center;color:var(--orange)">{icon('verify')}</span>
            Поставщик проверен
          </span>
          <div class="info">
            <span style="color:var(--ink);font-weight:700;display:inline-flex;align-items:center;gap:4px"><span style="color:var(--orange)">★</span>4.9</span>
            <span style="color:var(--slate-300)">·</span>
            <span>34 сделки</span>
            <span style="color:var(--slate-300)">·</span>
            <span>8 лет</span>
          </div>
          <div class="mono" style="font-size:11.5px;color:var(--slate-500);letter-spacing:.04em">ID поставщика · A-4721</div>
        </div>

        <div class="escrow">
          {icon('lock')}
          <p><b style="color:var(--ink)">Сделка защищена эскроу.</b> Деньги резервируются платформой и переводятся поставщику только после подтверждения приёмки партии. Данные поставщика раскрываются после оплаты.</p>
        </div>
      </div>
    </aside>

  </div>
</section>

<!-- Mobile sticky bottom -->
<div class="mobile-bottom-bar">
  <div style="flex:1">
    <div style="font-size:12px;color:var(--slate-500);font-weight:600">{total_per_ton:,} ₽/т</div>
    <div style="font-size:11px;color:var(--slate-400)">с доставкой · {format_km(distance_km)}</div>
  </div>
  <a class="btn btn-outline btn-sm" href="#">Чат</a>
  <a class="btn btn-primary btn-sm" href="#">Купить</a>
</div>'''
    return page('Пшеница 3 класс · 14 200 ₽/т', body, active='catalog',
                description='Пшеница 3 класс, 120 тонн, урожай 2025 · Балаково, 539,4 км до Нижнего Новгорода. Протеин 12,8%, клейковина 26%. 14 200 ₽/т + доставка 1 800 ₽/т.')


def build_sale():
    requests_html = ''.join(request_card(r) for r in REQUESTS)
    arch_requests_html = ''.join(request_card(r) for r in ARCHIVE_REQUESTS)

    body = f'''<section class="page-hero">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Продать</span>
    </div>
    <h1>Продавайте урожай напрямую покупателям — быстро, выгодно и надёжно</h1>
    <p>Получайте заявки от проверенных компаний и заключайте выгодные сделки без цепочки посредников.</p>

    <form class="filter-bar" id="saleHeroForm" action="#" onsubmit="event.preventDefault();filterRequests();">
      <label class="field">
        <span class="k">Культура</span>
        <input type="text" id="saleQ" placeholder="Пшеница, ячмень, кукуруза…" autocomplete="off" />
      </label>
      <label class="field select-field">
        <span class="k">Регион покупателя</span>
        <select id="saleRegion">
          <option value="">Все</option>
          <option>Нижний Новгород</option>
          <option>Арзамас</option>
          <option>Дзержинск</option>
          <option>Балахна</option>
          <option>Муром</option>
          <option>Выкса</option>
          <option>Семёнов</option>
          <option>Чебоксары</option>
        </select>
      </label>
      <label class="field select-field">
        <span class="k">Минимальный объём</span>
        <select id="saleVolume">
          <option value="0">любой</option>
          <option value="50">от 50 т</option>
          <option value="100">от 100 т</option>
          <option value="200">от 200 т</option>
          <option value="500">от 500 т</option>
        </select>
      </label>
      <label class="field select-field">
        <span class="k">НДС</span>
        <select id="saleVat">
          <option value="">любой</option>
          <option value="yes">с НДС</option>
          <option value="no">без НДС</option>
        </select>
      </label>
      <button class="submit" type="submit">{icon('search')} Найти</button>
    </form>
  </div>
</section>

<section class="section">
  <div class="catalog-head">
    <div>
      <span class="eyebrow">{icon('sparkles')} Актуальные запросы</span>
      <h2 class="h2">Покупатели ищут прямо сейчас</h2>
      <p class="section-lead">Откликайтесь на заявки — средний отклик на платформе 3 часа. Все покупатели проверены, оплата через эскроу.</p>
    </div>
    <div class="top-row">
      <div class="catalog-chips">
        <button class="c-chip active">Все запросы</button>
        <button class="c-chip">🔥 Срочные</button>
        <button class="c-chip">Пшеница</button>
        <button class="c-chip">Ячмень</button>
        <button class="c-chip">Кукуруза</button>
        <button class="c-chip">Подсолнечник</button>
        <button class="c-chip">Крупный опт (&gt; 200 т)</button>
      </div>
      <div class="view-tools">
        <div class="sort-select">
          <select>
            <option>Сортировка: новые сверху</option>
            <option>По цене: ↓</option>
            <option>По цене: ↑</option>
            <option>По объёму: ↓</option>
            <option>По срочности</option>
          </select>
        </div>
      </div>
    </div>
  </div>

  <div class="tabs-bar">
    <button class="tab-btn active" data-tab="active">
      Активные <span class="tab-count">{len(REQUESTS)}</span>
    </button>
    <button class="tab-btn" data-tab="archive">
      В архиве <span class="tab-count">{len(ARCHIVE_REQUESTS)}</span>
    </button>
  </div>

  <div class="tab-pane" data-pane="active">
    <div class="req-grid">
      {requests_html}
    </div>
  </div>
  <div class="tab-pane" data-pane="archive" style="display:none">
    <div class="req-grid">
      {arch_requests_html}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Отклик в течение 3 часов</span>
      <h3>Хотите продать свой урожай выгодно?</h3>
      <p class="lead">Разместите товар — покупатели сами предложат вам лучшие условия. Без посредников, с защитой оплаты через эскроу.</p>
    </div>
    <form class="reverse-form" onsubmit="event.preventDefault();alert('Заявка отправлена.')">
      <input type="text" placeholder="Наименование продукта" />
      <input type="text" placeholder="Ваш регион" />
      <div class="sel"><span>С НДС / без НДС</span><span class="chev">▾</span></div>
      <div class="sel"><span>Объём партии (т)</span><span class="chev">▾</span></div>
      <button class="submit" type="submit">Продать свой урожай {icon('arrow-sm')}</button>
    </form>
  </div>
</section>

<section class="section">
  <div class="how-grid">
    <div>
      <span class="eyebrow">{icon('sparkles')} Как быстро начать</span>
      <h2 class="h2">Запустите продажи за 4 простых шага</h2>
      <p class="section-lead">От регистрации до первой сделки — обычно проходит меньше суток. Платформа ведёт вас на каждом этапе.</p>
    </div>
    <div class="steps-grid">
      <div class="step">
        <div class="ic-wrap">{icon('user')}</div>
        <h4>Создайте личный кабинет</h4>
        <p>Регистрация займёт 1 минуту. Подтверждение номера по SMS и реквизитов юр.лица — до 2 часов.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('calendar')}</div>
        <h4>Добавьте товар</h4>
        <p>Укажите цену, качество и регион. Чем подробнее заполнены показатели качества — тем выше позиция в выдаче.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('message')}</div>
        <h4>Получайте заявки</h4>
        <p>Уведомления о новых заявках — в личный кабинет, email и Telegram. Отвечайте за 1 клик.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('handshake')}</div>
        <h4>Закрывайте сделки</h4>
        <p>Подтверждайте условия, подписывайте типовой договор и получайте оплату через эскроу после отгрузки.</p>
      </div>
    </div>
  </div>
</section>'''
    return page('Продать', body, active='sale',
                description='Продавайте урожай напрямую покупателям на площадке Русский Урожай. Без посредников, с эскроу-защитой. 30 актуальных запросов.')


def build_about():
    body = f'''<section class="page-hero">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>О компании</span>
    </div>
    <h1>Делаем рынок сельхозпродукции прозрачнее</h1>
    <p>«Русский Урожай» — онлайн-платформа, которая соединяет производителей и покупателей сельхозпродукции напрямую, без посредников и переплат.</p>
  </div>
</section>

<section class="section">
  <span class="eyebrow">{icon('sparkles')} Для кого мы работаем</span>
  <h2 class="h2">Две стороны одной сделки</h2>
  <p class="section-lead">Платформа одинаково удобна и выгодна как для фермеров, так и для покупателей. Вся логика выстроена вокруг прозрачности и скорости.</p>

  <div class="about-targets">
    <div class="target-card">
      <div class="ic-big">{icon('tractor')}</div>
      <h4>Фермерам и агрохозяйствам</h4>
      <p>Которые хотят продать урожай по справедливой цене. Прямой выход на покупателя, реальная цена рынка, защита оплаты и поддержка по документам.</p>
      <a class="btn btn-primary" href="/sale.html" style="align-self:flex-start">Разместить товар {icon('arrow-sm')}</a>
    </div>
    <div class="target-card">
      <div class="ic-big">{icon('buyer')}</div>
      <h4>Покупателям</h4>
      <p>Которые ищут надёжных поставщиков без длинных цепочек поставок. Сравнение офферов, проверенные поставщики, эскроу-защита и быстрый отклик.</p>
      <a class="btn btn-primary" href="/catalog.html" style="align-self:flex-start">Найти поставщика {icon('arrow-sm')}</a>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="how-grid">
    <div>
      <span class="eyebrow">{icon('sparkles')} Как это работает</span>
      <h2 class="h2">Путь сделки — от объявления до оплаты</h2>
      <p class="section-lead">Платформа сопровождает процесс на каждом этапе: от размещения объявления до завершения сделки.</p>
    </div>
    <div class="steps-grid">
      <div class="step">
        <div class="ic-wrap">{icon('tractor')}</div>
        <h4>1. Размещение товара</h4>
        <p>Продавцы размещают свои товары на платформе с описанием и ценой.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('search-lg')}</div>
        <h4>2. Поиск и отклики</h4>
        <p>Покупатели оставляют заявки на покупку или откликаются на предложения.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('message')}</div>
        <h4>3. Согласование условий</h4>
        <p>Стороны согласовывают детали сделки: объем, цену, сроки, доставку.</p>
      </div>
      <div class="step">
        <div class="ic-wrap">{icon('handshake')}</div>
        <h4>4. Сопровождение сделки</h4>
        <p>Платформа сопровождает процесс до получения оплаты или отгрузки.</p>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <span class="eyebrow">{icon('sparkles')} Что мы обеспечиваем</span>
  <h2 class="h2">Четыре гарантии для каждой сделки</h2>

  <div class="guarantees">
    <div class="guarantee">
      <div class="ic">{icon('check-big')}</div>
      <h5>Проверку контрагентов</h5>
    </div>
    <div class="guarantee">
      <div class="ic">{icon('headset')}</div>
      <h5>Поддержку на всех этапах сделки</h5>
    </div>
    <div class="guarantee">
      <div class="ic">{icon('mail')}</div>
      <h5>Контроль документации</h5>
    </div>
    <div class="guarantee">
      <div class="ic">{icon('truck')}</div>
      <h5>Расчёты и логистику через сервис</h5>
    </div>
  </div>

  <div class="final-cta">
    <h3>Готовы начать работу?</h3>
    <p>Присоединяйтесь к «Русскому Урожаю» и работайте напрямую с проверенными партнёрами</p>
    <div class="actions">
      <a class="btn btn-primary btn-lg" href="/sale.html">Найти покупателя {icon('arrow-sm')}</a>
      <a class="btn btn-white btn-lg" href="/catalog.html">Найти поставщика {icon('arrow-sm')}</a>
    </div>
  </div>
</section>'''
    return page('О компании', body, active='about',
                description='«Русский Урожай» — онлайн-платформа для прямых сделок между фермерами и покупателями сельхозпродукции.')


def build_how():
    body = f'''<section class="page-hero">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Помощь</span>
    </div>
    <h1>Как мы можем помочь?</h1>
    <p>Выберите удобный способ связи или найдите ответ в разделах ниже. Наша команда поддержки работает в будние дни с 9 до 18 (Мск).</p>
  </div>
</section>

<section class="section">
  <div class="help-quick">
    <div class="help-tile">
      <div class="ic-wrap">{icon('message')}</div>
      <h4>Задать вопрос</h4>
      <p>Получите ответ в течение нескольких минут через форму обратной связи</p>
      <a class="btn btn-primary btn-sm" href="/contacts.html">Открыть {icon('arrow-sm')}</a>
    </div>
    <div class="help-tile">
      <div class="ic-wrap">{icon('headset')}</div>
      <h4>Позвонить</h4>
      <p><a href="tel:+79300129797" style="color:var(--ink);font-weight:600">+7 930 012-97-97</a></p>
      <a class="btn btn-outline btn-sm" href="tel:+79300129797">Позвонить {icon('arrow-sm')}</a>
    </div>
    <div class="help-tile">
      <div class="ic-wrap">{icon('tg')}</div>
      <h4>Написать в Telegram</h4>
      <p><a href="https://t.me/tdrusagro" style="color:var(--ink);font-weight:600">@tdrusagro</a></p>
      <a class="btn btn-outline btn-sm" href="https://t.me/tdrusagro">Открыть Telegram {icon('arrow-sm')}</a>
    </div>
  </div>

  <div class="faq-mistakes">
    <h3>Частые ошибки при размещении объявления</h3>
    <div class="faq-mistakes-list">
      <div class="faq-mistakes-item">
        {icon('alert')}
        <div class="txt">Фотографии не загружаются — проверьте размер (макс. 10 МБ) и формат (JPG, PNG)</div>
      </div>
      <div class="faq-mistakes-item">
        {icon('alert')}
        <div class="txt">Объявление не публикуется — заполните все обязательные поля (цена, объём, регион)</div>
      </div>
      <div class="faq-mistakes-item">
        {icon('alert')}
        <div class="txt">Не приходит код подтверждения — проверьте правильность номера телефона</div>
      </div>
      <div class="faq-mistakes-item">
        {icon('alert')}
        <div class="txt">Ошибка при указании адреса — используйте точное название населённого пункта</div>
      </div>
    </div>
  </div>

  <div class="help-blocks">
    <div class="help-block">
      <div class="ic-big">{icon('buyer')}</div>
      <h3>Покупателям</h3>

      <div class="help-block-section">
        <h4>Как найти товар</h4>
        <ul>
          <li>Используйте фильтры по региону, культуре и объёму</li>
          <li>Изучите карточку продавца и его рейтинг</li>
          <li>Сравните предложения по цене и условиям доставки</li>
        </ul>
      </div>

      <div class="help-block-section">
        <h4>Как оформить покупку</h4>
        <ul>
          <li>Оставьте заявку или свяжитесь с продавцом через чат платформы</li>
          <li>Согласуйте условия сделки: объём, цену, сроки</li>
          <li>Используйте безопасную сделку через эскроу</li>
          <li>Получите товар и подтвердите выполнение</li>
        </ul>
      </div>

      <div class="help-block-section">
        <h4>Гарантии и безопасность</h4>
        <ul>
          <li>Все продавцы проходят проверку платформы</li>
          <li>Оплата только через эскроу-счёт</li>
          <li>Поддержка на всех этапах сделки</li>
          <li>Система рейтингов и арбитраж при спорах</li>
        </ul>
      </div>
    </div>

    <div class="help-block">
      <div class="ic-big">{icon('seller')}</div>
      <h3>Продавцам</h3>

      <div class="help-block-section">
        <h4>Как разместить товар</h4>
        <ul>
          <li>Зарегистрируйтесь и заполните профиль компании</li>
          <li>Создайте объявление с фото и описанием</li>
          <li>Укажите цену, объём и условия отгрузки</li>
          <li>Опубликуйте и получайте заявки от покупателей</li>
        </ul>
      </div>

      <div class="help-block-section">
        <h4>Как продать быстрее</h4>
        <ul>
          <li>Добавьте качественные фотографии товара</li>
          <li>Укажите конкурентную цену (сверьтесь с медианой по региону)</li>
          <li>Заполните все показатели качества — лаб. анализ в приоритете</li>
          <li>Быстро отвечайте на заявки покупателей</li>
        </ul>
      </div>

      <div class="help-block-section">
        <h4>Управление продажами</h4>
        <ul>
          <li>Отслеживайте заявки в личном кабинете</li>
          <li>Используйте шаблоны ответов для экономии времени</li>
          <li>Обновляйте остатки товара через интеграцию с 1С</li>
          <li>Получайте уведомления в email и Telegram</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="final-cta">
    <h3>Не нашли ответ?</h3>
    <p>Наша команда поддержки готова помочь вам в решении любых вопросов — в рабочее время.</p>
    <div class="actions">
      <a class="btn btn-primary btn-lg" href="/contacts.html">Связаться с поддержкой {icon('arrow-sm')}</a>
      <a class="btn btn-white btn-lg" href="tel:+79300129797">Позвонить</a>
    </div>
  </div>
</section>'''
    return page('Помощь', body, active='how',
                description='Помощь и поддержка Русский Урожай: как искать товар, как продавать, ответы на частые вопросы, контакты поддержки.')


def build_contacts():
    body = f'''<section class="page-hero">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Контакты</span>
    </div>
    <h1>Контакты</h1>
    <p>Мы на связи и готовы помочь в рабочее время. Свяжитесь с нами удобным для вас способом.</p>
  </div>
</section>

<section class="section">
  <div class="contact-grid">
    <div class="contact-info">
      <a class="contact-tile" href="tel:+79300129797">
        <div class="ic-wrap">{icon('phone')}</div>
        <div>
          <div class="k">Телефон</div>
          <div class="v">+7 930 012-97-97</div>
        </div>
      </a>
      <a class="contact-tile" href="mailto:support@russian-harvest.ru">
        <div class="ic-wrap">{icon('mail')}</div>
        <div>
          <div class="k">Email</div>
          <div class="v">support@russian-harvest.ru</div>
        </div>
      </a>
      <a class="contact-tile" href="https://t.me/tdrusagro">
        <div class="ic-wrap">{icon('tg')}</div>
        <div>
          <div class="k">Telegram</div>
          <div class="v">@tdrusagro</div>
        </div>
      </a>
      <div class="contact-tile">
        <div class="ic-wrap">{icon('clock')}</div>
        <div>
          <div class="k">Время работы</div>
          <div class="v">Пн–Пт, 9:00–18:00 (Мск)</div>
        </div>
      </div>
    </div>

    <form class="contact-form" onsubmit="event.preventDefault();alert('Сообщение отправлено.')">
      <h3>Напишите нам</h3>
      <p>Мы ответим в ближайшее время в рабочие часы.</p>

      <div class="form-group">
        <label>Название компании <span class="req">*</span></label>
        <input type="text" required placeholder="ООО «АгроКомпания»" />
      </div>
      <div class="form-group">
        <label>Контактное лицо <span class="req">*</span></label>
        <input type="text" required placeholder="Иванов Иван" />
      </div>
      <div class="form-group">
        <label>Телефон <span class="req">*</span></label>
        <input type="tel" required placeholder="+7 (___) ___-__-__" />
      </div>
      <div class="form-group">
        <label>Сообщение</label>
        <textarea placeholder="Опишите ваш вопрос…"></textarea>
      </div>

      <button class="btn btn-primary btn-lg btn-block" type="submit" style="margin-top:8px">
        Отправить {icon('arrow-sm')}
      </button>

      <p class="form-note">
        Вы даёте согласие на обработку персональных данных и соглашаетесь c <a href="/policy.html">политикой конфиденциальности</a>.
      </p>
    </form>
  </div>
</section>'''
    return page('Контакты', body, active='contacts',
                description='Связаться с поддержкой Русский Урожай: телефон +7 930 012-97-97, email support@russian-harvest.ru, Telegram @tdrusagro.')


# ================= LEGAL PAGES =================

def legal_page(slug, title, blocks):
    """Legal/content page with sections."""
    body_parts = [f'<h1>{title}</h1>', f'<div class="meta">Актуально на 20 апреля 2026 г.</div>']
    for kind, text in blocks:
        if kind == 'h2':
            body_parts.append(f'<h2>{text}</h2>')
        elif kind == 'h3':
            body_parts.append(f'<h3>{text}</h3>')
        elif kind == 'p':
            body_parts.append(f'<p>{text}</p>')
        elif kind == 'ul':
            items = ''.join(f'<li>{i}</li>' for i in text)
            body_parts.append(f'<ul>{items}</ul>')
        elif kind == 'ol':
            items = ''.join(f'<li>{i}</li>' for i in text)
            body_parts.append(f'<ol>{items}</ol>')

    body = f'''<div class="content-wrap">
  <div class="breadcrumb" style="margin-bottom:24px;color:var(--slate-500)">
    <a href="/index.html" style="color:var(--slate-600)">Главная</a>
    <span class="sep" style="color:var(--slate-300);margin:0 8px">/</span>
    <span>{title}</span>
  </div>
  {"".join(body_parts)}
</div>'''
    return page(title, body, active='', description=f'{title} — онлайн-площадка Русский Урожай.')


def build_offer():
    return legal_page('offer', 'Публичная оферта', [
        ('p', 'Настоящий документ является публичной офертой (далее — «Оферта») Индивидуального предпринимателя Фролова Владимира Андреевича (далее — «Платформа») и содержит все существенные условия оказания услуг информационного посредничества на онлайн-площадке «Русский Урожай» (russian-harvest.ru).'),
        ('h2', '1. Термины и определения'),
        ('p', '<strong>Платформа</strong> — онлайн-сервис russian-harvest.ru для размещения предложений о продаже и покупке сельскохозяйственной продукции.'),
        ('p', '<strong>Пользователь</strong> — физическое или юридическое лицо, зарегистрированное на Платформе.'),
        ('p', '<strong>Поставщик</strong> — Пользователь, размещающий предложение о продаже сельхозпродукции.'),
        ('p', '<strong>Покупатель</strong> — Пользователь, выражающий намерение приобрести сельхозпродукцию.'),
        ('h2', '2. Предмет оферты'),
        ('p', 'Платформа предоставляет Пользователям техническую возможность размещать предложения, откликаться на заявки, обмениваться сообщениями и осуществлять расчёты с использованием эскроу-счёта.'),
        ('h2', '3. Обязанности платформы'),
        ('ul', [
            'Обеспечивать работу сервиса в режиме 24/7 с плановыми техническими перерывами.',
            'Проверять Пользователей при прохождении процедуры верификации.',
            'Сопровождать сделки с использованием эскроу-счёта.',
            'Обеспечивать конфиденциальность персональных данных в соответствии с 152-ФЗ.',
        ]),
        ('h2', '4. Обязанности пользователя'),
        ('ul', [
            'Предоставлять достоверные сведения о себе и размещаемых товарах.',
            'Не использовать Платформу в целях, противоречащих законодательству РФ.',
            'Соблюдать согласованные сроки поставки и оплаты.',
            'Не передавать учётные данные третьим лицам.',
        ]),
        ('h2', '5. Ответственность сторон'),
        ('p', 'Платформа не является стороной сделки между Поставщиком и Покупателем. Ответственность за качество продукции, соответствие заявленным характеристикам и соблюдение сроков несёт Поставщик. За оплату в оговорённые сроки — Покупатель. Платформа выступает посредником и арбитром в случае споров.'),
        ('h2', '6. Реквизиты'),
        ('p', 'ИП Фролов Владимир Андреевич · ОГРНИП 325330000052515 · г. Нижний Новгород'),
        ('p', 'По всем вопросам: <a href="mailto:support@russian-harvest.ru">support@russian-harvest.ru</a> · <a href="tel:+79300129797">+7 930 012-97-97</a>'),
    ])


def build_regulations():
    return legal_page('regulations', 'Правила торговой площадки', [
        ('p', 'Настоящие Правила регулируют порядок использования онлайн-площадки «Русский Урожай» всеми категориями Пользователей.'),
        ('h2', '1. Общие положения'),
        ('p', 'Использование Платформы допускается только после регистрации и принятия условий Публичной оферты. Регистрация доступна юридическим лицам, индивидуальным предпринимателям и самозанятым гражданам РФ.'),
        ('h2', '2. Размещение предложений'),
        ('ul', [
            'Каждое предложение должно содержать достоверные сведения о товаре: наименование, объём, цену, регион отгрузки и показатели качества.',
            'Запрещено размещать несуществующие товары, дублировать предложения, публиковать контакты в тексте объявления.',
            'Платформа имеет право модерировать и удалять предложения, нарушающие настоящие Правила.',
        ]),
        ('h2', '3. Взаимодействие сторон'),
        ('ul', [
            'Все переговоры ведутся через встроенный чат Платформы.',
            'Данные контрагента (реквизиты, контакты) раскрываются только после подтверждения сделки и резервирования средств на эскроу-счёте.',
            'Запрещены попытки обхода Платформы с целью заключения сделки напрямую без оплаты комиссии.',
        ]),
        ('h2', '4. Эскроу-расчёты'),
        ('p', 'Все финансовые расчёты между сторонами осуществляются через эскроу-счёт, открытый в партнёрском банке Платформы. Деньги резервируются на счёте в момент согласования сделки и переводятся Поставщику после подтверждения приёмки партии Покупателем. При возникновении спора средства остаются на эскроу-счёте до вынесения решения арбитражной комиссией Платформы.'),
        ('h2', '5. Рейтинг и репутация'),
        ('p', 'По итогам каждой сделки стороны оценивают друг друга по 5-балльной шкале. Рейтинг поставщика влияет на позицию его предложений в выдаче и уровень комиссии.'),
        ('h2', '6. Комиссия платформы'),
        ('p', 'Комиссия Платформы составляет от 0,5% до 2% от суммы сделки в зависимости от объёма и рейтинга Поставщика. Комиссия удерживается автоматически при переводе средств с эскроу-счёта.'),
        ('h2', '7. Блокировка аккаунтов'),
        ('p', 'Платформа вправе заблокировать аккаунт Пользователя при выявлении нарушений настоящих Правил, мошеннических действий или систематических жалоб других участников.'),
    ])


def build_policy():
    return legal_page('policy', 'Политика конфиденциальности', [
        ('p', 'Настоящая Политика разработана в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных Пользователей онлайн-площадки «Русский Урожай».'),
        ('h2', '1. Оператор персональных данных'),
        ('p', 'Оператором является ИП Фролов Владимир Андреевич (ОГРНИП 325330000052515), адрес: 603000, г. Нижний Новгород.'),
        ('h2', '2. Цели обработки'),
        ('ul', [
            'Регистрация и идентификация Пользователя на Платформе.',
            'Исполнение договорных обязательств перед Пользователем.',
            'Информирование о новых функциях, акциях и обновлениях сервиса.',
            'Соблюдение требований законодательства РФ.',
        ]),
        ('h2', '3. Обрабатываемые данные'),
        ('p', 'При регистрации Платформа обрабатывает: ФИО, наименование юридического лица, ИНН, ОГРН/ОГРНИП, адрес, телефон, email, банковские реквизиты для расчётов, IP-адрес устройства, данные файлов cookies.'),
        ('h2', '4. Срок хранения'),
        ('p', 'Персональные данные хранятся в течение всего периода использования Платформы и 5 лет после удаления аккаунта, что соответствует общему сроку хранения документов бухгалтерского учёта.'),
        ('h2', '5. Передача третьим лицам'),
        ('p', 'Платформа не передаёт персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством РФ, или для исполнения договорных обязательств (платёжные системы, банки-партнёры, логистические компании — строго в необходимом для исполнения сделки объёме).'),
        ('h2', '6. Права пользователя'),
        ('ul', [
            'Получать информацию об обработке своих персональных данных.',
            'Требовать уточнения, блокировки или удаления своих данных.',
            'Отозвать согласие на обработку в любой момент.',
        ]),
        ('h2', '7. Cookies'),
        ('p', 'Платформа использует файлы cookies для обеспечения работы сайта, аналитики и персонализации. Отказаться от cookies можно в настройках браузера, однако это может повлиять на функциональность сервиса.'),
        ('h2', '8. Контакты'),
        ('p', 'По всем вопросам, связанным с обработкой персональных данных: <a href="mailto:support@russian-harvest.ru">support@russian-harvest.ru</a>.'),
    ])


def build_dispute():
    return legal_page('dispute', 'Регламент разрешения споров', [
        ('p', 'Настоящий Регламент определяет порядок разрешения споров, возникающих между Пользователями онлайн-площадки «Русский Урожай» в связи со сделками, заключёнными на Платформе.'),
        ('h2', '1. Общие принципы'),
        ('p', 'Платформа выступает независимым арбитром при возникновении споров между Поставщиком и Покупателем. Решение арбитражной комиссии обязательно для исполнения обеими сторонами в рамках договорённостей, достигнутых на Платформе.'),
        ('h2', '2. Основания для открытия спора'),
        ('ul', [
            'Поставщик не отгрузил партию в согласованный срок.',
            'Покупатель не подтверждает приёмку без обоснованных причин.',
            'Качество партии существенно отличается от заявленного.',
            'Возникли разногласия по объёму, цене или условиям поставки.',
        ]),
        ('h2', '3. Порядок подачи претензии'),
        ('ol', [
            'Сторона, инициирующая спор, направляет претензию через интерфейс Платформы с указанием номера сделки и сути разногласий.',
            'Противоположная сторона уведомляется о споре и получает 3 рабочих дня на представление своей позиции.',
            'Арбитражная комиссия Платформы рассматривает обстоятельства и запрашивает у сторон необходимые документы (ТТН, лабораторные анализы, фото/видео и т.д.).',
            'Решение выносится в течение 7 рабочих дней с момента получения всех материалов.',
        ]),
        ('h2', '4. Возможные решения'),
        ('ul', [
            'Средства с эскроу-счёта переводятся Поставщику в полном объёме.',
            'Средства возвращаются Покупателю (полностью или частично).',
            'Согласуется перерасчёт стоимости с учётом фактических характеристик партии.',
            'Рекомендуется дополнительная лабораторная экспертиза (за счёт стороны, чья позиция не подтвердилась).',
        ]),
        ('h2', '5. Апелляция'),
        ('p', 'Сторона, не согласная с решением арбитражной комиссии, вправе в течение 14 дней подать апелляцию с приложением новых доказательств. Повторное рассмотрение — окончательное для Платформы.'),
        ('h2', '6. Судебное урегулирование'),
        ('p', 'В случае несогласия с решением Платформы стороны вправе обратиться в суд по месту регистрации ответчика в соответствии с законодательством РФ.'),
        ('h2', '7. Контакты'),
        ('p', 'Подача претензий и вопросы по спорным ситуациям: <a href="mailto:support@russian-harvest.ru">support@russian-harvest.ru</a> · <a href="tel:+79300129797">+7 930 012-97-97</a>.'),
    ])


def build_auction():
    """Auction page — live bidding."""
    # Demo auctions with dates
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    def future(hours):
        return (now + datetime.timedelta(hours=hours)).isoformat()

    auctions = [
        {'id':'AU-001','title':'Пшеница 3 класс','volume':'500 т','region':'Саратов','distance':689,'starting':13500,'current':14800,'bids':12,'ends_hours':4.5,'quality':'Протеин 12,8 %','ending_soon':False},
        {'id':'AU-002','title':'Подсолнечник','volume':'250 т','region':'Воронеж','distance':580,'starting':27000,'current':29200,'bids':8,'ends_hours':12,'quality':'Масличность 46 %','ending_soon':False},
        {'id':'AU-003','title':'Кукуруза','volume':'400 т','region':'Липецк','distance':634,'starting':14500,'current':15400,'bids':23,'ends_hours':1.2,'quality':'Влажность 13 %','ending_soon':True},
        {'id':'AU-004','title':'Рапс','volume':'180 т','region':'Саранск','distance':413,'starting':30000,'current':32800,'bids':5,'ends_hours':26,'quality':'Масличность 43 %','ending_soon':False},
        {'id':'AU-005','title':'Ячмень пивоваренный','volume':'300 т','region':'Чебоксары','distance':235,'starting':15800,'current':16900,'bids':14,'ends_hours':8,'quality':'Белок 10,5 %','ending_soon':False},
        {'id':'AU-006','title':'Соя','volume':'120 т','region':'Казань','distance':407,'starting':38000,'current':40100,'bids':9,'ends_hours':18,'quality':'Протеин 39 %','ending_soon':False},
    ]

    def auction_card(a):
        delta_pct = ((a['current'] - a['starting']) / a['starting'] * 100)
        status_cls = 'ending-soon' if a['ending_soon'] else ''
        status_text = 'Завершается' if a['ending_soon'] else 'Активный'
        return f'''<article class="auction-card {status_cls}" data-auction-ends="{future(a['ends_hours'])}" data-auction-id="{a['id']}">
  <div class="auction-head">
    <div>
      <h3 class="auction-title">{a['title']} · {a['volume']}</h3>
      <div style="font-size:12px;color:var(--slate-500);margin-top:4px">{a['region']} · {a['distance']} км · {a['quality']}</div>
    </div>
    <span class="auction-status {status_cls}">{status_text}</span>
  </div>

  <div class="auction-timer-row">
    <span class="label">До конца</span>
    <span class="auction-timer">—</span>
  </div>

  <div class="auction-bid">
    <div>
      <div class="label">Текущая ставка</div>
      <div class="amount">{a['current']:,} ₽/т</div>
      <div class="delta">↑ +{delta_pct:.1f}% от старта ({a['starting']:,} ₽/т)</div>
    </div>
  </div>

  <div class="auction-meta">
    <div class="cell">
      <div class="k">Ставок</div>
      <div class="v">{a['bids']}</div>
    </div>
    <div class="cell">
      <div class="k">Минимальный шаг</div>
      <div class="v">100 ₽</div>
    </div>
  </div>

  <div class="auction-actions">
    <button class="btn btn-primary">Сделать ставку +100 ₽</button>
    <button class="btn btn-outline">Детали</button>
  </div>
</article>'''.replace(',', ' ').replace('₽/т ', '₽/т\xa0')  # Russian number format hack

    cards_html = ''.join(auction_card(a) for a in auctions)

    body = f'''<section class="page-hero">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Аукцион</span>
    </div>
    <h1>Аукционы в реальном времени</h1>
    <p>Покупайте крупные партии на открытых торгах. Ставки видны всем участникам, победителем становится автор максимальной ставки к окончанию времени.</p>
    <div style="margin-top:16px"><span class="live-pulse">LIVE · обновляется каждую секунду</span></div>
  </div>
</section>

<section class="section">
  <div class="catalog-head" style="margin-bottom:20px">
    <div>
      <span class="eyebrow">{icon('sparkles')} Активные торги</span>
      <h2 class="h2">{len(auctions)} активных аукциона</h2>
      <p class="section-lead">Цены определяются рынком. Все поставщики проверены, эскроу-защита оплаты.</p>
    </div>
    <div class="top-row">
      <div class="catalog-chips">
        <button class="c-chip active">Все</button>
        <button class="c-chip">🔥 Завершаются</button>
        <button class="c-chip">Пшеница</button>
        <button class="c-chip">Масличные</button>
        <button class="c-chip">Кукуруза</button>
      </div>
    </div>
  </div>

  <div class="auction-grid">
    {cards_html}
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Запуск аукциона за 15 минут</span>
      <h3>Хотите провести свой аукцион?</h3>
      <p class="lead">Разместите партию, установите минимальную цену и время окончания — платформа сама соберёт ставки от проверенных покупателей.</p>
    </div>
    <form class="reverse-form" onsubmit="event.preventDefault();alert('Заявка на аукцион отправлена.')">
      <input type="text" placeholder="Наименование продукта" />
      <input type="text" placeholder="Объём, тонн" />
      <div class="sel"><span>Минимальная цена</span><span class="chev">▾</span></div>
      <div class="sel"><span>Длительность</span><span class="chev">▾</span></div>
      <button class="submit" type="submit">Запустить аукцион {icon('arrow-sm')}</button>
    </form>
  </div>
</section>'''
    return page('Аукцион', body, active='auction',
                description='Онлайн-аукционы сельхозпродукции. Живые торги, прозрачные ставки, эскроу-защита сделки.')


def build_prices():
    """Live market prices / биржа котировок."""
    quotes = [
        {'crop':'Пшеница 3 класс',   'ico':'🌾','price':14200,'change':1.8,  'key':'wheat-3'},
        {'crop':'Пшеница 4 класс',   'ico':'🌾','price':12100,'change':-0.4, 'key':'wheat-4'},
        {'crop':'Пшеница 5 класс',   'ico':'🌾','price':10800,'change':+0.2, 'key':'wheat-5'},
        {'crop':'Ячмень кормовой',   'ico':'🌿','price':13050,'change':+0.6, 'key':'barley'},
        {'crop':'Ячмень пивоваренный','ico':'🍺','price':16400,'change':+1.2,'key':'barley-malt'},
        {'crop':'Кукуруза',          'ico':'🌽','price':15100,'change':+2.3, 'key':'corn'},
        {'crop':'Подсолнечник',      'ico':'🌻','price':28400,'change':-1.1, 'key':'sunflower'},
        {'crop':'Рапс',              'ico':'🌱','price':32100,'change':+3.2, 'key':'rapeseed'},
        {'crop':'Соя',               'ico':'🫘','price':39500,'change':-0.3, 'key':'soy'},
        {'crop':'Овёс',              'ico':'🥣','price':10800,'change':+0.8, 'key':'oat'},
        {'crop':'Горох',             'ico':'🟢','price':18200,'change':+0.9, 'key':'pea'},
        {'crop':'Гречиха',           'ico':'🟤','price':22400,'change':-2.0, 'key':'buckwheat'},
        {'crop':'Лён масличный',     'ico':'🌾','price':34800,'change':+1.5, 'key':'flax'},
        {'crop':'Нут',               'ico':'🫛','price':58200,'change':+0.5, 'key':'chickpea'},
    ]

    def quote_tile(q):
        change_cls = 'up' if q['change'] > 0 else ('dn' if q['change'] < 0 else 'neutral')
        sign = '+' if q['change'] >= 0 else ''
        return f'''<div class="quote-tile" data-quote-crop="{q['key']}" data-base-price="{q['price']}">
  <div class="q-crop"><span class="ico">{q['ico']}</span>{q['crop']}</div>
  <div class="q-price">{q['price']:,} ₽/т</div>
  <div class="q-meta">
    <span>1 тонна</span>
    <span class="q-change {change_cls}">{sign}{q['change']}%</span>
  </div>
</div>'''.replace(',', ' ')

    tiles_html = ''.join(quote_tile(q) for q in quotes)

    body = f'''<section class="page-hero">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Биржа цен</span>
    </div>
    <h1>Биржа котировок в реальном времени</h1>
    <p>Актуальные медианные цены по 30+ регионам, обновляются автоматически. Сверяйте свои офферы с рынком — платформа подсветит выгодные предложения.</p>
    <div style="margin-top:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <span class="live-pulse">LIVE · обновление каждые 3 сек</span>
      <span style="color:rgba(255,255,255,.6);font-size:13px;font-family:'JetBrains Mono',monospace">Источник: агрегатор 152 закрытых сделок за 24 часа</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="catalog-head" style="margin-bottom:20px">
    <div>
      <span class="eyebrow">{icon('sparkles')} Медианные цены</span>
      <h2 class="h2">Цены по вашему региону</h2>
      <p class="section-lead">Средние цены последних 24 часов по {len(quotes)} культурам. Для точной цены конкретного склада — смотрите карточку товара в каталоге.</p>
    </div>
  </div>

  <div class="quotes-grid">
    {tiles_html}
  </div>

  <div style="margin-top:40px;padding:28px;background:var(--paper);border-radius:var(--radius-xl);box-shadow:var(--shadow-md)">
    <h3 style="font-size:18px;font-weight:700;color:var(--ink);margin-bottom:10px">Как формируются цены</h3>
    <p style="color:var(--slate-600);line-height:1.7;font-size:14.5px">Показанные цены — медиана закрытых сделок на платформе за последние 24 часа по каждой культуре и классу качества, скорректированная на ваш регион с учётом логистики. Мы не включаем единичные экстремальные цены (верхние/нижние 5%), чтобы показать реальную «рабочую» цену рынка. Данные обновляются каждые 3 секунды, график истории цен доступен по клику на карточку.</p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Подписка бесплатно</span>
      <h3>Получайте сводку цен каждое утро</h3>
      <p class="lead">Ежедневная рассылка в Telegram/email с изменениями цен по культурам, которые вас интересуют. Настройте один раз и будьте в курсе рынка.</p>
    </div>
    <form class="reverse-form" onsubmit="event.preventDefault();alert('Подписка оформлена.')">
      <input type="text" placeholder="Ваш email или @telegram" />
      <div class="sel"><span>Культуры</span><span class="chev">▾</span></div>
      <div class="sel"><span>Частота</span><span class="chev">▾</span></div>
      <div class="sel"><span>Регион</span><span class="chev">▾</span></div>
      <button class="submit" type="submit">Подписаться на сводку {icon('arrow-sm')}</button>
    </form>
  </div>
</section>'''
    return page('Биржа цен', body, active='prices',
                description='Живая биржа цен на сельхозпродукцию. Медианные цены по 30+ регионам обновляются в реальном времени.')


def build_404():
    body = f'''<div class="error-page">
  <div class="error-content">
    <div class="error-code">404</div>
    <h1>Страница не найдена</h1>
    <p>Похоже, такой страницы не существует. Возможно, вы перешли по устаревшей ссылке или ошиблись в адресе.</p>
    <div class="actions">
      <a class="btn btn-primary btn-lg" href="/index.html">На главную {icon('arrow-sm')}</a>
      <a class="btn btn-outline btn-lg" href="/catalog.html">Каталог</a>
    </div>
  </div>
</div>'''
    return page('Страница не найдена', body, active='')


# ================= BUILD =================

def build_account():
    """Personal account / dashboard page."""
    body = f'''<section class="section" style="padding-top:32px">
  <div class="breadcrumb" style="margin-bottom:16px;color:var(--slate-500)">
    <a href="/index.html" style="color:var(--slate-600)">Главная</a>
    <span class="sep" style="color:var(--slate-300);margin:0 8px">/</span>
    <span>Личный кабинет</span>
  </div>

  <div class="account-layout">

    <!-- Sidebar -->
    <aside class="account-aside">
      <div class="account-user">
        <div class="avatar" id="accAvatar">ВФ</div>
        <div class="name" id="accName">Владимир Ф.</div>
        <div class="company" id="accCompany">ИП Фролов В.А.</div>
        <span class="role-chip" id="accRole">{icon('buyer')} Покупатель</span>
        <div class="balance">
          <div class="k">Баланс на эскроу</div>
          <div class="v" id="accBalance">0<small>₽</small></div>
        </div>
      </div>

      <nav class="account-nav">
        <a href="#" class="active">{icon('chart')}<span>Обзор</span></a>
        <a href="#">{icon('handshake')}<span>Мои сделки</span><span class="badge-num">3</span></a>
        <a href="#">{icon('message')}<span>Заявки</span><span class="badge-num">2</span></a>
        <a href="#">{icon('mail')}<span>Чаты</span><span class="badge-num">5</span></a>
        <a href="#">{icon('seller')}<span>Избранное</span><span class="badge-num">12</span></a>
        <a href="#">{icon('calendar')}<span>История</span></a>
        <a href="#">{icon('user')}<span>Профиль компании</span></a>
        <a href="#">{icon('coins')}<span>Платежи и эскроу</span></a>
        <a href="#">{icon('info')}<span>Настройки</span></a>
      </nav>

      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--slate-100)">
        <button class="btn btn-outline btn-block" data-action="logout" style="justify-content:flex-start;padding:10px 12px;font-size:13.5px;color:var(--slate-600)">
          ↩ Выйти из кабинета
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="account-main">

      <div class="account-head">
        <div>
          <h1 id="accGreeting">Здравствуйте, Владимир 👋</h1>
          <p id="accSubtitle">Вот что происходит по вашим сделкам сегодня. Среднее время отклика поставщиков — 2 часа 40 минут.</p>
        </div>
        <a href="/catalog.html" class="btn btn-primary">{icon('search')} Найти поставщика</a>
      </div>

      <!-- ADMIN-ONLY PANEL (shown only for admin role via JS) -->
      <div class="account-panel admin-only" id="adminPanel" style="display:none;background:linear-gradient(135deg,#FEF3C7 0%,#FFF 60%);border:2px solid #F59E0B">
        <div class="account-panel-head">
          <div>
            <h3 style="display:flex;align-items:center;gap:10px">👑 Админ-панель <span class="admin-badge">Только для администраторов</span></h3>
            <p style="color:var(--slate-600);margin-top:4px;font-size:13px">Модерация офферов, управление пользователями, статистика платформы.</p>
          </div>
        </div>

        <div class="account-stats" style="margin-top:16px">
          <div class="account-stat" style="background:var(--ink);color:#fff">
            <div class="k" style="color:rgba(255,255,255,.6)">Пользователей</div>
            <div class="v" style="color:#fff">2 147</div>
            <div class="d" style="color:#C7E588">↑ +42 за неделю</div>
          </div>
          <div class="account-stat">
            <div class="k">Офферов на модерации</div>
            <div class="v" style="color:var(--orange-dark)">17</div>
            <div class="d" style="color:var(--orange-dark)">⚠ требуют проверки</div>
          </div>
          <div class="account-stat">
            <div class="k">Сделок в эскроу</div>
            <div class="v">89</div>
            <div class="d up">↑ 14.3 млн ₽ в работе</div>
          </div>
          <div class="account-stat">
            <div class="k">Оборот платформы</div>
            <div class="v" style="font-size:20px">127.4 <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">млн ₽</small></div>
            <div class="d up">↑ +18% к прошлой неделе</div>
          </div>
        </div>

        <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px">
          <a href="#" class="btn btn-dark">{icon('shield')} Модерация офферов</a>
          <a href="#" class="btn btn-outline">{icon('user')} Пользователи</a>
          <a href="#" class="btn btn-outline">{icon('handshake')} Все сделки</a>
          <a href="#" class="btn btn-outline">{icon('alert')} Споры и жалобы</a>
          <a href="#" class="btn btn-outline">{icon('chart')} Аналитика</a>
          <a href="#" class="btn btn-outline">{icon('info')} Настройки платформы</a>
        </div>
      </div>

      <!-- KPI stats -->
      <div class="account-stats">
        <div class="account-stat">
          <div class="k">Активных сделок</div>
          <div class="v">3</div>
          <div class="d up">↑ 1 за неделю</div>
        </div>
        <div class="account-stat">
          <div class="k">Ожидают отклика</div>
          <div class="v">2</div>
          <div class="d" style="color:var(--orange-dark)">⏱ 5 ч до отклика</div>
        </div>
        <div class="account-stat">
          <div class="k">Закрыто всего</div>
          <div class="v">14</div>
          <div class="d up">↑ 3 в этом месяце</div>
        </div>
        <div class="account-stat">
          <div class="k">Оборот · 2026</div>
          <div class="v" style="font-size:20px">4.2 <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">млн ₽</small></div>
          <div class="d up">↑ +28% к 2025</div>
        </div>
      </div>

      <!-- Active deals -->
      <div class="account-panel">
        <div class="account-panel-head">
          <h3>Активные сделки</h3>
          <a href="#" class="btn btn-outline btn-sm">Все сделки {icon('arrow-sm')}</a>
        </div>
        <div class="deals-list">

          <div class="deal-row">
            <div class="deal-status active">{icon('truck')}</div>
            <div class="deal-info">
              <div class="title">Пшеница 3 класс · 120 т</div>
              <div class="meta">
                <span>Сделка №СД-4721</span>
                <span class="dot">·</span>
                <span>Балаково → Н.Новгород</span>
                <span class="dot">·</span>
                <span>539,4 км</span>
              </div>
            </div>
            <div class="deal-price">1 920 000 ₽<small>с доставкой</small></div>
            <span class="deal-label active">В пути</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-outline btn-sm">Чат</a>
              <a href="#" class="btn btn-dark btn-sm">Открыть</a>
            </div>
          </div>

          <div class="deal-row">
            <div class="deal-status pending">{icon('clock')}</div>
            <div class="deal-info">
              <div class="title">Ячмень кормовой · 40 т</div>
              <div class="meta">
                <span>Сделка №СД-4698</span>
                <span class="dot">·</span>
                <span>Балахна</span>
                <span class="dot">·</span>
                <span>39 км</span>
              </div>
            </div>
            <div class="deal-price">538 000 ₽<small>ожидаем подпись</small></div>
            <span class="deal-label pending">Подписание</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-outline btn-sm">Чат</a>
              <a href="#" class="btn btn-primary btn-sm">Подписать</a>
            </div>
          </div>

          <div class="deal-row">
            <div class="deal-status active">{icon('coins')}</div>
            <div class="deal-info">
              <div class="title">Кукуруза · 80 т</div>
              <div class="meta">
                <span>Сделка №СД-4665</span>
                <span class="dot">·</span>
                <span>Дзержинск</span>
                <span class="dot">·</span>
                <span>38 км</span>
              </div>
            </div>
            <div class="deal-price">1 236 000 ₽<small>оплачено · эскроу</small></div>
            <span class="deal-label active">Оплачено</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-outline btn-sm">Чат</a>
              <a href="#" class="btn btn-dark btn-sm">Открыть</a>
            </div>
          </div>

        </div>
      </div>

      <!-- Open requests -->
      <div class="account-panel">
        <div class="account-panel-head">
          <h3>Ваши заявки на закупку</h3>
          <a href="#" class="btn btn-outline btn-sm">Создать заявку {icon('arrow-sm')}</a>
        </div>
        <div class="deals-list">

          <div class="deal-row">
            <div class="deal-status pending">{icon('message')}</div>
            <div class="deal-info">
              <div class="title">Подсолнечник · 200 т</div>
              <div class="meta">
                <span>Заявка Q-2041 · опубликована 18.04</span>
                <span class="dot">·</span>
                <span>Целевая цена 27 800 ₽/т</span>
              </div>
            </div>
            <div class="deal-price">7 откликов<small>за 2 дня</small></div>
            <span class="deal-label pending">Сбор откликов</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-primary btn-sm">Посмотреть</a>
            </div>
          </div>

          <div class="deal-row">
            <div class="deal-status active">{icon('message')}</div>
            <div class="deal-info">
              <div class="title">Пшеница 4 класс · 300 т</div>
              <div class="meta">
                <span>Заявка Q-2039 · опубликована 15.04</span>
                <span class="dot">·</span>
                <span>Целевая цена 11 900 ₽/т</span>
              </div>
            </div>
            <div class="deal-price">12 откликов<small>3 подходят</small></div>
            <span class="deal-label active">3 кандидата</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-primary btn-sm">Выбрать</a>
            </div>
          </div>

        </div>
      </div>

      <!-- History (archive) -->
      <div class="account-panel">
        <div class="account-panel-head">
          <h3>История сделок</h3>
          <a href="#" class="btn btn-outline btn-sm">Весь архив {icon('arrow-sm')}</a>
        </div>
        <div class="deals-list">

          <div class="deal-row">
            <div class="deal-status done">✓</div>
            <div class="deal-info">
              <div class="title">Пшеница 3 класс · 150 т</div>
              <div class="meta">
                <span>Сделка №СД-4502</span>
                <span class="dot">·</span>
                <span>Муром</span>
                <span class="dot">·</span>
                <span>Завершена 12.03.2026</span>
              </div>
            </div>
            <div class="deal-price">2 220 000 ₽<small>★ 5.0 · оценено</small></div>
            <span class="deal-label done">Закрыта</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-outline btn-sm">Акты</a>
            </div>
          </div>

          <div class="deal-row">
            <div class="deal-status done">✓</div>
            <div class="deal-info">
              <div class="title">Ячмень кормовой · 60 т</div>
              <div class="meta">
                <span>Сделка №СД-4488</span>
                <span class="dot">·</span>
                <span>Выкса</span>
                <span class="dot">·</span>
                <span>Завершена 28.02.2026</span>
              </div>
            </div>
            <div class="deal-price">780 000 ₽<small>★ 4.9 · оценено</small></div>
            <span class="deal-label done">Закрыта</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-outline btn-sm">Акты</a>
            </div>
          </div>

          <div class="deal-row">
            <div class="deal-status cancelled">✕</div>
            <div class="deal-info">
              <div class="title">Кукуруза · 100 т</div>
              <div class="meta">
                <span>Сделка №СД-4471</span>
                <span class="dot">·</span>
                <span>Рязань</span>
                <span class="dot">·</span>
                <span>Отменена 20.02.2026</span>
              </div>
            </div>
            <div class="deal-price">—<small>возврат на эскроу</small></div>
            <span class="deal-label cancelled">Отменена</span>
            <div class="deal-actions">
              <a href="#" class="btn btn-outline btn-sm">Детали</a>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</section>'''
    return page('Личный кабинет', body, active='',
                description='Личный кабинет Русский Урожай: активные сделки, заявки, история, платежи через эскроу.')


def main():
    pages = {
        'index.html':       build_index(),
        'catalog.html':     build_catalog(),
        'product.html':     build_product(),
        'sale.html':        build_sale(),
        'auction.html':     build_auction(),
        'prices.html':      build_prices(),
        'about.html':       build_about(),
        'how.html':         build_how(),
        'contacts.html':    build_contacts(),
        'account.html':     build_account(),
        'offer.html':       build_offer(),
        'regulations.html': build_regulations(),
        'policy.html':      build_policy(),
        'dispute.html':     build_dispute(),
        '404.html':         build_404(),
    }
    for name, html in pages.items():
        (SITE / name).write_text(html, encoding='utf-8')
        print(f'  ✓ {name}  ({len(html)//1024} KB)')
    print(f'\nBuilt {len(pages)} pages.')


if __name__ == '__main__':
    main()
