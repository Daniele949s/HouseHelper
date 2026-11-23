import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  calculateNetBalances,
  simplifyDebts,
  calculateSplitAllocations,
} from "../utils/debtSimplification";

export { calculateNetBalances, simplifyDebts, calculateSplitAllocations };

/**
 * Fetches and sorts all Ledger debt entries for a Household by createdAt descending.
 *
 * @param {string} casaId
 * @returns {Promise<Array<object>>}
 */
export async function fetchHouseDebts(casaId) {
  if (!casaId) return [];
  const qDebiti = query(collection(db, "debiti"), where("casaId", "==", casaId));
  const snapDebiti = await getDocs(qDebiti);
  const data = snapDebiti.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
  data.sort(
    (a, b) =>
      new Date(b.createdAt?.toMillis ? b.createdAt.toMillis() : 0) -
      new Date(a.createdAt?.toMillis ? a.createdAt.toMillis() : 0)
  );
  return data;
}

/**
 * Computes a Roommate's net balance in euros from the canonical cent-exact balance map.
 *
 * @param {Record<string, { cents: number }>} netBalances
 * @param {string} userUid
 * @returns {number}
 */
export function getUserNetBalance(netBalances, userUid) {
  if (!netBalances || !userUid || !netBalances[userUid]) return 0;
  return netBalances[userUid].cents / 100;
}

/**
 * Deletes or settles a single Ledger debt after verifying Household ownership.
 *
 * @param {object} debt
 * @param {string} casaId
 * @returns {Promise<void>}
 */
export async function deleteLedgerDebt(debt, casaId) {
  if (!debt || debt.casaId !== casaId) {
    const err = new Error("Unauthorized debt operation");
    err.code = "unauthorized";
    throw err;
  }
  await deleteDoc(doc(db, "debiti", debt.id));
}

/**
 * Records an offsetting settlement transaction from a simplified transfer.
 */
export async function recordSimplifiedSettlement({ trans, casaId, description }) {
  return addDoc(collection(db, "debiti"), {
    importo: trans.amount,
    descrizione: description,
    debitoreId: trans.to,
    creditoreId: trans.from,
    casaId,
    createdAt: new Date(),
  });
}

/**
 * Creates one or more Ledger debt documents (either split across roommates or single debtor).
 */
export async function createLedgerDebts({ casaId, entries }) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }
  const batch = writeBatch(db);
  const createdAt = new Date();
  for (const entry of entries) {
    const debtRef = doc(collection(db, "debiti"));
    batch.set(debtRef, {
      importo: entry.importo,
      descrizione: entry.descrizione,
      debitoreId: entry.debitoreId,
      creditoreId: entry.creditoreId,
      casaId,
      createdAt,
    });
  }
  await batch.commit();
}
