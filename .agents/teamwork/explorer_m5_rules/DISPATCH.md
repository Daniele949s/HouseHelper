# Dispatch: Explorer M5 Rules (Firestore Security Rules Hardening)

## Mission
Conduct a deep architectural and security audit of `firestore.rules` and produce a hardened, production-ready specification that enforces strict household-scoped data access, anti-tamper validation, and input sanitization across all collections.

## Input Documents
- Original Request: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project Blueprint: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md`
- Current `firestore.rules` at project root
- Collection schemas used across `src/pages/**` and `src/test/mockFirebase.js`

## Key Requirements to Investigate and Specify
1. Authentication & Household Scoping:
   - Ensure all operations require authentication (`request.auth != null`).
   - Restrict read/write on household collections (`turni`, `debiti`, `spesa`, `note`, and `documenti`) strictly to authenticated members of that household (`casaId`).
   - User profile rules (`utenti/{userId}`): Users can only write their own profile (`request.auth.uid == userId`). Roommates sharing the same `casaId` can read profiles to view roommate names and assignments.
   - Household document rules (`case/{casaId}`): Creation allows authenticated user; joining allows valid invite code; reading/updating restricted to household members; deletion restricted to creator.
2. Anti-Tamper Validation:
   - Prohibit updating immutable fields: `casaId`, `creatoreId`, `autoreId`, `timestamp`, `dataCreazione`.
   - Prevent self-debts in `debiti`: `request.resource.data.creditoreId != request.resource.data.debitoreId`.
   - Numeric constraints: `debiti.importo` must be > 0 and <= 50,000; quota checks.
3. Input Sanitization & Schema Bounds:
   - String length bounds (e.g., titles <= 80 chars, notes <= 1500 chars).
   - Category / status whitelisting (e.g. note priorities: 'urgente'|'importante'|'promemoria'|'info'; grocery status: boolean; debt status: 'in sospeso'|'saldato').
4. Document a complete, production-ready `firestore.rules` code blueprint and validation test cases.

## Output Requirements
Write `analysis.md` and `handoff.md` in `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_rules/` with:
- Audit of current rules vs required constraints
- Full production `firestore.rules` code
- Verification plan
Notify orchestrator via send_message when complete.


## 2026-11-03T13:04:38Z
You are explorer_m5_rules, a read-only exploration agent (teamwork_explorer).
Your working directory is /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_rules/
The project root is /home/daniele949/Desktop/Cose/HouseHelper/househelper

MANDATORY FIRST STEP: Read /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_rules/DISPATCH.md and /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md.

Task:
Perform a deep security audit of firestore.rules and design hardened, production-ready security rules satisfying Requirement R3:
1. Examine existing firestore.rules at project root.
2. Examine collections and data schemas across src/pages/**, src/utils/security.js, and src/test/mockFirebase.js:
   - case (codiceUnivoco, nome, creatoreId, membri, dataCreazione)
   - utenti (nome, email, casaId, dataRegistrazione)
   - turni (casaId, nome, data, fascia, completato, note, assegnatoA, zona)
   - debiti (casaId, creditoreId, debitoreId, creditoreNome, debitoreNome, importo, descrizione, stato, data)
   - spesa (casaId, nome, comprato, quantita, categoria, dataAggiunta)
   - note (casaId, titolo, contenuto, priorita, autoreId, autoreNome, data, dataScadenza)
   - documenti (casaId, titolo, categoria, fileUrl, storagePath, fileType, fileSize, caricatoDa, caricatoDaNome, dataCaricamento)
3. Audit security vulnerabilities in existing rules:
   - Missing authentication checks
   - Cross-household data leakage / tenant cross-talk
   - Impersonation and unauthorized modifications
   - Missing anti-tamper constraints (altering immutable fields like casaId, autoreId, creatoreId)
   - Missing debt validation (preventing self-debt, negative or excessive amounts)
   - Unbounded string fields (XSS/DDoS injection risks)
4. Design complete, copy-paste-ready firestore.rules implementing:
   - Helper functions: isAuthenticated(), isOwner(userId), getUserCasaId(), isMemberOfHousehold(casaId)
   - Strict read/write scoping to household members
   - Anti-tamper rules for each collection
   - Input sanitization and boundary constraints

Deliverables:
Write analysis.md and handoff.md in /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_rules/ containing:
- Gap analysis table
- Complete, production-ready firestore.rules code
- Test plan for validating the rules
Then send a message to orchestrator with your findings.
