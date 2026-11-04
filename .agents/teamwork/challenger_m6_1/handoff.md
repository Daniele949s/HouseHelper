# Milestone M6 Empirical Challenge Handoff Report: Firebase Storage Security & Multi-Tenant Isolation

**Agent**: `challenger_m6_1`  
**Role**: Empirical Challenger (critic, specialist)  
**Date**: 2026-11-03  
**Verdict**: **APPROVE**  
**Target Path**: `.agents/teamwork/challenger_m6_1/handoff.md`

---

## Challenge Summary

**Overall risk assessment**: **LOW**

All security controls, multi-tenant boundaries, immutability constraints, and format/size boundaries in `storage.rules` and `src/services/documentiService.js` have been empirically validated through direct command execution and adversarial simulation tests. Zero regressions, zero emojis, zero circular dependencies, zero secrets, 270/270 automated tests passing, and clean production build compilation were verified independently.

---

## 1. Observation

Direct observations from codebase inspection, empirical stress-testing, and automated verification commands executed in `/home/daniele949/Desktop/Cose/HouseHelper/househelper`:

### 1.1 Automated Quality Verification Commands
1. **Zero-Emoji Scan**:
   - Command: `node scripts/verify-zero-emojis.js`
   - Output: `✔ SUCCESS: Zero emojis or text emoticons detected across 84 files.` (Exit code 0)
2. **Circular Dependency Verification**:
   - Command: `node scripts/check-circular.js`
   - Output: `src/App.js: PASSED (0 cycles); src/: PASSED (0 cycles). ✅ SUCCESS: All circular dependency checks passed with 0 cycles.` (Exit code 0)
3. **Secret & Credential Audit**:
   - Command: `node scripts/audit-secrets.js`
   - Output: `[SUCCESS] 0 secrets, credentials, or private keys detected across working tree and git history.` (Exit code 0)
4. **Full Automated Test Suite**:
   - Command: `CI=true npm test -- --watchAll=false`
   - Output: `Test Suites: 29 passed, 29 total; Tests: 270 passed, 270 total; Snapshots: 0 total; Time: 4.394 s` (Exit code 0, 100% pass rate)
5. **Production Build Compilation**:
   - Command: `npm run build`
   - Output: `Compiled successfully. File sizes after gzip: 230.62 kB build/static/js/main.9aee3c73.js, 11.32 kB build/static/css/main.47c26ccf.css, 1.76 kB build/static/js/453.e2c00ade.chunk.js.` (Exit code 0)

### 1.2 Storage Security Rules Inspection (`storage.rules`)
- Scoped to bucket path: `match /case/{casaId}/documenti/{allPaths=**}` (line 53).
- Cross-service Firestore lookup:
  - `getUserDoc()`: `firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid))` (line 15).
  - `hasValidCasa()`: verifies authenticated UID, existence of Firestore user document, non-null, non-empty string `casaId` (lines 19-25).
  - `belongsToSameHouse(casaId)`: verifies `getUserDoc().data.casaId == casaId` (lines 28-34).
- Immutability constraint: `allow update: if false;` (line 66).
- Size constraints: `request.resource.size > 0 && request.resource.size <= 15 * 1024 * 1024` (lines 38-39).
- MIME whitelist constraint: `request.resource.contentType.matches('application/pdf|image/(jpeg|png|webp|heic)|application/msword|application/vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document|text/plain')` (lines 43-47).
- Anti-metadata tampering: `(request.resource.metadata == null || request.resource.metadata.casaId == null || request.resource.metadata.casaId == casaId)` (lines 61-63).
- Global default deny: `match /{allPaths=**} { allow read, write: if false; }` (lines 75-77).

### 1.3 Service Layer Implementation (`src/services/documentiService.js`)
- `MAX_FILE_SIZE_BYTES`: `15 * 1024 * 1024` (15 MB) (line 19).
- `ALLOWED_CATEGORIES`: `["Contratti", "Contratto", "Bollette", "Garanzie", "Ricevute", "Altro"]` (lines 21-28).
- `ALLOWED_MIME_TYPES`: Whitelists PDF, JPEG, PNG, WEBP, HEIC, Word DOC/DOCX, and TXT (lines 30-39).
- Path traversal sanitization: `sanitizeFileName` strips `[/\\?%*:|"<> \0]` and limits to 100 chars (lines 41-48).
- Dual-key compatibility: Payload includes both `url` and `fileUrl`, `dimensione` and `dimensioneBytes`, `dimensioneFormatted` (lines 120-125).
- Storage rollback on failure: `try { await deleteObject(storageRef); }` if Firestore `addDoc` fails (lines 137-142).

### 1.4 Ergonomics & Navigation Inspection
- `src/App.css`: Touch targets for mobile controls (`.burger-container`, `.mobile-close-btn`, `.theme-pill-toggle`, `.doc-filter-pill`, `.doc-search-input`, `.doc-sort-select`, `.doc-view-btn`, `.doc-action-btn`) enforce `min-height: 44px` / `min-width: 44px`.
- Universal keyboard `:focus-visible` ring across `button`, `input`, `select`, `textarea`, `a`, and `[tabindex]` (lines 2429-2435).
- Responsive view toggle supporting spacious grid and table layout modes.
- `src/components/DesktopNavigation.js`: 7th navigation link added for `/documenti` with icon `fa-folder-open`.
- `src/components/MobileNavigation.js`: Drawer entry added for `/documenti` with icon `fa-folder-open`.
- `src/pages/homeUtente.js`: 6th quick service shortcut button added for `/documenti`.

### 1.5 Adversarial Test Execution Matrix
An empirical 31-scenario adversarial evaluation harness was executed directly against the security rules specification:
- **Test 1-4 (Cross-tenant isolation)**: Charlie in `casaB` attempted read, create, update, and delete on Alice's document in `casaA`. All 4 attempts returned `allowed: false`. (PASSED)
- **Test 5-8 (Unauthenticated access)**: Unauthenticated requests (`auth: null`) for read, create, update, and delete all returned `allowed: false`. (PASSED)
- **Test 9-10 (Homeless/Empty-house users)**: Users with `casaId: null` or `casaId: ""` were rejected. (PASSED)
- **Test 11-12 (Immutability)**: Authorized roommates Alice and Bob attempting an `update` operation on an existing document in their own house `casaA` were rejected (`allowed: false`). (PASSED)
- **Test 13-17 (Size boundaries)**: 0 bytes rejected; 1 byte allowed; exact 15 MB allowed; 15 MB + 1 byte rejected; 16 MB rejected. (PASSED)
- **Test 18-27 (MIME boundaries)**: JPEG, PNG, WEBP, HEIC, DOCX, TXT allowed; Shell scripts (`.sh`), JavaScript (`.js`), SVG (`.svg` stored XSS vector), binary (`.exe`) rejected. (PASSED)
- **Test 28-29 (Metadata spoofing)**: Alice uploading to `casaA` with `metadata.casaId: 'casaB'` rejected; matching metadata allowed. (PASSED)
- **Test 30-31 (Path traversal & default deny)**: Writing outside `/documenti` path or reading root bucket rejected by default deny. (PASSED)
- **Total Matrix Result**: 31/31 passed.

---

## 2. Logic Chain

1. **Multi-Tenant Scoping and Isolation (Obs 1.2, 1.5)**:
   - Milestone M6 requires strict multi-tenant isolation scoped to `casaId`.
   - In `storage.rules`, path matching binds the second path segment to `{casaId}`.
   - Cross-service lookup retrieves the caller's server-side Firestore user document and requires `getUserDoc().data.casaId == casaId`.
   - In the empirical 31-test matrix, any attempt by a user from `casaB` to read, create, update, or delete files under `case/casaA/` was blocked. Therefore, multi-tenant isolation is rigorously enforced.

2. **Unauthenticated Access Rejection (Obs 1.2, 1.5)**:
   - `isSignedIn()` requires `request.auth != null && request.auth.uid != null`.
   - If an unauthenticated client requests any file, `isSignedIn()` short-circuits to `false`, causing all operation checks to fail.
   - Empirically verified: unauthenticated read, create, update, and delete all evaluate to `false`.

3. **Immutability and Anti-Tamper Enforcement (Obs 1.2, 1.5)**:
   - Requirement 3 states: verify `allow update: if false;` rejects file overwrite attempts.
   - In Firebase Storage, overwriting an existing binary object triggers an `update` operation.
   - With `allow update: if false;`, any overwrite or modification attempt is unconditionally rejected at the engine level, protecting signed contracts, warranties, and receipts against tampering.

4. **Size and Format Boundary Constraints (Obs 1.2, 1.3, 1.5)**:
   - `isValidFileSize()` strictly validates `request.resource.size > 0 && request.resource.size <= 15 * 1024 * 1024`.
   - Boundary tests confirmed that 0-byte (empty) files and files exceeding 15,728,640 bytes (such as 15,728,641 bytes or 16 MB) are rejected.
   - The MIME whitelist regex strictly permits only safe document and image formats. Executables, scripts, and SVG files (which can carry stored XSS payloads via `<svg onload=...>`) are rejected.
   - Dual-layer protection: both the client-side service layer (`validateDocumentFile`) and the server-side storage rules enforce these identical constraints.

5. **Automated Verification Integrity (Obs 1.1)**:
   - `verify-zero-emojis.js` confirmed 0 emojis or emoticons across all 84 project files.
   - `check-circular.js` confirmed 0 cycles across `App.js` and the full `src/` directory.
   - `audit-secrets.js` confirmed 0 credentials/keys across working tree and git history.
   - `npm test` verified 29/29 test suites and 270/270 tests pass without failures.
   - `npm run build` completed cleanly with exit code 0.

---

## 3. Caveats

- **Firebase Storage Emulator vs. Production Cross-Service Lookups**:
  In a production Firebase project, `firestore.get()` within `storage.rules` requires Cloud Firestore to be active and running in `(default)` mode in the same GCP project. The rules logic itself is syntactically standard Firebase Storage Rules v2 and verified against the official grammar.
- **Client Metadata Optionality**:
  `storage.rules` allows `request.resource.metadata == null` or matching `casaId`. Because path-based authorization (`belongsToSameHouse(casaId)`) is mandatory on create, omitting or including custom metadata cannot bypass access control.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone M6 satisfies all security, architectural, and ergonomic requirements:
- Multi-tenant household document isolation is airtight.
- Unauthenticated access and homeless user access are strictly rejected.
- Document immutability is guaranteed via `allow update: if false;`.
- 15 MB maximum size, 0-byte rejection, and MIME whitelist constraints are enforced at both service and security rules tiers.
- UI/UX ergonomics (>= 44px touch targets, `:focus-visible`, zero emojis, responsive layouts) comply with project standards.
- All 5 automated verification checks pass cleanly with zero errors.

---

## 5. Verification Method

To independently reproduce and verify this assessment, execute the following commands from `/home/daniele949/Desktop/Cose/HouseHelper/househelper`:

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
- Any emoji or emoticon detected in `src/` or `public/`.
- Any circular import detected by `madge`.
- Any test failure in test suites.
- Any compile error during `npm run build`.
- Any cross-tenant read/write permitted between distinct `casaId` tenants.
