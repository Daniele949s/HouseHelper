# HouseHelper Automated Test Suite Summary (TEST_READY)

**Status**: ALL TESTS PASSING (100% Success)  
**Execution Date**: 2026-11-02  
**Test Framework**: Jest 27 + React Testing Library (React 19, react-scripts 5.0.1)  
**Total Test Suites**: 14 passing (14 total)  
**Total Tests**: 91 passing (91 total)  
**Total Execution Time**: ~2.7 seconds  

---

## 1. Quick Start / Test Execution Command

To run the complete test suite across all tiers:

```bash
cd /home/daniele949/Desktop/Cose/HouseHelper/househelper && npm test -- --watchAll=false
```

To run individual tiers:

```bash
# Tier 1: Feature Coverage Suites
npm test src/test/tier1_features -- --watchAll=false

# Tier 2: Boundary & Corner Cases Suites
npm test src/test/tier2_boundaries -- --watchAll=false

# Tier 3: Cross-Feature Interactions
npm test src/test/tier3_interactions -- --watchAll=false

# Tier 4: Real-World Workload Scenarios
npm test src/test/tier4_scenarios -- --watchAll=false

# Pre-existing Security Unit Tests
npm test src/utils/security.test.js -- --watchAll=false
```

---

## 2. Test Architecture & Harness

- **Headless In-Memory Firestore & Auth Harness**: `src/test/mockFirebase.js`  
  Provides zero-latency, deterministic emulation of Firestore collections (`utenti`, `case`, `turni`, `debiti`, `spesa`, `note`), multi-condition queries (`query`, `where`), real-time observer dispatch (`onAuthStateChanged`), and Auth operations (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signInWithPopup`, `signOut`).
- **Provider Wrapper & Seeding**: `src/test/testUtils.jsx`  
  Renders components enclosed in `ThemeProvider`, `AuthProvider`, and `MemoryRouter`. Includes `seedHousehold` helper for multi-roommate state fixtures.
- **Global Environment Polyfills & Stubs**: `src/setupTests.js`  
  Simulates HTML5 Canvas 2D rendering contexts (`MiniGuy`), non-looping `requestAnimationFrame` (`Celebration`), `navigator.clipboard`, `window.matchMedia`, `window.confirm`, `window.alert`, and ESM `react-calendar`.

---

## 3. Tier Inventory and Coverage Matrix

### Tier 1 — Feature Coverage (33 Tests)
Verifies primary happy paths and core operational requirements across all five feature areas (minimum 5 tests per area required):

1. **Authentication & Household Setup** (`src/test/tier1_features/auth_house.test.jsx` - 8 tests):
   - `T1.01`: Landing page welcome banner & entry buttons
   - `T1.02`: User registration and routing to household onboarding
   - `T1.03`: User login with assigned household routing to Home dashboard
   - `T1.04`: User login without household routing to household onboarding
   - `T1.05`: Google Popup single-sign-on
   - `T1.06`: Household creation with 6-character alphanumeric code generation
   - `T1.07`: Household joining via valid invite code
   - `T1.08`: Account sign-out clearing session and returning to landing

2. **Cleaning Shifts (Turni)** (`src/test/tier1_features/turni.test.jsx` - 6 tests):
   - `T1.09`: Empty cleaning schedule notice & add shift link
   - `T1.10`: Cleaning schedule list rendering in chronological order
   - `T1.11`: Action button routing to shift creation form
   - `T1.12`: Creation and persistence of new chore shift
   - `T1.13`: Editing shift timeslot, room, and assignment
   - `T1.14`: Deletion of assigned shift with confirmation prompt

3. **Debts & Expenses (Debiti)** (`src/test/tier1_features/debiti.test.jsx` - 6 tests):
   - `T1.15`: Parity net balance state (0.00 € / In pari)
   - `T1.16`: Positive net balance (+25.00 € / Sei in credito)
   - `T1.17`: Negative net balance (-18.50 € / Sei in debito)
   - `T1.18`: Debt settlement removing obligation and updating balance
   - `T1.19`: Creation of single debtor-creditor expense record
   - `T1.20`: Automated equal split expense distribution across all roommates

4. **Grocery List (Spesa)** (`src/test/tier1_features/spesa.test.jsx` - 6 tests):
   - `T1.21`: Empty grocery list state with motivational prompt
   - `T1.22`: Grocery summary badge counters ("Da comprare" / "Presi")
   - `T1.23`: Adding new grocery item to household list
   - `T1.24`: Toggling grocery item status between pending and purchased
   - `T1.25`: Deleting grocery item from household list
   - `T1.26`: Sorting pending items before purchased items

5. **Bulletin Board & Calendar (Bacheca & Calendario)** (`src/test/tier1_features/bacheca_calendario.test.jsx` - 7 tests):
   - `T1.27`: Empty bulletin board notice
   - `T1.28`: Author-only action controls (Edit/Delete hidden from non-authors)
   - `T1.29`: Author deletion of announcement with confirmation prompt
   - `T1.30`: Creation of bulletin announcement with date & content
   - `T1.31`: Editing announcement title and message body
   - `T1.32`: Interactive calendar agenda display with scheduled items
   - `T1.33`: Creation of calendar event for specific date

---

### Tier 2 — Boundary, Validation & Security Corner Cases (29 Tests)
Rigorous negative testing, input sanitization boundaries, and multi-tenant authorization guards (minimum 5 tests per area required):

1. **Auth & Household Boundaries** (`src/test/tier2_boundaries/auth_house_boundary.test.jsx` - 6 tests):
   - `T2.01`: Username validation (< 2 characters rejected)
   - `T2.02`: Password security boundary (< 6 characters rejected)
   - `T2.03`: Malformed email address rejection
   - `T2.04`: Non-existent household invite code error handling
   - `T2.05`: Invite code whitespace trimming and uppercase normalization
   - `T2.06`: Empty household name rejection

2. **Cleaning Shifts Boundaries** (`src/test/tier2_boundaries/turni_boundary.test.jsx` - 6 tests):
   - `T2.07`: Empty assignee field rejection
   - `T2.08`: Upper year boundary validation (years > 2100 rejected)
   - `T2.09`: Lower year boundary validation (years < 2020 rejected)
   - `T2.10`: Multi-tenant authorization guard (cross-household shift edits blocked)
   - `T2.11`: Empty cleaning zone/room specification rejected
   - `T2.12`: Non-existent shift document error handling

3. **Debts & Expenses Boundaries** (`src/test/tier2_boundaries/debiti_boundary.test.jsx` - 6 tests):
   - `T2.13`: Zero-amount expense rejection (min 0.01 €)
   - `T2.14`: Negative amount rejection
   - `T2.15`: Maximum allowable expense boundary (> 50,000 € rejected)
   - `T2.16`: Currency decimal precision enforcement (> 2 decimals rejected)
   - `T2.17`: Self-debt prevention (creditor cannot be the debtor)
   - `T2.18`: Equal split with only 1 household member blocked

4. **Grocery Boundaries** (`src/test/tier2_boundaries/spesa_boundary.test.jsx` - 5 tests):
   - `T2.19`: Whitespace-only grocery item submission rejected
   - `T2.20`: String length truncation boundary (max 80 characters)
   - `T2.21`: Multi-tenant item toggle isolation across households
   - `T2.22`: Multi-tenant deletion isolation across households
   - `T2.23`: Input HTML tag sanitization and script stripping

5. **Bulletin Board & Calendar Boundaries** (`src/test/tier2_boundaries/bacheca_calendario_boundary.test.jsx` - 6 tests):
   - `T2.24`: UI permission guard (non-author action buttons concealed)
   - `T2.25`: Route authorization guard (non-author direct access rejected)
   - `T2.26`: Multi-tenant announcement update isolation
   - `T2.27`: Empty announcement title rejected
   - `T2.28`: Date boundary validation (years outside 2020–2100 rejected)
   - `T2.29`: HTML and script tag stripping from announcement content

---

### Tier 3 — Cross-Feature Integration (5 Tests)
Verifies multi-module interactions where actions in one feature domain synchronously reflect in another (`src/test/tier3_interactions/cross_feature.test.jsx`):

- `T3.01`: Submitting an equal-split expense updates both the debt ledger and the creditor's dashboard net balance widget.
- `T3.02`: Scheduling a new cleaning shift updates the Home dashboard's "Prossimo Turno" card in real-time.
- `T3.03`: Onboarding a new roommate automatically recalculates the equal-split denominator for subsequent expenses.
- `T3.04`: Publishing a bulletin announcement reflects immediately on the Home dashboard's latest communication alert.
- `T3.05`: Settling an outstanding debt updates the debtor's balance back to parity (0.00 €) and removes the obligation from the creditor's ledger.

---

### Tier 4 — Realistic Household Workload Scenarios (4 Tests)
End-to-end multi-user lifecycle workflows covering entire tenant journeys (`src/test/tier4_scenarios/household_lifecycle.test.jsx`):

- `T4.01`: **Multi-Roommate Apartment Onboarding Lifecycle**: Elena registers, creates "Casa Garibaldi 12", generates invite code, Marco and Sofia register and join using the code, and Elena shares the code via clipboard.
- `T4.02`: **Weekly Household Cleaning Schedule & Shift Rotation Workload**: Elena assigns Monday chore to Marco, Wednesday chore to Sofia, Sofia reschedules her timeslot to evening, and Marco verifies the full schedule.
- `T4.03`: **Supermarket Grocery Run, Auto-Split Expense, and Debt Settlement Lifecycle**: Sofia checks off groceries, enters the 45.00 € total bill split 3 ways, Marco checks his dashboard showing -15.00 €, settles with Sofia, and Sofia's credit drops to +15.00 €.
- `T4.04`: **Household Departure and Route Guard Isolation Workflow**: Marco leaves the apartment from his dashboard, confirming departure. His household association is severed (`casaId: null`), and subsequent attempts to access protected routes (`/turni`) are intercepted by `HouseProtectedRoute` and redirected to `/scelta-casa`.

---

## 4. Test Infrastructure Deliverables Table

| Deliverable | Path | Description |
|---|---|---|
| Test Infra Blueprint | `TEST_INFRA.md` | Architecture, mock harness design, and tier coverage specifications |
| Test Ready Summary | `TEST_READY.md` | Test execution commands, inventory, pass counts, and tier matrix |
| Setup & Mocks | `src/setupTests.js` | Canvas 2D mock, rAF handler, ESM mocks, DOM polyfills, and Router mock |
| Mock Firebase Store | `src/test/mockFirebase.js` | In-memory CRUD store and Auth simulation for Firebase v12 |
| Test Helpers | `src/test/testUtils.jsx` | `renderWithProviders` and `seedHousehold` utilities |
| Tier 1 Features | `src/test/tier1_features/*.test.jsx` | 5 test suites covering 33 feature tests |
| Tier 2 Boundaries | `src/test/tier2_boundaries/*.test.jsx` | 5 test suites covering 29 boundary/security tests |
| Tier 3 Interactions | `src/test/tier3_interactions/*.test.jsx` | 1 test suite covering 5 cross-feature tests |
| Tier 4 Scenarios | `src/test/tier4_scenarios/*.test.jsx` | 1 test suite covering 4 end-to-end lifecycle tests |

---

## 5. Discovered Implementation Notes & Escalations

1. **Harmless Console Warning (`Invalid DOM property stop-color`)**:
   - Encountered when rendering `InteractiveMascot` / SVG elements containing `stop-color` rather than camelCase `stopColor`.
   - *Impact*: Non-breaking console warning in React 19. Tests pass cleanly.
2. **Double Alert Rendering in `SceltaCasa`**:
   - `SceltaCasa` renders error messages simultaneously in both the mascot speech bubble and the card error alert banner. Test queries used `findAllByText` to account for this UX design.
3. **HTML5 `<input type="date">` Behavior**:
   - Browser engines reset date inputs to empty when invalid days are typed (e.g. Feb 29 in non-leap year). Tests verify year boundaries (`< 2020` and `> 2100`) directly to trigger domain validation.
