# 🚂 Деплой на Railway

Пошаговая инструкция для публикации «Русского Урожая» на [Railway](https://railway.com).

---

## Что уже готово

В репозитории есть три файла, которые Railway подхватит автоматически:

- **`railway.json`** — метаконфиг (healthcheck, restart policy)
- **`nixpacks.toml`** — Railway будет использовать **Nixpacks** для сборки (ставит Python 3.11 и Caddy, выполняет билд, запускает Caddy)
- **`Caddyfile`** — production-grade HTTP-сервер с gzip, security-заголовками, pretty URLs и кэшированием

---

## 🚀 Деплой через Dashboard (самый простой способ)

1. **Зайдите на [railway.com](https://railway.com)** и авторизуйтесь (GitHub login).

2. **Создайте новый проект:**
   - `New Project` → `Deploy from GitHub repo`
   - Выберите свой репозиторий `russian-harvest`
   - Railway автоматически прочитает `railway.json` + `nixpacks.toml`

3. **Дождитесь билда** (~1-2 минуты):
   - Railway установит Python 3.11 и Caddy
   - Запустит `python3 scripts/build.py`
   - Стартует Caddy на порту `$PORT`

4. **Проверьте логи** во вкладке **Deployments**:
   ```
   ✓ index.html  (43 KB)
   ✓ catalog.html  (161 KB)
   ...
   Built 13 pages.
   {"level":"info","ts":...,"msg":"serving initial configuration"}
   ```

5. **Сгенерируйте публичный URL:**
   - Settings → Networking → **Generate Domain**
   - Получите адрес `your-app-production.up.railway.app`

6. **Привяжите свой домен** (опционально):
   - Settings → Networking → Custom Domain → введите `russian-harvest.ru`
   - В DNS-провайдере добавьте **CNAME** → `your-app.up.railway.app`
   - Railway автоматически выдаст SSL-сертификат

---

## 🖥️ Деплой через Railway CLI

```bash
# Установите CLI
npm install -g @railway/cli

# Войдите
railway login

# Привяжите локальную папку к проекту
cd russian-harvest
railway link   # выберите существующий проект или создайте новый

# Задеплойте
railway up
```

---

## ⚙️ Переменные окружения

Railway автоматически даёт `PORT` — Caddyfile его слушает через `{$PORT}`. Больше ничего не нужно.

Когда будете подключать бэкенд, добавьте в Railway Variables:

| Ключ | Значение | Где используется |
|------|----------|------------------|
| `RH_API_URL` | `https://api.russian-harvest.ru/v1` | (опционально, если переносите config.js на build-time) |

Переменные окружения доступны в билд-скрипте через `os.environ['RH_API_URL']`.

---

## 📊 Мониторинг

Railway даёт из коробки:
- **Метрики:** CPU, RAM, network, requests/min
- **Логи:** stdout Caddy (access log + errors)
- **Healthcheck:** каждые 30 сек пинг на `/` (настроено в `railway.json`)
- **Авто-рестарт:** до 10 попыток при падении

Всё во вкладке **Metrics** и **Deployments**.

---

## 🔄 Автоматический редеплой при push

Railway подписан на push в `main` вашего репозитория. Любой commit в `main` → автоматический билд и деплой. Настраивается в Settings → Source.

Если хотите задеплоить **только при изменении определённых файлов** — добавьте в Settings → Source → Watch Paths: `site/**, scripts/**`.

---

## 💰 Стоимость

Railway — платный сервис (нет бесплатного тира с июня 2023), но:
- **$5/месяц** стартовый тариф с кредитом $5
- Для статического сайта потребление ~$2-3/месяц (≈150 MB RAM, мало CPU)
- Итого: **в пределах $5/месяц**

Альтернативы для полностью бесплатного хостинга: Netlify / Vercel / Cloudflare Pages.

---

## 🔍 Что проверить после деплоя

1. Главная открывается: `https://your-app.up.railway.app/`
2. Pretty URLs работают: `/catalog`, `/sale`, `/account`
3. Логотип и фон грузятся с russian-harvest.ru
4. Модалка «Купить/Продать» всплывает при первом визите
5. Логин работает по коду `12345`
6. 404 правильно рендерится: зайти на `/nonexistent`
7. Gzip работает: в DevTools → Network → проверить `content-encoding: gzip`

---

## 🐛 Траблшутинг

### Билд падает на `python3 scripts/build.py`
Проверьте, что `nixpacks.toml` попал в корень репо, а не в подпапку. В логе должно быть: `Installing python311, caddy`.

### Caddy падает с `unknown directive`
Проверьте что Caddyfile без BOM и с LF-переводами строк (не CRLF). Пересохраните в UTF-8.

### Сайт открывается, но 404 на `/catalog`
Railway проксирует только порт `$PORT`. Убедитесь что Caddyfile слушает `:{$PORT:8080}`, а не конкретный порт.

### Ассеты не грузятся (404 на /assets/css/main.css)
В Caddyfile `root * /app/site` — проверьте что путь корректный. Railway клонирует репо в `/app`.

### Healthcheck падает
Временно увеличьте `healthcheckTimeout` в `railway.json` до 300 сек. Если проблема остаётся — смотрите логи: возможно Caddy не стартует.

---

## 🎯 Финальный чеклист

- [ ] Репо на GitHub содержит `railway.json`, `nixpacks.toml`, `Caddyfile`
- [ ] В Railway Dashboard проект подключен
- [ ] Билд прошёл успешно
- [ ] Публичный домен сгенерирован
- [ ] Свой домен привязан + SSL активен
- [ ] Все 13 страниц открываются
- [ ] В будущем: `API_BASE_URL` в `config.js` указывает на production API

---

**Вопросы:** support@russian-harvest.ru
