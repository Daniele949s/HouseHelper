import React, { useState } from "react";
import "./HouseAnalytics.css";

export default function HouseAnalytics({
  turni = [],
  debiti = [],
  spesa = [],
  utentiMap = {},
  currentUserId
}) {
  const [activeTab, setActiveTab] = useState("debiti"); // 'debiti' | 'turni' | 'spesa'

  // ==========================================
  // 1. STATISTICHE SPESE & DEBITI
  // ==========================================
  const totalVolumeSpese = debiti.reduce((acc, d) => acc + (parseFloat(d.importo) || 0), 0);
  
  // Raggruppamento per creditore (chi ha speso/anticipato)
  const spesePerUtente = {};
  debiti.forEach(d => {
    const nome = utentiMap[d.creditoreId] || "Altro";
    spesePerUtente[nome] = (spesePerUtente[nome] || 0) + (parseFloat(d.importo) || 0);
  });

  const pieColors = ["#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];
  const pieData = Object.entries(spesePerUtente).map(([nome, importo], idx) => ({
    nome,
    importo,
    percent: totalVolumeSpese > 0 ? (importo / totalVolumeSpese) * 100 : 0,
    color: pieColors[idx % pieColors.length]
  }));

  // ==========================================
  // 2. STATISTICHE TURNI PULIZIA
  // ==========================================
  const oggiStr = new Date().toISOString().split("T")[0];
  const turniCompletati = turni.filter(t => t.data < oggiStr).length;
  const turniFuturi = turni.filter(t => t.data >= oggiStr).length;
  const totalTurni = turni.length;

  // Turni per persona
  const turniPerPersona = {};
  turni.forEach(t => {
    const persone = Array.isArray(t.nomi) ? t.nomi : [t.nomi];
    persone.forEach(p => {
      const pClean = (p || "").trim();
      if (pClean) {
        turniPerPersona[pClean] = (turniPerPersona[pClean] || 0) + 1;
      }
    });
  });

  const maxTurni = Math.max(...Object.values(turniPerPersona), 1);

  // ==========================================
  // 3. STATISTICHE LISTA SPESA
  // ==========================================
  const totalSpesaItems = spesa.length;
  const spesaPresi = spesa.filter(s => s.comprato).length;
  const spesaDaComprare = totalSpesaItems - spesaPresi;
  const percentPresi = totalSpesaItems > 0 ? Math.round((spesaPresi / totalSpesaItems) * 100) : 0;

  // SVG Donut calculation helper
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <div className="analytics-badge">
            <i className="fas fa-chart-pie"></i> Statistiche Casa
          </div>
          <h2>Analisi & Rendiconto</h2>
          <p className="analytics-subtitle">Metriche in tempo reale sulla convivenza</p>
        </div>

        {/* Tab Selector ispirato a graphs.html e graphs2.html */}
        <div className="analytics-tabs">
          <button
            type="button"
            className={`analytics-tab-btn ${activeTab === "debiti" ? "active" : ""}`}
            onClick={() => setActiveTab("debiti")}
          >
            <i className="fas fa-coins"></i> Spese
          </button>
          <button
            type="button"
            className={`analytics-tab-btn ${activeTab === "turni" ? "active" : ""}`}
            onClick={() => setActiveTab("turni")}
          >
            <i className="fas fa-broom"></i> Turni
          </button>
          <button
            type="button"
            className={`analytics-tab-btn ${activeTab === "spesa" ? "active" : ""}`}
            onClick={() => setActiveTab("spesa")}
          >
            <i className="fas fa-shopping-basket"></i> Dispensa
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
                    Totale Spese
                  </text>
                  <text x="100" y="118" textAnchor="middle" className="donut-center-val">
                    {totalVolumeSpese.toFixed(0)}€
                  </text>
                </g>
              </svg>
            </div>

            <div className="donut-legend-list">
              <h4 className="legend-title">Quote anticipate per coinquilino</h4>
              {pieData.length === 0 ? (
                <p className="empty-notice">Nessuna spesa registrata.</p>
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
                <span className="kpi-label">Turni Totali</span>
              </div>
              <div className="kpi-box box-success">
                <span className="kpi-num">{turniCompletati}</span>
                <span className="kpi-label">Completati</span>
              </div>
              <div className="kpi-box box-warning">
                <span className="kpi-num">{turniFuturi}</span>
                <span className="kpi-label">Programmati</span>
              </div>
            </div>

            <div className="bar-chart-container">
              <h4 className="legend-title">Distribuzione turni tra coinquilini</h4>
              {Object.keys(turniPerPersona).length === 0 ? (
                <p className="empty-notice">Nessun turno assegnato finora.</p>
              ) : (
                <div className="bar-rows">
                  {Object.entries(turniPerPersona).map(([persona, count], idx) => {
                    const percent = Math.round((count / maxTurni) * 100);
                    return (
                      <div key={persona} className="bar-row">
                        <div className="bar-info">
                          <span className="bar-name">{persona}</span>
                          <span className="bar-count">{count} {count === 1 ? "turno" : "turni"}</span>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${percent}%`,
                              background: pieColors[idx % pieColors.length]
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
                  <h4>Stato Approvvigionamento</h4>
                  <p>{spesaPresi} su {totalSpesaItems} articoli acquistati</p>
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
                  <span>Lista creata</span>
                </div>
                <div className={`step-checkpoint ${percentPresi >= 50 ? "reached" : ""}`}>
                  <i className="fas fa-shopping-cart"></i>
                  <span>Metà spesa</span>
                </div>
                <div className={`step-checkpoint ${percentPresi === 100 && totalSpesaItems > 0 ? "reached" : ""}`}>
                  <i className="fas fa-check-double"></i>
                  <span>Completata</span>
                </div>
              </div>

              <div className="spesa-summary-grid">
                <div className="summary-pill da-comprare">
                  <span className="pill-val">{spesaDaComprare}</span>
                  <span className="pill-txt">Da comprare</span>
                </div>
                <div className="summary-pill presi">
                  <span className="pill-val">{spesaPresi}</span>
                  <span className="pill-txt">Nel carrello / Presi</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
