import React from "react";
import fs from "fs";
import path from "path";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, seedHousehold, mockStore } from "../testUtils";
import MobileBottomBar from "../../components/MobileBottomBar";
import DesktopNavigation from "../../components/DesktopNavigation";
import ConfirmModal from "../../components/ConfirmModal";
import { showConfirm } from "../../utils/feedback";
import ViewContatti from "../../pages/Contatti/ViewContatti";
import ViewTurni from "../../pages/TurniPulizia/viewTurni";
import AggiuntaTurno from "../../pages/TurniPulizia/aggiuntaTurno";
import AggiungiDebito from "../../pages/Debiti/AggiungiDebito";
import ViewSpesa from "../../pages/Spesa/ViewSpesa";
import ViewDebiti from "../../pages/Debiti/ViewDebiti";

describe("Milestone M9 Adversarial Challenger Suite: Ergonomics, Bottom Bar, Touch Targets & Desktop Navigation", () => {
  const alice = { uid: "u_alice", username: "Alice", email: "alice@test.com" };
  const bob = { uid: "u_bob", username: "Bob", email: "bob@test.com" };
  const houseId = "casa_m9_ergonomics";

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
  // 1. MOBILE BOTTOM BAR RENDERING INVARIANTS & AUTH GUARDS
  // =========================================================================
  describe("1. MobileBottomBar Rendering Invariants & State Guards", () => {
    test("CHALLENGE 1.1: Returns null and renders zero DOM elements when session is unauthenticated", () => {
      const { container } = renderWithProviders(<MobileBottomBar />, {
        user: null,
        userData: null,
      });

      expect(container.querySelector(".mobile-bottom-bar")).toBeNull();
    });

    test("CHALLENGE 1.2: Returns null when authenticated user has no casaId (null, undefined, or empty string)", async () => {
      // Test null casaId
      const { container: c1 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: null },
      });
      expect(c1.querySelector(".mobile-bottom-bar")).toBeNull();

      // Test undefined casaId
      const { container: c2 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice" },
      });
      expect(c2.querySelector(".mobile-bottom-bar")).toBeNull();

      // Test empty string casaId
      const { container: c3 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: "" },
      });
      expect(c3.querySelector(".mobile-bottom-bar")).toBeNull();
    });

    test("CHALLENGE 1.3: Renders exactly 5 tabs with vector icons and zero emojis when authenticated with casaId", async () => {
      const { container } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      await waitFor(() => {
        expect(container.querySelector(".mobile-bottom-bar")).toBeInTheDocument();
      });

      const navBar = container.querySelector(".mobile-bottom-bar");
      expect(navBar).toHaveAttribute("aria-label", "Navigazione rapida mobile");

      // Exactly 4 links and 1 button => 5 interactive tabs total
      const links = navBar.querySelectorAll("a.mobile-bottom-tab");
      const button = navBar.querySelectorAll("button.mobile-bottom-tab");
      expect(links).toHaveLength(4);
      expect(button).toHaveLength(1);

      // Verify labels
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Turni")).toBeInTheDocument();
      expect(screen.getByText("Spese")).toBeInTheDocument();
      expect(screen.getByText("Spesa")).toBeInTheDocument();
      expect(screen.getByText("Altro")).toBeInTheDocument();

      // Verify FontAwesome vector icons
      const icons = navBar.querySelectorAll("i.fas");
      expect(icons).toHaveLength(5);
      const iconClasses = Array.from(icons).map((i) => i.className);
      expect(iconClasses.some((c) => c.includes("fa-home"))).toBe(true);
      expect(iconClasses.some((c) => c.includes("fa-broom"))).toBe(true);
      expect(iconClasses.some((c) => c.includes("fa-wallet"))).toBe(true);
      expect(iconClasses.some((c) => c.includes("fa-shopping-cart"))).toBe(true);
      expect(iconClasses.some((c) => c.includes("fa-bars"))).toBe(true);

      // Strict zero-emoji check on rendered content
      const textContent = navBar.textContent || "";
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(textContent)).toBe(false);
    });

    test("CHALLENGE 1.4: Dynamic context unmount: gracefully transitions from rendered to null without crashing", async () => {
      const { container } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      await waitFor(() => {
        expect(container.querySelector(".mobile-bottom-bar")).toBeInTheDocument();
      });

      // Revoke user in mockStore / logout
      act(() => {
        mockStore.setMockUser(null);
      });

      await waitFor(() => {
        expect(container.querySelector(".mobile-bottom-bar")).toBeNull();
      });
    });
  });

  // =========================================================================
  // 2. NAVIGATION LINKS, ROUTE MATCHING & ACTIVE CLASSES
  // =========================================================================
  describe("2. MobileBottomBar Navigation Links, Route Matching & Active Classes", () => {
    test("CHALLENGE 2.1: Navigation link destinations match exact domain routes", async () => {
      const { container } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      await waitFor(() => {
        expect(container.querySelector(".mobile-bottom-bar")).toBeInTheDocument();
      });

      const homeLink = screen.getByText("Home").closest("a");
      const turniLink = screen.getByText("Turni").closest("a");
      const speseLink = screen.getByText("Spese").closest("a");
      const spesaLink = screen.getByText("Spesa").closest("a");

      expect(homeLink).toHaveAttribute("href", "/home");
      expect(turniLink).toHaveAttribute("href", "/turni");
      expect(speseLink).toHaveAttribute("href", "/debiti");
      expect(spesaLink).toHaveAttribute("href", "/spesa");
    });

    test("CHALLENGE 2.2: Active route styling on exact and sub-routes", async () => {
      // 1. Exact match on /home
      const { unmount: u1 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });
      await waitFor(() => {
        const homeLink = screen.getByText("Home").closest("a");
        expect(homeLink).toHaveClass("active");
        expect(homeLink).toHaveAttribute("aria-current", "page");
        expect(screen.getByText("Turni").closest("a")).not.toHaveClass("active");
        expect(screen.getByText("Spese").closest("a")).not.toHaveClass("active");
        expect(screen.getByText("Spesa").closest("a")).not.toHaveClass("active");
      });
      u1();

      // 2. Sub-route prefix match on /turni/modifica/turno_99
      const { unmount: u2 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/turni/modifica/turno_99",
      });
      await waitFor(() => {
        const turniLink = screen.getByText("Turni").closest("a");
        expect(turniLink).toHaveClass("active");
        expect(turniLink).toHaveAttribute("aria-current", "page");
        expect(screen.getByText("Home").closest("a")).not.toHaveClass("active");
      });
      u2();

      // 3. Sub-route prefix match on /debiti/aggiungi
      const { unmount: u3 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/debiti/aggiungi",
      });
      await waitFor(() => {
        const speseLink = screen.getByText("Spese").closest("a");
        expect(speseLink).toHaveClass("active");
        expect(speseLink).toHaveAttribute("aria-current", "page");
      });
      u3();

      // 4. Exact match on /spesa
      const { unmount: u4 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/spesa",
      });
      await waitFor(() => {
        const spesaLink = screen.getByText("Spesa").closest("a");
        expect(spesaLink).toHaveClass("active");
        expect(spesaLink).toHaveAttribute("aria-current", "page");
      });
      u4();

      // 5. Unmapped secondary routes (e.g. /calendario) leave all bottom tabs inactive
      const { unmount: u5 } = renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/calendario",
      });
      await waitFor(() => {
        expect(screen.getByText("Home").closest("a")).not.toHaveClass("active");
        expect(screen.getByText("Turni").closest("a")).not.toHaveClass("active");
        expect(screen.getByText("Spese").closest("a")).not.toHaveClass("active");
        expect(screen.getByText("Spesa").closest("a")).not.toHaveClass("active");
      });
      u5();
    });

    test("CHALLENGE 2.3: 'Altro' button dispatches toggle-mobile-menu CustomEvent and survives rapid multi-click stress", async () => {
      renderWithProviders(<MobileBottomBar />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      const altroBtn = await screen.findByRole("button", { name: /Apri menu altro/i });
      expect(altroBtn).toBeInTheDocument();

      const eventSpy = jest.fn();
      window.addEventListener("toggle-mobile-menu", eventSpy);

      // Single click
      fireEvent.click(altroBtn);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // Multi-click torture: 100 rapid clicks
      for (let i = 0; i < 100; i++) {
        fireEvent.click(altroBtn);
      }
      expect(eventSpy).toHaveBeenCalledTimes(101);

      window.removeEventListener("toggle-mobile-menu", eventSpy);
    });
  });

  // =========================================================================
  // 3. SAFE AREA CLEARANCE & RESPONSIVE CSS ARCHITECTURE
  // =========================================================================
  describe("3. Safe Area Padding & Mobile Clearance Architecture", () => {
    test("CHALLENGE 3.1: Mobile bottom bar CSS contains fixed position, blur glass and safe area env variables", () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      expect(fs.existsSync(cssPath)).toBe(true);
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Verify .mobile-bottom-bar declaration
      expect(cssContent).toMatch(/\.mobile-bottom-bar\s*\{[^}]*position:\s*fixed/);
      expect(cssContent).toMatch(/\.mobile-bottom-bar\s*\{[^}]*bottom:\s*0/);
      expect(cssContent).toMatch(/\.mobile-bottom-bar\s*\{[^}]*height:\s*calc\(64px\s*\+\s*env\(safe-area-inset-bottom/);
      expect(cssContent).toMatch(/\.mobile-bottom-bar\s*\{[^}]*padding-bottom:\s*env\(safe-area-inset-bottom/);
      expect(cssContent).toMatch(/\.mobile-bottom-bar\s*\{[^}]*z-index:\s*990/);
    });

    test("CHALLENGE 3.2: Mobile clearance in .app-container reserves 84px + safe area to prevent content occlusion", () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Verify that under max-width: 768px, .app-container has bottom padding accommodating bottom bar
      expect(cssContent).toMatch(
        /@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.app-container\s*\{[^}]*padding:[^}]*calc\(84px\s*\+\s*env\(safe-area-inset-bottom[^}]*!important/
      );
    });

    test("CHALLENGE 3.3: Viewport meta tag in public/index.html includes viewport-fit=cover", () => {
      const htmlPath = path.resolve(__dirname, "../../../public/index.html");
      expect(fs.existsSync(htmlPath)).toBe(true);
      const htmlContent = fs.readFileSync(htmlPath, "utf8");

      expect(htmlContent).toMatch(/<meta[^>]*name=["']viewport["'][^>]*viewport-fit=cover/);
    });

    test("CHALLENGE 3.4: Accessibility: prefers-reduced-transparency disables glass blur on mobile bar", () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      expect(cssContent).toMatch(
        /@media\s*\(\s*prefers-reduced-transparency:\s*reduce\s*\)[^{]*\{[\s\S]*?\.mobile-bottom-bar[^{]*\{[^}]*backdrop-filter:\s*none\s*!important/
      );
    });

    test("CHALLENGE 3.5: Responsive display segregation: bottom bar hidden on desktop, desktop nav hidden on mobile", () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Desktop hides mobile bottom bar
      expect(cssContent).toMatch(
        /@media\s*\(\s*min-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.mobile-bottom-bar\s*\{[^}]*display:\s*none\s*!important/
      );

      // Mobile hides desktop nav bar
      expect(cssContent).toMatch(
        /@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.desktop-nav-root\s*\{[^}]*display:\s*none\s*!important/
      );
    });
  });

  // =========================================================================
  // 4. APPLE HIG TOUCH TARGET COMPLIANCE (>= 44x44 PT/PX)
  // =========================================================================
  describe("4. Touch Target Compliance (Apple HIG >= 44x44 pt/px)", () => {
    test("CHALLENGE 4.1: Mobile bottom bar tabs satisfy >= 48px tactile constraints", () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      expect(cssContent).toMatch(/\.mobile-bottom-tab\s*\{[^}]*min-height:\s*48px/);
      expect(cssContent).toMatch(/\.mobile-bottom-tab\s*\{[^}]*min-width:\s*48px/);
    });

    test("CHALLENGE 4.2: Grocery staple preset chips enforce >= 44px touch targets", async () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");
      expect(cssContent).toMatch(/\.grocery-staple-btn\s*\{[^}]*min-height:\s*44px/);

      seedHousehold({ houseId, users: [alice] });
      const { container } = renderWithProviders(<ViewSpesa />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      await waitFor(() => {
        expect(container.querySelector(".grocery-staple-btn")).toBeInTheDocument();
      });

      const stapleBtns = container.querySelectorAll(".grocery-staple-btn");
      expect(stapleBtns.length).toBeGreaterThan(0);
      stapleBtns.forEach((btn) => {
        expect(btn).toBeInTheDocument();
      });
    });

    test("CHALLENGE 4.3: Contact action buttons (call, email, delete) enforce min 44x44 touch targets", async () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      expect(cssContent).toMatch(/\.btn-action-call,\s*\.btn-action-email\s*\{[^}]*min-height:\s*44px/);
      expect(cssContent).toMatch(/\.contact-delete-btn\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/);

      // Seed a contact with phone and email
      seedHousehold({ houseId, users: [alice] });
      mockStore.seed("contatti", [
        {
          id: "c_test_erg",
          casaId: houseId,
          nome: "Elettricista Mario",
          categoria: "Elettricista",
          telefono: "+39 333 9876543",
          email: "mario@elettrico.it",
          note: "Disponibile H24",
          creatoDa: alice.uid,
        },
      ]);

      renderWithProviders(<ViewContatti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      await waitFor(() => {
        expect(screen.getByText("Elettricista Mario")).toBeInTheDocument();
      });

      const callBtn = screen.getByRole("link", { name: /Chiama Elettricista Mario/i });
      const emailBtn = screen.getByRole("link", { name: /Invia email a Elettricista Mario/i });
      const deleteBtn = screen.getByRole("button", { name: /Elimina Elettricista Mario/i });

      expect(callBtn).toHaveClass("btn-action-call");
      expect(emailBtn).toHaveClass("btn-action-email");
      expect(deleteBtn).toHaveClass("contact-delete-btn");
    });

    test("CHALLENGE 4.4: Modal dialog buttons (footer actions & close button) satisfy min 44x44 touch targets", async () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      expect(cssContent).toMatch(/\.confirm-modal-footer button\s*\{[^}]*min-height:\s*44px/);
      expect(cssContent).toMatch(/\.confirm-modal-close\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/);
      expect(cssContent).toMatch(/\.modal-close-btn\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/);
      expect(cssContent).toMatch(/\.modal-card\s*\{[^}]*box-shadow:\s*var\(--shadow-modal\)/);

      renderWithProviders(<ConfirmModal />);

      act(() => {
        showConfirm({
          title: "Conferma Azione",
          message: "Sei sicuro di voler procedere?",
          confirmText: "Procedi",
          cancelText: "Annulla",
          isDanger: false,
        });
      });

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: "Procedi" });
      const cancelBtn = screen.getByRole("button", { name: "Annulla" });
      const closeBtn = screen.getByRole("button", { name: /chiudi finestra/i });

      expect(confirmBtn.closest(".confirm-modal-footer")).toBeInTheDocument();
      expect(cancelBtn.closest(".confirm-modal-footer")).toBeInTheDocument();
      expect(closeBtn).toHaveClass("confirm-modal-close");

      // Dismiss dialog
      act(() => {
        fireEvent.click(cancelBtn);
      });
    });

    test("CHALLENGE 4.5: Subtask quick-adder and chore checklist controls satisfy ergonomic size contracts", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        turni: [
          {
            id: "t_erg",
            nome: "Bagno",
            luoghi: "Bagno",
            data: "2026-11-25",
            nomi: ["Alice"],
            checklist: [
              { id: "sub_1", text: "Igienizzare sanitari", completed: false },
            ],
          },
        ],
      });

      renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      await waitFor(() => {
        expect(screen.getByText("Igienizzare sanitari")).toBeInTheDocument();
      });

      // Quick subtask adder button
      const quickAddBtn = screen.getByRole("button", { name: "Aggiungi mansione rapida" });
      expect(quickAddBtn).toBeInTheDocument();
      expect(quickAddBtn.style.minHeight).toBe("44px");
      expect(quickAddBtn.style.minWidth).toBe("44px");

      // Subtask item label & checkbox
      const subtaskLabel = screen.getByText("Igienizzare sanitari").closest("label");
      expect(subtaskLabel).toBeInTheDocument();
      expect(parseInt(subtaskLabel.style.minHeight, 10)).toBeGreaterThanOrEqual(40);

      const checkbox = subtaskLabel.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.style.width).toBe("20px");
      expect(checkbox.style.height).toBe("20px");
    });

    test("CHALLENGE 4.6: Preset chips in AggiuntaTurno and AggiungiDebito satisfy minimum tactile dimensions (>= 40px)", async () => {
      seedHousehold({ houseId, users: [alice, bob] });

      // 1. Roommate & zone chips in AggiuntaTurno
      const { container: cTurno, unmount: u1 } = renderWithProviders(<AggiuntaTurno />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      await waitFor(() => {
        expect(cTurno.querySelector(".roommate-select-chip")).toBeInTheDocument();
      });

      const roommateChip = cTurno.querySelector(".roommate-select-chip");
      expect(parseInt(roommateChip.style.minHeight, 10)).toBeGreaterThanOrEqual(40);

      const zoneBtn = screen.getByRole("button", { name: /Cucina/i });
      expect(parseInt(zoneBtn.style.minHeight, 10)).toBeGreaterThanOrEqual(40);
      u1();

      // 2. Amount preset chips and even distribution button in AggiungiDebito
      const { unmount: u2 } = renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "+5 €" })).toBeInTheDocument();
      });

      ["+5 €", "+10 €", "+20 €", "+50 €"].forEach((amt) => {
        const btn = screen.getByRole("button", { name: amt });
        expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(40);
      });

      u2();
    });
  });

  // =========================================================================
  // 5. DESKTOP NAVIGATION PRESERVATION & ROLE CONTRACT
  // =========================================================================
  describe("5. Desktop Navigation Preservation & Role Contracts", () => {
    test("CHALLENGE 5.1: DesktopNavigation hides when unauthenticated or without houseId", () => {
      const { container: c1 } = renderWithProviders(<DesktopNavigation />, {
        user: null,
        userData: null,
      });
      expect(c1.querySelector(".desktop-nav-root")).toBeNull();

      const { container: c2 } = renderWithProviders(<DesktopNavigation />, {
        user: alice,
        userData: { username: "Alice", casaId: null },
      });
      expect(c2.querySelector(".desktop-nav-root")).toBeNull();
    });

    test("CHALLENGE 5.2: DesktopNavigation renders exactly 8 links with exact roles, labels, and vector icons", async () => {
      const { container } = renderWithProviders(<DesktopNavigation />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
        route: "/home",
      });

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /navigazione principale/i })).toBeInTheDocument();
      });

      const navRoot = container.querySelector(".desktop-nav-root");
      const listItems = navRoot.querySelectorAll("li.desktop-nav-item");
      expect(listItems).toHaveLength(8);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(8);

      const expectedTabs = [
        { label: "Dashboard", href: "/home", icon: "fa-home" },
        { label: "Turni", href: "/turni", icon: "fa-broom" },
        { label: "Debiti", href: "/debiti", icon: "fa-wallet" },
        { label: "Spesa", href: "/spesa", icon: "fa-shopping-cart" },
        { label: "Bacheca", href: "/bacheca", icon: "fa-thumbtack" },
        { label: "Calendario", href: "/calendario", icon: "fa-calendar-alt" },
        { label: "Documenti", href: "/documenti", icon: "fa-folder-open" },
        { label: "Contatti", href: "/contatti", icon: "fa-address-book" },
      ];

      expectedTabs.forEach((tab) => {
        const link = screen.getByText(tab.label).closest("a");
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", tab.href);
        const icon = link.querySelector("i.fas");
        expect(icon).toBeInTheDocument();
        expect(icon.className).toContain(tab.icon);
      });

      // Strict zero emojis check
      const text = navRoot.textContent || "";
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiRegex.test(text)).toBe(false);
    });

    test("CHALLENGE 5.3: DesktopNavigation route highlighting sets .active class exclusively on current route", async () => {
      const routesToTest = [
        { path: "/home", activeLabel: "Dashboard" },
        { path: "/turni", activeLabel: "Turni" },
        { path: "/debiti", activeLabel: "Debiti" },
        { path: "/spesa", activeLabel: "Spesa" },
        { path: "/bacheca", activeLabel: "Bacheca" },
        { path: "/calendario", activeLabel: "Calendario" },
        { path: "/documenti", activeLabel: "Documenti" },
        { path: "/contatti", activeLabel: "Contatti" },
      ];

      for (const item of routesToTest) {
        const { unmount } = renderWithProviders(<DesktopNavigation />, {
          user: alice,
          userData: { username: "Alice", casaId: houseId },
          route: item.path,
        });

        await waitFor(() => {
          const activeLink = screen.getByText(item.activeLabel).closest("a");
          expect(activeLink).toHaveClass("active");

          // Ensure other 7 links do not have active class
          routesToTest
            .filter((other) => other.activeLabel !== item.activeLabel)
            .forEach((other) => {
              const inactiveLink = screen.getByText(other.activeLabel).closest("a");
              expect(inactiveLink).not.toHaveClass("active");
            });
        });

        unmount();
      }
    });
  });

  // =========================================================================
  // 6. MODAL ERGONOMICS, ELEVATION & INVARIANTS STRESS (CHALLENGER 2)
  // =========================================================================
  describe("6. Modal Ergonomics, Elevation & Invariants Stress (Challenger 2)", () => {
    test("CHALLENGE 6.1: ViewDebiti Export Modal: backdrop click dismisses modal and stopPropagation prevents inside dismissal", async () => {
      seedHousehold({
        houseId,
        users: [alice, bob],
        debiti: [
          {
            id: "d_erg1",
            casaId: houseId,
            descrizione: "Detersivi",
            importo: 15.0,
            pagatoDa: alice.uid,
            divisoCon: [bob.uid],
            createdAt: new Date().toISOString(),
          },
        ],
      });

      renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      // 1. Wait for page load
      const exportBtn = await screen.findByRole("button", { name: /Esporta Resoconto/i });
      expect(exportBtn).toBeInTheDocument();

      // 2. Click Export button to open modal
      fireEvent.click(exportBtn);

      const modalHeading = await screen.findByRole("heading", { name: /Esporta resoconto spese/i });
      expect(modalHeading).toBeInTheDocument();

      const backdrop = document.querySelector(".modal-backdrop");
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveAttribute("role", "dialog");
      expect(backdrop).toHaveAttribute("aria-modal", "true");

      const modalCard = backdrop.querySelector(".modal-card");
      expect(modalCard).toBeInTheDocument();

      // 3. Click inside modal-card -> stopPropagation prevents backdrop dismiss
      fireEvent.click(modalCard);
      expect(screen.getByRole("heading", { name: /Esporta resoconto spese/i })).toBeInTheDocument();

      // 4. Click backdrop outside modal-card -> closes modal
      fireEvent.click(backdrop);
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: /Esporta resoconto spese/i })).toBeNull();
      });
    });

    test("CHALLENGE 6.2: ViewDebiti Export Modal: Escape key dismisses modal, non-Escape key ignores, rapid closed Escape is safe", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        debiti: [],
      });

      const { unmount } = renderWithProviders(<ViewDebiti />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      // Rapid Escape key while modal is closed: must be safe no-op
      fireEvent.keyDown(window, { key: "Escape" });
      fireEvent.keyDown(window, { key: "Escape" });

      const exportBtn = await screen.findByRole("button", { name: /Esporta Resoconto/i });
      fireEvent.click(exportBtn);

      await screen.findByRole("heading", { name: /Esporta resoconto spese/i });

      // Non-Escape key (Enter, Tab, Space) must NOT close modal
      fireEvent.keyDown(window, { key: "Enter" });
      fireEvent.keyDown(window, { key: "Tab" });
      fireEvent.keyDown(window, { key: " " });
      expect(screen.getByRole("heading", { name: /Esporta resoconto spese/i })).toBeInTheDocument();

      // Escape key closes modal
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: /Esporta resoconto spese/i })).toBeNull();
      });

      // Rapid Escape keys after closed: still safe
      fireEvent.keyDown(window, { key: "Escape" });

      // Re-open and unmount while open -> effect cleanup must unbind without throwing
      fireEvent.click(exportBtn);
      await screen.findByRole("heading", { name: /Esporta resoconto spese/i });
      expect(() => unmount()).not.toThrow();
    });

    test("CHALLENGE 6.3: ConfirmModal: backdrop click, Escape key, and box-shadow elevation contract", async () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Verify .confirm-modal-card uses var(--shadow-modal)
      expect(cssContent).toMatch(/\.confirm-modal-card\s*\{[^}]*box-shadow:\s*var\(--shadow-modal\)/);

      renderWithProviders(<ConfirmModal />);

      act(() => {
        showConfirm({
          title: "Elimina Elemento",
          message: "Sei sicuro di voler eliminare?",
          confirmText: "Elimina",
          cancelText: "Annulla",
          isDanger: true,
        });
      });

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveClass("confirm-modal-card");

      const backdrop = document.querySelector(".confirm-modal-backdrop");
      expect(backdrop).toBeInTheDocument();

      // Click card itself -> stopPropagation
      fireEvent.click(dialog);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Escape key dismisses
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      // Open again and test backdrop click dismiss
      act(() => {
        showConfirm({
          title: "Seconda Conferma",
          message: "Test backdrop click",
        });
      });

      const dialog2 = await screen.findByRole("dialog");
      expect(dialog2).toBeInTheDocument();
      const backdrop2 = document.querySelector(".confirm-modal-backdrop");

      fireEvent.click(backdrop2);
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });
    });

    test("CHALLENGE 6.4: Toast Safe Area Insets in Mobile Media Query", () => {
      const cssPath = path.resolve(__dirname, "../../App.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Find mobile toast container definition
      const mobileToastMatch = cssContent.match(/@media\s*\(\s*max-width:\s*600px\s*\)\s*\{[\s\S]*?\.toast-container\s*\{([^}]+)\}/);
      expect(mobileToastMatch).not.toBeNull();
      const toastRules = mobileToastMatch[1];
      expect(toastRules).toMatch(/top:\s*calc\(\s*16px\s*\+\s*env\(\s*safe-area-inset-top\s*,\s*0px\s*\)\s*\)/);
    });

    test("CHALLENGE 6.5: Button Query Patterns Invariants (/Nuovo Turno/i, /Crea Turno/i, /Salva Spesa/i)", async () => {
      seedHousehold({
        houseId,
        users: [alice],
        turni: [], // Empty shifts state
      });

      // 1. In viewTurni (empty state): header has "Nuovo Turno", empty state has "Crea il primo turno"
      // Verify findByRole("button", { name: /Nuovo Turno/i }) does NOT throw multiple elements error
      const { unmount: uTurni } = renderWithProviders(<ViewTurni />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      const nuovoTurnoBtn = await screen.findByRole("button", { name: /Nuovo Turno/i });
      expect(nuovoTurnoBtn).toBeInTheDocument();

      const creaPrimoBtn = screen.getByRole("button", { name: /Crea il primo turno/i });
      expect(creaPrimoBtn).toBeInTheDocument();
      uTurni();

      // 2. In AggiuntaTurno: submit button matches /Crea Turno/i
      const { unmount: uAddTurno } = renderWithProviders(<AggiuntaTurno />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      const creaTurnoSubmit = await screen.findByRole("button", { name: /Crea Turno/i });
      expect(creaTurnoSubmit).toBeInTheDocument();
      expect(creaTurnoSubmit).toHaveAttribute("type", "submit");
      uAddTurno();

      // 3. In AggiungiDebito: submit button matches /Salva Spesa/i
      const { unmount: uAddDebito } = renderWithProviders(<AggiungiDebito />, {
        user: alice,
        userData: { username: "Alice", casaId: houseId },
      });

      const salvaSpesaSubmit = await screen.findByRole("button", { name: /Salva Spesa/i });
      expect(salvaSpesaSubmit).toBeInTheDocument();
      expect(salvaSpesaSubmit).toHaveAttribute("type", "submit");
      uAddDebito();
    });
  });
});
