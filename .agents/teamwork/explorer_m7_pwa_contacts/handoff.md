# Handoff Report — Milestone M7 Technical Investigation: Contatti Utili, PWA & Notifiche, Prestazioni, Sicurezza e Vincoli

**Author**: Explorer 3 (`explorer_m7_pwa_contacts`)  
**Milestone**: M7 — HouseHelper  
**Target Requirements**: R3 (Contatti Utili), R4 (PWA & Notifiche), R5 (Prestazioni), R6 (Sicurezza), R7 (Vincoli)  
**Status**: Completed (Read-Only Technical Investigation)

---

## 1. Observation

### 1.1 Baseline Project State & Verification Scripts
The verification toolchain and baseline test suite were executed directly in the project directory `/home/daniele949/Desktop/Cose/HouseHelper/househelper`:

1. **Circular Dependency Check** (`npm run check:circular` -> `node scripts/check-circular.js`):
   ```
   Processed 40 files in src/App.js (0 cycles)
   Processed 55 files in src/ (0 cycles)
   ✔ SUCCESS: All circular dependency checks passed with 0 cycles.
   ```
2. **Zero-Emoji Scan** (`npm run check:emojis` -> `node scripts/verify-zero-emojis.js`):
   ```
   Scanning 85 files across src/ and public/ for emojis & emoticons
   ✔ SUCCESS: Zero emojis or text emoticons detected across 85 files.
   ```
3. **Secret & Credential Audit** (`npm run audit:secrets` -> `node scripts/audit-secrets.js`):
   ```
   Scanned 100 files across working tree, 14 git commits.
   [SUCCESS] 0 secrets, credentials, or private keys detected.
   ```
4. **Automated Test Suites** (`CI=true npm test -- --watchAll=false`):
   ```
   Test Suites: 30 passed, 30 total
   Tests:       280 passed, 280 total
   Snapshots:   0 total
   Time:        22.468 s
   ```
5. **Production Build** (`npm run build`):
   ```
   Compiled successfully.
   File sizes after gzip:
     230.62 kB  build/static/js/main.9aee3c73.js
     11.34 kB   build/static/css/main.a3eed5ec.css
     1.76 kB    build/static/js/453.e2c00ade.chunk.js
   ```

---

### 1.2 Useful & Emergency Contacts Directory (R3) Observations

1. **Routes & Routing Architecture (`src/App.js`)**:
   - Lines 81–107 define protected household routes under `<Route element={<HouseProtectedRoute />}>`:
     - `/home` (`HomeUtente`)
     - `/turni`, `/turni/aggiungi`, `/turni/modifica/:id`
     - `/debiti`, `/debiti/aggiungi`
     - `/spesa` (`ViewSpesa`)
     - `/bacheca`, `/bacheca/aggiungi`, `/bacheca/modifica/:id`
     - `/calendario`, `/calendario/aggiungi`
     - `/documenti` (`ViewDocumenti`)
   - Currently, there is **no route** for contacts (`/contatti`).

2. **Desktop Navigation (`src/components/DesktopNavigation.js`)**:
   - Lines 19–27 define `navItems`:
     ```javascript
     const navItems = [
       { label: "Dashboard", icon: "fa-home", path: "/home", end: true },
       { label: "Turni", icon: "fa-broom", path: "/turni", end: false },
       { label: "Debiti", icon: "fa-wallet", path: "/debiti", end: false },
       { label: "Spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
       { label: "Bacheca", icon: "fa-thumbtack", path: "/bacheca", end: false },
       { label: "Calendario", icon: "fa-calendar-alt", path: "/calendario", end: false },
       { label: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false },
     ];
     ```
   - Total items: exactly 7.
   - In `src/components/DesktopNavigation.test.jsx`:
     - Line 44: `expect(links).toHaveLength(7);`
     - Line 68: `expect(icons.length).toBe(7);`
     When adding `Contatti`, this test suite must be updated to expect 8 items.

3. **Mobile Navigation (`src/components/MobileNavigation.js`)**:
   - Lines 44–53 define `menuItems`:
     ```javascript
     const menuItems = currentUser
       ? [
           { label: "Dashboard", icon: "fa-home", path: "/home" },
           { label: "Turni Pulizia", icon: "fa-broom", path: "/turni" },
           { label: "Spese & Debiti", icon: "fa-wallet", path: "/debiti" },
           { label: "Lista Spesa", icon: "fa-shopping-cart", path: "/spesa" },
           { label: "Calendario Casa", icon: "fa-calendar-alt", path: "/calendario" },
           { label: "Bacheca", icon: "fa-thumbtack", path: "/bacheca" },
           { label: "Documenti & Contratti", icon: "fa-folder-open", path: "/documenti" },
         ]
       : ...
     ```
   - Currently has 7 authenticated links. Needs "Contatti Utili" link (`fa-address-book`).

4. **Household Dashboard (`src/pages/homeUtente.js`)**:
   - Lines 198–223 define `bento-services` quick-launch buttons: Turni, Spese, Spesa, Calendario, Bacheca, Documenti.
   - Contatti service button is not yet present.

5. **Firestore Data Model Uniformity**:
   - In `firestore.rules` (lines 110–223), every domain entity is a **top-level collection** scoped with a `casaId` field:
     - `match /turni/{turnoId}`
     - `match /debiti/{debitoId}`
     - `match /spesa/{spesaId}`
     - `match /note/{notaId}`
     - `match /documenti/{docId}`
   - In `src/test/mockFirebase.js` (lines 8–16), `MockFirestoreStore` initializes top-level collections:
     ```javascript
     this.collections = {
       utenti: {}, case: {}, turni: {}, debiti: {}, spesa: {}, note: {}, documenti: {}
     };
     ```
   - Queries across the codebase consistently follow: `query(collection(db, "<name>"), where("casaId", "==", casaId))`.

6. **Input Sanitization & Protocol Validation (`src/utils/security.js`)**:
   - `sanitizeText(input, maxLength)` strips HTML tags and regex schemes `(?:javascript|vbscript|data):` (line 30).
   - `isValidEmail(email)` validates email format with RFC 5322 simplified regex (line 224).
   - There are currently **no** phone sanitization helpers or dedicated URL scheme constructors (`safeTelUrl`, `safeMailtoUrl`).

---

### 1.3 PWA & Offline Experience (R4) Observations

1. **Manifest File (`public/manifest.json`)**:
   - Lines 1–25:
     ```json
     {
       "short_name": "HouseHelper",
       "name": "HouseHelper - Gestione Casa",
       "icons": [
         { "src": "favicon.ico", "sizes": "64x64 32x32 24x24 16x16", "type": "image/x-icon" },
         { "src": "logo192.png", "type": "image/png", "sizes": "192x192" },
         { "src": "logo512.png", "type": "image/png", "sizes": "512x512" }
       ],
       "start_url": ".",
       "display": "standalone",
       "theme_color": "#ffffff",
       "background_color": "#ffffff"
     }
     ```
   - All referenced icon assets (`favicon.ico`, `logo192.png`, `logo512.png`) exist on disk in `public/`.
   - Missing enhanced PWA properties: `description`, `scope: "/"`, `categories`, `shortcuts` (e.g. quick jump to Turni, Spese, Contatti).

2. **Service Worker State**:
   - Filesystem search for `*worker*` outside `node_modules` returned **0 results**.
   - Neither `public/sw.js` nor `src/serviceWorkerRegistration.js` exists.
   - `src/index.js` currently only calls `reportWebVitals()`, without registering any service worker.
   - In Create React App 5 (`react-scripts 5.0.1`), files placed in `public/` are copied verbatim to the build output root `build/`. Thus, `public/sw.js` will be served at `/sw.js` with root scope `/`.

3. **Multi-tenant Data Eviction on Logout**:
   - In `src/contexts/AuthContext.js` (lines 18–35), `onAuthStateChanged` listens to Firebase Auth. When logged out, it simply executes `setUserData(null)`.
   - No offline cache eviction exists. If private household data were cached in browser `CacheStorage` or unscoped `localStorage`, another user signing in on the same browser would be able to inspect previous household data.

4. **In-App Notifications & Reminders in Dashboard (`src/pages/homeUtente.js`)**:
   - Lines 58–63:
     ```javascript
     if (data.utenteId === currentUser.uid && data.data >= oggi) {
       mieiTurni.push(item);
     }
     mieiTurni.sort((a, b) => new Date(a.data) - new Date(b.data));
     setProssimoTurno(mieiTurni.length > 0 ? mieiTurni[0] : null);
     ```
   - Currently, `prossimoTurno` is rendered as a static card in the bento grid. There is no active alert banner or reminder for chores due within < 24 hours (or overdue), and no notification indicator for newly created expenses.

---

### 1.4 Performance & Bundle Analysis (R5) Observations

1. **Current Bundle Structure**:
   - Production build output from `npm run build`:
     - `build/static/js/main.9aee3c73.js`: 230.62 kB gzip (~780 kB raw uncompressed JS).
     - Only **1 primary JavaScript chunk** exists.
2. **Root Imports in `src/App.js`**:
   - Lines 24–55 import all 17 page modules synchronously at bundle startup, including heavy third-party dependencies:
     - `react-calendar` (imported in `ViewCalendario.js`)
     - `firebase/storage` (imported in `ViewDocumenti.js` via `documentiService.js`)
     - Expense & bento dashboard views.
3. **Test Suite Independence**:
   - Grep search for `<App` across `src/` revealed that **no test suite renders `<App />` directly**.
   - Every existing test mounts domain pages directly via `renderWithProviders(<Component />, options)` in `src/test/testUtils.jsx`.
   - Introducing `React.lazy` and `Suspense` in `src/App.js` will not break any unit, boundary, or interaction test suites.

---

### 1.5 Security & Multi-tenant Authorization (R6, R7) Observations

1. **Firestore Security Rules (`firestore.rules`)**:
   - Lines 36–43 define `belongsToSameHouse(casaId)`:
     ```
     function belongsToSameHouse(casaId) {
       return hasValidCasa() 
         && casaId != null 
         && casaId is string 
         && casaId.size() > 0 
         && getUserCasaId() == casaId;
     }
     ```
   - Lines 228–230 enforce strict default deny:
     ```
     match /{document=**} {
       allow read, write: if false;
     }
     ```
   - **Crucial Rule Gaps Identified for Milestone M7**:
     - `match /contatti/{contattoId}`: Does not exist yet. Without an explicit match rule, all read/write requests will be blocked by default deny.
     - `match /turni/{turnoId}` (lines 118–127): Create and update rules require exact match on `nomi`, `luoghi`, `data`. If R2 checklist sotto-mansioni (`checklist: [{ id, testo, completato }]`) are updated, the update will be rejected unless allowed in `firestore.rules`.
     - `match /utenti/{userId}` (lines 78–81): Profile update rule only permits `username` and `casaId`. If R2 vacation mode fields (`inVacanza`, `vacanzaInizio`, `vacanzaFine`) are updated by the user, Firestore rules will reject the update.
     - `match /case/{casaId}` (lines 101–105): Update rule only permits `nome`, requiring `creatoreId` and `codiceUnivoco` immutability. If R2 automatic rotation settings are stored on `case`, the rule must permit rotation config fields.
2. **Double-submit Prevention**:
   - In `AggiungiDebito.js` (lines 98–160, 293–299) and `aggiuntaTurno.js` (lines 116–138), form submissions set `loading = true` in `try` and `loading = false` in `finally`, with the submit button having `disabled={loading}` and displaying a spinner `<i className="fas fa-spinner fa-spin"></i>`.
   - This exact pattern must be replicated across all new forms in M7 (`AggiungiContattoModal`, `ModificaContattoModal`, checklist toggles, export buttons).

---

## 2. Logic Chain

### 2.1 Contacts Architecture & Data Model (R3)
- **Step 1 (Observation 1.2.5)**: Every existing entity (`turni`, `debiti`, `spesa`, `note`, `documenti`) is a top-level collection partitioned by `casaId`.
- **Step 2 (Observation 1.2.5)**: `MockFirestoreStore` and test harness store collections as top-level dictionaries.
- **Step 3 (Deduction)**: A top-level collection `contatti` with `casaId` preserves architecture uniformity, simplifies compound querying (`where("casaId", "==", casaId)`), enables efficient indexing, and avoids deep sub-collection nesting pitfalls.
- **Step 4 (Observation 1.2.2 & 1.2.3)**: `DesktopNavigation` and `MobileNavigation` require entries pointing to `/contatti`. Adding an 8th entry requires updating `DesktopNavigation.test.jsx` (which currently asserts `toHaveLength(7)`).
- **Step 5 (Observation 1.2.6)**: `tel:` and `mailto:` action triggers can be weaponized if phone/email fields contain `javascript:...` or unescaped characters. Sanitizing inputs via dedicated helpers (`sanitizePhone`, `safeTelUrl`, `safeMailtoUrl`) guarantees safe protocol execution.

### 2.2 PWA, Offline Strategy & Multi-tenant Eviction (R4)
- **Step 1 (Observation 1.3.2)**: No Service Worker currently exists, but CRA 5 supports `public/sw.js` being served at root `/`.
- **Step 2 (Observation 1.1.5)**: The static app shell consists of HTML, JS bundles (`/static/`), CSS, and FontAwesome webfonts (`public/fontawesome.min.css`, `public/webfonts/`).
- **Step 3 (Observation 1.3.3)**: Caching multi-tenant Firestore data in a shared Service Worker `CacheStorage` creates cross-household data leakage risks when roommates switch or log out on shared computers.
- **Step 4 (Deduction)**: The Service Worker must cache **only static shell assets** (Cache-First for static assets, Network-First with fallback to `/index.html` for navigation).
- **Step 5 (Deduction)**: Runtime offline data (lists, notes, contacts) must be managed client-side via an isolated `offlineStorage.js` utility, with keys scoped strictly by `casaId` (e.g. `hh_offline_${casaId}_contatti`).
- **Step 6 (Observation 1.3.3)**: When `signOut` is invoked in `AuthContext`, all tenant caches must be purged immediately to achieve zero data residue.

### 2.3 Dashboard In-App Notifications (R4)
- **Step 1 (Observation 1.3.4)**: `homeUtente.js` already loads shifts (`turniList`) and expenses (`debitiList`), but only shows static totals.
- **Step 2 (Deduction)**: A dedicated `HouseholdNotificationBanner` can compute:
  - Upcoming shifts due within < 24 hours (`turno.data === oggi || turno.data === domani`) for the logged-in user.
  - New expenses recorded by roommates since the user's last dashboard visit (tracked via `localStorage.getItem('hh_last_expense_seen_' + uid)`).
- **Step 3 (Deduction)**: Alert items can be dismissed individually with accessible buttons, providing real-time awareness without requiring complex external push server infrastructure.

### 2.4 Performance Refactoring (R5)
- **Step 1 (Observation 1.4.1 & 1.4.2)**: `main.js` is 230.62 kB gzip and bundles heavy dependencies (`react-calendar`, `firebase/storage`).
- **Step 2 (Deduction)**: Adding PDF generators (for R1 expense export) and M7 features will increase initial bundle size above 300 kB gzip.
- **Step 3 (Observation 1.4.3)**: No test suite renders `<App />` directly. All tests mount individual pages.
- **Step 4 (Deduction)**: Code-splitting heavy domain routes (`/documenti`, `/calendario`, `/bacheca`, `/debiti`, `/contatti`) using `React.lazy` and `Suspense` with a zero-emoji `<PageLoader />` fallback improves initial page load (FCP/LCP) for unauthenticated landing and login pages without breaking any existing test suites.

### 2.5 Security Hardening & Rule Integrity (R6, R7)
- **Step 1 (Observation 1.5.1)**: `firestore.rules` enforces default deny. Any new collection (`contatti`) or new fields (`turni.checklist`, `utenti.inVacanza`, `case.rotazioneAutomatica`) will be rejected by Firestore unless explicitly authorized in `firestore.rules`.
- **Step 2 (Observation 1.5.2)**: Double-click prevention using `isSubmitting` / `disabled={isSubmitting}` is already established in `AggiungiDebito` and `aggiuntaTurno`, protecting against race conditions and burst requests.
- **Step 3 (Observation 1.1.2)**: `scripts/verify-zero-emojis.js` scans all text for Pictographic, Flags, raw arrows, and checkmarks. Vector FontAwesome icons (`fas fa-...`) must be used exclusively.

---

## 3. Caveats

1. **No External Push Server**:
   - Web Push Notifications via FCM (Firebase Cloud Messaging) require a running backend server or Firebase Cloud Functions to sign VAPID keys and dispatch web pushes.
   - For this client-side architecture, local in-app dashboard reminder banners combined with the browser's native `Notification` API provide a reliable, zero-cost, serverless notification experience.
2. **Desktop Navigation Test Assumption**:
   - `DesktopNavigation.test.jsx` currently hardcodes assertions for 7 links (`expect(links).toHaveLength(7)`). When implementing R3, this test file will need to be updated to 8 links.
3. **React.lazy in Development vs Production**:
   - `React.lazy` loads chunks dynamically. When offline, navigating to an unvisited lazy route requires the chunk to have been pre-cached by the Service Worker. The Service Worker static cache manifest must include dynamic chunk patterns.
4. **No Emojis Standard**:
   - All status indicators (e.g. emergency badge, contact categories, phone/email triggers, notification bells) must use FontAwesome vector classes (`fas fa-phone-alt`, `fas fa-envelope`, `fas fa-ambulance`, `fas fa-user-tie`, `fas fa-wrench`, `fas fa-bolt`, `fas fa-building`, `fas fa-bell`, `fas fa-clock`). Absolutely zero Unicode emojis or emoticons.

---

## 4. Conclusion

### 4.1 Specification for Useful & Emergency Contacts Directory (R3)

1. **Collection Design**:
   - Top-level Firestore collection: `contatti`
   - Document Schema:
     ```typescript
     interface Contatto {
       id?: string;
       casaId: string;               // Multi-tenant household barrier (required)
       nome: string;                 // Required, 1-80 chars, sanitized
       categoria: ContattoCategoria; // Enum: "Proprietario" | "Amministratore" | "Idraulico" | "Elettricista" | "Emergenza" | "Fabbro" | "Altro"
       telefono?: string;            // Optional, 0-25 chars, valid phone chars only
       email?: string;               // Optional, 0-100 chars, validated email
       note?: string;                // Optional, 0-500 chars, sanitized text
       creatoDa: string;             // User UID
       creatoDaNome: string;         // Roommate username
       createdAt: string;            // ISO 8601 string or Timestamp
     }
     ```
2. **Service Layer (`src/services/contattiService.js`)**:
   - `caricaContatti(casaId, categoriaFilter = "Tutti")`: queries Firestore with `where("casaId", "==", casaId)`.
   - `creaContatto({ nome, categoria, telefono, email, note, casaId, currentUser, userData })`: validates, sanitizes, and creates document.
   - `aggiornaContatto(contattoId, { nome, categoria, telefono, email, note, casaId })`: anti-tamper update verifying `casaId`.
   - `eliminaContatto(contattoId, casaId)`: deletion with `casaId` validation.
3. **Protocol Sanitization (`src/utils/security.js`)**:
   - Add:
     ```javascript
     export function sanitizePhone(input, maxLength = 25) {
       if (!input) return "";
       const str = String(input);
       // Allow digits, spaces, +, -, (, ), .
       const clean = str.replace(/[^0-9+\s\-().]/g, "").trim().slice(0, maxLength);
       return clean;
     }

     export function safeTelUrl(phone) {
       const clean = sanitizePhone(phone);
       if (!clean || clean.length < 3) return "";
       // Disallow any scheme injection
       return `tel:${clean.replace(/\s+/g, "")}`;
     }

     export function safeMailtoUrl(email) {
       if (!isValidEmail(email)) return "";
       return `mailto:${email.trim()}`;
     }
     ```
4. **UI Design (`src/pages/Contatti/ViewContatti.js`)**:
   - Emergency banner at top: Quick dial for `112 (Numero Unico Europeo Emergenze)` with direct tap-to-call button.
   - Filter bar: Category pills (`Tutti`, `Proprietario`, `Amministratore`, `Idraulico`, `Elettricista`, `Emergenza`, `Altro`) and search input (`fa-search`).
   - Contact cards with:
     - Vector category badge:
       - `Proprietario`: `fa-user-tie`
       - `Amministratore`: `fa-building`
       - `Idraulico`: `fa-wrench`
       - `Elettricista`: `fa-bolt`
       - `Emergenza`: `fa-ambulance`
       - `Fabbro`: `fa-key`
       - `Altro`: `fa-address-card`
     - Quick Action Buttons:
       - `Chiama`: `<a href={safeTelUrl(contatto.telefono)} className="btn-call"><i className="fas fa-phone-alt"></i> Chiama</a>`
       - `Email`: `<a href={safeMailtoUrl(contatto.email)} className="btn-email"><i className="fas fa-envelope"></i> Email</a>`
     - Actions: Edit modal trigger (`fa-pen`), Delete trigger with `ConfirmModal` (`fa-trash-alt`).
     - Modal: Add/Edit contact form with input labels, error display, and double-submit prevention (`disabled={isSubmitting}`).

---

### 4.2 Specification for PWA & Offline Experience (R4)

1. **Manifest (`public/manifest.json`)**:
   - Add description: `"Gestione turni di pulizia, spese condivise, bacheca avvisi e contatti utili della casa"`.
   - Add `scope: "/"`.
   - Add `categories: ["utilities", "lifestyle", "productivity"]`.
   - Add shortcuts for direct access: Turni (`/turni`), Debiti (`/debiti`), Contatti (`/contatti`), Spesa (`/spesa`).
2. **Service Worker (`public/sw.js`)**:
   - Versioned static cache: `const CACHE_NAME = 'househelper-v1-shell';`
   - Pre-cache assets on `install`:
     - `/`, `/index.html`, `/manifest.json`, `/favicon.ico`, `/logo192.png`, `/logo512.png`
     - `/fontawesome.min.css`
     - Webfont files (`fa-solid-900.woff2`, `fa-regular-400.woff2`, etc.)
   - Fetch strategy:
     - Navigation requests (`event.request.mode === 'navigate'`): Network-First, fallback to cached `/index.html` (enabling offline SPA navigation).
     - Static assets (`/static/` js/css): Cache-First or Stale-While-Revalidate.
     - Firebase / External APIs: Network-Only (bypassing service worker cache to protect multi-tenant security).
3. **Client-Side Tenant Offline Storage (`src/utils/offlineStorage.js`)**:
   - Key format: `hh_offline_${casaId}_${collectionName}`
   - Methods:
     - `saveOfflineData(casaId, entity, data)`
     - `getOfflineData(casaId, entity)`
     - `clearTenantOfflineData(casaId)`
     - `clearAllOfflineData()`
   - Hook into `AuthContext.js`: On `signOut`, call `clearTenantOfflineData(casaId)` to guarantee zero cross-tenant data leakage.
4. **In-App Notification and Reminder System (`src/components/HouseholdNotificationBanner.js`)**:
   - Rendered at top of `src/pages/homeUtente.js`.
   - Evaluates:
     - **Imminent Chore Alert**: If user has a chore due today or within 24h, displays an alert banner (`fa-bell` or `fa-clock`) with chore name, date/time, and direct link to chore checklist.
     - **New Expense Alert**: Checks if any expense in `debitiList` has `createdAt` newer than user's `hh_last_expense_seen_${uid}` timestamp. Displays banner with payer, amount, and quick link to `/debiti`.
     - Dismissible: allows closing with `fa-times`, persisting dismissed state in session.

---

### 4.3 Specification for Performance Refactoring (R5)

1. **Code-splitting in `src/App.js`**:
   - Implement `React.lazy` for heavy domain modules:
     ```javascript
     const ViewDocumenti = React.lazy(() => import("./pages/Documenti/ViewDocumenti"));
     const ViewCalendario = React.lazy(() => import("./pages/Bacheca/ViewCalendario"));
     const ViewBacheca = React.lazy(() => import("./pages/Bacheca/ViewBacheca"));
     const ViewDebiti = React.lazy(() => import("./pages/Debiti/ViewDebiti"));
     const ViewContatti = React.lazy(() => import("./pages/Contatti/ViewContatti"));
     ```
   - Wrap routes in `<React.Suspense fallback={<PageLoader />}>`.
   - `<PageLoader />` component with sleek FontAwesome spinner (`fa-circle-notch fa-spin`), zero emojis.
2. **Dashboard Memoization**:
   - In `src/pages/homeUtente.js`, wrap saldo calculation, grocery count, and upcoming shift calculations in `useMemo`.

---

### 4.4 Specification for Security & Rules (R6, R7)

1. **Firestore Rules Additions (`firestore.rules`)**:
   ```
   // ==========================================
   // CONTATTI (Milestone 7: Useful & Emergency Contacts)
   // ==========================================
   match /contatti/{contattoId} {
     allow read: if belongsToSameHouse(resource.data.casaId);

     allow create: if hasValidCasa()
       && request.resource.data.casaId == getUserCasaId()
       && isNonEmptyString(request.resource.data.nome, 80)
       && isNonEmptyString(request.resource.data.categoria, 50)
       && (request.resource.data.telefono == null || (request.resource.data.telefono is string && request.resource.data.telefono.size() <= 25))
       && (request.resource.data.email == null || (request.resource.data.email is string && request.resource.data.email.size() <= 100))
       && (request.resource.data.note == null || (request.resource.data.note is string && request.resource.data.note.size() <= 500));

     allow update: if belongsToSameHouse(resource.data.casaId)
       && request.resource.data.casaId == resource.data.casaId
       && isNonEmptyString(request.resource.data.nome, 80)
       && isNonEmptyString(request.resource.data.categoria, 50)
       && (request.resource.data.telefono == null || (request.resource.data.telefono is string && request.resource.data.telefono.size() <= 25))
       && (request.resource.data.email == null || (request.resource.data.email is string && request.resource.data.email.size() <= 100))
       && (request.resource.data.note == null || (request.resource.data.note is string && request.resource.data.note.size() <= 500));

     allow delete: if belongsToSameHouse(resource.data.casaId);
   }
   ```
2. **Coordinated Rules Updates for R2**:
   - `match /turni/{turnoId}`: Allow `(request.resource.data.checklist == null || request.resource.data.checklist is list)` and `(request.resource.data.completato == null || request.resource.data.completato is bool)`.
   - `match /utenti/{userId}`: Allow `(request.resource.data.inVacanza == null || request.resource.data.inVacanza is bool)` and `vacanzaInizio`/`vacanzaFine` date strings.
   - `match /case/{casaId}`: Allow `(request.resource.data.rotazioneAutomatica == null || request.resource.data.rotazioneAutomatica is bool)` and `intervalloRotazione` string.
3. **Test Suite Extension**:
   - Update `src/test/mockFirebase.js` to initialize `contatti: {}` in `collections`.
   - Update `src/test/tier2_boundaries/security_rules.test.js` to evaluate `contatti` security rules and test multi-tenant cross-household rejection.

---

## 5. Verification Method

To independently verify the architecture and readiness before and after implementation, execute the following commands:

1. **Verify Current Baseline (Must Pass 100%)**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   node scripts/check-circular.js       # Expected: 0 cycles in src/App.js and src/
   node scripts/verify-zero-emojis.js   # Expected: 0 violations across all 85 files
   node scripts/audit-secrets.js        # Expected: 0 secrets across working tree and 14 commits
   CI=true npm test -- --watchAll=false # Expected: 30 passed suites, 280 passed tests
   npm run build                        # Expected: clean compilation with exit code 0
   ```

2. **Verification During / After Implementation of R3–R7**:
   - **Zero Emojis Check**:
     ```bash
     node scripts/verify-zero-emojis.js
     ```
     Ensure all new files (`ViewContatti.js`, `contattiService.js`, `sw.js`, `HouseholdNotificationBanner.js`) contain 0 Unicode emojis or emoticons.
   - **Zero Circular Check**:
     ```bash
     node scripts/check-circular.js
     ```
     Ensure `contattiService.js`, `offlineStorage.js`, and new components introduce 0 circular dependency cycles.
   - **New Unit & Security Tests**:
     Run tests for contatti and security rules:
     ```bash
     CI=true npm test -- --watchAll=false src/test/tier1_features/contatti.test.jsx src/test/tier2_boundaries/security_rules.test.js src/components/DesktopNavigation.test.jsx
     ```
   - **Multi-Tenant Security Invalidation Condition**:
     Simulate an authenticated user in `casa_alpha` attempting to read or write a contact with `casaId: "casa_beta"`. The operation must fail and be rejected by Firestore security rules.
   - **PWA Service Worker Verification**:
     Inspect `build/sw.js` and `build/manifest.json` after running `npm run build`:
     Verify that `build/sw.js` is present at the root, includes pre-cache definitions for static assets, and does not cache cross-tenant user collections.
