import it from "./it";
import en from "./en";

export const dictionaries = { it, en };
export const DEFAULT_LANGUAGE = "it";
export const SUPPORTED_LANGUAGES = ["it", "en"];
export const STORAGE_KEY = "househelper_language";

/**
 * Safely resolves a dot-delimited key path (e.g. "settings.theme.system") from an object.
 * Returns undefined if path does not resolve to a terminal string or number.
 *
 * @param {Object} obj - Dictionary object
 * @param {string} keyPath - Dot-separated key path
 * @returns {string|undefined} Resolved string value or undefined
 */
export function getNestedValue(obj, keyPath) {
  if (!obj || typeof keyPath !== "string" || !keyPath.trim()) {
    return undefined;
  }
  const parts = keyPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  if (typeof current === "string") return current;
  if (typeof current === "number") return String(current);
  return undefined;
}

/**
 * Replaces named placeholders {variable} with values from params object.
 * Correctly handles falsy values like 0. Preserves unmatched tokens {var} for debugging.
 *
 * @param {string} template - String containing {param} placeholders
 * @param {Record<string, any>} [params] - Key-value map for token substitution
 * @returns {string} Interpolated string
 */
export function interpolate(template, params) {
  if (!params || typeof template !== "string" || typeof params !== "object") {
    return template;
  }
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return key in params && params[key] !== undefined && params[key] !== null
      ? String(params[key])
      : match;
  });
}

/**
 * Translates a key with strict fallback cascade:
 * target -> it (if target is not it) -> custom fallback -> key
 *
 * @param {string} lang - Requested language code ('it' | 'en')
 * @param {string} key - Dot-delimited translation key (e.g. "nav.settings")
 * @param {Record<string, any>} [params] - Key-value map for parameter interpolation
 * @param {string} [fallback] - Optional custom fallback string if key is missing
 * @returns {string} Fully resolved and interpolated translation string
 */
export function translate(lang, key, params, fallback) {
  if (!key || typeof key !== "string") {
    return fallback !== undefined ? interpolate(String(fallback), params) : "";
  }

  const currentLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

  // 1. Look up in target language dictionary
  let text = getNestedValue(dictionaries[currentLang], key);

  // 2. Fall back to Italian default base if target language lacks key
  if (text === undefined && currentLang !== DEFAULT_LANGUAGE) {
    text = getNestedValue(dictionaries[DEFAULT_LANGUAGE], key);
  }

  // 3. Fall back to custom fallback string if provided
  if (text === undefined && fallback !== undefined) {
    text = String(fallback);
  }

  // 4. Fall back to the original key string
  if (text === undefined) {
    text = key;
  }

  // 5. Interpolate named tokens
  return interpolate(text, params);
}

/**
 * Creates a pre-bound translation function for a specific language.
 *
 * @param {string} lang - Language code
 * @returns {(key: string, params?: Record<string, any>, fallback?: string) => string}
 */
export function createTranslator(lang) {
  return (key, params, fallback) => translate(lang, key, params, fallback);
}

// Convenient alias matching internationalization conventions
export const t = translate;

export default translate;
