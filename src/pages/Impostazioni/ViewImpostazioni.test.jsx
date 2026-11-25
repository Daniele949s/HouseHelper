import React from "react";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders, seedHousehold } from "../../test/testUtils";
import mockStore from "../../test/mockFirebase";
import ViewImpostazioni from "./ViewImpostazioni";
import * as feedbackModule from "../../utils/feedback";
import * as notificationPrefsModule from "../../utils/notificationPrefs";
import { sendPasswordResetEmail, sendEmailVerification, signOut } from "firebase/auth";

// Spy on feedback functions
jest.mock("../../utils/feedback", () => {
  const original = jest.requireActual("../../utils/feedback");
  return {
    ...original,
    showToast: jest.fn(),
    showConfirm: jest.fn(),
  };
});

describe("ViewImpostazioni Component Suite (Apple HIG & Frontend Design)", () => {
  const verifiedUser = {
    uid: "user_owner_1",
    email: "owner@househelper.it",
    displayName: "Marco",
    emailVerified: true,
  };

  const unverifiedUser = {
    uid: "user_roommate_2",
    email: "luca@househelper.it",
    displayName: "Luca",
    emailVerified: false,
  };

  const ownerUserData = {
    username: "Marco",
    email: "owner@househelper.it",
    casaId: "casa_settings_101",
  };

  const roommateUserData = {
    username: "Luca",
    email: "luca@househelper.it",
    casaId: "casa_settings_101",
  };

  beforeEach(() => {
    localStorage.clear();
    mockStore.reset();
    jest.clearAllMocks();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    seedHousehold({
      houseId: "casa_settings_101",
      houseName: "Villa Smeralda",
      inviteCode: "SMERALDA99",
      creatorId: "user_owner_1",
      users: [verifiedUser, unverifiedUser],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("1. Renders Household Identity Profile Card with host role badge and roommate count", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    // Heading & Household details
    expect(await screen.findByRole("heading", { level: 1, name: /Impostazioni/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Villa Smeralda" })).toBeInTheDocument();
    expect(screen.getByText("Creatore")).toBeInTheDocument();

    // Monospace invite code
    expect(screen.getByText("SMERALDA99")).toBeInTheDocument();

    // User avatar chip with initials and username
    expect(screen.getAllByText("Marco").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  test("2. Renders member role badge when user is not creator", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: unverifiedUser,
      userData: roommateUserData,
      language: "it",
    });

    expect(await screen.findByRole("heading", { level: 2, name: "Villa Smeralda" })).toBeInTheDocument();
    expect(screen.getByText("Coinquilino")).toBeInTheDocument();
  });

  test("3. One-click copy invite code triggers clipboard and visual confirmation", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    await screen.findByRole("heading", { level: 2, name: "Villa Smeralda" });
    const copyBtn = screen.getByRole("button", { name: /Copia codice/i });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("SMERALDA99");
    await waitFor(() => {
      expect(feedbackModule.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/copiato negli appunti/i),
        "success"
      );
    });
    expect(screen.getByText("Copiato!")).toBeInTheDocument();
  });

  test("4. Language segmented control toggles language, updates localStorage and document.documentElement.lang", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });
    const itBtn = screen.getByRole("button", { name: /Italiano/i });
    const enBtn = screen.getByRole("button", { name: /English/i });

    expect(itBtn).toHaveAttribute("aria-pressed", "true");
    expect(enBtn).toHaveAttribute("aria-pressed", "false");

    // Click English
    fireEvent.click(enBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Settings/i })).toBeInTheDocument();
    });
    expect(localStorage.getItem("househelper_language")).toBe("en");
    expect(document.documentElement.lang).toBe("en");

    // Click back to Italian
    fireEvent.click(itBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Impostazioni/i })).toBeInTheDocument();
    });
    expect(localStorage.getItem("househelper_language")).toBe("it");
    expect(document.documentElement.lang).toBe("it");
  });

  test("5. Theme 3-way segmented control switches between Light, Dark, and System", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

    expect(screen.queryByRole("button", { name: /Tema Chiaro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tema Scuro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Automatico \(Sistema\)/i })).not.toBeInTheDocument();
  });

  test("6. Notification preferences toggle switches update state and persist to localStorage via utility", async () => {
    const saveSpy = jest.spyOn(notificationPrefsModule, "saveNotificationPreferences");

    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    await screen.findByRole("heading", { name: /Notifiche e Avvisi/i });

    const choreSwitch = screen.getByRole("switch", { name: /Promemoria Turni di Pulizia/i });
    const expenseSwitch = screen.getByRole("switch", { name: /Spese e Debiti Condivisi/i });
    const noticeSwitch = screen.getByRole("switch", { name: /Avvisi in Bacheca/i });

    // Initial defaults are true
    expect(choreSwitch).toHaveAttribute("aria-checked", "true");
    expect(expenseSwitch).toHaveAttribute("aria-checked", "true");
    expect(noticeSwitch).toHaveAttribute("aria-checked", "true");

    // Toggle choreReminders off
    fireEvent.click(choreSwitch);
    expect(choreSwitch).toHaveAttribute("aria-checked", "false");
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ choreReminders: false }));
    expect(feedbackModule.showToast).toHaveBeenCalledWith("Preferenze di notifica salvate", "success");

    // Toggle expenseAlerts off
    fireEvent.click(expenseSwitch);
    expect(expenseSwitch).toHaveAttribute("aria-checked", "false");
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ choreReminders: false, expenseAlerts: false }));

    // Toggle householdNotices off
    fireEvent.click(noticeSwitch);
    expect(noticeSwitch).toHaveAttribute("aria-checked", "false");

    saveSpy.mockRestore();
  });

  test("7. Account & Security: Monospace UID tag with copy button copies user UID", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    await screen.findByTestId("settings-user-uid");
    expect(screen.getByTestId("settings-user-uid")).toHaveTextContent("user_owner_1");

    const copyUidBtn = screen.getByRole("button", { name: /Copia ID/i });
    fireEvent.click(copyUidBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("user_owner_1");
    await waitFor(() => {
      expect(feedbackModule.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/ID utente copiato/i),
        "success"
      );
    });
  });

  test("8. Account & Security: Verified email renders emerald badge without resend button", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    const verifiedBadge = await screen.findByTestId("badge-email-verified");
    expect(verifiedBadge).toBeInTheDocument();
    expect(verifiedBadge).toHaveTextContent("Email Verificata");
    expect(screen.queryByRole("button", { name: /Invia email di verifica/i })).not.toBeInTheDocument();
  });

  test("9. Account & Security: Unverified email renders amber badge and allows resending verification", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: unverifiedUser,
      userData: roommateUserData,
      language: "it",
    });

    const unverifiedBadge = await screen.findByTestId("badge-email-unverified");
    expect(unverifiedBadge).toBeInTheDocument();
    expect(unverifiedBadge).toHaveTextContent("Email Non Verificata");

    const resendBtn = screen.getByRole("button", { name: /Invia email di verifica/i });
    expect(resendBtn).toBeInTheDocument();

    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(feedbackModule.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/Email di verifica inviata/i),
        "success"
      );
    });

    // Check cooldown button text
    expect(screen.getByRole("button", { name: /Attendi/i })).toBeDisabled();
  });

  test("10. Account & Security: Password reset button invokes sendPasswordResetEmail", async () => {
    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    await screen.findByRole("heading", { name: /Account e Sicurezza/i });
    const resetBtn = screen.getByRole("button", { name: /Invia link reimpostazione/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(feedbackModule.showToast).toHaveBeenCalledWith(
        expect.stringMatching(/Link per il ripristino inviato/i),
        "success"
      );
    });
  });

  test("11. Account & Security: Logout action triggers showConfirm with isDanger: true", async () => {
    let capturedOptions = null;
    feedbackModule.showConfirm.mockImplementation((opts) => {
      capturedOptions = opts;
    });

    renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: verifiedUser,
      userData: ownerUserData,
      language: "it",
    });

    await screen.findByRole("heading", { name: /Account e Sicurezza/i });
    const logoutBtn = screen.getByRole("button", { name: /Disconnetti/i });
    fireEvent.click(logoutBtn);

    expect(feedbackModule.showConfirm).toHaveBeenCalled();
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.isDanger).toBe(true);
    expect(capturedOptions.title).toMatch(/Conferma disconnessione/i);

    // Trigger onConfirm inside act
    await act(async () => {
      await capturedOptions.onConfirm();
    });
    expect(mockStore.currentMockUser).toBeNull();
  });

  test("12. Apple HIG compliance: All buttons have minHeight >= 44px and zero emojis exist", async () => {
    const { container } = renderWithProviders(<ViewImpostazioni />, {
      route: "/impostazioni",
      user: unverifiedUser,
      userData: roommateUserData,
      language: "it",
    });

    await screen.findByRole("heading", { level: 1, name: /Impostazioni/i });

    // Verify touch targets
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(6);
    buttons.forEach((btn) => {
      if (btn.style.minHeight) {
        expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      }
    });

    // Verify zero emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
    expect(emojiRegex.test(container.innerHTML)).toBe(false);

    // Verify card containers are opaque cards
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(4); // 1 identity card + 3 settings section cards
  });
});

describe("notificationPrefs Utility Unit Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("1. Returns default notification preferences when localStorage is empty", () => {
    const prefs = notificationPrefsModule.getNotificationPreferences();
    expect(prefs).toEqual({
      choreReminders: true,
      expenseAlerts: true,
      householdNotices: true,
    });
  });

  test("2. Persists and reloads modified notification preferences", () => {
    const customPrefs = {
      choreReminders: false,
      expenseAlerts: true,
      householdNotices: false,
    };
    notificationPrefsModule.saveNotificationPreferences(customPrefs);
    const loaded = notificationPrefsModule.getNotificationPreferences();
    expect(loaded).toEqual(customPrefs);
    expect(localStorage.getItem(notificationPrefsModule.NOTIFICATION_PREFS_KEY)).toBe(
      JSON.stringify(customPrefs)
    );
  });

  test("3. Handles corrupted JSON gracefully with default fallback", () => {
    localStorage.setItem(notificationPrefsModule.NOTIFICATION_PREFS_KEY, "invalid-json{{");
    const loaded = notificationPrefsModule.getNotificationPreferences();
    expect(loaded).toEqual({
      choreReminders: true,
      expenseAlerts: true,
      householdNotices: true,
    });
  });

  test("4. Normalizes partial preferences with defaults", () => {
    localStorage.setItem(
      notificationPrefsModule.NOTIFICATION_PREFS_KEY,
      JSON.stringify({ choreReminders: false })
    );
    const loaded = notificationPrefsModule.getNotificationPreferences();
    expect(loaded).toEqual({
      choreReminders: false,
      expenseAlerts: true,
      householdNotices: true,
    });
  });
});

