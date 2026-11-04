## 2026-11-04T00:49:19Z
Sender: 539b9b5a-7c33-4552-8b8b-ccb1891086b8
Content:
You are the Forensic Integrity Auditor (auditor_m7_1) for Milestone M7 of HouseHelper.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/auditor_m7_1/
Your mission is an independent, rigorous forensic integrity audit of all Milestone M7 deliverables.

MANDATORY READING:
- User Request: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- Scope Document: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m7/SCOPE.md
- Worker Handoff: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m7/handoff.md

INTEGRITY AUDIT MANDATE:
Perform systematic verification across all checks:
1. Anti-Cheat & Authenticity Check:
   - Check if any code files contain hardcoded test returns, mock-only facades, dummy implementations, or bypassed validations.
   - Verify that `src/utils/debtSimplification.js`, `src/utils/reportExport.js`, `src/utils/choreRotation.js`, `src/utils/offlineStorage.js`, `src/pages/Contatti/ViewContatti.js`, `src/pages/Debiti/ViewDebiti.js`, `src/pages/Debiti/AggiungiDebito.js`, `src/pages/TurniPulizia/viewTurni.js`, `src/pages/homeUtente.js` contain genuine, active, production logic.
2. Multi-Tenant Authorization Forensics (anti-IDOR):
   - Verify that every Firestore read, write, query, and rule strictly checks `casaId` to guarantee tenant isolation.
   - Verify that offline storage in `offlineStorage.js` keys by `casaId` and is purged on logout in `AuthContext.js`.
3. Secret & Credential Forensics:
   - Run `npm run audit:secrets` and perform static grep scans for API keys, tokens, passwords, private keys across git history and working tree.
4. Zero-Emoji & Emoticon Forensics:
   - Run `npm run check:emojis` and perform independent regex scans across `src/` and `public/` for any emojis, emoticons, or Unicode pictorial symbols.
5. Circular Dependency Forensics:
   - Run `npm run check:circular` to ensure 0 circular dependency cycles across `src/App.js` and `src/`.
6. Test Suite & Build Forensics:
   - Run `CI=true npm test -- --watchAll=false` and confirm all suites pass genuinely without skipped/disabled assertions.
   - Run `npm run build` and confirm production build succeeds without errors.

AUDIT VERDICT:
You must conclude with a BINARY VERDICT:
- CLEAN (zero integrity violations detected)
or
- INTEGRITY VIOLATION (with full evidence chain and file references)

Output: Write your complete forensic audit report to `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/auditor_m7_1/handoff.md` and notify orchestrator.
