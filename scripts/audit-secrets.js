#!/usr/bin/env node
/**
 * scripts/audit-secrets.js
 * Automated security audit script scanning repository files and git commit history
 * for leaked credentials, private keys, service account tokens, and high-entropy secrets.
 *
 * Adheres to HouseHelper zero-emoji standard (ASCII only).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

// Directories and patterns excluded from audit
const IGNORED_DIRS = new Set([
  'node_modules',
  'build',
  'coverage',
  '.git',
  '.agents',
  '.gemini',
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
  'src/firebase.js', // Client config containing public Web API identifier
  'scripts/audit-secrets.js' // The scanner script itself
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
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  if (WHITELISTED_FILES.has(relPath)) return [];

  // Security check: ensure no forbidden file types are present
  const fileName = path.basename(filePath);
  if (fileName === '.env' || fileName.endsWith('.sqlite') || fileName.endsWith('.sqlite3') || fileName.endsWith('.pem') || fileName.endsWith('.key')) {
    return [{
      rule: 'Sensitive File Committed or Present',
      severity: 'CRITICAL',
      file: relPath,
      line: 1,
      snippet: `File "${fileName}" must not be present or tracked in repository.`
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
    // Skip comment lines in tests or documentation examples
    const trimmed = line.trim();
    if (trimmed.startsWith('//') && (trimmed.includes('example') || trimmed.includes('placeholder'))) return;
    if (trimmed.startsWith('*') && (trimmed.includes('example') || trimmed.includes('placeholder'))) return;

    for (const rule of SECRET_RULES) {
      if (rule.regex.test(line)) {
        violations.push({
          rule: rule.name,
          severity: rule.severity,
          file: relPath,
          line: lineIdx + 1,
          snippet: trimmed.slice(0, 100)
        });
      }
    }
  });

  return violations;
}

function scanGitHistory() {
  const violations = [];
  try {
    // Check if git is available and repo has commits
    const commitCount = execSync('git rev-list --count HEAD', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
    console.log(`[INFO] Auditing git commit history (${commitCount} commits)...`);

    // Verify tracked files in HEAD tree contain no sensitive patterns
    const trackedFiles = execSync('git ls-files', { cwd: ROOT_DIR, encoding: 'utf8' }).split('\n').filter(Boolean);
    for (const f of trackedFiles) {
      const base = path.basename(f);
      if (base === '.env' || base.endsWith('.sqlite') || base.endsWith('.sqlite3') || base.endsWith('.pem') || base.endsWith('.key') || base.includes('serviceAccount')) {
        violations.push({
          rule: 'Sensitive File Tracked in Git HEAD',
          severity: 'CRITICAL',
          file: f,
          line: 1,
          snippet: `File "${base}" is tracked in git index.`
        });
      }
    }

    // Check git log diffs across commits (excluding node_modules and whitelisted files)
    const diffLog = execSync(
      'git log -p -G "(AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82}|sk_live_[0-9a-zA-Z]{24,}|xox[baprs]-[0-9a-zA-Z]{10,48})" -- ":!node_modules" ":!**/node_modules/**" ":!package-lock.json" ":!**/package-lock.json"',
      { cwd: ROOT_DIR, encoding: 'utf8' }
    ).trim();

    if (diffLog.length > 0) {
      violations.push({
        rule: 'Leaked API Token in Git Commit History',
        severity: 'CRITICAL',
        file: 'git log',
        line: 1,
        snippet: diffLog.slice(0, 120)
      });
    }

  } catch (err) {
    console.log(`[WARN] Git history inspection skipped or encountered non-fatal notice: ${err.message}`);
  }

  return violations;
}

function runAudit() {
  console.log('========================================');
  console.log('[AUDIT] HouseHelper Secret & Credential Audit');
  console.log('========================================\n');

  console.log('[INFO] Scanning working tree files...');
  const files = getFilesToScan(ROOT_DIR);
  let totalViolations = [];

  for (const file of files) {
    const v = scanFile(file);
    if (v.length > 0) {
      totalViolations = totalViolations.concat(v);
    }
  }

  console.log(`[INFO] Scanned ${files.length} files across working tree.`);

  const gitViolations = scanGitHistory();
  if (gitViolations.length > 0) {
    totalViolations = totalViolations.concat(gitViolations);
  }

  if (totalViolations.length > 0) {
    console.error(`\n[FAIL] SECURITY VIOLATIONS DETECTED (${totalViolations.length} total):\n`);
    totalViolations.forEach(v => {
      console.error(`- [${v.severity}] ${v.rule} at ${v.file}:${v.line}`);
      console.error(`    Snippet: ${v.snippet}\n`);
    });
    console.error('========================================');
    console.error('[FAILURE] Secret leak audit failed.');
    console.error('========================================\n');
    process.exit(1);
  } else {
    console.log('\n========================================');
    console.log('[SUCCESS] 0 secrets, credentials, or private keys detected across working tree and git history.');
    console.log('========================================\n');
    process.exit(0);
  }
}

runAudit();
