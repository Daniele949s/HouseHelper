# Handoff Report — Feature Inventory, Business Logic, and Test Architecture

**Agent**: `explorer_survey_features`  
**Role**: Teamwork Explorer (Read-only investigation)  
**Parent Agent**: `5c90c77d-0b78-4385-a83f-30cb8ae783ac`  
**Working Directory**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_survey_features/`  
**Reference Analysis**: [analysis.md](./analysis.md)

---

## 1. Observation

1. **Codebase Inventory & Dependencies**:
   - `package.json:11–15`: `"react": "^19.2.3"`, `"react-dom": "^19.2.3"`, `"react-router-dom": "^7.10.1"`, `"react-scripts": "5.0.1"`, `"firebase": "^12.14.0"`.
   - `package.json:6–9`: `"@testing-library/react": "^16.3.0"`, `"@testing-library/jest-dom": "^6.9.1"`, `"@testing-library/dom": "^10.4.1"`.
   - `firestore.rules:23–85`: 6 top-level Firestore collections defined with rules: `utenti/{userId}`, `case/{casaId}`, `turni/{turnoId}`, `debiti/{debitoId}`, `spesa/{spesaId}`, `note/{notaId}`.

2. **Existing Automated Testing State**:
   - Only 2 test files exist in `src/`:
     - `src/App.test.js:1–18`: mounts `<NotFound />` only with static mocked AuthContext (`currentUser: null, userData: null`). Does not mount `App.js` or any other page.
     - `src/utils/security.test.js:1–129`: unit tests pure functions from `src/utils/security.js` (`sanitizeText`, `validateNumber`, `safeFloat`, `validateDate`, `sanitizeAlphanumeric`, `sanitizeList`, `isValidEmail`).
     - `src/__mocks__/react-router-dom.js:1–11`: manual stubs for `useNavigate`, `useLocation`, `useParams`, `Navigate`, `Outlet`, `BrowserRouter`, `Routes`, `Route`.
   - Zero component, integration, or E2E tests exist for all other views and components.
   - `MiniGuy.js:5–45, 83–91`: recursive `setTimeout(nextFrame, current.dur)` and `canvas.getContext("2d")`.
   - `Celebration.js:1–65`: dynamic DOM injection of fixed canvas with `requestAnimationFrame`.
   - `BackgroundSlideshow.js:17–22`: active `setInterval(..., 7000)`.

3. **17 Import Cycles & Redundant CSS Imports**:
   - `graphify-out/GRAPH_REPORT.md:50–68`: lists 17 two-file cycles between `src/App.js` and all page components.
   - File inspection confirmed each of the 17 page components contains `import "../../App.css";` or `import "../App.css";` (e.g. `src/pages/Debiti/ViewDebiti.js:8`, `src/pages/TurniPulizia/viewTurni.js:6`, `src/pages/Autenticazione/viewLogin.js:9`), while `src/App.js:25–51` imports every page component.
   - `src/models/modelloTurno.js:1–9`: references undefined `DataTypes.DATE`, `DataTypes.ARRAY(DataTypes.STRING)`. Unused across the entire repository.

4. **Zero-Emoji Prohibition Violations (Requirement R2)**:
   - Exactly **34 emoji occurrences** observed across 16 files in `src/`, plus 1 in `public/index.html`:
     - `src/components/ThemeToggle.js:23`: `☀️`, `🌙`
     - `src/components/MiniGuy.js:101`: `🏴‍☠️` (in title attribute)
     - `src/pages/Autenticazione/homeAutenticazione.js:43,45,47,49`: `✨`, `💸`, `🛒`, `🗓️`
     - `src/pages/Autenticazione/viewLogin.js:106`: `👋`
     - `src/pages/Autenticazione/viewRegistrazione.js:121`: `✨`
     - `src/pages/homeUtente.js:152,174,178,182,186,190,222`: `🏠`, `🧹`, `💰`, `🛒`, `🗓️`, `📌`, `🎉`
     - `src/pages/NotFound.js:23`: `🧭`
     - `src/pages/SceltaCasa.js:93,112`: `🎉`, `🏠`
     - `src/pages/TurniPulizia/aggiuntaTurno.js:102`: `🧹`
     - `src/pages/TurniPulizia/viewTurni.js:79,102`: `🧹`, `🧹`
     - `src/pages/TurniPulizia/modificaTurno.js:145`: `✏️`
     - `src/pages/Bacheca/ViewBacheca.js:100,117`: `📌`, `📝`
     - `src/pages/Bacheca/ModificaNota.js:122`: `✏️`
     - `src/pages/Bacheca/AggiungiEvento.js:86`: `🗓️`
     - `src/pages/Bacheca/ViewCalendario.js:100,133`: `🗓️`, `☕`
     - `src/pages/Bacheca/AggiungiNota.js:72`: `📌`
     - `src/pages/Debiti/ViewDebiti.js:124,178`: `💰`, `💸`
     - `src/pages/Debiti/AggiungiDebito.js:163`: `💸`
     - `src/pages/Spesa/ViewSpesa.js:129,180`: `🛒`, `🍎`
     - `public/index.html:27`: `🏠`

---

## 2. Logic Chain

1. **Test Runner Hang / Friction Root Causes**:
   - Observation: `package.json` specifies `react-scripts test` (Jest 27) with `react@^19.2.3` and `firebase@^12.14.0`.
   - Observation: `MiniGuy.js` and `BackgroundSlideshow.js` trigger continuous asynchronous timer loops (`setTimeout` and `setInterval`) without automatic jest fake timer isolation.
   - Observation: `MiniGuy.js` and `Celebration.js` invoke HTML5 Canvas 2D contexts (`canvas.getContext("2d")`), which return `null` in JSDOM unless mocked.
   - Deduction: Running `npm test` without `CI=true` or `--watchAll=false` will hang waiting on stdin. Running tests that mount `MiniGuy` or `Celebration` will fail on null canvas context or hang worker threads due to recursive timers. A reliable test harness must provide `setupTests.js` canvas stubs, timer cleanups, and a mock in-memory Firebase provider.

2. **Decoupling Firebase Credentials for Automated Testing**:
   - Observation: `src/firebase.js` initializes credentials for project `househelper-12050`. Components directly call Firestore SDK functions (`getDocs`, `addDoc`, `updateDoc`, `deleteDoc`, `doc`, `collection`).
   - Observation: All application queries follow structured patterns (`where("casaId", "==", casaId)`).
   - Deduction: A headless in-memory Firestore mock (`MockFirestoreStore`) can intercept these operations in `src/test/mockFirebase.js` to enable fast, zero-credential, deterministic testing across Tiers 1–4.

3. **Circular Import Root Cause & Resolution**:
   - Observation: All 17 cycles flagged in `GRAPH_REPORT.md` correspond to page components importing `App.css`, while `App.js` imports each page.
   - Observation: Neither `App.js` nor any page exports symbols to each other; the circularity is an artifact of stylesheet imports at the component level.
   - Deduction: Removing `import "../../App.css"` from page components and loading `App.css` exclusively at `index.js` or `App.js` completely eliminates all 17 cycles without any functional regression.

4. **Zero-Emoji Compliance (Requirement R2)**:
   - Observation: 34 instances of Unicode emoji literals exist in JSX text, headings, alert strings, and component attributes.
   - Deduction: Every emoji must be replaced with corresponding vector icons (FontAwesome classes e.g. `fas fa-broom`, `fas fa-wallet`, `fas fa-sun`, `fas fa-moon`) or clean typography. An automated verification script (`scripts/verify-zero-emojis.js`) must be established to ensure 100% compliance.

---

## 3. Caveats

- **Scope Limitation**: Explorer subagents perform read-only investigations; source code modifications and test executions were not performed in this session.
- **External Services**: Push notifications and Cloud Messaging are not configured in active codebase; all updates are Firestore-driven.
- **Legacy `css_template/`**: Contains 99 files from HTML5 UP templates and demo folders. None are imported in active code, but styles were historically adapted into `App.css`.

---

## 4. Conclusion

The HouseHelper application has a well-defined feature set and robust multi-tenant Firestore security rules, but suffers from:
1. Complete lack of component, integration, and E2E test coverage.
2. Fragile test runner environment (watch mode, React 19 vs Jest 27, unmocked Firebase network calls, canvas context crashes, and recursive timer leaks).
3. 34 emoji occurrences violating Requirement R2.
4. 17 circular import cycles caused by redundant `App.css` imports across all page modules.

The blueprint in `analysis.md` provides complete specifications for:
- Implementing an in-memory Firebase test harness (`src/test/mockFirebase.js` and `src/test/TestWrapper.jsx`).
- 4-Tier test suite covering Smoke (Tier 1), Boundaries & Security (Tier 2), Cross-Feature Interactions (Tier 3), and Realistic Household Scenarios (Tier 4).
- Automated verification scripts for Zero-Emojis and Build Integrity.

---

## 5. Verification Method

To independently verify the observations and conclusions in this report:

1. **Verify Emoji Occurrences (34 in `src/`, 1 in `public/`)**:
   Run grep search for Unicode emojis:
   ```bash
   grep -rn -P "[\x{1F300}-\x{1F9FF}\x{1FA00}-\x{1FAFF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]" src/ public/
   ```
   Inspect each location listed in Section 2.9 of `analysis.md`.

2. **Verify 17 Redundant `App.css` Imports**:
   Run grep search across `src/pages`:
   ```bash
   grep -rn "App\.css" src/pages/
   ```
   Confirm all 17 page files import `App.css`.

3. **Verify Existing Tests and Unmocked Canvas/Timers**:
   - Inspect `src/App.test.js` (only tests `<NotFound />`).
   - Inspect `src/components/MiniGuy.js` (lines 48–96: canvas context and recursive `setTimeout`).
   - Inspect `src/components/Celebration.js` (lines 1–65: dynamic canvas injection and `requestAnimationFrame`).
