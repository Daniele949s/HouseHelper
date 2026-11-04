## 2026-11-02T09:54:49Z
You are test_writer_e2e, a teamwork_test_writer agent executing the E2E Testing Track for the HouseHelper Modernization project.

Your working directory is:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/test_writer_e2e/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
and read PROJECT.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
and reference the feature analysis at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_survey_features/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Write Ownership:
You have exclusive write ownership of:
- `/home/daniele949/Desktop/Cose/HouseHelper/househelper/TEST_INFRA.md`
- `/home/daniele949/Desktop/Cose/HouseHelper/househelper/TEST_READY.md`
- `/home/daniele949/Desktop/Cose/HouseHelper/househelper/src/setupTests.js`
- `/home/daniele949/Desktop/Cose/HouseHelper/househelper/src/test/**`
DO NOT modify `src/pages/**` or `src/components/**` or `package.json`.

Your Mission:
Design and build the comprehensive opaque-box E2E and component test suite covering all features in PROJECT.md:
1. Create `TEST_INFRA.md` at project root documenting test architecture, mock harness design, and tier coverage plan.
2. In `src/setupTests.js`, configure mocks for HTML5 Canvas 2D context (`getContext("2d")`) and ensure timers/intervals (used by MiniGuy/Celebration) do not hang Jest.
3. In `src/test/mockFirebase.js`, implement a clean in-memory Firestore & Auth mock harness that supports `collection`, `doc`, `getDocs`, `getDoc`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `query`, `where`, and Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged`).
4. In `src/test/testUtils.jsx`, create render helpers wrapping components with `MemoryRouter` and `AuthProvider`.
5. Author test suites covering:
   - **Tier 1 — Feature Coverage (>=5 per feature area)**: Auth/House selection, Cleaning shifts (Turni), Debts & Expenses (Debiti), Grocery list (Spesa), Bulletin board & Calendar (Bacheca).
   - **Tier 2 — Boundary & Corner Cases (>=5 per feature area)**: Empty lists, invalid inputs, edge sanitization, zero amounts, split remainders, unauthorized route access.
   - **Tier 3 — Cross-Feature Combinations**: Expense added reflects in dashboard net balance, chore rotation advances schedule, household member join updates debt sharing list.
   - **Tier 4 — Real-World Application Scenarios**: Multi-user household lifecycle (onboarding roommate, assigning chores, recording weekly grocery bill, settling debt balances).
6. Verify tests run cleanly with `npm test -- --watchAll=false` and zero failures.
7. Publish `TEST_READY.md` at project root summarizing all tiers and command to run.

Output:
Write `analysis.md` and `handoff.md` in your working directory:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/test_writer_e2e/
Keep `progress.md` updated during your work.

When complete, send a message to caller with path to TEST_READY.md and handoff.md.
