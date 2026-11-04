## 2026-11-03T15:19:21Z
You are the Forensic Integrity Auditor for Milestone M6.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/auditor_m6_1/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md located at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md

Also read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m6/SCOPE.md
- Worker handoff report: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m6/handoff.md

Your role is FORENSIC INTEGRITY AUDITING:
1. Genuine implementation check: Verify NO hardcoded test results, facade implementations, mock shortcuts in source code, or fake test passes.
2. Security rules check: Verify genuine `storage.rules` at repo root with version 2 multi-tenant security rules.
3. Component and service check: Verify genuine implementation in `src/pages/Documenti/ViewDocumenti.js` and `src/services/documentiService.js`.
4. Secret audit: Verify 0 secrets across files and git history (`node scripts/audit-secrets.js`).
5. Zero-emoji audit: Verify 0 emojis across all codebase files (`node scripts/verify-zero-emojis.js`).
6. Circular dependency audit: Verify 0 circular dependencies (`node scripts/check-circular.js`).
7. Test suite integrity: Run `CI=true npm test -- --watchAll=false` and confirm genuine 100% pass rate.
8 Build verification: Run `npm run build` and confirm 0 errors.

Deliver a binary verdict: CLEAN or INTEGRITY VIOLATION in:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/auditor_m6_1/handoff.md`

Update your `progress.md` with timestamps as you proceed. When finished, send a message to the orchestrator with your verdict and path to handoff.md.
