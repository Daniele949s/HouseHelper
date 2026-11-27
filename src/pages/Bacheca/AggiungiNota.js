import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { showToast } from "../../utils/feedback";
import { sanitizeText, validateDate } from "../../utils/security";

const PRIORITY_OPTIONS = [
  { id: "info", labelKey: "board.priorityInfo", fallback: "Info", icon: "fas fa-info-circle" },
  { id: "importante", labelKey: "board.priorityImportant", fallback: "Importante", icon: "fas fa-star" },
  { id: "urgente", labelKey: "board.priorityUrgent", fallback: "Urgente", icon: "fas fa-exclamation-triangle" },
  { id: "promemoria", labelKey: "board.priorityReminder", fallback: "Promemoria", icon: "fas fa-bell" }
];

export default function AggiungiNota() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nota, setNota] = useState({
    titolo: "",
    contenuto: "",
    priorita: "info",
    data: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Input Sanitization & Anti-Injection
    const cleanedTitolo = sanitizeText(nota.titolo, 80);
    const cleanedContenuto = sanitizeText(nota.contenuto, 1500);

    if (!cleanedTitolo) {
      setError(t("board.errorTitleRequired", null, "Il titolo dell'avviso è obbligatorio."));
      return;
    }

    if (!cleanedContenuto) {
      setError(t("board.errorContentRequired", null, "Il messaggio dell'avviso è obbligatorio."));
      return;
    }

    let validDate = null;
    if (nota.data) {
      const dateRes = validateDate(nota.data);
      if (!dateRes.isValid) {
        setError(dateRes.error || t("board.errorInvalidDate", null, "Data non valida."));
        return;
      }
      validDate = dateRes.date;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "note"), {
        titolo: cleanedTitolo,
        contenuto: cleanedContenuto,
        priorita: nota.priorita || "info",
        data: validDate,
        autoreId: currentUser.uid,
        casaId: userData.casaId,
        createdAt: new Date()
      });
      showToast(t("board.publishSuccess", null, "Avviso pubblicato con successo!"), "success");
      navigate("/bacheca");
    } catch (err) {
      console.error("Errore salvataggio nota:", err);
      setError(t("board.saveError", null, "Errore durante il salvataggio dell'avviso."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>{t("board.newNoticeTitle", null, "Nuovo Avviso")}</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>{t("board.newNoticeSubtitle", null, "Condividi una comunicazione con tutti i coinquilini")}</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <div
            id="add-note-priority"
            style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)", fontSize: "0.88rem", letterSpacing: "0.01em" }}
          >
            {t("board.priorityLabel", null, "Priorità avviso")}
          </div>
          <div className="pill-selector-group" role="group" aria-labelledby="add-note-priority">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`pill-selector-btn ${nota.priorita === opt.id ? "active" : ""}`}
                aria-pressed={nota.priorita === opt.id}
                onClick={() => setNota({ ...nota, priorita: opt.id })}
              >
                <i className={opt.icon}></i> {t(opt.labelKey, null, opt.fallback)}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="add-note-title">{t("board.titleLabel", null, "Titolo (massimo 80 caratteri)")}</label>
            <span className="char-counter">{nota.titolo.length} / 80</span>
          </div>
          <input
            id="add-note-title"
            type="text"
            value={nota.titolo}
            onChange={(e) => setNota({ ...nota, titolo: e.target.value })}
            placeholder={t("board.titlePlaceholder", null, "Oggetto dell'avviso")}
            maxLength={80}
            required
          />
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="add-note-message">{t("board.messageDetailsLabel", null, "Messaggio / Dettagli (massimo 1500 caratteri)")}</label>
            <span className="char-counter">{nota.contenuto.length} / 1500</span>
          </div>
          <textarea
            id="add-note-message"
            value={nota.contenuto}
            onChange={(e) => setNota({ ...nota, contenuto: e.target.value })}
            placeholder={t("board.messagePlaceholder", null, "Scrivi qui il messaggio dettagliato...")}
            maxLength={1500}
            required
            style={{ minHeight: "110px" }}
          />
        </div>

        <div className="input-group">
          <label htmlFor="add-note-date">{t("board.optionalDateLabel", null, "Data scadenza o evento (opzionale)")}</label>
          <input
            id="add-note-date"
            type="date"
            value={nota.data}
            onChange={(e) => setNota({ ...nota, data: e.target.value })}
            min="2020-01-01"
            max="2100-12-31"
          />
        </div>

        <div className="hh-form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate("/bacheca")}>
            {t("common.cancel", null, "Annulla")}
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> : t("board.publishBtn", null, "Pubblica Avviso")}
          </button>
        </div>
      </form>
    </div>
  );
}
