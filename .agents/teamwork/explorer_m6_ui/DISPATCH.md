## 2026-11-03T14:40:59Z
Sender: 3ee71a4c-9e4f-4922-b970-a55d69932d6e
Content:
You are a read-only exploration agent.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md located at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md

Also read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m6/SCOPE.md

Your Task: Technical investigation of UI routing, navigation, design system, Documenti view, and cross-device ergonomics for Milestone M6.
Investigate:
1. `src/App.js`: Examine existing routes, route guards (`ProtectedRoute`, `HouseGuard`), and how a new route `/documenti` should be registered.
2. Navigation: Examine `src/components/DesktopNavigation.js` and `src/components/MobileNavigation.js` to see how navigation links and icons are rendered. Determine the exact link entry and FontAwesome icon for "Documenti".
3. Feedback system: Examine how `Toast` and `ConfirmModal` are used in existing pages (`src/pages/Bacheca/`, `src/pages/TurniPulizia/`, `src/utils/feedback.js`).
4. Design tokens & Ergonomics in `src/App.css`:
   - Mobile touch targets (>= 44px min-height/min-width for buttons, inputs, links, select).
   - Bottom-sheet / mobile drawer accessibility and touch comfort.
   - Desktop ergonomics: multi-column dashboard, responsive grid/table, spacious layout, keyboard accessibility (tabindex, focus visible, aria labels).
5. Detailed specification for `src/pages/Documenti/ViewDocumenti.js`:
   - Component structure, upload card (drag & drop / file selection, category picker, name, optional description/notes).
   - Document listing (category filters: Tutti, Contratti, Bollette, Garanzie, Ricevute, Altro; search input; sorting).
   - Card / Table layout with file metadata (size, upload date, uploader, format badge).
   - Actions: view/download, delete with `ConfirmModal`.
   - Strict zero-emoji compliance: specify exact FontAwesome class names for all icons.

Do NOT modify any code. Write your complete handoff report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_ui/handoff.md`

Update your `progress.md` with timestamps as you proceed. When finished, send a message to the orchestrator with your findings and path to handoff.md.
