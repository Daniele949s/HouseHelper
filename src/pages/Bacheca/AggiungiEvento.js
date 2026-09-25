import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerConfetti } from "../../components/Celebration";
import { sanitizeText, validateDate } from "../../utils/security";
import "../../App.css";

export default function AggiungiEvento() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, currentUser } = useAuth();

  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location.state?.dataPreimpostata) {
      try {
        const dataObj = new Date(location.state.dataPreimpostata);
        if (!isNaN(dataObj.getTime())) {
          const dataString = dataObj.toLocaleDateString("en-CA");
          const validation = validateDate(dataString);
          if (validation.isValid) {
            setDataEvento(validation.date);
          }
        }
      } catch (err) {
        console.error("Data non valida:", err);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Input Sanitization & Anti-Injection
    const cleanedTitolo = sanitizeText(titolo, 80);
    const cleanedContenuto = sanitizeText(contenuto, 1500);
    const dateValidation = validateDate(dataEvento);

    if (!cleanedTitolo) {
      setError("Il titolo dell'evento è obbligatorio.");
      return;
    }

    if (!dateValidation.isValid) {
      setError(dateValidation.error || "Seleziona una data valida.");
      return;
    }

    if (!cleanedContenuto) {
      setError("Inserisci una descrizione o orario per l'evento.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "note"), {
        titolo: cleanedTitolo,
        contenuto: cleanedContenuto,
        data: dateValidation.date,
        autoreId: currentUser.uid,
        casaId: userData.casaId,
        createdAt: new Date(),
        isEvento: true
      });
      triggerConfetti();
      navigate("/calendario");
    } catch (e) {
      setError("Errore durante il salvataggio dell'evento.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>Nuovo Evento Calendario 🗓️</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>Aggiungi una data o un impegno per tutti gli abitanti</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <label>Titolo Evento (massimo 80 caratteri)</label>
          <input
            type="text"
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            placeholder="es. Cena di Casa, Affitto in scadenza, Manutenzione caldaia"
            maxLength={80}
            required
          />
        </div>

        <div className="input-group">
          <label style={{ color: "var(--color-primary)" }}>Data (Obbligatoria)</label>
          <input
            type="date"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
            min="2020-01-01"
            max="2100-12-31"
            required
          />
        </div>

        <div className="input-group">
          <label>Dettagli / Note / Orario (massimo 1500 caratteri)</label>
          <textarea
            value={contenuto}
            onChange={(e) => setContenuto(e.target.value)}
            placeholder="Orario preciso, note organizzative, chi partecipa..."
            maxLength={1500}
            required
            style={{ minHeight: "100px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Salva Evento"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/calendario")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
