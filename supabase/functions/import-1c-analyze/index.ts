// =====================================================================
// Edge Function: import-1c-analyze (v2.6.18)
// =====================================================================
// НАЗНАЧЕНИЕ:
//   Безопасный прокси для запуска AI-анализа JSON-файлов от 1С,
//   лежащих в bucket "uploads". Существующая инфраструктура (OpenRouter
//   + Telegram-бот @agromixrus_bot) развёрнута на Railway-сервисе
//   sftp-server-copy-copy-production.up.railway.app в endpoint
//   /analyze/{filename} с защитой через x-api-key.
//
//   Раньше клиент-сайт должен был бы вызывать этот endpoint напрямую
//   с ключом x-api-key в браузерном JS — это утечка ключа.
//
//   Теперь: клиент → эта Edge Function (с JWT админа) → Railway-сервис
//   (с x-api-key из Supabase secrets). Ключ не светится в браузере.
//
// БЕЗОПАСНОСТЬ:
//   1. Проверка JWT через supabase.auth.getUser() — валидирует токен.
//   2. Двойная проверка роли: запрашиваем profiles.role и убеждаемся
//      что role='admin'. Без этого даже валидный JWT не пройдёт.
//   3. Имя файла валидируется regex'ом — защита от path traversal.
//   4. Никакие тела ответов от Railway не пишутся в логи Edge Function
//      (чтобы не утечь AI-анализ с конфиденциальной инфой в логи).
//
// СЕКРЕТЫ (задаются через supabase secrets set):
//   RAILWAY_SFTP_URL     — https://sftp-server-copy-copy-production.up.railway.app
//   RAILWAY_SFTP_API_KEY — agro_secret_2025 (или новый ротированный)
//
// ДЕПЛОЙ:
//   cd supabase
//   supabase functions deploy import-1c-analyze --no-verify-jwt
//   (--no-verify-jwt — потому что мы проверяем JWT вручную, чтобы
//   сделать дополнительную проверку profiles.role)
//
//   supabase secrets set RAILWAY_SFTP_URL=https://sftp-server-copy-copy-production.up.railway.app
//   supabase secrets set RAILWAY_SFTP_API_KEY=agro_secret_2025
//
// ТЕСТ:
//   curl -X POST https://<project>.supabase.co/functions/v1/import-1c-analyze \
//     -H "Authorization: Bearer <admin-jwt-token>" \
//     -H "Content-Type: application/json" \
//     -d '{"filename":"20260401_115158_orders.json"}'
//
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Принимаем только POST
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // === ШАГ 1. JWT-валидация ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ error: "AUTH_REQUIRED", message: "Missing Authorization header" }, 401);
    }

    // Клиент для проверки JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Проверка пользователя
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) {
      return json({ error: "AUTH_INVALID", message: "Invalid or expired token" }, 401);
    }

    // === ШАГ 2. Проверка роли admin ===
    const { data: profile, error: profileErr } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || profile.role !== "admin") {
      return json({ error: "FORBIDDEN", message: "Admin role required" }, 403);
    }

    // === ШАГ 3. Парс и валидация payload ===
    let body: { filename?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, 400);
    }

    const filename = body.filename;
    if (!filename || typeof filename !== "string") {
      return json({ error: "BAD_REQUEST", message: "filename required" }, 400);
    }

    // Защита от path traversal: filename должен быть только из allowed-символов
    if (!/^[A-Za-z0-9_.\-]+$/.test(filename)) {
      return json({ error: "BAD_FILENAME", message: "Filename contains forbidden characters" }, 400);
    }

    // === ШАГ 4. Форвард на Railway-сервис ===
    const railwayUrl = Deno.env.get("RAILWAY_SFTP_URL");
    const railwayKey = Deno.env.get("RAILWAY_SFTP_API_KEY");

    if (!railwayUrl || !railwayKey) {
      return json({
        error: "CONFIG_MISSING",
        message: "RAILWAY_SFTP_URL or RAILWAY_SFTP_API_KEY not set in Supabase secrets",
      }, 500);
    }

    const targetUrl = `${railwayUrl.replace(/\/$/, "")}/analyze/${encodeURIComponent(filename)}`;
    const railwayResp = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "x-api-key": railwayKey,
        "Accept": "application/json",
      },
    });

    const respText = await railwayResp.text();
    // Не логируем тело — конфиденциальные данные

    if (!railwayResp.ok) {
      return json({
        error: "RAILWAY_FAILED",
        status: railwayResp.status,
        message: respText.slice(0, 200),
      }, 502);
    }

    let parsedResp;
    try {
      parsedResp = JSON.parse(respText);
    } catch {
      parsedResp = { raw: respText.slice(0, 500) };
    }

    // === ШАГ 5. Аудит в БД (опционально) ===
    // Записываем в needs или отдельную таблицу что админ запускал AI-анализ —
    // полезно для audit trail. Если таблицы audit_log нет — игнорим.
    try {
      await sb.from("uploads").update({ status: "saved" }).eq("filename", filename);
    } catch {
      // ignore — статус-обновление это nice-to-have
    }

    return json({
      ok: true,
      filename,
      tg_sent: parsedResp.tg_sent,
      message: "AI-анализ отправлен в Telegram-бот @agromixrus_bot",
    });

  } catch (e) {
    console.error("[import-1c-analyze] internal error:", e?.message || e);
    return json({ error: "INTERNAL", message: "Internal server error" }, 500);
  }
});
