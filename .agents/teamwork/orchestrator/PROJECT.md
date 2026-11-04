# Project: HouseHelper Modernization

## Architecture
- **Framework & Libraries**: React 19 (`react@^19.2.3`), React DOM (`react-dom@^19.2.3`), React Router v7 (`react-router-dom@^7.10.1`), Create React App (`react-scripts@5.0.1`), Firebase SDK v12 (`firebase@^12.14.0`).
- **Module Boundaries**:
  - `src/contexts/`: `AuthContext.js` (Firebase Auth state, current user, `userData`, household `casaId`), `ThemeContext.js` (light/dark theme toggle).
  - `src/components/`: Shared UI components (`AppHeader`, `DesktopNavigation`, `MobileNavigation`, `ThemeToggle`, `ProtectedRoute`, `RouteGuards`, `Toast`, `ConfirmModal`, `HouseholdStatus`).
  - `src/pages/`: Domain feature views:
    - `Autenticazione/`: `homeAutenticazione.js`, `viewLogin.js`, `viewRegistrazione.js`.
    - `SceltaCasa.js`: Household creation and join flow.
    - `homeUtente.js`: Roommate dashboard.
    - `TurniPulizia/`: `viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`.
    - `Debiti/`: `ViewDebiti.js`, `AggiungiDebito.js`.
    - `Spesa/`: `ViewSpesa.js`.
    - `Bacheca/`: `ViewBacheca.js`, `AggiungiNota.js`, `ModificaNota.js`, `ViewCalendario.js`, `AggiungiEvento.js`.
    - `Documenti/`: `ViewDocumenti.js`, `CaricaDocumentoModal.js` (Household documents: rent, utilities, receipts, with Firebase Storage).
    - `NotFound.js`: 404 fallback page.
  - `src/utils/`: Security & validation helpers (`security.js`, `feedback.js`, `documentStorage.js`).
  - `src/test/`: In-memory headless Firebase mock harness (`mockFirebase.js`), test utilities (`testUtils.jsx`), and 4-tier E2E test suites + security & document suites.
  - `scripts/`: Verification scripts (`verify-zero-emojis.js`, `check-circular.js`, `audit-secrets.js`).
  - Root Security & Storage Rules: `firestore.rules`, `storage.rules`.
- **Data Flow**:
  - Unidirectional: Firestore Collections (`utenti`, `case`, `turni`, `debiti`, `spesa`, `note`, `documenti`) & Firebase Storage (`case/{casaId}/documenti/{docId}`) <-> Firebase SDK <-> React Contexts & Page Hooks <-> View Presentation.
  - Zero Circular JS Dependencies: App.js routes to Pages. Global styles loaded once at `src/App.js` / `src/index.css`. Pages do NOT re-import `App.css`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Architecture & Circular Import Resolution | Remove redundant `App.css` imports from all 17 page files to break Graphify/AST cycles, verify 0 cycles with `madge` | M1 | Survey (Arch) |
| 2 | Legacy Assets Cleanup | Delete unreferenced `css_template/` (99 files, 3.9 MB) and remove dead model `src/models/modelloTurno.js` | M1 | Survey (Arch) |
| 3 | Automated Verification Scripts Setup | Add `scripts/check-circular.js` (madge) and `scripts/verify-zero-emojis.js` with npm script bindings | M1 | Survey (Arch, UI) |
| 4 | Strict Zero-Emoji & Zero-Emoticon Replacement | Replace all 36 emojis across 14 files + `public/index.html` with vector/SVG icons; replace raw arrow/check characters | M2 | Survey (UI, Features) |
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
| 22 | Firestore Security Rules & Access Control Hardening | Comprehensive audit and hardening of `firestore.rules`: strict household scoping, anti-tamper constraints, schema validations | M5 | Phase 2 (R3) |
| 23 | Public Repository & Git History Secret Audit | Deep scan and elimination of any private credentials, API keys, or sensitive data in repo files and git history | M5 | Phase 2 (R3) |
| 24 | Household Document Management via Firebase Storage | Document upload, categorization (rent, utilities, receipts), viewing, and deletion strictly scoped to household | M6 | Phase 2 (R4) |
| 25 | Advanced Cross-Device Ergonomics Optimization | Touch targets (>=44px), mobile layout enhancements, widescreen responsive layout, strict zero emojis | M6 | Phase 2 (R4) |
| 26 | Document & Security Automated Test Coverage | Automated test suites for security rules, document upload/view/delete flows, and ergonomics constraints | M6 | Phase 2 (R4) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Architecture & Technical Debt Cleanup | Remove redundant `App.css` imports across 17 pages; delete `css_template/`; remove dead `src/models/modelloTurno.js`; configure `scripts/check-circular.js` and `scripts/verify-zero-emojis.js` | none | DONE |
| M2 | Design System, Global Navigation & Zero-Emoji Replacement | Replace all 36 emojis across 14 files + HTML title; replace raw arrows/checks with SVG icons; implement desktop nav in `AppHeader`; create Toast and ConfirmModal; establish modern design system tokens | M1 | DONE |
| M3 | Core Domain Pages UI/UX Modernization | Redesign all primary views (Auth, SceltaCasa, Dashboard, Turni, Debiti, Spesa, Bacheca, Calendario) with polished, responsive layouts using M2 design system and non-blocking dialogs | M2 | DONE |
| M4 | Final Milestone: E2E Test Pass & Adversarial Hardening | 100% pass of E2E test suite (Tiers 1-4, 24 suites, 190 tests passed) + adversarial hardening verified | M3, E2E Testing Track | DONE |
| M5 | Application Security Hardening & Public Repository Audit | Audit and overhaul `firestore.rules` (household-scoped access, anti-tamper validation, data sanitization) and perform deep repository / git history scan for sensitive keys | M4 | IN_PROGRESS |
| M6 | Household Document Management & Advanced Ergonomics | Implement household documents with Firebase Storage, `storage.rules`, category organization (rent/utilities/receipts), mobile & desktop ergonomics optimization, automated test suite | M5 | PLANNED |

## Interface Contracts

### Firestore Security Rules Contract (M5)
- **Helper Functions**:
  - `isAuthenticated()`: `request.auth != null`
  - `isHouseholdMember(casaId)`: authenticated user's `userData.casaId == casaId`
  - `isOwner(userId)`: `request.auth.uid == userId`
- **Scoping**:
  - `/case/{casaId}/**`: read and write strictly restricted to authenticated members of `casaId`.
  - Anti-tamper: write checks verify that immutable fields (`casaId`, `creatoreId`, `autoreId`, `timestamp`) are not altered on update.

### Firebase Storage & Document Management Contract (M6)
- **Storage Path**: `case/{casaId}/documenti/{documentId}_{filename}`
- **Storage Rules**: Only users with authenticated `casaId` matching path can read/write objects under `/case/{casaId}/documenti/`.
- **Document Metadata Collection (`documenti`)**:
  - `id`: Firestore auto-id
  - `casaId`: string (foreign key)
  - `titolo`: string (1-80 chars)
  - `categoria`: 'affitto' | 'bollette' | 'scontrini' | 'altro'
  - `fileUrl`: string (download URL)
  - `storagePath`: string
  - `fileType`: string (MIME type)
  - `fileSize`: number (max 10MB)
  - `caricatoDa`: string (userId)
  - `caricatoDaNome`: string (username)
  - `dataCaricamento`: string (ISO date)
- **Ergonomics Contract**:
  - Touch target size: all interactive elements have minimum height/width of 44px with comfortable padding.
  - Desktop widescreen: responsive multi-column layouts capped at `--container-max-width` (1280px) with centered container.
  - Zero-emoji policy: FontAwesome vector icons (`fas fa-file-contract`, `fas fa-receipt`, `fas fa-file-invoice-dollar`, `fas fa-folder-open`, etc.).
