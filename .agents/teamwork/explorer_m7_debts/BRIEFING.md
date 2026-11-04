# BRIEFING — 2026-11-04T00:17:00Z

## Mission
Read-only technical investigation of Requirement R1: Finanza & Spese Intelligenti (senza OCR), covering Debt Simplification, Custom Split Modes, PDF/CSV Export, and Mock/Testing impact.

## 🔒 My Identity
- Archetype: explorer
- Roles: [explorer, investigator, analyst]
- Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts
- Original parent: 539b9b5a-7c33-4552-8b8b-ccb1891086b8
- Milestone: M7

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Vector SVG icons only, NO emojis in UI proposals
- Cent-level precision, anti-tamper & security validations
- Report written to handoff.md; communicate via send_message to parent

## Current Parent
- Conversation ID: 539b9b5a-7c33-4552-8b8b-ccb1891086b8
- Updated: 2026-11-04T00:17:00Z

## Investigation State
- **Explored paths**:
  - `src/pages/Debiti/ViewDebiti.js`
  - `src/pages/Debiti/AggiungiDebito.js`
  - `src/pages/Spesa/ViewSpesa.js`
  - `src/utils/security.js`
  - `firestore.rules`
  - `src/test/mockFirebase.js`, `src/setupTests.js`
  - `scripts/verify-zero-emojis.js`, `scripts/check-circular.js`, `scripts/audit-secrets.js`
- **Key findings**:
  - Debt simplification mathematically formulated using 2-phase Greedy Bipartite with 1-to-1 exact matching pre-pass, strictly operated in integer cents to eliminate float drift.
  - Circular debts (A->B->C->A) cancel out cleanly to 0 transactions.
  - Firestore security rule restriction: users can only delete debts where they are debtor or creditor; settlement of simplified debts must use offsetting payment records rather than cross-roommate batch deletion.
  - 4 Custom Split modes designed (Equal with cent remainder, Fixed amounts with sum validation, Percentages with Hare-Niemeyer cent allocation, Member exclusions).
  - Client-side CSV export with UTF-8 BOM and formula injection protection (CWE-1236).
  - Client-side printable PDF view using browser `window.print()` and `@media print` eliminates heavy external dependencies (`jspdf`), while direct `jspdf` trade-offs are documented.
  - Mock harness additions identified for `setupTests.js` (`URL.createObjectURL`, `window.print`).
- **Unexplored areas**: None for R1 scope.

## Key Decisions Made
- Confirmed zero new runtime dependencies required if using browser-native printable PDF view; detailed both printable view and jsPDF paths.
- Complete investigation report documented in `handoff.md`.

## Artifact Index
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts/DISPATCH.md — Incoming task dispatch
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts/BRIEFING.md — Persistent context & identity
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts/progress.md — Heartbeat and step tracking
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m7_debts/handoff.md — Final investigation report
