import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import '../../App.css';

export default function ViewBacheca() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  
  const [note, setNote] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchDati = async () => {
    if (!userData?.casaId) return;
    setLoading(true);
    try {
      const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
      const snapUtenti = await getDocs(qUtenti);
      const map = {};
      snapUtenti.forEach(d => { map[d.id] = d.data().username || "Sconosciuto"; });
      setUtentiMap(map);

      const qNote = query(collection(db, "note"), where("casaId", "==", userData.casaId));
      const snapNote = await getDocs(qNote);
      const data = snapNote.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      data.sort((a, b) => new Date(b.createdAt?.toMillis() || 0) - new Date(a.createdAt?.toMillis() || 0));
      setNote(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDati();
  }, [userData]);

  const eliminaNota = async (id, autoreId) => {
    if (autoreId !== currentUser.uid) {
      alert("Puoi eliminare solo i tuoi avvisi!");
      return;
    }
    if (!window.confirm("Sicuro di voler eliminare questa nota?")) return;
    
    try {
      await deleteDoc(doc(db, "note", id));
      fetchDati();
    } catch (error) {
      alert("Errore eliminazione.");
    }
  };

  if (loading) return <div className="card"><p>Caricamento bacheca...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '800px', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0 }}>Bacheca 📌</h1>
        <button className="btn-primary" onClick={() => navigate("/bacheca/aggiungi")} style={{ width: 'auto' }}>
          + Nuovo Avviso
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {note.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--color-secondary)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5 }}>📝</span>
            <p className="subtitle" style={{ marginTop: '10px' }}>Non ci sono comunicazioni.</p>
          </div>
        ) : (
          note.map((n) => {
            const isMia = n.autoreId === currentUser.uid;
            return (
              <div key={n.id} className="widget-card" style={{ textAlign: 'left', borderLeft: isMia ? '4px solid var(--color-primary)' : '4px solid #94a3b8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>{n.titolo}</h3>
                    <p style={{ margin: '5px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>{n.contenuto}</p>
                    {n.data && (
                       <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold' }}>
                         Scadenza / Evento: {new Date(n.data).toLocaleDateString()}
                       </p>
                    )}
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Scritto da: <strong>{utentiMap[n.autoreId]}</strong>
                    </p>
                  </div>
                </div>

                {isMia && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button className="btn-secondary" onClick={() => navigate(`/bacheca/modifica/${n.id}`)} style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}>Modifica</button>
                    <button onClick={() => eliminaNota(n.id, n.autoreId)} style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', background: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Elimina</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: '30px' }}>
         ← Torna alla Dashboard
      </button>
    </div>
  );
}