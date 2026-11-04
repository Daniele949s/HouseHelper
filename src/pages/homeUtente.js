import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import HouseAnalytics from "../components/HouseAnalytics";
import HouseholdStatus from "../components/HouseholdStatus";
import { safeFloat, validateDate } from "../utils/security";
import { showToast, showConfirm } from "../utils/feedback";
import { isUserOnVacation } from "../utils/choreRotation";

export default function HomeUtente() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();

  const [casa, setCasa] = useState(null);
  const [prossimoTurno, setProssimoTurno] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [ultimoAvviso, setUltimoAvviso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Complete data sets for HouseAnalytics & Active Metrics
  const [turniList, setTurniList] = useState([]);
  const [debitiList, setDebitiList] = useState([]);
  const [spesaList, setSpesaList] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});

  // Vacation / Away Mode state
  const [inVacanza, setInVacanza] = useState(false);
  const [vacanzaInizio, setVacanzaInizio] = useState("");
  const [vacanzaFine, setVacanzaFine] = useState("");
  const [savingVacanza, setSavingVacanza] = useState(false);

  // Dismissed notifications in memory
  const [dismissedReminders, setDismissedReminders] = useState([]);

  useEffect(() => {
    if (userData) {
      setInVacanza(Boolean(userData.inVacanza));
      setVacanzaInizio(userData.vacanzaInizio || "");
      setVacanzaFine(userData.vacanzaFine || "");
    }
  }, [userData]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const casaId = userData.casaId;

        // 1. Casa entity
        const casaDoc = await getDoc(doc(db, "case", casaId));
        if (casaDoc.exists()) setCasa({ id: casaDoc.id, ...casaDoc.data() });

        // 2. Roommates map
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", casaId));
        const snapUtenti = await getDocs(qUtenti);
        const uMap = {};
        snapUtenti.forEach((d) => {
          uMap[d.id] = d.data().username || "Coinquilino";
        });
        setUtentiMap(uMap);

        const oggi = new Date().toISOString().split("T")[0];

        // 3. Cleaning Shifts
        const turniQuery = query(collection(db, "turni"), where("casaId", "==", casaId));
        const turniSnap = await getDocs(turniQuery);
        let allTurni = [];
        let mieiTurni = [];
        turniSnap.forEach((d) => {
          const data = d.data();
          const item = { id: d.id, ...data };
          allTurni.push(item);
          const isAssigned = (data.nomi && data.nomi.includes(userData?.username)) || data.utenteId === currentUser.uid;
          if (isAssigned && data.data >= oggi) {
            mieiTurni.push(item);
          }
        });
        mieiTurni.sort((a, b) => new Date(a.data) - new Date(b.data));
        setProssimoTurno(mieiTurni.length > 0 ? mieiTurni[0] : null);
        setTurniList(allTurni);

        // 4. Expenses & Debts
        const debitiQuery = query(collection(db, "debiti"), where("casaId", "==", casaId));
        const debitiSnap = await getDocs(debitiQuery);
        let allDebiti = [];
        let totale = 0;
        debitiSnap.forEach((d) => {
          const data = d.data();
          allDebiti.push({ id: d.id, ...data });
          const val = safeFloat(data.importo);
          if (data.debitoreId === currentUser.uid) totale -= val;
          if (data.creditoreId === currentUser.uid) totale += val;
        });
        setSaldo(totale);
        setDebitiList(allDebiti);

        // 5. Grocery List
        const spesaQuery = query(collection(db, "spesa"), where("casaId", "==", casaId));
        const spesaSnap = await getDocs(spesaQuery);
        let allSpesa = [];
        spesaSnap.forEach((d) => allSpesa.push({ id: d.id, ...d.data() }));
        setSpesaList(allSpesa);

        // 6. Bulletin Board Notices
        const noteQuery = query(collection(db, "note"), where("casaId", "==", casaId));
        const noteSnap = await getDocs(noteQuery);
        let noteList = [];
        noteSnap.forEach((d) => noteList.push({ id: d.id, ...d.data() }));
        noteList.sort(
          (a, b) =>
            (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) -
            (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0)
        );
        if (noteList.length > 0) setUltimoAvviso(noteList[0]);
      } catch (error) {
        console.error("Errore caricamento dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!currentUser || !userData) return;
    if (!userData.casaId) {
      navigate("/scelta-casa");
      return;
    }
    fetchDashboardData();
  }, [currentUser, userData, navigate]);

  // Vacation Mode Persistence Handler
  const handleSaveVacation = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (savingVacanza) return;

    if (vacanzaInizio && !validateDate(vacanzaInizio).isValid) {
      showToast("Data inizio vacanza non valida.", "error");
      return;
    }
    if (vacanzaFine && !validateDate(vacanzaFine).isValid) {
      showToast("Data fine vacanza non valida.", "error");
      return;
    }
    if (vacanzaInizio && vacanzaFine && vacanzaFine < vacanzaInizio) {
      showToast("La data di fine non può essere precedente alla data di inizio.", "error");
      return;
    }

    setSavingVacanza(true);
    try {
      const userRef = doc(db, "utenti", currentUser.uid);
      const payload = {
        inVacanza: Boolean(inVacanza),
        vacanzaInizio: inVacanza ? (vacanzaInizio || null) : null,
        vacanzaFine: inVacanza ? (vacanzaFine || null) : null
      };

      await updateDoc(userRef, payload);
      setUserData({ ...userData, ...payload });
      showToast(
        inVacanza
          ? "Modalità vacanza attivata! I turni non ti verranno assegnati."
          : "Modalità vacanza disattivata. Bentornato a casa!",
        "success"
      );
    } catch (err) {
      console.error("Errore salvataggio stato vacanza:", err);
      showToast("Errore durante il salvataggio dello stato vacanza.", "error");
    } finally {
      setSavingVacanza(false);
    }
  };

  // In-App Notifications / Reminders computation
  const activeReminders = useMemo(() => {
    const list = [];
    const oggi = new Date().toISOString().split("T")[0];
    const domaniDate = new Date();
    domaniDate.setDate(domaniDate.getDate() + 1);
    const domani = domaniDate.toISOString().split("T")[0];

    // 1. Chores due in <24h
    turniList.forEach((t) => {
      const isAssigned = (t.nomi && t.nomi.includes(userData?.username)) || t.utenteId === currentUser?.uid;
      if (isAssigned && !t.completato) {
        if (t.data === oggi) {
          list.push({
            id: `chore_today_${t.id}`,
            icon: "fa-bell",
            type: "warning",
            text: `Turno di oggi: ${t.mansione || (t.luoghi && t.luoghi.join(", ")) || "Pulizia"}! Ricordati di completarlo.`
          });
        } else if (t.data === domani) {
          list.push({
            id: `chore_tomorrow_${t.id}`,
            icon: "fa-calendar-check",
            type: "info",
            text: `Promemoria: domani hai il turno "${t.mansione || (t.luoghi && t.luoghi.join(", ")) || "Pulizia"}".`
          });
        }
      }
    });

    // 2. New expenses recorded recently (last 24h) by other roommates
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    debitiList.forEach((d) => {
      if (d.creditoreId !== currentUser?.uid) {
        const created = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
        if (created >= oneDayAgo) {
          list.push({
            id: `expense_${d.id}`,
            icon: "fa-receipt",
            type: "info",
            text: `Nuova spesa registrata: "${d.descrizione}" (${safeFloat(d.importo).toFixed(2)} €).`
          });
        }
      }
    });

    return list.filter((r) => !dismissedReminders.includes(r.id));
  }, [turniList, debitiList, currentUser?.uid, userData?.username, dismissedReminders]);

  const dismissReminder = (id) => {
    setDismissedReminders((prev) => [...prev, id]);
  };

  const lasciaCasa = async () => {
    const confirmed = await showConfirm({
      title: "Lascia Casa",
      message: "Sei sicuro di voler uscire da questa casa? Perderai l'accesso alle spese e ai turni condivisi.",
      confirmText: "Lascia Casa",
      cancelText: "Annulla",
      isDanger: true
    });

    if (!confirmed) return;

    try {
      const userDocRef = doc(db, "utenti", currentUser.uid);
      await updateDoc(userDocRef, { casaId: null });
      setUserData({ ...userData, casaId: null });
      showToast("Hai lasciato la casa.", "info");
      navigate("/scelta-casa");
    } catch (e) {
      console.error(e);
      showToast("Errore durante l'uscita.", "error");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "400px", margin: "40px auto" }}>
        <p style={{ color: "var(--text-secondary)" }}>
          <i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
        </p>
        <p style={{ marginTop: "16px" }}>Sincronizzazione della casa...</p>
      </div>
    );
  }

  const activeGroceriesCount = spesaList.filter((s) => !s.comprato).length;
  const userCurrentlyAway = isUserOnVacation(userData);

  return (
    <div style={{ maxWidth: "880px", width: "100%", margin: "0 auto" }}>
      {/* ================= 1. USER GREETING BANNER ================= */}
      <div className="dashboard-welcome-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div className="welcome-avatar" style={{ fontSize: "2.4rem", color: "var(--color-primary)" }}>
          <i className="fas fa-user-circle" aria-hidden="true"></i>
        </div>
        <div className="welcome-text" style={{ flex: 1, textAlign: "left" }}>
          <span className="welcome-greeting" style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Dashboard Coinquilino
          </span>
          <h1 className="welcome-username" style={{ margin: "2px 0 0 0", fontSize: "1.6rem" }}>
            Bentornato, <strong style={{ color: "var(--text-main)" }}>{userData?.username || "Utente"}</strong>
          </h1>
        </div>
        {userCurrentlyAway && (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "rgba(245, 158, 11, 0.15)",
              color: "#f59e0b",
              fontWeight: "700",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <i className="fas fa-plane-departure" aria-hidden="true"></i> Fuori Casa
          </span>
        )}
      </div>

      {/* ================= IN-APP NOTIFICATIONS & REMINDERS ================= */}
      {activeReminders.length > 0 && (
        <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeReminders.map((rem) => (
            <div
              key={rem.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderRadius: "var(--radius-md)",
                background: rem.type === "warning" ? "rgba(245, 158, 11, 0.12)" : "rgba(37, 99, 235, 0.08)",
                border: rem.type === "warning" ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(37, 99, 235, 0.2)",
                color: rem.type === "warning" ? "#b45309" : "#1d4ed8",
                fontSize: "0.9rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
                <i className={`fas ${rem.icon}`} aria-hidden="true" style={{ fontSize: "1.1rem" }}></i>
                <span>{rem.text}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissReminder(rem.id)}
                className="btn-text"
                style={{ padding: "2px 6px", color: "inherit", fontSize: "0.9rem" }}
                aria-label="Ignora promemoria"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ================= 2. HOUSEHOLD STATUS PRESENCE CARD ================= */}
      <div
        onClickCapture={(e) => {
          const btn = e.target.closest('button[title*="codice invito"]');
          if (btn && casa?.codiceUnivoco) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(casa.codiceUnivoco);
            }
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
          }
        }}
      >
        <HouseholdStatus
          casa={casa}
          roommateCount={Object.keys(utentiMap).length || 1}
          prossimoTurno={prossimoTurno}
          variant="full"
        />
        {copiedCode && (
          <span style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>Copiato!</span>
        )}
      </div>

      {/* ================= VACATION / AWAY MODE CONTROLS ================= */}
      <div
        className="card"
        style={{
          marginBottom: "16px",
          padding: "16px 20px",
          textAlign: "left",
          background: inVacanza ? "rgba(245, 158, 11, 0.04)" : "var(--bg-card)",
          border: inVacanza ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid var(--border-color)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: inVacanza ? "rgba(245, 158, 11, 0.15)" : "var(--bg-input)",
                color: inVacanza ? "#f59e0b" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem"
              }}
            >
              <i className="fas fa-plane-departure" aria-hidden="true"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-main)" }}>
                Modalità Fuori Casa / In Vacanza
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Se attiva, il sistema ti esclude automaticamente dalla rotazione e assegnazione turni.
              </p>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
            <input
              type="checkbox"
              checked={inVacanza}
              onChange={(e) => setInVacanza(e.target.checked)}
              style={{ width: "22px", height: "22px", accentColor: "#f59e0b" }}
            />
            <span style={{ fontWeight: "700", color: inVacanza ? "#f59e0b" : "var(--text-main)" }}>
              {inVacanza ? "Attiva (In Vacanza)" : "Disattivata"}
            </span>
          </label>
        </div>

        {inVacanza && (
          <form onSubmit={handleSaveVacation} style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "140px" }}>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Data Inizio Assenza
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={vacanzaInizio}
                  onChange={(e) => setVacanzaInizio(e.target.value)}
                  style={{ fontSize: "0.9rem", padding: "6px 10px" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: "140px" }}>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Data Fine Assenza
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={vacanzaFine}
                  min={vacanzaInizio}
                  onChange={(e) => setVacanzaFine(e.target.value)}
                  style={{ fontSize: "0.9rem", padding: "6px 10px" }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={savingVacanza}
                style={{ padding: "8px 16px", height: "38px", fontSize: "0.88rem", width: "auto" }}
              >
                {savingVacanza ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Salvataggio...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" aria-hidden="true"></i> Salva Date
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bento-grid">
        {/* ================= 3. QUICK SERVICES NAVIGATION ================= */}
        <div className="bento-services" aria-label="Servizi Rapidi">
          <button type="button" onClick={() => navigate("/turni")} className="service-btn">
            <span className="service-icon"><i className="fas fa-broom" aria-hidden="true"></i></span>
            <span>Turni</span>
          </button>
          <button type="button" onClick={() => navigate("/debiti")} className="service-btn">
            <span className="service-icon"><i className="fas fa-wallet" aria-hidden="true"></i></span>
            <span>Spese</span>
          </button>
          <button type="button" onClick={() => navigate("/spesa")} className="service-btn">
            <span className="service-icon"><i className="fas fa-shopping-cart" aria-hidden="true"></i></span>
            <span>Spesa</span>
          </button>
          <button type="button" onClick={() => navigate("/calendario")} className="service-btn">
            <span className="service-icon"><i className="fas fa-calendar-alt" aria-hidden="true"></i></span>
            <span>Calendario</span>
          </button>
          <button type="button" onClick={() => navigate("/bacheca")} className="service-btn">
            <span className="service-icon"><i className="fas fa-thumbtack" aria-hidden="true"></i></span>
            <span>Bacheca</span>
          </button>
          <button type="button" onClick={() => navigate("/documenti")} className="service-btn" aria-label="Gestione Documenti e Contratti">
            <span className="service-icon"><i className="fas fa-folder-open" aria-hidden="true"></i></span>
            <span>Documenti</span>
          </button>
          <button type="button" onClick={() => navigate("/contatti")} className="service-btn" aria-label="Rubrica Contatti Utili">
            <span className="service-icon"><i className="fas fa-address-book" aria-hidden="true"></i></span>
            <span>Contatti</span>
          </button>
        </div>

        {/* ================= 4. SUMMARY METRIC: UPCOMING CHORE ================= */}
        <div className="bento-item bento-turno">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  color: "#f59e0b",
                  fontSize: "1.4rem"
                }}
              >
                <i className="fas fa-broom" aria-hidden="true"></i>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0
                  }}
                >
                  Il tuo Prossimo Turno
                </h3>
              </div>
            </div>

            {prossimoTurno ? (
              <div style={{ marginTop: "10px" }}>
                <h2 style={{ fontSize: "1.6rem", color: "var(--text-main)", marginBottom: "4px" }}>
                  {prossimoTurno.mansione || "Pulizia"}
                </h2>
                <p
                  style={{
                    color: "#f59e0b",
                    fontWeight: "600",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <i className="far fa-calendar-alt" aria-hidden="true"></i>
                  <span>
                    {new Date(prossimoTurno.data).toLocaleDateString("it-IT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long"
                    })}
                  </span>
                </p>
              </div>
            ) : (
              <div style={{ padding: "12px 0" }}>
                <p style={{ color: "var(--color-success)", fontSize: "1.05rem", margin: 0, fontWeight: "500" }}>
                  <i className="fas fa-check-circle" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                  Nessun turno oggi. Casa splendente!
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/turni")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "#f59e0b" }}
          >
            <span>Gestisci tutti i turni</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 5. SUMMARY METRIC: NET EXPENSES BALANCE ================= */}
        <div className={`bento-item bento-saldo ${saldo >= 0 ? "saldo-pos" : "saldo-neg"}`}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  background: saldo >= 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  color: saldo >= 0 ? "var(--color-success)" : "var(--color-danger)",
                  fontSize: "1.4rem"
                }}
              >
                <i className="fas fa-wallet" aria-hidden="true"></i>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0
                  }}
                >
                  Bilancio Spese Personale
                </h3>
              </div>
            </div>

            <div>
              <h2
                style={{
                  fontSize: "2.4rem",
                  color: saldo >= 0 ? "var(--color-success)" : "var(--color-danger)",
                  margin: 0,
                  fontWeight: "800"
                }}
              >
                {saldo >= 0 ? "+" : ""}
                {safeFloat(saldo).toFixed(2)} €
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
                {saldo > 0
                  ? "Gli altri coinquilini ti devono dei soldi."
                  : saldo < 0
                  ? "Hai debiti pendenti verso la casa."
                  : "Siete tutti in parità!"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/debiti")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "var(--color-accent)" }}
          >
            <span>Vedi dettagli spese</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 6. SUMMARY METRIC: ACTIVE GROCERIES ================= */}
        <div className="bento-item bento-spesa-summary">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  background: "rgba(13, 148, 136, 0.15)",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  color: "var(--color-accent)",
                  fontSize: "1.4rem"
                }}
              >
                <i className="fas fa-shopping-basket" aria-hidden="true"></i>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0
                  }}
                >
                  Lista Spesa Attiva
                </h3>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: "2.4rem", color: "var(--text-main)", margin: 0, fontWeight: "800" }}>
                {activeGroceriesCount}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
                {activeGroceriesCount === 0
                  ? "Dispensa al completo! Nessun articolo mancante."
                  : activeGroceriesCount === 1
                  ? "1 articolo da acquistare per la casa."
                  : `${activeGroceriesCount} articoli da acquistare per la casa.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/spesa")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "var(--color-accent)" }}
          >
            <span>Vedi lista spesa</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 7. SUMMARY METRIC: LATEST BULLETIN NOTICE ================= */}
        <div className="bento-item bento-avviso">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            <div
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                padding: "8px 12px",
                borderRadius: "10px",
                color: "var(--color-primary)"
              }}
            >
              <i className="fas fa-thumbtack" aria-hidden="true"></i>
            </div>
            <h3
              style={{
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0
              }}
            >
              Ultimo Avviso in Bacheca
            </h3>
          </div>

          {ultimoAvviso ? (
            <div
              style={{
                background: "var(--bg-input)",
                padding: "16px 20px",
                borderRadius: "var(--radius-sm)",
                borderLeft: "4px solid var(--color-primary)"
              }}
            >
              <h4 style={{ color: "var(--text-main)", fontSize: "1.1rem", marginBottom: "4px", marginTop: 0 }}>
                {ultimoAvviso.titolo}
              </h4>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.92rem" }}>
                {ultimoAvviso.contenuto}
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Nessun avviso recente in bacheca.</p>
          )}

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/bacheca")}
            style={{ alignSelf: "flex-start", padding: "6px 0", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>Vai alla bacheca</span>
            <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} aria-hidden="true"></i>
          </button>
        </div>

        {/* ================= 8. HOUSE ANALYTICS CHARTS ================= */}
        <HouseAnalytics
          turni={turniList}
          debiti={debitiList}
          spesa={spesaList}
          utentiMap={utentiMap}
          currentUserId={currentUser?.uid}
        />

        {/* ================= 9. ACCOUNT SETTINGS & ACTIONS ================= */}
        <div className="bento-item bento-account">
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            <i className="fas fa-user-shield" style={{ marginRight: "8px" }} aria-hidden="true"></i>
            <span>Account HouseHelper</span>
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={lasciaCasa}
              className="btn-danger-outline"
              style={{ fontSize: "0.88rem" }}
            >
              <i className="fas fa-door-open" aria-hidden="true"></i>
              <span>Lascia Casa</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: "8px 16px", width: "auto", fontSize: "0.88rem" }}
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              <span>Esci</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
