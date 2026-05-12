/* =============== SUPPORT CHAT WIDGET (v2.6.14) =============== */
(function(){
  'use strict';

  // не дублировать, если уже инициализирован
  if (window.__rhSupportChatInit) return;
  window.__rhSupportChatInit = true;

  const CFG = window.RH_CONFIG || {};
  const SUPPORT_PHONE = CFG.SUPPORT_PHONE || '+79300129797';
  const SUPPORT_PHONE_FMT = CFG.SUPPORT_PHONE_FMT || '+7 930 012-97-97';
  const SUPPORT_TG = CFG.SUPPORT_TELEGRAM || 'tdrusagro';

  // FAQ ответы — статические правила
  const FAQ = [
    {
      patterns:['как купить','как заказ','как оформ','как сделк','как сделать заказ'],
      answer:'Чтобы купить: 1) выберите товар в каталоге; 2) нажмите «Купить» — менеджер свяжется с вами в течение 30 минут; 3) согласуйте объём, цену и доставку; 4) оплатите счёт.',
      quick:['Открыть каталог','Где заявка?','Как оплатить?']
    },
    {
      patterns:['как продать','выставить','разместить','объявлен','загрузить товар'],
      answer:'Чтобы продать: 1) перейдите в раздел «Продать»; 2) зарегистрируйтесь как поставщик; 3) добавьте товар с фото и характеристиками; 4) получайте заявки от покупателей.',
      quick:['Начать продавать','Условия комиссии','Как загрузить фото?']
    },
    {
      patterns:['комисс','тариф','платн','стоим площадк','цена сервис'],
      answer:'Регистрация и размещение объявлений — бесплатно. Комиссия берётся только с успешных сделок. Точные условия — в публичной оферте.',
      quick:['Открыть оферту','Как оплатить?','Помощь']
    },
    {
      patterns:['доставк','логист','перевоз','транспорт'],
      answer:'Доставка возможна силами продавца, покупателя или через наших логистических партнёров. При оформлении сделки можно указать «с доставкой» или «самовывоз».',
      quick:['Как заказать?','Расчёт стоимости','Контакты']
    },
    {
      patterns:['оплат','эскроу','безопасн','гарант'],
      answer:'Сейчас все сделки оформляются вручную через менеджера: вы выбираете товар, мы согласовываем условия, оплата — банковским переводом по счёту. Эскроу-сервис в разработке.',
      quick:['Как купить?','Документы','Связаться']
    },
    {
      patterns:['телефон','позвон','связаться','контакт'],
      answer:`📞 Звоните: ${SUPPORT_PHONE_FMT}\nПн–Пт, 9:00–18:00 (Мск).\n\nТакже можно написать в Telegram @${SUPPORT_TG} — отвечаем быстрее.`,
      quick:['Открыть Telegram','Написать в чат']
    },
    {
      patterns:['регистр','аккаунт','кабинет','личный кабинет','войти'],
      answer:'Регистрация занимает 1 минуту. Перейдите в «Личный кабинет», укажите телефон или email — придёт код подтверждения. Затем заполните данные компании.',
      quick:['Регистрация','Восстановить пароль','Помощь']
    },
    {
      patterns:['не работает','ошибка','баг','глюк','не загруж','не отправ'],
      answer:'Опишите подробнее, что не работает — менеджер передаст разработчикам и сообщит вам в ответ. Если нужно срочно — позвоните или напишите в Telegram.',
      quick:['Позвонить','Telegram']
    },
    {
      patterns:['привет','здравств','добр','hello','hi','хай'],
      answer:'Здравствуйте! 👋 Чем могу помочь? Выберите тему ниже или напишите свой вопрос.',
      quick:['Как купить?','Как продать?','Тарифы','Контакты']
    }
  ];

  const DEFAULT_QUICK = ['Как купить?','Как продать?','Тарифы и комиссия','Доставка','Контакты'];

  function matchFAQ(text){
    const t = text.toLowerCase().trim();
    if (!t) return null;
    for (const item of FAQ){
      for (const p of item.patterns){
        if (t.includes(p)) return item;
      }
    }
    return null;
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function build(){
    if (document.querySelector('.support-chat-fab')) return;

    // FAB кнопка
    const fab = document.createElement('button');
    fab.className = 'support-chat-fab';
    fab.setAttribute('aria-label','Открыть чат поддержки');
    fab.innerHTML = `
      <span class="pulse"></span>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    `;
    document.body.appendChild(fab);

    // Панель
    const panel = document.createElement('div');
    panel.className = 'support-chat-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Чат с поддержкой');
    panel.innerHTML = `
      <div class="support-chat-head">
        <div class="support-chat-avatar">РУ</div>
        <div>
          <div class="title">Поддержка Русский Урожай</div>
          <div class="status">Онлайн · отвечаем в течение 3 часов</div>
        </div>
        <button class="close" aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 1l12 12M13 1L1 13"/></svg>
        </button>
      </div>
      <div class="support-chat-body" id="supportChatBody">
        <div class="support-msg bot">
          <div class="who">Поддержка</div>
          Здравствуйте! Меня зовут Анна, я из команды поддержки Русский Урожай. Чем могу помочь?
        </div>
        <div class="support-msg bot">
          <div class="who">Поддержка</div>
          Выберите тему или напишите свой вопрос:
        </div>
        <div class="support-quick" id="supportQuick"></div>
      </div>
      <div class="support-chat-actions">
        <a href="tel:${SUPPORT_PHONE}" title="Позвонить">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          ${SUPPORT_PHONE_FMT}
        </a>
        <a class="tg" href="https://t.me/${SUPPORT_TG}" target="_blank" rel="noopener" title="Telegram">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.6 8.2l-1.9 8.9c-.1.6-.5.8-1.1.5l-3-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.7-5.1c.2-.2 0-.3-.4-.1l-7 4.4-3-.9c-.7-.2-.7-.7.1-1l11.7-4.5c.5-.2 1 .1.7 1z"/></svg>
          Telegram
        </a>
      </div>
      <div class="support-chat-input">
        <textarea id="supportChatInput" placeholder="Напишите ваш вопрос..." rows="1"></textarea>
        <button class="send-btn" id="supportChatSend" aria-label="Отправить" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    // Quick-кнопки
    renderQuickButtons(DEFAULT_QUICK);

    // События
    fab.addEventListener('click', toggle);
    panel.querySelector('.close').addEventListener('click', close);

    const input = panel.querySelector('#supportChatInput');
    const sendBtn = panel.querySelector('#supportChatSend');
    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
      // авторесайз
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    sendBtn.addEventListener('click', send);

    // Закрытие по Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('on')) close();
    });
  }

  function renderQuickButtons(items){
    const wrap = document.getElementById('supportQuick');
    if (!wrap) return;
    wrap.innerHTML = '';
    items.forEach(text => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        addUserMsg(text);
        handleUserInput(text);
        wrap.remove();
      });
      wrap.appendChild(btn);
    });
  }

  function addUserMsg(text){
    const body = document.getElementById('supportChatBody');
    if (!body) return;
    const msg = document.createElement('div');
    msg.className = 'support-msg user';
    msg.innerHTML = `<div class="who">Вы</div>${escapeHtml(text).replace(/\n/g,'<br>')}`;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function addBotMsg(text, quick){
    const body = document.getElementById('supportChatBody');
    if (!body) return;
    const msg = document.createElement('div');
    msg.className = 'support-msg bot';
    msg.innerHTML = `<div class="who">Поддержка</div>${escapeHtml(text).replace(/\n/g,'<br>')}`;
    body.appendChild(msg);
    if (quick && quick.length){
      const q = document.createElement('div');
      q.className = 'support-quick';
      quick.forEach(t => {
        const b = document.createElement('button');
        b.type='button';b.textContent=t;
        b.addEventListener('click', () => {
          addUserMsg(t);
          handleUserInput(t);
          q.remove();
        });
        q.appendChild(b);
      });
      body.appendChild(q);
    }
    body.scrollTop = body.scrollHeight;
  }

  function addTyping(){
    const body = document.getElementById('supportChatBody');
    if (!body) return null;
    const t = document.createElement('div');
    t.className = 'support-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
    return t;
  }

  function handleUserInput(text){
    const typing = addTyping();
    setTimeout(() => {
      typing && typing.remove();
      const faq = matchFAQ(text);
      if (faq){
        addBotMsg(faq.answer, faq.quick);
      } else {
        // Незнакомый вопрос — пишем в admin_inbox и показываем сообщение
        logToInbox(text);
        addBotMsg(
          `Спасибо за вопрос! Передал его менеджеру — ответим в течение 3 часов в рабочие часы (Пн–Пт, 9:00–18:00 Мск).\n\nЕсли вопрос срочный — позвоните ${SUPPORT_PHONE_FMT} или напишите в Telegram @${SUPPORT_TG}.`,
          ['Позвонить','Telegram','Задать ещё вопрос']
        );
      }
    }, 700 + Math.random()*500);
  }

  function send(){
    const input = document.getElementById('supportChatInput');
    const sendBtn = document.getElementById('supportChatSend');
    if (!input) return;
    const v = input.value.trim();
    if (!v) return;
    addUserMsg(v);
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    // удалим quick если есть
    document.querySelectorAll('#supportChatBody .support-quick').forEach(el => el.remove());
    handleUserInput(v);
  }

  function logToInbox(text){
    try{
      const cfg = window.RH_CONFIG || {};
      if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
      fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/submit_purchase_lead`, {
        method:'POST',
        headers:{
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type':'application/json',
          'Accept':'application/json'
        },
        body: JSON.stringify({
          p_kind: 'support_chat',
          p_offer_id: null,
          p_request_id: null,
          p_volume_tons: null,
          p_message: 'Вопрос из чата поддержки на сайте: ' + text,
          p_user_phone: null,
          p_user_email: null,
          p_user_name: null,
        })
      }).catch(()=>{});
    } catch(_){}
  }

  function open(){
    const fab = document.querySelector('.support-chat-fab');
    const panel = document.querySelector('.support-chat-panel');
    if (!fab || !panel) return;
    panel.classList.add('on');
    fab.classList.add('open');
    fab.innerHTML = `<svg width="22" height="22" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M1 1l12 12M13 1L1 13"/></svg>`;
    setTimeout(() => {
      const input = document.getElementById('supportChatInput');
      input && input.focus();
    }, 200);
  }

  function close(){
    const fab = document.querySelector('.support-chat-fab');
    const panel = document.querySelector('.support-chat-panel');
    if (!fab || !panel) return;
    panel.classList.remove('on');
    fab.classList.remove('open');
    fab.innerHTML = `
      <span class="pulse"></span>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    `;
  }

  function toggle(){
    const panel = document.querySelector('.support-chat-panel');
    if (!panel) return;
    if (panel.classList.contains('on')) close(); else open();
  }

  // Публичный API
  window.RH_SupportChat = { open, close, toggle };

  // Инициализация
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

  // Хэндлер для ссылок [data-support-chat] — позволяет вызывать из карточек "Задать вопрос"
  document.addEventListener('click', function(e){
    const trigger = e.target.closest('[data-support-chat]');
    if (trigger){
      e.preventDefault();
      open();
    }
  });
})();
