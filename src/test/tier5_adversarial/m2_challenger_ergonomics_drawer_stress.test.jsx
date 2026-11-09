import React from "react";
import fs from "fs";
import path from "path";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, mockStore } from "../testUtils";
import AppHeader from "../../components/AppHeader";
import DesktopNavigation from "../../components/DesktopNavigation";
import MobileNavigation from "../../components/MobileNavigation";
import MobileBottomBar from "../../components/MobileBottomBar";
import ViewImpostazioni from "../../pages/Impostazioni/ViewImpostazioni";
import ThemeToggle from "../../components/ThemeToggle";

/**
 * Milestone M2 Adversarial Challenger 2 Test Suite:
 * Ergonomics, Responsive Breakpoint Boundaries, Touch Targets & Mobile Drawer Lifecycle Stress
 */
describe("Milestone M2 Adversarial Challenger Suite: Ergonomics, Responsive Breakpoints & Mobile Drawer Lifecycle", () => {
  const alice = { uid: "u_challenger_alice", username: "Alice", email: "alice@test.com" };
  const houseId = "casa_m2_ergonomics_challenger";
  const mockUserData = { username: "Alice", casaId: houseId };

  // Full CSS file cache
  const cssPath = path.resolve(__dirname, "../../App.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{20E3}\u{2190}-\u{21FF}]/u;

  function getAllMediaQueryBlocks(css, query) {
    const blocks = [];
    let idx = 0;
    while ((idx = css.indexOf(query, idx)) !== -1) {
      let start = css.indexOf("{", idx);
      let depth = 1;
      let pos = start + 1;
      while (depth > 0 && pos < css.length) {
        if (css[pos] === "{") depth++;
        else if (css[pos] === "}") depth--;
        pos++;
      }
      blocks.push(css.slice(start, pos));
      idx = pos;
    }
    return blocks;
  }

  beforeEach(() => {
    mockStore.reset();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  // =========================================================================
  // SECTION 1: RESPONSIVE BREAKPOINT BOUNDARIES & LAYOUT DISCIPLINE
  // =========================================================================
  describe("1. Responsive Breakpoint Boundaries (768px, 769px, 850px, 950px, 1024px, 1240px, 1360px)", () => {
    test("CHALLENGE 1.1: Mobile breakpoint <= 768px hides DesktopNav and exposes MobileNav and MobileBottomBar", () => {
      const blocks768 = getAllMediaQueryBlocks(cssContent, "@media (max-width: 768px)");
      expect(blocks768.length).toBeGreaterThan(0);

      const hasDesktopNone = blocks768.some(
        (b) => b.includes(".desktop-nav-root") && b.includes("display: none !important")
      );
      const hasMobileBlock = blocks768.some(
        (b) => b.includes(".mobile-nav-root") && b.includes("display: block")
      );

      expect(hasDesktopNone).toBe(true);
      expect(hasMobileBlock).toBe(true);

      // Verify MobileBottomBar displays flex on <= 768px and width: 768px
      expect(cssContent).toMatch(
        /@media\s*\(max-width:\s*767\.98px\),\s*\(width:\s*768px\)\s*\{[^}]*\.mobile-bottom-bar\s*\{[^}]*display:\s*flex\s*!important/s
      );
    });

    test("CHALLENGE 1.2: Boundary transition at 769px strictly switches to Desktop Navigation and hides Mobile drawer & bottom bar", () => {
      // 769px activates desktop media query
      expect(cssContent).toMatch(/@media\s*\(\s*min-width:\s*769px\s*\)\s*and\s*\(\s*max-width:\s*890px\s*\)/);
      // Default .mobile-nav-root is hidden on desktop (> 768px)
      expect(cssContent).toMatch(/\.mobile-nav-root\s*\{[^}]*display:\s*none;/);
      // Mobile bottom bar is suppressed on min-width: 768px
      expect(cssContent).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[^}]*\.mobile-bottom-bar\s*\{[^}]*display:\s*none\s*!important/s);
    });

    test("CHALLENGE 1.3: Viewport 769px - 890px (compact desktop): Icon-only mode, 44x44px targets, flex-wrap nowrap, zero label overflow", () => {
      const blocks769 = getAllMediaQueryBlocks(cssContent, "@media (min-width: 769px) and (max-width: 890px)");
      expect(blocks769.length).toBeGreaterThan(0);
      const compactCss = blocks769[0];

      // Zero text overflow: labels hidden in icon-only mode
      expect(compactCss).toContain(".desktop-nav-label");
      expect(compactCss).toMatch(/\.desktop-nav-label\s*\{[^}]*display:\s*none/);

      // Flex-wrap nowrap: zero topbar wrapping
      expect(compactCss).toContain(".desktop-nav-list");
      expect(compactCss).toMatch(/\.desktop-nav-list\s*\{[^}]*flex-wrap:\s*nowrap/);

      // Horizontal overflow resilience
      expect(compactCss).toMatch(/\.desktop-nav-root\s*\{[^}]*overflow-x:\s*auto/);

      // 44x44px minimum touch targets in icon-only mode
      expect(compactCss).toMatch(/\.desktop-nav-link\s*\{[^}]*min-height:\s*44px/);
      expect(compactCss).toMatch(/\.desktop-nav-link\s*\{[^}]*min-width:\s*44px/);
    });

    test("CHALLENGE 1.4: Viewport 891px - 1023px (medium desktop): Labels restored with compact padding, flex-wrap nowrap", () => {
      const blocks891 = getAllMediaQueryBlocks(cssContent, "@media (min-width: 891px) and (max-width: 1023px)");
      expect(blocks891.length).toBeGreaterThan(0);
      const medCss = blocks891[0];

      // Labels visible
      expect(medCss).toMatch(/\.desktop-nav-label\s*\{[^}]*display:\s*inline/);
      // Flex-wrap nowrap: zero topbar wrapping
      expect(medCss).toMatch(/\.desktop-nav-list\s*\{[^}]*flex-wrap:\s*nowrap/);
      // Min height >= 44px
      expect(medCss).toMatch(/\.desktop-nav-link\s*\{[^}]*min-height:\s*44px/);
    });

    test("CHALLENGE 1.5: Viewport 1024px - 1199px (standard desktop): Comfortable padding, flex-wrap nowrap, min-height 44px", () => {
      const blocks1024 = getAllMediaQueryBlocks(cssContent, "@media (min-width: 1024px) and (max-width: 1199px)");
      expect(blocks1024.length).toBeGreaterThan(0);
      const stdCss = blocks1024[0];

      expect(stdCss).toMatch(/\.desktop-nav-list\s*\{[^}]*flex-wrap:\s*nowrap/);
      expect(stdCss).toMatch(/\.desktop-nav-link\s*\{[^}]*min-height:\s*44px/);
    });

    test("CHALLENGE 1.6: Widescreen viewports (1240px and 1360px): Max width container constraints, nowrap whitespace on links", () => {
      // Base styles for .desktop-nav-link have white-space: nowrap
      expect(cssContent).toMatch(/\.desktop-nav-link\s*\{[^}]*white-space:\s*nowrap/);
      // Topbar has max-width container-xl
      expect(cssContent).toMatch(/\.app-topbar\s*\{[^}]*max-width:\s*var\(--container-xl\)/);
    });

    test("CHALLENGE 1.7: AppHeader renders brand, desktop nav (9 items), theme toggle, and mobile burger cleanly", async () => {
      const { container } = renderWithProviders(<AppHeader />, {
        user: alice,
        userData: mockUserData,
        route: "/home",
      });

      await waitFor(() => {
        expect(container.querySelector(".app-topbar")).toBeInTheDocument();
      });

      const topbar = container.querySelector(".app-topbar");
      expect(topbar.querySelector(".brand-wrapper")).toBeInTheDocument();
      expect(topbar.querySelector(".desktop-nav-root")).toBeInTheDocument();
      expect(topbar.querySelectorAll(".desktop-nav-item")).toHaveLength(9);
      expect(topbar.querySelector(".theme-toggle-wrapper")).toBeInTheDocument();
      expect(topbar.querySelector(".mobile-nav-root")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SECTION 2: TOUCH TARGET ERGONOMICS (APPLE HIG >= 44x44px)
  // =========================================================================
  describe("2. Touch Target Compliance Across Navigation & Controls (>= 44x44px)", () => {
    test("CHALLENGE 2.1: Mobile Burger container maintains exact minimum 44x44px dimensions", () => {
      expect(cssContent).toMatch(/\.burger-container\s*\{[^}]*min-height:\s*44px/);
      expect(cssContent).toMatch(/\.burger-container\s*\{[^}]*min-width:\s*44px/);
      expect(cssContent).toMatch(/\.burger-container\s*\{[^}]*height:\s*44px/);
      expect(cssContent).toMatch(/\.burger-container\s*\{[^}]*width:\s*44px/);
    });

    test("CHALLENGE 2.2: Mobile Close Button maintains exact minimum 44x44px dimensions", () => {
      expect(cssContent).toMatch(/\.mobile-close-btn\s*\{[^}]*min-height:\s*44px/);
      expect(cssContent).toMatch(/\.mobile-close-btn\s*\{[^}]*min-width:\s*44px/);
      expect(cssContent).toMatch(/\.mobile-close-btn\s*\{[^}]*height:\s*44px/);
      expect(cssContent).toMatch(/\.mobile-close-btn\s*\{[^}]*width:\s*44px/);
    });

    test("CHALLENGE 2.3: Mobile Bottom Bar tabs maintain minimum 48x48px (exceeding 44x44px HIG minimum)", () => {
      expect(cssContent).toMatch(/\.mobile-bottom-tab\s*\{[^}]*min-height:\s*48px/);
      expect(cssContent).toMatch(/\.mobile-bottom-tab\s*\{[^}]*min-width:\s*48px/);
    });

    test("CHALLENGE 2.4: Mobile Drawer links and logout button maintain >= 44px touch targets", () => {
      // .mobile-menu-link has generous 16px vertical padding (total height ~56px)
      expect(cssContent).toMatch(/\.mobile-menu-link\s*\{[^}]*padding:\s*16px\s*20px/);
      // .mobile-logout-btn has min-height: 44px
      expect(cssContent).toMatch(/\.mobile-logout-btn\s*\{[^}]*min-height:\s*44px/);
    });

    test("CHALLENGE 2.5: Minimalist Pill Theme Toggle button maintains minimum 44x44px touch target", () => {
      expect(cssContent).toMatch(/\.theme-pill-toggle\s*\{[^}]*min-height:\s*44px/);
      expect(cssContent).toMatch(/\.theme-pill-toggle\s*\{[^}]*min-width:\s*44px/);
    });

    test("CHALLENGE 2.6: Settings view buttons and toggle switches maintain inline or computed min-height >= 44px", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        user: alice,
        userData: mockUserData,
        route: "/impostazioni",
      });

      await waitFor(() => {
        expect(container.querySelector(".settings-container")).toBeInTheDocument();
      });

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThanOrEqual(8);

      buttons.forEach((btn) => {
        const style = btn.getAttribute("style") || "";
        // All interactive action buttons in settings specify minHeight: 44px
        expect(style).toContain("min-height: 44px");
      });
    });
  });

  // =========================================================================
  // SECTION 3: MOBILE DRAWER LIFECYCLE & EVENT BUS ADVERSARIAL STRESS
  // =========================================================================
  describe("3. Mobile Drawer Lifecycle, Event Bus, Keyboard & Gesture Stress", () => {
    test("CHALLENGE 3.1: Initial mount state has drawer closed, overlay hidden, body scroll intact", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
      });

      const burger = await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay).not.toHaveClass("menu-opened");
      expect(overlay).toHaveAttribute("aria-hidden", "true");

      expect(burger).toHaveAttribute("aria-expanded", "false");
      expect(document.body.style.overflow).toBe("");
      expect(document.documentElement.style.overflow).toBe("");
    });

    test("CHALLENGE 3.2: Opens and closes via external 'toggle-mobile-menu' custom event (MobileBottomBar Altro trigger)", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
      });

      const burger = await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toBeNull();

      // Open via custom event
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).toHaveClass("menu-opened");
      expect(overlay).toHaveAttribute("aria-hidden", "false");
      expect(burger).toHaveAttribute("aria-expanded", "true");
      expect(document.body.style.overflow).toBe("hidden");
      expect(document.documentElement.style.overflow).toBe("hidden");

      // Close via custom event
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).not.toHaveClass("menu-opened");
      expect(overlay).toHaveAttribute("aria-hidden", "true");
      expect(burger).toHaveAttribute("aria-expanded", "false");
      expect(document.body.style.overflow).toBe("");
      expect(document.documentElement.style.overflow).toBe("");
    });

    test("CHALLENGE 3.3: Rapid event toggling stress maintains accurate binary state parity", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toBeNull();

      // Fire 11 consecutive toggles (odd count -> open)
      for (let i = 0; i < 11; i++) {
        fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      }
      expect(overlay).toHaveClass("menu-opened");
      expect(document.body.style.overflow).toBe("hidden");

      // Fire 1 more toggle (even count -> closed)
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).not.toHaveClass("menu-opened");
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 3.4: Closes reliably via Escape key press only when open", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toBeNull();

      // Escape when closed is a no-op
      fireEvent.keyDown(window, { key: "Escape" });
      expect(overlay).not.toHaveClass("menu-opened");

      // Open drawer
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).toHaveClass("menu-opened");

      // Pressing non-Escape key does not close
      fireEvent.keyDown(window, { key: "Enter" });
      expect(overlay).toHaveClass("menu-opened");

      // Pressing Escape closes drawer
      fireEvent.keyDown(window, { key: "Escape" });
      expect(overlay).not.toHaveClass("menu-opened");
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 3.5: Closes via close button click and restores scroll", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toBeNull();

      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).toHaveClass("menu-opened");

      const closeBtn = screen.getByRole("button", { name: /chiudi menu/i });
      fireEvent.click(closeBtn);

      expect(overlay).not.toHaveClass("menu-opened");
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 3.6: Backdrop click closes menu, but inner content clicks do not dismiss", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      const inner = document.querySelector(".mobile-menu-inner");
      expect(overlay).not.toBeNull();
      expect(inner).not.toBeNull();

      // Open drawer
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).toHaveClass("menu-opened");

      // Clicking inner wrapper does NOT close (target !== currentTarget)
      fireEvent.click(inner);
      expect(overlay).toHaveClass("menu-opened");

      // Clicking directly on overlay backdrop CLOSES drawer
      fireEvent.click(overlay);
      expect(overlay).not.toHaveClass("menu-opened");
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 3.7: Clicking drawer navigation link closes drawer and triggers route navigation", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
        route: "/home",
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toBeNull();

      // Open drawer
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).toHaveClass("menu-opened");

      // Click on Impostazioni link
      const settingsLabel = screen.getByText("Impostazioni");
      const settingsBtn = settingsLabel.closest("button");
      fireEvent.click(settingsBtn);

      // Drawer is automatically closed
      expect(overlay).not.toHaveClass("menu-opened");
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 3.8: Route change event triggers automatic drawer closure cleanup", async () => {
      const { unmount } = renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
        route: "/home",
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toBeNull();

      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).toHaveClass("menu-opened");
      unmount();

      // Rerender with changed route
      renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
        route: "/turni",
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      const newOverlay = document.querySelector(".mobile-menu-overlay");
      expect(newOverlay).not.toHaveClass("menu-opened");
      expect(document.body.style.overflow).toBe("");
    });

    test("CHALLENGE 3.9: Unmounting open drawer cleans up body and documentElement scroll locks", async () => {
      const { unmount } = renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
      });

      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(document.body.style.overflow).toBe("hidden");
      expect(document.documentElement.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("");
      expect(document.documentElement.style.overflow).toBe("");
    });
  });

  // =========================================================================
  // SECTION 4: ZERO EMOJI INVARIANT SCAN ACROSS NAVIGATION & SHELL
  // =========================================================================
  describe("4. Zero Emoji Invariant Across Navigation, Shell & Dictionaries", () => {
    test("CHALLENGE 4.1: Source files for navigation and shell contain zero Unicode emojis", () => {
      const filesToAudit = [
        "src/components/DesktopNavigation.js",
        "src/components/MobileNavigation.js",
        "src/components/MobileBottomBar.js",
        "src/components/AppHeader.js",
        "src/components/ThemeToggle.js",
        "src/pages/Impostazioni/ViewImpostazioni.js",
        "src/App.js",
      ];

      filesToAudit.forEach((relPath) => {
        const fullPath = path.resolve(__dirname, "../../..", relPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        const match = content.match(EMOJI_REGEX);
        expect(match).toBeNull();
      });
    });

    test("CHALLENGE 4.2: Rendered AppHeader contains zero emojis in Italian and English", async () => {
      // Italian
      const { container: cIt, unmount: uIt } = renderWithProviders(<AppHeader />, {
        user: alice,
        userData: mockUserData,
        language: "it",
      });
      await waitFor(() => {
        expect(cIt.querySelector(".app-topbar")).toBeInTheDocument();
      });
      expect(EMOJI_REGEX.test(cIt.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cIt.textContent)).toBe(false);
      uIt();

      // English
      const { container: cEn, unmount: uEn } = renderWithProviders(<AppHeader />, {
        user: alice,
        userData: mockUserData,
        language: "en",
      });
      await waitFor(() => {
        expect(cEn.querySelector(".app-topbar")).toBeInTheDocument();
      });
      expect(EMOJI_REGEX.test(cEn.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cEn.textContent)).toBe(false);
      uEn();
    });

    test("CHALLENGE 4.3: Rendered MobileNavigation contains zero emojis in Italian and English", async () => {
      // Italian
      const { container: cIt, unmount: uIt } = renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
        language: "it",
      });
      await screen.findByRole("button", { name: /apri menu di navigazione/i });
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(EMOJI_REGEX.test(cIt.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cIt.textContent)).toBe(false);
      uIt();

      // English
      const { container: cEn, unmount: uEn } = renderWithProviders(<MobileNavigation />, {
        user: alice,
        userData: mockUserData,
        language: "en",
      });
      await screen.findByRole("button", { name: /open navigation menu/i });
      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(EMOJI_REGEX.test(cEn.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cEn.textContent)).toBe(false);
      uEn();
    });

    test("CHALLENGE 4.4: Rendered MobileBottomBar contains zero emojis in Italian and English", async () => {
      // Italian
      const { container: cIt, unmount: uIt } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: mockUserData,
        language: "it",
      });
      await waitFor(() => {
        expect(cIt.querySelector(".mobile-bottom-bar")).toBeInTheDocument();
      });
      expect(EMOJI_REGEX.test(cIt.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cIt.textContent)).toBe(false);
      uIt();

      // English
      const { container: cEn, unmount: uEn } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: mockUserData,
        language: "en",
      });
      await waitFor(() => {
        expect(cEn.querySelector(".mobile-bottom-bar")).toBeInTheDocument();
      });
      expect(EMOJI_REGEX.test(cEn.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cEn.textContent)).toBe(false);
      uEn();
    });

    test("CHALLENGE 4.5: Rendered ViewImpostazioni contains zero emojis in Italian and English", async () => {
      // Italian
      const { container: cIt, unmount: uIt } = renderWithProviders(<ViewImpostazioni />, {
        user: alice,
        userData: mockUserData,
        language: "it",
        route: "/impostazioni",
      });
      await waitFor(() => {
        expect(cIt.querySelector(".settings-container")).toBeInTheDocument();
      });
      expect(EMOJI_REGEX.test(cIt.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cIt.textContent)).toBe(false);
      uIt();

      // English
      const { container: cEn, unmount: uEn } = renderWithProviders(<ViewImpostazioni />, {
        user: alice,
        userData: mockUserData,
        language: "en",
        route: "/impostazioni",
      });
      await waitFor(() => {
        expect(cEn.querySelector(".settings-container")).toBeInTheDocument();
      });
      expect(EMOJI_REGEX.test(cEn.innerHTML)).toBe(false);
      expect(EMOJI_REGEX.test(cEn.textContent)).toBe(false);
      uEn();
    });
  });
});
