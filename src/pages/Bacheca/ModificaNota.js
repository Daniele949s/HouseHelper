import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import '../../App.css';

export default function ModificaNota() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nota, setNota] = useState({ titolo: "", contenuto: "", data: "" });

  useEffect(() => {
    const fetchNota = async () => {
      try {
        const docRef = doc(db, "note", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.autoreId !== currentUser.uid) {
            alert("Non sei l'autore di questa nota!");
            navigate("/bacheca");
            return;
          }
          setNota({
            titolo: data.titolo,
            contenuto: data.contenuto,
            data: data.data || ""
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchNota();
  }, [id, currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, "note", id), {
        titolo: nota.titolo,
        contenuto: nota.contenuto,
        data: nota.data || null
      });
      navigate("/bacheca");
    } catch (error) {
      console.error(error);
      alert("Errore aggiornamento.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card"><p>Caricamento...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '10px' }}>Modifica Avviso ✏️</h1>
      
      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left', marginTop: '20px' }}>
        <div className="input-group">
          <label>Titolo</label>
          <input type="text" value={nota.titolo} onChange={e => setNota({...nota, titolo: e.target.value})} required />
        </div>

        <div className="input-group">
          <label>Contenuto</label>
          <textarea
            value={nota.contenuto} onChange={e => setNota({...nota, contenuto: e.target.value})} required
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '100px', fontFamily: 'inherit' }}
          />
        </div>

        <div className="input-group">
          <label>Data (opzionale)</label>
          <input type="date" value={nota.data} onChange={e => setNota({...nota, data: e.target.value})} />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvataggio..." : "Salva Modifiche"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/bacheca")}>Annulla</button>
        </div>
      </form>
    </div>
  );
}