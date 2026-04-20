# ⚡ Быстрый старт за 5 минут

## 1. Запустить локально

```bash
python3 scripts/build.py           # собрать HTML
python3 -m http.server 8080 --directory site
```

Открыть: **http://localhost:8080**

---

## 2. Залить в Git

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:YOUR-ORG/russian-harvest.git
git push -u origin main
```

---

## 3. Задеплоить на Netlify (бесплатно, 2 клика)

1. Зайти на [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project** → выбрать репо
3. Настройки подхватятся из `netlify.toml` автоматически
4. **Deploy site**

Через минуту сайт будет жить по адресу `https://your-site.netlify.app` с SSL.

---

## 4. Подключить свой домен

**В Netlify:**
- Site settings → Domain management → **Add custom domain**
- Введите `russian-harvest.ru`

**В DNS провайдера домена:**
```
Type: CNAME    Name: @      Value: your-site.netlify.app
Type: CNAME    Name: www    Value: your-site.netlify.app
```

SSL-сертификат Let's Encrypt выдастся автоматически за 5-10 минут.

---

## 5. Подключить бэкенд (когда готов)

Отредактировать `site/assets/js/config.js`:

```js
API_BASE_URL: 'https://api.russian-harvest.ru/v1'
```

Пересобрать (`python3 scripts/build.py`) и запушить в Git — Netlify пересоберёт и задеплоит автоматически.

**Контракт API:** см. [`docs/API.md`](docs/API.md).

---

## Что получите

- 🚀 13 рабочих страниц с реальными данными
- 🔍 Рабочие фильтры (культура, регион, цена, расстояние)
- 📱 Полностью адаптивная вёрстка
- 🎨 Дизайн-система (Manrope + JetBrains Mono, emerald/orange палитра)
- 🔐 Модалки входа/регистрации, личный кабинет
- 📊 30 офферов в каталоге + 6 в архиве
- 💬 30 заявок от покупателей + 6 в архиве
- 📍 Расстояние до каждого склада + калькулятор доставки
- ⌘K глобальный поиск
- 🌓 Demo-режим: работает без бекенда

---

## Тест-режим (для демо)

**Вход на сайт** по любому телефону. **Код из SMS: `12345`**.

После «входа» — сразу в личный кабинет с заполненными демо-данными.

---

**Поддержка:** support@russian-harvest.ru · +7 930 012-97-97
