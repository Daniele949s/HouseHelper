## 2026-11-03T14:40:49Z
Sender: 3ee71a4c-9e4f-4922-b970-a55d69932d6e
Message:
You are a read-only exploration agent.
Your working directory is: /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_storage/

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md located at:
/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/ORIGINAL_REQUEST.md

Also read:
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/PROJECT.md
- /home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/orchestrator_m6/SCOPE.md

Your Task: Technical investigation of Firebase Storage configuration, storage.rules, and data model for Milestone M6.
Investigate:
1. Current Firebase configuration in `src/firebase.js` or `src/config/firebase.js` to see how Firebase Storage is exported or initialized.
2. Current `storage.rules` (if it exists) and `firestore.rules` to understand the security patterns, helper functions, and how household access (`casaId`) is authenticated and authorized.
3. Formulate the exact `storage.rules` specification:
   - Rules version 2
   - multi-tenant isolation scoped strictly to `casaId`
   - Only authenticated members belonging to `casaId` can read, upload, and delete
   - Validation rules (e.g. content-type, file size <= 15MB)
4. Formulate the Firestore metadata schema for documents in `case/{casaId}/documenti`:
   - fields: `nome`, `categoria`, `url`, `storagePath`, `dimensione`, `formato`, `caricatoDa`, `dataCaricamento`, `casaId`
5. Detail recommended helper functions or service modules for document uploads/deletions.

Do NOT modify any code. Write your complete handoff report to:
`/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m6_storage/handoff.md`

Update your `progress.md` with timestamps as you proceed. When finished, send a message to the orchestrator with your findings and path to handoff.md.
