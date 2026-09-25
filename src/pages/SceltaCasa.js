import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { triggerConfetti } from "../components/Celebration";
import InteractiveMascot from "../components/InteractiveMascot";
import { sanitizeText, sanitizeAlphanumeric } from "../utils/security";
import "../App.css";

export default function SceltaCasa() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();

  const [nomeCasa, setNomeCasa] = useState("");
  const [codiceCasa, setCodiceCasa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const creaCasa = async () => {
    setError("");

    // Anti-Injection & text sanitization
    const cleanedNome = sanitizeText(nomeCasa, 50);
    if (!cleanedNome) {
      setError("Inserisci un nome valido per la casa (massimo 50 caratteri).");
      return;
    }

    setLoading(true);

    try {
      // Secure 6-character random alphanumeric code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let codice = "";
      for (let i = 0; i < 6; i++) {
        codice += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const casaRef = await addDoc(collection(db, "case"), {
        nome: cleanedNome,
        codiceUnivoco: codice,
        createdAt: new Date(),
        creatoreId: currentUser.uid
      });

      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: casaRef.id });

      setUserData({ ...userData, casaId: casaRef.id });
      triggerConfetti();
      alert(`Casa creata con successo! Il tuo codice invito è: ${codice}`);
      navigate("/home");
    } catch (e) {
      console.error(e);
      setError("Errore nella creazione della casa. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const uniscitiCasa = async () => {
    setError("");

    // Alphanumeric sanitization
    const cleanedCodice = sanitizeAlphanumeric(codiceCasa, 10);
    if (!cleanedCodice) {
      setError("Inserisci un codice invito valido.");
      return;
    }

    setLoading(true);

    try {
      const caseRef = collection(db, "case");
      const q = query(caseRef, where("codiceUnivoco", "==", cleanedCodice));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Codice casa non valido o non trovato. Verifica di averlo digitato correttamente.");
        setLoading(false);
        return;
      }

      const casaDoc = querySnapshot.docs[0];

      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: casaDoc.id });

      setUserData({ ...userData, casaId: casaDoc.id });
      triggerConfetti();
      alert(`Benvenuto in ${casaDoc.data().nome}! 🎉`);
      navigate("/home");
    } catch (e) {
      console.error(e);
      setError("Errore durante l'accesso alla casa.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="card" style={{ maxWidth: "580px" }}>
      <InteractiveMascot isError={!!error} errorMessage={error} />

      <h1>Configurazione Casa 🏠</h1>
      <p className="subtitle">Non fai ancora parte di un gruppo. Crea una casa o unisciti ai tuoi coinquilini!</p>

      {error && (
        <div className="error-alert">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* SEZIONE 1: CREA */}
      <div style={{ marginTop: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "2rem", textAlign: "left" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="fas fa-plus-circle" style={{ color: "var(--color-primary)" }}></i>
          Crea una nuova Casa
        </h3>
        <p className="subtitle" style={{ marginBottom: "14px", fontSize: "0.92rem" }}>
          Genera un nuovo nucleo e riceverai un codice invito univoco.
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Nome casa (es. Villa Arzilla, Appartamento 4B)"
            value={nomeCasa}
            maxLength={50}
            onChange={(e) => setNomeCasa(e.target.value)}
            style={{
              flex: 1,
              minWidth: "220px",
              padding: "14px 18px",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--border-color)",
              background: "var(--bg-input)",
              color: "var(--text-main)",
              outline: "none"
            }}
          />
          <button className="btn-primary" onClick={creaCasa} disabled={loading} style={{ width: "auto", padding: "14px 24px" }}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Crea Casa"}
          </button>
        </div>
      </div>

      {/* SEZIONE 2: UNISCITI */}
      <div style={{ marginTop: "2rem", textAlign: "left" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <i className="fas fa-key" style={{ color: "var(--color-accent)" }}></i>
          Unisciti con codice
        </h3>
        <p className="subtitle" style={{ marginBottom: "14px", fontSize: "0.92rem" }}>
          Hai ricevuto un codice dal tuo coinquilino? Inseriscilo qui.
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Codice (es. X7K9P2)"
            value={codiceCasa}
            maxLength={10}
            onChange={(e) => setCodiceCasa(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              minWidth: "220px",
              padding: "14px 18px",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--border-color)",
              background: "var(--bg-input)",
              color: "var(--text-main)",
              outline: "none",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontWeight: "bold"
            }}
          />
          <button className="btn-secondary" onClick={uniscitiCasa} disabled={loading} style={{ width: "auto", padding: "14px 24px" }}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : "Unisciti"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: "36px", textAlign: "center" }}>
        <button className="btn-text" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Esci dall'account
        </button>
      </div>
    </div>
  );
}
