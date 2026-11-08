import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * MobileBottomBar component providing ergonomic thumb-friendly bottom navigation on mobile (< 768px).
 * Displays 5 tabs: Home, Turni, Spese, Spesa, and Altro (which triggers the mobile drawer).
 * Adheres to Apple HIG touch target guidelines (>= 48px) and safe area insets.
 */
export default function MobileBottomBar() {
  const { currentUser, userData } = useAuth();
  const location = useLocation();

  // Guard: Only render when authenticated with an active household
  if (!currentUser || !userData || !userData.casaId) {
    return null;
  }

  const handleOpenMore = () => {
    window.dispatchEvent(new CustomEvent("toggle-mobile-menu"));
  };

  const navTabs = [
    { label: "Home", icon: "fa-home", path: "/home", end: true },
    { label: "Turni", icon: "fa-broom", path: "/turni", end: false },
    { label: "Spese", icon: "fa-wallet", path: "/debiti", end: false },
    { label: "Spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
  ];

  return (
    <nav className="mobile-bottom-bar" aria-label="Navigazione rapida mobile">
      {navTabs.map((tab) => {
        const isActive = tab.end
          ? location.pathname === tab.path
          : location.pathname.startsWith(tab.path);

        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`mobile-bottom-tab ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="mobile-bottom-tab-icon">
              <i className={`fas ${tab.icon}`} aria-hidden="true"></i>
            </span>
            <span className="mobile-bottom-tab-label">{tab.label}</span>
          </NavLink>
        );
      })}

      <button
        type="button"
        className="mobile-bottom-tab"
        onClick={handleOpenMore}
        aria-label="Apri menu altro"
      >
        <span className="mobile-bottom-tab-icon">
          <i className="fas fa-bars" aria-hidden="true"></i>
        </span>
        <span className="mobile-bottom-tab-label">Altro</span>
      </button>
    </nav>
  );
}
