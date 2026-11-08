# Task Assignment: Worker M10 (Secondary Household Views, Modals & Micro-Copy Polish)

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
State folder: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10

## Files Owned Exclusively
- `src/pages/Bacheca/ViewBacheca.js`
- `src/pages/Bacheca/ViewCalendario.js`
- `src/pages/Bacheca/AggiungiNota.js`
- `src/pages/Bacheca/ModificaNota.js`
- `src/pages/Bacheca/AggiungiEvento.js`
- `src/pages/Documenti/ViewDocumenti.js`
- `src/pages/Documenti/GestioneDocumenti.js`
- `src/pages/Documenti/CaricaDocumentoModal.js`
- `src/pages/Contatti/ViewContatti.js`
- `src/pages/Autenticazione/homeAutenticazione.js`
- `src/pages/Autenticazione/viewLogin.js`
- `src/pages/Autenticazione/viewRegistrazione.js`
- `src/pages/SceltaCasa.js`
- `src/pages/homeUtente.js` (line 509 dismiss target hit area >= 44px)
- `src/pages/Spesa/ViewSpesa.js` (line 287 staple chips hit area >= 40-44px; NEVER use the word "Dispensa"!)
- `src/App.css` (view-specific styles and signature elements)

## Mandatory Inputs & Reports to Read
1. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/daniele949/.agents/skills/frontend-design/SKILL.md`
3. `/home/daniele949/.agents/skills/apple-design/SKILL.md`
4. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md`
5. `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3/handoff.md`

## Objectives for Milestone M10 ("Spend Your Boldness in One Place")

### 1. Bulletin Board & Calendar (`src/pages/Bacheca/`)
- **Signature Anchor in Bacheca (`ViewBacheca.js`)**: **The Pinned Urgent Notice Banner**. Any notice tagged "Urgente" or "Importante" is elevated into a signature pinned dispatch banner with a warm hairline accent and prominent typography. Routine notices render below in a disciplined, paper-quiet card list.
- **Signature Anchor in Calendario (`ViewCalendario.js`)**: **Desktop Split View**. On desktop widescreen, display the monthly calendar grid and the selected day's event agenda side by side in a clean 2-column layout.
- De-clutter duplicate icons from `<h1>` elements (`<i className="fas fa-thumbtack">`, `<i className="fas fa-calendar-alt">`).
- Convert uppercase CSS shouting to natural Italian sentence case.

### 2. Document Management (`src/pages/Documenti/`)
- **Signature Anchor (`ViewDocumenti.js`, `GestioneDocumenti.js`)**: **The House Vault & Category Cabinet**. Drag-and-drop vault shelf with semantic document format badges (PDF in coral, images in violet, docs in blue), clear category tabs, and clean dropzone.
- De-clutter duplicate `<h1>` icons.
- Preserve test button pattern `/Carica Documento/i` and `/Carica Nuovo Documento/i`.

### 3. Shared Directory & Emergency Contacts (`src/pages/Contatti/`)
- **Signature Anchor (`ViewContatti.js`)**: **The Emergency Speed-Dial Priority Shelf**. Prominent top row of high-priority house emergency contacts (Proprietario, Idraulico, Emergenza 112) with tactile one-tap `tel:` and `mailto:` action pills (>= 44px).
- **Modal Ergonomics**: In `ViewContatti.js`, add backdrop click-to-dismiss handler and `Escape` key dismiss listener to `.modal-backdrop`.
- De-clutter duplicate `<h1>` icon.
- Preserve tested button pattern `/Chiama/i` with `tel:`.

### 4. Authentication & Onboarding (`src/pages/Autenticazione/` & `SceltaCasa.js`)
- **Signature Anchor**: **The House Hearth Badge & Clear Two-Lane Onboarding Card**. Warm brand emblem, clean form fields with subtle borders, prominent tactile buttons without duplicate title icons (`Bentornato <i className="fas fa-shield-alt">`, `Configurazione Casa <i className="fas fa-home">`).
- Sentence case Italian micro-copy (`Accedi al tuo account`, `Crea un account per la tua casa`, etc.).

### 5. Touch Target & Invariant Polish
- In `homeUtente.js:509`, ensure dismiss button hit region has minimum 44x44px.
- In `ViewSpesa.js:287`, ensure staple chips meet minimum 40-44px touch targets.
- **CRITICAL INVARIANT**: **DO NOT USE THE WORD "Dispensa" IN `ViewSpesa.js`**.
- Zero emojis: 100% vector SVG / FontAwesome icons.

## Mandatory Verification Steps Before Handoff
1. `npm test -- --watchAll=false` must pass 100% (42 suites, 436 tests).
2. `npm run build` must compile cleanly with 0 errors.
3. `node scripts/verify-zero-emojis.js` must pass with 0 emojis/emoticons.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your completion handoff report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/handoff.md`
Notify the orchestrator with `send_message` when done.


## 2026-11-08T22:29:32Z
[Message] timestamp=2026-11-08T22:29:32Z sender=e169645e-9753-4a9d-a1c4-5a07a0406c31 priority=MESSAGE_PRIORITY_HIGH content=You are assigned to implement Milestone M10: Secondary Household Views, Modals & Micro-Copy Polish.
Read your full dispatch in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_worker_m10/DISPATCH.md
And review:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- /home/daniele949/.agents/skills/frontend-design/SKILL.md
- /home/daniele949/.agents/skills/apple-design/SKILL.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/teamwork_explorer_survey_3/handoff.md
