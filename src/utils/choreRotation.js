/**
 * Chore Rotation & Vacation Mode Automation Utility
 *
 * Implements:
 * 1. Vacation/Away mode verification (date range or open-ended)
 * 2. Available roommates filter (excluding vacationing members)
 * 3. Deterministic round-robin rotation queue
 */

/**
 * Normalizes date object or string to "YYYY-MM-DD"
 * @param {Date | string} d
 * @returns {string}
 */
export function normalizeDateStr(d) {
  if (!d) {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }
  if (d instanceof Date) {
    return d.toISOString().split("T")[0];
  }
  const str = String(d).trim();
  // If ISO string with time e.g. "2026-11-04T12:00:00.000Z"
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  return str;
}

/**
 * Determines whether a user is currently on vacation on a given date.
 *
 * @param {object} userData - { inVacanza?: boolean, vacanzaInizio?: string, vacanzaFine?: string }
 * @param {Date | string} [checkDate] - Date to check (default: current date)
 * @returns {boolean}
 */
export function isUserOnVacation(userData, checkDate = new Date()) {
  if (!userData || !userData.inVacanza) return false;

  const dateStr = normalizeDateStr(checkDate);

  const inizio = userData.vacanzaInizio ? normalizeDateStr(userData.vacanzaInizio) : null;
  const fine = userData.vacanzaFine ? normalizeDateStr(userData.vacanzaFine) : null;

  if (inizio && fine) {
    return dateStr >= inizio && dateStr <= fine;
  }
  if (inizio) {
    return dateStr >= inizio;
  }
  if (fine) {
    return dateStr <= fine;
  }

  // Open-ended vacation mode
  return true;
}

/**
 * Returns the list of roommates who are available (not on vacation) for a given date.
 *
 * @param {Array<object>} roommates - List of user objects
 * @param {Date | string} [checkDate] - Date to check
 * @returns {Array<object>}
 */
export function getAvailableRoommates(roommates = [], checkDate = new Date()) {
  if (!Array.isArray(roommates)) return [];
  return roommates.filter((r) => !isUserOnVacation(r, checkDate));
}

/**
 * Deterministically computes the next assignee for a chore using a round-robin queue,
 * skipping roommates on vacation.
 *
 * @param {string | null} currentAssigneeUid - UID of current assignee (if any)
 * @param {Array<object>} activeRoommates - List of active, non-vacationing roommates
 * @param {string[]} [rotationOrder] - Optional explicit UID ordering
 * @returns {{ assignee: object | null, isAllOnVacation: boolean }}
 */
export function rotateChoreAssignee(
  currentAssigneeUid,
  activeRoommates = [],
  rotationOrder = []
) {
  if (!activeRoommates || activeRoommates.length === 0) {
    return { assignee: null, isAllOnVacation: true };
  }

  // Deterministic ordering: explicit rotationOrder or alphabetical by username / uid
  const sorted = [...activeRoommates].sort((a, b) => {
    if (rotationOrder && rotationOrder.length > 0) {
      const idxA = rotationOrder.indexOf(a.uid);
      const idxB = rotationOrder.indexOf(b.uid);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return (a.username || a.uid || "").localeCompare(b.username || b.uid || "");
  });

  const total = sorted.length;
  const currentIndex = sorted.findIndex((r) => r.uid === currentAssigneeUid);

  // If current assignee found, take next; otherwise start at 0
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % total : 0;

  return {
    assignee: sorted[nextIndex],
    isAllOnVacation: false
  };
}
