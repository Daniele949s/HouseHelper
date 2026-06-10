import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
      
      // Salva info aggiuntive in Firestore
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

  return (
    <div className="card auth-card">
      <div className="auth-header">
        <h1>Crea Account ✨</h1>
        <p className="subtitle">Unisciti a HouseHelper</p>
      </div>

      {error && <div className="error-alert">{error}</div>}

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
      
      <div className="auth-footer">
        <p>Hai già un account?</p>
        <button className="btn-text" onClick={() => navigate("/login")}>
          <span className="highlight">Accedi qui</span>
        </button>
      </div>
    </div>
  );
}