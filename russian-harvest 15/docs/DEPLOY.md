# 📘 Инструкция по деплою

Подробный гайд как запустить «Русский Урожай» на production.

---

## Вариант 1: Netlify (самый простой, бесплатно)

1. **Залить в GitHub:**
   ```bash
   cd russian-harvest
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:your-org/russian-harvest.git
   git push -u origin main
   ```

2. **Подключить к Netlify:**
   - Зарегистрируйтесь на [netlify.com](https://netlify.com)
   - `Add new site` → `Import from Git` → выберите репозиторий
   - Build command: `python3 scripts/build.py` (заполнится автоматически из `netlify.toml`)
   - Publish directory: `site`
   - Нажмите **Deploy**

3. **Привязать домен:**
   - Site settings → Domain management → Add custom domain
   - В DNS-провайдере настройте CNAME на `your-site.netlify.app`
   - Netlify автоматически выдаст SSL-сертификат

**Стоимость:** бесплатно до 100GB трафика/месяц.

---

## Вариант 2: Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Vercel автоматически подхватит `vercel.json`. Домен: `your-project.vercel.app`.

---

## Вариант 3: Свой VPS (Nginx)

### На сервере

```bash
# Установка Python и Nginx
sudo apt update
sudo apt install -y python3 nginx

# Клонирование репозитория
cd /var/www
sudo git clone https://github.com/your-org/russian-harvest.git
sudo chown -R $USER:$USER russian-harvest
cd russian-harvest

# Сборка
python3 scripts/build.py

# Настройка Nginx
sudo cp scripts/nginx.conf /etc/nginx/sites-available/russian-harvest
sudo ln -s /etc/nginx/sites-available/russian-harvest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL сертификат (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d russian-harvest.ru -d www.russian-harvest.ru
```

### Автообновление при push (webhook)

Создайте `/var/www/russian-harvest/scripts/deploy.sh`:
```bash
#!/bin/bash
cd /var/www/russian-harvest
git pull
python3 scripts/build.py
sudo systemctl reload nginx
```

Настройте GitHub webhook → ваш сервер → триггерит `deploy.sh`.

---

## Вариант 4: Docker (любой сервер с Docker)

```bash
# Сборка образа
docker build -t russian-harvest .

# Запуск
docker run -d \
  --name rh \
  --restart unless-stopped \
  -p 80:80 \
  russian-harvest

# Или через docker-compose
docker compose up -d
```

Добавьте Nginx перед контейнером для SSL, либо используйте [Caddy](https://caddyserver.com/) с автоматическим HTTPS.

---

## Вариант 5: Reg.ru / Beget / любой shared-хостинг

Shared-хостинги обычно не поддерживают Python на билд-этапе. Поэтому соберите сайт **локально**:

```bash
python3 scripts/build.py
```

Затем просто загрузите содержимое папки `site/` через FTP/SFTP:

```bash
# Пример через lftp
lftp -c "
  open ftp://user:pass@russian-harvest.ru;
  mirror -R site/ /public_html/
"
```

---

## Подключение реального API

После того как бэкенд развёрнут (например, на `api.russian-harvest.ru`):

### Вариант A: Отредактировать `config.js`

```js
// site/assets/js/config.js
window.RH_CONFIG = {
  API_BASE_URL: 'https://api.russian-harvest.ru/v1',
  MAPS_API_KEY: 'your-yandex-maps-key',
  YANDEX_METRIKA_ID: 12345678,
  // ...
};
```

Пересоберите (`python3 scripts/build.py`) и задеплойте.

### Вариант B: Переопределить через CI

В Netlify/Vercel/GitHub Actions добавьте переменные окружения:
- `RH_API_URL=https://api.russian-harvest.ru/v1`

И адаптируйте `scripts/build.py` чтобы читать `os.environ['RH_API_URL']` и писать его в `config.js`.

---

## Чеклист перед запуском

- [ ] Все ссылки работают (нет 404)
- [ ] Формы отправляются (контакты, реверс-заявки, логин)
- [ ] SSL-сертификат установлен
- [ ] DNS указывает на сервер
- [ ] `robots.txt` и `sitemap.xml` доступны
- [ ] Яндекс.Метрика / GA подключены
- [ ] Telegram-бот поддержки отвечает
- [ ] Эскроу-шлюз работает (тестовый платёж)
- [ ] Резервные копии БД настроены
- [ ] Мониторинг uptime подключён (например UptimeRobot)

---

## Если что-то не работает

1. **Сайт не открывается:** проверьте DNS (`dig russian-harvest.ru`) и доступность сервера.
2. **Логотип/фон не грузятся:** убедитесь что `https://russian-harvest.ru/img/logo.svg` и `/img/main.jpg` доступны.
3. **Формы не отправляются:** откройте DevTools → Network → посмотрите ошибку API. В demo-режиме должны работать без сервера.
4. **CSP блокирует ресурсы:** отредактируйте `Content-Security-Policy` в `netlify.toml` / `nginx.conf` / `vercel.json`.
5. **Стили "съехали":** очистите кэш браузера, проверьте что `main.css` обновился (нужно bumpнуть версию в ссылке).

---

**Вопросы по деплою:** [support@russian-harvest.ru](mailto:support@russian-harvest.ru)
