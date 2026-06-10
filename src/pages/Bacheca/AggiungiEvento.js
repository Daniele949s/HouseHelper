import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
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
        // Evita offset fuso orario
        const dataString = dataObj.toLocaleDateString('en-CA'); 
        setDataEvento(dataString);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataEvento || !titolo || !contenuto) {
        alert("Compila tutti i campi");
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
          isEvento: true // flag per distinguerlo nel calendario se necessario
      });
      navigate("/calendario");
    } catch(e) { 
        alert("Errore salvataggio evento.");
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '10px' }}>Nuovo Evento 🗓️</h1>
      <p className="subtitle" style={{ marginBottom: '20px' }}>Aggiungi un impegno al calendario della casa</p>

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left' }}>
        
        <div className="input-group">
          <label>Titolo Evento</label>
          <input 
              type="text" 
              value={titolo} 
              onChange={e => setTitolo(e.target.value)} 
              placeholder="Es. Cena coinquilini, Affitto in scadenza"
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
          <label>Dettagli / Orario</label>
          <textarea 
              value={contenuto} 
              onChange={e => setContenuto(e.target.value)} 
              placeholder="Orario, chi partecipa, note varie..."
              required 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '100px', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Salvataggio..." : "Salva Evento"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/calendario')}>Annulla</button>
        </div>
      </form>
    </div>
  );
}