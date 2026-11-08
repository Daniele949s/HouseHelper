# Task Assignment: Replacement Worker M9 (Primary Views Modernization & Signature Elements)

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State folder: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m9_rep

## Files Owned Exclusively
- `src/pages/homeUtente.js`
- `src/pages/TurniPulizia/viewTurni.js`
- `src/pages/TurniPulizia/aggiuntaTurno.js`
- `src/pages/TurniPulizia/modificaTurno.js`
- `src/pages/Debiti/ViewDebiti.js`
- `src/pages/Debiti/AggiungiDebito.js`
- `src/pages/Spesa/ViewSpesa.js`
- `src/App.css` (view-specific classes and signature element styling)

## Mandatory Inputs & Reports to Read
1. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/daniele949/.agents/skills/frontend-design/SKILL.md`
3. `/home/daniele949/.agents/skills/apple-design/SKILL.md`
4. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
5. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3/handoff.md`

## Objectives for Milestone M9 ("Spend Your Boldness in One Place")

### 1. Dashboard (`src/pages/homeUtente.js`)
- **Signature Anchor**: The **Household Command Center Hero**. A unified, warm presence card uniting house identity, instant one-tap invite code token with visual feedback, active roommate presence avatars, and a quiet status pill ("Tocca a te oggi" or "Nessun turno oggi").
- **De-cluttering**: Remove uppercase CSS shouting (`textTransform: "uppercase"`) from cards/eyebrows and remove appended `<i className="fas fa-arrow-right"></i>` from button links.
- Remove duplicate icon inside `<h1>` (`Turni Pulizia <i className="fas fa-broom">`).
- Keep services grid clean and disciplined below the signature hero.

### 2. Cleaning Shifts (`src/pages/TurniPulizia/viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`)
- **Signature Anchor**: The **"Turno in Evidenza / Oggi tocca a..." Spotlight Card**. An elevated top card dedicated to the imminent shift with an interactive checklist ring and prominent assignee avatar.
- Future chores render as a calm chronological timeline with subtle date chips.
- Empty state: Include clear actionable CTA button: "Crea il primo turno" / "Nuovo Turno".
- Remove duplicate icon from `<h1>`.

### 3. Expenses & Debts (`src/pages/Debiti/ViewDebiti.js`, `AggiungiDebito.js`)
- **Signature Anchor**: The **Financial Ledger Hero & Minimal Settlement Card**. Refined typography showing personal net position (`+15.00 €` / `-10.00 €`) without background gradient washes, directly integrating the smart bipartite settlement plan ("Dai 10 € a Bob per saldare tutto").
- Transaction rows below remain clean, quiet receipts with clear timestamps.
- Modal Ergonomics: In `ViewDebiti.js`, add backdrop click-to-dismiss handler and `Escape` key dismiss listener to `.modal-backdrop`.
- Remove duplicate icon from `<h1>`.

### 4. Grocery List (`src/pages/Spesa/ViewSpesa.js`)
- **Signature Anchor**: The **Live Progress & Frequent Staples Hub**. A unified header featuring an Apple Reminders-style progress track (`4 su 9 presi`) flanked by frequent staple chips. Items render as tactile rows with fluid strike-through.
- **CRITICAL INVARIANT**: **DO NOT USE THE WORD "Dispensa" ANYWHERE IN `ViewSpesa.js`** (verified by `m9_challenger_visual_copy_stress.test.jsx:325`). Use "Scorte", "Articoli da acquistare", or "Casa ben rifornita".

### 5. Micro-copy & Invariant Safety Across All 4 Views
- Convert uppercase text to natural Italian sentence case.
- Preserve exact button query regexes tested by test suites:
  - `/Nuovo Turno/i`
  - `/Crea Turno/i`
  - `/Salva Spesa/i`
- Ensure all touch targets meet >= 44x44px.
- Zero emojis: 100% vector SVG / FontAwesome icons.

## Mandatory Verification Steps Before Handoff
1. `npm test -- --watchAll=false` must pass 100% (41 suites, 418 tests).
2. `npm run build` must compile cleanly with 0 errors.
3. `node scripts/verify-zero-emojis.js` must pass with 0 emojis/emoticons.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your completion handoff report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m9_rep/handoff.md`
Notify the orchestrator with `send_message` when done.


## 2026-11-08T22:03:32Z
You are assigned as the replacement worker to implement Milestone M9: Primary Views Modernization & Signature Elements ("Spend Your Boldness in One Place").
Read your full dispatch in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m9_rep/DISPATCH.md
And review:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/daniele949/.agents/skills/frontend-design/SKILL.md
- /home/daniele949/.agents/skills/apple-design/SKILL.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3/handoff.md

You own exclusively:
- src/pages/homeUtente.js
- src/pages/TurniPulizia/viewTurni.js, aggiuntaTurno.js, modificaTurno.js
- src/pages/Debiti/ViewDebiti.js, AggiungiDebito.js
- src/pages/Spesa/ViewSpesa.js
- src/App.css (for view styling and signature elements)

CRITICAL INVARIANT: DO NOT USE THE WORD "Dispensa" IN src/pages/Spesa/ViewSpesa.js!

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Run `npm test -- --watchAll=false`, `npm run build`, and `node scripts/verify-zero-emojis.js` to ensure 100% passing tests and clean builds.
Write your completion handoff report to:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m9_rep/handoff.md
Notify me via send_message when you are finished.
