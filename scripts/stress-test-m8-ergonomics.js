/**
 * Milestone M8 Ergonomics, Layout & Responsive Stress Test Suite
 * Executed empirically by Challenger 2
 */

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const rootDir = path.resolve(__dirname, '..');
const appCssPath = path.join(rootDir, 'src', 'App.css');
const indexCssPath = path.join(rootDir, 'src', 'index.css');
const indexHtmlPath = path.join(rootDir, 'public', 'index.html');

const appCssContent = fs.readFileSync(appCssPath, 'utf8');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

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

console.log('=== STARTING EMPIRICAL STRESS TEST FOR M8 ERGONOMICS & LAYOUT ===\n');

// =========================================================================
// 1. MOBILE SAFE AREA PADDING & CLEARANCE
// =========================================================================
console.log('--- 1. Mobile Safe Area Padding & Viewport Clearance ---');

// 1.1 Viewport meta tag in index.html
const hasViewportFitCover = /<meta[^>]*name=["']viewport["'][^>]*viewport-fit=cover/i.test(indexHtmlContent);
assert(hasViewportFitCover, '1.1 Viewport meta tag includes viewport-fit=cover in index.html', 'viewport-fit=cover missing');

// 1.2 .app-container mobile padding in @media (max-width: 768px)
let appContainerMobilePadding = null;
appRoot.walkAtRules('media', (atRule) => {
  if (atRule.params.includes('max-width: 768px')) {
    atRule.walkRules('.app-container', (rule) => {
      rule.walkDecls('padding', (decl) => {
        appContainerMobilePadding = decl.value;
      });
    });
  }
});

assert(
  appContainerMobilePadding &&
  appContainerMobilePadding.includes('env(safe-area-inset-top') &&
  appContainerMobilePadding.includes('env(safe-area-inset-bottom'),
  '1.2 .app-container mobile padding includes both safe-area-inset-top and bottom',
  `Found: ${appContainerMobilePadding}`
);

assert(
  appContainerMobilePadding && appContainerMobilePadding.includes('84px'),
  '1.3 .app-container mobile padding reserves >= 84px clearance for mobile bottom bar',
  `Found: ${appContainerMobilePadding}`
);

// 1.4 .mobile-menu-inner safe area padding
let mobileMenuInnerPadding = null;
appRoot.walkRules('.mobile-menu-inner', (rule) => {
  rule.walkDecls('padding', (decl) => {
    mobileMenuInnerPadding = decl.value;
  });
});

assert(
  mobileMenuInnerPadding &&
  mobileMenuInnerPadding.includes('env(safe-area-inset-top') &&
  mobileMenuInnerPadding.includes('env(safe-area-inset-bottom'),
  '1.4 .mobile-menu-inner drawer padding incorporates top and bottom safe area insets',
  `Found: ${mobileMenuInnerPadding}`
);

// 1.5 Safe area fallback values (0px fallback prevents invalid calc expressions)
assert(
  appContainerMobilePadding &&
  /env\(safe-area-inset-top,\s*0px\)/.test(appContainerMobilePadding) &&
  /env\(safe-area-inset-bottom,\s*0px\)/.test(appContainerMobilePadding),
  '1.5 .app-container uses 0px safe-area fallback to prevent invalid calc() parsing on unsupported engines',
  `Found: ${appContainerMobilePadding}`
);


// =========================================================================
// 2. STICKY FLOATING TOPBAR BEHAVIOR & ANCESTOR CONSTRAINTS
// =========================================================================
console.log('\n--- 2. Sticky Floating Topbar & Ancestor Constraints ---');

let topbarSticky = null;
let topbarTop = null;
let topbarZIndex = null;
let topbarBackdrop = null;
let topbarBorder = null;

appRoot.walkRules('.app-topbar', (rule) => {
  if (rule.parent.type === 'root') {
    rule.walkDecls((decl) => {
      if (decl.prop === 'position') topbarSticky = decl.value;
      if (decl.prop === 'top') topbarTop = decl.value;
      if (decl.prop === 'z-index') topbarZIndex = decl.value;
      if (decl.prop === 'backdrop-filter') topbarBackdrop = decl.value;
      if (decl.prop === 'border') topbarBorder = decl.value;
    });
  }
});

assert(topbarSticky === 'sticky', '2.1 .app-topbar position is sticky', `Found: ${topbarSticky}`);
assert(topbarTop === '12px', '2.2 .app-topbar top offset is 12px', `Found: ${topbarTop}`);
assert(parseInt(topbarZIndex, 10) === 900, '2.3 .app-topbar z-index is 900', `Found: ${topbarZIndex}`);
assert(topbarBackdrop === 'var(--glass-blur)', '2.4 .app-topbar uses var(--glass-blur)', `Found: ${topbarBackdrop}`);
assert(topbarBorder === 'var(--glass-border)', '2.5 .app-topbar has hairline glass border', `Found: ${topbarBorder}`);

// 2.6 Check ancestor overflow constraints: .app-container must NOT have overflow hidden
let appContainerOverflow = null;
appRoot.walkRules('.app-container', (rule) => {
  if (rule.parent.type === 'root') {
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith('overflow')) appContainerOverflow = decl.value;
    });
  }
});
assert(appContainerOverflow === null, '2.6 .app-container has no overflow restrictions that would cancel position:sticky', `Found: ${appContainerOverflow}`);


// =========================================================================
// 3. BREAKPOINT ANALYSIS AT EXACTLY 768PX SCREEN WIDTH
// =========================================================================
console.log('\n--- 3. Breakpoint Analysis at 768px (iPad Portrait / Boundary) ---');

// In CSS:
// @media (min-width: 768px) matches at 768px.
// @media (max-width: 768px) matches at 768px.
// @media (max-width: 767.98px), (width: 768px) matches at 768px.

// Collect all rules affecting .mobile-bottom-bar
const bottomBarRules = [];
appRoot.walkRules('.mobile-bottom-bar', (rule) => {
  const media = rule.parent.type === 'atrule' && rule.parent.name === 'media' ? rule.parent.params : 'all';
  rule.walkDecls('display', (decl) => {
    bottomBarRules.push({ media, value: decl.value, important: decl.important });
  });
});

console.log('    Observed .mobile-bottom-bar display declarations:', bottomBarRules);

// At 768px:
// 1. base display: flex
// 2. min-width: 768px -> display: none !important
// 3. (max-width: 767.98px), (width: 768px) -> display: flex !important
// Because rule 3 is declared AFTER rule 2 with equal importance (!important), rule 3 wins!
const lastRuleFor768 = bottomBarRules[bottomBarRules.length - 1];
assert(
  lastRuleFor768.media.includes('width: 768px') && lastRuleFor768.value === 'flex' && lastRuleFor768.important,
  '3.1 At exactly 768px, .mobile-bottom-bar resolves to display: flex !important via cascade order',
  `Last rule media: ${lastRuleFor768.media}, val: ${lastRuleFor768.value}`
);

// Collect desktop vs mobile navigation visibility at 768px
let desktopNavAt768 = null;
let mobileNavAt768 = null;

appRoot.walkAtRules('media', (atRule) => {
  if (atRule.params.includes('max-width: 768px')) {
    atRule.walkRules('.desktop-nav-root', (rule) => {
      rule.walkDecls('display', (decl) => { desktopNavAt768 = decl.value; });
    });
    atRule.walkRules('.mobile-nav-root', (rule) => {
      rule.walkDecls('display', (decl) => { mobileNavAt768 = decl.value; });
    });
  }
});

assert(desktopNavAt768 === 'none', '3.2 At 768px, .desktop-nav-root is hidden (display: none !important)', `Found: ${desktopNavAt768}`);
assert(mobileNavAt768 === 'block', '3.3 At 768px, .mobile-nav-root (burger menu) is active (display: block)', `Found: ${mobileNavAt768}`);


// =========================================================================
// 4. TOUCH TARGET DIMENSIONS ACROSS BUTTONS (>= 44px)
// =========================================================================
console.log('\n--- 4. Touch Target Dimensions Across Interactive Elements ---');

// 4.1 Base button rule
let baseButtonMinHeight = null;
appRoot.walkRules((rule) => {
  if (rule.selectors && rule.selectors.includes('button')) {
    rule.walkDecls('min-height', (decl) => {
      baseButtonMinHeight = decl.value;
    });
  }
});
assert(baseButtonMinHeight === '44px', '4.1 Base `button` selector enforces min-height: 44px', `Found: ${baseButtonMinHeight}`);

// 4.2 Key button classes
const targetClasses = [
  '.btn-primary',
  '.btn-secondary',
  '.btn-danger-outline',
  '.mobile-logout-btn',
  '.mobile-close-btn',
  '.contact-delete-btn'
];

targetClasses.forEach((cls) => {
  let minHeight = null;
  appRoot.walkRules((rule) => {
    if (rule.selectors && rule.selectors.some(s => s.trim() === cls)) {
      rule.walkDecls('min-height', (decl) => {
        minHeight = decl.value;
      });
    }
  });
  assert(
    minHeight && parseInt(minHeight, 10) >= 44,
    `4.2 Touch target for ${cls} is >= 44px`,
    `Found: ${minHeight}`
  );
});

// 4.3 Mobile bottom tab touch targets (Apple HIG minimum 48px)
let mobileTabMinHeight = null;
let mobileTabMinWidth = null;
appRoot.walkRules('.mobile-bottom-tab', (rule) => {
  rule.walkDecls('min-height', (decl) => { mobileTabMinHeight = decl.value; });
  rule.walkDecls('min-width', (decl) => { mobileTabMinWidth = decl.value; });
});
assert(mobileTabMinHeight === '48px' && mobileTabMinWidth === '48px', '4.3 .mobile-bottom-tab touch targets are 48x48px', `h: ${mobileTabMinHeight}, w: ${mobileTabMinWidth}`);


// =========================================================================
// 5. LIQUID GLASS MATERIAL ISOLATION (NO BLUR ON CONTENT CARDS)
// =========================================================================
console.log('\n--- 5. Liquid Glass Material Isolation ---');

const backdropFilterDeclarations = [];
appRoot.walkDecls((decl) => {
  if (decl.prop === 'backdrop-filter') {
    backdropFilterDeclarations.push({
      selector: decl.parent.selector,
      value: decl.value,
      media: decl.parent.parent.type === 'atrule' ? decl.parent.parent.params : 'root'
    });
  }
});

console.log('    All backdrop-filter rules in App.css:');
backdropFilterDeclarations.forEach(d => console.log(`      ${d.selector} in [${d.media}]: ${d.value}`));

// Filter for active blur (not 'none')
const activeBlurs = backdropFilterDeclarations.filter(d => !d.value.includes('none'));

// Verify that active blurs ONLY occur on floating bars / overlays, NEVER on content cards (.card, .bento-item, .domain-page-card, .confirm-modal-card)
const illegalBlurredCards = activeBlurs.filter(d => {
  const sel = d.selector || '';
  return (
    sel.includes('.card') ||
    sel.includes('.domain-page-card') ||
    sel.includes('.bento-item') ||
    sel.includes('.confirm-modal-card') ||
    sel.includes('.modal-card')
  );
});

assert(
  illegalBlurredCards.length === 0,
  '5.1 Zero content cards (.card, .domain-page-card, .modal-card, .confirm-modal-card) have active backdrop-filter',
  `Violations: ${JSON.stringify(illegalBlurredCards)}`
);

// 5.2 Confirm .confirm-modal-card explicitly has no backdrop-filter
const modalBackdrops = backdropFilterDeclarations.filter(d => d.selector && d.selector.includes('confirm-modal-card'));
const hasExplicitNoneOrAbsent = modalBackdrops.length === 0 || modalBackdrops.every(d => d.value.includes('none'));
assert(
  hasExplicitNoneOrAbsent,
  '5.2 .confirm-modal-card has no blur compositing (backdrop-filter: none or absent)',
  `Declarations: ${JSON.stringify(modalBackdrops)}`
);

// 5.3 Active blurs are confined to floating elements (chrome bars .app-topbar, .mobile-bottom-bar, and floating overlays: .toast-item, .modal-backdrop, .confirm-modal-backdrop)
const nonConformingBlurs = activeBlurs.filter(d => {
  const sel = d.selector || '';
  const isFloatingBar = sel.includes('.app-topbar') || sel.includes('.mobile-bottom-bar') || sel.includes('.mobile-menu-overlay');
  const isFloatingOverlay = sel.includes('.toast-item') || sel.includes('.modal-backdrop') || sel.includes('.confirm-modal-backdrop');
  return !isFloatingBar && !isFloatingOverlay;
});
assert(
  nonConformingBlurs.length === 0,
  '5.3 Active Liquid Glass is strictly confined to floating chrome (.app-topbar, .mobile-bottom-bar) and floating HUD overlays',
  `Non-conforming: ${JSON.stringify(nonConformingBlurs)}`
);

// 5.4 Prefers-reduced-transparency disables blur on floating elements
let reducedTransparencyDisablesBlur = false;
appRoot.walkAtRules('media', (atRule) => {
  if (atRule.params.includes('prefers-reduced-transparency')) {
    atRule.walkDecls('backdrop-filter', (decl) => {
      if (decl.value.includes('none')) {
        reducedTransparencyDisablesBlur = true;
      }
    });
  }
});
assert(
  reducedTransparencyDisablesBlur,
  '5.4 @media (prefers-reduced-transparency: reduce) disables backdrop-filter on chrome elements',
  'Missing reduced-transparency override'
);

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n=== EMPIRICAL STRESS TEST RESULTS ===');
console.log(`Total assertions: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
  console.error('\nFAILURE DETAILS:');
  failures.forEach(f => console.error(`- ${f.testName}: ${f.details}`));
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL ASSERTIONS CONFIRMED CLEAN (100% PASS)');
  process.exit(0);
}
