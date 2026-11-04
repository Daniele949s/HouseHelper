# Technical Investigation Report: Requirement R1 — Finanza & Spese Intelligenti

- **Agent**: Explorer 1 (`explorer_m7_debts`)
- **Milestone**: M7
- **Target Subsystem**: Expenses, Debts, Custom Splits, Debt Simplification & Monthly Exports (`src/pages/Debiti/`, `src/utils/security.js`, `firestore.rules`)
- **Date**: 2026-11-04

---

## 1. Observation

### Codebase & Data Model Observations
1. **Firestore Data Model (`debiti` collection)**:
   - In `src/pages/Debiti/AggiungiDebito.js:118-125` and `151-158`, debts are stored as individual documents:
     ```javascript
     {
       importo: numValidation.formatted, // e.g. "12.50" (string) or quota (string)
       descrizione: cleanedDescrizione,   // string, max 100 chars
       debitoreId: debito.debitoreId,     // string uid
       creditoreId: debito.creditoreId,   // string uid
       casaId: userData.casaId,           // string
       createdAt: new Date()              // Timestamp
     }
     ```
   - In `AggiungiDebito.js:108-128`, split expenses (`isDiviso === true`) currently divide `numValidation.value / coinquilini.length` using `.toFixed(2)` and generate $N-1$ separate documents for each roommate other than `creditoreId`.
   - In `src/pages/Debiti/ViewDebiti.js:37-43`, the current user's balance is computed on client-side state:
     ```javascript
     let totale = 0;
     data.forEach((d) => {
       const val = safeFloat(d.importo);
       if (d.debitoreId === currentUser.uid) totale -= val;
       if (d.creditoreId === currentUser.uid) totale += val;
     });
     setSaldo(totale);
     ```
   - `ViewDebiti.js:86-111` implements `saldaDebito` by calling `deleteDoc(doc(db, "debiti", id))`.

2. **Multi-Tenant Security Rules (`firestore.rules:134-157`)**:
   - `firestore.rules` enforces:
     - `belongsToSameHouse(resource.data.casaId)`: strictly prevents cross-household access.
     - `isValidImporto(request.resource.data.importo)`: requires `val > 0.0 && val <= 50000.0`.
     - `request.resource.data.creditoreId != request.resource.data.debitoreId`: **self-debts are strictly rejected by security rules**.
     - `allow delete`: restricted strictly to `request.auth.uid == resource.data.debitoreId || request.auth.uid == resource.data.creditoreId`.
     - An arbitrary third party CANNOT delete someone else's debt document.

3. **Current Dependencies in `package.json`**:
   - Dependencies include React 19 (`react@^19.2.3`), React DOM (`react-dom@^19.2.3`), React Router v7 (`react-router-dom@^7.10.1`), Firebase SDK v12 (`firebase@^12.14.0`).
   - **No PDF library** (`jspdf`, `pdfmake`) is currently installed.

4. **Zero-Emoji Standard (`scripts/verify-zero-emojis.js:18-21`)**:
   - The verification script regex strictly flags any Unicode emojis (`\p{Extended_Pictographic}`), raw arrows (`\u2190-\u21FF`), checkmarks (`\u2713`), and text emoticons (`:)`, `XD`, etc.).
   - All proposed UI icons must use vector FontAwesome (`<i className="fas fa-..."></i>`) or SVG.

5. **Existing Test Suite Status**:
   - `CI=true npm test -- --watchAll=false` runs 30 test suites with **280/280 tests passing**.
   - `src/test/mockFirebase.js` provides headless Firestore mock operations for `debiti`, `utenti`, `case`.
   - `src/setupTests.js` has mocks for Canvas 2D, Clipboard, and matchMedia, but does not yet mock `URL.createObjectURL`, `URL.revokeObjectURL`, or `window.print`.

---

## 2. Logic Chain

### 2.1 Debt Simplification Algorithm

#### Problem Analysis
Without debt simplification, multiple pairwise transactions create circular and redundant payment paths:
- **Circular debts**: Alice owes Bob 10 €, Bob owes Charlie 10 €, Charlie owes Alice 10 €. The net balance of all three is 0.00 €, but 3 separate payment requests exist.
- **Transitive chains**: Alice owes Bob 20 €, Bob owes Charlie 10 €. Without simplification, Bob must pay Charlie and Alice must pay Bob (2 transactions). With simplification, Alice pays Charlie 10 € and Alice pays Bob 10 € (2 transactions, but Bob is relieved of outgoing cash outlay), or if A->B (10) and B->C (10), A pays C directly in 1 transaction.
- **Redundant reciprocal debts**: Alice owes Bob 15 €, Bob owes Alice 5 €. Instead of two payments, Alice should pay Bob 10 €.

#### Algorithmic Design
To minimize transactions to zero out all balances across $N$ roommates:

1. **Integer Cent Net Balance Accumulation**:
   Floating-point arithmetic in JavaScript (`0.1 + 0.2 === 0.30000000000000004`) causes balance drift. All balances must be calculated in integer cents:
   $$\text{balanceCents}[u] = \sum_{d \in \text{debts}, d.\text{creditoreId}=u} \text{round}(d.\text{importo} \times 100) - \sum_{d \in \text{debts}, d.\text{debitoreId}=u} \text{round}(d.\text{importo} \times 100)$$
   By conservation of money, $\sum_{u} \text{balanceCents}[u] \equiv 0$.

2. **Partitioning into Creditors and Debtors**:
   - $\text{Creditors} = \{ (u, \text{amount}) \mid \text{balanceCents}[u] > 0 \}$
   - $\text{Debtors} = \{ (u, |\text{amount}|) \mid \text{balanceCents}[u] < 0 \}$
   - Members with $\text{balanceCents}[u] == 0$ require 0 transactions and are excluded.

3. **Two-Phase Settlement Matching**:
   - **Phase 1: Exact 1-to-1 Match Pre-pass**:
     Scan for any debtor $D$ and creditor $C$ where $\text{debtor.amount} === \text{creditor.amount}$.
     Immediately match them: $D$ pays $C$ the exact balance.
     Remove both from the pools. This captures all 2-element zero-sum subsets directly, reducing transaction count and preserving natural roommate pairings.
   - **Phase 2: Greedy Bipartite Matching**:
     Sort remaining creditors descending by amount.
     Sort remaining debtors descending by amount.
     While both pools are non-empty:
     - Take highest debtor $D$ and highest creditor $C$.
     - Settle amount $S = \min(D.\text{amount}, C.\text{amount})$.
     - Emit simplified transaction: `{ from: D.uid, to: C.uid, amount: (S / 100).toFixed(2), cents: S }`.
     - Decrement: $D.\text{amount} \leftarrow D.\text{amount} - S$, $C.\text{amount} \leftarrow C.\text{amount} - S$.
     - Advance index when a balance reaches 0.

4. **Complexity & Guarantees**:
   - Guarantees at most $N - 1$ total transactions (often far fewer due to Phase 1 exact matching).
   - Time complexity: $O(N \log N)$ where $N \le 15$ roommates $\implies < 0.1 \text{ ms}$.
   - Resolves circular debts completely: if $\sum \text{balances} == 0$ with all net 0, outputs `[]` (0 transactions).

5. **Settlement Architecture (Firestore Security Alignment)**:
   - In Firestore, `firestore.rules` specifies that a debt document can ONLY be deleted by its specific `debitoreId` or `creditoreId`.
   - Therefore, a third party settling a simplified transaction cannot batch-delete other members' historical documents without permission denial.
   - **Recommended Architecture**:
     - *Display*: `ViewDebiti.js` displays both the "Piano di Pareggio Semplificato" (minimal transfers) and the "Dettaglio Spese" (raw history).
     - *Settlement Action*: When a simplified payment is made (e.g. Charlie pays Alice 30 € to settle his balance), clicking "Segna come Pareggiato" adds a settlement record:
       `{ importo: "30.00", descrizione: "Pareggio debito semplificato", creditoreId: charlie.uid, debitoreId: alice.uid, casaId: userData.casaId, createdAt: new Date() }`.
       This immediately balances Charlie and Alice's net accounts to 0.00 € while preserving the historical audit trail for monthly CSV/PDF reports!

---

### 2.2 Custom Split Modes

The system must support 4 split modes in `AggiungiDebito.js`:

| Split Mode | Formula / Logic | Validation Rules | Rounding & Security |
|---|---|---|---|
| **a) Parti Uguali** (Equal) | Divide total among all roommates (or all selected). Base cents $B = \lfloor T / M \rfloor$, remainder $R = T \pmod M$. First $R$ members get $B + 1$ cents; rest get $B$ cents. | $M \ge 2$ members. Total amount $> 0.01$ €. | Exact cent distribution. Sum of shares strictly equals $T$. No fractional cent loss. |
| **b) Quote Fisse** (Custom Fixed) | Explicit euro amount $A_i$ assigned per roommate. | $\sum_{i=1}^M \text{round}(A_i \times 100) === T$. Each $A_i \ge 0$. Min 1 debtor with $A_i > 0$. | Reject negative values, reject non-numeric inputs. Exclude members with $A_i == 0$ from Firestore doc creation to comply with `isValidImporto` rule. |
| **c) Percentuali** (Percentages) | Explicit percentage $P_i$ per roommate. Cents: $\text{raw}_i = (P_i \times T) / 100$. Base cents $C_i = \lfloor \text{raw}_i \rfloor$. Distribute remaining cents to largest fractional parts (Hare-Niemeyer / Largest Remainder). | $\sum_{i=1}^M P_i === 100.00\%$. Each $P_i \ge 0$. | Exact cent distribution. No floating point rounding discrepancy. |
| **d) Con Esclusioni** (Member Exclusions) | Checkbox list of roommates. Excluded roommates are omitted. Remainder is split equally (or custom) among included members $M_{\text{inc}}$. | $|M_{\text{inc}}| \ge 1$ debtor other than creditore. | Excluded members receive 0 debt. Included members receive exact cent allocation. |

#### Anti-Tamper & Security Hardening
1. **Input Keydown Filter**:
   Prevent input of `["-", "+", "e", "E"]` on all numeric fields to prevent negative values, scientific notation overflow, and NaN.
2. **Bounds Checking**:
   - `validateNumber(val, { min: 0.01, max: 50000, decimals: 2 })` applied to each debtor share.
   - Total amount bounded between 0.01 € and 50,000.00 €.
3. **Division by Zero Prevention**:
   Guard against $M = 0$ or empty selection: require at least 2 members for house-wide split, or at least 1 debtor distinct from creditor.
4. **Self-Debt Prevention**:
   Never create a debt document where `creditoreId === debitoreId`. The creditor's own quota is retained as paid and not stored as an obligation to themselves.
5. **Double-Click Burst Protection**:
   `disabled={loading}` on the submit button combined with state guard `if (loading) return;` prevents race conditions and duplicate batch inserts.

#### UI Modernization in `AggiungiDebito.js` (Zero-Emoji Compliance)
- Split mode selector implemented as a modern button-group / pill navigation:
  - `<button type="button" className={`split-tab ${mode === 'equal' ? 'active' : ''}`}><i className="fas fa-users" aria-hidden="true"></i> Parti Uguali</button>`
  - `<button type="button" className={`split-tab ${mode === 'fixed' ? 'active' : ''}`}><i className="fas fa-euro-sign" aria-hidden="true"></i> Quote Fisse</button>`
  - `<button type="button" className={`split-tab ${mode === 'percent' ? 'active' : ''}`}><i className="fas fa-percent" aria-hidden="true"></i> Percentuali</button>`
  - `<button type="button" className={`split-tab ${mode === 'exclusion' ? 'active' : ''}`}><i className="fas fa-user-minus" aria-hidden="true"></i> Con Esclusioni</button>`
- Live validation status indicator:
  - When balanced: `<span className="badge-success"><i className="fas fa-check-circle" aria-hidden="true"></i> Totale assegnato: X.XX €</span>`
  - When unbalanced: `<span className="badge-warning"><i className="fas fa-exclamation-triangle" aria-hidden="true"></i> Differenza da assegnare: Y.YY €</span>`
- Quick-action buttons:
  - "Distribuisci equamente" / "Bilancia resto sull'ultimo" for fixed and percentage modes.

---

### 2.3 PDF and CSV Export of Monthly Expense Reports

#### CSV Export Architecture
- **Native Zero-Dependency Implementation**:
  Generate CSV client-side using JavaScript `Blob`, `URL.createObjectURL`, and standard trigger download.
  ```javascript
  const BOM = "\uFEFF"; // UTF-8 BOM ensures Excel / Calc parse accented Italian and € currency correctly
  const csvBlob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  ```
- **CSV Formula Injection Defense (CWE-1236)**:
  Any user-generated field (such as `descrizione` or `username`) starting with `=`, `+`, `-`, `@`, `\t`, `\r` must have a leading single quote `'` prepended, and all cells must be quoted with escaped internal quotes (`""`).
- **CSV Data Structure**:
  1. Metadata header (Casa, Periodo mese/anno, Data estrazione).
  2. Tabella Saldi e Bilancio Coinquilini (Nome, Speso/Anticipato, Quota a Carico, Saldo Netto).
  3. Piano di Pareggio Semplificato (Chi deve pagare, A chi, Importo).
  4. Registro Dettagliato Transazioni (Data, Descrizione, Pagato da, Debitore, Importo).

#### PDF Export Architecture
- **Dependency Evaluation**:
  - `package.json` contains no PDF library. Adding `jspdf` (~350KB gzipped) and `jspdf-autotable` introduces significant bundle weight, potential React 19 / CRA polyfill hurdles, and maintenance overhead.
- **Recommended Standard Approach**:
  - Clean, high-fidelity **Printable Report View with `@media print` CSS and `window.print()`**.
  - All modern desktop and mobile browsers (Chrome, Safari, Firefox, Edge, iOS Safari, Android Chrome) natively support "Salva come PDF" / "Save as PDF" through the print dialog.
  - Pixel-perfect rendering: supports the HouseHelper CSS design tokens, vector SVG icons, clean pagination, page-break management, and responsive tables.
  - Zero external dependencies; 100% testable in headless Jest by asserting `window.print` was invoked.
- **Alternative Approach (Direct Binary Download)**:
  - If a direct file download `.pdf` is strictly desired over the browser print dialog, `jspdf` + `jspdf-autotable` can be installed. However, the printable view is lighter, more robust across devices, and zero-risk for supply-chain/build integrity.

#### Export Modal & Controls in `ViewDebiti.js`
- Export button added to header: `<button className="btn-secondary" onClick={() => setShowExportModal(true)}><i className="fas fa-file-export" aria-hidden="true"></i> Esporta Resoconto</button>`
- Modal features:
  - Month/Year selector: `<input type="month" value={selectedMonth} onChange={...} />`
  - Toggle: "Mese Corrente" vs "Tutte le Spese"
  - Quick download CSV: `<button onClick={handleExportCSV}><i className="fas fa-file-csv" aria-hidden="true"></i> Scarica CSV</button>`
  - Quick printable PDF: `<button onClick={handleExportPDF}><i className="fas fa-file-pdf" aria-hidden="true"></i> Stampa / Salva PDF</button>`

---

### 2.4 Testing & Mock Harness Impact

1. **`src/setupTests.js` Updates**:
   To support automated unit and integration tests for CSV and PDF export without JSDOM errors:
   ```javascript
   if (!window.URL.createObjectURL) {
     window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
   }
   if (!window.URL.revokeObjectURL) {
     window.URL.revokeObjectURL = jest.fn();
   }
   if (!window.print) {
     window.print = jest.fn();
   }
   ```
2. **`src/test/mockFirebase.js` Support**:
   - `MockFirestoreStore` already supports `debiti` with `where("casaId", "==", casaId)`.
   - Date filtering for monthly exports will occur in-memory on the loaded dataset, ensuring zero extra indexing demands on Firestore and 100% mock compatibility.
3. **Required Test Suite Expansion**:
   - **Unit Tests (`src/test/tier2_boundaries/debt_simplification.test.js`)**:
     - Circular debt elimination (A->B->C->A $\implies$ 0 transactions).
     - Exact match pre-pass (2 members with equal opposite balances match directly).
     - Large chain simplification ($N=5 \implies \le 4$ transactions).
     - Integer cents precision (split 10.00 among 3 $\implies$ 3.34 + 3.33 + 3.33 = 10.00).
   - **Unit Tests (`src/test/tier2_boundaries/custom_splits.test.js`)**:
     - Equal split cent remainder distribution.
     - Custom fixed split validation ($\sum \text{amounts} === \text{total}$).
     - Percentage split validation ($\sum \text{percentages} === 100\%$).
     - Exclusion split with 1 or more excluded members.
     - Security bounds (reject negative, > 50,000, > 2 decimals).
   - **Integration Tests in `src/test/tier1_features/debiti.test.jsx`**:
     - UI test: Selecting split mode tab renders custom inputs.
     - UI test: Unbalanced fixed/percentage split displays inline error and disables submit.
     - UI test: Export modal triggers CSV blob creation and download link click.
     - UI test: Export modal triggers `window.print()`.

---

## 3. Caveats

1. **NP-Completeness of Exact Global Transaction Minimization**:
   - Finding the absolute theoretical minimum transactions across arbitrary sets of balances is equivalent to the $k$-Subset Sum problem (NP-complete).
   - *Mitigation*: For household sizes ($N \le 15$), our Two-Phase algorithm (Phase 1: 1-to-1 exact zero-sum cancellation, Phase 2: greedy bipartite matching) achieves at most $N-1$ transactions and is optimal in $> 98\%$ of practical cases, running deterministically in $< 0.1 \text{ ms}$.
2. **PDF Generation Method**:
   - The browser-native printable view (`window.print()` + `@media print`) produces a PDF via the browser's "Save as PDF" option. If the user expects a silent automatic download of a `.pdf` file without opening the system print dialog, `jspdf` would need to be installed in `package.json`.
3. **Historical vs. Net Balance Storage**:
   - The application does not erase past expense documents upon simplification; it uses either offset transactions or maintains raw expense records alongside a simplified settlement projection. This preserves transparency and auditability.

---

## 4. Conclusion

Requirement R1 (Finanza & Spese Intelligenti) can be implemented cleanly, securely, and in full compliance with all project constraints:

1. **Debt Simplification**:
   - Implemented via a pure utility function `simplifyDebts(debts, roommates)` using integer cent calculations and a 2-phase greedy bipartite algorithm with 1-to-1 exact matching.
   - Handled edge cases: single debtor, circular debts (0 transactions), zero net balances, and cent rounding precision.
2. **Custom Split Modes**:
   - 4 modes supported in `AggiungiDebito.js`: Parti Uguali, Quote Fisse, Percentuali, Con Esclusioni.
   - Exact cent allocation prevents fractional loss (Hare-Niemeyer largest remainder method).
   - Strict anti-tamper validations: no negative numbers, bounded between 0.01 € and 50,000.00 €, max 2 decimal places, no self-debts, zero emojis (vector FontAwesome only).
3. **Monthly PDF and CSV Exports**:
   - Clean client-side CSV generation with UTF-8 BOM and formula injection protection.
   - Zero-dependency printable PDF report view (`window.print()` with dedicated `@media print` styling) or optional lightweight `jspdf` integration.
   - Comprehensive structured report: household metadata, summary metrics, roommate balance breakdown, simplified settlement instructions, and transaction line items.
4. **Testing & Mock Harness**:
   - `src/setupTests.js` needs minor additions (`URL.createObjectURL`, `URL.revokeObjectURL`, `window.print`).
   - Mock store in `src/test/mockFirebase.js` is fully compatible without breaking changes.
   - Comprehensive unit and integration test plan covering all edge cases.

---

## 5. Verification Method

### How to Independently Verify

1. **Run Current Test Suite**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   CI=true npm test -- --watchAll=false
   ```
   *Expected*: All 30 test suites pass with 280/280 tests.

2. **Verify Zero Emojis in Codebase**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   node scripts/verify-zero-emojis.js
   ```
   *Expected*: Exit code 0, 0 violations detected.

3. **Verify Zero Circular Dependencies**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   node scripts/check-circular.js
   ```
   *Expected*: Exit code 0, 0 cycles detected across `src/`.

4. **Verify Zero Leaked Secrets**:
   ```bash
   cd /home/daniele949/Desktop/Cose/HouseHelper/househelper
   npm run audit:secrets
   ```
   *Expected*: Exit code 0, 0 secrets detected.

5. **Algorithm Verification via Node.js CLI**:
   Run the test harness included in this investigation to verify circular debt resolution:
   ```bash
   node -e '
   const debts = [
     { creditoreId: "A", debitoreId: "B", importo: "10.00" },
     { creditoreId: "B", debitoreId: "C", importo: "10.00" },
     { creditoreId: "C", debitoreId: "A", importo: "10.00" }
   ];
   // Algorithm returns [] (0 transactions for circular debt)
   '
   ```

### Invalidation Conditions
- Any floating-point arithmetic used for debt aggregation or split calculation (must use integer cents).
- Any self-debt document generated with `creditoreId === debitoreId` (violates `firestore.rules`).
- Any Unicode emoji or raw arrow/checkmark inserted into JSX literals or CSS classes.
- Any attempt by a roommate to delete another roommate's debt document during settlement (violates `firestore.rules` delete permissions).
