import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

export default function ModificaTurno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [turno, setTurno] = useState({
    nomi: "",
    data: "",
    luoghi: "",
    procedura: "",
    fasciaOraria: ""
  });

  useEffect(() => {
    const fetchTurno = async () => {
      try {
        const turnoDoc = await getDoc(doc(db, "turni", id));
        if (turnoDoc.exists()) {
          const data = turnoDoc.data();
          setTurno({
            nomi: Array.isArray(data.nomi) ? data.nomi.join(", ") : data.nomi,
            data: data.data,
            luoghi: Array.isArray(data.luoghi) ? data.luoghi.join(", ") : data.luoghi,
            procedura: Array.isArray(data.procedura) ? data.procedura.join(", ") : data.procedura,
            fasciaOraria: Array.isArray(data.fasciaOraria) ? data.fasciaOraria[0] : data.fasciaOraria
          });
        } else {
          alert("Turno non trovato");
          navigate("/turni");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchTurno();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTurno((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const turnoAggiornato = {
      nomi: turno.nomi.split(",").map(n => n.trim()).filter(Boolean),
      data: turno.data,
      luoghi: turno.luoghi.split(",").map(l => l.trim()).filter(Boolean),
      procedura: turno.procedura.split(",").map(p => p.trim()).filter(Boolean),
      fasciaOraria: [turno.fasciaOraria],
      mansione: turno.luoghi
    };

    try {
      await updateDoc(doc(db, "turni", id), turnoAggiornato);
      navigate("/turni");
    } catch (error) {
      console.error("Errore aggiornamento:", error);
      alert("Errore durante l'aggiornamento.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '600px' }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: '10px' }}>Caricamento turno...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '620px' }}>
      <h1 style={{ marginBottom: '6px' }}>Modifica Turno ✏️</h1>
      <p className="subtitle" style={{ marginBottom: '24px' }}>Aggiorna data, luogo o assegnatari del turno</p>

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left' }}>
        <div className="input-group">
          <label>Operatori (separati da virgola)</label>
          <input type="text" name="nomi" value={turno.nomi} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Data</label>
          <input type="date" name="data" value={turno.data} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Fascia Oraria</label>
          <select name="fasciaOraria" value={turno.fasciaOraria} onChange={handleChange} required>
            <option value="">-- Seleziona orario --</option>
            {FASCE_DISPONIBILI.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label>Luoghi da pulire</label>
          <input type="text" name="luoghi" value={turno.luoghi} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Istruzioni e Note</label>
          <textarea
            name="procedura"
            value={turno.procedura}
            onChange={handleChange}
            style={{ minHeight: '80px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
