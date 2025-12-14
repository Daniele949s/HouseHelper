import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/utenti";

export default function ViewRegistrazione() {
  const [utente, setUtente] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await axios.post(API_URL, utente);
      
      // La registrazione ha avuto successo
      alert("Registrazione completata! Ora effettua il login.");
      
      // Rimandiamo al login per ottenere il Token
      navigate("/login");

    } catch (error) {
      console.error("Errore di registrazione:", error);
      const msg = error.response?.data?.error || "Errore durante la registrazione.";
      setError(msg);
    }
  };

  return (
    <div className="card">
      <h1>Crea Account</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Scegli Username"
          value={utente.username}
          onChange={(e) => setUtente(prev => ({ ...prev, username: e.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="Scegli Password"
          value={utente.password}
          onChange={(e) => setUtente(prev => ({ ...prev, password: e.target.value }))}
          required
        />
        <button type="submit">Registrati</button>
      </form>

      {error && <p style={{color: 'red', marginTop: '10px'}}>{error}</p>}
      
      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Hai già un account? <span style={{color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => navigate("/login")}>Accedi qui</span>
      </p>
    </div>
  );
}