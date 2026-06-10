import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import '../../App.css';

const generaFasceOrarie = () => {
  const orari = [];
  for (let i = 7; i < 23; i++) {
    const start = i.toString().padStart(2, '0') + ":00";
    const end = (i + 1).toString().padStart(2, '0') + ":00";
    orari.push(`${start} - ${end}`);
  }
  return orari;
};
const FASCE_DISPONIBILI = generaFasceOrarie();

export default function AggiuntaTurno() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

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
    if (!userData?.casaId) {
      alert("Devi prima unirti a una casa.");
      navigate("/scelta-casa");
      return;
    }
    setLoading(true);

    const turnoDaInviare = {
      nomi: turno.nomi.split(",").map(n => n.trim()).filter(Boolean),
      data: turno.data,
      luoghi: turno.luoghi.split(",").map(l => l.trim()).filter(Boolean),
      procedura: turno.procedura.split(",").map(p => p.trim()).filter(Boolean),
      fasciaOraria: [turno.fasciaOraria],
      casaId: userData.casaId,
      utenteId: currentUser.uid,
      mansione: turno.luoghi // per la dashboard
    };

    try {
      await addDoc(collection(db, "turni"), turnoDaInviare);
      navigate("/turni");
    } catch (error) {
      console.error("Errore aggiunta turno:", error);
      alert("Errore durante la creazione del turno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '10px' }}>Nuovo Turno ✨</h1>
      <p className="subtitle" style={{ marginBottom: '20px' }}>Assegna un nuovo turno di pulizia in casa</p>
      
      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left' }}>
        
        <div className="input-group">
          <label>Chi farà le pulizie? (separati da virgola)</label>
          <input type="text" name="nomi" value={turno.nomi} onChange={handleChange} required placeholder="es. Mario, Luigi" />
        </div>

        <div className="input-group">
          <label>Data</label>
          <input type="date" name="data" value={turno.data} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Fascia Oraria</label>
          <select 
            name="fasciaOraria" value={turno.fasciaOraria} onChange={handleChange} required
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}
          >
            <option value="">-- Seleziona orario --</option>
            {FASCE_DISPONIBILI.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label>Cosa c'è da pulire? (separati da virgola)</label>
          <input type="text" name="luoghi" value={turno.luoghi} onChange={handleChange} required placeholder="es. Cucina, Bagno" />
        </div>

        <div className="input-group">
          <label>Istruzioni extra (opzionale)</label>
          <textarea
            name="procedura" value={turno.procedura} onChange={handleChange}
            placeholder="es. Buttare l'umido, pulire il forno"
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creazione..." : "Crea Turno"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/turni")}>Annulla</button>
        </div>
      </form>
    </div>
  );
}