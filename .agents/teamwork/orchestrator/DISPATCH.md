## 2026-11-02T09:32:25Z
From: 8197c1ee-026e-40b9-afd7-65de83979823 (Parent Sentinel)

Modernize House Helper into a competitive, production-ready household management application with a completely refreshed UI/UX, while resolving existing architectural technical debt. Do not use emoticons or emojis anywhere in the user interface or codebase.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

Reference material:
- Knowledge graph and architecture report at `/home/daniele949/Desktop/Cose/HouseHelper/househelper/graphify-out/` (`GRAPH_REPORT.md`, `graph.json`, `graph.html`)
- Tech stack: React 19 (`react@^19.2.3`), Firebase (`firebase@^12.14.0`), React Router, Create React App setup

## Requirements

### R1. UI/UX Modernization and Competitive Design Overhaul
Redesign and modernize the user interface across all application pages and components, including Authentication (`src/pages/Autenticazione/`), Cleaning Shifts / Chores (`src/pages/TurniPulizia/`), Debts & Expenses (`src/pages/Debiti/`, `src/pages/Spesa/`), Bulletin Board & Calendar (`src/pages/Bacheca/`), and feedback/mascot components (`src/components/MiniGuy.js`, `src/components/Celebration.js`, `src/components/InteractiveMascot.js`). Deliver a modern, polished, and responsive interface suitable for daily household use.

### R2. Strict Prohibition on Emoticons and Emojis
DO NOT USE EMOTICONS / EMOJIS anywhere in the UI or codebase. All icons, status indicators, and graphical elements must use professional iconography (such as vector or SVG icons) rather than text emoticons or Unicode emojis. Any existing emoticons or emojis across views and component files must be removed or replaced.

### R3. Codebase Architecture and Technical Debt Cleanup
Refactor the codebase architecture to resolve the 17 circular import cycles centered around `src/App.js` and page components. Clean up unused legacy template files and disparate styling in `css_template/`, consolidating styles without breaking active application functionality.

### R4. Automated Verification and Build Integrity
Provide automated tests and verification checks (including component/unit tests and build verification) ensuring that all modernized pages load, core user flows remain functional, zero emoticons/emojis exist in rendered components, and the application builds cleanly without errors or circular import cycles.

## Acceptance Criteria

### UI/UX & Design Integrity
- [ ] All primary views (Authentication, TurniPulizia, Debiti, Spesa, Bacheca, Calendario) render with the modernized visual design and responsive layout.
- [ ] Zero emoticons or Unicode emojis are present in any user-facing component or rendered UI element.
- [ ] An automated scan or test script confirms zero emoji or emoticon characters in rendered text or JSX literals in `src/`.

### Architectural & Build Verification
- [ ] The application compiles cleanly with `npm run build` with zero build errors.
- [ ] Circular dependency analysis confirms zero circular import cycles between `src/App.js` and page modules.
- [ ] Legacy assets in `css_template/` are cleaned up, with no orphaned styles or broken imports in active components.

### Automated Testing
- [ ] Automated tests run via `npm test` or a dedicated test runner pass with zero failures.
- [ ] Automated tests verify key user interaction flows across authentication, chore management, and expense tracking.

## 2026-11-03T12:36:05Z
From: 5267c1e4-9392-4155-a2bd-cd6d59d1ceaa (Parent Sentinel)

Continue HouseHelper project execution to deliver production-ready code: verify and complete Milestones M3 and M4 (achieving 100% test pass across 4 tiers), then execute Phase 2 covering application security hardening, public repository audit, household document management with Firebase Storage, and advanced cross-device ergonomics optimization.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

## Reference Material
- Architecture blueprint: /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
- Verification scripts: scripts/verify-zero-emojis.js, scripts/check-circular.js

## Requirements

### R1. Milestone M3 Verification and Gate Completion
Execute the automated verification checks (`node scripts/verify-zero-emojis.js`, `node scripts/check-circular.js`, `npm run build`, and `CI=true npm test -- --watchAll=false`) on the modernized domain pages (`src/pages/Autenticazione/`, `SceltaCasa.js`, `homeUtente.js`, `TurniPulizia/`, `Debiti/`, `Spesa/`, `Bacheca/`), and complete M3 gate review and audit verification.

### R2. Milestone M4 100% Test Pass
Complete Milestone M4, ensuring a 100% test pass rate across all 4 test tiers with zero regressions, verifying that all unit, integration, and UI tests pass reliably.

### R3. Application Security Hardening and Public Repository Audit
Conduct deep application security hardening including auditing and updating `firestore.rules` to enforce strict household-scoped data access, anti-tamper validation, and input sanitization. Audit the public repository and git history to scan for and eliminate any sensitive information, credentials, or API keys.

### R4. Household Document Management and Cross-Device Ergonomics
Implement household document management using Firebase Storage to allow household members to upload, view, and organize documents (such as rent contracts, utilities, receipts) scoped strictly to their household. Optimize interface ergonomics tailored for mobile touchscreens and desktop widescreens while maintaining the zero-emoji design standard.

## Acceptance Criteria

### Milestone M3 Verification
- [ ] `node scripts/verify-zero-emojis.js` exits with code 0 (zero emojis across all codebase files).
- [ ] `node scripts/check-circular.js` exits with code 0 (zero circular dependencies).
- [ ] `npm run build` completes with exit code 0 and zero build errors.
- [ ] Milestone M3 gate verification is completed and approved.

### Milestone M4 Test Suite
- [ ] `CI=true npm test -- --watchAll=false` passes with 100% success across all 4 tiers with zero failing tests.
- [ ] Zero regressions are introduced in existing application flows.

### Phase 2 Security Hardening & Repository Audit
- [ ] `firestore.rules` contains rules restricting read/write access strictly to authenticated members of the respective household.
- [ ] Rules enforce anti-tamper validation and data sanitization on write operations.
- [ ] Repository files and git commit history scan confirms zero sensitive credentials, secrets, or private API keys.

### Phase 2 Document Management & Ergonomics
- [ ] Household members can upload, view, and organize house documents (rent contracts, utilities, receipts) stored in Firebase Storage.
- [ ] Document access is restricted strictly to members of the corresponding household.
- [ ] Interface layouts and interactions are optimized for mobile touch targets and desktop wide displays without any emojis or emoticons.
- [ ] Automated tests cover document upload, retrieval, and access control flows.

## 2026-11-03T13:02:44Z
From: 5267c1e4-9392-4155-a2bd-cd6d59d1ceaa (Parent Sentinel)

URGENT INSTRUCTION FROM PARENT:
M4 is officially cleared and passed. The user is asking why we are still at M4. Please immediately transition to Phase 2:
1. Deep application security hardening (firestore.rules audit, data sanitization, anti-tamper).
2. Public repo audit (scan git history and code for any secrets/credentials/keys).
3. Household document management with Firebase Storage (upload, view, organize documents).
4. Advanced mobile and desktop ergonomics optimization.

Execute Phase 2 work immediately.
