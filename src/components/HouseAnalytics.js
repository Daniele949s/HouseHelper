import React, { useMemo, useState } from "react";
import { safeFloat } from "../utils/security";
import { useLanguage } from "../contexts/LanguageContext";
import "./HouseAnalytics.css";

const EMPTY_LIST = [];
const EMPTY_USER_MAP = {};
const PIE_COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];

function HouseAnalytics({
  turni = EMPTY_LIST,
  debiti = EMPTY_LIST,
  spesa = EMPTY_LIST,
  utentiMap = EMPTY_USER_MAP
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("debiti"); // 'debiti' | 'turni' | 'spesa'

  const otherUser = t("analytics.otherUser", {}, "Altro");
  const { totalVolumeSpese, pieData } = useMemo(() => {
    let totalVolumeSpese = 0;
    const spesePerUtente = new Map();
    debiti.forEach(({ creditoreId, importo }) => {
      const nome = utentiMap[creditoreId] || otherUser;
      const amount = Math.max(0, safeFloat(importo));
      totalVolumeSpese += amount;
      spesePerUtente.set(nome, (spesePerUtente.get(nome) || 0) + amount);
    });

    const pieData = Array.from(spesePerUtente, ([nome, importo], idx) => ({
      nome,
      importo,
      percent: totalVolumeSpese > 0 ? (importo / totalVolumeSpese) * 100 : 0,
      color: PIE_COLORS[idx % PIE_COLORS.length]
    }));

    return { totalVolumeSpese, pieData };
  }, [debiti, utentiMap, otherUser]);

  const oggiStr = new Date().toISOString().split("T")[0];
  const { turniCompletati, turniFuturi, turniPerPersona, maxTurni } = useMemo(() => {
    const turniPerPersona = Object.create(null);
    turni.forEach(({ nomi }) => {
      const persone = Array.isArray(nomi) ? nomi : [nomi];
      persone.forEach(persona => {
        const nome = (persona || "").trim();
        if (nome) {
          turniPerPersona[nome] = (turniPerPersona[nome] || 0) + 1;
        }
      });
    });

    return {
      turniCompletati: turni.filter(turno => turno.data < oggiStr).length,
      turniFuturi: turni.filter(turno => turno.data >= oggiStr).length,
      turniPerPersona,
      maxTurni: Math.max(...Object.values(turniPerPersona), 1)
    };
  }, [turni, oggiStr]);
  const totalTurni = turni.length;

  const { totalSpesaItems, spesaPresi, spesaDaComprare, percentPresi } = useMemo(() => {
    const totalSpesaItems = spesa.length;
    const spesaPresi = spesa.filter(item => item.comprato).length;
    return {
      totalSpesaItems,
      spesaPresi,
      spesaDaComprare: totalSpesaItems - spesaPresi,
      percentPresi: totalSpesaItems > 0 ? Math.round((spesaPresi / totalSpesaItems) * 100) : 0
    };
  }, [spesa]);

  // SVG Donut calculation helper
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <div className="analytics-badge">
            <i className="fas fa-chart-pie"></i> {t("analytics.badge", {}, "Statistiche Casa")}
          </div>
          <h2>{t("analytics.title", {}, "Analisi & Rendiconto")}</h2>
          <p className="analytics-subtitle">{t("analytics.subtitle", {}, "Metriche in tempo reale sulla convivenza")}</p>
        </div>

        {/* Tab Selector ispirato a graphs.html e graphs2.html */}
        <div className="analytics-tabs">
          <button
            type="button"
            className={`analytics-tab-btn ${activeTab === "debiti" ? "active" : ""}`}
            onClick={() => setActiveTab("debiti")}
          >
            <i className="fas fa-coins"></i> {t("analytics.tabExpenses", {}, "Spese")}
          </button>
          <button
            type="button"
            className={`analytics-tab-btn ${activeTab === "turni" ? "active" : ""}`}
            onClick={() => setActiveTab("turni")}
          >
            <i className="fas fa-broom"></i> {t("analytics.tabChores", {}, "Turni")}
          </button>
          <button
            type="button"
            className={`analytics-tab-btn ${activeTab === "spesa" ? "active" : ""}`}
            onClick={() => setActiveTab("spesa")}
          >
            <i className="fas fa-shopping-basket"></i> {t("analytics.tabGroceries", {}, "Lista spesa")}
          </button>
        </div>
      </div>

      <div className="analytics-content">
        {/* ================= TAB 1: SPESE & DONUT CHART (Graphs2 Style) ================= */}
        {activeTab === "debiti" && (
          <div className="analytics-view-grid">
            <div className="donut-chart-wrapper">
              <svg viewBox="0 0 200 200" className="donut-svg">
                {/* Background track circle */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke="var(--bg-input)"
                  strokeWidth="24"
                />

                {totalVolumeSpese === 0 ? (
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke="var(--border-color)"
                    strokeWidth="20"
                  />
                ) : (
                  pieData.map((slice, i) => {
                    const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulatedAngle / 100) * circumference);
                    accumulatedAngle += slice.percent;

                    return (
                      <circle
                        key={slice.nome}
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="24"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="donut-segment"
                        style={{ "--slice-index": i }}
                      />
                    );
                  })
                )}

                {/* Center text */}
                <g className="donut-center-text">
                  <text x="100" y="94" textAnchor="middle" className="donut-center-label">
                    {t("analytics.totalExpenses", {}, "Totale Spese")}
                  </text>
                  <text x="100" y="118" textAnchor="middle" className="donut-center-val">
                    {totalVolumeSpese.toFixed(0)}€
                  </text>
                </g>
              </svg>
            </div>

            <div className="donut-legend-list">
              <h4 className="legend-title">{t("analytics.expensesPerRoommate", {}, "Quote anticipate per coinquilino")}</h4>
              {pieData.length === 0 ? (
                <p className="empty-notice">{t("analytics.noExpenses", {}, "Nessuna spesa registrata.")}</p>
              ) : (
                pieData.map(slice => (
                  <div key={slice.nome} className="legend-item">
                    <div className="legend-item-left">
                      <span className="color-swatch" style={{ background: slice.color }} />
                      <span className="legend-user-name">{slice.nome}</span>
                    </div>
                    <div className="legend-item-right">
                      <strong className="legend-amount">{slice.importo.toFixed(2)} €</strong>
                      <span className="legend-percent">({Math.round(slice.percent)}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: TURNI PULIZIA BAR CHART (Graphs Style) ================= */}
        {activeTab === "turni" && (
          <div className="analytics-turni-view">
            <div className="stats-kpi-row">
              <div className="kpi-box">
                <span className="kpi-num">{totalTurni}</span>
                <span className="kpi-label">{t("analytics.totalChores", {}, "Turni Totali")}</span>
              </div>
              <div className="kpi-box box-success">
                <span className="kpi-num">{turniCompletati}</span>
                <span className="kpi-label">{t("analytics.completedChores", {}, "Completati")}</span>
              </div>
              <div className="kpi-box box-warning">
                <span className="kpi-num">{turniFuturi}</span>
                <span className="kpi-label">{t("analytics.scheduledChores", {}, "Programmati")}</span>
              </div>
            </div>

            <div className="bar-chart-container">
              <h4 className="legend-title">{t("analytics.choresDistribution", {}, "Distribuzione turni tra coinquilini")}</h4>
              {Object.keys(turniPerPersona).length === 0 ? (
                <p className="empty-notice">{t("analytics.noChores", {}, "Nessun turno assegnato finora.")}</p>
              ) : (
                <div className="bar-rows">
                  {Object.entries(turniPerPersona).map(([persona, count], idx) => {
                    const percent = Math.round((count / maxTurni) * 100);
                    return (
                      <div key={persona} className="bar-row">
                        <div className="bar-info">
                          <span className="bar-name">{persona}</span>
                          <span className="bar-count">
                            {count}{" "}
                            {count === 1
                              ? t("analytics.choreSingular", {}, "turno")
                              : t("analytics.chorePlural", {}, "turni")}
                          </span>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${percent}%`,
                              background: PIE_COLORS[idx % PIE_COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: SPESA COMPLETION (ProgressStep Style) ================= */}
        {activeTab === "spesa" && (
          <div className="analytics-spesa-view">
            <div className="spesa-progress-card">
              <div className="spesa-progress-header">
                <div>
                  <h4>{t("analytics.groceryProgressTitle", {}, "Avanzamento della spesa")}</h4>
                  <p>
                    {t(
                      "analytics.groceryProgressCount",
                      { bought: spesaPresi, total: totalSpesaItems },
                      `${spesaPresi} su ${totalSpesaItems} articoli acquistati`
                    )}
                  </p>
                </div>
                <div className="spesa-percent-badge">{percentPresi}%</div>
              </div>

              {/* Progress step bar inspired by progressStep template */}
              <div className="step-progress-track">
                <div
                  className="step-progress-fill"
                  style={{ width: `${percentPresi}%` }}
                />
              </div>

              <div className="step-checkpoints">
                <div className={`step-checkpoint ${percentPresi > 0 ? "reached" : ""}`}>
                  <i className="fas fa-list"></i>
                  <span>{t("analytics.stepListCreated", {}, "Lista creata")}</span>
                </div>
                <div className={`step-checkpoint ${percentPresi >= 50 ? "reached" : ""}`}>
                  <i className="fas fa-shopping-cart"></i>
                  <span>{t("analytics.stepHalfway", {}, "Metà spesa")}</span>
                </div>
                <div className={`step-checkpoint ${percentPresi === 100 && totalSpesaItems > 0 ? "reached" : ""}`}>
                  <i className="fas fa-check-double"></i>
                  <span>{t("analytics.stepCompleted", {}, "Completata")}</span>
                </div>
              </div>

              <div className="spesa-summary-grid">
                <div className="summary-pill da-comprare">
                  <span className="pill-val">{spesaDaComprare}</span>
                  <span className="pill-txt">{t("analytics.toBuy", {}, "Da comprare")}</span>
                </div>
                <div className="summary-pill presi">
                  <span className="pill-val">{spesaPresi}</span>
                  <span className="pill-txt">{t("analytics.inCartBought", {}, "Nel carrello / Presi")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(HouseAnalytics);
