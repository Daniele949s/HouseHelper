import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function SceltaCasa() {
  const navigate = useNavigate();
  const [nomeCasa, setNomeCasa] = useState("");
  const [codiceCasa, setCodiceCasa] = useState("");
  const [error, setError] = useState("");
  
  // Helper per Headers
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const creaCasa = async () => {
    if (!nomeCasa.trim()) return;
    setError("");
    
    try {
      // POST sicura: solo nomeCasa nel body, headers per l'ID utente
      const res = await axios.post(
        "http://localhost:5000/api/casa/crea", 
        { nomeCasa }, 
        getAuthHeader()
      );

      if (res.data.ok) {
        localStorage.setItem("casaId", res.data.casa.id);
        alert(`Casa creata! Il tuo codice invito è: ${res.data.casa.codiceUnivoco}`);
        navigate("/home");
      }
    } catch (e) { 
        console.error(e);
        setError("Errore nella creazione della casa. Riprova.");
    }
  };

  const uniscitiCasa = async () => {
    if (!codiceCasa.trim()) return;
    setError("");

    try {
      // POST sicura: solo codice nel body
      const res = await axios.post(
        "http://localhost:5000/api/casa/unisciti", 
        { codice: codiceCasa }, 
        getAuthHeader()
      );

      if (res.data.ok) {
        localStorage.setItem("casaId", res.data.casa.id);
        alert(`Benvenuto in ${res.data.casa.nome}!`);
        navigate("/home");
      }
    } catch (e) { 
        console.error(e);
        setError(e.response?.data?.message || "Codice non valido o errore server.");
    }
  };

  return (
    <div className="card">
      <h1>Configurazione Casa</h1>
      <p className="subtitle">Non fai ancora parte di un gruppo. Inizia ora!</p>
      
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {/* SEZIONE 1: CREA */}
      <div style={{marginTop: '2rem', borderBottom: '1px solid #eee', paddingBottom: '2rem'}}>
        <h3>🏠 Crea una nuova Casa</h3>
        <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '10px'}}>
            Crea un nuovo gruppo e invita i tuoi coinquilini.
        </p>
        <input 
          type="text"
          placeholder="Nome della tua casa (es. Villa Arzilla)" 
          value={nomeCasa} 
          onChange={e => setNomeCasa(e.target.value)} 
        />
        <button onClick={creaCasa}>Crea Casa</button>
      </div>

      {/* SEZIONE 2: UNISCITI */}
      <div style={{marginTop: '2rem'}}>
        <h3>🔑 Unisciti con un codice</h3>
        <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '10px'}}>
            Hai ricevuto un codice? Inseriscilo qui sotto.
        </p>
        <input 
          type="text"
          placeholder="Inserisci codice invito (es. X7K9P2)" 
          value={codiceCasa} 
          onChange={e => setCodiceCasa(e.target.value.toUpperCase())} 
        />
        <button className="btn-secondary" onClick={uniscitiCasa}>Unisciti</button>
      </div>

      <div style={{ marginTop: '30px' }}>
          <span 
            onClick={() => { localStorage.clear(); navigate('/login'); }}
            style={{ fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Torna al Login
          </span>
      </div>
    </div>
  );
}