# BRIEFING — 2026-11-03T14:13:30Z

## Mission
Deep security audit of `firestore.rules` and design hardened, production-ready security rules satisfying Milestone M5 / Requirement R3 (household scoping, anti-tamper, input sanitization, zero tenant cross-talk).

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: Security audit, Firestore rules architecture, threat modeling
- Working directory: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5_rules/
- Original parent: 8a0d94dd-e5c5-4417-ac97-dea05a001080
- Milestone: M5 (Application Security Hardening & Secret Audit)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code in src/ or edit firestore.rules directly
- Output proposals, reports, and blueprints in working directory (.agents/teamwork/explorer_m5_rules/)
- Strict zero-emoji compliance in any proposed text/code
- Keep reports self-contained and verifiable

## Current Parent
- Conversation ID: 8a0d94dd-e5c5-4417-ac97-dea05a001080
- Updated: 2026-11-03T14:13:30Z

## Investigation State
- **Explored paths**: `firestore.rules`, `src/pages/**`, `src/utils/security.js`, `src/test/mockFirebase.js`, `src/contexts/AuthContext.js`, `src/firebase.js`, `scripts/**`
- **Key findings**:
  1. Six critical vulnerability classes in legacy `firestore.rules`: global user/house profile enumeration, missing anti-tamper constraints on immutable fields, author/uploader impersonation, self-debt and unbounded financial manipulation, unbounded string payloads (DDoS/XSS bloat), and missing rules for `documenti`.
  2. Engineered complete production-ready `firestore.rules` blueprint featuring robust helper functions (`isAuthenticated()`, `isOwner()`, `hasUserProfile()`, `getUserCasaId()`, `isMemberOfHousehold()`), dual-type money validation (`isValidImporto()`), bounded string validation (`isValidString()`), and anti-tamper guards.
  3. Formulated 24-case automated security test matrix for Firebase Emulator testing.
- **Unexplored areas**: None for M5 rules audit. Ready for handoff to orchestrator.

## Key Decisions Made
- Scoped `utenti` read: `get` allows owner or co-tenants sharing `casaId`; `list` requires `isMemberOfHousehold(resource.data.casaId)`.
- Scoped `case` read: `get` allows members or creator; `list` allows authenticated users to enable invite code lookup.
- Strictly prohibited self-debts (`creditoreId != debitoreId`) and third-party debt fabrication (`auth.uid in [creditoreId, debitoreId]`).
- All text fields bounded by length to prevent buffer bloat and denial of service.

## Artifact Index
- `DISPATCH.md` — Incoming dispatch from orchestrator
- `BRIEFING.md` — Situational awareness and working memory
- `progress.md` — Liveness heartbeat
- `analysis.md` — Comprehensive security audit, gap analysis table, hardened rules code, and test plan
- `handoff.md` — 5-component self-contained handoff report
