## 2026-11-03T13:16:45Z
You are worker_m5, a versatile worker (teamwork_worker).
Your working directory is /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m5/
The project root is /home/daniele949/Desktop/Cose/HouseHelper/househelper

MANDATORY FIRST STEP: Read /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m5/DISPATCH.md, /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md, /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_rules/handoff.md, and /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_secrets/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership (You exclusively own):
- firestore.rules
- scripts/audit-secrets.js
- package.json
- .gitignore

Task:
Implement Milestone M5 (Requirement R3):
1. Replace firestore.rules at project root with the hardened production specification designed by explorer_m5_rules (in /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_rules/handoff.md). Enforce strict household scoping, anti-tamper constraints, dual-type money validation, bounded string validations, and schema checks across case, utenti, turni, debiti, spesa, note, and documenti.
2. Deploy scripts/audit-secrets.js using the implementation from /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_secrets/scripts_audit-secrets.js. Ensure it scans working tree files and git commit history with streaming child_process.spawn, zero memory buffer limits, deterministic exit codes (0 for clean), and zero emojis.
3. Update package.json to bind `"audit:secrets": "node scripts/audit-secrets.js"`.
4. Update .gitignore with recommended patterns for credential exclusion (*.key, *.pem, *serviceAccount*.json, *credentials*.json, firebase-adminsdk*.json, *.sqlite, etc.).
5. Run and verify all verification commands:
   - node scripts/audit-secrets.js (must exit 0)
   - node scripts/verify-zero-emojis.js (must exit 0)
   - node scripts/check-circular.js (must exit 0)
   - npm run build (must compile cleanly with exit 0)
   - CI=true npm test -- --watchAll=false (all test suites and tests must pass)

Deliverables:
Write handoff.md in /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m5/ with:
- Summary of implemented files and modifications
- Execution output of all 5 verification commands
- Layout compliance confirmation
Then send a message to orchestrator with your results.
