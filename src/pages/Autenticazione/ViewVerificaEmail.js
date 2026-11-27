import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import { applyActionCode, sendEmailVerification, signOut } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ViewVerificaEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData, refreshAuthUser } = useAuth() || {};
  const { t } = useLanguage();

  const email = location.state?.email || currentUser?.email || t("auth.yourEmailFallback", {}, "il tuo indirizzo email");
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const lastAutoCheckRef = useRef(0);
  const redirectTimerRef = useRef(null);
  const handledOobRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Cooldown countdown timer for resending verification email
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const performVerificationCheck = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setError(null);
        setMessage(null);
        setChecking(true);
      }

      try {
        let verified = false;
        let tokenVerified = false;
        let freshUserData = userData;

        if (typeof refreshAuthUser === "function") {
          const res = await refreshAuthUser({ forceTokenRefresh: true });
          verified = Boolean(res?.verified);
          tokenVerified = Boolean(res?.tokenVerified);
          if (res?.userData !== undefined) {
            freshUserData = res.userData;
          }
        } else if (auth.currentUser) {
          if (typeof auth.currentUser.reload === "function") {
            await auth.currentUser.reload();
          }
          verified = Boolean(auth.currentUser.emailVerified === true);
          tokenVerified = verified;
          if (verified && typeof auth.currentUser.getIdToken === "function") {
            await auth.currentUser.getIdToken(true);
          }
        }

        if (verified && tokenVerified) {
          setError(null);
          setMessage(t("auth.emailVerifiedSuccess", {}, "Email verificata con successo! Reindirizzamento..."));
          const destination = freshUserData?.casaId ? "/home" : "/scelta-casa";
          if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
          }
          redirectTimerRef.current = setTimeout(() => {
            navigate(destination, { replace: true });
          }, 400);
          return true;
        }

        if (verified && !tokenVerified) {
          setError(
            t(
              "auth.tokenRefreshPending",
              {},
              "Email verificata, ma il token di sessione non è ancora aggiornato. Riprova tra un istante o effettua nuovamente l'accesso."
            )
          );
          return false;
        }

        if (!silent) {
          setError(
            t(
              "auth.emailNotVerifiedYet",
              {},
              "L'indirizzo email non risulta ancora verificato. Clicca prima sul link ricevuto via email e riprova tra qualche istante."
            )
          );
        }
        return false;
      } catch (err) {
        console.error("Errore verifica:", err);
        if (!silent) {
          if (err?.code === "auth/user-token-expired") {
            setError(
              t(
                "auth.sessionExpiredReauth",
                {},
                "La sessione è scaduta. Effettua nuovamente l'accesso per continuare."
              )
            );
          } else if (err?.code === "auth/too-many-requests") {
            setError(
              t(
                "auth.tooManyRequests",
                {},
                "Troppi tentativi ravvicinati. Attendi qualche istante e riprova."
              )
            );
          } else {
            setError(
              t(
                "auth.verifyStatusError",
                {},
                "Impossibile verificare lo stato dell'account. Riprova tra qualche istante."
              )
            );
          }
        }
        return false;
      } finally {
        if (!silent) {
          setChecking(false);
        }
      }
    },
    [navigate, refreshAuthUser, t, userData]
  );

  // Handle direct verification action links (?mode=verifyEmail&oobCode=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");
    if (mode !== "verifyEmail" || !oobCode || handledOobRef.current === oobCode) {
      return;
    }
    handledOobRef.current = oobCode;

    let cancelled = false;
    (async () => {
      setChecking(true);
      setError(null);
      try {
        await applyActionCode(auth, oobCode);
        if (!cancelled) {
          await performVerificationCheck({ silent: false });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Errore applyActionCode:", err);
        if (err?.code === "auth/expired-action-code") {
          setError(
            t(
              "auth.verificationLinkExpired",
              {},
              "Il link di verifica è scaduto. Richiedi una nuova email di verifica qui sotto."
            )
          );
        } else if (err?.code === "auth/invalid-action-code") {
          setError(
            t(
              "auth.verificationLinkInvalid",
              {},
              "Il link di verifica non è valido o è già stato utilizzato. Prova a confermare o richiedi una nuova email."
            )
          );
        } else {
          setError(
            t(
              "auth.verifyStatusError",
              {},
              "Impossibile verificare lo stato dell'account. Riprova tra qualche istante."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, performVerificationCheck, t]);

  // Auto-detect verification completed in another tab when user returns to this tab
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const triggerSilentCheck = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastAutoCheckRef.current < 3000) return;
      lastAutoCheckRef.current = now;
      performVerificationCheck({ silent: true });
    };

    window.addEventListener("focus", triggerSilentCheck);
    document.addEventListener("visibilitychange", triggerSilentCheck);
    return () => {
      window.removeEventListener("focus", triggerSilentCheck);
      document.removeEventListener("visibilitychange", triggerSilentCheck);
    };
  }, [performVerificationCheck]);

  const handleCheckVerification = () => performVerificationCheck({ silent: false });

  const handleResendEmail = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setMessage(null);
    setResending(true);

    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage(t("auth.verificationResent", {}, "Email di verifica inviata nuovamente! Controlla la posta in arrivo e lo spam."));
        setCooldown(60); // 60s cooldown to prevent abuse
      } else {
        setError(t("auth.noActiveSession", {}, "Nessuna sessione attiva trovata. Effettua nuovamente il login."));
      }
    } catch (err) {
      console.error("Errore invio verifica:", err);
      if (err.code === "auth/too-many-requests") {
        setError(t("auth.resendTooManyRequests", {}, "Troppe richieste di invio ravvicinate. Attendi qualche minuto prima di riprovare."));
      } else {
        setError(t("auth.resendError", {}, "Errore durante l'invio dell'email. Riprova più tardi."));
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
        <h1 style={{ fontSize: "1.7rem", marginBottom: "6px" }}>{t("auth.verifyEmailTitle", {}, "Verifica la tua Email")}</h1>
        <p className="subtitle" style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          {t("auth.verifyEmailSubtitle", {}, "Un ultimo passaggio per attivare il tuo account")}
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
          {t("auth.verifyEmailSentTo", {}, "Abbiamo inviato un messaggio con il link di attivazione a:")}
        </p>
        <p style={{ margin: "0 0 12px 0", fontWeight: "700", color: "var(--color-primary)", wordBreak: "break-all", fontSize: "1rem" }}>
          {email}
        </p>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
          <i className="fas fa-info-circle" style={{ marginRight: "6px" }} aria-hidden="true"></i>
          {t("auth.verifyEmailInstruction", {}, "Apri la tua casella di posta e fai clic sul link per confermare. Se non trovi l'email, controlla la cartella Spam o Posta Indesiderata.")}
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
              <span>{t("auth.checkingVerification", {}, "Verifica in corso...")}</span>
            </>
          ) : (
            <>
              <i className="fas fa-check" aria-hidden="true"></i>
              <span>{t("auth.confirmEmailBtn", {}, "Ho confermato l'email")}</span>
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
              <span>{t("auth.resendingEmail", {}, "Invio in corso...")}</span>
            </>
          ) : cooldown > 0 ? (
            <>
              <i className="fas fa-clock" aria-hidden="true"></i>
              <span>{t("auth.resendCooldown", { seconds: cooldown }, `Rinvia tra ${cooldown}s`)}</span>
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane" aria-hidden="true"></i>
              <span>{t("auth.resendEmailBtn", {}, "Invia di nuovo l'email")}</span>
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
          {t("auth.backToLogin", {}, "Torna alla schermata di accesso")}
        </button>
      </div>
    </div>
  );
}
