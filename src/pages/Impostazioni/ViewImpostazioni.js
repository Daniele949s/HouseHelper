import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { auth, db } from "../../firebase";
import { signOut, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { showToast, showConfirm } from "../../utils/feedback";
import { getOfflineData, saveOfflineData } from "../../utils/offlineStorage";
import { getNotificationPreferences, saveNotificationPreferences } from "../../utils/notificationPrefs";

/**
 * ViewImpostazioni — Dedicated Settings view for HouseHelper.
 * Strictly adheres to Apple Human Interface Guidelines:
 * - Grouped table cards with 100% opaque surface (zero Liquid Glass on content containers).
 * - Minimum 44x44px touch targets across all buttons and controls.
 * - WCAG AA/AAA compliant contrast ratios in both dark and light modes.
 * - Zero Unicode emojis (FontAwesome SVGs exclusively).
 */
export default function ViewImpostazioni() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  // Household data state with instant offline hydration
  const [household, setHousehold] = useState(() => {
    if (userData?.casaId) {
      return getOfflineData(userData.casaId, "settings_household_cache") || null;
    }
    return null;
  });

  // Roommate count state with instant offline hydration
  const [roommatesCount, setRoommatesCount] = useState(() => {
    if (userData?.casaId) {
      const cached = getOfflineData(userData.casaId, "settings_household_cache");
      if (cached?.memberCount) return cached.memberCount;
      const dashCached = getOfflineData(userData.casaId, "dashboard_cache");
      if (dashCached?.utentiMap) return Object.keys(dashCached.utentiMap).length;
    }
    return 1;
  });

  const [loadingHousehold, setLoadingHousehold] = useState(!household);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Notification preferences state hydrated via notificationPrefs utility
  const [notifPrefs, setNotifPrefs] = useState(() => getNotificationPreferences());

  // Verification & reset states
  const [cooldown, setCooldown] = useState(0);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Fetch household info and roommates count concurrently
  useEffect(() => {
    let isMounted = true;
    const fetchHouseholdDetails = async () => {
      if (!userData?.casaId) {
        if (isMounted) setLoadingHousehold(false);
        return;
      }
      try {
        const casaRef = doc(db, "case", userData.casaId);
        const qUtenti = query(collection(db, "utenti"), where("casaId", "==", userData.casaId));

        const [casaSnap, utentiSnap] = await Promise.all([
          getDoc(casaRef),
          getDocs(qUtenti),
        ]);

        if (isMounted) {
          let casaData = null;
          if (casaSnap && typeof casaSnap.exists === "function" && casaSnap.exists()) {
            casaData = { id: casaSnap.id, ...casaSnap.data() };
            setHousehold(casaData);
          }
          const count = utentiSnap?.size || (casaData ? 1 : 0);
          setRoommatesCount(count);

          if (casaData) {
            saveOfflineData(userData.casaId, "settings_household_cache", {
              ...casaData,
              memberCount: count,
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch household details for settings:", err);
      } finally {
        if (isMounted) setLoadingHousehold(false);
      }
    };

    fetchHouseholdDetails();
    return () => {
      isMounted = false;
    };
  }, [userData?.casaId]);

  // Handle Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Toggle notification preferences with utility write-back
  const handleToggleNotification = (key) => {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveNotificationPreferences(updated);
      showToast(t("settings.notifications.saveFeedback"), "success");
      return updated;
    });
  };

  // Copy household invite code with visual feedback
  const handleCopyCode = async () => {
    const code = household?.codiceUnivoco || userData?.casaId;
    if (!code) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopiedCode(true);
      showToast(t("settings.household.codeCopied"), "success");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (_) {
      showToast(code, "info");
    }
  };

  // Copy User UID with visual feedback
  const handleCopyUid = async () => {
    if (!currentUser?.uid) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUser.uid);
      }
      setCopiedUid(true);
      showToast(
        language === "it"
          ? "ID utente copiato negli appunti!"
          : "User ID copied to clipboard!",
        "success"
      );
      setTimeout(() => setCopiedUid(false), 2000);
    } catch (_) {
      showToast(currentUser.uid, "info");
    }
  };

  // Send Email Verification
  const handleSendVerification = async () => {
    if (!currentUser || cooldown > 0 || sendingVerification) return;
    setSendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      setCooldown(60);
      showToast(t("settings.security.verificationSuccess"), "success");
    } catch (err) {
      console.error("Verification email error:", err);
      showToast(t("settings.security.verificationError"), "error");
    } finally {
      setSendingVerification(false);
    }
  };

  // Send Password Reset
  const handleSendPasswordReset = async () => {
    if (!currentUser?.email || sendingReset) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      showToast(t("settings.security.passwordResetSuccess"), "success");
    } catch (err) {
      console.error("Password reset error:", err);
      showToast(t("settings.security.passwordResetError"), "error");
    } finally {
      setSendingReset(false);
    }
  };

  // Sign out confirmation dialog with isDanger: true
  const handleLogout = useCallback(() => {
    showConfirm({
      title: t("settings.security.logoutConfirmTitle"),
      message: t("settings.security.logoutConfirmMessage"),
      confirmText: t("settings.security.logoutConfirmBtn"),
      cancelText: t("settings.security.logoutCancelBtn"),
      isDanger: true,
      onConfirm: async () => {
        try {
          await signOut(auth);
          navigate("/login");
        } catch (err) {
          console.error("Logout error:", err);
          showToast(t("common.error"), "error");
        }
      },
    });
  }, [navigate, t]);

  const isCreator = household?.creatoreId === currentUser?.uid;

  return (
    <div className="container dashboard-container settings-container domain-page-card" role="main">
      {/* Page Header */}
      <header className="settings-header">
        <div>
          <h1 className="dashboard-title">
            <i className="fas fa-sliders-h" style={{ color: "var(--color-primary)" }} aria-hidden="true"></i>
            {t("settings.title")}
          </h1>
          <p className="dashboard-subtitle">{t("settings.subtitle")}</p>
        </div>
      </header>

      {/* Household Identity Profile Card ("Spend your boldness in one place") */}
      <section className="card household-identity-card" aria-label={t("settings.household.title")}>
        <div className="household-identity-inner">
          {/* Left Block: Emblem Badge & Household Details */}
          <div className="household-identity-left">
            <div className="household-emblem-badge" aria-hidden="true">
              <i className="fas fa-home"></i>
            </div>
            <div className="household-info-stack">
              <span className="household-eyebrow">
                {t("settings.household.title")}
              </span>
              <div className="household-title-row">
                <h2 className="household-name-heading">
                  {loadingHousehold ? t("common.loading") : (household?.nome || t("settings.household.noHousehold"))}
                </h2>
                <span className="household-role-badge">
                  {isCreator ? t("settings.household.roleCreator") : t("settings.household.roleMember")}
                </span>
              </div>
              <div className="household-meta-row">
                <span className="household-roommate-chip">
                  <i className="fas fa-users" aria-hidden="true"></i>
                  {t("settings.household.membersCount", { count: roommatesCount || 1 })}
                </span>
              </div>
            </div>
          </div>

          {/* Right Block: Current User Chip & Invite Code Badge */}
          <div className="household-identity-right">
            {/* User Avatar Chip */}
            <div className="household-user-chip" title={currentUser?.email || ""}>
              <div className="household-user-avatar" aria-hidden="true">
                {(userData?.username || currentUser?.displayName || currentUser?.email || "U")[0].toUpperCase()}
              </div>
              <div className="household-user-name">
                {userData?.username || currentUser?.displayName || "User"}
              </div>
            </div>

            {/* Invite Code Badge with One-Click Copy */}
            {(household?.codiceUnivoco || userData?.casaId) && (
              <div className="household-code-wrapper">
                <span className="household-code-text">
                  {household?.codiceUnivoco || userData?.casaId}
                </span>
                <button
                  type="button"
                  className={`btn-code-copy ${copiedCode ? "copied" : ""}`}
                  onClick={handleCopyCode}
                  aria-label={t("settings.household.copyCode")}
                  style={{ minHeight: "44px", minWidth: "44px" }}
                >
                  <i className={`fas ${copiedCode ? "fa-check" : "fa-copy"}`} aria-hidden="true"></i>
                  <span>{copiedCode ? (language === "it" ? "Copiato!" : "Copied!") : t("settings.household.copyCode")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 1: Appearance & Language Grouped Table Card */}
      <section className="card settings-group-card" aria-labelledby="settings-appearance-heading">
        <h2 id="settings-appearance-heading" className="settings-section-title">
          <i className="fas fa-palette" aria-hidden="true"></i>
          {t("settings.theme.title")}
        </h2>

        {/* Language Row */}
        <div className="settings-row">
          <div className="settings-row-leading">
            <div className="settings-squircle language" aria-hidden="true">
              <i className="fas fa-globe"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.language.title")}</div>
              <div className="settings-row-desc">{t("settings.language.description")}</div>
            </div>
          </div>
          <div className="ios-segmented-control" role="group" aria-label={t("settings.language.title")}>
            <button
              type="button"
              aria-pressed={language === "it"}
              className={`ios-segmented-item ${language === "it" ? "active" : ""}`}
              onClick={() => setLanguage("it")}
              aria-label={t("settings.language.italian")}
              style={{ minHeight: "44px", minWidth: "56px" }}
            >
              <i className="fas fa-globe" aria-hidden="true"></i>
              <span>{t("settings.language.italian")}</span>
              <span className="ios-segmented-badge">IT</span>
            </button>
            <button
              type="button"
              aria-pressed={language === "en"}
              className={`ios-segmented-item ${language === "en" ? "active" : ""}`}
              onClick={() => setLanguage("en")}
              aria-label={t("settings.language.english")}
              style={{ minHeight: "44px", minWidth: "56px" }}
            >
              <i className="fas fa-globe" aria-hidden="true"></i>
              <span>{t("settings.language.english")}</span>
              <span className="ios-segmented-badge">EN</span>
            </button>
          </div>
        </div>

        {/* Theme 3-Way Mode Row */}
        <div className="settings-row">
          <div className="settings-row-leading">
            <div className="settings-squircle theme" aria-hidden="true">
              <i className="fas fa-paint-brush"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.theme.title")}</div>
              <div className="settings-row-desc">{t("settings.theme.description")}</div>
            </div>
          </div>
          <div className="ios-segmented-control" role="group" aria-label={t("settings.theme.title")}>
            <button
              type="button"
              aria-pressed={theme === "light"}
              className={`ios-segmented-item ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
              aria-label={t("settings.theme.light")}
              title={t("settings.theme.lightDesc")}
              style={{ minHeight: "44px", minWidth: "44px" }}
            >
              <i className="fas fa-sun" aria-hidden="true"></i>
              <span>{language === "it" ? "Chiaro" : "Light"}</span>
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              className={`ios-segmented-item ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
              aria-label={t("settings.theme.dark")}
              title={t("settings.theme.darkDesc")}
              style={{ minHeight: "44px", minWidth: "44px" }}
            >
              <i className="fas fa-moon" aria-hidden="true"></i>
              <span>{language === "it" ? "Scuro" : "Dark"}</span>
            </button>
            <button
              type="button"
              aria-pressed={theme === "system"}
              className={`ios-segmented-item ${theme === "system" ? "active" : ""}`}
              onClick={() => setTheme("system")}
              aria-label={t("settings.theme.system")}
              title={t("settings.theme.systemDesc")}
              style={{ minHeight: "44px", minWidth: "44px" }}
            >
              <i className="fas fa-desktop" aria-hidden="true"></i>
              <span>{language === "it" ? "Sistema" : "System"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Notifications Preferences Grouped Table Card */}
      <section className="card settings-group-card" aria-labelledby="settings-notifications-heading">
        <h2 id="settings-notifications-heading" className="settings-section-title">
          <i className="fas fa-bell" aria-hidden="true"></i>
          {t("settings.notifications.title")}
        </h2>
        <p className="settings-group-subtitle" style={{ marginTop: "-10px", marginBottom: "16px" }}>
          {t("settings.notifications.description")}
        </p>

        {/* 1. Chore Reminders Toggle */}
        <div className="settings-row has-switch">
          <div className="settings-row-leading">
            <div className="settings-squircle chores" aria-hidden="true">
              <i className="fas fa-broom"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.notifications.chores")}</div>
              <div className="settings-row-desc">{t("settings.notifications.choresDesc")}</div>
            </div>
          </div>
          <div className="settings-row-action">
            <button
              type="button"
              role="switch"
              id="toggle-chore-reminders"
              aria-checked={notifPrefs.choreReminders}
              aria-label={`${t("settings.notifications.chores")}: ${notifPrefs.choreReminders ? t("settings.notifications.enabled") : t("settings.notifications.disabled")}`}
              className={`apple-switch-toggle ${notifPrefs.choreReminders ? "is-active" : ""}`}
              onClick={() => handleToggleNotification("choreReminders")}
              style={{ minHeight: "44px", minWidth: "52px" }}
            >
              <span className="apple-switch-track">
                <span className="apple-switch-thumb" />
              </span>
            </button>
          </div>
        </div>

        {/* 2. Expense Alerts Toggle */}
        <div className="settings-row has-switch">
          <div className="settings-row-leading">
            <div className="settings-squircle expenses" aria-hidden="true">
              <i className="fas fa-wallet"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.notifications.expenses")}</div>
              <div className="settings-row-desc">{t("settings.notifications.expensesDesc")}</div>
            </div>
          </div>
          <div className="settings-row-action">
            <button
              type="button"
              role="switch"
              id="toggle-expense-alerts"
              aria-checked={notifPrefs.expenseAlerts}
              aria-label={`${t("settings.notifications.expenses")}: ${notifPrefs.expenseAlerts ? t("settings.notifications.enabled") : t("settings.notifications.disabled")}`}
              className={`apple-switch-toggle ${notifPrefs.expenseAlerts ? "is-active" : ""}`}
              onClick={() => handleToggleNotification("expenseAlerts")}
              style={{ minHeight: "44px", minWidth: "52px" }}
            >
              <span className="apple-switch-track">
                <span className="apple-switch-thumb" />
              </span>
            </button>
          </div>
        </div>

        {/* 3. Household Notices Toggle */}
        <div className="settings-row has-switch">
          <div className="settings-row-leading">
            <div className="settings-squircle notices" aria-hidden="true">
              <i className="fas fa-thumbtack"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.notifications.notices")}</div>
              <div className="settings-row-desc">{t("settings.notifications.noticesDesc")}</div>
            </div>
          </div>
          <div className="settings-row-action">
            <button
              type="button"
              role="switch"
              id="toggle-household-notices"
              aria-checked={notifPrefs.householdNotices}
              aria-label={`${t("settings.notifications.notices")}: ${notifPrefs.householdNotices ? t("settings.notifications.enabled") : t("settings.notifications.disabled")}`}
              className={`apple-switch-toggle ${notifPrefs.householdNotices ? "is-active" : ""}`}
              onClick={() => handleToggleNotification("householdNotices")}
              style={{ minHeight: "44px", minWidth: "52px" }}
            >
              <span className="apple-switch-track">
                <span className="apple-switch-thumb" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Account & Security Grouped Table Card */}
      <section className="card settings-group-card" aria-labelledby="settings-security-heading">
        <h2 id="settings-security-heading" className="settings-section-title">
          <i className="fas fa-shield-alt" aria-hidden="true"></i>
          {t("settings.security.title")}
        </h2>
        <p className="settings-group-subtitle" style={{ marginTop: "-10px", marginBottom: "16px" }}>
          {t("settings.security.description")}
        </p>

        {/* 1. Account Details: Name & User ID */}
        <div className="settings-row">
          <div className="settings-row-leading">
            <div className="settings-squircle account" aria-hidden="true">
              <i className="fas fa-user"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.security.profileSection")}</div>
              <div className="settings-row-desc" style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                <div>
                  <strong>{t("settings.security.username")}: </strong>
                  <span>{userData?.username || currentUser?.displayName || (language === "it" ? "Utente" : "User")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {language === "it" ? "ID Utente:" : "User ID:"}
                  </span>
                  <code className="monospace-pill" data-testid="settings-user-uid">
                    {currentUser?.uid || "-"}
                  </code>
                  {currentUser?.uid && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={handleCopyUid}
                      aria-label={language === "it" ? "Copia ID" : "Copy ID"}
                      style={{ minHeight: "44px", minWidth: "44px", padding: "6px 12px" }}
                    >
                      <i className={`fas ${copiedUid ? "fa-check" : "fa-copy"}`} aria-hidden="true" style={{ marginRight: "4px" }}></i>
                      {copiedUid ? (language === "it" ? "Copiato!" : "Copied!") : (language === "it" ? "Copia ID" : "Copy ID")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Email Address & Verification Status */}
        <div className="settings-row">
          <div className="settings-row-leading">
            <div className="settings-squircle security" aria-hidden="true">
              <i className="fas fa-envelope"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.security.email")}</div>
              <div className="settings-row-desc">{currentUser?.email || "-"}</div>
            </div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {currentUser?.emailVerified ? (
              <span className="badge badge-emerald" data-testid="badge-email-verified">
                <i className="fas fa-check-circle" aria-hidden="true"></i>
                {t("settings.security.verified")}
              </span>
            ) : (
              <span className="badge badge-amber" data-testid="badge-email-unverified">
                <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
                {t("settings.security.unverified")}
              </span>
            )}

            {!currentUser?.emailVerified && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSendVerification}
                disabled={cooldown > 0 || sendingVerification}
                style={{ minHeight: "44px", minWidth: "44px", padding: "8px 14px", fontWeight: 600 }}
              >
                <i className="fas fa-paper-plane" aria-hidden="true" style={{ marginRight: "6px" }}></i>
                {sendingVerification
                  ? t("settings.security.sendingVerification")
                  : cooldown > 0
                  ? t("settings.security.verificationCooldown", { seconds: cooldown })
                  : t("settings.security.sendVerificationBtn")}
              </button>
            )}
          </div>
        </div>

        {/* 3. Password Reset Action */}
        <div className="settings-row">
          <div className="settings-row-leading">
            <div className="settings-squircle password" aria-hidden="true">
              <i className="fas fa-key"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.security.passwordSection")}</div>
              <div className="settings-row-desc">{t("settings.security.passwordDesc")}</div>
            </div>
          </div>
          <div className="settings-row-action">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSendPasswordReset}
              disabled={sendingReset || !currentUser?.email}
              style={{ minHeight: "44px", minWidth: "44px", padding: "8px 14px", fontWeight: 600 }}
            >
              <i className="fas fa-envelope-open-text" aria-hidden="true" style={{ marginRight: "6px" }}></i>
              {sendingReset ? t("settings.security.sendingPasswordReset") : t("settings.security.sendPasswordResetBtn")}
            </button>
          </div>
        </div>

        {/* 4. Session & Household Info Badge */}
        <div className="settings-row">
          <div className="settings-row-leading">
            <div className="settings-squircle security" aria-hidden="true">
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title">{t("settings.security.sessionSection")}</div>
              <div className="settings-row-desc" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                <span className="badge badge-emerald" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                  <i className="fas fa-circle" aria-hidden="true" style={{ fontSize: "0.55rem", marginRight: "4px" }}></i>
                  {t("settings.security.sessionSection")}
                </span>
                <span className="badge badge-indigo" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                  <i className="fas fa-home" aria-hidden="true" style={{ marginRight: "4px" }}></i>
                  {household?.nome || userData?.casaId || t("settings.household.noHousehold")}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {t("settings.security.sessionInfo", { email: currentUser?.email || "" })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Logout Action */}
        <div className="settings-row" style={{ borderBottom: "none", paddingTop: "20px" }}>
          <div className="settings-row-leading">
            <div className="settings-squircle" style={{ background: "linear-gradient(135deg, var(--color-danger), #e11d48)" }} aria-hidden="true">
              <i className="fas fa-sign-out-alt"></i>
            </div>
            <div className="settings-row-info">
              <div className="settings-row-title" style={{ color: "var(--color-danger)" }}>
                {t("settings.security.logoutBtn")}
              </div>
              <div className="settings-row-desc">
                {t("settings.security.logoutConfirmMessage")}
              </div>
            </div>
          </div>
          <div className="settings-row-action">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleLogout}
              style={{ minHeight: "44px", minWidth: "44px", padding: "8px 18px", fontWeight: 600 }}
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true" style={{ marginRight: "6px" }}></i>
              {t("settings.security.logoutBtn")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
