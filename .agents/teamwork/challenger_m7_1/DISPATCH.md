## 2026-11-04T00:49:04Z
You are Challenger 1 (challenger_m7_1) for Milestone M7 of HouseHelper.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/challenger_m7_1/
Your role is code-executing adversarial verification of Milestone M7, with primary focus on R1 (Debt Simplification & Custom Splits) and R3 (Contatti Directory & Protocol Security).

MANDATORY READING:
- User Request: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- Scope Document: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m7/SCOPE.md
- Worker Handoff: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m7/handoff.md

ADVERSARIAL TESTING MANDATE:
Write and execute an adversarial/stress test suite (e.g. `src/test/tier2_boundaries/m7_challenger_debts_stress.test.jsx` or similar test script) to empirically challenge:
1. Debt Simplification Stress:
   - Complex cyclic graphs: A owes B, B owes C, C owes D, D owes A with unequal weights.
   - Large roommate networks (e.g. 10+ roommates with dense random debts) — verify total net balance is always strictly conserved and number of transactions is strictly <= N-1.
   - Floating-point precision torture: inputs with many decimal places, micro-cents, large amounts up to 50,000 €.
   - Self-debts, disjoint debt components, zero-sum subsets.
2. Custom Split Modes Boundary & Tampering:
   - Fixed amounts sum mismatch (e.g. 100.00 € total with fixed allocations summing to 99.99 € or 100.01 €).
   - Negative amounts, NaN, zero, infinite, extreme inputs.
   - Percentage sums not equal to 100% (e.g. 99.9% or 100.1%).
   - Excluding all roommates (0 active debtors).
3. CSV Injection & Link Security:
   - Malicious formula injection strings in debt descriptions (`=1+1`, `@SUM(A1:A10)`, `+cmd|' /C calc'!A0`, `-5+2`, `\t=2+2`).
   - XSS / dangerous protocol payloads in phone and email inputs (`javascript:alert(1)`, `vbscript:`, `data:text/html`).
   - Phone sanitization with valid international formatting (+39 333 1234567, spaces, dashes).

Run your test suite with `CI=true npm test -- --watchAll=false` and verify all tests pass.
Report results, edge cases tested, and state your final verdict: APPROVE or REQUEST_CHANGES.
Output: Write report to `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/challenger_m7_1/handoff.md` and notify orchestrator.
