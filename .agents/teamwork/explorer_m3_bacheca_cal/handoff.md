# Handoff Report: Milestone 3 — Bulletin Board, Calendar & Mascot Retirement

## 1. Observation

1. **Target Files for Bulletin Board and Calendar**:
   - `src/pages/Bacheca/ViewBacheca.js` (193 lines):
     - Line 67, 72, 82: calls `alert(...)`.
     - Line 76: calls `if (!window.confirm("Sicuro di voler eliminare questa nota?")) return;`.
     - Lines 125-182: renders notice list with raw borders, basic author string (`utentiMap[n.autoreId] || "Coinquilino"`), no priority tagging, and no formatted timestamps.
   - `src/pages/Bacheca/AggiungiNota.js` (129 lines):
     - Line 6: `import { triggerConfetti } from "../../components/Celebration";`.
     - Line 59: `triggerConfetti();`.
     - Lines 81-125: basic form lacking priority selection pills and character counters.
   - `src/pages/Bacheca/ModificaNota.js` (177 lines):
     - Lines 27, 36, 43: calls `alert(...)` on missing note, foreign house (`data.casaId !== userData.casaId`), and unauthorized author (`data.autoreId !== currentUser.uid`).
     - Lines 131-174: basic form lacking character counters and priority selector pills.
   - `src/pages/Bacheca/ViewCalendario.js` (195 lines):
     - Lines 106-113: embeds `Calendar` from `react-calendar` with `locale="it-IT"`.
     - Lines 130-178: renders items for `dataSelezionata`, with empty state "Nessun evento o turno in questa data. Tempo libero!" and basic cards.
   - `src/pages/Bacheca/AggiungiEvento.js` (144 lines):
     - Line 6: `import { triggerConfetti } from "../../components/Celebration";`.
     - Line 73: `triggerConfetti();`.
     - Lines 95-141: basic form without category selection pills or character counters.

2. **Mascots, Canvas & Timer Leaks**:
   - `src/components/MiniGuy.js`:
     - Line 88: `timer = setTimeout(nextFrame, current.dur);` inside recursive animation loop.
     - Line 114: mounts `<canvas ref={canvasRef} ... />`.
     - Mounted in `src/pages/homeUtente.js` (Line 8: `import MiniGuy from "../components/MiniGuy";`, Line 158: `<MiniGuy />`).
   - `src/components/InteractiveMascot.js`:
     - Lines 110, 111, 129, 130, 141, 142, 143, 144: uses kebab-case `<stop stop-color="..." />` and `<stop offset="..." stop-color="..." />`.
     - Mounted in:
       - `src/pages/Autenticazione/homeAutenticazione.js`: line 4, line 22
       - `src/pages/Autenticazione/viewLogin.js`: line 6, line 98
       - `src/pages/Autenticazione/viewRegistrazione.js`: line 6, line 113
       - `src/pages/SceltaCasa.js`: line 8, line 109
     - Test run output (`npm test -- --watchAll=false`):
       ```
       console.error
         Invalid DOM property `stop-color`. Did you mean `stopColor`?
           at validateProperty (node_modules/react-dom/cjs/react-dom-client.development.js:2992:21)
       ```
     - Window event listener: Line 39: `window.addEventListener("pointermove", handlePointerMove);`.
   - `src/components/Celebration.js`:
     - Line 2: `const canvas = document.createElement("canvas"); document.body.appendChild(canvas);`.
     - Lines 58, 64: `requestAnimationFrame(render)` loop for 2200ms.
     - Called upon submission in 9 pages, including `AggiungiNota.js` and `AggiungiEvento.js`.

3. **Feedback Infrastructure**:
   - `src/utils/feedback.js`:
     - `showToast(message, type, duration)`: In-app non-blocking toast, with fallback to `window.alert` in unmounted test runners.
     - `showConfirm({ title, message, confirmText, cancelText, isDanger })`: Accessible modal returning a Promise, with fallback to `window.confirm(message)` in unmounted test runners.

4. **Zero-Emoji Scan**:
   - Command: `cd /home/daniele949/Desktop/Cose/HouseHelper/househelper && node scripts/verify-zero-emojis.js`
   - Output: `SUCCESS: Zero emojis or text emoticons detected across 74 files.`

5. **Test Suite Baseline**:
   - Command: `npm test -- --watchAll=false src/test/tier1_features/bacheca_calendario.test.jsx src/test/tier2_boundaries/bacheca_calendario_boundary.test.jsx`
   - Result: 13 passed, 0 failed across 2 test suites.

---

## 2. Logic Chain

1. **Non-blocking Dialogs**:
   - From Observation 1, `ViewBacheca.js` uses `window.alert` and `window.confirm`, while `ModificaNota.js` uses `window.alert`.
   - From Observation 3, `src/utils/feedback.js` provides `showToast` and `showConfirm`, which automatically fall back to `window.alert` and `window.confirm` in Jest test environments where no modal/toast container is mounted.
   - Therefore, replacing `alert` and `confirm` with `showToast` and `showConfirm` elevates the user experience to modern accessible dialogs in the browser while maintaining 100% test compatibility with assertions in `tier1_features/bacheca_calendario.test.jsx` (T1.29) and `tier2_boundaries/bacheca_calendario_boundary.test.jsx` (T2.25, T2.26).

2. **UI/UX Modernization**:
   - In `ViewBacheca.js`, introducing priority tags (`Urgente`, `Importante`, `Info`, `Promemoria`), author avatar badges, formatted creation dates, and distinct author action buttons (`title="Modifica"`, `title="Elimina"`) provides visual hierarchy while strictly satisfying tests T1.28 and T2.24.
   - In `AggiungiNota.js` and `ModificaNota.js`, adding visual priority selector pills, character counters (80 and 1500 chars), and toast feedback modernizes note composition while preserving placeholder text (`Oggetto dell'avviso`, `Scrivi qui il messaggio dettagliato...`) required by T1.30 and T1.31.
   - In `ViewCalendario.js` and `AggiungiEvento.js`, introducing category tagging (`Generale`, `Cena / Festa`, `Manutenzione`, `Bollette`, `Ospiti`), day agenda schedule cards, and clean empty states modernizes scheduling while preserving exact DOM elements tested by T1.32 and T1.33.

3. **Mascot Retirement & DOM Cleanliness**:
   - From Observation 2, `<MiniGuy />` runs a recurring `setTimeout` loop on a `<canvas>` inside `homeUtente.js`. Unmounting `<MiniGuy />` removes CPU/canvas overhead.
   - From Observation 2, `<InteractiveMascot />` causes React `stop-color` console warnings in test suites and attaches `window` pointer listeners across 4 Auth pages. Unmounting `<InteractiveMascot />` from auth pages and fixing `stop-color` to `stopColor` in `InteractiveMascot.js` permanently silences DOM warnings.
   - Retiring `triggerConfetti()` from `AggiungiNota.js` and `AggiungiEvento.js` prevents canvas elements from being appended to `document.body` during rapid navigation.

4. **Zero-Emoji Prohibition**:
   - From Observation 4, the repository currently has 0 emojis. All new badges, pills, and action buttons in Bacheca and Calendario must use FontAwesome vector classes (`fas fa-*`), maintaining strict compliance with Requirement R2.

---

## 3. Caveats

- In `src/components/Celebration.js`, `triggerConfetti` is called from other pages outside Milestone 3 (such as `viewLogin.js`, `viewRegistrazione.js`, `aggiuntaTurno.js`, `ViewDebiti.js`, `ViewSpesa.js`). Complete project-wide removal of `triggerConfetti` calls will be coordinated across all milestones, but for Milestone 3 files (`AggiungiNota.js` and `AggiungiEvento.js`), confetti is completely unmounted.
- The default priority for new notes is set to `'info'`, and the default category for events is `'Generale'`, ensuring backward compatibility with tests that don't supply priority or category fields.

---

## 4. Conclusion

A comprehensive architectural and UI/UX blueprint has been established for Milestone 3:
1. `ViewBacheca.js`, `AggiungiNota.js`, and `ModificaNota.js` will receive modern priority-tagged cards, character counters, author avatar chips, and non-blocking dialogs via `src/utils/feedback.js`.
2. `ViewCalendario.js` and `AggiungiEvento.js` will receive unified event schedule cards, category selector pills, and polished empty states.
3. Mascot retirement is fully planned: `MiniGuy` unmounted from `homeUtente`, `InteractiveMascot` unmounted from Auth pages, `stop-color` attribute warning resolved, and canvas/timer leaks eliminated.
4. All test contracts across Tier 1 and Tier 2 (13 tests) are preserved. Zero emojis are permitted.

Detailed specifications and CSS tokens are documented in `analysis.md`.

---

## 5. Verification Method

To independently verify the investigation and future implementation:

1. **Bacheca & Calendario Test Execution**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   npm test -- --watchAll=false src/test/tier1_features/bacheca_calendario.test.jsx src/test/tier2_boundaries/bacheca_calendario_boundary.test.jsx
   ```
   *Expected*: All 13 tests pass with 0 failures.

2. **Zero-Emoji Verification Scan**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   node scripts/verify-zero-emojis.js
   ```
   *Expected*: Zero emojis detected across all files.

3. **DOM Property Warning Verification**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   npm test -- --watchAll=false src/test/tier1_features/auth_house.test.jsx
   ```
   *Expected*: Zero `stop-color` console warnings.

4. **Full Test Suite Run**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   npm test -- --watchAll=false
   ```
   *Expected*: All 21 test suites (135+ tests) pass.
