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
import { getOfflineData, saveOfflineData } from "../utils/offlineStorage";

export default function HomeUtente() {
  const navigate = useNavigate();
  const { currentUser, userData, setUserData } = useAuth();

  const cachedInitial = useMemo(() => {
    if (userData?.casaId) {
      return getOfflineData(userData.casaId, "dashboard_cache");
    }
    return null;
  }, [userData?.casaId]);

  const [casa, setCasa] = useState(() => cachedInitial?.casa || null);
  const [prossimoTurno, setProssimoTurno] = useState(() => cachedInitial?.prossimoTurno || null);
  const [saldo, setSaldo] = useState(() => cachedInitial?.saldo || 0);
  const [ultimoAvviso, setUltimoAvviso] = useState(() => cachedInitial?.ultimoAvviso || null);
  const [loading, setLoading] = useState(() => !cachedInitial);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Complete data sets for HouseAnalytics & Active Metrics
  const [turniList, setTurniList] = useState(() => cachedInitial?.turniList || []);
  const [debitiList, setDebitiList] = useState(() => cachedInitial?.debitiList || []);
  const [spesaList, setSpesaList] = useState(() => cachedInitial?.spesaList || []);
  const [utentiMap, setUtentiMap] = useState(() => cachedInitial?.utentiMap || {});

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
      const casaId = userData.casaId;
      if (!casaId) return;

      // Hydrate state from offline cache if available
      const cached = getOfflineData(casaId, "dashboard_cache");
      if (cached) {
        if (cached.casa) setCasa(cached.casa);
        if (cached.prossimoTurno !== undefined) setProssimoTurno(cached.prossimoTurno);
        if (cached.saldo !== undefined) setSaldo(cached.saldo);
        if (cached.ultimoAvviso !== undefined) setUltimoAvviso(cached.ultimoAvviso);
        if (cached.turniList) setTurniList(cached.turniList);
        if (cached.debitiList) setDebitiList(cached.debitiList);
        if (cached.spesaList) setSpesaList(cached.spesaList);
        if (cached.utentiMap) setUtentiMap(cached.utentiMap);
        setLoading(false);
      }

      setIsSyncing(true);
      try {
        const casaRef = doc(db, "case", casaId);
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", casaId));
        const turniQuery = query(collection(db, "turni"), where("casaId", "==", casaId));
        const debitiQuery = query(collection(db, "debiti"), where("casaId", "==", casaId));
        const spesaQuery = query(collection(db, "spesa"), where("casaId", "==", casaId));
        const noteQuery = query(collection(db, "note"), where("casaId", "==", casaId));

        // Concurrently fetch all independent queries via Promise.all
        const [casaDoc, snapUtenti, turniSnap, debitiSnap, spesaSnap, noteSnap] = await Promise.all([
          getDoc(casaRef),
          getDocs(qUtenti),
          getDocs(turniQuery),
          getDocs(debitiQuery),
          getDocs(spesaQuery),
          getDocs(noteQuery)
        ]);

        // 1. Casa entity
        let casaData = null;
        if (casaDoc.exists()) {
          casaData = { id: casaDoc.id, ...casaDoc.data() };
          setCasa(casaData);
        }

        // 2. Roommates map
        const uMap = {};
        snapUtenti.forEach((d) => {
          uMap[d.id] = d.data().username || "Coinquilino";
        });
        setUtentiMap(uMap);

        const oggi = new Date().toISOString().split("T")[0];

        // 3. Cleaning Shifts
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
        const nextTurno = mieiTurni.length > 0 ? mieiTurni[0] : null;
        setProssimoTurno(nextTurno);
        setTurniList(allTurni);

        // 4. Expenses & Debts
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
        let allSpesa = [];
        spesaSnap.forEach((d) => allSpesa.push({ id: d.id, ...d.data() }));
        setSpesaList(allSpesa);

        // 6. Bulletin Board Notices
        let noteList = [];
        noteSnap.forEach((d) => noteList.push({ id: d.id, ...d.data() }));
        noteList.sort(
          (a, b) =>
            (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) -
            (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0)
        );
        const nextNotice = noteList.length > 0 ? noteList[0] : null;
        setUltimoAvviso(nextNotice);

        // Save refreshed data to tenant-scoped offline storage
        saveOfflineData(casaId, "dashboard_cache", {
          casa: casaData,
          prossimoTurno: nextTurno,
          saldo: totale,
          ultimoAvviso: nextNotice,
          turniList: allTurni,
          debitiList: allDebiti,
          spesaList: allSpesa,
          utentiMap: uMap
        });
      } catch (error) {
        console.error("Errore caricamento dashboard:", error);
      } finally {
        setLoading(false);
        setIsSyncing(false);
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

  const activeGroceriesCount = spesaList.filter((s) => !s.comprato).length;
  const userCurrentlyAway = isUserOnVacation(userData);

  // Active roommate presence list
  const roommatesList = useMemo(() => {
    return Object.entries(utentiMap).map(([id, userVal]) => {
      const name =
        typeof userVal === "object" && userVal !== null
          ? userVal.username || userVal.nome || "Coinquilino"
          : typeof userVal === "string"
          ? userVal
          : "Coinquilino";
      const initial =
        name && typeof name === "string" && name.length > 0
          ? name.charAt(0).toUpperCase()
          : "C";
      return {
        id,
        username: name,
        initial
      };
    });
  }, [utentiMap]);

  // Quiet status pill computation
  const choreStatusPill = useMemo(() => {
    const oggi = new Date().toISOString().split("T")[0];
    if (prossimoTurno) {
      const isAssignedToMe =
        (prossimoTurno.nomi && prossimoTurno.nomi.includes(userData?.username)) ||
        prossimoTurno.utenteId === currentUser?.uid;
      if (prossimoTurno.data === oggi && isAssignedToMe) {
        return { text: "Tocca a te oggi", type: "urgent", icon: "fa-bell" };
      }
      if (prossimoTurno.data === oggi) {
        return { text: `Oggi: ${prossimoTurno.mansione || "Turno"}`, type: "active", icon: "fa-broom" };
      }
      return {
        text: `Prossimo: ${new Date(prossimoTurno.data).toLocaleDateString("it-IT", {
          day: "numeric",
          month: "short"
        })}`,
        type: "normal",
        icon: "fa-calendar-check"
      };
    }
    return { text: "Nessun turno oggi", type: "success", icon: "fa-check" };
  }, [prossimoTurno, userData?.username, currentUser?.uid]);

  return (
    <div className="dashboard-container">
      {/* ================= COMMAND CENTER HERO: PRESENCE & HOUSE IDENTITY ================= */}
      <section className="household-command-center-hero" aria-label="Centro di Controllo Casa">
        {/* User Greeting & Status Banner */}
        <div className="dashboard-welcome-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div className="welcome-avatar" style={{ fontSize: "2.4rem", color: "var(--color-primary)" }}>
            <i className="fas fa-user-circle" aria-hidden="true"></i>
          </div>
          <div className="welcome-text" style={{ flex: 1, minWidth: "180px", textAlign: "left" }}>
            <span className="welcome-greeting" style={{ fontSize: "0.85rem", color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Panoramica della casa
            </span>
            <h1 className="welcome-username" style={{ margin: "2px 0 0 0", fontSize: "1.6rem" }}>
              Bentornato, <strong style={{ color: "var(--text-main)" }}>{userData?.username || "Utente"}</strong>
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Quiet Status Pill */}
            <span
              className={`command-status-pill status-${choreStatusPill.type}`}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.82rem",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <i className={`fas ${choreStatusPill.icon}`} aria-hidden="true"></i> {choreStatusPill.text}
            </span>

            {isSyncing && (
              <span
                className="dashboard-sync-pill"
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  fontWeight: "600",
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <i className="fas fa-sync-alt fa-spin" aria-hidden="true"></i> Aggiornamento in corso...
              </span>
            )}
            {userCurrentlyAway && (
              <span
                style={{
                  padding: "6px 12px",
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
                <i className="fas fa-plane-departure" aria-hidden="true"></i> Fuori casa
              </span>
            )}
          </div>
        </div>

        {/* Roommate Presence Avatars row */}
        {roommatesList.length > 0 && (
          <div className="roommate-presence-bar" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0 16px 0", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Coinquilini:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {roommatesList.map((r) => (
                <div
                  key={r.id}
                  className="roommate-avatar-chip"
                  title={r.username}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px 4px 6px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.82rem",
                    fontWeight: "500",
                    color: "var(--text-secondary)"
                  }}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "var(--color-primary-light)",
                      color: "var(--color-primary)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "700"
                    }}
                  >
                    {r.initial}
                  </span>
                  <span>{r.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiet Active Reminders */}
        {activeReminders.length > 0 && (
          <div className="command-reminders-list" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {activeReminders.map((r) => (
              <div
                key={r.id}
                className={`command-reminder-pill reminder-${r.type}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  borderRadius: "var(--radius-md)",
                  background: r.type === "warning" ? "rgba(245, 158, 11, 0.12)" : "rgba(14, 165, 233, 0.12)",
                  color: r.type === "warning" ? "#d97706" : "var(--color-primary)",
                  fontSize: "0.85rem",
                  fontWeight: "500"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className={`fas ${r.icon}`} aria-hidden="true"></i>
                  <span>{r.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissReminder(r.id)}
                  aria-label="Nascondi promemoria"
                  style={{
                    background: "none",
                    border: "none",
                    color: "currentColor",
                    opacity: 0.6,
                    cursor: "pointer",
                    padding: "8px",
                    minHeight: "44px",
                    minWidth: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <i className="fas fa-times" aria-hidden="true"></i>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* HouseholdStatus Presence Card */}
        {loading && !casa ? (
          <div className="card dashboard-loading-skeleton" style={{ padding: "24px", textAlign: "center", marginBottom: "16px" }}>
            <p style={{ color: "var(--color-primary)", marginBottom: "8px" }}>
              <i className="fas fa-sync-alt fa-spin fa-2x" aria-hidden="true"></i>
            </p>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Caricamento dati della casa...
            </p>
          </div>
        ) : (
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
        )}
      </section>

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
                Modalità In vacanza
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Quando sei assente, i turni di pulizia non ti vengono assegnati.
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
              {inVacanza ? "Attiva (fuori casa)" : "Non attiva"}
            </span>
          </label>
        </div>

        {inVacanza && (
          <form onSubmit={handleSaveVacation} style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "140px" }}>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Data di partenza
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
                  Data di rientro
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
                style={{ padding: "10px 18px", minHeight: "44px", height: "44px", fontSize: "0.88rem", width: "auto" }}
              >
                {savingVacanza ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Salvataggio...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" aria-hidden="true"></i> Salva date assenza
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
                    fontSize: "0.95rem",
                    color: "var(--text-secondary)",
                    fontWeight: "600",
                    margin: 0
                  }}
                >
                  Prossimo turno
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
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "#f59e0b" }}
          >
            <span>Gestisci tutti i turni</span>
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
                    fontSize: "0.95rem",
                    color: "var(--text-secondary)",
                    fontWeight: "600",
                    margin: 0
                  }}
                >
                  Bilancio spese
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
                  ? "Gli altri coinquilini ti devono dei soldi"
                  : saldo < 0
                  ? "Hai debiti pendenti verso la casa"
                  : "Siete tutti in parità!"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/debiti")}
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>Vedi spese e saldi</span>
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
                    fontSize: "0.95rem",
                    color: "var(--text-secondary)",
                    fontWeight: "600",
                    margin: 0
                  }}
                >
                  Lista della spesa
                </h3>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: "2.4rem", color: "var(--text-main)", margin: 0, fontWeight: "800" }}>
                {activeGroceriesCount}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
                {activeGroceriesCount === 0
                  ? "Casa ben rifornita! Nessun articolo da comprare."
                  : activeGroceriesCount === 1
                  ? "1 articolo da comprare per la casa."
                  : `${activeGroceriesCount} articoli da comprare per la casa.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/spesa")}
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>Apri lista della spesa</span>
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
                fontWeight: "600",
                margin: 0
              }}
            >
              Ultimo avviso in bacheca
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
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Nessun avviso in bacheca. Lascia un messaggio ai coinquilini!</p>
          )}

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/bacheca")}
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>Apri la bacheca</span>
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
            <span>Il tuo account</span>
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={lasciaCasa}
              className="btn-danger-outline"
              style={{ fontSize: "0.88rem", minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 16px" }}
            >
              <i className="fas fa-door-open" aria-hidden="true"></i>
              <span>Lascia Casa</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: "10px 18px", minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "6px", width: "auto", fontSize: "0.88rem" }}
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
