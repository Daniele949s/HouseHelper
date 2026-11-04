# Dispatch

## 2026-11-03T14:38:27Z
Implement Milestone M6 for HouseHelper to deliver production-ready code and achieve final project completion: implement household document management with Firebase Storage, optimize cross-device ergonomics, and pass all verification checks.

Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper
Integrity mode: development

## Verification Resources
- `scripts/verify-zero-emojis.js`
- `scripts/check-circular.js`
- `scripts/audit-secrets.js`
- `src/test/mockFirebase.js`

## Requirements

### R1. Household Document Management with Firebase Storage
Enable household members to upload, view, download, categorize, and delete house documents (e.g. rental contracts, utility bills, appliance warranties, receipts) scoped strictly to `casaId`. Implement storage security rules in `storage.rules` ensuring only authenticated users belonging to `casaId` can access/upload files. Add dedicated Documents page/component (`src/pages/Documenti/ViewDocumenti.js`), register route in `src/App.js`, and add navigation entry to `DesktopNavigation.js` and `MobileNavigation.js`. Integrate with the non-blocking feedback system (`Toast`, `ConfirmModal`) and zero-emoji FontAwesome vector iconography. Add mock Firebase Storage support in `src/test/mockFirebase.js` and author automated unit/integration tests for document upload and retrieval.

### R2. Advanced Cross-Device Ergonomics Optimization
Optimize mobile ergonomics with touch-optimized targets (>= 44px), bottom-sheet/drawer comfort, and responsive form controls. Optimize desktop ergonomics with multi-column dashboard, spacious table/card layouts, and keyboard accessibility.

### R3. Final Quality Verification
Ensure all automated verification checks pass cleanly with zero violations: verify zero emojis/emoticons across all files, zero circular dependencies, zero secrets across repository and git history, 100% pass rate on test suites, and clean production build compilation.

## Acceptance Criteria

### Household Document Management
- [ ] Household members can upload, view, download, categorize, and delete house documents scoped strictly to their `casaId`.
- [ ] `storage.rules` restricts file read and write operations strictly to authenticated members belonging to the respective `casaId`.
- [ ] Dedicated Documents page/component `src/pages/Documenti/ViewDocumenti.js` is implemented and routed in `src/App.js`.
- [ ] Navigation entries for Documents are added to `DesktopNavigation.js` and `MobileNavigation.js`.
- [ ] Document management flows integrate with `Toast` non-blocking notifications, `ConfirmModal` confirmations, and FontAwesome vector icons with zero emojis.
- [ ] Mock Firebase Storage support is added to `src/test/mockFirebase.js`, with automated unit and integration tests passing for document upload, retrieval, and access control.

### Cross-Device Ergonomics
- [ ] Mobile UI elements provide touch targets >= 44px, bottom-sheet/drawer navigation, and responsive form controls.
- [ ] Desktop UI provides multi-column dashboard layout, spacious table/card views, and keyboard accessibility.

### Final Quality Verification
- [ ] `node scripts/verify-zero-emojis.js` exits with 0 violations.
- [ ] `node scripts/check-circular.js` exits with 0 cycles.
- [ ] `node scripts/audit-secrets.js` exits with 0 secrets.
- [ ] `npm test -- --watchAll=false` passes with 100% test pass rate.
- [ ] `npm run build` completes with 0 errors.
