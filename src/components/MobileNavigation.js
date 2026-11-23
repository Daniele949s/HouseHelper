import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useModalFocusTrap } from "./ConfirmModal";
import {
  MOBILE_DRAWER_HOUSEHOLD_ITEMS,
  MOBILE_DRAWER_PUBLIC_ITEMS,
  hasHouseholdAccess,
  isRouteActive,
  useNavigation
} from "../navigation/navigationRegistry";

export default function MobileNavigation() {
  const { isMobileMenuOpen: isOpen, setMobileMenuOpen: setIsOpen } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const drawerRef = useRef(null);

  useModalFocusTrap(isOpen, drawerRef, () => setIsOpen(false));

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, setIsOpen]);

  // Lock body & html scroll completely when mobile menu is open
  useEffect(() => {
    if (!isOpen) return;
    const { style: bodyStyle } = document.body;
    const { style: rootStyle } = document.documentElement;
    const bodyOverflow = bodyStyle.overflow;
    const rootOverflow = rootStyle.overflow;
    bodyStyle.overflow = "hidden";
    rootStyle.overflow = "hidden";

    return () => {
      bodyStyle.overflow = bodyOverflow;
      rootStyle.overflow = rootOverflow;
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

  const rawItems = hasHouseholdAccess(currentUser, userData)
    ? MOBILE_DRAWER_HOUSEHOLD_ITEMS
    : currentUser
      ? []
      : MOBILE_DRAWER_PUBLIC_ITEMS;

  const menuItems = rawItems.map((item) => ({
    ...item,
    label: t(item.key, {}, item.fallback),
  }));

  const drawerOverlay = (
    <div
      className={`mobile-menu-overlay ${isOpen ? "menu-opened" : ""}`}
      ref={drawerRef}
      role="dialog"
      aria-modal={isOpen ? "true" : undefined}
      aria-label={t("nav.menuTitle", {}, "HouseHelper Menu")}
      aria-hidden={!isOpen}
      inert={!isOpen}
      tabIndex={-1}
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
            const isActive = isRouteActive(location.pathname, item);

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
  );

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

      {/* Fullscreen Mobile Drawer: Portaled to document.body to escape sticky/backdrop-filter containing blocks */}
      {typeof document !== "undefined" ? createPortal(drawerOverlay, document.body) : drawerOverlay}
    </div>
  );
}
