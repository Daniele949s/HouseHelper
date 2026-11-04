# BRIEFING — 2026-11-03T13:03:00Z

## Mission
Oversee execution of HouseHelper modernization project (teamwork_orchestrator) and coordinate post-victory audit.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: /home/daniele949/.agents/teamwork/sentinel/
- Orchestrator: 8a0d94dd-e5c5-4417-ac97-dea05a001080
- Victory Auditor: to be spawned on victory claim

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- DO NOT USE EMOTICONS / EMOJIS anywhere in the UI or codebase
- Resolve 17 circular import cycles centered around src/App.js
- Clean up unused legacy templates in css_template/ without breaking functionality
- Automated tests and verification checks must confirm zero emoji/emoticons, clean build, and passing tests
- Routing decision: General path -> teamwork_orchestrator (multi-phase full engineering scope across M3, M4, and Phase 2)
- Milestone M6: Implement household document management with Firebase Storage scoped strictly to casaId
- Enforce storage security rules in storage.rules (only authenticated casaId members)
- Register ViewDocumenti page, routes in src/App.js, navigation entries in DesktopNavigation.js and MobileNavigation.js
- Integrate with Toast, ConfirmModal, and zero-emoji FontAwesome vector iconography
- Mock Firebase Storage in src/test/mockFirebase.js and provide unit/integration tests
- Advanced cross-device ergonomics (touch targets >= 44px, bottom-sheet/drawer comfort, desktop multi-column and keyboard accessibility)
- Final quality verification: 0 emoji violations, 0 circular cycles, 0 secrets, 100% tests passing, clean build

## User Context
- **Last user request**: Milestone M6 implementation (Household Documents with Firebase Storage, Storage rules, ViewDocumenti, cross-device ergonomics, mock storage, final verification).
- **Pending clarifications**: none (prompt approved)
- **Delivered results**: M1, M2, M3, M4, M5 completed and verified

## Project Status
- **Phase**: auditing (Milestone M6 Victory Audit)
- **Active Orchestrator**: 3ee71a4c-9e4f-4922-b970-a55d69932d6e
- **Active Victory Auditor**: a43a304b-9590-46b0-ab27-b6e848a2af36
- **Cron 1 (Progress Reporting, */8)**: task-34
- **Cron 2 (Liveness Check, */10)**: task-35

## Victory Audit Status
- **Triggered**: yes
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md — Authoritative user intent and approved prompt
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/sentinel/BRIEFING.md — Sentinel persistent memory and state tracker
