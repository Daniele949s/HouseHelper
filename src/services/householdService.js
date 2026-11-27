import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import { isSafeInviteCode, isSafeStoragePath } from "../utils/security";

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
    const rawHouse = casaSnap.data() || {};
    const inviteCode =
      rawHouse.codiceUnivoco ||
      rawHouse.codice ||
      rawHouse.codiceInvito ||
      rawHouse.inviteCode;
    house = {
      id: casaSnap.id,
      ...rawHouse,
      ...(inviteCode ? { codiceUnivoco: inviteCode } : {}),
    };
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

  if (house && !house.adminUid && !house.creatoreId && roommates.length > 0) {
    const explicitAdmin = roommates.find((r) => r.ruoloCasa === "admin");
    const inferredUid = explicitAdmin?.uid || (roommates.length === 1 ? roommates[0].uid : null);
    if (inferredUid) {
      house = { ...house, adminUid: inferredUid, creatoreId: inferredUid };
    }
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

  await setDoc(doc(db, "inviti", inviteCode), {
    casaId: casaRef.id,
    nomeCasa: name,
    creatoreId: creatorUid,
    createdAt: new Date(),
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
 * @param {{ code: string, userUid: string, isCurrent?: () => boolean }} params
 * @returns {Promise<{ house: object }|null>} Null when no Household matches code
 */
export async function joinHousehold({ code, userUid, isCurrent = () => true }) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!isSafeInviteCode(normalizedCode)) {
    return null;
  }

  // Canonical secure lookup: exact document GET on /inviti/{codice} (zero enumeration on /case).
  let targetCasaId = null;
  let targetHouseData = null;

  try {
    const inviteSnap = await getDoc(doc(db, "inviti", normalizedCode));
    if (inviteSnap && typeof inviteSnap.exists === "function" && inviteSnap.exists()) {
      const inviteData = inviteSnap.data() || {};
      targetCasaId = inviteData.casaId;
      targetHouseData = {
        id: inviteData.casaId,
        nome: inviteData.nomeCasa,
        codiceUnivoco: normalizedCode,
      };
    }
  } catch {
    return null;
  }

  if (!targetCasaId || !isCurrent()) {
    return null;
  }

  await updateDoc(doc(db, "utenti", userUid), {
    casaId: targetCasaId,
    ruoloCasa: "member",
    statoMembro: "pending",
  });

  return {
    house: targetHouseData,
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

export async function deleteHousehold({ casaId, adminUid }) {
  if (!casaId || !adminUid) {
    throw new Error("Household ID and admin UID are required.");
  }

  const domainCollections = ["turni", "debiti", "spesa", "note", "documenti", "contatti"];
  const collectionNames = [...domainCollections, "utenti"];
  const snapshots = await Promise.all(collectionNames.map((name) =>
    getDocs(query(collection(db, name), where("casaId", "==", casaId)))
  ));
  const membership = { casaId: null, ruoloCasa: null, statoMembro: null };
  const cleanup = [];

  collectionNames.forEach((name, index) => {
    snapshots[index].forEach((docSnap) => {
      if (name === "utenti") {
        if (docSnap.id !== adminUid) {
          cleanup.push(updateDoc(doc(db, name, docSnap.id), membership));
        }
        return;
      }

      if (name === "documenti") {
        const data = docSnap.data();
        if (data?.storagePath && !data.isFirestoreInline && isSafeStoragePath(data.storagePath, casaId)) {
          cleanup.push(deleteObject(ref(storage, data.storagePath)).catch(() => {}));
        }
      }
      cleanup.push(deleteDoc(doc(db, name, docSnap.id)));
    });
  });

  await Promise.all(cleanup);
  try {
    const casaSnap = await getDoc(doc(db, "case", casaId));
    const inviteCode = casaSnap && typeof casaSnap.exists === "function" && casaSnap.exists()
      ? casaSnap.data()?.codiceUnivoco
      : null;
    if (inviteCode) {
      await deleteDoc(doc(db, "inviti", String(inviteCode).trim().toUpperCase())).catch(() => {});
    }
  } catch {
    // Ignore invite cleanup failure if invite doc did not exist
  }
  await deleteDoc(doc(db, "case", casaId));
  await updateDoc(doc(db, "utenti", adminUid), membership);
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
