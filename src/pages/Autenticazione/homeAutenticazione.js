import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
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
        <div className="hero-section">
            <h1 className="main-title">HouseHelper <span className="emoji-pop">✨</span></h1>
            <p className="subtitle">
              La convivenza resa semplice. Gestisci turni, spese e comunicazioni in un'unica app dal design premium.
            </p>
        </div>
        
        <div className="auth-buttons-container">
          <button className="btn-primary btn-large" onClick={() => navigate("/login")}>
            Accedi all'account
          </button>
          
          <button 
            className="btn-secondary btn-large"
            onClick={() => navigate("/registrazione")} 
          >
            Inizia Ora
          </button>
        </div>
    </div>
  );
}