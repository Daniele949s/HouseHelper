import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import '../../App.css'; 
import API_BASE_URL from "../../config";

const API_URL = `${API_BASE_URL}/turni`;

export default function VisualizzaTurni() {
  const navigate = useNavigate();
  const [turni, setTurni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTurni = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setTurni(response.data);
      } catch (err) {
        console.error(err);
        setError("Errore nel caricamento dei turni.");
        
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            localStorage.clear();
            navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTurni();
  }, [navigate]);

  // --- FUNZIONE HELPER PER EVITARE L'ERRORE JSON ---
  const formattaDato = (dato) => {
      if (!dato) return "N/A";
      
      // CASO 1: È già un array (Grazie a Sequelize)
      if (Array.isArray(dato)) {
          return dato.join(", ");
      }

      // CASO 2: È una stringa JSON (Vecchi dati o DB diverso)
      if (typeof dato === 'string') {
          try {
              const parsed = JSON.parse(dato);
              if (Array.isArray(parsed)) return parsed.join(", ");
              return parsed;
          } catch (e) {
              // Se fallisce il parse, è una stringa normale
              return dato;
          }
      }

      return dato.toString();
  };
  // -------------------------------------------------

  if (loading) return <div className="card"><p>Caricamento turni...</p></div>;
  if (error) return <div className="card"><p style={{color: 'red'}}>{error}</p></div>;

  return (
    <div className="card" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Elenco turni</h1>
        <button
          className="btn-aggiungi"
          onClick={() => navigate("/turni/aggiungi")}
          style={{ width: 'auto', padding: '10px 20px', background: 'var(--primary-color)', color: 'white' }}
        >
          + Aggiungi turno
        </button>
      </div>

      <div className="lista-turni">
        {turni.length === 0 ? (
          <p className="subtitle">Nessun turno presente in questa casa.</p>
        ) : (
          turni.map((turno) => (
            <div key={turno.id} className="turno-wrapper" style={{ marginBottom: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
              
              <div style={{ marginBottom: '10px' }}>
                  {/* DATA */}
                  <h3 style={{ margin: '0 0 5px 0', color: '#3b82f6' }}>
                    {new Date(turno.data).toLocaleDateString()}
                  </h3>
                  
                  {/* OPERATORI */}
                  <p style={{ margin: '5px 0' }}>
                      <strong>Chi:</strong> {formattaDato(turno.nomi)}
                  </p>
                  
                  {/* LUOGHI */}
                  <p style={{ margin: '5px 0' }}>
                      <strong>Dove:</strong> {formattaDato(turno.luoghi)}
                  </p>

                  {/* FASCIA ORARIA */}
                  <p style={{ margin: '5px 0' }}>
                      <strong>Orario:</strong> {formattaDato(turno.fasciaOraria)}
                  </p>
              </div>

              <div className="azioni-turno" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/turni/modifica/${turno.id}`)}
                  style={{ fontSize: '0.8rem', padding: '8px 15px', width: 'auto' }}
                >
                  Modifica
                </button>
                <button
                  style={{ fontSize: '0.8rem', padding: '8px 15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', width: 'auto' }}
                  onClick={() => navigate(`/turni/elimina/${turno.id}`)}
                >
                  Elimina
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <button className="btn-secondary" onClick={() => navigate("/home")} style={{ marginTop: '20px' }}>
         Torna alla Home
      </button>
    </div>
  );
}