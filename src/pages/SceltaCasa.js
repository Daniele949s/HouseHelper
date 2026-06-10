import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";

export default function SceltaCasa() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();
  
  const [nomeCasa, setNomeCasa] = useState("");
  const [codiceCasa, setCodiceCasa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const creaCasa = async () => {
    if (!nomeCasa.trim()) return;
    setError("");
    setLoading(true);
    
    try {
      // Genera codice univoco (6 caratteri alfanumerici)
      const codice = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Crea la casa in firestore
      const casaRef = await addDoc(collection(db, "case"), {
        nome: nomeCasa,
        codiceUnivoco: codice,
        createdAt: new Date()
      });

      // Aggiorna l'utente con l'ID della nuova casa
      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: casaRef.id });

      // Aggiorna context
      setUserData({ ...userData, casaId: casaRef.id });

      alert(`Casa creata! Il tuo codice invito è: ${codice}`);
      navigate("/home");
    } catch (e) { 
      console.error(e);
      setError("Errore nella creazione della casa. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const uniscitiCasa = async () => {
    if (!codiceCasa.trim()) return;
    setError("");
    setLoading(true);

    try {
      // Cerca la casa per codice
      const caseRef = collection(db, "case");
      const q = query(caseRef, where("codiceUnivoco", "==", codiceCasa.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Codice casa non valido.");
        setLoading(false);
        return;
      }

      // Prendi il primo risultato (il codice è univoco)
      const casaDoc = querySnapshot.docs[0];
      
      // Aggiorna utente
      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: casaDoc.id });

      // Aggiorna context
      setUserData({ ...userData, casaId: casaDoc.id });

      alert(`Benvenuto in ${casaDoc.data().nome}!`);
      navigate("/home");
    } catch (e) { 
      console.error(e);
      setError("Errore durante l'unione. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="card">
      <h1>Configurazione Casa 🏠</h1>
      <p className="subtitle">Non fai ancora parte di un gruppo. Inizia ora!</p>
      
      {error && <div className="error-alert" style={{marginBottom: '1rem'}}>{error}</div>}

      {/* SEZIONE 1: CREA */}
      <div style={{marginTop: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem'}}>
        <h3>Crea una nuova Casa</h3>
        <p className="subtitle" style={{marginBottom: '15px'}}>
            Crea un nuovo gruppo e invita i tuoi coinquilini.
        </p>
        <div className="input-group">
          <input 
            type="text"
            placeholder="Nome della tua casa (es. Villa Arzilla)" 
            value={nomeCasa} 
            onChange={e => setNomeCasa(e.target.value)} 
          />
          <button className="btn-primary" onClick={creaCasa} disabled={loading}>
            {loading ? "Creazione..." : "Crea Casa"}
          </button>
        </div>
      </div>

      {/* SEZIONE 2: UNISCITI */}
      <div style={{marginTop: '2rem'}}>
        <h3>Unisciti con un codice</h3>
        <p className="subtitle" style={{marginBottom: '15px'}}>
            Hai ricevuto un codice? Inseriscilo qui sotto.
        </p>
        <div className="input-group">
          <input 
            type="text"
            placeholder="Codice invito (es. X7K9P2)" 
            value={codiceCasa} 
            onChange={e => setCodiceCasa(e.target.value.toUpperCase())} 
          />
          <button className="btn-secondary" onClick={uniscitiCasa} disabled={loading}>
            {loading ? "Verifica..." : "Unisciti"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button className="btn-text" onClick={handleLogout}>
            Esci dall'account
          </button>
      </div>
    </div>
  );
}