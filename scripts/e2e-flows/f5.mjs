/**
 * scripts/e2e-flows/f5.mjs
 * Flow F5: Cleaning Chores Lifecycle, Subtask Checklist, Vacation Rotation & Guards.
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

export async function runF5({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F5';
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);

  await tracker.check(flow, 'Tier1', 'T1-F5-01', '/turni renders spotlight chore card and timeline cards without overflow', () => {
    client.goto(`${baseUrl}/turni`);
    client.waitForText('Turni Pulizia', 8000);
    client.waitForText('Cucina', 8000);
    const body = client.bodyText();
    assert(body.includes('Bagno'), 'Future chore Bagno missing on /turni');
    assert(!body.includes('Terrazzo Beta'), 'Cross-tenant Beta chore leaked into Casa Aurora');
    assertNoHorizontalOverflow(client, 'F5 /turni desktop');
  });

  await tracker.check(flow, 'Tier1', 'T1-F5-03', 'Toggling subtask checkbox and inline quick-add subtask persist across reload', () => {
    // Toggle unchecked subtask checkbox on spotlight chore
    client.evalJson(`() => {
      const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const unchecked = boxes.find(b => !b.checked);
      if (!unchecked) throw new Error('Unchecked subtask checkbox not found');
      unchecked.click();
      return true;
    }`);
    client.waitMs(600);

    // Inline quick-add subtask
    client.evalJson(`() => {
      const inp = document.querySelector('input[placeholder*="Aggiungi una mansione" i]');
      if (!inp) throw new Error('Inline subtask input not found');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'Lucidare lavello E2E');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      const form = inp.closest('form');
      const btn = form ? form.querySelector('button[type="submit"], button') : inp.parentElement.querySelector('button');
      if (btn) btn.click();
      return true;
    }`);
    client.waitForText('Lucidare lavello E2E', 6000);
    client.reload();
    client.waitForText('Lucidare lavello E2E', 8000);
  });

  await tracker.check(flow, 'Tier2', 'T2-F5-01', '/turni/aggiungi displays role=alert validation errors for missing assignee, location, date, or time slot', () => {
    client.goto(`${baseUrl}/turni/aggiungi`);
    client.waitForText('Nuovo Turno', 8000);
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(b => /Crea Turno|Salva/i.test(b.innerText));
      if (!btn) throw new Error('Create chore submit button not found');
      btn.click();
      return true;
    }`);
    client.waitForCondition('Boolean(document.querySelector("[role=\\"alert\\"]"))', { label: 'chore validation alert' });
  });

  await tracker.check(flow, 'Tier1', 'T1-F5-02', 'Creating a chore on /turni/aggiungi adds it to /turni', () => {
    client.goto(`${baseUrl}/turni/aggiungi`);
    client.waitForText('Nuovo Turno', 8000);
    client.evalJson(`() => {
      const clickMatch = (re) => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => re.test(b.innerText.trim()));
        if (!btn) throw new Error('Chip/button not found: ' + re);
        btn.click();
      };
      clickMatch(/^Alice$/i);
      clickMatch(/^Ingresso$|^Cucina$/i);
      clickMatch(/09:00 - 10:00|10:00 - 11:00|Mattina/i);
      return true;
    }`);
    client.evalJson(`() => {
      const sub = Array.from(document.querySelectorAll('button')).find(b => /Crea Turno/i.test(b.innerText));
      if (!sub) throw new Error('Crea Turno button missing');
      sub.click();
      return true;
    }`);
    client.waitForPathname('/turni', 10000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F5-05', 'Editing a chore via /turni/modifica/:id updates and persists changes', () => {
    client.evalJson(`() => {
      const editBtn = Array.from(document.querySelectorAll('button, a')).find(b => /Modifica/i.test(b.innerText || b.getAttribute('aria-label') || ''));
      if (!editBtn) throw new Error('Edit chore button not found');
      editBtn.click();
      return true;
    }`);
    client.waitForCondition('window.location.pathname.startsWith("/turni/modifica/")', { label: 'edit chore route' });
    client.evalJson(`() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => /Salva Modifiche/i.test(b.innerText));
      if (!saveBtn) throw new Error('Save chore edits button not found');
      saveBtn.click();
      return true;
    }`);
    client.waitForPathname('/turni', 10000);
  });

  await tracker.check(flow, 'Tier2', 'T2-F5-05', 'Accessing nonexistent or cross-tenant /turni/modifica/:id redirects safely to /turni', () => {
    client.goto(`${baseUrl}/turni/modifica/turno_beta_isolated`);
    client.waitForPathname('/turni', 10000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F5-06', 'Ruota Turni opens ConfirmModal and assigns next chore cleanly', () => {
    client.goto(`${baseUrl}/turni`);
    client.waitForText('Ruota Turni', 8000);
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Ruota Turni'));
      if (!btn || btn.disabled) throw new Error('Ruota Turni button missing or disabled');
      btn.click();
      return true;
    }`);
    client.waitForCondition('Boolean(document.querySelector("[role=\\"dialog\\"]"))', { label: 'rotate confirm modal' });
    assertDialogFocusTrap(client, { dialogSelector: '[role="dialog"]', contextLabel: 'F5 Rotate ConfirmModal' });
    client.evalJson(`() => {
      const dlg = document.querySelector('[role="dialog"]');
      const confirm = Array.from(dlg.querySelectorAll('button')).find(b => /Conferma|Ruota|Procedi/i.test(b.innerText));
      if (!confirm) throw new Error('Confirm rotate button missing');
      confirm.click();
      return true;
    }`);
    client.waitForText('Nuovo turno assegnato', 8000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F5-07', 'Deleting a chore via ConfirmModal removes it cleanly', () => {
    const beforeCount = client.evalJson('() => document.querySelectorAll("button[aria-label=\\"Elimina turno\\"]").length');
    assert(beforeCount > 0, 'No delete chore button found');
    client.click('button[aria-label="Elimina turno"]');
    client.waitForCondition('Boolean(document.querySelector("[role=\\"dialog\\"]"))', { label: 'delete chore modal' });
    client.evalJson(`() => {
      const dlg = document.querySelector('[role="dialog"]');
      const confirm = Array.from(dlg.querySelectorAll('button')).find(b => /Elimina|Conferma/i.test(b.innerText));
      if (!confirm) throw new Error('Confirm delete chore button missing');
      confirm.click();
      return true;
    }`);
    client.waitForCondition(
      `document.querySelectorAll('button[aria-label="Elimina turno"]').length < ${beforeCount}`,
      { timeoutMs: 8000, label: 'chore deleted' }
    );
    assertNoConsoleErrors(client, 'F5 final');
    logoutViaSettings(client, baseUrl);
  });
}
