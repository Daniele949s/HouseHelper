import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Desktop navigation bar rendered inside AppHeader on viewports > 768px.
 * Automatically hidden on mobile devices in favor of MobileNavigation drawer.
 * Displays only when user is authenticated and associated with a household (casaId).
 */
export default function DesktopNavigation() {
  const { currentUser, userData } = useAuth();
  const location = useLocation();

  // Guard: Only render when authenticated with an active household
  if (!currentUser || !userData || !userData.casaId) {
    return null;
  }

  const navItems = [
    { label: "Dashboard", icon: "fa-home", path: "/home", end: true },
    { label: "Turni", icon: "fa-broom", path: "/turni", end: false },
    { label: "Debiti", icon: "fa-wallet", path: "/debiti", end: false },
    { label: "Spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
    { label: "Bacheca", icon: "fa-thumbtack", path: "/bacheca", end: false },
    { label: "Calendario", icon: "fa-calendar-alt", path: "/calendario", end: false },
    { label: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false },
    { label: "Contatti", icon: "fa-address-book", path: "/contatti", end: false },
  ];

  return (
    <nav className="desktop-nav-root" aria-label="Navigazione principale">
      <ul className="desktop-nav-list">
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <li key={item.path} className="desktop-nav-item">
              <NavLink
                to={item.path}
                className={`desktop-nav-link ${isActive ? "active" : ""}`}
              >
                <i className={`fas ${item.icon} desktop-nav-icon`} aria-hidden="true"></i>
                <span className="desktop-nav-label">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
