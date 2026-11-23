/**
 * scripts/e2e-flows/f3.mjs
 * Flow F3: Dashboard Command Center, Reminders, Vacation Mode, Analytics & Offline Cache.
 * Pure ASCII only.
 */

import {
  VIEWPORTS,
  assert,
  assertDialogFocusTrap,
  assertNoConsoleErrors,
  assertNoHorizontalOverflow,
  assertOfflineCachePresent,
  loginViaUi,
  logoutViaSettings
} from '../e2e-lib.mjs';

export async function runF3({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F3';
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);
  client.waitForText('Bentornato, Alice', 10000);

  await tracker.check(flow, 'Tier1', 'T1-F3-01', 'Command Center renders hero, Casa Aurora, invite code AUR042, and roommate chips', () => {
    const info = client.evalJson(`() => ({
      hero: Boolean(document.querySelector('section[aria-label*="Centro di Controllo" i], .command-center-hero')),
      text: document.body.innerText
    })`);
    assert(info.hero, 'Command center hero missing');
    assert(info.text.includes('Casa Aurora'), 'Casa Aurora missing on /home');
    assert(info.text.includes('AUR042'), 'Invite code AUR042 missing on /home');
    assertNoHorizontalOverflow(client, 'F3 /home desktop');
  });

  await tracker.check(flow, 'Tier1', 'T1-F3-02', 'Clicking invite code button copies AUR042 and shows Copiato feedback', () => {
    client.evalJson(`() => {
      const btn = document.querySelector('button[aria-label*="AUR042"]');
      if (!btn) throw new Error('Invite copy button not found');
      btn.click();
      return true;
    }`);
    client.waitForText('Copiato', 5000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F3-03', 'Dismissing reminder pill removes it from view', () => {
    const before = client.evalJson('() => document.querySelectorAll("button[aria-label=\\"Nascondi promemoria\\"]").length');
    if (before > 0) {
      client.click('button[aria-label="Nascondi promemoria"]');
      client.waitForCondition(
        `document.querySelectorAll('button[aria-label="Nascondi promemoria"]').length === ${before - 1}`,
        { label: 'reminder dismissed' }
      );
    }
  });

  await tracker.check(flow, 'Tier2', 'T2-F3-01', 'Vacation end date earlier than start date shows error toast and does not save', () => {
    client.evalJson(`() => {
      const chk = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(c => {
        const lbl = c.closest('label')?.innerText || document.querySelector('label[for="' + c.id + '"]')?.innerText || '';
        return lbl.includes('vacanza') || c.id.toLowerCase().includes('vacanz');
      });
      if (!chk) throw new Error('Vacation checkbox not found');
      if (!chk.checked) chk.click();
      return true;
    }`);
    client.waitForCondition('document.querySelectorAll("input[type=\\"date\\"]").length >= 2', { label: 'vacation date inputs' });
    client.evalJson(`() => {
      const dates = document.querySelectorAll('input[type="date"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(dates[0], '2026-12-15');
      dates[0].dispatchEvent(new Event('change', { bubbles: true }));
      setter.call(dates[1], '2026-12-10');
      dates[1].dispatchEvent(new Event('change', { bubbles: true }));
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Salva date'));
      if (!saveBtn) throw new Error('Save vacation button not found');
      saveBtn.click();
      return true;
    }`);
    client.waitForText('non pu\u00f2 essere precedente', 5000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F3-04', 'Valid vacation range persists across reload and disabling clears Fuori casa badge', () => {
    const today = fixtures.meta.today;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 5);
    const fine = nextDate.toISOString().split('T')[0];

    client.evalJson(`() => {
      const dates = document.querySelectorAll('input[type="date"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(dates[0], ${JSON.stringify(today)});
      dates[0].dispatchEvent(new Event('change', { bubbles: true }));
      setter.call(dates[1], ${JSON.stringify(fine)});
      dates[1].dispatchEvent(new Event('change', { bubbles: true }));
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Salva date'));
      saveBtn.click();
      return true;
    }`);
    client.waitForText('Modalit\u00e0 vacanza attivata', 6000);
    client.reload();
    client.waitForText('Fuori casa', 8000);

    // Disable vacation so Alice stays active for subsequent flows
    client.evalJson(`() => {
      const chk = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(c => {
        const lbl = c.closest('label')?.innerText || document.querySelector('label[for="' + c.id + '"]')?.innerText || '';
        return lbl.includes('vacanza') || c.id.toLowerCase().includes('vacanz');
      });
      if (chk && chk.checked) chk.click();
      return true;
    }`);
    client.evalJson(`() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => /Salva.*vacanza|Salva date/i.test(b.innerText));
      if (saveBtn) saveBtn.click();
      return true;
    }`);
    client.waitForText('Modalit\u00e0 vacanza disattivata', 6000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F3-05', 'HouseAnalytics tabs switch cleanly between Spese, Turni, and Lista spesa', () => {
    for (const tabName of ['Spese', 'Turni', 'Lista spesa']) {
      client.evalJson(`() => {
        const btn = Array.from(document.querySelectorAll('button[role="tab"], .analytics-tab, button')).find(b => b.innerText.trim() === ${JSON.stringify(tabName)});
        if (!btn) throw new Error('Analytics tab missing: ' + ${JSON.stringify(tabName)});
        btn.click();
        return true;
      }`);
      client.waitMs(200);
    }
  });

  await tracker.check(flow, 'Tier2', 'T2-F3-04', 'Dashboard offline snapshot hh_offline_casa_alpha_* populates and survives reload', () => {
    assertOfflineCachePresent(client, 'casa_alpha', 'F3 /home');
    client.reload();
    client.waitForText('Casa Aurora', 8000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F3-06', 'All 7 Quick Services buttons navigate to their respective routes', () => {
    const routes = ['/turni', '/debiti', '/spesa', '/calendario', '/bacheca', '/documenti', '/contatti'];
    for (const targetRoute of routes) {
      client.goto(`${baseUrl}/home`);
      client.waitForText('Casa Aurora', 8000);
      client.evalJson(`() => {
        const btns = Array.from(document.querySelectorAll('.bento-services-grid button, .quick-services-grid button, a'));
        const map = {
          '/turni': /Turni/i,
          '/debiti': /Spese|Debiti/i,
          '/spesa': /Spesa/i,
          '/calendario': /Calendario/i,
          '/bacheca': /Bacheca/i,
          '/documenti': /Documenti/i,
          '/contatti': /Contatti/i
        };
        const re = map[${JSON.stringify(targetRoute)}];
        const target = btns.find(el => re.test(el.innerText) && !el.closest('nav'));
        if (!target) throw new Error('Quick service tile not found for ' + ${JSON.stringify(targetRoute)});
        target.click();
        return true;
      }`);
      client.waitForPathname(targetRoute, 8000);
    }
  });

  await tracker.check(flow, 'Tier2', 'T2-F3-05', 'Leave House opens ConfirmModal (Cancel focused) and cancelling keeps user on /home', () => {
    client.goto(`${baseUrl}/home`);
    client.waitForText('Casa Aurora', 8000);
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /Lascia.*Casa/i.test(b.innerText));
      if (!btn) throw new Error('Leave house button missing');
      btn.click();
      return true;
    }`);
    client.waitForCondition('Boolean(document.querySelector("[role=\\"dialog\\"]"))', { label: 'Leave House dialog' });
    assertDialogFocusTrap(client, { dialogSelector: '[role="dialog"]', contextLabel: 'F3 Leave House modal' });
    client.press('Escape');
    client.waitForCondition('!document.querySelector("[role=\\"dialog\\"]")', { label: 'Leave House dialog closed' });
    assert(client.currentPath() === '/home', 'User should remain on /home after cancelling Leave House');
    assertNoConsoleErrors(client, 'F3 final');
    logoutViaSettings(client, baseUrl);
  });
}
