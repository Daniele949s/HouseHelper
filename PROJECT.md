# Project: HouseHelper Modernization

## Architecture
- **Framework & Libraries**: React 19 (`react@^19.2.3`), React DOM (`react-dom@^19.2.3`), React Router v7 (`react-router-dom@^7.10.1`), Create React App (`react-scripts@5.0.1`), Firebase SDK v12 (`firebase@^12.14.0`).
- **Module Boundaries**:
  - `src/contexts/`: `AuthContext.js` (Firebase Auth state, current user, `userData`, household `casaId`), `ThemeContext.js` (light/dark theme toggle).
  - `src/components/`: Shared UI components (`AppHeader`, `DesktopNavigation`, `MobileNavigation`, `ThemeToggle`, `ProtectedRoute`, `RouteGuards`, `Toast`, `ConfirmModal`, `HouseholdStatus`).
  - `src/pages/`: Domain feature views:
    - `Autenticazione/`: `homeAutenticazione.js`, `viewLogin.js`, `viewRegistrazione.js`.
    - `SceltaCasa.js`: Household creation and join flow.
    - `homeUtente.js`: Central household dashboard.
    - `TurniPulizia/`: `viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`.
    - `Debiti/`: `ViewDebiti.js`, `AggiungiDebito.js`.
    - `Spesa/`: `ViewSpesa.js`.
    - `Bacheca/`: `ViewBacheca.js`, `AggiungiNota.js`, `ModificaNota.js`, `ViewCalendario.js`, `AggiungiEvento.js`.
    - `NotFound.js`: 404 fallback page.
  - `src/utils/`: Security & validation helpers (`security.js`).
  - `src/test/`: In-memory headless Firebase mock harness (`mockFirebase.js`), test utilities (`testUtils.jsx`), and 4-tier E2E test suites.
  - `scripts/`: Verification scripts (`verify-zero-emojis.js`, `check-circular.js`).
- **Data Flow**:
  - Unidirectional: Firestore Collections (`utenti`, `case`, `turni`, `debiti`, `spesa`, `note`) <-> Firebase SDK <-> React Contexts & Page Hooks <-> View Presentation.
  - Zero Circular JS Dependencies: App.js routes to Pages. Global styles loaded once at `src/App.js` / `src/index.css`. Pages do NOT re-import `App.css`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Architecture & Circular Import Resolution | Remove redundant `App.css` imports from all 17 page files to break Graphify/AST cycles, verify 0 cycles with `madge` | M1 | Survey (Arch) |
| 2 | Legacy Assets Cleanup | Delete unreferenced `css_template/` (99 files, 3.9 MB) and remove dead model `src/models/modelloTurno.js` | M1 | Survey (Arch) |
| 3 | Automated Verification Scripts Setup | Add `scripts/check-circular.js` (madge) and `scripts/verify-zero-emojis.js` with npm script bindings | M1 | Survey (Arch, UI) |
| 4 | Strict Zero-Emoji & Zero-Emoticon Replacement | Replace all 36 Unicode emojis across 14 files + `public/index.html` with vector/SVG icons; replace raw arrow/check characters | M2 | Survey (UI, Features) |
| 5 | Modern Design System & CSS Tokens | Establish clean CSS variables for light/dark themes, spacing, typography scale, elevation, border-radius, and responsive containers | M2 | Survey (UI) |
| 6 | Responsive Navigation System | Add desktop navigation links to `AppHeader` (resolving desktop nav void) and harmonize with mobile drawer | M2 | Survey (UI) |
| 7 | Non-blocking Feedback System | Implement in-app `Toast` notifications and accessible `ConfirmModal` dialogs to replace blocking browser `alert()`/`confirm()` | M2 | Survey (UI) |
| 8 | Modern Household Status Widget | Replace toy/retro mascots (`MiniGuy`, `InteractiveMascot`, lightsaber toggle) with clean modern household presence cards and sleek theme switch | M2 | Survey (UI, Features) |
| 9 | Authentication Views Modernization | Redesign `homeAutenticazione`, `viewLogin`, `viewRegistrazione`, and `SceltaCasa` with modern card layouts, zero emojis, and inline validation | M3 | Survey (UI, Features) |
| 10 | User Dashboard (`homeUtente`) Modernization | Redesign dashboard with quick summary cards (upcoming shift, debt balance, active groceries, latest note), invite code badge, and clean actions | M3 | Survey (UI, Features) |
| 11 | Cleaning Shifts (`TurniPulizia`) Modernization | Redesign `viewTurni`, `aggiuntaTurno`, `modificaTurno` with calendar badge layout, frequency selector, zone tags, and assignment chips | M3 | Survey (UI, Features) |
| 12 | Expenses & Debts (`Debiti`) Modernization | Redesign `ViewDebiti` and `AggiungiDebito` with debt settlement overview, split calculation cards, payer badges, and settlement confirmation | M3 | Survey (UI, Features) |
| 13 | Grocery List (`Spesa`) Modernization | Redesign `ViewSpesa` with modern checklist cards, quantity counters, category filters, and quick-add forms | M3 | Survey (UI, Features) |
| 14 | Bulletin Board & Calendar (`Bacheca`) Modernization | Redesign `ViewBacheca`, `AggiungiNota`, `ModificaNota`, `ViewCalendario`, `AggiungiEvento` with clean sticky notes, priority tags, and calendar grid | M3 | Survey (UI, Features) |
| 15 | In-Memory Mock Firebase Harness | Create `src/test/mockFirebase.js` and `src/test/testUtils.jsx` for zero-credential deterministic testing | E2E Testing Track | Survey (Features) |
| 16 | Tier 1: Feature Coverage Smoke Tests | Test suites covering all 6 domain areas in isolation (>=5 tests per feature area) | E2E Testing Track | Survey (Features) |
| 17 | Tier 2: Boundary & Security Tests | Test edge cases, empty states, input sanitization, negative numbers, long strings, format validation | E2E Testing Track | Survey (Features) |
| 18 | Tier 3: Cross-Feature Interaction Tests | Test state interactions across modules (expense added -> dashboard balance updated; chore completed -> analytics updated) | E2E Testing Track | Survey (Features) |
| 19 | Tier 4: Real-World Household Scenarios | End-to-end multi-roommate workflow scenarios (full onboarding, chore week, grocery run + split, settlement) | E2E Testing Track | Survey (Features) |
| 20 | Final Milestone: 100% E2E Test Suite Pass | Run full E2E test suite against modernized application, debug and fix any regressions until 100% pass | M4 | Survey (Features) |
| 21 | Tier 5: Adversarial Coverage Hardening | Challenger-driven white-box adversarial testing, finding untested edge cases and hardening application code | M4 | Project Pattern |
| 22 | Debt Simplification & Advanced Splitting | Integer cent precision, greedy bipartite matching with 1-to-1 exact pre-pass, 4 split modes (Uguali, Fissi, Percentuali, Esclusioni) | M7 | Milestone M7 |
| 23 | Financial Reporting & Safe Export | CSV export with UTF-8 BOM and CWE-1236 formula sanitization, styled monthly PDF print view | M7 | Milestone M7 |
| 24 | Chore Rotation Automation & Vacation Mode | Deterministic round-robin rotation queue, vacation toggle & date range on dashboard, sub-task checklists with live Firestore sync | M7 | Milestone M7 |
| 25 | Shared Contacts Directory (`Contatti`) | Scoped address book for household utilities/services with tel/mailto sanitization and offline cache | M7 | Milestone M7 |
| 26 | Mobile PWA & Multi-Tenant Offline Storage | Service worker app shell caching, web app manifest, tenant-isolated offline storage purged on logout | M7 | Milestone M7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Architecture & Technical Debt Cleanup | Remove redundant `App.css` imports across 17 pages; delete `css_template/`; remove dead `src/models/modelloTurno.js`; configure `scripts/check-circular.js` and `scripts/verify-zero-emojis.js` | none | DONE |
| M2 | Design System, Global Navigation & Zero-Emoji Replacement | Replace all 36 emojis across 14 files + HTML title; replace raw arrows/checks with SVG icons; implement desktop nav in `AppHeader`; create Toast and ConfirmModal; establish modern design system tokens | M1 | DONE |
| M3 | Core Domain Pages UI/UX Modernization | Redesign all primary views (Auth, SceltaCasa, Dashboard, Turni, Debiti, Spesa, Bacheca, Calendario) with polished, responsive layouts using M2 design system and non-blocking dialogs | M2 | DONE |
| M4 | Final Milestone: E2E Test Pass & Adversarial Hardening | Phase 1: 100% pass of E2E test suite (Tiers 1-4). Phase 2: Adversarial Coverage Hardening (Tier 5) with Challenger -> Worker -> Reviewer | M3, E2E Testing Track (`TEST_READY.md`) | DONE |
| M5 | Application Security Hardening & Secret Audit | Deep `firestore.rules` audit (household-scoped multi-tenant data access, anti-tamper, sanitization); Git history & public repository secret audit | M4 | DONE (26/26 suites, 209/209 tests passed, 0 secrets, 0 emojis, 0 cycles) |
| M6 | Household Document Management & Ergonomics | Firebase Storage document management (`/documenti`, upload, categorize, view); mobile touch & desktop widescreen ergonomics | M5 | DONE |
| M7 | Advanced Automation, Finanza Intelligente, Contatti & PWA | Debt simplification algorithm, 4 split modes, CSV/Print export, vacation mode, chore checklists & round-robin rotation, contatti directory, PWA service worker, tenant-isolated offline storage, automated test suites | M6 | DONE |

## Parallel Track: E2E Testing Track
- **Owner**: E2E Testing Orchestrator
- **Scope**:
  1. Build headless in-memory Firebase test harness (`src/test/mockFirebase.js` & `src/test/testUtils.jsx`) avoiding real network calls and leaks.
  2. Canvas 2D and timer mocks in `src/setupTests.js`.
  3. Author comprehensive 4-Tier test suites (Tier 1: Feature Smoke, Tier 2: Boundaries, Tier 3: Cross-Feature Interactions, Tier 4: Real-World Application Workloads).
  4. Publish `TEST_READY.md` with complete runner and test inventory.

## Interface Contracts

### Global Design System ↔ Pages (M2 ↔ M3)
- **Theme Variables**:
  `--bg-primary`, `--bg-secondary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-color`, `--color-primary`, `--color-primary-hover`, `--color-accent`, `--color-success`, `--color-danger`, `--color-warning`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--radius-sm`, `--radius-md`, `--radius-lg`.
- **Toast Service**:
  `showToast(message, type = 'info' | 'success' | 'warning' | 'error', duration = 3000)`
- **Confirm Modal Dialog**:
  `showConfirm({ title, message, confirmText, cancelText, onConfirm, onCancel, isDanger })`
- **Iconography**:
  All icons must be vector components or SVG / FontAwesome classes (`fas fa-...`). No raw text emoticons or Unicode emojis.

### Firebase Service & Context ↔ Pages
- `AuthContext`: `{ currentUser, userData, logout, updateUserData }`
- `Firestore`: Standard operations wrapped with robust error handling and sanitization via `src/utils/security.js`.

### Testing Harness ↔ Application (E2E Track ↔ M4)
- Test runner invocation: `npm test -- --watchAll=false`
- Headless mock: `MockFirestoreStore` simulates `case`, `utenti`, `turni`, `debiti`, `spesa`, `note` in-memory.

## Code Layout
```
src/
├── App.js                     # Root router and global layout
├── App.css                    # Unified modern design tokens and global component styles
├── index.js                   # Application entry point
├── index.css                  # Base reset and typography
├── contexts/
│   ├── AuthContext.js         # Authentication & household state
│   └── ThemeContext.js        # Light/dark mode state
├── components/
│   ├── AppHeader.js           # Header with responsive desktop navigation & theme toggle
│   ├── DesktopNavigation.js   # Desktop navigation link bar
│   ├── MobileNavigation.js    # Mobile drawer navigation
│   ├── ThemeToggle.js         # Refined modern theme toggle
│   ├── Toast.js               # Non-blocking toast notification container
│   ├── ConfirmModal.js        # Accessible confirmation modal dialog
│   ├── HouseholdStatus.js     # Polished household status indicator
│   ├── ProtectedRoute.js      # Route guard requiring authenticated user
│   └── RouteGuards.js         # Public-only and house-protected guards
├── pages/
│   ├── Autenticazione/        # homeAutenticazione.js, viewLogin.js, viewRegistrazione.js
│   ├── SceltaCasa.js          # Create / Join household
│   ├── homeUtente.js          # Roommate dashboard
│   ├── TurniPulizia/          # viewTurni.js, aggiuntaTurno.js, modificaTurno.js
│   ├── Debiti/                # ViewDebiti.js, AggiungiDebito.js
│   ├── Spesa/                 # ViewSpesa.js
│   ├── Bacheca/               # ViewBacheca.js, AggiungiNota.js, ModificaNota.js, ViewCalendario.js, AggiungiEvento.js
│   ├── Documenti/             # GestioneDocumenti.js
│   ├── Contatti/              # ViewContatti.js
│   └── NotFound.js            # 404 page
├── utils/
│   ├── security.js            # Sanitization and validation
│   ├── feedback.js            # Toast and modal emitter utilities
│   ├── debtSimplification.js  # Bipartite matching & 4 split modes calculations
│   ├── choreRotation.js       # Deterministic round-robin & vacation filters
│   ├── reportExport.js        # CSV (CWE-1236 immune) & styled PDF print export
│   └── offlineStorage.js      # Tenant-isolated client caching & eviction
├── serviceWorkerRegistration.js # PWA service worker registration helper
├── test/
│   ├── mockFirebase.js        # In-memory Firestore & Auth mock
│   ├── testUtils.jsx          # Custom render with Router & Auth providers
│   ├── tier1_features/        # Smoke suites per feature area (including contatti & documenti)
│   ├── tier2_boundaries/      # Edge case & algorithm boundary suites (debt_simplification, chore_automation)
│   ├── tier3_interactions/    # Cross-feature integration suites (pwa_offline)
│   ├── tier4_scenarios/       # Realistic household scenario workloads
│   └── tier5_adversarial/     # Challenger-driven adversarial test suites
public/
├── sw.js                      # Service worker app shell cache & navigation fallback
└── manifest.json              # Web app manifest for standalone PWA
scripts/
├── check-circular.js          # Circular dependency verification via madge
└── verify-zero-emojis.js      # Zero-emoji regex scan across src/ and public/
```
