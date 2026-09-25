import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerConfetti } from "../../components/Celebration";
import { validateNumber, sanitizeText } from "../../utils/security";
import "../../App.css";

export default function AggiungiDebito() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [coinquilini, setCoinquilini] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDiviso, setIsDiviso] = useState(false);
  const [error, setError] = useState("");

  const [debito, setDebito] = useState({
    importo: "",
    descrizione: "",
    debitoreId: "",
    creditoreId: currentUser?.uid || ""
  });

  useEffect(() => {
    const fetchCoinquilini = async () => {
      if (!userData?.casaId) return;
      try {
        const q = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
        const snap = await getDocs(q);
        const utenti = [];
        snap.forEach((doc) => {
          utenti.push({ id: doc.id, ...doc.data() });
        });
        setCoinquilini(utenti);
      } catch (err) {
        console.error("Errore fetch coinquilini:", err);
        setError("Impossibile caricare l'elenco dei coinquilini.");
      }
    };
    fetchCoinquilini();
  }, [userData]);

  const handleKeyDownNumber = (e) => {
    // Block negative signs, addition signs, and exponential notation
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1. Text Sanitization (Anti-Injection & XSS)
    const cleanedDescrizione = sanitizeText(debito.descrizione, 100);
    if (!cleanedDescrizione) {
      setError("Inserisci una descrizione valida per la spesa.");
      return;
    }

    // 2. Strict Number Validation & Bounds (No negative numbers, max 50,000 €)
    const numValidation = validateNumber(debito.importo, {
      min: 0.01,
      max: 50000,
      decimals: 2,
      required: true
    });

    if (!numValidation.isValid) {
      setError(numValidation.error || "Importo non valido.");
      return;
    }

    // 3. Creditor & Debtor Verification
    if (!debito.creditoreId) {
      setError("Seleziona chi ha sostenuto la spesa.");
      return;
    }

    const creditoreValido = coinquilini.some((c) => c.id === debito.creditoreId);
    if (!creditoreValido) {
      setError("Il creditore selezionato non appartiene alla tua abitazione.");
      return;
    }

    setLoading(true);

    try {
      if (isDiviso) {
        if (coinquilini.length < 2) {
          setError("Sei l'unico membro registrato nella casa: impossibile dividere la spesa.");
          setLoading(false);
          return;
        }

        const quota = (numValidation.value / coinquilini.length).toFixed(2);
        const quotaNum = parseFloat(quota);
        if (quotaNum <= 0) {
          setError("L'importo inserito è troppo basso per essere suddiviso.");
          setLoading(false);
          return;
        }

        const promesse = coinquilini.map((c) => {
          if (c.id !== debito.creditoreId) {
            return addDoc(collection(db, "debiti"), {
              importo: quota,
              descrizione: `${cleanedDescrizione} (Quota)`,
              debitoreId: c.id,
              creditoreId: debito.creditoreId,
              casaId: userData.casaId,
              createdAt: new Date()
            });
          }
          return Promise.resolve();
        });

        await Promise.all(promesse);
      } else {
        if (!debito.debitoreId) {
          setError("Seleziona chi deve restituire i soldi.");
          setLoading(false);
          return;
        }

        if (debito.debitoreId === debito.creditoreId) {
          setError("Non puoi registrare un debito verso te stesso.");
          setLoading(false);
          return;
        }

        const debitoreValido = coinquilini.some((c) => c.id === debito.debitoreId);
        if (!debitoreValido) {
          setError("Il debitore selezionato non appartiene alla tua abitazione.");
          setLoading(false);
          return;
        }

        await addDoc(collection(db, "debiti"), {
          importo: numValidation.formatted,
          descrizione: cleanedDescrizione,
          debitoreId: debito.debitoreId,
          creditoreId: debito.creditoreId,
          casaId: userData.casaId,
          createdAt: new Date()
        });
      }

      triggerConfetti();
      navigate("/debiti");
    } catch (err) {
      console.error("Errore salvataggio debito:", err);
      setError("Errore durante il salvataggio della spesa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>Nuova Spesa 💸</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>Registra una spesa singola o dividila con tutti</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <label>Descrizione della spesa (massimo 100 caratteri)</label>
          <input
            type="text"
            placeholder="es. Spesa supermercato, Bolletta luce, Detersivi"
            value={debito.descrizione}
            onChange={(e) => setDebito({ ...debito, descrizione: e.target.value })}
            maxLength={100}
            required
          />
        </div>

        <div className="input-group">
          <label>Importo Totale (€) - Min: 0.01 €, Max: 50.000 €</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="50000"
            placeholder="es. 45.50"
            value={debito.importo}
            onKeyDown={handleKeyDownNumber}
            onChange={(e) => setDebito({ ...debito, importo: e.target.value })}
            required
          />
        </div>

        <div className="input-group" style={{ background: "var(--bg-input)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "12px", margin: 0, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isDiviso}
              onChange={(e) => setIsDiviso(e.target.checked)}
              style={{ width: "22px", height: "22px", margin: 0, accentColor: "var(--color-primary)" }}
            />
            <span style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "600" }}>
              Dividi automaticamente l'importo tra TUTTI i coinquilini ({coinquilini.length > 0 ? `${coinquilini.length} persone` : ""})
            </span>
          </label>
        </div>

        <div className="input-group">
          <label>Chi ha anticipato i soldi?</label>
          <select
            value={debito.creditoreId}
            onChange={(e) => setDebito({ ...debito, creditoreId: e.target.value })}
            required
          >
            {coinquilini.map((c) => (
              <option key={c.id} value={c.id}>
                {c.username} {c.id === currentUser?.uid ? "(Tu)" : ""}
              </option>
            ))}
          </select>
        </div>

        {!isDiviso && (
          <div className="input-group">
            <label>Chi deve restituire i soldi?</label>
            <select
              value={debito.debitoreId}
              onChange={(e) => setDebito({ ...debito, debitoreId: e.target.value })}
              required
            >
              <option value="">-- Seleziona coinquilino debitore --</option>
              {coinquilini.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.username} {c.id === currentUser?.uid ? "(Tu)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Salva Spesa"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/debiti")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
