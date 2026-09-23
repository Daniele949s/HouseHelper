import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerConfetti } from "../../components/Celebration";
import '../../App.css';

export default function AggiungiNota() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [nota, setNota] = useState({
    titolo: "",
    contenuto: "",
    data: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nota.titolo || !nota.contenuto) {
      alert("Titolo e contenuto sono obbligatori");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "note"), {
        titolo: nota.titolo,
        contenuto: nota.contenuto,
        data: nota.data || null,
        autoreId: currentUser.uid,
        casaId: userData.casaId,
        createdAt: new Date()
      });
      triggerConfetti();
      navigate("/bacheca");
    } catch (error) {
      console.error(error);
      alert("Errore durante il salvataggio della nota");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '620px' }}>
      <h1 style={{ marginBottom: '6px' }}>Nuovo Avviso 📌</h1>
      <p className="subtitle" style={{ marginBottom: '24px' }}>Condividi una comunicazione con tutti i coinquilini</p>

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left' }}>
        <div className="input-group">
          <label>Titolo (es. Finita la carta forno, Ospiti venerdì)</label>
          <input
            type="text"
            value={nota.titolo}
            onChange={e => setNota({...nota, titolo: e.target.value})}
            placeholder="Oggetto dell'avviso"
            required
          />
        </div>

        <div className="input-group">
          <label>Messaggio / Dettagli</label>
          <textarea
            value={nota.contenuto}
            onChange={e => setNota({...nota, contenuto: e.target.value})}
            placeholder="Scrivi qui il messaggio dettagliato..."
            required
            style={{ minHeight: '110px' }}
          />
        </div>

        <div className="input-group">
          <label>Data scadenza o evento (opzionale)</label>
          <input
            type="date"
            value={nota.data}
            onChange={e => setNota({...nota, data: e.target.value})}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
