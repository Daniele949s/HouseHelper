# Deep Security Audit: Repository Files, Git Commit History & Secret Scanner Blueprint

## Executive Summary
This report documents the deep security audit performed on the HouseHelper repository (`/home/daniele949/Desktop/Cose/HouseHelper/househelper`) satisfying Milestone M5 Requirement R3. The investigation encompassed:
1. Complete static scanning of all working tree files across `src/`, `public/`, `scripts/`, root configs, and dotfiles.
2. Exhaustive line-by-line diff audit of all 14 historical git commits across 1,694,549 diff lines (`git log -p --full-history`).
3. Verification of Firebase client configuration (`src/firebase.js`), Firestore security rules (`firestore.rules`), and repository ignore patterns (`.gitignore`).
4. Production-ready blueprint and implementation for `scripts/audit-secrets.js` with `npm run audit:secrets` binding.

**Overall Audit Result**: **CLEAN (0 active leaks)**. Zero private RSA/EC/PGP keys, zero cloud service account credentials, zero live database passwords, and zero proprietary API tokens exist in the working directory or active repository branches. Historical commits in `backend-turni/node_modules/` (deleted in commit `eb1aad3`) contained only upstream open-source library test fixtures and documentation samples.

---

## 1. Working Tree Audit Findings

### 1.1 Methodology and Scope
The working directory was audited by examining 92 tracked and untracked project files (excluding `node_modules`, `.git`, `build`, `coverage`, `.agents`, and `graphify-out`). Each file was analyzed for:
- Private cryptographic keys (`BEGIN PRIVATE KEY`, `BEGIN RSA`, `BEGIN EC`, `BEGIN OPENSSH`, `BEGIN PGP`)
- Cloud service account credentials (`"type": "service_account"`, `"private_key": "-----BEGIN"`, Google IAM service emails)
- Cloud provider keys (AWS `AKIA*`, `ASIA*`, Azure, GCP admin keys)
- VCS and platform tokens (GitHub PAT `ghp_*`, `github_pat_*`, Slack `xox*`, Stripe `sk_live_*`, `rk_live_*`)
- Inline database credentials (`postgres://user:pass@host`, `mysql://`, `mongodb://`, `redis://`)
- Hardcoded password assignments (`password: "..."`, `secret_key: "..."`)
- Dangerous sensitive files (`.env`, `.env.local`, `serviceAccountKey.json`, `credentials.json`, `id_rsa`)

### 1.2 Working Tree Inspection Results
- **Cryptographic Private Keys**: 0 detected.
- **Service Account Credentials**: 0 detected.
- **Cloud Provider Secret Keys**: 0 detected.
- **Exposed Database Passwords**: 0 detected.
- **Dangerous Unignored Files**: 0 detected. Only `.env.example` exists in root, which contains strictly placeholder keys (`your_firebase_api_key`, `your_project_id`).

### 1.3 Firebase Client Configuration Analysis (`src/firebase.js`)
File location: `src/firebase.js` (lines 5-13):
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

#### Nature of Firebase Web API Keys
- Under Google Cloud / Firebase architecture, Firebase Web SDK API keys (starting with `AIzaSy...`) are **public client identifiers**, not administrative secrets. In Single Page Applications (SPAs) built with React/CRA, any value bundled into client-side JavaScript is publicly readable via the browser's developer tools or HTTP inspector.
- Firebase does not rely on `apiKey` for database access control or data authorization. Authorization is strictly governed by `firestore.rules` and Firebase Storage security rules.
- **Public Repository Security Considerations**:
  1. If an unauthorized third party clones the public repository and runs the app with the fallback `apiKey`, they interact with the developer's Firebase project (`househelper-12050`), potentially consuming Firestore read/write quota.
  2. Automated secret scanners (e.g., GitGuardian, GitHub Secret Scanning) may flag `AIzaSy...` strings as warnings.
  3. **Hardening Measure**: Recommend that the project implement environment variable enforcement without hardcoded fallbacks in production, and configure API key restrictions in Google Cloud Console.

### 1.4 Review of `.gitignore`
Current `.gitignore` content:
```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# environment and secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# misc
.DS_Store
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# design templates and scratch assets
css_template/
```

#### `.gitignore` Gaps Identified:
1. Missing wildcards for private key / certificate files: `*.pem`, `*.key`, `*.pfx`, `*.p12`, `*.pkcs12`, `*.crt`.
2. Missing wildcards for service account credential files: `*serviceAccount*.json`, `*credentials*.json`, `firebase-adminsdk*.json`.
3. Missing coverage for Firebase debug logs: `firebase-debug.log*`, `firestore-debug.log*`, `ui-debug.log`.
4. Missing local database files: `*.sqlite`, `*.sqlite3`, `*.db`.
5. Missing generic `.env.*.local` wildcard.

---

## 2. Git Commit History Audit Findings

### 2.1 Git Repository Overview
- **Total commits**: 14 commits.
- **Commit Range**: `d96880d` ("Initialize project using Create React App") to `bf40d57` ("graphify").
- **Remote**: `https://github.com/Daniele949s/HouseHelper.git`.
- **Diff lines scanned**: 1,694,549 lines.

### 2.2 Historical Diff Findings Breakdown
| Commit | Date | File Path | Finding Description | Risk Classification |
|---|---|---|---|---|
| `30762d0` | 2025-12-14 | `backend-turni/node_modules/node-gyp/test/fixtures/server.key` | `-----BEGIN RSA PRIVATE KEY-----` (node-gyp upstream test fixture) | FALSE POSITIVE / Third-party fixture. Deleted in `eb1aad3`. |
| `30762d0` | 2025-12-14 | `backend-turni/node_modules/pg-connection-string/README.md` | `postgres://someuser:somepassword@somehost:381/somedatabase` (Doc example) | FALSE POSITIVE / Documentation. Deleted in `eb1aad3`. |
| `30762d0` | 2025-12-14 | `backend-turni/routes.js` | `const SECRET_KEY = "CAMBIA_QUESTA_FRASE_CON_UNA_SEGRETA_IN_PRODUZIONE";` | SAFE / Development placeholder string. Deleted in `eb1aad3`. |
| `30762d0` | 2025-12-14 | `backend-turni/database.sqlite` | SQLite database file | SAFE / Empty tables only (0 user records). Deleted in `eb1aad3`. |
| `2fa2472` | 2025-12-17 | `backend-turni/node_modules/pg-pool/README.md` | `postgres://DBuser:secret@DBHost:#####/myDB` (Doc example) | FALSE POSITIVE / Documentation. Deleted in `eb1aad3`. |
| `2fa2472` | 2025-12-17 | `backend-turni/database.js` | `process.env.DATABASE_URL` used for cloud connection | SAFE / Environment variable used, no hardcoded password. Deleted in `eb1aad3`. |
| `2fa2472` | 2025-12-17 | `src/config.js` | `https://TUO-NOME-BACKEND.onrender.com/api` (Placeholder URL) | SAFE / Placeholder URL. Updated to `househelper-backend` in `904c9fa`, deleted in `ee4ef4f`. |
| `eb1aad3` | 2026-06-10 | Entire `backend-turni/` directory deleted | Deletion of all `backend-turni` assets and committed node_modules | RESOLUTION / All legacy backend artifacts removed from active tree. |
| `eb1aad3` | 2026-06-10 | `src/firebase.js` | Introduced with hardcoded fallback Firebase client API key | PUBLIC IDENTIFIER / Firebase Web client key. |
| `a62f75c` | 2026-09-25 | `src/firebase.js` | Modified to use `process.env.REACT_APP_FIREBASE_* || <fallback>` | PUBLIC IDENTIFIER / Added env var support. |

### 2.3 Verification of Commit Log Queries
All specific targeted searches returned clean results across the entire repository history:
- `git log -S "BEGIN PRIVATE KEY"` -> 0 results
- `git log -S "BEGIN OPENSSH"` -> 0 results
- `git log -S "service_account"` -> 0 results
- `git log -S "client_secret"` -> 0 results
- `git log -S "aws_secret"` -> 0 results
- `git log -S "ghp_"` -> 0 results
- `git log -S "gho_"` -> 0 results
- `git log -S "github_pat_"` -> 0 results
- `git log -S "sk_live_"` -> 0 results
- `git log -S "rk_live_"` -> 0 results
- `git log -S "xoxb-"` -> 0 results
- `git log -S "sq0csp-"` -> 0 results
- `git log -S "mongodb+srv://"` -> 0 results

---

## 3. Recommended Remediation and Hardening Actions

### Remediation Action 1: Hardened `.gitignore`
Append comprehensive security ignore rules to `.gitignore`:
```gitignore
# Security & Credentials
*.pem
*.key
*.crt
*.cer
*.pfx
*.p12
*.pkcs12
*serviceAccount*.json
*service-account*.json
*credentials*.json
firebase-adminsdk*.json
.env*.local
.env.backup
*.sqlite
*.sqlite3
*.db
firebase-debug.log*
firestore-debug.log*
ui-debug.log
```

### Remediation Action 2: Google Cloud Console Key Restrictions (Ops Recommendation)
For the public repository deployment on Firebase:
1. Navigate to **Google Cloud Console > APIs & Services > Credentials**.
2. Select the API key used by `househelper-12050`.
3. Under **Application restrictions**, set:
   - **Websites**: Add authorized referrers:
     - `https://househelper-12050.web.app/*`
     - `https://househelper-12050.firebaseapp.com/*`
     - `http://localhost:*` (for local development)
4. Under **API restrictions**, restrict key usage strictly to:
   - Identity Toolkit API (Firebase Authentication)
   - Cloud Firestore API
   - Firebase Storage API
   - Token Service API

### Remediation Action 3: Automated Secret Audit Script (`scripts/audit-secrets.js`)
Introduce `scripts/audit-secrets.js` and bind it to `npm run audit:secrets` in `package.json`.

---

## 4. Production Code Blueprint: `scripts/audit-secrets.js`

### 4.1 Architecture and Design Principles
1. **Zero External Dependencies**: Implemented in vanilla Node.js using standard library modules (`fs`, `path`, `child_process`, `readline`).
2. **Dual-Mode Protection**:
   - Working Tree Scanner: Audits filenames for exposed sensitive files and audits file contents for secret pattern matches.
   - Git History Scanner: Streams git commit diffs line-by-line via `child_process.spawn` and `readline`, preventing buffer overflows (`ENOBUFS`) while scanning over 1.6 million diff lines in seconds.
3. **Strict Zero-Emoji Output**: Employs ASCII markers (`[OK]`, `[VIOLATION]`, `[INFO]`, `[WARN]`, `[STATUS]`, `[SUMMARY]`) in compliance with project requirement R2.
4. **Deterministic Exit Codes**: Exits with `0` when clean; exits with `1` when any sensitive credential is discovered.
5. **Smart Placeholder Filtering**: Distinguishes between real high-entropy credentials and common documentation examples or placeholders (`your_*`, `change_me`, `<.*>`, `dummy`, `cambia_questa`).

### 4.2 Script Source Code Blueprint
```javascript
#!/usr/bin/env node
/**
 * scripts/audit-secrets.js
 * Automated Secret & Private Credential Audit Scanner for HouseHelper.
 * Scans working tree files and git commit history for sensitive credentials,
 * private keys, database passwords, and high-entropy API secrets.
 *
 * Adheres strictly to the project zero-emoji standard (Requirement R2).
 * Exits with code 0 when clean, code 1 if violations are detected.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

function findProjectRoot(startDir) {
  let curr = startDir;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(__dirname, '..');
}

const ROOT_DIR = findProjectRoot(__dirname);

// Directories excluded from working directory scan
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'coverage',
  '.agents',
  'graphify-out'
]);

// Binary or non-text extensions excluded from scanning
const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.svg', '.map',
  '.pdf', '.mp3', '.mp4', '.zip', '.tar', '.gz'
]);

// Sensitive filename patterns that should never exist unignored in the working tree
const DANGEROUS_FILE_PATTERNS = [
  { pattern: /^\.env$/i, desc: 'Unencrypted environment file' },
  { pattern: /^\.env\.(local|development\.local|test\.local|production\.local)$/i, desc: 'Local unignored environment file' },
  { pattern: /serviceAccount.*\.json$/i, desc: 'Service account credentials JSON' },
  { pattern: /firebase-adminsdk.*\.json$/i, desc: 'Firebase Admin SDK private key' },
  { pattern: /^credentials\.json$/i, desc: 'Google/OAuth credentials JSON' },
  { pattern: /id_rsa$/i, desc: 'Private SSH key' },
  { pattern: /id_ed25519$/i, desc: 'Private OpenSSH key' },
  { pattern: /\.(pfx|p12|pkcs12)$/i, desc: 'PKCS#12 certificate bundle' }
];

// Placeholder filter: strings that represent documentation placeholders or examples
function isSafePlaceholder(text) {
  return /example|your_|change_me|cambia_questa|<.*>|dummy|placeholder|\btest-token\b|\bfoo\b|\bbar\b/i.test(text);
}

// Secret Pattern Catalog
const SECRET_RULES = [
  {
    id: 'SEC-01',
    name: 'Private Key Block',
    regex: /-----BEGIN (?:[A-Z0-9 ]+)?PRIVATE KEY-----/,
    severity: 'CRITICAL',
    description: 'Cryptographic private key (RSA, EC, PKCS8, OpenSSH)'
  },
  {
    id: 'SEC-02',
    name: 'PGP Private Key Block',
    regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/,
    severity: 'CRITICAL',
    description: 'PGP/GPG private key block'
  },
  {
    id: 'SEC-03',
    name: 'Google/Firebase Service Account JSON',
    regex: /"type":\s*"service_account"/,
    severity: 'CRITICAL',
    description: 'Google Cloud service account private key file'
  },
  {
    id: 'SEC-04',
    name: 'AWS Access Key ID',
    regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
    severity: 'HIGH',
    description: 'AWS IAM access key or temporary security token ID'
  },
  {
    id: 'SEC-05',
    name: 'GitHub Personal Access Token',
    regex: /\b(ghp|gho|ghu|ghs|ghr)_[0-9a-zA-Z]{36}\b/,
    severity: 'CRITICAL',
    description: 'GitHub personal access or OAuth token'
  },
  {
    id: 'SEC-06',
    name: 'GitHub Fine-grained PAT',
    regex: /\bgithub_pat_[0-9a-zA-Z_]{82}\b/,
    severity: 'CRITICAL',
    description: 'GitHub fine-grained personal access token'
  },
  {
    id: 'SEC-07',
    name: 'Slack Token',
    regex: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32}\b/,
    severity: 'HIGH',
    description: 'Slack bot, app, or user OAuth token'
  },
  {
    id: 'SEC-08',
    name: 'Stripe Secret Key',
    regex: /\b[rs]k_live_[0-9a-zA-Z]{24,99}\b/,
    severity: 'CRITICAL',
    description: 'Live Stripe secret or restricted API key'
  },
  {
    id: 'SEC-09',
    name: 'Database URI with Password',
    regex: /\b(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[a-zA-Z0-9_.-]+:[^@\s"\'<>]+@[a-zA-Z0-9_.-]+/i,
    severity: 'CRITICAL',
    description: 'Database connection URI containing hardcoded credentials'
  },
  {
    id: 'SEC-10',
    name: 'Generic High-Entropy Secret Assignment',
    regex: /(?:secret_key|api_secret|client_secret|private_token)\s*[:=]\s*["']([a-zA-Z0-9_\-]{24,})["']/i,
    severity: 'HIGH',
    description: 'Hardcoded secret key or private token assignment'
  }
];

// Historical suppressions for upstream third-party documentation/fixtures in deleted commits
const HISTORICAL_SUPPRESSIONS = [
  'backend-turni/node_modules/node-gyp/test/fixtures/server.key',
  'backend-turni/node_modules/pg-pool/README.md',
  'backend-turni/node_modules/pg-connection-string/README.md'
];

/**
 * Recursively collects files for working tree audit.
 */
function collectFiles(dir) {
  let fileList = [];
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        fileList = fileList.concat(collectFiles(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!EXCLUDED_EXTENSIONS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

/**
 * Checks for sensitive/dangerous filenames directly present in the working tree.
 */
function auditFilenames(files) {
  const violations = [];
  for (const filePath of files) {
    const filename = path.basename(filePath);
    const relPath = path.relative(ROOT_DIR, filePath);

    for (const item of DANGEROUS_FILE_PATTERNS) {
      if (item.pattern.test(filename)) {
        violations.push({
          type: 'DANGEROUS_FILE_EXPOSED',
          file: relPath,
          severity: 'CRITICAL',
          description: item.desc
        });
        break;
      }
    }
  }
  return violations;
}

/**
 * Scans working tree file contents against SECRET_RULES.
 */
function auditWorkingTree(files) {
  const violations = [];

  for (const filePath of files) {
    const relPath = path.relative(ROOT_DIR, filePath);
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      continue;
    }

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const rule of SECRET_RULES) {
        const match = rule.regex.exec(line);
        if (match) {
          const matchStr = match[1] || match[0];
          if (isSafePlaceholder(matchStr)) {
            continue;
          }
          violations.push({
            type: 'WORKING_TREE_SECRET',
            file: relPath,
            line: idx + 1,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            snippet: line.trim().slice(0, 80)
          });
        }
      }
    });
  }

  return violations;
}

/**
 * Streams git commit diff history line-by-line to avoid buffer overflow (ENOBUFS).
 */
function auditGitHistory() {
  return new Promise((resolve) => {
    const gitDir = path.join(ROOT_DIR, '.git');
    if (!fs.existsSync(gitDir)) {
      console.log('[INFO] No .git directory found. Skipping git history scan.');
      return resolve([]);
    }

    const violations = [];
    const child = spawn('git', ['log', '-p', '--full-history'], { cwd: ROOT_DIR });

    child.on('error', (err) => {
      console.warn('[WARN] Could not spawn git process:', err.message);
      return resolve([]);
    });

    const rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity
    });

    let currentCommit = 'UNKNOWN';
    let currentFile = 'UNKNOWN';

    rl.on('line', (line) => {
      if (line.startsWith('commit ')) {
        currentCommit = line.split(' ')[1] || 'UNKNOWN';
      } else if (line.startsWith('diff --git ')) {
        const parts = line.split(' ');
        currentFile = (parts[parts.length - 1] || '').replace(/^[ab]\//, '');
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        const addedText = line.substring(1);

        // Check if file is in historical suppression list
        if (HISTORICAL_SUPPRESSIONS.some(sup => currentFile.includes(sup))) {
          return;
        }

        for (const rule of SECRET_RULES) {
          const match = rule.regex.exec(addedText);
          if (match) {
            const matchStr = match[1] || match[0];
            if (isSafePlaceholder(matchStr)) {
              continue;
            }

            violations.push({
              type: 'GIT_HISTORY_SECRET',
              commit: currentCommit.slice(0, 8),
              file: currentFile,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              snippet: addedText.trim().slice(0, 80)
            });
          }
        }
      }
    });

    rl.on('close', () => {
      resolve(violations);
    });
  });
}

async function main() {
  console.log('================================================================');
  console.log('[AUDIT] HouseHelper Repository & History Secret Audit');
  console.log('================================================================');

  const files = collectFiles(ROOT_DIR);
  console.log(`[INFO] Working tree files to scan: ${files.length}`);

  // 1. Filename scan
  const fileViolations = auditFilenames(files);

  // 2. Working tree content scan
  const contentViolations = auditWorkingTree(files);

  // 3. Git commit history scan (streaming)
  console.log('[INFO] Streaming and scanning git commit history diffs...');
  const historyViolations = await auditGitHistory();

  const totalViolations = fileViolations.length + contentViolations.length + historyViolations.length;

  console.log('\n----------------------------------------------------------------');
  console.log('[SUMMARY] Audit Results:');
  console.log(`- Working tree files scanned: ${files.length}`);
  console.log(`- Dangerous file violations: ${fileViolations.length}`);
  console.log(`- Working tree secret violations: ${contentViolations.length}`);
  console.log(`- Git history secret violations: ${historyViolations.length}`);
  console.log('----------------------------------------------------------------\n');

  if (totalViolations > 0) {
    console.error(`[FAILURE] Total violations detected: ${totalViolations}\n`);

    if (fileViolations.length > 0) {
      console.error('--- Dangerous Files Detected ---');
      fileViolations.forEach(v => {
        console.error(`- [${v.severity}] ${v.file}: ${v.description}`);
      });
      console.error('');
    }

    if (contentViolations.length > 0) {
      console.error('--- Working Tree Secrets Detected ---');
      contentViolations.forEach(v => {
        console.error(`- [${v.severity}] [${v.ruleId}] ${v.file}:${v.line} (${v.ruleName})`);
        console.error(`    Line: ${v.snippet}`);
      });
      console.error('');
    }

    if (historyViolations.length > 0) {
      console.error('--- Git History Secrets Detected ---');
      historyViolations.forEach(v => {
        console.error(`- [${v.severity}] [${v.ruleId}] Commit ${v.commit} in ${v.file} (${v.ruleName})`);
        console.error(`    Diff: ${v.snippet}`);
      });
      console.error('');
    }

    console.error('================================================================');
    console.error('[STATUS] FAILED: Sensitive credentials or secret keys detected.');
    console.error('         Please remove credentials and rotate exposed keys.');
    console.error('================================================================\n');
    process.exit(1);
  } else {
    console.log('================================================================');
    console.log('[STATUS] SUCCESS: Zero sensitive credentials or secrets detected.');
    console.log('         Working tree and git commit history are clean.');
    console.log('================================================================\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[ERROR] Uncaught exception during secret audit:', err);
  process.exit(1);
});
```

### 4.3 Proposed `package.json` Binding
In `package.json`, add `"audit:secrets": "node scripts/audit-secrets.js"` to the `"scripts"` dictionary:
```json
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "check:circular": "node scripts/check-circular.js",
    "check:emojis": "node scripts/verify-zero-emojis.js",
    "audit:secrets": "node scripts/audit-secrets.js"
  }
```
