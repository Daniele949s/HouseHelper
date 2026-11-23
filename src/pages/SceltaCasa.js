import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useHousehold } from "../contexts/HouseholdContext";
import { signOut } from "firebase/auth";
import {
  sanitizeText,
  sanitizeAlphanumeric,
  checkInviteCodeRateLimit,
  recordFailedInviteAttempt,
  clearInviteCodeRateLimit
} from "../utils/security";
import { showToast } from "../utils/feedback";
import { useLanguage } from "../contexts/LanguageContext";

export default function SceltaCasa() {
  const navigate = useNavigate();
  const { createHouse, joinHouse } = useHousehold();
  const { t } = useLanguage();

  const [nomeCasa, setNomeCasa] = useState("");
  const [codiceCasa, setCodiceCasa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const creaCasa = async () => {
    setError("");

    // Anti-Injection & text sanitization
    const cleanedNome = sanitizeText(nomeCasa, 50);
    if (!cleanedNome) {
      const err = t("houseChoice.invalidHouseName", {}, "Inserisci un nome valido per la casa (massimo 50 caratteri).");
      setError(err);
      return;
    }

    setLoading(true);

    try {
      const { inviteCode } = await createHouse(cleanedNome);
      showToast(
        t(
          "houseChoice.houseCreatedToast",
          { name: cleanedNome, code: inviteCode },
          `Casa "${cleanedNome}" creata con successo! Codice invito: ${inviteCode}`
        ),
        "success",
        5000
      );
      navigate("/home");
    } catch (e) {
      console.error(e);
      const err = t("houseChoice.createHouseError", {}, "Errore nella creazione della casa. Riprova.");
      setError(err);
      showToast(err, "error");
    } finally {
      setLoading(false);
    }
  };

  const uniscitiCasa = async () => {
    setError("");

    // Rate limiting against brute-force invite code guessing
    const rateLimit = checkInviteCodeRateLimit();
    if (!rateLimit.allowed) {
      setError(rateLimit.error);
      return;
    }

    // Alphanumeric sanitization
    const cleanedCodice = sanitizeAlphanumeric(codiceCasa, 10);
    if (!cleanedCodice) {
      const err = t("houseChoice.invalidInviteCodeInput", {}, "Inserisci un codice invito valido.");
      setError(err);
      return;
    }

    setLoading(true);

    try {
      const result = await joinHouse(cleanedCodice);

      if (!result) {
        recordFailedInviteAttempt();
        const err = t("houseChoice.houseNotFoundError", {}, "Codice casa non valido o non trovato. Verifica di averlo digitato correttamente.");
        setError(err);
        setLoading(false);
        return;
      }

      // Successful join: clear attempt history
      clearInviteCodeRateLimit();

      showToast(
        t("houseChoice.welcomeToHouseToast", { name: result.house.nome }, `Benvenuto in ${result.house.nome}!`),
        "success",
        3500
      );
      navigate("/home");
    } catch (e) {
      console.error(e);
      const err = t("houseChoice.joinHouseError", {}, "Errore durante l'accesso alla casa.");
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
        <h1>{t("houseChoice.title", {}, "Configurazione Casa")}</h1>
        <p className="subtitle">{t("houseChoice.subtitle", {}, "Non fai ancora parte di un gruppo. Crea una casa o unisciti ai tuoi coinquilini!")}</p>
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
            <span>{t("houseChoice.createTitle", {}, "Crea una nuova Casa")}</span>
          </h3>
          <p className="scelta-desc" style={{ marginBottom: "14px", fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            {t("houseChoice.createDesc", {}, "Dai un nome alla casa e riceverai un codice invito da condividere con i coinquilini.")}
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="input-with-icon" style={{ flex: 1, minWidth: "220px" }}>
              <input
                type="text"
                placeholder={t("houseChoice.houseNamePlaceholder", {}, "Nome casa (es. Villa Arzilla, Appartamento 4B)")}
                value={nomeCasa}
                maxLength={50}
                onChange={(e) => setNomeCasa(e.target.value)}
                aria-label={t("houseChoice.houseNameAria", {}, "Nome della casa da creare")}
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
                <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("houseChoice.creating", {}, "Creazione...")}</span>
              ) : (
                <span><i className="fas fa-plus" aria-hidden="true"></i> {t("houseChoice.createBtn", {}, "Crea Casa")}</span>
              )}
            </button>
          </div>
        </div>

        {/* OPZIONE 2: UNISCITI CON CODICE */}
        <div className="scelta-card scelta-unisciti" style={{ textAlign: "left" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 6px 0" }}>
            <i className="fas fa-key" style={{ color: "var(--color-accent)" }} aria-hidden="true"></i>
            <span>{t("houseChoice.joinTitle", {}, "Unisciti con codice")}</span>
          </h3>
          <p className="scelta-desc" style={{ marginBottom: "14px", fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            {t("houseChoice.joinDesc", {}, "Hai ricevuto un codice dal tuo coinquilino? Inseriscilo qui per accedere subito.")}
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="input-with-icon" style={{ flex: 1, minWidth: "220px" }}>
              <input
                type="text"
                placeholder={t("houseChoice.inviteCodePlaceholder", {}, "Codice (es. X7K9P2)")}
                value={codiceCasa}
                maxLength={10}
                onChange={(e) => setCodiceCasa(e.target.value.toUpperCase())}
                aria-label={t("houseChoice.inviteCodeAria", {}, "Codice invito per accedere alla casa")}
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
                <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("houseChoice.joining", {}, "Accesso...")}</span>
              ) : (
                <span><i className="fas fa-door-open" aria-hidden="true"></i> {t("houseChoice.joinBtn", {}, "Unisciti")}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Logout Action */}
      <div style={{ marginTop: "36px", textAlign: "center" }}>
        <button type="button" className="btn-text" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
          <span>{t("common.logout", {}, "Esci dall'account")}</span>
        </button>
      </div>
    </div>
  );
}
