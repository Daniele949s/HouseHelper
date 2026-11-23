import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useHousehold } from "../../contexts/HouseholdContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { validateNumber, sanitizeText, safeFloat } from "../../utils/security";
import { showToast } from "../../utils/feedback";
import { calculateSplitAllocations, createLedgerDebts } from "../../services/ledgerService";

export default function AggiungiDebito() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { roommates: coinquilini } = useHousehold();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [isDiviso, setIsDiviso] = useState(false);
  const [splitMode, setSplitMode] = useState("uguali"); // "uguali" | "fissi" | "percentuali" | "esclusioni"
  const [error, setError] = useState("");

  // Custom data state
  const [fixedAmounts, setFixedAmounts] = useState({});
  const [percentages, setPercentages] = useState({});
  const [excludedUids, setExcludedUids] = useState([]);

  const [debito, setDebito] = useState({
    importo: "",
    descrizione: "",
    debitoreId: "",
    creditoreId: currentUser?.uid || ""
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    setDebito((prev) => prev.creditoreId ? prev : { ...prev, creditoreId: currentUser.uid });
  }, [currentUser?.uid]);

  const handleKeyDownNumber = (e) => {
    // Block negative signs, addition signs, and exponential notation
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const addAmountPreset = (increment) => {
    const current = safeFloat(debito.importo);
    const updated = (current + increment).toFixed(2);
    setDebito((prev) => ({ ...prev, importo: updated }));
  };

  // Preview allocation computation
  const splitResult = React.useMemo(() => {
    if (!isDiviso || !debito.importo || safeFloat(debito.importo) <= 0) {
      return null;
    }
    return calculateSplitAllocations(
      splitMode,
      debito.importo,
      debito.creditoreId,
      coinquilini,
      { fixedAmounts, percentages, excludedUids }
    );
  }, [isDiviso, debito.importo, debito.creditoreId, coinquilini, splitMode, fixedAmounts, percentages, excludedUids]);

  // Quick action: evenly distribute fixed amounts or percentages
  const handleDistributeEvenly = () => {
    const total = safeFloat(debito.importo);
    if (total <= 0 || coinquilini.length === 0) return;

    if (splitMode === "fissi") {
      const perHead = (total / coinquilini.length).toFixed(2);
      const newFixed = {};
      coinquilini.forEach((c) => {
        newFixed[c.uid] = perHead;
      });
      setFixedAmounts(newFixed);
    } else if (splitMode === "percentuali") {
      const perHeadPerc = (100 / coinquilini.length).toFixed(2);
      const newPerc = {};
      coinquilini.forEach((c, idx) => {
        // adjust last item so sum is exactly 100
        if (idx === coinquilini.length - 1) {
          const sumPrior = (parseFloat(perHeadPerc) * (coinquilini.length - 1)).toFixed(2);
          newPerc[c.uid] = (100 - parseFloat(sumPrior)).toFixed(2);
        } else {
          newPerc[c.uid] = perHeadPerc;
        }
      });
      setPercentages(newPerc);
    }
  };

  const toggleExcludeMember = (uid) => {
    setExcludedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double submit
    setError("");

    // 1. Text Sanitization (Anti-Injection & XSS)
    const cleanedDescrizione = sanitizeText(debito.descrizione, 100);
    if (!cleanedDescrizione) {
      setError(t("expenses.invalidDescription", null, "Inserisci una descrizione valida per la spesa."));
      return;
    }

    // 2. Strict Number Validation & Bounds (No negative numbers, max 50,000 €)
    const numValidation = validateNumber(debito.importo, {
      min: 0.01,
      max: 50000,
      decimals: 2,
      required: true
    });

    if (!numValidation.isValid) {
      setError(numValidation.error || t("expenses.invalidAmount", null, "Importo non valido."));
      return;
    }

    // 3. Creditor Verification
    if (!debito.creditoreId) {
      setError(t("expenses.selectPayerError", null, "Seleziona chi ha sostenuto la spesa."));
      return;
    }

    const creditoreValido = coinquilini.some((c) => c.uid === debito.creditoreId);
    if (!creditoreValido) {
      setError(t("expenses.creditorNotInHouse", null, "Il creditore selezionato non appartiene alla tua abitazione."));
      return;
    }

    setLoading(true);

    try {
      if (isDiviso) {
        if (coinquilini.length < 2) {
          setError(t("expenses.onlyMemberError", null, "Sei l'unico membro registrato nella casa: impossibile dividere la spesa."));
          setLoading(false);
          return;
        }

        const allocResult = calculateSplitAllocations(
          splitMode,
          numValidation.value,
          debito.creditoreId,
          coinquilini,
          { fixedAmounts, percentages, excludedUids }
        );

        if (!allocResult.valid) {
          setError(allocResult.error || t("expenses.invalidSplit", null, "Ripartizione della spesa non valida."));
          setLoading(false);
          return;
        }

        const allocations = allocResult.allocations || [];
        if (allocations.length === 0) {
          setError(t("expenses.amountTooLowToSplit", null, "L'importo inserito è troppo basso per essere suddiviso."));
          setLoading(false);
          return;
        }

        const entries = allocations.map((alloc) => ({
          importo: alloc.amount,
          descrizione: `${cleanedDescrizione} (${t("expenses.quotaSuffix", null, "Quota")})`,
          debitoreId: alloc.debitoreId,
          creditoreId: debito.creditoreId
        }));

        await createLedgerDebts({ casaId: userData.casaId, entries });
      } else {
        if (!debito.debitoreId) {
          setError(t("expenses.selectDebtorError", null, "Seleziona chi deve restituire i soldi."));
          setLoading(false);
          return;
        }

        if (debito.debitoreId === debito.creditoreId) {
          setError(t("expenses.selfDebtError", null, "Non puoi registrare un debito verso te stesso."));
          setLoading(false);
          return;
        }

        const debitoreValido = coinquilini.some((c) => c.uid === debito.debitoreId);
        if (!debitoreValido) {
          setError(t("expenses.debtorNotInHouse", null, "Il debitore selezionato non appartiene alla tua abitazione."));
          setLoading(false);
          return;
        }

        await createLedgerDebts({
          casaId: userData.casaId,
          entries: [
            {
              importo: numValidation.formatted,
              descrizione: cleanedDescrizione,
              debitoreId: debito.debitoreId,
              creditoreId: debito.creditoreId
            }
          ]
        });
      }

      showToast(t("expenses.saveSuccess", null, "Spesa registrata con successo!"), "success");
      navigate("/debiti");
    } catch (err) {
      console.error("Errore salvataggio debito:", err);
      setError(t("expenses.saveError", null, "Errore durante il salvataggio della spesa."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "680px", margin: "2rem auto" }}>
      <h1 style={{ marginBottom: "6px" }}>
        {t("expenses.newExpenseTitle", null, "Nuova Spesa")}
      </h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>
        {t("expenses.newExpenseSubtitle", null, "Inserisci una spesa e dividila con i coinquilini")}
      </p>

      {error && (
        <div className="error-alert" role="alert" style={{ marginBottom: "20px" }}>
          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" style={{ textAlign: "left" }}>
        {/* Descrizione */}
        <div className="input-group">
          <label htmlFor="debito-descrizione">{t("expenses.descriptionLabel", null, "Descrizione della spesa * (massimo 100 caratteri)")}</label>
          <input
            id="debito-descrizione"
            type="text"
            placeholder={t("expenses.descriptionPlaceholder", null, "es. Spesa supermercato, Bolletta luce, Detersivi")}
            value={debito.descrizione}
            onChange={(e) => setDebito({ ...debito, descrizione: e.target.value })}
            maxLength={100}
            required
            disabled={loading}
          />
        </div>

        {/* Importo Totale */}
        <div className="input-group">
          <label htmlFor="debito-importo">{t("expenses.amountLabel", null, "Importo Totale (€) * (Min: 0.01 €, Max: 50.000 €)")}</label>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            {[5, 10, 20, 50].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => addAmountPreset(inc)}
                disabled={loading}
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 14px",
                  minHeight: "40px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                +{inc} €
              </button>
            ))}
          </div>
          <input
            id="debito-importo"
            type="number"
            step="0.01"
            min="0.01"
            max="50000"
            placeholder={t("expenses.amountPlaceholder", null, "es. 45.50")}
            value={debito.importo}
            onKeyDown={handleKeyDownNumber}
            onChange={(e) => setDebito({ ...debito, importo: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        {/* Chi ha pagato */}
        <div className="input-group">
          <label htmlFor="debito-creditore">{t("expenses.whoPaidLabel", null, "Chi ha pagato la spesa? *")}</label>
          <select
            id="debito-creditore"
            value={debito.creditoreId}
            onChange={(e) => setDebito({ ...debito, creditoreId: e.target.value })}
            required
            disabled={loading}
          >
            {coinquilini.map((c) => (
              <option key={c.uid} value={c.uid}>
                {c.username} {c.uid === currentUser?.uid ? t("expenses.youSuffix", null, "(Tu)") : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Split checkbox */}
        <div
          className="input-group"
          style={{
            background: "var(--bg-input)",
            padding: "16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            marginBottom: "16px"
          }}
        >
          <label
            htmlFor="split-checkbox"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              margin: 0,
              cursor: "pointer"
            }}
          >
            <input
              id="split-checkbox"
              type="checkbox"
              checked={isDiviso}
              onChange={(e) => setIsDiviso(e.target.checked)}
              disabled={loading}
              style={{ width: "20px", height: "20px", margin: 0, accentColor: "var(--color-primary)" }}
            />
            <span style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "600" }}>
              {t("expenses.autoSplitLabel", null, "Dividi automaticamente l'importo tra tutti i coinquilini")} ({coinquilini.length > 0 ? t("expenses.peopleCount", { count: coinquilini.length }, `${coinquilini.length} persone`) : ""})
            </span>
          </label>

          {/* 4 Split Modes Selector (Only visible if isDiviso is true) */}
          {isDiviso && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => setSplitMode("uguali")}
                  aria-pressed={splitMode === "uguali"}
                  className={`btn-split-mode ${splitMode === "uguali" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "uguali" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "uguali" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "uguali" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "uguali" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-users" aria-hidden="true" style={{ marginRight: "4px" }}></i> {t("expenses.splitModeEqual", null, "Parti uguali")}
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode("fissi")}
                  aria-pressed={splitMode === "fissi"}
                  className={`btn-split-mode ${splitMode === "fissi" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "fissi" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "fissi" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "fissi" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "fissi" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-euro-sign" aria-hidden="true" style={{ marginRight: "4px" }}></i> {t("expenses.splitModeFixed", null, "Quote Fisse")}
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode("percentuali")}
                  aria-pressed={splitMode === "percentuali"}
                  className={`btn-split-mode ${splitMode === "percentuali" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "percentuali" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "percentuali" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "percentuali" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "percentuali" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-percent" aria-hidden="true" style={{ marginRight: "4px" }}></i> {t("expenses.splitModePercent", null, "Percentuali")}
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode("esclusioni")}
                  aria-pressed={splitMode === "esclusioni"}
                  className={`btn-split-mode ${splitMode === "esclusioni" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "esclusioni" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "esclusioni" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "esclusioni" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "esclusioni" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-user-minus" aria-hidden="true" style={{ marginRight: "4px" }}></i> {t("expenses.splitModeExclude", null, "Esclusioni")}
                </button>
              </div>

              {/* Mode 1: Equal Split Info */}
              {splitMode === "uguali" && (
                <div style={{ padding: "10px 14px", background: "rgba(13, 148, 136, 0.1)", borderRadius: "var(--radius-sm)", color: "var(--color-accent)", fontSize: "0.88rem" }}>
                  <div>
                    <i className="fas fa-calculator" aria-hidden="true" style={{ marginRight: "6px" }}></i>
                    {t("expenses.equalSplitInfo", { count: coinquilini.length }, `Diviso in parti uguali tra ${coinquilini.length} coinquilini con calcolo esatto dei centesimi.`)}
                  </div>
                  {coinquilini.length > 0 && safeFloat(debito.importo) > 0 && (
                    <div style={{ marginTop: "6px", fontWeight: "600" }}>
                      {t("expenses.individualShare", null, "Quota individuale:")} <span>{(safeFloat(debito.importo) / coinquilini.length).toFixed(2)} €</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Custom Fixed Amounts */}
              {splitMode === "fissi" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {t("expenses.fixedAmountsHint", null, "Indica la quota a carico di ciascun coinquilino:")}
                    </span>
                    <button
                      type="button"
                      onClick={handleDistributeEvenly}
                      className="btn-text"
                      style={{ fontSize: "0.8rem", padding: "8px 12px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}
                    >
                      <i className="fas fa-balance-scale" aria-hidden="true" style={{ marginRight: "6px" }}></i> {t("expenses.splitEvenly", null, "Dividi in parti uguali")}
                    </button>
                  </div>

                  {coinquilini.map((c) => (
                    <div key={c.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                        {c.username} {c.uid === debito.creditoreId ? t("expenses.payerSuffix", null, "(Pagatore)") : ""}:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="50000"
                          aria-label={t("expenses.fixedAmountFor", { name: c.username }, `Quota fissa per ${c.username}`)}
                          placeholder="0.00"
                          value={fixedAmounts[c.uid] !== undefined ? fixedAmounts[c.uid] : ""}
                          onKeyDown={handleKeyDownNumber}
                          onChange={(e) =>
                            setFixedAmounts({ ...fixedAmounts, [c.uid]: e.target.value })
                          }
                          style={{ width: "100px", padding: "6px 8px", fontSize: "0.9rem" }}
                        />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>€</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mode 3: Percentages */}
              {splitMode === "percentuali" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {t("expenses.percentagesHint", null, "Indica la percentuale per ciascun coinquilino (totale 100%):")}
                    </span>
                    <button
                      type="button"
                      onClick={handleDistributeEvenly}
                      className="btn-text"
                      style={{ fontSize: "0.8rem", padding: "8px 12px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}
                    >
                      <i className="fas fa-balance-scale" aria-hidden="true" style={{ marginRight: "6px" }}></i> {t("expenses.splitEvenly", null, "Dividi in parti uguali")}
                    </button>
                  </div>

                  {coinquilini.map((c) => (
                    <div key={c.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                        {c.username} {c.uid === debito.creditoreId ? t("expenses.payerSuffix", null, "(Pagatore)") : ""}:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          aria-label={t("expenses.percentageFor", { name: c.username }, `Percentuale per ${c.username}`)}
                          placeholder="0"
                          value={percentages[c.uid] !== undefined ? percentages[c.uid] : ""}
                          onKeyDown={handleKeyDownNumber}
                          onChange={(e) =>
                            setPercentages({ ...percentages, [c.uid]: e.target.value })
                          }
                          style={{ width: "90px", padding: "6px 8px", fontSize: "0.9rem" }}
                        />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mode 4: Exclusions */}
              {splitMode === "esclusioni" && (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                    {t("expenses.exclusionsHint", null, "Seleziona i coinquilini da escludere dalla spesa:")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {coinquilini.map((c) => {
                      const isExcluded = excludedUids.includes(c.uid);
                      return (
                        <label
                          key={c.uid}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 10px",
                            borderRadius: "var(--radius-sm)",
                            background: isExcluded ? "rgba(239, 68, 68, 0.08)" : "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            cursor: "pointer"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isExcluded}
                            onChange={() => toggleExcludeMember(c.uid)}
                            style={{ width: "16px", height: "16px", accentColor: "var(--color-danger)" }}
                          />
                          <span style={{ fontSize: "0.88rem", textDecoration: isExcluded ? "line-through" : "none", color: isExcluded ? "var(--color-danger)" : "var(--text-main)" }}>
                            {c.username} {isExcluded ? t("expenses.excludedSuffix", null, "(Escluso dal conteggio)") : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Allocation Preview Badge */}
              {splitResult && (
                <div style={{ marginTop: "12px" }}>
                  {splitResult.valid ? (
                    <div style={{ padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--radius-sm)", color: "var(--color-success)", fontSize: "0.85rem" }}>
                      <i className="fas fa-check-circle" aria-hidden="true" style={{ marginRight: "6px" }}></i>
                      {splitResult.allocations?.length === 1
                        ? t("expenses.validSplitOne", { count: 1 }, "Ripartizione valida: 1 coinquilino debitore.")
                        : t("expenses.validSplitMany", { count: splitResult.allocations?.length }, `Ripartizione valida: ${splitResult.allocations?.length} coinquilini debitori.`)}
                    </div>
                  ) : (
                    <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-sm)", color: "var(--color-danger)", fontSize: "0.85rem" }}>
                      <i className="fas fa-exclamation-triangle" aria-hidden="true" style={{ marginRight: "6px" }}></i>
                      {splitResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Debitore singolo (Only when not divided) */}
        {!isDiviso && (
          <div className="input-group">
            <label htmlFor="debito-debitore">{t("expenses.whoOwesLabel", null, "Chi deve restituire la quota? *")}</label>
            <select
              id="debito-debitore"
              value={debito.debitoreId}
              onChange={(e) => setDebito({ ...debito, debitoreId: e.target.value })}
              required
              disabled={loading}
            >
              <option value="">{t("expenses.selectDebtorPlaceholder", null, "-- Seleziona coinquilino debitore --")}</option>
              {coinquilini.map((c) => (
                <option key={c.uid} value={c.uid}>
                  {c.username} {c.uid === currentUser?.uid ? t("expenses.youSuffix", null, "(Tu)") : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> {t("expenses.saving", null, "Salvataggio...")}</span>
            ) : (
              <span><i className="fas fa-save" aria-hidden="true"></i> {t("expenses.saveExpense", null, "Salva Spesa")}</span>
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/debiti")}
            disabled={loading}
          >
            {t("common.cancel", null, "Annulla")}
          </button>
        </div>
      </form>
    </div>
  );
}
