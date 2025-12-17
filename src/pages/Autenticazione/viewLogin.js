import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Usiamo Axios per coerenza
import '../../App.css';

export default function ViewLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault(); // Evita il ricaricamento della pagina standard HTML
    setError('');

    try {
      // 1. Chiamata al Backend
      const res = await axios.post('http://localhost:5000/api/login', { 
        username, 
        password 
      });

      // 2. Salvataggio dati fondamentali
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      
      // Salviamo casaId se esiste
      if (res.data.casaId) {
        localStorage.setItem('casaId', res.data.casaId);
      } else {
        localStorage.removeItem('casaId'); // Pulizia per sicurezza
      }

      // 3. REINDIRIZZAMENTO IMMEDIATO
      // Se l'utente ha già una casa, va alla dashboard, altrimenti alla scelta casa
      if (res.data.casaId) {
        navigate('/home');
      } else {
        navigate('/scelta-casa');
      }

    } catch (err) {
      console.error("Errore Login:", err);
      // Gestione errore specifica di Axios
      const msg = err.response?.data?.message || 'Credenziali errate o errore server.';
      setError(msg);
    }
  };

  return (
    <div className="card">
      <h1>Bentornato 👋</h1>
      <p className="subtitle">Inserisci le tue credenziali</p>

      {error && <div style={{ color: 'red', marginBottom: '15px', background:'#fee2e2', padding:'10px', borderRadius:'5px' }}>{error}</div>}

      <form onSubmit={handleLogin}>
        <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
        />
        <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
        />

        <button type="submit">Accedi</button>
      </form>
      
      <button className="btn-secondary" onClick={() => navigate('/registrazione')} style={{marginTop: '10px'}}>
        Non hai un account? Registrati
      </button>
    </div>
  );
}