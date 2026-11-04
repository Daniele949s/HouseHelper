# Handoff Report: UI Routing, Navigation, Design System, Documenti View & Cross-Device Ergonomics (Milestone M6)

**Agent**: explorer_m6_ui  
**Date**: 2026-11-03  
**Status**: COMPLETE (Read-Only Investigation)  
**Target Milestone**: M6 (Household Document Management & Cross-Device Ergonomics)  

---

## 1. Observation

### 1.1 UI Routing & Security Guards (`src/App.js` & `src/components/RouteGuards.js`)
- In `src/App.js` (lines 18–22, 77–105):
  - Route guards are imported from `./components/RouteGuards`:
    ```javascript
    import {
      HouseProtectedRoute,
      HouseSelectRoute,
      PublicOnlyRoute
    } from "./components/RouteGuards";
    ```
  - All household domain routes (`/home`, `/turni`, `/debiti`, `/spesa`, `/bacheca`, `/calendario`) are wrapped inside `<Route element={<HouseProtectedRoute />}>` (lines 78–101).
  - In `src/components/RouteGuards.js` (lines 9–21):
    ```javascript
    export function HouseProtectedRoute() {
      const { currentUser, userData } = useAuth();
      if (!currentUser) {
        return <Navigate to="/login" replace />;
      }
      if (!userData || !userData.casaId) {
        return <Navigate to="/scelta-casa" replace />;
      }
      return <Outlet />;
    }
    ```
  - In contrast, `src/components/ProtectedRoute.js` only checks `currentUser`, without verifying `userData.casaId`.
  - In `src/App.js` (line 104), fallback catch-all is registered: `<Route path="*" element={<NotFound />} />`.
  - Architecture rule (`PROJECT.md` line 22): Global styles are imported once in `src/App.js`. Individual pages must **never** import `./App.css` or `../App.css`, as that reintroduces circular import cycles verified by `scripts/check-circular.js`.

### 1.2 Navigation Systems (`DesktopNavigation.js`, `MobileNavigation.js`, `homeUtente.js`)
- In `src/components/DesktopNavigation.js`:
  - Lines 14–17: Returns `null` if user is unauthenticated or has no active household (`!currentUser || !userData || !userData.casaId`).
  - Lines 19–26: Defines the navigation array:
    ```javascript
    const navItems = [
      { label: "Dashboard", icon: "fa-home", path: "/home", end: true },
      { label: "Turni", icon: "fa-broom", path: "/turni", end: false },
      { label: "Debiti", icon: "fa-wallet", path: "/debiti", end: false },
      { label: "Spesa", icon: "fa-shopping-cart", path: "/spesa", end: false },
      { label: "Bacheca", icon: "fa-thumbtack", path: "/bacheca", end: false },
      { label: "Calendario", icon: "fa-calendar-alt", path: "/calendario", end: false },
    ];
    ```
  - Line 42 renders the icon as:
    ```jsx
    <i className={`fas ${item.icon} desktop-nav-icon`} aria-hidden="true"></i>
    ```
- In `src/components/MobileNavigation.js`:
  - Lines 44–52: Defines drawer navigation items for authenticated users:
    ```javascript
    const menuItems = currentUser
      ? [
          { label: "Dashboard", icon: "fa-home", path: "/home" },
          { label: "Turni Pulizia", icon: "fa-broom", path: "/turni" },
          { label: "Spese & Debiti", icon: "fa-wallet", path: "/debiti" },
          { label: "Lista Spesa", icon: "fa-shopping-cart", path: "/spesa" },
          { label: "Calendario Casa", icon: "fa-calendar-alt", path: "/calendario" },
          { label: "Bacheca", icon: "fa-thumbtack", path: "/bacheca" },
        ]
    ```
  - Lines 114–117: Renders `<i className={`fas ${item.icon}`}></i>`.
- In `public/fontawesome.min.css`:
  - Verified presence of FontAwesome 5 icons via regex check:
    - `.fa-folder-open` and `.fa-file-alt` exist.
    - `.fa-file-lines` (FA6) **does not exist** (returns NOT FOUND).
    - Dedicated category icons exist: `.fa-file-contract`, `.fa-file-invoice-dollar`, `.fa-shield-alt`, `.fa-receipt`, `.fa-tag`, `.fa-cloud-upload-alt`, `.fa-file-pdf`, `.fa-file-image`, `.fa-file-word`.
- In `src/pages/homeUtente.js` (lines 198–219):
  - The dashboard features a quick-access container `.bento-services` containing 5 shortcut buttons (Turni, Spese, Spesa, Calendario, Bacheca).

### 1.3 In-App Feedback System (`src/utils/feedback.js`)
- `src/utils/feedback.js` defines:
  - `showToast(message, type = 'info' | 'success' | 'warning' | 'error', duration = 3500)`
  - `showConfirm({ title, message, confirmText, cancelText, isDanger, onConfirm, onCancel })` returning `Promise<boolean>`
- Verified usage across existing pages:
  - `src/pages/Bacheca/ViewBacheca.js` (lines 100–116):
    ```javascript
    const confirmed = await showConfirm({
      title: "Elimina Avviso",
      message: "Sicuro di voler eliminare questa nota?",
      confirmText: "Elimina",
      cancelText: "Annulla",
      isDanger: true
    });
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "note", id));
      showToast("Avviso rimosso dalla bacheca.", "success");
      fetchDatiReload();
    } catch (error) {
      showToast("Errore durante l'eliminazione.", "error");
    }
    ```
  - `src/pages/TurniPulizia/viewTurni.js` (lines 56–74): Identical pattern with household verification before confirmation.

### 1.4 Design System & Ergonomics (`src/App.css` & `src/index.css`)
- In `src/index.css`:
  - Complete CSS token set defined for both light and dark themes: `--color-primary`, `--color-accent`, `--color-success`, `--color-danger`, `--color-warning`, `--bg-primary`, `--bg-secondary`, `--bg-card`, `--border-color`, `--radius-md`, `--radius-lg`, `--shadow-card`, etc.
- In `src/App.css`:
  - Mobile touch target review (against WCAG 2.5.5 / 2.5.8 >= 44px):
    - `.burger-container` (line 1032): `height: 40px; width: 40px;` — **under 44px**.
    - `.mobile-close-btn` (line 1137): `height: 38px; width: 38px;` — **under 44px**.
    - `.theme-pill-track` (line 185): `height: 30px;` — wrapper button `.theme-pill-toggle` has no explicit `min-height: 44px;` tap boundary.
    - Standard form inputs and buttons:
      ```css
      .input-group input, .input-group select, .input-group textarea {
        padding: 14px 18px; /* ~48px height, >= 44px */
      }
      .btn-primary, .btn-secondary {
        padding: 14px 28px; /* ~48px height, >= 44px */
      }
      ```
    - At `@media (max-width: 768px)` (lines 1335–1344), inputs and buttons reduce padding to `12px 14px` (~44px), but lack explicit `min-height: 44px;`.
  - Keyboard accessibility:
    - `:focus-visible` is currently only styled on `.theme-pill-toggle:focus-visible .theme-pill-track` (line 178).
    - Global interactive elements (`button`, `input`, `select`, `textarea`, `a`, `[tabindex]`) lack a unified `:focus-visible` outline.
  - Table styling:
    - There are currently zero table styles in `src/App.css`.

### 1.5 Automated Verification Scripts Baseline
- Running `node scripts/verify-zero-emojis.js` inside repo root:
  - Scanned 80 files across `src/` and `public/`.
  - 0 emoji / emoticon violations detected.
- Running `node scripts/check-circular.js`:
  - `src/App.js`: 0 cycles.
  - `src/`: 0 cycles.
- Running `node scripts/audit-secrets.js`:
  - Scanned 94 files and 14 commits.
  - 0 secrets or credentials detected.

---

## 2. Logic Chain

### 2.1 Route Registration & Guarding
1. Based on Observation 1.1, household documents are strictly scoped to an active household (`casaId`).
2. An authenticated user who has not created or joined a household (`userData.casaId` missing) must not be allowed to access household documents or Firebase Storage paths scoped to `case/{casaId}/`.
3. `HouseProtectedRoute` in `src/components/RouteGuards.js` explicitly validates both `currentUser` and `userData.casaId`, redirecting missing auth to `/login` and missing household to `/scelta-casa`.
4. Therefore, `/documenti` must be placed inside `<Route element={<HouseProtectedRoute />}>` in `src/App.js`:
   ```jsx
   {/* Gestione Documenti */}
   <Route path="/documenti" element={<ViewDocumenti />} />
   ```
5. Based on Observation 1.1 and `PROJECT.md`, `ViewDocumenti.js` must NOT import `App.css`, preventing circular import cycles.

### 2.2 Navigation Integration & Icon Selection
1. Based on Observation 1.2, desktop users navigate via `DesktopNavigation.js` inside `AppHeader.js`, and mobile users navigate via `MobileNavigation.js` drawer.
2. In `DesktopNavigation.js`, adding a 7th item (`/documenti`) requires consistent label length and icon.
3. FontAwesome verification (Observation 1.2) proved that the bundle is FontAwesome 5. `fa-file-lines` is a FA6 class and does not exist in `public/fontawesome.min.css`.
4. The icon `fa-folder-open` is available, visually distinct from `fa-file-alt` (which looks like a plain text note), and conceptually matches a shared household folder of documents.
5. Therefore:
   - In `DesktopNavigation.js`: `{ label: "Documenti", icon: "fa-folder-open", path: "/documenti", end: false }`.
   - In `MobileNavigation.js`: `{ label: "Documenti & Contratti", icon: "fa-folder-open", path: "/documenti" }`.
   - In `homeUtente.js`: Add a 6th shortcut button to `.bento-services` using `fa-folder-open`, perfectly balancing the 2-column mobile bento grid (3 rows of 2).

### 2.3 Feedback System Integration
1. Based on Observation 1.3, all user feedback in HouseHelper uses non-blocking toasts and accessible modal dialogs from `src/utils/feedback.js`.
2. Document operations involve network I/O with Firebase Storage and Firestore.
3. Deleting a document deletes both the binary object from Firebase Storage and the metadata record from Firestore.
4. Therefore:
   - Deletion must always be preceded by `showConfirm({ title: "Elimina Documento", message: "...", confirmText: "Elimina", cancelText: "Annulla", isDanger: true })`.
   - File validation failures (exceeding 15 MB, unsupported MIME types, missing document name) must trigger `showToast("...", "warning")` or `"error"`.
   - Upload and deletion successes must trigger `showToast("...", "success")`.

### 2.4 Ergonomics & Accessibility Optimizations
1. Based on Observation 1.4, mobile touch targets on key controls (`.burger-container` 40px, `.mobile-close-btn` 38px, `.theme-pill-track` 30px) fall below the 44px touch threshold specified in WCAG 2.5.5 and project requirements.
2. Increasing `.burger-container` and `.mobile-close-btn` to `min-width: 44px; min-height: 44px;` and wrapping `.theme-pill-toggle` with `min-height: 44px; min-width: 44px;` satisfies ergonomics without breaking visual appearance.
3. Responsive ergonomics for `ViewDocumenti.js`:
   - Mobile: Vertical card stack with large touch targets (action buttons >= 44px x 44px).
   - Desktop widescreen: Generous container (`max-width: var(--container-xl)` / 1100px), multi-column layout with quick upload panel and responsive document table/grid.
4. Keyboard accessibility:
   - Adding a global `:focus-visible` rule in `src/App.css` ensures all interactive controls (drag & drop dropzone, buttons, filter pills, inputs) have a crisp 2px primary focus ring when navigated with Tab.

---

## 3. Caveats

1. **Storage Mock Dependency**: `ViewDocumenti.js` relies on Firebase Storage SDK methods (`ref`, `uploadBytesResumable`, `getDownloadURL`, `deleteObject`). In-memory tests require `mockFirebase.js` to implement matching storage stubs (being handled in parallel by the storage/testing explorer).
2. **FontAwesome v5 Scope**: FontAwesome v6 icon names (e.g., `fa-file-lines`, `fa-arrow-down-wide-short`) must not be used. Only FontAwesome v5 classes present in `public/fontawesome.min.css` are valid.
3. **No Direct `App.css` Import**: Any component authored in `src/pages/Documenti/` must rely strictly on global classes and variables loaded via `src/App.js` and `src/index.css`.

---

## 4. Conclusion & Technical Specification

### 4.1 Route & Navigation Integration Plan

#### `src/App.js` Modification
```javascript
// At top imports:
import ViewDocumenti from "./pages/Documenti/ViewDocumenti";

// Inside <Route element={<HouseProtectedRoute />}>:
{/* Gestione Documenti & Contratti */}
<Route path="/documenti" element={<ViewDocumenti />} />
```

#### `src/components/DesktopNavigation.js` Modification
Add the entry to `navItems`:
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

#### `src/components/MobileNavigation.js` Modification
Add the entry to `menuItems`:
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
```

#### `src/pages/homeUtente.js` Enhancement
Add shortcut button inside `.bento-services` (lines 198–219):
```jsx
<button
  type="button"
  onClick={() => navigate("/documenti")}
  className="service-btn"
  aria-label="Gestione Documenti e Contratti"
>
  <span className="service-icon"><i className="fas fa-folder-open" aria-hidden="true"></i></span>
  <span>Documenti</span>
</button>
```

---

### 4.2 Detailed Component Specification for `src/pages/Documenti/ViewDocumenti.js`

#### Component Structure & State Architecture
- **Location**: `src/pages/Documenti/ViewDocumenti.js`
- **Imports**:
  ```javascript
  import React, { useState, useEffect, useRef, useMemo } from "react";
  import { useNavigate } from "react-router-dom";
  import { db, storage } from "../../firebase";
  import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    deleteDoc,
    serverTimestamp
  } from "firebase/firestore";
  import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
  } from "firebase/storage";
  import { useAuth } from "../../contexts/AuthContext";
  import { showToast, showConfirm } from "../../utils/feedback";
  import { sanitizeText } from "../../utils/security";
  ```
- **State Hooks**:
  - `documents`: `Array<DocumentItem>` (loaded from Firestore `documenti` where `casaId == userData.casaId`).
  - `loading`: `boolean` (initial `true`).
  - `uploading`: `boolean` (upload in flight).
  - `uploadProgress`: `number` (0 to 100).
  - `selectedCategory`: `string` (default `'Tutti'`, choices: `'Tutti' | 'Contratti' | 'Bollette' | 'Garanzie' | 'Ricevute' | 'Altro'`).
  - `searchQuery`: `string` (live text filtering across `nome` and `note`).
  - `sortBy`: `string` (`'date-desc' | 'date-asc' | 'name-asc' | 'size-desc'`).
  - `viewMode`: `'grid' | 'table'` (user-selectable, defaults to grid).
  - `showUploadCard`: `boolean` (collapsible upload drawer/card).
  - Upload Form State:
    - `file`: `File | null`
    - `nome`: `string`
    - `categoria`: `string` (default `'Contratti'`)
    - `note`: `string` (optional, max 300 chars)
    - `dragActive`: `boolean`

#### Categories & Whitelist
- Whitelist categories: `['Contratti', 'Bollette', 'Garanzie', 'Ricevute', 'Altro']`.
- Whitelist MIME types:
  - `application/pdf`
  - `image/jpeg`, `image/png`, `image/webp`
  - `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `text/plain`
- Maximum file size: `15 * 1024 * 1024` bytes (15 MB).

#### Strict Zero-Emoji FontAwesome Icon Map
All icons use verified FontAwesome 5 classes:

| Feature / UI Element | FontAwesome Class | Zero-Emoji Purpose |
|----------------------|-------------------|--------------------|
| Page Brand / Title | `fas fa-folder-open` | Documents & contracts header |
| Upload Dropzone | `fas fa-cloud-upload-alt` | Drag & drop file area |
| File Selected | `fas fa-check-circle` | Selected file confirmation badge |
| Remove Selected File | `fas fa-times` | Cancel file selection |
| Category: Contratti | `fas fa-file-contract` | Rental/lease contracts |
| Category: Bollette | `fas fa-file-invoice-dollar` | Utilities (energy, gas, water, internet) |
| Category: Garanzie | `fas fa-shield-alt` | Appliance warranties & manuals |
| Category: Ricevute | `fas fa-receipt` | Rent receipts, common purchases |
| Category: Altro | `fas fa-tag` | Other miscellaneous documents |
| Filter "Tutti" | `fas fa-layer-group` | All categories |
| Format: PDF | `fas fa-file-pdf` | PDF file badge |
| Format: Image | `fas fa-file-image` | Photo/scan badge |
| Format: Word/Doc | `fas fa-file-word` | Word/text doc badge |
| Format: Generic | `fas fa-file-alt` | Fallback file badge |
| Search Input | `fas fa-search` | Search bar leading icon |
| Search Clear | `fas fa-times` | Clear search query button |
| Sort Direction | `fas fa-sort-amount-down` | Sort order selector |
| Action: View / Open | `fas fa-eye` | Open file in new tab |
| Action: Download | `fas fa-download` | Download file to disk |
| Action: Delete | `fas fa-trash-alt` | Delete file with ConfirmModal |
| Metadata: Date | `fas fa-calendar-alt` | Upload date metadata icon |
| Metadata: Uploader | `fas fa-user` | Uploader username icon |
| Metadata: Size | `fas fa-hdd` | File size metadata icon |
| Notes Preview | `fas fa-info-circle` | Document description notes |
| Spinner / Loading | `fas fa-spinner fa-spin` | Asynchronous operations |
| Toggle Upload Card | `fas fa-plus` / `fas fa-chevron-up` | Expand/collapse upload form |

#### File Upload Specifications (Drag & Drop + Input)
- **Drag & drop events**: `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`.
  - Visual feedback: `.dropzone.drag-active` with highlighted border and background.
  - Keyboard accessible: `tabIndex={0}`, `role="button"`, `onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}`.
  - Hidden file `<input type="file" ref={fileInputRef} accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.txt" />`.
- **Validation**:
  - File exists.
  - File size `<= 15MB` (if larger, `showToast("Il file supera la dimensione massima di 15 MB.", "warning")`).
  - MIME type allowed (if invalid, `showToast("Formato file non supportato. Formati ammessi: PDF, immagini, DOCX, TXT.", "error")`).
  - Document name sanitized via `sanitizeText(nome, 100)`. If empty, defaults to sanitized original filename (excluding extension).
  - Notes sanitized via `sanitizeText(note, 300)`.
- **Upload Execution**:
  - Storage path: `case/${userData.casaId}/documenti/${docId}_${cleanedFileName}`.
  - Progress tracked via `uploadTask.on('state_changed', snapshot => { ... })`.
  - On complete: retrieve `downloadURL = await getDownloadURL(uploadTask.snapshot.ref)`.
  - Firestore document created in collection `"documenti"`:
    ```javascript
    {
      casaId: userData.casaId,
      nome: sanitizedNome,
      categoria: categoria,
      note: sanitizedNote,
      fileUrl: downloadURL,
      storagePath: storagePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      caricatoDaUid: currentUser.uid,
      caricatoDaNome: userData.username || currentUser.displayName || "Coinquilino",
      createdAt: serverTimestamp()
    }
    ```
  - Feedback: `showToast("Documento caricato con successo!", "success")`.
  - Form reset and document list refresh.

#### Document Deletion Flow
- Triggered by clicking delete button:
  ```javascript
  const handleDelete = async (docItem) => {
    // Only household members can delete (and optionally warn if not author)
    const confirmed = await showConfirm({
      title: "Elimina Documento",
      message: `Sei sicuro di voler eliminare definitivamente "${docItem.nome}"? L'operazione rimuoverà il file per tutti i coinquilini.`,
      confirmText: "Elimina",
      cancelText: "Annulla",
      isDanger: true
    });
    if (!confirmed) return;

    try {
      // 1. Delete from Firebase Storage (if path exists)
      if (docItem.storagePath) {
        try {
          const storageFileRef = ref(storage, docItem.storagePath);
          await deleteObject(storageFileRef);
        } catch (storageErr) {
          console.warn("Storage object delete warning (might already be deleted):", storageErr);
        }
      }

      // 2. Delete Firestore record
      await deleteDoc(doc(db, "documenti", docItem.id));
      showToast("Documento eliminato.", "success");
      fetchDocumentsReload();
    } catch (err) {
      console.error("Errore cancellazione documento:", err);
      showToast("Errore durante l'eliminazione del documento.", "error");
    }
  };
  ```

---

### 4.3 Design Tokens & Ergonomics CSS Rules to Add (`src/App.css`)

The following CSS classes and ergonomic rules should be added to `src/App.css`:

```css
/* ==========================================================================
   CROSS-DEVICE ERGONOMICS & ACCESSIBILITY ENHANCEMENTS
   ========================================================================== */

/* Universal Keyboard Focus Ring (WCAG 2.4.7 AA Focus Visible) */
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
a:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--color-primary) !important;
  outline-offset: 2px !important;
}

/* Minimum Touch Targets (WCAG 2.5.5 / 2.5.8 >= 44px) */
.burger-container {
  min-width: 44px !important;
  min-height: 44px !important;
}

.mobile-close-btn {
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  min-height: 44px !important;
}

.theme-pill-toggle {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* ==========================================================================
   GESTIONE DOCUMENTI VIEW STYLING (Spacious Desktop & Touch Mobile)
   ========================================================================== */

.documents-container {
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Dropzone */
.doc-dropzone {
  border: 2px dashed var(--border-medium);
  border-radius: var(--radius-lg);
  padding: 32px 20px;
  text-align: center;
  background: var(--bg-subtle);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-standard);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.doc-dropzone:hover,
.doc-dropzone.drag-active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  transform: translateY(-2px);
}

.doc-dropzone-icon {
  font-size: 2.8rem;
  color: var(--color-primary);
}

/* Category Filter Pills */
.doc-filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.doc-filter-pill {
  min-height: 44px;
  padding: 8px 18px;
  border-radius: var(--radius-full);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all var(--duration-fast) var(--ease-standard);
}

.doc-filter-pill:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.doc-filter-pill.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px var(--color-primary-glow);
}

/* Document Grid Cards */
.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
  width: 100%;
}

.doc-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.doc-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-medium);
  box-shadow: var(--shadow-md);
}

.doc-card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.doc-format-icon-wrap {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  flex-shrink: 0;
}

.doc-format-pdf { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); }
.doc-format-img { background: rgba(13, 148, 136, 0.12); color: var(--color-accent); }
.doc-format-doc { background: rgba(37, 99, 235, 0.12); color: var(--color-primary); }
.doc-format-alt { background: var(--bg-subtle); color: var(--text-secondary); }

.doc-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  word-break: break-word;
}

.doc-category-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  margin-top: 4px;
}

.doc-metadata-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.82rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border-subtle);
  padding-top: 10px;
}

.doc-metadata-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.doc-card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.doc-action-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
}

.doc-action-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-medium);
}

.doc-action-btn.btn-delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

/* Responsive Table (Desktop Viewport >= 769px) */
.doc-table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.doc-table th {
  padding: 14px 18px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.doc-table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  vertical-align: middle;
}

.doc-table tr:hover td {
  background: var(--bg-card-hover);
}

/* Mobile Media Query Fine-Tuning */
@media (max-width: 768px) {
  .doc-grid {
    grid-template-columns: 1fr;
  }
  .doc-filter-pills {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
  }
  .doc-table-wrapper {
    display: none; /* Switch to responsive card grid on small screens */
  }
}
```

---

## 5. Verification Method

To independently verify all findings and specifications:

### 5.1 Verification Commands
Run the repository verification suite from the repo root (`/home/daniele949/Desktop/Cose/HouseHelper/househelper`):
```bash
# 1. Zero-Emoji Scan: Must exit 0 with 0 violations
node scripts/verify-zero-emojis.js

# 2. Circular Dependency Analysis: Must exit 0 with 0 cycles in src/App.js and src/
node scripts/check-circular.js

# 3. Secret Audit: Must exit 0 with 0 secrets across tree and git commits
node scripts/audit-secrets.js

# 4. Current Test Suite Baseline: Must pass cleanly
CI=true npm test -- --watchAll=false
```

### 5.2 Code & Asset Inspections
- **FontAwesome icon validity**: Inspect `public/fontawesome.min.css` to confirm that any newly specified icon class matches an existing `.fa-<name>:before` entry.
- **Route guard structure**: Inspect `src/App.js` and `src/components/RouteGuards.js` to confirm that `HouseProtectedRoute` enforces both `currentUser` and `userData.casaId`.
- **Navigation parity**: Inspect `src/components/DesktopNavigation.js` and `src/components/MobileNavigation.js` to verify that both render matching `/documenti` links with `fa-folder-open`.
- **Feedback pattern**: Inspect `src/utils/feedback.js` to confirm `showToast` and `showConfirm` match the parameter signature used in the specification.

### 5.3 Invalidation Conditions
- If FontAwesome 6 is introduced, `fa-file-lines` would become valid; however, under the current FontAwesome 5 stylesheet, using `fa-file-lines` causes an invisible icon (invalidation).
- If `ViewDocumenti.js` imports `App.css`, `node scripts/check-circular.js` will immediately fail due to circular dependencies between `App.js` and pages.
- If raw emoji/emoticon characters or raw Unicode arrows (`\u2190`–`\u21FF`) / checkmarks are introduced in JSX or strings, `node scripts/verify-zero-emojis.js` will fail immediately.
