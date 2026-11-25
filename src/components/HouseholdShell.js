import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { useLanguage } from "../contexts/LanguageContext";
import { DESKTOP_NAV_ITEMS, isRouteActive } from "../navigation/navigationRegistry";
import logo from "../HouseHelper.svg";

/**
 * Shared responsive shell for authenticated household pages.
 * Renders the desktop left sidebar (#1D4435) and main content area (#F7F6F2)
 * with the house selector and page heading.
 */
export default function HouseholdShell({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const { house } = useHousehold();
  const { t } = useLanguage();

  const houseName =
    house?.nome ||
    userData?.nomeCasa ||
    t("house.defaultName", {}, "La tua casa");

  return (
    <div className="hh-shell">
      <aside
        className="hh-sidebar"
        aria-label={t("nav.ariaNav", {}, "Navigazione principale")}
      >
        <button
          type="button"
          className="hh-sidebar-brand"
          onClick={() => navigate("/home")}
        >
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0 }}
          />
          <span>HouseHelper</span>
        </button>
        <nav>
          <ul className="hh-sidebar-nav">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const label = t(item.key, {}, item.fallback);
              const isActive = isRouteActive(location.pathname, item);
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`hh-sidebar-link ${isActive ? "active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <i className={`fas ${item.icon}`} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hh-sidebar-footer">
          <a
            href="https://github.com/Daniele949s"
            target="_blank"
            rel="noopener noreferrer"
            className="hh-sidebar-github"
            aria-label={t("footer.githubAria", {}, "GitHub di Daniele")}
            title={t("footer.githubTitle", {}, "Profilo GitHub (Daniele949s)")}
          >
            <i className="fab fa-github" aria-hidden="true" />
            <span>GitHub</span>
          </a>
        </div>
      </aside>

      <main className="hh-main-wrap">
        <div className="hh-topbar">
          <button
            type="button"
            className="hh-house-selector"
            onClick={() => navigate("/scelta-casa")}
            aria-label={t("house.switch", {}, "Cambia casa")}
          >
            <i className="fas fa-home" aria-hidden="true" />
            <span>{houseName}</span>
            <i className="fas fa-caret-down" aria-hidden="true" />
          </button>
        </div>

        {title && <h1 className="hh-page-title">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
