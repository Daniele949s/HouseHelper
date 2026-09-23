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
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
        const snapUtenti = await getDocs(qUtenti);
        const map = {};
        snapUtenti.forEach(d => { map[d.id] = d.data().username || "Sconosciuto"; });
        setUtentiMap(map);

        const qNote = query(collection(db, "note"), where("casaId", "==", userData.casaId));
        const snapNote = await getDocs(qNote);
        const eventiC = [];
        snapNote.forEach(d => {
          const data = d.data();
          if (data.data) {
            eventiC.push({ id: d.id, tipo: 'evento', ...data });
          }
        });
        setEventi(eventiC);

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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
            {haTurno && <div style={{ height: '7px', width: '7px', background: 'var(--color-warning)', borderRadius: '50%', boxShadow: '0 0 6px var(--color-warning)' }}></div>}
            {haEvento && <div style={{ height: '7px', width: '7px', background: 'var(--color-purple)', borderRadius: '50%', boxShadow: '0 0 6px var(--color-purple)' }}></div>}
          </div>
        );
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '800px' }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: '10px' }}>Caricamento calendario...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '820px', padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, textAlign: 'left' }}>Calendario Casa 🗓️</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.92rem' }}>
            Visualizza tutti gli eventi, le scadenze e i turni pulizia
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }} className="custom-calendar-wrapper">
        <Calendar
          onChange={setDataSelezionata}
          value={dataSelezionata}
          tileContent={tileContent}
          locale="it-IT"
        />
      </div>

      <div style={{ textAlign: 'left', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
            Impegni del {dataSelezionata.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }} /> Turno
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-purple)' }} /> Evento
            </span>
          </div>
        </div>

        {itemsDelGiorno.length === 0 ? (
          <div style={{ padding: '2.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', opacity: 0.7 }}>☕</span>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', margin: 0 }}>Nessun evento o turno in questa data. Tempo libero!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {itemsDelGiorno.map(item => {
              const isTurno = item.tipo === 'turno';
              return (
                <div key={item.id} className="calendar-agenda-card">
                  <div className={`agenda-date-badge ${isTurno ? "badge-turno" : ""}`}>
                    <span className="day-num">
                      <i className={isTurno ? "fas fa-broom" : "fas fa-calendar-day"}></i>
                    </span>
                    <span className="month-txt">
                      {isTurno ? "Turno" : "Evento"}
                    </span>
                  </div>

                  <div className="agenda-content-body">
                    {isTurno ? (
                      <>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                          {Array.isArray(item.luoghi) ? item.luoghi.join(", ") : (item.luoghi || item.mansione || "Pulizia")}
                        </h4>
                        <p style={{ margin: '2px 0', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                          Assegnato a: <strong style={{ color: 'var(--text-main)' }}>{Array.isArray(item.nomi) ? item.nomi.join(", ") : item.nomi}</strong>
                        </p>
                        <p style={{ margin: '2px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <i className="far fa-clock" style={{ marginRight: '6px' }}></i>
                          {Array.isArray(item.fasciaOraria) ? item.fasciaOraria[0] : item.fasciaOraria}
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>{item.titolo}</h4>
                        <p style={{ margin: '2px 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{item.contenuto}</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Creato da: <strong style={{ color: 'var(--text-main)' }}>{utentiMap[item.autoreId] || "Coinquilino"}</strong>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={() => navigate('/calendario/aggiungi', { state: { dataPreimpostata: dataSelezionata } })}
          style={{ marginTop: '24px', width: '100%' }}
        >
          <i className="fas fa-plus"></i> Aggiungi Evento a questa data
        </button>
      </div>

      <button className="btn-text" onClick={() => navigate('/home')} style={{ marginTop: '24px' }}>
        ← Torna alla Dashboard
      </button>
    </div>
  );
}
