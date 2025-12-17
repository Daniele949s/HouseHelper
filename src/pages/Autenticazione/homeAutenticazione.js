import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import '../../App.css'; 

export default function HomeAutenticazione() {
  const navigate = useNavigate();

  // CONTROLLO AUTO-INGRESSO
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    // Se c'è un token, assumiamo che l'utente sia loggato
    if (token) {
        // Opzionale: controlliamo se ha già una casa salvata per risparmiare un redirect
        const casaId = localStorage.getItem("casaId");
        if (casaId) {
            navigate("/home");
        } else {
            // Se non sappiamo se ha una casa, lo mandiamo alla home che farà il controllo (o a scelta-casa)
            navigate("/home"); 
        }
    }
  }, [navigate]);

  return (
    <div className="card" style={{textAlign:'center', padding:'40px 20px'}}>
        <h1 style={{fontSize:'2.5rem', marginBottom:'10px'}}>Benvenuto su HouseHelper 🏠</h1>
        
        <p className="subtitle" style={{marginBottom:'40px', color:'#666'}}>
          Gestisci i turni di pulizia, le spese e la vita in comune senza stress.
        </p>
        
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexDirection:'column' }}>
          <button onClick={() => navigate("/login")} style={{fontSize:'1.1rem', padding:'15px'}}>
            Accedi al tuo account
          </button>
          
          <button 
            onClick={() => navigate("/registrazione")} 
            className="btn-secondary"
            style={{fontSize:'1.1rem', padding:'15px'}}
          >
            Crea un nuovo account
          </button>
        </div>
    </div>
  );
}