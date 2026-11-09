import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle external toggle from MobileBottomBar "Altro" button
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => !prev);
    };
    window.addEventListener("toggle-mobile-menu", handleToggle);
    return () => {
      window.removeEventListener("toggle-mobile-menu", handleToggle);
    };
  }, []);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Lock body & html scroll completely when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const handleNav = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut(auth);
    navigate("/login");
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  const menuItems = currentUser
    ? [
        { label: t("nav.dashboard", {}, "Dashboard"), icon: "fa-home", path: "/home" },
        { label: t("nav.choresFull", {}, "Turni Pulizia"), icon: "fa-broom", path: "/turni" },
        { label: t("nav.debtsFull", {}, "Spese & Debiti"), icon: "fa-wallet", path: "/debiti" },
        { label: t("nav.groceriesFull", {}, "Lista Spesa"), icon: "fa-shopping-cart", path: "/spesa" },
        { label: t("nav.calendarFull", {}, "Calendario Casa"), icon: "fa-calendar-alt", path: "/calendario" },
        { label: t("nav.board", {}, "Bacheca"), icon: "fa-thumbtack", path: "/bacheca" },
        { label: t("nav.documentsFull", {}, "Documenti & Contratti"), icon: "fa-folder-open", path: "/documenti" },
        { label: t("nav.contactsFull", {}, "Contatti Utili"), icon: "fa-address-book", path: "/contatti" },
        { label: t("nav.settings", {}, "Impostazioni"), icon: "fa-sliders-h", path: "/impostazioni" },
      ]
    : [
        { label: t("nav.home", {}, "Home"), icon: "fa-home", path: "/" },
        { label: t("nav.login", {}, "Accedi"), icon: "fa-sign-in-alt", path: "/login" },
        { label: t("nav.register", {}, "Registrati"), icon: "fa-user-plus", path: "/registrazione" },
      ];

  return (
    <div className="mobile-nav-root">
      {/* Burger button in the top bar */}
      <button
        type="button"
        className={`burger-container ${isOpen ? "burger-active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("nav.ariaOpenMenu", {}, "Apri menu di navigazione")}
        aria-expanded={isOpen}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
      >
        <div id="burger">
          <span className="bar topBar" />
          <span className="bar btmBar" />
        </div>
      </button>

      {/* Fullscreen Mobile Drawer: 100% Solid Opaque (No transparency) */}
      <div
        className={`mobile-menu-overlay ${isOpen ? "menu-opened" : ""}`}
        aria-hidden={!isOpen}
        onClick={handleOverlayClick}
      >
        <div className="mobile-menu-inner">
          <div className="mobile-menu-header">
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="mobile-menu-badge">
                <i className="fas fa-home"></i> {t("nav.menuTitle", {}, "HouseHelper Menu")}
              </span>
              {userData?.username && (
                <span className="mobile-user-greeting">
                  {t("nav.greeting", { name: userData.username }, `Ciao, ${userData.username}`)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label={t("nav.ariaCloseMenu", {}, "Chiudi menu")}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <ul className="mobile-menu-list">
            {menuItems.map((item, idx) => {
              const isActive =
                item.path === "/impostazioni"
                  ? location.pathname === "/impostazioni" || location.pathname === "/settings"
                  : location.pathname === item.path;

              return (
                <li
                  key={item.path}
                  className={`mobile-menu-item ${isActive ? "active-item" : ""}`}
                  style={{ "--item-index": idx }}
                >
                  <button
                    type="button"
                    onClick={() => handleNav(item.path)}
                    className="mobile-menu-link"
                  >
                    <span className="menu-icon-wrapper">
                      <i className={`fas ${item.icon}`}></i>
                    </span>
                    <span className="menu-label-text">{item.label}</span>
                    {isActive && <span className="active-dot" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {currentUser && (
            <div className="mobile-menu-footer">
              <button type="button" onClick={handleLogout} className="mobile-logout-btn">
                <i className="fas fa-sign-out-alt"></i> {t("common.logout", {}, "Esci dall'account")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
