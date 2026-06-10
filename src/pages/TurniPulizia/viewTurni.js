import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import '../../App.css'; 

export default function VisualizzaTurni() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [turni, setTurni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTurni = async () => {
    if (!userData?.casaId) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, "turni"), where("casaId", "==", userData.casaId));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(a.data) - new Date(b.data));
      setTurni(data);
    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento dei turni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurni();
  }, [userData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo turno?")) return;
    try {
      await deleteDoc(doc(db, "turni", id));
      fetchTurni();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      alert("Errore nell'eliminazione del turno.");
    }
  };

  if (loading) return <div className="card"><p>Caricamento turni...</p></div>;
  if (error) return <div className="card"><p className="error-alert">{error}</p></div>;

  return (
    <div className="card" style={{ maxWidth: '800px', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0 }}>Turni Pulizia 🧹</h1>
        <button
          className="btn-primary"
          onClick={() => navigate("/turni/aggiungi")}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          + Nuovo Turno
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {turni.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--color-secondary)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5 }}>🤷‍♂️</span>
            <p className="subtitle" style={{ marginTop: '10px' }}>Nessun turno programmato.</p>
          </div>
        ) : (
          turni.map((turno) => (
            <div key={turno.id} className="widget-card" style={{ textAlign: 'left', borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>
                      {new Date(turno.data).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <p style={{ margin: '4px 0' }}><strong>Chi:</strong> {Array.isArray(turno.nomi) ? turno.nomi.join(", ") : turno.nomi}</p>
                    <p style={{ margin: '4px 0' }}><strong>Dove:</strong> {Array.isArray(turno.luoghi) ? turno.luoghi.join(", ") : turno.luoghi}</p>
                    <p style={{ margin: '4px 0' }}><strong>Orario:</strong> {Array.isArray(turno.fasciaOraria) ? turno.fasciaOraria[0] : turno.fasciaOraria}</p>
                    {turno.procedura && <p style={{ margin: '4px 0' }}><strong>Procedura:</strong> {Array.isArray(turno.procedura) ? turno.procedura.join(", ") : turno.procedura}</p>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/turni/modifica/${turno.id}`)}
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(turno.id)}
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem', background: 'white', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                >
                  Elimina
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <button className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: '30px' }}>
         ← Torna alla Dashboard
      </button>
    </div>
  );
}