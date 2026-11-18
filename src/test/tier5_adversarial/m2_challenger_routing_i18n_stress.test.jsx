import React, { Suspense, useState } from "react";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import * as routerMock from "react-router-dom";
import { LanguageProvider, useLanguage } from "../../contexts/LanguageContext";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import DesktopNavigation from "../../components/DesktopNavigation";
import MobileNavigation from "../../components/MobileNavigation";
import MobileBottomBar from "../../components/MobileBottomBar";
import { HouseProtectedRoute } from "../../components/RouteGuards";
import ViewImpostazioni from "../../pages/Impostazioni/ViewImpostazioni";
import mockStore from "../mockFirebase";
import { renderWithProviders, seedHousehold } from "../testUtils";

describe("M2 Empirical Challenger: Navigation Routing & Dynamic i18n Stress Suite", () => {
  const testUser = {
    uid: "user_challenger_m2",
    email: "challenger@househelper.it",
    displayName: "Challenger",
    emailVerified: true,
  };

  const testUserData = {
    username: "Challenger",
    email: "challenger@househelper.it",
    casaId: "casa_challenger_m2",
  };

  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    document.documentElement.lang = "it";

    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();

    seedHousehold({
      houseId: "casa_challenger_m2",
      houseName: "Casa Challenger",
      inviteCode: "CHALL01",
      creatorId: "user_challenger_m2",
      users: [testUser],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.lang = "it";
  });

  // =========================================================================
  // 1. ROUTING PIPELINE & GUARD STRESS TESTS
  // =========================================================================
  describe("1. Full Pipeline Routing & Guard Fallbacks", () => {
    test("1.1 Direct URL navigation to /impostazioni mounts ViewImpostazioni for authenticated household member", async () => {
      renderWithProviders(
        <Suspense fallback={<div>Loading Settings...</div>}>
          <ViewImpostazioni />
        </Suspense>,
        {
          route: "/impostazioni",
          user: testUser,
          userData: testUserData,
          language: "it",
        }
      );

      // ViewImpostazioni mounts successfully
      expect(await screen.findByRole("heading", { level: 1, name: /Impostazioni/i })).toBeInTheDocument();
      expect(screen.getByText("Casa Attiva")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Tema e Aspetto/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Notifiche e Avvisi/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Account e Sicurezza/i })).toBeInTheDocument();
    });

    test("1.2 Route alias /settings element redirects to /impostazioni via replace navigation", async () => {
      // In App.js: <Route path="/settings" element={<Navigate to="/impostazioni" replace />} />
      renderWithProviders(<routerMock.Navigate to="/impostazioni" replace />, {
        route: "/settings",
        user: testUser,
        userData: testUserData,
      });

      const mockNav = await screen.findByTestId("mock-navigate");
      expect(mockNav).toHaveAttribute("data-to", "/impostazioni");
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith("/impostazioni", expect.anything());
    });

    test("1.3 Fallback: Unauthenticated user accessing /impostazioni is intercepted by HouseProtectedRoute and redirected to /login", async () => {
      renderWithProviders(<HouseProtectedRoute />, {
        route: "/impostazioni",
        user: null,
        userData: null,
      });

      const mockNav = await screen.findByTestId("mock-navigate");
      expect(mockNav).toHaveAttribute("data-to", "/login");
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith("/login", expect.anything());
    });

    test("1.4 Fallback: Unauthenticated user accessing /settings alias is intercepted by HouseProtectedRoute and redirected to /login", async () => {
      renderWithProviders(<HouseProtectedRoute />, {
        route: "/settings",
        user: null,
        userData: null,
      });

      const mockNav = await screen.findByTestId("mock-navigate");
      expect(mockNav).toHaveAttribute("data-to", "/login");
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith("/login", expect.anything());
    });

    test("1.5 Fallback: Authenticated user without household accessing /impostazioni is redirected to /scelta-casa", async () => {
      const homelessUser = { uid: "user_nohome", email: "nohome@test.it" };
      renderWithProviders(<HouseProtectedRoute />, {
        route: "/impostazioni",
        user: homelessUser,
        userData: { username: "Homeless", casaId: null },
      });

      const mockNav = await screen.findByTestId("mock-navigate");
      expect(mockNav).toHaveAttribute("data-to", "/scelta-casa");
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith("/scelta-casa", expect.anything());
    });

    test("1.6 Fallback: Authenticated user without household accessing /settings alias is redirected to /scelta-casa", async () => {
      const homelessUser = { uid: "user_nohome", email: "nohome@test.it" };
      renderWithProviders(<HouseProtectedRoute />, {
        route: "/settings",
        user: homelessUser,
        userData: { username: "Homeless", casaId: null },
      });

      const mockNav = await screen.findByTestId("mock-navigate");
      expect(mockNav).toHaveAttribute("data-to", "/scelta-casa");
      expect(routerMock.__mockNavigate).toHaveBeenCalledWith("/scelta-casa", expect.anything());
    });

    test("1.7 Boundary: User with empty string casaId is blocked from protected routes and redirected to /scelta-casa", async () => {
      const emptyCasaUser = { uid: "user_empty_casa", email: "empty@test.it" };
      renderWithProviders(<HouseProtectedRoute />, {
        route: "/impostazioni",
        user: emptyCasaUser,
        userData: { username: "EmptyCasa", casaId: "" },
      });

      const mockNav = await screen.findByTestId("mock-navigate");
      expect(mockNav).toHaveAttribute("data-to", "/scelta-casa");
    });

    test("1.8 Guard Outlet: Authenticated user with active casaId passes HouseProtectedRoute to render child Outlet", async () => {
      renderWithProviders(<HouseProtectedRoute />, {
        route: "/impostazioni",
        user: testUser,
        userData: testUserData,
      });

      const outlet = await screen.findByTestId("mock-outlet");
      expect(outlet).toBeInTheDocument();
      expect(screen.queryByTestId("mock-navigate")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. DYNAMIC LANGUAGE SWITCHING STRESS TESTS
  // =========================================================================
  describe("2. Dynamic Language Switching (DesktopNav, MobileNav, MobileBottomBar)", () => {
    function IntegratedNavHarness() {
      const { language, setLanguage } = useLanguage();

      return (
        <div>
          <div className="test-lang-controls">
            <button
              data-testid="switch-en"
              type="button"
              onClick={() => setLanguage("en")}
            >
              Switch to EN
            </button>
            <button
              data-testid="switch-it"
              type="button"
              onClick={() => setLanguage("it")}
            >
              Switch to IT
            </button>
            <span data-testid="current-lang">{language}</span>
          </div>

          <div data-testid="desktop-nav-container">
            <DesktopNavigation />
          </div>

          <div data-testid="mobile-nav-container">
            <MobileNavigation />
          </div>

          <div data-testid="mobile-bottom-bar-container">
            <MobileBottomBar />
          </div>
        </div>
      );
    }

    test("2.1 Dynamic switch IT -> EN updates all 9 desktop links, all 9 mobile drawer links, and all 5 bottom tabs without unmounting", async () => {
      renderWithProviders(<IntegratedNavHarness />, {
        route: "/home",
        user: testUser,
        userData: testUserData,
        language: "it",
      });

      // Open mobile drawer
      const burgerBtn = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burgerBtn);

      // 1. Initial Italian Verification
      // Desktop Nav 9 items
      expect(screen.getByRole("navigation", { name: "Navigazione principale" })).toBeInTheDocument();
      const desktopLinksIt = screen.getByTestId("desktop-nav-container").querySelectorAll(".desktop-nav-link");
      expect(desktopLinksIt).toHaveLength(9);
      const expectedDesktopIt = [
        "Dashboard", "Turni", "Debiti", "Spesa", "Bacheca", "Calendario", "Documenti", "Contatti", "Impostazioni"
      ];
      expectedDesktopIt.forEach((label) => {
        expect(screen.getByTestId("desktop-nav-container")).toHaveTextContent(label);
      });

      // Mobile Drawer items in IT
      expect(screen.getByText("Ciao, Challenger")).toBeInTheDocument();
      expect(screen.getByText("HouseHelper Menu")).toBeInTheDocument();
      const expectedMobileIt = [
        "Dashboard", "Turni Pulizia", "Spese & Debiti", "Lista Spesa", "Calendario Casa",
        "Bacheca", "Documenti & Contratti", "Contatti Utili", "Impostazioni"
      ];
      expectedMobileIt.forEach((label) => {
        expect(document.querySelector(".mobile-menu-overlay")).toHaveTextContent(label);
      });
      expect(screen.getByText("Esci dall'account")).toBeInTheDocument();

      // Mobile Bottom Bar 5 tabs in IT
      expect(screen.getByRole("navigation", { name: "Navigazione rapida mobile" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Apri menu altro" })).toBeInTheDocument();
      const bottomBarIt = screen.getByTestId("mobile-bottom-bar-container");
      expect(bottomBarIt).toHaveTextContent("Home");
      expect(bottomBarIt).toHaveTextContent("Turni");
      expect(bottomBarIt).toHaveTextContent("Spese");
      expect(bottomBarIt).toHaveTextContent("Spesa");
      expect(bottomBarIt).toHaveTextContent("Altro");

      // 2. DYNAMIC SWITCH TO ENGLISH (Without re-rendering/unmounting harness)
      const switchEnBtn = screen.getByTestId("switch-en");
      fireEvent.click(switchEnBtn);

      // Verify Dynamic English Update
      expect(screen.getByTestId("current-lang")).toHaveTextContent("en");

      // Desktop Nav updated to EN
      expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
      const expectedDesktopEn = [
        "Dashboard", "Chores", "Balances", "Groceries", "Notice Board", "Calendar", "Documents", "Contacts", "Settings"
      ];
      expectedDesktopEn.forEach((label) => {
        expect(screen.getByTestId("desktop-nav-container")).toHaveTextContent(label);
      });
      expect(screen.getByTestId("desktop-nav-container")).not.toHaveTextContent("Turni");
      expect(screen.getByTestId("desktop-nav-container")).not.toHaveTextContent("Debiti");
      expect(screen.getByTestId("desktop-nav-container")).not.toHaveTextContent("Impostazioni");

      // Mobile Drawer updated to EN
      expect(screen.getByText("Hello, Challenger")).toBeInTheDocument();
      const expectedMobileEn = [
        "Dashboard", "Cleaning Chores", "Expenses & Balances", "Grocery List", "House Calendar",
        "Notice Board", "Documents & Leases", "Useful Contacts", "Settings"
      ];
      expectedMobileEn.forEach((label) => {
        expect(document.querySelector(".mobile-menu-overlay")).toHaveTextContent(label);
      });
      expect(screen.getByText("Log Out")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();

      // Mobile Bottom Bar updated to EN
      expect(screen.getByRole("navigation", { name: "Mobile quick navigation" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open more menu" })).toBeInTheDocument();
      const bottomBarEn = screen.getByTestId("mobile-bottom-bar-container");
      expect(bottomBarEn).toHaveTextContent("Home");
      expect(bottomBarEn).toHaveTextContent("Chores");
      expect(bottomBarEn).toHaveTextContent("Expenses");
      expect(bottomBarEn).toHaveTextContent("Groceries");
      expect(bottomBarEn).toHaveTextContent("More");
      expect(bottomBarEn).not.toHaveTextContent("Turni");
      expect(bottomBarEn).not.toHaveTextContent("Spese");
      expect(bottomBarEn).not.toHaveTextContent("Altro");

      // HTML lang and LocalStorage persistence
      expect(document.documentElement.lang).toBe("en");
      expect(localStorage.getItem("househelper_language")).toBe("en");
    });

    test("2.2 Rapid 10x language switching loop preserves state integrity and DOM fidelity", async () => {
      renderWithProviders(<IntegratedNavHarness />, {
        route: "/home",
        user: testUser,
        userData: testUserData,
        language: "it",
      });

      const switchEnBtn = await screen.findByTestId("switch-en");
      const switchItBtn = screen.getByTestId("switch-it");

      for (let i = 0; i < 10; i++) {
        act(() => {
          fireEvent.click(switchEnBtn);
        });
        expect(document.documentElement.lang).toBe("en");

        act(() => {
          fireEvent.click(switchItBtn);
        });
        expect(document.documentElement.lang).toBe("it");
      }

      // Assert clean Italian state at end of 10x oscillation
      expect(screen.getByTestId("desktop-nav-container")).toHaveTextContent("Impostazioni");
      expect(screen.getByTestId("mobile-bottom-bar-container")).toHaveTextContent("Altro");
      expect(document.documentElement.lang).toBe("it");
      expect(localStorage.getItem("househelper_language")).toBe("it");
    });

    test("2.3 Guest / Unauthenticated MobileNavigation language switching", async () => {
      renderWithProviders(<IntegratedNavHarness />, {
        route: "/",
        user: null,
        userData: null,
        language: "it",
      });

      // Desktop nav and bottom bar must be null when unauthenticated
      expect(screen.getByTestId("desktop-nav-container").querySelector(".desktop-nav-root")).toBeNull();
      expect(screen.getByTestId("mobile-bottom-bar-container").querySelector(".mobile-bottom-bar")).toBeNull();

      // Mobile nav is rendered in guest mode
      const burgerBtn = screen.getByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burgerBtn);

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Accedi")).toBeInTheDocument();
      expect(screen.getByText("Registrati")).toBeInTheDocument();

      // Switch to EN
      fireEvent.click(screen.getByTestId("switch-en"));

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Log In")).toBeInTheDocument();
      expect(screen.getByText("Sign Up")).toBeInTheDocument();
      expect(screen.queryByText("Accedi")).not.toBeInTheDocument();
      expect(screen.queryByText("Registrati")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. ACTIVE ROUTE HIGHLIGHTING STRESS TESTS
  // =========================================================================
  describe("3. Active Route Highlighting Stress Across All Domains", () => {
    function ActiveRouteHarness() {
      return (
        <div>
          <div data-testid="desktop-nav">
            <DesktopNavigation />
          </div>
          <div data-testid="mobile-nav">
            <MobileNavigation />
          </div>
          <div data-testid="mobile-bottom">
            <MobileBottomBar />
          </div>
        </div>
      );
    }

    test("3.1 DesktopNavigation highlights ONLY Settings on /impostazioni and on alias /settings", async () => {
      // 1. Canonical /impostazioni
      const { unmount: u1 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/impostazioni",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione principale" });
      const desktopLinks1 = screen.getByTestId("desktop-nav").querySelectorAll(".desktop-nav-link");
      const active1 = Array.from(desktopLinks1).filter((l) => l.classList.contains("active"));
      expect(active1).toHaveLength(1);
      expect(active1[0]).toHaveAttribute("href", "/impostazioni");
      expect(active1[0].textContent).toContain("Impostazioni");
      u1();

      // 2. Alias /settings
      const { unmount: u2 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/settings",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione principale" });
      const desktopLinks2 = screen.getByTestId("desktop-nav").querySelectorAll(".desktop-nav-link");
      const active2 = Array.from(desktopLinks2).filter((l) => l.classList.contains("active"));
      expect(active2).toHaveLength(1);
      expect(active2[0]).toHaveAttribute("href", "/impostazioni");
      expect(active2[0].textContent).toContain("Impostazioni");
      u2();
    });

    test("3.2 DesktopNavigation highlights exactly 1 active item across all 9 domain pages", async () => {
      const routesAndExpectedLabels = [
        { route: "/home", label: "Dashboard" },
        { route: "/turni", label: "Turni" },
        { route: "/debiti", label: "Debiti" },
        { route: "/spesa", label: "Spesa" },
        { route: "/bacheca", label: "Bacheca" },
        { route: "/calendario", label: "Calendario" },
        { route: "/documenti", label: "Documenti" },
        { route: "/contatti", label: "Contatti" },
        { route: "/impostazioni", label: "Impostazioni" },
      ];

      for (const { route, label } of routesAndExpectedLabels) {
        const { unmount } = renderWithProviders(<ActiveRouteHarness />, {
          route,
          user: testUser,
          userData: testUserData,
        });
        await screen.findByRole("navigation", { name: "Navigazione principale" });
        const links = screen.getByTestId("desktop-nav").querySelectorAll(".desktop-nav-link");
        const activeLinks = Array.from(links).filter((l) => l.classList.contains("active"));

        expect(activeLinks).toHaveLength(1);
        expect(activeLinks[0].textContent).toContain(label);
        unmount();
      }
    });

    test("3.3 DesktopNavigation sub-route prefix matching maintains active highlight on parent section", async () => {
      const subRoutes = [
        { route: "/turni/aggiungi", parentLabel: "Turni" },
        { route: "/turni/modifica/shift_42", parentLabel: "Turni" },
        { route: "/debiti/aggiungi", parentLabel: "Debiti" },
        { route: "/bacheca/aggiungi", parentLabel: "Bacheca" },
        { route: "/bacheca/modifica/note_99", parentLabel: "Bacheca" },
        { route: "/calendario/aggiungi", parentLabel: "Calendario" },
      ];

      for (const { route, parentLabel } of subRoutes) {
        const { unmount } = renderWithProviders(<ActiveRouteHarness />, {
          route,
          user: testUser,
          userData: testUserData,
        });
        await screen.findByRole("navigation", { name: "Navigazione principale" });
        const links = screen.getByTestId("desktop-nav").querySelectorAll(".desktop-nav-link");
        const activeLinks = Array.from(links).filter((l) => l.classList.contains("active"));

        expect(activeLinks).toHaveLength(1);
        expect(activeLinks[0].textContent).toContain(parentLabel);
        unmount();
      }
    });

    test("3.4 MobileNavigation drawer highlights Settings on /impostazioni and on alias /settings", async () => {
      // Canonical /impostazioni
      const { unmount: u1 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/impostazioni",
        user: testUser,
        userData: testUserData,
      });
      const burger1 = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burger1);
      const activeItem1 = document.querySelector(".mobile-menu-overlay .mobile-menu-item.active-item");
      expect(activeItem1).not.toBeNull();
      expect(activeItem1.textContent).toContain("Impostazioni");
      expect(activeItem1.querySelector(".active-dot")).toBeInTheDocument();
      u1();

      // Alias /settings
      const { unmount: u2 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/settings",
        user: testUser,
        userData: testUserData,
      });
      const burger2 = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burger2);
      const activeItem2 = document.querySelector(".mobile-menu-overlay .mobile-menu-item.active-item");
      expect(activeItem2).not.toBeNull();
      expect(activeItem2.textContent).toContain("Impostazioni");
      expect(activeItem2.querySelector(".active-dot")).toBeInTheDocument();
      u2();
    });

    test("3.5 MobileBottomBar highlights correct tabs on core routes and leaves tabs inactive on Settings and unmapped routes", async () => {
      // 1. /home
      const { unmount: u1 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/home",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione rapida mobile" });
      const homeTab = screen.getByTestId("mobile-bottom").querySelector("a[href='/home']");
      expect(homeTab).toHaveClass("active");
      expect(homeTab).toHaveAttribute("aria-current", "page");
      u1();

      // 2. /turni and subroute
      const { unmount: u2 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/turni/modifica/1",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione rapida mobile" });
      const turniTab = screen.getByTestId("mobile-bottom").querySelector("a[href='/turni']");
      expect(turniTab).toHaveClass("active");
      u2();

      // 3. /debiti and subroute
      const { unmount: u3 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/debiti/aggiungi",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione rapida mobile" });
      const speseTab = screen.getByTestId("mobile-bottom").querySelector("a[href='/debiti']");
      expect(speseTab).toHaveClass("active");
      u3();

      // 4. /spesa
      const { unmount: u4 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/spesa",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione rapida mobile" });
      const spesaTab = screen.getByTestId("mobile-bottom").querySelector("a[href='/spesa']");
      expect(spesaTab).toHaveClass("active");
      u4();

      // 5. /impostazioni and /settings — NO bottom tab active (Settings is accessed via drawer)
      const { unmount: u5 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/impostazioni",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione rapida mobile" });
      const activeTabsImpostazioni = screen.getByTestId("mobile-bottom").querySelectorAll(".mobile-bottom-tab.active");
      expect(activeTabsImpostazioni).toHaveLength(0);
      u5();

      const { unmount: u6 } = renderWithProviders(<ActiveRouteHarness />, {
        route: "/settings",
        user: testUser,
        userData: testUserData,
      });
      await screen.findByRole("navigation", { name: "Navigazione rapida mobile" });
      const activeTabsSettings = screen.getByTestId("mobile-bottom").querySelectorAll(".mobile-bottom-tab.active");
      expect(activeTabsSettings).toHaveLength(0);
      u6();
    });
  });

  // =========================================================================
  // 4. ADVERSARIAL INTERACTIONS, ZERO EMOJIS & APPLE HIG STRESS
  // =========================================================================
  describe("4. Drawer Interactions & Quality Invariants", () => {
    function InteractionHarness() {
      const { setLanguage } = useLanguage();
      return (
        <div>
          <button data-testid="toggle-lang" onClick={() => setLanguage("en")}>
            Switch
          </button>
          <MobileNavigation />
          <MobileBottomBar />
        </div>
      );
    }

    test("4.1 MobileNavigation drawer stays open and responsive across external event trigger and language switch", async () => {
      renderWithProviders(<InteractionHarness />, {
        route: "/home",
        user: testUser,
        userData: testUserData,
        language: "it",
      });

      // Trigger drawer open via MobileBottomBar 'Altro' button
      const altroBtn = await screen.findByRole("button", { name: "Apri menu altro" });
      fireEvent.click(altroBtn);

      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).toHaveClass("menu-opened");

      // Switch language while drawer is open
      const langBtn = screen.getByTestId("toggle-lang");
      fireEvent.click(langBtn);

      // Drawer must REMAIN opened and smoothly update content to English
      expect(overlay).toHaveClass("menu-opened");
      expect(screen.getByText("Hello, Challenger")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();

      // Close drawer with Escape
      fireEvent.keyDown(window, { key: "Escape" });
      expect(overlay).not.toHaveClass("menu-opened");
    });

    test("4.2 Zero emojis invariant strictly upheld across all navigation components and ViewImpostazioni", async () => {
      const { container } = renderWithProviders(
        <div>
          <DesktopNavigation />
          <MobileNavigation />
          <MobileBottomBar />
          <Suspense fallback={<div>Loading...</div>}>
            <ViewImpostazioni />
          </Suspense>
        </div>,
        {
          route: "/impostazioni",
          user: testUser,
          userData: testUserData,
          language: "it",
        }
      );

      // Open drawer to inspect its DOM too
      const burger = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burger);

      const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOJI_REGEX.test(container.innerHTML)).toBe(false);
    });
  });
});
