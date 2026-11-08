# BRIEFING — 2026-11-08T15:07:00Z

## Mission
Implement Milestone M9: Primary Views Modernization & Signature Elements ("Spend Your Boldness in One Place") for HouseHelper, delivering distinctive, Apple HIG compliant, zero-emoji, 100% test-passing interfaces.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
- State folder: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m9
- Original parent: e169645e-9753-4a9d-a1c4-5a07a0406c31
- Milestone: M9

## 🔒 Key Constraints
- Files owned exclusively:
  - `src/pages/homeUtente.js`
  - `src/pages/TurniPulizia/viewTurni.js`
  - `src/pages/TurniPulizia/aggiuntaTurno.js`
  - `src/pages/TurniPulizia/modificaTurno.js`
  - `src/pages/Debiti/ViewDebiti.js`
  - `src/pages/Debiti/AggiungiDebito.js`
  - `src/pages/Spesa/ViewSpesa.js`
  - `src/App.css` (view styling & signature elements)
- CRITICAL INVARIANT: DO NOT USE THE WORD "Dispensa" in `src/pages/Spesa/ViewSpesa.js`!
- Zero emojis: 0 Unicode emojis, 0 raw arrows, 0 raw checkmarks, 0 text emoticons.
- 100% passing test suite: `npm test -- --watchAll=false` (418+ tests).
- Clean build: `npm run build` exits 0.
- Liquid Glass discipline: no backdrop-filter blur on content cards (reserved only for floating functional layers).
- Ergonomics: Touch targets >= 44x44px.
- De-cluttering: Remove uppercase CSS shouting (`textTransform: "uppercase"`), remove duplicate icons in `<h1>`, remove appended `fa-arrow-right` icons.
- Preserve button regex queries: `/Nuovo Turno/i`, `/Crea Turno/i`, `/Salva Spesa/i`.

## Current Parent
- Conversation ID: e169645e-9753-4a9d-a1c4-5a07a0406c31
- Updated: 2026-11-08T15:07:00Z

## Task Summary
- **What to build**:
  1. Dashboard (`homeUtente.js`): Household Command Center Hero (presence, house identity, instant invite code copy token, roommate avatars, quiet status pill); declutter services grid.
  2. Cleaning Shifts (`viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`): Spotlight Card ("Turno in Evidenza / Oggi tocca a...") with interactive checklist ring & assignee avatar; calm chronological timeline for future chores; actionable CTA in empty state ("Crea il primo turno").
  3. Expenses & Debts (`ViewDebiti.js`, `AggiungiDebito.js`): Financial Ledger Hero & Minimal Settlement Card (clean net typography, no gradient washes, bipartite settlement plan integration); modal backdrop dismiss & Escape listener.
  4. Grocery List (`ViewSpesa.js`): Live Progress & Frequent Staples Hub (Reminders-style progress track, frequent staple chips, tactile strike-through, ZERO "Dispensa").
  5. Styling in `src/App.css` to support these signature elements cleanly without bloat.
- **Success criteria**: All 418 unit & stress tests pass, clean build, zero emojis verified.
- **Interface contracts**: PROJECT.md token contract, HIG contrast, touch target >= 44px.
- **Code layout**: React 19 SPA in `src/`.

## Key Decisions Made
- Preserving all existing state management, hooks, and test ids/roles/regexes while upgrading the visual hierarchy.
- Applying "Spend Your Boldness in One Place": 1 hero/spotlight per view, surrounding controls calm and disciplined.

## Artifact Index
- `.agents/teamwork/teamwork_worker_m9/DISPATCH.md` — Dispatch instructions
- `.agents/teamwork/teamwork_worker_m9/BRIEFING.md` — Working memory and context
- `.agents/teamwork/teamwork_worker_m9/progress.md` — Liveness heartbeat and step tracker
- `.agents/teamwork/teamwork_worker_m9/handoff.md` — Completion report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending first pass
- **Pending issues**: None

## Quality Status
- **Build/test result**: Baseline passing (41 suites, 418 tests)
- **Lint status**: Clean
- **Tests added/modified**: Keeping all existing tests passing; validating against adversarial tests

## Loaded Skills
- **Source**: `/home/daniele949/.agents/skills/frontend-design/SKILL.md`
  - **Local copy**: `.agents/teamwork/teamwork_worker_m9/skills/frontend-design.md`
  - **Core methodology**: Distinctive visual design, "spend your boldness in one place", avoid AI tells/SaaS clones, intentional typography and sentence case copy.
- **Source**: `/home/daniele949/.agents/skills/apple-design/SKILL.md`
  - **Local copy**: `.agents/teamwork/teamwork_worker_m9/skills/apple-design.md`
  - **Core methodology**: Apple Human Interface Guidelines, Liquid Glass discipline, touch targets >= 44px, accessibility contrasts, keyboard/modal ergonomics.
