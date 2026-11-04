import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  getDoc
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { showToast, showConfirm } from "../../utils/feedback";
import { sanitizeText, sanitizeChecklist } from "../../utils/security";
import {
  isUserOnVacation,
  getAvailableRoommates,
  rotateChoreAssignee
} from "../../utils/choreRotation";

export default function VisualizzaTurni() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [turni, setTurni] = useState([]);
  const [roommates, setRoommates] = useState([]);
  const [casaDoc, setCasaDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rotating, setRotating] = useState(false);

  // New subtask input state per turno: { [turnoId]: string }
  const [newSubTaskMap, setNewSubTaskMap] = useState({});

  const fetchTurni = useCallback(async () => {
    if (!userData?.casaId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch house doc
      try {
        const cSnap = await getDoc(doc(db, "case", userData.casaId));
        if (cSnap.exists()) setCasaDoc(cSnap.data());
      } catch {
        // Fallback
      }

      // 2. Fetch roommates
      const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
      const snapUtenti = await getDocs(qUtenti);
      const rList = [];
      snapUtenti.forEach((d) => {
        const u = d.data();
        rList.push({
          id: d.id,
          uid: d.id,
          username: u.username || "Coinquilino",
          inVacanza: Boolean(u.inVacanza),
          vacanzaInizio: u.vacanzaInizio || null,
          vacanzaFine: u.vacanzaFine || null
        });
      });
      setRoommates(rList);

      // 3. Fetch turni
      const q = query(collection(db, "turni"), where("casaId", "==", userData.casaId));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      data.sort((a, b) => new Date(a.data) - new Date(b.data));
      setTurni(data);
    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento dei turni.");
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
        "Operazione non autorizzata: turno non appartenente alla tua abitazione.",
        "error"
      );
      return;
    }

    const confirmed = await showConfirm({
      title: "Elimina Turno",
      message: "Sei sicuro di voler eliminare questo turno?",
      confirmText: "Elimina",
      cancelText: "Annulla",
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "turni", id));
      showToast("Turno eliminato con successo", "success");
      fetchTurni();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      showToast("Errore nell'eliminazione del turno.", "error");
    }
  };

  // Toggle checklist sub-task with atomic updateDoc
  const handleToggleSubTask = async (turnoId, subTaskId) => {
    const turnoTarget = turni.find((t) => t.id === turnoId);
    if (!turnoTarget) return;

    const currentChecklist = Array.isArray(turnoTarget.checklist)
      ? turnoTarget.checklist
      : [];

    const updatedChecklist = currentChecklist.map((item) => {
      if (item.id === subTaskId) {
        const nextState = !item.completed;
        return {
          ...item,
          completed: nextState,
          completedBy: nextState ? userData?.username || "Utente" : null,
          completedAt: nextState ? new Date().toISOString() : null
        };
      }
      return item;
    });

    const isAllDone =
      updatedChecklist.length > 0 && updatedChecklist.every((i) => i.completed);

    // Optimistic UI update
    setTurni((prev) =>
      prev.map((t) =>
        t.id === turnoId
          ? {
              ...t,
              checklist: updatedChecklist,
              completato: isAllDone,
              completatoIl: isAllDone ? new Date().toISOString() : null
            }
          : t
      )
    );

    try {
      await updateDoc(doc(db, "turni", turnoId), {
        checklist: updatedChecklist,
        completato: isAllDone,
        completatoIl: isAllDone ? new Date().toISOString() : null
      });
    } catch (err) {
      console.error("Errore aggiornamento checklist:", err);
      showToast("Errore durante il salvataggio della mansione", "error");
      fetchTurni(); // Revert on failure
    }
  };

  // Add sub-task directly on chore card
  const handleAddDirectSubTask = async (turnoId) => {
    const textToAdd = (newSubTaskMap[turnoId] || "").trim();
    if (!textToAdd) return;

    const cleanedText = sanitizeText(textToAdd, 100);
    if (!cleanedText) return;

    const turnoTarget = turni.find((t) => t.id === turnoId);
    if (!turnoTarget) return;

    const currentChecklist = Array.isArray(turnoTarget.checklist)
      ? turnoTarget.checklist
      : [];
    if (currentChecklist.length >= 20) {
      showToast("Limite massimo di 20 sotto-mansioni raggiunto.", "warning");
      return;
    }

    const newItem = {
      id: `chk_${Date.now()}_${currentChecklist.length}`,
      text: cleanedText,
      completed: false,
      completedBy: null,
      completedAt: null
    };

    const updatedChecklist = sanitizeChecklist([...currentChecklist, newItem]);

    setNewSubTaskMap((prev) => ({ ...prev, [turnoId]: "" }));
    setTurni((prev) =>
      prev.map((t) =>
        t.id === turnoId ? { ...t, checklist: updatedChecklist, completato: false } : t
      )
    );

    try {
      await updateDoc(doc(db, "turni", turnoId), {
        checklist: updatedChecklist,
        completato: false
      });
      showToast("Sotto-mansione aggiunta!", "success");
    } catch (err) {
      console.error("Errore aggiunta sotto-mansione:", err);
      showToast("Impossibile salvare la sotto-mansione", "error");
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
      showToast("Nessun coinquilino disponibile nella casa.", "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: "Rotazione Automatica Turni",
      message:
        "Vuoi avviare la rotazione per il prossimo ciclo? Il sistema assegnerà la prossima mansione al coinquilino disponibile successivo, saltando chi è in vacanza.",
      confirmText: "Avvia Rotazione",
      cancelText: "Annulla"
    });

    if (!confirmed) return;

    setRotating(true);
    try {
      const activeRoommates = getAvailableRoommates(roommates);
      if (activeRoommates.length === 0) {
        showToast("Tutti i coinquilini sono in vacanza: rotazione non possibile.", "warning");
        setRotating(false);
        return;
      }

      // Calculate next date (e.g. 7 days from last chore or tomorrow)
      let nextDateStr = new Date().toISOString().split("T")[0];
      if (turni.length > 0) {
        const lastChore = turni[turni.length - 1];
        if (lastChore.data) {
          const d = new Date(lastChore.data);
          d.setDate(d.getDate() + 7);
          nextDateStr = d.toISOString().split("T")[0];
        }
      }

      // Determine rotation order from house settings or alphabetical
      const rotationSettings = casaDoc?.impostazioniTurni || {};
      const explicitOrder = rotationSettings.ordineRotazione || [];

      // Last assignee
      const lastAssigneeUsername =
        turni.length > 0 && turni[turni.length - 1].nomi
          ? turni[turni.length - 1].nomi[0]
          : null;
      const lastAssigneeObj = roommates.find((r) => r.username === lastAssigneeUsername);

      const { assignee } = rotateChoreAssignee(
        lastAssigneeObj?.uid || null,
        activeRoommates,
        explicitOrder
      );

      if (!assignee) {
        showToast("Impossibile determinare il prossimo assegnatario.", "error");
        setRotating(false);
        return;
      }

      // Create new rotated chore
      const newChore = {
        nomi: [assignee.username],
        data: nextDateStr,
        luoghi: ["Pulizia Generale"],
        procedura: ["Rotazione automatica programmata"],
        fasciaOraria: ["10:00 - 11:00"],
        casaId: userData.casaId,
        utenteId: currentUser.uid,
        mansione: "Pulizia Generale",
        checklist: [
          { id: `chk_${Date.now()}_1`, text: "Pulire superfici e pavimenti", completed: false },
          { id: `chk_${Date.now()}_2`, text: "Svuotare cestini", completed: false }
        ],
        completato: false
      };

      await addDoc(collection(db, "turni"), newChore);
      showToast(`Nuovo turno assegnato con successo a ${assignee.username}!`, "success");
      fetchTurni();
    } catch (err) {
      console.error("Errore durante la rotazione:", err);
      showToast("Errore durante l'esecuzione della rotazione turni.", "error");
    } finally {
      setRotating(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "800px", margin: "2rem auto", textAlign: "center" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true"></i></p>
        <p style={{ marginTop: "10px" }}>Caricamento turni...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "860px", padding: "2.5rem", margin: "2rem auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>
            Turni Pulizia <i className="fas fa-broom" style={{ fontSize: "0.85em", marginLeft: "6px" }} aria-hidden="true"></i>
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.92rem" }}>
            Programma chi pulisce cosa nella casa
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRotateChores}
            disabled={rotating || isWholeHouseAway}
            title="Esegue una rotazione automatica del turno assegnandolo al coinquilino successivo"
            style={{ width: "auto", padding: "12px 18px" }}
          >
            {rotating ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Rotazione...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" aria-hidden="true"></i> Ruota Turni
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/turni/aggiungi")}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            <i className="fas fa-plus" aria-hidden="true"></i> Nuovo Turno
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
            color: "#b45309",
            marginBottom: "24px",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <i className="fas fa-plane-departure" style={{ fontSize: "1.4rem" }} aria-hidden="true"></i>
          <div>
            <strong style={{ fontSize: "0.95rem" }}>Casa Momentaneamente Vuota</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem" }}>
              Tutti i coinquilini risultano in vacanza o fuori casa. I turni di pulizia sono temporaneamente sospesi.
            </p>
          </div>
        </div>
      )}

      <div className="sidemenu-list-container">
        {turni.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-broom" style={{ fontSize: "3rem", opacity: 0.7 }} aria-hidden="true"></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              Nessun turno programmato. Inizia ad assegnare le mansioni!
            </p>
          </div>
        ) : (
          turni.map((turno) => {
            const turnoDate = new Date(turno.data);
            const isPast = !isNaN(turnoDate.getTime()) && turnoDate < new Date().setHours(0, 0, 0, 0);
            const checklist = Array.isArray(turno.checklist) ? turno.checklist : [];
            const completedCount = checklist.filter((i) => i.completed).length;

            return (
              <div
                key={turno.id}
                className="calendar-agenda-card"
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
                    {!isNaN(turnoDate.getTime()) ? turnoDate.toLocaleDateString("it-IT", { month: "short" }) : ""}
                  </span>
                </div>

                <div className="agenda-content-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                          <i className="fas fa-map-marker-alt" style={{ color: "var(--color-primary)", fontSize: "0.9em" }} aria-hidden="true"></i>
                          <span>{Array.isArray(turno.luoghi) ? turno.luoghi.join(", ") : (turno.luoghi || turno.mansione || "Pulizia")}</span>
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
                            <i className="fas fa-check-circle" aria-hidden="true"></i> Completato
                          </span>
                        )}
                      </div>

                      <p style={{ margin: "6px 0", color: "var(--text-secondary)", fontSize: "0.92rem" }}>
                        <i className="fas fa-user" style={{ marginRight: "6px", color: "var(--color-primary)" }} aria-hidden="true"></i>
                        Assegnato a: <strong style={{ color: "var(--text-main)" }}>{Array.isArray(turno.nomi) ? turno.nomi.join(", ") : turno.nomi}</strong>
                      </p>
                      <p style={{ margin: "4px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        <i className="far fa-clock" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                        {Array.isArray(turno.fasciaOraria) ? turno.fasciaOraria[0] : turno.fasciaOraria}
                      </p>
                      {turno.procedura && (
                        <p style={{ margin: "8px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          <i className="fas fa-info-circle" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                          {Array.isArray(turno.procedura) ? turno.procedura.join(", ") : turno.procedura}
                        </p>
                      )}

                      {/* Interactive Checklist Sub-Tasks */}
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "10px 14px",
                          background: "var(--bg-input)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-color)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                            <i className="fas fa-tasks" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                            Checklist ({completedCount}/{checklist.length})
                          </span>
                        </div>

                        {checklist.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                            {checklist.map((item) => (
                              <label
                                key={item.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  fontSize: "0.88rem",
                                  color: item.completed ? "var(--text-muted)" : "var(--text-main)",
                                  textDecoration: item.completed ? "line-through" : "none",
                                  margin: 0
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.completed)}
                                  onChange={() => handleToggleSubTask(turno.id, item.id)}
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    accentColor: "var(--color-success)",
                                    cursor: "pointer"
                                  }}
                                />
                                <span>{item.text}</span>
                                {item.completedBy && (
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                    (fatto da {item.completedBy})
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: "4px 0 8px 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                            Nessuna sotto-mansione definita.
                          </p>
                        )}

                        {/* Inline subtask quick adder */}
                        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                          <input
                            type="text"
                            placeholder="+ Aggiungi mansione..."
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
                              padding: "4px 8px",
                              fontSize: "0.82rem",
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-sm)"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDirectSubTask(turno.id)}
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.8rem", width: "auto" }}
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
                        style={{ padding: "6px 14px", fontSize: "0.85rem", width: "auto" }}
                        title="Modifica"
                      >
                        <i className="fas fa-edit" aria-hidden="true"></i> Modifica
                      </button>
                      <button
                        type="button"
                        className="btn-danger-outline"
                        onClick={() => handleDelete(turno.id)}
                        style={{ padding: "6px 12px", fontSize: "0.85rem", width: "auto" }}
                        title="Elimina"
                      >
                        <i className="fas fa-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button type="button" className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} aria-hidden="true"></i> Torna alla Dashboard
      </button>
    </div>
  );
}
