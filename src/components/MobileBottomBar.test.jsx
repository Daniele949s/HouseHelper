import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import MobileBottomBar from "./MobileBottomBar";
import { renderWithProviders, mockStore } from "../test/testUtils";

describe("MobileBottomBar Component", () => {
  const mockUser = { uid: "user_mobile_1", email: "mobile@test.com" };
  const mockUserData = { username: "Marco", casaId: "casa_1" };

  beforeEach(() => {
    mockStore.reset();
  });

  test("renders null when user is not authenticated (currentUser is null)", () => {
    const { container } = renderWithProviders(<MobileBottomBar />, {
      user: null,
      userData: null,
    });
    expect(container.querySelector(".mobile-bottom-bar")).toBeNull();
  });

  test("renders null when user is authenticated but has no active casaId", async () => {
    const { container } = renderWithProviders(<MobileBottomBar />, {
      user: mockUser,
      userData: { username: "Marco", casaId: null },
    });

    await waitFor(() => {
      expect(container.querySelector(".mobile-bottom-bar")).toBeNull();
    });
  });

  test("renders null when userData is missing or casaId is empty string", async () => {
    const { container } = renderWithProviders(<MobileBottomBar />, {
      user: mockUser,
      userData: { username: "Marco", casaId: "" },
    });

    await waitFor(() => {
      expect(container.querySelector(".mobile-bottom-bar")).toBeNull();
    });
  });

  test("renders nav landmark with correct aria-label and class when authenticated with casaId", async () => {
    renderWithProviders(<MobileBottomBar />, {
      route: "/home",
      user: mockUser,
      userData: mockUserData,
    });

    await waitFor(() => {
      const nav = screen.getByRole("navigation", { name: "Navigazione rapida mobile" });
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass("mobile-bottom-bar");
    });
  });

  test("renders exactly 4 navigation links with correct destinations, labels and FontAwesome vector icons", async () => {
    renderWithProviders(<MobileBottomBar />, {
      route: "/home",
      user: mockUser,
      userData: mockUserData,
    });

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: "Navigazione rapida mobile" })).toBeInTheDocument();
    });

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);

    const expectedTabs = [
      { href: "/home", label: "Home", iconClass: "fa-home" },
      { href: "/debiti", label: "Debiti", iconClass: "fa-wallet" },
      { href: "/turni", label: "Turni", iconClass: "fa-broom" },
      { href: "/calendario", label: "Calendario", iconClass: "fa-calendar-alt" },
    ];

    expectedTabs.forEach((tab, index) => {
      const link = links[index];
      expect(link).toHaveAttribute("href", tab.href);
      expect(link.querySelector(".mobile-bottom-tab-label")).toHaveTextContent(tab.label);
      const icon = link.querySelector(".mobile-bottom-tab-icon i");
      expect(icon).toHaveClass("fas", tab.iconClass);
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  test("renders 'Altro' button with correct aria-label and icon, and dispatches toggle-mobile-menu on click", async () => {
    renderWithProviders(<MobileBottomBar />, {
      route: "/home",
      user: mockUser,
      userData: mockUserData,
    });

    const altroButton = await screen.findByRole("button", { name: "Apri menu altro" });
    expect(altroButton).toBeInTheDocument();
    expect(altroButton).toHaveClass("mobile-bottom-tab");
    expect(altroButton.querySelector(".mobile-bottom-tab-label")).toHaveTextContent("Altro");

    const icon = altroButton.querySelector(".mobile-bottom-tab-icon i");
    expect(icon).toHaveClass("fas", "fa-bars");
    expect(icon).toHaveAttribute("aria-hidden", "true");

    const eventSpy = jest.fn();
    window.addEventListener("toggle-mobile-menu", eventSpy);

    try {
      fireEvent.click(altroButton);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // Verify repeatable event firing
      fireEvent.click(altroButton);
      expect(eventSpy).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener("toggle-mobile-menu", eventSpy);
    }
  });

  test("highlights active tab on exact route match (/home)", async () => {
    renderWithProviders(<MobileBottomBar />, {
      route: "/home",
      user: mockUser,
      userData: mockUserData,
    });

    await waitFor(() => {
      const homeLink = screen.getByRole("link", { name: /home/i });
      expect(homeLink).toHaveClass("active");
      expect(homeLink).toHaveAttribute("aria-current", "page");

      expect(screen.getByRole("link", { name: /turni/i })).not.toHaveClass("active");
      expect(screen.getByRole("link", { name: /turni/i })).not.toHaveAttribute("aria-current");

      expect(screen.getByRole("link", { name: /debiti/i })).not.toHaveClass("active");
      expect(screen.getByRole("link", { name: /debiti/i })).not.toHaveAttribute("aria-current");

      expect(screen.getByRole("link", { name: /calendario/i })).not.toHaveClass("active");
      expect(screen.getByRole("link", { name: /calendario/i })).not.toHaveAttribute("aria-current");
    });
  });

  test("highlights active tab on sub-route prefix match (/turni/modifica/turno_1)", async () => {
    renderWithProviders(<MobileBottomBar />, {
      route: "/turni/modifica/turno_1",
      user: mockUser,
      userData: mockUserData,
    });

    await waitFor(() => {
      const turniLink = screen.getByRole("link", { name: /turni/i });
      expect(turniLink).toHaveClass("active");
      expect(turniLink).toHaveAttribute("aria-current", "page");

      expect(screen.getByRole("link", { name: /home/i })).not.toHaveClass("active");
      expect(screen.getByRole("link", { name: /debiti/i })).not.toHaveClass("active");
      expect(screen.getByRole("link", { name: /calendario/i })).not.toHaveClass("active");
    });
  });

  test("highlights active tab on prefix match for expenses (/debiti/aggiungi)", async () => {
    renderWithProviders(<MobileBottomBar />, {
      route: "/debiti/aggiungi",
      user: mockUser,
      userData: mockUserData,
    });

    await waitFor(() => {
      const speseLink = screen.getByRole("link", { name: /debiti/i });
      expect(speseLink).toHaveClass("active");
      expect(speseLink).toHaveAttribute("aria-current", "page");

      expect(screen.getByRole("link", { name: /home/i })).not.toHaveClass("active");
    });
  });

  test("leaves all bottom navigation tabs inactive on unmapped routes (/bacheca)", async () => {
    renderWithProviders(<MobileBottomBar />, {
      route: "/bacheca",
      user: mockUser,
      userData: mockUserData,
    });

    await waitFor(() => {
      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).not.toHaveClass("active");
        expect(link).not.toHaveAttribute("aria-current");
      });
    });
  });

  test("enforces strict zero-emojis and zero-emoticons on all rendered content and attributes", async () => {
    const { container } = renderWithProviders(<MobileBottomBar />, {
      route: "/home",
      user: mockUser,
      userData: mockUserData,
    });

    await waitFor(() => {
      expect(container.querySelector(".mobile-bottom-bar")).toBeInTheDocument();
    });

    const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{20E3}]/u;
    const EMOTICON_REGEX = /(?:(?<=\s|^|["'`>])(?::\)|:-\)|:\(|:-\(|:D|:-D|;\)|;-\)|:P|:-P|<3|\bXD\b|\bxd\b|(?:\^_-\^)|(?:-_-)|:o|:-O)(?=\s|$|["'`<.,!?;:]))/gi;

    expect(EMOJI_REGEX.test(container.textContent)).toBe(false);
    expect(EMOTICON_REGEX.test(container.textContent)).toBe(false);
    expect(EMOJI_REGEX.test(container.innerHTML)).toBe(false);
    expect(EMOTICON_REGEX.test(container.innerHTML)).toBe(false);
  });
});
