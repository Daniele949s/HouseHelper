import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { sanitizeList, validateDate, sanitizeChecklist } from "../../utils/security";
import { showToast } from "../../utils/feedback";
import { isUserOnVacation } from "../../utils/choreRotation";

const generaFasceOrarie = () => {
  const orari = [];
  for (let i = 7; i < 23; i++) {
    const start = i.toString().padStart(2, "0") + ":00";
    const end = (i + 1).toString().padStart(2, "0") + ":00";
    orari.push(`${start} - ${end}`);
  }
  return orari;
};
const FASCE_DISPONIBILI = generaFasceOrarie();

export default function AggiuntaTurno() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roommates, setRoommates] = useState([]);

  const [turno, setTurno] = useState({
    nomi: "",
    data: "",
    luoghi: "",
    procedura: "",
    fasciaOraria: ""
  });

  // Sub-task checklist items state
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  useEffect(() => {
    const fetchRoommates = async () => {
      if (!userData?.casaId) return;
      try {
        const q = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach((d) => {
          const u = d.data();
          if (u.username) {
            list.push({
              id: d.id,
              uid: d.id,
              username: u.username,
              inVacanza: Boolean(u.inVacanza),
              vacanzaInizio: u.vacanzaInizio || null,
              vacanzaFine: u.vacanzaFine || null
            });
          }
        });
        setRoommates(list);
      } catch (e) {
        console.error("Errore fetch coinquilini:", e);
      }
    };
    fetchRoommates();
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTurno((prev) => ({ ...prev, [name]: value }));
  };

  const toggleRoommate = (username) => {
    const current = turno.nomi ? turno.nomi.split(",").map((n) => n.trim()).filter(Boolean) : [];
    const index = current.indexOf(username);
    let updated;
    if (index >= 0) {
      updated = current.filter((n) => n !== username);
    } else {
      updated = [...current, username];
    }
    setTurno((prev) => ({ ...prev, nomi: updated.join(", ") }));
  };

  const addZonePreset = (zone) => {
    const current = turno.luoghi ? turno.luoghi.split(",").map((z) => z.trim()).filter(Boolean) : [];
    if (!current.includes(zone)) {
      const updated = [...current, zone];
      setTurno((prev) => ({ ...prev, luoghi: updated.join(", ") }));
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      {
        id: `chk_${Date.now()}_${prev.length}`,
        text: newChecklistText.trim(),
        completed: false,
        completedBy: null,
        completedAt: null
      }
    ]);
    setNewChecklistText("");
  };

  const handleRemoveChecklistItem = (id) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Check if any selected roommate is currently on vacation on target date
  const selectedVacationingRoommates = React.useMemo(() => {
    const currentSelected = turno.nomi
      ? turno.nomi.split(",").map((n) => n.trim()).filter(Boolean)
      : [];
    return roommates.filter(
      (r) => currentSelected.includes(r.username) && isUserOnVacation(r, turno.data)
    );
  }, [turno.nomi, turno.data, roommates]);

  const ZONE_PRESET_LABELS = [
    t("chores.presetKitchen", {}, "Cucina"),
    t("chores.presetBathroom", {}, "Bagno"),
    t("chores.presetLivingRoom", {}, "Salotto"),
    t("chores.presetBalcony", {}, "Balcone"),
    t("chores.presetHallway", {}, "Corridoio"),
    t("chores.presetTrash", {}, "Pattumiera")
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit
    setError("");

    if (!userData?.casaId) {
      setError(t("chores.errorNoHouse", {}, "Devi prima far parte di una casa."));
      return;
    }

    // Input Validation & Anti-Injection
    const cleanedNomi = sanitizeList(turno.nomi, 10, 50);
    const cleanedLuoghi = sanitizeList(turno.luoghi, 10, 80);
    const cleanedProcedura = sanitizeList(turno.procedura, 10, 150);
    const dateValidation = validateDate(turno.data);

    if (cleanedNomi.length === 0) {
      setError(t("chores.errorNoAssignee", {}, "Specifica almeno una persona assegnata al turno."));
      return;
    }

    if (!dateValidation.isValid) {
      setError(dateValidation.error || t("chores.errorInvalidDate", {}, "Data del turno non valida."));
      return;
    }

    if (cleanedLuoghi.length === 0) {
      setError(t("chores.errorNoLocation", {}, "Specifica almeno un luogo o mansione da svolgere."));
      return;
    }

    if (!FASCE_DISPONIBILI.includes(turno.fasciaOraria)) {
      setError(t("chores.errorInvalidTimeSlot", {}, "Seleziona una fascia oraria valida dall'elenco."));
      return;
    }

    setLoading(true);

    const sanitizedChecklistItems = sanitizeChecklist(checklistItems, 20, 100);

    const turnoDaInviare = {
      nomi: cleanedNomi,
      data: dateValidation.date,
      luoghi: cleanedLuoghi,
      procedura: cleanedProcedura,
      fasciaOraria: [turno.fasciaOraria],
      casaId: userData.casaId,
      utenteId: currentUser.uid,
      mansione: cleanedLuoghi.join(", "),
      checklist: sanitizedChecklistItems,
      completato: false
    };

    try {
      await addDoc(collection(db, "turni"), turnoDaInviare);
      showToast(t("chores.createSuccess", {}, "Turno creato con successo!"), "success");
      navigate("/turni");
    } catch (err) {
      console.error("Errore aggiunta turno:", err);
      setError(t("chores.createError", {}, "Errore durante la creazione del turno."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "660px", margin: "2rem auto" }}>
      <h1 style={{ marginBottom: "6px" }}>
        {t("chores.newChoreTitle", {}, "Nuovo Turno Pulizia")}
      </h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>
        {t("chores.newChoreSubtitle", {}, "Assegna una mansione e pianifica le pulizie di casa")}
      </p>

      {error && (
        <div className="error-alert" role="alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        {/* Chi farà le pulizie */}
        <div className="input-group">
          <label htmlFor="turno-nomi">{t("chores.assignLabel", {}, "A chi è assegnato il turno? (nomi separati da virgola)")}</label>
          {roommates.length > 0 && (
            <div className="roommate-chips-group" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
              {roommates.map((r) => {
                const isSelected = turno.nomi.includes(r.username);
                const isAway = isUserOnVacation(r, turno.data);

                return (
                  <button
                    key={r.uid}
                    type="button"
                    onClick={() => toggleRoommate(r.username)}
                    className={`roommate-select-chip ${isSelected ? "selected" : ""}`}
                    style={{
                      background: isSelected
                        ? "var(--color-primary-light)"
                        : isAway
                        ? "rgba(245, 158, 11, 0.08)"
                        : "var(--bg-input)",
                      color: isSelected
                        ? "var(--color-primary)"
                        : isAway
                        ? "#d97706"
                        : "var(--text-secondary)",
                      border: `1px solid ${
                        isSelected
                          ? "var(--color-primary)"
                          : isAway
                          ? "#f59e0b"
                          : "var(--border-color)"
                      }`,
                      borderRadius: "var(--radius-full)",
                      padding: "8px 14px",
                      minHeight: "40px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    <i
                      className={
                        isSelected
                          ? "fas fa-check"
                          : isAway
                          ? "fas fa-plane-departure"
                          : "fas fa-user"
                      }
                      aria-hidden="true"
                    ></i>
                    <span>{r.username}</span>
                    {isAway && <span style={{ fontSize: "0.75rem", fontStyle: "italic" }}>{t("chores.onVacationTag", {}, "(In vacanza)")}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Warning banner if assigning vacationing roommate */}
          {selectedVacationingRoommates.length > 0 && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#b45309",
                fontSize: "0.85rem",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
              <span>
                {t(
                  "chores.vacationWarning",
                  { names: selectedVacationingRoommates.map((r) => r.username).join(", ") },
                  `Nota: ${selectedVacationingRoommates.map((r) => r.username).join(", ")} è in vacanza nella data selezionata.`
                )}
              </span>
            </div>
          )}

          <input
            id="turno-nomi"
            type="text"
            name="nomi"
            value={turno.nomi}
            onChange={handleChange}
            required
            maxLength={250}
            placeholder={t("chores.assignPlaceholder", {}, "es. Mario, Luca")}
            disabled={loading}
          />
        </div>

        {/* Data Turno */}
        <div className="input-group">
          <label htmlFor="turno-data">{t("chores.dateLabel", {}, "Data Turno *")}</label>
          <input
            id="turno-data"
            type="date"
            name="data"
            value={turno.data}
            onChange={handleChange}
            min="2020-01-01"
            max="2100-12-31"
            required
            disabled={loading}
          />
        </div>

        {/* Fascia Oraria */}
        <div className="input-group">
          <label htmlFor="turno-fascia">{t("chores.timeSlotLabel", {}, "Fascia Oraria *")}</label>
          <select
            id="turno-fascia"
            name="fasciaOraria"
            value={turno.fasciaOraria}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">{t("chores.selectTimeSlot", {}, "Seleziona una fascia oraria")}</option>
            {FASCE_DISPONIBILI.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Luoghi / Mansioni */}
        <div className="input-group">
          <label htmlFor="turno-luoghi">{t("chores.whatToCleanLabel", {}, "Cosa c'è da pulire? (separati da virgola) *")}</label>
          <div className="zone-chips-container" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {ZONE_PRESET_LABELS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => addZonePreset(z)}
                disabled={loading}
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 14px",
                  minHeight: "40px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <i className="fas fa-plus" aria-hidden="true" style={{ fontSize: "0.75rem", marginRight: "4px" }}></i>
                {z}
              </button>
            ))}
          </div>
          <input
            id="turno-luoghi"
            type="text"
            name="luoghi"
            value={turno.luoghi}
            onChange={handleChange}
            required
            maxLength={250}
            placeholder={t("chores.whatToCleanPlaceholder", {}, "es. Cucina, Bagno, Pavimento salotto")}
            disabled={loading}
          />
        </div>

        {/* Sotto-Mansioni Checklist (Milestone M7) */}
        <div
          className="input-group"
          style={{
            background: "var(--bg-input)",
            padding: "16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)"
          }}
        >
          <label style={{ margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <i className="fas fa-tasks text-primary" aria-hidden="true"></i>
            <span>{t("chores.checklistLabel", {}, "Checklist delle mansioni (opzionale)")}</span>
          </label>

          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <input
              type="text"
              placeholder={t("chores.checklistPlaceholder", {}, "es. Svuotare il cestino, lavare il lavello...")}
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              maxLength={100}
              disabled={loading}
              style={{ flex: 1, padding: "8px 12px", minHeight: "44px", fontSize: "0.9rem" }}
            />
            <button
              type="button"
              onClick={handleAddChecklistItem}
              disabled={loading || !newChecklistText.trim()}
              className="btn btn-secondary"
              style={{ padding: "8px 16px", minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", width: "auto" }}
            >
              <i className="fas fa-plus" aria-hidden="true"></i> {t("chores.addSubtaskBtn", {}, "Aggiungi mansione")}
            </button>
          </div>

          {checklistItems.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
              {checklistItems.map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    background: "var(--bg-card)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.88rem"
                  }}
                >
                  <span>
                    <i className="far fa-square" style={{ marginRight: "8px", color: "var(--text-muted)" }} aria-hidden="true"></i>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="btn-text"
                    style={{ padding: "8px", minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--color-danger)" }}
                    aria-label={t("chores.removeChecklistItemAria", { text: item.text }, `Rimuovi ${item.text}`)}
                  >
                    <i className="fas fa-times" aria-hidden="true"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Procedura extra */}
        <div className="input-group">
          <label htmlFor="turno-procedura">{t("chores.notesLabel", {}, "Note e istruzioni (opzionale)")}</label>
          <textarea
            id="turno-procedura"
            name="procedura"
            value={turno.procedura}
            onChange={handleChange}
            maxLength={500}
            placeholder={t("chores.notesPlaceholder", {}, "es. Svuotare la pattumiera dell'organico, passare lo straccio")}
            style={{ minHeight: "80px" }}
            disabled={loading}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("chores.saving", {}, "Salvataggio...")}</span>
            ) : (
              <span><i className="fas fa-plus" aria-hidden="true"></i> {t("chores.createBtn", {}, "Crea Turno")}</span>
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/turni")}
            disabled={loading}
          >
            {t("common.cancel", {}, "Annulla")}
          </button>
        </div>
      </form>
    </div>
  );
}
