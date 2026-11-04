import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { sanitizeText, sanitizeAlphanumeric } from "../utils/security";
import { showToast } from "../utils/feedback";

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
      const err = "Inserisci un nome valido per la casa (massimo 50 caratteri).";
      setError(err);
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
      showToast(`Casa "${cleanedNome}" creata con successo! Codice invito: ${codice}`, "success", 5000);
      navigate("/home");
    } catch (e) {
      console.error(e);
      const err = "Errore nella creazione della casa. Riprova.";
      setError(err);
      showToast(err, "error");
    } finally {
      setLoading(false);
    }
  };

  const uniscitiCasa = async () => {
    setError("");

    // Alphanumeric sanitization
    const cleanedCodice = sanitizeAlphanumeric(codiceCasa, 10);
    if (!cleanedCodice) {
      const err = "Inserisci un codice invito valido.";
      setError(err);
      return;
    }

    setLoading(true);

    try {
      const caseRef = collection(db, "case");
      const q = query(caseRef, where("codiceUnivoco", "==", cleanedCodice));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const err = "Codice casa non valido o non trovato. Verifica di averlo digitato correttamente.";
        setError(err);
        setLoading(false);
        return;
      }

      const casaDoc = querySnapshot.docs[0];

      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: casaDoc.id });

      setUserData({ ...userData, casaId: casaDoc.id });
      showToast(`Benvenuto in ${casaDoc.data().nome}!`, "success", 3500);
      navigate("/home");
    } catch (e) {
      console.error(e);
      const err = "Errore durante l'accesso alla casa.";
      setError(err);
      showToast(err, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="card scelta-casa-card" style={{ maxWidth: "620px" }}>
      {/* Brand Header */}
      <div className="auth-brand-badge" aria-hidden="true">
        <i className="fas fa-house-chimney"></i>
      </div>

      <div className="auth-header">
        <h1>
          Configurazione Casa <i className="fas fa-home" style={{ fontSize: "0.85em", marginLeft: "6px" }}></i>
        </h1>
        <p className="subtitle">Non fai ancora parte di un gruppo. Crea una casa o unisciti ai tuoi coinquilini!</p>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Modern Split Cards */}
      <div className="scelta-casa-split-grid" style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "1.5rem" }}>
        {/* OPZIONE 1: CREA CASA */}
        <div className="scelta-card scelta-crea" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "2rem", textAlign: "left" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 6px 0" }}>
            <i className="fas fa-plus-circle" style={{ color: "var(--color-primary)" }} aria-hidden="true"></i>
            <span>Crea una nuova Casa</span>
          </h3>
          <p className="scelta-desc" style={{ marginBottom: "14px", fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            Genera un nuovo nucleo e riceverai un codice invito univoco per i tuoi coinquilini.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="input-with-icon" style={{ flex: 1, minWidth: "220px" }}>
              <input
                type="text"
                placeholder="Nome casa (es. Villa Arzilla, Appartamento 4B)"
                value={nomeCasa}
                maxLength={50}
                onChange={(e) => setNomeCasa(e.target.value)}
                aria-label="Nome della casa da creare"
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid var(--border-color)",
                  background: "var(--bg-input)",
                  color: "var(--text-main)",
                  outline: "none"
                }}
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={creaCasa}
              disabled={loading}
              style={{ width: "auto", padding: "14px 24px" }}
            >
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Creazione...</span>
              ) : (
                <span><i className="fas fa-plus" aria-hidden="true"></i> Crea Casa</span>
              )}
            </button>
          </div>
        </div>

        {/* OPZIONE 2: UNISCITI CON CODICE */}
        <div className="scelta-card scelta-unisciti" style={{ textAlign: "left" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 6px 0" }}>
            <i className="fas fa-key" style={{ color: "var(--color-accent)" }} aria-hidden="true"></i>
            <span>Unisciti con codice</span>
          </h3>
          <p className="scelta-desc" style={{ marginBottom: "14px", fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            Hai ricevuto un codice dal tuo coinquilino? Inseriscilo qui per accedere subito.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="input-with-icon" style={{ flex: 1, minWidth: "220px" }}>
              <input
                type="text"
                placeholder="Codice (es. X7K9P2)"
                value={codiceCasa}
                maxLength={10}
                onChange={(e) => setCodiceCasa(e.target.value.toUpperCase())}
                aria-label="Codice invito per accedere alla casa"
                style={{
                  width: "100%",
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
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={uniscitiCasa}
              disabled={loading}
              style={{ width: "auto", padding: "14px 24px" }}
            >
              {loading ? (
                <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Accesso...</span>
              ) : (
                <span><i className="fas fa-door-open" aria-hidden="true"></i> Unisciti</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Logout Action */}
      <div style={{ marginTop: "36px", textAlign: "center" }}>
        <button type="button" className="btn-text" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
          <span>Esci dall'account</span>
        </button>
      </div>
    </div>
  );
}
