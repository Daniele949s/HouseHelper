import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import MobileNavigation from "./MobileNavigation";
import DesktopNavigation from "./DesktopNavigation";
import logo from "../logo.png";

/**
 * AppHeader component providing responsive navigation, branding, and theme switching.
 */
export default function AppHeader() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

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
        aria-label="Torna alla pagina principale HouseHelper"
      >
        <div className="brand-icon-badge">
          <img src={logo} alt="HouseHelper Logo" className="brand-logo-img" />
        </div>
        <span className="brand-title">HouseHelper</span>
      </div>

      {/* Desktop Navigation links (hidden <= 768px via CSS) */}
      <DesktopNavigation />

      {/* Right controls: Theme Switch + Mobile Burger */}
      <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <ThemeToggle />
        <MobileNavigation />
      </div>
    </header>
  );
}
