/**
 * ADMIN IMPORT 1C (v2.6.17)
 * =============================================
 * Раздел админки: просмотр JSON-файлов от 1С CRM,
 * лежащих в bucket "uploads" нашей же Supabase.
 *
 * НИЧЕГО НЕ ПУБЛИКУЕТ в каталог — только просмотр.
 * Решение о публикации в /offers принимается отдельно, позже.
 */
(function () {
  'use strict';

  // Ждём загрузку API
  if (!window.RH_API) {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 100);
    });
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ========================================================
  // STATE
  // ========================================================
  const state = {
    files: [],
    filtered: [],
    selectedFilename: null,
    currentFilter: 'all',  // all|new|saved|done
    searchQuery: '',
    counts: { all: 0, new: 0, saved: 0, done: 0, published: 0 },
    currentParsed: null,   // распарсенный JSON текущего открытого файла (для publishOffers)
  };

  // ========================================================
  // INIT — auth gate + initial load
  // ========================================================
  async function init() {
    try {
      await waitForApi();
      const isAdmin = await window.RH_API.isAdmin();
      if (!isAdmin) {
        document.getElementById('aiAuthGate').style.display = 'none';
        document.getElementById('aiDenied').style.display = '';
        return;
      }
      // Открываем workspace
      document.getElementById('aiAuthGate').style.display = 'none';
      document.getElementById('aiWorkspace').style.display = '';

      bindUI();
      await refreshAll();
    } catch (err) {
      console.error('[Import1C] init failed:', err);
      document.getElementById('aiAuthGate').innerHTML = `
        <div class="ai-auth-card">
          <div class="ai-auth-icon">⚠️</div>
          <h2>Ошибка авторизации</h2>
          <p style="color:#991B1B">${escapeHtml(err.message || String(err))}</p>
          <div style="margin-top:18px"><a class="btn btn-outline" href="/account.html">← В кабинет</a></div>
        </div>
      `;
    }
  }

  async function waitForApi(maxMs = 5000) {
    const start = Date.now();
    while (!window.RH_API?.isAdmin) {
      if (Date.now() - start > maxMs) throw new Error('API не загрузился');
      await new Promise(r => setTimeout(r, 50));
    }
    if (window.RH_API.ready) await window.RH_API.ready();
  }

  // ========================================================
  // UI BINDINGS
  // ========================================================
  function bindUI() {
    // Табы фильтра
    document.querySelectorAll('.ai-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.currentFilter = tab.dataset.filter;
        applyFilter();
      });
    });

    // Поиск
    const search = document.getElementById('aiSearch');
    let searchTimer;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.searchQuery = search.value.trim().toLowerCase();
        applyFilter();
      }, 200);
    });

    // Кнопка обновить
    document.getElementById('aiRefresh').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.classList.add('is-spinning');
      try { await refreshAll(); }
      finally { btn.classList.remove('is-spinning'); }
    });
  }

  // ========================================================
  // DATA LOADING
  // ========================================================
  async function refreshAll() {
    try {
      const [files, counts] = await Promise.all([
        window.RH_API.import1c.listFiles({ limit: 200 }),
        window.RH_API.import1c.statusCounts(),
      ]);
      state.files = files;
      state.counts = counts;
      renderCounts();
      applyFilter();
    } catch (err) {
      console.error('[Import1C] refresh failed:', err);
      renderFilesError(err);
    }
  }

  function renderCounts() {
    document.getElementById('aiCountAll').textContent = state.counts.all;
    document.getElementById('aiCountNew').textContent = state.counts.new;
    document.getElementById('aiCountSaved').textContent = state.counts.saved;
    document.getElementById('aiCountDone').textContent = state.counts.done + (state.counts.published || 0);
  }

  function applyFilter() {
    let list = state.files;
    if (state.currentFilter !== 'all') {
      if (state.currentFilter === 'done') {
        list = list.filter(f => f.status === 'done' || f.status === 'published');
      } else {
        list = list.filter(f => f.status === state.currentFilter);
      }
    }
    if (state.searchQuery) {
      list = list.filter(f => (f.filename || '').toLowerCase().includes(state.searchQuery));
    }
    state.filtered = list;
    renderFilesList();
  }

  // ========================================================
  // RENDER LEFT COLUMN
  // ========================================================
  function renderFilesList() {
    const root = document.getElementById('aiFilesList');
    if (!state.filtered.length) {
      root.innerHTML = `
        <div class="ai-files-empty">
          <div class="ic">📭</div>
          <h4>Файлов нет</h4>
          <p>${state.searchQuery ? 'По запросу ничего не найдено' : 'В этой категории пусто'}</p>
        </div>
      `;
      return;
    }
    root.innerHTML = state.filtered.map(f => {
      const cleanName = (f.filename || '').replace(/^\d{8}_\d{6}_/, '');
      const sizeKb = f.file_size ? Math.round(f.file_size / 1024) : 0;
      const dateStr = f.uploaded_at
        ? new Date(f.uploaded_at).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
          })
        : '—';
      const isSelected = state.selectedFilename === f.filename;
      return `
        <div class="ai-file ${isSelected ? 'is-selected' : ''}" data-filename="${escapeHtml(f.filename)}">
          <div class="ai-file-top">
            <span class="ai-file-status s-${escapeHtml(f.status || 'new')}" title="Статус: ${escapeHtml(f.status || 'new')}"></span>
            <span class="ai-file-name" title="${escapeHtml(f.filename)}">${escapeHtml(cleanName)}</span>
          </div>
          <div class="ai-file-meta">
            <span>${dateStr}</span>
            ${sizeKb ? `<span class="dot">·</span><span>${sizeKb} КБ</span>` : ''}
            ${f.status ? `<span class="dot">·</span><span>${statusLabel(f.status)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Клик на файл → загрузить превью
    root.querySelectorAll('.ai-file').forEach(el => {
      el.addEventListener('click', () => {
        const fn = el.dataset.filename;
        if (fn) selectFile(fn);
      });
    });
  }

  function renderFilesError(err) {
    const root = document.getElementById('aiFilesList');
    root.innerHTML = `
      <div class="ai-error" style="margin:8px">
        <h3>Ошибка загрузки файлов</h3>
        <p>Проверьте, что у роли admin есть RLS-доступ к таблице <code>uploads</code> и bucket <code>uploads</code>.</p>
        <code>${escapeHtml(err.message || String(err))}</code>
      </div>
    `;
  }

  function statusLabel(status) {
    return {
      new: 'Новый',
      saved: 'В работе',
      done: 'Готово',
      published: 'Опубликован',
      archived: 'Архив',
    }[status] || status;
  }

  // ========================================================
  // RIGHT COLUMN: PREVIEW
  // ========================================================
  async function selectFile(filename) {
    state.selectedFilename = filename;
    // Подсветить выбранный файл
    document.querySelectorAll('.ai-file').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.filename === filename);
    });

    const preview = document.getElementById('aiPreview');
    preview.innerHTML = `
      <div class="ai-loading" style="padding:80px 20px">
        <div class="ai-spinner"></div>
        <span>Загрузка файла…</span>
      </div>
    `;

    try {
      const data = await window.RH_API.import1c.downloadJson(filename);
      const type = detectFileType(data, filename);
      // Сохраняем для последующей публикации
      state.currentParsed = { ...data, _type: type, _filename: filename };
      switch (type) {
        case 'orders':     renderOrders(filename, data); break;
        case 'potrebnost': renderPotrebnost(filename, data); break;
        default:           renderUnknown(filename, data); break;
      }
      bindFileActions(filename);
    } catch (err) {
      console.error('[Import1C] downloadJson failed:', err);
      preview.innerHTML = `
        <div class="ai-error">
          <h3>Не удалось открыть файл</h3>
          <p>Возможные причины: файл повреждён, нет доступа к bucket, файл не JSON.</p>
          <code>${escapeHtml(err.message || String(err))}</code>
        </div>
      `;
    }
  }

  /**
   * Определяет тип JSON-файла от 1С.
   * Используется и структура, и имя файла как fallback.
   */
  function detectFileType(data, filename) {
    if (Array.isArray(data && data.orders)) return 'orders';
    if (Array.isArray(data && data['Закупка'])) return 'potrebnost';
    if (/orders/i.test(filename)) return 'orders';
    if (/potrebn|nuzhd/i.test(filename)) return 'potrebnost';
    return 'unknown';
  }

  // ========================================================
  // ОБЩИЕ КНОПКИ УПРАВЛЕНИЯ ФАЙЛОМ (для всех типов)
  // ========================================================
  function renderFileActions(filename, currentStatus) {
    const cfg = window.RH_CONFIG || {};
    const hasAI = !!(cfg.SUPABASE_URL);  // AI идёт через Edge Function — нужен Supabase URL
    const hasPublish = !!window.RH_Import1C_Publish && state.currentParsed && state.currentParsed._type === 'potrebnost';
    return `
      <div class="ai-file-actions" data-filename="${escapeHtml(filename)}">
        <div class="ai-file-actions-group">
          <span class="ai-file-actions-label">Статус:</span>
          ${['saved','done','archived'].map(s => `
            <button class="ai-btn ai-btn-sm ${currentStatus === s ? 'is-active' : 'ai-btn-outline'}"
                    data-action="set-status" data-status="${s}" type="button">
              ${statusEmoji(s)} ${statusLabel(s)}
            </button>
          `).join('')}
        </div>
        <div class="ai-file-actions-group">
          ${hasPublish ? `
            <button class="ai-btn ai-btn-publish ai-btn-sm" data-action="publish" type="button" title="Опубликовать в каталог Купить + создать заявку в Продать">
              🚀 Опубликовать в каталог
            </button>
          ` : ''}
          ${hasAI ? `
            <button class="ai-btn ai-btn-primary ai-btn-sm" data-action="ai-analyze" type="button" title="Анализ файла через AI и отправка в Telegram-бот">
              🤖 AI-анализ → Telegram
            </button>
          ` : ''}
          <a class="ai-btn ai-btn-outline ai-btn-sm" href="#" data-action="download" data-filename="${escapeHtml(filename)}">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 3v10M5 9l5 4 5-4M3 17h14"/></svg>
            JSON
          </a>
        </div>
      </div>
    `;
  }

  function bindFileActions(filename) {
    const root = document.getElementById('aiPreview');
    if (!root) return;

    // Set status
    root.querySelectorAll('[data-action="set-status"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const status = btn.dataset.status;
        if (!confirm(`Изменить статус файла на «${statusLabel(status)}»?`)) return;
        try {
          await window.RH_API.import1c.setStatus(filename, status);
          toast(`Статус изменён: ${statusLabel(status)}`, 'success');
          // Обновляем UI: подсвечиваем активный, обновляем список
          await refreshAll();
          // Перерисуем превью с новым статусом
          const fresh = state.files.find(f => f.filename === filename);
          if (fresh) {
            // Перевыбрать чтобы кнопки обновились
            selectFile(filename);
          }
        } catch (err) {
          console.error('[Import1C] setStatus failed:', err);
          toast('Ошибка: ' + (err.message || String(err)), 'error');
        }
      });
    });

    // AI analyze → Telegram
    const aiBtn = root.querySelector('[data-action="ai-analyze"]');
    if (aiBtn) {
      aiBtn.addEventListener('click', async () => {
        aiBtn.disabled = true;
        const orig = aiBtn.innerHTML;
        aiBtn.innerHTML = '<span class="ai-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></span> Анализирую…';
        try {
          await window.RH_API.import1c.aiAnalyze(filename);
          toast('AI-анализ отправлен в Telegram-бот @agromixrus_bot', 'success');
        } catch (err) {
          console.error('[Import1C] aiAnalyze failed:', err);
          toast('Ошибка AI-анализа: ' + (err.message || String(err)), 'error');
        } finally {
          aiBtn.disabled = false;
          aiBtn.innerHTML = orig;
        }
      });
    }

    // Download JSON
    const dl = root.querySelector('[data-action="download"]');
    if (dl) {
      dl.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const data = await window.RH_API.import1c.downloadJson(filename);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
          toast('Ошибка: ' + err.message, 'error');
        }
      });
    }

    // Toggle raw JSON
    const rawWrap = root.querySelector('#aiRawJson');
    if (rawWrap) {
      rawWrap.querySelector('.ai-raw-json-head').addEventListener('click', () => {
        rawWrap.classList.toggle('is-open');
      });
    }

    // Copy JSON
    const cp = root.querySelector('[data-action="copy"]');
    if (cp) {
      cp.addEventListener('click', async () => {
        try {
          const data = await window.RH_API.import1c.downloadJson(filename);
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          toast('JSON скопирован', 'success');
        } catch (err) {
          toast('Не удалось скопировать: ' + err.message, 'error');
        }
      });
    }

    // v2.6.24: Опубликовать в каталог
    const pubBtn = root.querySelector('[data-action="publish"]');
    if (pubBtn) {
      pubBtn.addEventListener('click', () => {
        openPublishDialog(filename);
      });
    }
  }

  // ============================================================
  // v2.6.24: ДИАЛОГ ПУБЛИКАЦИИ
  // ============================================================
  /**
   * Открывает модалку с превью офферов и кнопкой подтверждения.
   * Использует window.RH_Import1C_Publish для построения черновиков.
   */
  function openPublishDialog(filename) {
    if (!window.RH_Import1C_Publish) {
      toast('Модуль публикации не загружен', 'error');
      return;
    }
    if (!state.currentParsed || state.currentParsed._type !== 'potrebnost') {
      toast('Публикация работает только для potrebnost-файлов', 'error');
      return;
    }

    const file = state.currentParsed;
    const result = window.RH_Import1C_Publish.buildDrafts(file);

    // Создаём модалку
    const modal = document.createElement('div');
    modal.className = 'ai-publish-modal';
    modal.innerHTML = `
      <div class="ai-publish-backdrop"></div>
      <div class="ai-publish-panel">
        <div class="ai-publish-head">
          <div>
            <h2>🚀 Публикация в каталог</h2>
            <p class="ai-publish-summary">
              Файл №${escapeHtml(String(result.summary.file_number || '—'))} ·
              Покупатель: <b>${escapeHtml(result.summary.buyer || '—')}</b> ·
              Культура: <b>${escapeHtml(result.summary.nomen || '—')}</b><br>
              Будет опубликовано: <b>${result.summary.publishable} из ${result.summary.offers_count}</b> офферов,
              общий объём ~ ${Math.round(result.summary.total_volume)} т
            </p>
          </div>
          <button class="ai-publish-close" type="button" aria-label="Закрыть">✕</button>
        </div>

        <div class="ai-publish-body">
          ${result.offers.length === 0 ? `
            <div class="ai-empty" style="padding:40px 20px;text-align:center">
              <div class="ai-empty-ic">📭</div>
              <h3>Поставщиков нет</h3>
              <p>В файле массив «Закупка» пустой. Публикация офферов невозможна.<br>
              Но заявка покупателя в разделе «Продать» будет создана.</p>
            </div>
          ` : `
            <div class="ai-publish-controls">
              <label class="ai-publish-checkall">
                <input type="checkbox" id="aiPubCheckAll" checked />
                <span>Выбрать все (${result.offers.length})</span>
              </label>
              <span class="ai-publish-hint">Снимите галочки с тех поставщиков, которых не хотите публиковать</span>
            </div>
            <div class="ai-publish-drafts" id="aiPubDrafts">
              ${result.offers.map((d, i) => renderDraftCard(d, i)).join('')}
            </div>
          `}

          <div class="ai-publish-extra">
            <label class="ai-publish-checkall">
              <input type="checkbox" id="aiPubBuyerReq" checked />
              <span>📋 Также создать заявку-потребность в разделе «Продать»</span>
            </label>
            <span class="ai-publish-hint">Покупатель будет анонимизирован (видно только админам)</span>
          </div>
        </div>

        <div class="ai-publish-foot">
          <button class="ai-btn ai-btn-outline" data-action="cancel" type="button">Отмена</button>
          <button class="ai-btn ai-btn-publish" data-action="confirm" type="button">
            ✓ Подтвердить публикацию
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('is-open'));

    // Биндинги
    const close = () => {
      modal.classList.remove('is-open');
      setTimeout(() => modal.remove(), 200);
    };
    modal.querySelector('.ai-publish-backdrop').addEventListener('click', close);
    modal.querySelector('.ai-publish-close').addEventListener('click', close);
    modal.querySelector('[data-action="cancel"]').addEventListener('click', close);

    // Checkbox «выбрать все»
    const checkAll = modal.querySelector('#aiPubCheckAll');
    if (checkAll) {
      checkAll.addEventListener('change', () => {
        modal.querySelectorAll('.ai-pub-draft-check').forEach(cb => {
          // ВНИМАНИЕ: не включаем те у которых есть errors — там disabled
          if (!cb.disabled) cb.checked = checkAll.checked;
        });
      });
    }

    // Confirm
    modal.querySelector('[data-action="confirm"]').addEventListener('click', async () => {
      const btn = modal.querySelector('[data-action="confirm"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="ai-spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle"></span> Публикуем…';

      try {
        // Собираем чекбоксы офферов
        const selected = result.offers.map((d, i) => {
          const cb = modal.querySelector(`.ai-pub-draft-check[data-idx="${i}"]`);
          return !!(cb && cb.checked && !cb.disabled);
        });

        // v2.6.28: геокодинг через Nominatim перед публикацией.
        // Это занимает ~1 сек на адрес (throttle Nominatim), поэтому
        // показываем прогресс. Геокодим только выбранные офферы.
        if (window.RH_Import1C_Publish.enrichWithGeocoding) {
          const toGeo = {
            offers: result.offers.filter((d, i) => selected[i]),
            buyer_request: (modal.querySelector('#aiPubBuyerReq') || {}).checked ? result.buyer_request : null,
          };
          const totalGeo = toGeo.offers.length + (toGeo.buyer_request ? 1 : 0);
          if (totalGeo > 0) {
            await window.RH_Import1C_Publish.enrichWithGeocoding(toGeo, (cur, tot, label) => {
              btn.innerHTML = `<span class="ai-spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle"></span> Геокодинг ${cur}/${tot}…`;
            });
          }
        }

        btn.innerHTML = '<span class="ai-spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle"></span> Публикуем…';
        const offerResult = await window.RH_Import1C_Publish.publishOffers(result.offers, selected);
        let buyerReqResult = null;
        const buyerCb = modal.querySelector('#aiPubBuyerReq');
        if (buyerCb && buyerCb.checked) {
          buyerReqResult = await window.RH_Import1C_Publish.publishBuyerRequest(result.buyer_request);
        }

        close();
        const msg = `Опубликовано: ${offerResult.inserted} офферов` +
          (buyerReqResult && buyerReqResult.id ? ' + 1 заявка в Продать' : '') +
          (buyerReqResult && buyerReqResult.error ? ` (заявка не создана: ${buyerReqResult.error})` : '');
        toast(msg, 'success');

        // Меняем статус файла на «done»
        try {
          await window.RH_API.import1c.setStatus(filename, 'done');
          await refreshAll();
          selectFile(filename);
        } catch(_) {}
      } catch (err) {
        console.error('[Publish] failed:', err);
        toast('Ошибка публикации: ' + (err.message || String(err)), 'error');
        btn.disabled = false;
        btn.innerHTML = '✓ Подтвердить публикацию';
      }
    });
  }

  /**
   * Рендерит карточку черновика оффера с чекбоксом и предупреждениями.
   */
  function renderDraftCard(draft, idx) {
    const errors = draft._anomalies.filter(a => a.level === 'error');
    const warnings = draft._anomalies.filter(a => a.level === 'warning');
    const infos = draft._anomalies.filter(a => a.level === 'info');
    const hasErrors = errors.length > 0;

    const priceR = draft.price_kopecks
      ? (draft.price_kopecks / 100).toLocaleString('ru-RU')
      : '—';

    const qualityRows = Object.entries(draft.quality || {}).map(([k, v]) => `
      <span class="ai-pub-q-chip">${escapeHtml(k)}: ${escapeHtml(String(v))}</span>
    `).join('');

    return `
      <div class="ai-pub-draft ${hasErrors ? 'has-errors' : ''}">
        <div class="ai-pub-draft-check-wrap">
          <input type="checkbox" class="ai-pub-draft-check" data-idx="${idx}"
                 ${hasErrors ? 'disabled' : 'checked'} />
        </div>
        <div class="ai-pub-draft-body">
          <div class="ai-pub-draft-head">
            <h4>${escapeHtml(draft.title)}</h4>
            <div class="ai-pub-draft-price">${priceR} <small>₽/т</small></div>
          </div>
          <div class="ai-pub-draft-meta">
            <span><b>Поставщик:</b> ${escapeHtml(draft._supplier_label)}</span>
            <span><b>Объём:</b> ${draft.volume_tons || '—'} т</span>
            <span><b>Регион:</b> ${escapeHtml(draft.region || '—')}${draft.city ? ', ' + escapeHtml(draft.city) : ''}</span>
            <span class="ai-pub-draft-crop"><b>crop_id:</b> <code>${escapeHtml(draft.crop_id)}</code></span>
          </div>
          ${qualityRows ? `<div class="ai-pub-draft-quality">${qualityRows}</div>` : ''}
          ${[...errors, ...warnings, ...infos].length ? `
            <div class="ai-pub-draft-flags">
              ${errors.map(f => `<span class="ai-pub-flag ai-pub-flag-error">🛑 ${escapeHtml(f.text)}</span>`).join('')}
              ${warnings.map(f => `<span class="ai-pub-flag ai-pub-flag-warning">⚠️ ${escapeHtml(f.text)}</span>`).join('')}
              ${infos.map(f => `<span class="ai-pub-flag ai-pub-flag-info">ℹ️ ${escapeHtml(f.text)}</span>`).join('')}
            </div>
          ` : ''}
          <div class="ai-pub-draft-external"><b>external_id:</b> <code>${escapeHtml(draft.external_id)}</code></div>
        </div>
      </div>
    `;
  }

  function statusEmoji(s) {
    return { new:'🟢', saved:'🟡', done:'✅', archived:'📦', published:'📤' }[s] || '';
  }

  // ========================================================
  // RENDER: POTREBNOST (заявка покупателя + массив поставщиков)
  // Структура: {Номер, Дата, Покупатель, Номенклатура, Закупка:[]}
  // ========================================================
  function renderPotrebnost(filename, data) {
    const preview = document.getElementById('aiPreview');
    const suppliers = Array.isArray(data['Закупка']) ? data['Закупка'] : [];
    const fileRow = state.files.find(f => f.filename === filename) || {};

    const docNumber = data['Номер'] || '—';
    const docDate = data['Дата'] || '—';
    const docStatus = data['Статус'] || '—';
    const buyer = data['Покупатель'] || '—';
    const nomenclature = (data['Номенклатура'] || '').trim() || '—';
    const address = data['Адрес выгрузки'] || '—';
    const volume = data['Объём'] || '—';
    const sum = data['Сумма'] || '—';
    const remains = data['Осталось'] || '—';
    const dealType = data['Тип сделки'] || '—';
    const dueDate = data['Срок поставки'] || '';
    const dueDateShow = (dueDate && !dueDate.startsWith('01.01.0001')) ? dueDate : '—';

    preview.innerHTML = `
      <div class="ai-preview-head">
        <div class="ai-preview-head-top">
          <div style="min-width:0;flex:1">
            <span class="ai-doc-num">📋 Заявка-потребность №${escapeHtml(docNumber)} · ${escapeHtml(docDate)}</span>
            <h2 class="ai-doc-title">${escapeHtml(nomenclature)}</h2>
            <div class="ai-doc-subtitle">
              <span>🛒 Покупатель: <b style="color:var(--ink)">${escapeHtml(buyer)}</b></span>
              <span class="dot">·</span>
              <span>Статус 1С: <b style="color:var(--ink)">${escapeHtml(docStatus)}</b></span>
              ${dealType !== '—' ? `<span class="dot">·</span><span>${escapeHtml(dealType)}</span>` : ''}
            </div>
          </div>
        </div>

        ${renderFileActions(filename, fileRow.status || 'new')}

        <div class="ai-doc-meta">
          <div class="ai-doc-meta-cell"><div class="k">Объём заявки</div><div class="v">${escapeHtml(volume)} т</div></div>
          <div class="ai-doc-meta-cell"><div class="k">Остаток</div><div class="v">${escapeHtml(remains)} т</div></div>
          <div class="ai-doc-meta-cell"><div class="k">Сумма заявки</div><div class="v">${escapeHtml(sum)} ₽</div></div>
          <div class="ai-doc-meta-cell"><div class="k">Срок поставки</div><div class="v">${escapeHtml(dueDateShow)}</div></div>
          <div class="ai-doc-meta-cell" style="grid-column:span 2">
            <div class="k">Адрес выгрузки</div>
            <div class="v long">${escapeHtml(address)}</div>
          </div>
        </div>
      </div>

      <div class="ai-suppliers">
        <div class="ai-suppliers-head">
          <h3>🏷 Поставщики <span class="count">${suppliers.length}</span></h3>
          <span class="hint">Данные из 1С CRM. Публикация в каталог — на следующем этапе.</span>
        </div>
        ${suppliers.length === 0
          ? '<div class="ai-files-empty"><div class="ic">📭</div><h4>Поставщиков нет</h4><p>В этой заявке массив «Закупка» пуст</p></div>'
          : suppliers.map((s, idx) => renderSupplier(s, idx)).join('')
        }
      </div>

      ${renderRawJson(data)}
    `;
  }

  function renderSupplier(s, idx) {
    const num = s['НомерСтроки'] || (idx + 1);
    const name = s['Контрагент'] || 'Без названия';
    const addr = s['АдресЗагрузки'] || '—';
    const quality = s['КачественныеПоказатели'] || '';
    const manager = s['ФИО'] || '';
    const price = s['Цена'] || '0';
    const volume = s['Объем'] || '0';
    const comment = s['Комментарий'] || '';

    const pNum = parseNum(price);
    const vNum = parseNum(volume);
    const totalCalc = pNum * vNum;
    const totalStr = totalCalc ? totalCalc.toLocaleString('ru-RU') + ' ₽' : '—';

    return `
      <div class="ai-supplier">
        <div class="ai-supplier-num">${escapeHtml(String(num))}</div>
        <div class="ai-supplier-body">
          <div class="ai-supplier-name">${escapeHtml(name)}</div>
          <div class="ai-supplier-addr">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 18s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="10" cy="8" r="2"/></svg>
            <span>${escapeHtml(addr)}</span>
          </div>
          <div class="ai-supplier-tags">
            ${quality ? `<span class="ai-tag quality">📊 ${escapeHtml(quality)}</span>` : ''}
            ${manager ? `<span class="ai-tag manager">👤 ${escapeHtml(manager)}</span>` : ''}
            ${comment ? `<span class="ai-tag">💬 ${escapeHtml(comment)}</span>` : ''}
          </div>
        </div>
        <div class="ai-supplier-figures">
          <div class="ai-supplier-price">${escapeHtml(price)}<span class="unit">₽/т</span></div>
          <div class="ai-supplier-volume"><span class="label">Объём:</span> ${escapeHtml(volume)} т</div>
          <div class="ai-supplier-sum">Сумма: <b>${totalStr}</b></div>
        </div>
      </div>
    `;
  }

  // ========================================================
  // RENDER: ORDERS (готовые заказы клиентов от 1С)
  // Структура: {export_date, source, orders:[{order_id, client, items[], total, status}], summary}
  // ⚠ Содержит персональные данные клиентов (ИНН, телефон).
  //   Видны только админам (RLS гарантирует). Маскируем визуально для защиты от
  //   случайных скриншотов — полный вид по клику на «👁 Показать ИНН/телефон».
  // ========================================================
  function renderOrders(filename, data) {
    const preview = document.getElementById('aiPreview');
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const summary = data.summary || {};
    const fileRow = state.files.find(f => f.filename === filename) || {};

    const exportDate = formatDate(data.export_date);
    const source = data.source || '—';
    const totalOrders = summary.total_orders ?? orders.length;
    const totalAmount = summary.total_amount ?? orders.reduce((s, o) => s + (o.total || 0), 0);
    const statuses = summary.statuses || {};

    preview.innerHTML = `
      <div class="ai-preview-head">
        <div class="ai-preview-head-top">
          <div style="min-width:0;flex:1">
            <span class="ai-doc-num">🧾 Заказы от ${escapeHtml(source)} · экспорт ${escapeHtml(exportDate)}</span>
            <h2 class="ai-doc-title">${totalOrders} ${pluralize(totalOrders, ['заказ','заказа','заказов'])} на сумму ${totalAmount.toLocaleString('ru-RU')} ₽</h2>
            <div class="ai-doc-subtitle">
              <span class="ai-pii-badge" title="Файл содержит персональные данные клиентов: ИНН и телефоны. Доступ только администратору.">🔒 ПЕРС. ДАННЫЕ</span>
              <span class="dot">·</span>
              <span>RLS ограничивает доступ только администраторами</span>
            </div>
          </div>
        </div>

        ${renderFileActions(filename, fileRow.status || 'new')}

        <div class="ai-summary-bar">
          ${Object.entries(statuses).map(([s, n]) => `
            <div class="ai-summary-stat">
              <span class="ai-status-badge ${orderStatusClass(s)}">${escapeHtml(s)}</span>
              <span class="ai-summary-stat-num">${n}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="ai-orders" data-pii="hidden">
        <div class="ai-suppliers-head">
          <h3>📑 Заказы <span class="count">${orders.length}</span></h3>
          <button class="ai-btn ai-btn-outline ai-btn-sm" type="button" data-action="toggle-pii" title="Показать/скрыть персональные данные клиентов">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 10s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z"/><circle cx="10" cy="10" r="3"/></svg>
            Показать ИНН/телефон
          </button>
        </div>
        ${orders.length === 0
          ? '<div class="ai-files-empty"><div class="ic">📭</div><h4>Заказов нет</h4><p>В этом файле массив «orders» пуст</p></div>'
          : orders.map(renderOrder).join('')
        }
      </div>

      ${renderRawJson(data)}
    `;

    // Toggle PII visibility
    const piiBtn = preview.querySelector('[data-action="toggle-pii"]');
    const ordersWrap = preview.querySelector('.ai-orders');
    if (piiBtn && ordersWrap) {
      piiBtn.addEventListener('click', () => {
        const hidden = ordersWrap.dataset.pii === 'hidden';
        ordersWrap.dataset.pii = hidden ? 'shown' : 'hidden';
        // Перебираем все .ai-pii-field и подменяем значения
        ordersWrap.querySelectorAll('.ai-pii-field').forEach(field => {
          const valueEl = field.querySelector('.ai-pii-value');
          if (!valueEl) return;
          valueEl.textContent = hidden ? (field.dataset.piiFull || '—') : (field.dataset.piiMasked || '—');
        });
        piiBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            ${hidden
              ? '<path d="M2 2l16 16"/><path d="M6.5 6.5C4.5 8 3 10 3 10s4 7 9 7c2 0 3.5-.4 4.8-1.1"/><path d="M9.6 5c.5-.1.9-.1 1.4-.1 5 0 9 7 9 7s-1 1.7-2.4 3.2"/>'
              : '<path d="M1 10s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z"/><circle cx="10" cy="10" r="3"/>'}
          </svg>
          ${hidden ? 'Скрыть ИНН/телефон' : 'Показать ИНН/телефон'}
        `;
      });
    }
  }

  function renderOrder(o) {
    const items = Array.isArray(o.items) ? o.items : [];
    const client = o.client || {};
    const total = (o.total || 0).toLocaleString('ru-RU');
    const status = o.status || '—';
    const date = formatDate(o.date);
    const itemsRows = items.map(it => `
      <tr>
        <td>${escapeHtml(it.name || '—')}</td>
        <td class="num">${(it.qty || 0).toLocaleString('ru-RU')}</td>
        <td class="muted">${escapeHtml(it.unit || '')}</td>
        <td class="num">${(it.price || 0).toLocaleString('ru-RU', {minimumFractionDigits:0, maximumFractionDigits:2})} ₽</td>
        <td class="num bold">${(it.total || 0).toLocaleString('ru-RU')} ₽</td>
      </tr>
    `).join('');

    const innFull = client.inn || '';
    const innMasked = innFull ? innFull.slice(0, 4) + '••••' + innFull.slice(-2) : '—';
    const phoneFull = client.phone || '';
    const phoneMasked = phoneFull ? phoneFull.replace(/\d{4}$/, '••••') : '—';

    return `
      <div class="ai-order">
        <div class="ai-order-head">
          <div class="ai-order-head-left">
            <span class="ai-order-id">${escapeHtml(o.order_id || '—')}</span>
            <span class="ai-order-date">${escapeHtml(date)}</span>
          </div>
          <span class="ai-status-badge ${orderStatusClass(status)}">${escapeHtml(status)}</span>
        </div>

        <div class="ai-order-client">
          <div class="ai-order-client-name">🏢 ${escapeHtml(client.name || '—')}</div>
          <div class="ai-order-client-meta">
            <span class="ai-pii-field" data-pii-masked="${escapeHtml(innMasked)}" data-pii-full="${escapeHtml(innFull)}">
              ИНН: <span class="ai-pii-value">${escapeHtml(innMasked)}</span>
            </span>
            <span class="ai-pii-field" data-pii-masked="${escapeHtml(phoneMasked)}" data-pii-full="${escapeHtml(phoneFull)}">
              Тел: <span class="ai-pii-value">${escapeHtml(phoneMasked)}</span>
            </span>
          </div>
        </div>

        <table class="ai-order-items">
          <thead>
            <tr>
              <th>Позиция</th>
              <th class="num">Кол-во</th>
              <th>Ед.</th>
              <th class="num">Цена</th>
              <th class="num">Сумма</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="bold">Итого по заказу:</td>
              <td class="num bold">${total} ₽</td>
            </tr>
          </tfoot>
        </table>

        ${o.comment ? `<div class="ai-order-comment">💬 ${escapeHtml(o.comment)}</div>` : ''}
      </div>
    `;
  }

  function orderStatusClass(s) {
    const map = {
      'Новый': 'st-new',
      'Подтверждён': 'st-confirmed',
      'Подтвержден': 'st-confirmed',
      'Выполнен': 'st-done',
      'Отменён': 'st-cancelled',
      'Отменен': 'st-cancelled',
      'В работе': 'st-progress',
    };
    return map[s] || 'st-default';
  }

  // ========================================================
  // RENDER: UNKNOWN (тип файла не распознан)
  // ========================================================
  function renderUnknown(filename, data) {
    const preview = document.getElementById('aiPreview');
    const fileRow = state.files.find(f => f.filename === filename) || {};
    const keys = data && typeof data === 'object' ? Object.keys(data) : [];

    preview.innerHTML = `
      <div class="ai-preview-head">
        <div class="ai-preview-head-top">
          <div style="min-width:0;flex:1">
            <span class="ai-doc-num">❓ Неопознанный формат</span>
            <h2 class="ai-doc-title">${escapeHtml(filename)}</h2>
            <div class="ai-doc-subtitle">
              <span>Структура файла не соответствует ни одному известному типу 1С</span>
            </div>
          </div>
        </div>
        ${renderFileActions(filename, fileRow.status || 'new')}
      </div>
      <div class="ai-suppliers">
        <div class="ai-error" style="margin:0">
          <h3>Тип файла не распознан</h3>
          <p>Ожидаются файлы со структурой:</p>
          <ul style="margin:8px 0 8px 20px;font-size:13px;line-height:1.7">
            <li><b>Потребности:</b> <code>{Номер, Покупатель, Номенклатура, Закупка:[]}</code></li>
            <li><b>Заказы:</b> <code>{export_date, source, orders:[{order_id, client, items}], summary}</code></li>
          </ul>
          <p>Полученные ключи верхнего уровня:</p>
          <code>${escapeHtml(keys.join(', ') || '(пустой объект)')}</code>
          <p style="margin-top:10px">Если это новый формат — пришлите пример разработчику для добавления парсера.</p>
        </div>
      </div>
      ${renderRawJson(data)}
    `;
  }

  // Общая нижняя секция «Исходный JSON» (сворачиваемая)
  function renderRawJson(data) {
    return `
      <div class="ai-raw-json" id="aiRawJson">
        <div class="ai-raw-json-head">
          <span>🔍 Исходный JSON (raw)</span>
          <span class="ai-raw-json-toggle">▾</span>
        </div>
        <div class="ai-raw-json-body">${escapeHtml(JSON.stringify(data, null, 2))}</div>
      </div>
    `;
  }

  // ========================================================
  // HELPERS
  // ========================================================
  function parseNum(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    // 1С использует неразрывный пробел U+00A0
    const cleaned = String(str).replace(/[\u00A0\s]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Универсальный парсер дат от 1С.
   * Принимает: '2026-04-01', '2026-04-01T10:00:00', '01.04.2026', '01.04.2026 8:50:05'
   * Возвращает локализованную строку для отображения.
   */
  function formatDate(input) {
    if (!input) return '—';
    const s = String(input).trim();
    let d = null;
    // ISO 8601
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      d = new Date(s);
    }
    // Русский формат DD.MM.YYYY HH:mm:ss
    else if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) {
      const [datePart, timePart] = s.split(' ');
      const [dd, mm, yyyy] = datePart.split('.');
      const time = timePart || '00:00:00';
      d = new Date(`${yyyy}-${mm}-${dd}T${time}`);
    }
    if (!d || isNaN(d.getTime()) || d.getFullYear() < 1990) return s;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function pluralize(n, forms) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  let toastTimer;
  function toast(message, type = '') {
    const el = document.getElementById('aiToast');
    if (!el) return;
    el.textContent = message;
    el.className = 'ai-toast show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.className = 'ai-toast ' + type;
    }, 3000);
  }
})();
