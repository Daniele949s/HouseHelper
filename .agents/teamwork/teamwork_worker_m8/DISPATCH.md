# Task Assignment: Worker M8 (Design Tokens, CSS Architecture, Ergonomics & Shell Layout)

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State folder: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m8

## Files Owned Exclusively
- `src/index.css`
- `src/App.css`
- `public/index.html`
- `src/App.js` (for fixing `--color-text-muted` typo on line 75)

## Mandatory Inputs & Reports to Read
1. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/daniele949/.agents/skills/frontend-design/SKILL.md`
3. `/home/daniele949/.agents/skills/apple-design/SKILL.md`
4. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
5. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_1/handoff.md`
6. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_2/handoff.md`

## Objectives for Milestone M8

### 1. Token & Contrast Calibration (`src/index.css` & `src/App.css`)
- Calibrate `--text-caption` in dark theme from `#64748b` to `#94a3b8` (achieving 6.52:1, WCAG AA compliant).
- In `src/App.css`, replace hardcoded `#f87171` in `.error-alert` with `var(--color-danger-text)` (compliant across themes).
- In `src/components/HouseAnalytics.css:398` or `App.css`, ensure `.summary-pill.da-comprare .pill-val` uses `var(--color-primary-text)` instead of hardcoded `#0284c7`.
- Fix `var(--color-text-muted)` to `var(--text-muted)` in `src/App.js:75`.
- Bind `--font-family-display: 'Outfit', var(--font-family-sans);` in `src/index.css`.
- Define `--font-family-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;` and use real system monospace for invite codes.
- Remove unused `Inter` font download from `public/index.html`.

### 2. Purge Legacy Tailwind RGBs & Outmoded Styling (`src/App.css`)
- Purge all 30+ instances of raw `rgba(37, 99, 235, ...)` (replace with `var(--color-primary-light)` / `var(--color-primary-border)`).
- Purge all 30+ instances of raw `rgba(239, 68, 68, ...)` (replace with `var(--color-danger-light)` / `var(--color-danger-border)`).
- Replace `#09090b` in `src/App.css:1157` with `var(--bg-primary)`.
- Replace aggressive neon button glow (`box-shadow: 0 4px 18px var(--color-primary-glow)`) with Apple HIG layered ambient/directional elevation (`--shadow-sm` resting, `--shadow-md` hover).
- Remove input scaling twitch (`transform: scale(1.008)`) from `.input-group input:focus`, using crisp focus ring `outline: 2px solid var(--border-focus); outline-offset: 2px;`.
- Replace harsh black drop shadow (`box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2)`) on `.mobile-bottom-bar` with `var(--shadow-glass)`.
- Remove redundant `backdrop-filter: blur(24px)` from opaque `.confirm-modal-card`.
- Apply `border: var(--glass-border)` to `.app-topbar` and `border-top: var(--glass-border)` to `.mobile-bottom-bar`.

### 3. Shell Ergonomics & Responsive Architecture (`src/App.css`)
- **Top Safe Area Inset**: In `@media (max-width: 768px)`, update `.app-container` to:
  `padding-top: calc(12px + env(safe-area-inset-top, 0px)) !important;`
  and update `.mobile-menu-inner` padding to respect `env(safe-area-inset-top)`.
- **Persistent Desktop Topbar & Liquid Glass**: Update `.app-topbar` to:
  `position: sticky; top: 12px; z-index: 900;`
  so that it floats persistently on desktop scroll and content scrolls beneath its Liquid Glass blur.
- **Breakpoint Overlap Fix**: Adjust the mobile breakpoint from `max-width: 768px` to `max-width: 767.98px` so both navbars don't disappear on 768px portrait tablets.
- **Touch Target Hardening**: Add CSS-level `min-height: 44px;` to `.btn-primary`, `.btn-secondary`, `.btn-danger-outline`, and standard buttons.
- **Desktop Widescreen Expansion**: In `@media (min-width: 1024px)`, add `max-width: 1000px !important;` to `.domain-page-card` so cards can expand on widescreen monitors.

## Mandatory Verification Steps Before Handoff
1. `npm test -- --watchAll=false` must pass 100% (41 suites, 418 tests).
2. `npm run build` must compile cleanly with 0 errors.
3. `node scripts/verify-zero-emojis.js` must pass with 0 emojis/emoticons.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your completion handoff report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m8/handoff.md`
Notify the orchestrator with `send_message` when done.


## 2026-11-08T13:43:08Z
You are assigned to implement Milestone M8: Design Tokens, CSS Architecture, Ergonomics & Shell Layout.
Read your full dispatch prompt in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m8/DISPATCH.md
And review:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/daniele949/.agents/skills/frontend-design/SKILL.md
- /home/daniele949/.agents/skills/apple-design/SKILL.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_1/handoff.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_2/handoff.md

You own exclusively:
- src/index.css
- src/App.css
- public/index.html
- src/App.js

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Run `npm test -- --watchAll=false`, `npm run build`, and `node scripts/verify-zero-emojis.js` to ensure 100% passing tests and clean builds.
Write your completion handoff report to:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m8/handoff.md
Notify me via send_message when you are finished.
