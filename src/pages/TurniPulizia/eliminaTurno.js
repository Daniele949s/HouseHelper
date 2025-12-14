import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/turni";

export default function EliminaTurno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleDelete = async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    const conferma = window.confirm(
      "Sei sicuro di voler eliminare definitivamente questo turno?"
    );

    if (!conferma) return;

    try {
      // DELETE Sicura
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Turno eliminato con successo.");
      navigate("/turni");
    } catch (err) {
      console.error(err);
      alert("Errore durante l'eliminazione: " + (err.response?.data?.message || "Errore server"));
    }
  };

  return (
    <div className="card">
      <h1>Elimina turno</h1>
      <p className="subtitle">Questa operazione è irreversibile.</p>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button 
            style={{ backgroundColor: '#ef4444', color: 'white' }} 
            onClick={handleDelete}
        >
            Conferma Eliminazione
        </button>

        <button className="btn-secondary" onClick={() => navigate(-1)}>
            Annulla
        </button>
      </div>
    </div>
  );
}