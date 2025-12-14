import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../App.css'; // Assicurati che il percorso del CSS sia giusto

export default function ViewLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError(''); // Pulisce errori precedenti

    try {
      // 1. Chiamata al Backend
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // ============================================================
        // FONDAMENTALE: Salvataggio del Token e dei dati
        // ============================================================
        localStorage.setItem('token', data.token);       // La chiave DEVE essere 'token'
        localStorage.setItem('username', data.username); // Opzionale, utile per saluti
        
        // Salviamo anche l'ID della casa se c'è, utile per i redirect
        if (data.casaId) {
            localStorage.setItem('casaId', data.casaId);
        }

        // 2. Reindirizzamento intelligente
        // Se ha una casa va alla Home, altrimenti a Scelta Casa
        if (data.casaId) {
            navigate('/home');
        } else {
            navigate('/scelta-casa');
        }

      } else {
        // Mostra l'errore che arriva dal server (es. "Password errata")
        setError(data.message || 'Errore durante il login');
      }

    } catch (err) {
      console.error("Errore Login:", err);
      setError('Impossibile contattare il server. Controlla che sia acceso.');
    }
  };

  return (
    <div className="card"> {/* Usa la classe .card del nuovo CSS */}
      <h1>Bentornato</h1>
      <p className="subtitle">Inserisci le tue credenziali</p>

      {/* Mostra errore se c'è */}
      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      <input 
        type="text" 
        placeholder="Username" 
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Accedi</button>
      
      <button className="btn-secondary" onClick={() => navigate('/registrazione')}>
        Non hai un account? Registrati
      </button>
    </div>
  );
}