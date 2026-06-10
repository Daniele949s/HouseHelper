import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import '../../App.css'; 

export default function ViewDebiti() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  
  const [debiti, setDebiti] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDati = async () => {
    if (!userData?.casaId) return;
    setLoading(true);
    setError(null);
    try {
      // Carica Mappa Utenti della casa
      const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
      const snapUtenti = await getDocs(qUtenti);
      const map = {};
      snapUtenti.forEach(d => { map[d.id] = d.data().username || "Utente Sconosciuto"; });
      setUtentiMap(map);

      // Carica Debiti
      const qDebiti = query(collection(db, "debiti"), where("casaId", "==", userData.casaId));
      const snapDebiti = await getDocs(qDebiti);
      const data = snapDebiti.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calcolo Saldo Personale
      let totale = 0;
      data.forEach(d => {
        if (d.debitoreId === currentUser.uid) totale -= parseFloat(d.importo);
        if (d.creditoreId === currentUser.uid) totale += parseFloat(d.importo);
      });
      setSaldo(totale);
      
      // Ordina per data
      data.sort((a, b) => new Date(b.createdAt?.toMillis() || 0) - new Date(a.createdAt?.toMillis() || 0));
      setDebiti(data);

    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento delle spese.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDati();
  }, [userData]);

  const saldaDebito = async (id, isMyDebt) => {
    if (!isMyDebt) {
        if (!window.confirm("Sei sicuro di voler eliminare questa spesa?")) return;
    } else {
        if (!window.confirm("Hai saldato questo debito?")) return;
    }

    try {
      await deleteDoc(doc(db, "debiti", id));
      fetchDati();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      alert("Errore nell'eliminazione.");
    }
  };

  if (loading) return <div className="card"><p>Caricamento spese...</p></div>;
  if (error) return <div className="card"><p className="error-alert">{error}</p></div>;

  return (
    <div className="card" style={{ maxWidth: '800px', padding: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0 }}>Spese e Debiti 💰</h1>
        <button
          className="btn-primary"
          onClick={() => navigate("/debiti/aggiungi")}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          + Nuova Spesa
        </button>
      </div>

      {/* Widget Saldo */}
      <div className="widget-card" style={{ marginBottom: '30px', textAlign: 'center', borderTop: saldo >= 0 ? '4px solid #10b981' : '4px solid #ef4444' }}>
          <p style={{ fontWeight: '600', color: 'var(--text-main)', margin: '0 0 10px 0' }}>Il tuo Bilancio Attuale</p>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: saldo >= 0 ? '#10b981' : '#ef4444' }}>
              {saldo > 0 ? "+" : ""}{saldo.toFixed(2)} €
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
              {saldo > 0 ? "Gli altri ti devono dei soldi." : saldo < 0 ? "Sei in debito con gli altri." : "Siete tutti pari!"}
          </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {debiti.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--color-secondary)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5 }}>💸</span>
            <p className="subtitle" style={{ marginTop: '10px' }}>Nessuna spesa registrata in casa.</p>
          </div>
        ) : (
          debiti.map((debito) => {
              const sonoDebitore = debito.debitoreId === currentUser.uid;
              const sonoCreditore = debito.creditoreId === currentUser.uid;
              
              let badgeColor = '#94a3b8';
              let badgeText = "Altra Spesa";
              if (sonoDebitore) { badgeColor = '#ef4444'; badgeText = "Devi dare"; }
              else if (sonoCreditore) { badgeColor = '#10b981'; badgeText = "Devi ricevere"; }

              return (
                <div key={debito.id} className="widget-card" style={{ textAlign: 'left', borderLeft: `4px solid ${badgeColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ background: badgeColor, color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {badgeText}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {debito.createdAt ? new Date(debito.createdAt.toDate()).toLocaleDateString() : ''}
                            </span>
                        </div>
                        
                        <p style={{ margin: '4px 0', fontSize: '1.1rem', fontWeight: '600' }}>{debito.descrizione}</p>
                        
                        <div style={{ marginTop: '10px', fontSize: '0.95rem' }}>
                            <p style={{ margin: '2px 0' }}>Da: <strong>{utentiMap[debito.debitoreId]}</strong></p>
                            <p style={{ margin: '2px 0' }}>A: <strong>{utentiMap[debito.creditoreId]}</strong></p>
                        </div>
                    </div>
                    
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: badgeColor }}>
                        {parseFloat(debito.importo).toFixed(2)}€
                    </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                    {sonoDebitore || sonoCreditore ? (
                    <button
                        onClick={() => saldaDebito(debito.id, sonoDebitore)}
                        style={{ width: '100%', padding: '10px 16px', fontSize: '0.95rem', background: badgeColor, color: 'white' }}
                    >
                        ✓ Segna come saldato
                    </button>
                    ) : (
                    <button
                        onClick={() => saldaDebito(debito.id, false)}
                        className="btn-secondary"
                        style={{ width: '100%', padding: '10px 16px', fontSize: '0.95rem' }}
                    >
                        🗑️ Elimina Record
                    </button>
                    )}
                </div>
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