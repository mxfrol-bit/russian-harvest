# Edge Functions — деплой

## Что это

Supabase Edge Functions — серверный код на Deno, исполняемый внутри Supabase.
Используется для операций, требующих секретных ключей, которые нельзя
светить в браузерном JS.

## Список функций

| Имя | Назначение | Релиз |
|---|---|---|
| `import-1c-analyze` | AI-анализ JSON-файла от 1С через OpenRouter + Telegram. Прокси к Railway sftp-server с защитой через JWT админа. | v2.6.18 |

## Установка CLI (один раз)

```bash
# macOS
brew install supabase/tap/supabase

# или npm
npm install -g supabase

# проверка
supabase --version
```

## Логин и привязка проекта

```bash
supabase login                  # откроет браузер для логина
cd /путь/к/проекту              # туда, где лежит папка supabase/
supabase link --project-ref hqeydijtafcbonesrzot
```

`hqeydijtafcbonesrzot` — ID нашего проекта Supabase (виден в URL панели).

## Установка секретов

**Секреты хранятся внутри Supabase**, не в коде и не в Git.

```bash
supabase secrets set RAILWAY_SFTP_URL=https://sftp-server-copy-copy-production.up.railway.app
supabase secrets set RAILWAY_SFTP_API_KEY=agro_secret_2025
```

Проверка:

```bash
supabase secrets list
```

## Деплой функции

```bash
supabase functions deploy import-1c-analyze --no-verify-jwt
```

Флаг `--no-verify-jwt` означает что Supabase **не делает** автоматическую
проверку JWT — это нужно, потому что мы проверяем JWT **вручную внутри
функции** + добавляем проверку `profiles.role='admin'`. Это даёт двойную
защиту: даже валидный JWT обычного пользователя не пройдёт.

## Проверка

После деплоя функция доступна по URL:

```
https://hqeydijtafcbonesrzot.supabase.co/functions/v1/import-1c-analyze
```

Тестовый запрос:

```bash
# Получить JWT админа: войти на сайт под admin, открыть DevTools →
# Application → Local Storage → rh_supabase_auth → access_token

curl -X POST \
  https://hqeydijtafcbonesrzot.supabase.co/functions/v1/import-1c-analyze \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"20260401_115158_orders.json"}'
```

Ожидаемый ответ:

```json
{ "ok": true, "filename": "...", "tg_sent": true, "message": "..." }
```

## Логи

```bash
supabase functions logs import-1c-analyze --tail
```

или в Dashboard → Edge Functions → import-1c-analyze → Logs.

## Если что-то не работает

| Ошибка | Что делать |
|---|---|
| `AUTH_REQUIRED` | Нет заголовка Authorization. Проверь что сайт послал Bearer-токен. |
| `AUTH_INVALID` | JWT просрочен. Перелогиньтесь на сайте. |
| `FORBIDDEN` | У пользователя нет `role='admin'` в `profiles`. |
| `BAD_FILENAME` | Имя файла содержит запрещённые символы. Должны быть только `[A-Za-z0-9_.-]`. |
| `CONFIG_MISSING` | Не задан `RAILWAY_SFTP_URL` или `RAILWAY_SFTP_API_KEY`. Выполнить `supabase secrets set`. |
| `RAILWAY_FAILED` | Railway-сервис вернул ошибку. Проверить что он живой: `curl https://sftp-server-copy-copy-production.up.railway.app/`. |

## Ротация ключей

Если ключ `agro_secret_2025` скомпрометирован:

1. В Railway Variables меняешь `API_KEY` → новое значение
2. Здесь меняешь secret: `supabase secrets set RAILWAY_SFTP_API_KEY=<новый>`
3. Деплой не нужен — Edge Function подхватит новый secret автоматически
