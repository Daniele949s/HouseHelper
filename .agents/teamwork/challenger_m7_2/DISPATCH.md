## 2026-11-04T00:49:12Z
You are Challenger 2 (challenger_m7_2) for Milestone M7 of HouseHelper.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/challenger_m7_2/
Your role is code-executing adversarial verification of Milestone M7, with primary focus on R2 (Chore Rotation & Vacation Mode), R4 (PWA Offline Storage & Multi-tenant Isolation), and R6/R7 (Security & Constraints).

MANDATORY READING:
- User Request: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md
- Scope Document: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m7/SCOPE.md
- Worker Handoff: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/worker_m7/handoff.md

ADVERSARIAL TESTING MANDATE:
Write and execute an adversarial/stress test suite (e.g. `src/test/tier2_boundaries/m7_challenger_chores_offline_stress.test.jsx` or similar test script) to empirically challenge:
1. Chore Rotation & Vacation Edge Cases:
   - All roommates simultaneously on vacation: ensure system gracefully handles whole-house absence without infinite loops, crashes, or unassigned deadlocks.
   - Roommate vacations with boundary dates: exactly start date, exactly end date, day before start, day after end.
   - Inverted date ranges (end date < start date), malformed dates, leap years (e.g. 2028-02-29).
   - Empty roommates list, single roommate household, roommates joining or leaving during rotation.
2. Sub-Task Checklist Integrity:
   - Extremely long checklist item text, HTML/script injection in checklist items (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`).
   - Toggling same checklist item multiple times.
3. Offline Storage Multi-tenant Isolation:
   - Tenant isolation: User A from `casa_1` stores offline data; verify User B from `casa_2` CANNOT retrieve `casa_1` data.
   - Logout purge: verify all keys prefixed with `hh_offline_` are completely wiped on logout.
4. Double-Submit Prevention & Constraints:
   - Simulate rapid consecutive clicks on form buttons (add contact, add debt, complete checklist item) and verify idempotent submission.
   - Zero-emoji scan verification across test and source files.

Run your test suite with `CI=true npm test -- --watchAll=false` and verify all tests pass.
Report results, edge cases tested, and state your final verdict: APPROVE or REQUEST_CHANGES.
Output: Write report to `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/challenger_m7_2/handoff.md` and notify orchestrator.
