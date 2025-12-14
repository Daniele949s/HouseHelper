import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function HomeUtente() {
  const navigate = useNavigate();
  const [utente, setUtente] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper per ottenere gli headers con il token
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchDatiUtente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDatiUtente = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // 1. Chiamata sicura al profilo utente
      const res = await axios.get("http://localhost:5000/api/utenti/me", getAuthHeader());
      setUtente(res.data);
      
      // Aggiorniamo casaId in locale per sicurezza
      if (res.data.CasaId) {
        localStorage.setItem("casaId", res.data.CasaId);
      } else {
        // Se l'utente non ha una casa, lo mandiamo a sceglierla
        localStorage.removeItem("casaId");
        navigate("/scelta-casa");
      }

    } catch (error) {
      console.error("Errore caricamento home:", error);
      // Se il token è scaduto o non valido
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear(); // Pulisce token, user, casaId
    navigate("/login");
  };

  const lasciaCasa = async () => {
    if (!window.confirm("Sei sicuro di voler uscire da questa casa?")) return;
    try {
      // Nota: POST richiede (url, body, config). Il body è vuoto {}, gli headers sono in config.
      await axios.post("http://localhost:5000/api/casa/lascia", {}, getAuthHeader());
      
      localStorage.removeItem("casaId");
      alert("Hai lasciato la casa.");
      navigate("/scelta-casa");
    } catch (e) {
      console.error(e);
      alert("Errore durante l'uscita.");
    }
  };

  const eliminaCasa = async () => {
    if (!window.confirm("ATTENZIONE: Stai per eliminare la casa per TUTTI. Sei sicuro?")) return;
    
    const confermaFinale = prompt("Scrivi 'ELIMINA' per confermare la distruzione della casa.");
    if (confermaFinale !== "ELIMINA") return;

    try {
      const casaId = utente.Casa?.id;
      // Nota: DELETE richiede (url, config). Gli headers sono in config.
      await axios.delete(`http://localhost:5000/api/casa/${casaId}`, getAuthHeader());
      
      alert("Casa distrutta definitivamente.");
      localStorage.removeItem("casaId");
      navigate("/scelta-casa");
    } catch (e) {
      console.error(e);
      alert("Errore: impossibile eliminare la casa (forse non sei l'amministratore o errore server).");
    }
  };

  if (loading) return <div className="card"><p>Caricamento profilo...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      {/* Intestazione */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Ciao, {utente?.username}! 👋</h1>
        <p className="subtitle">Benvenuto nella tua dashboard</p>
      </div>

      {/* CARD INFO CASA */}
      {utente?.Casa && (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--color-accent)' }}>🏠 {utente.Casa.nome}</h2>
            
            <div style={{ 
            background: '#f8fafc', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            margin: '1.5rem 0',
            border: '2px dashed var(--color-accent)'
            }}>
            <p style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px' }}>
                Codice Invito
            </p>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-accent)', margin: '0.5rem 0' }}>
                {utente.Casa.codiceUnivoco}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Condividi questo codice con i tuoi coinquilini.
            </p>
            </div>

            {/* Bottoni Gestione Casa */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px' }}>
                <button 
                    onClick={lasciaCasa} 
                    className="btn-secondary" 
                    style={{ width: 'auto' }}
                >
                    🏃‍♂️ Lascia Casa
                </button>
                <button 
                    onClick={eliminaCasa} 
                    style={{ width: 'auto', backgroundColor: '#ef4444', color: 'white' }} // Stile rosso inline per pericolo
                >
                    💣 Distruggi Casa
                </button>
            </div>
        </div>
      )}

      {/* MENU AZIONI PRINCIPALI */}
      <div style={{ display: 'grid', gap: '1rem', width: '100%' }}>
        <button onClick={() => navigate("/turni")} style={{ padding: '1.2rem', fontSize: '1.1rem' }}>
            📅 Visualizza Turni
        </button>
        
        <button onClick={() => navigate("/turni/aggiungi")} className="btn-secondary">
            ➕ Aggiungi Turno
        </button>
        <button onClick={() => navigate("/debiti")} style={{ padding: '1.2rem', fontSize: '1.1rem', background: '#10b981' }}>
            💸 Gestione Spese/Debiti
        </button>

        <button onClick={handleLogout} className="btn-secondary" style={{ marginTop: '1rem', borderColor: '#cbd5e1' }}>
            Esci dall'account
        </button>
      </div>
    </div>
  );
}