# Scope: Milestone M6 — Household Document Management & Cross-Device Ergonomics

## Architecture
- **Firebase Storage & Rules**:
  - `storage.rules`: Multi-tenant household access control scoped strictly to `casaId`. Only authenticated members belonging to `casaId` can read, upload, and delete documents.
  - File path structure: `case/{casaId}/documenti/{documentId}/{filename}` or metadata in Firestore `case/{casaId}/documenti` with storage file references.
- **UI Components**:
  - `src/pages/Documenti/ViewDocumenti.js`: Dedicated page for listing, uploading, viewing, categorizing, and deleting house documents (e.g., rental contracts, utility bills, appliance warranties, receipts).
  - Routing: Register `/documenti` in `src/App.js` with `ProtectedRoute` and `HouseGuard`.
  - Navigation: Add navigation entry for "Documenti" to `src/components/DesktopNavigation.js` and `src/components/MobileNavigation.js` using FontAwesome icons (`fas fa-file-alt` or `fas fa-folder-open`) and zero emojis.
  - Non-blocking feedback: Integrate `Toast` notifications (`showToast`) and `ConfirmModal` (`showConfirm`) for deletions and alerts.
- **Cross-Device Ergonomics**:
  - Mobile: Touch targets >= 44px, bottom-sheet/drawer comfort, responsive form controls.
  - Desktop: Multi-column dashboard, spacious layout, keyboard accessibility.
- **Testing & Verification**:
  - Mock Firebase Storage in `src/test/mockFirebase.js` (`ref`, `uploadBytes`, `getDownloadURL`, `deleteObject`, `listAll`, etc.).
  - Automated unit and integration tests for document management flows.
  - Verification scripts: `scripts/verify-zero-emojis.js`, `scripts/check-circular.js`, `scripts/audit-secrets.js`.
  - 100% test pass rate (`npm test -- --watchAll=false`) and clean build (`npm run build`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Firebase Storage Rules | Secure storage rules scoped strictly to `casaId` for authenticated members | M6 | ORIGINAL_REQUEST §R1 |
| 2 | Documents View (`ViewDocumenti.js`) | Document list, upload, view, download, categorize, delete | M6 | ORIGINAL_REQUEST §R1 |
| 3 | Route & Navigation Integration | Register route in `App.js`, add nav items in `DesktopNavigation.js` & `MobileNavigation.js` | M6 | ORIGINAL_REQUEST §R1 |
| 4 | Non-Blocking Feedback & Icons | Use `Toast`, `ConfirmModal`, and zero-emoji FontAwesome vector icons | M6 | ORIGINAL_REQUEST §R1 |
| 5 | Mock Firebase Storage Harness | In-memory storage mock in `mockFirebase.js` for headless deterministic testing | M6 | ORIGINAL_REQUEST §R1 |
| 6 | Automated Document Tests | Unit & integration tests for upload, categorization, retrieval, and access control | M6 | ORIGINAL_REQUEST §R1 |
| 7 | Cross-Device Ergonomics | Touch targets >= 44px, mobile drawer comfort, desktop widescreen multi-column layouts | M6 | ORIGINAL_REQUEST §R2 |
| 8 | Final Quality Verification | 0 emojis, 0 circular dependencies, 0 secrets, 100% test pass, clean build | M6 | ORIGINAL_REQUEST §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M6.1 | Technical Exploration | Explore codebase, storage rules, navigation, mockFirebase, and ergonomics requirements | none | DONE |
| M6.2 | Implementation | Implement storage rules, ViewDocumenti, navigation, mock Firebase storage, ergonomics, and tests | M6.1 | DONE |
| M6.3 | Review & Challenge | Multi-agent code review, stress testing, and adversarial challenge | M6.2 | DONE |
| M6.4 | Forensic Audit & Final Gate | Integrity audit, verification script execution, final build & test validation | M6.3 | DONE |

## Interface Contracts
### Storage Service ↔ ViewDocumenti
- Upload function / Firebase Storage API:
  - File uploaded to `case/{casaId}/documenti/...`
  - Document metadata stored with `{ nome, categoria, dataCaricamento, caricatoDa, url, dimensione, casaId }`
- Categorization options:
  - Contratto (Rental contract), Bollette (Utility bills), Garanzie (Warranties), Ricevute (Receipts), Altro (Other)
### Navigation ↔ App Router
- Route: `/documenti` guarded by `ProtectedRoute` and `HouseGuard`
- Nav item: Label "Documenti", Icon `fas fa-file-lines` or `fas fa-folder-open`, active state tracking
