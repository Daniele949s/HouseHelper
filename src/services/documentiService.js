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
import { sanitizeText, isSafeDocumentId, isSafeStoragePath } from "../utils/security";

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
  const cleaned = String(filename)
    .replace(/\0/g, "")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 100);
  if (!cleaned || /^[_.\s-]+$/.test(cleaned)) {
    return "documento";
  }
  return cleaned;
}

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

const DOC_MESSAGES = {
  noFile: {
    it: "Nessun file selezionato.",
    en: "No file selected."
  },
  emptyFile: {
    it: "Il file selezionato è vuoto.",
    en: "The selected file is empty."
  },
  fileTooLarge: {
    it: "Il file supera la dimensione massima consentita di 15 MB.",
    en: "The file exceeds the maximum allowed size of 15 MB."
  },
  unsupportedFormat: {
    it: "Formato non supportato. Formati ammessi: PDF, JPG, PNG, WEBP, DOC, DOCX, TXT.",
    en: "Unsupported format. Allowed formats: PDF, JPG, PNG, WEBP, DOC, DOCX, TXT."
  },
  invalidHouse: {
    it: "Identificativo casa non valido.",
    en: "Invalid household ID."
  },
  unauthenticated: {
    it: "Utente non autenticato.",
    en: "User not authenticated."
  },
  nameRequired: {
    it: "Nome documento obbligatorio.",
    en: "Document name is required."
  },
  roommateFallback: {
    it: "Coinquilino",
    en: "Roommate"
  },
  storageUnavailableLimit: {
    it: "Firebase Storage non è attivo su questo progetto. Sul piano gratuito con Firestore puoi caricare file fino a 800 KB (es. bollette PDF, foto ricevute, scontrini).",
    en: "Firebase Storage is not enabled on this project. On the free Firestore tier you can upload files up to 800 KB (e.g. PDF bills, receipt photos)."
  },
  missingDocId: {
    it: "ID documento mancante.",
    en: "Missing document ID."
  }
};

function resolveDocOptions(options) {
  if (typeof options === "string") {
    return { lang: options === "en" ? "en" : "it", t: null };
  }
  if (options && typeof options === "object") {
    return {
      lang: options.lang === "en" ? "en" : "it",
      t: typeof options.t === "function" ? options.t : null
    };
  }
  return { lang: "it", t: null };
}

function getDocMessage(key, i18nKey, options) {
  const { lang, t } = resolveDocOptions(options);
  const entry = DOC_MESSAGES[key];
  const fallback = entry ? entry[lang] : "";
  if (t) {
    return t(i18nKey, {}, fallback);
  }
  return fallback;
}

function createCodedError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function validateDocumentFile(file, options = {}) {
  if (!file) {
    return {
      isValid: false,
      errorCode: "DOC_NO_FILE",
      error: getDocMessage("noFile", "documents.errors.noFile", options)
    };
  }
  if (typeof file.size !== "number" || !Number.isFinite(file.size) || file.size <= 0) {
    return {
      isValid: false,
      errorCode: "DOC_EMPTY_FILE",
      error: getDocMessage("emptyFile", "documents.errors.emptyFile", options)
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      errorCode: "DOC_FILE_TOO_LARGE",
      error: getDocMessage("fileTooLarge", "documents.errors.fileTooLarge", options)
    };
  }
  const allowedExts = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "doc", "docx", "txt"];
  const ext = file.name ? file.name.split(".").pop().toLowerCase() : "";
  const mimeAllowed = file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const extAllowed = allowedExts.includes(ext);

  if (!mimeAllowed && !extAllowed) {
    return {
      isValid: false,
      errorCode: "DOC_UNSUPPORTED_FORMAT",
      error: getDocMessage("unsupportedFormat", "documents.errors.unsupportedFormat", options)
    };
  }
  return { isValid: true };
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function caricaDocumento({ file, nome, categoria, note, casaId, currentUser, userData, lang, t }) {
  const locOpts = { lang, t };
  const validation = validateDocumentFile(file, locOpts);
  if (!validation.isValid) {
    throw createCodedError(validation.error, validation.errorCode);
  }
  if (!casaId) {
    throw createCodedError(
      getDocMessage("invalidHouse", "documents.errors.invalidHouse", locOpts),
      "DOC_INVALID_HOUSE"
    );
  }
  if (!currentUser?.uid) {
    throw createCodedError(
      getDocMessage("unauthenticated", "documents.errors.unauthenticated", locOpts),
      "DOC_UNAUTHENTICATED"
    );
  }

  if (nome !== undefined && nome !== null && typeof nome === "string" && !nome.trim()) {
    throw createCodedError(
      getDocMessage("nameRequired", "documents.errors.nameRequired", locOpts),
      "DOC_NAME_REQUIRED"
    );
  }
  const rawNome = (nome && typeof nome === "string" && nome.trim()) ? nome.trim() : (file?.name || "");
  const cleanNome = sanitizeText(rawNome, 120);
  if (!cleanNome) {
    throw createCodedError(
      getDocMessage("nameRequired", "documents.errors.nameRequired", locOpts),
      "DOC_NAME_REQUIRED"
    );
  }

  const cleanCategoria = ALLOWED_CATEGORIES.includes(categoria) ? categoria : "Altro";
  const cleanNote = note ? sanitizeText(note, 300) : "";
  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `case/${casaId}/documenti/${timestamp}_${safeName}`;
  const uploaderFallback = getDocMessage("roommateFallback", "dashboard.roommateFallback", locOpts);
  const uploaderName = userData?.username || currentUser.displayName || uploaderFallback;

  let downloadUrl = "";
  let finalStoragePath = "";

  const metadata = {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      casaId,
      caricatoDa: currentUser.uid,
      caricatoDaNome: uploaderName
    }
  };

  // 1. Upload to Storage if available; fallback to Firestore Base64 if storage is not enabled (e.g. Free Spark plan)
  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, metadata);
    downloadUrl = await getDownloadURL(storageRef);
    finalStoragePath = storagePath;
  } catch (storageErr) {
    if (file.size <= 800 * 1024) {
      downloadUrl = await fileToDataUrl(file);
      finalStoragePath = "";
    } else {
      throw createCodedError(
        getDocMessage("storageUnavailableLimit", "documents.errors.storageUnavailableLimit", locOpts),
        "DOC_STORAGE_UNAVAILABLE_LIMIT"
      );
    }
  }

  // 2. Persist to Firestore with dual-key aliases
  const docPayload = {
    nome: cleanNome,
    categoria: cleanCategoria,
    note: cleanNote,
    url: downloadUrl,
    fileUrl: downloadUrl,
    storagePath: finalStoragePath,
    dimensione: file.size,
    dimensioneBytes: file.size,
    dimensioneFormatted: formatFileSize(file.size),
    formato: file.type || "application/octet-stream",
    caricatoDa: currentUser.uid,
    caricatoDaNome: uploaderName,
    dataCaricamento: new Date().toISOString(),
    casaId
  };

  try {
    const docRef = await addDoc(collection(db, "documenti"), docPayload);
    return { id: docRef.id, ...docPayload };
  } catch (err) {
    // Rollback Storage object if Firestore metadata fails
    if (finalStoragePath) {
      try {
        const storageRef = ref(storage, finalStoragePath);
        await deleteObject(storageRef);
      } catch (_) {}
    }
    throw err;
  }
}

export async function eliminaDocumento({ docId, storagePath, lang, t }) {
  if (!docId || !isSafeDocumentId(docId)) {
    throw createCodedError(
      getDocMessage("missingDocId", "documents.errors.missingDocId", { lang, t }),
      "DOC_ID_MISSING"
    );
  }

  // Delete Storage file only if storagePath is strictly within case/{casaId}/documenti/{fileName}
  if (storagePath && isSafeStoragePath(storagePath)) {
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
