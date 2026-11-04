# Milestone 3 Analysis: Bulletin Board, Calendar & Mascot Retirement

## 1. Executive Summary

Milestone 3 focuses on modernizing the communication and scheduling pillars of HouseHelper:
1. **Bulletin Board (`src/pages/Bacheca/`):**
   - `ViewBacheca.js`: Modern card-based bulletin board with priority tags (`Urgente`, `Importante`, `Info`, `Promemoria`), author avatar badge, formatted publication timestamps, optional expiration date indicators, clean author action buttons (edit/delete), and non-blocking dialogs (`showToast`, `showConfirm`).
   - `AggiungiNota.js` & `ModificaNota.js`: Polished notice creation/editing forms with interactive priority selector pills, character counters, inline validation, and non-blocking toast notifications.
2. **Shared Household Calendar (`src/pages/Bacheca/`):**
   - `ViewCalendario.js`: High-contrast, responsive calendar view (`react-calendar`), category color indicators (amber for cleaning chores, purple/teal for household events), day agenda schedule cards, and an inviting empty state.
   - `AggiungiEvento.js`: Event creation form with pre-filled date support, category selector tags, date/time inputs, character counters, and toast notifications.
3. **Mascot Retirement & Codebase Cleanliness:**
   - Complete unmounting roadmap for legacy toy mascots (`MiniGuy`, `InteractiveMascot`) and particle effects (`Celebration`).
   - Resolution of React DOM property warnings (`stop-color` vs `stopColor`).
   - Elimination of canvas and timer leaks across the application lifecycle.
4. **Strict Zero-Emoji Compliance:**
   - 100% vector iconography (FontAwesome `fas fa-*` / `far fa-*`), zero Unicode emojis or emoticons.

---

## 2. Current State vs. Target Architecture

| Component | Current State | Target Modernized State |
|-----------|---------------|-------------------------|
| `ViewBacheca.js` | Basic list of cards with raw borders; uses native `window.confirm` and `window.alert`; no priority categorization; basic author string. | Card grid/stack with priority tags, author avatar chip, creation date, event deadline badges, accessible `showConfirm` modal, and `showToast`. |
| `AggiungiNota.js` | Plain card form with basic inputs; imports legacy `triggerConfetti()` from `Celebration`; no priority selection; no character count indicators. | Polished card with priority selection pills (`Info`, `Importante`, `Urgente`, `Promemoria`), character limit counters, toast confirmation, and confetti removed. |
| `ModificaNota.js` | Plain form; uses blocking `window.alert` for permissions; no priority tags; no character counters. | Polished form with loaded priority tags, character counters, non-blocking `showToast` notifications, and strict multi-tenant authorization guards. |
| `ViewCalendario.js` | Basic react-calendar layout; agenda items rendered in basic linear cards without category badges or clean separation between chores and events. | Sleek calendar wrapper with status dots, clear legend pills, card agenda items with author/assignee badges, time badges, and polished empty state. |
| `AggiungiEvento.js` | Basic event form; imports `triggerConfetti()`; no category tags; basic date input. | Category tag selection (`Generale`, `Cena / Festa`, `Manutenzione`, `Bollette`, `Ospiti`), pre-filled date handling, toast notifications, confetti removed. |
| `MiniGuy.js` | 8-bit sprite running infinite `setTimeout` loop on `<canvas>`. Mounted in `homeUtente.js`. | Retired from `homeUtente.js`. Unmounted from UI to prevent timer loops and canvas overhead. |
| `InteractiveMascot.js` | SVG mascot with `stop-color` DOM attribute warnings and `pointermove` window listeners. Mounted in 4 Auth pages. | Retired from `homeAutenticazione`, `viewLogin`, `viewRegistrazione`, and `SceltaCasa`. `stop-color` fixed to `stopColor`. Pointer listeners safely cleaned up. |
| `Celebration.js` | `triggerConfetti()` dynamically appends `<canvas>` to `document.body` with 2200ms `requestAnimationFrame` loop. | Unmounted from form submissions in favor of `showToast()`. Safe cleanup to prevent orphan DOM canvas elements. |

---

## 3. Detailed Component Blueprints

### 3.1 `ViewBacheca.js` Blueprint

#### Responsibilities & Behavior:
- Fetch household notes from Firestore collection `note` filtered by `casaId == userData.casaId`.
- Fetch roommates from Firestore collection `utenti` filtered by `casaId == userData.casaId` to build `utentiMap`.
- Sort notes descending by `createdAt`.
- Render priority tags:
  - `urgente`: Danger theme (`rgba(239, 68, 68, 0.15)`, text `var(--color-danger)`, icon `fas fa-exclamation-triangle`).
  - `importante`: Warning theme (`rgba(245, 158, 11, 0.15)`, text `var(--color-warning)`, icon `fas fa-star`).
  - `promemoria`: Accent theme (`rgba(13, 148, 136, 0.15)`, text `var(--color-accent)`, icon `fas fa-bell`).
  - `info` (default): Info theme (`rgba(37, 99, 235, 0.15)`, text `var(--color-primary)`, icon `fas fa-info-circle`).
- Render Author Badge: Circle avatar with first letter of author username (or `fas fa-user`), username, and `(Tu)` badge if authored by current user.
- Render Timestamp: Formatted date using `toLocaleDateString('it-IT')` or relative time string.
- Render Expiration/Event date (if `n.data` is set): Calendar icon with formatted date.
- Enforce Author-Only Action Controls:
  - Only show Edit (`title="Modifica"`) and Delete (`title="Elimina"`) buttons if `n.autoreId === currentUser.uid`.
- Non-blocking Confirmation & Deletion:
  - Invokes `showConfirm`:
    ```javascript
    const confirmed = await showConfirm({
      title: "Elimina Avviso",
      message: "Sicuro di voler eliminare questa nota?",
      confirmText: "Elimina",
      cancelText: "Annulla",
      isDanger: true
    });
    if (!confirmed) return;
    ```
  - Fallback in `src/utils/feedback.js` ensures `window.confirm` is called when unmounted in unit tests (preserving test `T1.29`).
  - Upon successful deletion: `showToast("Avviso rimosso dalla bacheca.", "success")`.
  - In case of error: `showToast("Errore durante l'eliminazione.", "error")`.
- Empty State:
  - When `note.length === 0`, renders icon `fas fa-clipboard-list`, heading "Non ci sono comunicazioni attive.", description "Pubblica un avviso per informare tutti i coinquilini.", and button `Nuovo Avviso`.

#### Props & State:
```javascript
const [note, setNote] = useState([]);
const [utentiMap, setUtentiMap] = useState({});
const [loading, setLoading] = useState(true);
const [filtroPriorita, setFiltroPriorita] = useState('tutte'); // 'tutte' | 'urgente' | 'importante' | 'info'
```

---

### 3.2 `AggiungiNota.js` Blueprint

#### Responsibilities & Behavior:
- Form state containing `titolo`, `contenuto`, `priorita` (default `'info'`), and `data` (optional).
- Input Sanitization & Validation via `src/utils/security.js`:
  - `sanitizeText(nota.titolo, 80)`: Checks title is non-empty. Error: `"Il titolo dell'avviso è obbligatorio."`
  - `sanitizeText(nota.contenuto, 1500)`: Checks content is non-empty. Error: `"Il messaggio dell'avviso è obbligatorio."`
  - `validateDate(nota.data)`: Validates format YYYY-MM-DD when date is provided.
- Priority Selector Pills:
  - Buttons for `Info` (`fas fa-info-circle`), `Importante` (`fas fa-star`), `Urgente` (`fas fa-exclamation-triangle`), `Promemoria` (`fas fa-bell`).
  - Active state visually highlighted with active border and badge background.
- Character Counters:
  - Title: `{nota.titolo.length} / 80`
  - Body: `{nota.contenuto.length} / 1500`
- Submission:
  - Saves to Firestore:
    ```javascript
    await addDoc(collection(db, "note"), {
      titolo: cleanedTitolo,
      contenuto: cleanedContenuto,
      priorita: nota.priorita || "info",
      data: validDate,
      autoreId: currentUser.uid,
      casaId: userData.casaId,
      createdAt: new Date()
    });
    ```
  - Retires `triggerConfetti()`: Replaced with `showToast("Avviso pubblicato con successo!", "success")`.
  - Navigates to `/bacheca`.

---

### 3.3 `ModificaNota.js` Blueprint

#### Responsibilities & Behavior:
- Fetch existing note by route parameter `id`.
- Security & Multi-tenant Authorization:
  - If note doc does not exist: `showToast("Avviso non trovato o rimosso.", "error")`, navigate to `/bacheca`.
  - If `data.casaId !== userData.casaId`: `showToast("Accesso non consentito: questo avviso appartiene a un'altra abitazione.", "error")`, navigate to `/bacheca` (preserves `T2.26`).
  - If `data.autoreId !== currentUser.uid`: `showToast("Non sei l'autore di questo avviso!", "warning")`, navigate to `/bacheca` (preserves `T2.25`).
- Pre-populate form with existing values (`titolo`, `contenuto`, `priorita`, `data`).
- Maintain character counters and priority selector pills.
- Input validation matching `AggiungiNota`.
- Submission:
  - Updates Firestore document:
    ```javascript
    await updateDoc(doc(db, "note", id), {
      titolo: cleanedTitolo,
      contenuto: cleanedContenuto,
      priorita: nota.priorita || "info",
      data: validDate,
      casaId: userData.casaId,
      autoreId: currentUser.uid
    });
    ```
  - Displays toast: `showToast("Avviso modificato con successo!", "success")`.
  - Navigates to `/bacheca`.

---

### 3.4 `ViewCalendario.js` Blueprint

#### Responsibilities & Behavior:
- Queries:
  - `note` where `casaId == userData.casaId` -> filters docs where `data` exists (household events).
  - `turni` where `casaId == userData.casaId` -> filters docs where `data` exists (cleaning chores).
  - `utenti` where `casaId == userData.casaId` -> builds `utentiMap`.
- Selected Date State: `const [dataSelezionata, setDataSelezionata] = useState(new Date());`
- Calendar Grid (`react-calendar`):
  - Wrapped inside `.custom-calendar-wrapper`.
  - Tile dots:
    - Amber dot: `haTurno` (cleaning shift).
    - Purple/accent dot: `haEvento` (household event).
- Legend Bar:
  - Amber pill: `Turno Pulizia` (`fas fa-broom`).
  - Purple pill: `Evento Casa` (`fas fa-calendar-alt`).
- Day Schedule Section:
  - Header: `Impegni del [weekday] [day] [month] [year]` in Italian.
  - If empty:
    - Card with icon `fas fa-calendar-check`, heading "Nessun evento o turno in questa data. Tempo libero!", subtitle "Approfitta della giornata libera o programma una nuova attività."
  - If items exist:
    - Chores (`item.tipo === 'turno'`):
      - Badge: broom icon, label "Turno".
      - Title: zone / task (`Array.isArray(item.luoghi) ? item.luoghi.join(", ") : item.luoghi`).
      - Roommate assignment chips: `item.nomi`.
      - Time slot badge: `item.fasciaOraria`.
    - Events (`item.tipo === 'evento'`):
      - Badge: calendar icon, label "Evento".
      - Title: `item.titolo`.
      - Content / time: `item.contenuto`.
      - Category pill (if set).
      - Author: `utentiMap[item.autoreId]`.
- Actions:
  - Primary button: `Aggiungi Evento a questa data` (navigates to `/calendario/aggiungi` with `state: { dataPreimpostata: dataSelezionata }`).
  - Text button: `Torna alla Dashboard` (navigates to `/home`).

---

### 3.5 `AggiungiEvento.js` Blueprint

#### Responsibilities & Behavior:
- Pre-filled date handling from `location.state?.dataPreimpostata`.
- Category Selector Tags:
  - Options: `Generale` (`fas fa-bookmark`), `Cena / Festa` (`fas fa-utensils`), `Manutenzione` (`fas fa-wrench`), `Bollette / Scadenze` (`fas fa-receipt`), `Ospiti` (`fas fa-user-friends`).
  - Default: `'Generale'`.
- Inputs:
  - Title: placeholder `es. Cena di Casa, Affitto in scadenza, Manutenzione caldaia` (matches test `T1.33`).
  - Date: input `type="date"`, bound to 2020-01-01 -> 2100-12-31.
  - Content / Notes: placeholder `Orario preciso, note organizzative, chi partecipa...` (matches test `T1.33`).
- Validation:
  - Title non-empty: `"Il titolo dell'evento è obbligatorio."`
  - Valid date: `dateValidation.isValid ? ... : setError(dateValidation.error || "Data non specificata.")` (matches test `T2.28`).
  - Content non-empty: `"Inserisci una descrizione o orario per l'evento."`
- Submission:
  - Saves to Firestore:
    ```javascript
    await addDoc(collection(db, "note"), {
      titolo: cleanedTitolo,
      contenuto: cleanedContenuto,
      categoria: categoria || "Generale",
      data: dateValidation.date,
      autoreId: currentUser.uid,
      casaId: userData.casaId,
      createdAt: new Date(),
      isEvento: true
    });
    ```
  - Replaces `triggerConfetti()` with `showToast("Evento aggiunto al calendario con successo!", "success")`.
  - Navigates to `/calendario`.

---

## 4. Mascot Retirement & Cleanliness Investigation

### 4.1 Legacy Mascots Inventory & Retirement Plan

#### 1. `MiniGuy.js`:
- **Current Location**: `src/components/MiniGuy.js`.
- **Active Usage**: Mounted in `src/pages/homeUtente.js` (line 158: `<MiniGuy />`).
- **Issue**:
  - Runs continuous recursive `setTimeout` loop on an HTML5 `<canvas>` element.
  - Renders an 8-bit retro pixel pirate ("Guybrush"), conflicting with the sleek modern SaaS design tokens.
- **Action**:
  - Remove `import MiniGuy from "../components/MiniGuy";` and `<MiniGuy />` from `src/pages/homeUtente.js`.
  - Keep component in `src/components/MiniGuy.js` as an unmounted historical asset, or render safe stub.
  - Ensure zero canvas timers are active on dashboard.

#### 2. `InteractiveMascot.js`:
- **Current Location**: `src/components/InteractiveMascot.js`.
- **Active Usage**: Mounted in:
  - `src/pages/Autenticazione/homeAutenticazione.js` (line 22)
  - `src/pages/Autenticazione/viewLogin.js` (line 98)
  - `src/pages/Autenticazione/viewRegistrazione.js` (line 113)
  - `src/pages/SceltaCasa.js` (line 109)
- **Issues**:
  - Emits React console warnings during test executions:
    `console.error: Invalid DOM property 'stop-color'. Did you mean 'stopColor'?`
    (Lines 110, 111, 129, 130, 141, 142, 143, 144).
  - Attaches global `pointermove` event listener to `window`.
  - Retro character conflicts with modern card layout.
- **Action**:
  - Unmount `<InteractiveMascot />` and remove imports across all 4 pages (`homeAutenticazione`, `viewLogin`, `viewRegistrazione`, `SceltaCasa`).
  - In `src/components/InteractiveMascot.js`, replace all `stop-color` occurrences with `stopColor`.
  - Ensure any potential unmount during dragging immediately cleans up pointer capture and window listeners.

#### 3. `Celebration.js` (`triggerConfetti`):
- **Current Location**: `src/components/Celebration.js`.
- **Active Usage**: Called in 9 files upon form submission:
  - `src/pages/Autenticazione/viewLogin.js`
  - `src/pages/Autenticazione/viewRegistrazione.js`
  - `src/pages/SceltaCasa.js`
  - `src/pages/TurniPulizia/aggiuntaTurno.js`
  - `src/pages/Bacheca/AggiungiEvento.js`
  - `src/pages/Bacheca/AggiungiNota.js`
  - `src/pages/Debiti/ViewDebiti.js`
  - `src/pages/Debiti/AggiungiDebito.js`
  - `src/pages/Spesa/ViewSpesa.js`
- **Issues**:
  - Dynamically appends `<canvas>` element to `document.body`.
  - Executes a 2200ms `requestAnimationFrame` loop.
  - If navigation occurs immediately (e.g. `navigate('/bacheca')`), the orphan canvas can remain attached to `document.body` if unmount happens before completion, causing canvas memory leaks.
- **Action**:
  - For Milestone 3 scope (`AggiungiNota.js` and `AggiungiEvento.js`), remove `import { triggerConfetti } from "../../components/Celebration";` and eliminate the call, replacing with modern `showToast()`.
  - In `src/components/Celebration.js`, harden `triggerConfetti()` to be completely leak-free (or safe no-op that immediately cleans up any existing canvas).

---

## 5. CSS Tokens & Design Styles Blueprint

The following classes will be added to `src/App.css` to support modern Bulletin Board and Calendar styling:

```css
/* ==========================================================================
   MILESTONE 3: BACHECA (BULLETIN BOARD) & CALENDARIO
   ========================================================================== */

/* Priority Badges */
.bacheca-priority-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.priority-urgente {
  background: var(--color-danger-light);
  color: var(--color-danger);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.priority-importante {
  background: var(--color-warning-light);
  color: var(--color-warning);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.priority-info {
  background: var(--color-info-light);
  color: var(--color-info);
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.priority-promemoria {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border: 1px solid rgba(13, 148, 136, 0.25);
}

/* Bulletin Board Card */
.bacheca-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all var(--duration-fast) var(--ease-standard);
  position: relative;
  text-align: left;
}

.bacheca-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-medium);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.bacheca-card.is-author {
  border-left: 4px solid var(--color-primary);
}

.bacheca-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.bacheca-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bacheca-card-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1.3;
}

.bacheca-card-body {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.bacheca-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-subtle);
  padding-top: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
  gap: 10px;
}

.bacheca-author-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.bacheca-author-avatar {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: 0.75rem;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.bacheca-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Priority & Category Selector in Forms */
.pill-selector-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.pill-selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
}

.pill-selector-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.pill-selector-btn.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 0 10px var(--color-primary-glow);
}

.char-counter {
  display: block;
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: 4px;
}

/* Calendar Agenda Items */
.calendar-legend-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  padding: 8px 12px;
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.legend-chip {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot-warning {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-warning);
}

.legend-dot-purple {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-purple);
}

.agenda-empty-state {
  padding: 3rem 1rem;
  text-align: center;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  margin-top: 12px;
}

.agenda-empty-icon {
  font-size: 2.2rem;
  color: var(--text-muted);
  opacity: 0.6;
  margin-bottom: 10px;
}
```

---

## 6. Test Contract Preservation Matrix

Every test in Tier 1 and Tier 2 has been mapped to verify exact DOM selectors, strings, and interaction contracts:

| Test Identifier | Component | Assertion Target | Strategy in Modernized Blueprint | Status |
|-----------------|-----------|------------------|-----------------------------------|--------|
| **T1.27** | `ViewBacheca` | `screen.findByText(/Non ci sono comunicazioni attive/i)` and `screen.getByRole('button', { name: /Nuovo Avviso/i })` | Rendered when `note.length === 0` in empty state container. | PRESERVED |
| **T1.28** | `ViewBacheca` | `screen.getAllByTitle('Modifica')` and `screen.getAllByTitle('Elimina')` length == 1 for Alice's note | Action buttons conditionally rendered only when `n.autoreId === currentUser.uid` with exact `title` attributes. | PRESERVED |
| **T1.29** | `ViewBacheca` | `window.confirm` called, note removed from screen and Firestore | `showConfirm` with message "Sicuro di voler eliminare questa nota?" falls back to `window.confirm` in Jest unmounted environment. | PRESERVED |
| **T1.30** | `AggiungiNota` | `findByPlaceholderText(/Oggetto dell'avviso/i)`, `getByPlaceholderText(/Scrivi qui il messaggio dettagliato/i)`, `getByRole('button', { name: /Pubblica Avviso/i })`, navigate to `/bacheca` | Identical placeholder strings and button labels used in modernized form. | PRESERVED |
| **T1.31** | `ModificaNota` | `findByDisplayValue('Vecchia descrizione')`, `getByRole('button', { name: /Salva Modifiche/i })`, navigate to `/bacheca` | Controlled form values and exact button label preserved. | PRESERVED |
| **T1.32** | `ViewCalendario` | `findByText('Consegna Pacco')`, `getByText('Cucina')`, `getByRole('button', { name: /Aggiungi Evento a questa data/i })` | Renders event title, chore location chip, and exact button text. | PRESERVED |
| **T1.33** | `AggiungiEvento` | `findByPlaceholderText(/es\. Cena di Casa/i)`, `querySelector('input[type="date"]')`, `getByPlaceholderText(/Orario preciso, note organizzative/i)`, `getByRole('button', { name: /Salva Evento/i })`, navigate to `/calendario` | Identical placeholders, date input, and button label preserved. | PRESERVED |
| **T2.24** | `ViewBacheca` | `screen.queryByTitle('Modifica')` and `screen.queryByTitle('Elimina')` are null for Bob's note when Alice is logged in | Action buttons rendered only if `n.autoreId === currentUser.uid`. | PRESERVED |
| **T2.25** | `ModificaNota` | `expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Non sei l'autore di questo avviso/i))` | `showToast` fallback triggers `window.alert` with exact warning message when no ToastContainer is mounted. | PRESERVED |
| **T2.26** | `ModificaNota` | `expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/questo avviso appartiene a un'altra abitazione/i))` | `showToast` fallback triggers `window.alert` with exact error message. | PRESERVED |
| **T2.27** | `AggiungiNota` | `findByText(/Il titolo dell'avviso è obbligatorio/i)` on empty/whitespace title | Exact validation string retained in `error` alert. | PRESERVED |
| **T2.28** | `AggiungiEvento` | `findByText(/Data non specificata/i)` on invalid date format | Exact validation fallback string retained. | PRESERVED |
| **T2.29** | `AggiungiNota` | Sanitizes HTML tags `<b\>`, `<i\>` | `sanitizeText(nota.titolo, 80)` and `sanitizeText(nota.contenuto, 1500)` retained. | PRESERVED |

---

## 7. Zero-Emoji & Iconography Standards

HouseHelper strictly forbids any Unicode emoji characters or raw text emoticons. All iconography must use FontAwesome vector classes:

| Feature / Concept | Approved FontAwesome Icon | Prohibited (DO NOT USE) |
|-------------------|--------------------------|-------------------------|
| Pin / Bulletin Board | `<i className="fas fa-thumbtack"></i>` | Emojis (📌, 📍) |
| Calendar | `<i className="fas fa-calendar-alt"></i>` / `<i className="far fa-calendar-alt"></i>` | Emojis (📅, 🗓️) |
| Time / Clock | `<i className="far fa-clock"></i>` | Emojis (⏰, ⏱️) |
| Cleaning Chore | `<i className="fas fa-broom"></i>` | Emojis (🧹, 🧼) |
| Urgent Priority | `<i className="fas fa-exclamation-triangle"></i>` | Emojis (⚠️, 🚨) |
| Important Priority | `<i className="fas fa-star"></i>` | Emojis (⭐, ❗) |
| Info / Announcement | `<i className="fas fa-info-circle"></i>` | Emojis (ℹ️, 📢) |
| Reminder | `<i className="fas fa-bell"></i>` | Emojis (🔔, ⏰) |
| Free Day / Empty State | `<i className="fas fa-calendar-check"></i>` | Emojis (🏖️, ☕) |
| Edit Action | `<i className="fas fa-edit"></i>` / `<i className="fas fa-pen"></i>` | Emojis (✏️, 📝) |
| Delete Action | `<i className="fas fa-trash-alt"></i>` / `<i className="fas fa-trash"></i>` | Emojis (🗑️, ❌) |
| Add / Create | `<i className="fas fa-plus"></i>` | Emojis (➕) |
| Back / Return | `<i className="fas fa-arrow-left"></i>` | Emojis (⬅️, 🔙) |

---

## 8. Implementation Guide & Sequencing

When the implementer proceeds, the recommended execution order is:
1. **Mascot Retirement & DOM Cleanliness**:
   - In `src/components/InteractiveMascot.js`: replace `stop-color` with `stopColor` on lines 110, 111, 129, 130, 141, 142, 143, 144.
   - Unmount `<InteractiveMascot />` from `homeAutenticazione.js`, `viewLogin.js`, `viewRegistrazione.js`, `SceltaCasa.js`.
   - In `src/pages/homeUtente.js`: unmount `<MiniGuy />` and remove its import.
   - In `src/components/Celebration.js`: ensure `triggerConfetti()` cleans up any canvas nodes.
2. **Design Tokens & CSS**:
   - Append the Milestone 3 styles (Section 5 above) to `src/App.css`.
3. **Bulletin Board**:
   - Modernize `src/pages/Bacheca/ViewBacheca.js` with priority tags, author avatars, and non-blocking dialogs (`showConfirm`, `showToast`).
   - Modernize `src/pages/Bacheca/AggiungiNota.js` with priority pills selector, character counters, and toast notifications (retire `triggerConfetti()`).
   - Modernize `src/pages/Bacheca/ModificaNota.js` with priority pills selector, character counters, and toast notifications.
4. **Calendar Views**:
   - Modernize `src/pages/Bacheca/ViewCalendario.js` with schedule cards, legend pills, and empty state.
   - Modernize `src/pages/Bacheca/AggiungiEvento.js` with category selector pills, character counters, and toast notifications (retire `triggerConfetti()`).
5. **Verification**:
   - Run `node scripts/verify-zero-emojis.js` -> 0 emojis.
   - Run `npm test -- --watchAll=false src/test/tier1_features/bacheca_calendario.test.jsx src/test/tier2_boundaries/bacheca_calendario_boundary.test.jsx` -> 13 passed, 0 failures.
   - Run all test suites: `npm test -- --watchAll=false` -> 100% pass, zero React `stop-color` warnings.
