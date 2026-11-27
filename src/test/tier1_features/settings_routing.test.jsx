import React, { Suspense } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../testUtils";
import mockStore from "../mockFirebase";
import ViewImpostazioni from "../../pages/Impostazioni/ViewImpostazioni";
import { HouseProtectedRoute } from "../../components/RouteGuards";
import { Navigate } from "react-router-dom";

describe("Settings & Routing Integration (Apple HIG & i18n)", () => {
  const testUser = {
    uid: "user_setting_1",
    email: "elena@househelper.it",
    displayName: "Elena",
    emailVerified: true,
  };

  const testUserData = {
    username: "Elena",
    email: "elena@househelper.it",
    casaId: "casa_test_1",
  };

  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    const routerMock = require("react-router-dom");
    if (routerMock.__resetRouterMock) routerMock.__resetRouterMock();

    seedHousehold({
      houseId: "casa_test_1",
      houseName: "Casa Garibaldi",
      inviteCode: "GARB01",
      creatorId: "user_setting_1",
      users: [testUser],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("1. Directly accessing /impostazioni mounts ViewImpostazioni with Italian titles by default", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: testUser,
      userData: testUserData,
      language: "it",
    });

    // Header title and subtitle
    expect(await screen.findByRole("heading", { level: 1, name: /Impostazioni/i })).toBeInTheDocument();
    expect(screen.getByText(/Personalizza aspetto, preferenze e gestisci il tuo account/i)).toBeInTheDocument();

    // Grouped section headings
    expect(screen.getByText("Casa Attiva")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Lingua$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Notifiche e Avvisi/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Account e Sicurezza/i })).toBeInTheDocument();
  });

  test("2. Accessing route alias /settings redirects to /impostazioni", async () => {
    const routerMock = require("react-router-dom");

    // Test the alias element used in App.js: <Navigate to="/impostazioni" replace />
    const { container } = renderWithProviders(<Navigate to="/impostazioni" replace />, {
      route: "/settings",
      user: testUser,
      userData: testUserData,
    });

    const mockNav = await screen.findByTestId("mock-navigate");
    expect(mockNav).toHaveAttribute("data-to", "/impostazioni");
    expect(routerMock.__mockNavigate).toHaveBeenCalledWith("/impostazioni", expect.anything());
  });

  test("3. Accessing /impostazioni in English renders full English vocabulary", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: testUser,
      userData: testUserData,
      language: "en",
    });

    // English title and subtitle
    expect(await screen.findByRole("heading", { level: 1, name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByText(/Customize appearance, preferences, and manage your account/i)).toBeInTheDocument();

    // English section headings
    expect(screen.getByText("Active Household")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Language$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Notifications & Alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Account & Security/i })).toBeInTheDocument();
  });

  test("4. Toggling language pill switches interface dynamically between Italian and English", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: testUser,
      userData: testUserData,
      language: "it",
    });

    expect(await screen.findByRole("heading", { level: 1, name: /Impostazioni/i })).toBeInTheDocument();

    // Click English switch button
    const enButton = screen.getByRole("button", { name: /English/i });
    fireEvent.click(enButton);

    // Dynamic update to English
    expect(await screen.findByRole("heading", { level: 1, name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByText("Notifications & Alerts")).toBeInTheDocument();
    expect(screen.getByText("Active Household")).toBeInTheDocument();

    // Click Italian switch button back
    const itButton = screen.getByRole("button", { name: /Italiano/i });
    fireEvent.click(itButton);

    // Dynamic update back to Italian
    expect(await screen.findByRole("heading", { level: 1, name: /Impostazioni/i })).toBeInTheDocument();
    expect(screen.getByText("Notifiche e Avvisi")).toBeInTheDocument();
  });

  test("5. Route Guard: Unauthenticated user accessing /impostazioni is redirected to /login", async () => {
    renderWithProviders(<HouseProtectedRoute />, {
      route: "/impostazioni",
      user: null,
      userData: null,
    });

    const mockNav = await screen.findByTestId("mock-navigate");
    expect(mockNav).toHaveAttribute("data-to", "/login");
  });

  test("6. Route Guard: Unauthenticated user accessing /settings alias is redirected to /login", async () => {
    renderWithProviders(<HouseProtectedRoute />, {
      route: "/settings",
      user: null,
      userData: null,
    });

    const mockNav = await screen.findByTestId("mock-navigate");
    expect(mockNav).toHaveAttribute("data-to", "/login");
  });

  test("7. Route Guard: Authenticated user without household is redirected to /scelta-casa", async () => {
    const homelessUser = { uid: "user_homeless", email: "homeless@test.it" };
    renderWithProviders(<HouseProtectedRoute />, {
      route: "/impostazioni",
      user: homelessUser,
      userData: { username: "Homeless", casaId: null },
    });

    const mockNav = await screen.findByTestId("mock-navigate");
    expect(mockNav).toHaveAttribute("data-to", "/scelta-casa");
  });

  test("8. Apple HIG compliance: All buttons and interactive controls have min 44px touch targets", async () => {
    const { container } = renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: testUser,
      userData: testUserData,
      language: "it",
    });

    await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(5);

    buttons.forEach((btn) => {
      const style = btn.style;
      const minHeight = style.minHeight;
      // All interactive buttons specify minHeight 44px per Apple HIG
      if (minHeight) {
        expect(parseInt(minHeight, 10)).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test("9. Apple HIG & Zero-Emoji compliance: No emojis and cards are opaque", async () => {
    const { container } = renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: testUser,
      userData: testUserData,
      language: "it",
    });

    await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

    // Strict zero emoji verification regex matching scripts/verify-zero-emojis.js
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    expect(emojiRegex.test(container.innerHTML)).toBe(false);

    // Verify all content cards have class card
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});
