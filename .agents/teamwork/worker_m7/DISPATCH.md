## 2026-11-04T00:20:54Z
You are Worker 1 (worker_m7) for Milestone M7 of HouseHelper.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m7/
Your task is to implement all Milestone M7 features, write automated tests, run verification commands, and author a comprehensive handoff report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING BEFORE CODING:
1. User Request:
   /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
2. Scope Document:
   /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m7/SCOPE.md
3. Explorer Reports:
   - /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts/handoff.md
   - /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/handoff.md
   - /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_pwa_contacts/handoff.md

DETAILED IMPLEMENTATION INSTRUCTIONS:

1. R1: Finanza & Spese Intelligenti:
   - Create `src/utils/debtSimplification.js`:
     - Net balance accumulation in integer cents (`round(importo * 100)`) preventing floating point drift.
     - 2-phase Greedy Bipartite Matching with 1-to-1 exact matching pre-pass.
     - Fully cancels circular debts (A->B->C->A to 0 transactions) and transitive chains to at most N-1 transactions.
     - 4 split modes calculation helper (`calculateSplitAllocations`): Equal, Custom Fixed (sum === total check), Percentages (sum === 100% check with Hare-Niemeyer cent allocation), Exclusions.
   - Create `src/utils/reportExport.js`:
     - `exportExpensesToCsv`: CSV generation with `\uFEFF` UTF-8 BOM, RFC 4180 escaping, and CWE-1236 Formula Injection sanitization (`sanitizeCsvCell`).
     - `printMonthlyReport`: Clean printable HTML/CSS view invoking `window.print()` with `@media print` styling (zero heavy dependencies).
   - Update `src/pages/Debiti/ViewDebiti.js`:
     - Add Debt Simplification view panel showing minimum transactions to settle all debts.
     - Add monthly report export modal (PDF print & CSV download).
     - Maintain strict multi-tenant isolation.
   - Update `src/pages/Debiti/AggiungiDebito.js`:
     - Add split mode selector (Uguali, Importi fissi, Percentuali, Escludi membri).
     - Strict bounds validation (0.01 - 50,000 €), anti-tamper, and double-submit prevention.
     - Vector SVG / FontAwesome icons only (ZERO emojis).

2. R2: Automazione Turni & Manutenzione:
   - Create `src/utils/choreRotation.js`:
     - Deterministic round-robin rotation queue using household settings on `case/{casaId}.impostazioniTurni`.
     - `getAvailableRoommates` and `isUserOnVacation` filters.
   - Update `src/pages/homeUtente.js`:
     - Add Vacation / Away Mode ("In Vacanza / Fuori Casa") toggle with start/end date picker in user profile card, persisting to `utenti/{currentUser.uid}` (`inVacanza`, `vacanzaInizio`, `vacanzaFine`).
     - In-app notification/reminder banner for chores due <24h and new expenses with dismiss tracking.
     - Quick action link to Contatti.
   - Update `src/pages/TurniPulizia/aggiuntaTurno.js`:
     - Show vacation badge next to roommates on vacation and automatically exclude or warn when assigning chores.
   - Update `src/pages/TurniPulizia/viewTurni.js`:
     - Add sub-task checklist to each chore card with interactive checkboxes synced live to Firestore via atomic `updateDoc`.
     - Add manual / automatic rotation trigger respecting vacationing roommates.
     - Whole-house absence fallback banner if all roommates are on vacation.

3. R3: Rubrica Contatti Utili:
   - In `src/utils/security.js`:
     - Add `sanitizePhone`, `safeTelUrl`, `safeMailtoUrl`, and `sanitizeChecklist`.
   - Create `src/pages/Contatti/ViewContatti.js`:
     - Full contacts directory scoped to `userData.casaId` in Firestore collection `contatti`.
     - Contact fields: `nome`, `categoria` (Proprietario, Idraulico, Elettricista, Amministratore, Emergenza, Altro), `telefono`, `email`, `note`.
     - Action buttons: `safeTelUrl` (`tel:...`) and `safeMailtoUrl` (`mailto:...`).
     - Form to add and delete contacts with validation, sanitization, and double-click guard.
     - Modern card styling, zero emojis (FontAwesome vector icons only).
   - In `src/components/DesktopNavigation.js`:
     - Add Contatti link (`fa-address-book`, path: `/contatti`).
   - In `src/components/MobileNavigation.js`:
     - Add Contatti link (`fa-address-book`, path: `/contatti`).
   - In `src/App.js`:
     - Add route `/contatti` under `<HouseProtectedRoute>`.
     - Apply `React.lazy` with `<Suspense fallback={<LoadingSpinner />}>` for secondary routes (`/contatti`, `/documenti`, `/calendario`, `/bacheca`, `/debiti`).

4. R4: Esperienza Mobile & PWA:
   - Create `public/sw.js`:
     - Service worker caching static app shell (HTML, CSS, JS, icons) and navigation fallback.
   - Create `src/serviceWorkerRegistration.js`:
     - PWA registration helper.
   - Update `public/manifest.json`:
     - Ensure valid manifest with standalone display, name, short_name, icons, theme_color.
   - Create `src/utils/offlineStorage.js`:
     - Client-side storage scoped by `casaId` (`hh_offline_${casaId}_...`).
     - Safe fallback caching for loaded lists.
   - Update `src/contexts/AuthContext.js`:
     - On logout, immediately purge tenant offline storage (`purgeAllOfflineStorage()` or `purgeTenantStorage(casaId)`) to prevent cross-user data leakage.

5. R6 & R7: Sicurezza Applicativa & Vincoli:
   - Update `firestore.rules`:
     - Add rules for `/contatti/{contattoId}` matching `belongsToSameHouse(resource.data.casaId)`.
     - Allow updating `case` with `impostazioniTurni`.
     - Allow updating `utenti` with `inVacanza`, `vacanzaInizio`, `vacanzaFine`.
     - Allow updating `turni` with `checklist` and `completato`.
   - Apply double-submit prevention (`isSubmitting` state / disabled button) on all form submissions.
   - Update `PROJECT.md` at root to document Milestone M7 and its completed features.

6. Testing & Mock Harness:
   - Update `src/test/mockFirebase.js` to support collection `contatti`.
   - Update `src/setupTests.js` to mock `URL.createObjectURL`, `URL.revokeObjectURL`, and `window.print`.
   - Update `src/components/DesktopNavigation.test.jsx` (expecting 8 links instead of 7).
   - Author new automated test suites:
     - `src/test/tier1_features/contatti.test.js`: CRUD, validation, tel/mailto link safety.
     - `src/test/tier2_boundaries/debt_simplification.test.js`: Debt simplification algorithm unit tests, circular debt cancellation, cent precision, 4 split modes calculations and boundary checks.
     - `src/test/tier2_boundaries/chore_automation.test.js`: Rotation algorithm, vacation mode dates and filtering, checklist toggle and sanitization.
     - `src/test/tier3_interactions/pwa_offline.test.js`: Multi-tenant offline cache isolation, logout purge, export sanitization.

7. Mandatory Verification Commands (MUST BE RUN AND REPORTED):
   - `CI=true npm test -- --watchAll=false` (ALL existing 30 suites + new suites MUST PASS, 100% pass)
   - `npm run build` (MUST succeed without errors)
   - `npm run check:circular` (MUST report 0 cycles)
   - `npm run check:emojis` (MUST report 0 violations)
   - `npm run audit:secrets` (MUST report 0 secrets)

OUTPUT REQUIREMENTS:
Write your complete handoff report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m7/handoff.md`
Report the exact command outputs for all 5 verification checks.
When finished, send a message to the orchestrator.

## 2026-11-04T00:37:16Z
**Context**: Milestone M7 implementation progress
**Content**: Checking in on your status for Milestone M7 features implementation and verification. Please report which modules have been implemented and your current verification state.
**Action**: Send a brief status update or completion handoff.

