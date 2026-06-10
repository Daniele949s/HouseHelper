import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import '../../App.css';

export default function ViewLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'utenti', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().casaId) {
        navigate('/home');
      } else {
        navigate('/scelta-casa');
      }
    } catch (err) {
      console.error("Errore Login:", err);
      setError("Credenziali errate o errore di connessione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <div className="auth-header">
        <h1>Bentornato 👋</h1>
        <p className="subtitle">Accedi per gestire la tua casa</p>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <form onSubmit={handleLogin} className="auth-form">
        <div className="input-group">
          <label>Email</label>
          <input 
              type="email" 
              placeholder="es. mario@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
          />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
      
      <div className="auth-footer">
        <button className="btn-text" onClick={() => navigate('/registrazione')}>
          Non hai un account? <span className="highlight">Registrati</span>
        </button>
      </div>
    </div>
  );
}