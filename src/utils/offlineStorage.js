/**
 * Multi-Tenant Isolated Offline Storage Utility
 *
 * Implements:
 * 1. Client-side caching scoped strictly by casaId (hh_offline_${casaId}_${key})
 * 2. Multi-tenant boundary isolation (preventing cross-household leakage)
 * 3. Safe tenant eviction and total cache purge on logout
 */

const STORAGE_PREFIX = "hh_offline_";

/**
 * Generates isolated key scoped to a specific house.
 * @param {string} casaId
 * @param {string} key
 * @returns {string | null}
 */
function getScopedKey(casaId, key) {
  if (!casaId || typeof casaId !== "string" || !key || typeof key !== "string") {
    return null;
  }
  return `${STORAGE_PREFIX}${casaId}_${key}`;
}

/**
 * Saves JSON-serializable data to tenant-scoped storage.
 *
 * @param {string} casaId
 * @param {string} key
 * @param {any} data
 * @returns {boolean} Success status
 */
export function saveOfflineData(casaId, key, data) {
  const scopedKey = getScopedKey(casaId, key);
  if (!scopedKey || typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    const payload = {
      cachedAt: new Date().toISOString(),
      data
    };
    window.localStorage.setItem(scopedKey, JSON.stringify(payload));
    return true;
  } catch {
    // QuotaExceededError or private browsing restrictions
    return false;
  }
}

/**
 * Retrieves cached data for a specific household.
 *
 * @param {string} casaId
 * @param {string} key
 * @returns {any | null} Cached data or null if not found
 */
export function getOfflineData(casaId, key) {
  const scopedKey = getScopedKey(casaId, key);
  if (!scopedKey || typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(scopedKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data !== undefined ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Purges all cached keys belonging to a specific household.
 *
 * @param {string} casaId
 */
export function purgeTenantStorage(casaId) {
  if (!casaId || typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const tenantPrefix = `${STORAGE_PREFIX}${casaId}_`;
  const keysToRemove = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(tenantPrefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((k) => window.localStorage.removeItem(k));
}

/**
 * Complete eviction of all HouseHelper offline tenant data.
 * Must be executed upon user logout to prevent cross-session / cross-household data residue.
 */
export function purgeAllOfflineStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const keysToRemove = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((k) => window.localStorage.removeItem(k));
}
