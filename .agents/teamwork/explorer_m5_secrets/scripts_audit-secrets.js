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
