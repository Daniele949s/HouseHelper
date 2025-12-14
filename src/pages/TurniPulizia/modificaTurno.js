import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/turni";

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

export default function ModificaTurno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper Auth
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchTurno = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }

      try {
        const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
        const t = response.data;

        const dataFormattata = new Date(t.data).toISOString().split('T')[0];

        // Decodifichiamo i JSON
        const parseJSON = (str) => {
            try { return JSON.parse(str); } catch { return []; }
        }

        setTurno({
          nomi: parseJSON(t.nomi).join(", "),
          data: dataFormattata, 
          luoghi: parseJSON(t.luoghi).join(", "),
          procedura: parseJSON(t.procedura).join(", "),
          fasciaOraria: parseJSON(t.fasciaOraria)[0] || "" 
        });
      } catch (err) {
        console.error(err);
        setError("Errore nel caricamento del turno.");
      } finally {
        setLoading(false);
      }
    };

    fetchTurno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTurno(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const turnoAggiornato = {
      nomi: JSON.stringify(turno.nomi.split(",").map(n => n.trim()).filter(Boolean)),
      data: new Date(turno.data),
      luoghi: JSON.stringify(turno.luoghi.split(",").map(l => l.trim()).filter(Boolean)),
      procedura: JSON.stringify(turno.procedura.split(",").map(p => p.trim()).filter(Boolean)),
      fasciaOraria: JSON.stringify([turno.fasciaOraria])
    };

    try {
      await axios.put(`${API_URL}/${id}`, turnoAggiornato, getAuthHeader());
      alert("Turno aggiornato correttamente.");
      navigate("/turni");
    } catch (err) {
      console.error(err);
      alert("Errore durante l'aggiornamento del turno.");
    }
  };

  if (loading) return <div className="card"><p>Caricamento...</p></div>;
  if (error) return <div className="card"><p style={{color:'red'}}>{error}</p></div>;

  return (
    <div className="card">
      <h1>Modifica turno</h1>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        
        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Operatori:</label>
        <input
          type="text"
          name="nomi"
          value={turno.nomi}
          onChange={handleChange}
          required
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
          <option value="">-- Seleziona --</option>
          {FASCE_DISPONIBILI.map((fascia) => (
            <option key={fascia} value={fascia}>
              {fascia}
            </option>
          ))}
        </select>

        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Luoghi:</label>
        <input
          type="text"
          name="luoghi"
          value={turno.luoghi}
          onChange={handleChange}
          required
        />

        <label style={{display: 'block', textAlign:'left', marginTop:'10px'}}>Procedura:</label>
        <textarea
          name="procedura"
          value={turno.procedura}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="submit">
            Salva Modifiche
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/turni")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}