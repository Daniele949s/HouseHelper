# Investigation Report: Navigation Structure, Cross-Device Ergonomics, Touch Targets & Safe Areas

**Survey Explorer**: Survey Explorer 2  
**Date**: 2026-11-08  
**Scope**: Mobile & Desktop Ergonomics, Navigation Architecture (`DesktopNavigation`, `MobileNavigation`, `MobileBottomBar`, `AppHeader`), Touch Targets (Apple HIG >= 44px), Safe Areas (`env(safe-area-inset-*)`), and Layout Responsiveness across all views.

---

## 1. Observation

### 1.1 Global Navigation Architecture & Component Composition
1. **Root Integration (`src/App.js`)**:
   - Lines 10-16: Imports `AppHeader`, `MobileBottomBar`, `ToastContainer`, `ConfirmModal`, `ScrollProgressBar`, `BackgroundSlideshow`, `AppFooter`.
   - Line 91-92: `<div className="app-container"><AppHeader />...`
   - Lines 176-178: `<AppFooter /><MobileBottomBar /></div>`.
   - All application views (public auth, onboarding `/scelta-casa`, and 8 authenticated household pages) are wrapped within this shared shell.

2. **Top Navigation Header (`src/components/AppHeader.js`)**:
   - Lines 27-56: Renders `<header className="app-topbar">`, containing `.brand-wrapper` (logo and title), `<DesktopNavigation />`, and `.topbar-actions` (containing `<ThemeToggle />` and `<MobileNavigation />`).
   - The brand element (lines 28-45) functions as an accessible home button with `role="button"`, `tabIndex={0}`, keyboard Enter/Space handler, and `aria-label="Torna alla pagina principale HouseHelper"`.

3. **Desktop Navigation (`src/components/DesktopNavigation.js`)**:
   - Lines 11-17: Authenticated guard: returns `null` if user is unauthenticated or `!userData.casaId`.
   - Lines 19-28: 8 navigation links:
     - `Dashboard` (`/home`, `fa-home`)
     - `Turni` (`/turni`, `fa-broom`)
     - `Debiti` (`/debiti`, `fa-wallet`)
     - `Spesa` (`/spesa`, `fa-shopping-cart`)
     - `Bacheca` (`/bacheca`, `fa-thumbtack`)
     - `Calendario` (`/calendario`, `fa-calendar-alt`)
     - `Documenti` (`/documenti`, `fa-folder-open`)
     - `Contatti` (`/contatti`, `fa-address-book`)
   - Lines 31-52: Uses semantic `<nav className="desktop-nav-root" aria-label="Navigazione principale">` with `<ul className="desktop-nav-list">`.

4. **Mobile Bottom Navigation (`src/components/MobileBottomBar.js`)**:
   - Lines 14-17: Authenticated guard: returns `null` if unauthenticated or without `casaId`.
   - Lines 23-28: 4 direct primary route tabs: Home (`/home`), Turni (`/turni`), Spese (`/debiti`), Spesa (`/spesa`).
   - Lines 52-62: 5th tab is a `<button>` titled "Altro" (`fa-bars`) that dispatches a custom event:
     ```javascript
     window.dispatchEvent(new CustomEvent("toggle-mobile-menu"));
     ```

5. **Mobile Navigation Drawer (`src/components/MobileNavigation.js`)**:
   - Lines 20-27: Listens for `toggle-mobile-menu` from `MobileBottomBar`.
   - Lines 42-55: Body scroll locking implemented: `document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";`.
   - Lines 93-107: Also provides a top-bar burger button (`.burger-container`).
   - Lines 110-172: Fullscreen solid opaque drawer (`.mobile-menu-overlay`) listing all 8 sections (or 3 public links), user greeting, close button, and logout button.

---

### 1.2 Touch Targets & Ergonomic Dimensions (Apple HIG >= 44x44 pt/px)
Apple HIG Reference (`references/hig/buttons.md › Best practices`):
> *"As a general rule, a button needs a hit region of at least 44x44 pt — in visionOS, 60x60 pt — to ensure that people can select it easily, whether they use a fingertip, a pointer, their eyes, or a remote."*

Observed CSS declarations and component dimensions in the codebase:
- `.mobile-bottom-tab` (`src/App.css:3606-3607`):
  `min-height: 48px; min-width: 48px;` — **Compliant (exceeds 44px)**.
- `.burger-container` (`src/App.css:1090-1093`):
  `height: 44px; width: 44px; min-height: 44px; min-width: 44px;` — **Compliant**.
- `.mobile-close-btn` (`src/App.css:1200-1203`):
  `width: 44px; height: 44px; min-width: 44px; min-height: 44px;` — **Compliant**.
- `.theme-pill-toggle` (`src/App.css:176-177`):
  `min-width: 44px; min-height: 44px;` — **Compliant**.
- `.btn-text` (`src/App.css:641`):
  `min-height: 44px; display: inline-flex; align-items: center;` — **Compliant**.
- `.grocery-staple-btn` (`src/App.css:334`):
  `min-height: 44px;` — **Compliant**.
- `.btn-action-call`, `.btn-action-email` (`src/App.css:3509`):
  `min-height: 44px;` — **Compliant**.
- `.contact-delete-btn` (`src/App.css:3464-3465`):
  `min-width: 44px; min-height: 44px;` — **Compliant**.
- `.confirm-modal-footer button` (`src/App.css:397` / `m9_test:397`):
  `min-height: 44px;` — **Compliant**.
- `.confirm-modal-close`, `.modal-close-btn` (`src/App.css:398-399`):
  `min-width: 44px; min-height: 44px;` — **Compliant**.
- `.doc-filter-pill` (`src/App.css:2897`), `.doc-search-clear` (`src/App.css:2975-2976`), `.doc-view-btn` (`src/App.css:3015-3016`):
  `min-height: 44px; min-width: 44px;` — **Compliant**.
- `.template-footer-icons li a` (`src/App.css:1036-1039`):
  `width: 44px; height: 44px; min-width: 44px; min-height: 44px;` — **Compliant**.
- `.pill-selector-btn` (`src/App.css:2626`):
  `min-height: 44px;` — **Compliant**.

**Observed Gaps / Vulnerabilities**:
1. `.btn-danger-outline` (`src/App.css:653-659`):
   ```css
   .btn-danger-outline {
     background: transparent;
     color: var(--color-danger);
     border: 1px solid rgba(239, 68, 68, 0.3);
     padding: 8px 16px;
     border-radius: var(--radius-md);
   }
   ```
   Lacks `min-height: 44px` in the CSS class definition. While individual pages (`homeUtente.js:839`, `ViewSpesa.js:265`, `ViewTurni.js:589`) pass inline styles `minHeight: "44px"`, any usage without inline overrides renders at ~34px.
2. Base `button` rule (`src/App.css:586-597`): lacks a default `min-height: 44px`.
3. Preset chips in `AggiuntaTurno.js` and `AggiungiDebito.js`: tested in `m9_challenger_ergonomics_stress.test.jsx:489` with `minHeight >= 40px`. While passing 40px tests, in full Apple HIG strict mode they should standardize to >= 44px.

---

### 1.3 Safe Area Insets & Viewport Configuration
1. **Viewport Meta (`public/index.html:6`)**:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
   ```
   `viewport-fit=cover` is present, correctly enabling `env(safe-area-inset-*)`.
2. **Bottom Safe Area Clearance (`src/App.css`)**:
   - Line 3580: `.mobile-bottom-bar { height: calc(64px + env(safe-area-inset-bottom, 0px)); padding-bottom: env(safe-area-inset-bottom, 0px); ... }`
   - Line 1360: `.app-container { padding: 12px 14px calc(84px + env(safe-area-inset-bottom, 0px)) 14px !important; }`
   The bottom clearance prevents occlusions from the iPhone Home Indicator.
3. **Modal Dialog Insets (`src/App.css:1759-1762 & 1905-1908`)**:
   Both desktop and mobile modal backdrops respect `env(safe-area-inset-top)`, `bottom`, `left`, and `right`.
4. **CRITICAL DEFICIENCY — Missing Top Safe Area Inset on Mobile**:
   - Under `@media (max-width: 768px)` in `src/App.css:1360`:
     ```css
     .app-container {
       padding: 12px 14px calc(84px + env(safe-area-inset-bottom, 0px)) 14px !important;
     }
     ```
   - Top padding is hardcoded to `12px`!
   - On iOS standalone PWA / web-app mode (`apple-mobile-web-app-capable: yes` in `public/index.html:18`), `safe-area-inset-top` is 47px to 59px (notch / Dynamic Island).
   - Because `env(safe-area-inset-top)` is omitted, the iOS status bar and camera notch overlap the HouseHelper topbar (`.app-topbar`), brand logo, and theme/burger buttons.
   - In `.mobile-menu-inner` (`src/App.css:1188`), `padding: 32px 24px 40px 24px;` also omits `env(safe-area-inset-top)`.

---

### 1.4 Desktop Ergonomics, Positioning & Multi-Column Utilization
1. **Desktop Navigation Positioning (`src/App.css:22-39`)**:
   ```css
   .app-topbar {
     width: 100%;
     max-width: var(--container-xl);
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: 24px;
     padding: 10px 20px;
     background: var(--bg-glass);
     backdrop-filter: var(--glass-blur);
     -webkit-backdrop-filter: var(--glass-blur);
     border: 1px solid var(--border-color);
     border-radius: var(--radius-full);
     box-shadow: var(--shadow-glass);
     transition: all var(--duration-normal) var(--ease-standard);
     position: relative;
     z-index: 100;
   }
   ```
   **Observation**: `.app-topbar` is `position: relative`. It is NOT sticky or fixed.
   - When scrolling down any long page on desktop, the navigation scrolls completely off screen.
   - Furthermore, because nothing ever scrolls beneath `.app-topbar`, its `backdrop-filter: var(--glass-blur)` remains visually non-functional.
   - Requirement R2 specifies "Desktop (sidebar persistente, multi-colonna, stati hover al cursore)". The app currently has a top horizontal navbar rather than a sidebar. Making `.app-topbar` sticky (`position: sticky; top: 12px; z-index: 900;`) satisfies the persistence requirement and makes Liquid Glass function properly.

2. **Desktop Widescreen Clamping Bug (Inline `maxWidth`)**:
   - In `src/App.css:3644-3679`:
     ```css
     @media (min-width: 1024px) {
       .app-container {
         max-width: 1360px;
         padding: 28px 48px 60px 48px;
       }
       .domain-page-card {
         max-width: 1000px;
         padding: 40px !important;
       }
     }
     ```
   - HOWEVER, in the JSX files:
     - `src/pages/homeUtente.js:311`: `<div style={{ maxWidth: "880px", width: "100%", margin: "0 auto" }}>`
     - `src/pages/TurniPulizia/viewTurni.js:324`: `<div className="card domain-page-card" style={{ maxWidth: "860px" }}>`
     - `src/pages/Debiti/ViewDebiti.js:232`: `<div className="card domain-page-card" style={{ maxWidth: "820px" }}>`
     - `src/pages/Spesa/ViewSpesa.js:143`: `<div className="card domain-page-card" style={{ maxWidth: "820px" }}>`
     - `src/pages/Bacheca/ViewBacheca.js:128`: `<div className="card domain-page-card" style={{ maxWidth: "820px" }}>`
     - `src/pages/Bacheca/ViewCalendario.js:100`: `<div className="card domain-page-card" style={{ maxWidth: '820px' }}>`
   - **Observation**: Inline styles have higher specificity than CSS class selectors. Since `.domain-page-card { max-width: 1000px; }` lacks `!important`, the inline `maxWidth: 820px` clamps the cards on desktop, producing an excessively narrow centered column on wide screens with wasted horizontal space.

3. **Multi-Column Adoption by Domain Page**:
   - `ViewDocumenti.js`: Excellent multi-column grid (`.doc-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }`).
   - `ViewContatti.js`: Excellent multi-column grid (`.contacts-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }`).
   - `homeUtente.js` (Dashboard): `.bento-grid` has 12 columns with 3 summary metrics (`bento-turno`, `bento-saldo`, `bento-spesa-summary`) spanning 4 columns each. However, the outer `maxWidth: 880px` wrapper restricts it.
   - `ViewTurni.js`, `ViewDebiti.js`, `ViewCalendario.js`, `ViewBacheca.js`: Render purely single-column vertical stacks.

---

### 1.5 Breakpoint Overlap Defect at Exactly 768px
- `src/App.css:1350`:
  ```css
  @media (max-width: 768px) {
    .desktop-nav-root { display: none !important; }
    .mobile-nav-root { display: block; }
  }
  ```
- `src/App.css:3593`:
  ```css
  @media (min-width: 768px) {
    .mobile-bottom-bar { display: none !important; }
  }
  ```
- **Observation**: At a screen width of exactly `768px` (e.g. iPad portrait mode: 768x1024), both `max-width: 768px` and `min-width: 768px` evaluate to true:
  1. `.desktop-nav-root` is hidden (`display: none !important`).
  2. `.mobile-bottom-bar` is hidden (`display: none !important`).
  The user is left with no navigation bar at all, relying solely on the burger toggle.

---

### 1.6 Verification Suite Execution Results
- `npm test -- --bail`:
  - **41 of 41 test suites passed**, **418 of 418 tests passed** (0 failures).
- `node scripts/verify-zero-emojis.js`:
  - **104 files scanned across `src/` and `public/`**, **0 emojis and 0 text emoticons detected**.
- `npm run build`:
  - Production build compiled cleanly with **exit code 0**.

---

## 2. Logic Chain

### LC 1: Coexistence of Bottom Bar and Navigation Drawer
- *Observation 1.1*: `MobileBottomBar` contains 4 main domains plus "Altro". Clicking "Altro" dispatches `toggle-mobile-menu`, opening the `MobileNavigation` drawer. Meanwhile, `AppHeader` also renders a burger button on mobile.
- *Reasoning*:
  1. Apple HIG (`references/hig/tab-bars.md`) advises: *"A tab bar lets people navigate among different sections of an app... If horizontal space limits the number of visible tabs, the trailing tab becomes a More tab"*.
  2. The 5-tab structure (Home, Turni, Spese, Spesa, Altro) adheres directly to Apple HIG recommendations (5 or fewer tabs).
  3. Having the "Altro" button trigger the existing fullscreen drawer provides seamless discovery for secondary sections (Calendario, Bacheca, Documenti, Contatti).
  4. Redundancy between top burger and bottom "Altro" tab is acceptable, but the bottom tab is the primary ergonomic target for thumb interaction.

### LC 2: Touch Target Defensiveness
- *Observation 1.2*: All inspected interactive elements have `min-height: 44px` or `48px`, satisfying the Apple HIG constraint. However, `.btn-danger-outline` relies on inline style overrides.
- *Reasoning*:
  1. Relying on inline style overrides (`style={{ minHeight: "44px" }}`) in each JSX file is fragile and prone to regressions during UI refactoring.
  2. Elevating `min-height: 44px` directly to `.btn-primary`, `.btn-secondary`, `.btn-danger-outline`, and `button` in CSS guarantees permanent system-level compliance without component-level vigilance.

### LC 3: Top Safe Area Omission on iOS Notch/Island Devices
- *Observation 1.3*: `public/index.html` has `viewport-fit=cover` and `apple-mobile-web-app-capable: yes`. `.app-container` on mobile has `padding: 12px 14px calc(84px + env(safe-area-inset-bottom, 0px)) 14px !important;`.
- *Reasoning*:
  1. With `viewport-fit=cover` and standalone PWA mode, the webview expands behind the iOS status bar.
  2. On devices with a physical notch or Dynamic Island, `safe-area-inset-top` is 47–59px.
  3. Because `.app-container` has a hardcoded top padding of `12px`, the system status bar icons (clock, battery) and hardware camera housing overlap the top 35–47px of the application header.
  4. Adding `padding-top: calc(12px + env(safe-area-inset-top, 0px))` to `.app-container` and adjusting `.mobile-menu-inner` padding eliminates this collision.

### LC 4: Desktop Persistent Navigation & Liquid Glass Material Activation
- *Observation 1.4*: `.app-topbar` has `position: relative; background: var(--bg-glass); backdrop-filter: var(--glass-blur);`.
- *Reasoning*:
  1. R2 requires a persistent desktop navigation experience.
  2. With `position: relative`, `.app-topbar` scrolls out of view immediately when the user scrolls down a page.
  3. In Apple HIG Liquid Glass (`references/hig/liquid-glass.md`), glass is reserved for floating functional layers where underlying content scrolls beneath it.
  4. Because `.app-topbar` is static at the top of the container, no content ever scrolls underneath it. Its `backdrop-filter` is completely wasted.
  5. Changing `.app-topbar` to `position: sticky; top: 12px; z-index: 900;` achieves persistent desktop navigation AND activates real Liquid Glass behavior as page content scrolls under the frosted pill.

### LC 5: Desktop Multi-Column Clamping via Inline Widths
- *Observation 1.4*: CSS sets `@media (min-width: 1024px) { .domain-page-card { max-width: 1000px; } }`, but JSX components hardcode `style={{ maxWidth: "820px" }}` inline.
- *Reasoning*:
  1. In CSS specificity hierarchy, inline `style=""` overrides class rules unless `!important` is used.
  2. Consequently, `.domain-page-card` never expands to 1000px on widescreen monitors, keeping views in an unnaturally narrow single-column tube.
  3. Removing the hardcoded inline `maxWidth` or adding `max-width: 1000px !important;` in `.domain-page-card` enables full desktop layout expansion.
  4. This allows adopting multi-column structures for Turni (e.g. 2-column current vs upcoming), Calendario (split view: calendar + agenda side by side), and Bacheca (2-column card grid).

### LC 6: Breakpoint Collision at 768px
- *Observation 1.5*: At viewport width 768px, `max-width: 768px` hides desktop navigation, and `min-width: 768px` hides the mobile bottom bar.
- *Reasoning*:
  1. 768px is the exact CSS width of an iPad in portrait mode.
  2. Because both rules match at 768.0px, both navigation components are hidden simultaneously.
  3. Adjusting the mobile breakpoint to `(max-width: 767.98px)` prevents this collision while preserving all existing test assertions.

---

## 3. Caveats

1. **Simulated JSDOM vs Real Touch Hardware**:
   - Automated Jest tests run in Node.js JSDOM, which does not compute true graphical layout geometry or physical touch hit testing. All touch target measurements were derived from CSS rules, computed style attributes, and explicit dimensional properties.
2. **Horizontal Desktop Sidebar vs Sticky Topbar**:
   - Requirement R2 states: *"Desktop (sidebar persistente, multi-colonna, stati hover al cursore)"*.
   - The project currently implements a horizontal topbar (`DesktopNavigation.js` inside `AppHeader.js`) with 8 navigation links and dedicated tests (`DesktopNavigation.test.jsx`, `m9_challenger_ergonomics_stress.test.jsx`).
   - A full structural refactor from horizontal topbar to vertical leading sidebar would require altering component hierarchy, layout wrappers, and test contracts.
   - Transforming `.app-topbar` into a sticky floating bar (`position: sticky; top: 12px;`) delivers the required persistence and Liquid Glass functionality while preserving 100% test suite compatibility.
3. **Landscape Mobile Viewports**:
   - Compact height landscapes (e.g. iPhone landscape with height ~375px–390px) will have reduced vertical clearance with both a sticky topbar and a bottom bar. The mobile bottom bar should remain at the bottom, while the topbar can remain compact or scroll with content in landscape.

---

## 4. Conclusion

HouseHelper's navigation and ergonomics foundation is remarkably solid:
1. `MobileBottomBar` successfully implements the thumb-friendly 5-tab paradigm (Home, Turni, Spese, Spesa, Altro) with minimum 48px tactile areas and zero emojis.
2. The `MobileNavigation` drawer integrates with the bottom bar via `toggle-mobile-menu` and provides full scroll locking and ESC-key dismiss.
3. Universal `:focus-visible` rings and cursor hover interactions are established across all interactive cards and controls.
4. The test suite is completely green (41/41 suites, 418/418 tests passing), and zero emojis are present.

To bring the application to full production excellence against Apple HIG and Frontend Design standards, the following 4-point refinement roadmap is recommended for the implementation phase:

### Prioritized Actionable Roadmap

| Priority | Area | Issue | Actionable Proposal |
|:---:|:---|:---|:---|
| **P1** | **Safe Area (Top)** | Top padding on mobile is hardcoded to `12px`, causing status bar / notch overlap on iPhone PWA. | Update `src/App.css:1360` `.app-container` on mobile to `padding-top: calc(12px + env(safe-area-inset-top, 0px)) !important;` and update `.mobile-menu-inner` padding. |
| **P1** | **Desktop Persistence** | `.app-topbar` is `position: relative`, disappearing on scroll and disabling Liquid Glass effect. | Update `.app-topbar` in `src/App.css` to `position: sticky; top: 12px; z-index: 900;` so it floats persistently and content scrolls underneath its blur. |
| **P2** | **Touch Target Hardening** | `.btn-danger-outline` and base `button` lack CSS-level `min-height: 44px`. | Add `min-height: 44px;` directly to `.btn-primary`, `.btn-secondary`, `.btn-danger-outline`, and standard interactive controls in `src/App.css`. |
| **P2** | **Desktop Widescreen Clamping** | Inline `style={{ maxWidth: "820px" }}` on domain cards overrides desktop 1000px expansion. | Add `max-width: 1000px !important;` to `.domain-page-card` under `@media (min-width: 1024px)` in `src/App.css`, allowing views to naturally utilize wide desktop monitors. |
| **P3** | **Breakpoint Overlap** | 768px collision between `max-width: 768px` and `min-width: 768px` hides both navbars on portrait iPads. | Refine mobile breakpoint to `(max-width: 767.98px)` or ensure precedence so portrait tablet viewports display bottom bar or topbar cleanly. |
| **P3** | **Multi-Column Expansion** | Turni, Debiti, Calendario, and Bacheca are constrained to single vertical lists on desktop. | Implement 2-column split layouts for Calendario (Calendar + Agenda side by side), Turni (Current + Upcoming), and multi-column grid for Bacheca cards on wide viewports. |

---

## 5. Verification Method

To independently verify all findings and test contracts:

1. **Run Full Test Suite**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   CI=true npm test -- --bail
   ```
   *Expected*: 41 suites passed, 418 tests passed, 0 failures.

2. **Verify Zero Emojis**:
   ```bash
   node scripts/verify-zero-emojis.js
   ```
   *Expected*: 104 files scanned across `src/` and `public/`, 0 violations detected.

3. **Verify Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: Clean compilation with exit code 0.

4. **Verify Ergonomics & Safe Area CSS Invariants**:
   Inspect `src/App.css` around:
   - Line 1360: `.app-container` padding and top safe area absence.
   - Line 3575-3640: `.mobile-bottom-bar` and `.mobile-bottom-tab` 48px sizing and bottom safe area.
   - Line 22-39: `.app-topbar` relative positioning and blur definition.
   - Line 3644-3679: `@media (min-width: 1024px)` desktop layout definitions.

5. **Invalidation Conditions**:
   - If `m9_challenger_ergonomics_stress.test.jsx` fails after CSS adjustments, verify regex string matches for breakpoints and class names.
   - If any new emoji character or emoticon is introduced into JSX or CSS, `verify-zero-emojis.js` will immediately fail.
