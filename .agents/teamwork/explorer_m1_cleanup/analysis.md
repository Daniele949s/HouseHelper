# Technical Analysis: Milestone 1 Legacy Asset Cleanup Specification

**Agent**: `explorer_m1_cleanup` (`teamwork_explorer`)  
**Date**: 2026-11-02  
**Target Repository**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper`  
**Scope**: Deletion and Cleanup Specification for `css_template/`, `src/models/modelloTurno.js`, and Orphaned Code/Styles

---

## Executive Summary

This investigation provides the definitive specification for the safe removal of legacy assets in Milestone 1:
1. **`css_template/` Directory**: Contains 76 files across 23 subdirectories (totaling 100 entries / 99 child items, 3.9 MB). Static analysis, AST dependency tracing, and build verification confirm that **zero active files** in `src/` or `public/` import or load anything from `css_template/`. All necessary design patterns, fonts, images, and CSS rules have previously been consolidated into `public/webfonts/`, `public/bg_images/`, `src/App.css`, `src/index.css`, and native React components.
2. **`src/models/modelloTurno.js`**: A 9-line file that is **completely unimported and unreferenced** across the codebase. Furthermore, it contains a fatal runtime bug (`DataTypes is not defined` from an unimported ORM snippet) which would crash if evaluated. It is the sole file in `src/models/`. Both the file and its parent folder can be deleted immediately.
3. **Orphaned Styles & Broken Imports**: An automated AST import resolution across all 46 files in `src/` confirmed **0 broken relative or external imports**. All 3 stylesheets (`App.css`, `index.css`, `HouseAnalytics.css`) are actively imported. All CSS classes in `src/App.css` ported from templates are actively referenced by UI views. An additional orphaned component was identified: `src/components/ProtectedRoute.js` (superseded by `src/components/RouteGuards.js`).
4. **Safety & Zero Regression**: Production build (`npm run build`) and test suite (`npm test -- --watchAll=false`, 21 tests) pass with 100% success. Removing `css_template/` and `src/models/` will eliminate 3.9 MB of dead weight with zero breaking changes.

---

## 1. Audit of `css_template/`

### 1.1 Physical Inventory and Directory Layout
- **Path**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/css_template/`
- **Total Size on Disk**: 3.9 MB (`3,9M`)
- **Total Files**: 76 files
- **Total Subdirectories**: 23 subdirectories
- **Total Entries**: 100 filesystem nodes (1 root + 23 subdirs + 76 files = 99 items inside `css_template`)

#### Detailed Directory Breakdown
| Directory | File Count | Key File Types | Size / Contents Description |
|---|:---:|---|---|
| `css_template/background/` | 2 | `.css`, `.html` | Background gradient prototype (`background.css`, `background.html`) |
| `css_template/calendar/` | 3 | `.html`, `.js`, `.scss` | SCSS & Vanilla JS calendar prototype |
| `css_template/GeneralTemplate/` | 42 | `.html`, `.css`, `.js`, `.scss`, `.eot`, `.svg`, `.ttf`, `.woff`, `.woff2`, `.jpg`, `.txt` | HTML5/Sass template bundle (`assets/css`, `assets/js`, 19 SASS files, 15 FontAwesome webfonts, 3 JPG images: `bg01.jpg`, `bg02.jpg`, `bg03.jpg`) |
| `css_template/graphs/` | 3 | `.css`, `.html`, `.js` | Morphing SVG graph animations (`graphs.js`, `graphs.css`) |
| `css_template/graphs2/` | 3 | `.css`, `.html`, `.js` | Donut chart SVG prototype |
| `css_template/guy/` | 2 | `.html`, `.scss` | SCSS keyframe sprite animation prototype |
| `css_template/list/` | 2 | `.css`, `.html` | Expandable task list CSS prototype |
| `css_template/MegaMenu/` | 3 | `.css`, `.html`, `.js` | Desktop mega-dropdown menu prototype |
| `css_template/MobileMenu/` | 3 | `.js`, `.pug`, `.scss` | Off-canvas mobile menu prototype |
| `css_template/progressStep/` | 2 | `.css`, `.html` | Multi-step progress bar styling |
| `css_template/scrollbar/` | 3 | `.css`, `.html`, `.js` | Top-reading progress scroll indicator |
| `css_template/subscriptionForm/` | 4 | `.css`, `.html`, `.js`, `.txt` | Animated interactive face mascot |
| `css_template/themeChanger/` | 3 | `.html`, `.js`, `.scss` | Lightsaber toggle theme switch |

### 1.2 Import & Dependency Audit
- **Grep in `src/` and `public/`**:
  ```bash
  grep -rn "css_template" src/ public/ package.json
  ```
  **Result**: Exactly 3 lines matched, all inside `src/App.css` comments:
  - `src/App.css:619`: `/* INTERACTIVE LIST (From css_template/list) */`
  - `src/App.css:707`: `/* CALENDAR (From css_template/calendar + react-calendar custom) */`
  - `src/App.css:946`: `/* MOBILE MENU NAVIGATION (Directly adapted from css_template/MobileMenu) */`
  Zero active code imports or HTML `<link>` / `<script>` tags exist anywhere in `src/` or `public/`.
- **CRA Webpack Isolation**:
  Create React App enforces `ModuleScopePlugin` inside `react-dev-utils`. Any relative import attempting to escape `src/` (e.g., `import '../../css_template/...'`) is disallowed and would trigger a fatal compile error.
- **Git Tracking Status**:
  Although `css_template/` is listed in `.gitignore:28` (`# design templates and scratch assets / css_template/`), all 76 files were committed prior to gitignore additions and are currently tracked in git (`git ls-files css_template/` returns 76 files). Therefore, removal must use `git rm -r css_template` so git tracks the deletion.

### 1.3 Preservation of Ported Assets
Audit confirmed that zero runtime assets will be lost upon deleting `css_template/`:
- **Webfonts**: FontAwesome webfonts (15 files) exist independently at `public/webfonts/` and are loaded via `public/fontawesome.min.css` from `public/index.html:25`.
- **Images**: The 3 background images (`bg01.jpg`, `bg02.jpg`, `bg03.jpg`) exist independently in `public/bg_images/` and are consumed dynamically by `src/components/BackgroundSlideshow.js`.
- **Styles**: All necessary styling rules have already been converted into clean standard CSS classes within `src/App.css` and `src/components/HouseAnalytics.css`.
- **Scripts & Components**: All animation and interactive logic from the vanilla JS templates was ported to native React state and components:
  - `InteractiveMascot.js` (from `subscriptionForm`)
  - `MiniGuy.js` + `guyFramesData.json` (from `guy`)
  - `HouseAnalytics.js` (from `graphs`, `graphs2`, `progressStep`)
  - `MobileNavigation.js` (from `MobileMenu`)
  - `ScrollProgressBar.js` (from `scrollbar`)
  - `ThemeToggle.js` (from `themeChanger`)
  - `AppFooter.js` (from `GeneralTemplate`)

---

## 2. Inspection of `src/models/modelloTurno.js`

### 2.1 File Content
File path: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/src/models/modelloTurno.js` (9 lines, 192 bytes):
```javascript
const modelloTurno = {
    nomi : [],
    data : DataTypes.DATE,
    luoghi : [],
    procedura : [],
    fasciaOraria: DataTypes.ARRAY(DataTypes.STRING)
  };
  
  export default modelloTurno;
```

### 2.2 Findings
1. **Zero Inbound References**:
   - `grep -rn "modelloTurno" src/ public/` yields only lines 1 and 9 of `modelloTurno.js` itself.
   - `grep -rn "models" src/ public/` yields zero matches.
   - Graphify AST extraction confirms: `modelloTurno` has only 1 edge in `graph.json`: `modelloTurno.js --contains modelloTurno`. Zero callers, zero importers.
2. **Fatal Runtime Bug**:
   `DataTypes` is neither defined nor imported. If any module imported `modelloTurno.js`, Node.js / Webpack would immediately throw `ReferenceError: DataTypes is not defined` during module initialization.
3. **Data Model Architecture**:
   The active cleaning shifts domain (`src/pages/TurniPulizia/viewTurni.js`, `aggiuntaTurno.js`, `modificaTurno.js`) uses direct Firebase Firestore documents with schema: `{ data, fasciaOraria, luoghi, nomi, procedura, completato, casaId }`. Firestore handles documents as plain JavaScript objects and does not rely on ORM models.
4. **Parent Directory**:
   `src/models/` contains no other files (`ls src/models/` contains only `modelloTurno.js`). Deleting `modelloTurno.js` empties `src/models/`. Therefore, the entire directory `src/models/` should be deleted.

---

## 3. Audit of Styles and Imports Across `src/`

### 3.1 Relative and Module Import Verification
A complete recursive AST import resolution script inspected all 46 files in `src/`:
- **Scanned**: All 39 `.js` and `.jsx` files.
- **Resolved**: All relative `import` and `export ... from` statements.
- **Broken Imports Count**: **0**
- **Production Build (`npm run build`)**: Exited with code 0.
- **Unit Test Runner (`npm test -- --watchAll=false`)**: 3 test suites passed, 21 tests passed, 0 failures.

### 3.2 Stylesheet Audit
There are exactly 3 stylesheet files in `src/`:
1. `src/index.css` (200 lines): Imported by `src/index.js:3`. Defines CSS variables (`--bg-main`, `--color-primary`, `--border-color`), base CSS reset, typography, and dynamic background animations.
2. `src/App.css` (1,294 lines): Imported by `src/App.js:3`. Houses core layout, bento grids, card styles, calendar overrides, buttons, form controls, footer, and mobile drawer styles.
   *(Note: Redundant imports of `App.css` across the 17 page components will be decoupled as part of M1 Feature 1 to resolve AST circular import edges).*
3. `src/components/HouseAnalytics.css` (445 lines): Imported by `src/components/HouseAnalytics.js:3`. Provides styling for KPI boxes, SVG donut charts, horizontal bar charts, and grocery step progress cards.
**Conclusion**: Zero orphaned `.css` or `.scss` files exist in `src/`.

### 3.3 Identification of Dead Code: `src/components/ProtectedRoute.js`
During reachability analysis starting from `src/index.js` and test entry points, an unused component was discovered:
- **File**: `src/components/ProtectedRoute.js` (10 lines, 308 bytes)
- **Content**:
  ```javascript
  import React from 'react';
  import { Navigate, Outlet } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';
  
  const ProtectedRoute = () => {
      const { currentUser } = useAuth();
      return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
  };
  
  export default ProtectedRoute;
  ```
- **Reason for Inactivity**:
  `src/App.js` line 18 imports route guards from `src/components/RouteGuards.js` (`HouseProtectedRoute`, `HouseSelectRoute`, `PublicOnlyRoute`). `RouteGuards.js` was introduced to enforce household membership (`userData.casaId`) in addition to Firebase user authentication.
- **Import Status**: Zero files in `src/` import `ProtectedRoute.js`.
- **Recommendation**:
  `ProtectedRoute.js` is dead legacy code. In `PROJECT.md`, it was listed under module boundaries, but in active code it is completely dormant. It can be safely deleted or kept until M2 cleanup. For M1 legacy asset cleanup, removing it prevents architectural confusion.

---

## 4. Worker Execution Specification

### 4.1 Step-by-Step Instructions for Worker
1. **Delete `css_template/` from Git**:
   Remove all 76 tracked files and the directory:
   ```bash
   git rm -r css_template
   ```
2. **Delete `src/models/modelloTurno.js` and Directory `src/models/`**:
   Remove the dead model from git and remove the empty directory:
   ```bash
   git rm src/models/modelloTurno.js
   rmdir src/models 2>/dev/null || rm -rf src/models
   ```
3. **(Optional / Recommended) Clean Historical Comments in `src/App.css`**:
   Remove mentions of `css_template` in comment headers to leave zero trace in `src/`:
   - Line 619: `INTERACTIVE LIST (From css_template/list)` -> `INTERACTIVE LIST`
   - Line 707: `CALENDAR (From css_template/calendar + react-calendar custom)` -> `CALENDAR (react-calendar custom)`
   - Line 946: `MOBILE MENU NAVIGATION (Directly adapted from css_template/MobileMenu)` -> `MOBILE MENU NAVIGATION`
4. **(Optional) Delete Dead `src/components/ProtectedRoute.js`**:
   ```bash
   git rm src/components/ProtectedRoute.js
   ```
5. **Re-synchronize Knowledge Graph**:
   Run Graphify AST updater:
   ```bash
   graphify update .
   ```
6. **Verify Build and Tests**:
   Run full verification pipeline:
   ```bash
   npm run build
   npm test -- --watchAll=false
   ```

### 4.2 Exact Bash Execution Command List
```bash
cd /home/daniele949/Desktop/Cose/HouseHelper/househelper

# 1. Remove tracked legacy assets
git rm -r css_template
git rm src/models/modelloTurno.js
rmdir src/models 2>/dev/null || rm -rf src/models

# 2. Update graphify AST
graphify update .

# 3. Verify clean build and test execution
npm run build
npm test -- --watchAll=false
```

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation / Proof of Safety |
|---|:---:|:---:|---|
| Missing CSS styles in app | Very Low (0%) | High | All styling rules were already migrated into `src/App.css` and verified in active views. |
| Missing webfonts or icons | Very Low (0%) | High | Webfonts reside in `public/webfonts/` and `public/fontawesome.min.css`. Tested with zero broken fonts. |
| Missing background imagery | Very Low (0%) | Medium | Images are already deployed in `public/bg_images/` (`bg01.jpg`, `bg02.jpg`, `bg03.jpg`). |
| Runtime ReferenceError | Very Low (0%) | High | `modelloTurno.js` was never imported. Deleting it cannot cause a runtime exception. |
| Broken Webpack / CRA bundle | Very Low (0%) | Critical | Verified via successful `npm run build` with zero dependencies on `css_template/` or `src/models/`. |
