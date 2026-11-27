import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  ACCESS_STATES,
  getDefaultRouteForState,
  resolveAccessState,
} from "../navigation/navigationRegistry";
import MobileNavigation from "./MobileNavigation";
import DesktopNavigation from "./DesktopNavigation";
import logo from "../HouseHelper.svg";

/**
 * AppHeader component providing responsive navigation and branding.
 * Theme switching is centralized in Settings (ViewImpostazioni).
 */
export default function AppHeader() {
  const navigate = useNavigate();
  const { currentUser, userData, isEmailVerified, accessState } = useAuth() || {};
  const { t } = useLanguage();

  const handleBrandClick = () => {
    const state =
      accessState || resolveAccessState(currentUser, userData, isEmailVerified);
    if (state === ACCESS_STATES.ANONYMOUS) {
      navigate("/");
    } else {
      navigate(getDefaultRouteForState(state));
    }
  };

  return (
    <header className="app-topbar">
      <button
        type="button"
        className="brand-wrapper"
        onClick={handleBrandClick}
        aria-label={t("nav.ariaHomeLink", {}, "Torna alla pagina principale HouseHelper")}
      >
        <span className="brand-icon-badge">
          <img src={logo} alt="HouseHelper Logo" className="brand-logo-img" />
        </span>
        <span className="brand-title">HouseHelper</span>
      </button>

      {/* Desktop Navigation links (hidden <= 768px via CSS) */}
      <DesktopNavigation />

      {/* Right controls: Mobile Navigation burger (hidden > 768px via CSS) */}
      <div className="topbar-actions">
        <MobileNavigation />
      </div>
    </header>
  );
}
