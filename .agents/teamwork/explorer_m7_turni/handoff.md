# Handoff Report: Requirement R2 — Automazione dei Turni & Manutenzione

**Agent**: `explorer_m7_turni` (Explorer 2)  
**Milestone**: M7 — HouseHelper Modernization Roadmap  
**Target Requirement**: R2 (Automazione dei Turni & Manutenzione)  
**Date**: 2026-11-04  
**Status**: COMPLETE (Read-Only Investigation & Architectural Specification)  

---

## 1. Observation

### 1.1 Baseline System State
- Test suite baseline: `npm test -- --watchAll=false` runs 30 test suites across all 4 tiers; **30/30 suites passed, 280/280 tests passed** cleanly in 23.31s.
- Zero emojis / text emoticons: `node scripts/verify-zero-emojis.js` verified 85 files across `src/` and `public/` with **0 violations**.
- Zero circular dependencies: `node scripts/check-circular.js` verified `src/App.js` and full tree `src/` with **0 cycles**.
- Secret scan: `node scripts/audit-secrets.js` verified working tree (100 files) and git history (14 commits) with **0 secrets**.

### 1.2 Current Turni Implementation Analysis
Direct inspection of files in `src/pages/TurniPulizia/` reveals:
1. **`src/pages/TurniPulizia/viewTurni.js`**:
   - Lines 21–25: Queries all turni strictly scoped to `userData.casaId`:
     ```javascript
     const q = query(collection(db, "turni"), where("casaId", "==", userData.casaId));
     const querySnapshot = await getDocs(q);
     const data = querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
     data.sort((a, b) => new Date(a.data) - new Date(b.data));
     ```
   - Lines 121–185: Renders each shift in a card (`.calendar-agenda-card`) with date badge, `luoghi`, `nomi`, `fasciaOraria`, and optional `procedura`.
   - Lines 123–129: Past shifts are merely dimmed (`style={{ opacity: isPast ? 0.7 : 1 }}`). There is **no completion state**, **no sub-task checklist**, and **no rotation mechanism**.
2. **`src/pages/TurniPulizia/aggiuntaTurno.js`**:
   - Lines 41–48: Roommates fetched via `query(collection(db, "utenti"), where("casaId", "==", userData.casaId))`, pulling only `d.data().username`.
   - Lines 118–128: Stored payload structure in Firestore collection `turni`:
     ```javascript
     const turnoDaInviare = {
       nomi: cleanedNomi, // string[]
       data: dateValidation.date, // "YYYY-MM-DD"
       luoghi: cleanedLuoghi, // string[]
       procedura: cleanedProcedura, // string[]
       fasciaOraria: [turno.fasciaOraria], // string[]
       casaId: userData.casaId,
       utenteId: currentUser.uid, // creator uid
       mansione: cleanedLuoghi.join(", ")
     };
     ```
   - Shifts are strictly one-off static calendar events with no recurrence schedule or rotation queue.
3. **`src/pages/TurniPulizia/modificaTurno.js`**:
   - Lines 51–56: Verifies multi-tenant access (`data.casaId === userData.casaId`).
   - Lines 113–121: Updates fields in place; does not manage recurrence or sub-task states.
4. **`src/pages/homeUtente.js`**:
   - Line 58: Filter for upcoming personal chore:
     ```javascript
     if (data.utenteId === currentUser.uid && data.data >= oggi) {
       mieiTurni.push(item);
     }
     ```
     *Critical bug identified in current implementation*: When user A creates a shift assigned to user B (`nomi: ['Luca']`), `utenteId` is set to user A (`currentUser.uid`). Consequently, `mieiTurni` for user B does not match because it only compares `data.utenteId === currentUser.uid` instead of checking `data.nomi?.includes(userData?.username)`.

### 1.3 Household & User Profiles Schema Analysis
1. **`case/{casaId}` (`src/pages/SceltaCasa.js` & `firestore.rules`)**:
   - Document contains: `nome: string`, `codiceUnivoco: string (6 chars)`, `creatoreId: string`, `createdAt: Date`.
   - `firestore.rules` (lines 100–105) permits updating `case/{casaId}` by any household member if `nome` is valid and `creatoreId` + `codiceUnivoco` remain immutable. Additional configuration fields like `impostazioniTurni` are fully permitted by rules.
2. **`utenti/{userId}` (`src/contexts/AuthContext.js` & `firestore.rules`)**:
   - Document contains: `username: string`, `email: string`, `casaId: string | null`, `createdAt: Date`.
   - `AuthContext.js` loads `userDoc.data()` into `userData` state.
   - Currently, there are **no vacation fields** (`inVacanza`, `vacanzaInizio`, `vacanzaFine`).

### 1.4 Security & Validation (`src/utils/security.js`)
- `sanitizeText(str, maxLen)` (lines 18–37): Strips null bytes, HTML/XML tags, dangerous URI schemes, and normalizes whitespace.
- `validateDate(dateStr, minYear, maxYear)` (lines 157–187): Strictly parses `YYYY-MM-DD` between 2020 and 2100 with leap year / month day count validation.
- `sanitizeList(list, maxItems, maxLen)` (lines 197–211): Trims and sanitizes array entries.

---

## 2. Logic Chain

### 2.1 Configurable Automatic Rotation Design

```
[Observation: One-off shifts]
  --> Need recurring schedule defined at household level
  --> Store configuration on `case/{casaId}.impostazioniTurni`
  --> Establish deterministic round-robin queue over active roommates
  --> Trigger rotation on cycle boundary (week start) or chore completion
```

#### A. House Settings Data Model (`case/{casaId}`)
```typescript
interface ImpostazioniTurni {
  rotazioneAutomatica: boolean;        // Enable/disable periodic rotation
  frequenza: "settimanale" | "bisettimanale" | "mensile"; // Default: "settimanale" (7 days)
  giornoRotazione: number;             // 1 = Lunedì (ISO 8601 standard), default Monday
  intervalloGiorni: number;            // 7, 14, or 28
  ordineRotazione: string[];           // Deterministic array of user IDs [uid_1, uid_2, ...]
  ultimoCicloId?: string;              // Format "YYYY-Www" or "YYYY-MM-DD" of last run
  ultimoAggiornamento?: string;        // ISO timestamp
}
```

#### B. Trigger Mechanism Analysis
We evaluated three trigger models for a client-side Firebase PWA:
1. **Time-Boundary Trigger (Passive Cycle Check upon Dashboard/Turni Visit)**:
   - When any roommate opens `homeUtente.js` or `viewTurni.js`, an idempotency check `checkAndTriggerTurniRotation(casa, roommates, turni)` runs.
   - If `rotazioneAutomatica === true` and the current date/week exceeds `ultimoCicloId`:
     - Calculate target date for the new shift cycle (e.g., next Monday).
     - Select template chores (active recurring shift types or recurring tasks).
     - Compute the next assignee using the round-robin queue.
     - Atomically write the new `turni` document(s) and update `ultimoCicloId` on `case/{casaId}`.
   - *Advantage*: Zero server infrastructure needed; fully compatible with Firebase Client SDK & Mock Harness.
2. **Chore Completion Trigger (Progressive Handoff)**:
   - When a roommate marks a recurring shift as completed (or checks off 100% of checklist sub-tasks), the next occurrence of that specific chore is automatically spawned for the next interval (`+7` days), assigned to the next active roommate in queue.
3. **On-Demand Manual Trigger ("Ruota Turni Adesso")**:
   - Button in `viewTurni.js` toolbar: Allows immediate rotation or dry-run preview by any house member.

**Recommended Unified Strategy**:
Combine **Chore Completion / Time-Boundary** with **On-Demand Manual Action**. The chore entity stores `ricorrente: boolean` and `frequenza: "settimanale"`. When marked completed OR when the cycle ends, the next rotation executes automatically.

#### C. Deterministic Round-Robin Algorithm (with Vacation Skipping)
```javascript
/**
 * Calculates the next assignee for a chore, deterministically rotating
 * through active roommates while skipping anyone on vacation.
 *
 * @param {Array<{ uid: string, username: string, inVacanza?: boolean, vacanzaInizio?: string, vacanzaFine?: string }>} roommates
 * @param {string[]} ordineRotazione - Explicit list of UIDs or fallback to sorted UIDs
 * @param {string} ultimoAssegnatarioUid - UID of the last person who held the shift
 * @param {string} dataTurno - Date of the target shift ("YYYY-MM-DD")
 * @returns {{ assignee: object | null, isAllOnVacation: boolean }}
 */
export function calcolaProssimoAssegnatario(roommates, ordineRotazione, ultimoAssegnatarioUid, dataTurno) {
  if (!roommates || roommates.length === 0) {
    return { assignee: null, isAllOnVacation: false };
  }

  // 1. Establish deterministic ordering (by explicit list or alphabetical username)
  const orderedRoommates = [...roommates].sort((a, b) => {
    if (ordineRotazione && ordineRotazione.length > 0) {
      const idxA = ordineRotazione.indexOf(a.uid);
      const idxB = ordineRotazione.indexOf(b.uid);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    }
    return (a.username || "").localeCompare(b.username || "");
  });

  const total = orderedRoommates.length;
  const lastIndex = orderedRoommates.findIndex(r => r.uid === ultimoAssegnatarioUid);
  const startIndex = (lastIndex >= 0) ? (lastIndex + 1) % total : 0;

  // 2. Scan queue for first available roommate not on vacation for dataTurno
  for (let i = 0; i < total; i++) {
    const candidateIdx = (startIndex + i) % total;
    const candidate = orderedRoommates[candidateIdx];

    const isAway = isUserOnVacation(candidate, dataTurno);
    if (!isAway) {
      return { assignee: candidate, isAllOnVacation: false };
    }
  }

  // 3. Edge Case: ALL roommates are on vacation
  return { assignee: null, isAllOnVacation: true };
}
```

---

### 2.2 Vacation / Away Mode ("In Vacanza / Fuori Casa")

#### A. User Profile Data Model (`utenti/{userId}`)
```typescript
interface UtenteVacanzaProfile {
  inVacanza: boolean;            // Vacation mode toggle
  vacanzaInizio: string | null;  // Format "YYYY-MM-DD"
  vacanzaFine: string | null;    // Format "YYYY-MM-DD"
  motivoAssenza?: string | null; // Optional sanitized note (e.g. "Esami", "Viaggio")
  aggiornatoIl?: string;         // ISO timestamp
}
```
*Why `YYYY-MM-DD` strings over Firestore Timestamp*:
1. Direct compatibility with HTML `<input type="date">`.
2. Perfectly validated by `validateDate(str)` in `src/utils/security.js`.
3. Immune to timezone serialization offsets during headless testing in `mockFirebase.js`.
4. Consistent with `data` field in `turni` collection.

#### B. Active Vacation Check Helper
```javascript
export function isUserOnVacation(user, targetDateStr) {
  if (!user || !user.inVacanza) return false;
  const checkDate = targetDateStr || new Date().toISOString().split("T")[0];
  
  if (user.vacanzaInizio && user.vacanzaFine) {
    return checkDate >= user.vacanzaInizio && checkDate <= user.vacanzaFine;
  }
  if (user.vacanzaInizio) {
    return checkDate >= user.vacanzaInizio;
  }
  if (user.vacanzaFine) {
    return checkDate <= user.vacanzaFine;
  }
  return true; // inVacanza is true with open dates
}
```

#### C. Dashboard UI Controls (`homeUtente.js`)
- Located in `homeUtente.js` inside a dedicated card **"Stato Presenza & Vacanza"** or an integrated drawer in `bento-account`:
  - Toggle Switch: `Modalità Fuori Casa / In Vacanza` (checked = `inVacanza: true`).
  - Expanding Form:
    - Start date: `<input type="date" name="vacanzaInizio" value={vacanzaInizio} />`
    - End date: `<input type="date" name="vacanzaFine" value={vacanzaFine} min={vacanzaInizio} />`
  - Action Button: `<button className="btn-primary" onClick={salvaStatoVacanza}>Aggiorna Stato</button>`.
  - Presence Indicator in `HouseholdStatus.js`:
    Displays roommate status chips:
    - Active: `<span className="status-chip active"><i className="fas fa-check"></i> Presente</span>`
    - Away: `<span className="status-chip away"><i className="fas fa-plane-departure"></i> In Vacanza fino al {vacanzaFine}</span>`

#### D. Exclusion Logic & Edge Cases
1. **Shift Creation (`aggiuntaTurno.js`)**:
   - Roommate chips display visual indicator when a user is away:
     `<button className="roommate-chip is-away" title="In vacanza dal X al Y">Luca (Fuori Casa)</button>`
   - If selected, display warning: *"Luca risulta in vacanza nella data del turno. Confermi l'assegnazione?"*
2. **Automatic Rotation**:
   - Deterministic round-robin queue automatically skips away members as specified in Section 2.1.
3. **EDGE CASE: All Roommates on Vacation**:
   - If every registered roommate is on vacation for the designated period:
     - Shift is created with `sospeso: true`.
     - `nomi: ["Casa Chiusa / Sospeso"]`.
     - `utenteId: null` or household creator.
     - Displays amber warning banner on `viewTurni.js`:
       *"Tutti i coinquilini risultano in vacanza in questa data. Il turno di pulizia è temporaneamente sospeso."*
     - No penalties or missed shift alerts are fired during suspension.

---

### 2.3 Detailed Sub-Task Checklist

#### A. Data Model (`turni/{turnoId}`)
```typescript
interface ChecklistSubTask {
  id: string;              // e.g. "sub_1730680000000_1"
  text: string;            // Sanitized description, max 100 chars
  completed: boolean;      // Status flag
  completedBy?: string;    // Username who checked off the item
  completedAt?: string;    // ISO timestamp "2026-11-04T12:00:00Z"
}

// Added to Turno Document in Firestore:
interface TurnoDocument {
  // Existing fields
  casaId: string;
  data: string;
  luoghi: string[];
  nomi: string[];
  fasciaOraria: string[];
  procedura: string[];
  utenteId: string;
  mansione: string;
  
  // New Milestone M7 fields
  checklist: ChecklistSubTask[]; // Array of sub-tasks
  completato: boolean;           // true if 100% of tasks done or manually marked
  completatoIl?: string;         // Completion timestamp
  ricorrente?: boolean;          // Automatic rotation flag
  frequenza?: "settimanale" | "bisettimanale" | "mensile";
  sospeso?: boolean;             // True if all members away
}
```

#### B. Zone Preset Recommendations
To maximize speed and usability, preset checklists auto-suggest based on selected `luoghi`:
| Zone | Recommended Sub-Tasks |
|------|------------------------|
| **Cucina** | Pulire fornelli e piano cottura; Lavare e disinfettare lavello; Svuotare pattumiera organico; Passare lo straccio a terra |
| **Bagno** | Igienizzare wc e bidet; Pulire doccia o vasca; Lavare specchio e lavabo; Sostituire asciugamani e passare pavimento |
| **Salotto** | Spolverare superfici e libreria; Passare aspirapolvere sul divano; Lavare pavimento; Svuotare cestino carta |
| **Corridoio / Ingresso** | Riordinare scarpiera; Spolverare mobili ingresso; Passare aspirapolvere e straccio |
| **Pattumiera / Rifiuti** | Differenziare umido, plastica, carta; Lavare bidoni interni; Posizionare nuovi sacchetti |

#### C. Sanitization & Anti-XSS (`src/utils/security.js`)
New helper function specification:
```javascript
/**
 * Sanitizes an array of checklist items, stripping HTML/scripts and enforcing bounds.
 *
 * @param {Array} checklist
 * @param {number} maxItems - Maximum items per shift (default 20)
 * @param {number} maxTextLen - Maximum characters per item (default 100)
 * @returns {Array<{ id: string, text: string, completed: boolean, completedBy: string|null, completedAt: string|null }>}
 */
export function sanitizeChecklist(checklist, maxItems = 20, maxTextLen = 100) {
  if (!Array.isArray(checklist)) return [];
  return checklist
    .map((item, idx) => {
      if (!item || typeof item !== "object") return null;
      const text = sanitizeText(item.text, maxTextLen);
      if (!text) return null;
      return {
        id: String(item.id || `chk_${Date.now()}_${idx}`).slice(0, 40),
        text,
        completed: Boolean(item.completed),
        completedBy: item.completedBy ? sanitizeText(item.completedBy, 50) : null,
        completedAt: item.completedAt ? String(item.completedAt).slice(0, 30) : null
      };
    })
    .filter(Boolean)
    .slice(0, maxItems);
}
```

#### D. Real-Time Synchronization & Concurrency Control
- **Atomic Field Update via `updateDoc`**:
  To prevent race conditions where roommate A marks "Pulire fornelli" and roommate B marks "Svuotare cestino" concurrently:
  - React state uses functional updates: `setTurni(prev => prev.map(...))` for instant local UI response (< 16ms).
  - Persistence call writes strictly the `checklist` and `completato` fields:
    ```javascript
    await updateDoc(doc(db, "turni", turnoId), {
      checklist: updatedChecklist,
      completato: allItemsDone,
      completatoIl: allItemsDone ? new Date().toISOString() : null
    });
    ```
  - Because `updateDoc` merges only the specified keys, other chore fields (`data`, `nomi`, `luoghi`, `fasciaOraria`) are never overwritten.
  - If a write fails, the UI rolls back optimistic state and shows `showToast("Errore durante l'aggiornamento della checklist", "error")`.

---

### 2.4 Testing & Mock Harness Impact

#### A. Additions to `src/test/mockFirebase.js`
- `MockFirestoreStore`:
  - `updateDoc` already handles partial dictionary merging cleanly:
    ```javascript
    this.collections[collName][id] = { ...this.collections[collName][id], ...processed };
    ```
  - `getDocs` supports `==`, `!=`, `<`, `<=`, `>`, `>=`, `array-contains`, `in`.
  - For tests involving vacation mode and rotation, `seedHousehold` in `src/test/testUtils.jsx` should be updated to support seeding `inVacanza: boolean`, `vacanzaInizio: string`, `vacanzaFine: string` on test users.

#### B. Additions to `firestore.rules`
The current rules allow arbitrary fields on `turni` and `utenti` as long as required fields pass. To provide military-grade anti-tamper security, the following explicit constraints should be added:
```
// In match /utenti/{userId} update:
&& (!('inVacanza' in request.resource.data) || request.resource.data.inVacanza is bool)
&& (!('vacanzaInizio' in request.resource.data) || request.resource.data.vacanzaInizio == null || isValidDateString(request.resource.data.vacanzaInizio))
&& (!('vacanzaFine' in request.resource.data) || request.resource.data.vacanzaFine == null || isValidDateString(request.resource.data.vacanzaFine))

// In match /turni/{turnoId} update:
&& (!('checklist' in request.resource.data) || (request.resource.data.checklist is list && request.resource.data.checklist.size() <= 30))
&& (!('completato' in request.resource.data) || request.resource.data.completato is bool)
```

#### C. Test Inventory to Author for R2
1. **Tier 1 Feature Tests (`src/test/tier1_features/turni.test.jsx`)**:
   - `T1.15`: Renders checklist items inside chore card; checking a sub-task updates state and persists to Firestore.
   - `T1.16`: VisualizzaTurni displays completed shift badge when 100% of sub-tasks are checked.
   - `T1.17`: AggiuntaTurno creates chore with custom checklist items and frequency.
   - `T1.18`: Roommate toggles vacation mode in dashboard (`homeUtente.js`), persisting `inVacanza` and dates to `utenti/{userId}`.
2. **Tier 2 Boundary Tests (`src/test/tier2_boundaries/turni_boundary.test.jsx`)**:
   - `T2.13`: Anti-XSS check on checklist items — `<script>` and `javascript:` payloads are completely stripped.
   - `T2.14`: Vacation date boundary validation — rejects invalid dates or `vacanzaFine < vacanzaInizio`.
   - `T2.15`: Deterministic round-robin rotation skips away roommates and selects the next active roommate.
   - `T2.16`: Edge case — All roommates on vacation suspends chore creation and renders amber warning state.
3. **Tier 3 Cross-Feature Integration (`src/test/tier3_interactions/cross_feature.test.jsx`)**:
   - `T3.08`: Vacation toggle in profile immediately updates assignee availability in `AggiuntaTurno` and rotation algorithm.
   - `T3.09`: Checklist completion on recurring chore automatically spawns next cycle shift for next roommate.

---

## 3. Caveats
1. **Client-Side Trigger vs. Scheduled Background Cron**:
   - In a pure client-side Firebase static web app (CRA/PWA) without a running Cloud Functions Node daemon, automatic time-boundary rotation executes upon application load/navigation. If no user opens the application during a week, rotation executes immediately on the first visit of the new week. This is standard for client-side architectures and requires no server costs.
2. **Existing Shift Assignee Check in `homeUtente.js`**:
   - As noted in Section 1.2, `homeUtente.js` currently checks `if (data.utenteId === currentUser.uid)`. When implementing R2, this check must be updated to:
     `if ((data.utenteId === currentUser.uid || data.nomi?.includes(userData?.username)) && data.data >= oggi)`
     so roommates assigned to shifts created by others or created by rotation see their chores on their dashboard.
3. **No emojis or unicode icons in checklist checkboxes or status indicators**:
   - Must strictly use FontAwesome SVG icons (e.g. `far fa-square`, `fas fa-check-square`, `fas fa-plane-departure`, `fas fa-tasks`). Zero raw unicode emojis or text emoticons.

---

## 4. Conclusion
Requirement R2 is thoroughly investigated, structurally designed, and ready for clean implementation:
1. **Configurable Rotation**: Cleanly modeled via `impostazioniTurni` on `case/{casaId}`, driven by a deterministic round-robin algorithm respecting vacation status and cycle boundaries.
2. **Vacation Mode**: Modeled via `inVacanza`, `vacanzaInizio`, `vacanzaFine` on `utenti/{userId}`, with UI controls in `homeUtente.js` and complete edge-case handling for whole-house absences.
3. **Sub-Task Checklist**: Structured as `checklist: [{ id, text, completed, completedBy, completedAt }]` on `turni/{turnoId}`, with instant optimistic UI, zone-based presets, and `sanitizeChecklist` anti-XSS protection.
4. **Harness & Verification**: Compatible with `MockFirestoreStore`, with 7 targeted automated tests specified across Tier 1, Tier 2, and Tier 3 suites.

---

## 5. Verification Method

To independently verify all findings and validate future implementation:

### 5.1 Verification Commands
```bash
# 1. Project Directory Navigation
cd /home/daniele949/Desktop/Cose/HouseHelper/househelper

# 2. Run Full Test Suite (must remain 100% passing)
CI=true npm test -- --watchAll=false

# 3. Verify Zero Emojis / Emoticons (must return 0 violations)
npm run check:emojis

# 4. Verify Zero Circular Dependencies (must return 0 cycles)
npm run check:circular

# 5. Audit Secrets (must return 0 secrets)
npm run audit:secrets

# 6. Production Build Check (must compile cleanly with 0 errors)
npm run build
```

### 5.2 Files to Inspect
- `src/pages/TurniPulizia/viewTurni.js`
- `src/pages/TurniPulizia/aggiuntaTurno.js`
- `src/pages/TurniPulizia/modificaTurno.js`
- `src/pages/homeUtente.js`
- `src/utils/security.js`
- `firestore.rules`
- `src/test/tier1_features/turni.test.jsx`
- `src/test/tier2_boundaries/turni_boundary.test.jsx`

### 5.3 Invalidation Conditions
- Introduction of any Unicode emoji or text emoticon character in UI, labels, or test files.
- Circular imports between `TurniPulizia` modules and `src/App.js`.
- Breaking any of the 280 existing automated tests.
- Storing un-sanitized checklist text allowing HTML/script tag injection.
- Unhandled runtime crash when all roommates are in vacation mode.
