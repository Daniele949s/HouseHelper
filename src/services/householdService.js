import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 6;

/**
 * Generates a 6-character random alphanumeric InviteCode.
 * @returns {string}
 */
export function generateInviteCode() {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length));
  }
  return code;
}

/**
 * Fetches the active Household document and all its Roommate profiles concurrently.
 * Normalizes the roommate list and { [uid]: username } lookup map behind one seam.
 *
 * @param {string} casaId - Active Household ID
 * @param {string} [fallbackUsername="Coinquilino"] - Fallback label when username is absent
 * @returns {Promise<{ house: object|null, roommates: Array<object>, roommateMap: Record<string, string> }>}
 */
export async function fetchHouseholdData(casaId, fallbackUsername = "Coinquilino") {
  if (!casaId) {
    return { house: null, roommates: [], roommateMap: {} };
  }

  const casaRef = doc(db, "case", casaId);
  const qUtenti = query(collection(db, "utenti"), where("casaId", "==", casaId));

  const [casaSnap, utentiSnap] = await Promise.all([
    getDoc(casaRef).catch(() => null),
    getDocs(qUtenti),
  ]);

  let house = null;
  if (casaSnap && typeof casaSnap.exists === "function" && casaSnap.exists()) {
    house = { id: casaSnap.id, ...casaSnap.data() };
  }

  const roommates = [];
  const roommateMap = {};
  if (utentiSnap && typeof utentiSnap.forEach === "function") {
    utentiSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const profile = { uid: docSnap.id, id: docSnap.id, ...data };
      roommates.push(profile);
      roommateMap[docSnap.id] = data.username || fallbackUsername;
    });
  }

  return { house, roommates, roommateMap };
}

/**
 * Creates a new Household and assigns the creator as its first Roommate.
 *
 * @param {{ name: string, creatorUid: string }} params
 * @returns {Promise<{ house: object, inviteCode: string }>}
 */
export async function createHousehold({ name, creatorUid }) {
  const inviteCode = generateInviteCode();
  const casaRef = await addDoc(collection(db, "case"), {
    nome: name,
    codiceUnivoco: inviteCode,
    createdAt: new Date(),
    adminUid: creatorUid,
    creatoreId: creatorUid,
  });

  await updateDoc(doc(db, "utenti", creatorUid), {
    casaId: casaRef.id,
    ruoloCasa: "admin",
    statoMembro: "active",
  });

  return {
    house: {
      id: casaRef.id,
      nome: name,
      codiceUnivoco: inviteCode,
      adminUid: creatorUid,
      creatoreId: creatorUid,
    },
    inviteCode,
  };
}

/**
 * Joins an existing Household matching the provided InviteCode.
 *
 * @param {{ code: string, userUid: string }} params
 * @returns {Promise<{ house: object }|null>} Null when no Household matches code
 */
export async function joinHousehold({ code, userUid }) {
  const q = query(collection(db, "case"), where("codiceUnivoco", "==", code), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const casaDoc = querySnapshot.docs[0];
  await updateDoc(doc(db, "utenti", userUid), {
    casaId: casaDoc.id,
    ruoloCasa: "member",
    statoMembro: "pending",
  });

  return {
    house: { id: casaDoc.id, ...casaDoc.data() },
  };
}

export function isUserHouseAdmin(house, userUid) {
  return Boolean(house && userUid && (house.adminUid ? house.adminUid === userUid : house.creatoreId === userUid));
}

export async function acceptHouseholdMember({ casaId, adminUid, targetUid }) {
  if (!casaId || !adminUid || !targetUid || adminUid === targetUid) {
    throw new Error("A different household member is required.");
  }
  await updateDoc(doc(db, "utenti", targetUid), { statoMembro: "active", ruoloCasa: "member" });
}

export async function kickHouseholdMember({ casaId, adminUid, targetUid }) {
  if (!casaId || !adminUid || !targetUid || adminUid === targetUid) {
    throw new Error("A different household member is required.");
  }
  await updateDoc(doc(db, "utenti", targetUid), {
    casaId: null,
    ruoloCasa: null,
    statoMembro: null,
  });
}

export async function transferHouseholdAdmin({ casaId, currentAdminUid, newAdminUid }) {
  if (!casaId || !currentAdminUid || !newAdminUid || currentAdminUid === newAdminUid) {
    throw new Error("A different household member is required.");
  }

  const batch = writeBatch(db);
  batch.update(doc(db, "case", casaId), { adminUid: newAdminUid, creatoreId: newAdminUid });
  batch.update(doc(db, "utenti", newAdminUid), { ruoloCasa: "admin", statoMembro: "active" });
  batch.update(doc(db, "utenti", currentAdminUid), { ruoloCasa: "member" });
  await batch.commit();
}

/**
 * Removes the current Roommate from their active Household.
 *
 * @param {string} userUid
 * @returns {Promise<void>}
 */
export async function leaveHousehold(userUid) {
  await updateDoc(doc(db, "utenti", userUid), { casaId: null, ruoloCasa: null, statoMembro: null });
}

/**
 * Persists a Roommate's VacationWindow state.
 *
 * @param {string} userUid
 * @param {{ inVacanza: boolean, vacanzaInizio?: string, vacanzaFine?: string }} vacation
 * @returns {Promise<void>}
 */
export async function updateRoommateVacation(userUid, { inVacanza, vacanzaInizio = null, vacanzaFine = null }) {
  await updateDoc(doc(db, "utenti", userUid), {
    inVacanza: Boolean(inVacanza),
    vacanzaInizio: inVacanza ? (vacanzaInizio || null) : null,
    vacanzaFine: inVacanza ? (vacanzaFine || null) : null,
  });
}
