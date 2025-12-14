import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../../App.css';

export default function AggiungiDebito() {
  const navigate = useNavigate();
  const [utenti, setUtenti] = useState([]);
  
  // Form
  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); // Oggi
  const [debitoreId, setDebitoreId] = useState("");
  const [creditoreId, setCreditoreId] = useState("");

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    // Carica lista coinquilini
    axios.get("http://localhost:5000/api/utenti/casa", getAuthHeader())
      .then(res => setUtenti(res.data))
      .catch(e => console.error(e));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!debitoreId || !creditoreId || !importo || !descrizione) {
        alert("Compila tutto!"); return;
    }
    
    if (debitoreId === creditoreId) {
        alert("Non puoi avere un debito con te stesso!"); return;
    }

    try {
      await axios.post("http://localhost:5000/api/debiti", {
        descrizione, importo, data, debitoreId, creditoreId
      }, getAuthHeader());
      
      alert("Salvato!");
      navigate("/debiti");
    } catch(e) { alert("Errore salvataggio"); }
  };

  return (
    <div className="card">
      <h1>Nuova Spesa / Debito</h1>
      <form onSubmit={handleSubmit} style={{maxWidth:'500px', margin:'0 auto', textAlign:'left'}}>
        
        <label>Descrizione (es. Bolletta Luce)</label>
        <input type="text" value={descrizione} onChange={e => setDescrizione(e.target.value)} required />

        <label>Importo (€)</label>
        <input type="number" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} required />

        <label>Data</label>
        <input type="date" value={data} onChange={e => setData(e.target.value)} required />

        <div style={{background:'#f0f9ff', padding:'15px', borderRadius:'8px', margin:'15px 0', border:'1px solid #bae6fd'}}>
            <label style={{color:'#0369a1'}}>Chi HA pagato? (Creditore)</label>
            <select value={creditoreId} onChange={e => setCreditoreId(e.target.value)} required style={{background:'white', width:'100%', padding:'10px', borderRadius:'5px', border:'1px solid #ccc'}}>
                <option value="">-- Seleziona --</option>
                {utenti.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>

            <div style={{textAlign:'center', margin:'10px 0', fontWeight:'bold'}}>⬇️ AVANZA SOLDI DA ⬇️</div>

            <label style={{color:'#be123c'}}>Chi DEVE pagare? (Debitore)</label>
            <select value={debitoreId} onChange={e => setDebitoreId(e.target.value)} required style={{background:'white', width:'100%', padding:'10px', borderRadius:'5px', border:'1px solid #ccc'}}>
                <option value="">-- Seleziona --</option>
                {utenti.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
        </div>

        <button type="submit">Salva</button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/debiti')} style={{marginTop:'10px'}}>Annulla</button>
      </form>
    </div>
  );
}