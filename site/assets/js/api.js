/**
 * API CLIENT — Русский Урожай (Supabase backend)
 * ================================================
 * Производственный клиент с реальной авторизацией, БД и Realtime
 * через Supabase. SDK загружается с CDN при первом обращении.
 *
 * Если в config USE_SUPABASE = false — fallback на старые моки (если есть).
 */

(function () {
  'use strict';

  const CFG = window.RH_CONFIG || {};
  const USE_SUPABASE = CFG.USE_SUPABASE !== false && CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY;

  let supabase = null;
  let supabaseLoadingPromise = null;

  // ============================================================
  // SDK LOADER (lazy-load Supabase JS via CDN)
  // ============================================================
  async function ensureSupabase() {
    if (supabase) return supabase;
    if (supabaseLoadingPromise) return supabaseLoadingPromise;

    supabaseLoadingPromise = (async () => {
      // Load SDK from CDN if not already on page
      if (!window.supabase) {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      }
      supabase = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'rh_supabase_auth'
        },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      return supabase;
    })();

    return supabaseLoadingPromise;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function k(rubles) { return Math.round(rubles * 100); }       // ₽ → копейки
  function r(kopecks) { return (kopecks || 0) / 100; }          // копейки → ₽
  function formatRub(kopecks) {
    return r(kopecks).toLocaleString('ru-RU') + ' ₽';
  }

  let cachedUser = null;

  async function getCurrentSession() {
    const sb = await ensureSupabase();
    const { data } = await sb.auth.getSession();
    return data.session;
  }

  async function getCurrentProfile() {
    if (cachedUser) return cachedUser;
    const session = await getCurrentSession();
    if (!session) return null;
    const sb = await ensureSupabase();
    const { data, error } = await sb.from('profiles')
      .select('*').eq('id', session.user.id).single();
    if (error) return null;
    cachedUser = { ...data, email: session.user.email };
    return cachedUser;
  }

  function clearCache() { cachedUser = null; }

  // ============================================================
  // PUBLIC API
  // ============================================================
  const api = {
    isDemo: !USE_SUPABASE,
    isSupabase: USE_SUPABASE,

    // ---- Helpers exposed for UI ----
    formatRub,
    rubles: r,
    kopecks: k,

    async ready() { return USE_SUPABASE ? ensureSupabase() : true; },

    // ===========================================================
    // AUTH
    // ===========================================================
    async signUp({ email, password, full_name, company_name, phone, inn, role, region }) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name || company_name,
            company_name,
            phone,
            inn,
            role: role || 'buyer',
            region: region || 'Нижегородская область'
          }
        }
      });
      if (error) throw error;
      clearCache();
      return data;
    },

    async signIn({ email, password }) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      clearCache();
      return data;
    },

    async signInWithMagicLink(email) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + '/account.html' }
      });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const sb = await ensureSupabase();
      await sb.auth.signOut();
      clearCache();
      return { ok: true };
    },

    async currentUser() {
      return getCurrentProfile();
    },

    async isLoggedIn() {
      const s = await getCurrentSession();
      return !!s;
    },

    async isAdmin() {
      const p = await getCurrentProfile();
      return p?.role === 'admin';
    },

    onAuthChange(callback) {
      ensureSupabase().then(sb => {
        sb.auth.onAuthStateChange((event, session) => {
          clearCache();
          callback(event, session);
        });
      });
    },

    // ===========================================================
    // PROFILE
    // ===========================================================
    async getProfile(userId = null) {
      const sb = await ensureSupabase();
      const id = userId || (await getCurrentSession())?.user?.id;
      if (!id) throw new Error('Не авторизован');
      const { data, error } = await sb.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async updateProfile(updates) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');
      const { data, error } = await sb.from('profiles')
        .update(updates).eq('id', session.user.id).select().single();
      if (error) throw error;
      clearCache();
      return data;
    },

    // ===========================================================
    // CROPS (справочник культур)
    // ===========================================================
    async listCrops() {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('crops').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },

    // ===========================================================
    // OFFERS
    // ===========================================================
    async listOffers(filters = {}) {
      const sb = await ensureSupabase();
      let q = sb.from('offers').select(`
        *,
        crop:crops(name, emoji, category),
        seller:profiles(id, company_name, full_name, rating, deals_count, is_verified, city, region)
      `).eq('status', 'active').order('created_at', { ascending: false });

      if (filters.crop_id) q = q.eq('crop_id', filters.crop_id);
      if (filters.region) q = q.eq('region', filters.region);
      if (filters.price_min) q = q.gte('price_kopecks', k(filters.price_min));
      if (filters.price_max) q = q.lte('price_kopecks', k(filters.price_max));
      if (filters.with_delivery) q = q.eq('has_delivery', true);
      if (filters.with_lab) q = q.eq('has_lab_analysis', true);
      if (filters.limit) q = q.limit(filters.limit);
      if (filters.search) q = q.ilike('title', `%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async getOffer(id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('offers').select(`
        *,
        crop:crops(*),
        seller:profiles(*)
      `).eq('id', id).single();
      if (error) throw error;
      // increment views
      await sb.rpc('increment', { table_name: 'offers', row_id: id, col_name: 'views_count' }).catch(() => {});
      return data;
    },

    async createOffer(payload) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');

      const offer = {
        seller_id: session.user.id,
        crop_id: payload.crop_id,
        title: payload.title,
        description: payload.description,
        price_kopecks: k(parseFloat(payload.price_per_ton)),
        vat: payload.vat || 'with_vat_10',
        volume_tons: parseFloat(payload.volume_tons),
        harvest_year: parseInt(payload.harvest_year) || new Date().getFullYear(),
        region: payload.region,
        city: payload.city,
        warehouse_address: payload.warehouse_address,
        has_delivery: !!payload.has_delivery,
        delivery_price_per_ton_kopecks: payload.delivery_price ? k(parseFloat(payload.delivery_price)) : 0,
        has_lab_analysis: !!payload.has_lab_analysis,
        quality: payload.quality || {},
        status: 'pending'  // ожидает модерации
      };
      const { data, error } = await sb.from('offers').insert(offer).select().single();
      if (error) throw error;
      return data;
    },

    async updateOffer(id, updates) {
      const sb = await ensureSupabase();
      // Convert price field if present
      if (updates.price_per_ton !== undefined) {
        updates.price_kopecks = k(parseFloat(updates.price_per_ton));
        delete updates.price_per_ton;
      }
      const { data, error } = await sb.from('offers')
        .update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async deleteOffer(id) {
      const sb = await ensureSupabase();
      const { error } = await sb.from('offers').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },

    async myOffers() {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');
      const { data, error } = await sb.from('offers')
        .select('*, crop:crops(name, emoji)')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    // ===========================================================
    // BUYER REQUESTS
    // ===========================================================
    async listRequests(filters = {}) {
      const sb = await ensureSupabase();
      let q = sb.from('buyer_requests').select(`
        *,
        crop:crops(name, emoji),
        buyer:profiles(id, company_name, full_name, rating, is_verified, region)
      `).eq('status', 'open').order('created_at', { ascending: false });

      if (filters.crop_id) q = q.eq('crop_id', filters.crop_id);
      if (filters.region) q = q.eq('delivery_region', filters.region);
      if (filters.limit) q = q.limit(filters.limit);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async createRequest(payload) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');

      const req = {
        buyer_id: session.user.id,
        crop_id: payload.crop_id,
        title: payload.title || payload.product,
        description: payload.description,
        target_price_kopecks: payload.target_price ? k(parseFloat(payload.target_price)) : null,
        vat: payload.vat || 'with_vat_10',
        volume_tons: parseFloat(payload.volume_tons || payload.volume || 0) || 0,
        delivery_region: payload.delivery_region || payload.location || 'Нижегородская область',
        delivery_city: payload.delivery_city,
        needed_by: payload.needed_by || null,
        status: 'open'
      };
      const { data, error } = await sb.from('buyer_requests').insert(req).select().single();
      if (error) throw error;
      return data;
    },

    async myRequests() {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');
      const { data, error } = await sb.from('buyer_requests')
        .select('*, crop:crops(name, emoji)')
        .eq('buyer_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    // ===========================================================
    // DEALS
    // ===========================================================
    async listMyDeals(status = null) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');
      let q = sb.from('deals').select(`
        *,
        crop:crops(name, emoji),
        buyer:profiles!deals_buyer_id_fkey(company_name, full_name, city),
        seller:profiles!deals_seller_id_fkey(company_name, full_name, city)
      `).or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async createDeal({ offer_id, volume_tons, delivery_address }) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');

      const offer = await this.getOffer(offer_id);
      const total = offer.price_kopecks * volume_tons;
      const delivery = (offer.has_delivery ? offer.delivery_price_per_ton_kopecks : 0) * volume_tons;

      const deal = {
        offer_id,
        buyer_id: session.user.id,
        seller_id: offer.seller_id,
        crop_id: offer.crop_id,
        volume_tons: parseFloat(volume_tons),
        price_per_ton_kopecks: offer.price_kopecks,
        total_amount_kopecks: total,
        delivery_amount_kopecks: delivery,
        grand_total_kopecks: total + delivery,
        delivery_address,
        status: 'pending'
      };
      const { data, error } = await sb.from('deals').insert(deal).select().single();
      if (error) throw error;
      return data;
    },

    // ===========================================================
    // AUCTIONS
    // ===========================================================
    async listAuctions(status = 'active') {
      const sb = await ensureSupabase();
      let q = sb.from('auctions').select(`
        *,
        crop:crops(name, emoji),
        seller:profiles(company_name, rating)
      `).order('ends_at', { ascending: true });
      if (status === 'active') {
        q = q.in('status', ['active', 'ending_soon']);
      } else if (status) {
        q = q.eq('status', status);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async getAuction(id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('auctions').select(`
        *,
        crop:crops(*),
        seller:profiles(*),
        bids:auction_bids(amount_kopecks, created_at, bidder:profiles(company_name))
      `).eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async placeBid(auction_id, amount_rubles) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');

      const amount_kopecks = k(parseFloat(amount_rubles));

      const { data: auction } = await sb.from('auctions').select('*').eq('id', auction_id).single();
      if (!auction) throw new Error('Аукцион не найден');
      if (auction.status !== 'active' && auction.status !== 'ending_soon') {
        throw new Error('Аукцион завершён');
      }
      if (amount_kopecks < auction.current_bid_kopecks + auction.min_step_kopecks) {
        throw new Error(`Минимальная ставка: ${formatRub(auction.current_bid_kopecks + auction.min_step_kopecks)}`);
      }

      const { error: bidError } = await sb.from('auction_bids').insert({
        auction_id, bidder_id: session.user.id, amount_kopecks
      });
      if (bidError) throw bidError;

      const { error: updError } = await sb.from('auctions').update({
        current_bid_kopecks: amount_kopecks,
        bids_count: auction.bids_count + 1
      }).eq('id', auction_id);
      if (updError) throw updError;

      return { ok: true, new_bid_kopecks: amount_kopecks };
    },

    async createAuction(payload) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');

      const auction = {
        seller_id: session.user.id,
        crop_id: payload.crop_id,
        title: payload.title,
        description: payload.description,
        volume_tons: parseFloat(payload.volume_tons),
        starting_price_kopecks: k(parseFloat(payload.starting_price)),
        current_bid_kopecks: k(parseFloat(payload.starting_price)),
        min_step_kopecks: k(parseFloat(payload.min_step || 100)),
        region: payload.region || 'Нижегородская область',
        ends_at: payload.ends_at,
        status: 'active'
      };
      const { data, error } = await sb.from('auctions').insert(auction).select().single();
      if (error) throw error;
      return data;
    },

    // Subscribe to auction updates (realtime)
    subscribeToAuction(auction_id, callback) {
      ensureSupabase().then(sb => {
        const channel = sb.channel(`auction:${auction_id}`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'auctions', filter: `id=eq.${auction_id}` },
            payload => callback('auction_update', payload.new)
          )
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `auction_id=eq.${auction_id}` },
            payload => callback('new_bid', payload.new)
          )
          .subscribe();
        return channel;
      });
    },

    // ===========================================================
    // MARKET PRICES
    // ===========================================================
    async getPrices(region = 'Нижегородская область') {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('market_prices')
        .select('*, crop:crops(name, emoji, category)')
        .eq('region', region)
        .order('recorded_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // Keep latest per crop
      const seen = new Set();
      return data.filter(p => {
        if (seen.has(p.crop_id)) return false;
        seen.add(p.crop_id);
        return true;
      });
    },

    // ===========================================================
    // FAVORITES
    // ===========================================================
    async toggleFavorite(offer_id) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');

      const { data: existing } = await sb.from('favorites')
        .select('*').eq('user_id', session.user.id).eq('offer_id', offer_id).maybeSingle();

      if (existing) {
        await sb.from('favorites').delete()
          .eq('user_id', session.user.id).eq('offer_id', offer_id);
        return { added: false };
      } else {
        await sb.from('favorites').insert({
          user_id: session.user.id, offer_id
        });
        return { added: true };
      }
    },

    async myFavorites() {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');
      const { data, error } = await sb.from('favorites')
        .select('offer:offers(*, crop:crops(name, emoji))')
        .eq('user_id', session.user.id);
      if (error) throw error;
      return data.map(f => f.offer).filter(Boolean);
    },

    // ===========================================================
    // ADMIN
    // ===========================================================
    async adminListPendingOffers() {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('offers')
        .select('*, crop:crops(name, emoji), seller:profiles(company_name, full_name, inn)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },

    async adminApproveOffer(id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('offers')
        .update({ status: 'active' }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminRejectOffer(id, reason) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('offers')
        .update({ status: 'rejected', description: (reason || 'Отклонено') })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminListUsers(role = null) {
      const sb = await ensureSupabase();
      let q = sb.from('profiles').select('*').order('created_at', { ascending: false });
      if (role) q = q.eq('role', role);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async adminVerifyUser(id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('profiles')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminStats() {
      const sb = await ensureSupabase();
      const [users, offers, deals, auctions] = await Promise.all([
        sb.from('profiles').select('id', { count: 'exact', head: true }),
        sb.from('offers').select('id, status', { count: 'exact' }),
        sb.from('deals').select('grand_total_kopecks, status'),
        sb.from('auctions').select('id, status', { count: 'exact', head: true })
      ]);
      const pendingOffers = (offers.data || []).filter(o => o.status === 'pending').length;
      const escrowDeals = (deals.data || []).filter(d => ['paid','shipping'].includes(d.status));
      const totalTurnover = (deals.data || []).reduce((s, d) => s + (d.grand_total_kopecks || 0), 0);
      const escrowAmount = escrowDeals.reduce((s, d) => s + (d.grand_total_kopecks || 0), 0);
      return {
        users_count: users.count,
        offers_count: offers.count,
        pending_offers: pendingOffers,
        deals_count: (deals.data || []).length,
        escrow_deals: escrowDeals.length,
        escrow_amount_kopecks: escrowAmount,
        total_turnover_kopecks: totalTurnover,
        auctions_count: auctions.count,
      };
    },

    // ===========================================================
    // CONTACT FORM (anonymous OK)
    // ===========================================================
    async sendContactForm(payload) {
      try {
        const sb = await ensureSupabase();
        await sb.from('audit_log').insert({
          action: 'contact_form_submitted',
          entity_type: 'contact',
          details: payload
        });
      } catch (e) {}
      return { ok: true, ticket: 'T-' + Date.now().toString().slice(-6) };
    },

    // ===========================================================
    // PLATFORM SETTINGS (feature flags)
    // ===========================================================
    async getFeatureFlags() {
      try {
        const sb = await ensureSupabase();
        const { data } = await sb.from('platform_settings').select('key, value');
        const flags = {};
        (data || []).forEach(row => {
          if (row.key.startsWith('feature_')) {
            const key = row.key.replace('feature_', '');
            flags[key] = !!row.value?.enabled;
          }
        });
        return flags;
      } catch (e) {
        console.warn('[features] load failed', e);
        return {};
      }
    },

    async adminToggleFeature(featureKey, enabled) {
      const sb = await ensureSupabase();
      const key = 'feature_' + featureKey;
      const { error } = await sb.from('platform_settings')
        .update({ value: { enabled }, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
      return { ok: true };
    },

    // Apply feature visibility to DOM elements with data-feature attribute
    async applyFeatureFlags() {
      const flags = await this.getFeatureFlags();
      document.querySelectorAll('[data-feature]').forEach(el => {
        const feat = el.dataset.feature;
        const enabled = !!flags[feat];
        el.style.display = enabled ? '' : 'none';
      });
      return flags;
    },

    // ===========================================================
    // ADMIN ROLE MANAGEMENT
    // ===========================================================
    async adminSetUserRole(userId, role) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('profiles')
        .update({ role }).eq('id', userId).select().single();
      if (error) throw error;
      return data;
    }
  };

  // Expose globally
  window.RH_API = api;

  // Setup auth state listener — reflect in UI
  if (USE_SUPABASE) {
    api.ready().then(() => {
      api.onAuthChange(async (event, session) => {
        const isLoggedIn = !!session;
        document.querySelectorAll('[data-show-auth="logged-in"]').forEach(el => {
          el.style.display = isLoggedIn ? '' : 'none';
        });
        document.querySelectorAll('[data-show-auth="logged-out"]').forEach(el => {
          el.style.display = isLoggedIn ? 'none' : '';
        });
        document.querySelectorAll('[data-open="login"]').forEach(b => {
          b.style.display = isLoggedIn ? 'none' : '';
        });
        if (isLoggedIn && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          document.dispatchEvent(new CustomEvent('rh:user-loaded'));
        }
      });
      // Initial check
      api.isLoggedIn().then(loggedIn => {
        if (loggedIn) {
          document.querySelectorAll('[data-open="login"]').forEach(b => b.style.display = 'none');
        }
      });
    });
  }
})();
