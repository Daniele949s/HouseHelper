import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import '../../App.css';

export default function ViewRegistrazione() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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
        <h1>Crea Account ✨</h1>
        <p className="subtitle">Unisciti a HouseHelper</p>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <button type="button" className="btn-secondary" onClick={handleGoogleAuth} disabled={loading} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
        Continua con Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
        <span style={{ margin: '0 10px', color: '#94a3b8', fontSize: '0.9rem' }}>oppure con l'email</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e2e8f0' }} />
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label>Nome Utente</label>
          <input
            type="text"
            placeholder="Come ti chiamano in casa?"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
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
            placeholder="Scegli una password sicura"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creazione in corso..." : "Registrati"}
        </button>
      </form>
      
      <div className="auth-footer" style={{ marginTop: '20px' }}>
        <p>Hai già un account?</p>
        <button className="btn-text" onClick={() => navigate("/login")}>
          <span className="highlight">Accedi qui</span>
        </button>
      </div>
    </div>
  );
}