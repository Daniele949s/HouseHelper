import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("househelper_theme") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "light") {
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
      if (typeof document !== "undefined" && document.body) {
        document.body.className = "light-mode";
      }
    } else {
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
      if (typeof document !== "undefined" && document.body) {
        document.body.className = "dark-mode";
      }
    }
    localStorage.setItem("househelper_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}
