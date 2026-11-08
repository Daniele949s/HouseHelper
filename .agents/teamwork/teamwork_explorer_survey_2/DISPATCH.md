# Task Assignment: Survey Explorer 2 (Navigation Architecture, Mobile & Desktop Ergonomics)

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State folder: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_2

## Objective
Investigate HouseHelper's navigation structure, responsiveness, and ergonomics across mobile and desktop devices. Evaluate against Apple HIG guidelines (mobile touch targets >= 44px, safe area padding, one-handed reach with `MobileBottomBar`, desktop multi-column organization, persistent sidebar/navigation, and cursor hover feedback).

## Required Reading
1. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/daniele949/.agents/skills/frontend-design/SKILL.md`
3. `/home/daniele949/.agents/skills/apple-design/SKILL.md`
4. Navigation components: `src/components/DesktopNavigation.js`, `MobileNavigation.js`, `AppHeader.js`, and layout structure across all pages (`homeUtente.js`, `TurniPulizia/`, `Debiti/`, `Spesa/`, `Bacheca/`, `Documenti/`, `Contatti/`, `Autenticazione/`, `SceltaCasa.js`).

## Scope of Investigation
1. **Mobile Ergonomics**:
   - Check mobile bottom navigation: does `MobileBottomBar` exist or is there a drawer/hamburger? If `MobileBottomBar` is required by R2, how should it be built or refined?
   - One-handed thumb reachability: key actions positioned mid-screen or lower.
   - Touch target dimensions: verify all buttons, links, icon controls meet the >= 44x44px minimum touch target size.
   - Safe areas: support for `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
2. **Desktop Ergonomics**:
   - Persistent sidebar or top navigation, wide layout utilization (multi-column vs narrow centered column).
   - Cursor feedback: smooth hover states, cursor: pointer, keyboard focus rings (`:focus-visible`).
3. **Cross-device Layouts & Transitions**:
   - Responsive breakpoints, transitions between desktop and mobile.

## Output Deliverable
Write your comprehensive investigation report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_2/handoff.md`
When finished, notify the orchestrator with `send_message`.


## 2026-11-08T13:31:07Z
You are assigned to investigate HouseHelper's navigation structure, mobile and desktop ergonomics, touch targets (>=44px), safe areas, one-handed reach with MobileBottomBar, and desktop multi-column/hover states.
Read your task description in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_2/DISPATCH.md
And read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/daniele949/.agents/skills/frontend-design/SKILL.md
- /home/daniele949/.agents/skills/apple-design/SKILL.md
- Navigation components: src/components/DesktopNavigation.js, MobileNavigation.js, AppHeader.js, and all page layouts in src/pages/.
Investigate the codebase thoroughly and write your handoff report to:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_2/handoff.md
Notify me via send_message when you are done.
