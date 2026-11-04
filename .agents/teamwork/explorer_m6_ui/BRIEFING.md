# BRIEFING — 2026-11-03T15:50:30Z

## Mission
Technical investigation of UI routing, navigation, design system, Documenti view, and cross-device ergonomics for Milestone M6.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, UI/UX architecture analysis, synthesis
- Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui
- Original parent: 3ee71a4c-9e4f-4922-b970-a55d69932d6e
- Milestone: M6 (Gestione Documenti & Contratti)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strict zero-emoji compliance (FontAwesome icons only)
- Minimum 44px touch targets on mobile
- Write report strictly in own directory: `handoff.md`

## Current Parent
- Conversation ID: 3ee71a4c-9e4f-4922-b970-a55d69932d6e
- Updated: 2026-11-03T15:50:30Z

## Investigation State
- **Explored paths**: `src/App.js`, `src/components/RouteGuards.js`, `src/components/DesktopNavigation.js`, `src/components/MobileNavigation.js`, `src/components/AppHeader.js`, `src/pages/homeUtente.js`, `src/utils/feedback.js`, `src/utils/security.js`, `src/App.css`, `src/index.css`, `public/fontawesome.min.css`, `scripts/verify-zero-emojis.js`, `scripts/check-circular.js`, `scripts/audit-secrets.js`.
- **Key findings**:
  - `HouseProtectedRoute` in `RouteGuards.js` is the exact guard required for `/documenti`.
  - Icon system is FontAwesome 5: `fa-folder-open` and `fa-file-alt` exist; `fa-file-lines` (FA6) does NOT exist.
  - Desktop nav (`DesktopNavigation.js`) and mobile drawer (`MobileNavigation.js`) both need `/documenti` with `fa-folder-open`.
  - Dashboard `homeUtente.js` has a 5-item quick service grid; adding "Documenti" balances it to 6 items (3 rows of 2 on mobile).
  - Mobile touch targets in `App.css` need bump to >= 44px (`.burger-container`, `.mobile-close-btn`, `.theme-pill-toggle`).
  - Universal `:focus-visible` needs to be added to `App.css` for WCAG 2.4.7 AA keyboard accessibility.
  - Complete `ViewDocumenti.js` specification formulated with zero emojis, drag & drop, category pills, metadata strip, and ConfirmModal.
- **Unexplored areas**: None. All 5 assigned technical investigation topics are fully covered.

## Key Decisions Made
- Confirmed FontAwesome 5 icon `fa-folder-open` as the canonical navigation and brand icon for Documenti.
- Formulated complete zero-emoji icon mapping table for all document formats, categories, and actions.
- Published full 5-component handoff report to `handoff.md`.

## Artifact Index
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui/DISPATCH.md — Dispatch log
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui/progress.md — Liveness heartbeat and status
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui/BRIEFING.md — Persistent memory index
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui/handoff.md — Complete 5-section handoff report
