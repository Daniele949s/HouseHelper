# Handoff Report: Technical Investigation of Testing & Mock Firebase Storage Harness (Milestone M6)

## 1. Observation

### 1.1 Baseline Test Suite & Verification Environment
- Direct command execution: `CI=true npm test -- --watchAll=false`
  - Result: 27 test suites passed, 27 total; 249 tests passed, 249 total; duration 4.635s.
- Direct command execution: `node scripts/verify-zero-emojis.js`
  - Result: "SUCCESS: Zero emojis or text emoticons detected across 80 files." Exit code 0.
- Direct command execution: `node scripts/check-circular.js`
  - Result: `src/App.js`: PASSED (0 cycles); `src/`: PASSED (0 cycles). Exit code 0.
- Direct command execution: `node scripts/audit-secrets.js`
  - Result: "SUCCESS: 0 secrets, credentials, or private keys detected across working tree and git history (14 commits)." Exit code 0.
- Direct command execution: `npm run build`
  - Result: "Compiled successfully. File sizes after gzip: 218.52 kB build/static/js/main.86663794.js, 10.06 kB build/static/css/main.d46597a0.css". Exit code 0.

### 1.2 Inspection of `src/test/mockFirebase.js`
- `src/test/mockFirebase.js` lines 6-19:
  ```javascript
  class MockFirestoreStore {
    constructor() {
      this.collections = {
        utenti: {},
        case: {},
        turni: {},
        debiti: {},
        spesa: {},
        note: {}
      };
      this.currentMockUser = null;
      this.authListeners = [];
      this.autoIdCounter = 1;
    }
  ```
  `documenti` is not initialized in `this.collections`.
- `src/test/mockFirebase.js` lines 21-33:
  `reset()` resets only `utenti`, `case`, `turni`, `debiti`, `spesa`, `note`.
- Firebase Storage mocks are completely absent:
  - No `getStorage`, `ref`, `uploadBytes`, `uploadBytesResumable`, `getDownloadURL`, `deleteObject`, `listAll`, or `getMetadata` functions exist.
  - No storage file container (`this.storageFiles = {}`) exists on `MockFirestoreStore`.
- `src/test/mockFirebase.js` lines 372-381:
  ```javascript
  export const appFirebaseMock = {
    auth: {
      get currentUser() {
        return mockStore.currentMockUser;
      }
    },
    db: { _isMockDb: true },
    googleProvider: new GoogleAuthProvider(),
    default: { name: '[DEFAULT]' }
  };
  ```
  `storage` is missing from `appFirebaseMock`.

### 1.3 Inspection of `src/setupTests.js`
- `src/setupTests.js` lines 160-167:
  ```javascript
  // 4. Firebase SDK In-Memory Mocks
  jest.mock('firebase/firestore', () => require('./test/mockFirebase').firestoreMock);
  jest.mock('firebase/auth', () => require('./test/mockFirebase').authMock);
  jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(() => ({}))
  }));
  jest.mock('./firebase', () => require('./test/mockFirebase').appFirebaseMock);
  ```
  `jest.mock('firebase/storage', ...)` is not configured. When components import from `'firebase/storage'`, Jest will fail unless this mock is declared.

### 1.4 Inspection of `src/firebase.js`
- `src/firebase.js` lines 1-19:
  - Imports: `initializeApp`, `getAuth`, `GoogleAuthProvider`, `getFirestore`.
  - Config: includes `storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "househelper-12050.firebasestorage.app"`.
  - Exports: `auth`, `googleProvider`, `db`, and default `app`.
  - Does NOT import or export `storage` (`getStorage(app)`).

### 1.5 Inspection of `src/test/testUtils.jsx`
- `src/test/testUtils.jsx` lines 58-115 (`seedHousehold`):
  Seeds `case`, `utenti`, `turni`, `debiti`, `spesa`, `note`.
  Does not accept or seed `documenti`.
  No helper exists to generate mock `File` or `Blob` instances for upload tests.

### 1.6 Inspection of Existing Test Suites Across Tiers
- Test file naming and organization:
  - `src/test/tier1_features/`: `auth_house.test.jsx`, `turni.test.jsx`, `debiti.test.jsx`, `spesa.test.jsx`, `bacheca_calendario.test.jsx`. Tests are named with prefix `T1.XX`.
  - `src/test/tier2_boundaries/`: `auth_house_boundary.test.jsx`, `turni_boundary.test.jsx`, `debiti_boundary.test.jsx`, `spesa_boundary.test.jsx`, `bacheca_calendario_boundary.test.jsx`, `security_rules.test.js`, adversarial suites. Tests are named with prefix `T2.XX` or `SEC-XX`.
  - `src/test/tier3_interactions/`: `cross_feature.test.jsx`. Tests are named with prefix `T3.XX`.
  - `src/test/tier4_scenarios/`: `household_lifecycle.test.jsx`. Tests are named with prefix `T4.XX`.
- Component tests:
  - `src/components/DesktopNavigation.test.jsx` lines 44 & 67:
    `expect(links).toHaveLength(6);`
    `expect(icons.length).toBe(6);`
    When "Documenti" is added to `DesktopNavigation.js`, `DesktopNavigation.test.jsx` will fail unless updated to expect 7 links and icons.

### 1.7 Inspection of `firestore.rules` and `storage.rules` Specification
- `firestore.rules` lines 201-224:
  `match /documenti/{docId}` already defines schema and rules:
  - `casaId == getUserCasaId()`
  - `caricatoDa == request.auth.uid`
  - `nome` string <= 120
  - `categoria` string <= 50
  - `fileUrl` string <= 1000
  - `dimensioneBytes` integer > 0 and <= 26214400 (25 MB)
  - `allow read, delete: if belongsToSameHouse(resource.data.casaId);`
- `firestore.rules` lines 238-257:
  Contains the exact specification for `storage.rules`:
  ```
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      function belongsToSameHouse(casaId) {
        return request.auth != null
          && firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid)).data.casaId == casaId;
      }
      match /case/{casaId}/documenti/{fileName} {
        allow read: if belongsToSameHouse(casaId);
        allow create: if belongsToSameHouse(casaId)
          && request.resource.size <= 25 * 1024 * 1024
          && request.resource.contentType.matches('application/pdf|image/jpeg|image/png|image/webp|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        allow update: if false;
        allow delete: if belongsToSameHouse(casaId);
      }
      match /{allPaths=**} {
        allow read, write: if false;
      }
    }
  }
  ```
- File `storage.rules` currently does not exist at the repository root.

---

## 2. Logic Chain

1. **Storage Mock Necessity (Obs 1.2, 1.3, 1.4)**:
   - In production, `ViewDocumenti.js` uploads files to Firebase Storage (`firebase/storage`) and stores metadata in Firestore (`documenti` collection).
   - In Jest test environment, network access is forbidden, and real Firebase credentials are not used.
   - If `firebase/storage` is imported without being mocked in `src/setupTests.js`, Jest throws: `Cannot find module 'firebase/storage'`.
   - Therefore, `src/test/mockFirebase.js` must implement an in-memory storage simulator (`storageMock`), export it, register it in `setupTests.js`, and provide `storage: { _isMockStorage: true }` in `appFirebaseMock`.

2. **In-Memory Storage Architecture Design (Obs 1.2)**:
   - Files are addressed via `ref(storage, path)` or `ref(parentRef, childPath)`.
   - A storage reference must expose `.name`, `.fullPath`, `.bucket`, `.parent`, `.root`.
   - `uploadBytes(ref, data, metadata)` needs to store the payload in a dictionary `mockStore.storageFiles[ref.fullPath] = { data, size, contentType, metadata, uploadedAt }` and return an upload snapshot.
   - `uploadBytesResumable(ref, data, metadata)` must return an upload task with `.on()`, `.snapshot`, and `.then()` for progress event compatibility.
   - `getDownloadURL(ref)` must check if `ref.fullPath` exists in `mockStore.storageFiles`. If not found, throw/reject with Firebase error `storage/object-not-found`. If found, return a deterministic URL string like `https://firebasestorage.googleapis.com/v0/b/househelper-mock/o/${encodeURIComponent(ref.fullPath)}?alt=media&token=mock-token`.
   - `deleteObject(ref)` must delete `mockStore.storageFiles[ref.fullPath]`. If not found, reject with `storage/object-not-found`.
   - `listAll(ref)` must filter keys in `mockStore.storageFiles` that match prefix `${ref.fullPath}/`.
   - `mockStore.reset()` must clear `this.storageFiles = {}` and reset `this.collections.documenti = {}`.

3. **Test Utility Harness Enhancement (Obs 1.5)**:
   - `seedHousehold` in `src/test/testUtils.jsx` must accept an optional `documenti = []` array and seed `mockStore.collections.documenti` with documents tagged with `casaId`.
   - Tests simulating file selection through `<input type="file" />` require realistic `File` objects. Adding `createMockFile(name, size, type)` avoids repetitive boilerplate across test suites.

4. **Test Suite Tier Mapping for Milestone M6 (Obs 1.6)**:
   - **Tier 1 (Smoke / Features)**: Requires `src/test/tier1_features/documenti.test.jsx` (tests T1.27 - T1.33) covering empty state, rendering, file selection & upload, category filtering, deletion with confirmation, download action, and search filter.
   - **Tier 2 (Boundaries & Security)**: Requires `src/test/tier2_boundaries/documenti_boundary.test.jsx` (tests T2.24 - T2.31) covering 25MB file rejection, MIME type validation, metadata sanitization, multi-tenant house isolation (`casaId` barriers), cross-tenant deletion prevention, and network/upload failure recovery.
   - **Tier 2 (Security Rules)**: Expand `src/test/tier2_boundaries/security_rules.test.js` to evaluate `storage.rules` logic and static assertions on `storage.rules`.
   - **Tier 3 (Cross-Feature Interactions)**: Add tests T3.06 and T3.07 in `src/test/tier3_interactions/cross_feature.test.jsx` to test household document access revocation when leaving a house.
   - **Tier 4 (Scenarios)**: Add test T4.05 in `src/test/tier4_scenarios/household_lifecycle.test.jsx` simulating the full multi-roommate workflow: house creation, contract upload by creator, roommate join, document viewing & download, utility bill upload, and outdated document deletion.

5. **Regression Hazard in Existing Component Tests (Obs 1.6)**:
   - `DesktopNavigation.test.jsx` asserts `links.length === 6` and `icons.length === 6`.
   - When "Documenti" is added to `DesktopNavigation.js`, this existing test will fail with `Expected 6, Received 7`.
   - `DesktopNavigation.test.jsx` must be updated to expect 7 links and assert the presence of "Documenti" and its icon (`fa-file-lines` or `fa-folder-open`).

6. **Zero-Emoji and Static Integrity Compliance (Obs 1.1)**:
   - `scripts/verify-zero-emojis.js` uses regex scanning `\p{Extended_Pictographic}`, `\u2190-\u21FF` (arrows), and `\u2713\u2714` (checkmarks).
   - In all new files (`ViewDocumenti.js`, test files, styles, rules), only ASCII characters and FontAwesome vector icon classes may be used. Emojis, raw arrow characters, checkmark glyphs, or emoticons are strictly prohibited.
   - `scripts/check-circular.js` prohibits cyclic imports; `ViewDocumenti.js` must only import leaf utilities and contexts, never `App.js`.
   - `scripts/audit-secrets.js` requires 0 credentials in code and git commits.

---

## 3. Caveats

1. **JSDOM File & Drag-and-Drop Limitations**:
   - In Jest / JSDOM, `HTMLInputElement.files` is read-only by default in standard browser DOM, but can be set using `fireEvent.change(input, { target: { files: [mockFile] } })` or `Object.defineProperty(input, 'files', { value: [mockFile] })`. The test harness must support this standard testing pattern.
2. **Blob.arrayBuffer Support in Node / JSDOM**:
   - Older Node/JSDOM environments may have incomplete `Blob.prototype.arrayBuffer()`. The mock storage implementation should handle `File`, `Blob`, `Uint8Array`, and plain objects gracefully without relying on external polyfills.
3. **Storage Rules Unit Testing vs Real Firebase Emulator**:
   - This project runs entirely headless without Docker or live Firebase CLI emulators. As established in Milestone M5 (`src/test/tier2_boundaries/security_rules.test.js`), rules evaluation is performed via an AST/logic simulator (`SecurityRulesValidator`) combined with static file assertions. `storage.rules` should follow this proven architecture.

---

## 4. Conclusion

The testing infrastructure and mock architecture for Milestone M6 are clear and fully specified:
1. **Mock Storage Harness in `src/test/mockFirebase.js`**:
   - Add `this.storageFiles = {}` and `documenti: {}` to `MockFirestoreStore`.
   - Export modular functions: `getStorage`, `ref`, `uploadBytes`, `uploadBytesResumable`, `getDownloadURL`, `deleteObject`, `listAll`, `getMetadata`.
   - Register `storageMock` in `src/setupTests.js` via `jest.mock('firebase/storage', () => require('./test/mockFirebase').storageMock)`.
   - Export `storage: { _isMockStorage: true }` in `appFirebaseMock`.
   - In `src/firebase.js`, export `storage = getStorage(app)`.
2. **Test Utility Extensions in `src/test/testUtils.jsx`**:
   - Extend `seedHousehold` to accept `documenti: []`.
   - Provide `createMockFile(name, size, type)` helper.
3. **New Test Suites Specification**:
   - Tier 1: `src/test/tier1_features/documenti.test.jsx` (7 tests: T1.27 - T1.33).
   - Tier 2: `src/test/tier2_boundaries/documenti_boundary.test.jsx` (8 tests: T2.24 - T2.31).
   - Tier 2 Security Rules: `src/test/tier2_boundaries/security_rules.test.js` (SEC-14 storage rules suite).
   - Tier 3: `src/test/tier3_interactions/cross_feature.test.jsx` (tests T3.06 - T3.07).
   - Tier 4: `src/test/tier4_scenarios/household_lifecycle.test.jsx` (test T4.05).
   - Component Test: Update `src/components/DesktopNavigation.test.jsx` from 6 to 7 links.
4. **Verification Scripts Compliance**:
   - All files must be ASCII-only with FontAwesome vector icons (0 emojis).
   - Zero circular dependencies between `ViewDocumenti.js`, navigation, and `App.js`.
   - `storage.rules` created at repository root matching `firestore.rules` lines 238-257.

---

## 5. Verification Method

### 5.1 Verification Commands
Once the implementation is complete, independently verify with:
```bash
# 1. Zero emojis verification across all files (must exit with code 0)
node scripts/verify-zero-emojis.js

# 2. Circular dependency analysis (must report 0 cycles)
node scripts/check-circular.js

# 3. Secret and credential audit (must report 0 secrets)
node scripts/audit-secrets.js

# 4. Full test suite execution across all tiers (must achieve 100% pass)
CI=true npm test -- --watchAll=false

# 5. Production build compilation (must compile with 0 errors)
npm run build
```

### 5.2 Files to Inspect Post-Implementation
- `src/test/mockFirebase.js` (presence of `storageMock`, `storageFiles`, `documenti` collection)
- `src/setupTests.js` (presence of `jest.mock('firebase/storage')`)
- `src/firebase.js` (presence of `export const storage = getStorage(app);`)
- `src/test/testUtils.jsx` (presence of `documenti` in `seedHousehold` and `createMockFile`)
- `src/test/tier1_features/documenti.test.jsx` (all Tier 1 tests passing)
- `src/test/tier2_boundaries/documenti_boundary.test.jsx` (all Tier 2 tests passing)
- `storage.rules` (valid multi-tenant Firebase Storage rules at repository root)
- `src/components/DesktopNavigation.test.jsx` (updated to 7 links)
- `src/components/DesktopNavigation.js` & `MobileNavigation.js` (navigation entries present)
- `src/pages/Documenti/ViewDocumenti.js` (page component implemented)
- `src/App.js` (route `/documenti` registered under `HouseProtectedRoute`)

### 5.3 Invalidation Conditions
- Any test suite failing or timeout during `CI=true npm test -- --watchAll=false`.
- Any emoji or emoticon detected by `node scripts/verify-zero-emojis.js`.
- Any circular dependency cycle introduced by `ViewDocumenti.js` or navigation imports.
- Any unresolved promise or storage memory leak in `mockStore`.
