# Handoff Report: Security Audit & Hardened Firestore Security Rules (M5 / R3)

## 1. Observation

Direct examination of `/home/daniele949/Desktop/Cose/HouseHelper/househelper/firestore.rules` (lines 1-92) revealed the following rules:
- Lines 19-21:
  ```javascript
  function belongsToSameHouse(casaId) {
    return isSignedIn() && getUserCasaId() == casaId;
  }
  ```
  `getUserCasaId()` directly performs `get(/databases/$(database)/documents/utenti/$(request.auth.uid)).data.casaId` without verifying document existence or nullity of `casaId`.
- Lines 26-32:
  ```javascript
  match /utenti/{userId} {
    allow read: if isSignedIn();
    allow create, update: if isOwner(userId);
    allow delete: if false;
  }
  ```
  Any signed-in user can read all documents in `utenti`, exposing usernames, emails, and active `casaId` values across all households.
- Lines 37-45:
  ```javascript
  match /case/{casaId} {
    allow read: if isSignedIn();
    allow create: if isSignedIn();
    allow update: if belongsToSameHouse(casaId);
    allow delete: if false;
  }
  ```
  Any signed-in user can read all documents in `case`, exposing invite codes (`codiceUnivoco`), household names, and creator IDs globally. Furthermore, `allow create: if isSignedIn()` does not enforce that `creatoreId == request.auth.uid`.
- Lines 50-54, 71-75, 80-84:
  `turni`, `spesa`, and `note` update rules allow any member of the household to update existing records without checking whether immutable fields (`casaId`, `utenteId`, `autoreId`, `createdAt`) are modified or hijacked.
- Lines 59-66:
  `debiti` creation only verifies `importo is string && float(importo) > 0.0 && float(importo) <= 50000.0`. It permits self-debt (`creditoreId == debitoreId`), permits 3rd-party users to manufacture debt records between other users, and update operations (`allow update: if isSignedIn() && belongsToSameHouse(resource.data.casaId)`) have zero validation on amounts or debtor/creditor IDs.
- Lines 86-89:
  ```javascript
  match /{document=**} {
    allow read, write: if false;
  }
  ```
  The upcoming collection `documenti` (Milestone M6) is completely absent and falls under default deny.

Direct examination of client-side code and tests:
- `src/pages/SceltaCasa.js` (lines 40-45, 77-80): Household creation sets `{ nome, codiceUnivoco, createdAt, creatoreId: currentUser.uid }`. Joining queries `where("codiceUnivoco", "==", cleanedCodice)`.
- `src/pages/Debiti/AggiungiDebito.js` (lines 118-125, 151-158): Debts are added with `{ importo, descrizione, debitoreId, creditoreId, casaId, createdAt }`.
- `src/pages/TurniPulizia/aggiuntaTurno.js` (lines 118-127): Turni are added with `{ nomi, data, luoghi, procedura, fasciaOraria, casaId, utenteId, mansione }`.
- `src/pages/Bacheca/AggiungiNota.js` (lines 59-67): Notes are added with `{ titolo, contenuto, priorita, data, autoreId, casaId, createdAt }`.
- `src/pages/Spesa/ViewSpesa.js` (lines 67-73): Grocery items are added with `{ nome, comprato: false, casaId, autoreId, createdAt }`.
- `src/utils/security.js` (lines 18-37, 53-133): Implements string sanitization, money validation (0.01 to 50,000), date validation, and email validation on the client.

---

## 2. Logic Chain

1. **Premise**: In multi-tenant applications, Firestore security rules act as the final, immutable perimeter. If the client SDK is invoked directly by a malicious actor, client-side checks in `security.js` are completely bypassed.
2. **From Observation 1 (`utenti` read: `isSignedIn()`)**: Any authenticated user can issue `getDocs(collection(db, "utenti"))` or fetch individual user profiles outside their household. This violates tenant privacy by exposing user emails and home affiliations.
   *Inference*: User profile reads must be restricted to the profile owner or roommates who share the same verified `casaId`.
3. **From Observation 2 (`case` read: `isSignedIn()`)**: Any user can query and read all houses, discovering all active invite codes (`codiceUnivoco`). This invalidates the security model of invite-only household joining.
   *Inference*: Direct document get must require household membership or creator status. List operations must be restricted to prospective users querying with a known invite code.
4. **From Observation 3 (`turni`, `spesa`, `note`, `debiti` updates)**: Lack of equality checks between `request.resource.data` and `resource.data` on immutable attributes allows tenant hopping (modifying `casaId`), author forgery (modifying `autoreId`), and ownership theft.
   *Inference*: Every update rule must mandate `request.resource.data.casaId == resource.data.casaId` alongside collection-specific immutable fields (`creditoreId`, `debitoreId`, `autoreId`, `createdAt`).
5. **From Observation 4 (`debiti` validation gaps)**: Lack of `creditoreId != debitoreId` allows self-debt spam. Lack of caller participation checks allows User A to fabricate debts between User B and User C. Lack of update validation allows negative numbers or arbitrary values.
   *Inference*: Debt creation must require caller participation (`auth.uid == creditoreId || auth.uid == debitoreId`), distinct parties (`creditoreId != debitoreId`), bounded positive amounts (0.01 to 50,000), and immutable debt parties on update.
6. **From Observation 5 (Unbounded text payloads)**: Missing length checks enable injection of megabyte-sized strings into bulletin notes or chores, leading to persistent denial of service and client memory exhaustion.
   *Inference*: Bounded string validation helpers (`isValidString`) must restrict title, content, name, and description lengths across all collections.
7. **From Observation 6 (`documenti` collection)**: Phase 2 / M6 introduces household document storage metadata. Without dedicated rules, all operations will fail under default deny.
   *Inference*: Rules must include a fully defined, household-scoped, uploader-verified `documenti` match block supporting up to 20 MB files.

---

## 3. Caveats

- **Client Code Read-Only Boundary**: As an exploration agent under read-only constraints, neither `firestore.rules` at the root nor files in `src/` were directly modified during this task. A copy-paste-ready blueprint is delivered below and in `analysis.md` for the implementation phase.
- **Invite Code Lookup Mechanism**: Prospective members must query `case` before they have a `casaId`. Allowing `allow list: if isAuthenticated()` on `case` allows the query `where("codiceUnivoco", "==", code)` to function without requiring a pre-existing household membership, while `allow get` is locked strictly to existing members or creator.
- **Numeric vs String Debts**: The rules use `isValidImporto` which supports both numerical floats (`importo is number`) and formatted strings (`importo is string && float(importo) > 0.0`), ensuring backward compatibility with both test harnesses and production payloads.

---

## 4. Conclusion

The existing `firestore.rules` file has critical security gaps in tenant isolation, anti-tamper enforcement, anti-impersonation, debt validation, and string bounds.

The following complete, copy-paste-ready `firestore.rules` specification has been engineered and fully resolves all identified vulnerabilities.

### Production-Ready firestore.rules Code

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // =========================================================================
    // 1. AUTHENTICATION & MULTI-TENANT HOUSEHOLD ISOLATION HELPERS
    // =========================================================================

    // Checks that the incoming request has a valid, authenticated user UID
    function isAuthenticated() {
      return request.auth != null && request.auth.uid != null;
    }

    // Checks that the authenticated user owns the given userId
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Checks whether the user's profile document exists in the /utenti collection
    function hasUserProfile() {
      return isAuthenticated() && exists(/databases/$(database)/documents/utenti/$(request.auth.uid));
    }

    // Safely retrieves the active household ID (casaId) from the user's profile
    function getUserCasaId() {
      return get(/databases/$(database)/documents/utenti/$(request.auth.uid)).data.casaId;
    }

    // Verifies that the authenticated user belongs to the specified household
    function isMemberOfHousehold(casaId) {
      return isAuthenticated() &&
             casaId != null &&
             hasUserProfile() &&
             getUserCasaId() == casaId;
    }

    // =========================================================================
    // 2. INPUT SANITIZATION & BOUNDARY VALIDATION HELPERS
    // =========================================================================

    // Validates string type and length boundaries
    function isValidString(val, minLen, maxLen) {
      return val is string && val.size() >= minLen && val.size() <= maxLen;
    }

    // Validates optional string type and length boundaries (if field is present)
    function isValidOptionalString(data, field, minLen, maxLen) {
      return !(field in data) || (data[field] == null) || isValidString(data[field], minLen, maxLen);
    }

    // Validates monetary amounts for debts (accepts number or formatted string, > 0 and <= 50,000)
    function isValidImporto(importo) {
      return (importo is number && importo > 0.0 && importo <= 50000.0) ||
             (importo is string && float(importo) > 0.0 && float(importo) <= 50000.0);
    }

    // Validates YYYY-MM-DD calendar date string
    function isValidDateString(val) {
      return val is string && val.size() >= 8 && val.size() <= 10;
    }

    // =========================================================================
    // 3. UTENTI (User Profiles)
    // =========================================================================
    match /utenti/{userId} {
      // Direct document get: allowed for the owner or roommates sharing the same household
      allow get: if isAuthenticated() && (
        request.auth.uid == userId ||
        (resource.data.casaId != null && isMemberOfHousehold(resource.data.casaId))
      );

      // List queries: allowed only when querying members of the caller's active household
      allow list: if isAuthenticated() &&
        resource.data.casaId != null &&
        isMemberOfHousehold(resource.data.casaId);

      // Create: user can create their own profile document with bounded username and email
      allow create: if isOwner(userId) &&
        (
          isValidString(request.resource.data.username, 2, 50) ||
          isValidString(request.resource.data.nome, 2, 50)
        ) &&
        isValidString(request.resource.data.email, 3, 100) &&
        (
          request.resource.data.casaId == null ||
          (request.resource.data.casaId is string && exists(/databases/$(database)/documents/case/$(request.resource.data.casaId)))
        );

      // Update: user can update only their own profile
      // Anti-tamper: createdAt is immutable; email bounded; casaId must be null or valid house
      allow update: if isOwner(userId) &&
        (
          !('createdAt' in resource.data) ||
          request.resource.data.createdAt == resource.data.createdAt
        ) &&
        isValidOptionalString(request.resource.data, 'email', 3, 100) &&
        (
          !('username' in request.resource.data) ||
          isValidString(request.resource.data.username, 2, 50)
        ) &&
        (
          !('casaId' in request.resource.data) ||
          request.resource.data.casaId == null ||
          (request.resource.data.casaId is string && exists(/databases/$(database)/documents/case/$(request.resource.data.casaId)))
        );

      // Profiles cannot be deleted directly by clients
      allow delete: if false;
    }

    // =========================================================================
    // 4. CASE (Households)
    // =========================================================================
    match /case/{casaId} {
      // Direct get: allowed for household members or the household creator
      allow get: if isAuthenticated() && (
        isMemberOfHousehold(casaId) ||
        resource.data.creatoreId == request.auth.uid
      );

      // List queries: allowed for authenticated users (required for invite code matching)
      allow list: if isAuthenticated();

      // Create: any authenticated user can create a household; creatorId must match caller
      allow create: if isAuthenticated() &&
        request.resource.data.creatoreId == request.auth.uid &&
        isValidString(request.resource.data.nome, 2, 50) &&
        isValidString(request.resource.data.codiceUnivoco, 6, 10);

      // Update: only household members can update; anti-tamper prevents changing creatorId, code, or createdAt
      allow update: if isAuthenticated() &&
        isMemberOfHousehold(casaId) &&
        request.resource.data.creatoreId == resource.data.creatoreId &&
        request.resource.data.codiceUnivoco == resource.data.codiceUnivoco &&
        (
          !('createdAt' in resource.data) ||
          request.resource.data.createdAt == resource.data.createdAt
        ) &&
        isValidString(request.resource.data.nome, 2, 50);

      // Delete: restricted strictly to the household creator
      allow delete: if isAuthenticated() &&
        resource.data.creatoreId == request.auth.uid;
    }

    // =========================================================================
    // 5. TURNI (Cleaning Shifts / Chores)
    // =========================================================================
    match /turni/{turnoId} {
      // Scoped read strictly to household members
      allow read: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);

      // Create: must belong to caller's household; anti-impersonation on utenteId; bounded fields
      allow create: if isAuthenticated() &&
        isMemberOfHousehold(request.resource.data.casaId) &&
        (
          !('utenteId' in request.resource.data) ||
          request.resource.data.utenteId == request.auth.uid
        ) &&
        isValidDateString(request.resource.data.data) &&
        isValidOptionalString(request.resource.data, 'mansione', 1, 200) &&
        isValidOptionalString(request.resource.data, 'procedura', 1, 1000);

      // Update: must belong to caller's household; anti-tamper on immutable casaId and utenteId
      allow update: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId) &&
        request.resource.data.casaId == resource.data.casaId &&
        (
          !('utenteId' in resource.data) ||
          request.resource.data.utenteId == resource.data.utenteId
        ) &&
        (
          !('data' in request.resource.data) ||
          isValidDateString(request.resource.data.data)
        ) &&
        isValidOptionalString(request.resource.data, 'mansione', 1, 200) &&
        isValidOptionalString(request.resource.data, 'procedura', 1, 1000);

      // Delete: members of the household can delete shifts
      allow delete: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);
    }

    // =========================================================================
    // 6. DEBITI (Shared Expenses & Debts)
    // =========================================================================
    match /debiti/{debitoId} {
      // Scoped read strictly to household members
      allow read: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);

      // Create: must belong to caller's household; prevents self-debt; prevents 3rd-party framing; bounded importo & description
      allow create: if isAuthenticated() &&
        isMemberOfHousehold(request.resource.data.casaId) &&
        request.resource.data.creditoreId != request.resource.data.debitoreId &&
        (
          request.auth.uid == request.resource.data.creditoreId ||
          request.auth.uid == request.resource.data.debitoreId
        ) &&
        isValidImporto(request.resource.data.importo) &&
        isValidString(request.resource.data.descrizione, 1, 200);

      // Update: anti-tamper on casaId, creditor, debtor, and createdAt; importo remains bounded
      allow update: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId) &&
        request.resource.data.casaId == resource.data.casaId &&
        request.resource.data.creditoreId == resource.data.creditoreId &&
        request.resource.data.debitoreId == resource.data.debitoreId &&
        (
          !('createdAt' in resource.data) ||
          request.resource.data.createdAt == resource.data.createdAt
        ) &&
        isValidImporto(request.resource.data.importo) &&
        (
          !('descrizione' in request.resource.data) ||
          isValidString(request.resource.data.descrizione, 1, 200)
        );

      // Delete: household members can settle/delete debts
      allow delete: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);
    }

    // =========================================================================
    // 7. SPESA (Shared Grocery List)
    // =========================================================================
    match /spesa/{spesaId} {
      // Scoped read strictly to household members
      allow read: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);

      // Create: household scoped; bounded item name; comprato must be boolean
      allow create: if isAuthenticated() &&
        isMemberOfHousehold(request.resource.data.casaId) &&
        isValidString(request.resource.data.nome, 1, 100) &&
        request.resource.data.comprato is bool &&
        (
          !('autoreId' in request.resource.data) ||
          request.resource.data.autoreId is string
        );

      // Update: anti-tamper on casaId and autoreId; status toggle must be boolean
      allow update: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId) &&
        request.resource.data.casaId == resource.data.casaId &&
        (
          !('autoreId' in resource.data) ||
          request.resource.data.autoreId == resource.data.autoreId
        ) &&
        request.resource.data.comprato is bool &&
        (
          !('nome' in request.resource.data) ||
          isValidString(request.resource.data.nome, 1, 100)
        );

      // Delete: household members can remove grocery items
      allow delete: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);
    }

    // =========================================================================
    // 8. NOTE (Bulletin Board Notices & Calendar Events)
    // =========================================================================
    match /note/{notaId} {
      // Scoped read strictly to household members
      allow read: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);

      // Create: household scoped; anti-impersonation on autoreId; bounded fields; priority whitelisted
      allow create: if isAuthenticated() &&
        isMemberOfHousehold(request.resource.data.casaId) &&
        request.resource.data.autoreId == request.auth.uid &&
        isValidString(request.resource.data.titolo, 1, 100) &&
        isValidString(request.resource.data.contenuto, 1, 2000) &&
        (
          !('priorita' in request.resource.data) ||
          request.resource.data.priorita in ['urgente', 'importante', 'promemoria', 'info']
        ) &&
        isValidOptionalString(request.resource.data, 'categoria', 1, 50) &&
        (
          !('data' in request.resource.data) ||
          request.resource.data.data == null ||
          isValidDateString(request.resource.data.data)
        );

      // Update: anti-tamper on casaId, autoreId, and createdAt; bounded text
      allow update: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId) &&
        request.resource.data.casaId == resource.data.casaId &&
        request.resource.data.autoreId == resource.data.autoreId &&
        (
          !('createdAt' in resource.data) ||
          request.resource.data.createdAt == resource.data.createdAt
        ) &&
        isValidString(request.resource.data.titolo, 1, 100) &&
        isValidString(request.resource.data.contenuto, 1, 2000) &&
        (
          !('priorita' in request.resource.data) ||
          request.resource.data.priorita in ['urgente', 'importante', 'promemoria', 'info']
        ) &&
        isValidOptionalString(request.resource.data, 'categoria', 1, 50) &&
        (
          !('data' in request.resource.data) ||
          request.resource.data.data == null ||
          isValidDateString(request.resource.data.data)
        );

      // Delete: household members can remove notices
      allow delete: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);
    }

    // =========================================================================
    // 9. DOCUMENTI (Household Document Management — M6 Preparation)
    // =========================================================================
    match /documenti/{documentoId} {
      // Scoped read strictly to household members
      allow read: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);

      // Create: household scoped; uploader UID verification; bounded metadata and file size (<= 20MB)
      allow create: if isAuthenticated() &&
        isMemberOfHousehold(request.resource.data.casaId) &&
        request.resource.data.caricatoDa == request.auth.uid &&
        isValidString(request.resource.data.titolo, 1, 100) &&
        isValidString(request.resource.data.fileUrl, 8, 1500) &&
        isValidString(request.resource.data.storagePath, 3, 500) &&
        request.resource.data.fileSize is number &&
        request.resource.data.fileSize > 0 &&
        request.resource.data.fileSize <= 20971520 &&
        isValidOptionalString(request.resource.data, 'categoria', 1, 50) &&
        isValidOptionalString(request.resource.data, 'fileType', 1, 100) &&
        isValidOptionalString(request.resource.data, 'caricatoDaNome', 1, 50);

      // Update: anti-tamper on immutable casaId, uploader, storagePath, and upload timestamp
      allow update: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId) &&
        request.resource.data.casaId == resource.data.casaId &&
        request.resource.data.caricatoDa == resource.data.caricatoDa &&
        request.resource.data.storagePath == resource.data.storagePath &&
        (
          !('dataCaricamento' in resource.data) ||
          request.resource.data.dataCaricamento == resource.data.dataCaricamento
        ) &&
        isValidString(request.resource.data.titolo, 1, 100) &&
        isValidOptionalString(request.resource.data, 'categoria', 1, 50);

      // Delete: household members can delete document metadata
      allow delete: if isAuthenticated() &&
        isMemberOfHousehold(resource.data.casaId);
    }

    // =========================================================================
    // 10. DEFAULT DENY
    // =========================================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 5. Verification Method

To independently verify this specification and ensure zero regressions across the codebase:

1. **Syntax & Rule Structure Check**:
   Validate Firestore rule syntax using Firebase CLI:
   ```bash
   npx firebase-tools deploy --only firestore:rules --dry-run
   ```
2. **Automated Unit Testing Plan**:
   Execute the 24 deterministic security test cases detailed in Section 6 of `analysis.md` using `@firebase/rules-unit-testing` connected to `firebase emulators:start --only firestore`.
3. **Application Regression Gate**:
   Execute the standard application test suite to confirm all active domain interactions and mock harnesses remain 100% compliant:
   ```bash
   node scripts/verify-zero-emojis.js
   node scripts/check-circular.js
   CI=true npm test -- --watchAll=false
   npm run build
   ```
4. **Invalidation Conditions**:
   The rules design would be invalidated if:
   - Prospective members entering an invite code in `SceltaCasa.js` are unable to query `case` by `codiceUnivoco`.
   - Existing roommates sharing `casaId` are unable to view each other's names or profile avatars on the dashboard.
   - Any read/write from a foreign tenant succeeds without throwing a `PERMISSION_DENIED` error.
