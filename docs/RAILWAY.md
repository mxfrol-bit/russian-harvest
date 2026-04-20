# 🚂 Деплой на Railway

Пошаговая инструкция для публикации «Русского Урожая» на [Railway](https://railway.com).

---

## Как Railway определяет билдер

Railway выбирает билдер в таком порядке приоритета:

1. **Dockerfile** — если в репозитории есть `Dockerfile`, использует его (рекомендуется ✅)
2. **Nixpacks** — если есть `nixpacks.toml`
3. **Railpack** — автоопределение (для известных фреймворков)

**В этом репо есть `Dockerfile`**, поэтому Railway будет билдить через Docker — **это и рекомендуется** (предсказуемо, работает на любой платформе, одинаково везде).

## Что делает наш Dockerfile

**Stage 1** (builder):
- Базовый образ: `python:3.11-slim`
- Копирует `scripts/` и `site/` в `/app/`
- Запускает `python3 scripts/build.py` → генерирует 13 HTML файлов в `/app/site/`

**Stage 2** (runtime):
- Базовый образ: `caddy:2-alpine` (~15 MB)
- Копирует `/app/site/` → `/srv/`
- Запускает Caddy с конфигом из `Caddyfile`
- Слушает порт `$PORT` (Railway передаёт его автоматически)

---

## 🚀 Деплой через Dashboard

1. **Зайдите на [railway.com](https://railway.com)** и авторизуйтесь.

2. **Создайте новый проект:**
   - `New Project` → `Deploy from GitHub repo`
   - Выберите репозиторий `russian-harvest`
   - Railway автоматически увидит `Dockerfile`

3. **Дождитесь билда** (~2-3 минуты). В логах увидите:
   ```
   Using Detected Dockerfile
   ...
   [build] Writing pages to: /app/site
     ✓ index.html  (43 KB)
     ✓ catalog.html  (161 KB)
     ...
   Built 13 pages.
   ...
   {"level":"info","msg":"serving initial configuration"}
   ```

4. **Сгенерируйте публичный URL:**
   - Settings → Networking → **Generate Domain**
   - Получите адрес `your-app-production.up.railway.app`

5. **Привяжите свой домен** (опционально):
   - Settings → Networking → Custom Domain → `russian-harvest.ru`
   - В DNS провайдера: `CNAME @ → your-app.up.railway.app`
   - Railway автоматически выдаст SSL через Let's Encrypt

---

## 🖥️ Деплой через CLI

```bash
npm install -g @railway/cli
railway login
cd russian-harvest
railway link   # выберите проект или создайте новый
railway up
```

---

## ⚙️ Переменные окружения

Railway автоматически инжектит:
- `PORT` — порт, который должен слушать Caddy (Caddyfile читает его через `{$PORT:8080}`)
- `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_PRIVATE_DOMAIN` — для внутренних запросов

Когда будете подключать бэкенд, добавьте в **Settings → Variables**:

| Ключ | Пример | Что делает |
|------|--------|-----------|
| `API_BASE_URL` | `https://api.russian-harvest.ru/v1` | Адрес API (для фронта) |
| `SITE_ROOT` | `/srv` | Откуда Caddy отдаёт файлы (по умолчанию `/srv`, менять не нужно) |
| `SITE_DIR` | — | Куда build.py пишет HTML (авто-определяется) |

---

## 📊 Мониторинг

- **Метрики:** CPU, RAM, network, requests/min
- **Логи:** Caddy пишет access log в stdout — Railway собирает
- **Healthcheck:** каждые 30 секунд пинг на `/` (настроено в `railway.json`)
- **Авто-рестарт:** до 10 попыток при падении

---

## 🔄 Автоматический редеплой при push

Railway подписан на `main` вашего репо. Любой commit в `main` → автоматический билд и деплой.

Если нужно билдить только при изменении определённых файлов — Settings → Source → Watch Paths: `site/**, scripts/**, Caddyfile, Dockerfile`.

---

## 💰 Стоимость

Railway — платный сервис:
- **$5/месяц** стартовый тариф с кредитом $5
- Потребление статического сайта: ~$2-3/месяц (≈100 MB RAM, минимум CPU)
- Итого: **укладывается в $5/месяц**

Бесплатные альтернативы: Netlify / Vercel / Cloudflare Pages (для статики).

---

## 🐛 Траблшутинг

### `FileNotFoundError: No such file or directory: '/site/index.html'`
Это старая ошибка в Dockerfile, где `WORKDIR /build` и `build.py` писал в `/site` вместо `/build/site`. **Исправлено** в текущей версии: `WORKDIR /app`, `build.py` автоматически определяет правильный путь через `Path(__file__).parent.parent / 'site'`.

### `Caddyfile: unknown directive`
Проверьте, что `Caddyfile` без BOM и с LF-переводами строк (не CRLF). Откройте VS Code → Status Bar внизу справа → должно быть `LF` и `UTF-8`.

### Сайт открывается, но 404 на `/catalog`
`Caddyfile` настроен на pretty URLs через `@pretty { path ... }`. Проверьте, что файл действительно попал в образ: в логах Railway во время билда должна быть строка `COPY Caddyfile /etc/caddy/Caddyfile`.

### Healthcheck падает
Временно увеличьте `healthcheckTimeout` в `railway.json` до 300 секунд. Если остаётся — смотрите логи Caddy: возможно проблема с путём `root * {$SITE_ROOT:/srv}`.

### Ассеты не грузятся (404 на /assets/css/main.css)
Docker должен скопировать `site/assets/*` в `/srv/assets/*`. Проверьте что `.dockerignore` не исключает папку `site/assets`.

---

## 🎯 Финальный чеклист

- [ ] Репо на GitHub содержит `Dockerfile`, `Caddyfile`, `railway.json`
- [ ] В Railway Dashboard проект подключен
- [ ] Билд прошёл успешно (в логах `Built 13 pages.`)
- [ ] Публичный домен сгенерирован
- [ ] Свой домен привязан + SSL активен
- [ ] Все 13 страниц открываются
- [ ] В будущем: `API_BASE_URL` в `site/assets/js/config.js` указывает на production API

---

**Вопросы:** support@russian-harvest.ru
