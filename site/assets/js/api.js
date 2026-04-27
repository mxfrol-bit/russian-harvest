/**
 * API CLIENT — Русский Урожай
 * ============================
 * Единая точка доступа к бэкенду. По умолчанию работает в DEMO-режиме
 * (отдаёт встроенные данные, эмулирует задержку сети), чтобы фронт можно
 * было запустить на любом статическом хостинге без сервера.
 *
 * Чтобы подключить реальный API — заменить window.RH_CONFIG.API_BASE_URL
 * на адрес вашего бекенда (см. /config.js).
 */

(function () {
  const CFG = window.RH_CONFIG || {};
  const BASE = CFG.API_BASE_URL || null;
  const IS_DEMO = !BASE;

  // ---- Network wrapper ----
  async function http(method, path, body = null) {
    if (IS_DEMO) {
      // Demo: simulate latency + route to local mock
      await sleep(220 + Math.random() * 180);
      return demoHandler(method, path, body);
    }
    const url = BASE.replace(/\/$/, '') + path;
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Network error');
    }
    return res.json();
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ---- Auth token storage ----
  const TOKEN_KEY = 'rh_token';
  const USER_KEY = 'rh_user';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  function setToken(t) {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {}
  }
  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function setUser(u) {
    try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {}
  }

  // ======================================================
  // PUBLIC API
  // ======================================================
  const api = {
    isDemo: IS_DEMO,

    // ---- Auth ----
    async sendSmsCode(phone) {
      return http('POST', '/auth/sms/send', { phone });
    },
    async verifyCode(phone, code) {
      const r = await http('POST', '/auth/sms/verify', { phone, code });
      if (r.token) setToken(r.token);
      if (r.user) setUser(r.user);
      return r;
    },
    async register(payload) {
      const r = await http('POST', '/auth/register', payload);
      if (r.token) setToken(r.token);
      if (r.user) setUser(r.user);
      return r;
    },
    async logout() {
      setToken(null); setUser(null);
      if (!IS_DEMO) await http('POST', '/auth/logout').catch(() => {});
      return { ok: true };
    },
    async loginWithCredentials(username, password) {
      const r = await http('POST', '/auth/login', { username, password });
      if (r.token) setToken(r.token);
      if (r.user) setUser(r.user);
      return r;
    },
    isLoggedIn() { return !!getToken(); },
    currentUser() { return getUser(); },
    isAdmin() { return (getUser()?.role === 'admin'); },

    // ---- Offers (Купить) ----
    async listOffers(filters = {}) {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v != null && v !== '' && v !== false) q.append(k, v);
      });
      return http('GET', '/offers?' + q.toString());
    },
    async getOffer(id) { return http('GET', '/offers/' + id); },
    async createOffer(p) { return http('POST', '/offers', p); },
    async updateOffer(id, p) { return http('PATCH', '/offers/' + id, p); },
    async deleteOffer(id) { return http('DELETE', '/offers/' + id); },

    // ---- Buyer requests (Продать — заявки от покупателей) ----
    async listRequests(filters = {}) {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v != null && v !== '' && v !== false) q.append(k, v);
      });
      return http('GET', '/requests?' + q.toString());
    },
    async createRequest(p) { return http('POST', '/requests', p); },

    // ---- Deals ----
    async listDeals(status = null) {
      const q = status ? '?status=' + status : '';
      return http('GET', '/deals' + q);
    },
    async getDeal(id) { return http('GET', '/deals/' + id); },
    async createDeal(offerId, payload) {
      return http('POST', '/deals', { offer_id: offerId, ...payload });
    },

    // ---- Market prices ----
    async getPrices(region = 'nn') { return http('GET', '/market/prices?region=' + region); },

    // ---- Distance calculator ----
    async calcDistance(from, to) {
      return http('POST', '/logistics/distance', { from, to });
    },

    // ---- Profile ----
    async getProfile() { return http('GET', '/me'); },
    async updateProfile(p) { return http('PATCH', '/me', p); },

    // ---- Support / contact ----
    async sendContactForm(p) { return http('POST', '/contact', p); },
  };

  // ======================================================
  // DEMO HANDLER — mocks every endpoint from the OFFERS data
  // rendered into the page at build time. No server needed.
  // ======================================================
  function demoHandler(method, path, body) {
    const m = path.match(/^([^?]+)(?:\?(.*))?$/);
    const route = m[1];
    const qs = new URLSearchParams(m[2] || '');

    // Helper: read offers from the DOM (they're rendered into the catalog)
    const readOffersFromDom = () => {
      const cards = document.querySelectorAll('.card[data-offer]');
      return Array.from(cards).map(c => ({
        id: c.dataset.offer,
        title: c.dataset.title,
        crop: c.dataset.crop,
        region: c.dataset.region,
        price: parseFloat(c.dataset.price),
        distance_km: parseFloat(c.dataset.distance),
        has_delivery: c.dataset.delivery === '1',
        has_vat: c.dataset.vat === '1',
        has_lab: c.dataset.lab === '1',
      }));
    };

    // ---- AUTH ----
    if (route === '/auth/sms/send' && method === 'POST') {
      return { ok: true, message: 'SMS отправлено. Демо-код: 12345' };
    }
    if (route === '/auth/sms/verify' && method === 'POST') {
      if (body.code !== '12345') {
        throw new Error('Неверный код (в демо используйте 12345)');
      }
      return {
        token: 'demo-' + Date.now(),
        user: {
          id: 'u_demo_1',
          phone: body.phone,
          name: 'Владимир Ф.',
          company: 'ИП Фролов В.А.',
          role: 'buyer',
          balance: 0,
        }
      };
    }
    // Login with username/password (demo accounts)
    if (route === '/auth/login' && method === 'POST') {
      const { username, password } = body;
      if (username === 'admin' && password === 'admin') {
        return {
          token: 'demo-admin-' + Date.now(),
          user: {
            id: 'u_admin',
            username: 'admin',
            name: 'Администратор',
            company: 'Русский Урожай',
            role: 'admin',
            balance: 0,
          }
        };
      }
      if (username === 'user' && password === 'user') {
        return {
          token: 'demo-user-' + Date.now(),
          user: {
            id: 'u_user',
            username: 'user',
            name: 'Демо Пользователь',
            company: 'ИП Тестовый В.А.',
            role: 'buyer',
            balance: 450000,
          }
        };
      }
      throw new Error('Неверный логин или пароль. Используйте admin/admin или user/user');
    }
    if (route === '/auth/register' && method === 'POST') {
      return {
        token: 'demo-' + Date.now(),
        user: {
          id: 'u_' + Date.now(),
          phone: body.phone,
          name: body.company,
          company: body.company,
          inn: body.inn,
          role: body.role || 'buyer',
          balance: 0,
        }
      };
    }

    // ---- CITIES (city search / geocoding) ----
    if (route === '/cities/search' && method === 'GET') {
      const q = (qs.get('q') || '').toLowerCase();
      const all = window.RH_CITIES || [];
      const matches = all.filter(c => c.name.toLowerCase().includes(q) || c.name_en?.toLowerCase().includes(q)).slice(0, 20);
      return { items: matches };
    }
    if (route === '/cities/geolocate' && method === 'POST') {
      // body = { lat, lng }
      const all = window.RH_CITIES || [];
      let best = null, bestD = Infinity;
      for (const c of all) {
        const d = Math.hypot(c.lat - body.lat, c.lng - body.lng);
        if (d < bestD) { bestD = d; best = c; }
      }
      return best || { name: 'Нижний Новгород', region: 'Нижегородская область', lat: 56.3269, lng: 44.0075 };
    }

    // ---- AUCTIONS ----
    if (route === '/auctions' && method === 'GET') {
      return {
        items: [
          { id: 'AU-001', title: 'Пшеница 3 класс · 500 т', current_bid: 14800, starting: 13500, region: 'Саратов', distance_km: 689, ends_at: new Date(Date.now() + 3600*1000*4.5).toISOString(), bids_count: 12, status: 'active' },
          { id: 'AU-002', title: 'Подсолнечник · 250 т',   current_bid: 29200, starting: 27000, region: 'Воронеж', distance_km: 580, ends_at: new Date(Date.now() + 3600*1000*12).toISOString(), bids_count: 8, status: 'active' },
          { id: 'AU-003', title: 'Кукуруза · 400 т',        current_bid: 15400, starting: 14500, region: 'Липецк',  distance_km: 634, ends_at: new Date(Date.now() + 3600*1000*1.2).toISOString(), bids_count: 23, status: 'ending-soon' },
          { id: 'AU-004', title: 'Рапс · 180 т',            current_bid: 32800, starting: 30000, region: 'Саранск', distance_km: 413, ends_at: new Date(Date.now() + 3600*1000*26).toISOString(), bids_count: 5, status: 'active' },
          { id: 'AU-005', title: 'Ячмень пивоваренный · 300 т', current_bid: 16900, starting: 15800, region: 'Чебоксары', distance_km: 235, ends_at: new Date(Date.now() + 3600*1000*8).toISOString(), bids_count: 14, status: 'active' },
          { id: 'AU-006', title: 'Соя · 120 т',             current_bid: 40100, starting: 38000, region: 'Казань',  distance_km: 407, ends_at: new Date(Date.now() + 3600*1000*18).toISOString(), bids_count: 9, status: 'active' },
        ]
      };
    }
    if (route.startsWith('/auctions/') && route.endsWith('/bid') && method === 'POST') {
      return { ok: true, new_bid: body.amount, bids_count: Math.floor(Math.random()*30)+1 };
    }

    // ---- OFFERS ----
    if (route === '/offers' && method === 'GET') {
      return { items: readOffersFromDom(), total: document.querySelectorAll('.card[data-offer]').length };
    }
    if (route.startsWith('/offers/') && method === 'GET') {
      const id = route.split('/')[2];
      const card = document.querySelector(`.card[data-offer="${id}"]`);
      if (!card) throw new Error('Оффер не найден');
      return {
        id,
        title: card.dataset.title,
        region: card.dataset.region,
        price: parseFloat(card.dataset.price),
        distance_km: parseFloat(card.dataset.distance),
      };
    }
    if (route === '/offers' && method === 'POST') {
      return { id: 'new_' + Date.now(), ...body, status: 'draft' };
    }

    // ---- DEALS ----
    if (route === '/deals' && method === 'GET') {
      return {
        items: [
          { id: 'СД-4721', status: 'shipping', title: 'Пшеница 3 класс · 120 т', amount: 1920000 },
          { id: 'СД-4698', status: 'pending',  title: 'Ячмень кормовой · 40 т',  amount:  538000 },
          { id: 'СД-4665', status: 'paid',     title: 'Кукуруза · 80 т',           amount: 1236000 },
        ]
      };
    }

    // ---- MARKET ----
    if (route === '/market/prices' && method === 'GET') {
      return {
        region: qs.get('region') || 'nn',
        updated_at: new Date().toISOString(),
        prices: [
          { crop: 'wheat-3',     median: 14200, change: +1.8 },
          { crop: 'wheat-4',     median: 12100, change: -0.4 },
          { crop: 'barley',      median: 13050, change: +0.6 },
          { crop: 'corn',        median: 15100, change: +2.3 },
          { crop: 'sunflower',   median: 28400, change: -1.1 },
          { crop: 'oat',         median: 10800, change: +0.8 },
          { crop: 'rapeseed',    median: 32100, change: +3.2 },
          { crop: 'soy',         median: 39500, change: -0.3 },
        ]
      };
    }

    // ---- DISTANCE ----
    if (route === '/logistics/distance' && method === 'POST') {
      // Crude demo: pre-baked distances
      const table = {
        'Балаково': 539.4, 'Балахна': 39, 'Дзержинск': 38, 'Арзамас': 112,
        'Кстово': 24, 'Семёнов': 71, 'Павлово': 79, 'Сергач': 158,
        'Муром': 137, 'Выкса': 186, 'Казань': 407, 'Рязань': 287,
      };
      const km = table[body.from] || (200 + Math.random() * 400);
      return { from: body.from, to: body.to, distance_km: +km.toFixed(1), duration_hours: +(km / 60).toFixed(1) };
    }

    // ---- PROFILE ----
    if (route === '/me' && method === 'GET') {
      const u = getUser();
      if (!u) throw new Error('Не авторизован');
      return u;
    }
    if (route === '/me' && method === 'PATCH') {
      const u = { ...getUser(), ...body };
      setUser(u);
      return u;
    }

    // ---- CONTACT ----
    if (route === '/contact' && method === 'POST') {
      return { ok: true, ticket: 'T-' + Date.now().toString().slice(-6) };
    }
    if (route === '/requests' && method === 'POST') {
      return { ok: true, id: 'Q-' + Date.now().toString().slice(-4) };
    }

    throw new Error('Demo: неизвестный endpoint ' + method + ' ' + path);
  }

  // Expose
  window.RH_API = api;
  window.RH_API.getToken = getToken;
  window.RH_API.getUser = getUser;

  // Reflect login state on the header (hide "Войти" if logged in)
  document.addEventListener('DOMContentLoaded', () => {
    if (api.isLoggedIn()) {
      document.querySelectorAll('[data-open="login"]').forEach(b => b.style.display = 'none');
    }
  });

})();
