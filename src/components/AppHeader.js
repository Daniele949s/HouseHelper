import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import MobileNavigation from "./MobileNavigation";
import DesktopNavigation from "./DesktopNavigation";
import logo from "../logo.png";

/**
 * AppHeader component providing responsive navigation and branding.
 * Theme switching is centralized in Settings (ViewImpostazioni).
 */
export default function AppHeader() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();

  const handleBrandClick = () => {
    if (currentUser && userData?.casaId) {
      navigate("/home");
    } else if (currentUser) {
      navigate("/scelta-casa");
    } else {
      navigate("/");
    }
  };

  return (
    <header className="app-topbar">
      <div
        className="brand-wrapper"
        onClick={handleBrandClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrandClick();
          }
        }}
        aria-label={t("nav.ariaHomeLink", {}, "Torna alla pagina principale HouseHelper")}
      >
        <div className="brand-icon-badge">
          <img src={logo} alt="HouseHelper Logo" className="brand-logo-img" />
        </div>
        <span className="brand-title">HouseHelper</span>
      </div>

      {/* Desktop Navigation links (hidden <= 768px via CSS) */}
      <DesktopNavigation />

      {/* Right controls: Mobile Navigation burger (hidden > 768px via CSS) */}
      <div className="topbar-actions">
        <MobileNavigation />
      </div>
    </header>
  );
}
