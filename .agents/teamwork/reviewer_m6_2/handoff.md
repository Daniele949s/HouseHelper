# Reviewer 2 Quality & Adversarial Review Report: Milestone M6

**Agent**: `reviewer_m6_2`  
**Role**: Reviewer & Adversarial Critic  
**Date**: 2026-11-03  
**Working Directory**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/reviewer_m6_2/`  
**Handoff File**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/reviewer_m6_2/handoff.md`

---

## Review Summary

**Verdict**: **APPROVE**

Milestone M6 (Household Document Management with Firebase Storage & Cross-Device Ergonomics) has been thoroughly and independently evaluated against all requirements from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `SCOPE.md`.

Key Findings:
- **Integrity**: Zero integrity violations detected. No dummy or facade implementations, no hardcoded expected outputs, no fabricated logs or self-certifying shortcuts.
- **Cross-Device Ergonomics**: Mobile touch targets strictly satisfy `>= 44px` min-width and min-height on `.burger-container`, `.mobile-close-btn`, `.theme-pill-toggle`, filter pills, and action buttons. Desktop view provides spacious card and table layouts. Universal `:focus-visible` styling is enforced across all interactive controls.
- **Feedback & Iconography**: Fully non-blocking feedback integration (`Toast`, `ConfirmModal`), 100% zero-emoji vector iconography with FontAwesome 5.
- **Automated Verification**: All 5 verification commands pass cleanly with 0 errors: 0 emojis across 84 files, 0 circular dependencies, 0 secrets, 29/29 test suites passing (270/270 tests), and clean production build compilation.

---

## 1. Observation

Direct observations from independent command executions, AST dependency checks, and codebase inspection:

### 1.1 Automated Verification Command Outputs

1. **Zero-Emoji Scan** (`node scripts/verify-zero-emojis.js`):
   ```
   ========================================
   🔍 Scanning 84 files across src/ and public/ for emojis & emoticons
   ========================================
   ✔ SUCCESS: Zero emojis or text emoticons detected across 84 files.
   ```
   - Exit code: `0`.

2. **Circular Import Analysis** (`node scripts/check-circular.js`):
   ```
   - src/App.js: PASSED (0 cycles)
   - src/      : PASSED (0 cycles)
   ✅ SUCCESS: All circular dependency checks passed with 0 cycles.
   ```
   - Exit code: `0`.

3. **Secret & Credential Audit** (`node scripts/audit-secrets.js`):
   ```
   [INFO] Scanning working tree files...
   [INFO] Scanned 99 files across working tree.
   [INFO] Auditing git commit history (14 commits)...
   [SUCCESS] 0 secrets, credentials, or private keys detected across working tree and git history.
   ```
   - Exit code: `0`.

4. **Automated Test Suite** (`CI=true npm test -- --watchAll=false`):
   ```
   Test Suites: 29 passed, 29 total
   Tests:       270 passed, 270 total
   Snapshots:   0 total
   Time:        4.343 s
   Ran all test suites.
   ```
   - Exit code: `0`. 100% test pass rate across all 4 tiers and security test suites.

5. **Production Build** (`npm run build`):
   ```
   Compiled successfully.
   File sizes after gzip:
     230.62 kB  build/static/js/main.9aee3c73.js
     11.32 kB   build/static/css/main.47c26ccf.css
     1.76 kB    build/static/js/453.e2c00ade.chunk.js
   ```
   - Exit code: `0`.

### 1.2 Mobile and Desktop Ergonomics & Accessibility Inspection

- **File**: `src/App.css`
  - `.burger-container` (lines 1032–1050):
    ```css
    height: 44px;
    width: 44px;
    min-height: 44px;
    min-width: 44px;
    ```
  - `.mobile-close-btn` (lines 1140–1155):
    ```css
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    ```
  - `.theme-pill-toggle` (lines 168–181):
    ```css
    min-width: 44px;
    min-height: 44px;
    ```
  - `.doc-filter-pill` (lines 2611–2625):
    ```css
    min-height: 44px;
    padding: 8px 18px;
    ```
  - `.doc-action-btn` (lines 2857–2874):
    ```css
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    ```
  - `.doc-view-btn` (lines 2721–2735):
    ```css
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    ```
  - Universal `:focus-visible` Keyboard Ring (lines 2428–2437):
    ```css
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    a:focus-visible,
    [tabindex]:focus-visible {
      outline: 2px solid var(--color-primary) !important;
      outline-offset: 2px !important;
    }
    ```
  - Responsive Viewport Rules (lines 2972–2998):
    - Table view (`.doc-table-wrapper`) hidden on mobile viewports `<= 768px` (`display: none;`).
    - Filter pills provide horizontal touch scrolling (`overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch;`).
    - Card grid switches dynamically to single-column stack on mobile (`grid-template-columns: 1fr;`).

### 1.3 Firebase Storage Security Rules (`storage.rules`)

- **File**: `storage.rules` (lines 1–80)
  - Rules version: `rules_version = '2';`.
  - Multi-tenant scoping: `match /case/{casaId}/documenti/{allPaths=**}`.
  - Cross-service user validation:
    ```javascript
    function belongsToSameHouse(casaId) {
      return hasValidCasa()
        && casaId != null
        && casaId is string
        && casaId.size() > 0
        && getUserDoc().data.casaId == casaId;
    }
    ```
  - File size boundary: `request.resource.size > 0 && request.resource.size <= 15 * 1024 * 1024` (<= 15 MB).
  - MIME whitelist: `matches('application/pdf|image/(jpeg|png|webp|heic)|application/msword|application/vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document|text/plain')`.
  - Tamper protection / Immutability: `allow update: if false;`.
  - Global default deny: `match /{allPaths=**} { allow read, write: if false; }`.

### 1.4 Test Mock Harness & Multi-Tenant Isolation

- **File**: `src/test/mockFirebase.js`
  - In-memory `MockStorageStore` and `storageMock` export `getStorage`, `ref`, `uploadBytes`, `uploadBytesResumable`, `getDownloadURL`, `deleteObject`, `listAll`, and `getMetadata`.
  - Initialized `documenti: {}` in `this.collections` and `this.storageFiles = {}` in `MockFirestoreStore` constructor and `reset()`.
- **File**: `src/setupTests.js`
  - Registered Jest mock: `jest.mock('firebase/storage', () => require('./test/mockFirebase').storageMock);`.
- **File**: `src/test/testUtils.jsx`
  - `seedHousehold` accepts `documenti: []`.
  - Exported `createMockFile(name, size, type)` for clean JSDOM file emulation.

### 1.5 Integration & Routing

- **File**: `src/App.js` (lines 47, 106): Route `/documenti` registered under `HouseProtectedRoute`.
- **File**: `src/components/DesktopNavigation.js` (lines 26, 40-45): 7th item "Documenti" added with icon `fa-folder-open`.
- **File**: `src/components/MobileNavigation.js` (line 52): "Documenti & Contratti" added with icon `fa-folder-open`.
- **File**: `src/pages/homeUtente.js` (lines 219–222): 6th service shortcut button added to `.bento-services` navigating to `/documenti`.

---

## 2. Logic Chain

1. **Touch Ergonomics Compliance (Obs 1.2)**:
   - Target criteria mandate interactive elements have minimum dimensions of 44x44 pixels.
   - Code inspection of `src/App.css` confirms `.burger-container` (44px min-width/height), `.mobile-close-btn` (44px min-width/height), `.theme-pill-toggle` (44px min-width/height), `.doc-filter-pill` (44px min-height), `.doc-action-btn` (44px min-width/height), and `.doc-view-btn` (44px min-width/height).
   - Therefore, mobile touch targets adhere to WCAG 2.5.5 / ergonomics standards.

2. **Accessibility & Responsive Views (Obs 1.2, 1.5)**:
   - All interactive controls receive a visible focus outline via `:focus-visible` with 2px solid primary color and 2px offset.
   - On desktop displays (`> 768px`), users can toggle between a multi-column responsive grid and a structured data table. On mobile displays (`<= 768px`), table view is hidden to prevent horizontal page scrolling, while cards stack vertically and category filter pills scroll horizontally.
   - All icon elements include `aria-hidden="true"`, buttons and tabs include proper ARIA roles (`role="tab"`, `aria-selected`, `aria-expanded`, `aria-label`).

3. **Storage Security & Multi-Tenant Household Isolation (Obs 1.3, 1.4)**:
   - Storage operations are sandboxed to `/case/{casaId}/documenti/**`.
   - Read, create, and delete actions require verification that `request.auth.uid` has a matching `casaId` in `/databases/(default)/documents/utenti/$(request.auth.uid)`.
   - Update is blocked (`allow update: if false;`), ensuring files cannot be mutated in-place.
   - Multi-tenant boundary test `T2.28` proves that users from `casa_verdi` cannot view or query documents belonging to `casa_garibaldi`.
   - Security rule simulation `SEC-14` tests confirm that unauthorized roommates, unauthenticated users, oversized files (> 15MB), and unapproved MIME types are rejected.

4. **Feedback System & Zero-Emoji Conformance (Obs 1.1, 1.2, 1.5)**:
   - Deletions utilize `showConfirm` with danger styling rather than blocking browser `window.confirm()`.
   - Upload successes and validation warnings trigger `showToast` non-blocking notifications.
   - Zero emojis or text emoticons exist across all 84 files in `src/` and `public/`, verified by `verify-zero-emojis.js`. All icons use vector FontAwesome SVG classes.

5. **Integrity & Verification Rigor (Obs 1.1, 1.4)**:
   - Neither source code nor tests contain dummy stubs or hardcoded pass values.
   - In-memory mock harness in `mockFirebase.js` accurately emulates storage and firestore behaviors.
   - Full test run of 29 test suites (270 tests) passes 100% cleanly in 4.3 seconds with zero build warnings.

---

## 3. Adversarial Stress-Test Results

| # | Attack Scenario / Hypothesis | Expected Behavior | Actual Behavior | Result |
|---|------------------------------|-------------------|-----------------|--------|
| **ST-1** | Path traversal in upload filename (`../../../etc/passwd.pdf`) | Traversal separators stripped/sanitized before storage path creation | `sanitizeFileName` replaces slashes with `_` -> `.._.._.._etc_passwd.pdf` | **PASS** |
| **ST-2** | Script injection / XSS in document name or note field | Strip script tags and HTML markup | `sanitizeText` removes `<script>` and HTML formatting tags | **PASS** |
| **ST-3** | Uploading empty file (0 bytes) or oversized file (> 15 MB) | Client & storage rules reject upload | `validateDocumentFile` rejects with clear error; `storage.rules` rejects | **PASS** |
| **ST-4** | Malicious MIME/extension upload (`payload.exe` or `exploit.sh`) | Rejected by client validator and storage rules | `validateDocumentFile` and `isValidContentType()` reject execution payloads | **PASS** |
| **ST-5** | Firestore metadata write failure after storage upload | Storage binary must be rolled back (no orphan storage objects) | `caricaDocumento` catches error and invokes `deleteObject(storageRef)` | **PASS** |
| **ST-6** | Cross-tenant document tampering (User in House B attempts to delete/read House A doc) | Operation rejected; documents completely isolated | Multi-tenant query filter and `storage.rules` prevent cross-tenant access | **PASS** |
| **ST-7** | Rapid toggling between grid and table views | DOM switches smoothly without memory leaks or crashes | Test `T1.33` verifies clean switching without unmounting errors | **PASS** |
| **ST-8** | Keyboard navigation via Tab / Space / Enter | Dropzone, pills, buttons focusable with visible ring | Universal `:focus-visible` ring active; Dropzone handles Enter/Space keys | **PASS** |

---

## 4. Caveats

1. **Firebase Storage Cross-Service `firestore.get()` in Live Environments**:
   - In a production Firebase deployment, `storage.rules` cross-service Firestore lookups require that Cloud Firestore exists in the same Google Cloud project under `(default)` and appropriate service-to-service IAM permissions are established.
2. **React 19 `act(...)` Testing Console Output**:
   - During automated test execution, standard React 19 testing library console notices regarding `act(...)` updates on async AuthProvider notifications are logged, but they do not affect test execution or test outcomes (all 29 suites pass).

---

## 5. Conclusion

**Verdict: APPROVE**

Milestone M6 satisfies all functional, architectural, security, accessibility, and zero-emoji requirements. The implementation of Household Document Management (`ViewDocumenti.js`, `documentiService.js`, `storage.rules`) is robust, secure, and production-ready. The ergonomics optimizations (>= 44px touch targets, `:focus-visible` styling, responsive grid/table views) fulfill all cross-device criteria without regressions or integrity compromises.

---

## 6. Verification Method

To independently reproduce and verify this review assessment, execute the following commands from the repository root (`/home/daniele949/Desktop/Cose/HouseHelper/househelper`):

```bash
# 1. Zero-Emoji Scan: Validates 0 emojis across all 84 files
node scripts/verify-zero-emojis.js

# 2. Circular Import Check: Validates 0 cycles across src/App.js and src/
node scripts/check-circular.js

# 3. Secret Audit: Validates 0 sensitive keys across tree and git history
node scripts/audit-secrets.js

# 4. Full Test Suite: Validates 100% pass across all 29 suites (270 tests)
CI=true npm test -- --watchAll=false

# 5. Production Compilation: Validates clean build output
npm run build
```

### Invalidation Conditions
- Any occurrence of emoji or emoticon detected by `verify-zero-emojis.js`.
- Any cyclic import found between `ViewDocumenti.js` and `App.js`.
- Any failure across the 29 test suites.
- Any interactive element with touch target `< 44px`.
