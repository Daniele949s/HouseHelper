import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const handleReturn = () => {
    if (!currentUser) {
      navigate("/login");
    } else if (userData?.casaId) {
      navigate("/home");
    } else {
      navigate("/scelta-casa");
    }
  };

  return (
    <div className="card" style={{ maxWidth: "560px", margin: "40px auto", textAlign: "center", padding: "3rem 2rem" }}>
      <div style={{ fontSize: "4.5rem", marginBottom: "12px", lineHeight: 1 }}>
        <i className="fas fa-compass" style={{ color: "var(--color-primary)" }}></i>
      </div>
      <h1 style={{ fontSize: "2.4rem", marginBottom: "8px" }}>404</h1>
      <h2 style={{ fontSize: "1.3rem", color: "var(--text-main)", marginBottom: "12px" }}>
        Pagina Non Trovata
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "28px" }}>
        L'indirizzo URL a cui stai tentando di accedere non esiste, è stato rimosso oppure non hai i permessi per visualizzarlo.
      </p>

      <button
        onClick={handleReturn}
        className="btn-primary"
        style={{ width: "auto", padding: "12px 28px", margin: "0 auto" }}
      >
        <i className="fas fa-home" style={{ marginRight: "8px" }}></i>
        Torna alla Dashboard Sicura
      </button>
    </div>
  );
}
