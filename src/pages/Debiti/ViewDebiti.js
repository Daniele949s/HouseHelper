import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerConfetti } from "../../components/Celebration";
import '../../App.css';

export default function ViewDebiti() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [debiti, setDebiti] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDati = async () => {
      if (!userData?.casaId) return;
      setLoading(true);
      setError(null);
      try {
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
        const snapUtenti = await getDocs(qUtenti);
        const map = {};
        snapUtenti.forEach(d => { map[d.id] = d.data().username || "Utente Sconosciuto"; });
        setUtentiMap(map);

        const qDebiti = query(collection(db, "debiti"), where("casaId", "==", userData.casaId));
        const snapDebiti = await getDocs(qDebiti);
        const data = snapDebiti.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let totale = 0;
        data.forEach(d => {
          if (d.debitoreId === currentUser.uid) totale -= parseFloat(d.importo);
          if (d.creditoreId === currentUser.uid) totale += parseFloat(d.importo);
        });
        setSaldo(totale);

        data.sort((a, b) => new Date(b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - new Date(a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));
        setDebiti(data);

      } catch (err) {
        console.error(err);
        setError("Errore nel caricamento delle spese.");
      } finally {
        setLoading(false);
      }
    };

    fetchDati();
  }, [userData, currentUser]);

  const fetchDatiReload = async () => {
    if (!userData?.casaId) return;
    try {
      const qDebiti = query(collection(db, "debiti"), where("casaId", "==", userData.casaId));
      const snapDebiti = await getDocs(qDebiti);
      const data = snapDebiti.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let totale = 0;
      data.forEach(d => {
        if (d.debitoreId === currentUser.uid) totale -= parseFloat(d.importo);
        if (d.creditoreId === currentUser.uid) totale += parseFloat(d.importo);
      });
      setSaldo(totale);
      data.sort((a, b) => new Date(b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - new Date(a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));
      setDebiti(data);
    } catch (err) {}
  };

  const saldaDebito = async (id, isMyDebt) => {
    if (!isMyDebt) {
      if (!window.confirm("Sei sicuro di voler eliminare questa spesa?")) return;
    } else {
      if (!window.confirm("Confermi di aver saldato questo importo?")) return;
    }

    try {
      await deleteDoc(doc(db, "debiti", id));
      triggerConfetti();
      fetchDatiReload();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      alert("Errore nell'eliminazione.");
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '800px' }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: '10px' }}>Caricamento spese e debiti...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '820px', padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, textAlign: 'left' }}>Spese & Debiti 💰</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.92rem' }}>
            Conti chiari tra coinquilini
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/debiti/aggiungi")}
          style={{ width: 'auto', padding: '12px 24px' }}
        >
          <i className="fas fa-plus"></i> Nuova Spesa
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* Widget Saldo Netto */}
      <div
        className="widget-card"
        style={{
          marginBottom: '28px',
          textAlign: 'center',
          background: saldo >= 0 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(20, 184, 166, 0.05))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.05))',
          border: saldo >= 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
        }}
      >
        <p style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
          Il tuo Bilancio Netto
        </p>
        <h2 style={{ fontSize: '3rem', margin: '4px 0', color: saldo >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: '800' }}>
          {saldo > 0 ? "+" : ""}{saldo.toFixed(2)} €
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
          {saldo > 0 ? "Ottimo! Gli altri coinquilini ti devono dei soldi." : saldo < 0 ? "Hai debiti pendenti da restituire." : "Nessun debito in sospeso. Perfetta parità!"}
        </p>
      </div>

      <div className="sidemenu-list-container">
        {debiti.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '3rem', opacity: 0.7 }}>💸</span>
            <p className="subtitle" style={{ marginTop: '12px', marginBottom: 0 }}>
              Nessuna spesa registrata in casa. Tutto in ordine!
            </p>
          </div>
        ) : (
          debiti.map((debito) => {
            const sonoDebitore = debito.debitoreId === currentUser.uid;
            const sonoCreditore = debito.creditoreId === currentUser.uid;

            let badgeColor = 'var(--text-muted)';
            let badgeBg = 'rgba(100, 116, 139, 0.15)';
            let badgeText = "Spesa di Casa";
            if (sonoDebitore) {
              badgeColor = 'var(--color-danger)';
              badgeBg = 'rgba(239, 68, 68, 0.15)';
              badgeText = "Devi restituire";
            } else if (sonoCreditore) {
              badgeColor = 'var(--color-success)';
              badgeBg = 'rgba(16, 185, 129, 0.15)';
              badgeText = "Devi ricevere";
            }

            return (
              <div
                key={debito.id}
                className="sidemenu-entry-item"
                style={{ cursor: 'default' }}
              >
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span
                      style={{
                        background: badgeBg,
                        color: badgeColor,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}
                    >
                      {badgeText}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {debito.createdAt ? new Date(debito.createdAt.toDate ? debito.createdAt.toDate() : debito.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h3 style={{ margin: '4px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    {debito.descrizione}
                  </h3>

                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>Da: <strong style={{ color: 'var(--text-main)' }}>{utentiMap[debito.debitoreId] || "Sconosciuto"}</strong></span>
                    <span style={{ margin: '0 8px' }}>→</span>
                    <span>A: <strong style={{ color: 'var(--text-main)' }}>{utentiMap[debito.creditoreId] || "Sconosciuto"}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: badgeColor }}>
                    {parseFloat(debito.importo).toFixed(2)} €
                  </div>

                  {sonoDebitore || sonoCreditore ? (
                    <button
                      onClick={() => saldaDebito(debito.id, sonoDebitore)}
                      className="btn-primary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.88rem',
                        width: 'auto',
                        background: badgeColor,
                        boxShadow: 'none'
                      }}
                    >
                      <i className="fas fa-check"></i> Segna come saldato
                    </button>
                  ) : (
                    <button
                      onClick={() => saldaDebito(debito.id, false)}
                      className="btn-danger-outline"
                      style={{ padding: '6px 12px', fontSize: '0.82rem', width: 'auto' }}
                      title="Elimina"
                    >
                      <i className="fas fa-trash"></i> Elimina
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
