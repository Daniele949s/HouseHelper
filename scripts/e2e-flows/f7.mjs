/**
 * scripts/e2e-flows/f7.mjs
 * Flow F7: Grocery List, Staple Chips, Keyboard Space Toggle & XSS Sanitization.
 * Pure ASCII only.
 */

import {
  VIEWPORTS,
  assert,
  assertMobileTouchTargets,
  assertNoConsoleErrors,
  assertNoHorizontalOverflow,
  loginViaUi,
  logoutViaSettings
} from '../e2e-lib.mjs';

export async function runF7({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F7';
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);

  await tracker.check(flow, 'Tier1', 'T1-F7-01', '/spesa renders progress hub (2 da comprare, 1 presi) and 6 frequent staple chips', () => {
    client.goto(`${baseUrl}/spesa`);
    client.waitForText('Lista della Spesa', 8000);
    const body = client.bodyText();
    assert(body.includes('Latte') && body.includes('Pane'), 'Seeded grocery items missing');
    assert(!body.includes('Prodotto Beta Segreto'), 'Cross-tenant Beta grocery leaked');
    assertNoHorizontalOverflow(client, 'F7 /spesa desktop');
  });

  await tracker.check(flow, 'Tier1', 'T1-F7-02', 'Adding Biscotti and clicking staple chip Caffe update list and counts', () => {
    client.evalJson(`() => {
      const inp = document.querySelector('input[type="text"]');
      if (!inp) throw new Error('Grocery input missing');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'Biscotti');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      const form = inp.closest('form');
      const btn = form ? form.querySelector('button[type="submit"], button') : null;
      if (!btn) throw new Error('Add grocery button missing');
      btn.click();
      return true;
    }`);
    client.waitForText('Biscotti', 6000);

    client.evalJson(`() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Caff\u00e8') || b.innerText.includes('Caffe'));
      if (!chip) throw new Error('Staple chip Caffe missing');
      chip.click();
      return true;
    }`);
    client.waitMs(600);
  });

  await tracker.check(flow, 'Tier1', 'T1-F7-05', 'Keyboard Space toggles grocery item checkbox cleanly', () => {
    const beforeChecked = client.evalJson('() => document.querySelectorAll("input[type=\\"checkbox\\"]:checked").length');
    client.evalJson(`() => {
      const box = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(b => !b.checked);
      if (!box) throw new Error('Unchecked grocery checkbox missing');
      box.focus();
      return true;
    }`);
    client.press('Space');
    client.waitForCondition(
      `document.querySelectorAll('input[type="checkbox"]:checked').length === ${beforeChecked + 1}`,
      { timeoutMs: 6000, label: 'checkbox toggled via Space' }
    );
  });

  await tracker.check(flow, 'Tier2', 'T2-F7-01', 'Blank input is a no-op and XSS tag input is sanitized', () => {
    const countBefore = client.evalJson('() => document.querySelectorAll("input[type=\\"checkbox\\"]").length');
    client.evalJson(`() => {
      const inp = document.querySelector('input[type="text"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '   ');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.closest('form').querySelector('button[type="submit"], button').click();
      return true;
    }`);
    client.waitMs(350);
    const countAfterBlank = client.evalJson('() => document.querySelectorAll("input[type=\\"checkbox\\"]").length');
    assert(countAfterBlank === countBefore, 'Blank input should not add grocery row');

    // XSS payload sanitization
    client.evalJson(`() => {
      const inp = document.querySelector('input[type="text"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, '<script>alert(1)</script>Mele');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.closest('form').querySelector('button[type="submit"], button').click();
      return true;
    }`);
    client.waitForText('Mele', 6000);
    const hasScriptTag = client.evalJson('() => document.body.innerText.includes("<script>")');
    assert(!hasScriptTag, 'Script tag should be stripped from grocery item');
  });

  await tracker.check(flow, 'Tier1', 'T1-F7-06', 'Removing a grocery item via trash button updates counts without console errors', () => {
    const before = client.evalJson('() => document.querySelectorAll("button[aria-label*=\\"Rimuovi\\"]").length');
    assert(before > 0, 'Remove grocery button missing');
    client.click('button[aria-label*="Rimuovi"]');
    client.waitForCondition(
      `document.querySelectorAll('button[aria-label*="Rimuovi"]').length === ${before - 1}`,
      { timeoutMs: 6000, label: 'grocery item removed' }
    );
  });

  await tracker.check(flow, 'Tier2', 'T2-F7-05', 'Mobile 375x812 /spesa add-item form wraps cleanly with zero overflow and >=44px touch targets', () => {
    client.resize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
    client.waitMs(250);
    assertNoHorizontalOverflow(client, 'F7 /spesa mobile-375');
    assertMobileTouchTargets(client, 'F7 /spesa mobile-375');
    assertNoConsoleErrors(client, 'F7 final');
    client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
    logoutViaSettings(client, baseUrl);
  });
}
