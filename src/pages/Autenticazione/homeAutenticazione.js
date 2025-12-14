import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomeAutenticazione() {
  const navigate = useNavigate();

  // CONTROLLO AUTO-INGRESSO
  useEffect(() => {
    // Usiamo il Token come prova del login
    const token = localStorage.getItem("token");
    const haCasa = localStorage.getItem("casaId");

    if (token) {
      if (haCasa) {
        navigate("/home");
      } else {
        navigate("/scelta-casa");
      }
    }
  }, [navigate]);

  const resetLogin = () => {
      localStorage.clear();
      window.location.reload();
  }

  return (
    <div className="card">
        <h1>Benvenuto su HouseHelper</h1>
        
        <p className="subtitle">
          Gestisci i turni di pulizia della tua casa in modo semplice e senza stress.
        </p>
        
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
          <button onClick={() => navigate("/login")}>
            Accedi
          </button>
          
          <button 
            onClick={() => navigate("/registrazione")} 
            className="btn-secondary"
          >
            Registrati
          </button>
        </div>

        <div onClick={resetLogin} style={{marginTop: '40px', fontSize: '0.8rem', color: '#ccc', cursor: 'pointer'}}>
            (Reset Test Login)
        </div>
    </div>
  );
}