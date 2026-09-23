import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import InteractiveMascot from "../../components/InteractiveMascot";
import { triggerConfetti } from "../../components/Celebration";
import '../../App.css';

export default function ViewRegistrazione() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "utenti", userCredential.user.uid), {
        username: username,
        email: email,
        casaId: null
      });

      triggerConfetti();
      navigate("/scelta-casa");
    } catch (err) {
      console.error("Errore di registrazione:", err);
      setError(err.message || "Errore durante la registrazione.");
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
      setError("Errore con l'accesso Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <InteractiveMascot
        targetInputRef={emailInputRef}
        isError={!!error}
        errorMessage="Verifica i campi!"
      />

      <div className="auth-header">
        <h1>Crea Account ✨</h1>
        <p className="subtitle">Unisciti alla gestione intelligente di HouseHelper</p>
      </div>

      {error && (
        <div className="error-alert">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        className="btn-secondary"
        onClick={handleGoogleAuth}
        disabled={loading}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '18px' }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
          alt="Google"
          style={{ width: '18px', height: '18px' }}
        />
        Registrati con Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
        <span style={{ margin: '0 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>oppure con email</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label>Nome Utente / Nickname</label>
          <input
            type="text"
            placeholder="Come ti chiamano i coinquilini?"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

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
            placeholder="Scegli una password sicura"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "6px" }}>
          {loading ? (
            <span><i className="fas fa-spinner fa-spin"></i> Creazione in corso...</span>
          ) : (
            <span><i className="fas fa-check"></i> Completa Registrazione</span>
          )}
        </button>
      </form>

      <div style={{ marginTop: '24px' }}>
        <button className="btn-text" onClick={() => navigate("/login")}>
          Hai già un account? <span className="highlight">Accedi qui</span>
        </button>
      </div>
    </div>
  );
}
