import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import '../../App.css';

export default function ViewSpesa() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpesa = async () => {
      if (!userData?.casaId) return;
      setLoading(true);
      try {
        const q = query(collection(db, "spesa"), where("casaId", "==", userData.casaId));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by status (unchecked first) then by creation date
        data.sort((a, b) => {
          if (a.comprato === b.comprato) {
            return b.createdAt?.toMillis() - a.createdAt?.toMillis();
          }
          return a.comprato ? 1 : -1;
        });
        setItems(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpesa();
  }, [userData]);

  const fetchSpesaReload = async () => {
    if (!userData?.casaId) return;
    try {
      const q = query(collection(db, "spesa"), where("casaId", "==", userData.casaId));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        if (a.comprato === b.comprato) {
          return b.createdAt?.toMillis() - a.createdAt?.toMillis();
        }
        return a.comprato ? 1 : -1;
      });
      setItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      await addDoc(collection(db, "spesa"), {
        nome: newItem.trim(),
        comprato: false,
        casaId: userData.casaId,
        autoreId: currentUser.uid,
        createdAt: new Date()
      });
      setNewItem("");
      fetchSpesaReload();
    } catch (error) {
      console.error("Errore aggiunta spesa:", error);
    }
  };

  const toggleCheck = async (id, statoAttuale) => {
    try {
      await updateDoc(doc(db, "spesa", id), {
        comprato: !statoAttuale
      });
      fetchSpesaReload();
    } catch (error) {
      console.error("Errore toggle:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "spesa", id));
      fetchSpesaReload();
    } catch (error) {
      console.error("Errore eliminazione:", error);
    }
  };

  if (loading) return <div className="card"><p>Caricamento lista...</p></div>;

  const comprati = items.filter(i => i.comprato).length;
  const daComprare = items.length - comprati;

  return (
    <div className="card" style={{ maxWidth: '800px', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0 }}>Lista della Spesa 🛒</h1>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <div style={{ flex: 1, background: '#e0f2fe', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#0369a1' }}>{daComprare}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#0284c7' }}>Da comprare</p>
        </div>
        <div style={{ flex: 1, background: '#dcfce7', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#15803d' }}>{comprati}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#16a34a' }}>Presi</p>
        </div>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input 
            type="text" 
            value={newItem} 
            onChange={(e) => setNewItem(e.target.value)} 
            placeholder="Aggiungi prodotto..." 
            style={{ flex: 1, padding: '12px 16px', borderRadius: '50px', border: '1px solid #e2e8f0', background: 'white' }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '0 20px', borderRadius: '50px' }}>
            Aggiungi
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--color-secondary)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5 }}>🍎</span>
            <p className="subtitle" style={{ marginTop: '10px' }}>Nessun prodotto in lista.</p>
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.id} 
              className="widget-card" 
              style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '15px 20px', 
                  opacity: item.comprato ? 0.6 : 1,
                  background: item.comprato ? '#f8fafc' : 'white',
                  borderLeft: item.comprato ? '4px solid #94a3b8' : '4px solid #3b82f6'
              }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <input 
                        type="checkbox" 
                        checked={item.comprato}
                        onChange={() => toggleCheck(item.id, item.comprato)}
                        style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <span style={{ fontSize: '1.1rem', textDecoration: item.comprato ? 'line-through' : 'none', fontWeight: item.comprato ? 'normal' : '600' }}>
                        {item.nome}
                    </span>
                </div>
                
                <button 
                    onClick={() => handleDelete(item.id)}
                    style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#ef4444' }}
                >
                    🗑️
                </button>
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
