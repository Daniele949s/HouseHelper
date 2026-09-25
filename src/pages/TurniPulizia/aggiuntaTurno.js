import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerConfetti } from "../../components/Celebration";
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

export default function AggiuntaTurno() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [turno, setTurno] = useState({
    nomi: "",
    data: "",
    luoghi: "",
    procedura: "",
    fasciaOraria: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTurno((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!userData?.casaId) {
      setError("Devi prima far parte di una casa.");
      return;
    }

    // Input Validation & Anti-Injection
    const cleanedNomi = sanitizeList(turno.nomi, 10, 50);
    const cleanedLuoghi = sanitizeList(turno.luoghi, 10, 80);
    const cleanedProcedura = sanitizeList(turno.procedura, 10, 150);
    const dateValidation = validateDate(turno.data);

    if (cleanedNomi.length === 0) {
      setError("Specifica almeno una persona assegnata al turno.");
      return;
    }

    if (!dateValidation.isValid) {
      setError(dateValidation.error || "Data del turno non valida.");
      return;
    }

    if (cleanedLuoghi.length === 0) {
      setError("Specifica almeno un luogo o mansione da svolgere.");
      return;
    }

    if (!FASCE_DISPONIBILI.includes(turno.fasciaOraria)) {
      setError("Seleziona una fascia oraria valida dall'elenco.");
      return;
    }

    setLoading(true);

    const turnoDaInviare = {
      nomi: cleanedNomi,
      data: dateValidation.date,
      luoghi: cleanedLuoghi,
      procedura: cleanedProcedura,
      fasciaOraria: [turno.fasciaOraria],
      casaId: userData.casaId,
      utenteId: currentUser.uid,
      mansione: cleanedLuoghi.join(", ")
    };

    try {
      await addDoc(collection(db, "turni"), turnoDaInviare);
      triggerConfetti();
      navigate("/turni");
    } catch (err) {
      console.error("Errore aggiunta turno:", err);
      setError("Errore durante la creazione del turno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>Nuovo Turno Pulizia 🧹</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>Assegna un incarico e pianifica la pulizia della casa</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <label>Chi farà le pulizie? (separati da virgola)</label>
          <input
            type="text"
            name="nomi"
            value={turno.nomi}
            onChange={handleChange}
            required
            maxLength={250}
            placeholder="es. Mario, Luca"
          />
        </div>

        <div className="input-group">
          <label>Data Turno</label>
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
            <option value="">-- Seleziona orario indicativo --</option>
            {FASCE_DISPONIBILI.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>Cosa c'è da pulire? (separati da virgola)</label>
          <input
            type="text"
            name="luoghi"
            value={turno.luoghi}
            onChange={handleChange}
            required
            maxLength={250}
            placeholder="es. Cucina, Bagno, Pavimento salotto"
          />
        </div>

        <div className="input-group">
          <label>Istruzioni extra / Procedura (opzionale)</label>
          <textarea
            name="procedura"
            value={turno.procedura}
            onChange={handleChange}
            maxLength={500}
            placeholder="es. Svuotare la pattumiera dell'organico, passare lo straccio"
            style={{ minHeight: "80px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Crea Turno"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/turni")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
