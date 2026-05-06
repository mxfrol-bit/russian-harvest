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
        seller:profiles_public!offers_seller_id_fkey(id, handle, role, rating, deals_count, is_verified, city, region)
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
        seller:profiles_public!offers_seller_id_fkey(id, handle, role, rating, deals_count, is_verified, city, region, avatar_url, bio)
      `).eq('id', id).single();
      if (error) throw error;
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
        buyer:profiles_public!buyer_requests_buyer_id_fkey(id, handle, role, rating, is_verified, region, city)
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
        buyer:profiles_public!deals_buyer_id_fkey(id, handle, role, city, region, rating, is_verified),
        seller:profiles_public!deals_seller_id_fkey(id, handle, role, city, region, rating, is_verified)
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
        seller:profiles_public!auctions_seller_id_fkey(id, handle, rating, is_verified)
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
        seller:profiles_public!auctions_seller_id_fkey(id, handle, role, rating, deals_count, is_verified, region),
        bids:auction_bids(amount_kopecks, created_at, bidder:profiles_public!auction_bids_bidder_id_fkey(id, handle))
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
        .select('*, crop:crops(name, emoji), seller:profiles!offers_seller_id_fkey(company_name, full_name, inn)')
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
      // Use count-only queries to avoid embed issues and reduce payload
      const [
        usersCount, sellersCount, buyersCount, adminsCount, verifiedCount,
        offersAll, offersPending, offersActive, offersSold, offersRejected, offersArchived,
        dealsAll, dealsPaid, dealsShipping, dealsCompleted, dealsCancelled, dealsDisputed,
        requestsAll, requestsOpen, requestsClosed,
        auctionsCount,
        // For totals — need actual data
        completedDealsAmounts, escrowDealsAmounts
      ] = await Promise.all([
        sb.from('profiles').select('id', { count: 'exact', head: true }),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'buyer'),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),

        sb.from('offers').select('id', { count: 'exact', head: true }),
        sb.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
        sb.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        sb.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'archived'),

        sb.from('deals').select('id', { count: 'exact', head: true }),
        sb.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        sb.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'shipping'),
        sb.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        sb.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
        sb.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'disputed'),

        sb.from('buyer_requests').select('id', { count: 'exact', head: true }),
        sb.from('buyer_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        sb.from('buyer_requests').select('id', { count: 'exact', head: true }).eq('status', 'closed'),

        sb.from('auctions').select('id', { count: 'exact', head: true }),

        sb.from('deals').select('grand_total_kopecks').eq('status', 'completed'),
        sb.from('deals').select('grand_total_kopecks').in('status', ['paid', 'shipping'])
      ]);

      const totalRevenue = (completedDealsAmounts.data || [])
        .reduce((s, d) => s + (d.grand_total_kopecks || 0), 0);
      const inEscrow = (escrowDealsAmounts.data || [])
        .reduce((s, d) => s + (d.grand_total_kopecks || 0), 0);

      return {
        users_count: usersCount.count || 0,
        sellers_count: sellersCount.count || 0,
        buyers_count: buyersCount.count || 0,
        admins_count: adminsCount.count || 0,
        verified_count: verifiedCount.count || 0,

        offers_count: offersAll.count || 0,
        pending_offers: offersPending.count || 0,
        active_offers: offersActive.count || 0,
        sold_offers: offersSold.count || 0,
        rejected_offers: offersRejected.count || 0,
        archived_offers: offersArchived.count || 0,

        deals_count: dealsAll.count || 0,
        paid_deals: dealsPaid.count || 0,
        shipping_deals: dealsShipping.count || 0,
        completed_deals: dealsCompleted.count || 0,
        cancelled_deals: dealsCancelled.count || 0,
        disputed_deals: dealsDisputed.count || 0,
        escrow_deals: (dealsPaid.count || 0) + (dealsShipping.count || 0),

        requests_count: requestsAll.count || 0,
        open_requests: requestsOpen.count || 0,
        closed_requests: requestsClosed.count || 0,

        auctions_count: auctionsCount.count || 0,

        total_revenue_kopecks: totalRevenue,
        total_turnover_kopecks: totalRevenue,
        in_escrow_kopecks: inEscrow,
        escrow_amount_kopecks: inEscrow,
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
    },

    async adminDeleteUser(userId) {
      const sb = await ensureSupabase();
      // Cascade delete: profile delete cascades to offers/requests/deals via FK
      const { error } = await sb.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      return { ok: true };
    },

    // ===========================================================
    // ADMIN: ALL OFFERS / DEALS / REQUESTS (across platform)
    // ===========================================================
    async adminListAllOffers(status = null) {
      const sb = await ensureSupabase();
      let q = sb.from('offers').select(`
        *,
        crop:crops(name, emoji),
        seller:profiles!offers_seller_id_fkey(id, company_name, full_name, inn, email)
      `).order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async adminUpdateOfferStatus(id, status) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('offers')
        .update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminDeleteOffer(id) {
      const sb = await ensureSupabase();
      const { error } = await sb.from('offers').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },

    async adminListAllDeals(status = null) {
      const sb = await ensureSupabase();
      let q = sb.from('deals').select(`
        *,
        crop:crops(name, emoji),
        buyer:profiles!deals_buyer_id_fkey(id, company_name, full_name, email),
        seller:profiles!deals_seller_id_fkey(id, company_name, full_name, email)
      `).order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async adminUpdateDealStatus(id, status) {
      const sb = await ensureSupabase();
      const updates = { status };
      // Set timestamps based on status transitions
      if (status === 'paid') updates.paid_at = new Date().toISOString();
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      const { data, error } = await sb.from('deals')
        .update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminDeleteDeal(id) {
      const sb = await ensureSupabase();
      const { error } = await sb.from('deals').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },

    async adminListAllRequests(status = null) {
      const sb = await ensureSupabase();
      let q = sb.from('buyer_requests').select(`
        *,
        crop:crops(name, emoji),
        buyer:profiles!buyer_requests_buyer_id_fkey(id, company_name, full_name, email)
      `).order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async adminUpdateRequestStatus(id, status) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('buyer_requests')
        .update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminUpdateRequest(id, updates) {
      const sb = await ensureSupabase();
      // Convert price field if present
      const payload = { ...updates };
      if (payload.target_price !== undefined) {
        payload.target_price_kopecks = payload.target_price ? k(parseFloat(payload.target_price)) : null;
        delete payload.target_price;
      }
      if (payload.volume_tons !== undefined) {
        payload.volume_tons = parseFloat(payload.volume_tons);
      }
      const { data, error } = await sb.from('buyer_requests')
        .update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminGetRequest(id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('buyer_requests').select(`
        *,
        crop:crops(*),
        buyer:profiles!buyer_requests_buyer_id_fkey(id, company_name, full_name, email, phone, inn)
      `).eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async adminUpdateOffer(id, updates) {
      const sb = await ensureSupabase();
      const payload = { ...updates };
      if (payload.price_per_ton !== undefined) {
        payload.price_kopecks = payload.price_per_ton ? k(parseFloat(payload.price_per_ton)) : null;
        delete payload.price_per_ton;
      }
      if (payload.volume_tons !== undefined) {
        payload.volume_tons = parseFloat(payload.volume_tons);
      }
      if (payload.harvest_year !== undefined) {
        payload.harvest_year = parseInt(payload.harvest_year);
      }
      const { data, error } = await sb.from('offers')
        .update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async adminGetOffer(id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('offers').select(`
        *,
        crop:crops(*),
        seller:profiles!offers_seller_id_fkey(id, company_name, full_name, email, phone, inn)
      `).eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async adminDeleteRequest(id) {
      const sb = await ensureSupabase();
      const { error } = await sb.from('buyer_requests').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },

    async adminCreateOffer(payload) {
      const sb = await ensureSupabase();
      // seller_id required
      if (!payload.seller_id) throw new Error('Укажите продавца');
      const offer = {
        seller_id: payload.seller_id,
        crop_id: payload.crop_id,
        title: payload.title,
        description: payload.description,
        price_kopecks: k(parseFloat(payload.price_per_ton)),
        vat: payload.vat || 'with_vat_10',
        volume_tons: parseFloat(payload.volume_tons),
        harvest_year: parseInt(payload.harvest_year) || new Date().getFullYear(),
        region: payload.region,
        city: payload.city,
        has_delivery: !!payload.has_delivery,
        delivery_price_per_ton_kopecks: payload.delivery_price ? k(parseFloat(payload.delivery_price)) : 0,
        has_lab_analysis: !!payload.has_lab_analysis,
        quality: payload.quality || {},
        status: payload.status || 'active'  // admin-created offers active by default
      };
      const { data, error } = await sb.from('offers').insert(offer).select().single();
      if (error) throw error;
      return data;
    },

    // ===========================================================
    // CHAT — message threads and messages
    // ===========================================================

    /** Buyer (or admin) opens a chat with the seller about an offer.
     *  Idempotent: re-calling returns the SAME thread.
     *  Returns: { thread_id, offer_id, seller_id }
     */
    async respondToOffer(offer_id, message) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.rpc('respond_to_offer', {
        p_offer_id: offer_id, p_message: message || ''
      });
      if (error) throw new Error(translateRpcError(error));
      return data;
    },

    /** Seller (or admin) responds to a buyer request with a price + volume quote.
     *  First chat message is the seller's quote (formatted automatically).
     *  Returns: { thread_id, request_id, buyer_id }
     */
    async respondToRequest(request_id, { price_per_ton, volume_tons, message, region } = {}) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.rpc('respond_to_request', {
        p_request_id:    request_id,
        p_price_per_ton: parseFloat(price_per_ton),
        p_volume_tons:   parseFloat(volume_tons),
        p_message:       message || '',
        p_region:        region || null
      });
      if (error) throw new Error(translateRpcError(error));
      return data;
    },

    /** Find or create the chat thread tied to a deal. */
    async startDealThread(deal_id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.rpc('start_deal_thread', { p_deal_id: deal_id });
      if (error) throw new Error(translateRpcError(error));
      return data;
    },

    /** Strict deal state machine. Allowed transitions:
     *    pending  → paid       (buyer)
     *    paid     → shipping   (seller)
     *    shipping → delivered  (seller)
     *    delivered→ completed  (buyer)
     *    pending  → cancelled  (either)
     *    paid|shipping|delivered → disputed (either)
     *  Posts a system message into the chat as a side effect.
     */
    async advanceDeal(deal_id, new_status, comment) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.rpc('advance_deal', {
        p_deal_id:    deal_id,
        p_new_status: new_status,
        p_comment:    comment || null
      });
      if (error) throw new Error(translateRpcError(error));
      return data;
    },

    /** Convert a negotiation thread into a real deal (buyer-initiated). */
    async createDealFromThread(thread_id, { volume_tons, price_per_ton, delivery_address } = {}) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.rpc('create_deal_from_thread', {
        p_thread_id:        thread_id,
        p_volume_tons:      parseFloat(volume_tons),
        p_price_per_ton:    parseFloat(price_per_ton),
        p_delivery_address: delivery_address || null
      });
      if (error) throw new Error(translateRpcError(error));
      return data;
    },

    /** Mark all incoming messages in a thread as read. */
    async markThreadRead(thread_id) {
      const sb = await ensureSupabase();
      const { error } = await sb.rpc('mark_thread_read', { p_thread_id: thread_id });
      if (error) console.warn('[markThreadRead]', error);
    },

    /** All chat threads where the current user is buyer or seller.
     *  Counterparties are exposed only via profiles_public (handle, no PII).
     */
    async listMyThreads() {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');

      const { data, error } = await sb.from('message_threads').select(`
        id, deal_id, offer_id, request_id, buyer_id, seller_id, last_message_at, created_at,
        buyer:profiles_public!message_threads_buyer_id_fkey(id, handle, role, rating, is_verified, region, city),
        seller:profiles_public!message_threads_seller_id_fkey(id, handle, role, rating, is_verified, region, city),
        offer:offers(id, title, price_kopecks, volume_tons, crop:crops(name, emoji)),
        request:buyer_requests(id, title, target_price_kopecks, volume_tons, crop:crops(name, emoji)),
        deal:deals(id, deal_number, status, volume_tons, price_per_ton_kopecks, grand_total_kopecks, crop:crops(name, emoji))
      `).order('last_message_at', { ascending: false });
      if (error) throw error;

      // Annotate each thread with counterparty + unread count
      const myId = session.user.id;
      const threads = data || [];

      // Fetch unread counts in one go
      const ids = threads.map(t => t.id);
      let unreadMap = {};
      if (ids.length) {
        const { data: unread } = await sb.from('messages')
          .select('thread_id')
          .in('thread_id', ids)
          .is('read_at', null)
          .neq('sender_id', myId);
        (unread || []).forEach(m => { unreadMap[m.thread_id] = (unreadMap[m.thread_id] || 0) + 1; });
      }

      return threads.map(t => ({
        ...t,
        my_role: (t.buyer_id === myId) ? 'buyer' : (t.seller_id === myId) ? 'seller' : 'observer',
        counterparty: (t.buyer_id === myId) ? t.seller : t.buyer,
        unread_count: unreadMap[t.id] || 0
      }));
    },

    /** Single thread with its full context. */
    async getThread(thread_id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('message_threads').select(`
        id, deal_id, offer_id, request_id, buyer_id, seller_id, last_message_at, created_at,
        buyer:profiles_public!message_threads_buyer_id_fkey(id, handle, role, rating, is_verified, region, city),
        seller:profiles_public!message_threads_seller_id_fkey(id, handle, role, rating, is_verified, region, city),
        offer:offers(id, title, price_kopecks, volume_tons, vat, has_delivery, delivery_price_per_ton_kopecks, crop:crops(name, emoji)),
        request:buyer_requests(id, title, target_price_kopecks, volume_tons, delivery_region, delivery_city, crop:crops(name, emoji)),
        deal:deals(*, crop:crops(name, emoji))
      `).eq('id', thread_id).single();
      if (error) throw error;

      const session = await getCurrentSession();
      const myId = session?.user?.id;
      data.my_role = (data.buyer_id === myId) ? 'buyer' : (data.seller_id === myId) ? 'seller' : 'observer';
      data.counterparty = (data.buyer_id === myId) ? data.seller : data.buyer;
      return data;
    },

    /** All messages in a thread, oldest first. */
    async listMessages(thread_id) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('messages').select(`
        id, thread_id, sender_id, body, attachments, read_at, created_at,
        sender:profiles_public!messages_sender_id_fkey(id, handle, role)
      `).eq('thread_id', thread_id).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    /** Send a message into an existing thread. */
    async sendMessage(thread_id, body) {
      const sb = await ensureSupabase();
      const session = await getCurrentSession();
      if (!session) throw new Error('Не авторизован');
      const trimmed = (body || '').trim();
      if (!trimmed) throw new Error('Сообщение пустое');

      const { data, error } = await sb.from('messages').insert({
        thread_id, sender_id: session.user.id, body: trimmed
      }).select(`
        id, thread_id, sender_id, body, created_at, read_at,
        sender:profiles_public!messages_sender_id_fkey(id, handle, role)
      `).single();
      if (error) throw error;

      // Bump last_message_at (best-effort; ignored on RLS reject)
      sb.from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', thread_id)
        .then(() => {}, () => {});

      return data;
    },

    /** Subscribe to new messages and deal updates in a thread.
     *  callback(event, payload) where event ∈ {'new_message','deal_update','thread_update'}.
     *  Returns the channel — call channel.unsubscribe() when done.
     */
    async subscribeToThread(thread_id, callback) {
      const sb = await ensureSupabase();
      const channel = sb.channel(`thread:${thread_id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${thread_id}` },
          payload => callback('new_message', payload.new))
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'message_threads', filter: `id=eq.${thread_id}` },
          payload => callback('thread_update', payload.new));
      // Deal updates need a separate filter — added on demand by caller via `.subscribeToDeal()`.
      channel.subscribe();
      return channel;
    },

    /** Subscribe to a single deal's status updates. */
    async subscribeToDeal(deal_id, callback) {
      const sb = await ensureSupabase();
      const channel = sb.channel(`deal:${deal_id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'deals', filter: `id=eq.${deal_id}` },
          payload => callback('deal_update', payload.new))
        .subscribe();
      return channel;
    },

    // ===========================================================
    // ADMIN: chat oversight
    // ===========================================================

    /** Admin: list ALL threads on the platform with summary + counterparty handles. */
    async adminListThreads(only_with_messages = true) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.rpc('admin_list_threads', { p_only_with_messages: only_with_messages });
      if (error) throw new Error(translateRpcError(error));
      return data || [];
    },

    /** Admin: post a message into ANY thread (sender = admin, prefixed with 👮). */
    async adminPostMessage(thread_id, body) {
      const sb = await ensureSupabase();
      const { data, error } = await sb.rpc('admin_post_message', {
        p_thread_id: thread_id, p_body: body
      });
      if (error) throw new Error(translateRpcError(error));
      return data;
    }
  };

  // Translate Postgres-side RPC error codes into Russian UI messages.
  function translateRpcError(error) {
    const msg = (error?.message || '').toUpperCase();
    if (msg.includes('AUTH_REQUIRED')) return 'Войдите в аккаунт, чтобы продолжить';
    if (msg.includes('BUYER_REQUIRED')) return 'Откликаться на офферы могут только покупатели';
    if (msg.includes('SELLER_REQUIRED')) return 'Откликаться на заявки могут только продавцы';
    if (msg.includes('SELF_RESPOND')) return 'Нельзя откликаться на собственное объявление';
    if (msg.includes('OFFER_NOT_FOUND')) return 'Оффер не найден';
    if (msg.includes('REQUEST_NOT_FOUND')) return 'Заявка не найдена';
    if (msg.includes('REQUEST_CLOSED')) return 'Заявка уже закрыта';
    if (msg.includes('THREAD_NOT_FOUND')) return 'Чат не найден';
    if (msg.includes('DEAL_NOT_FOUND')) return 'Сделка не найдена';
    if (msg.includes('NOT_PARTICIPANT')) return 'Доступ закрыт';
    if (msg.includes('BUYER_ONLY')) return 'Это действие выполняет покупатель';
    if (msg.includes('SELLER_ONLY')) return 'Это действие выполняет продавец';
    if (msg.includes('BAD_TRANSITION')) return 'Переход недопустим в текущем статусе';
    if (msg.includes('NO_CROP_CONTEXT')) return 'Не определена культура для сделки';
    if (msg.includes('UNKNOWN_STATUS')) return 'Неизвестный статус';
    return error?.message || 'Не удалось выполнить действие';
  }

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
