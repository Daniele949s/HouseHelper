import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/feedback";
import { sanitizeText, validateDate } from "../../utils/security";

const PRIORITY_OPTIONS = [
  { id: "info", label: "Info", icon: "fas fa-info-circle" },
  { id: "importante", label: "Importante", icon: "fas fa-star" },
  { id: "urgente", label: "Urgente", icon: "fas fa-exclamation-triangle" },
  { id: "promemoria", label: "Promemoria", icon: "fas fa-bell" }
];

export default function ModificaNota() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nota, setNota] = useState({ titolo: "", contenuto: "", priorita: "info", data: "" });

  useEffect(() => {
    const fetchNota = async () => {
      if (!userData?.casaId) return;

      try {
        const docRef = doc(db, "note", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          showToast("Avviso non trovato o rimosso.", "error");
          navigate("/bacheca");
          return;
        }

        const data = docSnap.data();

        // Multi-tenant Security Check: Prevent accessing note belonging to another house
        if (data.casaId !== userData.casaId) {
          showToast("Accesso non consentito: questo avviso appartiene a un'altra abitazione.", "error");
          navigate("/bacheca");
          return;
        }

        // Authorization Check: Only author can edit
        if (data.autoreId !== currentUser.uid) {
          showToast("Non sei l'autore di questo avviso!", "warning");
          navigate("/bacheca");
          return;
        }

        setNota({
          titolo: data.titolo || "",
          contenuto: data.contenuto || "",
          priorita: data.priorita || "info",
          data: data.data || ""
        });
      } catch (err) {
        console.error("Errore fetch avviso:", err);
        setError("Impossibile caricare l'avviso.");
      } finally {
        setLoading(false);
      }
    };

    fetchNota();
  }, [id, currentUser, userData, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Input Sanitization
    const cleanedTitolo = sanitizeText(nota.titolo, 80);
    const cleanedContenuto = sanitizeText(nota.contenuto, 1500);

    if (!cleanedTitolo) {
      setError("Il titolo dell'avviso è obbligatorio.");
      return;
    }

    if (!cleanedContenuto) {
      setError("Il messaggio dell'avviso non può essere vuoto.");
      return;
    }

    let validDate = null;
    if (nota.data) {
      const dateRes = validateDate(nota.data);
      if (!dateRes.isValid) {
        setError(dateRes.error || "Data di scadenza non valida.");
        return;
      }
      validDate = dateRes.date;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "note", id), {
        titolo: cleanedTitolo,
        contenuto: cleanedContenuto,
        priorita: nota.priorita || "info",
        data: validDate,
        casaId: userData.casaId, // Household integrity
        autoreId: currentUser.uid // Preserve author
      });
      showToast("Avviso modificato con successo!", "success");
      navigate("/bacheca");
    } catch (err) {
      console.error("Errore aggiornamento nota:", err);
      setError("Errore durante l'aggiornamento dell'avviso.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "600px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x"></i></p>
        <p style={{ marginTop: "10px" }}>Verifica autorizzazioni e caricamento avviso...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "620px" }}>
      <h1 style={{ marginBottom: "6px" }}>Modifica Avviso <i className="fas fa-pen" style={{ fontSize: "0.85em", marginLeft: "6px" }}></i></h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>Aggiorna il messaggio per i tuoi coinquilini</p>

      {error && (
        <div className="error-alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        <div className="input-group">
          <label>Priorità avviso</label>
          <div className="pill-selector-group">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`pill-selector-btn ${nota.priorita === opt.id ? "active" : ""}`}
                onClick={() => setNota({ ...nota, priorita: opt.id })}
              >
                <i className={opt.icon}></i> {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label>Titolo (massimo 80 caratteri)</label>
            <span className="char-counter">{nota.titolo.length} / 80</span>
          </div>
          <input
            type="text"
            value={nota.titolo}
            onChange={(e) => setNota({ ...nota, titolo: e.target.value })}
            maxLength={80}
            required
          />
        </div>

        <div className="input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label>Messaggio (massimo 1500 caratteri)</label>
            <span className="char-counter">{nota.contenuto.length} / 1500</span>
          </div>
          <textarea
            value={nota.contenuto}
            onChange={(e) => setNota({ ...nota, contenuto: e.target.value })}
            maxLength={1500}
            required
            style={{ minHeight: "110px" }}
          />
        </div>

        <div className="input-group">
          <label>Data di riferimento / Scadenza (opzionale)</label>
          <input
            type="date"
            value={nota.data}
            onChange={(e) => setNota({ ...nota, data: e.target.value })}
            min="2020-01-01"
            max="2100-12-31"
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin"></i> : "Salva Modifiche"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/bacheca")}>
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
