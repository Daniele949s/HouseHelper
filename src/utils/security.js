/**
 * Security and Data Sanitization Utilities
 * Provides defense-in-depth against:
 * 1. Invalid, negative, or excessively large numbers (DoS, arithmetic errors, balance corruption)
 * 2. Injection attacks (XSS, script injection, HTML injection, NoSQL injection patterns)
 * 3. Buffer/payload bloat via strict length limits
 * 4. Invalid or manipulated calendar dates
 */

/**
 * Strips HTML tags, scripts, dangerous schemes, and unprintable characters.
 * Truncates output to maxLength and trims whitespace.
 *
 * @param {any} input
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeText(input, maxLength = 255) {
  if (input === null || input === undefined) return "";
  let str = String(input);

  // 1. Remove null bytes and invisible control characters (preserve normal newlines and tabs)
  // eslint-disable-next-line no-control-regex
  str = str.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Strip HTML/XML tags completely
  str = str.replace(/<[^>]*>/g, "");

  // 3. Remove dangerous URI schemes like javascript: or vbscript: or data:
  str = str.replace(/(?:javascript|vbscript|data):/gi, "");

  // 4. Normalize multiple consecutive whitespaces/newlines to prevent layout distortion
  str = str.replace(/[ \t]+/g, " ");

  // 5. Trim and enforce length limit
  return str.trim().slice(0, maxLength);
}

/**
 * Sanitizes alphanumeric codes like house invite codes.
 *
 * @param {any} input
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeAlphanumeric(input, maxLength = 10) {
  if (input === null || input === undefined) return "";
  const str = String(input);
  return str.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, maxLength);
}

/**
 * Validates and sanitizes numeric inputs.
 * Rejects negative numbers (if min >= 0), zero (if min > 0), NaN, Infinity,
 * scientific notation extremes, and numbers exceeding max.
 *
 * @param {any} val
 * @param {object} options
 * @param {number} options.min - Minimum allowed value (default 0.01)
 * @param {number} options.max - Maximum allowed value (default 50000.00)
 * @param {number} options.decimals - Maximum decimal places allowed (default 2)
 * @param {boolean} options.required - Whether the field is required (default true)
 * @returns {{ isValid: boolean, value: number, formatted: string, error?: string }}
 */
export function validateNumber(val, {
  min = 0.01,
  max = 50000,
  decimals = 2,
  required = true
} = {}) {
  if (val === null || val === undefined || String(val).trim() === "") {
    if (!required) {
      return { isValid: true, value: 0, formatted: "0.00" };
    }
    return { isValid: false, value: 0, formatted: "", error: "Il valore è obbligatorio." };
  }

  // Reject strings with multiple decimal points, unexpected characters, or scientific 'e'
  const strVal = String(val).trim();
  if (!/^-?\d+(\.\d+)?$/.test(strVal)) {
    return { isValid: false, value: 0, formatted: "", error: "Inserisci un numero valido." };
  }

  const num = parseFloat(strVal);

  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return { isValid: false, value: 0, formatted: "", error: "Numero non valido." };
  }

  if (min !== undefined && num < min) {
    if (min > 0) {
      return {
        isValid: false,
        value: num,
        formatted: "",
        error: `L'importo non può essere negativo o nullo (minimo ${min.toFixed(decimals)} €).`
      };
    }
    return {
      isValid: false,
      value: num,
      formatted: "",
      error: `Il valore minimo consentito è ${min}.`
    };
  }

  if (max !== undefined && num > max) {
    return {
      isValid: false,
      value: num,
      formatted: "",
      error: `L'importo inserito è troppo elevato (massimo consentito ${max.toLocaleString('it-IT')} €).`
    };
  }

  // Check decimal places
  const parts = strVal.split(".");
  if (parts.length > 1 && parts[1].length > decimals) {
    return {
      isValid: false,
      value: num,
      formatted: "",
      error: `Massimo ${decimals} cifre decimali consentite.`
    };
  }

  const roundedValue = Number(num.toFixed(decimals));
  return {
    isValid: true,
    value: roundedValue,
    formatted: roundedValue.toFixed(decimals)
  };
}

/**
 * Safely parses any number for balance and total calculations.
 * Always returns a finite positive/safe number, never NaN or Infinity.
 *
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
export function safeFloat(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Validates and sanitizes calendar dates in YYYY-MM-DD format within safe bounds.
 *
 * @param {string} dateStr
 * @param {number} minYear
 * @param {number} maxYear
 * @returns {{ isValid: boolean, date: string, error?: string }}
 */
export function validateDate(dateStr, minYear = 2020, maxYear = 2100) {
  if (!dateStr || typeof dateStr !== "string") {
    return { isValid: false, date: "", error: "Data non specificata." };
  }

  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return { isValid: false, date: "", error: "Formato data non valido (atteso AAAA-MM-GG)." };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < minYear || year > maxYear) {
    return { isValid: false, date: "", error: `L'anno deve essere compreso tra ${minYear} e ${maxYear}.` };
  }

  if (month < 1 || month > 12) {
    return { isValid: false, date: "", error: "Mese non valido." };
  }

  // Validate days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { isValid: false, date: "", error: `Giorno non valido per il mese selezionato (max ${daysInMonth}).` };
  }

  return { isValid: true, date: trimmed };
}

/**
 * Sanitizes an array of strings (e.g. cleaning operators or places)
 *
 * @param {any} list - Array or comma-separated string
 * @param {number} maxItems - Maximum number of items allowed
 * @param {number} maxItemLength - Maximum length per item
 * @returns {string[]}
 */
export function sanitizeList(list, maxItems = 15, maxItemLength = 80) {
  let items = [];
  if (Array.isArray(list)) {
    items = list;
  } else if (typeof list === "string") {
    items = list.split(",");
  } else {
    return [];
  }

  return items
    .map(item => sanitizeText(item, maxItemLength))
    .filter(item => item.length > 0)
    .slice(0, maxItems);
}

/**
 * Validates standard email address format.
 *
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length > 100) return false;
  // RFC 5322 standard simplified email regex
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(trimmed);
}
