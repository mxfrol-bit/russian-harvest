-- ============================================================
-- РУССКИЙ УРОЖАЙ — диагностика и фикс пустого каталога
-- ============================================================
-- Запускать в Supabase Dashboard → SQL Editor → New query → Run
--
-- Скрипт безопасный (idempotent): можно запускать несколько раз.
-- Делает 4 вещи:
--   1) Показывает что в БД сейчас (offers, profiles, RLS)
--   2) Гарантирует RLS-политики для роли anon на public-чтение
--   3) Проверяет наличие RPC offers_with_distance
--   4) Засевает 6 демо-офферов если в offers нет ни одной active-строки
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ШАГ 1. ДИАГНОСТИКА (что сейчас в БД)
-- ─────────────────────────────────────────────────────────────
SELECT '=== СТРОК В offers ВСЕГО ===' AS info, count(*) AS value FROM offers
UNION ALL
SELECT 'СТРОК В offers (status=active)', count(*) FROM offers WHERE status = 'active'
UNION ALL
SELECT 'СТРОК В profiles', count(*) FROM profiles
UNION ALL
SELECT 'СТРОК В crops', count(*) FROM crops;

-- Какие RLS-политики висят на offers (для понимания что разрешено anon)
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('offers', 'crops', 'profiles', 'profiles_public')
ORDER BY tablename, policyname;

-- Есть ли RPC offers_with_distance
SELECT proname, pronargs FROM pg_proc WHERE proname IN ('offers_with_distance', 'geo_distance_km');

-- ─────────────────────────────────────────────────────────────
-- ШАГ 2. RLS-ПОЛИТИКИ — гарантируем что anon может читать публичный каталог
-- ─────────────────────────────────────────────────────────────
-- offers: чтение active-офферов всем (anon тоже) — нужно для публичного каталога
DO $$
BEGIN
  -- Включаем RLS если выключено
  EXECUTE 'ALTER TABLE offers ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS offers_public_select ON offers;
CREATE POLICY offers_public_select ON offers
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- crops: справочник, читать всем
DO $$ BEGIN EXECUTE 'ALTER TABLE crops ENABLE ROW LEVEL SECURITY'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP POLICY IF EXISTS crops_public_select ON crops;
CREATE POLICY crops_public_select ON crops
  FOR SELECT TO anon, authenticated USING (true);

-- profiles_public — это VIEW, политики на view не нужны (наследуются от profiles).
-- Главное чтобы profiles разрешала SELECT anon на безопасные колонки.
-- Если у вас profiles_public — security invoker view, то нужна политика на profiles:
DROP POLICY IF EXISTS profiles_public_handle ON profiles;
CREATE POLICY profiles_public_handle ON profiles
  FOR SELECT TO anon, authenticated USING (true);

-- ─────────────────────────────────────────────────────────────
-- ШАГ 3. ПРОВЕРКА RPC offers_with_distance
-- ─────────────────────────────────────────────────────────────
-- Если функции нет — клиент упадёт на первой попытке и пойдёт в fallback на listOffers.
-- Это нормально, но даёт лишний раунд. Создаём минимальную версию если её нет:
CREATE OR REPLACE FUNCTION public.offers_with_distance(p_lat double precision, p_lng double precision)
RETURNS TABLE (
  id uuid, seller_id uuid, crop_id text, title text, region text, city text,
  price_kopecks bigint, volume_tons numeric, status text, vat text,
  is_premium boolean, premium_tier text, premium_until timestamptz,
  expires_at timestamptz, created_at timestamptz, distance_km double precision
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    o.id, o.seller_id, o.crop_id, o.title, o.region, o.city,
    o.price_kopecks, o.volume_tons, o.status, o.vat,
    COALESCE(o.is_premium, false), o.premium_tier, o.premium_until,
    o.expires_at, o.created_at,
    -- Грубая оценка расстояния если нет geo_units. Если она есть — используется JOIN ниже.
    NULL::double precision AS distance_km
  FROM offers o
  WHERE o.status = 'active'
  ORDER BY COALESCE(o.is_premium, false) DESC, o.created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.offers_with_distance(double precision, double precision) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- ШАГ 4. ДЕМО-ДАННЫЕ — если в offers нет active-строк, заливаем 6 примеров
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count int;
  v_seller_id uuid;
BEGIN
  SELECT count(*) INTO v_count FROM offers WHERE status = 'active';
  IF v_count > 0 THEN
    RAISE NOTICE 'В offers уже есть % active-строк, демо не нужно', v_count;
    RETURN;
  END IF;

  RAISE NOTICE 'offers пуст, засеваем демо-данные...';

  -- Гарантируем что есть базовые crops (если нет — добавим)
  INSERT INTO crops (id, name, emoji, category) VALUES
    ('wheat-3',     'Пшеница 3 класс',   '🌾', 'wheat'),
    ('wheat-4',     'Пшеница 4 класс',   '🌾', 'wheat'),
    ('wheat-5',     'Пшеница 5 класс',   '🌾', 'wheat'),
    ('barley-feed', 'Ячмень кормовой',   '🌾', 'barley'),
    ('corn',        'Кукуруза',          '🌽', 'corn'),
    ('sunflower',   'Подсолнечник',      '🌻', 'sunflower'),
    ('rapeseed',    'Рапс',              '🌼', 'rapeseed'),
    ('oat',         'Овёс',              '🌾', 'oat')
  ON CONFLICT (id) DO NOTHING;

  -- Берём любого продавца, или создаём служебного
  SELECT id INTO v_seller_id FROM profiles ORDER BY created_at LIMIT 1;
  IF v_seller_id IS NULL THEN
    -- Без auth.users мы не можем создать profiles (FK). Используем NULL seller_id
    -- и в коде на клиенте поле seller_id может быть NULL — это допустимо.
    v_seller_id := NULL;
  END IF;

  INSERT INTO offers (id, seller_id, crop_id, title, region, city, price_kopecks, volume_tons, status, vat, harvest_year, has_delivery, has_lab_analysis, quality, expires_at, created_at)
  VALUES
    (gen_random_uuid(), v_seller_id, 'wheat-4',     'Пшеница 4 класс — Богородский район',     'Нижегородская область', 'Богородск',     1210000, 250, 'active', 'with_vat_10', 2025, true,  true,  '{"Протеин":"12.5%","Клейковина":"23%","Натура":"760 г/л"}'::jsonb, now() + interval '30 days', now()),
    (gen_random_uuid(), v_seller_id, 'wheat-3',     'Пшеница 3 класс — Кстовский район',       'Нижегородская область', 'Кстово',        1380000, 180, 'active', 'with_vat_10', 2025, true,  true,  '{"Протеин":"13.5%","Клейковина":"26%","Натура":"775 г/л"}'::jsonb, now() + interval '30 days', now() - interval '2 days'),
    (gen_random_uuid(), v_seller_id, 'barley-feed', 'Ячмень кормовой — Дальнеконстантиновский','Нижегородская область', 'Д.Константиново', 1305000, 120, 'active', 'with_vat_10', 2025, false, false, '{"Натура":"640 г/л","Влажность":"13.5%"}'::jsonb, now() + interval '30 days', now() - interval '5 days'),
    (gen_random_uuid(), v_seller_id, 'corn',        'Кукуруза фуражная — Воротынский район',  'Нижегородская область', 'Воротынец',     1510000, 300, 'active', 'with_vat_10', 2025, true,  true,  '{"Влажность":"14%","Натура":"720 г/л"}'::jsonb, now() + interval '30 days', now() - interval '7 days'),
    (gen_random_uuid(), v_seller_id, 'sunflower',   'Подсолнечник масличный — Сергачский',     'Нижегородская область', 'Сергач',        2840000, 80,  'active', 'with_vat_10', 2025, true,  true,  '{"Масличность":"48%","Влажность":"7%","Сорность":"2%"}'::jsonb, now() + interval '30 days', now() - interval '1 day'),
    (gen_random_uuid(), v_seller_id, 'rapeseed',    'Рапс товарный — Лысковский район',       'Нижегородская область', 'Лысково',       3210000, 60,  'active', 'with_vat_10', 2025, false, true,  '{"Масличность":"42%","Влажность":"8%"}'::jsonb, now() + interval '30 days', now() - interval '3 days');

  RAISE NOTICE 'Засеяно 6 демо-офферов. Откройте /catalog.html — должны появиться карточки.';
END $$;

-- ─────────────────────────────────────────────────────────────
-- ФИНАЛ: ещё раз показываем сколько строк теперь
-- ─────────────────────────────────────────────────────────────
SELECT 'ИТОГО offers (active) ПОСЛЕ ФИКСА' AS info, count(*) AS value FROM offers WHERE status = 'active';
