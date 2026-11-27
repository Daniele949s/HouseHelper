import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useHousehold } from "../../contexts/HouseholdContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { fetchHouseholdData } from "../../services/householdService";
import {
  fetchHouseChores,
  deleteChore,
  buildToggledChecklist,
  toggleChoreSubtask,
  buildAddedSubtaskChecklist,
  addChoreSubtask,
  rotateAndCreateChore
} from "../../services/choreService";
import { showToast, showConfirm } from "../../utils/feedback";
import { isUserOnVacation } from "../../utils/choreRotation";

export default function VisualizzaTurni() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { house: ctxHouse, roommates: ctxRoommates } = useHousehold();
  const { t, language } = useLanguage();
  const [turni, setTurni] = useState([]);
  const [roommates, setRoommates] = useState([]);
  const [casaDoc, setCasaDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rotating, setRotating] = useState(false);

  // New subtask input state per turno: { [turnoId]: string }
  const [newSubTaskMap, setNewSubTaskMap] = useState({});

  const translateRef = useRef(t);
  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const householdCtxRef = useRef({ ctxHouse, ctxRoommates });
  useEffect(() => {
    householdCtxRef.current = { ctxHouse, ctxRoommates };
  }, [ctxHouse, ctxRoommates]);

  useEffect(() => {
    if (!ctxHouse || ctxHouse.id !== userData?.casaId) return;

    setCasaDoc((current) => current ?? ctxHouse);
    if (ctxRoommates?.length > 0) {
      setRoommates((current) => current.length === 0
        ? ctxRoommates.filter((u) => u && u.statoMembro !== 'pending')
        : current);
    }
  }, [ctxHouse, ctxRoommates, userData?.casaId]);

  const fetchTurni = useCallback(async () => {
    if (!userData?.casaId) return;
    setLoading(true);
    setError(null);
    try {
      const currentCtx = householdCtxRef.current;
      const canReuseCtx = Boolean(
        currentCtx?.ctxHouse && currentCtx.ctxHouse.id === userData.casaId &&
        Array.isArray(currentCtx.ctxRoommates) && currentCtx.ctxRoommates.length > 0
      );
      const [{ house, roommates: rList }, data] = await Promise.all([
        canReuseCtx
          ? Promise.resolve({ house: currentCtx.ctxHouse, roommates: currentCtx.ctxRoommates })
          : fetchHouseholdData(userData.casaId, translateRef.current("chores.defaultRoommate", {}, "Coinquilino")),
        fetchHouseChores(userData.casaId)
      ]);

      if (house) {
        setCasaDoc(house);
      }

      setRoommates(rList.filter((u) => u && u.statoMembro !== 'pending').map((u) => ({
        id: u.id,
        uid: u.uid,
        username: u.username || translateRef.current("chores.defaultRoommate", {}, "Coinquilino"),
        inVacanza: Boolean(u.inVacanza),
        vacanzaInizio: u.vacanzaInizio || null,
        vacanzaFine: u.vacanzaFine || null
      })));

      setTurni(data);
    } catch (err) {
      console.error(err);
      setError(translateRef.current("chores.loadError", {}, "Errore nel caricamento dei turni."));
    } finally {
      setLoading(false);
    }
  }, [userData?.casaId]);

  useEffect(() => {
    fetchTurni();
  }, [fetchTurni]);

  const handleDelete = async (id) => {
    const turnoTarget = turni.find((t) => t.id === id);
    if (!turnoTarget || turnoTarget.casaId !== userData?.casaId) {
      showToast(
        t("chores.deleteUnauthorized", {}, "Operazione non autorizzata: turno non appartenente alla tua abitazione."),
        "error"
      );
      return;
    }

    const confirmed = await showConfirm({
      title: t("chores.delete", {}, "Elimina Turno"),
      message: t("chores.deleteConfirmMessage", {}, "Vuoi eliminare questo turno di pulizia? L'assegnazione verrà rimossa per tutti i coinquilini."),
      confirmText: t("common.delete", {}, "Elimina"),
      cancelText: t("common.cancel", {}, "Annulla"),
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await deleteChore(turnoTarget, userData?.casaId);
      showToast(t("chores.deleteSuccess", {}, "Turno eliminato con successo"), "success");
      fetchTurni();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      showToast(t("chores.deleteError", {}, "Errore nell'eliminazione del turno."), "error");
    }
  };

  // Toggle checklist sub-task with atomic updateDoc
  const handleToggleSubTask = async (turnoId, subTaskId) => {
    const turnoTarget = turni.find((t) => t.id === turnoId);
    if (!turnoTarget) return;

    const actor = userData?.username || t("chores.defaultUser", {}, "Utente");
    const nextState = buildToggledChecklist(turnoTarget, subTaskId, actor);

    // Optimistic UI update
    setTurni((prev) =>
      prev.map((t) => (t.id === turnoId ? { ...t, ...nextState } : t))
    );

    try {
      await toggleChoreSubtask(turnoTarget, subTaskId, actor);
    } catch (err) {
      console.error("Errore aggiornamento checklist:", err);
      showToast(t("chores.checklistSaveError", {}, "Errore durante il salvataggio della mansione"), "error");
      fetchTurni(); // Revert on failure
    }
  };

  // Add sub-task directly on chore card
  const handleAddDirectSubTask = async (turnoId) => {
    const turnoTarget = turni.find((t) => t.id === turnoId);
    if (!turnoTarget) return;

    const result = buildAddedSubtaskChecklist(turnoTarget, newSubTaskMap[turnoId]);
    if (result.status === "empty") return;
    if (result.status === "limit_reached") {
      showToast(t("chores.subtaskLimitError", {}, "Limite massimo di 20 sotto-mansioni raggiunto."), "warning");
      return;
    }

    setNewSubTaskMap((prev) => ({ ...prev, [turnoId]: "" }));
    setTurni((prev) =>
      prev.map((t) =>
        t.id === turnoId ? { ...t, checklist: result.checklist, completato: false } : t
      )
    );

    try {
      await addChoreSubtask(turnoId, result.checklist);
      showToast(t("chores.subtaskAddSuccess", {}, "Sotto-mansione aggiunta!"), "success");
    } catch (err) {
      console.error("Errore aggiunta sotto-mansione:", err);
      showToast(t("chores.subtaskAddError", {}, "Impossibile salvare la sotto-mansione"), "error");
      fetchTurni();
    }
  };

  // Check if whole house is on vacation
  const isWholeHouseAway = useMemo(() => {
    if (roommates.length === 0) return false;
    return roommates.every((r) => isUserOnVacation(r));
  }, [roommates]);

  // Execute manual round-robin rotation trigger
  const handleRotateChores = async () => {
    if (rotating) return;
    if (roommates.length === 0) {
      showToast(t("chores.rotateNoRoommates", {}, "Nessun coinquilino disponibile nella casa."), "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: t("chores.rotateConfirmTitle", {}, "Rotazione Automatica Turni"),
      message: t(
        "chores.rotateConfirmMessage",
        {},
        "Vuoi avviare la rotazione dei turni? La mansione verrà assegnata al prossimo coinquilino disponibile, saltando chi è in vacanza."
      ),
      confirmText: t("chores.rotateConfirmBtn", {}, "Avvia Rotazione"),
      cancelText: t("common.cancel", {}, "Annulla")
    });

    if (!confirmed) return;

    setRotating(true);
    try {
      const result = await rotateAndCreateChore({
        casaId: userData.casaId,
        utenteId: currentUser.uid,
        casaDoc,
        roommates,
        turni,
        defaults: {
          location: t("chores.rotateDefaultLocation", {}, "Pulizia Generale"),
          procedure: t("chores.rotateDefaultProcedure", {}, "Rotazione automatica programmata"),
          task1: t("chores.rotateDefaultTask1", {}, "Pulire superfici e pavimenti"),
          task2: t("chores.rotateDefaultTask2", {}, "Svuotare cestini")
        }
      });

      if (result.status === "all_vacation") {
        showToast(t("chores.rotateAllVacation", {}, "Tutti i coinquilini sono in vacanza: rotazione non possibile."), "warning");
        return;
      }
      if (result.status === "no_assignee") {
        showToast(t("chores.rotateNoAssignee", {}, "Impossibile determinare il prossimo assegnatario."), "error");
        return;
      }

      showToast(
        t("chores.rotateSuccess", { name: result.assignee.username }, `Nuovo turno assegnato con successo a ${result.assignee.username}!`),
        "success"
      );
      fetchTurni();
    } catch (err) {
      console.error("Errore durante la rotazione:", err);
      showToast(t("chores.rotateError", {}, "Errore durante l'esecuzione della rotazione turni."), "error");
    } finally {
      setRotating(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "800px", margin: "2rem auto", textAlign: "center" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true"></i></p>
        <p style={{ marginTop: "10px" }}>{t("chores.loadingList", {}, "Caricamento turni...")}</p>
      </div>
    );
  }

  const today = new Date();
  const localDate = today.toLocaleDateString("en-CA");
  const oggiStr = /^\d{4}-\d{2}-\d{2}$/.test(localDate)
    ? localDate
    : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="card domain-page-card">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>
            {t("chores.pageTitle", {}, "Turni Pulizia")}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRotateChores}
            disabled={rotating || isWholeHouseAway}
            title={t("chores.rotateBtnTitle", {}, "Esegue una rotazione automatica del turno assegnandolo al coinquilino successivo")}
            style={{ width: "auto", padding: "12px 18px" }}
          >
            {rotating ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("chores.rotating", {}, "Rotazione...")}
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" aria-hidden="true"></i> {t("chores.rotateBtn", {}, "Ruota Turni")}
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/turni/aggiungi")}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            <i className="fas fa-plus" aria-hidden="true"></i> {t("chores.newChoreBtn", {}, "Nuovo Turno")}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i> {error}
        </div>
      )}

      {/* Whole-house absence fallback banner */}
      {isWholeHouseAway && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "var(--radius-md)",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            color: "var(--color-warning-text)",
            marginBottom: "24px",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <i className="fas fa-plane-departure" style={{ fontSize: "1.4rem" }} aria-hidden="true"></i>
          <div>
            <strong style={{ fontSize: "0.95rem" }}>{t("chores.houseEmptyTitle", {}, "Casa Momentaneamente Vuota")}</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem" }}>
              {t("chores.houseEmptyDesc", {}, "Tutti i coinquilini risultano in vacanza. I turni di pulizia sono temporaneamente in pausa.")}
            </p>
          </div>
        </div>
      )}

      <div className="sidemenu-list-container">
        {turni.length === 0 ? (
          <div className="empty-state-modern" style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-broom" style={{ fontSize: "3rem", opacity: 0.7, color: "var(--color-primary)" }} aria-hidden="true"></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: "16px" }}>
              {t("chores.emptyStateDesc", {}, "Nessun turno programmato. Inizia ad assegnare le mansioni!")}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/turni/aggiungi")}
              style={{ width: "auto", padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <i className="fas fa-plus" aria-hidden="true"></i> {t("chores.createFirstBtn", {}, "Crea il primo turno")}
            </button>
          </div>
        ) : (
          <>
            {/* 1. SIGNATURE SPOTLIGHT CARD FOR IMMINENT SHIFT (turni[0]) */}
            {(() => {
              const turno = turni[0];
              const turnoDate = new Date(`${turno.data}T00:00:00`);
              const isPast = !isNaN(turnoDate.getTime()) && turno.data < oggiStr;
              const isToday = turno.data === oggiStr;
              const checklist = Array.isArray(turno.checklist) ? turno.checklist : [];
              const completedCount = checklist.filter((i) => i.completed).length;
              const defaultRoommate = t("chores.defaultRoommate", {}, "Coinquilino");
              const assigneeName = Array.isArray(turno.nomi) ? turno.nomi.join(", ") : (turno.nomi || defaultRoommate);
              const assigneeInitial = (Array.isArray(turno.nomi) ? turno.nomi[0] : (turno.nomi || defaultRoommate)).charAt(0).toUpperCase();

              return (
                <div
                  key={turno.id}
                  className="chore-spotlight-card"
                  style={{
                    opacity: isPast ? 0.75 : 1,
                    marginBottom: "24px"
                  }}
                >
                  {/* Spotlight Top Bar: Imminent Tag + Progress Pill */}
                  <div className="spotlight-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        className="spotlight-tag"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "var(--radius-full)",
                          background: isToday ? "rgba(245, 158, 11, 0.15)" : "var(--color-primary-light)",
                          color: isToday ? "var(--color-warning-text)" : "var(--color-primary)",
                          fontSize: "0.82rem",
                          fontWeight: "700"
                        }}
                      >
                        <i className={isToday ? "fas fa-bell" : "fas fa-star"} aria-hidden="true"></i>
                        {isToday ? t("chores.todayTurnTag", {}, "Oggi tocca a...") : t("chores.featuredTurnTag", {}, "Turno in evidenza")}
                      </span>
                      {turno.completato && (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "var(--radius-full)",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "var(--color-success)",
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <i className="fas fa-check-circle" aria-hidden="true"></i> {t("chores.completed", {}, "Completato")}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {checklist.length > 0 && (
                        <span
                          className="spotlight-checklist-pill"
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            color: "var(--text-secondary)",
                            background: "var(--bg-input)",
                            padding: "4px 10px",
                            borderRadius: "var(--radius-full)",
                            border: "1px solid var(--border-color)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <i className="fas fa-tasks" aria-hidden="true"></i>
                          {t("chores.tasksCountPill", { completed: completedCount, total: checklist.length }, `${completedCount}/${checklist.length} mansioni`)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Spotlight Body */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ flex: 1, minWidth: "240px", textAlign: "left" }}>
                      {/* CRITICAL: Level 3 Heading for T1.10 cards[0] */}
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "1.45rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <i className="fas fa-map-marker-alt text-primary" style={{ fontSize: "0.9em" }} aria-hidden="true"></i>
                        <span>{Array.isArray(turno.luoghi) ? turno.luoghi.join(", ") : (turno.luoghi || turno.mansione || t("chores.defaultLocation", {}, "Pulizia"))}</span>
                      </h3>

                      {/* Prominent Assignee Avatar Row */}
                      <div className="spotlight-assignee-card" style={{ display: "flex", alignItems: "center", gap: "12px", margin: "10px 0" }}>
                        <div
                          className="spotlight-avatar"
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                            fontWeight: "700",
                            boxShadow: "var(--shadow-sm)"
                          }}
                        >
                          {assigneeInitial}
                        </div>
                        <div>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>{t("chores.assignedToColon", {}, "Assegnato a:")}</span>
                          <strong style={{ fontSize: "1.05rem", color: "var(--text-main)" }}>{assigneeName}</strong>
                        </div>
                      </div>

                      <p style={{ margin: "6px 0", color: "var(--text-secondary)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "8px" }}>
                        <i className="far fa-calendar-alt" aria-hidden="true"></i>
                        <span>
                          {!isNaN(turnoDate.getTime())
                            ? turnoDate.toLocaleDateString(language === "en" ? "en-US" : "it-IT", {
                                weekday: "long",
                                day: "numeric",
                                month: "long"
                              })
                            : "--"}
                        </span>
                        {turno.fasciaOraria && (
                          <span style={{ color: "var(--text-muted)" }}>
                            • {Array.isArray(turno.fasciaOraria) ? turno.fasciaOraria[0] : turno.fasciaOraria}
                          </span>
                        )}
                      </p>

                      {turno.procedura && (
                        <p style={{ margin: "6px 0", fontSize: "0.88rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          <i className="fas fa-info-circle" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                          {Array.isArray(turno.procedura) ? turno.procedura.join(", ") : turno.procedura}
                        </p>
                      )}

                      {/* Interactive Checklist Sub-Tasks */}
                      <div
                        style={{
                          marginTop: "14px",
                          padding: "12px 16px",
                          background: "var(--bg-input)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-color)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                            <i className="fas fa-tasks" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                            {t("chores.tasksHeading", { completed: completedCount, total: checklist.length }, `Mansioni (${completedCount}/${checklist.length})`)}
                          </span>
                        </div>

                        {checklist.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                            {checklist.map((item) => (
                              <label
                                key={item.id}
                                className="hh-touch-chip"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  cursor: "pointer",
                                  fontSize: "0.9rem",
                                  color: item.completed ? "var(--text-muted)" : "var(--text-main)",
                                  margin: 0,
                                  minHeight: "40px",
                                  padding: "6px 8px",
                                  borderRadius: "var(--radius-sm)",
                                  boxSizing: "border-box"
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.completed)}
                                  onChange={() => handleToggleSubTask(turno.id, item.id)}
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    accentColor: "var(--color-success)",
                                    cursor: "pointer",
                                    flexShrink: 0
                                  }}
                                />
                                <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px", flex: 1, minWidth: 0 }}>
                                  <span style={{ textDecoration: item.completed ? "line-through" : "none" }}>{item.text}</span>
                                  {item.completedBy && (
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", textDecoration: "none" }}>
                                      {t("chores.completedBy", { name: item.completedBy }, `(completato da ${item.completedBy})`)}
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: "4px 0 8px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                            {t("chores.noSubtasks", {}, "Nessuna mansione aggiunta.")}
                          </p>
                        )}

                        {/* Inline subtask adder */}
                        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                          <input
                            type="text"
                            aria-label={t("chores.addSubtaskLabel", {}, "Nuova mansione")}
                            placeholder={t("chores.addSubtaskPlaceholder", {}, "Aggiungi una mansione...")}
                            value={newSubTaskMap[turno.id] || ""}
                            onChange={(e) =>
                              setNewSubTaskMap({ ...newSubTaskMap, [turno.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddDirectSubTask(turno.id);
                              }
                            }}
                            maxLength={100}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              minHeight: "44px",
                              fontSize: "0.88rem",
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-sm)"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDirectSubTask(turno.id)}
                            className="btn-secondary"
                            style={{ padding: "8px 16px", minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", width: "auto" }}
                            aria-label={t("chores.quickAddSubtaskAria", {}, "Aggiungi mansione rapida")}
                          >
                            <i className="fas fa-plus" aria-hidden="true"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Spotlight Action Buttons */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", width: "100%", paddingTop: "4px" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate(`/turni/modifica/${turno.id}`)}
                        style={{ padding: "8px 16px", minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", width: "auto" }}
                        title={t("common.edit", {}, "Modifica")}
                      >
                        <i className="fas fa-edit" aria-hidden="true"></i> {t("common.edit", {}, "Modifica")}
                      </button>
                      <button
                        type="button"
                        className="btn-danger-outline"
                        onClick={() => handleDelete(turno.id)}
                        style={{ padding: "8px 14px", minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", width: "auto" }}
                        title={t("common.delete", {}, "Elimina")}
                        aria-label={t("chores.deleteAria", {}, "Elimina turno")}
                      >
                        <i className="fas fa-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. SUBSEQUENT CHORES: CALM CHRONOLOGICAL TIMELINE */}
            {turni.length > 1 && (
              <div className="timeline-chores-section">
                <h4 style={{ margin: "8px 0 12px 0", fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "left" }}>
                  {t("chores.upcomingChoresHeading", {}, "Turni successivi")}
                </h4>
                <div className="timeline-chores-list">
                {turni.slice(1).map((turno) => {
                  const turnoDate = new Date(`${turno.data}T00:00:00`);
                  const isPast = !isNaN(turnoDate.getTime()) && turno.data < oggiStr;
                  const checklist = Array.isArray(turno.checklist) ? turno.checklist : [];
                  const completedCount = checklist.filter((i) => i.completed).length;

                  return (
                    <div
                      key={turno.id}
                      className="calendar-agenda-card timeline-chore-card"
                      style={{
                        opacity: isPast ? 0.7 : 1,
                        borderLeft: turno.completato
                          ? "4px solid var(--color-success)"
                          : isPast
                          ? "4px solid var(--text-muted)"
                          : "4px solid var(--color-primary)"
                      }}
                    >
                      <div className="agenda-date-badge badge-turno">
                        <span className="day-num">{!isNaN(turnoDate.getTime()) ? turnoDate.getDate() : "--"}</span>
                        <span className="month-txt">
                          {!isNaN(turnoDate.getTime()) ? turnoDate.toLocaleDateString(language === "en" ? "en-US" : "it-IT", { month: "short" }) : ""}
                        </span>
                      </div>

                      <div className="agenda-content-body">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                          <div style={{ flex: 1, minWidth: "220px", textAlign: "left" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                              {/* CRITICAL: Level 3 Heading for T1.10 cards[1...] */}
                              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                                <i className="fas fa-map-marker-alt" style={{ color: "var(--color-primary)", fontSize: "0.85em" }} aria-hidden="true"></i>
                                <span>{Array.isArray(turno.luoghi) ? turno.luoghi.join(", ") : (turno.luoghi || turno.mansione || t("chores.defaultLocation", {}, "Pulizia"))}</span>
                              </h3>

                              {turno.completato && (
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: "var(--radius-full)",
                                    background: "rgba(16, 185, 129, 0.15)",
                                    color: "var(--color-success)",
                                    fontSize: "0.78rem",
                                    fontWeight: "700"
                                  }}
                                >
                                  <i className="fas fa-check-circle" aria-hidden="true"></i> {t("chores.completed", {}, "Completato")}
                                </span>
                              )}
                            </div>

                            <p style={{ margin: "6px 0", color: "var(--text-secondary)", fontSize: "0.92rem" }}>
                              <i className="fas fa-user" style={{ marginRight: "6px", color: "var(--color-primary)" }} aria-hidden="true"></i>
                              {t("chores.assignedToColon", {}, "Assegnato a:")} <strong style={{ color: "var(--text-main)" }}>{Array.isArray(turno.nomi) ? turno.nomi.join(", ") : turno.nomi}</strong>
                            </p>
                            <p style={{ margin: "4px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                              <i className="far fa-clock" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                              {Array.isArray(turno.fasciaOraria) ? turno.fasciaOraria[0] : turno.fasciaOraria}
                            </p>
                            {turno.procedura && (
                              <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                <i className="fas fa-info-circle" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                                {Array.isArray(turno.procedura) ? turno.procedura.join(", ") : turno.procedura}
                              </p>
                            )}

                            {/* Checklist Sub-Tasks */}
                            <div
                              style={{
                                marginTop: "10px",
                                padding: "10px 14px",
                                background: "var(--bg-input)",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--border-color)"
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                                  <i className="fas fa-tasks" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                                  {t("chores.tasksHeading", { completed: completedCount, total: checklist.length }, `Mansioni (${completedCount}/${checklist.length})`)}
                                </span>
                              </div>

                              {checklist.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                                  {checklist.map((item) => (
                                    <label
                                      key={item.id}
                                      className="hh-touch-chip"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        cursor: "pointer",
                                        fontSize: "0.9rem",
                                        color: item.completed ? "var(--text-muted)" : "var(--text-main)",
                                        margin: 0,
                                        minHeight: "40px",
                                        padding: "6px 8px",
                                        borderRadius: "var(--radius-sm)",
                                        boxSizing: "border-box"
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={Boolean(item.completed)}
                                        onChange={() => handleToggleSubTask(turno.id, item.id)}
                                        style={{
                                          width: "20px",
                                          height: "20px",
                                          accentColor: "var(--color-success)",
                                          cursor: "pointer",
                                          flexShrink: 0
                                        }}
                                      />
                                      <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px", flex: 1, minWidth: 0 }}>
                                        <span style={{ textDecoration: item.completed ? "line-through" : "none" }}>{item.text}</span>
                                        {item.completedBy && (
                                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", textDecoration: "none" }}>
                                            {t("chores.completedBy", { name: item.completedBy }, `(completato da ${item.completedBy})`)}
                                          </span>
                                        )}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ margin: "4px 0 8px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                                  {t("chores.noSubtasks", {}, "Nessuna mansione aggiunta.")}
                                </p>
                              )}

                              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                                <input
                                  type="text"
                                  aria-label={t("chores.addSubtaskLabel", {}, "Nuova mansione")}
                                  placeholder={t("chores.addSubtaskPlaceholder", {}, "Aggiungi una mansione...")}
                                  value={newSubTaskMap[turno.id] || ""}
                                  onChange={(e) =>
                                    setNewSubTaskMap({ ...newSubTaskMap, [turno.id]: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddDirectSubTask(turno.id);
                                    }
                                  }}
                                  maxLength={100}
                                  style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    minHeight: "44px",
                                    fontSize: "0.88rem",
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "var(--radius-sm)"
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddDirectSubTask(turno.id)}
                                  className="btn-secondary"
                                  style={{ padding: "8px 16px", minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", width: "auto" }}
                                  aria-label={t("chores.quickAddSubtaskAria", {}, "Aggiungi mansione rapida")}
                                >
                                  <i className="fas fa-plus" aria-hidden="true"></i>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "8px", alignSelf: "flex-start" }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => navigate(`/turni/modifica/${turno.id}`)}
                              style={{ padding: "8px 16px", minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", width: "auto" }}
                              title={t("common.edit", {}, "Modifica")}
                            >
                              <i className="fas fa-edit" aria-hidden="true"></i> {t("common.edit", {}, "Modifica")}
                            </button>
                            <button
                              type="button"
                              className="btn-danger-outline"
                              onClick={() => handleDelete(turno.id)}
                              style={{ padding: "8px 14px", minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", width: "auto" }}
                              title={t("common.delete", {}, "Elimina")}
                              aria-label={t("chores.deleteAria", {}, "Elimina turno")}
                            >
                              <i className="fas fa-trash" aria-hidden="true"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button type="button" className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} aria-hidden="true"></i> {t("chores.backToDashboard", {}, "Torna alla Home")}
      </button>
    </div>
  );
}
