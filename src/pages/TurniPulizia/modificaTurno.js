import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { sanitizeList, validateDate } from "../../utils/security";
import "../../App.css";

const generaFasceOrarie = () => {
  const orari = [];
  for (let i = 7; i < 23; i++) {
    const start = i.toString().padStart(2, "0") + ":00";
    const end = (i + 1).toString().padStart(2, "0") + ":00";
    orari.push(`${start} - ${end}`);
  }
  return orari;
};
const FASCE_DISPONIBILI = generaFasceOrarie();

export default function ModificaTurno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [turno, setTurno] = useState({
    nomi: "",
    data: "",
    luoghi: "",
    procedura: "",
    fasciaOraria: ""
  });

  useEffect(() => {
    const fetchTurno = async () => {
      if (!userData?.casaId) return;

      try {
        const turnoDoc = await getDoc(doc(db, "turni", id));
        if (!turnoDoc.exists()) {
          alert("Turno non trovato o precedentemente rimosso.");
          navigate("/turni");
          return;
        }

        const data = turnoDoc.data();

        // Multi-tenant Security Check: Prevent accessing turni belonging to other households via URL
        if (data.casaId !== userData.casaId) {
          alert("Accesso non consentito: questo turno appartiene a un'altra abitazione.");
          navigate("/turni");
          return;
        }

        setTurno({
          nomi: Array.isArray(data.nomi) ? data.nomi.join(", ") : (data.nomi || ""),
          data: data.data || "",
          luoghi: Array.isArray(data.luoghi) ? data.luoghi.join(", ") : (data.luoghi || ""),
          procedura: Array.isArray(data.procedura) ? data.procedura.join(", ") : (data.procedura || ""),
          fasciaOraria: Array.isArray(data.fasciaOraria) ? data.fasciaOraria[0] : (data.fasciaOraria || "")
        });
      } catch (err) {
        console.error("Errore fetch turno:", err);
        setError("Impossibile caricare il turno.");
      } finally {
        setLoading(false);
      }
    };

    fetchTurno();
  }, [id, userData, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTurno((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Input Validation & Sanitization
    const cleanedNomi = sanitizeList(turno.nomi, 10, 50);
    const cleanedLuoghi = sanitizeList(turno.luoghi, 10, 80);
    const cleanedProcedura = sanitizeList(turno.procedura, 10, 150);
    const dateValidation = validateDate(turno.data);

    if (cleanedNomi.length === 0) {
      setError("Inserisci almeno un operatore valido per il turno.");
      return;
    }

    if (!dateValidation.isValid) {
      setError(dateValidation.error || "Data non valida.");
      return;
    }

    if (cleanedLuoghi.length === 0) {
      setError("Specifica almeno una stanza o luogo da pulire.");
      return;
    }

    if (!FASCE_DISPONIBILI.includes(turno.fasciaOraria)) {
      setError("Seleziona una fascia oraria valida dall'elenco.");
      return;
    }

    setSaving(true);

    const turnoAggiornato = {
      nomi: cleanedNomi,
      data: dateValidation.date,
      luoghi: cleanedLuoghi,
      procedura: cleanedProcedura,
      fasciaOraria: [turno.fasciaOraria],
      mansione: cleanedLuoghi.join(", "),
      casaId: userData.casaId // Enforce current household integrity
    };

    try {
      await updateDoc(doc(db, "turni", id), turnoAggiornato);
      navigate("/turni");
    } catch (err) {
      console.error("Errore aggiornamento turno:", err);
      setError("Errore durante l'aggiornamento del turno.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "600px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: "10px" }}>Verifica autorizzazioni e caricamento turno...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>Modifica Turno ✏️</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>Aggiorna data, luogo o assegnatari del turno</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <label>Operatori (separati da virgola, max 10 persone)</label>
          <input
            type="text"
            name="nomi"
            value={turno.nomi}
            onChange={handleChange}
            maxLength={250}
            required
          />
        </div>

        <div className="input-group">
          <label>Data</label>
          <input
            type="date"
            name="data"
            value={turno.data}
            onChange={handleChange}
            min="2020-01-01"
            max="2100-12-31"
            required
          />
        </div>

        <div className="input-group">
          <label>Fascia Oraria</label>
          <select name="fasciaOraria" value={turno.fasciaOraria} onChange={handleChange} required>
            <option value="">-- Seleziona orario --</option>
            {FASCE_DISPONIBILI.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>Luoghi da pulire (separati da virgola)</label>
          <input
            type="text"
            name="luoghi"
            value={turno.luoghi}
            onChange={handleChange}
            maxLength={250}
            required
          />
        </div>

        <div className="input-group">
          <label>Istruzioni e Note (opzionale)</label>
          <textarea
            name="procedura"
            value={turno.procedura}
            onChange={handleChange}
            maxLength={500}
            style={{ minHeight: "80px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin"></i> : "Salva Modifiche"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/turni")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
