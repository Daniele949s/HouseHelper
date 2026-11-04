#!/usr/bin/env node
/**
 * scripts/check-circular.js
 * Verification of circular dependencies using madge.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');

function getMadgeCommand() {
  const localBinary = path.join(ROOT_DIR, 'node_modules', '.bin', 'madge');
  if (fs.existsSync(localBinary)) {
    return { cmd: localBinary, baseArgs: [] };
  }
  return { cmd: 'npx', baseArgs: ['--yes', 'madge'] };
}

function runCheck(targetPath, description) {
  console.log(`\n========================================`);
  console.log(`🔍 Checking circular dependencies: ${description}`);
  console.log(`   Target: ${targetPath}`);
  console.log(`========================================\n`);

  const { cmd, baseArgs } = getMadgeCommand();
  const args = [...baseArgs, '--circular', targetPath];

  const result = spawnSync(cmd, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });

  if (result.error) {
    console.error(`❌ Execution error running madge:`, result.error.message);
    return false;
  }

  if (result.status !== 0) {
    console.error(`\n❌ Circular dependencies detected or check failed for ${targetPath} (exit code ${result.status})`);
    return false;
  }

  console.log(`✔ No circular dependencies found in ${targetPath}`);
  return true;
}

function main() {
  console.log('Starting circular dependency verification...');

  const appOk = runCheck('src/App.js', 'Application Entry Point (src/App.js)');
  const srcOk = runCheck('src/', 'Full Source Tree (src/)');

  console.log('\n========================================');
  console.log('Summary of Circular Dependency Verification');
  console.log('========================================');
  console.log(`- src/App.js: ${appOk ? 'PASSED (0 cycles)' : 'FAILED'}`);
  console.log(`- src/      : ${srcOk ? 'PASSED (0 cycles)' : 'FAILED'}`);

  if (appOk && srcOk) {
    console.log('\n✅ SUCCESS: All circular dependency checks passed with 0 cycles.\n');
    process.exit(0);
  } else {
    console.error('\n❌ FAILURE: Circular dependencies detected in project.\n');
    process.exit(1);
  }
}

main();
