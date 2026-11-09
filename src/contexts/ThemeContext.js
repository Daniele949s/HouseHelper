import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

const STORAGE_KEY = "househelper_theme";
const VALID_THEMES = ["dark", "light", "system"];
const DEFAULT_THEME = "dark";

/**
 * Safely inspects system preference for dark mode.
 * Gracefully returns false if matchMedia is unavailable, returns null, or throws.
 */
function getSystemDarkPreference() {
  try {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      return Boolean(mql && mql.matches);
    }
  } catch (e) {
    // Graceful fallback if matchMedia is restricted or throws
  }
  return false;
}

const defaultThemeContext = {
  theme: DEFAULT_THEME,
  resolvedTheme: DEFAULT_THEME,
  effectiveTheme: DEFAULT_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: true,
};

export const ThemeContext = createContext(defaultThemeContext);

/**
 * Hook to access theme state: theme ('dark' | 'light' | 'system'), setTheme, toggleTheme, and isDark.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  return context || defaultThemeContext;
}

/**
 * React 19 Provider managing 3-way theme preference ('dark' | 'light' | 'system'),
 * dynamic matchMedia listener with cleanup, DOM attribute/class synchronization,
 * and backward-compatible toggleTheme / isDark controls.
 */
export function ThemeProvider({ children }) {
  // 1. User preference state ('dark' | 'light' | 'system')
  const [theme, setThemeState] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && VALID_THEMES.includes(saved)) {
          return saved;
        }
      }
    } catch (e) {
      console.warn("Could not read theme from localStorage:", e);
    }
    return DEFAULT_THEME;
  });

  // 2. Track OS dark mode preference when in 'system' mode
  const [systemIsDark, setSystemIsDark] = useState(getSystemDarkPreference);

  // 3. Listen to OS prefers-color-scheme changes when theme is 'system'
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    if (theme !== "system") {
      return;
    }

    let mediaQuery = null;
    try {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    } catch (e) {
      mediaQuery = null;
    }

    if (mediaQuery) {
      // Synchronize current match state immediately
      setSystemIsDark(Boolean(mediaQuery.matches));

      const handleChange = (e) => {
        setSystemIsDark(Boolean(e && e.matches));
      };

      // Modern vs Legacy Safari listener registration
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleChange);
        return () => {
          try {
            mediaQuery.removeEventListener("change", handleChange);
          } catch (e) {}
        };
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleChange);
        return () => {
          try {
            mediaQuery.removeListener(handleChange);
          } catch (e) {}
        };
      }
    } else {
      setSystemIsDark(false);
    }
  }, [theme]);

  // 4. Resolve effective theme ('dark' or 'light')
  const effectiveTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme;
  const isDark = effectiveTheme === "dark";

  // 5. Apply attributes and classes to DOM
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.setAttribute("data-theme", effectiveTheme);
    root.setAttribute("data-theme-preference", theme);

    if (effectiveTheme === "light") {
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
      if (document.body) {
        document.body.className = "light-mode";
      }
    } else {
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
      if (document.body) {
        document.body.className = "dark-mode";
      }
    }

    // Persist preference to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch (e) {
      console.warn("Could not save theme to localStorage:", e);
    }
  }, [effectiveTheme, theme]);

  // 6. Explicit 3-way setter
  const setTheme = useCallback((newTheme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setThemeState(newTheme);
    } else {
      console.warn(`Invalid theme "${newTheme}". Allowed: ${VALID_THEMES.join(", ")}`);
    }
  }, []);

  // 7. Backward-compatible toggle function
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === "system") {
        const sysDark = getSystemDarkPreference();
        return sysDark ? "light" : "dark";
      }
      return prev === "dark" ? "light" : "dark";
    });
  }, []);

  // 8. Memoized context value
  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: effectiveTheme,
      effectiveTheme,
      setTheme,
      toggleTheme,
      isDark,
    }),
    [theme, effectiveTheme, setTheme, toggleTheme, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
