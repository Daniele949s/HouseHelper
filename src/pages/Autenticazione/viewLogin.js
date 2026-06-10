import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider } from '../../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, 'utenti', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          username: user.displayName || 'Utente Google',
          email: user.email,
          casaId: null
        });
        navigate('/scelta-casa');
      } else {
        if (userDoc.data().casaId) {
          navigate('/home');
        } else {
          navigate('/scelta-casa');
        }
      }
    } catch (err) {
      console.error(err);
      setError("Errore con l'accesso Google.");
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

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginBottom: '10px' }}>
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
        <span style={{ margin: '0 10px', color: '#94a3b8', fontSize: '0.9rem' }}>oppure</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
      </div>

      <button type="button" className="btn-secondary" onClick={handleGoogleAuth} disabled={loading} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
        Continua con Google
      </button>
      
      <div className="auth-footer" style={{ marginTop: '30px' }}>
        <button className="btn-text" onClick={() => navigate('/registrazione')}>
          Non hai un account? <span className="highlight">Registrati</span>
        </button>
      </div>
    </div>
  );
}