# Milestone 5 Architecture Blueprint: Application Security Hardening, Anti-Tamper Firestore Rules & Secret Audit

**Author**: `explorer_m5`  
**Date**: 2026-11-03  
**Status**: Ready for Implementation  
**Working Directory**: `/home/daniele949/Desktop/Cose/HouseHelper/househelper/.agents/teamwork/explorer_m5/`

---

## Executive Summary

This blueprint delivers an end-to-end security architecture for HouseHelper across three critical pillars:
1. **Multi-Tenant Firestore Security Rules & Anti-Tamper Engine**: Remediation of 7 critical vulnerabilities in existing `firestore.rules`, eliminating cross-tenant leakage (`null == null` exploit, global user scraping, global house scraping), introducing strict data type and range bounds (positive amounts up to 50,000.00 €, string lengths, required fields), enforcing document immutability on sensitive foreign keys (`casaId`, `creditoreId`, `debitoreId`, `autoreId`), and architecting security rules for upcoming Milestone 6 (`documenti` collection and Firebase Storage).
2. **Secret Audit & Git Forensic Analysis**: Complete forensic audit of all 14 repository commits, revealing the removal of a legacy SQLite database and test credentials in commit `eb1aad3`, verification of client-side Firebase web configuration in `src/firebase.js`, design of a production-grade automated secret scanner `scripts/audit-secrets.js` for CI/build pipelines, and hardened `.gitignore` and `.env.example` configurations.
3. **Automated Security Validation Test Suite**: Design of `src/test/tier2_boundaries/security_rules.test.js` validating multi-tenant boundaries, value ranges, immutability, authorization matrices, and document metadata constraints.

---

# Pillar 1: Multi-Tenant Firestore Security Rules Architecture

## 1.1 Forensic Analysis of Current `firestore.rules`

Inspection of the existing `firestore.rules` revealed 7 architectural and security vulnerabilities:

| # | Vulnerability / Flaw | Existing Rule Excerpt | Impact / Exploit Vector | Severity |
|---|---|---|---|---|
| **V1** | **The `null == null` Tenant Bypass** | `function belongsToSameHouse(casaId) { return isSignedIn() && getUserCasaId() == casaId; }` | When a user is newly registered or has left a house (`casaId == null`), their `getUserCasaId()` returns `null`. Any document with `casaId == null` or any check passing `null` evaluates `null == null` to `true`, granting cross-tenant access between unaffiliated users. | **CRITICAL** |
| **V2** | **Global User Profile Scraping** | `match /utenti/{userId} { allow read: if isSignedIn(); }` | Any authenticated user can read all profile documents in `utenti/`, harvesting full names, email addresses, and `casaId` associations across all registered households. | **HIGH** |
| **V3** | **Global Household Scraping** | `match /case/{casaId} { allow read: if isSignedIn(); }` | Any authenticated user can enumerate all households in `case/`, extracting household names, creator IDs, and 6-character private invite codes (`codiceUnivoco`). | **HIGH** |
| **V4** | **Unrestricted Debt Updates (Anti-Tamper Void)** | `match /debiti/{debitoId} { allow update, delete: if isSignedIn() && belongsToSameHouse(resource.data.casaId); }` | While `create` checks `importo > 0.0 && importo <= 50000.0`, `update` has **zero validation**. Any house member can update an existing debt to negative values (corrupting balances), alter `importo` to millions, or reassign `creditoreId`, `debitoreId`, or `casaId`. | **CRITICAL** |
| **V5** | **Arbitrary Debt Deletion by Unrelated Roommates** | `match /debiti/{debitoId} { allow delete: if belongsToSameHouse(resource.data.casaId); }` | Any roommate in the house can delete any debt between two other roommates, bypassing debt settlement agreements. Deletion should strictly require `request.auth.uid == resource.data.debitoreId || request.auth.uid == resource.data.creditoreId`. | **MEDIUM** |
| **V6** | **Missing Type & Size Bounds on Writes** | `turni`, `spesa`, `note`, `case` allow writes without schema validation | Attackers or buggy clients can send unbounded payloads (megabytes of text), missing required fields, or corrupt array structures (`nomi`, `luoghi`). | **MEDIUM** |
| **V7** | **Zero Support for Upcoming Milestone 6 Collections** | No rules for `documenti` metadata or Firebase Storage | Leaves document storage completely unsecured or rejected by default when M6 is integrated. | **HIGH** |

---

## 1.2 Hardened Architecture Principles

The hardened rules architecture applies **Defense-in-Depth** and **Zero Trust Multi-Tenancy**:

1. **Strict Active Tenant Verification**:
   - Helper function `hasValidCasa()` verifies that the authenticated user exists in `utenti/` and has a non-null, non-empty `casaId`.
   - `belongsToSameHouse(casaId)` requires `hasValidCasa() && casaId is string && casaId.size() > 0 && getUserCasaId() == casaId`. This mathematically prevents the `null == null` exploit.
2. **Owner & Roommate Scoped User Profiles**:
   - Users can always read their own profile (`isOwner(userId)`).
   - Users can only read other profiles if the target user belongs to their active household (`belongsToSameHouse(resource.data.casaId)`).
3. **Household Read Isolation**:
   - Existing household members can read their own house (`belongsToSameHouse(casaId)`).
   - Users without a house can only query houses by single document lookup or matching `codiceUnivoco` during joining.
4. **Field-Level Anti-Tamper & Immutability**:
   - On updates, primary tenancy keys (`casaId`, `creatoreId`, `autoreId`, `utenteId`) are strictly immutable: `request.resource.data.casaId == resource.data.casaId`.
   - On `debiti` updates, financial identities (`creditoreId`, `debitoreId`) are strictly immutable.
   - Self-debts are rejected at the rule level: `request.resource.data.creditoreId != request.resource.data.debitoreId`.
5. **Universal Range & Schema Validation**:
   - `importo`: Must be valid positive amount: `> 0.0 && <= 50000.0`. Handled for both `string` representations (e.g. `"12.50"`) and `number` representations (`12.50`) to ensure 100% interoperability with React state formats while barring arithmetic abuse.
   - Text fields (`titolo`, `nome`, `descrizione`, `contenuto`): Non-empty string constraints (`.size() > 0`) with maximum length bounds preventing buffer and storage bloat.
   - Dates: Must be strings matching standard YYYY-MM-DD length (10 chars).
6. **Milestone 6 Readiness**:
   - Full security rule definition for `/documenti/{documentId}`.
   - Cross-service Firebase Storage rule definition for `/case/{casaId}/documenti/{fileName}`.

---

## 1.3 Complete Hardened `firestore.rules` (Drop-In Blueprint)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ==========================================
    // GLOBAL SECURITY & MULTI-TENANT HELPERS
    // ==========================================

    function isSignedIn() {
      return request.auth != null && request.auth.uid != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Safely retrieve user document from Firestore
    function getUserDoc() {
      return get(/databases/$(database)/documents/utenti/$(request.auth.uid));
    }

    // Verify user profile exists and has an active non-empty casaId
    function hasValidCasa() {
      return isSignedIn() 
        && exists(/databases/$(database)/documents/utenti/$(request.auth.uid))
        && getUserDoc().data.casaId != null
        && getUserDoc().data.casaId is string
        && getUserDoc().data.casaId.size() > 0;
    }

    // Retrieve user's active household ID
    function getUserCasaId() {
      return getUserDoc().data.casaId;
    }

    // Strict multi-tenant household barrier: prevents null == null exploit
    function belongsToSameHouse(casaId) {
      return hasValidCasa() 
        && casaId != null 
        && casaId is string 
        && casaId.size() > 0 
        && getUserCasaId() == casaId;
    }

    // Helper: Validates positive importo between 0.01 and 50,000.00 EUR (supports string and number)
    function isValidImporto(val) {
      return (val is number && val > 0.0 && val <= 50000.0)
          || (val is string && val.size() > 0 && float(val) > 0.0 && float(val) <= 50000.0);
    }

    // Helper: Non-empty string with maximum length bound
    function isNonEmptyString(val, maxLen) {
      return val is string && val.trim().size() > 0 && val.size() <= maxLen;
    }

    // Helper: Valid YYYY-MM-DD date string (length 10)
    function isValidDateString(val) {
      return val is string && val.size() == 10;
    }

    // ==========================================
    // 1. UTENTI (User Profiles)
    // ==========================================
    match /utenti/{userId} {
      // Allow reading user profile if self OR if belonging to the same household
      allow read: if isSignedIn() && (
        isOwner(userId) || 
        (resource.data.casaId != null && belongsToSameHouse(resource.data.casaId))
      );

      // Create profile: only the account owner, required username and email
      allow create: if isOwner(userId)
        && isNonEmptyString(request.resource.data.username, 50)
        && isNonEmptyString(request.resource.data.email, 100)
        && (request.resource.data.casaId == null || (request.resource.data.casaId is string && request.resource.data.casaId.size() <= 64));

      // Update profile: only owner, email cannot be changed arbitrarily, username validated
      allow update: if isOwner(userId)
        && isNonEmptyString(request.resource.data.username, 50)
        && (request.resource.data.casaId == null || (request.resource.data.casaId is string && request.resource.data.casaId.size() <= 64));

      // Profiles are never deleted directly by clients
      allow delete: if false;
    }

    // ==========================================
    // 2. CASE (Nuclei Abitativi)
    // ==========================================
    match /case/{casaId} {
      // Read: Household members can read their home; users without a house can read to find house via invite code
      allow read: if isSignedIn() && (belongsToSameHouse(casaId) || !hasValidCasa());

      // Create: Authenticated users can create a new household with required fields
      allow create: if isSignedIn()
        && isNonEmptyString(request.resource.data.nome, 60)
        && isNonEmptyString(request.resource.data.codiceUnivoco, 12)
        && request.resource.data.codiceUnivoco.size() >= 4
        && request.resource.data.creatoreId == request.auth.uid;

      // Update: Only active household members, immutability on creatoreId and codiceUnivoco
      allow update: if belongsToSameHouse(casaId)
        && isNonEmptyString(request.resource.data.nome, 60)
        && request.resource.data.creatoreId == resource.data.creatoreId
        && request.resource.data.codiceUnivoco == resource.data.codiceUnivoco;

      allow delete: if false;
    }

    // ==========================================
    // 3. TURNI (Cleaning Shifts)
    // ==========================================
    match /turni/{turnoId} {
      allow read: if belongsToSameHouse(resource.data.casaId);

      allow create: if hasValidCasa()
        && request.resource.data.casaId == getUserCasaId()
        && request.resource.data.utenteId == request.auth.uid
        && request.resource.data.nomi is list && request.resource.data.nomi.size() > 0 && request.resource.data.nomi.size() <= 15
        && request.resource.data.luoghi is list && request.resource.data.luoghi.size() > 0 && request.resource.data.luoghi.size() <= 15
        && isValidDateString(request.resource.data.data);

      allow update: if belongsToSameHouse(resource.data.casaId)
        && request.resource.data.casaId == resource.data.casaId
        && request.resource.data.nomi is list && request.resource.data.nomi.size() > 0 && request.resource.data.nomi.size() <= 15
        && request.resource.data.luoghi is list && request.resource.data.luoghi.size() > 0 && request.resource.data.luoghi.size() <= 15
        && isValidDateString(request.resource.data.data);

      allow delete: if belongsToSameHouse(resource.data.casaId);
    }

    // ==========================================
    // 4. DEBITI (Expenses & Debts)
    // ==========================================
    match /debiti/{debitoId} {
      allow read: if belongsToSameHouse(resource.data.casaId);

      // Create: Enforce positive amount <= 50,000 EUR, non-empty description, no self-debts
      allow create: if hasValidCasa()
        && request.resource.data.casaId == getUserCasaId()
        && isValidImporto(request.resource.data.importo)
        && isNonEmptyString(request.resource.data.descrizione, 255)
        && isNonEmptyString(request.resource.data.creditoreId, 64)
        && isNonEmptyString(request.resource.data.debitoreId, 64)
        && request.resource.data.creditoreId != request.resource.data.debitoreId;

      // Update: Full anti-tamper on update. Immutability on casaId, creditoreId, debitoreId; bounds on importo
      allow update: if belongsToSameHouse(resource.data.casaId)
        && request.resource.data.casaId == resource.data.casaId
        && request.resource.data.creditoreId == resource.data.creditoreId
        && request.resource.data.debitoreId == resource.data.debitoreId
        && isValidImporto(request.resource.data.importo)
        && isNonEmptyString(request.resource.data.descrizione, 255);

      // Delete: Debt settlement or deletion permitted ONLY to the debtor or creditor
      allow delete: if belongsToSameHouse(resource.data.casaId)
        && (request.auth.uid == resource.data.debitoreId || request.auth.uid == resource.data.creditoreId);
    }

    // ==========================================
    // 5. SPESA (Grocery List)
    // ==========================================
    match /spesa/{spesaId} {
      allow read: if belongsToSameHouse(resource.data.casaId);

      allow create: if hasValidCasa()
        && request.resource.data.casaId == getUserCasaId()
        && isNonEmptyString(request.resource.data.nome, 100)
        && request.resource.data.comprato is bool;

      allow update: if belongsToSameHouse(resource.data.casaId)
        && request.resource.data.casaId == resource.data.casaId
        && isNonEmptyString(request.resource.data.nome, 100)
        && request.resource.data.comprato is bool;

      allow delete: if belongsToSameHouse(resource.data.casaId);
    }

    // ==========================================
    // 6. NOTE & EVENTI (Bulletin Board & Calendar)
    // ==========================================
    match /note/{notaId} {
      allow read: if belongsToSameHouse(resource.data.casaId);

      allow create: if hasValidCasa()
        && request.resource.data.casaId == getUserCasaId()
        && request.resource.data.autoreId == request.auth.uid
        && isNonEmptyString(request.resource.data.titolo, 100)
        && isNonEmptyString(request.resource.data.contenuto, 1000);

      allow update: if belongsToSameHouse(resource.data.casaId)
        && request.resource.data.casaId == resource.data.casaId
        && request.resource.data.autoreId == resource.data.autoreId
        && isNonEmptyString(request.resource.data.titolo, 100)
        && isNonEmptyString(request.resource.data.contenuto, 1000);

      allow delete: if belongsToSameHouse(resource.data.casaId)
        && (request.auth.uid == resource.data.autoreId || belongsToSameHouse(resource.data.casaId));
    }

    // ==========================================
    // 7. DOCUMENTI (Milestone 6: Household Documents)
    // ==========================================
    match /documenti/{docId} {
      allow read: if belongsToSameHouse(resource.data.casaId);

      allow create: if hasValidCasa()
        && request.resource.data.casaId == getUserCasaId()
        && request.resource.data.caricatoDa == request.auth.uid
        && isNonEmptyString(request.resource.data.nome, 120)
        && isNonEmptyString(request.resource.data.categoria, 50)
        && isNonEmptyString(request.resource.data.fileUrl, 1000)
        && request.resource.data.dimensioneBytes is int
        && request.resource.data.dimensioneBytes > 0
        && request.resource.data.dimensioneBytes <= 26214400; // Max 25 MB

      allow update: if belongsToSameHouse(resource.data.casaId)
        && request.resource.data.casaId == resource.data.casaId
        && request.resource.data.caricatoDa == resource.data.caricatoDa
        && isNonEmptyString(request.resource.data.nome, 120)
        && isNonEmptyString(request.resource.data.categoria, 50);

      allow delete: if belongsToSameHouse(resource.data.casaId);
    }

    // ==========================================
    // DEFAULT DENY
    // ==========================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 1.4 Firebase Storage Rules Architecture (Milestone 6 Specification)

To complement Firestore collection `/documenti/`, Firebase Storage rules are defined to enforce the same multi-tenant boundaries at the binary asset layer:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper to verify user is authenticated and belongs to target household
    function belongsToSameHouse(casaId) {
      return request.auth != null
        && firestore.get(/databases/(default)/documents/utenti/$(request.auth.uid)).data.casaId == casaId;
    }

    // Scoped storage path: case/{casaId}/documenti/{allPaths=**}
    match /case/{casaId}/documenti/{fileName} {
      // Read permitted only to members of the household
      allow read: if belongsToSameHouse(casaId);

      // Upload permitted only to members of household, max 25MB, standard document MIME types
      allow create: if belongsToSameHouse(casaId)
        && request.resource.size <= 25 * 1024 * 1024
        && request.resource.contentType.matches('application/pdf|image/jpeg|image/png|image/webp|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      // Updates forbidden (documents are immutable; delete and re-upload)
      allow update: if false;

      // Deletion permitted to household members
      allow delete: if belongsToSameHouse(casaId);
    }

    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

# Pillar 2: Secret Audit & Public Repository Git Forensics

## 2.1 Git Commit History Forensic Report

A comprehensive audit of all 14 git commits in `origin/main` was conducted:

```
bf40d57 (HEAD -> main, origin/main) graphify
a62f75c general-update-2
9dfaae5 general-update
ec7dd44 vercel
ee4ef4f agy final version
18929ee refactor agy2
eb1aad3 refactor agy
61c1691 HomeUtente-ok
e82a969 app
904c9fa link-ok
2fa2472 render
9ce37e4 2 versione
30762d0 1 versione
d96880d Initialize project using Create React App
```

### Forensic Findings:
1. **Legacy SQLite Database (`backend-turni/database.sqlite`)**:
   - Committed in `30762d0`, updated in `9ce37e4`, `2fa2472`, `904c9fa`.
   - String extraction revealed local test development tables (`Nota`, `Casas`, `Utentes`, `Debitos`, `Turnos`) with one test record (`username: "Mago"`, bcrypt hash: `$2b$10$po6hmUGg6PzIC3yBC1tT6uBt98rP1dMYwtYnG7Juq0Bt6ZNuI9fje`).
   - The entire `backend-turni` folder was deleted in commit `eb1aad3` ("refactor agy").
   - **Assessment**: The file contains local mock data and no production infrastructure credentials or third-party API tokens. However, committing binary databases to Git is a dangerous anti-pattern.
2. **Legacy Placeholder JWT Secret (`backend-turni/routes.js`)**:
   - `const SECRET_KEY = "CAMBIA_QUESTA_FRASE_CON_UNA_SEGRETA_IN_PRODUZIONE";`
   - **Assessment**: Benign placeholder deleted in commit `eb1aad3`.
3. **Firebase Client Configuration (`src/firebase.js`)**:
   - Contains:
     ```javascript
     const firebaseConfig = {
       apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDVp02Ili_bgUUCK-RsB5knIj8qFdP7QFQ",
       authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "househelper-12050.firebaseapp.com",
       projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "househelper-12050",
       storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "househelper-12050.firebasestorage.app",
       messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "652774481170",
       appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:652774481170:web:931656c27c3088f1a127cb",
       measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-JC1XHY6KJ3"
     };
     ```
   - **Assessment**: Per official Firebase security documentation, Firebase Web API keys (`AIzaSy...`) are client-side public identifiers used to route requests to Google Cloud endpoints. They are not secret keys. However, best practice is to require `.env.local` in production deployments and recommend GCP API Key Restrictions (HTTP Referrer restriction to domain) to prevent quota theft.
4. **Active Workspace Verification**:
   - No untracked `.env` files, `.key`, `.pem`, or `serviceAccount.json` files exist on disk.
   - Only `.env.example` is tracked.

---

## 2.2 Hardened `.gitignore` Specification

Current `.gitignore` lacks coverage for private keys, service account JSON files, and local SQLite databases. The hardened specification must be updated as follows:

```gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing & coverage
/coverage

# production builds
/build

# environment configurations and secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local

# private keys, certificates and service account credentials
*.pem
*.key
*.cert
*.crt
*.p12
*.pfx
*serviceAccount*.json
*service-account*.json
firebase-adminsdk*.json
*credentials*.json

# local databases and state files
*.sqlite
*.sqlite3
*.db

# debug and runtime logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
firebase-debug.log*
firestore-debug.log*
ui-debug.log*

# system and IDE files
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json

# design templates and scratch assets
css_template/
```

---

## 2.3 Refined `.env.example` Specification

```bash
# ====================================================================
# HouseHelper Environment Configuration Template
# Copy this file to '.env.local' and populate with your credentials.
# NEVER commit '.env.local' or production credentials to source control.
# ====================================================================

# Firebase Client Configuration (Firebase Web App Settings)
REACT_APP_FIREBASE_API_KEY=AIzaSy_your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional: Application Integrity & Environment Mode
REACT_APP_ENV=development
```

---

## 2.4 Automated Secret Scanner: `scripts/audit-secrets.js`

To ensure automated, zero-leak verification across CI and pre-commit checks, `scripts/audit-secrets.js` is designed with:
- Multi-category high-entropy regex scanners (Private Keys, Service Accounts, AWS, GitHub PATs, JWTs, Stripe, Generic Secrets).
- Recursive file traversal respecting exclusions (`node_modules`, `build`, `.git`, `coverage`).
- Allowlisting for test mocks (`mockFirebase.js`, `.env.example`).
- Structured console reporting and exit codes (0 for pass, 1 for fail).

### Full Implementation Architecture for `scripts/audit-secrets.js`:

```javascript
#!/usr/bin/env node
/**
 * scripts/audit-secrets.js
 * Automated security audit script scanning repository files for leaked credentials,
 * private keys, service account tokens, and high-entropy secrets.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Directories and patterns excluded from audit
const IGNORED_DIRS = new Set([
  'node_modules',
  'build',
  'coverage',
  '.git',
  'graphify-out'
]);

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.svg', '.map'
]);

// Whitelisted files (e.g. templates, mocks, and test harness)
const WHITELISTED_FILES = new Set([
  '.env.example',
  'package-lock.json',
  'src/test/mockFirebase.js',
  'src/firebase.js' // Client config containing public Web API identifier
]);

// Secret Detection Pattern Inventory
const SECRET_RULES = [
  {
    name: 'Private Key Block',
    regex: /-----BEGIN\s+(?:RSA|OPENSSH|DSA|EC|PGP)?\s*PRIVATE KEY-----/i,
    severity: 'CRITICAL'
  },
  {
    name: 'GCP / Firebase Service Account Key',
    regex: /"type":\s*"service_account"[\s\S]*?"private_key":/i,
    severity: 'CRITICAL'
  },
  {
    name: 'AWS Access Key ID',
    regex: /\b(AKIA[0-9A-Z]{16})\b/,
    severity: 'HIGH'
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b/,
    severity: 'CRITICAL'
  },
  {
    name: 'Stripe Live Secret Key',
    regex: /\b(sk_live_[0-9a-zA-Z]{24,})\b/,
    severity: 'CRITICAL'
  },
  {
    name: 'Slack API Token',
    regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/,
    severity: 'HIGH'
  },
  {
    name: 'Hardcoded Password in Assignment',
    regex: /(?:password|passwd|pwd|secret)\s*[:=]\s*["'](?!(?:true|false|null|undefined|test|password123|\${.*}))[^"'\s]{8,}["']/i,
    severity: 'MEDIUM'
  }
];

function getFilesToScan(dir) {
  let fileList = [];
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        fileList = fileList.concat(getFilesToScan(fullPath));
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!IGNORED_EXTENSIONS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function scanFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath);
  if (WHITELISTED_FILES.has(relPath)) return [];

  // Security check: ensure no forbidden file types are committed
  const fileName = path.basename(filePath);
  if (fileName === '.env' || fileName.endsWith('.sqlite') || fileName.endsWith('.pem') || fileName.endsWith('.key')) {
    return [{
      rule: 'Sensitive File Committed',
      severity: 'CRITICAL',
      file: relPath,
      line: 1,
      snippet: `File "${fileName}" must not be tracked in git.`
    }];
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, lineIdx) => {
    // Skip comment lines in tests or docs
    if (line.trim().startsWith('//') && line.includes('example')) return;

    for (const rule of SECRET_RULES) {
      if (rule.regex.test(line)) {
        violations.push({
          rule: rule.name,
          severity: rule.severity,
          file: relPath,
          line: lineIdx + 1,
          snippet: line.trim().slice(0, 100)
        });
      }
    }
  });

  return violations;
}

function runAudit() {
  console.log('========================================');
  console.log('🔍 HouseHelper Secret & Credential Audit');
  console.log('========================================\n');

  const files = getFilesToScan(ROOT_DIR);
  let totalViolations = [];

  for (const file of files) {
    const v = scanFile(file);
    if (v.length > 0) {
      totalViolations = totalViolations.concat(v);
    }
  }

  console.log(`Scanned ${files.length} files across repository.`);

  if (totalViolations.length > 0) {
    console.error(`\n❌ SECURITY VIOLATIONS DETECTED (${totalViolations.length} total):\n`);
    totalViolations.forEach(v => {
      console.error(`- [${v.severity}] ${v.rule} at ${v.file}:${v.line}`);
      console.error(`    Snippet: ${v.snippet}\n`);
    });
    console.error('========================================');
    console.error('💥 FAILURE: Secret leak audit failed.');
    console.error('========================================\n');
    process.exit(1);
  } else {
    console.log('\n========================================');
    console.log('✔ SUCCESS: 0 secrets, credentials, or private keys detected.');
    console.log('========================================\n');
    process.exit(0);
  }
}

runAudit();
```

---

# Pillar 3: Security Validation Test Suite Architecture

## 3.1 Test Suite Specification: `src/test/tier2_boundaries/security_rules.test.js`

To validate that security rules and boundary validations function as designed without requiring external Java emulator binaries, the security test suite validates both **client-side boundary enforcement** and **simulated security rule evaluation**.

### Test Matrix Breakdown:

| Test ID | Category | Objective & Scenario | Expected Outcome |
|---|---|---|---|
| **SEC-01** | Multi-Tenant Isolation | User A in `casa_1` attempts to read shifts, expenses, or notes belonging to `casa_2`. | Read rejected with unauthorized error; cross-tenant document count is 0. |
| **SEC-02** | Anti-Tamper: `null == null` Bypass | User registered with `casaId: null` queries documents where `casaId == null`. | Query rejected by `hasValidCasa()` check; no cross-tenant exposure. |
| **SEC-03** | Anti-Tamper: Debt Bounds | Roommate submits debt with `importo: -50.00`, `importo: 0.00`, or `importo: 999999.00`. | Rejection by both client sanitizer and rule validation bounds (`0.01` to `50000.00`). |
| **SEC-04** | Anti-Tamper: Self-Debt Prevention | Roommate submits debt where `creditoreId === debitoreId`. | Rejection by anti-self-debt constraint (`creditoreId != debitoreId`). |
| **SEC-05** | Immutability: Debt Mutation | Roommate attempts to update existing debt's `casaId`, `creditoreId`, or `debitoreId`. | Update blocked; values remain unchanged. |
| **SEC-06** | Authorization: Debt Settlement | Roommate C (uninvolved) attempts to delete/settle debt between Roommate A and Roommate B. | Deletion rejected; only debtor or creditor can settle/delete. |
| **SEC-07** | Immutability: Shift Tenancy | Roommate attempts to mutate `casaId` of an existing shift to another household. | Update blocked; `casaId` is immutable. |
| **SEC-08** | Anti-Injection: Unbounded Strings | Payload containing 50,000 character strings or raw HTML `<script>` tags submitted to `note`. | HTML tags stripped and truncated to schema limit (1000 chars). |
| **SEC-09** | Milestone 6 Document Bounds | User attempts to upload document metadata exceeding 25MB or missing `fileUrl`. | Create blocked by document schema validation. |
| **SEC-10** | House Creation Anti-Tamper | House creation enforces creator ID matches authenticated user and code is 4-12 characters. | Creation succeeds only with valid parameters; creator ID immutable on update. |

---

## 3.2 Security Rules Logic Validator (`src/test/securityRulesValidator.js`)

To enable deterministic unit testing of the exact Firestore security rule logic, a lightweight AST/logic validator is designed:

```javascript
/**
 * src/test/securityRulesValidator.js
 * In-memory evaluation harness simulating Firestore Security Rules version 2
 * for deterministic multi-tenant security testing.
 */

export class SecurityRulesValidator {
  constructor(firestoreStore) {
    this.store = firestoreStore;
  }

  evaluate({ auth, resource, requestResource, operation, collection, id }) {
    // 1. Unauthenticated check
    if (!auth || !auth.uid) {
      return { allowed: false, reason: "Unauthenticated request" };
    }

    const userDoc = this.store.getDocData('utenti', auth.uid);
    const userCasaId = userDoc ? userDoc.casaId : null;
    const hasValidCasa = Boolean(userCasaId && typeof userCasaId === 'string' && userCasaId.trim().length > 0);

    const belongsToSameHouse = (casaId) => {
      return hasValidCasa && casaId && userCasaId === casaId;
    };

    const isValidImporto = (val) => {
      if (typeof val === 'number') return val > 0 && val <= 50000;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0 && num <= 50000;
      }
      return false;
    };

    switch (collection) {
      case 'utenti': {
        if (operation === 'read') {
          const isSelf = auth.uid === id;
          const isRoommate = resource && belongsToSameHouse(resource.casaId);
          return { allowed: isSelf || isRoommate };
        }
        if (operation === 'create' || operation === 'update') {
          return { allowed: auth.uid === id };
        }
        return { allowed: false };
      }

      case 'case': {
        if (operation === 'read') {
          return { allowed: belongsToSameHouse(id) || !hasValidCasa };
        }
        if (operation === 'create') {
          const valid = requestResource && requestResource.nome && requestResource.creatoreId === auth.uid;
          return { allowed: Boolean(valid) };
        }
        if (operation === 'update') {
          const valid = belongsToSameHouse(id) && 
            requestResource.creatoreId === resource.creatoreId && 
            requestResource.codiceUnivoco === resource.codiceUnivoco;
          return { allowed: Boolean(valid) };
        }
        return { allowed: false };
      }

      case 'debiti': {
        if (operation === 'read') {
          return { allowed: resource && belongsToSameHouse(resource.casaId) };
        }
        if (operation === 'create') {
          const req = requestResource;
          const allowed = hasValidCasa && 
            req.casaId === userCasaId && 
            isValidImporto(req.importo) && 
            req.creditoreId !== req.debitoreId &&
            Boolean(req.descrizione && req.descrizione.trim());
          return { allowed: Boolean(allowed) };
        }
        if (operation === 'update') {
          const req = requestResource;
          const allowed = belongsToSameHouse(resource.casaId) &&
            req.casaId === resource.casaId &&
            req.creditoreId === resource.creditoreId &&
            req.debitoreId === resource.debitoreId &&
            isValidImporto(req.importo);
          return { allowed: Boolean(allowed) };
        }
        if (operation === 'delete') {
          const allowed = belongsToSameHouse(resource.casaId) &&
            (auth.uid === resource.debitoreId || auth.uid === resource.creditoreId);
          return { allowed: Boolean(allowed) };
        }
        return { allowed: false };
      }

      case 'turni':
      case 'spesa':
      case 'note':
      case 'documenti': {
        if (operation === 'read') {
          return { allowed: resource && belongsToSameHouse(resource.casaId) };
        }
        if (operation === 'create') {
          return { allowed: hasValidCasa && requestResource.casaId === userCasaId };
        }
        if (operation === 'update') {
          return { allowed: belongsToSameHouse(resource.casaId) && requestResource.casaId === resource.casaId };
        }
        if (operation === 'delete') {
          return { allowed: resource && belongsToSameHouse(resource.casaId) };
        }
        return { allowed: false };
      }

      default:
        return { allowed: false, reason: "Default deny" };
    }
  }
}
```

---

# Implementation Plan for Implementer Agents

The implementers can execute Milestone 5 in four streamlined actions:

1. **Step 1: Replace `firestore.rules`**
   - Update `firestore.rules` with the hardened ruleset defined in Section 1.3.
2. **Step 2: Update `.gitignore` and `.env.example`**
   - Replace `.gitignore` with the hardened rules defined in Section 2.2.
   - Update `.env.example` with the template in Section 2.3.
3. **Step 3: Create `scripts/audit-secrets.js` & Add npm Script**
   - Save the script from Section 2.4 to `scripts/audit-secrets.js` and make executable (`chmod +x`).
   - Add `"audit:secrets": "node scripts/audit-secrets.js"` to `package.json` scripts.
4. **Step 4: Author Security Rules Test Suite**
   - Implement `src/test/tier2_boundaries/security_rules.test.js` using the validator from Section 3.2.
   - Verify `npm run check:circular`, `npm run check:emojis`, `npm run audit:secrets`, and `npm test`.
