/**
 * RUNTIME CONFIGURATION — Production
 * ===================================
 * Подключение к реальному Supabase backend.
 * Для DEMO-режима: USE_SUPABASE: false
 *
 * VERSION + CHANGELOG: показываются в админ-панели → блок «Версия платформы».
 * При каждом деплое нужно: bump VERSION, добавить запись в CHANGELOG (наверх).
 */

window.RH_CONFIG = {
  USE_SUPABASE: true,
  SUPABASE_URL: 'https://hqeydijtafcbonesrzot.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_5_T20OTkKWUHN28EMIrrWw__Mgj7s95',
  API_BASE_URL: null,

  MAPS_API_KEY: null,
  YANDEX_METRIKA_ID: null,
  GA_ID: null,

  SUPPORT_PHONE: '+7-930-012-97-97',
  SUPPORT_EMAIL: 'support@russian-harvest.ru',
  SUPPORT_TELEGRAM: 'tdrusagro',

  FEATURES: {
    escrow_enabled: true,
    realtime_chat: true,
    realtime_auctions: true,
    map_view: false,
    b2b_negotiation: true,
  },

  VERSION: '2.3.0',
  BUILD_DATE: '2026-05-06',

  // Журнал релизов — показывается в админ-панели «Версия платформы»
  CHANGELOG: [
    {
      version: '2.3.0',
      date: '2026-05-06',
      summary: 'Чаты + state machine сделок + анонимность + админ-обзор чатов',
      changes: [
        'Чат-модал с историей сообщений, Realtime, кнопками переходов статуса (pending → paid → shipping → delivered → completed)',
        'Анонимность: контрагенты видят только handle (B-1284 / S-7821), без company_name / ИНН / телефона',
        'Кнопки «Откликнуться» и «Сделать ценовое предложение» теперь открывают чат',
        'Админ-панель: новый модал «💬 Чаты платформы» с обзором всех переговоров',
        'В таблице «Все сделки» — кнопка чата для каждой сделки',
        'Динамические счётчики чипсов «Пшеница 8», «Ячмень 4» и т.д. (раньше были статичные)',
        'Версия и changelog показываются в админ-панели',
        'Фикс: view profiles_public пересобрана без security_invoker — это ломало JOIN с продавцами',
        'Фикс: data-offer-id="demo" заменяется на реальный UUID на product.html',
        'Фикс: if без скобок в handleProposal/handleRespond (кнопки молча умирали)',
      ]
    },
    {
      version: '2.0.0',
      date: '2026-04-29',
      summary: 'Production-launch: реальные данные из Supabase',
      changes: [
        'Полный pipeline 1С → FastAPI → Supabase',
        'Realtime котировки и аукционы',
        'Эскроу-сделки',
        'Админ-панель: модерация, пользователи, сделки, аналитика',
      ]
    }
  ],
};
