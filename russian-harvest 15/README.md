# 🌾 Русский Урожай

Онлайн-платформа для прямых сделок между фермерами и покупателями сельхозпродукции.

> Современная B2B-платформа для закупки и продажи зерна, масличных и крупяных культур. Прямые сделки, эскроу-защита, прозрачные показатели качества, расстояние и стоимость доставки — всё рассчитано автоматически.

---

## 📦 Что внутри

- **13 страниц:** главная, каталог (30 офферов + архив), карточка товара, продать (30 заявок + архив), о компании, помощь, контакты, личный кабинет, 4 юридические страницы, 404.
- **Статическая сборка:** билдер на Python генерирует готовые HTML, которые можно хостить где угодно.
- **Demo-режим по умолчанию:** работает без бекенда — все API-запросы идут в локальный мок.
- **Production-ready:** конфиги для Netlify, Vercel, Docker/Nginx, GitHub Actions.

---

## 🚀 Быстрый старт

### Требования

- **Python 3.9+** (для билдера)
- **Node.js 18+** (опционально, для dev-тулзов)

### Запуск локально

```bash
# 1. Клонируйте репо
git clone https://github.com/your-org/russian-harvest.git
cd russian-harvest

# 2. Соберите сайт
python3 scripts/build.py

# 3. Запустите локальный сервер
python3 -m http.server 8080 --directory site

# 4. Откройте http://localhost:8080
```

Или одной командой через npm-скрипт:

```bash
npm run build && npm run dev
```

---

## 🌐 Деплой

### Netlify (рекомендуется)

1. Подключите репозиторий к Netlify — конфиг `netlify.toml` подхватится автоматически.
2. Build command: `python3 scripts/build.py`
3. Publish directory: `site`

Либо через CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=site
```

### Railway 🚂

Готова конфигурация для Railway через **Nixpacks + Caddy**:

1. Подключите репо в Railway Dashboard → `Deploy from GitHub repo`
2. Railway подхватит `railway.json` + `nixpacks.toml` + `Caddyfile` автоматически
3. `Settings` → `Networking` → `Generate Domain`

Подробная инструкция: **[`docs/RAILWAY.md`](docs/RAILWAY.md)**

### Vercel

1. Import Project → указать репозиторий.
2. Framework preset: **Other** (или **Static Site**).
3. Конфиг `vercel.json` настроит clean URLs и заголовки автоматически.

### Docker / свой сервер

```bash
# Собрать образ
docker build -t russian-harvest .

# Запустить на порту 80
docker run -d -p 80:80 --name rh russian-harvest
```

Или без Docker, с обычным Nginx:

```bash
python3 scripts/build.py
cp scripts/nginx.conf /etc/nginx/conf.d/russian-harvest.conf
cp -r site/* /var/www/russian-harvest/
sudo systemctl reload nginx
```

### GitHub Actions (CI/CD)

В `.github/workflows/deploy.yml` настроен автоматический билд и деплой на Netlify при push в `main`. Нужно добавить в секреты репозитория:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

---

## 🔌 Подключение бекенда

Сайт работает в двух режимах:

### DEMO (по умолчанию)

`window.RH_CONFIG.API_BASE_URL = null` в файле `site/assets/js/config.js`. Все API-вызовы идут в локальный мок (см. `assets/js/api.js`). Не требует сервера.

**Тестовый код входа:** `12345`.

### PRODUCTION

Отредактируйте `site/assets/js/config.js`:

```js
window.RH_CONFIG = {
  API_BASE_URL: 'https://api.russian-harvest.ru/v1',
  MAPS_API_KEY: 'your-yandex-maps-key',
  YANDEX_METRIKA_ID: 12345678,
  // ...
};
```

Ваш бекенд должен реализовать эндпоинты по контракту из `docs/API.md`.

---

## 🏗️ Архитектура

```
russian-harvest/
├── scripts/
│   ├── build.py           # ← Генератор всех HTML-страниц из шаблонов
│   └── nginx.conf         # ← Production Nginx config
├── site/                  # ← Результат сборки (публикуется)
│   ├── index.html
│   ├── catalog.html
│   ├── product.html
│   ├── sale.html
│   ├── account.html
│   ├── about.html / how.html / contacts.html
│   ├── offer.html / regulations.html / policy.html / dispute.html
│   ├── 404.html
│   ├── robots.txt
│   ├── sitemap.xml
│   └── assets/
│       ├── css/main.css   # Дизайн-система (~75 KB)
│       ├── js/config.js   # Конфигурация (API URL и т.д.)
│       ├── js/api.js      # API-клиент + demo-заглушки
│       ├── js/main.js     # Поведение: поиск, фильтры, модалки
│       └── img/logo.png   # Fallback logo
├── docs/
│   └── API.md             # Контракт API для бекенда
├── .github/workflows/
│   └── deploy.yml         # GitHub Actions: build + deploy
├── netlify.toml
├── vercel.json
├── Dockerfile
├── package.json
└── README.md
```

### Как работает билдер

`scripts/build.py` — единый скрипт-генератор. В нём:

- **30 карточек офферов** с реалистичными данными по 30 регионам России
- **6 архивных** (проданных) офферов
- **30 заявок от покупателей** в разделе «Продать»
- **6 архивных заявок**
- Общие компоненты: шапка, футер, модалка onboarding, модалка логина, overlay поиска
- 13 функций `build_*()` — по одной на страницу
- Обновить данные → перезапустить `python3 scripts/build.py` → сайт пересобран

---

## 🎨 Дизайн-система

- **Шрифты:** Manrope + JetBrains Mono (цифры/ID)
- **Цвета:**
  - Зелёный: `#8BC34A` (акценты)
  - Emerald: `#10B981` (primary)
  - Оранжевый: `#F5A623` (бейдж «Поставщик проверен»)
  - Тёмный: `#0F172A` (геро, featured-карточки)
- **Скругления:** 14/20/28/36 px
- **Тени:** три уровня (sm/md/lg)

Всё в одном файле: `site/assets/css/main.css`.

---

## 📝 Контент

### Добавить новый оффер

Открыть `scripts/build.py`, найти массив `OFFERS`, добавить элемент:

```python
{
  'id': 30,
  'title': 'Пшеница 3 класс',
  'price': '14 500',
  'vat': 'с НДС 10%',
  'volume': '200 т',
  'harvest': '2025',
  'region': 'Ваш регион',
  'distance_km': 150,
  'delivery_cost': 700,
  'badge': 'Новый',
  'quality': {'Протеин': '12 %', 'Влажность': '13 %'},
  'rating': '4.8',
  'deals_count': 22,
  'sid': 'A-0000',
  'delivery': 'Доставка 700 ₽/т'
},
```

Запустить `python3 scripts/build.py` — сайт пересобран.

---

## 🔒 Безопасность

Все production-конфиги включают базовые защитные заголовки:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` с whitelist источников
- `Permissions-Policy` блокирует камеру/микрофон

---

## 📞 Поддержка

- Телефон: [+7 930 012-97-97](tel:+79300129797)
- Email: [support@russian-harvest.ru](mailto:support@russian-harvest.ru)
- Telegram: [@tdrusagro](https://t.me/tdrusagro)

---

## 📄 Лицензия

© 2026 ИП Фролов Владимир Андреевич (ОГРНИП 325330000052515). Все права защищены.
