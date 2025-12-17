import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../App.css';

export default function ViewBacheca() {
  const navigate = useNavigate();
  const [note, setNote] = useState([]);
  const [loading, setLoading] = useState(true);
  const myUsername = localStorage.getItem("username"); 

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Definiamo la funzione PRIMA di usarla in useEffect
  const fetchNote = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/bacheca", getAuthHeader());
      
      // FILTRO: In Bacheca mostriamo solo le note SENZA data (i post-it)
      // Gli eventi con data andranno nel Calendario
      const soloAvvisi = res.data.filter(n => !n.data);
      
      setNote(soloAvvisi);
    } catch (err) {
      console.error(err);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eliminaNota = async (id) => {
    if(!window.confirm("Vuoi davvero eliminare questa nota?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/bacheca/${id}`, getAuthHeader());
      fetchNote(); // Ricarica la lista
    } catch(e) { 
      alert("Errore: " + (e.response?.data?.message || "Impossibile eliminare")); 
    }
  };

  if (loading) return <div className="card"><p style={{color: 'black'}}>Caricamento...</p></div>;

  return (
    <div className="card" style={{maxWidth: '800px', color: 'black'}}>
      
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h1 style={{color: '#000'}}>📌 Bacheca</h1>
        <button onClick={() => navigate('/bacheca/aggiungi')} style={{width:'auto'}}>+ Nuova Nota</button>
      </div>

      {note.length === 0 ? <p style={{color: '#666'}}>Nessun avviso in bacheca.</p> : (
        <div style={{display:'grid', gap:'15px'}}>
          {note.map(n => {
            const sonoAutore = n.Autore.username === myUsername;
            
            return (
              <div key={n.id} style={{
                background: '#fff', 
                padding: '20px', 
                borderRadius: '8px',
                borderLeft: sonoAutore ? "5px solid #8b5cf6" : "5px solid #ccc", // Viola se mia
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                textAlign: 'left'
              }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                        <h3 style={{margin:'0 0 5px 0', color: '#000', fontSize:'1.3rem'}}>
                            {n.titolo}
                        </h3>
                        <p style={{fontSize:'0.8rem', color:'#666', margin:0}}>
                            Scritto da <strong>{n.Autore.username}</strong>
                        </p>
                    </div>
                    
                    {/* Bottoni visibili solo se sono l'autore */}
                    {sonoAutore && (
                        <div style={{display:'flex', gap:'5px'}}>
                            <button 
                                onClick={() => navigate(`/bacheca/modifica/${n.id}`)}
                                style={{padding:'5px 10px', fontSize:'0.8rem'}}
                                className="btn-secondary"
                            >
                                ✏️
                            </button>
                            <button 
                                onClick={() => eliminaNota(n.id)}
                                style={{padding:'5px 10px', fontSize:'0.8rem', background:'#ef4444', color:'white', border:'none'}}
                            >
                                🗑️
                            </button>
                        </div>
                    )}
                </div>

                <hr style={{margin:'10px 0', border:'0', borderTop:'1px solid #eee'}}/>
                
                <p style={{color:'#333', whiteSpace: 'pre-wrap', lineHeight:'1.5'}}>
                    {n.contenuto}
                </p>
              </div>
            )
          })}
        </div>
      )}
      
      <button className="btn-secondary" onClick={() => navigate('/home')} style={{marginTop:'20px'}}>Indietro</button>
    </div>
  );
}