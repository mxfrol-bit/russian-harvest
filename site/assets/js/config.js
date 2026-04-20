/**
 * RUNTIME CONFIGURATION
 * =====================
 * Этот файл загружается до всего остального JS и задаёт режим работы.
 *
 * DEMO-РЕЖИМ (по умолчанию):
 *   API_BASE_URL = null — все запросы идут в локальный мок.
 *   Сайт полностью работает на статике, никакого бекенда не нужно.
 *
 * PRODUCTION:
 *   Укажите адрес вашего API-сервера (без завершающего слеша):
 *     API_BASE_URL: 'https://api.russian-harvest.ru'
 *
 *   Все запросы будут идти на /offers, /auth/sms/send и т.д.
 *   Бекенд должен реализовать эндпоинты по контракту из assets/js/api.js
 *   (см. docs/API.md для полного списка).
 *
 * ПЕРЕОПРЕДЕЛЕНИЕ ЧЕРЕЗ ПЕРЕМЕННУЮ ОКРУЖЕНИЯ (для CI/Netlify/Vercel):
 *   Во время билда можно подменить этот файл через scripts/inject-config.sh
 *   или задать window.RH_CONFIG в другом месте до подключения api.js.
 */

window.RH_CONFIG = {
  // API
  API_BASE_URL: null,  // null = DEMO; example: 'https://api.russian-harvest.ru/v1'

  // Maps / distance provider
  MAPS_API_KEY: null,  // Yandex Maps API key (опционально, для реальной геолокации)

  // Analytics (опционально)
  YANDEX_METRIKA_ID: null,
  GA_ID: null,

  // Support
  SUPPORT_PHONE: '+7-930-012-97-97',
  SUPPORT_EMAIL: 'support@russian-harvest.ru',
  SUPPORT_TELEGRAM: 'tdrusagro',

  // Feature flags
  FEATURES: {
    escrow_enabled: true,
    map_view: false,   // планируется
    b2b_negotiation: true,
  },

  // App meta
  VERSION: '1.0.0',
  BUILD_DATE: '2026-04-20',
};
