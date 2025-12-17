import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../../App.css';
import API_BASE_URL from "../../config";

const API_URL = `${API_BASE_URL}/turni`;

// Funzione helper per generare gli orari
const generaFasceOrarie = () => {
  const orari = [];
  for (let i = 7; i < 23; i++) {
    const start = i.toString().padStart(2, '0') + ":00";
    const end = (i + 1).toString().padStart(2, '0') + ":00";
    orari.push(`${start} - ${end}`);
  }
  return orari;
};
const FASCE_DISPONIBILI = generaFasceOrarie();

export default function AggiuntaTurno() {
  const navigate = useNavigate();

  const [turno, setTurno] = useState({
    nomi: "",
    data: "",
    luoghi: "",
    procedura: "",
    fasciaOraria: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTurno((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
        navigate("/login");
        return;
    }

    // --- CORREZIONE QUI ---
    // Non usiamo JSON.stringify! Inviamo array JavaScript puri.
    // Axios li trasformerà in JSON automaticamente e Sequelize li leggerà correttamente.
    const turnoDaInviare = {
      nomi: turno.nomi.split(",").map(n => n.trim()).filter(Boolean),
      data: new Date(turno.data),
      luoghi: turno.luoghi.split(",").map(l => l.trim()).filter(Boolean),
      procedura: turno.procedura.split(",").map(p => p.trim()).filter(Boolean),
      fasciaOraria: [turno.fasciaOraria] // Array con una stringa dentro
      // Niente CasaId, ci pensa il backend
    };

    try {
      await axios.post(API_URL, turnoDaInviare, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Turno creato con successo!");
      navigate("/turni");
    } catch (error) {
      console.error("Errore aggiunta turno:", error);
      
      // Gestione specifica dell'errore
      const errorMsg = error.response?.data?.message || "Errore sconosciuto";
      
      if (errorMsg === "Nessuna casa associata.") {
          alert("ERRORE: Non fai parte di nessuna casa! Vai in 'Scelta Casa' per unirti a una.");
          navigate("/scelta-casa");
      } else {
          alert("Errore: " + errorMsg);
      }
    }
  };

  return (
    <div className="card">
      <h1>Aggiungi nuovo turno</h1>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        
        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Operatori (es: Mario, Luigi):</label>
        <input
          type="text"
          name="nomi"
          value={turno.nomi}
          onChange={handleChange}
          required
          placeholder="Mario, Luigi"
        />

        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Data:</label>
        <input
          type="date"
          name="data"
          value={turno.data}
          onChange={handleChange}
          required
        />

        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Fascia Oraria:</label>
        <select 
          name="fasciaOraria" 
          value={turno.fasciaOraria} 
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc', background: 'white' }}
        >
          <option value="">-- Seleziona orario --</option>
          {FASCE_DISPONIBILI.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Luoghi (es: Cucina, Salotto):</label>
        <input
          type="text"
          name="luoghi"
          value={turno.luoghi}
          onChange={handleChange}
          required
          placeholder="Cucina, Bagno"
        />

        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Procedura:</label>
        <textarea
          name="procedura"
          value={turno.procedura}
          onChange={handleChange}
          required
          placeholder="Descrivi cosa fare..."
          style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit">Crea Turno</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/turni")}>Annulla</button>
        </div>
      </form>
    </div>
  );
}