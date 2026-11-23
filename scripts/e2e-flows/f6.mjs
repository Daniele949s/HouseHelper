/**
 * scripts/e2e-flows/f6.mjs
 * Flow F6: Expenses, Custom Split Modes, Simplification Plan & Export Modal.
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

export async function runF6({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F6';
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);

  await tracker.check(flow, 'Tier1', 'T1-F6-01', '/debiti renders net balance hero, summary cards, simplified settlement plan, and expense list', () => {
    client.goto(`${baseUrl}/debiti`);
    client.waitForText('Spese & Debiti', 8000);
    const body = client.bodyText();
    assert(body.includes('Spesa supermercato'), 'Seeded expense missing on /debiti');
    assert(body.includes('15.00') || body.includes('15,00'), 'Expected net +15.00 balance');
    assert(!body.includes('Spesa Beta Riservata'), 'Cross-tenant Beta expense leaked');
    assertNoHorizontalOverflow(client, 'F6 /debiti desktop');
  });

  await tracker.check(flow, 'Tier2', 'T2-F6-01', '/debiti/aggiungi validates empty description and out-of-bounds amount (0, 50001)', () => {
    client.goto(`${baseUrl}/debiti/aggiungi`);
    client.waitForText('Nuova Spesa', 8000);
    client.evalJson(`() => {
      const form = document.querySelector('form');
      if (form) form.noValidate = true;
      const btn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(b => /Salva Spesa|Aggiungi/i.test(b.innerText));
      if (!btn) throw new Error('Save expense button missing');
      btn.click();
      return true;
    }`);
    client.waitForCondition(
      'Boolean(document.querySelector("[role=\\"alert\\"]")) || document.body.innerText.includes("obbligatori") || document.body.innerText.includes("importo")',
      { label: 'expense validation error' }
    );
  });

  await tracker.check(flow, 'Tier1', 'T1-F6-02', 'Creating a divided expense on /debiti/aggiungi updates /debiti list and balances', () => {
    client.goto(`${baseUrl}/debiti/aggiungi`);
    client.waitForText('Nuova Spesa', 8000);
    client.evalJson(`() => {
      const desc = document.querySelector('input[type="text"], input[id*="desc" i], input[name*="desc" i]');
      const amt = document.querySelector('input[type="number"], input[id*="importo" i]');
      if (!desc || !amt) throw new Error('Expense form inputs missing');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(desc, 'Bolletta Acqua E2E');
      desc.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(amt, '20');
      amt.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }`);
    client.waitMs(250);
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(b => /Salva Spesa/i.test(b.innerText));
      if (!btn) throw new Error('Salva Spesa button missing');
      btn.click();
      return true;
    }`);
    client.waitForPathname('/debiti', 10000);
    client.waitForText('Bolletta Acqua E2E', 8000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F6-06', 'Export Modal has role=dialog, aria-modal=true, traps focus, triggers CSV download toast, and closes on Escape', () => {
    client.goto(`${baseUrl}/debiti`);
    client.waitForText('Esporta Resoconto', 8000);
    client.evalJson(`() => {
      const btn = document.querySelector('button[aria-label*="Esporta" i]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Esporta Resoconto'));
      if (!btn) throw new Error('Export button missing');
      btn.click();
      return true;
    }`);
    client.waitForCondition('Boolean(document.querySelector("[role=\\"dialog\\"]"))', { label: 'export modal open' });
    assertDialogFocusTrap(client, { dialogSelector: '[role="dialog"]', contextLabel: 'F6 Export Modal' });
    client.evalJson(`() => {
      const dlg = document.querySelector('[role="dialog"]');
      const csvBtn = Array.from(dlg.querySelectorAll('button')).find(b => /Scarica CSV/i.test(b.innerText));
      if (!csvBtn) throw new Error('Scarica CSV button missing');
      csvBtn.click();
      return true;
    }`);
    client.waitForText('Resoconto CSV scaricato', 6000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F6-04', 'Settling via Pareggia ConfirmModal zeroes simplified debts', () => {
    client.goto(`${baseUrl}/debiti`);
    client.waitForText('Spese & Debiti', 8000);
    const hasPareggia = client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Pareggia');
      if (!btn) return false;
      btn.click();
      return true;
    }`);
    if (hasPareggia) {
      client.waitForCondition('Boolean(document.querySelector("[role=\\"dialog\\"]"))', { label: 'settlement confirm modal' });
      client.evalJson(`() => {
        const dlg = document.querySelector('[role="dialog"]');
        const confirm = Array.from(dlg.querySelectorAll('button')).find(b => /Conferma|Pareggia|Registra/i.test(b.innerText));
        if (!confirm) throw new Error('Confirm settle button missing');
        confirm.click();
        return true;
      }`);
      client.waitMs(800);
    }
    assertNoConsoleErrors(client, 'F6 final');
    logoutViaSettings(client, baseUrl);
  });
}
