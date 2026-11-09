import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import MobileNavigation from "./MobileNavigation";
import { renderWithProviders, mockStore } from "../test/testUtils";

describe("MobileNavigation Component", () => {
  const mockUser = { uid: "user_mobile_test", email: "user@test.com" };
  const mockUserData = { username: "Marco", casaId: "casa_1" };

  beforeEach(() => {
    mockStore.reset();
  });

  describe("Unauthenticated / Guest Mode", () => {
    test("renders burger button and opens drawer showing guest items in Italian", async () => {
      renderWithProviders(<MobileNavigation />, { user: null, language: "it" });

      const burgerBtn = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      expect(burgerBtn).toBeInTheDocument();
      expect(burgerBtn).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(burgerBtn);
      expect(burgerBtn).toHaveAttribute("aria-expanded", "true");

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Accedi")).toBeInTheDocument();
      expect(screen.getByText("Registrati")).toBeInTheDocument();

      expect(screen.queryByText(/Ciao,/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Esci dall'account/i)).not.toBeInTheDocument();
    });

    test("renders guest items in English when language is 'en'", async () => {
      renderWithProviders(<MobileNavigation />, { user: null, language: "en" });

      const burgerBtn = await screen.findByRole("button", { name: "Open navigation menu" });
      fireEvent.click(burgerBtn);

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Log In")).toBeInTheDocument();
      expect(screen.getByText("Sign Up")).toBeInTheDocument();
    });
  });

  describe("Authenticated Mode with Active Household", () => {
    test("renders header greeting, badge, 9 items including Settings, and logout button in Italian", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: mockUser,
        userData: mockUserData,
        language: "it",
      });

      const burgerBtn = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burgerBtn);

      expect(screen.getByText("HouseHelper Menu")).toBeInTheDocument();
      expect(screen.getByText(/Ciao, Marco/i)).toBeInTheDocument();

      const expectedItems = [
        { label: "Dashboard", icon: "fa-home" },
        { label: "Turni Pulizia", icon: "fa-broom" },
        { label: "Spese & Debiti", icon: "fa-wallet" },
        { label: "Lista Spesa", icon: "fa-shopping-cart" },
        { label: "Calendario Casa", icon: "fa-calendar-alt" },
        { label: "Bacheca", icon: "fa-thumbtack" },
        { label: "Documenti & Contratti", icon: "fa-folder-open" },
        { label: "Contatti Utili", icon: "fa-address-book" },
        { label: "Impostazioni", icon: "fa-sliders-h" },
      ];

      expectedItems.forEach((item) => {
        const labelEl = screen.getByText(item.label);
        expect(labelEl).toBeInTheDocument();
        const btn = labelEl.closest("button");
        const icon = btn.querySelector("i.fas");
        expect(icon).toHaveClass(item.icon);
      });

      expect(screen.getByText(/Esci dall'account/i)).toBeInTheDocument();
    });

    test("renders all 9 drawer items and logout button in English when language is 'en'", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: mockUser,
        userData: mockUserData,
        language: "en",
      });

      const burgerBtn = await screen.findByRole("button", { name: "Open navigation menu" });
      fireEvent.click(burgerBtn);

      expect(screen.getByText(/Hello, Marco/i)).toBeInTheDocument();

      const expectedEnglish = [
        "Dashboard",
        "Cleaning Chores",
        "Expenses & Balances",
        "Grocery List",
        "House Calendar",
        "Notice Board",
        "Documents & Leases",
        "Useful Contacts",
        "Settings",
      ];

      expectedEnglish.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });

      expect(screen.getByText(/Log Out/i)).toBeInTheDocument();
    });

    test("highlights Settings item on /impostazioni and on /settings alias", async () => {
      // Test 1: exact /impostazioni
      const { unmount: u1 } = renderWithProviders(<MobileNavigation />, {
        user: mockUser,
        userData: mockUserData,
        route: "/impostazioni",
      });

      const burger1 = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burger1);
      const settingsItem = screen.getByText("Impostazioni").closest("li");
      expect(settingsItem).toHaveClass("active-item");
      expect(settingsItem.querySelector(".active-dot")).toBeInTheDocument();
      u1();

      // Test 2: alias /settings
      const { unmount: u2 } = renderWithProviders(<MobileNavigation />, {
        user: mockUser,
        userData: mockUserData,
        route: "/settings",
      });

      const burger2 = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burger2);
      const settingsItemAlias = screen.getByText("Impostazioni").closest("li");
      expect(settingsItemAlias).toHaveClass("active-item");
      expect(settingsItemAlias.querySelector(".active-dot")).toBeInTheDocument();
      u2();
    });
  });

  describe("Drawer Interactions & Event Listeners", () => {
    test("toggles drawer on external 'toggle-mobile-menu' event (from MobileBottomBar)", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: mockUser,
        userData: mockUserData,
      });

      await screen.findByRole("button", { name: "Apri menu di navigazione" });
      const overlay = document.querySelector(".mobile-menu-overlay");
      expect(overlay).not.toHaveClass("menu-opened");

      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).toHaveClass("menu-opened");

      fireEvent(window, new CustomEvent("toggle-mobile-menu"));
      expect(overlay).not.toHaveClass("menu-opened");
    });

    test("closes on close button click, Escape key, and backdrop click", async () => {
      renderWithProviders(<MobileNavigation />, {
        user: mockUser,
        userData: mockUserData,
      });

      const burgerBtn = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      const overlay = document.querySelector(".mobile-menu-overlay");

      // 1. Close button
      fireEvent.click(burgerBtn);
      expect(overlay).toHaveClass("menu-opened");
      const closeBtn = screen.getByRole("button", { name: "Chiudi menu" });
      fireEvent.click(closeBtn);
      expect(overlay).not.toHaveClass("menu-opened");

      // 2. Escape key
      fireEvent.click(burgerBtn);
      expect(overlay).toHaveClass("menu-opened");
      fireEvent.keyDown(window, { key: "Escape" });
      expect(overlay).not.toHaveClass("menu-opened");

      // 3. Backdrop overlay click
      fireEvent.click(burgerBtn);
      expect(overlay).toHaveClass("menu-opened");
      fireEvent.click(overlay);
      expect(overlay).not.toHaveClass("menu-opened");
    });

    test("enforces strict zero emojis in rendered drawer", async () => {
      const { container } = renderWithProviders(<MobileNavigation />, {
        user: mockUser,
        userData: mockUserData,
      });

      const burgerBtn = await screen.findByRole("button", { name: "Apri menu di navigazione" });
      fireEvent.click(burgerBtn);

      const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
      expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
      expect(EMOJI_REGEX.test(container.innerHTML)).toBe(false);
    });
  });
});
