/**
 * RUNTIME CONFIGURATION — Production
 * ===================================
 * Подключение к реальному Supabase backend.
 * Для DEMO-режима: USE_SUPABASE: false
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

  VERSION: '2.0.0',
  BUILD_DATE: '2026-04-29',
};
