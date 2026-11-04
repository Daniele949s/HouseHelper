#!/usr/bin/env node
/**
 * scripts/verify-zero-emojis.js
 * Verification script ensuring zero Unicode emojis and text emoticons exist in src/ and public/.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_DIRS = ['src', 'public'];
const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.svg', '.map'
]);

// Hardened Unicode Standard Emoji, Pictographic, Regional Flags, Arrows & Keycaps Ranges
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;

// Common ASCII Text Emoticons Pattern
const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (!EXCLUDED_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function scanFiles() {
  const allFiles = TARGET_DIRS.flatMap(d => getFiles(path.join(ROOT_DIR, d)));
  const violations = [];

  console.log(`\n========================================`);
  console.log(`🔍 Scanning ${allFiles.length} files across src/ and public/ for emojis & emoticons`);
  console.log(`========================================\n`);

  for (const filePath of allFiles) {
    const relPath = path.relative(ROOT_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, lineIdx) => {
      // 1. Check Unicode Emojis
      const chars = [...line];
      chars.forEach((char, colIdx) => {
        if (EMOJI_REGEX.test(char)) {
          const codePoint = 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
          const type = /[\u2190-\u21FF]/u.test(char) ? 'RAW ARROW' : /[\u2713\u2714]/u.test(char) ? 'RAW CHECKMARK' : 'EMOJI';
          violations.push({
            type,
            file: relPath,
            line: lineIdx + 1,
            column: colIdx + 1,
            symbol: char,
            codePoint,
            snippet: line.trim()
          });
        }
      });

      // 2. Check Text Emoticons
      let match;
      // Reset regex state for each line
      EMOTICON_REGEX.lastIndex = 0;
      while ((match = EMOTICON_REGEX.exec(line)) !== null) {
        violations.push({
          type: 'TEXT EMOTICON',
          file: relPath,
          line: lineIdx + 1,
          column: match.index + 1,
          symbol: match[0],
          codePoint: 'N/A',
          snippet: line.trim()
        });
      }
    });
  }

  return { scannedCount: allFiles.length, violations };
}

function main() {
  const { scannedCount, violations } = scanFiles();

  if (violations.length > 0) {
    console.error(`❌ VIOLATIONS FOUND (${violations.length} total):\n`);
    violations.forEach(v => {
      console.error(`- [${v.type}] ${v.file}:${v.line}:${v.column}`);
      console.error(`    Found: "${v.symbol}" (${v.codePoint})`);
      console.error(`    Line:  ${v.snippet}\n`);
    });

    console.error(`========================================`);
    console.error(`💥 FAILURE: Found ${violations.length} forbidden emoji/emoticon occurrence(s) in codebase.`);
    console.error(`   Please replace all emojis with vector icons (e.g. FontAwesome or Lucide).`);
    console.error(`========================================\n`);
    return 1;
  } else {
    console.log(`========================================`);
    console.log(`✔ SUCCESS: Zero emojis or text emoticons detected across ${scannedCount} files.`);
    console.log(`========================================\n`);
    return 0;
  }
}

const exitCode = main();
process.exit(exitCode);
