# Task Assignment: Challenger 2 — Milestone M10 Adversarial Ergonomics & Invariant Verification

## Mission
Perform code-executing adversarial challenge focusing on Apple HIG ergonomics, accessibility invariants, Liquid Glass discipline, and system stability under stress.
Working directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`
State directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_challenger_m10_2`

## Key Inputs & References
- Authoritative request: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project specification: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
- Worker handoff report: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/handoff.md`

## Adversarial Challenge Scope
Write and execute an automated stress test script or test suite to rigorously challenge:
1. **Liquid Glass & Card Background Discipline**:
   - Verify that NO domain card (`.domain-page-card`, `.bacheca-card`, `.documento-card`, `.contatto-card`, `.scelta-card`, `.login-card`) has `backdrop-filter` or blur applied. Verify blur is strictly confined to `.app-topbar`, `.mobile-bottom-bar`, `.toast-item`, `.confirm-modal-backdrop`, `.modal-backdrop`.
2. **Keyboard Ergonomics & Event Teardown**:
   - Stress-test modal open/close cycle via `Escape` key 50+ times to ensure no listener leaks, memory growth, or duplicate event listeners.
3. **Contrast & Typography**:
   - Verify text contrast on secondary views and badge elements meets WCAG AA (>= 4.5:1).
4. **Mandatory Invariants**:
   - Zero emojis/emoticons across all 105 files (`node scripts/verify-zero-emojis.js`).
   - Zero occurrences of "Dispensa" in `src/pages/Spesa/ViewSpesa.js`.
   - Full test suite passes 100% (`npm test -- --watchAll=false`).
   - Clean production build (`npm run build`).

## Output Requirements
Write `handoff.md` in your state folder with:
- Observation (empirical results, commands run, test script written, assert counts)
- Logic Chain (stress methodology and findings)
- Explicit Verdict: **CONFIRMED** (all challenges passed) or **REJECTED** (vulnerabilities/regressions found)
- Verification commands executed and results


## 2026-11-08T22:49:17Z
You are Challenger 2 for Milestone M10 Gate Verification.
Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_challenger_m10_2

Read your task assignment at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_challenger_m10_2/DISPATCH.md
Read the authoritative request at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project specifications at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md
Read the worker handoff report at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/handoff.md

Write and execute an automated stress test script or test suite to empirically challenge:
1. Liquid Glass & card background discipline: verify that no content card has backdrop-filter/blur applied; verify blur is strictly confined to floating bars (.app-topbar, .mobile-bottom-bar, .toast-item, .confirm-modal-backdrop, .modal-backdrop).
2. Keyboard ergonomics & event teardown: stress-test modal open/close cycle via Escape key 50+ times to ensure zero memory leaks, duplicate listeners, or unhandled errors.
3. Contrast and typography WCAG AA compliance (>= 4.5:1) on secondary views and badge elements.
4. Verify strictly 0 occurrences of "Dispensa" in src/pages/Spesa/ViewSpesa.js.
5. Verify 0 emojis/emoticons across 105 files (node scripts/verify-zero-emojis.js).
6. Run npm test -- --watchAll=false and npm run build.

Write handoff.md in your state directory with an explicit verdict (CONFIRMED or REJECTED), and send a completion message to the caller via send_message.
