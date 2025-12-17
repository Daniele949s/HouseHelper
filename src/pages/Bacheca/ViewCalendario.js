import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Importa lo stile base
import '../../App.css';
import API_BASE_URL from "../../config";


export default function ViewCalendario() {
  const navigate = useNavigate();
  const [note, setNote] = useState([]);
  const [dataSelezionata, setDataSelezionata] = useState(new Date());
  const [eventiDelGiorno, setEventiDelGiorno] = useState([]);

  useEffect(() => {
    // Scarica tutte le note (bacheca)
    const fetchNote = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_BASE_URL}/bacheca`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filtra solo quelle che hanno una data (Eventi)
            const eventi = res.data.filter(n => n.data !== null);
            setNote(eventi);
        } catch(e) { console.error(e); }
    };
    fetchNote();
  }, []);

  // Ogni volta che cambia la data o le note, aggiorna la lista sotto
  useEffect(() => {
    // Formato YYYY-MM-DD per confronto
    // Nota: toISOString usa UTC, attenzione ai fusi orari. 
    // Metodo casalingo sicuro per l'Italia:
    const dataString = dataSelezionata.toLocaleDateString('en-CA'); // Restituisce YYYY-MM-DD locale

    const eventi = note.filter(n => n.data === dataString);
    setEventiDelGiorno(eventi);
  }, [dataSelezionata, note]);

  // Funzione per mettere un pallino colorato nei giorni con eventi
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
        const dataString = date.toLocaleDateString('en-CA');
        if (note.find(n => n.data === dataString)) {
            return <div style={{height: '6px', width: '6px', background: '#ef4444', borderRadius: '50%', margin: '0 auto'}}></div>;
        }
    }
  };

  return (
    <div className="card" style={{maxWidth:'800px'}}>
      <h1>📅 Calendario Casa</h1>
      
      <div style={{display:'flex', justifyContent:'center', margin:'20px 0'}}>
        <Calendar 
            onChange={setDataSelezionata} 
            value={dataSelezionata} 
            tileContent={tileContent}
            locale="it-IT"
        />
      </div>

      <div style={{textAlign:'left', borderTop:'1px solid #eee', paddingTop:'20px'}}>
        <h3>Eventi del {dataSelezionata.toLocaleDateString()}</h3>
        
        {eventiDelGiorno.length === 0 ? (
            <p style={{color:'#666'}}>Nessun evento in programma.</p>
        ) : (
            <div style={{display:'grid', gap:'10px'}}>
                {eventiDelGiorno.map(e => (
                    <div key={e.id} style={{background:'#f0f9ff', padding:'10px', borderRadius:'8px', borderLeft:'4px solid #3b82f6'}}>
                        <strong>{e.titolo}</strong>
                        <p style={{margin:'5px 0', fontSize:'0.9rem'}}>{e.contenuto}</p>
                        <span style={{fontSize:'0.8rem', color:'#666'}}>Creato da {e.Autore?.username}</span>
                    </div>
                ))}
            </div>
        )}

        <button 
            onClick={() => navigate('/calendario/aggiungi', { state: { dataPreimpostata: dataSelezionata } })} 
            style={{marginTop:'20px', width:'100%'}}
        >
            + Aggiungi Evento a questa data
        </button>
      </div>

      <button className="btn-secondary" onClick={() => navigate('/home')} style={{marginTop:'20px'}}>Indietro</button>
    </div>
  );
}