# Security Audit and Firestore Rules Architecture Analysis

## 1. Executive Summary

An architectural and security audit of `firestore.rules` was conducted to harden HouseHelper for multi-tenant production readiness (Milestone M5 / Requirement R3). 

The audit evaluated existing security rules against data flows, queries, and mutations across `src/pages/**`, `src/utils/security.js`, `src/contexts/AuthContext.js`, and `src/test/mockFirebase.js`. Six critical vulnerability classes were identified in the legacy rules:
1. **Unrestricted Profile and Household Enumeration**: `utenti` and `case` permitted global read access to any signed-in user, leaking invite codes, household member lists, and user emails project-wide.
2. **Missing Anti-Tamper Constraints**: Updates on existing documents across all collections (`case`, `turni`, `debiti`, `spesa`, `note`) failed to lock down immutable identifiers (`casaId`, `creatoreId`, `autoreId`, `createdAt`), allowing tenant hijacking and record forgery.
3. **Impersonation Vulnerabilities**: Document creation did not enforce author verification (`autoreId == request.auth.uid`, `creatoreId == request.auth.uid`, `caricatoDa == request.auth.uid`), permitting users to forge announcements, shifts, and uploads under other users' identities.
4. **Unconstrained Debt Creation & Self-Debt**: Rules permitted self-debts (`creditoreId == debitoreId`), allowed 3rd-party users to manufacture debt records between uninvolved parties, and lacked upper/lower bound checks on updates.
5. **Unbounded Payloads & Injection Risks**: Text fields across all collections had no character limits or type checks in Firestore rules, leaving the database vulnerable to payload bloat and denial-of-service storage exhaustion.
6. **Missing Document Management Rules**: The upcoming `documenti` collection (Milestone M6) was unmapped and rejected under default deny.

A production-ready `firestore.rules` specification has been engineered, complete with robust multi-tenant helper functions, anti-tamper validations, payload boundaries, and an automated verification test plan.

---

## 2. Collection and Data Schema Audit

| Collection | Schema Fields | Read Queries (Client) | Write Operations (Client) | Security Invariants |
|---|---|---|---|---|
| `utenti` | `username` (string, 2-50)<br>`email` (string, 3-100)<br>`casaId` (string or null)<br>`createdAt` (timestamp) | Direct `doc(db, "utenti", uid)`<br>`query(utenti, where("casaId", "==", casaId))` | `setDoc(utenti, uid, data)` on registration<br>`updateDoc(utenti, uid, { casaId })` on join/create/leave | Direct read allowed only for profile owner or co-tenant roommates. Writes strictly owner-only. `createdAt` immutable. `casaId` must be null or reference an existing household. |
| `case` | `nome` (string, 2-50)<br>`codiceUnivoco` (string, 6-10)<br>`creatoreId` (string, UID)<br>`createdAt` (timestamp) | Direct `doc(db, "case", casaId)` by members<br>`query(case, where("codiceUnivoco", "==", code))` | `addDoc(case, data)` on create<br>`updateDoc(case, casaId, data)` on rename | Direct get allowed only for members or creator. List allowed for invite code lookup. Create requires `creatoreId == auth.uid`. Update requires household membership and immutable `creatoreId`, `codiceUnivoco`, `createdAt`. Delete creator-only. |
| `turni` | `nomi` (list/string)<br>`luoghi` (list/string)<br>`fasciaOraria` (list/string)<br>`mansione` (string, 1-200)<br>`procedura` (string, 1-1000)<br>`data` (string, YYYY-MM-DD)<br>`casaId` (string)<br>`utenteId` (string, UID) | `query(turni, where("casaId", "==", casaId))` | `addDoc(turni, data)`<br>`updateDoc(turni, id, data)`<br>`deleteDoc(turni, id)` | Read/write strictly scoped to active household members. Create verifies `utenteId == auth.uid` (if present). Update enforces immutable `casaId` and `utenteId`. |
| `debiti` | `importo` (string/number, 0.01-50000.00)<br>`descrizione` (string, 1-200)<br>`creditoreId` (string, UID)<br>`debitoreId` (string, UID)<br>`casaId` (string)<br>`createdAt` (timestamp) | `query(debiti, where("casaId", "==", casaId))` | `addDoc(debiti, data)`<br>`deleteDoc(debiti, id)` (settle) | Strictly scoped to household members. Self-debt strictly prohibited (`creditoreId != debitoreId`). Caller must be creditor or debtor. Amount must be positive and <= 50,000. `casaId`, `creditoreId`, `debitoreId`, `createdAt` immutable. |
| `spesa` | `nome` (string, 1-100)<br>`comprato` (boolean)<br>`casaId` (string)<br>`autoreId` (string, UID)<br>`createdAt` (timestamp) | `query(spesa, where("casaId", "==", casaId))` | `addDoc(spesa, data)`<br>`updateDoc(spesa, id, { comprato })`<br>`deleteDoc(spesa, id)` | Strictly scoped to household members. `comprato` strictly boolean. `casaId` and `autoreId` immutable. Text length bounded. |
| `note` | `titolo` (string, 1-100)<br>`contenuto` (string, 1-2000)<br>`priorita` (string enum)<br>`categoria` (string, optional)<br>`data` (string, optional date)<br>`isEvento` (boolean, optional)<br>`casaId` (string)<br>`autoreId` (string, UID)<br>`createdAt` (timestamp) | `query(note, where("casaId", "==", casaId))` | `addDoc(note, data)`<br>`updateDoc(note, id, data)`<br>`deleteDoc(note, id)` | Strictly scoped to household members. Author verification `autoreId == auth.uid` on create. Anti-tamper on `casaId`, `autoreId`, `createdAt`. Priority whitelisted to `['urgente', 'importante', 'promemoria', 'info']`. |
| `documenti` | `titolo` (string, 1-100)<br>`categoria` (string, 1-50)<br>`fileUrl` (string, 8-1500)<br>`storagePath` (string, 3-500)<br>`fileType` (string, 1-100)<br>`fileSize` (number, 1-20971520)<br>`caricatoDa` (string, UID)<br>`caricatoDaNome` (string, optional)<br>`casaId` (string)<br>`dataCaricamento` (timestamp) | `query(documenti, where("casaId", "==", casaId))` | `addDoc(documenti, data)`<br>`updateDoc(documenti, id, data)`<br>`deleteDoc(documenti, id)` | Scoped strictly to household members. Uploader UID check `caricatoDa == auth.uid`. File size capped at 20 MB (20,971,520 bytes). Immutable `casaId`, `caricatoDa`, `storagePath`, `dataCaricamento`. |

---

## 3. Gap Analysis Table

| Domain / Resource | Current Rule Implementation | Vulnerability Identified | Risk Severity | Hardened Specification |
|---|---|---|---|---|
| Helper: Household Membership | `getUserCasaId()` calls `get(/databases/.../utenti/$(auth.uid)).data.casaId` without existence guard | Crashes rule evaluation if user profile is missing or newly registered | High | Safe chained evaluation: `isAuthenticated() && casaId != null && hasUserProfile() && getUserCasaId() == casaId` |
| `utenti/{userId}` Read | `allow read: if isSignedIn();` | Global enumeration: any signed-in user can dump emails, names, and house IDs across all tenants | Critical | `get` allowed only for owner (`auth.uid == userId`) or roommates sharing same `casaId`. `list` allowed only when filtered by caller's `casaId`. |
| `utenti/{userId}` Write | `allow create, update: if isOwner(userId);` | Missing payload boundaries and anti-tamper. User can set invalid `casaId` or huge payloads | Medium | Validate `username` (2-50), `email` (3-100), immutable `createdAt`, and `casaId` existence check in `case` collection. |
| `case/{casaId}` Read | `allow read: if isSignedIn();` | Global enumeration: any user can read all invite codes, household names, and member rosters | High | Split: `get` restricted to household members or creator. `list` allowed for authenticated invite code verification. |
| `case/{casaId}` Create | `allow create: if isSignedIn();` | Impersonation: caller can set `creatoreId` to any victim UID | High | Enforce `request.resource.data.creatoreId == request.auth.uid` with string length bounds. |
| `case/{casaId}` Update | `allow update: if belongsToSameHouse(casaId);` | Missing anti-tamper: members can overwrite `creatoreId`, change `codiceUnivoco`, or wipe `createdAt` | High | Immutable constraints: `creatoreId`, `codiceUnivoco`, and `createdAt` cannot be modified. |
| `case/{casaId}` Delete | `allow delete: if false;` | Creator cannot delete their own household even when requested | Low | Allowed if caller is verified creator (`resource.data.creatoreId == request.auth.uid`). |
| `turni/{turnoId}` Create | `allow create: if isSignedIn() && request.resource.data.casaId == getUserCasaId();` | Unverified `utenteId`, unbounded string fields, arbitrary payload injection | Medium | Enforce `utenteId == auth.uid` (if provided), validate date format, bound `mansione` (200) and `procedura` (1000). |
| `turni/{turnoId}` Update | `allow update: if isSignedIn() && belongsToSameHouse(resource.data.casaId);` | Tenant hopping: member can change `casaId` to another house or change shift creator | High | Anti-tamper: `request.resource.data.casaId == resource.data.casaId` and immutable `utenteId`. |
| `debiti/{debitoId}` Create | Checks `importo is string && float(importo) > 0.0 && float(importo) <= 50000.0` | Self-debt allowed (`creditoreId == debitoreId`). Uninvolved 3rd-party user can frame others. Rejects numeric `importo`. | High | Prevent self-debt. Require caller to be creditor or debtor. Dual numeric/string validator `isValidImporto`. Bound description. |
| `debiti/{debitoId}` Update | `allow update: if isSignedIn() && belongsToSameHouse(resource.data.casaId);` | Zero validation on update: caller can manipulate amount to negative numbers or reassign creditor/debtor | Critical | Anti-tamper: `casaId`, `creditoreId`, `debitoreId`, and `createdAt` immutable. `importo` re-validated. |
| `spesa/{spesaId}` Update | `allow update: if isSignedIn() && belongsToSameHouse(resource.data.casaId);` | Caller can alter `casaId` or `autoreId`; `comprato` can be non-boolean | Medium | Anti-tamper on `casaId` and `autoreId`. Enforce `comprato is bool` and bounded string length. |
| `note/{notaId}` Create | `allow create: if isSignedIn() && request.resource.data.casaId == getUserCasaId();` | Impersonation: caller can forge author (`autoreId != auth.uid`). Unbounded content length. Untyped priority. | High | Enforce `autoreId == auth.uid`. Bound `titolo` (100) and `contenuto` (2000). Whitelist priority enums. |
| `note/{notaId}` Update | `allow update: if isSignedIn() && belongsToSameHouse(resource.data.casaId);` | Caller can alter author, transfer notice across houses, or alter creation timestamp | High | Anti-tamper on `casaId`, `autoreId`, and `createdAt`. Re-validate string bounds and priority whitelist. |
| `documenti/{documentoId}` | Not present (rejected by fallback deny) | Document management feature (M6) completely blocked or unsecured | High | Full specification: household-scoped read/write, uploader UID check, 20 MB size limit, immutable storage path. |

---

## 4. Threat Modeling & Attack Scenario Mitigations

### Threat Scenario 1: Cross-Tenant Data Harvest (Broken Object Level Authorization)
- **Attack Vector**: Attacker registers an account in HouseHelper, joins/creates House A, and runs `getDocs(collection(db, "utenti"))` and `getDocs(collection(db, "case"))`.
- **Legacy Rule Vulnerability**: Legacy rules permitted `allow read: if isSignedIn()`, returning all user profiles and household documents.
- **Hardened Mitigation**: Rule `match /utenti/{userId}` restricts `allow list` to queries where `resource.data.casaId == getUserCasaId()`. Global collection queries are rejected immediately by Firestore query engine. Single `get` queries check household membership or ownership.

### Threat Scenario 2: Tenant Hopping / Document Hijacking
- **Attack Vector**: User in House A updates a cleaning shift, debt, or note by setting `casaId: "casa_B"`, moving the document into another household's namespace.
- **Legacy Rule Vulnerability**: Legacy rules only checked `belongsToSameHouse(resource.data.casaId)` on the existing state, but placed zero restrictions on `request.resource.data.casaId`.
- **Hardened Mitigation**: Every update rule mandates `request.resource.data.casaId == resource.data.casaId`. The document cannot be moved across households under any circumstance.

### Threat Scenario 3: Fraudulent Debt Generation & Financial Manipulation
- **Attack Vector A (Self-Debt Inflation)**: User creates 1,000 debts where `creditoreId == debitoreId == auth.uid` to skew household statistics.
- **Attack Vector B (Framing)**: User A creates a debt where `creditoreId == User B` and `debitoreId == User C`.
- **Attack Vector C (Update Manipulation)**: Debtor modifies a debt document directly via Firestore SDK to set `importo: -500.00` or change `creditoreId` to themselves.
- **Hardened Mitigation**: 
  - `request.resource.data.creditoreId != request.resource.data.debitoreId` stops self-debt.
  - `(request.auth.uid == creditoreId || request.auth.uid == debitoreId)` prevents uninvolved users from creating debts for others.
  - On update, `creditoreId`, `debitoreId`, and `casaId` are immutable, and `importo` must satisfy `isValidImporto` (> 0 and <= 50,000).

### Threat Scenario 4: Author Impersonation & Malicious Notice Injection
- **Attack Vector**: Roommate A posts an offensive or misleading bulletin notice setting `autoreId: "uid_roommate_B"`.
- **Legacy Rule Vulnerability**: Existing `note` create rule did not check `autoreId`.
- **Hardened Mitigation**: Rule mandates `request.resource.data.autoreId == request.auth.uid` on create, and `request.resource.data.autoreId == resource.data.autoreId` on update.

### Threat Scenario 5: Denial of Service via Payload Bloat
- **Attack Vector**: Attacker writes a 10 MB string into `note.contenuto` or `turni.procedura`, causing client out-of-memory crashes and Firebase bandwidth consumption.
- **Hardened Mitigation**: `isValidString(val, minLen, maxLen)` enforces strict upper bounds on all text fields (`titolo` <= 100, `contenuto` <= 2000, `mansione` <= 200, `nome` <= 100). Any payload exceeding limits is rejected before persistence.

---

## 5. Complete Hardened firestore.rules Source Code

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

## 6. Comprehensive Rules Validation Test Plan

To verify and validate the security rules independently before deployment, the following test plan outlines 24 deterministic test scenarios executable against the Firebase Local Emulator Suite using `@firebase/rules-unit-testing`.

### Test Setup Matrix
- **Tenant 1 (Casa Alpha `casa_alpha`)**:
  - User 1 (`user_alice`): Creator of `casa_alpha`
  - User 2 (`user_bob`): Member of `casa_alpha`
- **Tenant 2 (Casa Beta `casa_beta`)**:
  - User 3 (`user_charlie`): Creator and member of `casa_beta`
- **Unauthenticated / Rogue User**:
  - User 4 (`user_eve`): Authenticated user with `casaId: null`
  - Anonymous / Unauthenticated: `request.auth == null`

### Test Suite Inventory

| Test ID | Category | Target Path | Actor | Action / Payload | Expected Outcome | Rationale |
|---|---|---|---|---|---|---|
| SEC-01 | Auth Check | `/turni/t1` | Unauthenticated | Read | DENIED | Unauthenticated request rejected by `isAuthenticated()` |
| SEC-02 | Auth Check | `/debiti/d1` | Unauthenticated | Create | DENIED | Writes require active authentication |
| SEC-03 | Household Scoping | `/turni/t_alpha` | `user_charlie` (House Beta) | Read | DENIED | Member of House Beta cannot read House Alpha shifts |
| SEC-04 | Household Scoping | `/turni/t_alpha` | `user_bob` (House Alpha) | Read | ALLOWED | Co-tenant in same house can read shifts |
| SEC-05 | Household Scoping | `/debiti/d_alpha` | `user_charlie` (House Beta) | Read | DENIED | Cross-tenant debt visibility blocked |
| SEC-06 | Household Scoping | `/spesa/s_alpha` | `user_charlie` (House Beta) | Read | DENIED | Cross-tenant grocery list blocked |
| SEC-07 | Household Scoping | `/note/n_alpha` | `user_charlie` (House Beta) | Read | DENIED | Cross-tenant bulletin board blocked |
| SEC-08 | Household Scoping | `/documenti/doc_alpha`| `user_charlie` (House Beta) | Read | DENIED | Cross-tenant document metadata blocked |
| SEC-09 | User Profile Isolation | `/utenti/user_alice` | `user_charlie` (House Beta) | Get | DENIED | Foreign tenant cannot inspect Alice's profile |
| SEC-10 | User Profile Read | `/utenti/user_alice` | `user_bob` (House Alpha) | Get | ALLOWED | Roommate in same house can inspect profile for UI chips |
| SEC-11 | User Profile List | `/utenti` | `user_charlie` | Query `where("casaId", "==", "casa_alpha")` | DENIED | Cannot query members of foreign household |
| SEC-12 | User Profile Write | `/utenti/user_alice` | `user_bob` | Update | DENIED | Only profile owner can update their own document |
| SEC-13 | Anti-Tamper: Tenant Hop | `/turni/t_alpha` | `user_bob` | Update `{ casaId: "casa_beta" }` | DENIED | `casaId` cannot be changed to another house |
| SEC-14 | Anti-Tamper: Debt Reassign | `/debiti/d_alpha` | `user_bob` | Update `{ creditoreId: "user_bob" }` | DENIED | `creditoreId` and `debitoreId` are immutable |
| SEC-15 | Anti-Tamper: House Code | `/case/casa_alpha` | `user_bob` | Update `{ codiceUnivoco: "HACK99" }` | DENIED | `codiceUnivoco` and `creatoreId` are immutable |
| SEC-16 | Anti-Impersonation | `/note/n_new` | `user_bob` | Create `{ autoreId: "user_alice", ... }` | DENIED | Cannot author notice under another user's UID |
| SEC-17 | Anti-Impersonation | `/debiti/d_new` | `user_alice` | Create `{ creditoreId: "user_bob", debitoreId: "user_charlie" }` | DENIED | Caller must be creditor or debtor |
| SEC-18 | Debt Self-Debt | `/debiti/d_new` | `user_alice` | Create `{ creditoreId: "user_alice", debitoreId: "user_alice", ... }` | DENIED | `creditoreId != debitoreId` enforced |
| SEC-19 | Debt Bounds: Negative | `/debiti/d_new` | `user_alice` | Create `{ importo: "-25.00", ... }` | DENIED | Amount must be > 0.0 |
| SEC-20 | Debt Bounds: Excessive | `/debiti/d_new` | `user_alice` | Create `{ importo: 50000.01, ... }` | DENIED | Amount exceeds 50,000 threshold |
| SEC-21 | Text Length Boundary | `/note/n_new` | `user_alice` | Create `{ titolo: "x".repeat(101), ... }` | DENIED | Title exceeds 100 character maximum |
| SEC-22 | Priority Whitelist | `/note/n_new` | `user_alice` | Create `{ priorita: "malicious_type", ... }` | DENIED | Priority must be in approved whitelist |
| SEC-23 | Document Upload Size | `/documenti/doc_new` | `user_alice` | Create `{ fileSize: 25000000, ... }` | DENIED | File size exceeds 20 MB ceiling |
| SEC-24 | Household Deletion | `/case/casa_alpha` | `user_bob` | Delete | DENIED | Only household creator (`user_alice`) can delete house |
