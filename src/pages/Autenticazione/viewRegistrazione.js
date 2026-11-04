import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, googleProvider } from "../../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { sanitizeText, isValidEmail } from "../../utils/security";

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

    // 1. Username Sanitization & Length Check
    const cleanedUsername = sanitizeText(username, 30);
    if (!cleanedUsername || cleanedUsername.length < 2) {
      setError("Il nome utente deve contenere almeno 2 caratteri (massimo 30).");
      return;
    }

    // 2. Email Validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setError("Inserisci un indirizzo email valido.");
      return;
    }

    // 3. Password Length & Security Boundaries
    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }

    if (password.length > 128) {
      setError("La password non può superare i 128 caratteri.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      await setDoc(doc(db, "utenti", userCredential.user.uid), {
        username: cleanedUsername,
        email: trimmedEmail,
        casaId: null,
        createdAt: new Date()
      });

      navigate("/scelta-casa");
    } catch (err) {
      console.error("Errore di registrazione:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Questo indirizzo email è già registrato.");
      } else if (err.code === "auth/weak-password") {
        setError("La password scelta è troppo debole.");
      } else {
        setError(err.message || "Errore durante la registrazione.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, "utenti", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const cleanedName = sanitizeText(user.displayName, 30) || "Utente Google";
        await setDoc(userDocRef, {
          username: cleanedName,
          email: user.email ? user.email.toLowerCase() : "",
          casaId: null,
          createdAt: new Date()
        });
        navigate("/scelta-casa");
      } else {
        if (userDoc.data().casaId) {
          navigate("/home");
        } else {
          navigate("/scelta-casa");
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
      {/* Brand Icon Badge */}
      <div className="auth-brand-badge" aria-hidden="true">
        <i className="fas fa-user-plus"></i>
      </div>

      <div className="auth-header">
        <h1>
          Crea Account <i className="fas fa-house-chimney-user" style={{ fontSize: "0.85em", marginLeft: "4px" }}></i>
        </h1>
        <p className="subtitle">Unisciti alla gestione intelligente di HouseHelper</p>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Google OAuth Quick Registration */}
      <button
        type="button"
        className="btn-secondary google-auth-btn"
        onClick={handleGoogleAuth}
        disabled={loading}
        style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginBottom: "18px" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Registrati con Google</span>
      </button>

      {/* Divider */}
      <div className="auth-divider" style={{ display: "flex", alignItems: "center", margin: "18px 0" }}>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-color)" }} />
        <span style={{ margin: "0 12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>oppure con email</span>
        <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-color)" }} />
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label htmlFor="reg-username">Nome Utente / Nickname (2-30 caratteri)</label>
          <div className="input-with-icon">
            <i className="fas fa-user input-prefix-icon" aria-hidden="true"></i>
            <input
              id="reg-username"
              type="text"
              placeholder="Come ti chiamano i coinquilini?"
              value={username}
              maxLength={30}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-email">Email</label>
          <div className="input-with-icon">
            <i className="fas fa-envelope input-prefix-icon" aria-hidden="true"></i>
            <input
              id="reg-email"
              ref={emailInputRef}
              type="email"
              placeholder="es. mario@email.com"
              value={email}
              maxLength={100}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="reg-password">Password (minimo 6 caratteri)</label>
          <div className="input-with-icon">
            <i className="fas fa-lock input-prefix-icon" aria-hidden="true"></i>
            <input
              id="reg-password"
              type="password"
              placeholder="Scegli una password sicura"
              value={password}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "6px" }}>
          {loading ? (
            <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Creazione in corso...</span>
          ) : (
            <span><i className="fas fa-check" aria-hidden="true"></i> Completa Registrazione</span>
          )}
        </button>
      </form>

      {/* Navigation to Login */}
      <div style={{ marginTop: "24px" }}>
        <button type="button" className="btn-text" onClick={() => navigate("/login")}>
          Hai già un account? <span className="highlight">Accedi qui</span>
        </button>
      </div>
    </div>
  );
}
