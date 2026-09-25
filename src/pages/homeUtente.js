import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import HouseAnalytics from "../components/HouseAnalytics";
import MiniGuy from "../components/MiniGuy";
import { safeFloat } from "../utils/security";
import '../App.css';

export default function HomeUtente() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();

  const [casa, setCasa] = useState(null);
  const [prossimoTurno, setProssimoTurno] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [ultimoAvviso, setUltimoAvviso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Dati completi per HouseAnalytics
  const [turniList, setTurniList] = useState([]);
  const [debitiList, setDebitiList] = useState([]);
  const [spesaList, setSpesaList] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const casaId = userData.casaId;

        // 1. Casa
        const casaDoc = await getDoc(doc(db, "case", casaId));
        if (casaDoc.exists()) setCasa({ id: casaDoc.id, ...casaDoc.data() });

        // 2. Mappa Coinquilini
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", casaId));
        const snapUtenti = await getDocs(qUtenti);
        const uMap = {};
        snapUtenti.forEach(d => { uMap[d.id] = d.data().username || "Coinquilino"; });
        setUtentiMap(uMap);

        const oggi = new Date().toISOString().split('T')[0];

        // 3. Turni
        const turniQuery = query(collection(db, "turni"), where("casaId", "==", casaId));
        const turniSnap = await getDocs(turniQuery);
        let allTurni = [];
        let mieiTurni = [];
        turniSnap.forEach(d => {
          const data = d.data();
          const item = { id: d.id, ...data };
          allTurni.push(item);
          if (data.utenteId === currentUser.uid && data.data >= oggi) {
            mieiTurni.push(item);
          }
        });
        mieiTurni.sort((a, b) => new Date(a.data) - new Date(b.data));
        setProssimoTurno(mieiTurni.length > 0 ? mieiTurni[0] : null);
        setTurniList(allTurni);

        // 4. Debiti / Spese
        const debitiQuery = query(collection(db, "debiti"), where("casaId", "==", casaId));
        const debitiSnap = await getDocs(debitiQuery);
        let allDebiti = [];
        let totale = 0;
        debitiSnap.forEach(d => {
          const data = d.data();
          allDebiti.push({ id: d.id, ...data });
          const val = safeFloat(data.importo);
          if (data.debitoreId === currentUser.uid) totale -= val;
          if (data.creditoreId === currentUser.uid) totale += val;
        });
        setSaldo(totale);
        setDebitiList(allDebiti);

        // 5. Lista Spesa
        const spesaQuery = query(collection(db, "spesa"), where("casaId", "==", casaId));
        const spesaSnap = await getDocs(spesaQuery);
        let allSpesa = [];
        spesaSnap.forEach(d => allSpesa.push({ id: d.id, ...d.data() }));
        setSpesaList(allSpesa);

        // 6. Note / Bacheca
        const noteQuery = query(collection(db, "note"), where("casaId", "==", casaId));
        const noteSnap = await getDocs(noteQuery);
        let noteList = [];
        noteSnap.forEach(d => noteList.push({ id: d.id, ...d.data() }));
        noteList.sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0));
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

  const copyInviteCode = () => {
    if (!casa?.codiceUnivoco) return;
    navigator.clipboard.writeText(casa.codiceUnivoco);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '40px auto' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          <i className="fas fa-spinner fa-spin fa-2x"></i>
        </p>
        <p style={{ marginTop: '16px' }}>Sincronizzazione della casa...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '880px', width: '100%', margin: '0 auto' }}>
      <div className="bento-grid">

        {/* ================= 1. HEADER (Welcome & Invite Code) ================= */}
        <div className="bento-item bento-header">
          <div className="bento-header-info">
            <h1>{casa?.nome || "La tua Casa"} 🏠</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Bentornato, <strong style={{ color: 'var(--text-main)' }}>{userData?.username || "Utente"}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <MiniGuy />
            <div className="invite-code-pill" onClick={copyInviteCode} title="Clicca per copiare il codice invito">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Codice Invito {copiedCode && <span style={{ color: 'var(--color-success)' }}>✓ Copiato!</span>}
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-accent)', letterSpacing: '1px' }}>
                {casa?.codiceUnivoco} <i className="far fa-copy" style={{ fontSize: '0.9rem', marginLeft: '6px' }}></i>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 2. SERVIZI RAPIDI (In alto per accesso immediato) ================= */}
        <div className="bento-services">
          <button onClick={() => navigate("/turni")} className="service-btn">
            <span className="service-icon">🧹</span>
            <span>Turni</span>
          </button>
          <button onClick={() => navigate("/debiti")} className="service-btn">
            <span className="service-icon">💰</span>
            <span>Spese</span>
          </button>
          <button onClick={() => navigate("/spesa")} className="service-btn">
            <span className="service-icon">🛒</span>
            <span>Spesa</span>
          </button>
          <button onClick={() => navigate("/calendario")} className="service-btn">
            <span className="service-icon">🗓️</span>
            <span>Calendario</span>
          </button>
          <button onClick={() => navigate("/bacheca")} className="service-btn">
            <span className="service-icon">📌</span>
            <span>Bacheca</span>
          </button>
        </div>

        {/* ================= 3. STATO RAPIDO: PROSSIMO TURNO & SALDO PERSONALE ================= */}
        <div className="bento-item bento-turno">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '10px 14px', borderRadius: '14px', color: '#f59e0b', fontSize: '1.4rem' }}>
                <i className="fas fa-broom"></i>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Il tuo Prossimo Turno
                </h3>
              </div>
            </div>

            {prossimoTurno ? (
              <div style={{ marginTop: '10px' }}>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {prossimoTurno.mansione || "Pulizia"}
                </h2>
                <p style={{ color: '#f59e0b', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="far fa-calendar-alt"></i>
                  {new Date(prossimoTurno.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            ) : (
              <div style={{ padding: '12px 0' }}>
                <p style={{ color: 'var(--color-success)', fontSize: '1.05rem', margin: 0, fontWeight: '500' }}>
                  🎉 Nessun turno oggi. Casa splendente!
                </p>
              </div>
            )}
          </div>

          <button
            className="btn-text"
            onClick={() => navigate("/turni")}
            style={{ alignSelf: 'flex-start', padding: '6px 0', marginTop: '16px', color: '#f59e0b' }}
          >
            Gestisci tutti i turni →
          </button>
        </div>

        <div className={`bento-item bento-saldo ${saldo >= 0 ? "saldo-pos" : "saldo-neg"}`}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: saldo >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', padding: '10px 14px', borderRadius: '14px', color: saldo >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '1.4rem' }}>
                <i className="fas fa-wallet"></i>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bilancio Spese Personale
                </h3>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '2.4rem', color: saldo >= 0 ? 'var(--color-success)' : 'var(--color-danger)', margin: 0, fontWeight: '800' }}>
                {saldo >= 0 ? "+" : ""}{safeFloat(saldo).toFixed(2)} €
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
                {saldo > 0 ? "Gli altri coinquilini ti devono dei soldi." : saldo < 0 ? "Hai debiti pendenti verso la casa." : "Siete tutti in parità!"}
              </p>
            </div>
          </div>

          <button
            className="btn-text"
            onClick={() => navigate("/debiti")}
            style={{ alignSelf: 'flex-start', padding: '6px 0', marginTop: '16px', color: 'var(--color-accent)' }}
          >
            Vedi dettagli spese →
          </button>
        </div>

        {/* ================= 4. GRAFICI & ANALISI CASA (Nuovo modulo) ================= */}
        <HouseAnalytics
          turni={turniList}
          debiti={debitiList}
          spesa={spesaList}
          utentiMap={utentiMap}
          currentUserId={currentUser?.uid}
        />

        {/* ================= 5. ULTIMO AVVISO IN BACHECA ================= */}
        <div className="bento-item bento-avviso">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px 12px', borderRadius: '10px', color: 'var(--color-primary)' }}>
              <i className="fas fa-thumbtack"></i>
            </div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ultimo Avviso in Bacheca
            </h3>
          </div>

          {ultimoAvviso ? (
            <div style={{ background: 'var(--bg-input)', padding: '16px 20px', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--color-primary)' }}>
              <h4 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '4px' }}>{ultimoAvviso.titolo}</h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>{ultimoAvviso.contenuto}</p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nessun avviso recente in bacheca.</p>
          )}
        </div>

        {/* ================= 6. GESTIONE ACCOUNT ================= */}
        <div className="bento-item bento-account">
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <i className="fas fa-user-shield" style={{ marginRight: '8px' }}></i> Account HouseHelper
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={lasciaCasa} className="btn-danger-outline" style={{ fontSize: '0.88rem' }}>
              <i className="fas fa-door-open"></i> Lascia Casa
            </button>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', width: 'auto', fontSize: '0.88rem' }}>
              <i className="fas fa-sign-out-alt"></i> Esci
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
