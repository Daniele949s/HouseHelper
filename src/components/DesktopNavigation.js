import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  DESKTOP_NAV_ITEMS,
  hasHouseholdAccess,
  isRouteActive
} from "../navigation/navigationRegistry";

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
  if (!hasHouseholdAccess(currentUser, userData)) {
    return null;
  }

  return (
    <nav className="desktop-nav-root" aria-label={t("nav.ariaNav", {}, "Navigazione principale")}>
      <ul className="desktop-nav-list">
        {DESKTOP_NAV_ITEMS.map((item) => {
          const label = t(item.key, {}, item.fallback);
          const isActive = isRouteActive(location.pathname, item);

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
