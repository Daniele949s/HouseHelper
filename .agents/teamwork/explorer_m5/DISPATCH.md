# Dispatch: Explorer M5 (Security Hardening & Secret Audit)

## Role
Explorer for Milestone 5: Application Security Hardening, Anti-Tamper Firestore Rules & Public Repo Secret Audit.

## Inputs
- ORIGINAL_REQUEST: `/home/daniele949/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project Plan: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md`
- Current `firestore.rules`: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/firestore.rules` (if exists) or create blueprint
- Current `.gitignore` and environment files

## Mandate
Investigate and design:
1. **Firestore Security Rules**:
   - Inspect existing `firestore.rules`.
   - Design hardened multi-tenant household access controls for all collections (`case`, `utenti`, `turni`, `debiti`, `spesa`, `note`, `eventi`, and upcoming `documenti`).
   - Define anti-tamper and data validation rules (importo boundaries, required fields, immutable IDs).
2. **Secret Audit & Git History**:
   - Audit git history and codebase for secrets, keys, credentials, or private certificates.
   - Design `scripts/audit-secrets.js` to scan for high-entropy tokens and private keys.
   - Check `.gitignore` and `.env.example`.
3. Synthesize findings and write blueprint in:
   `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/analysis.md`
   and handoff in:
   `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/handoff.md`


## 2026-11-03T13:04:00Z
You are explorer_m5, assigned to investigate and architect Milestone 5: Application Security Hardening, Anti-Tamper Firestore Rules & Public Repo Secret Audit.

Your working directory is:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/

Read these input documents first:
1. ORIGINAL_REQUEST.md: /home/daniele949/.agents/teamwork/ORIGINAL_REQUEST.md
2. Project Plan: /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
3. Dispatch: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/DISPATCH.md

Objectives:
1. Multi-Tenant Firestore Rules Architecture:
   - Inspect existing `firestore.rules`.
   - Architect strict multi-tenant household boundaries: users can only read/write documents belonging to their active `casaId`.
   - Add anti-tamper and data validation (field types, positive amounts <= 50,000 €, required non-empty titles/names, timestamp rules).
2. Secret Audit & Git History:
   - Inspect git log and repository for any exposed API keys, private credentials, or service account tokens.
   - Design `scripts/audit-secrets.js` to ensure zero secret leakage in CI/builds.
   - Design `.env.example` and ensure `.gitignore` covers all sensitive files.
3. Plan automated test suite for security validation (`src/test/tier2_boundaries/security_rules.test.js` or similar).

Deliver your detailed blueprint in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/analysis.md
and handoff in:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/handoff.md
Notify caller via send_message when complete.
