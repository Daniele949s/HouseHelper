import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../../App.css';
import API_BASE_URL from "../../config";


export default function AggiungiNota() {
  const navigate = useNavigate();
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Payload SEMPLICE: data è sempre null
    const payload = {
        titolo, 
        contenuto, 
        data: null 
    };

    try {
      await axios.post(`${API_BASE_URL}/bacheca`, payload, {
          headers: { Authorization: `Bearer ${token}` }
      });
      navigate("/bacheca");
    } catch(e) { 
        alert("Errore salvataggio nota.");
        console.error(e);
    }
  };

  return (
    <div className="card">
      <h1>Nuovo Avviso Bacheca 📌</h1>
      <form onSubmit={handleSubmit} style={{maxWidth:'500px', margin:'0 auto', textAlign:'left'}}>
        
        <label>Titolo</label>
        <input 
            type="text" 
            value={titolo} 
            onChange={e => setTitolo(e.target.value)} 
            placeholder="Es. Manca il sale"
            required 
        />

        <label>Messaggio</label>
        <textarea 
            value={contenuto} 
            onChange={e => setContenuto(e.target.value)} 
            placeholder="Scrivi qui..."
            rows="5"
            required 
            style={{width:'100%', padding:'10px', marginBottom:'1rem', borderRadius:'8px', border:'1px solid #ccc'}}
        />

        <div style={{display:'flex', gap:'10px'}}>
            <button type="submit">Pubblica in Bacheca</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/bacheca')}>Annulla</button>
        </div>
      </form>
    </div>
  );
}