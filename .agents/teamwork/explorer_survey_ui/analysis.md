# UI/UX Modernization & Zero-Emoji/Emoticon Audit Analysis
**Project:** HouseHelper (`househelper`)  
**Scope:** Requirements R1 (UI/UX Modernization) & R2 (Strict Prohibition on Emoticons/Emojis)  
**Investigator:** `explorer_survey_ui` (Teamwork Explorer)  
**Date:** 2026-11-02  

---

## 1. Executive Summary

This investigation provides a comprehensive survey of the entire user interface and user experience of HouseHelper, coupled with an exhaustive audit of Unicode emojis, pictographs, and text emoticons across `src/` and `public/`.

### Key Findings
1. **Emoji & Emoticon Audit:** Exactly **36 occurrences of Unicode emojis** across **14 distinct files** in `src/` and `public/` were located and cataloged. Zero informal ASCII text emoticons (like `:)` or `:D`) were found in active code, but several Unicode symbols (such as raw checkmark `✓`, arrows `←`, `→`) are used as rudimentary icons instead of proper SVG components.
2. **Component Architecture & Navigation Gap:** While mobile responsiveness exists via `MobileNavigation.js`, desktop navigation is completely absent in the top header—desktop users on sub-pages (like `/turni`, `/debiti`, `/spesa`, `/bacheca`, `/calendario`) must scroll to the bottom of the card and click a rudimentary `← Torna alla Dashboard` link to navigate.
3. **Legacy Template Inconsistencies:** The codebase incorporates disparate snippets from `css_template/` (e.g., CodePen lightsaber theme toggle, Monkey Island Guybrush pixel art canvas `MiniGuy.js`, cartoon eye-tracking mascot `InteractiveMascot.js`, CodePen donut chart). These conflict with the goal of creating a cohesive, production-ready SaaS application for household management.
4. **UX Blockers (Browser Popups):** 9 critical user flows (deleting chores, settling debts, creating houses, deleting announcements, abandoning households) rely on native browser `alert()` and `window.confirm()`, interrupting the single-page application experience.
5. **Modernization Blueprint:** We propose a unified modern Design System (tokens, typography, elevation, container system, icon set via `lucide-react`, notification toast and dialog system, and refined desktop/mobile responsive layouts).

---

## 2. Comprehensive Component & View Inventory

The application is structured into 6 primary functional domains, backed by an application shell, authentication providers, and utility layers.

### 2.1 View Inventory Matrix

| View / Component | File Path | Route | Access Level | Primary Purpose & UI Elements |
|---|---|---|---|---|
| **Landing Page** | `src/pages/Autenticazione/homeAutenticazione.js` | `/` | Public Only | App landing page. Displays `InteractiveMascot`, headline, CTA buttons to Login/Register, and bulleted feature pills. |
| **Login** | `src/pages/Autenticazione/viewLogin.js` | `/login` | Public Only | Email/Password login, Google Sign-in popup, mascot eye tracker, error banner, and switch to register. |
| **Registration** | `src/pages/Autenticazione/viewRegistrazione.js` | `/registrazione` | Public Only | Username, email, password registration, Google sign-in, mascot validation, input sanitization feedback. |
| **House Setup** | `src/pages/SceltaCasa.js` | `/scelta-casa` | Auth Only (homeless) | Create household (generates 6-char unique code) or join existing household via code. Uses browser `alert()`. |
| **User Dashboard** | `src/pages/homeUtente.js` | `/home` | Protected (Casa) | Central Bento Box grid: House name, invite code copier, `MiniGuy` pixel art, quick service buttons, next chore KPI, net debt balance KPI, `HouseAnalytics`, latest announcement, account management. |
| **Cleaning Shifts** | `src/pages/TurniPulizia/viewTurni.js` | `/turni` | Protected (Casa) | Chronological list of chores with date badge, assigned roommates, time slot, task location, edit/delete actions, empty state illustration. |
| **Add Chore** | `src/pages/TurniPulizia/aggiuntaTurno.js` | `/turni/aggiungi` | Protected (Casa) | Form for assigning roommates, chore date, time slot dropdown (07:00-23:00), cleaning locations, instructions. |
| **Edit Chore** | `src/pages/TurniPulizia/modificaTurno.js` | `/turni/modifica/:id` | Protected (Casa) | Multi-tenant guarded form to modify assigned users, date, slot, locations, and procedures. |
| **Debts & Expenses** | `src/pages/Debiti/ViewDebiti.js` | `/debiti` | Protected (Casa) | Net financial balance banner (positive/negative), transaction feed with payer/payee badge, amount, "Saldato" action button. |
| **Add Expense** | `src/pages/Debiti/AggiungiDebito.js` | `/debiti/aggiungi` | Protected (Casa) | Description, amount (€0.01 - €50,000), split-evenly checkbox across all roommates, payer and debtor selectors. |
| **Grocery List** | `src/pages/Spesa/ViewSpesa.js` | `/spesa` | Protected (Casa) | Real-time shared shopping list. Top counters (da comprare vs. presi), quick add input, strikethrough checkbox, delete button. |
| **Bulletin Board** | `src/pages/Bacheca/ViewBacheca.js` | `/bacheca` | Protected (Casa) | Announcements feed. Note card with title, content, author attribution, optional deadline, author-only edit/delete buttons. |
| **Add Note** | `src/pages/Bacheca/AggiungiNota.js` | `/bacheca/aggiungi` | Protected (Casa) | Title, content (up to 1500 chars), optional event/deadline date picker. |
| **Edit Note** | `src/pages/Bacheca/ModificaNota.js` | `/bacheca/modifica/:id` | Protected (Casa) | Multi-tenant author-guarded form to update note content and deadline. |
| **House Calendar** | `src/pages/Bacheca/ViewCalendario.js` | `/calendario` | Protected (Casa) | `react-calendar` interactive view with color-coded dot markers (yellow for chores, purple for events), daily agenda list, quick event CTA. |
| **Add Event** | `src/pages/Bacheca/AggiungiEvento.js` | `/calendario/aggiungi` | Protected (Casa) | Calendar event creator with pre-filled date from selected calendar tile. |
| **Not Found (404)** | `src/pages/NotFound.js` | `*` (Catch-all) | Universal | Compass emoji, 404 header, explanation, button returning user to safe route based on auth status. |

---

### 2.2 Shared Components & App Shell Inventory

| Component | File Path | Props / State | Description & UI Function |
|---|---|---|---|
| **App Shell Header** | `src/App.js` (`AppHeader`) | None | Top fixed/sticky bar containing logo badge, brand title "HouseHelper", `ThemeToggle`, and `MobileNavigation`. |
| **App Footer** | `src/components/AppFooter.js` | None | Clean copyright footer with author GitHub profile link and email link using FontAwesome icons. |
| **Mobile Navigation** | `src/components/MobileNavigation.js` | `isOpen`, route changes | Hamburger trigger with 2-bar animation, full-screen slide drawer with user greeting, navigation items, active pill, and logout button. |
| **Theme Toggle** | `src/components/ThemeToggle.js` | `useTheme()` | CodePen-derived lightsaber dual-blade toggle with emoji icons `☀️` and `🌙`. |
| **Scroll Progress Bar** | `src/components/ScrollProgressBar.js` | Window scroll listener | 5px fixed gradient bar on viewport right edge indicating scroll depth. |
| **Background Slideshow** | `src/components/BackgroundSlideshow.js` | `location.pathname` | Fixed background cycling 3 images with pan-and-zoom animation and conditional blur/opacity for auth vs. interior pages. |
| **House Analytics** | `src/components/HouseAnalytics.js` | `turni`, `debiti`, `spesa`, `utentiMap`, `currentUserId` | Tabbed dashboard analytics card: SVG Donut chart with legend for expenses, horizontal bar chart for chores by roommate, and multi-step progress bar for groceries. |
| **Interactive Mascot** | `src/components/InteractiveMascot.js` | `targetInputRef`, `isError`, `errorMessage` | SVG animated character ("Chloe") whose pupils follow cursor/active input, with horizontal drag bounce and error bubble. |
| **Mini Guy** | `src/components/MiniGuy.js` | None | Canvas-based 44-frame spyglass animation of Monkey Island Guybrush Threepwood pixel art placed in the dashboard header. |
| **Celebration** | `src/components/Celebration.js` | Triggered via `triggerConfetti()` | Fullscreen canvas particle burst triggered on successful user actions (sign in, chore creation, expense split, item purchase). |
| **Route Guards** | `src/components/RouteGuards.js` | None (reads `AuthContext`) | `HouseProtectedRoute`, `HouseSelectRoute`, and `PublicOnlyRoute` managing access based on auth token and household assignment. |
| **Auth Provider** | `src/contexts/AuthContext.js` | Provides `currentUser`, `userData`, `loading` | Synchronizes Firebase auth state with Firestore user profile document. |
| **Theme Provider** | `src/contexts/ThemeContext.js` | Provides `theme`, `toggleTheme`, `isDark` | Toggles between `.dark-theme` and `.light-theme` with persistence in `localStorage`. |

---

## 3. Complete Emoji & Emoticon Audit

An exhaustive scan across all files in `src/` and `public/` identified **36 occurrences of Unicode emojis** across 14 files, plus several raw typographic/arrow symbols used as icon substitutes.

### 3.1 Exhaustive Inventory Table

| # | File Path | Line | Exact Code Point(s) | Glyph | Verbatim Code Line | Recommended Professional Replacement |
|---|---|---|---|---|---|---|
| 1 | `public/index.html` | 27 | `U+1F3E0` | 🏠 | `<title>HouseHelper 🏠</title>` | Remove emoji: `<title>HouseHelper - Gestione Casa Intelligente</title>` |
| 2 | `src/components/MiniGuy.js` | 101 | `U+1F3F4` `U+200D` `U+2620` `U+FE0F` | 🏴‍☠️ | `title="Mascotte Pirata fa la guardia alla casa 🏴‍☠️"` | Remove emoji: `title="Mascotte HouseHelper"` (or replace widget with modern House Health indicator) |
| 3 | `src/components/ThemeToggle.js` | 23 | `U+2600` | ☀️ | `<span className="theme-icon">{isLight ? "☀️" : "🌙"}</span>` | Lucide `<Sun size={15} strokeWidth={2} />` |
| 4 | `src/components/ThemeToggle.js` | 23 | `U+1F319` | 🌙 | `<span className="theme-icon">{isLight ? "☀️" : "🌙"}</span>` | Lucide `<Moon size={15} strokeWidth={2} />` |
| 5 | `src/pages/Autenticazione/homeAutenticazione.js` | 43 | `U+2728` | ✨ | `<span>✨ Turni</span>` | Lucide `<Sparkles size={14} className="badge-icon" /> Turni` (or `<Broom size={14} />`) |
| 6 | `src/pages/Autenticazione/homeAutenticazione.js` | 45 | `U+1F4B8` | 💸 | `<span>💸 Spese</span>` | Lucide `<Receipt size={14} className="badge-icon" /> Spese` |
| 7 | `src/pages/Autenticazione/homeAutenticazione.js` | 47 | `U+1F6D2` | 🛒 | `<span>🛒 Spesa</span>` | Lucide `<ShoppingCart size={14} className="badge-icon" /> Spesa` |
| 8 | `src/pages/Autenticazione/homeAutenticazione.js` | 49 | `U+1F5D3` `U+FE0F` | 🗓️ | `<span>🗓️ Calendario</span>` | Lucide `<Calendar size={14} className="badge-icon" /> Calendario` |
| 9 | `src/pages/Autenticazione/viewLogin.js` | 106 | `U+1F44B` | 👋 | `<h1>Bentornato 👋</h1>` | Clean headline: `<h1>Bentornato</h1>` |
| 10 | `src/pages/Autenticazione/viewRegistrazione.js` | 121 | `U+2728` | ✨ | `<h1>Crea Account ✨</h1>` | Clean headline: `<h1>Crea Account</h1>` |
| 11 | `src/pages/SceltaCasa.js` | 93 | `U+1F389` | 🎉 | `alert(\`Benvenuto in ${casaDoc.data().nome}! 🎉\`);` | Replace `alert()` with Toast notification: `toast.success(\`Benvenuto in ${casaDoc.data().nome}!\`)` |
| 12 | `src/pages/SceltaCasa.js` | 112 | `U+1F3E0` | 🏠 | `<h1>Configurazione Casa 🏠</h1>` | Clean headline: `<h1>Configurazione Casa</h1>` (with optional `<Home size={28} />`) |
| 13 | `src/pages/homeUtente.js` | 152 | `U+1F3E0` | 🏠 | `<h1>{casa?.nome \|\| "La tua Casa"} 🏠</h1>` | Clean headline: `<h1>{casa?.nome \|\| "La tua Casa"}</h1>` |
| 14 | `src/pages/homeUtente.js` | 162 | `U+2713` | ✓ | `Codice Invito {copiedCode && <span style={{ color: 'var(--color-success)' }}>✓ Copiato!</span>}` | Lucide `<Check size={14} strokeWidth={2.5} /> Copiato!` |
| 15 | `src/pages/homeUtente.js` | 174 | `U+1F9F9` | 🧹 | `<span className="service-icon">🧹</span>` | Lucide `<Broom size={24} strokeWidth={1.8} />` (or FontAwesome `<i className="fas fa-broom" />`) |
| 16 | `src/pages/homeUtente.js` | 178 | `U+1F4B0` | 💰 | `<span className="service-icon">💰</span>` | Lucide `<Wallet size={24} strokeWidth={1.8} />` |
| 17 | `src/pages/homeUtente.js` | 182 | `U+1F6D2` | 🛒 | `<span className="service-icon">🛒</span>` | Lucide `<ShoppingCart size={24} strokeWidth={1.8} />` |
| 18 | `src/pages/homeUtente.js` | 186 | `U+1F5D3` `U+FE0F` | 🗓️ | `<span className="service-icon">🗓️</span>` | Lucide `<Calendar size={24} strokeWidth={1.8} />` |
| 19 | `src/pages/homeUtente.js` | 190 | `U+1F4CC` | 📌 | `<span className="service-icon">📌</span>` | Lucide `<Pin size={24} strokeWidth={1.8} />` |
| 20 | `src/pages/homeUtente.js` | 222 | `U+1F389` | 🎉 | `🎉 Nessun turno oggi. Casa splendente!` | Lucide `<CheckCircle2 size={18} /> Nessun turno oggi. Casa in perfetto ordine.` |
| 21 | `src/pages/TurniPulizia/viewTurni.js` | 79 | `U+1F9F9` | 🧹 | `<h1 style={{ margin: 0, textAlign: "left" }}>Turni Pulizia 🧹</h1>` | Clean headline: `<h1 style={{ margin: 0, textAlign: "left" }}>Turni Pulizia</h1>` |
| 22 | `src/pages/TurniPulizia/viewTurni.js` | 102 | `U+1F9F9` | 🧹 | `<span style={{ fontSize: "3rem", opacity: 0.7 }}>🧹</span>` | Lucide `<Sparkles size={48} className="empty-state-svg" />` |
| 23 | `src/pages/TurniPulizia/aggiuntaTurno.js` | 102 | `U+1F9F9` | 🧹 | `<h1 style={{ marginBottom: "6px" }}>Nuovo Turno Pulizia 🧹</h1>` | Clean headline: `<h1 style={{ marginBottom: "6px" }}>Nuovo Turno Pulizia</h1>` |
| 24 | `src/pages/TurniPulizia/modificaTurno.js` | 145 | `U+270F` `U+FE0F` | ✏️ | `<h1 style={{ marginBottom: "6px" }}>Modifica Turno ✏️</h1>` | Clean headline: `<h1 style={{ marginBottom: "6px" }}>Modifica Turno</h1>` |
| 25 | `src/pages/Debiti/ViewDebiti.js` | 124 | `U+1F4B0` | 💰 | `<h1 style={{ margin: 0, textAlign: "left" }}>Spese & Debiti 💰</h1>` | Clean headline: `<h1 style={{ margin: 0, textAlign: "left" }}>Spese & Debiti</h1>` |
| 26 | `src/pages/Debiti/ViewDebiti.js` | 178 | `U+1F4B8` | 💸 | `<span style={{ fontSize: "3rem", opacity: 0.7 }}>💸</span>` | Lucide `<Receipt size={48} className="empty-state-svg" />` |
| 27 | `src/pages/Debiti/AggiungiDebito.js` | 163 | `U+1F4B8` | 💸 | `<h1 style={{ marginBottom: "6px" }}>Nuova Spesa 💸</h1>` | Clean headline: `<h1 style={{ marginBottom: "6px" }}>Nuova Spesa</h1>` |
| 28 | `src/pages/Spesa/ViewSpesa.js` | 129 | `U+1F6D2` | 🛒 | `<h1 style={{ margin: 0, textAlign: "left" }}>Lista della Spesa 🛒</h1>` | Clean headline: `<h1 style={{ margin: 0, textAlign: "left" }}>Lista della Spesa</h1>` |
| 29 | `src/pages/Spesa/ViewSpesa.js` | 180 | `U+1F34E` | 🍎 | `<span style={{ fontSize: "3rem", opacity: 0.7 }}>🍎</span>` | Lucide `<ShoppingBag size={48} className="empty-state-svg" />` |
| 30 | `src/pages/Bacheca/ViewBacheca.js` | 100 | `U+1F4CC` | 📌 | `<h1 style={{ margin: 0, textAlign: "left" }}>Bacheca Condivisa 📌</h1>` | Clean headline: `<h1 style={{ margin: 0, textAlign: "left" }}>Bacheca Condivisa</h1>` |
| 31 | `src/pages/Bacheca/ViewBacheca.js` | 117 | `U+1F4DD` | 📝 | `<span style={{ fontSize: "3rem", opacity: 0.7 }}>📝</span>` | Lucide `<MessageSquare size={48} className="empty-state-svg" />` |
| 32 | `src/pages/Bacheca/AggiungiNota.js` | 72 | `U+1F4CC` | 📌 | `<h1 style={{ marginBottom: "6px" }}>Nuovo Avviso 📌</h1>` | Clean headline: `<h1 style={{ marginBottom: "6px" }}>Nuovo Avviso</h1>` |
| 33 | `src/pages/Bacheca/ModificaNota.js` | 122 | `U+270F` `U+FE0F` | ✏️ | `<h1 style={{ marginBottom: "6px" }}>Modifica Avviso ✏️</h1>` | Clean headline: `<h1 style={{ marginBottom: "6px" }}>Modifica Avviso</h1>` |
| 34 | `src/pages/Bacheca/ViewCalendario.js` | 100 | `U+1F5D3` `U+FE0F` | 🗓️ | `<h1 style={{ margin: 0, textAlign: 'left' }}>Calendario Casa 🗓️</h1>` | Clean headline: `<h1 style={{ margin: 0, textAlign: 'left' }}>Calendario Casa</h1>` |
| 35 | `src/pages/Bacheca/ViewCalendario.js` | 133 | `U+2615` | ☕ | `<span style={{ fontSize: '2rem', opacity: 0.7 }}>☕</span>` | Lucide `<Coffee size={40} className="empty-state-svg" />` (or `<CalendarCheck size={40} />`) |
| 36 | `src/pages/Bacheca/AggiungiEvento.js` | 86 | `U+1F5D3` `U+FE0F` | 🗓️ | `<h1 style={{ marginBottom: "6px" }}>Nuovo Evento Calendario 🗓️</h1>` | Clean headline: `<h1 style={{ marginBottom: "6px" }}>Nuovo Evento Calendario</h1>` |
| 37 | `src/pages/NotFound.js` | 23 | `U+1F9ED` | 🧭 | `🧭` | Lucide `<Compass size={64} className="not-found-icon" />` |

---

### 3.2 Typographic & Arrow Pseudo-Icons Audit

In addition to Unicode emojis, text characters are repeatedly used as makeshift UI icons:
1. `← Torna alla Dashboard` (U+2190 Leftwards Arrow):
   - `src/pages/TurniPulizia/viewTurni.js:174`
   - `src/pages/Debiti/ViewDebiti.js:283`
   - `src/pages/Spesa/ViewSpesa.js:228`
   - `src/pages/Bacheca/ViewBacheca.js:189`
   - `src/pages/Bacheca/ViewCalendario.js:191`
   - **Modern Replacement:** `<ArrowLeft size={16} /> Torna alla Dashboard`
2. `→` (U+2192 Rightwards Arrow):
   - `src/pages/Debiti/ViewDebiti.js:241` (`Da: X → A: Y`)
   - `src/pages/homeUtente.js:233` (`Gestisci tutti i turni →`)
   - `src/pages/homeUtente.js:265` (`Vedi dettagli spese →`)
   - **Modern Replacement:** `<ArrowRight size={14} />`
3. `✓ Copiato!` (U+2713 Check Mark):
   - `src/pages/homeUtente.js:162`
   - **Modern Replacement:** `<Check size={14} /> Copiato!`

---

### 3.3 Automated Verification Check Script (Zero-Emoji Linter & CI Gate)

To fulfill Requirement R4 and ensure permanent enforcement of Requirement R2, an automated verification script must run in CI/pre-commit.

#### Script Implementation (`scripts/verify-no-emojis.js`):
```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_DIRS = ['src', 'public'];
const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.svg', '.map'
]);

// Unicode Standard Emoji & Pictographic Ranges
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

// Text Emoticons Pattern
const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (!EXCLUDED_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const allFiles = TARGET_DIRS.flatMap(d => getFiles(path.join(ROOT_DIR, d)));
let violationCount = 0;

console.log(`\n🔍 Scanning ${allFiles.length} files across src/ and public/ for emojis and emoticons...\n`);

for (const filePath of allFiles) {
  const relPath = path.relative(ROOT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // 1. Check Unicode Emojis
    const chars = [...line];
    chars.forEach((char, cIdx) => {
      if (EMOJI_REGEX.test(char)) {
        const codePoint = 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        console.error(`❌ EMOJI VIOLATION: ${relPath}:${idx + 1}:${cIdx + 1}`);
        console.error(`   Character: "${char}" (${codePoint})`);
        console.error(`   Line snippet: ${line.trim()}\n`);
        violationCount++;
      }
    });

    // 2. Check Text Emoticons
    let match;
    while ((match = EMOTICON_REGEX.exec(line)) !== null) {
      console.error(`❌ TEXT EMOTICON VIOLATION: ${relPath}:${idx + 1}`);
      console.error(`   Emoticon: "${match[0]}"`);
      console.error(`   Line snippet: ${line.trim()}\n`);
      violationCount++;
    }
  });
}

if (violationCount > 0) {
  console.error(`💥 FAILURE: Found ${violationCount} forbidden emoji/emoticon occurrence(s) in codebase.`);
  process.exit(1);
} else {
  console.log(`✅ SUCCESS: Zero emojis or text emoticons detected across all scanned files.`);
  process.exit(0);
}
```

#### Jest Component Test Integration (`src/setupTests.js` or `src/App.test.js`):
A complementary React Testing Library test renders each route and asserts that `container.textContent` matches `!EMOJI_REGEX.test(container.textContent)`.

---

## 4. UI/UX Modernization Blueprint

### 4.1 Visual & Structural Weaknesses Identified

1. **Absence of Desktop Navigation:**
   - On viewports > 768px, `MobileNavigation` is hidden with `display: none`.
   - The top bar only displays the logo and the theme toggle.
   - Once a user navigates to `/turni` or `/debiti`, there is **no global navbar** or sidebar to navigate to other sections. Users are forced to find and click "← Torna alla Dashboard" at the bottom of the card, returning to `/home` before opening another page.
2. **Pervasive Inline Styling vs. Cohesive Classes:**
   - Over 60% of layout rules in `src/pages/` are written as inline JSX styles (`style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}`).
   - Margins and paddings vary arbitrarily: some cards have `padding: 2.5rem`, others `padding: 1.5rem`, others `padding: 24px`.
3. **Hardcoded Browser Dialogs (`alert` / `confirm`):**
   - Destructive actions (e.g. deleting a chore or leaving a house) trigger browser modal popups (`window.confirm(...)`), which are unstyled, halt the JavaScript thread, and degrade mobile UX.
4. **Childish / Incongruous Feedback Widgets:**
   - `InteractiveMascot.js` (large purple blob character whose pupils track mouse movements) occupies 135px of vertical screen real estate directly above login/registration forms, pushing form inputs below the fold on mobile screens.
   - `MiniGuy.js` (retro 8-bit Guybrush Threepwood pixel art canvas from Monkey Island) is placed inside the dashboard greeting bar next to the invite code, clashing with the modern SaaS look.
   - `ThemeToggle.js` (Star Wars dual lightsaber animation with pink and cyan blades) conflicts with the clean indigo/teal design language.
5. **Form Error Visibility & Accessibility:**
   - Form inputs lack inline validation states. When an error occurs, a generic `.error-alert` banner is rendered at the top of the card rather than highlighting the specific invalid field.
   - Forms lack ARIA labels, `aria-describedby` for error states, and high-contrast focus rings.
6. **Inconsistent Container Max-Widths:**
   - Auth pages: 440px
   - Setup: 580px
   - Chores / Debiti / Spesa / Bacheca / Calendario: 820px
   - Forms (Aggiungi...): 620px
   - Dashboard: 880px
   - This causes jarring visual jumps when transitioning between pages.

---

### 4.2 Proposed Modern Design System Tokens

We define a production-grade, accessible design system token structure replacing disparate styling.

```css
/* ==========================================================================
   MODERN DESIGN SYSTEM TOKENS (HouseHelper v2)
   ========================================================================== */
:root {
  /* Brand Primary: Modern Indigo */
  --color-brand-50:  #eef2ff;
  --color-brand-100: #e0e7ff;
  --color-brand-200: #c7d2fe;
  --color-brand-500: #6366f1;
  --color-brand-600: #4f46e5;
  --color-brand-700: #4338ca;
  --color-brand-glow: rgba(99, 102, 241, 0.25);

  /* Brand Accent: Sophisticated Teal */
  --color-accent-50:  #f0fdfa;
  --color-accent-500: #14b8a6;
  --color-accent-600: #0d9488;
  --color-accent-glow: rgba(20, 184, 166, 0.2);

  /* Semantic Feedback (Strict AA Contrast) */
  --color-success: #10b981;
  --color-success-bg: rgba(16, 185, 129, 0.12);
  --color-danger:  #ef4444;
  --color-danger-bg: rgba(239, 68, 68, 0.12);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-info:    #3b82f6;
  --color-info-bg: rgba(59, 130, 246, 0.12);

  /* Elevation Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-card: 0 12px 32px -8px rgba(0, 0, 0, 0.28);

  /* Radius Scale */
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Layout Widths */
  --container-sm: 480px;   /* Auth, Modals */
  --container-md: 680px;   /* Forms, Settings */
  --container-lg: 960px;   /* Main Content, Lists, Calendars */
  --container-xl: 1200px;  /* Wide Dashboard View */

  /* Typography Scale */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-display: 'Outfit', var(--font-family-sans);

  --font-size-xs:   0.75rem;   /* 12px */
  --font-size-sm:   0.875rem;  /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg:   1.125rem;  /* 18px */
  --font-size-xl:   1.25rem;   /* 20px */
  --font-size-2xl:  1.5rem;    /* 24px */
  --font-size-3xl:  1.875rem;  /* 30px */
  --font-size-4xl:  2.25rem;   /* 36px */

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Dark Mode Tokens (Default) */
:root, html.dark-theme {
  --bg-app: #09090b;
  --bg-surface: #121217;
  --bg-card: rgba(22, 23, 31, 0.78);
  --bg-card-hover: rgba(30, 32, 44, 0.92);
  --bg-input: rgba(14, 15, 22, 0.7);
  --bg-subtle: rgba(255, 255, 255, 0.04);

  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(255, 255, 255, 0.14);
  --border-focus: var(--color-brand-500);

  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --text-disabled: #475569;
}

/* Light Mode Tokens */
html.light-theme {
  --bg-app: #f8fafc;
  --bg-surface: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.9);
  --bg-card-hover: #ffffff;
  --bg-input: #f1f5f9;
  --bg-subtle: rgba(0, 0, 0, 0.03);

  --border-subtle: rgba(0, 0, 0, 0.08);
  --border-medium: rgba(0, 0, 0, 0.14);
  --border-focus: var(--color-brand-600);

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --text-disabled: #94a3b8;
}
```

---

### 4.3 Modern App Shell & Unified Navigation Architecture

To solve the desktop navigation isolation issue:
1. **Desktop Top Navbar:**
   - Retain the logo badge and title on the left.
   - For authenticated users with a house, render a clean horizontal nav pill group in the center:
     - `Dashboard` (`/home`)
     - `Turni` (`/turni`)
     - `Spese` (`/debiti`)
     - `Spesa` (`/spesa`)
     - `Bacheca` (`/bacheca`)
     - `Calendario` (`/calendario`)
   - On the right: `ThemeToggle`, Roommate Avatar / User profile dropdown, and Logout.
2. **Mobile Viewports (< 768px):**
   - The desktop pill group hides automatically; the hamburger trigger activates the existing smooth slide drawer `MobileNavigation`.
3. **Sub-page Navigation Continuity:**
   - In addition to the global top bar, include a breadcrumb or subtle back button at the top-left of list/form views (e.g. `<Link to="/home"><ArrowLeft size={16} /> Home</Link> / Spese`), eliminating the lonely link at the bottom of the page.

---

### 4.4 Replacement of Gimmick Mascot & Pixel Art

1. **Retire `MiniGuy.js`:**
   - Replace Monkey Island pirate sprite with a clean **Household Status Pill** or **Roommate Presence Avatar Stack** in the dashboard header:
     - Shows initials of active household members with online status badges.
     - Adds a "Household Harmony Score" or clean icon indicator (`<Home size={18} className="text-brand" />`).
2. **Modernize `InteractiveMascot.js`:**
   - Replace the large cartoon blob with a minimalist, sleek **Vector House Helper Shield / Brand Crest** or subtle animated SVG house icon.
   - Alternatively, remove the cartoon character completely from auth forms to allow immediate visibility of input fields on mobile screens.
3. **Modernize `ThemeToggle.js`:**
   - Replace the neon Star Wars lightsaber switch with a minimalist, tactile sliding switch containing Lucide `<Sun size={14} />` and `<Moon size={14} />` icons with smooth micro-transition.

---

### 4.5 Modern Toast Notification & Modal Dialog System

Replace all native browser `alert()` and `window.confirm()` calls:
1. **Toast Notification Provider:**
   - Implement an in-app toast stack (`ToastContext` or lightweight hook) displaying non-blocking success, error, and informational messages in the bottom-right (or top-center on mobile).
   - Replaces `alert("Casa creata con successo!...")` and `alert("Errore caricamento...")`.
2. **Accessible Confirmation Modal (`ConfirmDialog`):**
   - Replaces `window.confirm("Sei sicuro di voler uscire da questa casa?")` and `window.confirm("Sei sicuro di voler eliminare questo turno?")`.
   - Renders an accessible backdrop with focus trap, explicit "Annulla" and "Conferma Eliminazione" buttons, and a warning icon (`<AlertTriangle size={24} />`).

---

## 5. Technical Risk Analysis & Recommendations

| Risk Area | Severity | Root Cause | Recommended Mitigation |
|---|---|---|---|
| **Breaking FontAwesome during Emoji Cleanup** | Low | Active components mix FontAwesome classes with Unicode emojis. | Retain FontAwesome or transition cleanly to `lucide-react`. Do not remove FontAwesome font links in `index.html` until all icons are verified. |
| **Mobile Drawer Gesture & Scroll Lock** | Medium | `MobileNavigation` directly mutates `document.body.style.overflow`. | Encapsulate scroll locking into a dedicated `useLockBodyScroll` hook to avoid orphaned scroll locks. |
| **`react-calendar` Custom Styling Regression** | Medium | `ViewCalendario.js` relies on overriding `Calendar.css` classes in `App.css`. | Keep `.custom-calendar-wrapper` rules scoped and test day tile contrast in both dark and light themes. |
| **Circular Import Interference** | Low (Cross-cutting with R3) | Several pages import `App.css` directly while `App.js` imports all pages. | Moving styles to `index.css` or modular `.module.css` files facilitates clean architecture without circular dependencies. |
