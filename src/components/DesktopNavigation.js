import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

const NAV_DEFINITIONS = [
  { key: "nav.dashboard", fallback: "Dashboard", icon: "fa-home", path: "/home", end: true },
  { key: "nav.chores", fallback: "Turni", icon: "fa-broom", path: "/turni", end: false },
  { key: "nav.debts", fallback: "Debiti", icon: "fa-wallet", path: "/debiti", end: false },
  { key: "nav.groceries", fallback: "Spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
  { key: "nav.board", fallback: "Bacheca", icon: "fa-thumbtack", path: "/bacheca", end: false },
  { key: "nav.calendar", fallback: "Calendario", icon: "fa-calendar-alt", path: "/calendario", end: false },
  { key: "nav.documents", fallback: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false },
  { key: "nav.contacts", fallback: "Contatti", icon: "fa-address-book", path: "/contatti", end: false },
  { key: "nav.settings", fallback: "Impostazioni", icon: "fa-sliders-h", path: "/impostazioni", end: false, aliases: ["/settings"] },
];

/**
 * Desktop navigation bar rendered inside AppHeader on viewports > 768px.
 * Automatically hidden on mobile devices in favor of MobileNavigation drawer.
 * Displays only when user is authenticated and associated with a household (casaId).
 */
export default function DesktopNavigation() {
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // Guard: Only render when authenticated with an active household
  if (!currentUser || !userData || !userData.casaId) {
    return null;
  }

  const checkActive = (targetPath, isEnd) =>
    isEnd ? location.pathname === targetPath : location.pathname.startsWith(targetPath);

  return (
    <nav className="desktop-nav-root" aria-label={t("nav.main_navigation", {}, t("nav.ariaNav", {}, "Navigazione principale"))}>
      <ul className="desktop-nav-list">
        {NAV_DEFINITIONS.map((item) => {
          const label = t(item.key, {}, item.fallback);
          const isActive =
            checkActive(item.path, item.end) ||
            Boolean(item.aliases && item.aliases.some((alias) => checkActive(alias, item.end)));

          return (
            <li key={item.path} className="desktop-nav-item">
              <NavLink
                to={item.path}
                className={`desktop-nav-link ${isActive ? "active" : ""}`}
                title={label}
              >
                <i className={`fas ${item.icon} desktop-nav-icon`} aria-hidden="true"></i>
                <span className="desktop-nav-label">{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
