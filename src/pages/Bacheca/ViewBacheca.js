import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { showConfirm, showToast } from "../../utils/feedback";

const PRIORITY_CONFIG = {
  urgente: {
    label: "Urgente",
    icon: "fas fa-exclamation-triangle",
    className: "priority-urgente"
  },
  importante: {
    label: "Importante",
    icon: "fas fa-star",
    className: "priority-importante"
  },
  promemoria: {
    label: "Promemoria",
    icon: "fas fa-bell",
    className: "priority-promemoria"
  },
  info: {
    label: "Info",
    icon: "fas fa-info-circle",
    className: "priority-info"
  }
};

export default function ViewBacheca() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [note, setNote] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDati = async () => {
      if (!userData?.casaId) return;
      setLoading(true);
      try {
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
        const snapUtenti = await getDocs(qUtenti);
        const map = {};
        snapUtenti.forEach((d) => {
          map[d.id] = d.data().username || "Sconosciuto";
        });
        setUtentiMap(map);

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
  }, [userData]);

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
      showToast("Operazione non autorizzata: avviso non appartenente alla tua abitazione.", "error");
      return;
    }

    if (autoreId !== currentUser.uid) {
      showToast("Puoi eliminare solo i tuoi avvisi!", "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: "Elimina Avviso",
      message: "Sicuro di voler eliminare questa nota?",
      confirmText: "Elimina",
      cancelText: "Annulla",
      isDanger: true
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "note", id));
      showToast("Avviso rimosso dalla bacheca.", "success");
      fetchDatiReload();
    } catch (error) {
      showToast("Errore durante l'eliminazione.", "error");
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "800px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: "10px" }}>Caricamento bacheca...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "820px", padding: "2.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>Bacheca Condivisa <i className="fas fa-thumbtack" style={{ fontSize: "0.85em", marginLeft: "6px" }}></i></h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.92rem" }}>
            Avvisi e messaggi importanti per la convivenza
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/bacheca/aggiungi")}
          style={{ width: "auto", padding: "12px 24px" }}
        >
          <i className="fas fa-plus"></i> Nuovo Avviso
        </button>
      </div>

      <div className="sidemenu-list-container">
        {note.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-clipboard-list" style={{ fontSize: "3rem", opacity: 0.7 }}></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              Non ci sono comunicazioni attive.
            </p>
          </div>
        ) : (
          note.map((n) => {
            const isMia = n.autoreId === currentUser.uid;
            const authorName = utentiMap[n.autoreId] || "Coinquilino";
            const initial = (authorName.charAt(0) || "U").toUpperCase();
            const prioKey = (n.priorita || "info").toLowerCase();
            const prioConfig = PRIORITY_CONFIG[prioKey] || PRIORITY_CONFIG.info;

            return (
              <div
                key={n.id}
                className={`bacheca-card ${isMia ? "is-author" : ""}`}
              >
                <div className="bacheca-card-header">
                  <div className="bacheca-header-left">
                    <span className={`bacheca-priority-tag ${prioConfig.className}`}>
                      <i className={prioConfig.icon}></i> {prioConfig.label}
                    </span>
                    <h3 className="bacheca-card-title">{n.titolo}</h3>
                  </div>

                  {isMia && (
                    <div className="bacheca-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => navigate(`/bacheca/modifica/${n.id}`)}
                        style={{ padding: "6px 12px", fontSize: "0.85rem", width: "auto" }}
                        title="Modifica"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn-danger-outline"
                        onClick={() => eliminaNota(n.id, n.autoreId)}
                        style={{ padding: "6px 12px", fontSize: "0.85rem", width: "auto" }}
                        title="Elimina"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  )}
                </div>

                <p className="bacheca-card-body">{n.contenuto}</p>

                {n.data && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--color-warning)", fontWeight: "600" }}>
                    <i className="far fa-calendar-alt" style={{ marginRight: "6px" }}></i>
                    Scadenza / Evento: {new Date(n.data).toLocaleDateString("it-IT")}
                  </p>
                )}

                <div className="bacheca-card-footer">
                  <div className="bacheca-author-badge">
                    <div className="bacheca-author-avatar">{initial}</div>
                    <span>
                      Scritto da: <strong style={{ color: "var(--text-main)" }}>{authorName}</strong>
                      {isMia && " (Tu)"}
                    </span>
                  </div>

                  {n.createdAt && (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      <i className="far fa-clock" style={{ marginRight: "4px" }}></i>
                      {new Date(n.createdAt?.toMillis ? n.createdAt.toMillis() : n.createdAt).toLocaleDateString("it-IT")}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }}></i> Torna alla Dashboard
      </button>
    </div>
  );
}
