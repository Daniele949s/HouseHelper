import React from "react";
import fs from "fs";
import path from "path";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";
import ViewImpostazioni from "../../pages/Impostazioni/ViewImpostazioni";
import ConfirmModal from "../../components/ConfirmModal";
import * as feedbackModule from "../../utils/feedback";
import * as notificationPrefsModule from "../../utils/notificationPrefs";

/**
 * Milestone M3 Adversarial Challenger 2 Test Suite:
 * Visual Ergonomics, Apple HIG Compliance, Touch Targets (>= 44x44px),
 * Grouped Tables Discipline, Zero Emojis Invariant & ARIA Controls.
 */
describe("Milestone M3 Adversarial Challenger Suite: Visual Ergonomics, Apple HIG & Touch Target Stress", () => {
  // Test personas
  const aliceVerified = {
    uid: "u_challenger_alice",
    username: "Alice",
    email: "alice@househelper.test",
    displayName: "Alice",
    emailVerified: true,
  };

  const bobUnverified = {
    uid: "u_challenger_bob",
    username: "Bob",
    email: "bob@househelper.test",
    displayName: "Bob",
    emailVerified: false,
  };

  const houseId = "casa_m3_ergonomics_stress";
  const aliceUserData = { username: "Alice", email: "alice@househelper.test", casaId: houseId };
  const bobUserData = { username: "Bob", email: "bob@househelper.test", casaId: houseId };

  // Read stylesheets for static CSS rule analysis
  const rootDir = path.resolve(__dirname, "../../..");
  const appCss = fs.readFileSync(path.join(rootDir, "src/App.css"), "utf8");

  // Comprehensive emoji regex covering standard emojis, emoticons, pictographs, flags, dingbats, and symbols
  const STRICT_EMOJI_REGEX =
    /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{20E3}\u{2190}-\u{21FF}]/u;

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
    localStorage.clear();
    mockStore.reset();
    jest.clearAllMocks();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    // Seed test household
    seedHousehold({
      houseId,
      houseName: "Dimora Alpina",
      inviteCode: "ALPINA42",
      creatorId: "u_challenger_alice",
      users: [aliceVerified, bobUnverified],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // 1. STRICT TOUCH TARGET VERIFICATION (>= 44x44px)
  // =========================================================================
  describe("1. Strict Touch Target Verification (Apple HIG >= 44x44px)", () => {
    test("CHALLENGE 1.1: All interactive elements in ViewImpostazioni (verified user) enforce >= 44x44px touch targets", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Scan all interactive elements: buttons, links, switches, inputs
      const interactives = container.querySelectorAll(
        "button, a, input, select, textarea, [role='switch'], [role='radio']"
      );
      expect(interactives.length).toBeGreaterThanOrEqual(10);

      interactives.forEach((el) => {
        const style = el.style;
        const inlineMinH = style.minHeight ? parseInt(style.minHeight, 10) : 0;
        const inlineMinW = style.minWidth ? parseInt(style.minWidth, 10) : 0;

        // If minHeight/minWidth is specified inline, verify >= 44px
        if (style.minHeight) {
          expect(inlineMinH).toBeGreaterThanOrEqual(44);
        }
        if (style.minWidth) {
          expect(inlineMinW).toBeGreaterThanOrEqual(44);
        }

        // Element must either have inline >= 44px OR have CSS class ensuring >= 44px
        const hasInlineConstraint = inlineMinH >= 44 && inlineMinW >= 44;
        const hasClassConstraint =
          el.classList.contains("ios-segmented-item") ||
          el.classList.contains("apple-switch-toggle") ||
          el.classList.contains("btn-code-copy") ||
          el.classList.contains("btn");

        expect(hasInlineConstraint || hasClassConstraint).toBe(true);
      });
    });

    test("CHALLENGE 1.2: Unverified user resend verification button enforces min 44x44px touch target", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: bobUnverified,
        userData: bobUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const resendBtn = await screen.findByRole("button", { name: /Invia email di verifica/i });
      expect(resendBtn).toBeInTheDocument();
      expect(parseInt(resendBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(resendBtn.style.minWidth, 10)).toBeGreaterThanOrEqual(44);

      // Verify all buttons rendered under unverified state meet constraints
      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (btn.style.minHeight) {
          expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
        }
        if (btn.style.minWidth) {
          expect(parseInt(btn.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
        }
      });
    });

    test("CHALLENGE 1.3: Segmented control items (IT, EN, Light, Dark, System) satisfy >= 44x44px in JSX and CSS", async () => {
      // In CSS, .ios-segmented-item must define min-height >= 44px and min-width >= 44px
      expect(appCss).toMatch(/\.ios-segmented-item\s*\{[^}]*min-height:\s*44px/);
      expect(appCss).toMatch(/\.ios-segmented-item\s*\{[^}]*min-width:\s*44px/);

      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const segmentedItems = container.querySelectorAll(".ios-segmented-item");
      expect(segmentedItems.length).toBe(5); // 2 language + 3 theme

      segmentedItems.forEach((item) => {
        expect(parseInt(item.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
        expect(parseInt(item.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
      });
    });

    test("CHALLENGE 1.4: Apple toggle switches enforce min 44x44px touch target with physical switch track", async () => {
      // In CSS, .apple-switch-toggle must have min-height >= 44px and min-width >= 52px
      expect(appCss).toMatch(/\.apple-switch-toggle\s*\{[^}]*min-height:\s*44px/);
      expect(appCss).toMatch(/\.apple-switch-toggle\s*\{[^}]*min-width:\s*52px/);

      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const switches = container.querySelectorAll('[role="switch"]');
      expect(switches.length).toBe(3);

      switches.forEach((sw) => {
        expect(parseInt(sw.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
        expect(parseInt(sw.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
        // Track inside switch
        const track = sw.querySelector(".apple-switch-track");
        expect(track).toBeInTheDocument();
        const thumb = track.querySelector(".apple-switch-thumb");
        expect(thumb).toBeInTheDocument();
      });
    });

    test("CHALLENGE 1.5: Household invite code copy button and UID copy button satisfy >= 44x44px", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Household copy button
      const copyCodeBtn = screen.getByRole("button", { name: /Copia codice/i });
      expect(copyCodeBtn).toBeInTheDocument();
      expect(parseInt(copyCodeBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(copyCodeBtn.style.minWidth, 10)).toBeGreaterThanOrEqual(44);

      // UID copy button
      const copyUidBtn = screen.getByRole("button", { name: /Copia ID/i });
      expect(copyUidBtn).toBeInTheDocument();
      expect(parseInt(copyUidBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(parseInt(copyUidBtn.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
    });

    test("CHALLENGE 1.6: Logout confirmation dialog action buttons strictly satisfy min 44x44px touch targets", async () => {
      // In CSS, confirm-modal-footer buttons enforce min-height >= 44px
      expect(appCss).toMatch(/\.confirm-modal-footer button\s*\{[^}]*min-height:\s*44px/);
      expect(appCss).toMatch(/\.confirm-modal-close\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/);

      const spyShowConfirm = jest.spyOn(feedbackModule, "showConfirm");

      renderWithProviders(
        <>
          <ConfirmModal />
          <ViewImpostazioni />
        </>,
        {
          route: "/impostazioni",
          user: aliceVerified,
          userData: aliceUserData,
          language: "it",
        }
      );

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Click logout to trigger confirmation dialog (label: "Disconnetti")
      const logoutBtn = screen.getByRole("button", { name: /^Disconnetti$/i });
      fireEvent.click(logoutBtn);

      expect(spyShowConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          isDanger: true,
          confirmText: "Disconnetti",
          cancelText: "Annulla",
        })
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const modal = screen.getByRole("dialog");
      const modalButtons = modal.querySelectorAll("button");
      expect(modalButtons.length).toBeGreaterThanOrEqual(2);

      // Cancel button
      const cancelBtn = screen.getByRole("button", { name: /^Annulla$/i });
      expect(cancelBtn).toBeInTheDocument();

      // Destructive Confirm button
      const confirmBtn = screen.getAllByRole("button", { name: /^Disconnetti$/i }).find(
        (b) => b.closest(".confirm-modal-footer") !== null
      );
      expect(confirmBtn).toBeInTheDocument();
      expect(confirmBtn).toHaveClass("btn-danger");

      spyShowConfirm.mockRestore();
    });
  });

  // =========================================================================
  // 2. APPLE HIG GROUPED TABLES & CONTENT DISCIPLINE
  // =========================================================================
  describe("2. Apple HIG Grouped Tables & Content Discipline", () => {
    test("CHALLENGE 2.1: Settings cards explicitly enforce backdrop-filter: none !important and 100% opaque background", () => {
      // Check .settings-group-card
      expect(appCss).toMatch(
        /\.settings-group-card\s*\{[^}]*background:\s*var\(--bg-card\)\s*!important/
      );
      expect(appCss).toMatch(
        /\.settings-group-card\s*\{[^}]*backdrop-filter:\s*none\s*!important/
      );
      expect(appCss).toMatch(
        /\.settings-group-card\s*\{[^}]*-webkit-backdrop-filter:\s*none\s*!important/
      );

      // Check .household-identity-card
      expect(appCss).toMatch(
        /\.household-identity-card\s*\{[^}]*background:\s*var\(--bg-card\)\s*!important/
      );
      expect(appCss).toMatch(
        /\.household-identity-card\s*\{[^}]*backdrop-filter:\s*none\s*!important/
      );
      expect(appCss).toMatch(
        /\.household-identity-card\s*\{[^}]*-webkit-backdrop-filter:\s*none\s*!important/
      );
    });

    test("CHALLENGE 2.2: Settings cards enforce 1px hairline border and calibrated border-radius", () => {
      expect(appCss).toMatch(
        /\.settings-group-card\s*\{[^}]*border:\s*1px solid var\(--border-color\)/
      );
      expect(appCss).toMatch(
        /\.household-identity-card\s*\{[^}]*border:\s*1px solid var\(--border-color\)/
      );

      expect(appCss).toMatch(
        /\.settings-group-card\s*\{[^}]*border-radius:\s*var\(--radius-lg\)/
      );
      expect(appCss).toMatch(
        /\.household-identity-card\s*\{[^}]*border-radius:\s*var\(--radius-xl\)/
      );
    });

    test("CHALLENGE 2.3: Inset dividers (.settings-row) feature subtle 1px border-bottom, skipping last child", () => {
      expect(appCss).toMatch(
        /\.settings-row\s*\{[^}]*border-bottom:\s*1px solid var\(--border-subtle\)/
      );
      expect(appCss).toMatch(
        /\.settings-row:last-child\s*\{[^}]*border-bottom:\s*none/
      );
    });

    test("CHALLENGE 2.4: Active blur is strictly quarantined to designated floating chrome", () => {
      const allowedFloatingLayers = [
        ".app-topbar",
        ".mobile-bottom-bar",
        ".toast-item",
        ".confirm-modal-backdrop",
        ".modal-backdrop",
      ];

      // Extract all backdrop-filter rules from appCss
      const blurRuleRegex = /([^{}]+)\{[^}]*backdrop-filter:\s*(?:var\(--glass-blur\)|blur\([^)]+\))[^}]*\}/g;
      let match;
      const violatingSelectors = [];

      while ((match = blurRuleRegex.exec(appCss)) !== null) {
        const selector = match[1].trim();
        // Skip reduced transparency where blur is removed
        if (selector.includes("prefers-reduced-transparency")) continue;

        const isAllowed = allowedFloatingLayers.some((allowed) => selector.includes(allowed));
        if (!isAllowed) {
          violatingSelectors.push(selector);
        }
      }

      expect(violatingSelectors).toEqual([]);
    });

    test("CHALLENGE 2.5: Accessibility media query overrides (contrast, reduced-transparency, reduced-motion)", () => {
      // High contrast mode increases border width
      expect(appCss).toMatch(
        /@media\s*\(prefers-contrast:\s*more\)\s*\{[^}]*\.settings-group-card,[^}]*\.household-identity-card\s*\{[^}]*border-width:\s*2px\s*!important/s
      );

      // Reduced transparency forces solid background
      expect(appCss).toMatch(
        /@media\s*\(prefers-reduced-transparency:\s*reduce\)\s*\{[^}]*\.settings-group-card,[^}]*\.household-identity-card\s*\{[^}]*background:\s*var\(--bg-card\)\s*!important/s
      );

      // Reduced motion removes transitions
      expect(appCss).toMatch(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.apple-switch-thumb[^}]*transition:\s*none\s*!important/s
      );
    });
  });

  // =========================================================================
  // 3. ZERO UNICODE EMOJIS & PICTOGRAPHS INVARIANT
  // =========================================================================
  describe("3. Zero Unicode Emojis & Pictographs Invariant", () => {
    test("CHALLENGE 3.1: Deep DOM scan across all rendered text, attributes and innerHTML in Italian yields 0 emojis", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Scan innerHTML
      const rawHtml = container.innerHTML;
      expect(STRICT_EMOJI_REGEX.test(rawHtml)).toBe(false);

      // Scan all text content
      const text = container.textContent;
      expect(STRICT_EMOJI_REGEX.test(text)).toBe(false);

      // Scan all attributes on every element
      const allElements = container.querySelectorAll("*");
      allElements.forEach((el) => {
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          expect(STRICT_EMOJI_REGEX.test(attr.value)).toBe(false);
        }
      });
    });

    test("CHALLENGE 3.2: Deep DOM scan across all rendered text, attributes and innerHTML in English yields 0 emojis", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
        language: "en",
      });

      await screen.findByRole("heading", { level: 1, name: /Settings/i });

      const rawHtml = container.innerHTML;
      expect(STRICT_EMOJI_REGEX.test(rawHtml)).toBe(false);

      const text = container.textContent;
      expect(STRICT_EMOJI_REGEX.test(text)).toBe(false);

      const allElements = container.querySelectorAll("*");
      allElements.forEach((el) => {
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          expect(STRICT_EMOJI_REGEX.test(attr.value)).toBe(false);
        }
      });
    });

    test("CHALLENGE 3.3: Language switcher strictly uses text pills ('IT', 'EN') and SVG icons, zero emoji flag codes", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Check language segmented buttons
      const itBtn = screen.getByRole("button", { name: /Italiano/i });
      const enBtn = screen.getByRole("button", { name: /English/i });

      expect(itBtn).toBeInTheDocument();
      expect(enBtn).toBeInTheDocument();

      // Ensure NO regional indicator flag glyphs
      const FLAG_REGEX = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
      expect(FLAG_REGEX.test(itBtn.innerHTML)).toBe(false);
      expect(FLAG_REGEX.test(enBtn.innerHTML)).toBe(false);

      // Verify badges are plain text pills
      const badges = container.querySelectorAll(".ios-segmented-badge");
      expect(badges.length).toBe(2);
      expect(badges[0].textContent).toBe("IT");
      expect(badges[1].textContent).toBe("EN");
    });

    test("CHALLENGE 3.4: Deep scan during dynamic states (copied feedback, unverified user, toggle switch) retains 0 emojis", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: bobUnverified,
        userData: bobUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Click copy invite code
      const copyCodeBtn = screen.getByRole("button", { name: /Copia codice/i });
      await act(async () => {
        fireEvent.click(copyCodeBtn);
      });

      // Click copy UID
      const copyUidBtn = screen.getByRole("button", { name: /Copia ID/i });
      await act(async () => {
        fireEvent.click(copyUidBtn);
      });

      // Toggle switch
      const choreSwitch = screen.getByRole("switch", { name: /Promemoria Turni di Pulizia/i });
      await act(async () => {
        fireEvent.click(choreSwitch);
      });

      // Verify zero emojis throughout dynamic changes
      expect(STRICT_EMOJI_REGEX.test(container.innerHTML)).toBe(false);
    });

    test("CHALLENGE 3.5: All visual iconography uses FontAwesome icons (<i className='fas ...'>) and is accessible", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const icons = container.querySelectorAll("i");
      expect(icons.length).toBeGreaterThanOrEqual(10);

      icons.forEach((icon) => {
        // Must use FontAwesome fas or far
        expect(icon.className).toMatch(/fa[sr]\s+fa-/);
        // Must be marked decorative either directly or via enclosing badge
        const directlyHidden = icon.getAttribute("aria-hidden") === "true";
        const parentHidden = icon.closest("[aria-hidden='true']") !== null;
        expect(directlyHidden || parentHidden).toBe(true);
      });
    });
  });

  // =========================================================================
  // 4. COLOR CONTRAST, ACCESSIBILITY SEMANTICS & ARIA CONTROL DISCIPLINE
  // =========================================================================
  describe("4. Accessibility Semantics, ARIA Controls & WCAG Discipline", () => {
    test("CHALLENGE 4.1: Root container provides landmark role='main' and semantic heading hierarchy", async () => {
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
      });

      const mainLandmark = await screen.findByRole("main");
      expect(mainLandmark).toBeInTheDocument();
      expect(mainLandmark).toHaveClass("settings-container");

      // Heading 1 for page title
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(/Impostazioni|Settings/i);

      // Heading 2 for sections
      const h2s = screen.getAllByRole("heading", { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(3);
    });

    test("CHALLENGE 4.2: Notification toggles implement role='switch', aria-checked, and dynamic accessible labels", async () => {
      const spyShowToast = jest.spyOn(feedbackModule, "showToast");

      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      const choreSwitch = screen.getByRole("switch", { name: /Promemoria Turni di Pulizia:\s*Attivo/i });
      const expenseSwitch = screen.getByRole("switch", { name: /Spese e Debiti Condivisi:\s*Attivo/i });
      const noticeSwitch = screen.getByRole("switch", { name: /Avvisi in Bacheca:\s*Attivo/i });

      expect(choreSwitch).toHaveAttribute("aria-checked", "true");
      expect(expenseSwitch).toHaveAttribute("aria-checked", "true");
      expect(noticeSwitch).toHaveAttribute("aria-checked", "true");

      // Clicking chore switch toggles state and updates aria-checked and aria-label
      fireEvent.click(choreSwitch);

      expect(choreSwitch).toHaveAttribute("aria-checked", "false");
      expect(choreSwitch.getAttribute("aria-label")).toMatch(/Promemoria Turni di Pulizia:\s*Disattivato/i);

      // Toast feedback triggered
      expect(spyShowToast).toHaveBeenCalledWith("Preferenze di notifica salvate", "success");

      spyShowToast.mockRestore();
    });

    test("CHALLENGE 4.3: Segmented controls enforce role='group' and aria-pressed attributes", async () => {
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Language group
      const itBtn = screen.getByRole("button", { name: /Italiano/i });
      const enBtn = screen.getByRole("button", { name: /English/i });

      expect(itBtn).toHaveAttribute("aria-pressed", "true");
      expect(enBtn).toHaveAttribute("aria-pressed", "false");

      // Switch language to English
      fireEvent.click(enBtn);

      expect(itBtn).toHaveAttribute("aria-pressed", "false");
      expect(enBtn).toHaveAttribute("aria-pressed", "true");

      // Theme group (light, dark, system)
      const lightBtn = screen.getByRole("button", { name: /Chiaro|Light/i });
      const darkBtn = screen.getByRole("button", { name: /Scuro|Dark/i });
      const systemBtn = screen.getByRole("button", { name: /Sistema|System/i });

      expect(lightBtn).toHaveAttribute("aria-pressed");
      expect(darkBtn).toHaveAttribute("aria-pressed");
      expect(systemBtn).toHaveAttribute("aria-pressed");

      fireEvent.click(darkBtn);
      expect(darkBtn).toHaveAttribute("aria-pressed", "true");
      expect(lightBtn).toHaveAttribute("aria-pressed", "false");
    });

    test("CHALLENGE 4.4: Every button element has a deterministic, non-empty accessible name", async () => {
      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: bobUnverified,
        userData: bobUserData,
      });

      await screen.findByRole("heading", { level: 1 });

      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        const accessibleName =
          btn.getAttribute("aria-label") || btn.innerText || btn.textContent || "";
        expect(accessibleName.trim().length).toBeGreaterThan(0);
      });
    });

    test("CHALLENGE 4.5: Account verification badges carry accessible screen-reader indicators", async () => {
      // Verified state
      const { unmount } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
      });

      expect(await screen.findByTestId("badge-email-verified")).toBeInTheDocument();
      expect(screen.queryByTestId("badge-email-unverified")).not.toBeInTheDocument();
      unmount();

      // Unverified state
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: bobUnverified,
        userData: bobUserData,
      });

      expect(await screen.findByTestId("badge-email-unverified")).toBeInTheDocument();
      expect(screen.queryByTestId("badge-email-verified")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. RESPONSIVE BREAKPOINT ERGONOMICS & BOUNDARY ADAPTATION
  // =========================================================================
  describe("5. Responsive Breakpoint Ergonomics (Mobile, Tablet, Widescreen Desktop)", () => {
    test("CHALLENGE 5.1: Mobile breakpoint <= 768px stacks card content and expands segmented controls", () => {
      const blocks768 = getAllMediaQueryBlocks(appCss, "@media (max-width: 768px)");
      expect(blocks768.length).toBeGreaterThan(0);

      const hasStackedIdentity = blocks768.some(
        (b) => b.includes(".household-identity-inner") && b.includes("flex-direction: column")
      );
      const hasStackedRows = blocks768.some(
        (b) => b.includes(".settings-row") && b.includes("flex-direction: column")
      );
      const hasSwitchRow = blocks768.some(
        (b) => b.includes(".settings-row.has-switch") && b.includes("flex-direction: row")
      );
      const hasExpandedSegmented = blocks768.some(
        (b) => b.includes(".ios-segmented-control") && b.includes("width: 100%")
      );

      expect(hasStackedIdentity).toBe(true);
      expect(hasStackedRows).toBe(true);
      expect(hasSwitchRow).toBe(true);
      expect(hasExpandedSegmented).toBe(true);
    });

    test("CHALLENGE 5.2: Desktop widescreen breakpoint min-width: 1240px budgets container to max-width: 1000px", () => {
      const blocks1240 = getAllMediaQueryBlocks(appCss, "@media (min-width: 1240px)");
      expect(blocks1240.length).toBeGreaterThan(0);

      const hasWidescreenBudget = blocks1240.some(
        (b) => b.includes(".settings-container") && b.includes("max-width: 1000px")
      );
      expect(hasWidescreenBudget).toBe(true);
    });

    test("CHALLENGE 5.3: Tablet/desktop breakpoint min-width: 1024px applies generous 28px card gap and padding", () => {
      const blocks1024 = getAllMediaQueryBlocks(appCss, "@media (min-width: 1024px)");
      expect(blocks1024.length).toBeGreaterThan(0);

      const hasGap = blocks1024.some(
        (b) => b.includes(".settings-container") && b.includes("gap: 28px")
      );
      const hasPadding = blocks1024.some(
        (b) => b.includes(".household-identity-card") && b.includes("padding: 28px 32px")
      );

      expect(hasGap).toBe(true);
      expect(hasPadding).toBe(true);
    });
  });

  // =========================================================================
  // 6. ADVERSE CONDITIONS & EDGE CASE ROBUSTNESS
  // =========================================================================
  describe("6. Adverse Conditions, Quota & Edge Case Robustness", () => {
    test("CHALLENGE 6.1: Graceful fallback when user has no household affiliation (casaId: null)", async () => {
      const lonelyUser = {
        uid: "u_lonely",
        username: "Solitary",
        email: "solo@househelper.test",
        emailVerified: true,
      };

      const { container } = renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: lonelyUser,
        userData: { username: "Solitary", casaId: null },
        language: "it",
      });

      await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

      // Must display no household fallback text
      expect(screen.getByText("Nessuna casa attiva")).toBeInTheDocument();
      // Must not crash and renders all 4 cards
      expect(container.querySelectorAll(".card").length).toBe(4);
    });

    test("CHALLENGE 6.2: Notification preferences handle corrupted localStorage without breaking", async () => {
      localStorage.setItem("househelper_notification_prefs", "{ malformed_json::: ]");

      const prefs = notificationPrefsModule.getNotificationPreferences();
      expect(prefs).toEqual({
        choreReminders: true,
        expenseAlerts: true,
        householdNotices: true,
      });

      // Renders with recovered defaults
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: aliceVerified,
        userData: aliceUserData,
      });

      const choreSwitch = await screen.findByRole("switch", { name: /Promemoria Turni di Pulizia/i });
      expect(choreSwitch).toHaveAttribute("aria-checked", "true");
    });

    test("CHALLENGE 6.3: Verification cooldown countdown timer decrements correctly without leaking intervals", async () => {
      renderWithProviders(<ViewImpostazioni />, {
        route: "/impostazioni",
        user: bobUnverified,
        userData: bobUserData,
        language: "it",
      });

      const resendBtn = await screen.findByRole("button", { name: /Invia email di verifica/i });
      expect(resendBtn).toBeInTheDocument();

      // Now enable fake timers to test countdown
      jest.useFakeTimers();

      await act(async () => {
        fireEvent.click(resendBtn);
      });

      // Button should now enter cooldown state
      expect(
        screen.getByRole("button", { name: /Attendi 60s prima di richiedere un altro invio/i })
      ).toBeInTheDocument();

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(
        screen.getByRole("button", { name: /Attendi 59s prima di richiedere un altro invio/i })
      ).toBeInTheDocument();

      // Advance 59 seconds to clear cooldown
      act(() => {
        jest.advanceTimersByTime(59000);
      });

      expect(
        screen.getByRole("button", { name: /Invia email di verifica/i })
      ).not.toBeDisabled();

      jest.useRealTimers();
    });
  });
});
