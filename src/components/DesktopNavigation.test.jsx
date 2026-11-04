import React from "react";
import { screen, waitFor } from "@testing-library/react";
import DesktopNavigation from "./DesktopNavigation";
import { renderWithProviders, mockStore } from "../test/testUtils";

describe("DesktopNavigation Component", () => {
  beforeEach(() => {
    mockStore.reset();
  });

  test("renders null when user is not authenticated", () => {
    const { container } = renderWithProviders(<DesktopNavigation />, {
      user: null,
      userData: null,
    });
    expect(container.querySelector(".desktop-nav-root")).toBeNull();
  });

  test("renders null when user is authenticated but has no casaId", async () => {
    const user = { uid: "user_solo", email: "solo@test.com" };
    const { container } = renderWithProviders(<DesktopNavigation />, {
      user,
      userData: { username: "Solo", casaId: null },
    });

    await waitFor(() => {
      expect(container.querySelector(".desktop-nav-root")).toBeNull();
    });
  });

  test("renders all 8 navigation links when user is authenticated with casaId", async () => {
    const user = { uid: "user_1", email: "user1@test.com" };
    renderWithProviders(<DesktopNavigation />, {
      route: "/home",
      user,
      userData: { username: "Marco", casaId: "casa_1" },
    });

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: /navigazione principale/i })).toBeInTheDocument();
    });

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(8);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Turni")).toBeInTheDocument();
    expect(screen.getByText("Debiti")).toBeInTheDocument();
    expect(screen.getByText("Spesa")).toBeInTheDocument();
    expect(screen.getByText("Bacheca")).toBeInTheDocument();
    expect(screen.getByText("Calendario")).toBeInTheDocument();
    expect(screen.getByText("Documenti")).toBeInTheDocument();
    expect(screen.getByText("Contatti")).toBeInTheDocument();
  });

  test("uses FontAwesome icon classes for all navigation items", async () => {
    const user = { uid: "user_1", email: "user1@test.com" };
    const { container } = renderWithProviders(<DesktopNavigation />, {
      route: "/home",
      user,
      userData: { username: "Marco", casaId: "casa_1" },
    });

    await waitFor(() => {
      expect(container.querySelector(".desktop-nav-root")).toBeInTheDocument();
    });

    const icons = container.querySelectorAll("i.fas");
    expect(icons.length).toBe(8);

    const classes = Array.from(icons).map((i) => i.className);
    expect(classes.some((c) => c.includes("fa-home"))).toBe(true);
    expect(classes.some((c) => c.includes("fa-broom"))).toBe(true);
    expect(classes.some((c) => c.includes("fa-wallet"))).toBe(true);
    expect(classes.some((c) => c.includes("fa-shopping-cart"))).toBe(true);
    expect(classes.some((c) => c.includes("fa-thumbtack"))).toBe(true);
    expect(classes.some((c) => c.includes("fa-calendar-alt"))).toBe(true);
    expect(classes.some((c) => c.includes("fa-folder-open"))).toBe(true);
    expect(classes.some((c) => c.includes("fa-address-book"))).toBe(true);
  });

  test("marks current route link as active", async () => {
    const user = { uid: "user_1", email: "user1@test.com" };
    renderWithProviders(<DesktopNavigation />, {
      route: "/turni",
      user,
      userData: { username: "Marco", casaId: "casa_1" },
    });

    await waitFor(() => {
      const turniLink = screen.getByText("Turni").closest("a");
      expect(turniLink).toHaveClass("active");
    });
  });
});
