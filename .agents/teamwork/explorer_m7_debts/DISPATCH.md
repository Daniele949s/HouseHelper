## 2026-11-04T00:11:37Z
You are Explorer 1 (explorer_m7_debts) for Milestone M7 of HouseHelper.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts/
Your task is a READ-ONLY technical investigation of Requirement R1: Finanza & Spese Intelligenti (senza OCR).

MANDATORY: Read the full user request first at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
Also inspect /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md

Investigate and document:
1. Debt Simplification Algorithm:
   - Analyze the current data model in Firestore and local state for debts and expenses in `src/pages/Debiti/ViewDebiti.js`, `src/pages/Debiti/AggiungiDebito.js`, and `src/pages/Spesa/ViewSpesa.js`.
   - Design a robust Debt Simplification algorithm (e.g. net balance calculation per roommate, greedy bipartite settlement matching positive balances with negative balances to minimize the total number of transactions to zero out debts).
   - Ensure edge cases are handled: single debtor, circular debts (A->B->C->A), zero net balances, rounding errors / cent-level precision (use integer cents or safe rounding to prevent floating-point drift).
2. Custom Split Modes:
   - How to support 4 split modes:
     a) Equal split (parti uguali)
     b) Custom fixed amounts per roommate (quote fisse personalizzate) with validation that sum(amounts) === total amount
     c) Percentages per roommate (percentuali) with validation that sum(percentages) === 100% and precise cent allocation
     d) Member exclusions (escludendo coinquilini specifici, splitting remainder equally or proportionally among included members).
   - Anti-tamper & security: preventing negative amounts, non-numeric values, division by zero, float inaccuracies.
   - UI changes needed in `AggiungiDebito.js` (and any related expense form) without emojis (vector SVG icons only).
3. PDF and CSV Export of Monthly Expense Reports:
   - Client-side report generation for monthly expenses and debt summaries.
   - Investigate libraries or native generation: check `package.json` to see what is currently installed. If jsPDF or similar is installed or if standard clean client-side CSV (Blob/data URI) and formatted printable PDF / window.print / styled HTML-to-PDF / lightweight PDF generation can be done without adding heavy or vulnerable dependencies.
   - Export structure: household name, month/year, total spent, breakdown by payer, debt settlement summary, transaction details.
4. Testing & Mock Harness impact:
   - Identify what additions are needed in `src/test/mockFirebase.js` and test suites to verify debt simplification, split validation, and export triggers.

Output:
Write your structured findings to `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts/handoff.md`.
Update `progress.md` with your status.
When finished, send a message to the orchestrator.
