import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData } = useAuth();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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

  const menuItems = currentUser
    ? [
        { label: "Dashboard", icon: "fa-home", path: "/home" },
        { label: "Turni Pulizia", icon: "fa-broom", path: "/turni" },
        { label: "Spese & Debiti", icon: "fa-wallet", path: "/debiti" },
        { label: "Lista Spesa", icon: "fa-shopping-cart", path: "/spesa" },
        { label: "Calendario Casa", icon: "fa-calendar-alt", path: "/calendario" },
        { label: "Bacheca", icon: "fa-thumbtack", path: "/bacheca" },
      ]
    : [
        { label: "Home", icon: "fa-home", path: "/" },
        { label: "Accedi", icon: "fa-sign-in-alt", path: "/login" },
        { label: "Registrati", icon: "fa-user-plus", path: "/registrazione" },
      ];

  return (
    <div className="mobile-nav-root">
      {/* Burger button in the top bar */}
      <button
        type="button"
        className={`burger-container ${isOpen ? "burger-active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu di navigazione"
        aria-expanded={isOpen}
      >
        <div id="burger">
          <span className="bar topBar" />
          <span className="bar btmBar" />
        </div>
      </button>

      {/* Fullscreen Mobile Drawer with staged animation */}
      <div className={`mobile-menu-overlay ${isOpen ? "menu-opened" : ""}`} aria-hidden={!isOpen}>
        <div className="mobile-menu-inner">
          <div className="mobile-menu-header">
            <span className="mobile-menu-badge">
              <i className="fas fa-home"></i> HouseHelper Mobile
            </span>
            {userData?.username && (
              <span className="mobile-user-greeting">
                Ciao, <strong>{userData.username}</strong>
              </span>
            )}
          </div>

          <ul className="mobile-menu-list">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
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
                <i className="fas fa-sign-out-alt"></i> Esci dall'account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
