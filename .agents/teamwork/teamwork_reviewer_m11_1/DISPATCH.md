# Task Assignment: Reviewer 1 — Milestone M11 Final Pre-Release Verification

## Mission
Perform comprehensive pre-release design and technical review of HouseHelper for Milestone M11.
Working directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`
State directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_reviewer_m11_1`

## Key Inputs & References
- Authoritative request: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md` (including user's priority directive on secret scanning)
- Project specification: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
- Gate status ledger: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/GATE_STATUS.md`
- Skills: `/home/daniele949/.agents/skills/frontend-design/SKILL.md` and `/home/daniele949/.agents/skills/apple-design/SKILL.md`

## Verification Scope
1. **Public Repository Security Audit**:
   - Run `npm run audit:secrets` to scan all files and git commit history for credentials, tokens, and private keys. Verify exit code 0 and 0 leaks detected.
2. **Whole-App Design & Ergonomics Synthesis**:
   - Confirm all views (Dashboard, Turni, Debiti, Spesa, Bacheca, Calendario, Documenti, Contatti, Autenticazione, SceltaCasa) embody distinctive non-templated visual identity ("spend your boldness in one place").
   - Confirm Apple HIG compliance: system typography, contrast ratios >= 4.5:1, touch targets >= 44px, Liquid Glass strictly on floating bars, and Italian sentence-case copywriting.
3. **End-to-End Suite & Build**:
   - Run `npm test -- --watchAll=false` (verify 100% pass across all 43 suites and 460 tests).
   - Run `npm run build` (verify clean exit code 0).
   - Run `node scripts/verify-zero-emojis.js` (verify 0 emojis across all files).
   - Verify strictly 0 occurrences of "Dispensa" in `src/pages/Spesa/ViewSpesa.js`.

## Output Requirements
Write `handoff.md` in your state directory with:
- Observation (empirical commands and results)
- Logic Chain
- Explicit Verdict: **APPROVE** or **REQUEST_CHANGES**


## 2026-11-08T23:06:13Z
You are Reviewer 1 for Milestone M11 Final Pre-Release Verification.
Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_reviewer_m11_1

Read your task assignment at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_reviewer_m11_1/DISPATCH.md
Read the authoritative request at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project specifications at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md
Skills to consult: /home/daniele949/.agents/skills/frontend-design/SKILL.md and /home/daniele949/.agents/skills/apple-design/SKILL.md

Execute pre-release review:
1. Public repository security: run npm run audit:secrets and verify zero credentials, keys, or tokens leaked.
2. Full test suite: run npm test -- --watchAll=false (verify all 43 suites and 460 tests pass).
3. Production build: run npm run build (verify clean exit code 0).
4. Zero emojis: run node scripts/verify-zero-emojis.js (0 emojis across all files).
5. Invariant: verify strictly 0 occurrences of "Dispensa" in src/pages/Spesa/ViewSpesa.js.
6. Design & Ergonomics: confirm whole-app compliance with frontend-design distinctive visual hierarchy and Apple HIG standards.

Write handoff.md in your state directory with an explicit verdict (APPROVE or REQUEST_CHANGES), and send a completion message to the caller via send_message.
