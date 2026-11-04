# DISPATCH

## 2026-11-02T10:29:57Z
You are worker_m2, a teamwork_worker subagent implementing Milestone 2: Design System, Global Navigation & Strict Zero-Emoji Replacement.

Your working directory is:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m2/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
and read PROJECT.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Write Ownership:
You have exclusive write ownership of:
- `public/index.html` (title tag emoji removal)
- `scripts/verify-zero-emojis.js` (hardened regex)
- `src/components/ThemeToggle.js` (minimalist toggle with FontAwesome icons, removing ☀️ and 🌙)
- `src/components/DesktopNavigation.js` (new desktop nav bar)
- `src/components/AppHeader.js` (integrated desktop nav bar alongside mobile nav)
- `src/components/Toast.js` (non-blocking toast notification stack)
- `src/components/ConfirmModal.js` (accessible confirmation modal)
- `src/components/HouseholdStatus.js` (modern household status card)
- `src/utils/feedback.js` (toast/modal event emitter bus with test fallbacks)
- `src/index.css` & `src/App.css` (modern design system CSS variables and layout)
- `src/pages/**` (emoji, raw arrow, and checkmark replacements)
- `src/test/tier4_scenarios/household_lifecycle.test.jsx` (updated checkmark assertion)

Inputs & Specifications to Follow:
1. Zero Emoji / Arrow Eradication & Scanner Hardening:
   - Apply the verified patch: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m2_emoji/zero_emoji.patch` (or use git apply / patch tools).
   - Verify that all 36 emojis across 14 UI files + public/index.html, all 8 raw arrows (`←`, `→`), and the raw checkmark (`✓`) in `homeUtente.js` are replaced with local FontAwesome vector classes (`fas fa-...`).
   - In `scripts/verify-zero-emojis.js`, ensure the regex is hardened to include regional indicators `\u{1F1E6}-\u{1F1FF}`, arrows `\u{2190}-\u{21FF}`, and keycaps `\u{20E3}` per `explorer_m2_emoji/analysis.md`.
2. Responsive Global Navigation:
   - Implement `src/components/DesktopNavigation.js` and update `src/components/AppHeader.js` per `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m2_nav_tokens/analysis.md`.
   - Desktop navigation renders when user is authenticated and belongs to a house: links for Dashboard (`/home`), Turni (`/turni`), Debiti (`/debiti`), Spesa (`/spesa`), Bacheca (`/bacheca`), Calendario (`/calendario`) with active state and FontAwesome icons (`fas fa-home`, `fas fa-broom`, `fas fa-wallet`, `fas fa-shopping-cart`, `fas fa-thumbtack`, `fas fa-calendar-alt`).
3. Modern Design System Tokens:
   - Update `src/index.css` and `src/App.css` with clean CSS custom properties for `:root` and `[data-theme="dark"]` (primary `#2563eb`, accent `#0d9488`, modern card elevation shadows, border radii `6px`/`10px`/`16px`) per `explorer_m2_nav_tokens/analysis.md`.
   - Update `src/components/ThemeToggle.js` to a clean, accessible pill toggle with `fas fa-sun` and `fas fa-moon`.
4. Modern Feedback & Household Status:
   - Implement `src/utils/feedback.js`, `src/components/Toast.js`, `src/components/ConfirmModal.js`, and `src/components/HouseholdStatus.js` per `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m2_feedback_mascot/analysis.md`.
   - Mount `<ToastContainer />` and `<ConfirmModal />` in `src/App.js` or global layout.

Verification Commands to Run:
- `node scripts/verify-zero-emojis.js` (or `npm run check:emojis`): MUST PASS with exit code 0 and 0 violations!
- `npm run check:circular`: MUST PASS with exit code 0!
- `npm run build`: MUST compile cleanly with exit code 0!
- `npm test -- --watchAll=false`: ALL 14 test suites and 91 tests MUST pass!
