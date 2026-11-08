# Task Assignment: Forensic Auditor — Milestone M11 Final Pre-Release Integrity Audit

## Mission
Conduct comprehensive forensic integrity and security audit for Milestone M11 (Final Design Audit, Secret Security Audit & Pre-Release Verification).
Working directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`
State directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_auditor_m11`

## Key Inputs & References
- Authoritative request: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md` (priority user directive on secret audit)
- Project specification: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
- Gate status ledger: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/GATE_STATUS.md`

## Forensic Verification Scope
1. **Public Repository Secret Leak Audit**:
   - Execute `npm run audit:secrets`.
   - Perform forensic pattern matching across repository and commit history for hardcoded API keys, private keys, service account credentials, personal access tokens, or sensitive user data.
   - Confirm 100% clean status with zero secrets detected.
2. **Authenticity & Anti-Cheating Forensics**:
   - Inspect repository changes to ensure all design, styling, and functionality updates are genuine with zero hardcoded mock returns, zero test facades, zero skipped tests, and zero weakened assertions.
3. **Execution & Build Validation**:
   - Execute `npm test -- --watchAll=false` and verify 100% test pass rate across all 43 suites and 460 tests.
   - Execute `npm run build` and verify clean exit code 0.
   - Execute `node scripts/verify-zero-emojis.js` and verify zero emojis across all 107 files.
   - Verify strictly zero occurrences of "Dispensa" in `src/pages/Spesa/ViewSpesa.js`.

⚠️ **HARD VETO**: If any integrity violation, cheating, or secret leak is detected, report **INTEGRITY VIOLATION**. If all code is authentic and verified, report **CLEAN**.

## Output Requirements
Write `handoff.md` in your state directory with:
- Observation (git analysis, secret scan output, tool outputs)
- Logic Chain
- Explicit Verdict: **CLEAN** or **INTEGRITY VIOLATION**


## 2026-11-08T23:06:34Z
You are the Forensic Integrity Auditor for Milestone M11 Final Pre-Release Verification.
Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_auditor_m11

Read your task assignment at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_auditor_m11/DISPATCH.md
Read the authoritative request at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project specifications at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md

Conduct final pre-release forensic audit:
1. Public repository secret leak audit: execute npm run audit:secrets; inspect commit history and working tree for private keys, credentials, or personal access tokens. Confirm 100% clean.
2. Authenticity forensics: verify that all design, tokens, components, and tests across Milestones M8, M9, M10, M11 are authentic without dummy facades or shortcuts.
3. Execution verification: execute npm test -- --watchAll=false (verify all 43 suites and 460 tests pass) and npm run build (verify clean exit code 0).
4. Zero-emoji check: execute node scripts/verify-zero-emojis.js across all 107 files.
5. Invariant check: verify strictly 0 occurrences of "Dispensa" in src/pages/Spesa/ViewSpesa.js.

Your verdict is a HARD BINARY VETO:
- Report CLEAN if all checks pass and zero secrets or integrity violations exist.
- Report INTEGRITY VIOLATION if any secret leak, facade, or tampering is detected.

Write handoff.md in your state directory with your detailed forensic findings and explicit verdict, and send a completion message to the caller via send_message.
