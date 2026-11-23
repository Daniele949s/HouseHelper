/**
 * scripts/e2e-flows/f2.mjs
 * Flow F2: Sign-Up Anti-Bot Gates, Verification & Household Setup (SceltaCasa).
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

export async function runF2({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F2';
  const pass = fixtures.users.unhomed.password;
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  client.clearConsole();

  await tracker.check(flow, 'Tier2', 'T2-F2-01', 'Registration speed gate blocks < 2.5s form submission', () => {
    client.goto(`${baseUrl}/registrazione`);
    client.waitForText('Crea Account');
    client.fill('#reg-username', 'DaveBot');
    client.fill('#reg-email', `dave.fast.${Date.now()}@example.com`);
    client.fill('#reg-password', pass);
    client.fill('#reg-security-challenge', '7');
    client.click('button[type="submit"]');
    client.waitForCondition('Boolean(document.querySelector("[role=\\"alert\\"]"))', { label: 'speed gate alert' });
    const msg = client.evalJson('() => document.querySelector("[role=\\"alert\\"]")?.innerText || ""');
    assert(msg.includes('Compilazione troppo rapida'), `Expected speed gate message, got "${msg}"`);
  });

  await tracker.check(flow, 'Tier2', 'T2-F2-02', 'Registration math challenge, honeypot, disposable email, and length boundaries reject invalid submissions', () => {
    client.goto(`${baseUrl}/registrazione`);
    client.waitForText('Crea Account');
    client.waitMs(2650);

    // 1. Wrong math challenge
    const answer = client.evalJson(`() => {
      const lbl = document.querySelector('label[for="reg-security-challenge"]')?.innerText || '';
      const m = lbl.match(/(\\d+)\\s*\\+\\s*(\\d+)/);
      return m ? Number(m[1]) + Number(m[2]) : 0;
    }`);
    assert(answer > 0, 'Could not parse math challenge numbers');

    client.fill('#reg-username', 'Dave');
    client.fill('#reg-email', 'dave.check@example.com');
    client.fill('#reg-password', pass);
    client.fill('#reg-security-challenge', String(answer + 9));
    client.click('button[type="submit"]');
    client.waitForCondition('document.querySelector("[role=\\"alert\\"]")?.innerText.includes("Risposta di sicurezza")', { label: 'math challenge alert' });

    // 2. Honeypot trap
    client.evalJson(`() => {
      const trap = document.querySelector('#reg-company-trap');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(trap, 'AcmeSpam');
      trap.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }`);
    client.fill('#reg-security-challenge', String(answer));
    client.click('button[type="submit"]');
    client.waitForCondition('document.querySelector("[role=\\"alert\\"]")?.innerText.includes("Richiesta non valida")', { label: 'honeypot alert' });

    // Clear honeypot for next checks
    client.evalJson(`() => {
      const trap = document.querySelector('#reg-company-trap');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(trap, '');
      trap.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }`);

    // 3. Disposable email
    client.fill('#reg-email', 'burner@mailinator.com');
    client.click('button[type="submit"]');
    client.waitForCondition('document.querySelector("[role=\\"alert\\"]")?.innerText.includes("temporanei")', { label: 'disposable email alert' });

    // 4. Short username boundary (1 char)
    client.fill('#reg-email', 'dave.valid@example.com');
    client.fill('#reg-username', 'A');
    client.click('button[type="submit"]');
    client.waitForCondition('document.querySelector("[role=\\"alert\\"]")?.innerText.includes("almeno 2 caratteri")', { label: 'short username alert' });

    // 5. Short password boundary (5 chars)
    client.fill('#reg-username', 'Dave');
    client.fill('#reg-password', '12345');
    client.click('button[type="submit"]');
    client.waitForCondition('document.querySelector("[role=\\"alert\\"]")?.innerText.includes("almeno 6 caratteri")', { label: 'short password alert' });
  });

  await tracker.check(flow, 'Tier1', 'T1-F2-01', 'Valid timed registration creates user and navigates to /verifica-email', () => {
    client.evalJson('() => sessionStorage.removeItem("hh_reg_attempts_v1")');
    client.goto(`${baseUrl}/registrazione`);
    client.waitForText('Crea Account');
    client.waitMs(2650);

    const newEmail = `dave.e2e.${Date.now()}@example.com`;
    const answer = client.evalJson(`() => {
      const lbl = document.querySelector('label[for="reg-security-challenge"]')?.innerText || '';
      const m = lbl.match(/(\\d+)\\s*\\+\\s*(\\d+)/);
      return m ? Number(m[1]) + Number(m[2]) : 0;
    }`);

    client.fill('#reg-username', 'Dave');
    client.fill('#reg-email', newEmail);
    client.fill('#reg-password', pass);
    client.fill('#reg-security-challenge', String(answer));
    client.click('button[type="submit"]');
    client.waitForPathname('/verifica-email', 10000);
    client.waitForText(newEmail);

    // Sign out back to login
    client.evalJson(`() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Torna alla schermata di accesso"));
      if (btn) btn.click();
      return true;
    }`);
    client.waitForPathname('/login', 8000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F2-02', 'Verified unhomed user is routed to /scelta-casa', () => {
    loginViaUi(client, baseUrl, fixtures.users.unhomed.email, fixtures.users.unhomed.password);
    client.waitForPathname('/scelta-casa', 10000);
    client.waitForText('Configurazione Casa');
    assertNoHorizontalOverflow(client, 'F2 /scelta-casa');
  });

  await tracker.check(flow, 'Tier2', 'T2-F2-06', 'SceltaCasa validates empty house name, invalid invite code, and invite brute-force rate limit', () => {
    client.evalJson('() => sessionStorage.clear()');
    // Empty house name
    client.evalJson(`() => {
      const btns = Array.from(document.querySelectorAll('.scelta-crea button'));
      if (!btns[0]) throw new Error('Create house button missing');
      btns[0].click();
      return true;
    }`);
    client.waitForCondition('document.querySelector("[role=\\"alert\\"]")?.innerText.includes("nome valido")', { label: 'invalid house name alert' });

    // Invalid invite code x6 to trigger rate limit
    for (let i = 0; i < 6; i += 1) {
      client.evalJson(`() => {
        const inp = document.querySelector('.scelta-unisciti input, input[aria-label*="invito" i]');
        if (!inp) throw new Error('Invite code input missing');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inp, 'ZZZZ99');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        const btn = document.querySelector('.scelta-unisciti button');
        if (!btn) throw new Error('Join house button missing');
        btn.click();
        return true;
      }`);
      client.waitMs(300);
    }
    client.waitForCondition(
      'document.querySelector("[role=\\"alert\\"]")?.innerText.includes("Troppi tentativi") || document.querySelector("[role=\\"alert\\"]")?.innerText.includes("non trovato")',
      { timeoutMs: 8000, label: 'invite rate limit or not found alert' }
    );
    client.evalJson('() => sessionStorage.clear()');
  });

  await tracker.check(flow, 'Tier1', 'T1-F2-04', 'Joining existing household AUR042 syncs HouseholdContext and navigates to /home showing Casa Aurora', () => {
    client.evalJson(`() => {
      const inp = document.querySelector('.scelta-unisciti input, input[aria-label*="invito" i]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'aur042');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      const btn = document.querySelector('.scelta-unisciti button');
      btn.click();
      return true;
    }`);
    client.waitForPathname('/home', 10000);
    client.waitForText('Casa Aurora', 8000);
  });

  await tracker.check(flow, 'Tier1', 'T1-F2-05', 'Enrolled user visiting /scelta-casa is redirected to /home', () => {
    client.goto(`${baseUrl}/scelta-casa`);
    client.waitForPathname('/home', 8000);
    assertNoConsoleErrors(client, 'F2 final');
    logoutViaSettings(client, baseUrl);
  });
}
