# Task Assignment: Reviewer 1 — Milestone M10 Gate Verification

## Mission
Perform independent code and design review of Milestone M10 (Secondary Household Views, Modals & Micro-Copy Polish) in HouseHelper.
Working directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`
State directory: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_reviewer_m10_1`

## Key Inputs & References
- Authoritative request: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project specification: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
- Worker handoff report: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/handoff.md`
- Design skills: `/home/daniele949/.agents/skills/frontend-design/SKILL.md` and `/home/daniele949/.agents/skills/apple-design/SKILL.md`

## Verification Scope
1. **Frontend-Design Signature Elements & Visual Hierarchy**:
   - Bacheca (`src/pages/Bacheca/ViewBacheca.js`): Pinned Urgent Notice Banner (`.bacheca-pinned-section`) for urgent/important notes with warm hairline accent; paper-quiet routine notices (`.bacheca-routine-section`).
   - Calendario (`src/pages/Bacheca/ViewCalendario.js`): Desktop Split View (`.calendar-split-layout`, 2-column layout on >= 900px: calendar left, selected day agenda right; mobile stack).
   - Documenti (`src/pages/Documenti/ViewDocumenti.js`): House Vault & Category Cabinet with semantic format badges (coral PDF, violet images, blue docs) and natural sentence case category pills.
   - Contatti (`src/pages/Contatti/ViewContatti.js`): Emergency Speed-Dial Priority Shelf (`.emergency-priority-shelf`) in overview mode with gold hairline accent; standard directory grid below.
   - Autenticazione & SceltaCasa (`viewLogin.js`, `viewRegistrazione.js`, `homeAutenticazione.js`, `SceltaCasa.js`): House Hearth Badge (64x64px warm squircle) and two-lane onboarding cards.
2. **Apple HIG Ergonomics**:
   - Touch targets: Verify >= 44px min-height/min-width on all interactive elements (including `homeUtente.js:509` dismiss button and `ViewSpesa.js:287` staple chips).
   - Modal ergonomics: Verify backdrop click dismiss and `Escape` key dismiss in `ViewContatti.js` and other touched modals.
   - Liquid Glass discipline: Ensure `backdrop-filter` is strictly reserved for floating bars (`.app-topbar`, `.mobile-bottom-bar`, `.toast-item`, `.confirm-modal-backdrop`, `.modal-backdrop`) and NOT on cards.
3. **Mandatory Invariants & Technical Constraints**:
   - Zero emojis/emoticons across all 105 files (`node scripts/verify-zero-emojis.js`).
   - Strict zero "Dispensa" invariant in `src/pages/Spesa/ViewSpesa.js` (`grep -i "dispensa" src/pages/Spesa/ViewSpesa.js`).
   - 100% test pass rate (`npm test -- --watchAll=false`).
   - Clean production build (`npm run build`).

## Output Requirements
Write `handoff.md` in your state folder with:
- Observation (verified line numbers, code snippets, tool outputs)
- Logic Chain (technical rationale for review findings)
- Caveats & Risks
- Explicit Verdict: **APPROVE** or **REQUEST_CHANGES**
- Verification commands executed and results


## 2026-11-08T22:49:04Z
[Message] timestamp=2026-11-08T22:49:04Z sender=e169645e-9753-4a9d-a1c4-5a07a0406c31 priority=MESSAGE_PRIORITY_HIGH content=You are Reviewer 1 for Milestone M10 Gate Verification.
Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_reviewer_m10_1

Read your task assignment at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_reviewer_m10_1/DISPATCH.md
Read the authoritative request at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project specifications at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md
Read the worker handoff report at: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/handoff.md
Design skills to consult: /home/daniele949/.agents/skills/frontend-design/SKILL.md and /home/daniele949/.agents/skills/apple-design/SKILL.md

Perform independent code and design review of Milestone M10:
1. Verify frontend-design signature elements in secondary views (Bacheca pinned urgent banner, Calendario desktop 2-column split, Documenti vault format badges, Contatti emergency speed-dial shelf, Auth/SceltaCasa hearth badge).
2. Verify Apple HIG ergonomics (touch targets >= 44px, Liquid Glass discipline only on floating bars, modal backdrop & Escape dismiss).
3. Verify test pass (npm test -- --watchAll=false), clean build (npm run build), 0 emojis (node scripts/verify-zero-emojis.js), and zero "Dispensa" in ViewSpesa.js.

Write handoff.md in your state directory with an explicit verdict (APPROVE or REQUEST_CHANGES), and send a completion message to the caller via send_message.
