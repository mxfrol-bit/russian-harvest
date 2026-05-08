/**
 * ГОРОДА — справочник
 * ===================
 * MVP-версия: подключена только Нижегородская область.
 * Список грузится асинхронно из view public.rh_cities (47 городов НО),
 * чтобы при добавлении нового города в БД фронт автоматически его подхватывал
 * без правки кода.
 *
 * До прихода ответа из БД (offline / медленная сеть) — работает фолбек
 * из топ-10 городов НО, чтобы City Picker не был пустым.
 *
 * v2.6.4: убран хардкод 150 городов России (Москва, СПб, Краснодар и т.д.)
 *         — этого региона мы пока физически не обслуживаем.
 */

(function(){
  // Фолбек — топ-10 городов Нижегородской области (используется до прихода ответа из БД).
  // Совпадает по полям с view rh_cities: { id, name, region, lat, lng, pop, kind }.
  window.RH_CITIES = [
    { id:'nn-nizhny-novgorod', name:'Нижний Новгород', region:'Нижегородская область', lat:56.3269, lng:44.0075, pop:1252236, kind:'city' },
    { id:'nn-dzerzhinsk',      name:'Дзержинск',       region:'Нижегородская область', lat:56.2375, lng:43.4628, pop:229000,  kind:'city' },
    { id:'nn-arzamas',         name:'Арзамас',         region:'Нижегородская область', lat:55.3940, lng:43.8403, pop:101500,  kind:'city' },
    { id:'nn-sarov',           name:'Саров',           region:'Нижегородская область', lat:54.9281, lng:43.3279, pop:95600,   kind:'city' },
    { id:'nn-bor',             name:'Бор',             region:'Нижегородская область', lat:56.3581, lng:44.0636, pop:78200,   kind:'city' },
    { id:'nn-kstovo',          name:'Кстово',          region:'Нижегородская область', lat:56.1464, lng:44.2000, pop:66700,   kind:'city' },
    { id:'nn-pavlovo',         name:'Павлово',         region:'Нижегородская область', lat:55.9672, lng:43.0850, pop:56800,   kind:'city' },
    { id:'nn-vyksa',           name:'Выкса',           region:'Нижегородская область', lat:55.3183, lng:42.1728, pop:53000,   kind:'city' },
    { id:'nn-balakhna',        name:'Балахна',         region:'Нижегородская область', lat:56.4956, lng:43.5961, pop:46900,   kind:'city' },
    { id:'nn-kulebaki',        name:'Кулебаки',        region:'Нижегородская область', lat:55.4175, lng:42.5228, pop:32700,   kind:'city' },
  ];

  // Геопоиск — ближайший город по lat/lng (Pythagoras на градусах достаточно для НО).
  window.RH_CITIES_FIND_BY_COORDS = function(lat, lng) {
    let best = null, bestD = Infinity;
    for (const c of window.RH_CITIES) {
      const d = Math.hypot(c.lat - lat, c.lng - lng);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };

  // Поиск по имени / региону.
  window.RH_CITIES_SEARCH = function(query, limit = 10) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      return window.RH_CITIES.slice().sort((a,b) => (b.pop||0) - (a.pop||0)).slice(0, limit);
    }
    const startsWith = [];
    const contains = [];
    window.RH_CITIES.forEach(c => {
      const name = c.name.toLowerCase();
      const region = (c.region || '').toLowerCase();
      if (name.startsWith(q)) startsWith.push(c);
      else if (name.includes(q) || region.includes(q)) contains.push(c);
    });
    return [...startsWith, ...contains].slice(0, limit);
  };

  // Асинхронная подгрузка полного списка из view rh_cities.
  // После успеха window.RH_CITIES перезаписывается; компоненты слушают
  // событие 'rh:cities-loaded' и пере-рендерят выпадушки.
  function loadFromDB() {
    const cfg = window.RH_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      console.info('[cities] no Supabase config — using fallback list of', window.RH_CITIES.length, 'НО cities');
      return;
    }
    const url = `${cfg.SUPABASE_URL}/rest/v1/rh_cities?select=id,name,region,lat,lng,pop,kind&order=pop.desc.nullslast`;
    fetch(url, {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0) {
          window.RH_CITIES = rows;
          console.info('[cities] loaded', rows.length, 'cities from DB');
          window.dispatchEvent(new CustomEvent('rh:cities-loaded', { detail: { count: rows.length } }));
        }
      })
      .catch(e => {
        console.warn('[cities] DB load failed, fallback list active:', e.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFromDB);
  } else {
    loadFromDB();
  }
})();
