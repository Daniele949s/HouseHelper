# HouseHelper - Feature Inventory, Business Logic, and Test Architecture Blueprint

**Subagent**: `explorer_survey_features` (Teamwork Explorer)  
**Date**: 2026-11-02  
**Target Repository**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`  
**Relevant Requirements**: R1 (UI/UX Modernization), R2 (Zero-Emoji Prohibition), R3 (Architectural & Technical Debt Cleanup), R4 (Automated Testing & Build Verification)

---

## 1. Executive Summary & Problem Scope

HouseHelper is a multi-tenant React application designed to manage shared household chores, expenses, grocery lists, and announcements. The application is built on:
- **Frontend Stack**: React 19 (`react@^19.2.3`, `react-dom@^19.2.3`), React Router v7 (`react-router-dom@^7.10.1`), Create React App / `react-scripts@5.0.1`.
- **Backend / BaaS**: Firebase v12 (`firebase@^12.14.0`) utilizing Firebase Authentication and Cloud Firestore.
- **Styling**: Vanilla CSS with custom properties (`App.css`, `index.css`, `HouseAnalytics.css`) alongside legacy assets in `css_template/`.

This investigation establishes a complete blueprint for modernization by:
1. Mapping out every application feature, input/output boundary, state lifecycle, and Firestore rule.
2. Cataloging all 34 emoji occurrences across 16 files for strict compliance with Requirement R2.
3. Diagnosing the current testing state, test runner compatibility friction (React 19 vs Jest 27 in CRA, ESM modules, unmocked Firebase network calls, recursive timers, and canvas contexts).
4. Providing a 4-Tier Test Architecture Blueprint and automated verification scripts to ensure production readiness without requiring live Firebase credentials.

---

## 2. Comprehensive Feature Inventory & Logic Mapping

### 2.1 Authentication & Household Management

#### Files:
- `src/contexts/AuthContext.js` (lines 1–50)
- `src/pages/Autenticazione/homeAutenticazione.js` (lines 1–54)
- `src/pages/Autenticazione/viewLogin.js` (lines 1–182)
- `src/pages/Autenticazione/viewRegistrazione.js` (lines 1–209)
- `src/pages/SceltaCasa.js` (lines 1–199)
- `src/pages/homeUtente.js` (lines 1–318)
- `src/components/ProtectedRoute.js` (lines 1–10)
- `src/components/RouteGuards.js` (lines 1–59)

#### Feature Logic & User Interaction Flows:
1. **Landing & Public Navigation**:
   - `HomeAutenticazione`: Displays app welcome screen with Mascot. If an authenticated user lands here, an effect automatically redirects them: to `/home` if `userData.casaId` exists, or to `/scelta-casa` if they lack a household.
   - Public route guard (`PublicOnlyRoute` in `RouteGuards.js:47–58`) prevents logged-in users from seeing login/registration screens, redirecting them straight to their dashboard or house selection.
2. **User Registration (`ViewRegistrazione`)**:
   - **Inputs**: `username` (string, sanitized 2–30 chars), `email` (string, validated format, max 100 chars), `password` (string, 6–128 chars).
   - **Validation Rules**: `sanitizeText(username, 30)` rejecting length < 2; `isValidEmail(trimmedEmail)`; password length bounded $[6, 128]$.
   - **Operations**:
     - `createUserWithEmailAndPassword(auth, trimmedEmail, password)`
     - `setDoc(doc(db, "utenti", userCredential.user.uid), { username, email, casaId: null, createdAt: new Date() })`
     - Invokes `triggerConfetti()` and navigates to `/scelta-casa`.
   - **Google Provider Alternative**: `signInWithPopup(auth, googleProvider)`. If the user document does not exist, it initializes it with `casaId: null` and routes to `/scelta-casa`.
3. **User Authentication (`ViewLogin`)**:
   - **Inputs**: `email`, `password`.
   - **Validation**: Email syntax check, password presence.
   - **Operations**: `signInWithEmailAndPassword(auth, trimmedEmail, password)`. Fetches user document from Firestore: if `userDoc.data().casaId` exists $\rightarrow$ `/home`, else $\rightarrow$ `/scelta-casa`.
   - **Error Handling**: Distinct user feedback for `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password`, and rate-limiting `auth/too-many-requests`.
4. **Household Selection & Enrollment (`SceltaCasa`)**:
   - Guarded by `HouseSelectRoute`: users who already belong to a household are redirected to `/home`.
   - **Flow A — Create New House**:
     - Input: `nomeCasa` (max 50 chars).
     - Generates 6-character uppercase alphanumeric code using pool `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excluding ambiguous characters like 0/O, 1/I).
     - Creates doc in `case` collection: `{ nome, codiceUnivoco, createdAt, creatoreId: currentUser.uid }`.
     - Updates `utenti/{userId}` with `{ casaId: casaRef.id }`.
     - Triggers confetti, alerts user with their code, navigates to `/home`.
   - **Flow B — Join Existing House with Code**:
     - Input: `codiceCasa` (sanitized alphanumeric uppercase, max 10 chars).
     - Queries `case` collection: `where("codiceUnivoco", "==", cleanedCodice)`.
     - If found: updates `utenti/{userId}` with `{ casaId: casaDoc.id }`, updates context state, routes to `/home`.
     - If not found: displays error alert and triggers Mascot error state.
5. **Dashboard & Household Details (`HomeUtente`)**:
   - Guarded by `HouseProtectedRoute`: verifies both `currentUser` and `userData.casaId`.
   - Fetches concurrently:
     - Household metadata from `case/{casaId}`.
     - Roommate directory from `utenti` where `casaId == casaId` into a map `utentiMap[uid] = username`.
     - Upcoming shift for current user (`data >= today`, sorted ascending).
     - Net debt balance for current user ($\sum \text{creditore} - \sum \text{debitore}$).
     - Grocery item count and latest bulletin board note.
   - Actions:
     - Copy invite code to clipboard (displays temporary "Copiato!" badge).
     - Leave house (`lasciaCasa`): confirms with user, sets `utenti/{userId}.casaId = null`, routes to `/scelta-casa`.
     - Logout: signs out from Firebase Auth, routes to `/login`.

---

### 2.2 Cleaning Shifts / TurniPulizia

#### Files:
- `src/pages/TurniPulizia/viewTurni.js` (lines 1–179)
- `src/pages/TurniPulizia/aggiuntaTurno.js` (lines 1–186)
- `src/pages/TurniPulizia/modificaTurno.js` (lines 1–226)
- `src/models/modelloTurno.js` (lines 1–9) *(Dead code / unreferenced legacy)*

#### Feature Logic & User Interaction Flows:
1. **Cleaning Shifts Overview (`VisualizzaTurni`)**:
   - Queries `turni` collection where `casaId == userData.casaId`.
   - Sorts shifts by `data` ascending (chronological schedule).
   - Past shifts ($< \text{today}$) rendered with reduced opacity ($0.7$).
   - Card badges display formatted calendar day and abbreviated month (`it-IT`).
   - Each card displays: cleaning zones (`luoghi` or `mansione`), assigned roommates (`nomi`), time slot (`fasciaOraria`), and optional instructions (`procedura`).
   - Actions:
     - "Nuovo Turno" $\rightarrow$ `/turni/aggiungi`.
     - "Modifica" $\rightarrow$ `/turni/modifica/:id`.
     - "Elimina" $\rightarrow$ verifies `turno.casaId === userData.casaId`, asks confirmation, executes `deleteDoc(doc(db, "turni", id))`.
2. **Chore Creation (`AggiuntaTurno`)**:
   - **Inputs**:
     - `nomi`: string of comma-separated names $\rightarrow$ sanitized into array of strings (max 10 people, 50 chars each).
     - `data`: date input string $\rightarrow$ validated via `validateDate` (range 2020-01-01 to 2100-12-31, leap-year aware).
     - `fasciaOraria`: dropdown selection from 16 hourly intervals (`07:00 - 08:00` to `22:00 - 23:00`).
     - `luoghi`: comma-separated cleaning areas $\rightarrow$ sanitized array (max 10 items, 80 chars each).
     - `procedura`: optional text instructions $\rightarrow$ sanitized array (max 10 items, 150 chars each).
   - **Submission**:
     - Writes to `turni` collection: `{ nomi, data, luoghi, procedura, fasciaOraria: [fasciaOraria], casaId, utenteId: currentUser.uid, mansione: luoghi.join(", ") }`.
     - Invokes `triggerConfetti()` and navigates to `/turni`.
3. **Chore Modification (`ModificaTurno`)**:
   - Fetches shift document by URL param `:id`.
   - **Security Checks**:
     - If document does not exist $\rightarrow$ alert and redirect to `/turni`.
     - Multi-tenant isolation: verifies `data.casaId === userData.casaId`. If mismatch $\rightarrow$ unauthorized alert and redirect.
   - Populates form with existing comma-separated strings.
   - On submit: sanitizes fields, enforces current `userData.casaId`, and calls `updateDoc(doc(db, "turni", id), turnoAggiornato)`.

---

### 2.3 Debts & Expenses (Spese e Debiti)

#### Files:
- `src/pages/Debiti/ViewDebiti.js` (lines 1–288)
- `src/pages/Debiti/AggiungiDebito.js` (lines 1–260)

#### Feature Logic, Algorithms & State:
1. **Expense Data Schema (`debiti` collection)**:
   - `importo`: numeric string with 2 decimal places (e.g. `"45.50"`), validated $0.01 \le \text{importo} \le 50000.00$.
   - `descrizione`: sanitized string (max 100 chars).
   - `creditoreId`: user ID of person who paid.
   - `debitoreId`: user ID of person who owes.
   - `casaId`: household ID.
   - `createdAt`: Firestore timestamp / JS Date.
2. **Net Personal Balance Calculation Algorithm**:
   - For a given user $U$ across all active household debt documents:
     $$\text{Balance}(U) = \sum_{d \in \text{Debiti}, d.\text{creditoreId} = U} \text{float}(d.\text{importo}) - \sum_{d \in \text{Debiti}, d.\text{debitoreId} = U} \text{float}(d.\text{importo})$$
   - If $\text{Balance} > 0$: user is owed money (rendered in green with `+` sign).
   - If $\text{Balance} < 0$: user owes money to roommates (rendered in red).
   - If $\text{Balance} == 0$: accounts are in perfect parity.
3. **Splitting Algorithm (`isDiviso` checkbox in `AggiungiDebito`)**:
   - **Single Debt Mode (`!isDiviso`)**:
     - Form requires explicit selection of `creditoreId` and `debitoreId`.
     - Validates that `debitoreId !== creditoreId` (prevents self-debt).
     - Validates that both users belong to `utenti` where `casaId == userData.casaId`.
     - Inserts 1 document into `debiti`.
   - **Automatic Multi-Roommate Split Mode (`isDiviso`)**:
     - Checks total members $N = |\text{coinquilini}|$. Requires $N \ge 2$.
     - Computes equal share:
       $$\text{Quota} = \left(\frac{\text{Total Amount}}{N}\right).\text{toFixed}(2)$$
     - Validates $\text{Quota} > 0$.
     - Generates $N - 1$ distinct documents in parallel via `Promise.all`: for every roommate $C \ne \text{creditoreId}$, writes a document with `debitoreId: C.id`, `creditoreId: debito.creditoreId`, `descrizione: "${descrizione} (Quota)"`, and `importo: Quota`.
4. **Debt Settlement Flow (`saldaDebito`)**:
   - User clicks "Segna come saldato" on a debt entry where they are debtor or creditor.
   - Verifies `debito.casaId === userData.casaId`.
   - Deletes the debt document via `deleteDoc(doc(db, "debiti", id))`.
   - Triggers `triggerConfetti()` and refreshes debt list and personal balance.

---

### 2.4 Grocery List (Lista della Spesa)

#### Files:
- `src/pages/Spesa/ViewSpesa.js` (lines 1–233)

#### Feature Logic & User Interaction Flows:
1. **Grocery Data Schema (`spesa` collection)**:
   - `nome`: sanitized string (max 80 chars).
   - `comprato`: boolean (default `false`).
   - `casaId`: household ID.
   - `autoreId`: creator's user UID.
   - `createdAt`: Date / timestamp.
2. **Display & Sorting Logic**:
   - Queries `spesa` where `casaId == userData.casaId`.
   - Sorts items: unbought items (`comprato === false`) appear first, then sorted by `createdAt` descending. Bought items appear at the bottom with strike-through styling.
   - Real-time counter metrics: "Da comprare" ($N_{\text{unbought}}$) and "Presi" ($N_{\text{bought}}$).
3. **Operations**:
   - **Add Item**: sanitizes input `newItem`, executes `addDoc`, clears input.
   - **Toggle Bought Status**: executes `updateDoc(doc(db, "spesa", id), { comprato: !statoAttuale })`. If marked as bought (`!statoAttuale === true`), triggers `triggerConfetti()`.
   - **Delete Item**: executes `deleteDoc(doc(db, "spesa", id))`.

---

### 2.5 Bulletin Board & Calendar (Bacheca & Calendario)

#### Files:
- `src/pages/Bacheca/ViewBacheca.js` (lines 1–194)
- `src/pages/Bacheca/AggiungiNota.js` (lines 1–130)
- `src/pages/Bacheca/ModificaNota.js` (lines 1–178)
- `src/pages/Bacheca/ViewCalendario.js` (lines 1–196)
- `src/pages/Bacheca/AggiungiEvento.js` (lines 1–145)

#### Feature Logic & Interaction Flows:
1. **Data Model (`note` collection)**:
   - `titolo`: string, sanitized max 80 chars.
   - `contenuto`: string, sanitized max 1500 chars.
   - `data`: string (ISO `YYYY-MM-DD` or null). Optional for regular bulletin notes; mandatory for calendar events.
   - `autoreId`: UID of the author.
   - `casaId`: household ID.
   - `createdAt`: creation timestamp.
   - `isEvento`: boolean flag set to `true` when created via Calendar.
2. **Bulletin Board View (`ViewBacheca`)**:
   - Lists all notes for the household, ordered by `createdAt` descending.
   - Author-specific actions: Edit and Delete buttons are displayed **only** when `note.autoreId === currentUser.uid`.
   - Attempts to edit or delete someone else's note are blocked by client checks and Firestore rules.
3. **Calendar Integration View (`ViewCalendario`)**:
   - Integrated with `react-calendar`.
   - Queries both `note` (where `data` is populated) and `turni` (where `data` is populated) for `casaId`.
   - `tileContent`: dynamically renders colored indicators in monthly calendar cells:
     - Warning/Orange dot for cleaning shift (`turni`).
     - Purple dot for household event (`note`).
   - Selected date view (`itemsDelGiorno`): lists all shifts and events occurring on `dataSelezionata`.
   - "Aggiungi Evento a questa data": routes to `/calendario/aggiungi` passing pre-selected date via `location.state.dataPreimpostata`.
4. **Calendar Event Creation (`AggiungiEvento`)**:
   - Reads pre-filled date from route state if available.
   - Enforces non-empty title, valid date, and description.
   - Saves to `note` collection with `isEvento: true`. Triggers confetti, routes back to `/calendario`.

---

### 2.6 Interactive Mascot & Celebration Feedback System

#### Files:
- `src/components/InteractiveMascot.js` (lines 1–165)
- `src/components/MiniGuy.js` (lines 1–125)
- `src/components/Celebration.js` (lines 1–70)
- `src/components/HouseAnalytics.js` (lines 1–291)
- `src/components/guyFramesData.json`

#### Mechanism & Logic Details:
1. **Interactive Mascot (`InteractiveMascot.js`)**:
   - Renders SVG character "Chloe".
   - **Eye Tracking**: calculates vector between face center and cursor coordinates (or center of `targetInputRef` when input is focused). Bounds pupil translation to maximum 14px radius with proportional distance factor.
   - **Interactive Dragging**: pointer down captures pointer (`setPointerCapture`); horizontal drag moves mascot across X axis (clamped between $-120\text{px}$ and $+120\text{px}$). On release, smoothly springs back to center using bezier transition `cubic-bezier(0.34, 1.56, 0.64, 1)`.
   - **Error Feedback**: when `isError` prop is true, switches mascot mouth to an alarmed expression and displays a curved error speech bubble above the head.
2. **Dashboard Pirate Mascot (`MiniGuy.js`)**:
   - Renders into an HTML5 `<canvas>` sized $36 \times 25$ pixels with `imageRendering: pixelated`.
   - Reads bitmap palette and coordinate frames from `guyFramesData.json`.
   - Runs a 41-step animation sequence (`ANIMATION_SEQUENCE`) simulating Guybrush with a spyglass and blinking eyes.
   - Animates continuously via recursive `setTimeout(nextFrame, dur)`.
3. **Confetti Celebration (`Celebration.js`)**:
   - Exported function `triggerConfetti()`.
   - Dynamically injects a full-screen fixed canvas (`z-index: 999999`, `pointer-events: none`).
   - Spawns 75 particles with randomized velocities, rotations, and 6 vibrant palette colors.
   - Simulates gravity ($v_y += 0.35$) and rotational decay over a 2200ms duration using `requestAnimationFrame`.
   - Automatically removes canvas from DOM upon animation completion.
4. **House Analytics Visualization (`HouseAnalytics.js`)**:
   - Renders 3 interactive tabs:
     - **Tab 1: Spese (Donut Chart)**: calculates SVG circle stroke-dasharray and offsets for proportional spending per roommate. Shows total volume in center.
     - **Tab 2: Turni (Bar Distribution)**: calculates total, completed ($< \text{today}$), and scheduled ($\ge \text{today}$) chore KPIs, plus a normalized horizontal bar graph of shifts completed per roommate.
     - **Tab 3: Spesa (Supply Step Progress)**: calculates completion percentage and displays multi-step checkpoint indicators (`Lista creata` $\rightarrow$ `Metà spesa` $\rightarrow$ `Completata`).

---

### 2.7 Architecture Shell, Navigation & Theme System

#### Files:
- `src/App.js` (lines 1–133)
- `src/components/MobileNavigation.js` (lines 1–137)
- `src/components/ThemeToggle.js` (lines 1–30)
- `src/contexts/ThemeContext.js` (lines 1–36)
- `src/components/ScrollProgressBar.js` (lines 1–48)
- `src/components/BackgroundSlideshow.js` (lines 1–37)
- `src/components/AppFooter.js` (lines 1–35)
- `src/pages/NotFound.js` (lines 1–44)

#### Mechanism Details:
1. **Theme System (`ThemeContext` & `ThemeToggle`)**:
   - Supported modes: `"dark"` (default) and `"light"`. Persisted in `localStorage.getItem("househelper_theme")`.
   - Toggles root CSS classes: `.dark-theme` / `.light-theme`.
   - Lightsaber-styled switch component with animated saber blade.
2. **Mobile Navigation Drawer (`MobileNavigation`)**:
   - Top-bar burger toggle button with morphing 2-bar animation.
   - Opens a 100% solid opaque fullscreen navigation drawer.
   - Programmatically locks body and HTML scroll (`overflow: hidden`) while open.
   - Automatically closes upon route navigation (`useEffect` on `location.pathname`).
3. **Scroll & Background Effects**:
   - `ScrollProgressBar`: tracks window scroll percentage and renders a top-right gradient accent line.
   - `BackgroundSlideshow`: cycles between 3 background images (`bg01.jpg`, `bg02.jpg`, `bg03.jpg`) every 7000ms. Applies full-saturation backdrop on landing/auth routes and subtle dimmed treatment in authenticated application interior.

---

### 2.8 Comprehensive Firebase & Firestore Rules Matrix

Based on `firestore.rules`:

| Collection | Path | Read Rule | Create Rule | Update Rule | Delete Rule | Key Validations & Constraints |
|---|---|---|---|---|---|---|
| **utenti** | `/utenti/{userId}` | `isSignedIn()` | `isOwner(userId)` | `isOwner(userId)` | `false` (Deny) | Direct profile deletion prohibited. Read allowed to any signed-in user to resolve roommate names. |
| **case** | `/case/{casaId}` | `isSignedIn()` | `isSignedIn()` | `belongsToSameHouse(casaId)` | `false` (Deny) | Create open to any signed in user; updates restricted to members where `getUserCasaId() == casaId`. |
| **turni** | `/turni/{turnoId}` | `belongsToSameHouse(resource.data.casaId)` | `request.resource.data.casaId == getUserCasaId()` | `belongsToSameHouse(resource.data.casaId)` | `belongsToSameHouse(resource.data.casaId)` | Multi-tenant isolation: cannot view, modify, or create chores outside user's active household. |
| **debiti** | `/debiti/{debitoId}` | `belongsToSameHouse(resource.data.casaId)` | `request.resource.data.casaId == getUserCasaId() && request.resource.data.importo is string && float(request.resource.data.importo) > 0.0 && float(request.resource.data.importo) <= 50000.0` | `belongsToSameHouse(resource.data.casaId)` | `belongsToSameHouse(resource.data.casaId)` | Strict monetary validation: amount must be a string, strictly $> 0.00$ and $\le 50000.00$. |
| **spesa** | `/spesa/{spesaId}` | `belongsToSameHouse(resource.data.casaId)` | `request.resource.data.casaId == getUserCasaId()` | `belongsToSameHouse(resource.data.casaId)` | `belongsToSameHouse(resource.data.casaId)` | Chained to current user household. |
| **note** | `/note/{notaId}` | `belongsToSameHouse(resource.data.casaId)` | `request.resource.data.casaId == getUserCasaId()` | `belongsToSameHouse(resource.data.casaId)` | `belongsToSameHouse(resource.data.casaId)` | Client code additionally validates `note.autoreId === currentUser.uid` before permitting edit/delete. |
| **Default** | `/{document=**}` | `false` | `false` | `false` | `false` | Global catch-all deny rule. |

---

### 2.9 Full Inventory of Emoji / Emoticon Violations (Requirement R2)

Our scan revealed **34 emoji occurrences** across 16 files in `src/`, plus 1 in `public/index.html`:

| # | File Path | Line Number | Offending Code Snippet | Emoji Character | Recommended SVG / Icon Replacement |
|---|---|---|---|---|---|
| 1 | `src/components/ThemeToggle.js` | 23 | `{isLight ? "☀️" : "🌙"}` | ☀️, 🌙 | `<i className="fas fa-sun"></i>` / `<i className="fas fa-moon"></i>` |
| 2 | `src/components/MiniGuy.js` | 101 | `title="Mascotte Pirata fa la guardia alla casa 🏴‍☠️"` | 🏴‍☠️ | Remove emoji from title attribute string |
| 3 | `src/pages/Autenticazione/homeAutenticazione.js` | 43 | `<span>✨ Turni</span>` | ✨ | `<i className="fas fa-broom"></i> Turni` |
| 4 | `src/pages/Autenticazione/homeAutenticazione.js` | 45 | `<span>💸 Spese</span>` | 💸 | `<i className="fas fa-wallet"></i> Spese` |
| 5 | `src/pages/Autenticazione/homeAutenticazione.js` | 47 | `<span>🛒 Spesa</span>` | 🛒 | `<i className="fas fa-shopping-cart"></i> Spesa` |
| 6 | `src/pages/Autenticazione/homeAutenticazione.js` | 49 | `<span>🗓️ Calendario</span>` | 🗓️ | `<i className="far fa-calendar-alt"></i> Calendario` |
| 7 | `src/pages/Autenticazione/viewLogin.js` | 106 | `<h1>Bentornato 👋</h1>` | 👋 | `<h1>Bentornato</h1>` |
| 8 | `src/pages/Autenticazione/viewRegistrazione.js` | 121 | `<h1>Crea Account ✨</h1>` | ✨ | `<h1>Crea Account</h1>` |
| 9 | `src/pages/homeUtente.js` | 152 | `<h1>{casa?.nome \|\| "La tua Casa"} 🏠</h1>` | 🏠 | `<h1>{casa?.nome \|\| "La tua Casa"}</h1>` |
| 10 | `src/pages/homeUtente.js` | 174 | `<span className="service-icon">🧹</span>` | 🧹 | `<i className="fas fa-broom service-icon"></i>` |
| 11 | `src/pages/homeUtente.js` | 178 | `<span className="service-icon">💰</span>` | 💰 | `<i className="fas fa-wallet service-icon"></i>` |
| 12 | `src/pages/homeUtente.js` | 182 | `<span className="service-icon">🛒</span>` | 🛒 | `<i className="fas fa-shopping-cart service-icon"></i>` |
| 13 | `src/pages/homeUtente.js` | 186 | `<span className="service-icon">🗓️</span>` | 🗓️ | `<i className="far fa-calendar-alt service-icon"></i>` |
| 14 | `src/pages/homeUtente.js` | 190 | `<span className="service-icon">📌</span>` | 📌 | `<i className="fas fa-thumbtack service-icon"></i>` |
| 15 | `src/pages/homeUtente.js` | 222 | `🎉 Nessun turno oggi. Casa splendente!` | 🎉 | `<i className="fas fa-check-circle"></i> Nessun turno oggi.` |
| 16 | `src/pages/NotFound.js` | 23 | `🧭` | 🧭 | `<i className="fas fa-compass fa-3x"></i>` |
| 17 | `src/pages/SceltaCasa.js` | 93 | `alert("Benvenuto in ...! 🎉");` | 🎉 | Remove emoji from alert string |
| 18 | `src/pages/SceltaCasa.js` | 112 | `<h1>Configurazione Casa 🏠</h1>` | 🏠 | `<h1>Configurazione Casa</h1>` |
| 19 | `src/pages/TurniPulizia/aggiuntaTurno.js` | 102 | `<h1>Nuovo Turno Pulizia 🧹</h1>` | 🧹 | `<h1>Nuovo Turno Pulizia</h1>` |
| 20 | `src/pages/TurniPulizia/viewTurni.js` | 79 | `<h1>Turni Pulizia 🧹</h1>` | 🧹 | `<h1>Turni Pulizia</h1>` |
| 21 | `src/pages/TurniPulizia/viewTurni.js` | 102 | `<span style={{ fontSize: "3rem" }}>🧹</span>` | 🧹 | `<i className="fas fa-broom fa-2x"></i>` |
| 22 | `src/pages/TurniPulizia/modificaTurno.js` | 145 | `<h1>Modifica Turno ✏️</h1>` | ✏️ | `<h1>Modifica Turno</h1>` |
| 23 | `src/pages/Bacheca/ViewBacheca.js` | 100 | `<h1>Bacheca Condivisa 📌</h1>` | 📌 | `<h1>Bacheca Condivisa</h1>` |
| 24 | `src/pages/Bacheca/ViewBacheca.js` | 117 | `<span style={{ fontSize: "3rem" }}>📝</span>` | 📝 | `<i className="far fa-clipboard fa-2x"></i>` |
| 25 | `src/pages/Bacheca/ModificaNota.js` | 122 | `<h1>Modifica Avviso ✏️</h1>` | ✏️ | `<h1>Modifica Avviso</h1>` |
| 26 | `src/pages/Bacheca/AggiungiEvento.js` | 86 | `<h1>Nuovo Evento Calendario 🗓️</h1>` | 🗓️ | `<h1>Nuovo Evento Calendario</h1>` |
| 27 | `src/pages/Bacheca/ViewCalendario.js` | 100 | `<h1>Calendario Casa 🗓️</h1>` | 🗓️ | `<h1>Calendario Casa</h1>` |
| 28 | `src/pages/Bacheca/ViewCalendario.js` | 133 | `<span style={{ fontSize: '2rem' }}>☕</span>` | ☕ | `<i className="fas fa-calendar-check fa-2x"></i>` |
| 29 | `src/pages/Bacheca/AggiungiNota.js` | 72 | `<h1>Nuovo Avviso 📌</h1>` | 📌 | `<h1>Nuovo Avviso</h1>` |
| 30 | `src/pages/Debiti/ViewDebiti.js` | 124 | `<h1>Spese & Debiti 💰</h1>` | 💰 | `<h1>Spese & Debiti</h1>` |
| 31 | `src/pages/Debiti/ViewDebiti.js` | 178 | `<span style={{ fontSize: "3rem" }}>💸</span>` | 💸 | `<i className="fas fa-receipt fa-2x"></i>` |
| 32 | `src/pages/Debiti/AggiungiDebito.js` | 163 | `<h1>Nuova Spesa 💸</h1>` | 💸 | `<h1>Nuova Spesa</h1>` |
| 33 | `src/pages/Spesa/ViewSpesa.js` | 129 | `<h1>Lista della Spesa 🛒</h1>` | 🛒 | `<h1>Lista della Spesa</h1>` |
| 34 | `src/pages/Spesa/ViewSpesa.js` | 180 | `<span style={{ fontSize: "3rem" }}>🍎</span>` | 🍎 | `<i className="fas fa-shopping-basket fa-2x"></i>` |
| 35 | `public/index.html` | 27 | `<title>HouseHelper 🏠</title>` | 🏠 | `<title>HouseHelper</title>` |

---

## 3. Current Automated Testing State & Gap Analysis

### 3.1 Existing Test Files and Coverage Assessment

Only two test files currently exist in `src/`:
1. `src/App.test.js`:
   - 18 lines of code.
   - Stubs `./contexts/AuthContext` with a static mock (`currentUser: null, userData: null`).
   - Only mounts `<NotFound />` and checks if `"404"` and `"Pagina Non Trovata"` render.
   - Does **not** render `App.js` itself, does not test route transitions, navigation guards, or page components.
2. `src/utils/security.test.js`:
   - 129 lines of unit tests covering `src/utils/security.js`.
   - Tests input sanitization (`sanitizeText`), numeric validation boundaries (`validateNumber`, `safeFloat`), calendar validation (`validateDate`), invite code alphanumeric stripping (`sanitizeAlphanumeric`), list filtering (`sanitizeList`), and email validation (`isValidEmail`).
   - Good coverage of pure utility functions, but completely decoupled from React DOM components and Firebase.
3. `src/__mocks__/react-router-dom.js`:
   - Global manual mock that stubs `useNavigate`, `useLocation`, `useParams`, `Navigate`, `Outlet`, `BrowserRouter`, `Routes`, `Route`.
   - While intended to bypass Jest ESM issues with `react-router-dom` v7, it blocks tests from verifying actual navigation flows or utilizing `MemoryRouter`.

### 3.2 Diagnostic: Why `npm test` Encounters Friction, Hanging or Failure

When attempting to run automated tests out-of-the-box in this environment, several failure and hanging modes exist:

1. **Interactive Watch Mode Default**:
   `react-scripts test` defaults to Jest's interactive watch mode (`jest --watch`). In CI or non-interactive terminals, if `CI=true` or `--watchAll=false` is omitted, the process hangs indefinitely waiting for keyboard input on stdin.
2. **React 19 vs Jest 27 / CRA Incompatibility**:
   `react-scripts 5.0.1` bundles Jest 27 (`jest@27.5.1`) and older Babel transformation presets. `react@19.2.3` introduces new React DOM root internals and JSX transformations. Without proper configuration, rendering components with modern React hooks in Jest 27 DOM environments produces warnings or act-environment mismatches.
3. **React Router v7 ESM-Only Export Issue**:
   `react-router-dom@^7.10.1` is distributed as ES Modules. Jest 27 inside `react-scripts` does not transform `node_modules` by default, throwing `SyntaxError: Cannot use import statement outside a module`. The manual mock in `src/__mocks__/react-router-dom.js` was created as a workaround, but it lacks router state management.
4. **Live Firebase Network Initialization**:
   `src/firebase.js` initializes Firebase using live project identifiers (`househelper-12050`). If any component imports `firebase.js` without mocks, it initializes Firebase Auth and Firestore. During test runs:
   - Any unmocked `getDocs` or `onAuthStateChanged` attempts to communicate over the network or hangs waiting for an unreachable Firestore server.
5. **Continuous Timers & 2D Canvas Leaks**:
   - `MiniGuy.js` has an unmocked recursive `setTimeout(nextFrame, dur)` loop and requires `canvas.getContext("2d")`. In JSDOM, HTMLCanvasElement returns `null` or stubs without a 2D context unless mocked. This causes `TypeError: ctx.clearRect is not a function` and prevents Jest workers from exiting.
   - `Celebration.js` injects a DOM canvas and calls `requestAnimationFrame`. If triggered in tests, it crashes if canvas context is missing.
   - `BackgroundSlideshow.js` initiates `setInterval(..., 7000)`. If unmounted improperly or timers aren't cleared, Jest warns about open handles.
6. **17 Circular Import Cycles**:
   Every page component imports `App.css`, while `App.js` imports every page component. In Jest, importing `App.js` leads to cascading loads of all 17 page files, their Firebase imports, and stylesheets simultaneously.

### 3.3 Structural Gaps in the Testing Suite

- **Unit Testing Gaps**: Zero unit tests for all 8 custom components (`InteractiveMascot`, `MiniGuy`, `Celebration`, `HouseAnalytics`, `ThemeToggle`, `MobileNavigation`, `ScrollProgressBar`, `AppFooter`) and zero tests for `AuthContext`, `ThemeContext`, and `RouteGuards`.
- **Integration Testing Gaps**: Zero integration tests for core household workflows:
  - Sign-in and sign-up input validation and navigation.
  - Creating a household and joining via 6-character invite code.
  - Chore creation, editing, and deletion.
  - Expense creation, single debt assignment, automated $N$-roommate splitting, balance calculation, and debt settlement.
  - Grocery item addition, checking as bought, and deletion.
  - Bulletin board posting, author-only permission enforcement, and calendar date filtering.
- **E2E & Multi-User Scenario Gaps**: Zero tests simulating realistic multi-roommate co-living interactions across sessions.
- **Compliance Gaps**: No automated scan or test asserting the strict zero-emoji requirement (Requirement R2).

---

## 4. Test Architecture Blueprint (Requirements R1, R3, R4)

To provide reliable automated verification without requiring live Firebase credentials or network access, we propose a modular test architecture built on an **In-Memory Firebase Harness**.

### 4.1 Headless Test Runner & In-Memory Harness

#### 4.1.1 In-Memory Firestore & Auth Store (`src/test/mockFirebase.js`)
An in-memory mock implementation provides deterministic, instant state persistence across test cases without network latency or external credentials:

```javascript
// src/test/mockFirebase.js
class MockFirestoreStore {
  constructor() {
    this.collections = {
      utenti: {},
      case: {},
      turni: {},
      debiti: {},
      spesa: {},
      note: {}
    };
  }

  reset() {
    Object.keys(this.collections).forEach(k => { this.collections[k] = {}; });
  }

  setDoc(coll, id, data) {
    this.collections[coll][id] = { ...data };
  }

  getDoc(coll, id) {
    const data = this.collections[coll][id];
    return {
      exists: () => !!data,
      id,
      data: () => data ? { ...data } : undefined
    };
  }

  addDoc(coll, data) {
    const id = "mock_doc_" + Math.random().toString(36).substr(2, 9);
    this.collections[coll][id] = { ...data, id };
    return { id };
  }

  query(coll, ...conditions) {
    let items = Object.entries(this.collections[coll] || {}).map(([id, d]) => ({ id, ...d }));
    conditions.forEach(cond => {
      if (cond.field && cond.op === "==") {
        items = items.filter(item => item[cond.field] === cond.val);
      }
    });
    return {
      docs: items.map(item => ({
        id: item.id,
        data: () => item
      }))
    };
  }
}
```

#### 4.1.2 Headless Test Wrapper (`src/test/TestWrapper.jsx`)
A shared testing wrapper providing clean `MemoryRouter`, `ThemeContext`, and a customizable `AuthContext`:

```jsx
// src/test/TestWrapper.jsx
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../contexts/ThemeContext";

export function createMockAuthContext(user = null, userData = null) {
  return {
    currentUser: user,
    userData: userData,
    setUserData: jest.fn()
  };
}

export function TestWrapper({ children, initialEntries = ["/"] }) {
  return (
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </ThemeProvider>
  );
}
```

#### 4.1.3 Browser & Canvas Mocks (`src/setupTests.js`)
Stubbing browser APIs that otherwise throw in JSDOM:
- **Canvas 2D Context**: Mock `HTMLCanvasElement.prototype.getContext = () => ({ clearRect: jest.fn(), fillRect: jest.fn(), save: jest.fn(), restore: jest.fn(), translate: jest.fn(), rotate: jest.fn() })`.
- **Clipboard API**: Mock `navigator.clipboard = { writeText: jest.fn().mockResolvedValue() }`.
- **MatchMedia**: Mock `window.matchMedia`.
- **Pointer Capture**: Mock `Element.prototype.setPointerCapture` and `releasePointerCapture`.

---

### 4.2 Tier 1: Smoke & Component Feature Coverage Matrix

*Goal: Ensure every page and component mounts cleanly without unhandled exceptions or rendering crashes.*

| Suite ID | Target Component | File Location | Key Render Assertions |
|---|---|---|---|
| **T1.01** | `HomeAutenticazione` | `src/pages/Autenticazione/homeAutenticazione.js` | Mounts brand title "HouseHelper", subtitle, login and registration buttons, and Mascot. |
| **T1.02** | `ViewLogin` | `src/pages/Autenticazione/viewLogin.js` | Renders email input, password input, submit button, Google auth button, Mascot widget. |
| **T1.03** | `ViewRegistrazione` | `src/pages/Autenticazione/viewRegistrazione.js` | Renders username, email, password inputs, submit button, Mascot widget. |
| **T1.04** | `SceltaCasa` | `src/pages/SceltaCasa.js` | Renders create house form, invite code join input, logout action. |
| **T1.05** | `HomeUtente` | `src/pages/homeUtente.js` | Renders welcome header, invite code pill, quick service buttons, next chore card, balance card, HouseAnalytics, latest notice. |
| **T1.06** | `VisualizzaTurni` | `src/pages/TurniPulizia/viewTurni.js` | Renders "Turni Pulizia" title, "+ Nuovo Turno" button, chore list cards or empty state placeholder. |
| **T1.07** | `AggiuntaTurno` | `src/pages/TurniPulizia/aggiuntaTurno.js` | Renders assignee input, date picker, time slot select (16 slots), places input, instructions textarea. |
| **T1.08** | `ModificaTurno` | `src/pages/TurniPulizia/modificaTurno.js` | Fetches shift data, populates inputs, renders save button. |
| **T1.09** | `ViewDebiti` | `src/pages/Debiti/ViewDebiti.js` | Renders Net Balance widget, "+ Nuova Spesa" button, expense list items or empty state. |
| **T1.10** | `AggiungiDebito` | `src/pages/Debiti/AggiungiDebito.js` | Renders description input, amount input, auto-split checkbox, creditor select, debtor select. |
| **T1.11** | `ViewSpesa` | `src/pages/Spesa/ViewSpesa.js` | Renders "Da comprare" and "Presi" counter pills, quick-add input bar, interactive checkable list. |
| **T1.12** | `ViewBacheca` | `src/pages/Bacheca/ViewBacheca.js` | Renders announcements title, "+ Nuovo Avviso" button, notice cards with author attribution. |
| **T1.13** | `AggiungiNota` | `src/pages/Bacheca/AggiungiNota.js` | Renders note title input, content textarea, optional date picker. |
| **T1.14** | `ModificaNota` | `src/pages/Bacheca/ModificaNota.js` | Pre-populates note data, permits editing for author. |
| **T1.15** | `ViewCalendario` | `src/pages/Bacheca/ViewCalendario.js` | Renders `react-calendar` grid, agenda list for selected date, legend indicators, "+ Aggiungi Evento" button. |
| **T1.16** | `AggiungiEvento` | `src/pages/Bacheca/AggiungiEvento.js` | Renders title, mandatory date, details textarea. |
| **T1.17** | `NotFound` | `src/pages/NotFound.js` | Renders 404 header and "Torna alla Dashboard Sicura" return button. |
| **T1.18** | `InteractiveMascot` | `src/components/InteractiveMascot.js` | Mounts SVG character, renders eyes, reacts to `isError` prop by displaying error bubble. |
| **T1.19** | `MiniGuy` | `src/components/MiniGuy.js` | Mounts canvas element, initializes animation without unhandled timer errors. |
| **T1.20** | `HouseAnalytics` | `src/components/HouseAnalytics.js` | Mounts tab buttons ("Spese", "Turni", "Dispensa"), renders SVG Donut chart, bar chart, step progress. |
| **T1.21** | `ThemeToggle` | `src/components/ThemeToggle.js` | Mounts lightsaber switch, toggles theme between light and dark modes. |
| **T1.22** | `MobileNavigation` | `src/components/MobileNavigation.js` | Mounts burger button, opens solid drawer overlay, lists navigation links. |

---

### 4.3 Tier 2: Boundary, Validation & Security Corner Cases

*Goal: Verify that security guards, anti-injection filters, boundary caps, and multi-tenant rules strictly enforce system integrity.*

| Test ID | Area | Scenario & Boundary Condition | Expected Behavior |
|---|---|---|---|
| **T2.01** | Auth | Registration with username $< 2$ characters or $> 30$ characters | Form halts submission; displays error: "Il nome utente deve contenere almeno 2 caratteri". |
| **T2.02** | Auth | Registration with password $< 6$ characters or $> 128$ characters | Form halts; displays error: "La password deve contenere almeno 6 caratteri". |
| **T2.03** | Auth | Registration with invalid email format (e.g. `user@`, `notanemail`) | Form halts; displays error: "Inserisci un indirizzo email valido". |
| **T2.04** | Security | Script injection in registration username: `<script>alert(1)</script>Marco` | `sanitizeText` strips script tag; stores `"Marco"`. |
| **T2.05** | Household | Join house with invalid invite code (code not found in Firestore) | Error alert displayed; Mascot enters error state; user remains on `/scelta-casa`. |
| **T2.06** | Household | Join house with lowercase/spaced code: ` a-b1_2 ` | Sanitized to `"AB12"`; whitespace and non-alphanumeric stripped. |
| **T2.07** | Routing | Unauthenticated user attempts direct URL access to `/home`, `/turni`, `/debiti` | `HouseProtectedRoute` intercepts; redirects to `/login`. |
| **T2.08** | Routing | Authenticated user with `casaId: null` attempts access to `/home` | `HouseProtectedRoute` intercepts; redirects to `/scelta-casa`. |
| **T2.09** | Routing | Authenticated user with existing `casaId` attempts access to `/scelta-casa` or `/login` | `HouseSelectRoute` / `PublicOnlyRoute` intercepts; redirects to `/home`. |
| **T2.10** | Expenses | Input negative amount (`-25.00`) or zero (`0.00`) in `AggiungiDebito` | Form blocks submission; displays "non può essere negativo o nullo". |
| **T2.11** | Expenses | Input excessive amount exceeding boundary ($> 50,000.00$ €) | Form blocks submission; displays "troppo elevato (massimo 50000)". |
| **T2.12** | Expenses | Input more than 2 decimal digits (`12.345`) | Validation fails; displays "Massimo 2 cifre decimali". |
| **T2.13** | Expenses | Keyboard entry of invalid characters (`-`, `+`, `e`, `E`) in amount input | `handleKeyDownNumber` event handler blocks keystroke via `e.preventDefault()`. |
| **T2.14** | Expenses | User attempts to select themselves as both debtor and creditor | Form blocks submission: "Non puoi registrare un debito verso te stesso". |
| **T2.15** | Expenses | Split expense requested when household has only 1 member | Form blocks submission: "Sei l'unico membro registrato nella casa: impossibile dividere". |
| **T2.16** | Chores | Turno date outside allowed bounds (e.g. year 1899 or 2150) | Form blocks submission; displays "Anno non compreso tra 2020 e 2100". |
| **T2.17** | Chores | Turno date with invalid day in month (e.g. `2026-02-29` non-leap year, `2026-04-31`) | Form blocks submission; displays "Giorno non valido per il mese specificato". |
| **T2.18** | Security | User attempts URL modification to edit a shift belonging to another house | `ModificaTurno` checks `data.casaId !== userData.casaId`; triggers alert and redirects to `/turni`. |
| **T2.19** | Security | User attempts to delete or edit a bulletin board notice created by a different roommate | Action buttons hidden; direct delete attempt displays "Puoi eliminare solo i tuoi avvisi!". |
| **T2.20** | Mascot | Dragging Mascot past boundary limits ($X < -120$ or $X > 120$) | Mascot coordinate clamped to $[-120, 120]$; smoothly springs to $0$ on pointer release. |

---

### 4.4 Tier 3: Cross-Feature Interactions & Reactive State Workflows

*Goal: Verify that actions in one domain correctly propagate state, recalculate dependent metrics, and update connected views.*

1. **T3.01 — Household Enrollment to Navigation & Service Access**:
   - Initial state: User registered with `casaId: null`. Dashboard and services inaccessible.
   - Action: User creates house "Appartamento Dante" (gets code `DANT01`).
   - Assertion: `userData.casaId` updates in `AuthContext`; user is redirected to `/home`; header displays "Appartamento Dante"; navigation links in `MobileNavigation` activate.
2. **T3.02 — Split Expense Generation to Dashboard Balance & Analytics**:
   - Household has 3 members: Alice, Bob, Charlie.
   - Alice pays 60.00 € for groceries and checks "Dividi automaticamente".
   - Assertions:
     - 2 distinct records created in `debiti`: Bob owes Alice 20.00 €; Charlie owes Alice 20.00 €.
     - Alice's net balance in `ViewDebiti` shows $+40.00$ € (green).
     - Bob's net balance in `ViewDebiti` shows $-20.00$ € (red).
     - Alice's dashboard (`HomeUtente`) shows $+40.00$ € in the personal balance card.
     - `HouseAnalytics` Donut chart updates total volume to 60 € with Alice owning 100% of upfront payments.
3. **T3.03 — Debt Settlement to Balance Recalculation**:
   - Bob views debt list, sees 20.00 € owed to Alice, and clicks "Segna come saldato".
   - Assertions:
     - `deleteDoc` removes the 20.00 € debt record.
     - `triggerConfetti()` executes.
     - Bob's balance updates from $-20.00$ € to $0.00$ € ("Nessun debito in sospeso. Perfetta parità!").
     - Alice's balance updates from $+40.00$ € to $+20.00$ €.
4. **T3.04 — Chore Creation to Dashboard & Calendar Schedule**:
   - User schedules chore "Pulizia Cucina & Salotto" on date $D$ assigned to "Marco".
   - Assertions:
     - Appears in `VisualizzaTurni` sorted chronologically.
     - If $D \ge \text{today}$ and assigned to current user, appears on `HomeUtente` in "Il tuo Prossimo Turno" card.
     - `ViewCalendario` displays a warning indicator dot on date $D$.
     - Clicking date $D$ in `ViewCalendario` reveals "Pulizia Cucina & Salotto" in the agenda list.
     - `HouseAnalytics` bar chart increments Marco's chore count by 1.
5. **T3.05 — Grocery Item Life Cycle & Celebration Trigger**:
   - User adds "Detersivo lavastoviglie" in `ViewSpesa`.
   - Counter "Da comprare" increments by 1; `HouseAnalytics` dispensa percentage recalculates.
   - User clicks checkbox to mark item bought:
     - Item receives strike-through styling and moves to bottom of list.
     - "Presi" counter increments; `triggerConfetti()` fires.
6. **T3.06 — Bulletin Board Notice to Dashboard Latest Alert**:
   - User publishes notice "Assemblea condominiale giovedì ore 18:00".
   - Notice appears at top of `ViewBacheca`.
   - Navigating to `HomeUtente` shows the notice immediately in the "Ultimo Avviso in Bacheca" card.

---

### 4.5 Tier 4: Realistic Household End-to-End Scenarios

*Goal: Simulate multi-user household journeys from onboarding to daily co-living management.*

#### Scenario 1: "The New Apartment Setup & Roommate Onboarding"
- **Step 1**: User A ("Elena") signs up (`elena@test.com`), lands on `/scelta-casa`. Creates household "Via Garibaldi 12". Receives invite code `GARB12`.
- **Step 2**: User B ("Marco") signs up (`marco@test.com`), enters invalid code `WRONG1` $\rightarrow$ error alert displayed. Enters `GARB12` $\rightarrow$ successfully joins "Via Garibaldi 12".
- **Step 3**: User C ("Sofia") signs up (`sofia@test.com`), enters `GARB12` $\rightarrow$ joins.
- **Verification**: In Elena's dashboard, `utentiMap` contains Elena, Marco, and Sofia. Elena clicks invite code pill $\rightarrow$ code `GARB12` copied to clipboard.

#### Scenario 2: "Weekly Cleaning Rotation & Expense Splitting"
- **Step 1**: Elena creates weekly cleaning shifts:
  - Monday: "Bagno" assigned to Marco (`09:00 - 10:00`).
  - Wednesday: "Cucina" assigned to Sofia (`18:00 - 19:00`).
  - Saturday: "Salotto e Terrazzo" assigned to Elena (`10:00 - 11:00`).
- **Step 2**: Marco logs in $\rightarrow$ Dashboard displays next chore: "Bagno" on Monday.
- **Step 3**: Sofia purchases cleaning supplies for 45.00 € and checks "Dividi automaticamente".
  - System generates: Elena owes Sofia 15.00 €; Marco owes Sofia 15.00 €.
- **Step 4**: Marco logs in $\rightarrow$ sees balance $-15.00$ € in red. Pays Sofia in cash and clicks "Segna come saldato".
  - Marco's balance updates to $0.00$ €. Sofia's balance updates to $+15.00$ € (from Elena).

#### Scenario 3: "House Departure & Data Isolation"
- **Step 1**: Marco clicks "Lascia Casa" in his dashboard account settings.
- **Step 2**: Confirms alert $\rightarrow$ `utenti/{marcoUid}.casaId` set to `null`.
- **Step 3**: Marco redirected to `/scelta-casa`.
- **Step 4**: Marco attempts to navigate to `/turni` or `/debiti` via URL $\rightarrow$ `HouseProtectedRoute` intercepts and redirects back to `/scelta-casa`.
- **Step 5**: Elena views dashboard $\rightarrow$ Marco is no longer in active member list.

---

### 4.6 Automated Verification Scripts

#### 4.6.1 Zero-Emoji Verification Script (`scripts/verify-zero-emojis.js`)
An automated scanner to enforce Requirement R2 across the codebase. It can be executed via `node scripts/verify-zero-emojis.js` or integrated into `npm test`:

```javascript
// scripts/verify-zero-emojis.js
const fs = require("fs");
const path = require("path");

// Comprehensive Unicode Emoji Regex covering all emoji blocks & symbol ranges
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

const TARGET_DIRS = ["src", "public"];
let violations = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git") {
        scanDir(fullPath);
      }
    } else if (/\.(js|jsx|ts|tsx|html|css|json)$/.test(entry.name)) {
      // Exclude frame data / asset binaries if necessary
      if (entry.name === "guyFramesData.json") continue;
      
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        if (EMOJI_REGEX.test(line)) {
          violations.push({
            file: fullPath,
            line: idx + 1,
            snippet: line.trim()
          });
        }
      });
    }
  }
}

TARGET_DIRS.forEach(scanDir);

if (violations.length > 0) {
  console.error(`\x1b[31m[FAILED] Found ${violations.length} emoji/emoticon violation(s):\x1b[0m`);
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line} -> ${v.snippet}`);
  });
  process.exit(1);
} else {
  console.log("\x1b[32m[PASSED] Zero emoji/emoticon characters detected in codebase.\x1b[0m");
  process.exit(0);
}
```

#### 4.6.2 Circular Dependency & Build Verification Script (`scripts/verify-build-integrity.js`)
An automated check that verifies zero circular dependencies between `App.js` and page modules, and ensures `npm run build` generates clean production assets without orphaned imports:

```javascript
// scripts/verify-build-integrity.js
const fs = require("fs");
const path = require("path");

// Check that page components do NOT import App or App.css directly
const PAGES_DIR = path.join(__dirname, "../src/pages");
let circularImports = [];

function checkCircular(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      checkCircular(fullPath);
    } else if (file.name.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (/import\s+.*from\s+["'].*App(\.css)?["']/.test(content)) {
        circularImports.push(fullPath);
      }
    }
  }
}

checkCircular(PAGES_DIR);

if (circularImports.length > 0) {
  console.error(`\x1b[31m[FAILED] Found ${circularImports.length} circular/redundant App imports in pages:\x1b[0m`);
  circularImports.forEach(f => console.error(`  ${f}`));
  process.exit(1);
} else {
  console.log("\x1b[32m[PASSED] No circular imports between pages and App module.\x1b[0m");
  process.exit(0);
}
```

---

## 5. Actionable Implementation Recommendations

For downstream implementation agents:

1. **Emoji Elimination (Requirement R2)**:
   - Apply the replacements identified in the 35-item inventory table (Section 2.9).
   - In `ThemeToggle.js`, replace `☀️`/`🌙` with FontAwesome or custom SVG sun/moon icons.
   - In empty state placeholders (`ViewTurni`, `ViewDebiti`, `ViewSpesa`, `ViewBacheca`, `ViewCalendario`), replace standalone emojis with SVG or FontAwesome vector icons.
   - Update `public/index.html` line 27 title to `<title>HouseHelper</title>`.
2. **Circular Dependency Cleanup (Requirement R3)**:
   - Remove redundant `import "../../App.css"` / `import "../App.css"` from all 17 page components. Global styling should be loaded exclusively at the root level (`src/index.js` or `src/App.js`).
   - Clean up unreferenced `src/models/modelloTurno.js`.
   - Remove or archive unused files in `css_template/`.
3. **Automated Testing Suite (Requirement R4)**:
   - Implement `src/test/mockFirebase.js` and `src/test/TestWrapper.jsx`.
   - Configure `src/setupTests.js` with canvas context stubs and fake timer cleanups.
   - Implement the test cases across Tiers 1 through 4.
   - Add `"verify:emojis"` and `"verify:build"` to `package.json` scripts.
