import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import "../../App.css";

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
      alert("Operazione non autorizzata: avviso non appartenente alla tua abitazione.");
      return;
    }

    if (autoreId !== currentUser.uid) {
      alert("Puoi eliminare solo i tuoi avvisi!");
      return;
    }

    if (!window.confirm("Sicuro di voler eliminare questa nota?")) return;

    try {
      await deleteDoc(doc(db, "note", id));
      fetchDatiReload();
    } catch (error) {
      alert("Errore durante l'eliminazione.");
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
          <h1 style={{ margin: 0, textAlign: "left" }}>Bacheca Condivisa 📌</h1>
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
            <span style={{ fontSize: "3rem", opacity: 0.7 }}>📝</span>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              Non ci sono comunicazioni attive.
            </p>
          </div>
        ) : (
          note.map((n) => {
            const isMia = n.autoreId === currentUser.uid;
            return (
              <div
                key={n.id}
                className="widget-card"
                style={{
                  textAlign: "left",
                  borderLeft: isMia ? "4px solid var(--color-primary)" : "4px solid var(--border-highlight)",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ color: "var(--color-primary)", fontSize: "0.9rem" }}>
                        <i className="fas fa-thumbtack"></i>
                      </span>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-main)" }}>{n.titolo}</h3>
                    </div>

                    <p style={{ margin: "8px 0", fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                      {n.contenuto}
                    </p>

                    {n.data && (
                      <p style={{ margin: "10px 0 0 0", fontSize: "0.85rem", color: "var(--color-warning)", fontWeight: "600" }}>
                        <i className="far fa-calendar-alt" style={{ marginRight: "6px" }}></i>
                        Scadenza / Evento: {new Date(n.data).toLocaleDateString("it-IT")}
                      </p>
                    )}

                    <p style={{ margin: "10px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Scritto da: <strong style={{ color: "var(--text-main)" }}>{utentiMap[n.autoreId] || "Coinquilino"}</strong>
                      {isMia && " (Tu)"}
                    </p>
                  </div>

                  {isMia && (
                    <div style={{ display: "flex", gap: "8px" }}>
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
              </div>
            );
          })
        )}
      </div>

      <button className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        ← Torna alla Dashboard
      </button>
    </div>
  );
}
