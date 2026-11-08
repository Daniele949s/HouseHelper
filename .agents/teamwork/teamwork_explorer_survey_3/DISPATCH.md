# Task Assignment: Survey Explorer 3 (Cards, Distinctiveness, Micro-copy, Iconography & Modals)

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State folder: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3

## Objective
Investigate all UI cards, interactive components, modal dialogs, feedback mechanisms, iconography, and copywriting across all views of HouseHelper. Evaluate them against frontend-design ("spend your boldness in one place", non-templated cards, intentional layout) and apple-design (Italian micro-copy, clear hierarchy, feedback in-flow, SVG iconography, zero emojis).

## Required Reading
1. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/daniele949/.agents/skills/frontend-design/SKILL.md`
3. `/home/daniele949/.agents/skills/apple-design/SKILL.md`
4. Core views: `src/pages/homeUtente.js`, `TurniPulizia/`, `Debiti/`, `Spesa/`, `Bacheca/`, `Documenti/`, `Contatti/`, `Autenticazione/`, and components (`Toast.js`, `ConfirmModal.js`, `HouseholdStatus.js`).

## Scope of Investigation
1. **Cards & Visual Distinctiveness ("Spend your boldness in one place")**:
   - Current card styling: identify repetitiveness/SaaS clone syndrome across views.
   - For each primary view (Dashboard, Turni, Debiti, Spesa, Bacheca, Documenti, Contatti), identify or propose the single memorable, signature element that gives the page its character while keeping surrounding controls quiet and clean.
2. **Iconography & Zero-Emoji Enforcement**:
   - Verify current icon usage (FontAwesome SVG, custom inline SVG).
   - Ensure 0 emojis/emoticons exist or could be introduced.
3. **Micro-copywriting & Tone**:
   - Review Italian labels, headers, button text, error messages, and empty states.
   - Check against Apple & frontend-design copy rules: active voice, simple, direct, natural Italian, sentence case, no technical jargon or system internals, informative empty states.
4. **Dialogs & Feedback**:
   - Confirm non-blocking feedback (`Toast`, `ConfirmModal`) is styled elegantly with appropriate borders, elevation, and accessibility focus.

## Output Deliverable
Write your comprehensive investigation report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3/handoff.md`
When finished, notify the orchestrator with `send_message`.


## 2026-11-08T13:31:13Z
[Message] timestamp=2026-11-08T13:31:13Z sender=e169645e-9753-4a9d-a1c4-5a07a0406c31 priority=MESSAGE_PRIORITY_HIGH content=You are assigned to investigate HouseHelper's cards, visual distinctiveness ('spend your boldness in one place'), micro-copywriting in Italian, zero-emoji enforcement, and feedback/modal components.
Read your task description in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3/DISPATCH.md
And read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/daniele949/.agents/skills/frontend-design/SKILL.md
- /home/daniele949/.agents/skills/apple-design/SKILL.md
- Views in src/pages/ and feedback components (Toast.js, ConfirmModal.js, HouseholdStatus.js).
Investigate the codebase thoroughly and write your handoff report to:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3/handoff.md
Notify me via send_message when you are done.
