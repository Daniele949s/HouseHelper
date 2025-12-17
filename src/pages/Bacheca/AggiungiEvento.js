import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import '../../App.css';
import API_BASE_URL from "../../config";


export default function AggiungiEvento() {
  const navigate = useNavigate();
  const location = useLocation(); // Serve per leggere la data passata dal calendario
  
  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [dataEvento, setDataEvento] = useState("");

  useEffect(() => {
    // Se il calendario ci ha passato una data, la usiamo!
    if (location.state && location.state.dataPreimpostata) {
        // Convertiamo la data in formato YYYY-MM-DD per l'input html
        const dataObj = new Date(location.state.dataPreimpostata);
        const dataString = dataObj.toLocaleDateString('en-CA'); // YYYY-MM-DD
        setDataEvento(dataString);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!dataEvento) {
        alert("Per il calendario serve una data!");
        return;
    }

    try {
      await axios.post(`${API_BASE_URL}/bacheca`, {
          titolo, 
          contenuto, 
          data: dataEvento 
      }, {
          headers: { Authorization: `Bearer ${token}` }
      });
      navigate("/calendario");
    } catch(e) { 
        alert("Errore salvataggio evento.");
        console.error(e);
    }
  };

  return (
    <div className="card">
      <h1>Nuovo Evento Calendario 🗓️</h1>
      <form onSubmit={handleSubmit} style={{maxWidth:'500px', margin:'0 auto', textAlign:'left'}}>
        
        <label>Titolo Evento</label>
        <input 
            type="text" 
            value={titolo} 
            onChange={e => setTitolo(e.target.value)} 
            placeholder="Es. Cena coinquilini"
            required 
        />

        <div style={{background:'#f0f9ff', padding:'10px', borderRadius:'8px', marginBottom:'15px', border:'1px solid #bae6fd'}}>
            <label style={{color:'#0369a1', fontWeight:'bold'}}>Data Evento (Obbligatoria)</label>
            <input 
                type="date" 
                value={dataEvento} 
                onChange={e => setDataEvento(e.target.value)} 
                required
                style={{background:'white', width:'100%', padding:'8px', borderRadius:'5px', border:'1px solid #ccc', marginTop:'5px'}}
            />
        </div>

        <label>Dettagli</label>
        <textarea 
            value={contenuto} 
            onChange={e => setContenuto(e.target.value)} 
            placeholder="Orario, note varie..."
            rows="5"
            required 
            style={{width:'100%', padding:'10px', marginBottom:'1rem', borderRadius:'8px', border:'1px solid #ccc'}}
        />

        <div style={{display:'flex', gap:'10px'}}>
            <button type="submit">Salva nel Calendario</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/calendario')}>Annulla</button>
        </div>
      </form>
    </div>
  );
}