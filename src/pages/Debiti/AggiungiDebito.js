import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../../App.css';

export default function AggiungiDebito() {
  const navigate = useNavigate();
  const [utenti, setUtenti] = useState([]);
  
  // Form States
  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); 
  
  const [creditoreId, setCreditoreId] = useState(""); // Chi ha pagato
  const [debitoreId, setDebitoreId] = useState("");   // Chi deve ridare (se singolo)
  
  // NUOVO STATO: Checkbox Split
  const [dividiConTutti, setDividiConTutti] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    // Carica lista coinquilini
    axios.get("http://localhost:5000/api/utenti/casa", getAuthHeader())
      .then(res => {
          setUtenti(res.data);
          // Opzionale: Pre-imposta me stesso come "Chi ha pagato"
          const myUsername = localStorage.getItem("username");
          const me = res.data.find(u => u.username === myUsername);
          if (me) setCreditoreId(me.id);
      })
      .catch(e => console.error(e));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validazione base
    if (!creditoreId || !importo || !descrizione) {
        alert("Compila descrizione, importo e chi ha pagato!"); return;
    }
    
    // Se NON dividiamo, serve obbligatoriamente il debitore singolo
    if (!dividiConTutti && !debitoreId) {
        alert("Seleziona chi deve pagare il debito."); return;
    }

    try {
      await axios.post("http://localhost:5000/api/debiti", {
        descrizione, 
        importo, 
        data, 
        creditoreId,
        debitoreId: dividiConTutti ? null : debitoreId, // Se dividiamo, questo è null
        dividiConTutti // Inviamo il flag al server
      }, getAuthHeader());
      
      navigate("/debiti");
    } catch(e) { 
        console.error(e);
        alert("Errore salvataggio: " + (e.response?.data?.message || "Errore server")); 
    }
  };

  return (
    <div className="card">
      <h1>💰 Nuova Spesa</h1>
      <form onSubmit={handleSubmit} style={{maxWidth:'500px', margin:'0 auto', textAlign:'left'}}>
        
        <label>Cosa hai comprato? (Descrizione)</label>
        <input 
            type="text" 
            value={descrizione} 
            onChange={e => setDescrizione(e.target.value)} 
            placeholder="Es. Spesa Conad, Bolletta..."
            required 
        />

        <label>Importo Totale (€)</label>
        <input 
            type="number" 
            step="0.01" 
            value={importo} 
            onChange={e => setImporto(e.target.value)} 
            placeholder="Es. 45.50"
            required 
        />

        <label>Data</label>
        <input type="date" value={data} onChange={e => setData(e.target.value)} required />

        {/* BOX CHI HA PAGATO */}
        <div style={{background:'#f0f9ff', padding:'15px', borderRadius:'8px', margin:'15px 0', border:'1px solid #bae6fd'}}>
            <label style={{color:'#0369a1', fontWeight:'bold'}}>Chi ha cacciato i soldi? (Creditore)</label>
            <select 
                value={creditoreId} 
                onChange={e => setCreditoreId(e.target.value)} 
                required 
                style={{background:'white', width:'100%', padding:'10px', borderRadius:'5px', border:'1px solid #ccc', marginTop:'5px'}}
            >
                <option value="">-- Seleziona --</option>
                {utenti.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
        </div>

        {/* CHECKBOX SPLIT */}
        <div style={{margin: '15px 0', padding: '10px', border: '1px dashed #ccc', borderRadius: '8px', background: '#fffbeb'}}>
            <label style={{display:'flex', alignItems:'center', cursor:'pointer', fontWeight:'bold', color:'#b45309'}}>
                <input 
                    type="checkbox" 
                    checked={dividiConTutti} 
                    onChange={e => setDividiConTutti(e.target.checked)}
                    style={{width: '20px', height: '20px', marginRight: '10px'}}
                />
                Dividi la spesa con tutta la casa
            </label>
            <p style={{fontSize:'0.8rem', color:'#666', margin:'5px 0 0 30px'}}>
                L'importo verrà diviso in parti uguali tra tutti i coinquilini.
            </p>
        </div>

        {/* SELETTORE DEBITORE (Visibile solo se NON si divide con tutti) */}
        {!dividiConTutti && (
            <div style={{background:'#fff1f2', padding:'15px', borderRadius:'8px', margin:'15px 0', border:'1px solid #fecdd3'}}>
                <div style={{textAlign:'center', marginBottom:'10px', fontWeight:'bold', color:'#be123c'}}>⬇️ AVANZA SOLDI DA ⬇️</div>
                
                <label style={{color:'#be123c', fontWeight:'bold'}}>Chi DEVE ridarli? (Debitore)</label>
                <select 
                    value={debitoreId} 
                    onChange={e => setDebitoreId(e.target.value)} 
                    required={!dividiConTutti}
                    style={{background:'white', width:'100%', padding:'10px', borderRadius:'5px', border:'1px solid #ccc', marginTop:'5px'}}
                >
                    <option value="">-- Seleziona --</option>
                    {utenti.map(u => (
                        // Non mostrare chi ha pagato nella lista dei debitori (opzionale, ma pulito)
                        u.id !== parseInt(creditoreId) && 
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                </select>
            </div>
        )}

        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
            <button type="submit">Salva Spesa</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/debiti')}>Annulla</button>
        </div>
      </form>
    </div>
  );
}