# Project: HouseHelper Modernization & Visual/Ergonomics Production Overhaul

## Architecture
- **Framework & Libraries**: React 19 (`react@^19.2.3`), React DOM (`react-dom@^19.2.3`), React Router v7 (`react-router-dom@^7.10.1`), Create React App (`react-scripts@5.0.1`), Firebase SDK v12 (`firebase@^12.14.0`).
- **Design Foundations**:
  - `src/index.css`: Root design tokens, semantic color roles, light/dark themes, Apple HIG dynamic typography scale, elevation shadows, glass materials.
  - `src/App.css`: Component styling, responsive shell layout, sticky header, mobile bottom bar, modals, toasts.
- **Module Boundaries**:
  - `src/contexts/`: `AuthContext.js` (Auth state, current user, `casaId`), `ThemeContext.js` (light/dark theme toggle).
  - `src/components/`: Shared UI components (`AppHeader`, `DesktopNavigation`, `MobileNavigation`, `MobileBottomBar`, `ThemeToggle`, `ProtectedRoute`, `Toast`, `ConfirmModal`, `HouseholdStatus`).
  - `src/pages/`: Domain feature views:
    - `Autenticazione/`: `homeAutenticazione.js`, `viewLogin.js`, `viewRegistrazione.js`.
    - `SceltaCasa.js`: Household creation and join flow.
    - `homeUtente.js`: Central roommate dashboard.
    - `TurniPulizia/`: `viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`.
    - `Debiti/`: `ViewDebiti.js`, `AggiungiDebito.js`.
    - `Spesa/`: `ViewSpesa.js`.
    - `Bacheca/`: `ViewBacheca.js`, `AggiungiNota.js`, `ModificaNota.js`, `ViewCalendario.js`, `AggiungiEvento.js`.
    - `Documenti/`: `ViewDocumenti.js`, `GestioneDocumenti.js`.
    - `Contatti/`: `ViewContatti.js`.
    - `NotFound.js`: 404 fallback page.
  - `src/utils/`: Security & validation helpers (`security.js`, `feedback.js`, `debtSimplification.js`, `choreRotation.js`, `reportExport.js`, `offlineStorage.js`).
  - `src/test/`: 42 test suites, 436 unit and adversarial stress tests.
  - `scripts/`: Verification scripts (`verify-zero-emojis.js`, `check-circular.js`, `audit-secrets.js`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1-26 | Prior Milestones M1-M7 Features | Technical debt cleanup, core pages, security rules, document management, debt math, PWA | M1-M7 | Prior Survey |
| 27 | Design Tokens & WCAG AA Contrast Calibration | Fix dark caption contrast (`#64748b` -> `#94a3b8`), error alert contrast (`var(--color-danger-text)`), analytics pills, tokenizing `--font-family-display` with Outfit and real monospace | M8 | Survey 1 |
| 28 | Legacy Tailwind & Neon Purge | Purge all 30+ instances of `rgba(37, 99, 235)` and `rgba(239, 68, 68)`, hardcoded zinc `#09090b`; replace aggressive neon button glows with subtle ambient/directional shadows | M8 | Survey 1 |
| 29 | Mobile Safe Area & Desktop Persistent Navigation | Add `calc(12px + env(safe-area-inset-top, 0px))` on mobile container; make `.app-topbar` sticky (`position: sticky; top: 12px; z-index: 900;`) for desktop persistent navigation and active Liquid Glass; fix 768px breakpoint collision | M8 | Survey 2 |
| 30 | Touch Target Hardening & Desktop Multi-Column Expansion | Ensure CSS-level `min-height: 44px` on buttons; remove inline `maxWidth: 820px` clamping via `.domain-page-card { max-width: 1000px !important; }` for widescreen layouts | M8 | Survey 2 |
| 31 | Primary Views Signature Elements | Dashboard (Household Command Center Hero), Turni (Turno in Evidenza Spotlight card), Debiti (Financial Ledger Hero & minimal settlement), Spesa (Live Progress Header & Frequent Staples Hub) | M9 | Survey 3 |
| 32 | Icon De-cluttering & Sentence Case Copywriting | Remove duplicate icons from `<h1>` elements and generic `fa-arrow-right` links; convert uppercase shouting into natural Italian sentence case with active verbs | M9 | Survey 3 |
| 33 | Secondary Views, Emergency Shelf & Modals Polish | Bacheca (Pinned Urgent Notice banner & 2-column calendar split), Documenti (House Vault & Category Cabinet), Contatti (Emergency Speed-Dial Priority Shelf >= 44px pills, modal Escape/backdrop dismiss) | M10 | Survey 3 |
| 34 | Final Design Audit & Verification | Verify 100% test pass (436+ tests), clean build, 0 emojis, strict Apple HIG accessibility and frontend-design distinctiveness | M11 | Survey 1,2,3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1-M7 | Foundations & Prior Features | Circular dependencies, initial design system, core pages, E2E pass, security, documents, PWA | none | DONE |
| M8 | Design Tokens, CSS Architecture, Ergonomics & Shell Layout | `src/index.css` token calibration (contrast, typography scale, layered elevation shadows, glass border), `src/App.css` Tailwind/neon purge, mobile top safe area insets, sticky topbar persistent desktop navigation, 768px breakpoint fix, touch target hardening, font stack cleanup in `public/index.html` | M7 | DONE |
| M9 | Primary Views Modernization & Signature Elements | `homeUtente.js` (Household Command Center Hero), `viewTurni.js` (Spotlight Card), `ViewDebiti.js` (Financial Ledger Hero), `ViewSpesa.js` (Live Progress Hub, strictly zero "Dispensa"); icon de-cluttering & sentence case micro-copy | M8 | DONE |
| M10 | Secondary Views, Emergency Shelf & Modals Polish | `ViewBacheca.js` / `ViewCalendario.js` (Pinned Notice & desktop 2-column split), `ViewDocumenti.js` (House Vault), `ViewContatti.js` (Emergency Speed-Dial Shelf), `Autenticazione` (Hearth Badge), `Toast.js` (mobile safe area) & `ConfirmModal.js` (`--shadow-modal`) | M9 | IN_PROGRESS |
| M11 | Final Design Audit, Adversarial Verification & 100% Test Pass | Full test suite (`npm test`), build check (`npm run build`), zero-emoji scan (`node scripts/verify-zero-emojis.js`), Reviewers APPROVE, Challengers CONFIRMED, Auditor CLEAN | M10 | PLANNED |

## Interface Contracts

### Design System Tokens Contract (M8 ↔ M9, M10)
- **Contrast Guarantee**: All text on cards must have contrast ratio >= 4.5:1 (WCAG AA).
- **Elevation Tokens**: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glass`, `--shadow-modal`.
- **Liquid Glass Materials**: Reserved exclusively for floating functional layers (`.app-topbar`, `.mobile-bottom-bar`, `.toast-item`, `.confirm-modal-backdrop`, `.modal-backdrop`). Content cards strictly maintain `backdrop-filter: none !important;`.
- **Typography Tokens**:
  - `--font-family-sans`: System font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", ...`)
  - `--font-family-display`: `'Outfit', var(--font-family-sans)`
  - `--font-family-mono`: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Ergonomics Rules**:
  - Minimum touch target dimension: `min-height: 44px; min-width: 44px;` for all buttons, links, toggles.
  - Mobile bottom navigation: exactly 5 tabs ("Home", "Turni", "Spese", "Spesa", "Altro").
  - Desktop navigation: exactly 8 links ("Dashboard", "Turni", "Debiti", "Spesa", "Bacheca", "Calendario", "Documenti", "Contatti").
  - Test Invariant: NEVER use the word "Dispensa" in `ViewSpesa.js`.
