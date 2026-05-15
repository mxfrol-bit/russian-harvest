/**
 * Russian Harvest · v2.6.24
 * ============================================================
 * ПУБЛИКАЦИЯ 1С → КАТАЛОГ + РАЗДЕЛ ПРОДАТЬ
 * ============================================================
 * Назначение: превратить parsed JSON (от 1С CRM) в записи
 * в таблицах public.offers и public.buyer_requests, чтобы они
 * появились в каталоге Купить/Продать на сайте.
 *
 * Архитектура (v2.6.24):
 *  - Один JSON-файл potrebnost = N офферов (по числу поставщиков) + 1 заявка
 *  - Все офферы публикуются под системным seller (Импорт из 1С)
 *  - external_id = "1c_<Номер>_<НомерСтроки>" для идемпотентности
 *  - Контрагент/менеджер/raw-данные хранятся в offers.meta под RLS
 *  - Покупатель в Продать — анонимный через profiles_public.handle
 *
 * Нормализация на регулярках + словарях (без AI пока).
 * AI добавим в v2.6.25 если регулярок не хватит.
 * ============================================================
 */

(function() {
  'use strict';

  // ============================================================
  // КОНСТАНТЫ
  // ============================================================

  // UUID системного продавца «Импорт из 1С».
  // Создан INSERT-ом в Supabase (см. историю v2.6.24).
  // ВНИМАНИЕ: если поменяете системный профиль — обновить здесь!
  const SYSTEM_SELLER_ID = '30f6fd5d-6235-4596-9c52-b00f40c8bc21';

  // UUID системного покупателя «Импорт из 1С (покупатель)» (v2.6.25).
  // Используется для buyer_requests где buyer_id обязателен (NOT NULL).
  // Реальный buyer (ООО Клеман, ЭЛИНАР-БРОЙЛЕР и т.д.) хранится в meta.buyer_company.
  const SYSTEM_BUYER_ID = 'd3f38864-5ae3-429a-ae7c-3962fdec9a43';

  // Префикс external_id для идемпотентности.
  // Формат: 1c_<НомерЗаявки>_<НомерСтроки>
  // Например: 1c_000000258_1 → ООО Заречье из заявки 258
  const EXTERNAL_PREFIX = '1c';

  // ============================================================
  // СЛОВАРЬ КУЛЬТУР: «как в 1С» → crop_id
  // ============================================================
  // Маппинг свободного текста "Номенклатура" из 1С в crop_id таксономии.
  // Порядок важен: более специфичные совпадения сверху.
  // Если ничего не сматчилось — оффер помечается флагом нужна-ручная-проверка.
  const CROP_DICTIONARY = [
    // Пшеница с классами
    { re: /пшениц[аы].*продовольственн.*3\s*клас|пшениц.*3\s*класс/iu, crop: 'wheat-3', name: 'Пшеница продовольственная 3 класс' },
    { re: /пшениц[аы].*продовольственн.*4\s*клас|пшениц.*4\s*класс/iu, crop: 'wheat-4', name: 'Пшеница продовольственная 4 класс' },
    { re: /пшениц[аы].*кормов/iu, crop: 'wheat-feed', name: 'Пшеница кормовая' },
    { re: /пшениц[аы].*продовольственн/iu, crop: 'wheat-3', name: 'Пшеница продовольственная' },
    { re: /^пшениц/iu, crop: 'wheat', name: 'Пшеница' },

    // Ячмень
    { re: /ячмен.*пивоварен/iu, crop: 'barley-food', name: 'Ячмень пивоваренный' },
    { re: /ячмен.*кормов/iu, crop: 'barley-feed', name: 'Ячмень кормовой' },
    { re: /^ячмен/iu, crop: 'barley', name: 'Ячмень' },

    // Кукуруза
    { re: /кукуруз.*дроблён|кукуруз.*дроблен/iu, crop: 'corn-crushed', name: 'Кукуруза дроблёная' },
    { re: /^кукуруз/iu, crop: 'corn', name: 'Кукуруза' },

    // Соя
    { re: /сое?в.*продовольственн|сое?в.*пищ/iu, crop: 'soy-food', name: 'Соевые бобы продовольственные' },
    { re: /^сое?в|^сояб|^соя/iu, crop: 'soy', name: 'Соя' },

    // Горох
    { re: /горох.*кормов/iu, crop: 'pea-feed', name: 'Горох кормовой' },
    { re: /горох.*зелён|горох.*продовольственн/iu, crop: 'pea-food-green', name: 'Горох продовольственный зелёный' },
    { re: /^горох/iu, crop: 'pea', name: 'Горох' },

    // Подсолнечник
    { re: /подсолнечник|подсолнух/iu, crop: 'sunflower', name: 'Подсолнечник' },

    // Рапс
    { re: /рапс/iu, crop: 'rapeseed', name: 'Рапс' },

    // Остальные
    { re: /^овёс|^овес/iu, crop: 'oat', name: 'Овёс' },
    { re: /рожь/iu, crop: 'rye', name: 'Рожь' },
    { re: /гречих/iu, crop: 'buckwheat', name: 'Гречиха' },
    { re: /тритикале.*кормов/iu, crop: 'triticale-feed', name: 'Тритикале кормовое' },
    { re: /тритикале/iu, crop: 'triticale', name: 'Тритикале' },
    { re: /люпин/iu, crop: 'lupin', name: 'Люпин' },
    { re: /^вик/iu, crop: 'vetch', name: 'Вика' },
    { re: /нут.*бел/iu, crop: 'chickpea-white', name: 'Нут белый' },
    { re: /нут.*красн/iu, crop: 'chickpea-red', name: 'Нут красный' },
    { re: /^нут/iu, crop: 'chickpea', name: 'Нут' },
    { re: /чечевиц.*зелён/iu, crop: 'lentil-green', name: 'Чечевица зелёная' },
    { re: /чечевиц.*красн/iu, crop: 'lentil-red', name: 'Чечевица красная' },
    { re: /чечевиц/iu, crop: 'lentil', name: 'Чечевица' },
    { re: /горчиц.*семен/iu, crop: 'mustard-seeds', name: 'Горчица — семена' },
    { re: /горчиц/iu, crop: 'mustard', name: 'Горчица' },
    { re: /кориандр/iu, crop: 'coriander', name: 'Кориандр' },
    { re: /лён|лен.*маслич/iu, crop: 'flax-oil', name: 'Лён масличный — семена' },
    { re: /рыжик/iu, crop: 'camelina', name: 'Рыжик' },
  ];

  /**
   * Маппит свободный текст "Номенклатура" в crop_id.
   * @param {string} nomen — например "Соевые бобы на продовольственный цели "
   * @returns {{crop_id: string, normalized_name: string, matched: boolean}}
   */
  function mapCrop(nomen) {
    if (!nomen) return { crop_id: 'wheat', normalized_name: 'Пшеница', matched: false };
    const s = String(nomen).trim();
    for (const entry of CROP_DICTIONARY) {
      if (entry.re.test(s)) {
        return { crop_id: entry.crop, normalized_name: entry.name, matched: true };
      }
    }
    return { crop_id: 'wheat', normalized_name: s, matched: false };
  }

  // ============================================================
  // ОЧИСТКА ЧИСЕЛ С NBSP
  // ============================================================
  // 1С пишет "36 500" с NBSP (\u00A0) внутри числа.
  // Парсер JS-ом Number("36 500") = NaN — нужно почистить.
  function parseNum(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[\u00A0\s]/g, '').replace(',', '.').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  // ============================================================
  // GETFIELD — устойчивое чтение ключей JSON с/без пробелов
  // ============================================================
  // 1С экспортирует JSON с НЕСТАБИЛЬНЫМИ именами ключей. В одних
  // файлах "АдресВыгрузки", в других "Адрес выгрузки" (с пробелом).
  // То же со "СрокПоставки"/"Срок поставки", "ТипСделки"/"Тип сделки".
  // Эта функция ищет значение по всем вариантам ключей.
  //
  // Пример: getField(file, 'АдресВыгрузки', 'Адрес выгрузки')
  function getField(obj, ...keys) {
    if (!obj) return null;
    for (const k of keys) {
      if (k in obj && obj[k] != null && obj[k] !== '') return obj[k];
    }
    return null;
  }

  // ============================================================
  // ПАРСЕР АДРЕСА → {region, city}
  // ============================================================
  // Адреса в 1С приходят в двух форматах:
  //   1. "Рязанская область, р-н Захаровский, с Захарово, ул Строителей, д. 4 А"
  //   2. "188382,ОБЛАСТЬ ЛЕНИНГРАДСКАЯ,РАЙОН ГАТЧИНСКИЙ,,ДЕРЕВНЯ МИНЫ,УЛИЦА ШКОЛЬНАЯ,8,,"
  //
  // Цель: вытащить region (обл/край/респ) и city (нас.пункт).
  function parseAddress(addr) {
    if (!addr) return { region: '—', city: null, raw: '' };
    const raw = String(addr).trim();

    // Нормализация: убираем индексы, лишние запятые, нормализуем кейс
    let s = raw
      .replace(/^\d{6},/, '')           // 188382,...
      .replace(/,{2,}/g, ',')           // ,,, → ,
      .replace(/\s*,\s*/g, ', ')        // нормализованные запятые
      .trim();

    // Извлекаем регион
    let region = null;
    // Pattern 1: "Рязанская область", "Курская обл.", "Краснодарский край"
    const m1 = s.match(/(?:^|,\s*)([А-ЯЁA-Z][а-яёa-zА-ЯЁA-Z\-]+(?:ская|ский|ское|ской|кая|кий|кое|кой))\s+(?:область|обл\.?|край|респ\.?|республика)/iu);
    if (m1) {
      region = m1[1] + ' область'; // унифицируем
      // Спец-обработка края/республики
      if (/край/i.test(m1[0])) region = m1[1] + ' край';
      if (/респ/i.test(m1[0])) region = 'Республика ' + m1[1];
    } else {
      // Pattern 2: "ОБЛАСТЬ ЛЕНИНГРАДСКАЯ" (ФИАС-формат)
      const m2 = s.match(/ОБЛАСТЬ\s+([А-ЯЁ]+(?:АЯ|ЯЯ|ОЕ|ОЙ|КАЯ|КИЙ))/iu);
      if (m2) {
        // ЛЕНИНГРАДСКАЯ → Ленинградская область
        const name = m2[1][0] + m2[1].slice(1).toLowerCase();
        region = name + ' область';
      }
    }

    // Извлекаем город / нас.пункт
    let city = null;
    // "с Захарово" / "г Москва" / "пгт Новостройка" / "ДЕРЕВНЯ МИНЫ"
    const cityMatch = s.match(/(?:^|,\s*)(?:с\.?|г\.?|пгт\.?|пос\.?|д\.?|село|город|посёлок|деревня)\s+([А-ЯЁA-Z][а-яёa-zА-ЯЁA-Z\-]+(?:\s+[А-ЯЁA-Z][а-яёa-zА-ЯЁA-Z\-]+)?)/iu);
    if (cityMatch) {
      const word = cityMatch[1];
      // Если КАПС — приводим к нормальному регистру
      city = /^[А-ЯЁ]+$/.test(word) ? word[0] + word.slice(1).toLowerCase() : word;
    }

    return {
      region: region || '—',
      city: city,
      raw: raw,
    };
  }

  // ============================================================
  // ПАРСЕР КАЧЕСТВА «КачественныеПоказатели» → quality jsonb
  // ============================================================
  // Входы (реальные из БД):
  //   "40асв"                          → { asv_pct: 40 }
  //   "39асв влага в госте"            → { asv_pct: 39, gost: true }
  //   "гост"                           → { gost: true }
  //   "клей 24, белок 12"              → { klejkovina_pct: 24, belok_pct: 12 }
  //   "11.5 протеин"                   → { belok_pct: 11.5 }
  //   "число падения 406"              → { chp: 406 }
  function parseQualityString(qstr) {
    const out = {};
    if (!qstr) return out;
    const s = String(qstr).toLowerCase().replace(/[\u00A0]/g, ' ').trim();
    if (!s) return out;

    // ГОСТ-флаг
    if (/гост/i.test(s)) out.gost = true;

    // АСВ (абсолютно сухое вещество)
    const asv = s.match(/(\d+(?:[.,]\d+)?)\s*асв|асв\s*(\d+(?:[.,]\d+)?)/);
    if (asv) {
      out.asv_pct = parseNum((asv[1] || asv[2]).replace(',', '.'));
    }

    // Клейковина
    const klej = s.match(/(?:клейк|клей)\D*?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*клей/);
    if (klej) out.klejkovina_pct = parseNum((klej[1] || klej[2]).replace(',', '.'));

    // Белок / Протеин
    const bel = s.match(/(?:белок|протеин)\D*?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(?:белок|протеин)/);
    if (bel) out.belok_pct = parseNum((bel[1] || bel[2]).replace(',', '.'));

    // Влажность
    const vlaga = s.match(/влаг\w*\D*?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*влаг/);
    if (vlaga) out.vlaga_pct = parseNum((vlaga[1] || vlaga[2]).replace(',', '.'));

    // Число падения (ЧП)
    const chp = s.match(/(?:чп|число\s*падения)\D*?(\d+)/);
    if (chp) out.chp = parseNum(chp[1]);

    // Натура
    const natura = s.match(/натур\w*\D*?(\d+)/);
    if (natura) out.natura = parseNum(natura[1]);

    return out;
  }

  // ============================================================
  // АНОМАЛИИ — проверки для подсветки в превью
  // ============================================================
  function detectAnomalies(draft, allDrafts) {
    const flags = [];

    // 1. Цена 0 или null
    if (!draft.price_kopecks || draft.price_kopecks === 0) {
      flags.push({ level: 'error', text: 'Цена равна 0 — публиковать нельзя' });
    }

    // 2. Объём 0 или null
    if (!draft.volume_tons || draft.volume_tons <= 0) {
      flags.push({ level: 'error', text: 'Объём равен 0 — публиковать нельзя' });
    }

    // 3. Культура не распознана
    if (!draft._matched_crop) {
      flags.push({ level: 'warning', text: 'Культура не распознана из 1С, выбран wheat по умолчанию' });
    }

    // 4. Регион не распознан
    if (draft.region === '—' || !draft.region) {
      flags.push({ level: 'warning', text: 'Регион не распознан из адреса' });
    }

    // 5. Качество пустое
    if (!draft.quality || Object.keys(draft.quality).length === 0) {
      flags.push({ level: 'info', text: 'Показатели качества отсутствуют' });
    }

    // 6. Аномальная цена — отклонение от медианы > 50%
    if (draft.price_kopecks && allDrafts.length >= 3) {
      const prices = allDrafts
        .filter(d => d.price_kopecks > 0 && d.crop_id === draft.crop_id)
        .map(d => d.price_kopecks)
        .sort((a, b) => a - b);
      if (prices.length >= 3) {
        const median = prices[Math.floor(prices.length / 2)];
        const deviation = Math.abs(draft.price_kopecks - median) / median;
        if (deviation > 0.5) {
          const dir = draft.price_kopecks < median ? 'ниже' : 'выше';
          flags.push({
            level: 'warning',
            text: `Цена ${dir} медианы на ${Math.round(deviation * 100)}% — возможна опечатка в 1С`,
          });
        }
      }
    }

    return flags;
  }

  // ============================================================
  // ПОСТРОЕНИЕ ЧЕРНОВИКА OFFER ИЗ СТРОКИ ЗАКУПКА[]
  // ============================================================
  /**
   * Берёт строку Закупка[] + контекст файла, возвращает черновик offer
   * под INSERT INTO offers.
   *
   * @param {Object} row    — элемент Закупка[]: {НомерСтроки, Контрагент, ...}
   * @param {Object} file   — целиком JSON (для Номенклатуры, Номера, Покупателя)
   * @returns {Object}      — черновик с полями offers + meta + флаги
   */
  function buildOfferDraft(row, file) {
    // v2.6.26: getField — поддержка обоих форматов ключей 1С (с пробелами и без)
    const nomen = getField(file, 'Номенклатура', 'Номенклатура ');
    const cropMap = mapCrop(nomen);
    const address = parseAddress(getField(row, 'АдресЗагрузки', 'Адрес загрузки'));
    const qualityRaw = getField(row, 'КачественныеПоказатели', 'Качественные показатели');
    const quality = parseQualityString(qualityRaw);

    // Цена 36 500 → 36500 рублей → 3650000 копеек
    const priceRub = parseNum(getField(row, 'Цена')) || 0;
    const priceKopecks = Math.round(priceRub * 100);

    const volumeTons = parseNum(getField(row, 'Объем', 'Объём')) || 0;

    // external_id для идемпотентности
    const fileNumber = String(getField(file, 'Номер') || '').trim() || 'unknown';
    const rowNumber = String(getField(row, 'НомерСтроки', 'Номер строки') || '').trim() || '0';
    const externalId = `${EXTERNAL_PREFIX}_${fileNumber}_${rowNumber}`;

    // Дата активности — 30 дней с момента публикации
    const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();

    // Заголовок: используем нормализованное название культуры
    const title = cropMap.normalized_name;

    const contractor = getField(row, 'Контрагент');
    const managerFio = getField(row, 'ФИО', 'ФИО менеджера');

    // v2.6.27: геокодирование адреса загрузки → warehouse_lat/lng
    let warehouseLat = null, warehouseLng = null, geoSource = null;
    if (window.RH_GEO) {
      const geo = window.RH_GEO.resolve({ region: address.region, city: address.city });
      if (geo) {
        warehouseLat = geo.lat;
        warehouseLng = geo.lng;
        geoSource = geo.source; // 'city' | 'region'
      }
    }

    const draft = {
      // Обязательные поля offers
      seller_id: SYSTEM_SELLER_ID,
      crop_id: cropMap.crop_id,
      title: title,
      price_kopecks: priceKopecks,
      vat: 'with_vat_10',
      volume_tons: volumeTons,
      region: address.region,
      city: address.city,
      has_delivery: false,
      has_lab_analysis: false,
      quality: quality,
      status: 'active',
      harvest_year: 2025,
      expires_at: expiresAt,
      // v2.6.27: координаты для расчёта дистанции
      warehouse_lat: warehouseLat,
      warehouse_lng: warehouseLng,

      // Новые поля v2.6.22+
      external_id: externalId,
      external_source: '1c',
      meta: {
        contractor_name: contractor || null,
        manager_fio: managerFio || null,
        buyer_company: getField(file, 'Покупатель') || null,
        request_number: fileNumber,
        row_number: rowNumber,
        raw_address: address.raw,
        raw_quality: qualityRaw || null,
        raw_nomen: nomen || null,
        geo_source: geoSource,         // 'city'/'region' — для отладки и будущей точности
        imported_at: new Date().toISOString(),
      },

      // Служебные (не идут в БД, только для UI)
      _matched_crop: cropMap.matched,
      _supplier_label: contractor || `Поставщик #${rowNumber}`,
    };

    return draft;
  }

  // ============================================================
  // ПОСТРОЕНИЕ ЧЕРНОВИКА BUYER_REQUEST
  // ============================================================
  /**
   * Из файла potrebnost формирует 1 запись для buyer_requests.
   *
   * РЕАЛЬНАЯ СХЕМА buyer_requests (v2.6.25, после миграции):
   *   buyer_id          uuid NOT NULL          — системный, реальный в meta
   *   crop_id           text nullable
   *   title             text NOT NULL
   *   description       text nullable
   *   target_price_kopecks bigint nullable
   *   vat               vat_type default 'with_vat_10'
   *   volume_tons       numeric NOT NULL
   *   delivery_region   text NOT NULL          — !!! не region, а delivery_region
   *   delivery_city     text nullable          — !!! не city
   *   needed_by         date nullable
   *   status            request_status default 'open' (!) — не 'active'
   *   external_id       text unique            — добавлено миграцией v2.6.25
   *   external_source   text                   — добавлено миграцией v2.6.25
   *   meta              jsonb default '{}'     — добавлено миграцией v2.6.25
   *
   * Покупатель анонимизируется: buyer_id всегда системный, реальный
   * (ООО Клеман, ЭЛИНАР-БРОЙЛЕР) хранится в meta.buyer_company.
   * needed_by — пытаемся распарсить «СрокПоставки» из 1С, иначе NULL.
   */
  function buildBuyerRequestDraft(file) {
    // v2.6.26: используем getField чтобы поддержать обе версии ключей 1С
    // (с пробелами и без). В свежих экспортах 1С — с пробелами.
    const nomen = getField(file, 'Номенклатура', 'Номенклатура ');
    const cropMap = mapCrop(nomen);
    const totalVolume = parseNum(getField(file, 'Объём', 'Объем')) || 0;
    const totalSum = parseNum(getField(file, 'Сумма')) || 0;

    // Адрес выгрузки — может быть в корне файла, может быть в Закупка[0].
    // Ищем по обоим вариантам ключей.
    const deliveryAddr = getField(file, 'АдресВыгрузки', 'Адрес выгрузки')
      || (file.Закупка && file.Закупка[0] && getField(file.Закупка[0], 'АдресВыгрузки', 'Адрес выгрузки'))
      || null;
    const deliveryParsed = parseAddress(deliveryAddr || '');

    const fileNumber = String(getField(file, 'Номер') || '').trim() || 'unknown';
    const externalId = `${EXTERNAL_PREFIX}_req_${fileNumber}`;

    // Цена-таргет: если есть Сумма и Объём — рассчитаем удельную цену
    let targetPriceKopecks = null;
    if (totalSum > 0 && totalVolume > 0) {
      const perTon = totalSum / totalVolume;
      // Защита от дичи: если результат < 100 ₽ или > 200_000 ₽ за тонну
      if (perTon >= 100 && perTon <= 200000) {
        targetPriceKopecks = Math.round(perTon * 100);
      }
    }

    // Срок поставки — пытаемся распарсить дату.
    // Особый случай 1С: "01.01.0001 0:00:00" = «не задан» в 1С, игнорируем.
    let neededBy = null;
    const srok = getField(file, 'СрокПоставки', 'Срок поставки');
    if (srok && typeof srok === 'string' && !srok.startsWith('01.01.0001')) {
      const m = srok.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
      if (m && m[3] !== '0001') {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        neededBy = `${m[3]}-${mm}-${dd}`;
      }
    }

    return {
      buyer_id: SYSTEM_BUYER_ID,
      title: 'Закупка: ' + cropMap.normalized_name,
      volume_tons: totalVolume,
      delivery_region: deliveryParsed.region !== '—' ? deliveryParsed.region : 'Россия',
      status: 'open',
      crop_id: cropMap.crop_id,
      delivery_city: deliveryParsed.city,
      needed_by: neededBy,
      target_price_kopecks: targetPriceKopecks,
      vat: 'with_vat_10',
      // v2.6.27: координаты места выгрузки для расчёта дистанции
      delivery_lat: (function() {
        if (!window.RH_GEO) return null;
        const g = window.RH_GEO.resolve({ region: deliveryParsed.region, city: deliveryParsed.city });
        return g ? g.lat : null;
      })(),
      delivery_lng: (function() {
        if (!window.RH_GEO) return null;
        const g = window.RH_GEO.resolve({ region: deliveryParsed.region, city: deliveryParsed.city });
        return g ? g.lng : null;
      })(),
      external_id: externalId,
      external_source: '1c',
      meta: {
        buyer_company: getField(file, 'Покупатель') || null,
        request_number: fileNumber,
        date_1c: getField(file, 'Дата') || null,
        total_sum: totalSum,
        raw_nomen: nomen || null,
        raw_delivery_addr: deliveryParsed.raw,
        srok_postavki_raw: srok || null,
        suppliers_count: (file.Закупка || []).length,
        deal_type: getField(file, 'ТипСделки', 'Тип сделки') || null,
        source_margin: getField(file, 'ИсточникМаржинальности', 'Источник маржинальности') || null,
        imported_at: new Date().toISOString(),
      },
      _matched_crop: cropMap.matched,
    };
  }

  // ============================================================
  // СБОРКА ВСЕХ ЧЕРНОВИКОВ ИЗ ФАЙЛА
  // ============================================================
  function buildDrafts(file) {
    const suppliers = Array.isArray(file.Закупка) ? file.Закупка : [];
    const offerDrafts = suppliers.map(row => buildOfferDraft(row, file));

    // Аномалии — после построения всех (нужна медиана)
    offerDrafts.forEach(d => {
      d._anomalies = detectAnomalies(d, offerDrafts);
    });

    const buyerRequestDraft = buildBuyerRequestDraft(file);

    return {
      offers: offerDrafts,
      buyer_request: buyerRequestDraft,
      summary: {
        file_number: file.Номер,
        buyer: file.Покупатель,
        nomen: file.Номенклатура,
        offers_count: offerDrafts.length,
        total_volume: offerDrafts.reduce((s, d) => s + d.volume_tons, 0),
        publishable: offerDrafts.filter(d =>
          !d._anomalies.some(a => a.level === 'error')
        ).length,
      }
    };
  }

  // ============================================================
  // ПУБЛИКАЦИЯ В БД ЧЕРЕЗ api.import1c
  // ============================================================
  /**
   * Делает UPSERT в offers по external_id.
   * @param {Array} drafts — массив черновиков (от buildOfferDraft)
   * @param {Array<boolean>} selected — массив того же размера, true = публиковать
   * @returns {Promise<{inserted: number, errors: Array, offer_ids: Array}>}
   */
  async function publishOffers(drafts, selected) {
    if (!window.RH_API || !window.RH_API.import1c || !window.RH_API.import1c.publishOffers) {
      throw new Error('API метод publishOffers не доступен. Обновите страницу.');
    }

    const toPublish = drafts.filter((d, i) => selected[i]);
    if (toPublish.length === 0) return { inserted: 0, errors: [], offer_ids: [] };

    // Чистим служебные поля (_*) — в БД они не нужны
    const payload = toPublish.map(d => {
      const clean = { ...d };
      Object.keys(clean).forEach(k => {
        if (k.startsWith('_')) delete clean[k];
      });
      return clean;
    });

    return await window.RH_API.import1c.publishOffers(payload);
  }

  /**
   * Создаёт buyer_request (1 на файл).
   * Если таблица buyer_requests имеет другую структуру — вернёт {id:null, error}.
   */
  async function publishBuyerRequest(draft) {
    if (!window.RH_API || !window.RH_API.import1c || !window.RH_API.import1c.publishBuyerRequest) {
      return { id: null, error: 'API метод publishBuyerRequest не доступен' };
    }
    // Чистим служебные _* поля
    const clean = { ...draft };
    Object.keys(clean).forEach(k => { if (k.startsWith('_')) delete clean[k]; });
    return await window.RH_API.import1c.publishBuyerRequest(clean);
  }

  // ============================================================
  // ЭКСПОРТ ДЛЯ AdminImport1C
  // ============================================================
  window.RH_Import1C_Publish = {
    buildDrafts,
    buildOfferDraft,
    buildBuyerRequestDraft,
    publishOffers,
    publishBuyerRequest,
    // Утилиты для UI
    parseNum,
    parseAddress,
    parseQualityString,
    mapCrop,
  };

  console.log('[Import1C-Publish] loaded v2.6.24');
})();
