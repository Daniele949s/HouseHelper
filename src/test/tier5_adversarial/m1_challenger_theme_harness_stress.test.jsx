import React from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../../contexts/ThemeContext";
import { mockStore, authMock, sendPasswordResetEmail } from "../mockFirebase";
import { renderWithProviders } from "../testUtils";

// Helper Test Consumer Component
function ThemeStressConsumer() {
  const { theme, resolvedTheme, effectiveTheme, isDark, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <span data-testid="pref-theme">{theme}</span>
      <span data-testid="eff-theme">{effectiveTheme || resolvedTheme}</span>
      <span data-testid="is-dark">{String(isDark)}</span>

      <button onClick={() => setTheme("dark")} data-testid="btn-dark">Dark</button>
      <button onClick={() => setTheme("light")} data-testid="btn-light">Light</button>
      <button onClick={() => setTheme("system")} data-testid="btn-system">System</button>
      <button onClick={() => setTheme("sepia")} data-testid="btn-sepia">Sepia</button>
      <button onClick={() => setTheme(null)} data-testid="btn-null">Null</button>
      <button onClick={() => setTheme(undefined)} data-testid="btn-undefined">Undefined</button>
      <button onClick={() => setTheme(12345)} data-testid="btn-number">Number</button>
      <button onClick={toggleTheme} data-testid="btn-toggle">Toggle</button>
    </div>
  );
}

describe("Milestone M1 Challenger — Empirical Theme Infrastructure & Test Harness Stress", () => {
  let mediaQueryListeners = [];
  let prefersDarkMock = false;

  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
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
      dispatchEvent: jest.fn()
    }));
  });

  // =========================================================================
  // Dimension 1: 3-Way Theme Switching & Corrupted Storage Stress
  // =========================================================================
  describe("Dimension 1: 3-Way Theme Switching & Corrupted Storage Stress", () => {
    test.each([
      ["sepia"],
      ["null"],
      ["undefined"],
      [""],
      ["SYSTEM"],
      ["Dark"],
      ["LIGHT"],
      ["{}"],
      ["-1"],
      ["0"],
      ["false"],
      ["true"],
      ["random_corrupt_string_12345"]
    ])("gracefully recovers and falls back to 'dark' default when localStorage contains '%s'", (corruptVal) => {
      localStorage.setItem("househelper_theme", corruptVal);

      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("eff-theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("dark");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.documentElement.classList.contains("light-theme")).toBe(false);
      expect(document.body.className).toBe("dark-mode");
    });

    test("performs 60 rapid sequential mode transitions without desync or memory leaks", () => {
      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      const sequence = ["light", "system", "dark", "system", "light", "dark"];

      for (let cycle = 0; cycle < 10; cycle++) {
        for (const targetTheme of sequence) {
          fireEvent.click(screen.getByTestId(`btn-${targetTheme}`));

          expect(screen.getByTestId("pref-theme")).toHaveTextContent(targetTheme);
          expect(document.documentElement.getAttribute("data-theme-preference")).toBe(targetTheme);

          const expectedEff = targetTheme === "system" ? (prefersDarkMock ? "dark" : "light") : targetTheme;
          expect(screen.getByTestId("eff-theme")).toHaveTextContent(expectedEff);
          expect(document.documentElement.getAttribute("data-theme")).toBe(expectedEff);
          expect(document.documentElement.classList.contains(`${expectedEff}-theme`)).toBe(true);
          expect(document.body.className).toBe(`${expectedEff}-mode`);
          expect(localStorage.getItem("househelper_theme")).toBe(targetTheme);
        }
      }
    });

    test("calling setTheme with invalid parameters leaves current state intact", () => {
      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      // Start in dark
      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");

      // Attempt invalid setters
      fireEvent.click(screen.getByTestId("btn-sepia"));
      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");

      fireEvent.click(screen.getByTestId("btn-null"));
      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");

      fireEvent.click(screen.getByTestId("btn-undefined"));
      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");

      fireEvent.click(screen.getByTestId("btn-number"));
      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");

      // Switch to light and repeat
      fireEvent.click(screen.getByTestId("btn-light"));
      expect(screen.getByTestId("pref-theme")).toHaveTextContent("light");

      fireEvent.click(screen.getByTestId("btn-sepia"));
      expect(screen.getByTestId("pref-theme")).toHaveTextContent("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    test("toggleTheme cycles between light and dark across 30 rapid clicks", () => {
      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      let currentExpected = true; // Starts in dark
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");

      for (let i = 0; i < 30; i++) {
        fireEvent.click(screen.getByTestId("btn-toggle"));
        currentExpected = !currentExpected;

        expect(screen.getByTestId("is-dark")).toHaveTextContent(String(currentExpected));
        const expectedTheme = currentExpected ? "dark" : "light";
        expect(document.documentElement.getAttribute("data-theme")).toBe(expectedTheme);
        expect(document.documentElement.classList.contains(`${expectedTheme}-theme`)).toBe(true);
        expect(document.body.className).toBe(`${expectedTheme}-mode`);
      }
    });
  });

  // =========================================================================
  // Dimension 2: matchMedia Simulation & Listener Lifecycle
  // =========================================================================
  describe("Dimension 2: matchMedia Simulation & Listener Lifecycle", () => {
    test("in 'system' mode, multiple OS changes dynamically update theme and classes", () => {
      localStorage.setItem("househelper_theme", "system");
      prefersDarkMock = false;

      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("eff-theme")).toHaveTextContent("light");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.body.className).toBe("light-mode");

      // 10 OS Appearance toggles
      for (let i = 0; i < 10; i++) {
        const nextDark = i % 2 === 0; // true, false, true, false...
        prefersDarkMock = nextDark;

        act(() => {
          mediaQueryListeners.forEach((listener) => {
            listener({ matches: nextDark, media: "(prefers-color-scheme: dark)" });
          });
        });

        const expected = nextDark ? "dark" : "light";
        expect(screen.getByTestId("eff-theme")).toHaveTextContent(expected);
        expect(screen.getByTestId("is-dark")).toHaveTextContent(String(nextDark));
        expect(document.documentElement.getAttribute("data-theme")).toBe(expected);
        expect(document.documentElement.classList.contains(`${expected}-theme`)).toBe(true);
        expect(document.body.className).toBe(`${expected}-mode`);
      }
    });

    test("in explicit 'dark' mode, OS theme change events are completely ignored", () => {
      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("btn-dark"));
      expect(mediaQueryListeners.length).toBe(0);

      // Simulate OS switching to light
      act(() => {
        prefersDarkMock = false;
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: false, media: "(prefers-color-scheme: dark)" });
        });
      });

      expect(screen.getByTestId("eff-theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.body.className).toBe("dark-mode");
    });

    test("in explicit 'light' mode, OS theme change events are completely ignored", () => {
      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("btn-light"));
      expect(mediaQueryListeners.length).toBe(0);

      // Simulate OS switching to dark
      act(() => {
        prefersDarkMock = true;
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: true, media: "(prefers-color-scheme: dark)" });
        });
      });

      expect(screen.getByTestId("eff-theme")).toHaveTextContent("light");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.body.className).toBe("light-mode");
    });

    test("unmounting while in 'system' mode cleanly unregisters all mediaQuery listeners", () => {
      localStorage.setItem("househelper_theme", "system");

      const { unmount } = render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      expect(mediaQueryListeners.length).toBe(1);

      unmount();

      expect(mediaQueryListeners.length).toBe(0);
    });

    test("switching from 'system' to 'dark' then back to 'system' manages listener count without leak", () => {
      localStorage.setItem("househelper_theme", "system");

      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      expect(mediaQueryListeners.length).toBe(1);

      for (let i = 0; i < 15; i++) {
        fireEvent.click(screen.getByTestId("btn-dark"));
        expect(mediaQueryListeners.length).toBe(0);

        fireEvent.click(screen.getByTestId("btn-system"));
        expect(mediaQueryListeners.length).toBe(1);
      }
    });
  });

  // =========================================================================
  // Dimension 3: Legacy Browser Fallback Simulation
  // =========================================================================
  describe("Dimension 3: Legacy Browser Fallback Simulation", () => {
    test("supports legacy MediaQueryList with only addListener and removeListener (Safari < 14)", () => {
      localStorage.setItem("househelper_theme", "system");

      let legacyListeners = [];
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        // addEventListener and removeEventListener deliberately omitted
        addListener: jest.fn((cb) => {
          legacyListeners.push(cb);
        }),
        removeListener: jest.fn((cb) => {
          legacyListeners = legacyListeners.filter((l) => l !== cb);
        }),
        dispatchEvent: jest.fn()
      }));

      const { unmount } = render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      expect(legacyListeners.length).toBe(1);

      // Trigger legacy listener with OS dark match
      act(() => {
        legacyListeners.forEach((l) => l({ matches: true }));
      });

      expect(screen.getByTestId("eff-theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

      // Unmount cleanly removes listener
      unmount();
      expect(legacyListeners.length).toBe(0);
    });

    test("gracefully survives environment where window.matchMedia is completely undefined", () => {
      window.matchMedia = undefined;

      expect(() => {
        render(
          <ThemeProvider>
            <ThemeStressConsumer />
          </ThemeProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId("pref-theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("eff-theme")).toHaveTextContent("dark");

      // Switching to system when matchMedia is missing should not crash
      expect(() => {
        fireEvent.click(screen.getByTestId("btn-system"));
      }).not.toThrow();

      expect(screen.getByTestId("pref-theme")).toHaveTextContent("system");
      expect(screen.getByTestId("eff-theme")).toHaveTextContent("light"); // systemIsDark defaults to false
    });

    test("gracefully survives environment where matchMedia returns null", () => {
      window.matchMedia = jest.fn().mockReturnValue(null);

      expect(() => {
        render(
          <ThemeProvider>
            <ThemeStressConsumer />
          </ThemeProvider>
        );
      }).not.toThrow();
    });
  });

  // =========================================================================
  // Dimension 4: DOM Integrity & Synchronization
  // =========================================================================
  describe("Dimension 4: DOM Integrity & Synchronization", () => {
    test("HTML root attributes, classes, and body class are always perfectly synchronized", () => {
      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      // 1. Dark mode check
      fireEvent.click(screen.getByTestId("btn-dark"));
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("dark");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.documentElement.classList.contains("light-theme")).toBe(false);
      expect(document.body.className).toBe("dark-mode");

      // 2. Light mode check
      fireEvent.click(screen.getByTestId("btn-light"));
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
      expect(document.body.className).toBe("light-mode");

      // 3. System mode check (with OS dark = false)
      prefersDarkMock = false;
      fireEvent.click(screen.getByTestId("btn-system"));
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("system");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
      expect(document.body.className).toBe("light-mode");
    });

    test("re-asserts DOM integrity if DOM is tampered with by external scripts", () => {
      render(
        <ThemeProvider>
          <ThemeStressConsumer />
        </ThemeProvider>
      );

      // Tamper with DOM externally
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.classList.remove("dark-theme");
      document.body.className = "tampered-class";

      // Toggle theme -> DOM is forcefully reconciled
      fireEvent.click(screen.getByTestId("btn-toggle"));

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.body.className).toBe("light-mode");
    });
  });

  // =========================================================================
  // Dimension 5: sendPasswordResetEmail Mock & mockStore Stress
  // =========================================================================
  describe("Dimension 5: sendPasswordResetEmail Mock & mockStore Stress", () => {
    test("records password reset emails called via modular sendPasswordResetEmail(auth, email)", async () => {
      const auth = authMock.getAuth();
      await sendPasswordResetEmail(auth, "m1_stress_user@test.com");

      expect(mockStore.passwordResetEmails).toHaveLength(1);
      const record = mockStore.passwordResetEmails[0];
      expect(record.email).toBe("m1_stress_user@test.com");
      expect(typeof record.timestamp).toBe("string");
      expect(new Date(record.timestamp).getTime()).not.toBeNaN();
    });

    test("records password reset emails called via direct sendPasswordResetEmail(email)", async () => {
      await sendPasswordResetEmail("direct_call@test.com");

      expect(mockStore.passwordResetEmails).toHaveLength(1);
      expect(mockStore.passwordResetEmails[0].email).toBe("direct_call@test.com");
    });

    test("records actionCodeSettings when passed", async () => {
      const auth = authMock.getAuth();
      const settings = {
        url: "https://househelper.app/reset-confirm",
        handleCodeInApp: true
      };

      await sendPasswordResetEmail(auth, "user_with_settings@test.com", settings);

      expect(mockStore.passwordResetEmails).toHaveLength(1);
      const record = mockStore.passwordResetEmails[0];
      expect(record.email).toBe("user_with_settings@test.com");
      expect(record.actionCodeSettings).toEqual(settings);
    });

    test("records a batch of 25 sequential password reset emails in exact order", async () => {
      const auth = authMock.getAuth();
      for (let i = 1; i <= 25; i++) {
        await sendPasswordResetEmail(auth, `user_${i}@househelper.test`);
      }

      expect(mockStore.passwordResetEmails).toHaveLength(25);
      expect(mockStore.passwordResetEmails[0].email).toBe("user_1@househelper.test");
      expect(mockStore.passwordResetEmails[24].email).toBe("user_25@househelper.test");
    });

    test("mockStore.reset() purges all recorded password reset emails", async () => {
      await sendPasswordResetEmail("to_be_reset@test.com");
      expect(mockStore.passwordResetEmails).toHaveLength(1);

      mockStore.reset();
      expect(mockStore.passwordResetEmails).toEqual([]);
    });

    test("calling sendPasswordResetEmail with null/undefined email does not pollute store", async () => {
      const auth = authMock.getAuth();
      await sendPasswordResetEmail(auth, null);
      await sendPasswordResetEmail(auth, undefined);
      await sendPasswordResetEmail(auth, "");

      expect(mockStore.passwordResetEmails).toHaveLength(0);
    });

    test("authMock exports sendPasswordResetEmail identically", async () => {
      expect(authMock.sendPasswordResetEmail).toBe(sendPasswordResetEmail);
    });

    test("renderWithProviders integrates ThemeProvider and LanguageProvider seamlessly with custom language override", () => {
      function IntegrationProbe() {
        const { theme } = useTheme();
        return <div data-testid="probe-content">Active theme: {theme}</div>;
      }

      const { container } = renderWithProviders(<IntegrationProbe />, {
        language: "en"
      });

      expect(screen.getByTestId("probe-content")).toHaveTextContent("Active theme: dark");
      expect(document.documentElement.lang).toBe("en");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
  });

  // =========================================================================
  // Dimension 6: useTheme Outside Provider Defensive Resilience
  // =========================================================================
  describe("Dimension 6: useTheme Outside Provider Defensive Resilience", () => {
    test("returns safe immutable fallback context when called outside ThemeProvider", () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.effectiveTheme).toBe("dark");
      expect(result.current.resolvedTheme).toBe("dark");
      expect(result.current.isDark).toBe(true);

      // Calling setters should be no-ops and not throw
      expect(() => result.current.setTheme("light")).not.toThrow();
      expect(() => result.current.toggleTheme()).not.toThrow();
    });
  });
});
