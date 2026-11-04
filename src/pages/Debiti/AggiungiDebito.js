import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { validateNumber, sanitizeText, safeFloat } from "../../utils/security";
import { showToast } from "../../utils/feedback";
import { calculateSplitAllocations } from "../../utils/debtSimplification";

export default function AggiungiDebito() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [coinquilini, setCoinquilini] = useState([]);
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
    const fetchCoinquilini = async () => {
      if (!userData?.casaId) return;
      try {
        const q = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));
        const snap = await getDocs(q);
        const utenti = [];
        snap.forEach((docSnap) => {
          utenti.push({ uid: docSnap.id, id: docSnap.id, ...docSnap.data() });
        });
        setCoinquilini(utenti);
      } catch (err) {
        console.error("Errore fetch coinquilini:", err);
        setError("Impossibile caricare l'elenco dei coinquilini.");
      }
    };
    fetchCoinquilini();
  }, [userData]);

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
      setError("Inserisci una descrizione valida per la spesa.");
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
      setError(numValidation.error || "Importo non valido.");
      return;
    }

    // 3. Creditor Verification
    if (!debito.creditoreId) {
      setError("Seleziona chi ha sostenuto la spesa.");
      return;
    }

    const creditoreValido = coinquilini.some((c) => c.uid === debito.creditoreId);
    if (!creditoreValido) {
      setError("Il creditore selezionato non appartiene alla tua abitazione.");
      return;
    }

    setLoading(true);

    try {
      if (isDiviso) {
        if (coinquilini.length < 2) {
          setError("Sei l'unico membro registrato nella casa: impossibile dividere la spesa.");
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
          setError(allocResult.error || "Ripartizione della spesa non valida.");
          setLoading(false);
          return;
        }

        const allocations = allocResult.allocations || [];
        if (allocations.length === 0) {
          setError("L'importo inserito è troppo basso per essere suddiviso.");
          setLoading(false);
          return;
        }

        const promesse = allocations.map((alloc) => {
          return addDoc(collection(db, "debiti"), {
            importo: alloc.amount,
            descrizione: `${cleanedDescrizione} (Quota)`,
            debitoreId: alloc.debitoreId,
            creditoreId: debito.creditoreId,
            casaId: userData.casaId,
            createdAt: new Date()
          });
        });

        await Promise.all(promesse);
      } else {
        if (!debito.debitoreId) {
          setError("Seleziona chi deve restituire i soldi.");
          setLoading(false);
          return;
        }

        if (debito.debitoreId === debito.creditoreId) {
          setError("Non puoi registrare un debito verso te stesso.");
          setLoading(false);
          return;
        }

        const debitoreValido = coinquilini.some((c) => c.uid === debito.debitoreId);
        if (!debitoreValido) {
          setError("Il debitore selezionato non appartiene alla tua abitazione.");
          setLoading(false);
          return;
        }

        await addDoc(collection(db, "debiti"), {
          importo: numValidation.formatted,
          descrizione: cleanedDescrizione,
          debitoreId: debito.debitoreId,
          creditoreId: debito.creditoreId,
          casaId: userData.casaId,
          createdAt: new Date()
        });
      }

      showToast("Spesa registrata con successo!", "success");
      navigate("/debiti");
    } catch (err) {
      console.error("Errore salvataggio debito:", err);
      setError("Errore durante il salvataggio della spesa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "680px", margin: "2rem auto" }}>
      <h1 style={{ marginBottom: "6px" }}>
        Nuova Spesa <i className="fas fa-wallet" style={{ fontSize: "0.85em", marginLeft: "6px" }} aria-hidden="true"></i>
      </h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>
        Registra una spesa singola o dividila con i tuoi coinquilini
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
          <label htmlFor="debito-descrizione">Descrizione della spesa * (massimo 100 caratteri)</label>
          <input
            id="debito-descrizione"
            type="text"
            placeholder="es. Spesa supermercato, Bolletta luce, Detersivi"
            value={debito.descrizione}
            onChange={(e) => setDebito({ ...debito, descrizione: e.target.value })}
            maxLength={100}
            required
            disabled={loading}
          />
        </div>

        {/* Importo Totale */}
        <div className="input-group">
          <label htmlFor="debito-importo">Importo Totale (€) * (Min: 0.01 €, Max: 50.000 €)</label>
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
                  padding: "4px 10px",
                  fontSize: "0.8rem",
                  cursor: "pointer"
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
            placeholder="es. 45.50"
            value={debito.importo}
            onKeyDown={handleKeyDownNumber}
            onChange={(e) => setDebito({ ...debito, importo: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        {/* Chi ha pagato */}
        <div className="input-group">
          <label htmlFor="debito-creditore">Chi ha anticipato i soldi? *</label>
          <select
            id="debito-creditore"
            value={debito.creditoreId}
            onChange={(e) => setDebito({ ...debito, creditoreId: e.target.value })}
            required
            disabled={loading}
          >
            {coinquilini.map((c) => (
              <option key={c.uid} value={c.uid}>
                {c.username} {c.uid === currentUser?.uid ? "(Tu)" : ""}
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
              Dividi automaticamente l'importo tra tutti i coinquilini ({coinquilini.length > 0 ? `${coinquilini.length} persone` : ""})
            </span>
          </label>

          {/* 4 Split Modes Selector (Only visible if isDiviso is true) */}
          {isDiviso && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => setSplitMode("uguali")}
                  className={`btn-split-mode ${splitMode === "uguali" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "uguali" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "uguali" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "uguali" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "uguali" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-users" aria-hidden="true" style={{ marginRight: "4px" }}></i> Uguali
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode("fissi")}
                  className={`btn-split-mode ${splitMode === "fissi" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "fissi" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "fissi" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "fissi" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "fissi" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-euro-sign" aria-hidden="true" style={{ marginRight: "4px" }}></i> Quote Fisse
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode("percentuali")}
                  className={`btn-split-mode ${splitMode === "percentuali" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "percentuali" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "percentuali" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "percentuali" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "percentuali" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-percent" aria-hidden="true" style={{ marginRight: "4px" }}></i> Percentuali
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode("esclusioni")}
                  className={`btn-split-mode ${splitMode === "esclusioni" ? "active" : ""}`}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: splitMode === "esclusioni" ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    background: splitMode === "esclusioni" ? "rgba(37, 99, 235, 0.1)" : "var(--bg-card)",
                    color: splitMode === "esclusioni" ? "var(--color-primary)" : "var(--text-main)",
                    fontWeight: splitMode === "esclusioni" ? "700" : "500",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  <i className="fas fa-user-minus" aria-hidden="true" style={{ marginRight: "4px" }}></i> Esclusioni
                </button>
              </div>

              {/* Mode 1: Equal Split Info */}
              {splitMode === "uguali" && (
                <div style={{ padding: "10px 14px", background: "rgba(13, 148, 136, 0.1)", borderRadius: "var(--radius-sm)", color: "var(--color-accent)", fontSize: "0.88rem" }}>
                  <div>
                    <i className="fas fa-calculator" aria-hidden="true" style={{ marginRight: "6px" }}></i>
                    Diviso equamente in {coinquilini.length} quote identiche (con allocazione esatta dei centesimi).
                  </div>
                  {coinquilini.length > 0 && safeFloat(debito.importo) > 0 && (
                    <div style={{ marginTop: "6px", fontWeight: "600" }}>
                      Quota individuale: <span>{(safeFloat(debito.importo) / coinquilini.length).toFixed(2)} €</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Custom Fixed Amounts */}
              {splitMode === "fissi" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Specifica la quota fissa a carico di ciascun membro:
                    </span>
                    <button
                      type="button"
                      onClick={handleDistributeEvenly}
                      className="btn-text"
                      style={{ fontSize: "0.8rem", padding: "2px 6px" }}
                    >
                      <i className="fas fa-balance-scale" aria-hidden="true"></i> Distribuisci equamente
                    </button>
                  </div>

                  {coinquilini.map((c) => (
                    <div key={c.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                        {c.username} {c.uid === debito.creditoreId ? "(Pagatore)" : ""}:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="50000"
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
                      Specifica la percentuale per ciascun membro (totale 100%):
                    </span>
                    <button
                      type="button"
                      onClick={handleDistributeEvenly}
                      className="btn-text"
                      style={{ fontSize: "0.8rem", padding: "2px 6px" }}
                    >
                      <i className="fas fa-balance-scale" aria-hidden="true"></i> Distribuisci equamente
                    </button>
                  </div>

                  {coinquilini.map((c) => (
                    <div key={c.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                        {c.username} {c.uid === debito.creditoreId ? "(Pagatore)" : ""}:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
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
                    Spunta i coinquilini da <strong>ESCLUDERE</strong> da questa spesa:
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
                            {c.username} {isExcluded ? "(Escluso dal pagamento)" : ""}
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
                      Ripartizione valida: {splitResult.allocations?.length} coinquilin{splitResult.allocations?.length === 1 ? "o" : "i"} debitor{splitResult.allocations?.length === 1 ? "e" : "i"}.
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
            <label htmlFor="debito-debitore">Chi deve restituire i soldi? *</label>
            <select
              id="debito-debitore"
              value={debito.debitoreId}
              onChange={(e) => setDebito({ ...debito, debitoreId: e.target.value })}
              required
              disabled={loading}
            >
              <option value="">-- Seleziona coinquilino debitore --</option>
              {coinquilini.map((c) => (
                <option key={c.uid} value={c.uid}>
                  {c.username} {c.uid === currentUser?.uid ? "(Tu)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span><i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Salvataggio...</span>
            ) : (
              <span><i className="fas fa-save" aria-hidden="true"></i> Salva Spesa</span>
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/debiti")}
            disabled={loading}
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
