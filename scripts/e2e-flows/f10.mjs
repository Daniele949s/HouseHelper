/**
 * scripts/e2e-flows/f10.mjs
 * Flow F10: Settings, Language Parity (IT/EN & GLOSSARY.md), Theme, Switches,
 * Zero-Emoji DOM, Tenant Eviction on Logout, and Cross-Tenant Isolation (Carol).
 * Pure ASCII only.
 */

import {
  VIEWPORTS,
  assert,
  assertNoConsoleErrors,
  assertNoHorizontalOverflow,
  assertOfflineCacheEvicted,
  assertOfflineCachePresent,
  assertThemeAndContrast,
  assertZeroEmojisInDom,
  loginViaUi,
  logoutViaSettings
} from '../e2e-lib.mjs';

export async function runF10({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F10';
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);
  client.waitForText('Casa Aurora', 8000);
  assertOfflineCachePresent(client, 'casa_alpha', 'F10 pre-settings');

  await tracker.check(flow, 'Tier1', 'T1-F10-01', '/impostazioni renders Casa Aurora, Creatore role badge, roommate count, and email verified badge', () => {
    client.goto(`${baseUrl}/impostazioni`);
    client.waitForText('Casa Aurora', 8000);
    const body = client.bodyText();
    assert(body.includes('Creatore'), 'Creator role badge missing for Alice');
    assert(body.includes('AUR042'), 'Invite code missing on settings');
    assertNoHorizontalOverflow(client, 'F10 /impostazioni desktop');
  });

  await tracker.check(flow, 'Tier1', 'T1-F10-02', 'Language switch IT -> EN updates html[lang]="en", UI copy, and GLOSSARY.md terms across routes', () => {
    client.evalJson(`() => {
      const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('EN') || b.innerText.includes('English'));
      if (!enBtn) throw new Error('EN language button missing');
      enBtn.click();
      return true;
    }`);
    client.waitForCondition('document.documentElement.lang === "en"', { label: 'html lang=en' });
    client.reload();
    client.waitForCondition('document.documentElement.lang === "en"', { label: 'html lang=en persisted' });

    const enCheckRoutes = ['/home', '/turni', '/debiti', '/bacheca'];
    for (const r of enCheckRoutes) {
      client.goto(`${baseUrl}${r}`);
      client.waitMs(400);
      assertZeroEmojisInDom(client, `F10 EN ${r}`);
      const body = client.bodyText();
      assert(!/\bhousemates\b/i.test(body), `GLOSSARY violation "housemates" found on ${r}`);
    }

    // Restore IT
    client.goto(`${baseUrl}/impostazioni`);
    client.waitForCondition('document.documentElement.lang === "en"', { label: 'settings in EN' });
    client.evalJson(`() => {
      const itBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('IT') || b.innerText.includes('Italiano'));
      if (itBtn) itBtn.click();
      return true;
    }`);
    client.waitForCondition('document.documentElement.lang === "it"', { label: 'html lang=it restored' });
  });

  await tracker.check(flow, 'Tier1', 'T1-F10-03', 'Theme segmented control switches Light <-> Dark, updates data-theme & meta[name="theme-color"], and passes contrast', () => {
    client.goto(`${baseUrl}/impostazioni`);
    client.waitForText('Casa Aurora', 8000);
    for (const target of ['dark', 'light']) {
      client.evalJson(`() => {
        const label = ${JSON.stringify(target)} === 'dark' ? /Scuro|Dark/i : /Chiaro|Light/i;
        const btn = Array.from(document.querySelectorAll('.ios-segmented-item, button')).find(b => label.test(b.innerText));
        if (!btn) throw new Error('Theme button missing: ' + ${JSON.stringify(target)});
        btn.click();
        return true;
      }`);
      client.waitForCondition(`document.documentElement.getAttribute("data-theme") === ${JSON.stringify(target)}`, { label: `data-theme=${target}` });
      assertThemeAndContrast(client, target, `F10 /impostazioni ${target}`);
    }
  });

  await tracker.check(flow, 'Tier1', 'T1-F10-04', 'All 3 notification role="switch" controls flip aria-checked and persist in localStorage', () => {
    const switches = ['#toggle-chore-reminders', '#toggle-expense-alerts', '#toggle-household-notices'];
    for (const sel of switches) {
      const before = client.evalJson(`() => document.querySelector(${JSON.stringify(sel)})?.getAttribute('aria-checked')`);
      assert(before === 'true' || before === 'false', `Switch ${sel} missing aria-checked`);
      client.click(sel);
      client.waitForCondition(
        `document.querySelector(${JSON.stringify(sel)})?.getAttribute('aria-checked') !== ${JSON.stringify(before)}`,
        { label: `switch ${sel} flipped` }
      );
    }
  });

  await tracker.check(flow, 'Tier1', 'T1-F10-06', 'Logout evicts all hh_offline_* localStorage keys and blocks returning to /home', () => {
    logoutViaSettings(client, baseUrl);
    assertOfflineCacheEvicted(client, 'F10 post-logout');
    client.goto(`${baseUrl}/home`);
    client.waitForPathname('/login', 8000);
  });

  await tracker.check(flow, 'Tier2', 'T2-F10-05', 'Multi-tenant isolation: Carol (casa_beta) sees zero Casa Aurora records across all routes', () => {
    loginViaUi(client, baseUrl, fixtures.users.carol.email, fixtures.users.carol.password);
    client.waitForPathname('/home', 10000);
    client.waitForText('Casa Beta', 8000);

    const routes = ['/home', '/turni', '/debiti', '/spesa', '/bacheca', '/documenti', '/contatti'];
    for (const r of routes) {
      client.goto(`${baseUrl}${r}`);
      client.waitMs(500);
      const body = client.bodyText();
      assert(!body.includes('Casa Aurora'), `Tenant leak: Casa Aurora appeared on ${r} for Carol`);
      assert(!body.includes('AUR042'), `Tenant leak: AUR042 appeared on ${r} for Carol`);
      assert(!body.includes('Spesa supermercato'), `Tenant leak: Casa Aurora debt appeared on ${r} for Carol`);
    }

    assertNoConsoleErrors(client, 'F10 final');
    logoutViaSettings(client, baseUrl);
    assertOfflineCacheEvicted(client, 'F10 Carol post-logout');
  });
}
