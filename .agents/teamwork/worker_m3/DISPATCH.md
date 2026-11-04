## 2026-11-02T11:05:36Z
You are worker_m3, assigned to implement Milestone 3 of House Helper: Core Domain Pages UI/UX Modernization, Mascot Retirement & Non-Blocking Feedback.

Your working directory is:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m3/

Read these input documents FIRST before writing code:
1. ORIGINAL_REQUEST.md: /home/daniele949/.agents/teamwork/ORIGINAL_REQUEST.md
2. Project Plan & Architecture: /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
3. Auth & Dashboard Blueprint: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m3_auth_dash/analysis.md
4. Chores, Expenses & Grocery Blueprint: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m3_turni_debiti/analysis.md
5. Bulletin Board, Calendar & Mascot Blueprint: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m3_bacheca_cal/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Ownership:
You own exclusive write ownership of:
- `src/pages/Autenticazione/homeAutenticazione.js`, `viewLogin.js`, `viewRegistrazione.js`
- `src/pages/SceltaCasa.js`
- `src/pages/homeUtente.js`
- `src/pages/TurniPulizia/viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`
- `src/pages/Debiti/ViewDebiti.js`, `AggiungiDebito.js`
- `src/pages/Spesa/ViewSpesa.js`
- `src/pages/Bacheca/ViewBacheca.js`, `AggiungiNota.js`, `ModificaNota.js`, `ViewCalendario.js`, `AggiungiEvento.js`
- `src/components/InteractiveMascot.js` (fix kebab-case `stop-color` to `stopColor`)
- `src/App.css` (modern styling classes for cards, tags, badges, chips, balance hero, calendar agenda)

Detailed Objectives:
1. Modernize Authentication & Onboarding:
   - Clean, elevated card designs using CSS tokens (--bg-surface, --radius-lg, --shadow-md).
   - Unmount InteractiveMascot from homeAutenticazione, viewLogin, viewRegistrazione, and SceltaCasa.
   - Non-blocking showToast() for error/success messages.
   - Preserves all input names, placeholders, labels, and roles tested by auth_house.test.jsx.
2. Modernize Dashboard (`homeUtente.js`):
   - Mount `<HouseholdStatus />` in the header section.
   - Unmount `<MiniGuy />` to eliminate timer/canvas loops.
   - Display a responsive 4-card metric grid (Chores, Balance, Groceries, Notices) with clean FontAwesome icons.
   - Migrate "Esci dalla casa" button to use accessible `showConfirm` from `src/utils/feedback.js`.
3. Modernize Chores (`src/pages/TurniPulizia/`):
   - Date badges, roommate selection chips, zone tag chips.
   - Non-blocking `showToast` and `showConfirm` dialogs for shift deletion and alerts.
   - Strictly preserve DOM elements, buttons (`getByRole('button', { name: /Nuovo Turno/i })`), headings (level 3 for chore titles), and button titles (`Elimina`, `Modifica`).
4. Modernize Expenses & Debts (`src/pages/Debiti/`):
   - Net balance hero card, dual summary cards ("Devi ricevere", "Devi dare"), bilateral debt matrix.
   - Live split quota calculation preview in `AggiungiDebito.js`.
   - Preserve balance strings format (e.g. `+45.00 €`, `-30.00 €`, `0.00 €`) and button roles (`Segna come saldato`).
5. Modernize Grocery List (`src/pages/Spesa/ViewSpesa.js`):
   - Animated checklist items, progress bar, quick-add input bar.
   - Preserve exact placeholder (`Aggiungi prodotto da comprare`), button (`Aggiungi`), strike-through styles (`textDecoration: line-through`), and delete button title (`Rimuovi prodotto`).
6. Modernize Bulletin Board & Calendar (`src/pages/Bacheca/`):
   - Card grid with priority tags (`Urgente`, `Importante`, `Info`, `Promemoria`), author avatar badge, creation date.
   - Priority selector pills, character counters, non-blocking `showConfirm` and `showToast`.
   - Category tags for Calendar events, agenda schedule cards, polished empty state.
   - Remove `triggerConfetti()` calls.
7. Strict Zero-Emoji Compliance:
   - Use ONLY FontAwesome vector icons (`fas fa-...`). ZERO Unicode emojis, emoticons, or raw arrows.
8. Resolve DOM warnings:
   - In `src/components/InteractiveMascot.js`, change `stop-color` to `stopColor`.

Verification Requirements:
After making changes, run:
1. `node scripts/verify-zero-emojis.js` (MUST pass with 0 violations)
2. `node scripts/check-circular.js` (MUST pass with 0 cycles)
3. `npm test -- --watchAll=false` (ALL 21 test suites, 135+ tests MUST pass with 0 failures)
4. `npm run build` (MUST build cleanly without errors)

## 2026-11-02T11:15:57Z
**Context**: Milestone 3 Implementation
**Content**: Heartbeat and safety check. How is your implementation progressing across the domain pages and CSS extensions? Please update your progress.md or reply with your current step.
**Action**: Reply with your status or update progress.md.
