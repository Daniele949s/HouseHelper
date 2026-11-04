# Milestone M6 Review & Adversarial Challenge Report

**Reviewer**: `reviewer_m6_1`  
**Roles**: Reviewer, Critic  
**Date**: 2026-11-03  
**Target Path**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/reviewer_m6_1/handoff.md`  
**Verdict**: **APPROVE**  
**Integrity Finding**: **NO INTEGRITY VIOLATIONS DETECTED**

---

## 1. Observation

Direct observations obtained through source code inspection, AST dependency analysis, and terminal command execution:

### 1.1 Storage Rules Architecture & Multi-Tenant Isolation
- **File**: `storage.rules` (repo root)
  - Line 1: `rules_version = '2';`
  - Lines 13-16: Function `getUserDoc()` executes Cloud Firestore cross-service lookup: `firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid))`
  - Lines 28-34: Function `belongsToSameHouse(casaId)` validates that the authenticated user's `casaId` in Firestore strictly matches the path `casaId`: `getUserDoc().data.casaId == casaId`
  - Lines 37-40: Function `isValidFileSize()` restricts uploaded files: `request.resource.size > 0 && request.resource.size <= 15 * 1024 * 1024` (<= 15 MB)
  - Lines 43-47: Function `isValidContentType()` whitelists MIME types matching `'application/pdf|image/(jpeg|png|webp|heic)|application/msword|application/vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document|text/plain'`
  - Lines 53-70: Path rule `match /case/{casaId}/documenti/{allPaths=**}`:
    - `allow read: if belongsToSameHouse(casaId);`
    - `allow create: if belongsToSameHouse(casaId) && isValidFileSize() && isValidContentType() && (request.resource.metadata == null || request.resource.metadata.casaId == null || request.resource.metadata.casaId == casaId);`
    - `allow update: if false;` (Strict immutability preventing document tampering or replacement)
    - `allow delete: if belongsToSameHouse(casaId);`
  - Lines 75-77: Global default deny: `match /{allPaths=**} { allow read, write: if false; }`

### 1.2 Firebase Client Initialization & Export
- **File**: `src/firebase.js`
  - Line 4: `import { getStorage } from "firebase/storage";`
  - Line 20: `export const storage = getStorage(app);`
  - Confirmed storage export matches existing exports `auth`, `db`, and `app`.

### 1.3 Service Layer Implementation & Failure Rollback
- **File**: `src/services/documentiService.js`
  - Lines 41-48: `sanitizeFileName(filename)` strips illegal path characters `[/\\?%*:|"<> \0]`, replacing them with `_` and constraining length to 100 characters.
  - Lines 58-80: `validateDocumentFile(file)` verifies file presence, non-zero size, size <= 15 MB, and MIME/extension whitelist.
  - Lines 82-143: `caricaDocumento`:
    - Validates inputs, sanitizes document name and filename.
    - Uploads file to Storage path `case/{casaId}/documenti/${timestamp}_${safeName}` with custom metadata.
    - Obtains download URL via `getDownloadURL(storageRef)`.
    - Persists metadata to Firestore collection `documenti` with dual-key aliases: `url` and `fileUrl`, `dimensione` and `dimensioneBytes`, `dimensioneFormatted`, `formato`, `caricatoDa`, `caricatoDaNome`, `casaId`, `dataCaricamento`.
    - Lines 136-142: Rollback handler wraps `addDoc` in try-catch: if Firestore persistence throws, it executes `await deleteObject(storageRef)` to prevent orphaned binary storage leaks.
  - Lines 145-161: `eliminaDocumento`:
    - Deletes binary object from Storage via `deleteObject(ref(storage, storagePath))`.
    - Deletes metadata document from Firestore `documenti` via `deleteDoc(doc(db, "documenti", docId))`.
  - Lines 163-180: `caricaListaDocumenti`:
    - Filters by `casaId` via Firestore query `where("casaId", "==", casaId)`.
    - Applies category filter and sorts by `dataCaricamento` descending.

### 1.4 UI, Navigation & Cross-Device Ergonomics
- **File**: `src/pages/Documenti/ViewDocumenti.js`
  - Imports only Leaf services, contexts, and utils; does NOT import `App.css`, preventing circular import cycles.
  - Category filter pills: `Tutti`, `Contratti`, `Bollette`, `Garanzie`, `Ricevute`, `Altro`.
  - Search input with clear button, sort dropdown (`date-desc`, `date-asc`, `name-asc`, `size-desc`), and view toggles (`grid` and `table`).
  - Dropzone supporting drag & drop and click-to-upload.
  - Integrated feedback: `showToast` for notifications and `showConfirm` for document deletion.
  - Vector iconography: 100% FontAwesome 5 classes (`fa-folder-open`, `fa-cloud-upload-alt`, `fa-file-pdf`, `fa-file-image`, `fa-file-word`, `fa-file-contract`, `fa-file-invoice-dollar`, `fa-shield-alt`, `fa-receipt`, `fa-trash-alt`, `fa-eye`, `fa-download`, etc.).
  - Zero Unicode emojis or emoticon glyphs.
- **File**: `src/App.js`
  - Lines 47, 106: Registered `/documenti` route inside `<Route element={<HouseProtectedRoute />}>`.
- **File**: `src/components/DesktopNavigation.js`
  - Line 26: Added `{ label: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false }`.
- **File**: `src/components/MobileNavigation.js`
  - Line 52: Added `{ label: "Documenti & Contratti", icon: "fa-folder-open", path: "/documenti" }`.
- **File**: `src/pages/homeUtente.js`
  - Line 219: Added 6th shortcut button navigating to `/documenti` with `fa-folder-open`.
- **File**: `src/App.css`
  - Lines 2428-2437: Universal `:focus-visible` keyboard focus ring with 2px solid primary color and 2px offset across `button`, `input`, `select`, `textarea`, `a`, and `[tabindex]`.
  - Min-height/min-width >= 44px on interactive controls (`.burger-container`, `.mobile-close-btn`, `.theme-pill-toggle`, `.doc-action-btn`, `.doc-view-btn`, `.doc-filter-pill`).
  - Mobile responsive rules for single-column card stack and horizontal swiping filter pills (`@media (max-width: 768px)`).

### 1.5 Verification Script Execution Output (Verbatim)
1. `node scripts/verify-zero-emojis.js`:
   ```
   ========================================
   🔍 Scanning 84 files across src/ and public/ for emojis & emoticons
   ========================================

   ========================================
   ✔ SUCCESS: Zero emojis or text emoticons detected across 84 files.
   ========================================
   ```
   Exit code: 0.

2. `node scripts/check-circular.js`:
   ```
   Starting circular dependency verification...
   - src/App.js: PASSED (0 cycles)
   - src/      : PASSED (0 cycles)
   ✅ SUCCESS: All circular dependency checks passed with 0 cycles.
   ```
   Exit code: 0.

3. `node scripts/audit-secrets.js`:
   ```
   [INFO] Scanned 99 files across working tree.
   [INFO] Auditing git commit history (14 commits)...
   [SUCCESS] 0 secrets, credentials, or private keys detected across working tree and git history.
   ```
   Exit code: 0.

4. `CI=true npm test -- --watchAll=false`:
   ```
   Test Suites: 29 passed, 29 total
   Tests:       270 passed, 270 total
   Snapshots:   0 total
   Time:        4.304 s
   ```
   Exit code: 0.

5. `npm run build`:
   ```
   Compiled successfully.
   File sizes after gzip:
     230.62 kB  build/static/js/main.9aee3c73.js
     11.32 kB   build/static/css/main.47c26ccf.css
     1.76 kB    build/static/js/453.e2c00ade.chunk.js
   ```
   Exit code: 0.

---

## 2. Logic Chain

1. **Multi-Tenant Security Enforcement (Obs 1.1)**:
   - Milestone M6 requires strict multi-tenant isolation for household documents.
   - In `storage.rules`, paths are parameterized as `/case/{casaId}/documenti/{allPaths=**}`. The `belongsToSameHouse(casaId)` function queries the caller's Firestore user document (`utenti/$(request.auth.uid)`) to verify that `getUserDoc().data.casaId == casaId`.
   - Any attempt by an authenticated user of `casa_A` to access or write to `casa_B` is rejected at the Storage layer.
   - The default deny `match /{allPaths=**} { allow read, write: if false; }` prevents any access to unspecified buckets or paths.

2. **Tamper Prevention & Immutability (Obs 1.1)**:
   - In shared households, document integrity (e.g. rent lease, signed agreements) is critical.
   - In `storage.rules`, `allow update: if false;` prevents overwriting existing files. Once uploaded, a document cannot be modified in-place; modifications require an explicit delete-and-reupload sequence.

3. **Data Integrity & Rollback Protection (Obs 1.3)**:
   - When uploading files, network failures or permission denials could cause inconsistent state (a binary uploaded to Cloud Storage without metadata in Firestore, or vice versa).
   - In `caricaDocumento`, the upload executes first; if `addDoc(collection(db, "documenti"), docPayload)` fails, the catch block calls `deleteObject(storageRef)` to clean up the uploaded binary immediately.
   - Boundary test `T2.30` simulates this failure and asserts that zero orphaned files remain in storage.

4. **Backward Compatibility & Dual-Key Schema (Obs 1.3)**:
   - In M5, `firestore.rules` enforced validation on `fileUrl` and `dimensioneBytes`. In M6 UI specifications, fields `url` and `dimensione` were required.
   - In `documentiService.js`, both aliases are populated simultaneously in the payload. This guarantees that existing M5 security tests and new M6 UI components operate in harmony without schema drift or breakage.

5. **Ergonomics & Zero-Emoji Compliance (Obs 1.4, 1.5)**:
   - All interactive controls have been configured to meet WCAG 2.5.5 touch target size (>= 44px min-height/width).
   - Universal `:focus-visible` styling provides clear keyboard visual focus indicators.
   - All 84 files across `src/` and `public/` were scanned by `verify-zero-emojis.js` with 0 violations.
   - Vector icons from FontAwesome 5 provide clean, professional visuals across all states.

6. **Integrity Violations Check**:
   - Source code was audited for hardcoded outputs, fake implementations, or mock bypasses in production code (`storage.rules`, `src/services/documentiService.js`, `src/pages/Documenti/ViewDocumenti.js`).
   - All production code contains genuine logic, real Firestore/Storage SDK calls, input sanitization, and state management.
   - Tests assert actual behavior across all 4 tiers without hardcoded mock return bypasses.

---

## 3. Adversarial Challenges & Stress Testing

### Challenge 1: Cross-Tenant File Exfiltration & Path Traversal
- **Assumption**: Household documents can only be uploaded and accessed within the authorized user's `casaId`.
- **Attack Scenario**: An attacker uploads a file with filename `../../root.pdf` or attempts to specify a `casaId` parameter corresponding to a victim household (`casa_victim`).
- **Stress Test Evaluation**:
  - `sanitizeFileName` strips `/` and `\`, transforming `../../../etc/passwd.pdf` into `.._.._.._etc_passwd.pdf`.
  - `storage.rules` enforces `getUserDoc().data.casaId == casaId`. Even if an attacker passes `casaId: "casa_victim"` in the API call, the Storage rule inspects `request.auth.uid` against Firestore and evaluates `casa_A == casa_victim` which yields `false`.
  - Tested in `T2.28` and `SEC-14`.
- **Verdict**: PASS. Multi-tenant barrier is impenetrable.

### Challenge 2: Malicious Payload Injection & Storage Bloat (DoS)
- **Assumption**: Uploaded files do not exceed resource limits or execute arbitrary code.
- **Attack Scenario**: An attacker uploads a 200MB file or an executable `.exe` / `.sh` script disguised as a document.
- **Stress Test Evaluation**:
  - `validateDocumentFile` rejects files > 15MB and disallows non-whitelisted MIME/extensions on the client.
  - `storage.rules` independently enforces `request.resource.size <= 15 * 1024 * 1024` and `request.resource.contentType.matches(...)`. Even if the client-side check is bypassed via direct SDK calls, Cloud Storage rejects the request.
  - Tested in `T2.24`, `T2.25`, and `SEC-14`.
- **Verdict**: PASS. Both client and server reject oversized or non-whitelisted payloads.

### Challenge 3: Storage Orphan Leakage on Firestore Failure
- **Assumption**: Document upload is atomic across Storage and Firestore.
- **Attack Scenario**: Network connection drops immediately after binary upload to Cloud Storage, before Firestore metadata doc is saved.
- **Stress Test Evaluation**:
  - `caricaDocumento` wraps Firestore `addDoc` in a try block; upon failure, `deleteObject(storageRef)` executes in the catch block before re-throwing the error.
  - Tested in `T2.30` with mocked Firestore failure; storage store verified clean.
- **Verdict**: PASS. Rollback logic reliably eliminates orphaned binaries.

---

## 4. Caveats

1. **Cloud Firestore Rules Cross-Service Latency in Live Environment**:
   - Cloud Storage rules using `firestore.get()` introduce a remote document read per Storage request. This incurs standard Firestore read pricing and slight latency overhead in live Google Cloud infrastructure.
2. **JSDOM Binary Mocking**:
   - In unit/integration tests, binary file transfers are simulated using DOM `File`/`Blob` objects in memory. Live network socket behavior is mocked through `mockFirebase.js`.

---

## 5. Conclusion

The Milestone M6 implementation satisfies all functional requirements, security specifications, ergonomic guidelines, and quality standards:
- Multi-tenant household document management is fully established with Firebase Storage version 2 rules and Firestore cross-service lookup.
- `src/services/documentiService.js` provides comprehensive validation, sanitization, dual-key aliases, and rollback mechanisms.
- `src/pages/Documenti/ViewDocumenti.js` offers a responsive, accessible interface with zero emojis and FontAwesome 5 vector iconography.
- Ergonomic standards (>= 44px touch targets, `:focus-visible` outlines, responsive card/table views) are enforced.
- All verification commands pass with 100% success rate:
  - Zero emojis across 84 files
  - Zero circular import cycles in `src/App.js` and `src/`
  - Zero secrets across 99 working tree files and 14 git commits
  - 29/29 test suites passing (270/270 tests)
  - Production build cleanly compiled without errors

**Verdict**: **APPROVE**

---

## 6. Verification Method

To reproduce the findings independently, run the following commands from the repository root (`/home/daniele949/Desktop/Cose/HouseHelper/househelper`):

```bash
# 1. Zero-Emoji Scan: Must exit 0 with 0 violations across 84 files
node scripts/verify-zero-emojis.js

# 2. Circular Dependency Analysis: Must exit 0 with 0 cycles in src/App.js and src/
node scripts/check-circular.js

# 3. Secret & Credential Audit: Must exit 0 with 0 secrets across tree and git history
node scripts/audit-secrets.js

# 4. Full Automated Test Suite: Must pass 29/29 suites and 270/270 tests (100% pass)
CI=true npm test -- --watchAll=false

# 5. Production Build Compilation: Must compile successfully with exit code 0
npm run build
```

### Invalidation Conditions
- Any emoji or emoticon detected by `verify-zero-emojis.js`.
- Any cyclic import introduced between `ViewDocumenti.js` and `App.js`.
- Any test failure in test suites across Tiers 1-4 or security rules.
- Any compile error during `npm run build`.
