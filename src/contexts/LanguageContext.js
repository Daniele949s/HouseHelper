import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { translate, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, STORAGE_KEY } from "../i18n";

const FALLBACK_STORAGE_KEY = STORAGE_KEY || "househelper_language";
const FALLBACK_DEFAULT_LANG = DEFAULT_LANGUAGE || "it";
const FALLBACK_SUPPORTED_LANGS = SUPPORTED_LANGUAGES || ["it", "en"];

const defaultLanguageContext = {
  language: FALLBACK_DEFAULT_LANG,
  setLanguage: () => {},
  t: (key, params, fallback) => {
    if (typeof translate === "function") {
      return translate(FALLBACK_DEFAULT_LANG, key, params, fallback);
    }
    return fallback !== undefined ? fallback : (key || "");
  },
  isItalian: true,
  isEnglish: false,
};

export const LanguageContext = createContext(defaultLanguageContext);

/**
 * Hook to access language context: current language, updater, and translation function.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  return context || defaultLanguageContext;
}

/**
 * Standard i18n convention alias for useLanguage.
 */
export const useTranslation = useLanguage;

/**
 * React 19 Provider managing language preference, localStorage persistence,
 * and document.documentElement.lang synchronization.
 */
export function LanguageProvider({ children, initialLanguage }) {
  const [language, setLanguageState] = useState(() => {
    if (initialLanguage && FALLBACK_SUPPORTED_LANGS.includes(initialLanguage)) {
      return initialLanguage;
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
        if (saved && FALLBACK_SUPPORTED_LANGS.includes(saved)) {
          return saved;
        }
      }
    } catch (e) {
      console.warn("Could not read language from localStorage:", e);
    }
    return FALLBACK_DEFAULT_LANG;
  });

  const setLanguage = useCallback((newLang) => {
    if (FALLBACK_SUPPORTED_LANGS.includes(newLang)) {
      setLanguageState(newLang);
    } else {
      console.warn(`Unsupported language "${newLang}". Supported: ${FALLBACK_SUPPORTED_LANGS.join(", ")}`);
    }
  }, []);

  // Synchronize document.documentElement.lang and localStorage
  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = language;
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(FALLBACK_STORAGE_KEY, language);
      }
    } catch (e) {
      console.warn("Could not save language to localStorage:", e);
    }
  }, [language]);

  const t = useCallback(
    (key, params, fallback) => {
      if (typeof translate === "function") {
        return translate(language, key, params, fallback);
      }
      if (!key || typeof key !== "string") {
        return fallback !== undefined ? String(fallback) : "";
      }
      return fallback !== undefined ? fallback : key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isItalian: language === "it",
      isEnglish: language === "en",
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageContext;
