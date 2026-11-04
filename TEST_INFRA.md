# HouseHelper Test Infrastructure & Architecture Blueprint

## 1. Overview & Test Architecture

The HouseHelper test infrastructure provides deterministic, high-fidelity automated verification for React 19, React Router, and Firebase v12 without requiring live cloud credentials or network connections.

### Key Architectural Pillars:
1. **In-Memory Headless Mock Harness (`src/test/mockFirebase.js`)**:
   - Simulates Cloud Firestore collections (`utenti`, `case`, `turni`, `debiti`, `spesa`, `note`) with standard document CRUD, query constraints (`where`), and real-time state reset.
   - Simulates Firebase Authentication with local user session management, observer notifications (`onAuthStateChanged`), email/password operations, Google popup login, and signout.
2. **Setup & Browser Polyfills (`src/setupTests.js`)**:
   - HTML5 Canvas 2D context mock for pixel-art animation (`MiniGuy.js`) and celebration particle physics (`Celebration.js`).
   - Frame and timer lifecycle management preventing recursive `requestAnimationFrame` loops or lingering `setInterval` handles from hanging Jest workers.
   - Browser API polyfills: `navigator.clipboard`, `window.matchMedia`, `window.alert`, `window.confirm`, `window.scrollTo`, and DOM Pointer Capture.
   - Global Router abstraction providing spyable navigation (`useNavigate`, `useLocation`, `useParams`, `MemoryRouter`, `Navigate`, `Outlet`).
3. **Provider Test Utilities (`src/test/testUtils.jsx`)**:
   - `renderWithProviders(ui, options)`: Combines `ThemeProvider`, `AuthProvider`, and `MemoryRouter` with optional mock user and household pre-seeding.
   - `seedHousehold(options)`: One-step utility to inject multi-roommate scenarios, chore schedules, and balance ledgers into the in-memory store.

---

## 2. In-Memory Mock Harness Design (`mockFirebase.js`)

### MockFirestoreStore State Structure:
```javascript
{
  collections: {
    utenti: { [uid]: userData },
    case: { [casaId]: houseData },
    turni: { [turnoId]: turnoData },
    debiti: { [debitoId]: debitoData },
    spesa: { [spesaId]: spesaData },
    note: { [notaId]: notaData }
  },
  currentMockUser: null | { uid, email, displayName },
  authListeners: []
}
```

### Supported Firestore Operations:
- `collection(db, collName)`: Instantiates collection reference.
- `doc(dbOrColl, ...path)`: Resolves document references with auto-generated IDs when omitted.
- `where(field, op, val)`: Supports `==`, `!=`, `>`, `>=`, `<`, `<=`, `array-contains`, `in`.
- `query(collRef, ...constraints)`: Composable query definition.
- `getDoc(docRef)`: Returns document snapshot with `exists()` and `data()`.
- `getDocs(queryOrCollRef)`: Returns query snapshot with `empty`, `size`, `docs`, and `forEach()`.
- `setDoc(docRef, data, options)`: Direct write with optional `{ merge: true }`.
- `addDoc(collRef, data)`: Generates unique ID, stores data, returns reference.
- `updateDoc(docRef, data)`: In-place field updates.
- `deleteDoc(docRef)`: Removes document from store.

### Supported Auth Operations:
- `signInWithEmailAndPassword(auth, email, password)`
- `createUserWithEmailAndPassword(auth, email, password)`
- `signInWithPopup(auth, provider)`
- `signOut(auth)`
- `onAuthStateChanged(auth, callback)`: Broadcasts initial state and updates to active subscribers.

---

## 3. Tier Coverage Plan

### Tier 1 — Feature Coverage (>=5 tests per feature area)
- **Authentication & House Selection (`src/test/tier1_features/auth_house.test.jsx`)**:
  - Landing view welcome & action buttons
  - Registration form rendering & submission
  - Email/password login with household routing
  - Google popup authentication
  - Household creation with code generation
  - Household joining via invite code
- **Cleaning Shifts (`src/test/tier1_features/turni.test.jsx`)**:
  - Chore schedule view & empty state
  - Adding a new cleaning shift with time slots and assignee
  - Modifying an existing shift
  - Deleting an assigned shift
  - Chronological ordering of chore cards
- **Debts & Expenses (`src/test/tier1_features/debiti.test.jsx`)**:
  - Debt ledger view & personal net balance display
  - Creating a single-debt expense
  - Automated equal splitting across roommates
  - Marking a debt as settled
  - Negative balance alert when owing money
- **Grocery List (`src/test/tier1_features/spesa.test.jsx`)**:
  - Grocery view & counter badges ("Da comprare", "Presi")
  - Adding a grocery item
  - Toggling bought status
  - Deleting an item
  - Sorting unbought items ahead of bought items
- **Bulletin Board & Calendar (`src/test/tier1_features/bacheca_calendario.test.jsx`)**:
  - Bulletin board announcements view & author attribution
  - Creating an announcement
  - Editing an announcement (author only)
  - Deleting an announcement (author only)
  - Calendar monthly view and event creation

### Tier 2 — Boundary, Validation & Security Corner Cases (>=5 tests per feature area)
- **Auth & Household Security (`src/test/tier2_boundaries/auth_house_boundary.test.jsx`)**:
  - Minimum username length boundary (<2 chars)
  - Password length constraints (<6 or >128 chars)
  - Invalid email syntax rejection
  - Non-existent invite code handling
  - Alphanumeric code sanitization (spaces, punctuation)
- **Cleaning Shifts Boundaries (`src/test/tier2_boundaries/turni_boundary.test.jsx`)**:
  - Empty assignee rejection
  - Invalid shift dates (out of bounds, non-leap year Feb 29)
  - Missing cleaning zones/places
  - Multi-tenant isolation (preventing access to another house's shift)
  - Long input sanitization truncation
- **Debts & Expenses Boundaries (`src/test/tier2_boundaries/debiti_boundary.test.jsx`)**:
  - Zero and negative amounts rejection
  - Boundary cap enforcement (>50,000.00 €)
  - More than 2 decimal digits rejection
  - Self-debt prevention (creditor === debtor)
  - Division with single member household prevention
- **Grocery List Boundaries (`src/test/tier2_boundaries/spesa_boundary.test.jsx`)**:
  - Empty grocery item addition prevention
  - Long item name sanitization boundary (80 chars)
  - Cross-household grocery item toggle isolation
  - Deleting non-existent or cross-tenant grocery doc
  - Whitespace-only input stripping
- **Bulletin Board & Calendar Boundaries (`src/test/tier2_boundaries/bacheca_calendario_boundary.test.jsx`)**:
  - Deleting another roommate's notice blocked
  - Editing another roommate's notice blocked
  - Empty note title or body rejection
  - Calendar event with invalid date format rejection
  - XSS script tag stripping in note contents

### Tier 3 — Cross-Feature State Interactions (`src/test/tier3_interactions/cross_feature.test.jsx`)
- Expense added in `AggiungiDebito` updates net balance in `HomeUtente` dashboard.
- Chore assigned in `AggiuntaTurno` reflects in `HomeUtente` "Prossimo Turno" and `ViewCalendario`.
- Grocery item added in `ViewSpesa` increments active count in `HomeUtente`.
- Bulletin board note published appears in `HomeUtente` "Ultimo Avviso in Bacheca".
- Settling a debt in `ViewDebiti` recalculates both creditor and debtor balances to parity.

### Tier 4 — Real-World Household Lifecycle Workloads (`src/test/tier4_scenarios/household_lifecycle.test.jsx`)
- **Multi-Roommate Apartment Onboarding**: Elena creates house `GARB01`; Marco joins with code; Sofia joins with code; roommate directory updates across all profiles.
- **Weekly Co-living Cycle**: Rotating cleaning shifts, joint supermarket expense auto-split 3 ways, grocery item replenishment, and partial debt settlement.
- **Roommate Departure & Isolation**: Leaving household resets `casaId` to null, redirects to `/scelta-casa`, and denies subsequent access to household private data.

---

## 4. Test Execution Command

Run the complete test suite:
```bash
npm test -- --watchAll=false
```
