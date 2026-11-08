# Task Assignment: Forensic Auditor — Milestone M10 Forensic Integrity Verification

## Mission
Perform independent forensic integrity verification of Milestone M10 (Secondary Household Views, Modals & Micro-Copy Polish).
Working directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`
State directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_auditor_m10`

## Key Inputs & References
- Authoritative request: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project specification: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
- Worker handoff report: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/handoff.md`

## Forensic Verification Scope
1. **Source Code & Git Diff Forensics**:
   - Inspect git diff across all files touched by M10 (`src/pages/Bacheca/`, `src/pages/Documenti/`, `src/pages/Contatti/`, `src/pages/Autenticazione/`, `src/pages/SceltaCasa.js`, `src/pages/homeUtente.js`, `src/pages/Spesa/ViewSpesa.js`, `src/App.css`).
   - Check for hardcoded test outputs, dummy implementations, facades, shortcuts, or weakened assertions.
   - Verify that all visual structures (`.bacheca-pinned-section`, `.calendar-split-layout`, `.emergency-priority-shelf`, format badges, Hearth Badge, touch targets) are genuinely implemented with authentic React state and CSS styling.
2. **Strict Invariant Checks**:
   - Zero emojis/emoticons across all files: execute `node scripts/verify-zero-emojis.js`.
   - Strict zero "Dispensa" invariant: run `grep -i "dispensa" src/pages/Spesa/ViewSpesa.js` (must return 0 matches).
3. **Execution & Build Validation**:
   - Run `npm test -- --watchAll=false` and verify 100% of suites and tests pass with genuine assertions.
   - Run `npm run build` and verify clean exit code 0 with 0 errors and 0 warnings.

⚠️ **HARD VETO**: If any integrity violation, cheating, hardcoding, or test tampering is detected, report **INTEGRITY VIOLATION**. If all code is authentic and verified, report **CLEAN**.

## Output Requirements
Write `handoff.md` in your state folder with:
- Observation (git diff analysis, forensic checks, tool outputs)
- Logic Chain (evaluation of authenticity)
- Explicit Verdict: **CLEAN** or **INTEGRITY VIOLATION**
- Verification commands executed and results


## 2026-11-08T22:49:22Z
You are the Forensic Integrity Auditor for Milestone M10 Gate Verification.
Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_auditor_m10

Read your task assignment at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_auditor_m10/DISPATCH.md
Read the authoritative request at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project specifications at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md
Read the worker handoff report at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/handoff.md

Conduct a thorough forensic integrity verification of Milestone M10:
1. Examine git diff across all files touched by M10. Detect any hardcoding, test facades, cheating, dummy implementations, or weakened test assertions. Verify that all components, layout structures, and styling are authentic and fully functional.
2. Invariants: verify strictly zero emojis across all files (node scripts/verify-zero-emojis.js) and strictly zero occurrences of "Dispensa" in src/pages/Spesa/ViewSpesa.js.
3. Execution: run npm test -- --watchAll=false (must pass 100%) and npm run build (must succeed with 0 errors and 0 warnings).

Your verdict is a HARD BINARY VETO:
- Report CLEAN if all implementations are authentic and verified.
- Report INTEGRITY VIOLATION if any cheating, facade, or hardcoding is found.

Write handoff.md in your state directory with your detailed forensic findings and explicit verdict, and send a completion message to the caller via send_message.
