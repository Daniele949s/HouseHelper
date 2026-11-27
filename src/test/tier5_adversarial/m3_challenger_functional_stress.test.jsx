import React from "react";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { __mockNavigate, __resetRouterMock } from "react-router-dom";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore, { authMock } from "../mockFirebase";
import ViewImpostazioni from "../../pages/Impostazioni/ViewImpostazioni";
import * as feedbackModule from "../../utils/feedback";
import * as notificationPrefsModule from "../../utils/notificationPrefs";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";

// Spy on feedback module
jest.mock("../../utils/feedback", () => {
  const original = jest.requireActual("../../utils/feedback");
  return {
    ...original,
    showToast: jest.fn(),
    showConfirm: jest.fn(),
  };
});

// Official regex patterns from scripts/verify-zero-emojis.js
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

describe("Milestone M3 Adversarial Challenger: Functional & Edge Case Stress Harness", () => {
  const verifiedUser = {
    uid: "user_challenger_alpha_1",
    email: "alpha@househelper.test",
    displayName: "Challenger Alpha",
    emailVerified: true,
  };

  const unverifiedUser = {
    uid: "user_challenger_beta_2",
    email: "beta@househelper.test",
    displayName: "Challenger Beta",
    emailVerified: false,
  };

  const householdData = {
    houseId: "casa_challenger_m3",
    houseName: "Fortezza Adversarial",
    inviteCode: "ADV99FORTE",
    creatorId: "user_challenger_alpha_1",
    users: [verifiedUser, unverifiedUser],
  };

  const alphaUserData = {
    username: "Challenger Alpha",
    email: "alpha@househelper.test",
    casaId: "casa_challenger_m3",
  };

  const betaUserData = {
    username: "Challenger Beta",
    email: "beta@househelper.test",
    casaId: "casa_challenger_m3",
  };

  let mediaQueryListeners = [];
  let prefersDarkMock = false;

  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    jest.clearAllMocks();
    if (__resetRouterMock) __resetRouterMock();

    document.documentElement.lang = "it";
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    if (document.body) {
      document.body.className = "";
    }

    mediaQueryListeners = [];
    prefersDarkMock = false;

    // High-fidelity matchMedia mock
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query.includes("dark") ? prefersDarkMock : false,
      media: query,
      onchange: null,
      addListener: jest.fn((cb) => {
        mediaQueryListeners.push(cb);
      }),
      removeListener: jest.fn((cb) => {
        mediaQueryListeners = mediaQueryListeners.filter((l) => l !== cb);
      }),
      addEventListener: jest.fn((evt, cb) => {
        if (evt === "change") {
          mediaQueryListeners.push(cb);
        }
      }),
      removeEventListener: jest.fn((evt, cb) => {
        if (evt === "change") {
          mediaQueryListeners = mediaQueryListeners.filter((l) => l !== cb);
        }
      }),
      dispatchEvent: jest.fn(),
    }));

    // High-fidelity clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    seedHousehold(householdData);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.lang = "it";
    jest.restoreAllMocks();
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
  });

  // =========================================================================
  // SECTION 1: LANGUAGE SWITCHING STRESS & CONCURRENCY STABILITY
  // =========================================================================
  describe("1. Language Switching Stress & Concurrency Stability", () => {
    test("1.1 Rapid switching between 'it' and 'en' maintains state, DOM lang, and storage consistency", async () => {
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const italianBtn = screen.getByRole("button", { name: "Italiano" });
      const englishBtn = screen.getByRole("button", { name: "English" });

      expect(italianBtn).toHaveAttribute("aria-pressed", "true");
      expect(englishBtn).toHaveAttribute("aria-pressed", "false");
      expect(document.documentElement.lang).toBe("it");

      // Rapidly toggle back and forth 16 times in succession
      for (let i = 0; i < 8; i++) {
        fireEvent.click(englishBtn);
        expect(document.documentElement.lang).toBe("en");
        expect(localStorage.getItem("househelper_language")).toBe("en");

        fireEvent.click(italianBtn);
        expect(document.documentElement.lang).toBe("it");
        expect(localStorage.getItem("househelper_language")).toBe("it");
      }

      // Switch to English and verify dynamic microcopy updates across the DOM
      fireEvent.click(englishBtn);
      expect(englishBtn).toHaveAttribute("aria-pressed", "true");
      expect(italianBtn).toHaveAttribute("aria-pressed", "false");
      expect(document.documentElement.lang).toBe("en");
      expect(localStorage.getItem("househelper_language")).toBe("en");

      // Verify English microcopy in settings sections
      expect(screen.getByRole("heading", { level: 1, name: /Settings/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: /^Language$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: /Notifications & Alerts/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: /Account & Security/i })).toBeInTheDocument();

      // Switch back to Italian
      fireEvent.click(italianBtn);
      expect(screen.getByRole("heading", { level: 1, name: /Impostazioni/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: /^Lingua$/i })).toBeInTheDocument();
      expect(document.documentElement.lang).toBe("it");
    });

    test("1.2 LanguageContext key resolution stability during rapid language transitions", async () => {
      function LanguageStressHarness() {
        const { language, setLanguage, t } = useLanguage();
        return (
          <div>
            <span data-testid="current-lang">{language}</span>
            <span data-testid="translated-title">{t("settings.title")}</span>
            <span data-testid="translated-chores">{t("settings.notifications.chores")}</span>
            <span data-testid="translated-interpolated">
              {t("settings.household.membersCount", { count: 3 })}
            </span>
            <span data-testid="translated-fallback">
              {t("nonexistent.deeply.nested.key", null, "SafeFallbackValue")}
            </span>
            <button onClick={() => setLanguage("it")} data-testid="btn-it">IT</button>
            <button onClick={() => setLanguage("en")} data-testid="btn-en">EN</button>
          </div>
        );
      }

      renderWithProviders(<LanguageStressHarness />, { language: "it" });

      expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
      expect(screen.getByTestId("translated-title")).toHaveTextContent("Impostazioni");
      expect(screen.getByTestId("translated-chores")).toHaveTextContent("Promemoria Turni di Pulizia");
      expect(screen.getByTestId("translated-interpolated")).toHaveTextContent("3 coinquilini");
      expect(screen.getByTestId("translated-fallback")).toHaveTextContent("SafeFallbackValue");

      // Rapidly oscillate language
      const btnIt = screen.getByTestId("btn-it");
      const btnEn = screen.getByTestId("btn-en");

      for (let i = 0; i < 10; i++) {
        fireEvent.click(btnEn);
        expect(screen.getByTestId("current-lang")).toHaveTextContent("en");
        expect(screen.getByTestId("translated-title")).toHaveTextContent("Settings");
        expect(screen.getByTestId("translated-chores")).toHaveTextContent("Chore Reminders");
        expect(screen.getByTestId("translated-interpolated")).toHaveTextContent("3 housemates");

        fireEvent.click(btnIt);
        expect(screen.getByTestId("current-lang")).toHaveTextContent("it");
        expect(screen.getByTestId("translated-title")).toHaveTextContent("Impostazioni");
      }
    });

    test("1.3 Storage failure tolerance when localStorage.setItem throws QuotaExceededError", async () => {
      const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new Error("Quota exceeded");
        err.name = "QuotaExceededError";
        throw err;
      });

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const englishBtn = screen.getByRole("button", { name: "English" });

      // Should not throw or crash when localStorage writes fail
      expect(() => fireEvent.click(englishBtn)).not.toThrow();
      expect(document.documentElement.lang).toBe("en");
      expect(englishBtn).toHaveAttribute("aria-pressed", "true");

      setItemSpy.mockRestore();
    });

    test("1.4 Malformed or unsupported language in localStorage safely falls back to default 'it'", async () => {
      localStorage.setItem("househelper_language", "es-ES_unsupported");

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Defaults safely to 'it'
      expect(document.documentElement.lang).toBe("it");
      const italianBtn = screen.getByRole("button", { name: "Italiano" });
      expect(italianBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  // =========================================================================
  // SECTION 2: THEME SWITCHING STRESS & DYNAMIC SYSTEM MEDIA QUERY HANDLING
  // =========================================================================
  describe("2. Theme Switching Stress & Dynamic System Media Query Handling", () => {
    function ThemeControls() {
      const { theme, setTheme } = useTheme();
      return ["light", "dark", "system"].map((mode) => (
        <button key={mode} aria-pressed={theme === mode} onClick={() => setTheme(mode)}>{mode}</button>
      ));
    }

    test("2.1 Rapid cycling of Light, Dark, and System modes synchronizes data-theme and storage", async () => {
      renderWithProviders(<ThemeControls />);

      const lightBtn = screen.getByRole("button", { name: /^light$/i });
      const darkBtn = screen.getByRole("button", { name: /^dark$/i });
      const systemBtn = screen.getByRole("button", { name: /^system$/i });

      // Cycle rapidly across modes
      for (let i = 0; i < 5; i++) {
        fireEvent.click(lightBtn);
        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
        expect(document.documentElement.getAttribute("data-theme-preference")).toBe("light");
        expect(localStorage.getItem("househelper_theme")).toBe("light");

        fireEvent.click(darkBtn);
        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
        expect(document.documentElement.getAttribute("data-theme-preference")).toBe("dark");
        expect(localStorage.getItem("househelper_theme")).toBe("dark");

        fireEvent.click(systemBtn);
        expect(document.documentElement.getAttribute("data-theme-preference")).toBe("system");
        expect(localStorage.getItem("househelper_theme")).toBe("system");
      }

      // Verify button active and aria-pressed attributes
      expect(systemBtn).toHaveAttribute("aria-pressed", "true");
      expect(lightBtn).toHaveAttribute("aria-pressed", "false");
      expect(darkBtn).toHaveAttribute("aria-pressed", "false");
    });

    test("2.2 System mode dynamically adapts to simulated OS dark/light media query changes", async () => {
      renderWithProviders(<ThemeControls />);

      const systemBtn = screen.getByRole("button", { name: /^system$/i });
      fireEvent.click(systemBtn);

      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("system");
      expect(mediaQueryListeners.length).toBeGreaterThanOrEqual(1);

      // Simulate OS switching to dark mode
      act(() => {
        mediaQueryListeners.forEach((listener) => listener({ matches: true }));
      });
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.body.className).toBe("dark-mode");

      // Simulate OS switching to light mode
      act(() => {
        mediaQueryListeners.forEach((listener) => listener({ matches: false }));
      });
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.body.className).toBe("light-mode");
    });

    test("2.3 Explicit user theme preference is immune to OS media query change events", async () => {
      renderWithProviders(<ThemeControls />);

      // First enter system mode to register listeners
      const systemBtn = screen.getByRole("button", { name: /^system$/i });
      fireEvent.click(systemBtn);
      const initialListeners = [...mediaQueryListeners];

      // Explicitly switch to Light mode
      const lightBtn = screen.getByRole("button", { name: /^light$/i });
      fireEvent.click(lightBtn);

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("light");

      // Trigger OS dark mode event
      act(() => {
        initialListeners.forEach((listener) => listener({ matches: true }));
      });

      // Explicit light mode MUST remain light
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("light");

      // Explicitly switch to Dark mode
      const darkBtn = screen.getByRole("button", { name: /^dark$/i });
      fireEvent.click(darkBtn);
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

      // Trigger OS light mode event
      act(() => {
        initialListeners.forEach((listener) => listener({ matches: false }));
      });

      // Explicit dark mode MUST remain dark
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("dark");
    });

    test("2.4 MatchMedia listener cleanup occurs when leaving system mode", async () => {
      renderWithProviders(<ThemeControls />);

      const systemBtn = screen.getByRole("button", { name: /^system$/i });
      fireEvent.click(systemBtn);
      expect(mediaQueryListeners.length).toBeGreaterThan(0);

      // Switch away to explicit Dark
      const darkBtn = screen.getByRole("button", { name: /^dark$/i });
      fireEvent.click(darkBtn);

      // Verify listeners cleaned up
      expect(mediaQueryListeners.length).toBe(0);
    });

    test("2.5 Corrupted theme in localStorage safely falls back to default 'dark'", () => {
      localStorage.setItem("househelper_theme", "corrupted_neon_theme");

      function ThemeFallbackConsumer() {
        const { theme, effectiveTheme } = useTheme();
        return (
          <div>
            <span data-testid="pref-theme">{theme}</span>
            <span data-testid="eff-theme">{effectiveTheme}</span>
          </div>
        );
      }

      renderWithProviders(<ThemeFallbackConsumer />);

      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("eff-theme")).toHaveTextContent("dark");
    });
  });

  // =========================================================================
  // SECTION 3: NOTIFICATION PREFERENCES STRESS: CORRUPTION, DEFAULTS & MUTATION
  // =========================================================================
  describe("3. Notification Preferences Stress: Storage Corruption, Defaults & Mutation Safety", () => {
    test("3.1 Corrupt JSON and non-object values fall back cleanly to default preferences", () => {
      const corruptPayloads = [
        "not-valid-json{{{",
        "null",
        "undefined",
        "\"a plain string\"",
        "123456",
        "[true, false, true]",
        "",
      ];

      corruptPayloads.forEach((payload) => {
        localStorage.setItem(notificationPrefsModule.NOTIFICATION_PREFS_KEY, payload);
        const prefs = notificationPrefsModule.getNotificationPreferences();
        expect(prefs).toEqual({
          choreReminders: true,
          expenseAlerts: true,
          householdNotices: true,
        });
      });
    });

    test("3.2 Missing keys and invalid property types are normalized to default booleans", () => {
      // Partial object with missing keys
      localStorage.setItem(
        notificationPrefsModule.NOTIFICATION_PREFS_KEY,
        JSON.stringify({ choreReminders: false })
      );
      let prefs = notificationPrefsModule.getNotificationPreferences();
      expect(prefs).toEqual({
        choreReminders: false,
        expenseAlerts: true,
        householdNotices: true,
      });

      // Type-mismatched property values
      localStorage.setItem(
        notificationPrefsModule.NOTIFICATION_PREFS_KEY,
        JSON.stringify({
          choreReminders: "invalid-string",
          expenseAlerts: 0,
          householdNotices: false,
        })
      );
      prefs = notificationPrefsModule.getNotificationPreferences();
      expect(prefs).toEqual({
        choreReminders: true,
        expenseAlerts: true,
        householdNotices: false,
      });
    });

    test("3.3 Rapid toggle switch clicks update state and persist exact boolean representation", async () => {
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const choreSwitch = screen.getByRole("switch", { name: /Promemoria Turni/i });
      const expenseSwitch = screen.getByRole("switch", { name: /Spese e Debiti/i });
      const noticesSwitch = screen.getByRole("switch", { name: /Avvisi in Bacheca/i });

      expect(choreSwitch).toHaveAttribute("aria-checked", "true");
      expect(expenseSwitch).toHaveAttribute("aria-checked", "true");
      expect(noticesSwitch).toHaveAttribute("aria-checked", "true");

      // Rapidly toggle chore switch 5 times (odd count ends false)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(choreSwitch);
      }
      expect(choreSwitch).toHaveAttribute("aria-checked", "false");

      // Toggle expense and notices switches once each
      fireEvent.click(expenseSwitch);
      expect(expenseSwitch).toHaveAttribute("aria-checked", "false");

      fireEvent.click(noticesSwitch);
      expect(noticesSwitch).toHaveAttribute("aria-checked", "false");

      // Verify localStorage persisted state
      const saved = JSON.parse(
        localStorage.getItem(notificationPrefsModule.NOTIFICATION_PREFS_KEY)
      );
      expect(saved).toEqual({
        choreReminders: false,
        expenseAlerts: false,
        householdNotices: false,
      });
      expect(feedbackModule.showToast).toHaveBeenCalledWith(
        "Preferenze di notifica salvate",
        "success"
      );
    });

    test("3.4 Storage write failure tolerance on notification preference changes", async () => {
      const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Disk quota exceeded");
      });

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const choreSwitch = screen.getByRole("switch", { name: /Promemoria Turni/i });

      // Toggling switch should not throw
      expect(() => fireEvent.click(choreSwitch)).not.toThrow();
      expect(choreSwitch).toHaveAttribute("aria-checked", "false");

      setItemSpy.mockRestore();
    });

    test("3.5 Mutation safety: getNotificationPreferences returns a decoupled object clone", () => {
      const prefs1 = notificationPrefsModule.getNotificationPreferences();
      prefs1.choreReminders = false;
      prefs1.maliciousKey = "injected";

      const prefs2 = notificationPrefsModule.getNotificationPreferences();
      expect(prefs2.choreReminders).toBe(true);
      expect(prefs2.maliciousKey).toBeUndefined();

      // Verify default object is frozen
      expect(Object.isFrozen(notificationPrefsModule.DEFAULT_NOTIFICATION_PREFS)).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 4: ACCOUNT & SECURITY STRESS: COPY FALLBACK, COOLDOWN & LOGOUT
  // =========================================================================
  describe("4. Account & Security Stress: Copy Fallback, Cooldown Countdown, Password Reset & Logout", () => {
    test("4.1 UID copy fallback triggers info toast when clipboard rejects", async () => {
      navigator.clipboard.writeText.mockRejectedValueOnce(
        new Error("Clipboard permission denied")
      );

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const copyUidBtn = screen.getByRole("button", { name: "Copia ID" });
      fireEvent.click(copyUidBtn);

      await waitFor(() => {
        // Fallback shows UID in info toast
        expect(feedbackModule.showToast).toHaveBeenCalledWith(
          verifiedUser.uid,
          "info"
        );
      });
    });

    test("4.2 UID copy success provides confirmation and reverts after timeout", async () => {
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const copyUidBtn = screen.getByRole("button", { name: "Copia ID" });

      jest.useFakeTimers();

      await act(async () => {
        fireEvent.click(copyUidBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(verifiedUser.uid);
      expect(feedbackModule.showToast).toHaveBeenCalledWith(
        "ID utente copiato negli appunti!",
        "success"
      );
      expect(copyUidBtn).toHaveTextContent("Copiato!");

      // Fast-forward 2000ms
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(copyUidBtn).toHaveTextContent("Copia ID");
      jest.useRealTimers();
    });

    test("4.3 Household invite code copy fallback triggers info toast when clipboard rejects", async () => {
      navigator.clipboard.writeText.mockRejectedValueOnce(
        new Error("Clipboard blocked")
      );

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      // Await async household hydration
      await screen.findByRole("heading", { level: 2, name: householdData.houseName });

      const copyCodeBtn = screen.getByRole("button", { name: "Copia codice" });
      fireEvent.click(copyCodeBtn);

      await waitFor(() => {
        expect(feedbackModule.showToast).toHaveBeenCalledWith(
          householdData.inviteCode,
          "info"
        );
      });
    });

    test("4.4 Email verification cooldown countdown accuracy and button disabling", async () => {
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: unverifiedUser,
        userData: betaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Unverified badge is displayed
      expect(screen.getByTestId("badge-email-unverified")).toBeInTheDocument();

      // Initial send button
      const resendBtn = screen.getByRole("button", { name: "Invia email di verifica" });
      expect(resendBtn).not.toBeDisabled();

      jest.useFakeTimers();

      await act(async () => {
        fireEvent.click(resendBtn);
      });

      expect(feedbackModule.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/Email di verifica inviata/i),
        "success"
      );

      // Cooldown countdown is initialized to 60s
      const countdownBtn = screen.getByRole("button", { name: /Attendi 60s/i });
      expect(countdownBtn).toBeDisabled();

      // Advance by 15 seconds -> 45s
      act(() => {
        jest.advanceTimersByTime(15000);
      });
      expect(screen.getByRole("button", { name: /Attendi 45s/i })).toBeDisabled();

      // Advance by 25 seconds -> 20s
      act(() => {
        jest.advanceTimersByTime(25000);
      });
      expect(screen.getByRole("button", { name: /Attendi 20s/i })).toBeDisabled();

      // Advance by 19 seconds -> 1s
      act(() => {
        jest.advanceTimersByTime(19000);
      });
      expect(screen.getByRole("button", { name: /Attendi 1s/i })).toBeDisabled();

      // Advance by 1 second -> Cooldown expires, button re-enabled
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      const restoredBtn = screen.getByRole("button", { name: "Invia email di verifica" });
      expect(restoredBtn).not.toBeDisabled();

      jest.useRealTimers();
    });

    test("4.5 Email verification error handling when Firebase auth throws", async () => {
      jest.spyOn(authMock, "sendEmailVerification").mockRejectedValueOnce(
        new Error("auth/too-many-requests")
      );

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: unverifiedUser,
        userData: betaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const resendBtn = screen.getByRole("button", { name: "Invia email di verifica" });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(feedbackModule.showToast).toHaveBeenCalledWith(
          expect.stringMatching(/Impossibile inviare l'email di verifica/i),
          "error"
        );
      });

      // Does not enter cooldown on failure; remains enabled for retry
      expect(screen.getByRole("button", { name: "Invia email di verifica" })).not.toBeDisabled();
    });

    test("4.6 Password reset trigger under success and Firebase auth rejection", async () => {
      // 1. Success case
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const resetBtn = screen.getByRole("button", { name: "Invia link reimpostazione" });
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(feedbackModule.showToast).toHaveBeenCalledWith(
          expect.stringMatching(/Link per il ripristino inviato alla tua email/i),
          "success"
        );
      });

      // 2. Failure case
      jest.spyOn(authMock, "sendPasswordResetEmail").mockRejectedValueOnce(
        new Error("auth/user-not-found")
      );

      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(feedbackModule.showToast).toHaveBeenCalledWith(
          expect.stringMatching(/Impossibile inviare l'email di ripristino password/i),
          "error"
        );
      });
    });

    test("4.7 Logout confirmation: Cancel vs Confirm vs signOut rejection", async () => {
      let capturedOptions = null;
      feedbackModule.showConfirm.mockImplementation((opts) => {
        capturedOptions = opts;
      });

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const logoutBtn = screen.getByRole("button", { name: "Disconnetti" });
      fireEvent.click(logoutBtn);

      expect(feedbackModule.showConfirm).toHaveBeenCalled();
      expect(capturedOptions).not.toBeNull();
      expect(capturedOptions.isDanger).toBe(true);
      expect(capturedOptions.title).toMatch(/Conferma disconnessione/i);
      expect(capturedOptions.confirmText).toBe("Disconnetti");
      expect(capturedOptions.cancelText).toBe("Annulla");

      // Scenario A: Cancel (do not invoke onConfirm)
      expect(__mockNavigate).not.toHaveBeenCalled();
      expect(mockStore.currentMockUser).not.toBeNull();

      // Scenario B: Confirm signOut
      await act(async () => {
        await capturedOptions.onConfirm();
      });

      expect(mockStore.currentMockUser).toBeNull();
      expect(__mockNavigate).toHaveBeenCalledWith("/login");

      // Scenario C: signOut throws network error
      jest.spyOn(authMock, "signOut").mockRejectedValueOnce(new Error("Network disconnect"));
      await act(async () => {
        await capturedOptions.onConfirm();
      });

      expect(feedbackModule.showToast).toHaveBeenCalledWith("Si è verificato un errore", "error");
    });
  });

  // =========================================================================
  // SECTION 5: APPLE HIG TOUCH TARGETS & ZERO-EMOJI DOM SCAN STRESS
  // =========================================================================
  describe("5. Apple HIG Touch Targets & Zero-Emoji DOM Scan Stress", () => {
    test("5.1 All interactive controls meet minimum 44x44px touch targets", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: unverifiedUser,
        userData: betaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThanOrEqual(10);

      buttons.forEach((btn) => {
        if (btn.style.minHeight) {
          expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
        }
        if (btn.style.minWidth) {
          expect(parseInt(btn.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
        }
      });
    });

    test("5.2 Comprehensive DOM scan reveals zero Unicode emojis or emoticons across all states", async () => {
      const { container: containerIt } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: unverifiedUser,
        userData: betaUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Scan Italian view
      expect(EMOJI_REGEX.test(containerIt.innerHTML)).toBe(false);
      expect(EMOTICON_REGEX.test(containerIt.innerHTML)).toBe(false);

      const { container: containerEn } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: verifiedUser,
        userData: alphaUserData,
        language: "en",
      });

      await screen.findByRole("heading", { level: 1, name: /Settings/i });

      // Scan English view
      expect(EMOJI_REGEX.test(containerEn.innerHTML)).toBe(false);
      expect(EMOTICON_REGEX.test(containerEn.innerHTML)).toBe(false);
    });
  });
});
