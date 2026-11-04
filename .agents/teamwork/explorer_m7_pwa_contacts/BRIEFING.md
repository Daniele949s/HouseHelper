# BRIEFING — 2026-11-04T00:17:30Z

## Mission
Read-only technical investigation of R3 (Contatti Utili), R4 (PWA & Notifiche), R5 (Prestazioni), R6 (Sicurezza), and R7 (Vincoli) for Milestone M7 of HouseHelper.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_pwa_contacts/
- Original parent: 539b9b5a-7c33-4552-8b8b-ccb1891086b8
- Milestone: M7

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly vector SVG icons (ZERO emojis)
- Zero circular dependencies
- Multi-tenant tenant isolation across Firestore rules and caches
- Write only to own directory /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_pwa_contacts/

## Current Parent
- Conversation ID: 539b9b5a-7c33-4552-8b8b-ccb1891086b8
- Updated: 2026-11-04T00:17:30Z

## Investigation State
- **Explored paths**:
  - `src/App.js`, `src/components/DesktopNavigation.js`, `src/components/MobileNavigation.js`, `src/components/DesktopNavigation.test.jsx`, `src/App.test.js`
  - `public/manifest.json`, `public/index.html`, `src/index.js`, `src/firebase.js`, `src/contexts/AuthContext.js`
  - `firestore.rules`, `src/test/tier2_boundaries/security_rules.test.js`
  - `src/utils/security.js`, `src/services/documentiService.js`, `src/pages/Documenti/ViewDocumenti.js`, `src/pages/homeUtente.js`, `src/pages/Debiti/AggiungiDebito.js`, `src/pages/TurniPulizia/aggiuntaTurno.js`
  - Automated verification: `scripts/check-circular.js` (0 cycles), `scripts/verify-zero-emojis.js` (0 emojis), `scripts/audit-secrets.js` (0 secrets), `npm test` (30 suites / 280 tests passing), `npm run build` (compiled clean)
- **Key findings**:
  - R3 (Contatti Utili): Needs top-level Firestore collection `contatti` scoped by `casaId`, matching existing uniform pattern (`turni`, `debiti`, `spesa`, `note`, `documenti`). Needs `/contatti` route in `App.js`, and navigation items in `DesktopNavigation` (8th item) and `MobileNavigation`. Quick action triggers require protocol sanitizers (`sanitizePhone`, `safeTelUrl`, `safeMailtoUrl`) to prevent dangerous schemes (`javascript:`, etc.).
  - R4 (PWA & Offline): No Service Worker currently exists. CRA 5 builds everything from `public/` to `build/`. Recommended: `public/sw.js` for shell caching (HTML, CSS, JS, fonts) and navigation fallback. For data caching, use client-side `src/utils/offlineStorage.js` with keys scoped by `casaId` (`hh_offline_${casaId}_...`) and strict eviction on logout in `AuthContext` to avoid multi-tenant data leakage. In-app notifications in `homeUtente.js` for chores due <24h and new expenses with dismiss tracking.
  - R5 (Performance): Current bundle is a single chunk of 230.62 kB gzip (`main.js`). With new M7 features (PDF export, contacts, debts simplification), route code-splitting with `React.lazy` and `Suspense` for heavy routes (`/documenti`, `/calendario`, `/bacheca`, `/debiti`, `/contatti`) will reduce initial landing/login bundle size. Component tests are unimpacted because tests render page components directly via `renderWithProviders`.
  - R6 (Security): Input sanitization via `security.js` needs phone number sanitization. Firestore rules in `firestore.rules` must add `contatti` rules, plus update `case` (rotation settings), `utenti` (vacation mode), and `turni` (checklist array) to prevent permission denied errors on new fields. Double-submit guard pattern (`isSubmitting` / `disabled`) must be applied to all new forms.
  - R7 (Constraints): Zero emojis rule verified by `verify-zero-emojis.js` (regex checks for Pictographic, Flags, raw arrows/checks). Zero circular dependencies verified by madge. 30/30 suites passing.
- **Unexplored areas**: None, all 5 requirements investigated.

## Key Decisions Made
- Confirmed top-level `contatti` scoped by `casaId` over sub-collection.
- Identified need for `safeTelUrl` and `safeMailtoUrl` in `src/utils/security.js`.
- Identified necessary `firestore.rules` additions for `contatti`, vacation mode in `utenti`, rotation in `case`, and checklist in `turni`.
- Designed multi-tenant cache isolation and purge protocol on logout.

## Artifact Index
- DISPATCH.md — incoming dispatch message
- BRIEFING.md — persistent situational awareness
- progress.md — heartbeat progress tracker
- handoff.md — detailed 5-component technical report
