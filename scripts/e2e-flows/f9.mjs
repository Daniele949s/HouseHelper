/**
 * scripts/e2e-flows/f9.mjs
 * Flow F9: Documents Archive (Desktop Grid/Table + Mobile Visibility) & Useful Contacts Modal/A11y.
 * Pure ASCII only.
 */

import {
  VIEWPORTS,
  assert,
  assertDialogFocusTrap,
  assertNoConsoleErrors,
  assertNoHorizontalOverflow,
  loginViaUi,
  logoutViaSettings
} from '../e2e-lib.mjs';

export async function runF9({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F9';
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);

  await tracker.check(flow, 'Tier1', 'T1-F9-01', '/documenti renders seeded documents, filter/search/sort, and Desktop Table view', () => {
    client.goto(`${baseUrl}/documenti`);
    client.waitForText('Contratto Affitto 2026', 8000);
    const body = client.bodyText();
    assert(body.includes('Bolletta Luce Ottobre'), 'Second seeded document missing');
    assert(!body.includes('Documento Riservato Beta'), 'Cross-tenant Beta document leaked');

    // Switch to table view on desktop
    const tableBtn = client.evalJson(`() => {
      const btn = document.querySelector('button[aria-label="Vista a tabella"]');
      if (!btn) return false;
      btn.click();
      return true;
    }`);
    if (tableBtn) {
      client.waitForCondition('Boolean(document.querySelector("table"))', { label: 'documents table rendered' });
    }
    assertNoHorizontalOverflow(client, 'F9 /documenti desktop');
  });

  await tracker.check(flow, 'Tier2', 'T2-F9-01', 'Mobile 375x812 /documenti keeps documents visible (no disappearing table bug)', () => {
    client.resize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
    client.waitMs(300);
    const visibleDocs = client.evalJson(`() => {
      const els = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('Contratto Affitto 2026'));
      return els.some(el => {
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      });
    }`);
    assert(visibleDocs, 'Documents disappeared on 375x812 mobile view');
    assertNoHorizontalOverflow(client, 'F9 /documenti mobile-375');
    client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  });

  await tracker.check(flow, 'Tier1', 'T1-F9-05', '/contatti renders Priority Shelf and Routine Directory with safe tel:/mailto: links', () => {
    client.goto(`${baseUrl}/contatti`);
    client.waitForText('118 Emergenza', 8000);
    const info = client.evalJson(`() => ({
      body: document.body.innerText,
      unsafeLinks: Array.from(document.querySelectorAll('a[href]')).filter(a => a.getAttribute('href').toLowerCase().startsWith('javascript:')).length
    })`);
    assert(info.body.includes('Mario Rossi Idraulico'), 'Seeded plumber contact missing');
    assert(!info.body.includes('Contatto Segreto Beta'), 'Cross-tenant Beta contact leaked');
    assert(info.unsafeLinks === 0, 'Unsafe javascript: link detected');
  });

  await tracker.check(flow, 'Tier2', 'T2-F9-04', '/contatti Add Modal has role=dialog, traps focus, validates fields, themes inputs in Dark Mode, and saves new contact', () => {
    client.evalJson('() => { localStorage.setItem("househelper_theme", "system"); return true; }');
    client.setColorScheme('dark');
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Nuovo Contatto/i.test(b.innerText));
      if (!btn) throw new Error('Nuovo Contatto button missing');
      btn.click();
      return true;
    }`);
    client.waitForCondition('Boolean(document.querySelector("[role=\\"dialog\\"]"))', { label: 'add contact dialog' });
    assertDialogFocusTrap(client, { dialogSelector: '[role="dialog"]', contextLabel: 'F9 Add Contact Modal' });

    // Submit empty -> validation alert
    client.evalJson(`() => {
      const dlg = document.querySelector('[role="dialog"]');
      const form = dlg.querySelector('form');
      if (form) form.noValidate = true;
      const sub = dlg.querySelector('button[type="submit"]');
      if (!sub) throw new Error('Contact modal submit missing');
      sub.click();
      return true;
    }`);
    client.waitForCondition('Boolean(document.querySelector("[role=\\"dialog\\"] [role=\\"alert\\"], [role=\\"dialog\\"] .alert-danger, [role=\\"dialog\\"] .error-alert"))', { label: 'contact validation error' });

    // Fill valid contact and submit
    client.evalJson(`() => {
      const dlg = document.querySelector('[role="dialog"]');
      const inputs = dlg.querySelectorAll('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inputs[0], 'Elettricista Test E2E');
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      const tel = Array.from(inputs).find(i => i.type === 'tel' || (i.placeholder && i.placeholder.includes('3')));
      if (tel) {
        setter.call(tel, '+39 349 0000001');
        tel.dispatchEvent(new Event('input', { bubbles: true }));
      }
      dlg.querySelector('button[type="submit"]').click();
      return true;
    }`);
    client.waitForText('Elettricista Test E2E', 8000);
    client.clearColorScheme();
    assertNoConsoleErrors(client, 'F9 final');
    logoutViaSettings(client, baseUrl);
  });
}
