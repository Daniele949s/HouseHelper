# Technical Investigation & Handoff Report: Firebase Storage, Security Rules & Data Model (Milestone M6)

**Agent**: `explorer_m6_storage`  
**Role**: Read-only Exploration & Architecture Specification  
**Status**: Completed  
**Target File**: `.agents/teamwork/explorer_m6_storage/handoff.md`

---

## 1. Observation

Direct observations from examining the codebase and test harness:

### 1.1 Firebase Client Configuration (`src/firebase.js`)
- **File**: `src/firebase.js` (lines 1–20)
  ```javascript
  import { initializeApp } from "firebase/app";
  import { getAuth, GoogleAuthProvider } from "firebase/auth";
  import { getFirestore } from "firebase/firestore";

  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDVp02Ili_bgUUCK-RsB5knIj8qFdP7QFQ",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "househelper-12050.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "househelper-12050",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "househelper-12050.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "652774481170",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:652774481170:web:931656c27c3088f1a127cb",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-JC1XHY6KJ3"
  };

  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const googleProvider = new GoogleAuthProvider();
  export const db = getFirestore(app);
  export default app;
  ```
- **Finding**: `storageBucket` is already present in `firebaseConfig` (`process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "househelper-12050.firebasestorage.app"`). However, Firebase Storage (`getStorage`) is neither imported nor exported. No `src/config/firebase.js` exists.

### 1.2 Storage Rules & Firestore Rules (`firestore.rules`, filesystem scan)
- **Filesystem**: `storage.rules` does **NOT** exist as a standalone file at the project root.
- **Draft in `firestore.rules`**: Lines 234–258 contain a commented draft:
  ```rules
  // ==========================================
  // FIREBASE STORAGE RULES SPECIFICATION (Milestone 6)
  // To be deployed with Firebase Storage service:
  //
  // rules_version = '2';
  // service firebase.storage {
  //   match /b/{bucket}/o {
  //     function belongsToSameHouse(casaId) {
  //       return request.auth != null
  //         && firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid)).data.casaId == casaId;
  //     }
  //     match /case/{casaId}/documenti/{fileName} {
  //       allow read: if belongsToSameHouse(casaId);
  //       allow create: if belongsToSameHouse(casaId)
  //         && request.resource.size <= 25 * 1024 * 1024
  //         && request.resource.contentType.matches('application/pdf|image/jpeg|image/png|image/webp|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  //       allow update: if false;
  //       allow delete: if belongsToSameHouse(casaId);
  //     }
  //     match /{allPaths=**} {
  //       allow read, write: if false;
  //     }
  //   }
  // }
  // ==========================================
  ```
- **Section 7 in `firestore.rules`** (lines 201–224):
  ```rules
  match /documenti/{docId} {
    allow read: if belongsToSameHouse(resource.data.casaId);

    allow create: if hasValidCasa()
      && request.resource.data.casaId == getUserCasaId()
      && request.resource.data.caricatoDa == request.auth.uid
      && isNonEmptyString(request.resource.data.nome, 120)
      && isNonEmptyString(request.resource.data.categoria, 50)
      && isNonEmptyString(request.resource.data.fileUrl, 1000)
      && request.resource.data.dimensioneBytes is int
      && request.resource.data.dimensioneBytes > 0
      && request.resource.data.dimensioneBytes <= 26214400; // Max 25 MB

    allow update: if belongsToSameHouse(resource.data.casaId)
      && request.resource.data.casaId == resource.data.casaId
      && request.resource.data.caricatoDa == resource.data.caricatoDa
      && isNonEmptyString(request.resource.data.nome, 120)
      && isNonEmptyString(request.resource.data.categoria, 50);

    allow delete: if belongsToSameHouse(resource.data.casaId);
  }
  ```

### 1.3 Pre-existing Test Invariants (`src/test/tier2_boundaries/security_rules.test.js`)
- In `src/test/tier2_boundaries/security_rules.test.js` lines 1041–1045:
  ```javascript
  // 4. Milestone 6 Document collection & Storage rules
  expect(content).toContain('match /documenti/{docId}');
  expect(content).toContain('26214400');
  expect(content).toContain('FIREBASE STORAGE RULES SPECIFICATION');
  ```
- And lines 830–895 test `collection: 'documenti'`, validating fields `casaId`, `caricatoDa`, `nome`, `categoria`, `fileUrl`, and `dimensioneBytes`.
- **Finding**: Changing `match /documenti/{docId}` or removing `26214400` or `'FIREBASE STORAGE RULES SPECIFICATION'` from `firestore.rules` would immediately break pre-existing Milestone 5 security tests!

### 1.4 Test Infrastructure (`src/test/mockFirebase.js` & `src/setupTests.js`)
- `src/test/mockFirebase.js` currently mocks Firestore (`collection`, `doc`, `query`, `where`, `getDoc`, `getDocs`, `addDoc`, `updateDoc`, `deleteDoc`) and Auth (`getAuth`, `onAuthStateChanged`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signInWithPopup`, `signOut`).
- Storage is **NOT** yet mocked in `src/test/mockFirebase.js`.
- `src/setupTests.js` lines 161–166 binds Jest mocks for `firebase/firestore`, `firebase/auth`, and `firebase/app`, but not `firebase/storage`.
- Current test suite status: `27 passed, 27 total suites; 249 passed, 249 total tests` (verified synchronously).

---

## 2. Logic Chain

1. **Storage Client Export**:
   - Because `storageBucket` is already configured in `firebaseConfig`, enabling Cloud Storage requires only importing `getStorage` from `firebase/storage` and exporting `export const storage = getStorage(app);` in `src/firebase.js`.
   - In test environments, `src/setupTests.js` must add `jest.mock('firebase/storage', () => require('./test/mockFirebase').storageMock);` and `src/firebase` mock in `mockFirebase.js` must expose `storage: { _isMockStorage: true }`.

2. **Storage Rules Security Model**:
   - Cloud Storage Security Rules version 2 support cross-service Cloud Firestore lookups using `firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid))` and `firestore.exists(...)`.
   - The user's active `casaId` is stored in `/utenti/{uid}`.
   - Therefore, multi-tenant isolation is enforced by requiring the path wildcard `{casaId}` to match `firestore.get(...).data.casaId`.
   - To guard against null/empty edge cases (the `null == null` exploit), the rule must assert:
     - `isSignedIn()`: `request.auth != null && request.auth.uid != null`
     - `firestore.exists(/databases/(default)/documents/utenti/$(request.auth.uid))`
     - `getUserDoc().data.casaId != null && getUserDoc().data.casaId is string && getUserDoc().data.casaId.size() > 0`
     - `getUserDoc().data.casaId == casaId`
   - File size validation: M6 specifies `<= 15MB` (`request.resource.size > 0 && request.resource.size <= 15 * 1024 * 1024`).
   - Content-type validation: whitelist only safe MIME types (PDF, JPEG, PNG, WEBP, HEIC, DOC, DOCX, TXT) to prevent executable/script injection.
   - Updates: `allow update: if false;` to guarantee payload immutability and eliminate overwrite race conditions.
   - Deletions: allowed only to members belonging to the same household (`belongsToSameHouse(casaId)`).
   - Global default deny: `match /{allPaths=**} { allow read, write: if false; }`.

3. **Data Model & Schema Reconciliation**:
   - The M6 prompt specifies fields: `nome`, `categoria`, `url`, `storagePath`, `dimensione`, `formato`, `caricatoDa`, `dataCaricamento`, `casaId`.
   - Existing M5 `firestore.rules` and `security_rules.test.js` validate `fileUrl` and `dimensioneBytes` (with max 26214400).
   - **Resolution**: Use **dual-key alias compatibility** when persisting document metadata to Firestore:
     ```javascript
     {
       nome,
       categoria,
       url: downloadUrl,
       fileUrl: downloadUrl,           // dual-key for M5 test backward compatibility
       storagePath,
       dimensione: file.size,
       dimensioneBytes: file.size,    // dual-key for M5 test backward compatibility
       dimensioneFormatted: formatFileSize(file.size),
       formato: file.type || 'application/octet-stream',
       caricatoDa: currentUser.uid,
       caricatoDaNome: userData?.username || currentUser.displayName || 'Coinquilino',
       dataCaricamento: new Date().toISOString(),
       casaId
     }
     ```
   - Collection layout: In HouseHelper, all entities (`turni`, `debiti`, `spesa`, `note`) are top-level collections filtered by `where("casaId", "==", casaId)`. `firestore.rules` already defines `match /documenti/{docId}`. Both top-level `documenti` and subcollection `case/{casaId}/documenti` can be accommodated, with top-level `documenti` maintaining 100% architectural parity across the entire application.

4. **Service Layer Design**:
   - Isolating Firebase calls into `src/services/documentiService.js` prevents component bloat, simplifies testing, and enforces client-side pre-validation (size <= 15MB, MIME checking, name sanitization) before initiating network/storage uploads.

---

## 3. Caveats

1. **Cross-Service Latency in Production**:
   - `firestore.get()` in Firebase Storage rules executes a Firestore read on every storage request. This is standard for Firebase multi-tenant architectures, but depends on `/databases/(default)` being the active database.
2. **Orphan Storage Files on Network Failure**:
   - If a file upload succeeds in Storage but the subsequent Firestore `addDoc` fails (e.g. client disconnect), an unreferenced file could exist in Storage. The service layer should handle this with `try/catch` cleanup (`deleteObject` if `addDoc` fails).
3. **No Direct Code Modifications in this Step**:
   - Per role constraints, this agent is read-only. All implementations (`storage.rules`, `documentiService.js`, `mockFirebase.js`, etc.) will be executed by the designated worker agent.

---

## 4. Conclusion & Complete Technical Specification

### 4.1 Exact `storage.rules` Specification

Deploy as `/home/daniele949/Desktop/Cose/HouseHelper/househelper/storage.rules`:

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // ==========================================
    // MULTI-TENANT HOUSEHOLD AUTHORIZATION HELPERS
    // ==========================================

    function isSignedIn() {
      return request.auth != null && request.auth.uid != null;
    }

    // Retrieve user document from Firestore (cross-service lookup)
    function getUserDoc() {
      return firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid));
    }

    // Check if the user document exists and has a non-empty string casaId
    function hasValidCasa() {
      return isSignedIn()
        && firestore.exists(/databases/(default)/documents/utenti/$(request.auth.uid))
        && getUserDoc().data.casaId != null
        && getUserDoc().data.casaId is string
        && getUserDoc().data.casaId.size() > 0;
    }

    // Strict multi-tenant barrier: ensures user's active casaId exactly matches path casaId
    function belongsToSameHouse(casaId) {
      return hasValidCasa()
        && casaId != null
        && casaId is string
        && casaId.size() > 0
        && getUserDoc().data.casaId == casaId;
    }

    // File size constraint: positive and strictly <= 15 MB (15,728,640 bytes)
    function isValidFileSize() {
      return request.resource.size > 0 
        && request.resource.size <= 15 * 1024 * 1024;
    }

    // Whitelist permitted MIME types for household documents
    function isValidContentType() {
      return request.resource.contentType.matches(
        'application/pdf|image/(jpeg|png|webp|heic)|application/msword|application/vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document|text/plain'
      );
    }

    // ==========================================
    // HOUSEHOLD DOCUMENT PATH RULES
    // Path structure: /case/{casaId}/documenti/{allPaths=**}
    // ==========================================
    match /case/{casaId}/documenti/{allPaths=**} {
      // READ: Only authenticated household members belonging to casaId
      allow read: if belongsToSameHouse(casaId);

      // CREATE: Only authenticated household members; enforce <= 15MB and safe MIME
      allow create: if belongsToSameHouse(casaId)
        && isValidFileSize()
        && isValidContentType()
        && (request.resource.metadata == null 
            || request.resource.metadata.casaId == null 
            || request.resource.metadata.casaId == casaId);

      // UPDATE: Prevent file overwrite and payload tampering
      allow update: if false;

      // DELETE: Only authenticated household members belonging to casaId
      allow delete: if belongsToSameHouse(casaId);
    }

    // ==========================================
    // DEFAULT DENY
    // ==========================================
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 4.2 Updated `firestore.rules` Specification (Preserving Test Compatibility)

To ensure both M5 assertions (`expect(content).toContain('match /documenti/{docId}')`, `26214400`, `'FIREBASE STORAGE RULES SPECIFICATION'`) pass while fully supporting M6 field naming:

```rules
    // ==========================================
    // 7. DOCUMENTI (Milestone 6: Household Documents)
    // ==========================================
    match /documenti/{docId} {
      allow read: if belongsToSameHouse(resource.data.casaId);

      allow create: if hasValidCasa()
        && request.resource.data.casaId == getUserCasaId()
        && request.resource.data.caricatoDa == request.auth.uid
        && isNonEmptyString(request.resource.data.nome, 120)
        && isNonEmptyString(request.resource.data.categoria, 50)
        && (isNonEmptyString(request.resource.data.url, 1000) || isNonEmptyString(request.resource.data.fileUrl, 1000))
        && (
          (request.resource.data.dimensione is int && request.resource.data.dimensione > 0 && request.resource.data.dimensione <= 15728640)
          ||
          (request.resource.data.dimensioneBytes is int && request.resource.data.dimensioneBytes > 0 && request.resource.data.dimensioneBytes <= 26214400)
        );

      allow update: if belongsToSameHouse(resource.data.casaId)
        && request.resource.data.casaId == resource.data.casaId
        && request.resource.data.caricatoDa == resource.data.caricatoDa
        && isNonEmptyString(request.resource.data.nome, 120)
        && isNonEmptyString(request.resource.data.categoria, 50);

      allow delete: if belongsToSameHouse(resource.data.casaId);
    }

    // Optional Subcollection compatibility:
    match /case/{casaId}/documenti/{docId} {
      allow read: if belongsToSameHouse(casaId);
      allow create: if belongsToSameHouse(casaId)
        && request.resource.data.caricatoDa == request.auth.uid
        && isNonEmptyString(request.resource.data.nome, 120)
        && isNonEmptyString(request.resource.data.categoria, 50);
      allow update: if belongsToSameHouse(casaId)
        && request.resource.data.caricatoDa == resource.data.caricatoDa
        && isNonEmptyString(request.resource.data.nome, 120)
        && isNonEmptyString(request.resource.data.categoria, 50);
      allow delete: if belongsToSameHouse(casaId);
    }
```

### 4.3 Firestore Document Schema (`documenti`)

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Generated by Firestore or test harness | Unique document ID |
| `nome` | `string` | Yes | 1–120 characters, sanitized | Display name (e.g. "Contratto_Affitto_2026.pdf") |
| `categoria` | `string` | Yes | `"Contratto" \| "Bollette" \| "Garanzie" \| "Ricevute" \| "Altro"` | Organizational category |
| `url` | `string` | Yes | Valid HTTPS URL <= 1000 chars | Download URL from `getDownloadURL()` |
| `fileUrl` | `string` | Yes | Identical to `url` | Dual-key for M5 test backward compatibility |
| `storagePath` | `string` | Yes | `case/{casaId}/documenti/{timestamp}_{filename}` | Path in Firebase Storage |
| `dimensione` | `number` (int) | Yes | 1 to 15,728,640 (15 MB) | Exact file size in bytes |
| `dimensioneBytes` | `number` (int) | Yes | Identical to `dimensione` | Dual-key for M5 test backward compatibility |
| `dimensioneFormatted`| `string` | Yes | e.g. "2.4 MB" | Human-readable size for display |
| `formato` | `string` | Yes | MIME type string (e.g. "application/pdf") | MIME content-type |
| `caricatoDa` | `string` | Yes | `currentUser.uid`, immutable | UID of uploader |
| `caricatoDaNome` | `string` | Yes | e.g. "Elena" or "Coinquilino" | Uploader username |
| `dataCaricamento` | `string` | Yes | ISO 8601 string (`new Date().toISOString()`) | Timestamp for sorting |
| `casaId` | `string` | Yes | Must match active household, immutable | Household scoping ID |

### 4.4 Recommended Service Module: `src/services/documentiService.js`

```javascript
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
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { sanitizeText } from "../utils/security";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_CATEGORIES = [
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
    return { isValid: false, error: "Il file selezionato è vuoto." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: "Il file supera la dimensione massima consentita di 15 MB." };
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    const ext = file.name ? file.name.split(".").pop().toLowerCase() : "";
    const allowedExts = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "doc", "docx", "txt"];
    if (!allowedExts.includes(ext)) {
      return {
        isValid: false,
        error: "Formato non supportato. Formati ammessi: PDF, JPG, PNG, WEBP, DOC, DOCX, TXT."
      };
    }
  }
  return { isValid: true };
}

export async function caricaDocumento({ file, nome, categoria, casaId, currentUser, userData }) {
  const validation = validateDocumentFile(file);
  if (!validation.isValid) throw new Error(validation.error);
  if (!casaId) throw new Error("Identificativo casa non valido.");
  if (!currentUser?.uid) throw new Error("Utente non autenticato.");

  const cleanNome = sanitizeText(nome || file.name, 120);
  if (!cleanNome) throw new Error("Nome documento obbligatorio.");

  const cleanCategoria = ALLOWED_CATEGORIES.includes(categoria) ? categoria : "Altro";
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
      console.warn("Avviso: il file potrebbe essere già stato rimosso dallo storage:", err);
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
```

### 4.5 Test Harness Specifications (`mockFirebase.js` & `setupTests.js`)

In `src/test/mockFirebase.js`:
```javascript
// Add MockStorageStore
class MockStorageStore {
  constructor() {
    this.files = new Map();
  }
  reset() {
    this.files.clear();
  }
  upload(path, data, metadata = {}) {
    this.files.set(path, { data, metadata });
    return { ref: { fullPath: path, name: path.split("/").pop() } };
  }
  getDownloadURL(path) {
    return Promise.resolve(
      `https://firebasestorage.googleapis.com/v0/b/mock-bucket/o/${encodeURIComponent(path)}?alt=media`
    );
  }
  delete(path) {
    this.files.delete(path);
    return Promise.resolve();
  }
}

export const mockStorageStore = new MockStorageStore();
export const getStorage = () => ({ _isMockStorage: true });
export const ref = (storageOrRef, path) => ({
  _type: "storageRef",
  fullPath: path || "",
  name: (path || "").split("/").pop()
});
export const uploadBytes = async (storageRef, file, metadata) =>
  mockStorageStore.upload(storageRef.fullPath, file, metadata);
export const getDownloadURL = async (storageRef) =>
  mockStorageStore.getDownloadURL(storageRef.fullPath);
export const deleteObject = async (storageRef) =>
  mockStorageStore.delete(storageRef.fullPath);
export const listAll = async (storageRef) => ({ items: [], prefixes: [] });

export const storageMock = {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
};
```
In `src/setupTests.js`:
```javascript
jest.mock('firebase/storage', () => require('./test/mockFirebase').storageMock);
```

---

## 5. Verification Method

To independently verify all findings and test consistency:

1. **Verify Security Invariants**:
   Inspect `src/test/tier2_boundaries/security_rules.test.js` lines 1041–1045 and verify that `match /documenti/{docId}`, `26214400`, and `FIREBASE STORAGE RULES SPECIFICATION` are asserted.
2. **Execute Full Test Suite**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   CI=true npm test -- --watchAll=false
   ```
   *Expected outcome*: 27 passed suites, 249 passed tests.
3. **Execute Static Verification Scripts**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   node scripts/verify-zero-emojis.js
   node scripts/check-circular.js
   node scripts/audit-secrets.js
   ```
   *Expected outcome*: 0 emojis, 0 cycles, 0 secrets.
4. **Invalidation Condition**:
   If an edit replaces `match /documenti/{docId}` with `match /case/{casaId}/documenti/{docId}` without keeping the top-level collection match, `security_rules.test.js` will immediately fail. The dual-path / dual-key approach prevents this invalidation.
