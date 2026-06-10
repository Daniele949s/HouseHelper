import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import '../App.css';

export default function HomeUtente() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();
  
  const [casa, setCasa] = useState(null);
  const [prossimoTurno, setProssimoTurno] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [ultimoAvviso, setUltimoAvviso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !userData) return;
    
    if (!userData.casaId) {
      navigate("/scelta-casa");
      return;
    }

    fetchDashboardData();
  }, [currentUser, userData, navigate]);

  const fetchDashboardData = async () => {
    try {
      const casaId = userData.casaId;
      
      // Info Casa
      const casaDoc = await getDoc(doc(db, "case", casaId));
      if (casaDoc.exists()) setCasa({ id: casaDoc.id, ...casaDoc.data() });

      const oggi = new Date().toISOString().split('T')[0];

      // Turni
      const turniQuery = query(collection(db, "turni"), where("casaId", "==", casaId));
      const turniSnap = await getDocs(turniQuery);
      let mieiTurni = [];
      turniSnap.forEach(d => {
        const data = d.data();
        if (data.utenteId === currentUser.uid && data.data >= oggi) {
          mieiTurni.push({ id: d.id, ...data });
        }
      });
      mieiTurni.sort((a, b) => new Date(a.data) - new Date(b.data));
      setProssimoTurno(mieiTurni.length > 0 ? mieiTurni[0] : null);

      // Debiti
      const debitiQuery = query(collection(db, "debiti"), where("casaId", "==", casaId));
      const debitiSnap = await getDocs(debitiQuery);
      let totale = 0;
      debitiSnap.forEach(d => {
        const data = d.data();
        if (data.debitoreId === currentUser.uid) totale -= parseFloat(data.importo);
        if (data.creditoreId === currentUser.uid) totale += parseFloat(data.importo);
      });
      setSaldo(totale);

      // Bacheca
      const noteQuery = query(collection(db, "note"), where("casaId", "==", casaId));
      const noteSnap = await getDocs(noteQuery);
      let noteList = [];
      noteSnap.forEach(d => noteList.push({ id: d.id, ...d.data() }));
      noteList.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      if (noteList.length > 0) setUltimoAvviso(noteList[0]);

    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const lasciaCasa = async () => {
    if (!window.confirm("Sei sicuro di voler uscire da questa casa?")) return;
    try {
      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: null });
      setUserData({ ...userData, casaId: null });
      navigate("/scelta-casa");
    } catch (e) {
      console.error(e);
      alert("Errore durante l'uscita.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) return <div className="app-container"><p>Caricamento Dashboard...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '800px', padding: '0', overflow: 'hidden' }}>
      
      {/* ================= HEADER CASA ================= */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%)', 
        padding: '3rem 2rem', 
        color: 'white', 
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        position: 'relative'
      }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'white', letterSpacing: '-0.02em' }}>
          {casa?.nome || "La tua Casa"}
        </h1>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ opacity: 0.9 }}>Codice Invito:</span>
          <span style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)'
          }}>
            {casa?.codiceUnivoco}
          </span>
        </div>
        <p style={{ fontSize: '1.1rem', marginTop: '20px', opacity: 0.9 }}>
            Bentornato, <strong>{userData?.username || "Utente"}</strong>!
        </p>
      </div>

      <div style={{ padding: '30px 20px' }}>
        {/* ================= IN EVIDENZA ================= */}
        <h3 style={{ marginBottom: '16px' }}>✨ In Evidenza</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            
            {/* Prossimo Turno */}
            <div className="widget-card" style={{ borderTop: '4px solid #f59e0b' }}>
                <span style={{ fontSize: '2rem' }}>🧹</span>
                <p style={{ fontWeight: '600', color: 'var(--text-main)', marginTop: '8px' }}>Prossimo Turno</p>
                {prossimoTurno ? (
                    <div style={{ marginTop: '4px' }}>
                        <strong style={{ color: '#d97706', fontSize: '1.1rem' }}>{prossimoTurno.mansione}</strong>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{new Date(prossimoTurno.data).toLocaleDateString()}</div>
                    </div>
                ) : (
                    <p style={{ fontSize: '0.95rem', color: '#10b981', marginTop: '4px' }}>Tutto pulito! 🎉</p>
                )}
            </div>

            {/* Saldo */}
            <div className="widget-card" style={{ borderTop: saldo >= 0 ? '4px solid #10b981' : '4px solid #ef4444' }}>
                <span style={{ fontSize: '2rem' }}>💸</span>
                <p style={{ fontWeight: '600', color: 'var(--text-main)', marginTop: '8px' }}>Bilancio Personale</p>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: saldo >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                    {saldo >= 0 ? "+" : ""}{saldo.toFixed(2)} €
                </div>
            </div>

            {/* Bacheca */}
            <div className="widget-card" style={{ borderTop: '4px solid #8b5cf6' }}>
                <span style={{ fontSize: '2rem' }}>📌</span>
                <p style={{ fontWeight: '600', color: 'var(--text-main)', marginTop: '8px' }}>Ultimo Avviso</p>
                {ultimoAvviso ? (
                    <div style={{ marginTop: '4px' }}>
                        <p style={{ fontWeight: '600', fontSize:'1rem', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {ultimoAvviso.titolo}
                        </p>
                    </div>
                ) : (
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Nessuna novità.</p>
                )}
            </div>
        </div>

        {/* ================= SERVIZI ================= */}
        <h3 style={{ marginBottom: '16px' }}>🚀 Servizi</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <button onClick={() => navigate("/turni")} className="service-btn">
                <span style={{ fontSize: '2rem' }}>📅</span> 
                <span>Turni Pulizie</span>
            </button>
            <button onClick={() => navigate("/debiti")} className="service-btn">
                <span style={{ fontSize: '2rem' }}>💰</span> 
                <span>Spese</span>
            </button>
            <button onClick={() => navigate("/bacheca")} className="service-btn">
                <span style={{ fontSize: '2rem' }}>📌</span> 
                <span>Bacheca</span>
            </button>
            <button onClick={() => navigate("/calendario")} className="service-btn">
                <span style={{ fontSize: '2rem' }}>🗓️</span> 
                <span>Calendario</span>
            </button>
        </div>

        <div style={{ marginTop: '30px' }}>
          <button 
            className="btn-primary" 
            onClick={() => navigate("/turni/aggiungi")} 
            style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1.1rem' }}
          >
              ➕ Aggiungi Turno Veloce
          </button>
        </div>

        {/* ================= FOOTER / GESTIONE CASA ================= */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
            <p style={{fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'center'}}>Gestione Account</p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={handleLogout} className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }}>
                    Esci
                </button>
                <button onClick={lasciaCasa} className="btn-secondary" style={{ width: 'auto', padding: '10px 24px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                    Lascia Casa
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}