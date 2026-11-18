import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function HomeAutenticazione() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (currentUser) {
      if (userData && userData.casaId) {
        navigate("/home");
      } else {
        navigate("/scelta-casa");
      }
    }
  }, [currentUser, userData, navigate]);

  return (
    <div className="card auth-card hero-welcome-card">
      {/* Brand Hero Emblem */}
      <div className="hero-brand-badge" aria-hidden="true">
        <i className="fas fa-house-chimney-user"></i>
      </div>

      {/* Main Title & Value Proposition */}
      <div className="hero-header-text">
        <h1 className="main-title">HouseHelper</h1>
        <p className="subtitle">
          {t("auth.heroSubtitle", {}, "La convivenza resa semplice e organizzata. Gestisci i turni di pulizia, dividi le spese e mantieni la casa sincronizzata tra coinquilini.")}
        </p>
      </div>

      {/* Primary Call to Action Buttons */}
      <div className="hero-cta-group" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
        <button
          type="button"
          className="btn-primary hero-btn"
          onClick={() => navigate("/login")}
        >
          <i className="fas fa-sign-in-alt" aria-hidden="true"></i>
          <span>{t("auth.heroLoginBtn", {}, "Accedi all'Account")}</span>
        </button>

        <button
          type="button"
          className="btn-secondary hero-btn"
          onClick={() => navigate("/registrazione")}
        >
          <i className="fas fa-user-plus" aria-hidden="true"></i>
          <span>{t("auth.heroRegisterBtn", {}, "Inizia Ora (Crea Account)")}</span>
        </button>
      </div>

      {/* Modern Feature Pills */}
      <div className="hero-feature-pills" aria-label={t("auth.heroFeaturesAria", {}, "Funzionalità principali")}>
        <div className="feature-pill">
          <i className="fas fa-broom" aria-hidden="true"></i>
          <span>{t("auth.featureChores", {}, "Turni Pulizia")}</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-wallet" aria-hidden="true"></i>
          <span>{t("auth.featureExpenses", {}, "Spese Condivise")}</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-shopping-cart" aria-hidden="true"></i>
          <span>{t("auth.featureGroceries", {}, "Lista Spesa")}</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-calendar-alt" aria-hidden="true"></i>
          <span>{t("auth.featureCalendar", {}, "Calendario")}</span>
        </div>
        <div className="feature-pill">
          <i className="fas fa-thumbtack" aria-hidden="true"></i>
          <span>{t("auth.featureBoard", {}, "Bacheca Avvisi")}</span>
        </div>
      </div>

      {/* Trust & Real-time Sync Footnote */}
      <div className="hero-trust-tag">
        <i className="fas fa-shield-alt" aria-hidden="true"></i>
        <span>{t("auth.heroTrustTag", {}, "Spazio sincronizzato e protetto in tempo reale")}</span>
      </div>
    </div>
  );
}
