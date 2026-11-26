/**
 * Multi-Tenant Isolated Offline Storage Utility
 *
 * Implements:
 * 1. Client-side caching scoped strictly by casaId (hh_offline_${casaId}_${key})
 * 2. Multi-tenant boundary isolation (preventing cross-household leakage)
 * 3. Safe tenant eviction and total cache purge on logout
 */

const STORAGE_PREFIX = "hh_offline_";
export const OFFLINE_SCHEMA_VERSION = 1;

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
      version: OFFLINE_SCHEMA_VERSION,
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    if (parsed.version !== undefined && parsed.version !== OFFLINE_SCHEMA_VERSION) {
      return null;
    }
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
  invalidateTenantFreshness(casaId);
}

/**
 * Complete eviction of all HouseHelper offline tenant data.
 * Must be executed upon user logout to prevent cross-session / cross-household data residue.
 */
export function purgeAllOfflineStorage() {
  tenantFreshnessMap.clear();
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

// In-memory freshness timestamps per (casaId, scope) to avoid redundant Firestore reads
// on rapid tab navigation while always clearing on logout, house switch, or mutation.
const tenantFreshnessMap = new Map();

export function markTenantFresh(casaId, scope = "dashboard") {
  if (!casaId) return;
  tenantFreshnessMap.set(`${casaId}:${scope}`, Date.now());
}

export function isTenantFresh(casaId, scope = "dashboard", ttlMs = 20000) {
  if (!casaId) return false;
  const ts = tenantFreshnessMap.get(`${casaId}:${scope}`);
  return typeof ts === "number" && Date.now() - ts < ttlMs;
}

export function invalidateTenantFreshness(casaId, scope = null) {
  if (!casaId) {
    tenantFreshnessMap.clear();
    return;
  }
  if (scope) {
    tenantFreshnessMap.delete(`${casaId}:${scope}`);
    return;
  }
  const prefix = `${casaId}:`;
  for (const key of tenantFreshnessMap.keys()) {
    if (key.startsWith(prefix)) {
      tenantFreshnessMap.delete(key);
    }
  }
}

const CACHE_KEYS = {
  DASHBOARD: "dashboard_cache",
  HOUSEHOLD: "settings_household_cache",
  CONTACTS: "contatti",
};

export function getDashboardSnapshot(casaId) {
  return getOfflineData(casaId, CACHE_KEYS.DASHBOARD);
}

export function saveDashboardSnapshot(casaId, snapshot) {
  return saveOfflineData(casaId, CACHE_KEYS.DASHBOARD, snapshot);
}

export function getHouseholdSnapshot(casaId) {
  return getOfflineData(casaId, CACHE_KEYS.HOUSEHOLD);
}

export function saveHouseholdSnapshot(casaId, snapshot) {
  return saveOfflineData(casaId, CACHE_KEYS.HOUSEHOLD, snapshot);
}

export function getContactsSnapshot(casaId) {
  return getOfflineData(casaId, CACHE_KEYS.CONTACTS) || [];
}

export function saveContactsSnapshot(casaId, contacts) {
  return saveOfflineData(casaId, CACHE_KEYS.CONTACTS, contacts);
}
