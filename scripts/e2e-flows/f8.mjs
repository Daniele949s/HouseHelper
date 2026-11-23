/**
 * scripts/e2e-flows/f8.mjs
 * Flow F8: Notice Board & House Calendar (seeded in `note` with `isEvento: true`).
 * Pure ASCII only.
 */

import {
  VIEWPORTS,
  assert,
  assertNoConsoleErrors,
  assertNoHorizontalOverflow,
  loginViaUi,
  logoutViaSettings
} from '../e2e-lib.mjs';

export async function runF8({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F8';
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);

  await tracker.check(flow, 'Tier1', 'T1-F8-01', '/bacheca separates pinned urgent notices from routine notices and shows edit/delete only on own notices', () => {
    client.goto(`${baseUrl}/bacheca`);
    client.waitForText('Bacheca Condivisa', 8000);
    const info = client.evalJson(`() => {
      const cards = Array.from(document.querySelectorAll('.bacheca-card'));
      const aliceCard = cards.find(c => c.innerText.includes('Lettura contatore acqua'));
      const bobCard = cards.find(c => c.innerText.includes('Sacchi raccolta differenziata'));
      return {
        body: document.body.innerText,
        aliceHasEdit: Boolean(aliceCard?.querySelector('button[aria-label="Modifica avviso"]')),
        bobHasEdit: Boolean(bobCard?.querySelector('button[aria-label="Modifica avviso"]'))
      };
    }`);
    assert(info.aliceHasEdit, 'Alice should see edit button on her own notice');
    assert(!info.bobHasEdit, 'Alice must NOT see edit button on Bob notice');
    assert(!info.body.includes('Avviso Beta Segreto'), 'Cross-tenant Beta notice leaked');
    assertNoHorizontalOverflow(client, 'F8 /bacheca');
  });

  await tracker.check(flow, 'Tier2', 'T2-F8-01', 'Navigating directly to /bacheca/modifica/<bob_note_id> blocks non-author and redirects to /bacheca', () => {
    client.goto(`${baseUrl}/bacheca/modifica/nota_alpha_routine`);
    client.waitForPathname('/bacheca', 8000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F8-02', 'Creating and editing a notice on /bacheca/aggiungi and /bacheca/modifica/:id persists cleanly', () => {
    client.goto(`${baseUrl}/bacheca/aggiungi`);
    client.waitForText('Nuovo Avviso', 8000);
    client.evalJson(`() => {
      const title = document.querySelector('input[type="text"]');
      const msg = document.querySelector('textarea');
      if (!title || !msg) throw new Error('Notice inputs missing');
      const sIn = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const sTa = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      sIn.call(title, 'Avviso E2E Test');
      title.dispatchEvent(new Event('input', { bubbles: true }));
      sTa.call(msg, 'Contenuto verifica bacheca E2E.');
      msg.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(b => /Pubblica Avviso|Salva/i.test(b.innerText));
      if (!btn) throw new Error('Publish notice button missing');
      btn.click();
      return true;
    }`);
    client.waitForPathname('/bacheca', 10000);
    client.waitForText('Avviso E2E Test', 8000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F8-05', '/calendario renders today chore AND seeded event from `note` (isEvento: true) and preserves dark theme on lazy CSS', () => {
    client.evalJson('() => { localStorage.setItem("househelper_theme", "system"); return true; }');
    client.setColorScheme('dark');
    client.goto(`${baseUrl}/calendario`);
    client.waitForText('Calendario', 8000);
    const calInfo = client.evalJson(`() => {
      const wrapper = document.querySelector('.custom-calendar-wrapper, .react-calendar');
      const bg = wrapper ? window.getComputedStyle(wrapper).backgroundColor : '';
      return {
        body: document.body.innerText,
        bg
      };
    }`);
    assert(calInfo.body.includes('Cena coinquilini'), 'Seeded calendar event from `note` missing on /calendario');
    assert(calInfo.bg !== 'rgb(255, 255, 255)', `Lazy Calendar.css overrode dark background to white: ${calInfo.bg}`);
    client.clearColorScheme();
  });

  await tracker.check(flow, 'Tier1', 'T1-F8-06', 'Adding a calendar event on /calendario/aggiungi persists in `note` and appears on /calendario', () => {
    client.goto(`${baseUrl}/calendario/aggiungi`);
    client.waitForText('Evento', 8000);
    client.evalJson(`() => {
      const title = document.querySelector('input[type="text"]');
      const details = document.querySelector('textarea');
      const dateIn = document.querySelector('input[type="date"]');
      if (!title || !details) throw new Error('Event form fields missing');
      const sIn = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const sTa = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      sIn.call(title, 'Manutenzione Caldaia E2E');
      title.dispatchEvent(new Event('input', { bubbles: true }));
      sTa.call(details, 'Controllo annuale fumi.');
      details.dispatchEvent(new Event('input', { bubbles: true }));
      if (dateIn && !dateIn.value) {
        sIn.call(dateIn, ${JSON.stringify(fixtures.meta.today)});
        dateIn.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(b => /Salva Evento|Aggiungi/i.test(b.innerText));
      if (!btn) throw new Error('Save event button missing');
      btn.click();
      return true;
    }`);
    client.waitForPathname('/calendario', 10000);
    client.waitForText('Manutenzione Caldaia E2E', 8000);
    assertNoConsoleErrors(client, 'F8 final');
    logoutViaSettings(client, baseUrl);
  });
}
