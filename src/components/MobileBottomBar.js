import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  MOBILE_BOTTOM_TABS,
  MOBILE_DRAWER_HOUSEHOLD_ITEMS,
  hasHouseholdAccess,
  isRouteActive,
  useNavigation
} from "../navigation/navigationRegistry";

/**
 * MobileBottomBar component providing ergonomic thumb-friendly bottom navigation on mobile (< 768px).
 * Displays 5 tabs: Home, Turni, Spese, Spesa, and Altro (which triggers the mobile drawer).
 * Adheres to Apple HIG touch target guidelines (>= 48px) and safe area insets.
 */
export default function MobileBottomBar() {
  const { currentUser, userData } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();
  const { isMobileMenuOpen, toggleMobileMenu } = useNavigation();

  // Guard: Only render when authenticated with an active household
  if (!hasHouseholdAccess(currentUser, userData)) {
    return null;
  }

  const isMoreActive = MOBILE_DRAWER_HOUSEHOLD_ITEMS.some((item) =>
    isRouteActive(location.pathname, item)
  );

  return (
    <nav className="mobile-bottom-bar hh-mobile-bar" aria-label={t("nav.ariaMobileNav", {}, "Navigazione rapida mobile")}>
      {MOBILE_BOTTOM_TABS.map((tab) => {
        const isActive = isRouteActive(location.pathname, tab);
        const label = t(tab.key, {}, tab.fallback);

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
            <span className="mobile-bottom-tab-label">{label}</span>
          </NavLink>
        );
      })}

      <button
        type="button"
        className={`mobile-bottom-tab ${isMoreActive ? "active" : ""}`}
        onClick={toggleMobileMenu}
        aria-expanded={isMobileMenuOpen}
        aria-label={t("nav.ariaMoreTab", {}, "Apri menu altro")}
      >
        <span className="mobile-bottom-tab-icon">
          <i className="fas fa-bars" aria-hidden="true"></i>
        </span>
        <span className="mobile-bottom-tab-label">{t("nav.more", {}, "Altro")}</span>
      </button>
    </nav>
  );
}
