# BRIEFING — 2026-11-03T15:48:30Z

## Mission
Investigate Firebase Storage configuration, storage.rules, and Firestore metadata schema for Milestone M6 (Household Document Management).

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, storage architecture analysis, security rules specification
- Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_storage/
- Original parent: 3ee71a4c-9e4f-4922-b970-a55d69932d6e
- Milestone: M6

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Multi-tenant isolation scoped strictly to `casaId`
- Storage rules version 2
- Max file size <= 15MB
- Handoff report in 5-component format to `handoff.md`

## Current Parent
- Conversation ID: 3ee71a4c-9e4f-4922-b970-a55d69932d6e
- Updated: 2026-11-03T15:48:30Z

## Investigation State
- **Explored paths**:
  - `src/firebase.js`: Storage bucket already configured, but `getStorage` not initialized/exported.
  - `firestore.rules`: Section 7 exists with `match /documenti/{docId}`; draft storage rules commented at bottom.
  - `src/test/tier2_boundaries/security_rules.test.js`: Confirmed assertions enforcing `match /documenti/{docId}`, `26214400`, and `'FIREBASE STORAGE RULES SPECIFICATION'`.
  - `src/test/mockFirebase.js` & `src/setupTests.js`: Firestore and Auth mocked, need `storageMock` with `ref`, `uploadBytes`, `getDownloadURL`, `deleteObject`, `listAll`.
  - `src/utils/security.js`: Validated sanitization primitives.
  - `src/App.js`, `DesktopNavigation.js`, `MobileNavigation.js`: Route and nav integration mapped.
- **Key findings**:
  - Top-level `documenti` collection with `casaId` field is required by existing M5 test suite `security_rules.test.js` (line 1042). Dual-key schema (`url` and `fileUrl`, `dimensione` and `dimensioneBytes`) guarantees 100% backward test compatibility while fulfilling M6 requirements.
  - Storage security rules version 2 with cross-service `firestore.get` securely validates household membership against `/databases/(default)/documents/utenti/$(request.auth.uid)`.
  - Strict 15MB size limit (`request.resource.size <= 15 * 1024 * 1024`) and safe MIME-type whitelist.
- **Unexplored areas**: None. Ready for handoff synthesis.

## Key Decisions Made
- Use dual-key compatibility for metadata schema (`url` + `fileUrl`, `dimensione` + `dimensioneBytes`) to satisfy M6 prompt without breaking M5 security tests.
- Path structure in Storage: `/case/{casaId}/documenti/{allPaths=**}` with `{allPaths=**}` wildcard for maximum flexibility.
- Define dedicated service module `src/services/documentiService.js`.

## Artifact Index
- DISPATCH.md — Received dispatch instructions
- BRIEFING.md — Working memory and findings summary
- progress.md — Liveness tracker
- handoff.md — Comprehensive 5-component handoff report
