import { storage, db } from "../firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import { sanitizeText } from "../utils/security";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_CATEGORIES = [
  "Contratti",
  "Contratto",
  "Bollette",
  "Garanzie",
  "Ricevute",
  "Altro"
];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

export function sanitizeFileName(filename) {
  if (!filename) return "documento";
  return filename
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\0/g, "")
    .slice(0, 100);
}

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function validateDocumentFile(file) {
  if (!file) {
    return { isValid: false, error: "Nessun file selezionato." };
  }
  if (file.size <= 0) {
    return { isValid: false, error: "Il file selezionato e' vuoto." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: "Il file supera la dimensione massima consentita di 15 MB." };
  }
  const allowedExts = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "doc", "docx", "txt"];
  const ext = file.name ? file.name.split(".").pop().toLowerCase() : "";
  const mimeAllowed = file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const extAllowed = allowedExts.includes(ext);

  if (!mimeAllowed && !extAllowed) {
    return {
      isValid: false,
      error: "Formato non supportato. Formati ammessi: PDF, JPG, PNG, WEBP, DOC, DOCX, TXT."
    };
  }
  return { isValid: true };
}

export async function caricaDocumento({ file, nome, categoria, note, casaId, currentUser, userData }) {
  const validation = validateDocumentFile(file);
  if (!validation.isValid) throw new Error(validation.error);
  if (!casaId) throw new Error("Identificativo casa non valido.");
  if (!currentUser?.uid) throw new Error("Utente non autenticato.");

  if (nome !== undefined && nome !== null && typeof nome === "string" && !nome.trim()) {
    throw new Error("Nome documento obbligatorio.");
  }
  const rawNome = (nome && typeof nome === "string" && nome.trim()) ? nome.trim() : (file?.name || "");
  const cleanNome = sanitizeText(rawNome, 120);
  if (!cleanNome) throw new Error("Nome documento obbligatorio.");

  const cleanCategoria = ALLOWED_CATEGORIES.includes(categoria) ? categoria : "Altro";
  const cleanNote = note ? sanitizeText(note, 300) : "";
  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `case/${casaId}/documenti/${timestamp}_${safeName}`;

  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      casaId,
      caricatoDa: currentUser.uid,
      caricatoDaNome: userData?.username || currentUser.displayName || "Coinquilino"
    }
  };

  // 1. Upload to Storage
  await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(storageRef);

  // 2. Persist to Firestore with dual-key aliases
  const docPayload = {
    nome: cleanNome,
    categoria: cleanCategoria,
    note: cleanNote,
    url: downloadUrl,
    fileUrl: downloadUrl,
    storagePath,
    dimensione: file.size,
    dimensioneBytes: file.size,
    dimensioneFormatted: formatFileSize(file.size),
    formato: file.type || "application/octet-stream",
    caricatoDa: currentUser.uid,
    caricatoDaNome: userData?.username || currentUser.displayName || "Coinquilino",
    dataCaricamento: new Date().toISOString(),
    casaId
  };

  try {
    const docRef = await addDoc(collection(db, "documenti"), docPayload);
    return { id: docRef.id, ...docPayload };
  } catch (err) {
    // Rollback Storage object if Firestore metadata fails
    try {
      await deleteObject(storageRef);
    } catch (_) {}
    throw err;
  }
}

export async function eliminaDocumento({ docId, storagePath }) {
  if (!docId) throw new Error("ID documento mancante.");

  // Delete Storage file
  if (storagePath) {
    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      // Ignored if already removed
    }
  }

  // Delete Firestore document
  await deleteDoc(doc(db, "documenti", docId));
  return { success: true };
}

export async function caricaListaDocumenti(casaId, categoriaFilter = null) {
  if (!casaId) return [];
  const q = query(collection(db, "documenti"), where("casaId", "==", casaId));
  const snap = await getDocs(q);
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (categoriaFilter && categoriaFilter !== "Tutti") {
    docs = docs.filter((d) => d.categoria === categoriaFilter);
  }

  docs.sort((a, b) => {
    const timeA = new Date(a.dataCaricamento || 0).getTime();
    const timeB = new Date(b.dataCaricamento || 0).getTime();
    return timeB - timeA;
  });

  return docs;
}
