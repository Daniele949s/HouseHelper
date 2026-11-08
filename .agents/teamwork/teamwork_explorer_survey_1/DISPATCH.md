# Task Assignment: Survey Explorer 1 (CSS Tokens, Themes, Colors, Shadows & Liquid Glass)

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State folder: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_1

## Objective
Thoroughly investigate HouseHelper's current design system, CSS architecture, token definitions, light/dark themes, typography scale, borders, and shadows. Evaluate them against the frontend-design and apple-design skills. Identify all areas needing renewal to create an attractive, simple, intuitive, distinctive, and modern production UI.

## Required Reading
1. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/daniele949/.agents/skills/frontend-design/SKILL.md`
3. `/home/daniele949/.agents/skills/apple-design/SKILL.md`
4. `src/App.css`, `src/index.css`, `src/contexts/ThemeContext.js`, and all CSS styling throughout the codebase.

## Scope of Investigation
1. **Design Tokens & Palette**:
   - Current CSS variables in `:root` and `[data-theme='dark']`.
   - Contrast ratios (evaluate text against backgrounds according to Apple HIG: 4.5:1 for body/small text, 3:1 for large/bold text).
   - Formulate a distinctive color palette (4-6 named roles, avoiding generic AI defaults such as flat cream/terracotta or acid green).
2. **Typography & Hierarchy**:
   - Font family stack (system fonts vs modern clean sans-serif), weights, letter spacing, line height.
3. **Borders, Radii & Layered Shadows**:
   - Current shadows vs soft, multi-layered realistic depth (ambient + directional shadows).
   - Border radius scale and subtle border accents (`border: 1px solid var(--border-color)`).
4. **Liquid Glass & Materials Discipline**:
   - Where blur/glass is currently used vs where it SHOULD be according to Apple HIG (only on floating functional elements such as topbars and bottom navigation, NEVER in general card content).

## Output Deliverable
Write your comprehensive investigation report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_1/handoff.md`
When finished, notify the orchestrator with `send_message`.

## 2026-11-08T13:31:02Z
You are assigned to investigate HouseHelper's current design system, CSS architecture, token definitions, light/dark themes, typography scale, borders, layered shadows, and Liquid Glass usage.
Read your task description in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_1/DISPATCH.md
And read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/daniele949/.agents/skills/frontend-design/SKILL.md
- /home/daniele949/.agents/skills/apple-design/SKILL.md
- src/App.css, src/index.css, src/contexts/ThemeContext.js, and all CSS styling in the project.
Investigate the codebase thoroughly and write your handoff report to:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_1/handoff.md
Notify me via send_message when you are done.
