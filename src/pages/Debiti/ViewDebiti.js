import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../App.css';
import API_BASE_URL from "../../config";


export default function ViewDebiti() {
  const navigate = useNavigate();
  const [debiti, setDebiti] = useState([]);
  const [loading, setLoading] = useState(true);
  const myUsername = localStorage.getItem("username"); // Per evidenziare i miei debiti

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // 1. Definiamo la funzione PRIMA di usarla
  const fetchDebiti = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/debiti`, getAuthHeader());
      setDebiti(res.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  // 2. Usiamo useEffect DOPO aver definito la funzione
  useEffect(() => {
    fetchDebiti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saldaDebito = async (id) => {
    if(!window.confirm("Confermi che questo debito è stato saldato?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/debiti/${id}`, getAuthHeader());
      fetchDebiti(); // Ricarica la lista
    } catch(e) { alert("Errore"); }
  };

  if (loading) return <div className="card"><p style={{color: 'black'}}>Caricamento...</p></div>;

  return (
    <div className="card" style={{maxWidth: '800px', color: 'black'}}>
      
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h1 style={{color: '#000'}}>💸 Gestione Spese</h1>
        <button onClick={() => navigate('/debiti/aggiungi')} style={{width:'auto'}}>+ Aggiungi</button>
      </div>

      {debiti.length === 0 ? <p style={{color: '#666'}}>Nessun debito registrato.</p> : (
        <div style={{display:'grid', gap:'10px'}}>
          {debiti.map(d => {
            // Capiamo se sono io il creditore o il debitore per colorare il bordo
            const sonoCreditore = d.Creditore.username === myUsername;
            const sonoDebitore = d.Debitore.username === myUsername;
            
            let stileBordo = "4px solid #ccc"; // Neutro
            if (sonoCreditore) stileBordo = "4px solid #22c55e"; // Verde (Mi devono soldi)
            if (sonoDebitore) stileBordo = "4px solid #ef4444"; // Rosso (Devo soldi)

            return (
              <div key={d.id} style={{
                background: '#f8fafc', // Sfondo grigio chiarissimo
                padding: '15px', 
                borderRadius: '8px',
                borderLeft: stileBordo, 
                textAlign: 'left', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div>
                  {/* Descrizione e Importo in NERO */}
                  <h3 style={{margin:0, color: '#000'}}>
                    {d.descrizione} - <span style={{fontSize:'1.2rem', fontWeight:'bold'}}>{d.importo}€</span>
                  </h3>
                  
                  {/* Data in Grigio Scuro */}
                  <p style={{margin:'5px 0', color: '#64748b', fontSize: '0.9rem'}}>
                    Data: {d.data}
                  </p>
                  
                  {/* Chi deve a chi in Grigio quasi Nero */}
                  <p style={{margin:0, color: '#333'}}>
                    <strong style={{color: '#000'}}>{d.Debitore.username}</strong> deve a <strong style={{color: '#000'}}>{d.Creditore.username}</strong>
                  </p>
                </div>

                <button 
                  onClick={() => saldaDebito(d.id)} 
                  style={{
                      width:'auto', 
                      padding: '8px 12px', 
                      fontSize:'0.8rem', 
                      background:'white', 
                      color:'#333', // Testo bottone scuro
                      border:'1px solid #ccc',
                      cursor: 'pointer',
                      borderRadius: '6px'
                  }}
                >
                  Segna Saldato ✅
                </button>
              </div>
            )
          })}
        </div>
      )}
      
      <button className="btn-secondary" onClick={() => navigate('/home')} style={{marginTop:'20px'}}>Indietro</button>
    </div>
  );
}