# API Contract — Русский Урожай

Контракт RESTful API для бэкенда. Фронтенд вызывает эти эндпоинты через `assets/js/api.js`.

---

## Базовые правила

- Все запросы: `Content-Type: application/json`
- Аутентификация: `Authorization: Bearer <token>` в заголовках (кроме публичных)
- Коды ответов: 200/201 (успех), 400 (валидация), 401 (не авторизован), 403 (запрещено), 404 (не найдено), 500 (ошибка сервера)
- Ошибка: `{ "message": "...", "code": "..." }`

---

## 🔐 Аутентификация

### `POST /auth/sms/send`
Отправить SMS с кодом на указанный номер.

**Запрос:**
```json
{ "phone": "79300129797" }
```

**Ответ:**
```json
{ "ok": true, "message": "SMS отправлено" }
```

---

### `POST /auth/sms/verify`
Подтвердить код из SMS, получить токен.

**Запрос:**
```json
{ "phone": "79300129797", "code": "12345" }
```

**Ответ:**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "u_123",
    "phone": "79300129797",
    "name": "Владимир Ф.",
    "company": "ИП Фролов В.А.",
    "role": "buyer",
    "balance": 0
  }
}
```

---

### `POST /auth/register`
Регистрация нового пользователя.

**Запрос:**
```json
{
  "company": "ООО АгроКомпания",
  "inn": "1234567890",
  "phone": "79300129797",
  "email": "info@agro.ru",
  "role": "buyer"
}
```

**Ответ:** аналогично `/verify`.

---

### `POST /auth/logout`
Инвалидировать токен. Требует `Authorization`.

**Ответ:** `{ "ok": true }`

---

## 📦 Офферы (каталог «Купить»)

### `GET /offers`
Список всех активных офферов с фильтрацией.

**Query-параметры:**
- `crop` — тип культуры (`wheat`, `barley`, `corn`, ...)
- `region` — регион
- `price_min`, `price_max` — диапазон цены
- `distance_max` — максимальное расстояние, км
- `with_delivery=1`, `with_lab=1`, `with_vat=1` — фильтры
- `sort` — `distance|price|date|rating`
- `limit`, `offset` — пагинация

**Ответ:**
```json
{
  "items": [
    {
      "id": "of_001",
      "title": "Пшеница 3 класс",
      "price": 14200,
      "vat": "с НДС 10%",
      "volume": "120 т",
      "harvest": 2025,
      "region": "Арзамас",
      "distance_km": 112,
      "delivery_cost": 450,
      "quality": { "Протеин": "12,8 %", "Клейковина": "26 %" },
      "supplier": { "sid": "A-4721", "rating": 4.9, "deals_count": 34 },
      "badges": ["Лаб. анализ"],
      "status": "active"
    }
  ],
  "total": 30,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /offers/:id`
Детальная карточка оффера.

### `POST /offers`
Создать новый оффер (только для роли `seller`).

### `PATCH /offers/:id`
Обновить свой оффер.

### `DELETE /offers/:id`
Снять свой оффер с публикации.

---

## 🛒 Заявки покупателей (страница «Продать»)

### `GET /requests`
Список активных заявок от покупателей. Параметры как у `/offers`.

### `POST /requests`
Создать обратную заявку.

**Запрос:**
```json
{
  "product": "Пшеница 3 класс",
  "volume": "200 т",
  "delivery_where": "Нижний Новгород",
  "target_price": 14500,
  "vat": "с НДС",
  "needed_by": "2026-05-10"
}
```

**Ответ:** `{ "ok": true, "id": "Q-2041" }`

---

## 🤝 Сделки

### `GET /deals`
Список сделок текущего пользователя.

**Query:** `?status=active|pending|paid|done|cancelled`

**Ответ:**
```json
{
  "items": [
    {
      "id": "СД-4721",
      "offer_id": "of_001",
      "status": "shipping",
      "title": "Пшеница 3 класс · 120 т",
      "amount": 1920000,
      "created_at": "2026-04-15T10:00:00Z"
    }
  ]
}
```

### `GET /deals/:id`
Детали сделки.

### `POST /deals`
Создать сделку (из оффера).

**Запрос:**
```json
{
  "offer_id": "of_001",
  "volume_tons": 120,
  "delivery_type": "delivery",
  "delivery_address": "Нижний Новгород, ул. ..."
}
```

---

## 📊 Рынок

### `GET /market/prices?region=nn`
Актуальные медианные цены по региону (обновляется ежеминутно).

**Ответ:**
```json
{
  "region": "nn",
  "updated_at": "2026-04-20T12:30:00Z",
  "prices": [
    { "crop": "wheat-3", "median": 14200, "change": 1.8 },
    { "crop": "corn", "median": 15100, "change": 2.3 }
  ]
}
```

---

## 🚚 Логистика

### `POST /logistics/distance`
Рассчитать расстояние между двумя точками.

**Запрос:**
```json
{ "from": "Балаково", "to": "Нижний Новгород" }
```

**Ответ:**
```json
{
  "from": "Балаково",
  "to": "Нижний Новгород",
  "distance_km": 539.4,
  "duration_hours": 9.0,
  "route_polyline": "..." // опционально
}
```

---

## 👤 Профиль

### `GET /me`
Профиль текущего пользователя.

### `PATCH /me`
Обновить профиль.

---

## 📧 Поддержка

### `POST /contact`
Форма обратной связи.

**Запрос:**
```json
{
  "company": "ООО ...",
  "name": "Иванов Иван",
  "phone": "79301234567",
  "email": "...",
  "message": "..."
}
```

**Ответ:** `{ "ok": true, "ticket": "T-123456" }`

---

## Ресурсы бекенда (рекомендации)

**Стек:** FastAPI (Python) / Express (Node) / Go + PostgreSQL.

**Что необходимо реализовать:**
- JWT-аутентификация
- SMS-провайдер для кодов (SMS.RU, SMSC.ru, Beeline Cloud)
- Эскроу через платёжный шлюз (Qiwi, Тинькофф, Сбер)
- Проверка контрагентов через DaData / Контур.Фокус
- Карты / расстояния через Yandex Routing API
- Хранилище файлов (S3-совместимое) для сертификатов качества
- Поиск через PostgreSQL full-text или Elasticsearch
- Кэш цен в Redis с обновлением по cron

---

**Вопросы:** [support@russian-harvest.ru](mailto:support@russian-harvest.ru)
