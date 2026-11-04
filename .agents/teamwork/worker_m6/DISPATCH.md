## 2026-11-03T14:52:48Z
You are the Milestone M6 Implementation Worker.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m6/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md located at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md

Also read the 3 explorer handoff reports:
- Storage & Security Rules Explorer: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_storage/handoff.md
- UI & Ergonomics Explorer: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui/handoff.md
- Test & Mock Harness Explorer: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_test/handoff.md
Also read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m6/SCOPE.md

Your exclusive write ownership covers the following files:
1. `storage.rules`: Create at repo root with version 2 multi-tenant isolation scoped to `case/{casaId}/documenti/{allPaths=**}`, cross-service Firestore lookup `firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid))`, <= 15MB file size, MIME whitelist, and immutability (`allow update: if false;`).
2. `src/firebase.js`: Import `getStorage` from `firebase/storage` and export `export const storage = getStorage(app);`.
3. `src/services/documentiService.js`: Implement client validation (size <= 15MB, MIME checking), safe filename sanitization, upload with dual-key aliases (`url`/`fileUrl`, `dimensione`/`dimensioneBytes`), rollback on failure, deletion, and listing.
4. `src/pages/Documenti/ViewDocumenti.js`: Implement complete Documents page:
   - Zero emojis! Use ONLY FontAwesome 5 vector icons (`fa-folder-open`, `fa-cloud-upload-alt`, `fa-file-pdf`, `fa-trash-alt`, `fa-download`, `fa-eye`, etc.).
   - Category filtering pills (Tutti, Contratti, Bollette, Garanzie, Ricevute, Altro), search input, sorting.
   - Upload card with drag & drop and file input.
   - Responsive cards and desktop table view.
   - Actions with `showToast` and `showConfirm` from `src/utils/feedback.js`.
   - DO NOT import `App.css` (avoids circular dependency).
5. `src/App.js`: Register `/documenti` route inside `<Route element={<HouseProtectedRoute />}>` importing `ViewDocumenti`.
6. `src/components/DesktopNavigation.js`: Add `{ label: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false }`.
7. `src/components/MobileNavigation.js`: Add `{ label: "Documenti & Contratti", icon: "fa-folder-open", path: "/documenti" }`.
8. `src/pages/homeUtente.js`: Add 6th shortcut button for Documenti in `.bento-services`.
9. `src/App.css`: Add touch target enhancements (>= 44px min-width/min-height for `.burger-container`, `.mobile-close-btn`, `.theme-pill-toggle`), universal `:focus-visible` ring, and styles for `.documents-container`, `.doc-dropzone`, `.doc-filter-pills`, `.doc-grid`, `.doc-card`, `.doc-table`, etc.
10. `src/test/mockFirebase.js`: Implement `MockStorageStore`, `storageMock`, add `this.storageFiles = {}` and `this.collections.documenti = {}`, reset, and export `storage: { _isMockStorage: true }` in `appFirebaseMock`.
11. `src/setupTests.js`: Add `jest.mock('firebase/storage', () => require('./test/mockFirebase').storageMock);`.
12. `src/test/testUtils.jsx`: Add `documenti: []` to `seedHousehold` and export `createMockFile(name, size, type)` helper.
13. `src/components/DesktopNavigation.test.jsx`: Update expected link count from 6 to 7 and assert "Documenti".
14. New test suites:
    - `src/test/tier1_features/documenti.test.jsx`: Tests T1.27 - T1.33.
    - `src/test/tier2_boundaries/documenti_boundary.test.jsx`: Tests T2.24 - T2.31.
    - `src/test/tier2_boundaries/security_rules.test.js`: Add SEC-14 for `storage.rules` assertions & evaluation without breaking pre-existing M5 assertions.
    - `src/test/tier3_interactions/cross_feature.test.jsx`: Add document interaction tests.
    - `src/test/tier4_scenarios/household_lifecycle.test.jsx`: Add multi-roommate document lifecycle scenario.

VERIFICATION REQUIREMENTS:
Run all verification commands directly and document commands and exact outputs in your handoff report:
1. `node scripts/verify-zero-emojis.js` -> 0 violations
2. `node scripts/check-circular.js` -> 0 cycles
3. `node scripts/audit-secrets.js` -> 0 secrets
4. `CI=true npm test -- --watchAll=false` -> 100% pass rate across all suites
5. `npm run build` -> 0 build errors

Write your complete handoff report following the 5-component Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method) to:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m6/handoff.md

Update your `progress.md` after each meaningful step. When done, notify the orchestrator via send_message.


## 2026-11-03T15:03:31Z
**Context**: Milestone M6 Implementation Status Query
**Content**: Checking in on implementation progress across Phases 1-8. Please provide a brief status update on your current step.
**Action**: Reply with your current progress and next steps.


## 2026-11-03T15:04:42Z
**Context**: Milestone M6 Implementation Standby
**Content**: Great progress confirmed. Standing by while you complete test suites, run verification checks, and author handoff.md.
**Action**: Notify when handoff is ready.
