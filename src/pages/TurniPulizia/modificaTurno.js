import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

  if (loading) return <div className="card"><p>Caricamento...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '10px' }}>Modifica Turno ✏️</h1>
      
      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left', marginTop: '20px' }}>
        
        <div className="input-group">
          <label>Operatori</label>
          <input type="text" name="nomi" value={turno.nomi} onChange={handleChange} required />
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
          <label>Luoghi</label>
          <input type="text" name="luoghi" value={turno.luoghi} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Istruzioni</label>
          <textarea
            name="procedura" value={turno.procedura} onChange={handleChange}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvataggio..." : "Salva Modifiche"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/turni")}>Annulla</button>
        </div>
      </form>
    </div>
  );
}