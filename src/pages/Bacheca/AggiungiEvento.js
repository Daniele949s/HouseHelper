import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerConfetti } from "../../components/Celebration";
import '../../App.css';

export default function AggiungiEvento() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, currentUser } = useAuth();

  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.dataPreimpostata) {
      const dataObj = new Date(location.state.dataPreimpostata);
      const dataString = dataObj.toLocaleDateString('en-CA');
      setDataEvento(dataString);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataEvento || !titolo || !contenuto) {
      alert("Compila tutti i campi obbligatori.");
      return;
    }
    setLoading(true);

    try {
      await addDoc(collection(db, "note"), {
        titolo,
        contenuto,
        data: dataEvento,
        autoreId: currentUser.uid,
        casaId: userData.casaId,
        createdAt: new Date(),
        isEvento: true
      });
      triggerConfetti();
      navigate("/calendario");
    } catch(e) {
      alert("Errore durante il salvataggio dell'evento.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '620px' }}>
      <h1 style={{ marginBottom: '6px' }}>Nuovo Evento Calendario 🗓️</h1>
      <p className="subtitle" style={{ marginBottom: '24px' }}>Aggiungi una data o un impegno per tutti gli abitanti</p>

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left' }}>
        <div className="input-group">
          <label>Titolo Evento</label>
          <input
            type="text"
            value={titolo}
            onChange={e => setTitolo(e.target.value)}
            placeholder="es. Cena di Casa, Affitto in scadenza, Manutenzione caldaia"
            required
          />
        </div>

        <div className="input-group">
          <label style={{ color: 'var(--color-primary)' }}>Data (Obbligatoria)</label>
          <input
            type="date"
            value={dataEvento}
            onChange={e => setDataEvento(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Dettagli / Note / Orario</label>
          <textarea
            value={contenuto}
            onChange={e => setContenuto(e.target.value)}
            placeholder="Orario preciso, note organizzative, chi partecipa..."
            required
            style={{ minHeight: '100px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Salva Evento"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/calendario')}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
