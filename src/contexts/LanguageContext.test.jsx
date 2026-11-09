import React from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { LanguageProvider, useLanguage, useTranslation } from "./LanguageContext";
import { STORAGE_KEY, DEFAULT_LANGUAGE } from "../i18n";

// Helper test consumer component
function TestConsumer({ lookupKey, params, fallback }) {
  const { language, setLanguage, t, isItalian, isEnglish } = useLanguage();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <span data-testid="is-it">{String(isItalian)}</span>
      <span data-testid="is-en">{String(isEnglish)}</span>
      <span data-testid="translated-text">{t(lookupKey, params, fallback)}</span>
      <button onClick={() => setLanguage("it")} data-testid="btn-set-it">Italiano</button>
      <button onClick={() => setLanguage("en")} data-testid="btn-set-en">English</button>
      <button onClick={() => setLanguage("invalid")} data-testid="btn-set-invalid">Invalid</button>
    </div>
  );
}

describe("LanguageContext & i18n Translation Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. Initialization & Default State
  // =========================================================================
  describe("1. Initialization & Default State", () => {
    test("initializes with default Italian ('it') when localStorage is empty", () => {
      render(
        <LanguageProvider>
          <TestConsumer lookupKey="nav.settings" />
        </LanguageProvider>
      );

      expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
      expect(screen.getByTestId("is-it")).toHaveTextContent("true");
      expect(screen.getByTestId("is-en")).toHaveTextContent("false");
      expect(document.documentElement.lang).toBe("it");
      expect(localStorage.getItem(STORAGE_KEY || "househelper_language")).toBe("it");
      expect(screen.getByTestId("translated-text")).toHaveTextContent("Impostazioni");
    });

    test("hydrates initial language from localStorage when set to 'en'", () => {
      localStorage.setItem("househelper_language", "en");

      render(
        <LanguageProvider>
          <TestConsumer lookupKey="nav.settings" />
        </LanguageProvider>
      );

      expect(screen.getByTestId("current-lang")).toHaveTextContent("en");
      expect(screen.getByTestId("is-en")).toHaveTextContent("true");
      expect(screen.getByTestId("is-it")).toHaveTextContent("false");
      expect(document.documentElement.lang).toBe("en");
      expect(screen.getByTestId("translated-text")).toHaveTextContent("Settings");
    });

    test("falls back to 'it' when localStorage contains an invalid locale", () => {
      localStorage.setItem("househelper_language", "unsupported_locale_xyz");

      render(
        <LanguageProvider>
          <TestConsumer lookupKey="nav.settings" />
        </LanguageProvider>
      );

      expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
      expect(document.documentElement.lang).toBe("it");
    });

    test("respects initialLanguage prop override when supplied to LanguageProvider", () => {
      render(
        <LanguageProvider initialLanguage="en">
          <TestConsumer lookupKey="nav.settings" />
        </LanguageProvider>
      );

      expect(screen.getByTestId("current-lang")).toHaveTextContent("en");
      expect(document.documentElement.lang).toBe("en");
      expect(screen.getByTestId("translated-text")).toHaveTextContent("Settings");
    });
  });

  // =========================================================================
  // 2. Language Switching & HTML Lang Sync
  // =========================================================================
  describe("2. Language Switching & HTML Lang Sync", () => {
    test("switches language from 'it' to 'en' dynamically and persists to localStorage", () => {
      render(
        <LanguageProvider>
          <TestConsumer lookupKey="nav.settings" />
        </LanguageProvider>
      );

      expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
      expect(screen.getByTestId("translated-text")).toHaveTextContent("Impostazioni");
      expect(document.documentElement.lang).toBe("it");

      // Switch to English
      fireEvent.click(screen.getByTestId("btn-set-en"));

      expect(screen.getByTestId("current-lang")).toHaveTextContent("en");
      expect(screen.getByTestId("is-en")).toHaveTextContent("true");
      expect(screen.getByTestId("translated-text")).toHaveTextContent("Settings");
      expect(document.documentElement.lang).toBe("en");
      expect(localStorage.getItem("househelper_language")).toBe("en");
    });

    test("switches back from 'en' to 'it' seamlessly", () => {
      localStorage.setItem("househelper_language", "en");

      render(
        <LanguageProvider>
          <TestConsumer lookupKey="nav.settings" />
        </LanguageProvider>
      );

      expect(screen.getByTestId("current-lang")).toHaveTextContent("en");
      expect(screen.getByTestId("translated-text")).toHaveTextContent("Settings");

      // Switch to Italian
      fireEvent.click(screen.getByTestId("btn-set-it"));

      expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
      expect(screen.getByTestId("translated-text")).toHaveTextContent("Impostazioni");
      expect(document.documentElement.lang).toBe("it");
      expect(localStorage.getItem("househelper_language")).toBe("it");
    });

    test("rejects or ignores unsupported language codes during setLanguage", () => {
      render(
        <LanguageProvider>
          <TestConsumer lookupKey="nav.settings" />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId("btn-set-invalid"));

      // Language remains 'it'
      expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
      expect(document.documentElement.lang).toBe("it");
    });
  });

  // =========================================================================
  // 3. Dot-Delimited Translation Resolution
  // =========================================================================
  describe("3. Dot-Delimited Translation Resolution", () => {
    test("resolves Italian navigation and settings keys correctly", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      expect(result.current.t("nav.settings")).toBe("Impostazioni");
      expect(result.current.t("settings.theme.title")).toBe("Tema e Aspetto");
      expect(result.current.t("settings.theme.dark")).toBe("Tema Scuro");
      expect(result.current.t("settings.theme.light")).toBe("Tema Chiaro");
      expect(result.current.t("settings.theme.system")).toBe("Automatico (Sistema)");
      expect(result.current.t("settings.household.title")).toBe("Casa Attiva");
    });

    test("resolves English navigation and settings keys correctly", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="en">{children}</LanguageProvider>
      });

      expect(result.current.t("nav.settings")).toBe("Settings");
      expect(result.current.t("settings.theme.title")).toBe("Theme & Appearance");
      expect(result.current.t("settings.theme.dark")).toBe("Dark Theme");
      expect(result.current.t("settings.theme.light")).toBe("Light Theme");
      expect(result.current.t("settings.theme.system")).toBe("Automatic (System)");
      expect(result.current.t("settings.household.title")).toBe("Active Household");
    });

    test("resolves common actions and security keys in both languages", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      expect(result.current.t("common.save")).toBe("Salva");
      expect(result.current.t("common.cancel")).toBe("Annulla");
      expect(result.current.t("common.confirm")).toBe("Conferma");
      expect(result.current.t("settings.security.title")).toBe("Account e Sicurezza");

      act(() => {
        result.current.setLanguage("en");
      });

      expect(result.current.t("common.save")).toBe("Save");
      expect(result.current.t("common.cancel")).toBe("Cancel");
      expect(result.current.t("common.confirm")).toBe("Confirm");
      expect(result.current.t("settings.security.title")).toBe("Account & Security");
    });
  });

  // =========================================================================
  // 4. Fallback Cascade Mechanism (Target -> Italian -> Fallback String -> Key)
  // =========================================================================
  describe("4. Fallback Cascade Mechanism", () => {
    test("returns custom fallback string when key is missing in all dictionaries", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      const fallbackText = "Test Fallback Content";
      expect(result.current.t("non.existent.deeply.nested.key", null, fallbackText)).toBe(fallbackText);
    });

    test("returns key path as final fallback when key is missing and no custom fallback provided", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      const missingKey = "totally.missing.sample.key";
      expect(result.current.t(missingKey)).toBe(missingKey);
    });

    test("handles intermediate non-leaf objects by returning fallback or key rather than object", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      // "settings.theme" is an object, not a leaf string
      expect(result.current.t("settings.theme")).toBe("settings.theme");
      expect(result.current.t("settings.theme", null, "Default")).toBe("Default");
    });

    test("handles null, undefined, or empty key gracefully without crashing", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>
      });

      expect(result.current.t("")).toBe("");
      expect(result.current.t(null)).toBe("");
      expect(result.current.t(undefined)).toBe("");
      expect(result.current.t("", null, "Fallback")).toBe("Fallback");
    });
  });

  // =========================================================================
  // 5. Named Parameter Interpolation
  // =========================================================================
  describe("5. Named Parameter Interpolation", () => {
    test("interpolates single named parameter correctly", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      const text = result.current.t("nav.greeting", { name: "Marco" });
      expect(text).toBe("Ciao, Marco");

      act(() => {
        result.current.setLanguage("en");
      });

      const textEn = result.current.t("nav.greeting", { name: "Alex" });
      expect(textEn).toBe("Hello, Alex");
    });

    test("interpolates numeric parameters (including 0 safely)", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      const text0 = result.current.t("settings.security.verificationCooldown", { seconds: 0 });
      expect(text0).toBe("Attendi 0s prima di richiedere un altro invio.");

      const text60 = result.current.t("settings.security.verificationCooldown", { seconds: 60 });
      expect(text60).toBe("Attendi 60s prima di richiedere un altro invio.");
    });

    test("interpolates count parameters", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      const countText = result.current.t("settings.household.membersCount", { count: 3 });
      expect(countText).toBe("3 coinquilini");

      act(() => {
        result.current.setLanguage("en");
      });

      const countTextEn = result.current.t("settings.household.membersCount", { count: 3 });
      expect(countTextEn).toBe("3 housemates");
    });

    test("preserves unmatched placeholders when parameter is missing", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      const text = result.current.t("settings.security.verificationCooldown", {});
      expect(text).toBe("Attendi {seconds}s prima di richiedere un altro invio.");
    });

    test("handles non-object or null params safely", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      expect(result.current.t("settings.theme.title", null)).toBe("Tema e Aspetto");
      expect(result.current.t("settings.theme.title", "invalid_param")).toBe("Tema e Aspetto");
    });
  });

  // =========================================================================
  // 6. Zero-Emoji Compliance on Dictionaries
  // =========================================================================
  describe("6. Zero-Emoji Compliance on Dictionaries", () => {
    const emojiRegex = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;

    test("verifies Italian settings dictionary outputs contain zero emojis", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>
      });

      const testKeys = [
        "nav.settings",
        "settings.theme.title",
        "settings.theme.dark",
        "settings.theme.light",
        "settings.theme.system",
        "settings.language.title",
        "settings.notifications.title",
        "settings.security.title",
        "common.save",
        "common.cancel",
        "footer.copyright"
      ];

      testKeys.forEach((key) => {
        const text = result.current.t(key);
        expect(emojiRegex.test(text)).toBe(false);
      });
    });

    test("verifies English settings dictionary outputs contain zero emojis", () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="en">{children}</LanguageProvider>
      });

      const testKeys = [
        "nav.settings",
        "settings.theme.title",
        "settings.theme.dark",
        "settings.theme.light",
        "settings.theme.system",
        "settings.language.title",
        "settings.notifications.title",
        "settings.security.title",
        "common.save",
        "common.cancel",
        "footer.copyright"
      ];

      testKeys.forEach((key) => {
        const text = result.current.t(key);
        expect(emojiRegex.test(text)).toBe(false);
      });
    });
  });

  // =========================================================================
  // 7. Error Boundaries, Aliases & Robustness
  // =========================================================================
  describe("7. Error Boundaries, Aliases & Robustness", () => {
    test("handles localStorage.setItem throwing QuotaExceededError without crashing", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() => {
        render(
          <LanguageProvider>
            <TestConsumer lookupKey="nav.settings" />
          </LanguageProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
      Storage.prototype.setItem.mockRestore();
    });

    test("provides defensive default context values when rendered outside LanguageProvider", () => {
      const { result } = renderHook(() => useLanguage());

      expect(result.current.language).toBe(DEFAULT_LANGUAGE || "it");
      expect(result.current.isItalian).toBe(true);
      expect(result.current.isEnglish).toBe(false);
      expect(typeof result.current.setLanguage).toBe("function");
      expect(typeof result.current.t).toBe("function");
      expect(result.current.t("nav.settings")).toBe("Impostazioni");
    });

    test("useTranslation is an alias for useLanguage", () => {
      expect(useTranslation).toBe(useLanguage);
    });
  });
});
