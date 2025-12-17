import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // <--- Aggiungi useLocation
import axios from "axios";
import '../App.css'; 
import API_BASE_URL from "../config";

export default function HomeUtente() {
  const navigate = useNavigate();
  const location = useLocation();
  const [utente, setUtente] = useState(null);
  
  // Stati per le "Notifiche" (Dashboard)
  const [prossimoTurno, setProssimoTurno] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [ultimoAvviso, setUltimoAvviso] = useState(null);
  
  const [loading, setLoading] = useState(true);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchDatiCompleti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const fetchDatiCompleti = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }

      // 1. Dati Utente e Casa
      const resUser = await axios.get(`${API_BASE_URL}/utenti/me`, getAuthHeader()); // <--- MODIFICA
      const myData = resUser.data;
      setUtente(myData);

      if (!myData.CasaId) {
        navigate("/scelta-casa");
        return;
      }
      localStorage.setItem("casaId", myData.CasaId);

      // --- 2. CARICAMENTO DATI PER DASHBOARD (NOTIFICHE) ---
      const [resTurni, resDebiti, resBacheca] = await Promise.all([
        axios.get(`${API_BASE_URL}/turni`, getAuthHeader()),
        axios.get(`${API_BASE_URL}/debiti`, getAuthHeader()),
        axios.get(`${API_BASE_URL}/bacheca`, getAuthHeader())
      ]);

      // A. Calcolo Prossimo Turno
      const oggi = new Date().toISOString().split('T')[0];
      const mieiTurni = resTurni.data
        .filter(t => t.UtenteId === myData.id && t.data >= oggi)
        .sort((a, b) => new Date(a.data) - new Date(b.data));
      
      setProssimoTurno(mieiTurni.length > 0 ? mieiTurni[0] : null);

      // B. Calcolo Saldo
      let totale = 0;
      resDebiti.data.forEach(d => {
        if (d.DebitoreId === myData.id) totale -= parseFloat(d.importo);
        if (d.CreditoreId === myData.id) totale += parseFloat(d.importo);
      });
      setSaldo(totale);

      // C. Ultimo Avviso
      if (resBacheca.data.length > 0) {
        setUltimoAvviso(resBacheca.data[0]);
      }

    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // --- Funzioni Gestione Casa (Ripristinate) ---
  const lasciaCasa = async () => {
    if (!window.confirm("Sei sicuro di voler uscire da questa casa?")) return;
    try {
      await axios.post(`${API_BASE_URL}/casa/lascia`, {}, getAuthHeader());
      localStorage.removeItem("casaId");
      navigate("/scelta-casa");
    } catch (e) { console.error(e); alert("Errore durante l'uscita."); }
  };

  const eliminaCasa = async () => {
    if (!window.confirm("ATTENZIONE: Eliminerai la casa per TUTTI. Sicuro?")) return;
    try {
      const casaId = utente.Casa?.id;
      await axios.delete(`${API_BASE_URL}/casa/${casaId}`, getAuthHeader());
      localStorage.removeItem("casaId");
      navigate("/scelta-casa");
    } catch (e) { console.error(e); alert("Errore eliminazione casa."); }
  };

  if (loading) return <div className="card"><p style={{color:'black'}}>Caricamento Dashboard...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '800px', padding: '0', overflow: 'hidden', background: '#f8fafc', boxShadow: 'none' }}>
      
      {/* ================= HEADER CASA ================= */}
      <div style={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
        padding: '2rem', 
        borderRadius: '0 0 20px 20px',
        color: 'black', 
        marginBottom: '20px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: 'black' }}>🏡 {utente?.Casa?.nome || "La tua Casa"}</h1>
        <p style={{ opacity: 0.9, marginTop: '5px', color: 'black' }}>
          Codice: <strong style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: '4px', color: 'black' }}>{utente?.Casa?.codiceUnivoco}</strong>
        </p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', color: 'black' }}>
            Ciao, {utente?.username}!
        </p>
      </div>

      {/* ================= IN EVIDENZA ================= */}
      <div style={{ padding: '0 10px' }}>
        <h3 style={{ textAlign: 'left', color: 'black', marginBottom: '10px', paddingLeft: '5px' }}>📢 In Evidenza</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            
            {/* Prossimo Turno */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '5px solid #f59e0b' }}>
                <span style={{ fontSize: '2rem' }}>🧹</span>
                <p style={{ fontWeight: 'bold', margin: '5px 0', color: 'black' }}>Prossimo Turno</p>
                {prossimoTurno ? (
                    <div>
                        <strong style={{ color: '#d97706' }}>{prossimoTurno.mansione}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'black' }}>{new Date(prossimoTurno.data).toLocaleDateString()}</div>
                    </div>
                ) : (
                    <p style={{ fontSize: '0.9rem', color: '#10b981' }}>Tutto pulito! 🎉</p>
                )}
            </div>

            {/* Saldo */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: saldo >= 0 ? '5px solid #10b981' : '5px solid #ef4444' }}>
                <span style={{ fontSize: '2rem' }}>💸</span>
                <p style={{ fontWeight: 'bold', margin: '5px 0', color: 'black' }}>Bilancio</p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: saldo >= 0 ? '#10b981' : '#ef4444' }}>
                    {saldo >= 0 ? "+" : ""}{saldo.toFixed(2)} €
                </div>
            </div>

            {/* Bacheca */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '5px solid #8b5cf6' }}>
                <span style={{ fontSize: '2rem' }}>📌</span>
                <p style={{ fontWeight: 'bold', margin: '5px 0', color: 'black' }}>Avvisi</p>
                {ultimoAvviso ? (
                    <div>
                        <p style={{ fontWeight: 'bold', fontSize:'0.9rem', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color: 'black' }}>
                            {ultimoAvviso.titolo}
                        </p>
                    </div>
                ) : (
                    <p style={{ fontSize: '0.9rem', color: 'black' }}>Nessuna novità.</p>
                )}
            </div>
        </div>

        {/* ================= SERVIZI ================= */}
        <h3 style={{ textAlign: 'left', color: 'black', marginBottom: '10px', paddingLeft: '5px' }}>🚀 Servizi</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <button onClick={() => navigate("/turni")} style={btnStyle}>
                <span style={{ fontSize: '2rem' }}>📅</span> Turni Pulizie
            </button>
            <button onClick={() => navigate("/debiti")} style={btnStyle}>
                <span style={{ fontSize: '2rem' }}>💰</span> Spese & Debiti
            </button>
            <button onClick={() => navigate("/bacheca")} style={btnStyle}>
                <span style={{ fontSize: '2rem' }}>📌</span> Bacheca
            </button>
            <button onClick={() => navigate("/calendario")} style={btnStyle}>
                <span style={{ fontSize: '2rem' }}>🗓️</span> Calendario
            </button>
        </div>

        {/* ================= AZIONI RAPIDE (AGGIUNTE) ================= */}
        <h3 style={{ textAlign: 'left', color: 'black', marginBottom: '10px', marginTop: '25px', paddingLeft: '5px' }}>⚡ Azioni Rapide</h3>
        
        <button 
            onClick={() => navigate("/turni/aggiungi")} 
            style={{ 
                width: '100%', 
                padding: '15px', 
                background: 'white', 
                color: 'black', 
                border: '2px dashed #ccc', 
                borderRadius: '12px', 
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px'
            }}
        >
            ➕ Aggiungi Turno Veloce
        </button>


        {/* ================= FOOTER / GESTIONE CASA ================= */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '20px', paddingBottom: '20px' }}>
            <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '10px'}}>Gestione Account & Casa</p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={handleLogout} className="btn-secondary" style={{ fontSize: '0.8rem', color: 'black', borderColor: '#999' }}>
                    Esci
                </button>
                <button onClick={lasciaCasa} className="btn-secondary" style={{ fontSize: '0.8rem', color: 'black', borderColor: '#999' }}>
                    Lascia Casa
                </button>
                {/* Visualizziamo il tasto distruggi solo se necessario, per pulizia */}
                <button onClick={eliminaCasa} style={{ fontSize: '0.8rem', background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px' }}>
                    Elimina Casa
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}

// Stile riutilizzabile per i bottoni della griglia
const btnStyle = {
    padding: '20px', 
    background: 'white', 
    color: 'black', 
    border: '1px solid #eee', 
    borderRadius: '12px', 
    display:'flex', 
    flexDirection:'column', 
    alignItems:'center', 
    gap:'10px', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    cursor: 'pointer'
};