import React, { useState } from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { LanguageProvider, useLanguage, useTranslation } from "../../contexts/LanguageContext";
import {
  translate,
  getNestedValue,
  interpolate,
  dictionaries,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  STORAGE_KEY
} from "../../i18n";

// Official regex patterns from scripts/verify-zero-emojis.js
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

describe("Milestone M1 Adversarial Challenger Suite: i18n & LanguageContext Stress Harness", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    jest.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: KEY ACCESS STRESS TESTING
  // =========================================================================
  describe("1. Key Access Stress Testing", () => {
    test("1.1 Non-existent deeply nested keys return fallback or key without throwing", () => {
      const nonExistentKeys = [
        "settings.theme.superNonExistentProperty",
        "deeply.nested.property.path.that.does.not.exist.at.all.1.2.3.4",
        "nav.unknownSection",
        "common.unsupportedAction.extra.deep",
        "a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p",
        "..",
        "settings..theme",
        ".nav.settings",
        "nav.settings.",
        "...",
        ".",
      ];

      nonExistentKeys.forEach((key) => {
        expect(() => translate("it", key)).not.toThrow();
        expect(translate("it", key)).toBe(key);
        expect(translate("it", key, null, "CustomFallback")).toBe("CustomFallback");
        expect(translate("en", key)).toBe(key);
        expect(translate("en", key, null, "CustomFallbackEn")).toBe("CustomFallbackEn");
      });
    });

    test("1.2 Null, undefined, empty, and whitespace-only keys handle gracefully", () => {
      // Null, undefined, and empty string return "" (or fallback if provided)
      const falsyKeys = [null, undefined, ""];
      falsyKeys.forEach((k) => {
        expect(translate("it", k)).toBe("");
        expect(translate("it", k, null, "SafeFallback")).toBe("SafeFallback");
        expect(translate("en", k)).toBe("");
        expect(translate("en", k, null, "SafeFallbackEn")).toBe("SafeFallbackEn");
        expect(getNestedValue(dictionaries.it, k)).toBeUndefined();
      });

      // Whitespace-only keys are non-empty strings not found in dictionary:
      // without fallback they return the key itself, with fallback they return the fallback
      const whitespaceKeys = ["   ", "\t\t\n", " \n "];
      whitespaceKeys.forEach((k) => {
        expect(translate("it", k)).toBe(k);
        expect(translate("it", k, null, "SafeFallback")).toBe("SafeFallback");
        expect(getNestedValue(dictionaries.it, k)).toBeUndefined();
      });
    });

    test("1.3 Non-string keys (numbers, objects, arrays, booleans, functions, symbols) do not crash", () => {
      const nonStringKeys = [
        0,
        1,
        -1,
        42,
        3.14159,
        NaN,
        Infinity,
        -Infinity,
        true,
        false,
        {},
        { nav: "settings" },
        [],
        ["nav", "settings"],
        () => {},
        function() {},
        Symbol("key"),
        Symbol.for("testSym"),
      ];

      nonStringKeys.forEach((badKey) => {
        expect(() => translate("it", badKey)).not.toThrow();
        expect(translate("it", badKey)).toBe("");
        expect(translate("it", badKey, null, "FallbackForNonString")).toBe("FallbackForNonString");
        expect(getNestedValue(dictionaries.it, badKey)).toBeUndefined();
      });
    });

    test("1.4 Prototype properties (__proto__, constructor, toString, etc.) return safe fallbacks without pollution", () => {
      const protoKeys = [
        "__proto__",
        "constructor",
        "toString",
        "valueOf",
        "hasOwnProperty",
        "isPrototypeOf",
        "propertyIsEnumerable",
        "toLocaleString",
        "__defineGetter__",
        "__defineSetter__",
        "__proto__.__proto__",
        "__proto__.polluted",
        "constructor.prototype",
        "constructor.prototype.polluted",
        "toString.call",
        "nav.__proto__",
        "nav.constructor",
        "settings.theme.__proto__",
        "settings.theme.toString",
      ];

      protoKeys.forEach((protoKey) => {
        expect(() => translate("it", protoKey)).not.toThrow();
        // Prototype properties must never resolve to internal functions or raw prototypes
        const resolvedIt = translate("it", protoKey);
        expect(typeof resolvedIt).toBe("string");
        expect(resolvedIt).toBe(protoKey); // falls back to the key string itself

        const resolvedEn = translate("en", protoKey);
        expect(typeof resolvedEn).toBe("string");
        expect(resolvedEn).toBe(protoKey);

        const customFallback = translate("it", protoKey, null, "SafeProtoFallback");
        expect(customFallback).toBe("SafeProtoFallback");

        // getNestedValue must return undefined for functions or Object.prototype
        const directValue = getNestedValue(dictionaries.it, protoKey);
        expect(directValue).toBeUndefined();
      });

      // Assert prototype was NOT polluted
      expect(Object.prototype.polluted).toBeUndefined();
      expect(({}).polluted).toBeUndefined();
    });

    test("1.5 Intermediate namespace objects return key or fallback, never [object Object]", () => {
      const intermediateKeys = [
        "nav",
        "settings",
        "settings.theme",
        "settings.household",
        "settings.language",
        "settings.notifications",
        "settings.security",
        "common",
        "chores",
        "expenses",
        "groceries",
        "board",
        "calendar",
        "documents",
        "contacts",
        "auth",
        "footer",
        "errors",
      ];

      intermediateKeys.forEach((namespaceKey) => {
        const resultIt = translate("it", namespaceKey);
        // If an intermediate object were returned, React 19 would crash rendering child object
        expect(resultIt).toBe(namespaceKey);
        expect(resultIt).not.toBe("[object Object]");
        expect(resultIt).not.toEqual(expect.any(Object));

        const fallbackResult = translate("it", namespaceKey, null, "SectionFallback");
        expect(fallbackResult).toBe("SectionFallback");
      });
    });

    test("1.6 getNestedValue defends against null or primitive target objects", () => {
      expect(getNestedValue(null, "nav.settings")).toBeUndefined();
      expect(getNestedValue(undefined, "nav.settings")).toBeUndefined();
      expect(getNestedValue(42, "nav.settings")).toBeUndefined();
      expect(getNestedValue("string_target", "nav.settings")).toBeUndefined();
      expect(getNestedValue(true, "nav.settings")).toBeUndefined();
      expect(getNestedValue(Symbol("sym"), "nav.settings")).toBeUndefined();
    });
  });

  // =========================================================================
  // SECTION 2: INTERPOLATION STRESS TESTING
  // =========================================================================
  describe("2. Parameter Interpolation Stress Testing", () => {
    test("2.1 Missing parameters preserve tokens verbatim", () => {
      // nav.greeting template is "Ciao, {name}" in IT and "Hello, {name}" in EN
      expect(translate("it", "nav.greeting", {})).toBe("Ciao, {name}");
      expect(translate("en", "nav.greeting", {})).toBe("Hello, {name}");

      // Multiple placeholders in custom template
      const template = "User {username} with role {role} in {household}";
      expect(interpolate(template, {})).toBe(template);
      expect(interpolate(template, { username: "Alice" })).toBe("User Alice with role {role} in {household}");
    });

    test("2.2 Extra parameters are ignored and do not corrupt output", () => {
      const extraParams = {
        name: "Marco",
        surplus1: "unwanted_val_1",
        surplus2: 9999,
        surplus3: true,
        surplusObject: { nested: true },
        surplusArray: [1, 2, 3],
      };

      const result = translate("it", "nav.greeting", extraParams);
      expect(result).toBe("Ciao, Marco");
      expect(result).not.toContain("unwanted_val_1");
      expect(result).not.toContain("9999");
    });

    test("2.3 Falsy numbers (0, -0, NaN, Infinity) are interpolated safely", () => {
      // 0 must render "0", NOT be treated as falsy empty or ignored
      expect(translate("it", "settings.security.verificationCooldown", { seconds: 0 }))
        .toBe("Attendi 0s prima di richiedere un altro invio.");
      expect(translate("en", "settings.security.verificationCooldown", { seconds: 0 }))
        .toBe("Please wait 0s before requesting another email.");

      // -0 renders "0"
      expect(translate("it", "settings.security.verificationCooldown", { seconds: -0 }))
        .toBe("Attendi 0s prima di richiedere un altro invio.");

      // count: 0
      expect(translate("it", "settings.household.membersCount", { count: 0 }))
        .toBe("0 coinquilini");
      expect(translate("en", "settings.household.membersCount", { count: 0 }))
        .toBe("0 housemates");

      // NaN and Infinity
      expect(interpolate("Value: {val}", { val: NaN })).toBe("Value: NaN");
      expect(interpolate("Value: {val}", { val: Infinity })).toBe("Value: Infinity");
      expect(interpolate("Value: {val}", { val: -Infinity })).toBe("Value: -Infinity");
    });

    test("2.4 Falsy non-numeric values (false, empty string) are interpolated correctly", () => {
      expect(interpolate("Status: {active}", { active: false })).toBe("Status: false");
      expect(interpolate("Prefix-{val}-Suffix", { val: "" })).toBe("Prefix--Suffix");
    });

    test("2.5 Undefined and null parameters leave placeholder intact", () => {
      expect(translate("it", "nav.greeting", { name: undefined })).toBe("Ciao, {name}");
      expect(translate("it", "nav.greeting", { name: null })).toBe("Ciao, {name}");
      expect(translate("it", "nav.greeting", { name: void 0 })).toBe("Ciao, {name}");

      const mixed = interpolate("{a} {b} {c}", { a: "First", b: null, c: undefined });
      expect(mixed).toBe("First {b} {c}");
    });

    test("2.6 Regex special patterns in params ($$, $&, $', $`, $1) do not corrupt output", () => {
      // In String.prototype.replace(regex, string), $ patterns have special meanings.
      // But interpolate uses replacer function, ensuring literal substitution.
      const specialTokens = [
        "$$",
        "$&",
        "$`",
        "$'",
        "$1",
        "$2",
        "$$$$",
        "$$100.00",
        "Price: $& total",
        "Complex $1 and $2 and $` pattern",
      ];

      specialTokens.forEach((token) => {
        const result = translate("it", "nav.greeting", { name: token });
        expect(result).toBe(`Ciao, ${token}`);
      });
    });

    test("2.7 Regex special characters in params (.*+?^${}()|[]) do not crash regex parser", () => {
      const regexChars = ".*+?^${}()|[]\\/";
      const result = translate("it", "nav.greeting", { name: regexChars });
      expect(result).toBe(`Ciao, ${regexChars}`);
    });

    test("2.8 Multibyte Unicode, accented characters, and non-Latin scripts interpolate cleanly", () => {
      const unicodeNames = [
        "Müller",
        "Dvořák",
        "Renée",
        "Åse",
        "Владимир",
        "山田太郎",
        "محمد",
        "€150.50",
        "HouseHelper §12",
      ];

      unicodeNames.forEach((name) => {
        const result = translate("it", "nav.greeting", { name });
        expect(result).toBe(`Ciao, ${name}`);
      });
    });

    test("2.9 HTML and script injection payloads are treated as literal text strings", () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "<svg onload=alert(document.domain)>",
        "&amp; &lt; &gt; &quot; &#39;",
        "javascript:alert(1)",
        "'\"><script src=//evil.com></script>",
      ];

      xssPayloads.forEach((payload) => {
        const result = translate("it", "nav.greeting", { name: payload });
        expect(result).toBe(`Ciao, ${payload}`);
      });
    });

    test("2.10 Massive payload strings do not cause exponential backtracking or stack overflow", () => {
      const largeString = "A".repeat(50000);
      const start = Date.now();
      const result = translate("it", "nav.greeting", { name: largeString });
      const elapsed = Date.now() - start;

      expect(result).toBe(`Ciao, ${largeString}`);
      expect(elapsed).toBeLessThan(1000); // Must resolve in < 1s
    });

    test("2.11 Repeated and adjacent placeholders interpolate correctly", () => {
      const repeated = interpolate("{count} items found, repeated {count} times", { count: 5 });
      expect(repeated).toBe("5 items found, repeated 5 times");

      const adjacent = interpolate("{first}{second}", { first: "Hello", second: "World" });
      expect(adjacent).toBe("HelloWorld");
    });

    test("2.12 Non-object or corrupted params passed to interpolate do not throw", () => {
      const badParams = [
        null,
        undefined,
        "string_param",
        12345,
        true,
        false,
        Symbol("param"),
        () => {},
      ];

      badParams.forEach((param) => {
        expect(() => interpolate("Template {name}", param)).not.toThrow();
        expect(interpolate("Template {name}", param)).toBe("Template {name}");
      });
    });
  });

  // =========================================================================
  // SECTION 3: LANGUAGE SWITCHING & PERSISTENCE STRESS TESTING
  // =========================================================================
  describe("3. Language Switching & Persistence Stress Testing", () => {
    test("3.1 Rapid toggling maintains deterministic state and DOM sync", () => {
      function RapidToggleConsumer() {
        const { language, setLanguage, t, isItalian, isEnglish } = useLanguage();
        return (
          <div>
            <span data-testid="lang-display">{language}</span>
            <span data-testid="is-it">{String(isItalian)}</span>
            <span data-testid="is-en">{String(isEnglish)}</span>
            <span data-testid="nav-settings">{t("nav.settings")}</span>
            <button data-testid="btn-to-it" onClick={() => setLanguage("it")}>IT</button>
            <button data-testid="btn-to-en" onClick={() => setLanguage("en")}>EN</button>
          </div>
        );
      }

      render(
        <LanguageProvider>
          <RapidToggleConsumer />
        </LanguageProvider>
      );

      const btnToEn = screen.getByTestId("btn-to-en");
      const btnToIt = screen.getByTestId("btn-to-it");

      // Rapidly alternate 50 roundtrips (100 switches total)
      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.click(btnToEn);
        });
        expect(screen.getByTestId("lang-display")).toHaveTextContent("en");
        expect(document.documentElement.lang).toBe("en");
        expect(localStorage.getItem(STORAGE_KEY)).toBe("en");

        act(() => {
          fireEvent.click(btnToIt);
        });
        expect(screen.getByTestId("lang-display")).toHaveTextContent("it");
        expect(document.documentElement.lang).toBe("it");
        expect(localStorage.getItem(STORAGE_KEY)).toBe("it");
      }

      // Final state check
      expect(screen.getByTestId("lang-display")).toHaveTextContent("it");
      expect(screen.getByTestId("is-it")).toHaveTextContent("true");
      expect(screen.getByTestId("is-en")).toHaveTextContent("false");
      expect(screen.getByTestId("nav-settings")).toHaveTextContent("Impostazioni");
      expect(document.documentElement.lang).toBe("it");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("it");

      // Switch to English once more to ensure clean final transition
      act(() => {
        fireEvent.click(btnToEn);
      });

      expect(screen.getByTestId("lang-display")).toHaveTextContent("en");
      expect(screen.getByTestId("is-it")).toHaveTextContent("false");
      expect(screen.getByTestId("is-en")).toHaveTextContent("true");
      expect(screen.getByTestId("nav-settings")).toHaveTextContent("Settings");
      expect(document.documentElement.lang).toBe("en");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
    });

    test("3.2 Corrupted localStorage values recover gracefully to DEFAULT_LANGUAGE ('it')", () => {
      const corruptedValues = [
        "corrupted_json_{!@#$}",
        "fr",
        "es",
        "de",
        "zh",
        "it-IT",
        "en-US",
        "__proto__",
        "constructor",
        "toString",
        "null",
        "undefined",
        "0",
        "1",
        "true",
        "false",
        "   ",
        "",
        "a".repeat(2000),
      ];

      corruptedValues.forEach((badValue) => {
        localStorage.setItem(STORAGE_KEY, badValue);

        const { result, unmount } = renderHook(() => useLanguage(), {
          wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
        });

        expect(result.current.language).toBe(DEFAULT_LANGUAGE);
        expect(result.current.isItalian).toBe(true);
        expect(result.current.isEnglish).toBe(false);
        expect(result.current.t("nav.settings")).toBe("Impostazioni");

        unmount();
      });
    });

    test("3.3 LocalStorage throwing exceptions (QuotaExceeded, SecurityError) does not break app", () => {
      // Test SecurityError on getItem (e.g. private browsing mode / cookies blocked)
      const originalGetItem = Storage.prototype.getItem;
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        const error = new Error("The operation is insecure.");
        error.name = "SecurityError";
        throw error;
      });

      let hookResult;
      expect(() => {
        const { result } = renderHook(() => useLanguage(), {
          wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
        });
        hookResult = result;
      }).not.toThrow();

      expect(hookResult.current.language).toBe(DEFAULT_LANGUAGE);
      expect(hookResult.current.t("nav.settings")).toBe("Impostazioni");

      Storage.prototype.getItem.mockRestore();

      // Test QuotaExceededError on setItem
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const error = new Error("DOMException: QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      const { result: hookResult2 } = renderHook(() => useLanguage(), {
        wrapper: ({ children }) => <LanguageProvider initialLanguage="it">{children}</LanguageProvider>,
      });

      expect(() => {
        act(() => {
          hookResult2.current.setLanguage("en");
        });
      }).not.toThrow();

      // State is still updated in React memory even if localStorage write fails
      expect(hookResult2.current.language).toBe("en");
      expect(hookResult2.current.t("nav.settings")).toBe("Settings");

      Storage.prototype.setItem.mockRestore();
    });

    test("3.4 Unmounting component during language transition does not cause memory leaks or warnings", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      function ParentWithToggle() {
        const [showChild, setShowChild] = useState(true);
        const { setLanguage } = useLanguage();

        return (
          <div>
            {showChild && <ChildConsumer />}
            <button
              data-testid="unmount-and-switch"
              onClick={() => {
                setShowChild(false);
                setLanguage("en");
              }}
            >
              Unmount & Switch
            </button>
          </div>
        );
      }

      function ChildConsumer() {
        const { t } = useLanguage();
        return <span data-testid="child-text">{t("nav.settings")}</span>;
      }

      render(
        <LanguageProvider>
          <ParentWithToggle />
        </LanguageProvider>
      );

      expect(screen.getByTestId("child-text")).toHaveTextContent("Impostazioni");

      // Unmount child and switch language in the same tick
      act(() => {
        fireEvent.click(screen.getByTestId("unmount-and-switch"));
      });

      expect(screen.queryByTestId("child-text")).toBeNull();
      // Ensure no unmounted component setState warnings were logged
      const unmountedWarnings = consoleErrorSpy.mock.calls.filter(args =>
        args.some(arg => typeof arg === "string" && arg.includes("unmounted"))
      );
      expect(unmountedWarnings.length).toBe(0);

      consoleErrorSpy.mockRestore();
    });
  });

  // =========================================================================
  // SECTION 4: ZERO-EMOJI & COPY INTEGRITY STRESS TESTING
  // =========================================================================
  describe("4. Zero-Emoji & Copy Invariant Stress Testing", () => {
    /**
     * Recursively traverses an object and collects all leaf strings.
     */
    function extractLeafStrings(obj, currentPath = "") {
      const leaves = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof value === "string") {
          leaves.push({ path: fullPath, text: value });
        } else if (typeof value === "object" && value !== null) {
          leaves.push(...extractLeafStrings(value, fullPath));
        }
      }
      return leaves;
    }

    test("4.1 Italian dictionary: 100% of leaf strings contain zero emojis and emoticons", () => {
      const itLeaves = extractLeafStrings(dictionaries.it);
      expect(itLeaves.length).toBeGreaterThan(150);

      const violations = [];
      itLeaves.forEach(({ path, text }) => {
        if (EMOJI_REGEX.test(text)) {
          violations.push({ path, text, type: "EMOJI" });
        }
        EMOTICON_REGEX.lastIndex = 0;
        if (EMOTICON_REGEX.test(text)) {
          violations.push({ path, text, type: "EMOTICON" });
        }
      });

      expect(violations).toEqual([]);
    });

    test("4.2 English dictionary: 100% of leaf strings contain zero emojis and emoticons", () => {
      const enLeaves = extractLeafStrings(dictionaries.en);
      expect(enLeaves.length).toBeGreaterThan(150);

      const violations = [];
      enLeaves.forEach(({ path, text }) => {
        if (EMOJI_REGEX.test(text)) {
          violations.push({ path, text, type: "EMOJI" });
        }
        EMOTICON_REGEX.lastIndex = 0;
        if (EMOTICON_REGEX.test(text)) {
          violations.push({ path, text, type: "EMOTICON" });
        }
      });

      expect(violations).toEqual([]);
    });

    test("4.3 Exact dictionary key count parity between IT and EN", () => {
      const itLeaves = extractLeafStrings(dictionaries.it);
      const enLeaves = extractLeafStrings(dictionaries.en);

      const itKeySet = new Set(itLeaves.map(l => l.path));
      const enKeySet = new Set(enLeaves.map(l => l.path));

      const missingInEn = [...itKeySet].filter(k => !enKeySet.has(k));
      const missingInIt = [...enKeySet].filter(k => !itKeySet.has(k));

      expect(missingInEn).toEqual([]);
      expect(missingInIt).toEqual([]);
      expect(itLeaves.length).toBe(enLeaves.length);
      expect(itLeaves.length).toBe(875);
    });

    test("4.4 All 216 keys resolve to non-empty strings with zero emojis in both languages", () => {
      const itLeaves = extractLeafStrings(dictionaries.it);

      itLeaves.forEach(({ path }) => {
        const textIt = translate("it", path);
        expect(typeof textIt).toBe("string");
        expect(textIt.length).toBeGreaterThan(0);
        expect(textIt).not.toBe(path); // Must resolve, not fall back to key path
        expect(EMOJI_REGEX.test(textIt)).toBe(false);

        const textEn = translate("en", path);
        expect(typeof textEn).toBe("string");
        expect(textEn.length).toBeGreaterThan(0);
        expect(textEn).not.toBe(path);
        expect(EMOJI_REGEX.test(textEn)).toBe(false);
      });
    });

    test("4.5 Verification that EMOJI_REGEX correctly flags actual emojis (Sanity check)", () => {
      // Dynamically generated via char codes to prevent literal symbols in source file
      const sampleEmoji = String.fromCodePoint(0x1F600); // grinning face
      const sampleRocket = String.fromCodePoint(0x1F680); // rocket
      const sampleHeart = String.fromCharCode(60, 51); // heart emoticon constructed dynamically

      expect(EMOJI_REGEX.test(sampleEmoji)).toBe(true);
      expect(EMOJI_REGEX.test(sampleRocket)).toBe(true);

      EMOTICON_REGEX.lastIndex = 0;
      expect(EMOTICON_REGEX.test(sampleHeart)).toBe(true);
    });
  });
});
