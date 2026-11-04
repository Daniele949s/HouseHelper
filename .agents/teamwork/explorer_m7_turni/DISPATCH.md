## 2026-11-04T00:11:44Z
You are Explorer 2 (explorer_m7_turni) for Milestone M7 of HouseHelper.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/
Your task is a READ-ONLY technical investigation of Requirement R2: Automazione dei Turni & Manutenzione.

MANDATORY: Read the full user request first at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Also inspect /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md

Investigate and document:
1. Configurable Automatic Rotation:
   - Current implementation of chore assignment and scheduling in `src/pages/TurniPulizia/` (`viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`).
   - How house settings are stored in Firestore (`case/{casaId}`).
   - Design the configurable automatic rotation (weekly/cyclical) mechanism. How is rotation triggered: on chore completion, on time boundary (e.g. week start), or on demand?
   - How roommates are rotated in a deterministic round-robin queue while respecting active status.
2. Vacation / Away Mode ("In Vacanza / Fuori Casa"):
   - How user profile data is structured in Firestore (`utenti/{userId}`) and `AuthContext.js`.
   - Adding vacation status fields: `inVacanza: boolean`, `vacanzaInizio: timestamp/string`, `vacanzaFine: timestamp/string`.
   - UI controls in profile/dashboard (`homeUtente.js`) allowing the roommate to toggle vacation mode and pick dates.
   - Exclusion logic: during chore creation and automatic rotation, verify that users currently on vacation are automatically skipped and the chore is assigned to the next available active roommate. What happens if all roommates are on vacation? (Edge case handling).
3. Detailed Sub-Task Checklist:
   - Data model for checklist items on each chore: `checklist: [{ id, text, completed: boolean, completedBy?: string, completedAt?: timestamp }]`.
   - UI in `viewTurni.js` and/or modal: interactive checkboxes for each sub-task (e.g. "pulire fornelli", "svuotare cestino", "lavare pavimento").
   - Real-time Firestore synchronization: updating sub-task state without race conditions or overwriting other chore fields.
   - Sanitize checklist item text via `src/utils/security.js` (anti-XSS).
4. Testing & Mock Harness impact:
   - Check what additions are needed in `src/test/mockFirebase.js` and test suites to verify rotation, vacation exclusion, and checklist persistence.

Output:
Write your structured findings to `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_turni/handoff.md`.
Update `progress.md` with your status.
When finished, send a message to the orchestrator.
