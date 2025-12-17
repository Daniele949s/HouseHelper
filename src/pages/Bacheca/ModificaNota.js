import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../../config";


export default function ModificaNota() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [loading, setLoading] = useState(true);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Carichiamo i dati della nota da modificare
  useEffect(() => {
    // Nota: dobbiamo recuperare la singola nota. 
    // Poiché non abbiamo fatto una rotta specifica GET /bacheca/:id nel backend per semplicità,
    // scarichiamo tutte e filtriamo (metodo pigro ma efficace per app piccole), 
    // OPPURE aggiungi la rotta GET /bacheca/:id nel routes.js.
    // Usiamo il metodo "scarica tutto" per ora per non farti modificare troppo il backend.
    
    const fetchNota = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/bacheca`, getAuthHeader());
            const notaTrovata = res.data.find(n => n.id === parseInt(id));
            if (notaTrovata) {
                setTitolo(notaTrovata.titolo);
                setContenuto(notaTrovata.contenuto);
            } else {
                alert("Nota non trovata");
                navigate("/bacheca");
            }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };
    fetchNota();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/bacheca/${id}`, 
        { titolo, contenuto }, 
        getAuthHeader()
      );
      navigate("/bacheca");
    } catch(e) { alert("Errore modifica"); }
  };

  if (loading) return <div className="card"><p style={{color:'black'}}>Caricamento...</p></div>;

  return (
    <div className="card">
      <h1>Modifica Nota ✏️</h1>
      <form onSubmit={handleSubmit} style={{maxWidth:'500px', margin:'0 auto', textAlign:'left'}}>
        <label>Titolo</label>
        <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)} required />

        <label>Contenuto</label>
        <textarea 
            value={contenuto} 
            onChange={e => setContenuto(e.target.value)} 
            rows="5"
            required 
            style={{width:'100%', padding:'10px', marginBottom:'1rem', borderRadius:'8px', border:'1px solid #ccc'}}
        />

        <button type="submit">Salva Modifiche</button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/bacheca')} style={{marginTop:'10px'}}>Annulla</button>
      </form>
    </div>
  );
}