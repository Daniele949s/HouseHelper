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
  addDoc
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { safeFloat } from "../../utils/security";
import { showToast, showConfirm } from "../../utils/feedback";
import { simplifyDebts, calculateNetBalances } from "../../utils/debtSimplification";
import { exportExpensesToCsv, printMonthlyReport } from "../../utils/reportExport";

export default function ViewDebiti() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [debiti, setDebiti] = useState([]);
  const [utentiMap, setUtentiMap] = useState({});
  const [roommates, setRoommates] = useState([]);
  const [casaNome, setCasaNome] = useState("Casa");
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toggle for Debt Simplification Panel
  const [showSimplification, setShowSimplification] = useState(true);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [exportAll, setExportAll] = useState(false);

  const fetchDati = useCallback(async () => {
    if (!userData?.casaId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch roommates
      const qUtenti = query(
        collection(db, "utenti"),
        where("casaId", "==", userData.casaId)
      );
      const snapUtenti = await getDocs(qUtenti);
      const map = {};
      const list = [];
      snapUtenti.forEach((d) => {
        const udata = d.data();
        map[d.id] = udata.username || "Utente Sconosciuto";
        list.push({ uid: d.id, id: d.id, username: udata.username || "Utente Sconosciuto" });
      });
      setUtentiMap(map);
      setRoommates(list);

      // 2. Fetch house name if available
      try {
        const qCasa = query(collection(db, "case"), where("__name__", "==", userData.casaId));
        const snapCasa = await getDocs(qCasa);
        if (!snapCasa.empty) {
          setCasaNome(snapCasa.docs[0].data().nome || "Casa");
        }
      } catch {
        // Fallback
      }

      // 3. Fetch debts
      const qDebiti = query(
        collection(db, "debiti"),
        where("casaId", "==", userData.casaId)
      );
      const snapDebiti = await getDocs(qDebiti);
      const data = snapDebiti.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      let totale = 0;
      data.forEach((d) => {
        const val = safeFloat(d.importo);
        if (d.debitoreId === currentUser.uid) totale -= val;
        if (d.creditoreId === currentUser.uid) totale += val;
      });
      setSaldo(totale);

      data.sort(
        (a, b) =>
          new Date(b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) -
          new Date(a.createdAt?.toMillis ? a.createdAt.toMillis() : 0)
      );
      setDebiti(data);
    } catch (err) {
      console.error(err);
      setError("Errore nel caricamento delle spese.");
    } finally {
      setLoading(false);
    }
  }, [userData?.casaId, currentUser?.uid]);

  useEffect(() => {
    fetchDati();
  }, [fetchDati]);

  const saldaDebito = async (id, isMyDebt) => {
    const debitoTarget = debiti.find((d) => d.id === id);
    if (!debitoTarget || debitoTarget.casaId !== userData?.casaId) {
      showToast(
        "Operazione non autorizzata: debito non appartenente alla tua abitazione.",
        "error"
      );
      return;
    }

    const confirmed = await showConfirm({
      title: isMyDebt ? "Salda Debito" : "Elimina Spesa",
      message: isMyDebt
        ? "Confermi di aver saldato questo importo?"
        : "Sei sicuro di voler eliminare questa spesa?",
      confirmText: isMyDebt ? "Salda" : "Elimina",
      cancelText: "Annulla",
      isDanger: !isMyDebt
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "debiti", id));
      showToast(isMyDebt ? "Debito saldato con successo!" : "Spesa eliminata.", "success");
      fetchDati();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      showToast("Errore nell'eliminazione.", "error");
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

  // Handle settling a simplified transaction
  const handleSettleSimplified = async (trans) => {
    const confirmed = await showConfirm({
      title: "Registra Pareggio Quota",
      message: `Confermi che ${trans.fromName} ha versato ${trans.amount} € a ${trans.toName}? Verrà registrata una transazione di compensazione.`,
      confirmText: "Registra Pareggio",
      cancelText: "Annulla"
    });

    if (!confirmed) return;

    try {
      await addDoc(collection(db, "debiti"), {
        importo: trans.amount,
        descrizione: `Pareggio quota semplificata a favore di ${trans.toName}`,
        debitoreId: trans.to,
        creditoreId: trans.from,
        casaId: userData.casaId,
        createdAt: new Date()
      });
      showToast("Pareggio registrato con successo!", "success");
      fetchDati();
    } catch (err) {
      console.error("Errore pareggio debito:", err);
      showToast("Errore durante il salvataggio del pareggio.", "error");
    }
  };

  // Expenses filtered for monthly export
  const expensesToExport = useMemo(() => {
    if (exportAll) return debiti;
    return debiti.filter((d) => {
      if (!d.createdAt) return false;
      const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return ym === exportMonth;
    });
  }, [debiti, exportMonth, exportAll]);

  const handleExportCsv = () => {
    const periodLabel = exportAll ? "Tutte le Spese" : exportMonth;
    exportExpensesToCsv(
      expensesToExport,
      simplifiedTransactions,
      roommates,
      casaNome,
      periodLabel
    );
    showToast("Resoconto CSV scaricato!", "success");
    setShowExportModal(false);
  };

  const handlePrintPdf = () => {
    const periodLabel = exportAll ? "Tutte le Spese" : exportMonth;
    printMonthlyReport(
      expensesToExport,
      simplifiedTransactions,
      roommates,
      casaNome,
      periodLabel
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
        <p style={{ marginTop: "10px" }}>Caricamento spese e debiti...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "820px", padding: "2.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, textAlign: "left" }}>
            Spese & Debiti <i className="fas fa-wallet" style={{ fontSize: "0.85em", marginLeft: "6px" }} aria-hidden="true"></i>
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.92rem" }}>
            Conti chiari tra coinquilini
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowExportModal(true)}
            style={{ width: "auto", padding: "12px 18px" }}
            aria-label="Esporta resoconto spese"
          >
            <i className="fas fa-file-export" aria-hidden="true"></i> Esporta Resoconto
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/debiti/aggiungi")}
            style={{ width: "auto", padding: "12px 24px" }}
          >
            <i className="fas fa-plus" aria-hidden="true"></i> Nuova Spesa
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i> {error}
        </div>
      )}

      {/* Widget Saldo Netto */}
      <div
        className="widget-card debt-hero-card"
        style={{
          marginBottom: "20px",
          textAlign: "center",
          background:
            saldo > 0
              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(20, 184, 166, 0.05))"
              : saldo < 0
              ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.05))"
              : "var(--bg-input)",
          border:
            saldo > 0
              ? "1px solid rgba(16, 185, 129, 0.3)"
              : saldo < 0
              ? "1px solid rgba(239, 68, 68, 0.3)"
              : "1px solid var(--border-color)",
          padding: "24px",
          borderRadius: "var(--radius-lg)"
        }}
      >
        <p style={{ fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
          Il tuo Bilancio Netto
        </p>
        <h2 style={{ fontSize: "3rem", margin: "4px 0", color: saldo > 0 ? "var(--color-success)" : saldo < 0 ? "var(--color-danger)" : "var(--text-main)", fontWeight: "800" }}>
          {saldo > 0 ? "+" : ""}{safeFloat(saldo).toFixed(2)} €
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
          {saldo > 0
            ? "Ottimo! Gli altri coinquilini ti devono dei soldi."
            : saldo < 0
            ? "Hai debiti pendenti da restituire."
            : "Nessun debito in sospeso. Perfetta parità!"}
        </p>
      </div>

      {/* Dual Summary Breakdown Cards */}
      <div className="debt-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>
        <div style={{ background: "var(--bg-input)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
            <i className="fas fa-arrow-down" aria-hidden="true"></i>
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Devi ricevere</span>
            <strong style={{ fontSize: "1.2rem", color: "var(--color-success)" }}>Crediti: {totaleCrediti.toFixed(2)} €</strong>
          </div>
        </div>

        <div style={{ background: "var(--bg-input)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
            <i className="fas fa-arrow-up" aria-hidden="true"></i>
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Devi dare</span>
            <strong style={{ fontSize: "1.2rem", color: "var(--color-danger)" }}>Debiti: {totaleDebiti.toFixed(2)} €</strong>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer"
          }}
          onClick={() => setShowSimplification((prev) => !prev)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
            <i className="fas fa-magic text-primary" style={{ fontSize: "1.2rem" }} aria-hidden="true"></i>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-main)" }}>
                Piano di Pareggio Semplificato
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                {simplifiedTransactions.length === 0
                  ? "Tutti i conti sono pari"
                  : `Minimizza a ${simplifiedTransactions.length} ${simplifiedTransactions.length === 1 ? "transazione" : "transazioni"} tutti i debiti incrociati`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-text"
            style={{ fontSize: "0.85rem", padding: "4px 8px" }}
            aria-label={showSimplification ? "Nascondi piano" : "Mostra piano"}
          >
            <i className={`fas ${showSimplification ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true"></i>
          </button>
        </div>

        {showSimplification && (
          <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
            {simplifiedTransactions.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "8px 0" }}>
                <i className="fas fa-check-circle text-success" style={{ marginRight: "6px" }} aria-hidden="true"></i>
                Nessun debito incrociato da pareggiare!
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
                        <strong>{st.fromName}</strong> deve dare a <strong>{st.toName}</strong>:{" "}
                        <span style={{ fontWeight: "800", color: isPayer ? "var(--color-danger)" : isReceiver ? "var(--color-success)" : "var(--color-primary)" }}>
                          Quota: {st.amount} €
                        </span>
                      </div>

                      {(isPayer || isReceiver) && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleSettleSimplified(st)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.82rem",
                            width: "auto",
                            background: isPayer ? "var(--color-danger)" : "var(--color-success)"
                          }}
                          title="Registra saldo transazione"
                        >
                          <i className="fas fa-check" aria-hidden="true"></i> Pareggia
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Roommate Net Balances */}
            <div style={{ marginTop: "14px", textAlign: "left" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Riepilogo saldi coinquilini
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
        Dettaglio Spese Registrate ({debiti.length})
      </h3>

      <div className="sidemenu-list-container">
        {debiti.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
            <i className="fas fa-money-bill-wave" style={{ fontSize: "3rem", opacity: 0.7 }} aria-hidden="true"></i>
            <p className="subtitle" style={{ marginTop: "12px", marginBottom: 0 }}>
              Nessuna spesa registrata in casa. Tutto in ordine!
            </p>
          </div>
        ) : (
          debiti.map((debito) => {
            const sonoDebitore = debito.debitoreId === currentUser.uid;
            const sonoCreditore = debito.creditoreId === currentUser.uid;

            let badgeColor = "var(--text-muted)";
            let badgeBg = "rgba(100, 116, 139, 0.15)";
            let badgeText = "Spesa di Casa";
            if (sonoDebitore) {
              badgeColor = "var(--color-danger)";
              badgeBg = "rgba(239, 68, 68, 0.15)";
              badgeText = "Devi restituire";
            } else if (sonoCreditore) {
              badgeColor = "var(--color-success)";
              badgeBg = "rgba(16, 185, 129, 0.15)";
              badgeText = "Devi ricevere";
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
                        fontWeight: "700",
                        textTransform: "uppercase"
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
                          ).toLocaleDateString()
                        : ""}
                    </span>
                  </div>

                  <h3 style={{ margin: "4px 0", fontSize: "1.2rem", color: "var(--text-main)" }}>
                    {debito.descrizione}
                  </h3>

                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    <span>Da: <strong style={{ color: "var(--text-main)" }}>{utentiMap[debito.debitoreId] || "Sconosciuto"}</strong></span>
                    <span style={{ margin: "0 8px" }}><i className="fas fa-arrow-right" aria-hidden="true"></i></span>
                    <span>A: <strong style={{ color: "var(--text-main)" }}>{utentiMap[debito.creditoreId] || "Sconosciuto"}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: badgeColor }}>
                    {importoSicuro} €
                  </div>

                  {sonoDebitore || sonoCreditore ? (
                    <button
                      type="button"
                      onClick={() => saldaDebito(debito.id, sonoDebitore)}
                      className="btn-primary"
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.88rem",
                        width: "auto",
                        background: badgeColor,
                        boxShadow: "none"
                      }}
                    >
                      <i className="fas fa-check" aria-hidden="true"></i> Segna come saldato
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => saldaDebito(debito.id, false)}
                      className="btn-danger-outline"
                      style={{ padding: "6px 12px", fontSize: "0.82rem", width: "auto" }}
                      title="Elimina"
                    >
                      <i className="fas fa-trash" aria-hidden="true"></i> Elimina
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
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-file-export" aria-hidden="true"></i> Esporta Resoconto Mensile
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowExportModal(false)}
                aria-label="Chiudi"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: "left" }}>
              <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Esporta le spese, i saldi e il piano di pareggio per la gestione della casa.
              </p>

              <div className="form-group mb-3">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={exportAll}
                    onChange={(e) => setExportAll(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
                  />
                  <span>Esporta tutte le spese registrate (senza filtro mensile)</span>
                </label>
              </div>

              {!exportAll && (
                <div className="form-group mb-3">
                  <label htmlFor="export-month-input" className="form-label">
                    Seleziona Mese e Anno
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
                Spese selezionate per l'esportazione: <strong>{expensesToExport.length}</strong>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowExportModal(false)}
              >
                Chiudi
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportCsv}
                >
                  <i className="fas fa-file-csv" aria-hidden="true"></i> Scarica CSV
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePrintPdf}
                >
                  <i className="fas fa-print" aria-hidden="true"></i> Stampa / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="btn-text" onClick={() => navigate("/home")} style={{ marginTop: "30px" }}>
        <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} aria-hidden="true"></i> Torna alla Dashboard
      </button>
    </div>
  );
}
