import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
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
    const fetchDashboardData = async () => {
      try {
        const casaId = userData.casaId;
        const casaDoc = await getDoc(doc(db, "case", casaId));
        if (casaDoc.exists()) setCasa({ id: casaDoc.id, ...casaDoc.data() });

        const oggi = new Date().toISOString().split('T')[0];

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

        const debitiQuery = query(collection(db, "debiti"), where("casaId", "==", casaId));
        const debitiSnap = await getDocs(debitiQuery);
        let totale = 0;
        debitiSnap.forEach(d => {
          const data = d.data();
          if (data.debitoreId === currentUser.uid) totale -= parseFloat(data.importo);
          if (data.creditoreId === currentUser.uid) totale += parseFloat(data.importo);
        });
        setSaldo(totale);

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

    if (!currentUser || !userData) return;
    if (!userData.casaId) {
      navigate("/scelta-casa");
      return;
    }
    fetchDashboardData();
  }, [currentUser, userData, navigate]);

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

  if (loading) return <div className="app-container"><p>Sincronizzazione casa...</p></div>;

  return (
    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
      <div className="bento-grid">
        
        {/* ================= HEADER ================= */}
        <div className="bento-item bento-header">
          <div>
            <h1 style={{ fontSize: '2rem', color: '#fff' }}>{casa?.nome || "La tua Casa"}</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Bentornato, <span style={{ color: '#fff' }}>{userData?.username || "Utente"}</span>
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Codice Invito</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>{casa?.codiceUnivoco}</div>
          </div>
        </div>

        {/* ================= PROSSIMO TURNO ================= */}
        <div className="bento-item bento-turno">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>🧹</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Prossimo Turno</h3>
          </div>
          
          {prossimoTurno ? (
            <div>
              <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '4px' }}>{prossimoTurno.mansione}</h2>
              <p style={{ color: '#f59e0b', fontWeight: '500', margin: 0 }}>{new Date(prossimoTurno.data).toLocaleDateString()}</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <p style={{ color: '#10b981', fontSize: '1.1rem', margin: 0 }}>Nessun turno assegnato. Riposati! 🎉</p>
            </div>
          )}
        </div>

        {/* ================= BILANCIO ================= */}
        <div className="bento-item bento-saldo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>💸</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Bilancio Personale</h3>
          </div>
          
          <div>
            <h2 style={{ fontSize: '2.5rem', color: saldo >= 0 ? '#10b981' : '#ef4444', margin: 0 }}>
              {saldo >= 0 ? "+" : ""}{saldo.toFixed(2)} €
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
              {saldo > 0 ? "Gli altri ti devono soldi." : saldo < 0 ? "Sei in debito con qualcuno." : "Siete tutti pari."}
            </p>
          </div>
        </div>

        {/* ================= ULTIMO AVVISO ================= */}
        <div className="bento-item bento-avviso">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>📌</span>
            </div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Ultimo Avviso in Bacheca</h3>
          </div>
          {ultimoAvviso ? (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', borderLeft: '3px solid var(--color-primary)' }}>
              <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '4px' }}>{ultimoAvviso.titolo}</h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{ultimoAvviso.contenuto}</p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Non ci sono comunicazioni.</p>
          )}
        </div>

        {/* ================= SERVIZI ================= */}
        <div className="bento-item bento-services">
          <button onClick={() => navigate("/turni")} className="service-btn">
              <span style={{ fontSize: '2rem' }}>📅</span> 
              <span>Turni</span>
          </button>
          <button onClick={() => navigate("/debiti")} className="service-btn">
              <span style={{ fontSize: '2rem' }}>💰</span> 
              <span>Spese</span>
          </button>
          <button onClick={() => navigate("/spesa")} className="service-btn">
              <span style={{ fontSize: '2rem' }}>🛒</span> 
              <span>Lista Spesa</span>
          </button>
          <button onClick={() => navigate("/calendario")} className="service-btn">
              <span style={{ fontSize: '2rem' }}>🗓️</span> 
              <span>Calendario</span>
          </button>
          <button onClick={() => navigate("/bacheca")} className="service-btn">
              <span style={{ fontSize: '2rem' }}>📌</span> 
              <span>Bacheca</span>
          </button>
        </div>

        {/* ================= GESTIONE ACCOUNT ================= */}
        <div className="bento-item" style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Gestione Account</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={lasciaCasa} className="btn-secondary" style={{ padding: '8px 16px', width: 'auto', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                Lascia Casa
            </button>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', width: 'auto' }}>
                Esci
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}