import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { triggerConfetti } from "../../components/Celebration";
import '../../App.css';

export default function AggiungiDebito() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [coinquilini, setCoinquilini] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDiviso, setIsDiviso] = useState(false);

  const [debito, setDebito] = useState({
    importo: "",
    descrizione: "",
    debitoreId: "",
    creditoreId: currentUser?.uid || ""
  });

  useEffect(() => {
    const fetchCoinquilini = async () => {
      if (!userData?.casaId) return;
      try {
        const q = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
        const snap = await getDocs(q);
        const utenti = [];
        snap.forEach(doc => {
          utenti.push({ id: doc.id, ...doc.data() });
        });
        setCoinquilini(utenti);
      } catch (error) {
        console.error("Errore fetch coinquilini:", error);
      }
    };
    fetchCoinquilini();
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!debito.importo || !debito.descrizione || (!isDiviso && !debito.debitoreId) || !debito.creditoreId) {
      alert("Compila tutti i campi!");
      return;
    }

    setLoading(true);

    try {
      const importoNum = parseFloat(debito.importo);

      if (isDiviso) {
        if (coinquilini.length < 2) {
          alert("Sei da solo in casa, impossibile dividere.");
          setLoading(false);
          return;
        }

        const quota = (importoNum / coinquilini.length).toFixed(2);

        const promesse = coinquilini.map(c => {
          if (c.id !== debito.creditoreId) {
            return addDoc(collection(db, "debiti"), {
              importo: quota,
              descrizione: `${debito.descrizione} (Quota divisa)`,
              debitoreId: c.id,
              creditoreId: debito.creditoreId,
              casaId: userData.casaId,
              createdAt: new Date()
            });
          }
          return Promise.resolve();
        });

        await Promise.all(promesse);

      } else {
        if (debito.debitoreId === debito.creditoreId) {
          alert("Non puoi registrare un debito verso te stesso!");
          setLoading(false);
          return;
        }

        await addDoc(collection(db, "debiti"), {
          importo: importoNum.toFixed(2),
          descrizione: debito.descrizione,
          debitoreId: debito.debitoreId,
          creditoreId: debito.creditoreId,
          casaId: userData.casaId,
          createdAt: new Date()
        });
      }

      triggerConfetti();
      navigate("/debiti");
    } catch (error) {
      console.error(error);
      alert("Errore salvataggio debito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '620px' }}>
      <h1 style={{ marginBottom: '6px' }}>Nuova Spesa 💸</h1>
      <p className="subtitle" style={{ marginBottom: '24px' }}>Registra una spesa singola o dividila con tutti</p>

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: 'left' }}>
        <div className="input-group">
          <label>Descrizione della spesa</label>
          <input
            type="text"
            placeholder="es. Spesa supermercato, Bolletta luce, Carta igienica"
            value={debito.descrizione}
            onChange={(e) => setDebito({...debito, descrizione: e.target.value})}
            required
          />
        </div>

        <div className="input-group">
          <label>Importo Totale (€)</label>
          <input
            type="number"
            step="0.01"
            placeholder="es. 45.50"
            value={debito.importo}
            onChange={(e) => setDebito({...debito, importo: e.target.value})}
            required
          />
        </div>

        <div className="input-group" style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isDiviso}
              onChange={(e) => setIsDiviso(e.target.checked)}
              style={{ width: '22px', height: '22px', margin: 0, accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600' }}>
              Dividi automaticamente l'importo tra TUTTI i coinquilini ({coinquilini.length > 0 ? `${coinquilini.length} persone` : ""})
            </span>
          </label>
        </div>

        <div className="input-group">
          <label>Chi ha anticipato i soldi?</label>
          <select
            value={debito.creditoreId}
            onChange={(e) => setDebito({...debito, creditoreId: e.target.value})}
            required
          >
            {coinquilini.map(c => (
              <option key={c.id} value={c.id}>
                {c.username} {c.id === currentUser.uid ? "(Tu)" : ""}
              </option>
            ))}
          </select>
        </div>

        {!isDiviso && (
          <div className="input-group">
            <label>Chi deve restituire i soldi?</label>
            <select
              value={debito.debitoreId}
              onChange={(e) => setDebito({...debito, debitoreId: e.target.value})}
              required
            >
              <option value="">-- Seleziona coinquilino debitore --</option>
              {coinquilini.map(c => (
                <option key={c.id} value={c.id}>
                  {c.username} {c.id === currentUser.uid ? "(Tu)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Salva Spesa"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/debiti")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
