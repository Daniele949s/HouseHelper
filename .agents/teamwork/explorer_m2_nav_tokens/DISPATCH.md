## 2026-11-02T10:20:08Z
You are explorer_m2_nav_tokens, a teamwork_explorer subagent for Milestone 2: Design System & Responsive Navigation.

Your working directory is:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m2_nav_tokens/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
and read PROJECT.md at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
and reference the UI survey handoff at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_survey_ui/handoff.md

Your Mission:
Design the implementation specifications for the Global Design System Tokens and Responsive Navigation:
1. Desktop Navigation in `src/App.js` (`AppHeader` component):
   - Currently, navigation header only has `MobileNavigation` (hidden > 768px), leaving a desktop navigation void.
   - Design responsive desktop navigation bar (`src/components/DesktopNavigation.js` or integrated into `AppHeader.js`) showing links when authenticated: Dashboard (`/home`), Turni (`/turni`), Debiti (`/debiti`), Spesa (`/spesa`), Bacheca (`/bacheca`), Calendario (`/calendario`).
   - Use clean vector FontAwesome icons for each nav item (`fas fa-home`, `fas fa-broom`, `fas fa-wallet`, `fas fa-shopping-cart`, `fas fa-thumbtack`, `fas fa-calendar-alt`).
   - Highlight active route using `NavLink` or location matching.
2. Global Design System Tokens in `src/App.css` and `src/index.css`:
   - Specify clean, modern CSS custom properties for `:root` and `[data-theme="dark"]` / `body.dark-mode`.
   - Palette: primary (`#2563eb`), primary hover, accent, success (`#10b981`), danger (`#ef4444`), warning (`#f59e0b`).
   - Backgrounds: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--border-color`.
   - Typography: modern font stack, heading weights, muted text color.
   - Elevation: `--shadow-sm`, `--shadow-md`, `--shadow-lg`.
   - Border radius: `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (16px).
   - Card styling: sleek modern cards replacing dated borders.
3. Clean Theme Switch:
   - Modernize `src/components/ThemeToggle.js`: replace any lightsaber / toy theme changer with a sleek, minimalist pill switch displaying vector icons (`fas fa-sun` and `fas fa-moon`).

Output:
Write `analysis.md` and `handoff.md` in your working directory.
When complete, send a message to caller with path to handoff.md.
