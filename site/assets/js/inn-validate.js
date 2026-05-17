/**
 * Russian Harvest · v2.6.28
 * ============================================================
 * ВАЛИДАЦИЯ ИНН ПО КОНТРОЛЬНОЙ СУММЕ
 * ============================================================
 * Локальная проверка (без API) корректности ИНН по алгоритму ФНС.
 *  - 10 цифр — юрлицо (ООО/АО)
 *  - 12 цифр — физлицо / ИП / самозанятый
 *
 * Это «Вариант 1» (формула). «Вариант 3» добавит при регистрации
 * API-проверку существования через Дадату (когда подключим ключи).
 *
 * Алгоритм: https://ru.wikipedia.org/wiki/Идентификационный_номер_налогоплательщика
 * ============================================================
 */

(function() {
  'use strict';

  // Весовые коэффициенты для контрольных разрядов (по ФНС)
  const W10   = [2, 4, 10, 3, 5, 9, 4, 6, 8];
  const W12_1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
  const W12_2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

  function checkDigit(digits, weights) {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += digits[i] * weights[i];
    }
    return (sum % 11) % 10;
  }

  /**
   * Проверяет ИНН.
   * @param {string} inn
   * @returns {{valid: boolean, type: 'legal'|'individual'|null, error: string|null}}
   */
  function validateINN(inn) {
    if (inn == null) {
      return { valid: false, type: null, error: 'ИНН не указан' };
    }
    const s = String(inn).replace(/\s/g, '').trim();

    if (!/^\d+$/.test(s)) {
      return { valid: false, type: null, error: 'ИНН должен содержать только цифры' };
    }

    if (s.length !== 10 && s.length !== 12) {
      return { valid: false, type: null, error: 'ИНН должен быть 10 цифр (юрлицо) или 12 (ИП/физлицо)' };
    }

    const d = s.split('').map(Number);

    if (s.length === 10) {
      // Юрлицо: 10-я цифра — контрольная
      const cd = checkDigit(d, W10);
      if (cd !== d[9]) {
        return { valid: false, type: 'legal', error: 'Неверная контрольная сумма ИНН (10 цифр)' };
      }
      return { valid: true, type: 'legal', error: null };
    } else {
      // Физлицо/ИП: 11-я и 12-я цифры — контрольные
      const cd1 = checkDigit(d, W12_1);
      const cd2 = checkDigit(d, W12_2);
      if (cd1 !== d[10] || cd2 !== d[11]) {
        return { valid: false, type: 'individual', error: 'Неверная контрольная сумма ИНН (12 цифр)' };
      }
      return { valid: true, type: 'individual', error: null };
    }
  }

  /**
   * Привязывает live-валидацию к input-полю.
   * Подсвечивает поле и показывает сообщение под ним.
   *
   * @param {HTMLInputElement} input
   * @param {Object} opts — { onValid: fn(type), onInvalid: fn(error), messageEl }
   */
  function attachToInput(input, opts) {
    opts = opts || {};
    const validate = () => {
      const v = input.value.trim();
      if (!v) {
        input.classList.remove('inn-valid', 'inn-invalid');
        if (opts.messageEl) opts.messageEl.textContent = '';
        return;
      }
      const res = validateINN(v);
      if (res.valid) {
        input.classList.add('inn-valid');
        input.classList.remove('inn-invalid');
        if (opts.messageEl) {
          opts.messageEl.textContent = res.type === 'legal' ? '✓ ИНН юрлица' : '✓ ИНН ИП / физлица';
          opts.messageEl.className = 'inn-msg inn-msg-ok';
        }
        if (opts.onValid) opts.onValid(res.type);
      } else {
        input.classList.add('inn-invalid');
        input.classList.remove('inn-valid');
        if (opts.messageEl) {
          opts.messageEl.textContent = res.error;
          opts.messageEl.className = 'inn-msg inn-msg-err';
        }
        if (opts.onInvalid) opts.onInvalid(res.error);
      }
    };
    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
    return validate;
  }

  window.RH_INN = {
    validate: validateINN,
    attachToInput,
  };
})();
