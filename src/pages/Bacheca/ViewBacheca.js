import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useHousehold } from "../../contexts/HouseholdContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { showConfirm, showToast } from "../../utils/feedback";

const PRIORITY_CONFIG = {
  urgente: {
    labelKey: "board.priorityUrgent",
    fallback: "Urgente",
    icon: "fas fa-exclamation-triangle",
    className: "priority-urgente"
  },
  importante: {
    labelKey: "board.priorityImportant",
    fallback: "Importante",
    icon: "fas fa-star",
    className: "priority-importante"
  },
  promemoria: {
    labelKey: "board.priorityReminder",
    fallback: "Promemoria",
    icon: "fas fa-bell",
    className: "priority-promemoria"
  },
  info: {
    labelKey: "board.priorityInfo",
    fallback: "Info",
    icon: "fas fa-info-circle",
    className: "priority-info"
  }
};

export default function ViewBacheca() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { roommateMap: utentiMap } = useHousehold();
  const { t, language } = useLanguage();

  const [note, setNote] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDati = async () => {
      if (!userData?.casaId) return;
      setLoading(true);
      try {
        const qNote = query(collection(db, "note"), where("casaId", "==", userData.casaId));
        const snapNote = await getDocs(qNote);
        const data = snapNote.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

        data.sort(
          (a, b) =>
            new Date(b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) -
            new Date(a.createdAt?.toMillis ? a.createdAt.toMillis() : 0)
        );
        setNote(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDati();
  }, [userData?.casaId]);

  const fetchDatiReload = async () => {
    if (!userData?.casaId) return;
    try {
      const qNote = query(collection(db, "note"), where("casaId", "==", userData.casaId));
      const snapNote = await getDocs(qNote);
      const data = snapNote.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      data.sort(
        (a, b) =>
          new Date(b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) -
          new Date(a.createdAt?.toMillis ? a.createdAt.toMillis() : 0)
      );
      setNote(data);
    } catch (err) {}
  };

  const eliminaNota = async (id, autoreId) => {
    // Multi-tenant & Authorization Checks
    const notaTarget = note.find((n) => n.id === id);
    if (!notaTarget || notaTarget.casaId !== userData?.casaId) {
      showToast(t("board.unauthorizedDelete", null, "Operazione non autorizzata: avviso non appartenente alla tua abitazione."), "error");
      return;
    }

    if (autoreId !== currentUser.uid) {
      showToast(t("board.deleteOwnOnly", null, "Puoi eliminare solo i tuoi avvisi!"), "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: t("board.deleteConfirmTitle", null, "Elimina Avviso"),
      message: t("board.deleteConfirmMessage", null, "Sicuro di voler eliminare questa nota?"),
      confirmText: t("common.delete", null, "Elimina"),
      cancelText: t("common.cancel", null, "Annulla"),
      isDanger: true
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "note", id));
      showToast(t("board.deleteSuccess", null, "Avviso rimosso dalla bacheca."), "success");
      fetchDatiReload();
    } catch (error) {
      showToast(t("board.deleteError", null, "Errore durante l'eliminazione."), "error");
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "800px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: "10px" }}>{t("board.loadingBoard", null, "Caricamento bacheca...")}</p>
      </div>
    );
  }

  const renderNoteCard = (n, isPinned = false) => {
    const isMia = n.autoreId === currentUser.uid;
    const authorName = utentiMap[n.autoreId] || t("board.roommateFallback", null, "Coinquilino");
    const initial = (authorName.charAt(0) || "U").toUpperCase();
    const prioKey = (n.priorita || "info").toLowerCase();
    const prioConfig = PRIORITY_CONFIG[prioKey] || PRIORITY_CONFIG.info;
    const dateLocale = language === "en" ? "en-US" : "it-IT";

    return (
      <div
        key={n.id}
        className={`bacheca-card ${isMia ? "is-author" : ""} ${isPinned ? "pinned-notice-card" : ""}`}
      >
        <div className="bacheca-card-header">
          <div className="bacheca-header-left">
            <span className={`bacheca-priority-tag ${prioConfig.className}`}>
              <i className={prioConfig.icon} aria-hidden="true"></i> {t(prioConfig.labelKey, null, prioConfig.fallback)}
            </span>
            <h3 className="bacheca-card-title">{n.titolo}</h3>
          </div>

          {isMia && (
            <div className="bacheca-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/bacheca/modifica/${n.id}`)}
                style={{
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  minWidth: "44px",
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "auto"
                }}
                title={t("common.edit", null, "Modifica")}
                aria-label={t("board.editAriaLabel", null, "Modifica avviso")}
              >
                <i className="fas fa-edit" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={() => eliminaNota(n.id, n.autoreId)}
                style={{
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  minWidth: "44px",
                  minHeight: "44px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "auto"
                }}
                title={t("common.delete", null, "Elimina")}
                aria-label={t("board.deleteAriaLabel", null, "Elimina avviso")}
              >
                <i className="fas fa-trash" aria-hidden="true"></i>
              </button>
            </div>
          )}
        </div>

        <p className="bacheca-card-body">{n.contenuto}</p>

        {n.data && (
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--color-warning)", fontWeight: "600" }}>
            <i className="far fa-calendar-alt" style={{ marginRight: "6px" }} aria-hidden="true"></i>
            {t("board.expiryEventLabel", null, "Scadenza / Evento:")} {new Date(n.data).toLocaleDateString(dateLocale)}
          </p>
        )}

        <div className="bacheca-card-footer">
          <div className="bacheca-author-badge">
            <div className="bacheca-author-avatar">{initial}</div>
            <span>
              {t("board.writtenBy", null, "Scritto da:")} <strong style={{ color: "var(--text-main)" }}>{authorName}</strong>
              {isMia && ` ${t("board.youBadge", null, "(Tu)")}`}
            </span>
          </div>

          {n.createdAt && (
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <i className="far fa-clock" style={{ marginRight: "4px" }} aria-hidden="true"></i>
              {new Date(n.createdAt?.toMillis ? n.createdAt.toMillis() : n.createdAt).toLocaleDateString(dateLocale)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const isUrgent = (n) => (n.priorita === "urgente" || n.priorita === "importante");
  const pinnedNotes = note.filter(isUrgent);
  const routineNotes = note.filter((n) => !isUrgent(n));

  return (
    <div className="card domain-page-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>{t("board.sharedTitle", null, "Bacheca Condivisa")}</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/bacheca/aggiungi")}
          style={{ width: "auto", padding: "12px 24px" }}
        >
          <i className="fas fa-plus" aria-hidden="true"></i> {t("board.newNoticeBtn", null, "Nuovo Avviso")}
        </button>
      </div>

      <div className="sidemenu-list-container">
        {note.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-clipboard-list" style={{ fontSize: "3rem", opacity: 0.7 }} aria-hidden="true"></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              {t("board.emptyState", null, "Non ci sono comunicazioni attive. Lascia il primo avviso per i tuoi coinquilini!")}
            </p>
          </div>
        ) : (
          <>
            {/* Pinned Urgent Notice Signature Anchor */}
            {pinnedNotes.length > 0 && (
              <div className="bacheca-pinned-section">
                <div className="bacheca-pinned-header">
                  <span className="bacheca-pinned-dispatch-label">
                    <i className="fas fa-thumbtack" aria-hidden="true"></i> {t("board.pinnedLabel", null, "Avviso in Evidenza")}
                  </span>
                  <span className="bacheca-pinned-sublabel">{t("board.pinnedSublabel", null, "Comunicazioni prioritarie per la casa")}</span>
                </div>
                <div className="bacheca-pinned-list">
                  {pinnedNotes.map((n) => renderNoteCard(n, true))}
                </div>
              </div>
            )}

            {/* Routine Notices Paper-Quiet List */}
            {routineNotes.length > 0 && (
              <div className="bacheca-routine-section">
                {pinnedNotes.length > 0 && (
                  <div className="bacheca-routine-heading">{t("board.otherNotices", null, "Altri avvisi")}</div>
                )}
                <div className="bacheca-routine-list">
                  {routineNotes.map((n) => renderNoteCard(n, false))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button type="button" className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} aria-hidden="true"></i> {t("board.backToDashboard", null, "Torna alla Home")}
      </button>
    </div>
  );
}
