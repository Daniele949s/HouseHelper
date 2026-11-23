import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { showToast } from "../../utils/feedback";
import { sanitizeText, validateDate } from "../../utils/security";

const EVENT_CATEGORIES = [
  { id: "Generale", labelKey: "calendar.catGeneral", fallback: "Generale", icon: "fas fa-bookmark" },
  { id: "Cena / Festa", labelKey: "calendar.catDinnerParty", fallback: "Cena / Festa", icon: "fas fa-utensils" },
  { id: "Manutenzione", labelKey: "calendar.catMaintenance", fallback: "Manutenzione", icon: "fas fa-wrench" },
  { id: "Bollette / Scadenze", labelKey: "calendar.catBills", fallback: "Bollette", icon: "fas fa-receipt" },
  { id: "Ospiti", labelKey: "calendar.catGuests", fallback: "Ospiti", icon: "fas fa-user-friends" }
];

export default function AggiungiEvento() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, currentUser } = useAuth();
  const { t } = useLanguage();

  const [titolo, setTitolo] = useState("");
  const [contenuto, setContenuto] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [categoria, setCategoria] = useState("Generale");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location.state?.dataPreimpostata) {
      try {
        const dataObj = new Date(location.state.dataPreimpostata);
        if (!isNaN(dataObj.getTime())) {
          const dataString = dataObj.toLocaleDateString("en-CA");
          const validation = validateDate(dataString);
          if (validation.isValid) {
            setDataEvento(validation.date);
          }
        }
      } catch (err) {
        console.error("Data non valida:", err);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Input Sanitization & Anti-Injection
    const cleanedTitolo = sanitizeText(titolo, 80);
    const cleanedContenuto = sanitizeText(contenuto, 1500);
    const dateValidation = validateDate(dataEvento);

    if (!cleanedTitolo) {
      setError(t("calendar.errorTitleRequired", null, "Il titolo dell'evento è obbligatorio."));
      return;
    }

    if (!dateValidation.isValid) {
      setError(dateValidation.error || t("calendar.errorDateMissing", null, "Data non specificata."));
      return;
    }

    if (!cleanedContenuto) {
      setError(t("calendar.errorContentRequired", null, "Inserisci una descrizione o orario per l'evento."));
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "note"), {
        titolo: cleanedTitolo,
        contenuto: cleanedContenuto,
        categoria: categoria || "Generale",
        data: dateValidation.date,
        autoreId: currentUser.uid,
        casaId: userData.casaId,
        createdAt: new Date(),
        isEvento: true
      });
      showToast(t("calendar.addSuccess", null, "Evento aggiunto al calendario con successo!"), "success");
      navigate("/calendario");
    } catch (e) {
      setError(t("calendar.saveError", null, "Errore durante il salvataggio dell'evento."));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>{t("calendar.newEventTitle", null, "Nuovo Evento Calendario")}</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>{t("calendar.newEventSubtitle", null, "Aggiungi una data o un impegno per tutti gli abitanti")}</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <div
            id="add-event-category"
            style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)", fontSize: "0.88rem", letterSpacing: "0.01em" }}
          >
            {t("calendar.categoryLabel", null, "Categoria evento")}
          </div>
          <div className="pill-selector-group" role="group" aria-labelledby="add-event-category">
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`pill-selector-btn ${categoria === cat.id ? "active" : ""}`}
                aria-pressed={categoria === cat.id}
                onClick={() => setCategoria(cat.id)}
              >
                <i className={cat.icon}></i> {t(cat.labelKey, null, cat.fallback)}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="add-event-title">{t("calendar.eventTitleLabel", null, "Titolo Evento (massimo 80 caratteri)")}</label>
            <span className="char-counter">{titolo.length} / 80</span>
          </div>
          <input
            id="add-event-title"
            type="text"
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            placeholder={t("calendar.eventTitlePlaceholder", null, "es. Cena di Casa, Affitto in scadenza, Manutenzione caldaia")}
            maxLength={80}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="add-event-date" style={{ color: "var(--color-primary)" }}>{t("calendar.dateRequiredLabel", null, "Data (Obbligatoria)")}</label>
          <input
            id="add-event-date"
            type="date"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
            min="2020-01-01"
            max="2100-12-31"
            required
          />
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="add-event-details">{t("calendar.detailsLabel", null, "Dettagli / Note / Orario (massimo 1500 caratteri)")}</label>
            <span className="char-counter">{contenuto.length} / 1500</span>
          </div>
          <textarea
            id="add-event-details"
            value={contenuto}
            onChange={(e) => setContenuto(e.target.value)}
            placeholder={t("calendar.detailsPlaceholder", null, "Orario preciso, note organizzative, chi partecipa...")}
            maxLength={1500}
            required
            style={{ minHeight: "100px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : t("calendar.saveEventBtn", null, "Salva Evento")}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/calendario")}>
            {t("common.cancel", null, "Annulla")}
          </button>
        </div>
      </form>
    </div>
  );
}
