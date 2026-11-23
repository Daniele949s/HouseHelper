import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  CHORE_TIME_SLOTS as FASCE_DISPONIBILI,
  fetchChoreById,
  validateAndBuildChorePayload,
  updateChore
} from "../../services/choreService";
import { showToast } from "../../utils/feedback";

export default function ModificaTurno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [turno, setTurno] = useState({
    nomi: "",
    data: "",
    luoghi: "",
    procedura: "",
    fasciaOraria: ""
  });

  useEffect(() => {
    const fetchTurno = async () => {
      if (!userData?.casaId) return;

      try {
        const res = await fetchChoreById(id, userData.casaId);
        if (res.status === "not_found") {
          showToast(t("chores.notFoundError", {}, "Turno non trovato o precedentemente rimosso."), "error");
          navigate("/turni");
          return;
        }
        if (res.status === "unauthorized") {
          showToast(t("chores.unauthorizedHouseError", {}, "Accesso non consentito: questo turno appartiene a un'altra abitazione."), "error");
          navigate("/turni");
          return;
        }

        const data = res.chore;
        setTurno({
          nomi: Array.isArray(data.nomi) ? data.nomi.join(", ") : (data.nomi || ""),
          data: data.data || "",
          luoghi: Array.isArray(data.luoghi) ? data.luoghi.join(", ") : (data.luoghi || ""),
          procedura: Array.isArray(data.procedura) ? data.procedura.join(", ") : (data.procedura || ""),
          fasciaOraria: Array.isArray(data.fasciaOraria) ? data.fasciaOraria[0] : (data.fasciaOraria || "")
        });
      } catch (err) {
        console.error("Errore fetch turno:", err);
        setError(t("chores.loadOneError", {}, "Impossibile caricare il turno."));
      } finally {
        setLoading(false);
      }
    };

    fetchTurno();
  }, [id, userData, navigate, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTurno((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validation = validateAndBuildChorePayload({
      nomi: turno.nomi,
      data: turno.data,
      luoghi: turno.luoghi,
      procedura: turno.procedura,
      fasciaOraria: turno.fasciaOraria,
      casaId: userData.casaId,
      isEdit: true
    });

    if (!validation.valid) {
      const errorMap = {
        no_assignee_edit: t("chores.editErrorNoAssignee", {}, "Indica almeno un coinquilino per questo turno."),
        invalid_date_edit: validation.errorMessage || t("chores.editErrorInvalidDate", {}, "Data non valida."),
        no_location_edit: t("chores.editErrorNoLocation", {}, "Specifica almeno una stanza o luogo da pulire."),
        invalid_time_slot: t("chores.errorInvalidTimeSlot", {}, "Seleziona una fascia oraria valida dall'elenco.")
      };
      setError(errorMap[validation.errorKey]);
      return;
    }

    setSaving(true);

    try {
      await updateChore(id, validation.payload);
      showToast(t("chores.updateSuccess", {}, "Turno aggiornato con successo!"), "success");
      navigate("/turni");
    } catch (err) {
      console.error("Errore aggiornamento turno:", err);
      setError(t("chores.updateError", {}, "Errore durante l'aggiornamento del turno."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "600px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true"></i></p>
        <p style={{ marginTop: "10px" }}>{t("chores.loadingAuth", {}, "Verifica autorizzazioni e caricamento turno...")}</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>
        {t("chores.edit", {}, "Modifica Turno")}
      </h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>{t("chores.editSubtitle", {}, "Aggiorna data, zona o coinquilini assegnati")}</p>

      {error && (
        <div className="error-alert" role="alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <label htmlFor="edit-nomi">{t("chores.editAssignLabel", {}, "Coinquilini assegnati (separati da virgola)")}</label>
          <input
            id="edit-nomi"
            type="text"
            name="nomi"
            value={turno.nomi}
            onChange={handleChange}
            maxLength={250}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="edit-data">{t("chores.editDateLabel", {}, "Data del turno *")}</label>
          <input
            id="edit-data"
            type="date"
            name="data"
            value={turno.data}
            onChange={handleChange}
            min="2020-01-01"
            max="2100-12-31"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="edit-fascia">{t("chores.editTimeSlotLabel", {}, "Orario indicativo *")}</label>
          <select id="edit-fascia" name="fasciaOraria" value={turno.fasciaOraria} onChange={handleChange} required>
            <option value="">{t("chores.selectTimeSlot", {}, "Seleziona una fascia oraria")}</option>
            {FASCE_DISPONIBILI.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="edit-luoghi">{t("chores.editLocationLabel", {}, "Zona o mansione *")}</label>
          <input
            id="edit-luoghi"
            type="text"
            name="luoghi"
            value={turno.luoghi}
            onChange={handleChange}
            maxLength={250}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="edit-procedura">{t("chores.notesLabel", {}, "Note e istruzioni (opzionale)")}</label>
          <textarea
            id="edit-procedura"
            name="procedura"
            value={turno.procedura}
            onChange={handleChange}
            maxLength={500}
            style={{ minHeight: "80px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("chores.saving", {}, "Salvataggio...")}</span>
            ) : (
              <span><i className="fas fa-check" aria-hidden="true"></i> {t("chores.saveChangesBtn", {}, "Salva Modifiche")}</span>
            )}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/turni")}>
            {t("common.cancel", {}, "Annulla")}
          </button>
        </div>
      </form>
    </div>
  );
}
