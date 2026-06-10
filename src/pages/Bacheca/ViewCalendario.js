import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import '../../App.css';

export default function ViewCalendario() {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [eventi, setEventi] = useState([]);
  const [turni, setTurni] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});
  const [dataSelezionata, setDataSelezionata] = useState(new Date());
  
  const [itemsDelGiorno, setItemsDelGiorno] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatiCalendario = async () => {
        if (!userData?.casaId) return;
        setLoading(true);
        try {
            // Mappa utenti
            const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
            const snapUtenti = await getDocs(qUtenti);
            const map = {};
            snapUtenti.forEach(d => { map[d.id] = d.data().username || "Sconosciuto"; });
            setUtentiMap(map);

            // Fetch Note/Eventi
            const qNote = query(collection(db, "note"), where("casaId", "==", userData.casaId));
            const snapNote = await getDocs(qNote);
            const eventiC = [];
            snapNote.forEach(d => {
              const data = d.data();
              if (data.data) { // se ha una data è un evento
                eventiC.push({ id: d.id, tipo: 'evento', ...data });
              }
            });
            setEventi(eventiC);

            // Fetch Turni
            const qTurni = query(collection(db, "turni"), where("casaId", "==", userData.casaId));
            const snapTurni = await getDocs(qTurni);
            const turniC = [];
            snapTurni.forEach(d => {
              const data = d.data();
              if (data.data) turniC.push({ id: d.id, tipo: 'turno', ...data });
            });
            setTurni(turniC);

        } catch(e) { 
            console.error(e); 
        } finally {
            setLoading(false);
        }
    };
    fetchDatiCalendario();
  }, [userData]);

  useEffect(() => {
    const dataString = dataSelezionata.toLocaleDateString('en-CA');
    const eventiOggi = eventi.filter(e => e.data === dataString);
    const turniOggi = turni.filter(t => t.data === dataString);
    setItemsDelGiorno([...turniOggi, ...eventiOggi]);
  }, [dataSelezionata, eventi, turni]);

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
        const dataString = date.toLocaleDateString('en-CA');
        const haEvento = eventi.find(e => e.data === dataString);
        const haTurno = turni.find(t => t.data === dataString);

        if (haEvento || haTurno) {
            return (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '4px' }}>
                {haTurno && <div style={{ height: '6px', width: '6px', background: '#f59e0b', borderRadius: '50%' }}></div>}
                {haEvento && <div style={{ height: '6px', width: '6px', background: '#8b5cf6', borderRadius: '50%' }}></div>}
              </div>
            );
        }
    }
    return null;
  };

  if (loading) return <div className="card"><p>Caricamento calendario...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '800px', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Calendario Casa 🗓️</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }} className="custom-calendar-wrapper">
        <Calendar 
            onChange={setDataSelezionata} 
            value={dataSelezionata} 
            tileContent={tileContent}
            locale="it-IT"
            className="react-calendar-custom"
        />
      </div>

      <div style={{ textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Impegni del {dataSelezionata.toLocaleDateString()}</h3>
        
        {itemsDelGiorno.length === 0 ? (
            <div style={{ padding: '2rem', background: 'var(--color-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
               <p style={{ color: 'var(--text-secondary)' }}>Nessun evento o turno in programma.</p>
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {itemsDelGiorno.map(item => {
                    const isTurno = item.tipo === 'turno';
                    const color = isTurno ? '#f59e0b' : '#8b5cf6';
                    
                    return (
                      <div key={item.id} className="widget-card" style={{ borderLeft: `4px solid ${color}`, padding: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                              <span style={{ background: color, color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  {isTurno ? "Turno Pulizia" : "Evento"}
                              </span>
                          </div>
                          
                          {isTurno ? (
                            <>
                              <h4 style={{ margin: '0 0 5px 0' }}>{Array.isArray(item.luoghi) ? item.luoghi.join(", ") : item.luoghi}</h4>
                              <p style={{ margin: '0', fontSize: '0.9rem' }}>Assegnato a: <strong>{Array.isArray(item.nomi) ? item.nomi.join(", ") : item.nomi}</strong></p>
                              <p style={{ margin: '0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{Array.isArray(item.fasciaOraria) ? item.fasciaOraria[0] : item.fasciaOraria}</p>
                            </>
                          ) : (
                            <>
                              <h4 style={{ margin: '0 0 5px 0' }}>{item.titolo}</h4>
                              <p style={{ margin: '0', fontSize: '0.95rem' }}>{item.contenuto}</p>
                              <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Creato da: <strong>{utentiMap[item.autoreId]}</strong></p>
                            </>
                          )}
                      </div>
                    );
                })}
            </div>
        )}

        <button 
            className="btn-primary"
            onClick={() => navigate('/calendario/aggiungi', { state: { dataPreimpostata: dataSelezionata } })} 
            style={{ marginTop: '20px', width: '100%' }}
        >
            + Aggiungi Evento a questa data
        </button>
      </div>

      <button className="btn-text" onClick={() => navigate('/home')} style={{ marginTop: '20px' }}>
         ← Torna alla Dashboard
      </button>
    </div>
  );
}