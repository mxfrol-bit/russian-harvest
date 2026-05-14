-- ============================================================
-- v2.6.17 — Доступ админов сайта к буферу 1С (bucket "uploads" + table "uploads")
-- ============================================================
-- НАЗНАЧЕНИЕ: Раздел /admin-import-1c.html (Импорт из 1С в админ-панели)
-- должен ходить в Supabase под обычным anon-ключом сайта (тем же, что и
-- весь остальной фронтенд). Чтобы это работало безопасно, нужны RLS-политики,
-- разрешающие доступ ТОЛЬКО пользователям с role='admin' в таблице profiles.
--
-- Применить:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Скопировать ВЕСЬ файл, вставить, Run
--   3. Перезагрузить /admin-import-1c.html — должны загрузиться файлы
--
-- Откат: см. блок ROLLBACK в самом конце файла.
-- ============================================================


-- ============================================================
-- 0) ХЕЛПЕР: is_admin() — true если текущий auth.uid() имеет role='admin'
--    Использовать в RLS-политиках. SECURITY DEFINER чтобы политика
--    не нарвалась на RLS таблицы profiles рекурсивно.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
COMMENT ON FUNCTION public.is_admin() IS
  'Возвращает TRUE для пользователей с role=admin в profiles. Используется в RLS-политиках разделов с админ-доступом.';


-- ============================================================
-- 1) Таблица public.uploads — реестр пришедших файлов от 1С
-- ============================================================
-- На случай если таблица ещё не была включена в RLS:
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Защитимся от повторного применения — снесём политики если они уже есть
DROP POLICY IF EXISTS "uploads_admin_select" ON public.uploads;
DROP POLICY IF EXISTS "uploads_admin_update" ON public.uploads;
DROP POLICY IF EXISTS "uploads_admin_delete" ON public.uploads;
DROP POLICY IF EXISTS "uploads_admin_insert" ON public.uploads;

-- Только админы видят файлы из 1С
CREATE POLICY "uploads_admin_select" ON public.uploads
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Только админы могут менять статус (new → saved → done → published → archived)
CREATE POLICY "uploads_admin_update" ON public.uploads
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Только админы удаляют (если понадобится)
CREATE POLICY "uploads_admin_delete" ON public.uploads
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- INSERT остаётся для service_role (Railway-сервиса при загрузке файлов)
-- service_role ОБХОДИТ RLS — для него политика не нужна.
-- Если хочется явно разрешить — раскомментировать:
-- CREATE POLICY "uploads_admin_insert" ON public.uploads
--   FOR INSERT TO authenticated WITH CHECK (public.is_admin());


-- ============================================================
-- 2) Таблица public.needs — распарсенные заявки (на будущее)
-- ============================================================
-- Сейчас не используется в admin-import-1c.html, но политика нужна для
-- будущего этапа «Опубликовать в каталог». Применим заранее.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'needs') THEN
    ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "needs_admin_all" ON public.needs;
    CREATE POLICY "needs_admin_all" ON public.needs
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;


-- ============================================================
-- 3) Storage bucket "uploads" — файлы JSON в Object Storage
-- ============================================================
-- На Supabase Storage политики живут в storage.objects.
-- Открываем чтение для админов на bucket_id='uploads'.

-- Бакет должен быть PRIVATE (создан без public:true). Проверьте в UI:
-- Dashboard → Storage → uploads → Settings: "Public bucket" должен быть OFF.

DROP POLICY IF EXISTS "uploads_bucket_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "uploads_bucket_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "uploads_bucket_admin_delete" ON storage.objects;

-- Только админы скачивают/перечисляют файлы в bucket "uploads"
CREATE POLICY "uploads_bucket_admin_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'uploads' AND public.is_admin());

-- Только админы обновляют (метаданные/имя) — на будущее
CREATE POLICY "uploads_bucket_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'uploads' AND public.is_admin())
  WITH CHECK (bucket_id = 'uploads' AND public.is_admin());

-- Только админы удаляют файлы
CREATE POLICY "uploads_bucket_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads' AND public.is_admin());

-- INSERT в bucket остаётся для service_role (Railway-сервиса).
-- Если в будущем захотим, чтобы админы могли загружать файлы вручную через UI:
-- CREATE POLICY "uploads_bucket_admin_insert" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'uploads' AND public.is_admin());


-- ============================================================
-- 4) ПРОВЕРКА — выполнить под админом из админки
-- ============================================================
-- SELECT public.is_admin();                       -- должно вернуть true
-- SELECT count(*) FROM public.uploads;            -- видим число файлов
-- Скачивание файла через JS-клиент supabase.storage.from('uploads').download(...)
-- должно работать после применения этой миграции.


-- ============================================================
-- ROLLBACK (если что-то пошло не так):
-- ============================================================
-- DROP POLICY IF EXISTS "uploads_admin_select" ON public.uploads;
-- DROP POLICY IF EXISTS "uploads_admin_update" ON public.uploads;
-- DROP POLICY IF EXISTS "uploads_admin_delete" ON public.uploads;
-- DROP POLICY IF EXISTS "needs_admin_all" ON public.needs;
-- DROP POLICY IF EXISTS "uploads_bucket_admin_select" ON storage.objects;
-- DROP POLICY IF EXISTS "uploads_bucket_admin_update" ON storage.objects;
-- DROP POLICY IF EXISTS "uploads_bucket_admin_delete" ON storage.objects;
-- DROP FUNCTION IF EXISTS public.is_admin();
