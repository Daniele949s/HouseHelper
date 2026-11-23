/**
 * scripts/e2e-flows/f4.mjs
 * Flow F4: Navigation Shell Across Desktop, Tablet (820x900), and Mobile (375x812, 390x844).
 * Pure ASCII only.
 */

import {
  VIEWPORTS,
  assert,
  assertDialogFocusTrap,
  assertMobileTouchTargets,
  assertNoConsoleErrors,
  assertNoHorizontalOverflow,
  loginViaUi,
  logoutViaSettings
} from '../e2e-lib.mjs';

export async function runF4({ client, baseUrl, tracker, fixtures }) {
  const flow = 'F4';
  client.clearConsole();

  // Check public drawer first (Tier 2)
  client.resize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
  await tracker.check(flow, 'Tier2', 'T2-F4-03', 'Logged-out mobile drawer shows 3 public items and no logout button', () => {
    client.goto(`${baseUrl}/login`);
    client.waitForCondition('Boolean(document.querySelector("button.burger-container"))', { label: 'burger button' });
    client.click('button.burger-container');
    client.waitForCondition('Boolean(document.querySelector(".mobile-menu-overlay.menu-opened"))', { label: 'public drawer open' });
    const info = client.evalJson(`() => ({
      items: document.querySelectorAll('.mobile-menu-item').length,
      hasLogout: Boolean(document.querySelector('.mobile-logout-btn'))
    })`);
    assert(info.items === 3, `Expected 3 public drawer items, got ${info.items}`);
    assert(!info.hasLogout, 'Logged-out drawer must not render logout button');
    client.press('Escape');
  });

  // Login as Alice for Desktop/Tablet/Mobile authenticated nav checks
  client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
  loginViaUi(client, baseUrl, fixtures.users.alice.email, fixtures.users.alice.password);
  client.waitForPathname('/home', 10000);

  await tracker.check(flow, 'Tier1', 'T1-F4-01', 'Desktop 1280x800 and 1440x900 DesktopNavigation shows all 9 labeled links without overflow and hides MobileBottomBar', () => {
    for (const vp of [VIEWPORTS.desktopStandard, VIEWPORTS.desktopWide]) {
      client.resize(vp.width, vp.height);
      client.goto(`${baseUrl}/home`);
      client.waitMs(250);
      const navInfo = client.evalJson(`() => {
        const nav = document.querySelector('nav.desktop-nav, nav[aria-label*="principale" i], nav[aria-label*="Main" i]');
        const bottom = document.querySelector('.mobile-bottom-bar');
        const links = nav ? Array.from(nav.querySelectorAll('a')) : [];
        const bottomVisible = bottom ? window.getComputedStyle(bottom).display !== 'none' : false;
        return {
          linkCount: links.length,
          allHaveLabels: links.every(a => a.innerText.trim().length > 0),
          bottomVisible,
          navScrollOverflow: nav ? nav.scrollWidth > nav.clientWidth + 1 : false
        };
      }`);
      assert(navInfo.linkCount === 9, `Expected 9 desktop nav links at ${vp.name}, got ${navInfo.linkCount}`);
      assert(navInfo.allHaveLabels, `Desktop nav links missing visible labels at ${vp.name}`);
      assert(!navInfo.bottomVisible, `MobileBottomBar should be hidden at ${vp.name}`);
      assert(!navInfo.navScrollOverflow, `Desktop nav overflowing at ${vp.name}`);
      assertNoHorizontalOverflow(client, `F4 ${vp.name}`);
    }
  });

  await tracker.check(flow, 'Tier1', 'T1-F4-02', 'Tablet 820x900 renders readable labeled navigation with zero icon-only blind buttons or overflow', () => {
    client.resize(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height);
    client.goto(`${baseUrl}/home`);
    client.waitMs(250);
    assertNoHorizontalOverflow(client, 'F4 tablet-820x900');
    const tabletInfo = client.evalJson(`() => {
      const nav = document.querySelector('nav.desktop-nav, nav[aria-label*="principale" i], nav[aria-label*="Main" i]');
      if (!nav || window.getComputedStyle(nav).display === 'none') return { ok: true, hidden: true };
      const links = Array.from(nav.querySelectorAll('a, button'));
      const blind = links.filter(el => {
        const st = window.getComputedStyle(el);
        if (st.display === 'none') return false;
        const text = el.innerText.trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        return text.length === 0 && aria.length === 0;
      });
      const overflow = nav.scrollWidth > nav.clientWidth + 2;
      return { ok: blind.length === 0 && !overflow, blindCount: blind.length, overflow };
    }`);
    assert(tabletInfo.ok, `Tablet nav issue at 820x900: ${JSON.stringify(tabletInfo)}`);
  });

  await tracker.check(flow, 'Tier1', 'T1-F4-03', 'Mobile 375x812 and 390x844 hide DesktopNavigation, show 5-item MobileBottomBar, and keep >=44px targets', () => {
    for (const vp of [VIEWPORTS.mobileSmall, VIEWPORTS.mobileLarge]) {
      client.resize(vp.width, vp.height);
      client.goto(`${baseUrl}/home`);
      client.waitMs(250);
      const mob = client.evalJson(`() => {
        const desktopNav = document.querySelector('nav.desktop-nav, nav[aria-label*="principale" i]');
        const desktopVisible = desktopNav ? window.getComputedStyle(desktopNav).display !== 'none' : false;
        const bar = document.querySelector('nav[aria-label*="mobile" i], .mobile-bottom-bar');
        const tabs = bar ? Array.from(bar.querySelectorAll('a, button')) : [];
        return {
          desktopVisible,
          tabCount: tabs.length,
          activeCurrent: tabs.some(t => t.getAttribute('aria-current') === 'page')
        };
      }`);
      assert(!mob.desktopVisible, `Desktop nav visible at ${vp.name}`);
      assert(mob.tabCount === 5, `Expected 5 mobile bottom bar tabs at ${vp.name}, got ${mob.tabCount}`);
      assert(mob.activeCurrent, `Missing aria-current="page" on active mobile tab at ${vp.name}`);
      assertNoHorizontalOverflow(client, `F4 ${vp.name}`);
      assertMobileTouchTargets(client, `F4 ${vp.name}`);
    }
  });

  await tracker.check(flow, 'Tier2', 'T2-F4-01', 'MobileNavigation drawer has role=dialog, aria-modal=true, traps Tab focus, and closes on Escape', () => {
    client.resize(VIEWPORTS.mobileSmall.width, VIEWPORTS.mobileSmall.height);
    client.goto(`${baseUrl}/home`);
    client.waitForCondition('Boolean(document.querySelector("button[aria-label=\\"Apri menu altro\\"], button.burger-container"))', { label: 'drawer trigger' });
    client.evalJson(`() => {
      const btn = document.querySelector('button[aria-label="Apri menu altro"]') || document.querySelector('button.burger-container');
      btn.click();
      return true;
    }`);
    client.waitForCondition('Boolean(document.querySelector(".mobile-menu-overlay.menu-opened"))', { label: 'household drawer open' });
    assertDialogFocusTrap(client, {
      dialogSelector: '.mobile-menu-overlay.menu-opened',
      contextLabel: 'F4 household drawer'
    });
    const drawerItems = client.evalJson('() => document.querySelectorAll(".mobile-menu-item").length');
    assert(drawerItems === 9, `Expected 9 household drawer items, got ${drawerItems}`);
    client.press('Escape');
    client.waitForCondition('!document.querySelector(".mobile-menu-overlay.menu-opened")', { label: 'drawer closed on Escape' });
  });

  await tracker.check(flow, 'Tier2', 'T2-F4-02', 'Header brand link activates via keyboard Enter and /settings aliases to /impostazioni', () => {
    client.resize(VIEWPORTS.desktopStandard.width, VIEWPORTS.desktopStandard.height);
    client.goto(`${baseUrl}/settings`);
    client.waitForPathname('/impostazioni', 8000);
    client.evalJson(`() => {
      const brand = document.querySelector('header a, header [role="button"], [aria-label*="principale HouseHelper"]');
      if (!brand) throw new Error('Header brand link missing');
      brand.focus();
      return true;
    }`);
    client.press('Enter');
    client.waitForPathname('/home', 8000);
    assertNoConsoleErrors(client, 'F4 final');
    logoutViaSettings(client, baseUrl);
  });
}
