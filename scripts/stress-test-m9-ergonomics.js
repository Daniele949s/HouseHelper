#!/usr/bin/env node
/**
 * scripts/stress-test-m9-ergonomics.js
 * Empirical Stress Test Harness for Milestone M9 (Ergonomics, Modals & Invariants)
 * Executed by Challenger 2
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const rootDir = path.resolve(__dirname, '..');
const appCssPath = path.join(rootDir, 'src', 'App.css');
const indexCssPath = path.join(rootDir, 'src', 'index.css');
const viewDebitiPath = path.join(rootDir, 'src', 'pages', 'Debiti', 'ViewDebiti.js');
const confirmModalPath = path.join(rootDir, 'src', 'components', 'ConfirmModal.js');
const viewTurniPath = path.join(rootDir, 'src', 'pages', 'TurniPulizia', 'viewTurni.js');
const aggiuntaTurnoPath = path.join(rootDir, 'src', 'pages', 'TurniPulizia', 'aggiuntaTurno.js');
const aggiungiDebitoPath = path.join(rootDir, 'src', 'pages', 'Debiti', 'AggiungiDebito.js');
const viewSpesaPath = path.join(rootDir, 'src', 'pages', 'Spesa', 'ViewSpesa.js');

const appCssContent = fs.readFileSync(appCssPath, 'utf8');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
const viewDebitiContent = fs.readFileSync(viewDebitiPath, 'utf8');
const confirmModalContent = fs.readFileSync(confirmModalPath, 'utf8');
const viewTurniContent = fs.readFileSync(viewTurniPath, 'utf8');
const aggiuntaTurnoContent = fs.readFileSync(aggiuntaTurnoPath, 'utf8');
const aggiungiDebitoContent = fs.readFileSync(aggiungiDebitoPath, 'utf8');
const viewSpesaContent = fs.readFileSync(viewSpesaPath, 'utf8');

const appRoot = postcss.parse(appCssContent);
const indexRoot = postcss.parse(indexCssContent);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    failures.push({ testName, details });
    console.error(`  [FAIL] ${testName}: ${details}`);
  }
}

console.log('=== STARTING EMPIRICAL CHALLENGER STRESS TEST (M9 ERGONOMICS, MODALS & INVARIANTS) ===\n');

// =========================================================================
// 1. MODAL ERGONOMICS & ELEVATION IN CSS
// =========================================================================
console.log('--- 1. Modal Elevation & Backdrop CSS Contracts ---');

// 1.1 --shadow-modal in index.css for dark and light themes
let darkShadowModal = null;
let lightShadowModal = null;
indexRoot.walkRules((rule) => {
  if (rule.selector.includes(':root')) {
    rule.walkDecls('--shadow-modal', (d) => { darkShadowModal = d.value; });
  }
  if (rule.selector.includes('data-theme="light"')) {
    rule.walkDecls('--shadow-modal', (d) => { lightShadowModal = d.value; });
  }
});
assert(Boolean(darkShadowModal), '1.1 :root defines --shadow-modal token', `Value: ${darkShadowModal}`);
assert(Boolean(lightShadowModal), '1.2 [data-theme="light"] defines --shadow-modal token', `Value: ${lightShadowModal}`);

// 1.3 .confirm-modal-card uses var(--shadow-modal)
let confirmModalShadow = null;
appRoot.walkRules('.confirm-modal-card', (rule) => {
  rule.walkDecls('box-shadow', (d) => { confirmModalShadow = d.value; });
});
assert(confirmModalShadow === 'var(--shadow-modal)', '1.3 .confirm-modal-card uses var(--shadow-modal)', `Found: ${confirmModalShadow}`);

// 1.4 .modal-card uses var(--shadow-modal)
let modalCardShadow = null;
appRoot.walkRules('.modal-card', (rule) => {
  rule.walkDecls('box-shadow', (d) => { modalCardShadow = d.value; });
});
assert(modalCardShadow === 'var(--shadow-modal)', '1.4 .modal-card uses var(--shadow-modal)', `Found: ${modalCardShadow}`);

// 1.5 .confirm-modal-backdrop blur and z-index
let confirmBackdropZIndex = null;
let confirmBackdropFilter = null;
appRoot.walkRules('.confirm-modal-backdrop', (rule) => {
  rule.walkDecls('z-index', (d) => { confirmBackdropZIndex = d.value; });
  rule.walkDecls('backdrop-filter', (d) => { confirmBackdropFilter = d.value; });
});
assert(parseInt(confirmBackdropZIndex, 10) >= 90000, '1.5 .confirm-modal-backdrop z-index >= 90000', `Found: ${confirmBackdropZIndex}`);
assert(confirmBackdropFilter && confirmBackdropFilter.includes('blur(8px)'), '1.6 .confirm-modal-backdrop has blur(8px)', `Found: ${confirmBackdropFilter}`);

// =========================================================================
// 2. MOBILE TOAST SAFE AREA INSETS
// =========================================================================
console.log('\n--- 2. Mobile Toast Safe Area Insets ---');

let mobileToastTop = null;
appRoot.walkAtRules('media', (atRule) => {
  if (atRule.params.includes('max-width: 600px')) {
    atRule.walkRules('.toast-container', (rule) => {
      rule.walkDecls('top', (d) => { mobileToastTop = d.value; });
    });
  }
});
assert(
  mobileToastTop && mobileToastTop.includes('env(safe-area-inset-top, 0px)'),
  '2.1 Mobile .toast-container incorporates safe-area-inset-top with 0px fallback',
  `Found: ${mobileToastTop}`
);
assert(
  mobileToastTop && mobileToastTop.startsWith('calc(16px + env(safe-area-inset-top'),
  '2.2 Mobile .toast-container top base offset is 16px + safe-area',
  `Found: ${mobileToastTop}`
);

// =========================================================================
// 3. JAVASCRIPT MODAL ERGONOMICS (DISMISSAL & PROPAGATION)
// =========================================================================
console.log('\n--- 3. JavaScript Modal Ergonomics & Event Lifecycles ---');

// 3.1 ViewDebiti.js: showExportModal state
assert(viewDebitiContent.includes('const [showExportModal, setShowExportModal] = useState(false);'), '3.1 ViewDebiti defines showExportModal state');

// 3.2 ViewDebiti.js: Escape key listener with cleanup
const hasViewDebitiEscape = /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(!showExportModal\)\s*return;[\s\S]*?e\.key\s*===\s*["']Escape["'][\s\S]*?setShowExportModal\(false\)[\s\S]*?window\.addEventListener\("keydown",\s*handleKeyDown\)[\s\S]*?return\s*\(\)\s*=>\s*window\.removeEventListener\("keydown",\s*handleKeyDown\);/m.test(viewDebitiContent);
assert(hasViewDebitiEscape, '3.2 ViewDebiti implements Escape keydown listener with complete removeEventListener cleanup');

// 3.3 ViewDebiti.js: Backdrop click dismiss
const hasViewDebitiBackdropClick = /className=["']modal-backdrop["'][\s\S]*?onClick=\{\(\)\s*=>\s*setShowExportModal\(false\)\}/m.test(viewDebitiContent);
assert(hasViewDebitiBackdropClick, '3.3 ViewDebiti .modal-backdrop has onClick dismiss handler');

// 3.4 ViewDebiti.js: Modal card stopPropagation
const hasViewDebitiStopProp = /className=["']modal-card["'][\s\S]*?onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/m.test(viewDebitiContent);
assert(hasViewDebitiStopProp, '3.4 ViewDebiti .modal-card has onClick stopPropagation');

// 3.5 ConfirmModal.js: Escape key listener and cleanup
const hasConfirmEscape = /if\s*\(!modalData\)\s*return;[\s\S]*?e\.key\s*===\s*["']Escape["'][\s\S]*?handleCancel\(\)[\s\S]*?window\.addEventListener\("keydown",\s*handleKeyDown\)[\s\S]*?window\.removeEventListener\("keydown",\s*handleKeyDown\)/m.test(confirmModalContent);
assert(hasConfirmEscape, '3.5 ConfirmModal implements Escape keydown listener with cleanup');

// 3.6 ConfirmModal.js: Backdrop click and card stopPropagation
const hasConfirmBackdropClick = /className=["']confirm-modal-backdrop["'][\s\S]*?onClick=\{handleCancel\}/m.test(confirmModalContent);
const hasConfirmStopProp = /className=["']confirm-modal-card["'][\s\S]*?onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/m.test(confirmModalContent);
assert(hasConfirmBackdropClick, '3.6 ConfirmModal backdrop click calls handleCancel');
assert(hasConfirmStopProp, '3.7 ConfirmModal card click stops event propagation');

// =========================================================================
// 4. BUTTON QUERY PATTERNS & COLLISION PREVENTION
// =========================================================================
console.log('\n--- 4. Button Query Patterns & Invariants ---');

// 4.1 In viewTurni.js: header button has "Nuovo Turno"
const hasHeaderNuovoTurno = />\s*<i[^>]*fa-plus[^>]*><\/i>\s*Nuovo Turno\s*<\/button>/m.test(viewTurniContent);
assert(hasHeaderNuovoTurno, '4.1 viewTurni.js header button contains "Nuovo Turno"');

// 4.2 In viewTurni.js: empty state button is "Crea il primo turno" to avoid duplicate query collision
const hasEmptyStateDistinct = />\s*<i[^>]*fa-plus[^>]*><\/i>\s*Crea il primo turno\s*<\/button>/m.test(viewTurniContent);
assert(hasEmptyStateDistinct, '4.2 viewTurni.js empty state button uses "Crea il primo turno" (zero collision with /Nuovo Turno/i)');

// Count matches of exact "Nuovo Turno" in viewTurni.js button tags
const nuovoTurnoMatches = viewTurniContent.match(/<button[^>]*>[\s\S]*?Nuovo Turno[\s\S]*?<\/button>/gi) || [];
assert(nuovoTurnoMatches.length === 1, '4.3 Exactly 1 button matches "Nuovo Turno" in viewTurni.js', `Found ${nuovoTurnoMatches.length}`);

// 4.4 In aggiuntaTurno.js: submit button matches /Crea Turno/i
const hasCreaTurnoSubmit = /<button[^>]*type=["']submit["'][^>]*>[\s\S]*?Crea Turno[\s\S]*?<\/button>/m.test(aggiuntaTurnoContent);
assert(hasCreaTurnoSubmit, '4.4 aggiuntaTurno.js submit button matches /Crea Turno/i');

// 4.5 In AggiungiDebito.js: submit button matches /Salva Spesa/i
const hasSalvaSpesaSubmit = /<button[^>]*type=["']submit["'][^>]*>[\s\S]*?Salva Spesa[\s\S]*?<\/button>/m.test(aggiungiDebitoContent);
assert(hasSalvaSpesaSubmit, '4.5 AggiungiDebito.js submit button matches /Salva Spesa/i');

// =========================================================================
// 5. STRICT INVARIANTS: ZERO "DISPENSA" IN VIEWSPESA.JS
// =========================================================================
console.log('\n--- 5. Strict Invariants: Zero "Dispensa" in ViewSpesa.js ---');

const dispensaOccurrences = viewSpesaContent.match(/dispensa/gi) || [];
assert(dispensaOccurrences.length === 0, '5.1 Zero occurrences of "Dispensa" in src/pages/Spesa/ViewSpesa.js', `Found ${dispensaOccurrences.length} matches`);

// =========================================================================
// 6. SUMMARY REPORT
// =========================================================================
console.log('\n=== EMPIRICAL CHALLENGER STRESS TEST SUMMARY ===');
console.log(`Total Assertions: ${totalTests}`);
console.log(`Passed:           ${passedTests}`);
console.log(`Failed:           ${failedTests}`);

if (failedTests > 0) {
  console.error('\n❌ FAILURES RECORDED:');
  failures.forEach(f => console.error(`  - ${f.testName}: ${f.details}`));
  process.exit(1);
} else {
  console.log('\n✔ ALL 20 EMPIRICAL ASSERTIONS PASSED WITH ZERO FLAWS.');
  process.exit(0);
}
