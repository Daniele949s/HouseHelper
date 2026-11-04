# BRIEFING — 2026-11-04T00:16:30Z

## Mission
Read-only technical investigation of Requirement R2: Automazione dei Turni & Manutenzione (Configurable Automatic Rotation, Vacation/Away Mode, Detailed Sub-Task Checklist, and Testing impact).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/
- Original parent: 539b9b5a-7c33-4552-8b8b-ccb1891086b8
- Milestone: M7

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Only write in working directory (/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/)
- No source code or tests in .agents/teamwork/
- All communication back to orchestrator must be sent via send_message

## Current Parent
- Conversation ID: 539b9b5a-7c33-4552-8b8b-ccb1891086b8
- Updated: 2026-11-04T00:16:30Z

## Investigation State
- **Explored paths**:
  - `src/pages/TurniPulizia/viewTurni.js`
  - `src/pages/TurniPulizia/aggiuntaTurno.js`
  - `src/pages/TurniPulizia/modificaTurno.js`
  - `src/pages/homeUtente.js`
  - `src/pages/SceltaCasa.js`
  - `src/contexts/AuthContext.js`
  - `src/utils/security.js`
  - `firestore.rules`
  - `src/test/mockFirebase.js`
  - `src/test/tier1_features/turni.test.jsx`
  - `src/test/tier2_boundaries/turni_boundary.test.jsx`
  - `src/test/tier3_interactions/cross_feature.test.jsx`
  - `src/components/HouseAnalytics.js`
  - `src/components/HouseholdStatus.js`
  - `scripts/verify-zero-emojis.js`, `scripts/check-circular.js`, `scripts/audit-secrets.js`
- **Key findings**:
  - Baseline verification: 30/30 suites pass (280/280 tests), 0 circular dependencies, 0 emojis/emoticons, 0 secrets.
  - Turni are currently static, non-recurring single documents with no subtasks or completion status.
  - `homeUtente.js` line 58 filters upcoming shifts using `data.utenteId === currentUser.uid` instead of checking `data.nomi` array; must be updated to match roommate username/uid.
  - `case/{casaId}` can store `impostazioniTurni` (allowed by firestore.rules update condition).
  - Vacation mode requires fields `inVacanza: boolean`, `vacanzaInizio: string (YYYY-MM-DD)`, `vacanzaFine: string (YYYY-MM-DD)` on `utenti/{userId}`.
  - Subtask checklist model `checklist: [{ id, text, completed, completedBy, completedAt }]` on `turni/{turnoId}` with `sanitizeChecklist` in `security.js`.
  - Atomic `updateDoc` field update avoids overwriting shift meta.
  - MockFirebase supports all required queries and mutations; minor schema validations can be added to `firestore.rules`.
- **Unexplored areas**: None for R2. Ready for comprehensive report synthesis.

## Key Decisions Made
- Design deterministic round-robin queue using sorted list of active roommates with vacation filter.
- Formulate concrete edge-case handling for "all roommates on vacation" (`sospeso: true`, alert notification).
- Use `YYYY-MM-DD` string format for vacation dates to align with existing `validateDate()` and prevent timezone discrepancies.
- Design sub-task checklist with preset task recommendations per cleaning zone (Cucina, Bagno, Salotto, Pattumiera).

## Artifact Index
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/DISPATCH.md — Incoming assignment
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/BRIEFING.md — Situational awareness
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/progress.md — Liveness heartbeat & task tracking
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/handoff.md — Final investigation report
