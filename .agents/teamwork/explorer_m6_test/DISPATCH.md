## 2026-11-03T14:41:06Z
You are a read-only exploration agent.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_test/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md located at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md

Also read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m6/SCOPE.md

Your Task: Technical investigation of Testing & Mock Firebase Storage harness for Milestone M6.
Investigate:
1. `src/test/mockFirebase.js` and `src/test/testUtils.jsx`:
   - Inspect existing Firestore, Auth, and mock implementations.
   - Design the in-memory Firebase Storage mock architecture (`getStorage`, `ref`, `uploadBytes`, `getDownloadURL`, `deleteObject`, `listAll`, etc.) so that tests can upload files, retrieve URLs, delete files, and test household isolation without hitting real network.
2. Existing test suites across `src/test/tier1_features/`, `src/test/tier2_boundaries/`, `src/test/tier3_interactions/`, `src/test/tier4_scenarios/`, and any component tests.
   - Check test coverage and how test files are named and organized.
   - Specify new test suites needed for M6 (e.g. `src/test/tier1_features/documenti.test.js` or unit/integration test files) covering:
     - Document upload flow (valid file, category, metadata).
     - Document retrieval and category filtering.
     - Document deletion and state cleanup.
     - Access control / household scoping (`casaId` boundaries).
     - Edge cases (large file rejection, invalid mime types, missing fields).
3. Verification scripts:
   - Check `scripts/verify-zero-emojis.js`, `scripts/check-circular.js`, `scripts/audit-secrets.js`.
   - Ensure the new files (`ViewDocumenti.js`, navigation changes, mock changes, storage.rules) will pass all scripts cleanly with 0 violations.

Do NOT modify any code. Write your complete handoff report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_test/handoff.md`

Update your `progress.md` with timestamps as you proceed. When finished, send a message to the orchestrator with your findings and path to handoff.md.
