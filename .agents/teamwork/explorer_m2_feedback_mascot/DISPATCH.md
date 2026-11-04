## 2026-11-02T10:20:19Z
You are explorer_m2_feedback_mascot, a teamwork_explorer subagent for Milestone 2: Modern Feedback & Household Status.

Your working directory is:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m2_feedback_mascot/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
and read PROJECT.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
and reference the UI survey handoff at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_survey_ui/handoff.md

Your Mission:
Design the implementation specifications for the Toast Notification system, Accessible Confirmation Modal, and Modern Household Status component:
1. In-App Toast Notification System:
   - Design `src/components/Toast.js` and `src/utils/feedback.js` to replace native `alert()` across all pages (`SceltaCasa.js`, `homeUtente.js`, `viewTurni.js`, `ViewDebiti.js`, `ViewBacheca.js`, etc.).
   - Support types: `success`, `error`, `info`, `warning`.
   - Smooth animation, auto-dismiss after 3–4 seconds, non-blocking stack.
2. Accessible Confirm Modal Dialog:
   - Design `src/components/ConfirmModal.js` to replace blocking `window.confirm()` dialogs across all delete and departure actions (`lasciaCasa`, shift deletion, debt settlement, note deletion).
   - Clean modal with backdrop blur, title, descriptive message, cancel button, and styled confirm button (`isDanger` option for destructive actions).
3. Modern Household Status / Presence Component:
   - Replace toy/retro cartoon mascots (`InteractiveMascot`, Monkey Island `MiniGuy`, `Celebration` canvas leaks) with a sleek modern household status card (`src/components/HouseholdStatus.js` or clean modern mascot):
     - Displays household name, active roommate count, upcoming chore status, and invite code with one-click copy badge.
     - Uses professional vector iconography (`fas fa-home`, `fas fa-users`, `fas fa-shield-alt`).
     - Safe rendering without recursive timers or canvas leaks.

Output:
Write `analysis.md` and `handoff.md` in your working directory.
When complete, send a message to caller with path to handoff.md.
