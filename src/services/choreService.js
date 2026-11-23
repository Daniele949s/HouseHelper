import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  sanitizeList,
  sanitizeText,
  sanitizeChecklist,
  validateDate,
} from "../utils/security";
import {
  getAvailableRoommates,
  rotateChoreAssignee,
} from "../utils/choreRotation";

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 7; i < 23; i++) {
    const start = i.toString().padStart(2, "0") + ":00";
    const end = (i + 1).toString().padStart(2, "0") + ":00";
    slots.push(`${start} - ${end}`);
  }
  return slots;
};

export const CHORE_TIME_SLOTS = generateTimeSlots();

/**
 * Fetches and sorts all Chores for a Household by date ascending.
 *
 * @param {string} casaId
 * @returns {Promise<Array<object>>}
 */
export async function fetchHouseChores(casaId) {
  if (!casaId) return [];
  const q = query(collection(db, "turni"), where("casaId", "==", casaId));
  const querySnapshot = await getDocs(q);
  const data = querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
  data.sort((a, b) => new Date(a.data) - new Date(b.data));
  return data;
}

/**
 * Fetches a single Chore and enforces Household ownership.
 *
 * @param {string} choreId
 * @param {string} casaId
 * @returns {Promise<{ status: "ok"|"not_found"|"unauthorized", chore?: object }>}
 */
export async function fetchChoreById(choreId, casaId) {
  const turnoDoc = await getDoc(doc(db, "turni", choreId));
  if (!turnoDoc.exists()) {
    return { status: "not_found" };
  }
  const data = turnoDoc.data();
  if (data.casaId !== casaId) {
    return { status: "unauthorized" };
  }
  return { status: "ok", chore: { id: turnoDoc.id, ...data } };
}

/**
 * Validates, sanitizes, and constructs a Chore Firestore payload.
 *
 * @param {object} input
 * @returns {{ valid: boolean, payload?: object, errorKey?: string, errorMessage?: string }}
 */
export function validateAndBuildChorePayload({
  nomi,
  data,
  luoghi,
  procedura,
  fasciaOraria,
  checklist = [],
  casaId,
  utenteId,
  isEdit = false,
}) {
  const cleanedNomi = sanitizeList(nomi, 10, 50);
  const cleanedLuoghi = sanitizeList(luoghi, 10, 80);
  const cleanedProcedura = sanitizeList(procedura, 10, 150);
  const dateValidation = validateDate(data);

  if (cleanedNomi.length === 0) {
    return { valid: false, errorKey: isEdit ? "no_assignee_edit" : "no_assignee" };
  }
  if (!dateValidation.isValid) {
    return {
      valid: false,
      errorKey: isEdit ? "invalid_date_edit" : "invalid_date",
      errorMessage: dateValidation.error,
    };
  }
  if (cleanedLuoghi.length === 0) {
    return { valid: false, errorKey: isEdit ? "no_location_edit" : "no_location" };
  }
  if (!CHORE_TIME_SLOTS.includes(fasciaOraria)) {
    return { valid: false, errorKey: "invalid_time_slot" };
  }

  const basePayload = {
    nomi: cleanedNomi,
    data: dateValidation.date,
    luoghi: cleanedLuoghi,
    procedura: cleanedProcedura,
    fasciaOraria: [fasciaOraria],
    mansione: cleanedLuoghi.join(", "),
    casaId,
  };

  if (isEdit) {
    return { valid: true, payload: basePayload };
  }

  return {
    valid: true,
    payload: {
      ...basePayload,
      utenteId,
      checklist: sanitizeChecklist(checklist, 20, 100),
      completato: false,
    },
  };
}

/**
 * Creates a new Chore document in Firestore.
 */
export async function createChore(payload) {
  return addDoc(collection(db, "turni"), payload);
}

/**
 * Updates an existing Chore document in Firestore.
 */
export async function updateChore(choreId, payload) {
  return updateDoc(doc(db, "turni", choreId), payload);
}

/**
 * Deletes a Chore after verifying Household ownership.
 */
export async function deleteChore(chore, casaId) {
  if (!chore || chore.casaId !== casaId) {
    const err = new Error("Unauthorized chore delete");
    err.code = "unauthorized";
    throw err;
  }
  await deleteDoc(doc(db, "turni", chore.id));
}

/**
 * Computes the next checklist and completion state when toggling a subtask.
 */
export function buildToggledChecklist(chore, subTaskId, actorUsername = "Utente") {
  const currentChecklist = Array.isArray(chore?.checklist) ? chore.checklist : [];
  const updatedChecklist = currentChecklist.map((item) => {
    if (item.id === subTaskId) {
      const nextState = !item.completed;
      return {
        ...item,
        completed: nextState,
        completedBy: nextState ? actorUsername : null,
        completedAt: nextState ? new Date().toISOString() : null,
      };
    }
    return item;
  });

  const completato =
    updatedChecklist.length > 0 && updatedChecklist.every((i) => i.completed);
  const completatoIl = completato ? new Date().toISOString() : null;

  return { checklist: updatedChecklist, completato, completatoIl };
}

/**
 * Persists a checklist subtask toggle.
 */
export async function toggleChoreSubtask(chore, subTaskId, actorUsername) {
  const nextState = buildToggledChecklist(chore, subTaskId, actorUsername);
  await updateDoc(doc(db, "turni", chore.id), nextState);
  return nextState;
}

/**
 * Computes and validates appending a new subtask to a Chore checklist.
 */
export function buildAddedSubtaskChecklist(chore, rawText) {
  const cleanedText = sanitizeText((rawText || "").trim(), 100);
  if (!cleanedText) {
    return { status: "empty" };
  }
  const currentChecklist = Array.isArray(chore?.checklist) ? chore.checklist : [];
  if (currentChecklist.length >= 20) {
    return { status: "limit_reached" };
  }
  const newItem = {
    id: `chk_${Date.now()}_${currentChecklist.length}`,
    text: cleanedText,
    completed: false,
    completedBy: null,
    completedAt: null,
  };
  return {
    status: "ok",
    checklist: sanitizeChecklist([...currentChecklist, newItem]),
    completato: false,
  };
}

/**
 * Persists a new checklist subtask on a Chore.
 */
export async function addChoreSubtask(choreId, checklist) {
  await updateDoc(doc(db, "turni", choreId), {
    checklist,
    completato: false,
  });
}

/**
 * Computes the next round-robin Chore assignment skipping vacationing Roommates
 * and persists the generated Chore document.
 */
export async function rotateAndCreateChore({
  casaId,
  utenteId,
  casaDoc,
  roommates,
  turni,
  defaults = {},
}) {
  const safeRoommates = Array.isArray(roommates)
    ? roommates.filter(
        (r) =>
          r &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          typeof r.username === "string" &&
          r.username.trim().length > 0
      )
    : [];
  const safeTurni = Array.isArray(turni)
    ? turni.filter((item) => item && typeof item === "object" && !Array.isArray(item))
    : [];
  const safeDefaults =
    defaults && typeof defaults === "object" && !Array.isArray(defaults)
      ? defaults
      : {};

  let nextDateStr = new Date().toISOString().split("T")[0];
  if (safeTurni.length > 0) {
    const lastChore = safeTurni[safeTurni.length - 1];
    if (lastChore && lastChore.data) {
      const rawDate = String(lastChore.data).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const dateValidation = validateDate(rawDate);
        if (dateValidation.isValid) {
          const [year, month, day] = dateValidation.date.split("-").map(Number);
          const utcDate = new Date(Date.UTC(year, month - 1, day + 7));
          if (!Number.isNaN(utcDate.getTime())) {
            nextDateStr = utcDate.toISOString().split("T")[0];
          }
        }
      } else {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
          parsed.setUTCDate(parsed.getUTCDate() + 7);
          nextDateStr = parsed.toISOString().split("T")[0];
        }
      }
    }
  }

  const activeRoommates = getAvailableRoommates(safeRoommates, nextDateStr);
  if (activeRoommates.length === 0) {
    return { status: "all_vacation" };
  }

  const rotationSettings =
    casaDoc &&
    typeof casaDoc === "object" &&
    !Array.isArray(casaDoc) &&
    casaDoc.impostazioniTurni &&
    typeof casaDoc.impostazioniTurni === "object" &&
    !Array.isArray(casaDoc.impostazioniTurni)
      ? casaDoc.impostazioniTurni
      : {};
  const explicitOrder = Array.isArray(rotationSettings.ordineRotazione)
    ? rotationSettings.ordineRotazione.filter(
        (id) => typeof id === "string" && id.trim().length > 0
      )
    : [];

  const lastChoreNomi =
    safeTurni.length > 0 ? safeTurni[safeTurni.length - 1]?.nomi : null;
  const lastAssigneeUsername = Array.isArray(lastChoreNomi)
    ? lastChoreNomi.find(
        (name) => typeof name === "string" && name.trim().length > 0
      ) || null
    : typeof lastChoreNomi === "string" && lastChoreNomi.trim().length > 0
    ? lastChoreNomi
    : null;
  const lastAssigneeObj = lastAssigneeUsername
    ? safeRoommates.find((r) => r.username === lastAssigneeUsername)
    : null;

  const { assignee } = rotateChoreAssignee(
    lastAssigneeObj?.uid || null,
    activeRoommates,
    explicitOrder
  );

  if (
    !assignee ||
    typeof assignee.username !== "string" ||
    assignee.username.trim().length === 0
  ) {
    return { status: "no_assignee" };
  }

  const defaultLocation = safeDefaults.location || "Pulizia Generale";
  const newChore = {
    nomi: [assignee.username],
    data: nextDateStr,
    luoghi: [defaultLocation],
    procedura: [safeDefaults.procedure || "Rotazione automatica programmata"],
    fasciaOraria: ["10:00 - 11:00"],
    casaId,
    utenteId,
    mansione: defaultLocation,
    checklist: [
      {
        id: `chk_${Date.now()}_1`,
        text: safeDefaults.task1 || "Pulire superfici e pavimenti",
        completed: false,
      },
      {
        id: `chk_${Date.now()}_2`,
        text: safeDefaults.task2 || "Svuotare cestini",
        completed: false,
      },
    ],
    completato: false,
  };

  await addDoc(collection(db, "turni"), newChore);
  return { status: "ok", assignee, chore: newChore };
}
