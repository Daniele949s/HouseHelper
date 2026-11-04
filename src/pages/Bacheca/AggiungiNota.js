import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/feedback";
import { sanitizeText, validateDate } from "../../utils/security";

const PRIORITY_OPTIONS = [
  { id: "info", label: "Info", icon: "fas fa-info-circle" },
  { id: "importante", label: "Importante", icon: "fas fa-star" },
  { id: "urgente", label: "Urgente", icon: "fas fa-exclamation-triangle" },
  { id: "promemoria", label: "Promemoria", icon: "fas fa-bell" }
];

export default function AggiungiNota() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nota, setNota] = useState({
    titolo: "",
    contenuto: "",
    priorita: "info",
    data: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Input Sanitization & Anti-Injection
    const cleanedTitolo = sanitizeText(nota.titolo, 80);
    const cleanedContenuto = sanitizeText(nota.contenuto, 1500);

    if (!cleanedTitolo) {
      setError("Il titolo dell'avviso è obbligatorio.");
      return;
    }

    if (!cleanedContenuto) {
      setError("Il messaggio dell'avviso è obbligatorio.");
      return;
    }

    let validDate = null;
    if (nota.data) {
      const dateRes = validateDate(nota.data);
      if (!dateRes.isValid) {
        setError(dateRes.error || "Data non valida.");
        return;
      }
      validDate = dateRes.date;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "note"), {
        titolo: cleanedTitolo,
        contenuto: cleanedContenuto,
        priorita: nota.priorita || "info",
        data: validDate,
        autoreId: currentUser.uid,
        casaId: userData.casaId,
        createdAt: new Date()
      });
      showToast("Avviso pubblicato con successo!", "success");
      navigate("/bacheca");
    } catch (err) {
      console.error("Errore salvataggio nota:", err);
      setError("Errore durante il salvataggio dell'avviso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>Nuovo Avviso <i className="fas fa-thumbtack" style={{ fontSize: "0.85em", marginLeft: "6px" }}></i></h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>Condividi una comunicazione con tutti i coinquilini</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <label>Priorità avviso</label>
          <div className="pill-selector-group">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`pill-selector-btn ${nota.priorita === opt.id ? "active" : ""}`}
                onClick={() => setNota({ ...nota, priorita: opt.id })}
              >
                <i className={opt.icon}></i> {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label>Titolo (massimo 80 caratteri)</label>
            <span className="char-counter">{nota.titolo.length} / 80</span>
          </div>
          <input
            type="text"
            value={nota.titolo}
            onChange={(e) => setNota({ ...nota, titolo: e.target.value })}
            placeholder="Oggetto dell'avviso"
            maxLength={80}
            required
          />
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label>Messaggio / Dettagli (massimo 1500 caratteri)</label>
            <span className="char-counter">{nota.contenuto.length} / 1500</span>
          </div>
          <textarea
            value={nota.contenuto}
            onChange={(e) => setNota({ ...nota, contenuto: e.target.value })}
            placeholder="Scrivi qui il messaggio dettagliato..."
            maxLength={1500}
            required
            style={{ minHeight: "110px" }}
          />
        </div>

        <div className="input-group">
          <label>Data scadenza o evento (opzionale)</label>
          <input
            type="date"
            value={nota.data}
            onChange={(e) => setNota({ ...nota, data: e.target.value })}
            min="2020-01-01"
            max="2100-12-31"
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Pubblica Avviso"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/bacheca")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
