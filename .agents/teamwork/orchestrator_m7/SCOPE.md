# Scope: Milestone M7 — HouseHelper Roadmap Modernization

## Architecture
- **Framework**: React 19, React Router v7, Create React App 5, Firebase SDK v12.
- **Data Flow**:
  - Unidirectional: Firestore (`case`, `utenti`, `turni`, `debiti`, `spesa`, `note`, `documenti`, `contatti`) <-> Firebase SDK / `offlineStorage` <-> React Contexts (`AuthContext`, `ThemeContext`) & Custom Hooks <-> Page Views.
- **Module Boundaries**:
  - `src/utils/`:
    - `debtSimplification.js`: Integer-cent debt reduction with 1-to-1 exact matching pre-pass & greedy bipartite matching.
    - `reportExport.js`: Safe CSV (UTF-8 BOM, CWE-1236 mitigation) and printable PDF view.
    - `choreRotation.js`: Deterministic round-robin rotation queue and vacation exclusion filter.
    - `offlineStorage.js`: Isolated multi-tenant client-side cache keyed by `casaId` with purge on logout.
    - `security.js`: Protocol sanitizers (`safeTelUrl`, `safeMailtoUrl`, `sanitizePhone`) and checklist text sanitizer (`sanitizeChecklist`).
  - `src/pages/`:
    - `Debiti/`: `ViewDebiti.js` (debt simplification visualizer & settlement, monthly export modal), `AggiungiDebito.js` (4 split modes, anti-tamper, double-submit guard).
    - `TurniPulizia/`: `viewTurni.js` (sub-task checklist with live Firestore toggle, rotation execution trigger), `aggiuntaTurno.js` (vacation indicator & vacationing roommate exclusion).
    - `homeUtente.js`: Vacation mode toggle & date picker, in-app notification banner for chores <24h & new expenses, Contatti quick action button.
    - `Contatti/`: `ViewContatti.js` (useful & emergency contacts directory with `tel:` & `mailto:` buttons, category chips, add/delete dialog).
  - `src/components/`: `DesktopNavigation.js` (8 items including Contatti), `MobileNavigation.js`.
  - `src/App.js`: Route code-splitting with `React.lazy` and `<Suspense>` for `/contatti`, `/documenti`, `/calendario`, `/bacheca`, `/debiti`.
  - `src/contexts/AuthContext.js`: Purge offline tenant storage on logout.
  - `firestore.rules`: Multi-tenant security rules for `contatti`, `case.impostazioniTurni`, `utenti.inVacanza`, `turni.checklist`.
  - `public/`: `sw.js` (PWA Service Worker), updated `manifest.json`.
  - `src/test/`: `mockFirebase.js` (collection `contatti`), `setupTests.js` (`URL.createObjectURL`, `window.print`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Debt Simplification Algorithm | 2-phase Greedy Bipartite Matching with 1-to-1 pre-pass on integer cents; cancels circular debts (A->B->C->A) and transitive chains to <= N-1 transactions | M7 | R1, Survey |
| 2 | Custom Expense Splits | 4 modes (equal, custom fixed amounts with sum validation, percentages with Hare-Niemeyer cent allocation, roommate exclusions); anti-tamper bounds | M7 | R1, Survey |
| 3 | Monthly Reports Export | CSV export with UTF-8 BOM and formula injection protection; styled printable PDF view with zero heavy dependencies | M7 | R1, Survey |
| 4 | Configurable Chore Rotation | Household settings `impostazioniTurni` on `case/{casaId}`; deterministic round-robin rotation queue skipping vacationing members | M7 | R2, Survey |
| 5 | Vacation / Away Mode | Vacation toggle & date range on `utenti/{userId}`; automatic exclusion from chore assignment and rotation; whole-house absence fallback banner | M7 | R2, Survey |
| 6 | Sub-Task Chore Checklist | Interactive checklist `checklist: [{ id, text, completed, completedBy, completedAt }]` on `turni`; atomic Firestore `updateDoc` persistence; XSS sanitization | M7 | R2, Survey |
| 7 | Useful & Emergency Contacts Directory | Dedicated `/contatti` page; contacts collection scoped by `casaId`; safe `tel:` and `mailto:` action buttons; Desktop & Mobile navigation links | M7 | R3, Survey |
| 8 | PWA Service Worker & Manifest | `public/sw.js` caching app shell assets and navigation fallback; enhanced `public/manifest.json`; `serviceWorkerRegistration.js` | M7 | R4, Survey |
| 9 | Secure Offline Storage & Tenant Eviction | Isolated cache in `src/utils/offlineStorage.js` keyed by `casaId`; immediate cache purge upon user logout in `AuthContext.js` | M7 | R4, R6, Survey |
| 10 | In-App Notifications & Reminders | Dashboard banner in `homeUtente.js` for chores due within <24h and newly added expenses with dismiss tracking | M7 | R4, Survey |
| 11 | Performance Code-Splitting | `React.lazy` and `Suspense` in `src/App.js` for secondary domain routes; faster initial load with zero test regressions | M7 | R5, Survey |
| 12 | Multi-Tenant Firestore Rules Hardening | Strict `casaId` authorization and validation rules for `contatti`, `case`, `utenti`, and `turni` | M7 | R6, Survey |
| 13 | Strict UI & Architectural Constraints | Zero emojis / emoticons; vector FontAwesome icons only; double-submit prevention; zero circular dependencies | M7 | R6, R7, Survey |
## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M7 | HouseHelper Roadmap Modernization | Debt simplification & export, chore rotation & checklist & vacation mode, useful contacts directory, PWA offline & notifications, multi-tenant security hardening | M1-M6 | DONE (36 suites, 342 tests pass, 100% gate pass) |

---

## Interface Contracts

### 1. Debt Simplification (`src/utils/debtSimplification.js`)
```javascript
/**
 * Computes the minimum transaction list to zero out all net balances.
 * @param {Array<{ debitoreId: string, creditoreId: string, importo: string | number }>} debts
 * @param {Array<{ uid: string, username: string }>} roommates
 * @returns {Array<{ from: string, to: string, fromName: string, toName: string, amount: string, cents: number }>}
 */
export function simplifyDebts(debts, roommates);

/**
 * Calculates net balance per roommate in integer cents.
 * @returns {Record<string, { cents: number, amount: string }>}
 */
export function calculateNetBalances(debts, roommates);
```

### 2. Custom Split Modes (`src/utils/debtSimplification.js` / `AggiungiDebito.js`)
```javascript
/**
 * Splits total amount into allocations per debtor based on mode.
 * @param {'uguali' | 'fissi' | 'percentuali' | 'esclusioni'} mode
 * @param {number} totalAmount
 * @param {string} payerId
 * @param {Array<{ uid: string, username: string }>} roommates
 * @param {Object} customData - { fixedAmounts: { [uid]: number }, percentages: { [uid]: number }, excludedUids: string[] }
 * @returns {{ valid: boolean, error?: string, allocations?: Array<{ debitoreId: string, amount: string, cents: number }> }}
 */
export function calculateSplitAllocations(mode, totalAmount, payerId, roommates, customData);
```

### 3. Report Export (`src/utils/reportExport.js`)
```javascript
export function exportExpensesToCsv(expenses, simplifiedDebts, roommates, casaNome, monthYear);
export function printMonthlyReport(expenses, simplifiedDebts, roommates, casaNome, monthYear);
```

### 4. Chore Rotation & Vacation (`src/utils/choreRotation.js`)
```javascript
export function getAvailableRoommates(roommates, checkDate = new Date());
export function rotateChoreAssignee(currentAssigneeUid, activeRoommates, rotationOrder);
export function isUserOnVacation(userData, checkDate = new Date());
```

### 5. Offline Storage & Multi-Tenant Eviction (`src/utils/offlineStorage.js`)
```javascript
export function saveOfflineData(casaId, key, data);
export function getOfflineData(casaId, key);
export function purgeTenantStorage(casaId);
export function purgeAllOfflineStorage();
```

### 6. Protocol Sanitizers (`src/utils/security.js`)
```javascript
export function sanitizePhone(phone);
export function safeTelUrl(phone);
export function safeMailtoUrl(email);
export function sanitizeChecklist(items, maxItems = 20, maxLen = 100);
```

### 7. Firestore Security Rules
- `contatti`: `belongsToSameHouse(resource.data.casaId) && isValidContact(request.resource.data)`
- `turni`: allow `checklist` array and `completato: bool`
- `case`: allow `impostazioniTurni: map`
- `utenti`: allow `inVacanza: bool`, `vacanzaInizio: string`, `vacanzaFine: string`

---

## Code Layout
```
src/
├── App.js                     # Lazy-loaded routes + Suspense fallback
├── App.css                    # Design tokens and styles for new components
├── index.js                   # Service worker registration
├── serviceWorkerRegistration.js # PWA SW register/unregister
├── contexts/
│   └── AuthContext.js         # Offline cache eviction on logout
├── components/
│   ├── DesktopNavigation.js   # 8 navigation items (including Contatti)
│   └── MobileNavigation.js    # Mobile drawer with Contatti link
├── pages/
│   ├── Contatti/
│   │   └── ViewContatti.js    # Useful & emergency contacts directory
│   ├── Debiti/
│   │   ├── ViewDebiti.js      # Debt simplification view & export modal
│   │   └── AggiungiDebito.js  # 4 split modes, anti-tamper, double-submit guard
│   ├── TurniPulizia/
│   │   ├── viewTurni.js       # Sub-task checklist & manual rotation trigger
│   │   └── aggiuntaTurno.js   # Vacation exclusion indicator
│   └── homeUtente.js          # Vacation mode controls & in-app reminder banner
├── utils/
│   ├── security.js            # Phone, tel, mailto, checklist sanitizers
│   ├── debtSimplification.js  # Integer-cent greedy debt simplification & split calculator
│   ├── reportExport.js        # CSV & print PDF generator
│   ├── choreRotation.js       # Round-robin rotation & vacation filters
│   └── offlineStorage.js      # Multi-tenant scoped offline cache
├── test/
│   ├── mockFirebase.js        # Top-level contatti collection
│   ├── tier1_features/
│   │   └── contatti.test.js   # Contacts directory unit tests
│   ├── tier2_boundaries/
│   │   ├── debt_simplification.test.js # Debt simplification & split validation tests
│   │   └── chore_automation.test.js   # Rotation, vacation & checklist tests
│   └── tier3_interactions/
│       └── pwa_offline.test.js        # Offline storage & tenant eviction tests
public/
├── sw.js                      # Service Worker script
└── manifest.json              # Enhanced PWA manifest
```
