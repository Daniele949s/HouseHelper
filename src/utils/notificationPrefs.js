/**
 * src/utils/notificationPrefs.js
 * Utility for hydrating and persisting user notification preferences in localStorage.
 * Provides zero-latency client hydration and resilience against storage exceptions.
 */

export const NOTIFICATION_PREFS_KEY = "househelper_notification_prefs";

export const DEFAULT_NOTIFICATION_PREFS = Object.freeze({
  choreReminders: true,
  expenseAlerts: true,
  householdNotices: true,
});

/**
 * Synchronously load notification preferences from localStorage with fallback to defaults.
 * @returns {{ choreReminders: boolean, expenseAlerts: boolean, householdNotices: boolean }}
 */
export function getNotificationPreferences() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          choreReminders: typeof parsed.choreReminders === "boolean" ? parsed.choreReminders : DEFAULT_NOTIFICATION_PREFS.choreReminders,
          expenseAlerts: typeof parsed.expenseAlerts === "boolean" ? parsed.expenseAlerts : DEFAULT_NOTIFICATION_PREFS.expenseAlerts,
          householdNotices: typeof parsed.householdNotices === "boolean" ? parsed.householdNotices : DEFAULT_NOTIFICATION_PREFS.householdNotices,
        };
      }
    }
  } catch (err) {
    console.warn("Could not read notification preferences from localStorage:", err);
  }
  return { ...DEFAULT_NOTIFICATION_PREFS };
}

/**
 * Persist notification preferences to localStorage.
 * @param {{ choreReminders: boolean, expenseAlerts: boolean, householdNotices: boolean }} prefs
 * @returns {{ choreReminders: boolean, expenseAlerts: boolean, householdNotices: boolean }}
 */
export function saveNotificationPreferences(prefs) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
    }
  } catch (err) {
    console.warn("Could not save notification preferences to localStorage:", err);
  }
  return prefs;
}
