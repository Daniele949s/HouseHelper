# Milestone M7 Independent Review & Adversarial Audit Report — reviewer_m7_2

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Assessment**: **NO INTEGRITY VIOLATIONS DETECTED** (zero facades, zero hardcoded expected outputs, zero bypasses, authentic automated tests and real implementations across all components).  
**Review Focus**: R2 (Automazione Turni), R4 (PWA & Offline), R5 (Prestazioni), R6 (Firestore Rules & Sicurezza).

---

## 1. Observation

### Verification Commands & Exact Outputs

1. **Automated Test Suite (`CI=true npm test -- --watchAll=false --runInBand`)**:
   ```
   PASS src/test/tier3_interactions/cross_feature.test.jsx (5.988 s)
   PASS src/test/tier1_features/auth_house.test.jsx
   PASS src/test/tier1_features/bacheca_calendario.test.jsx
   PASS src/test/tier2_boundaries/m3_challenger_lifecycle_feedback.test.jsx
   PASS src/test/tier2_boundaries/auth_house_boundary.test.jsx
   PASS src/test/tier1_features/spesa.test.jsx
   PASS src/test/tier2_boundaries/bacheca_calendario_boundary.test.jsx
   PASS src/test/tier2_boundaries/spesa_boundary.test.jsx
   PASS src/test/tier1_features/turni.test.jsx
   PASS src/components/ConfirmModal.test.jsx
   PASS src/test/tier2_boundaries/m4_challenger_concurrency_stress.test.jsx
   PASS src/components/Toast.test.jsx
   PASS src/components/HouseholdStatus.test.jsx
   PASS src/test/tier2_boundaries/documenti_boundary.test.jsx
   PASS src/components/DesktopNavigation.test.jsx
   PASS src/test/tier3_interactions/pwa_offline.test.js
   PASS src/components/ThemeToggle.test.jsx
   PASS src/App.test.js
   PASS src/utils/security.test.js
   PASS src/test/tier2_boundaries/chore_automation.test.js
   PASS src/utils/feedback.test.js
   PASS src/test/tier2_boundaries/security_rules.test.js
   PASS src/test/tier2_boundaries/debt_simplification.test.js
   ...
   Test Suites: 34 passed, 34 total
   Tests:       310 passed, 310 total
   Snapshots:   0 total
   Time:        65.091 s
   Ran all test suites.
   ```
   *Note on test execution*: Under unconstrained parallel worker execution (`react-scripts test` default on multicore), heavy concurrent jsdom suites occasionally hit the 5,000 ms Jest per-test timeout due to CPU load. Executing with `--runInBand` or dedicated test targeting demonstrates 100% pass rate (34/34 suites, 310/310 tests).

2. **Production Build (`npm run build`)**:
   ```
   > househelper@0.1.0 build
   > react-scripts build

   Creating an optimized production build...
   Compiled successfully.

   File sizes after gzip:
     221.83 kB  build/static/js/main.cdbbd7f2.js
     11.31 kB   build/static/css/main.52bf504e.css
     9.68 kB    build/static/js/9.7d80a53f.chunk.js
     6.97 kB    build/static/js/404.b1814e35.chunk.js
     5.63 kB    build/static/js/22.61623639.chunk.js
     3.21 kB    build/static/js/75.aa57a1f4.chunk.js
     2.2 kB     build/static/js/967.1ea2cbfd.chunk.js
     2.12 kB    build/static/js/445.01a5351e.chunk.js
     1.76 kB    build/static/js/453.e2c00ade.chunk.js
     786 B      build/static/css/445.0a1339dc.chunk.css

   The build folder is ready to be deployed.
   ```

3. **Circular Dependency Scan (`npm run check:circular`)**:
   ```
   > househelper@0.1.0 check:circular
   > node scripts/check-circular.js

   Starting circular dependency verification...
   - src/App.js: PASSED (0 cycles)
   - src/      : PASSED (0 cycles)

   ✅ SUCCESS: All circular dependency checks passed with 0 cycles.
   ```

4. **Zero-Emoji Scan (`npm run check:emojis`)**:
   ```
   > househelper@0.1.0 check:emojis
   > node scripts/verify-zero-emojis.js

   🔍 Scanning 96 files across src/ and public/ for emojis & emoticons
   ✔ SUCCESS: Zero emojis or text emoticons detected across 96 files.
   ```

5. **Secrets & Credentials Audit (`npm run audit:secrets`)**:
   ```
   > househelper@0.1.0 audit:secrets
   > node scripts/audit-secrets.js

   [INFO] Scanned 111 files across working tree.
   [INFO] Auditing git commit history (14 commits)...
   [SUCCESS] 0 secrets, credentials, or private keys detected across working tree and git history.
   ```

---

## 2. Logic Chain

1. **R2 Automazione Turni & Vacation Exclusion**:
   - `src/utils/choreRotation.js`:
     - `isUserOnVacation(userData, checkDate)`: Correctly handles boundary inclusion (`dateStr >= inizio && dateStr <= fine`), open-ended vacation (`inVacanza === true` with null dates), and inactive vacation (`inVacanza === false`).
     - `getAvailableRoommates(roommates, checkDate)`: Filters active members cleanly using `!isUserOnVacation(r, checkDate)`.
     - `rotateChoreAssignee(currentAssigneeUid, activeRoommates, rotationOrder)`: Deterministic ordering using explicit `rotationOrder` or alphabetical fallback via `localeCompare(username || uid)`. When `currentAssigneeUid` is missing/null, falls back to index `0`. When all roommates are on vacation, returns `{ assignee: null, isAllOnVacation: true }`.
   - `src/pages/TurniPulizia/viewTurni.js`:
     - Live sub-task toggle updates Firestore atomically via `updateDoc(doc(db, "turni", turnoId), { checklist: updatedChecklist, completato: isAllDone })`.
     - Inline sub-task creator sanitizes task text via `sanitizeText(text, 100)` and limits total items to 20.
     - Whole-house absence fallback banner surfaces when `roommates.every(isUserOnVacation)`, preventing chore creation lockup.
   - `src/pages/TurniPulizia/aggiuntaTurno.js`:
     - Visually flags roommates currently on vacation on the chosen target date.
     - Surfaces warning alert when an assignee on vacation is selected.
     - Sanitizes sub-tasks via `sanitizeChecklist` on creation.

2. **R4 PWA & Offline Isolation**:
   - `public/manifest.json`: Valid Web App Manifest specification with `standalone` display mode, `start_url: "/"`, theme colors, and icons. Zero emojis present.
   - `public/sw.js`:
     - Precaching of core shell assets (`/`, `/index.html`, `/manifest.json`, `/favicon.ico`, `/logo192.png`, `/logo512.png`, `/fontawesome.min.css`).
     - Skip-waiting on install and clients-claim on activate with stale cache eviction.
     - Navigation requests routed via Network-First with fallback to `/index.html` (enabling offline SPA routing).
     - Static assets (`style`, `script`, `image`, `font`) handled via Cache-First with runtime caching.
     - Network bypass for non-GET and cloud endpoints (`firestore.googleapis.com`, `identitytoolkit.googleapis.com`).
   - `src/utils/offlineStorage.js` & `src/contexts/AuthContext.js`:
     - Multi-tenant client-side storage keys are strictly isolated with prefix `hh_offline_${casaId}_${key}`.
     - `purgeAllOfflineStorage()` is explicitly invoked in `AuthContext.js` on unauthenticated state transitions (`!user`), preventing data leakage across user sessions on shared devices.
   - `src/pages/homeUtente.js`:
     - In-app notification banner calculates chores due within 24 hours (`t.data === oggi` or `t.data === domani`) and expenses registered by other roommates in the last 24 hours.
     - Dismissal state is tracked in memory, preventing repeated annoying alerts.

3. **R5 Prestazioni & Code-Splitting**:
   - `src/App.js`:
     - Secondary domain routes (`/debiti`, `/bacheca`, `/calendario`, `/documenti`, `/contatti`) are loaded via `React.lazy` and wrapped in `<Suspense fallback={<LoadingFallback />}>`.
     - Initial production bundle gzip size is optimized (`main.cdbbd7f2.js` 221.83 kB) with dedicated route chunks (`9.7d80a53f.chunk.js`, `404.b1814e35.chunk.js`, `22.61623639.chunk.js`, etc.).

4. **R6 Firestore Rules Hardening & Sicurezza**:
   - `firestore.rules`:
     - Added `/contatti/{contattoId}` matching rules with strict tenant verification (`belongsToSameHouse(resource.data.casaId)` and `request.resource.data.casaId == getUserCasaId()`), plus string length validation.
     - Updated `/utenti/{userId}` update rules permitting `inVacanza: bool`, `vacanzaInizio: dateString`, `vacanzaFine: dateString`.
     - Updated `/case/{casaId}` update rules permitting `impostazioniTurni: map`.
     - Updated `/turni/{turnoId}` update and create rules permitting `checklist: list` (up to 30 items) and `completato: bool`.

---

## 3. Findings

### [Minor] Finding 1: Timezone Offset Consideration in Date String Normalization
- **What**: `normalizeDateStr` uses `d.toISOString().split("T")[0]`.
- **Where**: `src/utils/choreRotation.js:18, 21`
- **Why**: `toISOString()` returns UTC date. If a user in UTC+2 (e.g. Italy CEST) accesses the application between 00:00 and 02:00 local time, the UTC date is still the previous calendar day.
- **Suggestion**: For future refinement, date normalization could extract local year, month, and day (`d.getFullYear()`, `d.getMonth() + 1`, `d.getDate()`) to avoid boundary shifts around local midnight.

### [Minor] Finding 2: Unhashed Static Asset Caching in Service Worker
- **What**: `/fontawesome.min.css` is cached with Cache-First strategy under cache name `'househelper-shell-v1'`.
- **Where**: `public/sw.js:19, 75-94`
- **Why**: Unlike Webpack-bundled scripts with content hashes (e.g. `main.cdbbd7f2.js`), unhashed assets will not be re-fetched unless `CACHE_NAME` is bumped to `v2` or cache is cleared.
- **Suggestion**: When updating unhashed vendor stylesheets in `public/`, bump the cache version in `sw.js`.

### [Minor] Finding 3: Test Runner Resource Allocation in CI
- **What**: Running all 34 test suites with default parallel workers on CPU-constrained machines can trigger Jest's 5s timeout on long-running integration scenarios.
- **Where**: `package.json:21`
- **Why**: 34 parallel test workers compiling Babel and running jsdom concurrently create CPU contention.
- **Suggestion**: In CI environments, execute tests with `npm test -- --watchAll=false --maxWorkers=2` or `--runInBand` for optimal reliability.

---

## 4. Adversarial Challenges & Stress Testing

```markdown
## Challenge Summary
**Overall risk assessment**: LOW

## Challenges

### [Low] Challenge 1: Dynamic Roommate Removal during Round-Robin Rotation
- **Assumption challenged**: Last chore assignee UID always exists in the active roommates roster.
- **Attack scenario**: Last assignee leaves the house or account is deleted, rendering `lastAssigneeObj` null.
- **Stress Test Result**: `rotateChoreAssignee(null, activeRoommates)` safely defaults to index 0 (first active roommate alphabetically) without throwing `TypeError`. PASS.

### [Low] Challenge 2: Inverted Vacation Date Range (`vacanzaFine < vacanzaInizio`)
- **Assumption challenged**: Vacation date pickers always submit chronological dates.
- **Attack scenario**: A malicious client writes `vacanzaInizio: "2026-11-20"` and `vacanzaFine: "2026-11-10"`.
- **Stress Test Result**: `homeUtente.js:146` validates that end date cannot precede start date before saving. Even if forced directly into Firestore, `isUserOnVacation` evaluates `dateStr >= inizio && dateStr <= fine` as `false`, safely failing closed. PASS.

### [Low] Challenge 3: Cross-Session Offline Storage Contamination
- **Assumption challenged**: Shared browser profiles do not leak household notes or contacts across logins.
- **Attack scenario**: User A logs out; User B logs in on the same browser without page reload.
- **Stress Test Result**: Verified in `src/test/tier3_interactions/pwa_offline.test.js:74` that `onAuthStateChanged` unauthenticated event triggers `purgeAllOfflineStorage()`, evicting all `hh_offline_*` keys immediately. PASS.
```

---

## 5. Verified Claims

- **Chore Rotation Determinism**: Verified via `src/test/tier2_boundaries/chore_automation.test.js` -> PASS.
- **Vacation Exclusion & Fallback**: Verified via unit tests and UI rendering -> PASS.
- **Live Checklist Atomic updateDoc**: Verified in `src/pages/TurniPulizia/viewTurni.js` -> PASS.
- **PWA Service Worker & Manifest**: Verified in `public/sw.js` and `public/manifest.json` -> PASS.
- **Offline Storage Tenant Isolation**: Verified in `src/test/tier3_interactions/pwa_offline.test.js` -> PASS.
- **In-App Notifications Banner**: Verified in `src/pages/homeUtente.js` -> PASS.
- **Firestore Security Rules**: Verified in `firestore.rules` and `security_rules.test.js` -> PASS.
- **Zero Emojis / Emoticons**: Verified via `npm run check:emojis` (0 violations across 96 files) -> PASS.
- **Zero Circular Dependencies**: Verified via `npm run check:circular` (0 cycles) -> PASS.
- **Zero Secrets / Credentials**: Verified via `npm run audit:secrets` (0 secrets across tree and git commits) -> PASS.
- **Clean Production Build**: Verified via `npm run build` -> PASS.

---

## 6. Caveats

- **Service Worker in Development**: SW registration is intentionally disabled in development mode (`process.env.NODE_ENV === 'production' || isLocalhost`) as standard to prevent developer caching confusion.
- **No further caveats**.

---

## 7. Conclusion

Milestone M7 satisfies all acceptance criteria across R2 (Automazione Turni), R4 (PWA & Offline), R5 (Prestazioni), R6 (Firestore Rules & Sicurezza), and R7 (Vincoli di Sistema).  
The implementation is genuine, secure, performant, and well-tested.  
Verdict is **APPROVE**.

---

## 8. Verification Method

To independently reproduce all verifications:
```bash
cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
CI=true npm test -- --watchAll=false --runInBand
npm run build
npm run check:circular
npm run check:emojis
npm run audit:secrets
```
