import React from "react";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

// Helper test consumer
function ThemeConsumer() {
  const { theme, resolvedTheme, effectiveTheme, isDark, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme || effectiveTheme}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
      <button onClick={() => setTheme("dark")} data-testid="btn-dark">Dark</button>
      <button onClick={() => setTheme("light")} data-testid="btn-light">Light</button>
      <button onClick={() => setTheme("system")} data-testid="btn-system">System</button>
      <button onClick={() => setTheme("invalid_theme")} data-testid="btn-invalid">Invalid</button>
      <button onClick={toggleTheme} data-testid="btn-toggle">Toggle</button>
    </div>
  );
}

describe("ThemeContext 3-Way Mode & Backward Compatibility", () => {
  let mediaQueryListeners = [];
  let prefersDarkMock = false;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    document.body.className = "";
    mediaQueryListeners = [];
    prefersDarkMock = false;

    // Deterministic matchMedia mock with listener tracking
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query.includes("dark") ? prefersDarkMock : false,
      media: query,
      onchange: null,
      addListener: jest.fn((cb) => mediaQueryListeners.push(cb)),
      removeListener: jest.fn((cb) => {
        mediaQueryListeners = mediaQueryListeners.filter((l) => l !== cb);
      }),
      addEventListener: jest.fn((evt, cb) => {
        if (evt === "change") mediaQueryListeners.push(cb);
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
  // 1. Initialization & Storage Persistence
  // =========================================================================
  describe("1. Initialization & Storage Persistence", () => {
    test("defaults to 'dark' mode when localStorage is empty", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
      expect(screen.getByTestId("resolved-val")).toHaveTextContent("dark");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("dark");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.documentElement.classList.contains("light-theme")).toBe(false);
      expect(document.body.className).toBe("dark-mode");
      expect(localStorage.getItem("househelper_theme")).toBe("dark");
    });

    test("hydrates 'light' preference correctly from localStorage", () => {
      localStorage.setItem("househelper_theme", "light");

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
      expect(screen.getByTestId("resolved-val")).toHaveTextContent("light");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
      expect(document.body.className).toBe("light-mode");
    });

    test("hydrates 'system' preference correctly from localStorage", () => {
      localStorage.setItem("househelper_theme", "system");
      prefersDarkMock = true;

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme-val")).toHaveTextContent("system");
      expect(screen.getByTestId("resolved-val")).toHaveTextContent("dark");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("system");
    });

    test("falls back safely to 'dark' if localStorage has invalid value", () => {
      localStorage.setItem("househelper_theme", "invalid_custom_value");

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
    });
  });

  // =========================================================================
  // 2. Direct Theme Selection (setTheme)
  // =========================================================================
  describe("2. Direct Theme Selection (setTheme)", () => {
    test("calling setTheme('light') applies light theme classes and persists", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("btn-light"));

      expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
      expect(screen.getByTestId("resolved-val")).toHaveTextContent("light");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("light");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
      expect(document.body.className).toBe("light-mode");
      expect(localStorage.getItem("househelper_theme")).toBe("light");
    });

    test("calling setTheme('dark') applies dark theme classes and persists", () => {
      localStorage.setItem("househelper_theme", "light");

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("btn-dark"));

      expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
      expect(screen.getByTestId("resolved-val")).toHaveTextContent("dark");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("dark");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.body.className).toBe("dark-mode");
      expect(localStorage.getItem("househelper_theme")).toBe("dark");
    });

    test("calling setTheme('system') switches to system preference mode", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("btn-system"));

      expect(screen.getByTestId("theme-val")).toHaveTextContent("system");
      expect(document.documentElement.getAttribute("data-theme-preference")).toBe("system");
      expect(localStorage.getItem("househelper_theme")).toBe("system");
    });

    test("calling setTheme with invalid theme value is safely ignored", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("btn-invalid"));

      expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
    });
  });

  // =========================================================================
  // 3. Backward Compatibility (toggleTheme & isDark)
  // =========================================================================
  describe("3. Backward Compatibility (toggleTheme & isDark)", () => {
    test("toggleTheme toggles from dark to light", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");

      fireEvent.click(screen.getByTestId("btn-toggle"));

      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.body.className).toBe("light-mode");
    });

    test("toggleTheme toggles from light back to dark", () => {
      localStorage.setItem("househelper_theme", "light");

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");

      fireEvent.click(screen.getByTestId("btn-toggle"));

      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.body.className).toBe("dark-mode");
    });

    test("toggleTheme when in 'system' mode switches to the explicit opposite of effective theme", () => {
      localStorage.setItem("househelper_theme", "system");
      prefersDarkMock = true; // effective isDark is true

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");

      // Toggling switches to explicit light
      fireEvent.click(screen.getByTestId("btn-toggle"));

      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
    });
  });

  // =========================================================================
  // 4. System Preference (matchMedia) Dynamic Resolution
  // =========================================================================
  describe("4. System Preference (matchMedia) Dynamic Resolution", () => {
    test("in system mode with prefers-color-scheme: dark, resolves to dark", () => {
      localStorage.setItem("househelper_theme", "system");
      prefersDarkMock = true;

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme-val")).toHaveTextContent("system");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.body.className).toBe("dark-mode");
    });

    test("in system mode with prefers-color-scheme: light, resolves to light", () => {
      localStorage.setItem("househelper_theme", "system");
      prefersDarkMock = false;

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme-val")).toHaveTextContent("system");
      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);
      expect(document.body.className).toBe("light-mode");
    });

    test("dynamically updates theme when OS media query change event triggers", () => {
      localStorage.setItem("househelper_theme", "system");
      prefersDarkMock = false; // Starts in light

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
      expect(document.documentElement.classList.contains("light-theme")).toBe(true);

      // Simulate OS switching to Dark appearance
      act(() => {
        prefersDarkMock = true;
        mediaQueryListeners.forEach((listener) => {
          listener({ matches: true, media: "(prefers-color-scheme: dark)" });
        });
      });

      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
      expect(document.body.className).toBe("dark-mode");
    });
  });

  // =========================================================================
  // 5. MediaQuery Listener Lifecycle & Cleanup
  // =========================================================================
  describe("5. MediaQuery Listener Lifecycle & Cleanup", () => {
    test("removes media query listener when component unmounts", () => {
      localStorage.setItem("househelper_theme", "system");

      const { unmount } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(mediaQueryListeners.length).toBeGreaterThan(0);

      unmount();

      expect(mediaQueryListeners.length).toBe(0);
    });

    test("removes media query listener when transitioning from system to explicit dark or light", () => {
      localStorage.setItem("househelper_theme", "system");

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(mediaQueryListeners.length).toBeGreaterThan(0);

      // Switch to explicit light
      fireEvent.click(screen.getByTestId("btn-light"));

      expect(mediaQueryListeners.length).toBe(0);
    });

    test("supports legacy addListener and removeListener when addEventListener is missing", () => {
      localStorage.setItem("househelper_theme", "system");

      let legacyListeners = [];
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn((cb) => legacyListeners.push(cb)),
        removeListener: jest.fn((cb) => {
          legacyListeners = legacyListeners.filter((l) => l !== cb);
        }),
        dispatchEvent: jest.fn()
      }));

      const { unmount } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(legacyListeners.length).toBe(1);

      unmount();

      expect(legacyListeners.length).toBe(0);
    });
  });

  // =========================================================================
  // 6. Legacy & Edge Case Resilience
  // =========================================================================
  describe("6. Legacy & Edge Case Resilience", () => {
    test("handles environment where window.matchMedia is undefined safely", () => {
      window.matchMedia = undefined;

      expect(() => {
        render(
          <ThemeProvider>
            <ThemeConsumer />
          </ThemeProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
    });

    test("handles localStorage exception safely without breaking rendering", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("SecurityError: localStorage is not accessible");
      });

      expect(() => {
        render(
          <ThemeProvider>
            <ThemeConsumer />
          </ThemeProvider>
        );
      }).not.toThrow();

      expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
      Storage.prototype.setItem.mockRestore();
    });

    test("provides defensive default context values when used outside ThemeProvider", () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
      expect(typeof result.current.setTheme).toBe("function");
      expect(typeof result.current.toggleTheme).toBe("function");
    });
  });
});
