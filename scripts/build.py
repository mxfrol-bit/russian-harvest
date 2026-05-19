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
        'max':          '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="11"/><text x="12" y="16" font-family="Arial Black, sans-serif" font-size="11" font-weight="900" fill="#fff" text-anchor="middle">M</text></svg>',
        'verify':       '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="m7.5 10 2 2 3.5-4 1.4 1.4L9.5 15 6 11.4z"/></svg>',
        'buyer':        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16l-1.5 11H5.5z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>',
        'seller':       '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h18v12H3zM7 8V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3"/><path d="M9 12h6"/></svg>',
    }
    return icons.get(name, '')


def quick_request_form():
    """v2.6.30: рабочая форма быстрой заявки.
    На /catalog.html (покупатель) создаёт buyer_request,
    на /sale.html (продавец) создаёт offer. Обработка в main.js
    (window.RH_QuickRequest). Незалогинен -> черновик + модалка входа."""
    return f'''<form class="reverse-form" id="quickRequestForm">
      <input type="text" id="qrCrop" placeholder="Наименование продукта (напр. Пшеница)" list="qrCropList" required />
      <datalist id="qrCropList">
        <option value="Пшеница 3 класс"><option value="Пшеница 4 класс"><option value="Пшеница 5 класс">
        <option value="Пшеница кормовая"><option value="Ячмень кормовой"><option value="Ячмень пивоваренный">
        <option value="Кукуруза"><option value="Подсолнечник"><option value="Рапс"><option value="Соя">
        <option value="Горох"><option value="Овёс"><option value="Рожь"><option value="Гречиха">
      </datalist>
      <input type="text" id="qrRegion" placeholder="Регион (напр. Воронежская область)" list="qrRegionList" required />
      <datalist id="qrRegionList">
        <option value="Нижегородская область"><option value="Московская область"><option value="Воронежская область">
        <option value="Ростовская область"><option value="Краснодарский край"><option value="Ставропольский край">
        <option value="Саратовская область"><option value="Самарская область"><option value="Тульская область">
        <option value="Рязанская область"><option value="Липецкая область"><option value="Тамбовская область">
        <option value="Курская область"><option value="Белгородская область"><option value="Волгоградская область">
      </datalist>
      <input type="number" id="qrVolume" placeholder="Объём партии (т)" min="1" step="1" required />
      <input type="number" id="qrPrice" placeholder="Цена руб/т (необязательно)" min="0" step="100" />
      <button class="submit" type="submit">Отправить заявку {icon('arrow-sm')}</button>
    </form>'''


def header(active=''):
    """Returns the header HTML. active = catalog|sale|about|how|contacts|prices"""
    def nav_item(href, label, key):
        cls = 'active' if active == key else ''
        # v2.6.29: data-nav-role помечает пункты для адаптации по роли.
        # main.js скрывает нерелевантный пункт (покупатель не видит «Продать»).
        role_attr = ''
        if key == 'catalog':
            role_attr = ' data-nav-role="buyer"'
        elif key == 'sale':
            role_attr = ' data-nav-role="seller"'
        return f'<a href="{href}" class="{cls}"{role_attr}>{label}</a>'

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
      <a href="/auction.html" class="nav-item {'active' if active=='auction' else ''}" data-feature="auctions" style="display:none">Аукцион</a>
      <a href="/prices.html" class="nav-item {'active' if active=='prices' else ''}" data-feature="prices" style="display:none">Биржа</a>
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
      <a href="/catalog.html" class="{'active' if active=='catalog' else ''}" data-nav-role="buyer">Купить</a>
      <a href="/sale.html" class="{'active' if active=='sale' else ''}" data-nav-role="seller">Продать</a>
      <a href="/auction.html" class="{'active' if active=='auction' else ''}" data-feature="auctions" style="display:none">Аукцион</a>
      <a href="/prices.html" class="{'active' if active=='prices' else ''}" data-feature="prices" style="display:none">Биржа цен</a>
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
      <p>Растим будущее агробизнеса</p>
    </div>
    <div class="foot-col">
      <h5>О нас</h5>
      <a href="/about.html">О компании</a>
      <a href="/contacts.html">Контакты</a>
    </div>
    <div class="foot-col">
      <h5>Документы</h5>
      <a href="/offer.html">Публичная оферта</a>
      <a href="/regulations.html">Правила торговой площадки</a>
      <a href="/policy.html">Политика конфиденциальности</a>
      <a href="/dispute.html">Регламент разрешения споров</a>
    </div>
    <div class="foot-col">
      <h5>Партнёрам</h5>
      <a href="/sale.html">Продавцам</a>
      <a href="/catalog.html">Покупателям</a>
      <a href="/contacts.html">Реклама и сотрудничество</a>
    </div>
    <div class="foot-col">
      <h5>Контакты</h5>
      <a href="tel:+79300129797">+7 930 012-97-97</a>
      <a href="mailto:support@russian-harvest.ru">support@russian-harvest.ru</a>
      <div class="foot-soc" style="margin-top:8px">
        <a href="https://t.me/tdrusagro" title="Telegram" target="_blank" rel="noopener">{icon('tg')}</a>
        <a href="#" title="VK" target="_blank" rel="noopener">{icon('vk')}</a>
        <a href="https://max.ru" title="MAX" target="_blank" rel="noopener">{icon('max')}</a>
      </div>
    </div>
  </div>
  <div class="foot-bot">
    <span class="c">© 2026 Русский Урожай. Все права защищены</span>
    <span class="foot-role" id="footRole">
      <span class="foot-role-label">Режим: <b id="footRoleName">не выбран</b></span>
      <button type="button" class="foot-role-btn" id="footRoleSwitch">Сменить роль</button>
    </span>
    <span style="font-size:12px;color:var(--slate-400)">Использование сайта означает согласие с Пользовательским соглашением и Политикой конфиденциальности сервиса Русский Урожай</span>
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
      <div class="sd-title">Культуры</div>
      <a class="sd-item" href="/catalog.html?q=пшеница"><div class="sd-ic">🌾</div><div class="sd-main"><div class="sd-lbl">Пшеница</div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/catalog.html?q=ячмень"><div class="sd-ic">🌾</div><div class="sd-main"><div class="sd-lbl">Ячмень</div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/catalog.html?q=кукуруза"><div class="sd-ic">🌽</div><div class="sd-main"><div class="sd-lbl">Кукуруза</div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/catalog.html?q=подсолнечник"><div class="sd-ic">🌻</div><div class="sd-main"><div class="sd-lbl">Подсолнечник</div></div><span class="sd-arrow">→</span></a>
    </div>
    <div class="sd-sec">
      <div class="sd-title">Разделы сайта</div>
      <a class="sd-item" href="/how.html"><div class="sd-ic">🔒</div><div class="sd-main"><div class="sd-lbl">Помощь</div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/about.html"><div class="sd-ic">ℹ️</div><div class="sd-main"><div class="sd-lbl">О компании</div></div><span class="sd-arrow">→</span></a>
      <a class="sd-item" href="/contacts.html"><div class="sd-ic">📞</div><div class="sd-main"><div class="sd-lbl">Контакты</div></div><span class="sd-arrow">→</span></a>
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
    <button class="onb-choice" data-role="seller">
      <div class="onb-choice-ic">{icon('seller')}</div>
      <div class="onb-choice-body">
        <h3>Я хочу продать урожай</h3>
        <p>Покажем заявки покупателей, подскажем рыночную цену и поможем разместить оффер.</p>
        <span class="onb-choice-go">Смотреть заявки {icon('arrow-sm')}</span>
      </div>
    </button>
    <button class="onb-choice" data-role="buyer">
      <div class="onb-choice-ic">{icon('buyer')}</div>
      <div class="onb-choice-body">
        <h3>Я хочу купить урожай</h3>
        <p>Покажем каталог офферов, биржу цен и калькулятор доставки до вашего склада.</p>
        <span class="onb-choice-go">Перейти в каталог {icon('arrow-sm')}</span>
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
    <!-- Demo tab hidden for production -->
    <!--<button class="login-tab demo-tab" data-tab="demo">🔑 Демо</button>-->
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
    def tab(href, label, key, svg, feature=None):
        cls = 'active' if active == key else ''
        attrs = f' data-feature="{feature}" style="display:none"' if feature else ''
        return f'<a href="{href}" class="{cls}"{attrs}>{svg}<span>{label}</span></a>'

    tabbar = f'''<nav class="mobile-tabbar">
      {tab('/index.html', 'Главная', 'home', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></svg>')}
      {tab('/catalog.html', 'Каталог', 'catalog', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>')}
      {tab('/sale.html', 'Продать', 'sale', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5h-3a2.5 2.5 0 0 0 0 5H15"/></svg>')}
      {tab('/auction.html', 'Аукцион', 'auction', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3l7 7-4 4-7-7zM12 11l-7 7 3 3 7-7zM4 22h10"/></svg>', feature='auctions')}
      {tab('/prices.html', 'Биржа', 'prices', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8M17 7h4v4"/></svg>', feature='prices')}
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
<script src="/assets/js/geo-regions.js?v={BUILD_ID}"></script>
<script src="/assets/js/api.js?v={BUILD_ID}"></script>
<script src="/assets/js/main.js?v={BUILD_ID}"></script>
<script src="/assets/js/admin.js?v={BUILD_ID}"></script>
<script src="/assets/js/tour.js?v={BUILD_ID}"></script>
</body>
</html>'''


# ================= CARD COMPONENT =================

def offer_card(data, featured=False):
    """Build one offer card HTML."""
    is_vip = data.get('vip') or data.get('is_premium')
    classes = ['card']
    if is_vip:
        classes.append('card-vip')
    if data.get('archive'):
        classes.append('card-archive')
    cls = ' '.join(classes)

    quality_rows = ''.join(
        f'<div class="q-row">{icon("check")}<span class="k">{k}</span><span class="v">{v}</span></div>'
        for k, v in data.get('quality', {}).items()
    )
    n_q = len(data.get('quality', {}))
    q_word = plural_ru(n_q, ('параметр', 'параметра', 'параметров'))

    cta_label = 'В архиве' if data.get('archive') else 'Купить'

    # Normalize crop category for filtering — supports subclasses
    title = data['title']
    title_lower = title.lower()
    crop_key = 'other'
    if 'Пшеница' in title:
        crop_key = 'wheat'
        if '3 класс' in title: crop_key += ' wheat-3'
        elif '4 класс' in title: crop_key += ' wheat-4'
        elif '5 класс' in title: crop_key += ' wheat-5'
        elif 'кормов' in title_lower: crop_key += ' wheat-feed'
    elif 'Ячмень' in title:
        crop_key = 'barley'
        if 'пивовар' in title_lower: crop_key += ' barley-malt'
        elif 'кормов' in title_lower: crop_key += ' barley-feed'
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

    data_attrs = (
        f'data-offer="{data["id"]}" data-crop="{crop_key}" data-region="{data["region"]}" '
        f'data-price="{price_num}" data-distance="{data["distance_km"]}" '
        f'data-delivery="{has_delivery}" data-vat="{has_vat}" '
        f'data-title="{title}"'
    )

    # Active until — derived (default 30 days from now or use data)
    active_until = data.get('active_until', 'до 31.12.2026')

    # Anonymized seller handle (used as primary identifier)
    seller_handle = data.get('sid', 'A-0000')
    if not seller_handle.startswith(('A-', 'S-')):
        seller_handle = 'S-' + seller_handle.lstrip('AB-')

    archive_label = '<span class="badge archive">В архиве</span>' if data.get('archive') else ''
    vip_label = '<span class="badge vip" style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#3d2900;font-weight:700;letter-spacing:.04em">⭐ VIP</span>' if is_vip else ''

    return f'''<article class="{cls}" {data_attrs}>
  <div class="card-head">
    <div class="card-top">
      <div>
        {vip_label}{archive_label}
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
    <div class="card-meta" style="margin-top:8px">
      <div class="cell"><div class="k">Активно до</div><div class="v">{active_until}</div></div>
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
      <span>ИНН проверен</span>
      <span class="dot"></span>
      <span class="id mono" style="font-family:'JetBrains Mono',monospace">Лот {seller_handle}</span>
    </div>
  </div>
  <div class="card-foot">
    <a class="cta" href="{'#' if data.get('archive') else '/product.html?id=' + str(data.get('id', ''))}">{cta_label} {icon('arrow-sm') if not data.get('archive') else ''}</a>
  </div>
</article>'''


# ================= OFFERS DATA =================

OFFERS = []  # Real data loaded from Supabase via JS

ARCHIVE_OFFERS = []  # Real data loaded from Supabase via JS

# ================= BUYER REQUESTS (Продать) =================
# From the buyer side — what companies are looking for
REQUESTS = []  # Real data loaded from Supabase via JS

ARCHIVE_REQUESTS = []  # Real data loaded from Supabase via JS


def request_card(data):
    """Render a buyer request card (anonymized for sellers)."""
    cls = 'req-card'
    if data.get('archive'):
        cls += ' req-archive'

    archived = '<span class="badge archive">Закрыта</span>' if data.get('archive') else ''
    cta = 'Закрыта' if data.get('archive') else 'Откликнуться'

    # Normalize crop key for filtering — supports subclasses
    title = data['title']
    crop_key = 'other'
    title_lower = title.lower()
    if 'пшениц' in title_lower:
        crop_key = 'wheat'
        if '3 класс' in title_lower: crop_key += ' wheat-3'
        elif '4 класс' in title_lower: crop_key += ' wheat-4'
        elif '5 класс' in title_lower: crop_key += ' wheat-5'
        elif 'кормов' in title_lower: crop_key += ' wheat-feed'
    elif 'ячмен' in title_lower:
        crop_key = 'barley'
        if 'пивовар' in title_lower: crop_key += ' barley-malt'
        elif 'кормов' in title_lower: crop_key += ' barley-feed'
    elif 'кукуруз' in title_lower: crop_key = 'corn'
    elif 'подсолнечник' in title_lower: crop_key = 'sunflower'
    elif 'овёс' in title_lower or 'овес' in title_lower: crop_key = 'oat'
    elif 'рапс' in title_lower: crop_key = 'rapeseed'
    elif 'соя' in title_lower: crop_key = 'soy'
    elif 'горох' in title_lower: crop_key = 'pea'
    elif 'гречих' in title_lower: crop_key = 'buckwheat'

    # Numeric volume for >= comparison
    vol_match = data['volume'].replace(' ', '').replace('т', '').strip()
    try:
        volume_num = int(''.join(c for c in vol_match if c.isdigit())) if vol_match else 0
    except:
        volume_num = 0

    # VAT flag
    vat_str = data.get('vat', '')
    vat_flag = 'yes' if 'с НДС' in vat_str or 'с ндс' in vat_str.lower() else ('no' if 'без' in vat_str.lower() else '')

    # Region for filter (extract from delivery_where like "Нижний Новгород")
    delivery = data['delivery_where']
    region_match = delivery.split(',')[0].strip()

    # Anonymized buyer handle (no PII)
    buyer_handle = data.get('buyer_sid', 'B-0000')
    if not buyer_handle.startswith(('B-', 'A-')):
        buyer_handle = 'B-' + buyer_handle

    data_attrs = (
        f'data-request="{data["id"]}" '
        f'data-crop="{crop_key}" '
        f'data-region="{region_match}" '
        f'data-volume="{volume_num}" '
        f'data-vat="{vat_flag}" '
        f'data-title="{title}"'
    )

    return f'''<article class="{cls}" {data_attrs}>
  <div class="req-card-head">
    <div>
      <div class="req-badges">
        {archived}
        <span class="badge gray mono" style="font-family:'JetBrains Mono',monospace">№ {data['id']}</span>
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
    <div class="cell"><div class="k">Активно до</div><div class="v">{data['needed_by']}</div></div>
  </div>

  <div class="req-meta">
    <span class="item mono" style="color:var(--slate-500);font-family:'JetBrains Mono',monospace">ID {buyer_handle}</span>
  </div>

  <div class="req-foot">
    <span class="req-buyer">{icon('verify')} Покупатель проверен</span>
    <button class="cta" data-action="respond" data-request-id="{data['id']}" {'' if not data.get('archive') else 'disabled'}>{cta} {icon('arrow-sm') if not data.get('archive') else ''}</button>
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
          <span class="k">НДС</span>
          <select name="vat" id="heroVat">
            <option value="">любой</option>
            <option value="with">с НДС</option>
            <option value="without">без НДС</option>
          </select>
        </label>
        <label class="field select-field">
          <span class="k">Объём партии</span>
          <select name="volume" id="heroVolume">
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
        <div class="hero-stat"><div class="n">30 минут</div><div class="l">средний отклик</div></div>
      </div>
    </div>

    <div>
      <div class="focus-wrap" id="focusWrap">
        <div class="focus-head">
          <div>
            <div class="label"><span class="dot"></span>СЕГОДНЯ В ФОКУСЕ</div>
            <div class="title" id="focusTitle">—</div>
          </div>
          <div class="focus-price" id="focusPrice">—</div>
        </div>
        <div class="focus-card">
          <div class="focus-grid">
            <div class="focus-cell"><div class="k">Объём</div><div class="v" id="focusVolume">—</div></div>
            <div class="focus-cell"><div class="k">Урожай</div><div class="v" id="focusYear">—</div></div>
            <div class="focus-cell"><div class="k">Регион</div><div class="v" id="focusRegion">—</div></div>
            <div class="focus-cell"><div class="k">Активно до</div><div class="v" id="focusUntil">—</div></div>
          </div>
          <div class="focus-benefits">
            <div class="h">{icon('check-big')} Ключевые преимущества</div>
            <div class="row">{icon('check')}Прозрачные показатели качества</div>
            <div class="row">{icon('check')}Доступна логистика через платформу</div>
            <div class="row">{icon('check')}Проверенные поставщики</div>
          </div>
          <a class="cta" href="/catalog.html" id="focusCta">Открыть предложение {icon('arrow-sm')}</a>
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
    <!-- Грузится из Supabase: api.listOffers limit=8. См. assets/js/admin.js → syncCatalog -->
    <div class="cards-loading" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--slate-500)">
      <div style="font-size:14px">Загружаем актуальные предложения…</div>
    </div>
  </div>
  <div style="text-align:center;margin-top:28px">
    <a class="btn btn-dark btn-lg" href="/catalog.html">Открыть весь каталог {icon('arrow-sm')}</a>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Среднее время отклика — 30 минут</span>
      <h3>Не нашли подходящее предложение?</h3>
      <p class="lead">Создайте заявку и получите персональные предложения от фермеров и поставщиков по вашим параметрам. 86% заявок закрываются за сутки.</p>
    </div>
    {quick_request_form()}
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
        <p>Платформа ведёт коммуникацию, платформа защищает оплату, а логистика решается в едином окне.</p>
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
        <div class="adv-item">{icon('shield')}<span class="txt"><b>Только проверенные поставщики.</b> Каждого проверяем по ИНН, ОГРН и истории сделок. Контакты раскрываются после подтверждения отклика.</span></div>
        <div class="adv-item">{icon('shield')}<span class="txt"><b>Сопровождение сделки.</b> Менеджер платформы помогает согласовать условия, проверить документы и довести поставку до отгрузки.</span></div>
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


def crop_filter_tree():
    """Дерево культур фильтра — общее для catalog и sale.

    Список согласован с заказчиком (v2.6.9) — это культуры, которые
    реально торгуются на платформе. Без пивоваренного ячменя; только
    самые ходовые подразделы (продовольственная пшеница 3/4 класса +
    кормовая, без 5-го класса; продовольственная гречиха-тёрная +
    татарская скрыты — оставлен только parent «Гречиха» и т.д.).

    UI:
    - Подкатегории по умолчанию свёрнуты (hidden).
    - Кнопка ▾/▴ слева от родителя — раскрывает/скрывает sub-список.
    - Если у родителя нет ходовых подразделов — отображается одна строка
      без кнопки toggle (Кукуруза целая, Рожь, Овёс, Люпин, Гречиха,
      Рапс, Вика, Подсолнечник).
    """
    def row(key, label):
        return f'<label class="filter-check"><input type="checkbox" data-filter="crop" value="{key}"><span>{label}</span><span class="count">0</span></label>'

    def parent_with_subs(parent_key, parent_label, subs):
        """Родитель + кнопка toggle + collapsible <div> со списком sub-чекбоксов."""
        sub_rows = '\n              '.join(row(k, l) for k, l in subs)
        return f'''<div class="crop-row" data-parent="{parent_key}">
              <label class="filter-check filter-check-parent"><input type="checkbox" data-filter="crop" value="{parent_key}"><span>{parent_label}</span><span class="count">0</span></label>
              <button class="crop-toggle" type="button" data-toggle="{parent_key}" aria-expanded="false" aria-label="Развернуть подкатегории">▾</button>
            </div>
            <div class="filter-subitems" data-subitems="{parent_key}" hidden>
              {sub_rows}
            </div>'''

    def parent_only(key, label):
        """Родитель без подкатегорий — обычный чекбокс."""
        return f'<div class="crop-row" data-parent="{key}">{row(key, label)}</div>'

    return '\n            '.join([
        parent_with_subs('wheat', 'Пшеница', [
            ('wheat-3', '— продовольственная, 3 класс'),
            ('wheat-4', '— продовольственная, 4 класс'),
            ('wheat-feed', '— кормовая'),
        ]),
        parent_with_subs('barley', 'Ячмень', [
            ('barley-feed', '— кормовой'),
            ('barley-food', '— продовольственный'),
        ]),
        parent_with_subs('corn', 'Кукуруза', [
            ('corn-crushed', '— дроблёная'),
        ]),
        parent_only('rye', 'Рожь'),
        parent_only('oat', 'Овёс'),
        parent_with_subs('triticale', 'Тритикале', [
            ('triticale-feed', '— кормовое'),
        ]),
        parent_only('buckwheat', 'Гречиха'),
        parent_with_subs('pea', 'Горох', [
            ('pea-feed', '— кормовой'),
            ('pea-food-green', '— продовольственный зелёный'),
        ]),
        parent_with_subs('soy', 'Соя', [
            ('soy-food', '— продовольственная'),
        ]),
        parent_only('lupin', 'Люпин'),
        parent_only('vetch', 'Вика'),
        parent_with_subs('chickpea', 'Нут', [
            ('chickpea-white', '— белый'),
            ('chickpea-red', '— красный'),
        ]),
        parent_with_subs('lentil', 'Чечевица', [
            ('lentil-green', '— зелёная'),
            ('lentil-red', '— красная'),
        ]),
        parent_only('sunflower', 'Подсолнечник'),
        parent_only('rapeseed', 'Рапс'),
        parent_with_subs('mustard', 'Горчица', [
            ('mustard-seeds', '— семена'),
        ]),
        parent_with_subs('coriander', 'Кориандр', [
            ('coriander-fruits', '— плоды'),
        ]),
        parent_with_subs('flax', 'Лён масличный', [
            ('flax-oil', '— семена'),
        ]),
        parent_with_subs('camelina', 'Рыжик', [
            ('camelina-process', '— для переработки'),
        ]),
    ])


def build_catalog():
    # Static fallback: no demo cards. Real offers loaded via syncCatalog() (admin.js).
    cards_html = '''<div class="cards-loading" style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--slate-500)">
      <div style="font-size:14px">Загружаем актуальные предложения…</div>
    </div>'''
    archive_html = ''  # archive section is hidden when empty

    # Crop counts and region counts will be filled by JS from real data.
    # We still need crop_row / region_row helpers for filter sidebar HTML.
    crop_counts = {}  # JS will populate via /rest/v1/rpc and update .count spans
    region_counts = {}
    top_regions = []  # populated by JS calling list_geo_districts

    def crop_row(key, label):
        return f'<label class="filter-check"><input type="checkbox" data-filter="crop" value="{key}"><span>{label}</span><span class="count">0</span></label>'

    def region_row(name, n):
        return f'<label class="filter-check"><input type="checkbox" data-filter="region" value="{name}"><span>{name}</span><span class="count">{n}</span></label>'

    body = f'''<section class="page-hero" data-bg="field">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Купить</span>
    </div>
    <h1>Купить урожай напрямую у фермеров — без посредников и переплат</h1>
    <p>Прямые сделки между фермерами и покупателями. Проверенные поставщики.</p>

    <!-- Поиск по офферам — стиль как на главной -->
    <form class="hero-search" id="catalogHeroSearch" autocomplete="off">
      <label class="field" for="catalogQ">
        <span class="k">Что ищете</span>
        <input id="catalogQ" name="q" type="text" placeholder="Пшеница, ячмень, кукуруза…" autocomplete="off" />
      </label>
      <label class="field select-field">
        <span class="k">Объём партии</span>
        <select name="volume" id="catalogVolume">
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
      <button class="pq" type="button">пшеница 3 класс</button>
      <button class="pq" type="button">кукуруза с НДС</button>
      <button class="pq" type="button">рапс с доставкой</button>
      <button class="pq" type="button">подсолнечник опт</button>
      <button class="pq" type="button">ячмень кормовой</button>
    </div>
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
    <button class="c-chip" data-chip-crop="soy">Соя <span style="opacity:.5">{crop_counts.get('soy',0)}</span></button>
    <button class="c-chip" data-chip-crop="pea">Горох <span style="opacity:.5">{crop_counts.get('pea',0)}</span></button>
    <button class="c-chip" data-chip-crop="buckwheat">Гречиха <span style="opacity:.5">{crop_counts.get('buckwheat',0)}</span></button>
    <button class="c-chip" data-chip-crop="rye">Рожь <span style="opacity:.5">{crop_counts.get('rye',0)}</span></button>
  </div>

  <!-- Mobile filter trigger -->
  <button class="mobile-filter-trigger" id="mobileFilterTrigger">
    {icon('search')} Фильтры <span class="count" id="mobileFilterCount">0</span>
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
            {crop_filter_tree()}
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
          <h4>НДС</h4>
          <div class="filter-checks">
            <label class="filter-check"><input type="checkbox" data-filter="vat" value="with"><span>с НДС</span><span class="count">0</span></label>
            <label class="filter-check"><input type="checkbox" data-filter="vat" value="without"><span>без НДС</span><span class="count">0</span></label>
          </div>
        </div>

        <div class="filter-group">
          <h4>Регионы</h4>
          <div class="filter-checks">
            {''.join(region_row(r, n) for r, n in top_regions)}
          </div>
        </div>

      </div>

      <div class="filter-apply-bar">
        <div class="count">Найдено: <strong id="filterCount">0</strong> предложений</div>
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
                <option value="distance">По удалённости (ближайшие сверху)</option>
                <option value="price-asc">Цена: по возрастанию</option>
                <option value="price-desc">Цена: по убыванию</option>
                <option value="new">Новые сверху</option>
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
      <span class="mono" style="color:var(--slate-400);font-size:12px" id="archiveCount">0 записей</span>
    </div>
    <div class="cards-grid">
      {archive_html}
    </div>
  </div>

</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Среднее время отклика — 30 минут</span>
      <h3>Не нашли нужную партию?</h3>
      <p class="lead">Разместите обратную заявку — поставщики сами предложат условия по вашим параметрам.</p>
    </div>
    {quick_request_form()}
  </div>
</section>'''
    return page('Купить · Каталог', body, active='catalog',
                description='Каталог предложений от фермеров: пшеница, ячмень, кукуруза, подсолнечник, рапс. Прямые сделки без посредников.')


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

      <!-- Quality section — loaded dynamically from DB offer -->
      <div class="product-quality" id="productQuality" style="display:none">
        <h3>{icon('check-big')} Показатели качества</h3>
        <div class="list" id="productQualityList"></div>
      </div>

      <div class="product-section">
        <h3>Условия</h3>
        <p>Условия отгрузки и доставки обсуждаются при оформлении сделки. Самовывоз возможен.</p>
      </div>

      <div class="product-section">
        <h3>Документы</h3>
        <p>Поставщик предоставляет: договор поставки, УПД, ТТН, сертификат качества, паспорт на партию.</p>
      </div>
    </div>

    <aside class="product-aside">
      <div class="buy-card">
        <div class="price">{base_price:,} <span class="unit">₽/т</span></div>
        <span class="vat">с НДС 10%</span>

        <div class="actions">
          <button class="btn btn-primary btn-block" data-action="buy" data-delivery="0" data-offer-id="demo">Купить {icon('arrow-sm')}</button>
          <button class="btn btn-ghost btn-block" data-action="propose" data-offer-id="demo">Сделать ценовое предложение</button>
        </div>

        <div class="divider"></div>

        <div class="supplier-block">
          <div style="font-size:11.5px;font-weight:700;color:var(--slate-500);text-transform:uppercase;letter-spacing:.1em">Гарантия платформы</div>
          <span class="supplier-verify verify" style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:var(--brand);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;align-self:flex-start">
            <span class="bc" style="width:20px;height:20px;border-radius:50%;background:#fff;display:grid;place-items:center;color:var(--brand)">{icon('verify')}</span>
            Поставщик проверен
          </span>
          <div class="info">
            <span>ИНН проверен</span>
            <span style="color:var(--slate-300)">·</span>
            <span>Модерация товара</span>
          </div>
          <div style="font-size:12px;color:var(--slate-500);line-height:1.5;margin-top:6px">Контакты поставщика раскрываются после подтверждения отклика зарегистрированным пользователям.</div>
        </div>

        <div class="escrow" style="display:none">
          {icon('lock')}
          <p><b style="color:var(--ink)">Сопровождение сделки.</b> Менеджер платформы помогает довести сделку до отгрузки.</p>
        </div>
      </div>
    </aside>

  </div>
</section>

<!-- Mobile sticky bottom -->
<div class="mobile-bottom-bar">
  <div style="flex:1">
    <div style="font-size:12px;color:var(--slate-500);font-weight:600">{base_price:,} ₽/т</div>
    <div style="font-size:11px;color:var(--slate-400)">с НДС</div>
  </div>
  <a class="btn btn-outline btn-sm" href="#">Чат</a>
  <a class="btn btn-primary btn-sm" href="#">Купить</a>
</div>'''
    return page('Пшеница 3 класс · 14 200 ₽/т', body, active='catalog',
                description='Пшеница 3 класс, 120 тонн, урожай 2025 · Балаково, 539,4 км до Нижнего Новгорода. Протеин 12,8%, клейковина 26%. 14 200 ₽/т + доставка 1 800 ₽/т.')


def build_sale():
    # Static fallback: no demo cards. Real requests loaded via syncSale() (admin.js).
    requests_html = '''<div class="cards-loading" style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--slate-500)">
      <div style="font-size:14px">Загружаем актуальные заявки покупателей…</div>
    </div>'''
    arch_requests_html = ''

    # Crop/region counts will be populated by JS from real data.
    crop_counts = {}
    region_counts = {}
    top_regions = []

    def crop_row(key, label):
        n = crop_counts.get(key, 0)
        return f'<label class="filter-check"><input type="checkbox" data-filter="crop" value="{key}"><span>{label}</span><span class="count">{n}</span></label>'

    def region_row(name, n):
        return f'<label class="filter-check"><input type="checkbox" data-filter="region" value="{name}"><span>{name}</span><span class="count">{n}</span></label>'

    body = f'''<section class="page-hero" data-bg="harvest">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>Продать</span>
    </div>
    <h1>Продавайте урожай напрямую покупателям — быстро, выгодно и надёжно</h1>
    <p>Получайте заявки от проверенных компаний и заключайте выгодные сделки.</p>

    <!-- Поиск по заявкам — стиль как на главной/каталоге -->
    <form class="hero-search" id="saleHeroSearch" autocomplete="off">
      <label class="field" for="saleQ">
        <span class="k">Что ищете</span>
        <input id="saleQ" name="q" type="text" placeholder="Пшеница, ячмень, кукуруза…" autocomplete="off" />
      </label>
      <label class="field select-field">
        <span class="k">Объём партии</span>
        <select name="volume" id="saleVolume">
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
      <button class="pq" type="button">пшеница 3 класс</button>
      <button class="pq" type="button">кукуруза с НДС</button>
      <button class="pq" type="button">рапс с доставкой</button>
      <button class="pq" type="button">подсолнечник опт</button>
      <button class="pq" type="button">ячмень кормовой</button>
    </div>
  </div>
</section>

<section class="section">

  <!-- Quick crop chips (top of content) -->
  <div class="catalog-chips" style="margin-bottom:20px">
    <button class="c-chip active" data-chip-crop="all">Все запросы</button>
    <button class="c-chip" data-chip-crop="wheat">Пшеница <span style="opacity:.5">{crop_counts.get('wheat',0)}</span></button>
    <button class="c-chip" data-chip-crop="barley">Ячмень <span style="opacity:.5">{crop_counts.get('barley',0)}</span></button>
    <button class="c-chip" data-chip-crop="corn">Кукуруза <span style="opacity:.5">{crop_counts.get('corn',0)}</span></button>
    <button class="c-chip" data-chip-crop="sunflower">Подсолнечник <span style="opacity:.5">{crop_counts.get('sunflower',0)}</span></button>
    <button class="c-chip" data-chip-crop="rapeseed">Рапс <span style="opacity:.5">{crop_counts.get('rapeseed',0)}</span></button>
    <button class="c-chip" data-chip-crop="oat">Овёс <span style="opacity:.5">{crop_counts.get('oat',0)}</span></button>
    <button class="c-chip" data-chip-crop="soy">Соя <span style="opacity:.5">{crop_counts.get('soy',0)}</span></button>
    <button class="c-chip" data-chip-crop="pea">Горох <span style="opacity:.5">{crop_counts.get('pea',0)}</span></button>
    <button class="c-chip" data-chip-crop="buckwheat">Гречиха <span style="opacity:.5">{crop_counts.get('buckwheat',0)}</span></button>
    <button class="c-chip" data-chip-crop="rye">Рожь <span style="opacity:.5">{crop_counts.get('rye',0)}</span></button>
  </div>

  <!-- Mobile filter trigger -->
  <button class="mobile-filter-trigger" id="mobileFilterTrigger">
    {icon('search')} Фильтры <span class="count" id="mobileFilterCount">0</span>
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
            {crop_filter_tree()}
          </div>
        </div>

        <div class="filter-group">
          <h4>Цена покупателя, ₽/т</h4>
          <div class="filter-range">
            <input type="number" placeholder="от" id="priceMin" />
            <input type="number" placeholder="до" id="priceMax" />
          </div>
        </div>

        <div class="filter-group">
          <h4>Минимальный объём</h4>
          <div class="filter-range">
            <input type="number" placeholder="от тонн" id="volumeMin" />
          </div>
        </div>

        <div class="filter-group">
          <h4>НДС</h4>
          <div class="filter-checks">
            <label class="filter-check"><input type="checkbox" data-filter="vat" value="with"><span>с НДС</span><span class="count">0</span></label>
            <label class="filter-check"><input type="checkbox" data-filter="vat" value="without"><span>без НДС</span><span class="count">0</span></label>
          </div>
        </div>

        <div class="filter-group">
          <h4>Регионы доставки</h4>
          <div class="filter-checks">
            {''.join(region_row(r, n) for r, n in top_regions)}
          </div>
        </div>

      </div>

      <div class="filter-apply-bar">
        <div class="count">Найдено: <strong id="filterCount">0</strong> заявок</div>
      </div>
    </aside>

    <!-- Main grid -->
    <div class="catalog-main">
      <div class="catalog-head" style="margin-bottom:18px">
        <div class="top-row">
          <div class="view-tools" style="margin-left:auto">
            <div class="view-toggle" data-target="reqsGrid">
              <button class="active" data-view="grid" title="Сетка">{icon('grid')}<span>Сетка</span></button>
              <button data-view="list" title="Список">{icon('list')}<span>Список</span></button>
            </div>
            <div class="sort-select">
              <select id="sortSelect">
                <option value="distance">По удалённости (ближайшие сверху)</option>
                <option value="price-desc">Цена: по убыванию</option>
                <option value="price-asc">Цена: по возрастанию</option>
                <option value="volume-desc">Объём: по убыванию</option>
                <option value="new">Новые сверху</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="req-grid cards-grid" id="reqsGrid">
        {requests_html}
      </div>

      <div id="emptyFilterResult" class="empty-panel" style="display:none;background:var(--paper);border-radius:var(--radius-xl);margin-top:24px">
        <div class="ic">{icon('search-lg')}</div>
        <h4>По фильтрам ничего не найдено</h4>
        <p>Попробуйте снять часть условий или расширить диапазон цены / объёма.</p>
        <button class="btn btn-outline" onclick="document.getElementById('filtersReset').click()">Сбросить фильтры</button>
      </div>
    </div>

  </div>

  <!-- Archive section -->
  <div class="archive-section">
    <div class="archive-head">
      <div>
        <h2>Архив заявок</h2>
        <p>Закрытые заявки покупателей — для понимания исторических цен и трендов спроса.</p>
      </div>
      <span class="mono" style="color:var(--slate-400);font-size:12px" id="archiveCount">0 записей</span>
    </div>
    <div class="req-grid cards-grid">
      {arch_requests_html}
    </div>
  </div>

</section>

<section class="section" style="padding-top:0">
  <div class="reverse-card">
    <div>
      <span class="reverse-chip">{icon('clock')} Среднее время отклика — 30 минут</span>
      <h3>Не нашли подходящее предложение?</h3>
      <p class="lead">Создайте заявку и получите персональные предложения от фермеров и поставщиков по вашим параметрам. 86% заявок закрываются за сутки.</p>
    </div>
    {quick_request_form()}
  </div>
</section>

<!-- Contacts section copied from production catalog -->
<section class="section" style="padding-top:0">
  <div class="contacts-grid">
    <a class="contact-card" href="/contacts.html">
      <div class="ic">{icon('message')}</div>
      <h4>Задать вопрос</h4>
      <p>Получите ответ в течение нескольких минут через форму обратной связи</p>
      <span class="link-cta">Открыть {icon('arrow-sm')}</span>
    </a>
    <a class="contact-card" href="tel:+79300129797">
      <div class="ic">{icon('phone')}</div>
      <h4>Позвонить</h4>
      <p>+7 930 012-97-97</p>
      <span class="link-cta">Позвонить {icon('arrow-sm')}</span>
    </a>
  </div>
</section>'''
    return page('Продать · Заявки покупателей', body, active='sale',
                description='Актуальные заявки покупателей на сельхозпродукцию. Откликайтесь напрямую и продавайте без посредников.')



def build_about():
    body = f'''<section class="page-hero" data-bg="company">
  <div class="page-hero-inner">
    <div class="breadcrumb">
      <a href="/index.html">Главная</a>
      <span class="sep">/</span>
      <span>О компании</span>
    </div>
    <h1>О компании</h1>
    <p>«Русский Урожай» — это онлайн-платформа, которая помогает производителям сельхозпродукции и покупателям заключать сделки напрямую, без посредников и переплат.</p>
    <p>Мы делаем рынок прозрачным, а взаимодействие между сторонами — быстрым, удобным и безопасным.</p>

    <!-- Стат-блок прямо в hero -->
    <div class="hero-stats">
      <div class="hero-stat"><div class="num">450+</div><div class="lbl">проверенных поставщиков</div></div>
      <div class="hero-stat"><div class="num">9</div><div class="lbl">основных культур</div></div>
      <div class="hero-stat"><div class="num">30 мин</div><div class="lbl">средний отклик</div></div>
      <div class="hero-stat"><div class="num">24/7</div><div class="lbl">приём заявок</div></div>
    </div>
  </div>
</section>

<section class="section">
  <span class="eyebrow">{icon('sparkles')} Для кого мы работаем</span>

  <div class="about-targets">
    <div class="target-card">
      <div class="target-card-head">
        <div class="ic-big">{icon('tractor')}</div>
        <div>
          <h4>Для фермеров и агрохозяйств</h4>
          <p>Которые хотят продать урожай по справедливой цене</p>
        </div>
      </div>
      <a class="btn btn-primary" href="/sale.html">Разместить товар {icon('arrow-sm')}</a>
    </div>
    <div class="target-card">
      <div class="target-card-head">
        <div class="ic-big">{icon('buyer')}</div>
        <div>
          <h4>Для покупателей</h4>
          <p>Которые ищут надёжных поставщиков без длинных цепочек поставок</p>
        </div>
      </div>
      <a class="btn btn-primary" href="/catalog.html">Найти поставщика {icon('arrow-sm')}</a>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <span class="eyebrow">{icon('sparkles')} Наши принципы</span>

  <div class="principle-grid">
    <div class="principle">
      <div class="principle-num">01</div>
      <h4>Прозрачность</h4>
      <p>Каждое предложение содержит реальные параметры качества, объём, регион. Никаких скрытых наценок и серых сделок.</p>
    </div>
    <div class="principle">
      <div class="principle-num">02</div>
      <h4>Прямой контакт</h4>
      <p>Покупатель и продавец работают друг с другом напрямую. Платформа берёт на себя только сопровождение сделки.</p>
    </div>
    <div class="principle">
      <div class="principle-num">03</div>
      <h4>Проверенные участники</h4>
      <p>Все поставщики проходят базовую верификацию по ИНН, ОГРН и реквизитам. На карточках видно сколько сделок уже закрыто.</p>
    </div>
    <div class="principle">
      <div class="principle-num">04</div>
      <h4>Локальный фокус</h4>
      <p>Мы стартуем с Нижегородской области и ПФО — региона, где знаем каждое хозяйство и где сильна логистика по прямым маршрутам.</p>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="how-section">
    <div class="how-section-head">
      <span class="eyebrow">{icon('sparkles')} Как это работает</span>
      <h2 class="h2">Четыре шага от объявления до сделки</h2>
      <p class="section-lead">Платформа помогает на каждом этапе: от размещения объявления до завершения сделки, обеспечивая прозрачность и безопасность для всех участников.</p>
    </div>
    <div class="steps-grid steps-grid-4">
      <div class="step">
        <div class="ic-wrap">1</div>
        <h4>Размещение товара</h4>
        <p>Продавцы размещают свои товары на платформе с описанием и ценой</p>
      </div>
      <div class="step">
        <div class="ic-wrap">2</div>
        <h4>Поиск и отклики</h4>
        <p>Покупатели оставляют заявки на покупку или откликаются на предложения</p>
      </div>
      <div class="step">
        <div class="ic-wrap">3</div>
        <h4>Согласование условий</h4>
        <p>Стороны согласовывают детали сделки: объем, цену, сроки, доставку</p>
      </div>
      <div class="step">
        <div class="ic-wrap">4</div>
        <h4>Сопровождение сделки</h4>
        <p>Платформа сопровождает процесс до получения оплаты или отгрузки</p>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <span class="eyebrow">{icon('sparkles')} Мы обеспечиваем</span>

  <div class="guarantees">
    <div class="guarantee">
      <div class="ic">{icon('check-big')}</div>
      <h5>Проверку контрагентов</h5>
    </div>
    <div class="guarantee">
      <div class="ic">{icon('check-big')}</div>
      <h5>Поддержку на всех этапах сделки</h5>
    </div>
    <div class="guarantee">
      <div class="ic">{icon('check-big')}</div>
      <h5>Контроль документации</h5>
    </div>
    <div class="guarantee">
      <div class="ic">{icon('check-big')}</div>
      <h5>Возможность расчётов и логистики через сервис (опционально)</h5>
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
    body = f'''<section class="page-hero" data-bg="field">
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
          <li>Изучите карточку продавца и его профиль</li>
          <li>Сравните предложения по цене и условиям доставки</li>
        </ul>
      </div>

      <div class="help-block-section">
        <h4>Как оформить покупку</h4>
        <ul>
          <li>Оставьте заявку или свяжитесь с продавцом через чат платформы</li>
          <li>Согласуйте условия сделки: объём, цену, сроки</li>
          
          <li>Получите товар и подтвердите выполнение</li>
        </ul>
      </div>

      <div class="help-block-section">
        <h4>Гарантии и безопасность</h4>
        <ul>
          <li>Все продавцы проходят проверку платформы</li>
          
          <li>Поддержка на всех этапах сделки</li>
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
    body = f'''<section class="page-hero" data-bg="company">
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
        ('p', 'Платформа предоставляет Пользователям техническую возможность размещать предложения, откликаться на заявки, обмениваться сообщениями и осуществлять расчёты с использованием безопасного счёта.'),
        ('h2', '3. Обязанности платформы'),
        ('ul', [
            'Обеспечивать работу сервиса в режиме 24/7 с плановыми техническими перерывами.',
            'Проверять Пользователей при прохождении процедуры верификации.',
            'Сопровождать сделки с использованием безопасного счёта.',
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
            'Данные контрагента (реквизиты, контакты) раскрываются только после подтверждения сделки и резервирования средств на безопасном счёте.',
            'Запрещены попытки обхода Платформы с целью заключения сделки напрямую без оплаты комиссии.',
        ]),
        ('h2', '4. Безопасные расчёты'),
        ('p', 'Все финансовые расчёты между сторонами осуществляются через платформу-счёт, открытый в партнёрском банке Платформы. Деньги резервируются на счёте в момент согласования сделки и переводятся Поставщику после подтверждения приёмки партии Покупателем. При возникновении спора средства остаются на безопасном счёте до вынесения решения арбитражной комиссией Платформы.'),
        ('h2', '5. Рейтинг и репутация'),
        ('p', 'По итогам каждой сделки стороны оценивают друг друга по 5-балльной шкале. Рейтинг поставщика влияет на позицию его предложений в выдаче и уровень комиссии.'),
        ('h2', '6. Комиссия платформы'),
        ('p', 'Комиссия Платформы составляет от 0,5% до 2% от суммы сделки в зависимости от объёма и рейтинга Поставщика. Комиссия удерживается автоматически при переводе средств с безопасного счёта.'),
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
            'Средства с безопасного счёта переводятся Поставщику в полном объёме.',
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
      <p class="section-lead">Цены определяются рынком. Все поставщики проверены, безопасная сделка оплаты.</p>
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
                description='Онлайн-аукционы сельхозпродукции. Живые торги, прозрачные ставки, безопасная сделка сделки.')


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
          <div class="k">Баланс</div>
          <div class="v" id="accBalance">0<small>₽</small></div>
        </div>
      </div>

      <nav class="account-nav">
        <a href="#" class="active">{icon('chart')}<span>Обзор</span></a>
        <a href="#">{icon('handshake')}<span>Мои сделки</span><span class="badge-num" id="sideDeals">0</span></a>
        <a href="#">{icon('message')}<span>Заявки</span><span class="badge-num" id="sideRequests">0</span></a>
        <a href="#">{icon('mail')}<span>Чаты</span><span class="badge-num" id="sideChats">0</span></a>
        <a href="#">{icon('seller')}<span>Избранное</span><span class="badge-num" id="sideFavorites">0</span></a>
        <a href="#">{icon('calendar')}<span>История</span></a>
        <a href="#">{icon('user')}<span>Профиль компании</span></a>
        <a href="#">{icon('coins')}<span>Платежи</span></a>
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
          <p id="accSubtitle">Вот что происходит по вашим сделкам сегодня. Среднее время отклика поставщиков — 30 минут.</p>
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
            <div class="k">Сделок в работе</div>
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
          <a href="#" class="btn btn-outline">{icon('message')} Все заявки</a>
          <a href="#" class="btn btn-outline">💬 Чаты платформы</a>
          <a href="#" class="btn btn-outline">{icon('alert')} Споры и жалобы</a>
          <a href="#" class="btn btn-outline">{icon('chart')} Аналитика</a>
          <a href="#" class="btn btn-outline">{icon('info')} Настройки платформы</a>
        </div>

        <!-- Version footer (populated by admin.js from RH_CONFIG.CHANGELOG) -->
        <div id="adminVersionFooter" style="margin-top:18px;padding:14px 16px;background:rgba(0,0,0,.04);border-radius:10px;font-size:12px;color:var(--slate-600);display:flex;justify-content:space-between;align-items:center;cursor:pointer">
          <span>📦 <b>Версия платформы:</b> <span id="adminVersionTag">—</span> · <span id="adminVersionDate">—</span></span>
          <span style="font-size:11px;color:var(--brand-dark)">Журнал релизов →</span>
        </div>
      </div>

      <!-- KPI stats — values populated by admin.js from real DB -->
      <div class="account-stats">
        <div class="account-stat">
          <div class="k">Активных сделок</div>
          <div class="v" id="userActiveDeals">0</div>
          <div class="d up" id="userActiveDealsHint" style="opacity:.5">нет данных</div>
        </div>
        <div class="account-stat">
          <div class="k">Ожидают отклика</div>
          <div class="v" id="userPendingDeals">0</div>
          <div class="d" id="userPendingDealsHint" style="color:var(--orange-dark);opacity:.5">нет данных</div>
        </div>
        <div class="account-stat">
          <div class="k">Закрыто всего</div>
          <div class="v" id="userCompletedDeals">0</div>
          <div class="d up" id="userCompletedDealsHint" style="opacity:.5">нет данных</div>
        </div>
        <div class="account-stat">
          <div class="k">Оборот · 2026</div>
          <div class="v" id="userTurnover" style="font-size:20px">0 <small style="font-size:14px;color:var(--slate-500);font-family:Manrope">₽</small></div>
          <div class="d up" id="userTurnoverHint" style="opacity:.5">нет данных</div>
        </div>
      </div>

      <!-- Active deals — populated dynamically -->
      <div class="account-panel">
        <div class="account-panel-head">
          <h3>Активные сделки</h3>
          <a href="/catalog.html" class="btn btn-outline btn-sm">Найти поставщика {icon('arrow-sm')}</a>
        </div>
        <div class="deals-list" id="activeDealsList">
          <div class="empty-state" style="padding:40px 20px;text-align:center;color:var(--slate-500)">
            <div style="font-size:42px;opacity:.4;margin-bottom:10px">📦</div>
            <h4 style="font-size:15px;color:var(--ink);margin-bottom:6px">Нет активных сделок</h4>
            <p style="font-size:13px;max-width:340px;margin:0 auto 14px">Найдите поставщика в каталоге или разместите заявку — все ваши сделки появятся здесь.</p>
            <a href="/catalog.html" class="btn btn-primary btn-sm">Открыть каталог</a>
          </div>
        </div>
      </div>

      <!-- Active negotiation threads (no deal yet) — populated dynamically -->
      <div class="account-panel">
        <div class="account-panel-head">
          <h3>Активные переговоры</h3>
          <span style="font-size:12px;color:var(--slate-500)">До оформления сделки. Реквизиты компаний скрыты.</span>
        </div>
        <div class="deals-list" id="threadsList">
          <div class="empty-state" style="padding:30px 20px;text-align:center;color:var(--slate-500)">
            <div style="font-size:36px;opacity:.4;margin-bottom:8px">💬</div>
            <p style="font-size:13px">Активных чатов нет. Откликнитесь на оффер или заявку — переговоры появятся здесь.</p>
          </div>
        </div>
      </div>

      <!-- Open requests — populated dynamically -->
      <div class="account-panel">
        <div class="account-panel-head">
          <h3 id="openRequestsTitle">Ваши заявки на закупку</h3>
          <button class="btn btn-outline btn-sm" id="createRequestBtn">Создать заявку {icon('arrow-sm')}</button>
        </div>
        <div class="deals-list" id="openRequestsList">
          <div class="empty-state" style="padding:30px 20px;text-align:center;color:var(--slate-500)">
            <div style="font-size:36px;opacity:.4;margin-bottom:8px">💬</div>
            <p style="font-size:13px">У вас пока нет активных заявок. Разместите первую — поставщики откликнутся.</p>
          </div>
        </div>
      </div>

      <!-- My offers (only for sellers) -->
      <div class="account-panel" id="myOffersPanel" style="display:none">
        <div class="account-panel-head">
          <h3>Мои офферы</h3>
          <button class="btn btn-primary btn-sm" id="createOfferBtn2">+ Разместить оффер</button>
        </div>
        <div class="deals-list" id="myOffersList">
          <div class="empty-state" style="padding:30px 20px;text-align:center;color:var(--slate-500)">
            <p style="font-size:13px">Вы ещё не разместили ни одного оффера.</p>
          </div>
        </div>
      </div>

      <!-- History — populated dynamically -->
      <div class="account-panel">
        <div class="account-panel-head">
          <h3>История сделок</h3>
        </div>
        <div class="deals-list" id="historyDealsList">
          <div class="empty-state" style="padding:30px 20px;text-align:center;color:var(--slate-500)">
            <p style="font-size:13px;opacity:.7">История появится после первой завершённой сделки.</p>
          </div>
        </div>
      </div>

      <!-- (rest of old sections removed and replaced above) -->

    </div>
  </div>
</section>'''
    return page('Личный кабинет', body, active='',
                description='Личный кабинет Русский Урожай: активные сделки, заявки, история, платежи через платформу.')


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
