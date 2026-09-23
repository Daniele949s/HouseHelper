import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import InteractiveMascot from "../../components/InteractiveMascot";
import '../../App.css';

export default function HomeAutenticazione() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

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
    <div className="card auth-card">
      <InteractiveMascot />
      
      <div style={{ marginTop: "10px" }}>
        <h1 className="main-title">HouseHelper</h1>
        <p className="subtitle">
          La convivenza resa semplice e armoniosa. Gestisci turni, dividi le spese e mantieni la casa sincronizzata con un'estetica moderna.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
        <button className="btn-primary" onClick={() => navigate("/login")}>
          <i className="fas fa-sign-in-alt"></i> Accedi all'Account
        </button>

        <button className="btn-secondary" onClick={() => navigate("/registrazione")}>
          <i className="fas fa-user-plus"></i> Inizia Ora (Crea Account)
        </button>
      </div>

      <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", gap: "16px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        <span>✨ Turni</span>
        <span>•</span>
        <span>💸 Spese</span>
        <span>•</span>
        <span>🛒 Spesa</span>
        <span>•</span>
        <span>🗓️ Calendario</span>
      </div>
    </div>
  );
}
