import React from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Minimalist, accessible pill theme switch.
 * Displays clean vector FontAwesome icons (fas fa-sun and fas fa-moon).
 * Fully keyboard and screen-reader accessible with role="switch".
 */
export default function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="theme-toggle-wrapper">
      <button
        type="button"
        className={`theme-pill-toggle ${isDark ? "is-dark" : "is-light"}`}
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? "Attiva modalità chiara" : "Attiva modalità scura"}
        title={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      >
        <span className="theme-pill-track">
          {/* Background track icons */}
          <span className="theme-track-icon icon-sun" aria-hidden="true">
            <i className="fas fa-sun"></i>
          </span>
          <span className="theme-track-icon icon-moon" aria-hidden="true">
            <i className="fas fa-moon"></i>
          </span>

          {/* Sliding thumb carrying active vector icon */}
          <span className="theme-pill-thumb" aria-hidden="true">
            <i className={`fas ${isDark ? "fa-moon" : "fa-sun"} thumb-icon`}></i>
          </span>
        </span>
      </button>
    </div>
  );
}
