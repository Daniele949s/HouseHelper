import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useHousehold } from "../../contexts/HouseholdContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { fetchHouseholdData } from "../../services/householdService";
import {
  fetchHouseDebts,
  getUserNetBalance,
  deleteLedgerDebt,
  recordSimplifiedSettlement,
  simplifyDebts,
  calculateNetBalances
} from "../../services/ledgerService";
import { useModalFocusTrap } from "../../components/ConfirmModal";
import { showToast, showConfirm } from "../../utils/feedback";
import { safeFloat } from "../../utils/security";
import { exportExpensesToCsv, printMonthlyReport } from "../../utils/reportExport";

export default function ViewDebiti() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { house: ctxHouse, roommates: ctxRoommates, roommateMap: ctxRoommateMap } = useHousehold();
  const { t, language } = useLanguage();

  const [debiti, setDebiti] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});
  const [roommates, setRoommates] = useState([]);
  const [casaNome, setCasaNome] = useState(() => t("expenses.defaultHouseName", null, "Casa"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSettling, setIsSettling] = useState(false);
  const settlementInFlight = useRef(false);

  // Toggle for Debt Simplification Panel
  const [showSimplification, setShowSimplification] = useState(true);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [exportAll, setExportAll] = useState(false);

  const translateRef = useRef(t);
  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const householdCtxRef = useRef({ ctxHouse, ctxRoommates, ctxRoommateMap });
  useEffect(() => {
    householdCtxRef.current = { ctxHouse, ctxRoommates, ctxRoommateMap };
  }, [ctxHouse, ctxRoommates, ctxRoommateMap]);

  const fetchDati = useCallback(async () => {
    if (!userData?.casaId) return;
    setLoading(true);
    setError(null);
    try {
      const currentCtx = householdCtxRef.current;
      const canReuseCtx = Boolean(
        currentCtx?.ctxHouse && currentCtx.ctxHouse.id === userData.casaId &&
        Array.isArray(currentCtx.ctxRoommates) && currentCtx.ctxRoommates.length > 0 &&
        currentCtx.ctxRoommateMap && Object.keys(currentCtx.ctxRoommateMap).length > 0
      );
      const [{ house, roommates: rList, roommateMap: map }, data] = await Promise.all([
        canReuseCtx
          ? Promise.resolve({ house: currentCtx.ctxHouse, roommates: currentCtx.ctxRoommates, roommateMap: currentCtx.ctxRoommateMap })
          : fetchHouseholdData(userData.casaId, translateRef.current("expenses.unknownUser", null, "Utente Sconosciuto")),
        fetchHouseDebts(userData.casaId)
      ]);

      setUtentiMap(map);
      setRoommates(
        rList
          .filter((r) => r && r.statoMembro !== "pending")
          .map((r) => ({
            uid: r.uid,
            id: r.id,
            username: r.username || translateRef.current("expenses.unknownUser", null, "Utente Sconosciuto"),
          }))
      );

      if (house) {
        setCasaNome(house.nome || translateRef.current("expenses.defaultHouseName", null, "Casa"));
      }

      setDebiti(data);
    } catch (err) {
      console.error(err);
      setError(translateRef.current("expenses.loadError", null, "Errore nel caricamento delle spese."));
    } finally {
      setLoading(false);
    }
  }, [userData?.casaId]);

  useEffect(() => {
    fetchDati();
  }, [fetchDati]);

  const exportModalRef = useRef(null);
  useModalFocusTrap(showExportModal, exportModalRef, () => setShowExportModal(false));

  const saldaDebito = async (id, isMyDebt) => {
    if (settlementInFlight.current) return;
    const debitoTarget = debiti.find((d) => d.id === id);
    const uid = currentUser?.uid;
    if (
      !debitoTarget ||
      !uid ||
      debitoTarget.casaId !== userData?.casaId ||
      (debitoTarget.debitoreId !== uid && debitoTarget.creditoreId !== uid)
    ) {
      showToast(
        t("expenses.unauthorizedOp", null, "Operazione non autorizzata: debito non appartenente alla tua abitazione."),
        "error"
      );
      return;
    }

    settlementInFlight.current = true;
    setIsSettling(true);
    try {
      const confirmed = await showConfirm({
        title: isMyDebt ? t("expenses.settle", null, "Salda Debito") : t("expenses.deleteExpenseTitle", null, "Elimina Spesa"),
        message: isMyDebt
          ? t("expenses.settleConfirmMsg", null, "Confermi di aver saldato questo importo?")
          : t("expenses.deleteConfirmMsg", null, "Sei sicuro di voler eliminare questa spesa?"),
        confirmText: isMyDebt ? t("expenses.settleBtn", null, "Salda") : t("common.delete", null, "Elimina"),
        cancelText: t("common.cancel", null, "Annulla"),
        isDanger: !isMyDebt
      });

      if (!confirmed) return;

      await deleteLedgerDebt(debitoTarget, userData?.casaId);
      showToast(
        isMyDebt
          ? t("expenses.settleSuccess", null, "Debito saldato con successo!")
          : t("expenses.deleteSuccess", null, "Spesa eliminata."),
        "success"
      );
      await fetchDati();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      showToast(t("expenses.deleteError", null, "Errore nell'eliminazione."), "error");
    } finally {
      settlementInFlight.current = false;
      setIsSettling(false);
    }
  };

  // Simplified debts calculation
  const simplifiedTransactions = useMemo(() => {
    return simplifyDebts(debiti, roommates);
  }, [debiti, roommates]);

  // Net balances calculation per roommate
  const netBalances = useMemo(() => {
    return calculateNetBalances(debiti, roommates);
  }, [debiti, roommates]);

  const saldo = useMemo(
    () => getUserNetBalance(netBalances, currentUser?.uid),
    [netBalances, currentUser?.uid]
  );

  // Handle settling a simplified transaction
  const handleSettleSimplified = async (trans) => {
    if (settlementInFlight.current) return;
    settlementInFlight.current = true;
    setIsSettling(true);
    try {
      const confirmed = await showConfirm({
        title: t("expenses.settleSimplifiedTitle", null, "Registra Pareggio Quota"),
        message: t(
          "expenses.settleSimplifiedMsg",
          { from: trans.fromName, amount: trans.amount, to: trans.toName },
          `Confermi che ${trans.fromName} ha versato ${trans.amount} € a ${trans.toName}? Verrà registrata una transazione di compensazione.`
        ),
        confirmText: t("expenses.settleSimplifiedConfirm", null, "Registra Pareggio"),
        cancelText: t("common.cancel", null, "Annulla")
      });

      if (!confirmed) return;

      await recordSimplifiedSettlement({
        trans,
        casaId: userData.casaId,
        description: t(
          "expenses.settleSimplifiedDesc",
          { to: trans.toName },
          `Pareggio quota semplificata a favore di ${trans.toName}`
        )
      });
      showToast(t("expenses.settleSimplifiedSuccess", null, "Pareggio registrato con successo!"), "success");
      await fetchDati();
    } catch (err) {
      console.error("Errore pareggio debito:", err);
      showToast(t("expenses.settleSimplifiedError", null, "Errore durante il salvataggio del pareggio."), "error");
    } finally {
      settlementInFlight.current = false;
      setIsSettling(false);
    }
  };

  // Expenses filtered for monthly export
  const expensesToExport = useMemo(() => {
    if (exportAll) return debiti;
    return debiti.filter((d) => {
      if (!d.createdAt) return false;
      const rawDate = typeof d.createdAt.toDate === "function"
        ? d.createdAt.toDate()
        : typeof d.createdAt.toMillis === "function"
        ? new Date(d.createdAt.toMillis())
        : typeof d.createdAt.seconds === "number"
        ? new Date(d.createdAt.seconds * 1000)
        : new Date(d.createdAt);
      if (Number.isNaN(rawDate.getTime())) return false;
      const ym = `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, "0")}`;
      return ym === exportMonth;
    });
  }, [debiti, exportMonth, exportAll]);

  const handleExportCsv = () => {
    const periodLabel = exportAll ? t("expenses.allExpensesPeriod", null, "Tutte le Spese") : exportMonth;
    exportExpensesToCsv(
      expensesToExport,
      simplifiedTransactions,
      roommates,
      casaNome,
      periodLabel,
      { lang: language, t }
    );
    showToast(t("expenses.csvDownloaded", null, "Resoconto CSV scaricato!"), "success");
    setShowExportModal(false);
  };

  const handlePrintPdf = () => {
    const periodLabel = exportAll ? t("expenses.allExpensesPeriod", null, "Tutte le Spese") : exportMonth;
    printMonthlyReport(
      expensesToExport,
      simplifiedTransactions,
      roommates,
      casaNome,
      periodLabel,
      { lang: language, t }
    );
    setShowExportModal(false);
  };

  // Totals calculations
  let totaleCrediti = 0;
  let totaleDebiti = 0;
  debiti.forEach((d) => {
    const val = safeFloat(d.importo);
    if (d.creditoreId === currentUser?.uid && d.debitoreId !== currentUser?.uid) {
      totaleCrediti += val;
    }
    if (d.debitoreId === currentUser?.uid && d.creditoreId !== currentUser?.uid) {
      totaleDebiti += val;
    }
  });

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: "800px" }}>
        <p><i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true"></i></p>
        <p style={{ marginTop: "10px" }}>{t("expenses.loading", null, "Caricamento spese e debiti...")}</p>
      </div>
    );
  }

  return (
    <div className="card domain-page-card">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>
            {t("expenses.viewTitle", null, "Spese & Debiti")}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowExportModal(true)}
            style={{ width: "auto", padding: "12px 18px" }}
            aria-label={t("expenses.exportAria", null, "Esporta resoconto spese")}
          >
            <i className="fas fa-file-export" aria-hidden="true"></i> {t("expenses.exportReport", null, "Esporta Resoconto")}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/debiti/aggiungi")}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            <i className="fas fa-plus" aria-hidden="true"></i> {t("expenses.newExpenseTitle", null, "Nuova Spesa")}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i> {error}
        </div>
      )}

      {/* Signature Financial Ledger Hero */}
      <div
        className="widget-card debt-hero-card"
        style={{
          marginBottom: "20px",
          textAlign: "center",
          background: "var(--bg-card)",
          border:
            saldo > 0
              ? "1px solid rgba(16, 185, 129, 0.35)"
              : saldo < 0
              ? "1px solid rgba(239, 68, 68, 0.35)"
              : "1px solid var(--border-color)",
          boxShadow: "var(--shadow-card)",
          padding: "28px 24px",
          borderRadius: "var(--radius-lg)"
        }}
      >
        <p style={{ fontWeight: "600", color: "var(--text-secondary)", fontSize: "0.85rem", letterSpacing: "0.02em", margin: "0 0 6px 0" }}>
          {t("expenses.yourBalanceLabel", null, "Il tuo bilancio")}
        </p>
        <h2 style={{ fontSize: "3.2rem", margin: "6px 0", color: saldo > 0 ? "var(--color-success)" : saldo < 0 ? "var(--color-danger)" : "var(--text-main)", fontWeight: "800", letterSpacing: "-0.02em" }}>
          {saldo > 0 ? "+" : ""}{safeFloat(saldo).toFixed(2)} €
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: "6px 0 0 0" }}>
          {saldo > 0
            ? t("expenses.balancePositive", null, "Gli altri coinquilini ti devono dei soldi")
            : saldo < 0
            ? t("expenses.balanceNegative", null, "Hai debiti pendenti da restituire")
            : t("expenses.balanceZero", null, "Nessun debito in sospeso. Perfetta parità!")}
        </p>
      </div>

      {/* Dual Summary Breakdown Cards */}
      <div className="debt-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>
        <div style={{ background: "var(--bg-input)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
            <i className="fas fa-arrow-down" aria-hidden="true"></i>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>{t("expenses.toReceive", null, "Da ricevere")}</span>
            <strong style={{ fontSize: "1.2rem", color: "var(--color-success)" }}>{t("expenses.creditsLabel", { amount: totaleCrediti.toFixed(2) }, `Crediti: ${totaleCrediti.toFixed(2)} €`)}</strong>
          </div>
        </div>

        <div style={{ background: "var(--bg-input)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
            <i className="fas fa-arrow-up" aria-hidden="true"></i>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>{t("expenses.toReturn", null, "Da restituire")}</span>
            <strong style={{ fontSize: "1.2rem", color: "var(--color-danger)" }}>{t("expenses.debtsLabel", { amount: totaleDebiti.toFixed(2) }, `Debiti: ${totaleDebiti.toFixed(2)} €`)}</strong>
          </div>
        </div>
      </div>

      {/* SECTION: DEBT SIMPLIFICATION PANEL */}
      <div
        className="simplification-panel-container"
        style={{
          marginBottom: "28px",
          background: "var(--bg-input)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px"
        }}
      >
        <h3 style={{ margin: 0 }}>
          <button
            type="button"
            aria-expanded={showSimplification}
            onClick={() => setShowSimplification((prev) => !prev)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              minHeight: "44px",
              padding: 0,
              border: 0,
              background: "transparent",
              color: "var(--text-main)",
              font: "inherit",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="fas fa-magic text-primary" style={{ fontSize: "1.2rem" }} aria-hidden="true"></i>
              <span>
                <span style={{ display: "block", fontSize: "1.05rem" }}>
                  {t("expenses.simplificationTitle", null, "Piano di Pareggio Semplificato")}
                </span>
                <span style={{ display: "block", marginTop: "2px", fontSize: "0.82rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                  {simplifiedTransactions.length === 0
                    ? t("expenses.allEven", null, "Tutti i conti sono in pari")
                    : simplifiedTransactions.length === 1
                    ? t("expenses.minimizeOne", { count: 1 }, "Minimizza a 1 transazione tutti i debiti incrociati")
                    : t(
                        "expenses.minimizeMany",
                        { count: simplifiedTransactions.length },
                        `Minimizza a ${simplifiedTransactions.length} transazioni tutti i debiti incrociati`
                      )}
                </span>
              </span>
            </span>
            <i className={`fas ${showSimplification ? "fa-chevron-up" : "fa-chevron-down"}`} style={{ padding: "8px", fontSize: "0.85rem" }} aria-hidden="true"></i>
          </button>
        </h3>

        {showSimplification && (
          <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
            {simplifiedTransactions.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "8px 0" }}>
                <i className="fas fa-check-circle text-success" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                {t("expenses.noDebts", null, "Tutti i conti sono in pari!")}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {simplifiedTransactions.map((st, idx) => {
                  const isPayer = st.from === currentUser?.uid;
                  const isReceiver = st.to === currentUser?.uid;

                  return (
                    <div
                      key={`st_${st.from}_${st.to}_${idx}`}
                      style={{
                        padding: "10px 14px",
                        background: isPayer
                          ? "rgba(239, 68, 68, 0.06)"
                          : isReceiver
                          ? "rgba(16, 185, 129, 0.06)"
                          : "var(--bg-card)",
                        border: isPayer
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : isReceiver
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid var(--border-color)",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                        textAlign: "left"
                      }}
                    >
                      <div style={{ fontSize: "0.92rem", color: "var(--text-main)" }}>
                        <strong>{st.fromName}</strong> {t("expenses.mustPayTo", null, "deve versare a")} <strong>{st.toName}</strong>:{" "}
                        <span style={{ fontWeight: "800", color: isPayer ? "var(--color-danger)" : isReceiver ? "var(--color-success)" : "var(--color-primary)" }}>
                          {t("expenses.quotaAmount", { amount: st.amount }, `Quota: ${st.amount} €`)}
                        </span>
                      </div>

                      {(isPayer || isReceiver) && (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={isSettling}
                          onClick={() => handleSettleSimplified(st)}
                          style={{
                            padding: "8px 16px",
                            minHeight: "40px",
                            fontSize: "0.88rem",
                            width: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            background: isPayer ? "var(--color-danger)" : "var(--color-success)"
                          }}
                          title={t("expenses.recordBalanceTitle", null, "Registra saldo transazione")}
                        >
                          <i className="fas fa-check" aria-hidden="true"></i> {t("expenses.settleAction", null, "Pareggia")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Roommate Net Balances */}
            <div style={{ marginTop: "14px", textAlign: "left" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                {t("expenses.roommatesSummaryTitle", null, "Riepilogo saldi coinquilini")}
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {Object.entries(netBalances).map(([uid, b]) => {
                  const positive = b.cents > 0;
                  const negative = b.cents < 0;
                  return (
                    <span
                      key={uid}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        fontSize: "0.82rem",
                        color: "var(--text-main)"
                      }}
                    >
                      {b.username}:{" "}
                      <strong style={{ color: positive ? "var(--color-success)" : negative ? "var(--color-danger)" : "var(--text-muted)" }}>
                        {positive ? "+" : ""}{b.amount} EUR
                      </strong>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: HISTORICAL EXPENSES LIST */}
      <h3 style={{ textAlign: "left", fontSize: "1.1rem", marginBottom: "12px", color: "var(--text-main)" }}>
        {t("expenses.allRegisteredExpenses", { count: debiti.length }, `Tutte le spese registrate (${debiti.length})`)}
      </h3>

      <div className="sidemenu-list-container">
        {debiti.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-money-bill-wave" style={{ fontSize: "3rem", opacity: 0.7 }} aria-hidden="true"></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              {t("expenses.noExpensesEmpty", null, "Nessuna spesa registrata in casa. Tutto in ordine!")}
            </p>
          </div>
        ) : (
          debiti.map((debito) => {
            const uid = currentUser?.uid;
            const sonoDebitore = Boolean(uid) && debito.debitoreId === uid;
            const sonoCreditore = Boolean(uid) && debito.creditoreId === uid;

            let badgeColor = "var(--text-muted)";
            let badgeBg = "rgba(100, 116, 139, 0.15)";
            let badgeText = t("expenses.badgeHouseExpense", null, "Spesa di Casa");
            if (sonoDebitore) {
              badgeColor = "var(--color-danger)";
              badgeBg = "rgba(239, 68, 68, 0.15)";
              badgeText = t("expenses.badgeYouOwe", null, "Devi restituire");
            } else if (sonoCreditore) {
              badgeColor = "var(--color-success)";
              badgeBg = "rgba(16, 185, 129, 0.15)";
              badgeText = t("expenses.badgeYouAreOwed", null, "Devi ricevere");
            }

            const importoSicuro = safeFloat(debito.importo).toFixed(2);

            return (
              <div
                key={debito.id}
                className="sidemenu-entry-item"
                style={{ cursor: "default" }}
              >
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span
                      style={{
                        background: badgeBg,
                        color: badgeColor,
                        padding: "3px 10px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.78rem",
                        fontWeight: "600"
                      }}
                    >
                      {badgeText}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {debito.createdAt
                        ? new Date(
                            debito.createdAt.toDate
                              ? debito.createdAt.toDate()
                              : debito.createdAt
                          ).toLocaleDateString(language === "en" ? "en-US" : "it-IT")
                        : ""}
                    </span>
                  </div>

                  <h3 style={{ margin: "4px 0", fontSize: "1.2rem", color: "var(--text-main)" }}>
                    {debito.descrizione}
                  </h3>

                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    <span>{t("expenses.fromLabel", null, "Da:")} <strong style={{ color: "var(--text-main)" }}>{utentiMap[debito.debitoreId] || t("expenses.unknownShort", null, "Sconosciuto")}</strong></span>
                    <span style={{ margin: "0 8px" }}><i className="fas fa-arrow-right" aria-hidden="true"></i></span>
                    <span>{t("expenses.toLabel", null, "A:")} <strong style={{ color: "var(--text-main)" }}>{utentiMap[debito.creditoreId] || t("expenses.unknownShort", null, "Sconosciuto")}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: badgeColor }}>
                    {importoSicuro} €
                  </div>

                  {(sonoDebitore || sonoCreditore) && (
                    <button
                      type="button"
                      disabled={isSettling}
                      onClick={() => saldaDebito(debito.id, sonoDebitore)}
                      className="btn-primary"
                      style={{
                        padding: "10px 18px",
                        minHeight: "44px",
                        fontSize: "0.88rem",
                        width: "auto",
                        background: badgeColor,
                        boxShadow: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <i className="fas fa-check" aria-hidden="true"></i> {t("expenses.markAsSettled", null, "Segna come saldato")}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="modal-card"
            ref={exportModalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="modal-header">
              <h2 id="export-modal-title" className="modal-title">
                <i className="fas fa-file-export" aria-hidden="true"></i> {t("expenses.exportModalTitle", null, "Esporta resoconto spese")}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowExportModal(false)}
                aria-label={t("common.close", null, "Chiudi")}
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: "left" }}>
              <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                {t("expenses.exportModalDesc", null, "Scarica o stampa le spese, i saldi e il piano di pareggio della casa.")}
              </p>

              <div className="form-group mb-3">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={exportAll}
                    onChange={(e) => setExportAll(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
                  />
                  <span>{t("expenses.includeAllExpenses", null, "Includi tutte le spese (senza limite di data)")}</span>
                </label>
              </div>

              {!exportAll && (
                <div className="form-group mb-3">
                  <label htmlFor="export-month-input" className="form-label">
                    {t("expenses.chooseMonthYear", null, "Scegli mese e anno")}
                  </label>
                  <input
                    id="export-month-input"
                    type="month"
                    className="form-control"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                  />
                </div>
              )}

              <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                <i className="fas fa-info-circle text-primary" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                {t("expenses.expensesIncludedCount", null, "Spese incluse nel resoconto:")} <strong>{expensesToExport.length}</strong>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowExportModal(false)}
                style={{ minHeight: "44px", padding: "10px 18px" }}
              >
                {t("common.close", null, "Chiudi")}
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportCsv}
                  style={{ minHeight: "44px", padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <i className="fas fa-file-csv" aria-hidden="true"></i> {t("expenses.downloadCsv", null, "Scarica CSV")}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePrintPdf}
                  style={{ minHeight: "44px", padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <i className="fas fa-print" aria-hidden="true"></i> {t("expenses.printPdf", null, "Stampa / PDF")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} aria-hidden="true"></i> {t("expenses.backToDashboard", null, "Torna alla Dashboard")}
      </button>
    </div>
  );
}
