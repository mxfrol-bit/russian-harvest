-- ============================================================
-- v2.6.27: Геокоординаты для buyer_requests
-- ============================================================
-- Назначение: хранить рассчитанные lat/lng для расчёта дистанции
-- от пользователя до места выгрузки/загрузки на карточках сайта.
--
-- Источники координат:
--   1. Захардкоженный справочник (geo-regions.js) — региональные/городские центры
--   2. Дадата API (когда подключим в v2.6.28) — точно по адресу
--
-- offers.warehouse_lat/lng уже есть, для них миграция не нужна.
-- ============================================================

ALTER TABLE buyer_requests
  ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC;

-- Проверка
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='buyer_requests'
  AND column_name IN ('delivery_lat', 'delivery_lng');
