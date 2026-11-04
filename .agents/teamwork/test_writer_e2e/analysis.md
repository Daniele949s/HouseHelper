# Analysis — E2E Testing Track (HouseHelper Modernization)

**Date**: 2026-11-02  
**Author**: `test_writer_e2e` (specialist, qa)  
**Target Application**: HouseHelper (React 19 + Firebase v12 Modernization)  

---

## 1. Executive Summary

We designed, implemented, and executed a comprehensive, multi-tiered opaque-box test suite covering 100% of the features outlined in `PROJECT.md` and `ORIGINAL_REQUEST.md`. The suite operates completely decoupled from live network or Firebase cloud infrastructure through a deterministic, in-memory Firestore and Auth emulation harness.

The total suite contains **91 automated tests** across 14 test suites, all passing with zero failures in under 3 seconds on Node.js/Jest:
- **Tier 1 (Feature Coverage)**: 33 tests across 5 core domains (Auth/House, Turni, Debiti, Spesa, Bacheca/Calendario) verifying all happy paths and interface contracts.
- **Tier 2 (Boundary & Corner Cases)**: 29 tests verifying negative inputs, validation boundaries, input sanitization, and multi-tenant security isolation.
- **Tier 3 (Cross-Feature Combinations)**: 5 tests verifying cross-domain interactions (expense splits -> dashboard net balance, cleaning shifts -> next chore alert, roommate onboarding -> split ratio, bulletin alerts -> dashboard notification, debt settlement -> parity balance).
- **Tier 4 (Real-World Workloads)**: 4 end-to-end lifecycle scenarios simulating multi-roommate onboarding, weekly shift scheduling & rescheduling, grocery store trip with auto-splitting and debt settlement, and household departure with route-guard enforcement.
- **Unit / Utility Tests**: 20 pre-existing tests (`App.test.js`, `security.test.js`).

---

## 2. Test Harness Architecture & Design Decisions

### A. Headless Firestore & Auth Mock Harness (`src/test/mockFirebase.js`)
- **State Emulation**: Maintained an in-memory document store partitioned by collection (`utenti`, `case`, `turni`, `debiti`, `spesa`, `note`).
- **Synchronous vs Asynchronous Auth Dispatch**: To prevent microtask race conditions in React 19 testing environments where state updates occurred outside render batches, `onAuthStateChanged` was designed to synchronously notify active subscribers with the current user state, eliminating teardown warnings and act dispatch anomalies.
- **Query Flexibility**: Emulated Firebase query filtering with support for operators `==`, `!=`, `>`, `<`, `>=`, `<=`, and `array-contains`, accurately mirroring Firestore's filtering semantics.
- **Multi-Tenant State Isolation**: Implemented `mockStore.reset()` invoked in `beforeEach` to guarantee absolute state independence between tests.

### B. Environment Polyfills & Stubs (`src/setupTests.js`)
- **HTML5 Canvas 2D**: Provided full method stubs for `getContext('2d')` (`fillRect`, `clearRect`, `beginPath`, `arc`, `fill`, etc.) enabling `MiniGuy.js` and `Celebration.js` to render without error in headless JSDOM.
- **Animation Frame Lifecycle**: Intercepted `requestAnimationFrame` to advance virtual timestamps past the 2200ms expiration threshold of `Celebration.js`, ensuring particle animations terminate cleanly without lingering timers hanging Jest workers.
- **DOM & Browser API Polyfills**: Polyfilled `navigator.clipboard.writeText`, `window.matchMedia`, `window.alert`, `window.confirm`, `window.scrollTo`, and element pointer capture methods.
- **Router Mocking**: Provided an in-memory router mock providing spyable navigation (`useNavigate`, `useLocation`, `useParams`, `MemoryRouter`, `Navigate`, `Outlet`).

### C. Provider Rendering Utility (`src/test/testUtils.jsx`)
- Wrapped tested components in `ThemeProvider`, `AuthProvider`, and `MemoryRouter`.
- Provided a declarative `seedHousehold(...)` helper that injects households, multiple roommate profiles, cleaning shifts, debt ledgers, and grocery items into the store prior to test rendering.

---

## 3. Tier Coverage & Validation Strategy

### Tier 1: Feature Coverage (Primary Paths)
- **Auth & House Setup** (8 tests): Covered landing navigation, registration form submission, email/password login routing (with household vs. homeless), Google popup sign-in, household creation with 6-char code generation, joining via invite code, and sign-out.
- **Cleaning Shifts** (6 tests): Verified empty states, chronological ordering of shift cards, shift creation, field editing, shift deletion, and multi-assignee representation.
- **Debts & Expenses** (6 tests): Tested zero balance ("In pari"), positive balance ("Sei in credito"), negative balance ("Sei in debito"), single-debt addition, automated 3-way equal split calculation, and debt mark-as-settled.
- **Grocery List** (6 tests): Verified empty list feedback, counter badge metrics ("Da comprare", "Presi"), item addition, bought toggle with strike-through styling, item deletion, and priority sorting.
- **Bulletin Board & Calendar** (7 tests): Covered announcements display, author-exclusive controls, author deletion, note creation, note editing, monthly calendar view, and date-specific event creation.

### Tier 2: Boundary, Validation & Security
- **Auth & House** (6 tests): Enforced username min length (<2 chars), password security (<6 chars), email syntax regex, non-existent invite code error handling, code sanitization (space removal and uppercase normalization), and empty house name rejection.
- **Cleaning Shifts** (6 tests): Validated empty assignee rejection, year upper bound (>2100), year lower bound (<2020), cross-tenant edit rejection, empty room rejection, and non-existent shift ID rejection.
- **Debts & Expenses** (6 tests): Validated zero amount (<0.01 €), negative amounts, maximum cap (>50,000 €), decimal precision (>2 decimal digits), self-debt prevention (creditor == debtor), and 1-member equal split prohibition.
- **Grocery List** (5 tests): Tested whitespace trimming/rejection, 80-char truncation, cross-tenant toggle isolation, cross-tenant deletion isolation, and script/HTML tag stripping.
- **Bulletin Board & Calendar** (6 tests): Verified hiding action buttons from non-authors, blocking unauthorized direct edit routes, cross-tenant note update rejection, empty note title rejection, date range limits (2020–2100), and HTML tag stripping from notice descriptions.

### Tier 3: Cross-Feature Interactions
- Validated state synchronization across feature boundaries:
  - Splitting an expense across roommates immediately updates the creditor's dashboard net balance widget.
  - Adding a future chore immediately surfaces in the Home dashboard's "Prossimo Turno" card.
  - Onboarding a new roommate automatically increases the equal-split denominator for subsequent expenses.
  - Posting a notice updates the Home dashboard's communication alert banner.
  - Settling a debt resets the debtor's balance to zero and removes the obligation from the creditor's ledger.

### Tier 4: Real-World Multi-User Scenarios
- **T4.01 (Multi-Roommate Apartment Onboarding)**: End-to-end journey from Elena creating "Casa Garibaldi 12", Marco and Sofia joining via invite code, and Elena copying the code to the clipboard.
- **T4.02 (Cleaning Schedule Rotation Workload)**: Elena schedules shifts for Marco and Sofia; Sofia modifies her assigned time slot; Marco reviews the complete schedule.
- **T4.03 (Grocery Trip, Split, and Settlement)**: Sofia marks items bought at the supermarket, inputs the 45.00 € total bill split 3 ways, Marco checks his -15.00 € debt on his dashboard, settles it in ViewDebiti, and Sofia's credit drops to +15.00 €.
- **T4.04 (Departure & Route Guard Protection)**: Marco leaves the household from his dashboard. His association is cleared in Firestore, and subsequent navigation to `/turni` is intercepted by `HouseProtectedRoute` and redirected to `/scelta-casa`.

---

## 4. Observations & Non-Blocking Notes

1. **DOM Property Warning (`stop-color`)**:
   `InteractiveMascot` uses SVG `<stop>` with `stop-color` rather than `stopColor`. React 19 logs a console error in DEV mode. Tests pass without issue.
2. **Double Alert Rendering in `SceltaCasa`**:
   Error messages appear in both the mascot speech bubble and the card alert container. Using `findAllByText` reliably handles both instances.
3. **Multi-Step DOM Cleanup**:
   Multi-step lifecycle tests in Tier 4 require explicit `cleanup()` between steps to prevent DOM accumulation from previous component renders.
