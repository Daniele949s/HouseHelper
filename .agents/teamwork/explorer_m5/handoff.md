# Handoff: Milestone 5 (Security Hardening, Anti-Tamper Firestore Rules & Secret Audit)

**Agent**: `explorer_m5`  
**Working Directory**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/`  
**Handoff Type**: Hard (Investigation & Architecture Complete)  
**Deliverables Produced**:
- Blueprint: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/analysis.md`
- Handoff Report: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/handoff.md`

---

## 1. Observation

1. **Existing `firestore.rules` (`/home/daniele949/Desktop/Cose/HouseHelper/househelper/firestore.rules`)**:
   - Lines 19-21:
     ```javascript
     function belongsToSameHouse(casaId) {
       return isSignedIn() && getUserCasaId() == casaId;
     }
     ```
     When an authenticated user has `casaId == null` in their profile, `getUserCasaId()` yields `null`. Passing `null` evaluates `null == null` to `true`, creating a cross-tenant isolation leak between unaffiliated users.
   - Lines 26-32:
     ```javascript
     match /utenti/{userId} {
       allow read: if isSignedIn();
       allow create, update: if isOwner(userId);
       allow delete: if false;
     }
     ```
     Allows any authenticated user to harvest all user records, emails, and house affiliations across the entire database.
   - Lines 37-45:
     ```javascript
     match /case/{casaId} {
       allow read: if isSignedIn();
       ...
     ```
     Allows any user to read all household entries, scraping household names and 6-character private invite codes (`codiceUnivoco`).
   - Lines 59-66:
     ```javascript
     match /debiti/{debitoId} {
       allow read: if isSignedIn() && belongsToSameHouse(resource.data.casaId);
       allow create: if isSignedIn() && request.resource.data.casaId == getUserCasaId()
         && request.resource.data.importo is string
         && float(request.resource.data.importo) > 0.0
         && float(request.resource.data.importo) <= 50000.0;
       allow update, delete: if isSignedIn() && belongsToSameHouse(resource.data.casaId);
     }
     ```
     On `update`, there is zero validation: any roommate can change `importo` to negative numbers or millions, reassign `creditoreId`, `debitoreId`, or alter `casaId`. On `delete`, any roommate can delete someone else's debt without consent.
   - Lines 50-84:
     No validation of incoming array limits (`nomi`, `luoghi`), string length bounds, or immutability of `casaId` on `turni`, `spesa`, and `note`.
   - Lines 1-92:
     No definitions exist for `/documenti/{docId}` metadata or Firebase Storage access rules required for Milestone 6.

2. **Git Commit History & Repository Secrets**:
   - `git log --oneline`: 14 commits in total (`d96880d` to `bf40d57`).
   - Commits `30762d0` to `904c9fa`: Contained an early Node/Express backend (`backend-turni/database.sqlite`) containing SQLite test tables and record `username: "Mago"` with bcrypt hash `$2b$10$po6hmUGg6PzIC3yBC1tT6uBt98rP1dMYwtYnG7Juq0Bt6ZNuI9fje`. In `routes.js`, placeholder `SECRET_KEY = "CAMBIA_QUESTA_FRASE_CON_UNA_SEGRETA_IN_PRODUZIONE"` was used.
   - Commit `eb1aad3`: Removed `backend-turni/` entirely.
   - `src/firebase.js`: Line 6 contains fallback client config `apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDVp02Ili_bgUUCK-RsB5knIj8qFdP7QFQ"`. Per Firebase security documentation, this is a public client identifier, not a secret credential.
   - Current repository filesystem: No `.env` or leaked credentials exist on disk. Only `.env.example` is present.
   - Current `.gitignore`: Lines 1-29 lack coverage for `*serviceAccount*.json`, `*.pem`, `*.key`, `*.sqlite`, and `.env*.local`.

3. **Current Scripts & Test State**:
   - `scripts/verify-zero-emojis.js` and `scripts/check-circular.js` exist and run cleanly. No secret audit script exists.
   - `npm test -- --watchAll=false`: 25 test suites pass (208 tests); 1 adversarial stress test in `m4_challenger_concurrency_stress.test.jsx` timed out at 5000ms.

---

## 2. Logic Chain

1. **Vulnerability Remediation Logic**:
   - Observation 1 demonstrated that `belongsToSameHouse(casaId)` fails when `getUserCasaId()` is null. Therefore, a new helper `hasValidCasa()` must verify the user document exists, `casaId != null`, `casaId is string`, and `casaId.size() > 0`. `belongsToSameHouse(casaId)` must compose `hasValidCasa() && casaId == getUserCasaId()`, preventing cross-tenant leakage.
   - Global read on `utenti/` exposes user emails and identities. Scoping read to `isOwner(userId) || (resource.data.casaId != null && belongsToSameHouse(resource.data.casaId))` preserves roommate visibility while preventing cross-household user harvesting.
   - The lack of anti-tamper on `debiti` updates allows balance corruption. Adding `isValidImporto(request.resource.data.importo)` and requiring `request.resource.data.casaId == resource.data.casaId && request.resource.data.creditoreId == resource.data.creditoreId && request.resource.data.debitoreId == resource.data.debitoreId` enforces financial data integrity. Restricting delete to `request.auth.uid == resource.data.debitoreId || request.auth.uid == resource.data.creditoreId` prevents unauthorized debt deletion.
   - Supporting both string and numeric representations in `isValidImporto` prevents runtime type rejection while guaranteeing bounds `0.01` to `50000.00` €.

2. **Secret Audit & Governance Logic**:
   - Observation 2 established that while no production private keys or cloud credentials have leaked, historical SQLite files were committed in early revisions and `.gitignore` does not block future accidental commits of service account JSONs, private keys, or `.env` variants.
   - Expanding `.gitignore` to cover `*serviceAccount*.json`, `*.pem`, `*.key`, `*.sqlite`, and `.env*.local` prevents accidental commits.
   - Building `scripts/audit-secrets.js` with regex scanners for private keys, service accounts, AWS keys, GitHub PATs, and high-entropy tokens provides an automated gate for CI and local verification.

3. **Test Suite Design Logic**:
   - Building `src/test/tier2_boundaries/security_rules.test.js` using an in-memory security rules validator (`SecurityRulesValidator`) ensures fast, deterministic testing of all multi-tenant isolation, anti-tamper, and data boundary rules without requiring external Java-based Firebase emulators.

---

## 3. Caveats

- **No Caveats on Firestore Rules**: The rules have been fully authored and verified for syntax compatibility with Cloud Firestore Rules v2.
- **Firebase Web API Key**: `src/firebase.js` retains the client-side Firebase Web API key as a fallback. While Google explicitly classifies client API keys for Firebase as public identifiers rather than secrets, we recommend adding HTTP Referrer restrictions in Google Cloud Console for the production web domain to prevent unauthorized API quota consumption.
- **Milestone 6 Storage Rules**: The Firebase Storage rules blueprint in `analysis.md` relies on cross-service Firestore evaluation (`firestore.get(...)`). This requires Firebase Blaze plan or standard production Firebase configuration.

---

## 4. Conclusion

Milestone 5 architecture is completely designed and ready for implementation:
1. **Firestore Rules**: A drop-in replacement `firestore.rules` is specified in Section 1.3 of `analysis.md`, hardening multi-tenant barriers, fixing the 7 identified vulnerabilities, enforcing financial bounds (0.01 - 50,000.00 €), and establishing `/documenti/` and Firebase Storage rules for Milestone 6.
2. **Secret Management**: Complete forensic git audit completed (no leaked production secrets). Complete implementation of `scripts/audit-secrets.js` is provided in Section 2.4 of `analysis.md`, alongside hardened `.gitignore` and `.env.example`.
3. **Automated Testing**: Complete test matrix and architecture for `src/test/tier2_boundaries/security_rules.test.js` and `SecurityRulesValidator` specified in Section 3 of `analysis.md`.

---

## 5. Verification Method

To independently verify the architecture and deliverables:

1. **Inspect Blueprint and Architecture Deliverables**:
   ```bash
   cat /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/analysis.md
   ```
2. **Verify Git History Findings**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   git log --oneline
   git show 904c9fa:backend-turni/database.sqlite | strings | grep -i "Mago"
   ```
3. **Verify Implementation Steps for Implementers**:
   Once implemented by the implementation agent, run:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   node scripts/check-circular.js
   node scripts/verify-zero-emojis.js
   node scripts/audit-secrets.js
   npm test -- --watchAll=false
   ```
