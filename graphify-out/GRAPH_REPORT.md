# Graph Report - househelper  (2026-11-02)

## Corpus Check
- 85 files · ~428,487 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 66 file(s) not represented in the graph (top: .scss 23, .css 14, .eot 6)

## Summary
- 207 nodes · 559 edges · 17 communities (9 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project Configuration & Dependencies
- Application Shell & Layout
- Interactive Mascot & UI Feedback
- Routing & Authentication
- Subscription Form Animations
- House Analytics & Guy Animations
- Morphing SVG Graph Animations
- Web App Manifest & Metadata
- Theme Changer Logic
- Custom Scrollbar Logic
- Cleaning Shift Data Models

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 39 edges
2. `react` - 35 edges
3. `App()` - 27 edges
4. `react-router-dom` - 24 edges
5. `init()` - 20 edges
6. `firebase` - 20 edges
7. `triggerConfetti()` - 20 edges
8. `sanitizeText()` - 19 edges
9. `db` - 17 edges
10. `validateDate()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `ViewLogin()`  [EXTRACTED]
  src/App.js → src/pages/Autenticazione/viewLogin.js
- `App()` --calls--> `ViewRegistrazione()`  [EXTRACTED]
  src/App.js → src/pages/Autenticazione/viewRegistrazione.js
- `App()` --calls--> `AggiungiEvento()`  [EXTRACTED]
  src/App.js → src/pages/Bacheca/AggiungiEvento.js
- `App()` --calls--> `AggiungiNota()`  [EXTRACTED]
  src/App.js → src/pages/Bacheca/AggiungiNota.js
- `App()` --calls--> `AggiungiDebito()`  [EXTRACTED]
  src/App.js → src/pages/Debiti/AggiungiDebito.js

## Import Cycles
- 2-file cycle: `src/App.js -> src/pages/Debiti/ViewDebiti.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Bacheca/ModificaNota.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Bacheca/AggiungiNota.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/NotFound.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/SceltaCasa.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/TurniPulizia/aggiuntaTurno.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Autenticazione/viewLogin.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Debiti/AggiungiDebito.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Spesa/ViewSpesa.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Autenticazione/viewRegistrazione.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/homeUtente.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Autenticazione/homeAutenticazione.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Bacheca/AggiungiEvento.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Bacheca/ViewBacheca.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/Bacheca/ViewCalendario.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/TurniPulizia/modificaTurno.js -> src/App.js`
- 2-file cycle: `src/App.js -> src/pages/TurniPulizia/viewTurni.js -> src/App.js`

## Communities (17 total, 8 thin omitted)

### Community 0 - "Project Configuration & Dependencies"
Cohesion: 0.06
Nodes (37): browserslist, development, production, dependencies, firebase@^12.14.0, react@^19.2.3, react-calendar@^6.0.0, react-dom@^19.2.3 (+29 more)

### Community 1 - "Application Shell & Layout"
Cohesion: 0.13
Nodes (27): App(), AppHeader(), AppFooter(), BackgroundSlideshow(), IMAGES, MobileNavigation(), ProtectedRoute(), HouseProtectedRoute() (+19 more)

### Community 2 - "Interactive Mascot & UI Feedback"
Cohesion: 0.21
Nodes (16): RFC-5322, triggerConfetti(), InteractiveMascot(), googleProvider, ViewLogin(), ViewRegistrazione(), AggiungiEvento(), AggiungiNota() (+8 more)

### Community 3 - "Routing & Authentication"
Cohesion: 0.26
Nodes (10): firebase, react, react-router-dom, AuthContext, app, auth, db, firebaseConfig (+2 more)

### Community 4 - "Subscription Form Animations"
Cohesion: 0.14
Nodes (19): burstAtElement(), init(), clearErrorUI(), computeMaxOffset(), ellipseClamp(), eyeCenters(), getCaretPoint(), lookAt() (+11 more)

### Community 5 - "House Analytics & Guy Animations"
Cohesion: 0.42
Nodes (5): HouseAnalytics(), ANIMATION_SEQUENCE, MiniGuy(), HomeUtente(), safeFloat()

### Community 7 - "Morphing SVG Graph Animations"
Cohesion: 0.32
Nodes (6): buttons, Easings, makePathInterpolator(), morphPath(), setView(), svg

### Community 8 - "Web App Manifest & Metadata"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 9 - "Theme Changer Logic"
Cohesion: 0.67
Nodes (3): comp, handleClick(), interval

## Knowledge Gaps
- **3 isolated node(s):** `react-app`, `react-app/jest`, `RFC-5322`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 65 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Routing & Authentication` to `Project Configuration & Dependencies`, `Application Shell & Layout`, `Interactive Mascot & UI Feedback`, `House Analytics & Guy Animations`, `Router Testing Mocks`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `init()` (e.g. with `subscriptionForm.js` and `onLayoutChange()`) actually correct?**
  _`init()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `react-app`, `react-app/jest`, `RFC-5322` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `Project Configuration & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.059233449477351915 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `Routing & Authentication` to `Project Configuration & Dependencies`, `Application Shell & Layout`, `Interactive Mascot & UI Feedback`, `House Analytics & Guy Animations`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Application Shell & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.12612612612612611 - nodes in this community are weakly interconnected._
- **Why does `firebase` connect `Routing & Authentication` to `Project Configuration & Dependencies`, `Interactive Mascot & UI Feedback`, `House Analytics & Guy Animations`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._