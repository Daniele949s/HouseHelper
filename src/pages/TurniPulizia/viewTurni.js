import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import "../../App.css";

export default function VisualizzaTurni() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [turni, setTurni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTurni = async () => {
      if (!userData?.casaId) return;
      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, "turni"), where("casaId", "==", userData.casaId));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        data.sort((a, b) => new Date(a.data) - new Date(b.data));
        setTurni(data);
      } catch (err) {
        console.error(err);
        setError("Errore nel caricamento dei turni.");
      } finally {
        setLoading(false);
      }
    };

    fetchTurni();
  }, [userData]);

  const fetchTurniReload = async () => {
    if (!userData?.casaId) return;
    try {
      const q = query(collection(db, "turni"), where("casaId", "==", userData.casaId));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      data.sort((a, b) => new Date(a.data) - new Date(b.data));
      setTurni(data);
    } catch (err) {}
  };

  const handleDelete = async (id) => {
    // Household validation
    const turnoTarget = turni.find((t) => t.id === id);
    if (!turnoTarget || turnoTarget.casaId !== userData?.casaId) {
      alert("Operazione non autorizzata: turno non appartenente alla tua abitazione.");
      return;
    }

    if (!window.confirm("Sei sicuro di voler eliminare questo turno?")) return;
    try {
      await deleteDoc(doc(db, "turni", id));
      fetchTurniReload();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      alert("Errore nell'eliminazione del turno.");
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "800px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: "10px" }}>Caricamento turni...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "820px", padding: "2.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>Turni Pulizia 🧹</h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.92rem" }}>
            Programma chi pulisce cosa nella casa
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/turni/aggiungi")}
          style={{ width: "auto", padding: "12px 24px" }}
        >
          <i className="fas fa-plus"></i> Nuovo Turno
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div className="sidemenu-list-container">
        {turni.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <span style={{ fontSize: "3rem", opacity: 0.7 }}>🧹</span>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              Nessun turno programmato. Inizia ad assegnare le mansioni!
            </p>
          </div>
        ) : (
          turni.map((turno) => {
            const turnoDate = new Date(turno.data);
            const isPast = !isNaN(turnoDate.getTime()) && turnoDate < new Date().setHours(0, 0, 0, 0);

            return (
              <div
                key={turno.id}
                className="calendar-agenda-card"
                style={{ opacity: isPast ? 0.7 : 1 }}
              >
                <div className="agenda-date-badge badge-turno">
                  <span className="day-num">{!isNaN(turnoDate.getTime()) ? turnoDate.getDate() : "--"}</span>
                  <span className="month-txt">
                    {!isNaN(turnoDate.getTime()) ? turnoDate.toLocaleDateString("it-IT", { month: "short" }) : ""}
                  </span>
                </div>

                <div className="agenda-content-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-main)" }}>
                        {Array.isArray(turno.luoghi) ? turno.luoghi.join(", ") : (turno.luoghi || turno.mansione || "Pulizia")}
                      </h3>
                      <p style={{ margin: "6px 0", color: "var(--text-secondary)", fontSize: "0.92rem" }}>
                        <i className="fas fa-user" style={{ marginRight: "6px", color: "var(--color-primary)" }}></i>
                        Assegnato a: <strong style={{ color: "var(--text-main)" }}>{Array.isArray(turno.nomi) ? turno.nomi.join(", ") : turno.nomi}</strong>
                      </p>
                      <p style={{ margin: "4px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        <i className="far fa-clock" style={{ marginRight: "6px" }}></i>
                        {Array.isArray(turno.fasciaOraria) ? turno.fasciaOraria[0] : turno.fasciaOraria}
                      </p>
                      {turno.procedura && (
                        <p style={{ margin: "8px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          <i className="fas fa-info-circle" style={{ marginRight: "6px" }}></i>
                          {Array.isArray(turno.procedura) ? turno.procedura.join(", ") : turno.procedura}
                        </p>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignSelf: "flex-start" }}>
                      <button
                        className="btn-secondary"
                        onClick={() => navigate(`/turni/modifica/${turno.id}`)}
                        style={{ padding: "6px 14px", fontSize: "0.85rem", width: "auto" }}
                        title="Modifica"
                      >
                        <i className="fas fa-edit"></i> Modifica
                      </button>
                      <button
                        className="btn-danger-outline"
                        onClick={() => handleDelete(turno.id)}
                        style={{ padding: "6px 12px", fontSize: "0.85rem", width: "auto" }}
                        title="Elimina"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
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
