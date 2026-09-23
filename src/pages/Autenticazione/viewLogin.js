import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider } from '../../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import InteractiveMascot from "../../components/InteractiveMascot";
import { triggerConfetti } from "../../components/Celebration";
import '../../App.css';

export default function ViewLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'utenti', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      triggerConfetti();

      if (userDoc.exists() && userDoc.data().casaId) {
        navigate('/home');
      } else {
        navigate('/scelta-casa');
      }
    } catch (err) {
      console.error("Errore Login:", err);
      setError("Credenziali errate o account non trovato.");
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

      triggerConfetti();

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
      setError("Errore durante l'accesso con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <InteractiveMascot
        targetInputRef={emailInputRef}
        isError={!!error}
        errorMessage="Credenziali non valide!"
      />

      <div className="auth-header">
        <h1>Bentornato 👋</h1>
        <p className="subtitle">Accedi per gestire la tua casa condivisa</p>
      </div>

      {error && (
        <div className="error-alert">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-form">
        <div className="input-group">
          <label>Email</label>
          <input
            ref={emailInputRef}
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

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "8px" }}>
          {loading ? (
            <span><i className="fas fa-spinner fa-spin"></i> Accesso in corso...</span>
          ) : (
            <span><i className="fas fa-sign-in-alt"></i> Accedi</span>
          )}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', margin: '22px 0' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
        <span style={{ margin: '0 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>oppure</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
      </div>

      <button
        type="button"
        className="btn-secondary"
        onClick={handleGoogleAuth}
        disabled={loading}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
          alt="Google"
          style={{ width: '18px', height: '18px' }}
        />
        Continua con Google
      </button>

      <div style={{ marginTop: '28px' }}>
        <button className="btn-text" onClick={() => navigate('/registrazione')}>
          Non hai un account? <span className="highlight">Registrati</span>
        </button>
      </div>
    </div>
  );
}
