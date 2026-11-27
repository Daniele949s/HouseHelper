import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { fetchHouseholdData } from "../services/householdService";
import HouseAnalytics from "../components/HouseAnalytics";
import HouseholdStatus from "../components/HouseholdStatus";
import { safeFloat, validateDate } from "../utils/security";
import { showToast, showConfirm } from "../utils/feedback";
import { isUserOnVacation } from "../utils/choreRotation";
import {
  getDashboardSnapshot,
  saveDashboardSnapshot,
  isTenantFresh,
  markTenantFresh,
} from "../utils/offlineStorage";
import { useLanguage } from "../contexts/LanguageContext";

export default function HomeUtente() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const {
    house: ctxHouse,
    roommates: ctxRoommates,
    roommateMap: ctxRoommateMap,
    isAdmin: ctxIsAdmin,
    adminUid: ctxAdminUid,
    acceptMember,
    kickMember,
    transferAdminRole,
    leaveHouse,
    deleteHouse,
    updateVacation,
  } = useHousehold();
  const { t, language } = useLanguage();

  const cachedInitial = useMemo(() => {
    if (userData?.casaId) {
      return getDashboardSnapshot(userData.casaId);
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

  const dashboardInputs = useRef();
  useEffect(() => {
    dashboardInputs.current = {
      username: userData?.username,
      fallbackName: t("dashboard.roommateFallback", {}, "Coinquilino"),
      ctxHouse,
      ctxRoommateMap,
    };
  }, [userData?.username, t, ctxHouse, ctxRoommateMap]);

  useEffect(() => {
    if (ctxHouse && ctxHouse.id === userData?.casaId) {
      setCasa((prev) => ({ ...(prev || {}), ...ctxHouse }));
    }
    if (ctxRoommateMap && Object.keys(ctxRoommateMap).length > 0) {
      setUtentiMap(ctxRoommateMap);
    }
  }, [ctxHouse, ctxRoommateMap, userData?.casaId]);

  useEffect(() => {
    const uid = currentUser?.uid;
    const casaId = userData?.casaId;
    if (!uid || casaId === undefined) return;
    if (!casaId) {
      navigate("/scelta-casa");
      return;
    }

    let cancelled = false;
    const { username, fallbackName } = dashboardInputs.current;
    const fetchDashboardData = async () => {

      // Hydrate state from offline cache if available
      const cached = getDashboardSnapshot(casaId);
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

        // Skip redundant 4-collection Firestore reads when navigating back within freshness window
        if (isTenantFresh(casaId, "dashboard", 20000)) {
          return;
        }
      }

      setIsSyncing(true);
      try {
        const turniQuery = query(collection(db, "turni"), where("casaId", "==", casaId));
        const debitiQuery = query(collection(db, "debiti"), where("casaId", "==", casaId));
        const spesaQuery = query(collection(db, "spesa"), where("casaId", "==", casaId));
        const noteQuery = query(collection(db, "note"), where("casaId", "==", casaId));

        // Concurrently fetch household (reusing HouseholdContext when already loaded with invite code) + all independent domain queries via Promise.all
        const currentCtxHouse = dashboardInputs.current?.ctxHouse;
        const currentCtxMap = dashboardInputs.current?.ctxRoommateMap;
        const hasContextHousehold =
          Boolean(currentCtxHouse && currentCtxHouse.id === casaId && currentCtxHouse.codiceUnivoco) &&
          Boolean(currentCtxMap && Object.keys(currentCtxMap).length > 0);

        const householdPromise = (
          hasContextHousehold
            ? Promise.resolve({ house: currentCtxHouse, roommateMap: currentCtxMap })
            : fetchHouseholdData(casaId, fallbackName)
        ).then((res) => {
          if (!cancelled && res) {
            if (res.house) setCasa(res.house);
            if (res.roommateMap && Object.keys(res.roommateMap).length > 0) {
              setUtentiMap(res.roommateMap);
            }
          }
          return res;
        });

        const [{ house: casaData, roommateMap: uMap }, turniSnap, debitiSnap, spesaSnap, noteSnap] = await Promise.all([
          householdPromise,
          getDocs(turniQuery),
          getDocs(debitiQuery),
          getDocs(spesaQuery),
          getDocs(noteQuery)
        ]);

        if (cancelled) return;

        // 1. Casa entity
        if (casaData) {
          setCasa(casaData);
        }

        // 2. Roommates map
        setUtentiMap(uMap);

        const oggi = new Date().toISOString().split("T")[0];

        // 3. Cleaning Shifts
        let allTurni = [];
        let mieiTurni = [];
        turniSnap.forEach((d) => {
          const data = d.data();
          const item = { id: d.id, ...data };
          allTurni.push(item);
          const isAssigned = (data.nomi && data.nomi.includes(username)) || data.utenteId === uid;
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
          if (data.debitoreId === uid) totale -= val;
          if (data.creditoreId === uid) totale += val;
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
        const effectiveCasaForCache = casaData || cached?.casa || currentCtxHouse || null;
        saveDashboardSnapshot(casaId, {
          casa: effectiveCasaForCache,
          prossimoTurno: nextTurno,
          saldo: totale,
          ultimoAvviso: nextNotice,
          turniList: allTurni,
          debitiList: allDebiti,
          spesaList: allSpesa,
          utentiMap: uMap
        });
        markTenantFresh(casaId, "dashboard");
        markTenantFresh(casaId, "debiti");
        markTenantFresh(casaId, "spesa");
      } catch (error) {
        console.error("Errore caricamento dashboard:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsSyncing(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, userData?.casaId, navigate]);

  // Vacation Mode Persistence Handler
  const handleSaveVacation = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (savingVacanza) return;

    if (vacanzaInizio && !validateDate(vacanzaInizio).isValid) {
      showToast(t("dashboard.invalidVacationStart", {}, "Data inizio vacanza non valida."), "error");
      return;
    }
    if (vacanzaFine && !validateDate(vacanzaFine).isValid) {
      showToast(t("dashboard.invalidVacationEnd", {}, "Data fine vacanza non valida."), "error");
      return;
    }
    if (vacanzaInizio && vacanzaFine && vacanzaFine < vacanzaInizio) {
      showToast(t("dashboard.vacationEndBeforeStart", {}, "La data di fine non può essere precedente alla data di inizio."), "error");
      return;
    }

    setSavingVacanza(true);
    try {
      await updateVacation({
        inVacanza: Boolean(inVacanza),
        vacanzaInizio: inVacanza ? (vacanzaInizio || null) : null,
        vacanzaFine: inVacanza ? (vacanzaFine || null) : null
      });
      showToast(
        inVacanza
          ? t("dashboard.vacationEnabledToast", {}, "Modalità vacanza attivata! I turni non ti verranno assegnati.")
          : t("dashboard.vacationDisabledToast", {}, "Modalità vacanza disattivata."),
        "success"
      );
    } catch (err) {
      console.error("Errore salvataggio stato vacanza:", err);
      showToast(t("dashboard.vacationSaveError", {}, "Errore durante il salvataggio dello stato vacanza."), "error");
    } finally {
      setSavingVacanza(false);
    }
  };

  // In-App Notifications / Reminders computation
  const rawReminders = useMemo(() => {
    const list = [];
    const oggi = new Date().toISOString().split("T")[0];
    const domaniDate = new Date();
    domaniDate.setDate(domaniDate.getDate() + 1);
    const domani = domaniDate.toISOString().split("T")[0];

    // 1. Chores due in <24h
    turniList.forEach((turno) => {
      const isAssigned = (turno.nomi && turno.nomi.includes(userData?.username)) || turno.utenteId === currentUser?.uid;
      if (isAssigned && !turno.completato) {
        const choreName = turno.mansione || (turno.luoghi && turno.luoghi.join(", ")) || t("dashboard.cleaningFallback", {}, "Pulizia");
        if (turno.data === oggi) {
          list.push({
            id: `chore_today_${turno.id}`,
            icon: "fa-bell",
            type: "warning",
            text: t("dashboard.reminderChoreToday", { chore: choreName }, `Turno di oggi: ${choreName}! Ricordati di completarlo.`)
          });
        } else if (turno.data === domani) {
          list.push({
            id: `chore_tomorrow_${turno.id}`,
            icon: "fa-calendar-check",
            type: "info",
            text: t("dashboard.reminderChoreTomorrow", { chore: choreName }, `Promemoria: domani hai il turno "${choreName}".`)
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
          const amountStr = safeFloat(d.importo).toFixed(2);
          list.push({
            id: `expense_${d.id}`,
            icon: "fa-receipt",
            type: "info",
            text: t(
              "dashboard.reminderNewExpense",
              { description: d.descrizione, amount: amountStr },
              `Nuova spesa registrata: "${d.descrizione}" (${amountStr} €).`
            )
          });
        }
      }
    });

    return list;
  }, [turniList, debitiList, currentUser?.uid, userData?.username, t]);
  const activeReminders = useMemo(
    () => rawReminders.filter((r) => !dismissedReminders.includes(r.id)),
    [rawReminders, dismissedReminders]
  );

  const dismissReminder = (id) => {
    setDismissedReminders((prev) => [...prev, id]);
  };

  const lasciaCasa = async () => {
    const confirmed = await showConfirm({
      title: t("dashboard.leaveHouseTitle", {}, "Lascia Casa"),
      message: t("dashboard.leaveHouseConfirm", {}, "Sei sicuro di voler uscire da questa casa? Perderai l'accesso alle spese e ai turni condivisi."),
      confirmText: t("dashboard.leaveHouseBtn", {}, "Lascia Casa"),
      cancelText: t("common.cancel", {}, "Annulla"),
      isDanger: true
    });

    if (!confirmed) return;

    try {
      if (isHouseAdmin && membersForSection.length <= 1 && typeof deleteHouse === "function") {
        await deleteHouse();
      } else {
        await leaveHouse();
      }
      showToast(t("dashboard.leftHouseToast", {}, "Hai lasciato la casa."), "info");
      navigate("/scelta-casa");
    } catch (e) {
      console.error(e);
      showToast(t("dashboard.leaveHouseError", {}, "Errore durante l'uscita."), "error");
    }
  };

  const eliminaCasa = async () => {
    const confirmed = await showConfirm({
      title: t("dashboard.deleteHouseTitle", {}, "Elimina Casa"),
      message: t("dashboard.deleteHouseConfirm", {}, "Sei sicuro di voler eliminare definitivamente questa casa? Verranno eliminati per sempre tutti i turni, le spese, la lista della spesa, le note, i documenti e i contatti, e tutti i coinquilini verranno rimossi."),
      confirmText: t("dashboard.deleteHouseBtn", {}, "Elimina Casa"),
      cancelText: t("common.cancel", {}, "Annulla"),
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await deleteHouse();
      showToast(t("dashboard.deletedHouseToast", {}, "Casa e tutti i dati associati eliminati con successo."), "info");
      navigate("/scelta-casa");
    } catch (e) {
      console.error(e);
      showToast(t("dashboard.deleteHouseError", {}, "Errore durante l'eliminazione della casa."), "error");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const activeGroceriesCount = useMemo(() => spesaList.filter((s) => !s.comprato).length, [spesaList]);
  const userCurrentlyAway = isUserOnVacation(userData);

  const activeHouse = (casa?.codiceUnivoco ? casa : ctxHouse) || casa || ctxHouse;
  const effectiveAdminUid = ctxAdminUid || activeHouse?.adminUid || activeHouse?.creatoreId || null;
  const isHouseAdmin = Boolean(ctxIsAdmin || (currentUser?.uid && effectiveAdminUid && currentUser.uid === effectiveAdminUid));

  const membersForSection = useMemo(() => {
    const memberEntries = ctxRoommates?.length
      ? ctxRoommates.map((member) => [member.uid || member.id, member])
      : Object.entries(utentiMap);
    return memberEntries.map(([uid, profile]) => {
      const username = (typeof profile === "string" ? profile : profile?.username || profile?.nome)
        || t("dashboard.roommateFallback", {}, "Coinquilino");
      return {
        uid,
        username,
        initial: username.charAt(0).toUpperCase(),
        isCurrentUser: uid === currentUser?.uid,
        isMemberAdmin: uid === effectiveAdminUid,
        isPending: profile?.statoMembro === "pending",
        inVacanza: Boolean(profile?.inVacanza),
      };
    });
  }, [ctxRoommates, utentiMap, t, currentUser?.uid, effectiveAdminUid]);

  const handleAcceptMember = async (member) => {
    try {
      await acceptMember(member.uid);
      showToast(t("dashboard.acceptMemberSuccess", { name: member.username }, `${member.username} è ora un membro effettivo della casa!`), "success");
    } catch {
      showToast(t("dashboard.acceptMemberError", {}, "Impossibile accettare il membro."), "error");
    }
  };

  const handlePromoteMember = async (member) => {
    const confirmed = await showConfirm({
      title: t("dashboard.promoteAdminBtn", {}, "Promuovi ad Amministratore"),
      message: t("dashboard.promoteAdminConfirm", { name: member.username }, `Vuoi cedere il ruolo di Amministratore della casa a ${member.username}? Diventerai un Membro della casa.`),
      confirmText: t("dashboard.promoteAdminBtn", {}, "Promuovi ad Amministratore"),
      cancelText: t("common.cancel", {}, "Annulla"),
    });
    if (!confirmed) return;

    try {
      await transferAdminRole(member.uid);
      showToast(t("dashboard.promoteAdminSuccess", { name: member.username }, `Ruolo di Amministratore ceduto a ${member.username}.`), "success");
    } catch {
      showToast(t("dashboard.promoteAdminError", {}, "Impossibile cedere il ruolo di Amministratore."), "error");
    }
  };

  const removalLabel = (member) => member.isPending
    ? t("dashboard.rejectRequest", {}, "Rifiuta richiesta")
    : t("dashboard.kickMemberBtn", {}, "Espelli");

  const handleKickMember = async (member) => {
    const confirmed = await showConfirm({
      title: removalLabel(member),
      message: member.isPending
        ? t("dashboard.rejectRequestConfirm", { name: member.username }, `Vuoi rifiutare la richiesta di ${member.username}?`)
        : t("dashboard.kickMemberConfirm", { name: member.username }, `Vuoi rimuovere ${member.username} dalla casa?`),
      confirmText: removalLabel(member),
      cancelText: t("common.cancel", {}, "Annulla"),
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      await kickMember(member.uid);
      setUtentiMap((previous) => {
        const next = { ...previous };
        delete next[member.uid];
        return next;
      });
      showToast(member.isPending
        ? t("dashboard.rejectRequestSuccess", { name: member.username }, `Richiesta di ${member.username} rifiutata.`)
        : t("dashboard.kickMemberSuccess", { name: member.username }, `${member.username} è stato rimosso dalla casa.`), "success");
    } catch {
      showToast(member.isPending
        ? t("dashboard.rejectRequestError", {}, "Impossibile rifiutare la richiesta.")
        : t("dashboard.kickMemberError", {}, "Impossibile rimuovere il membro."), "error");
    }
  };

  // Quiet status pill computation
  const choreStatusPill = useMemo(() => {
    const oggi = new Date().toISOString().split("T")[0];
    if (prossimoTurno) {
      const isAssignedToMe =
        (prossimoTurno.nomi && prossimoTurno.nomi.includes(userData?.username)) ||
        prossimoTurno.utenteId === currentUser?.uid;
      if (prossimoTurno.data === oggi && isAssignedToMe) {
        return { text: t("dashboard.statusYourTurnToday", {}, "Tocca a te oggi"), type: "urgent", icon: "fa-bell" };
      }
      if (prossimoTurno.data === oggi) {
        const choreLabel = prossimoTurno.mansione || t("dashboard.choreFallback", {}, "Turno");
        return { text: t("dashboard.statusTodayChore", { chore: choreLabel }, `Oggi: ${choreLabel}`), type: "active", icon: "fa-broom" };
      }
      const dateStr = new Date(prossimoTurno.data).toLocaleDateString(language === "en" ? "en-US" : "it-IT", {
        day: "numeric",
        month: "short"
      });
      return {
        text: t("dashboard.statusNextDate", { date: dateStr }, `Prossimo: ${dateStr}`),
        type: "normal",
        icon: "fa-calendar-check"
      };
    }
    return { text: t("dashboard.statusNoChoreToday", {}, "Nessun turno oggi"), type: "success", icon: "fa-check" };
  }, [prossimoTurno, userData?.username, currentUser?.uid, t, language]);

  return (
    <div className="dashboard-container">
      {/* ================= COMMAND CENTER HERO: PRESENCE & HOUSE IDENTITY ================= */}
      <section className="household-command-center-hero" aria-label={t("dashboard.commandCenterAria", {}, "Centro di Controllo Casa")}>
        {/* User Greeting & Status Banner */}
        <div className="dashboard-welcome-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div className="welcome-avatar" style={{ fontSize: "2.4rem", color: "var(--color-primary)" }}>
            <i className="fas fa-user-circle" aria-hidden="true"></i>
          </div>
          <div className="welcome-text" style={{ flex: 1, minWidth: "180px", textAlign: "left" }}>
            <h1 className="welcome-username" style={{ margin: 0, fontSize: "1.6rem" }}>
              {t("dashboard.welcomePrefix", {}, "Ciao,")}{" "}
              <strong style={{ color: "var(--text-main)" }}>{userData?.username || t("dashboard.userFallback", {}, "Utente")}</strong>
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
                <i className="fas fa-sync-alt fa-spin" aria-hidden="true"></i> {t("dashboard.syncing", {}, "Aggiornamento in corso...")}
              </span>
            )}
            {userCurrentlyAway && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "var(--color-warning-text)",
                  fontWeight: "700",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <i className="fas fa-plane-departure" aria-hidden="true"></i> {t("dashboard.awayBadge", {}, "Fuori casa")}
              </span>
            )}
          </div>
        </div>

        {/* Roommate Presence Avatars row */}
        {membersForSection.filter((r) => !r.isPending).length > 0 && (
          <div className="roommate-presence-bar" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "12px 0 16px 0", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>{t("dashboard.roommatesLabel", {}, "Coinquilini:")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {membersForSection.filter((r) => !r.isPending).map((r) => (
                <div
                  key={r.uid}
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
                  color: r.type === "warning" ? "var(--color-warning-text)" : "var(--color-primary)",
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
                  aria-label={t("dashboard.dismissReminderAria", {}, "Nascondi promemoria")}
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
        {loading && !activeHouse ? (
          <div className="card dashboard-loading-skeleton" style={{ padding: "24px", textAlign: "center", marginBottom: "16px" }}>
            <p style={{ color: "var(--color-primary)", marginBottom: "8px" }}>
              <i className="fas fa-sync-alt fa-spin fa-2x" aria-hidden="true"></i>
            </p>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              {t("dashboard.loadingHouseData", {}, "Caricamento dati della casa...")}
            </p>
          </div>
        ) : (
          <div
            onClickCapture={(e) => {
              const btn = e.target.closest('button.invite-code-card-btn, button[title*="codice invito"]');
              if (btn && activeHouse?.codiceUnivoco) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(activeHouse.codiceUnivoco);
                }
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }
            }}
          >
            <HouseholdStatus
              casa={activeHouse}
              roommateCount={
                membersForSection.filter((m) => !m.isPending).length ||
                Object.keys(utentiMap).length ||
                1
              }
              prossimoTurno={prossimoTurno}
              variant="full"
            />
            {copiedCode && (
              <span style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>{t("dashboard.copiedShort", {}, "Copiato!")}</span>
            )}
          </div>
        )}
      </section>

      <section className="card members-management-card" aria-labelledby="members-section-title">
        <header className="members-management-header">
          <div className="members-management-title-group">
            <div className="members-management-icon" aria-hidden="true">
              <i className="fas fa-users-cog"></i>
            </div>
            <div>
              <h2 id="members-section-title">
                {t("dashboard.membersSectionTitle", {}, "Membri della Casa")}
              </h2>
              <p className="text-muted">
                {t("dashboard.membersSectionSubtitle", {}, "Ruoli e gestione dei coinquilini della casa")}
              </p>
            </div>
          </div>
          <span className="member-role-badge member-count-badge">{membersForSection.length}</span>
        </header>
        <ul className="members-list">
          {membersForSection.map((member) => (
            <li className="member-row" key={member.uid}>
              <div className="member-info">
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: "2rem",
                    height: "2rem",
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: "var(--color-primary-light)",
                    color: "var(--color-primary-text)",
                    fontWeight: 700,
                  }}
                >
                  {member.initial}
                </span>
                <strong>
                  {member.username}{member.isCurrentUser ? ` ${t("board.youBadge", {}, "(Tu)")}` : ""}
                </strong>
                {member.isMemberAdmin ? (
                  <span className="member-role-badge admin">
                    <i className="fas fa-crown" aria-hidden="true"></i>{" "}
                    {t("dashboard.roleAdmin", {}, "Amministratore")}
                  </span>
                ) : member.isPending ? (
                  <span className="member-role-badge pending">
                    <i className="fas fa-clock" aria-hidden="true"></i>{" "}
                    {t("dashboard.statusPending", {}, "In attesa di approvazione")}
                  </span>
                ) : (
                  <span className="member-role-badge">
                    <i className="fas fa-user" aria-hidden="true"></i>{" "}
                    {t("dashboard.roleMember", {}, "Membro")}
                  </span>
                )}
              </div>
              {isHouseAdmin && !member.isCurrentUser && (
                <div className="member-actions">
                  {member.isPending && (
                    <button type="button" className="btn-primary btn-xs" onClick={() => handleAcceptMember(member)}>
                      {t("dashboard.acceptMemberBtn", {}, "Accetta")}
                    </button>
                  )}
                  {!member.isPending && !member.isMemberAdmin && (
                    <button type="button" className="btn-secondary btn-xs" onClick={() => handlePromoteMember(member)}>
                      {t("dashboard.promoteAdminBtn", {}, "Promuovi ad Amministratore")}
                    </button>
                  )}
                  <button type="button" className="btn-danger-outline btn-xs" onClick={() => handleKickMember(member)}>
                    {removalLabel(member)}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ================= VACATION / AWAY MODE CONTROLS ================= */}
      <div
        className="card vacation-mode-card"
        style={{
          marginTop: "20px",
          marginBottom: "24px",
          padding: "18px 20px",
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
                color: inVacanza ? "var(--color-warning-text)" : "var(--text-muted)",
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
                {t("dashboard.vacationModeTitle", {}, "Modalità In vacanza")}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {t("dashboard.vacationModeDesc", {}, "Quando sei assente, i turni di pulizia non ti vengono assegnati.")}
              </p>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
            <input
              type="checkbox"
              checked={inVacanza}
              onChange={(e) => setInVacanza(e.target.checked)}
              style={{ width: "22px", height: "22px", accentColor: "var(--color-warning-text)" }}
            />
            <span style={{ fontWeight: "700", color: inVacanza ? "var(--color-warning-text)" : "var(--text-main)" }}>
              {inVacanza ? t("dashboard.vacationActive", {}, "Attiva (fuori casa)") : t("dashboard.vacationInactive", {}, "Non attiva")}
            </span>
          </label>
        </div>

        {inVacanza && (
          <form onSubmit={handleSaveVacation} style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "140px" }}>
                <label htmlFor="vacanza-inizio" style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  {t("dashboard.vacationStartDate", {}, "Data di partenza")}
                </label>
                <input
                  id="vacanza-inizio"
                  type="date"
                  className="form-control"
                  value={vacanzaInizio}
                  onChange={(e) => setVacanzaInizio(e.target.value)}
                  style={{ fontSize: "0.9rem", padding: "6px 10px" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: "140px" }}>
                <label htmlFor="vacanza-fine" style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  {t("dashboard.vacationEndDate", {}, "Data di rientro")}
                </label>
                <input
                  id="vacanza-fine"
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
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("dashboard.saving", {}, "Salvataggio...")}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" aria-hidden="true"></i> {t("dashboard.saveAbsenceDates", {}, "Salva date assenza")}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bento-grid">
        {/* ================= 3. QUICK SERVICES NAVIGATION ================= */}
        <div className="bento-services" aria-label={t("dashboard.quickServicesAria", {}, "Accesso rapido alle sezioni")}>
          <button type="button" onClick={() => navigate("/turni")} className="service-btn">
            <span className="service-icon"><i className="fas fa-broom" aria-hidden="true"></i></span>
            <span>{t("dashboard.serviceChores", {}, "Turni")}</span>
          </button>
          <button type="button" onClick={() => navigate("/debiti")} className="service-btn">
            <span className="service-icon"><i className="fas fa-wallet" aria-hidden="true"></i></span>
            <span>{t("dashboard.serviceExpenses", {}, "Spese condivise")}</span>
          </button>
          <button type="button" onClick={() => navigate("/spesa")} className="service-btn">
            <span className="service-icon"><i className="fas fa-shopping-cart" aria-hidden="true"></i></span>
            <span>{t("dashboard.serviceGroceries", {}, "Lista della spesa")}</span>
          </button>
          <button type="button" onClick={() => navigate("/calendario")} className="service-btn">
            <span className="service-icon"><i className="fas fa-calendar-alt" aria-hidden="true"></i></span>
            <span>{t("dashboard.serviceCalendar", {}, "Calendario")}</span>
          </button>
          <button type="button" onClick={() => navigate("/bacheca")} className="service-btn">
            <span className="service-icon"><i className="fas fa-thumbtack" aria-hidden="true"></i></span>
            <span>{t("dashboard.serviceBoard", {}, "Bacheca")}</span>
          </button>
          <button type="button" onClick={() => navigate("/documenti")} className="service-btn" aria-label={t("dashboard.serviceDocumentsAria", {}, "Gestione Documenti e Contratti")}>
            <span className="service-icon"><i className="fas fa-folder-open" aria-hidden="true"></i></span>
            <span>{t("dashboard.serviceDocuments", {}, "Documenti")}</span>
          </button>
          <button type="button" onClick={() => navigate("/contatti")} className="service-btn" aria-label={t("dashboard.serviceContactsAria", {}, "Rubrica Contatti Utili")}>
            <span className="service-icon"><i className="fas fa-address-book" aria-hidden="true"></i></span>
            <span>{t("dashboard.serviceContacts", {}, "Contatti")}</span>
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
                  color: "var(--color-warning-text)",
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
                  {t("dashboard.nextChoreTitle", {}, "Prossimo turno")}
                </h3>
              </div>
            </div>

            {prossimoTurno ? (
              <div style={{ marginTop: "10px" }}>
                <h2 style={{ fontSize: "1.6rem", color: "var(--text-main)", marginBottom: "4px" }}>
                  {prossimoTurno.mansione || t("dashboard.cleaningFallback", {}, "Pulizia")}
                </h2>
                <p
                  style={{
                    color: "var(--color-warning-text)",
                    fontWeight: "600",
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <i className="far fa-calendar-alt" aria-hidden="true"></i>
                  <span>
                    {new Date(prossimoTurno.data).toLocaleDateString(language === "en" ? "en-US" : "it-IT", {
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
                  {t("dashboard.noChoresToday", {}, "Nessun turno oggi. Casa splendente!")}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/turni")}
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "var(--color-warning-text)" }}
          >
            <span>{t("dashboard.manageAllChores", {}, "Gestisci tutti i turni")}</span>
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
                  {t("dashboard.expensesBalanceTitle", {}, "Bilancio spese")}
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
                  ? t("dashboard.balanceOwedToYou", {}, "Gli altri coinquilini ti devono dei soldi")
                  : saldo < 0
                  ? t("dashboard.balanceYouOwe", {}, "Hai debiti pendenti verso la casa")
                  : t("dashboard.balanceSettled", {}, "Siete tutti in parità!")}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/debiti")}
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>{t("dashboard.viewExpensesAndBalances", {}, "Vedi spese e saldi")}</span>
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
                  {t("dashboard.groceryListTitle", {}, "Lista della spesa")}
                </h3>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: "2.4rem", color: "var(--text-main)", margin: 0, fontWeight: "800" }}>
                {activeGroceriesCount}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
                {activeGroceriesCount === 0
                  ? t("dashboard.groceriesEmpty", {}, "Casa ben rifornita! Nessun articolo da comprare.")
                  : activeGroceriesCount === 1
                  ? t("dashboard.groceriesSingle", {}, "1 articolo da comprare per la casa.")
                  : t("dashboard.groceriesPlural", { count: activeGroceriesCount }, `${activeGroceriesCount} articoli da comprare per la casa.`)}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/spesa")}
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>{t("dashboard.openGroceryList", {}, "Apri lista della spesa")}</span>
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
              {t("dashboard.latestNoticeTitle", {}, "Ultimo avviso in bacheca")}
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
            <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("dashboard.noNoticesYet", {}, "Nessun avviso in bacheca. Lascia un messaggio ai coinquilini!")}</p>
          )}

          <button
            type="button"
            className="btn-text"
            onClick={() => navigate("/bacheca")}
            style={{ alignSelf: "flex-start", padding: "8px 0", minHeight: "44px", display: "inline-flex", alignItems: "center", marginTop: "16px", color: "var(--color-primary)" }}
          >
            <span>{t("dashboard.openBoard", {}, "Apri la bacheca")}</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "600" }}>
              <i className="fas fa-user-shield" style={{ marginRight: "8px" }} aria-hidden="true"></i>
              <span>{t("dashboard.yourAccount", {}, "Sessione e gestione casa")}</span>
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: "10px 18px", minHeight: "46px", display: "inline-flex", alignItems: "center", gap: "8px", width: "auto", fontSize: "0.88rem" }}
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
              <span>{t("dashboard.logoutShort", {}, "Esci dall'account")}</span>
            </button>
          </div>
          <div className="hh-danger-actions-group" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={lasciaCasa}
              className="btn-danger-outline"
              style={{ fontSize: "0.88rem", minHeight: "46px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 16px" }}
            >
              <i className="fas fa-door-open" aria-hidden="true"></i>
              <span>{t("dashboard.leaveHouseBtn", {}, "Lascia Casa")}</span>
            </button>
            {isHouseAdmin && (
              <button
                type="button"
                onClick={eliminaCasa}
                className="btn-danger-outline"
                style={{ fontSize: "0.88rem", minHeight: "46px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 16px" }}
              >
                <i className="fas fa-trash-alt" aria-hidden="true"></i>
                <span>{t("dashboard.deleteHouseBtn", {}, "Elimina Casa")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
