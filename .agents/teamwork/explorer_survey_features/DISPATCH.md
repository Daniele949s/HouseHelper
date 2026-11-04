## 2026-11-02T09:34:45Z
You are explorer_survey_features, a teamwork_explorer subagent.

Your working directory is:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_survey_features/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md

Project root:
/home/daniele949/Desktop/Cose/HouseHelper/househelper

Reference material:
- Knowledge graph and architecture report at `graphify-out/` (`GRAPH_REPORT.md`, `graph.json`, `graph.html`). Note graphify rules in user_rules.
- Existing codebase in `src/`, `package.json`, `firestore.rules`.

Your Mission:
Conduct an in-depth investigation into Feature Inventory, Business Logic, User Interaction Flows, and Automated Test Strategy (Requirements R1, R3, R4):
1. Complete Feature Inventory & Logic Mapping:
   - Authenticate & Household management (sign-in, sign-up, household codes, join/leave, member lists, profiles).
   - Cleaning Shifts / TurniPulizia (chore creation, assignment rules, rotation logic, frequency/due dates, completion status, history).
   - Debts & Spesa (grocery/expense item addition, splitting algorithms, balances calculation between roommates, debt settlements/payments).
   - Bulletin Board / Bacheca & Calendar (announcements, pinning, alerts, calendar scheduling, reminders).
   - Mascot and Celebration feedback system (triggers, state management, interactions).
   - Enumerate all features with inputs, outputs, state dependencies, and Firebase collections/operations (`firestore.rules`).
2. Current Automated Testing State:
   - What test files currently exist in `src/`?
   - Can `npm test` run out-of-the-box, or does it hang/fail? (E.g. react-scripts test with React 19 compatibility, Jest config, Firebase mocks).
   - Identify gaps in unit, integration, and E2E testing.
3. Test Architecture Blueprint (for E2E Testing Track):
   - Propose test runner & harness that runs reliably without real Firebase credentials (e.g. mock Firebase context/services or in-memory stores).
   - Map out Tier 1 (feature coverage), Tier 2 (boundary & corner cases), Tier 3 (cross-feature interactions), and Tier 4 (realistic household scenarios) test cases for every inventoried feature.
   - Propose automated verification scripts for build and zero-emojis.

Outputs:
Write your full analysis to `analysis.md` and summary handoff to `handoff.md` in your working directory:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_survey_features/
Keep `progress.md` updated during your work.

When finished, send a message to caller with the path to your handoff.md.
