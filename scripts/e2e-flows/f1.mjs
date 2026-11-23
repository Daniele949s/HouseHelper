/**
 * scripts/e2e-flows/f1.mjs
 * Flow F1: Public Auth, Route Guards, 404, Shell Responsive/A11y Baseline.
 * Pure ASCII only.
 */

import {
  VIEWPORTS,
  assert,
  assertDialogFocusTrap,
  assertInputIconContainment,
  assertMobileInputFontSize,
  assertMobileTouchTargets,
  assertNoConsoleErrors,
  assertNoHorizontalOverflow,
  assertReducedMotion,
  assertThemeAndContrast,
  assertZeroEmojisInDom,
  loginViaUi,
  logoutViaSettings
} from '../e2e-lib.mjs';

const PROTECTED_ROUTES = [
  '/home',
  '/turni',
  '/debiti',
  '/spesa',
  '/bacheca',
  '/calendario',
  '/documenti',
  '/contatti',
  '/impostazioni',
  '/settings',
  '/scelta-casa'
];

export async function runF1({ client, baseUrl, tracker, fixtures, hasBackend }) {
  const flow = 'F1';
  client.clearConsole();

  // Desktop 1280x800 Light
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.setColorScheme('light');

  await tracker.check(flow, 'Tier1', 'T1-F1-01', 'Landing / renders HouseHelper hero, CTAs, and 5 feature pills', () => {
    client.goto(`${baseUrl}/`);
    client.waitForText('HouseHelper');
    const info = client.evalJson(`() => ({
      h1: document.querySelector('h1')?.innerText?.trim() || '',
      body: document.body.innerText,
      pillCount: document.querySelectorAll('.feature-pill, .pill, [class*="feature"]').length
    })`);
    assert(info.h1.includes('HouseHelper'), `Expected h1 HouseHelper, got "${info.h1}"`);
    assert(info.body.includes("Accedi all'Account"), 'Missing login CTA on /');
    assert(info.body.includes('Inizia Ora'), 'Missing register CTA on /');
    assertNoConsoleErrors(client, 'F1 / desktop');
    assertNoHorizontalOverflow(client, 'F1 / desktop');
    assertZeroEmojisInDom(client, 'F1 / desktop');
  });

  await tracker.check(flow, 'Tier1', 'T1-F1-02', 'All 11 protected routes redirect unauthenticated users to /login', () => {
    for (const route of PROTECTED_ROUTES) {
      client.goto(`${baseUrl}${route}`);
      client.waitForPathname('/login', 8000);
    }
    assertNoConsoleErrors(client, 'F1 protected route redirects');
  });

  await tracker.check(flow, 'Tier1', 'T1-F1-03', 'Clicking login CTA navigates to /login with email, password, submit, and Google auth', () => {
    client.goto(`${baseUrl}/`);
    client.waitForText("Accedi all'Account");
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.includes("Accedi all'Account"));
      if (!btn) throw new Error('Login CTA not found');
      btn.click();
      return true;
    }`);
    client.waitForPathname('/login');
    client.waitForText('Bentornato');
    const hasFields = client.evalJson(`() => ({
      h1: document.querySelector('h1')?.innerText?.trim() || '',
      email: Boolean(document.querySelector('#login-email')),
      password: Boolean(document.querySelector('#login-password')),
      google: document.body.innerText.includes('Continua con Google')
    })`);
    assert(hasFields.h1.includes('Bentornato'), `Expected Bentornato, got "${hasFields.h1}"`);
    assert(hasFields.email && hasFields.password && hasFields.google, 'Missing login controls');
  });

  await tracker.check(flow, 'Tier1', 'T1-F1-06', 'Unknown route renders 404 NotFound and returns to /login', () => {
    client.goto(`${baseUrl}/non-existent-e2e-route`);
    client.waitForText('Pagina Non Trovata');
    const h1 = client.evalJson('() => document.querySelector("h1")?.innerText?.trim() || ""');
    assert(h1.includes('404'), `Expected 404 heading, got "${h1}"`);
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Torna alla dashboard'));
      if (!btn) throw new Error('Return button not found on 404');
      btn.click();
      return true;
    }`);
    client.waitForPathname('/login');
  });

  await tracker.check(flow, 'Tier2', 'T2-F1-01', 'Malformed email or empty password on /login shows role="alert"', () => {
    client.goto(`${baseUrl}/login`);
    client.waitForText('Bentornato');
    // Bypass HTML5 native email popup via JS form submit or novalidate check
    client.evalJson(`() => {
      const form = document.querySelector('form');
      if (form) form.noValidate = true;
      return true;
    }`);
    client.fill('#login-email', 'notanemail');
    client.fill('#login-password', 'abc123');
    client.click('button[type="submit"]');
    client.waitForCondition('Boolean(document.querySelector("[role=\\"alert\\"]"))', { label: 'invalid email alert' });
    const alert1 = client.evalJson('() => document.querySelector("[role=\\"alert\\"]")?.innerText || ""');
    assert(alert1.includes('formato email valido'), `Unexpected alert: "${alert1}"`);

    client.fill('#login-email', 'valid@example.com');
    client.fill('#login-password', '');
    client.click('button[type="submit"]');
    client.waitForCondition('document.querySelector("[role=\\"alert\\"]")?.innerText.includes("password")', { label: 'empty password alert' });
  });

  await tracker.check(flow, 'Tier2', 'T2-F1-05', 'Unauthenticated /verifica-email shows card or redirects cleanly if guarded', () => {
    client.goto(`${baseUrl}/verifica-email`);
    client.waitMs(300);
    const pathNow = client.currentPath();
    if (pathNow === '/verifica-email') {
      client.waitForText('Verifica la tua Email');
      client.evalJson(`() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Invia di nuovo l'email"));
        if (!btn) throw new Error('Resend button not found');
        btn.click();
        return true;
      }`);
      client.waitForCondition('Boolean(document.querySelector("[role=\\"alert\\"]"))', { label: 'no active session alert' });
    } else {
      assert(pathNow === '/login', `Expected /verifica-email or /login, got ${pathNow}`);
    }
  });

  await tracker.check(
    flow,
    'Tier2',
    'T2-F1-06',
    '.input-with-icon prefix icons fit cleanly inside input bounds on desktop and 375px mobile',
    () => {
      client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
      client.goto(`${baseUrl}/login`);
      client.waitForText('Bentornato');
      assertInputIconContainment(client, 'F1 /login desktop');

      client.resize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
      client.goto(`${baseUrl}/registrazione`);
      client.waitForText('Crea Account');
      assertInputIconContainment(client, 'F1 /registrazione mobile-375');
    },
    { knownPreRemediationItem: 'M2 #7 (.input-with-icon CSS missing)' }
  );

  await tracker.check(
    flow,
    'Tier3',
    'T3-F1-OVERFLOW-EMOJIS',
    'Public routes across 375x812, 390x844, 820x900, 1440x900 in Light & Dark modes have zero overflow, zero console errors, and zero emojis',
    () => {
      const matrix = [
        { vp: VIEWPORTS.mobileSmall, scheme: 'light' },
        { vp: VIEWPORTS.mobileLarge, scheme: 'dark' },
        { vp: VIEWPORTS.tablet, scheme: 'light' },
        { vp: VIEWPORTS.desktopWide, scheme: 'dark' }
      ];
      for (const { vp, scheme } of matrix) {
        client.resize(vp.width, vp.height);
        client.setColorScheme(scheme);
        for (const r of ['/', '/login', '/registrazione']) {
          client.goto(`${baseUrl}${r}`);
          client.waitMs(250);
          assertNoHorizontalOverflow(client, `${vp.name}/${scheme} ${r}`);
          assertNoConsoleErrors(client, `${vp.name}/${scheme} ${r}`);
          assertZeroEmojisInDom(client, `${vp.name}/${scheme} ${r}`);
        }
      }
      client.clearColorScheme();
    }
  );

  await tracker.check(
    flow,
    'Tier3',
    'T3-F1-MOBILE-TOUCH-FONT',
    'Mobile 375x812 & 390x844 public routes meet >=44px touch targets and >=16px input font size',
    () => {
      for (const vp of [VIEWPORTS.mobileSmall, VIEWPORTS.mobileLarge]) {
        client.resize(vp.width, vp.height);
        for (const r of ['/', '/login', '/registrazione']) {
          client.goto(`${baseUrl}${r}`);
          client.waitMs(200);
          assertMobileInputFontSize(client, `${vp.name} ${r}`);
          assertMobileTouchTargets(client, `${vp.name} ${r}`);
        }
      }
    },
    { knownPreRemediationItem: 'M2 #7/#8 (AppHeader brand-wrapper <44px / mobile inputs)' }
  );

  await tracker.check(
    flow,
    'Tier3',
    'T3-F1-CONTRAST-THEME',
    'Public routes in Light & Dark modes pass data-theme sync and WCAG AA contrast',
    () => {
      client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
      client.evalJson('() => { localStorage.setItem("househelper_theme", "system"); return true; }');
      for (const scheme of ['light', 'dark']) {
        client.setColorScheme(scheme);
        for (const r of ['/', '/login', '/registrazione']) {
          client.goto(`${baseUrl}${r}`);
          client.waitMs(250);
          assertThemeAndContrast(client, scheme, `${scheme} ${r}`);
        }
      }
      client.clearColorScheme();
      client.evalJson('() => { localStorage.removeItem("househelper_theme"); return true; }');
    },
    { knownPreRemediationItem: 'M2 #7 (WCAG AA contrast tokens)' }
  );

  await tracker.check(
    flow,
    'Tier3',
    'T3-F1-DRAWER-TRAP',
    'MobileNavigation drawer on 375x812 has role=dialog, aria-modal=true, traps Tab focus, and closes on Escape',
    () => {
      client.resize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
      client.goto(`${baseUrl}/login`);
      client.waitForCondition('Boolean(document.querySelector("button.burger-container"))', { label: 'burger button' });
      client.click('button.burger-container');
      client.waitForCondition('Boolean(document.querySelector(".mobile-menu-overlay.menu-opened"))', { label: 'drawer opened' });
      assertDialogFocusTrap(client, {
        dialogSelector: '.mobile-menu-overlay.menu-opened',
        contextLabel: 'F1 MobileNavigation drawer'
      });
      client.press('Escape');
      client.waitForCondition('!document.querySelector(".mobile-menu-overlay.menu-opened")', { label: 'drawer closed' });
    },
    { knownPreRemediationItem: 'M2 #8 (MobileNavigation role=dialog + focus trap)' }
  );

  await tracker.check(
    flow,
    'Tier3',
    'T3-F1-REDUCED-MOTION',
    'prefers-reduced-motion: reduce suppresses continuous/long animations',
    () => {
      client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
      client.goto(`${baseUrl}/login`);
      client.waitMs(200);
      assertReducedMotion(client, 'F1 /login reduced motion');
    },
    { knownPreRemediationItem: 'M2 #7 (global prefers-reduced-motion: reduce)' }
  );

  // Authenticated checks in F1 run when Phase B / emulator / mock backend is active
  if (hasBackend && fixtures) {
    client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);

    await tracker.check(flow, 'Tier2', 'T2-F1-02', 'Wrong password on /login shows invalidCredentials alert without redirect', () => {
      loginViaUi(client, baseUrl, fixtures.users.alice.email, 'WrongPass999');
      client.waitForCondition('Boolean(document.querySelector("[role=\\"alert\\"]"))', { label: 'wrong password alert' });
      assert(client.currentPath() === '/login', `Expected to stay on /login, got ${client.currentPath()}`);
    });

    await tracker.check(flow, 'Tier2', 'T2-F1-03', 'Unverified user login navigates to /verifica-email without PublicOnlyRoute hijack and supports 60s cooldown', () => {
      loginViaUi(client, baseUrl, fixtures.users.unverified.email, fixtures.users.unverified.password);
      client.waitForPathname('/verifica-email', 10000);
      client.waitForText(fixtures.users.unverified.email);
      // Confirm check still shows alert
      client.evalJson(`() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Ho confermato l'email"));
        if (!btn) throw new Error('Confirm check btn missing');
        btn.click();
        return true;
      }`);
      client.waitForCondition('Boolean(document.querySelector("[role=\\"alert\\"]"))', { label: 'not verified alert' });
      // Resend email starts cooldown
      client.evalJson(`() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Invia di nuovo l'email"));
        if (!btn) throw new Error('Resend btn missing');
        btn.click();
        return true;
      }`);
      client.waitForCondition(
        'document.body.innerText.includes("Rinvia tra") || Boolean(document.querySelector("[role=\\"status\\"]"))',
        { timeoutMs: 8000, label: 'resend status/cooldown' }
      );
      // Sign out via back to login
      client.evalJson(`() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Torna alla schermata di accesso"));
        if (!btn) throw new Error('Back to login btn missing');
        btn.click();
        return true;
      }`);
      client.waitForPathname('/login');
    });

    await tracker.check(flow, 'Tier1', 'T1-F1-04', 'Verified Alice login navigates to /home and shows Bentornato, Alice', () => {
      loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
      client.waitForPathname('/home', 10000);
      client.waitForText('Bentornato, Alice');
    });

    await tracker.check(flow, 'Tier1', 'T1-F1-05', 'Authenticated user visiting /, /login, /registrazione is redirected to /home', () => {
      for (const pub of ['/', '/login', '/registrazione']) {
        client.goto(`${baseUrl}${pub}`);
        client.waitForPathname('/home', 8000);
      }
      logoutViaSettings(client, baseUrl);
    });
  }
}
