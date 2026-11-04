## 2026-11-04T00:11:52Z
You are Explorer 3 (explorer_m7_pwa_contacts) for Milestone M7 of HouseHelper.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_pwa_contacts/
Your task is a READ-ONLY technical investigation of Requirements R3 (Contatti Utili), R4 (PWA & Notifiche), R5 (Prestazioni), R6 (Sicurezza), and R7 (Vincoli).

MANDATORY: Read the full user request first at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Also inspect /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md

Investigate and document:
1. Useful & Emergency Contacts Directory (R3):
   - Current routes and navigation in `src/App.js`, `src/components/DesktopNavigation.js`, `src/components/MobileNavigation.js`.
   - Data model for contacts collection: `case/{casaId}/contatti` or top-level `contatti` scoped by `casaId`.
   - Contact fields: `id, nome, categoria (es. Proprietario, Idraulico, Elettricista, Amministratore, Emergenza), telefono, email, note, casaId, createdAt`.
   - Quick action triggers: `tel:${telefono}` and `mailto:${email}` with protocol sanitization (ensuring no `javascript:` or dangerous URLs via `security.js`).
   - Page design and modal for adding/editing/deleting contacts, strictly using vector SVG icons (ZERO emojis).
2. PWA & Offline Experience (R4):
   - Check current `public/manifest.json`, `src/serviceWorker.js` or `service-worker.js`, `src/serviceWorkerRegistration.js`.
   - Verify Service Worker setup: caching static app shell (HTML, CSS, JS, icons) and safe runtime caching strategy for already-loaded data (e.g. IndexedDB or CacheStorage with strict multi-tenant eviction to avoid cross-user/cross-household leakage on logout).
   - In-app notification and reminder system: scheduled or dashboard alerts for upcoming chores due soon (< 24h) and new expenses.
3. Performance Refactoring (R5):
   - Profile/inspect current route imports in `src/App.js` and bundle considerations. Is `React.lazy` with `Suspense` beneficial for heavy pages (e.g. Documenti, Bacheca, Debiti, Contatti) to keep initial load swift?
4. Security & Multi-tenant Authorization (R6, R7):
   - Input sanitization via `src/utils/security.js` for all new inputs (contacts, notes, custom splits, checklist).
   - Firestore security rules in `firestore.rules`: ensure `contatti` and updated `case`/`turni`/`debiti`/`utenti` rules strictly enforce `request.auth != null && resource.data.casaId == get(/databases/$(database)/documents/utenti/$(request.auth.uid)).data.casaId`.
   - Double-click/double-submit prevention on form submission buttons (isSubmitting guard, disable button).
   - Zero emojis verification and zero circular dependencies.

Output:
Write your structured findings to `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_pwa_contacts/handoff.md`.
Update `progress.md` with your status.
When finished, send a message to the orchestrator.
