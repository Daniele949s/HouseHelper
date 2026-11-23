#!/usr/bin/env node
/**
 * scripts/e2e-lib.mjs
 * Shared playwright-cli browser harness, isolated temp-cwd lifecycle,
 * dev/static server orchestration, and UI/UX/A11y/Security assertion probes.
 * Pure ASCII only.
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

export const VIEWPORTS = {
  mobileSmall: { name: 'mobile-375x812', width: 375, height: 812, isMobile: true },
  mobileLarge: { name: 'mobile-390x844', width: 390, height: 844, isMobile: true },
  tablet: { name: 'tablet-820x900', width: 820, height: 900, isMobile: false },
  desktopStandard: { name: 'desktop-1280x800', width: 1280, height: 800, isMobile: false },
  desktopWide: { name: 'desktop-1440x900', width: 1440, height: 900, isMobile: false }
};

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

export class KnownPreRemediationError extends Error {
  constructor(message, itemId) {
    super(message);
    this.name = 'KnownPreRemediationError';
    this.itemId = itemId;
  }
}

export class TestTracker {
  constructor({ skipKnownPreRemediation = false } = {}) {
    this.skipKnownPreRemediation = skipKnownPreRemediation;
    this.results = [];
  }

  record(flow, tier, id, description, status, detail = '') {
    this.results.push({ flow, tier, id, description, status, detail });
    const tag = status === 'PASS'
      ? '[PASS]'
      : status === 'PRE_REMEDIATION'
        ? '[PRE-REMEDIATION-FINDING]'
        : '[FAIL]';
    const suffix = detail ? ` - ${detail}` : '';
    console.log(`${tag} [${flow}][${tier}] ${id}: ${description}${suffix}`);
  }

  async check(flow, tier, id, description, fn, { knownPreRemediationItem = null } = {}) {
    try {
      await fn();
      this.record(flow, tier, id, description, 'PASS');
      return true;
    } catch (err) {
      if (this.skipKnownPreRemediation && knownPreRemediationItem) {
        this.record(
          flow,
          tier,
          id,
          description,
          'PRE_REMEDIATION',
          `(${knownPreRemediationItem}) ${err.message}`
        );
        return false;
      }
      this.record(flow, tier, id, description, 'FAIL', err.message);
      return false;
    }
  }

  summary() {
    const passed = this.results.filter((r) => r.status === 'PASS').length;
    const failed = this.results.filter((r) => r.status === 'FAIL').length;
    const preRemediation = this.results.filter((r) => r.status === 'PRE_REMEDIATION').length;
    return { total: this.results.length, passed, failed, preRemediation, results: this.results };
  }
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function createPlaywrightClient({
  sessionId = `hh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  headed = false
} = {}) {
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-e2e-'));
  let isOpen = false;
  let cleaned = false;

  function runCli(args, { allowError = false, parseJson = true } = {}) {
    const fullArgs = [`-s=${sessionId}`, ...args];
    if (parseJson && !fullArgs.includes('--json')) {
      fullArgs.push('--json');
    }

    try {
      const stdout = execFileSync('playwright-cli', fullArgs, {
        cwd: scratchDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 45000
      });
      const trimmed = (stdout || '').trim();
      if (!parseJson) return trimmed;
      if (!trimmed) return {};
      try {
        return JSON.parse(trimmed);
      } catch {
        return { raw: trimmed };
      }
    } catch (err) {
      const out = (err.stdout || '').toString().trim();
      const stderr = (err.stderr || '').toString().trim();
      if (allowError) {
        return { isError: true, stdout: out, stderr };
      }
      throw new Error(`playwright-cli ${args.join(' ')} failed: ${stderr || out || err.message}`);
    }
  }

  function close() {
    if (cleaned) return;
    cleaned = true;
    try {
      if (isOpen) {
        execFileSync('playwright-cli', [`-s=${sessionId}`, 'close'], {
          cwd: scratchDir,
          stdio: 'ignore',
          timeout: 10000
        });
      }
    } catch {
      // Best-effort close
    } finally {
      isOpen = false;
      try {
        fs.rmSync(scratchDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    }
  }

  const onSignal = () => {
    close();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  return {
    sessionId,
    scratchDir,
    open(url) {
      const args = ['open', url];
      if (headed) args.push('--headed');
      const res = runCli(args);
      isOpen = true;
      return res;
    },
    goto(url) {
      return runCli(['goto', url]);
    },
    reload() {
      return runCli(['reload']);
    },
    resize(width, height) {
      return runCli(['resize', String(width), String(height)]);
    },
    setColorScheme(scheme) {
      return runCli(['set-color-scheme', scheme]);
    },
    clearColorScheme() {
      return runCli(['clear-color-scheme']);
    },
    setReducedMotion(mode) {
      return runCli(['set-reduced-motion', mode]);
    },
    clearReducedMotion() {
      return runCli(['clear-reduced-motion']);
    },
    click(target) {
      return runCli(['click', target]);
    },
    dblclick(target) {
      return runCli(['dblclick', target]);
    },
    fill(target, value, { submit = false } = {}) {
      const args = ['fill', target, String(value)];
      if (submit) args.push('--submit');
      return runCli(args);
    },
    type(text) {
      return runCli(['type', String(text)]);
    },
    press(key) {
      return runCli(['press', key]);
    },
    select(target, value) {
      return runCli(['select', target, String(value)]);
    },
    check(target) {
      return runCli(['check', target]);
    },
    uncheck(target) {
      return runCli(['uncheck', target]);
    },
    snapshot() {
      return runCli(['snapshot']);
    },
    evalRaw(fnExpr, target) {
      const args = ['eval', fnExpr];
      if (target) args.push(target);
      return runCli(args);
    },
    evalJson(fnExpr, target) {
      const outer = this.evalRaw(fnExpr, target);
      if (outer && outer.isError) {
        throw new Error(`eval error: ${outer.error || outer.stderr}`);
      }
      const val = outer?.result;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    runCode(codeStr) {
      const outer = runCli(['run-code', codeStr]);
      if (outer && outer.isError) {
        throw new Error(`run-code error: ${outer.error || outer.stderr}`);
      }
      const val = outer?.result;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    getConsoleErrors() {
      const res = runCli(['console', 'error'], { parseJson: false, allowError: true });
      const text = typeof res === 'string' ? res : (res.stdout || '');
      const match = text.match(/Errors:\s*(\d+)/i);
      const errorCount = match ? Number(match[1]) : 0;
      return { errorCount, raw: text };
    },
    clearConsole() {
      return runCli(['console', '--clear'], { parseJson: false, allowError: true });
    },
    waitMs(ms) {
      return this.runCode(`async page => { await page.waitForTimeout(${Number(ms)}); return true; }`);
    },
    async waitForCondition(predicateExpr, { timeoutMs = 8000, pollMs = 150, label = 'condition' } = {}) {
      const deadline = Date.now() + timeoutMs;
      let lastVal = null;
      while (Date.now() < deadline) {
        lastVal = this.evalJson(`() => { try { return Boolean(${predicateExpr}); } catch { return false; } }`);
        if (lastVal) return true;
        this.waitMs(pollMs);
      }
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}`);
    },
    waitForPathname(expectedPathname, timeoutMs = 8000) {
      return this.waitForCondition(
        `window.location.pathname === ${JSON.stringify(expectedPathname)}`,
        { timeoutMs, label: `pathname === ${expectedPathname}` }
      );
    },
    waitForText(substring, timeoutMs = 8000) {
      return this.waitForCondition(
        `(document.body && document.body.innerText || '').includes(${JSON.stringify(substring)})`,
        { timeoutMs, label: `text "${substring}"` }
      );
    },
    currentPath() {
      return this.evalJson('() => window.location.pathname');
    },
    bodyText() {
      return this.evalJson('() => document.body ? document.body.innerText : ""');
    },
    dispose() {
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      close();
    }
  };
}

export async function waitForHttpReady(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304) {
        return true;
      }
    } catch {
      // Keep polling
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for HTTP server at ${url}`);
}

export function startStaticBuildServer(buildDir, port = 3000) {
  return new Promise((resolve, reject) => {
    const indexHtmlPath = path.join(buildDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
      reject(new Error(`Build directory missing index.html: ${indexHtmlPath}`));
      return;
    }

    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || '/').split('?')[0];
      const safeRel = path.normalize(cleanUrl).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(buildDir, safeRel === '/' ? 'index.html' : safeRel);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = indexHtmlPath;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${port}`,
        stop: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

export async function startCraDevServer(repoRoot, port = 3000, extraEnv = {}) {
  const child = spawn('npm', ['start'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      BROWSER: 'none',
      PORT: String(port),
      HOST: '127.0.0.1',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs = (logs + chunk.toString()).slice(-8000);
  });
  child.stderr.on('data', (chunk) => {
    logs = (logs + chunk.toString()).slice(-8000);
  });

  const targetUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHttpReady(targetUrl, 90000);
  } catch (err) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
    throw new Error(`${err.message}\nServer logs:\n${logs}`);
  }

  return {
    url: targetUrl,
    stop: async () => {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        try {
          child.kill('SIGTERM');
        } catch {
          // Ignore
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  };
}

// =========================================================================
// STANDARDIZED BROWSER ASSERTION PROBES
// =========================================================================

export function assertNoConsoleErrors(client, contextLabel) {
  const { errorCount, raw } = client.getConsoleErrors();
  if (errorCount > 0) {
    const preview = raw.split('\n').slice(0, 8).join(' | ');
    throw new Error(`Console/page errors (${errorCount}) at ${contextLabel}: ${preview}`);
  }
}

export function assertNoHorizontalOverflow(client, contextLabel) {
  const metrics = client.evalJson(`() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    pathname: window.location.pathname
  })`);
  assert(
    metrics.scrollWidth <= metrics.innerWidth,
    `Horizontal overflow at ${contextLabel} (${metrics.pathname}): scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`
  );
}

export function assertMobileTouchTargets(client, contextLabel, { minPx = 44 } = {}) {
  const offenders = client.evalJson(`() => {
    const selectors = 'button, a.nav-item, a.mobile-bottom-tab, a.btn-primary, a.btn-secondary, [role="button"], [role="switch"], [role="tab"], input[type="checkbox"]';
    const els = Array.from(document.querySelectorAll(selectors));
    const bad = [];
    for (const el of els) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Exclude small inline checkboxes that live inside a >= 44px label/row container
      if (el.tagName === 'INPUT' && el.type === 'checkbox') {
        const parentRow = el.closest('label, .spesa-item, .checklist-item, .switch-row');
        if (parentRow) {
          const pr = parentRow.getBoundingClientRect();
          if (pr.height >= ${minPx} && pr.width >= ${minPx}) continue;
        }
      }
      if (r.width < ${minPx} || r.height < ${minPx}) {
        bad.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 60),
          label: (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height)
        });
      }
    }
    return bad;
  }`);

  assert(
    offenders.length === 0,
    `Touch targets < ${minPx}px at ${contextLabel}: ${JSON.stringify(offenders.slice(0, 5))}`
  );
}

export function assertMobileInputFontSize(client, contextLabel, { minPx = 16 } = {}) {
  const offenders = client.evalJson(`() => {
    const els = Array.from(document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea'));
    const bad = [];
    for (const el of els) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const fs = parseFloat(style.fontSize);
      if (fs < ${minPx}) {
        bad.push({
          id: el.id || el.name || el.type,
          fontSize: fs
        });
      }
    }
    return bad;
  }`);

  assert(
    offenders.length === 0,
    `Mobile inputs with fontSize < ${minPx}px at ${contextLabel}: ${JSON.stringify(offenders)}`
  );
}

export function assertInputIconContainment(client, contextLabel) {
  const result = client.evalJson(`() => {
    const wrappers = Array.from(document.querySelectorAll('.input-with-icon'));
    const bad = [];
    for (const w of wrappers) {
      const icon = w.querySelector('.input-prefix-icon');
      const input = w.querySelector('input, select, textarea');
      if (!icon || !input) continue;
      const ir = icon.getBoundingClientRect();
      const tr = input.getBoundingClientRect();
      if (tr.width === 0 || tr.height === 0) continue;
      const pl = parseFloat(window.getComputedStyle(input).paddingLeft || '0');
      const inside = ir.left >= tr.left - 1 && ir.right <= tr.right + 1 && ir.top >= tr.top - 1 && ir.bottom <= tr.bottom + 1;
      if (!inside || pl < 32) {
        bad.push({
          id: input.id || input.name,
          inside,
          paddingLeft: pl,
          iconLeft: Math.round(ir.left),
          inputLeft: Math.round(tr.left),
          iconTop: Math.round(ir.top),
          inputTop: Math.round(tr.top)
        });
      }
    }
    return { count: wrappers.length, bad };
  }`);

  assert(
    result.bad.length === 0,
    `Input prefix icons misaligned at ${contextLabel}: ${JSON.stringify(result.bad)}`
  );
}

export function assertThemeAndContrast(client, expectedTheme, contextLabel) {
  const report = client.evalJson(`() => {
    function parseRgba(str) {
      const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
      if (!m) return null;
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] !== undefined ? Number(m[4]) : 1 };
    }
    function relLum(c) {
      const f = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    function contrast(c1, c2) {
      const l1 = relLum(c1);
      const l2 = relLum(c2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }
    function resolveBg(el, skipSelf = false) {
      let cur = skipSelf ? el.parentElement : el;
      let acc = { r: 255, g: 255, b: 255, a: 1 };
      const stack = [];
      while (cur && cur.nodeType === 1) {
        const st = window.getComputedStyle(cur);
        const clip = st.webkitBackgroundClip || st.backgroundClip || '';
        const isTextClipped = clip === 'text';
        const c = parseRgba(st.backgroundColor);
        if (c && c.a > 0 && !isTextClipped) {
          stack.push(c);
        } else if (!isTextClipped && st.backgroundImage && st.backgroundImage.includes('gradient')) {
          const matches = st.backgroundImage.match(/rgba?\\([^)]+\\)/g);
          if (matches && matches.length > 0) {
            const gc = parseRgba(matches[0]);
            if (gc && gc.a > 0) stack.push(gc);
          }
        }
        cur = cur.parentElement;
      }
      stack.reverse();
      for (const c of stack) {
        const a = c.a;
        acc = {
          r: Math.round(c.r * a + acc.r * (1 - a)),
          g: Math.round(c.g * a + acc.g * (1 - a)),
          b: Math.round(c.b * a + acc.b * (1 - a)),
          a: 1
        };
      }
      return acc;
    }

    const html = document.documentElement;
    const dataTheme = html.getAttribute('data-theme');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const themeColor = themeColorMeta ? themeColorMeta.getAttribute('content') : null;

    const targets = Array.from(document.querySelectorAll('h1, h2, p.subtitle, label, .btn-primary, .btn-secondary, .error-alert, [role="alert"], .badge-warning, .status-badge'));
    const failures = [];
    for (const el of targets) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const clip = style.webkitBackgroundClip || style.backgroundClip || '';
      const isTextClipped = clip === 'text';
      let fg = parseRgba(style.color);
      if (isTextClipped && style.backgroundImage && style.backgroundImage.includes('gradient')) {
        const matches = style.backgroundImage.match(/rgba?\\([^)]+\\)/g);
        if (matches && matches.length > 0) fg = parseRgba(matches[matches.length - 1]) || fg;
      }
      if (!fg) continue;
      const bg = resolveBg(el, isTextClipped);
      const ratio = contrast(fg, bg);
      const fontSize = parseFloat(style.fontSize);
      const bold = parseInt(style.fontWeight, 10) >= 700;
      const isLarge = fontSize >= 24 || (bold && fontSize >= 18.66);
      const minRatio = isLarge ? 3.0 : 4.5;
      if (ratio < minRatio) {
        failures.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 40),
          text: (el.innerText || '').trim().slice(0, 30),
          ratio: Number(ratio.toFixed(2)),
          minRatio
        });
      }
    }

    return { dataTheme, themeColor, failures };
  }`);

  if (expectedTheme) {
    assert(
      report.dataTheme === expectedTheme,
      `Expected data-theme="${expectedTheme}" at ${contextLabel}, got "${report.dataTheme}"`
    );
  }
  assert(
    report.failures.length === 0,
    `WCAG AA contrast failures at ${contextLabel}: ${JSON.stringify(report.failures)}`
  );
  return report;
}

export function assertZeroEmojisInDom(client, contextLabel) {
  const found = client.evalJson(`() => {
    const text = document.body ? document.body.innerText : '';
    const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}]/gu;
    const matches = text.match(emojiRe) || [];
    return matches.slice(0, 10);
  }`);
  assert(
    found.length === 0,
    `Found forbidden Unicode emoji/arrow/symbol characters in DOM at ${contextLabel}: ${JSON.stringify(found)}`
  );
}

export function assertDialogFocusTrap(client, { dialogSelector, contextLabel }) {
  const info = client.evalJson(`() => {
    const dialog = document.querySelector(${JSON.stringify(dialogSelector)});
    if (!dialog) return { exists: false };
    const role = dialog.getAttribute('role');
    const ariaModal = dialog.getAttribute('aria-modal');
    const labelId = dialog.getAttribute('aria-labelledby');
    const labelAttr = dialog.getAttribute('aria-label');
    const hasAccessibleName = Boolean(labelAttr || (labelId && document.getElementById(labelId)?.innerText?.trim()));
    const activeInside = dialog.contains(document.activeElement);
    return { exists: true, role, ariaModal, hasAccessibleName, activeInside };
  }`);

  assert(info.exists, `Dialog ${dialogSelector} not found at ${contextLabel}`);
  assert(info.role === 'dialog', `Dialog ${dialogSelector} missing role="dialog" at ${contextLabel}`);
  assert(info.ariaModal === 'true', `Dialog ${dialogSelector} missing aria-modal="true" at ${contextLabel}`);
  assert(info.hasAccessibleName, `Dialog ${dialogSelector} missing accessible name at ${contextLabel}`);

  // Press Tab several times and ensure focus remains inside the dialog
  for (let i = 0; i < 6; i += 1) {
    client.press('Tab');
    const inside = client.evalJson(`() => {
      const dialog = document.querySelector(${JSON.stringify(dialogSelector)});
      return dialog ? dialog.contains(document.activeElement) : false;
    }`);
    assert(inside, `Focus escaped dialog ${dialogSelector} on Tab #${i + 1} at ${contextLabel}`);
  }
}

export function assertReducedMotion(client, contextLabel) {
  client.setReducedMotion('reduce');
  try {
    const offenders = client.evalJson(`() => {
      const bad = [];
      const els = Array.from(document.querySelectorAll('.bg-slide-active, .card, .btn-primary, .toast-item'));
      for (const el of els) {
        const st = window.getComputedStyle(el);
        const dur = parseFloat(st.animationDuration || '0');
        const iter = st.animationIterationCount;
        if (dur > 0.02 || iter === 'infinite') {
          bad.push({ cls: el.className, animationDuration: st.animationDuration, iterationCount: iter });
        }
      }
      return bad;
    }`);
    assert(
      offenders.length === 0,
      `Animations still active under prefers-reduced-motion: reduce at ${contextLabel}: ${JSON.stringify(offenders)}`
    );
  } finally {
    client.clearReducedMotion();
  }
}

export function assertOfflineCachePresent(client, casaId, contextLabel) {
  const keys = client.evalJson('() => Object.keys(localStorage).filter(k => k.startsWith("hh_offline_"))');
  assert(
    keys.some((k) => k.includes(casaId)),
    `Expected hh_offline_* cache for ${casaId} at ${contextLabel}, found ${JSON.stringify(keys)}`
  );
}

export function assertOfflineCacheEvicted(client, contextLabel) {
  const keys = client.evalJson('() => Object.keys(localStorage).filter(k => k.startsWith("hh_offline_"))');
  assert(
    keys.length === 0,
    `Expected 0 hh_offline_* keys after logout at ${contextLabel}, found ${JSON.stringify(keys)}`
  );
}

export function loginViaUi(client, baseUrl, email, password) {
  client.goto(`${baseUrl}/login`);
  client.waitForText('Accedi');
  client.fill('#login-email', email);
  client.fill('#login-password', password);
  client.click('button[type="submit"]');
}

export function logoutViaSettings(client, baseUrl) {
  client.goto(`${baseUrl}/impostazioni`);
  client.waitForCondition(
    'Boolean(document.querySelector("button.settings-logout-btn") || document.body.innerText.includes("Disconnetti") || document.body.innerText.includes("Log Out"))',
    { timeoutMs: 8000, label: 'settings logout button' }
  );
  client.evalJson(`() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => /Disconnetti|Log Out/i.test(b.innerText));
    if (!target) throw new Error('Logout button not found');
    target.click();
    return true;
  }`);
  client.waitForCondition(
    'Boolean(document.querySelector("[role=\\"dialog\\"]"))',
    { timeoutMs: 5000, label: 'logout confirm dialog' }
  );
  client.evalJson(`() => {
    const dlg = document.querySelector('[role="dialog"]');
    const btns = Array.from(dlg.querySelectorAll('button'));
    const confirm = btns.find(b => /Disconnetti|Conferma|Log Out|Confirm/i.test(b.innerText));
    if (!confirm) throw new Error('Confirm logout button not found');
    confirm.click();
    return true;
  }`);
  client.waitForPathname('/login', 8000);
}
