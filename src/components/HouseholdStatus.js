import React, { useState } from "react";
import { showToast } from "../utils/feedback";

/**
 * Modern Household Status & Presence Component
 * @param {Object} props
 * @param {Object} props.casa - Household entity { id, nome, codiceUnivoco }
 * @param {number} props.roommateCount - Number of registered household roommates
 * @param {Object} [props.prossimoTurno] - Next chore item { mansione, data, utenteNome }
 * @param {'full'|'compact'} [props.variant='full'] - Layout variant
 */
export default function HouseholdStatus({
  casa,
  roommateCount = 1,
  prossimoTurno = null,
  variant = "full"
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!casa?.codiceUnivoco) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(casa.codiceUnivoco);
      }
      setCopied(true);
      showToast("Codice invito copiato negli appunti!", "success", 2500);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast("Impossibile copiare il codice negli appunti.", "warning");
    }
  };

  const formattedDate = prossimoTurno?.data
    ? new Date(prossimoTurno.data).toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short"
      })
    : null;

  if (variant === "compact") {
    return (
      <div className="household-status-compact">
        <div className="status-compact-brand">
          <i className="fas fa-home" aria-hidden="true"></i>
          <span>{casa?.nome || "La tua Casa"}</span>
        </div>
        <div
          className="status-compact-badge"
          onClick={handleCopyCode}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCopyCode();
            }
          }}
          title="Copia codice invito"
          aria-label="Copia codice invito"
        >
          <i className={copied ? "fas fa-check" : "far fa-copy"} aria-hidden="true"></i>
          <span>{copied ? "Copiato!" : casa?.codiceUnivoco}</span>
        </div>
      </div>
    );
  }

  return (
    <section className="household-status-card" aria-label="Stato Abitazione">
      {/* Top Row: Household Identity & Protection Seal */}
      <div className="household-status-header">
        <div className="household-identity">
          <div className="household-icon-wrap">
            <i className="fas fa-home" aria-hidden="true"></i>
          </div>
          <div>
            <h2 className="household-name">{casa?.nome || "La tua Casa"}</h2>
            <div className="household-security-tag">
              <i className="fas fa-shield-alt" aria-hidden="true"></i>
              <span>Spazio Condiviso Protetto</span>
            </div>
          </div>
        </div>

        {/* Invite Code Badge with One-Click Copy */}
        <button
          type="button"
          className={`invite-code-card-btn ${copied ? "is-copied" : ""}`}
          onClick={handleCopyCode}
          title="Clicca per copiare il codice invito per i tuoi coinquilini"
          aria-label={`Codice invito ${casa?.codiceUnivoco || ""}. Clicca per copiare.`}
        >
          <div className="invite-label">
            <span>Codice Invito</span>
            {copied && (
              <span className="copy-feedback">
                <i className="fas fa-check" aria-hidden="true"></i> Copiato!
              </span>
            )}
          </div>
          <div className="invite-code-val">
            <code>{casa?.codiceUnivoco || "------"}</code>
            <i className={copied ? "fas fa-check" : "far fa-copy"} aria-hidden="true"></i>
          </div>
        </button>
      </div>

      {/* Grid: Roommates Count & Upcoming Chore Status */}
      <div className="household-status-grid">
        {/* Metric 1: Roommates count */}
        <div className="household-metric-box">
          <div className="metric-icon-wrap icon-roommates">
            <i className="fas fa-users" aria-hidden="true"></i>
          </div>
          <div className="metric-info">
            <span className="metric-label">Coinquilini Attivi</span>
            <span className="metric-val">
              {roommateCount} {roommateCount === 1 ? "membro" : "membri"}
            </span>
          </div>
        </div>

        {/* Metric 2: Next Chore */}
        <div className="household-metric-box">
          <div className="metric-icon-wrap icon-chore">
            <i className="fas fa-broom" aria-hidden="true"></i>
          </div>
          <div className="metric-info">
            <span className="metric-label">Prossimo Turno</span>
            {prossimoTurno ? (
              <span className="metric-val">
                {prossimoTurno.mansione || "Pulizia"} ({formattedDate})
              </span>
            ) : (
              <span className="metric-val-empty">
                <i className="fas fa-check-circle" aria-hidden="true"></i> Tutto in ordine
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
