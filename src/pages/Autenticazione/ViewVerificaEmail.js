import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";

export default function ViewVerificaEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const email = location.state?.email || currentUser?.email || "il tuo indirizzo email";
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Cooldown countdown timer for resending verification email
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCheckVerification = async () => {
    setError(null);
    setMessage(null);
    setChecking(true);

    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setMessage("Email verificata con successo! Reindirizzamento...");
          setTimeout(() => {
            navigate("/scelta-casa", { replace: true });
          }, 1000);
          return;
        }
      }
      setError("L'indirizzo email non risulta ancora verificato. Clicca prima sul link ricevuto via email e riprova tra qualche istante.");
    } catch (err) {
      console.error("Errore verifica:", err);
      setError("Impossibile verificare lo stato dell'account. Riprova tra qualche istante.");
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setMessage(null);
    setResending(true);

    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage("Email di verifica inviata nuovamente! Controlla la posta in arrivo e lo spam.");
        setCooldown(60); // 60s cooldown to prevent abuse
      } else {
        setError("Nessuna sessione attiva trovata. Effettua nuovamente il login.");
      }
    } catch (err) {
      console.error("Errore invio verifica:", err);
      if (err.code === "auth/too-many-requests") {
        setError("Troppe richieste di invio ravvicinate. Attendi qualche minuto prima di riprovare.");
      } else {
        setError("Errore durante l'invio dell'email. Riprova più tardi.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Errore logout:", err);
    }
  };

  return (
    <div className="card auth-card" style={{ maxWidth: "520px", margin: "2rem auto", textAlign: "center" }}>
      {/* Icon Badge */}
      <div
        className="auth-brand-badge"
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--color-primary-light)",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.6rem",
          margin: "0 auto 16px auto"
        }}
        aria-hidden="true"
      >
        <i className="fas fa-envelope-open-text"></i>
      </div>

      <div className="auth-header" style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "1.7rem", marginBottom: "6px" }}>Verifica la tua Email</h1>
        <p className="subtitle" style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          Un ultimo passaggio per attivare il tuo account
        </p>
      </div>

      {error && (
        <div className="error-alert" role="alert" style={{ marginBottom: "16px", textAlign: "left" }}>
          <i className="fas fa-exclamation-circle" aria-hidden="true" style={{ marginRight: "8px" }}></i>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "var(--color-success)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.88rem",
            marginBottom: "16px",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <i className="fas fa-check-circle" aria-hidden="true"></i>
          <span>{message}</span>
        </div>
      )}

      <div
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          marginBottom: "24px",
          textAlign: "left"
        }}
      >
        <p style={{ margin: "0 0 10px 0", fontSize: "0.92rem", color: "var(--text-main)", lineHeight: 1.5 }}>
          Abbiamo inviato un messaggio con il link di attivazione a:
        </p>
        <p style={{ margin: "0 0 12px 0", fontWeight: "700", color: "var(--color-primary)", wordBreak: "break-all", fontSize: "1rem" }}>
          {email}
        </p>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
          <i className="fas fa-info-circle" style={{ marginRight: "6px" }} aria-hidden="true"></i>
          Apri la tua casella di posta e fai clic sul link per confermare. Se non trovi l'email, controlla la cartella <strong>Spam</strong> o <strong>Posta Indesiderata</strong>.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          type="button"
          className="btn-primary"
          onClick={handleCheckVerification}
          disabled={checking}
          style={{ width: "100%", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "44px" }}
        >
          {checking ? (
            <>
              <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
              <span>Verifica in corso...</span>
            </>
          ) : (
            <>
              <i className="fas fa-check" aria-hidden="true"></i>
              <span>Ho confermato l'email</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleResendEmail}
          disabled={resending || cooldown > 0}
          style={{ width: "100%", padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "44px" }}
        >
          {resending ? (
            <>
              <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
              <span>Invio in corso...</span>
            </>
          ) : cooldown > 0 ? (
            <>
              <i className="fas fa-clock" aria-hidden="true"></i>
              <span>Rinvia tra {cooldown}s</span>
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane" aria-hidden="true"></i>
              <span>Invia di nuovo l'email</span>
            </>
          )}
        </button>
      </div>

      <div style={{ marginTop: "24px" }}>
        <button
          type="button"
          className="btn-text"
          onClick={handleLogout}
          style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}
        >
          <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} aria-hidden="true"></i>
          Torna alla schermata di accesso
        </button>
      </div>
    </div>
  );
}
