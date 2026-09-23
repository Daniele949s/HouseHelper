import React from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="theme-toggle-wrapper" title={`Passa a modalità ${isLight ? "Dark" : "Light"}`}>
      <label className="theme-lightsaber-switch" aria-label="Cambia tema">
        <input
          type="checkbox"
          checked={isLight}
          onChange={toggleTheme}
        />
        <div className="lightsaber-track">
          <div className={`lightsaber ${isLight ? "light-active" : "dark-active"}`}>
            <div className="saber-blade light-blade" />
            <div className="saber-grip" />
            <div className="saber-blade dark-blade" />
          </div>
          <div className="lightsaber-thumb">
            <span className="theme-icon">{isLight ? "☀️" : "🌙"}</span>
          </div>
        </div>
      </label>
    </div>
  );
}
